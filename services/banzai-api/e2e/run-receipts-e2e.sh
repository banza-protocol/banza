#!/usr/bin/env bash
# Fase D — durable validation-receipt E2E runner (ADR-036).
#
# Spins up a THROWAWAY pgvector container, applies the canonical schema (postgres/init/001_schema.sql),
# grants the banzai_rw role, then runs the deterministic receipt E2E driver against it (store + fail-safe
# facade + outbox + crash-recovery + DB-enforced append-only immutability + a separate PG-DOWN process).
# No real secrets, no VM, no network. Container + outbox tempdir removed on exit.
#
# Usage: services/banzai-api/e2e/run-receipts-e2e.sh

set -euo pipefail
cd "$(dirname "$0")/../../.."   # repo root
REPO="$(pwd)"
SCHEMA="$REPO/infra/banza-network/postgres/init/001_schema.sql"

C=banza-receipts-e2e-$$
PW=throwaway_$$
OUTBOX="$(mktemp -d)/receipts-outbox"
cleanup() { docker rm -f "$C" >/dev/null 2>&1 || true; rm -rf "$(dirname "$OUTBOX")" 2>/dev/null || true; }
trap cleanup EXIT

echo "== start ephemeral pgvector/pgvector:pg16 =="
docker run -d --name "$C" -e POSTGRES_PASSWORD="$PW" -e POSTGRES_DB=banza_protocol -p 55432:5432 \
  pgvector/pgvector:pg16 >/dev/null
until docker exec "$C" psql -tAX -U postgres -d banza_protocol -c 'select 1' >/dev/null 2>&1; do sleep 1; done

echo "== apply schema + grant banzai_rw =="
docker exec -i "$C" psql -v ON_ERROR_STOP=1 -U postgres -d banza_protocol < "$SCHEMA" >/tmp/receipts-e2e-schema.out 2>&1 \
  || { cat /tmp/receipts-e2e-schema.out; echo "FAIL: schema"; exit 1; }
# The driver connects as banzai_rw (the deploy role). Give it a password + full DML on the receipt tables.
docker exec "$C" psql -v ON_ERROR_STOP=1 -U postgres -d banza_protocol -c "ALTER ROLE banzai_rw PASSWORD '$PW';" >/dev/null
docker exec "$C" psql -v ON_ERROR_STOP=1 -U postgres -d banza_protocol -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO banzai_rw; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO banzai_rw;" >/dev/null
echo "  schema applied ✅"

export DATABASE_URL="postgres://banzai_rw:${PW}@127.0.0.1:55432/banza_protocol"
export BANZAI_RECEIPTS_ENABLED=1
export BANZAI_RECEIPTS_OUTBOX_DIR="$OUTBOX"
mkdir -p "$OUTBOX"

echo "== run receipts E2E driver =="
node "$REPO/services/banzai-api/e2e/receipts-e2e.mjs"
