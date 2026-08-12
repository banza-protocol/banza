/**
 * M2.14A — the realistic Operador Zero journey gating model.
 *
 * Pure gating/label/file logic (no WASM). These tests own the invariant that makes the journey
 * realistic: starting a session awards nothing, and a later step never unlocks before the previous
 * one passes. They mirror Part 14 of the phase.
 */
import { describe, it, expect } from "vitest";
import {
  JOURNEY_CLONE_ORDER,
  STEP_ACTION_LABELS,
  STEP_FILES,
  SINGLE_OFFICIAL_EXAMPLE,
  START_BUTTON_LABEL,
  ZERO_SESSION_IDENTITY,
  stepUnlocked,
  artifactsReady,
  zeroFileHref,
  type JourneyCloneStep,
} from "./operadorZeroJourney";

// A `passed` predicate from a set of passed steps.
const passedFrom = (steps: JourneyCloneStep[]) => (s: JourneyCloneStep) => steps.includes(s);

describe("Operador Zero realistic journey gating (M2.14A)", () => {
  it("(1/3) starting a session does NOT complete the journey — nothing passes, only manifest unlocks", () => {
    const passed = passedFrom([]); // session started, no step run yet
    expect(artifactsReady(passed)).toBe(0);
    // guia + manifest are the only things reachable; every later step is locked.
    expect(stepUnlocked("manifest", true, passed)).toBe(true);
    expect(stepUnlocked("conformidade", true, passed)).toBe(false);
    expect(stepUnlocked("trust", true, passed)).toBe(false);
    expect(stepUnlocked("federacao", true, passed)).toBe(false);
    expect(stepUnlocked("evidence_bundle", true, passed)).toBe(false);
    expect(stepUnlocked("traces", true, passed)).toBe(false);
  });

  it("(2) before a session starts, no scored step is unlocked (guia always is)", () => {
    const passed = passedFrom([]);
    expect(stepUnlocked("guia", false, passed)).toBe(true);
    expect(stepUnlocked("manifest", false, passed)).toBe(false);
    expect(stepUnlocked("traces", false, passed)).toBe(false);
  });

  it("(3) Manifest is the first active step", () => {
    expect(JOURNEY_CLONE_ORDER[0]).toBe("manifest");
  });

  it("(4) Conformidade unlocks only after Manifest passes", () => {
    expect(stepUnlocked("conformidade", true, passedFrom([]))).toBe(false);
    expect(stepUnlocked("conformidade", true, passedFrom(["manifest"]))).toBe(true);
  });

  it("(5) Trust unlocks only after Conformidade passes", () => {
    expect(stepUnlocked("trust", true, passedFrom(["manifest"]))).toBe(false);
    expect(stepUnlocked("trust", true, passedFrom(["manifest", "conformidade"]))).toBe(true);
  });

  it("(6) Federação unlocks only after Trust passes", () => {
    expect(stepUnlocked("federacao", true, passedFrom(["manifest", "conformidade"]))).toBe(false);
    expect(stepUnlocked("federacao", true, passedFrom(["manifest", "conformidade", "trust"]))).toBe(true);
  });

  it("(7) Evidence Bundle unlocks only after Federação passes", () => {
    const upToTrust = passedFrom(["manifest", "conformidade", "trust"]);
    expect(stepUnlocked("evidence_bundle", true, upToTrust)).toBe(false);
    expect(stepUnlocked("evidence_bundle", true, passedFrom(["manifest", "conformidade", "trust", "federacao"]))).toBe(true);
  });

  it("(8) Traces unlocks only after Evidence Bundle passes", () => {
    const upToFed = passedFrom(["manifest", "conformidade", "trust", "federacao"]);
    expect(stepUnlocked("traces", true, upToFed)).toBe(false);
    expect(stepUnlocked("traces", true, passedFrom(["manifest", "conformidade", "trust", "federacao", "evidence_bundle"]))).toBe(true);
  });

  it("later steps cannot skip a failed/unrun prior step (no leapfrog)", () => {
    // manifest + trust passed but conformidade NOT → trust must still read locked by the rule.
    const skipped = passedFrom(["manifest", "trust"]);
    expect(stepUnlocked("trust", true, skipped)).toBe(false); // conformidade (prev) did not pass
  });

  it("(9) each step exposes its OWN files (Part 7) and none is empty", () => {
    for (const step of JOURNEY_CLONE_ORDER) {
      expect(STEP_FILES[step].length).toBeGreaterThan(0);
    }
    expect(STEP_FILES.manifest.some((f) => f.name.includes("manifest.valid"))).toBe(true);
    expect(STEP_FILES.trust.some((f) => f.name.includes("revocation-list"))).toBe(true);
    expect(STEP_FILES.evidence_bundle.some((f) => f.name.includes("evidence-bundle.complete"))).toBe(true);
  });

  it("(11) negative scenarios belong to Operador Zero (labels name the operator, not a generic example)", () => {
    for (const step of JOURNEY_CLONE_ORDER) {
      const neg = STEP_ACTION_LABELS[step].negativo;
      expect(neg.toLowerCase()).toContain("operador zero");
    }
    // The start button never reads "Carregar Operador Zero" (the all-at-once loader).
    expect(START_BUTTON_LABEL).not.toBe("Carregar Operador Zero");
  });

  it("(12) step files never expose secrets — no private key / seed / .env", () => {
    const all = JOURNEY_CLONE_ORDER.flatMap((s) => STEP_FILES[s].map((f) => f.name)).join(" ").toLowerCase();
    expect(all).not.toMatch(/private[-_ ]?key|\.pem|seed|\.env|secret|password|token/);
    // public keys ARE fine (trust step) — assert we still list the public root.
    expect(all).toContain("demo-operator-root.public");
  });

  it("public files link to zero.banza.network; scenario/schema files are name-only", () => {
    expect(zeroFileHref({ name: "x", route: ".well-known/banza/operator" })).toBe("https://zero.banza.network/.well-known/banza/operator.json");
    expect(zeroFileHref({ name: "operator-zero.manifest.invalid.json" })).toBeNull();
  });

  it("the single official example sentence is exact, and the demo identity carries the boundary flags", () => {
    expect(SINGLE_OFFICIAL_EXAMPLE).toBe("O Operador Zero é o único exemplo oficial de operador demo no BanzAI.");
    expect(ZERO_SESSION_IDENTITY.demo_only).toBe(true);
    expect(ZERO_SESSION_IDENTITY.real_money).toBe(false);
    expect(ZERO_SESSION_IDENTITY.production_allowed).toBe(false);
    expect(ZERO_SESSION_IDENTITY.certification).toBe(false);
    expect(ZERO_SESSION_IDENTITY.currency).toBe("KZ_DEMO");
  });
});
