# HOME — Three-Layer Section Report ("Três camadas. Uma interface.", M2.19G.2 §20–24)

- **Milestone:** M2.19G.2 — Home Canonicalization, Reference Route Consolidation & Public Navigation Cleanup
- **Base commit:** `fffa9f7`
- **Branch:** `release/m2-19g2-home-reference-route-canonicalization`
- **Rollback tag:** `rollback-pre-m2-19g2-home-reference-canonicalization`
- **Date:** 2026-07-30
- **Status:** RUNNING — source-grounded; live facts **PENDING (finalized at deploy)**
- **Primary file:** `website/app/page.tsx`
- **Grounding:** ADR-059..063 (three layers, Banzami operational scheme, cert ≠ admission ≠ authorisation),
  ADR-064/066 (L2 model). Kept operator-neutral; Banzami is named only as the designated L3 scheme operator.

---

## 1. What the section now is

The three-layer band is **kept** and is the **last** main narrative band on the Home (the journey band that
used to follow the three-layer band in a different order is deleted). Eyebrow and title are unchanged; the
intro, all three layer bodies and the BanzAI transversal band are rewritten.

## 2. Final texts

- **Eyebrow:** `ARQUITECTURA · TRÊS CAMADAS`
- **Title (kept):** `Três camadas. Uma interface.`
- **Intro:** `O BANZA separa as regras do protocolo, a certificação técnica e a operação de um scheme. O BanzAI
  é a interface transversal de consulta e validação; não constitui uma quarta camada.`
- **L1 — `BANZA · Protocolo`:** `Regras públicas e versionadas para perfis, contratos, schemas, identidade,
  discovery, metadata assinada, trust, revogação e federação. O BANZA não é banco, PSP, carteira ou operador e
  não movimenta fundos.`
- **L2 — `Certificação de Conformidade e Interoperabilidade`:** `Avalia implementações específicas contra
  profiles e versões públicas através de conformidade, interoperabilidade, trust e evidência verificável. Os
  motores Rust determinam os resultados, e os estados técnicos podem ser publicados no Technical Registry. Não
  constitui licença, admissão num scheme ou autorização regulatória.`
- **L3 — `Banzami Operational Scheme`:** `Primeiro scheme previsto para adoptar o BANZA. Operadora designada:
  Banzami. Preparação regulatória em curso e pagamentos reais desactivados.`
- **BanzAI transversal band:** `BanzAI — interface transversal. Permite consultar o protocolo, iniciar a
  validação técnica das implementações publicadas por operadores e interpretar os resultados. Os motores Rust
  executam e determinam os veredictos; o Qwen apenas explica. O BanzAI não é uma camada nem uma autoridade.`

## 3. What changed (PRE-G2 → after)

| Element | Before (`fffa9f7`) | After |
|---|---|---|
| intro | "O protocolo, a certificação técnica e o esquema operacional são camadas distintas. O BanzAI atravessa as três como interface única — não é uma quarta camada." | see §2 (interface transversal de consulta e validação) |
| L1 body | named "o registo técnico" among L1's functions | leads with the versioned rules; registry is no longer L1's primary function; "não movimenta fundos" |
| L2 body | "Por implementação, baseada em evidência e decidida em Rust … Não é licença, admissão a um esquema nem autorização regulatória." | adds "os motores Rust determinam os resultados" + "estados técnicos podem ser publicados no Technical Registry"; keeps the not-licence/admission/authorisation boundary |
| L3 title/body | "Esquema Operacional" — "Operadora designada · preparação regulatória em curso · pagamentos reais desactivados." | "Banzami Operational Scheme" — names Banzami as designated operator |
| BanzAI band | "BanzAI — interface única, transversal … o Rust decide, encaminha e valida; a explicação é gerada localmente." | "Os motores Rust executam e determinam os veredictos; o Qwen apenas explica. O BanzAI não é uma camada nem uma autoridade." |

## 4. Neutrality / boundary compliance

- L2 does **not** frame certification as a certificado de operador / certificação da entidade / score / L0–L4 /
  BANZA CA / aprovação comercial.
- L1 does **not** claim the protocol is a bank/PSP/wallet/operator, and states it moves no funds.
- L3 names **Banzami** only as the designated L3 scheme operator (permitted); no KYB/AML/CFT/participants/
  settlement/M2.19H workflow detail leaks onto the Home.
- The BanzAI band drops "o Rust encaminha" and the "BanzAI Web"/Validation-Workbench framings; it is not a
  fourth layer and not an authority; no route is named in the band copy.

## 5. §42 metrics carried here

Supports `home_section_order_failures=0` (three-layer is band 5, the last main narrative band; the journey band
is gone). No node/certificate counters appear in this section.

## 6. Guards / tests

- `website/lib/m2_19g2-home.test.ts` §20–24 guards "três camadas, uma interface" (the three layer titles/bodies
  and the BanzAI transversal band).
- The Banzami attribution on `website/app/page.tsx` remains inside the repo-guards `banzami_attribution_allowed`
  allowlist (the `page.tsx` allowlist entry is retained; only the deleted `o-que-e/page.tsx` entry was removed).

## 7. PENDING (finalized at deploy)

- Rendered three-layer band · PR number · merge commit · deploy image digests · screenshots · browser matrix ·
  request-ids · cache/CDN state · service-worker state (none) · rollback confirmation.
