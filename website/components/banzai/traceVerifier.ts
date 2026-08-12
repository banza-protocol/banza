// Trace verifier adapter — RUST_WRAPPER_ONLY (BX1.1).
//
// Loads the Rust trace verifier compiled to WASM and marshals JSON in/out. It performs NO
// verification of its own — flow detection, the timeline and the invariant checks
// (INV-TRACE-001 / INV-LEDGER-001 / INV-STL-001) all run in Rust. The WASM artifact
// (`@/lib/wasm/banzai_trace`) is built from the in-monorepo `engines/banzai-trace` crate's
// `trace_explain_json` (`wasm-pack --target web --features wasm`) and vendored here. The crate was
// consolidated into this repo in M2.19G.6 (ADR-075) from the former banza-protocol/banzai
// `engines/banzai-core/src/trace.rs`, so the shipped WASM now has buildable in-tree source.
// Deterministic; no LLM, no network, no provider. This is technical evidence — it is NOT certification.

export interface TraceInvariantCheck {
  id: string;
  name: string;
  status: "PASS" | "FAIL" | "UNKNOWN";
  reason: string;
}
export interface TraceTimelineEntry {
  step: number;
  entity_type: string;
  entity_id: string;
  timestamp?: string;
  detail: string;
  trace_id?: string;
}
export interface TraceReport {
  trace_id: string | null;
  flow_type: string;
  event_count: number;
  timeline: TraceTimelineEntry[];
  invariant_checks: TraceInvariantCheck[];
  causal_summary: string;
  issues: string[];
}

type WasmModule = typeof import("@/lib/wasm/banzai_trace");
let corePromise: Promise<WasmModule> | null = null;

async function core(): Promise<WasmModule> {
  if (!corePromise) {
    corePromise = (async () => {
      const mod = await import("@/lib/wasm/banzai_trace");
      // wasm-pack (--target web): the .wasm asset is loaded via `new URL(..., import.meta.url)`.
      await mod.default();
      return mod;
    })();
  }
  return corePromise;
}

/** Verify a trace with the Rust engine (WASM). `trace` is the raw trace JSON (array or object). */
export async function verifyTrace(trace: unknown): Promise<TraceReport> {
  const mod = await core();
  // banzai-trace `explain_trace` expects `{ trace_id?, trace? }`.
  return JSON.parse(mod.trace_explain_json(JSON.stringify({ trace }), undefined)) as TraceReport;
}

/** Render a top-level technical status from the engine's issues + per-invariant results (no logic). */
export function traceStatus(r: TraceReport): { label: string; tone: "pass" | "fail" | "unknown" } {
  if (r.issues.length > 0) return { label: "FAIL técnico", tone: "fail" };
  if (r.invariant_checks.length > 0 && r.invariant_checks.every((c) => c.status === "PASS"))
    return { label: "PASS técnico", tone: "pass" };
  return { label: "Incompleto — dados insuficientes", tone: "unknown" };
}

// ── Demo fixtures (each triggers a distinct, honest engine result) ────────────

export const TRACE_FIXTURES: { key: string; label: string; trace: unknown }[] = [
  {
    key: "valid",
    label: "Trace válido",
    // Array form (each event keeps its own type): qr → transfer → matching DEBIT + CREDIT ledger
    // entries. All invariants PASS: INV-TRACE-001 (shared trace_id), INV-STL-001 (net+fee=gross),
    // INV-LEDGER-001 (one DEBIT + one CREDIT for one transfer).
    trace: [
      { entity_id: "qr_1", type: "qr", trace_id: "tr_demo", status: "paid", amount_minor: 5000, currency: "AOA" },
      { entity_id: "txf_1", type: "transfer", trace_id: "tr_demo", gross_minor: 5000, net_minor: 4950, fee_minor: 50, status: "completed", currency: "AOA" },
      { entity_id: "led_1", type: "DEBIT", trace_id: "tr_demo", amount_minor: 5000 },
      { entity_id: "led_2", type: "CREDIT", trace_id: "tr_demo", amount_minor: 5000 },
    ],
  },
  {
    key: "settlement_fail",
    label: "Falha de settlement (INV-STL-001)",
    trace: {
      trace_id: "tr_demo",
      qr: { entity_id: "qr_1", type: "qr", trace_id: "tr_demo", status: "paid", amount_minor: 5000, currency: "AOA" },
      // net + fee = 4950 + 100 = 5050 ≠ gross 5000 → money creation → INV-STL-001 FAIL
      transfer: { entity_id: "txf_1", type: "transfer", trace_id: "tr_demo", gross_minor: 5000, net_minor: 4950, fee_minor: 100, status: "completed", currency: "AOA" },
    },
  },
  {
    key: "trace_id_fail",
    label: "trace_id divergente (INV-TRACE-001)",
    trace: {
      trace_id: "tr_demo",
      qr: { entity_id: "qr_1", type: "qr", trace_id: "tr_demo", status: "paid", amount_minor: 5000, currency: "AOA" },
      // transfer carries a different trace_id → propagation broken → INV-TRACE-001 FAIL
      transfer: { entity_id: "txf_1", type: "transfer", trace_id: "tr_OUTRO", gross_minor: 5000, net_minor: 4950, fee_minor: 50, status: "completed", currency: "AOA" },
    },
  },
  {
    key: "missing_event",
    label: "Evento em falta (ledger incompleto)",
    trace: {
      trace_id: "tr_demo",
      // a transfer with no matching ledger entries → INV-LEDGER-001 cannot verify double-entry
      transfer: { entity_id: "txf_1", type: "transfer", trace_id: "tr_demo", gross_minor: 5000, net_minor: 4950, fee_minor: 50, status: "completed", currency: "AOA" },
    },
  },
];
