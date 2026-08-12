# M2.7E — Systemwide SVG Quality Repair Audit

**Date:** 2026-07-18 · **Phase:** M2.7E — Systemwide SVG Quality Repair & Visual QA

Every SVG in the repository was inventoried and audited for visual quality (overlap, clipping, tiny text,
outside-viewBox, structure) and semantic alignment with the active open-protocol model. The audit was run
as a 32-agent fan-out (27 deep per-file audits of the reference-served set + 5 batch audits) with each
finding independently derived from the SVG source. Enforcement: `make svg-visual-quality-check` +
`make reference-svg-check` (CI jobs `svg-visual-quality` + `identity-guard`).

## Inventory summary

| Group | Location | Count | Disposition |
|---|---|---:|---|
| Reference-served diagrams | `website/public/diagrams/**` (embedded in `BANZA_REFERENCIA.md`) | 27 | 13 keep · 14 repair/redesign (all fixed) |
| Website orphans | `website/public/diagrams/**` (embedded nowhere) | 11 | **removed** (6 dup-of-canonical + 5 unique-unused) |
| Canonical docs diagrams | `docs/diagrams/**`, `docs/reference/diagrams/protocol/**` | 13 | 11 keep · 2 font-bump repair |
| EN reference diagrams | `docs/reference/diagrams/en/**` | 3 | repair (added `<desc>`; 1 PKI→signed-metadata) |
| Legacy architecture sketches | `docs/images/**` | 9 | out of scope (not official diagrams; pure-vector, registry-cataloged only, not served) |
| Status badges | `conformance/badges/**` | 4 | keep (distinct artifact class; structure-exempt) |

The critical named defect — the **"BanzAI · adjacente" text overlap** in
`banza-protocol-architecture-overview-v1.svg` (SVG-P-057) — was confirmed (left label `x=266` collided
with the right-anchored `x=636` label on `y=466`, ~43px overlap) and **repaired**.

## Reference-served set (27) — per-file audit

Every file has `<title>`, `<desc>`, `viewBox`; none contain raster/base64/embedded/external-resource refs.

<!-- generated from the M2.7E audit fan-out -->
| SVG | title/desc/viewBox | raster | minFont | issues found | decision |
|---|:---:|:---:|:---:|---|---|
| `banzai/banzai-authority-chain-v1.svg` | ✓✓✓ | não | 8.5 | (borderline edge annotation) | keep |
| `banzai/banzai-capabilities-v1.svg` | ✓✓✓ | não | 8.5 | — | keep |
| `banzai/banzai-cognitive-engine-v1.svg` | ✓✓✓ | não | 8 | overlap×1, clip×1 | repair |
| `banzai/banzai-knowledge-flow-v1.svg` | ✓✓✓ | não | 8.5 | — | keep |
| `banzai/banzai-non-goals-v1.svg` | ✓✓✓ | não | 8.5 | overlap×1, clip×3 | repair |
| `banzai/banzai-provider-boundary-v1.svg` | ✓✓✓ | não | 8.5 | — | keep |
| `protocol/banza-boundary-protocol-operator-infra-v1.svg` | ✓✓✓ | não | 9 | clip×1 (EMIS line) | repair |
| `protocol/banza-certification-pipeline-v1.svg` | ✓✓✓ | não | 8.5 | (tight, not clipping) | keep |
| `protocol/banza-certification-v1.svg` | ✓✓✓ | não | 9 | clip×2 | repair |
| `protocol/banza-controlled-federation-gate-v1.svg` | ✓✓✓ | não | 9 | semantics×2 (M2/M3 gate) | redesign→repair |
| `protocol/banza-decision-risk-matrix-v1.svg` | ✓✓✓ | não | 9 | — | keep |
| `protocol/banza-developer-flow-v1.svg` | ✓✓✓ | não | 9 | semantics×3 (M2/M3 gate) | repair |
| `protocol/banza-evidence-vs-certificate-v1.svg` | ✓✓✓ | não | 9.5 | — | keep |
| `protocol/banza-federation-v1.svg` | ✓✓✓ | não | 8.5 | clip×2, semantics×4 (certificate) | repair |
| `protocol/banza-governance-v1.svg` | ✓✓✓ | não | 9 | semantics×1 (certified operators) | repair |
| `protocol/banza-ledger-posting-v1.svg` | ✓✓✓ | não | 8.5 | — | keep |
| `protocol/banza-local-execution-model-v1.svg` | ✓✓✓ | não | 7.5 | tiny<8px, semantics×2 | repair |
| `protocol/banza-normative-hierarchy-n1-n5-v1.svg` | ✓✓✓ | não | 9 | — | keep |
| `protocol/banza-operator-conformance-lifecycle-v1.svg` | ✓✓✓ | não | 9 | clip×2 (BRL labels) | repair |
| `protocol/banza-operator-l0-endpoints-v1.svg` | ✓✓✓ | não | 8.5 | — | keep |
| `protocol/banza-operators-v1.svg` | ✓✓✓ | não | 9 | semantics×1 (certificar-se) | repair |
| `protocol/banza-protocol-architecture-overview-v1.svg` | ✓✓✓ | não | 9 | **overlap×1**, semantics×3 | repair |
| `protocol/banza-protocol-architecture-v1.svg` | ✓✓✓ | não | 8.5 | (borderline footer) | keep |
| `protocol/banza-reference-operator-v1.svg` | ✓✓✓ | não | 9.5 | — | keep |
| `protocol/banza-roadmap-m1-m6-v1.svg` | ✓✓✓ | não | 8.5 | semantics×5 (Operador Certificado) | redesign→repair |
| `protocol/banza-trust-v1.svg` | ✓✓✓ | não | 9 | semantics×3 (Certificados layer) | redesign |
| `protocol/open-trust-evaluation-v1.svg` | ✓✓✓ | não | 8.5 | — | keep |

