-- Account deletion stamps scheduled_deletion_at on every owned handout, including
-- archived rows, through the service role. That update does not change status.
-- The stay-archived trigger must keep blocking the authenticated GM, and must
-- let the service role write those stamps.

create or replace function public.reject_handout_update_that_stays_archived()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.status = 'archived'
     and new.status not in ('draft', 'published')
     and auth.role() = 'authenticated' then
    raise exception 'archived handout can only move to draft or published';
  end if;

  return new;
end;
$$;
