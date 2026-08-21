import type { Metadata } from "next";
import { TrustView } from "@/components/pages/TrustView";
import { editorialCopy } from "@/components/pages/editorialPresentation";
import { alternatesFor } from "@/lib/i18n";

// The Portuguese trust page — the canonical structure. See components/pages/TrustView.tsx.
export const metadata: Metadata = {
  title: editorialCopy("trust.meta.title", "pt"),
  description: editorialCopy("trust.meta.description", "pt"),
  alternates: alternatesFor("/confianca"),
};

export default function ConfiancaPage() {
  return <TrustView locale="pt" />;
}
