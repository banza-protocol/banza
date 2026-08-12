import { describe, it, expect } from "vitest";
import { manifestStatusTone, type ManifestStatus } from "./banzaOperatorManifest";

// BX1.6 — the manifest adapter's pure part (render-only status→tone). The field/type/URL checks, the
// safety invariant, the status AND readiness all run in Rust (banza-operator-manifest) — covered by that
// crate's cargo test and the browser E2E. TS never decides validity.
describe("manifestStatusTone (render-only mapping)", () => {
  const cases: [ManifestStatus, string][] = [
    ["VALID", "pass"],
    ["INVALID", "fail"],
    ["MALFORMED", "fail"],
    ["INCOMPLETE", "warn"],
  ];
  for (const [s, tone] of cases) {
    it(`${s} → ${tone}`, () => expect(manifestStatusTone(s)).toBe(tone));
  }
});
