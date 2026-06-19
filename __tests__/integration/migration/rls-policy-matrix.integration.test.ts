// risk: test-plan.md #8 — migration/RLS policy change breaks prod access patterns
//
// Proves the handouts table role × operation matrix on a fresh Supabase instance.
// Raw Supabase clients only — no vi.mock('@/lib/supabase'); RLS policies are the
// subject under test.

import { createClient } from '@supabase/supabase-js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAdminClient } from '@/integration/helpers/admin-client';
import { requireEnv } from '@/integration/helpers/env';
import { createTestUser, deleteTestUser, signInAsUser } from '@/integration/helpers/test-users';

interface SharedHandoutRow {
  title: string;
  markdown_content: string;
  background_category: string;
}

interface HandoutIdRow {
  id: string;
}

interface HandoutTitleRow {
  title: string;
  markdown_content: string;
}

interface HandoutFixtureInput {
  gm_id: string;
  title: string;
  markdown_content: string;
  background_category: 'fantasy' | 'horror' | 'scifi';
  status: 'draft' | 'published' | 'archived';
  share_token: string | null;
  published_at?: string | null;
  archived_at?: string | null;
}

let adminClient: ReturnType<typeof createAdminClient>;
let anonymousClient: ReturnType<typeof createClient>;
let gmAClient: Awaited<ReturnType<typeof signInAsUser>>;
let gmBClient: Awaited<ReturnType<typeof signInAsUser>>;
let gmAUserId: string;
let gmBUserId: string;

const password = 'integration-test-password';

async function querySharedHandout(token: string) {
  return anonymousClient
    .from('handouts')
    .select('title, markdown_content, background_category')
    .eq('share_token', token)
    .in('status', ['published', 'archived'])
    .single<SharedHandoutRow>();
}

async function insertHandoutFixture(fixture: HandoutFixtureInput): Promise<string> {
  const { data, error } = await adminClient
    .from('handouts')
    .insert({
      gm_id: fixture.gm_id,
      title: fixture.title,
      markdown_content: fixture.markdown_content,
      background_category: fixture.background_category,
      tags: [],
      status: fixture.status,
      share_token: fixture.share_token,
      published_at: fixture.published_at ?? null,
      archived_at: fixture.archived_at ?? null,
    })
    .select('id')
    .single<HandoutIdRow>();

  if (error) {
    throw error;
  }

  return data.id;
}

async function deleteHandoutsForUsers(userIds: string[]): Promise<void> {
  const { error } = await adminClient.from('handouts').delete().in('gm_id', userIds);
  if (error) {
    throw error;
  }
}

