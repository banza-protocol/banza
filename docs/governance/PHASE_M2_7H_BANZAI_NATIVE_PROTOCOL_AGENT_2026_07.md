# Phase M2.7H — BanzAI as Native Protocol Agent

**Date:** 2026-07-18 · **Branch:** `feat/m2-7h-banzai-native-protocol-agent-2026-07`
**Type:** `feat(protocol)` — architectural decision + website/docs/engine reframe (website-only deploy)

## Architectural decision
BanzAI becomes an official layer of the BANZA protocol as a **native AI agent**
([ADR-041](../../decisions/adr/ADR-041-banzai-native-protocol-agent.md),
[BANZAI_NATIVE_PROTOCOL_AGENT.md](BANZAI_NATIVE_PROTOCOL_AGENT.md)):

> "BANZA é um protocolo financeiro aberto acompanhado por um agente IA nativo: BanzAI. BanzAI guia
> operadores, simula fluxos, invoca ferramentas verificáveis, explica resultados, ajuda a corrigir falhas
> e prepara evidência. BanzAI não aprova, não certifica, não licencia, não decide participação, não
> inventa regras, não adiciona decisões arquitecturais e não substitui a Referência BANZA nem os motores
> determinísticos Rust/WASM."

## Quem faz o quê
Licença/autorização → entidades competentes (fora do BANZA) · participação → operador por auto-publicação
· conformidade → motores Rust/WASM · orientação → BanzAI · interoperabilidade → pares (avaliação local) ·
evolução → governança aberta · novas regras → governança formal (RFC/ADR/spec/release) · evidência →
operador publica, motores verificam, pares consomem. **Não existe autoridade central de admissão de
operadores; a participação é demonstrada, não concedida.**

## Rule provenance
BanzAI só orienta a partir de fontes existentes (Referência, ADRs, RFCs, specs, contracts, schemas,
invariants, outputs dos motores, Evidence Bundle, public protocol metadata). **BanzAI não inventa regras,
não cria decisões arquitecturais, não converte sugestão em norma e não resolve silêncio normativo com
opinião própria.** Sem fonte, declara que a regra não está definida e pode sugerir RFC/ADR como proposta
(não regra activa). Output de IA nunca é regra do protocolo.

## What changed
- **ADR-041** (canonical `decisions/adr/` + website mirror): context, problem, decision, "Quem faz o
  quê", "BanzAI and Rule Provenance", does/doesn't, relations, consequences, mandatory phrases.
- **Canonical doc** `BANZAI_NATIVE_PROTOCOL_AGENT.md`.
- **Reference** (`BANZA_REFERENCIA.md` + `docs/reference/pt/completa.md`): §10 renamed to "BanzAI —
  Agente do Protocolo", reframed from "não faz parte do protocolo" to native-agent layer, new "Quem faz o
  quê" + "Proveniência das regras" subsections, 3 new FAQ Q/As, cross-cutting phrases; new SVG embedded.
- **Architecture/spec docs** (7, via parallel agents): OPEN_PROTOCOL_GOVERNANCE, BANZA_TRUST_ARCHITECTURE,
  WORKBENCH_ONLY_OPERATOR_VERIFICATION, PROTOCOL_SUCCESSION_AND_SURVIVAL, spec/overview, spec/README,
  README — BanzAI added as the guidance/orchestration layer, never authority/normative.
- **Brand reframe:** "BanzAI Workbench" → "BanzAI" and "Workbench-only verification" → "verificação
  guiada pelo BanzAI" across reference, UI, governance docs and the architecture SVGs. The
  `/banzai/workbench` route is kept as a compatibility alias; the public name is **BanzAI**.
