# BanzAI Accessibility & Mobile Report (M2.19E/F.2)

**What was verified — build-level, structural, and live render — for the single BanzAI shell. Stated honestly, including what was not exhaustively audited.**

**Status:** VERIFIED (scoped) — 2026-07-29

## Scope of verification (read this first)

This report covers what was actually checked for this milestone. It is **not** a full automated Lighthouse / axe / WCAG 2.x conformance audit — no such audit was run. The evidence here is:

1. **Build-level** — `tsc` clean, `vitest` 366/366, `next build` produced the single `/banzai` route; CI (#225) 169/0.
2. **Structural** — code review of the accessibility affordances in `BanzaiAgent.tsx` / `BanzaiValidationMode.tsx` (roles, ARIA, focus, semantics) listed below.
3. **Live render** — the production single shell renders both modes correctly; the full 9-step journey was executed in-shell.

## Theme

The single shell uses **one consistent light "bordo/paper" theme across both modes** — switching Perguntar ↔ Validar never changes the visual shell. This is a deliberate single-theme design; the project ships **no** `prefers-color-scheme` / dark-mode variant for this surface (verified: no `dark:` utilities or `prefers-color-scheme` rules in the BanzAI components or `globals.css`). "Theme-aware" here means mode-consistent, not multi-theme. Colour is carried on semantic tokens (`bordo`, `paper`, `ink-*`, `ok`, `pend`), not literal hex in the flow.

## Keyboard & focus (structural)

- Consistent visible focus rings: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40` on mode buttons, tabs, step nav, chips and links.
- Current-state semantics: `aria-current="step"` on the active journey step, `aria-current="page"` on the active tab/mode.
- Conversation input: `aria-label="Pergunte ao BanzAI"`; Enter to send, Shift+Enter for newline; icon buttons carry `aria-label` (Enviar, etc.).
- Native controls (`<button>`, `<a>`, `<textarea>`, `<ol>/<li>`) — keyboard-operable by default; the step spine is a semantic ordered list.

## Screen reader & motion (structural)

- `sr-only` H1 on the page ("BanzAI — interface primária…") and on the shell.
- The "thinking" indicator uses `role="status"` + `aria-live="polite"` with one stable announcement; the rotating visual line is `aria-hidden`.
- `usePrefersReducedMotion` is honored: reduced motion → a single static line, no rotation, no animated dots (`motion-safe:` used for bounce).
- Receipt JSON blocks are focusable (`tabIndex={0}`) with descriptive `aria-label` so they are keyboard-scrollable and announced.

## Mobile & overflow (structural + live)

- **Responsive reflow (not a hamburger drawer — stated honestly).** The three-column desktop grid (`lg:grid lg:grid-cols-[…]`) collapses on narrow screens to a single stacked flex column, reordered via `order-*` so the workspace comes first (`order-1`), then the context panel (`order-2`), then the sidebar (`order-3`). There is no off-canvas drawer / hamburger; the panels stack. All three regions are independently `overflow-y-auto`.
- **No horizontal overflow.** Wide content is contained: the receipt/journey JSON `<pre>` blocks use `overflow-auto` scroll containers; hashes and ids use `break-all` / `break-words`; sizing uses relative units and `clamp()` for padding and type. The page body is not designed to scroll horizontally.
- Fluid type via `clamp()` on headings; touch targets are real buttons with padding.

## Verified vs. deferred (honest)

| Verified | How |
|---|---|
| Compiles, tests pass, single route builds | `tsc` / vitest 366/366 / `next build` / CI 169/0 |
| ARIA roles, `aria-current`, `aria-label`, `role="status"`/`aria-live`, `sr-only` present | code review |
| Reduced-motion honored | code review (`usePrefersReducedMotion`) |
| Focus-visible rings on interactive controls | code review |
| Responsive stacking + scroll containment | code review + live render |
| Full journey usable in-shell | live QA (9/9, RECEIPTS(9)) |

| Deferred / not claimed | Note |
|---|---|
| Full Lighthouse / axe automated audit | not run this milestone |
| WCAG 2.x AA conformance sign-off | not formally assessed |
| Colour-contrast ratio measurement | not measured (single light theme; not audited numerically) |
| Assistive-tech testing (VoiceOver/NVDA) | not performed |
| Dark-mode / `prefers-color-scheme` | not implemented (single-theme by design) |

## Provenance

- Base (rollback): `rollback-pre-m2-19ef2-banzai-canonical-interface` → `6acc799`
- PR #224 → `e9959d1`; PR #225 → `5b57cc4` (CI 169/0)
- Deployed (repo `5b57cc4`): website `sha256:7539d7ae…`, banzai-api `sha256:738997a0…`
- Shared evidence: `docs/reports/M2_19EF2_PRODUCTION_VALIDATION_REPORT.md`

**Verdict:** VERIFIED (scoped). The single shell is structurally accessible (semantic controls, ARIA current-state, live-region status, reduced-motion, visible focus) and responsive (stacked reflow, scroll-contained wide content, no horizontal body scroll), consistent across both modes in a single light theme. A full automated Lighthouse/axe run and formal WCAG AA sign-off were **not** performed and are recorded here as deferred rather than claimed.

---

## M2.19G.1 — Endpoint-originated validation surface (§37, invariants 26–27)

- **Milestone:** M2.19G.1 — Endpoint-Originated Operator Validation · **ADR:** ADR-068
- **Branch:** `release/m2-19g1-endpoint-originated-operator-validation` · **Base:** `a272d32`
- **Scope of this section:** the rebuilt validation surface —
  `website/components/banzai/BanzaiValidationMode.tsx`, `DraftValidationTool.tsx`,
  `ProgramadoresTools.tsx`, the shell `BanzaiAgent.tsx`, `website/app/banzai/page.tsx`. The M2.19E/F.2
  sections above (theme, keyboard/focus, screen-reader/motion, deferred items) are **unchanged**; this
  section appends the a11y & mobile invariants the M2.19G.1 rebuild introduces, now **guarded on every
  push/PR** rather than only code-reviewed.

### New: guarded accessibility invariants

`tools/check-banzai-accessibility-check.sh` (`make banzai-accessibility-check`, self-testing, fail-closed)
locks:

| # | Invariant | Where |
|---|---|---|
| 1 | exactly one `<h1>` (an `sr-only` H1) | `website/app/banzai/page.tsx` |
| 2 | the sidebar `<nav>` carries an `aria-label` | shell `BanzaiAgent.tsx` |
| 3 | Fase 0 operator/implementation selectors use `aria-pressed` | `BanzaiValidationMode.tsx` |
| 4 | step / sub-view controls use `aria-current` | `BanzaiValidationMode.tsx` |
| 5 | the journey step list marks the current step `aria-current="step"` | `BanzaiValidationMode.tsx` |
| 6 | the draft textarea has an `aria-label` | `DraftValidationTool.tsx` |
| 7 | the draft file input is a11y-annotated (`aria-hidden="true"` + visible button control) | `DraftValidationTool.tsx` |

The state-contextual step actions (Executar esta etapa / Ver receipt / Executar novamente / Explicar este
resultado / Executar jornada completa) are real focusable `<button>`s with `focus-visible` rings; the
in-area Resultados sub-views (`RESULTS_VIEWS`) carry `aria-current` for the active view. The draft tool's
permanent banner is `role="note"`.

### New: guarded responsive invariants

`tools/check-banzai-responsive-check.sh` (`make banzai-responsive-check`, self-testing) asserts the
surface uses responsive units and carries **no** fixed multi-hundred-pixel width or `w-screen`:

1. each touched surface uses `max-w-[…]` / `clamp()` / `flex-wrap` / `sm:`|`lg:` / `grid-cols`;
2. no fixed overflow width (`w-[NNNpx]` in the hundreds, `w-screen`, `min-w-[NNNpx]`);
3. the shell grid uses **`clamp()` column tracks** (`lg:grid-cols-[clamp(…)]`) for a fluid three-pane →
   stacked layout.

The simplified surface (one mode, one journey, one Resultados area with six in-area sub-views) reflows
more cleanly on mobile than the pre-rebuild multi-tab shell: Fase 0, the journey nav and the contextual
actions use `flex-wrap`; long receipt JSON stays `overflow-auto` + focusable; dense metadata is in
`flex-wrap` grids. Column order still reflows via `order-*` (workspace first on mobile).

### Still deferred (unchanged from above)

Full automated Lighthouse/axe, formal WCAG AA sign-off, numeric colour-contrast measurement, and
assistive-tech (VoiceOver/NVDA) testing were **not** performed for M2.19G.1 either; the two new guards are
static structural gates, not a substitute for an automated audit. Live viewport + screen-reader spot-checks
are captured post-deploy in `M2_19G1_PRODUCTION_VALIDATION_REPORT.md` ("Production validation — PENDING
DEPLOY").

**M2.19G.1 verdict:** VERIFIED (scoped, guarded). The rebuilt validation surface is structurally
accessible and responsive, and — new for this milestone — those invariants are enforced by
`banzai-accessibility-check` and `banzai-responsive-check` on every push/PR. Automated Lighthouse/axe and
formal WCAG AA remain deferred rather than claimed.
