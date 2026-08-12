# BANZA SVG Registry

**Document ID:** BANZA-SVG-REGISTRY-001  
**Date:** 2026-06-01  
**Status:** Authoritative  
**Authority:** BANZA-SVG-GOVERNANCE-001  
**Canonical source:** `~/banza/docs/reference/BANZA_SVG_REGISTRY.md`

---

> **Política de língua (v1.0):** os diagramas do website (PT) vivem exclusivamente em
> `website/public/diagrams/` — a árvore de assets do website é a sua única casa.
> O repositório (documentação EN) usa os conjuntos ingleses em
> `docs/reference/diagrams/en/` e `docs/banzai/diagrams/` (repo BanzAI).

## M2.7E — Systemwide SVG Quality Repair (2026-07-18)

All official diagram SVGs were audited for visual quality and semantic alignment with the active model
(see [`M2_7E_SVG_QUALITY_REPAIR_AUDIT.md`](../governance/M2_7E_SVG_QUALITY_REPAIR_AUDIT.md) and
[`SVG_QUALITY_POLICY.md`](../governance/SVG_QUALITY_POLICY.md)). Machine-enforced by
`make svg-visual-quality-check` (CI job `svg-visual-quality`).

**Removed as orphans** (present in `website/public/diagrams` but embedded nowhere):

- **6 byte-duplicates** of the canonical `docs/diagrams/` copies (which remain):
  `federation-trust-evaluation-v1.svg` (SVG-P-064), `open-protocol-governance-v1.svg` (SVG-P-058),
  `operator-self-publication-flow-v1.svg` (SVG-P-059), `protocol-survival-model-v1.svg` (SVG-P-061),
  `public-protocol-registry-v1.svg` (SVG-P-065), `trust-root-v1.svg` (SVG-P-060).
- **5 unique + unused** (referenced only by historical phase reports; recoverable from git history):
  `protocol-hierarchy-v1.svg` (SVG-P-002), `protocol-core-architecture-v1.svg` (SVG-P-026),
  `trace-flow.svg` (SVG-P-042), `banzai-evidence-pipeline-v1.svg` (SVG-BZ-002),
  `banzai-repository-architecture-v1.svg` (SVG-BZ-004). Their rows below are historical; the served copy
  no longer exists.

**Repaired / redesigned in place** (14 reference-served diagrams): `banza-protocol-architecture-overview-v1.svg`
(SVG-P-057 — fixed the BanzAI label text overlap + removed `certificado BANZA`/`certificados de
produção`), `banza-trust-v1.svg` (SVG-P-031 — "Certificados" layer → signed metadata + evidence),
`banza-controlled-federation-gate-v1.svg` (SVG-P-054 — M2/M3 gate → Open Trust Evaluation / L3+),
`banza-roadmap-m1-m6-v1.svg` (SVG-P-050 — "Primeiro Operador Certificado" → "em Produção"), plus
term/clip/legibility fixes to `banza-federation-v1.svg`, `banza-developer-flow-v1.svg`,
`banza-local-execution-model-v1.svg`, `banza-operators-v1.svg`, `banza-governance-v1.svg`,
`banza-operator-conformance-lifecycle-v1.svg`, `banza-certification-v1.svg`,
`banza-boundary-protocol-operator-infra-v1.svg`, `banzai-cognitive-engine-v1.svg`,
`banzai-non-goals-v1.svg`, the three `docs/reference/diagrams/en/*` (added `<desc>`), and font bumps to two
`docs/diagrams/*` (7.5px → 8px). Broken embed `banza-vision-2030-v1.svg` (never created) removed from
`docs/reference/overview.md`.

## Registry Rules

- This registry is the single source of truth for all BANZA SVG artifacts.
- Every SVG used in the BANZA documentation or website must have an entry here.
- No SVG may be added to the website without a registry entry.
- Status changes require updating this file and committing it with the SVG change.

---

## Status Legend

| Status | Meaning |
|--------|---------|
| `KEEP` | Technically correct, no contamination, ready for use as-is |
| `UPDATE` | Architecture correct; requires text/brand/language changes |
| `REBUILD` | No longer reflects protocol reality; full replacement required |
| `NEW` | Required by the mandatory SVG set; does not yet exist |
| `CANONICAL` | Migration complete; governed artifact in canonical location |

---

## Part 1 — Mandatory Protocol SVG Set

The 25 mandatory diagrams required before frontend reconstruction may begin. Mapped to canonical file names, source SVGs, and current status.

| ID | Diagram Name | Canonical File | Source SVG | Status | Priority | Owning Document | Used By |
|----|-------------|----------------|-----------|:------:|:--------:|----------------|---------|
| SVG-P-001 | Protocol Overview | `protocol-overview-v1.svg` | `(legacy)` | **CANONICAL** `docs/reference/diagrams/protocol/` | HIGH | docs/reference/en/complete.md §1, ADR-002 | /, /introduction |
| SVG-P-002 | Protocol Hierarchy | `protocol-hierarchy-v1.svg` | `brand-architecture.svg` | **CANONICAL** `docs/reference/diagrams/protocol/` | HIGH | ADR-002 (dependency graph) | /, /governance, /architecture |
| SVG-P-003 | Architecture Overview | `protocol-architecture-overview-v1.svg` | — | **NEW** | HIGH | docs/reference/en/complete.md §9, ADR-001 | /architecture |
| SVG-P-004 | Service Topology | `service-topology-v1.svg` | `service-topology.svg` | **UPDATE** (rename + metadata) | MEDIUM | docs/reference/en/complete.md §9 | /architecture, /developer-resources |
| SVG-P-005 | Operator Architecture | `operator-architecture-v1.svg` | `(legacy)` | **UPDATE** (brand + language) | MEDIUM | docs/reference/en/complete.md §8, ADR-003 | /operators, /banzai |
| SVG-P-008 | Federation Overview | `federation-overview-v1.svg` | `federation.svg` | **CANONICAL** `docs/reference/diagrams/protocol/` | HIGH | docs/reference/en/complete.md §5, ADR-040 | /federation, / |
| SVG-P-010 | Inter-Operator Payment Flow | `inter-operator-payment-flow-v1.svg` | — | **CANONICAL** `docs/reference/diagrams/protocol/` | HIGH | docs/reference/en/complete.md §5 (Ana→Bento) | /federation |
| SVG-P-011 | Settlement Flow | `settlement-flow-v1.svg` | `settlement-lifecycle.svg` | **UPDATE** (rename + metadata) | MEDIUM | docs/reference/en/complete.md §5 | /federation, /architecture |
| SVG-P-012 | Netting Flow | `netting-flow-v1.svg` | — | **NEW** | MEDIUM | docs/reference/en/complete.md §5 (compensation) | /federation |
| SVG-P-013 | Trust Hierarchy | `trust-hierarchy-v1.svg` | — | **CANONICAL** `docs/reference/diagrams/protocol/` | HIGH | docs/reference/en/complete.md §6, ADR-038 | /trust, / |
| SVG-P-014 | Root Key Hierarchy | `root-key-hierarchy-v1.svg` | — | **CANONICAL** `docs/reference/diagrams/protocol/` | HIGH | ADR-038 (four-layer hierarchy) | /trust |
| SVG-P-015 | Key Manifest Lifecycle | `key-manifest-lifecycle-v1.svg` | — | **NEW** | MEDIUM | docs/reference/en/complete.md §6, ADR-038 | /trust |
| SVG-P-017 | BRL Lifecycle | `brl-lifecycle-v1.svg` | — | **NEW** | MEDIUM | ADR-038, docs/reference/en/complete.md §6 | /trust, /federation |
| SVG-P-018 | Operator Lifecycle | `operator-lifecycle-v1.svg` | — | **NEW** | MEDIUM | docs/reference/en/complete.md §8, ADR-021 | /operators |
| SVG-P-019 | Governance Structure | `governance-structure-v1.svg` | — | **NEW** | LOW | docs/reference/en/complete.md §10, ADR-002 | /governance |
| SVG-P-020 | Validation Studio Positioning | `validation-studio-v1.svg` | — | **NEW** | MEDIUM | BANZA_VALIDATION_STUDIO_DECOUPLING_REPORT.md | /governance, /architecture |
| SVG-P-021 | BanzAI Positioning (asset retired; the "authority chain" framing is superseded by ADR-054 — no central authority) | `banzai-authority-chain-v1.svg` | `banzai-positioning-v1.svg` | **RETIRED** (asset absent; not served) | LOW | docs/reference/pt/completa.md §8 | — |
| SVG-P-022 | Developer Integration Flow | `developer-integration-flow-v1.svg` | — | **NEW** | MEDIUM | docs/reference/en/complete.md §9 | /developer-resources |
| SVG-P-023 | SDK Architecture | `sdk-architecture-v1.svg` | `(legacy)` | **UPDATE** (brand + language) | MEDIUM | docs/reference/en/complete.md §9 | /developer-resources |
| SVG-P-024 | Security Pipeline | `security-pipeline-v1.svg` | `security-layers.svg` | **UPDATE** (brand + language) | HIGH | docs/reference/en/complete.md §6 | /trust, /architecture |
| SVG-P-025 | Audit Pipeline | `audit-pipeline-v1.svg` | — | **NEW** | LOW | docs/reference/en/complete.md §9 (financial invariants) | /developer-resources |

**Mandatory set status:**
- CANONICAL (created, in `docs/reference/diagrams/protocol/`): 8 (SVG-P-001, SVG-P-002, SVG-P-006, SVG-P-008, SVG-P-009, SVG-P-010, SVG-P-013, SVG-P-014) — SVG-P-021 RETIRED (asset absent; "authority chain" superseded by ADR-054)
- UPDATE (from existing, not yet migrated): 6 (SVG-P-004, SVG-P-005, SVG-P-007, SVG-P-023, SVG-P-024, SVG-P-011)
- NEW (no existing equivalent): 10 (SVG-P-003, SVG-P-012, SVG-P-015, SVG-P-016, SVG-P-017, SVG-P-018, SVG-P-019, SVG-P-020, SVG-P-022, SVG-P-025)

