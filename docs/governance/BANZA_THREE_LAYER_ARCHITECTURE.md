# BANZA — Arquitectura Institucional de Três Camadas

- **Status:** Canónico
- **Data:** 2026-07
- **Milestone:** M2.19C
- **Relacionado:** ADR-004 (arquitectura de três camadas), ADR-006 (Banzami Operational Scheme),
  ADR-005 (certificação ≠ admissão ≠ autorização), ADR-007 (fronteira de estado regulatório +
  RealMoneyActivationGate), ADR-006 (conflito de interesses + separação de infraestrutura/chaves),
  ADR-001/003 (protocolo aberto / neutralidade do operador), ADR-038 (motores em Rust), ADR-036
  (BanzAI como interface humana primária — opcional, transversal e não autoritativa, ADR-036)

> **O BANZA é um protocolo financeiro aberto.** O BANZA não é banco, PSP, carteira, instituição de
> moeda electrónica nem operador financeiro; não detém nem movimenta fundos, não corre contas de
> clientes, não liquida, não presta serviços financeiros, não emite licenças e não substitui o
> regulador nem qualquer scheme. Os serviços financeiros são prestados por operadores autorizados que
> implementam o protocolo, sob o seu próprio enquadramento regulatório.

Este documento é a forma canónica e legível da **ADR-004**. Fixa, num único lugar, o que é o BANZA,
o que certifica e quem opera — de modo que um leitor, um operador, um auditor, um regulador e o
próprio BanzAI cheguem sempre à mesma resposta. Complementa
[`BANZA_REGULATORY_POSITIONING.md`](BANZA_REGULATORY_POSITIONING.md),
[`BANZA_PROTOCOL_BOUNDARY.md`](BANZA_PROTOCOL_BOUNDARY.md) e
[`certification-boundary.md`](certification-boundary.md).

---

## 1. Propósito

O BANZA é uma **arquitectura institucional de três camadas**, com o **BanzAI** como interface
humana **transversal** às três. As camadas estão separadas por responsabilidade, por infraestrutura e
por chaves. Esta separação é um **invariante arquitectural**, não uma escolha de apresentação: é o que
mantém o protocolo neutro e a fronteira regulatória estrutural, e não apenas editorial.

A regra permanente do ADR-001/003 mantém-se: **o protocolo é neutro em relação ao operador e sobrevive
a qualquer operador.** A introdução do primeiro scheme operacional (a Banzami, ADR-006) não contamina o
protocolo nem a camada de certificação.

## 2. Visão geral

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                        │
   │   BanzAI  ──▶  interface humana TRANSVERSAL às três camadas        │
   │                    (orienta e executa chamando os motores Rust;        │
   │                     NÃO é uma quarta autoridade; não decide)           │
   │                                                                        │
   │   ┌────────────────────────────────────────────────────────────────┐  │
   │   │ L1  PROTOCOLO BANZA                              (aberto, neutro)│  │
   │   │     regras · contratos · mensagens · esquemas · APIs ·          │  │
   │   │     invariantes · reason codes · identidade técnica · manifests ·│  │
   │   │     assinaturas · descoberta · compatibilidade · perfis ·       │  │
   │   │     Signed Protocol Metadata · confiança · revogação ·          │  │
   │   │     registo técnico · federação · verificação pública           │  │
   │   ├────────────────────────────────────────────────────────────────┤  │
   │   │ L2  CERTIFICAÇÃO DE CONFORMIDADE E INTEROPERABILIDADE            │  │
   │   │     por implementação · baseada em evidência · decidida em Rust ·│  │
   │   │     reproduzível · vinculada a hash · com âmbito · limitada no   │  │
   │   │     tempo · sujeita a suspensão/revogação                       │  │
   │   │     → certifica uma IMPLEMENTAÇÃO, nunca uma entidade            │  │
   │   ├────────────────────────────────────────────────────────────────┤  │
   │   │ L3  BANZAMI OPERATIONAL SCHEME              (operador designado) │  │
   │   │     Banzami — Tecnologia e Serviços, Lda. · condicionado ao      │  │
   │   │     enquadramento regulatório aplicável ·                       │  │
   │   │     estado interno = REGULATORY_AUTHORIZATION_IN_PROGRESS        │  │
   │   └────────────────────────────────────────────────────────────────┘  │
   │                                                                        │
   │   Rust compreende, encaminha, executa, valida e DECIDE.                │
   │   O Qwen (local) explica uma vez. O Rust valida antes de publicar.     │
   │                                                                        │
   └──────────────────────────────────────────────────────────────────────┘

   Grafo de dependência (permanente):   Operadores  →  BanzAI  →  BANZA
   BANZA e BanzAI nunca dependem de operadores.
