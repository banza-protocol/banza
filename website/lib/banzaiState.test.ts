import { describe, it, expect } from "vitest";
import { parseBanzaiState } from "./banzaiState";
import { DEFAULT_TARGET_ID } from "./banzaiValidation";

// M2.19E/F.2 — /banzai is ONE route with two modes. parseBanzaiState is the single, validated URL-state
// contract: every query param is resolved against a CLOSED allowlist, unknown/malicious values fall back
// to a safe default, and it NEVER throws (SSRF / path-traversal / injection impossible by construction).
describe("parseBanzaiState — validated URL-state for the single BanzAI app", () => {
  it("defaults to ask mode when no mode is given", () => {
    expect(parseBanzaiState({}).mode).toBe("ask");
  });

  it("resolves mode ask | validation | onboarding (only exact literals opt in; M2.19G.3/ADR-069)", () => {
    expect(parseBanzaiState({ mode: "ask" }).mode).toBe("ask");
    expect(parseBanzaiState({ mode: "validation" }).mode).toBe("validation");
    expect(parseBanzaiState({ mode: "onboarding" }).mode).toBe("onboarding");
    // Anything else falls back to ask — including case variants and junk.
    for (const m of ["VALIDATION", "validate", "ONBOARDING", "onboard", "garbage", "", "../"]) {
      expect(parseBanzaiState({ mode: m }).mode).toBe("ask");
    }
  });

  it("resolves the operator-zero target and marks a requested/absent on-list target known", () => {
    const s0 = parseBanzaiState({});
    expect(s0.target.id).toBe("operator-zero");
    expect(s0.targetKnown).toBe(true); // absent target → safe default, still 'known'

    const s1 = parseBanzaiState({ target: "operator-zero" });
    expect(s1.target.id).toBe("operator-zero");
    expect(s1.targetKnown).toBe(true);
  });

  it("falls back to the default target and flags targetKnown=false for any off-list/injected target", () => {
    for (const bad of ["evil-operator", "../secret", "javascript:alert(1)", "https://attacker.example/x"]) {
      const s = parseBanzaiState({ target: bad });
      expect(s.target.id).toBe(DEFAULT_TARGET_ID);
      expect(s.target.id).toBe("operator-zero");
      expect(s.targetKnown).toBe(false);
    }
  });

  it("resolves the workflow against the allowlist and defaults unknown to full", () => {
    expect(parseBanzaiState({}).workflow).toBe("full");
    expect(parseBanzaiState({ workflow: "conformance" }).workflow).toBe("conformance");
    for (const w of ["../../etc/passwd", "javascript:alert(1)", "https://attacker", ""]) {
      expect(parseBanzaiState({ workflow: w }).workflow).toBe("full");
    }
  });

  it("resolves an explicit step, derives one from a step-shaped workflow, and rejects invalid/full", () => {
    expect(parseBanzaiState({}).step).toBeNull();
    expect(parseBanzaiState({ step: "manifest" }).step).toBe("manifest");
    // A step-shaped ?workflow= opens on the matching step when no explicit ?step= is given.
    expect(parseBanzaiState({ workflow: "keys" }).step).toBe("keys");
    // "full" is a workflow, not a step → null. Off-list steps → null.
    expect(parseBanzaiState({ step: "full" }).step).toBeNull();
    expect(parseBanzaiState({ workflow: "full" }).step).toBeNull();
    for (const bad of ["bogus", "../", "javascript:alert(1)", "https://attacker"]) {
      expect(parseBanzaiState({ step: bad }).step).toBeNull();
    }
  });

  it("seeds the Fase 0 ids from the (closed, shape-checked) target/implementation deep link (M2.19G.3B / ADR-076 D-076-10)", () => {
    // A CLEAN visit (no path seed, no explicit ?target=) seeds NO operator — nothing (not even Operador
    // Zero) is pre-selected. The dynamic Rust Technical Registry is the only selection source; a target
    // is resolved only on an explicit deep link. `target`/`targetKnown` still resolve for display.
    const s0 = parseBanzaiState({});
    expect(s0.initialOperatorId).toBeNull();
    expect(s0.initialImplementationId).toBeNull();

    // An EXPLICIT, on-list ?target= is a deep link → it seeds the operator id.
    const sT = parseBanzaiState({ target: "operator-zero" });
    expect(sT.initialOperatorId).toBe("operator-zero");
    expect(sT.initialImplementationId).toBeNull();

    // A closed-shape ?implementation= for the (explicit) operator seeds the implementation id.
    const s1 = parseBanzaiState({ target: "operator-zero", implementation: "operator-zero-ref-impl" });
    expect(s1.initialOperatorId).toBe("operator-zero");
    expect(s1.initialImplementationId).toBe("operator-zero-ref-impl");

    // An off-shape / injected implementation id is NOT seeded (falls back to null — no URL/path/scheme).
    for (const bad of ["../secret", "javascript:alert(1)", "https://attacker.example/x", "Made-Up"]) {
      const s = parseBanzaiState({ target: "operator-zero", implementation: bad });
      expect(s.initialImplementationId).toBeNull();
    }

    // An off-list target is unknown (targetKnown=false) → no seed ids at all.
    const sBad = parseBanzaiState({ target: "evil-operator", implementation: "operator-zero-ref-impl" });
    expect(sBad.initialOperatorId).toBeNull();
    expect(sBad.initialImplementationId).toBeNull();
  });

  it("resolves the read-only ?view=guia resource, null otherwise", () => {
    expect(parseBanzaiState({ view: "guia" }).view).toBe("guia");
    expect(parseBanzaiState({ view: "x" }).view).toBeNull();
    expect(parseBanzaiState({}).view).toBeNull();
  });

  it("takes the first value of an array-shaped param and never throws", () => {
    const s = parseBanzaiState({ target: ["operator-zero", "x"], mode: ["validation"], workflow: ["keys"] });
    expect(s.target.id).toBe("operator-zero");
    expect(s.mode).toBe("validation");
    expect(s.step).toBe("keys");
  });

  // M2.19G.4 (ADR-070) — the navigable-context path seed. The route segments (operador/[operatorId]/
  // [implementationId]) are shape-validated closed slugs; parseBanzaiState derives the context from them
  // with precedence over the query, and an operator/implementation context implies validation mode.
  it("defaults to the global context with no path seed", () => {
    expect(parseBanzaiState({}).context).toBe("global");
    expect(parseBanzaiState({ mode: "onboarding" }).context).toBe("global");
  });

  it("derives the operator context from a closed-slug operator segment and forces validation mode", () => {
    const s = parseBanzaiState({ mode: "ask" }, { operatorId: "operator-zero" });
    expect(s.context).toBe("operator");
    expect(s.mode).toBe("validation"); // an operator context is the validation workspace, overriding ?mode=ask
    expect(s.initialOperatorId).toBe("operator-zero");
    expect(s.initialImplementationId).toBeNull();
  });

  it("derives the implementation context from both closed-slug segments and seeds both ids", () => {
    const s = parseBanzaiState({}, { operatorId: "operator-zero", implementationId: "operator-zero-ref-impl" });
    expect(s.context).toBe("implementation");
    expect(s.mode).toBe("validation");
    expect(s.initialOperatorId).toBe("operator-zero");
    expect(s.initialImplementationId).toBe("operator-zero-ref-impl");
  });

  it("the path seed takes precedence over the query target/implementation", () => {
    const s = parseBanzaiState(
      { target: "operator-zero", implementation: "operator-zero-ref-impl" },
      { operatorId: "another-operator", implementationId: "another-impl" },
    );
    expect(s.initialOperatorId).toBe("another-operator");
    expect(s.initialImplementationId).toBe("another-impl");
    expect(s.context).toBe("implementation");
  });

  it("ignores an off-shape / injected operator segment and falls back to the global context (no URL ever)", () => {
    for (const bad of ["../secret", "javascript:alert(1)", "https://attacker.example/x", "Operator Zero", "UPPER"]) {
      const s = parseBanzaiState({}, { operatorId: bad });
      expect(s.context).toBe("global");
      // With no valid operator segment and no explicit ?target=, a clean visit seeds NO operator id
      // (ADR-076 D-076-10 — the registry is the only selection source).
      expect(s.initialOperatorId).toBeNull();
    }
  });

  it("an implementation segment only rides a shape-valid operator segment (operator ≠ implementation)", () => {
    // Off-shape operator → implementation is not seeded and context stays global.
    const s = parseBanzaiState({}, { operatorId: "../evil", implementationId: "operator-zero-ref-impl" });
    expect(s.context).toBe("global");
    expect(s.initialImplementationId).toBeNull();
    // Valid operator but off-shape implementation → operator context, no implementation seed.
    const s2 = parseBanzaiState({}, { operatorId: "operator-zero", implementationId: "https://x/y" });
    expect(s2.context).toBe("operator");
    expect(s2.initialImplementationId).toBeNull();
  });

  it("never throws on a junk path seed and returns a safe global state", () => {
    let s!: ReturnType<typeof parseBanzaiState>;
    expect(() => {
      s = parseBanzaiState({ mode: "../" }, { operatorId: "javascript:alert(1)", implementationId: "../../etc/passwd" });
    }).not.toThrow();
    expect(s.context).toBe("global");
    expect(s.mode).toBe("ask");
  });

  it("never throws on junk / injection inputs and always returns a safe, complete state", () => {
    const junk: Record<string, string | string[] | undefined> = {
      mode: "../",
      target: "javascript:alert(1)",
      workflow: "https://attacker.example/callback",
      step: "../../etc/passwd",
      view: ["<script>"],
      // extra unknown params must be ignored, not fetched or reflected
      redirect: "https://attacker.example",
      next: "../",
    };
    let s!: ReturnType<typeof parseBanzaiState>;
    expect(() => {
      s = parseBanzaiState(junk);
    }).not.toThrow();
    expect(s.mode).toBe("ask");
    expect(s.target.id).toBe("operator-zero");
    expect(s.targetKnown).toBe(false);
    expect(s.workflow).toBe("full");
    expect(s.step).toBeNull();
    expect(s.view).toBeNull();
  });
});
