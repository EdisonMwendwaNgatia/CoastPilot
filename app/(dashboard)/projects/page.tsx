import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
export default async function ProjectsPage() {
 const {supabase,user}=await requireUser();
 const {data:projects,error}=await supabase.from("projects").select("id,title,summary,status,visibility,updated_at,teams!inner(team_members!inner(user_id,membership_status))").eq("teams.team_members.user_id",user.id).eq("teams.team_members.membership_status","active").order("updated_at",{ascending:false});
 return <><div className="workspace-welcome"><div><p className="eyebrow">BUILD & TEST</p><h1>Project workspaces.</h1><p>Team projects you’re authorized to work on show up here.</p></div></div>{error && <p className="form-error">{error.message}</p>}{projects?.length ? <div className="discovery-grid">{projects.map(p=><article key={p.id} className="workspace-card"><span className={`status status-${p.status}`}>{p.status.replaceAll("_"," ")}</span><h2>{p.title}</h2><p>{p.summary || "Your team has not added a summary yet."}</p><small>Updated {new Date(p.updated_at).toLocaleDateString()}</small><Link className="subtle-link" href={`/projects/${p.id}`}>Open workspace <ArrowRight size={14}/></Link></article>)}</div>:<section className="empty-large"><h2>Your next idea can become an MVP.</h2><p>Project workspaces appear when a challenge team creates one. Browse opportunities to get started.</p><Link className="text-link" href="/challenges">Browse challenges <ArrowRight size={15}/></Link></section>}</>;
}
