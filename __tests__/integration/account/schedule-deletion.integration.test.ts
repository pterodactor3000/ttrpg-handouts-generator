import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { createClient, type User } from '@supabase/supabase-js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertNoSchemaLeakage } from '@/integration/helpers/assert-no-schema-leakage';
import { createAdminClient } from '@/integration/helpers/admin-client';
import { makeContext } from '@/integration/helpers/context-stub';
import { requireEnv } from '@/integration/helpers/env';
import {
  createTestUser,
  deleteTestUser,
  signInAsUser,
  signInWithPasswordAndGetCookieHeader,
} from '@/integration/helpers/test-users';
import { POST as scheduleAccountDeletion } from '@/pages/api/account/deletion';

const execFileAsync = promisify(execFile);
const password = 'integration-test-password';

interface AccountDeletionRecord {
  email: string;
  scheduled_at: string;
}

interface HandoutDeletionRow {
  status: string;
  scheduled_deletion_at: string | null;
}

interface AccountDeletionPolicy {
  policyName: string;
  command: string;
  usingExpression: string | null;
  checkExpression: string | null;
  roles: string[];
}

interface AccountDeletionSchemaReport {
  tableExists: boolean;
  rowLevelSecurityEnabled: boolean;
  scheduledDeletionAtNullable: boolean;
  emailUnique: boolean;
  policies: AccountDeletionPolicy[];
}

interface SchemaQueryRow {
  policy_name: string;
  command: string;
  using_expression: string | null;
  check_expression: string | null;
  roles: string[];
}

interface SchemaQueryPayload {
  table_exists: boolean;
  row_level_security_enabled: boolean;
  scheduled_deletion_at_nullable: boolean;
  email_unique: boolean;
  policies: SchemaQueryRow[];
}

const SCHEMA_QUERY = `
select json_build_object(
  'table_exists', exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'account_deletions'
  ),
  'row_level_security_enabled', (
    select relrowsecurity from pg_class where oid = 'public.account_deletions'::regclass
  ),
  'scheduled_deletion_at_nullable', (
    select is_nullable = 'YES'
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'handouts'
      and column_name = 'scheduled_deletion_at'
  ),
  'email_unique', exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'account_deletions'
      and indexdef ilike 'create unique index%'
      and indexdef ilike '%(email)%'
  ),
  'policies', (
    select coalesce(json_agg(policy_row order by policy_row.policy_name), '[]'::json)
    from (
      select
        polname as policy_name,
        polcmd as command,
        pg_get_expr(polqual, polrelid) as using_expression,
        pg_get_expr(polwithcheck, polrelid) as check_expression,
        (
          select coalesce(json_agg(rolname order by rolname), '[]'::json)
          from pg_roles
          where oid = any (polroles)
        ) as roles
      from pg_policy
      where polrelid = 'public.account_deletions'::regclass
    ) as policy_row
  )
)::text;
`;

function getDatabaseContainerName(): string {
  const config = readFileSync('supabase/config.toml', 'utf8');
  const match = /^project_id = "([^"]+)"/m.exec(config);
  const projectId = match?.[1];
  if (!projectId) {
    throw new Error('supabase/config.toml is missing project_id');
  }

  return `supabase_db_${projectId}`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isSchemaQueryRow(value: unknown): value is SchemaQueryRow {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (
    !('policy_name' in value) ||
    !('command' in value) ||
    !('using_expression' in value) ||
    !('check_expression' in value) ||
    !('roles' in value)
  ) {
    return false;
  }

  return (
    typeof value.policy_name === 'string' &&
    typeof value.command === 'string' &&
    (value.using_expression === null || typeof value.using_expression === 'string') &&
    (value.check_expression === null || typeof value.check_expression === 'string') &&
    isStringArray(value.roles)
  );
}

