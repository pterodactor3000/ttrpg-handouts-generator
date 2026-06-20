import type { APIRoute } from 'astro';
import * as Sentry from '@sentry/cloudflare';
import { z } from 'zod';
import { createClient } from '@/lib/supabase';

export const prerender = false;

interface HandoutArchiveResult {
  data: { id: string } | null;
  error: { message: string; code?: string } | null;
}

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase is not configured' }), { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const handoutId = context.params.id;
  if (!handoutId) {
    return new Response(JSON.stringify({ error: 'Missing handout id' }), { status: 400 });
  }

  const uuidParseResult = z.uuid().safeParse(handoutId);
  if (!uuidParseResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid handout id' }), { status: 400 });
  }

  const { data, error } = (await supabase
    .from('handouts')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
    })
    .eq('id', handoutId)
    .eq('gm_id', user.id)
    .neq('status', 'archived')
    .select('id')
    .single()) as HandoutArchiveResult;

  if (error?.code === 'PGRST116' || !data) {
    return new Response(JSON.stringify({ error: 'Handout not found or already archived' }), {
      status: 404,
    });
  }

  if (error) {
    console.error('DB error archiving handout:', error);
    Sentry.captureException(error);
    return new Response(JSON.stringify({ error: 'Failed to archive handout' }), { status: 500 });
  }

  return new Response(JSON.stringify({ id: data.id }), { status: 200 });
};
