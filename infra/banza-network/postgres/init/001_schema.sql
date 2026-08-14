-- BANZA protocol database — schema + segregated roles.
-- Runs once on first Postgres init (docker-entrypoint-initdb.d).
-- Contains ONLY public protocol artifacts (signed), BanzAI doc index, and audit.
-- NO wallet/ledger/balance/account/KYC. NO private keys. NO operator business data.
\connect banza_protocol

CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector (BanzAI RAG)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────── Trust (signed OFFLINE; DB stores public blobs only) ──
CREATE TABLE root_manifest (
  id bigserial PRIMARY KEY, version int NOT NULL, root_key_id text NOT NULL,
  published_at timestamptz NOT NULL, expires_at timestamptz,
  signature text NOT NULL, raw jsonb NOT NULL, is_current boolean NOT NULL DEFAULT false);

CREATE TABLE key_manifest (
  id bigserial PRIMARY KEY, version int NOT NULL, root_key_id text NOT NULL,
  issuer_keys jsonb NOT NULL,               -- PUBLIC issuer keys only (cert/BRL/evidence)
  published_at timestamptz NOT NULL, expires_at timestamptz,
  manifest_signature text NOT NULL, raw jsonb NOT NULL, is_current boolean NOT NULL DEFAULT false);

-- ─────────────────────────── Operator registry (public index) ────────────────────
-- A verifiable INDEX of operator metadata + the self-published evidence each operator
-- points to. BANZA issues nothing to operators (ADR-027): no certificate, no granted
-- level. Listing grants nothing; absence forbids nothing. Conformance scope is read
-- from an operator's published evidence, never stored here as a granted status.
CREATE TABLE operators (
  operator_id text PRIMARY KEY, operator_name text NOT NULL, operator_url text,
  status text NOT NULL DEFAULT 'none'
    CHECK (status IN ('none','active','expired','suspended','revoked')),
  first_seen timestamptz, last_verified timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}');
-- SEED: EMPTY. No operator has published evidence in pre-production. (Operador A/B/C live only in docs.)

-- ─────────────────────────── BRL / revocation list (signed) ───────────────────────
-- Revocation is a cryptographic security signal over KEYS and ARTIFACTS, never an
-- entity-level status (ADR-027/040). An entry names the revoked material via revoked_ref
-- (a delegated key id, release/artifact id, or operator key-material id).
CREATE TABLE brl_snapshot (
  id bigserial PRIMARY KEY, list_version int NOT NULL, issuer_key_id text NOT NULL,
  issued_at timestamptz NOT NULL, next_update timestamptz,
  signature text NOT NULL, raw jsonb NOT NULL, is_current boolean NOT NULL DEFAULT false);
CREATE TABLE brl_entry (
  id bigserial PRIMARY KEY, list_version int NOT NULL, operator_id text,
  revoked_ref text, reason text, revoked_at timestamptz NOT NULL);

-- ─────────────────────────── Conformance evidence (HASHES only) ──────────────────
CREATE TABLE conformance_evidence (
  evidence_id text PRIMARY KEY, operator_id text, level_attempted int NOT NULL,
  suite_version text NOT NULL, report_sha256 text NOT NULL, produced_at timestamptz NOT NULL,
  source_url text, result text NOT NULL DEFAULT 'evidence' CHECK (result IN ('evidence')),
  metadata jsonb NOT NULL DEFAULT '{}');

-- ─────────────────────────── Protocol audit ──────────────────────────────────────
CREATE TABLE protocol_audit (
  id bigserial PRIMARY KEY, actor text NOT NULL, action text NOT NULL,
  entity_type text NOT NULL, entity_id text, rationale text, diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now());

