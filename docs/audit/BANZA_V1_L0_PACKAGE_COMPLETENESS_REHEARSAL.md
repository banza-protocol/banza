# BANZA v1.0.0 — L0 Public Package Completeness Rehearsal

**Phase F of the external-review closure.** Protocol version `1.0.0`, unchanged.

## What this is, and what it is not

This is a **package completeness rehearsal**. It is not a clean-room implementation, not an
independent implementation, not an external implementation, and not a third-party implementation.
The agent conducting it has seen this repository and its reference implementation, so nothing here
can establish that a stranger could implement BANZA from the package.

What it can establish, and what it tests: **does the L0 export contain enough to determine L0
behaviour, without the repository, the engines, the ADRs, the assistant, or implicit knowledge of the
reference implementation?**

Throughout, the discipline was: whenever something seemed obvious, ask *where is this in the package?*
If it could not be pointed at, that was the finding.

---

## 1. Package identity — frozen before the rehearsal

| | |
|---|---|
| Source commit | `8c332f82bb571fd37ec3be0a8ed6deba11e2c51b` |
| Protocol version | `1.0.0` |
| Package manifest SHA-256 | `dc351634b14f4c1da976c1a92042bd2692748397…` |
| Normative Manifest SHA-256 | `ee404bc3a82bfbe9bb3e5c02899e25a2eab916d5…` |
| Files | **21** |
| Tree digest | `4e71ce2ae9df4dea9a2dde7efbd57d6a7693728c0007d88744c2f1142b46e72f` |

The 21 files: `LICENSE`, `NOTICE`, `TRADEMARKS.md`, `README.md`, `package-manifest.json`,
`provenance.json`, `spec/canonicalization.md`, `spec/reason-codes.md`, `contracts/invariants.json`,
`contracts/production/{protocol-version, reason-code-registry, operator-manifest,
normative-manifest, conformance-profiles + its schema}`, `conformance/{capabilities,manifests}/schema.json`,
`conformance/vectors/{canonicalization, operator-manifests, reason-codes}.json`,
`docs/guides/implement-l0.md`.

**Environment.** A fresh empty directory containing only the package. No repository, no `.git`, no
`engines/`, no demonstration operator, no ADRs, no audit reports, no assistant, no runtime. No
internet was used to look up BANZA rules, BANZA documentation, the BANZA repository, or any BANZA
implementation.

**Input integrity after every test:** tree digest `4e71ce2a…` — **unchanged**. The rehearsal did not
modify its input.

---

## 2. Outgoing-link gate

Phase E declared seven outbound references. The gate asks one thing of each: *is it needed to
determine L0 behaviour?*

| Source | Target | Classification | Needed for L0? | Result |
|---|---|---|---|---|
| `spec/canonicalization.md` | `decisions/adr/ADR-082-banza-canonical-json.md` | rationale | **NO** | Cited as "Authority" in the header. Every BCJ/1 rule — P1–P8, §7 rejection semantics, the numeric domain — is stated in the specification itself. Nothing in it defers to the ADR |
| `spec/canonicalization.md` | `decisions/adr/ADR-081-…versioning-decision.md` | rationale | **NO** | Cited for versioning policy. The version in force, `BCJ/1`, is stated in the specification |
| `spec/reason-codes.md` | `decisions/adr/ADR-083-reason-code-model.md` | rationale | **NO** | Same header pattern; §1–§8 carry the rules |
| `spec/reason-codes.md` | `contracts/federation/federation-trust.json` | higher profile | **NO** — *tested, not assumed* | §4 says `failed_checks` values are the check ids published there. **The vector file carries `published_check_ids` — all 13 — so RC-003 and RC-011 are decidable inside the package.** See §5, Q-0001 |
| `docs/guides/implement-l0.md` | `docs/derived/implementation-sets.json` | derived view | **NO** | Cited for counts and derivation; informative |
| `docs/guides/implement-l0.md` | `docs/derived/implementation-sets.md` | derived view | **NO** | Cited for per-level increments of L1–L4 |
| `docs/guides/implement-l0.md` | `conformance/package/README.md` | sibling package | **NO** | The vectors it describes are already present. Recorded as Q-0003 |

