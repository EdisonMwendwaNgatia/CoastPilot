"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";

const problemSchema = z.object({
  title: z.string().trim().min(8).max(120),
  description: z.string().trim().min(30).max(5000),
  category: z.string().min(2).max(80),
  county: z.string().trim().max(100).optional(),
  town: z.string().trim().max(100).optional(),
  proposed_beneficiaries: z.string().trim().max(1000).optional(),
  existing_attempts: z.string().trim().max(2000).optional(),
  status: z.enum(["draft", "submitted"]),
});

const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(100), username: z.string().trim().regex(/^[a-zA-Z0-9_]{3,30}$/),
  bio: z.string().trim().max(500), headline: z.string().trim().max(120), county: z.string().trim().max(100), town: z.string().trim().max(100),
  interests: z.string().trim().max(500), portfolio_url: z.union([z.literal(""), z.string().url()]), profile_visibility: z.enum(["public", "members", "private"]),
});

function val(form: FormData, key: string) { return String(form.get(key) ?? ""); }
function slugify(value: string) { return `${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90)}-${crypto.randomUUID().slice(0, 8)}`; }

export async function saveProfile(form: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) redirect("/onboarding?error=Please%20check%20the%20form%20fields");
  const d = parsed.data;
  const { error } = await supabase.from("profiles").update({
    full_name: d.full_name, username: d.username, bio: d.bio, headline: d.headline,
    county: d.county || null, town: d.town || null, interests: d.interests.split(",").map((x) => x.trim()).filter(Boolean),
    portfolio_url: d.portfolio_url || null, profile_visibility: d.profile_visibility,
  }).eq("id", user.id);
  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function saveProblem(form: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = problemSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) redirect("/problems/new?error=Please%20complete%20the%20required%20fields");
  const d = parsed.data;
  const { error } = await supabase.from("problems").insert({
    reporter_id: user.id, title: d.title, slug: slugify(d.title), description: d.description,
    category: d.category, county: d.county || null, town: d.town || null,
    proposed_beneficiaries: d.proposed_beneficiaries || null, existing_attempts: d.existing_attempts || null, status: d.status,
  });
  if (error) redirect(`/problems/new?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  redirect("/dashboard?notice=Problem%20saved");
}

export async function applyToChallenge(form: FormData) {
  const { supabase, user } = await requireUser();
  const challengeId = val(form, "challenge_id");
  const motivation = z.string().trim().min(20).max(1500).safeParse(val(form, "motivation"));
  if (!z.string().uuid().safeParse(challengeId).success || !motivation.success) redirect("/challenges?error=Please%20include%20a%20short%20motivation");
  const { error } = await supabase.from("challenge_applications").insert({ challenge_id: challengeId, applicant_id: user.id, motivation: motivation.data });
  if (error) redirect(`/challenges?error=${encodeURIComponent(error.code === "23505" ? "You already applied to this challenge" : error.message)}`);
  revalidatePath("/dashboard");
  redirect("/dashboard?notice=Application%20submitted");
}

export async function moderateProblem(form: FormData) {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("platform_role").eq("id", user.id).single();
  if (profile?.platform_role !== "admin") redirect("/dashboard?error=Not%20authorized");
  const id = val(form, "problem_id");
  const status = z.enum(["under_review", "needs_changes", "approved", "rejected"]).safeParse(val(form, "status"));
  if (!z.string().uuid().safeParse(id).success || !status.success) redirect("/admin?error=Invalid%20review");
  const { error } = await supabase.from("problems").update({ status: status.data, moderation_notes: val(form, "moderation_notes") || null, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin"); revalidatePath("/dashboard");
  redirect("/admin?notice=Review%20saved");
}

const challengeSchema = z.object({
  problem_id: z.string().uuid(),
  title: z.string().trim().min(8).max(120),
  summary: z.string().trim().min(20).max(300),
  description: z.string().trim().min(30).max(5000),
  eligibility: z.string().trim().min(10).max(1000),
  required_skills: z.string().max(500).optional(),
  deliverables: z.string().trim().min(10).max(1000),
  application_deadline: z.union([z.literal(""), z.iso.date()]).optional(),
});

export async function createChallengeFromProblem(form: FormData) {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("platform_role").eq("id", user.id).single();
  if (profile?.platform_role !== "admin") redirect("/dashboard?error=Not%20authorized");

  const parsed = challengeSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) redirect("/admin?error=Please%20complete%20the%20challenge%20details");
  const fields = parsed.data;
  const { data: problem } = await supabase.from("problems").select("id,title,description,category,reporter_id,status").eq("id", fields.problem_id).eq("status", "approved").maybeSingle();
  if (!problem) redirect("/admin?error=Only%20approved%20problems%20can%20become%20challenges");

  const { data: existing } = await supabase.from("challenges").select("id").eq("problem_id", problem.id).maybeSingle();
  if (existing) redirect("/admin?error=This%20problem%20already%20has%20a%20challenge");

  const { data: challenge, error } = await supabase.from("challenges").insert({
    problem_id: problem.id,
    created_by: user.id,
    title: fields.title,
    slug: slugify(fields.title),
    summary: fields.summary,
    description: fields.description,
    objectives: [problem.title],
    eligibility: fields.eligibility,
    required_skills: (fields.required_skills ?? "").split(",").map((skill) => skill.trim()).filter(Boolean),
    deliverables: fields.deliverables.split("\n").map((item) => item.trim()).filter(Boolean),
    application_deadline: fields.application_deadline || null,
    status: "draft",
  }).select("id").single();
  if (error || !challenge) redirect(`/admin?error=${encodeURIComponent(error?.message ?? "Could not create challenge")}`);
  revalidatePath("/admin");
  redirect(`/admin?notice=Challenge%20draft%20created`);
}

export async function publishChallenge(form: FormData) {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("platform_role").eq("id", user.id).single();
  if (profile?.platform_role !== "admin") redirect("/dashboard?error=Not%20authorized");
  const id = val(form, "challenge_id");
  if (!z.string().uuid().safeParse(id).success) redirect("/admin?error=Invalid%20challenge");

  const { data: challenge } = await supabase.from("challenges").select("id,title,problem_id,status").eq("id", id).eq("status", "draft").maybeSingle();
  if (!challenge) redirect("/admin?error=Challenge%20draft%20not%20found");
  const { error } = await supabase.from("challenges").update({ status: "published", published_at: new Date().toISOString() }).eq("id", challenge.id);
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin"); revalidatePath("/challenges"); revalidatePath("/");
  redirect("/admin?notice=Challenge%20published");
}

export async function markNotificationRead(form: FormData) {
  const { supabase } = await requireUser();
  const id = val(form, "notification_id");
  if (z.string().uuid().safeParse(id).success) await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/dashboard");
}

export async function requestPilot(form: FormData) {
  const { supabase, user } = await requireUser();
  const projectId = val(form, "project_id"); const orgId = val(form, "organization_id");
  const scope = z.string().trim().min(30).max(3000).safeParse(val(form, "scope"));
  if (!z.string().uuid().safeParse(projectId).success || !z.string().uuid().safeParse(orgId).success || !scope.success) redirect("/organizations?error=Please%20check%20the%20request%20details");
  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("organization_id", orgId).eq("user_id", user.id).maybeSingle();
  if (!membership) redirect("/organizations?error=You%20are%20not%20a%20member%20of%20that%20organization");
  const { error } = await supabase.from("pilot_proposals").insert({ project_id: projectId, organization_id: orgId, submitted_by: user.id, scope: scope.data, status: "proposal_requested" });
  if (error) redirect(`/organizations?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/organizations");
  redirect("/organizations?notice=Pilot%20proposal%20requested");
}

