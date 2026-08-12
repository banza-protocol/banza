// SimB adapter — RUST_WRAPPER_ONLY (BX1.3).
//
// Loads the Rust BANZA operator simulator (`banza-simb`) compiled to WASM and marshals JSON in/out.
// It performs NO simulation or checking of its own: the ledger, the idempotency logic, the settlement
// identity AND the technical PASS/FAIL status all run in Rust (banza-simb `scenario`). TypeScript
// cannot simulate a ledger, evaluate an invariant, or decide a status — it only calls the engine and
// renders what it returns. The WASM artifact (`@/lib/wasm/banza_simb`) is built from
// `engines/banza-simb` with `wasm-pack build --features wasm --target web` and vendored here.
// Deterministic; no LLM, no network, no provider, no real funds, no operator added to /operators.
//
// This is a TEST-ONLY local simulator — it does not move real funds and does not represent a certified
// operator.

export interface SimbCheck {
  id: string;
  name: string;
  status: "PASS" | "FAIL";
  reason: string;
}
export interface SimbLedgerEntry {
  wallet_id: string;
  kind: string;
  amount_minor: number;
  currency: string;
  trace_id: string;
}
export interface SimbIdemRecord {
  key: string;
  transfer_id: string;
  replay: boolean;
  response: string;
}
export interface SimbSettlementSummary {
  id: string;
  wallet_id: string;
  gross_minor: number;
  fee_minor: number;
  net_minor: number;
  currency: string;
  tx_count: number;
  identity_ok: boolean;
}
export interface SimbRun {
  scenario_id: string;
  label: string;
  mode: string;
  operator_id: string;
  test_only: boolean;
  marker: string;
  injected_fault: string | null;
  events: string[];
  ledger_entries: SimbLedgerEntry[];
  balances: { wallet_id: string; balance_minor: number }[];
  idempotency_results: SimbIdemRecord[];
  settlement_summary: SimbSettlementSummary | null;
  trace_summary: { trace_ids: string[]; count: number };
  invariant_checks: SimbCheck[];
  status: "PASS" | "FAIL";
  // SimB Pre-Review Gate (BX1.4) — all computed in Rust.
  pre_review_gate: boolean;
  pre_review_status: "SIMB_PRE_REVIEW_PASS" | "SIMB_PRE_REVIEW_FAIL" | "SIMB_PRE_REVIEW_INCOMPLETE";
  not_a_certificate: boolean;
  required_before_banza_ca_review: boolean;
  disclaimer: string;
  warnings: string[];
  tool: string;
  tool_version: string;
  llm_calls: number;
  external_model_called: boolean;
}

/** Browser-local pre-review state (BX1.4). Not persisted, never sent to a server, never a certificate. */
export interface SimbPreReviewState {
  status: "not_started" | "running" | "pass" | "fail" | "incomplete";
  scenario_id?: string;
  report_id?: string;
  failed_invariants: string[];
  created_at?: string;
  tool_version?: string;
  disclaimer: string;
}

/** Derive the pre-review state from a Rust SimB run. The verdict comes from Rust; this only maps it. */
export function deriveSimbPreReviewState(run: SimbRun, createdAt: string): SimbPreReviewState {
  const map: Record<string, SimbPreReviewState["status"]> = {
    SIMB_PRE_REVIEW_PASS: "pass",
    SIMB_PRE_REVIEW_FAIL: "fail",
    SIMB_PRE_REVIEW_INCOMPLETE: "incomplete",
  };
  return {
    status: map[run.pre_review_status] ?? "incomplete",
    scenario_id: run.scenario_id,
    failed_invariants: run.invariant_checks.filter((c) => c.status === "FAIL").map((c) => c.id),
    created_at: createdAt,
    tool_version: run.tool_version,
    disclaimer: run.disclaimer,
  };
}
export interface SimbScenarioSet {
  marker: string;
  scenarios: { key: string; label: string; expected: string }[];
}

type WasmModule = typeof import("@/lib/wasm/banza_simb");
let simbPromise: Promise<WasmModule> | null = null;

async function engine(): Promise<WasmModule> {
  if (!simbPromise) {
    simbPromise = (async () => {
      const mod = await import("@/lib/wasm/banza_simb");
      await mod.default();
      return mod;
    })();
  }
  return simbPromise;
}

/** The deterministic TEST-ONLY demo scenarios (from Rust). */
export async function loadSimbScenarios(): Promise<SimbScenarioSet> {
  const mod = await engine();
  return JSON.parse(mod.simb_demo_scenarios_json()) as SimbScenarioSet;
}

/** Run a demo scenario; the technical PASS/FAIL and all artifacts come from Rust. */
export async function runSimbScenario(scenario: string): Promise<SimbRun> {
  const mod = await engine();
  return JSON.parse(mod.simb_run_scenario_json(JSON.stringify({ scenario }))) as SimbRun;
}

/** A safe TEST-ONLY federation demo (route + idempotent replay + netting). No trust/keys/funds. */
export async function runSimbFederationDemo(): Promise<unknown> {
  const mod = await engine();
  return JSON.parse(mod.simb_federation_demo_json("{}"));
}

export async function getSimbToolVersion(): Promise<{ tool: string; tool_version: string; marker: string; test_only: boolean; kind: string }> {
  const mod = await engine();
  return JSON.parse(mod.simb_tool_version_json());
}

/** Render-only tone for a Rust-computed status. No decision logic — pure presentation mapping. */
export function simbStatusTone(status: "PASS" | "FAIL"): "pass" | "fail" {
  return status === "PASS" ? "pass" : "fail";
}
