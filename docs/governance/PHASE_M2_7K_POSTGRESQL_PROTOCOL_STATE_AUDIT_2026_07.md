# Phase M2.7K — PostgreSQL Protocol State, Schema and Data Boundary Audit

- **Date:** 2026-07-19
- **Branch:** `feat/m2-7k-postgresql-protocol-state-audit-2026-07`
- **Scope:** Audit, document and publicly expose the role of PostgreSQL in the BANZA protocol, and
  enforce the data boundary automatically.
- **Deploy:** website-only (no service/infra/DNS/secret changes; the running database was audited
  **read-only**).

## Canonical decision

> **O PostgreSQL do BANZA é uma base de estado protocolar verificável. Não é base financeira, não é
> ledger de pagamentos, não é core bancário, não é carteira digital e não é base de dados de operador.**

## What was delivered

| Part | Deliverable |
|---|---|
| ADR | `decisions/adr/ADR-042-postgresql-as-protocol-state-store.md` (+ website mirror) — PostgreSQL as protocol state store, not a financial ledger |
| Runtime/schema audit | `docs/governance/M2_7K_POSTGRESQL_RUNTIME_SCHEMA_AUDIT.md` — methodology, environment, 12 tables, row counts, roles, consumers, negative confirmations |
| Canonical doc | `docs/governance/POSTGRESQL_PROTOCOL_STATE.md` — the data-boundary document (PT canonical) |
| Public page | `/referencia/postgresql` — new Reference chapter 15 "PostgreSQL — Estado Protocolar" (+ nav) |
| Reference | chapter 15 added to `BANZA_REFERENCIA.md` + byte-parity `docs/reference/pt/completa.md`; `reference.ts` CHAPTER_DEFS; §4 architecture summary line; ADR-042 in Referências; `banzai-evidence` WASM rebuilt |
| Diagrams | SVG-P-076 `postgresql-protocol-state`, SVG-P-077 `postgresql-data-boundary`, SVG-P-078 `postgresql-service-access` — canonical M2.7J visual grammar |
| Guard | `tools/check-postgres-data-boundary.sh` + `make postgres-data-boundary-check` + CI job (self-testing) |
| Tests | `website/lib/postgresqlBoundary.test.ts` (9 assertions: schema/roles/pgvector + chapter/nav/diagrams) |
| Ops | `infra/banza-network/README.md` — "PostgreSQL protocol-state operations" (read-only audit commands) |
| Machine note | `services/verification-api/src/routes.js` NOTE gains an ADR-042 boundary clause (source; activates on next service deploy — this phase is website-only) |

## Runtime audit findings (read-only, 2026-07-19)

- **Environment:** `pgvector/pgvector:pg16`, DB `banza_protocol`, extensions `vector` + `pgcrypto` +
  `plpgsql`. Port `5432/tcp` container-internal — **not** published to host/Internet.
- **12 tables**, all confirming the boundary: signed trust artifacts, public registry, evidence
  **hashes**, BanzAI document index, audit log, state markers. **None** holds funds/balances/real
  payment transactions/bank accounts/cards/KYC-AML/PII/private keys.
- **Row counts:** every table empty except `protocol_state` (3 pre-production markers). `operators = 0`
  (`/operators = []`), `certificates = 0` (`production_certificates = false`), BanzAI index empty.
- **Roles (verified live):** only `banza_admin` is superuser (init/admin, not a service credential).
  `banza_ro` SELECT-only; `banza_gov` governed/audited writes; `banzai_rw` writes **only**
  `banzai_document`/`banzai_chunk`/`banzai_answer_cache`, SELECT-only on trust/registry/state — cannot
  write trust or certificates.
- **pgvector** used solely for the agent RAG index; index empty at rest; embeds public reference text
  only.

## Enforcement

The boundary is enforced in three layers: schema (`001_schema.sql`), least-privilege roles (ADR-034),
and the automated `postgres-data-boundary` guard. The guard self-tests on every run and was proven
adversarially: injecting `CREATE TABLE evil_wallet (… balance … iban … private_key …)` into the tracked
schema makes it exit 1; the clean schema exits 0.

## Verification

- **Guards:** 16/16 green (identity, regulatory, private-key-leak, open-governance, public-surface,
  workbench-only, governance-docs, home-minimal, **postgres-data-boundary**, reference-svg,
  svg-visual-quality, svg-visual-system, banzai-protocol-agent, purity, invariant, rust-rule).
- **Tests:** 146 vitest pass (incl. 9 new boundary tests); `banzai-evidence` engine tests pass with the
  new corpus.
- **Build:** `next build` green; `/referencia/postgresql` and `/decisoes/adr-042` prerendered.
- **Browser E2E:** chapter renders with all 5 subsections, three SVGs load (200), no console errors;
  ADR-042 renders at `/decisoes/adr-042`.

## Boundary preserved

`/operators = []`, `production_certificates = false`, `llm_calls = 0`, no operator created/certified,
no federation/provider activation, no DNS/Cloudflare/TLS/secret/`.env` change, no production data
mutated (audit was strictly read-only). Humans maintain the protocol; they never authorise, certify,
accept or approve operators.
