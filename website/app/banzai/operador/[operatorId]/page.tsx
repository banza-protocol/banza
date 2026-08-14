import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseBanzaiState } from "@/lib/banzaiState";
import { isClosedId } from "@/lib/banzaiValidation";
import { BanzaiRouteBinder } from "@/components/banzai/BanzaiRouteBinder";

// /banzai/operador/[operatorId] — M2.19G.4 (ADR-042). The OPERATOR context of the single BanzAI interface.
// Not a second app: it shares the always-mounted workspace mounted by app/banzai/layout.tsx. The dynamic
// segment is a CLOSED slug (never a URL, scheme or path); it is shape-validated here SERVER-SIDE and handed
// to the throw-free parseBanzaiState as a path seed. The session re-resolves it against the FETCHED closed
// registry — an off-registry id simply falls back to the global context (D-070-03). No arbitrary URL is
// ever fetched from a segment (ADR-038 §4.6/§4.7).

export const metadata: Metadata = {
  title: "BanzAI — Operador",
  description:
    "Contexto de operador do BanzAI: selecione uma implementação publicada e valide-a tecnicamente. A validação é endpoint-originada (ADR-038) e o BanzAI não certifica nem aprova operadores.",
  alternates: { canonical: "/banzai" },
  robots: { index: false, follow: false },
};

export default async function OperatorContextPage({
  params,
  searchParams,
}: {
  params: Promise<{ operatorId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { operatorId } = await params;
  const sp = await searchParams;
  // Closed-slug shape only. Anything else (a URL, a path, an upper-case or over-long token) is not a valid
  // context segment → honest notFound(), never treated as an operator (ADR-042 D-070-03; ADR-038 safety).
  if (!isClosedId(operatorId)) notFound();
  const state = parseBanzaiState(sp, { operatorId });
  return <BanzaiRouteBinder state={state} />;
}
