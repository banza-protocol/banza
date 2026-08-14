import { describe, it, expect } from "vitest";
import {
  resolveTarget,
  resolveWorkflow,
  workbenchDeepLink,
  workbenchDeepLinkAbsolute,
  VALIDATION_WORKFLOWS,
  DEFAULT_TARGET_ID,
  isClosedId,
  mapCatalogueToOperators,
  resolveOperatorIn,
  resolveImplementationIn,
  publicationStatusLabel,
} from "./banzaiValidation";

// M2.19E/F (ADR-041) — the deep-link contract is SSRF-safe by construction: closed target registry +
// closed workflow allowlist, no caller-supplied URL is ever fetched.
describe("banzaiValidation — closed allowlists (SSRF-safe deep links)", () => {
  it("resolves only the registered operator-zero target", () => {
    expect(resolveTarget("operator-zero")?.id).toBe("operator-zero");
  });

  it("rejects any off-list / injected target", () => {
    for (const bad of ["evil-operator", "../secret", "https://attacker.example/x", "", null, undefined]) {
      expect(resolveTarget(bad as string)).toBeNull();
    }
  });

  it("resolves every allowlisted workflow and defaults unknown to full", () => {
    for (const w of VALIDATION_WORKFLOWS) expect(resolveWorkflow(w)).toBe(w);
    expect(resolveWorkflow("../../etc/passwd")).toBe("full");
    expect(resolveWorkflow("javascript:alert(1)")).toBe("full");
    expect(resolveWorkflow(null)).toBe("full");
  });

  it("the 9 journey steps + full are the only workflows", () => {
    expect([...VALIDATION_WORKFLOWS].sort()).toEqual(
      ["certification", "conformance", "discovery", "evidence", "federation", "full", "interoperability", "keys", "manifest", "trust"].sort(),
    );
  });

  it("builds a deep link that only ever encodes an allowlisted target+workflow (no free-form URL)", () => {
    const link = workbenchDeepLink("operator-zero", "conformance");
    expect(link).toBe("/banzai?mode=validation&target=operator-zero&workflow=conformance");
    // An off-list target falls back to the default; no attacker string is encoded.
    const bad = workbenchDeepLink("https://attacker.example", "full");
    expect(bad).toContain(`target=${DEFAULT_TARGET_ID}`);
    expect(bad).not.toContain("attacker");
  });

  it("the absolute deep link targets the apex /banzai validation mode", () => {
    expect(workbenchDeepLinkAbsolute("operator-zero", "full")).toBe(
      "https://banza.network/banzai?mode=validation&target=operator-zero&workflow=full",
    );
  });

  it("workbenchDeepLink NEVER encodes an off-list / injected target (always the default is substituted)", () => {
    for (const bad of ["evil-operator", "../secret", "javascript:alert(1)", "https://attacker.example/x", ""]) {
      const rel = workbenchDeepLink(bad, "full");
      const abs = workbenchDeepLinkAbsolute(bad, "full");
      for (const link of [rel, abs]) {
        expect(link).toContain(`target=${DEFAULT_TARGET_ID}`);
        // No fragment of the attacker/off-list string is ever reflected into the URL.
        expect(link).not.toContain("attacker");
        expect(link).not.toContain("secret");
        expect(link).not.toContain("javascript");
        expect(link).not.toContain("evil");
      }
    }
  });

  it("workbenchDeepLink defaults an off-list workflow to full (no free-form workflow reflected)", () => {
    const link = workbenchDeepLink("operator-zero", "../../etc/passwd" as never);
    expect(link).toBe("/banzai?mode=validation&target=operator-zero&workflow=full");
  });
});

// M2.19G.3B — the operator/implementation list is NO LONGER a hardcoded TS constant. It is fetched at
// runtime from the CLOSED Technical Registry (GET /banzai/validate/registry, sourced from the Rust
// engine banza-target-registry) and mapped by the single pure mapper below. These tests exercise the
// mapper + list-based resolvers over a SYNTHETIC multi-operator catalogue — proving the client special-
// cases no operator (not even operator-zero) and never fabricates an operator on malformed input.
const CATALOGUE = {
  registry: "banza-technical-registry",
  closed: true,
  operators: [
    {
      operator_id: "operator-zero",
      display_name: "Operador Zero",
      publication_status: "published",
      registry_ref: "banza-technical-registry:operator-zero",
      implementations: [
        {
          implementation_id: "operator-zero-ref-impl",
          display_name: "Implementação de referência do Operador Zero",
          version: "0.1.0",
          protocol_version: "1.0.0",
          profile: "L0",
          environment: "sandbox",
          capabilities: ["qr_payment_demo", "refund_demo"],
          canonical_origin: "https://zero.banza.network",
          publication_status: "published",
          eligible: true,
        },
      ],
    },
    {
      operator_id: "second-operator",
      display_name: "Segundo Operador",
      publication_status: "published",
      registry_ref: "banza-technical-registry:second-operator",
      implementations: [
        {
          implementation_id: "second-impl-a",
          display_name: "Implementação A",
          version: "2.3.0",
          protocol_version: "1.0",
          profile: "L2",
          environment: "demo",
          capabilities: ["qr_payment_demo"],
          canonical_origin: "https://impl-a.example",
          publication_status: "published",
          eligible: true,
        },
        {
          implementation_id: "second-impl-b",
          display_name: "Implementação B",
          version: "0.9.0",
          protocol_version: "1.0.0",
          profile: "L1",
          environment: "sandbox",
          capabilities: [],
          canonical_origin: "",
          publication_status: "draft",
          eligible: false,
        },
      ],
    },
  ],
};

