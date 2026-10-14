-- The partner workspace does not include innovator skill/profile editing.
create policy "youth and admins manage profile skill links"
on public.profile_skills as restrictive for all to authenticated
using (private.is_youth_innovator() or private.is_admin())
with check (private.is_youth_innovator() or private.is_admin());
