import { describe, it, expect } from "vitest";
import { STEPS, STEP_ORDER } from "./validationJourney";
import { stepBlurb, stepTitle } from "./validationPresentation";
import { VALIDATION_STEP_IDS } from "@/lib/banzaiValidation";

// M2.19E/F.2 — the single BanzAI validation mode runs the deterministic 9-step journey. This asserts the
// pure step catalogue only (no hooks, no DOM, no WASM): the Rust/WASM engines are exercised by their own
// cargo tests + the browser E2E. The 9 ids and their order are the canonical contract shared with
// banzaiValidation.ts (VALIDATION_STEP_IDS) and the single-interface guard.
const CANONICAL_IDS = [
  "discovery",
  "manifest",
  "keys",
  "conformance",
  "interoperability",
  "trust",
  "federation",
  "evidence",
  "certification",
] as const;

describe("validationJourney STEPS — canonical 9-step contract", () => {
  it("has exactly 9 steps", () => {
    expect(STEPS).toHaveLength(9);
  });

  it("lists the 9 canonical ids in the canonical order", () => {
    expect(STEPS.map((s) => s.id)).toEqual([...CANONICAL_IDS]);
  });

  it("numbers the steps 1..9 in order", () => {
    expect(STEPS.map((s) => s.num)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("STEP_ORDER matches VALIDATION_STEP_IDS (single source of truth)", () => {
    expect([...STEP_ORDER]).toEqual([...VALIDATION_STEP_IDS]);
    expect([...VALIDATION_STEP_IDS]).toEqual([...CANONICAL_IDS]);
  });

  it("every step carries an engine and a reader-facing name and description, in both editions", () => {
    // Block E2/Q5 — the title and the blurb are looked up BY STEP ID rather than stored on the step, so
    // this asserts the binding rather than the presence of two fields on one object.
    for (const s of STEPS) {
      expect(s.engine.length).toBeGreaterThan(0);
      for (const locale of ["pt", "en"] as const) {
        expect(stepTitle(s.id, locale).length, `${s.id} title/${locale}`).toBeGreaterThan(0);
        expect(stepBlurb(s.id, locale).length, `${s.id} blurb/${locale}`).toBeGreaterThan(0);
      }
    }
  });
});
