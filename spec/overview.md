# BANZA — Arquitectura do Protocolo

> **BANZA is a protocol. It does not operate wallets, move funds, settle funds, hold balances or run payment infrastructure.**
>
> This document describes: **BANZA** — the Open Financial Protocol.
> For other layers: [BanzAI](https://banzai.banza.network) · [Conformant operators](../docs/governance/certification-boundary.md)

**Version:** v1.0  
**Repository VERSION:** 1.0.0  
**Date:** 2026-06-11  
**Status:** Official v1.0 · pre-production · no operator has published conformance evidence  
**Authority:** ADR-001

---

## Identidade do Protocolo

O BANZA é um **protocolo** — um conjunto de regras públicas que define como operadores de pagamento conformes interoperam.

| O BANZA é | O BANZA não é |
|-----------|---------------|
| Protocolo aberto de pagamentos | Software |
| Conjunto de regras públicas | Protocol core financeiro |
| Modelo de certificação | Implementação específica |
| Arquitectura de confiança | Operador de pagamentos |
| Modelo de federação | Processador de transacções |
| Camada institucional de interoperabilidade | Dependente de qualquer tecnologia |

O modelo mental correcto:

```
HTTP  → Web
SMTP  → Email
BGP   → Routing de Internet
BANZA → Pagamentos interoperáveis
```

---

## Camadas da Arquitectura

O BANZA organiza-se em cinco camadas conceptuais:

| Camada | Conteúdo | Responsável |
|--------|----------|-------------|
| **Governação** | ADRs, RFCs, processo de evolução do protocolo | Governação BANZA |
| **Especificação** | Contratos, schemas, invariantes, formato QR | Este repositório |
| **Conformidade** | Níveis L0–L4, suite de conformidade, critérios | `conformance/` + Open Trust Evaluation |
| **Federação** | Protocolo de encaminhamento inter-operadores, confiança criptográfica | Operadores com implementações que demonstraram o perfil L3, quando a trust metadata de produção estiver aberta |
| **Implementação** | Tecnologia escolhida pelo operador — não governada por BANZA | Cada operador |

A camada de implementação é da responsabilidade exclusiva de cada operador. BANZA não prescreve linguagens, frameworks, bases de dados, nem infraestrutura.

---

## BanzAI — Agente Nativo do Protocolo

O BANZA é um protocolo financeiro aberto acompanhado por um **agente IA nativo: o BanzAI** (ADR-036). O BanzAI acompanha o operador ao longo de todo o percurso — do manifesto à federação: guia, simula fluxos, invoca ferramentas verificáveis, explica resultados, ajuda a corrigir falhas e prepara evidência.

O BanzAI **não** é uma camada normativa e **não** cria regras. A separação de responsabilidades é explícita:

| Camada | Papel | O BanzAI |
|--------|-------|----------|
| Governação do Protocolo | Mantém specs, ADRs, RFCs, segurança e evolução; não aprova operadores; activa regras novas apenas por processo formal | O BanzAI pode redigir propostas, mas não activa regras |
| Protocol Core | Contratos, schemas, invariantes, metadata, registo, revocation, federação | O BanzAI lê e explica; não redefine |
| Motores de Verificação | Rust/WASM determinísticos — calculam conformidade, trust, traces, estados de evidência | O BanzAI orquestra e explica; a verificação continua nos motores |
| Operadores | Implementam, corrigem, validam e publicam evidência; participam por self-publication | O BanzAI guia; o operador decide e publica |
| Pares / Federação | Verificam evidência publicada; a interoperabilidade é decisão local baseada em evidência | O BanzAI ajuda a ler evidência; não admite ninguém |

As regras activas provêm da Referência BANZA, dos ADRs/RFCs aceites, das specs, contratos, schemas, invariantes e releases. O BanzAI orienta e explica, mas não é fonte normativa: não aprova, não certifica, não licencia, não decide participação, não inventa regras, não adiciona decisões arquitecturais e não substitui a Referência nem os motores determinísticos Rust/WASM. As entidades reguladoras competentes situam-se fora do protocolo e tratam de licenciamento/autorização quando aplicável ao operador.

Ver [ADR-036](../decisions/adr/ADR-036-banzai-a-non-authoritative-interface-to-the-protocol.md) e [docs/governance/BANZAI_NATIVE_PROTOCOL_AGENT.md](../docs/governance/BANZAI_NATIVE_PROTOCOL_AGENT.md).

---

## Contratos Públicos

Os contratos do protocolo definem a superfície pública que qualquer implementação deve respeitar:

| Directório | Conteúdo |
|------------|---------|
| `contracts/openapi/` | Especificação OpenAPI — shape das APIs que os operadores devem expor |
| `contracts/webhooks/` | Esquemas de payload de webhooks |
| `contracts/qr/` | Formato de payload QR (`BANZA:` e `BANZA-SBX:`) |
| `contracts/events/` | Esquemas de eventos |

Mudanças a contratos públicos requerem um ADR e um período de revisão mínimo de 7 dias. Ver [docs/governance/README.md](../docs/governance/README.md).

---

## Invariantes Financeiros

Os invariantes financeiros são propriedades do protocolo — não de nenhum operador nem de nenhuma tecnologia. Qualquer operador conforme deve impô-los na sua implementação.

| Invariante | Descrição |
|-----------|-----------|
| `INV-LEDGER-001` | Débito total = Crédito total (partidas dobradas) |
| `INV-LEDGER-002` | Entradas de ledger são imutáveis após criação |
| `INV-LEDGER-003` | Todos os valores monetários são inteiros (sem vírgula flutuante) |
| `INV-LEDGER-004` | O posting é atómico — nunca parcialmente aplicado |
| `INV-WALLET-001` | `balance = available + reserved` em todos os momentos |
| `INV-STL-001` | `gross = net + fee` (sem criação de dinheiro) |
| `INV-IDEM-001` | Mesma chave de idempotência produz sempre o mesmo resultado |

Estes invariantes são verificados pela suite de conformidade em `conformance/`. A sua verificação é determinística — não depende de inferência nem de avaliação subjectiva.

---

## Representação Monetária

O protocolo proíbe aritmética de vírgula flutuante para valores monetários. Este é um invariante do protocolo, não uma escolha de implementação:

- Todos os valores monetários são inteiros em unidades menores
- Todos os campos de montante usam o sufixo `_minor`

```json
{ "amount_minor": 250000, "currency": "AOA" }
```

Convenção canónica: 250000 = 2.500,00 Kz (Kwanza e cêntimos).

A representação monetária é normativamente fixada pelo registo de invariantes
[`contracts/invariants.json`](../contracts/invariants.json) — famílias `INV-LEDGER-*`, `INV-WALLET-*` e
`INV-STL-*` — e pela canonicalização em [`spec/canonicalization.md`](canonicalization.md), ambos
indexados pelo Manifesto Normativo. *Explicação (não normativa):*
[Referência §4](../docs/reference/pt/BANZA_REFERENCIA.md).

---

## Modelo de Capacidades

Os operadores declaram as suas capacidades num manifesto formal. O protocolo define quais as combinações de capacidades que são permitidas e quais os invariantes que cada capacidade deve satisfazer.

```json
{
  "operator_id": "operator-a",
  "certification_level": 2,
  "capabilities": {
    "wallet.consumer": true,
    "wallet.merchant": true,
    "qr.static": true,
    "qr.dynamic": true,
    "p2p.transfer": true,
    "settlement.t0": true
  }
}
```

O manifesto é publicado em `/.well-known/banza/operator.json` e assinado com a chave do operador. A assinatura e a signed protocol metadata associada são avaliadas pela Open Trust Evaluation (trust root → chaves delegadas → registo público → revocation/fail-closed), sem autoridade central.

Ver [docs/governance/certification-boundary.md](../docs/governance/certification-boundary.md) para os requisitos de cada nível.

---

## Rastreabilidade

O protocolo define que cada evento financeiro carrega um `trace_id`. A cadeia causal de qualquer operação deve ser reconstituível. Este é um requisito do protocolo, não de nenhuma implementação específica.

```
pagamento iniciado      → trace_id: "trc_abc123"
débito de ledger        → trace_id: "trc_abc123", causation_id: "trf_001"
crédito de ledger       → trace_id: "trc_abc123", causation_id: "trf_001"
entrada de liquidação   → trace_id: "trc_abc123", causation_id: "trf_001"
webhook dispatch        → trace_id: "trc_abc123"
```

O invariante `INV-TRACE-001` impõe que todos os artefactos numa cadeia causal partilhem o mesmo `trace_id`.

---

## Arquitectura de Confiança

O BANZA define uma hierarquia de assinatura de 4 camadas, ancorada numa linhagem e não numa chave:

```
Conjunto de Autoridades da Raiz  (três autoridades · limiar dois · offline)
    │   génese fixado no verificador; cada conjunto seguinte é
    ▼   autorizado pelo limiar do conjunto que sucede
Manifesto de Chaves  (assinado por duas autoridades distintas do conjunto activo)
    ↓
Chaves de Assinatura Delegadas  (por domínio · listadas pelo manifesto)
    ↓
Signed Protocol Metadata  (ed25519 · máximo 90 dias · ligada ao operador)
    ↓
Manifestos de Operador  (assinados · públicos)
```

Não existe autoridade de certificação. O trust é avaliado pela Open Trust Evaluation — signed protocol metadata → chaves delegadas → registo público → revocation/fail-closed. O BanzAI explica os critérios mas não certifica nem emite certificados. Os operadores fixam o **conjunto génese** uma vez; a partir daí a linhagem transporta a confiança, porque cada conjunto é autorizado pelo limiar do anterior. Uma autoridade pode assim ser substituída pelas duas sobreviventes sem que qualquer verificador tenha de voltar a fixar nada à mão.

O modelo de confiança é normativamente fixado por
[`spec/root-authority-set.md`](root-authority-set.md) e [`spec/trust-freshness.md`](trust-freshness.md),
com os esquemas de produção correspondentes em [`contracts/production/`](../contracts/production/), todos
indexados pelo Manifesto Normativo. *Explicação (não normativa):*
[Referência §6](../docs/reference/pt/BANZA_REFERENCIA.md).  
Ver [ADR-025](../decisions/adr/ADR-025-trust-without-a-certificate-authority.md) para a arquitectura da raiz (Trust Root offline, chaves de assinatura delegadas, manifesto de chaves assinado)
e [`root-authority-set.md`](./root-authority-set.md) para a linhagem de conjuntos e a sucessão (ADR-039).

---

## Federação

A federação é uma capacidade de primeira classe na arquitectura BANZA. Quando existirem em funcionamento implementações que tenham demonstrado o perfil L3, os operadores que as executam poderão encaminhar pagamentos entre si sem reconstruir a mesma integração técnica bilateral por cada par:

1. Operador A avalia a signed protocol metadata do Operador B (trust root → chave delegada) contra o registo público e o BRL (Open Trust Evaluation)
2. Operador A encaminha o pedido de pagamento para Operador B
3. Operador B avalia a signed protocol metadata do Operador A (confiança bidirecional)
4. A liquidação segue as regras do protocolo

```
Operador A  →[metadata verificada]→  Operador B
            ←[metadata verificada]←
                     ↓
            [protocolo de liquidação]
```

A federação é normativamente fixada pela superfície em [`spec/federation/`](federation/) — fluxo de
protocolo, modelo de confiança, invariantes e superfície de contrato — e pelos contratos em
[`contracts/federation/`](../contracts/federation/), todos indexados pelo Manifesto Normativo.
*Explicação (não normativa):* [Referência §10](../docs/reference/pt/BANZA_REFERENCIA.md).  
Ver [ADR-025](../decisions/adr/ADR-025-trust-without-a-certificate-authority.md) para o modelo de avaliação de trust de federação (sem certificados).

---

## Ciclo de Vida de Pagamento

O protocolo define a ordem obrigatória das operações:

```
Iniciação do pagamento
    ↓
Verificação de risco (síncrona)
    ↓
Verificação de conformidade (síncrona)
    ↓
Posting de ledger (atómico · síncrono)
    ↓
Estado do pagamento → COMPLETED
    ↓
Dispatch de webhook (após commit)
    ↓
Assíncrono: reconciliação, relatórios
```

**Regra crítica do protocolo:** O posting de ledger é sempre síncrono e atómico. Filas assíncronas nunca são usadas para a confirmação principal de pagamento. Implementações candidatas podem declarar objetivos de latência no seu perfil de implementação ou conformidade. O BANZA define estados, invariantes e restrições de ordenação; não fornece ou promete latência operacional.

---

## Certificação e Conformidade

O protocolo define cinco perfis de conformidade (L0–L4):

| Perfil | Nome | O que significa |
|-------|------|-----------------|
| L0 | Protocol Sandbox | Invariantes financeiros implementados e verificáveis |
| L1 | Core Payment Capability | Carteiras, ledger, transferências, idempotência |
| L2 | Payment Initiation Capability | QR, payment links, suite completa |
| L3 | Inter-Operator Interoperability | Encaminha para e recebe de implementações conformes de outros operadores |
| L4 | External Interoperability | Integra com infraestruturas externas |

A conformidade é verificada por uma suite de testes determinística em `conformance/`. O operador publica a evidência de conformidade (self-publication) e a confiança é avaliada pela Open Trust Evaluation. Ninguém certifica operadores — nem uma autoridade central, nem o próprio operador. Ao longo deste percurso o BanzAI guia o operador (do manifesto à federação), os motores Rust/WASM verificam e a evidência publicada prova; o BanzAI orienta e explica, mas não certifica.

Ver [docs/governance/certification-boundary.md](../docs/governance/certification-boundary.md) para os requisitos completos.

---

## O que NÃO está neste repositório

BANZA é o protocolo. As implementações pertencem a repositórios independentes:

| O que pertence aqui | O que NÃO pertence aqui |
|---------------------|-------------------------|
| Especificação (`contracts/`) | Código de implementação de operador |
| Suite de conformidade (`conformance/`) | Apps de consumidor ou comerciante |
| ADRs e RFCs (`decisions/adr/`, `decisions/rfc/`) | Infraestrutura de produção de operadores |
| Exemplos ilustrativos (`examples/`) | Integrações proprietárias |
| Documentação do protocolo | Lógica de negócio de qualquer operador |

---

**Referências:**

- ADR-012 — Ledger de partidas dobradas
- ADR-015 — Sistema de pagamento QR
- ADR-014 — Modelo de identidade de conta/participante
- ADR-001 — Open financial protocol (implementation independence) (historial)
- ADR-001 — Separação operador/protocolo
- ADR-001 — Inversão de nomenclatura do ecossistema

Ver também:
- [docs/reference/pt/BANZA_REFERENCIA.md](../docs/reference/pt/BANZA_REFERENCIA.md) — Referência canónica do protocolo (PT, servida em banza.network/referencia)
- [docs/governance/certification-boundary.md](../docs/governance/certification-boundary.md) — Perfis de conformidade L0–L4
- [docs/guides/conformance.md](../docs/guides/conformance.md) — Suite de conformidade
