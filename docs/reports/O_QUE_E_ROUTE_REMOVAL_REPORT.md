# /o-que-e Route Removal Report (M2.19G.2 §27–28)

- **Milestone:** M2.19G.2 — Home Canonicalization, Reference Route Consolidation & Public Navigation Cleanup
- **Base commit:** `fffa9f7`
- **Branch:** `release/m2-19g2-home-reference-route-canonicalization`
- **Rollback tag:** `rollback-pre-m2-19g2-home-reference-canonicalization`
- **Date:** 2026-07-30
- **Status:** RUNNING — source-grounded; live facts **PENDING (finalized at deploy)**

---

## 1. What was removed

The standalone `/o-que-e` route is **deleted**. It was a real editorial intro page duplicating the reference
chapter's role; the single canonical introductory definition is now `/referencia/o-que-e`.

## 2. Removal actions (source-verified in the working-tree diff)

| Action | File | Detail |
|---|---|---|
| Delete page file | `website/app/o-que-e/page.tsx` | `git status` shows `D`; the file no longer exists. It previously exported `metadata` with `canonical: "/o-que-e"` and a title/description. |
| Remove sitemap entry | `website/app/sitemap.ts` | the `"/o-que-e"` line is removed from `ROUTES`; a comment records the removal. |
| Retarget legacy redirects | `website/next.config.mjs` | `/o-que-e-o-banza` and `/introduction` now point at `/referencia/o-que-e` (previously `/o-que-e`). |
| Remove guard allowlist entry | `engines/banza-repo-guards/src/lib.rs` | the `website/app/o-que-e/page.tsx` line is removed from `banzami_attribution_allowed`. |
| Repoint internal link | `website/app/porque-existe/page.tsx` | `MoreLink` "O que é o BANZA" now targets `/referencia/o-que-e`. |
| Nav retarget | `website/lib/site.ts` | header + footer no longer link the standalone `/o-que-e`. |

## 3. No redirect / rewrite / alias with `/o-que-e` as source

Confirmed against `website/next.config.mjs`: **no** redirect or rewrite has `source: "/o-que-e"`. The two
redirects that *mention* the string have **different sources** (`/o-que-e-o-banza`, `/introduction`) — those are
legacy inbound slugs, not `/o-que-e` — and both now point at `/referencia/o-que-e`. There is no alias,
middleware, nginx/CF/Worker rule, JS redirect, service-worker fallback, meta-refresh, deprecated page or
tombstone (the site ships no service worker at all).

Therefore `GET /o-que-e` is expected to **404** with no `Location` header.

## 4. §42 metrics carried here

- `legacy_o_que_e_route_files=0` (page deleted) — source-verified
- `legacy_o_que_e_redirects=0` (no redirect with source `/o-que-e`) — source-verified
- `legacy_o_que_e_rewrites=0` (no rewrite) — source-verified
- `legacy_o_que_e_sitemap_entries=0` — source-verified
- `legacy_o_que_e_service_worker_entries=0` (no service worker) — source-verified
- `legacy_o_que_e_internal_links=0` for shipped pages/components/sitemap — source-verified (see §6 for
  test/README residue)

## 5. Guard alignment

`engines/banza-repo-guards/src/lib.rs` — `banzami_attribution_allowed` no longer allowlists
`website/app/o-que-e/page.tsx` (the file is gone). The Banzami-attribution allowlist otherwise retains
`website/app/page.tsx` and the other current pages.

## 6. Test convergence + remaining follow-up

- **RESOLVED (by the implementer):** the new `website/lib/m2_19g2-home.test.ts` §27/§28 positively guards the
  removal — it asserts `app/o-que-e/page.tsx` does **not** exist, the Home/site config do **not** link
  `/o-que-e`, the sitemap does **not** list `/o-que-e`, and the `o-que-e` **chapter** slug still exists exactly
  once (under `/referencia/`). `m2_15b-global-navigation.test.ts` asserts zero nav items with href `/o-que-e`.
- **OF-2 (still open, cosmetic):** `website/README.md:67` still lists `/o-que-e` in a human route inventory
  (website file, out of scope here).

## 7. PENDING (finalized at deploy)

- Live `GET /o-que-e` → **404** (no `Location`) · live `GET /o-que-e-o-banza` and `/introduction` →
  308 → `/referencia/o-que-e` · PR number · merge commit · deploy image digests · request-ids · cache/CDN
  state · service-worker state (none) · rollback confirmation.
