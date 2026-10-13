import Link from "next/link";
import { ArrowRight, Compass, Lightbulb, MapPin, Waves } from "lucide-react";

const stages = [
  { number: "01", title: "Name the challenge", text: "Start with a problem people in your community experience every day." },
  { number: "02", title: "Build together", text: "Bring young people with different skills around a shared opportunity." },
  { number: "03", title: "Test what works", text: "Make a small prototype, learn from real people, and record the evidence." },
];

const sampleChallenges = [
  { category: "Waste & recycling", title: "Making beach clean-ups part of the local economy", place: "Mombasa County", skills: "Community research · Product design" },
  { category: "Fisheries & livelihoods", title: "Helping small-scale fishers reduce post-harvest loss", place: "Kilifi County", skills: "Food systems · Mobile technology" },
  { category: "Climate adaptation", title: "Neighbourhood ideas for safer rainy seasons", place: "Kwale County", skills: "Mapping · Climate resilience" },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Link href="/" className="brand"><span className="brand-mark"><Waves size={21} /></span><span>coastpilot<span className="brand-period">.</span></span></Link>
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
        <div className="challenge-grid">{sampleChallenges.map((challenge) => <article className="challenge-card" key={challenge.title}><div className="challenge-top"><span className="challenge-icon"><Compass size={19} /></span><span className="sample-tag">SAMPLE CHALLENGE</span></div><div className="challenge-category">{challenge.category}</div><h3>{challenge.title}</h3><div className="challenge-place"><MapPin size={14} /> {challenge.place}</div><div className="challenge-skills">{challenge.skills}</div><a href="/auth/sign-up" className="challenge-link">Explore this challenge <ArrowRight size={15} /></a></article>)}</div>
        <p className="sample-note">These examples are illustrative. Published community challenges will appear here as they are reviewed.</p>
      </section>

      <section className="partner-band" id="partners"><div className="partner-symbol"><Waves size={22} /></div><div><div className="eyebrow">FOR ORGANIZATIONS & COMMUNITY PARTNERS</div><h2>Back local talent.<br />See what it can do.</h2><p>Bring a community challenge to CoastPilot and work alongside young innovators to explore practical, testable solutions.</p></div><Link className="button button-light" href="/auth/sign-up">Explore a partnership <ArrowRight size={16} /></Link></section>

      <footer className="site-footer"><Link href="/" className="brand footer-brand"><span className="brand-mark"><Waves size={18} /></span><span>coastpilot<span className="brand-period">.</span></span></Link><p>From Coastal Problems to Tested Solutions.</p><div className="footer-links"><a href="#how-it-works">How it works</a><a href="#challenges">Challenges</a><a href="mailto:hello@coastpilot.org">Get in touch</a></div><span className="copyright">CoastPilot · Built for the coast.</span></footer>
    </main>
  );
}
