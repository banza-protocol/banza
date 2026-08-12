# ADR-070 — Navigable contexts in the single BanzAI interface (closed, server-resolved route segments)

- **Status:** Accepted
- **Date:** 2026-08
- **Milestone:** M2.19G.4
- **Related:** ADR-067 (Operador Zero read-only reference; single canonical BanzAI interface — this ADR
  refines the "single interface" reading), ADR-054 (BanzAI as the single human-operator interface, no
  decisive authority), ADR-068 (endpoint-originated validation; closed Technical Registry; operator ≠
  implementation; deep-link safety — no arbitrary URL), ADR-069 (operator onboarding; private Candidate
  Registry), ADR-065 (Technical Registry name/nature), ADR-064/066 (L2 certification profiles L0–L4,
  closed state machine), ADR-059..063 (three-layer architecture: BANZA protocol → BanzAI → operators),
  ADR-053 (Operator-Zero-only demo/example), ADR-042 (PostgreSQL as protocol-state store)

---

## Context

`/banzai` is BANZA's single human-operator interface (ADR-054, ADR-067). Historically it has been one
Next.js route (`website/app/banzai/page.tsx`) running several **modes** of one always-mounted shell —
`ask`, `validation`, `onboarding` — selected purely from client state and the query string
(`?mode=`/`?target=`/`?workflow=`/`?step=`/`?doc=`/`?q=`/`?view=guia`), parsed by the single choke-point
`parseBanzaiState`. The `check-banzai-single-interface` guard enforced this by asserting that **only
`page.tsx`** may exist under `app/banzai/` (no sub-routes), which prevented the earlier separate
validation app (the retired parallel validation route, removed in M2.19E/F.2) from ever returning.

That literal "one route file" rule now blocks a legitimate product need. The operator workspace mixes
three distinct **contexts** on one page — the global list of the session's operators, a selected
operator, and a selected implementation — and the user cannot tell which one they are in, cannot deep-link
to a specific operator/implementation, and browser back/forward does not move between contexts (only mode
+ view were ever synced to history). Making each context a real, addressable place is the fix; but it must
not reintroduce a second application, must not accept a caller-supplied URL as authority over an operator
or implementation (ADR-068 §4.4/§4.7), and must not conflate UI navigation with the ecosystem's three
**layers** (ADR-059..063) or the certification **profiles** L0–L4 (ADR-064..066).

## Decision

**D-070-01 — `/banzai` remains the single human-operator interface.** "Single interface" is defined as
**one coherent application/shell with one always-mounted session**, not literally a single route file.
This supersedes only the "one `page.tsx`, no sub-routes" reading of ADR-067 (D-067-02); it preserves the
spirit fully: there is no second BanzAI application, no separate validation route, and no distinct
workbench or standalone web surface, and BanzAI still has **no decisive authority** (it guides; the Rust
engines verify; the evidence proves; governance decides).

**D-070-02 — Navigable contexts may be real route segments** under `app/banzai/` (global → operator →
implementation), **provided that**: (a) each dynamic segment is a **closed slug** validated by
`isClosedId` (lowercase slug only — never a URL, scheme or path); (b) it resolves against the **closed
Technical Registry** or the authenticated private Candidate Registry, never against caller-supplied
content (preserves ADR-068 §4.6/§4.7); (c) it is resolved **server-side** (via the extended
`parseBanzaiState` choke-point) before render, so first paint is correct with no client flash; (d) all
segments share the **same** always-mounted session via `app/banzai/layout.tsx`.

**D-070-03 — Unknown or malformed segments fall back deterministically** to the global context (or a
honest `notFound()`), and never treat the segment value as an operator/implementation. Off-registry ids
resolve to `null` → fallback. No arbitrary URL is ever fetched from a segment.

**D-070-04 — Legacy deep links stay valid.** `?mode=`/`?target=`/`?workflow=`/`?step=`/`?doc=`/`?q=`/
`?view=guia` continue to work through the same choke-point; the new segments are **canonical and
additive**, not a replacement. Any canonicalisation of `?target=` to a segment is a non-breaking
redirect, and the query forms remain permanent aliases.

**D-070-05 — Contexts are not layers and not certification tiers (naming boundary).** The UI navigation
hierarchy **global context → operator context → implementation context** is a *navigation* concept only.
It is **not**:
- the three architectural **layers** (ADR-059..063: BANZA protocol → BanzAI → operators / the
  operational scheme layer); nor
- the certification **profiles** L0–L4 (ADR-064..066).

The interface, breadcrumbs, labels and docs MUST use the word **"contexto"** (contexto global / contexto
do operador / contexto da implementação) and MUST NOT use "camada"/"layer"/"3 camadas" for this
navigation, nor present L0–L4 as "níveis/tiers de certificação". A guard asserts the absence of these
conflations on the surface.

## Consequences

- The `check-banzai-single-interface` guard is updated: assertion #2 changes from "only `page.tsx`" to a
  **closed allowlist** of `app/banzai/` entries (`layout.tsx`, `page.tsx`, and the
  `operador/[operatorId]/[implementationId]` segment folders); the prohibitions on a second app
  (the separate validation route, the standalone web surface, the distinct workbench) are kept; the deep-link/choke-point assertions
  are extended to every segment `page.tsx`; and an anti-conflation assertion (no "camada"/"layer"/"nível
  de certificação" on the context surface) is added. No guard is bypassed silently.
- The closed-registry invariant, the closed-slug id shape, the secure Rust fetcher, and "Rust decides
  every verdict" are unchanged. Operator-Zero-only (ADR-053) is unchanged; a second real operator remains
  a governed change.
- `parseBanzaiState` gains a `pathSeed` input (segment ids) with precedence over query seeds; it remains
  the single, throw-free, allowlist-only resolver.
- The repo-guards ADR range is bumped to include ADR-070; BanzAI grounding surfaces are re-indexed.

## Alternatives considered

1. **Keep one route + client-only context state (status quo).** Rejected: no addressable operator/
   implementation, broken back/forward, ambiguous "where am I", contradicts the product goal.
2. **A second BanzAI application per context.** Rejected outright: violates the single-interface principle
   (ADR-054/067) and reintroduces exactly what removing the separate validation app fixed.
3. **Accept operator/implementation identifiers from arbitrary URLs in the path.** Rejected: violates
   ADR-068's closed-registry + no-arbitrary-URL safety (SSRF/path-traversal surface). Segments are closed
   slugs resolved server-side only.
