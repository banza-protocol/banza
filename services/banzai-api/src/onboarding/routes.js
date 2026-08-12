// Onboarding HTTP router (M2.19G.3, ADR-069). Owns the /onboarding/* surface: cookie handling, the
// CSRF Origin check, a per-IP rate limit, session authentication, request validation, and mapping
// service results to typed JSON. Every security DECISION is delegated to the service → Rust engine;
// this file only shuttles HTTP. Mounted publicly under nginx `location /banzai/onboarding/` (same
// pattern as /banzai/ask, /banzai/validate/*). When onboarding is disabled it returns nothing (the
// server falls through to 404, so the surface is never advertised).

import { createRequire } from "node:module";
import { parseCookies, serializeCookie, clearCookie, originAllowed, readJsonBody, normalizeEmail, safeText, safeDomain } from "./http.js";

function safeId(v, max = 64) {
  return String(v || "").trim().replace(/[^a-zA-Z0-9._-]/g, "").slice(0, max);
}

// M2.19G.3B — the CANONICAL protocol option sets (supported protocol versions / environments / profiles)
// come from the Rust registry engine (banza-target-registry), the SAME single source the validation tab
// reads via /validate/options. An implementation profile declared during onboarding is validated against
// these sets (fecho por omissão): TypeScript never invents or hardcodes the allowed values; Rust decides.
const registryRequire = createRequire(import.meta.url);
const targetRegistry = registryRequire("../validatewasm/banza_target_registry/banza_target_registry.js");
const CANONICAL_OPTIONS = (() => {
  try {
    const o = JSON.parse(targetRegistry.registry_tool_version_json());
    return {
      versions: new Set(Array.isArray(o.supported_protocol_versions) ? o.supported_protocol_versions : []),
      environments: new Set(Array.isArray(o.supported_environments) ? o.supported_environments : []),
      profiles: new Set(Array.isArray(o.supported_profiles) ? o.supported_profiles : []),
    };
  } catch {
    return { versions: new Set(), environments: new Set(), profiles: new Set() };
  }
})();

