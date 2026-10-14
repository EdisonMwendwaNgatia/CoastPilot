# CoastPilot

**From Coastal Problems to Tested Solutions.** CoastPilot is a youth innovation workspace focused initially on Kenya’s coastal communities. It supports the path from a community problem to a reviewed challenge, youth application, team MVP workspace, testing evidence, and a pilot conversation. Youth participation is free; there is no payment collection in this release.

## Implemented in this repository

- Public landing page with live published challenges fetched from Supabase and a real-data empty state.
- Supabase Auth sign-up, sign-in, password reset, confirmation, and cookie session refresh.
- Youth profile onboarding and privacy choice.
- Problem drafts and submissions, private review queue, administrator decision workflow.
- Administrator challenge authoring from approved problems, draft review, publication, and reporter notification.
- Published challenge discovery and unique challenge applications.
- Challenge owners can review applications. Accepted applicants can create a team and MVP project with starter milestones.
- Team project overview, updates, self-reported impact measures, and an authenticated print/PDF report.
- In-app notifications, partnership proposal intake and admin review, invitation-gated verified partner access, partner challenge drafts, and reviewed sponsorship requests.
- Versioned schema and security migrations with private project evidence storage.

This is a pilot foundation, not every product feature in the full specification. Team invitations, editing project plans/milestones, detailed analytics, some impact-report fields, abuse-report UI, automated security tests, and full E2E tests remain incomplete. Do not describe a project measure as verified unless a trusted reviewer has actually verified it.

## Stack

- Next.js App Router (installed Next.js 16), React Server Components, TypeScript strict mode.
- Supabase PostgreSQL, Auth, Storage, `@supabase/ssr` cookie sessions.
- Tailwind CSS and existing shadcn/ui starter components; Lucide icons.
- Server actions validated with Zod; React Hook Form and Recharts are available for later interactive workflows.

## Local development

