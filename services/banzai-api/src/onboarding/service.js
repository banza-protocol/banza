// Onboarding orchestration (M2.19G.3, ADR-037). The composition root that turns HTTP intents into
// Rust decisions + Postgres writes + one email + one secure fetch. It holds NO crypto of its own: every
// verdict comes from the `engine` (Rust/WASM), every persisted value is a hash / opaque id / state /
// receipt (never a plaintext code, token, key or PII beyond the contact email), the only email goes
// through the injected `email` provider, and the only outbound fetch goes through the injected secure
// Rust fetcher (`banza-fetcher`) — never a caller URL.
//
// The architecture, stated plainly (ADR-037): the email authenticates the person; the domain confirms
// the origin; the endpoints supply the artifacts; Rust verifies; the receipts fix the results; the
// Technical Registry publishes the verifiable state — without closing the protocol.

import * as store from "./store.js";
import { WELL_KNOWN_PATH } from "./constants.js";

const PURPOSE = "onboarding";

// A public-safe candidate view (no internal ids beyond the candidate/impl ids the UI needs, no email
// beyond the owner's own, no digests). Implementations carry their origin + validation state only.
function candidateView(candidate, implementations = []) {
  return {
    candidate_id: candidate.candidate_id,
    operator_name: candidate.operator_name,
    institutional_name: candidate.institutional_name || null,
    state: candidate.state,
    created_at: candidate.created_at,
    last_activity_at: candidate.last_activity_at,
    published_operator_id: candidate.published_operator_id || null,
    implementations: implementations.map((i) => ({
      candidate_implementation_id: i.candidate_implementation_id,
      implementation_name: i.implementation_name,
      canonical_domain: i.canonical_domain,
      // M2.19G.3B — each implementation declares its own protocol version / profile / environment
      // (validated on write against the canonical Rust registry option sets), surfaced for display.
      expected_protocol_version: i.expected_protocol_version || null,
      expected_profile: i.expected_profile || null,
      expected_environment: i.expected_environment || null,
      origin_verification_state: i.origin_verification_state,
      validation_state: i.validation_state,
    })),
  };
}

