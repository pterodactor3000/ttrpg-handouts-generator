import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertNoSchemaLeakage } from '@/integration/helpers/assert-no-schema-leakage';
import { createAdminClient } from '@/integration/helpers/admin-client';
import { makeContext } from '@/integration/helpers/context-stub';
import { createTestUser, deleteTestUser, signInAsUser } from '@/integration/helpers/test-users';
import { POST as createHandout } from '@/pages/api/handouts/index';
import { PUT as updateHandout } from '@/pages/api/handouts/[id]';
import { POST as publishHandout } from '@/pages/api/handouts/[id]/publish';

// vi.mock replaces createClient so handlers use bearer-injected Supabase clients;
// the real cookie-based SSR path in @/lib/supabase is intentionally not exercised here.
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(),
}));

import { createClient as createAppSupabaseClient } from '@/lib/supabase';

const validPostBody = {
  title: 'Valid title',
  markdownContent: 'Valid markdown content.',
  backgroundCategory: 'fantasy' as const,
  tags: ['adventure'],
};

const validPutBody = {
  title: 'Updated title',
  markdownContent: 'Updated markdown content.',
  backgroundCategory: 'horror' as const,
  tags: ['updated'],
};

interface HandoutIdRow {
  id: string;
}

let adminClient: ReturnType<typeof createAdminClient>;
let ownerAuthenticatedClient: Awaited<ReturnType<typeof signInAsUser>>;
let ownerUserId: string;
let draftHandoutId: string;

async function insertDraftHandout(
  overrides: {
    title?: string;
    markdown_content?: string;
  } = {},
): Promise<string> {
  const { data, error } = await adminClient
    .from('handouts')
    .insert({
      gm_id: ownerUserId,
      title: overrides.title ?? 'Draft title',
      markdown_content: overrides.markdown_content ?? 'Draft markdown content.',
      background_category: 'fantasy',
      tags: [],
      status: 'draft',
    })
    .select('id')
    .single<HandoutIdRow>();

  if (error) {
    throw error;
  }

  return data.id;
}

async function deleteOwnerHandouts(): Promise<void> {
  const { error } = await adminClient.from('handouts').delete().eq('gm_id', ownerUserId);
  if (error) {
    throw error;
  }
}

async function readErrorBody(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  assertNoSchemaLeakage(JSON.stringify(body));
  return body;
}

