import Link from "next/link";
import { ArrowRight, Bell, Compass, Lightbulb, MapPin, Users } from "lucide-react";
import { markNotificationRead, reviewApplication } from "@/app/actions";
import { requireUser } from "@/lib/auth/current-user";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { supabase, user } = await requireUser();
  const [params, results] = await Promise.all([
    searchParams,
    Promise.all([
      supabase.from("profiles").select("full_name,username,bio,county,onboarding_completed,platform_role").eq("id", user.id).single(),
      supabase.from("problems").select("id,title,status,created_at").eq("reporter_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("challenge_applications").select("id,status,created_at,challenges(title,slug,created_by,organization_id)").eq("applicant_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("challenges").select("id,title,challenge_applications(id,applicant_id,motivation,status,profiles(full_name,username))").eq("created_by", user.id).eq("challenge_applications.status", "pending").limit(20),
      supabase.from("team_members").select("id,membership_status,teams(name,challenge_id)").eq("user_id", user.id).eq("membership_status", "active").limit(10),
      supabase.from("notifications").select("id,title,message,link,created_at").is("read_at", null).order("created_at", { ascending: false }).limit(5),
    ]),
  ]);
  const [profileResult, problemsResult, applicationsResult, reviewChallengesResult, membershipsResult, notificationsResult] = results;
  const profile = profileResult.data;
  const problems = problemsResult.data;
  const applications = applicationsResult.data;
  const memberships = membershipsResult.data;
  const notifications = notificationsResult.data;

  const orgChallengeIds = (await supabase.from("organization_members").select("organization_id").eq("user_id", user.id)).data?.map((membership) => membership.organization_id) ?? [];
  const orgChallenges = orgChallengeIds.length
    ? (await supabase.from("challenges").select("id,title,challenge_applications(id,applicant_id,motivation,status,profiles(full_name,username))").in("organization_id", orgChallengeIds).eq("challenge_applications.status", "pending").limit(20)).data ?? []
    : [];
  const allReviewChallenges = [...(reviewChallengesResult.data ?? []), ...orgChallenges];

  return <>
    <div className="workspace-welcome"><div><p className="eyebrow">YOUR COASTPILOT WORKSPACE</p><h1>Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.</h1><p>Turn what you notice in your community into something people can test.</p></div><Link className="button" href="/problems/new">Share a problem <ArrowRight size={16}/></Link></div>
    {params.error && <p className="form-error" role="alert">{params.error}</p>}{params.notice && <p className="success-note" role="status">{params.notice}</p>}
    {!profile?.username && <section className="setup-callout"><div><strong>Finish setting up your innovator profile</strong><p>Add a short bio, location, interests, and skills so opportunities can find you.</p></div><Link href="/onboarding" className="text-link">Complete profile <ArrowRight size={15}/></Link></section>}
    <div className="workspace-grid">
      <section className="workspace-card"><div className="card-heading"><div><p className="eyebrow">YOUR ACTIVITY</p><h2>Problem submissions</h2></div><Lightbulb size={20}/></div>{problems?.length ? <ul className="activity-list">{problems.map((problem) => <li key={problem.id}><span><strong>{problem.title}</strong><small>{new Date(problem.created_at).toLocaleDateString()}</small></span><span className={`status status-${problem.status}`}>{problem.status.replaceAll("_", " ")}</span></li>)}</ul> : <p className="empty-state">No community problems yet. Your first observation can be the start of a challenge.</p>}<Link className="subtle-link" href="/problems/new">Submit a community problem <ArrowRight size={14}/></Link></section>
      <section className="workspace-card"><div className="card-heading"><div><p className="eyebrow">GET INVOLVED</p><h2>Your applications</h2></div><Compass size={20}/></div>{applications?.length ? <ul className="activity-list">{applications.map((application) => <li key={application.id}><span><strong>{(application.challenges as unknown as { title: string })?.title ?? "Challenge"}</strong><small>Applied {new Date(application.created_at).toLocaleDateString()}</small></span><span className={`status status-${application.status}`}>{application.status}</span></li>)}</ul> : <p className="empty-state">No applications yet. Browse published challenges to find a good fit.</p>}<Link className="subtle-link" href="/challenges">Browse challenges <ArrowRight size={14}/></Link></section>
      <section className="workspace-card"><div className="card-heading"><div><p className="eyebrow">COLLABORATE</p><h2>My teams</h2></div><Users size={20}/></div>{memberships?.length ? <ul className="activity-list">{memberships.map((membership) => <li key={membership.id}><strong>{(membership.teams as unknown as { name: string })?.name ?? "Team"}</strong><span className="status status-active">active</span></li>)}</ul> : <p className="empty-state">You can build an MVP on your own or invite collaborators to a team.</p>}<Link className="subtle-link" href="/projects">Open Projects <ArrowRight size={14}/></Link></section>
      <section className="workspace-card"><div className="card-heading"><div><p className="eyebrow">UPDATES</p><h2>Notifications</h2></div><Bell size={20}/></div>{notifications?.length ? <ul className="activity-list">{notifications.map((notification) => <li key={notification.id}><span><strong>{notification.title}</strong><small>{notification.message}</small></span><form action={markNotificationRead}><input type="hidden" name="notification_id" value={notification.id}/><button className="plain-button">Mark read</button></form></li>)}</ul> : <p className="empty-state">You’re all caught up. Notifications will show review decisions and team updates.</p>}</section>
    </div>
    {allReviewChallenges.some((challenge) => challenge.challenge_applications?.length) && <section className="workspace-card"><p className="eyebrow">CHALLENGE MANAGEMENT</p><h2>Applications to your challenges</h2>{allReviewChallenges.flatMap((challenge) => challenge.challenge_applications.map((application) => ({ ...application, challengeTitle: challenge.title }))).map((application) => <article className="org-project" key={application.id}><h3>{application.challengeTitle} · {(application.profiles as unknown as { full_name?: string })?.full_name || "Innovator"}</h3><p>{application.motivation}</p><form action={reviewApplication} className="form-actions"><input type="hidden" name="application_id" value={application.id}/><button className="button" name="status" value="accepted">Accept</button><button className="button secondary-button" name="status" value="rejected">Decline</button></form></article>)}</section>}
    {profile?.platform_role === "admin" && <section className="setup-callout admin-callout"><div><strong>Administrator tools</strong><p>Review submitted community problems and moderate challenges.</p></div><Link className="text-link" href="/admin">Open admin dashboard <ArrowRight size={15}/></Link></section>}
    {profile?.county && <p className="location-note"><MapPin size={14}/> Your community: {profile.county}</p>}
  </>;
}
