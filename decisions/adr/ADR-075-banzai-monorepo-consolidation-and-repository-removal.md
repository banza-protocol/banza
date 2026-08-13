# ADR-075 — BanzAI Monorepo Consolidation and Permanent Removal of the Separate Repository

- **Status:** Accepted
- **Date:** 2026-08
- **Milestone:** M2.19G.6
- **Supersedes:** ADR-071 D-071-02 (which framed the separate repo as a *frozen archive*; it is now
  consolidated and slated for **permanent deletion**, not retention).
- **Related:** ADR-041 (BanzAI native protocol agent), ADR-054 (BanzAI primary, transversal human
  interface — non-authoritative), ADR-037 (Rust-first official engines), ADR-072 (runtime SSOT
  `/banzai/runtime`), ADR-073 (mandatory post-synthesis validator), ADR-049/ADR-002 (ecosystem
  identity), ADR-057 (ADR clean-slate numbering)

---

## Context

BanzAI had two public homes. `banza-protocol/banza` (this monorepo) holds the strictly-newer canonical
BanzAI: the cognitive engine (`engines/banzai-query-core`), the retrieval/routing WASM
(`engines/banzai-api-kb`), the deterministic indexers (`engines/banzai-doc-indexer`,
`engines/banzai-repo-indexer`), the evidence/onboarding/operator-journey engines, and the canonical
runtime/glue (`services/banzai-api`) — all deployed from here and served at `/banzai`. The separate
`banza-protocol/banzai` repository held a superseded pre-consolidation implementation (an older
TypeScript Hono service, a CLI, one Rust `banzai-core`, mock/vLLM provider routing, and a
prompt/context/eval library); its last substantive change was 2026-07-19.

An audit (M2.19G.6) established the separate repo has **zero active dependency**: every published image
(`banzai-api`, `banza-website`, `banza-fetcher`, `verification-api`) is built from this monorepo, and
the `ghcr.io/banza-protocol/banzai-api` name is a coincidence, not a dependency. The only coupling was
build-time — `engines/banzai-repo-indexer` could index the sibling working tree. The only in-monorepo
artifact whose source lived **only** in the separate repo was the shipped financial-trace WASM
(`trace_explain_json`), used by the live `website/components/banzai/traceVerifier.ts`.

## Decision

**`banza-protocol/banza` (this monorepo) is the single source of BanzAI code, docs, contracts, tests,
evals, runtime, deployment and governance.** The separate `banza-protocol/banzai` repository will be
**permanently deleted by the owner** after this consolidation is merged, deployed and validated.

This is a **clean** consolidation — no technical inheritance for its own sake:

1. **No history import, no archive.** The separate repo's git history is **not** grafted into this
   monorepo; there is no `legacy/` tree, no historical tags, no bundle/mirror kept as a milestone
   requirement, no archive PR, no read-only archival, and no public links to the old repo. Active
   development lives here; the old repo is simply removed.
2. **Extract the one genuinely-unique, still-live element.** The financial-trace verifier is extracted
   verbatim (identical at the shipped-source commit `9354795` and the separate-repo tip `8611191f`) into
   the new crate `engines/banzai-trace`, and the shipped WASM is rebuilt from that in-tree source
   (`website/lib/wasm/banzai_trace`). The three other former `banzai-core` exports
   (route/search/select_route) were unused here and are not carried.
3. **Sever the sibling coupling.** `engines/banzai-repo-indexer` indexes only this monorepo; the sibling
   code path, the `banza-protocol/banzai` remote constant and the `banzai_repo_indexed` manifest field
   are removed. The committed repo-index is deterministically purged of sibling chunks via a documented,
   idempotent migration, since completed and its one-shot script removed, that left every
   banza chunk byte-identical (rankings unchanged — not a re-cut), and the retrieval WASM is rebuilt.
4. **Do not migrate superseded code.** The separate repo's TypeScript service, CLI, provider routing,
   RAG, prompt/context/eval library and older Rust engines/guards are **not** reintroduced (Rust-first,
   ADR-037; no second implementation). Migration happens only where there is an active consumer, a real
   gap in the monorepo, compatibility with the canonical architecture, and a test proving the need. A
   file being merely unique is not, by itself, a reason to migrate it.

## Invariants (unchanged by this consolidation)

- BanzAI is **not** a fourth layer, **not** an owner of the protocol technical engines, **not** an
  authority, **not** a certification producer, and **not** a mandatory intermediary (ADR-054/059/067).
- BanzAI has its **own cognitive engine** but invokes the protocol technical engines via **typed
  contracts** — it does not absorb or redefine them.
- **The protocol works without BanzAI.** Automatic consumers reach the public protocol interfaces
  directly; BanzAI guides, the engines verify, the evidence proves, governance decides.
- BanzAI remains the **primary, transversal human interface** (ADR-054); the canonical runtime is
  `services/banzai-api` over the Rust/WASM engines; the model is non-authoritative and local-optional.

## Consequences

- One unambiguous home; no divergent second BanzAI implementation to keep in sync.
- The shipped trace WASM is reproducible from in-monorepo source.
- BanzAI's repo-wide knowledge covers only this monorepo (`banzai_in_monorepo`); no separate repo is
  indexed, referenced, linked, or presented as existing.
- After merge + deploy + validation, the separate repository is deleted by the owner. There is no
  rollback that depends on the old repository continuing to exist; recovery is by reverting this PR.

## Risk of deletion

Deletion is safe because the audit proved zero active dependency and the only unique live element (the
trace verifier) is now in-tree with buildable source and parity tests. No code, contract, test, or
runtime behavior is lost. **Final deletion is the owner's manual action via GitHub** — it is never
performed automatically by tooling.

## Enforcement

`tools/check-banzai-monorepo-consolidation.sh` (`make banzai-monorepo-consolidation-check`) proves: no
`legacy/` snapshot, no grafted history, no archive artifacts and no second BanzAI workspace/API in HEAD;
`engines/banzai-trace` present with buildable WASM wired in-monorepo (the retired `banzai_core` WASM
gone); the repo-indexer carries no sibling remote and the manifest declares `banzai_in_monorepo` (never
`banzai_repo_indexed`) with zero embedded sibling chunks; and no active surface references
`banza-protocol/banzai` as an existing/archive/historical source. Complemented by
`banzai-canonical-architecture-framing-check`, `banzai-repository-wide-knowledge-check` and
`banzai-repo-knowledge-safety-check`.
