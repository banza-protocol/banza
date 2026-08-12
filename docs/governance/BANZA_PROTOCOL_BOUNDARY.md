# BANZA — Protocol Boundary and Canonical Language

> **Formulação canónica.** BANZA é um **protocolo financeiro aberto** para interoperabilidade,
> conformidade e evidência em pagamentos. O BANZA não é prestador de serviços de pagamento, não é operador
> financeiro, não processa transacções, não liquida valores, não movimenta fundos e não detém fundos. Os
> serviços financeiros são prestados por operadores autorizados que implementam o protocolo.

Este documento fixa a linguagem canónica usada em todo o projecto (documentação, website, Workbench,
respostas do BanzAI, READMEs, sumários de ADR/RFC). É a fonte de verdade quando houver dúvida sobre como
descrever o que o BANZA é e o que não é.

## Permanent Protocol Identity

A identidade do BANZA é **permanente**, não uma fase que possa mudar. Afirma-se pela positiva, não apenas
pela negação:

- O BANZA **é** um protocolo financeiro aberto.
- O BANZA **permanece** protocolo financeiro aberto — é e continuará a ser protocolo financeiro aberto.
- O BANZA **não é** operador financeiro.
- O BANZA **não é** PSP (prestador de serviços de pagamento).
- O BANZA **não é** banco.
- O BANZA **não é** carteira.
- O BANZA **não é** prestador de serviços financeiros.
- O BANZA **não processa** pagamentos.
- O BANZA **não liquida** valores.
- O BANZA **não movimenta** fundos.
- O BANZA **não detém** fundos.
- O BANZA **não presta** serviços financeiros ao público.
- O BANZA **não emite** licença.
- O BANZA **não substitui** o regulador.
- A **conformidade do protocolo** é demonstrada por evidência verificável, **não** por autorização regulatória.
- Os **operadores autorizados** implementam o protocolo e são **entidades separadas**, responsáveis pelos
  serviços financeiros que prestam e pelo respectivo enquadramento regulatório.

> **Regra de identidade.** Não descreva a natureza do BANZA como algo que se deva «evitar transformar» ou
> que «não deve tornar-se» operador/PSP — isso sugere, incorrectamente, uma possibilidade contrária à
> identidade permanente do projecto. Prefira **preservar a natureza do BANZA como protocolo financeiro
> aberto** e **manter a fronteira protocolo/operador**.

## Termo preferido

Use **protocolo financeiro aberto**, **protocolo**, **protocolo aberto**, **protocolo BANZA**,
**protocolo de interoperabilidade financeira** ou **fronteira protocolo/operador**.
Evite «protocolo técnico» como formulação principal — a palavra «técnico» só deve aparecer quando for
necessário distinguir explicitamente o protocolo de actividade financeira regulada, operação de pagamento,
autorização, licença, movimentação de fundos ou prestação de serviços financeiros (por exemplo:
«preparação técnica, não autorização regulatória»).

## 1. O que o BANZA é

- um **protocolo aberto** e um protocolo de **interoperabilidade**;
- **contratos e formatos** (OpenAPI, schemas de eventos/webhooks, payload de QR, contratos de evento);
- **regras de conformance** e vetores de conformidade;
- **evidência** técnica reproduzível;
- **readiness** (L0/L1/L2/L3 — preparação técnica);
- **trust e revogação** (signed protocol metadata, delegated signing keys, revocation/fail-closed);
- **ferramentas de validação** (conformance, SimB, trust, readiness, evidence bundle);
- uma **referência para operadores** que implementam o protocolo.

## 2. O que o BANZA NÃO é

O BANZA **não é** e **não faz** nenhuma das seguintes coisas:

- não é **PSP** (prestador de serviços de pagamento);
- não é **banco**;
- não é **carteira**;
- não é **emissor de moeda electrónica**;
- não é **adquirente**;
- não é **operador financeiro**;
- não presta **serviços financeiros ao público**;
- não **processa** pagamentos;
- não **liquida** pagamentos;
- não **movimenta** fundos;
- não **detém** fundos;
- não **gere** saldos;
- não **executa** transacções reais;
- não **substitui autorização regulatória**;
- não **emite licença**;
- não **autoriza** operadores perante o regulador.

## 3. Onde a regulação/licença se aplica

A regulação e a licença aplicam-se a quem presta serviços financeiros reais:

- operadores que prestam serviços financeiros reais;
- bancos;
- PSPs;
- instituições autorizadas;
- operadores que implementam o BANZA para oferecer pagamentos reais.

> **Regra obrigatória.** Qualquer licença, autorização ou enquadramento regulatório pertence ao operador
> que presta serviços financeiros reais usando o protocolo, não ao protocolo BANZA em si.

## 4. Substituições canónicas

| Evitar | Usar |
|---|---|
| «BANZA precisa de licença / autorização» | «A licença/autorização pertence ao operador que presta serviços financeiros reais usando o protocolo» |
| «BANZA é PSP / prestador de serviços de pagamento» | «BANZA é um protocolo aberto; os operadores autorizados prestam os serviços» |
| «BANZA processa / liquida / movimenta fundos» | «Os operadores processam/liquidam; o BANZA define as regras que implementam» |
| «BANZA autoriza operadores» | «O regulador autoriza; a conformidade do protocolo é demonstrada por evidência verificável e não substitui o regulador» |
| «protocolo técnico» (como descrição principal) | «protocolo financeiro aberto» / «protocolo aberto» |
| «não transformar BANZA em operador financeiro / PSP» | «BANZA é e continuará a ser protocolo financeiro aberto; os operadores autorizados são entidades separadas que implementam o protocolo» |
| «evitar que BANZA se torne operador / PSP» | «preservar a natureza do BANZA como protocolo financeiro aberto» |

## 5. Conformidade do protocolo

A conformidade com o protocolo é **demonstrada por evidência verificável**, não concedida por nenhuma
autoridade. Um operador independente executa a Conformance Automation, gera um Evidence Bundle e publica
evidência que qualquer terceiro reproduz de forma independente. O trust do protocolo assenta em signed
protocol metadata, delegated signing keys, operator manifests, conformance evidence, public protocol
registry e revocation/fail-closed. A demonstração de conformidade é técnica e não substitui a licença, a
autorização ou o enquadramento regulatório do operador, que pertencem ao operador perante a entidade
competente.

## 6. Readiness (L0–L3)

`L0`/`L1`/`L2`/`L3` são **preparação técnica / conformance**, não produção:

- **L2 Readiness** verifica artefactos de fluxo de pagamento — payment intent, idempotência, ledger,
  trace linkage, settlement obligation e evidence reference — em modo local/demo/test-only. **Não é
  pagamento real, não move fundos e não representa operação em produção.**
- **L3 Readiness** é preparação de federação em modo local/demo/test-only. **Não é federação activa, não
  move fundos, não cria operador, não certifica e não aprova.**

`evidence bundle` não é licença; `readiness` não é aprovação; `PASS` é evidência técnica, não certificado.

Ver também: [`BANZA_REGULATORY_POSITIONING.md`](BANZA_REGULATORY_POSITIONING.md),
[`certification-boundary.md`](certification-boundary.md), [`licensing.md`](licensing.md).