Two audit "redesign" calls (`banza-controlled-federation-gate`, `banza-roadmap-m1-m6`) were resolved as
targeted **repairs**: the reference §7 prose itself uses "federação controlada — não uma integração livre"
(so the title is active-model language, not a violation) and §13 prose already names M3 "Primeiro Operador
em Produção" (so the SVG only lagged the prose). In both, only the genuinely-forbidden strings
(`M2/M3` as a per-routing gate; the `Operador Certificado` milestone) were removed.

## Semantic findings (removed-model assertions repaired)

- `banza-protocol-architecture-overview-v1.svg` — `certificado BANZA`, `certificados de produção`,
  `M2/M3`-gates-certificates footer → evidence/signed-metadata state.
- `banza-trust-v1.svg` — `Certificados` named as a trust-hierarchy layer (header, NÍVEL 4 title,
  NÍVEL 5 body) → `Metadata assinada` + conformance evidence.
- `banza-controlled-federation-gate-v1.svg` — `OPEN TRUST EVALUATION + M2/M3` header + `Marcos M2/M3
  concluídos` gate → Avaliação Aberta de Confiança + `Âmbito L3+`.
- `banza-roadmap-m1-m6-v1.svg` — M3 `Primeiro Operador / Certificado` → `em Produção`; desc aligned;
  `cerimónia da chave raiz` → `cerimónia da Trust Root`.
- `banza-federation-v1.svg` — `Verifica certificado` ×3 + `verificação criptográfica de certificados` →
  `Avalia metadata assinada` / Avaliação Aberta de Confiança.
- `banza-developer-flow-v1.svg` — 3× `produção depende de M2/M3` (operator-facing) → legal/regulatory
  obligations phrasing.
- `banza-local-execution-model-v1.svg` — `operador certificado`, `implementação local certificada` →
  neutral phrasing.
- `banza-operators-v1.svg` — `certificar-se` (certification-as-flow) → `demonstra conformidade`;
  L2/L3 header/desc labels realigned to the row bodies.
- `banza-governance-v1.svg` — `operadores certificados adoptam` → `operadores adoptam`.
- `docs/reference/diagrams/en/banza-protocol-overview-v1.svg` — `PKI — root → operator certs` →
  `Signed protocol metadata · trust root → operator evidence`.

All negated boundary phrases ("não certifica", "não por aprovação humana", "não é um certificado de
produção") were preserved — naming an edge is how the active model states its own boundary, and the guard
is negation-aware.

## Visual findings (overlap / clip / legibility repaired)

Overlap: `banza-protocol-architecture-overview` (BanzAI row), `banzai-cognitive-engine`,
`banzai-non-goals`. Clip: `banza-boundary-protocol-operator-infra`, `banza-certification`,
`banza-operator-conformance-lifecycle`, `banza-federation`, `banzai-non-goals`. Tiny text (<8px):
`banza-local-execution-model` (7.5px) and two `docs/diagrams/*` (7.5px) — all raised to ≥8px. Each repair
was independently re-verified (extent recomputation) to introduce no new clip/overlap/forbidden term.

## Boundary / negative confirmations

No SVG asserts BANZA CA, operator certificate, certified operator, certificate authority, central human
approval, `Clientes e Comerciantes`/`Utilizadores` as a layer, `Banzami`, or `M2/M3` as an operator tool.
No raster/base64/external-resource references anywhere. `/operators = []` and
`production_certificates = false` remain the only production-state statements and are unchanged.
