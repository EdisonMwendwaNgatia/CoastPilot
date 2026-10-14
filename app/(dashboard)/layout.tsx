import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { LogoutButton } from "@/components/logout-button";
import { CoastPilotLogoMark } from "@/components/coastpilot-logo-mark";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { count: projectCount }] = await Promise.all([
    supabase.from("profiles").select("platform_role,account_type").eq("id", user.id).single(),
    supabase.from("challenge_applications").select("id", { count: "exact", head: true }).eq("applicant_id", user.id).eq("status", "accepted"),
  ]);
  const isPartner = profile?.account_type === "partner" && profile.platform_role !== "admin";
  const isPotentialPartner = profile?.account_type === "potential_partner" && profile.platform_role !== "admin";
  return <div className="workspace-shell"><header className="workspace-header"><Link href={isPartner ? "/organizations" : "/dashboard"} className="brand"><CoastPilotLogoMark/><span>coastpilot<span className="brand-period">.</span></span></Link><nav aria-label="Workspace">{isPartner ? <><Link href="/organizations">Challenges</Link><Link href="/problems/new">Post a problem</Link></> : isPotentialPartner ? <Link href="/partnerships">Partnership application</Link> : <><Link href="/dashboard">Overview</Link><Link href="/problems/new">Share a problem</Link><Link href="/challenges">Challenges</Link><Link className="workspace-project-link" href="/projects"><FolderKanban size={15}/><span>Projects</span>{(projectCount ?? 0) > 0 && <span className="workspace-nav-count" aria-label={`${projectCount} accepted challenge applications`}>{projectCount}</span>}</Link>{profile?.platform_role === "admin" && <Link className="workspace-admin-link" href="/admin">Admin</Link>}</>}</nav><LogoutButton /></header><main className="workspace-main">{children}</main></div>;
}
