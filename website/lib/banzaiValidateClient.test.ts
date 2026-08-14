import { describe, it, expect } from "vitest";
import { validateStepRequest, validateJourneyRequest } from "./banzaiValidateClient";

// M2.19G.1 (ADR-034 §4.7) — the client only ever sends CLOSED ids. A malformed/injected id is rejected
// BEFORE any request is made (defence in depth over the Rust re-resolution), so no fetch is attempted.
describe("banzaiValidateClient — closed-id guard (SSRF-safe, no URL ever sent)", () => {
  it("rejects a malformed/injected operator or implementation id without a network call", async () => {
    for (const [op, impl] of [
      ["../secret", "operator-zero-ref-impl"],
      ["operator-zero", "https://attacker.example/x"],
      ["javascript:alert(1)", "operator-zero-ref-impl"],
      ["", ""],
      ["OPERATOR-ZERO", "operator-zero-ref-impl"],
    ] as const) {
      const step = await validateStepRequest(op, impl, "manifest");
      expect(step.ok).toBe(false);
      if (!step.ok) expect(step.error).toBe("invalid_target");
      const journey = await validateJourneyRequest(op, impl);
      expect(journey.ok).toBe(false);
      if (!journey.ok) expect(journey.error).toBe("invalid_target");
    }
  });
});
