// /en/banzai/operator/[operatorId] — Block E2/Q6. The English edition of the OPERATOR context.
//
// The operatorId is protocol identity and is NOT translated: the segment word is English (operator, not
// operador) and the id that follows it is byte-identical to the Portuguese route's. The same closed-slug
// shape validation runs here, so an off-registry or malformed id is an honest notFound() in both editions
// rather than a silent fall back to another operator.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseBanzaiState } from "@/lib/banzaiState";
import { isClosedId } from "@/lib/banzaiValidation";
import { BanzaiRouteBinder } from "@/components/banzai/BanzaiRouteBinder";

// /banzai/operador/[operatorId] — M2.19G.4 (ADR-036). The OPERATOR context of the single BanzAI interface.
// Not a second app: it shares the always-mounted workspace mounted by app/banzai/layout.tsx. The dynamic
// segment is a CLOSED slug (never a URL, scheme or path); it is shape-validated here SERVER-SIDE and handed
// to the throw-free parseBanzaiState as a path seed. The session re-resolves it against the FETCHED closed
// registry — an off-registry id simply falls back to the global context. No arbitrary URL is
// ever fetched from a segment (ADR-034 §4.6/§4.7).

export const metadata: Metadata = {
  title: "BanzAI — Operator",
  description:
    "The BanzAI operator context: select a published implementation and validate it technically. Validation is endpoint-originated (ADR-034); BanzAI neither certifies nor approves operators.",
  alternates: { canonical: "/en/banzai" },
  robots: { index: false, follow: false },
};

export default async function OperatorContextPageEn({
  params,
  searchParams,
}: {
  params: Promise<{ operatorId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { operatorId } = await params;
  const sp = await searchParams;
  // Closed-slug shape only. Anything else (a URL, a path, an upper-case or over-long token) is not a valid
  // context segment → honest notFound(), never treated as an operator (ADR-036; ADR-034 safety).
  if (!isClosedId(operatorId)) notFound();
  const state = parseBanzaiState(sp, { operatorId });
  return <BanzaiRouteBinder state={state} locale="en" />;
}
