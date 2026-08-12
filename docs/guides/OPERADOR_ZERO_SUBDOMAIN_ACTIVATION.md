# Operador Zero — `zero.banza.network` activation checklist

> **Status: ACTIVATED (M2.12F) + STANDALONE (M2.12G).** `https://zero.banza.network/` is the **single,
> dedicated** surface of the Operador Zero: HTTP 200, no redirect, the ten demo JSON artifacts at clean
> root paths, and its **own shell** (no global BANZA header/nav/footer). As of **M2.12G** the old apex
> route `https://banza.network/operador-zero` is **retired — `410 Gone`** (page and every `.json`
> endpoint), **never redirected** to the subdomain. The lab is served from an internal `/oz` route that
> the host-aware middleware maps the subdomain onto; that internal name is `404` at the apex. BanzAI
> stays on the apex; the subdomain redirects `/banzai` there.

The activation was authorised by the maintainer, who created the proxied DNS record. The remaining
blocker was our own origin, not Cloudflare: syncing the prepared nginx `server_name zero.banza.network`
block into the runtime and reloading the proxy. No Cloudflare Redirect/Page Rule was created or changed;
the model, tokens, timeouts, BanzAI, Postgres, Trust Root and real operators were untouched.

---

## What the 301 actually was (root-cause, corrected here)

Before activation, `https://zero.banza.network/` returned `301 → https://banza.network/` with
`server: cloudflare`. M2.12E hypothesised a Cloudflare edge redirect. **That was wrong.** With a proxied
DNS record in place, Cloudflare forwarded the request to our origin with SNI `zero.banza.network`; our
nginx had **no** matching `server_name`, so the request fell through to the **first `:443` server block
(`www.banza.network`, no `default_server` marker)**, which does `return 301 https://banza.network$request_uri`.
Cloudflare relayed that origin 301 and added its own `server: cloudflare` header — which is why it looked
like an edge redirect. The fix was purely origin-side: add the `server_name zero.banza.network` block so
the SNI matches and nginx proxies to the website instead of falling through to the www redirect.

## Activation performed (2026-07-22, M2.12F)

1. **DNS (maintainer).** `zero.banza.network` `CNAME → banza.network`, **Proxied**. Verified: resolves to
   Cloudflare edge IPs.
2. **Cloudflare rules.** Checked Redirect Rules — none relevant/active. **None created or changed.**
3. **TLS gate.** Origin cert `origin.pem` = **CloudFlare Origin CA**, SAN `DNS:*.banza.network, DNS:banza.network`
   → the wildcard covers `zero.banza.network` (valid to 2041). Gate passed.
4. **nginx.** Synced the repo `banza.conf` (with the zero block) into the runtime `conf.d` (backup
   `banza.conf.bak.m2-12f`), `nginx -t` OK, reloaded with `nginx -s reload` (zero downtime).
5. **Verify then declare.** Confirmed `https://zero.banza.network/` → 200 (lab), all ten endpoints → 200
   `application/json`, POST → 405 JSON, unknown → 404 JSON, `/banzai` → 307 apex, apex unchanged. Only
   then: created the controlled flag `infra/banza-network/ZERO_SUBDOMAIN_ACTIVE`, flipped the page/lab
   copy from "preparado, não activo" to the active statement, and redeployed the website.

---

## What is already prepared in this repository (dormant, no live effect)

1. **Host-aware routing (website).** [`website/lib/zeroSubdomain.ts`](../../website/lib/zeroSubdomain.ts)
   is a pure, unit-tested module; [`website/middleware.ts`](../../website/middleware.ts) is a thin Next
   middleware that runs it. On `Host: zero.banza.network` it:
   - rewrites `/` → `/operador-zero` (the single-page lab), and
   - rewrites each `/<artifact>.json` → `/operador-zero/<artifact>.json` (the **same** canonical handler,
     so `POST → 405` and unknown → `404` are inherited, never reimplemented), and
   - redirects `/banzai*` → `https://banza.network/banzai*` (BanzAI stays on the apex).
   On **every other host (the apex)** it is an unconditional pass-through — the apex is untouched.
   There is no duplication: the subdomain and the apex share one page and one set of handlers, so they
   cannot diverge. Enforced by `make zero-subdomain-routing-check` and `website/lib/zeroSubdomain.test.ts`.
2. **nginx server block (prepared, dormant).** A `server { server_name zero.banza.network; … }` block
   exists in [`infra/banza-network/nginx/conf.d/banza.conf`](../../infra/banza-network/nginx/conf.d/banza.conf),
   plus `zero.banza.network` on the `:80 → :443` redirect. It only `proxy_pass`es to `http://website:3005`
   with `Host` preserved — the middleware does the routing. **This block has no effect on the live site
   until the runtime nginx config is synced from the repo and the proxy is reloaded** (the reverse proxy
   reads its config from the runtime directory, a separate copy from this repo).
3. **Controlled activation flag.** The file `infra/banza-network/ZERO_SUBDOMAIN_ACTIVE` is the single
   switch the public copy keys off. It is **absent** today (dormant): while absent, the page states the
   subdomain is *prepared, not active* and makes no "live" claim (enforced by the routing guard). The
   maintainer creates it as the final activation step (7 below) so the surfaces flip together.

---

## What activating `zero.banza.network` requires (all external / maintainer-owned)

