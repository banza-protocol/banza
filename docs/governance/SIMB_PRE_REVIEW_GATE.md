# SimB Pre-Review Gate

> **Regra:** Todo operador candidato deve passar por SimB antes de publicar a sua evidência de conformidade (self-publication).

## Definição

**SimB é o ambiente obrigatório de pré-validação técnica para operadores candidatos.** Um operador
candidato executa os seus fluxos contra o SimB (o simulador determinístico, local, test-only do
protocolo BANZA) e obtém **evidência técnica de pré-validação** antes de publicar a sua evidência de
conformidade (avaliação de conformidade por evidência verificável).

Esta é uma etapa **normativa e obrigatória**: a publicação da evidência de conformidade não deve
avançar sem um **SimB PASS** técnico.

## Objectivo

O SimB Pre-Review Gate existe para:

- testar os fluxos BANZA de um operador candidato;
- validar o **ledger** (double-entry, INV-LEDGER);
- validar a **idempotência** (INV-IDEM);
- validar o **settlement** (identidade `net + fee == gross`, INV-SETTLE);
- validar os **traces** (propagação de `trace_id`, INV-TRACE);
- correr **conformance inicial** (L0 demo contra SimB);
- **gerar evidência técnica** reproduzível;
- **reduzir falhas** antes de publicar a evidência de conformidade.

## Fronteira

O SimB Pre-Review Gate é uma etapa técnica. **Não é certificação.**

- SimB **não certifica**.
- SimB **não aprova**.
- SimB **não autoriza nem emite qualquer estatuto de operador**.
- SimB **não move fundos reais**.
- SimB **não cria operador real**.
- SimB **não altera estado público** — não toca `/operators` nem `/certificates`.
- SimB gera **apenas evidência técnica de pré-validação**.

Após **SimB PASS** e conformidade, o operador **publica** o Evidence Bundle, o manifest e a signed
protocol metadata (self-publication). A confiança do protocolo é depois avaliada pela **Open Trust
Evaluation** sobre a evidência publicada e indexada no **public protocol registry**. **Não existe
revisão, aprovação ou certificação humana de operadores** — o BanzAI não certifica, não aprova e não
emite certificados.

## Resultado possível

O gate produz um de três estados:

| Estado | Significado |
|---|---|
| `SIMB_PRE_REVIEW_PASS` | Todos os invariantes técnicos passaram — evidência técnica gerada; pronto para submissão técnica / preparação de evidência. |
| `SIMB_PRE_REVIEW_FAIL` | Um ou mais invariantes falharam — bloqueado por falhas SimB; corrigir antes de revisão. |
| `SIMB_PRE_REVIEW_INCOMPLETE` | Execução incompleta ou input malformado — evidência insuficiente. |

### Terminologia

**Nunca usar** (o SimB gate não os produz): `CERTIFIED`, `APPROVED`, `PRODUCTION_READY`,
`OPERATOR_CERTIFIED`.

**Usar:** `pronto para submissão técnica`, `pronto para publicar evidência de conformidade`,
`bloqueado por falhas SimB`, `evidência técnica gerada`.

## Fluxo

```
SimB  →  Conformidade L0  →  Evidence Bundle  →  Evidência de Conformidade publicada  →  Open Trust Evaluation / Public Protocol Registry
(obrigatório)  (após SimB)     (evidência)        (self-publication)                        (avaliação da evidência publicada)
```

- **SimB** — etapa obrigatória. Sem SimB PASS, as etapas seguintes não devem declarar prontidão para publicar evidência.
- **Conformidade L0** — corre contra o SimB; `ready_for_conformance_evidence_review` só é verdadeiro com **SimB PASS + L0 PASS**.
- **Evidence Bundle** — o `SimB pre-review report` é um item obrigatório do pacote.
- **Evidência de Conformidade publicada** — o operador publica o Evidence Bundle, o manifest e a signed protocol metadata (self-publication); a confiança é avaliada por **Open Trust Evaluation** sobre a evidência publicada, indexada no public protocol registry. **Não existe revisão, aprovação ou certificação humana de operadores; ninguém emite certificados.**

## Estado actual (pré-produção)

Nesta fase o gate corre em modo **demo / test-only**: provider mock, `llm_calls = 0`,
`external_model_called = false`, `/operators = []`, `production_certificates = false`. Nenhum operador
real é criado e nenhum certificado é emitido. `ready_for_conformance_evidence_review` é **evidência técnica de
prontidão, não certificação** — *Ready to publish conformance evidence is not certification.*

## Ver também

- [`/banzai`](/banzai) — SimB e Conformidade no BanzAI
- [Referência §10 · BanzAI](/referencia/banzai)
- [Referência §6 · Conformidade](/referencia/certificacao)
- [BX1.3 — SimB + Conformance L0 WASM](PHASE_BX1_3_BANZAI_SIMB_CONFORMANCE_L0_WASM_2026_07.md)
