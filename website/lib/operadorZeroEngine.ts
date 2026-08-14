// Operador Zero engine adapter (ADR-035, M2.12B). RUST_WRAPPER_ONLY.
//
// Thin I/O glue over `engines/operator-zero-core`, built to web WASM
// (`wasm-pack build --target web -- --features wasm`) and vendored at @/lib/wasm/operator_zero_core.
// EVERY simulator decision — the fictional ledger, the QR payment, the refund, reconciliation, the
// demo trust verdict, the demo federation verdict, the evidence state, the next action and the slug
// labels — is computed in Rust (ADR-038). This file shuttles JSON and nothing else: no arithmetic,
// no verdict, no label map, no fallback wording.
//
// The engine is deterministic (no clock, no randomness, no network), so a run in the browser and a
// run in `cargo test` produce byte-identical output. That is what makes a browser run usable as
// evidence rather than as a demo animation.

type WasmModule = typeof import("@/lib/wasm/operator_zero_core");
let zPromise: Promise<WasmModule> | null = null;

async function engine(): Promise<WasmModule> {
  if (!zPromise) {
    zPromise = (async () => {
      const mod = await import("@/lib/wasm/operator_zero_core");
      await mod.default();
      return mod;
    })();
  }
  return zPromise;
}

/** One step of the end-to-end simulation, exactly as Rust emits it. */
export interface ZeroStep {
  step: string;
  artifact_type: string;
  ok: boolean;
  status?: string;
  status_label?: string;
  payment_status?: string;
  payment_status_label?: string;
  refund_status?: string;
  refund_status_label?: string;
  amount?: number;
  refunded?: number;
  currency?: string;
  error?: { code?: string; label?: string } | null;
}

/** The whole run. Field names mirror `sim::run_e2e` — renaming any of them here would be a second
 *  vocabulary, which is the exact defect `make operator-zero-vocabulary-contract-check` exists for. */
export interface ZeroTrace {
  operator_id: string;
  operator_display_name: string;
  demo_only: boolean;
  monetary_value: boolean;
  production_allowed: boolean;
  currency: string;
  scenario: string;
  steps: ZeroStep[];
  ledger: {
    accounts: { account_id: string; display_name: string; balance: number; currency: string; is_settlement: boolean }[];
    total: number;
    ledger_status: string;
    currency: string;
  };
  reconciliation: { status: string; status_label: string; opening_total: number; closing_total: number; movements: number };
  evidence_status: string;
  evidence_status_label: string;
  next_action: string;
  next_action_label: string;
  blockers: { step: string; status: string | null }[];
  complete: boolean;
  note: string;
}

export interface ZeroIdentity {
  operator_id: string;
  operator_display_name: string;
  short_description: string;
  demo_only: boolean;
  monetary_value: boolean;
  production_allowed: boolean;
  currency: string;
  is_bank: boolean;
  is_psp: boolean;
  is_wallet: boolean;
  is_licensed_financial_operator: boolean;
  moves_real_money: boolean;
  boundary: string;
  principle: string;
}

/** Run the simulator end to end. `happy = false` runs the negative scenario (real blockers). */
export async function runOperadorZeroE2E(happy: boolean): Promise<ZeroTrace> {
  const e = await engine();
  return JSON.parse(e.operator_zero_e2e_json(happy)) as ZeroTrace;
}

export async function operadorZeroIdentity(): Promise<ZeroIdentity> {
  const e = await engine();
  return JSON.parse(e.operator_zero_identity_json()) as ZeroIdentity;
}

/** The canonical slug vocabulary, by group. The contract guard EXECUTES this. */
export async function operadorZeroVocabulary(): Promise<Record<string, string[]>> {
  const e = await engine();
  return JSON.parse(e.operator_zero_vocabulary_json()) as Record<string, string[]>;
}

/**
 * The Portuguese label for a slug. Rust owns every word; an unknown slug returns "" so an unmapped
 * value stays visible instead of being dressed up as a real one. Callers must render the slug when
 * this is empty — never a friendly placeholder.
 */
export async function operadorZeroLabel(slug: string): Promise<string> {
  const e = await engine();
  return e.operator_zero_label(slug);
}

/** Check artifacts against the demo boundary (fail-closed, in Rust). */
export async function operadorZeroBoundary(
  artifacts: { name: string; artifact: unknown }[],
): Promise<{ status: string; status_label: string; intact: boolean; artifacts_checked: number; violations: { status: string; status_label: string; path: string; detail: string }[] }> {
  const e = await engine();
  return JSON.parse(e.operator_zero_boundary_json(JSON.stringify(artifacts)));
}

/** The SAFE one-line summary BanzAI may receive: slugs and counts only, never balances or names. */
export async function operadorZeroSafeSummary(trace: ZeroTrace): Promise<string> {
  const e = await engine();
  return e.operator_zero_safe_summary(JSON.stringify(trace));
}
