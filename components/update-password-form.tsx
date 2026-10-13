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
import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Update this route to redirect to an authenticated route. The user already has an active session.
      router.push("/protected");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("auth-form-wrap", className)} {...props}>
      <Card className="auth-card">
        <CardHeader className="auth-card-header">
          <span className="auth-card-kicker">NEW PASSWORD</span>
          <CardTitle className="auth-card-title">Set your password</CardTitle>
          <CardDescription className="auth-card-description">Choose a new password to secure your CoastPilot account.</CardDescription>
        </CardHeader>
        <CardContent className="auth-card-content">
          <form onSubmit={handleForgotPassword}>
            <div className="auth-fields">
              <div className="auth-field">
                <Label htmlFor="password">New password</Label>
                <div className="auth-input-wrap"><LockKeyhole size={16}/><Input
                  id="password" type="password" placeholder="At least 6 characters" autoComplete="new-password" minLength={6}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                /></div>
              </div>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <Button type="submit" className="auth-submit" disabled={isLoading}>
                {isLoading ? "Saving password…" : <>Save new password <ArrowRight size={16}/></>}
              </Button>
            </div>
            <div className="auth-switch"><Link href="/auth/login">Return to sign in</Link></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
