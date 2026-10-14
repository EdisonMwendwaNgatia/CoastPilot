"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";
import { OTHER_OPTION } from "@/lib/onboarding-options";
import { createAdminClient } from "@/lib/supabase/admin";

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
  interests: z.array(z.string().trim().min(1).max(100)).max(20), interest_other: z.string().trim().max(500).optional(),
  skill_ids: z.array(z.string().uuid()).max(30), skill_other: z.string().trim().max(500).optional(),
  portfolio_url: z.union([z.literal(""), z.string().url()]), profile_visibility: z.enum(["public", "members", "private"]),
});

function val(form: FormData, key: string) { return String(form.get(key) ?? ""); }
function slugify(value: string) { return `${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90)}-${crypto.randomUUID().slice(0, 8)}`; }

async function requireYouthInnovator() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("platform_role,account_type").eq("id", user.id).maybeSingle();
  if (profile?.platform_role !== "youth" || (profile.account_type && profile.account_type !== "youth")) {
    redirect(profile?.account_type === "potential_partner" ? "/partnerships" : "/organizations?error=This%20workspace%20is%20not%20available%20for%20partner%20accounts");
  }
  return { supabase, user };
}

async function requireProblemContributor() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("platform_role,account_type").eq("id", user.id).maybeSingle();
  const isAdmin = profile?.platform_role === "admin";
  if (!isAdmin && (profile?.platform_role !== "youth" || !["youth", "partner"].includes(profile.account_type ?? ""))) {
    redirect(profile?.account_type === "potential_partner" ? "/partnerships" : "/auth/login");
  }
  return { supabase, user, accountType: profile?.account_type ?? "youth" };
}

async function getAdminModerationTarget(form: FormData) {
  const { supabase, user } = await requireUser();
  const { data: actor } = await supabase.from("profiles").select("platform_role").eq("id", user.id).single();
  if (actor?.platform_role !== "admin") redirect("/dashboard?error=Not%20authorized");
  const targetId = val(form, "target_user_id");
  if (!z.string().uuid().safeParse(targetId).success || targetId === user.id) redirect("/admin?tab=users&error=Invalid%20user%20selection");
  const { data: target } = await supabase.from("profiles").select("id,full_name,username,platform_role").eq("id", targetId).maybeSingle();
  if (!target || target.platform_role === "admin") redirect("/admin?tab=users&error=This%20account%20cannot%20be%20moderated");
  return { supabase, user, target };
}

const moderationReason = z.string().trim().min(5).max(1000);

async function recordUserModeration(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], target: { id: string; full_name: string | null; username?: string | null }, actorId: string, actionType: "warning" | "ban" | "unban" | "account_deleted", reason: string, metadata: Record<string, string> = {}) {
  return supabase.from("user_moderation_actions").insert({
    target_user_id: target.id,
    target_name: target.full_name || target.username || "CoastPilot member",
    actor_id: actorId,
    action_type: actionType,
    reason,
    metadata,
  });
}

