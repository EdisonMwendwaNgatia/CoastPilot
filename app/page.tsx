import Link from "next/link";
import { ArrowRight, Compass, Lightbulb, MapPin, Waves } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CoastPilotLogoMark } from "@/components/coastpilot-logo-mark";

const stages = [
  { number: "01", title: "Name the challenge", text: "Start with a problem people in your community experience every day." },
  { number: "02", title: "Build together", text: "Bring young people with different skills around a shared opportunity." },
  { number: "03", title: "Test what works", text: "Make a small prototype, learn from real people, and record the evidence." },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: challenges, error } = await supabase.from("challenges")
    .select("id,title,slug,summary,required_skills,application_deadline,is_sponsored,sponsor_name,prize_type,cash_prize_amount,cash_prize_currency,tangible_prizes,organizations(name),problems(county,town,category)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(3);
  return (
    <main>
      <header className="site-header">
        <Link href="/" className="brand"><CoastPilotLogoMark/><span>coastpilot<span className="brand-period">.</span></span></Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a><a href="#challenges">Challenges</a><a href="#partners">For organizations</a>
        </nav>
        <div className="header-actions"><Link className="nav-login" href="/auth/login">Log in</Link><Link className="button button-small" href="/auth/sign-up">Join CoastPilot <ArrowRight size={15} /></Link></div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUTH-LED INNOVATION · KENYA’S COAST</div>
          <h1>Big change starts<br />with <span className="highlight">local ideas.</span></h1>
          <p className="hero-description">A place for young people to turn the challenges they see every day into solutions they can build, test, and grow.</p>
          <div className="hero-actions"><Link className="button" href="/auth/sign-up">Bring your idea to life <ArrowRight size={17} /></Link><a className="text-link" href="#how-it-works">See how it works <span>↓</span></a></div>
          <div className="hero-note"><MapPin size={15} /> Rooted in coastal communities. Open to every young problem-solver.</div>
        </div>
        <div className="hero-art" aria-label="Illustration of a coastal landscape and growing idea">
          <div className="art-sun" /><div className="art-cloud art-cloud-one" /><div className="art-cloud art-cloud-two" />
          <div className="art-hill hill-back" /><div className="art-hill hill-front" /><div className="art-water" />
          <div className="art-island"><span /><i /></div>
          <div className="art-card"><span className="art-card-icon"><Lightbulb size={18} /></span><span><strong>A local idea</strong><small>can travel a long way.</small></span><ArrowRight size={16} className="art-arrow" /></div>
          <div className="art-caption"><span className="caption-line" /> COASTAL KENYA, BUILT BY US</div>
        </div>
      </section>

      <section className="signal-strip" aria-label="CoastPilot focus"><div><span className="signal-number">01</span><span>Community-rooted<br /><strong>problems</strong></span></div><div><span className="signal-number">02</span><span>Youth-powered<br /><strong>teams</strong></span></div><div><span className="signal-number">03</span><span>Real-world<br /><strong>testing</strong></span></div><div className="signal-tag"><Compass size={17} /> From the coast, for the future</div></section>

      <section className="section workflow" id="how-it-works">
        <div className="section-heading"><div><div className="eyebrow">A CLEAR PATH FROM IDEA TO IMPACT</div><h2>Make the next step<br />a real one.</h2></div><p>Good ideas deserve more than a conversation. CoastPilot gives them a practical path forward.</p></div>
        <div className="stage-grid">{stages.map((stage) => <article className="stage-card" key={stage.number}><div className="stage-top"><span>{stage.number}</span><ArrowRight size={17} /></div><h3>{stage.title}</h3><p>{stage.text}</p></article>)}</div>
      </section>

      <section className="section challenge-section" id="challenges">
        <div className="section-heading challenge-heading"><div><div className="eyebrow">A STARTING POINT FOR WHAT’S POSSIBLE</div><h2>Challenges worth<br />showing up for.</h2></div><p>Explore community priorities and find the one you want to help move forward.</p></div>
        {error ? <p className="challenge-empty-note">Published challenges are temporarily unavailable. Please try again soon.</p> : challenges?.length ? <div className="challenge-grid">{challenges.map((challenge) => { const place = challenge.problems as unknown as { county?:string|null; town?:string|null; category?:string|null } | null; const organization = challenge.organizations as unknown as { name:string } | null; const prizeLabel = challenge.prize_type === "none" ? "No prizes" : challenge.prize_type === "cash" ? `Cash · ${challenge.cash_prize_currency} ${Number(challenge.cash_prize_amount).toLocaleString()}` : challenge.prize_type === "tangible" ? "Tangible prizes" : `Cash + tangible · ${challenge.cash_prize_currency} ${Number(challenge.cash_prize_amount).toLocaleString()}`; return <article className="challenge-card" key={challenge.id}><div className="challenge-top"><span className="challenge-icon"><Compass size={19} /></span><span className={`sponsor-badge ${challenge.is_sponsored ? "sponsored" : "unsponsored"}`}>{challenge.is_sponsored ? `Sponsored${challenge.sponsor_name ? ` · ${challenge.sponsor_name}` : organization ? ` · ${organization.name}` : ""}` : "Not sponsored"}</span></div><div className="challenge-category">{place?.category ?? "COMMUNITY CHALLENGE"}</div><h3>{challenge.title}</h3><p className="landing-challenge-summary">{challenge.summary}</p><div className="challenge-place"><MapPin size={14} /> {[place?.town, place?.county].filter(Boolean).join(", ") || "Coastal Kenya"}</div><div className="landing-challenge-tags"><span className="prize-badge">{prizeLabel}</span>{challenge.required_skills?.slice(0, 3).map((skill:string) => <span className="landing-skill" key={skill}>{skill}</span>)}</div><small className="landing-deadline">{challenge.application_deadline ? `Apply by ${new Date(`${challenge.application_deadline}T00:00:00`).toLocaleDateString()}` : "Applications open"}</small><Link href="/auth/login?next=%2Fchallenges" className="challenge-link">Sign in to explore <ArrowRight size={15} /></Link></article>; })}</div> : <div className="landing-challenge-empty"><p>No published challenges just yet. New opportunities will appear here as soon as they’re ready.</p><Link href="/auth/login?next=%2Fchallenges" className="challenge-link">Sign in to browse challenges <ArrowRight size={15}/></Link></div>}
      </section>

      <section className="partner-band" id="partners"><div className="partner-symbol"><Waves size={22} /></div><div><div className="eyebrow">FOR ORGANIZATIONS & COMMUNITY PARTNERS</div><h2>Back local talent.<br />See what it can do.</h2><p>Bring a community challenge to CoastPilot, support young innovators, and explore a scoped real-world pilot together.</p></div><Link className="button button-light partner-cta" href="/partnerships"><span className="partner-cta-pulse" aria-hidden="true"/>Start a partnership conversation <ArrowRight size={16} /></Link></section>

      <footer className="site-footer"><Link href="/" className="brand footer-brand"><CoastPilotLogoMark/><span>coastpilot<span className="brand-period">.</span></span></Link><p>From Coastal Problems to Tested Solutions.</p><div className="footer-links"><a href="#how-it-works">How it works</a><a href="#challenges">Challenges</a><a href="mailto:hello@coastpilot.org">Get in touch</a></div><Link href="/legal" className="footer-legal-link">Terms &amp; privacy</Link><span className="copyright">CoastPilot · Built for the coast.</span></footer>
    </main>
  );
}
