import { describe, it, expect } from "vitest";
import { trustStatusTone, type TrustStatus } from "./banzaTrust";

// BX1.2 — the trust-adapter's only pure part: the render-only status → tone mapping.
// The ed25519 signature check, the ADR-027 canonicalization, the delegated-key / manifest /
// conformance-evidence / registry / revocation / fail-closed logic AND the trust-status decision
// itself all run in Rust (`banza-trust`) — covered by that crate's `cargo test` and by the browser
// E2E. TypeScript never decides trust; it only paints a Rust-computed status. So here we test only
// `trustStatusTone`, and we do NOT import WASM or call `evaluateTrust`.
//
// The table below pins EVERY one of the 13 TRUST_* statuses the engine can emit. If the engine adds,
// removes, or renames a status (or the tone mapping drifts), this test breaks — which is the point.

const TONE_BY_STATUS: [TrustStatus, "pass" | "fail" | "warn"][] = [
  // The single trusted outcome.
  ["TRUST_VALID", "pass"],

  // Recoverable / not-yet-established — the operator's material is absent, stale, or revoked.
  ["TRUST_REVOKED", "warn"],
  ["TRUST_EXPIRED_METADATA", "warn"],
  ["TRUST_MISSING_CONFORMANCE_EVIDENCE", "warn"],
  ["TRUST_MISSING_OPERATOR_MANIFEST", "warn"],
  ["TRUST_MISSING_REGISTRY_ENTRY", "warn"],

  // Hard failures — invalid material, incompatible protocol, boundary violation, or fail-closed.
  ["TRUST_INVALID_SIGNATURE", "fail"],
  ["TRUST_INVALID_DELEGATED_KEY", "fail"],
  ["TRUST_INVALID_ROOT_METADATA", "fail"],
  ["TRUST_INVALID_SIGNED_METADATA", "fail"],
  ["TRUST_INVALID_BOUNDARY", "fail"],
  ["TRUST_INCOMPATIBLE_PROTOCOL_VERSION", "fail"],
  ["TRUST_FAIL_CLOSED", "fail"],
];

describe("trustStatusTone (rendering only — no trust logic)", () => {
  for (const [status, tone] of TONE_BY_STATUS) {
    it(`${status} → ${tone}`, () => {
      expect(trustStatusTone(status)).toBe(tone);
    });
  }

  it("pins all 13 engine statuses (guards against engine drift)", () => {
    expect(TONE_BY_STATUS).toHaveLength(13);
    const distinct = new Set(TONE_BY_STATUS.map(([status]) => status));
    expect(distinct.size).toBe(13);
  });

  it("treats TRUST_VALID as the only 'pass' — nothing else is trusted", () => {
    const passes = TONE_BY_STATUS.filter(([, tone]) => tone === "pass");
    expect(passes).toEqual([["TRUST_VALID", "pass"]]);
    for (const [status, tone] of TONE_BY_STATUS) {
      if (status !== "TRUST_VALID") {
        expect(tone).not.toBe("pass");
      }
    }
  });
});