export async function warnUser(form: FormData) {
  const { supabase, user, target } = await getAdminModerationTarget(form);
  const reason = moderationReason.safeParse(val(form, "reason"));
  if (!reason.success) redirect(`/admin?tab=users&userId=${target.id}&error=Add%20a%20clear%20warning%20message`);
  const { error } = await recordUserModeration(supabase, target, user.id, "warning", reason.data);
  if (error) redirect(`/admin?tab=users&userId=${target.id}&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin"); revalidatePath("/dashboard");
  redirect(`/admin?tab=users&userId=${target.id}&notice=Warning%20sent`);
}

export async function banUser(form: FormData) {
  const { supabase, user, target } = await getAdminModerationTarget(form);
  const reason = moderationReason.safeParse(val(form, "reason"));
  const duration = z.enum(["24h", "168h", "720h", "876000h"]).safeParse(val(form, "duration"));
  if (!reason.success || !duration.success) redirect(`/admin?tab=users&userId=${target.id}&error=Add%20a%20reason%20and%20valid%20ban%20duration`);
  const adminClient = createAdminClient();
  if (!adminClient) redirect(`/admin?tab=users&userId=${target.id}&error=Set%20SUPABASE_SERVICE_ROLE_KEY%20to%20enable%20account%20bans`);
  const { error: banError } = await adminClient.auth.admin.updateUserById(target.id, { ban_duration: duration.data });
  if (banError) redirect(`/admin?tab=users&userId=${target.id}&error=${encodeURIComponent(banError.message)}`);
  const { error } = await recordUserModeration(supabase, target, user.id, "ban", reason.data, { duration: duration.data });
  if (error) redirect(`/admin?tab=users&userId=${target.id}&error=Account%20was%20banned%20but%20the%20moderation%20record%20could%20not%20be%20saved`);
  revalidatePath("/admin");
  redirect(`/admin?tab=users&userId=${target.id}&notice=Account%20banned`);
}

export async function unbanUser(form: FormData) {
  const { supabase, user, target } = await getAdminModerationTarget(form);
  const reason = moderationReason.safeParse(val(form, "reason"));
  if (!reason.success) redirect(`/admin?tab=users&userId=${target.id}&error=Add%20a%20reason%20for%20lifting%20the%20ban`);
  const adminClient = createAdminClient();
  if (!adminClient) redirect(`/admin?tab=users&userId=${target.id}&error=Set%20SUPABASE_SERVICE_ROLE_KEY%20to%20enable%20account%20bans`);
  const { error: unbanError } = await adminClient.auth.admin.updateUserById(target.id, { ban_duration: "none" });
  if (unbanError) redirect(`/admin?tab=users&userId=${target.id}&error=${encodeURIComponent(unbanError.message)}`);
  const { error } = await recordUserModeration(supabase, target, user.id, "unban", reason.data);
  if (error) redirect(`/admin?tab=users&userId=${target.id}&error=Ban%20was%20lifted%20but%20the%20moderation%20record%20could%20not%20be%20saved`);
  revalidatePath("/admin");
  redirect(`/admin?tab=users&userId=${target.id}&notice=Ban%20lifted`);
}

export async function deleteUserAccount(form: FormData) {
  const { supabase, user, target } = await getAdminModerationTarget(form);
  const reason = moderationReason.safeParse(val(form, "reason"));
  if (!reason.success || val(form, "confirmation") !== "DELETE") redirect(`/admin?tab=users&userId=${target.id}&error=Confirm%20the%20deletion%20and%20include%20a%20reason`);
  const adminClient = createAdminClient();
  if (!adminClient) redirect(`/admin?tab=users&userId=${target.id}&error=Set%20SUPABASE_SERVICE_ROLE_KEY%20to%20enable%20account%20deletion`);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(target.id, true);
  if (deleteError) redirect(`/admin?tab=users&userId=${target.id}&error=${encodeURIComponent(deleteError.message)}`);
  const { error: redactError } = await adminClient.from("profiles").update({
    full_name: "Deleted member", username: null, avatar_url: null, headline: "", bio: "", county: null, town: null,
    interests: [], custom_skills: [], portfolio_url: null, profile_visibility: "private",
  }).eq("id", target.id);
  if (redactError) redirect(`/admin?tab=users&userId=${target.id}&error=Account%20disabled%20but%20profile%20redaction%20needs%20retry:%20${encodeURIComponent(redactError.message)}`);
  const { error } = await recordUserModeration(supabase, target, user.id, "account_deleted", reason.data);
  if (error) redirect(`/admin?tab=users&error=Account%20deleted%20but%20the%20audit%20record%20could%20not%20be%20saved`);
  revalidatePath("/admin"); revalidatePath("/dashboard");
  redirect("/admin?tab=users&notice=Account%20deleted%20and%20profile%20details%20redacted");
}

export async function saveProfile(form: FormData) {
  const { supabase, user } = await requireYouthInnovator();
  const rawSkillSelections = form.getAll("skill_ids");
  const hasOtherSkill = rawSkillSelections.includes(OTHER_OPTION);
  const parsed = profileSchema.safeParse({
    ...Object.fromEntries(form.entries()),
    interests: form.getAll("interests"),
    skill_ids: rawSkillSelections.filter((value) => value !== OTHER_OPTION),
  });
  if (!parsed.success) redirect("/onboarding?error=Please%20check%20the%20form%20fields");
  const d = parsed.data;
  const otherInterestValues = d.interests.includes(OTHER_OPTION) ? (d.interest_other ?? "").split(",").map((interest) => interest.trim()).filter(Boolean) : [];
  const customSkillValues = hasOtherSkill ? (d.skill_other ?? "").split(",").map((skill) => skill.trim()).filter(Boolean) : [];
  if (otherInterestValues.some((interest) => interest.length > 100) || d.interests.length - Number(d.interests.includes(OTHER_OPTION)) + otherInterestValues.length > 20) redirect("/onboarding?error=Please%20keep%20interests%20under%20100%20characters%20and%20choose%20up%20to%2020");
  if (customSkillValues.some((skill) => skill.length > 100) || customSkillValues.length > 20) redirect("/onboarding?error=Please%20keep%20each%20custom%20skill%20under%20100%20characters%20and%20add%20up%20to%2020");
  const interests = [...new Set([...d.interests.filter((interest) => interest !== OTHER_OPTION), ...otherInterestValues])];
  const customSkills = [...new Set(customSkillValues)];
  const { error } = await supabase.from("profiles").update({
    full_name: d.full_name, username: d.username, bio: d.bio, headline: d.headline,
    county: d.county || null, town: d.town || null, interests, custom_skills: customSkills,
    portfolio_url: d.portfolio_url || null, profile_visibility: d.profile_visibility,
  }).eq("id", user.id);
  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);

  const skillIds = [...new Set(d.skill_ids)];
  const { data: allowedSkills, error: skillLookupError } = skillIds.length
    ? await supabase.from("skills").select("id").in("id", skillIds)
    : { data: [], error: null };
  if (skillLookupError) redirect(`/onboarding?error=${encodeURIComponent(skillLookupError.message)}`);
  if ((allowedSkills ?? []).length !== skillIds.length) redirect("/onboarding?error=Please%20choose%20skills%20from%20the%20list");
  if (skillIds.length) {
    const { error: skillSaveError } = await supabase.from("profile_skills").upsert(skillIds.map((skill_id) => ({ profile_id: user.id, skill_id })), { onConflict: "profile_id,skill_id", ignoreDuplicates: true });
    if (skillSaveError) redirect(`/onboarding?error=${encodeURIComponent(skillSaveError.message)}`);
    const { error: skillRemoveError } = await supabase.from("profile_skills").delete().eq("profile_id", user.id).not("skill_id", "in", `(${skillIds.join(",")})`);
    if (skillRemoveError) redirect(`/onboarding?error=${encodeURIComponent(skillRemoveError.message)}`);
  } else {
    const { error: skillRemoveError } = await supabase.from("profile_skills").delete().eq("profile_id", user.id);
    if (skillRemoveError) redirect(`/onboarding?error=${encodeURIComponent(skillRemoveError.message)}`);
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function saveProblem(form: FormData) {
  const { supabase, user, accountType } = await requireProblemContributor();
  const parsed = problemSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) redirect("/problems/new?error=Please%20complete%20the%20required%20fields");
  const d = parsed.data;
  const { error } = await supabase.from("problems").insert({
    reporter_id: user.id, title: d.title, slug: slugify(d.title), description: d.description,
    category: d.category, county: d.county || null, town: d.town || null,
    proposed_beneficiaries: d.proposed_beneficiaries || null, existing_attempts: d.existing_attempts || null, status: d.status,
  });
  if (error) redirect(`/problems/new?error=${encodeURIComponent(error.message)}`);
  const destination = accountType === "partner" ? "/organizations" : "/dashboard";
  revalidatePath(destination);
  redirect(`${destination}?notice=Problem%20saved`);
}

export async function applyToChallenge(form: FormData) {
  const { supabase, user } = await requireYouthInnovator();
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
  objectives: z.string().max(1000).optional(),
  required_skills: z.string().max(500).optional(),
  deliverables: z.string().trim().min(10).max(1000),
  application_deadline: z.union([z.literal(""), z.iso.date()]).optional(),
  start_date: z.union([z.literal(""), z.iso.date()]).optional(),
  end_date: z.union([z.literal(""), z.iso.date()]).optional(),
  is_sponsored: z.enum(["true", "false"]).default("false"),
  sponsor_name: z.string().trim().max(120).optional(),
  prize_type: z.enum(["none", "cash", "tangible", "cash_and_tangible"]).default("none"),
  cash_prize_amount: z.string().default(""),
  cash_prize_currency: z.string().trim().regex(/^[A-Z]{3}$/).default("KES"),
  tangible_prizes: z.string().max(1500).optional(),
  prize_notes: z.string().trim().max(1000).optional(),
}).superRefine((fields, ctx) => {
  const amount = fields.cash_prize_amount.trim() === "" ? 0 : Number(fields.cash_prize_amount);
  const tangible = (fields.tangible_prizes ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
  if (!Number.isFinite(amount) || amount < 0) ctx.addIssue({ code: "custom", path: ["cash_prize_amount"], message: "Enter a valid non-negative prize amount" });
  if (fields.is_sponsored === "true" && !fields.sponsor_name?.trim()) ctx.addIssue({ code: "custom", path: ["sponsor_name"], message: "Add the sponsor name" });
  if (fields.prize_type === "none" && (amount !== 0 || tangible.length)) ctx.addIssue({ code: "custom", path: ["prize_type"], message: "Choose a prize type that matches the prize details" });
  if (fields.prize_type === "cash" && (!(amount > 0) || tangible.length)) ctx.addIssue({ code: "custom", path: ["prize_type"], message: "Cash prizes need an amount and no tangible prizes" });
  if (fields.prize_type === "tangible" && (amount !== 0 || !tangible.length)) ctx.addIssue({ code: "custom", path: ["prize_type"], message: "List at least one tangible prize and no cash amount" });
  if (fields.prize_type === "cash_and_tangible" && (!(amount > 0) || !tangible.length)) ctx.addIssue({ code: "custom", path: ["prize_type"], message: "Add both a cash amount and a tangible prize" });
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
    objectives: (fields.objectives ?? problem.title).split("\n").map((item: string) => item.trim()).filter(Boolean),
    eligibility: fields.eligibility,
    required_skills: (fields.required_skills ?? "").split(",").map((skill) => skill.trim()).filter(Boolean),
    deliverables: fields.deliverables.split("\n").map((item) => item.trim()).filter(Boolean),
    is_sponsored: fields.is_sponsored === "true",
    sponsor_name: fields.is_sponsored === "true" ? fields.sponsor_name?.trim() || null : null,
    prize_type: fields.prize_type,
    cash_prize_amount: fields.cash_prize_amount.trim() === "" ? 0 : Number(fields.cash_prize_amount),
    cash_prize_currency: fields.cash_prize_currency,
    tangible_prizes: (fields.tangible_prizes ?? "").split("\n").map((item) => item.trim()).filter(Boolean),
    prize_notes: fields.prize_notes?.trim() || null,
    application_deadline: fields.application_deadline || null,
    start_date: fields.start_date || null,
    end_date: fields.end_date || null,
    status: "draft",
  }).select("id").single();
  if (error || !challenge) redirect(`/admin?error=${encodeURIComponent(error?.message ?? "Could not create challenge")}`);
  await supabase.from("problems").update({ status: "converted_to_challenge", reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", problem.id);
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
  const { supabase, user } = await requireUser();
  const id = val(form, "notification_id");
  if (z.string().uuid().safeParse(id).success) await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/dashboard"); revalidatePath(user ? "/admin" : "/dashboard");
}

const partnershipProposalSchema = z.object({
  contact_name: z.string().trim().min(2).max(120),
  contact_email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  organization_name: z.string().trim().min(2).max(180),
  organization_type: z.string().trim().min(2).max(80),
  website: z.union([z.literal(""), z.string().url().max(300).refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "Use an http or https website URL")]),
  county: z.string().trim().max(100),
  interests: z.array(z.string().trim().min(1).max(100)).max(8),
  challenge_idea: z.string().trim().max(1000),
  proposed_support: z.string().trim().max(1000),
  details: z.string().trim().min(30).max(5000),
});

export async function submitPartnershipProposal(form: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = partnershipProposalSchema.safeParse({
    ...Object.fromEntries(form.entries()),
    interests: form.getAll("interests"),
  });
  if (!parsed.success) redirect("/partnerships?error=Please%20complete%20the%20required%20proposal%20details");
  if (!user.email) redirect("/partnerships?error=Your%20account%20needs%20a%20verified%20email%20address%20to%20submit%20a%20proposal");
  const { data: profile } = await supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle();
  if (profile?.account_type === "youth") {
    const { error: profileError } = await supabase.from("profiles").update({ account_type: "potential_partner" }).eq("id", user.id);
    if (profileError) redirect(`/partnerships?error=${encodeURIComponent(profileError.message)}`);
  }
  const { error } = await supabase.from("partnership_proposals").insert({
    ...parsed.data,
    website: parsed.data.website || null,
    submitted_by: user.id,
    contact_email: user.email.toLowerCase(),
  });
  if (error) redirect(`/partnerships?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin");
  redirect("/partnerships?notice=Your%20partnership%20proposal%20has%20been%20sent%20for%20review");
}

async function requirePlatformAdmin() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("platform_role").eq("id", user.id).single();
  if (profile?.platform_role !== "admin") redirect("/dashboard?error=Not%20authorized");
  return { supabase, user };
}

