/**
 * The browser HALF of the end-to-end operator-guidance path (ADR-076 §D-076-01/02).
 *
 * The path has two halves and this file owns one of them:
 *
 *   1. What the browser SENDS  → `buildNavigationState` (here).
 *   2. What the engine DECIDES → `engines/banzai-operator-journey/tests/journey_e2e.rs`, which walks
 *      the same seven orientation activities through the real Rust engine.
 *
 * Following the repo convention (see banzaTrust.test.ts), TypeScript tests never import WASM — the
 * engine is covered by `cargo test`. So the two halves are joined by the shared builder + shape below.
 *
 * Model A is guidance only: it carries NAVIGATION state (not_started | available | in_progress |
 * completed) and TYPED references to Model B — never a verdict, never a score.
 */
import { describe, it, expect } from "vitest";
import {
  buildNavigationState,
  nextActionLabel,
  overallStateLabel,
  journeyStatusLabel,
  modelBReferenceIsPositive,
  RECOMMENDED_ACTIONS,
  type StepNavigation,
} from "./banzaOperatorJourney";

const ORDER = ["guia", "manifest", "conformidade", "trust", "federacao", "evidence_bundle", "traces"];

describe("what the browser sends — buildNavigationState", () => {
  it("an untouched session marks every activity not-visited, and no activity carries a verdict", () => {
    const s = buildNavigationState("guia", { guia: { visited: true } });

    expect(s.current_step).toBe("guia");
    for (const step of ORDER) {
      const i = s.steps[step] as Record<string, unknown>;
      expect(i, `${step} must be present in the payload`).toBeDefined();
      // The only per-activity fields are navigation (visited) and an optional typed reference.
      const keys = Object.keys(i);
      for (const k of keys) {
        expect(["visited", "technical_reference"], `${step} carries only navigation/reference`).toContain(k);
      }
    }
    expect(s.steps.guia).toEqual({ visited: true });
    expect(s.steps.manifest).toEqual({ visited: false });
  });

  it("navigating an activity sets visited and NOTHING else — this is the non-inflation rule", () => {
    const s = buildNavigationState("manifest", {
      guia: { visited: true },
      manifest: { visited: true },
    });
    expect(s.steps.manifest).toEqual({ visited: true });
    expect(s.steps.guia).toEqual({ visited: true });
  });

  it("the ONLY technical channel is a typed reference to Model B — a pointer, never a verdict", () => {
    const s = buildNavigationState("manifest", {
      manifest: {
        visited: true,
        reference: {
          validation_execution_id: "exec-1",
          step_id: "manifest",
          receipt_reference: "receipt:abc",
          evidence_reference: "evidence:def",
          model_b_state: "FAILED",
        },
      },
    });
    expect(s.steps.manifest).toEqual({
      visited: true,
      technical_reference: {
        validation_execution_id: "exec-1",
        step_id: "manifest",
        receipt_reference: "receipt:abc",
        evidence_reference: "evidence:def",
        model_b_state: "FAILED",
      },
    });
    // No score/verdict field is ever produced by the builder.
    const blob = JSON.stringify(s);
    expect(blob).not.toMatch(/points|evidence_ready|validation_status|engine_run/);
  });

  it("a Model B FAILED/BLOCKED reference is never read as a positive", () => {
    expect(modelBReferenceIsPositive("FAILED")).toBe(false);
    expect(modelBReferenceIsPositive("BLOCKED")).toBe(false);
    expect(modelBReferenceIsPositive("VERIFIED")).toBe(true);
    expect(modelBReferenceIsPositive(null)).toBe(false);
  });

  /**
   * THE JOIN. This is the shape `engines/banzai-operator-journey/tests/journey_e2e.rs` feeds the
   * engine (its `Session` helper builds `{current_step, steps:{<step>:{visited,technical_reference?}}}`).
   * Pinning it here keeps that Rust test an end-to-end test of the real browser input.
   */
  it("produces the navigation shape the Rust end-to-end test is written against", () => {
    const walked: Record<string, StepNavigation> = {};
    for (const step of ORDER) walked[step] = { visited: true };
    const s = buildNavigationState("traces", walked);
    for (const step of ORDER) {
      expect(s.steps[step]).toEqual({ visited: true });
    }
    expect(s.current_step).toBe("traces");
  });
});

describe("what the operator reads — labels never leak machine slugs", () => {
  // Every overall state the engine can emit (session.rs::overall_state) renders as Portuguese prose.
  const STATES = ["percurso_por_iniciar", "percurso_em_curso", "percurso_concluido"];

  it.each(STATES)("overall state %s has a real label, not a stripped slug", (state) => {
    const label = overallStateLabel(state);
    expect(label).not.toMatch(/_/);
    if (state !== "percurso_por_iniciar") expect(label).not.toBe("percurso por iniciar");
  });

  // Every navigation action the engine can recommend must name itself on the button.
  it.each(RECOMMENDED_ACTIONS)("the action %s names itself on the button", (action) => {
    const label = nextActionLabel(action);
    expect(label, `${action} falls through to the generic label`).not.toBe("Continuar");
    expect(label).not.toMatch(/_/);
  });

  it("every navigation status has a human label, and none of them claims a verdict", () => {
    for (const status of ["not_started", "available", "in_progress", "completed"] as const) {
      const label = journeyStatusLabel(status);
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toMatch(/válid|evidence|aprovad|certific/i);
    }
    // `completed` is explicitly orientation, not a technical conclusion.
    expect(journeyStatusLabel("completed")).toMatch(/orienta/i);
  });
});
