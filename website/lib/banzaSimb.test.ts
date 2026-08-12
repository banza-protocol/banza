import { describe, it, expect } from "vitest";
import { simbStatusTone, deriveSimbPreReviewState, type SimbRun } from "./banzaSimb";
import { l0StatusTone } from "./banzaConformance";

// BX1.4 — the pre-review state mapper is render-only: it maps the Rust-computed pre_review_status to a
// UI state. The verdict itself (PASS/FAIL/INCOMPLETE) comes from Rust; TS never decides it.
const run = (over: Partial<SimbRun>): SimbRun => ({
  scenario_id: "valid_l0", label: "x", mode: "demo", operator_id: "SIM-A", test_only: true,
  marker: "TEST ONLY", injected_fault: null, events: [], ledger_entries: [], balances: [],
  idempotency_results: [], settlement_summary: null, trace_summary: { trace_ids: [], count: 0 },
  invariant_checks: [], status: "PASS", pre_review_gate: true, pre_review_status: "SIMB_PRE_REVIEW_PASS",
  not_a_certificate: true, required_before_banza_ca_review: true, disclaimer: "d", warnings: [],
  tool: "banza-simb", tool_version: "0.1.0", llm_calls: 0, external_model_called: false, ...over,
});

describe("deriveSimbPreReviewState (render-only mapping)", () => {
  it("maps the Rust pre_review_status to the UI state", () => {
    expect(deriveSimbPreReviewState(run({ pre_review_status: "SIMB_PRE_REVIEW_PASS" }), "t").status).toBe("pass");
    expect(deriveSimbPreReviewState(run({ pre_review_status: "SIMB_PRE_REVIEW_FAIL" }), "t").status).toBe("fail");
    expect(deriveSimbPreReviewState(run({ pre_review_status: "SIMB_PRE_REVIEW_INCOMPLETE" }), "t").status).toBe("incomplete");
  });
  it("collects failed invariants", () => {
    const st = deriveSimbPreReviewState(run({
      pre_review_status: "SIMB_PRE_REVIEW_FAIL",
      invariant_checks: [
        { id: "INV-LEDGER-001", name: "n", status: "FAIL", reason: "r" },
        { id: "INV-IDEM-001", name: "n", status: "PASS", reason: "r" },
      ],
    }), "t");
    expect(st.failed_invariants).toEqual(["INV-LEDGER-001"]);
  });
});

// BX1.3 — the SimB/Conformance adapters' pure parts (render-only status→tone). The simulation, the
// ledger/idempotency/settlement invariants AND the PASS/FAIL verdict all run in Rust (banza-simb /
// banza-conformance) — covered by those crates' `cargo test` and the browser E2E. TS never decides.

describe("simbStatusTone / l0StatusTone (rendering only — no logic)", () => {
  it("PASS → pass, FAIL → fail", () => {
    expect(simbStatusTone("PASS")).toBe("pass");
    expect(simbStatusTone("FAIL")).toBe("fail");
    expect(l0StatusTone("PASS")).toBe("pass");
    expect(l0StatusTone("FAIL")).toBe("fail");
  });
});
