import { createClient } from '@supabase/supabase-js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertNoSchemaLeakage } from '@/integration/helpers/assert-no-schema-leakage';
import { createAdminClient } from '@/integration/helpers/admin-client';
import { makeContext } from '@/integration/helpers/context-stub';
import { requireEnv } from '@/integration/helpers/env';
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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const fixtureTitle = 'Original Title';
const fixtureMarkdown = 'Original markdown for ownership tests.';
const fixtureBackground = 'fantasy' as const;
const fixtureTags = ['ownership-fixture'];

const validUpdateBody = {
  title: 'Attacker Title',
  markdownContent: 'Attacker markdown content.',
  backgroundCategory: 'horror' as const,
  tags: ['attacker'],
};

interface HandoutIdRow {
  id: string;
}

interface PublishedHandoutRow {
  status: string;
  share_token: string;
  published_at: string;
}

async function insertGmADraftHandout(): Promise<string> {
  const { data, error } = await adminClient
    .from('handouts')
    .insert({
      gm_id: ownerUserId,
      title: fixtureTitle,
      markdown_content: fixtureMarkdown,
      background_category: fixtureBackground,
      tags: fixtureTags,
      status: 'draft',
    })
    .select('id')
    .single<HandoutIdRow>();

  if (error) {
    throw error;
  }

  return data.id;
}

async function expectErrorBody(response: Response, status: number, expected: unknown): Promise<void> {
  expect(response.status).toBe(status);
  const body: unknown = await response.json();
  expect(body).toEqual(expected);
  assertNoSchemaLeakage(JSON.stringify(body));
}

async function deleteAllTestHandouts(): Promise<void> {
  const { error } = await adminClient.from('handouts').delete().in('gm_id', [ownerUserId, otherOwnerUserId]);
  if (error) {
    throw error;
  }
}

let adminClient: ReturnType<typeof createAdminClient>;
let unauthenticatedClient: ReturnType<typeof createClient>;
let ownerAuthenticatedClient: Awaited<ReturnType<typeof signInAsUser>>;
let otherOwnerAuthenticatedClient: Awaited<ReturnType<typeof signInAsUser>>;
let ownerUserId: string;
let otherOwnerUserId: string;
let handoutId: string;

describe('handout ownership (integration)', () => {
  beforeAll(async () => {
    adminClient = createAdminClient();
    const password = 'integration-test-password';

    const ownerEmail = `owner-${crypto.randomUUID()}@integration.test`;
    const otherOwnerEmail = `other-owner-${crypto.randomUUID()}@integration.test`;

    const ownerUser = await createTestUser(adminClient, ownerEmail, password);
    const otherOwnerUser = await createTestUser(adminClient, otherOwnerEmail, password);

    ownerUserId = ownerUser.id;
    otherOwnerUserId = otherOwnerUser.id;

    ownerAuthenticatedClient = await signInAsUser(ownerEmail, password);
    otherOwnerAuthenticatedClient = await signInAsUser(otherOwnerEmail, password);

    const supabaseUrl = requireEnv('SUPABASE_URL');
    const anonKey = requireEnv('SUPABASE_ANON_KEY');
    unauthenticatedClient = createClient(supabaseUrl, anonKey);
  });

  beforeEach(async () => {
    await deleteAllTestHandouts();
    handoutId = await insertGmADraftHandout();
  });

  afterEach(async () => {
    await deleteAllTestHandouts();
  });

  afterAll(async () => {
    await deleteAllTestHandouts();
    await deleteTestUser(adminClient, ownerUserId);
    await deleteTestUser(adminClient, otherOwnerUserId);
  });

  describe('unauthenticated baseline', () => {
    beforeEach(() => {
      vi.mocked(createAppSupabaseClient).mockReturnValue(unauthenticatedClient);
    });

    it('POST /api/handouts returns 401 Unauthorized', async () => {
      const response = await createHandout(
        makeContext({
          body: {
            title: 'New handout',
            markdownContent: 'Content',
            backgroundCategory: 'fantasy',
            tags: [],
          },
        }),
      );

      await expectErrorBody(response, 401, { error: 'Unauthorized' });
    });

    it('PUT /api/handouts/[id] returns 401 Unauthorized', async () => {
      const response = await updateHandout(
        makeContext({
          method: 'PUT',
          body: validUpdateBody,
          params: { id: handoutId },
        }),
      );

      await expectErrorBody(response, 401, { error: 'Unauthorized' });
    });

    it('POST /api/handouts/[id]/publish returns 401 Unauthorized', async () => {
      const response = await publishHandout(
        makeContext({
          params: { id: handoutId },
        }),
      );

      await expectErrorBody(response, 401, { error: 'Unauthorized' });
    });
  });

  describe('cross-owner mutations (Risk #4)', () => {
    it('PUT by another GM returns 500 and does not mutate the row', async () => {
      vi.mocked(createAppSupabaseClient).mockReturnValue(otherOwnerAuthenticatedClient);

      const response = await updateHandout(
        makeContext({
          method: 'PUT',
          body: validUpdateBody,
          params: { id: handoutId },
        }),
      );

      await expectErrorBody(response, 500, { error: 'Failed to save handout' });

      const { data: row, error } = await adminClient
        .from('handouts')
        .select('title, markdown_content')
        .eq('id', handoutId)
        .single();

      expect(error).toBeNull();
      expect(row).toEqual({
        title: fixtureTitle,
        markdown_content: fixtureMarkdown,
      });
    });

    it('publish by another GM returns 404 and leaves draft unchanged', async () => {
      vi.mocked(createAppSupabaseClient).mockReturnValue(otherOwnerAuthenticatedClient);

      const response = await publishHandout(
        makeContext({
          params: { id: handoutId },
        }),
      );

      await expectErrorBody(response, 404, {
        error: 'Handout not found or not in draft status',
      });

      const { data: row, error } = await adminClient
        .from('handouts')
        .select('status, share_token')
        .eq('id', handoutId)
        .single();

      expect(error).toBeNull();
      expect(row).toEqual({
        status: 'draft',
        share_token: null,
      });
    });
  });

  describe('own-row happy path', () => {
    it('GM-A can publish their own draft', async () => {
      vi.mocked(createAppSupabaseClient).mockReturnValue(ownerAuthenticatedClient);

      const response = await publishHandout(
        makeContext({
          params: { id: handoutId },
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as { shareToken: string };
      expect(body.shareToken).toMatch(uuidPattern);
      expect(Object.keys(body)).toEqual(['shareToken']);

      const { data: row, error } = await adminClient
        .from('handouts')
        .select('status, share_token, published_at')
        .eq('id', handoutId)
        .single<PublishedHandoutRow>();

      expect(error).toBeNull();
      expect(row?.status).toBe('published');
      expect(row?.share_token).toBe(body.shareToken);
      const publishedAt = row?.published_at;
      expect(publishedAt).toBeTruthy();
      expect(() => new Date(String(publishedAt)).toISOString()).not.toThrow();
    });
  });
});
