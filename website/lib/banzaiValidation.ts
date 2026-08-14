// BanzAI validation — the deep-link contract between the Operador Zero surface and the BanzAI
// validation mode (M2.19EF2). The single BanzAI app lives at /banzai; validation is one of its two
// modes (the other is "ask"), reached via /banzai?mode=validation.
//
// SECURITY MODEL (deep-link safety, §10): validation mode accepts NO arbitrary URLs. It accepts a
// `target` from a CLOSED registry, a `workflow` from a CLOSED allowlist and a `step` from a CLOSED set.
// There is no fetch of a caller-supplied URL, so SSRF / path-traversal / injection are impossible by
// construction. Every value is checked against these allowlists before use; anything off-list resolves to
// `null` (the shell then shows a safe "target desconhecido" state and offers the default operator-zero
// target).
//
// ENDPOINT-ORIGINATED (ADR-034): the official journey does NOT read artifacts bundled in the image or
// pasted/uploaded by the caller. The target is resolved from the closed Technical Registry
// (operator_id -> implementation_id -> canonical_origin -> discovery) and every artifact is fetched from
// the implementation's PUBLIC ENDPOINTS by a secure Rust fetcher (never the browser). Upload/paste is a
// local, non-authoritative DRAFT tool only.
//
// This is UI/glue only: it selects a target, a workflow and a step. The Rust engines decide every verdict.

/** A validatable target — an implementation the journey can be run against. CLOSED set. */
export interface ValidationTarget {
  id: string;
  display_name: string;
  /** The implementation's canonical public ORIGIN (ADR-034). The secure Rust fetcher resolves and
   *  fetches every artifact from this origin's public endpoints. Never a caller-supplied URL; a
   *  constant mirrored from the closed Technical Registry. */
  artifacts_base: string;
  environment: "demo";
  demo_only: true;
}

/** The closed target registry. Operador Zero is the only public target (ADR-035: Operator-Zero-only
 *  demo/example policy). No caller can introduce a new target. */
export const VALIDATION_TARGETS: Readonly<Record<string, ValidationTarget>> = {
  "operator-zero": {
    id: "operator-zero",
    display_name: "Operador Zero",
    artifacts_base: "https://zero.banza.network",
    environment: "demo",
    demo_only: true,
  },
};

export const DEFAULT_TARGET_ID = "operator-zero";

// ─────────────────────────────────────────────────────────────────────────────
// M2.19G.1 (ADR-034) — Operator → Implementation target model.
//
// ADR-034 §4.1/§4.2/§4.3: the human-facing feature is "Validar operador", but the technical object
// evaluated is always a SPECIFIC IMPLEMENTATION published by that operator — never the entity in the
// abstract. One operator may publish many implementations (demo/sandbox/pre-prod/prod; versions,
// profiles, capabilities, deployments). This closed, in-repo registry MIRRORS the backend Technical
// Registry (Rust `banza_target_registry`) for DISPLAY ONLY: it names the eligible operators +
// implementations so the Fase 0 selectors can render operator/implementation cards. The AUTHORITATIVE
// resolution + every verdict happen server-side (POST /banzai/validate/*). No caller can introduce a
// new operator/implementation — ids are matched against this closed map and re-resolved in Rust.
// ─────────────────────────────────────────────────────────────────────────────

/** A published implementation — the technical object the journey evaluates (ADR-034 §4.2). CLOSED set. */
export interface ValidationImplementation {
  implementation_id: string;
  operator_id: string;
  display_name: string;
  version: string;
  environment: string;
  profile: string;
  protocol_version: string;
  capabilities: string[];
  /** The implementation's canonical public origin (the Rust fetcher resolves artifacts here). */
  canonical_origin: string;
  /** Publication status in the closed Technical Registry (the enum decided by the Rust registry). */
  publication_status: string;
  /** Whether the closed registry currently RESOLVES this implementation as an eligible target. A
   *  listing is not admission — eligibility is decided in Rust; this mirrors that decision for display. */
  eligible: boolean;
}

