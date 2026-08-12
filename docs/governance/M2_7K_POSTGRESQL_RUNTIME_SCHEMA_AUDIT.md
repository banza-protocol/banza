# M2.7K — PostgreSQL Runtime & Schema Audit

- **Phase:** M2.7K — PostgreSQL Protocol State, Schema and Data Boundary Audit
- **Date:** 2026-07-19
- **Scope:** Audit, document and publicly expose the role of PostgreSQL in the BANZA protocol.
- **Method:** Read-only. No inserts, updates, deletes, migrations or data dumps were performed against
  the running database. Findings below are from the committed schema (`001_schema.sql`) cross-checked
  against the live runtime via read-only `SELECT`/catalog queries.

> **Canonical finding:** the BANZA PostgreSQL is a **verifiable protocol-state database**. It is not a
> financial database, not a payment ledger, not a banking core, not a digital wallet and not an
> operator database. See ADR-042 and `POSTGRESQL_PROTOCOL_STATE.md`.

---

## 1. Environment

| Property | Value |
|---|---|
| Image | `pgvector/pgvector:pg16` |
| Database | `banza_protocol` |
| Bootstrap user | `banza_admin` (superuser — init/admin only, **not** used by services) |
| Service roles | `banza_ro`, `banza_gov`, `banzai_rw` (all `LOGIN`, none superuser) |
| Extensions | `vector` (pgvector), `pgcrypto`, `plpgsql` |
| Network | Docker-internal `banza-data` only |
| Host/Internet exposure | **None** — `docker compose ps` reports `5432/tcp` (container port, not published to host) |
| Volume | `pgdata` |
| Schema source of truth | `infra/banza-network/postgres/init/001_schema.sql` |
| Role passwords | injected at deploy from `.env` via generated `002_roles.sql` (placeholders in schema) |

The schema header states the boundary in the file itself: *"Contains ONLY public protocol artifacts
(signed), BanzAI doc index, and audit. NO wallet/ledger/balance/account/KYC. NO private keys. NO
operator business data."*

---

## 2. Schemas

Only the default `public` schema is used. No operator schema, no financial schema, no per-tenant
schema. All tables, extensions and roles live in `public`.

---

## 3. Tables (12) and their purpose

| Table | Class | Purpose | Holds value? |
|---|---|---|---|
| `root_manifest` | Trust | Signed root manifest (public blob) | No |
| `key_manifest` | Trust | **Public** issuer keys (`issuer_keys jsonb`), fingerprints — never private keys | No |
| `operators` | Registry | Public operator registry (self-published). Seed **empty**. | No |
| `certificates` | Registry | Production issuance gated by M2/M3. **Empty.** | No |
| `brl_snapshot` | Trust | Signed BRL / revocation-list snapshot | No |
| `brl_entry` | Trust | Revocation-list entries | No |
| `conformance_evidence` | Evidence | Evidence report **hashes** (`report_sha256`) + result marker | No |
| `protocol_audit` | Audit | Append-only governed-write audit log | No |
| `banzai_document` | Index | BanzAI document index (public protocol reference) | No |
| `banzai_chunk` | Index | Chunk text + `embedding vector(1024)` (HNSW index) for RAG retrieval | No |
| `banzai_answer_cache` | Index | Cached Q/A + embeddings, keyed on corpus hash — "Questions/answers/source ids ONLY — never secrets, keys or user identifiers" | No |
| `protocol_state` | State | Phase/milestone markers (`k text`, `v jsonb`) | No |

Every table stores public protocol artifacts, a document index, an audit trail or a state marker.
**None stores funds, balances, real payment transactions, bank accounts, cards, KYC/AML data,
personal data of end users, or private keys.**

---

## 4. Current data (live, read-only)

Row counts from `pg_stat_user_tables` (live tuples):

| Table | Rows |
|---|---|
| `root_manifest` | 0 |
| `key_manifest` | 0 |
| `operators` | **0** |
| `certificates` | **0** |
| `brl_snapshot` | 0 |
| `brl_entry` | 0 |
| `conformance_evidence` | 0 |
| `protocol_audit` | 0 |
| `banzai_document` | 0 |
| `banzai_chunk` | 0 |
| `banzai_answer_cache` | 0 |
| `protocol_state` | 3 |

- **`operators` is empty** → `/operators = []`. No operator is registered.
- **`certificates` is empty** → no production certificate exists; `production_certificates = false`.
- `protocol_state` holds exactly the pre-production markers (phase, milestones, boundary note).
- The BanzAI index is empty at rest; it is populated by the indexer, not by user activity.

