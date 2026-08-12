import { describe, it, expect } from "vitest";
import { TRACE_FIXTURES, traceStatus, type TraceReport } from "./traceVerifier";

// BX1.1 — the trace-adapter's pure parts (fixtures + display-status derivation). The actual Rust/WASM
// verification is covered by banzai-core's cargo golden tests and by the browser E2E; here we guard the
// demo fixtures and the status mapping (issues → FAIL, all-PASS → PASS, else → incomplete).

const base = (over: Partial<TraceReport>): TraceReport => ({
  trace_id: "tr_x",
  flow_type: "qr_payment",
  event_count: 2,
  timeline: [],
  invariant_checks: [],
  causal_summary: "",
  issues: [],
  ...over,
});

describe("trace demo fixtures", () => {
  it("exposes the 4 demo fixtures with stable keys", () => {
    expect(TRACE_FIXTURES.map((f) => f.key)).toEqual([
      "valid", "settlement_fail", "trace_id_fail", "missing_event",
    ]);
    for (const f of TRACE_FIXTURES) {
      expect(typeof f.label).toBe("string");
      expect(f.trace).toBeTypeOf("object");
    }
  });
});

describe("traceStatus display mapping (rendering only)", () => {
  it("any issue → FAIL técnico", () => {
    const s = traceStatus(base({ issues: ["INV-STL-001 FAIL on txf_1"], invariant_checks: [{ id: "INV-STL-001", name: "n", status: "FAIL", reason: "r" }] }));
    expect(s.tone).toBe("fail");
    expect(s.label).toContain("FAIL");
  });
  it("all checks PASS, no issues → PASS técnico", () => {
    const s = traceStatus(base({ invariant_checks: [{ id: "INV-TRACE-001", name: "n", status: "PASS", reason: "r" }] }));
    expect(s.tone).toBe("pass");
    expect(s.label).toContain("PASS");
  });
  it("only UNKNOWN, no issues → incompleto", () => {
    const s = traceStatus(base({ invariant_checks: [{ id: "INV-LEDGER-001", name: "n", status: "UNKNOWN", reason: "r" }] }));
    expect(s.tone).toBe("unknown");
  });
});
