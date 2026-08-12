#!/usr/bin/env bash
# Apply the schema on an ephemeral pgvector container and assert protocol invariants.
# Throwaway password, throwaway container, removed on exit. No real secrets, no VM.
set -euo pipefail
cd "$(dirname "$0")/.."   # infra/banza-network
fail() { echo "FAIL: $*" >&2; exit 1; }

C=banza-schema-test-$$
PW=throwaway_$$
cleanup() { docker rm -f "$C" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "== start ephemeral pgvector/pgvector:pg16 =="
docker run -d --name "$C" -e POSTGRES_PASSWORD="$PW" -e POSTGRES_DB=banza_protocol \
  pgvector/pgvector:pg16 >/dev/null
# Wait for the target DB to actually accept queries (the image restarts once after
# first-boot init, so pg_isready can report "ready" on the temporary server before
# banza_protocol exists). Poll a real SELECT against the target DB instead.
until docker exec "$C" psql -tAX -U postgres -d banza_protocol -c 'select 1' >/dev/null 2>&1; do sleep 1; done

echo "== apply postgres/init/001_schema.sql =="
docker exec -i "$C" psql -v ON_ERROR_STOP=1 -U postgres -d banza_protocol \
  < postgres/init/001_schema.sql >/tmp/banza-schema.out 2>&1 \
  || { cat /tmp/banza-schema.out; fail "schema failed to apply"; }
echo "  applied without error ✅"

q() { docker exec "$C" psql -tAX -U postgres -d banza_protocol -c "$1"; }

tables=$(q "select count(*) from information_schema.tables where table_schema='public';")
[ "$tables" -eq 23 ] || fail "expected 23 tables, got $tables"
echo "  tables: $tables ✅"

# BanzAI answer cache (cost control): pgvector column + exact-key unique index
[ "$(q "select 1 from information_schema.tables where table_name='banzai_answer_cache';")" = "1" ] \
  || fail "banzai_answer_cache table missing"
[ "$(q "select 1 from pg_indexes where indexname='banzai_answer_cache_embedding_idx';")" = "1" ] \
  || fail "banzai_answer_cache hnsw embedding index missing"
echo "  banzai_answer_cache (pgvector) present ✅"

for r in banza_ro banza_gov banzai_rw; do
  [ "$(q "select 1 from pg_roles where rolname='$r';")" = "1" ] || fail "missing role $r"
done
echo "  segregated roles present ✅"

[ "$(q "select 1 from pg_extension where extname='vector';")" = "1" ] || fail "pgvector not active"
echo "  pgvector active ✅"

phase=$(q "select v#>>'{}' from protocol_state where k='phase';")
[ "$phase" = "pre-production" ] || fail "phase is '$phase', expected pre-production"
echo "  protocol_state.phase = pre-production ✅"

ops=$(q "select count(*) from operators;")
[ "$ops" -eq 0 ] || fail "operators must seed empty, got $ops"
echo "  operators seeded empty ✅"

echo "ALL SCHEMA CHECKS PASSED ✅"
