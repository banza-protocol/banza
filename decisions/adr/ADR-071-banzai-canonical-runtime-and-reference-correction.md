# ADR-071 — BanzAI canonical runtime architecture and reference-chapter correction

- **Status:** Accepted (D-071-01/03/04 current) · **D-071-02 and Alternative 2 superseded by ADR-075**
- **Date:** 2026-08
- **Milestone:** M2.19G.5C
- **Superseded in part:** ADR-075 supersedes the "retained historical archive" framing below — the
  separate `banza-protocol/banzai` repository is **permanently removed by the owner** after consolidation,
  not retained. Where this ADR says "archive"/"retained for history", read ADR-075: permanent removal.
- **Related:** ADR-049 (BanzAI protocol-agent core — Rust decides, model explains), ADR-055 (Rust-first
  grounded synthesis — one local-model call at the explanatory tier), ADR-054 (BanzAI as the single
  human-operator interface, no decisive authority), ADR-044 (local on-host inference runtime), ADR-041
  (native protocol agent), ADR-002 (ecosystem naming — the protocol repo vs. the knowledge-system repo),
  ADR-037 (Rust-first official engines)

---

## Context

The canonical, authoritative BanzAI runtime is `services/banzai-api` **in this repository**
(`banza-protocol/banza`): a thin TypeScript service/glue layer (I/O and transport only) over Rust engines
compiled to WASM (`engines/banzai-*`) that make every decision — routing, resolution, retrieval,
grounding and validation — plus a single local-model synthesis at the explanatory tier (ADR-055). This is
already true in code: `engines/banzai-api-kb` re-exports `banzai-query-core`, and nothing in the running
service imports the separate `banza-protocol/banzai` repository.

Several **active** surfaces, however, still carry a stale framing from an earlier era: that
`services/banzai-api` is a "mock / demonstration façade" and that the "canonical BanzAI core" lives in the
separate `banza-protocol/banzai` repository. That repository was frozen on 2026-07-19 and is consumed by
nothing; it is superseded — **permanently removed by the owner after consolidation (ADR-075)** — not the
runtime, not the deterministic core, and not a source of truth. The stale framing survives in
`services/banzai-api/README.md`,
, `services/banzai-api/src/knowledge.js`,
`website/content/BANZA_REFERENCIA.md`, `website/lib/site.ts`, and the `apps/` row of `CLAUDE.md`.

The reference chapter on BanzAI (`BANZA_REFERENCIA.md` §12) additionally contradicts itself: one passage
states "the model's reasoning is disabled" while others correctly describe a single model synthesis. A
faithful, non-contradictory description of the live pipeline (ADR-055) is required.

## Decision

**D-071-01 — `services/banzai-api` in this repository is the canonical, authoritative BanzAI runtime.** It
executes the single grounded-synthesis pipeline (ADR-055): Rust routes, resolves, retrieves, grounds and
validates; exactly one local-model call synthesises the explanation at the explanatory tier; Rust
validates the result before it is published. This refines ADR-049 and ADR-055; it supersedes neither.

**D-071-02 — `banza-protocol/banzai` is superseded (SUPERSEDED BY ADR-075).** Frozen 2026-07-19 and
consumed by nothing. ADR-075 supersedes the earlier "retained historical archive" wording and mandates the
repository's **permanent removal by the owner** after consolidation — it is not retained. No active surface
may describe it as the canonical or authoritative BanzAI core, present it as an existing/retained resource,
or describe `services/banzai-api` as a "mock" or "demonstration façade".

**D-071-03 — Correct the framing on all active surfaces.** The active copy listed in Context is corrected
to name `services/banzai-api` (this repo) as the canonical runtime and to mark any link to the frozen
archive as historical. Git history and superseded/old ADR bodies are **not** rewritten.

**D-071-04 — Rewrite `BANZA_REFERENCIA.md` §12** to describe the live single-synthesis pipeline truthfully
and consistently, removing the internal contradiction between "the model's reasoning is disabled" and "a
single model synthesis", and describing the mandatory Rust post-response validator (ADR-073). The
chapter's position in the 14-chapter order and its word budget are preserved.

## Consequences

- A new guard `banzai-canonical-architecture-framing-check` fails on "mock façade" / "canonical core lives
  in the archive" framing across the active surfaces above, and asserts that active copy names this repo's
  `services/banzai-api` as the canonical runtime. History and old ADR bodies are exempt by path.
- The repo-guards ADR range is bumped to include ADR-071. BanzAI grounding surfaces are re-indexed.
- No operator dependency is introduced: the runtime location is a statement about this open-protocol
  repository, not about any operator. The archive remains available to anyone for historical inspection.

## Alternatives considered

1. **Leave the framing as-is.** Rejected: active surfaces would keep telling operators, auditors and
   BanzAI itself that the runtime is a mock and that the real core is a frozen archive — the opposite of
   the truth.
2. **Delete the frozen `banza-protocol/banzai` archive.** Rejected: history is preserved, not erased; the
   archive is simply relabelled as historical and cited by nothing active.
3. **Move the canonical runtime into the archive to match the old framing.** Rejected outright: the
   running service, the Rust core and every consumer already live in this repository.
