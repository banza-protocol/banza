// Onboarding configuration (M2.19G.3, ADR-040). SECRETS_FROM_ENV_ONLY.
//
// Every secret (the OTP/session HMAC pepper, the Resend API key) is read from the process
// environment and NEVER hard-coded, logged, returned in a response, or written to disk by this
// service. Non-secret identity (sender, reply-to) has safe defaults but stays overridable via env.
// Onboarding is OFF unless BANZAI_ONBOARDING_ENABLED is truthy, so the feature stays dark until the
// migration + secrets are in place on the host; when off, the routes 404 like the other internal ones.

const bool = (v) => /^(1|true|yes|on)$/i.test(String(v ?? "").trim());
const int = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
};
// Like int() but 0 is a legitimate value (e.g. min-reissue = 0 disables the throttle). Only a missing
// or non-numeric value falls back to the default.
const int0 = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : d;
};

export const EMAIL_PROVIDERS = Object.freeze(["mock", "resend"]);

// Default allowed browser Origins for the same-origin onboarding UI (CSRF defence in depth alongside
// the SameSite=Strict session cookie). Overridable via ONBOARDING_ALLOWED_ORIGINS (comma-separated).
const DEFAULT_ALLOWED_ORIGINS = "https://banza.network,https://www.banza.network,https://zero.banza.network";

export function loadOnboardingConfig(env = process.env) {
  const enabled = bool(env.BANZAI_ONBOARDING_ENABLED);
  const emailProvider = String(env.ONBOARDING_EMAIL_PROVIDER || "mock").trim().toLowerCase();
  const cookieSecure = env.ONBOARDING_COOKIE_SECURE == null ? true : bool(env.ONBOARDING_COOKIE_SECURE);
  return {
    enabled,
    // Secret pepper — required when enabled. Absent → the service refuses onboarding (fail closed),
    // it never falls back to an empty/default pepper. Never surfaced anywhere.
    pepper: String(env.BANZAI_OTP_PEPPER || ""),
    email: {
      provider: EMAIL_PROVIDERS.includes(emailProvider) ? emailProvider : "mock",
      // Resend key — required only when provider=resend. Read here, handed only to the Resend adapter.
      resendApiKey: String(env.RESEND_API_KEY || ""),
      from: String(env.ONBOARDING_EMAIL_FROM || "BanzAI <acesso@auth.banza.network>"),
      replyTo: String(env.ONBOARDING_EMAIL_REPLY_TO || "contact@banza.network"),
    },
    cookie: {
      secure: cookieSecure,
      // __Host- prefix REQUIRES Secure + Path=/ + no Domain; only usable over HTTPS. In a non-secure
      // local context we drop the prefix so the cookie is still settable for manual dev.
      name: cookieSecure ? "__Host-banzai_candidate" : "banzai_candidate",
      sameSite: "Strict",
    },
    // CSRF: allowlisted browser Origins for state-changing requests.
    allowedOrigins: String(env.ONBOARDING_ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    ttl: {
      otpMs: int(env.ONBOARDING_OTP_TTL_MS, 600_000), // 10 min
      otpMinReissueMs: int0(env.ONBOARDING_OTP_MIN_REISSUE_MS, 60_000), // 60 s (0 disables)
      otpMaxAttempts: int(env.ONBOARDING_OTP_MAX_ATTEMPTS, 5),
      sessionAbsoluteMs: int(env.ONBOARDING_SESSION_ABSOLUTE_MS, 7 * 24 * 3600 * 1000), // 7 d
      sessionIdleMs: int(env.ONBOARDING_SESSION_IDLE_MS, 12 * 3600 * 1000), // 12 h
      originChallengeMs: int(env.ONBOARDING_ORIGIN_TTL_MS, 24 * 3600 * 1000), // 24 h
    },
    rate: {
      // Per-email OTP requests per rolling window (Rust decides via the DB count).
      otpPerEmailMax: int(env.ONBOARDING_OTP_PER_EMAIL_MAX, 5),
      otpPerEmailWindowMs: int(env.ONBOARDING_OTP_PER_EMAIL_WINDOW_MS, 3_600_000), // 1 h
      // Per-IP coarse cap across all onboarding endpoints (in-memory RateLimiter).
      perIpMax: int(env.ONBOARDING_RATE_PER_IP_MAX, 40),
      perIpWindowMs: int(env.ONBOARDING_RATE_PER_IP_WINDOW_MS, 600_000), // 10 min
    },
  };
}

// A one-line, secret-free readiness view for /health and boot logs. NEVER includes the pepper or key —
// only booleans about their presence, so operators can see misconfiguration without leaking anything.
export function onboardingHealth(cfg) {
  return {
    enabled: cfg.enabled,
    email_provider: cfg.email.provider,
    pepper_configured: cfg.pepper.length > 0,
    resend_key_configured: cfg.email.resendApiKey.length > 0,
    cookie_secure: cfg.cookie.secure,
    allowed_origins: cfg.allowedOrigins.length,
  };
}
