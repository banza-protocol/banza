# BANZA v1.0 — Open Protocol & Normative Completeness Audit

> **Audit only.** This milestone discovers, inventories and classifies the current state. It changes no
> architecture, no contract, no schema, no profile, no trust material, no governance and no Whitepaper.
> Nothing found here is remediated in this branch. Remediation is a later, separate milestone.

| | |
|---|---|
| Branch | `audit/banza-v1-open-protocol-normative-completeness` |
| Base commit | `c73cbda` (main) |
| Protocol version audited | `1.0.0`, state `M2_PROTOCOL_IMPLEMENTATION` (`contracts/production/protocol-version.json`) |
| Date | 2026-08-12 |

---

## 1. Executive Summary

BANZA v1.0 has a **real, substantial and largely well-formed normative surface**: 72 contract artifacts
(37 of them the production baseline), 68 published invariants, 61 conformance vectors across 7 suites, a
declared protocol version with an explicit breaking-change policy, and a licensing/governance/trademark
layer that — unusually for a project at this stage — **explicitly authorises independent implementation**.

The external criticism that BANZA is "just a conformance framework, not a protocol" is **partially
confirmed, and mostly for a different reason than the critic gives**. The protocol's *evaluation* surface
(profiles, journey, trust evaluation, evidence) is far more completely specified than its *execution*
surface (routing messages, payment interaction, error taxonomy). But the decisive finding is narrower and
more serious than a genre dispute:

**The single mechanism on which every signature, digest and reproducibility claim in the protocol depends
— the canonical byte form of a JSON artifact — is not specified anywhere in the public surface.** It
exists only as `serde_json::to_string()` inside `engines/banza-trust/src/lib.rs`. The production schemas
simultaneously promise that these digests are *"recalculável por qualquer verificador independente"*.
That promise cannot currently be met by an independent implementation. This is the audit's only P0.

Three further findings are material:

- **The Whitepaper does not point to the normative surface.** It correctly states that requirements live
  in "os artefactos normativos versionados aplicáveis" but contains **zero** references to any path, URL
  or artifact name. Hypothesis H2 is **CONFIRMED** — and it is a documentation defect, not an
  architectural one.
- **Five contracts declare their `_source_of_truth` to be code, and all five paths do not exist** in this
  repository. For `key-manifest.json` and `revocation-list.json` — the core trust artifacts — the declared
  normative authority is unresolvable.
- **No artifact anywhere declares the RFC 2119 / BCP 14 keyword convention**, although MUST/SHALL/REQUIRED
  are used 597 times across `spec/`, `contracts/`, `decisions/` and `docs/governance/`.

On the open-protocol question the audit is **positive and evidenced**: the specification is public,
Apache-2.0 covers documentation as well as code (with its express patent grant), and `TRADEMARKS.md`
explicitly permits the phrase *"Independent implementation of the BANZA protocol"* without special
authorisation. Nothing found in this audit legally or procedurally prevents a third party from
implementing BANZA v1.0.

**Overall: the protocol is open; the specification is not yet self-sufficient.**

---

## 2. Scope

Inspected: `contracts/` (all 84 files, 72 JSON parsed), `spec/` (26 files, README and federation set read),
`conformance/` (52 files, suites and vectors counted), `decisions/` (76 ADRs + 6 RFCs, status extracted),
root governance/licensing documents (`LICENSE`, `NOTICE`, `GOVERNANCE.md`, `CONTRIBUTING.md`,
`MAINTAINERS.md`, `TRADEMARKS.md`, `SECURITY.md`), `engines/banza-trust` canonicalization and signing
path, and the canonical Whitepaper sources.

**Not exhaustively read** (and therefore not the basis of any classification here): the full text of all
76 ADRs, all 490 files under `docs/`, the `website/` surface, and the internals of engines other than
`banza-trust`. Where this limits a conclusion, it is stated at the finding.

---

## 3. Methodology

Every classification below is anchored to an inspected artifact and, where behaviour was in question,
to an executed check. Two claims in this report rest on **executed empirical evidence**, not reading:

1. The canonicalization behaviour of the trust engine was reproduced by compiling and running the same
   `serde_json` serialisation the engine uses (§14).
2. The dangling `_source_of_truth` paths were tested for existence on disk (§5.4).

False positives were rejected per the milestone rules: an endpoint is not a specification, a schema is not
a semantics, a passing test is not implementability, a `README` is not normative, and an RFC in `Draft` is
not adopted.

---

## 4. Terminology used in this report