export function createOnboardingRouter({ cfg, service, rateLimiter, engine }) {
  const cookieName = cfg.cookie.name;

  function setSessionCookie(cookieValue) {
    return {
      "Set-Cookie": serializeCookie(cookieName, cookieValue, {
        maxAgeMs: cfg.ttl.sessionAbsoluteMs,
        secure: cfg.cookie.secure,
        sameSite: cfg.cookie.sameSite,
      }),
    };
  }
  function clearSessionCookie() {
    return { "Set-Cookie": clearCookie(cookieName, { secure: cfg.cookie.secure, sameSite: cfg.cookie.sameSite }) };
  }

  async function currentSession(req) {
    const cookies = parseCookies(req.headers["cookie"]);
    const value = cookies[cookieName];
    if (!value) return null;
    return service.authenticate(value);
  }

  // Handle an /onboarding/* request. Returns {code, body, headers?} or null when this router does not
  // own the path (server falls through to 404). `clientId` is the caller identity for the IP rate limit.
  // A DB or unexpected error inside a handler becomes a clean 503 (fail safe), never a crash and never
  // a leaked internal message.
  async function handle(req, path, clientId) {
    if (!cfg.enabled) return null; // dark until enabled at deploy; never advertised
    if (!path.startsWith("/onboarding/") && path !== "/onboarding") return null;

    // Misconfiguration guard: onboarding on but no pepper → fail closed, never a default pepper.
    if (!cfg.pepper) {
      return { code: 503, body: { error: "onboarding_unconfigured" } };
    }

    // Per-IP coarse rate limit across the whole onboarding surface.
    const rl = rateLimiter.allow(clientId);
    if (!rl.allowed) {
      return { code: 429, body: { error: "rate_limited", retry_after_ms: rl.retry_after_ms } };
    }

    // CSRF: reject a cross-site Origin outright (SameSite=Strict cookie is the primary control).
    if (req.method === "POST" && !originAllowed(req, cfg.allowedOrigins)) {
      return { code: 403, body: { error: "forbidden_origin" } };
    }

    try {
      return await dispatch(req, path);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", msg: "onboarding handler error", path, error: err.message }));
      return { code: 503, body: { error: "service_unavailable" } };
    }
  }

  async function dispatch(req, path) {
    // ── public (pre-auth) ──────────────────────────────────────────────────────────────────────────
    if (req.method === "GET" && path === "/onboarding/version") {
      return { code: 200, body: { ...engine.toolVersion(), enabled: true } };
    }

    if (path === "/onboarding/otp/request") {
      if (req.method !== "POST") return method405();
      const parsed = await safeBody(req);
      if (parsed.error) return parsed.error;
      const email = normalizeEmail(parsed.body.email);
      if (!email) return { code: 400, body: { error: "invalid_email" } };
      const out = await service.requestOtp({ email });
      // Do NOT leak whether the email exists or was delivered beyond a soft delivery error.
      if (!out.ok && out.reason === "rate_limited") return { code: 429, body: out };
      if (!out.ok && out.reason === "reissue_too_soon") return { code: 429, body: out };
      if (!out.ok) return { code: 502, body: out };
      return { code: 200, body: { ok: true, challenge_id: out.challenge_id, expires_at_ms: out.expires_at_ms, digits: out.digits } };
    }

    if (path === "/onboarding/otp/verify") {
      if (req.method !== "POST") return method405();
      const parsed = await safeBody(req);
      if (parsed.error) return parsed.error;
      const challengeId = safeId(parsed.body.challenge_id);
      const code = String(parsed.body.code || "").trim().replace(/\D/g, "").slice(0, 12);
      if (!challengeId || !code) return { code: 400, body: { error: "missing_fields" } };
      const out = await service.verifyOtp({ challengeId, code });
      if (!out.ok) return { code: 401, body: { ok: false, verdict: out.verdict } };
      return {
        code: 200,
        body: { ok: true, verdict: "verified", email: out.email },
        headers: setSessionCookie(out.cookie_value),
      };
    }

    // ── authenticated ─────────────────────────────────────────────────────────────────────────────
    const session = await currentSession(req);

    if (path === "/onboarding/session") {
      if (req.method !== "GET") return method405();
      if (!session) return { code: 200, body: { authenticated: false } };
      return { code: 200, body: { authenticated: true, email: session.email } };
    }

    if (path === "/onboarding/logout") {
      if (req.method !== "POST") return method405();
      await service.logout(session);
      return { code: 200, body: { ok: true }, headers: clearSessionCookie() };
    }

    // Everything below requires a session.
    if (!session) return { code: 401, body: { error: "authentication_required" } };

    if (path === "/onboarding/candidates") {
      if (req.method !== "GET") return method405();
      const list = await service.listCandidates({ session });
      return { code: 200, body: { candidates: list } };
    }

    if (path === "/onboarding/candidate") {
      if (req.method !== "POST") return method405();
      const parsed = await safeBody(req);
      if (parsed.error) return parsed.error;
      const operatorName = safeText(parsed.body.operator_name, 120);
      const institutionalName = safeText(parsed.body.institutional_name, 160);
      if (!operatorName) return { code: 400, body: { error: "missing_operator_name" } };
      const candidate = await service.createCandidate({ session, operatorName, institutionalName });
      return { code: 201, body: { ok: true, candidate } };
    }

    if (path === "/onboarding/candidate/abandon") {
      if (req.method !== "POST") return method405();
      const parsed = await safeBody(req);
      if (parsed.error) return parsed.error;
      const candidateId = safeId(parsed.body.candidate_id);
      const out = await service.abandonCandidate({ session, candidateId });
      if (!out.ok) return { code: out.reason === "not_found" ? 404 : 409, body: out };
      return { code: 200, body: out };
    }

    if (path === "/onboarding/candidate/reconcile") {
      if (req.method !== "POST") return method405();
      const parsed = await safeBody(req);
      if (parsed.error) return parsed.error;
      const candidateId = safeId(parsed.body.candidate_id);
      const implementationId = safeId(parsed.body.candidate_implementation_id);
      const registryOperatorId = safeId(parsed.body.registry_operator_id);
      const registryImplementationId = safeId(parsed.body.registry_implementation_id);
      if (!candidateId || !implementationId || !registryOperatorId || !registryImplementationId) return { code: 400, body: { error: "missing_fields" } };
      // M2.19G.3A — bind to an EXISTING closed-registry entry (origin must be verified first). This
      // records a correspondence; it never publishes a new operator nor writes /operators.
      const out = await service.reconcileCandidate({ session, candidateId, implementationId, registryOperatorId, registryImplementationId });
      if (!out.ok) {
        const code = out.reason === "not_found" ? 404 : out.reason === "origin_not_verified" ? 409 : out.reason === "registry_target_unknown" ? 422 : 400;
        return { code, body: out };
      }
      return { code: 200, body: out };
    }

    if (path === "/onboarding/implementation") {
      if (req.method !== "POST") return method405();
      const parsed = await safeBody(req);
      if (parsed.error) return parsed.error;
      const candidateId = safeId(parsed.body.candidate_id);
      const implementationName = safeText(parsed.body.implementation_name, 120);
      const canonicalDomain = safeDomain(parsed.body.canonical_domain);
      if (!candidateId || !implementationName) return { code: 400, body: { error: "missing_fields" } };
      if (!canonicalDomain) return { code: 400, body: { error: "invalid_domain" } };
      // Each implementation declares its protocol version / profile / environment; all three are REQUIRED
      // and validated against the canonical Rust option sets (fecho por omissão — no hardcoded/off-list values).
      const expectedProtocolVersion = safeText(parsed.body.expected_protocol_version, 40);
      const expectedProfile = safeText(parsed.body.expected_profile, 40);
      const expectedEnvironment = safeText(parsed.body.expected_environment, 40);
      if (!expectedProtocolVersion || !expectedProfile || !expectedEnvironment) {
        return { code: 400, body: { error: "missing_fields", reason: "protocol_version, profile and environment are required" } };
      }
      if (
        !CANONICAL_OPTIONS.versions.has(expectedProtocolVersion) ||
        !CANONICAL_OPTIONS.profiles.has(expectedProfile) ||
        !CANONICAL_OPTIONS.environments.has(expectedEnvironment)
      ) {
        return { code: 422, body: { error: "invalid_option", reason: "protocol_version/profile/environment must be a canonical supported value" } };
      }
      const out = await service.createImplementation({
        session,
        candidateId,
        implementationName,
        canonicalDomain,
        description: safeText(parsed.body.description, 300),
        expectedProtocolVersion,
        expectedProfile,
        expectedEnvironment,
      });
      if (!out.ok) return { code: 404, body: out };
      return { code: 201, body: out };
    }

    if (path === "/onboarding/origin/challenge") {
      if (req.method !== "POST") return method405();
      const parsed = await safeBody(req);
      if (parsed.error) return parsed.error;
      const implementationId = safeId(parsed.body.candidate_implementation_id);
      if (!implementationId) return { code: 400, body: { error: "missing_fields" } };
      const out = await service.issueOriginChallenge({ session, implementationId });
      if (!out.ok) return { code: out.reason === "not_found" ? 404 : 400, body: out };
      return { code: 200, body: out };
    }

    if (path === "/onboarding/origin/verify") {
      if (req.method !== "POST") return method405();
      const parsed = await safeBody(req);
      if (parsed.error) return parsed.error;
      const implementationId = safeId(parsed.body.candidate_implementation_id);
      if (!implementationId) return { code: 400, body: { error: "missing_fields" } };
      const out = await service.verifyOrigin({ session, implementationId });
      if (out.reason === "not_found") return { code: 404, body: out };
      if (out.reason === "no_challenge") return { code: 409, body: out };
      return { code: 200, body: out };
    }

    return { code: 404, body: { error: "not_found" } };
  }

  function method405() {
    return { code: 405, body: { error: "method_not_allowed" } };
  }

  async function safeBody(req) {
    try {
      const body = await readJsonBody(req);
      return { body: body || {} };
    } catch (e) {
      return { error: { code: 400, body: { error: "bad_request", detail: e.message } } };
    }
  }

  return { enabled: cfg.enabled, handle };
}