**Every row: NO.** No L0 rule requires opening a target outside the package.

The fourth row was the one that had to be tested rather than judged. `failed_checks` names an external
authority, and had the vector file not carried the ids, that row would have read **YES** and the
package would have been **NOT SELF-CONTAINED**. It carries them.

---

## 3. Requirement inventory, built from the package alone

43 normative statements were located in the two specifications by BCP 14 keyword, plus `MON-001` in
the invariant registry and the structural requirements of three schemas.

| Requirement | Public package source | Vector / test | External BANZA source needed? |
|---|---|---|---|
| Numbers are integers only | `spec/canonicalization.md` P1 | BCJ-R* reject cases | **NO** |
| Numeric domain ±(2⁵³−1) | `spec/canonicalization.md` P2 | canonicalization vectors | **NO** |
| Duplicate members rejected | P3 | BCJ-R* | **NO** |
| Unknown members preserved, subject to the profile | P4 | canonicalization vectors | **NO** |
| No Unicode normalisation | P6 | canonicalization vectors | **NO** |
| UTF-16 member ordering | P5 | 15 accept cases with published bytes | **NO** |
| Rejection is an error, never empty bytes | §7 | reject cases | **NO** |
| Canonical bytes and their digest | §5 | each accept case publishes `canonical` + `sha256` | **NO** |
| Monetary values are integers in minor units | `contracts/invariants.json` MON-001 | — | **NO** |
| A status decides, a reason code explains | `spec/reason-codes.md` §1 | RC-* | **NO** |
| Reason-code grammar and extension namespace | §2, §6 | RC-001..RC-009 | **NO** |
| Published vocabularies and their closure | `reason-code-registry.production.json` | RC-* | **NO** |
| `failed_checks` carries check ids, not prose | §4 | RC-003, RC-010–RC-013 | **NO** — ids carried in the vector file |
| Manifest structure and required members | `operator-manifest.production.schema.json`, `conformance/manifests/schema.json` | MAN-001..004 | **NO** |
| Capability declaration shape | `conformance/capabilities/schema.json` | MAN-* | **NO** |
| Protocol version declared and evaluated | `protocol-version.json` | MAN-* | **NO** |
| What L0 requires, and what it does not | `conformance-profiles.production.json` | — (it is the definition) | **NO** |
| Extent of the normative surface | `normative-manifest.json` | — | **NO** |
| Licence, patent grant, trademark separation | `LICENSE`, `NOTICE`, `TRADEMARKS.md` | — | **NO** |

**Reference-code dependencies: 0. ADR dependencies: 0. README dependencies: 0. Assistant
dependencies: 0.**

---

## 4. L0 behaviour map

| Block | Verdict | From |
|---|---|---|
| Version — protocol | **DETERMINABLE** | `protocol-version.json`; manifest and registry agree |
| Version — manifest applicability | **DETERMINABLE** | manifest + capabilities schemas, 4 vectors |
| Input safety — malformed JSON | **DETERMINABLE** | §7 + 9 reject cases |
| Input safety — duplicate members | **DETERMINABLE** | P3 |
| Input safety — Unicode | **DETERMINABLE** | P6 |
| Input safety — numeric domain | **DETERMINABLE** | P2, bound stated numerically |
| BCJ/1 — acceptance / rejection | **DETERMINABLE** | 15 accept / 9 reject |
| BCJ/1 — canonical bytes | **DETERMINABLE** | published bytes + digest per case |
| Discovery | **NOT APPLICABLE AT L0** | registry requires no endpoint; guide §5 says publication starts at L3 |
| Identity / trust / freshness / anti-rollback | **NOT APPLICABLE AT L0** | `not_required`: "no signing key, no key manifest, no published metadata" |
| L0 contracts — inputs / outputs | **DETERMINABLE** | manifest schema |
| L0 contracts — status / reason semantics | **DETERMINABLE** | §1 + published registry |
| Evidence | **DETERMINABLE** | guide §10; no signed structure required at L0 |
| Conformance — vectors and outcomes | **DETERMINABLE, with a scope ambiguity** | 49/49 cases determinable; see Q-0001 |

### An executable check, from the package alone

