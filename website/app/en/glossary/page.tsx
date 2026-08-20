import type { Metadata } from "next";
import { GlossaryView } from "@/components/GlossaryView";

// The English counterpart of /glossario. It is NOT a second glossary: both routes render the same 24
// semantic term records from lib/glossaryTerms.ts, read with a different locale, so the two languages
// cannot drift about which concepts exist or how they relate to each other.

export const metadata: Metadata = {
  title: "Glossary — the concepts of BANZA, precisely",
  description:
    "The canonical, current BANZA glossary: operator, implementation, endpoint-originated validation, draft validation, canonical origin, discovery, secure artifact fetcher, scheme participant, certification profile, capability, conformance, interoperability, certification, scheme admission, regulatory authorisation, evidence, trust, revocation, registry, federation, scheme and receipts — each with a definition, a technical id, the page that owns it, related terms and what not to confuse it with.",
  alternates: { canonical: "/en/glossary" },
};

export default function GlossaryPage() {
  return <GlossaryView locale="en" />;
}
