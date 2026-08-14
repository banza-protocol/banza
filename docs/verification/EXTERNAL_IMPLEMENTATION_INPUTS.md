# External Implementation — Frozen Inputs

**This document does not start the external implementation exercise.** It fixes the inputs it will run
against, so that when it does start there is nothing left to negotiate and nothing that can quietly
change underneath it.

Everything below is a fact about the current tree, recorded here and verifiable from it.

---

## 1. What is being demonstrated

That a team with **no access to this repository's reference implementation** can implement BANZA
correctly from the published surface alone, and that their implementation and ours agree byte for byte
where the protocol says they must.

This has **not** been demonstrated. Nothing in this repository should claim otherwise until it has.

---

## 2. Protocol version

`1.0.0`. If the exercise finds a defect requiring an incompatible change, that is a protocol decision and
the exercise stops — it does not fork the version to keep going.

---

## 3. The package they receive

### Conformance package

`conformance/package/` — the vectors with the schemas and registries they are evaluated against.

| | |
|---|---|
| Files | 72 + manifest + README |
| Vector files | 15 |
| Cases | 146 |
| `package-manifest.json` SHA-256 | `7434064a7f77ccf2b16339cdca1b9587e385941d332a4579e36aa8431ee4704a` |

The manifest pins the SHA-256 of every file in the package, so the single digest above transitively fixes
the whole package. An implementer recomputes the file digests and compares: a match proves they hold the
published surface rather than a retelling of it.

### Clean-room L0 package

`clean-room/packages/l0/` — the minimum sufficient material to implement **L0** with no reference
implementation.

| | |
|---|---|
| Files | 21 content + manifest + provenance + README |
| `package-manifest.json` SHA-256 | `1e578f6042988f3793751d496509e45b8e03ac23375debec886d138db625b7a2` |

Every reference that leaves the package is declared in `outbound_references` with its kind and reason.
A reference that does not resolve inside the package and is not declared is a defect in the package, not
something the implementer works around.

---

## 4. Target profile

**L0**, with 4 required vector files.

L0 is the target because it is the smallest complete claim: an implementation either produces the
canonical bytes and the declared outcomes or it does not. Higher profiles add surface without adding a
sharper question.

---

## 5. First gate: BCJ/1

Before anything else, the external implementation must produce **byte-identical canonical output** for
the BCJ/1 vectors.

This is first because everything downstream depends on it. Signing, digesting, request identity and
replay all compare bytes; two implementations that disagree about canonical form will disagree about
everything else, and will disagree in ways that look like unrelated bugs.

A failure here is a specification failure until proven otherwise: if two competent implementations read
`spec/canonicalization.md` and produce different bytes, the specification is ambiguous.

---

## 6. PASS / FAIL criteria

**PASS** requires all of:

1. every required vector case for the target profile produces the outcome the case states;
2. canonical output is byte-identical to the vectors for every BCJ/1 case;
3. rejection cases are rejected **for the stated reason code**, not merely rejected;
4. behaviour is deterministic — the same input produces the same output across runs;
5. no case passes by consulting this repository's reference implementation.

**FAIL** is any of the above. A FAIL is a finding about BANZA first and about the implementation second:
the question the exercise asks is whether the published surface is sufficient, so every divergence is
examined for specification ambiguity before it is attributed to the implementer.

---

## 7. Prohibited sources

The external implementation MUST NOT consult:

- `engines/` — the reference implementation, in any form, including compiled WASM;
- `services/` — the BanzAI runtime;
- BanzAI itself, in any deployment;
- `decisions/` — the ADRs;
- `docs/audit/`, `docs/security/`, `docs/governance/` — internal audit, security and governance material;
- this repository's git history;
- any maintainer, in conversation, about a question the published surface should answer.

Permitted: the conformance package, the clean-room package, `contracts/`, `spec/`, the Normative
Manifest, `docs/IMPLEMENTATION_SURFACE.md`, and the public whitepaper.

The prohibition on asking maintainers is the one that matters most and is the easiest to breach by
accident. A question answered in conversation is a question the specification failed to answer, and
answering it privately destroys the evidence.

---

## 8. Question ledger

Every question the implementer cannot answer from the permitted sources is **recorded, not asked**.

Each entry: the question, the artifact they expected to answer it, what they did instead, and whether
the guess turned out correct.

The ledger is the exercise's most valuable output. A PASS with twenty ledger entries means twenty places
where the specification is ambiguous and the implementer happened to guess right — which is a weaker
result than a FAIL with one entry, and must not be reported as a clean pass.

---

## 9. Isolation

- The external implementation freezes **its own commit** before any comparison against the reference
  implementation. Comparison after the fact, against a moving implementation, proves nothing.
- Comparison is **black-box**: same inputs, compare outputs. No reading of the other side's code by
  either party during the exercise.
- This repository's commit is frozen too: the exercise runs against a named commit of the package
  digests above, not against `main`.
- Divergences are recorded before either side is changed. A divergence silently fixed is a divergence
  not learned from.

---

## 10. What a PASS would and would not establish

**Would:** that the published surface is sufficient to build a conforming L0 implementation without the
reference implementation, and that two independent implementations agree on canonical bytes and declared
outcomes.

**Would not:** that BANZA is certified, admitted, authorised, production-ready, or that any operator is
any of those things. It is one demonstration, at one profile, by one team.