/** A responsible operator (ADR-034 §4.10 — the entity, distinct from the technical system). CLOSED set. */
export interface ValidationOperator {
  operator_id: string;
  display_name: string;
  publication_status: string;
  technical_registry_ref: string;
  implementations: ValidationImplementation[];
}

// M2.19G.3B — the operator list is NO LONGER a hardcoded TS constant. It is fetched at runtime from the
// closed Technical Registry (GET /banzai/validate/registry), whose single source is the Rust engine
// `banza-target-registry` (production_registry). This kills the drift the hardcoded map had accumulated
// (version, profile, capabilities, and a certification-outcome field that never belonged in a registry
// listing) and means no operator — not even Operador Zero — is hardcoded as "the only operator". The
// backend re-resolves + re-decides every id in Rust; the mapper below is display glue only.

/** Human-readable PT label for a Technical-Registry publication status enum (display only). */
export const PUBLICATION_STATUS_LABEL_PT: Readonly<Record<string, string>> = {
  published: "Publicado no registo técnico",
  draft: "Rascunho",
  withdrawn: "Retirado",
  suspended: "Suspenso",
};

/** Label a publication-status enum for display; unknown values pass through verbatim (never invented). */
export function publicationStatusLabel(status: string): string {
  return PUBLICATION_STATUS_LABEL_PT[status] ?? status;
}

/** Map the closed catalogue JSON (from GET /banzai/validate/registry — sourced from the Rust registry)
 *  into the display shape. PURE + defensive: unknown/malformed input yields an empty list, never throws,
 *  and every id is shape-checked. This is the ONLY place the operator list is constructed on the client. */
export function mapCatalogueToOperators(raw: unknown): ValidationOperator[] {
  const root = raw as { operators?: unknown } | null;
  if (!root || !Array.isArray(root.operators)) return [];
  const out: ValidationOperator[] = [];
  for (const o of root.operators as Array<Record<string, unknown>>) {
    const operatorId = typeof o.operator_id === "string" ? o.operator_id : "";
    if (!isClosedId(operatorId)) continue;
    const impls: ValidationImplementation[] = [];
    const rawImpls = Array.isArray(o.implementations) ? (o.implementations as Array<Record<string, unknown>>) : [];
    for (const i of rawImpls) {
      const implId = typeof i.implementation_id === "string" ? i.implementation_id : "";
      if (!isClosedId(implId)) continue;
      impls.push({
        implementation_id: implId,
        operator_id: operatorId,
        display_name: typeof i.display_name === "string" ? i.display_name : implId,
        version: typeof i.version === "string" ? i.version : "",
        environment: typeof i.environment === "string" ? i.environment : "",
        profile: typeof i.profile === "string" ? i.profile : "",
        protocol_version: typeof i.protocol_version === "string" ? i.protocol_version : "",
        capabilities: Array.isArray(i.capabilities) ? (i.capabilities.filter((c) => typeof c === "string") as string[]) : [],
        canonical_origin: typeof i.canonical_origin === "string" ? i.canonical_origin : "",
        publication_status: typeof i.publication_status === "string" ? i.publication_status : "",
        eligible: i.eligible === true,
      });
    }
    out.push({
      operator_id: operatorId,
      display_name: typeof o.display_name === "string" ? o.display_name : operatorId,
      publication_status: typeof o.publication_status === "string" ? o.publication_status : "",
      technical_registry_ref: typeof o.registry_ref === "string" ? o.registry_ref : "",
      implementations: impls,
    });
  }
  return out;
}

/** Closed id shape (ADR-034 §4.7 security): a lowercase slug only — NEVER a URL, path or scheme. The
 *  only ids that ever reach the backend are these registry ids, re-checked here before any request. */
const CLOSED_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
export function isClosedId(v: string | null | undefined): boolean {
  return typeof v === "string" && CLOSED_ID.test(v);
}

