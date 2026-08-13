# Operator Manifest Validation

> **Regra central:** Operator Manifest Validation é evidência técnica. **Não é certificação, não é aprovação e não cria operador real** (não altera `/operators`).

## O que é

O **operator manifest** é o documento de descoberta de um operador BANZA, servido no caminho well-known
`/.well-known/banza/operator.json`. O **BanzAI** valida-o **localmente** (Rust/WASM, sem rede
por defeito) e produz um relatório técnico. Serve para um operador candidato preparar a submissão, a par
do [SimB Pre-Review Gate](SIMB_PRE_REVIEW_GATE.md) e do [Evidence Bundle](EVIDENCE_BUNDLE.md).

O engine é o crate Rust **`banza-operator-manifest`** (BX1.6): o status, a readiness e os hashes são
calculados **em Rust** — o TypeScript apenas invoca o engine e mostra o resultado.

## Schema

### Núcleo canónico (normativo)

Do `contracts/openapi/reference-operator.yaml` (`OperatorManifest`) e dos vectores de conformidade
`operator-manifests.json` (MAN-001..004):

| Campo | Regra |
|---|---|
| `operator_id` | obrigatório, string |
| `environment` | obrigatório; permitido: `demo`, `sandbox`, `pre-production` |
| `simulated` | obrigatório; **deve ser `true`** (invariante de segurança MAN-002) |
| `production_allowed` | obrigatório; **deve ser `false`** (invariante de segurança MAN-002) |
| `capabilities` | obrigatório, objecto (`supports_wallets`, `supports_qr`, `supports_settlement[_simulation]`) |

### Extensão de submissão (DRAFT — não-normativa)

Campos que um candidato acrescenta para a submissão. **DRAFT / não-normativo até aprovação governada**;
a sua ausência torna o manifesto `INCOMPLETE`:

`key_manifest_url` (a raiz de confiança do operador), `protocol_version` (1.x), `base_url`,
`supported_levels`.

### Recomendados (aviso se ausentes)

`name`, `brl_url`, `conformance_url`, `contact`, `manifest_version`, `created_at`. (`certificates_url` é um campo legacy: continua a ser verificado como URL quando presente, mas já não é recomendado — ADR-037: não existe rota de índice de certificados.)

## Status (calculado em Rust)

| Status | Critério |
|---|---|
| `VALID` | todos os obrigatórios presentes e válidos; nenhum erro/violação |
| `INVALID` | erro de tipo/valor, URL malformada, `protocol_version` incompatível, ou **violação de fronteira** (produção/certificação) |
| `INCOMPLETE` | falta um campo obrigatório (canónico ou de submissão) |
| `MALFORMED` | JSON inválido ou não-objecto |

`readiness`: `READY_FOR_SIMB_PRE_REVIEW` (VALID) · `BLOCKED` (INVALID) · `NOT_READY`
(INCOMPLETE/MALFORMED).

## Validação local — sem rede

Por defeito **não há chamadas de rede**. As URLs declaradas (`base_url`, `key_manifest_url`, …) são
verificadas apenas na **forma**; o seu conteúdo não é obtido (*Operator URL validation disabled in this
phase*). Uma futura opção de validação live fica **desactivada** nesta fase.

## Fronteira

- Um manifesto **válido é evidência técnica**.
- **Não cria operador** (não altera `/operators`), **não certifica**, **não aprova**.
- Uma tentativa de declarar produção/certificação (`production_allowed=true`, `environment=production`,
  `certified`, `certificate`) é **rejeitada** (`INVALID` + erro de fronteira).
- A conformidade é **demonstrada por evidência verificável** e reverificável por qualquer terceiro; não existe emissão nem aprovação humana de operadores.

## Relação com o pipeline

```
Operator Manifest (recomendado) → SimB Pre-Review Gate → Conformidade L0 → Evidence Bundle publicado (evidência de conformidade reverificável por qualquer parte)
```

Um manifesto válido **não substitui** o SimB nem a Conformidade L0. No Evidence Bundle, o
`operator_manifest_validation` é um artefacto **recomendado** (não quebra a readiness mínima existente).

## Estado actual (pré-produção)

Provider mock, `llm_calls = 0`, `external_model_called = false`, `/operators = []`,
`production_certificates = false`. Fixtures `TEST ONLY — NOT PRODUCTION`.

## Decisão de arquitectura

Novo crate **`engines/banza-operator-manifest`** (rlib + cdylib, feature `wasm`), decoupled: valida o
manifesto localmente e é reusado pelo `banza-evidence-bundle` (demo). O núcleo é normativo (contratos +
vectores); a extensão de submissão é DRAFT até aprovação governada.
