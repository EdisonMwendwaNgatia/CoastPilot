"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }
    try {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/protected` } });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return <div className={cn("auth-form-wrap", className)} {...props}>
    <Card className="auth-card">
      <CardHeader className="auth-card-header">
        <span className="auth-card-kicker">GET STARTED · IT’S FREE</span>
        <CardTitle className="auth-card-title">Create your account</CardTitle>
        <CardDescription className="auth-card-description">Join young innovators building practical solutions with their communities.</CardDescription>
      </CardHeader>
      <CardContent className="auth-card-content">
        <form onSubmit={handleSignUp}>
          <div className="auth-fields">
            <div className="auth-field"><Label htmlFor="email">Email address</Label><div className="auth-input-wrap"><Mail size={16}/><Input id="email" type="email" placeholder="you@example.com" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}/></div></div>
            <div className="auth-field"><Label htmlFor="password">Password</Label><div className="auth-input-wrap"><LockKeyhole size={16}/><Input id="password" type="password" placeholder="At least 6 characters" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)}/></div></div>
            <div className="auth-field"><Label htmlFor="repeat-password">Confirm password</Label><div className="auth-input-wrap"><LockKeyhole size={16}/><Input id="repeat-password" type="password" placeholder="Enter your password again" autoComplete="new-password" required value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)}/></div></div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <Button type="submit" className="auth-submit" disabled={isLoading}>{isLoading ? "Creating your account…" : <>Create free account <ArrowRight size={16}/></>}</Button>
            <p className="auth-terms">Youth participation on CoastPilot is free.</p>
          </div>
          <div className="auth-switch">Already have an account? <Link href="/auth/login">Sign in</Link></div>
        </form>
      </CardContent>
    </Card>
  </div>;
}
