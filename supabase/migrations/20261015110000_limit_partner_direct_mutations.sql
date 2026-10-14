-- Potential applicants and approved partners use a tightly scoped workspace.
-- Direct PostgREST calls must follow the same boundary as the UI and actions.
create policy "youth and admins update profiles only"
on public.profiles as restrictive for update to authenticated
using (account_type = 'youth' or private.is_admin())
with check (
  private.is_admin()
  or (platform_role = 'youth' and account_type in ('youth','potential_partner'))
);

-- Organization workspaces are created by the trusted approval action. Remove
-- self-registration and editing; partners only need read access to their own
-- verified organization for sponsorship requests.
drop policy if exists "org registration" on public.organizations;
drop policy if exists "org members update org" on public.organizations;
create policy "admins update organization profiles"
on public.organizations for update to authenticated
using (private.is_admin())
with check (private.is_admin());

-- Approved partners should not open additional organization applications from
-- the database API. Youth and prospective partners may submit their own proposal.
drop policy if exists "authenticated users submit own partnership proposal" on public.partnership_proposals;
create policy "eligible users submit own partnership proposal"
on public.partnership_proposals for insert to authenticated
with check (
  status = 'submitted'
  and submitted_by = (select auth.uid())
  and contact_email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.account_type in ('youth','potential_partner')
  )
);
