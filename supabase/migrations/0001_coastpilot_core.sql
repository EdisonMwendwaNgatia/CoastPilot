-- CoastPilot core schema. Apply with `supabase db push` or the Supabase SQL migration runner.
create extension if not exists pgcrypto;
create schema if not exists private;

create type public.profile_visibility as enum ('public', 'members', 'private');
create type public.problem_status as enum ('draft','submitted','under_review','needs_changes','approved','rejected','converted_to_challenge');
create type public.challenge_status as enum ('draft','published','in_progress','completed','cancelled');
create type public.application_status as enum ('pending','accepted','rejected','withdrawn');
create type public.team_status as enum ('forming','active','completed','archived');
create type public.membership_status as enum ('invited','pending','active','declined','left');
create type public.project_status as enum ('planning','building','testing','pilot_ready','completed','paused');
create type public.content_visibility as enum ('team','organization','public');
create type public.milestone_status as enum ('not_started','in_progress','blocked','completed');
create type public.verification_status as enum ('planned','self_reported','evidence_submitted','verified');
create type public.report_status as enum ('open','reviewing','resolved','dismissed');
create type public.organization_verification as enum ('pending','verified','rejected');
create type public.member_role as enum ('owner','manager','reviewer');
create type public.platform_role as enum ('youth','admin');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '', username text unique,
 avatar_url text, headline text not null default '', bio text not null default '', county text, town text,
 interests text[] not null default '{}', portfolio_url text,
 profile_visibility public.profile_visibility not null default 'public',
 platform_role public.platform_role not null default 'youth', onboarding_completed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint username_format check (username is null or username ~ '^[a-zA-Z0-9_]{3,30}$')
);
create table public.skills (id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique, category text not null default 'general');
create table public.profile_skills (profile_id uuid not null references public.profiles(id) on delete cascade, skill_id uuid not null references public.skills(id) on delete cascade, proficiency_level smallint not null default 1 check(proficiency_level between 1 and 5), created_at timestamptz not null default now(), primary key(profile_id,skill_id));
create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
 description text not null default '', organization_type text not null default 'community', website text, contact_email text,
 logo_url text, verification_status public.organization_verification not null default 'pending', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organization_members (
 organization_id uuid not null references public.organizations(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
 membership_role public.member_role not null default 'reviewer', created_at timestamptz not null default now(), primary key(organization_id,user_id)
);
create table public.problems (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id), title text not null, slug text not null unique,
 description text not null, category text not null, county text, town text, location_description text,
 proposed_beneficiaries text, existing_attempts text, evidence_urls text[] not null default '{}', status public.problem_status not null default 'draft',
 moderation_notes text, reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.challenges (
 id uuid primary key default gen_random_uuid(), problem_id uuid references public.problems(id), organization_id uuid references public.organizations(id), created_by uuid not null references public.profiles(id),
 title text not null, slug text not null unique, summary text not null, description text not null, objectives text[] not null default '{}', eligibility text not null default 'Youth innovators in Kenya', required_skills text[] not null default '{}', deliverables text[] not null default '{}',
 start_date date, end_date date, application_deadline date, status public.challenge_status not null default 'draft', published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.challenge_applications (
 id uuid primary key default gen_random_uuid(), challenge_id uuid not null references public.challenges(id) on delete cascade, applicant_id uuid not null references public.profiles(id) on delete cascade,
 motivation text not null, relevant_skills text[] not null default '{}', status public.application_status not null default 'pending', reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now(), unique(challenge_id,applicant_id)
);
create table public.teams (
 id uuid primary key default gen_random_uuid(), challenge_id uuid not null references public.challenges(id) on delete cascade, name text not null, description text not null default '', created_by uuid not null references public.profiles(id), status public.team_status not null default 'forming', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.team_members (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
 team_role text not null default 'member', membership_status public.membership_status not null default 'pending', joined_at timestamptz,
 created_at timestamptz not null default now()
);
create unique index one_active_team_per_challenge_user on public.team_members(user_id,team_id) where membership_status in ('active','invited','pending');
create table public.projects (
 id uuid primary key default gen_random_uuid(), challenge_id uuid not null references public.challenges(id), team_id uuid not null unique references public.teams(id), title text not null, slug text not null unique,
 summary text not null default '', problem_statement text not null default '', proposed_solution text not null default '', target_users text not null default '', mvp_description text not null default '', repository_url text, prototype_url text,
 status public.project_status not null default 'planning', visibility public.content_visibility not null default 'team', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.project_milestones (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, title text not null, description text not null default '', due_date date, status public.milestone_status not null default 'not_started', sort_order int not null default 0, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.project_updates (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, author_id uuid not null references public.profiles(id), content text not null, visibility public.content_visibility not null default 'team', created_at timestamptz not null default now()
);
create table public.project_evidence (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, uploaded_by uuid not null references public.profiles(id), title text not null, description text not null default '', file_path text not null, evidence_type text not null default 'document', visibility public.content_visibility not null default 'team', created_at timestamptz not null default now()
);
create table public.project_feedback (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, reviewer_id uuid not null references public.profiles(id), feedback text not null, rating smallint check(rating between 1 and 5), visibility public.content_visibility not null default 'team', created_at timestamptz not null default now()
);
create table public.impact_metrics (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, metric_name text not null, description text not null default '', baseline_value numeric, measured_value numeric, unit text, evidence_url text,
 verification_status public.verification_status not null default 'self_reported', measured_at date, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.pilot_proposals (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, organization_id uuid not null references public.organizations(id), submitted_by uuid not null references public.profiles(id), scope text not null, deliverables text[] not null default '{}', proposed_budget numeric check(proposed_budget is null or proposed_budget >= 0), currency text not null default 'KES', timeline text not null default '', status text not null default 'proposal_requested' check(status in ('lead','discussion','proposal_requested','proposal_submitted','agreed','in_progress','completed','declined')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, notification_type text not null, title text not null, message text not null, link text, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id), target_type text not null, target_id uuid not null, reason text not null, details text not null default '', status public.report_status not null default 'open', reviewed_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create index problems_public_status on public.problems(status,category,county);
create index challenges_discovery on public.challenges(status,application_deadline);
create index applications_review on public.challenge_applications(challenge_id,status);
create index teams_by_challenge on public.teams(challenge_id,status);
create index projects_visibility on public.projects(visibility,status);
create index notifications_unread on public.notifications(user_id,read_at,created_at desc);

-- Authorization helpers are defined after the tables they query exist.
create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.platform_role = 'admin');
$$;
create function private.is_org_member(org_id uuid, allowed public.member_role[] default array['owner','manager','reviewer']::public.member_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.organization_members m where m.organization_id = org_id and m.user_id = (select auth.uid()) and m.membership_role = any(allowed));
$$;
create function private.is_team_member(target_project uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.projects p join public.team_members tm on tm.team_id=p.team_id where p.id=target_project and tm.user_id=(select auth.uid()) and tm.membership_status='active');
$$;

-- New account defaults are non-privileged. No metadata is consulted for roles.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id) values(new.id) on conflict do nothing; return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at=now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();
create trigger organizations_updated before update on public.organizations for each row execute function public.touch_updated_at();
create trigger problems_updated before update on public.problems for each row execute function public.touch_updated_at();
create trigger challenges_updated before update on public.challenges for each row execute function public.touch_updated_at();
create trigger teams_updated before update on public.teams for each row execute function public.touch_updated_at();
create trigger projects_updated before update on public.projects for each row execute function public.touch_updated_at();
create trigger pilot_proposals_updated before update on public.pilot_proposals for each row execute function public.touch_updated_at();
-- Block privileged/profile moderation-field mutation through normal profile updates.
create function private.protect_profile_privileges() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.platform_role is distinct from old.platform_role or new.id is distinct from old.id then raise exception 'privileged profile fields cannot be changed'; end if;
 return new;
end; $$;
create trigger profile_privileges_guard before update on public.profiles for each row execute function private.protect_profile_privileges();

-- RLS is enabled on every application table in public.
do $$ declare t text; begin
 foreach t in array array['profiles','skills','profile_skills','organizations','organization_members','problems','challenges','challenge_applications','teams','team_members','projects','project_milestones','project_updates','project_evidence','project_feedback','impact_metrics','pilot_proposals','notifications','reports'] loop
 execute format('alter table public.%I enable row level security',t);
 end loop;
end $$;
create policy "profiles visible by preference" on public.profiles for select using (id=auth.uid() or profile_visibility='public' or (profile_visibility='members' and auth.uid() is not null) or private.is_admin());
create policy "users edit own profile" on public.profiles for update using (id=auth.uid()) with check(id=auth.uid());
create policy "skills readable" on public.skills for select using(true);
create policy "own skill links" on public.profile_skills for all using(profile_id=auth.uid()) with check(profile_id=auth.uid());
create policy "public verified orgs readable" on public.organizations for select using(verification_status='verified' or private.is_org_member(id) or private.is_admin());
create policy "org members update org" on public.organizations for update using(private.is_org_member(id,array['owner','manager']::public.member_role[])) with check(private.is_org_member(id,array['owner','manager']::public.member_role[]));
create policy "org registration" on public.organizations for insert with check(auth.uid() is not null and verification_status='pending');
create policy "org membership readable by org" on public.organization_members for select using(user_id=auth.uid() or private.is_org_member(organization_id) or private.is_admin());
create policy "problems public approved" on public.problems for select using(status='approved' or reporter_id=auth.uid() or private.is_admin());
create policy "report own problem" on public.problems for insert with check(reporter_id=auth.uid() and status in ('draft','submitted'));
create policy "edit own unreviewed problem" on public.problems for update using(reporter_id=auth.uid() and status in ('draft','needs_changes')) with check(reporter_id=auth.uid() and status in ('draft','submitted'));
create policy "admin moderate problem" on public.problems for update using(private.is_admin()) with check(private.is_admin());
create policy "published challenge readable" on public.challenges for select using(status <> 'draft' or created_by=auth.uid() or private.is_admin() or (organization_id is not null and private.is_org_member(organization_id)));
create policy "authorized challenge create" on public.challenges for insert with check(created_by=auth.uid() and (organization_id is null or private.is_org_member(organization_id,array['owner','manager']::public.member_role[])) and status='draft');
create policy "challenge owner manage" on public.challenges for update using(created_by=auth.uid() or private.is_admin() or (organization_id is not null and private.is_org_member(organization_id,array['owner','manager']::public.member_role[]))) with check(created_by=auth.uid() or private.is_admin() or (organization_id is not null and private.is_org_member(organization_id,array['owner','manager']::public.member_role[])));
create policy "application parties read" on public.challenge_applications for select using(applicant_id=auth.uid() or exists(select 1 from public.challenges c where c.id=challenge_id and (c.created_by=auth.uid() or (c.organization_id is not null and private.is_org_member(c.organization_id)) or private.is_admin())));
create policy "apply to published challenge" on public.challenge_applications for insert with check(applicant_id=auth.uid() and exists(select 1 from public.challenges c where c.id=challenge_id and c.status='published' and (c.application_deadline is null or c.application_deadline>=current_date)));
create policy "withdraw own application" on public.challenge_applications for update using(applicant_id=auth.uid() and status='pending') with check(applicant_id=auth.uid() and status='withdrawn');
create policy "application reviewer update" on public.challenge_applications for update using(exists(select 1 from public.challenges c where c.id=challenge_id and (c.created_by=auth.uid() or (c.organization_id is not null and private.is_org_member(c.organization_id)) or private.is_admin()))) with check(true);
create policy "teams readable" on public.teams for select using(exists(select 1 from public.challenges c where c.id=challenge_id and c.status in ('published','in_progress','completed')) or exists(select 1 from public.team_members tm where tm.team_id=id and tm.user_id=auth.uid()) or private.is_admin());
create policy "create team" on public.teams for insert with check(created_by=auth.uid() and exists(select 1 from public.challenge_applications a where a.challenge_id=challenge_id and a.applicant_id=auth.uid() and a.status='accepted'));
create policy "team creator manage" on public.teams for update using(created_by=auth.uid() or private.is_admin()) with check(created_by=auth.uid() or private.is_admin());
create policy "team membership access" on public.team_members for select using(user_id=auth.uid() or exists(select 1 from public.team_members m where m.team_id=team_id and m.user_id=auth.uid() and m.membership_status='active') or private.is_admin());
create policy "team invite by member" on public.team_members for insert with check(exists(select 1 from public.team_members m where m.team_id=team_id and m.user_id=auth.uid() and m.membership_status='active') or (user_id=auth.uid() and membership_status='pending'));
create policy "accept invitation or leave" on public.team_members for update using(user_id=auth.uid() or exists(select 1 from public.team_members m where m.team_id=team_id and m.user_id=auth.uid() and m.membership_status='active')) with check(user_id=auth.uid() or exists(select 1 from public.team_members m where m.team_id=team_id and m.user_id=auth.uid() and m.membership_status='active'));
create policy "visible projects" on public.projects for select using(visibility='public' or private.is_team_member(id) or (visibility='organization' and exists(select 1 from public.challenges c where c.id=challenge_id and c.organization_id is not null and private.is_org_member(c.organization_id))) or private.is_admin());
create policy "team creates project" on public.projects for insert with check(private.is_team_member(id) or exists(select 1 from public.team_members tm where tm.team_id=team_id and tm.user_id=auth.uid() and tm.membership_status='active'));
create policy "team manages project" on public.projects for update using(private.is_team_member(id) or private.is_admin()) with check(private.is_team_member(id) or private.is_admin());
create policy "project workspace rows" on public.project_milestones for all using(private.is_team_member(project_id) or exists(select 1 from public.projects p join public.challenges c on c.id=p.challenge_id where p.id=project_id and p.visibility='public' and c.organization_id is not null and private.is_org_member(c.organization_id)) or private.is_admin()) with check(private.is_team_member(project_id) or private.is_admin());
create policy "project updates visibility" on public.project_updates for select using((visibility='public' and exists(select 1 from public.projects p where p.id=project_id and p.visibility='public')) or private.is_team_member(project_id) or private.is_admin());
create policy "team creates updates" on public.project_updates for insert with check(author_id=auth.uid() and private.is_team_member(project_id));
create policy "evidence private access" on public.project_evidence for select using(private.is_team_member(project_id) or (visibility='public' and exists(select 1 from public.projects p where p.id=project_id and p.visibility='public')) or private.is_admin());
create policy "team uploads evidence" on public.project_evidence for insert with check(uploaded_by=auth.uid() and private.is_team_member(project_id));
create policy "feedback authorized" on public.project_feedback for select using(private.is_team_member(project_id) or reviewer_id=auth.uid() or private.is_admin());
create policy "org reviewer feedback" on public.project_feedback for insert with check(reviewer_id=auth.uid() and (private.is_team_member(project_id) or exists(select 1 from public.projects p join public.challenges c on c.id=p.challenge_id where p.id=project_id and c.organization_id is not null and private.is_org_member(c.organization_id)) or private.is_admin()));
create policy "metrics visible with project" on public.impact_metrics for select using(private.is_team_member(project_id) or exists(select 1 from public.projects p where p.id=project_id and p.visibility='public') or private.is_admin());
create policy "team reports metrics" on public.impact_metrics for insert with check(created_by=auth.uid() and private.is_team_member(project_id) and verification_status in ('planned','self_reported','evidence_submitted'));
create policy "verified metrics admin" on public.impact_metrics for update using(private.is_admin()) with check(private.is_admin());
create policy "pilot proposal authorized" on public.pilot_proposals for select using(submitted_by=auth.uid() or private.is_admin() or private.is_org_member(organization_id,array['owner','manager']::public.member_role[]));
create policy "team requests pilot" on public.pilot_proposals for insert with check(submitted_by=auth.uid() and private.is_team_member(project_id) and status='proposal_requested');
create policy "org manage proposals" on public.pilot_proposals for update using(private.is_admin() or private.is_org_member(organization_id,array['owner','manager']::public.member_role[])) with check(private.is_admin() or private.is_org_member(organization_id,array['owner','manager']::public.member_role[]));
create policy "own notifications" on public.notifications for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "own reports insert" on public.reports for insert with check(reporter_id=auth.uid() and status='open');
create policy "own reports read" on public.reports for select using(reporter_id=auth.uid() or private.is_admin());
create policy "admin reports update" on public.reports for update using(private.is_admin()) with check(private.is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('project-evidence','project-evidence',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do nothing;
create policy "evidence objects readable by project team" on storage.objects for select using(bucket_id='project-evidence' and exists(select 1 from public.project_evidence e where e.file_path=name and (private.is_team_member(e.project_id) or private.is_admin())));
create policy "project team uploads evidence" on storage.objects for insert with check(bucket_id='project-evidence' and auth.uid() is not null and exists(select 1 from public.team_members tm where tm.user_id=auth.uid() and tm.membership_status='active' and (storage.foldername(name))[1]=tm.team_id::text));
create policy "project team deletes evidence" on storage.objects for delete using(bucket_id='project-evidence' and exists(select 1 from public.team_members tm where tm.user_id=auth.uid() and tm.membership_status='active' and (storage.foldername(name))[1]=tm.team_id::text));

-- Seed skill catalogue; never seeds people, projects, or fake activity.
insert into public.skills(name,slug,category) values
 ('Community research','community-research','research'),('Product design','product-design','design'),('Mobile technology','mobile-technology','technology'),('Climate resilience','climate-resilience','climate'),('Fisheries','fisheries','livelihoods'),('Food systems','food-systems','livelihoods'),('Mapping and GIS','mapping-gis','technology'),('Business development','business-development','business'),('Data analysis','data-analysis','research'),('Communication','communication','general') on conflict(slug) do nothing;

-- Authorization helper functions are kept outside exposed schemas. Restrict EXECUTE explicitly.
create function private.is_team_member_id(target_team uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.team_members tm where tm.team_id=target_team and tm.user_id=(select auth.uid()) and tm.membership_status='active');
$$;
revoke all on all functions in schema private from public, anon;
grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

-- Replace policies that would otherwise recursively query team_members under its own RLS.
drop policy if exists "team membership access" on public.team_members;
drop policy if exists "team invite by member" on public.team_members;
drop policy if exists "accept invitation or leave" on public.team_members;
create policy "team membership access" on public.team_members for select using(user_id=(select auth.uid()) or private.is_team_member_id(team_id) or private.is_admin());
create policy "team invite or apply" on public.team_members for insert with check(
 (user_id=(select auth.uid()) and membership_status='pending' and exists(select 1 from public.teams t join public.challenge_applications a on a.challenge_id=t.challenge_id where t.id=team_id and a.applicant_id=(select auth.uid()) and a.status='accepted'))
 or (private.is_team_member_id(team_id) and membership_status='invited')
);
create policy "accept invite or leave" on public.team_members for update using(user_id=(select auth.uid()) or private.is_team_member_id(team_id)) with check(
 (user_id=(select auth.uid()) and membership_status in ('active','declined','left')) or private.is_team_member_id(team_id)
);

-- Keep row ownership and moderation state immutable in ordinary profile/project table updates.
create function private.guard_team_membership() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.team_id is distinct from old.team_id or new.user_id is distinct from old.user_id or new.team_role is distinct from old.team_role then raise exception 'membership identity and role are immutable'; end if;
 if old.membership_status='invited' and new.membership_status not in ('active','declined') then raise exception 'invalid invitation transition'; end if;
 if old.membership_status='pending' and new.membership_status not in ('active','declined','left') then raise exception 'invalid membership transition'; end if;
 return new;
end; $$;
create trigger team_members_guard before update on public.team_members for each row execute function private.guard_team_membership();
create function private.guard_challenge_status() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.status is distinct from old.status and not private.is_admin() then
   if new.status not in ('draft','published') then raise exception 'invalid challenge transition'; end if;
   if new.status='published' and old.status<>'draft' then raise exception 'invalid challenge transition'; end if;
   if new.status='published' and new.problem_id is not null and not exists(select 1 from public.problems p where p.id=new.problem_id and p.status in ('approved','converted_to_challenge')) then raise exception 'source problem is not approved'; end if;
 end if;
 return new;
end; $$;
create trigger challenge_status_guard before update on public.challenges for each row execute function private.guard_challenge_status();
create function private.guard_problem_status() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.status is distinct from old.status and not private.is_admin() then
   if not (old.status in ('draft','needs_changes') and new.status in ('submitted','draft')) then raise exception 'moderation status is administrator controlled'; end if;
 end if;
 return new;
end; $$;
create trigger problem_status_guard before update on public.problems for each row execute function private.guard_problem_status();

-- Public data access is limited to authenticated users and anonymous challenge discovery.
grant usage on schema public to anon, authenticated;
grant select on public.skills, public.challenges, public.profiles, public.profile_skills, public.organizations, public.problems, public.teams, public.team_members, public.projects, public.project_updates, public.project_milestones, public.project_evidence, public.project_feedback, public.impact_metrics to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
