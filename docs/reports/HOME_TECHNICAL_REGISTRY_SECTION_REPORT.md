# HOME — Technical Registry Section Report ("Quem faz parte do protocolo", M2.19G.2 §14–19)

- **Milestone:** M2.19G.2 — Home Canonicalization, Reference Route Consolidation & Public Navigation Cleanup
- **Base commit:** `fffa9f7`
- **Branch:** `release/m2-19g2-home-reference-route-canonicalization`
- **Rollback tag:** `rollback-pre-m2-19g2-home-reference-canonicalization`
- **Date:** 2026-07-30
- **Status:** RUNNING — source-grounded; live facts **PENDING (finalized at deploy)**
- **Primary files:** `website/components/home/OperatorRegistry.tsx`, `website/lib/protocolStatus.ts`,
  `website/app/page.tsx`

---

## 1. What the section now is

The registry section appears **immediately after** the public-status band (§6). It is the public Technical
Registry surface on the Home: an eyebrow, the kept title, a single boundary paragraph, three registry-derived
metrics, and the single published implementation card (Operador Zero), plus one section CTA.

## 2. Final texts

- **Eyebrow:** `REGISTO TÉCNICO · PÚBLICO`
- **Title (kept):** `Quem faz parte do protocolo`
- **Boundary (stated once, not per-card):** `O Technical Registry publica operadores, implementações e estados
  técnicos verificáveis. Nesta secção, "fazer parte" significa possuir uma publicação técnica consultável; não
  significa admissão num scheme, certificação activa ou autorização regulatória.`
- **Metrics (registry-derived):** `{prodCount} operadores de produção publicados` · `1 implementação de
  referência` (accent) · `0 certificações técnicas activas`.
- **Operador Zero card:** `Operador Zero` / `Implementação canónica de referência`, with fields
  `operator_id=operator-zero`, `implementation_id=operator-zero-ref-impl`, `ambiente=demonstração`,
  `superfície=read-only`, `origem=endpoints públicos`, `fundos reais=desactivados`,
  `certificação=NOT_CERTIFIED`, `validação=disponível no BanzAI`; link → `https://zero.banza.network/`.
- **Empty-state line (when no production operators):** `Nenhuma outra implementação está publicada neste momento.`
- **Section CTA (only):** `Consultar o Technical Registry` → `/registo-tecnico`.

## 3. Data origin (sourced, never decorative)

- `prodCount` = live `GET /operators` (public, no auth) length, or `REGISTRY_SUMMARY.productionOperators` (0)
  when the fetch is empty/unavailable.
- `1 implementação de referência` = `REGISTRY_SUMMARY.referenceImplementations`.
- `0 certificações técnicas activas` = `REGISTRY_SUMMARY.activeCertifications`.
- **Operador Zero is never in the `GET /operators` list** and is never counted as a production operator, an
  active participant, or an active certification.

## 4. Operator ≠ implementation counting (§15/§16)

Operador Zero counts only as the **reference implementation**, never as a production operator / active
participant / active certification / commercial integration. The metric "operadores de produção publicados"
is 0 and excludes OZ.

## 5. What was removed (PRE-G2 → after)

| Before (`fffa9f7`) | After |
|---|---|
| Eyebrow `REGISTO DE OPERADORES · PÚBLICO` (pulsing green dot) | `REGISTO TÉCNICO · PÚBLICO` |
| Horizontal **marquee** of operator cards | removed |
| Empty placeholder cards ("Sem operador / registo vazio", ×5, doubled) | removed |
| Counters `0 Certificados` · `0 Em conformidade` · `00 Operadores registados` | `… operadores de produção publicados` · `1 implementação de referência` · `0 certificações técnicas activas` |
| OZ card fields "demo, só leitura · não certificado", level `KZ_DEMO` | typed dl fields (see §2), `certificação=NOT_CERTIFIED` |
| Closing line "Nenhum operador está certificado hoje…" | "Nenhuma outra implementação está publicada neste momento." |

## 6. Components removed / added

- **Removed:** the marquee (`data-marquee` loop), the `FALLBACK`/`decorate`/`cards` machinery, the empty-card
  generator, the zero-padded `opCount`, and the pause/play hover handlers.
- **Added:** the `Metric` component, the `OZ_FIELDS` typed field list, and a simple `GET /operators` fetch that
  populates only real production operators.

## 7. §42 metrics carried here

`home_operator_zero_production_counts=0` · `home_empty_operator_cards=0` — **source-verified**.
Also supports `home_primary_ctas=1` (the section CTA is not a second hero CTA; the only hero CTA is
"Validar operador no BanzAI", and this section's single CTA is "Consultar o Technical Registry").

## 8. Guards / tests

- Guarded by `website/lib/m2_19g2-home.test.ts` §14–19: the registry metrics distinguish production operators /
  reference implementation / active certifications, and the section precedes "Três camadas" in the band order
  (§6). The prior home tests were converged to the G2 contract by the implementer.

## 9. PENDING (finalized at deploy)

- Live `GET /operators` value at deploy · the rendered registry section · PR number · merge commit ·
  deploy image digests · screenshots · browser matrix · request-ids · cache/CDN state ·
  service-worker state (none) · rollback confirmation.
