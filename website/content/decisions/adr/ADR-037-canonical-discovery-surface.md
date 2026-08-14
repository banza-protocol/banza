# ADR-037 — Canonical discovery surface

- **Status:** Accepted
- **Date:** 2026-08
- **Completes:** ADR-033 (Operator Self-Publication and Machine-Verifiable Conformance), ADR-041 (Operador Zero read-only reference), ADR-038 (Endpoint-Originated Operator Validation), RFC-0005 (Operator Discovery)
- **Relates:** ADR-031 (Federation Trust Evaluation), ADR-040 (Operator Onboarding), ADR-027 (Canonical Trust Signing Model — Model A), ADR-004 (Certification / Admission / Authorisation Separation)

## Context

BANZA's public **discovery surface** — the machine-readable artefacts an operator publishes so a peer or
validator can find and verify it — had drifted into **three concurrent, mutually inconsistent naming
families** for the two central artefacts (the operator manifest and the signed protocol metadata), plus two
provable contradictions. An exhaustive read-only audit (six grounded readers over engines, Operator Zero,
contracts/schemas/OpenAPI, website/nginx/verification-api, Reference/corpus/SVG, and tests/guards/fixtures)
established the state with file-and-line evidence:

- **Family A — `.well-known` / RFC-0005 discovery** (`/.well-known/banza/operator.json`,
  `/.well-known/banza/signed-protocol-metadata.json`): the only family backed by the **normative
  conformance vectors** (`conformance/vectors/operator-manifests.json` MAN-001..003,
  `conformance/operators/suite.json` CAP-001/002, `conformance/federation/suite.json` `required_path`), by
  **RFC-0005** and **ADR-033**, by `federation-manifest.json` (`_status: canonical`), and by the base
  discovery schema `conformance/manifests/schema.json`. It is what the protocol *tells* operators to
  publish and what conformance *checks*.
- **Family B — `.well-known` / production-schema** (`/.well-known/banza/operator-manifest.json`): the route
  form in `federation-trust.json`'s Layer-3 `published_paths` and the `operator-manifest.production.schema.json`
  filename. Its only runtime/test footprint was a single **test-only** fixture (`engines/banza-trust/src/sign.rs`).
- **Family C — origin-root (de-facto RUNNING)** (`/manifest.json`, `/signed-metadata.json`): what the
  ADR-041 served surface actually exposes and the ADR-038 endpoint-originated validator actually **fetches**
  (`engines/banza-target-registry` `Endpoints::reference()` → `banza-fetcher`), what **Operator Zero**
  actually serves, and what the hermetic engine/integration tests assert. The literal
  `signed-protocol-metadata.json` appears in **no** engine source.

Two contradictions were proven, not merely suspected:

1. **The Open Trust Evaluation was logically unsatisfiable.** `federation-trust.json` check #1
   (`valid_operator_manifest`) validated the published manifest against
   `operator-manifest.production.schema.json` — which sets `additionalProperties: false` and does **not**
   define `supports_federation` / `cross_operator_routing` — while the same file's `federation_eligibility`
   then *requires* `manifest.supports_federation == true` and `manifest.cross_operator_routing == true`.
   Those fields exist only in `federation-manifest.json` (Family A). A manifest that passes check #1 could
   never satisfy eligibility.
2. **Two distinct objects were conflated under one name.** `conformance/manifests/schema.json` (the RFC-0005
   **discovery** manifest: capabilities as booleans, `additionalProperties: true`, extended by
   `federation-manifest.json`) and `operator-manifest.production.schema.json` (the ADR-040 **candidate-
   submission** manifest: `operator_regulatory_declaration`, `key_manifest_url`, `supported_levels`,
   `simulated: true`, capabilities as an array, `additionalProperties: false`) are structurally
   incompatible, yet both were called "operator manifest". A duplicated/botched string in
   `conformance/manifests/schema.json` ("served at …/operator.json (legacy: …/operator.json)") compounded
   the confusion.

The divergence is entirely **latent**: every operator/metadata route (all variants) returns `404` on the
apex and on `zero.banza.network` today; only the protocol trust surfaces (`root.json`, `key-manifest.json`,
`federation/revocation-list.json`) are served (`200`). There are zero production operators. So no live
surface is broken and no external consumer is currently affected — the task is to make the **repository
internally unambiguous** so a future operator has exactly one canon.

