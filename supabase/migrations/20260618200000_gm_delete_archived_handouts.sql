-- GM: permanently delete only archived handouts they own.
create policy "gm_delete_archived"
  on handouts for delete to authenticated
  using (gm_id = auth.uid() and status = 'archived');