-- ─────────────────────────── BanzAI RAG index ────────────────────────────────────
CREATE TABLE banzai_document (
  doc_id text PRIMARY KEY, source text NOT NULL, path text NOT NULL, version text,
  title text, sha256 text NOT NULL, indexed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE banzai_chunk (
  chunk_id bigserial PRIMARY KEY, doc_id text NOT NULL REFERENCES banzai_document(doc_id),
  ordinal int NOT NULL, heading text, text text NOT NULL, token_count int,
  embedding vector(1024));
CREATE INDEX banzai_chunk_embedding_idx ON banzai_chunk USING hnsw (embedding vector_cosine_ops);

-- ─────────────────────────── BanzAI answer cache (cost control) ──────────────────
-- Durable store for the BanzAI exact/semantic answer cache: cached answers keyed on
-- normalized question + provider + lang + mode + corpus hash (sources_hash), with a
-- pgvector embedding for semantic near-duplicate lookup. A corpus change (new
-- sources_hash) invalidates every prior row. Questions/answers/source ids ONLY —
-- never secrets, keys or user identifiers.
CREATE TABLE banzai_answer_cache (
  cache_id bigserial PRIMARY KEY,
  question_normalized text NOT NULL,
  question_embedding vector(1024),
  provider text NOT NULL, lang text NOT NULL, mode text NOT NULL,
  sources_hash text NOT NULL,
  answer text NOT NULL, sources jsonb NOT NULL DEFAULT '[]',
  hits int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), last_hit_at timestamptz);
CREATE UNIQUE INDEX banzai_answer_cache_exact_idx
  ON banzai_answer_cache (sources_hash, provider, lang, mode, question_normalized);
CREATE INDEX banzai_answer_cache_embedding_idx
  ON banzai_answer_cache USING hnsw (question_embedding vector_cosine_ops);

-- ─────────────────────────── Pre-production marker ───────────────────────────────
CREATE TABLE protocol_state (k text PRIMARY KEY, v jsonb NOT NULL);
INSERT INTO protocol_state(k,v) VALUES
  ('phase', '"pre-production"'),
  ('note', '"Um PASS de conformance é evidência técnica verificável, não uma certificação nem um estatuto concedido. A BANZA não emite certificados a operadores (modelo de confiança aberto, ADR-027): a participação demonstra-se por evidência publicada, não é concedida por uma autoridade central. Nenhum operador publicou evidência de produção neste ambiente."');

-- ─────────────────────────── Operator onboarding (M2.19G.3, ADR-040) ──────────────
-- BanzAI-HOSTED onboarding: private candidacies + passwordless email OTP + .well-known origin proof.
-- HASHES / opaque ids ONLY — no plaintext OTP, no session secret, no keys, no PII beyond a contact
-- email. A candidate is NOT a published/production operator (that is the public `operators` table +
-- the closed Technical Registry). Onboarding is a hosted service, never a protocol rule (ADR-040).
CREATE TABLE email_challenges (
  challenge_id text PRIMARY KEY,
  purpose text NOT NULL,
  email_normalized text NOT NULL,
  otp_hash text NOT NULL,                    -- HMAC-SHA256 digest; the OTP itself is never stored
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  verified_at timestamptz,
  invalidated_at timestamptz,
  provider_message_id text,
  request_id text);
CREATE INDEX email_challenges_email_idx ON email_challenges (email_normalized, issued_at);

CREATE TABLE candidate_sessions (
  session_id text PRIMARY KEY,
  session_hash text NOT NULL,                -- HMAC-SHA256 of the opaque cookie value (value never stored)
  email_normalized text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz);
CREATE INDEX candidate_sessions_email_idx ON candidate_sessions (email_normalized);

CREATE TABLE candidates (
  candidate_id text PRIMARY KEY,
  owner_email text NOT NULL,
  operator_name text NOT NULL,
  institutional_name text,
  state text NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  published_operator_id text);           -- set only if/when the Technical Registry publishes it
CREATE INDEX candidates_owner_idx ON candidates (owner_email);

