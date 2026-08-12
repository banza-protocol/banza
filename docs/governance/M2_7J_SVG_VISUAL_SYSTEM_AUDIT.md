# M2.7J — SVG Visual System Audit

**Date:** 2026-07-19 · **Branch:** `feat/m2-7j-svg-visual-system-harmonization-2026-07`
**Grammar:** [SVG_VISUAL_SYSTEM.md](SVG_VISUAL_SYSTEM.md)

## Problem
Every official protocol SVG carries `<title>`, `<desc>`, `viewBox`, an `SVG-P-` id and pure-vector
content, and all are already **semantically** aligned to the active model (no `BANZA CA`, no operator
certificate/certified-operator, no `BanzAI Workbench`/chat/assistant, no `sistema adjacente`). But the
**header/footer style** was not uniform: the flagship *Arquitectura do Protocolo BANZA* used a centred
title with no `PROTOCOLO FINANCEIRO ABERTO` eyebrow, five diagrams used an older centred-title band, one
used an English (`OPEN FINANCIAL PROTOCOL`) eyebrow, and a few lacked a versioned technical footer.

## Scope
Public rendered family: **25 SVGs** embedded in `website/content/BANZA_REFERENCIA.md` and served from
`website/public/diagrams/protocol/`. Secondary/non-rendered assets (`docs/diagrams/`,
`docs/images/`, `docs/reference/diagrams/en/`, `website/public/diagrams/banzai/` SVG-BZ reasoning
diagrams) are documented below but out of the strict public grammar guard.

## Result of the audit + harmonization (25 embedded SVGs)

All 25 now: canonical header (`SVG-P-0XX · PROTOCOLO FINANCEIRO ABERTO`) · `<title>` · `<desc>` ·
`viewBox` · technical footer (id · name · §ref · version · date) · pure-vector (no raster/base64/external)
· ≥ 8px text · active-model semantics.

| SVG-P | File | Decision |
|---|---|---|
| P-071 | banza-protocol-architecture-v1 | **Redesigned** — flagship: centred header → canonical red band + eyebrow + title + right phrase + subtitle; BanzAI card → "agente do protocolo · simula · verifica · explica · guia / não decide, não aprova, não certifica, não inventa regras"; footer normalized. |
| P-057 | banza-protocol-architecture-overview-v1 | Kept (already canonical; card-over-caption overlap fixed in the prior hotfix). |
| P-029 | banza-certification-v1 | **Harmonized** — centred header → canonical eyebrow + left title + right phrase. |
| P-038 | banza-federation-v1 | **Harmonized** — canonical eyebrow + left title ("pares interoperam localmente"). |
| P-033 | banza-governance-v1 | **Harmonized** — canonical eyebrow + left title ("governança evolui o protocolo"). |
| P-043 | banza-local-execution-model-v1 | **Harmonized** — canonical eyebrow + left title ("cada operador executa localmente"). |
| P-040 | banza-operators-v1 | **Harmonized** — canonical eyebrow + left title ("participação é demonstrada"). |
| P-063 | open-trust-evaluation-v1 | **Harmonized** — eyebrow `OPEN FINANCIAL PROTOCOL` → `PROTOCOLO FINANCEIRO ABERTO`; footer versioned. |
| P-030 | banza-certification-pipeline-v1 | **Harmonized** — added versioned technical footer. |
| P-032 | banza-evidence-vs-certificate-v1 | **Harmonized** — added versioned technical footer. |
| P-041 | banza-operator-l0-endpoints-v1 | **Harmonized** — added versioned technical footer. |
| P-052 | banza-decision-risk-matrix-v1 | **Harmonized** — footer given a date. |
| P-031 | banza-trust-v1 | **Harmonized** — footer given a version. |
| P-044 | banza-reference-operator-v1 | **Harmonized** — footer given a version. |
| P-072 | banzai-native-protocol-agent | Kept (canonical exemplar). |
| P-073 | banzai-operator-journey | Kept (canonical). |
| P-074 | banzai-rule-provenance | Kept (canonical). |
| P-075 | banzai-responsibility-matrix | Kept (canonical). |
| P-051 | banza-boundary-protocol-operator-infra-v1 | Kept (canonical). |
| P-054 | banza-controlled-federation-gate-v1 | Kept (canonical). |
| P-053 | banza-developer-flow-v1 | Kept (canonical). |
| P-027 | banza-ledger-posting-v1 | Kept (canonical). |
| P-056 | banza-normative-hierarchy-n1-n5-v1 | Kept (canonical). |
| P-055 | banza-operator-conformance-lifecycle-v1 | Kept — content already reframed to "ciclo de vida da conformidade" (evidence, not certificate). |
| P-050 | banza-roadmap-m1-m6-v1 | Kept (canonical). |

## Secondary / non-rendered assets
- `docs/reference/diagrams/protocol/banzai-operator-flow.svg` (SVG-P-069) — canonical-only; renamed from
  `workbench-operator-flow.svg` and reframed in the prior hotfix.
- `docs/reference/diagrams/en/*` (SVG-BZ / EN mirror), `website/public/diagrams/banzai/*` (SVG-BZ
  reasoning diagrams used by the EN mirror) — separate family; not part of the strict PT public grammar
  guard. No retired terminology.
- `docs/diagrams/*`, `docs/images/*` — maintainer/architecture assets, not served publicly.

## Enforcement
`make svg-visual-system-check` (new, M2.7J) over `website/public/diagrams/protocol/*.svg`, plus the
existing `reference-svg-check`, `svg-visual-quality-check`, `banzai-protocol-agent-check` and
`public-surface-clean-check`. Added to the `identity-guard` CI workflow.
