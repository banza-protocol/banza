# HOME — Footer Report (M2.19G.2 §26)

- **Milestone:** M2.19G.2 — Home Canonicalization, Reference Route Consolidation & Public Navigation Cleanup
- **Base commit:** `fffa9f7`
- **Branch:** `release/m2-19g2-home-reference-route-canonicalization`
- **Rollback tag:** `rollback-pre-m2-19g2-home-reference-canonicalization`
- **Date:** 2026-07-30
- **Status:** RUNNING — source-grounded; live facts **PENDING (finalized at deploy)**
- **Primary files:** `website/lib/site.ts` (`footerColumns`), `website/components/SiteFooter.tsx`

---

## 1. The footer now — three groups

The footer begins immediately after the three-layer band and is the same footer on all applicable editorial
pages (it is the shared `SiteFooter`).

**Protocolo**
- `O que é o BANZA` → `/referencia/o-que-e`
- `Arquitectura` → `/arquitectura`
- `Referência` → `/referencia`
- `Estado` → `/estado`

**Implementar e validar**
- `Programadores` → `/programadores`
- `Technical Registry` → `/registo-tecnico`
- `BanzAI` → `/banzai`
- `Operador Zero` → `https://zero.banza.network/` (external, opens in a new tab)

**Governança**
- `Decisões` → `/decisoes`
- `Segurança` → `/confianca`
- `Licença` → `/licenca`
- `GitHub` → `https://github.com/banza-protocol/banza` (external)

## 2. Institutional line + boundary note

- **Institutional/version line:** `BANZA v1.0 · protocolo financeiro aberto · pré-produção`
  (replaces the PRE-G2 "Banza · v1.0 · 2026").
- **Added boundary note:** `O BANZA não movimenta fundos nem concede autorização regulatória.`
- **Kept neutrality lines:** `O BANZA não é banco, PSP, carteira ou operador financeiro.` and
  `O BanzAI não certifica, não aprova operadores e não movimenta fundos.`

## 3. What changed (PRE-G2 → after)

| Element | Before (`fffa9f7`) | After |
|---|---|---|
| columns | four: BanzAI / Protocolo / Implementação / Contacto | three: Protocolo / Implementar e validar / Governança |
| "Ler a referência" (Protocolo col) | → `/o-que-e` | replaced by "O que é o BANZA" → `/referencia/o-que-e`; "Referência" → `/referencia` |
| BanzAI column | "Abrir o BanzAI" + "Analisar um artefacto" (`?view=guia`) | folded; a single "BanzAI" → `/banzai` in "Implementar e validar" |
| Contacto column | mailto + "Governança aberta" + "Confiança" + "Licença e marcas" | replaced by "Governança": Decisões / Segurança / Licença / GitHub |
| GitHub | only in the bottom bar | now also a footer-column item with a new `f-github` icon |
| version line | "Banza · v1.0 · 2026" | "BANZA v1.0 · protocolo financeiro aberto · pré-produção" |
| boundary note | two neutrality lines | + "O BANZA não movimenta fundos nem concede autorização regulatória." |

## 4. Component changes

- `SiteFooter.tsx`: added the `f-github` `FooterIcon` case; footer links now use **positional React keys**
  (`` `${col.title}-${i}` ``) because the same icon key may repeat across items; added the third boundary
  note line; updated the bottom-bar version line.
- `site.ts`: `footerColumns` restructured to the three groups above; the footer "O que é o BANZA" points at the
  canonical `/referencia/o-que-e` (not the removed standalone `/o-que-e`).

## 5. Neutrality / boundary compliance

- Both neutrality lines are retained (operator neutrality).
- Banzami is not named in the footer; Operador Zero is labelled simply "Operador Zero" and carries its
  read-only/demo framing structurally (external `zero.*` subdomain, "Implementar e validar" grouping).

## 6. §42 metrics touched here

Footer links contain no legacy `/o-que-e` target (the "O que é o BANZA" item resolves to the canonical
`/referencia/o-que-e`), supporting `legacy_o_que_e_internal_links=0` and `reference_cta_wrong_targets=0` for the
shipped footer — source-verified.

## 7. Guards / tests

- `website/lib/m2_17a-footer-navigation.test.ts` was converged to the G2 contract by the implementer: it
  asserts the three footer groups `["Protocolo","Implementar e validar","Governança"]`, that the standalone
  "BanzAI"/"Implementação" columns are gone, and the "Implementar e validar" hrefs
  (`/programadores`, `/registo-tecnico`, `/banzai`, `https://zero.banza.network/`).
- `website/lib/m2_19g2-home.test.ts` §26 guards the three footer groups + the canonical
  introductory-definition link (`/referencia/o-que-e`).
- The footer's two neutrality lines are kept (public-surface neutrality guards).

## 8. PENDING (finalized at deploy)

- Rendered footer (desktop + mobile) · external-link `rel`/new-tab behaviour · PR number · merge commit ·
  deploy image digests · screenshots · browser matrix · request-ids · cache/CDN state ·
  service-worker state (none) · rollback confirmation.
