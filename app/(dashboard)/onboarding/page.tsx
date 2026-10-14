import { saveProfile } from "@/app/actions";
import { OnboardingSelect } from "@/components/onboarding-select";
import { INTEREST_OPTIONS, OTHER_OPTION } from "@/lib/onboarding-options";
import { requireUser } from "@/lib/auth/current-user";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data: skills }, { data: profileSkills }, params] = await Promise.all([
    supabase.from("profiles").select("full_name,username,bio,headline,county,town,interests,custom_skills,portfolio_url,profile_visibility").eq("id", user.id).single(),
    supabase.from("skills").select("id,name,category").order("category").order("name"),
    supabase.from("profile_skills").select("skill_id").eq("profile_id", user.id),
    searchParams,
  ]);
  const p = profile as Record<string, unknown> | null;
  const savedInterests = Array.isArray(p?.interests) ? p.interests.filter((item): item is string => typeof item === "string") : [];
  const knownInterests = savedInterests.filter((interest) => (INTEREST_OPTIONS as readonly string[]).includes(interest));
  const otherInterests = savedInterests.filter((interest) => !(INTEREST_OPTIONS as readonly string[]).includes(interest));
  const interestSelections = [...knownInterests, ...(otherInterests.length ? [OTHER_OPTION] : [])];
  const customSkills = Array.isArray(p?.custom_skills) ? p.custom_skills.filter((item): item is string => typeof item === "string") : [];

  return <section className="form-panel onboarding-panel">
    <p className="eyebrow">INNOVATOR PROFILE</p>
    <h1>Tell us a little about you.</h1>
    <p className="form-intro">Keep it practical. Your profile helps other innovators find teammates with useful skills and interests.</p>
    {params.error && <p className="form-error">{params.error}</p>}
    <form action={saveProfile} className="form-grid">
      <label>Full name<input name="full_name" required maxLength={100} defaultValue={String(p?.full_name ?? "")}/></label>
      <label>Username<input name="username" required pattern="[A-Za-z0-9_]{3,30}" defaultValue={String(p?.username ?? "")}/><small>3–30 letters, numbers, or underscores</small></label>
      <label className="span-two">Headline<input name="headline" maxLength={120} placeholder="e.g. Community researcher and fisheries advocate" defaultValue={String(p?.headline ?? "")}/></label>
      <label className="span-two">Short bio<textarea name="bio" rows={4} maxLength={500} placeholder="What do you care about building or improving?" defaultValue={String(p?.bio ?? "")}/></label>
      <label>County<input name="county" maxLength={100} placeholder="e.g. Kilifi" defaultValue={String(p?.county ?? "")}/></label>
      <label>Town<input name="town" maxLength={100} placeholder="Optional" defaultValue={String(p?.town ?? "")}/></label>
      <OnboardingSelect name="interests" label="Interests" options={INTEREST_OPTIONS.map((interest) => ({ value: interest, label: interest }))} initialSelected={interestSelections} allowOther initialOther={otherInterests.join(", ")} />
      <OnboardingSelect name="skill_ids" label="Skills" options={(skills ?? []).map((skill) => ({ value: skill.id, label: skill.name }))} initialSelected={[...(profileSkills ?? []).map((skill) => skill.skill_id), ...(customSkills.length ? [OTHER_OPTION] : [])]} allowOther initialOther={customSkills.join(", ")} otherInputName="skill_other" />
      {!skills?.length && <p className="onboarding-catalog-note span-two">The skill list is unavailable right now. You can still save the rest of your profile.</p>}
      <label className="span-two">Portfolio link (optional)<input name="portfolio_url" type="url" placeholder="https://" defaultValue={String(p?.portfolio_url ?? "")}/></label>
      <label>Profile visibility<select name="profile_visibility" defaultValue={String(p?.profile_visibility ?? "public")}><option value="public">Public</option><option value="members">Signed-in members</option><option value="private">Private</option></select></label>
      <div className="span-two"><button className="button" type="submit">Save profile</button></div>
    </form>
  </section>;
}
