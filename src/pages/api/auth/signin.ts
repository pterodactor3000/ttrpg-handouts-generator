import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/cloudflare';
import { createAdminClient } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase';

interface AccountDeletionLookup {
  data: { scheduled_at: string } | null;
  error: { message: string } | null;
}

async function readScheduledDeletion(email: string): Promise<string | null> {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return null;
  }

  const result = (await adminClient
    .from('account_deletions')
    .select('scheduled_at')
    .eq('email', email.toLowerCase())
    .maybeSingle()) as AccountDeletionLookup;

  if (result.error) {
    console.error('Failed to read account deletion during sign-in:', result.error);
    Sentry.captureException(result.error);
    return null;
  }

  return result.data?.scheduled_at ?? null;
}

const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const emailValue = form.get('email');
  const passwordValue = form.get('password');
  const email = typeof emailValue === 'string' ? emailValue : '';
  const password = typeof passwordValue === 'string' ? passwordValue : '';

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/auth/signin?error=${encodeURIComponent('Supabase is not configured')}`);
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const isExpectedAuthFailure = error.status !== undefined && error.status < 500;
    if (!isExpectedAuthFailure) {
      console.error('Auth sign-in error:', error);
      Sentry.captureException(error);
    }

    if (email.length > 0) {
      const scheduledAt = await readScheduledDeletion(email);
      if (scheduledAt) {
        return context.redirect(`/auth/signin?deletionAt=${encodeURIComponent(scheduledAt)}`);
      }
    }

    return context.redirect(`/auth/signin?error=${encodeURIComponent(error.message)}`);
  }

  return context.redirect('/');
};

export { POST };
