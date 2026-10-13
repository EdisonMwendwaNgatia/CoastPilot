"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // The url which will be included in the email. This URL needs to be configured in your redirect URLs in the Supabase dashboard at https://supabase.com/dashboard/project/_/auth/url-configuration
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("auth-form-wrap", className)} {...props}>
      {success ? (
        <Card className="auth-card">
          <CardHeader className="auth-card-header">
            <span className="auth-success-icon"><CheckCircle2 size={23}/></span>
            <span className="auth-card-kicker">EMAIL SENT</span>
            <CardTitle className="auth-card-title">Check your inbox</CardTitle>
            <CardDescription className="auth-card-description">If there’s a CoastPilot account for that address, password reset instructions are on their way.</CardDescription>
          </CardHeader>
          <CardContent className="auth-card-content">
            <p className="auth-reset-hint">Follow the link in the email to choose a new password. If it doesn’t arrive soon, check your spam folder or try again.</p>
            <button type="button" className="auth-submit auth-resend" onClick={() => setSuccess(false)}><Mail size={15}/> Try another email</button>
            <div className="auth-switch"><Link href="/auth/login"><ArrowLeft size={13}/> Back to sign in</Link></div>
          </CardContent>
        </Card>
      ) : (
        <Card className="auth-card">
          <CardHeader className="auth-card-header">
            <span className="auth-card-kicker">ACCOUNT RECOVERY</span>
            <CardTitle className="auth-card-title">Forgot your password?</CardTitle>
            <CardDescription className="auth-card-description">No problem. Enter your email and we’ll send you a secure reset link.</CardDescription>
          </CardHeader>
          <CardContent className="auth-card-content">
            <form onSubmit={handleForgotPassword}>
              <div className="auth-fields">
                <div className="auth-field">
                  <Label htmlFor="email">Email address</Label>
                  <div className="auth-input-wrap"><Mail size={16}/><Input
                    id="email" type="email" placeholder="you@example.com" autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  /></div>
                </div>
                {error && <p className="auth-error" role="alert">{error}</p>}
                <Button type="submit" className="auth-submit" disabled={isLoading}>
                  {isLoading ? "Sending reset link…" : <>Send reset link <ArrowRight size={16}/></>}
                </Button>
              </div>
              <div className="auth-switch">
                Remember your password? <Link href="/auth/login">Sign in</Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