```

## 3. Camada 1 — Protocolo BANZA

**Definição canónica.** *"O BANZA é um protocolo financeiro aberto que define regras, contratos, perfis
e mecanismos verificáveis de interoperabilidade entre implementações independentes."*

**A camada 1 é:** um protocolo aberto, neutro e verificável — o conjunto público de regras, contratos,
mensagens, esquemas, APIs, invariantes, reason codes, identidade técnica, manifests, assinaturas,
descoberta, compatibilidade, perfis, Signed Protocol Metadata, confiança, revogação, o registo técnico,
a federação e a verificação pública.

**A camada 1 não é:** banco, PSP, carteira, instituição de moeda electrónica nem operador financeiro.
Não detém nem movimenta fundos, não corre contas de clientes, não liquida, não presta serviços
financeiros, não emite licenças, não substitui o regulador nem qualquer scheme, e não assume nenhuma
das responsabilidades financeiras dos participantes.

O modelo de confiança da L1 é aberto (ADR-025/040): assenta em Signed Protocol Metadata, chaves de
assinatura delegadas, manifests dos operadores, evidência verificável de conformidade, registo público
do protocolo e revogação com semântica fechada-por-omissão. Não existe autoridade certificadora do
BANZA e nenhuma entidade central revê, aprova, aceita ou emite certificados de operador.

## 4. Camada 2 — Certificação de Conformidade e Interoperabilidade

**Definição canónica.** *"O BANZA certifica tecnicamente que uma implementação demonstrou conformidade
e interoperabilidade com um perfil público e versionado. A certificação é baseada em evidência
verificável, limitada no tempo, vinculada ao âmbito e sujeita a suspensão ou revogação."*

**A camada 2 é:** um sistema técnico que certifica, **por implementação**, que uma implementação
independente demonstrou conformidade e interoperabilidade contra um perfil público e versionado. A
certificação é baseada em evidência, **decidida em Rust**, reproduzível, vinculada a hash, com âmbito,
limitada no tempo e sujeita a suspensão e revogação. A decisão é determinística e é tomada pelos motores
Rust sobre evidência reproduzível — não há passo de aprovação discricionário.

**A camada 2 não é:** uma licença, uma admissão a qualquer scheme nem uma autorização regulatória. A
certificação certifica uma **implementação** — nunca genericamente uma entidade, um operador ou uma
marca (ADR-005). Um PASS é um resultado técnico de conformidade; não é autorização financeira e não
substitui o regulador.

## 5. Camada 3 — Esquemas operacionais independentes

**A camada 3 é:** o conjunto das infraestruturas, redes e esquemas operacionais que podem adoptar o BANZA
e que permanecem sujeitos às suas próprias regras jurídicas, comerciais e regulamentares. A camada é
**genérica e operator-neutral**: não é definida por nenhum esquema em particular, e o BANZA não exige a
participação em nenhum deles.

**Primeira instância.** O *Banzami Operational Scheme* é o primeiro esquema construído sobre o BANZA,
promovido, desenhado e administrado pela **Banzami — Tecnologia e Serviços, Lda.** como operador
designado, condicionado à obtenção do enquadramento regulatório aplicável (ADR-006). É **uma
instância da camada 3, não a camada 3** — implementar o BANZA nunca exige aderir a este ou a qualquer
outro esquema.

**A camada 3 não é:** o protocolo, nem a certificação, nem um enquadramento já obtido. O seu estado
interno é `REGULATORY_AUTHORIZATION_IN_PROGRESS`; os fundos reais, as carteiras reais, a liquidação real
e os participantes reais permanecem **fechados por omissão** (fail-closed) enquanto não existir evidência
formal aplicável (ADR-007). Detalhe canónico em [`BANZAMI_OPERATIONAL_SCHEME.md`](BANZAMI_OPERATIONAL_SCHEME.md)
e política pública em [`BANZA_REGULATORY_CLAIM_POLICY.md`](BANZA_REGULATORY_CLAIM_POLICY.md).

## 6. BanzAI — interface humana transversal

**O BanzAI é transversal, não uma quarta autoridade**. É a interface humana canónica
através da qual as pessoas correm cada fluxo humano nas três camadas — perguntar, simular, conformidade,
interoperabilidade, confiança, evidência, certificação, registo, federação e (em sandbox) operações de
scheme. Orienta e executa **chamando os motores Rust**; nunca decide, nunca certifica, nunca admite,
nunca publica e nunca activa fundos.

Os consumidores máquina/SDK mantêm acesso directo às APIs públicas: o BanzAI é o plano humano, não
um portão obrigatório para as máquinas (ADR-036).

## 7. Regra de autoridade (permanente)

Os **motores Rust compreendem, encaminham, executam, validam e DECIDEM** cada terminal, acção,
avaliação e transição de estado. O **Qwen local explica uma vez** e nunca decide, certifica, admite,
publica, activa fundos, altera um estado ou um reason code, nem substitui um regulador. **O Rust valida
antes de qualquer coisa ser publicada** (ADR-038/).

| Papel | Faz | Nunca faz |
|---|---|---|
| **Rust (motores)** | compreende, encaminha, executa, valida, **decide**, transiciona estado, valida antes de publicar | — |
| **Qwen (local)** | explica **uma vez** em linguagem natural | decidir, certificar, admitir, publicar, activar fundos, mudar estado ou reason code, substituir o regulador |
| **BanzAI** | orienta e executa chamando o Rust; interface humana | ser autoridade; decidir |

## 8. As separações canónicas

As três camadas estão separadas em responsabilidade, infraestrutura, bases de dados, esquemas, papéis,
chaves, segredos, registos, backups, retenção, pipelines, monitorização e permissões; as chaves nunca
são reutilizadas entre domínios (, ADR-006). A camada do protocolo tem de continuar construível,
governável e verificável sem qualquer conhecimento de um scheme.

Três separações são canónicas e load-bearing:

1. **Certificação técnica ≠ Admissão ao scheme ≠ Autorização regulatória** (ADR-005).
   Uma implementação certificada demonstrou conformidade e interoperabilidade contra um perfil público;
   isto não a admite a nenhum scheme e não a autoriza a mover fundos reais. A admissão ao scheme
   (Scheme Admission) é uma decisão operacional posterior e separada do operador do scheme; a
   autorização regulatória pertence ao regulador competente.
2. **BANZA ≠ Banzami** (ADR-006). O protocolo (L1) e a certificação (L2) são neutros e não são
   propriedade, produto nem governação da Banzami. Nomear a Banzami como primeiro operador de scheme não
   faz do BANZA um operador.
3. **Registo Técnico ≠ Directório de Participantes do Scheme.** O Registo Técnico do BANZA (L2 —
   implementações, conformidade, interoperabilidade, certificação, confiança, revogação, evidência) é
   distinto do Directório de Participantes do Banzami Operational Scheme (L3). O registo técnico não
   depende do directório do scheme; a verificação pública não requer conta na Banzami.

## 9. O pipeline institucional

O pipeline atravessa as camadas de forma unidireccional. Cada etapa é validada em Rust; a etapa final —
a admissão ao scheme — é uma decisão operacional separada e posterior, condicionada ao enquadramento
regulatório, e **não** é implicada por nenhuma etapa técnica anterior.

```
  Manifest ─▶ SimB ─▶ Conformance ─▶ Interoperability ─▶ Signed Protocol Metadata ─▶ Trust
  (pré-revisão)                                                                        │
                                                                                       ▼
                        Scheme Admission ◀── Federation ◀── Registry ◀── Certification ◀── Evidence
                        └─ L3 (decisão operacional, separada, condicionada ao regulador) ─┘
  └──────────────────────────── L1 protocolo · L2 certificação ───────────────────────────┘
