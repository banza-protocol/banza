// M2.19G.3 (ADR-069) — onboarding backend tests. Exercises the Rust decision engine wrapper, the
// HTTP helpers (cookie/CSRF/sanitisers), and the full service flow (OTP → opaque session → candidate →
// implementation → .well-known origin proof) against an in-memory Postgres fake + mock email + a fake
// secure fetcher. Asserts the security invariants: no plaintext code/token/pepper is ever persisted,
// wrong codes are rejected, sessions are revocable, and a tampered challenge document fails.

import { test } from "node:test";
import assert from "node:assert/strict";

import { loadOnboardingConfig } from "../src/onboarding/config.js";
import * as engine from "../src/onboarding/engine.js";
import { MockEmailDeliveryProvider } from "../src/onboarding/email.js";
import { createOnboardingService } from "../src/onboarding/service.js";
import { parseCookies, serializeCookie, clearCookie, originAllowed, normalizeEmail, safeText, safeDomain } from "../src/onboarding/http.js";

// ── in-memory Postgres fake (covers exactly the SQL the store issues) ────────────────────────────────
function makeFakeDb() {
  const t = { email_challenges: [], candidate_sessions: [], candidates: [], candidate_implementations: [], origin_challenges: [], onboarding_audit: [] };
  function query(text, params = []) {
    const s = text.replace(/\s+/g, " ").trim();
    if (s.startsWith("INSERT INTO email_challenges")) { t.email_challenges.push({ challenge_id: params[0], purpose: params[1], email_normalized: params[2], otp_hash: params[3], issued_at: params[4], expires_at: params[5], attempts: 0, verified_at: null, invalidated_at: null, provider_message_id: null, request_id: null }); return { rows: [] }; }
    if (s.startsWith("UPDATE email_challenges SET request_id")) return { rows: [] };
    if (s.startsWith("UPDATE email_challenges SET provider_message_id")) { const r = t.email_challenges.find((x) => x.challenge_id === params[0]); if (r) r.provider_message_id = params[1]; return { rows: [] }; }
    if (s.startsWith("SELECT * FROM email_challenges WHERE challenge_id")) return { rows: t.email_challenges.filter((x) => x.challenge_id === params[0]) };
    if (s.includes("FROM email_challenges WHERE email_normalized=$1 AND purpose=$2 ORDER BY issued_at DESC")) { const r = t.email_challenges.filter((x) => x.email_normalized === params[0] && x.purpose === params[1]).sort((a, b) => b.issued_at - a.issued_at); return { rows: r.slice(0, 1) }; }
    if (s.includes("count(*)::int AS n, min(issued_at) AS oldest FROM email_challenges")) { const since = params[1]; const inWin = t.email_challenges.filter((x) => x.email_normalized === params[0] && x.issued_at >= since); const oldest = inWin.reduce((m, x) => (!m || x.issued_at < m ? x.issued_at : m), null); return { rows: [{ n: inWin.length, oldest }] }; }
    if (s.startsWith("UPDATE email_challenges SET attempts")) { const r = t.email_challenges.find((x) => x.challenge_id === params[0]); if (r) r.attempts = params[1]; return { rows: [] }; }
    if (s.startsWith("UPDATE email_challenges SET verified_at")) { const r = t.email_challenges.find((x) => x.challenge_id === params[0]); if (r) r.verified_at = params[1]; return { rows: [] }; }
    if (s.startsWith("UPDATE email_challenges SET invalidated_at")) { for (const r of t.email_challenges) if (r.email_normalized === params[0] && r.purpose === params[1] && r.challenge_id !== params[2] && !r.verified_at && !r.invalidated_at) r.invalidated_at = params[3]; return { rows: [] }; }
    if (s.startsWith("INSERT INTO candidate_sessions")) { t.candidate_sessions.push({ session_id: params[0], session_hash: params[1], email_normalized: params[2], issued_at: params[3], last_seen_at: params[4], expires_at: params[5], revoked_at: null }); return { rows: [] }; }
    if (s.startsWith("SELECT * FROM candidate_sessions WHERE session_id")) return { rows: t.candidate_sessions.filter((x) => x.session_id === params[0]) };
    if (s.startsWith("SELECT * FROM candidate_sessions WHERE session_hash")) return { rows: t.candidate_sessions.filter((x) => x.session_hash === params[0]) };
    if (s.startsWith("UPDATE candidate_sessions SET last_seen_at")) { const r = t.candidate_sessions.find((x) => x.session_id === params[0]); if (r) r.last_seen_at = params[1]; return { rows: [] }; }
    if (s.startsWith("UPDATE candidate_sessions SET revoked_at")) { const r = t.candidate_sessions.find((x) => x.session_id === params[0]); if (r) r.revoked_at = params[1]; return { rows: [] }; }
    if (s.startsWith("INSERT INTO candidates")) { t.candidates.push({ candidate_id: params[0], owner_email: params[1], operator_name: params[2], institutional_name: params[3], state: params[4], created_at: params[5], updated_at: params[5], last_activity_at: params[5], published_operator_id: null }); return { rows: [] }; }
    if (s.startsWith("SELECT * FROM candidates WHERE candidate_id")) return { rows: t.candidates.filter((x) => x.candidate_id === params[0]) };
    if (s.includes("FROM candidates WHERE owner_email=$1 ORDER BY")) return { rows: t.candidates.filter((x) => x.owner_email === params[0]) };
    if (s.startsWith("UPDATE candidates SET state")) { const r = t.candidates.find((x) => x.candidate_id === params[0]); if (r) { r.state = params[1]; r.updated_at = params[2]; } return { rows: [] }; }
    if (s.startsWith("UPDATE candidates SET published_operator_id")) { const r = t.candidates.find((x) => x.candidate_id === params[0]); if (r) { r.published_operator_id = params[1]; r.state = "PUBLISHED"; r.updated_at = params[2]; } return { rows: [] }; }
    if (s.startsWith("INSERT INTO candidate_implementations")) { t.candidate_implementations.push({ candidate_implementation_id: params[0], candidate_id: params[1], implementation_name: params[2], description: params[3], expected_protocol_version: params[4], expected_profile: params[5], expected_environment: params[6], canonical_domain: params[7], origin_verification_state: "ORIGIN_PENDING", validation_state: "DRAFT", receipts: [], blockers: [], published_implementation_id: null }); return { rows: [] }; }
    if (s.startsWith("SELECT * FROM candidate_implementations WHERE candidate_implementation_id")) return { rows: t.candidate_implementations.filter((x) => x.candidate_implementation_id === params[0]) };
    if (s.includes("FROM candidate_implementations WHERE candidate_id=$1 ORDER BY")) return { rows: t.candidate_implementations.filter((x) => x.candidate_id === params[0]) };
    if (s.startsWith("UPDATE candidate_implementations SET origin_verification_state")) { const r = t.candidate_implementations.find((x) => x.candidate_implementation_id === params[0]); if (r) r.origin_verification_state = params[1]; return { rows: [] }; }
    if (s.startsWith("UPDATE candidate_implementations SET validation_state")) { const r = t.candidate_implementations.find((x) => x.candidate_implementation_id === params[0]); if (r) { r.validation_state = params[1]; r.receipts = JSON.parse(params[2]); r.blockers = JSON.parse(params[3]); } return { rows: [] }; }
    if (s.startsWith("UPDATE candidate_implementations SET published_implementation_id")) { const r = t.candidate_implementations.find((x) => x.candidate_implementation_id === params[0]); if (r) r.published_implementation_id = params[1]; return { rows: [] }; }
    if (s.startsWith("INSERT INTO origin_challenges")) { t.origin_challenges.push({ challenge_id: params[0], candidate_implementation_id: params[1], domain: params[2], challenge_hash: params[3], issued_at: params[4], expires_at: params[5], verified_at: null, result: null, reason_code: null, receipt_ref: null, consumed_at: null }); return { rows: [] }; }
    if (s.includes("FROM origin_challenges WHERE candidate_implementation_id=$1 ORDER BY issued_at DESC")) { const r = t.origin_challenges.filter((x) => x.candidate_implementation_id === params[0]).sort((a, b) => b.issued_at - a.issued_at); return { rows: r.slice(0, 1) }; }
    if (s.includes("FILTER (WHERE consumed_at IS NULL") && s.includes("FROM origin_challenges")) { const now = params[1]; const rows = t.origin_challenges.filter((x) => x.candidate_implementation_id === params[0]); const active = rows.filter((x) => x.consumed_at == null && x.result == null && x.expires_at > now).length; const consumed = rows.filter((x) => x.consumed_at != null).length; return { rows: [{ active, consumed }] }; }
    if (s.startsWith("UPDATE origin_challenges SET consumed_at")) { const r = t.origin_challenges.find((x) => x.challenge_id === params[0]); if (r && r.consumed_at == null) r.consumed_at = params[1]; return { rows: [] }; }
    if (s.startsWith("UPDATE origin_challenges SET result")) { const r = t.origin_challenges.find((x) => x.challenge_id === params[0]); if (r) { r.result = params[1]; r.reason_code = params[2]; r.receipt_ref = params[3]; r.verified_at = params[4]; } return { rows: [] }; }
    if (s.startsWith("INSERT INTO onboarding_audit")) { t.onboarding_audit.push({ event: params[0], entity_type: params[1], entity_id: params[2], meta: params[3] }); return { rows: [] }; }
    throw new Error("UNHANDLED SQL: " + s.slice(0, 90));
  }
  return {
    _t: t,
    async query(text, params) { return query(text, params); },
    async withTransaction(fn) { return fn({ query: (a, b) => query(a, b) }); },
    async dbHealthy() { return true; },
  };
}