function isSchemaQueryPayload(value: unknown): value is SchemaQueryPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (
    !('table_exists' in value) ||
    !('row_level_security_enabled' in value) ||
    !('scheduled_deletion_at_nullable' in value) ||
    !('email_unique' in value) ||
    !('policies' in value)
  ) {
    return false;
  }

  return (
    typeof value.table_exists === 'boolean' &&
    typeof value.row_level_security_enabled === 'boolean' &&
    typeof value.scheduled_deletion_at_nullable === 'boolean' &&
    typeof value.email_unique === 'boolean' &&
    Array.isArray(value.policies) &&
    value.policies.every((policy) => isSchemaQueryRow(policy))
  );
}

async function readAccountDeletionSchema(): Promise<AccountDeletionSchemaReport> {
  const { stdout } = await execFileAsync('docker', [
    'exec',
    getDatabaseContainerName(),
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-tA',
    '-c',
    SCHEMA_QUERY,
  ]);

  const parsed: unknown = JSON.parse(stdout) as unknown;
  if (!isSchemaQueryPayload(parsed)) {
    throw new Error('Account deletion schema query returned an unexpected payload');
  }

  return {
    tableExists: parsed.table_exists,
    rowLevelSecurityEnabled: parsed.row_level_security_enabled,
    scheduledDeletionAtNullable: parsed.scheduled_deletion_at_nullable,
    emailUnique: parsed.email_unique,
    policies: parsed.policies.map((policy) => ({
      policyName: policy.policy_name,
      command: policy.command,
      usingExpression: policy.using_expression,
      checkExpression: policy.check_expression,
      roles: policy.roles,
    })),
  };
}

function readScheduledAt(body: unknown): string {
  if (typeof body !== 'object' || body === null || !('scheduledAt' in body) || typeof body.scheduledAt !== 'string') {
    throw new Error('Deletion response is missing scheduledAt');
  }

  return body.scheduledAt;
}

function readAppMetadataInstant(appMetadata: unknown): string {
  if (
    typeof appMetadata !== 'object' ||
    appMetadata === null ||
    !('deletion_scheduled_at' in appMetadata) ||
    typeof appMetadata.deletion_scheduled_at !== 'string'
  ) {
    throw new Error('deletion_scheduled_at was not stored on app_metadata');
  }

  return appMetadata.deletion_scheduled_at;
}

let adminClient: ReturnType<typeof createAdminClient>;
let anonymousClient: ReturnType<typeof createClient>;
let ownerAuthenticatedClient: Awaited<ReturnType<typeof signInAsUser>>;
let ownerUser: User | undefined;
let ownerUserId: string;
let otherOwnerUserId: string;
let ownerEmail: string;

async function insertHandout(input: {
  ownerId: string;
  status: 'draft' | 'published' | 'archived';
  shareToken: string | null;
}): Promise<void> {
  const { error } = await adminClient.from('handouts').insert({
    gm_id: input.ownerId,
    title: `${input.status} deletion handout`,
    markdown_content: 'Deletion fixture content',
    background_category: 'fantasy',
    tags: [],
    status: input.status,
    share_token: input.shareToken,
    published_at: input.status === 'draft' ? null : new Date().toISOString(),
    archived_at: input.status === 'archived' ? new Date().toISOString() : null,
  });

  if (error) {
    throw error;
  }
}

async function deleteHandoutsForUsers(userIds: string[]): Promise<void> {
  const { error } = await adminClient.from('handouts').delete().in('gm_id', userIds);
  if (error) {
    throw error;
  }
}

async function deleteAccountDeletionsForUsers(userIds: string[]): Promise<void> {
  const { error } = await adminClient.from('account_deletions').delete().in('gm_id', userIds);
  if (error) {
    throw error;
  }
}

async function unbanOwner(): Promise<void> {
  const { error } = await adminClient.auth.admin.updateUserById(ownerUserId, { ban_duration: 'none' });
  if (error) {
    throw error;
  }
}

