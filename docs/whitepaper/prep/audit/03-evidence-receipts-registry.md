# Audit 03 — Evidence, Receipts, Trust & the Technical Registry

**Scope.** Grounded audit of the evidence-bundle assembler, the trust verifier, the closed Technical
Registry, and the BanzAI-hosted onboarding engine (whose Candidate Registry is *private* and not
protocol core), plus the production receipt/evidence contracts and the live receipt shapes served by
`services/banzai-api`. Every claim below cites a real file + line/section that was read.

> **Boundary reminder for the whitepaper.** The whitepaper is non-normative, scientific-technical and
> operator-neutral. Everything here describes *what the code does*, grounded. Divergences that could
> affect a central thesis are recorded in §9 (Risks).

---

## 1. Evidence Bundle — structure and boundary flags

Source: `engines/banza-evidence-bundle/src/lib.rs`.

The Evidence Bundle is a **technical evidence assembler**, not a certificate. The module header states it
explicitly (lib.rs:9-12): every bundle carries `not_a_certificate = true`, `not_an_approval = true`,
`requires_conformance_evidence_review = true`, `llm_calls = 0`, `external_model_called = false`.

- **Readiness is computed in Rust** (lib.rs:100-114 `compute_readiness`). Required artifacts = SimB
  pre-review + Conformance L0 (`REQUIRED_ARTIFACTS`, lib.rs:27). Precedence: SimB missing/incomplete →
  `INCOMPLETE`; SimB FAIL → `BLOCKED_BY_SIMB`; L0 missing/incomplete → `INCOMPLETE`; L0 FAIL →
  `BLOCKED_BY_CONFORMANCE`; both PASS → `READY_FOR_TECHNICAL_REVIEW`. TypeScript must not decide
  readiness, compute a status, or hash (lib.rs:6-7).
