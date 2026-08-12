// Trust Engine adapter — RUST_WRAPPER_ONLY (M2.4).
//
// Loads the Rust BANZA trust verifier (`banza-trust`) compiled to WASM and marshals JSON in/out. It
// performs NO verification of its own: the ed25519 signature check, the ADR-038 canonicalization, the
// delegated-key / manifest / evidence / registry / revocation logic AND the trust-status decision all
// run in Rust. TypeScript cannot verify a signature, evaluate a delegated key, compute revocation, or
// decide a status — it only calls the engine and renders what it returns. Built from
// `engines/banza-trust` with `wasm-pack --target web`. Deterministic; no LLM, no network, no provider,
// no production key.
//
// The protocol's trust is verified by signed protocol metadata, delegated signing keys, operator
// manifests, conformance evidence, the public protocol registry and revocation/fail-closed. This is
// technical, TEST-ONLY verification — NOT operator authorisation, certification, licence or a financial
// service; it does not touch /operators or /certificates.

export type TrustStatus =
  | "TRUST_VALID"
  | "TRUST_INVALID_SIGNATURE"
  | "TRUST_INVALID_DELEGATED_KEY"
  | "TRUST_INVALID_ROOT_METADATA"
  | "TRUST_INVALID_SIGNED_METADATA"
  | "TRUST_MISSING_CONFORMANCE_EVIDENCE"
  | "TRUST_MISSING_OPERATOR_MANIFEST"
  | "TRUST_MISSING_REGISTRY_ENTRY"
  | "TRUST_REVOKED"
  | "TRUST_EXPIRED_METADATA"
  | "TRUST_INCOMPATIBLE_PROTOCOL_VERSION"
  | "TRUST_FAIL_CLOSED"
  | "TRUST_INVALID_BOUNDARY";

export interface TrustReport {
  trust_status: TrustStatus;
  detail: string;
  checks: {
    boundary_status: string;
    root_metadata_status: string;
    signed_metadata_status: string;
    delegated_key_status: string;
    signature_status: string;
    metadata_freshness_status: string;
    protocol_compatibility_status: string;
    manifest_status: string;
    conformance_evidence_status: string;
    registry_status: string;
    revocation_status: string;
    fail_closed_required: boolean;
  };
  flags: Record<string, boolean>;
  protocol_stance: string;
  production_disclaimer: string;
  report_hash: string;
  tool: string;
  tool_version: string;
  test_only: boolean;
  llm_calls: number;
  external_model_called: boolean;
}

export interface TrustFixture {
  key: string;
  label: string;
  expected: TrustStatus;
  input: unknown;
}
export interface TrustFixtureSet {
  note: string;
  fixtures: TrustFixture[];
}

type WasmModule = typeof import("@/lib/wasm/banza_trust");
let trustPromise: Promise<WasmModule> | null = null;

async function engine(): Promise<WasmModule> {
  if (!trustPromise) {
    trustPromise = (async () => {
      const mod = await import("@/lib/wasm/banza_trust");
      await mod.default();
      return mod;
    })();
  }
  return trustPromise;
}

/** Evaluate the operator's published trust material. Status/checks/hash all computed in Rust. */
export async function evaluateTrust(input: unknown): Promise<TrustReport> {
  const mod = await engine();
  return JSON.parse(mod.trust_evaluate_signed_metadata_json(JSON.stringify(input))) as TrustReport;
}

/** Load the deterministic TEST-ONLY demo fixtures (built and signed in Rust). */
export async function loadTrustFixtures(): Promise<TrustFixtureSet> {
  const mod = await engine();
  return JSON.parse(mod.trust_demo_fixtures_json()) as TrustFixtureSet;
}

export async function trustSchema(): Promise<{
  required_inputs: string[];
  status_values: string[];
  check_fields: string[];
  boundary: string;
}> {
  const mod = await engine();
  return JSON.parse(mod.trust_schema_json());
}

export async function trustToolVersion(): Promise<{
  tool: string;
  tool_version: string;
  scheme: string;
  model: string;
  test_only: boolean;
  production_disclaimer: string;
}> {
  const mod = await engine();
  return JSON.parse(mod.trust_tool_version_json());
}

/** Render-only tone for a Rust-computed status. No decision logic — pure presentation mapping. */
export function trustStatusTone(status: TrustStatus): "pass" | "fail" | "warn" | "unknown" {
  switch (status) {
    case "TRUST_VALID":
      return "pass";
    case "TRUST_REVOKED":
    case "TRUST_EXPIRED_METADATA":
    case "TRUST_MISSING_CONFORMANCE_EVIDENCE":
    case "TRUST_MISSING_OPERATOR_MANIFEST":
    case "TRUST_MISSING_REGISTRY_ENTRY":
      return "warn";
    case "TRUST_INVALID_SIGNATURE":
    case "TRUST_INVALID_DELEGATED_KEY":
    case "TRUST_INVALID_ROOT_METADATA":
    case "TRUST_INVALID_SIGNED_METADATA":
    case "TRUST_INCOMPATIBLE_PROTOCOL_VERSION":
    case "TRUST_FAIL_CLOSED":
    case "TRUST_INVALID_BOUNDARY":
      return "fail";
    default:
      return "unknown";
  }
}