| Term | Meaning here |
|---|---|
| **Normative surface** | Artifacts a third party may legitimately rely on to implement BANZA |
| **Reference implementation** | Behaviour currently realised by BANZA's own code |
| **ALINHADO** | Publicly identifiable, sufficiently specified, coherent, covered, usable without private knowledge |
| **IMPLEMENTADO MAS MAL ESPECIFICADO** | Behaviour exists in code/tests, public specification insufficient to reimplement it correctly |
| **GAP REAL** | Relevant need not sufficiently specified, not implemented, contradictory, or claim unsupported |
| **OUT OF SCOPE BY DESIGN** | Deliberately delegated to operators / Layer 3 — an explanation, never a status on its own |

---

## 5. Normative Surface

### 5.1 What is present

| Area | Artifacts | Evidence |
|---|---|---|
| Protocol version + compatibility policy | 1 | `contracts/production/protocol-version.json` — `protocol_version 1.0.0`, `wire_compatible_with ["1.0.x"]`, explicit breaking-change policy, `conformance_levels L0–L4`, state model |
| Production contract baseline | 37 | `contracts/production/*.json` |
| Federation contracts | 7 | `contracts/federation/*.json` |
| OpenAPI surfaces | 7 | `contracts/openapi/*.yaml` |
| Domain schemas (QR, events, webhooks, payments, collections, fees, settlements, wallets, proofs) | ~27 | `contracts/**` |
| Published invariants | 68 | `contracts/invariants.json` |
| Federation invariants | 63 references | `spec/federation/FEDERATION_INVARIANTS.md` |
| Conformance suites / vectors | 7 suites / 61 vectors | `conformance/` |
| Accepted architectural decisions | 73 of 76 ADRs | `decisions/adr/` |

This is not a thin surface. The **evaluation** half of the protocol — profiles, validation journey state
machine, trust evaluation, evidence bundle, certification record — is specified in genuine detail.

### 5.2 Normative status is declared, but the convention is not

66 of 72 contract JSON files carry an explicit `_authority` field. That is good practice and materially
better than most projects at this stage.

However: **`MUST` / `SHALL` / `REQUIRED` appear 597 times** (spec 143, contracts 228, decisions 147,
governance 76) and **no artifact anywhere declares the RFC 2119 / BCP 14 convention**. A search for
"RFC 2119", "BCP 14" and the standard "key words … are to be interpreted as described" formula returns
nothing. The normative force of the most load-bearing words in the specification is therefore assumed
rather than established.

→ **GAP REAL (P1)**

### 5.3 There is no index of the normative surface

No artifact states *"these files constitute BANZA v1.0"*. The surface must be inferred from directory
names and cross-references. `contracts/README.md` describes the subdirectories, `conformance/README.md`
describes the suites, but nothing binds them into an identified, versioned whole.

→ **GAP REAL (P1)**

### 5.4 Five contracts declare code as their source of truth — and the code is absent

| Contract | Declared `_source_of_truth` | Path exists? |
|---|---|---|
| `federation/key-manifest.json` | `tools/root-ceremony/ceremony_script.py — cmd_generate_key_manifest()` | **No** |
| `federation/revocation-list.json` | `tools/root-ceremony/ceremony_script.py`; consumer `tools/banza-conformance/trust_root.py` | **No** |
| `events/envelope.schema.json` | `reference/sandbox-operator/src/events.rs` | **No** |
| `events/types.json` | `reference/sandbox-operator/src/events.rs` | **No** |
| `qr/lifecycle.json`, `qr/payload-format.json` | `core/crates/banza-qr/src/{qr_code,engine}.rs` | **No** |

Two distinct problems compound here. First, the model is inverted: the schema is declared to *mirror* the
code rather than the code to *implement* the schema — `key-manifest.json` says so explicitly ("This schema
mirrors the artifact the ceremony emits, not earlier prose"). Second, the declared authority **does not
exist in the repository**, so a third party following the pointer arrives nowhere. This affects the Key
Manifest and the BRL, which are the root of the entire trust model.

A further six production contracts self-describe as *"Documentary/reference contract — mirrors the Rust
`banza-target-registry`…"* (`operator-record`, `implementation-record`, `discovery-document`,
`capabilities-document`, `journey-receipt`, `operation-receipt`).

→ **IMPLEMENTADO MAS MAL ESPECIFICADO (P1)** — with the dangling-pointer aspect at **P1** severity because
the affected artifacts are trust-critical.

### 5.5 All six RFCs are Draft

`RFC-0001 multi-operator-routing`, `RFC-0002 cross-operator-settlement`, `RFC-0003 wallet-capabilities`,
`RFC-0004 provider-capability-negotiation`, `RFC-0005 operator-discovery`, `RFC-0006 offline-payment-support`
— **all `Draft`**. Per `decisions/rfc/README.md`, Draft is explicitly not adopted.

This is **correct process hygiene**, not a defect in itself: the corresponding contracts
(`federation-routing.json`, `federation-manifest.json`, discovery schemas) exist independently of the
drafts. It is recorded because it means routing/discovery/settlement have **no adopted RFC-level
narrative specification** behind their schemas.

