import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decisions, getDecision } from "@/lib/decisions";
import { getDecisionMarkdown } from "@/lib/decisions-content";
import { DecisionDetailView } from "@/components/decisoes/DecisionDetailView";
import { decisionsCopy } from "@/components/decisoes/decisionsPresentation";

// The English edition of a decision record's page. The SLUG is the record's identity and is the same on
// both sides: /en/decisions/adr-012-ledger is the same ADR-012 as /decisoes/adr-012-ledger, not an English
// decision. The document body is served in its original published language in both editions — that is a
// source-language classification, not a Portuguese fallback.
const LOCALE = "en" as const;

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return decisions.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const d = getDecision(slug);
  if (!d) return { title: decisionsCopy("detail.metaTitleNotFound", LOCALE) };
  return {
    title: decisionsCopy("detail.metaTitle", LOCALE, { id: d.id }),
    description: decisionsCopy(
      d.type === "ADR" ? "detail.metaDescription.adr" : "detail.metaDescription.rfc",
      LOCALE,
    ),
    alternates: { canonical: `/en/decisions/${d.slug}` },
  };
}

export default async function DecisionDetailEnPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const d = getDecision(slug);
  if (!d) notFound();

  return <DecisionDetailView decision={d} body={getDecisionMarkdown(slug)} locale={LOCALE} />;
}