```

| # | Etapa | Camada | O que é | Quem decide |
|---|---|---|---|---|
| 1 | **Manifest** | L1 | A implementação publica o seu manifest de operador. | Rust valida a forma e as invariantes de segurança do sandbox. |
| 2 | **SimB (pré-revisão)** | L2 | Portão obrigatório de pré-revisão por simulação antes das suites. | Rust. |
| 3 | **Conformance** | L2 | Suite de conformidade contra o perfil público versionado. | Rust. |
| 4 | **Interoperability** | L2 | Suite de interoperabilidade contra o perfil. | Rust. |
| 5 | **Signed Protocol Metadata** | L1 | Metadados do protocolo + chaves de assinatura delegadas. | Rust verifica; a Trust Root assina metadados/chaves — nunca operadores nem pagamentos. |
| 6 | **Trust** | L1 | Open Trust Evaluation sobre o material auto-publicado. | Rust; nenhuma autoridade central aprova. |
| 7 | **Evidence** | L2 | Evidence bundle reproduzível, vinculado a hash. | Rust gera e recomputa; deteta adulteração. |
| 8 | **Certification** | L2 | Decisão de certificação: PASS/FAIL, com âmbito e prazo. | Rust decide de forma determinística sobre a evidência. |
| 9 | **Registry** | L2 | Publicação no Registo Técnico do BANZA. | Rust valida antes de publicar; verificação pública sem conta. |
| 10 | **Federation** | L1 | Avaliação de confiança de federação; revogação/BRL fecham por omissão. | Rust (fail-closed). |
| 11 | **Scheme Admission** | L3 | Admissão ao Banzami Operational Scheme. | Decisão operacional do operador do scheme, separada e posterior, condicionada ao regulador — nunca implicada pela certificação. |

## 10. Definições canónicas (uma por conceito)

- **BANZA (L1):** protocolo financeiro aberto que define regras, contratos, perfis e mecanismos
  verificáveis de interoperabilidade entre implementações independentes.
- **Certificação (L2):** demonstração técnica, por implementação, de conformidade e interoperabilidade
  com um perfil público e versionado — baseada em evidência verificável, limitada no tempo, vinculada ao
  âmbito e sujeita a suspensão ou revogação. Certifica uma implementação, nunca uma entidade.
- **Banzami Operational Scheme (L3):** o primeiro scheme operacional baseado no BANZA, com a Banzami
  como operadora designada, condicionado à obtenção do enquadramento regulatório aplicável.
- **BanzAI:** interface humana transversal às três camadas; orienta e executa chamando o Rust; não é
  autoridade e não decide.
- **Resumo institucional:** *"O BANZA fornece o protocolo, os perfis, os testes, a evidência e a
  certificação técnica. A Banzami administra o primeiro scheme operacional baseado no BANZA, condicionado
  ao enquadramento regulatório aplicável."*

## 11. Neutralidade e continuidade

A neutralidade sobrevive ao scheme: BANZA ≠ Banzami e BANZA ≠ Banzami Operational Scheme. A
certificação do BANZA não é exclusiva do scheme da Banzami; outras entidades legalmente habilitadas
podem adoptar o protocolo e operar schemes **independentes**; uma implementação pode ser certificada sem
ser admitida a qualquer scheme; o registo técnico não depende do directório de participantes de nenhum
scheme; a verificação pública não requer conta de scheme; e a continuidade do protocolo não depende da
continuidade comercial do scheme. Se o scheme da Banzami mudasse, pausasse ou cessasse, o protocolo, as
suas especificações, motores, vectores, certificação e registo permaneceriam plenamente disponíveis a
todos os operadores — o critério de sobrevivência do ADR-001 aplica-se também à relação com o scheme.

## 12. Referências

- ADR-004 (arquitectura de três camadas) · ADR-006 (Banzami Operational Scheme) · ADR-005 (certificação
  ≠ admissão ≠ autorização) · ADR-007 (fronteira de estado regulatório + RealMoneyActivationGate) ·
  ADR-006 (conflito de interesses + separação de infraestrutura/chaves)
- ADR-001/003 (protocolo aberto / neutralidade) · ADR-038 (motores em Rust) · ADR-025/040 (modelo de
  confiança aberto) · ADR-035/053 (Operador Zero — implementação de referência) · ADR-036 (BanzAI como
  interface humana primária) · ADR-010 (árvore de ADRs current-only)
- [`BANZAMI_OPERATIONAL_SCHEME.md`](BANZAMI_OPERATIONAL_SCHEME.md) ·
  [`BANZA_REGULATORY_CLAIM_POLICY.md`](BANZA_REGULATORY_CLAIM_POLICY.md) ·
  [`BANZA_REGULATORY_POSITIONING.md`](BANZA_REGULATORY_POSITIONING.md) ·
  [`BANZA_PROTOCOL_BOUNDARY.md`](BANZA_PROTOCOL_BOUNDARY.md) ·
  [`certification-boundary.md`](certification-boundary.md)
