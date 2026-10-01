import * as Sentry from '@sentry/cloudflare';
import { createAdminClient } from '@/lib/supabase-admin';

interface DueAccountDeletion {
  gm_id: string;
}

interface DueAccountDeletionQuery {
  data: DueAccountDeletion[] | null;
  error: { message: string } | null;
}

interface DeleteUserResult {
  error: { status?: number; message: string } | null;
}

function isMissingAuthUser(error: { status?: number; message: string }): boolean {
  return error.status === 404 || error.message === 'User not found';
}

function logPurgeFailure(error: unknown, gmId: string): void {
  console.error(`Failed to purge scheduled account ${gmId}:`, error);
  Sentry.captureException(error);
}

async function purgeScheduledAccounts(now: Date): Promise<string[]> {
  const adminClient = createAdminClient();
  if (!adminClient) {
    throw new Error('Failed to purge scheduled accounts: Supabase is not configured');
  }

  const dueAccounts = (await adminClient
    .from('account_deletions')
    .select('gm_id')
    .lte('scheduled_at', now.toISOString())) as DueAccountDeletionQuery;

  if (dueAccounts.error) {
    console.error('Failed to read due account deletions:', dueAccounts.error);
    Sentry.captureException(dueAccounts.error);
    throw new Error('Failed to read due account deletions');
  }

  const deletedIds: string[] = [];
  let unexpectedFailureCount = 0;

  for (const account of dueAccounts.data ?? []) {
    const deletion = (await adminClient.auth.admin.deleteUser(account.gm_id)) as DeleteUserResult;
    if (!deletion.error) {
      deletedIds.push(account.gm_id);
      continue;
    }

    if (isMissingAuthUser(deletion.error)) {
      continue;
    }

    logPurgeFailure(deletion.error, account.gm_id);
    unexpectedFailureCount += 1;
  }

  if (unexpectedFailureCount > 0) {
    throw new Error(`Failed to purge ${unexpectedFailureCount} scheduled accounts`);
  }

  return deletedIds;
}

export { purgeScheduledAccounts };
