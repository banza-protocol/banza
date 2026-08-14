-- M2.19G.3A (ADR-040) — origin-challenge single-use. Adds origin_challenges.consumed_at so a challenge
-- that was positively verified cannot verify again (replay/idempotency guard). Idempotent; safe to
-- re-run. Mirrors the canonical init/001_schema.sql for the EXISTING production database.
--
-- Apply on deploy (existing DB), from /srv/banza-protocol:
--   docker compose exec -T postgres psql -U banza_admin -d banza_protocol -f /migrations/M2_19G3A_origin_single_use.sql
-- (or via stdin: ... psql ... < .../M2_19G3A_origin_single_use.sql — the container mounts only init/).

\connect banza_protocol

ALTER TABLE origin_challenges ADD COLUMN IF NOT EXISTS consumed_at timestamptz;