const PEPPER = "test-pepper-not-a-real-secret";
function build() {
  const cfg = loadOnboardingConfig({ BANZAI_ONBOARDING_ENABLED: "1", BANZAI_OTP_PEPPER: PEPPER, ONBOARDING_EMAIL_PROVIDER: "mock" });
  const db = makeFakeDb();
  const email = new MockEmailDeliveryProvider();
  let published = null;
  const fetcher = { setPublished: (d) => (published = d), async fetchArtifact() { return published ? { ok: true, body: JSON.stringify(published), sha256: "sha256:test" } : { ok: false, reason_codes: ["fetch_failed"] }; } };
  const svc = createOnboardingService({ cfg, db, engine, email, fetcher });
  return { cfg, db, email, fetcher, svc };
}

// ── engine wrapper ────────────────────────────────────────────────────────────────────────────────
test("engine: tool version reports the canonical well-known path + 6 digits", () => {
  const v = engine.toolVersion();
  assert.equal(v.otp_digits, 6);
  assert.equal(v.well_known_path, "/.well-known/banza/ownership-challenge.json");
  assert.ok(v.candidate_states.includes("PUBLISHED"));
});

test("engine: OTP issue produces a 6-digit code + a distinct digest", () => {
  const iss = engine.otpIssue({ pepper: PEPPER, email: "a@b.co", purpose: "onboarding" });
  assert.equal(iss.ok, true);
  assert.match(iss.code, /^\d{6}$/);
  assert.notEqual(iss.code, iss.otp_hash);
  assert.ok(!iss.otp_hash.includes(iss.code));
});

