import Link from "next/link";
import {CalendarDays, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { createSoloProject, createTeamAndProject } from "@/app/actions";
import { requireUser } from "@/lib/auth/current-user";

export default async function AcceptedChallengePage({ params, searchParams }: { params: Promise<{ challengeId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { challengeId } = await params;
  const { error: queryError } = await searchParams;
  const { supabase, user } = await requireUser();
  const { data: application } = await supabase.from("challenge_applications").select("id,created_at,challenges(id,title,summary,description,objectives,eligibility,required_skills,deliverables,start_date,end_date,application_deadline,status,problem_id,problems(title,description,category,county,town,proposed_beneficiaries,existing_attempts))").eq("challenge_id", challengeId).eq("applicant_id", user.id).eq("status", "accepted").maybeSingle();
  if (!application) notFound();
  const challenge = application.challenges as unknown as {
    id: string; title: string; summary: string | null; description: string; objectives: string[] | null; eligibility: string | null;
    required_skills: string[] | null; deliverables: string[] | null; start_date: string | null; end_date: string | null;
    application_deadline: string | null; status: string; problems: { title: string; description: string; category: string; county: string | null; town: string | null; proposed_beneficiaries: string | null; existing_attempts: string | null } | null;
  } | null;
  if (!challenge || !["published", "in_progress"].includes(challenge.status)) notFound();
  const [{ data: existingSolo, error: soloProjectQueryError }, { data: membership }] = await Promise.all([
    supabase.from("projects").select("id,title").eq("created_by", user.id).eq("challenge_id", challengeId).maybeSingle(),
    supabase.from("team_members").select("team_id,teams(challenge_id)").eq("user_id", user.id).eq("membership_status", "active").limit(20),
  ]);
  const joinedTeam = membership?.find((m) => (m.teams as unknown as { challenge_id: string } | null)?.challenge_id === challengeId);
  const { data: teamProject } = joinedTeam ? await supabase.from("projects").select("id,title").eq("team_id", joinedTeam.team_id).maybeSingle() : { data: null };
  const existingProject = existingSolo ?? teamProject;
  const soloMigrationMissing = Boolean(soloProjectQueryError && /created_by|column/i.test(soloProjectQueryError.message));
  const problem = challenge.problems;
  return <>
    <div className="workspace-welcome"><div><p className="eyebrow">ACCEPTED CHALLENGE</p><h1>{challenge.title}</h1><p>{challenge.summary}</p></div><span className="status status-accepted"><CheckCircle2 size={13}/> Accepted</span></div>
    {queryError && <p className="form-error" role="alert">{queryError}</p>}
    <section className="workspace-card challenge-brief"><p className="eyebrow">THE FULL CHALLENGE BRIEF</p><h2>What are we solving?</h2><p className="challenge-description">{challenge.description || challenge.summary}</p>
      {problem && <div className="challenge-source-problem"><p className="eyebrow">COMMUNITY PROBLEM · {problem.category}{problem.county ? ` · ${problem.county}` : ""}</p><h3>{problem.title}</h3><p>{problem.description}</p>{problem.town && <small>Community: {problem.town}{problem.county ? `, ${problem.county}` : ""}</small>}{problem.proposed_beneficiaries && <p><strong>Who benefits:</strong> {problem.proposed_beneficiaries}</p>}{problem.existing_attempts && <p><strong>What has been tried:</strong> {problem.existing_attempts}</p>}</div>}
      <BriefList title="Desired outcomes" values={challenge.objectives}/><BriefList title="Required skills" values={challenge.required_skills}/><BriefList title="Expected deliverables" values={challenge.deliverables}/>
      {challenge.eligibility && <div className="brief-text"><h3>Who can take part</h3><p>{challenge.eligibility}</p></div>}
      <div className="challenge-dates">{challenge.start_date && <span><CalendarDays size={14}/> Starts {new Date(`${challenge.start_date}T00:00:00`).toLocaleDateString()}</span>}{challenge.end_date && <span><CalendarDays size={14}/> Ends {new Date(`${challenge.end_date}T00:00:00`).toLocaleDateString()}</span>}{challenge.application_deadline && <span><CalendarDays size={14}/> Application deadline {new Date(`${challenge.application_deadline}T00:00:00`).toLocaleDateString()}</span>}</div>
    </section>
    {existingProject ? <section className="workspace-card"><p className="eyebrow">YOUR WORKSPACE IS READY</p><h2>{existingProject.title}</h2><p>Continue planning, build your prototype, and document your testing.</p><Link href={`/projects/${existingProject.id}`} className="button">Open project workspace</Link></section> : soloMigrationMissing ? <section className="setup-callout"><div><strong>Project workspaces need the database update</strong><p>Apply <code>20261014200000_solo_projects_and_team_join.sql</code> in Supabase SQL Editor after the existing migrations, then reload this page to start solo or team work.</p></div></section> : <section className="workspace-card"><p className="eyebrow">CHOOSE YOUR WORK STYLE</p><h2>Start your solution</h2><p>You can begin on your own or create a team. You can add your GitHub repository now or later; a recorded walkthrough is supported in the project workspace.</p><div className="project-start-options"><details className="team-create" open><summary>Work solo</summary><form action={createSoloProject} className="inline-form"><input type="hidden" name="challenge_id" value={challengeId}/><label>Project title<input name="project_title" required minLength={3} maxLength={120} placeholder="A name for your solution"/></label><label>Project summary<textarea name="project_summary" rows={2} maxLength={1000} placeholder="What will you build or test?"/></label><label>GitHub repository (optional)<input name="repository_url" type="url" placeholder="https://github.com/you/project"/></label><button className="button" type="submit">Start solo project</button></form></details><details className="team-create"><summary>Create a team project</summary><form action={createTeamAndProject} className="inline-form"><input type="hidden" name="challenge_id" value={challengeId}/><label>Team name<input name="team_name" required minLength={3} maxLength={100}/></label><label>Team description<textarea name="team_description" rows={2} maxLength={1000}/></label><label>Project title<input name="project_title" required minLength={3} maxLength={120}/></label><label>Project summary<textarea name="project_summary" rows={2} maxLength={1000}/></label><label>GitHub repository (optional)<input name="repository_url" type="url" placeholder="https://github.com/team/project"/></label><button className="button" type="submit">Create team workspace</button></form></details></div></section>}
  </>;
}

function BriefList({ title, values }: { title: string; values: string[] | null }) {
  if (!values?.length) return null;
  return <div className="brief-text"><h3>{title}</h3><ul>{values.map((value, i) => <li key={`${i}-${value}`}>{value}</li>)}</ul></div>;
}
