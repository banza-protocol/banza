# Technical Registry Target Resolution — M2.19G.1 (ADR-068 §4.6, §14; ADR-065)

- **Milestone:** M2.19G.1 — Endpoint-Originated Operator Validation
- **Branch:** `release/m2-19g1-endpoint-originated-operator-validation`
- **Base commit:** `a272d32` · **ADR:** ADR-068 §4.6 / §14 · **Related:** ADR-065 (Technical Registry),
  ADR-061 (certification ≠ admission ≠ authorisation)
- **Date:** 2026-07-30

## 1. Decision

The **BANZA Technical Registry** (or a closed technical target registry) provides the eligible operators,
implementations and canonical origins. It is the **only** source of validation targets (ADR-068 §4.6).
Resolution is `operator_id → implementation_id → canonical_origin → discovery` over a **closed set**,
decided in Rust.

## 2. What existed before

The audit (`registry-operator-zero-inputs-audit.json`) confirmed there was **no** resolution chain:
`resolution_chain_exists_today: false`. The public `/operators` route
(`services/verification-api/src/routes.js`) is a flat, empty pre-production index (`[]`), and the only
in-flow "resolution" was the closed `VALIDATION_TARGETS` map (a single `operator-zero` entry) whose
`artifacts_base` origin was **never used to fetch** (`critical_gap`). M2.19G.1 builds the missing chain.

## 3. The resolver (`engines/banza-target-registry`)

A new Rust engine (library + WASM). Source: `src/{lib.rs, model.rs, registry.rs, verdict.rs, wasm.rs}`.

- `Registry` holds a closed set of `OperatorRecord` + `ImplementationRecord`
  (`registry.rs`; see `OPERATOR_IMPLEMENTATION_DOMAIN_MODEL_REPORT.md` for the domain model).
- `Registry::resolve(operator_id, implementation_id) -> Result<ResolvedTarget, ResolutionReason>` applies
  every eligibility rule and, on success, joins the 14 endpoint paths to absolute URLs against
  `canonical_origin` and derives the SSRF-pin `expected_host` (`host_of`).
- `production_registry()` seeds exactly one operator (`operator-zero`) + one implementation
  (`operator-zero-ref-impl`, origin `https://zero.banza.network`) — no fictional operators.

## 4. Resolution chain, step by step (`registry.rs :: resolve`)

```
operator_id ─▶ operator exists? unique? Published? ───────────────┐  (unknown/duplicate/*_status)
implementation_id ─▶ exists? unique? belongs to operator & listed? ┤
                     Published? ──────────────────────────────────┤
canonical_origin ─▶ non-empty HTTPS with parseable host? ─────────┤  (origin_missing)
compatibility ─▶ protocol_version ∈ {1.0.0,1.0}? ─────────────────┤  (incompatible_protocol_version)
                 environment ∈ {sandbox,demo}? ───────────────────┤  (unsupported_environment)
                 profile ∈ {L0..L4}? ────────────────────────────┘  (incompatible_profile)
                                                    ▼
                                        ResolvedTarget (canonical_origin + expected_host +
                                        14 absolute endpoint URLs + discovery_url)
```

Constants in `registry.rs`: `SUPPORTED_PROTOCOL_VERSIONS = ["1.0.0","1.0"]`,
`SUPPORTED_ENVIRONMENTS = ["sandbox","demo"]`, `SUPPORTED_PROFILES = ["L0".."L4"]`,
`REFERENCE_ORIGIN = "https://zero.banza.network"`.

## 5. Fail-closed with typed reasons (15)

Presence in the registry is **not** admission. A non-published / revoked / origin-less / incompatible /
wrong-environment record is simply not an eligible target. The 15 `ResolutionReason` variants
(`model.rs`):

```
unknown_operator · duplicate_operator · operator_unpublished · operator_removed · operator_revoked ·
unknown_implementation · duplicate_implementation · implementation_operator_mismatch ·
implementation_unpublished · implementation_removed · implementation_revoked · origin_missing ·
incompatible_protocol_version · unsupported_environment · incompatible_profile
```

## 6. Closed-set safety — no caller URL, ever

- `operator_id` / `implementation_id` are **closed-set ids**, never URLs. The browser client
  (`website/lib/banzaiValidateClient.ts`) re-checks `isClosedId` before POSTing; the backend
  **re-resolves in Rust** (`validate.js :: resolveTarget`), so the browser check is defence-in-depth.
- The fetcher receives only a registry-derived `canonical_origin` + `expected_host` + relative `path`
  (`validate.js :: runTechnicalStep` → `fetcherClient.js`); an absolute-URL path cannot smuggle a host
  because `Url::join` replaces the base and the fetcher re-checks `host_mismatch`.
- The resolution/eligibility logic is generic over any `Registry`, so the negative paths
  (duplicate/removed/revoked/mismatch/incompatible) are unit-tested with **test-only** records without
  seeding fictional operators into the closed production set.

## 7. Discovery binding

The resolved target's endpoint map is verified against the fetched `/discovery.json` at step 1
(`verdict.rs :: validate_discovery`): identity fields must match and every announced endpoint URL must be
host-bound to `expected_host` (`DISCOVERY_MISMATCH` / `DISCOVERY_ENDPOINT_OFF_ORIGIN`). Resolution
supplies the expectation; discovery is checked against it, not trusted.

## 8. Registry ≠ scheme directory ≠ admission

The Technical Registry (L2) is independent of the L3 Scheme Participant Directory; public verification
needs no scheme account (ADR-059/061; threat model M2.19C boundaries). Resolving a target proves
eligibility to be validated — not scheme admission, not regulatory authorisation, not permission to move
funds (ADR-068 §4.10).

## 9. Guard & test coverage

- `banzai-closed-target-registry-check` — targets come from a CLOSED registry (`production_registry` +
  the client operator listing); `operator-zero` only; no fictional operators (§4.6/§4.9).
- `banzai-no-arbitrary-url-check` — `fetcherClient` + `validate.js` never accept a user-supplied URL; only
  registry-resolved origin+path; closed id shape (§4.7).
- `banzai-operator-implementation-model-check` — the two record types + Fase 0 operator→implementation
  selection (§4.2/§4.3).
- Tests: Rust unit tests in `engines/banza-target-registry/src/lib.rs` (every reason variant + happy
  path); `website/lib/banzaiValidationRegistry.test.ts` (vitest, client resolution mirror).
