-- Let the owning GM update an archived handout only when the new status leaves archived.
-- gm_update_non_archived stays in place. Its WITH CHECK is only the owner id, and
-- permissive WITH CHECK expressions are combined with OR, so this policy cannot
-- veto a row that stays archived. The trigger does that.

create policy "gm_restore_archived"
  on handouts for update to authenticated
  using (gm_id = auth.uid() and status = 'archived')
  with check (gm_id = auth.uid() and status in ('draft', 'published'));

create function public.reject_handout_update_that_stays_archived()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.status = 'archived' and new.status not in ('draft', 'published') then
    raise exception 'archived handout can only move to draft or published';
  end if;

  return new;
end;
$$;

revoke all on function public.reject_handout_update_that_stays_archived() from public;
grant execute on function public.reject_handout_update_that_stays_archived() to authenticated, service_role;

create trigger handouts_reject_update_that_stays_archived
  before update on handouts
  for each row
  execute function public.reject_handout_update_that_stays_archived();
