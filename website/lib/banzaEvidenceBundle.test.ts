import { describe, it, expect } from "vitest";
import { readinessTone, type BundleReadiness } from "./banzaEvidenceBundle";

// BX1.5 — the bundle adapter's pure part (render-only readiness→tone). The readiness verdict, the
// required/missing artifacts and the SHA-256 hashes all run in Rust (banza-evidence-bundle) — covered by
// that crate's cargo test and the browser E2E. TS never decides readiness.
describe("readinessTone (render-only mapping)", () => {
  const cases: [BundleReadiness, string][] = [
    ["READY_FOR_TECHNICAL_REVIEW", "pass"],
    ["BLOCKED_BY_SIMB", "fail"],
    ["BLOCKED_BY_CONFORMANCE", "fail"],
    ["INCOMPLETE", "warn"],
    ["NOT_READY", "unknown"],
  ];
  for (const [r, tone] of cases) {
    it(`${r} → ${tone}`, () => expect(readinessTone(r)).toBe(tone));
  }
});
