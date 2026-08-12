#!/usr/bin/env bash
# BANZA backups — encrypted (age), off-VM. NOT an operational runtime dependency.
# Daily: pg_dump. Weekly (arg "weekly"): + public artifacts. Push to off-VM object storage.
set -euo pipefail

SRV="/srv/banza-protocol"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="$SRV/backups"
AGE_RECIPIENTS_FILE="${AGE_RECIPIENTS_FILE:-$SRV/backups/age-recipients.txt}"  # age public keys (NOT private)
MODE="${1:-daily}"

install -d -m 700 "$STAGE"

# ── PostgreSQL logical dump (public artifacts + doc index; no secrets/keys) ──
docker compose -f "$SRV/compose.yml" exec -T postgres \
  pg_dump -U banza_admin -d banza_protocol --no-owner \
  | age -R "$AGE_RECIPIENTS_FILE" -o "$STAGE/pg-$STAMP.sql.age"

# ── Weekly: artifacts (signed manifests, evidence indexes) ──
if [ "$MODE" = "weekly" ]; then
  tar -C "$SRV" -czf - artifacts \
    | age -R "$AGE_RECIPIENTS_FILE" -o "$STAGE/artifacts-$STAMP.tar.gz.age"
fi

# ── Push off-VM (choose one; keep OUT of the runtime path) ──
# rclone copy "$STAGE" "offvm:banza-backups/" --include "*-$STAMP.*"   # object storage (S3/B2/…)
# retention: prune local staging older than 7 days
find "$STAGE" -name '*.age' -mtime +7 -delete 2>/dev/null || true

echo "backup ($MODE) done: $STAMP"
# Encryption uses age PUBLIC recipients only; private key stays OFF the VM (restore-time only).
