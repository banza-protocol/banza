# M2.7I — BanzAI Reference, SVG and Repository Canonical Alignment · Audit

**Date:** 2026-07-19 · **Branch:** `feat/m2-7i-banzai-reference-canonical-alignment-2026-07`
**Scope:** consolidate M2.7H (ADR-041 — *BanzAI is the native protocol agent*) across the reference
chapter, the diagrams, the public `/banzai` page, the engine intents, and the `banza-protocol/banzai`
repository. Remove every surviving *"sistema adjacente" / "não faz parte do protocolo" / "Protocol
Knowledge System" / "Protocol Evidence Assistant"* framing from active surfaces.

M2.7H introduced the decision; M2.7I makes the whole corpus say it consistently, in one voice.

---

## 1. Canonical statement being enforced

> **BanzAI é o agente IA nativo do protocolo BANZA.** Camada oficial de orientação e orquestração:
> guia operadores do manifesto à federação, invoca os motores Rust/WASM verificáveis, explica os
> resultados e prepara evidência. **BanzAI guia; os motores verificam; a evidência prova.** BanzAI é
> agente do protocolo, não autoridade do protocolo — **o output de IA nunca é regra do protocolo.**

Mandatory phrases (present verbatim on the aligned surfaces):

- "BanzAI guia; os motores verificam; a evidência prova."
- "BanzAI guia a implementação do protocolo existente; não cria protocolo novo."
- "No BANZA, a participação não é aprovada; é demonstrada."
- "BanzAI é agente do protocolo, não autoridade do protocolo."
- "Output de IA nunca é regra do protocolo."
- "Sem fonte normativa, BanzAI deve dizer que não há regra suficiente no protocolo."

---

## 2. Findings and dispositions

| # | Surface | Before (M2.7H residue) | Disposition |
|---|---|---|---|
| A-01 | Reference §10 (`BANZA_REFERENCIA.md` + PT mirror) | Legacy chapter mixing "adjacente", cognitive-engine + provider SVGs, knowledge-system framing | **Rewritten** to the 11-section canonical chapter *"10. BanzAI — Agente do Protocolo"* (declaração, é/faz/funciona, quem faz o quê, jornada, proveniência, não faz, estado, FAQ, repositório). Embeds 4 agent SVGs. |
| A-02 | Reference cross-refs (§1, §4, §11, TOC line 128, closing line 2716) | "recursos adjacentes", "sistema de conhecimento", "Sistema de Conhecimento de Protocolo" | **Reframed** to native-agent wording; PT source/mirror re-synced to byte parity. |
| A-03 | Diagrams | 4 orphan legacy SVGs (`banzai-knowledge-flow`, `-capabilities`, `-non-goals`, `-authority-chain`) | **Deleted** (untracked mirror copies + tracked `website/public` copies `git rm`'d). |
| A-04 | Diagrams | No agent-model journey / provenance / responsibility diagrams | **Created** SVG-P-073 (operator journey), SVG-P-074 (rule provenance), SVG-P-075 (responsibility matrix); dual-located (canonical `docs/reference/diagrams/protocol/` + served `website/public/diagrams/protocol/`); registered. |
| A-05 | `banza-protocol-architecture-overview-v1.svg` | "BanzAI · adjacente" | **Reframed** to "BanzAI · agente nativo" (label + `<desc>`). |
| A-06 | `banza-developer-flow-v1.svg` | "Validar no BanzAI Workbench" (old brand) | **Reframed** to "Validar no BanzAI (sandbox)". |
| A-07 | `/banzai` page (`website/app/banzai/page.tsx`) | Evidence-assistant lede, DOES = "recupera evidência / verifica claims", cognitive-engine SVG, "base de conhecimento é a fonte da verdade" | **Reframed** to native agent: hero/lede/metadata, DOES = guia/invoca motores/prepara evidência, IS_NOT boundary set, native-agent SVG (SVG-P-072), state row + status note updated. |
| A-08 | Active governance/reference docs | "Protocol Knowledge System" / "Sistema de Conhecimento de Protocolo" as BanzAI's *name* | **Reframed** in `CLAUDE_BASE.md`, `governance/README.md`, `roadmap.md`, `certification-boundary.md`, `BANZA_TERMINOLOGY_PT.md`, `BANZA_SVG_STANDARDS.md`, `manifesto.md` → "Native Protocol Agent" / "Agente do Protocolo". |
| A-09 | EN mirror (`docs/reference/en/complete.md` §7) | "It is not part of the protocol", "BanzAI is an adjacent system", "knowledge/reasoning/verification layer" | **Reframed** to native-agent framing (kept the two mechanics SVGs — cognitive-engine, provider-boundary — which carry no forbidden brand terms and accurately describe *how* BanzAI reasons). |
| A-10 | Engine (`banzai-evidence`) | No correction for a user who *asserts* the retired "sistema adjacente" framing | **Added** `banzai_not_adjacent` intent (+ test) that denies the adjacent framing and reaffirms the native agent; WASM rebuilt. |
| A-11 | Guard (`check-banzai-protocol-agent.sh`) | Scope missing `website/public`; brand list missing the retired formulations; ADRs (historical) falsely flagged | **Broadened** SCAN + BRAND terms ("Protocol Evidence Assistant", "Protocol Knowledge System", "sistema adjacente", "adjacent knowledge system"); **excluded** `decisions/adr` (historical decision records) and the EN mirror; self-tests extended. |

### Deliberate non-changes (documented scope decisions)

- **Historical ADRs / phase reports / audits** keep the old term as a *record* of what was decided then;
  they are excluded from the guard, not rewritten. Rewriting history would be dishonest.
- **`banzai-cognitive-engine-v1.svg` / `banzai-provider-boundary-v1.svg`** are retained: they describe
  BanzAI's reasoning mechanics (planes, task profiles), contain no forbidden brand/authority terms, and
  are still referenced by the EN mirror. They are not the "adjacent system" framing the phase removes.
- **EN mirror is not re-numbered to match PT §10.** The EN and PT references have independent chapter
  structures (EN has a standalone "7. BanzAI"); M2.7I removes the forbidden framing from EN without a
  full re-translation of the PT chapter, which is out of scope for this phase.
- **`/operators = []`, `production_certificates = false`, `llm_calls = 0`** unchanged — public state is
  untouched; this is a documentation/reference/agent-language phase, website-only.

---

## 3. Verification performed

- `bash tools/check-banzai-protocol-agent.sh` → green (broadened scope, ADR/EN excluded).
- `cargo test` in `engines/banzai-evidence` → all suites pass incl. new `banzai_is_not_an_adjacent_system`.
- WASM rebuilt out-of-place; only `banzai_evidence_bg.wasm` changed (JS glue byte-identical, no new
  exports, no sibling WASM touched, `package.json` untouched); new intent string embedded.
- PT reference source ↔ mirror byte parity restored.
- Full guard battery + website `vitest`/`typecheck`/`build`/`lint` + Rust checks (see phase report).

---

## 4. Cross-repository companion

The `banza-protocol/banzai` repository is aligned in the same phase (branch
`feat/m2-7i-native-protocol-agent-alignment-2026-07`): README + core docs reframed to the native agent,
new `NATIVE_PROTOCOL_AGENT.md` / `RULE_PROVENANCE.md` / `OPERATOR_JOURNEY.md`, and a
`banzai-agent-language-check` guard. See that repo's phase report.
