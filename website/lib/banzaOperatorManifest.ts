// Operator Manifest adapter — RUST_WRAPPER_ONLY (BX1.6).
//
// Loads the Rust operator-manifest validator (`banza-operator-manifest`) compiled to WASM and marshals
// JSON in/out. It performs NO validation of its own: the field checks, the type/URL checks, the safety
// invariant, the status (VALID/INVALID/INCOMPLETE/MALFORMED) AND the readiness all run in Rust.
// TypeScript cannot decide validity, decide readiness, validate an endpoint, or compute a status — it
// only calls the engine and renders what it returns. Validation is LOCAL: declared URLs are checked for
// well-formedness only, never fetched (no network). The WASM artifact is built from
// `engines/banza-operator-manifest` with `wasm-pack build --features wasm --target web`.
//
// A valid manifest is technical evidence — it does NOT create a real operator, does NOT change
// /operators, does NOT certify and does NOT approve.

export type ManifestStatus = "VALID" | "INVALID" | "INCOMPLETE" | "MALFORMED";

export interface ManifestEndpointCheck {
  field: string;
  url: string;
  well_formed: boolean;
  note: string;
}
export interface ManifestReport {
  status: ManifestStatus;
  manifest_id: string;
  operator_id: string;
  environment: string;
  protocol_version: string;
  errors: string[];
  warnings: string[];
  required_fields: string[];
  missing_fields: string[];
  endpoint_checks: ManifestEndpointCheck[];
  key_manifest_reference: { present: boolean; url: string | null; well_formed: boolean | null; note: string };
  manifest_hash: string | null;
  readiness: string;
  next_step: string;
  well_known_path: string;
  boundary: string;
  tool: string;
  tool_version: string;
  not_a_certificate: boolean;
  not_an_approval: boolean;
  does_not_create_operator: boolean;
  requires_simb_pre_review: boolean;
  requires_conformance_evidence_review: boolean;
  test_only: boolean;
  llm_calls: number;
  external_model_called: boolean;
}
export interface ManifestFixture {
  key: string;
  label: string;
  expected: ManifestStatus;
  manifest?: unknown;
  raw?: string;
}
export interface ManifestFixtureSet {
  note: string;
  fixtures: ManifestFixture[];
}

type WasmModule = typeof import("@/lib/wasm/banza_operator_manifest");
let mPromise: Promise<WasmModule> | null = null;

async function engine(): Promise<WasmModule> {
  if (!mPromise) {
    mPromise = (async () => {
      const mod = await import("@/lib/wasm/banza_operator_manifest");
      await mod.default();
      return mod;
    })();
  }
  return mPromise;
}

/** Validate a manifest JSON string (the manifest object, or `{ manifest }`). Status/readiness in Rust. */
export async function validateManifest(input: string): Promise<ManifestReport> {
  const mod = await engine();
  return JSON.parse(mod.operator_manifest_validate_json(input)) as ManifestReport;
}

export async function loadManifestFixtures(): Promise<ManifestFixtureSet> {
  const mod = await engine();
  return JSON.parse(mod.operator_manifest_demo_fixtures_json()) as ManifestFixtureSet;
}

export async function getManifestSchema(): Promise<unknown> {
  const mod = await engine();
  return JSON.parse(mod.operator_manifest_schema_json());
}

export async function getManifestToolVersion(): Promise<{ tool: string; tool_version: string; protocol_version: string; test_only: boolean; boundary: string }> {
  const mod = await engine();
  return JSON.parse(mod.operator_manifest_tool_version_json());
}

/** Render-only tone for a Rust-computed manifest status. No decision logic — pure presentation. */
export function manifestStatusTone(status: ManifestStatus): "pass" | "fail" | "warn" | "unknown" {
  switch (status) {
    case "VALID":
      return "pass";
    case "INVALID":
    case "MALFORMED":
      return "fail";
    case "INCOMPLETE":
      return "warn";
    default:
      return "unknown";
  }
}
