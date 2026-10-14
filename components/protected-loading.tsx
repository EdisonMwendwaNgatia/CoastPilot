"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CoastPilotLogoMark } from "@/components/coastpilot-logo-mark";
import { useEffect } from "react";

export function ProtectedLoading({ destination }: { destination?: string }) {
  const router = useRouter();

  useEffect(() => {
    if (destination) router.replace(destination);
  }, [destination, router]);

  return (
    <main className="protected-loading-page" aria-busy="true" aria-live="polite">
      <Link href="/" className="brand protected-loading-brand">
        <CoastPilotLogoMark />
        <span>coastpilot<span className="brand-period">.</span></span>
      </Link>
      <section className="protected-loading-card" role="status" aria-label="Preparing your CoastPilot workspace">
        <span className="protected-loading-orbit"><span /></span>
        <p className="eyebrow">YOUR COASTPILOT WORKSPACE</p>
        <h1>Getting things ready.</h1>
        <p className="protected-loading-copy">We’re securely preparing your account and taking you to your workspace.</p>
        <div className="protected-loading-progress" aria-hidden="true"><span /></div>
        <span className="protected-loading-note">This should only take a moment</span>
      </section>
      <Link href={destination ?? "/dashboard"} className="protected-loading-skip">Go to workspace <ArrowRight size={15} /></Link>
    </main>
  );
}
