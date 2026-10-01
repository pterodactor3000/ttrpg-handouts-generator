import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAdminClient } from '@/integration/helpers/admin-client';
import { requireEnv } from '@/integration/helpers/env';
import { createTestUser } from '@/integration/helpers/test-users';
import { purgeScheduledAccounts } from '@/lib/purge-scheduled-accounts';

const password = 'integration-test-password';
// Earlier than any real scheduled deletion, so this purge does not delete other local accounts.
const scheduledAt = new Date('1970-01-02T00:00:00.000Z');
const nowBeforeScheduledAt = new Date('1970-01-01T00:00:00.000Z');
const nowAfterScheduledAt = new Date('1970-01-02T00:00:01.000Z');

let adminClient: ReturnType<typeof createAdminClient>;
let anonymousClient: ReturnType<typeof createClient>;
let ownerUserId: string;
let ownerEmail: string;
let shareToken: string;

async function insertPublishedHandout(): Promise<void> {
  const { error } = await adminClient.from('handouts').insert({
    gm_id: ownerUserId,
    title: 'Purge fixture handout',
    markdown_content: 'Purge fixture content',
    background_category: 'fantasy',
    tags: [],
    status: 'published',
    share_token: shareToken,
    published_at: scheduledAt.toISOString(),
    archived_at: null,
  });

  if (error) {
    throw error;
  }
}

async function insertDeletionRow(): Promise<void> {
  const { error } = await adminClient.from('account_deletions').insert({
    gm_id: ownerUserId,
    email: ownerEmail,
    scheduled_at: scheduledAt.toISOString(),
  });

  if (error) {
    throw error;
  }
}

async function readHandoutCount(): Promise<number> {
  const { data, error } = await adminClient.from('handouts').select('id').eq('gm_id', ownerUserId);
  if (error) {
    throw error;
  }

  return data.length;
}

async function readDeletionRowCount(): Promise<number> {
  const { data, error } = await adminClient.from('account_deletions').select('gm_id').eq('gm_id', ownerUserId);
  if (error) {
    throw error;
  }

  return data.length;
}

async function deleteOwnerIfPresent(): Promise<void> {
  const { error } = await adminClient.auth.admin.deleteUser(ownerUserId);
  if (error && error.status !== 404 && error.message !== 'User not found') {
    throw error;
  }
}

describe('purge scheduled accounts (integration)', () => {
  beforeAll(async () => {
    adminClient = createAdminClient();
    ownerEmail = `purge-owner-${crypto.randomUUID()}@integration.test`;
    shareToken = crypto.randomUUID();
    const owner = await createTestUser(adminClient, ownerEmail, password);
    ownerUserId = owner.id;
    await insertPublishedHandout();
    await insertDeletionRow();

    anonymousClient = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'));
  });

  afterAll(async () => {
    await adminClient.from('handouts').delete().eq('gm_id', ownerUserId);
    await adminClient.from('account_deletions').delete().eq('gm_id', ownerUserId);
    await deleteOwnerIfPresent();
  });

  it('leaves a future account in place, then deletes it once the instant has passed', async () => {
    const skippedIds = await purgeScheduledAccounts(nowBeforeScheduledAt);
    const ownerBefore = await adminClient.auth.admin.getUserById(ownerUserId);

    expect(skippedIds).toEqual([]);
    expect(ownerBefore.data.user?.id).toBe(ownerUserId);
    expect(await readHandoutCount()).toBe(1);
    expect(await readDeletionRowCount()).toBe(1);

    const deletedIds = await purgeScheduledAccounts(nowAfterScheduledAt);
    const ownerAfter = await adminClient.auth.admin.getUserById(ownerUserId);
    const sharedHandout = await anonymousClient
      .from('handouts')
      .select('id')
      .eq('share_token', shareToken)
      .in('status', ['published', 'archived'])
      .single();

    expect(deletedIds).toEqual([ownerUserId]);
    expect(ownerAfter.data.user).toBeNull();
    expect(await readHandoutCount()).toBe(0);
    expect(await readDeletionRowCount()).toBe(0);
    expect(sharedHandout.data).toBeNull();
    expect(sharedHandout.error?.code).toBe('PGRST116');

    const secondPassIds = await purgeScheduledAccounts(nowAfterScheduledAt);

    expect(secondPassIds).toEqual([]);
  });
});
