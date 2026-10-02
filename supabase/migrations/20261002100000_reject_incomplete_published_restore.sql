-- Authenticated restores to published must carry a share token and the same
-- required fields the restore route checks. Draft restores stay unrestricted.
-- Service role updates stay exempt so account deletion can stamp archived rows.

create or replace function public.reject_handout_update_that_stays_archived()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.status = 'archived' and auth.role() = 'authenticated' then
    if new.status not in ('draft', 'published') then
      raise exception 'archived handout can only move to draft or published';
    end if;

    if new.status = 'published'
       and (
         new.share_token is null
         or btrim(new.title) = ''
         or btrim(new.markdown_content) = ''
         or new.background_category is null
       ) then
      raise exception 'published restore requires a share token, title, content, and background category';
    end if;
  end if;

  return new;
end;
$$;
