# BANZA v1.0.0 — External Review Closure

**Verdict: PASS, ready for review.** Protocol version `1.0.0`, unchanged throughout.

This report is readable without the development history. It states what the milestone set out to
close, what it actually demonstrated, and what remains undemonstrated.

---

## 1. Executive summary

The milestone answered an external critique that BANZA was "a conformance framework, not a protocol",
and tested that answer rather than asserting it.

**What was demonstrated.** BANZA publishes a versioned normative surface of 150 artifacts, indexed by
a manifest that declares what defines requirements and what does not. It defines a canonical byte
representation (BCJ/1), execution semantics (statuses, reason codes, idempotency), a canonical
capability vocabulary, five conformance profiles with per-case vector applicability, and a trust model
with monotonic anti-rollback. A public L0 package was exported by allowlist and put through a package
completeness rehearsal, which found two real normative defects — both since closed on the normative
surface. The Whitepaper was realigned to that surface in both editions.

**What remains undemonstrated, and is stated as such everywhere it matters.** No independent
third-party implementation of BANZA exists. No performance, scalability or adoption measurement has
been made. No production operation has occurred. No concrete external-interoperability profile is
published, so L4 has never been demonstrated. Trust material is published at a single origin without
replicas.

**BANZA v1.0.0 remains pre-production.**

---

## 2. Trust

| Property | State |
|---|---|
| Chain | Offline Trust Root signs **only** the Key Manifest; delegated keys sign domain artifacts (ADR-079). Unchanged by this milestone |
| Freshness | `spec/trust-freshness.md`, validity windows, fail-closed when fresh material cannot be obtained |
| Rollback | Monotonic per `(artifact_type, authority_identity)`; a lower ordering marker is refused with `trust_version_rollback`, and a refusal never moves the mark |
| Same marker, same content | Idempotent re-observation, accepted |
| Same marker, different content | **Local equivocation**, refused with `trust_version_equivocation`. Neither artifact takes the position, so the outcome does not depend on fetch order |
| Signing-input digest | SHA-256 over the artifact's signing input — the canonical BCJ/1 bytes the signature covers — with the excluded member named per contract, because the three artifacts do not share one |
| Persistence, concurrency | Mark and digest survive restart; concurrent acceptance keeps the maximum in either interleaving |
| First observation | **Outside the guarantee.** Stated first in the specification, as normative text |
| Cross-observer | **Not provided.** Local monotonicity constrains one observer's history |
| Publication availability | Single canonical origin, no mirrors. Fail-closed preserves the correctness of the decision; unavailable fresh material can prevent a new evaluation |
| Certificate Transparency | **Not adopted** in 1.0.0 |
| Mirrors | **Not implemented** |

The equal-marker case was found by a gate rather than assumed: the ordering markers are RFC 3339
instants with no sub-second constraint on any of the three artifacts, so two legitimate publications
can share one. 13 public vectors, 111 tests in `banza-trust`.

## 3. Numeric domain and BCJ/1

- BCJ/1 is a restricted profile of RFC 8785 (JCS): deterministic UTF-8, duplicate members rejected
  before semantic interpretation, integers bounded by ±(2⁵³−1), **no verifier-side Unicode
  normalization**.
- The integer fields of the normative surface were audited: **no field legitimately requires a domain
  above BCJ/1**, and the schemas that lacked declared bounds now carry them, so a document that
  validates against a schema cannot then be rejected by canonicalization.
- Hostile-input totality: ~30 malformed, duplicated, overflowing and surrogate-bearing inputs driven
  through parse, canonicalize, request-identity, reason-code and signature paths. Every one returns a
  structured rejection; none aborts.
- Claimed no further: this is an audit and a test suite, not a proof.

## 4. Related work

| | Position |
|---|---|
| **Mojaloop** | Specification **and** software. The FSPIOP specification admits FSPs connected **directly to each other or by a Switch** — quoted from the API Definition — while the platform provides a Hub/Central Services operational architecture for running schemes, with its own testing toolkit. Both projects specify aspects of payment interoperability; they differ in how they organise specification authority, implementation, conformance evidence and the operational scheme. No superiority claim, and no claim that a hub is always required |
| **DID** | Evaluated, **not adopted**. The condition that would change it is recorded |
| **Verifiable Credentials** | Evaluated, **not adopted**. The separation VCDM articulates — authenticity is not validity — BANZA holds independently |
| **Certificate Transparency** | Evaluated, **not adopted** in 1.0.0. CT has a real property BANZA lacks: an append-only public history verifiable by a party who never saw an earlier state. RFC 9162 is Experimental and states that a log showing inconsistent views to different clients is not detected by its own mechanisms |

