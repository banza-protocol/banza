// Onboarding data access (M2.19G.3, ADR-037). Thin, parameterised SQL over the six private onboarding
// tables. Every function takes a query function `q(text, params) -> {rows}` so it works both on the
// shared pool and inside a transaction (client.query). NOTHING here decides a verdict (that is Rust) and
// NOTHING here stores a plaintext code, token, key or PII beyond the contact email: only HMAC digests,
// opaque ids, states, timestamps and JSON receipts/blockers are persisted (ADR-013 boundary).

import crypto from "node:crypto";

const uuid = () => crypto.randomUUID();
const D = (ms) => new Date(Number(ms)); // epoch-ms -> timestamptz for pg
const ms = (date) => (date instanceof Date ? date.getTime() : date == null ? null : new Date(date).getTime());

// ── audit (append-only) ─────────────────────────────────────────────────────────────────────────────
export async function audit(q, { event, entityType, entityId = null, meta = {} }) {
  await q(
    `INSERT INTO onboarding_audit (event, entity_type, entity_id, meta) VALUES ($1,$2,$3,$4)`,
    [event, entityType, entityId, JSON.stringify(meta || {})]
  );
}

// ── email_challenges ────────────────────────────────────────────────────────────────────────────────
export async function insertEmailChallenge(q, { emailNormalized, purpose, otpHash, issuedAtMs, expiresAtMs, requestId }) {
  const id = uuid();
  await q(
    `INSERT INTO email_challenges (challenge_id, purpose, email_normalized, otp_hash, issued_at, expires_at, attempts)
     VALUES ($1,$2,$3,$4,$5,$6,0)`,
    [id, purpose, emailNormalized, otpHash, D(issuedAtMs), D(expiresAtMs)]
  );
  if (requestId) {
    await q(`UPDATE email_challenges SET request_id=$2 WHERE challenge_id=$1`, [id, requestId]);
  }
  return id;
}

export async function setChallengeProviderMessageId(q, challengeId, providerMessageId) {
  await q(`UPDATE email_challenges SET provider_message_id=$2 WHERE challenge_id=$1`, [challengeId, providerMessageId]);
}

export async function getEmailChallenge(q, challengeId) {
  const r = await q(`SELECT * FROM email_challenges WHERE challenge_id=$1`, [challengeId]);
  return r.rows[0] || null;
}

// Most recent challenge for an email+purpose (for the min-reissue window).
export async function lastEmailChallenge(q, emailNormalized, purpose) {
  const r = await q(
    `SELECT * FROM email_challenges WHERE email_normalized=$1 AND purpose=$2 ORDER BY issued_at DESC LIMIT 1`,
    [emailNormalized, purpose]
  );
  return r.rows[0] || null;
}

// Count + oldest issued_at within the rolling window (for the Rust rate-limit policy).
export async function countRecentChallenges(q, emailNormalized, sinceMs) {
  const r = await q(
    `SELECT count(*)::int AS n, min(issued_at) AS oldest FROM email_challenges
     WHERE email_normalized=$1 AND issued_at >= $2`,
    [emailNormalized, D(sinceMs)]
  );
  const row = r.rows[0] || {};
  return { count: Number(row.n || 0), oldestInWindowMs: row.oldest ? ms(row.oldest) : null };
}

export async function incrementChallengeAttempts(q, challengeId, newAttempts) {
  await q(`UPDATE email_challenges SET attempts=$2 WHERE challenge_id=$1`, [challengeId, newAttempts]);
}

export async function markChallengeVerified(q, challengeId, verifiedAtMs) {
  await q(`UPDATE email_challenges SET verified_at=$2 WHERE challenge_id=$1`, [challengeId, D(verifiedAtMs)]);
}

