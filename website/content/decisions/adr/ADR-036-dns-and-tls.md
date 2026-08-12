# ADR-036 — DNS and TLS: Cloudflare proxied, Full (strict), Origin Certificate

- **Status:** Accepted
- **Date:** 2026-07

## Context
`banza.network` is managed on Cloudflare. The origin must present a trusted certificate and the
machine routes must never be cached stale or shadowed by redirects.

## Decision
- `banza.network` (and `docs.`/`banzai.` subdomains) are **proxied** through Cloudflare (orange),
  with SSL/TLS mode **Full (strict)** and a **Cloudflare Origin Certificate** on the origin nginx.
- `www.banza.network` → 301 to the apex. "Always Use HTTPS" enabled.
- **Cache bypass** for the canonical machine routes (`/.well-known/banza/*`, `/operators`,
  `/federation/*`, `/conformance/*`); normal caching for static site assets.
- **DNS cutover only after the new origin serves 200 locally** (validated with `--resolve`), to
  avoid prolonging the `521` state.

## Consequences
- Trusted TLS end-to-end (edge Universal SSL + validated origin cert).
- Machine routes are always fresh and never HTML-redirected.
- Controlled, verifiable cutover.
