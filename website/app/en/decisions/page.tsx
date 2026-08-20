import type { Metadata } from "next";
import { DecisionsIndexView } from "@/components/decisoes/DecisionsIndexView";
import { decisionsCopy } from "@/components/decisoes/decisionsPresentation";

// The English edition of the decision library. The route declares which edition it is; the surface lives
// in <DecisionsIndexView>, the same component the Portuguese route renders. Same records, same states,
// same slugs — one library, read in two languages.
const LOCALE = "en" as const;

export const metadata: Metadata = {
  title: decisionsCopy("index.metaTitle", LOCALE),
  description: decisionsCopy("index.metaDescription", LOCALE),
  alternates: { canonical: "/en/decisions" },
};

export default function DecisionsEnPage() {
  return <DecisionsIndexView locale={LOCALE} />;
}
