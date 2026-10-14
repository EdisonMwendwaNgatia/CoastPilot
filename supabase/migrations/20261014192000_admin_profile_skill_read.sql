create policy "admins can read profile skill links"
  on public.profile_skills for select
  using (private.is_admin());
