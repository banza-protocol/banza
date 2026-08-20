import type { AgentCopyId } from "@/components/banzai/agentPresentation";
// BanzAI — copy, navigation and authority constants (M2.19EF2).
//
// All user-facing product copy for the single BanzAI shell lives here so it can be unit-tested (nav
// shape, required authority/boundary copy present, forbidden claims absent, outdated commands removed)
// without a DOM/WASM harness. The <BanzaiAgent/> component consumes these constants.
//
// Boundary (unchanged): BanzAI runs/explains technical tools; it does NOT certify, approve or issue
// certificates. The ask mode answers from the live, Rust-controlled banzai-api backend running local
// Qwen inference (on-host llama.cpp, reasoning disabled) reached same-origin via /banzai/ask — no
// external calls (external_model_called=false; chamadas externas: 0), nothing leaves the host. The
// validation mode + tool panels run their own deterministic Rust/WASM validators.

// M2.19G.1 (ADR-034) — the shell now has a SINGLE "Resultados" area (in-area sub-views, not separate
// sidebar tabs) and Recursos = Guia · Referência · Programadores. The per-analyser tabs
// (manifest/conformidade/trust/evidence/traces/receipts) were retired: their read-only outputs
// live under "resultados", and the paste/upload developer tooling lives under Programadores.
export type WbTab =
  | "assistente"
  | "guia"
  | "rfc"
  | "programadores"
  | "resultados";

/** The modes of the single BanzAI shell (the "Modos" sidebar group). M2.19G.3 (ADR-037) adds
 *  "onboarding" — the BanzAI-hosted operator onboarding (passwordless email-OTP login, a private
 *  Candidate Registry and .well-known origin proof). */
export type WbMode = "ask" | "validation" | "onboarding";

export type WbIcon =
  | "chat" | "medal" | "scale" | "graph" | "book" | "doc" | "route" | "code" | "info" | "terminal";

// Block E2/Q8 — BANZAI_AGENT moved into `agentPresentation` (bilingual). A reader-facing constant in this
// module could only ever be Portuguese.


// M2.7H — "Quem faz o quê" (native protocol agent framing) rendered in the Guia panel.
// Block E2/Q8 — the reader-facing agent copy (name, subtitle, hero, boundary, who-does-what, rule
// sources, guide text, session notice, badges, authority copy, validation and draft copy, conformance
// level names, trust cards, evidence contents) moved into `agentPresentation`, where it exists in both
// editions. A reader-facing constant in THIS module could only ever be Portuguese: it is a plain module,
// no provider context reaches it, and every consumer read it without a locale.
//
// What stays here is identity: the tab/mode keys, the icons, the groups, the hrefs, the ADR ids, and the
// machine guard input. Each record carries the ID of its name rather than the name itself.

/** The three workspace modes. `mode` and `icon` are identity; the NAME is an id into the catalogue. */
export const MODES: { mode: WbMode; icon: WbIcon; nameId: AgentCopyId }[] = [
  { mode: "ask", icon: "chat", nameId: "mode.ask" },
  { mode: "validation", icon: "medal", nameId: "mode.validation" },
  { mode: "onboarding", icon: "scale", nameId: "mode.onboarding" },
];


// Display metadata for EVERY WbTab (workspace header + right-panel context). `assistente` is the ask
// conversation (not a direct sidebar button — it is the ask mode's workspace). Tab KEYS are stable so
// panel wiring keeps working.
export const TAB_META: Record<WbTab, { icon: WbIcon; nameId: AgentCopyId }> = {
  assistente: { icon: "chat", nameId: "tab.assistente" },
  guia: { icon: "info", nameId: "tab.guia" },
  rfc: { icon: "doc", nameId: "tab.rfc" },
  programadores: { icon: "terminal", nameId: "tab.programadores" },
  resultados: { icon: "graph", nameId: "tab.resultados" },
};

// The sidebar tabs, grouped. "resultados" = the SINGLE validation-results area (in-area sub-views);
// "recursos" = reference/help + developer tooling. The Repositório external link now lives inside
// Programadores (ADR-034 § Recursos), not in the primary nav.
export const TABS: { key: WbTab; icon: WbIcon; nameId: AgentCopyId; group: "recursos" | "resultados" }[] = [
  { key: "resultados", icon: "graph", nameId: "tab.resultados", group: "resultados" },
  { key: "guia", icon: "info", nameId: "tab.guia", group: "recursos" },
  { key: "rfc", icon: "doc", nameId: "tab.rfc", group: "recursos" },
  { key: "programadores", icon: "terminal", nameId: "tab.programadores", group: "recursos" },
];

// The ONLY journey is the 9-step validation journey (see components/banzai/validationJourney.tsx). The
// legacy 7-step guided journey was removed — no numbered journey lives here anymore.

// Secondary external link (Part 1): the public protocol repository. M2.19G.1 — moved out of the primary
// nav into Programadores (rendered by ProgramadoresTools).
export const REPO_LINK = { nameId: "link.repositoryName" as AgentCopyId, href: "https://github.com/banza-protocol/banza" } as const;

// M2.19G.1 (ADR-034 §11) — the endpoint-originated validation terminology + required intro/result copy.
// The sidebar says "Validar operador"; the header is "Validação técnica de implementação"; results are
// phrased as the evaluation of a specific IMPLEMENTATION published by an operator — never "operador
// certificado/validado genericamente".
// Block E2/Q8 — VALIDATION_COPY moved into `agentPresentation` (bilingual). A reader-facing constant in this
// module could only ever be Portuguese.


