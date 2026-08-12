# M2.7D — Final Protocol Architecture SVG Audit

**Date:** 2026-07-18 · **Phase:** M2.7D — Final Protocol Architecture SVG Redesign

## Old SVG found (obsolete)
- **File:** `website/public/diagrams/protocol/banza-ecosystem-v1.svg`
- **ID / title:** `SVG-P-034` · "Arquitectura do Ecossistema BANZA — cinco camadas"
- **Layers:** Governação · BANZA · BanzAI · Operadores · **Clientes e Comerciantes** + permanent-dependency note.
- **Where used:** reference §1 "### Arquitectura do Ecossistema" — `website/content/BANZA_REFERENCIA.md:116`
  and its mirror `docs/reference/pt/completa.md:116`; cross-referenced from both files at line 1873. No
  other file (component, README, doc) referenced it.

## Why obsolete
- Frames the system as a five-layer **ecosystem** with **Clientes e Comerciantes** as an architectural
  layer — clients are not part of the protocol architecture (they belong to operators' products).
- Does not represent the active model: no Workbench as the operator interface, no trust
  metadata/registry, no operator flow, no invariants band.

## New SVG
- **File:** `website/public/diagrams/protocol/banza-protocol-architecture-v1.svg` (served) +
  canonical mirror `docs/reference/diagrams/protocol/banza-protocol-architecture-v1.svg`.
- **ID / title:** `SVG-P-071` · "Arquitectura do Protocolo BANZA".
- **Six areas:** Governação aberta (gold) · Núcleo BANZA (red) · **BanzAI Workbench** (slate, most
  prominent — interface oficial) · Trust Metadata & Registry (burgundy) · Operadores independentes
  (green) · Federação aberta (teal). **No Clientes/Comerciantes or Utilizadores layer.**
- **Operator flow (9 steps):** especificação pública → implementação → manifesto → SimB → conformidade →
  trust metadata → evidence bundle → public protocol registry → federação.
- **Invariants band:** BANZA define regras, não opera pagamentos · Workbench verifica/explica, não
  certifica · operadores publicam a própria evidência · confiança verificável por máquina, fail-closed.

## Validations
- Required terms present (Arquitectura do Protocolo BANZA, BanzAI Workbench, Operadores independentes,
  Trust Metadata, Public Protocol Registry, Federação); forbidden absent (Clientes e Comerciantes,
  BANZA CA, operador certificado, certificado de operador, certificação, M2, M3, readiness, Banzami).
- Pure vector: `<title>`/`<desc>`, viewBox, gradient defs; no raster, no base64, no external/remote refs
  (only the mandatory `xmlns`). XML well-formed. Renders cleanly desktop and narrow (no overflow).
- Old SVG removed; reference §1 heading, alt, embed path, prose and the §1873 cross-ref all repointed to
  the new SVG/anchor in both `BANZA_REFERENCIA.md` and `docs/reference/pt/completa.md`. Registry updated
  (SVG-P-071 added, SVG-P-034 marked retired). `make reference-svg-check` passes.

## Boundary
No BANZA CA / operator certificate / certified operator / central human approval / certification-as-flow;
no CLI/Docker/GitHub-Actions; no operator brand. Clients are an optional caption, not a layer.
`/operators=[]`, `production_certificates=false` unchanged; deploy website-only.
