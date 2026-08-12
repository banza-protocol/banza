# M2.13A — Operador Zero Full E2E Protocol Validation inside BanzAI

**Date:** 2026-07-22 · **Branch:** `feat/m2-13a-operador-zero-full-e2e` · **PR:** #127

## 1. Resumo executivo

O Operador Zero foi validado de ponta a ponta como **simulador demo-only** do protocolo BANZA: uma
Demo Operator Root E2E com **Ed25519 real** (chave privada efémera, nunca committada) assina e verifica
manifest, key manifest, revogação, evidence bundle e traces; o motor Rust conserva o ledger fictício
KZ_DEMO e bloqueia o fluxo negativo; e o BanzAI, no apex, **guia sem certificar**. A superfície canónica
é `zero.banza.network`; a antiga rota `/operador-zero` permanece `410 Gone`.

## 2. Estado pós-M2.12G confirmado

- `zero.banza.network/` → **200**, shell própria (sem header/nav/footer global BANZA), storage vazio,
  fluxo feliz **100/100 · 6/6 · 0 blockers**, sem console errors (browser QA, M2.12G + re-confirmado).
- `banza.network/operador-zero` → **410 Gone** (página + `*.json`), sem redirect, não renderiza o lab.
- BanzAI apex-only; `zero.banza.network/banzai*` → **307 → apex**.
- Endpoints canónicos na raiz do subdomínio (10) → **200 application/json**, POST **405**, unknown **404**.

## 3. Demo Operator Root E2E (Parte 2)

Crate `engines/operator-zero-e2e-root` (`gen`): gera uma chave **Ed25519 efémera só em memória**, assina
o manifest e o evidence bundle demo, e emite **apenas artefactos públicos** em
`examples/operators/zero/e2e-root/`. A chave privada **nunca é escrita em disco nem committada** e é
destruída ao fim da geração. Verificação é **só com a chave pública**.

- `key_id`: `oz-e2e-root-b8a61e9480e3265b`
- `fingerprint`: `sha256:b8a61e9480e3265b77251b2f6b0b3ef028535b53e733e4e4094bfd6b8f1a2c09`
- **private key ausente**: `make private-key-leak-check` verde; `no_private_key_material_in_any_artifact`
  passa; nenhum endpoint/trace/relatório contém material privado.

Artefactos (8, todos `demo_only:true · production_allowed:false · monetary_value:false ·
root_type:demo_operator_root · not_protocol_trust_root:true`): public key, key manifest, fingerprint,
signature report, revocation list, signed manifest, signed evidence bundle, verification trace.

Provas (Rust, `tests/e2e_root.rs`, 10 testes + `gen --verify`): public key válida (32 bytes);
assinatura **verifica**; payload **alterado falha**; chave **revogada bloqueia trust** (fail-closed);
Demo Operator Root **≠** Trust Root do protocolo; sem material privado.

## 4–15. Etapas E2E (motor Rust — fonte de verdade)

| Etapa | Prova | Resultado |
|---|---|---|
| Guia | `what-is-operador-zero` curado (corrigido: superfície = zero.banza.network) | grounded, boundary-safe |
| Manifest | `banza-operator-manifest` valida o manifest canónico (protocol_contract.rs) | **VALID** · 20/100 |
| Conformidade | evidência L0 PASS (não certificação) | 45/100 |
| Trust | Demo Operator Root E2E (Ed25519); revogado bloqueia | 60/100 · fail-closed |
| Pagamento | QR 1500 KZ_DEMO; ledger i64; recusa antes do movimento | trace gerado |
| Reembolso | 500 KZ_DEMO ligado à transacção original | referência preservada |
| Reconciliação | re-derivada dos movimentos; total 100 000 KZ_DEMO conservado; sem floats | consistente |
| Federação | peer compatível passa; incompatível bloqueia; sem federação real | 75/100 |
| Evidence Bundle | agrega provas; parcial → incompleto; payload alterado falha | 95/100 |
| Traces/Relatório | trace completo; `complete:true · evidence_complete · blockers:[]` | **100/100 · 6/6 · 0** |
| Fluxo negativo | `failed-e2e-trace.json`: `complete:false · evidence_invalid`, blockers não-vazios | bloqueado |

Enforcado por `make operator-zero-check` (motor) + `make operator-zero-full-e2e-check` (E2E root +
traces + paridade + fronteira).

## 16. Fluxo negativo

`operator-zero-core` `run_e2e(false)` produz uma trace bloqueada com blockers (manifest inválido, secret
leak, moeda real, saldo insuficiente, QR expirado, assinatura inválida, revogado, federação
incompatível, bundle incompleto). Progresso não infla; nenhuma evidência falsa; recusas antes do
movimento não deixam entradas no ledger. Verificado no browser (subdomínio, M2.12G) e em CI.

## 17. Validação BanzAI (Parte 11 — perguntas live, `/banzai/ask`)