describe('RLS policy matrix (integration)', () => {
  beforeAll(async () => {
    adminClient = createAdminClient();

    const gmAEmail = `rls-matrix-gm-a-${crypto.randomUUID()}@integration.test`;
    const gmBEmail = `rls-matrix-gm-b-${crypto.randomUUID()}@integration.test`;

    const gmAUser = await createTestUser(adminClient, gmAEmail, password);
    const gmBUser = await createTestUser(adminClient, gmBEmail, password);

    gmAUserId = gmAUser.id;
    gmBUserId = gmBUser.id;

    gmAClient = await signInAsUser(gmAEmail, password);
    gmBClient = await signInAsUser(gmBEmail, password);

    const supabaseUrl = requireEnv('SUPABASE_URL');
    const anonymousKey = requireEnv('SUPABASE_ANON_KEY');
    anonymousClient = createClient(supabaseUrl, anonymousKey);
  });

  afterEach(async () => {
    await deleteHandoutsForUsers([gmAUserId, gmBUserId]);
  });

  afterAll(async () => {
    await deleteHandoutsForUsers([gmAUserId, gmBUserId]);
    await deleteTestUser(adminClient, gmAUserId);
    await deleteTestUser(adminClient, gmBUserId);
  });

  describe('GM own-row CRUD', () => {
    it('gmA can insert, read back, and update own handout via authenticated client', async () => {
      const initialTitle = 'RLS matrix create title';
      const initialMarkdown = 'RLS matrix create markdown.';
      const updatedTitle = 'RLS matrix updated title';
      const updatedMarkdown = 'RLS matrix updated markdown.';

      const { data: inserted, error: insertError } = await gmAClient
        .from('handouts')
        .insert({
          gm_id: gmAUserId,
          title: initialTitle,
          markdown_content: initialMarkdown,
          background_category: 'fantasy',
          tags: [],
          status: 'draft',
        })
        .select('id')
        .single<HandoutIdRow>();

      expect(insertError).toBeNull();
      expect(inserted?.id).toBeTruthy();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const handoutId = inserted!.id;

      const { data: adminRead, error: adminReadError } = await adminClient
        .from('handouts')
        .select('title, markdown_content')
        .eq('id', handoutId)
        .single<HandoutTitleRow>();

      expect(adminReadError).toBeNull();
      expect(adminRead).toEqual({
        title: initialTitle,
        markdown_content: initialMarkdown,
      });

      const { error: updateError } = await gmAClient
        .from('handouts')
        .update({
          title: updatedTitle,
          markdown_content: updatedMarkdown,
        })
        .eq('id', handoutId);

      expect(updateError).toBeNull();

      const { data: adminAfterUpdate, error: adminAfterUpdateError } = await adminClient
        .from('handouts')
        .select('title, markdown_content')
        .eq('id', handoutId)
        .single<HandoutTitleRow>();

      expect(adminAfterUpdateError).toBeNull();
      expect(adminAfterUpdate).toEqual({
        title: updatedTitle,
        markdown_content: updatedMarkdown,
      });
    });
  });

  describe('Anon share read — published', () => {
    it('returns a published handout for a valid share token', async () => {
      const shareToken = crypto.randomUUID();
      const fixture = {
        title: 'RLS matrix published title',
        markdown_content: 'RLS matrix published markdown.',
        background_category: 'fantasy' as const,
        status: 'published' as const,
        share_token: shareToken,
        published_at: new Date().toISOString(),
      };

      await insertHandoutFixture({
        gm_id: gmAUserId,
        ...fixture,
      });

      const { data, error } = await querySharedHandout(shareToken);

      expect(error).toBeNull();
      expect(data).toEqual({
        title: fixture.title,
        markdown_content: fixture.markdown_content,
        background_category: fixture.background_category,
      });
    });
  });

  describe('Anon share read — archived', () => {
    it('returns an archived handout for a valid share token (link permanence)', async () => {
      const shareToken = crypto.randomUUID();
      const fixture = {
        title: 'RLS matrix archived title',
        markdown_content: 'RLS matrix archived markdown.',
        background_category: 'horror' as const,
        status: 'archived' as const,
        share_token: shareToken,
        published_at: new Date().toISOString(),
        archived_at: new Date().toISOString(),
      };

      await insertHandoutFixture({
        gm_id: gmAUserId,
        ...fixture,
      });

      const { data, error } = await querySharedHandout(shareToken);

      expect(error).toBeNull();
      expect(data).toEqual({
        title: fixture.title,
        markdown_content: fixture.markdown_content,
        background_category: fixture.background_category,
      });
    });
  });

  describe('Anon share read — draft', () => {
    it('returns PGRST116 for a draft handout even when share_token matches', async () => {
      const shareToken = crypto.randomUUID();

      await insertHandoutFixture({
        gm_id: gmAUserId,
        title: 'RLS matrix draft title',
        markdown_content: 'RLS matrix draft markdown.',
        background_category: 'scifi',
        status: 'draft',
        share_token: shareToken,
      });

      const { data, error } = await querySharedHandout(shareToken);

      expect(error?.code).toBe('PGRST116');
      expect(data).toBeNull();
    });
  });

  describe('Anon share read — unknown token', () => {
    it('returns PGRST116 for an unknown share token', async () => {
      const unknownToken = crypto.randomUUID();

      const { data, error } = await querySharedHandout(unknownToken);

      expect(error?.code).toBe('PGRST116');
      expect(data).toBeNull();
    });
  });

  describe('Cross-owner access', () => {
    const fixtureTitle = 'RLS matrix cross-owner fixture';
    const fixtureMarkdown = 'RLS matrix cross-owner markdown.';
    const attackerTitle = 'Attacker title';
    const attackerMarkdown = 'Attacker markdown.';

    let gmAHandoutId: string;

    beforeEach(async () => {
      gmAHandoutId = await insertHandoutFixture({
        gm_id: gmAUserId,
        title: fixtureTitle,
        markdown_content: fixtureMarkdown,
        background_category: 'fantasy',
        status: 'draft',
        share_token: null,
      });
    });

    it('gmB cannot SELECT gmA handout', async () => {
      const { data, error } = await gmBClient
        .from('handouts')
        .select('title, markdown_content')
        .eq('id', gmAHandoutId)
        .single<HandoutTitleRow>();

      expect(error?.code).toBe('PGRST116');
      expect(data).toBeNull();
    });

    it('gmB cannot UPDATE gmA handout', async () => {
      const { error: updateError } = await gmBClient
        .from('handouts')
        .update({
          title: attackerTitle,
          markdown_content: attackerMarkdown,
        })
        .eq('id', gmAHandoutId);

      expect(updateError).toBeNull();

      const { data: row, error: readError } = await adminClient
        .from('handouts')
        .select('title, markdown_content')
        .eq('id', gmAHandoutId)
        .single<HandoutTitleRow>();

      expect(readError).toBeNull();
      expect(row).toEqual({
        title: fixtureTitle,
        markdown_content: fixtureMarkdown,
      });
    });

    it('gmB cannot DELETE gmA handout', async () => {
      const { error: deleteError } = await gmBClient.from('handouts').delete().eq('id', gmAHandoutId);

      expect(deleteError).toBeNull();

      const { data: row, error: readError } = await adminClient
        .from('handouts')
        .select('id')
        .eq('id', gmAHandoutId)
        .single<HandoutIdRow>();

      expect(readError).toBeNull();
      expect(row?.id).toBe(gmAHandoutId);
    });
  });
});
