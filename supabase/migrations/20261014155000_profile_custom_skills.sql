alter table public.profiles
  add column custom_skills text[] not null default '{}',
  add constraint profiles_custom_skills_count check (cardinality(custom_skills) <= 20),
  add constraint profiles_custom_skills_no_nulls check (array_position(custom_skills, null) is null);

grant update (custom_skills) on public.profiles to authenticated;
