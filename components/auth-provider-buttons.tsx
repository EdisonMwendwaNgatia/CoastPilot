"use client";

import { createClient } from "@/lib/supabase/client";
import { Github } from "lucide-react";
import { useState } from "react";

type AuthProviderButtonsProps = {
  next?: string;
  defaultNext: string;
  googleOnly?: boolean;
  showEmailDivider?: boolean;
};

export function AuthProviderButtons({ next, defaultNext, googleOnly = false, showEmailDivider = true }: AuthProviderButtonsProps) {
  const [providerLoading, setProviderLoading] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: "google" | "github") {
    setProviderLoading(provider);
    setError(null);
    const destination = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : defaultNext;
    const redirectTo = new URL("/auth/confirm", window.location.origin);
    redirectTo.searchParams.set("next", destination);

    try {
      const { error: authError } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectTo.toString() },
      });
      if (authError) throw authError;
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Could not start social sign-in. Please try again.");
      setProviderLoading(null);
    }
  }

  return <div className="auth-provider-area">
    <div className="auth-provider-buttons">
      <button className="auth-provider-button" type="button" onClick={() => signIn("google")} disabled={providerLoading !== null}>
        <svg aria-hidden="true" viewBox="0 0 48 48" className="google-mark"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94a11.05 11.05 0 0 1-4.8 7.25l7.73 6C44.38 38.07 47 31.98 47 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.12.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.78l-7.74-6C30 37.83 27.2 38.75 24 38.75c-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.2C6.51 42.62 14.62 48 24 48Z"/></svg>
        {providerLoading === "google" ? "Connecting to Google…" : "Continue with Google"}
      </button>
      {!googleOnly && <button className="auth-provider-button" type="button" onClick={() => signIn("github")} disabled={providerLoading !== null}>
        <Github size={18} aria-hidden="true"/>
        {providerLoading === "github" ? "Connecting to GitHub…" : "Continue with GitHub"}
      </button>}
    </div>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {showEmailDivider && <div className="auth-divider"><span>or continue with email</span></div>}
  </div>;
}
