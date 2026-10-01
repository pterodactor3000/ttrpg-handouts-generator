import { createClient } from '@supabase/supabase-js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertNoSchemaLeakage } from '@/integration/helpers/assert-no-schema-leakage';
import { createAdminClient } from '@/integration/helpers/admin-client';
import { makeContext } from '@/integration/helpers/context-stub';
import { requireEnv } from '@/integration/helpers/env';
import { createTestUser, deleteTestUser, signInAsUser } from '@/integration/helpers/test-users';
import { POST as archiveHandout } from '@/pages/api/handouts/[id]/archive';
import { POST as publishHandout } from '@/pages/api/handouts/[id]/publish';
import { POST as unarchiveHandout } from '@/pages/api/handouts/[id]/unarchive';

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(),
}));

import { createClient as createAppSupabaseClient } from '@/lib/supabase';

const fixtureTitle = 'Unarchive integration handout';
const fixtureMarkdown = 'Fixture markdown for unarchive tests.';
const fixtureBackground = 'fantasy' as const;
const fixtureTags = ['unarchive-fixture'];

interface HandoutIdRow {
  id: string;
}

interface RestoredHandoutRow {
  status: string;
  share_token: string | null;
  archived_at: string | null;
  published_at: string | null;
  title: string;
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

async function readHandoutRow(id: string): Promise<RestoredHandoutRow> {
  const { data, error } = await adminClient
    .from('handouts')
    .select('status, share_token, archived_at, published_at, title')
    .eq('id', id)
    .single<RestoredHandoutRow>();

  if (error) {
    throw error;
  }

  return data;
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
let unauthenticatedClient: ReturnType<typeof createClient>;
let ownerAuthenticatedClient: Awaited<ReturnType<typeof signInAsUser>>;
let otherOwnerAuthenticatedClient: Awaited<ReturnType<typeof signInAsUser>>;
let ownerUserId: string;
let otherOwnerUserId: string;
let handoutId: string;

describe('unarchive handout (integration)', () => {
  beforeAll(async () => {
    adminClient = createAdminClient();
    const password = 'integration-test-password';
    const ownerEmail = `unarchive-owner-${crypto.randomUUID()}@integration.test`;
    const otherOwnerEmail = `unarchive-other-${crypto.randomUUID()}@integration.test`;

    const ownerUser = await createTestUser(adminClient, ownerEmail, password);
    const otherOwnerUser = await createTestUser(adminClient, otherOwnerEmail, password);

    ownerUserId = ownerUser.id;
    otherOwnerUserId = otherOwnerUser.id;

    ownerAuthenticatedClient = await signInAsUser(ownerEmail, password);
    otherOwnerAuthenticatedClient = await signInAsUser(otherOwnerEmail, password);

    unauthenticatedClient = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'));
  });

  beforeEach(async () => {
    await deleteAllTestHandouts([ownerUserId, otherOwnerUserId]);
    handoutId = await insertOwnerDraftHandout(ownerUserId);
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

  it('restores an archived published handout to draft and keeps the token and published_at', async () => {
    const publishResponse = await publishHandout(makeContext({ params: { id: handoutId } }));
    expect(publishResponse.status).toBe(200);
    const publishBody = (await publishResponse.json()) as { shareToken: string };
    const publishedRow = await readHandoutRow(handoutId);

    const archiveResponse = await archiveHandout(makeContext({ params: { id: handoutId } }));
    expect(archiveResponse.status).toBe(200);

    const response = await unarchiveHandout(makeContext({ params: { id: handoutId }, body: { target: 'draft' } }));

    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string; status: string; shareToken: string | null };
    expect(body).toEqual({
      id: handoutId,
      status: 'draft',
      shareToken: publishBody.shareToken,
    });

    const row = await readHandoutRow(handoutId);
    expect(row.status).toBe('draft');
    expect(row.archived_at).toBeNull();
    expect(row.share_token).toBe(publishBody.shareToken);
    expect(row.published_at).toBe(publishedRow.published_at);
  });

  it('restores an archived published handout to published and keeps the token', async () => {
    const publishResponse = await publishHandout(makeContext({ params: { id: handoutId } }));
    expect(publishResponse.status).toBe(200);
    const publishBody = (await publishResponse.json()) as { shareToken: string };
    const publishedRow = await readHandoutRow(handoutId);

    const archiveResponse = await archiveHandout(makeContext({ params: { id: handoutId } }));
    expect(archiveResponse.status).toBe(200);

    const response = await unarchiveHandout(makeContext({ params: { id: handoutId }, body: { target: 'published' } }));

    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string; status: string; shareToken: string | null };
    expect(body).toEqual({
      id: handoutId,
      status: 'published',
      shareToken: publishBody.shareToken,
    });

    const row = await readHandoutRow(handoutId);
    expect(row.status).toBe('published');
    expect(row.archived_at).toBeNull();
    expect(row.share_token).toBe(publishBody.shareToken);
    expect(row.published_at).toBe(publishedRow.published_at);
  });

  it('mints a token when a valid archived draft is restored to published', async () => {
    const archiveResponse = await archiveHandout(makeContext({ params: { id: handoutId } }));
    expect(archiveResponse.status).toBe(200);

    const response = await unarchiveHandout(makeContext({ params: { id: handoutId }, body: { target: 'published' } }));

    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string; status: string; shareToken: string | null };
    expect(body.id).toBe(handoutId);
    expect(body.status).toBe('published');
    expect(body.shareToken).toEqual(expect.any(String));

    const row = await readHandoutRow(handoutId);
    expect(row.status).toBe('published');
    expect(row.archived_at).toBeNull();
    expect(row.share_token).toBe(body.shareToken);
    expect(row.published_at).toEqual(expect.any(String));
  });

  it('returns 422 and leaves the row archived when the title is empty', async () => {
    const { error: titleError } = await adminClient.from('handouts').update({ title: '' }).eq('id', handoutId);
    expect(titleError).toBeNull();

    const archiveResponse = await archiveHandout(makeContext({ params: { id: handoutId } }));
    expect(archiveResponse.status).toBe(200);
    const archivedRow = await readHandoutRow(handoutId);

    const response = await unarchiveHandout(makeContext({ params: { id: handoutId }, body: { target: 'published' } }));

    await expectErrorBody(response, 422, { error: 'Title is required before publishing.' });

    const row = await readHandoutRow(handoutId);
    expect(row.status).toBe('archived');
    expect(row.archived_at).toBe(archivedRow.archived_at);
    expect(row.title).toBe('');
  });

  it('returns 404 when another GM restores the row', async () => {
    const archiveResponse = await archiveHandout(makeContext({ params: { id: handoutId } }));
    expect(archiveResponse.status).toBe(200);
    const archivedRow = await readHandoutRow(handoutId);

    vi.mocked(createAppSupabaseClient).mockReturnValue(otherOwnerAuthenticatedClient);

    const response = await unarchiveHandout(makeContext({ params: { id: handoutId }, body: { target: 'draft' } }));

    await expectErrorBody(response, 404, { error: 'Handout not found' });

    const row = await readHandoutRow(handoutId);
    expect(row.status).toBe('archived');
    expect(row.archived_at).toBe(archivedRow.archived_at);
  });

  it('rejects a direct owner update that leaves the handout archived', async () => {
    const archiveResponse = await archiveHandout(makeContext({ params: { id: handoutId } }));
    expect(archiveResponse.status).toBe(200);
    const archivedRow = await readHandoutRow(handoutId);

    const { error } = await ownerAuthenticatedClient
      .from('handouts')
      .update({ title: 'Changed while archived', status: 'archived' })
      .eq('id', handoutId)
      .eq('gm_id', ownerUserId);

    expect(error).not.toBeNull();

    const row = await readHandoutRow(handoutId);
    expect(row.status).toBe('archived');
    expect(row.title).toBe(archivedRow.title);
    expect(row.archived_at).toBe(archivedRow.archived_at);
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createAppSupabaseClient).mockReturnValue(unauthenticatedClient);

    const response = await unarchiveHandout(makeContext({ params: { id: handoutId }, body: { target: 'draft' } }));

    await expectErrorBody(response, 401, { error: 'Unauthorized' });
  });
});