→ **ALINHADO** as process; contributes to §7's finding on execution-surface thinness.

---

## 6. Gate 1 — Protocol Completeness

Normative-sufficiency test (§9 of the milestone): *if the reference implementation vanished, could a
competent team implement each capability from the public artifacts alone?*

| # | Capability | Verdict | Evidence / limiting factor |
|---|---|---|---|
| 1 | Protocol version identification | **SIM** | `protocol-version.json` with compatibility + state model |
| 2 | Discovery | **PARCIALMENTE** | `discovery-document` schema exists but self-declared documentary, mirroring Rust; RFC-0005 Draft |
| 3 | Canonical origin | **SIM** | `implementation-record` §origin, host pinning rule stated (ADR-068 §4.7) |
| 4 | Implementation identification | **SIM** | `implementation-record`, `operator-record` |
| 5 | Manifests | **PARCIALMENTE** | `operator-manifest`, `federation-manifest` present; field semantics partly by example |
| 6 | Key publication | **PARCIALMENTE** | `key-manifest.production.schema.json` present; source of truth dangling (§5.4) |
| 7 | Signatures | **NÃO** | Signing envelope and canonical bytes unspecified (§14) |
| 8 | Key delegation | **SIM** | `delegated-signing-key`, `root-delegation`, domain separation stated (ADR-038) |
| 9 | Rotation | **PARCIALMENTE** | INV-ROOT-010 states the security requirement; process is explicitly out-of-band |
| 10 | Revocation | **PARCIALMENTE** | BRL schema + fetch/fail-closed rules published; signature verification depends on §14 |
| 11 | Profiles | **SIM** | L0–L4 in `protocol-version.json`, `conformance-report`, `certification-record` |
| 12 | Applicable payment contracts | **PARCIALMENTE** | Schemas exist (payment-intent, sessions, transfers); interaction semantics thin (§7) |
| 13 | Payment initiation | **PARCIALMENTE** | QR + payment-session schemas; lifecycle source of truth dangling (§5.4) |
| 14 | L3 interoperability | **PARCIALMENTE** | Routing/obligation/event contracts + 37 executed fixtures; message-level semantics partly by fixture |
| 15 | L4 external integration | **PARCIALMENTE** | Defined as profile-scoped; profile content not published |
| 16 | Federation | **SIM** | `federation-trust.json`, `FEDERATION_INVARIANTS.md`, executed suite |
| 17 | Technical routing | **PARCIALMENTE** | `federation-routing.json` + fixtures; RFC-0001 Draft; error taxonomy open (§7) |
| 18 | Evidence | **SIM** | `evidence-bundle.production.schema.json` + executed bundle |
| 19 | Receipts | **PARCIALMENTE** | `journey-receipt`, `operation-receipt` — but `reason_codes` is an open string array |
| 20 | Reason codes | **NÃO** | No closed protocol-wide taxonomy (§7.2) |
| 21 | Validation | **SIM** | `validation-journey-state-machine.production.json` |
| 22 | Trust evaluation | **SIM** | 10 conjunctive checks in `federation-trust-evaluation.production.schema.json`, executed |
| 23 | Versioning | **SIM** | Explicit policy in `protocol-version.json` |
| 24 | Compatibility | **SIM** | `wire_compatible_with`, major/minor/patch policy |
| 25 | Canonicalization | **NÃO** | Not specified anywhere public (§14) |
| 26 | Expected behaviour | **PARCIALMENTE** | Invariants published; interaction-level behaviour partly implicit |

**Totals: 10 SIM · 13 PARCIALMENTE · 3 NÃO.**

The three **NÃO** are signatures, reason codes and canonicalization — and the first is a consequence of
the third.

---

## 7. Protocol vs Conformance Framework Assessment

The honest answer is that BANZA today specifies **evaluation** far better than **execution**.

### 7.1 What is genuinely protocol-grade

Messages and state for the *validation and trust* domain are properly specified: the validation journey
state machine is a published contract with explicit states; the Open Trust Evaluation is a published
10-check conjunctive contract with a closed outcome enum (`ROUTING_ALLOWED` / `FAIL_CLOSED`); the evidence
bundle has a defined composition; discovery has a fixed path model and origin binding.

Two implementations *can* agree on what a validation result means, because the outcome vocabulary is
closed and published.

### 7.2 Where the execution surface is thin