- **Boundary flags are emitted on every bundle** (lib.rs:378-383): `not_a_certificate`,
  `not_an_approval`, `requires_conformance_evidence_review`, `boundary` (BOUNDARY const lib.rs:23-24:
  *"Evidence Bundle é evidência técnica verificável. Não é certificado. Não é aprovação. … não há
  aprovação humana central."*), `llm_calls: 0`, `external_model_called: false`.
- **Integrity by SHA-256, not signature.** `bundle_id` is derived from `created_at` + the required-report
  hashes (lib.rs:386-392); `bundle_hash` covers the whole bundle except itself (lib.rs:394-396). The
  limitations array states the hashes are "integridade técnica (SHA-256), não assinatura nem autoridade"
  (lib.rs:219).
- **Per-artifact hashes** (lib.rs:262-278) and **tool versions** (lib.rs:245-261) are recorded for every
  input report (SimB, L0, trace, trust, manifest, L1–L4, security assurance, deep assurance, M2 gate,
  root ceremony, open governance, reference trust model).
- **Validation is fail-closed** (`validate_bundle`, lib.rs:413-490): required fields present, boundary
  flags must equal their required values, `llm_calls == 0`, `external_model_called == false`, readiness
  in the enum, `bundle_hash` recomputed and matched, and a **forbidden-claim scan** rejects the strings
  `"certified"`, `"approved"`, `production_ready`, `operator_certified` (lib.rs:454-464).
- **Demo honesty.** `demo_bundle` runs the real engines and *intentionally omits* the trace report to
  demonstrate a missing RECOMMENDED artifact honestly (lib.rs:496-497, 698). The demo operator is labelled
  `"operator-A (demo, test-only)"` (lib.rs:681) — a neutral placeholder, not a real brand.

**Production contract** `contracts/production/evidence-bundle.production.schema.json`: an evidence bundle
is "a package of reproducible, independently checkable inputs; it is NOT a certificate and by itself
grants nothing" (line 5). `boundary_flags.not_a_certificate` is `const: true`;
`requires_conformance_evidence_review` is `const: true` and documented as "reproducible and independently
checkable by any party … No human authority approves it" (lines 61-62). The M2 gate status is "computed
by the Rust engine … never computed in TypeScript" (line 52). `_boundary` (line 9): "Production of the
BANZA protocol, not financial production. BANZA is an open protocol; it does not process payments, settle
value, or move funds. Licence/authorisation belongs to the operator, not to BANZA."

---

## 2. Receipts — OperationReceipt / JourneyReceipt / OriginVerificationReceipt

### 2.1 OperationReceipt (per-step, endpoint-originated validation)

Contract: `contracts/production/operation-receipt.production.schema.json`. Live builder:
`services/banzai-api/src/validate.js:167-207` (`buildOperationReceipt`).

- Binds a step's verdict to the **exact origin of its inputs**: `operator_id`, `implementation_id`,
  `environment`, `profile`, `protocol_version`, `canonical_origin`, `endpoint`, `resolved_host`,
  `fetched_at`, `http_status`, `content_type`, `content_length`, `etag`, `last_modified`, `input_hash`,
  `signature_status`, `engine`, `engine_version`, `result.status`, `reason_codes`, `evidence_refs`,
  `output_hash`, `duration_ms` (schema required list lines 13-20; live builder validate.js:173-206).
- `step` enum: `discovery, manifest, keys, conformance, interoperability, trust, federation, evidence,
  certification` (schema line 27-30; live `STEP_ORDER` validate.js:38-48).
- `qwen_calls` and `external_model_calls` are **`const: 0`** in the schema (lines 62-63) and hardcoded 0
  in the builder (validate.js:202-203). Protocol fetches are counted separately as `protocol_fetch_count`
  and are "never counted as external model calls" (schema line 5, 64).
- `input_hash`/`output_hash` are `sha256:<hex>` over the fetched-content engine input and the engine
  output (validate.js:62-64, 283-284). `evidence_refs` are origin-bound: `<endpoint-url>#<sha256>`
  (validate.js:254).
- A failed required fetch → step `BLOCKED` with the fetcher's `reason_codes` surfaced (validate.js:257-273).
- "A receipt is NOT a certificate" (schema line 5).

### 2.2 JourneyReceipt (aggregate, nine steps)

Contract: `contracts/production/journey-receipt.production.schema.json`. Live builder:
`services/banzai-api/src/validate.js:347-378`.

- Seals the eight technical `OperationReceipt`s + the certification-readiness step (schema line 5;
  `step_count = receipts.length`, validate.js:364).
- `certification_readiness` enum = `READY | BLOCKED` (schema lines 46-50). `certification_status` is
  **`const: NOT_CERTIFIED`** (schema lines 51-54) and `certified` is **`const: false`** (line 56). The
  live builder hardcodes `certification_status: "NOT_CERTIFIED"` and `certified: false`
  (validate.js:368-369). The description states the journey "NEVER issues a Certification Record and
  NEVER returns CERTIFIED" (schema line 5).
- `qwen_calls` and `external_model_calls` are `const: 0` (schema lines 58-59; live validate.js:371-372).
- `overall_status` is a Rust-decided aggregate of the technical step statuses (schema lines 41-45; the
  live JS aggregation is a pure fold over the Rust-produced per-step statuses, validate.js:338-345).
- `disclaimer` (validate.js:375-376): "Rust decide; a IA nunca decide. A Prontidão de Certificação agrega
  verdictos — não é um Registo de Certificação e nunca devolve CERTIFIED."

**Live evidence (Operador Zero, 2026-07-30):** `docs/reports/M2_19G3A_…CLOSURE.md:138-143` records a real
journey run — `step_count=9`, `protocol_fetch_count=23`, `overall_status=FAILED`,
`certification_status=NOT_CERTIFIED`, `certified=false`, `certification_readiness=BLOCKED`,
`external_model_calls=0`, `qwen_calls=0`, with honest per-step blockers (e.g.
`TRUST_INVALID_ROOT_METADATA`, `CONFORMANCE_EVIDENCE_INCOMPLETE`, `EVIDENCE_BUNDLE_INVALID`). "No
CERTIFIED was ever forced — this is the correct outcome for the sandbox Operador Zero."

### 2.3 OriginVerificationReceipt (onboarding origin proof)

Source: `engines/banzai-onboarding/src/lib.rs:325-333` (receipt builder inside `origin_verify_json`);
live wrapper `services/banzai-api/src/onboarding/engine.js:122-138`.

Fields: `receipt_type: "OriginVerificationReceipt"`, `candidate_id`, `candidate_implementation_id`,
`domain`, `method: ".well-known"`, `well_known_path` (`/.well-known/banza/ownership-challenge.json`,
lib.rs:29), `issued_at_ms`, `verified_at_ms`, `result`, `reason_code`, `engine: "banzai-onboarding"`,
`engine_version`, `response_sha256` (lib.rs:325-333). It contains **no email/OTP/session** (lib.rs:310).

- Verification is a **keyed-HMAC nonce match + binding check** (domain + candidate_id +
  implementation_id), fail-closed (lib.rs:350-365).
- **Single-use / replay guard**: a challenge whose `consumed_at_ms` is set returns
  `result: "already_used"`, `reason_code: "challenge_already_consumed"` **before any refetch**
  (lib.rs:334-339). This mirrors the OTP already-used branch.
- Live positive receipt example: report §c (M2_19G3A…:124-129) — `result: "verified"`, `reason_code:
  "ok"`, `engine: "banzai-onboarding"`, `engine_version: "0.1.0"`, `response_sha256: "e1da8af1…"`.

---

## 3. Trust model + revocation

Source: `engines/banza-trust/src/lib.rs`, `src/evaluate.rs`, `src/sign.rs` (test-only), `README.md`.

- **Trust is verified by signed protocol metadata + delegated signing keys + operator manifest +
  conformance evidence + public protocol registry + revocation/fail-closed — never by an operator
  certificate, a CA signature, or a human approval** (lib.rs:2-8). Ed25519 over the ADR-038 canonical
  form (all fields except `signature`, sorted keys, compact JSON, base64url-no-pad) (lib.rs:4-6,
  `canonical_bytes` lib.rs:59-67, `verify_ed25519` lib.rs:81-100 uses `verify_strict`).
- **This crate NEVER generates production keys, NEVER signs a production artifact, NEVER authorises,
  certifies or approves an operator, and carries no real key** (lib.rs:10-12; README:5-8). The signer is
  explicitly TEST-ONLY, deterministic from a caller seed, every artifact stamped
  `"TEST ONLY — NOT PRODUCTION — NO REAL PRIVATE KEYS"` (sign.rs:1-8, 16).
- **`evaluate_trust` computes the status in Rust** (evaluate.rs:214-408). Eleven+ fail-closed statuses
  (`STATUS_VALUES`, evaluate.rs:14-28), including `TRUST_REVOKED`, `TRUST_EXPIRED_METADATA`,
  `TRUST_INVALID_BOUNDARY`, `TRUST_FAIL_CLOSED`.
- **Fail-closed precedence** (evaluate.rs:363-388): boundary violation → root metadata → signed metadata
  presence → delegated key → signature → freshness → protocol-version compat → manifest → conformance
  evidence → registry entry → revocation → `TRUST_VALID`. Any missing/malformed/invalid/expired/revoked
  material rejects (lib.rs:6-8).
- **Root threshold signatures.** Root metadata must carry `root_signatures` verifying under a *threshold*
  of distinct root public keys (evaluate.rs:157-212 `root_threshold_signatures_ok`); an evaluator's
  out-of-band **pinned** anchor (`trusted_root_public_keys`) constrains the candidate keys so an
  attacker-supplied root signed only by its own keys cannot pass (evaluate.rs:170-178, 246-254). Test
  fixture uses a 2-of-3 policy (`min_signatures: 2, total_keyholders: 3`, sign.rs:167-182).
- **Boundary enforcement.** `boundary_violated` (evaluate.rs:59-139) rejects any input that asserts an
  operator certificate / certification / licence / PSP status / human approval — via claim flags
  (`is_operator_certificate`, `certifies_operator`, `approves_operator`, `requires_human_approval`,
  `certificate_based_trust`, …) *or* affirmative phrasing (negation-scoped to the clause). Result →
  `TRUST_INVALID_BOUNDARY`.
- **Boundary flags on every report** (evaluate.rs:499-514): `central_operator_authority: false`,
  `human_operator_approval_required: false`, `operator_participation_permissionless: true`,
  `certificate_based_trust: false`, `signed_metadata_based_trust: true`, `not_a_psp: true`,
  `does_not_authorise_operators: true`, `does_not_certify_operators: true`,
  `does_not_issue_payment_licence: true`, `does_not_move_funds: true`. `llm_calls: 0`,
  `external_model_called: false`, `test_only: true` (evaluate.rs:487-489).

### Revocation

- **Fail-closed** (evaluate.rs:341-361): a present `revocation_status` is trusted only if it carries a
  non-empty `revocation_list_version` **and** `signed_by_revocation_key`; otherwise `UNVERIFIABLE`. A
  `revoked` flag → `REVOKED`. In precedence, `revoked || !revocation_material_ok` → `TRUST_REVOKED`
  (evaluate.rs:384-385). `verify_revocation_list` (lib.rs:128-132): "an unsigned or unverifiable
  Revocation List is treated as absent (INV-FEDEVAL-005)".
- Normative anchors in `contracts/invariants.json`: **INV-OTE-006** (a Revocation List MUST be signed and
  unexpired; unsigned/unverifiable/expired → treated as unavailable → fail-closed, invariants.json:112-114),
  **INV-FEDEVAL-005** (untrusted, never an empty list, :139-141), **INV-FEDEVAL-010 / INV-OTE-010**
  (revocation is a cryptographic security signal only — never a regulatory sanction, licence withdrawal,
  or judgment, :154-156, :124-126).

### Trust-root invariants (open, threshold-based; no single-entity, no CA)

`contracts/invariants.json` INV-ROOT-*: root signs only Key Manifests (INV-ROOT-004, :166-168); root
never signs statements about operators (INV-OTE-009, :121-123); **no single operator/server/domain/
participant/individual may solely control the root — threshold control required** (INV-ROOT-007,
:175-177); delegated authority bounded (INV-ROOT-008, :178-180). INV-OTE-007/008: no BANZA-issued
artifact and no human decision may be an input to the Open Trust Evaluation (:115-120).

---

## 4. The Technical Registry (closed) vs the Candidate Registry (private)

### 4.1 Technical Registry — CLOSED, feeds BANZA surfaces

Source: `engines/banza-target-registry/` (`lib.rs`, `registry.rs`, `model.rs`, `verdict.rs`), `README.md`.

- It is the **ONLY source of validation targets** (registry.rs:1). It resolves
  `operator_id → implementation_id → canonical_origin → discovery` over a **closed set** and decides
  eligibility in Rust (registry.rs:49-163 `resolve`).
- **Closed production registry = exactly one operator (`operator-zero`) + one implementation
  (`operator-zero-ref-impl`, origin `https://zero.banza.network`)** — no fictional operators
  (registry.rs:166-194 `production_registry`; asserted by the unit test
  `closed_production_registry_is_operator_zero_only`, lib.rs:442-460). Reference origin const
  registry.rs:21; not a hard protocol dependency — "the initial canonical *example* implementation,
  validated through the same secure path as any other."
- **Operator ≠ implementation** (model.rs:1-7, 80-105): the operator is the responsible entity, the
  implementation is the technical system evaluated; one operator may publish many implementations; the
  target is always operator **and** one of its published implementations, never the entity in the
  abstract. Confirmed by tests `resolves_correct_one_of_multiple_implementations` (lib.rs:210-244) and
  `implementation_wrong_operator_rejected` (lib.rs:277-299).
- **Eligibility is not admission.** Typed `ResolutionReason` set (model.rs:151-191): unknown/duplicate/
  unpublished/removed/revoked (operator + implementation), `implementation_operator_mismatch`,
  `origin_missing`, `incompatible_protocol_version`, `unsupported_environment` (only `sandbox`/`demo`,
  never production/real-money — registry.rs:15), `incompatible_profile` (L0–L4). "Presence in the registry
  NEVER implies admission into any operational scheme, regulatory authorisation, or the ability to move
  funds" (lib.rs:8-11; BOUNDARY const lib.rs:26-27; model.rs:126-128).
- **Verdicts decided only here** (verdict.rs:1-7): `step_status` maps each engine's own status to
  `VERIFIED/PENDING/FAILED/BLOCKED`; `certification_readiness` aggregates to `READY`/`BLOCKED` and emits
  `certification_status: "NOT_CERTIFIED"`, `certified: false`, `authorised: false`, `licensed: false`,
  `qwen_calls: 0`, `external_model_calls: 0` (verdict.rs:235-290). Test
  `certification_readiness_never_certifies` (lib.rs:476-504).
- **`catalogue_json`** (lib.rs:63-106) is what feeds BANZA surfaces: it lists operators + implementations
  with per-implementation `eligible` annotation and the explicit note "Presence is not admission,
  authorisation, or the ability to move funds." `resolve_json` returns `{ok, eligible, target}` or a
  typed reason (lib.rs:35-59).
- **Endpoint map** = 14 canonical paths (model.rs:33-78 `Endpoints::reference()`), host-bound to the
  canonical origin during resolution; `expected_host` is the SSRF pin the secure fetcher validates
  against (model.rs:126-145; `validate_discovery` binds every published endpoint to
  `https://<expected_host>/…`, verdict.rs:178-206; test `validate_discovery_binds_to_origin`
  rejects an off-origin `evil.example.com` endpoint, lib.rs:530-567).

**Public `/operators` surface.** The public "certified operators" list is empty: the live metric
`GET /operators` → `[]` (M2_19G3A…:169). This is distinct from the closed catalogue, which lists
`operator-zero` as a validation **target** (not as a certified operator).

### 4.2 Candidate Registry — PRIVATE, onboarding-only, NOT protocol core

Source: `engines/banzai-onboarding/src/lib.rs`; live glue `services/banzai-api/src/onboarding/`.

- The onboarding engine header states: "Onboarding is a hosted BanzAI service, never a BANZA protocol
  rule (ADR-069): third parties need none of this to implement the protocol, publish endpoints, run the
  engines, validate artifacts or generate receipts" (lib.rs:14-15).
- **Pure JSON-in / JSON-out, no I/O, no clock, no randomness inside** (lib.rs:11-13). The Node host
  supplies CSPRNG entropy and time; all persistence (Postgres) and transport (Resend) live in the host
  (engine.js:1-8, 26-34). OTP codes and session tokens are **never stored — only HMAC-SHA256 digests**
  leave the engine (lib.rs:12-14; `otp_issue_json` returns `code` that "is emailed and NEVER stored",
  lib.rs:99-101; `session_issue_json` returns a token that goes in a `__Host-` cookie, only
  `session_hash` stored, lib.rs:173-193).
- **Candidate lifecycle is minimal and explicitly not participation/certification** (lib.rs:31-47):
  `EMAIL_PENDING → EMAIL_VERIFIED → DRAFT → ORIGIN_PENDING → ORIGIN_VERIFIED → VALIDATING → (BLOCKED) →
  VALIDATION_COMPLETED → PUBLICATION_ELIGIBLE → PUBLISHED / EXPIRED` (state machine `next_state`,
  lib.rs:224-240). "A candidate is NEVER a published operator, participant, certified entity, scheme
  member or authorised entity" (lib.rs:31-32).
- **The Candidate Registry is private + session-gated.** `services/banzai-api/src/onboarding/routes.js`:
  only `/onboarding/version`, `/onboarding/otp/request`, `/onboarding/otp/verify` are pre-auth
  (routes.js:70-104); everything below "requires a session" — `401 authentication_required` otherwise
  (routes.js:120-121); listing/creating/abandoning/reconciling candidates are all session-gated
  (routes.js:123-161), with a CSRF Origin check on POST (routes.js:57).
- **Reconciliation never creates a registry entry.** `reconcileCandidate` binds an origin-verified
  candidate to an **already-registry-resident** `(operator_id, implementation_id)` in the *closed*
  Technical Registry (engine.js:15-24 `resolveRegistryTarget`); it "never creates a registry row and
  never name-matches" (engine.js:16-18; M2_19G3A…:76-83). Live proof: OZ reconciled to the *existing*
  entry, `duplicates = 0`, `/operators` unchanged `[]` (M2_19G3A…:145-171).

---

## 5. Independent third-party validation; no mandatory single global registry

- **Conformance evidence is reproducible and independently checkable by any party.** Evidence-bundle
  contract: "reproducible, independently checkable inputs … grants nothing on its own. No human authority
  approves it" (evidence-bundle.production.schema.json:5, 62). INV-FEDEVAL-003: hashes recomputed +
  automation re-executed **by an independent third party** must yield the same state; "Evidence that
  cannot be reproduced is not evidence" (invariants.json:133-134; ADR-040:282).
- **Registry listing is not a trust check.** INV-FEDEVAL-008: "No evaluation step may be satisfied by a
  human decision, by an artifact issued to an operator by BANZA, or by the presence of an entry in the
  Public Protocol Registry. Registry listing is not a check." (invariants.json:148-150; ADR-040:287).
  INV-OTE-007: "No artifact issued by BANZA about an operator may be an input to the Open Trust
  Evaluation." (invariants.json:115-116). ADR-040:300: each check "is now independently reproducible by
  any party rather than asserted by a single signature."
- Consequence for the whitepaper: the *closed Technical Registry* is BANZA's own list of eligible
  validation **targets** for its surfaces — it is **not** a trust anchor and **not** a mandatory global
  directory that operators must appear in to be trusted; independent parties reproduce conformance from
  published, hashed artifacts without consulting any BANZA registry.

---

## 6. Rust decides; Qwen only explains; BanzAI is an interface

- Every verdict/status/hash is computed in Rust: evidence readiness (lib.rs:6-7), trust status
  (evaluate.rs:6, 214), registry resolution + step + readiness (verdict.rs:1-7, lib.rs:11), onboarding
  decisions (banzai-onboarding lib.rs:1-8; engine.js:1-7 "RUST_DECIDES … NEVER decides a verdict").
- The endpoint-originated validator hardcodes `qwen_calls: 0` and `external_model_calls: 0` on every
  receipt (validate.js:202-203, 371-372) and "There is NO model call" (validate.js:11-16). The trust and
  registry engines emit `llm_calls: 0` / `external_model_called: 0` / `qwen_calls: 0`
  (evaluate.rs:488-489, verdict.rs:285-286).
- The registry README states the layering: "Rust decides; TypeScript never decides; there is no model
  call anywhere here" (banza-target-registry/README.md:50; lib.rs:11).

---

## 7. Operador Zero — sandbox reference implementation

- Registered as the single closed-registry operator/implementation, `environment: "sandbox"`,
  `profile: "L0"`, origin `https://zero.banza.network` (registry.rs:168-193). Only `sandbox`/`demo`
  environments are eligible; `production` is rejected `UnsupportedEnvironment` (registry.rs:15;
  test lines lib.rs:301-338).
- Live status: **`NOT_CERTIFIED`, published-not-production, real-money activation off**
  (M2_19G3A…:182-187). Its nine-step journey ran with honest blockers and `external_model_calls=0` — no
  CERTIFIED forced (M2_19G3A…:138-143). It "receives no shortcut, fixture or bypass; it is resolved and
  fetched exactly like any future published implementation" (banza-target-registry/README.md:29-31).

---

## 8. Obsolete / forbidden terminology — scan result

Active surfaces read (engines, contracts, live services, current reports): **no obsolete/forbidden term
found.** Specifically absent on active surfaces:

- "BANZA CA" / CA-issued operator certificates: the trust model is explicitly *without* a CA
  (lib.rs:2-8; `certificate_based_trust: false`, evaluate.rs:505); README "NEVER issues a certificate"
  (banza-trust/README.md:6-8).
- Operator X.509 / general company certificate: not present; trust is signed-protocol-metadata based
  (evaluate.rs:506).
- Central human approval as a protocol requirement: forbidden (INV-OTE-008 invariants.json:118-119;
  `human_operator_approval_required: false` evaluate.rs:502; evidence-bundle "não há aprovação humana
  central" lib.rs:24).
- BANZA as operator/bank/PSP/wallet/settlement: negated (`not_a_psp: true`, `does_not_move_funds: true`
  evaluate.rs:509-513; evidence-bundle `_boundary` "does not process payments, settle value, or move
  funds" schema:9; root-ceremony `_boundary` "does NOT move/settle/hold funds"
  root-ceremony-evidence…schema.json:9).
- BanzAI as authority / Qwen as decider: negated (§6 above).
- Operador Zero as production / real funds active: negated (§7; sandbox-only, real-money off).
- Unlimited entity certification: negated — certification is per-implementation and the aggregate is
  `READY`/`BLOCKED`, never `CERTIFIED` (verdict.rs:250-290; journey-receipt schema:51-56).

> Note: the string `verify-certificate` appears in the banza-trust CLI (README.md:24) as a *verification*
> verb over the **legacy Python** trust-root scheme it ported; it is a verifier command name, not a
> BANZA-issued operator certificate. Recorded in §9 as a wording watch-item, not a violation.

---

## 9. Risks / divergences (for a scientific-technical whitepaper to reconcile)

1. **Registry-entry as a trust check vs "registry listing is not a check" (medium).** The active-model
   trust evaluator treats a missing/unbound `public_registry_entry` as `TRUST_MISSING_REGISTRY_ENTRY`, a
   non-`VALID` fail-closed status (evaluate.rs:333-339, 382-383). INV-FEDEVAL-008 / INV-OTE-007 state
   registry listing / a BANZA-issued artifact must not be an evaluation *check*/*input*
   (invariants.json:148-150, 115-116). These are reconcilable — the checked entry is the operator's own
   *published* registry entry bound by `operator_id`, not a BANZA-issued verdict, and in the live
   endpoint-originated journey `assembleTrustInput` does **not** populate `public_registry_entry`
   (validate.js:78-94), so the trust step degrades to `PENDING` rather than asserting trust from a listing
   — but a whitepaper that leans on "registry listing is never a check" should state precisely which
   evaluation it means (M2.4 active-model trust vs ADR-040 federation routing) to avoid contradiction.

2. **Two distinct "registry" surfaces share the word "registry" (low, terminology).** Closed Technical
   Registry (validation targets, banza-target-registry), Public Protocol Registry (referenced by
   INV-FEDEVAL-008), and the private Candidate Registry (onboarding). A reader could conflate them; the
   whitepaper should name each explicitly. Grounding: registry.rs:1-8, invariants.json:148-150,
   banzai-onboarding lib.rs:14-15.

3. **`verify-certificate` CLI verb (low, wording).** Legacy verifier command name in
   banza-trust/README.md:24; not an operator certificate. If the whitepaper quotes the CLI, pair it with
   the "NEVER issues a certificate" boundary (README.md:6-8) to prevent misreading.

4. **`REFERENCE_ORIGIN` hardcoded to `zero.banza.network` (informational).** registry.rs:21 documents it
   as the canonical *example*, "not a hard protocol dependency … validated through the same secure path as
   any other." Consistent with operator-neutrality, but it is the only origin the closed production
   registry ships; the whitepaper should frame it as the reference/sandbox example, not a privileged
   trust position.

---

## 10. Files read (grounding)

- `engines/banza-evidence-bundle/src/lib.rs`
- `engines/banza-trust/src/lib.rs`, `src/evaluate.rs`, `src/tool.rs`, `src/sign.rs` (head), `README.md`
- `engines/banza-target-registry/src/lib.rs`, `src/registry.rs`, `src/model.rs`, `src/verdict.rs`, `README.md`
- `engines/banzai-onboarding/src/lib.rs`
- `contracts/production/{operation-receipt,journey-receipt,evidence-bundle,conformance-evidence,root-ceremony-evidence}.production.schema.json`
- `contracts/invariants.json` (OTE / FEDEVAL / ROOT / revocation families)
- `services/banzai-api/src/validate.js`, `src/journey.js`, `src/onboarding/engine.js`, `src/onboarding/routes.js`, `src/server.js` (routes)
- `docs/reports/M2_19G3A_OPERATOR_ZERO_ORIGIN_AND_REENROLMENT_CLOSURE.md`
- `decisions/adr/ADR-040-federation-trust-evaluation-without-certificates.md` (grep-confirmed lines 282, 287, 300)