The BCJ/1 accept cases publish both the canonical bytes and their SHA-256. Recomputing the digest of
every published `canonical` string: **15 of 15 match, 0 divergent.** That is the specification
verifying itself out of the package, with no BANZA code involved.

---

## 5. Questions raised

Four, recorded before being resolved, against the frozen package digest.

### Q-0001 — `AMBIGUITY` · which cases constitute L0 conformance

L0 requires the whole of `conformance/vectors/reason-codes.json`. Five of its 21 cases (RC-003,
RC-010–RC-013) concern `failed_checks`, which the registry scopes to *"federation trust evaluation"* —
an L3 concern, and L0 requires no federation capability. Must an L0 implementation pass them?

Two readings survive. **(a)** A required vector file means all of its cases; this is what the
registry's plain text says, and under it every case is determinable. **(b)** Only cases within the
level's scope apply — a reading made available by the fact that `operator-manifests.json` carries a
per-case `certification_level` while the other two files carry no scope marker at all.

Classified `AMBIGUITY` rather than `MISSING_RULE` because reading (a) is complete: no behaviour is
undetermined, only the *amount* an L0 implementation must build. Classified `AMBIGUITY` rather than
`DISCOVERABILITY` because the answer is not elsewhere in the package — it is absent. Resolved
conservatively for this rehearsal by adopting reading (a).

### Q-0002 — `MISSING_RULE` · three capability vocabularies, no mapping

The profile registry requires capabilities named `consumer_payment`, `merchant_acceptance`,
`transfer`, `traceability`, `payment_request`, `payment_initiation`, `instant_execution`,
`cross_operator_routing`, `reconciliation`, `inter_operator_settlement`, `external_acquiring`.

`conformance/capabilities/schema.json` declares `supports_wallets`, `supports_qr`, `supports_traces`,
`supports_federation` and so on. The operator manifest's `capabilities` member is a free-form array of
strings whose published examples are hyphenated: `'payment-intents'`, `'qr'`, `'federation'`.

**Three vocabularies. No mapping is published anywhere.** Nine of the eleven profile-registry
capability names appear nowhere in the package outside the registry itself.

Verified afterwards against the full repository: the mapping does not exist there either.
`docs/governance/certification-boundary.md` defines the capability names in prose and never links them
to the `supports_*` flags; `spec/capability-negotiation.md` defines the `supports_*` flags
independently. This is a real gap on the normative surface, not a packaging artefact.

Classified `MISSING_RULE`: there are not two readings, there is no reading. An implementation cannot
perform the required act — declaring a capability its profile requires — from published material.

**It does not affect the L0 verdict**: L0's `required_capabilities` is empty. It blocks L1 and above.

### Q-0003 — `DISCOVERABILITY` · a pointer to material already held

The guide points at `conformance/package/` for vectors "packaged to be consumed outside this
repository". That directory is not in the package, and the vectors are already present. Nothing is
missing; the reference is redundant in this context.

### Q-0004 — `TOOLING` · a ninth vector shape

A generic runner keyed on `input` found none in RC-021, whose input is `step` + `engine_status`.
Fully determinable once read individually. Recorded as `TOOLING`, not `AMBIGUITY`: nothing about the
expected behaviour is unclear — a generic runner failed, not the specification.

---

## 6. The vector-grammar hypothesis, measured

Phase D left the seven outcome grammars deliberately unnormalised, and Phase E recorded the question
without prompting anyone about it. This rehearsal is the first measurement.

**Nine distinct (input, output) shapes across 49 cases:**

| Input members | Output members | Cases |
|---|---|---|
| `input` | `canonical`, `expect`, `sha256` | 15 |
| `input_raw` | `expect` | 9 |
| `input` | `expect` | 9 |
| `input` | `expected` | 4 |
| `a`, `b` | `expect` | 4 |
| `input` | `expect`, `outcome` | 3 |
| `input` | `expect`, `required_behaviour` | 3 |
| `input_a`, `input_b` | `expect` | 1 |
| `step`, `engine_status` | `expect` | 1 |

