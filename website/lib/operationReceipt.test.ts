import { describe, it, expect } from "vitest";
import { aggregateStatus, buildReceipt, contentHash, type StepOutcome } from "./operationReceipt";

// M2.19E/F (ADR-067) — every validation step emits an OperationReceipt; Qwen never decides, so
// qwen_calls/external_calls are 0 by construction, and hashes are content-addressed.
describe("operationReceipt", () => {
  it("aggregateStatus is worst-first (FAILED > BLOCKED > PENDING > VERIFIED)", () => {
    expect(aggregateStatus(["VERIFIED", "VERIFIED"])).toBe("VERIFIED");
    expect(aggregateStatus(["VERIFIED", "PENDING"])).toBe("PENDING");
    expect(aggregateStatus(["VERIFIED", "BLOCKED", "PENDING"])).toBe("BLOCKED");
    expect(aggregateStatus(["VERIFIED", "FAILED", "BLOCKED"])).toBe("FAILED");
    expect(aggregateStatus([])).toBe("NOT_EVALUATED");
  });

  it("contentHash is a stable content-addressed digest", async () => {
    const a = await contentHash({ x: 1, y: [2, 3] });
    const b = await contentHash({ x: 1, y: [2, 3] });
    const c = await contentHash({ x: 1, y: [2, 4] });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^(sha256:|fnv1a32:)/);
  });

  it("buildReceipt fixes qwen_calls:0 / external_calls:0 and carries the Rust verdict", async () => {
    const outcome: StepOutcome = {
      status: "VERIFIED",
      engine: "banza-conformance",
      engine_version: "1.0",
      duration_ms: 12,
      inputs: { manifest: { id: "operator-zero" } },
      result: { pass: true },
      reason_codes: ["OK_L0"],
      outputs: { report_id: "r1" },
      evidence_references: ["/conformance/evidence.json"],
    };
    const r = await buildReceipt({ workflow: "full", step: "conformance", request_id: "req-1", outcome });
    expect(r.qwen_calls).toBe(0);
    expect(r.external_calls).toBe(0);
    expect(r.actor).toBe("banzai-web");
    expect(r.target).toBe("operator-zero");
    expect(r.status).toBe("VERIFIED");
    expect(r.engine).toBe("banza-conformance");
    expect(Object.keys(r.input_hashes).length).toBeGreaterThan(0);
    expect(r.operation_id).toMatch(/^op/);
  });
});
