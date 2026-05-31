import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createClient } from '@/lib/supabase';

export const prerender = false;

interface HandoutPublishRow {
  title: string;
  markdown_content: string;
  background_category: string | null;
}

interface HandoutFetchResult {
  data: HandoutPublishRow | null;
  error: { message: string } | null;
}

interface HandoutUpdateResult {
  data: { share_token: string } | null;
  error: { message: string } | null;
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

  const { data: existingHandout, error: fetchError } = (await supabase
    .from('handouts')
    .select('title, markdown_content, background_category')
    .eq('id', handoutId)
    .eq('gm_id', user.id)
    .eq('status', 'draft')
    .single()) as HandoutFetchResult;

  if (fetchError || !existingHandout) {
    if (fetchError) {
      console.error('DB error fetching handout for publish:', fetchError);
    }
    return new Response(JSON.stringify({ error: 'Handout not found or not in draft status' }), {
      status: 404,
    });
  }

  const validationErrors: string[] = [];
  if (!existingHandout.title || existingHandout.title.trim() === '') {
    validationErrors.push('Title is required before publishing.');
  }
  if (!existingHandout.markdown_content || existingHandout.markdown_content.trim() === '') {
    validationErrors.push('Content is required before publishing.');
  }
  if (!existingHandout.background_category) {
    validationErrors.push('Background category is required before publishing.');
  }
  if (validationErrors.length > 0) {
    return new Response(JSON.stringify({ error: validationErrors.join(' ') }), { status: 422 });
  }

  const shareToken = crypto.randomUUID();
  const publishedAt = new Date().toISOString();

  const { data: updatedHandout, error: updateError } = (await supabase
    .from('handouts')
    .update({
      status: 'published',
      share_token: shareToken,
      published_at: publishedAt,
    })
    .eq('id', handoutId)
    .eq('gm_id', user.id)
    .select('share_token')
    .single()) as HandoutUpdateResult;

  if (updateError || !updatedHandout) {
    console.error('DB error publishing handout:', updateError);
    return new Response(JSON.stringify({ error: 'Failed to publish handout' }), { status: 500 });
  }

  return new Response(JSON.stringify({ shareToken: updatedHandout.share_token }), { status: 200 });
};