// M2.19G.3 (ADR-037) — the operator-onboarding copy moved to `components/banzai/onboardingPresentation`
// in Block E2/Q5. It is read by exactly one surface and had to become bilingual; leaving a Portuguese
// copy here as well would have been a second definition of the same sentences.

// M2.19G.1 (ADR-034 §17) — the developer draft tool copy. A draft result is LOCAL, non-authoritative,
// never evidence, never a step verdict, never Certification Readiness.
// Block E2/Q8 — DRAFT_COPY moved into `agentPresentation` (bilingual). A reader-facing constant in this
// module could only ever be Portuguese.


// The session notice is `agent.sessionNotice` in the catalogue.

/** The three starter questions the empty conversation offers. Ids, not sentences. */
export const AGENT_SUGGESTION_IDS: AgentCopyId[] = [
  "starter.journeyDuration",
  "starter.slowestStep",
  "starter.compareRuns",
];

/**
 * Claims that must NEVER appear in workspace copy. MACHINE INPUT: this is a guard's needle list, asserted
 * against the catalogue by `banzai-agent.test.ts`, and is never rendered. It stays Portuguese because the
 * copy it guards is authored in Portuguese first; the English catalogue is checked by its own assertions.
 */
export const FORBIDDEN_PHRASES = [
  "A IA explica a verdade",
  "BanzAI certifica",
  "BanzAI aprova",
  "BanzAI emite certificados",
  "operador certificado pelo BanzAI",
  "certificação automática",
];

// Block E2/Q8 — BADGES moved into `agentPresentation` (bilingual). A reader-facing constant in this
// module could only ever be Portuguese.


// Block E2/Q8 — CONFORMIDADE_LEVELS moved into `agentPresentation` (bilingual). A reader-facing constant in this
// module could only ever be Portuguese.


// Active trust model (M2.5) — signed protocol metadata, delegated signing keys, public registry, revocation.
// Block E2/Q8 — TRUST_CARDS moved into `agentPresentation` (bilingual). A reader-facing constant in this
// module could only ever be Portuguese.


// Block E2/Q8 — EVIDENCE_CONTENT moved into `agentPresentation` (bilingual). A reader-facing constant in this
// module could only ever be Portuguese.


export const RFC_DOCS: { id: string; titleId: AgentCopyId; qId: AgentCopyId }[] = [
  { id: "ADR-001", titleId: "rfcCard.adr001.title", qId: "rfcCard.adr001.q" },
  { id: "ADR-036", titleId: "rfcCard.adr036.title", qId: "rfcCard.adr036.q" },
  { id: "ADR-030", titleId: "rfcCard.adr030.title", qId: "rfcCard.adr030.q" },
  { id: "ADR-025", titleId: "rfcCard.adr025.title", qId: "rfcCard.adr025.q" },
  { id: "ADR-038", titleId: "rfcCard.adr038.title", qId: "rfcCard.adr038.q" },
  { id: "RFCs", titleId: "rfcCard.rfcs.title", qId: "rfcCard.rfcs.q" },
];

export const PROTOCOL_MAP_NODES: { id: string; idLabelId?: AgentCopyId; roleId: AgentCopyId; qId: AgentCopyId }[] = [
  { id: "BANZA", roleId: "mapNode.banza.role", qId: "mapNode.banza.q" },
  { id: "Governança", idLabelId: "mapNode.governanca.id", roleId: "mapNode.governanca.role", qId: "mapNode.governanca.q" },
  { id: "Protocol Governance", roleId: "mapNode.protocolGovernance.role", qId: "mapNode.protocolGovernance.q" },
  { id: "BanzAI", roleId: "mapNode.banzai.role", qId: "mapNode.banzai.q" },
  { id: "Conformidade", idLabelId: "mapNode.conformidade.id", roleId: "mapNode.conformidade.role", qId: "mapNode.conformidade.q" },
  { id: "Federação", idLabelId: "mapNode.federacao.id", roleId: "mapNode.federacao.role", qId: "mapNode.federacao.q" },
  { id: "Operadores", idLabelId: "mapNode.operadores.id", roleId: "mapNode.operadores.role", qId: "mapNode.operadores.q" },
  { id: "Clientes", idLabelId: "mapNode.clientes.id", roleId: "mapNode.clientes.role", qId: "mapNode.clientes.q" },
];

/** The canonical trace vocabulary, in the protocol's own terms. MACHINE/SOURCE-LANGUAGE: these are the
 *  event names a trace carries, asserted by `publicSurface.test.ts`, not sentences shown to a reader. */
export const TRACE_FLOW = ["Pedido", "trace_id", "ledger", "obrigação", "evento", "evidência"];

// Programadores — Rust-first commands (no outdated pip install; ADR-038).
export const DEV_COMMANDS = [
  "banza-conformance-rs run-live",
  "banza-trust ceremony-check",
];
export const DEV_ENDPOINTS = ["GET /health", "GET /.well-known/banza/operator.json"];
export const DEV_QUESTION_IDS: AgentCopyId[] = [
  "devQuestion.manifest",
  "devQuestion.requiredFields",
  "devQuestion.validMeaning",
  "devQuestion.runL0",
];
