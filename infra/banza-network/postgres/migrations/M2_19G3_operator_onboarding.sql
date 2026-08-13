-- M2.19G.3 (ADR-040) — operator onboarding tables (private candidate registry, email-OTP challenges,
-- sessions, .well-known origin challenges, audit). Idempotent; safe to re-run. Mirrors the canonical
-- init/001_schema.sql for EXISTING databases (the init file only runs on an empty volume).
--
-- Apply on deploy (existing DB), from /srv/banza-protocol:
--   docker compose exec -T postgres psql -U banza_admin -d banza_protocol -f /migrations/M2_19G3_operator_onboarding.sql
--
-- HASHES / opaque ids ONLY — no plaintext OTP, no session secret, no keys, no PII beyond a contact
-- email (ADR-026 boundary; postgres-data-boundary-check). Onboarding is a hosted service, not a
-- protocol rule (ADR-040).

\connect banza_protocol

CREATE TABLE IF NOT EXISTS email_challenges (
  challenge_id text PRIMARY KEY,
  purpose text NOT NULL,
  email_normalized text NOT NULL,
  otp_hash text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  verified_at timestamptz,
  invalidated_at timestamptz,
  provider_message_id text,
  request_id text);
CREATE INDEX IF NOT EXISTS email_challenges_email_idx ON email_challenges (email_normalized, issued_at);

CREATE TABLE IF NOT EXISTS candidate_sessions (
  session_id text PRIMARY KEY,
  session_hash text NOT NULL,
  email_normalized text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz);
CREATE INDEX IF NOT EXISTS candidate_sessions_email_idx ON candidate_sessions (email_normalized);

CREATE TABLE IF NOT EXISTS candidates (
  candidate_id text PRIMARY KEY,
  owner_email text NOT NULL,
  operator_name text NOT NULL,
  institutional_name text,
  state text NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  published_operator_id text);
CREATE INDEX IF NOT EXISTS candidates_owner_idx ON candidates (owner_email);

CREATE TABLE IF NOT EXISTS candidate_implementations (
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
CREATE INDEX IF NOT EXISTS candidate_implementations_candidate_idx ON candidate_implementations (candidate_id);

CREATE TABLE IF NOT EXISTS origin_challenges (
  challenge_id text PRIMARY KEY,
  candidate_implementation_id text NOT NULL REFERENCES candidate_implementations(candidate_implementation_id),
  domain text NOT NULL,
  challenge_hash text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  result text,
  reason_code text,
  receipt_ref text);
CREATE INDEX IF NOT EXISTS origin_challenges_impl_idx ON origin_challenges (candidate_implementation_id);

CREATE TABLE IF NOT EXISTS onboarding_audit (
  id bigserial PRIMARY KEY,
  event text NOT NULL, entity_type text NOT NULL, entity_id text,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now());

-- Grants (idempotent). banzai_rw owns the private onboarding tables RW.
GRANT SELECT, INSERT, UPDATE, DELETE ON email_challenges, candidate_sessions, candidates,
                candidate_implementations, origin_challenges, onboarding_audit TO banzai_rw;
GRANT USAGE, SELECT ON SEQUENCE onboarding_audit_id_seq TO banzai_rw;