---

## Part 2 — Protocol Protocol core Technical Diagrams

Source: `~/banza/docs/images/architecture/` (dark terminal style)

| ID | Diagram Name | Canonical File | Current File | Status | Owning Document | Used By |
|----|-------------|----------------|-------------|:------:|----------------|---------|
| SVG-K-001 | Event Flow | `event-flow-v1.svg` | `event-flow.svg` | **UPDATE** (metadata + name only) | docs/reference/en/complete.md §9 | /architecture, /developer-resources |
| SVG-K-002 | Financial Trace Model | `financial-trace-model-v1.svg` | `financial-trace-model.svg` | **UPDATE** (metadata) | docs/reference/en/complete.md §9 | /developer-resources, /trust |
| SVG-K-003 | Ledger Posting | `ledger-posting-v1.svg` | `ledger-posting.svg` | **UPDATE** (metadata) | docs/reference/en/complete.md §9 (double-entry) | /developer-resources, /architecture |
| SVG-K-004 | Payment Lifecycle | `payment-lifecycle-v1.svg` | `payment-lifecycle.svg` | **UPDATE** (metadata) | docs/reference/en/complete.md §9 | /architecture |
| SVG-K-005 | Payment Request Lifecycle | `payment-request-lifecycle-v1.svg` | `payment-request-lifecycle.svg` | **UPDATE** (metadata) | docs/reference/en/complete.md §9 | /architecture |
| SVG-K-006 | Operator Model | `operator-model-v1.svg` | `provider-model.svg` | **UPDATE** ("Provider" → "Operator"; "Banza" → "BANZA"; metadata) | docs/reference/en/complete.md §8, ADR-003 | /architecture |
| SVG-K-007 | QR Payment Lifecycle | `qr-payment-lifecycle-v1.svg` | `qr-payment-lifecycle.svg` | **UPDATE** (metadata) | docs/reference/en/complete.md §4 (L1 capabilities) | /architecture |
| SVG-K-008 | Settlement Lifecycle (protocol core) | `settlement-lifecycle-v1.svg` | `settlement-lifecycle.svg` | **UPDATE** (metadata) | docs/reference/en/complete.md §5 | /architecture |

Source: `~/banza/docs/images/reference/`

| ID | Diagram Name | Canonical File | Current File | Status | Used By |
|----|-------------|----------------|-------------|:------:|---------|
| SVG-K-009 | Sandbox Architecture | `sandbox-architecture-v1.svg` | `sandbox-architecture.svg` | **UPDATE** (metadata) | /certification, /developer-resources |

---

## Part 3 — Conformance Badges (REMOVIDOS)

Source: `~/banza/conformance/badges/` — **directório removido no final transversal sweep** (badges de
estatuto foram retirados: a conformidade demonstra-se por evidência reproduzível auto-publicada, nunca
por um selo; ficheiros recuperáveis do histórico git). As linhas abaixo são históricas.

| ID | Diagram Name | Canonical File | Current File | Status | Used By |
|----|-------------|----------------|-------------|:------:|---------|
| SVG-BADGE-001 | Federation Ready Badge | `federation-ready-v1.svg` | `federation-ready.svg` | **UPDATE** (metadata) | /certification, /operators |
| SVG-BADGE-002 | Protocol Compatible Badge | `protocol-compatible-v1.svg` | `protocol-compatible.svg` | **UPDATE** (metadata) | /certification |
| SVG-BADGE-003 | Settlement Compatible Badge | `settlement-compatible-v1.svg` | `settlement-compatible.svg` | **UPDATE** (metadata) | /certification |
| SVG-BADGE-004 | Trace Compatible Badge | `trace-compatible-v1.svg` | `trace-compatible.svg` | **UPDATE** (metadata) | /certification |

---

## Part 4 — BanzAI Tool Diagrams

These diagrams are **BanzAI-specific** — they describe BanzAI's internal architecture, tools, and capabilities. They are used exclusively on `/banzai`. BanzAI is consolidated into this monorepo (ADR-075), so these assets live in this repository at `website/public/diagrams/banzai/` and `docs/reference/diagrams/protocol/banzai-*.svg` — there is no separate BanzAI repository.

All require removal of Portuguese text and operator brand contamination where present.

| ID | Diagram Name | Current File | Defects | Status | BanzAI Tool |
|----|-------------|-------------|---------|:------:|------------|
| SVG-B-001 | Agentic Research Flow | `agentic-research-flow.svg` | Operator brand | **UPDATE** | Protocol Research |
| SVG-B-002 | Autonomous Protocol Vision | `autonomous-protocol-vision.svg` | Portuguese text | **UPDATE** | Protocol Vision |
| SVG-B-003 | BanzAI Architecture | `(legacy)` | Brand + Portuguese | **UPDATE** | All tools |
| SVG-B-004 | Cognitive Layer | `(legacy)` | Portuguese | **UPDATE** | Knowledge Engine |
| SVG-B-005 | Force Multiplier | `(legacy)` | Portuguese | **UPDATE** | Knowledge System value |
| SVG-B-006 | Internal Architecture | `(legacy)` | Portuguese | **UPDATE** | All tools |
| SVG-B-007 | Knowledge Gap Model | `(legacy)` | Portuguese | **UPDATE** | Knowledge Engine |
| SVG-B-008 | Model Routing | `(legacy)` | Portuguese | **UPDATE** | Orchestrator |
| SVG-B-009 | Truth Model | `(legacy)` | Portuguese | **UPDATE** | Protocol research |
| SVG-B-010 | Certification Copilot | `certification-copilot.svg` | Brand + Portuguese | **UPDATE** | Certification Copilot |
| SVG-B-011 | Ecosystem Intelligence | `ecosystem-intelligence-layer.svg` | Brand + Portuguese | **UPDATE** | Federation Intelligence |
| SVG-B-012 | Federation Intelligence | `federation-intelligence.svg` | Brand + Portuguese | **UPDATE** | Federation Intelligence |
| SVG-B-013 | Force Multiplier Model | `force-multiplier-model.svg` | Portuguese | **UPDATE** | Knowledge System value |
| SVG-B-014 | Graph Enhanced Retrieval | `graph-enhanced-retrieval.svg` | (clean) | **KEEP** | Knowledge Engine |
| SVG-B-015 | Operator Digital Twin | `operator-digital-twin.svg` | Brand + Portuguese | **UPDATE** | Digital Twin |
| SVG-B-016 | Protocol Adoption Economics | `protocol-adoption-economics.svg` | Portuguese | **UPDATE** | Federation value |
| SVG-B-017 | Protocol Graph Architecture | `protocol-graph-architecture.svg` | Brand + Portuguese | **UPDATE** | Protocol Graph |
| SVG-B-018 | Protocol Graph Explorer | `protocol-graph-explorer.svg` | Brand + Portuguese | **UPDATE** | Graph Explorer |
| SVG-B-019 | Protocol Memory | `protocol-memory.svg` | Brand + Portuguese | **UPDATE** | Protocol Memory |
| SVG-B-020 | Protocol OS | `protocol-operating-system.svg` | Brand + Portuguese | **UPDATE** | Protocol OS overview |
| SVG-B-021 | Protocol Self-Explanation | `protocol-self-explanation.svg` | Portuguese | **UPDATE** | Knowledge Engine |
| SVG-B-022 | Protocol Simulator | `protocol-simulator.svg` | Brand + Portuguese | **UPDATE** | Protocol Simulator |
| SVG-B-023 | Quality Dashboard | `quality-dashboard-architecture.svg` | Brand + Portuguese | **UPDATE** | Quality Dashboard |
| SVG-B-024 | RAG Evaluation | `rag-evaluation-architecture.svg` | Brand + Portuguese | **UPDATE** | Quality evaluation |
| SVG-B-025 | Roadmap Architecture | `roadmap-architecture.svg` | Brand + Portuguese + stale milestones | **UPDATE** | Protocol roadmap |
| SVG-B-026 | Protocol Self-Explanation | `protocol-self-explanation.svg` | Portuguese | **UPDATE** | Knowledge Engine |

**Note:** SVG-B-014 (`graph-enhanced-retrieval.svg`) is the only BanzAI SVG with no detected contamination.

---

## Part 5 — Legacy (REBUILD or Remove)

| ID | Diagram Name | Current File | Reason | Action |
|----|-------------|-------------|--------|--------|
| SVG-L-001 | Legacy Ecosystem (operator brand) | `(legacy)` | Operator brand as primary node; inverted hierarchy | **REBUILD** → SVG-P-001 `protocol-overview-v1.svg` |
| SVG-L-002 | Legacy Brand Architecture | `brand-architecture.svg` | Brand-organized hierarchy; inverted dependency model | **REBUILD** → SVG-P-002 `protocol-hierarchy-v1.svg` |
| SVG-L-003 | Legacy Federation (Portuguese, PLANEADO) | `federation.svg` | Portuguese text; federation labeled "PLANEADO" (incorrect — federation is COMPLETE per docs/reference/en/complete.md §5) | **REBUILD** → SVG-P-008 `federation-overview-v1.svg` |

---

## Registry Summary

| Category | Total | CANONICAL | UPDATE | NEW | REBUILD |
|----------|:-----:|:---------:|:------:|:---:|:-------:|
| Mandatory Protocol Set (SVG-P-*) | 25 | 9 | 6 | 10 | 0 |
| Protocol core Technical (SVG-K-*) | 9 | 0 | 9 | 0 | 0 |
| Badges (SVG-BADGE-*) | 4 | 0 | 4 | 0 | 0 |
| BanzAI Tools (SVG-B-*) | 26 | 1 | 25 | 0 | 0 |
| Legacy/Remove (SVG-L-*) | 3 | — | — | — | 3 |
| **Total** | **67** | **10** | **44** | **10** | **3** |

**Unique existing SVG files:** 51 (some SVGs appear in multiple categories — mandatory set draws from BanzAI and protocol core SVGs)  
**New SVGs required:** 15  
**SVGs with zero defects:** 1 (`graph-enhanced-retrieval.svg`)  
**SVGs with Portuguese text:** 30  
**SVGs with operator brand contamination:** 20

