# Phase M2.7D — Final Protocol Architecture SVG Redesign

**Date:** 2026-07-18 · **Branch:** `feat/m2-7d-final-protocol-architecture-svg-2026-07`
**Type:** `refactor(svg)` — architecture diagram redesign (website-only)

## Why the old SVG was discarded
`SVG-P-034 banza-ecosystem-v1.svg` ("Arquitectura do Ecossistema", five layers incl. **Clientes e
Comerciantes**) modelled the system as a client-facing ecosystem and predates the active model. It shows
no Workbench-as-interface, no trust metadata/registry, no operator flow. It was recreated from scratch
(not adapted).

## New concept
`SVG-P-071 · Arquitectura do Protocolo BANZA` — subtitle "protocolo financeiro aberto · operadores ·
Workbench · evidência verificável · federação"; central message "BANZA define regras públicas.
Operadores independentes demonstram compatibilidade por evidência verificável. O BanzAI Workbench
simula, verifica, explica e gera evidência." Final architecture (not roadmap/history/client ecosystem).

## New structure
- **Six areas** (each with short text + one-line explanation): Governação aberta (gold — "mantém o
  protocolo, não aprova operadores") · Núcleo BANZA (red — "define o protocolo financeiro aberto") ·
  **BanzAI Workbench** (slate, prominent, full-width, outlined — "interface oficial do operador") ·
  Trust Metadata & Registry (burgundy — signed protocol metadata · trust root · chaves delegadas · BRL ·
  fail-closed · Public Protocol Registry) · Operadores independentes (green — "não dependem de aprovação
  humana central") · Federação aberta (teal — interoperabilidade por evidência verificável).
- **Operator flow (9 numbered chips + arrows):** especificação pública → implementação → manifesto →
  SimB → conformidade → trust metadata → evidence bundle → public protocol registry → federação.
- **Invariants band:** "BANZA define regras; não opera pagamentos." · "BanzAI Workbench verifica e
  explica; não certifica." · "Operadores publicam a sua própria evidência." · "A confiança é verificável
  por máquina. Na dúvida, o trust falha fechado."
- **No** Clientes/Comerciantes or Utilizadores layer.

## Files changed
- **New:** `website/public/diagrams/protocol/banza-protocol-architecture-v1.svg` (served) +
  `docs/reference/diagrams/protocol/banza-protocol-architecture-v1.svg` (canonical mirror).
- **Removed:** `website/public/diagrams/protocol/banza-ecosystem-v1.svg`.
- **Reference §1** (`website/content/BANZA_REFERENCIA.md` + `docs/reference/pt/completa.md`): heading
  "Arquitectura do Ecossistema" → "Arquitectura do Protocolo BANZA"; alt text; embed path; the five-layer
  prose rewritten to the six-area model + Part-9 clients caption; §1873 cross-ref repointed to the new
  anchor.
- **Registry** `docs/reference/BANZA_SVG_REGISTRY.md`: SVG-P-071 added; SVG-P-034 marked retired.
- Audit `M2_7D_FINAL_PROTOCOL_ARCHITECTURE_SVG_AUDIT.md` + this report.

## Integration
The SVG appears at reference §1 (single canonical embed). Legend/prose states clients belong to
operators' products, not the architecture — a small caption, not a visual layer.

## Checks
`make reference-svg-check` ✓ · public-surface-clean ✓ · home-minimal ✓ · workbench-only ✓ ·
governance-docs-clean ✓ · open-governance ✓ · regulatory ✓ · identity ✓ · purity ✓ · invariant ✓ ·
private-key-leak ✓ · website vitest 115/115 · type-check · `next build` · lint. SVG required terms
present; forbidden literals (Clientes e Comerciantes, BANZA CA, operador certificado, certificado de
operador, M2, M3) absent; pure vector; XML well-formed.

## Adversarial review
Active model ✓ (protocol-centric; no old ecosystem framing; no clients layer). Boundary ✓ (BANZA not a
bank/PSP/operator; Workbench doesn't certify; operators not human-approved). Clarity ✓ (operator flow
and Workbench role explicit; trust metadata/registry/revocation represented). Design ✓ (modern, warm,
premium; readable at desktop and narrow; Workbench prominent).

## Confirmações negativas
No BANZA CA / certificado / operador certificado / certificação / aprovação humana; no Clientes e
Comerciantes / utilizadores as a layer; no M1/M2/M3 as operator tools; no CLI/Docker/GitHub-Actions; no
Banzami; no operator created, no certificate issued; `/operators=[]`, `production_certificates=false`;
`.env`/DNS/Cloudflare/TLS/Postgres/secrets untouched; deploy website-only.
