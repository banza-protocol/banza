import type { Metadata } from "next";
import { ArchitectureView } from "@/components/pages/ArchitectureView";
import { editorialCopy } from "@/components/pages/editorialPresentation";
import { alternatesFor } from "@/lib/i18n";

// The English architecture page — the SAME page as the Portuguese one, realized in English.
export const metadata: Metadata = {
  title: editorialCopy("architecture.meta.title", "en"),
  description: editorialCopy("architecture.meta.description", "en"),
  alternates: alternatesFor("/en/architecture"),
};

export default function EnArchitecturePage() {
  return <ArchitectureView locale="en" />;
}
