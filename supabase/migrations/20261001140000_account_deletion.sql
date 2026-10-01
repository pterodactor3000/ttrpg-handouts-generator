-- Purge instant for a closed account. Day 0 does not delete the auth user.
-- handouts.gm_id still cascades when that user is deleted later.

create table account_deletions (
  gm_id        uuid        primary key references auth.users (id) on delete cascade,
  email        text        not null,
  scheduled_at timestamptz not null
);

create unique index account_deletions_email_idx on account_deletions (email);

alter table account_deletions enable row level security;

grant select, insert, update, delete on table account_deletions to anon, authenticated, service_role;

create policy "account_deletions_select_deny"
  on account_deletions for select
  to anon, authenticated
  using (false);

create policy "account_deletions_insert_deny"
  on account_deletions for insert
  to anon, authenticated
  with check (false);

create policy "account_deletions_update_deny"
  on account_deletions for update
  to anon, authenticated
  using (false)
  with check (false);

create policy "account_deletions_delete_deny"
  on account_deletions for delete
  to anon, authenticated
  using (false);

alter table handouts add column scheduled_deletion_at timestamptz;