describe('handout validation (integration)', () => {
  beforeAll(async () => {
    adminClient = createAdminClient();
    const password = 'integration-test-password';
    const email = `gm-validation-${crypto.randomUUID()}@integration.test`;
    const user = await createTestUser(adminClient, email, password);
    ownerUserId = user.id;
    ownerAuthenticatedClient = await signInAsUser(email, password);
    vi.mocked(createAppSupabaseClient).mockReturnValue(ownerAuthenticatedClient);
  });

  beforeEach(async () => {
    await deleteOwnerHandouts();
    draftHandoutId = await insertDraftHandout();
  });

  afterAll(async () => {
    await deleteOwnerHandouts();
    await deleteTestUser(adminClient, ownerUserId);
  });

  describe('POST /api/handouts', () => {
    it('rejects missing backgroundCategory with 400', async () => {
      const response = await createHandout(
        makeContext({
          body: {
            title: validPostBody.title,
            markdownContent: validPostBody.markdownContent,
            tags: validPostBody.tags,
          },
        }),
      );

      expect(response.status).toBe(400);
      await readErrorBody(response);
    });

    it('rejects backgroundCategory outside enum with 400', async () => {
      const response = await createHandout(
        makeContext({
          body: {
            ...validPostBody,
            backgroundCategory: 'grimdark',
          },
        }),
      );

      expect(response.status).toBe(400);
      await readErrorBody(response);
    });

    it('rejects title longer than 300 characters with 400', async () => {
      const response = await createHandout(
        makeContext({
          body: {
            ...validPostBody,
            title: 'a'.repeat(301),
          },
        }),
      );

      expect(response.status).toBe(400);
      await readErrorBody(response);
    });

    it('rejects markdownContent longer than 50000 characters with 400', async () => {
      const response = await createHandout(
        makeContext({
          body: {
            ...validPostBody,
            markdownContent: 'x'.repeat(50001),
          },
        }),
      );

      expect(response.status).toBe(400);
      await readErrorBody(response);
    });

    it('rejects more than 20 tags with 400', async () => {
      const response = await createHandout(
        makeContext({
          body: {
            ...validPostBody,
            tags: Array.from({ length: 21 }, (_, index) => `tag-${index}`),
          },
        }),
      );

      expect(response.status).toBe(400);
      await readErrorBody(response);
    });

    it('rejects non-JSON body with 400', async () => {
      const response = await createHandout(
        makeContext({
          rawBody: 'hello',
        }),
      );

      expect(response.status).toBe(400);
      const body = await readErrorBody(response);
      expect(body).toEqual({ error: 'Invalid JSON body' });
    });

    // known gap: zod does not enforce min(1) on title at POST time
    it('accepts empty title with 201 (publish route enforces non-empty later)', async () => {
      const response = await createHandout(
        makeContext({
          body: {
            ...validPostBody,
            title: '',
          },
        }),
      );

      expect(response.status).toBe(201);
      const body = (await response.json()) as { id: string };
      expect(body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('PUT /api/handouts/[id]', () => {
    it('rejects non-UUID path param with 400', async () => {
      const response = await updateHandout(
        makeContext({
          method: 'PUT',
          body: validPutBody,
          params: { id: 'not-a-uuid' },
        }),
      );

      expect(response.status).toBe(400);
      const body = await readErrorBody(response);
      expect(body).toEqual({ error: 'Invalid handout id' });
    });

    it('rejects missing handout id with 400', async () => {
      const response = await updateHandout(
        makeContext({
          method: 'PUT',
          body: validPutBody,
          params: { id: '' },
        }),
      );

      expect(response.status).toBe(400);
      const body = await readErrorBody(response);
      expect(body).toEqual({ error: 'Missing handout id' });
    });

    it('rejects backgroundCategory outside enum with 400', async () => {
      const response = await updateHandout(
        makeContext({
          method: 'PUT',
          body: {
            ...validPutBody,
            backgroundCategory: 'grimdark',
          },
          params: { id: draftHandoutId },
        }),
      );

      expect(response.status).toBe(400);
      await readErrorBody(response);
    });

    it('rejects title longer than 300 characters with 400', async () => {
      const response = await updateHandout(
        makeContext({
          method: 'PUT',
          body: {
            ...validPutBody,
            title: 'b'.repeat(301),
          },
          params: { id: draftHandoutId },
        }),
      );

      expect(response.status).toBe(400);
      await readErrorBody(response);
    });

    it('returns 500 when updating a published handout', async () => {
      const shareToken = crypto.randomUUID();
      const { error: publishError } = await adminClient
        .from('handouts')
        .update({
          status: 'published',
          share_token: shareToken,
          published_at: new Date().toISOString(),
        })
        .eq('id', draftHandoutId);

      if (publishError) {
        throw publishError;
      }

      const response = await updateHandout(
        makeContext({
          method: 'PUT',
          body: validPutBody,
          params: { id: draftHandoutId },
        }),
      );

      expect(response.status).toBe(500);
      const body = await readErrorBody(response);
      expect(body).toEqual({ error: 'Failed to save handout' });
    });
  });

  describe('POST /api/handouts/[id]/publish', () => {
    it('rejects publish when title is empty with 422', async () => {
      await deleteOwnerHandouts();
      const emptyTitleHandoutId = await insertDraftHandout({
        title: '',
        markdown_content: 'Content ready to publish.',
      });

      const response = await publishHandout(
        makeContext({
          params: { id: emptyTitleHandoutId },
        }),
      );

      expect(response.status).toBe(422);
      await readErrorBody(response);
    });

    it('rejects publish when markdown_content is empty with 422', async () => {
      await deleteOwnerHandouts();
      const emptyContentHandoutId = await insertDraftHandout({
        title: 'Title ready to publish',
        markdown_content: '',
      });

      const response = await publishHandout(
        makeContext({
          params: { id: emptyContentHandoutId },
        }),
      );

      expect(response.status).toBe(422);
      await readErrorBody(response);
    });

    it('returns 404 for a non-existent handout id', async () => {
      const missingId = crypto.randomUUID();
      const response = await publishHandout(
        makeContext({
          params: { id: missingId },
        }),
      );

      expect(response.status).toBe(404);
      const body = await readErrorBody(response);
      expect(body).toEqual({ error: 'Handout not found or not in draft status' });
    });
  });
});
