import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/cloudflare';
import { createClient } from '@/lib/supabase';

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = form.get('email') as string;
  const password = form.get('password') as string;

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/auth/signup?error=${encodeURIComponent('Supabase is not configured')}`);
  }
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    Sentry.captureException(error);
    return context.redirect(`/auth/signup?error=${encodeURIComponent(error.message)}`);
  }

  return context.redirect('/auth/confirm-email');
};