| Domain | Finding |
|---|---|
| Messages / payloads / fields | Present as schemas for routing request/response, obligations, events |
| **Error taxonomy** | **No closed protocol-wide enumeration.** `reason_code` has a closed 18-value enum **only** in `certification-record`. In `journey-receipt` and `operation-receipt`, `reason_codes` is `{"type":"array","items":{"type":"string"}}` — an open string list |
| **Idempotency** | Expressed operationally (`INV-IDEM-*`, routing fixtures test replay and 409 conflict) but the *rule* — key scope, conflict definition, retention — is carried by fixtures and engine behaviour rather than by a normative statement |
| Retries / timeouts | Only the BRL freshness window (6 h) and cache bound (21 600 s) found; no general retry/timeout semantics |
| State transitions | Specified for the validation journey and certification; **not** for cross-operator payment execution |
| Settlement finality | Correctly delegated — see §8 |

Two implementations could agree on *whether B is evaluable*, but would have to negotiate privately on
*what exactly went wrong* in a routed interaction, because the reason vocabulary is open.

### 7.3 Assessment

**H1 — "BANZA is more a conformance framework than a protocol": PARTIALLY CONFIRMED.**

Confirmed in the sense that the conformance/trust half is specified to a materially higher standard than
the execution half, and that a reader encountering `contracts/` and `conformance/` would reasonably form
that impression. **Refuted** in the sense the critic means it: BANZA does define wire artifacts, a closed
trust-evaluation contract, invariants, a discovery model and a versioning policy — these are protocol
constructs, not merely assessment criteria. The correct statement is that BANZA is a protocol whose
**execution surface is less completely specified than its evaluation surface**.

---

## 8. Scope discipline — what is deliberately not BANZA's

The external review imports concepts from operational payment systems. Per §8 of the milestone, each was
tested against BANZA's declared boundary before being treated as a gap.

| Concept | Verdict |
|---|---|
| Payment state machine (end-to-end) | **OUT OF SCOPE BY DESIGN** and explicitly bounded: `spec/README.md` — "BANZA does not operate wallets, move funds, execute settlement". Boundary is **ALINHADO** |
| Settlement finality | **OUT OF SCOPE BY DESIGN.** Whitepaper §4 states routing/settlement/reconciliation "continuam a ser executadas pelos operadores ou esquemas aplicáveis". Boundary is **ALINHADO** |
| Idempotency | **IN SCOPE** — and under-specified normatively (§7.2) |
| Error taxonomy | **IN SCOPE** — and a real gap (§7.2) |

The boundary itself is well drawn and repeatedly stated. This part of the external critique does not
survive contact with the evidence.

---

## 9–10. Licensing

### 9. Specification licence

`LICENSE` is **Apache License 2.0**. Critically, `NOTICE` extends it explicitly: *"The Apache License 2.0
grants rights to use, reproduce, modify and distribute the covered **software and documentation** under
its terms."* The specification is documentation in this repository and is therefore covered.

| Question | Answer | Evidence |
|---|---|---|
| Publicly accessible? | **Yes** | Public repository `banza-protocol/banza` |
| Explicit licence? | **Yes** | `LICENSE` (Apache-2.0) + `NOTICE` extension to documentation |
| Authorises third-party implementation? | **Yes** | Apache-2.0 §2 + `TRADEMARKS.md` §5 permitted phrase *"Independent implementation of the BANZA protocol"* |
| Permission required to implement? | **No** | No such requirement found in any inspected document |
| Patent grant? | **Yes** | Apache-2.0 §3 (6 patent references in `LICENSE`) |
| Separated from trademark? | **Yes** | `NOTICE` and `TRADEMARKS.md` |
| Commercial implementation allowed? | **Yes** | Apache-2.0 imposes no field-of-use restriction |

→ **ALINHADO.** One residual observation, recorded without inflation: Apache-2.0 is a software licence
applied to a specification. This is common practice and the `NOTICE` extension is explicit, so no gap is
raised; a dedicated specification licence would be a clarity improvement, not a correction.

### 10. Reference implementation licence

Same Apache-2.0, same repository. The audit finds the separation **conceptually** stated (the Whitepaper
and `spec/README.md` both insist the reference implementation realises but does not define the protocol)
while **licensing** does not distinguish them — which is harmless, since the permissive licence is the
more favourable case for independent implementation.

→ **ALINHADO**

---

## 11. Governance

`GOVERNANCE.md` establishes: decisions made by active maintainers through a public process; ADR/RFC
mechanisms; explicit statement that *"No operator is approved or certified by a private decision"*; and an
explicit statement of what governance does **not** do (does not approve operators, does not certify).
`CONTRIBUTING.md` sets inbound = outbound licensing (Apache-2.0) with SPDX identifiers.

Applying the milestone's three-way distinction:

| Property | Verdict |
|---|---|
| **Transparent** | **Yes** — process, decisions and artifacts are public and versioned |
| **Participative** | **Yes, formally** — RFC process open to "maintainers, operators, community" |
| **Open (not dependent on a single private authority)** | **PARCIALMENTE** — `MAINTAINERS.md` §3 does not list any active maintainer; it states they "are recorded through repository ownership and public maintainer records". In practice the repository has one contributor |