A correction belongs in this section. Phase C concluded that "BANZA is not specifying transfers at
all". That is **false**: `contracts/openapi/transfers.yaml` is a normative API required at L1, payment
intents, sessions and QR payloads have normative schemas and lifecycles, and federation routing and
settlement obligations have normative contracts. The distinction that sentence collapsed is the one
this report keeps throughout: **BANZA specifies these operations and performs none of them.**
Reconciliation is the weakest of them — an invariant with a stated `trace_id` mechanism, no contract
or vector of its own — and is described proportionately.

## 5. Discoverability and implementability

Three authority defects were found and fixed:

1. **The profiles L0–L4 had no normative definition.** The surface published the *shape* of a profile
   and no instance. `conformance/report-schema.json`, itself normative, took its level model from a
   governance document that was not. Now defined by `conformance-profiles.production.json`.
2. **Two normative artifacts disagreed** about which level requires what: the capabilities schema
   carried the mapping ADR-021 had corrected. Wallets are L1, QR and payment requests are L2, traces
   are L1.
3. **Six contracts expressed rules in terms of the reference code**, one of them in the L0 set. Each
   now states the rule rather than who computes it.

| | |
|---|---|
| Normative Manifest | **150** artifacts — 90 implementation, 55 conformance, 3 legal, 2 informative |
| Profile closures | L0 **14** · L1 31 · L2 52 · L3 84 · L4 84 |
| Capability registry | 11 canonical identifiers, 1 alias, 10 `supports_*` flags audited — **exactly one** exact equivalence |
| Vector applicability | Declared per profile and per case; L0 does not inherit trust-scoped cases |
| L4 | Profile-parameterized; inherits L3, adds no universal artifact, `not_run` with no profile selected, **0** concrete profiles published |
| Orphans on the surface | **0** unexplained; 19 declared non-profile with a reason |

Derived views carry *"Derived informative view. The BANZA Normative Manifest remains authoritative."*
and a guard fails if one states a requirement in its own voice. No simplified specification exists.

## 6. Public package and the rehearsal

`clean-room/packages/l0/` — **21 files**, built by positive allowlist from the L0 implementation set,
reproducible byte-for-byte from one commit, with provenance recording the source commit and both
digests. Excluded and asserted rather than trusted: the reference implementation, the demonstration
operator, ADRs, the README, internal reports, the assistant, tooling, fixtures.

The **package completeness rehearsal** ran twice, against frozen packages.

| Question | Class | Outcome |
|---|---|---|
| Q-0001 | `AMBIGUITY` | Which cases of a required vector file constitute conformance at a level. **Resolved** by `required_vector_cases` |
| Q-0002 | `MISSING_RULE` | Three capability vocabularies with no published mapping — an implementation could not declare a capability its profile required. **Resolved** by the capability registry |
| Q-0003 | `DISCOVERABILITY` | A pointer to material already held |
| Q-0004 | `TOOLING` | A ninth vector input shape defeated a generic runner |

All four are preserved in `clean-room/questions.jsonl` with their original classifications. Deleting a
resolved question would erase the evidence that the exercise worked.

**Re-run verdict: COMPLETE WITH OBSERVED DISCOVERABILITY AND TOOLING FINDINGS.** Zero `MISSING_RULE`,
zero `CONFLICT`, zero unresolved `AMBIGUITY`. The L0 obligation is 49 cases, read from the registry
rather than inferred; the BCJ/1 accept cases verify their own published digests, 15 of 15, from the
package alone.

**This is a package completeness rehearsal.** It is not a clean-room implementation, not an
independent implementation, and not an external implementation. It tested the artefact, not a
stranger's ability to read it.

## 7. Whitepaper

| | PT — canonical | EN — official translation |
|---|---|---|
| Source | `whitepaper.pt.tex` | `whitepaper.en.tex` |
| Pages | **12** | **12** |
| Sections | 12 | 12 |
| Figures | 9 | 9 |
| References | 10 | 10 |
| Overfull / undefined | 0 / 0 | 0 / 0 |
| Claim matrix | 0 outdated, 0 overstated, 0 unsupported | same |

The audit found the paper **under-represented** the surface rather than overstating it: 21 supported
claims, 0 overstated, 0 unsupported, 1 outdated fact (the version read `1.0`), and 11 mechanisms the
surface had and the paper omitted. All eleven are now represented — Normative Manifest, BCJ/1, numeric
domain, reason-code semantics, idempotency, anti-rollback with its limits, signing-input digest,
capability registry, vector applicability, publication availability, and the rehearsal.