// ── http helpers ────────────────────────────────────────────────────────────────────────────────────
test("http: cookie round-trip + __Host- attributes", () => {
  const c = serializeCookie("__Host-banzai_candidate", "sid.tok", { maxAgeMs: 1000, secure: true, sameSite: "Strict" });
  assert.ok(c.includes("__Host-banzai_candidate=sid.tok"));
  assert.ok(c.includes("Path=/") && c.includes("HttpOnly") && c.includes("SameSite=Strict") && c.includes("Secure"));
  assert.equal(parseCookies("__Host-banzai_candidate=sid.tok; other=1")["__Host-banzai_candidate"], "sid.tok");
  assert.ok(clearCookie("__Host-banzai_candidate").includes("Max-Age=0"));
});

test("http: CSRF Origin allowlist", () => {
  const allowed = ["https://banza.network"];
  assert.equal(originAllowed({ headers: { origin: "https://banza.network" } }, allowed), true);
  assert.equal(originAllowed({ headers: { origin: "https://evil.example" } }, allowed), false);
  assert.equal(originAllowed({ headers: {} }, allowed), true); // absent → rely on SameSite
});

test("http: sanitisers", () => {
  assert.equal(normalizeEmail("  Contact@Banza.Network "), "contact@banza.network");
  assert.equal(normalizeEmail("nope"), null);
  assert.equal(safeDomain("HTTPS://Zero.Banza.Network/x?y"), "zero.banza.network");
  assert.equal(safeDomain("not a domain"), null);
  assert.equal(safeText("  a b  c "), "a b c");
});

