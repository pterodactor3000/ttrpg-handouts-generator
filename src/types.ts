type HandoutStatus = 'draft' | 'published' | 'archived';

type BackgroundCategory = 'fantasy' | 'horror' | 'scifi';

interface Handout {
  id: string;
  gm_id: string;
  title: string;
  markdown_content: string;
  background_category: BackgroundCategory;
  tags: string[];
  status: HandoutStatus;
  share_token: string | null; // null until published
  created_at: string; // ISO 8601 timestamp from Supabase
  published_at: string | null; // null while draft
  archived_at: string | null; // null until archived
}

export type { HandoutStatus, BackgroundCategory, Handout };