| Measurement | Result |
|---|---|
| Shapes requiring specific handling | **9** |
| Cases where the shape produced *ambiguity* about expected behaviour | **0** |
| Questions caused by the heterogeneity | **1** (Q-0004, `TOOLING`) |
| Errors caused by it | 1 — a generic runner mis-reporting RC-021, corrected by reading the case |

**Interpretation, stated carefully.** The heterogeneity cost one question and zero ambiguities. It is
a tooling tax, not a comprehension barrier: `expect` versus `expected` in two files is a trap for a
generic runner and invisible to a human reading one case at a time. This is a single rehearsal by a
contaminated reader, and it is weak evidence — it is a data point for the hypothesis, not a
resolution of it.

---

## 7. Passes

| Pass | Result |
|---|---|
| **Contradictions** (F12) — profiles, version, BCJ/1, trust, reason codes, status, evidence, contracts, vector outcomes | **none**. All four artefacts declaring a protocol version declare `1.0.0`; the capability→level annotations agree with the corrected model; L4 is parameterized and cannot be reached by satisfying L3 |
| **Authority** (F13) — BCP 14 language in non-normative artefacts | **clean**. The guide, package README and manifests contain no requirement stated in their own voice |
| **Implementation detail** (F16) — function names, Rust types, module paths, crate names as a way of defining behaviour | **0 occurrences** |
| **Trust digest** (F17) | **not applicable at L0.** L0 requires no trust material, which the package states explicitly. Signing inputs are defined in `spec/trust-freshness.md`, first required at L3 and correctly absent here |
| **L3 ⇒ L4** (F18) | The package carries the profile registry, which declares L4 parameterized with `result_without_a_selected_profile: not_run` and zero published external profiles. The false conclusion is not available |
| **Licensing** (F19) | Determinable from the package alone: Apache-2.0 identified, patent grant §3 present, `NOTICE` names the holder, `TRADEMARKS.md` states the separation and permits *"Independent implementation of the BANZA protocol"* |
| **Normative basis** (F15) — a requirement existing only in prose, a guide, a comment or a vector | none found. Every rule traced to a specification, contract, schema or registry |

---

## 8. Metrics

| | |
|---|---|
| Package files | 21 |
| Normative requirements identified | 43 BCP 14 statements + MON-001 + 3 schemas |
| Outgoing links total | 7 |
| Outgoing links required for L0 | **0** |
| Unresolved links | **0** |
| Questions | **4** |
| — `CLARIFICATION` | 0 |
| — `DISCOVERABILITY` | 1 |
| — `AMBIGUITY` | 1 |
| — `MISSING_RULE` | 1 (out of L0 scope) |
| — `CONFLICT` | 0 |
| — `VECTOR_GAP` | 0 |
| — `TOOLING` | 1 |
| Reference-code dependencies | **0** |
| ADR dependencies | **0** |
| README dependencies | **0** |
| Assistant dependencies | **0** |
| Input modified by the rehearsal | **no** — tree digest unchanged |

---

## 9. Verdict

### **COMPLETE WITH DISCOVERABILITY AND AMBIGUITY FINDINGS**

L0 behaviour is fully determinable from the package. No rule is missing for L0, no contradiction
exists, no outgoing reference is required, and nothing depends on the reference implementation, an
ADR, the README or the assistant.

Two findings qualify the result:

- **Q-0001 (`AMBIGUITY`)** — which cases of a required vector file constitute conformance at a level.
  L0 remains determinable under the conservative reading; the ambiguity is real and unresolved.
- **Q-0002 (`MISSING_RULE`)** — the capability vocabularies are unreconciled. Out of scope for L0, and
  **a material finding for L1 and above**: it is a protocol decision (which vocabulary is canonical,
  whether the others are aliases, whether one is retired), not an editorial correction, and it has not
  been invented here.

The verdict was not forced. Had the reason-code vectors omitted `published_check_ids`, the outgoing
link to `contracts/federation/federation-trust.json` would have been required and this would have read
**NOT COMPLETE**.

### What this does not establish

**No independent implementation of BANZA has been demonstrated.** This rehearsal tested the artefact,
not a stranger's ability to read it. The effort of implementing L0 remains unmeasured, and the
learnability of the specification cannot be measured by anyone who has already seen the repository.
