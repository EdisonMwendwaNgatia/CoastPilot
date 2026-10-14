import type { Metadata } from "next";
import { LegalContent } from "@/components/legal-content";

export const metadata: Metadata = {
  title: "Terms & Privacy | CoastPilot",
  description: "Read the CoastPilot terms and conditions and privacy policy.",
};

export default function LegalPage() {
  return <LegalContent />;
}
