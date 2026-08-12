# banza-target-registry (ADR-037, ADR-068; M2.19G.1)

The **closed BANZA Technical Registry** domain model plus the resolution / eligibility / verdict logic
for **endpoint-originated operator validation** (ADR-068). It answers, in Rust: *which
operator + implementation is an eligible validation target, what is its canonical origin and its
published endpoint map, and — after the secure fetcher retrieves and the decision engines judge each
artifact — what is the aggregate Certification Readiness?*

> Operational rule (ADR-068 §4): *the operator publishes; BanzAI obtains; Rust verifies; the receipt
> fixes the result; the Technical Registry publishes the verifiable state.*

Per ADR-037 this is an **official engine → it MUST be Rust**. It is a library (`rlib`) + a WASM module
(`cdylib`, built with `--features wasm`) consumed by `banzai-api`'s validation pipeline.

## The model

- **Operator vs implementation (ADR-068 §4.2/§4.3).** The **operator** is the responsible entity; the
  **implementation** is the technical system evaluated. One operator may publish many implementations
  (demonstration, sandbox, pre-production, production; versions, profiles, capabilities, deployments).
  The validation target is always an operator **and** one of its published implementations — never the
  entity in the abstract.
- **Resolution.** `resolve(operator_id, implementation_id)` walks
  `operator_id → implementation_id → canonical_origin → discovery` over a **closed set** and decides
  eligibility with typed reasons (`unknown_*`, `*_unpublished`, `*_removed`, `*_revoked`,
  `origin_missing`, `incompatible_protocol_version`, `unsupported_environment`, `incompatible_profile`).
  Only a `published` operator + `published` implementation with a valid HTTPS origin and supported
  protocol/environment/profile is eligible.
- **Closed production registry.** Exactly one operator (`operator-zero`) and one implementation
  (`operator-zero-ref-impl`, origin `https://zero.banza.network`) — no fictional operators. Operador
  Zero receives no shortcut, fixture or bypass; it is resolved and fetched exactly like any future
  published implementation (ADR-068 §4.9).
- **Verdicts.** `step_status` maps a decision engine's raw output onto the canonical step status;
  `certification_readiness` aggregates the technical verdicts into `READY`/`BLOCKED`. It is **never** a
  Certification Record and **never** `CERTIFIED` (ADR-066).

## Modules

| Module         | Responsibility |
|----------------|----------------|
| `src/model.rs`    | Domain records: `OperatorRecord`, `ImplementationRecord`, `Endpoints` (14 canonical paths), `ResolvedTarget`, `PublicationStatus`, `ResolutionReason`. |
| `src/registry.rs` | The closed `Registry` + `resolve()` eligibility logic + `production_registry()`. |
| `src/verdict.rs`  | `validate_discovery`, `step_status`, `certification_readiness` — the only place a verdict is decided. |
| `src/lib.rs`      | Crate root + JSON entry points (`resolve_json`, `catalogue_json`, `validate_discovery_json`, `step_status_json`, `certification_readiness_json`). |
| `src/wasm.rs`     | `#[wasm_bindgen]` exports (`registry_resolve_json`, `registry_catalogue_json`, …) consumed by `banzai-api`. |

## Boundary

Resolution proves **eligibility only**. Presence in the registry **never** implies admission into any
operational scheme, regulatory authorisation, or the ability to move funds (ADR-068 §4.10, ADR-061).
Rust decides; TypeScript never decides; there is no model call anywhere here.

## See also

- ADR-068 — endpoint-originated operator validation & operator/implementation model
- ADR-065 (technical registry) · ADR-066 (closed certification-state machine) · ADR-067 (Operador Zero)
- `engines/banza-artifact-fetcher` — the secure Rust fetcher that retrieves the resolved endpoints
- The public reference: BANZA Reference, chapters 7–9 & 12 (`website/content/BANZA_REFERENCIA.md`)
- Contracts: `contracts/production/operator-record.production.schema.json`,
  `implementation-record.production.schema.json`, `contracts/openapi/operator-validation.yaml`