// ── full service flow ────────────────────────────────────────────────────────────────────────────────
test("service: OTP → session → candidate → implementation → origin verified", async () => {
  const { svc, email, fetcher, db } = build();

  const req = await svc.requestOtp({ email: "contact@banza.network" });
  assert.equal(req.ok, true);
  assert.ok(req.challenge_id);
  assert.ok(!("code" in req), "OTP response must never carry the code");
  const code = email.sent[0].code;

  // wrong code rejected
  const bad = await svc.verifyOtp({ challengeId: req.challenge_id, code: "000000" });
  assert.equal(bad.ok, false);
  assert.equal(bad.verdict, "mismatch");

  // correct code → session cookie
  const ver = await svc.verifyOtp({ challengeId: req.challenge_id, code });
  assert.equal(ver.ok, true);
  assert.ok(ver.cookie_value.includes("."));

  const session = await svc.authenticate(ver.cookie_value);
  assert.equal(session.email, "contact@banza.network");
  assert.equal(await svc.authenticate("bogus.token"), null);

  // reused (already-verified) code cannot mint a second session
  const reuse = await svc.verifyOtp({ challengeId: req.challenge_id, code });
  assert.equal(reuse.ok, false);
  assert.equal(reuse.verdict, "already_used");

  const cand = await svc.createCandidate({ session, operatorName: "Operador Zero", institutionalName: "demo" });
  assert.equal(cand.state, "DRAFT");

  const list = await svc.listCandidates({ session });
  assert.equal(list.length, 1);

  const impl = await svc.createImplementation({ session, candidateId: cand.candidate_id, implementationName: "impl", canonicalDomain: "zero.banza.network" });
  assert.equal(impl.ok, true);
  const implId = impl.implementation.candidate_implementation_id;

  const ch = await svc.issueOriginChallenge({ session, implementationId: implId });
  assert.equal(ch.ok, true);
  assert.equal(ch.well_known_path, "/.well-known/banza/ownership-challenge.json");
  fetcher.setPublished(ch.challenge_document);

  const ov = await svc.verifyOrigin({ session, implementationId: implId });
  assert.equal(ov.ok, true);
  assert.equal(ov.result, "verified");
  assert.equal(ov.receipt.receipt_type, "OriginVerificationReceipt");

  const list2 = await svc.listCandidates({ session });
  assert.equal(list2[0].implementations[0].origin_verification_state, "ORIGIN_VERIFIED");
  assert.equal(list2[0].state, "ORIGIN_VERIFIED");

  // M2.19G.3A single-use: re-verifying the SAME (now consumed) challenge is refused (replay closed),
  // without ever re-hitting the operator origin.
  const replay = await svc.verifyOrigin({ session, implementationId: implId });
  assert.equal(replay.ok, false);
  assert.equal(replay.result, "already_used");
  assert.equal(replay.reason_code, "challenge_already_consumed");

  // A FRESH challenge with a tampered nonce → mismatch (the consumed one above no longer interferes).
  const ch2 = await svc.issueOriginChallenge({ session, implementationId: implId });
  fetcher.setPublished({ banza_ownership_challenge: { ...ch2.challenge_document.banza_ownership_challenge, nonce: "deadbeef" } });
  const ov2 = await svc.verifyOrigin({ session, implementationId: implId });
  assert.equal(ov2.ok, false);
  assert.equal(ov2.result, "mismatch");

  // logout revokes
  await svc.logout(session);
  assert.equal(await svc.authenticate(ver.cookie_value), null);

  // SECURITY: no plaintext code / token / pepper persisted anywhere
  const dump = JSON.stringify(db._t);
  assert.ok(!dump.includes(code), "no plaintext OTP code stored");
  assert.ok(!dump.includes(PEPPER), "no pepper stored");
  assert.ok(!dump.includes(ver.cookie_value.split(".")[1]), "no session token stored (hash only)");
});

