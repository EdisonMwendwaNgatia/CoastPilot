"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoastPilotLogoMark } from "@/components/coastpilot-logo-mark";

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="legal-section"><h2>{title}</h2>{children}</section>;
}

export function LegalContent() {
  return <main className="legal-page">
    <header className="legal-header">
      <Link href="/" className="brand"><CoastPilotLogoMark/><span>coastpilot<span className="brand-period">.</span></span></Link>
      
    </header>

    <section className="legal-hero">


      <h1>Trust starts with transparency.</h1>
      <p>Here’s how CoastPilot works, what we ask you to agree to, and how we handle the information you share while turning community ideas into tested solutions.</p>
      <span className="legal-updated">Last updated 14 October 2026</span>
    </section>

    <section className="legal-content-card" aria-label="CoastPilot legal policies">
      <Tabs defaultValue="terms" className="legal-tabs">
        <TabsList className="legal-tab-list" aria-label="Choose a policy">
          <TabsTrigger className="legal-tab" value="terms"><FileText size={16}/> Terms &amp; Conditions</TabsTrigger>
          <TabsTrigger className="legal-tab" value="privacy"><ShieldCheck size={16}/> Privacy Policy</TabsTrigger>
        </TabsList>

        <TabsContent className="legal-tab-panel" value="terms">
          <div className="legal-document-heading"><span>01 / USING COASTPILOT</span><h2>Terms &amp; Conditions</h2><p>These terms describe the ground rules for using the CoastPilot platform.</p></div>
          <LegalSection title="1. About CoastPilot"><p>CoastPilot helps young people and community partners turn local problems into challenges, team projects, prototypes, and documented real-world tests. The platform is operated as a pilot focused on Kenya’s coastal communities. Youth participation is free. CoastPilot does not collect payments through the platform.</p></LegalSection>
          <LegalSection title="2. Your account"><p>Give accurate information, keep your sign-in details private, and tell us promptly if you think someone else has accessed your account. You are responsible for activity carried out through your account. Do not create an account for someone else without their permission.</p></LegalSection>
          <LegalSection title="3. Young participants"><p>CoastPilot is designed for youth. If you are under 18, a parent or guardian must review and approve your participation before you submit personal information. The current sign-up form does not collect or verify parent or guardian approval; a parent or guardian should contact <a href="mailto:hello@coastpilot.org">hello@coastpilot.org</a> before a person under 18 creates an account or submits personal details.</p></LegalSection>
          <LegalSection title="4. Respectful and safe use"><p>Use CoastPilot lawfully and respectfully. Do not harass or threaten people, impersonate someone, submit knowingly false reports, upload harmful code or files, violate another person’s privacy, or submit content that you do not have permission to share. When testing a solution in a community, get appropriate permission from participants and do not upload identifiable information about them without authorization.</p></LegalSection>
          <LegalSection title="5. Your content and visibility"><p>You keep ownership of the content you create. You give CoastPilot permission to store, display, and process it only as needed to operate, protect, and improve the platform and the workflows you choose to use. Content you mark public, public profiles, and approved community problems may be visible to anyone. Challenge applications and private project material are available only to the people authorized for that challenge or project. Check visibility before sharing sensitive details.</p></LegalSection>
          <LegalSection title="6. Review and moderation"><p>CoastPilot may review, hide, reject, or remove content and may restrict or close accounts when needed to protect users, uphold these terms, or meet legal obligations. A submitted challenge, project, sponsorship proposal, or pilot proposal is not approved until an authorized administrator accepts it.</p></LegalSection>
          <LegalSection title="7. Challenges, sponsorship, and outcomes"><p>Challenges and partnership discussions are opportunities to explore ideas; they are not promises of funding, prizes, employment, grants, a pilot, or a successful solution. Any prize, sponsorship, service fee, or other commitment must be separately confirmed by the relevant parties. CoastPilot does not guarantee the accuracy of user-submitted claims or independently verify impact figures unless a record is explicitly marked as verified.</p></LegalSection>
          <LegalSection title="8. Third-party services"><p>CoastPilot relies on third-party services such as Supabase for authentication and data storage, Vercel for hosting, and Google or GitHub when you choose those sign-in options. Their services are subject to their own terms and privacy notices.</p></LegalSection>
          <LegalSection title="9. Changes and contact"><p>We may update these terms as the pilot develops. The latest version will be posted on this page with its updated date. Questions or concerns? Email <a href="mailto:hello@coastpilot.org">hello@coastpilot.org</a>.</p></LegalSection>
        </TabsContent>

        <TabsContent className="legal-tab-panel" value="privacy">
          <div className="legal-document-heading"><span>02 / YOUR INFORMATION</span><h2>Privacy Policy</h2><p>We collect only information needed to run the CoastPilot workspace and support community innovation.</p></div>
          <LegalSection title="1. Information we collect"><p>Depending on how you use CoastPilot, we may process your name, email address, username, profile photo, biography, county or town, skills, interests, portfolio links, sign-in records, and account settings. We also store problems and evidence you submit, challenge applications, team membership, project updates, repository or prototype links, uploaded videos or documents, impact reports, notifications, and abuse reports.</p><p>If you choose Google or GitHub sign-in, the provider shares basic account details such as your email and profile information with Supabase Auth to establish your account. CoastPilot does not receive your provider password.</p></LegalSection>
          <LegalSection title="2. How we use information"><p>We use information to create and secure accounts, show profiles and opportunities according to their visibility settings, route submissions for review, help teams work together, provide project feedback, send in-app notifications, moderate abuse, and understand programme activity. We do not sell personal information or use it for advertising. Youth participation is free; CoastPilot does not process payments.</p></LegalSection>
          <LegalSection title="3. What others can see"><p>Your profile visibility setting controls who can view your profile. Public profiles, approved public problems, published challenges, and projects marked public may be visible outside CoastPilot. Challenge organizers can review applications to their challenges. Verified organization members can access only the project and programme information authorized for their organization. Private reports, private evidence, and private project work are not public.</p><p>Avoid putting passwords, financial details, precise home addresses, or another person’s sensitive information in a profile, project, or uploaded file.</p></LegalSection>
          <LegalSection title="4. Service providers and transfers"><p>We use Supabase to provide authentication, database, and file storage services and Vercel to host the website. If you use social sign-in, Google or GitHub processes that sign-in. These service providers may process data in countries where their infrastructure or teams operate, including outside Kenya. We use these services to run CoastPilot and expect them to protect information under their applicable terms and safeguards.</p></LegalSection>
          <LegalSection title="5. Retention and security"><p>We keep information while your account or related community project is active and for as long as reasonably needed for platform operations, safety, dispute handling, or legal obligations. When information is no longer needed, we will delete it or remove identifying details where practical. Backups may retain copies temporarily. We use access controls and database policies to limit access, but no online service can promise absolute security.</p></LegalSection>
          <LegalSection title="6. Your choices and requests"><p>You can update profile details and visibility through your account. You may ask us to access, correct, or delete personal information, object to certain processing, or ask a question about how your information is used by emailing <a href="mailto:hello@coastpilot.org">hello@coastpilot.org</a>. We may need to verify your identity and may retain information where the law allows or requires it. The Office of the Data Protection Commissioner describes data-subject rights and how they may be exercised.</p><p><a href="https://www.odpc.go.ke/rights-of-a-data-subject/" target="_blank" rel="noreferrer">Read the ODPC’s rights of a data subject <ExternalLink size={13}/></a> <span className="legal-link-separator">·</span> <a href="https://www.odpc.go.ke/data-protection-laws-kenya/" target="_blank" rel="noreferrer">Kenya data protection laws <ExternalLink size={13}/></a></p></LegalSection>
          <LegalSection title="7. Children’s information"><p>We do not intend for a person under 18 to submit personal information without parent or guardian review and approval. CoastPilot’s current sign-up flow does not verify age or collect guardian consent, so a parent or guardian should contact us before an under-18 participant registers. If you believe a child’s personal information was submitted without appropriate permission, email <a href="mailto:hello@coastpilot.org">hello@coastpilot.org</a> so we can review it.</p></LegalSection>
          <LegalSection title="8. Updates and contact"><p>We may update this policy as CoastPilot changes. We will post the current version and updated date here. For privacy requests, concerns, or questions, contact <a href="mailto:hello@coastpilot.org">hello@coastpilot.org</a>.</p></LegalSection>
        </TabsContent>
      </Tabs>
    </section>

    <footer className="legal-footer"><span>CoastPilot · From Coastal Problems to Tested Solutions.</span><Link href="/" className="legal-back"><ArrowLeft size={14}/> Return to the landing page</Link></footer>
  </main>;
}
