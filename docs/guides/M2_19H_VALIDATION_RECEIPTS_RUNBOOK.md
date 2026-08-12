# M2.19H — Validation Receipt Store: Migration, Deploy & Rollback Runbook

> **Change:** enable the durable append-only validation-receipt store (ADR-076) in production. Adds six append-only tables + triggers to `banza_protocol` and turns on `BANZAI_RECEIPTS_ENABLED` for `banzai-api`.
> **Host:** production VPS, stack at `/srv/banza-protocol/runtime` (`compose.yml` + `.env`); repo at `/srv/banza-protocol/repo` (root-owned; `sudo git`). Postgres runs as the internal-only `postgres` compose service (`POSTGRES_USER=banza_admin`, DB `banza_protocol`).
> **Safety:** additive + idempotent migration (only `CREATE … IF NOT EXISTS` / `CREATE OR REPLACE`; no `ALTER`/`DROP`, no data loss). The store holds protocol state only — no funds, no PII, no secrets (ADR-042).

## 0. Preconditions

- CI green on the merge commit; `banzai-api` image built for the deployed tag.
- The `banzai_rw` role exists (created by `init/001_schema.sql`, password from `.env` `PG_BANZAI_PASSWORD`).
- `make receipts-e2e` green locally (24 assertions) and `infra/banza-network/tests/validate-schema.sh` green (23 tables).

## 1. Verified backup (MANDATORY — no migration without it)

```bash
ssh banza@<prod-host>
cd /srv/banza-protocol/runtime
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
sudo docker compose exec -T postgres pg_dump -U banza_admin -d banza_protocol -Fc \
  > /srv/banza-protocol/backups/banza_protocol_${STAMP}.dump
sha256sum /srv/banza-protocol/backups/banza_protocol_${STAMP}.dump \
  | tee /srv/banza-protocol/backups/banza_protocol_${STAMP}.dump.sha256
# Prove the dump is readable (list its TOC) BEFORE proceeding:
sudo docker compose exec -T postgres sh -c 'pg_restore -l' \
  < /srv/banza-protocol/backups/banza_protocol_${STAMP}.dump | head
```

Do not continue unless the SHA-256 is recorded and `pg_restore -l` lists a valid TOC.

## 2. Apply the migration (idempotent)

The migrations dir is not mounted into the container, so pipe the file over stdin:

```bash
cd /srv/banza-protocol/repo && sudo git fetch --all && sudo git checkout <merge-commit>
cd /srv/banza-protocol/runtime
sudo docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U banza_admin -d banza_protocol \
  < /srv/banza-protocol/repo/infra/banza-network/postgres/migrations/M2_19H_validation_receipts.sql
```

Re-running is safe (idempotent). Expect no errors.

## 3. Verify the schema + immutability

```bash
q(){ sudo docker compose exec -T postgres psql -tAX -U banza_admin -d banza_protocol -c "$1"; }
# 6 receipt tables present:
q "select count(*) from information_schema.tables where table_name in
   ('validation_executions','validation_step_executions','operation_receipts',
    'journey_receipts','evidence_bundles','validation_artifact_observations');"   # expect 6
# append-only triggers present:
q "select count(*) from pg_trigger where tgname like '%immutable' or tgname like '%freeze';"  # expect >=6
# banzai_rw has INSERT but NOT DELETE on a sealed table:
q "select has_table_privilege('banzai_rw','operation_receipts','INSERT'),
          has_table_privilege('banzai_rw','operation_receipts','DELETE');"        # expect t,f
```

## 4. Enable + deploy banzai-api

In `/srv/banza-protocol/runtime/.env` set:

```
BANZAI_RECEIPTS_ENABLED=1
# BANZAI_RECEIPTS_OUTBOX_DIR defaults to /var/lib/banzai/receipts-outbox (mounted volume) — leave unless overriding
BANZA_COMMIT=<merge-commit>        # surfaced by GET /banzai/runtime (ADR-072)
```

Then recreate the service (the outbox volume + env come from the updated `compose.yml`):

```bash
sudo docker compose up -d --build banzai-api
```

## 5. Health + smoke

```bash
curl -fsS https://banza.network/banzai/runtime | jq '{release,commit}'   # commit == <merge-commit>
# store reachable (public-workspace read; empty history is 200 with [], not 503):
curl -fsS "https://banza.network/validate/executions?implementation_id=__none__" | jq .
# durable path: run one OZ validation, then confirm it is consultable
```

The routes return `503` only when the store is disabled; once enabled they return JSON.

## 6. Rollback

The migration is additive, so rollback is normally just **disabling the feature**, not dropping data:

```bash
# .env: BANZAI_RECEIPTS_ENABLED=0
cd /srv/banza-protocol/runtime && sudo docker compose up -d banzai-api
```

The receipt tables remain (inert; nothing writes to them). Only if a full schema rollback is explicitly required, restore the verified dump from §1 into a fresh volume:

```bash
sudo docker compose stop banzai-api verification-api website
sudo docker compose exec -T postgres psql -U banza_admin -d banza_protocol -c \
  "DROP TABLE IF EXISTS validation_artifact_observations, evidence_bundles, journey_receipts,
   operation_receipts, validation_step_executions, validation_executions CASCADE;"
# or, for a clean-slate restore, recreate the pgdata volume and pg_restore the §1 dump.
sudo docker compose up -d
```

Never drop tables without the verified backup from §1 in hand.

## 7. Post-deploy checklist

- [ ] `GET /banzai/runtime` reports the merge commit.
- [ ] An Operator Zero 9-step run persists; reload/compare/reproduce/export work; digests verify.
- [ ] API restart → the persisted run is still consultable (durability).
- [ ] `docker compose logs banzai-api` shows outbox drain + stale-recovery on boot, no errors.
