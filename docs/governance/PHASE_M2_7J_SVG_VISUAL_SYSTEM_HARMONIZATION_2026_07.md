# Phase M2.7J — SVG Visual System Harmonization

**Date:** 2026-07-19 · **Branch:** `feat/m2-7j-svg-visual-system-harmonization-2026-07`
**Type:** `style(svg)` — visual harmonization of the official protocol diagram family (website-only deploy)

## Problem
Every official protocol SVG was already conceptually correct and semantically aligned to the active
model, but the **header/footer editorial style** was not uniform. The flagship *Arquitectura do
Protocolo BANZA* (SVG-P-071) used a centred title with no `PROTOCOLO FINANCEIRO ABERTO` eyebrow; five
diagrams used an older centred-title band; one used an English eyebrow; a few lacked a versioned footer.
Result: some diagrams did not read as members of the same visual family.

## Decision
**All official BANZA SVGs must follow a common canonical visual grammar. A conceptually correct but
visually misaligned SVG is harmonized before it is considered final.** *SVGs do BANZA são artefactos
oficiais de documentação do protocolo, não imagens decorativas.*

## Visual grammar adopted
New style guide [`SVG_VISUAL_SYSTEM.md`](SVG_VISUAL_SYSTEM.md): canonical wine header band
(`SVG-P-0XX · PROTOCOLO FINANCEIRO ABERTO` + bold title + optional right phrase), technical footer
(`SVG-P-0XX · Nome · BANZA_REFERENCIA.md §X · vY.Z · YYYY-MM-DD`), semantic palette, typography (8px
public minimum), layout rules, visual semantics (BANZA define · BanzAI guia · motores verificam ·
evidência prova · operador publica · pares interoperam · governança evolui · reguladores fora),
and the visual/semantic prohibitions.

## Audit
[`M2_7J_SVG_VISUAL_SYSTEM_AUDIT.md`](M2_7J_SVG_VISUAL_SYSTEM_AUDIT.md) — 25 public protocol SVGs
embedded in the reference, all now canonical; secondary/non-rendered assets documented.

## SVGs
- **Redesigned (flagship):** `banza-protocol-architecture-v1.svg` (SVG-P-071) — centred header →
  canonical red band + eyebrow + title + right phrase (`BANZA define · BanzAI guia · motores verificam ·
  evidência prova`) + subtitle; BanzAI card reframed to the agent model; footer normalized. Active-model
  content kept: Governação aberta · Núcleo BANZA · BanzAI · Trust Metadata & Registry · Operadores
  independentes · Federação aberta · fluxo do operador em 9 etapas · invariantes.
- **Harmonized (header/eyebrow):** SVG-P-029, 038, 033, 043, 040 (centred → canonical eyebrow + left
  title + short right phrase); SVG-P-063 (`OPEN FINANCIAL PROTOCOL` → `PROTOCOLO FINANCEIRO ABERTO`).
- **Harmonized (footer):** SVG-P-030, 032, 041 (added versioned technical footer, viewBox grown);
  SVG-P-052 (date), SVG-P-031, 044 (version).
- **Kept:** the already-canonical diagrams (SVG-P-051/053/054/055/056/050/027/057 and the BanzAI family
  P-072/073/074/075). SVG-P-057 card-over-caption overlap was fixed in the prior hotfix.
- **Removed:** none. **Archived:** none new (`banzai-operator-flow.svg` already renamed in the prior hotfix).

## Guards
- **New** `make svg-visual-system-check` (`tools/check-svg-visual-system.sh`): over
  `website/public/diagrams/protocol/*.svg` — canonical header + footer, `<title>`/`<desc>`/`viewBox`,
  no raster/base64/external, 8px minimum, active-model semantics (negated boundary lines allowed).
  Self-tests: good passes; missing header/footer/title/desc fail; `BANZA CA`/`BanzAI Workbench`/
  `BanzAI Chat` title/`sistema adjacente`/tiny-font/base64 fail. Added to the `identity-guard` CI.
- **Updated** `banzai-protocol-agent-check` to exclude the policy docs (`SVG_VISUAL_SYSTEM.md`,
  `SVG_QUALITY_POLICY.md`) that must enumerate forbidden terms. Existing `reference-svg-check`,
  `svg-visual-quality-check`, `public-surface-clean-check` unchanged and green.

## Tests
`svg-visual-system-check` · `reference-svg-check` · `svg-visual-quality-check` ·
`banzai-protocol-agent-check` · `public-surface-clean-check` · `home-minimal-check` ·
`governance-docs-clean-check` · `open-governance-check` · `regulatory-check` · `identity-check` ·
`purity-check` · `invariant-check` · `private-key-leak-check` · `rust-rule-check` · `rust-engine-check` ·
`conformance-rs-check` · `crypto-check` · `simb-rs-check` — all green. Website `vitest` (137) /
`type-check` / `build` / `lint` — green.

## Adversarial review
Coherence (all 25 share header/footer/palette) · legibility (no overlap/clip; flagship geometry and
footer-expanded viewBoxes verified) · semantics (no `BANZA CA`/certified-operator/`BanzAI
Workbench`/chat/assistant/`sistema adjacente` on any protocol SVG) · maintenance (style guide +
`svg-visual-system-check` in CI prevent regression). No confirmed findings outstanding.

## Boundary held
No BANZA CA, no operator certificate, no certified operator, no central human approval, no certification
flow / production-certificate promise as active model, no BanzAI Workbench/chat/assistant identity, no
"sistema adjacente". `/operators=[]`, `production_certificates=false`, `llm_calls=0`. Website-only deploy.
