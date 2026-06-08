import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireEnv } from '@/integration/helpers/env';

export async function createTestUser(
  adminClient: SupabaseClient,
  email: string,
  password: string,
): Promise<{ id: string }> {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw error;
  }

  if (!data.user.id) {
    throw new Error('createUser succeeded but returned no user id');
  }

  return { id: data.user.id };
}

export async function deleteTestUser(adminClient: SupabaseClient, userId: string): Promise<void> {
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    throw error;
  }
}

export async function signInAsUser(email: string, password: string) {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');

  const anonClient = createClient(supabaseUrl, anonKey);
  const { data, error } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  const accessToken = data.session.access_token;
  if (!accessToken) {
    throw new Error('signInWithPassword succeeded but returned no access token');
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