export function createOnboardingService({ cfg, db, engine, email, fetcher }) {
  const q = (text, params) => db.query(text, params);

  // ── OTP request ───────────────────────────────────────────────────────────────────────────────────
  async function requestOtp({ email: rawEmail }) {
    const emailNorm = rawEmail; // routes already normalise; kept explicit
    // Rate limit per email over the rolling window — Rust decides from the DB count.
    const since = Date.now() - cfg.rate.otpPerEmailWindowMs;
    const { count, oldestInWindowMs } = await store.countRecentChallenges(q, emailNorm, since);
    const rl = engine.ratelimitDecide({
      windowMs: cfg.rate.otpPerEmailWindowMs,
      max: cfg.rate.otpPerEmailMax,
      countInWindow: count,
      oldestInWindowMs,
    });
    if (!rl.allow) return { ok: false, reason: "rate_limited", retry_after_ms: rl.retry_after_ms };

    // Min-reissue window (Rust enforces, given the last issued_at).
    const last = await store.lastEmailChallenge(q, emailNorm, PURPOSE);
    const issued = engine.otpIssue({
      pepper: cfg.pepper,
      email: emailNorm,
      purpose: PURPOSE,
      ttlMs: cfg.ttl.otpMs,
      minReissueMs: cfg.ttl.otpMinReissueMs,
      lastIssuedAtMs: last ? store.toMs(last.issued_at) : undefined,
    });
    if (!issued.ok) return { ok: false, reason: issued.reason, retry_after_ms: issued.retry_after_ms };

    const challengeId = await store.insertEmailChallenge(q, {
      emailNormalized: emailNorm,
      purpose: PURPOSE,
      otpHash: issued.otp_hash,
      issuedAtMs: issued.issued_at_ms,
      expiresAtMs: issued.expires_at_ms,
    });
    // Only the newest code is valid: invalidate any earlier open challenge for this email+purpose.
    await store.invalidateOpenChallenges(q, emailNorm, PURPOSE, challengeId, Date.now());

    // Deliver the code (the ONLY place a plaintext code exists outside this call frame). If delivery
    // fails, invalidate the challenge and report a soft error so the user can retry.
    const minutes = Math.round(cfg.ttl.otpMs / 60000);
    const delivery = await email.send({ to: emailNorm, code: issued.code, minutes });
    if (!delivery.ok) {
      await store.invalidateOpenChallenges(q, emailNorm, PURPOSE, "", Date.now());
      await store.audit(q, { event: "otp_delivery_failed", entityType: "email_challenge", entityId: challengeId, meta: { error: delivery.error } });
      return { ok: false, reason: "email_delivery_failed" };
    }
    if (delivery.messageId) await store.setChallengeProviderMessageId(q, challengeId, String(delivery.messageId));
    await store.audit(q, { event: "otp_requested", entityType: "email_challenge", entityId: challengeId, meta: {} });
    return { ok: true, challenge_id: challengeId, expires_at_ms: issued.expires_at_ms, digits: issued.digits };
  }

  // ── OTP verify → issue session ──────────────────────────────────────────────────────────────────────
  async function verifyOtp({ challengeId, code }) {
    const row = await store.getEmailChallenge(q, challengeId);
    if (!row) return { ok: false, verdict: "not_found" };
    const verdict = engine.otpVerify({
      pepper: cfg.pepper,
      email: row.email_normalized,
      purpose: row.purpose,
      submittedCode: code,
      otpHash: row.otp_hash,
      expiresAtMs: store.toMs(row.expires_at),
      attempts: row.attempts,
      maxAttempts: cfg.ttl.otpMaxAttempts,
      verifiedAtMs: row.verified_at ? store.toMs(row.verified_at) : undefined,
      invalidatedAtMs: row.invalidated_at ? store.toMs(row.invalidated_at) : undefined,
    });
    // Persist the attempt count regardless of outcome.
    await store.incrementChallengeAttempts(q, challengeId, verdict.new_attempts);
    if (!(verdict.ok && verdict.consume)) {
      await store.audit(q, { event: "otp_verify_failed", entityType: "email_challenge", entityId: challengeId, meta: { verdict: verdict.verdict } });
      return { ok: false, verdict: verdict.verdict };
    }
    // Success: mark the code used and mint a session, atomically.
    const session = engine.sessionIssue({ pepper: cfg.pepper, absoluteMs: cfg.ttl.sessionAbsoluteMs });
    const sessionId = await db.withTransaction(async (client) => {
      const tq = (t, p) => client.query(t, p);
      await store.markChallengeVerified(tq, challengeId, Date.now());
      const id = await store.insertSession(tq, {
        sessionHash: session.session_hash,
        emailNormalized: row.email_normalized,
        issuedAtMs: session.issued_at_ms,
        lastSeenMs: session.last_seen_ms,
        expiresAtMs: session.absolute_expires_at_ms,
      });
      await store.audit(tq, { event: "otp_verified", entityType: "candidate_session", entityId: id, meta: {} });
      return id;
    });
    // Cookie value binds the DB row id (for lookup) to the opaque token (verified in Rust on each request).
    return {
      ok: true,
      verdict: "verified",
      email: row.email_normalized,
      cookie_value: `${sessionId}.${session.token}`,
      absolute_expires_at_ms: session.absolute_expires_at_ms,
    };
  }

  // ── Session authentication (per request) ────────────────────────────────────────────────────────────
  async function authenticate(cookieValue) {
    if (!cookieValue || typeof cookieValue !== "string") return null;
    const dot = cookieValue.indexOf(".");
    if (dot <= 0) return null;
    const sessionId = cookieValue.slice(0, dot);
    const token = cookieValue.slice(dot + 1);
    const row = await store.getSessionById(q, sessionId);
    if (!row) return null;
    const v = engine.sessionVerify({
      pepper: cfg.pepper,
      token,
      sessionHash: row.session_hash,
      lastSeenMs: store.toMs(row.last_seen_at),
      absoluteExpiresAtMs: store.toMs(row.expires_at),
      idleMs: cfg.ttl.sessionIdleMs,
      revokedAtMs: row.revoked_at ? store.toMs(row.revoked_at) : undefined,
    });
    if (!v.valid) return null;
    if (v.new_last_seen_ms) await store.touchSession(q, sessionId, v.new_last_seen_ms);
    return { sessionId, email: row.email_normalized };
  }

  async function logout(session) {
    if (!session) return { ok: true };
    await store.revokeSession(q, session.sessionId, Date.now());
    await store.audit(q, { event: "session_revoked", entityType: "candidate_session", entityId: session.sessionId, meta: {} });
    return { ok: true };
  }

  // ── Candidates ──────────────────────────────────────────────────────────────────────────────────────
  async function createCandidate({ session, operatorName, institutionalName }) {
    const id = await store.insertCandidate(q, {
      ownerEmail: session.email,
      operatorName,
      institutionalName,
      state: "DRAFT",
      nowMs: Date.now(),
    });
    await store.audit(q, { event: "candidate_created", entityType: "candidate", entityId: id, meta: {} });
    const c = await store.getCandidate(q, id);
    return candidateView(c);
  }

  async function listCandidates({ session }) {
    const rows = await store.listCandidatesByOwner(q, session.email);
    const out = [];
    for (const c of rows) {
      const impls = await store.listImplementations(q, c.candidate_id);
      out.push(candidateView(c, impls));
    }
    return out;
  }

  // Load a candidate the session owns, or null. Central ownership gate.
  async function ownedCandidate(session, candidateId) {
    const c = await store.getCandidate(q, candidateId);
    if (!c || c.owner_email !== session.email) return null;
    return c;
  }

  async function getCandidateDetail({ session, candidateId }) {
    const c = await ownedCandidate(session, candidateId);
    if (!c) return null;
    const impls = await store.listImplementations(q, candidateId);
    return candidateView(c, impls);
  }

  async function abandonCandidate({ session, candidateId }) {
    const c = await ownedCandidate(session, candidateId);
    if (!c) return { ok: false, reason: "not_found" };
    const t = engine.candidateTransition({ state: c.state, event: "expired" });
    if (!t.ok) return { ok: false, reason: "illegal_transition" };
    await store.updateCandidateState(q, candidateId, t.next_state, Date.now());
    await store.audit(q, { event: "candidate_abandoned", entityType: "candidate", entityId: candidateId, meta: {} });
    return { ok: true, state: t.next_state };
  }

  // ── Implementations ─────────────────────────────────────────────────────────────────────────────────
  async function createImplementation({ session, candidateId, implementationName, canonicalDomain, description, expectedProtocolVersion, expectedProfile, expectedEnvironment }) {
    const c = await ownedCandidate(session, candidateId);
    if (!c) return { ok: false, reason: "not_found" };
    const id = await store.insertImplementation(q, {
      candidateId,
      implementationName,
      description,
      expectedProtocolVersion,
      expectedProfile,
      expectedEnvironment,
      canonicalDomain,
      nowMs: Date.now(),
    });
    await store.audit(q, { event: "implementation_created", entityType: "candidate_implementation", entityId: id, meta: { domain: canonicalDomain } });
    const impl = await store.getImplementation(q, id);
    return { ok: true, implementation: {
      candidate_implementation_id: impl.candidate_implementation_id,
      implementation_name: impl.implementation_name,
      canonical_domain: impl.canonical_domain,
      origin_verification_state: impl.origin_verification_state,
      validation_state: impl.validation_state,
    } };
  }

  // Load an implementation whose candidate the session owns, else null.
  async function ownedImplementation(session, implementationId) {
    const impl = await store.getImplementation(q, implementationId);
    if (!impl) return null;
    const c = await ownedCandidate(session, impl.candidate_id);
    if (!c) return null;
    return { impl, candidate: c };
  }

  // ── Origin ownership challenge (.well-known) ─────────────────────────────────────────────────────────
  async function issueOriginChallenge({ session, implementationId }) {
    const owned = await ownedImplementation(session, implementationId);
    if (!owned) return { ok: false, reason: "not_found" };
    const { impl, candidate } = owned;
    const issued = engine.originIssue({
      pepper: cfg.pepper,
      candidateId: candidate.candidate_id,
      candidateImplementationId: impl.candidate_implementation_id,
      domain: impl.canonical_domain,
      ttlMs: cfg.ttl.originChallengeMs,
    });
    if (!issued.ok) return { ok: false, reason: issued.reason };
    await store.insertOriginChallenge(q, {
      challengeId: issued.challenge_id,
      implementationId: impl.candidate_implementation_id,
      domain: impl.canonical_domain,
      challengeHash: issued.challenge_hash,
      issuedAtMs: issued.issued_at_ms,
      expiresAtMs: issued.expires_at_ms,
    });
    await store.setImplementationOriginState(q, impl.candidate_implementation_id, "ORIGIN_PENDING", Date.now());
    if (candidate.state === "DRAFT") {
      const t = engine.candidateTransition({ state: "DRAFT", event: "origin_challenge_issued" });
      if (t.ok) await store.updateCandidateState(q, candidate.candidate_id, t.next_state, Date.now());
    }
    await store.audit(q, { event: "origin_challenge_issued", entityType: "origin_challenge", entityId: issued.challenge_id, meta: { domain: impl.canonical_domain } });
    return {
      ok: true,
      challenge_id: issued.challenge_id,
      well_known_path: issued.well_known_path,
      publish_url: `https://${impl.canonical_domain}${issued.well_known_path}`,
      challenge_document: issued.challenge_document,
      expires_at_ms: issued.expires_at_ms,
    };
  }

  async function verifyOrigin({ session, implementationId }) {
    const owned = await ownedImplementation(session, implementationId);
    if (!owned) return { ok: false, reason: "not_found" };
    const { impl, candidate } = owned;
    const challenge = await store.latestOriginChallenge(q, impl.candidate_implementation_id);
    if (!challenge) return { ok: false, reason: "no_challenge" };

    // M2.19G.3A single-use: a challenge already consumed by a positive verification cannot verify again
    // (Rust decides via consumed_at_ms). We short-circuit before the network fetch so a replay never even
    // re-hits the operator origin.
    if (challenge.consumed_at) {
      const verdict = engine.originVerify({
        pepper: cfg.pepper, fetchedContent: "", challengeHash: challenge.challenge_hash,
        candidateId: candidate.candidate_id, candidateImplementationId: impl.candidate_implementation_id,
        domain: impl.canonical_domain, issuedAtMs: store.toMs(challenge.issued_at),
        expiresAtMs: store.toMs(challenge.expires_at), consumedAtMs: store.toMs(challenge.consumed_at),
      });
      await store.audit(q, { event: "origin_verify_replay_rejected", entityType: "origin_challenge", entityId: challenge.challenge_id, meta: { result: verdict.result } });
      return { ok: false, result: verdict.result, reason_code: verdict.reason_code };
    }

    // Fetch the published document via the SECURE Rust fetcher only (registry-derived origin+path;
    // never a caller URL). The no-network engines receive already-fetched content.
    const origin = `https://${impl.canonical_domain}`;
    const fetched = await fetcher.fetchArtifact({
      canonical_origin: origin,
      expected_host: impl.canonical_domain,
      path: WELL_KNOWN_PATH,
    });
    if (!fetched || !fetched.ok || typeof fetched.body !== "string") {
      await store.updateOriginChallengeResult(q, challenge.challenge_id, {
        result: "unreachable",
        reasonCode: (fetched && fetched.reason_codes && fetched.reason_codes[0]) || "fetch_failed",
        verifiedAtMs: Date.now(),
      });
      await store.audit(q, { event: "origin_verify_failed", entityType: "origin_challenge", entityId: challenge.challenge_id, meta: { result: "unreachable" } });
      return { ok: false, result: "unreachable", reason_code: (fetched && fetched.reason_codes && fetched.reason_codes[0]) || "fetch_failed" };
    }

    const verdict = engine.originVerify({
      pepper: cfg.pepper,
      fetchedContent: fetched.body,
      challengeHash: challenge.challenge_hash,
      candidateId: candidate.candidate_id,
      candidateImplementationId: impl.candidate_implementation_id,
      domain: impl.canonical_domain,
      issuedAtMs: store.toMs(challenge.issued_at),
      expiresAtMs: store.toMs(challenge.expires_at),
      responseSha256: fetched.sha256 || "",
    });
    await store.updateOriginChallengeResult(q, challenge.challenge_id, {
      result: verdict.result,
      reasonCode: verdict.reason_code,
      verifiedAtMs: Date.now(),
    });
    if (verdict.ok && verdict.result === "verified") {
      await store.setImplementationOriginState(q, impl.candidate_implementation_id, "ORIGIN_VERIFIED", Date.now());
      // Append the origin receipt to the implementation's receipts.
      const impls = await store.getImplementation(q, impl.candidate_implementation_id);
      const receipts = Array.isArray(impls.receipts) ? impls.receipts : [];
      receipts.push(verdict.receipt);
      await store.updateImplementationValidation(q, impl.candidate_implementation_id, {
        validationState: impls.validation_state,
        receipts,
        blockers: Array.isArray(impls.blockers) ? impls.blockers : [],
        nowMs: Date.now(),
      });
      if (candidate.state === "ORIGIN_PENDING") {
        const t = engine.candidateTransition({ state: "ORIGIN_PENDING", event: "origin_verified" });
        if (t.ok) await store.updateCandidateState(q, candidate.candidate_id, t.next_state, Date.now());
      }
      // M2.19G.3A single-use: consume the challenge so it can never verify again (replay closed).
      await store.markOriginChallengeConsumed(q, challenge.challenge_id, Date.now());
      await store.audit(q, { event: "origin_verified", entityType: "origin_challenge", entityId: challenge.challenge_id, meta: { consumed: true } });
    } else {
      await store.audit(q, { event: "origin_verify_failed", entityType: "origin_challenge", entityId: challenge.challenge_id, meta: { result: verdict.result, reason: verdict.reason_code } });
    }
    return { ok: verdict.ok, result: verdict.result, reason_code: verdict.reason_code, receipt: verdict.receipt };
  }

  // ── Reconciliation with the existing public registry entry (M2.19G.3A) ───────────────────────────────
  // Binds an owned, origin-verified candidate implementation to an ALREADY-registry-resident
  // (operator_id, implementation_id) from the CLOSED Technical Registry — never creating a registry row,
  // never name-matching, never writing /operators. Rust decides the state chain
  // (ORIGIN_VERIFIED → VALIDATING → VALIDATION_COMPLETED → PUBLICATION_ELIGIBLE → PUBLISHED); the
  // published_operator_id / published_implementation_id record the correspondence to the existing entry.
  async function reconcileCandidate({ session, candidateId, implementationId, registryOperatorId, registryImplementationId }) {
    const owned = await ownedImplementation(session, implementationId);
    if (!owned) return { ok: false, reason: "not_found" };
    const { impl, candidate } = owned;
    if (impl.candidate_id !== candidateId) return { ok: false, reason: "not_found" };
    if (impl.origin_verification_state !== "ORIGIN_VERIFIED") return { ok: false, reason: "origin_not_verified" };

    // The target MUST resolve in the closed registry (binding, not creation; no free-text matching).
    const target = engine.resolveRegistryTarget(registryOperatorId, registryImplementationId);
    if (!target.ok) return { ok: false, reason: "registry_target_unknown", detail: target.reason || null };

    // Drive the candidate lifecycle through the Rust state machine, one governed transition at a time,
    // auditing each — never a direct jump. "validation_completed" means the nine-stage journey EXECUTED
    // to completion (its JourneyReceipt exists); it does NOT assert certification.
    const now = Date.now();
    let state = candidate.state;
    for (const event of ["validation_started", "validation_completed", "publication_eligible", "published"]) {
      const t = engine.candidateTransition({ state, event });
      if (!t.ok) return { ok: false, reason: "illegal_transition", state, event };
      state = t.next_state;
      await store.updateCandidateState(q, candidate.candidate_id, state, now);
      await store.audit(q, { event: `candidate_${event}`, entityType: "candidate", entityId: candidate.candidate_id, meta: { state } });
    }
    // Record the correspondence to the existing public entry (no new operator/implementation, no /operators).
    await store.setImplementationPublished(q, impl.candidate_implementation_id, registryImplementationId, now);
    await store.setCandidatePublished(q, candidate.candidate_id, registryOperatorId, now);
    await store.audit(q, { event: "candidate_reconciled", entityType: "candidate", entityId: candidate.candidate_id, meta: { published_operator_id: registryOperatorId, published_implementation_id: registryImplementationId } });
    return {
      ok: true,
      state: "PUBLISHED",
      published_operator_id: registryOperatorId,
      published_implementation_id: registryImplementationId,
      note: "Candidatura ligada à entrada existente no Registo Técnico. Não cria operador novo nem entra em /operators; a certificação continua determinada pela evidência real.",
    };
  }

  return {
    requestOtp,
    verifyOtp,
    authenticate,
    logout,
    reconcileCandidate,
    createCandidate,
    listCandidates,
    getCandidateDetail,
    abandonCandidate,
    createImplementation,
    issueOriginChallenge,
    verifyOrigin,
  };
}
