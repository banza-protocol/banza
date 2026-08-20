import { describe, it, expect } from "vitest";
import { GLOSSARY_TERMS, glossaryTerm } from "@/lib/glossaryTerms";

// A glossary can be complete and still be wrong.
//
// Coverage properties ask "does every term have an English definition?", and a mutation that SWAPS two
// English definitions answers yes to all of them: the counts are identical, both strings are fluent
// English, and the page renders. It passed every check this repository had — so the definitions are now
// bound to the concepts they define.
//
// Each binding names a phrase the definition must contain because the CONCEPT requires it, and phrases it
// must not contain because they belong to a neighbouring concept. These are the distinctions the protocol
// cannot afford to blur: certification is not admission and not authorisation, an operator is not an
// implementation, conformance is not interoperability, and evidence is not a verdict.

type Binding = { key: string; mustPt: RegExp[]; mustEn: RegExp[]; mustNotEn: RegExp[] };

const BINDINGS: Binding[] = [
  {
    // Layer 2, per implementation, decided by engines against a versioned profile.
    key: "certification",
    mustPt: [/implementa[çc]/i, /perfil/i],
    mustEn: [/implementation/i, /profile/i, /evidence/i],
    // The regulator's grant is a different determination with a different owner.
    mustNotEn: [/granted by the competent regulator/i, /regulated financial activity/i],
  },
  {
    // The regulator's grant. BANZA is not a party.
    key: "regulatory-authorisation",
    mustPt: [/regulador/i],
    mustEn: [/regulator/i, /regulated financial activity/i],
    mustNotEn: [/decided by Rust engines/i, /versioned profile/i],
  },
  {
    // A scheme's decision to admit a participant — later, and never implied by certification.
    key: "scheme-admission",
    mustPt: [/esquema/i, /admitir/i],
    mustEn: [/scheme/i, /admit/i],
    mustNotEn: [/competent regulator/i],
  },
  {
    // The responsible legal entity.
    key: "operator",
    mustPt: [/entidade/i],
    mustEn: [/legal entity/i, /responsible entity/i],
    mustNotEn: [/content hash of the exact set of artifacts/i],
  },
  {
    // The technical system evaluated, identified by content hash.
    key: "implementation",
    mustPt: [/implementation_hash/i],
    mustEn: [/implementation_hash/i, /content hash/i],
    mustNotEn: [/independent legal entity that implements BANZA to process payments/i],
  },
  {
    // Deterministic verification against contracts and invariants.
    key: "conformance",
    mustPt: [/determin/i, /invariant/i],
    mustEn: [/deterministic/i, /invariants/i],
    mustNotEn: [/route and settle payments between one another/i],
  },
  {
    // The verified ability of independent implementations to exchange payments.
    key: "interoperability",
    mustPt: [/interoperabilidade|implementa[çc]/i],
    mustEn: [/route and settle/i, /independent/i],
    mustNotEn: [/financial invariants/i],
  },
];

describe("glossary semantic identity — definitions are bound to their concepts", () => {
  it("every binding names a term that exists", () => {
    for (const b of BINDINGS) {
      expect(glossaryTerm(b.key), `binding references unknown term "${b.key}"`).toBeTruthy();
    }
    expect(BINDINGS.length).toBeGreaterThanOrEqual(7);
  });

  for (const b of BINDINGS) {
    it(`${b.key}: the definitions describe ${b.key}, in both languages`, () => {
      const term = glossaryTerm(b.key)!;
      for (const re of b.mustPt) {
        expect(term.full.pt, `${b.key}: the Portuguese definition must match ${re}`).toMatch(re);
      }
      for (const re of b.mustEn) {
        expect(term.full.en, `${b.key}: the English definition must match ${re}`).toMatch(re);
      }
      for (const re of b.mustNotEn) {
        expect(
          term.full.en,
          `${b.key}: the English definition contains ${re}, which belongs to a neighbouring concept — ` +
            `this is what a swapped or drifted definition looks like`,
        ).not.toMatch(re);
      }
    });
  }

  it("the corpus is the size the terms file declares, so bindings cannot be checked against a stub", () => {
    expect(GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(25);
  });
});
