// Trace verifier adapter — RUST_WRAPPER_ONLY (BX1.1).
//
// Loads the Rust trace verifier compiled to WASM and marshals JSON in/out. It performs NO
// verification of its own — flow detection, the timeline and the invariant checks
// (INV-TRACE-001 / INV-LEDGER-001 / INV-STL-001) all run in Rust. The WASM artifact
// (`@/lib/wasm/banzai_trace`) is built from the in-monorepo `engines/banzai-trace` crate's
// `trace_explain_json` (`wasm-pack --target web --features wasm`) and vendored here. The crate was
// consolidated into this repo in M2.19G.6 (ADR-036) from the former banza-protocol/banzai
// `engines/banzai-core/src/trace.rs`, so the shipped WASM now has buildable in-tree source.
// Deterministic; no LLM, no network, no provider. This is technical evidence — it is NOT certification.
//
// BLOCK E2/Q3 — this module is MIXED: almost everything in it is canonical and must never be translated
// (the invariant ids INV-TRACE-001 / INV-LEDGER-001 / INV-STL-001, the engine's own `status`, the entity
// types, the demo traces' JSON literals, each fixture's stable `key`), while two things are read by a
// human and must be: the top-level technical status LABEL and the demo fixture NAMES. The `tone` is a
// rendering decision derived from the engine's verdict, not copy, so it stays locale-neutral too — which
// is what lets an English reader see a different sentence and the SAME verdict.

import type { Locale } from "@/lib/i18n";

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

/** The reader-facing copy of this module. PASS/FAIL stay verbatim — they are the engine's words. */
const TRACE_COPY = {
  "status.fail": { pt: "FAIL técnico", en: "Technical FAIL" },
  "status.pass": { pt: "PASS técnico", en: "Technical PASS" },
  "status.unknown": { pt: "Incompleto — dados insuficientes", en: "Incomplete — insufficient data" },
  "fixture.valid": { pt: "Trace válido", en: "Valid trace" },
  "fixture.settlement_fail": { pt: "Falha de settlement (INV-STL-001)", en: "Settlement failure (INV-STL-001)" },
  "fixture.trace_id_fail": { pt: "trace_id divergente (INV-TRACE-001)", en: "Divergent trace_id (INV-TRACE-001)" },
  "fixture.missing_event": { pt: "Evento em falta (ledger incompleto)", en: "Missing event (incomplete ledger)" },
} as const satisfies Record<string, Readonly<Record<Locale, string>>>;

export type TraceCopyId = keyof typeof TRACE_COPY;

/** Read one reader-facing string. `locale` is required and there is no fallback to another edition. */
export function traceCopy(id: TraceCopyId, locale: Locale): string {
  const entry = TRACE_COPY[id];
  if (!entry) throw new Error(`traceCopy: unknown id "${id}"`);
  const text = entry[locale];
  if (!text) throw new Error(`traceCopy: no ${locale} realization for "${id}"`);
  return text;
}

export function traceCopyIds(): TraceCopyId[] {
  return Object.keys(TRACE_COPY) as TraceCopyId[];
}

/**
 * Render a top-level technical status from the engine's issues + per-invariant results (no logic).
 * The VERDICT is decided here and is the same in every edition; only the sentence that states it is the
 * reader's own, so `tone` — what the UI colours and what callers branch on — never depends on `locale`.
 */
export function traceStatus(r: TraceReport, locale: Locale): { label: string; tone: TraceTone } {
  const tone = traceTone(r);
  return { label: traceCopy(TONE_COPY_ID[tone], locale), tone };
}

export type TraceTone = "pass" | "fail" | "unknown";

/**
 * The engine's verdict on a trace, decided from the report alone with NO locale in scope. Every
 * consequence — the sentence, the colour, the caller's ok/not-ok — reads this one value.
 */
export function traceTone(r: TraceReport): TraceTone {
  if (r.issues.length > 0) return "fail";
  if (r.invariant_checks.length > 0 && r.invariant_checks.every((c) => c.status === "PASS")) return "pass";
  return "unknown";
}

/** The id of the sentence that states a verdict. Realizing it is the only per-edition step. */
export const TONE_COPY_ID: Readonly<Record<TraceTone, TraceCopyId>> = {
  pass: "status.pass",
  fail: "status.fail",
  unknown: "status.unknown",
};

// ── Demo fixtures (each triggers a distinct, honest engine result) ────────────

// The fixtures carry their stable `key` and their canonical trace JSON — both locale-neutral facts — plus
// the id of the name a reader sees. `traceFixtureLabel` turns that id into the reader's language.
export const TRACE_FIXTURES: { key: string; labelId: TraceCopyId; trace: unknown }[] = [
  {
    key: "valid",
    labelId: "fixture.valid",
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
    labelId: "fixture.settlement_fail", // Falha de settlement (INV-STL-001)",
    trace: {
      trace_id: "tr_demo",
      qr: { entity_id: "qr_1", type: "qr", trace_id: "tr_demo", status: "paid", amount_minor: 5000, currency: "AOA" },
      // net + fee = 4950 + 100 = 5050 ≠ gross 5000 → money creation → INV-STL-001 FAIL
      transfer: { entity_id: "txf_1", type: "transfer", trace_id: "tr_demo", gross_minor: 5000, net_minor: 4950, fee_minor: 100, status: "completed", currency: "AOA" },
    },
  },
  {
    key: "trace_id_fail",
    labelId: "fixture.trace_id_fail", // trace_id divergente (INV-TRACE-001)",
    trace: {
      trace_id: "tr_demo",
      qr: { entity_id: "qr_1", type: "qr", trace_id: "tr_demo", status: "paid", amount_minor: 5000, currency: "AOA" },
      // transfer carries a different trace_id → propagation broken → INV-TRACE-001 FAIL
      transfer: { entity_id: "txf_1", type: "transfer", trace_id: "tr_OUTRO", gross_minor: 5000, net_minor: 4950, fee_minor: 50, status: "completed", currency: "AOA" },
    },
  },
  {
    key: "missing_event",
    labelId: "fixture.missing_event", // Evento em falta (ledger incompleto)",
    trace: {
      trace_id: "tr_demo",
      // a transfer with no matching ledger entries → INV-LEDGER-001 cannot verify double-entry
      transfer: { entity_id: "txf_1", type: "transfer", trace_id: "tr_demo", gross_minor: 5000, net_minor: 4950, fee_minor: 50, status: "completed", currency: "AOA" },
    },
  },
];

/** The reader-facing name of a demo fixture, in the reader's language. */
export function traceFixtureLabel(key: string, locale: Locale): string {
  const f = TRACE_FIXTURES.find((x) => x.key === key);
  if (!f) throw new Error(`traceFixtureLabel: unknown fixture "${key}"`);
  return traceCopy(f.labelId, locale);
}
