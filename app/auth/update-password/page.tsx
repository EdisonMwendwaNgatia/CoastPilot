import { UpdatePasswordForm } from "@/components/update-password-form";
import Link from "next/link";
import { ArrowLeft, Check, Waves } from "lucide-react";

export default function Page() {
  return (
    <main className="auth-page">
      <Link href="/" className="auth-back"><ArrowLeft size={15}/> Back to CoastPilot</Link>
      <Link href="/" className="auth-brand"><span className="brand-mark"><Waves size={19}/></span><span>coastpilot<span className="brand-period">.</span></span></Link>
      <div className="auth-layout">
        <section className="auth-story">
          <p className="eyebrow">SECURE YOUR ACCOUNT</p>
          <h1>Choose a new password.</h1>
          <p>Set a password you haven’t used on CoastPilot before. Then you can return to your projects and community work.</p>
          <ul><li><Check size={16}/> Use at least 6 characters</li><li><Check size={16}/> Keep your password private</li><li><Check size={16}/> You can sign in right after saving</li></ul>
          <div className="auth-coast-art" aria-hidden="true"><span className="auth-sun"/><span className="auth-island"/><span className="auth-wave wave-one"/><span className="auth-wave wave-two"/><span className="auth-art-label">FROM THE COAST, FOR THE FUTURE</span></div>
        </section>
        <section className="auth-form-side"><UpdatePasswordForm /></section>
      </div>
      <footer className="auth-footer"><span>From Coastal Problems to Tested Solutions.</span><Link href="mailto:hello@coastpilot.org">Need help?</Link></footer>
    </main>
  );
}
