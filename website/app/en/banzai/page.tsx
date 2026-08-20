// /en/banzai — Block E2/Q6. The English edition of the global BanzAI context. Same workspace, same
// segment binder, same closed-slug parsing; only the declared edition differs.
import type { Metadata } from "next";
import { parseBanzaiState } from "@/lib/banzaiState";
import { BanzaiRouteBinder } from "@/components/banzai/BanzaiRouteBinder";

// Canonical, single public route for BanzAI — the native protocol agent (ADR-036). ONE app, three modes
// of the SAME always-mounted shell (mounted by app/banzai/layout.tsx): "ask" answers from the live,
// Rust-controlled banzai-api backend running local Qwen inference (on-host llama.cpp, reasoning disabled)
// reached same-origin via /banzai/ask — no external calls, nothing leaves the host; "validation" runs the
// deterministic 9-step implementation-validation journey with the protocol's Rust/WASM engines
// (qwen_calls: 0, external_calls: 0 by construction); "onboarding" is the passwordless operator onboarding
// (ADR-037). Official validation is ENDPOINT-ORIGINATED (ADR-034): the target is resolved from the closed
// Technical Registry (operator_id -> implementation_id -> canonical_origin -> discovery) and every
// artifact is fetched from the implementation's PUBLIC ENDPOINTS by a secure Rust fetcher — never the
// browser, never a user-supplied URL; upload/paste is a local, non-authoritative DRAFT tool only.
//
// M2.19G.4 (ADR-036) — the operator and implementation CONTEXTS are addressable route segments under
// /banzai (operador/[operatorId]/[implementationId]); this file is the GLOBAL context. There is no second
// application and no separate validation route: every segment shares this one shell and session.

export const metadata: Metadata = {
  title: "BanzAI — BANZA protocol interface",
  description:
    "BanzAI is the primary human-operator interface to the BANZA protocol: it consults the local sources, runs the technical engines and explains their results. It does not certify, does not approve operators and does not replace the protocol's governance.",
  alternates: { canonical: "/en/banzai" },
};

// M2.19G.4 — read the requested state SERVER-SIDE (closed allowlists, throw-free) and hand it to the
// binder, which publishes it to the always-mounted workspace. Every query param is validated against
// CLOSED allowlists in parseBanzaiState (mode/target/workflow/step + the legacy ?view=guia), so an
// invalid or malicious value falls back to a safe default and never throws — no arbitrary URL is ever
// fetched. Reading searchParams opts this interactive page into dynamic rendering.
export default async function BanzaiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const state = parseBanzaiState(sp);
  return <BanzaiRouteBinder state={state} locale="en" />;
}