---

## Canonical Source Location (Target State)

After migration, all SVGs live here:

```
~/banza/docs/reference/diagrams/
├── protocol/
│   ├── protocol-overview-v1.svg            SVG-P-001
│   ├── protocol-hierarchy-v1.svg           SVG-P-002
│   ├── protocol-architecture-overview-v1.svg  SVG-P-003
│   ├── service-topology-v1.svg             SVG-P-004
│   ├── operator-architecture-v1.svg        SVG-P-005
│   ├── federation-overview-v1.svg          SVG-P-008
│   ├── inter-operator-payment-flow-v1.svg  SVG-P-010
│   ├── settlement-flow-v1.svg              SVG-P-011
│   ├── netting-flow-v1.svg                 SVG-P-012
│   ├── trust-hierarchy-v1.svg              SVG-P-013
│   ├── root-key-hierarchy-v1.svg           SVG-P-014
│   ├── key-manifest-lifecycle-v1.svg       SVG-P-015
│   ├── brl-lifecycle-v1.svg                SVG-P-017
│   ├── operator-lifecycle-v1.svg           SVG-P-018
│   ├── governance-structure-v1.svg         SVG-P-019
│   ├── validation-studio-v1.svg            SVG-P-020
│   ├── banzai-authority-chain-v1.svg        SVG-P-021 (RETIRED — asset absent; superseded by ADR-054)
│   ├── developer-integration-flow-v1.svg   SVG-P-022
│   ├── sdk-architecture-v1.svg             SVG-P-023
│   ├── security-pipeline-v1.svg            SVG-P-024
│   └── audit-pipeline-v1.svg              SVG-P-025
├── protocol core/
│   ├── event-flow-v1.svg                   SVG-K-001
│   ├── financial-trace-model-v1.svg        SVG-K-002
│   ├── ledger-posting-v1.svg               SVG-K-003
│   ├── payment-lifecycle-v1.svg            SVG-K-004
│   ├── payment-request-lifecycle-v1.svg    SVG-K-005
│   ├── operator-model-v1.svg               SVG-K-006
│   ├── qr-payment-lifecycle-v1.svg         SVG-K-007
│   ├── settlement-lifecycle-v1.svg         SVG-K-008
│   └── sandbox-architecture-v1.svg        SVG-K-009
└── badges/
    ├── federation-ready-v1.svg             SVG-BADGE-001
    ├── protocol-compatible-v1.svg          SVG-BADGE-002
    ├── settlement-compatible-v1.svg        SVG-BADGE-003
    └── trace-compatible-v1.svg             SVG-BADGE-004
```

BanzAI SVGs are consolidated into this monorepo (ADR-075) and live at `website/public/diagrams/banzai/` and `docs/reference/diagrams/protocol/banzai-*.svg` — there is no separate BanzAI repository. They must still comply with brand and language standards.

## English README set (SVG-PE)

First diagrams of the English protocol set (BANZA-SVG-EN-001). Canonical
location: `docs/reference/diagrams/en/`. Consumed by `README.md`.

| ID | Title | File |
|---|---|---|
| SVG-PE-001 | What BANZA Defines | `banza-protocol-overview-v1.svg` |
| SVG-PE-002 | The Four Roles | `banza-ecosystem-roles-v1.svg` |
| SVG-PE-004 | Trust Hierarchy | `banza-trust-chain-v1.svg` |
| SVG-P-026 | Arquitectura do Protocolo | `protocol-core-architecture-v1.svg` | — (novo) | **CANONICAL** `docs/reference/diagrams/protocol/` | HIGH | docs/reference/pt/completa.md §4 | /arquitectura-do-protocolo |
| SVG-P-027 | Lançamento de Partidas Dobradas | `banza-ledger-posting-v1.svg` | bloco ASCII (§4) | **CANONICAL** `docs/reference/diagrams/protocol/` | HIGH | docs/reference/pt/completa.md §4 | /arquitectura-do-protocolo |

## Correcção semântica v1.0 (SVG-SEMANTIC-CORRECTION-001)

IDs reatribuídos para resolver colisões (o conjunto de confiança duplicava P-032..P-036):

| ID novo | Ficheiro | Assunto |
|---|---|---|
| SVG-P-045 | `banza-root-trust-chain-v1.svg` | Cadeia de Confiança (5 camadas) |
| SVG-P-046 | `banza-root-key-fragmentation-v1.svg` | Fragmentação da Root Key |
| SVG-P-047 | *(retirado M2.5)* | Validação de Operador (5 passos) — modelo antigo removido; substituído pela Avaliação Aberta de Confiança (`open-trust-evaluation-v1.svg`) |
| SVG-P-048 | `banza-federated-registry-v1.svg` | Registo Público Federado |
| SVG-P-049 | `banza-trust-recovery-v1.svg` | Recuperação Institucional |

## M2.2 — Open Protocol Governance

Diagramas da governação aberta: humanos mantêm o protocolo, não aprovam operadores. Nenhum destes diagramas mostra autoridade central, certificado de operador ou aprovação humana.

| ID novo | Ficheiro | Assunto |
|---|---|---|
| SVG-P-058 | `open-protocol-governance-v1.svg` | Governação aberta — maintainers, Trust Root, registo público, operadores independentes; sem aprovação humana central |
| SVG-P-059 | `operator-self-publication-flow-v1.svg` | Auto-publicação do operador — implementação → manifest → conformance tests → evidence bundle → registo → qualquer pessoa verifica |
| SVG-P-060 | `trust-root-v1.svg` | Trust Root 2-de-3 → chaves delegadas → metadados/releases/revogação; não autoriza pagamentos, operadores, licenças ou fundos |
| SVG-P-061 | `protocol-survival-model-v1.svg` | Modelo de sobrevivência — specs/código/testes/docs abertos + maintainers + operadores + comunidade; o protocolo sobrevive à equipa fundadora |

## M2.3 — Reference Trust Model Redesign

Diagramas do modelo de trust aberto (ADR-038 · ADR-039 · ADR-040). A participação de operadores
é demonstrada por conformidade protocolar verificável, não por aprovação humana central.
Nenhum destes diagramas mostra autoridade central, aprovação humana ou emissão de credenciais pela BANZA.

| ID novo | Ficheiro | Assunto |
|---|---|---|
| SVG-P-064 | `federation-trust-evaluation-v1.svg` | Federation Trust Evaluation (ADR-040) — Operador A avalia Operador B por cadeia ordenada de dez verificações: manifest → versão do protocolo → metadata assinada → conformance evidence → assinatura trust root/chave delegada → registo público → revogação → capabilities → contrato de endpoint → frescura da evidência; cada verificação tem saída fail-closed por omissão (material em falta, inválido, expirado, revogado ou incompatível para o routing); revogação é sinal de segurança, não sanção regulatória; nenhuma credencial emitida pela BANZA e nenhuma aprovação humana na cadeia |
| SVG-P-065 | `public-protocol-registry-v1.svg` | Public Protocol Registry — índice verificável de metadata e evidência: cada entrada carrega hashes de conteúdo e assinaturas (trust root / chaves delegadas) que qualquer pessoa re-verifica sozinha; índice replicável, espelhável e forkable; banda de fronteira: não é lista de operadores licenciados, aprovados ou certificados pela BANZA, e a ausência do índice não é proibição |
| SVG-P-063 | `open-trust-evaluation-v1.svg` | **Avaliação Aberta de Confiança (localizado PT, v2.0)** — cinco entradas de evidência publicada (manifesto de operador · evidência de conformidade · metadata de protocolo assinada · entrada no Registo Técnico · lista de revogação) alimentam uma única avaliação determinística de dez verificações → encaminhamento permitido ou falha fechada. O Operador B avalia o Operador A sozinho: sem árbitro central, sem pessoa no caminho, sem credencial emitida pela BANZA. Verificação 5 alinhada ao modelo de confiança congelado (ADR-079): a assinatura da evidência ancora numa **chave delegada** do Manifesto de Chaves — a Raiz de Confiança assina apenas o Manifesto, não a evidência. Caption: «A confiança é verificada por evidência, não por aprovação humana.» Embutido em §8 Operadores (Avaliação Aberta de Confiança). |

## M2.4 — Trust Engine (Signed Protocol Metadata)

Diagrama do modelo activo do trust engine (`engines/banza-trust`). O trust do protocolo é avaliado por
signed protocol metadata, delegated signing keys, operator manifest, conformance evidence, public
protocol registry e revocation/fail-closed; o `trust_status` é calculado em Rust.
Não mostra certificado, CA, aprovação humana, badge de certificado nem operador certificado.

| ID novo | Ficheiro | Estado | Assunto |
|---|---|:---:|---|
| SVG-P-066 | `protocol/trust-engine-active-model.svg` | **CANONICAL** `docs/reference/diagrams/protocol/` | Trust Engine — Active Model — seis entradas de evidência publicada (signed protocol metadata · delegated signing key · operator manifest · conformance evidence · public protocol registry · revocation list) → Trust Engine (`banza-trust`, status em Rust, ed25519 sobre a forma canónica ADR-038, cada gate fail-closed) → `TRUST_VALID` ou `FAIL_CLOSED`. Banda de fronteira: "A validação do trust não é autorização, certificação, licença nem serviço financeiro." Sem certificado, CA, aprovação, badge de certificado ou operador certificado. |

## M2.5 — Product Surface Diagrams (Active Model)

Diagramas simples das superfícies de produto, no modelo aberto activo: protocolo → operadores → evidência
→ avaliação de trust. Operadores independentes implementam o protocolo, publicam manifests e demonstram
compatibilidade por evidência verificável de conformidade. Humanos mantêm o protocolo; não autorizam,
aceitam, aprovam ou certificam operadores. Nenhum destes diagramas mostra autoridade central, BANZA CA, certificado, badge de certificação, aprovação humana ou operador certificado.

