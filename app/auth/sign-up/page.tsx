import { SignUpForm } from "@/components/sign-up-form";
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
          <h1>Start with what your community needs.</h1>
          <p>Create your free account to explore challenges, find teammates, and start building solutions that can be tested in the real world.</p>
          <ul><li><Check size={16}/> Free for youth innovators</li><li><Check size={16}/> Build practical skills with a team</li><li><Check size={16}/> Keep your work in one place</li></ul>
          <div className="auth-coast-art" aria-hidden="true"><span className="auth-sun"/><span className="auth-island"/><span className="auth-wave wave-one"/><span className="auth-wave wave-two"/><span className="auth-art-label">FROM THE COAST, FOR THE FUTURE</span></div>
        </section>
        <section className="auth-form-side"><SignUpForm /></section>
      </div>
      <footer className="auth-footer"><span>From Coastal Problems to Tested Solutions.</span><Link href="mailto:hello@coastpilot.org">Need help?</Link></footer>
    </main>
  );
}
