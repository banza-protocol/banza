import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decisions, getDecision } from "@/lib/decisions";
import { getDecisionMarkdown } from "@/lib/decisions-content";
import { DecisionDetailView } from "@/components/decisoes/DecisionDetailView";
import { decisionsCopy } from "@/components/decisoes/decisionsPresentation";

// The Portuguese edition of a decision record's page. The route declares the edition and resolves the
// record; the surface lives in <DecisionDetailView> so both editions render from one tree.
const LOCALE = "pt" as const;

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
    alternates: { canonical: `/decisoes/${d.slug}` },
  };
}

export default async function DecisionDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const d = getDecision(slug);
  if (!d) notFound();

  return <DecisionDetailView decision={d} body={getDecisionMarkdown(slug)} locale={LOCALE} />;
}
