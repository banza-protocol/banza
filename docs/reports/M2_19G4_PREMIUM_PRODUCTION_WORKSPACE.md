# M2.19G.4 — Premium Production Workspace, Operator Context and Implementation Validation UX

**Status: READY FOR HUMAN REVIEW** — awaiting `APROVADO PARA MERGE E DEPLOY`.
This milestone is **not** merged and **not** deployed. No production state has changed.

- **Branch:** `release/m2-19g4-premium-production-workspace`
- **Governance:** ADR-070 — Navigable contexts in the single BanzAI interface (closed, server-resolved route segments)
- **next_free_adr:** ADR-071
- **NEXT milestone (NOT started, preserved):** M2.19H — Scheme + regulatory readiness

---

## 1. What shipped

`/banzai` remains the **single** human-operator interface (ADR-054, ADR-067) — one shell, one
always-mounted session. What changed is that the operator workspace now exposes its three **navigable
contexts** as real, addressable, server-resolved route segments:

| Context | Route | What it is |
|---|---|---|
| Global | `/banzai` (+ legacy `?mode=`) | the session entry: ask · validation Fase 0 · onboarding |
| Operator | `/banzai/operador/[operatorId]` | a selected operator — pick a published implementation |
| Implementation | `/banzai/operador/[operatorId]/[implementationId]` | the 9-step validation journey over that implementation |

Each segment is a **closed slug** (`isClosedId`), validated **server-side** (`notFound()` on a bad
shape), resolved through the throw-free `parseBanzaiState` choke-point against the **closed** registry —
never a caller-supplied URL (ADR-068 §4.6/§4.7 preserved). Browser back/forward moves between contexts;
the contexts are deep-linkable; a stale/off-registry id falls back to the global context honestly
(D-070-03). The legacy `?mode=/?target=/?workflow=/?step=/?doc=/?q=/?view=guia` deep links stay valid and
canonicalise to a segment (D-070-04).

The single in-memory session (conversation, validation selection + receipts, onboarding candidature)
**survives navigation between contexts** because the always-mounted shell is mounted once in the shared
`app/banzai/layout.tsx` via `BanzaiWorkspaceProvider`; each segment page is a thin `BanzaiRouteBinder`
that publishes its server-resolved state to that shell (D-070-02d). This refines — does **not** revert —
the "single interface" reading of ADR-067 D-067-02.

### Phase map (F0–F10)

- **F0** ADR-070 (governance) + repo-guards ADR range → 1..=70 + build plan.
- **F1** `check-banzai-single-interface` updated: assertion #2 → a closed ADR-070 allowlist
  (`layout.tsx`, `page.tsx`, `operador/[operatorId]/[implementationId]` only) + an anti-conflation
  assertion (no `camada`/`layer`/`nível de certificação` on the context surface, D-070-05).
- **F2** `parseBanzaiState(sp, pathSeed)` → `BanzaiContext` + `BanzaiPathSeed`; atomic
  `useValidationSession.selectTarget`; provider + binder + layout + two segment pages; `BanzaiAgent`
  consumes reactive `routeState`, syncs mode/context and reflects a Fase-0 selection back into the URL.
- **F3** the three contexts are live (global picker → operator context → implementation journey).
- **F4** `BanzaiContextTrail` — a `CONTEXTO` breadcrumb (global › operador › implementação); each crumb
  a real closed-slug route; word "contexto" only (D-070-05 anti-conflation).
- **F5** the sidebar engine line is **derived from real `/ask` telemetry** (`engine_state` +
  `external_model_called`) — the configured default is honestly qualified "por omissão" until a response
  confirms it ("confirmado nesta resposta"); an external call is surfaced honestly, never hidden.
- **F6** copy: softened onboarding jargon "Emitir desafio de origem" → "Preparar prova de origem".
  ORIGIN_PENDING already reads "Origem por verificar"; the verify CTA already "Verificar origem".
- **F7** legacy deep-link compatibility preserved (same choke-point; `?target=` canonicalises to a segment).
- **F8** full guard battery green (single-interface, operator-experience, operator-validation-mode,
  primary-interface, operator-zero-*, identity/contamination, IA, corpus-integrity, vocabulary,
  accessibility). ADR-070 re-indexed into the BanzAI grounding (doc-index + WASM rebuilt/re-vendored →
  corpus 71/71 discoverable+resolvable+citable; vocabulary regenerated, unresolved=0).
- **F9** tests: `banzaiState.test.ts` +7 path-seed/context cases; `m2_19g4-navigable-contexts.test.ts`
  (new) route-shape + safety + anti-conflation + runtime-truth; two stale specs reconciled. Website
  vitest 436/436; Rust query-core 201+ tests; `next build` clean (all three `/banzai` routes dynamic).
- **F10** visual QA at desktop + mobile (below); PR opened for human review.

---

## 2. Load-bearing decisions the reviewer should confirm

1. **"Validar operador" mode label is PRESERVED** (not renamed to "Validar implementação"). It is
   ADR-068 §4.1 canonical and hard-locked by `check-banzai-operator-validation-mode-check` (which
   explicitly rejects "Validar implementação"); the workspace header already reads "Validação técnica de
   implementação". The operator is the responsible entity; the implementation is the evaluated object —
   operator ≠ implementation is preserved. If §25 intends the sidebar label itself to change, that is a
   governed change and the human reviewer should direct it (it would need the guard + ADR-068 §4.1
   updated together).
2. **`?mode=validation` canonicalises to `/banzai/operador/operator-zero`** because Operador Zero is the
   default (and, per ADR-053, only) demo operator, so it seeds the operator context. This is the intended
   progressive disclosure (land in the operator's context with the implementation picker).
3. **SSR of a deep-linked segment first paints the global default for one client tick**, then the binder
   applies the segment context via an isomorphic layout effect (no visible flash on the client; the
   in-memory session is empty on a fresh deep link anyway, and the operator name requires the async
   registry fetch regardless).

## 3. Preserved (charter §"Preservar")

`next = M2.19H` · all existing §9 security (server-side authz/ownership, session isolation, CSRF Origin
allowlist, rate-limit, single-use nonces + expiry, SSRF/DNS-rebind Rust fetcher, audit log, `__Host-`
cookie SameSite=Strict, PG persistence) · the data model (session→operators→implementations, no
self-FK) · the Rust engines · PostgreSQL · the closed registry · the "Registo Técnico" name · BanzAI as
the single interface with no decisive authority · operator ≠ implementation · validation ≠ certification
≠ admission ≠ authorisation. M2.19H is **not** started.

## 4. Visual QA (local)

Verified at desktop (1280×800) and mobile (375×812): the `CONTEXTO` breadcrumb, restyled nav, validation
workspace, right-hand context/boundary panel, and the F5 engine status all render and stack responsively;
mobile collapses to the hamburger nav with the breadcrumb legible.

> Caveat: the local dev server has no `banzai-api` backend, so the registry fetch returns the honest
> "não foi possível carregar o registo técnico" fallback and the operator/implementation names show their
> slugs. The fully-data-loaded premium state (operator display names, the 9-step run, receipts) requires
> the deployed backend — which the human reviewer sees after `APROVADO PARA MERGE E DEPLOY` + deploy.

## 5. Gate

**M2.19G.4 FINAL — READY FOR HUMAN REVIEW.** Do not merge or deploy until `APROVADO PARA MERGE E DEPLOY`.
On approval: merge → deploy website (+ rebuilt banzai-api WASM) → public-edge + browser E2E QA →
declare COMPLETE + LIVE → STOP (do not start M2.19H).
