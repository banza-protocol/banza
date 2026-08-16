// Conformance adapter — RUST_WRAPPER_ONLY (BX1.3).
//
// Loads the Rust BANZA conformance runner (`banza-conformance`) compiled to WASM and marshals JSON
// in/out. It performs NO conformance evaluation of its own: the L0 run against banza-simb, the
// invariant checks AND the technical PASS/FAIL verdict all run in Rust. TypeScript cannot decide
// conformance, evaluate an invariant, or compute a status — it only calls the engine and renders what
// it returns. The WASM artifact (`@/lib/wasm/banza_conformance`) is built from
// `engines/banza-conformance` with `wasm-pack build --features wasm --target web` and vendored here.
// Deterministic; no LLM, no network, no operator, no certificate, no M2/M3.
//
// PASS is technical conformance evidence, NOT a production certificate. This tool never certifies,
// never adds an operator, and never touches /operators or /certificates.

export interface ConformanceCase {
  case_id: string;
  invariant_id: string;
  status: "PASS" | "FAIL";
  reason: string;
}
export interface ConformanceInvariant {
  id: string;
  name: string;
  status: "PASS" | "FAIL";
  reason: string;
}
export interface L0Report {
  level: string;
  mode: string;
  status: "PASS" | "FAIL";
  runner: string;
  runner_version: string;
  protocol_version: string;
  tool: string;
  tool_version: string;
  scenario_id?: string;
  operator_id?: string;
  report_id: string;
  totals: { total: number; pass: number; fail: number };
  cases: ConformanceCase[];
  invariants: ConformanceInvariant[];
  failures: string[];
  evidence: string[];
  injected_fault: string | null;
  // SimB Pre-Review Gate (BX1.4) — all computed in Rust.
  pre_review_gate: boolean;
  simb_pre_review_status: "SIMB_PRE_REVIEW_PASS" | "SIMB_PRE_REVIEW_FAIL" | "SIMB_PRE_REVIEW_INCOMPLETE";
  ready_for_conformance_evidence_review: boolean;
  ready_disclaimer: string;
  certification_disclaimer: string;
  disclaimer_pt: string;
  test_only: boolean;
  llm_calls: number;
  external_model_called: boolean;
}
export interface ConformanceFixtureSet {
  note: string;
  level: string;
  fixtures: { key: string; label: string; expected: "PASS" | "FAIL"; note: string }[];
}
/** One conformance profile as the engine reports it.
 *
 * `name` is the canonical profile name, derived in Rust from
 * contracts/production/conformance-profiles.production.json. TypeScript consumes it and never
 * authors it: a second table here would drift from the registry, which is exactly how the engine
 * came to call L4 "Produção certificada" while the registry called it External Interoperability.
 *
 * `name`, `runnable` and `status` are separate on purpose. A profile is a technical capability;
 * whether the demo runner can execute it is an engine fact; neither is a certification state, an
 * operational status or a regulatory permission. */
export interface LevelInfo {
  level: string;
  runnable: boolean;
  name: string;
  status: string;
  requirements: string[];
}
export interface LevelsInfo {
  levels: LevelInfo[];
  note: string;
  /** Where the canonical profile names come from — TypeScript is not their authority. */
  profile_vocabulary_source: string;
  tool: string;
  tool_version: string;
}

type WasmModule = typeof import("@/lib/wasm/banza_conformance");
let confPromise: Promise<WasmModule> | null = null;

async function engine(): Promise<WasmModule> {
  if (!confPromise) {
    confPromise = (async () => {
      const mod = await import("@/lib/wasm/banza_conformance");
      await mod.default();
      return mod;
    })();
  }
  return confPromise;
}

/** The L0 demo fixtures (from the SimB scenarios) for the source selector. */
export async function loadConformanceFixtures(): Promise<ConformanceFixtureSet> {
  const mod = await engine();
  return JSON.parse(mod.conformance_demo_fixtures_json()) as ConformanceFixtureSet;
}

/**
 * Run the L0 demo against banza-simb. Pass `{ scenario }` to run a fixture, or `{ run }` to evaluate a
 * SimB run produced by the SimB tab. The verdict is computed entirely in Rust.
 */
export async function runL0Demo(input: { scenario: string } | { run: unknown }): Promise<L0Report> {
  const mod = await engine();
  return JSON.parse(mod.conformance_run_l0_demo_json(JSON.stringify(input))) as L0Report;
}

/** Validate a conformance report JSON (fields + disclaimer + no forbidden certification claim). */
export async function validateConformanceReport(json: string): Promise<{ ok: boolean; error?: string }> {
  const mod = await engine();
  return JSON.parse(mod.conformance_validate_report_json(json));
}

/** Level information: L0 runnable; L1–L4 are requirements/future phases (never faked as executable). */
export async function getConformanceLevels(): Promise<LevelsInfo> {
  const mod = await engine();
  return JSON.parse(mod.conformance_levels_info_json()) as LevelsInfo;
}

export async function getConformanceToolVersion(): Promise<{ tool: string; tool_version: string; protocol_version: string; scope: string; test_only: boolean }> {
  const mod = await engine();
  return JSON.parse(mod.conformance_tool_version_json());
}

/** Render-only tone for a Rust-computed status. No decision logic — pure presentation mapping. */
export function l0StatusTone(status: "PASS" | "FAIL"): "pass" | "fail" {
  return status === "PASS" ? "pass" : "fail";
}