test("service: ownership isolation — a session cannot touch another owner's candidate", async () => {
  const { svc, email } = build();
  // user A logs in + creates a candidate
  const rA = await svc.requestOtp({ email: "a@banza.network" });
  const sessA = await svc.authenticate((await svc.verifyOtp({ challengeId: rA.challenge_id, code: email.sent.at(-1).code })).cookie_value);
  const candA = await svc.createCandidate({ session: sessA, operatorName: "A" });
  // user B logs in
  const rB = await svc.requestOtp({ email: "b@banza.network" });
  const sessB = await svc.authenticate((await svc.verifyOtp({ challengeId: rB.challenge_id, code: email.sent.at(-1).code })).cookie_value);
  // B cannot abandon A's candidate
  const res = await svc.abandonCandidate({ session: sessB, candidateId: candA.candidate_id });
  assert.equal(res.ok, false);
  assert.equal(res.reason, "not_found");
  // B's list is empty
  assert.equal((await svc.listCandidates({ session: sessB })).length, 0);
});

// ── M2.19G.3A reconciliation ─────────────────────────────────────────────────────────────────────────
// Bind an origin-verified candidate implementation to the EXISTING closed-registry Operador Zero entry.
// Never creates a registry row; drives the Rust state chain to PUBLISHED; records the correspondence.
async function loginAndVerifyOZ() {
  const b = build();
  const { svc, email, fetcher } = b;
  const r = await svc.requestOtp({ email: "contact@banza.network" });
  const session = await svc.authenticate((await svc.verifyOtp({ challengeId: r.challenge_id, code: email.sent.at(-1).code })).cookie_value);
  const cand = await svc.createCandidate({ session, operatorName: "Operador Zero", institutionalName: "demo" });
  const impl = await svc.createImplementation({ session, candidateId: cand.candidate_id, implementationName: "impl", canonicalDomain: "zero.banza.network" });
  const implId = impl.implementation.candidate_implementation_id;
  const ch = await svc.issueOriginChallenge({ session, implementationId: implId });
  fetcher.setPublished(ch.challenge_document);
  const ov = await svc.verifyOrigin({ session, implementationId: implId });
  assert.equal(ov.result, "verified");
  return { ...b, session, candidateId: cand.candidate_id, implId };
}

test("service: reconcile binds an origin-verified candidate to the existing OZ registry entry (no new operator)", async () => {
  const { svc, session, candidateId, implId, db } = await loginAndVerifyOZ();
  const out = await svc.reconcileCandidate({
    session, candidateId, implementationId: implId,
    registryOperatorId: "operator-zero", registryImplementationId: "operator-zero-ref-impl",
  });
  assert.equal(out.ok, true);
  assert.equal(out.state, "PUBLISHED");
  assert.equal(out.published_operator_id, "operator-zero");
  assert.equal(out.published_implementation_id, "operator-zero-ref-impl");

  // candidate + implementation now carry the correspondence to the EXISTING entry
  const list = await svc.listCandidates({ session });
  assert.equal(list[0].state, "PUBLISHED");
  assert.equal(list[0].published_operator_id, "operator-zero");
  const cand = db._t.candidates.find((c) => c.candidate_id === candidateId);
  assert.equal(cand.published_operator_id, "operator-zero");
  const impl = db._t.candidate_implementations.find((i) => i.candidate_implementation_id === implId);
  assert.equal(impl.published_implementation_id, "operator-zero-ref-impl");

  // governed state chain was walked (validation_started → … → published), each audited
  const events = db._t.onboarding_audit.map((a) => a.event);
  for (const e of ["candidate_validation_started", "candidate_validation_completed", "candidate_publication_eligible", "candidate_published", "candidate_reconciled"]) {
    assert.ok(events.includes(e), `expected audit event ${e}`);
  }
});

