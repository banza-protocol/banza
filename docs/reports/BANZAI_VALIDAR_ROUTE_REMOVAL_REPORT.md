# `/banzai/validar` Permanent Route Removal (M2.19E/F.2)

**The parallel validation route is deleted — a hard 404 with no redirect, rewrite, alias, sitemap or service-worker trace.**

**Status:** COMPLETE + LIVE — 2026-07-29

## What was removed

- The route folder `website/app/banzai/validar/` (its `page.tsx` and the standalone `ValidationWorkbench` component) — deleted, not redirected.
- The guard that pinned the old surface, `tools/check-banzai-operator-validation-workbench.sh` (~70 lines), was removed (PR #224).

`website/app/banzai/` now contains exactly one file — `page.tsx` — and no route subfolders. Validation is a **mode** of `/banzai` (`?mode=validation`), not a route.

## Absence of any residual reference

Verified in the repository (active surfaces, excluding vendored `/wasm/`):

| Vector | Result |
|---|---|
| Redirect / rewrite / alias in `website/middleware.ts` and `website/next.config.*` | none (the literal `banzai/validar` appears nowhere, comments included) |
| Internal links / imports (`banzai/validar`, `ValidationWorkbench`) across `website/**` | **0** |
| Sitemap `website/app/sitemap.ts` | lists `/banzai` only; no `/banzai/validar` |
| Service worker | **no service worker exists** in the project — nothing to precache the dead route |
| Operador Zero CTAs | all point to `/banzai?mode=validation…`; **0** point to `/banzai/validar` |

`middleware.ts` sends `/banzai` to the apex and handles a different retired apex surface (`/operador-zero` → 410); it contains **no** `/banzai/validar` handling — the path simply has no route and falls through to Next.js's 404.

## Production 404 QA (public edge)

| Request | Result |
|---|---|
| `GET /banzai/validar` | **HTTP 404 · 0 redirects · no `Location` header** |
| `GET /banzai/validar?target=operator-zero&workflow=full` | **HTTP 404 · 0 redirects · no `Location` header** |
| `GET /banzai`, `?mode=ask`, `?mode=validation&target=operator-zero&workflow=full` | **200 · 0 redirects** (all three) |

No soft-redirect, no alias, no rewrite: a stale/shared `/banzai/validar` link fails cleanly rather than silently resurrecting the removed surface.

## Enforcement

`tools/check-banzai-single-interface.sh` fails the build on any regression via:
- assertion 1 — no `website/app/banzai/validar/` route folder;
- assertion 2 — `website/app/banzai/` holds only `page.tsx` (no subfolders, no extra files);
- assertion 3 — `banzai/validar` appears in no middleware/`next.config`/app file (comments included);
- assertion 4 — no internal link/import to `banzai/validar` or `ValidationWorkbench`;
- assertion 7 — `/banzai/validar` is not in the sitemap.

A self-test plants each violation to confirm the detectors fire.

Metrics (§39): `banzai_validar_route_files = 0` · `banzai_validar_redirects = 0` · `banzai_validar_rewrites = 0` · `banzai_validar_internal_links = 0` · `banzai_validar_operator_zero_links = 0` · `banzai_validar_sitemap_entries = 0` · `banzai_validar_service_worker_entries = 0`.

## Provenance

- Base (rollback): `rollback-pre-m2-19ef2-banzai-canonical-interface` → `6acc799`
- PR #224 → `e9959d1` (route removed); PR #225 → `5b57cc4` (guard realignment, CI 169/0)
- Deployed (repo `5b57cc4`): website `sha256:7539d7ae…`, banzai-api `sha256:738997a0…`
- Shared evidence: `docs/reports/M2_19EF2_PRODUCTION_VALIDATION_REPORT.md`

**Verdict:** COMPLETE. `/banzai/validar` is permanently a 404 with no redirect, rewrite, alias, internal link, sitemap entry or service-worker trace, enforced by a build-blocking guard with a self-test.
