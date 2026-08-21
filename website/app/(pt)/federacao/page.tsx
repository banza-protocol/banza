import type { Metadata } from "next";
import { FederationView } from "@/components/pages/FederationView";
import { editorialCopy } from "@/components/pages/editorialPresentation";
import { alternatesFor } from "@/lib/i18n";

// The Portuguese federation page — the canonical structure. See components/pages/FederationView.tsx.
export const metadata: Metadata = {
  title: editorialCopy("federation.meta.title", "pt"),
  description: editorialCopy("federation.meta.description", "pt"),
  alternates: alternatesFor("/federacao"),
};

export default function FederacaoPage() {
  return <FederationView locale="pt" />;
}