test("service: reconcile refuses an unknown registry target (binding, never creation)", async () => {
  const { svc, session, candidateId, implId } = await loginAndVerifyOZ();
  const out = await svc.reconcileCandidate({
    session, candidateId, implementationId: implId,
    registryOperatorId: "made-up-operator", registryImplementationId: "made-up-impl",
  });
  assert.equal(out.ok, false);
  assert.equal(out.reason, "registry_target_unknown");
});

test("service: reconcile refuses before origin is verified", async () => {
  const { svc, email } = build();
  const r = await svc.requestOtp({ email: "contact@banza.network" });
  const session = await svc.authenticate((await svc.verifyOtp({ challengeId: r.challenge_id, code: email.sent.at(-1).code })).cookie_value);
  const cand = await svc.createCandidate({ session, operatorName: "Operador Zero" });
  const impl = await svc.createImplementation({ session, candidateId: cand.candidate_id, implementationName: "impl", canonicalDomain: "zero.banza.network" });
  const out = await svc.reconcileCandidate({
    session, candidateId: cand.candidate_id, implementationId: impl.implementation.candidate_implementation_id,
    registryOperatorId: "operator-zero", registryImplementationId: "operator-zero-ref-impl",
  });
  assert.equal(out.ok, false);
  assert.equal(out.reason, "origin_not_verified");
});

test("service: OTP rate limit trips after the per-email max", async () => {
  const cfg = loadOnboardingConfig({ BANZAI_ONBOARDING_ENABLED: "1", BANZAI_OTP_PEPPER: PEPPER, ONBOARDING_EMAIL_PROVIDER: "mock", ONBOARDING_OTP_PER_EMAIL_MAX: "3", ONBOARDING_OTP_MIN_REISSUE_MS: "0" });
  const db = makeFakeDb();
  const email = new MockEmailDeliveryProvider();
  const svc = createOnboardingService({ cfg, db, engine, email, fetcher: { async fetchArtifact() { return { ok: false }; } } });
  let lastReason = null;
  for (let i = 0; i < 5; i++) { const r = await svc.requestOtp({ email: "flood@banza.network" }); if (!r.ok) lastReason = r.reason; }
  assert.equal(lastReason, "rate_limited");
});

// ── M2.19G.3B — one operator · many implementations, each with a canonical protocol profile ───────────
test("service: an operator carries many implementations and each declares its version/profile/environment", async () => {
  const { svc, email } = build();
  const req = await svc.requestOtp({ email: "many@banza.network" });
  const code = email.sent[0].code;
  const ver = await svc.verifyOtp({ challengeId: req.challenge_id, code });
  const session = await svc.authenticate(ver.cookie_value);

  // ONE operator (candidate) bound to the session.
  const cand = await svc.createCandidate({ session, operatorName: "Operador Muitos", institutionalName: null });

  // MANY implementations, each with its own protocol version / profile / environment.
  const a = await svc.createImplementation({ session, candidateId: cand.candidate_id, implementationName: "impl-a", canonicalDomain: "a.example", expectedProtocolVersion: "1.0.0", expectedProfile: "L0", expectedEnvironment: "sandbox" });
  const b = await svc.createImplementation({ session, candidateId: cand.candidate_id, implementationName: "impl-b", canonicalDomain: "b.example", expectedProtocolVersion: "1.0.0", expectedProfile: "L2", expectedEnvironment: "demo" });
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);

  const list = await svc.listCandidates({ session });
  assert.equal(list.length, 1, "the session is bound to exactly one operator");
  const impls = list[0].implementations;
  assert.equal(impls.length, 2, "one operator, many implementations");

  // candidateView surfaces the canonical profile of each implementation (M2.19G.3B OE12).
  const byName = Object.fromEntries(impls.map((i) => [i.implementation_name, i]));
  assert.equal(byName["impl-a"].expected_protocol_version, "1.0.0");
  assert.equal(byName["impl-a"].expected_profile, "L0");
  assert.equal(byName["impl-a"].expected_environment, "sandbox");
  assert.equal(byName["impl-b"].expected_profile, "L2");
  assert.equal(byName["impl-b"].expected_environment, "demo");
  // No certification-outcome field leaks into the registry view.
  assert.equal("last_known_state" in byName["impl-a"], false);
});