async function findAuthUserByEmail(admin: NonNullable<ReturnType<typeof createAdminClient>>, email: string) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 });
    if (error) throw new Error(error.message);
    const match = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 500) return null;
  }
  throw new Error("Could not safely check whether this email already has a CoastPilot account.");
}

export async function reviewPartnershipProposal(form: FormData) {
  const { user } = await requirePlatformAdmin();
  const id = val(form, "proposal_id");
  const decision = z.enum(["approved", "declined"]).safeParse(val(form, "decision"));
  if (!z.string().uuid().safeParse(id).success || !decision.success) redirect("/admin?tab=partners&error=Invalid%20partnership%20review");
  const admin = createAdminClient();
  if (!admin) redirect("/admin?tab=partners&error=Add%20SUPABASE_SERVICE_ROLE_KEY%20to%20approve%20partners%20and%20send%20invites");
  const { data: proposal } = await admin.from("partnership_proposals").select("*").eq("id", id).in("status", ["submitted", "in_review"]).maybeSingle();
  if (!proposal) redirect("/admin?tab=partners&error=Proposal%20not%20found%20or%20already%20reviewed");
  if (decision.data === "declined") {
    const { error } = await admin.from("partnership_proposals").update({ status: "declined", reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) redirect(`/admin?tab=partners&error=${encodeURIComponent(error.message)}`);
    revalidatePath("/admin");
    redirect("/admin?tab=partners&notice=Partnership%20proposal%20declined");
  }

  let inviteCreatedUserId: string | null = null;
  let organizationId: string | null = null;
  try {
    const existingUser = await findAuthUserByEmail(admin, proposal.contact_email);
    let partnerUser = existingUser;
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
    const redirectTo = `${siteUrl}/auth/confirm?next=%2Forganizations`;
    if (!partnerUser) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(proposal.contact_email, {
        redirectTo,
        data: { full_name: proposal.contact_name, organization_name: proposal.organization_name },
      });
      if (error || !data.user) throw new Error(error?.message || "Could not send a partner invitation.");
      partnerUser = data.user;
      inviteCreatedUserId = data.user.id;
    } else {
      const { error } = await admin.auth.signInWithOtp({
        email: proposal.contact_email,
        options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
      });
      if (error) throw new Error(`Could not email the approved partner: ${error.message}`);
    }

    const { data: organization, error: organizationError } = await admin.from("organizations").insert({
      name: proposal.organization_name,
      slug: slugify(proposal.organization_name),
      description: proposal.details,
      organization_type: proposal.organization_type,
      website: proposal.website,
      contact_email: proposal.contact_email,
      verification_status: "verified",
    }).select("id").single();
    if (organizationError || !organization) throw new Error(organizationError?.message || "Could not create the approved organization workspace.");
    organizationId = organization.id;
    const { error: memberError } = await admin.from("organization_members").insert({ organization_id: organization.id, user_id: partnerUser.id, membership_role: "owner" });
    if (memberError) throw new Error(memberError.message);
    const { error: accountTypeError } = await admin.from("profiles").update({ account_type: "partner" }).eq("id", partnerUser.id);
    if (accountTypeError) throw new Error(accountTypeError.message);
    const { error: proposalError } = await admin.from("partnership_proposals").update({
      status: "approved", organization_id: organization.id, reviewed_by: user.id,
      reviewed_at: new Date().toISOString(), invitation_sent_at: new Date().toISOString(),
    }).eq("id", id);
    if (proposalError) throw new Error(proposalError.message);
  } catch (error) {
    if (organizationId) await admin.from("organizations").delete().eq("id", organizationId);
    if (inviteCreatedUserId) await admin.auth.admin.deleteUser(inviteCreatedUserId);
    redirect(`/admin?tab=partners&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not approve the partnership proposal")}`);
  }
  revalidatePath("/admin");
  revalidatePath("/organizations");
  redirect("/admin?tab=partners&notice=Partner%20approved.%20An%20organization%20invitation%20email%20was%20sent.");
}

