import type { Metadata } from "next";
import { ReferenceLandingView } from "@/components/pages/ReferenceLandingView";
import { REFERENCE_CONTENT } from "@/components/pages/referenceContent";
import { alternatesFor } from "@/lib/i18n";

// The English Reference landing — the SAME page as the Portuguese one, realized in English. It used to be
// a smaller page, missing a framing paragraph, a heading, a whole band and one onward destination.
export const metadata: Metadata = {
  title: REFERENCE_CONTENT.en.metaTitle,
  description: REFERENCE_CONTENT.en.metaDescription,
  alternates: alternatesFor("/en/reference"),
};

export default function EnReferencePage() {
  return <ReferenceLandingView locale="en" />;
}
