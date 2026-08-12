# PHASE M2.5 — Public Surface & Operator Workbench Simplification (+ Workbench-Only Operator Verification)

**Date:** 2026-07-18 · **Branch:** `feat/m2-5-public-surface-workbench-cleanup-2026-07`

> BANZA é um protocolo financeiro aberto. Operadores independentes implementam o protocolo, publicam
> manifests e demonstram compatibilidade por evidência verificável de conformidade. O trust é avaliado por
> signed protocol metadata, delegated signing keys, public protocol registry e revocation/fail-closed. Não
> existe autoridade humana central, certificado de operador, aprovação BANZA ou BANZA CA no modelo activo.
> **Simplicidade é um princípio: a interface ajuda operadores a executar tarefas — não expõe as fases M2.x.**

## Auditoria inicial
`docs/governance/M2_5_PUBLIC_SURFACE_AUDIT.md`. O modelo normativo (contracts, engine cripto, SVGs do
reference) já estava limpo em M2.3/M2.4; a pendência era a **camada de produto** — home, páginas, reference
chapters de website, BanzAI Chat, e o **Workbench organizado por milestones M2/M2.1/M2.2/M2.3/M2.4**.

## O que foi limpo
- **Home** (`page.tsx`, `HeroEstado.tsx`) — painel de estado neutro (Registo público vazio, Evidência 0,
  Pré-produção, Trust metadata em preparação, BanzAI demonstração), CTAs (Ler referência / Começar
  implementação / Abrir Workbench / Ver rotas), roadmap M1/M2/M3 de-enfatizado.
- **Rota** — nova canónica `/conformidade`; `/certificacao` passa a redirect; nav actualizada.
- **Referência** (`BANZA_REFERENCIA.md` + espelho PT + EN) + `reference.ts` — "Certificação" → "Conformidade",
  "operador certificado" → "operador com evidência verificável de conformidade", "Verificação Tripla" →
  "Open Trust Evaluation"; negações legítimas mantidas.
- **Páginas** (operadores, confiança, federação, estado, faq, programadores, arquitectura, governação,
  roteiro, o-que-e, porque-existe) + `SiteFooter` ("SEM OPERADOR CERTIFICADO" → "SEM OPERADOR PUBLICADO") +
  `DecisionsExplorer` + `decisions.ts` (categoria "Confiança e conformidade") — modelo activo.
- **README / SECURITY / CONTRIBUTING / CHANGELOG** — modelo activo; engines/CLI como transparência de
  maintainer, não caminho de operador.
- **SVGs** — 4 novos (open-protocol-overview, operator-journey, workbench-operator-flow,
  protocol-governance-simple); 5 redesenhados; 3 antigos apagados; várias labels "Certificado BANZA"/
  "operador certificado" corrigidas. `reference-svg-check` verde.

## Workbench redesenhado (Parte 6)
Nav orientada a tarefas de operador: **Guia · Manifest · Conformidade · Trust · Federação · Evidence Bundle ·
Traces · Referência · Programadores** (+ Assistente). Abre por defeito no **Guia** (guia de operador +
checklist Manifest/Conformidade/Trust/Evidence + estado do ambiente). **Removidos** os painéis de milestone
(M2 protocol gate, M2.1/M2.2/M2.3 ceremony/governance/reference-trust), os seus adapters TypeScript, os seus
WASM e o "Validar M2 protocol gate". Fixtures orientados a operador. Texto obrigatório presente. Zero labels
M2.x visíveis ao operador. Nenhuma decisão de trust em TypeScript (Rust/WASM decide).

## BanzAI Chat (Parte 5) + Assistente (Parte 7)
"Assistente de Certificação" → "Assistente de Conformidade"; sugestões orientadas a tarefa. 7 intents novos:
M2 = marco de roadmap (não ferramenta de operador); "como começo?" → Manifest → Conformidade → Trust →
Evidence Bundle; "o Workbench certifica?" → não; "como corro conformidade?" / "posso usar Docker?" /
"existe GitHub Action?" / "preciso instalar banza-conformance?" → **Workbench-only** (não é necessário
instalar Python, correr Docker ou configurar GitHub Actions). WASM `banzai_evidence` reconstruído.

## Workbench-Only Operator Verification (addendum)
Decisão em `docs/governance/WORKBENCH_ONLY_OPERATOR_VERIFICATION.md`. Removidas de todas as superfícies
públicas as instruções `pip install` / `docker pull|run` / GitHub-Action / TestPyPI / User-Agent-WAF / CLI
como método de operador (reference trio, README, programadores, conformidade, faq). Substituídas pelo fluxo
Workbench. As ferramentas internas (CI, guards, `tools/banza-conformance/`) permanecem como transparência
de maintainer, claramente marcadas.

## Guards novos (Parte 10 + addendum Parte 8)
- `make public-surface-clean-check` (`tools/check-public-surface-clean.sh`) — bloqueia certificação/BANZA-CA/
  operador-certificado/M2-milestone/corpus/KB em superfícies públicas; allow clause-scoped para negações,
  rota legacy, identificadores de código, negações do registo.
- `make workbench-only-check` (`tools/check-workbench-only.sh`) — bloqueia pip/docker/GitHub-Action/CLI como
  método de operador; allow para menções de path/tool-name de transparência e perguntas FAQ negadas.
- Ambos com self-tests must_report/must_allow que correm a cada invocação.

## Tests + checks
Website: `tsc` limpo, **115 vitest** (workbench.test.ts nav-shape + no-M2; publicSurface.test.ts
Workbench-only + modelo activo), `next build` verde. Guards: public-surface-clean, workbench-only,
open-governance, regulatory, identity, purity, invariant, private-key-leak, reference-svg, rust-rule — todos
verdes. Rust: conformance-rs, crypto, simb, rust-final-closure, rust-engine — verdes.

## Adversarial / verificação
Guard `open-governance` corrigido (a regra BANZA-CA não excluía `workbench.ts` — a denylist do Workbench era
apanhada; adicionado `GREP_EXCL`). `rust-rule-guard` marcava "fail-closed" em `workbench.ts` (.ts) → copy
reformulada para "revogação e fecho por omissão" (conceito mantido; teste alinhado). Browser E2E: Workbench
abre no Guia, checklist de operador, Assistente responde Workbench-only, **0 erros de consola, 0 chamadas
externas**.

## Confirmações negativas
`/operators=[]`, `production_certificates=false`, `llm_calls=0`, `external_model_called=false`, provider mock.
Nenhum operador criado/aceite/aprovado/certificado; nenhum certificado/licença; sem fundos; sem BANZA CA;
sem private key material; `.env`/DNS/Cloudflare/TLS/Postgres/secrets intactos.
