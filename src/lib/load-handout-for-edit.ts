import type { AstroCookies } from 'astro';
import { createClient } from '@/lib/supabase';
import type { BackgroundCategory, HandoutStatus, InitialHandout } from '@/types';

interface HandoutEditRow {
  id: string;
  title: string;
  markdown_content: string;
  background_category: BackgroundCategory;
  tags: string[];
  status: HandoutStatus;
  share_token: string | null;
}

function mapHandoutEditRow(row: HandoutEditRow): InitialHandout {
  return {
    id: row.id,
    title: row.title,
    markdownContent: row.markdown_content,
    backgroundCategory: row.background_category,
    tags: row.tags,
    status: row.status,
    shareToken: row.share_token,
  };
}

export async function loadHandoutForEdit(
  handoutId: string,
  gmId: string,
  requestHeaders: Headers,
  cookies: AstroCookies,
): Promise<InitialHandout | null> {
  const supabase = createClient(requestHeaders, cookies);
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('handouts')
    .select('id, title, markdown_content, background_category, tags, status, share_token')
    .eq('id', handoutId)
    .eq('gm_id', gmId)
    .neq('status', 'archived')
    .maybeSingle();

  if (error) {
    console.error('DB error loading handout for edit:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return mapHandoutEditRow(data);
}
