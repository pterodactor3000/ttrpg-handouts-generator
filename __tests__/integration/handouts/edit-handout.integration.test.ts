import { createClient } from '@supabase/supabase-js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertNoSchemaLeakage } from '@/integration/helpers/assert-no-schema-leakage';
import { createAdminClient } from '@/integration/helpers/admin-client';
import { makeContext } from '@/integration/helpers/context-stub';
import { requireEnv } from '@/integration/helpers/env';
import { createTestUser, deleteTestUser, signInAsUser } from '@/integration/helpers/test-users';
import { PUT as updateHandout } from '@/pages/api/handouts/[id]';
import { POST as publishHandout } from '@/pages/api/handouts/[id]/publish';

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(),
}));

import { createClient as createAppSupabaseClient } from '@/lib/supabase';

const fixtureTitle = 'Edit integration handout';
const fixtureMarkdown = 'Fixture markdown for edit tests.';
const fixtureBackground = 'fantasy' as const;
const fixtureTags = ['edit-fixture'];

const validPutBody = {
  title: 'Updated title',
  markdownContent: 'Updated markdown content.',
  backgroundCategory: 'horror' as const,
  tags: ['updated'],
};

interface HandoutIdRow {
  id: string;
}

interface HandoutContentRow {
  title: string;
  markdown_content: string;
}

async function insertOwnerDraftHandout(ownerId: string): Promise<string> {
  const { data, error } = await adminClient
    .from('handouts')
    .insert({
      gm_id: ownerId,
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

async function insertOwnerArchivedHandout(ownerId: string): Promise<string> {
  const { data, error } = await adminClient
    .from('handouts')
    .insert({
      gm_id: ownerId,
      title: fixtureTitle,
      markdown_content: fixtureMarkdown,
      background_category: fixtureBackground,
      tags: fixtureTags,
      status: 'archived',
      archived_at: new Date().toISOString(),
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

async function deleteAllTestHandouts(ownerIds: string[]): Promise<void> {
  const { error } = await adminClient.from('handouts').delete().in('gm_id', ownerIds);
  if (error) {
    throw error;
  }
}

let adminClient: ReturnType<typeof createAdminClient>;
let ownerAuthenticatedClient: Awaited<ReturnType<typeof signInAsUser>>;
let otherOwnerAuthenticatedClient: Awaited<ReturnType<typeof signInAsUser>>;
let ownerUserId: string;
let otherOwnerUserId: string;
let draftHandoutId: string;

describe('edit handout PUT (integration)', () => {
  beforeAll(async () => {
    adminClient = createAdminClient();
    const password = 'integration-test-password';
    const ownerEmail = `edit-owner-${crypto.randomUUID()}@integration.test`;
    const otherOwnerEmail = `edit-other-${crypto.randomUUID()}@integration.test`;

    const ownerUser = await createTestUser(adminClient, ownerEmail, password);
    const otherOwnerUser = await createTestUser(adminClient, otherOwnerEmail, password);

    ownerUserId = ownerUser.id;
    otherOwnerUserId = otherOwnerUser.id;

    ownerAuthenticatedClient = await signInAsUser(ownerEmail, password);
    otherOwnerAuthenticatedClient = await signInAsUser(otherOwnerEmail, password);

    createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'));
  });

  beforeEach(async () => {
    await deleteAllTestHandouts([ownerUserId, otherOwnerUserId]);
    draftHandoutId = await insertOwnerDraftHandout(ownerUserId);
    vi.mocked(createAppSupabaseClient).mockReturnValue(ownerAuthenticatedClient);
  });

  afterEach(async () => {
    await deleteAllTestHandouts([ownerUserId, otherOwnerUserId]);
  });

  afterAll(async () => {
    await deleteAllTestHandouts([ownerUserId, otherOwnerUserId]);
    await deleteTestUser(adminClient, ownerUserId);
    await deleteTestUser(adminClient, otherOwnerUserId);
  });

  it("PUT on owner's draft handout returns 200 { id }", async () => {
    const response = await updateHandout(
      makeContext({
        method: 'PUT',
        body: validPutBody,
        params: { id: draftHandoutId },
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string };
    expect(body).toEqual({ id: draftHandoutId });

    const { data: row, error } = await adminClient
      .from('handouts')
      .select('title, markdown_content')
      .eq('id', draftHandoutId)
      .single<HandoutContentRow>();

    expect(error).toBeNull();
    expect(row).toEqual({
      title: validPutBody.title,
      markdown_content: validPutBody.markdownContent,
    });
  });

  it("PUT on owner's published handout returns 200 { id }", async () => {
    const publishResponse = await publishHandout(makeContext({ params: { id: draftHandoutId } }));
    expect(publishResponse.status).toBe(200);

    const response = await updateHandout(
      makeContext({
        method: 'PUT',
        body: validPutBody,
        params: { id: draftHandoutId },
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string };
    expect(body).toEqual({ id: draftHandoutId });

    const { data: row, error } = await adminClient
      .from('handouts')
      .select('title, markdown_content, status')
      .eq('id', draftHandoutId)
      .single<HandoutContentRow & { status: string }>();

    expect(error).toBeNull();
    expect(row?.status).toBe('published');
    expect(row).toEqual({
      title: validPutBody.title,
      markdown_content: validPutBody.markdownContent,
      status: 'published',
    });
  });

  it("PUT on owner's archived handout returns 500 { error: 'Failed to save handout' }", async () => {
    await deleteAllTestHandouts([ownerUserId]);
    const archivedHandoutId = await insertOwnerArchivedHandout(ownerUserId);

    const response = await updateHandout(
      makeContext({
        method: 'PUT',
        body: validPutBody,
        params: { id: archivedHandoutId },
      }),
    );

    await expectErrorBody(response, 500, { error: 'Failed to save handout' });
  });

  it('PUT by a non-owner returns 500 { error: Failed to save handout }', async () => {
    vi.mocked(createAppSupabaseClient).mockReturnValue(otherOwnerAuthenticatedClient);

    const response = await updateHandout(
      makeContext({
        method: 'PUT',
        body: validPutBody,
        params: { id: draftHandoutId },
      }),
    );

    await expectErrorBody(response, 500, { error: 'Failed to save handout' });

    const { data: row, error } = await adminClient
      .from('handouts')
      .select('title, markdown_content')
      .eq('id', draftHandoutId)
      .single<HandoutContentRow>();

    expect(error).toBeNull();
    expect(row).toEqual({
      title: fixtureTitle,
      markdown_content: fixtureMarkdown,
    });
  });
});
