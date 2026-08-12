# Phase M2.7I — BanzAI Reference, SVG and Repository Canonical Alignment

**Date:** 2026-07-19 · **Branch:** `feat/m2-7i-banzai-reference-canonical-alignment-2026-07`
**Type:** `docs(website)` — reference/diagram/page/engine reframe to ADR-041 (website-only deploy)
**Companion:** `banza-protocol/banzai` @ `feat/m2-7i-native-protocol-agent-alignment-2026-07`

## Goal
Make the entire BANZA corpus present BanzAI in one voice — **the native protocol agent** (ADR-041) —
and remove every surviving "adjacent system / not part of the protocol / Protocol Knowledge System /
Protocol Evidence Assistant" framing from active surfaces. M2.7H decided it; M2.7I consolidates it.

See the audit: [M2_7I_BANZAI_REFERENCE_REPOSITORY_ALIGNMENT_AUDIT.md](M2_7I_BANZAI_REFERENCE_REPOSITORY_ALIGNMENT_AUDIT.md).

## What changed (this repo)

### Reference (canonical, single-sourced)
- `website/content/BANZA_REFERENCIA.md` + `docs/reference/pt/completa.md` (kept in **byte parity**):
  chapter **10 rewritten** to *"BanzAI — Agente do Protocolo"* — 11 sections (declaração; o que é / faz /
  como funciona; quem faz o quê; jornada do operador; proveniência das regras; o que não faz; estado
  actual; FAQ; repositório). Cross-refs in §1/§4/§11, the TOC line and the closing line reframed off the
  "sistema de conhecimento" wording.
- `website/lib/reference.ts` — chapter-10 summary → *"O agente IA nativo do protocolo: guia do manifesto
  à federação, invoca motores, nunca normativo."*

### Diagrams
- **New (registered):** `banzai-operator-journey.svg` (SVG-P-073), `banzai-rule-provenance.svg`
  (SVG-P-074), `banzai-responsibility-matrix.svg` (SVG-P-075) — dual-located (canonical + served).
- **Reframed:** `banza-protocol-architecture-overview-v1.svg` ("adjacente" → "agente nativo"),
  `banza-developer-flow-v1.svg` ("BanzAI Workbench" → "BanzAI (sandbox)").
- **Deleted (orphans):** `banzai-knowledge-flow-v1`, `banzai-capabilities-v1`, `banzai-non-goals-v1`,
  `banzai-authority-chain-v1`.
- **Kept (mechanics, no forbidden terms):** `banzai-cognitive-engine-v1`, `banzai-provider-boundary-v1`
  (still referenced by the EN mirror).
- `docs/reference/BANZA_SVG_REGISTRY.md` — SVG-P-073/074/075 added.

### Public page
- `website/app/banzai/page.tsx` — hero/lede/metadata to native agent; DOES = *guia a implementação /
  invoca motores verificáveis / prepara evidência e correcções*; IS_NOT boundary set (não é fonte
  normativa, não decide, não aprova, não certifica…); single diagram swapped to the native-agent SVG
  (SVG-P-072); state row + status note reworded.

### Active governance / reference docs
- `CLAUDE_BASE.md`, `governance/README.md`, `roadmap.md`, `certification-boundary.md`,
  `BANZA_TERMINOLOGY_PT.md`, `BANZA_SVG_STANDARDS.md`, `manifesto.md` — "Protocol Knowledge System" /
  "Sistema de Conhecimento de Protocolo" → "Native Protocol Agent" / "Agente do Protocolo".

### EN mirror
- `docs/reference/en/complete.md` §7 — "not part of the protocol" / "adjacent system" /
  "knowledge/reasoning/verification layer" reframed to the native agent (mechanics SVGs retained).

### Engine
- `engines/banzai-evidence/src/lib.rs` — new `banzai_not_adjacent` intent: denies the retired framing,
  reaffirms the native agent, stays non-normative. `tests/native_agent.rs` — new
  `banzai_is_not_an_adjacent_system` test. WASM rebuilt (`website/lib/wasm/banzai_evidence_bg.wasm`).

### Guard
- `tools/check-banzai-protocol-agent.sh` — SCAN + BRAND broadened; `decisions/adr` and EN mirror excluded
  as historical/secondary; self-tests extended; green.

## Checks
- `check-banzai-protocol-agent` ✓ · full guard battery ✓ · `banzai-evidence` `cargo test` ✓ (incl. new
  test) · website `vitest` / `typecheck` / `build` / `lint` ✓ · PT reference byte parity ✓.

## Boundary held
No new authority for BanzAI. No BANZA CA / operator certificate / certified operator / central approval
reintroduced. No CLI/Python/Docker/GitHub-Action operator path. `/operators = []`,
`production_certificates = false`, `llm_calls = 0` unchanged. Deploy is **website-only**; no
`.env`/DNS/Cloudflare/TLS/Postgres/secrets touched.

## Result
The reference, diagrams, public page, engine intents and the companion `banzai` repository now describe
BanzAI as the native protocol agent — consistently, and with the mandatory phrases — while keeping every
authority/normativity/participation boundary intact.
