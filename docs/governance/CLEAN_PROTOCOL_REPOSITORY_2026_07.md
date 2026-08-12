# Clean Protocol Repository — Restructure Report (2026-07)

**Base commit:** `44bb878` (origin/main) · **Branch:** `chore/simple-protocol-repo-architecture-2026-07`
**Status:** non-normative record · **Boundary policy:** [`REPOSITORY_STRUCTURE.md`](REPOSITORY_STRUCTURE.md)

## Objective & problem
BANZA was originally a full operator/application; the public repo still carried
operator-era residue (implementation crate docs, runtime lifecycles, dev/phase
reports, ambiguous `docs/core`). This restructure makes the repository
unambiguously a **protocol-only** repo: specification, contracts, conformance,
ADR/RFC, public governance/security, website, minimal public infra.

## New `docs/` taxonomy
`docs/{adr, rfc, protocol, reference, governance, security, images}` — fixed and
enforced by `make purity-check`.

## Removed (12 — operator-legacy & dev artifacts)
- Operator crate docs (`docs/core/`): `acquiring, transactions, wallets, routing, payment-links, ledger, settlement, qr`.md — documented Rust operator crates (merchant wallets holding funds, settlement disbursing to banks, payment-rail routing). BANZA holds no funds and does not settle.
- `docs/architecture/settlement-lifecycle.md` — operator settlement runtime ("wallet receipts → bank disbursements").
- `docs/validation/MATRIX_B_BANZAI.md` — cross-layer (BanzAI belongs to the banzai repo).
- `docs/federation/FEDERATION_GAP_ANALYSIS.md`, `L3_FIRST_PASS_IMPLEMENTATION_PLAN.md` — consumed dev readiness/roadmap artifacts.

## Moved (41 — into the protocol-only taxonomy)
- → `spec/`: `invariants.md` (from core/financial-invariants), `disputes.md`, `tracing.md` (from observability), `collections.md`, `payment-lifecycle.md`, `qr-payment-lifecycle.md`, `provider-model.md`, `capability-negotiation.md`, `README.md` (protocol index).
- → `spec/federation/`: the 15 federation specification docs.
- → `docs/governance/`: `BANZA_TRUST_ARCHITECTURE.md` (from trust), `BANZA_ROOT_CUSTODY_DECISION_REQUIRED.md` (from audits), `MATRIX_A_BANZA.md` + `MATRIX_C_OPERATOR.md` (from validation), `ANNEX-BANZA-NETWORK-INFRASTRUCTURE.md` (from annexes).
- → `docs/reference/`: `overview.md` (from whitepaper), `BANZA_SVG_REGISTRY.md`, `BANZA_SVG_STANDARDS.md`, `diagrams/en/`, and the top-level `compatibility/conformance/getting-started/reference-api/stability`.md.

## Kept (load-bearing, despite matching a removal pattern)
- `docs/governance/BANZA_ROOT_CUSTODY_DECISION_REQUIRED.md` — cited by ADR-027 and the ceremony records (M2).
- `docs/governance/BANZA_V1_OPERATIONAL_TRANSITION_PLAN.md` — cited by the M2 ceremony-record template as the authorization reference; restored after initial removal.
- `docs/security/PRODUCTION_ROOT_READINESS_REPORT.md` — cited by the root-key ceremony procedure.

## Links & references corrected
- 146 incoming path references rewritten across docs, `contracts/invariants.json`, both `docs/reference/pt/completa.md` copies (root + website content), and `.js`.
- Relative up-links re-levelled for files moved one level deeper (federation, top-level docs).
- Remaining dead links repaired (README, `spec/invariants.md` crosswalk, `spec/README.md` index, `docs/governance/certification-boundary.md`, ADR-016 collections link, ADR-008 depth). Final broken-relative-link scan: **0**.