This confirms the public posture (`/estado`, `/operators`, `/conformance/evidence`) at the database
level: pre-production, nothing certified, no operator data.

---

## 5. Extensions

`vector` (pgvector), `pgcrypto`, `plpgsql`. `pgvector` exists solely for the BanzAI RAG index
(`banzai_chunk.embedding`, `banzai_answer_cache.*_embedding`, both `vector(1024)`, HNSW cosine index).
`pgcrypto` is available for hashing helpers. Neither extension is used to store or move value.

---

## 6. Roles and privileges (verified at runtime)

| Role | Login | Superuser | Grants (verified live) |
|---|---|---|---|
| `banza_admin` | yes | **yes** | bootstrap/init only; not a service credential |
| `banza_ro` | yes | no | **SELECT only** (verification-api serves public routes) |
| `banza_gov` | yes | no | SELECT/INSERT/UPDATE on trust/registry + audit + sequences (governed, audited writes) |
| `banzai_rw` | yes | no | write (SELECT/INSERT/UPDATE/DELETE) **only** on `banzai_document`, `banzai_chunk`, `banzai_answer_cache`; SELECT-only on trust/registry/state |

Runtime verification of `banzai_rw` (from `information_schema.role_table_grants`):

```
banzai_answer_cache : DELETE,INSERT,SELECT,UPDATE
banzai_chunk        : DELETE,INSERT,SELECT,UPDATE
banzai_document     : DELETE,INSERT,SELECT,UPDATE
brl_snapshot        : SELECT
certificates        : SELECT
conformance_evidence: SELECT
key_manifest        : SELECT
operators           : SELECT
protocol_state      : SELECT
root_manifest       : SELECT
```

`banzai_rw` **cannot** write trust, registry, certificates, evidence or audit tables — it may only read
them to *explain* the protocol, and may write only its own document index. This enforces the invariant
"BanzAI explains, does not define" at the database privilege layer. `banza_ro` was verified as
SELECT-only.

---

## 7. Service consumers

| Service | Role | Access | Notes |
|---|---|---|---|
| `verification-api` (Node) | `banza_ro` | read-only | serves `/operators`, `/certificates`, `/conformance/evidence`, `/root.json`, `/key-manifest.json`, `/federation/revocation-list.json` |
| `banzai-api` (Node) | `banzai_rw` | index RW + read to explain | native agent retrieval/answer cache; mock provider; `llm_calls = 0` |
| governance tooling | `banza_gov` | governed writes | trust/registry writes, audited; not a public-serving credential |

No service uses `banza_admin`. No service can move value because there is no value to move.

---

## 8. Negative confirmations (what the audit did **not** find)

The following do not exist anywhere in the schema or runtime:

- No `balance`, `balances`, `wallet_balance`, `funds`, `money` value column.
- No `payment_transaction`, `transactions`, `settlement`, `ledger_entry` (as held value).
- No `iban`, `bank_account`, `card_number`, `pan`, `cvv`.
- No `kyc`, `aml_customer`, `customer_pii`, end-user personal-data column.
- No `private_key`, `secret_key`, `seed_phrase`, `mnemonic`, `root_private`, `custodian_secret`.
- No `password`, `token` or private API-key column (role passwords are injected at deploy, not stored
  in schema or artifacts).
- No host/Internet exposure of the database port.

---

## 9. BanzAI / pgvector index audit

- `pgvector` is present and used **only** for the native agent's retrieval-augmented generation index.
- `banzai_chunk.embedding vector(1024)` with HNSW cosine index `banzai_chunk_embedding_idx`.
- `banzai_answer_cache` stores normalized question + answer + embeddings + source ids, keyed on the
  corpus hash (`sources_hash`); a corpus change invalidates prior rows. Comment in schema:
  *"Questions/answers/source ids ONLY — never secrets, keys or user identifiers."*
- Both index tables were **empty (0 rows)** at audit time.
- `banzai_rw` (the only role able to write these) cannot touch trust, registry or certificates.
- The index contains **public** protocol reference text only; it does not embed secrets or user data.

---

## 10. Conclusion

The BANZA PostgreSQL is a **verifiable protocol-state store**. It stores signed public artifacts, a
public document index for the native agent, an audit log and pre-production state markers. It is
operator-neutral by construction: with `operators` and `certificates` empty, no operator data and no
certificate exist. The financial invariants (`INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`) remain
rules the protocol *defines and verifies* for operators — they are not a ledger this database runs.

The boundary is now made explicit by ADR-042 and enforced by `make postgres-data-boundary-check`.