| ID novo | Ficheiro | Estado | Assunto |
|---|---|:---:|---|
| SVG-P-067 | `protocol/open-protocol-overview.svg` | **CANONICAL** `docs/reference/diagrams/protocol/` | Protocolo Aberto — Visão Geral — cadeia de quatro camadas Protocolo → Operadores → Evidência → Avaliação de Trust. Lead: "BANZA é um protocolo financeiro aberto para interoperabilidade, conformidade e evidência verificável em pagamentos." Banda de fronteira: o trust é avaliado por signed protocol metadata, delegated signing keys, public protocol registry e revocation/fail-closed; humanos mantêm o protocolo, não autorizam nem certificam operadores. |
| SVG-P-068 | `protocol/operator-journey.svg` | **CANONICAL** `docs/reference/diagrams/protocol/` | Percurso do Operador — seis etapas Implementar → Manifest (`/.well-known/banza/operator.json`) → Conformidade → Evidence Bundle → Public Registry → Trust Evaluation. Sem passo de aprovação humana entre etapas. Banda de fronteira: "Um PASS técnico é evidência verificável de conformidade, não aprovação humana, licença ou certificação." |
| SVG-P-069 | `protocol/banzai-operator-flow.svg` | **CANONICAL** `docs/reference/diagrams/protocol/` | BanzAI — Fluxo do Operador — cinco ferramentas Rust/WASM Manifest → Conformidade → Trust → Evidence → Federation Simulation; status calculado em Rust/WASM, nunca em TypeScript. Nota BanzAI: "BanzAI explica, cita e ajuda a usar as ferramentas. Não decide, não aprova, não certifica e não substitui a referência." As ferramentas verificam, não decidem. |
| SVG-P-070 | `protocol/protocol-governance-simple.svg` | **CANONICAL** `docs/reference/diagrams/protocol/` | Governação do Protocolo — Simples — três papéis: Maintainers mantêm e evoluem o protocolo (RFC, specs, contratos, releases), Operadores implementam na própria infra e publicam evidência, Ferramentas verificam em Rust/WASM. Banda de fronteira: "Humanos mantêm e evoluem o protocolo; não autorizam, aceitam, aprovam ou certificam operadores." |
| SVG-P-071 | `protocol/banza-protocol-architecture-v1.svg` | **CANONICAL** `docs/reference/diagrams/protocol/` (servido em `website/public/diagrams/protocol/`) | **Arquitectura do Protocolo BANZA (M2.7D · redesenho M2.14I/ADR-054, v2.2)** — fluxo primário humano-operador de cima para baixo: **Humanos / Operadores** → **BanzAI · interface primária humano-operador** (slate, destaque) → **Motores verificáveis** (green) + **Evidência verificável** (burgundy) → **Resultado técnico verificável**; base normativa **Governança · ADR/RFC · Referência** (gold, "define regras · decide evolução · mantém a referência") e trilho lateral máquina-a-máquina (APIs/manifests/schemas/endpoints sem depender do BanzAI). Faixa de invariantes. Frase canónica "BanzAI guia · motores verificam · evidência prova · governança decide". Sem camada de Clientes/Comerciantes; sem autoridade central nem aprovação humana; o BanzAI não certifica, não aprova, não licencia, não publica operadores nem movimenta fundos. Usado em `BANZA_REFERENCIA.md` §1. |
| SVG-P-072 | `protocol/banzai-native-protocol-agent.svg` | **CANONICAL** `docs/reference/diagrams/protocol/` (servido em `website/public/diagrams/protocol/`) | **BanzAI como Agente do Protocolo (M2.7H)** — fluxo Referência BANZA → Agente BanzAI → motores Rust/WASM → Evidence Bundle → Registry Público → pares → federação; matriz quem-faz-o-quê; proveniência das regras (RFC/ADR); fronteira (não aprova, não certifica, não licencia, não decide participação, não inventa regras, não move fundos). ADR-041. Usado em `BANZA_REFERENCIA.md` §10. |
| SVG-P-073 | `protocol/banzai-operator-journey.svg` | **CANONICAL** `docs/reference/diagrams/protocol/` (servido) | **Jornada do operador guiada pelo BanzAI (ADR-067)** — nove passos canónicos Descoberta→Manifesto→Chaves→Conformidade→Interoperabilidade→Confiança→Federação→Evidência→Prontidão. §9. |
| SVG-P-074 | `protocol/banzai-rule-provenance.svg` | **CANONICAL** `docs/reference/diagrams/protocol/` (servido) | **Proveniência das regras (M2.7I)** — RFC/ADR/Specs/Contracts→Referência→Motores→BanzAI orienta→Operador; output de IA não é regra. §10. |
| SVG-P-075 | `protocol/banzai-responsibility-matrix.svg` | **CANONICAL** `docs/reference/diagrams/protocol/` (servido) | **Quem faz o quê no BANZA (M2.7I)** — reguladores·operador·motores·BanzAI·pares·governança. §10. |
| ~~SVG-P-079~~ | ~~`operador-zero-architecture-v1.svg`~~ | **RETIRADO (M2.19G §29)** | Arquitectura do simulador (ledger fictício, arquitectura do simulador) — ficheiro removido; substituído pelo conjunto v2 SVG-P-088/089 (alvo de validação só de leitura + separação de responsabilidades). ADR-067. |
| ~~SVG-P-080~~ | ~~`operador-zero-e2e-journey-v1.svg`~~ | **RETIRADO (M2.19G §29)** | Jornada E2E de seis passos com score 100/100 — ficheiro removido; substituído por SVG-P-090 (jornada de validação de nove passos, sem score). ADR-067. |
| ~~SVG-P-081~~ | ~~`operador-zero-negative-flow-v1.svg`~~ | **RETIRADO (M2.19G §29)** | Fluxo negativo auto-executado — ficheiro removido; a referência só de leitura não executa simulação (ADR-067). |
| ~~SVG-P-082~~ | ~~`operador-zero-ledger-kzdemo-v1.svg`~~ | **RETIRADO (M2.19G §29)** | Ledger fictício KZ_DEMO — ficheiro removido; a referência só de leitura não corre ledger mutável (ADR-067). |
| ~~SVG-P-083~~ | ~~`operador-zero-architecture-mono-v1.svg`~~ | **RETIRADO (M2.19G §29)** | Variante mono (laboratório) da arquitectura do simulador — ficheiro removido; superseded pelo conjunto v2. |
| ~~SVG-P-084~~ | ~~`operador-zero-e2e-journey-mono-v1.svg`~~ | **RETIRADO (M2.19G §29)** | Variante mono da jornada E2E com score — ficheiro removido; superseded por SVG-P-090. |
| ~~SVG-P-085~~ | ~~`operador-zero-ledger-mono-v1.svg`~~ | **RETIRADO (M2.19G §29)** | Variante mono do ledger fictício — ficheiro removido. |
| ~~SVG-P-086~~ | ~~`operador-zero-negative-flow-mono-v1.svg`~~ | **RETIRADO (M2.19G §29)** | Variante mono do fluxo negativo — ficheiro removido. |
| SVG-P-087 | `protocol/banzai-single-answer-pipeline.svg` | **RETIRED** (M2.19G.5F — substituído por SVG-P-101; ficheiro removido) | **Pipeline Única de Resposta (v2.1 · ADR-055 · ADR-073)** — o esquema arquitectural do caminho único de produção de respostas: Pergunta → Encaminhador (Rust) → dois destinos { Terminais exactos (Rust, sem modelo, 0 chamadas ao modelo): facto canónico · definição · recusa de segurança · esclarecimento · evidência insuficiente \| Tronco explicativo (uma única síntese pelo modelo local): intenção resolvida (Rust) → plano + fontes (Rust) → FactualPackage (Rust) → síntese (uma chamada) → **validação dupla e obrigatória em Rust: validador factual + validador de pós-resposta (ADR-073)** } → Resposta pública. Invariante: o Rust compreende, encaminha, fundamenta e valida; o modelo explica uma única vez; zero chamadas externas. **RE-REFERENCED em M2.19G.5C-diagram** — re-embebido em `BANZA_REFERENCIA.md` §12 («Como uma solicitação é processada») como o esquema arquitectural do capítulo BanzAI; v2.0 → v2.1 acrescentou a validação de pós-resposta (ADR-073). |
| ~~SVG-P-034~~ | ~~`banza-ecosystem-v1.svg`~~ | **RETIRADO (M2.7D)** | "Arquitectura do Ecossistema" (cinco camadas incl. Clientes e Comerciantes) — modelo conceptual antigo; ficheiro removido e substituído por SVG-P-071 `banza-protocol-architecture-v1.svg`. |

## M2.19E/F — Operador Zero como implementação de referência só de leitura (alvo de validação)

Conjunto premium em tema escuro (protocol-dark) do modelo activo M2.19E/F: o Operador Zero deixou de ser
apresentado como simulador autónomo e passa a ser uma **implementação de referência só de leitura,
avaliada em BanzAI**. Estes quatro diagramas **substituem** os diagramas antigos do simulador
(SVG-P-079..086, retirados em M2.19G §29). Nenhum destes diagramas mostra simulador autónomo, ledger
mutável, execução de fluxo negativo local, `score`/`100 de 100`/`PASS demo`, `BANZA CA`, emissão de
certificados centralizados por uma autoridade, nem o Qwen a decidir ou validar — o Qwen apenas explica. ADR-052 · ADR-053.

