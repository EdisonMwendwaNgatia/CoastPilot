import { ForgotPasswordForm } from "@/components/forgot-password-form";
import Link from "next/link";
import { Check } from "lucide-react";
import { CoastPilotLogoMark } from "@/components/coastpilot-logo-mark";

export default function Page() {
  return (
    <main className="auth-page">
      
      <Link href="/" className="auth-brand"><CoastPilotLogoMark/><span>coastpilot<span className="brand-period">.</span></span></Link>
      <div className="auth-layout">
        <section className="auth-story">
          <p className="eyebrow">ACCOUNT RECOVERY</p>
          <h1>Let’s get you back to your work.</h1>
          <p>Enter the email address you use for CoastPilot. We’ll send a secure link to choose a new password.</p>
          <ul><li><Check size={16}/> The reset link is sent only to your email</li><li><Check size={16}/> Your projects and submissions stay safe</li><li><Check size={16}/> Links expire for your protection</li></ul>
          <div className="auth-coast-art" aria-hidden="true"><span className="auth-sun"/><span className="auth-island"/><span className="auth-wave wave-one"/><span className="auth-wave wave-two"/><span className="auth-art-label">FROM THE COAST, FOR THE FUTURE</span></div>
        </section>
        <section className="auth-form-side"><ForgotPasswordForm /></section>
      </div>
      <footer className="auth-footer"><span>From Coastal Problems to Tested Solutions.</span><Link href="mailto:hello@coastpilot.org">Need help?</Link></footer>
    </main>
  );
}
