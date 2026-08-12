# Operator–Implementation Domain Model — M2.19G.1 (ADR-068 §4.2/§4.3, §13)

- **Milestone:** M2.19G.1 — Endpoint-Originated Operator Validation
- **Branch:** `release/m2-19g1-endpoint-originated-operator-validation`
- **Base commit:** `a272d32` (M2.19G finalized) · **Rollback tag:** `rollback-pre-m2-19g1-operator-validation` → `a272d32`
- **ADR:** ADR-068 — Endpoint-Originated Operator Validation and Operator–Implementation Target Model
- **Related:** ADR-064/065/066 (L2 certification, Technical Registry, closed certification-state machine),
  ADR-061 (certification ≠ admission ≠ authorisation), ADR-067 (Operador Zero), ADR-037 (Rust-first)
- **Date:** 2026-07-30

## 1. Problem the model fixes

Before M2.19G.1 the validation surface conflated two distinct things (ADR-068 Context):

- **the operator** — the responsible entity; and
- **the implementation** — the technical system actually evaluated.

"Validate an operator" without naming an implementation is meaningless: one operator may publish many
implementations (demonstration, sandbox, pre-production, production; different versions, profiles,
capabilities and deployments). The pre-rebuild closed map (`website/lib/banzaiValidation.ts`
`VALIDATION_TARGETS`) carried a single flat `operator-zero` entry with an `artifacts_base` that was
**declared but never used to fetch** (audit `registry-operator-zero-inputs-audit.json`
→ `closed_validation_target_registry.critical_gap`). There was no
`operator_id → implementation_id → canonical_origin → discovery` resolution
(`resolution_chain_exists_today: false`).

## 2. The two records (Rust, `engines/banza-target-registry/src/model.rs`)

The domain model is now explicit and Rust-owned. Two records are modelled:

### 2.1 `OperatorRecord` — the responsible entity

```
operator_id · display_name · publication_status · implementation_ids[] · registry_ref
```

An operator publishes **zero or more** implementations (`implementation_ids`). It is never the evaluated
technical object (ADR-068 §4.2).

### 2.2 `ImplementationRecord` — the technical system actually evaluated

```
implementation_id · operator_id · version · protocol_version · profile · environment ·
capabilities[] · canonical_origin · endpoints · publication_status · evidence_refs[]
```

`canonical_origin` empty ⇒ origin-less ⇒ ineligible target (ADR-068 Consequences). The implementation
carries its own lifecycle, version, protocol version, profile, environment and capability set — the
attributes that make "which implementation" a meaningful choice.

### 2.3 `PublicationStatus` (lifecycle)

`Published | Unpublished | Removed | Revoked` — **only `Published`** is eligible; every other state is a
distinct typed ineligibility reason during resolution. Presence of a record **never** implies admission,
authorisation, or the ability to move funds (ADR-068 §4.10, ADR-061).

### 2.4 `Endpoints` — the 14 canonical published paths

`model.rs :: Endpoints` names the **14** canonical artifact paths of an implementation, and
`Endpoints::reference()` supplies the reference set:

| # | Field | Path |
|---|-------|------|
| 1 | `discovery` | `/discovery.json` |
| 2 | `manifest` | `/manifest.json` |
| 3 | `key_manifest` | `/key-manifest.json` |
| 4 | `signed_metadata` | `/signed-metadata.json` |
| 5 | `capabilities` | `/capabilities.json` |
| 6 | `conformance` | `/conformance/evidence.json` |
| 7 | `revocation` | `/revocation-list.json` |
| 8 | `federation_metadata` | `/federation/metadata.json` |
| 9 | `federation_manifest` | `/federation-manifest.json` |
| 10 | `evidence_bundle` | `/evidence-bundle.json` |
| 11 | `traces` | `/traces/full-e2e.json` |
| 12 | `ledger` | `/ledger/demo.json` |
| 13 | `payment_qr` | `/payments/demo-qr.json` |
| 14 | `payment_refund` | `/payments/demo-refund.json` |

Paths are stored relative (leading-slash); resolution joins them onto `canonical_origin`
(`registry.rs :: join`). The relative-path storage is what keeps the fetcher SSRF-safe: the host always
comes from the registry origin, never from a stored absolute URL.

## 3. Resolution outputs