| # | Pergunta | intent | ext_model | fontes | resposta (resumo) |
|---|---|---|---|---|---|
| 1 | O que é o Operador Zero? | concept_explanation | false | 4 (ADR-052…) | simulador demo-only, KZ_DEMO, não certifica |
| 2 | Valida o manifest… | concept_explanation | false | 8 | não é operador real; simulador técnico |
| 3 | Demo Operator Root = Trust Root? | **critical_boundary** | false | 2 | **Não** (corrigido — ver §26) |
| 4 | Simula pagamento 1500 KZ_DEMO | concept_explanation | false | 2 | KZ_DEMO fictício, use o Operador Zero |
| 5 | Simula reembolso 500 KZ_DEMO | concept_explanation | false | 2 | fluxo de reembolso demo |
| 6 | Reconciliação prova consistência? | **critical_boundary** | false | 2 | re-deriva, conserva KZ_DEMO (corrigido) |
| 7 | Chave revogada? | **critical_boundary** | false | 2 | bloqueia trust fail-closed (corrigido) |
| 8 | Evidence bundle formado? | evidence_bundle | false | 6 | agregado de conformidade/trust/… |
| 9 | Isto certifica? | concept_explanation | false | 4 | **Não**, não é certificado |
| 10 | Pode movimentar dinheiro real? | concept_explanation | false | 4 | **Não** (ADR-052) |
| 11 | Aparece em /operators? | state_check | false | 3 | **Não** |
| 12 | Vive em /operador-zero? | concept_explanation | false | 3 | superfície própria em zero.banza.network |

Em **todas**: `external_model_called=false`, **sem `<think>`**, boundary preservada, **nenhuma** usa a
rota apex `/operador-zero` como fonte, e **nenhuma** nomeia a marca do criador/mantenedor como um
operador — a única alusão é o tópico institucional da distinção organização≠protocolo≠agente (ADR-002)
no fallback genérico do BanzAI.

## 18–19. Subdomínio + endpoints

`zero.banza.network` canónico e autónomo; 10 endpoints root **200 JSON**, POST **405**, unknown **404**,
todos `demo_only:true · production_allowed:false · monetary_value:false · operator_id:operator-zero`, sem
private key, sem marca comercial de operador, sem claim de produção/certificação.

## 20–21. /operators + /certificates

`/operadores` e `/certificacao` — sem Operador Zero, sem produção (re-confirmado live).

## 22–24. Bugs, fixes, testes

- **BUG-1 (crítico):** o modelo local respondeu **"Sim"** a "Demo Operator Root = Trust Root?" — confusão
  demo↔protocolo. **FIX:** entrada crítica determinística `operador-zero-demo-root-vs-trust-root` →
  "Não" (route.rs + knowledge.js + WASM).
- **BUG-2:** reconciliação/revogação → `no_source`. **FIX:** entradas críticas
  `operador-zero-reconciliation` e `operador-zero-revocation` (boundary-safe, sourced).
- **BUG-3:** copy stale em `what-is-operador-zero` ("/operador-zero … subdomínio preparado mas não
  activo"). **FIX:** corrigido para "superfície própria em zero.banza.network; /operador-zero
  descontinuada (410)".
- **Testes:** `operator-zero-e2e-root` 10 Rust tests; banzai-api `node --test` 93/93; motor
  operator-zero-core 43 tests.

## 25. Guards

`operator-zero-full-e2e-check` (novo), `operator-zero-check`, `operator-zero-standalone-surface-check`,
`zero-subdomain-routing/design-check`, `operator-zero-public-hardening-check`,
`operator-zero-vocabulary-contract-check`, reference-*/svg-*, banzai-{agent,knowledge,document-aware,
document-explanation,qwen-routing,release-qa,public-interface,local-inference}-check, identity, purity,
rust-rule, private-key-leak — **todos verdes** (binário repo-guards fresco).

## 26–33. Confirmações de segurança

- ✅ **Não houve dinheiro real; não houve Kz real** — só KZ_DEMO fictício.
- ✅ **`/operators` inalterado** (sem Operador Zero); **`/certificates` inalterado** (sem produção).
- ✅ **Trust Root do protocolo BANZA inalterada**; a raiz E2E é `demo_operator_root ·
  not_protocol_trust_root:true`.
- ✅ **Modelo/tokens/timeout/reasoning/provider inalterados**; `external_model_called=false` em todas.
- ✅ **DNS/Cloudflare/TLS/nginx inalterados** nesta fase.
- ✅ **`/operador-zero` não é usado como fonte** e continua `410`.
- ✅ **Nenhuma private key** committada/exposta (endpoint/trace/relatório/evidence bundle).

## 34. Limites conhecidos

- O BanzAI conversacional é um **guia**: a prova autoritativa de reconciliação/revogação/assinatura é o
  **motor Rust** (`operator-zero-core` + `operator-zero-e2e-root`), não o texto do BanzAI. As entradas
  determinísticas garantem respostas boundary-safe; a interpretação livre continua a cargo do modelo
  local (Qwen), gated pela validação de fronteira pós-completação.

## 35. Rollback

Reverter o PR restaura o estado anterior (sem a crate E2E root, sem o guard, sem as entradas curadas).
O WASM banzai-api-kb e o knowledge.js são revertidos com um redeploy do banzai-api a partir de `main`. A
raiz E2E são ficheiros de exemplo/tooling — removê-los não afecta nenhuma superfície servida.

## Veredito

**O Operador Zero valida o protocolo BANZA de ponta a ponta como simulador demo-only: BanzAI guia, os
motores Rust verificam, e a evidência técnica local prova a jornada sem dinheiro real, sem operador real,
sem certificação, sem licença e sem produção. A superfície canónica é zero.banza.network; a antiga rota
apex /operador-zero permanece removida/descontinuada e não é usada como fonte.**
