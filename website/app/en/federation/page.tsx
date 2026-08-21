import type { Metadata } from "next";
import { FederationView } from "@/components/pages/FederationView";
import { editorialCopy } from "@/components/pages/editorialPresentation";
import { alternatesFor } from "@/lib/i18n";

// The English federation page — the SAME page as the Portuguese one, realized in English. It used to be
// independently authored and offered three onward destinations where Portuguese offered four.
export const metadata: Metadata = {
  title: editorialCopy("federation.meta.title", "en"),
  description: editorialCopy("federation.meta.description", "en"),
  alternates: alternatesFor("/en/federation"),
};

export default function EnFederationPage() {
  return <FederationView locale="en" />;
}