CREATE TABLE candidate_implementations (
  candidate_implementation_id text PRIMARY KEY,
  candidate_id text NOT NULL REFERENCES candidates(candidate_id),
  implementation_name text NOT NULL,
  description text,
  expected_protocol_version text,
  expected_profile text,
  expected_environment text,
  canonical_domain text NOT NULL,
  origin_verification_state text NOT NULL DEFAULT 'ORIGIN_PENDING',
  validation_state text NOT NULL DEFAULT 'DRAFT',
  receipts jsonb NOT NULL DEFAULT '[]',
  blockers jsonb NOT NULL DEFAULT '[]',
  published_implementation_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX candidate_implementations_candidate_idx ON candidate_implementations (candidate_id);

CREATE TABLE origin_challenges (
  challenge_id text PRIMARY KEY,
  candidate_implementation_id text NOT NULL REFERENCES candidate_implementations(candidate_implementation_id),
  domain text NOT NULL,
  challenge_hash text NOT NULL,              -- HMAC-SHA256 of the nonce (nonce lives only in the operator's published doc)
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  result text,
  reason_code text,
  receipt_ref text,
  consumed_at timestamptz);                    -- M2.19G.3A: set on a positive verify; a consumed challenge is single-use (never re-verifies)
CREATE INDEX origin_challenges_impl_idx ON origin_challenges (candidate_implementation_id);

CREATE TABLE onboarding_audit (
  id bigserial PRIMARY KEY,
  event text NOT NULL, entity_type text NOT NULL, entity_id text,
  meta jsonb NOT NULL DEFAULT '{}',          -- append-only; NO otp/session/secret/PII
  created_at timestamptz NOT NULL DEFAULT now());

-- ─────────── Durable validation-journey receipt store (ADR-042 §D-076-08) ────────────
-- The durable, append-only, verifiable archive of the endpoint-originated nine-step validation
-- journey. It PRESERVES what the Rust engines already decided; it NEVER recomputes, edits or
-- replaces a verdict, and it is not a normative source. It stores NO funds/values, NO end-user
-- personal data, NO secrets, and NO free model text (the receipts are Rust-decided artefacts).
-- Operador Zero uses these SAME tables with NO privileged path. "executions" here means journey
-- runs, never financial movements.

-- One journey run. Orchestration header: advances NOT_EVALUATED→RUNNING→terminal, then frozen.
CREATE TABLE validation_executions (
  execution_id text PRIMARY KEY,
  operator_id text NOT NULL,
  implementation_id text NOT NULL,
  protocol_version text,
  profile text,
  environment text,
  snapshot_observed_at timestamptz,
  overall_status text NOT NULL DEFAULT 'NOT_EVALUATED',       -- 6-state model (ADR-042 §D-076-04)
  certification_readiness text,                               -- READY | BLOCKED | null
  certification_status text NOT NULL DEFAULT 'NOT_CERTIFIED', -- always NOT_CERTIFIED (readiness is not a certificate)
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  orchestrator_version text,
  started_by text,                                            -- authenticated owner_email, or 'public' for public-artefact runs
  workspace text,                                             -- isolation key
  previous_execution_id text REFERENCES validation_executions(execution_id),  -- retry lineage (new row, never rewrite)
  reproduction_of text REFERENCES validation_executions(execution_id),        -- reproduction lineage
  reproduction_result text,                                   -- OBSERVED_INPUTS_CHANGED | ORIGINAL_INPUTS_UNAVAILABLE | ENGINE_VERSION_UNAVAILABLE | REPRODUCTION_BLOCKED | SEMANTICALLY_EQUIVALENT | NOT_EQUIVALENT
  journey_receipt_sha256 text,
  -- Operational state (mutable while RUNNING; ADR-042 §D-076-08 crash-recovery/locking/idempotency).
  execution_lifecycle text NOT NULL DEFAULT 'RUNNING',       -- RUNNING | COMPLETED | CANCELLED | INTERRUPTED | EXPIRED
  heartbeat_at timestamptz,
  lock_owner text,
  cancellation_requested boolean NOT NULL DEFAULT false,
  timeout_at timestamptz,
  attempt_number int NOT NULL DEFAULT 1,
  idempotency_key text,
  interrupted_at timestamptz,
  -- Telemetry precision (BZO-9, ADR-042): execution-kind classification + monotonic µs duration.
  execution_kind text,                                        -- USER_REQUESTED | SYSTEM_E2E | BENCHMARK | null (unclassified)
  trigger_source text,                                        -- what initiated the run (ui|api|campaign|…), context only
  measurement_campaign_id text,                               -- instrumentation-campaign id when kind=SYSTEM_E2E/BENCHMARK
  initiated_by text,                                           -- actor label (never PII), context only
  duration_us bigint,                                         -- monotonic journey duration (µs); NULL → fall back to wall-clock
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX validation_executions_impl_idx ON validation_executions (implementation_id, created_at);
CREATE INDEX validation_executions_operator_idx ON validation_executions (operator_id);
CREATE INDEX validation_executions_workspace_idx ON validation_executions (workspace);
CREATE INDEX validation_executions_running_idx ON validation_executions (execution_lifecycle, heartbeat_at)
  WHERE execution_lifecycle = 'RUNNING';                     -- stale-run (crash) detection
CREATE UNIQUE INDEX validation_executions_idem_uniq ON validation_executions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;                          -- idempotent double-submit protection

-- Per-step live row. Advances to a terminal 6-state status, then frozen.
CREATE TABLE validation_step_executions (
  step_execution_id text PRIMARY KEY,
  execution_id text NOT NULL REFERENCES validation_executions(execution_id),
  step_id text NOT NULL,               -- discovery|manifest|keys|conformance|interoperability|trust|federation|evidence|certification
  step_order int NOT NULL,             -- 1..9
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
  receipt_reference text,              -- operation_receipts.receipt_id
  evidence_references jsonb NOT NULL DEFAULT '[]',
  duration_us bigint,                  -- monotonic step duration (µs) (BZO-9); NULL → fall back to wall-clock
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (execution_id, step_id));
CREATE INDEX validation_step_executions_exec_idx ON validation_step_executions (execution_id, step_order);

-- Sealed per-step receipt (append-only). The canonical OperationReceipt + its verified digest.
CREATE TABLE operation_receipts (
  receipt_id text PRIMARY KEY,
  execution_id text NOT NULL REFERENCES validation_executions(execution_id),
  step_id text NOT NULL,
  receipt jsonb NOT NULL,              -- canonical OperationReceipt (operation-receipt.production schema)
  receipt_sha256 text NOT NULL,        -- canonical-JSON digest; recomputed and verified on read
  input_set_sha256 text,
  output_sha256 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (execution_id, step_id));
CREATE INDEX operation_receipts_exec_idx ON operation_receipts (execution_id);

-- Sealed aggregate receipt (append-only). One per execution.
CREATE TABLE journey_receipts (
  journey_receipt_id text PRIMARY KEY,
  execution_id text NOT NULL UNIQUE REFERENCES validation_executions(execution_id),
  receipt jsonb NOT NULL,              -- canonical JourneyReceipt
  receipt_sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now());

-- Content-addressed evidence bundle (append-only, immutable).
CREATE TABLE evidence_bundles (
  evidence_bundle_id text PRIMARY KEY, -- content-addressed 'sha256:...'
  execution_id text NOT NULL REFERENCES validation_executions(execution_id),
  bundle jsonb NOT NULL,
  bundle_sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX evidence_bundles_exec_idx ON evidence_bundles (execution_id);

-- Immutable record of each artefact observed (endpoint + content digest), for reproduction.
CREATE TABLE validation_artifact_observations (
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
CREATE INDEX validation_artifact_observations_exec_idx ON validation_artifact_observations (execution_id, step_id);

-- Immutability-preserving execution-kind attestation (BZO-9, ADR-042): records the kind of an ALREADY-FROZEN
-- execution row without ever UPDATE-ing it (that would trip banza_execution_freeze). Append-only; one per run.
CREATE TABLE validation_execution_kind_attestations (
  attestation_id bigserial PRIMARY KEY,
  execution_id text NOT NULL REFERENCES validation_executions(execution_id),
  execution_kind text NOT NULL,        -- USER_REQUESTED | SYSTEM_E2E | BENCHMARK | UNCLASSIFIED
  measurement_campaign_id text,
  evidence text,
  attested_by text,
  attested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (execution_id));
CREATE INDEX validation_execution_kind_attestations_exec_idx ON validation_execution_kind_attestations (execution_id);

-- DB-enforced append-only immutability for the sealed artefacts (ADR-042 §D-076-08): no UPDATE, no DELETE.
CREATE OR REPLACE FUNCTION banza_forbid_receipt_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append-only table %: % forbidden (ADR-042 D-076-08 immutable receipts)', TG_TABLE_NAME, TG_OP;
END $$;
CREATE TRIGGER operation_receipts_immutable BEFORE UPDATE OR DELETE ON operation_receipts
  FOR EACH ROW EXECUTE FUNCTION banza_forbid_receipt_mutation();
CREATE TRIGGER journey_receipts_immutable BEFORE UPDATE OR DELETE ON journey_receipts
  FOR EACH ROW EXECUTE FUNCTION banza_forbid_receipt_mutation();
CREATE TRIGGER evidence_bundles_immutable BEFORE UPDATE OR DELETE ON evidence_bundles
  FOR EACH ROW EXECUTE FUNCTION banza_forbid_receipt_mutation();
CREATE TRIGGER validation_artifact_observations_immutable BEFORE UPDATE OR DELETE ON validation_artifact_observations
  FOR EACH ROW EXECUTE FUNCTION banza_forbid_receipt_mutation();
CREATE TRIGGER validation_execution_kind_attestations_immutable BEFORE UPDATE OR DELETE ON validation_execution_kind_attestations
  FOR EACH ROW EXECUTE FUNCTION banza_forbid_receipt_mutation();

-- Executions/steps may advance to a terminal state, then freeze; identity columns immutable; no DELETE; no id reuse.
CREATE OR REPLACE FUNCTION banza_execution_freeze() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'validation_executions is not deletable (ADR-042 D-076-08)';
  END IF;
  IF NEW.execution_id <> OLD.execution_id OR NEW.operator_id <> OLD.operator_id
     OR NEW.implementation_id <> OLD.implementation_id OR NEW.created_at <> OLD.created_at
     OR COALESCE(NEW.snapshot_observed_at, 'epoch'::timestamptz) <> COALESCE(OLD.snapshot_observed_at, 'epoch'::timestamptz) THEN
    RAISE EXCEPTION 'validation_executions: identity/snapshot columns are immutable (ADR-042 D-076-08)';
  END IF;
  IF OLD.completed_at IS NOT NULL OR OLD.cancelled_at IS NOT NULL OR OLD.interrupted_at IS NOT NULL THEN
    RAISE EXCEPTION 'validation_executions: a completed/cancelled/interrupted run is frozen (ADR-042 D-076-08)';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validation_executions_freeze BEFORE UPDATE OR DELETE ON validation_executions
  FOR EACH ROW EXECUTE FUNCTION banza_execution_freeze();

CREATE OR REPLACE FUNCTION banza_step_execution_freeze() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'validation_step_executions is not deletable (ADR-042 D-076-08)';
  END IF;
  IF NEW.step_execution_id <> OLD.step_execution_id OR NEW.execution_id <> OLD.execution_id
     OR NEW.step_id <> OLD.step_id OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'validation_step_executions: identity columns are immutable (ADR-042 D-076-08)';
  END IF;
  IF OLD.completed_at IS NOT NULL AND OLD.status IN ('VERIFIED','PENDING','FAILED','BLOCKED') THEN
    RAISE EXCEPTION 'validation_step_executions: a sealed step is frozen (ADR-042 D-076-08)';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validation_step_executions_freeze BEFORE UPDATE OR DELETE ON validation_step_executions
  FOR EACH ROW EXECUTE FUNCTION banza_step_execution_freeze();

-- ─────────────────────────── Segregated roles ────────────────────────────────────
-- Passwords injected at deploy from .env (ALTER ROLE ... PASSWORD) — placeholders here.
CREATE ROLE banza_ro   LOGIN;   -- verification-api: read public artifacts
CREATE ROLE banza_gov  LOGIN;   -- governance: write trust/registry (restricted, audited)
CREATE ROLE banzai_rw  LOGIN;   -- BanzAI indexer/api: RW only on the doc index

GRANT CONNECT ON DATABASE banza_protocol TO banza_ro, banza_gov, banzai_rw;
GRANT USAGE ON SCHEMA public TO banza_ro, banza_gov, banzai_rw;

-- read-only over public artifacts (serving routes)
GRANT SELECT ON root_manifest, key_manifest, operators,
                brl_snapshot, brl_entry, conformance_evidence, protocol_state TO banza_ro;

-- governance can write trust/registry (never keys — none stored)
GRANT SELECT, INSERT, UPDATE ON root_manifest, key_manifest, operators,
                brl_snapshot, brl_entry, conformance_evidence, protocol_audit TO banza_gov;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO banza_gov;

-- BanzAI can ONLY touch the doc index (read protocol artifacts to explain, never write them)
GRANT SELECT ON operators, brl_snapshot, conformance_evidence,
                root_manifest, key_manifest, protocol_state TO banzai_rw;   -- read to explain
GRANT SELECT, INSERT, UPDATE, DELETE ON banzai_document, banzai_chunk, banzai_answer_cache TO banzai_rw;
GRANT USAGE, SELECT ON SEQUENCE banzai_chunk_chunk_id_seq, banzai_answer_cache_cache_id_seq TO banzai_rw;

-- BanzAI owns the private onboarding tables (candidate registry, OTP challenges, sessions) — RW.
GRANT SELECT, INSERT, UPDATE, DELETE ON email_challenges, candidate_sessions, candidates,
                candidate_implementations, origin_challenges, onboarding_audit TO banzai_rw;
GRANT USAGE, SELECT ON SEQUENCE onboarding_audit_id_seq TO banzai_rw;

-- BanzAI owns the validation-journey receipt store (ADR-042). Live orchestration rows advance then
-- freeze (SELECT/INSERT/UPDATE, NO DELETE); the sealed artefacts are append-only (SELECT/INSERT only —
-- no UPDATE/DELETE grant; the DB triggers above are the belt-and-suspenders enforcement).
GRANT SELECT, INSERT, UPDATE ON validation_executions, validation_step_executions TO banzai_rw;
GRANT SELECT, INSERT ON operation_receipts, journey_receipts, evidence_bundles,
                validation_artifact_observations TO banzai_rw;
GRANT USAGE, SELECT ON SEQUENCE validation_artifact_observations_observation_id_seq TO banzai_rw;
-- Execution-kind attestation side table (BZO-9): append-only (SELECT/INSERT), plus its sequence.
GRANT SELECT, INSERT ON validation_execution_kind_attestations TO banzai_rw;
GRANT USAGE, SELECT ON SEQUENCE validation_execution_kind_attestations_attestation_id_seq TO banzai_rw;

-- NOTE: run 002_roles.sql (generated at deploy from .env) to set role passwords:
--   ALTER ROLE banza_ro  PASSWORD '...'; ALTER ROLE banza_gov PASSWORD '...'; ALTER ROLE banzai_rw PASSWORD '...';
