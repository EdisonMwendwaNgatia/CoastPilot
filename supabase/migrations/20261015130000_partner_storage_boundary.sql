-- Legacy team-folder policies checked membership directly and would otherwise
-- let a converted partner mutate private evidence in an old team workspace.
drop policy if exists "project team uploads evidence" on storage.objects;
create policy "project team uploads evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-evidence'
  and private.is_youth_innovator()
  and auth.uid() is not null
  and exists (
    select 1 from public.team_members tm
    where tm.user_id = auth.uid()
      and tm.membership_status = 'active'
      and (storage.foldername(name))[1] = tm.team_id::text
  )
);

drop policy if exists "project team deletes evidence" on storage.objects;
create policy "project team deletes evidence"
on storage.objects for delete to authenticated
using (
  bucket_id = 'project-evidence'
  and private.is_youth_innovator()
  and exists (
    select 1 from public.team_members tm
    where tm.user_id = auth.uid()
      and tm.membership_status = 'active'
      and (storage.foldername(name))[1] = tm.team_id::text
  )
);
