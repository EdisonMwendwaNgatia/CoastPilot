import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, Handshake, MapPin } from "lucide-react";
import { redirect } from "next/navigation";
import { requestChallengeSponsorship } from "@/app/actions";
import { requireUser } from "@/lib/auth/current-user";

export default async function OrganizationsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { supabase, user } = await requireUser();
  const params = await searchParams;
  const [{ data: profile }, { data: memberships }, { data: proposals }] = await Promise.all([
    supabase.from("profiles").select("account_type,platform_role").eq("id", user.id).maybeSingle(),
    supabase.from("organization_members").select("organization_id,membership_role,organizations!inner(id,name,verification_status)").eq("user_id", user.id).eq("organizations.verification_status", "verified"),
    supabase.from("partnership_proposals").select("id,organization_name,status,created_at").eq("submitted_by", user.id).order("created_at", { ascending: false }).limit(5),
  ]);

  if (profile?.platform_role !== "admin" && profile?.account_type !== "partner") {
    redirect(proposals?.length ? "/partnerships" : "/partnerships?intent=partner");
  }
  const organizations = (memberships ?? []).map((m) => ({
    id: m.organization_id,
    role: m.membership_role,
    organization: m.organizations as unknown as { id: string; name: string; verification_status: string },
  })).filter((m) => m.organization?.verification_status === "verified");
  if (profile?.platform_role !== "admin" && organizations.length === 0) redirect("/partnerships");
  const sponsorOrganizations = organizations.filter((m) => ["owner", "manager"].includes(m.role));
  const [{ data: challenges, error }, { data: sponsorships }] = await Promise.all([
    supabase.from("challenges").select("id,title,summary,status,application_deadline,is_sponsored,sponsor_name,prize_type,cash_prize_amount,cash_prize_currency,tangible_prizes,prize_notes,organizations(name),problems(county,town,category)").in("status", ["published", "in_progress"]).order("created_at", { ascending: false }),
    sponsorOrganizations.length ? supabase.from("challenge_sponsorship_requests").select("id,challenge_id,status,created_at").in("organization_id", sponsorOrganizations.map((m) => m.id)).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);
  const latestSponsorship = new Map<string, { status: string; created_at: string }>();
  for (const request of sponsorships ?? []) if (!latestSponsorship.has(request.challenge_id)) latestSponsorship.set(request.challenge_id, request);

  return <>
    <div className="workspace-welcome"><div><p className="eyebrow">PARTNER CHALLENGES</p><h1>Back a challenge that matters.</h1><p>Browse published and ongoing community challenges. Verified organization owners and managers can propose sponsorship for opportunities that still need support.</p></div><span className="status status-active"><BadgeCheck size={14}/> Verified partner</span></div>
    {params.error && <p className="form-error" role="alert">{params.error}</p>}{params.notice && <p className="success-note" role="status">{params.notice}</p>}{error && <p className="form-error" role="alert">Could not load challenges: {error.message}</p>}
    {challenges?.length ? <div className="partner-challenge-list">{challenges.map((challenge) => {
      const problem = challenge.problems as unknown as { county?: string; town?: string; category?: string } | null;
      const existingRequest = latestSponsorship.get(challenge.id);
      const prizeText = challenge.prize_type === "none" ? "No prizes" : challenge.prize_type === "cash" ? `Cash · ${challenge.cash_prize_currency} ${Number(challenge.cash_prize_amount).toLocaleString()}` : challenge.prize_type === "tangible" ? "Tangible prizes" : `Cash + tangible · ${challenge.cash_prize_currency} ${Number(challenge.cash_prize_amount).toLocaleString()}`;
      return <article className="workspace-card partner-challenge-item" key={challenge.id}>
        <div className="partner-challenge-title"><div><span className={`status status-${challenge.status}`}>{challenge.status.replaceAll("_", " ")}</span><p className="eyebrow">{problem?.category ?? "COMMUNITY CHALLENGE"}</p><h2>{challenge.title}</h2><p>{challenge.summary}</p></div><span className={`sponsor-badge ${challenge.is_sponsored ? "sponsored" : "unsponsored"}`}>{challenge.is_sponsored ? `Sponsored · ${challenge.sponsor_name || "Partner"}` : "Not sponsored"}</span></div>
        <div className="location-note"><MapPin size={14}/>{[problem?.town, problem?.county].filter(Boolean).join(", ") || "Coastal Kenya"}</div>
        <span className="prize-badge">{prizeText}</span>
        {challenge.prize_type !== "none" && <div className="challenge-prize-detail">{challenge.tangible_prizes?.length ? <p><strong>Tangible prizes:</strong> {challenge.tangible_prizes.join(", ")}</p> : null}{challenge.prize_notes && <p>{challenge.prize_notes}</p>}</div>}
        <small>{challenge.application_deadline ? `Applications close ${new Date(`${challenge.application_deadline}T00:00:00`).toLocaleDateString()}` : "No application deadline"}</small>
        {existingRequest ? <p className="success-note">Your sponsorship proposal is {existingRequest.status.replaceAll("_", " ")}.</p> : !challenge.is_sponsored && sponsorOrganizations.length > 0 ? <details className="team-create"><summary>Propose sponsorship <ArrowRight size={15}/></summary><p>CoastPilot reviews every sponsorship proposal before it is shown on the challenge.</p><form action={requestChallengeSponsorship} className="inline-form"><label>Organization<select name="organization_id" required>{sponsorOrganizations.map(({ organization }) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label><input type="hidden" name="challenge_id" value={challenge.id}/><label>Sponsor display name<input name="sponsor_name" required minLength={2} maxLength={120} placeholder="Name shown if approved"/></label><label>What support are you proposing?<textarea name="support_details" required minLength={20} maxLength={3000} rows={3} placeholder="Describe the commitment, scope, or conditions."/></label><div className="partnership-fields"><label>Cash support (optional)<input name="proposed_cash_support" type="number" min="0" step="0.01"/></label><label>Currency<input name="currency" defaultValue="KES" maxLength={3}/></label></div><label>In-kind support, one per line<textarea name="tangible_support" rows={2} maxLength={1500} placeholder="Equipment, mentorship, venue, services…"/></label><button className="button" type="submit">Send sponsorship proposal</button></form></details> : null}
      </article>;
    })}</div> : <section className="empty-large"><Building2 size={26}/><h2>No live challenges yet</h2><p>Published opportunities will appear here when they are ready for innovators and partners.</p></section>}
    <section className="setup-callout"><div><strong>Have a community problem to share?</strong><p>Partners can submit a problem for CoastPilot review, just like other community members.</p></div><Link href="/problems/new" className="button">Post a problem <ArrowRight size={15}/></Link></section>
    <p className="privacy-note"><Handshake size={14}/> Partner access is limited to challenges, sponsorship proposals, and community problem submissions.</p>
  </>;
}
