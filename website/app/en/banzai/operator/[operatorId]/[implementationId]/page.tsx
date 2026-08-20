// /en/banzai/operator/[operatorId]/[implementationId] — Block E2/Q6. The English edition of the
// IMPLEMENTATION context. BOTH ids are protocol identity and cross the language switch unchanged: an
// English reader looking at implementation Y of operator X is looking at exactly that, never at the
// operator's first implementation and never at the parent context.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseBanzaiState } from "@/lib/banzaiState";
import { isClosedId } from "@/lib/banzaiValidation";
import { BanzaiRouteBinder } from "@/components/banzai/BanzaiRouteBinder";

// /banzai/operador/[operatorId]/[implementationId] — M2.19G.4 (ADR-036). The IMPLEMENTATION context of the
// single BanzAI interface. Shares the always-mounted workspace (app/banzai/layout.tsx). Both dynamic
// segments are CLOSED slugs, shape-validated here SERVER-SIDE and handed to the throw-free parseBanzaiState
// as a path seed; the implementation id only rides a shape-valid operator id (operator ≠ implementation,
// ADR-034). The session re-resolves both against the FETCHED closed registry, falling back to the operator
// or global context when an id is off-registry. No arbitrary URL is ever fetched from a segment.

export const metadata: Metadata = {
  title: "BanzAI — Implementation",
  description:
    "The BanzAI implementation context: the technical validation journey for one published implementation, with every artifact fetched from the endpoints its operator declares (ADR-034).",
  alternates: { canonical: "/en/banzai" },
  robots: { index: false, follow: false },
};

export default async function ImplementationContextPageEn({
  params,
  searchParams,
}: {
  params: Promise<{ operatorId: string; implementationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { operatorId, implementationId } = await params;
  const sp = await searchParams;
  // Both segments must be closed slugs. Anything else → honest notFound(), never treated as an operator or
  // implementation (ADR-036; ADR-034 closed-registry + no-arbitrary-URL safety).
  if (!isClosedId(operatorId) || !isClosedId(implementationId)) notFound();
  const state = parseBanzaiState(sp, { operatorId, implementationId });
  return <BanzaiRouteBinder state={state} locale="en" />;
}