| ID novo | Ficheiro | Estado | Assunto |
|---|---|:---:|---|
| SVG-P-088 | `protocol/operador-zero-validation-target-v2.svg` | **CANONICAL** — retirado da Referência em Ch09 (redundante com SVG-P-089 + SVG-P-090; ficheiro mantido, sem uso em §9) | **Operador Zero — alvo de validação (M2.19E/F)** — pipeline horizontal de seis fases: **BanzAI** (inicia) → **Motores Rust** (avaliam, fail-closed) → **Operador Zero** (expõe endpoints só de leitura, `GET → 200 · POST → 405`) → **Relatórios** (resultado por verificação) → **Evidence Bundle** (reproduzível) → **Registo Técnico** (publica, verificável por pares). O Operador Zero é o alvo, nunca o juiz. Banda de fronteira: "não se valida a si próprio · não movimenta dinheiro real · não emite certificado · sem simulador autónomo · sem ledger mutável · a avaliação é sempre externa, em Rust." ADR-052/053. §9. |
| SVG-P-050 | `protocol/banza-roadmap-m1-m6-v1.svg` | **REMOVIDO da superfície pública servida** — a timeline de marcos M1–M6 envelhece instantaneamente e duplicava estado (§5) e processo (§11); §14 passou a «Evolução do Protocolo», durável e sem calendário, sem figura. Retirado da Referência em Ch14 e, na reconciliação de `/roteiro`, o ficheiro foi removido de `website/public/diagrams` para não continuar servível por URL directo como segunda narrativa de roteiro | **Roteiro M1–M6 (histórico)** — cronograma de marcos do protocolo; removido por não ser conteúdo durável de Referência nem uma superfície pública admissível. O estado actual está no §5; a evolução das regras no §11. |
| SVG-P-089 | `protocol/operador-zero-separation-of-responsibilities-v2.svg` | **CANONICAL** (servido em `website/public/diagrams/protocol/`) | **Separação de responsabilidades (M2.19E/F)** — cinco papéis distintos e não substituíveis, cada um com o que faz e a sua fronteira: **Operador Zero — expõe** (endpoints só de leitura; não se valida a si próprio), **BanzAI — orquestra** (conduz, chama motores, cita fontes; não decide nem aprova), **Rust — avalia** (motores determinísticos; veredicto reproduzível, não humano), **Qwen — explica** (linguagem natural; não valida nem decide), **Registo — publica** (índice verificável de hashes/assinaturas; não é lista de admitidos). Banda: "o Operador Zero é o alvo, nunca o juiz — não se auto-valida, não emite certificado, não movimenta dinheiro real; sem autoridade central." ADR-052/053. §9. |
| SVG-P-090 | `protocol/operador-zero-validation-journey-v2.svg` | **CANONICAL** (servido em `website/public/diagrams/protocol/`; v2.1 Ch09) | **Jornada de validação — nove passos (M2.19E/F)** — sequência ordenada conduzida pelo BanzAI e avaliada em Rust a cada passo: 1 Descoberta → 2 Manifesto (`GET /manifest.json`) → 3 Chaves (metadata assinada · chaves delegadas) → 4 Conformidade → 5 Interoperabilidade → 6 Confiança (Open Trust Evaluation · fecho por omissão) → 7 Federação → 8 Evidência (evidence bundle) → 9 Prontidão para Certificação — o Operador Zero **não emite certificado** (a prontidão é evidência técnica, não uma credencial concedida). Banda (v2.1): "ambiente de demonstração: moeda KZ_DEMO, não movimenta dinheiro real · a prontidão não é uma credencial concedida · sem simulador autónomo, sem auto-validação e sem autoridade central." ADR-052/053. §9. |
| SVG-P-109 | `protocol/operador-zero-reference-vs-specification-v1.svg` | **CANONICAL** (servido em `website/public/diagrams/protocol/`) | **Referência executável, não especificação (Ch09)** — fluxo vertical do sentido normativo: **Contratos e especificações públicas** (normativos — `contracts/` · `conformance/`) → *conforma-se aos contratos* → **Operador Zero — implementação de referência** (só de leitura · demonstração · não normativa · substituível) → *expõe* → **Superfícies observáveis** (manifest · endpoints · metadata · chaves públicas · evidência · estado de certificação técnica). A direcção é sempre dos contratos para a implementação — nunca a implementação a definir os contratos (sem seta inversa). Banda de fronteira: "REFERÊNCIA EXECUTÁVEL ≠ ESPECIFICAÇÃO NORMATIVA — a norma vive nos contratos; onde divergirem, a especificação prevalece; substituível e o protocolo funciona sem ela." ADR-052/067/068. §9. |
| SVG-P-091 | `protocol/operador-zero-proof-chain-v2.svg` | **CANONICAL** (servido em `website/public/diagrams/protocol/`) | **Cadeia de prova verificável (M2.19E/F)** — seis elos encadeados por hash de conteúdo: Manifest Hash → Metadata Hash → Relatórios → Evidence Hash → Certification Record (registo assinado, não é um certificado emitido) → Registry Verification (qualquer par re-verifica sozinho). Banda de fronteira: "o encadeamento por hash torna a prova reproduzível; nenhuma autoridade central emite certificado; o Registo apenas indexa e publica; sem BANZA CA; qualquer pessoa re-verifica a cadeia de forma independente." ADR-052/053. §9. |

## M2.19G §29 — Alinhamento dos diagramas à arquitectura canónica em três camadas

Realinhamento da família de diagramas públicos do protocolo (`website/public/diagrams/protocol/*.svg`)
ao modelo activo M2.19 (ADR-059..067): três camadas **Camada 1 Protocolo aberto · Camada 2 Certificação de Conformidade e
Interoperabilidade · Camada 3 Esquemas operacionais independentes**, com o **BanzAI transversal** (não uma quarta camada); a
jornada de validação canónica de nove passos (Descoberta → Manifesto → Chaves → Conformidade →
Interoperabilidade → Confiança → Federação → Evidência → Prontidão); a emissão
Prontidão → Certification Engine → Certification Record → Registo Técnico com a máquina de estados
fechada (ADR-066); e a separação **certificação técnica ≠ admissão a esquema ≠ autorização regulatória**
(ADR-061). Nenhum diagrama apresenta conceitos retirados: autoridade central de emissão, credencial por
operador, quatro/cinco camadas, o BanzAI como camada, Validation Workbench, jornada de sete passos, o
Operador Zero como simulador, ledger interactivo, score como certificação, nem L0–L4 como níveis de
certificação (L0–L4 são âmbitos de conformidade). **O Rust decide; o Qwen explica.**

**Reescritos, mantendo id e ficheiro:** SVG-P-057 (`banza-protocol-architecture-overview-v1.svg` → arquitectura
institucional em três camadas), SVG-P-071 (`banza-protocol-architecture-v1.svg` — nota das três camadas + regra
de autoridade Rust/Qwen), SVG-P-073 (`banzai-operator-journey.svg` — nove passos canónicos), SVG-P-040
(`banza-operators-v1.svg` — L0–L4 como âmbitos de conformidade, não níveis; retirado da Referência em Ch08 — os perfis L0–L4 são agora ilustrados por SVG-P-108 em §7; ficheiro mantido, sem uso na Referência), SVG-P-041
(`banza-operator-l0-endpoints-v1.svg` — L0 âmbito de sandbox), SVG-P-044 (`banza-reference-operator-v1.svg` —
rodapé L0–L4 como âmbitos), SVG-P-050 (`banza-roadmap-m1-m6-v1.svg` — sem «Estúdio de Validação»; M4 concluído),
SVG-P-078 (`postgresql-service-access-v1.svg` — sem rota `/certificates`), SVG-P-031 (`banza-trust-v1.svg` — cinco
níveis, não camadas), SVG-P-038 (`banza-federation-v1.svg` — sem acordos bilaterais prévios entre pares), SVG-P-054
(`banza-controlled-federation-gate-v1.svg` — L3+ como âmbito de conformidade), SVG-P-029 (`banza-certification-v1.svg`
— L0–L4 como scope da conformidade).

**Novos:**

| ID novo | Ficheiro | Estado | Assunto |
|---|---|:---:|---|
| SVG-P-092 | `protocol/certification-emission-registry-v1.svg` | **CANONICAL** (servido em `website/public/diagrams/protocol/`) | **Emissão e ciclo de vida do certificado (Camada 2) (M2.19G)** — fluxo de emissão Prontidão → Certification Engine (`banza-conformance`, Rust) → Certification Record (âmbito · validade · `record_hash`) → Registo Técnico (`/operators`), e a máquina de estados fechada de ADR-066: `NOT_CERTIFIED` (base, fecho por omissão), `CERTIFIED` (único válido), `EXPIRED`, `SUSPENDED`, `SUPERSEDED`, `REVOKED` (terminal, nunca reactiva). Decidido só em Rust; nenhuma autoridade emite o certificado; nenhuma transição da Camada 2 propaga para admissão (Camada 3) nem para o regulador. ADR-064/065/066/061. §7. |
| SVG-P-093 | `protocol/certification-admission-authorisation-v1.svg` | **CANONICAL** (servido em `website/public/diagrams/protocol/`) | **Três determinações distintas (M2.19G)** — Certificado Técnico (Camada 2, motores Rust/governança BANZA) ≠ Admissão a Esquema (Camada 3, o esquema operacional) ≠ Autorização Regulatória (regulador competente, fora do protocolo); três donos distintos, o estado não propaga em nenhuma direcção; estar no Registo Técnico nunca é «admitido» nem «autorizado»; o BANZA não emite licenças nem autoriza actividade financeira. ADR-061. §7. |
| SVG-P-108 | `protocol/banza-conformance-levels-v1.svg` | **CANONICAL** (servido em `website/public/diagrams/protocol/`) | **Perfis de conformidade L0–L4 (Ch07)** — a escada cumulativa dos cinco perfis de conformidade de uma implementação: L0 Sandbox de Protocolo, L1 Capacidade de Pagamento Central, L2 Capacidade de Iniciação de Pagamento, L3 Interoperabilidade entre Operadores, L4 Interoperabilidade Externa; cada perfil acrescenta capacidades técnicas verificáveis às dos inferiores. Mede âmbito técnico cumulativo, não autoridade nem maturidade regulatória; os perfis de conformidade não são as camadas da arquitectura (§4). ADR-021/064. §7. |

## M2.19G.1 §35 — Validação originada nos endpoints (ADR-068)

