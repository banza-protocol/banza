# BanzAI Source Realignment Report (M2.19G.2 §27–28)

- **Milestone:** M2.19G.2 — Home Canonicalization, Reference Route Consolidation & Public Navigation Cleanup
- **Base commit:** `fffa9f7`
- **Branch:** `release/m2-19g2-home-reference-route-canonicalization`
- **Rollback tag:** `rollback-pre-m2-19g2-home-reference-canonicalization`
- **Date:** 2026-07-30
- **Status:** RUNNING — source-grounded; live facts **PENDING (finalized at deploy)**

---

## 1. Summary

BanzAI grounding already cited the canonical reference chapter `/referencia/o-que-e` and **never** cited the
bare standalone `/o-que-e`, so the `/o-que-e` deletion requires no citation rewrite. The remaining action is a
repo-wide index refresh so no record points at the deleted file.

## 2. Evidence-engine citation allowlist (source-verified)

`engines/banzai-evidence/src/index.rs` — `ALLOWED_URLS` (the only URLs the engine may cite) includes:

- `/referencia` (index entry point)
- `/referencia/o-que-e` (the canonical introductory definition)
- the other `/referencia/*` chapters, `/estado`, `/operators`, `/decisoes`, `/banzai`, selected ADR routes.

There is **no** `/o-que-e` entry. `CHAPTER_SLUGS` contains `"o-que-e"` — this is the chapter-1 **slug** within
`/referencia/`, not the deleted standalone route. The test `engines/banzai-evidence/tests/kb.rs:33` references
`/referencia/o-que-e`, consistent with the allowlist.

So `banzai_legacy_o_que_e_sources=0` — source-verified.

## 3. Repo-wide index

`engines/banzai-query-core/src/doc-index.json` indexes the docs/ADR/reference corpus, **not** the Next.js page
files under `website/app/`. A search of the committed index returns **0** records whose `path` is
`website/app/o-que-e/page.tsx` (the deleted file was never indexed as a page). No citation in the index resolves
to the deleted route.

The repo-wide index artifacts were regenerated (working-tree diff shows
`engines/banzai-query-core/src/repoindex/banzai-repo-index.json`,
`banzai-repo-index-manifest.json` and `banzai-repo-index-coverage.json` modified) so the corpus snapshot no
longer carries a record for the deleted `website/app/o-que-e/page.tsx`.

## 4. Home CTA into BanzAI

The single Home hero CTA now opens the BanzAI validation mode: `Validar operador no BanzAI` →
`/banzai?mode=validation` (no target/workflow/query preset). This is consistent with the M2.19G.1
endpoint-originated validation model (Rust decides; Qwen explains) and does not pass any manifest/URL/paste
payload from the Home.

## 5. §42 metric

`banzai_legacy_o_que_e_sources=0` — source-verified (no BanzAI-grounding citation resolves to bare `/o-que-e`;
`/referencia/o-que-e` is the cited reference chapter).

## 6. Guards / tests

- `engines/banzai-evidence/tests/kb.rs` asserts the reference-chapter citation `/referencia/o-que-e` — no
  change needed.
- The reindex/vocabulary regeneration is a standard build step; the parent confirms the committed index matches
  the corpus at deploy (CI verifies the committed index).

## 7. PENDING (finalized at deploy)

- Regenerated `doc-index.json` chunk count + committed-index CI check · a live `/banzai` probe confirming
  citations resolve to `/referencia/o-que-e` and never bare `/o-que-e` · `qwen_calls` / `external_model_calls`
  = 0 on the probe · PR number · merge commit · deploy image digests (banzai-api / WASM) · request-ids ·
  cache/CDN state · service-worker state (none) · rollback confirmation.
