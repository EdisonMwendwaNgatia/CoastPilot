import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

async function markPartnerApplicant(supabase: Awaited<ReturnType<typeof createClient>>, next: string, userId: string) {
  const destination = new URL(next, "https://coastpilot.invalid");
  if (destination.pathname !== "/partnerships" || destination.searchParams.get("intent") !== "partner") return null;
  const { data: profile } = await supabase.from("profiles").select("account_type").eq("id", userId).maybeSingle();
  if (profile?.account_type === "youth") {
    const { error } = await supabase.from("profiles").update({ account_type: "potential_partner" }).eq("id", userId);
    return error?.message ?? null;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const requestedNext = searchParams.get("next") ?? "/";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.startsWith("/\\") ? requestedNext : "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const profileError = data.user ? await markPartnerApplicant(supabase, next, data.user.id) : null;
      if (profileError) redirect(`/auth/error?error=${encodeURIComponent(profileError)}`);
      redirect(next);
    }
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  if (token_hash && type) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      const profileError = data.user ? await markPartnerApplicant(supabase, next, data.user.id) : null;
      if (profileError) redirect(`/auth/error?error=${encodeURIComponent(profileError)}`);
      redirect(next);
    } else {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=No token hash or type`);
}