Three figures were removed: each restated its own paragraph in boxes (`threat → mechanism → outcome`;
"outside the observed scope" against "what BANZA evaluates"; six boxes repeating the state sentence).
All 29 properties they carried were verified present in the prose. The nine that remain carry
relations prose cannot replace.

**Pipeline, both languages:**

```
whitepaper.pt.tex  →  PDF PT  ·  content/pt.json        (canonical edition)
whitepaper.en.tex  →  PDF EN  ·  content/en.json        (official translation)
content/<lang>.json  →  whitepaper.<lang>.tex           PROHIBITED
```

Both retired composers (`whitepaper-latex.py` for PT, `whitepaper-en-dossier.py` for EN) fail hard if
invoked and are out of the release path; the boundary guard self-tests that putting one back fails.
Derivation is deterministic in both languages, and a hand-edited JSON is caught with the prescribed
fix: edit the `.tex` and regenerate, never both.

`make whitepaper-verify`: committed PDFs byte-identical on rebuild — pt `b19f2b98…`, en `275c95d3…`.

## 8. Critique closure

| Critique | Verdict | Evidence |
|---|---|---|
| "Framework, not protocol" | **REFUTED** | Contracts, APIs, schemas, state machines, execution semantics, reason codes, idempotency, public vectors |
| Canonicalization absent | **REFUTED** | BCJ/1, 24 vectors, one rule delegated to by 11 engines |
| Error/reason semantics absent | **REFUTED** | `spec/reason-codes.md`, published registry, 21 vectors |
| Idempotency absent | **REFUTED** | `spec/idempotency.md`, scope tuple, request identity, retention floor |
| Normative surface unidentifiable | **REFUTED** | Normative Manifest, 150 artifacts classified |
| BCJ/1 numeric-domain concern | **CLOSED** | Audit found no field requiring more; schemas aligned; boundary vectors |
| Trust rollback | **CLOSED, with a stated boundary** | Monotonic local observation, equal-marker conflict detection |
| Global transparency | **NOT PROVIDED — by design and stated** | §1 of the specification is normative text, not a caveat |
| Publication availability | **KNOWN LIMITATION** | Single origin, no mirrors, disclosed in the Whitepaper |
| Mojaloop omitted | **ADDRESSED** | Primary sources, corrected positioning, no superiority claim |
| DID / VC | **EVALUATED — NOT ADOPTED** | Conditions that would change each are recorded |
| Certificate Transparency | **EVALUATED — NOT ADOPTED** | Its added property conceded; its own limits quoted |
| Surface hard to navigate | **ADDRESSED** | Profile registry, dependency graph, derived views, L0 package |
| Independent implementation | **STILL NOT DEMONSTRATED** | Valid, open, and disclosed on every surface |
| Version should change | **REJECTED** | Remains exactly `1.0.0` |

## 9. Final state

| | |
|---|---|
| Protocol version | `1.0.0` |
| Phase | pre-production |
| PT canonical | YES |
| PT pages | 12 |
| EN pages | 12 |
| PT `.tex` authority | YES |
| EN `.tex` editorial authority | YES |
| JSON → TEX in release path | **NO** |
| Normative Manifest | YES — 150 artifacts |
| BCJ/1 | YES |
| Capability registry | YES |
| Profile registry | YES |
| Vector applicability | YES |
| Concrete L4 profiles | **0** |
| Mirrors | NO |
| Certificate Transparency | NO |
| DID | NO |
| Verifiable Credentials | NO |
| Trust Root changed | **NO** |
| Independent external implementation demonstrated | **NO** |
| Package completeness rehearsal | YES |
| Real-money production operation | **NO** |

## 10. Remaining limitations

1. **No independent third-party implementation has been demonstrated.** Package completeness is not
   implementability by a stranger.
2. **No performance, scalability or adoption measurement exists.**
3. **Trust publication depends on a single canonical origin.** Fail-closed preserves correctness;
   unavailability can prevent a new evaluation.
4. **No concrete external-interoperability profile is published**, so L4 has never been demonstrated.
5. **Monotonic trust observation is local.** No stale-first-view protection, no global transparency,
   no cross-observer consistency.
6. **Reconciliation is under-specified** relative to transfer, payment, routing and settlement: an
   invariant with a stated mechanism, no contract or vector of its own.
7. **The conformance vectors do not share one outcome grammar** — nine shapes. Every case is
   determinable and the package manifest publishes the shapes; deliberately not normalised, recorded
   as a clean-room hypothesis.

## 11. Follow-ups, deliberately not done here

- Normalising the vector outcome grammar, pending evidence from a real external trial.
- A dedicated reconciliation contract, if federation evidence shows the invariant is insufficient.
- Redundant distribution of signed trust material, if availability becomes a demonstrated constraint.
