import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createClient } from '@/lib/supabase';

export const prerender = false;

const handoutInputSchema = z.object({
  title: z.string().max(300),
  markdownContent: z.string().max(50000),
  backgroundCategory: z.enum(['fantasy', 'horror', 'scifi']),
  tags: z.array(z.string()).max(20),
});

interface HandoutRow {
  id: string;
}
interface HandoutQueryResult {
  data: HandoutRow | null;
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

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const parseResult = handoutInputSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: z.treeifyError(parseResult.error) }), {
      status: 400,
    });
  }

  const { title, markdownContent, backgroundCategory, tags } = parseResult.data;

  const { data, error } = (await supabase
    .from('handouts')
    .insert({
      gm_id: user.id,
      title,
      markdown_content: markdownContent,
      background_category: backgroundCategory,
      tags,
    })
    .select('id')
    .single()) as HandoutQueryResult;

  if (error || !data) {
    return new Response(JSON.stringify({ error: error?.message ?? 'Insert failed' }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ id: data.id }), { status: 201 });
};
