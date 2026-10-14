import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { CoastPilotLogoMark } from "@/components/coastpilot-logo-mark";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <header className="admin-shell-header">
        <Link href="/admin" className="brand" aria-label="CoastPilot admin dashboard">
          <CoastPilotLogoMark />
          <span>coastpilot<span className="brand-period">.</span></span>
        </Link>
        <div className="admin-shell-label"><ShieldCheck size={16} /><span>Admin workspace</span></div>
        <LogoutButton />
      </header>
      <main className="workspace-main admin-shell-main">{children}</main>
    </div>
  );
}
