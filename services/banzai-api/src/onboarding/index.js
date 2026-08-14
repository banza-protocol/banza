// Onboarding composition entry (M2.19G.3, ADR-040). Wires config → db → engine (Rust/WASM) → email
// provider → secure fetcher → service → router, and exposes the two things server.js needs: a
// secret-free health view and a single `handle(req, path, clientId)` dispatcher. Everything is lazily
// constructed so the API boots normally when onboarding is disabled or the DB is briefly unavailable.

import { loadOnboardingConfig, onboardingHealth } from "./config.js";
import * as db from "./db.js";
import * as engine from "./engine.js";
import { createEmailProvider } from "./email.js";
import { createFetcherClient } from "../fetcherClient.js";
import { createOnboardingService } from "./service.js";
import { createOnboardingRouter } from "./routes.js";
import { RateLimiter } from "../limits.js";

export function createOnboarding(env = process.env) {
  const cfg = loadOnboardingConfig(env);
  const email = createEmailProvider(cfg);
  const fetcher = createFetcherClient(env);
  const rateLimiter = new RateLimiter({
    RATE_LIMIT_MAX: cfg.rate.perIpMax,
    RATE_LIMIT_WINDOW_MS: cfg.rate.perIpWindowMs,
  });
  const service = createOnboardingService({ cfg, db, engine, email, fetcher });
  const router = createOnboardingRouter({ cfg, service, rateLimiter, engine });

  return {
    enabled: cfg.enabled,
    config: cfg,
    // Secret-free health snapshot (booleans only) — synchronous, safe for /health.
    healthSync() {
      return onboardingHealth(cfg);
    },
    // Secret-free health snapshot + live DB liveness when enabled (async).
    async health() {
      const base = onboardingHealth(cfg);
      if (!cfg.enabled) return base;
      return { ...base, db_healthy: await db.dbHealthy(env) };
    },
    handle: router.handle,
    // Exposed for the boot self-check + tests.
    engine,
    service,
  };
}
