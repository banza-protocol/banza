# BANZA / BanzAI — Phase BX1.7A: Workbench Console Warning Cleanup

**Date:** 2026-07-16
**Branch:** `fix/bx1-7a-banzai-workbench-console-warnings-2026-07`
**Scope:** Remove the two pre-existing React/dev-console warnings observed on the BanzAI Workbench.
Quality/polish only — **no** change to functionality, engines, readiness, claims, routes, protocols,
contracts, WASM semantics or production state.

## Warnings reproduced (Task 1)

On `/banzai/workbench` and `/banzai/chat` (local dev build), the browser console showed:

1. **Root-layout hydration mismatch** on `<html>`:
   ```
   A tree hydrated but some attributes of the server rendered HTML didn't match the client properties…
     <html lang="pt-PT"
   +   className="__variable_… __variable_…"
   -   className="__variable_… __variable_… js" >
   ```
   The server renders `<html>` without a `js` class; a pre-hydration inline script adds one.

2. **Duplicate-key warning** in the Assistente message rendering:
   ```
   Encountered two children with the same key, `/banzai/workbench`. Keys should be unique…
   ```
   Reproduced deterministically by asking a question whose answer cites two tools that live on the
   same route (e.g. "L1 readiness é certificado?" cites both **L1 Readiness** and **SimB Pre-Review
   Gate**, both → `/banzai/workbench`). Runtime capture: `dupKeyWarnings: 4`, keys all `/banzai/workbench`.

## Root causes

1. `app/layout.tsx` renders `<html className={…fonts}>` (no `js`), then a `<body>` inline script runs
   `document.documentElement.classList.add('js')` **before** React hydrates — a standard progressive-
   enhancement pattern (`app/globals.css` gates reveal animations behind `.js [data-reveal]`). React
   then reconciles the `<html>` className it would render against the script-mutated DOM → mismatch.

2. The citation map (`engines/banzai-evidence` `c()`) maps **four** distinct citation keys — `simb`,
   `bundle`, `manifest`, `l1` — to the **same** route `/banzai/workbench`. The two link renderers in
   `components/banzai/BanzaiChat.tsx` (the in-message citation chips **and** the right-panel "CITAÇÕES"
   list) keyed on `c.href` alone, so an answer citing two workbench tools produced two React children
   with an identical key.

## Fixes

1. **Hydration** — added `suppressHydrationWarning` to the `<html>` element only. This is React's
   sanctioned handling for an attribute intentionally mutated by a pre-hydration script (the same
   approach `next-themes` uses). It is scoped to exactly `<html>` (one level deep, does not affect
   children), and the differing `js` class is **correct, intended** progressive-enhancement behaviour —
   this documents the intent rather than masking a rendering bug. The reveal-animation behaviour is
   unchanged. (Justification per Task 2: scoped to the correct element, cause understood and intentional.)

2. **Duplicate key** — both link renderers now key on `` `${c.href}|${c.label}` `` (stable content:
   route + distinct label), not the route alone. No index used. Both distinct chips still render (e.g.
   "L1 Readiness" and "SimB Pre-Review Gate" both remain, both link to `/banzai/workbench`) — nothing is
   deduplicated or dropped; only the React key is made unique.

**Changed files (2, UI only):** `website/app/layout.tsx`, `website/components/banzai/BanzaiChat.tsx`.
No engines, no WASM, no `.env`, no VERSION, no contracts, no routes.

## Verification (Task 4 + 5)

- **Browser E2E** (pristine dev server, clean console buffer): fresh load of `/banzai/workbench` →
  **no console errors** (hydration mismatch gone). Then: navigate Assistente → send a question whose
  answer cites multiple workbench tools → open Conformidade → open Programadores → back to Assistente →
  **no console errors** (`dupKeyWarnings: 0`, no other errors). Both citation chips still render in the
  message and the sources panel; the Assistente still answers correctly.
- `tsc --noEmit` ✓ · `next lint` ✓ · `next build` ✓ · `vitest` (36) ✓.
- Sweeps on the diff: no "corpus", no public "KB", forbidden claims **zero NEEDS_FIX** (the diff is
  comments + `suppressHydrationWarning` + two composite `key` expressions — no copy changes).

## Boundary / state preserved

No engine or WASM change; no readiness/claims/route/contract change; provider stays mock; `llm_calls=0`;
`/operators=[]`; `production_certificates=false`; no M2/M3; no operator created; no certificate issued.
Deploy, if any, is website-only.
