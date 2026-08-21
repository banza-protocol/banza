import type { Metadata } from "next";
import { ArchitectureView } from "@/components/pages/ArchitectureView";
import { editorialCopy } from "@/components/pages/editorialPresentation";
import { alternatesFor } from "@/lib/i18n";

// The Portuguese architecture page — the canonical structure. See components/pages/ArchitectureView.tsx.
export const metadata: Metadata = {
  title: editorialCopy("architecture.meta.title", "pt"),
  description: editorialCopy("architecture.meta.description", "pt"),
  alternates: alternatesFor("/arquitectura"),
};

export default function ArquitecturaPage() {
  return <ArchitectureView locale="pt" />;
}
