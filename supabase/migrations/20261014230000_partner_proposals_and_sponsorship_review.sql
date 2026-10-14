create table public.partnership_proposals (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references public.profiles(id) on delete set null default auth.uid(),
  contact_name text not null check (char_length(trim(contact_name)) between 2 and 120),
  contact_email text not null check (char_length(contact_email) <= 254 and contact_email = lower(trim(contact_email)) and contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  organization_name text not null check (char_length(trim(organization_name)) between 2 and 180),
  organization_type text not null default 'development_organization' check (char_length(organization_type) between 2 and 80),
  website text check (website is null or (char_length(website) <= 300 and website ~* '^https?://')),
  county text check (county is null or char_length(county) <= 100),
  interests text[] not null default '{}' check (cardinality(interests) <= 8),
  challenge_idea text not null default '' check (char_length(challenge_idea) <= 1000),
  proposed_support text not null default '' check (char_length(proposed_support) <= 1000),
  details text not null check (char_length(trim(details)) between 30 and 5000),
  status text not null default 'submitted' check (status in ('submitted','in_review','approved','declined')),
  organization_id uuid references public.organizations(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  invitation_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index partnership_proposals_queue on public.partnership_proposals(status, created_at desc);
create index partnership_proposals_email on public.partnership_proposals(contact_email, created_at desc);
alter table public.partnership_proposals enable row level security;
create policy "submit partnership proposal" on public.partnership_proposals
for insert to anon, authenticated
with check (status = 'submitted' and (submitted_by is null or submitted_by = (select auth.uid())));
create policy "submitter and admin read partnership proposal" on public.partnership_proposals
for select to authenticated
using (submitted_by = (select auth.uid()) or private.is_admin());
revoke all privileges on public.partnership_proposals from public, anon, authenticated;
grant insert (contact_name,contact_email,organization_name,organization_type,website,county,interests,challenge_idea,proposed_support,details)
on public.partnership_proposals to anon, authenticated;
grant select on public.partnership_proposals to authenticated;

create table public.challenge_sponsorship_requests (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  sponsor_name text not null check (char_length(trim(sponsor_name)) between 2 and 120),
  support_details text not null check (char_length(trim(support_details)) between 20 and 3000),
  proposed_cash_support numeric check (proposed_cash_support is null or proposed_cash_support between 0 and 100000000),
  currency text not null default 'KES' check (currency ~ '^[A-Z]{3}$'),
  proposed_tangible_support text[] not null default '{}' check (cardinality(proposed_tangible_support) <= 20),
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index challenge_sponsorship_review_queue on public.challenge_sponsorship_requests(status, created_at desc);
alter table public.challenge_sponsorship_requests enable row level security;
create policy "verified organization managers request sponsorship" on public.challenge_sponsorship_requests
for insert to authenticated
with check (
  submitted_by = (select auth.uid())
  and status = 'pending'
  and exists (select 1 from public.organizations o where o.id = organization_id and o.verification_status = 'verified')
  and private.is_org_member(organization_id, array['owner','manager']::public.member_role[])
  and exists (select 1 from public.challenges c where c.id = challenge_id and c.status in ('published','in_progress'))
);
create policy "sponsorship parties read requests" on public.challenge_sponsorship_requests
for select to authenticated
using (private.is_admin() or private.is_org_member(organization_id, array['owner','manager']::public.member_role[]));
create policy "admins review sponsorship requests" on public.challenge_sponsorship_requests
for update to authenticated
using (private.is_admin()) with check (private.is_admin());
revoke all privileges on public.challenge_sponsorship_requests from public, anon, authenticated;
grant select, insert (challenge_id,organization_id,sponsor_name,support_details,proposed_cash_support,currency,proposed_tangible_support), update on public.challenge_sponsorship_requests to authenticated;
create trigger partnership_proposals_updated before update on public.partnership_proposals for each row execute function public.touch_updated_at();
create trigger challenge_sponsorship_requests_updated before update on public.challenge_sponsorship_requests for each row execute function public.touch_updated_at();

create function private.notify_admin_partnership_proposal() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify_platform_admins(
    'partnership_proposal', 'New partnership proposal',
    new.organization_name || ' submitted a partnership proposal.',
    '/admin?tab=partners'
  );
  return new;
end;
$$;
revoke all on function private.notify_admin_partnership_proposal() from public, anon, authenticated;
create trigger admin_partnership_proposal_notification after insert on public.partnership_proposals
for each row execute function private.notify_admin_partnership_proposal();

create function private.notify_admin_sponsorship_request() returns trigger
language plpgsql security definer set search_path = '' as $$
declare challenge_title text;
begin
  select c.title into challenge_title from public.challenges c where c.id = new.challenge_id;
  perform private.notify_platform_admins(
    'sponsorship_request', 'Challenge sponsorship needs review',
    new.sponsor_name || ' proposed support for “' || coalesce(challenge_title, 'a challenge') || '”.',
    '/admin?tab=partners'
  );
  return new;
end;
$$;
revoke all on function private.notify_admin_sponsorship_request() from public, anon, authenticated;
create trigger admin_sponsorship_request_notification after insert on public.challenge_sponsorship_requests
for each row execute function private.notify_admin_sponsorship_request();
