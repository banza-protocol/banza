# M2.19G.6 — BanzAI Monorepo Consolidation and Permanent Removal of the Separate Repository

- **Status:** Ready for human review (gate)
- **Date:** 2026-08
- **ADR:** ADR-075 (supersedes ADR-071 D-071-02)
- **Decision:** `banza-protocol/banza` (this monorepo) is the single source of BanzAI. The separate
  `banza-protocol/banzai` repository is **permanently deleted by the owner** after merge + deploy +
  validation. No history import, no archive, no legacy tree, no bundle/mirror requirement, no archive PR,
  no read-only retention, no public links to the old repo.

This is the migration manifest for M2.19G.6 (a **clean** consolidation manifest — no historical commit
inventory, authors, tags, bundles, mirrors, restore plan or archive plan).

## Monorepo baseline
- Branch: `repo/banzai-clean-monorepo-consolidation` (off `main` @ `6af8d63b`).
- Commit history: normal monorepo commits only — **zero grafted commits**, no `legacy/` tree.

## Functional elements migrated
- `engines/banzai-trace` — the financial-trace verifier extracted verbatim (identical at the
  shipped-source commit `9354795` and the separate-repo tip `8611191f`); serde-only; golden parity tests;
  WASM binding exporting **only** `trace_explain_json` (the sole export the monorepo consumes).

## Elements NOT migrated (superseded — not reintroduced)
Older TypeScript API/CLI/orchestrator/providers/RAG; `banzai-core` route/search/select_route; duplicated
`banzai-repo-guards` / `rust-rule-guard`; old workspace/`package.json`/`turbo.json`/Makefile/CI; local
infra; `PHASE_*` reports; mock-provider + light/heavy + remote-GPU docs; SDK generator; obsolete
prompts/contexts/evals/diagrams; SimB-as-current; the retired "BANZA CA". These are functionally
superseded by the monorepo's canonical engines + `services/banzai-api` (Rust-first, ADR-037).

## WASM rebuilt
`website/lib/wasm/banzai_trace*` rebuilt from `engines/banzai-trace` (`wasm-pack --target web --features
wasm`); the retired `website/lib/wasm/banzai_core*` removed; `traceVerifier.ts` rewired; parity proven.

## Coupling removed
`engines/banzai-repo-indexer` is monorepo-only (no `../banzai` input, no sibling `.git` detection, no
`BANZAI_REMOTE`, no `banzai_repo_indexed`). The committed repo-index was purged of sibling chunks by
`tools/migrations/remove-separate-banzai-repo-chunks.mjs` — idempotent, banza chunks byte-identical
(rankings unchanged), zero sibling chunks remaining; the api-kb WASM was rebuilt.

## Dependencies / references removed
Zero dependencies, fetches, clones, submodules, CI/deploy consumers, RAG/search chunks, and **zero public
links or active-surface references** presenting `banza-protocol/banzai` as an existing repository.

## Guards added / updated
`banzai-monorepo-consolidation-check` (Makefile + CI); framing guard + repo-role test retargeted to the
removal model; repo-indexer safety/coverage guards retargeted to `banzai_in_monorepo`; repo-guards ADR
range 074→075; vocabulary regenerated.

## Verification
See §16/§17 of the milestone brief — Rust fmt/clippy/test, `banzai-trace` + parity, WASM build, website
unit tests, answer-quality/ranking/citation/authority/degraded-mode, index integrity + idempotence,
canonical vocabulary, old-architecture-clean, protocol-agent, identity, purity, governance, and full CI.

## Owner deletion (manual)
After merge + deploy + validation, the owner deletes `banza-protocol/banzai` via GitHub. Tooling never
deletes it. **This versioned manifest records only the technical consolidation and the ready-for-manual-
deletion state — it is complete as-is and requires NO further change (no new commit, no new PR) after the
deletion.** The post-deletion checks (old URL returns 404; zero active links; no failing workflow; no
package/deploy depends on the URL; smoke tests pass; `main` green) are recorded **only in the final
execution report**, not by amending this repository.

## Rollback
Isolated to `repo/banzai-clean-monorepo-consolidation`; permanent only on merge. Revert = `git revert`
this PR (restores `banzai_core` WASM, the pre-purge repo-index + api-kb WASM, and the pre-consolidation
repo-indexer). Recovery does **not** depend on the separate repository continuing to exist.