export async function addProjectUpdate(form: FormData) {
  const { supabase, user } = await requireUser();
  const projectId = val(form, "project_id"); const content = z.string().trim().min(10).max(2000).safeParse(val(form, "content"));
  if (!z.string().uuid().safeParse(projectId).success || !content.success) redirect("/projects?error=Please%20write%20a%20short%20update");
  const { error } = await supabase.from("project_updates").insert({ project_id: projectId, author_id: user.id, content: content.data, visibility: "team" });
  if (error) redirect(`/projects/${projectId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/projects/${projectId}`); redirect(`/projects/${projectId}?notice=Update%20posted`);
}

export async function addImpactMetric(form: FormData) {
  const { supabase, user } = await requireUser();
  const projectId = val(form, "project_id");
  const metricName = z.string().trim().min(3).max(100).safeParse(val(form, "metric_name"));
  const value = val(form, "measured_value");
  const measured = value === "" ? null : Number(value);
  if (!z.string().uuid().safeParse(projectId).success || !metricName.success || (measured !== null && (!Number.isFinite(measured) || measured < 0))) redirect(`/projects/${projectId}?error=Please%20check%20the%20impact%20measure`);
  const { error } = await supabase.from("impact_metrics").insert({ project_id: projectId, created_by: user.id, metric_name: metricName.data, measured_value: measured, unit: val(form, "unit") || null, description: val(form, "description"), verification_status: "self_reported" });
  if (error) redirect(`/projects/${projectId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/projects/${projectId}`); redirect(`/projects/${projectId}?notice=Impact%20measure%20saved`);
}