- **UI:** `workbench.ts` (name=BanzAI, subtitle="Agente do protocolo", agent boundary + short phrase
  "BanzAI guia; os motores verificam; a evidência prova", AGENT_WHO_DOES_WHAT / AGENT_RULE_SOURCES /
  AGENT_GUIA_TEXT); `BanzaiChat.tsx` renders the agent subtitle; `/banzai` page → "Agente do Protocolo";
  home `OperatorArchitectureSection` (BanzAI-agent copy, pills incl. "BanzAI Agent" + "Sem regras
  inventadas", microcopy) + `BoundarySnapshot` bullet.
- **New SVG** `banzai-native-protocol-agent.svg` (SVG-P-072): flow Referência → BanzAI Agent → motores
  Rust/WASM → Evidence Bundle → Registry → pares → federação; quem-faz-o-quê; rule provenance; boundary.
  Registered; passes `reference-svg-check` + `svg-visual-quality-check`.
- **Engine** `banzai-evidence`: `what_is_banzai` reframed to "agente IA nativo"; 15 new agent/provenance
  intents (native agent, who approves/verifies/licenses/decides-federation/creates-rules, no-rule
  fallback, suggestion≠rule, cannot-create-rules, no-architectural-decision, banzai-vs-engines, guides-to-
  federation) with an early short-circuit so topical intents don't steal them; `llm_calls=0`. Committed
  **WASM rebuilt**. `native_agent.rs` (11 tests) + kb-eval fixture updated.
- **New guard** `make banzai-protocol-agent-check` (CI job `banzai-protocol-agent`): blocks BanzAI-as-
  authority/rule-source affirmations + the old public brand; affirmative-substring + word-boundary +
  question/negation filter; self-tests. Makefile + CI wired.
- **Purity guard** ADR canonical range extended 001..040 → 001..041.

## Routes & compatibility
`/banzai` (agent landing) and `/banzai/workbench` (compatibility alias) both remain 200. No routes
renamed; public copy says "BanzAI".

## Tests & checks
137/137 website vitest (incl. new `nativeAgent.test.ts` + updated `workbench.test.ts`/
`homeHarmonization.test.ts`) · type-check · `next build` (81 pages) · lint. Engine: `native_agent` 11/11
+ full `banzai-evidence` suite + `banza-repo-guards`. Guards: banzai-protocol-agent · svg-visual-quality ·
reference-svg · home-minimal · public-surface-clean · workbench-only · governance-docs-clean ·
open-governance · regulatory · identity · purity · invariant · private-key-leak · rust-rule · crypto — all
green.

## Browser E2E / visual QA
`/banzai/workbench` renders title "BanzAI" + subtitle "Agente do protocolo" + the agent triad, no
"BanzAI Workbench" brand, no horizontal overflow. The Assistente answers are proven deterministically by
the engine's `native_agent` suite (the same source compiled to the committed WASM, verified to contain
"agente IA nativo do protocolo"): "o que é BanzAI" → native agent; "quem aprova operadores" → no central
approval; "quem verifica" → Rust/WASM engines; "BanzAI pode criar regras" → no; "e se não houver regra" →
declares undefined + suggests RFC/ADR; "BanzAI pode mudar o trust model" → no (formal governance). A
transient dev-only RSC console error appeared from a build/dev artifact mix and cleared after a clean
`.next` rebuild — not a page defect.

## Adversarial review
Verified: the decision is formalized (ADR + canonical doc + reference + arch docs); BanzAI never presented
as authority/rule-source (guard-enforced + engine-enforced); participation stated as demonstrated, not
approved; the old brand removed from public surfaces; the new SVG shows BanzAI as agent, engines as
verifiers, evidence as proof; rule-invention blocked by guard + covered by engine tests. Findings fixed:
guard EN/question false-positives (word-boundary + question/negation filter + EN-mirror exclusion), guard
ADR-037 marker words ("negation-aware"/"denylist") reworded, purity ADR range bumped.

## Confirmações negativas
BanzAI não é autoridade/fonte normativa; não aprova/certifica/licencia/decide participação; não cria/
inventa regras nem decisões arquitecturais; não substitui a Referência nem os motores; não move fundos.
Sem BANZA CA / operador certificado / aprovação humana central; sem CLI/Python/Docker/GitHub-Actions como
caminho público; sem provider real / Qwen / DeepSeek / OpenAI; `llm_calls=0`, `external_model_called=false`,
provider mock; `/operators=[]`, `production_certificates=false` inalterados; sem tocar DNS/TLS/Cloudflare/
Postgres/`.env`/secrets; deploy website-only.
