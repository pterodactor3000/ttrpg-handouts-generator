// risk: test-plan.md #8 — migration/RLS policy change breaks prod access patterns
//
// Proves the handouts table role × operation matrix on a fresh Supabase instance.
// Raw Supabase clients only — no vi.mock('@/lib/supabase'); RLS policies are the
// subject under test.

import { createClient } from '@supabase/supabase-js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAdminClient } from '@/integration/helpers/admin-client';
import { makeContext } from '@/integration/helpers/context-stub';
import { requireEnv } from '@/integration/helpers/env';
import {
  createTestUser,
  deleteTestUser,
  signInAsUser,
  signInWithPasswordAndGetCookieHeader,
} from '@/integration/helpers/test-users';
import { POST as createHandout } from '@/pages/api/handouts/index';
import { DELETE as deleteHandout, PUT as updateHandout } from '@/pages/api/handouts/[id]';
import { POST as archiveHandout } from '@/pages/api/handouts/[id]/archive';
import { POST as publishHandout } from '@/pages/api/handouts/[id]/publish';

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
let otherOwnerAuthenticatedClient: Awaited<ReturnType<typeof signInAsUser>>;
let ownerUserId: string;
let otherOwnerUserId: string;
let ownerEmail: string;

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

    ownerEmail = `rls-matrix-owner-${crypto.randomUUID()}@integration.test`;
    const otherOwnerEmail = `rls-matrix-other-owner-${crypto.randomUUID()}@integration.test`;

    const ownerUser = await createTestUser(adminClient, ownerEmail, password);
    const otherOwnerUser = await createTestUser(adminClient, otherOwnerEmail, password);

    ownerUserId = ownerUser.id;
    otherOwnerUserId = otherOwnerUser.id;

    otherOwnerAuthenticatedClient = await signInAsUser(otherOwnerEmail, password);

    const supabaseUrl = requireEnv('SUPABASE_URL');
    const anonymousKey = requireEnv('SUPABASE_ANON_KEY');
    anonymousClient = createClient(supabaseUrl, anonymousKey);
  });

  afterEach(async () => {
    await deleteHandoutsForUsers([ownerUserId, otherOwnerUserId]);
  });

  afterAll(async () => {
    await deleteHandoutsForUsers([ownerUserId, otherOwnerUserId]);
    await deleteTestUser(adminClient, ownerUserId);
    await deleteTestUser(adminClient, otherOwnerUserId);
  });

  describe('GM own-row CRUD', () => {
    it('gmA can create via POST /api/handouts, read back, and update via PUT', async () => {
      const initialTitle = 'RLS matrix create title';
      const initialMarkdown = 'RLS matrix create markdown.';
      const updatedTitle = 'RLS matrix updated title';
      const updatedMarkdown = 'RLS matrix updated markdown.';
      const cookieHeader = await signInWithPasswordAndGetCookieHeader(ownerEmail, password);

      const createResponse = await createHandout(
        makeContext({
          cookieHeader,
          body: {
            title: initialTitle,
            markdownContent: initialMarkdown,
            backgroundCategory: 'fantasy',
            tags: [],
          },
        }),
      );

      expect(createResponse.status).toBe(201);
      const createBody = (await createResponse.json()) as { id: string };
      expect(typeof createBody.id).toBe('string');
      const handoutId = createBody.id;

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

      const updateResponse = await updateHandout(
        makeContext({
          method: 'PUT',
          cookieHeader,
          params: { id: handoutId },
          body: {
            title: updatedTitle,
            markdownContent: updatedMarkdown,
            backgroundCategory: 'fantasy',
            tags: [],
          },
        }),
      );

      expect(updateResponse.status).toBe(200);

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

    it('gmA can DELETE own archived handout via DELETE /api/handouts/[id]', async () => {
      const cookieHeader = await signInWithPasswordAndGetCookieHeader(ownerEmail, password);

      const createResponse = await createHandout(
        makeContext({
          cookieHeader,
          body: {
            title: 'RLS matrix delete title',
            markdownContent: 'RLS matrix delete markdown.',
            backgroundCategory: 'fantasy',
            tags: [],
          },
        }),
      );
      expect(createResponse.status).toBe(201);
      const handoutId = ((await createResponse.json()) as { id: string }).id;

      const publishResponse = await publishHandout(makeContext({ cookieHeader, params: { id: handoutId } }));
      expect(publishResponse.status).toBe(200);

      const archiveResponse = await archiveHandout(makeContext({ cookieHeader, params: { id: handoutId } }));
      expect(archiveResponse.status).toBe(200);

      const deleteResponse = await deleteHandout(
        makeContext({ method: 'DELETE', cookieHeader, params: { id: handoutId } }),
      );
      expect(deleteResponse.status).toBe(200);

      const { data: row, error } = await adminClient
        .from('handouts')
        .select('id')
        .eq('id', handoutId)
        .maybeSingle<HandoutIdRow>();

      expect(error).toBeNull();
      expect(row).toBeNull();
    });

    it('gmA cannot DELETE own draft handout via DELETE /api/handouts/[id]', async () => {
      const fixtureTitle = 'RLS matrix draft delete title';
      const cookieHeader = await signInWithPasswordAndGetCookieHeader(ownerEmail, password);

      const createResponse = await createHandout(
        makeContext({
          cookieHeader,
          body: {
            title: fixtureTitle,
            markdownContent: 'RLS matrix draft delete markdown.',
            backgroundCategory: 'fantasy',
            tags: [],
          },
        }),
      );
      expect(createResponse.status).toBe(201);
      const handoutId = ((await createResponse.json()) as { id: string }).id;

      const deleteResponse = await deleteHandout(
        makeContext({ method: 'DELETE', cookieHeader, params: { id: handoutId } }),
      );
      expect(deleteResponse.status).toBe(404);

      const { data: row, error } = await adminClient
        .from('handouts')
        .select('title')
        .eq('id', handoutId)
        .single<{ title: string }>();

      expect(error).toBeNull();
      expect(row?.title).toBe(fixtureTitle);
    });
  });

  // Anon share-read cases mirror __tests__/integration/share/share-token-read.integration.test.ts.
  // Null share_token on published rows is covered there, not in this Risk #8 matrix suite.

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
        gm_id: ownerUserId,
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
        gm_id: ownerUserId,
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
        gm_id: ownerUserId,
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

    let ownerHandoutId: string;

    beforeEach(async () => {
      ownerHandoutId = await insertHandoutFixture({
        gm_id: ownerUserId,
        title: fixtureTitle,
        markdown_content: fixtureMarkdown,
        background_category: 'fantasy',
        status: 'draft',
        share_token: null,
      });
    });

    it('gmB cannot INSERT handout with gmA gm_id', async () => {
      const crossOwnerInsertTitle = 'RLS matrix cross-owner insert title';
      const { error: insertError } = await otherOwnerAuthenticatedClient.from('handouts').insert({
        gm_id: ownerUserId,
        title: crossOwnerInsertTitle,
        markdown_content: 'RLS matrix cross-owner insert markdown.',
        background_category: 'fantasy',
        tags: [],
        status: 'draft',
      });

      expect(insertError).not.toBeNull();

      const { data: rows, error: listError } = await adminClient
        .from('handouts')
        .select('id')
        .eq('gm_id', ownerUserId)
        .eq('title', crossOwnerInsertTitle);

      expect(listError).toBeNull();
      expect(rows).toEqual([]);
    });

    it('gmB cannot SELECT gmA handout', async () => {
      const { data, error } = await otherOwnerAuthenticatedClient
        .from('handouts')
        .select('title, markdown_content')
        .eq('id', ownerHandoutId)
        .single<HandoutTitleRow>();

      expect(error?.code).toBe('PGRST116');
      expect(data).toBeNull();
    });

    it('gmB cannot UPDATE gmA handout', async () => {
      const { error: updateError } = await otherOwnerAuthenticatedClient
        .from('handouts')
        .update({
          title: attackerTitle,
          markdown_content: attackerMarkdown,
        })
        .eq('id', ownerHandoutId);

      expect(updateError).toBeNull();

      const { data: row, error: readError } = await adminClient
        .from('handouts')
        .select('title, markdown_content')
        .eq('id', ownerHandoutId)
        .single<HandoutTitleRow>();

      expect(readError).toBeNull();
      expect(row).toEqual({
        title: fixtureTitle,
        markdown_content: fixtureMarkdown,
      });
    });

    it('gmB cannot DELETE gmA handout', async () => {
      const { error: deleteError } = await otherOwnerAuthenticatedClient
        .from('handouts')
        .delete()
        .eq('id', ownerHandoutId);

      expect(deleteError).toBeNull();

      const { data: row, error: readError } = await adminClient
        .from('handouts')
        .select('id')
        .eq('id', ownerHandoutId)
        .single<HandoutIdRow>();

      expect(readError).toBeNull();
      expect(row?.id).toBe(ownerHandoutId);
    });
  });
});
