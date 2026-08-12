-- BANZA — durable validation-journey receipt store (BanzAI Workbench, ADR-076 §D-076-08).
--
-- Idempotent migration that brings an EXISTING banza_protocol database up to the receipt-store schema
-- (init/001_schema.sql runs only on a fresh volume). Safe to run repeatedly. Adds only NEW tables,
-- indexes, functions, triggers and grants — no ALTER/DROP of existing objects, no data loss.
--
-- Apply on the host (human-gated deploy), after a verified backup:
--   docker compose exec -T postgres psql -U banza_admin -d banza_protocol -f /migrations/M2_19H_validation_receipts.sql
--
-- The store PRESERVES what the Rust engines decided; it never recomputes/edits/replaces a verdict, holds
-- no funds/values, no end-user personal data, no secrets, no free model text. Operador Zero uses the SAME
-- tables with NO privileged path.

BEGIN;

CREATE TABLE IF NOT EXISTS validation_executions (
  execution_id text PRIMARY KEY,
  operator_id text NOT NULL,
  implementation_id text NOT NULL,
  protocol_version text,
  profile text,
  environment text,
  snapshot_observed_at timestamptz,
  overall_status text NOT NULL DEFAULT 'NOT_EVALUATED',
  certification_readiness text,
  certification_status text NOT NULL DEFAULT 'NOT_CERTIFIED',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  orchestrator_version text,
  started_by text,
  workspace text,
  previous_execution_id text REFERENCES validation_executions(execution_id),
  reproduction_of text REFERENCES validation_executions(execution_id),
  reproduction_result text,
  journey_receipt_sha256 text,
  execution_lifecycle text NOT NULL DEFAULT 'RUNNING',
  heartbeat_at timestamptz,
  lock_owner text,
  cancellation_requested boolean NOT NULL DEFAULT false,
  timeout_at timestamptz,
  attempt_number int NOT NULL DEFAULT 1,
  idempotency_key text,
  interrupted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now());
-- Defensive: add operational columns if an earlier partial version of this table already exists.
ALTER TABLE validation_executions ADD COLUMN IF NOT EXISTS execution_lifecycle text NOT NULL DEFAULT 'RUNNING';
ALTER TABLE validation_executions ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz;
ALTER TABLE validation_executions ADD COLUMN IF NOT EXISTS lock_owner text;
ALTER TABLE validation_executions ADD COLUMN IF NOT EXISTS cancellation_requested boolean NOT NULL DEFAULT false;
ALTER TABLE validation_executions ADD COLUMN IF NOT EXISTS timeout_at timestamptz;
ALTER TABLE validation_executions ADD COLUMN IF NOT EXISTS attempt_number int NOT NULL DEFAULT 1;
ALTER TABLE validation_executions ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE validation_executions ADD COLUMN IF NOT EXISTS interrupted_at timestamptz;
CREATE INDEX IF NOT EXISTS validation_executions_impl_idx ON validation_executions (implementation_id, created_at);
CREATE INDEX IF NOT EXISTS validation_executions_operator_idx ON validation_executions (operator_id);
CREATE INDEX IF NOT EXISTS validation_executions_workspace_idx ON validation_executions (workspace);
CREATE INDEX IF NOT EXISTS validation_executions_running_idx ON validation_executions (execution_lifecycle, heartbeat_at)
  WHERE execution_lifecycle = 'RUNNING';
CREATE UNIQUE INDEX IF NOT EXISTS validation_executions_idem_uniq ON validation_executions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS validation_step_executions (
  step_execution_id text PRIMARY KEY,
  execution_id text NOT NULL REFERENCES validation_executions(execution_id),
  step_id text NOT NULL,
  step_order int NOT NULL,
  engine text NOT NULL,
  engine_version text,
  status text NOT NULL DEFAULT 'NOT_EVALUATED',
  reason_codes jsonb NOT NULL DEFAULT '[]',
  started_at timestamptz,
  completed_at timestamptz,
  retryable boolean,
  blocked_by jsonb NOT NULL DEFAULT '[]',
  input_set_sha256 text,
  output_sha256 text,
  receipt_reference text,
  evidence_references jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (execution_id, step_id));
CREATE INDEX IF NOT EXISTS validation_step_executions_exec_idx ON validation_step_executions (execution_id, step_order);

CREATE TABLE IF NOT EXISTS operation_receipts (
  receipt_id text PRIMARY KEY,
  execution_id text NOT NULL REFERENCES validation_executions(execution_id),
  step_id text NOT NULL,
  receipt jsonb NOT NULL,
  receipt_sha256 text NOT NULL,
  input_set_sha256 text,
  output_sha256 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (execution_id, step_id));
CREATE INDEX IF NOT EXISTS operation_receipts_exec_idx ON operation_receipts (execution_id);