Conjunto premium em tema escuro (protocol-dark) do modelo activo M2.19G.1: na jornada oficial de validação
do BanzAI, **todo o artefacto avaliado vem exclusivamente dos endpoints públicos da implementação
seleccionada** (obtidos por uma camada Rust segura, endurecida contra SSRF), e distingue-se o **operador**
(entidade responsável) da **implementação** (objecto técnico avaliado). Nenhum destes diagramas apresenta
conceitos retirados: autoridade central de emissão, credencial por operador, jornada com
conteúdo colado/carregado/URL do utilizador na via oficial, o Operador Zero como simulador autónomo ou com
atalho/fixture/bypass, quatro/cinco camadas, o BanzAI como camada, nem L0–L4 como níveis de certificação.
Regra operacional: **o operador publica · o BanzAI obtém · o Rust verifica · o receipt fixa · o Registo
publica.** ADR-068 (relacionado ADR-054/059/060/061/064/065/066/067/037/038).

| ID novo | Ficheiro | Estado | Assunto |
|---|---|:---:|---|
| SVG-P-094 | `protocol/operator-implementation-model-v1.svg` | **CANONICAL** (servido em `website/public/diagrams/protocol/`) | **Modelo operador–implementação (M2.19G.1)** — cadeia de cinco fases **Operador → Implementações → Perfis → Ambientes → Endpoints** que separa o operador (entidade responsável pela conformidade) da implementação (objecto técnico avaliado). Um operador publica muitas implementações (`1 → N`); cada implementação tem os seus próprios perfis (versão · capacidades), ambientes (sandbox · pré-produção · produção) e endpoints públicos. Banda de fronteira: «a implementação é o objecto técnico avaliado — nunca a entidade em abstracto; selecção do alvo = operador + uma implementação publicada.» ADR-068 §4.2/4.3. Embutido em §8 Operadores («Um operador, várias implementações»). |
| SVG-P-095 | `protocol/validation-target-resolution-v1.svg` | **CANONICAL** (servido em `website/public/diagrams/protocol/`) | **Resolução do alvo de validação (M2.19G.1)** — cadeia fechada **Registo Técnico → Operador → Implementação → Origem Canónica → Descoberta**. O Registo Técnico é um conjunto fechado e a única fonte de alvos; a descoberta resolve os endpoints em `/.well-known/banza`. Banda de fronteira: «registo fechado — sem URL arbitrário; a interface nunca obtém um URL do utilizador; só implementações publicadas, com origem canónica e compatíveis são elegíveis; revogadas ou sem origem, não.» ADR-068 §4.4/4.6. Embutido em §8 Operadores («Registo Técnico BANZA»). |
| SVG-P-096 | `protocol/official-validation-fetch-flow-v1.svg` | **CANONICAL** (servido em `website/public/diagrams/protocol/`) | **Fluxo de validação oficial (M2.19G.1)** — pipeline **Endpoints públicos → Obtenção segura (Rust · SSRF-hardened) → Motores Rust → Evidência → Receipts**. A camada segura resolve o host a partir do registo, força HTTPS, bloqueia redes privadas e limita tamanho/tempo; os motores continuam sem rede (recebem conteúdo já obtido); os receipts ligam o resultado ao endpoint exacto. Banda de regra operacional: «o operador publica · o BanzAI obtém · o Rust verifica · o receipt fixa · o Registo publica.» Fronteira: «sem conteúdo colado, ficheiro carregado, mock ou URL do utilizador na via oficial; fetches de protocolo contam como `protocol_fetch_count`, nunca como `external_model_calls`.» ADR-068 §4.1/4.7/4.8. §35. |
| SVG-P-097 | `protocol/draft-validation-tool-v1.svg` | **CANONICAL** (servido em `website/public/diagrams/protocol/`) | **Validação em rascunho (M2.19G.1)** — duas zonas separadas por uma barreira `✗ não liga`: à esquerda a ferramenta de rascunho local e não-autoritativa do programador (**JSON local → Validação em rascunho → `DRAFT_VALIDATION_RESULT`**); à direita a jornada oficial originada nos endpoints (**Evidence Bundle · Receipts · Registo Técnico**). Banda de fronteira: «o rascunho é local e não-autoritativo — nunca é evidência nem receipt; colar e carregar existem só na ferramenta de rascunho, separada da jornada oficial; um `DRAFT_VALIDATION_RESULT` não liga ao Evidence Bundle nem aos Receipts oficiais.» ADR-068 §4.5. §35. |
| SVG-P-099 | `protocol/banzai-cognitive-architecture.svg` | **RETIRED** (M2.19G.5F — dividido em SVG-P-100 + SVG-P-101; ficheiro removido) | **Arquitectura Cognitiva do BanzAI (M2.19G.5D · ADR-054/055/073)** — o **diagrama principal** do capítulo BanzAI (§12, «Arquitectura canónica»). `Utilizador → BanzAI` (camada de mediação não autoritativa, `authoritative:false`, com as facetas intenção · fronteiras · planeamento · recuperação · ferramentas · verificação) que **invoca três fontes distintas** — Base de conhecimento BANZA → factos e citações · Motores Rust/WASM → resultados técnicos · Modelo de linguagem local → rascunho explicativo (candidato, não é evidência) — seguidas de `verificação de afirmações e citações (Rust) → resposta fundamentada`. Uma **fronteira de autoridade** separa tudo isto da zona **fora da autoridade do BanzAI** (veredictos · recibos · evidência formal/Evidence Bundle · publicação no Registo Técnico pelo operador · pares · federação · governação aberta; admissão/autorização por entidades competentes; fundos pelo operador). O caminho directo `utilizador → modelo → resposta` é **rejeitado**. Invariante: o BanzAI guia; os motores verificam; a evidência prova; a governação decide. O SVG-P-087 (pipeline de runtime) fica como figura secundária em «Como uma solicitação é processada». |
| SVG-P-098 | `protocol/operador-zero-no-shortcut-v1.svg` | **CANONICAL** (servido em `website/public/diagrams/protocol/`) | **Operador Zero — sem atalho (M2.19G.1)** — pipeline **Registo Técnico → Operador Zero → implementação de referência → endpoints públicos → motores Rust → receipts**, com um arco tracejado e riscado a mostrar que **não existe atalho directo** do Registo para os receipts. O Operador Zero é o exemplo canónico inicial, validado pela mesma obtenção segura (SSRF-hardened) e pelos mesmos motores Rust de qualquer implementação. Banda de fronteira: «o Operador Zero não recebe atalho, fixture oficial, resultado pré-calculado nem bypass; não é um simulador autónomo; os receipts são reais e ligam aos seus endpoints; sem BANZA CA; sem autoridade central; a prontidão que resulta é evidência técnica — não uma credencial concedida.» ADR-068 §4.9. §35. |

## M2.19G.5C — Reescrita da Referência §12 (BanzAI) para a arquitectura de síntese única (ADR-071/055)

A Referência §12 (capítulo do BanzAI) foi reescrita para a arquitectura canónica de síntese única
(ADR-071 · ADR-055): os quatro embeds de diagrama do capítulo foram substituídos por prosa e por uma
matriz de autoridade de dez linhas. **Nenhum ficheiro SVG foi apagado** — todos permanecem servidos e
conformes aos guards (`svg-visual-system-check` / `svg-visual-quality-check`, que varrem por directório e
não por referência). Efeito sobre as referências:

- **`banzai-single-answer-pipeline.svg` (SVG-P-087)** — o embed foi removido de `BANZA_REFERENCIA.md` §12
  na reescrita 5C. **Reposto em M2.19G.5C-diagram** (v2.0 → v2.1): §12 tem novamente o esquema
  arquitectural do BanzAI, agora embebido em «Como uma solicitação é processada», e a v2.1 acrescenta o
  segundo validador obrigatório (validador de pós-resposta, ADR-073) ao tronco explicativo. A prosa de §12
  mantém-se; o diagrama passa a ilustrá-la. Ficheiro agora em ambas as árvores canónicas
  (`docs/reference/diagrams/protocol/` + servido em `website/public/diagrams/protocol/`).
- **`banzai-cognitive-engine-v1.svg` (`/diagrams/banzai/`)** — embed removido de
  `docs/reference/en/complete.md` §7 (a reescrita EN condensada retira o enquadramento antigo do
  "cognitive engine"/"candidate draft"). Deixa de estar referenciado em superfícies vivas → **não
  referenciado**. Ficheiro mantido (histórico preservado).
- **`banzai-native-protocol-agent.svg` (SVG-P-072)**, **`banzai-rule-provenance.svg` (SVG-P-074)** e
  **`banzai-responsibility-matrix.svg` (SVG-P-075)** — embeds removidos de `BANZA_REFERENCIA.md` §12, mas
  **continuam em uso**: os três permanecem referenciados por `docs/reference/pt/completa.md`, e o
  SVG-P-072 é ainda usado na superfície da homepage. **Não são órfãos** e os ficheiros e as suas restantes
  referências ficam intactos.


## M2.19G.5F — Referência canónica do BanzAI: dois diagramas complementares

O capítulo BanzAI (§12) passa a usar **exactamente dois diagramas canónicos e complementares**, um por
perspectiva. Os diagramas anteriores concorrentes foram **retirados** (ficheiros removidos das duas
árvores): SVG-P-099 (arquitectura cognitiva combinada) e SVG-P-087 (pipeline de resposta). A separação
segue o princípio de que a **posição institucional** e o **processamento cognitivo interno** não devem
partilhar um único diagrama.

