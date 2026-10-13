# CoastPilot

**From Coastal Problems to Tested Solutions.** CoastPilot is a youth innovation workspace focused initially on Kenya’s coastal communities. It supports the path from a community problem to a reviewed challenge, youth application, team MVP workspace, testing evidence, and a pilot conversation. Youth participation is free; there is no payment collection in this release.

## Implemented in this repository

- Public landing page with clearly labelled illustrative challenge examples.
- Supabase Auth sign-up, sign-in, password reset, confirmation, and cookie session refresh.
- Youth profile onboarding and privacy choice.
- Problem drafts and submissions, private review queue, administrator decision workflow.
- Administrator challenge authoring from approved problems, draft review, publication, and reporter notification.
- Published challenge discovery and unique challenge applications.
- Challenge owners can review applications. Accepted applicants can create a team and MVP project with starter milestones.
- Team project overview, updates, self-reported impact measures, and an authenticated print/PDF report.
- In-app notifications and an organization workspace gated by provisioned membership.
- Versioned schema and security migrations with private project evidence storage.

This is a pilot foundation, not every product feature in the full specification. Team invitations, editing project plans/milestones, evidence upload UI, detailed analytics, full organization challenge tools, abuse-report UI, automated security tests, and full E2E tests remain incomplete. Do not describe a project measure as verified unless a trusted reviewer has actually verified it.

## Stack

- Next.js App Router (installed Next.js 16), React Server Components, TypeScript strict mode.
- Supabase PostgreSQL, Auth, Storage, `@supabase/ssr` cookie sessions.
- Tailwind CSS and existing shadcn/ui starter components; Lucide icons.
- Server actions validated with Zod; React Hook Form and Recharts are available for later interactive workflows.

## Local development

1. Use Node.js 20+ and npm.
2. Create a Supabase project at [database.new](https://database.new).
3. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from that project’s API settings. Do not add a service role key to the browser or commit it.
4. Apply migrations in order using the Supabase CLI (`supabase link --project-ref <ref>` then `supabase db push`) or the SQL editor. Keep development and production projects separate. Do not run migrations against production until you have reviewed the SQL and confirmed the linked project.
5. In Supabase Auth URL settings, use `http://localhost:3000` as the local site URL and allow `http://localhost:3000/**`. For production, set the Site URL to `https://coastpilot.vercel.app`, allow `https://coastpilot.vercel.app/**`, and set Vercel's `NEXT_PUBLIC_SITE_URL` to `https://coastpilot.vercel.app`. This allowlist covers confirmation and password recovery callbacks. Keep localhost allowlisted for development.
6. Run:

   ```bash
   npm install
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000). The marketing page works without Supabase configuration; authenticated workflows require it.

## Database and access setup

Migrations:

- `supabase/migrations/0001_coastpilot_core.sql` creates application tables, enums, helper functions, initial policies, starter skill catalogue, and the private `project-evidence` bucket.
- `supabase/migrations/0002_security_hardening.sql` narrows profile update columns, protects impact verification fields, and tightens application and team permissions.
- `supabase/migrations/0003_workflow_notifications.sql` creates trusted in-app notifications for problem decisions, challenge publication, and application decisions.

Every application table has RLS enabled. Admin role is never accepted from user metadata or self-service forms. For the first administrator, create and verify the account normally, then use the Supabase SQL editor as project owner:

```sql
update public.profiles
set platform_role = 'admin'
where id = (select id from auth.users where email = 'ADMIN_EMAIL');
```

Replace `ADMIN_EMAIL` with the verified account email. Protect admin accounts with MFA and provision very few.

Organization registration alone intentionally provides no workspace membership. Verify an organization through a trusted administrator process. To provision its initial owner, run as database owner after confirming both organization and user:

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

Service-role keys, database passwords, signing secrets, and access tokens must remain in trusted operator tooling and must never be committed or placed in `NEXT_PUBLIC_*` variables. `.env` and `.env*.local` are ignored by Git.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build -- --webpack
```

The default Turbopack build currently panics in its CSS processing worker in this environment; the production webpack build succeeds. Next is configured to use its TypeScript compiler API instead of spawning `tsc --showConfig`, which failed in this environment despite the standalone type check passing.

## Deployment and operations

For Vercel, create separate preview/development and production Supabase projects, apply migrations to the matching project, configure the two public Supabase values in each Vercel environment, then configure each Supabase Auth site/redirect URL. Review production RLS and storage policies before collecting pilot data. Configure scheduled database backups and periodically test restoring into a separate project; retain migration files and any separately managed seed/export files. No external deployment has been performed or verified from this repository.

## Limitations

- The local environment file is ignored by Git. The Supabase MCP connection available to this session did not have permission to inspect the project configured for this app, so hosted migration history, live RLS, Auth, and Storage were not verified or modified.
- There are no automated Vitest/Playwright suites yet, and no database-backed negative RLS test harness has been run.
- Trusted organization provisioning UI, evidence upload, invitation/join UI, team membership management, full project editing, and impact-report limitations/recommendations are only partly implemented.
- Youth registration stays free. Sponsored coordination may be discussed; the indicative KSh 15,000–30,000 fee is subject to customer validation and scope and is not a guaranteed price. No payments or automatic grant distribution are built.
- Back up the database and storage separately and validate restore procedures before a real pilot.
