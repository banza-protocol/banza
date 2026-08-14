-- M2.19B — Trust/Security/Contracts realignment (Finding B, ADR-027).
-- Removes the residual operator-certificate materialization from an ALREADY-INITIALISED
-- protocol-state database. `001_schema.sql` runs only on first init, so an existing
-- deployment needs this idempotent migration to match the current schema.
--
-- Safe by construction: in pre-production these objects are EMPTY (operators = [],
-- no certificates issued, no BRL entries). Under the open trust model (ADR-027) BANZA
-- issues no operator certificates, so none of this content can exist in production either.
--
-- Apply on deploy:
--   docker compose exec -T postgres psql -U postgres -d banza_protocol \
--     -f /migrations/M2_19B_remove_operator_certificates.sql
-- (idempotent — safe to re-run).
\connect banza_protocol

BEGIN;

-- 1. Revocation covers cryptographic material, not certificates: rename the column
--    (idempotent — only renames if the old column still exists).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'brl_entry' AND column_name = 'certificate_id') THEN
    ALTER TABLE brl_entry RENAME COLUMN certificate_id TO revoked_ref;
  END IF;
END $$;

-- 2. The operator registry is an index of published evidence, not a granted-status store.
ALTER TABLE operators DROP COLUMN IF EXISTS certification_level;
ALTER TABLE operators DROP COLUMN IF EXISTS certificate_id;

-- 3. BANZA issues no operator certificates (ADR-027): drop the issuance table + its grants.
DROP TABLE IF EXISTS certificates CASCADE;

COMMIT;
