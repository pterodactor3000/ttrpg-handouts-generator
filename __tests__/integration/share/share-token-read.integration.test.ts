import { createClient } from '@supabase/supabase-js';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createAdminClient } from '@/integration/helpers/admin-client';
import { requireEnv } from '@/integration/helpers/env';
import { createTestUser, deleteTestUser } from '@/integration/helpers/test-users';

interface SharedHandoutRow {
  title: string;
  markdown_content: string;
  background_category: string;
}

interface HandoutFixtureInput {
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
let testUserId: string | undefined;

async function querySharedHandout(token: string) {
  return anonymousClient
    .from('handouts')
    .select('title, markdown_content, background_category')
    .eq('share_token', token)
    .in('status', ['published', 'archived'])
    .single<SharedHandoutRow>();
}

async function insertHandoutFixture(fixture: HandoutFixtureInput): Promise<void> {
  const { error } = await adminClient.from('handouts').insert({
    gm_id: testUserId,
    title: fixture.title,
    markdown_content: fixture.markdown_content,
    background_category: fixture.background_category,
    tags: [],
    status: fixture.status,
    share_token: fixture.share_token,
    published_at: fixture.published_at ?? null,
    archived_at: fixture.archived_at ?? null,
  });

  if (error) {
    throw error;
  }
}

async function deleteOwnerHandouts(): Promise<void> {
  if (!testUserId) {
    return;
  }

  const { error } = await adminClient.from('handouts').delete().eq('gm_id', testUserId);
  if (error) {
    throw error;
  }
}

describe('share token read (integration)', () => {
  beforeAll(async () => {
    adminClient = createAdminClient();
    const password = 'integration-test-password';
    const email = `share-token-read-${crypto.randomUUID()}@integration.test`;
    const testUser = await createTestUser(adminClient, email, password);
    testUserId = testUser.id;

    const supabaseUrl = requireEnv('SUPABASE_URL');
    const anonymousKey = requireEnv('SUPABASE_ANON_KEY');
    anonymousClient = createClient(supabaseUrl, anonymousKey);
  });

  afterEach(async () => {
    await deleteOwnerHandouts();
  });

  afterAll(async () => {
    await deleteOwnerHandouts();
    if (testUserId) {
      await deleteTestUser(adminClient, testUserId);
    }
  });

  it('returns a published handout for a valid share token', async () => {
    const shareToken = crypto.randomUUID();
    const fixture = {
      title: 'Published Share Title',
      markdown_content: 'Published share markdown content.',
      background_category: 'fantasy' as const,
      status: 'published' as const,
      share_token: shareToken,
      published_at: new Date().toISOString(),
    };

    await insertHandoutFixture(fixture);

    const { data, error } = await querySharedHandout(shareToken);

    expect(error).toBeNull();
    expect(data).toEqual({
      title: fixture.title,
      markdown_content: fixture.markdown_content,
      background_category: fixture.background_category,
    });
  });

  it('returns an archived handout for a valid share token (link permanence)', async () => {
    // No app-level archive endpoint exists yet (S-04 not shipped).
    // Admin insert exercises archived link-permanence directly against RLS.
    const shareToken = crypto.randomUUID();
    const fixture = {
      title: 'Archived Share Title',
      markdown_content: 'Archived share markdown content.',
      background_category: 'horror' as const,
      status: 'archived' as const,
      share_token: shareToken,
      published_at: new Date().toISOString(),
      archived_at: new Date().toISOString(),
    };

    await insertHandoutFixture(fixture);

    const { data, error } = await querySharedHandout(shareToken);

    expect(error).toBeNull();
    expect(data).toEqual({
      title: fixture.title,
      markdown_content: fixture.markdown_content,
      background_category: fixture.background_category,
    });
  });

  it('returns PGRST116 for a draft handout even when share_token matches', async () => {
    const shareToken = crypto.randomUUID();

    await insertHandoutFixture({
      title: 'Draft Share Title',
      markdown_content: 'Draft share markdown content.',
      background_category: 'scifi',
      status: 'draft',
      share_token: shareToken,
    });

    const { data, error } = await querySharedHandout(shareToken);

    expect(error?.code).toBe('PGRST116');
    expect(data).toBeNull();
  });

  it('returns PGRST116 for an unknown share token', async () => {
    const unknownToken = crypto.randomUUID();

    const { data, error } = await querySharedHandout(unknownToken);

    expect(error?.code).toBe('PGRST116');
    expect(data).toBeNull();
  });

  it('returns PGRST116 for a published handout with null share_token', async () => {
    const queryToken = crypto.randomUUID();

    await insertHandoutFixture({
      title: 'Published Without Token',
      markdown_content: 'Published handout missing share token.',
      background_category: 'fantasy',
      status: 'published',
      share_token: null,
      published_at: new Date().toISOString(),
    });

    const { data, error } = await querySharedHandout(queryToken);

    // PGRST116: anon_select_shared policy requires share_token IS NOT NULL;
    // also unreachable via SQL = NULL semantics (= NULL never matches).
    expect(error?.code).toBe('PGRST116');
    expect(data).toBeNull();
  });
});
