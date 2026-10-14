-- Private project walkthroughs: keep the evidence bucket private and allow
-- common mobile recording formats up to 100 MiB.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-evidence', 'project-evidence', false, 104857600,
  array['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "project video evidence readable by members" on storage.objects;
create policy "project video evidence readable by members"
on storage.objects for select to authenticated
using (
  bucket_id = 'project-evidence'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and private.is_team_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "project members upload evidence" on storage.objects;
create policy "project members upload evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-evidence'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and private.is_team_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "project members delete evidence" on storage.objects;
create policy "project members delete evidence"
on storage.objects for delete to authenticated
using (
  bucket_id = 'project-evidence'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and private.is_team_member(((storage.foldername(name))[1])::uuid)
);

-- Video metadata follows the same private project access rules as other evidence.
drop policy if exists "project evidence metadata access" on public.project_evidence;
create policy "project evidence metadata access" on public.project_evidence
for select to authenticated
using (private.is_team_member(project_id) or private.is_admin());

drop policy if exists "project team uploads evidence" on public.project_evidence;
drop policy if exists "team uploads evidence" on public.project_evidence;
create policy "project team uploads evidence" on public.project_evidence
for insert to authenticated
with check (uploaded_by = (select auth.uid()) and private.is_team_member(project_id));
