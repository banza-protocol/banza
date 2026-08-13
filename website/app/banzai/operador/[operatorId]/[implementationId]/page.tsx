import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseBanzaiState } from "@/lib/banzaiState";
import { isClosedId } from "@/lib/banzaiValidation";
import { BanzaiRouteBinder } from "@/components/banzai/BanzaiRouteBinder";

// /banzai/operador/[operatorId]/[implementationId] — M2.19G.4 (ADR-042). The IMPLEMENTATION context of the
// single BanzAI interface. Shares the always-mounted workspace (app/banzai/layout.tsx). Both dynamic
// segments are CLOSED slugs, shape-validated here SERVER-SIDE and handed to the throw-free parseBanzaiState
// as a path seed; the implementation id only rides a shape-valid operator id (operator ≠ implementation,
// ADR-038). The session re-resolves both against the FETCHED closed registry, falling back to the operator
// or global context when an id is off-registry (D-070-03). No arbitrary URL is ever fetched from a segment.

export const metadata: Metadata = {
  title: "BanzAI — Implementação",
  description:
    "Contexto de implementação do BanzAI: percorra a jornada determinística de 9 etapas de validação técnica sobre a implementação selecionada. Validação endpoint-originada (ADR-038); o BanzAI não certifica nem aprova.",
  alternates: { canonical: "/banzai" },
  robots: { index: false, follow: false },
};

export default async function ImplementationContextPage({
  params,
  searchParams,
}: {
  params: Promise<{ operatorId: string; implementationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { operatorId, implementationId } = await params;
  const sp = await searchParams;
  // Both segments must be closed slugs. Anything else → honest notFound(), never treated as an operator or
  // implementation (ADR-042 D-070-03; ADR-038 closed-registry + no-arbitrary-URL safety).
  if (!isClosedId(operatorId) || !isClosedId(implementationId)) notFound();
  const state = parseBanzaiState(sp, { operatorId, implementationId });
  return <BanzaiRouteBinder state={state} />;
}
