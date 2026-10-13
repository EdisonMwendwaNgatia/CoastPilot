-- Tighten authorization boundaries for the initial CoastPilot pilot.
-- Column privileges keep self-service profile edits away from role/onboarding flags.
revoke update on public.profiles from authenticated;
grant update (full_name, username, avatar_url, headline, bio, county, town, interests, portfolio_url, profile_visibility) on public.profiles to authenticated;

-- Membership rows can only be provisioned by trusted admin operations. Registration
-- creates an organization, but does not silently grant the registrant privileges.
drop policy if exists "org registration" on public.organizations;
create policy "org registration" on public.organizations for insert with check (auth.uid() is not null and verification_status='pending');
drop policy if exists "application reviewer update" on public.challenge_applications;
create policy "application reviewer update" on public.challenge_applications for update
 using (exists(select 1 from public.challenges c where c.id=challenge_id and (c.created_by=auth.uid() or private.is_admin() or (c.organization_id is not null and private.is_org_member(c.organization_id,array['owner','manager','reviewer']::public.member_role[])))))
 with check (exists(select 1 from public.challenges c where c.id=challenge_id and (c.created_by=auth.uid() or private.is_admin() or (c.organization_id is not null and private.is_org_member(c.organization_id,array['owner','manager','reviewer']::public.member_role[])))));

-- Application reviewers may only change the decision fields. Applicants may only withdraw.
revoke update on public.challenge_applications from authenticated;
grant update (status, reviewed_by, reviewed_at) on public.challenge_applications to authenticated;

-- Prevent policy name collisions in later fresh installs and tighten the project creator check.
drop policy if exists "team creates project" on public.projects;
create policy "team creates project" on public.projects for insert with check (
 exists(select 1 from public.team_members tm where tm.team_id=projects.team_id and tm.user_id=auth.uid() and tm.membership_status='active')
 and exists(select 1 from public.teams t where t.id=projects.team_id and t.challenge_id=projects.challenge_id and t.created_by=auth.uid())
);

-- Public visibility is opt-in; organizations may see projects only when the project
-- was explicitly set to organization visibility and the user belongs to its sponsor.
drop policy if exists "visible projects" on public.projects;
create policy "visible projects" on public.projects for select using(
 visibility='public' or private.is_team_member(id) or
 (visibility='organization' and exists(select 1 from public.challenges c where c.id=challenge_id and c.organization_id is not null and private.is_org_member(c.organization_id))) or private.is_admin()
);
drop policy if exists "project workspace rows" on public.project_milestones;
create policy "project workspace rows" on public.project_milestones for all
 using(private.is_team_member(project_id) or private.is_admin())
 with check(private.is_team_member(project_id) or private.is_admin());

-- Unverified feedback and evidence are private by default, including for sponsors.
drop policy if exists "feedback authorized" on public.project_feedback;
create policy "feedback authorized" on public.project_feedback for select using(private.is_team_member(project_id) or reviewer_id=auth.uid() or private.is_admin());
drop policy if exists "org reviewer feedback" on public.project_feedback;
create policy "org reviewer feedback" on public.project_feedback for insert with check(
 reviewer_id=auth.uid() and (private.is_team_member(project_id) or private.is_admin() or exists(
  select 1 from public.projects p join public.challenges c on c.id=p.challenge_id
  where p.id=project_id and p.visibility='organization' and c.organization_id is not null and private.is_org_member(c.organization_id,array['owner','manager','reviewer']::public.member_role[])
 ))
);
drop policy if exists "evidence objects readable by project team" on storage.objects;
create policy "evidence objects readable by project team" on storage.objects for select using(bucket_id='project-evidence' and exists(
 select 1 from public.project_evidence e where e.file_path=name and (private.is_team_member(e.project_id) or private.is_admin() or (e.visibility='public' and exists(select 1 from public.projects p where p.id=e.project_id and p.visibility='public')))
));

-- The authenticated reporting account may not verify its own metrics.
drop policy if exists "verified metrics admin" on public.impact_metrics;
create policy "verified metrics admin" on public.impact_metrics for update using(private.is_admin()) with check(private.is_admin());
create or replace function private.guard_impact_verification() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.verification_status is distinct from old.verification_status and not private.is_admin() then raise exception 'only an administrator may change verification status'; end if;
 if new.project_id is distinct from old.project_id or new.created_by is distinct from old.created_by then raise exception 'metric identity is immutable'; end if;
 return new;
end; $$;
create trigger impact_verification_guard before update on public.impact_metrics for each row execute function private.guard_impact_verification();

-- A team cannot accept unapproved applicants or change member identity/role.
drop policy if exists "team invite or apply" on public.team_members;
create policy "team invite or apply" on public.team_members for insert with check (
 (user_id=(select auth.uid()) and membership_status='pending' and exists(select 1 from public.teams t join public.challenge_applications a on a.challenge_id=t.challenge_id where t.id=team_id and a.applicant_id=(select auth.uid()) and a.status='accepted'))
 or (private.is_team_member_id(team_id) and membership_status='invited' and exists(select 1 from public.teams t join public.challenge_applications a on a.challenge_id=t.challenge_id where t.id=team_id and a.applicant_id=user_id and a.status='accepted'))
);
drop policy if exists "accept invite or leave" on public.team_members;
create policy "accept invite or leave" on public.team_members for update using(user_id=(select auth.uid()) or private.is_team_member_id(team_id))
 with check ((user_id=(select auth.uid()) and membership_status in ('active','declined','left')) or private.is_team_member_id(team_id));

-- Challenge publisher cannot use a challenge row to bypass source-problem moderation.
create or replace function private.guard_challenge_status() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.status is distinct from old.status and not private.is_admin() then
   if new.status not in ('draft','published') or (new.status='published' and old.status<>'draft') then raise exception 'invalid challenge transition'; end if;
   if new.status='published' and new.problem_id is not null and not exists(select 1 from public.problems p where p.id=new.problem_id and p.status in ('approved','converted_to_challenge')) then raise exception 'source problem is not approved'; end if;
 end if;
 if new.published_at is distinct from old.published_at and new.status<>'published' then raise exception 'published_at requires published status'; end if;
 return new;
end; $$;

-- RLS negative cases can run against the public schema without recursively querying
-- team_members under its own policies; privileged rows are still immutable to users.
create or replace function private.guard_team_membership() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.team_id is distinct from old.team_id or new.user_id is distinct from old.user_id or new.team_role is distinct from old.team_role then raise exception 'membership identity and role are immutable'; end if;
 if old.membership_status='invited' and new.membership_status not in ('active','declined') then raise exception 'invalid invitation transition'; end if;
 if old.membership_status='pending' and new.membership_status not in ('active','declined','left') then raise exception 'invalid membership transition'; end if;
 if old.membership_status in ('active','declined','left') and new.membership_status is distinct from old.membership_status then raise exception 'invalid membership transition'; end if;
 return new;
end; $$;

-- Prevent clients from changing reviewer identity or verification status on impact rows.
revoke update on public.impact_metrics from authenticated;
grant update (metric_name, description, baseline_value, measured_value, unit, evidence_url, measured_at) on public.impact_metrics to authenticated;

-- Organization members are added only by the Supabase dashboard/service-side trusted
-- operation (there is intentionally no client insert policy on organization_members).
drop policy if exists "org members update org" on public.organizations;
create policy "org members update org" on public.organizations for update using(private.is_org_member(id,array['owner','manager']::public.member_role[])) with check(private.is_org_member(id,array['owner','manager']::public.member_role[]));
