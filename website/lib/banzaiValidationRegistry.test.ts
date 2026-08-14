import { describe, it, expect } from "vitest";
import {
  isClosedId,
  mapCatalogueToOperators,
  resolveOperatorIn,
  resolveImplementationIn,
} from "./banzaiValidation";

// M2.19G.3B (ADR-038 §4.6/§4.7/§4.9) — the UI operator list is fetched from the Rust-sourced closed
// Technical Registry and mapped by mapCatalogueToOperators; no operator is hardcoded on the client. The
// closed id shape rejects any URL/path/scheme before it can reach the backend, and the operator↔
// implementation binding is enforced by the list resolvers. A synthetic multi-operator catalogue proves
// the client never special-cases operator-zero.
const CATALOGUE = {
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
          capabilities: ["qr_payment_demo"],
          canonical_origin: "https://zero.banza.network",
          publication_status: "published",
          eligible: true,
        },
      ],
    },
    {
      operator_id: "another-operator",
      display_name: "Outro Operador",
      publication_status: "published",
      registry_ref: "banza-technical-registry:another-operator",
      implementations: [
        {
          implementation_id: "another-impl",
          display_name: "Outra implementação",
          version: "1.2.0",
          protocol_version: "1.0",
          profile: "L1",
          environment: "demo",
          capabilities: [],
          canonical_origin: "https://another.example",
          publication_status: "published",
          eligible: true,
        },
      ],
    },
  ],
};

describe("closed id shape (isClosedId) — SSRF-safe", () => {
  it("accepts registry slug ids", () => {
    expect(isClosedId("operator-zero")).toBe(true);
    expect(isClosedId("operator-zero-ref-impl")).toBe(true);
  });

  it("rejects URLs, paths, schemes, uppercase and empties", () => {
    for (const bad of [
      "https://attacker.example/x",
      "../secret",
      "/manifest.json",
      "javascript:alert(1)",
      "OPERATOR-ZERO",
      "operator zero",
      "",
      null,
      undefined,
    ]) {
      expect(isClosedId(bad as unknown as string)).toBe(false);
    }
  });
});

describe("dynamic operator/implementation registry (mapper + resolvers)", () => {
  it("maps whichever operators the registry returns — no operator is hardcoded on the client", () => {
    const ops = mapCatalogueToOperators(CATALOGUE);
    expect(ops.map((o) => o.operator_id)).toEqual(["operator-zero", "another-operator"]);
    // No fictional/sample operators are ever synthesised.
    const blob = JSON.stringify(ops).toLowerCase();
    for (const fictional of ["operator-a", "operator-b", "sample-operator", "acme", "example-operator"]) {
      expect(blob.includes(fictional)).toBe(false);
    }
  });

  it("each operator publishes its own implementations at their canonical origins", () => {
    const ops = mapCatalogueToOperators(CATALOGUE);
    const oz = resolveOperatorIn(ops, "operator-zero");
    expect(oz).not.toBeNull();
    expect(oz!.implementations).toHaveLength(1);
    expect(oz!.implementations[0].implementation_id).toBe("operator-zero-ref-impl");
    expect(oz!.implementations[0].canonical_origin).toBe("https://zero.banza.network");
    // The registry carries publication_status + eligible, never a certification-outcome field.
    expect(oz!.implementations[0].eligible).toBe(true);
    expect((oz!.implementations[0] as unknown as Record<string, unknown>).last_known_state).toBeUndefined();
  });

  it("resolveImplementationIn enforces the operator↔implementation binding", () => {
    const ops = mapCatalogueToOperators(CATALOGUE);
    // Belongs to the operator → resolves.
    expect(resolveImplementationIn(ops, "operator-zero", "operator-zero-ref-impl")).not.toBeNull();
    // Cross-operator / off-list / malformed → null (no target).
    expect(resolveImplementationIn(ops, "operator-zero", "another-impl")).toBeNull();
    expect(resolveImplementationIn(ops, "operator-zero", "some-other-impl")).toBeNull();
    expect(resolveImplementationIn(ops, "ghost-operator", "operator-zero-ref-impl")).toBeNull();
    expect(resolveImplementationIn(ops, "operator-zero", "https://attacker.example/x")).toBeNull();
  });

  it("resolveOperatorIn returns null for anything off the fetched list", () => {
    const ops = mapCatalogueToOperators(CATALOGUE);
    expect(resolveOperatorIn(ops, "operator-a")).toBeNull();
    expect(resolveOperatorIn(ops, "../secret")).toBeNull();
    expect(resolveOperatorIn(ops, null)).toBeNull();
  });
});
