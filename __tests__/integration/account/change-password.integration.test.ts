import { createClient, type User } from '@supabase/supabase-js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertNoSchemaLeakage } from '@/integration/helpers/assert-no-schema-leakage';
import { createAdminClient } from '@/integration/helpers/admin-client';
import { makeContext } from '@/integration/helpers/context-stub';
import { requireEnv } from '@/integration/helpers/env';
import { createTestUser, deleteTestUser, signInWithPasswordAndGetCookieHeader } from '@/integration/helpers/test-users';
import { POST as changePassword } from '@/pages/api/auth/password';

const password = 'integration-test-password';
const replacementPassword = 'integration-test-password-new';

let adminClient: ReturnType<typeof createAdminClient>;
let anonymousClient: ReturnType<typeof createClient>;
let ownerUser: User | undefined;
let ownerUserId: string;
let ownerEmail: string;

function requireOwnerUser(): User {
  if (!ownerUser?.email) {
    throw new Error('Owner test user is missing an email');
  }

  return ownerUser;
}

async function postPasswordChange(input: { currentPassword: string; newPassword: string; confirmPassword: string }) {
  const cookieHeader = await signInWithPasswordAndGetCookieHeader(ownerEmail, password);
  return changePassword({
    ...makeContext({ body: input, cookieHeader }),
    locals: { user: requireOwnerUser() },
  });
}

async function canSignIn(attemptedPassword: string): Promise<boolean> {
  const { error } = await anonymousClient.auth.signInWithPassword({
    email: ownerEmail,
    password: attemptedPassword,
  });
  if (!error) {
    await anonymousClient.auth.signOut();
  }
  return error === null;
}

describe('change password (integration)', () => {
  beforeAll(async () => {
    adminClient = createAdminClient();
    ownerEmail = `password-owner-${crypto.randomUUID()}@integration.test`;
    const owner = await createTestUser(adminClient, ownerEmail, password);
    ownerUserId = owner.id;

    const ownerRecord = await adminClient.auth.admin.getUserById(ownerUserId);
    if (ownerRecord.error) {
      throw ownerRecord.error;
    }
    ownerUser = ownerRecord.data.user;

    anonymousClient = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'));
  });

  beforeEach(async () => {
    const { error } = await adminClient.auth.admin.updateUserById(ownerUserId, { password });
    if (error) {
      throw error;
    }
    await anonymousClient.auth.signOut();
  });

  afterAll(async () => {
    await deleteTestUser(adminClient, ownerUserId);
  });

  it('returns 401 when the current password is wrong and the old password still signs in', async () => {
    const response = await postPasswordChange({
      currentPassword: 'wrong-password',
      newPassword: replacementPassword,
      confirmPassword: replacementPassword,
    });

    expect(response.status).toBe(401);
    const body: unknown = await response.json();
    expect(body).toEqual({ error: 'Incorrect password' });
    assertNoSchemaLeakage(JSON.stringify(body));
    expect(await canSignIn(password)).toBe(true);
    expect(await canSignIn(replacementPassword)).toBe(false);
  });

  it('rejects a mismatched confirmation and does not change the password', async () => {
    const response = await postPasswordChange({
      currentPassword: password,
      newPassword: replacementPassword,
      confirmPassword: 'different-password',
    });

    expect(response.status).toBe(400);
    const body: unknown = await response.json();
    expect(body).toEqual({ error: 'Passwords do not match' });
    assertNoSchemaLeakage(JSON.stringify(body));
    expect(await canSignIn(password)).toBe(true);
    expect(await canSignIn(replacementPassword)).toBe(false);

    const { data, error } = await adminClient.from('account_deletions').select('gm_id').eq('gm_id', ownerUserId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('lets the new password sign in when the current password is right', async () => {
    const response = await postPasswordChange({
      currentPassword: password,
      newPassword: replacementPassword,
      confirmPassword: replacementPassword,
    });

    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toEqual({ ok: true });
    expect(await canSignIn(replacementPassword)).toBe(true);
    expect(await canSignIn(password)).toBe(false);
  });
});