| ID novo | Ficheiro | Estado | Assunto |
|---|---|:---:|---|
| SVG-P-100 | `protocol/banzai-no-protocolo.svg` | **CANONICAL** `docs/reference/diagrams/protocol/` (servido em `website/public/diagrams/protocol/`) | **BanzAI no protocolo (M2.19G.5F · ADR-054/059/067)** — a **perspectiva externa** (§12, «Papel no BANZA»): onde o BanzAI se situa no BANZA — transversal às três camadas, sem ser uma quarta camada. Os **utilizadores humanos** falam com o **BanzAI**, cuja **mediação não autoritativa** está delimitada por uma fronteira (dentro: interface humana · motor cognitivo · modelo local opcional · verificação da resposta). O BanzAI **lê e cita** as **fontes do protocolo**, **invoca por contrato tipado** as **ferramentas e motores do protocolo** (que executam, decidem e **devolvem resultados e códigos**) e **apresenta** a **evidência formal** que os motores **produzem e selam**. Fora da sua autoridade ficam os **destinos externos**: publicação opcional no **Registo Técnico** pelo operador, pares · federação, esquemas operacionais e reguladores (verificam · admitem · autorizam · decidem). Em paralelo, um **consumidor automático** acede directamente às interfaces públicas, aos motores e à evidência — sem passar pelo BanzAI. Legenda de setas por tipo (consulta/invocação · resultado/evidência/apresentação · publicação opcional · decisão externa). |
| SVG-P-101 | `protocol/banzai-motor-cognitivo.svg` | **CANONICAL** `docs/reference/diagrams/protocol/` (servido em `website/public/diagrams/protocol/`) | **Processamento cognitivo de uma solicitação (M2.19G.5F · ADR-055/073)** — a **perspectiva interna** (§12, «O motor cognitivo»). Fluxo determinístico em Rust: **Pedido → Normalização → Contexto → Âmbito → Guardas → Planeamento → Fontes e ferramentas → FactualPackage → Modo de resposta → Verificação final → Resposta citada**. As **fontes** devolvem factos e citações; as **ferramentas e motores** devolvem resultados técnicos (obtenção segura → snapshot, por contrato tipado). O **FactualPackage** é a evidência fechada. No **modo de resposta**, um **template determinístico** ou, opcionalmente, o **modelo local** produz um rascunho — nunca a resposta final. A **verificação final** (obrigatória, em Rust · ADR-073) confere afirmações, autoridade, citações, consistência com os motores, limites, política e cobertura. O **caminho directo `utilizador → modelo → resposta` é rejeitado** por construção. |

## Ch02 §2 — Revisão editorial final de "Por Que o BANZA Existe" (2026-08-08)

A revisão editorial final do capítulo 02 substitui o enquadramento estratégico (comparação de produtos
nomeados, teste do operador desaparecido, "Racional Estratégico") por uma análise conceptual neutra:
a interoperabilidade financeira já existe; o que o BANZA acrescenta é uma base pública comum e verificável.

**Nova figura canónica:**

| ID novo | Ficheiro | Estado | Assunto |
|---|---|:---:|---|
| SVG-P-102 | `protocol/banza-bilateral-mesh-vs-common-protocol-v1.svg` | **CANONICAL** (servido em `website/public/diagrams/protocol/`) | **Integração bilateral e protocolo comum (§2)** — dois padrões de crescimento, institucionalmente neutros (Operador A–E, sem entidades nomeadas). À esquerda, malha bilateral: `n` operadores → `n(n−1)/2` **relações técnicas** entre pares. À direita, protocolo comum: os mesmos operadores implementam de forma independente o mesmo conjunto de **regras públicas** → `n` **implementações**. A legenda torna explícito que as duas grandezas — relações vs implementações — são diferentes, que um novo operador acrescenta até `n` novas relações (bilateral) ou uma implementação (comum), e que o protocolo comum **não é uma plataforma única nem um operador central** e não elimina as relações comerciais, de liquidação, de esquema ou regulatórias. |

**Figura retirada do capítulo 02:** SVG-P-052 (`banza-decision-risk-matrix-v1.svg` — "Decisão → risco
mitigado") deixa de ser referenciada pela Referência. É racional de desenho (decisão de protocolo → risco
mitigado), que pertence conceptualmente a Princípios/Arquitectura, não à motivação do capítulo 02; repetia
a prosa da tabela e não respondia à pergunta "por que existe o BANZA". O ficheiro permanece em disco
(não eliminado), mas sem referência activa na Referência.

## Ch03 §3 — Revisão editorial final de "Princípios Fundamentais" (2026-08-08)

A revisão editorial final do capítulo 03 substitui uma lista de 13 princípios sobrepostos, carregados de
detalhe de implementação e de uma comparação com marcas (Nubank/Pix), por **oito invariantes de desenho**
apresentados como significado → consequência → fronteira: correcção financeira, neutralidade, regras
públicas e versionadas, decisão determinística, evidência e reprodutibilidade, âmbito explícito e sem
autoridade implícita, fecho por omissão, separação de responsabilidades.

**Nova figura canónica:**

| ID novo | Ficheiro | Estado | Assunto |
|---|---|:---:|---|
| SVG-P-103 | `protocol/banza-principios-consequencia-estrutural-v1.svg` | **CANONICAL** (servido em `website/public/diagrams/protocol/`) | **Princípios → consequência estrutural (§3)** — mapeia cada princípio fundamental à consequência de desenho verificável que produz (institucionalmente neutro, sem entidades nomeadas): correcção financeira → operações auditáveis; neutralidade → as mesmas regras para todas as implementações; regras públicas e versionadas → avaliação com âncora testável; decisão determinística → resultado reproduzível; evidência → resultado verificável por terceiros; âmbito/sem autoridade implícita → o resultado não propaga estatuto; fecho por omissão → interoperabilidade concedida por verificação; separação → nenhuma autoridade única. O conjunto **converge** numa faixa: "condicionam a arquitectura, a validação e a evolução do protocolo (§4)" — a ponte para o capítulo 04. |

**SVG-P-052** (`banza-decision-risk-matrix-v1.svg`, decisão→risco) — auditada para o capítulo 03 e **mantida retirada**: é racional de decisões de desenho mapeadas a riscos (mecanismos: contracts-first, chave raiz offline, BRL, BanzAI), não um princípio fundamental; pertence conceptualmente a Arquitectura/Segurança. Continua em disco, sem referência activa.

## Ch04 §4 — Revisão editorial final de "Arquitectura do Protocolo" (2026-08-08)

O capítulo 04 passa a descrever responsabilidades e fronteiras (não deployment): três camadas
institucionais (Camada 1/2/3), o BanzAI transversal, os planos de artefactos, a execução local sem servidor
central, o núcleo normativo (correcção financeira, por famílias de invariantes) e as fronteiras de
autoridade. Removeu-se o catálogo de especificação (tabelas de campos monetários, JSON, registo de
moedas, MON-001, o despejo de invariantes críticos, a tabela de orientação de implementação) e todo o
estado operacional (v1.0 congelada, /operators=[], alvos M2/M3), que pertencem aos contratos e a §7/§14.

**Figuras:**

