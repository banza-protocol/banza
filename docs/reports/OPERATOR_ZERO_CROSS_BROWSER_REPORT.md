# Operador Zero — Cross-Browser Routing (M2.19E/F, §19)

**Root cause:** the reported Chrome/tool redirect of `zero.banza.network` → `banza.network` was a
HISTORICAL client-cached permanent redirect from before the M2.12E host-aware rewrite. The current server
emits **no permanent cross-host redirect**.

**Server behaviour (source, guard-enforced by `operator-zero-cross-browser-routing-check`):**
- zero apex `/` → **rewrite** to the internal `/oz` (HTTP 200), never a redirect.
- `/<artifact>.json` → rewrite to the read-only handler.
- `/banzai*` → **307 temporary** to the apex (never 301/308).
- `/operador-zero*` → **410 Gone** on every host, never redirected.
- No 301/308 anywhere in `middleware.ts`.

**Live edge probe (pre-deploy, `curl https://zero.banza.network/`):** HTTP 200, `num_redirects=0`,
served via `x-middleware-rewrite: /oz`, **no service worker** (`/sw.js` etc. → 404), Chrome-UA identical.
Post-deploy cross-browser + public-edge results are recorded in `M2_19EF_PRODUCTION_VALIDATION_REPORT.md`.