async function requireVerifiedOrganizationManager(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], organizationId: string, userId: string) {
  if (!z.string().uuid().safeParse(organizationId).success) return false;
  const [{ data: organization }, { data: membership }, { data: profile }] = await Promise.all([
    supabase.from("organizations").select("id").eq("id", organizationId).eq("verification_status", "verified").maybeSingle(),
    supabase.from("organization_members").select("membership_role").eq("organization_id", organizationId).eq("user_id", userId).in("membership_role", ["owner", "manager"]).maybeSingle(),
    supabase.from("profiles").select("account_type").eq("id", userId).maybeSingle(),
  ]);
  return Boolean(organization && membership && profile?.account_type === "partner");
}

export async function requestChallengeSponsorship(form: FormData) {
  const { supabase, user } = await requireUser();
  const organizationId = val(form, "organization_id");
  const challengeId = val(form, "challenge_id");
  if (!(await requireVerifiedOrganizationManager(supabase, organizationId, user.id))) redirect("/organizations?error=Verified%20organization%20manager%20access%20is%20required");
  const parsed = z.object({ sponsor_name: z.string().trim().min(2).max(120), support_details: z.string().trim().min(20).max(3000), proposed_cash_support: z.union([z.literal(""), z.coerce.number().min(0).max(100000000)]), currency: z.string().regex(/^[A-Z]{3}$/), tangible_support: z.string().max(1500) }).safeParse(Object.fromEntries(form.entries()));
  if (!z.string().uuid().safeParse(challengeId).success || !parsed.success) redirect("/organizations?error=Please%20check%20the%20sponsorship%20proposal");
  const { data: challenge } = await supabase.from("challenges").select("id").eq("id", challengeId).in("status", ["published", "in_progress"]).maybeSingle();
  if (!challenge) redirect("/organizations?error=Only%20published%20or%20ongoing%20challenges%20can%20receive%20sponsorship");
  const { error } = await supabase.from("challenge_sponsorship_requests").insert({
    challenge_id: challengeId, organization_id: organizationId, sponsor_name: parsed.data.sponsor_name,
    support_details: parsed.data.support_details, proposed_cash_support: parsed.data.proposed_cash_support === "" ? null : parsed.data.proposed_cash_support,
    currency: parsed.data.currency, proposed_tangible_support: parsed.data.tangible_support.split("\n").map((x) => x.trim()).filter(Boolean),
  });
  if (error) redirect(`/organizations?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/organizations"); revalidatePath("/admin");
  redirect("/organizations?notice=Sponsorship%20proposal%20sent%20for%20admin%20review");
}

export async function reviewChallengeSponsorship(form: FormData) {
  const { supabase, user } = await requirePlatformAdmin();
  const id = val(form, "request_id");
  const decision = z.enum(["approved", "declined"]).safeParse(val(form, "decision"));
  if (!z.string().uuid().safeParse(id).success || !decision.success) redirect("/admin?tab=partners&error=Invalid%20sponsorship%20review");
  const { data: request } = await supabase.from("challenge_sponsorship_requests").select("id,challenge_id,sponsor_name,status").eq("id", id).eq("status", "pending").maybeSingle();
  if (!request) redirect("/admin?tab=partners&error=Sponsorship%20request%20not%20found%20or%20already%20reviewed");
  if (decision.data === "approved") {
    const { error: challengeError } = await supabase.from("challenges").update({ is_sponsored: true, sponsor_name: request.sponsor_name }).eq("id", request.challenge_id);
    if (challengeError) redirect(`/admin?tab=partners&error=${encodeURIComponent(challengeError.message)}`);
  }
  const { error } = await supabase.from("challenge_sponsorship_requests").update({ status: decision.data, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/admin?tab=partners&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin"); revalidatePath("/organizations"); revalidatePath("/challenges"); revalidatePath("/");
  redirect(`/admin?tab=partners&notice=Sponsorship%20request%20${decision.data}`);
}

export async function addProjectUpdate(form: FormData) {
  const { supabase, user } = await requireYouthInnovator();
  const projectId = val(form, "project_id"); const content = z.string().trim().min(10).max(2000).safeParse(val(form, "content"));
  if (!z.string().uuid().safeParse(projectId).success || !content.success) redirect("/projects?error=Please%20write%20a%20short%20update");
  const { error } = await supabase.from("project_updates").insert({ project_id: projectId, author_id: user.id, content: content.data, visibility: "team" });
  if (error) redirect(`/projects/${projectId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/projects/${projectId}`); redirect(`/projects/${projectId}?notice=Update%20posted`);
}

export async function addImpactMetric(form: FormData) {
  const { supabase, user } = await requireYouthInnovator();
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
  if (profile?.platform_role === "admin") {
    revalidatePath("/admin");
    redirect("/admin?tab=challenges&notice=Application%20review%20saved");
  }
  revalidatePath("/dashboard"); redirect("/dashboard?notice=Application%20review%20saved");
}

async function getAcceptedChallenge(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], challengeId: string, userId: string) {
  if (!z.string().uuid().safeParse(challengeId).success) return null;
  const [{ data: application }, { data: challenge }] = await Promise.all([
    supabase.from("challenge_applications").select("id").eq("challenge_id", challengeId).eq("applicant_id", userId).eq("status", "accepted").maybeSingle(),
    supabase.from("challenges").select("id,title,status").eq("id", challengeId).maybeSingle(),
  ]);
  return application && challenge && ["published", "in_progress"].includes(challenge.status) ? challenge : null;
}

function parseGithubUrl(value: string) {
  if (!value.trim()) return { success: true as const, data: null };
  const parsed = z.string().url().safeParse(value.trim());
  if (!parsed.success) return { success: false as const };
  try {
    const url = new URL(parsed.data);
    return url.protocol === "https:" && url.hostname === "github.com" && url.pathname.split("/").filter(Boolean).length >= 2
      ? { success: true as const, data: url.toString() }
      : { success: false as const };
  } catch { return { success: false as const }; }
}

export async function saveProjectRepository(form: FormData) {
  const { supabase } = await requireYouthInnovator();
  const projectId = val(form, "project_id");
  const repo = parseGithubUrl(val(form, "repository_url"));
  if (!z.string().uuid().safeParse(projectId).success || !repo.success) redirect(`/projects/${projectId}?error=Enter%20a%20valid%20GitHub%20repository%20URL`);
  const { error } = await supabase.from("projects").update({ repository_url: repo.data }).eq("id", projectId);
  if (error) redirect(`/projects/${projectId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?notice=GitHub%20repository%20saved`);
}

export async function registerProjectVideoEvidence(input: { projectId: string; filePath: string; title: string }) {
  const { supabase, user } = await requireYouthInnovator();
  const projectId = z.string().uuid().safeParse(input.projectId);
  const title = z.string().trim().min(3).max(120).safeParse(input.title);
  const filePath = z.string().max(300).safeParse(input.filePath);
  if (!projectId.success || !title.success || !filePath.success || !input.filePath.startsWith(`${input.projectId}/`) || !/\.(mp4|webm|mov)$/i.test(input.filePath)) {
    return { error: "Invalid video details. Choose an MP4, WebM, or MOV file and a short title." };
  }
  const { data: signed, error: storageError } = await supabase.storage.from("project-evidence").createSignedUrl(input.filePath, 60);
  if (storageError || !signed) return { error: "The video upload could not be verified. Please upload it again." };
  const { error } = await supabase.from("project_evidence").insert({
    project_id: input.projectId, uploaded_by: user.id, title: title.data, file_path: input.filePath,
    evidence_type: "video", visibility: "team",
  });
  if (error) {
    await supabase.storage.from("project-evidence").remove([input.filePath]);
    return { error: error.message };
  }
  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}

async function addStarterMilestones(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], projectId: string) {
  await supabase.from("project_milestones").insert([
    { project_id: projectId, title: "Define MVP plan", sort_order: 1 },
    { project_id: projectId, title: "Build first prototype", sort_order: 2 },
    { project_id: projectId, title: "Test with community users", sort_order: 3 },
    { project_id: projectId, title: "Document results and next steps", sort_order: 4 },
  ]);
}

export async function createSoloProject(form: FormData) {
  const { supabase, user } = await requireYouthInnovator();
  const challengeId = val(form, "challenge_id");
  const title = z.string().trim().min(3).max(120).safeParse(val(form, "project_title"));
  const summary = z.string().trim().max(1000).safeParse(val(form, "project_summary"));
  const repository = parseGithubUrl(val(form, "repository_url"));
  if (!title.success || !summary.success || !repository.success) redirect("/projects?error=Add%20a%20project%20title%20and%20check%20the%20GitHub%20URL");
  const challenge = await getAcceptedChallenge(supabase, challengeId, user.id);
  if (!challenge) redirect("/dashboard?error=An%20accepted%20application%20to%20an%20open%20challenge%20is%20required");
  const { data: existing } = await supabase.from("projects").select("id").eq("created_by", user.id).eq("challenge_id", challengeId).maybeSingle();
  if (existing) redirect(`/projects/${existing.id}`);
  const { data: project, error } = await supabase.from("projects").insert({
    challenge_id: challengeId, team_id: null, created_by: user.id, title: title.data,
    slug: slugify(title.data), summary: summary.data, problem_statement: challenge.title, repository_url: repository.data, visibility: "team",
  }).select("id").single();
  if (error || !project) redirect(`/dashboard?error=${encodeURIComponent(error?.message ?? "Could not create project")}`);
  await addStarterMilestones(supabase, project.id);
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function createTeamAndProject(form: FormData) {
  const { supabase, user } = await requireYouthInnovator();
  const challengeId = val(form, "challenge_id");
  const name = z.string().trim().min(3).max(100).safeParse(val(form, "team_name"));
  const title = z.string().trim().min(3).max(120).safeParse(val(form, "project_title"));
  const summary = z.string().trim().max(1000).safeParse(val(form, "project_summary"));
  const repository = parseGithubUrl(val(form, "repository_url"));
  if (!name.success || !title.success || !summary.success || !repository.success) redirect("/projects?error=Complete%20the%20team%20and%20project%20fields%20and%20check%20the%20GitHub%20URL");
  const challenge = await getAcceptedChallenge(supabase, challengeId, user.id);
  if (!challenge) redirect("/dashboard?error=An%20accepted%20application%20to%20an%20open%20challenge%20is%20required");
  const { data: existing } = await supabase.from("projects").select("id").eq("created_by", user.id).eq("challenge_id", challengeId).maybeSingle();
  if (existing) redirect(`/projects/${existing.id}`);
  const { data: team, error: teamError } = await supabase.from("teams").insert({
    challenge_id: challengeId, name: name.data, created_by: user.id, description: val(form, "team_description"),
  }).select("id").single();
  if (teamError || !team) redirect(`/dashboard?error=${encodeURIComponent(teamError?.message ?? "Could not create team")}`);
  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: team.id, user_id: user.id, team_role: "lead", membership_status: "active", joined_at: new Date().toISOString(),
  });
  if (memberError) redirect(`/dashboard?error=${encodeURIComponent(memberError.message)}`);
  const { data: project, error: projectError } = await supabase.from("projects").insert({
    challenge_id: challengeId, team_id: team.id, created_by: user.id, title: title.data,
    slug: slugify(title.data), summary: summary.data, problem_statement: challenge.title, repository_url: repository.data, visibility: "team",
  }).select("id").single();
  if (projectError || !project) redirect(`/dashboard?error=${encodeURIComponent(projectError?.message ?? "Could not create project")}`);
  await addStarterMilestones(supabase, project.id);
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function joinTeamFromInvite(form: FormData) {
  const { supabase, user } = await requireYouthInnovator();
  const teamId = val(form, "team_id");
  if (!z.string().uuid().safeParse(teamId).success) redirect("/dashboard?error=Invalid%20team%20invitation");
  const { data: team } = await supabase.from("teams").select("id,challenge_id").eq("id", teamId).maybeSingle();
  if (!team) redirect("/dashboard?error=Team%20not%20found");
  const { data: challenge } = await supabase.from("challenges").select("status").eq("id", team.challenge_id).maybeSingle();
  if (!challenge || !["published", "in_progress"].includes(challenge.status)) redirect(`/teams/${teamId}/join?error=This%20challenge%20is%20not%20accepting%20team%20members`);
  const { data: application } = await supabase.from("challenge_applications").select("id").eq("challenge_id", team.challenge_id).eq("applicant_id", user.id).eq("status", "accepted").maybeSingle();
  if (!application) redirect(`/teams/${teamId}/join?error=You%20need%20an%20accepted%20application%20to%20this%20challenge%20to%20join`);
  const { data: memberships } = await supabase.from("team_members").select("team_id,membership_status,teams(challenge_id)").eq("user_id", user.id).in("membership_status", ["active", "invited", "pending"]);
  const existingMembership = memberships?.find((membership) => (membership.teams as unknown as { challenge_id?: string } | null)?.challenge_id === team.challenge_id);
  if (existingMembership?.team_id === teamId) {
    const { data: project } = await supabase.from("projects").select("id").eq("team_id", teamId).maybeSingle();
    if (project?.id) redirect(`/projects/${project.id}`);
    redirect("/dashboard?notice=You%20are%20already%20on%20this%20team");
  }
  if (existingMembership) redirect(`/teams/${teamId}/join?error=You%20already%20have%20a%20team%20for%20this%20challenge`);
  const { error } = await supabase.from("team_members").insert({ team_id: teamId, user_id: user.id, team_role: "member", membership_status: "active", joined_at: new Date().toISOString() });
  if (error) redirect(`/teams/${teamId}/join?error=${encodeURIComponent(error.message)}`);
  const { data: project } = await supabase.from("projects").select("id").eq("team_id", teamId).maybeSingle();
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  if (project?.id) redirect(`/projects/${project.id}?notice=You%20joined%20the%20team`);
  redirect("/dashboard?notice=You%20joined%20the%20team");
}
