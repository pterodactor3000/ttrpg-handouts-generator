import { createClient } from '@supabase/supabase-js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertNoSchemaLeakage } from '@/integration/helpers/assert-no-schema-leakage';
import { createAdminClient } from '@/integration/helpers/admin-client';
import { makeContext } from '@/integration/helpers/context-stub';
import { createTestUser, deleteTestUser, signInAsUser } from '@/integration/helpers/test-users';
import { DELETE as deleteHandout } from '@/pages/api/handouts/[id]';
import { POST as archiveHandout } from '@/pages/api/handouts/[id]/archive';

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(),
}));

import { createClient as createAppSupabaseClient } from '@/lib/supabase';

interface HandoutIdRow {
  id: string;
}

interface HandoutStatusRow {
  status: string;
}

async function insertOwnerDraftHandout(ownerId: string): Promise<string> {
  const { data, error } = await adminClient
    .from('handouts')
    .insert({
      gm_id: ownerId,
      title: 'Delete test handout',
      markdown_content: 'Fixture content',
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

async function deleteAllTestHandouts(ownerIds: string[]): Promise<void> {
  const { error } = await adminClient.from('handouts').delete().in('gm_id', ownerIds);
  if (error) {
    throw error;
  }
}

let adminClient: ReturnType<typeof createAdminClient>;
let unauthenticatedClient: ReturnType<typeof createClient>;
let ownerAuthenticatedClient: Awaited<ReturnType<typeof signInAsUser>>;
let ownerUserId: string;
let handoutId: string;

describe('delete archived handout (integration)', () => {
  beforeAll(async () => {
    adminClient = createAdminClient();
    const password = 'integration-test-password';
    const ownerEmail = `delete-owner-${crypto.randomUUID()}@integration.test`;
    const ownerUser = await createTestUser(adminClient, ownerEmail, password);
    ownerUserId = ownerUser.id;
    ownerAuthenticatedClient = await signInAsUser(ownerEmail, password);
    unauthenticatedClient = createClient(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_ANON_KEY ?? '');
  });

  beforeEach(async () => {
    await deleteAllTestHandouts([ownerUserId]);
    handoutId = await insertOwnerDraftHandout(ownerUserId);
  });

  afterEach(async () => {
    await deleteAllTestHandouts([ownerUserId]);
  });

  afterAll(async () => {
    await deleteAllTestHandouts([ownerUserId]);
    await deleteTestUser(adminClient, ownerUserId);
  });

  it('DELETE returns 401 when unauthenticated', async () => {
    vi.mocked(createAppSupabaseClient).mockReturnValue(unauthenticatedClient);

    const response = await deleteHandout(makeContext({ method: 'DELETE', params: { id: handoutId } }));

    expect(response.status).toBe(401);
    const body: unknown = await response.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('DELETE returns 404 for active draft handout', async () => {
    vi.mocked(createAppSupabaseClient).mockReturnValue(ownerAuthenticatedClient);

    const response = await deleteHandout(makeContext({ method: 'DELETE', params: { id: handoutId } }));

    expect(response.status).toBe(404);
    const body: unknown = await response.json();
    expect(body).toEqual({ error: 'Handout not found or not archived' });
    assertNoSchemaLeakage(JSON.stringify(body));
  });

  it('DELETE returns 200 and removes archived row', async () => {
    vi.mocked(createAppSupabaseClient).mockReturnValue(ownerAuthenticatedClient);

    const archiveResponse = await archiveHandout(makeContext({ params: { id: handoutId } }));
    expect(archiveResponse.status).toBe(200);

    const deleteResponse = await deleteHandout(makeContext({ method: 'DELETE', params: { id: handoutId } }));
    expect(deleteResponse.status).toBe(200);
    const deleteBody = (await deleteResponse.json()) as { id: string };
    expect(deleteBody.id).toBe(handoutId);

    const { data: row, error } = await adminClient
      .from('handouts')
      .select('status')
      .eq('id', handoutId)
      .maybeSingle<HandoutStatusRow>();

    expect(error).toBeNull();
    expect(row).toBeNull();
  });
});