export async function reviewApplication(form: FormData) {
  const { supabase, user } = await requireUser();
  const id = val(form, "application_id"); const status = z.enum(["accepted", "rejected"]).safeParse(val(form, "status"));
  if (!z.string().uuid().safeParse(id).success || !status.success) redirect("/dashboard?error=Invalid%20application");
  const { data: application } = await supabase.from("challenge_applications").select("id,challenge_id,applicant_id,status,challenges(created_by,organization_id)").eq("id", id).maybeSingle();
  if (!application) redirect("/dashboard?error=Application%20not%20found");
  const challenge = application.challenges as unknown as {created_by:string;organization_id:string|null};
  const { data: profile } = await supabase.from("profiles").select("platform_role").eq("id", user.id).single();
  const isCreator = challenge.created_by === user.id;
  const { data: membership } = challenge.organization_id ? await supabase.from("organization_members").select("membership_role").eq("organization_id", challenge.organization_id).eq("user_id", user.id).maybeSingle() : { data: null };
  if (!isCreator && profile?.platform_role !== "admin" && !membership) redirect("/dashboard?error=Not%20authorized%20to%20review");
  const { error } = await supabase.from("challenge_applications").update({ status: status.data, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard"); redirect("/dashboard?notice=Application%20review%20saved");
}

export async function createTeamAndProject(form: FormData) {
  const { supabase, user } = await requireUser();
  const challengeId=val(form,"challenge_id"); const name=z.string().trim().min(3).max(100).safeParse(val(form,"team_name"));
  const title=z.string().trim().min(3).max(120).safeParse(val(form,"project_title"));
  if(!z.string().uuid().safeParse(challengeId).success||!name.success||!title.success) redirect("/dashboard?error=Complete%20the%20team%20and%20project%20fields");
  const {data:app}=await supabase.from("challenge_applications").select("id").eq("challenge_id",challengeId).eq("applicant_id",user.id).eq("status","accepted").maybeSingle();
  if(!app)redirect("/dashboard?error=An%20accepted%20application%20is%20required");
  const {data:challenge}=await supabase.from("challenges").select("id,title,problem_id,status").eq("id",challengeId).maybeSingle();
  if(!challenge||challenge.status!=="published")redirect("/dashboard?error=Challenge%20is%20not%20open");
  const {data:team,error:teamError}=await supabase.from("teams").insert({challenge_id:challengeId,name:name.data,created_by:user.id,description:val(form,"team_description")}).select("id").single();
  if(teamError||!team)redirect(`/dashboard?error=${encodeURIComponent(teamError?.message??"Could not create team")}`);
  const {error:memberError}=await supabase.from("team_members").insert({team_id:team.id,user_id:user.id,team_role:"lead",membership_status:"active",joined_at:new Date().toISOString()});
  if(memberError)redirect(`/dashboard?error=${encodeURIComponent(memberError.message)}`);
  const {data:project,error:projectError}=await supabase.from("projects").insert({challenge_id:challengeId,team_id:team.id,title:title.data,slug:slugify(title.data),summary:val(form,"project_summary"),problem_statement:challenge.title,visibility:"team"}).select("id").single();
  if(projectError||!project)redirect(`/dashboard?error=${encodeURIComponent(projectError?.message??"Could not create project")}`);
  await supabase.from("project_milestones").insert([{project_id:project.id,title:"Define MVP plan",sort_order:1},{project_id:project.id,title:"Build first prototype",sort_order:2},{project_id:project.id,title:"Test with community users",sort_order:3},{project_id:project.id,title:"Document results and next steps",sort_order:4}]);
  revalidatePath("/projects");redirect(`/projects/${project.id}`);
}
