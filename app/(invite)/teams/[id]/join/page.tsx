import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { joinTeamFromInvite } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { CoastPilotLogoMark } from "@/components/coastpilot-logo-mark";

export default async function JoinTeamPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, query, supabase] = await Promise.all([params, searchParams, createClient()]);
  const [{ data: auth }, { data: team }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("teams").select("id,name,description,challenge_id,challenges(title,status)").eq("id", id).maybeSingle(),
  ]);
  if (!team) return <main className="invite-page"><section className="invite-card"><p className="eyebrow">TEAM INVITATION</p><h1>This invite link is unavailable.</h1><p>The team may have been closed or the link may be incorrect.</p><Link className="subtle-link" href="/">Return to CoastPilot</Link></section></main>;
  const challenge = team.challenges as unknown as { title?: string; status?: string } | null;
  const isOpen = challenge?.status === "published" || challenge?.status === "in_progress";
  const { data: application } = auth.user
    ? await supabase.from("challenge_applications").select("id").eq("challenge_id", team.challenge_id).eq("applicant_id", auth.user.id).eq("status", "accepted").maybeSingle()
    : { data: null };
  const next = `/teams/${team.id}/join`;

  return <main className="invite-page">
    <Link href="/" className="brand invite-brand"><CoastPilotLogoMark/><span>coastpilot<span className="brand-period">.</span></span></Link>
    <section className="invite-card"><span className="invite-icon"><Users size={23}/></span><p className="eyebrow">TEAM INVITATION</p><h1>Join {team.name}</h1><p className="invite-description">You’ve been invited to work with this team on <strong>{challenge?.title ?? "a CoastPilot challenge"}</strong>.</p>{team.description && <p className="invite-team-description">{team.description}</p>}
      {query.error && <p className="form-error" role="alert">{query.error}</p>}
      {!auth.user ? <div className="invite-actions"><p>Sign in or create a free CoastPilot account to continue. You’ll need an accepted application to this challenge.</p><Link className="button" href={`/auth/login?next=${encodeURIComponent(next)}`}>Sign in to join</Link><Link className="subtle-link" href={`/auth/sign-up?next=${encodeURIComponent(next)}`}>Create a free account</Link></div>
        : !isOpen ? <p className="empty-state">This challenge is no longer accepting team members.</p>
        : !application ? <div className="invite-actions"><p>Team membership is limited to youth whose application for this challenge has been accepted.</p><Link className="subtle-link" href="/challenges">Browse challenges</Link></div>
        : <form action={joinTeamFromInvite} className="invite-actions"><input type="hidden" name="team_id" value={team.id}/><p>Your accepted application is confirmed. Join this team to collaborate on its project workspace.</p><button className="button" type="submit">Join team</button></form>}
      <Link className="invite-back" href="/"> <ArrowLeft size={14}/> CoastPilot home</Link>
    </section>
  </main>;
}