async function signOutAnonymousClient(): Promise<void> {
  const { data, error: sessionError } = await anonymousClient.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }
  if (!data.session) {
    return;
  }

  const { error } = await anonymousClient.auth.signOut();
  if (error) {
    throw error;
  }
}

function requireOwnerUser(): User {
  if (!ownerUser?.email) {
    throw new Error('Owner test user is missing an email');
  }

  return ownerUser;
}

async function postDeletion(submittedPassword: string) {
  const cookieHeader = await signInWithPasswordAndGetCookieHeader(ownerEmail, password);
  return scheduleAccountDeletion({
    ...makeContext({ body: { password: submittedPassword }, cookieHeader }),
    locals: { user: requireOwnerUser() },
  });
}

async function readDeletionRecord(): Promise<AccountDeletionRecord | null> {
  const { data, error } = (await adminClient
    .from('account_deletions')
    .select('email, scheduled_at')
    .eq('gm_id', ownerUserId)
    .maybeSingle()) as {
    data: AccountDeletionRecord | null;
    error: { message: string } | null;
  };

  if (error) {
    throw new Error(`Failed to read account deletion for ${ownerUserId}: ${error.message}`);
  }

  return data;
}

describe('schedule account deletion (integration)', () => {
  beforeAll(async () => {
    adminClient = createAdminClient();
    ownerEmail = `deletion-owner-${crypto.randomUUID()}@integration.test`;
    const otherOwnerEmail = `deletion-other-${crypto.randomUUID()}@integration.test`;
    const owner = await createTestUser(adminClient, ownerEmail, password);
    const otherOwner = await createTestUser(adminClient, otherOwnerEmail, password);
    ownerUserId = owner.id;
    otherOwnerUserId = otherOwner.id;

    const ownerRecord = await adminClient.auth.admin.getUserById(ownerUserId);
    if (ownerRecord.error) {
      throw ownerRecord.error;
    }
    ownerUser = ownerRecord.data.user;

    const supabaseUrl = requireEnv('SUPABASE_URL');
    const anonymousKey = requireEnv('SUPABASE_ANON_KEY');
    anonymousClient = createClient(supabaseUrl, anonymousKey);
    ownerAuthenticatedClient = await signInAsUser(ownerEmail, password);
  });

  beforeEach(async () => {
    await deleteHandoutsForUsers([ownerUserId, otherOwnerUserId]);
    await deleteAccountDeletionsForUsers([ownerUserId, otherOwnerUserId]);
    await unbanOwner();
    await signOutAnonymousClient();
  });

  afterAll(async () => {
    await deleteHandoutsForUsers([ownerUserId, otherOwnerUserId]);
    await deleteAccountDeletionsForUsers([ownerUserId, otherOwnerUserId]);
    await deleteTestUser(adminClient, ownerUserId);
    await deleteTestUser(adminClient, otherOwnerUserId);
  });

  it('creates account_deletions with deny policies and a nullable handout instant', async () => {
    const report = await readAccountDeletionSchema();

    expect(report.tableExists).toBe(true);
    expect(report.rowLevelSecurityEnabled).toBe(true);
    expect(report.scheduledDeletionAtNullable).toBe(true);
    expect(report.emailUnique).toBe(true);
    expect(report.policies).toEqual([
      {
        policyName: 'account_deletions_delete_deny',
        command: 'd',
        usingExpression: 'false',
        checkExpression: null,
        roles: ['anon', 'authenticated'],
      },
      {
        policyName: 'account_deletions_insert_deny',
        command: 'a',
        usingExpression: null,
        checkExpression: 'false',
        roles: ['anon', 'authenticated'],
      },
      {
        policyName: 'account_deletions_select_deny',
        command: 'r',
        usingExpression: 'false',
        checkExpression: null,
        roles: ['anon', 'authenticated'],
      },
      {
        policyName: 'account_deletions_update_deny',
        command: 'w',
        usingExpression: 'false',
        checkExpression: 'false',
        roles: ['anon', 'authenticated'],
      },
    ]);

    const scheduledAt = new Date().toISOString();
    const deniedInsert = {
      gm_id: ownerUserId,
      email: ownerEmail,
      scheduled_at: scheduledAt,
    };

    const anonymousInsert = await anonymousClient.from('account_deletions').insert(deniedInsert);
    expect(anonymousInsert.error).not.toBeNull();
    const authenticatedInsert = await ownerAuthenticatedClient.from('account_deletions').insert(deniedInsert);
    expect(authenticatedInsert.error).not.toBeNull();
    expect(await readDeletionRecord()).toBeNull();

    const { error: insertError } = await adminClient.from('account_deletions').insert(deniedInsert);
    expect(insertError).toBeNull();

    const anonymousRead = await anonymousClient.from('account_deletions').select('gm_id').eq('gm_id', ownerUserId);
    expect(anonymousRead.error).toBeNull();
    expect(anonymousRead.data).toEqual([]);

    const authenticatedRead = await ownerAuthenticatedClient
      .from('account_deletions')
      .select('gm_id')
      .eq('gm_id', ownerUserId);
    expect(authenticatedRead.error).toBeNull();
    expect(authenticatedRead.data).toEqual([]);

    const anonymousUpdate = await anonymousClient
      .from('account_deletions')
      .update({ email: `anon-${ownerEmail}` })
      .eq('gm_id', ownerUserId);
    expect(anonymousUpdate.error).toBeNull();
    const authenticatedUpdate = await ownerAuthenticatedClient
      .from('account_deletions')
      .update({ email: `changed-${ownerEmail}` })
      .eq('gm_id', ownerUserId);
    expect(authenticatedUpdate.error).toBeNull();

    const anonymousDelete = await anonymousClient.from('account_deletions').delete().eq('gm_id', ownerUserId);
    expect(anonymousDelete.error).toBeNull();
    const authenticatedDelete = await ownerAuthenticatedClient
      .from('account_deletions')
      .delete()
      .eq('gm_id', ownerUserId);
    expect(authenticatedDelete.error).toBeNull();

    const record = await readDeletionRecord();
    expect(record?.email).toBe(ownerEmail);
    expect(new Date(record?.scheduled_at ?? '').getTime()).toBe(new Date(scheduledAt).getTime());
  });

  it('returns 401 and inserts no account_deletions row when the password is wrong', async () => {
    const response = await postDeletion('wrong-password');

    expect(response.status).toBe(401);
    const body: unknown = await response.json();
    expect(body).toEqual({ error: 'Incorrect password' });
    assertNoSchemaLeakage(JSON.stringify(body));
    expect(JSON.stringify(body)).not.toContain('account_deletions');
    expect(await readDeletionRecord()).toBeNull();

    const { error } = await anonymousClient.auth.signInWithPassword({
      email: ownerEmail,
      password,
    });
    expect(error).toBeNull();
  });

  it('stores the GM email, stamps every owned handout, and leaves the auth user in place', async () => {
    const publishedShareToken = crypto.randomUUID();
    await insertHandout({ ownerId: ownerUserId, status: 'draft', shareToken: null });
    await insertHandout({ ownerId: ownerUserId, status: 'published', shareToken: publishedShareToken });
    await insertHandout({
      ownerId: ownerUserId,
      status: 'archived',
      shareToken: crypto.randomUUID(),
    });
    await insertHandout({ ownerId: otherOwnerUserId, status: 'draft', shareToken: null });

    const response = await postDeletion(password);

    expect(response.status).toBe(200);
    const scheduledAt = readScheduledAt(await response.json());
    const thirtyDaysInMilliseconds = 30 * 24 * 60 * 60 * 1000;
    const delta = new Date(scheduledAt).getTime() - Date.now();
    expect(delta).toBeGreaterThan(thirtyDaysInMilliseconds - 60_000);
    expect(delta).toBeLessThan(thirtyDaysInMilliseconds + 60_000);

    const record = await readDeletionRecord();
    expect(record?.email).toBe(ownerEmail);
    expect(record?.scheduled_at).toBeTruthy();
    expect(new Date(record?.scheduled_at ?? '').getTime()).toBe(new Date(scheduledAt).getTime());

    const { data: ownedHandouts, error: ownedHandoutsError } = (await adminClient
      .from('handouts')
      .select('status, scheduled_deletion_at')
      .eq('gm_id', ownerUserId)) as {
      data: HandoutDeletionRow[] | null;
      error: { message: string } | null;
    };
    expect(ownedHandoutsError).toBeNull();
    expect(ownedHandouts?.map((handout) => handout.status).sort()).toEqual(['archived', 'draft', 'published']);
    for (const handout of ownedHandouts ?? []) {
      expect(new Date(handout.scheduled_deletion_at ?? '').getTime()).toBe(new Date(scheduledAt).getTime());
    }

    const { data: otherHandout, error: otherHandoutError } = (await adminClient
      .from('handouts')
      .select('scheduled_deletion_at')
      .eq('gm_id', otherOwnerUserId)
      .single()) as {
      data: { scheduled_deletion_at: string | null } | null;
      error: { message: string } | null;
    };
    expect(otherHandoutError).toBeNull();
    expect(otherHandout?.scheduled_deletion_at).toBeNull();

    const ownerRecord = await adminClient.auth.admin.getUserById(ownerUserId);
    expect(ownerRecord.error).toBeNull();
    expect(ownerRecord.data.user?.id).toBe(ownerUserId);
    const deletionInstant = readAppMetadataInstant(ownerRecord.data.user?.app_metadata);
    expect(new Date(deletionInstant).getTime()).toBe(new Date(scheduledAt).getTime());
  });

  it('rejects sign-in and still returns the published handout with scheduled_deletion_at', async () => {
    const publishedShareToken = crypto.randomUUID();
    await insertHandout({ ownerId: ownerUserId, status: 'published', shareToken: publishedShareToken });

    const response = await postDeletion(password);
    expect(response.status).toBe(200);
    const scheduledAt = readScheduledAt(await response.json());

    const signInResult = await anonymousClient.auth.signInWithPassword({
      email: ownerEmail,
      password,
    });
    expect(signInResult.error).not.toBeNull();
    expect(signInResult.data.session).toBeNull();

    const sharedHandout = (await anonymousClient
      .from('handouts')
      .select('scheduled_deletion_at')
      .eq('share_token', publishedShareToken)
      .in('status', ['published', 'archived'])
      .single()) as {
      data: { scheduled_deletion_at: string | null } | null;
      error: { message: string } | null;
    };
    expect(sharedHandout.error).toBeNull();
    expect(sharedHandout.data).not.toBeNull();
    expect(new Date(sharedHandout.data?.scheduled_deletion_at ?? '').getTime()).toBe(new Date(scheduledAt).getTime());
  });

  it('keeps the original scheduled_at on a second successful request', async () => {
    const firstResponse = await postDeletion(password);
    expect(firstResponse.status).toBe(200);
    const firstScheduledAt = readScheduledAt(await firstResponse.json());
    const firstRecord = await readDeletionRecord();

    await unbanOwner();

    const secondResponse = await postDeletion(password);
    expect(secondResponse.status).toBe(200);
    const secondScheduledAt = readScheduledAt(await secondResponse.json());
    const secondRecord = await readDeletionRecord();

    expect(secondRecord?.scheduled_at).toBe(firstRecord?.scheduled_at);
    expect(secondRecord?.email).toBe(ownerEmail);
    expect(new Date(secondScheduledAt).getTime()).toBe(new Date(firstScheduledAt).getTime());
  });
});
