import Link from "next/link";
import { Waves } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { LogoutButton } from "@/components/logout-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="workspace-shell"><header className="workspace-header"><Link href="/dashboard" className="brand"><span className="brand-mark"><Waves size={18}/></span><span>coastpilot<span className="brand-period">.</span></span></Link><nav aria-label="Workspace"><Link href="/dashboard">Overview</Link><Link href="/problems/new">Share a problem</Link><Link href="/challenges">Challenges</Link><Link href="/projects">Projects</Link><Link href="/organizations">Partners</Link></nav><LogoutButton /></header><main className="workspace-main">{children}</main></div>;
}
