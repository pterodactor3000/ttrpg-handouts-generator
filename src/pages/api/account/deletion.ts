import type { APIRoute } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/cloudflare';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase';

const THIRTY_DAYS_IN_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;

// 100 years. A ban near 30 days would lapse if the daily cron is late,
// and the GM could sign in while handouts are still scheduled.
// deleteUser is what ends the ban.
const ACCOUNT_DELETION_BAN_DURATION = '876000h';

const INCORRECT_PASSWORD_MESSAGE = 'Incorrect password';
const SCHEDULE_DELETION_FAILED_MESSAGE = 'Failed to schedule account deletion';

const deletionRequestSchema = z.object({
  password: z.string().min(1),
});

interface AccountDeletionRow {
  scheduled_at: string;
  email: string;
}

interface AccountDeletionQueryResult {
  data: AccountDeletionRow | null;
  error: { message: string } | null;
}

interface MutationResult {
  error: { message: string } | null;
}

interface PersistDeletionSuccess {
  status: 'scheduled';
  scheduledAt: string;
}

interface PersistDeletionFailure {
  status: 'failed';
  error: unknown;
}

type PersistDeletionResult = PersistDeletionSuccess | PersistDeletionFailure;

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), { status });
}

function logDeletionFailure(error: unknown, userId: string): void {
  console.error(`Failed to schedule account deletion for user ${userId}:`, error);
  Sentry.captureException(error);
}

function isExpectedAuthFailure(error: { status?: number }): boolean {
  return error.status !== undefined && error.status < 500;
}

async function persistScheduledDeletion(
  adminClient: SupabaseClient,
  userId: string,
  email: string,
): Promise<PersistDeletionResult> {
  const existingResult = (await adminClient
    .from('account_deletions')
    .select('scheduled_at, email')
    .eq('gm_id', userId)
    .maybeSingle()) as AccountDeletionQueryResult;

  if (existingResult.error) {
    return { status: 'failed', error: existingResult.error };
  }

  const scheduledAt = existingResult.data
    ? existingResult.data.scheduled_at
    : new Date(Date.now() + THIRTY_DAYS_IN_MILLISECONDS).toISOString();

  if (!existingResult.data) {
    const insertResult = (await adminClient.from('account_deletions').insert({
      gm_id: userId,
      email,
      scheduled_at: scheduledAt,
    })) as MutationResult;

    if (insertResult.error) {
      return { status: 'failed', error: insertResult.error };
    }
  }

  const { error: metadataError } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: { deletion_scheduled_at: scheduledAt },
  });

  if (metadataError) {
    return { status: 'failed', error: metadataError };
  }

  const handoutResult = (await adminClient
    .from('handouts')
    .update({ scheduled_deletion_at: scheduledAt })
    .eq('gm_id', userId)) as MutationResult;

  if (handoutResult.error) {
    return { status: 'failed', error: handoutResult.error };
  }

  return { status: 'scheduled', scheduledAt };
}

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonError('Supabase is not configured', 500);
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return jsonError('Supabase is not configured', 500);
  }

  const user = context.locals.user;
  if (!user) {
    return jsonError('Unauthorized', 401);
  }

  const email = user.email;
  if (!email) {
    const missingEmailError = new Error(`Signed-in user ${user.id} has no email`);
    logDeletionFailure(missingEmailError, user.id);
    return jsonError(SCHEDULE_DELETION_FAILED_MESSAGE, 500);
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const parseResult = deletionRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: z.treeifyError(parseResult.error) }), { status: 400 });
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: parseResult.data.password,
  });

  if (signInError) {
    if (!isExpectedAuthFailure(signInError)) {
      logDeletionFailure(signInError, user.id);
    }
    return jsonError(INCORRECT_PASSWORD_MESSAGE, 401);
  }

  const persisted = await persistScheduledDeletion(adminClient, user.id, email);
  if (persisted.status === 'failed') {
    logDeletionFailure(persisted.error, user.id);
    return jsonError(SCHEDULE_DELETION_FAILED_MESSAGE, 500);
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
  if (signOutError) {
    logDeletionFailure(signOutError, user.id);
    return jsonError(SCHEDULE_DELETION_FAILED_MESSAGE, 500);
  }

  const { error: banError } = await adminClient.auth.admin.updateUserById(user.id, {
    ban_duration: ACCOUNT_DELETION_BAN_DURATION,
  });

  if (banError) {
    logDeletionFailure(banError, user.id);
    return jsonError(SCHEDULE_DELETION_FAILED_MESSAGE, 500);
  }

  return new Response(JSON.stringify({ scheduledAt: persisted.scheduledAt }), { status: 200 });
};