| ID | Ficheiro | Estado | Nota |
|---|---|:---:|---|
| SVG-P-057 | `protocol/banza-protocol-architecture-overview-v1.svg` | **CANONICAL v2.2** | Figura institucional das três camadas + BanzAI transversal. Actualizada em v2.2: nomenclatura normalizada — camadas institucionais L1/L2/L3 → **Camada 1/2/3** (a letra L fica reservada aos perfis de conformidade L0–L4); Camada 1 intitulada «Protocolo aberto». v2.1: sem estado operacional; «interface humana única» → «primária»; motores «determinísticos» (sem Rust/Qwen); banda de autoridade canónica; nota camadas (Camada 1/2/3) ≠ perfis (L0–L4). |
| SVG-P-043 | `protocol/banza-local-execution-model-v1.svg` | **CANONICAL v2.0** | Modelo de execução local — as regras públicas comuns numa banda superior (referência partilhada, não um servidor central) e dois operadores independentes (Operador A/B) que as implementam na sua infraestrutura local; cada stack local é abstraído em «núcleo financeiro local» + «evidência de conformidade», e os operadores interoperam por conformidade às mesmas regras, não por infraestrutura partilhada. v2.0 (revisão §4): o protocolo deixa de aparecer como nó central; blocos do operador reagrupados; distinção clara infra local / regras públicas / evidência. v1.1: removida a analogia HTTP e «mesma rede». Institucionalmente neutra. |
| SVG-P-105 | `protocol/banza-estado-protocolar-modelo-v1.svg` | **CANONICAL v1.0** | **Modelo do estado protocolar (§5)** — de uma fonte canónica (artefactos públicos assinados, contratos) por observação e avaliação determinística até um resultado com evidência reproduzível, depois materializado (persistência) e publicado numa superfície pública. Legenda de quatro naturezas: fonte (a autoridade), derivado (recalculável das fontes), persistido (materialização, sem autoridade) e publicado (superfície). Faixa canónica: «a persistência não cria autoridade — a verdade vem das fontes, da evidência e do processo; o estado é verificável recalculando hashes e assinaturas e nunca guarda valor financeiro». Institucionalmente e tecnologicamente neutra (sem PostgreSQL/tabelas). Substitui SVG-P-076. |
| SVG-P-106 | `protocol/banza-estado-protocolar-temporalidade-v1.svg` | **CANONICAL v1.0** | **Estado observado e estado actual (§5)** — um resultado é estado observado no instante em que as fontes foram verificadas; quando os artefactos mudam (novo hash, nova metadata, expiração de chave, revogação), uma nova observação e reavaliação produzem um novo resultado, e o resultado anterior é preservado como histórico, não apagado. Faixa canónica: «estado observado ≠ estado actual — a validade depende da frescura das fontes canónicas». Tecnologicamente neutra. |
| ~~SVG-P-076/077/078~~ | ~~`postgresql-protocol-state`/`postgresql-data-boundary`/`postgresql-service-access`~~ | **RETIRADOS (Ch05 «Estado Protocolar»)** | Figuras centradas em PostgreSQL (classes de estado, fronteira de dados, acesso por papéis). Retiradas quando a auditoria de identidade confirmou que PostgreSQL é implementação de referência, não parte normativa do protocolo: substituídas pelas figuras tecnologicamente neutras SVG-P-105/106; a figura de acesso por papéis (infra) sai da Referência. Ficheiros mantidos em disco, sem referência. A fronteira de dados normativa (ADR-042) permanece imposta por `make postgres-data-boundary-check`. |
| SVG-P-104 | `protocol/banza-architectural-flow-v1.svg` | **CANONICAL v1.0** | **Fluxo arquitectural de ponta a ponta (§4)** — da pessoa (via BanzAI, interface humana primária e opcional, que orienta e explica mas não decide) ou do consumidor automático (acesso directo, sem BanzAI) até à interoperação: operador → artefactos públicos (descoberta/manifesto/chaves/endpoints) → motores determinísticos → evidência e recibos reproduzíveis → Certificação de Conformidade (Camada 2) → esquemas operacionais (Camada 3), com o Registo Técnico como índice público. Banda de autoridade: «o BanzAI orienta · os motores verificam · a evidência prova · a autoridade competente decide». É um fluxo de arquitectura, validação e evidência, não de dinheiro — o BANZA não movimenta fundos. Institucionalmente neutra. |
| SVG-P-031 | `protocol/banza-trust-v1.svg` | **CANONICAL v2.0** | **A cadeia de confiança (§6)** — cinco níveis (não camadas da arquitectura): a Raiz de Confiança offline, em custódia repartida por limiar, assina apenas o Manifesto de Chaves e não autoriza operadores nem pagamentos; o Manifesto autoriza, por domínio, as chaves delegadas; estas assinam metadata de protocolo, revogação e evidência de conformidade; os operadores verificam offline. v2.0 (revisão §6): «Chave Raiz BANZA» → «Raiz de Confiança», «Chaves Emissoras» → «Chaves Delegadas»; verbos precisos (assina · autoriza por domínio · assinam · verificam); custódia «fragmentada/quórum» → «repartida por limiar»; boundary explícito «não autoriza operadores nem pagamentos»; validade exacta generalizada. Institucionalmente neutra. |
| SVG-P-107 | `protocol/banza-trust-questions-v1.svg` | **CANONICAL v1.0** | **O que a confiança verifica — e o que não prova (§6)** — cinco perguntas verificáveis dentro do protocolo, offline e determinísticas (origem: onde foi publicado; assinatura: quem o assinou com uma chave autorizada; integridade: o conteúdo mudou; frescura: ainda é válido; revogação: a confiança foi retirada) e duas perguntas de outro domínio que não decorrem de uma assinatura válida (conformidade → §7; autorização → autoridades competentes). Faixa canónica: «uma assinatura válida não prova conformidade; não substitui a Certificação de Conformidade (Camada 2), a admissão a um esquema, nem a autorização regulatória». Institucionalmente neutra. |
| SVG-P-054 | `protocol/banza-controlled-federation-gate-v1.svg` | **CANONICAL v2.0** | **Como a federação é avaliada (§10)** — a Avaliação Aberta de Confiança aplicada ao encaminhamento entre dois operadores (exemplos A/B): antes de encaminhar, cada parte avalia localmente o material publicado da implementação da outra — manifesto e versão compatíveis, metadata assinada ancorada no Manifesto de Chaves, evidência de conformidade válida e fresca, ausência da BRL, capacidades e endpoints compatíveis, e o âmbito de conformidade L3+ como pré-condição técnica (um perfil, não a Camada 3). Avaliação bidireccional; resultado local e por interacção: `ROUTING_ALLOWED` (todas as verificações passam) ou `FAIL_CLOSED` (por omissão). Faixa: «sem fluxo de fundos pelo BANZA; a avaliação é local e não o consulta; um resultado que passa não obriga a encaminhar». v2.0 (Ch10): removido o estado corrente (`/operators=[]`, `production_certificates=false`); acrescentados o resultado e a bidireccionalidade; §9→§10. ADR-040. §10. |
| SVG-P-110 | `protocol/banza-federation-non-propagation-v1.svg` | **CANONICAL v1.0** | **Relações de federação independentes (§10)** — três operadores (exemplos A/B/C) com relações par a par independentes: de A↔B e B↔C **não decorre** A↔C (a federação não é transitiva); cada lado avalia e decide por si, e o A considerar o B encaminhável não implica que o B considere o A encaminhável (não simétrica). Banda de não-propagação: uma determinação técnica de federação não cria admissão a esquema (Camada 3 — decisão do esquema), não executa liquidação de fundos (executada pelos operadores, nunca pelo BANZA) nem constitui autorização regulatória (autoridades competentes) — cada uma é determinação de outro dono. Institucionalmente neutra. ADR-061/079. §10. |
| SVG-P-056 | `protocol/banza-normative-hierarchy-n1-n5-v1.svg` | **CANONICAL v2.0** | **Hierarquia normativa (§11)** — quatro níveis vinculativos de cima para baixo: N1 Princípios Fundamentais (autoridade máxima), N2 Invariantes, N3 decisões de arquitectura e especificações (ADRs · contratos · schemas · vectores de conformidade — concretizam N1–N2), N4 guias de implementação (orientação, não estabelece regras). Notas: nenhuma decisão pode violar um invariante; a implementação local não redefine o protocolo; o BanzAI explica mas não decide; o BANZA não é autoridade regulatória. v2.0 (revisão Ch11): 5 níveis → 4 (ADRs+especificações unidos no nível de concretização, mais fiel ao canon «as regras normativas vivem nos invariantes, contratos e vectores»); removido o estado-actual «governação em fase de bootstrap»; «Governação»→«Governança». Slug legado «n1-n5» mantido. §9→§10→§11. |
| SVG-P-033 | `protocol/banza-governance-v1.svg` | **CANONICAL v2.0** | **Como uma regra se torna oficial (§11)** — fluxo aberto em seis etapas: 1 RFC (qualquer pessoa propõe) → 2 Revisão pública (discussão + avaliação de impacto nos invariantes e na neutralidade) → 3 Decisão (os maintainers activos decidem, pelo processo) → 4 Registo (ADR) → 5 Publicação (especificação/release; nova versão quando muda uma regra) → 6 Regra oficial (versionada, auditável). Legenda: processo aberto (azul) / a governança decide (vermelho); nenhum operador singular governa; uma alteração fora do processo não é uma alteração ao protocolo. v2.0 (revisão Ch11): reenquadra «BANZA aceita/decide/documenta» → «os maintainers decidem, pelo processo»; etapa 5 «Implementação pelos operadores» → «Publicação»; «Governação»→«Governança»; §10→§11. |
| SVG-P-111 | `protocol/banza-governance-authority-boundaries-v1.svg` | **CANONICAL v1.0** | **Fronteiras de autoridade da governança (§11)** — a governança decide REGRAS (versões, contratos e schemas, invariantes, perfis e critérios de conformidade, vectores) por processo público, nunca casos individuais. Fora da sua autoridade, cada um com o seu dono: o veredicto de conformidade de uma implementação (motor determinístico · Camada 2), a admissão a um esquema (o esquema · Camada 3, independente), a autorização regulatória (autoridades competentes, fora do protocolo) e a relação comercial e a participação (o próprio operador). A Raiz de Confiança não está no topo — é uma âncora criptográfica que assina apenas o Manifesto de Chaves, não um órgão de governo. Faixa: «a governança mantém e evolui as regras; não certifica, não admite, não autoriza e não regula operadores». Institucionalmente neutra. §11. |
| SVG-P-112 | `protocol/banza-developer-resource-authority-v1.svg` | **CANONICAL v1.1** | **Autoridade dos recursos para programadores (§13)** — três camadas por função: os **artefactos normativos** (contratos · invariantes · esquemas · vectores de conformidade; ADRs/RFCs registam as decisões) **DEFINEM** as regras; as **ferramentas** (motores determinísticos · BanzAI) **VERIFICAM E ORIENTAM** — os motores verificam, o BanzAI orienta e explica; ajudam, não são normativas e são substituíveis; as **referências** (Operador Zero · exemplos) **EXEMPLIFICAM** — materializações possíveis, não substituem os contratos. Faixa: «as ferramentas e as referências nunca estão acima dos contratos · nenhuma linguagem, base de dados ou stack é imposta ao operador». v1.1 removeu o cartão «SDKs (opcionais)»: não existe SDK público BANZA (ver §13). Institucionalmente neutra. §13. |
| SVG-P-053 | `protocol/banza-developer-flow-v1.svg` | **CANONICAL v2.0** | **Da implementação à validação (§13)** — o percurso técnico em cinco etapas distintas: explorar (escolher o perfil alvo contra o estado verificável) → integrar (qualquer linguagem/stack) → verificar (conformidade em sandbox) → publicar (evidência + metadata assinada por hash) → produção (condições reunidas; pares avaliam). Fronteira: «um PASS é evidência técnica, não um certificado; a sandbox não movimenta dinheiro real; validar ≠ certificar ≠ admitir a um esquema ≠ autorizar — etapas distintas, cada uma de outro dono». v2.0 (revisão Ch13): 7 passos → 5 etapas alinhadas à prosa; §12→§13. Institucionalmente neutra. |
| SVG-P-044 | `protocol/banza-reference-operator-v1.svg` | **RETIRED from §13** (Ch13 — figura de stack interna do operador, com PostgreSQL rotulado «fonte de verdade financeira» (contradiz §5) e «Camada 1/2» a colidir com as camadas institucionais; centra uma stack específica, contra a tese do capítulo «nenhuma stack é imposta»; ficheiro mantido em disco, não referenciado) | **Arquitectura de referência de um operador (histórico)** — componentes internos típicos + artefactos publicados. O modelo de execução local neutro vive em §4 (SVG-P-043); §13 passa a apontar para §4 em prosa. |
| SVG-P-038 | `protocol/banza-federation-v1.svg` | **RETIRED from §10** (Ch10 — fluxo de fundos com o BANZA no caminho da transacção, contradiz ADR-040 «o BANZA não está no caminho da confiança nem no dos fundos»; ficheiro removido do repositório no final transversal sweep — recuperável do histórico git) | **Federação BANZA — fluxo inter-operadores (histórico)** — antigo fluxo horizontal Cliente A → Operador A → Protocolo BANZA → Operador B → Comerciante B, com obrigação e liquidação. Substituído em §10 por SVG-P-054 (como a federação é avaliada) + SVG-P-110 (relações independentes). |
| SVG-P-027 | `protocol/banza-ledger-posting-v1.svg` | **RETIRADA de §4** | Lançamento de partidas dobradas — ilustração de especificação contabilística, não arquitectura; deixa de ser referenciada por §4 (sai com o bloco monetário). Ficheiro mantido em disco. |
