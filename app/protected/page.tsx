import { requireUser } from "@/lib/auth/current-user";
import { ProtectedLoading } from "@/components/protected-loading";

export default async function ProtectedPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("platform_role").eq("id", user.id).maybeSingle();
  const safeNext = next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : undefined;
  return <ProtectedLoading destination={profile?.platform_role === "admin" ? "/admin" : safeNext ?? "/dashboard"} />;
}