/** Resolve an operator id against a FETCHED operator list (from the closed registry). Null off-list. */
export function resolveOperatorIn(
  operators: readonly ValidationOperator[],
  id: string | null | undefined,
): ValidationOperator | null {
  if (!isClosedId(id)) return null;
  return operators.find((o) => o.operator_id === id) ?? null;
}

/** Resolve an implementation against a FETCHED operator list (must belong to the operator). Null off-list. */
export function resolveImplementationIn(
  operators: readonly ValidationOperator[],
  operatorId: string | null | undefined,
  implementationId: string | null | undefined,
): ValidationImplementation | null {
  const op = resolveOperatorIn(operators, operatorId);
  if (!op || !isClosedId(implementationId)) return null;
  return op.implementations.find((i) => i.implementation_id === implementationId) ?? null;
}

/** The closed workflow allowlist — the 9 journey steps plus the full journey. */
export const VALIDATION_WORKFLOWS = [
  "full",
  "discovery",
  "manifest",
  "keys",
  "conformance",
  "interoperability",
  "trust",
  "federation",
  "evidence",
  "certification",
] as const;

export type ValidationWorkflow = (typeof VALIDATION_WORKFLOWS)[number];

/** Resolve a target id against the closed registry. Returns null for anything off-list. */
export function resolveTarget(id: string | null | undefined): ValidationTarget | null {
  if (!id) return null;
  return VALIDATION_TARGETS[id] ?? null;
}

/** Resolve a workflow against the closed allowlist. Unknown → the safe default "full". */
export function resolveWorkflow(w: string | null | undefined): ValidationWorkflow {
  return (VALIDATION_WORKFLOWS as readonly string[]).includes(w ?? "")
    ? (w as ValidationWorkflow)
    : "full";
}

/** The 9 journey step ids — the closed allowlist minus the "full" aggregate. Ordered. */
export const VALIDATION_STEP_IDS = [
  "discovery",
  "manifest",
  "keys",
  "conformance",
  "interoperability",
  "trust",
  "federation",
  "evidence",
  "certification",
] as const;

export type ValidationStepId = (typeof VALIDATION_STEP_IDS)[number];

/** Resolve a step id against the closed set. Returns null for anything off-list (incl. "full"). */
export function resolveStep(s: string | null | undefined): ValidationStepId | null {
  return (VALIDATION_STEP_IDS as readonly string[]).includes(s ?? "")
    ? (s as ValidationStepId)
    : null;
}

/** Build a safe deep link to BanzAI validation mode (the canonical /banzai app, mode=validation). Only
 *  allowlisted target+workflow are ever encoded; no free-form URL is ever placed in the query string. */
export function workbenchDeepLink(targetId: string, workflow: ValidationWorkflow = "full"): string {
  const target = resolveTarget(targetId);
  const id = target ? target.id : DEFAULT_TARGET_ID;
  const wf = resolveWorkflow(workflow);
  const q = new URLSearchParams({ mode: "validation", target: id, workflow: wf });
  return `/banzai?${q.toString()}`;
}

/** Absolute form (the Operador Zero subdomain must send the visitor to the apex /banzai app). */
export function workbenchDeepLinkAbsolute(targetId: string, workflow: ValidationWorkflow = "full"): string {
  return `https://banza.network${workbenchDeepLink(targetId, workflow)}`;
}

/** The canonical labels for each workflow (PT), used on the Operador Zero validation CTAs. */
export const WORKFLOW_LABEL_PT: Record<ValidationWorkflow, string> = {
  full: "Validar esta implementação no BanzAI",
  discovery: "Executar discovery no BanzAI",
  manifest: "Validar manifest no BanzAI",
  keys: "Verificar chaves no BanzAI",
  conformance: "Executar conformidade no BanzAI",
  interoperability: "Testar interoperabilidade no BanzAI",
  trust: "Verificar trust no BanzAI",
  federation: "Avaliar federação no BanzAI",
  evidence: "Construir Evidence Bundle no BanzAI",
  certification: "Verificar preparação de certificação no BanzAI",
};