## Guard reinforced (regression prevention)
`tools/check-repository-purity.sh` now also fails on: forbidden `docs/` subdirs
(`core, architecture, federation, trust, audits, validation, observability,
whitepaper, annexes, history, operations`), `apps/docs/`, tracked phase/dev report
artifacts outside `docs/governance/`, and any ADR outside `ADR-001..ADR-036`.
New policy: [`REPOSITORY_STRUCTURE.md`](REPOSITORY_STRUCTURE.md).

## Manual-review notes
- `MATRIX_C_OPERATOR.md` kept (operator-neutral conformance criteria) in `docs/governance/`.
- Federation conformance-suite docs (`RUNNER_DESIGN`, `FIXTURE_CATALOG`, `TEST_SUITE_SPEC`) kept under `spec/federation/`.
- `docs/security/README.md` retained at its existing name (not renamed to `SECURITY.md`).

## Validations (all green)
`reference-svg-check` **27/27** · `purity-check` **PASS** (reinforced) · `identity-check` **PASS** · `invariant-check` **PASS** · all `contracts/` + `conformance/` JSON valid · broken relative links **0**.

## Amend (pre-review, 2026-07)
Closed the pending items before human review:
- **Claim fixed** — `docs/reference/manifesto.md` no longer states the reference operator "é o primeiro operador certificado" (present tense). It now reads as the reference implementation and a *candidate* operator "se e quando cumprir os critérios técnicos e o enquadramento aplicável", and explicitly states there is **no certified operator** (`/operators` = `[]`) and **no active production certificate**. Repo-wide scan confirms **zero** present-tense "operador certificado / first certified operator" claims — all remaining mentions are the future **M3** milestone or explicit negatives.
- **`examples/` — KEPT.** Scanned clean (no operator-brand, wallet, EMIS, funds, or production terms); the README states it is conceptual and non-normative, with `contracts/`+`conformance/` as the source of truth. Retained per `CLAUDE.md`.
- **Root `BANZA_*.md` — KEPT.** They are the canonical entry references, heavily cross-referenced by the website/contracts/each other; moving them would be a large restructure and break many links. Rationale documented in `REPOSITORY_STRUCTURE.md` and the README.
- Counts unchanged (removed 12 / moved 41); additional modified files in the amend: `docs/reference/manifesto.md`, `REPOSITORY_STRUCTURE.md`, this report (and README rationale).

## Amend 2 (pre-review, 2026-07) — remove operator-era `deploy.sh`
- **`deploy.sh` — REMOVED.** It was the obsolete operator-era deploy script (an old VM IP, `root@`, `/srv/banza`, and legacy operator product services). The current **public** deploy flow is the reproducible bundle in `infra/banza-network/` (bootstrap + `compose.yml`, fixed GHCR image tags → `/srv/banza-protocol/`), documented in its README.
- **References repointed:** `CLAUDE.md` (Deployment) and `website/README.md` now point to `infra/banza-network/` instead of `./deploy.sh`.
- **Guard hardened:** removed the `(^|/)deploy\.sh$` special-case exclusion from `check-operator-contamination.sh` — `identity-check` now passes **without any exclusion for an obsolete script**. The only remaining occurrences of the legacy operator brand repo-wide are the guard's own runtime-built detection pattern (self-excluded) and the neutrality glossary (which documents the forbidden term).
- **Structure policy:** `REPOSITORY_STRUCTURE.md` now states that root-level scripts must be neutral/current/protocol-only and that operator-era deploy scripts do not belong here.
- **Counts:** removed **13** (12 + `deploy.sh`) / moved **41**. The repository is now protocol-only at the root — no operator-era deploy residue.

## Confirmations (nothing essential changed)
Protocol **v1.0** · `VERSION=1.0.0` · ADRs `ADR-001..ADR-036` · RFCs `RFC-0001..RFC-0006` ·
contracts/schemas/conformance **unchanged semantically** (only path references) · no API change ·
no runtime/Docker/Postgres/DNS/Cloudflare/TLS/secrets/`.env` change · BanzAI **mock**, `llm_calls=0` ·
`/operators=[]` · `production_certificates=false` · **no deploy, no merge**.