The honest formulation: governance is **transparent and formally participative, but presently
single-maintainer in fact**. Recording this is required by §13 of the milestone — "não afirmar
'governação aberta' se a realidade actual demonstrar apenas transparência do processo". BANZA's own
documents do not overclaim here; they say "initial institutional maintainer", which is accurate.

→ **IMPLEMENTADO MAS MAL ESPECIFICADO (P2)** for the empty active-maintainer record and the absent
formal criteria for admitting maintainers.

### 11.1 Trust Root vs governance (§14 of the milestone)

The audit finds these **correctly separated**, and this is one of BANZA's stronger design points:

| Trust Root can | Trust Root cannot |
|---|---|
| Sign the Key Manifest, and only that (ADR-079 / INV-ROOT-004) | Change any normative rule |
| Authorise domain-separated delegated keys | Prevent anyone implementing a published version |
| Have its material revoked/rotated under threshold policy | Approve, certify or authorise an operator |

Controlling the Trust Root is **not** controlling the protocol. A third party can implement BANZA v1.0
without any interaction with the Trust Root; what it cannot do without trust material is participate in
*federated trust evaluation* — which is a different and correctly-scoped claim.

→ **ALINHADO**

---

## 12. IPR / Patents / Contributions

| Item | Finding |
|---|---|
| Copyright | `NOTICE` — © 2026 BANZAMI, with creation date 01/08/2025 |
| Patent grant | Apache-2.0 §3, including the defensive-termination clause |
| Contributor terms | `CONTRIBUTING.md`: contributions under Apache-2.0 unless stated otherwise; SPDX required |
| CLA | **None** |
| DCO / sign-off | **None found** |

**Is there any known legal condition that would prevent a third party implementing BANZA v1.0?**
**No.** Apache-2.0 with its patent grant, a `NOTICE` extending it to documentation, and a trademark policy
that explicitly permits "Independent implementation of the BANZA protocol" constitute an affirmative
answer. No patent claims, encumbrances or restrictive terms were found in any inspected artifact.

The absence of a CLA/DCO is a **provenance** weakness, not an implementation blocker: Apache-2.0 §5 covers
inbound contributions by default.

→ **ALINHADO**, with a P2 note on contribution provenance.

---

## 13. Trademark

`TRADEMARKS.md` draws exactly the four-way separation the milestone asks for:

- **Right to implement** — unrestricted ("Implements the BANZA protocol", "Independent implementation of
  the BANZA protocol" are permitted without authorisation)
- **Right to use the mark** — restricted to attribution/nominative use
- **Right to claim certification** — prohibited without the public repository process
- **Right to claim compatibility** — permitted, provided it does not suggest approval or partnership

→ **ALINHADO**

---

## 14. Gate 3 — Determinism and Canonicalization  ⚠ **P0**

The Whitepaper claims (§2): *"dadas entradas canónicas equivalentes, a mesma especificação, o mesmo perfil
e a mesma versão do motor, execuções independentes produzem veredictos e códigos de motivo semanticamente
equivalentes"*. The production schemas go further and promise recomputability by third parties:

> `signed-protocol-metadata.production.schema.json` — *"Hash de conteúdo sobre os bytes canónicos do
> objecto assinado. **Recalculável por qualquer verificador independente.**"*

**The canonical byte form is defined nowhere in the public surface.** It exists as:

```rust
// engines/banza-trust/src/lib.rs:59
pub fn canonical_bytes(doc: &Value, exclude: &[&str]) -> Vec<u8> {
    let mut obj = doc.clone();
    if let Value::Object(map) = &mut obj { for k in exclude { map.remove(*k); } }
    serde_json::to_string(&obj).unwrap_or_default().into_bytes()
}
```

Executed evidence (compiled and run against the same `serde_json` version the engine uses):

| Property | Observed | Consequence |
|---|---|---|
| Key ordering | Sorted lexicographically (`serde_json::Map` = `BTreeMap`; `preserve_order` not enabled) | Deterministic — but only because of an unstated dependency default |
| Numbers | `1e2` → `100.0`; `1.0` → `1.0`; `10000000000000000000000` → `1e+22` | **Not RFC 8785 (JCS)**. A JCS implementation emits `100` and different big-number forms → different bytes → **signature verification fails** |
| Unicode | No NFC/NFD normalisation applied | Two semantically identical documents can produce different digests |
| Excluded fields | Passed as a Rust argument per call site | An implementer cannot know which fields are excluded for which artifact |

Searches for `RFC 8785`, `JCS`, key-ordering rules, number-formatting rules and Unicode normalisation
across `contracts/`, `spec/` and `conformance/` return nothing normative. `contracts/webhooks/signature.json`
specifies an HMAC envelope in genuine detail — demonstrating the project knows how to do this — but that
covers webhooks only, not the trust artifacts.

**Classification: GAP REAL — P0.** This is the audit's only P0 and it satisfies the milestone's own P0
criteria on two counts: "comportamento essencial existente apenas no código" and "determinismo essencial
impossível de reproduzir". Every downstream claim — signature interop, digest identity, evidence replay,
semantic equivalence between implementations — rests on it.

Note in fairness: this does **not** mean BANZA's determinism claim is false. The property holds and is
demonstrated (byte-identical replay is executed in CI). It means the property is **not independently
reproducible from the public surface**, which is a specification defect, not a behavioural one.

---

## 15. Semantic Equivalence

The Whitepaper requires "semantically equivalent verdicts and reason codes". The audit finds:

- **Which fields must match exactly** — not specified
- **Which may legitimately diverge** — only execution timestamps are named ("Metadados não determinísticos, como marcas temporais de execução, são excluídos desta equivalência")
- **Reason-code comparability** — undermined by the open `reason_codes` array (§7.2)

Semantic equivalence therefore exists as a well-stated *concept* with a single named exclusion, but not as
a testable *rule*.

→ **IMPLEMENTADO MAS MAL ESPECIFICADO (P1)**

---

## 16. Evidence and Replay

The Evidence Bundle (`evidence-bundle.production.schema.json`) does carry subject, version, profile,
enumerated artifacts each with its own digest, and a bundle digest. Executed evidence in the repository
demonstrates byte-identical replay of the A→B scenario and of the OZ bundle.

Against the milestone's 14 replay questions the honest position is: inputs, hashes, profile, protocol
version and reason codes are preserved; the **engine version** is recorded; and offline re-evaluation is
possible **for anyone running the same engine**. The break point is single and already identified: a
*second* implementation cannot reproduce the digests without §14. Questions 10 ("could a second
implementation produce the same semantic result?") and 14 ("dependency on reference-implementation
internal behaviour?") therefore currently resolve **against** reproducibility.

→ **IMPLEMENTADO MAS MAL ESPECIFICADO (P1)**, blocked by the P0.

---

## 17. Gate 4 — Independent Implementation Readiness

**NOT READY FOR CLEAN-ROOM IMPLEMENTATION TEST.**

Blockers, in order:

1. **P0 — canonicalization/signing envelope unspecified** (§14). Without it a clean-room team cannot
   produce a verifiable signature or matching digest, which fails capabilities 6, 7, 10, 18, 19 and 22 of
   the sufficiency test.
2. **P1 — no normative-surface index** (§5.3). The team could not determine what constitutes BANZA v1.0.
3. **P1 — dangling source-of-truth pointers on trust artifacts** (§5.4).
4. **P1 — open reason-code vocabulary** (§7.2), preventing semantic comparability.

The package manifest itself is produced as Deliverable 4; it is deliverable *as a manifest* today, but the
test it enables should not be run until at least blocker 1 is closed.

---

## 18. Operational Independence

Applying the milestone's control-plane / data-plane distinction (§25):

| Dependency | Classification | Evidence |
|---|---|---|
| Transaction path between A and B | **OUTSIDE PROTOCOL** — no BANZA service required | A→B routing executes operator-to-operator; no BANZA endpoint in the funds/message path |
| `banza.network/.well-known/banza/key-manifest.json` | **NORMATIVE AND REQUIRED** (control plane) | `contracts/federation/key-manifest.json`: root signature on the manifest is "the SOLE basis for trusting any issuing key" |
| `banza.network/federation/revocation-list.json` | **NORMATIVE AND REQUIRED** (control plane) | `revocation-list.json`: operators "MUST fetch a fresh BRL at least every 6 hours and MUST NOT route to any operator appearing in a valid, non-expired BRL" |
| Technical Registry | **DISCOVERY AID** | `operator-record`: "Presence of a record NEVER implies admission…"; audited earlier as non-blocking |
| BanzAI | **TOOLING** | `GOVERNANCE.md` §10: not an authority; "o protocolo funciona sem esta interface" |
| Verification API / website | **REFERENCE IMPLEMENTATION** | Not referenced as required by any contract |
| `https://banza.network/contracts/...` (74 occurrences) | **SCHEMA IDENTIFIERS** — not runtime endpoints | JSON Schema `$id` values |

**Answer to the milestone's question:** two implementations **can** execute the applicable protocol
capabilities with no BANZA service in the transaction path. The Whitepaper's claim — "o BANZA não precisa
de intermediar mensagens nem fundos" — is **ALINHADO** and precisely worded.

But there is a real, previously unrecorded finding: **the trust plane has a single-origin liveness
dependency**. Trust evaluation is fail-closed and both the Key Manifest and the BRL are specified at one
canonical `banza.network` location, with **no mirroring, alternative origin or offline distribution
specified** (searched: `mirror`, `offline distribution`, `alternative origin`, `out-of-band`, `pinned copy`).
If that origin is unavailable, conforming implementations must fail closed and federated routing stops.

This is not the "central operational intermediary" the external critique alleges — funds and messages never
traverse it — but it is a genuine availability coupling that the current documents do not acknowledge.

→ Data plane **ALINHADO**; trust-plane availability **GAP REAL (P1)**.

---

## 19. Whitepaper Claim Traceability

Full matrix in Deliverable 3. Summary: of the claims traced, the substantive architectural claims are
supported; the failures are concentrated in **pointing** and in **canonicalization**.

The single systemic documentation finding: the Whitepaper states requirements live in "os artefactos
normativos versionados aplicáveis" and contains **zero** references to any path, URL or artifact name
(`grep` for `contracts/`, `conformance/`, `decisions/`, `github.com/banza` in the canonical PT source
returns 0). A reader cannot get from the Whitepaper to the normative surface.

---

## 20. External Review Hypotheses

| # | Hypothesis | Verdict | Basis |
|---|---|---|---|
| **H1** | "More a conformance framework than a protocol" | **PARTIALLY CONFIRMED** | §7 — evaluation surface strong, execution surface thin; but wire artifacts, closed trust contract and invariants do exist |
| **H2** | "The Whitepaper does not make the normative protocol identifiable" | **CONFIRMED** | §19 — zero pointers; compounded by the absence of a normative index (§5.3) |
| **H3** | "Missing messages, fields, states, idempotency, error taxonomy" | **PARTIALLY CONFIRMED** | §7.2 — messages/fields/states largely present; **error taxonomy** and **idempotency rule** genuinely under-specified; settlement/payment state machine correctly out of scope (§8) |
| **H4** | "Determinism asserted but not sufficiently specified" | **CONFIRMED** | §14 — the strongest finding in this audit |
| **H5** | "Governance insufficiently defined" | **PARTIALLY CONFIRMED** | §11 — mechanisms and authority are defined and public; the *active maintainer record* is empty and maintainer-admission criteria absent |
| **H6** | "Spec licence, implementation licence, IPR/patents, trademark insufficiently defined" | **REFUTED** | §9–§13 — all four are explicitly addressed; this is among the project's strongest areas |
| **H7** | "Openness not demonstrated because no external implementation exists" | **REFUTED as formulated** | Conceptual error: absence of an external implementation means *implementation independence is not experimentally demonstrated*, not that the protocol is not open. BANZA's own documents keep this distinction correctly (Whitepaper §11, §12) |
| **H8** | "DID Core / VC could replace parts of the trust model" | **FURTHER RESEARCH** | Conceptual overlap exists (key publication, delegation, revocation); no adoption decision taken in this audit |
| **H9** | "Certificate Transparency could improve the Technical Registry" | **FURTHER RESEARCH** | The Registry is classified as a discovery aid, not a trust root; equivocation is therefore a lower-severity threat. The stronger CT-shaped question applies to the **Key Manifest/BRL single origin** (§18) |
| **H10** | "Mojaloop is critical related work" | **PARTIALLY CONFIRMED** | §21 |

---

## 21. Related Work Findings

Assessed from the architectural descriptions each project publishes; no claim here depends on a figure or
benchmark not verified.

| System | What it is | Central unit | Hub required? | Overlap with BANZA |
|---|---|---|---|---|
| **Mojaloop** | Open-source *platform/switch* implementation for interoperable payments | Deployable software (a hub) | **Yes** — a switch is deployed and operated | Interoperability goal; **different unit**: deployed infrastructure vs published specification |
| **DID Core / VC** | W3C standards for decentralised identifiers and verifiable credentials | Identifier / credential | No | Real overlap with key publication, delegation and revocation |
| **Certificate Transparency** | Append-only verifiable logs for certificate issuance | Log with inclusion proofs | Logs required | Overlap with registry/trust-material auditability |
| **PAPSS / KWiK** | Operational cross-border/regional payment infrastructures | Operational scheme | Yes | Layer-3 peers, not protocol peers |

### §29 — Mojaloop question, answered directly

**If Mojaloop exists, what is BANZA's distinct architectural contribution?**

On the evidence, the distinction is real and survives audit: Mojaloop's unit of adoption is **a deployed
hub**; participants interoperate *through* it. BANZA's unit of adoption is **a published specification**
plus a fail-closed evaluation of published artifacts; participants interoperate *directly*, with BANZA in
neither the message nor the funds path (§18). BANZA additionally makes conformance itself a first-class,
evidence-bearing artifact — Mojaloop treats conformance as testing against a reference deployment.

The honest qualification: this distinction is **architecturally sound but not yet experimentally
demonstrated**, because it depends on independent implementations existing — which is precisely what the
Whitepaper already says is undemonstrated.

---

## 22. Findings by Severity

| ID | Severity | Finding | § |
|---|---|---|---|
| **F-01** | **P0** | Canonical byte form / signing envelope specified nowhere public; exists only as `serde_json::to_string()`. Schemas simultaneously promise independent recomputability | §14 |
| F-02 | P1 | No index identifying what constitutes the BANZA v1.0 normative surface | §5.3 |
| F-03 | P1 | RFC 2119 / BCP 14 convention never declared, though MUST/SHALL used 597× | §5.2 |
| F-04 | P1 | Five contracts declare code as source of truth; all five paths absent from the repository (includes Key Manifest and BRL) | §5.4 |
| F-05 | P1 | No closed protocol-wide reason-code taxonomy; receipts use open string arrays | §7.2 |
| F-06 | P1 | Idempotency rule expressed by fixtures/engine rather than normative statement | §7.2 |
| F-07 | P1 | Semantic equivalence stated as concept, not as testable rule | §15 |
| F-08 | P1 | Trust-plane single-origin liveness dependency; no mirroring/offline distribution specified | §18 |
| F-09 | P2 | `MAINTAINERS.md` active-maintainer list empty; no maintainer-admission criteria | §11 |
| F-10 | P2 | No CLA/DCO; contribution provenance rests on Apache-2.0 §5 alone | §12 |
| F-11 | P2 | Whitepaper contains no pointer to the normative surface | §19 |
| R-01 | Research | DID/VC overlap with key publication, delegation and revocation | §20 |
| R-02 | Research | Transparency-log properties for Key Manifest/BRL distribution | §18, §20 |
| R-03 | Research | Mojaloop interoperability lessons; PAPSS/KWiK Layer-3 integration profiles | §21 |

---

## 23. Clean-Room Readiness

**NOT READY** — see §17. One P0 and three P1s stand between the current surface and a meaningful
clean-room test. Deliverable 4 records exactly what would be handed over today and what is missing.

---

## 24. Conclusions

**Q1 — Is there a clearly identifiable BANZA v1.0 normative surface?**
**PARCIALMENTE.** The artifacts exist, are substantial and mostly carry declared authority (66/72), but
nothing identifies them as *the* surface, and five pointers dangle.

**Q2 — Does that surface sufficiently define the protocol to permit independent implementation in
principle?**
**PARCIALMENTE.** 10 of 26 capabilities fully, 13 partially, 3 not at all — and one of the three
(canonicalization) blocks several of the others.

**Q3 — Are there relevant behaviours discoverable only by reading the reference implementation?**
**SIM.** Canonical byte form and signing envelope (§14); field-exclusion sets per artifact; effective
reason-code vocabulary; idempotency conflict semantics; the artifacts whose declared source of truth is
absent code (§5.4).

**Q4 — Is the specification publicly accessible and legally implementable by third parties?**
**SIM.** Apache-2.0 extended to documentation by `NOTICE`, with patent grant; `TRADEMARKS.md` explicitly
permits independent implementation. No legal impediment was found.

**Q5 — Is the reference implementation properly separated from the normative definition?**
**PARCIALMENTE.** Conceptually and institutionally yes, and stated repeatedly. In artifact practice, six
contracts declare themselves mirrors of the code and five point at code as their source of truth.

**Q6 — Are determinism and reproducibility sufficiently specified?**
**NÃO.** They are demonstrated but not specified (§14, §15, §16).

**Q7 — Are there mandatory operational dependencies on BANZA infrastructure to execute protocol
capabilities?**
**SIM — but only in the trust plane, never in the transaction plane.** The Key Manifest and the BRL are
normatively required and single-origin. Funds and messages never traverse BANZA infrastructure.

**Q8 — Ready for a clean-room independent implementation test?**
**NOT READY.**

**Q9 — Has independent third-party implementation been experimentally demonstrated?**
**NÃO.** No such implementation exists. The Whitepaper states this correctly and does not overclaim.

**Q10 — Is "BANZA is only a conformance framework, not a protocol" confirmed?**
**PARCIALMENTE CONFIRMADA.** See §7.3.

### Final position

BANZA v1.0 **is an open protocol** on the criteria that properly determine that question: public,
versioned specification; permissive licence with patent grant; explicit permission to implement
independently; trademark separated from implementation; governance transparent and publicly recorded; and
no BANZA service in the message or funds path. The absence of a second implementation does not bear on
this, and the project's own documents already say so correctly.

BANZA v1.0 **is not yet a self-sufficient specification**. The gap is narrower than the external critique
suggests — it is not that the protocol is absent, but that a handful of load-bearing rules (above all the
canonical byte form) live in the reference implementation rather than in the published surface, and that
nothing tells a reader where the surface begins.

The distance between these two statements is the entire remediation backlog, and it is short.
