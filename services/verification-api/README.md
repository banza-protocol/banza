# verification-api

Protocol-only HTTP service that serves the **canonical BANZA machine routes** as
read-only JSON, sourced from the dedicated PostgreSQL (segregated `banza_ro` role).

It contains **no** wallet, ledger, KYC/KYB, payments, end-user accounts, operator
business logic or operator brands. It holds no private keys and performs no signing —
it serves only public, signed artifacts already stored in the database.

## Routes (all GET, `application/json`, never HTML)
| Route | Meaning |
|---|---|
| `/health` | App liveness + DB readiness (`{status, db, phase, ready}`) |
| `/.well-known/banza/root.json` | Current signed root manifest (public blob; `data: null` until published) |
| `/.well-known/banza/key-manifest.json` | Current signed public issuer-key manifest |
| `/operators` | Public protocol registry — an index of operator metadata + published verifiable evidence; a bare `[]` in pre-production |
| `/federation/revocation-list.json` | Signed BRL snapshot + entries (pre-production envelope) |
| `/conformance/evidence` | Conformance evidence **hashes** — PASS is verifiable technical evidence |

## Pre-production behaviour
Machine routes carry an honest envelope:
```json
{ "protocol": "BANZA", "status": "pre-production", "pre_production": true,
  "production_certificates": false,
  "note": "A conformance PASS is verifiable technical evidence… participation is demonstrated, not authorised by a central authority. …" }
```
- `/operators` returns an empty list until an operator publishes verifiable evidence (ADR-037, annex §12).
- No route fabricates production data or private keys.
- If the DB is unavailable the routes **fail safe**: JSON `503` with `degraded: true`
  (and `/operators` still returns `[]`), never a crash or an HTML error page.

## Config
| Env | Default | Purpose |
|---|---|---|
| `PORT` | `8090` | Listen port |
| `DATABASE_URL` | — | `postgres://banza_ro@postgres:5432/banza_protocol` (read-only role) |
| `PROTOCOL_PHASE` | `pre-production` | Fallback when the DB `protocol_state.phase` is unreadable |

## Run
```bash
DATABASE_URL=postgres://banza_ro@localhost:5432/banza_protocol node src/server.js
```
Local full-stack validation: `infra/banza-network/tests/smoke-verification-api.sh`
and `infra/banza-network/tests/e2e-full-stack.sh`.
