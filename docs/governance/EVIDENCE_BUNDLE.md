# Evidence Bundle

> **Regra central:** O Evidence Bundle é evidência de conformidade verificável, montada no BanzAI. **Não é certificado e não é aprovação.**

## O que é

O **Evidence Bundle** é o pacote de evidência de conformidade verificável que um operador independente
monta no BanzAI e publica para que qualquer terceiro o reproduza. Reúne os resultados já
produzidos pelas ferramentas do BanzAI — o **SimB Pre-Review Gate**, a **Conformidade L0**, a
**verificação de Traces** e o **Trust & BRL** — com as versões das ferramentas, hashes de integridade,
citações, limitações e um estado de *readiness*.

O bundle é assemblado pelo engine Rust **`banza-evidence-bundle`**, compilado para WASM e executado no
browser. A *readiness*, os artefactos em falta e os hashes SHA-256 são **calculados em Rust** — o
TypeScript apenas invoca o engine e mostra o resultado.

## Artefactos

| Artefacto | Estado |
|---|---|
| `simb_pre_review` | **obrigatório** |
| `conformance_l0` | **obrigatório** |
| `trace_verification` | recomendado (nesta fase) |
| `trust_brl_verification` | recomendado (nesta fase) |

A ausência de um artefacto **obrigatório** torna o bundle `INCOMPLETE`. Os recomendados são registados,
hasheados e sinalizados quando ausentes, mas não bloqueiam a *readiness* mínima nesta fase.

## Readiness

Calculada em Rust a partir dos artefactos obrigatórios:

| Readiness | Critério |
|---|---|
| `READY_FOR_TECHNICAL_REVIEW` | SimB PASS **e** L0 PASS |
| `BLOCKED_BY_SIMB` | SimB FAIL |
| `BLOCKED_BY_CONFORMANCE` | SimB PASS **e** L0 FAIL |
| `INCOMPLETE` | faltam artefactos obrigatórios (ou SimB/L0 incompletos) |
| `NOT_READY` | estado inicial / indeterminado |

`READY_FOR_TECHNICAL_REVIEW` é **evidência técnica de prontidão — não é certificação nem aprovação.**

### Terminologia

**Nunca usar:** `CERTIFIED`, `APPROVED`, `PRODUCTION_READY`, `OPERATOR_CERTIFIED`.

## Campos

`schema_version`, `bundle_id`, `created_at`, `mode` (`demo | local | uploaded | operator_url_disabled`),
`environment` (`pre-production`), `operator_candidate`, `simb_pre_review`, `conformance_l0`,
`trace_verification`, `trust_brl_verification`, `tool_versions`, `hashes`, `citations`, `limitations`,
`required_artifacts`, `recommended_artifacts`, `missing_required`, `missing_recommended`, `readiness`,
`not_a_certificate` (**true**), `not_an_approval` (**true**), `requires_conformance_evidence_review` (**true**),
`boundary`, `llm_calls` (**0**), `external_model_called` (**false**).

## Hashes e integridade

Os hashes são **SHA-256 sobre a forma JSON canónica** (chaves ordenadas, compacto):

- `hashes.bundle_hash` — o bundle inteiro (excepto o próprio `bundle_hash`);
- `hashes.simb_report_hash`, `conformance_report_hash`, `trace_report_hash`, `trust_report_hash` — por
  relatório (null quando ausente).

Os hashes são **integridade técnica, não assinatura nem autoridade**. A validação recomputa o
`bundle_hash` e falha se não corresponder (deteção de adulteração).

## Fronteira

- O Evidence Bundle **não certifica** e **não aprova**.
- O BanzAI **não certifica, não aprova e não emite certificados**.
- Não cria operador real; não altera `/operators`. A BANZA não emite certificados a operadores (modelo de confiança aberto).
- A conformidade é **demonstrada por evidência verificável** e reproduzível por qualquer terceiro; não existe revisão, aprovação ou aceitação humana de operadores.

## Estado actual (pré-produção)

Modo demo/local no browser: provider mock, `llm_calls = 0`, `external_model_called = false`,
`/operators = []`, `production_certificates = false`. O export produz `banza-evidence-bundle-YYYYMMDD-HHMM.json`.

## Decisão de arquitectura

O assembler vive num **novo crate `engines/banza-evidence-bundle`** (rlib + cdylib, feature `wasm`),
decoupled: consome os relatórios JSON das outras ferramentas e reusa os engines reais
(`banza-simb`, `banza-conformance`, `banza-trust`) apenas para o **bundle demo**. Ficou fora de
`banzai-evidence` (o engine de conhecimento do Assistente) para não lhe adicionar `sha2` nem lógica de
assembly, e fora de `banza-conformance` para manter a responsabilidade única.

## Ver também

- [SimB Pre-Review Gate](SIMB_PRE_REVIEW_GATE.md)
- [`/banzai`](https://banza.network/banzai)