// Invalidate any still-open challenge for this email+purpose except the given id (single active code).
export async function invalidateOpenChallenges(q, emailNormalized, purpose, exceptId, atMs) {
  await q(
    `UPDATE email_challenges SET invalidated_at=$4
     WHERE email_normalized=$1 AND purpose=$2 AND challenge_id <> $3
       AND verified_at IS NULL AND invalidated_at IS NULL`,
    [emailNormalized, purpose, exceptId || "", D(atMs)]
  );
}

// ── candidate_sessions (opaque; only the hash is stored) ────────────────────────────────────────────
export async function insertSession(q, { sessionHash, emailNormalized, issuedAtMs, lastSeenMs, expiresAtMs }) {
  const id = uuid();
  await q(
    `INSERT INTO candidate_sessions (session_id, session_hash, email_normalized, issued_at, last_seen_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, sessionHash, emailNormalized, D(issuedAtMs), D(lastSeenMs), D(expiresAtMs)]
  );
  return id;
}

export async function getSessionByHash(q, sessionHash) {
  const r = await q(`SELECT * FROM candidate_sessions WHERE session_hash=$1`, [sessionHash]);
  return r.rows[0] || null;
}

export async function getSessionById(q, sessionId) {
  const r = await q(`SELECT * FROM candidate_sessions WHERE session_id=$1`, [sessionId]);
  return r.rows[0] || null;
}

export async function touchSession(q, sessionId, lastSeenMs) {
  await q(`UPDATE candidate_sessions SET last_seen_at=$2 WHERE session_id=$1`, [sessionId, D(lastSeenMs)]);
}

export async function revokeSession(q, sessionId, revokedAtMs) {
  await q(`UPDATE candidate_sessions SET revoked_at=$2 WHERE session_id=$1`, [sessionId, D(revokedAtMs)]);
}

// ── candidates ──────────────────────────────────────────────────────────────────────────────────────
export async function insertCandidate(q, { ownerEmail, operatorName, institutionalName, state, nowMs }) {
  const id = uuid();
  await q(
    `INSERT INTO candidates (candidate_id, owner_email, operator_name, institutional_name, state, created_at, updated_at, last_activity_at)
     VALUES ($1,$2,$3,$4,$5,$6,$6,$6)`,
    [id, ownerEmail, operatorName, institutionalName || null, state, D(nowMs)]
  );
  return id;
}

export async function getCandidate(q, candidateId) {
  const r = await q(`SELECT * FROM candidates WHERE candidate_id=$1`, [candidateId]);
  return r.rows[0] || null;
}

export async function listCandidatesByOwner(q, ownerEmail) {
  const r = await q(
    `SELECT * FROM candidates WHERE owner_email=$1 ORDER BY last_activity_at DESC`,
    [ownerEmail]
  );
  return r.rows;
}

export async function updateCandidateState(q, candidateId, state, nowMs) {
  await q(
    `UPDATE candidates SET state=$2, updated_at=$3, last_activity_at=$3 WHERE candidate_id=$1`,
    [candidateId, state, D(nowMs)]
  );
}

export async function setCandidatePublished(q, candidateId, publishedOperatorId, nowMs) {
  await q(
    `UPDATE candidates SET published_operator_id=$2, state='PUBLISHED', updated_at=$3, last_activity_at=$3 WHERE candidate_id=$1`,
    [candidateId, publishedOperatorId, D(nowMs)]
  );
}

// ── candidate_implementations ───────────────────────────────────────────────────────────────────────
export async function insertImplementation(q, { candidateId, implementationName, description, expectedProtocolVersion, expectedProfile, expectedEnvironment, canonicalDomain, nowMs }) {
  const id = uuid();
  await q(
    `INSERT INTO candidate_implementations
       (candidate_implementation_id, candidate_id, implementation_name, description,
        expected_protocol_version, expected_profile, expected_environment, canonical_domain, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,
    [id, candidateId, implementationName, description || null, expectedProtocolVersion || null,
     expectedProfile || null, expectedEnvironment || null, canonicalDomain, D(nowMs)]
  );
  return id;
}

export async function getImplementation(q, implementationId) {
  const r = await q(`SELECT * FROM candidate_implementations WHERE candidate_implementation_id=$1`, [implementationId]);
  return r.rows[0] || null;
}

export async function listImplementations(q, candidateId) {
  const r = await q(
    `SELECT * FROM candidate_implementations WHERE candidate_id=$1 ORDER BY created_at ASC`,
    [candidateId]
  );
  return r.rows;
}

// M2.19G.3A — bind a candidate implementation to an EXISTING closed-registry implementation id
// (reconciliation). Writes published_implementation_id (mirror of setCandidatePublished for the operator).
export async function setImplementationPublished(q, implementationId, publishedImplementationId, nowMs) {
  await q(
    `UPDATE candidate_implementations SET published_implementation_id=$2, updated_at=$3 WHERE candidate_implementation_id=$1`,
    [implementationId, publishedImplementationId, D(nowMs)]
  );
}

export async function setImplementationOriginState(q, implementationId, originState, nowMs) {
  await q(
    `UPDATE candidate_implementations SET origin_verification_state=$2, updated_at=$3 WHERE candidate_implementation_id=$1`,
    [implementationId, originState, D(nowMs)]
  );
}

export async function updateImplementationValidation(q, implementationId, { validationState, receipts, blockers, nowMs }) {
  await q(
    `UPDATE candidate_implementations
       SET validation_state=$2, receipts=$3, blockers=$4, updated_at=$5
     WHERE candidate_implementation_id=$1`,
    [implementationId, validationState, JSON.stringify(receipts || []), JSON.stringify(blockers || []), D(nowMs)]
  );
}

// ── origin_challenges ─────────────────────────────────────────────────────────────────────────────────
export async function insertOriginChallenge(q, { challengeId, implementationId, domain, challengeHash, issuedAtMs, expiresAtMs }) {
  await q(
    `INSERT INTO origin_challenges (challenge_id, candidate_implementation_id, domain, challenge_hash, issued_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [challengeId, implementationId, domain, challengeHash, D(issuedAtMs), D(expiresAtMs)]
  );
  return challengeId;
}

export async function latestOriginChallenge(q, implementationId) {
  const r = await q(
    `SELECT * FROM origin_challenges WHERE candidate_implementation_id=$1 ORDER BY issued_at DESC LIMIT 1`,
    [implementationId]
  );
  return r.rows[0] || null;
}

export async function updateOriginChallengeResult(q, challengeId, { result, reasonCode, receiptRef, verifiedAtMs }) {
  await q(
    `UPDATE origin_challenges SET result=$2, reason_code=$3, receipt_ref=$4, verified_at=$5 WHERE challenge_id=$1`,
    [challengeId, result, reasonCode || null, receiptRef || null, verifiedAtMs ? D(verifiedAtMs) : null]
  );
}

// M2.19G.3A — mark a challenge consumed on a positive verify (single-use). Only sets consumed_at if not
// already set, so the first positive verify wins and re-verify is refused by the engine thereafter.
export async function markOriginChallengeConsumed(q, challengeId, consumedAtMs) {
  await q(
    `UPDATE origin_challenges SET consumed_at=$2 WHERE challenge_id=$1 AND consumed_at IS NULL`,
    [challengeId, D(consumedAtMs)]
  );
}

// M2.19G.3A — count active vs consumed origin challenges for an implementation (metrics/guards). Active =
// never verified/consumed and not expired; consumed = consumed_at set.
export async function originChallengeCounts(q, implementationId, nowMs) {
  const r = await q(
    `SELECT
       count(*) FILTER (WHERE consumed_at IS NULL AND result IS NULL AND expires_at > $2)::int AS active,
       count(*) FILTER (WHERE consumed_at IS NOT NULL)::int AS consumed
     FROM origin_challenges WHERE candidate_implementation_id=$1`,
    [implementationId, D(nowMs)]
  );
  const row = r.rows[0] || {};
  return { active: Number(row.active || 0), consumed: Number(row.consumed || 0) };
}

export { ms as toMs };