## Decision

Per the repository's authority order (`contracts/invariants.json` and the normative conformance vectors
govern over prose and over implementation; RFC-0005/ADR-033 define discovery; §39 of the reconciliation
mandate — *fix Operator Zero against the contract, not the contract against Operator Zero*):

1. **Canonical discovery surface = Family A, under `.well-known/banza/`.**
   - The **operator (discovery) manifest** is canonically served and fetched at
     **`/.well-known/banza/operator.json`** (RFC-0005; validated by `conformance/manifests/schema.json`,
     and — for federation-capable operators — the extension `contracts/federation/federation-manifest.json`).
   - The **signed protocol metadata** is canonically served and fetched at
     **`/.well-known/banza/signed-protocol-metadata.json`** (`signed-protocol-metadata.production.schema.json`).
   - The origin-root forms (`/manifest.json`, `/signed-metadata.json`) and the Family-B route
     (`operator-manifest.json`) are **not** canonical. Treatment is **fix-forward with no compatibility
     alias**: nothing is served live at the non-canonical names and there are zero operators, so a legacy
     alias would only re-introduce split-brain/downgrade ambiguity.

2. **The two "operator manifest" objects are distinct and named distinctly.**
   `conformance/manifests/schema.json` (+ `federation-manifest.json`) is the **discovery manifest**;
   `operator-manifest.production.schema.json` (title now `OperatorCandidateSubmissionManifest`) is the
   **candidate-submission** manifest (ADR-040 onboarding) and is **never** served at the discovery route.

3. **The Open Trust Evaluation validates the discovery manifest.** `federation-trust.json` check #1 now
   targets `conformance/manifests/schema.json` + `federation-manifest.json` (which define the federation
   fields), making the OTE satisfiable and internally consistent with `federation_eligibility`.

4. **Trust Model A is untouched.** The Trust Root still signs only the Key Manifest; delegated keys sign
   per-domain (`protocol-metadata`, `revocation`, `conformance-evidence`); the BRL is signed by the
   revocation-domain key (ADR-027). "protocol-metadata" remains a delegated-key **domain** name and
   `protocol_metadata_url` a **field** — neither is a route. Discovery grants no certification, admission,
   federation or authorisation (ADR-004); operator ≠ implementation (ADR-038); canonical origin is a
   technical origin, not a governance authority.

## Consequences

This is a **normative** reconciliation (it fixes the OTE contract, disambiguates a schema object, and
realigns the running discovery routes), not a silent cleanup. It reverses no prior decision: ADR-033/067/068
already intend a single unambiguous discovery surface; this ADR fixes *which* surface and removes the
residue. Because the canonical model is fixed by the pre-existing normative conformance vectors + RFC-0005,
no protocol **version** bump is required and no historical evidence is rewritten (ADR-024/§11
non-retroactivity preserved).

Implementation is phased and tracked as DSR-1..4:

- **DSR-1 (this ADR + contracts SSOT).** Fix the unsatisfiable OTE (check #1 → discovery schema),
  disambiguate `operator-manifest.production.schema.json` (candidate-submission), repoint
  `federation-trust.json` Layer-3 `published_paths` to `/.well-known/banza/operator.json`, remove the
  duplicated "legacy" string. **Contract/schema/doc-level only — no runtime behaviour change.**
- **DSR-2 (runtime realignment).** Move the two decided artefacts root → `.well-known` atomically:
  `banza-target-registry` `Endpoints`, the Operator Zero served surface (website route map + artefact
  generator + OZ `discovery.json`), the engine/integration tests, and the WASM rebuild. Changes what
  Operator Zero serves live → requires deploy + live machine-validation.
- **DSR-3 (docs/spec/SVG/Reference).** Classified per-occurrence alignment of `spec/federation/*`
  (`protocol-metadata.json` → `signed-protocol-metadata.json`), the Reference §8/§9/§13 tables and their
  SVGs, and the BanzAI corpus guidance. The stale mirror `docs/reference/{en,pt}` is left as-is (known
  unmaintained).
- **DSR-4.** A `.well-known` discovery-surface guard (canonical route/filename/schema per artefact; OTE
  check #1 targets the discovery schema; no dual canon; self-testing with split-brain/wrong-signer BAD
  fixtures), corpus reindex (this ADR), full battery, adversarial review, ship, deploy, live
  machine-validation.

Success criterion (the reconciliation mandate's ship rule): an external implementer, starting only from a
canonical origin, can discover every identity/trust/interoperability surface **without guessing filenames** —
one conceptual name, one canonical route, one schema per artefact; aliases may exist but never a second canon.

---

## Canonical verification routes and honest empty-state behaviour

- **Status:** Accepted
- **Date:** 2026-07
- **Related:** ADR-027 (open protocol trust model without CA), ADR-033 (operator self-publication & machine-verifiable conformance), ADR-031 (federation trust evaluation without certificates), ADR-039 (conformance level capability alignment), ADR-042 (BanzAI unified public interface)

## Context
BANZA is an open financial protocol. It publishes machine-readable verification anchors on its canonical
domain `banza.network` so that operators and peers can discover and verify trust material deterministically
and evaluate interoperation locally (ADR-027, ADR-031). Under the open trust model there is no certificate
authority and no artifact issued by BANZA about an operator: the protocol publishes signed trust metadata
(trust root, delegated signing keys), a public registry index, a signed revocation list, and
conformance-evidence hashes; operators self-publish their own manifests and evidence bundles (ADR-033).
These routes must be **honest** — they never serve fabricated data, and never redirect a machine client to
human HTML.

## Decision
The following **canonical machine routes** are served on the apex `banza.network`, as
`application/json`, **never** redirected to HTML, with Cloudflare cache **bypass**:

| Route | Meaning |
|---|---|
| `/.well-known/banza/root.json` | Trust root metadata — offline, threshold-custody root; signs only the Key Manifest that endorses the delegated signing keys; protocol metadata and revocations are signed by delegated keys, never directly, and never an artifact about an operator (ADR-027) |
| `/.well-known/banza/key-manifest.json` | Signed protocol metadata — delegated signing keys and their bounded scope, endorsed by the trust root; the trust-anchor distribution of the Open Trust Evaluation (ADR-027) |
| `/operators` | Public protocol registry — a verifiable, replicable index of self-published operator manifests and evidence. Listing grants nothing; absence forbids nothing (ADR-033) |
| `/federation/revocation-list.json` | Signed, dated revocation list — a protocol security signal over cryptographic material; never a sanction or a judgment about an entity (ADR-031) |
| `/conformance/evidence` | Conformance evidence hashes index — pointers to operators' self-published evidence bundles (ADR-033) |

BANZA issues no certificates and authorises no operators, so there is no certificate-index route:
participation is **demonstrated** through self-published, reproducible evidence, not **granted** through an
issued artifact.

**Empty-state behaviour.** Where a route has no data to serve yet, it returns an explicit, honest JSON
envelope rather than a 404 or an HTML page, e.g.
```json
{ "status": "no-operators-indexed",
  "note": "Um PASS de conformance é evidência técnica reproduzível, não certificação. A BANZA não emite certificados nem autoriza operadores; a participação é demonstrada, não concedida.",
  "data": [] }
```
`/operators` returns an **empty index** — no filled Operator A/B/C entries, which exist only in
documentation, and no Operador Zero, which is a demo simulator and never appears as a real operator
(ADR-041).

**Human surfaces.** Documentation lives at `docs.banza.network`, and the BanzAI agent is served on the apex
at `banza.network/banzai`, which calls its backend same-origin via `/banzai/ask` (ADR-042). The former
`banzai.banza.network` subdomain is retired and 301-redirects to `banza.network/banzai`; `www` redirects to
the apex.

## Consequences
- Machines get a truthful, parseable signal instead of ambiguous 404s or HTML.
- The `/operators` namespace is reserved for the registry index and is never a docs redirect.
- When an operator self-publishes verifiable evidence, the same routes index it with no route changes —
  nothing is issued, granted or approved, and the honesty guarantee holds identically before and after the
  first operator is indexed.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`conformance/federation/suite.json`](../../conformance/federation/suite.json)
- [`conformance/manifests/schema.json`](../../conformance/manifests/schema.json)
- [`conformance/operators/suite.json`](../../conformance/operators/suite.json)
- [`conformance/vectors/operator-manifests.json`](../../conformance/vectors/operator-manifests.json)
- [`contracts/federation/federation-manifest.json`](../../contracts/federation/federation-manifest.json)
- [`contracts/invariants.json`](../../contracts/invariants.json)
