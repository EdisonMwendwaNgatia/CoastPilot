import { LoginForm } from "@/components/login-form";
import Link from "next/link";
import { ArrowLeft, Check, Waves } from "lucide-react";

export default function Page() {
  return (
    <main className="auth-page">
      <Link href="/" className="auth-back"><ArrowLeft size={15}/> Back to CoastPilot</Link>
      <Link href="/" className="auth-brand"><span className="brand-mark"><Waves size={19}/></span><span>coastpilot<span className="brand-period">.</span></span></Link>
      <div className="auth-layout">
        <section className="auth-story">
          <p className="eyebrow">YOUR IDEAS HAVE A PLACE HERE</p>
          <h1>Pick up where your community needs you.</h1>
          <p>Sign in to follow your submissions, connect with a team, and keep moving your MVP from plan to real-world test.</p>
          <ul><li><Check size={16}/> Your work stays connected to your account</li><li><Check size={16}/> See challenge and project updates</li><li><Check size={16}/> Keep youth-led innovation moving</li></ul>
          <div className="auth-coast-art" aria-hidden="true"><span className="auth-sun"/><span className="auth-island"/><span className="auth-wave wave-one"/><span className="auth-wave wave-two"/><span className="auth-art-label">FROM THE COAST, FOR THE FUTURE</span></div>
        </section>
        <section className="auth-form-side"><LoginForm /></section>
      </div>
      <footer className="auth-footer"><span>From Coastal Problems to Tested Solutions.</span><Link href="mailto:hello@coastpilot.org">Need help?</Link></footer>
    </main>
  );
}
