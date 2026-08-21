import type { Metadata } from "next";
import { ReferenceLandingView } from "@/components/pages/ReferenceLandingView";
import { REFERENCE_CONTENT } from "@/components/pages/referenceContent";
import { alternatesFor } from "@/lib/i18n";

// The Portuguese Reference landing — the canonical structure. See ReferenceLandingView.
export const metadata: Metadata = {
  title: REFERENCE_CONTENT.pt.metaTitle,
  description: REFERENCE_CONTENT.pt.metaDescription,
  alternates: alternatesFor("/referencia"),
};

export default function ReferenciaPage() {
  return <ReferenceLandingView locale="pt" />;
}
