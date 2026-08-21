import type { Metadata } from "next";
import { TrustView } from "@/components/pages/TrustView";
import { editorialCopy } from "@/components/pages/editorialPresentation";
import { alternatesFor } from "@/lib/i18n";

// The English trust page — the SAME page as the Portuguese one, realized in English.
export const metadata: Metadata = {
  title: editorialCopy("trust.meta.title", "en"),
  description: editorialCopy("trust.meta.description", "en"),
  alternates: alternatesFor("/en/trust"),
};

export default function EnTrustPage() {
  return <TrustView locale="en" />;
}