None of these are performed by this repository's build or deploy. Each is a conscious maintainer step,
in order. **Steps 1–3 need Cloudflare/DNS/TLS access this phase did not have.**

1. **DNS.** Ensure `zero.banza.network` points at the same Cloudflare-proxied origin as the apex (the
   wildcard already resolves; an explicit proxied `CNAME zero → banza.network` is clearer). Owner:
   whoever controls the `banza.network` zone.
2. **Cloudflare — remove the edge redirect.** Remove or scope the **Redirect Rule / wildcard that
   currently 301s `zero.banza.network` → `https://banza.network/`** (see the measured pre-state above),
   so requests actually reach the origin. Confirm the record is proxied (orange cloud) and the zone SSL
   mode stays **Full (strict)**.
3. **TLS at the origin.** The origin certificate `certs/origin.pem` must cover `zero.banza.network`
   (a SAN on the Cloudflare Origin Certificate, or a wildcard `*.banza.network`). Reissuing/replacing
   the origin cert is a maintainer action outside this repo.
4. **Sync the prepared nginx block to the runtime.** Copy the repo's
   `infra/banza-network/nginx/conf.d/banza.conf` (which already contains the dormant zero block) into
   the runtime nginx `conf.d`, then validate: `docker compose exec reverse-proxy nginx -t`.
5. **Deploy the website** carrying the middleware (Etapa B — already done as a dormant ship; the
   middleware only activates for `Host: zero.banza.network`, so it is safe on the apex).
6. **Reload the proxy:** `docker compose exec reverse-proxy nginx -s reload` (or
   `docker compose up -d --no-deps reverse-proxy`) only after 1–4 are done.
7. **Flip the controlled flag.** Create `infra/banza-network/ZERO_SUBDOMAIN_ACTIVE`, update the page copy
   from "prepared, not active" to the active statement, redeploy the website. The routing guard enforces
   the two states so the copy can never contradict the flag.

Until every one of 1–7 is complete, the correct statement is: *Operador Zero is available at
`https://banza.network/operador-zero`; `zero.banza.network` is prepared but not active.*

---

## Smoke tests after activation

```sh
# Root serves the lab (200, HTML):
curl -sS -o /dev/null -w '%{http_code}\n' https://zero.banza.network/                         # 200

# Root JSON endpoints (the same demo payloads as the apex), 200 application/json:
for e in .well-known/banza/operator key-manifest revocation-list conformance/evidence federation/metadata \
         evidence-bundle traces/full-e2e ledger/demo payments/demo-qr payments/demo-refund; do
  curl -sS -o /dev/null -w "$e %{http_code} %{content_type}\n" "https://zero.banza.network/$e.json"
done                                                                                          # all 200 application/json

# Writes refused, unknown artifact 404s (inherited from the canonical handler):
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://zero.banza.network/.well-known/banza/operator.json  # 405
curl -sS -o /dev/null -w '%{http_code}\n' https://zero.banza.network/nope.json                # 404

# BanzAI stays on the apex:
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://zero.banza.network/banzai    # 307 → https://banza.network/banzai

# The apex is unaffected:
curl -sS -o /dev/null -w '%{http_code}\n' https://banza.network/operador-zero                  # 200
curl -sS -o /dev/null -w '%{http_code}\n' https://banza.network/operador-zero/manifest.json    # 200
```

The same routing was verified **locally** against the standalone server with forced `Host:` headers
before shipping — apex and subdomain both behave as above. Local evidence is technical, not a claim
that the subdomain is live.

---

## Rollback (fast, low-risk)

The middleware only acts on `Host: zero.banza.network`; the nginx block is scoped by `server_name`.
Nothing touches the apex. To back out:

1. **Cloudflare:** restore the `zero → apex` redirect (or remove the DNS record). This alone stops all
   subdomain traffic reaching the origin — the fastest single revert.
2. **nginx:** remove the zero `server` block from the runtime `conf.d`, `nginx -t`, reload.
3. **Flag/copy:** delete `infra/banza-network/ZERO_SUBDOMAIN_ACTIVE` and redeploy the website so the
   page returns to "prepared, not active".
4. The website middleware may stay shipped — dormant without the subdomain host — or be reverted with a
   normal website redeploy.

---

## Guardrails that stay true whether or not the subdomain is ever activated

- Activation changes **where** the simulator is served, never **what** it is. Every demo marking
  (`demo_only`, `monetary_value: false`, `production_allowed: false`, `KZ_DEMO`), the boundary copy and
  the "PASS is local technical evidence, not certification" line are properties of the artifacts and the
  page, enforced by `make operator-zero-check`, `make operator-zero-vocabulary-contract-check`,
  `make operator-zero-public-hardening-check` and `make zero-subdomain-design-check` regardless of host.
- The subdomain and the apex serve one page and one set of JSON handlers; `make zero-subdomain-routing-check`
  fails if their endpoint lists ever diverge, if `/` stops mapping to the lab, if `POST → 405` / unknown
  `→ 404` is not preserved, or if the routing layer grows a storage/database/private-key dependency.
- The published artifacts use `https://zero.banza.network/...` URLs in their `endpoints` block
  (form-only; the protocol manifest engine checks URL *shape*, never fetches them).
- Operador Zero is **never** listed in `/operators` (ADR-052 §6), on the apex or on any subdomain.
