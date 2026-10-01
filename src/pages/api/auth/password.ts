import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/cloudflare';
import { z } from 'zod';
import { createClient } from '@/lib/supabase';

const INCORRECT_PASSWORD_MESSAGE = 'Incorrect password';
const PASSWORD_MISMATCH_MESSAGE = 'Passwords do not match';
const PASSWORD_FIELDS_MESSAGE = 'Enter the current password, a new password, and the confirmation.';
const UPDATE_PASSWORD_FAILED_MESSAGE = 'Failed to change password';

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(1),
    confirmPassword: z.string().min(1),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
  });

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), { status });
}

function logPasswordChangeFailure(error: unknown, userId: string): void {
  console.error(`Failed to change password for user ${userId}:`, error);
  Sentry.captureException(error);
}

function validationMessage(error: z.ZodError): string {
  const hasEmptyField = error.issues.some((issue) => issue.code === 'too_small');
  if (hasEmptyField) {
    return PASSWORD_FIELDS_MESSAGE;
  }

  return PASSWORD_MISMATCH_MESSAGE;
}

function isExpectedAuthFailure(error: { status?: number }): boolean {
  return error.status !== undefined && error.status < 500;
}

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonError('Supabase is not configured', 500);
  }

  const user = context.locals.user;
  if (!user) {
    return jsonError('Unauthorized', 401);
  }

  const email = user.email;
  if (!email) {
    const missingEmailError = new Error(`Signed-in user ${user.id} has no email`);
    logPasswordChangeFailure(missingEmailError, user.id);
    return jsonError(UPDATE_PASSWORD_FAILED_MESSAGE, 500);
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const parseResult = passwordChangeSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(validationMessage(parseResult.error), 400);
  }

  const { currentPassword, newPassword } = parseResult.data;
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (signInError) {
    if (!isExpectedAuthFailure(signInError)) {
      logPasswordChangeFailure(signInError, user.id);
    }
    return jsonError(INCORRECT_PASSWORD_MESSAGE, 401);
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    logPasswordChangeFailure(updateError, user.id);
    return jsonError(UPDATE_PASSWORD_FAILED_MESSAGE, 500);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
