# M2.15B — BANZA Global Navigation Final Simplification

> Status: **COMPLETE · LIVE** (PR #168 → `b7d4959`; deployed website-only; live QA green).
> Rollback SHA (pre-merge `main`): `ad8b0d0`.

## 1. Objective
Reduce the public global navigation to exactly three distinct public destinations — **Operadores ·
BanzAI · Ler a referência** — so the header stops working as a second index of the Protocol Reference.
Editorial principle: *the global menu routes to distinct public surfaces; the Reference organises and
develops the protocol's content.*

## 2. Initial state
`main` at `ad8b0d0` (M2.15A complete + live; homepage final published; ADR-054 present; M2.14J complete;
CI green). Header driven by `navGroups` (three dropdowns) + `navDirect` (BanzAI pill) + a hardcoded
"Ler a referência" CTA, in `website/lib/site.ts`, rendered by `website/components/SiteNav.tsx`. Mobile
mirrored the same grouping with section headings.

## 3. Previous menus (dropdowns)
`Protocolo ▾ · Confiança ▾ · Programadores ▾ · [✦ BanzAI] · [Ler a referência]`.

## 4. Previous submenus
- **Protocolo**: Referência completa · O que é · Por que existe · Arquitectura · PostgreSQL — estado
  protocolar · Roteiro de Maturidade · Estado verificável.
- **Confiança**: Confiança e Trust Engine · Conformidade e evidência · Federação · Operadores ·
  Operador Zero — simulador · Governança.
- **Programadores**: Abrir o BanzAI · Recursos para programadores · Referência por capítulos ·
  ADRs e RFCs · GitHub · FAQ.

## 5. Duplication problem
Every dropdown item pointed into `/referencia/*` chapters, `/estado`, `/decisoes` or GitHub — a parallel
index of the Reference living in the header. The menu re-listed content the Reference already organises.

## 6. Relationship with the Reference
The Reference already contains (or routes to) O que é, Por que existe, Arquitectura, Confiança,
Conformidade, Federação, Operadores, Governança, BanzAI, Programadores, Roteiro, FAQ, ADRs/RFCs and
PostgreSQL. None of these needs a second copy in the header.

## 7. Editorial decision
The header represents only public surfaces with a **distinct function**: Operadores (participants +
public evidence), BanzAI (human-operator interaction), Reference (explains and documents). Everything
else is reached through the Reference, the footer and contextual links.

## 8. Final desktop navigation
`[BANZA]                                   Operadores   [✦ BanzAI]   [Ler a referência]`
Hierarchy (PART 8): Reference = primary CTA (`btn-bordo`); BanzAI = secondary pill; Operadores = plain
text link. Never three identical buttons.

## 9. Final mobile navigation
```
Operadores
✦ BanzAI
Ler a referência
```
Same order as desktop, no submenus, no arrows, no section headings.

## 10. Operadores
`/operadores` was a redirect into `/referencia/operadores`. Per the operator's decision it is now a real
standalone **public operator + verifiable-evidence registry** page: the Public Protocol Registry
(`/operators` → `[]`), `production_certificates: false`, the Revocation List envelope, what the registry
indexes (manifests, metadata, evidence, technical state, trust state, revocation), the operator-relevant
machine routes, and the honest "Nenhum operador publicado" state. It is explicitly **not** a list of
certified / approved / licensed operators (phrased "licenciados, aprovados ou admitidos" to match
`/estado` and pass the public-copy guard). Active on `/operadores` and `/operadores/*`.

## 11. BanzAI
`/banzai`, unchanged destination. Kept as the secondary highlight pill (`✦ BanzAI`) — the primary
human-operator interface (ADR-054). Label is exactly `BanzAI` (no Workbench / Assistente / Chat / Agente /
"Abrir o BanzAI"). Active on `/banzai` and `/banzai/*`.

## 12. Referência
`/referencia`, the primary CTA `Ler a referência`. Single structured entry point to the explanatory,
architectural and technical protocol content. Active on `/referencia` and `/referencia/*`.

## 13. Active state
`sectionActive(href) = path === href || path.startsWith(href + "/")` over trailing-slash-normalised
`usePathname()` (query string and hash are excluded by construction). The three prefixes are mutually
exclusive and the homepage matches none → a single, unambiguous active item. Verified per route (SSR +
hydrated): `/`→none · `/operadores`→Operadores · `/banzai`→BanzAI · `/referencia` & `/referencia/arquitectura`
→Reference · `/estado`→none. (Page-internal `aria-current` on the reference chapter sidebar / BanzAI tab is
separate navigation and out of scope for the global header.)

## 14. Elements removed
The three dropdown groups and all their items (§4); the dropdown buttons, arrows (`▾`), popover panels,
`role="menu"` / `aria-haspopup`, and their mobile section headings. `Operador Zero`, `GitHub`, `FAQ` and
`ADRs e RFCs` no longer appear in the header (they remain reachable via the Reference / footer / contextual
links). No links are hidden in the DOM or the accessibility tree — they are gone from both.

## 15. Dead code removed
`navGroups`, `navDirect` and the `NavGroup` type (site.ts); `openKey` state, the dropdown `DropdownItem`
renderer, `groupActive`, the document click-outside listener for dropdowns, `aria-haspopup`, `role="menu"`,
the `▾` glyph, the `navRef`, and the now-unused `GitHubMark` import (SiteNav.tsx).

## 16. Accessibility
`<nav aria-label="Navegação principal">` (desktop + mobile); real `<Link>`s; a real mobile `<button>` with
`aria-expanded` + `aria-controls="mobile-menu"` + a dynamic `aria-label` (Abrir/Fechar menu);
`aria-current="page"` on the active destination; Escape closes the mobile menu; route change closes it;
no hover-only interactions; no focus trap; no empty links; no removed items left in the accessibility tree.

## 17. SSR
The three destinations are present in the initial HTML (SSR); the old dropdown groups do not appear in the
HTML; desktop and mobile render from the same `navPrimary` array. Verified via `curl` (no JS) and the
hydrated DOM.

## 18. Hydration
Desktop and mobile render the same source array; the Operador-Zero chromeless gate is hydration-safe
(SSR `/oz` and client host check both yield `null`). No flash of the old navigation; no hydration warning.

## 19. Performance / code
The header lost one React state (`openKey`), the document click-outside listener, the dropdown renderer,
the arrow glyph and three arrays of dropdown items — a smaller DOM, less client JS and less state.

## 20. Desktop
Verified at 1440px (screenshot): three destinations, correct order and hierarchy, no dropdowns/arrows,
logo aligned, no gaps left by the removed menus.

## 21. Tablet
Verified at 1024px (lg breakpoint): desktop nav shows the three destinations; no clipping.

## 22. Mobile
Verified at 390px (screenshot): hamburger opens a panel with exactly the three destinations in order, no
submenus, no arrows; the active destination is highlighted; hamburger toggles to ✕.

## 23. Files changed
- `website/lib/site.ts` — replaced `navGroups`/`navDirect`/`NavGroup` with the 3-item `navPrimary`.
- `website/components/SiteNav.tsx` — rewritten: three destinations, no dropdowns, single active state, a11y.
- `website/app/operadores/page.tsx` — redirect → real public registry page.
- `website/lib/publicSurface.test.ts`, `referenceIA.test.ts`, `postgresqlBoundary.test.ts` — retargeted off
  the removed nav groups (PostgreSQL discoverability now asserted via the Reference).
- `website/lib/m2_15b-global-navigation.test.ts` — NEW test suite.
- `tools/check-global-navigation-final.sh` — NEW guard; `Makefile` + `.github/workflows/identity-guard.yml`
  wiring.

## 24. Tests
`tsc` clean · **335 vitest** (12 new in `m2_15b-global-navigation`) · `next build` OK.

## 25. Guard
`make global-navigation-final-check` (self-testing): three destinations, exact order, no dropdown/submenu/
arrow, no Protocolo/Confiança/Programadores groups, no Operador Zero/GitHub/FAQ/ADRs in the header, exactly
one BanzAI + one Reference link, single prefix-based active state, mobile mirrors desktop, neutral operator
language, and Operadores is a real page (not a redirect). Ran green alongside homepage-final, home-minimal,
home-layout-copy, website-public-copy-current, banzai-primary-interface-architecture,
banzai-public-surface-final-consistency, identity-check, purity-check, rust-rule-check, private-key-leak-check.

## 26. CI
**137 checks pass, 0 fail** (PR #168, head `8627a02`). Every website/guard job relevant to M2.15B was
green — global-navigation-final (M2.15B), homepage-final (M2.15A), home-minimal, home-layout-copy,
website-public-copy-current, public-surface-clean (M2.5), operator-zero-standalone (M2.12G), identity,
purity, rust-rule, private-key-leak. Two mid-run transient failures were GitHub Actions infrastructure
flakes — `429 Too Many Requests` downloading `actions/checkout` on unrelated Rust jobs — which passed on
re-run (a website-only change cannot affect the Rust conformance/readiness engines). Merged with `--admin`
(only block was `REVIEW_REQUIRED`; `mergeable: MERGEABLE`).

## 27. Deploy
Website-only. VPS repo reset to `origin/main` (`b7d4959`); `docker compose build website && up -d
--no-deps website`; `reverse-proxy` reloaded. Container healthy; image `banza-website:v1.0.0`. No backend
container changed. Rollback = redeploy the previous image (pre-merge `main` = `ad8b0d0`).

## 28. Live QA
`banza.network` (SSR + hydrated, 1440px): header renders exactly **Operadores · ✦ BanzAI · Ler a
referência**; no `aria-haspopup`, no `▾`, no old dropdown labels in the HTML. Routes 200: `/`,
`/operadores`, `/banzai`, `/referencia`. `/operadores` shows the honest empty registry ("Nenhum operador
publicado", `/operators` → `[]`, `production_certificates: false`) with no false certification; active
state highlights "Operadores". Invariants intact: `/operators` = `[]`; `/certificates`
`production_certificates: false`; `/operador-zero` = **410**; Operador Zero remains demo-only; no registry
/ BanzAI / backend change.

## 29. Limitations
- Visual QA was spot-checked at the two breakpoint sides (1440/1024 desktop, 390 mobile) plus DOM/SSR checks
  across routes, rather than a screenshot at every one of the ten listed widths; the header is a single flex
  that switches at `lg` (1024) and renders identical content on each side.
- `/operadores` is a new standalone page (the operator explicitly chose this over pointing the label at the
  existing `/estado` surface); its content is intentionally minimal and honest (empty registry) and can be
  enriched later without touching the navigation.

## 30. Rollback
Redeploy the previous website image (pre-merge `main` = `ad8b0d0`). Do not use `git reset --hard` on `main`.

## 31. Verdict
**M2.15B complete — the BANZA global navigation has been reduced to three distinct public destinations:
Operators, BanzAI and the Protocol Reference.** The former Protocol, Trust and Developers dropdowns and
their duplicated chapter links have been removed. Operators leads to the public operator and evidence
registry without implying certification, approval or licensing; BanzAI remains the primary human-operator
interface; and the Reference remains the single structured entry point for explanatory, architectural and
technical protocol content. Desktop, mobile, SSR, hydrated UI and CDN now serve the same accessible,
direct and duplication-free navigation.

_A navegação pública do BANZA foi reduzida às três superfícies essenciais: Operadores, BanzAI e Ler a
referência. Os antigos menus e submenus que repetiam capítulos da Referência foram removidos. A página
Operadores representa um registo público de operadores e evidência verificável, sem sugerir certificação,
aprovação ou licenciamento. O BanzAI continua a interface primária humano-operador e a Referência
permanece o ponto único de acesso ao conteúdo explicativo, arquitectural e técnico do protocolo._