CREATE TABLE IF NOT EXISTS journey_receipts (
  journey_receipt_id text PRIMARY KEY,
  execution_id text NOT NULL UNIQUE REFERENCES validation_executions(execution_id),
  receipt jsonb NOT NULL,
  receipt_sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS evidence_bundles (
  evidence_bundle_id text PRIMARY KEY,
  execution_id text NOT NULL REFERENCES validation_executions(execution_id),
  bundle jsonb NOT NULL,
  bundle_sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS evidence_bundles_exec_idx ON evidence_bundles (execution_id);

CREATE TABLE IF NOT EXISTS validation_artifact_observations (
  observation_id bigserial PRIMARY KEY,
  execution_id text NOT NULL REFERENCES validation_executions(execution_id),
  step_id text NOT NULL,
  artifact_role text NOT NULL,
  endpoint text,
  resolved_host text,
  content_sha256 text NOT NULL,
  http_status int,
  content_type text,
  observed_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS validation_artifact_observations_exec_idx ON validation_artifact_observations (execution_id, step_id);

-- Append-only immutability for sealed artefacts.
CREATE OR REPLACE FUNCTION banza_forbid_receipt_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append-only table %: % forbidden (ADR-076 D-076-08 immutable receipts)', TG_TABLE_NAME, TG_OP;
END $$;
DROP TRIGGER IF EXISTS operation_receipts_immutable ON operation_receipts;
CREATE TRIGGER operation_receipts_immutable BEFORE UPDATE OR DELETE ON operation_receipts
  FOR EACH ROW EXECUTE FUNCTION banza_forbid_receipt_mutation();
DROP TRIGGER IF EXISTS journey_receipts_immutable ON journey_receipts;
CREATE TRIGGER journey_receipts_immutable BEFORE UPDATE OR DELETE ON journey_receipts
  FOR EACH ROW EXECUTE FUNCTION banza_forbid_receipt_mutation();
DROP TRIGGER IF EXISTS evidence_bundles_immutable ON evidence_bundles;
CREATE TRIGGER evidence_bundles_immutable BEFORE UPDATE OR DELETE ON evidence_bundles
  FOR EACH ROW EXECUTE FUNCTION banza_forbid_receipt_mutation();
DROP TRIGGER IF EXISTS validation_artifact_observations_immutable ON validation_artifact_observations;
CREATE TRIGGER validation_artifact_observations_immutable BEFORE UPDATE OR DELETE ON validation_artifact_observations
  FOR EACH ROW EXECUTE FUNCTION banza_forbid_receipt_mutation();

-- Executions/steps: advance then freeze; identity immutable; no DELETE.
CREATE OR REPLACE FUNCTION banza_execution_freeze() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'validation_executions is not deletable (ADR-076 D-076-08)';
  END IF;
  IF NEW.execution_id <> OLD.execution_id OR NEW.operator_id <> OLD.operator_id
     OR NEW.implementation_id <> OLD.implementation_id OR NEW.created_at <> OLD.created_at
     OR COALESCE(NEW.snapshot_observed_at, 'epoch'::timestamptz) <> COALESCE(OLD.snapshot_observed_at, 'epoch'::timestamptz) THEN
    RAISE EXCEPTION 'validation_executions: identity/snapshot columns are immutable (ADR-076 D-076-08)';
  END IF;
  IF OLD.completed_at IS NOT NULL OR OLD.cancelled_at IS NOT NULL OR OLD.interrupted_at IS NOT NULL THEN
    RAISE EXCEPTION 'validation_executions: a completed/cancelled/interrupted run is frozen (ADR-076 D-076-08)';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validation_executions_freeze ON validation_executions;
CREATE TRIGGER validation_executions_freeze BEFORE UPDATE OR DELETE ON validation_executions
  FOR EACH ROW EXECUTE FUNCTION banza_execution_freeze();

CREATE OR REPLACE FUNCTION banza_step_execution_freeze() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'validation_step_executions is not deletable (ADR-076 D-076-08)';
  END IF;
  IF NEW.step_execution_id <> OLD.step_execution_id OR NEW.execution_id <> OLD.execution_id
     OR NEW.step_id <> OLD.step_id OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'validation_step_executions: identity columns are immutable (ADR-076 D-076-08)';
  END IF;
  IF OLD.completed_at IS NOT NULL AND OLD.status IN ('VERIFIED','PENDING','FAILED','BLOCKED') THEN
    RAISE EXCEPTION 'validation_step_executions: a sealed step is frozen (ADR-076 D-076-08)';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validation_step_executions_freeze ON validation_step_executions;
CREATE TRIGGER validation_step_executions_freeze BEFORE UPDATE OR DELETE ON validation_step_executions
  FOR EACH ROW EXECUTE FUNCTION banza_step_execution_freeze();

-- Grants (idempotent). Live orchestration: SELECT/INSERT/UPDATE (no DELETE). Sealed: SELECT/INSERT only.
GRANT SELECT, INSERT, UPDATE ON validation_executions, validation_step_executions TO banzai_rw;
GRANT SELECT, INSERT ON operation_receipts, journey_receipts, evidence_bundles,
                validation_artifact_observations TO banzai_rw;
GRANT USAGE, SELECT ON SEQUENCE validation_artifact_observations_observation_id_seq TO banzai_rw;

COMMIT;