- `ResolvedEndpoints` — the 14 endpoint paths joined to absolute URLs against `canonical_origin`.
- `ResolvedTarget` — a fully resolved, **eligible** target: operator + implementation identity, the
  compatibility attributes, `canonical_origin`, the SSRF-pin `expected_host` (derived by
  `registry.rs :: host_of`), `discovery_url`, the `ResolvedEndpoints`, `publication_status` and
  `evidence_refs`. Resolution proves **eligibility only** — never admission, authorisation, or the
  ability to move funds.

## 4. Typed ineligibility (`ResolutionReason`, 15 variants)

Resolution is fail-closed. Every failure is a distinct snake_case reason so the caller and the receipt
always know **why** a target is not eligible:

```
unknown_operator · duplicate_operator · operator_unpublished · operator_removed · operator_revoked ·
unknown_implementation · duplicate_implementation · implementation_operator_mismatch ·
implementation_unpublished · implementation_removed · implementation_revoked · origin_missing ·
incompatible_protocol_version · unsupported_environment · incompatible_profile
```

Eligibility gates enforced in `registry.rs :: resolve`:

1. operator exists, is unique, and is `Published`;
2. implementation exists, is unique, belongs to the named operator **and** is listed by it
   (`implementation_operator_mismatch` otherwise), and is `Published`;
3. `canonical_origin` is a non-empty HTTPS origin with a parseable host (`origin_missing` otherwise);
4. `protocol_version ∈ {1.0.0, 1.0}`, `environment ∈ {sandbox, demo}`, `profile ∈ {L0..L4}`
   (`SUPPORTED_PROTOCOL_VERSIONS` / `SUPPORTED_ENVIRONMENTS` / `SUPPORTED_PROFILES`).

`sandbox`/`demo` only — production is not an eligible validation environment (a `production` claim is a
typed `unsupported_environment`, closing the profile/environment-downgrade threat).

## 5. The closed production registry

`registry.rs :: production_registry()` seeds the closed set with **exactly one** operator and **one**
implementation — no fictional operators (ADR-068 §4.9):

| Record | Value |
|--------|-------|
| operator | `operator-zero` — "Operador Zero", `Published`, `implementation_ids=[operator-zero-ref-impl]` |
| implementation | `operator-zero-ref-impl` / `operator-zero`, version `0.1.0`, protocol `1.0.0`, profile `L0`, environment `sandbox` |
| capabilities | `qr_payment_demo`, `refund_demo`, `reconciliation_demo` |
| canonical_origin | `https://zero.banza.network` (`REFERENCE_ORIGIN`) |
| endpoints | `Endpoints::reference()` (the 14 canonical paths) |
| evidence_refs | `adr-067`, `adr-068` |

The resolution/eligibility **logic** is generic over any `Registry` (`from_records`), so the
multiple/duplicate/removed/revoked/mismatched paths are unit-tested with test-only records **without**
seeding them into the closed production registry — the production set stays a single honest example.

## 6. Contracts

Documentary production schemas were added under `contracts/production/`:

- `operator-record.production.schema.json`
- `implementation-record.production.schema.json`
- `discovery-document.production.schema.json`
- `capabilities-document.production.schema.json`
- `operation-receipt.production.schema.json`
- `journey-receipt.production.schema.json`

and the request/response surface in `contracts/openapi/operator-validation.yaml`. These document shapes;
they add no new financial invariant.

## 7. Where the model surfaces to the human

- BanzAI **Fase 0** (`website/components/banzai/BanzaiValidationMode.tsx:96`) selects an operator **then**
  one of its published implementations from the closed registry — the model made visible.
- The client mirror `website/lib/banzaiValidation.ts` exposes `isClosedId` and the operator/implementation
  listing; the backend **re-resolves in Rust** (`services/banzai-api/src/validate.js :: resolveTarget`),
  so the closed-id check in the browser is defence-in-depth, never the authority.

## 8. Guard coverage

- `banzai-operator-implementation-model-check` — Fase 0 selects operator THEN implementation; both record
  types present (ADR-068 §4.2/§4.3).
- `banzai-closed-target-registry-check` — targets come from a CLOSED registry; `operator-zero` only, no
  fictional operators (ADR-068 §4.6/§4.9).
- Rust unit tests in `engines/banza-target-registry/src/lib.rs` cover each of the 15 `ResolutionReason`
  variants and the happy path.

## 9. Boundary restatement

Resolving a target proves **eligibility to be validated** — it is not admission to the scheme, not
regulatory authorisation, not permission to move funds (ADR-061, ADR-068 §4.10). Technical validation is
not an issued certification; a resolved target is a technical object, not an approved entity.
