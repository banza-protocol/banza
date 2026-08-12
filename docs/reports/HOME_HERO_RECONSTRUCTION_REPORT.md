# HOME — Hero Reconstruction Report (M2.19G.2)

- **Milestone:** M2.19G.2 — Home Canonicalization, Reference Route Consolidation & Public Navigation Cleanup
- **Base commit:** `fffa9f7`
- **Branch:** `release/m2-19g2-home-reference-route-canonicalization`
- **Rollback tag:** `rollback-pre-m2-19g2-home-reference-canonicalization`
- **Date:** 2026-07-30
- **Status:** RUNNING — source-grounded; live facts **PENDING (finalized at deploy)**
- **Primary file:** `website/app/page.tsx`

---

## 1. What the hero now is

The hero is a two-column band: a copy column (eyebrow → h1 → short definition → 3 indicators → one CTA) and a
conceptual **operator ≠ implementation** interoperability diagram. It no longer contains the manifest-testing
form, the extra value-proposition line, or an inline institutional phrase.

## 2. Final texts

- **Eyebrow (kept):** `PROTOCOLO FINANCEIRO ABERTO · v1.0`
- **Title (h1):** `Regras públicas para uma interoperabilidade financeira verificável.`
  (`<h1 id="hero-title">`; the section is `aria-labelledby="hero-title"`; the accent word "verificável." is
  italic bordô.)
- **Paragraph (short definition):** `O BANZA é um protocolo financeiro aberto que permite a operadores publicar
  implementações e os respectivos endpoints públicos, demonstrar conformidade e verificar interoperabilidade
  através de perfis versionados e evidência reproduzível.`
- **Indicators (exactly 3):** `Endpoints públicos` · `Motores Rust determinísticos` · `Resultados rastreáveis
  por evidência` — rendered as `<ul aria-label="O que o protocolo oferece">`; each glyph and separator is
  `aria-hidden`.
- **Single CTA:** `Validar operador no BanzAI` → `/banzai?mode=validation` (no OZ preset / target / workflow /
  query params).

## 3. Conceptual diagram

- Two nodes distinguish operator from implementation: `Operador A / Implementação A1` and
  `Operador B / Implementação B1` (`PairNode` component).
- Centre: `Perfil BANZA v1.0` / `Regras públicas e versionadas`.
- Four state chips: `manifest verificado`, `assinatura válida`, `profile compatível`,
  `evidence ligada à origem`.
- Badge changed `ILUSTRATIVO` → `CONCEPTUAL`.
- **Mandatory legend:** `Diagrama conceptual: implementações independentes verificam identidade, profiles e
  evidência através de regras públicas comuns. Não representa participantes activos nem pagamentos reais.`
- The PRE-G2 four-operator ring (Operador A/B/C/D + "signature valid"/"trust: verified" chips) is removed so
  the graphic cannot read as an active scheme, a real network, or real payments.

## 4. Components removed / added

- **Removed:** the `ManifestTester` import + usage; the `OperatorCard` and `flowDots`(ring) helpers tied to the
  old four-operator diagram; the extra serif value-proposition `<p>`; the inline institutional-phrase line.
- **Added:** the `PairNode` helper and the `HERO_INDICATORS` data array.
- **Deleted file:** `website/components/home/ManifestTester.tsx` (see `M2_19G2_PRODUCTION_VALIDATION_REPORT.md`).

## 5. Before → after (source-grounded)

| Element | Before (`fffa9f7`) | After |
|---|---|---|
| h1 | "Interoperabilidade financeira em Angola, sem reconstruir integrações técnicas bilaterais." | "Regras públicas para uma interoperabilidade financeira verificável." |
| paragraph | "O BANZA define regras públicas, perfis versionados, testes de conformidade, verificação de interoperabilidade e certificação técnica para implementações independentes." | see §2 |
| value-prop line | "Implementar uma vez. Demonstrar conformidade. …" | **removed** |
| indicators | "Regras públicas e verificáveis" · "Interoperabilidade verificável" · "Confiança técnica por evidência" | "Endpoints públicos" · "Motores Rust determinísticos" · "Resultados rastreáveis por evidência" |
| manifest form | "TESTAR UM MANIFESTO" island | **removed** |
| CTA | scattered (tester + downstream) | single "Validar operador no BanzAI" → `/banzai?mode=validation` |
| diagram | 4 operators (A–D) ring, "ILUSTRATIVO" | 2 operator≠implementation nodes, "CONCEPTUAL" + legend |

## 6. §42 metrics carried by the hero

`home_primary_ctas=1` · `home_manifest_forms=0` · `home_manual_url_inputs=0` ·
`home_value_proposition_extra_blocks=0` — all **source-verified**.

## 7. Guards / tests

- The hero is guarded by the new `website/lib/m2_19g2-home.test.ts`: §10 (exactly one hero CTA "Validar
  operador no BanzAI"), §15 (the manifest-testing form is gone), §9 (the three hero indicators). The prior
  home tests (`m2_16-home.test.ts`, `m2_17-homepage.test.ts`) were converged to the G2 contract by the
  implementer (m2_17 now asserts the Home does **not** contain `href="/o-que-e"`).

## 8. PENDING (finalized at deploy)

- PR number · merge commit · deploy image digests · rendered hero screenshots (desktop + mobile) ·
  browser matrix · request-ids · cache/CDN state · service-worker state (site ships none) ·
  rollback confirmation (`rollback-pre-m2-19g2-home-reference-canonicalization`).