1. Use Node.js 20+ and npm.
2. Create a Supabase project at [database.new](https://database.new).
3. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from that project’s API settings. To enable administrator account bans and deletion, also set `SUPABASE_SERVICE_ROLE_KEY` from the Supabase project API settings. Keep it server-only and never commit it or place it in a `NEXT_PUBLIC_*` variable.
4. Apply migrations in order using the Supabase CLI (`supabase link --project-ref <ref>` then `supabase db push`) or the SQL editor. Keep development and production projects separate. Do not run migrations against production until you have reviewed the SQL and confirmed the linked project.
5. In Supabase Auth URL settings, use `http://localhost:3000` as the local site URL and allow `http://localhost:3000/**`. For production, set the Site URL to `https://coastpilot.vercel.app`, allow `https://coastpilot.vercel.app/**`, and set Vercel's `NEXT_PUBLIC_SITE_URL` to `https://coastpilot.vercel.app`. This allowlist covers confirmation, password recovery, and OAuth callbacks. Keep localhost allowlisted for development.
6. To enable Google and GitHub sign-in, create OAuth apps with each provider and enable them in Supabase **Authentication → Sign In / Providers**. Register `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback` as the provider callback URL, then enter each provider's client ID and secret in Supabase. For Google, also register `http://localhost:3000` and `https://coastpilot.vercel.app` as authorized JavaScript origins. In Supabase Auth URL settings, allow `http://localhost:3000/auth/confirm` and `https://coastpilot.vercel.app/auth/confirm`; OAuth returns through this route to establish the cookie session. Provider secrets stay in Supabase and do not belong in Vercel or `.env.local`.
7. Run:

   ```bash
   npm install
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000). The marketing page works without Supabase configuration; authenticated workflows require it.

## Database and access setup

Migrations:

- `supabase/migrations/0001_coastpilot_core.sql` creates application tables, enums, helper functions, initial policies, starter skill catalogue, and the private `project-evidence` bucket.
- `supabase/migrations/0002_security_hardening.sql` narrows profile update columns, protects impact verification fields, and tightens application and team permissions.
- `supabase/migrations/0003_workflow_notifications.sql` creates trusted in-app notifications for problem decisions, challenge publication, and application decisions.
- `supabase/migrations/20261014190000_admin_user_moderation.sql` adds RLS-protected moderation history and warning notifications, and links new-user alerts to the member profile.
- `supabase/migrations/20261014192000_admin_profile_skill_read.sql` lets platform administrators view the skills a member selected.
- `supabase/migrations/20261014230000_partner_proposals_and_sponsorship_review.sql` adds public partnership proposals and organization sponsorship requests with RLS and admin notifications.
- `supabase/migrations/20261014231000_admin_reviewed_challenge_sponsorship.sql` prevents organization members from changing sponsorship or prize details without administrator approval.
- `supabase/migrations/20261014232000_restrict_profile_trigger_function.sql` removes direct API execution rights from the internal Auth profile-creation trigger.

Every application table has RLS enabled. Admin role is never accepted from user metadata or self-service forms. For the first administrator, create and verify the account normally, then use the Supabase SQL editor as project owner:

```sql
update public.profiles
set platform_role = 'admin'
where id = (select id from auth.users where email = 'ADMIN_EMAIL');
```

Replace `ADMIN_EMAIL` with the verified account email. Protect admin accounts with MFA and provision very few.

The landing-page partnership CTA opens a Google-first application flow. After OAuth, a first-time applicant is returned to `/partnerships` with a `potential_partner` account classification and completes the organization proposal there. This classification grants no organization access. Public partnership proposals are reviewed in **Admin → Partnerships**. Approving a proposal verifies the organization, creates an owner membership, changes the profile to `partner` using the server-only service role, and sends an Auth invitation to a new contact or a sign-in link to an existing account. Partner accounts can browse current challenges, request sponsorship for eligible challenges, and submit community problems. They do not have the youth project workspace or challenge creation/review tools. Configure Supabase Auth SMTP for reliable delivery, customize the Invite User and Magic Link templates to identify the approved partnership, and allow the callback URLs described below. Invitation links return through `/auth/confirm` to `/organizations`. Declined proposals do not create an organization workspace.

Verified partners can submit challenge drafts and view their own drafts together with currently published and in-progress challenges. Admins receive an in-app notification for partner challenge drafts and approve/publish them from **Admin → Challenges**. A verified organization owner or manager can propose sponsorship for an unsponsored active challenge; it does not affect the public sponsor badge until an admin approves it in **Admin → Partnerships**. Prize awards remain separately reviewed. These proposals do not collect or transfer money.

For exceptional manual provisioning, organization registration alone intentionally provides no workspace membership. Verify an organization through a trusted administrator process. To provision its initial owner, run as database owner after confirming both organization and user:

```sql
update public.organizations set verification_status = 'verified' where slug = 'confirmed-org-slug';
insert into public.organization_members (organization_id, user_id, membership_role)
select o.id, u.id, 'owner'
from public.organizations o
join auth.users u on u.email = 'CONFIRMED_MEMBER_EMAIL'
where o.slug = 'confirmed-org-slug'
on conflict (organization_id, user_id) do update set membership_role = 'owner';
```

Use `manager` or `reviewer` for additional least-privilege members. `organization_members` has no client insert policy. Never expose a database-owner credential in the application.

Administrators can draft challenges from approved problems in the review workspace. Publication requires the administrator role and the database trigger rejects a challenge tied to an unapproved problem. Workflow notifications are written by trusted database triggers so a user cannot create notifications for another account. Challenge applications are unique per applicant/challenge. Team creation requires an accepted application; project reads and writes are checked through team membership policies.

## Storage

Migration 0001 creates a private `project-evidence` bucket, limited to images and PDFs up to 10 MiB. Object names must begin with the authorized team UUID. Storage policies bind object access to active team membership; the metadata row remains subject to project evidence RLS. Public profile assets should use a separate public bucket only if intentionally published. The current UI does not yet expose evidence upload.

## Environment

| Name | Use | Browser exposed |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/legacy anon key | Yes; safe only with RLS |
| `NEXT_PUBLIC_SITE_URL` | Canonical app origin for email redirects (local default: `http://localhost:3000`; production: `https://coastpilot.vercel.app`) | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase Auth administration for moderation, partner invitations, and organization provisioning | No |

Service-role keys, database passwords, signing secrets, and access tokens must remain in trusted operator tooling and must never be committed or placed in `NEXT_PUBLIC_*` variables. `.env` and `.env*.local` are ignored by Git.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build -- --webpack
```

The default Turbopack build currently panics in its CSS processing worker in this environment; the production webpack build succeeds. Next is configured to use its TypeScript compiler API instead of spawning `tsc --showConfig`, which failed in this environment despite the standalone type check passing.

## Deployment and operations

For Vercel, create separate preview/development and production Supabase projects, apply migrations to the matching project, configure the public Supabase values in each Vercel environment, and add `SUPABASE_SERVICE_ROLE_KEY` as an encrypted server environment variable for admin account moderation and partner approval/invitations. In Supabase Auth, allow the deployed `/auth/confirm` callback, configure a production email provider, and customize Invite User and Magic Link templates. Review production RLS and storage policies before collecting pilot data. Configure scheduled database backups and periodically test restoring into a separate project; retain migration files and any separately managed seed/export files. No external deployment has been performed or verified from this repository.

## Limitations

- The local environment file is ignored by Git. The admin user moderation migrations have been applied to the connected Supabase project; keep any other development and production projects synchronized through reviewed migrations.
- There are no automated Vitest/Playwright suites yet, and no database-backed negative RLS test harness has been run.
- Organization provisioning is tied to the reviewed proposal flow. Evidence upload, invitation/join UI, team membership management, full project editing, and impact-report limitations/recommendations are only partly implemented.
- Youth registration stays free. Sponsored coordination may be discussed; the indicative KSh 15,000–30,000 fee is subject to customer validation and scope and is not a guaranteed price. No payments or automatic grant distribution are built.
- Back up the database and storage separately and validate restore procedures before a real pilot.
