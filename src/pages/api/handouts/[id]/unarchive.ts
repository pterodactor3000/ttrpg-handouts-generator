import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/cloudflare';
import { z } from 'zod';
import { createClient } from '@/lib/supabase';

export const prerender = false;

const unarchiveRequestSchema = z.object({
  target: z.enum(['draft', 'published']),
});

const TITLE_REQUIRED_MESSAGE = 'Title is required before publishing.';
const CONTENT_REQUIRED_MESSAGE = 'Content is required before publishing.';
const BACKGROUND_REQUIRED_MESSAGE = 'Background category is required before publishing.';

interface ArchivedHandoutRow {
  title: string;
  markdown_content: string;
  background_category: string | null;
  share_token: string | null;
  published_at: string | null;
}

interface HandoutFetchResult {
  data: ArchivedHandoutRow | null;
  error: { message: string; code?: string } | null;
}

interface RestoredHandoutRow {
  id: string;
  status: 'draft' | 'published';
  share_token: string | null;
}

interface HandoutUpdateResult {
  data: RestoredHandoutRow | null;
  error: { message: string; code?: string } | null;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status });
}

function collectPublishValidationErrors(handout: ArchivedHandoutRow): string[] {
  const validationErrors: string[] = [];
  if (!handout.title || handout.title.trim() === '') {
    validationErrors.push(TITLE_REQUIRED_MESSAGE);
  }
  if (!handout.markdown_content || handout.markdown_content.trim() === '') {
    validationErrors.push(CONTENT_REQUIRED_MESSAGE);
  }
  if (!handout.background_category) {
    validationErrors.push(BACKGROUND_REQUIRED_MESSAGE);
  }
  return validationErrors;
}

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: 'Supabase is not configured' }, 500);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const handoutId = context.params.id;
  if (!handoutId) {
    return jsonResponse({ error: 'Missing handout id' }, 400);
  }

  const uuidParseResult = z.uuid().safeParse(handoutId);
  if (!uuidParseResult.success) {
    return jsonResponse({ error: 'Invalid handout id' }, 400);
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const parseResult = unarchiveRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonResponse({ error: 'Invalid restore target' }, 400);
  }

  const { target } = parseResult.data;

  const { data: existingHandout, error: fetchError } = (await supabase
    .from('handouts')
    .select('title, markdown_content, background_category, share_token, published_at')
    .eq('id', handoutId)
    .eq('gm_id', user.id)
    .eq('status', 'archived')
    .single()) as HandoutFetchResult;

  if (fetchError || !existingHandout) {
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('DB error fetching handout for restore:', fetchError);
      Sentry.captureException(fetchError);
      return jsonResponse({ error: 'Failed to restore handout' }, 500);
    }
    return jsonResponse({ error: 'Handout not found' }, 404);
  }

  if (target === 'published') {
    const validationErrors = collectPublishValidationErrors(existingHandout);
    if (validationErrors.length > 0) {
      return jsonResponse({ error: validationErrors.join(' ') }, 422);
    }
  }

  const restoredAt = new Date().toISOString();
  const updatePayload: {
    status: 'draft' | 'published';
    archived_at: null;
    share_token?: string;
    published_at?: string;
  } = {
    status: target,
    archived_at: null,
  };

  if (target === 'published' && existingHandout.share_token === null) {
    updatePayload.share_token = crypto.randomUUID();
    if (existingHandout.published_at === null) {
      updatePayload.published_at = restoredAt;
    }
  }

  const { data: restoredHandout, error: updateError } = (await supabase
    .from('handouts')
    .update(updatePayload)
    .eq('id', handoutId)
    .eq('gm_id', user.id)
    .eq('status', 'archived')
    .select('id, status, share_token')
    .single()) as HandoutUpdateResult;

  if (updateError || !restoredHandout) {
    if (updateError && updateError.code !== 'PGRST116') {
      console.error('DB error restoring handout:', updateError);
      Sentry.captureException(updateError);
      return jsonResponse({ error: 'Failed to restore handout' }, 500);
    }
    return jsonResponse({ error: 'Handout not found' }, 404);
  }

  return jsonResponse(
    {
      id: restoredHandout.id,
      status: restoredHandout.status,
      shareToken: restoredHandout.share_token,
    },
    200,
  );
};
