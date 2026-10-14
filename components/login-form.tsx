"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthProviderButtons } from "@/components/auth-provider-buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({ next, className, ...props }: React.ComponentPropsWithoutRef<"div"> & { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(next || "/protected");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return <div className={cn("auth-form-wrap", className)} {...props}>
    <Card className="auth-card">
      <CardHeader className="auth-card-header">
        <span className="auth-card-kicker">WELCOME BACK</span>
        <CardTitle className="auth-card-title">Sign in to CoastPilot</CardTitle>
        <CardDescription className="auth-card-description">Pick up your work and see what’s moving in your community.</CardDescription>
      </CardHeader>
      <CardContent className="auth-card-content">
        <AuthProviderButtons next={next} defaultNext="/dashboard" />
        <form onSubmit={handleLogin}>
          <div className="auth-fields">
            <div className="auth-field"><Label htmlFor="email">Email address</Label><div className="auth-input-wrap"><Mail size={16}/><Input id="email" type="email" placeholder="you@example.com" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}/></div></div>
            <div className="auth-field"><div className="auth-password-label"><Label htmlFor="password">Password</Label><Link href="/auth/forgot-password" className="auth-forgot">Forgot password?</Link></div><div className="auth-input-wrap"><LockKeyhole size={16}/><Input id="password" type="password" placeholder="Enter your password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}/></div></div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <Button type="submit" className="auth-submit" disabled={isLoading}>{isLoading ? "Signing you in…" : <>Sign in <ArrowRight size={16}/></>}</Button>
          </div>
          <div className="auth-switch">Don&apos;t have an account? <Link href={next ? `/auth/sign-up?next=${encodeURIComponent(next)}` : "/auth/sign-up"}>Create an account</Link></div>
        </form>
      </CardContent>
    </Card>
  </div>;
}
