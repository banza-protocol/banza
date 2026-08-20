import type { Metadata } from "next";
import { DecisionsIndexView } from "@/components/decisoes/DecisionsIndexView";
import { decisionsCopy } from "@/components/decisoes/decisionsPresentation";

// The Portuguese edition of the decision library. The route's only job is to declare which edition it
// is; the surface itself lives in <DecisionsIndexView> so both editions render from one tree.
const LOCALE = "pt" as const;

export const metadata: Metadata = {
  title: decisionsCopy("index.metaTitle", LOCALE),
  description: decisionsCopy("index.metaDescription", LOCALE),
  alternates: { canonical: "/decisoes" },
};

export default function DecisoesPage() {
  return <DecisionsIndexView locale={LOCALE} />;
}
