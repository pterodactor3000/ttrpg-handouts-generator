import { createClient } from '@supabase/supabase-js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertNoSchemaLeakage } from '@/integration/helpers/assert-no-schema-leakage';
import { createAdminClient } from '@/integration/helpers/admin-client';
import { makeContext } from '@/integration/helpers/context-stub';
import { requireEnv } from '@/integration/helpers/env';
import { createTestUser, deleteTestUser, signInAsUser } from '@/integration/helpers/test-users';
import { POST as archiveHandout } from '@/pages/api/handouts/[id]/archive';
import { POST as publishHandout } from '@/pages/api/handouts/[id]/publish';

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(),
}));

import { createClient as createAppSupabaseClient } from '@/lib/supabase';

const fixtureTitle = 'Archive integration handout';
const fixtureMarkdown = 'Fixture markdown for archive tests.';
const fixtureBackground = 'fantasy' as const;
const fixtureTags = ['archive-fixture'];

interface HandoutIdRow {
  id: string;
}

interface ArchivedHandoutRow {
  status: string;
  share_token: string | null;
  archived_at: string | null;
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

describe('archive handout (integration)', () => {
  beforeAll(async () => {
    adminClient = createAdminClient();
    const password = 'integration-test-password';
    const ownerEmail = `archive-owner-${crypto.randomUUID()}@integration.test`;
    const otherOwnerEmail = `archive-other-${crypto.randomUUID()}@integration.test`;

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
  });

  afterEach(async () => {
    await deleteAllTestHandouts([ownerUserId, otherOwnerUserId]);
  });

  afterAll(async () => {
    await deleteAllTestHandouts([ownerUserId, otherOwnerUserId]);
    await deleteTestUser(adminClient, ownerUserId);
    await deleteTestUser(adminClient, otherOwnerUserId);
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createAppSupabaseClient).mockReturnValue(unauthenticatedClient);

    const response = await archiveHandout(makeContext({ params: { id: handoutId } }));

    await expectErrorBody(response, 401, { error: 'Unauthorized' });
  });

  it('archives own draft handout', async () => {
    vi.mocked(createAppSupabaseClient).mockReturnValue(ownerAuthenticatedClient);

    const response = await archiveHandout(makeContext({ params: { id: handoutId } }));

    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string };
    expect(body.id).toBe(handoutId);

    const { data: row, error } = await adminClient
      .from('handouts')
      .select('status, share_token, archived_at')
      .eq('id', handoutId)
      .single<ArchivedHandoutRow>();

    expect(error).toBeNull();
    expect(row?.status).toBe('archived');
    expect(row?.share_token).toBeNull();
    expect(row?.archived_at).toBeTruthy();
    expect(() => new Date(String(row?.archived_at)).toISOString()).not.toThrow();
  });

  it('archives own published handout and preserves share_token', async () => {
    vi.mocked(createAppSupabaseClient).mockReturnValue(ownerAuthenticatedClient);

    const publishResponse = await publishHandout(makeContext({ params: { id: handoutId } }));
    expect(publishResponse.status).toBe(200);
    const publishBody = (await publishResponse.json()) as { shareToken: string };

    const response = await archiveHandout(makeContext({ params: { id: handoutId } }));
    expect(response.status).toBe(200);

    const { data: row, error } = await adminClient
      .from('handouts')
      .select('status, share_token, archived_at')
      .eq('id', handoutId)
      .single<ArchivedHandoutRow>();

    expect(error).toBeNull();
    expect(row?.status).toBe('archived');
    expect(row?.share_token).toBe(publishBody.shareToken);
    expect(row?.archived_at).toBeTruthy();
  });

  it('returns 404 for cross-owner archive attempt without mutating the row', async () => {
    vi.mocked(createAppSupabaseClient).mockReturnValue(otherOwnerAuthenticatedClient);

    const response = await archiveHandout(makeContext({ params: { id: handoutId } }));

    await expectErrorBody(response, 404, { error: 'Handout not found or already archived' });

    const { data: row, error } = await adminClient
      .from('handouts')
      .select('status')
      .eq('id', handoutId)
      .single<{ status: string }>();

    expect(error).toBeNull();
    expect(row?.status).toBe('draft');
  });

  it('returns 404 when archiving an already archived handout', async () => {
    vi.mocked(createAppSupabaseClient).mockReturnValue(ownerAuthenticatedClient);

    const firstResponse = await archiveHandout(makeContext({ params: { id: handoutId } }));
    expect(firstResponse.status).toBe(200);

    const secondResponse = await archiveHandout(makeContext({ params: { id: handoutId } }));

    await expectErrorBody(secondResponse, 404, { error: 'Handout not found or already archived' });
  });
});
