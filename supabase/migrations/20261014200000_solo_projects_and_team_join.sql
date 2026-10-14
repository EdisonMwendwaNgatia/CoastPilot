-- Accepted innovators may start a project on their own, then invite accepted
-- applicants to join a team using a shareable, authorization-checked URL.
alter table public.projects alter column team_id drop not null;
alter table public.projects add column created_by uuid references public.profiles(id);
update public.projects p
set created_by = coalesce(t.created_by, (
  select tm.user_id from public.team_members tm
  where tm.team_id = p.team_id and tm.membership_status = 'active'
  order by tm.joined_at nulls last, tm.created_at
  limit 1
))
from public.teams t
where p.team_id = t.id and p.created_by is null;
alter table public.projects alter column created_by set not null;
create unique index projects_one_solo_per_owner_challenge on public.projects(created_by, challenge_id)
where team_id is null;

create or replace function private.is_team_member(target_project uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects p
    where p.id = target_project
      and (
        p.created_by = (select auth.uid())
        or exists (
          select 1 from public.team_members tm
          where tm.team_id = p.team_id
            and tm.user_id = (select auth.uid())
            and tm.membership_status = 'active'
        )
      )
  );
$$;
revoke all on function private.is_team_member(uuid) from public, anon;
grant execute on function private.is_team_member(uuid) to authenticated;

create or replace function private.has_active_team_for_challenge(target_challenge uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.user_id = (select auth.uid())
      and tm.membership_status = 'active'
      and t.challenge_id = target_challenge
  );
$$;
revoke all on function private.has_active_team_for_challenge(uuid) from public, anon;
grant execute on function private.has_active_team_for_challenge(uuid) to authenticated;

drop policy if exists "create team" on public.teams;
create policy "accepted applicant creates team" on public.teams for insert with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.challenge_applications a
    join public.challenges c on c.id = a.challenge_id
    where a.challenge_id = teams.challenge_id
      and a.applicant_id = (select auth.uid()) and a.status = 'accepted'
      and c.status in ('published', 'in_progress')
  )
  and not private.has_active_team_for_challenge(challenge_id)
  and not exists (
    select 1 from public.projects p
    where p.challenge_id = teams.challenge_id and p.created_by = (select auth.uid())
  )
);

create or replace function private.guard_one_project_path_per_challenge()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is distinct from (select auth.uid()) then
    raise exception 'project creator must be the signed-in user';
  end if;
  perform 1 from public.profiles where id = new.created_by for update;
  if new.team_id is null and exists (
    select 1 from public.team_members tm join public.teams t on t.id = tm.team_id
    where tm.user_id = new.created_by and tm.membership_status = 'active'
      and t.challenge_id = new.challenge_id
  ) then
    raise exception 'an active team member cannot start a separate solo project for this challenge';
  end if;
  if new.team_id is not null and not exists (
    select 1 from public.team_members tm join public.teams t on t.id = tm.team_id
    where tm.user_id = new.created_by and tm.team_id = new.team_id
      and tm.membership_status = 'active' and t.challenge_id = new.challenge_id
  ) then
    raise exception 'an active team membership is required for a team project';
  end if;
  if exists (
    select 1 from public.projects p
    where p.created_by = new.created_by and p.challenge_id = new.challenge_id
  ) then
    raise exception 'a project already exists for this member and challenge';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_one_project_path_per_challenge() from public, anon, authenticated;
create trigger project_path_guard before insert on public.projects
for each row execute function private.guard_one_project_path_per_challenge();

create or replace function private.guard_one_active_team_per_challenge()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_challenge uuid;
begin
  if new.membership_status <> 'active' then return new; end if;
  if new.user_id is distinct from (select auth.uid()) then
    raise exception 'team member must join as the signed-in user';
  end if;
  select challenge_id into target_challenge from public.teams where id = new.team_id;
  if target_challenge is null then raise exception 'team not found'; end if;
  perform 1 from public.profiles where id = new.user_id for update;
  if exists (
    select 1 from public.team_members tm join public.teams t on t.id = tm.team_id
    where tm.user_id = new.user_id and tm.membership_status = 'active'
      and t.challenge_id = target_challenge and tm.team_id <> new.team_id
  ) then
    raise exception 'a member can join only one team per challenge';
  end if;
  if exists (
    select 1 from public.projects p
    where p.created_by = new.user_id and p.challenge_id = target_challenge
      and p.team_id is null
  ) then
    raise exception 'a solo project already exists for this challenge';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_one_active_team_per_challenge() from public, anon, authenticated;
create trigger team_one_challenge_guard before insert on public.team_members
for each row execute function private.guard_one_active_team_per_challenge();

drop policy if exists "visible projects" on public.projects;
create policy "visible projects" on public.projects for select using (
  visibility = 'public'
  or private.is_team_member(id)
  or (visibility = 'organization' and exists (
    select 1 from public.challenges c
    where c.id = challenge_id and c.organization_id is not null
      and private.is_org_member(c.organization_id)
  ))
  or private.is_admin()
);

drop policy if exists "team creates project" on public.projects;
drop policy if exists "team manages project" on public.projects;
create policy "accepted innovator creates project" on public.projects for insert with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.challenge_applications a
    where a.challenge_id = projects.challenge_id
      and a.applicant_id = (select auth.uid()) and a.status = 'accepted'
  )
  and not exists (
    select 1 from public.projects existing
    where existing.created_by = (select auth.uid())
      and existing.challenge_id = projects.challenge_id
  )
  and (
    team_id is null
    or exists (
      select 1 from public.teams t
      join public.team_members tm on tm.team_id = t.id
      where t.id = projects.team_id and t.challenge_id = projects.challenge_id
        and t.created_by = (select auth.uid())
        and tm.user_id = (select auth.uid()) and tm.membership_status = 'active'
    )
  )
  and not exists (
    select 1 from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.user_id = (select auth.uid()) and tm.membership_status = 'active'
      and t.challenge_id = projects.challenge_id
      and (projects.team_id is null or tm.team_id <> projects.team_id)
  )
);
create policy "project team manages project" on public.projects for update
using (private.is_team_member(id) or private.is_admin())
with check (private.is_team_member(id) or private.is_admin());

-- Team leads can add themselves as the first member. An invite-link recipient
-- can join only if they were accepted for this same challenge.
drop policy if exists "team invite or apply" on public.team_members;
create policy "accepted applicants join team" on public.team_members for insert with check (
  user_id = (select auth.uid())
  and membership_status = 'active'
  and exists (
    select 1 from public.teams t
    join public.challenge_applications a on a.challenge_id = t.challenge_id
    join public.challenges c on c.id = t.challenge_id
    where t.id = team_id and a.applicant_id = (select auth.uid())
      and a.status = 'accepted'
      and c.status in ('published', 'in_progress')
      and not private.has_active_team_for_challenge(t.challenge_id)
  )
);

create or replace function private.guard_project_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.created_by is distinct from old.created_by
     or new.challenge_id is distinct from old.challenge_id
     or new.team_id is distinct from old.team_id then
    raise exception 'project owner and challenge cannot be changed';
  end if;
  return new;
end;
$$;
create trigger project_identity_guard before update on public.projects
for each row execute function private.guard_project_identity();

-- Keep membership records private to the member, their active teammates, and
-- administrators. Team summaries retain the existing public challenge policy.
drop policy if exists "team membership access" on public.team_members;
create policy "team membership access" on public.team_members for select using (
  user_id = (select auth.uid())
  or private.is_team_member_id(team_id)
  or private.is_admin()
);
