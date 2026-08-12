// Increment 9 (§25) — the contextual, per-answer suggestion generator. These tests prove the mandate:
// suggestions are DERIVED from this answer's shape (they VARY across archetypes), they are executable
// questions, and a boundary/refusal answer offers ONLY safe reframes — NEVER a reframe toward the
// refused action.
import { describe, it, expect } from "vitest";
import { contextualSuggestions, SAFE_REFRAME_SUGGESTIONS, type SuggestionContext } from "./suggestions";

const base: SuggestionContext = {
  kind: "answer",
  refused: false,
  boundary: false,
  grounded: true,
  degraded: false,
  operationalIntent: "grounded",
  answerType: "",
  questionFamily: null,
  contextualFallbackKind: null,
  terminalKind: "",
  entity: null,
  scope: null,
  toolsRan: [],
  duration: null,
  hasResolvedDocument: false,
};

const duration: SuggestionContext = {
  ...base,
  kind: "duration",
  terminalKind: "operational_duration",
  entity: { id: "operator-zero", type: "operator", display: "Operador Zero" },
  duration: { comparableRuns: 2, hasPerStep: true },
};
const entity: SuggestionContext = {
  ...base,
  answerType: "how_it_works",
  entity: { id: "operator-zero", type: "operator", display: "Operador Zero" },
  scope: { profile: "L0", environment: "sandbox", protocolVersion: "1.0" },
};
const boundary: SuggestionContext = { ...base, kind: "refusal", refused: true, boundary: true, grounded: false };
const insufficient: SuggestionContext = {
  ...base,
  kind: "answer",
  grounded: true,
  terminalKind: "insufficient_measurements",
  entity: { id: "operator-zero", type: "operator", display: "Operador Zero" },
};

describe("contextualSuggestions (§25) — per-answer, executable, safe", () => {
  it("produces DISTINCT suggestion sets across the four answer archetypes", () => {
    const sets = [duration, entity, boundary, insufficient].map((c) => JSON.stringify(contextualSuggestions(c)));
    // Every archetype's set is different from every other archetype's set.
    expect(new Set(sets).size).toBe(4);
    for (const c of [duration, entity, boundary, insufficient]) {
      expect(contextualSuggestions(c).length).toBeGreaterThan(0);
    }
  });

  it("is DETERMINISTIC — the same context yields the same suggestions", () => {
    expect(contextualSuggestions(entity)).toEqual(contextualSuggestions(entity));
    expect(contextualSuggestions(duration)).toEqual(contextualSuggestions(duration));
  });

  it("a boundary/refusal offers ONLY safe reframes — NEVER a reframe toward the refused action", () => {
    const s = contextualSuggestions(boundary);
    expect(s).toEqual([...SAFE_REFRAME_SUGGESTIONS]);
    // No suggestion may point back at a refused action (funds movement, key exposure, deletion, …).
    for (const f of s) {
      expect(f).not.toMatch(/transfer|transfe|movimenta|chave privada|private key|apaga|elimina|delete|remover os guards/i);
    }
    // Same guarantee when only boundary_detected is set (no explicit refusal kind).
    const detected = contextualSuggestions({ ...base, boundary: true, grounded: false });
    expect(detected).toEqual([...SAFE_REFRAME_SUGGESTIONS]);
  });

  it("an ENTITY answer offers that entity's manifest/keys/conformance (named)", () => {
    const s = contextualSuggestions(entity);
    expect(s.join(" ")).toContain("Operador Zero");
    expect(s.some((x) => /manifesto/i.test(x))).toBe(true);
    expect(s.some((x) => /conformidade/i.test(x))).toBe(true);
  });

  it("drops the manifest suggestion when a manifest/artifact was already fetched this turn", () => {
    const withFetch = contextualSuggestions({ ...entity, toolsRan: ["LIVE_ARTIFACT_FETCH"] });
    expect(withFetch.some((x) => /manifesto/i.test(x))).toBe(false);
    expect(withFetch.some((x) => /conformidade/i.test(x))).toBe(true);
  });

  it("a DURATION answer offers per-step / comparison / execution follow-ups", () => {
    const s = contextualSuggestions(duration);
    expect(s.some((x) => /por etapa/i.test(x))).toBe(true);
    expect(s.some((x) => /anterior/i.test(x))).toBe(true); // comparableRuns >= 1
    expect(s.some((x) => /mais lenta/i.test(x))).toBe(true); // hasPerStep
  });

  it("an INSUFFICIENT-measurements answer offers what would make it answerable", () => {
    const s = contextualSuggestions(insufficient);
    expect(s.some((x) => /validação|medições/i.test(x))).toBe(true);
    // Distinct from the duration set even though both are operational.
    expect(JSON.stringify(s)).not.toBe(JSON.stringify(contextualSuggestions(duration)));
  });

  it("a plain NON-GROUNDED reply (no entity, no special shape) offers nothing", () => {
    expect(contextualSuggestions({ ...base, grounded: false })).toEqual([]);
  });

  it("grounded suggestions VARY by answer_type (not one fixed list)", () => {
    const howItWorks = contextualSuggestions({ ...base, answerType: "how_it_works" });
    const governance = contextualSuggestions({ ...base, answerType: "governance_explanation" });
    expect(howItWorks.length).toBeGreaterThan(0);
    expect(governance.length).toBeGreaterThan(0);
    expect(JSON.stringify(howItWorks)).not.toBe(JSON.stringify(governance));
  });

  it("never emits a normative claim (certify/approve/license/guarantee)", () => {
    for (const c of [base, duration, entity, boundary, insufficient, { ...base, answerType: "governance_explanation" }]) {
      for (const f of contextualSuggestions(c)) expect(f).not.toMatch(/certific|aprova|licenc|garant/i);
    }
  });

  it("a typed contextual decline reframes by decline kind (out_of_scope stays safe)", () => {
    const oos = contextualSuggestions({ ...base, grounded: false, contextualFallbackKind: "out_of_scope" });
    expect(oos.length).toBeGreaterThan(0);
    expect(oos.some((x) => /protocolo BANZA|BanzAI/i.test(x))).toBe(true);
  });
});
