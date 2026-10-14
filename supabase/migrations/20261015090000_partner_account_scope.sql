-- Partner intent is an account classification, not an authorization role.
-- Privileged access continues to come from platform_role and verified org membership.
alter table public.profiles
  add column if not exists account_type text not null default 'youth'
  check (account_type in ('youth', 'potential_partner', 'partner'));

create or replace function private.protect_profile_privileges()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'profile identity cannot be changed';
  end if;

  if new.platform_role is distinct from old.platform_role
     and current_user not in ('postgres', 'service_role') then
    raise exception 'only a trusted server operator can change platform roles';
  end if;

  if new.account_type is distinct from old.account_type
     and current_user not in ('postgres', 'service_role')
     and not (old.account_type = 'youth' and new.account_type = 'potential_partner') then
    raise exception 'only a trusted server operator can approve partner access';
  end if;

  return new;
end;
$$;

create or replace function private.is_youth_innovator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.platform_role = 'youth'
      and p.account_type = 'youth'
  );
$$;
revoke all on function private.is_youth_innovator() from public, anon;
grant execute on function private.is_youth_innovator() to authenticated;

-- Stop accounts approved as partners from reusing old youth team memberships
-- to access private workspaces or perform project actions.
create or replace function private.is_team_member(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_youth_innovator() and exists (
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
create or replace function private.is_team_member_id(target_team uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_youth_innovator() and exists (
    select 1 from public.team_members tm
    where tm.team_id = target_team
      and tm.user_id = (select auth.uid())
      and tm.membership_status = 'active'
  );
$$;

-- Partnership applications are account-bound and must use the authenticated
-- user's verified email. Anonymous proposals are no longer accepted.
drop policy if exists "submit partnership proposal" on public.partnership_proposals;
create policy "authenticated users submit own partnership proposal"
on public.partnership_proposals for insert to authenticated
with check (
  status = 'submitted'
  and submitted_by = (select auth.uid())
  and contact_email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);
revoke insert on public.partnership_proposals from anon;
revoke insert (contact_name, contact_email, organization_name, organization_type, website, county, interests, challenge_idea, proposed_support, details)
  on public.partnership_proposals from authenticated;
grant insert (submitted_by, contact_name, contact_email, organization_name, organization_type, website, county, interests, challenge_idea, proposed_support, details)
  on public.partnership_proposals to authenticated;

-- Only approved partner accounts with an authorized organization role can
-- submit sponsorship proposals. Organization membership alone is not enough.
drop policy if exists "verified organization managers request sponsorship" on public.challenge_sponsorship_requests;
create policy "verified partners request challenge sponsorship"
on public.challenge_sponsorship_requests for insert to authenticated
with check (
  submitted_by = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.account_type = 'partner'
  )
  and exists (
    select 1 from public.organizations o
    where o.id = organization_id and o.verification_status = 'verified'
  )
  and private.is_org_member(organization_id, array['owner','manager']::public.member_role[])
  and exists (
    select 1 from public.challenges c
    where c.id = challenge_id and c.status in ('published','in_progress')
  )
);

-- Partner accounts can discover current challenges but cannot manage challenge
-- drafts, even if an older organization membership or draft exists.
drop policy if exists "authorized challenge create" on public.challenges;
create policy "admins create challenge drafts"
on public.challenges for insert to authenticated
with check (private.is_admin() and status = 'draft');
drop policy if exists "challenge owner manage" on public.challenges;
create policy "admins and youth creators manage challenges"
on public.challenges for update to authenticated
using (private.is_admin() or (created_by = (select auth.uid()) and private.is_youth_innovator()))
with check (private.is_admin() or (created_by = (select auth.uid()) and private.is_youth_innovator()));
drop policy if exists "published challenge readable" on public.challenges;
create policy "published challenge readable"
on public.challenges for select
using (
  status <> 'draft'
  or created_by = (select auth.uid())
  or private.is_admin()
);

-- Team applications and formation are youth-only. Organization members no
-- longer receive private application or project review access by default.
drop policy if exists "application parties read" on public.challenge_applications;
create policy "applicants and admins read applications"
on public.challenge_applications for select to authenticated
using (
  (applicant_id = (select auth.uid()) and private.is_youth_innovator())
  or private.is_admin()
  or exists (
    select 1 from public.challenges c
    where c.id = challenge_id and c.created_by = (select auth.uid())
      and private.is_youth_innovator()
  )
);
drop policy if exists "application reviewer update" on public.challenge_applications;
create policy "admins and challenge creators review applications"
on public.challenge_applications for update to authenticated
using (
  private.is_admin()
  or exists (
    select 1 from public.challenges c
    where c.id = challenge_id and c.created_by = (select auth.uid())
      and private.is_youth_innovator()
  )
)
with check (
  private.is_admin()
  or exists (
    select 1 from public.challenges c
    where c.id = challenge_id and c.created_by = (select auth.uid())
      and private.is_youth_innovator()
  )
);
drop policy if exists "apply to published challenge" on public.challenge_applications;
create policy "youth apply to published challenge"
on public.challenge_applications for insert to authenticated
with check (
  applicant_id = (select auth.uid())
  and private.is_youth_innovator()
  and exists (
    select 1 from public.challenges c
    where c.id = challenge_id and c.status = 'published'
      and (c.application_deadline is null or c.application_deadline >= current_date)
  )
);
drop policy if exists "withdraw own application" on public.challenge_applications;
create policy "youth withdraw own application"
on public.challenge_applications for update to authenticated
using (applicant_id = (select auth.uid()) and private.is_youth_innovator() and status = 'pending')
with check (applicant_id = (select auth.uid()) and private.is_youth_innovator() and status = 'withdrawn');

drop policy if exists "accepted applicant creates team" on public.teams;
create policy "accepted youth applicants create teams"
on public.teams for insert to authenticated
with check (
  created_by = (select auth.uid())
  and private.is_youth_innovator()
  and exists (
    select 1 from public.challenge_applications a
    join public.challenges c on c.id = a.challenge_id
    where a.challenge_id = teams.challenge_id
      and a.applicant_id = (select auth.uid())
      and a.status = 'accepted'
      and c.status in ('published','in_progress')
  )
  and not private.has_active_team_for_challenge(challenge_id)
  and not exists (
    select 1 from public.projects p
    where p.challenge_id = teams.challenge_id and p.created_by = (select auth.uid())
  )
);
drop policy if exists "teams readable" on public.teams;
create policy "youth and admins read teams"
on public.teams for select to authenticated
using (private.is_youth_innovator() or private.is_admin());
drop policy if exists "team creator manage" on public.teams;
create policy "youth team creator manage"
on public.teams for update to authenticated
using ((created_by = (select auth.uid()) and private.is_youth_innovator()) or private.is_admin())
with check ((created_by = (select auth.uid()) and private.is_youth_innovator()) or private.is_admin());

drop policy if exists "team membership access" on public.team_members;
create policy "youth and admins read team memberships"
on public.team_members for select to authenticated
using (private.is_youth_innovator() and (user_id = (select auth.uid()) or private.is_team_member_id(team_id)) or private.is_admin());
drop policy if exists "accepted applicants join team" on public.team_members;
create policy "accepted youth applicants join teams"
on public.team_members for insert to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_youth_innovator()
  and membership_status = 'active'
  and exists (
    select 1 from public.teams t
    join public.challenge_applications a on a.challenge_id = t.challenge_id
    join public.challenges c on c.id = t.challenge_id
    where t.id = team_members.team_id
      and a.applicant_id = (select auth.uid()) and a.status = 'accepted'
      and c.status in ('published','in_progress')
      and not private.has_active_team_for_challenge(t.challenge_id)
  )
);
drop policy if exists "accept invite or leave" on public.team_members;
create policy "youth accept invitations or leave teams"
on public.team_members for update to authenticated
using (private.is_youth_innovator() and (user_id = (select auth.uid()) or private.is_team_member_id(team_id)))
with check (private.is_youth_innovator() and ((user_id = (select auth.uid()) and membership_status in ('active','declined','left')) or private.is_team_member_id(team_id)));

-- Partners should not get project reports, proposal, or feedback capabilities
-- through organization membership. Public artefacts remain public by intent.
drop policy if exists "visible projects" on public.projects;
create policy "visible projects"
on public.projects for select
using (
  (visibility = 'public' and ((select auth.uid()) is null or private.is_youth_innovator() or private.is_admin()))
  or private.is_team_member(id)
  or private.is_admin()
);
drop policy if exists "project team manages project" on public.projects;
create policy "youth team manages project"
on public.projects for update to authenticated
using (private.is_team_member(id) or private.is_admin())
with check (private.is_team_member(id) or private.is_admin());
drop policy if exists "org reviewer feedback" on public.project_feedback;
drop policy if exists "org manage proposals" on public.pilot_proposals;
drop policy if exists "pilot proposal authorized" on public.pilot_proposals;
create policy "team and admins read pilot proposals"
on public.pilot_proposals for select to authenticated
using (private.is_team_member(project_id) or private.is_admin());

-- Restrictive guard policies compose with any existing permissive policies,
-- keeping direct PostgREST calls from restoring youth-only workspace access.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'challenge_applications', 'teams', 'team_members', 'projects',
    'project_milestones', 'project_updates', 'project_evidence',
    'project_feedback', 'impact_metrics', 'pilot_proposals'
  ] loop
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using (private.is_youth_innovator() or private.is_admin()) with check (private.is_youth_innovator() or private.is_admin())',
      'youth and admin workspace boundary', table_name
    );
  end loop;
end;
$$;
