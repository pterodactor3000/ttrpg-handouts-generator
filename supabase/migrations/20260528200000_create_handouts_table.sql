-- Handouts feature: state-machine schema and RLS policies.
-- Postgres 17: gen_random_uuid() is built-in, no pgcrypto extension required.

-- 1. ENUM types
create type handout_status as enum ('draft', 'published', 'archived');
create type background_category as enum ('fantasy', 'horror', 'scifi');

-- 2. Table (11 columns)
create table handouts (
  id                  uuid                primary key default gen_random_uuid(),
  gm_id               uuid                not null references auth.users (id) on delete cascade,
  title               text                not null default '',
  markdown_content    text                not null default '',
  background_category background_category not null,
  tags                text[]              not null default '{}',
  status              handout_status      not null default 'draft',
  share_token         uuid                unique,
  created_at          timestamptz         not null default now(),
  published_at        timestamptz,
  archived_at         timestamptz
);

-- 3. Indexes
create index handouts_gm_id_idx       on handouts (gm_id);
create index handouts_share_token_idx on handouts (share_token);

-- 4. Enable RLS
alter table handouts enable row level security;

-- 5. GM: read all own handouts (all statuses)
create policy "gm_select_own"
  on handouts for select to authenticated
  using (gm_id = auth.uid());

-- 6. GM: create handouts
create policy "gm_insert_own"
  on handouts for insert to authenticated
  with check (gm_id = auth.uid());

-- 7. GM: update only non-archived handouts.
--    USING restricts which rows can be targeted; WITH CHECK restricts new values
--    (prevents reassigning gm_id to another user).
create policy "gm_update_non_archived"
  on handouts for update to authenticated
  using  (gm_id = auth.uid() and status <> 'archived')
  with check (gm_id = auth.uid());

-- 8. Anonymous: read published/archived rows (players via share link).
--    The application always filters by share_token = $1; the unguessable UUID is the
--    effective access-control mechanism. Archived rows stay readable to preserve
--    link permanence (player links must survive archive).
create policy "anon_select_shared"
  on handouts for select to anon
  using (status in ('published', 'archived') and share_token is not null);