describe("banzaiValidation — dynamic Technical Registry mapper + resolvers (M2.19G.3B)", () => {
  it("maps every operator and its implementations from the catalogue (multi-operator, many-impl)", () => {
    const ops = mapCatalogueToOperators(CATALOGUE);
    expect(ops.map((o) => o.operator_id)).toEqual(["operator-zero", "second-operator"]);
    // One operator, many implementations — the second operator publishes two.
    expect(ops[1].implementations.map((i) => i.implementation_id)).toEqual(["second-impl-a", "second-impl-b"]);
    const implA = ops[1].implementations[0];
    expect(implA.version).toBe("2.3.0");
    expect(implA.profile).toBe("L2");
    expect(implA.environment).toBe("demo");
    expect(implA.protocol_version).toBe("1.0");
    expect(implA.eligible).toBe(true);
    expect(implA.publication_status).toBe("published");
    // The canonical implementation display_name comes from the registry (never invented client-side).
    expect(ops[0].implementations[0].display_name).toBe("Implementação de referência do Operador Zero");
  });

  it("carries publication_status + eligible and NO certification-outcome field", () => {
    const ops = mapCatalogueToOperators(CATALOGUE);
    const draft = ops[1].implementations[1];
    expect(draft.eligible).toBe(false);
    expect(draft.publication_status).toBe("draft");
    // The retired last_known_state ('NOT_CERTIFIED') must not reappear as a registry field.
    expect((draft as unknown as Record<string, unknown>).last_known_state).toBeUndefined();
  });

  it("is defensive: malformed/empty input yields an empty list and never throws", () => {
    for (const bad of [null, undefined, {}, { operators: null }, { operators: "x" }, 42, "nope"]) {
      expect(mapCatalogueToOperators(bad as unknown)).toEqual([]);
    }
    // Off-shape ids are dropped, not fabricated.
    const dirty = {
      operators: [
        { operator_id: "https://evil", implementations: [] },
        { operator_id: "ok-op", implementations: [{ implementation_id: "../bad" }] },
      ],
    };
    const ops = mapCatalogueToOperators(dirty);
    expect(ops.map((o) => o.operator_id)).toEqual(["ok-op"]);
    expect(ops[0].implementations).toEqual([]);
  });

  it("resolveOperatorIn / resolveImplementationIn resolve only on-list ids against the fetched list", () => {
    const ops = mapCatalogueToOperators(CATALOGUE);
    expect(resolveOperatorIn(ops, "second-operator")?.operator_id).toBe("second-operator");
    expect(resolveImplementationIn(ops, "second-operator", "second-impl-b")?.implementation_id).toBe("second-impl-b");
    // Off-list / injected / cross-operator ids never resolve.
    for (const bad of ["evil-operator", "../secret", "https://attacker.example/x", "SECOND-OPERATOR", "", null, undefined]) {
      expect(resolveOperatorIn(ops, bad as string)).toBeNull();
      expect(resolveImplementationIn(ops, bad as string, "second-impl-a")).toBeNull();
    }
    // A real operator but an implementation belonging to ANOTHER operator → null (binding enforced).
    expect(resolveImplementationIn(ops, "operator-zero", "second-impl-a")).toBeNull();
    expect(resolveImplementationIn(ops, "second-operator", "made-up-impl")).toBeNull();
    expect(resolveImplementationIn(ops, "second-operator", "javascript:alert(1)")).toBeNull();
  });

  it("isClosedId accepts only a lowercase slug shape (never a URL/path/scheme)", () => {
    for (const ok of ["operator-zero", "operator-zero-ref-impl", "a", "a1-b2"]) expect(isClosedId(ok)).toBe(true);
    for (const bad of ["", "-x", "x-", "Operator", "a b", "../secret", "https://x", "javascript:alert(1)", "a/b", null, undefined]) {
      expect(isClosedId(bad as string)).toBe(false);
    }
  });

  it("publicationStatusLabel maps known enums and passes unknown through verbatim", () => {
    expect(publicationStatusLabel("published")).toBe("Publicado no registo técnico");
    expect(publicationStatusLabel("draft")).toBe("Rascunho");
    expect(publicationStatusLabel("something-new")).toBe("something-new");
  });
});
