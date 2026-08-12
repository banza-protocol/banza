// Evidence Bundle adapter — RUST_WRAPPER_ONLY (BX1.5).
//
// Loads the Rust BANZA evidence-bundle assembler (`banza-evidence-bundle`) compiled to WASM and marshals
// JSON in/out. It performs NO assembly logic of its own: the readiness verdict, the required/missing
// artifacts, the SHA-256 integrity hashes AND the bundle id all run in Rust. TypeScript cannot decide
// readiness, compute a status, or hash a bundle — it only calls the engine and renders what it returns.
// The WASM artifact (`@/lib/wasm/banza_evidence_bundle`) is built from `engines/banza-evidence-bundle`
// with `wasm-pack build --features wasm --target web` and vendored here. Deterministic; no LLM, no
// network, no provider, no operator.
//
// The Evidence Bundle is technical evidence — NOT a certificate, NOT an approval, NOT operator
// authorization. No central authority issues, accepts or certifies operators.

export type BundleReadiness =
  | "NOT_READY"
  | "READY_FOR_TECHNICAL_REVIEW"
  | "BLOCKED_BY_SIMB"
  | "BLOCKED_BY_CONFORMANCE"
  | "INCOMPLETE";

export interface BanzaEvidenceBundle {
  schema_version: string;
  bundle_id: string;
  created_at: string;
  mode: string;
  environment: string;
  operator_candidate: string;
  simb_pre_review: unknown;
  conformance_l0: unknown;
  trace_verification: unknown;
  trust_engine_report: unknown;
  operator_manifest_validation: unknown;
  tool_versions: Record<string, unknown>;
  hashes: {
    bundle_hash: string;
    simb_report_hash: string | null;
    conformance_report_hash: string | null;
    trace_report_hash: string | null;
    trust_report_hash: string | null;
  };
  citations: string[];
  limitations: string[];
  required_artifacts: string[];
  recommended_artifacts: string[];
  missing_required: string[];
  missing_recommended: string[];
  readiness: BundleReadiness;
  not_a_certificate: boolean;
  not_an_approval: boolean;
  open_governance_report: unknown;
  reference_trust_model_report: unknown;
  requires_conformance_evidence_review: boolean;
  boundary: string;
  llm_calls: number;
  external_model_called: boolean;
}

export interface BundleValidation {
  ok: boolean;
  errors: string[];
  readiness: BundleReadiness | null;
  tool: string;
  tool_version: string;
}

/** The reports produced by the other BanzAI tools, in the browser's current state. */
export interface BundleInput {
  operator_candidate?: string;
  mode?: string;
  created_at?: string;
  simb?: unknown;
  l0?: unknown;
  trace?: unknown;
  trust?: unknown;
  operator_manifest?: unknown;
  l1_readiness?: unknown;
  l2_readiness?: unknown;
  l3_readiness?: unknown;
  l4_readiness?: unknown;
  security_assurance?: unknown;
  security_deep_assurance?: unknown;
  m2_protocol_gate?: unknown;
  m2_root_ceremony?: unknown;
  open_governance?: unknown;
  reference_trust_model?: unknown;
}

type WasmModule = typeof import("@/lib/wasm/banza_evidence_bundle");
let bundlePromise: Promise<WasmModule> | null = null;

async function engine(): Promise<WasmModule> {
  if (!bundlePromise) {
    bundlePromise = (async () => {
      const mod = await import("@/lib/wasm/banza_evidence_bundle");
      await mod.default();
      return mod;
    })();
  }
  return bundlePromise;
}

/** Build the bundle from the current BanzAI reports. Readiness + hashes computed in Rust. */
export async function buildBundle(input: BundleInput): Promise<BanzaEvidenceBundle> {
  const mod = await engine();
  return JSON.parse(mod.evidence_bundle_build_json(JSON.stringify(input))) as BanzaEvidenceBundle;
}

/** Build a real demo bundle from the actual engines. `input = { scenario?, created_at? }`. */
export async function demoBundle(input: { scenario?: string; created_at?: string }): Promise<BanzaEvidenceBundle> {
  const mod = await engine();
  return JSON.parse(mod.evidence_bundle_demo_json(JSON.stringify(input))) as BanzaEvidenceBundle;
}

/** Validate a bundle JSON (fields + boundary flags + readiness enum + SHA-256 integrity). */
export async function validateBundle(json: string): Promise<BundleValidation> {
  const mod = await engine();
  return JSON.parse(mod.evidence_bundle_validate_json(json)) as BundleValidation;
}

export async function getBundleSchema(): Promise<unknown> {
  const mod = await engine();
  return JSON.parse(mod.evidence_bundle_schema_json());
}

export async function getBundleToolVersion(): Promise<{ tool: string; tool_version: string; schema_version: string; hash: string; boundary: string }> {
  const mod = await engine();
  return JSON.parse(mod.evidence_bundle_tool_version_json());
}

/** Render-only tone for a Rust-computed readiness. No decision logic — pure presentation mapping. */
export function readinessTone(r: BundleReadiness): "pass" | "fail" | "warn" | "unknown" {
  switch (r) {
    case "READY_FOR_TECHNICAL_REVIEW":
      return "pass";
    case "BLOCKED_BY_SIMB":
    case "BLOCKED_BY_CONFORMANCE":
      return "fail";
    case "INCOMPLETE":
      return "warn";
    default:
      return "unknown";
  }
}
