# BANZA — Referência do Protocolo

**Versão:** 1.0  
**Data:** 2026-06-07  
**Última revisão editorial:** 2026-07-11  
**Estado:** Referência oficial do protocolo v1.0 · pré-produção · sem operador em produção  
**Autoridade:** ADR-002, ADR-038, ADR-039, ADR-040, ADR-021

---

## Resumo Executivo

O BANZA é o protocolo financeiro aberto de Angola. Define as regras — contratos, invariantes (regras que nunca podem ser violadas) e mecanismos de conformidade — que operadores independentes implementam para interoperar e produzir evidência verificável, sem dependências bilaterais e sem aprovação humana central. A operação real em produção depende de obrigações legais, regulatórias, bancárias, KYC/KYB e AML/CFT, que pertencem ao operador e às autoridades competentes.

**O que não é:** O BANZA não é um banco, não é um produto, não é uma API, não é um servidor central. Não processa pagamentos, não mantém contas, não guarda saldos. É o conjunto de regras que torna a interoperabilidade possível — a capacidade de sistemas diferentes processarem pagamentos entre si — como o HTTP ou o SMTP, mas para pagamentos.

**Quem participa:** Os *operadores* são entidades jurídicas independentes que implementam o protocolo e processam pagamentos. BANZA é um protocolo financeiro aberto. A participação de operadores é demonstrada por conformidade protocolar verificável, não por aprovação humana central. Um operador implementa o protocolo, publica o seu manifesto, expõe endpoints compatíveis e produz evidência de conformidade que qualquer parte pode verificar. Não existem volumes mínimos, acordos bilaterais prévios nem decisões discricionárias ao nível do protocolo. Ver [§8](#8-operadores).

**Como se estabelece confiança:** Por metadata de protocolo assinada, evidência de conformidade, um registo público de índice verificável, uma Trust Root, chaves delegadas de assinatura e revogação com falha fechada. Nenhuma entidade humana decide quem participa: a avaliação é determinística e executável por qualquer parte. Ver [§7](#7-conformidade-e-evidência) e [§6](#6-confiança).

**Quem governa:** A governação BANZA, em fase de bootstrap, define o processo pelo qual ADRs e RFCs são aprovados e mantém a neutralidade do protocolo. A governação evolui as regras do protocolo — não admite, aprova nem autoriza operadores. A entidade formal de governação é definida no processo de institucionalização. O protocolo evolui por processo documentado — nenhum operador decide unilateralmente. Ver [§10](#10-governança).

**Como funciona em alto nível:** Operadores que implementem o protocolo podem trocar pagamentos entre si através de federação — com confiança estabelecida pela Avaliação Aberta de Confiança sobre metadata assinada e evidência verificável, sem acordos bilaterais entre cada par de operadores. A verificação de conformidade garante que todos os operadores respeitam os mesmos invariantes financeiros. Atualmente `/operators` devolve uma lista vazia; a federação de produção depende das condições de produção do roteiro. Ver [§9](#9-federação).

**Porque existe:** Angola tem os componentes de um sistema financeiro moderno mas não tem a camada que os liga. O BANZA é essa camada — aberta, verificável, independente de qualquer operador. O protocolo sobrevive a qualquer operador individual, por design. Ver [§2](#2-por-que-o-banza-existe).

> **Ponto de entrada recomendado para novos leitores:** [§14 — Perguntas Frequentes](#14-perguntas-frequentes) oferece respostas directas às questões mais comuns. Para implementar um operador: [§7 Conformidade e Evidência](#7-conformidade-e-evidência) → [§8 Operadores](#8-operadores) → [§12 Recursos para Programadores](#12-recursos-para-programadores).

> **Estado público v1.0:** Esta referência define o protocolo BANZA v1.0 em pré-produção. O Registo Público de Protocolo devolve uma lista vazia. O Manifesto de Chaves e o BRL (Lista de Revogação BANZA — *BANZA Revocation List*) têm localizações canónicas especificadas, mas a publicação de produção depende das condições de produção. A federação de produção depende das condições de produção de federação. A conformidade técnica não substitui obrigações legais, regulatórias, bancárias ou KYC/KYB aplicáveis. O estado operacional é definido em [§13 — Roteiro](#13-roteiro-de-maturidade).

---

## Índice

1. [O Que É o BANZA](#1-o-que-é-o-banza)
2. [Por Que o BANZA Existe](#2-por-que-o-banza-existe)
3. [Princípios Fundamentais](#3-princípios-fundamentais)
4. [Arquitectura do Protocolo](#4-arquitectura-do-protocolo)
5. [PostgreSQL — Estado Protocolar](#5-postgresql-estado-protocolar)
6. [Confiança](#6-confiança)
7. [Conformidade e Evidência](#7-conformidade-e-evidência)
8. [Operadores](#8-operadores)
9. [Federação](#9-federação)
10. [Governança](#10-governança)
11. [BanzAI — Agente do Protocolo](#11-banzai-agente-do-protocolo)
12. [Recursos para Programadores](#12-recursos-para-programadores)
13. [Roteiro de Maturidade](#13-roteiro-de-maturidade)
14. [Perguntas Frequentes](#14-perguntas-frequentes)

---

## Navegação Rápida

### Conformidade
- [Níveis L0–L4](#níveis-de-conformidade) · §7
- [Como Publicar Conformidade](#como-publicar-conformidade) · §7
- [Frescura da Evidência](#frescura-da-evidência) · §7
- [Contestação de Revogação](#contestação-de-revogação) · §7
- [Processo de Revogação](#processo-de-revogação) · §6

### Federação
- [Como Funciona a Federação](#como-funciona-a-federação) · §9
- [Exemplo Passo a Passo](#exemplo-passo-a-passo) · §9
- [Obrigações e Liquidação](#obrigações) · §9

### Confiança
- [Metadata de Protocolo Assinada](#metadata-de-protocolo-assinada) · §6
- [Manifesto de Chaves](#o-manifesto-de-chaves) · §6
- [BRL — Lista de Revogação](#o-brl-lista-de-revogação-banza) · §6
- [Avaliação Aberta de Confiança](#avaliação-aberta-de-confiança) · §8
- [Trust Root e Assentos](#6-confiança) · §6
- [Arquitectura institucional de confiança](https://github.com/banza-protocol/banza/blob/main/docs/governance/BANZA_TRUST_ARCHITECTURE.md) · doc dedicado

### Governança
- [Entidade de Governação BANZA](#a-entidade-de-governação-banza) · §10
- [Hierarquia Normativa](#hierarquia-normativa-banza) · §10
- [ADRs e RFCs](#adrs-registos-de-decisão-de-arquitectura) · §10
- [Governação em Bootstrap](#governação-em-fase-de-bootstrap) · §10

### Programadores
- [Caminho para Produção](#caminho-para-produção) · §12
- [Dependências Obrigatórias](#dependências-externas-obrigatórias) · §12
- [Validar Conformidade no BanzAI](#validar-conformidade-no-banzai) · §12
- [Invariantes Críticos](#invariantes-críticos) · §12
- [Artefactos Publicados por Operador](#artefactos-publicados-por-um-operador) · §12
- [Endpoints por Nível](#principais-endpoints-por-nível) · §12

### Perguntas Frequentes
- [§14 — FAQ completa](#14-perguntas-frequentes)

---

## 1. O Que É o BANZA

**O BANZA é o protocolo aberto de interoperabilidade financeira para Angola** — as regras, os contratos, as mensagens, os invariantes e o enquadramento de evidência e conformidade que operadores independentes implementam nas suas próprias infraestruturas para processar pagamentos e interoperar entre si. O protocolo permite que sistemas distintos falem uma linguagem comum: duas implementações que nunca se conheceram interoperam porque ambas respeitam os mesmos contratos públicos.

> **Operador:** qualquer entidade jurídica independente que implementa e opera uma instância conforme do protocolo BANZA. Ver definição completa em [§8 Operadores](#8-operadores).

O BANZA não é um banco. Não é uma carteira. Não é um PSP. Não é um operador. Não é um produto nem uma API. Não detém fundos, não processa pagamentos e não presta serviços financeiros ao público. É a camada de protocolo por baixo de tudo isso: o conjunto de regras abertas — contratos, mensagens, invariantes, evidência e regras de confiança — que torna a interoperabilidade possível sem acordos bilaterais.

![Fronteira do Protocolo BANZA — humanos e operadores usam o BanzAI (interface primária humano-operador) para interagir com o BANZA (regras públicas, motores verificáveis, evidência) dentro da fronteira; fora da fronteira ficam os operadores independentes, o banco/EMIS/infra financeira e as autoridades competentes; sem fluxo de fundos pelo BANZA e o BanzAI não autoriza actividade regulada](/diagrams/protocol/banza-boundary-protocol-operator-infra-v1.svg)

**Estado actual (v1.0):** a especificação está congelada e o ambiente é de pré-produção. Nenhum operador publicou metadata de produção — o Registo Público de Protocolo devolve uma lista vazia — e a confiança de produção, tal como a federação de produção, depende das condições de produção do roteiro ([§13](#13-roteiro-de-maturidade)). Este estado é verificável nas rotas públicas do protocolo, não apenas neste texto.

### As Quatro Propriedades do Protocolo

| Propriedade | O que o protocolo garante |
|-------------|--------------------------|
| **Regras públicas** | A especificação — RFCs, ADRs, verificação de conformidade — está disponível publicamente. Nenhuma documentação está por detrás de um NDA. |
| **Participação aberta** | O critério de participação é técnico e determinístico: manifesto válido, metadata assinada e evidência verificável de conformidade com o âmbito aplicável. Os critérios são públicos, determinísticos e auditáveis — nenhuma aprovação humana central existe ao nível do protocolo. A confiança de produção depende das condições de produção. As obrigações legais e regulatórias aplicáveis existem fora do protocolo. |
| **Invariantes verificáveis** | As propriedades financeiras são impostas pelo núcleo do protocolo e verificáveis por qualquer auditor independente. A liquidação T+0 é um requisito de conformidade da especificação que qualquer operador conforme terá de cumprir — um invariante do núcleo, não uma promessa comercial. |
| **Federação** | Os operadores conformes podem encaminhar pagamentos entre si sem acordos bilaterais, porque ambos implementam o mesmo protocolo aberto e ambos passam a mesma Avaliação Aberta de Confiança. |

### Arquitectura do Protocolo BANZA

![Arquitectura do Protocolo BANZA — fluxo primário humano-operador: Humanos/Operadores até ao BanzAI (interface primária humano-operador), depois aos motores verificáveis e à evidência, e a um resultado técnico verificável; a governança, os ADR/RFC e a referência são a base normativa que o BanzAI consulta e os motores verificam; a integração máquina-máquina continua possível sem depender obrigatoriamente do BanzAI](/diagrams/protocol/banza-protocol-architecture-v1.svg)

A arquitectura do BANZA é centrada no protocolo, no BanzAI e em operadores independentes. Cada área exerce autoridade exclusiva no seu âmbito — nenhuma pode exercer autoridade reservada a outra. A Governação aberta evolui as regras. O Núcleo BANZA define contratos, invariantes e conformidade verificável. A Trust Root assina metadata do protocolo. O BanzAI simula, verifica, explica e gera evidência, mas nunca decide, aprova ou certifica. Os operadores implementam e auto-publicam, mas nunca governam. A federação aberta liga operadores conformes por evidência verificável. Nenhuma destas áreas admite, aprova ou autoriza operadores. Clientes finais pertencem aos produtos dos operadores, não à arquitectura principal do protocolo.

A dependência corre numa única direcção permanente: os operadores dependem do BANZA; o BANZA e o BanzAI nunca dependem de nenhum operador. O BanzAI apoia a compreensão, verificação e navegação da evidência do protocolo, mas não é requisito para operar nem para demonstrar conformidade. Esta direcção é um invariante arquitectónico — não uma preferência de design. É o que impede que qualquer operador, por maior que seja, capture o protocolo para uso exclusivo.

O estado durável do protocolo — artefactos assinados, registo público, hashes de evidência, índice do agente e auditoria — vive numa base PostgreSQL de **estado protocolar**, não financeira: guarda estado do protocolo, não valor financeiro (ver [§5 PostgreSQL — Estado Protocolar](#5-postgresql-estado-protocolar)).

### Âmbito deste Documento

Este documento é a especificação canónica do protocolo BANZA — a fonte de verdade sobre as suas regras, invariantes, governação, conformidade e modelo de federação. É a referência para operadores que pretendem implementar o protocolo, para programadores que constroem sobre ele, para reguladores que supervisionam os seus participantes e para investidores que avaliam o ecossistema.

O documento é permanente: as secções de princípios e governação descrevem propriedades invariantes do protocolo, não estados operacionais temporários. As secções de estado (Roteiro, Estado Actual) reflectem o ponto actual de implementação e evoluem com o protocolo.

Para a arquitectura do BanzAI, consulte **[Referência §12 — BanzAI](/referencia/banzai)** (fonte canónica). O desenvolvimento activo do BanzAI reside inteiramente neste repositório (`services/banzai-api` + `engines/banzai-*`); não existe um repositório BanzAI separado (ADR-075).

### BANZA: Infraestrutura, Não Software

O BANZA não é uma aplicação. Não é um serviço. É infraestrutura — no mesmo sentido em que as estradas, as telecomunicações e as redes eléctricas são infraestrutura.

**Estradas:** qualquer veículo circula nelas, independentemente de quem o fabricou. As regras de trânsito são públicas. Ninguém é proprietário das estradas da mesma forma que é proprietário de um automóvel.

**Telecomunicações:** qualquer operador pode ligar clientes à rede. O protocolo IP é público. Um email enviado pelo Gmail chega a um endereço Outlook — porque ambos implementam o mesmo protocolo aberto. Ninguém negociou esse acordo — simplesmente existe, porque o protocolo é a ligação.

**Protocolos financeiros:** o SWIFT é implementado por milhares de bancos. O código BIC é público. Uma transferência do Barclays chega ao HSBC — porque ambos falam a mesma linguagem financeira. Nenhum acordo bilateral foi necessário para cada transacção individual.

**O BANZA aplica o mesmo princípio aos pagamentos digitais em Angola.**

Não é a estrada — é o código da estrada. Não é a rede de telecomunicações — é o protocolo. Não é o banco — é o conjunto de regras que permite que qualquer entidade qualificada processe pagamentos e interopere com qualquer outra.

O valor da infraestrutura não está em quem a construiu. Está em quantos a utilizam — e em quão aberta ela é para novos participantes.

### Onde o BANZA Actua

O BANZA não é um servidor central.

O BANZA não processa pagamentos.

O BANZA não mantém contas de clientes.

O BANZA não executa transferências.

O BANZA não guarda saldos.

**O BANZA define as regras que cada operador implementa localmente.**

Cada operador implementa o protocolo na sua própria infraestrutura; o BANZA é o conjunto comum de regras que todos partilham. E é o operador — não o protocolo — que responde pelos seus clientes, pelas suas obrigações legais e regulatórias e pela operação dos seus sistemas.

O protocolo não reside num servidor central nem numa infraestrutura única.

O protocolo reside nas implementações locais que respeitam os contratos, invariantes, metadata assinada e mecanismos de conformidade definidos pela especificação.

Cada operador executa a sua própria infraestrutura. O que torna essas infraestruturas parte da rede BANZA é a conformidade com o protocolo — não a ligação a um sistema central.

Tal como HTTP não processa websites e SMTP não entrega emails por si só, o BANZA não executa pagamentos directamente. Cada operador implementa o protocolo na sua própria infraestrutura.

![Modelo de Execução Local BANZA — dois operadores independentes que implementam o protocolo localmente](/diagrams/protocol/banza-local-execution-model-v1.svg)

### O Que um Operador Recebe do BANZA

O ecossistema BANZA disponibiliza ao operador os artefactos necessários para implementar o protocolo de forma autónoma, interoperar com outros operadores e ser verificado de forma independente. Os artefactos de protocolo (contratos, esquemas, ADRs, RFCs, testes de conformidade) são publicados directamente pelo protocolo. Os artefactos de confiança — metadata de protocolo assinada, Registo Público de Protocolo, BRL e Manifesto de Chaves — são definidos pelo protocolo e assinados pela Trust Root ou pelas suas chaves delegadas. Nenhum destes artefactos aprova, admite ou autoriza um operador: o operador auto-publica a sua própria metadata e evidência (ADR-039).

| Artefacto | Finalidade |
|---|---|
| **Metadata de protocolo assinada** | Ancoragem de confiança — versões, releases e chaves delegadas verificáveis |
| **Registo Público de Protocolo** | Descoberta — índice verificável de metadata e evidência de operadores |
| **BRL** | Verificação de confiança — lista de revogação pública |
| **Manifesto de Chaves** | Validação criptográfica local, sem consulta em linha ao BANZA |
| **Contratos** | Interoperabilidade — OpenAPI, esquemas de eventos, webhooks, QR |
| **Esquemas** | Compatibilidade de dados entre implementações |
| **Testes de Conformidade** | Verificação determinística (resultado previsível e verificável) e autónoma |
| **RFCs** | Evolução técnica do protocolo |
| **ADRs** | Decisões arquitecturais imutáveis após aceitação |

O operador não recebe infraestrutura central. O operador não recebe contas. O operador não recebe liquidação. O operador não recebe clientes. **O operador recebe as regras — e a responsabilidade de as executar.**

### O Núcleo do BANZA

> Os conceitos desta tabela são apresentados aqui em termos operacionais. Definições formais, requisitos de implementação e lista completa de invariantes estão em [§12 — Invariantes Financeiros](#invariantes-financeiros). Os níveis de conformidade (L0–L4) são definidos em [§7 — Níveis de Conformidade](#níveis-de-conformidade).

O núcleo do protocolo é o conjunto mínimo de invariantes que todos os operadores conformes implementam, independentemente da tecnologia que utilizam.

| Invariante | Descrição |
|---|---|
| **Double-entry** | Cada débito tem um crédito correspondente — sem excepção |
| **Trace IDs** | Cada operação carrega um identificador de rastreabilidade propagado em toda a cadeia |
| **Idempotência** | A mesma operação com a mesma chave produz sempre o mesmo resultado |
| **Liquidação** | Regras de compensação entre operadores definidas pelo protocolo |
| **Federação** | Encaminhamento inter-operadores via metadata assinada e evidência verificável |
| **Avaliação Aberta de Confiança** | Dez verificações determinísticas antes de qualquer encaminhamento ([§8](#avaliação-aberta-de-confiança)) |
| **Metadata assinada** | Cadeia de assinaturas desde a Trust Root do protocolo |
| **BRL** | Lista de Revogação — verificação de confiança em tempo quasi-real |

O núcleo não é um software específico. O núcleo é um comportamento obrigatório. Cada operador pode implementá-lo na tecnologia que escolher — Rust, Go, Java, Python ou qualquer outra — desde que o resultado seja conforme à especificação e passe os testes de conformidade aplicáveis.

### Implementações de Referência

A comunidade e os operadores podem disponibilizar implementações de referência em várias linguagens. São recursos auxiliares e opcionais — hoje não faz parte do protocolo nenhuma implementação de operador de produção, e a sua existência não constitui evidência de conformidade.

Estas implementações não fazem parte da definição normativa do protocolo. A conformidade é determinada exclusivamente pela especificação, contratos, esquemas e testes de conformidade.

Ver §12 — Recursos para Programadores para a lista completa e o modelo de implementações livres adoptado pelo protocolo.

### Artefactos Disponíveis

> Esta tabela é uma visão geral de todos os artefactos do protocolo. Para guia de implementação detalhado, consulte [§12 — Recursos para Programadores](#12-recursos-para-programadores). Para artefactos que cada operador publica no seu domínio, consulte [Artefactos Publicados por um Operador](#artefactos-publicados-por-um-operador) em §12.

O BANZA v1.0 está disponível como conjunto de artefactos públicos, auditáveis e operacionais. A sua existência é verificável sem contactar nenhuma entidade. Os artefactos normativos (ADRs, RFCs, contratos, esquemas, verificação de conformidade) fazem parte da definição do protocolo. O BanzAI é o agente IA nativo do protocolo; as Implementações de Referência são recursos auxiliares — a conformidade é verificável independentemente da utilização do BanzAI.

| Artefacto | Descrição | Estado |
|---|---|---|
| **ADRs** | Registos de Decisão de Arquitectura — decisões de arquitectura imutáveis após aceitação | Publicados |
| **RFCs** | Pedidos de Comentários — especificações operacionais e propostas de evolução do protocolo | Publicados |
| **Verificação de Conformidade** | um conjunto determinístico de testes de conformidade para os níveis aplicáveis; executável por qualquer entidade sem taxa | Disponível |
| **Executor de Conformidade** | Ferramenta de código aberto para executar os testes contra qualquer implementação | Disponível |
| **Registo Público de Protocolo** | Localização e formato especificados para descoberta de metadata e evidência de operadores; produção dependente das condições de produção | Especificado |
| **BanzAI** | Interface humana primária e transversal e motor cognitivo não autoritativo do protocolo (ADR-054, ADR-059) — guia, invoca os motores verificáveis e explica; não normativo, não decide, não certifica | Disponível |
| **Implementações de Referência** | Implementações auxiliares do protocolo em várias linguagens; conformidade é independente da utilização de qualquer SDK específico | Opcional · não normativo |
| **Contratos** | Especificações OpenAPI, esquemas de federação, contratos de eventos e webhooks, payload QR | Publicados |

---

## 2. Por Que o BANZA Existe

### O Problema

Angola possui bancos, a EMIS — o sistema nacional de liquidação interbancária —, redes de caixas automáticos, o Multicaixa, canais digitais bancários e milhões de utilizadores móveis. O acesso programático e interoperável a pagamentos continua, porém, dependente de integrações e condições institucionais.

Angola tem as peças. O que Angola não tem é a camada que as liga.

Para integrar pagamentos, uma empresa tem de estabelecer um acordo bilateral com um banco. O processo demora meses. A documentação é privada. As condições são negociadas caso a caso. O acesso é discricionário — não existe nenhum conjunto de regras públicas que qualquer entidade possa ler e implementar.

Para operar pagamentos em produção, uma fintech continua sujeita a requisitos legais, regulatórios, bancários e de integração que o protocolo não substitui. E, para que carteiras em diferentes operadores comuniquem entre si, não existe hoje um mecanismo comum — cada rede é fechada.

A consequência menos visível é a mais grave: a confiança entre participantes assenta em acordos privados e em testes que ninguém consegue reproduzir — não em contratos públicos e evidência verificável. Para um auditor externo, verificar como dois sistemas fechados interoperam é, na prática, impossível. Cada nova integração repete o mesmo trabalho, com regras ligeiramente diferentes, e cada participante fica preso às decisões da rede a que se ligou.

Os sintomas são visíveis:

- **Comprovativos por WhatsApp.** Capturas de ecrã de transferências bancárias como prova de pagamento — porque não existe nenhuma alternativa garantida pelo protocolo.
- **Integrações fechadas.** Uma empresa integra com o sistema de um banco. Essa integração não funciona com nenhum outro banco.
- **Exclusão das pequenas empresas.** Um terminal de pagamento requer um contrato de aquisição, hardware e mensalidades.
- **Dependência de redes proprietárias.** Cada plataforma funciona com as suas próprias regras. Um operador pode alterar taxas, desactivar funcionalidades ou encerrar sem aviso.

A causa raiz: Angola tem vias de liquidação — a EMIS move dinheiro entre bancos. A EMIS não resolve quem pode aceder ao sistema de pagamentos, em que condições e segundo que regras verificáveis.

Esta camada tem um nome: **a camada de protocolo**. É a lacuna que o BANZA preenche. Não como banco. Não como produto fintech. Como protocolo.

### Dois Modelos

**O modelo fechado: M-Pesa**

O M-Pesa pertence à Safaricom. As regras são as regras do operador. Quando a Safaricom muda os preços, todos os utilizadores ficam sujeitos. Quando sai de um país, o serviço sai. Uma startup que constrói sobre o M-Pesa tem de aceitar as condições que o operador decidir.

O M-Pesa é um produto notável. Mas é um produto — não um protocolo. A rede pertence ao operador.

**O modelo aberto: Pix e UPI**

O Banco Central do Brasil lançou o Pix como infraestrutura pública de pagamentos instantâneos. O Nubank implementa o Pix. O Itaú implementa o Pix. O Google Pay implementa o Pix. Centenas de entidades implementam o Pix — cada uma com o seu produto, experiência e modelo de negócio — mas todas sob as mesmas regras comuns. Nenhuma delas é proprietária do Pix.

O Pix tornou-se o meio de pagamento mais usado no Brasil em frequência, segundo dados oficiais mais recentes.

A NPCI lançou o UPI na Índia em 2016 como uma camada interoperável de pagamentos digitais sob supervisão regulatória. Em poucos anos, o UPI passou a processar um volume muito elevado de transacções entre múltiplos participantes sob regras comuns.

O BANZA inspira-se nesse princípio de infraestrutura comum, mas define um protocolo aberto e neutro para operadores independentes. Importa não confundir os planos: o Pix e o UPI são referências estratégicas que mostram o impacto de uma camada comum, interoperável e de regras públicas — não são equivalentes técnicos do BANZA. O BANZA não é o Pix, não é o UPI, não é uma via de banco central e ainda não é um sistema nacional de pagamentos em produção: é uma especificação de protocolo e um enquadramento de conformidade verificável. A participação no Pix e no UPI está sujeita a autorização regulatória; a participação no BANZA é demonstrada por conformidade protocolar verificável — e as autorizações regulatórias que um operador precise continuam a vir do regulador competente, nunca do BANZA.

| | M-Pesa | Pix / UPI | BANZA |
|---|---|---|---|
| **Quem define as regras** | O operador | Entidade de governação | Protocolo aberto (RFCs + ADRs) |
| **Quem pode participar** | Entidades com acordo com o operador | Participantes autorizados sob regulação | Qualquer entidade com conformidade verificável — confiança de produção dependente das condições de produção |
| **Um terceiro pode tornar-se operador independente?** | Não | Sim | Sim |

### O Teste do Operador Desaparecido

Este é o teste definitivo.

No modelo fechado: se o operador principal desaparece, o sistema desaparece.

No modelo aberto: se um operador desaparece, os outros continuam. O Pix não pertence ao Nubank. Se o Nubank desaparecesse amanhã, o Pix continuaria.

**O BANZA segue o modelo aberto.**

As regras do protocolo BANZA são públicas. Exemplos ilustrativos podem demonstrar as capacidades do protocolo, mas este repositório não contém um operador de referência. As implementações de operador são externas ao repositório do protocolo, não são proprietárias do protocolo e publicam elas próprias a sua metadata e a sua evidência de conformidade. Nenhum operador tem participação demonstrada enquanto não publicar metadata assinada e evidência verificável de conformidade com o âmbito aplicável. Se todos os operadores futuros desaparecessem, as regras do protocolo, a especificação e a verificação de conformidade continuariam a existir. A infraestrutura permaneceria.

Esta não é uma propriedade acidental. É uma decisão arquitectónica deliberada.

Esta propriedade é possível porque o protocolo é implementado localmente pelos operadores e não executado por uma infraestrutura central BANZA. Ver §1 — Onde o BANZA Actua.

### O Que Muda Quando a Camada Existe

A existência de uma camada de protocolo aberta tem consequências directas para todos os participantes do ecossistema. A concorrência passa a acontecer ao nível do produto, não ao nível do acesso à infraestrutura. A interoperabilidade é automática entre operadores conformes — não negociada caso a caso. O acesso é determinístico, definido pela verificação de conformidade e não por relações institucionais nem por decisão humana. A inovação é independente: um operador pode lançar novos produtos financeiros sobre o protocolo sem pedir permissão a nenhum outro operador nem ao próprio protocolo.

### O Valor Institucional de uma Camada Pública

Para as instituições que rodeiam o sistema de pagamentos — supervisores, auditores, bancos, operadores estabelecidos e candidatos a operador — o valor de um protocolo público é mensurável em obrigações que deixam de depender de boa vontade:

- **O custo de integração cai de N acordos para um contrato público.** Quem implementa a especificação uma vez fica apto a interoperar com qualquer outro implementador conforme — o trabalho não se repete por cada par de participantes.
- **As regras técnicas tornam-se explícitas e versionadas.** O comportamento correcto está escrito, numerado e datado — não disperso em anexos contratuais privados.
- **A conformidade torna-se testável.** Qualquer parte pode executar os mesmos vectores de conformidade e chegar ao mesmo resultado. A afirmação «somos conformes» deixa de ser declarativa e passa a ser reproduzível.
- **O protocolo separa-se do operador.** Nenhum participante fica estruturalmente preso à rede de outro: as regras não pertencem a quem as implementa.
- **A auditoria independente torna-se possível por construção.** Rastreabilidade por `trace_id`, lançamentos imutáveis e evidência reproduzível permitem verificar sem pedir cooperação.
- **A supervisão técnica encontra artefactos públicos.** Registo de protocolo, metadata assinada, evidência, lista de revogação e manifestos são rotas públicas em formato máquina — as mesmas para todos, sem canais privilegiados.
- **A federação nasce controlada.** Quando a produção abrir, a interoperabilidade entre operadores depende da Avaliação Aberta de Confiança em cada encaminhamento — não é aberta por defeito, nem negociada bilateral e opacamente, nem concedida por decisão humana.

### O Que o BANZA Não Resolve

A prudência faz parte do desenho. O BANZA torna as regras técnicas explícitas e a conformidade verificável — e pára aí. Não resolve, por si só:

- **adopção** — nenhum protocolo garante utilizadores, comerciantes ou casos de uso;
- **regulação e autorização legal** — operar serviços financeiros exige as licenças e autorizações aplicáveis, que só as entidades competentes concedem;
- **liquidez e relações bancárias** — o financiamento das operações e o acesso às vias de liquidação continuam a ser relações dos operadores;
- **KYC/KYB e AML/CFT** — as obrigações de identificação, verificação e prevenção pertencem aos operadores, sob o quadro legal que lhes for aplicável;
- **risco operacional** — disponibilidade, segurança dos sistemas e continuidade de negócio são responsabilidade de quem opera.

Estes elementos continuam a cargo dos operadores e das entidades competentes. O protocolo dá-lhes uma base comum verificável — não os substitui.

A narrativa estratégica detalhada por participante está no whitepaper (`docs/reference/overview.md`).

---


### Racional Estratégico

O BANZA aplica os princípios de uma infraestrutura comum de pagamentos ao contexto angolano: regras públicas, conformidade verificável, invariantes financeiros e interoperabilidade entre operadores. O objectivo estratégico é uma camada partilhada sobre a qual múltiplos operadores possam competir em produto e alcançar interoperabilidade — sem negociar o acesso caso a caso e sem o pedir a ninguém.

Esta referência **não** afirma adopção, inclusão financeira alcançada, aprovação regulatória, integração bancária ou um sistema nacional de pagamentos em produção. Tais resultados dependem de operadores em produção (condições de produção de federação), de autorização regulatória e de evidência específica — nenhum dos quais existe ainda.

#### Cada Decisão Responde a um Risco

As decisões estruturantes do protocolo não são preferências de estilo — cada uma existe porque um risco concreto a exige. A tabela liga as decisões (definidas em §1–§11) ao risco que mitigam:

| Decisão | Risco que mitiga |
|---|---|
| **Contracts-first** — nenhuma regra existe só em prosa (§3) | Desvio silencioso entre especificação e implementação; conformidade sem âncora testável; perda de reprodutibilidade |
| **Rotas públicas em formato máquina** (§4, §6) | Estado declarado por marketing em vez de verificado; supervisão dependente de canais privilegiados; auditoria por confiança em vez de evidência |
| **Evidência técnica ≠ autorização legal** (§3, §6, §7) | Claims prematuros de habilitação; leitura de evidência técnica como selo institucional ou regulatório; deslocação de responsabilidade legal para o protocolo |
| **Ausência de autoridade certificadora** (§6, §7) | Ponto único de decisão humana sobre quem participa; captura, pressão ou corrupção do porteiro; participação dependente da diligência ou do calendário de um terceiro |
| **Auto-publicação do operador** (§7, §8) | Estatuto concedido em vez de demonstrado; assimetria entre quem é atestado e quem espera para o ser |
| **Separação protocolo / operador** (§1, §8) | Lock-in estrutural; captura do protocolo por um participante; confusão de responsabilidade legal entre camada de regras e prestador de serviços |
| **Trust Root offline** (§6) | Comprometimento do topo da cadeia de confiança por via da infraestrutura em linha — o risco de segurança mais grave de uma cadeia de assinaturas |
| **Revogação assinada e pública (BRL)** (§6) | Operador comprometido que permanece confiável; remoção de confiança dependente de notificação par a par |
| **Avaliação determinística e fail-closed** (§9, §8) | Encaminhamento sobre material de confiança em falta, expirado ou incompatível; divergência de veredicto entre pares |
| **Confiança de produção só após reunidas as condições de produção** (§7) | Rede federada construída sobre material de teste; confiança ancorada fora de uma raiz de produção |
| **Recusa da confiança bilateral como base** (§2, §9) | Custo quadrático de acordos; opacidade para auditores; acesso discricionário em vez de determinístico |
| **BanzAI agente nativo e não normativo** (§11) | Autoridade normativa deslocada para o agente do protocolo; decisões de conformidade por inferência em vez de testes determinísticos |

A coluna da direita é a leitura institucional correcta deste capítulo: auditabilidade, interoperabilidade, supervisão, segurança, reprodutibilidade e responsabilidade legal não são qualidades decorativas — são os riscos reais de infraestrutura financeira que o desenho do protocolo aborda explicitamente.

![Decisão → risco mitigado — as decisões estruturantes do protocolo BANZA e o risco que cada uma mitiga; cada decisão reduz o risco, não o elimina](/diagrams/protocol/banza-decision-risk-matrix-v1.svg)

Para a narrativa estratégica completa (impacto por interveniente, contexto de mercado e visão), ver [`docs/reference/overview.md`](https://github.com/banza-protocol/banza/blob/main/docs/reference/overview.md).

## 3. Princípios Fundamentais

Os princípios fundamentais são as regras de desenho que governam todas as decisões do protocolo. Não são aspirações: cada um tem consequências verificáveis na especificação, nos invariantes e na verificação de conformidade.

### A correcção financeira não é negociável

Cada decisão de engenharia é avaliada segundo: "Isto preserva a correcção financeira?" A simplicidade operacional e a auditabilidade têm precedência sobre a conveniência. Um pagamento que não possa ser totalmente auditado por uma parte independente não é um pagamento válido ao abrigo do BANZA.

**Na prática:** Um operador não pode arredondar montantes para simplificar a implementação. O invariante `INV-STL-001` — `gross_minor = net_minor + fee_minor` — é imposto em cada lançamento. Nenhuma excepção é possível sem uma violação de protocolo detectável pela verificação de conformidade.

**Porque este princípio importa:** A correcção financeira é a fundação da confiança institucional. Um protocolo que permite excepções às suas garantias financeiras não tem garantias — tem regras com asteriscos. Reguladores, auditores e parceiros bancários não podem confiar num sistema com asteriscos. A intransigência financeira é o que torna o BANZA auditável — e a auditabilidade é o que torna a confiança institucional possível.

### O protocolo é o produto

Os operadores provam que o protocolo funciona. Não são o protocolo. As implementações de operador demonstram as capacidades do protocolo, mas nenhum operador é proprietário do protocolo, da mesma forma que o Nubank não é proprietário do Pix. O que escala é o protocolo. Os operadores são os que o demonstram.

**Na prática:** Se todos os operadores actuais encerrarem amanhã, as regras do protocolo, a especificação, a verificação de conformidade e o enquadramento de evidência continuam disponíveis. Novos operadores podem entrar e operar como se nada tivesse acontecido. O protocolo sobrevive a qualquer operador individual.

**Porque este princípio importa:** Esta distinção protege o ecossistema de ser capturado por um único operador. No modelo BANZA, o crescimento de qualquer operador reforça o protocolo — e o protocolo reforça todos os outros operadores. O valor acumula na camada comum, não nos operadores individuais. É o que distingue infraestrutura de plataforma.

### O núcleo implementa o protocolo. Os operadores implementam a política.

O núcleo BANZA impõe os invariantes financeiros. Os operadores aplicam as suas próprias políticas de negócio dentro dos constrangimentos que o núcleo impõe. Estas duas camadas nunca colapsam. Um operador não pode anular um invariante do núcleo; o núcleo nunca codifica a lógica de negócio de um operador.

**Na prática:** Um operador pode definir as suas próprias taxas — mas a relação `gross = net + fee` é imposta pelo protocolo, não pelo operador. Um operador pode ter as suas próprias regras de KYC — mas a imutabilidade dos lançamentos no livro-razão é imposta pelo núcleo, não por uma política do operador.

**Porque este princípio importa:** A separação é o que permite que operadores com modelos de negócio completamente diferentes coexistam na mesma rede e interoperem — porque ambos respeitam os mesmos invariantes, independentemente das suas políticas individuais. Protege também os utilizadores: nenhum operador pode usar a complexidade do protocolo para justificar práticas incompatíveis com os invariantes verificáveis.

### Rastreabilidade por defeito

Um `trace_id` é um identificador único propagado em todos os artefactos de uma operação financeira — pedido, lançamentos no livro-razão, obrigação e eventos — em todos os operadores envolvidos. Cada evento financeiro tem um `trace_id`. Cada cadeia causal é reconstituível. Nenhum dinheiro se move sem um lançamento no livro-razão. Nenhum lançamento no livro-razão é alguma vez modificado. Qualquer auditor — independente de qualquer operador — pode reconstituir qualquer pagamento a partir do seu `trace_id` apenas.

**Na prática:** Um regulador com acesso aos sistemas dos operadores pode reconstituir toda a cadeia a partir do `trace_id` — o pedido de encaminhamento, a obrigação, os lançamentos nos dois operadores, os eventos emitidos — sem que nenhum operador precise de produzir relatórios ou artefactos adicionais. Nenhum passo pode ser ocultado: cada passo tem um lançamento imutável no livro-razão. A rastreabilidade está arquitectada no protocolo — não depende da boa vontade dos participantes.

**Porque este princípio importa:** A rastreabilidade é o que transforma o BANZA num protocolo de infraestrutura financeira auditável. Um regulador pode investigar qualquer pagamento — incluindo inter-operadores — sem depender da cooperação activa de nenhum operador. O `trace_id` e os lançamentos imutáveis já contêm toda a informação necessária. A auditabilidade está arquitectada no protocolo, não dependente da boa vontade dos participantes.

### Acesso aberto

BANZA é um protocolo financeiro aberto. A participação de operadores é demonstrada por conformidade protocolar verificável, não por aprovação humana central. A participação não depende do acesso institucional, de acordos bilaterais nem de volumes mínimos de transacções. O critério é aberto a qualquer entidade jurídica que publique metadata assinada e evidência verificável de conformidade com o âmbito aplicável — com a confiança de produção dependente das condições de produção.

**Na prática:** Uma startup sem historial pode operar em L2 antes de um banco tradicional, se implementar o protocolo correctamente e publicar evidência de conformidade que qualquer parte reproduza. O tamanho, a reputação e os acordos prévios não têm efeito na avaliação — nem tem efeito a opinião de qualquer pessoa dentro do BANZA. As autorizações legais da actividade continuam a vir do regulador competente.

**Porque este princípio importa:** O acesso aberto converte o BANZA de um protocolo num mercado contestável. Quando a barreira de entrada é técnica e verificável — não institucional nem discricionária — uma fintech pode competir com um banco estabelecido ao nível do produto, sem negociar o acesso à rede e sem pedir autorização a um intermediário. A contestabilidade beneficia directamente os utilizadores de todos os operadores.

### Independência do protocolo

O protocolo existe independentemente de qualquer operador. Nenhum operador singular pode encerrá-lo, modificar as suas regras ou restringir o acesso a ele. A especificação, a verificação de conformidade e o enquadramento de evidência permanecem disponíveis para todos os operadores, independentemente do que qualquer operador individual faça.

**Na prática:** Este é o "teste do operador desaparecido" (ver §2). O BANZA passa este teste por design — não por promessa. A especificação é pública. Os contratos são abertos. A verificação de conformidade é de código aberto. Nenhuma dessas peças pertence a nenhum operador.

**Porque este princípio importa:** A independência é a propriedade que torna o BANZA adequado para ser infraestrutura nacional. Uma infraestrutura que depende de um único operador é tão frágil quanto esse operador. Uma infraestrutura cujas regras estão abertas, cujos contratos são públicos e cujo processo de verificação é acessível a todos é resiliente por design — e é o critério que autoridades regulatórias devem exigir de qualquer sistema que aspire a ser camada comum.

### Confiança distribuída

A confiança do protocolo deve permanecer distribuída, verificável e independente de qualquer participante individual. Nenhuma empresa, servidor, domínio ou pessoa detém autoridade unilateral sobre a cadeia de confiança do BANZA. A confiança reside nas chaves e nas regras do protocolo — não na infraestrutura física nem em nenhum operador específico.

**Na prática:** Na fase de bootstrap de produção (bootstrap), a Trust Root BANZA é mantida sob custódia de **2 HSM / 2 ou mais keyholders independentes** (controlo duplo 2-de-2): nenhum detentor individual consegue reconstruir a chave, delegar assinatura fora do processo ou substituir a autoridade máxima do protocolo. A Trust Root assina apenas o Manifesto de Chaves; as chaves delegadas assinam metadados do protocolo, releases e revogações. Ela não autoriza operadores, não emite licença e não autoriza pagamentos. O modelo institucional de fragmentação **3-de-5 por cinco assentos** é o **alvo futuro pós-institucionalização** — ainda não está em vigor (nenhum assento institucional está constituído ou operacional hoje). O Registo pode ser replicado por qualquer parte. A validade de qualquer réplica depende apenas da assinatura verificável da cadeia BANZA, não do domínio que a publica. Ver [`docs/governance/BANZA_TRUST_ARCHITECTURE.md`](https://github.com/banza-protocol/banza/blob/main/docs/governance/BANZA_TRUST_ARCHITECTURE.md).

**Porque este princípio importa:** Uma infraestrutura financeira cujo ponto de controlo pode ser capturado por um único participante não é infraestrutura — é uma plataforma proprietária com nome diferente. A distribuição da confiança é o que separa um protocolo de uma empresa. Reguladores, bancos e operadores competidores só podem coexistir numa rede comum se nenhum deles tiver acesso privilegiado à camada de confiança. O invariante `INV-ROOT-007` torna esta propriedade verificável, não apenas declarada.

### Especificação antes de implementação

Nenhum conceito financeiro ou protocolar entra numa implementação sem nascer primeiro na especificação. Nada existe apenas em prosa: quando a implementação começa, a regra tem de existir como artefacto — contrato OpenAPI, schema, invariante ou vector de conformidade em `contracts/` e `conformance/`.

**Na prática:** É a regra *contracts-first* (ADR-005). Um recurso que não tem contrato público não pode ser testado pela suite de conformidade — e o que não pode ser testado não pode gerar evidência nem ser avaliado por um par. A ordem é fixa: especificação → implementação pelo operador → evidência publicada → avaliação determinística pelos pares.

**Porque este princípio importa:** A alternativa é o desvio silencioso entre o que está escrito e o que está construído — a especificação torna-se descritiva em vez de normativa, e a conformidade deixa de ter âncora. Um protocolo financeiro só é auditável se a regra escrita for a regra real.

### Evidência pública antes de confiança

Qualquer afirmação relevante do protocolo deve ser verificável por artefactos públicos — rotas máquina, testes reproduzíveis, documentos assinados — sem exigir confiança em nenhum site, empresa ou pessoa. A confiança implícita é minimizada por desenho: o que não pode ser verificado não deve precisar de ser acreditado.

**Na prática:** O registo de protocolo, a metadata assinada, a lista de revogação e os manifestos são rotas públicas em JSON. A suite de conformidade é executável por qualquer parte e produz o mesmo resultado. Um supervisor ou auditor verifica o estado da rede directamente — sem pedir acesso, sem canal privilegiado, sem depender do que o protocolo diz de si próprio.

**Porque este princípio importa:** Instituições não podem construir sobre afirmações — constroem sobre evidência. Um protocolo compatível com supervisão é aquele em que a autoridade competente encontra os mesmos artefactos que qualquer outro participante, em formato verificável. É essa simetria que torna a supervisão técnica possível sem integração especial.

### Evidência técnica não é autorização legal

Um PASS na verificação de conformidade é evidência técnica reproduzível — prova que uma implementação satisfez os vectores aplicáveis num dado momento. Não é, e nunca substitui, a autorização legal para prestar serviços financeiros: essa vem do regulador competente, fora do protocolo. O protocolo estabelece conformidade verificável entre implementações; a legalidade da actividade é do operador.

**Na prática:** Hoje, o Registo Público de Protocolo está vazio e a confiança de produção não abriu — depende das condições de produção. Um operador pode obter PASS completo na suite e, ainda assim, não poder operar legalmente: o PASS demonstra conformidade protocolar, não habilita actividade financeira.

**Porque este princípio importa:** Confundir conformidade técnica com autorização regulatória inflaciona claims e desloca responsabilidade para onde ela não pertence. A separação mantém a fronteira limpa: o protocolo responde por regras verificáveis, o operador responde pela sua actividade, o regulador responde pela autorização. Nenhum artefacto BANZA dispensa os outros dois planos.

### Não-custódia por definição

O protocolo nunca detém fundos, nunca guarda saldos e nunca processa pagamentos. Não existe nenhum componente BANZA na trajectória do dinheiro: o valor move-se nos sistemas dos operadores e nas vias de liquidação competentes, sob as autorizações de quem opera.

**Na prática:** Nenhuma rota do protocolo movimenta valor — as rotas públicas BANZA publicam especificação, registo, revogação e evidência. Os saldos vivem nos livros-razão dos operadores, derivados de lançamentos imutáveis. O protocolo define como esses lançamentos devem comportar-se; não os executa.

**Porque este princípio importa:** A não-custódia é o que mantém a fronteira regulatória limpa: quem presta serviços financeiros ao público são os operadores, sob as suas licenças; o protocolo é uma camada de regras. Elimina também o risco sistémico de um ponto central de custódia — não há cofre do protocolo para atacar, capturar ou congelar.

### Revogabilidade e falha segura

Toda a confiança estabelecida na rede é revogável, e a ausência de prova de confiança trata-se como recusa. Perante dúvida — evidência expirada, material de confiança revogado, chave delegada ausente do Manifesto de Chaves ou assinatura impossível de verificar — o comportamento correcto é não federar. A rede falha para o lado seguro.

**Na prática:** A Lista de Revogação BANZA (BRL) é pública e assinada; a Avaliação Aberta de Confiança impõe dez verificações determinísticas antes de qualquer encaminhamento e falha fechada perante material de confiança em falta, inválido, expirado, revogado ou incompatível ([§8](#avaliação-aberta-de-confiança)); a evidência de conformidade L3+ tem frescura curta (≤ 90 dias), forçando republicação activa. A interoperabilidade é controlada por verificação criptográfica — nunca aberta por defeito, nunca concedida por decisão humana.

**Porque este princípio importa:** Numa rede financeira, remover confiança tem de ser tão fácil e tão rápido como concedê-la — um operador comprometido que não pode ser removido é um risco para todos os outros. E um sistema que, na incerteza, escolhe continuar é um sistema que converte falhas técnicas em perdas financeiras.

### Versionamento explícito e governação documentada

Toda a alteração ao protocolo tem versão, processo e trilho público. As regras mudam por RFC aprovado; as decisões de arquitectura ficam registadas em ADRs imutáveis após aceitação; nenhuma regra muda por decisão informal, pressão comercial ou conveniência de um participante.

**Na prática:** A especificação v1.0 está congelada — alterações entram em versões futuras através do processo de RFCs ([§10 Governação](#10-governança)). Cada documento normativo declara a versão a que pertence. Qualquer implementador consegue responder à pergunta «que regras estavam em vigor nesta data?» com um artefacto, não com memória institucional.

**Porque este princípio importa:** Operadores investem anos de engenharia sobre estas regras; supervisores avaliam sistemas contra versões concretas delas. Ambos precisam de estabilidade previsível e de história auditável. Um protocolo cujas regras mudam sem processo não é uma especificação — é documentação do comportamento de alguém.

---

## 4. Arquitectura do Protocolo

O BANZA define comportamento, nunca a tecnologia usada. Este capítulo apresenta primeiro a vista de conjunto — os artefactos que compõem o protocolo, o fluxo da especificação à federação e os limites de responsabilidade — e especifica depois o núcleo normativo: o modelo financeiro, a representação monetária obrigatória e os invariantes que qualquer implementação, em qualquer linguagem, deve satisfazer para ser conforme.

### Os Componentes do Protocolo

O protocolo existe como um conjunto de artefactos públicos com responsabilidades distintas. Nenhum deles processa pagamentos; em conjunto, definem o comportamento correcto, permitem verificá-lo e sustentam a confiança entre implementações independentes.

| Plano | Artefactos | Responsabilidade | Estado |
|---|---|---|---|
| **Normativo** | Especificação, ADRs, RFCs, contratos OpenAPI, schemas de eventos/webhooks/QR, invariantes | Definir o comportamento correcto — o que uma implementação conforme *tem* de fazer | Publicado (v1.0 congelada) |
| **Verificação** | Vectores de conformidade, executor `banza-conformance`, evidência reproduzível | Testar implementações contra a especificação e produzir evidência que terceiros podem reproduzir | Disponível — um PASS é evidência técnica, não autorização legal |
| **Confiança** | Trust Root offline, Manifesto de Chaves, chaves delegadas de assinatura, Lista de Revogação BANZA (BRL), Registo Público de Protocolo | Ancorar, publicar e revogar material de confiança por via criptográfica, sem autoridade humana no caminho | Especificado — as versões de produção dependem de M2; a confiança de produção depende das condições de produção |
| **Execução** | Implementações dos operadores, nas suas próprias infraestruturas | Processar pagamentos, guardar saldos, cumprir obrigações legais — fora do protocolo, sob as regras dele | Externa ao protocolo, por definição |

O **BanzAI** é o agente IA nativo do protocolo que acompanha estes planos: guia, invoca motores verificáveis e explica com fontes citadas. Não é autoridade normativa — não define regras, não decide e não substitui esta referência ([§11](#11-banzai-agente-do-protocolo)).

As rotas públicas do protocolo — registo de protocolo, metadata assinada, lista de revogação, manifestos e evidência de conformidade — publicam o estado destes artefactos em formato máquina (JSON), para que qualquer parte o verifique sem confiar em texto de apresentação.

![Arquitectura do protocolo BANZA — visão geral em três zonas: o que o BANZA define (especificação, contratos OpenAPI, invariantes, conformidade, evidência técnica, registo/BRL, confiança verificável), o que o operador executa localmente (implementação, endpoints, operação, KYC/KYB e AML/CFT) e o que fica fora do protocolo (movimentação de fundos, liquidação, banco/EMIS/PSP, autoridades competentes); o BanzAI é o agente nativo do protocolo e não decide nem certifica; o BANZA não movimenta fundos e a execução financeira ocorre fora do protocolo; hoje /operators = [] e production_certificates = false](/diagrams/protocol/banza-protocol-architecture-overview-v1.svg)

### Fluxo Conceptual: da Especificação à Federação

O caminho de uma implementação até à rede federada tem seis passos. Cada um produz um artefacto verificável; nenhum se apoia em aprovação humana.

1. **A especificação define o comportamento.** Contratos, invariantes e critérios de conformidade públicos e versionados. *Estado: v1.0 congelada.*
2. **O operador implementa localmente.** Na sua própria infraestrutura e tecnologia, sob as suas próprias autorizações. *Estado: possível hoje.*
3. **Os testes verificam o comportamento.** A suite de conformidade exercita a implementação contra os vectores oficiais. *Estado: disponível hoje.*
4. **A evidência é publicada.** O resultado é reproduzível por terceiros; um PASS é evidência técnica — não é autorização legal. *Estado: disponível hoje.*
5. **O operador auto-publica metadata assinada.** Manifesto, versão de protocolo, capacidades, endpoints e evidência, assinados pelo operador e ancorados na cadeia de confiança do protocolo; a entrada aparece no Registo Público de Protocolo por regras públicas de indexação, não por decisão de ninguém (ADR-039). *Estado: alvo M2 — a confiança de produção depende da Trust Root de produção.*
6. **A federação avalia, a cada encaminhamento.** Cada par executa a Avaliação Aberta de Confiança — dez verificações determinísticas sobre metadata, evidência, assinaturas e revogação — e falha fechada perante qualquer falha (ADR-040). *Estado: alvo M3 — a federação de produção depende de material de confiança de produção.*

Os passos 1–4 descrevem o presente; os passos 5–6 descrevem o alvo. A distinção é deliberada e verificável nas rotas públicas. Em nenhum dos seis passos existe uma entidade que decida quem entra: o que muda de passo para passo é a evidência disponível, não a vontade de um avaliador.

### Limites de Confiança e Responsabilidade

A fronteira entre o ambiente do protocolo e o ambiente de cada operador é um limite de responsabilidade, não apenas uma escolha de arquitectura:

- **O ambiente do protocolo** publica especificação, registo, revogação, manifestos e evidência. Não toca em dinheiro, não guarda dados de clientes, não participa em nenhuma transacção. Comprometê-lo não move dinheiro — nesse ambiente não existe valor para mover.
- **O ambiente do operador** processa pagamentos, mantém contas e saldos, guarda dados de clientes e cumpre KYC/KYB, AML/CFT e as demais obrigações aplicáveis, sob as suas próprias licenças e autorizações. O protocolo define como esse ambiente se deve comportar para ser conforme — não o opera, não o supervisiona e não responde por ele.
- **A evidência de conformidade atesta comportamento técnico** verificável face à especificação, num dado momento e num dado âmbito. Não é uma licença financeira, não é aprovação regulatória e não transfere para o protocolo nenhuma responsabilidade do operador. A autorização, quando exigida, vem do regulador competente.

### Núcleo do Protocolo

O comportamento do núcleo do protocolo é definido pela especificação, pelos contratos e pela suite de conformidade — não por um produto específico. Uma implementação de referência do núcleo organiza-se tipicamente numa arquitectura modular com responsabilidades rigorosamente separadas, cobrindo as áreas funcionais necessárias para que um operador seja conforme:

- Liquidação T+0 (execução no próprio momento da operação, no ambiente do operador) e ciclos de compensação inter-operadores
- Livro-razão de partidas dobradas — apenas de adição, atómico
- Carteiras de consumidor e de comerciante
- Federação e encaminhamento inter-operadores
- Reconciliação automatizada
- Sistema QR estático e dinâmico
- Identidade @handle com unicidade global — um identificador de carteira no formato `@nome` que identifica univocamente um titular na rede BANZA, independentemente do operador onde está registado (ADR-010)
- Pontos de integração para os controlos de conformidade do operador — a avaliação regulatória, o KYC/KYB e o AML/CFT são da responsabilidade do operador e das autoridades competentes, não do protocolo

Esta separação modular permite que cada componente evolua de forma independente sem comprometer os invariantes fundamentais do protocolo. Uma implementação de referência do núcleo, quando disponibilizada, expõe estas capacidades de forma acessível, sem que a sua utilização seja obrigatória para conformidade.

### Normativo: Representação Monetária

> **Esta secção é normativa.** Todos os operadores e implementações do protocolo TÊM DE estar em conformidade com estas regras.

**A Regra do Inteiro**

Todos os valores monetários no protocolo BANZA TÊM DE ser representados como inteiros. Os valores monetários em vírgula flutuante são proibidos em toda a superfície do protocolo: APIs, traces e registos, manifestos de operadores, saldos de carteiras, lançamentos no livro-razão, lotes de liquidação.

```json
// PROIBIDO
{ "amount": 10.50 }

// VÁLIDO
{ "amount_minor": 1050 }
```

**A convenção `*_minor`**

| Campo | Significado |
|-------|------------|
| `amount_minor` | Montante de pagamento genérico |
| `gross_minor` | Montante bruto pago pelo consumidor |
| `fee_minor` | Taxa retida pelo operador |
| `net_minor` | Montante líquido entregue ao destinatário |
| `available_minor` | Saldo imediatamente disponível |
| `reserved_minor` | Saldo temporariamente retido |
| `balance_minor` | Saldo total da carteira |

**Invariante de montante de liquidação (INV-STL-001):**
```
gross_minor = net_minor + fee_minor
```

**Invariante de saldo de carteira (INV-WALLET-001):**
```
balance_minor = available_minor + reserved_minor
```

Os saldos das carteiras são sempre derivados de lançamentos no livro-razão — nunca mutados directamente. Um saldo de carteira nunca pode ser negativo.

**Regra de conformidade MON-001:**

| Violação | Resultado |
|----------|-----------|
| Valores float em pedidos/respostas de API | REPROVAÇÃO de conformidade |
| Valores float em traces ou registos | REPROVAÇÃO de conformidade |
| `gross_minor ≠ net_minor + fee_minor` | REPROVAÇÃO de conformidade |
| `balance_minor ≠ available_minor + reserved_minor` | REPROVAÇÃO de conformidade |

**Registo de moedas:**

| Moeda | ISO 4217 | Unidades menores | Estado |
|-------|----------|-----------------|--------|
| Kwanza angolano | AOA | 100 (1 AOA = 100 unidades menores) | Moeda de referência do protocolo |
| Dólar americano | USD | 100 | Suportado (traces de teste) |
| Euro | EUR | 100 | Suportado (traces de teste) |

Qualquer alteração à política de precisão requer um RFC aprovado.

### Invariantes Financeiros

Os invariantes financeiros são afirmações não negociáveis que nunca podem ser violadas. São impostos simultaneamente em múltiplas camadas.

#### Famílias de Invariantes

| Família | Âmbito |
|---------|--------|
| `INV-LEDGER-*` | Partidas dobradas, imutabilidade, sem vírgula flutuante, atomicidade |
| `INV-WALLET-*` | Saldo consistente, sem negativos |
| `INV-STL-*` | bruto = líquido + taxa, sem criação de dinheiro |
| `INV-IDEM-*` | Âmbito da chave de idempotência, segurança de repetição |
| `INV-TRACE-*` | Completude da rastreabilidade |
| `INV-QR-*` | Ciclo de vida do QR, unicidade de resolução |
| `INV-IDENT-*` | Unicidade do handle |
| `INV-OTE-*` / `INV-FEDEVAL-*` | Avaliação Aberta de Confiança e confiança de encaminhamento de federação: validade da metadata assinada, frescura da evidência, conformidade com a lista de revogação, compatibilidade de capacidade/versão |
| `INV-FED-*` | Encaminhamento de federação, liquidação, reconciliação |
| `INV-ROOT-*` | Arquitectura da Trust Root, manifesto de chaves, validação de chaves de produção |

#### Invariantes Críticos

| Invariante | Descrição | Severidade |
|-----------|-----------|-----------|
| INV-LEDGER-001 | Débitos = Créditos em cada lançamento | CRÍTICO |
| INV-LEDGER-002 | Os lançamentos no livro-razão são imutáveis | CRÍTICO |
| INV-LEDGER-003 | Os montantes são inteiros — nunca vírgula flutuante | CRÍTICO |
| INV-LEDGER-004 | Lançamentos parciais nunca persistem (atómico) | CRÍTICO |
| INV-STL-001 | bruto = líquido + taxa (sem criação de dinheiro) | CRÍTICO |
| INV-STL-002 | Sem saldos negativos | CRÍTICO |
| INV-WALLET-001 | saldo = disponível + reservado | CRÍTICO |
| INV-IDENT-001 | A unicidade do @handle é global | CRÍTICO |
| INV-FEDEVAL-004 | A metadata de protocolo do operador tem de estar assinada e a assinatura tem de verificar contra a Trust Root através de uma chave delegada activa, no âmbito, não expirada e não revogada, resolvida a partir do Manifesto de Chaves publicado (`issuer_key_id`) | CRÍTICO |
| INV-FEDEVAL-006 | Frescura da evidência de conformidade ≤ 90 dias (L3+); material de confiança fora da sua janela de frescura é rejeitado sem período de graça | CRÍTICO |
| INV-FEDEVAL-002 | Material de confiança em falta, inválido, expirado, revogado ou incompatível falha fechado e é rejeitado do encaminhamento — incluindo qualquer operador presente no BRL | CRÍTICO |
| INV-FEDEVAL-007 | Um operador L3+ tem de declarar `supports_federation: true`, suportado por evidência de conformidade L3+ publicada, válida, fresca e não revogada | CRÍTICO |
| INV-FEDEVAL-005 | A BRL (Lista de Revogação) tem de estar assinada pela BANZA e dentro da sua janela de frescura — uma lista não assinada, não verificável ou desactualizada é tratada como ausente (fail-closed) | CRÍTICO |
| INV-ROOT-001 | Os IDs de chave de produção não podem começar com `test-` | CRÍTICO |
| INV-ROOT-002 | O Manifesto de Chaves tem de ser assinado pela raiz | CRÍTICO |
| INV-ROOT-007 | Nenhuma entidade individual controla isoladamente a autoridade máxima do protocolo | CRÍTICO |
| INV-ROOT-008 | Nenhuma chave delegada pode exercer autoridade para além do âmbito explicitamente delegado pela Trust Root activa | CRÍTICO |
| INV-ROOT-009 | A perda ou substituição de um ocupante institucional não pode comprometer a continuidade da autoridade máxima do protocolo | CRÍTICO |
| MON-001 | Todos os valores monetários como unidades menores inteiras | CRÍTICO |

#### O Livro-Razão de Partidas Dobradas

O livro-razão é:
- **Apenas de adição** — os lançamentos nunca são modificados ou eliminados
- **Equilibrado** — cada lançamento tem débitos e créditos iguais
- **Apenas inteiros** — os montantes são armazenados como unidades menores `i64`, nunca em vírgula flutuante
- **Atómico** — lançamentos parciais nunca persistem

Lançamento canónico de pagamento QR:
![Lançamento de partidas dobradas — débito do consumidor, créditos do comerciante e de taxas, soma zero](/diagrams/protocol/banza-ledger-posting-v1.svg)

### Orientação de Implementação

O protocolo BANZA é neutro em termos de tecnologia. Os operadores escolhem a sua própria tecnologia de implementação. O protocolo define *o que* deve ser verdade (invariantes, contratos, critérios de conformidade) — não *como* deve ser implementado.

| Preocupação | Requisito do protocolo | Escolha do operador |
|-------------|----------------------|---------------------|
| Precisão monetária | Aritmética inteira, sem vírgula flutuante | Qualquer linguagem com inteiros de 64 bits |
| Atomicidade de ledger | Postings atómicos, append-only | Qualquer base de dados ACID |
| Idempotência | Mesma chave → mesmo resultado | Qualquer store persistente com restrições únicas |
| Liquidação | Regras definidas pelo protocolo | Escolha do operador |

### Modelo de Execução Completo

O protocolo define as regras.

O operador implementa as regras e publica a evidência.

A conformidade verificável demonstra a implementação.

A federação interliga operadores que passam a Avaliação Aberta de Confiança.

Nenhuma destas etapas depende de uma infraestrutura central BANZA nem de uma decisão humana.

---

## 5. PostgreSQL — Estado Protocolar

Para ser inspeccionável e verificável, o protocolo guarda estado de forma durável numa base PostgreSQL dedicada (`pgvector/pgvector:pg16`), interna à VM do protocolo. Este capítulo descreve exactamente o que essa base é — e o que nunca é.

**O PostgreSQL do BANZA é uma base de estado protocolar verificável. Não é base financeira, não é ledger de pagamentos, não é core bancário, não é carteira digital e não é base de dados de operador.**

A base PostgreSQL do BANZA guarda estado do protocolo, não valor financeiro. O livro-razão de partidas dobradas, os saldos de carteira e a liquidação descritos por este documento são responsabilidade de cada operador, no seu próprio runtime, sujeitos aos invariantes do protocolo e demonstrados através de evidência de conformidade. A base do protocolo guarda a *evidência de que um operador se comporta correctamente* — nunca os dados financeiros do operador.

![PostgreSQL como base de estado protocolar do BANZA — quatro classes: confiança e registo (manifestos assinados, chaves públicas, registo de operadores, hashes de evidência), índice do agente (documentos e embeddings pgvector), auditoria append-only e marcadores de estado; não é base financeira, ledger, core bancário, carteira nem base de operador](/diagrams/protocol/postgresql-protocol-state-v1.svg)

### O que a base guarda

- **Artefactos de confiança assinados** — `root_manifest`, `key_manifest` (apenas chaves públicas e *fingerprints*), snapshots da lista de revogação (`brl_snapshot`, `brl_entry`). Nunca material de chave privada.
- **Registo público** — `operators` (auto-publicado pelos operadores) e `certificates` (emissão condicionada às condições de produção). Ambas vazias em pré-produção: `/operators = []` e `production_certificates = false`.
- **Evidência de conformidade** — `conformance_evidence` guarda *hashes* de relatórios (`report_sha256`) e um marcador de resultado, nunca os dados financeiros subjacentes. Um PASS é evidência técnica, não certificação.
- **Índice de documentos do agente** — `banzai_document`, `banzai_chunk` (com *embeddings* pgvector) e `banzai_answer_cache`, para o BanzAI recuperar e explicar o texto **público** de referência.
- **Auditoria e estado** — `protocol_audit` (registo append-only de escritas governadas) e `protocol_state` (fase, marcos).

### O que a base nunca guarda

![Fronteira de dados do PostgreSQL do BANZA — guarda estado do protocolo (artefactos públicos assinados, registo, hashes de evidência, índice do agente, auditoria e estado); nunca guarda valor financeiro, dados pessoais nem segredos (sem saldos, fundos, transacções de pagamento reais, contas bancárias, IBANs, cartões, KYC/AML, chaves privadas ou passwords)](/diagrams/protocol/postgresql-data-boundary-v1.svg)

Nunca — nem em schema, nem em runtime, nem em cópias de segurança: saldos, fundos ou carteiras; transacções de pagamento reais, liquidação, contas bancárias, IBANs ou cartões; KYC/AML nem dados pessoais de utilizadores, clientes ou comerciantes finais; chaves privadas, *seed phrases*, material de chave raiz privada ou segredos de custódia; conteúdo de `.env`, passwords, tokens ou chaves de API privadas. Estes dados pertencem — quando existem — ao runtime regulado do operador, nunca à base neutra do protocolo.

### Acesso por privilégio mínimo

![Acesso de serviços ao PostgreSQL do BANZA por privilégio mínimo — banza_ro serve rotas públicas só de leitura; banza_gov faz escritas governadas e auditadas em confiança e registo; banzai_rw só escreve o índice de documentos do agente e lê artefactos para os explicar; rede Docker interna, sem exposição ao host nem à Internet, nenhum papel superutilizador](/diagrams/protocol/postgresql-service-access-v1.svg)

A base corre numa rede Docker interna e nunca é publicada no host nem na Internet. Três papéis segregados acedem-lhe, nenhum com privilégios de superutilizador: `banza_ro` serve rotas públicas apenas de leitura; `banza_gov` faz escritas governadas e auditadas em confiança e registo; `banzai_rw` só pode escrever o índice de documentos do agente e ler os artefactos públicos para os explicar — nunca escreve confiança, registo nem certificados. Este privilégio mínimo impõe, ao nível da base, o princípio de que o BanzAI explica, mas não define.

### pgvector e o índice do agente

A extensão `pgvector` existe unicamente para o índice de recuperação do agente nativo: `banzai_chunk.embedding` e `banzai_answer_cache` (`vector(1024)`, índice HNSW por cosseno). A cache guarda pergunta normalizada, resposta e identificadores de fonte, indexada pelo *hash* das fontes (`sources_hash`) — uma mudança nas fontes invalida as linhas anteriores. Guarda apenas texto **público** de referência; nunca segredos, chaves nem identificadores de utilizador.

### Estado actual e imposição

Em auditoria (só leitura), todas as tabelas de artefactos, registo, evidência e índice estavam vazias; apenas `protocol_state` continha os marcadores de pré-produção. A fronteira não é apenas prosa: é imposta pelo schema (`001_schema.sql`), pelos papéis de privilégio mínimo e pela verificação automática `make postgres-data-boundary-check` (job de CI em cada *push* e *pull request*). Se for introduzida uma tabela capaz de guardar dados financeiros ou pessoais, tem de falhar as verificações de fronteira. Os invariantes financeiros (`INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`) permanecem regras que o protocolo **define e verifica** para os operadores — o protocolo mede livros-razão; não mantém um. Ver **ADR-042** e `docs/governance/POSTGRESQL_PROTOCOL_STATE.md`.

## 6. Confiança

### O que é a Infraestrutura de Confiança

A infraestrutura de confiança BANZA é o sistema criptográfico que permite a qualquer operador verificar a identidade, a metadata e a evidência de conformidade de qualquer outro operador — sem consulta em linha ao BANZA em cada verificação, sem depender de uma base de dados centralizada, sem acordos bilaterais e sem intervenção humana em nenhum ponto do caminho.

É composta por uma hierarquia de chaves que vai da Trust Root (gerada offline, em cerimónia controlada) até às chaves delegadas que assinam metadata de protocolo, revogações e evidência. Qualquer operador pode verificar qualquer artefacto usando apenas a chave pública raiz, que qualquer implementação conforme fixa no momento do lançamento.

Sem esta infraestrutura, a federação não é possível — porque não existe forma verificável de saber se a metadata de um par é autêntica, actual e não revogada. A Trust Root assina apenas o Manifesto de Chaves; as chaves delegadas assinam metadados do protocolo, releases e revogações. Ela não autoriza operadores, não emite licença e não autoriza pagamentos. Para a arquitectura institucional que governa estes mecanismos — quem controla a autoridade, como está distribuída e como é recuperada — ver as subsecções de arquitectura institucional adiante neste capítulo.

![Infraestrutura de Confiança BANZA — hierarquia de cinco níveis](/diagrams/protocol/banza-trust-v1.svg)

### Porque a Confiança Importa

Imagine dois operadores que nunca trabalharam juntos. O Operador A tem clientes em Luanda. O Operador B tem comerciantes no Huambo. Um cliente do Operador A quer pagar um comerciante do Operador B — com verificações criptográficas determinísticas definidas pelo protocolo, sem intervenção humana em cada verificação e sem acordos bilaterais prévios entre cada par de operadores.

Para que isto aconteça, o Operador A precisa de saber uma coisa sobre o Operador B: a sua implementação é demonstravelmente conforme e o seu material de confiança é autêntico, actual e não revogado?

Numa rede fechada, esta pergunta é respondida por acordos bilaterais: "Assinámos um contrato com o Operador B em 2024, por isso confiamos neles." Mas acordos bilaterais não escalam. Com vinte operadores na rede, são necessários 190 acordos bilaterais. Com cem operadores, são 4.950. Cada acordo custa tempo, dinheiro e negociação — e cada novo operador que entra na rede tem de repetir esse processo para cada par.

Um modelo de aprovação central resolveria a escala, mas ao custo de um ponto único de decisão humana sobre quem participa — reintroduzindo, na camada de confiança, exactamente a discricionariedade que o protocolo existe para remover. O BANZA não segue esse caminho.

A infraestrutura de confiança BANZA elimina ambos os problemas. A pergunta "posso encaminhar para o Operador B?" tem uma resposta determinística que qualquer operador calcula localmente, offline, sem contactar ninguém, sem acordos bilaterais prévios, sem intermediários e sem pedir autorização.

A resposta é o resultado da **Avaliação Aberta de Confiança**: manifesto válido, versão compatível, metadata assinada, evidência de conformidade presente e válida, assinatura verificável contra a Trust Root ou uma chave delegada, ausência do BRL, capacidades compatíveis, contrato de endpoint compatível e frescura da evidência dentro da política — falhando fechado em qualquer outro caso ([§8](#avaliação-aberta-de-confiança), ADR-040). Se a avaliação passar, a confiança protocolar está estabelecida — e o operador prossegue sujeito aos seus próprios controlos legais, operacionais, bancários e regulatórios. O BANZA não movimenta fundos, não detém saldos nem executa liquidação.

**A confiança importa porque:**

- Permite que dois operadores que nunca se encontraram verifiquem mutuamente metadata e evidência com garantias criptográficas completas — a execução e a finalização de pagamentos dependem da conformidade dos operadores e das suas obrigações legais, regulatórias, bancárias e de AML/CFT
- Remove o custo de negociação bilateral que torna redes proprietárias lentas a crescer e caras a manter — sem o substituir por um guardião central
- Torna a revogação imediata e universal: em produção, o protocolo exige que um operador cujo material de confiança seja revogado passe a ser rejeitado por toda a rede em menos de seis horas — assim que a Lista de Revogação BANZA (BRL) de produção estiver publicada (fase de bootstrap de produção) — sem necessidade de notificar cada par individualmente
- Cria um ambiente em que qualquer regulador pode verificar o estado de confiança de qualquer operador, a qualquer momento, sem depender de declarações do operador — apenas consultando a metadata assinada, a evidência e a lista de revogação pública

A infraestrutura de confiança é o que transforma um conjunto de operadores isolados numa rede federada. Sem ela, a federação é um conceito. Com ela, é um mecanismo verificável por qualquer participante — a activar em produção quando as condições de produção abrirem.

### A Cadeia de Confiança em Seis Passos

Para leitura institucional, a cadeia completa — do cofre offline à verificação pública — resume-se assim:

1. **Trust Root offline.** A chave raiz é gerada em cerimónia controlada, numa máquina isolada da rede, e permanece em custódia offline. Nunca toca na infraestrutura em linha. *Estado: cerimónia de produção agendada (M2).*
2. **Manifesto assinado.** A raiz assina apenas o Manifesto de Chaves — o documento público que lista as chaves delegadas activas. *Estado: localização canónica especificada; o manifesto de produção depende de M2.*
3. **Chaves delegadas de assinatura.** As chaves de metadata de protocolo, de revogação e de evidência derivam a sua autoridade do manifesto, com validade curta (≤ 184 dias) e âmbito limitado. A raiz nunca assina artefactos operacionais directamente.
4. **Metadata de protocolo auto-publicada.** O operador publica e assina a sua própria metadata — manifesto, versão, capacidades, endpoints e evidência de conformidade (≤ 90 dias de frescura para L3+) — no seu próprio domínio. Ninguém a emite em seu nome (ADR-039). *Estado: nenhuma metadata de produção publicada — depende das condições de produção.*
5. **Revogação.** A Lista de Revogação BANZA (BRL), assinada e publicada em ciclos de 6 horas, remove confiança de forma verificável — sem notificação par a par. É um mecanismo de segurança, não uma sanção.
6. **Verificação pública.** Qualquer parte — operador, auditor, supervisor — verifica toda a cadeia com artefactos públicos: manifesto, metadata assinada, evidência, BRL e Registo Público de Protocolo. Nenhum passo exige permissão ou canal privilegiado.

### Confiança Criptográfica, Evidência Técnica e Autorização Legal

Três coisas distintas coexistem neste capítulo e não devem ser confundidas:

| Plano | O que estabelece | Quem o emite ou produz | Estado actual |
|---|---|---|---|
| **Evidência técnica** | Que uma implementação passou os vectores de conformidade num dado momento (PASS) | Qualquer parte, executando a suite pública | Disponível hoje — reproduzível por terceiros |
| **Confiança criptográfica** | Que a metadata de um operador é autêntica, íntegra, actual e não revogada, e com que âmbito de conformidade | O próprio operador assina; a cadeia BANZA (Trust Root e chaves delegadas) ancora a verificação | Especificada; material de produção dependente das condições de produção |
| **Autorização legal** | Que uma entidade pode prestar serviços financeiros numa jurisdição | As autoridades competentes — fora do protocolo | Nunca emitida pelo BANZA, em nenhum marco |

Os três planos são independentes e nenhum substitui outro. A evidência técnica diz o que uma implementação faz; a confiança criptográfica diz que essa afirmação é autêntica e actual; a autorização legal diz que a entidade pode exercer a actividade. O protocolo cobre os dois primeiros e nunca o terceiro: a presença de um operador no Registo Público atesta metadata e evidência verificáveis, não autorização regulatória. As obrigações legais de quem opera existem fora do protocolo e não são dispensadas por nenhum artefacto BANZA.

### Por Que a Infraestrutura de Confiança Existe

Os operadores na federação verificam a metadata e a evidência uns dos outros. Esta verificação tem de ser:
- **Criptográfica** — não baseada numa chamada telefónica, num email ou no juízo de uma pessoa
- **Offline** — não requerendo uma consulta em linha ao BANZA em cada pagamento
- **Infalsificável** — a metadata de protocolo tem de ser impossível de forjar sem a chave privada correspondente

Isto requer uma hierarquia de confiança com uma raiz que cada operador fixa uma vez e usa para verificar todo o material de confiança subsequente.

### A Hierarquia de Confiança

| Nível | Componente | Função | Validade |
|-------|-----------|--------|---------|
| 1 | Trust Root BANZA | Assina apenas Manifestos de Chaves | 24 meses |
| 2 | Manifesto de Chaves | Lista todas as chaves delegadas activas | — |
| 3a | Chave Delegada de Metadata (`banza-meta-AAAAMM`) | Assina metadata de protocolo e releases | 184 dias |
| 3b | Chave Delegada de BRL (`banza-brl-AAAAMM`) | Assina Listas de Revogação BANZA | 184 dias |
| 3c | Chave Delegada de Evidência (`banza-evidence-AAAAMM`) | Assina evidências de conformidade | 184 dias |
| 4 | Metadata assinada dos operadores | Identifica operadores e o seu âmbito de conformidade na rede | Frescura máx. 90 dias (L3+) |
| 5 | Operadores na Rede | Avaliam metadata e evidência entre si | — |

**A Trust Root assina apenas Manifestos de Chaves** — nunca assina directamente metadata de operadores, BRLs ou evidências, e nunca autoriza um operador. Isto limita o raio de impacto se uma chave delegada for comprometida: a raiz (em custódia offline) permanece íntegra e pode emitir um novo Manifesto de Chaves com chaves delegadas renovadas.

### O Manifesto de Chaves

O Manifesto de Chaves é um documento JSON assinado que lista todas as chaves delegadas BANZA activas. A sua localização canónica especificada é:

```
https://banza.network/.well-known/banza/key-manifest.json
```

> **Estado:** esta localização é a **especificação canónica**, não uma afirmação de que um Manifesto de produção já está publicado. O Manifesto de Chaves de produção é publicado apenas após a cerimónia da Trust Root (M2), ainda por concluir. Até lá existem apenas manifestos de sandbox/teste. O protocolo permite múltiplas réplicas federadas verificáveis por assinatura — ver a arquitectura institucional de confiança em `docs/governance/BANZA_TRUST_ARCHITECTURE.md`.

É assinado pela Trust Root. Qualquer operador pode verificar a sua autenticidade usando a chave pública raiz. A fonte normativa é o próprio Manifesto de Chaves assinado, não os SDKs: uma implementação pode fixar (cache) a chave para uso offline, mas o Manifesto é a fonte de verdade.

O Manifesto de Chaves deve conter:
- `root_key_id` — identidade da Trust Root que assinou este manifesto
- `root_public_key` — chave pública raiz (mecanismo criptográfico de assinatura aprovado pelo protocolo, base64url)
- `expires_at` — expiração do manifesto (24 meses a partir da emissão)
- `manifest_signature` — assinatura criptográfica sobre o JSON canónico
- `keys` — conjunto de chaves delegadas activas, cada uma com `key_id`, `domain` (metadata-de-protocolo / revogação / evidência-de-conformidade), `public_key`, `active_since`, `expires_at`, `status`

As implementações devem fixar o Manifesto de Chaves no momento do lançamento. Um Manifesto de Chaves expirado deve fazer com que a implementação rejeite todo o material de confiança até o manifesto ser actualizado.

### Metadata de Protocolo Assinada

Cada operador publica e assina a sua própria metadata de protocolo — ninguém a emite em seu nome (ADR-039). A metadata é disponibilizada no domínio do próprio operador em:

```
/.well-known/banza/protocol-metadata.json
```

A metadata de protocolo deve conter:
- `operator_id` — tem de corresponder ao `operator_id` no manifesto do operador
- `protocol_version` — a versão de protocolo implementada, para avaliação de compatibilidade
- `conformance_scope` — o âmbito de conformidade demonstrado (0–4)
- `evidence` — referência e hash do relatório de evidência, com `generated_at` para avaliação de frescura
- `issuer_key_id` — a chave delegada de evidência que ancora a evidência na cadeia BANZA
- `signed_at` — momento da assinatura, base do cálculo de frescura
- `signature` — assinatura criptográfica sobre o JSON canónico

Qualquer operador par pode verificar esta metadata sem contactar o BANZA:
1. Obter a metadata de `/.well-known/banza/protocol-metadata.json` do operador alvo
2. Obter o Manifesto de Chaves de `banza.network/.well-known/banza/key-manifest.json`
3. Verificar que `issuer_key_id` aparece no Manifesto de Chaves e está activo
4. Verificar a assinatura da metadata com a chave pública da chave delegada
5. Verificar que a evidência referenciada é válida e está dentro da política de frescura
6. Verificar que o operador não está no BRL actual

A verificação é determinística: dois pares independentes, com os mesmos artefactos, chegam sempre ao mesmo resultado. Nenhum passo consulta uma opinião.

### O BRL — Lista de Revogação BANZA

O BRL é uma lista assinada do material de confiança que deixou de ser aceitável na rede. A Revocation List é um mecanismo de segurança e trust do protocolo. Não é licença, sanção regulatória ou autorização financeira. A sua localização canónica especificada é:

```
https://banza.network/federation/revocation-list.json
```

> Esta é a localização definida pelo protocolo, não uma afirmação de que o BRL de produção já está em directo. O BRL de produção é publicado após o marco da cerimónia da Trust Root (M2). O protocolo permite múltiplas réplicas federadas verificáveis por assinatura — ver a arquitectura institucional de confiança em `docs/governance/BANZA_TRUST_ARCHITECTURE.md`.

Deve ser actualizado de seis em seis horas. Deve ser assinado pela chave delegada de BRL.

O protocolo exige que, antes de encaminhar qualquer pagamento federado, o operador remetente verifique que o operador destinatário não está no BRL actual. Um operador no BRL não pode receber pagamentos encaminhados de nenhum outro operador, independentemente da validade da restante metadata.

A entrada de um operador no BRL é um sinal de segurança do protocolo — material de confiança comprometido, chave rotacionada indevidamente, evidência inconsistente ou comportamento incompatível com os invariantes. Não é uma pronúncia sobre a legalidade da actividade do operador, não afecta as suas autorizações e não é comunicável a terceiros como decisão regulatória. As sanções regulatórias, quando existam, vêm das autoridades competentes e seguem os seus próprios processos, inteiramente fora do protocolo.

### Invariantes da Chave Raiz (em linguagem simples)

| Invariante | O que significa |
|-----------|----------------|
| INV-ROOT-001 | Os IDs de chave de produção não podem começar com `test-`. As chaves de teste são rejeitadas em produção. |
| INV-ROOT-002 | O Manifesto de Chaves tem de ser assinado pela raiz. Um manifesto não assinado é inválido. |
| INV-ROOT-003 | Um Manifesto de Chaves expirado é inválido. As implementações têm de detectar e rejeitar manifestos obsoletos. |
| INV-ROOT-004 | A Trust Root assina apenas Manifestos de Chaves. Nunca assina metadata de operadores ou BRLs directamente, e nunca autoriza um operador. |
| INV-ROOT-005 | O BRL tem de ser assinado pela chave delegada de BRL designada. |
| INV-ROOT-006 | As chaves delegadas têm uma validade máxima de 184 dias. A Trust Root tem uma validade máxima de 24 meses. |

### A Cerimónia da Chave Raiz

A Trust Root é gerada numa **cerimónia offline** numa máquina isolada da rede, sem conectividade de rede, na presença de um Oficial de Cerimónia e de uma Testemunha independente. A chave privada nunca toca numa máquina ligada à rede. É mantida sob **controlo duplo 2-de-2** — o modelo aprovado para a fase de bootstrap de produção: **2-HSM / 2 keyholders independentes** (`dual_hsm_dual_keyholder`), com dois artefactos de custódia independentes (um por keyholder, em hardware e locais distintos) e uma cópia de recuperação em papel selada, datada e à prova de violação, sob controlo da governação. Nenhum keyholder ou segredo isolado reconstrói a chave: a activação exige os dois keyholders. O modelo institucional de fragmentação 3-de-5 (Shamir) por cinco assentos é o alvo futuro pós-institucionalização, ainda não em vigor (ver [§3](#3-princípios-fundamentais) e [`docs/governance/BANZA_TRUST_ARCHITECTURE.md`](https://github.com/banza-protocol/banza/blob/main/docs/governance/BANZA_TRUST_ARCHITECTURE.md)).

Este procedimento garante que nenhuma pessoa singular e nenhum sistema ligado à rede tem alguma vez acesso sozinho à chave privada raiz.

O script de automação da cerimónia (`tools/root-ceremony/ceremony_script.py`) automatiza todos os passos criptográficos determinísticos e impõe todos os seis invariantes INV-ROOT-*. Foi verificado com um ensaio: 10/10 verificações passam.

**Estado de produção:** A cerimónia da chave raiz está agendada. M2 Confiança em Produção (Manifesto de Chaves + BRL em directo em `banza.network`) é o marco activo. Consulte [Roteiro](#13-roteiro-de-maturidade).

### Benefícios da Infraestrutura de Confiança

**Para os operadores:**
- Verificação de parceiros sem consultas em linha ao BANZA — sem latência de rede adicional na avaliação de confiança
- Modelo de confiança previsível: metadata de protocolo aceitável sem assinatura verificável na cadeia BANZA é impossível de fabricar
- Chaves delegadas rotatórias: se uma chave delegada for comprometida, o impacto é contido — sem risco de comprometer a raiz
- Nenhum ponto de decisão humana que possa atrasar, condicionar ou negar a participação

**Para o ecossistema:**
- Federação sem intermediários: quaisquer dois operadores L3+ avaliam a confiança mutuamente sem processo de aprovação
- BRL auditável: qualquer parte independente pode verificar se um operador está revogado
- Hierarquia pública: qualquer implementação conforme fixa a chave pública raiz — nenhum operador tem vantagem de informação privilegiada

**Para reguladores:**
- O BRL é publicado de seis em seis horas e assinado — auditável em qualquer momento
- A cadeia de custódia da Trust Root é documentada na cerimónia — verificável por observadores independentes
- A revogação de material de confiança é efectiva em menos de seis horas em toda a rede
- A ausência de uma autoridade humana no caminho remove uma classe inteira de risco: não existe entidade a quem capturar, pressionar ou corromper para obter acesso à rede

### Agilidade Criptográfica

O protocolo utiliza ed25519 como mecanismo de assinatura para todos os artefactos da cadeia de confiança (ADR-038). Esta escolha é documentada e auditável.

O protocolo é concebido para poder migrar — não para ficar permanentemente dependente de um único algoritmo. A migração criptográfica segue o processo de governação:

| Etapa | Mecanismo |
|---|---|
| Proposta | RFC que descreve o novo algoritmo, a justificação e o plano de migração |
| Aprovação | ADR aceite pela estrutura de governação |
| Activação | Nova cerimónia da Trust Root com o novo algoritmo; novo Manifesto de Chaves publicado |
| Transição | Período de coexistência em que ambos os algoritmos são aceites |
| Conclusão | A metadata assinada sob o algoritmo anterior perde frescura ou é republicada |

Nenhuma migração criptográfica é possível sem activação da Trust Root e aprovação de governação. Esta propriedade garante que alterações ao mecanismo de confiança são deliberadas, auditáveis e verificáveis por todos os participantes. A agilidade criptográfica é um requisito de longevidade — o protocolo não deve depender indefinidamente da segurança de um único algoritmo.

### Estado Actual da Infraestrutura de Confiança

| Componente | Estado |
|-----------|--------|
| Arquitectura da Trust Root (ADR-038) | CONCLUÍDA |
| Invariantes INV-ROOT-001 a INV-ROOT-006 | DEFINIDOS E VERIFICADOS |
| Script de cerimónia (`tools/root-ceremony/ceremony_script.py`) | CONCLUÍDO — 10/10 verificações passam no ensaio |
| Contratos de federação (metadata de protocolo, BRL) | CONCLUÍDOS |
| Trust Root em produção (M2) | AGENDADA — próximo marco activo |
| Manifesto de Chaves em `banza.network` (M2) | Aguarda cerimónia |
| BRL em produção (M2) | Aguarda cerimónia |

A infraestrutura de confiança está completamente especificada, testada e verificada. A implementação de produção aguarda a cerimónia da Trust Root (M2), que é o próximo marco crítico do protocolo.

### Processo de Revogação

A revogação é o mecanismo de segurança pelo qual material de confiança deixa de ser aceite pela rede. É um processo formal com iniciadores definidos, fundamento objectivo e publicação verificável.

A Revocation List é um mecanismo de segurança e trust do protocolo. Não é licença, sanção regulatória ou autorização financeira. A revogação não retira a um operador nenhum direito legal, não afecta as suas autorizações e não constitui juízo sobre a sua actividade — retira apenas a aceitabilidade criptográfica do seu material de confiança na rede federada, até que este seja corrigido e republicado.

**Quem pode iniciar**

| Iniciador | Situação |
|---|---|
| Qualquer parte | Reporte de material de confiança comprometido, com evidência verificável |
| Qualquer operador | Reporte de comportamento incompatível com os invariantes do protocolo, com evidência reproduzível |
| Operação da Trust Root | Comprometimento de chave delegada ou rotação de emergência |
| [Entidade de Governação BANZA] | Decisão de governação após processo formal e evidência publicada |

**Tipos de acção**

| Acção | Fundamento | Efeito | Reversível |
|---|---|---|---|
| Revogação de chave | Comprometimento de material criptográfico | Chave adicionada ao BRL; metadata assinada por ela deixa de verificar | Sim — mediante republicação com nova chave |
| Revogação de operador | Evidência verificável de violação de invariante | `operator_id` adicionado ao BRL; encaminhamento recusado por todos os pares | Sim — mediante correcção e evidência nova |
| Perda de frescura | Automática — evidência fora da política de frescura | Avaliação falha fechada; federação bloqueada | Sim — mediante republicação de evidência |

Toda a entrada no BRL exige fundamento objectivo e auditável, publicado com a entrada. Não existe revogação por juízo discricionário: uma entrada sem fundamento verificável é, ela própria, um defeito do protocolo e contestável como tal.

**Sequência de publicação**

1. O identificador de confiança do operador ou da chave é adicionado ao BRL, com o fundamento.
2. O BRL é assinado pela chave delegada de BRL (ver Hierarquia de Confiança).
3. O BRL actualizado é publicado em `banza.network/federation/revocation-list.json`.
4. O Registo Público de Protocolo reflecte o novo estado por reindexação determinística.
5. O ciclo de publicação seguinte (máximo 6 horas) distribui o BRL a toda a rede federada.

**Efeito na rede**

Um operador no BRL não pode receber pagamentos federados de nenhum outro operador — independentemente da validade formal da restante metadata. Os operadores verificam o BRL antes de cada encaminhamento (INV-FEDEVAL-002). O efeito é efectivo em menos de 6 horas em toda a rede.

**Comunicação ao operador**

O operador é notificado através do contacto declarado no seu Manifesto de Operador antes de qualquer entrada no BRL — excepto em situações de comprometimento de segurança activo onde a acção imediata é necessária para proteger a integridade da rede. A notificação é uma cortesia operacional: o BRL é público e verificável independentemente dela.

Um operador que considere uma entrada infundada pode contestá-la — ver [Contestação de Revogação](#contestação-de-revogação) em §7.

---


### Arquitectura institucional de confiança (resumo)

Esta secção resume os **mecanismos criptográficos** de confiança (acima). A **estrutura institucional** que os governa — a Trust Root e a sua fragmentação, a separação entre governação e operação de assinatura, os assentos institucionais e os procedimentos de recuperação e continuidade — está detalhada no documento de arquitectura de confiança.

- A confiança no BANZA não depende da confiança num servidor nem numa entidade, mas de uma cadeia verificável de assinaturas: as chaves e as regras do protocolo, não a infraestrutura física nem nenhum participante singular.
- A Trust Root está em custódia offline. Assina apenas o Manifesto de Chaves; as chaves delegadas assinam metadados do protocolo, releases e revogações. Não autoriza operadores, não emite licença e não autoriza pagamentos. As chaves delegadas exercem apenas o âmbito de assinatura explicitamente delegado (`INV-ROOT-008`); a governação supervisiona esse âmbito sem o exercer.
- Nenhuma parte da estrutura institucional decide quem participa na rede. A participação é demonstrada por conformidade verificável — nunca concedida.
- Os assentos institucionais são **desenho definido pelo protocolo**, não nomeações já efectuadas.

Para a arquitectura institucional completa da confiança (assentos, fragmentação da chave raiz, recuperação, continuidade e activação), ver [`docs/governance/BANZA_TRUST_ARCHITECTURE.md`](https://github.com/banza-protocol/banza/blob/main/docs/governance/BANZA_TRUST_ARCHITECTURE.md).

## 7. Conformidade e Evidência

### O que é a Conformidade BANZA

BANZA é um protocolo financeiro aberto. A participação de operadores é demonstrada por conformidade protocolar verificável, não por aprovação humana central.

A conformidade é o mecanismo pelo qual uma entidade demonstra que a sua implementação do protocolo BANZA é correcta, completa e verificável. Não existe nenhum processo de admissão, nenhuma entidade que decida quem entra e nenhum artefacto que alguém emita a favor de um operador: existe evidência determinística, produzida por testes públicos, que o operador publica e que qualquer parte reproduz.

Um operador implementa o protocolo, publica o seu manifesto, expõe endpoints compatíveis, produz evidência de conformidade e assina a sua metadata de protocolo. Os pares avaliam esse material com a Avaliação Aberta de Confiança ([§8](#avaliação-aberta-de-confiança)) e decidem, de forma determinística e local, se encaminham. A partir do âmbito L3, é este material — não uma autorização — que sustenta a federação sem acordos bilaterais. A confiança de produção depende das condições de produção.

O acesso é aberto por construção: os critérios são públicos, determinísticos e auditáveis; não existem volumes mínimos, acordos bilaterais prévios nem decisões discricionárias. A operação real em produção continua sujeita às obrigações legais, regulatórias e bancárias aplicáveis e aos requisitos de KYC/KYB que as autoridades competentes exigem — a conformidade técnica não substitui nem dispensa estas obrigações, e o BANZA não as afere.

![Ciclo de vida da conformidade de um operador — implementação, sandbox, PASS técnico, metadata assinada e auto-publicada, indexação determinística no Registo Público de Protocolo, e os estados de confiança (evidência sem frescura, material revogado na BRL); hoje /operators = [] e production_certificates = false](/diagrams/protocol/banza-operator-conformance-lifecycle-v1.svg)

### O Que a Conformidade Não É

Antes do processo, os limites. A conformidade BANZA:

- **não é aprovação regulatória nem licença financeira** — o BANZA não emite licenças e nenhuma evidência autoriza a prestação de serviços financeiros; a autorização vem do regulador competente;
- **não substitui** KYC/KYB, AML/CFT, gestão de risco, segurança operacional, obrigações bancárias nem supervisão — essas obrigações pertencem ao operador, sob as entidades competentes;
- **não é uma admissão** — nenhuma entidade revê, aceita ou recusa um operador; a evidência é publicada pelo operador e avaliada por máquina;
- **não é permanente** — a evidência tem frescura, e evidência fora da política deixa de sustentar federação até ser republicada;
- **não é entrada automática na federação** — a federação exige âmbito L3+, metadata assinada verificável, evidência fresca, ausência do BRL e a abertura da produção (M3).

**Estado actual:** nenhum operador publicou metadata de produção — `/operators = []` e `production_certificates = false` nas rotas públicas.

![Fluxo de conformidade BANZA — da implementação à evidência publicada e verificável](/diagrams/protocol/banza-certification-v1.svg)

### Visão Geral da Conformidade

Em termos simples: o operador implementa o BANZA, expõe uma URL pública com os endpoints exigidos, e valida a conformidade no **BanzAI**, que executa as validações no navegador e produz um **relatório de evidência**. O operador publica esse relatório e assina a sua metadata de protocolo. A partir daí, qualquer par ou auditor verifica tudo por si próprio, sem pedir nada a ninguém.

![Pipeline de conformidade BANZA — implementação, endpoint de sandbox, banza-conformance e relatório estão disponíveis hoje; a auto-publicação de metadata assinada e a indexação no registo dependem das condições de produção](/diagrams/protocol/banza-certification-pipeline-v1.svg)

> **Estado actual:** a verificação de conformidade está disponível; a confiança de produção ainda não está aberta. O resultado PASS gera evidência técnica, não autorização legal.

### O Caminho Recomendado para Operadores

1. Implemente o runtime do operador segundo a especificação do protocolo.
2. Exponha um endpoint público de sandbox.
3. Publique nesse endpoint: `GET /health` e `GET /.well-known/banza/operator.json`.
4. Valide a conformidade no **BanzAI** (aba **Conformidade**), contra a sua URL pública.
5. Reveja o relatório de evidência e gere o **Evidence Bundle** no BanzAI.
6. Publique e assine a sua metadata de protocolo em `/.well-known/banza/protocol-metadata.json`, referenciando a evidência pelo seu hash.
7. Mantenha a evidência dentro da política de frescura — a partir daí, os pares avaliam-na automaticamente.

Para validar compatibilidade protocolar, use o BanzAI. O BanzAI permite preparar o manifest, executar validações de conformidade, verificar metadata assinada do protocolo, avaliar revocation/fail-closed e gerar um evidence bundle. A implementação do operador é validada por artefactos verificáveis, não por uma ferramenta específica.

A validação no BanzAI prova que o endpoint expõe um operador de sandbox válido ao âmbito pedido e gera um relatório de evidência. **Não** prova prontidão de produção nem cumprimento de obrigações legais/regulatórias.

### O Que o Operador Deve Expor

Para o nível L0, o endpoint público de sandbox deve expor dois endpoints só de leitura.

![Endpoints L0 do operador de sandbox — /health e /.well-known/banza/operator.json com as propriedades de segurança de sandbox](/diagrams/protocol/banza-operator-l0-endpoints-v1.svg)

**Endpoint 1 — verificação de saúde:**

```http
GET /health
```

Propriedades de sandbox esperadas: `status: "ok"`, `environment: "sandbox"`, `simulated: true`, `production_allowed: false`.

**Endpoint 2 — manifesto do operador:**

```http
GET /.well-known/banza/operator.json
```

Manifesto mínimo esperado: `operator_id`, `operator_name`, `operator_url`, `protocol_version`, `certification_level`, `environment`, `simulated`, `production_allowed`, `capabilities`.

```json
{
  "operator_id": "o-seu-operador-sandbox",
  "operator_name": "O Seu Operador (Sandbox)",
  "operator_url": "https://sandbox.operador.exemplo",
  "protocol_version": "1.0",
  "certification_level": 0,
  "environment": "sandbox",
  "simulated": true,
  "production_allowed": false,
  "capabilities": {
    "supports_wallets": false,
    "supports_qr": false,
    "supports_settlement": false
  }
}
```

Um endpoint de sandbox que passe o dry-run L0 continua a **não** estar pronto para produção: a metadata de produção assinada e a confiança de produção dependem das condições de produção.

### Por Que a Conformidade Existe

Protocolos abertos requerem verificação aberta. Qualquer entidade que afirme implementar o BANZA tem de o poder provar — e qualquer outra parte tem de poder verificar essa prova sozinha. A verificação de conformidade é esse mecanismo: um conjunto de testes determinísticos cujo resultado não depende de quem os executa. Sem conformidade verificável, não há confiança protocolar. Sem excepções.

### Porque a Conformidade Aberta Muda Tudo

A conformidade aberta não é apenas um processo técnico. É uma decisão arquitectónica com consequências económicas directas para todos os participantes.

| Antes | Com BANZA |
|---|---|
| Acordos bilaterais caso a caso | Conformidade verificável, universal e aberta |
| Acesso discricionário | Acesso determinístico (avaliação por máquina) |
| Processos de meses de duração | Evidência produzida em minutos e verificável em segundos |
| Barreiras institucionais | Barreira única: conformidade técnica |
| Regras privadas negociadas | Regras públicas verificáveis |

> O quadro descreve o modelo de conformidade **definido pelo protocolo**. A confiança de produção depende das condições de produção — hoje `/operators = []` (ver [§13 — Roteiro](#13-roteiro-de-maturidade)).

**Para startups e fintechs:** Uma startup pode demonstrar conformidade em L2 (liquidação T+0, QR dinâmico) antes de processar o seu primeiro pagamento — e pode fazê-lo já hoje, sem taxa, sem candidatura e sem esperar por ninguém. A evidência de conformidade é publicamente verificável. É um requisito técnico — o cumprimento de requisitos regulatórios e de licenciamento aplicáveis na jurisdição do operador é responsabilidade do próprio operador e não é conferido pelo protocolo.

**Para bancos e operadores estabelecidos:** A conformidade verificável garante interoperabilidade automática. Um banco com âmbito L3 pode federar com qualquer outro operador L3+ sem negociação adicional. A confiança é criptográfica — não é necessário um acordo escrito para cada par, nem um intermediário que ateste os pares um ao outro.

**Para o ecossistema:** Cada novo operador conforme aumenta o alcance de todos os outros. A conformidade aberta é o mecanismo pelo qual o valor da rede cresce sem barreiras artificiais. Mais operadores conformes significa mais comerciantes acessíveis, mais consumidores alcançáveis, mais valor para todos os participantes.

### Níveis de Conformidade

Os níveis L0–L4 são **âmbitos de conformidade**: descrevem o que uma implementação demonstrou, não um estatuto que alguém lhe concedeu. Um âmbito é uma afirmação sobre comportamento verificável, sempre acompanhada da evidência que a sustenta.

| Nível | Nome | O que evidencia |
|-------|------|----------------|
| **L0** | Sandbox de Protocolo | Ambiente sandbox operacional; manifesto válido (`simulated=true`), MON-001, operações básicas |
| **L1** | Capacidade de Pagamento Central | Carteiras, QR estático, transferências P2P, livro-razão de partidas dobradas, rastreabilidade |
| **L2** | Capacidade de Iniciação de Pagamento | Tudo o de L1 + QR dinâmico, links/pedidos de pagamento, execução instantânea (T+0), INV-QR |
| **L3** | Interoperabilidade entre Operadores | Tudo o de L2 + encaminhamento inter-operadores, reconciliação, liquidação inter-operadores, metadata de protocolo assinada e verificável, evidência dentro da política de frescura, conformidade com BRL |
| **L4** | Interoperabilidade Externa | Tudo o de L3 + aquisição via vias externas (definido por perfil) |

Cada nível é cumulativo. L3 requer tudo o que está em L2, que requer tudo o que está em L1. Em resumo: **L0** = endpoint público de sandbox + manifesto + flags de segurança; **L1/L2** = capacidades de pagamento, que podem envolver POSTs que alteram estado; **L3** = federação e confiança de produção, dependente de metadata assinada/evidência fresca/BRL/condições de produção; **L4** = interoperabilidade externa definida por perfil.

> **Aviso:** os testes de L1 e superiores podem executar pedidos **POST** (carteiras, transferências, pagamentos). Execute-os apenas contra ambientes de sandbox/teste — nunca contra produção, a menos que o operador tenha preparado explicitamente um ambiente de conformidade seguro.

**L1 — Capacidade de Pagamento Central — requisitos completos:**
- Manifesto de Operador válido em `/.well-known/banza/operator.json` com `certification_level: 1`
- Capacidades obrigatórias no manifesto: `supports_wallets: true`, `supports_qr: true`, `supports_traces: true`
- Carteiras de consumidor e de comerciante operacionais
- QR estático funcional (geração e leitura)
- Transferências P2P entre carteiras
- Representação monetária em unidades menores inteiras — MON-001
- Livro-razão de partidas dobradas com lançamentos imutáveis — INV-LEDGER-001, INV-LEDGER-002
- Propagação de `trace_id` em todos os eventos — INV-TRACE-*
- Verificação de conformidade L1: executar com `--level 1`

**L2 — Capacidade de Iniciação de Pagamento — requisitos completos:**
- Tudo o que está em L1
- Manifesto actualizado com `certification_level: 2`
- Capacidades adicionais obrigatórias: `supports_payment_requests: true`
- Pedidos de pagamento operacionais (`POST /payment-requests`, `POST /payment-requests/{id}/pay`)
- QR dinâmico operacional — cada código tem resolução única e é de uso único (`INV-QR-*`)
- Links de pagamento operacionais
- Execução instantânea T+0 — débito e crédito executam atomicamente no momento da transacção (INV-LEDGER-004)
- Verificação de conformidade L0–L2: executar o conjunto de testes com `--level 2`

**L3 — Interoperabilidade entre Operadores — requisitos completos:**
- Metadata de protocolo assinada e verificável em `/.well-known/banza/protocol-metadata.json` (INV-FEDEVAL-004)
- Frescura da evidência de conformidade: máximo 90 dias (INV-FEDEVAL-006)
- Operador não presente na Lista de Revogação BANZA (BRL) (INV-FEDEVAL-002)
- `supports_federation: true` declarado no manifesto do operador (INV-FEDEVAL-007)
- Endpoint `POST /federation/route` operacional
- Endpoint `GET /federation/obligations` operacional
- O `issuer_key_id` da metadata tem de aparecer no Manifesto de Chaves BANZA publicado (INV-FEDEVAL-004)
- Comportamento fail-closed perante material de confiança em falta, inválido, expirado, revogado ou incompatível (INV-FEDEVAL-002)
- Verificação de conformidade de federação: o conjunto de testes de federação (grupos FED-CERT a FED-FAIL). L3 requer evidência multi-operador e não é atribuído pelo executor de sandbox.

**Nota sobre L4:** A verificação de conformidade L4 (integração com infraestruturas externas) estará disponível no Protocolo v1.1. O L4 está definido mas ainda não é demonstrável na v1.0.

O nível L4 é definido pela capacidade de integração verificável com infraestruturas externas ao protocolo BANZA — não por uma tecnologia específica. Exemplos incluem redes de cartões, sistemas nacionais de pagamentos, protocolos internacionais de liquidação e redes interbancárias externas. Esta definição tecnologicamente neutra permite que o L4 evolua sem dependência de infraestruturas particulares.

### O Princípio do Acesso Aberto

A participação segue critérios técnicos definidos pelo protocolo: implementação das capacidades necessárias, aprovação na verificação de conformidade para o âmbito alvo, e auto-publicação de metadata assinada e de evidência verificável. Não existem acordos bilaterais prévios nem volumes mínimos exigidos ao nível técnico do protocolo — e não existe candidatura, porque não existe ninguém a quem candidatar-se. Uma entidade que cumpra as verificações publica a sua evidência e passa a ser avaliável por qualquer par.

A confiança de produção depende da abertura das condições de produção. A operação real depende do cumprimento das obrigações legais, regulatórias e de KYC/KYB aplicáveis à jurisdição e à actividade do operador — obrigações que existem fora do protocolo e que nunca são dispensadas por conformidade técnica. O acesso aberto é uma propriedade estrutural do modelo de confiança, não uma promessa de admissão: ninguém é admitido porque ninguém admite.

### Modos de Verificação

A verificação de conformidade produz sempre um **relatório de evidência** e um **âmbito atingido** — nunca uma autorização e nunca um estatuto concedido. Distinguem-se três situações:

**A. Preparação e dry-run.** Durante o desenvolvimento, o operador valida a sua implementação no **BanzAI**, contra o seu próprio endpoint de sandbox. Produz um âmbito atingido e um relatório de evidência reproduzível por terceiros. **Não** substitui a metadata assinada de produção e **não** adiciona o operador ao registo de produção.

**B. Evidência de federação (L3) em dry-run.** A evidência de federação L3 usa material de confiança simulado — nunca chaves de produção. É evidência de dry-run/fixture: não sustenta federação de produção, que permanece dependente das condições de produção.

**C. Conformidade de produção.** Requer a prontidão de confiança de produção (M2) e a prontidão do material de confiança de operadores (M3). O operador publica evidência de produção e assina a sua metadata com material ancorado no Manifesto de Chaves de produção; os pares avaliam-na automaticamente. Hoje nenhum operador publicou metadata de produção.

> **Cuidado:** Executar a verificação de conformidade contra um domínio que apenas serve documentação, como o site público, deve falhar: um operador precisa de expor um runtime de operador com manifesto, `/health` e os endpoints do âmbito declarado.

### Executar Conformidade no BanzAI

Para operadores, o caminho público de validação é o **BanzAI**. Para validar compatibilidade protocolar, use o BanzAI. O BanzAI permite preparar o manifest, executar validações de conformidade, verificar metadata assinada do protocolo, avaliar revocation/fail-closed e gerar um evidence bundle. A implementação do operador é validada por artefactos verificáveis, não por uma ferramenta específica.

Fluxo no BanzAI: **abrir o BanzAI → Manifest → validar manifest → Conformidade → correr validação → rever relatório → gerar Evidence Bundle → exportar/guardar.**

1. **Abrir o BanzAI.** [Abrir o BanzAI](/banzai).
2. **Manifest.** Carregue ou cole o Manifesto de Operador e valide-o estruturalmente.
3. **Conformidade.** Execute a validação de conformidade para o âmbito alvo, contra a sua URL pública de sandbox.
4. **Rever o relatório.** Verifique o âmbito atingido e o resultado de cada verificação.
5. **Evidence Bundle.** Gere o Evidence Bundle e exporte/guarde o relatório de evidência.

> O BanzAI usa os engines Rust/WASM do protocolo no navegador. O resultado é determinístico e verificável, mas não é licença, certificação ou autorização.

Um PASS significa evidência de conformidade técnica para o âmbito pedido. Um PASS **não** significa prontidão legal ou regulatória, e por si só não sustenta federação: para isso, a evidência tem de ser publicada, assinada na metadata de protocolo do operador e mantida dentro da política de frescura.

> **Transparência para manutenção:** o protocolo mantém engines Rust/WASM, contratos (`contracts/`) e vectores de conformidade (`conformance/`), usados na manutenção e na evolução do protocolo. Não constituem um caminho de validação exigido ao operador — o caminho do operador é o BanzAI.

### O Relatório de Evidência

A verificação produz um relatório JSON. Os campos principais são:

| Campo | Significado |
|---|---|
| `tool` | Identificador da ferramenta que produziu o relatório |
| `runner_version` | Versão do executor |
| `operator_url` | URL pública testada |
| `requested_level` | Âmbito pedido na execução |
| `certification_level_achieved` | Âmbito de conformidade atingido pela evidência (nome de campo herdado do contrato v1.0) |
| `generated_at` | Carimbo temporal UTC — base do cálculo de frescura |
| `summary` | Total / aprovados / falhados |
| `statement` | "This report is conformance evidence, not a production certificate." |

```json
{
  "tool": "banza-conformance",
  "runner_version": "0.1.0",
  "operator_url": "https://sandbox.operador.exemplo",
  "requested_level": 0,
  "certification_level_achieved": 0,
  "summary": { "total": 5, "passed": 5, "failed": 0 },
  "statement": "This report is conformance evidence, not a production certificate."
}
```

O operador guarda o relatório, publica-o e referencia-o pelo hash na sua metadata de protocolo assinada. O relatório é reproduzível por terceiros a partir da URL pública. O relatório **não** prova prontidão legal ou regulatória.

![Evidência de conformidade e autorização legal — o PASS demonstra comportamento técnico verificável; a autorização vem do regulador competente, fora do protocolo](/diagrams/protocol/banza-evidence-vs-certificate-v1.svg)

### Como Publicar Conformidade

1. **Prepare o seu manifesto.** Crie um Manifesto de Operador válido declarando o seu âmbito de conformidade e capacidades. Use o Validador de Manifesto do BanzAI para verificar que passa a validação estrutural.
2. **Implemente as capacidades.** Construa o seu operador seguindo a especificação do protocolo, os contratos e os esquemas publicados. Consulte [Recursos para Programadores](#12-recursos-para-programadores).
3. **Realize a validação de conformidade no BanzAI.** Na aba **Conformidade** do [BanzAI](/banzai), execute a validação para o âmbito alvo contra a sua URL pública. Todos os testes têm de passar — uma única falha impede a demonstração do âmbito. Execute apenas contra o seu próprio endpoint de operador ou de sandbox. O nível 0 é uma verificação só de leitura (manifesto + `/health`); o nível 1 ou superior pode emitir POST para endpoints de carteira, transferência e pagamento, pelo que só deve correr contra um ambiente de teste/sandbox seguro. Gere o **Evidence Bundle** e guarde o relatório de evidência.
4. **Publique a evidência.** Disponibilize o `report.json` numa URL pública estável no seu domínio. A evidência tem de ser obtenível e reproduzível por qualquer parte, sem autenticação.
5. **Assine e publique a metadata de protocolo.** Publique `/.well-known/banza/protocol-metadata.json` com `operator_id`, `protocol_version`, `conformance_scope`, a referência e o hash da evidência, o `issuer_key_id` e a assinatura sobre o JSON canónico. Este é o artefacto que os pares avaliam.
6. **Mantenha a frescura.** Republique a evidência dentro da política aplicável ([Frescura da Evidência](#frescura-da-evidência)). A partir daqui não há mais nada a fazer: a indexação no Registo Público de Protocolo e a avaliação pelos pares são automáticas e determinísticas.

Não existe passo de submissão, revisão ou aprovação. Não há a quem enviar, nem por quem esperar.

### O que os Pares Verificam

A avaliação é executada por máquina, por cada par, a cada encaminhamento. Não há revisão humana em nenhum ponto.

| A avaliação verifica | A avaliação nunca faz |
|---|---|
| Autenticidade da assinatura da metadata | Alterar os resultados da verificação de conformidade |
| Integridade e consistência dos hashes da evidência | Reinterpretar os resultados dos testes |
| Presença dos artefactos obrigatórios | Adicionar critérios não previstos no protocolo |
| Ancoragem do `issuer_key_id` no Manifesto de Chaves | Recusar conformidade demonstrada pelos testes |
| Consistência do manifesto com o âmbito declarado | Condicionar a participação a factores externos à conformidade técnica |
| Frescura da evidência e ausência do BRL | Emitir juízo sobre a actividade ou a legalidade do operador |

**Se os testes exigidos passarem e o material de confiança for válido, a avaliação passa — sempre, para qualquer operador, em qualquer par.** O resultado é uma função determinística dos artefactos, não de uma decisão. Dois pares independentes chegam sempre ao mesmo veredicto porque avaliam os mesmos artefactos com as mesmas regras.

### Avaliação Determinística, Não Discricionária

A conformidade técnica é verificada de forma determinística pelos testes públicos do protocolo, e o material de confiança é avaliado de forma determinística pelos pares. Nenhuma entidade decide quem pode participar: não existe função de admissão no protocolo, e por isso não existe discricionariedade para eliminar.

A recusa de encaminhamento só pode resultar de razões objectivas e auditáveis, todas verificáveis a partir dos artefactos públicos: evidência incompleta ou inválida, relatório não reproduzível, manifesto incoerente, assinatura que não verifica, `issuer_key_id` ausente do Manifesto de Chaves, âmbito declarado incompatível com o pedido, evidência fora da política de frescura, material revogado no BRL, ou indisponibilidade do material de confiança de produção (condições de produção detalhadas em §13).

Ninguém pode adicionar critérios privados, reinterpretar resultados aprovados, exigir acordos bilaterais, impor volumes mínimos, favorecer operadores específicos ou substituir os testes públicos por decisão subjectiva — não porque esteja proibido de o fazer, mas porque não existe ponto no caminho onde tal decisão pudesse ser tomada.

O protocolo permanece aberto porque as regras, os testes, os contratos e os critérios de conformidade são públicos, e porque a avaliação que os aplica corre em cada par e não numa autoridade.

### Manifesto de Operador

O manifesto do operador declara capacidades e âmbito de conformidade. Deve estar disponível em `/.well-known/banza/operator.json`.

```json
{
  "operator_id": "o-seu-operador-id",
  "protocol_version": "1.0",
  "certification_level": 2,
  "environment": "production",
  "capabilities": {
    "supports_wallets": true,
    "supports_qr": true,
    "supports_payment_requests": true,
    "supports_traces": true,
    "supports_settlement": true
  }
}
```

Manifesto de Operador L3 — campos adicionais obrigatórios ([INV-FEDEVAL-007](#invariantes-críticos)):

```json
{
  "operator_id": "o-seu-operador-id",
  "protocol_version": "1.0",
  "certification_level": 3,
  "environment": "production",
  "capabilities": {
    "supports_wallets": true,
    "supports_qr": true,
    "supports_payment_requests": true,
    "supports_traces": true,
    "supports_settlement": true,
    "supports_federation": true
  }
}
```

A declaração `supports_federation: true` é obrigatória para L3+. A sua ausência viola `INV-FEDEVAL-007` e bloqueia a participação na federação.

### Manutenção da Conformidade

- A evidência de conformidade perde frescura ao fim de 12 meses sem re-verificação (L0–L2)
- As actualizações de versão major do protocolo requerem nova evidência
- Verificações automáticas de invariantes: mensais
- Verificações de conformidade: trimestrais
- A evidência L3+ perde frescura ao fim de 90 dias (tem de ser republicada)

#### Frescura da Evidência

A frescura substitui, no modelo activo, o conceito de validade administrativa: a evidência não é revogada por ninguém quando envelhece — deixa simplesmente de satisfazer a política, e a Avaliação Aberta de Confiança falha fechada a partir desse momento (INV-FEDEVAL-006).

**Para L0–L2** (frescura anual):

1. Re-executar a validação de conformidade no BanzAI (aba **Conformidade**) para o âmbito actual
2. Se as capacidades declaradas e o âmbito não tiverem mudado, não é necessário actualizar o manifesto
3. Republicar a evidência e reassinar a metadata de protocolo com o novo hash e `signed_at`

**Para L3+** (frescura de 90 dias):

1. Re-executar a validação de conformidade de federação no BanzAI (aba **Federação**), contra o material de dry-run/fixtures
2. Republicar o relatório de conformidade actualizado na URL pública
3. Reassinar e republicar a metadata de protocolo antes de a evidência actual sair da política de frescura

A republicação não requer novo manifesto se as capacidades declaradas e o âmbito não tiverem mudado. Uma mudança de âmbito (por exemplo, de L2 para L3) requer nova evidência completa para o âmbito alvo. Nenhum destes passos envolve terceiros: o operador publica, os pares avaliam.

### BanzAI e Conformidade

O BanzAI pode guiá-lo ao longo da preparação da conformidade: analisar o seu manifesto, simular execuções de conformidade, identificar lacunas e gerar uma pontuação de prontidão. O BanzAI não avalia confiança nem produz evidência. A verificação de conformidade é o árbitro — testes determinísticos, não inferência de IA. Consulte [BanzAI](#11-banzai-agente-do-protocolo).

O BanzAI pode ajudar a interpretar e a rever manifestos, explicar falhas e orientar a preparação de evidência; não valida, não aprova e não decide. A confiança resulta da avaliação determinística dos artefactos pelos pares.

### Benefícios da Conformidade Verificável

**Para o operador:**
- Presença no Registo Público de Protocolo — visibilidade verificável, sem depender de ninguém para lá chegar
- Metadata assinada verificável por qualquer par — confiança sem intermediários
- A partir de L3: federação sem acordos bilaterais adicionais (em produção)
- Acesso à documentação e aos contratos canónicos do protocolo

**Para o ecossistema:**
- Cada operador conforme aumenta o alcance de todos os outros
- A conformidade aberta reduz barreiras técnicas à entrada — os critérios são públicos, determinísticos e auditáveis, e não há fila nem porteiro; a operação em produção continua sujeita às obrigações legais e regulatórias aplicáveis
- A verificabilidade determinística protege a integridade do protocolo
- O crescimento do número de operadores aumenta o valor da rede para todos os participantes

**Para reguladores e auditores:**
- A evidência publicada e a metadata assinada expõem as garantias financeiras do operador em formato máquina
- A verificação de conformidade é pública — qualquer auditor independente pode re-executá-la e obter o mesmo resultado
- Os invariantes financeiros são impostos pelo protocolo, não declarados pelo operador
- Não existe entidade intermediária cuja diligência seja preciso auditar: os artefactos falam por si

### Estado Actual da Conformidade

| Item | Estado |
|------|--------|
| Validação de conformidade no BanzAI (L0–L2) | Disponível |
| Validação de federação L3 no BanzAI (FED-CERT a FED-FAIL) | Disponível (dry-run/fixture) |
| Dry-run L0 público contra um endpoint de sandbox | Possível hoje |
| Engines Rust/WASM de conformidade (manutenção do protocolo) | Disponíveis |
| Metadata de protocolo de produção | Nenhuma publicada |
| Entradas no Registo Público de Protocolo | Nenhuma |
| Marcas condições de produção | Não concluídos |
| Material de confiança de produção | Não disponível |

Qualquer operador pode realizar a verificação de conformidade hoje contra a sua implementação e obter um relatório de evidência. A confiança de produção aguarda as condições de produção — hoje `/operators` devolve uma lista vazia.

### A Raiz de Confiança e as Chaves Delegadas

> **§7 vs §6 — distinção explícita**
>
> **§7** descreve o papel funcional da Trust Root e das chaves delegadas no modelo de conformidade: o que assinam, o que não podem fazer, e como se articulam com a auto-publicação dos operadores.
>
> A arquitectura institucional que governa a Trust Root — a sua custódia, fragmentação, separação face à governação, e os invariantes que limitam o âmbito delegado — está em [`docs/governance/BANZA_TRUST_ARCHITECTURE.md`](https://github.com/banza-protocol/banza/blob/main/docs/governance/BANZA_TRUST_ARCHITECTURE.md).

A Trust Root assina apenas o Manifesto de Chaves; as chaves delegadas assinam metadados do protocolo, releases e revogações. Ela não autoriza operadores, não emite licença e não autoriza pagamentos.

Esta é a diferença estrutural face a um modelo de autoridade certificadora: a cadeia BANZA ancora **artefactos do protocolo**, não **estatutos de participantes**. Nada na cadeia afirma que um operador é aceitável — a cadeia apenas garante que o material que o operador publica pode ser verificado como autêntico e actual. A afirmação sobre conformidade é do operador, sustentada pela evidência que qualquer parte reproduz; a cadeia só torna essa afirmação impossível de forjar.

**O que a cadeia de confiança assina**

| Artefacto | Assinado por | Descrição |
|---|---|---|
| Manifesto de Chaves | Trust Root | Lista de chaves delegadas activas; 24 meses |
| Metadata de protocolo e releases | Chave delegada de metadata | Versões, contratos e releases do protocolo; 184 dias |
| BANZA Revocation List (BRL) | Chave delegada de BRL | Material de confiança revogado; ciclo de 6 horas |
| Âncoras de evidência | Chave delegada de evidência | Ancoragem verificável de relatórios de conformidade; 184 dias |

**O que a cadeia de confiança não pode fazer**

| Proibição | Justificação |
|---|---|
| Autorizar, admitir ou aprovar um operador | Não existe função de admissão no protocolo — ADR-038 |
| Emitir qualquer artefacto de estatuto a favor de um operador | O operador auto-publica a sua própria metadata — ADR-039 |
| Recusar participação a operador com conformidade demonstrada | Não existe ponto no caminho onde tal recusa possa ocorrer |
| Alterar o protocolo, ADRs ou RFCs | Exclusivo da estrutura de governação do protocolo |
| Modificar a verificação de conformidade | Artefacto normativo do protocolo |
| Revogar sem fundamento objectivo e publicado | A revogação é um mecanismo de segurança, sujeito a evidência |
| Emitir licença financeira ou autorização regulatória | Fora do protocolo, sempre — pertence às autoridades competentes |
| Autorizar pagamentos ou movimentar fundos | O protocolo não está na trajectória do dinheiro |

**Artefactos e localizações canónicas**

| Artefacto | Publicação | Validade |
|---|---|---|
| Metadata de protocolo do operador | `/.well-known/banza/protocol-metadata.json` no domínio do operador | Frescura: 90 dias (L3+); 12 meses (L0–L2) |
| BANZA Revocation List (BRL) | `banza.network/federation/revocation-list.json` | Ciclo de 6 horas |
| Manifesto de Chaves | `banza.network/.well-known/banza/key-manifest.json` | 24 meses |
| Registo Público de Protocolo | `banza.network/operators` | Verificável publicamente; índice gerado por regras públicas e replicável |

### Contestação de Revogação

Não existe decisão de admissão a contestar: ninguém aprova nem recusa operadores, pelo que não há rejeição de que recorrer. O que existe e é contestável é uma **entrada no BRL** — porque a revogação é o único mecanismo do protocolo que retira, unilateralmente, aceitabilidade a material de confiança de um operador.

**Fundamento contestável** — O operador considera que a entrada no BRL não tem fundamento objectivo e verificável, ou que o fundamento invocado não corresponde à evidência publicada.

**Processo de contestação:**

1. O operador submete contestação formal à [Entidade de Governação BANZA] (parênteses retos indicam entidade ainda não formalmente constituída — ver [§10 Governação em Fase de Bootstrap](#governação-em-fase-de-bootstrap)), identificando a entrada contestada, os fundamentos e a evidência de suporte.
2. A [Entidade de Governação BANZA] revê a contestação contra os artefactos públicos: o fundamento publicado com a entrada e a evidência do operador.
3. A decisão de revisão é documentada e comunicada ao operador em [prazo a definir pela governação].
4. Se a contestação for procedente, a entrada é removida do BRL no ciclo de publicação seguinte e o Registo reindexado.
5. Se a contestação não for procedente, a fundamentação completa é publicada com a entrada.

Uma contestação não é um pedido de reconsideração discricionária: é um pedido de verificação de que o fundamento publicado corresponde à evidência. A contestação não altera o estado no BRL enquanto decorre — a rede continua a falhar fechada para esse material, que é o comportamento correcto perante confiança em dúvida.

A contestação diz respeito exclusivamente ao mecanismo de segurança do protocolo. Não é um recurso administrativo, não tem efeitos legais e não interfere com processos das autoridades competentes, que correm inteiramente fora do protocolo.

[Modelo de Contestação: `docs/governance/contestation-process.md` — a publicar antes de M6]

---

## 8. Operadores

### O que é um Operador

Um operador é qualquer entidade jurídica independente que implementa o protocolo BANZA para processar pagamentos — nos seus próprios sistemas, sob as suas próprias autorizações. No plano do protocolo, não está sujeito a aprovação, volumes mínimos ou acordos bilaterais: está sujeito à verificação de conformidade — os mesmos testes determinísticos e públicos para todos os participantes. Fora do protocolo, permanece sujeito a todas as obrigações legais e regulatórias da sua actividade e jurisdição, que são inteiramente suas: o operador é independente e responde pela sua actividade perante os seus clientes e as autoridades competentes. O primeiro operador a entrar em produção e qualquer operador futuro estão sujeitos exactamente às mesmas regras e às mesmas obrigações. O BANZA não é um operador — é a camada de regras que os operadores implementam.

![Níveis de Conformidade de Operadores BANZA — L0 a L4](/diagrams/protocol/banza-operators-v1.svg)

### Porque os Operadores Existem

O protocolo define as regras. Os operadores são as entidades que as executam no mundo real — que constroem carteiras, processam pagamentos, integram comerciantes e servem clientes. A separação entre estas duas camadas é deliberada: o protocolo nunca codifica a lógica de negócio de nenhum operador, e nenhum operador tem acesso privilegiado ao protocolo. Esta separação é o que permite que operadores com modelos de negócio completamente diferentes — focados em consumidores, em comerciantes, em sectores específicos — coexistam na mesma rede com as mesmas garantias financeiras.

A participação aberta é uma propriedade estrutural do modelo de confiança, não uma promessa: não existe entidade que possa fechá-la, porque não existe entidade que a conceda. O que ainda não está em vigor é a **produção**: a confiança de produção depende das condições de produção e de material de confiança de produção; e as autorizações legais aplicáveis à actividade do operador existem fora do protocolo e não são conferidas por nenhum artefacto BANZA. Hoje, nenhum operador publicou metadata de produção. O que o desenho garante é a igualdade: o critério é técnico e determinístico, e todo o operador conforme tem o mesmo acesso de rede e as mesmas obrigações. Não existe tal coisa como um operador privilegiado — nem um operador tolerado.

**Os operadores são o motor de crescimento do protocolo.** O BANZA não processa pagamentos — os operadores processam. Cada operador conforme transforma as regras do protocolo em valor real: carteiras emitidas, comerciantes integrados, pagamentos processados. O valor do protocolo cresce através da actividade dos operadores — não directamente, mas como resultado da utilidade colectiva que cada operador cria. Um protocolo com três operadores tem utilidade fundamentalmente diferente de um protocolo com trinta. A escala não é linear — é multiplicativa: cada novo operador amplia o alcance de todos os outros sem negociação adicional.

### Níveis de Operação

> Os níveis de conformidade L0–L4 estão completamente definidos — incluindo requisitos, testes e evidência — em [§7 Conformidade e Evidência](#7-conformidade-e-evidência). Esta secção descreve o perfil operacional de cada nível a partir da perspectiva do operador.

L0 e L1 constroem a fundação isolada: o operador existe, cumpre as verificações de conformidade, emite carteiras, aceita transferências. É a prova de que a implementação respeita os invariantes. Mas um operador L1 opera numa ilha — as suas carteiras não alcançam os utilizadores de outros operadores.

L2 muda o perfil de operação para tempo real. A liquidação T+0 significa que o dinheiro se move no momento da transacção, não no ciclo seguinte. Esta é a diferença entre um sistema de pagamento e um sistema de mensagens de pagamento. Para o comerciante, é a diferença entre receber hoje e reconciliar amanhã.

L3 é a mudança de ordem de grandeza. A conformidade de federação transforma a carteira do utilizador de um activo de operador num activo de rede. Um utilizador de um operador L3 pode pagar a um utilizador de qualquer outro operador L3 — sem acordo bilateral, sem integração adicional, sem negociação comercial. A metadata assinada e a evidência fresca são o passaporte dessa mobilidade — um passaporte que o operador emite a si próprio e que qualquer par verifica. É por isso que L3 representa a viagem do operador de produto de nicho para participante de rede.

L4 representa a capacidade de integração verificável com infraestruturas externas ao protocolo BANZA. É o nível em que o operador amplia a sua interoperabilidade para além da rede BANZA — participando em redes de cartões, sistemas nacionais de pagamentos ou outras infraestruturas de liquidação externas. A definição do nível não está acoplada a nenhuma tecnologia específica: o L4 evolui com as infraestruturas disponíveis.

**Requisitos adicionais de L3:** além das capacidades técnicas, o operador tem de publicar o manifesto, a metadata de protocolo assinada e a evidência, e implementar os endpoints de federação. Ver [§7 — L3 — Interoperabilidade entre Operadores — requisitos completos](#níveis-de-conformidade) para a lista completa e canónica.

### Estados de um Participante

Nem todos os participantes têm conformidade demonstrada em produção — e hoje nenhum tem. A escada de estados é explícita, e cada degrau confere apenas o que confere. Todos os degraus são atingidos por acção do próprio operador: nenhum é concedido.

| Estado | O que significa | O que confere | O que não confere |
|---|---|---|---|
| **Implementador** | Entidade que estuda ou implementa a especificação | Acesso integral aos artefactos públicos | Nenhum estatuto na rede |
| **Ambiente de sandbox** | Endpoint público de teste com manifesto e flags de segurança (`simulated: true`) | Base para executar a verificação de conformidade | Não é um operador; não entra no Registo |
| **Entidade com PASS** | Implementação que passou os vectores do âmbito alvo | Evidência técnica reproduzível por terceiros | Não sustenta federação enquanto não for publicada e assinada; não confere autorização legal |
| **Operador com metadata publicada** | Metadata assinada e evidência fresca, indexadas no Registo, fora do BRL | Avaliação favorável pelos pares; federação (L3+) | Não é licença financeira nem autorização regulatória |

**Estado actual:** o Registo Público de Protocolo devolve uma lista vazia — `/operators = []`. A participação em produção depende das condições de produção e da publicação de metadata de produção pelos próprios operadores.

### Como Tornar-se Operador

O caminho tem seis passos. Consulte [§7 Conformidade e Evidência](#7-conformidade-e-evidência) para o detalhe.

Em resumo:
1. Definir o âmbito alvo e criar o Manifesto de Operador
2. Implementar o runtime do operador e expor uma URL pública de sandbox (`/health`, `/.well-known/banza/operator.json`)
3. Validar a conformidade no BanzAI, contra a URL pública, para gerar um **relatório de evidência** (sem taxa)
4. Publicar a evidência numa URL pública estável no seu domínio
5. Assinar e publicar a metadata de protocolo em `/.well-known/banza/protocol-metadata.json`, referenciando a evidência pelo hash
6. Manter a evidência dentro da política de frescura — a indexação no Registo e a avaliação pelos pares são automáticas

Não há passo de candidatura, nem entidade a contactar, nem prazo de resposta pelo qual esperar. Passar a verificação de conformidade gera evidência; publicá-la e assiná-la é o que a torna utilizável pelos pares. Hoje nenhum operador publicou metadata de produção. O BanzAI pode ser consultado em qualquer etapa para orientação, análise do manifesto e identificação de lacunas — mas não avalia confiança nem decide.

### Responsabilidades do Operador

Ser um operador BANZA não é apenas implementar capacidades. Envolve obrigações de manutenção e conformidade contínua:

**Financeiras:**
- Respeitar todos os invariantes financeiros do protocolo (`INV-LEDGER-*`, `INV-WALLET-*`, `INV-STL-*`)
- Garantir que o livro-razão é apenas de adição e atómico — nenhum lançamento é alguma vez modificado
- Representar todos os valores monetários como unidades menores inteiras — nunca em vírgula flutuante

**De conformidade:**
- Re-verificação anual de conformidade (de 12 em 12 meses)
- Republicação de evidência de federação de 90 em 90 dias, para manter a frescura (L3+)
- Actualização de conformidade após versões major do protocolo

**Operacionais:**
- Manifesto de Operador actualizado em `/.well-known/banza/operator.json`
- Propagação de `trace_id` em todos os eventos — cada pagamento é reconstituível
- Verificação do BRL antes de aceitar pagamentos federados (L3+)
- Reconciliação contínua entre livro-razão, obrigações e posições de liquidação
- Disponibilidade dos serviços, gestão de incidentes e suporte aos seus clientes

**De segurança:**
- Gestão das suas próprias chaves criptográficas — o protocolo nunca as guarda nem as gera pelo operador
- Segurança operacional dos seus sistemas, dados e integrações
- Protecção de dados pessoais dos seus clientes, nos termos da legislação aplicável

**Legais e regulatórias (fora do protocolo, nunca dispensadas por ele):**
- KYC/KYB — identificação e verificação de clientes e comerciantes
- AML/CFT — prevenção de branqueamento de capitais e financiamento do terrorismo
- Licenciamento e autorizações exigidos pela legislação da sua jurisdição
- Relatórios e deveres de informação perante as autoridades competentes

A conformidade BANZA verifica o comportamento técnico face ao protocolo. Todas as obrigações desta última categoria existem fora do protocolo, pertencem ao operador — que é independente e responde por elas — e são supervisionadas pelas entidades competentes. Nenhum artefacto BANZA as substitui, e qualquer autorização necessária vem do regulador competente, nunca do BANZA.

### Incidentes e Saída (Offboarding)

Um operador reporta os incidentes de segurança e operacionais pelos canais aplicáveis à sua actividade e, quando afectem a confiança da rede, publica-os com a evidência correspondente. A saída da rede pode ocorrer por várias vias: **saída voluntária** (o operador deixa de publicar ou retira a sua metadata), **perda de frescura** da evidência sem republicação, ou **revogação** do material de confiança por motivo de segurança. Nos dois últimos casos o estado reflecte-se no Registo por reindexação e, quando aplicável, na Lista de Revogação (BRL); a Avaliação Aberta de Confiança passa a falhar fechada para esse operador, pelo que os pares deixam de o aceitar em federação em poucas horas.

A saída não extingue as obrigações do operador perante os seus clientes e as autoridades: a conservação de evidência, os deveres de reconciliação e a liquidação de obrigações pendentes permanecem com o operador, sob a legislação aplicável. O protocolo não detém fundos nem dados de clientes, pelo que a continuidade dessas responsabilidades é integralmente do operador. **Estado actual:** nenhum operador publicou metadata de produção (`/operators = []`), pelo que nenhum operador se encontra hoje em qualquer destes estados de saída.

### Registo Público de Protocolo

O Registo Público de Protocolo é um índice de metadata e evidência verificável. Não é uma lista de operadores licenciados, aprovados ou certificados pela BANZA.

O Registo indexa o que os operadores publicam nos seus próprios domínios. Não confere estatuto, não atesta qualidade e não representa nenhum juízo sobre nenhum participante: é um índice de descoberta cujo valor está em ser reproduzível — qualquer parte pode reconstruí-lo a partir das mesmas fontes públicas e obter o mesmo resultado.

**Finalidade**

O Registo cumpre três funções:
- **Descoberta:** qualquer parte encontra a metadata e a evidência de qualquer operador sem intermediários
- **Auditabilidade:** o historial é verificável e não modificável retroactivamente
- **Interoperabilidade:** operadores usam o Registo para descoberta, e avaliam sempre os artefactos originais no domínio do par

**Formato de entrada**

| Campo | Descrição |
|---|---|
| `operator_id` | Identificador único do operador |
| `name` | Nome declarado pelo operador no seu manifesto |
| `level` | Âmbito de conformidade demonstrado (L0–L4) |
| `status` | Estado derivado: `indexed`, `stale`, `revoked` |
| `metadata_url` | URL da metadata de protocolo assinada, no domínio do operador |
| `evidence_hash` | Hash do relatório de evidência referenciado pela metadata |
| `signed_at` | Momento da assinatura da metadata indexada |
| `evidence_generated_at` | Momento de geração da evidência — base do cálculo de frescura |
| `last_indexed` | Momento da última reindexação determinística |

**Estados**

| Estado | Significado | Pode federar? |
|---|---|---|
| `indexed` | Metadata verifica; evidência válida e dentro da política de frescura | Sim (L3+) |
| `stale` | Evidência fora da política de frescura, sem republicação | Não |
| `revoked` | Material de confiança presente no BRL | Não |

Os estados são **derivados**, não atribuídos: cada um é uma função dos artefactos publicados e do BRL, recalculável por qualquer parte a qualquer momento.

#### Avaliação Aberta de Confiança

Antes de qualquer encaminhamento federado, cada operador avalia o seu par. A avaliação é executada localmente, por máquina, e consiste exactamente nestas dez verificações:

1. **Manifesto de operador válido** — presente, bem formado e conforme ao schema publicado
2. **Versão de protocolo compatível** — a `protocol_version` declarada é interoperável com a do avaliador
3. **Metadata de protocolo assinada** — presente, canónica e com assinatura íntegra
4. **Evidência de conformidade presente e válida** — obtenível, reproduzível e com hash coincidente com o declarado
5. **Assinatura da Trust Root ou de chave delegada válida** — o `issuer_key_id` ancora no Manifesto de Chaves activo e a assinatura verifica
6. **Ausência do BRL** — nem o operador nem o seu material de confiança constam da Lista de Revogação actual
7. **Capacidades compatíveis** — as capacidades declaradas cobrem a operação pedida
8. **Contrato de endpoint compatível** — os endpoints exigidos pelo âmbito existem e respeitam o contrato
9. **Frescura da evidência dentro da política** — a evidência satisfaz a política de frescura aplicável ao âmbito (≤ 90 dias para L3+)
10. **Falha fechada** — material de confiança em falta, inválido, expirado, revogado ou incompatível impõe recusa do encaminhamento

![Avaliação Aberta de Confiança BANZA — dez verificações determinísticas sobre metadata assinada e evidência verificável, com falha fechada; sem autoridade central, sem aprovação humana](/diagrams/protocol/open-trust-evaluation-v1.svg)

As dez verificações são conjuntivas: qualquer falha recusa o encaminhamento. A avaliação é determinística — dois pares independentes, perante os mesmos artefactos, produzem sempre o mesmo veredicto — e nenhuma delas consulta uma autoridade, um estatuto concedido ou o juízo de uma pessoa. Cada verificação incide sobre um artefacto público que o próprio operador avaliado publicou.

> Para o detalhe criptográfico de cada verificação — incluindo a confirmação de que a Trust Root não participa no caminho operacional normal — ver a arquitectura institucional de confiança em [`docs/governance/BANZA_TRUST_ARCHITECTURE.md`](https://github.com/banza-protocol/banza/blob/main/docs/governance/BANZA_TRUST_ARCHITECTURE.md).

**Manutenção do Registo**

O Registo é um índice público verificável, gerado por regras públicas de indexação e replicável por qualquer parte. Ninguém adiciona nem remove operadores por decisão discricionária — não existe operação de adição ou remoção manual. Uma entrada existe porque o operador publicou metadata assinada que verifica contra o Manifesto de Chaves; deixa de estar `indexed` porque a evidência perdeu frescura ou porque o material consta do BRL. Cada entrada é verificável de forma independente por schema, hash e assinatura, a partir dos artefactos originais no domínio do operador.

Qualquer parte pode executar as regras de indexação sobre as mesmas fontes e obter o mesmo Registo. Uma réplica que divirja da publicação canónica está errada de forma demonstrável — e a canónica não tem autoridade especial: tem apenas a conveniência de estar num sítio conhecido.

O Registo é público e consultável em `banza.network/operators` sem autenticação. **Estado actual:** a rota devolve uma lista vazia (`[]`) — nenhum operador publicou metadata de produção. A entrada no Registo não constitui licença financeira nem autorização regulatória: indica exclusivamente que existe metadata e evidência verificáveis. A ausência do Registo também não significa nada em termos regulatórios: não é proibição, não é reprovação, e não impede nenhuma entidade de operar sob as autorizações que possua.

> Esta URL corresponde à publicação canónica de referência. O protocolo permite múltiplas réplicas federadas verificáveis por assinatura — ver a arquitectura institucional de confiança em `docs/governance/BANZA_TRUST_ARCHITECTURE.md`.

### Benefícios de ser Operador BANZA

**Para o operador:**
- Alcance da rede federada: em produção, desde L3, os clientes do operador poderão pagar comerciantes em qualquer outro operador conforme
- Sem acordos bilaterais e sem intermediários: a confiança é criptográfica, não contratual nem concedida
- Diferenciação institucional: a evidência de conformidade é verificável publicamente por qualquer parte
- Autonomia: a participação não depende da disponibilidade, do calendário ou da vontade de nenhuma entidade
- Acesso à verificação de conformidade, documentação canónica e implementações de referência disponíveis

**Para os clientes do operador:**
- Pagamentos para qualquer comerciante na rede BANZA, independentemente do operador onde está registado
- Rastreabilidade garantida pelo protocolo — não por promessa do operador
- Experiência consistente com a de qualquer outro operador BANZA

### O Papel dos Operadores no Crescimento da Rede

Os operadores não são apenas implementadores do protocolo — são os co-construtores do ecossistema. Cada implementação com evidência publicada é uma prova de que o protocolo é implementável. Cada pagamento federado é uma prova de que a interoperabilidade funciona. Cada comerciante integrado é uma prova de que o valor chegou ao mercado real. O protocolo cresce em credibilidade institucional com cada operador que o demonstra em produção.

A relação é recíproca: o protocolo protege os operadores da captura por incumbentes; os operadores tornam o protocolo real através da sua execução. Sem operadores, o BANZA é uma especificação. Com operadores, é infraestrutura activa. O valor económico da rede federada — o efeito de rede descrito em §9 — não existe em abstracto. Existe porque operadores o constroem, o mantêm e o expandem. Os operadores são, neste sentido, tanto beneficiários do protocolo como condição necessária da sua existência como infraestrutura.

### Efeito de Rede dos Operadores

Cada operador conforme que entra na rede BANZA aumenta o valor de todos os outros. O crescimento é multiplicativo: um novo operador não soma utilizadores — amplia o alcance de todos os participantes existentes. O valor acumulado pertence ao protocolo, não a nenhum operador singular. A concorrência deixa de acontecer pelo acesso à rede e passa a acontecer pelo produto — porque o acesso é igual para todos os que demonstram conformidade, e ninguém está em posição de o conceder a uns e negar a outros.

---

## 9. Federação

### Por Que a Federação Existe

Sem federação, cada operador é uma ilha.

Um cliente com carteira no Operador A pode pagar comerciantes no Operador A. Só isso. Um comerciante no Operador B está fora de alcance — a menos que o Operador A e o Operador B negociem um acordo bilateral, caso a caso, fora do protocolo.

Esta não é uma limitação técnica. É uma limitação de confiança. O Operador A não tem forma de saber, de forma verificável, que a implementação do Operador B é conforme e que o seu material de confiança é autêntico e actual. Sem confiança verificável, não existe encaminhamento seguro.

A federação resolve isso ao nível do protocolo — sem acordos bilaterais, sem intermediários, sem negociação e sem aprovação. A confiança é estabelecida pela Avaliação Aberta de Confiança sobre metadata assinada e evidência verificável. O encaminhamento segue os contratos do protocolo. A liquidação é executada pelos operadores segundo regras abertas — o BANZA não movimenta nem liquida fundos.

> **Nota sobre execução:** A federação ocorre entre operadores que implementam localmente o protocolo BANZA. O protocolo não executa pagamentos em nome dos operadores — define as regras pelas quais cada operador o faz. Ver §1 — Onde o BANZA Actua.

### Com Federação

![Federação BANZA — fluxo inter-operadores: confiança, encaminhamento, aceitação, obrigação, liquidação](/diagrams/protocol/banza-federation-v1.svg)

Quando houver operadores em produção, um cliente em qualquer operador poderá pagar um comerciante em qualquer operador conforme. As garantias do protocolo — atomicidade, rastreabilidade, invariantes financeiros — aplicam-se, por definição do protocolo, em toda a cadeia, incluindo a fronteira entre operadores. Cada novo operador que entrar na rede tornará todos os outros mais úteis. A federação de produção depende das condições de produção de federação.

### Como Funciona a Federação

No modelo definido pelo protocolo, a federação ocorre em cinco momentos distintos (descrição do comportamento especificado, não de uma rede de produção em funcionamento):

**1. Confiança**

Antes de qualquer pagamento, o Operador A executa a Avaliação Aberta de Confiança sobre o Operador B ([§8](#avaliação-aberta-de-confiança), ADR-040). Esta avaliação é criptográfica e local — não requer uma consulta em linha ao BANZA e não consulta nenhuma autoridade.

O Operador B publica e assina a sua própria metadata de protocolo, que afirma: "esta é a minha versão de protocolo, estas as minhas capacidades, estes os meus endpoints, e esta a evidência de conformidade que o demonstra." O Operador A verifica que a assinatura ancora no Manifesto de Chaves, que a evidência é válida e fresca, e que o material não consta do BRL. Nenhum terceiro atesta o Operador B ao Operador A — os artefactos bastam.

Em produção, a Lista de Revogação (BRL — Lista de Revogação BANZA) é publicada de seis em seis horas. O protocolo exige que, antes de encaminhar um pagamento, o Operador A verifique que o material de confiança do Operador B não está revogado.

A confiança é sempre bidirecional: o Operador B executa a mesma avaliação sobre o Operador A antes de aceitar um pedido de encaminhamento. Qualquer falha, de qualquer lado, recusa o encaminhamento.

**2. Encaminhamento**

O Operador A envia um pedido de encaminhamento ao Operador B, assinado com a sua chave privada:

```
"Quero encaminhar um pagamento de 5.000 AOA do Cliente A ao Comerciante B."
```

O pedido inclui o identificador único de transacção (`trace_id`) que será partilhado por todos os artefactos de pagamento em ambos os operadores.

**3. Aceitação e Execução**

Quando o Operador B aceita o pedido, o pagamento executa nesse momento exacto. Aceitação e execução são simultâneas — não são duas etapas separadas.

No instante em que o Operador B responde "aceite", a carteira do Comerciante B já foi creditada. O crédito ao beneficiário e a disponibilidade de fundos são da responsabilidade do Operador B; o BANZA não movimenta nem detém fundos.

**4. Obrigação**

O Operador A recebe a confirmação de aceitação e, atomicamente (numa única operação de base de dados), faz duas coisas:
- Debita a carteira do Cliente A
- Regista uma obrigação: "O Operador A deve 5.000 AOA ao Operador B"

A obrigação é assinada pelo Operador A. É irrevogável. O Operador A não pode depois negar que deve ao Operador B.

**5. Liquidação**

As obrigações acumulam-se ao longo de um ciclo de compensação (tipicamente 24 horas). No final do ciclo, ambos os operadores calculam independentemente a posição líquida:

| Direcção | Montante | Origem |
|---|---:|---|
| Operador A deve ao Operador B | 150.000 AOA | múltiplos pagamentos |
| Operador B deve ao Operador A | 40.000 AOA | pagamentos em sentido inverso |
| **Posição líquida** | **110.000 AOA** | **Operador A deve ao Operador B** |

Uma única transferência bancária liquida todos os pagamentos do ciclo. Não uma transferência por pagamento — uma por ciclo. A eficiência da liquidação escala com o volume.

A transferência é executada pelos operadores, nas vias bancárias e de liquidação competentes, fora do protocolo. O BANZA define as regras de cálculo, o formato das obrigações e os invariantes de reconciliação — não movimenta os fundos, não detém posições e não garante a solvência de nenhum participante.

### Exemplo Passo a Passo

**Situação:** A Ana tem uma carteira no Operador A. O Bento tem uma carteira no Operador B. A Ana quer pagar ao Bento 2.000 AOA.

1. **A Ana inicia o pagamento** na aplicação do Operador A.
   - O Operador A identifica que o Bento está no Operador B.
2. **O Operador A avalia o Operador B** (Avaliação Aberta de Confiança).
   - Metadata assinada verifica; evidência válida e fresca; material não revogado; capacidades e endpoints compatíveis.
   - As dez verificações passam — o encaminhamento pode prosseguir.
3. **O Operador A envia um pedido de encaminhamento assinado** ao Operador B:
   - *"Pedido `rr-abc`: pagar 2.000 AOA ao Bento (trace: `tr-xyz`)"*
4. **O Operador B avalia o Operador A** (confiança bidirecional — as mesmas dez verificações).
   - Identifica a carteira do Bento. Carteira activa.
   - Credita 2.000 AOA na carteira do Bento.
   - Responde: *"Aceite. ID de transferência: `itx-def`"*
5. **O Operador A recebe a confirmação** (operação atómica):
   - Debita 2.000 AOA da carteira da Ana.
   - Regista a obrigação: *"Operador A deve 2.000 AOA ao Operador B (`rr-abc`)"*
6. **Ambos os clientes são notificados.** O saldo do Bento aumenta 2.000 AOA; o da Ana diminui 2.000 AOA.
7. **No final do ciclo de 24 horas:**
   - Ambos os operadores calculam independentemente a posição líquida bilateral.
   - O Operador A executa uma única transferência bancária ao Operador B.
   - Todas as obrigações do ciclo são marcadas como liquidadas.

Ao longo de toda a cadeia, o mesmo `trace_id` (tr-xyz) aparece em cada artefacto: o pedido de encaminhamento, a resposta, a obrigação, os lançamentos do livro-razão em ambos os operadores, e todos os eventos emitidos. Qualquer auditor com acesso aos sistemas pode reconstituir o pagamento inter-operadores completo a partir do `trace_id` — em ambos os operadores — sem que nenhum operador precise de produzir relatórios adicionais. A informação está completa nos lançamentos imutáveis.

### Obrigações

Uma obrigação é o registo formal de que um operador deve dinheiro a outro.

Quando o Operador B aceita um pagamento de encaminhamento, assume um risco: creditou o comerciante mas ainda não recebeu os fundos. A obrigação do Operador A — assinada criptograficamente — é o compromisso de que o pagamento será liquidado.

As obrigações têm um ciclo de vida:

**pendente** → **em compensação** → **liquidada**

Uma obrigação não pode transitar de "liquidada" para "pendente". A imutabilidade é uma propriedade do protocolo, não uma propriedade de base de dados de nenhum operador individual.

O invariante fundamental: o montante na obrigação é sempre igual ao montante no pedido de encaminhamento. Nenhuma taxa, nenhum desconto, nenhum arredondamento é aplicado dentro do montante de transferência inter-operadores. As taxas são lançamentos separados no livro-razão.

### Compensação

A compensação é o processo pelo qual os operadores calculam e liquidam posições líquidas no final de cada ciclo.

Sem compensação, cada pagamento exigiria uma transferência bancária imediata. Com compensação bilateral, centenas de pagamentos em sentidos opostos colapsam numa única transferência.

Exemplo de ciclo de 24 horas entre o Operador A e o Operador B:

| Fluxo | Pagamentos | Montante bruto |
|---|---:|---:|
| Operador A → Operador B | 842 | 4.210.000 AOA |
| Operador B → Operador A | 318 | 1.590.000 AOA |
| **Posição líquida** | — | **2.620.000 AOA** |
| **Transferências bancárias pelos operadores** | — | **1** (não 1.160) |

A compensação é sempre bilateral e independente: cada operador calcula a posição líquida de forma autónoma. Ambos têm de chegar ao mesmo resultado antes de qualquer transferência ser executada. Se divergirem, a liquidação é suspensa até a discrepância ser identificada e resolvida.

### Por Que a Federação é Importante

**Para os comerciantes:** Um comerciante registado em qualquer operador pode receber pagamentos de clientes em qualquer outro operador. Sem múltiplas redes, sem múltiplos acordos. Uma carteira, alcance total da rede.

**Para os clientes:** Um cliente pode pagar qualquer comerciante em qualquer operador conforme usando apenas a aplicação do seu próprio operador. A fragmentação em que a Aplicação A só funciona com comerciantes que usam a Aplicação A acabou.

**Para os operadores:** Cada novo operador conforme que entra na rede BANZA torna todos os outros mais valiosos. Um operador com 100.000 clientes que entra numa rede com um parceiro de 500.000 clientes não adiciona apenas os seus próprios utilizadores — alarga o alcance de pagamento de todos os participantes. É o efeito de rede clássico das infraestruturas interoperáveis: o valor cresce com as ligações possíveis, não apenas com o número de participantes.

**Para os reguladores:** A federação é auditável por design. O `trace_id` de qualquer pagamento inter-operadores existe em ambos os operadores, em todos os artefactos: pedido de encaminhamento, obrigação, lançamentos no livro-razão, eventos. Um regulador com acesso aos sistemas pode reconstituir qualquer pagamento federado na totalidade — sem que nenhum operador precise de produzir relatórios adicionais. Os lançamentos imutáveis contêm já toda a informação.

**Para investidores e bancos:** O modelo de federação especifica como implementações operadas de forma independente poderão interoperar sob um único protocolo aberto, em vez de permanecerem redes isoladas — caso a federação de produção seja aberta através do processo de governação aplicável. O BANZA não movimenta fundos, não detém saldos e não executa liquidação. O valor de uma tal rede pertence ao protocolo — não a nenhum operador singular. Cada operador que entra aumenta o valor de todos os outros. Este modelo de crescimento é estruturalmente diferente do modelo proprietário, onde o valor é capturado pelo operador dominante.

### O Efeito Económico da Federação

A federação não é apenas uma funcionalidade técnica. É o mecanismo pelo qual o BANZA gera valor económico à escala — e é o que distingue uma rede de pagamentos de uma coleção de carteiras isoladas.

Com federação, o valor de cada carteira cresce com o tamanho de toda a rede combinada. Cada novo operador que entra aumenta o valor de todas as carteiras existentes — não apenas das do novo operador. O crescimento é multiplicativo: dez operadores federados valem significativamente mais do que dez vezes um operador isolado.

| Participante | Sem Federação | Com Federação |
|---|---|---|
| **Consumidor** | Paga apenas comerciantes do seu operador | Paga qualquer comerciante na rede conforme |
| **Comerciante** | Recebe apenas de clientes do seu operador | Recebe de qualquer consumidor federado |
| **Operador pequeno** | Rede limitada aos seus próprios clientes | Acesso à rede completa desde o primeiro dia |
| **Operador grande** | Vantagem de escala permanente | Vantagem de produto, não de acesso monopolizado |
| **Ecossistema** | Fragmentado — ilhas separadas | Unificado — rede de valor crescente e aberta |

Numa plataforma proprietária, o valor da rede pertence ao operador dominante. No BANZA, pertence ao protocolo — cada operador que entra beneficia todos os outros, sem negociação adicional.

### Limites da Federação

A federação é um estado controlado — não uma integração livre. Os seus limites são parte da definição:

- **Não está activa hoje.** Não existe federação de produção: nenhum operador publicou metadata de produção, e a federação de produção depende de material de confiança de produção (M3). O que existe hoje é a especificação completa e a verificação de interoperabilidade em ambiente de teste.
- **Interoperabilidade técnica não é federação de produção.** Duas implementações podem provar hoje, em sandbox e com material de confiança simulado, que interoperam segundo os contratos — isso é evidência técnica. A federação de produção exige, além disso, metadata de produção assinada e verificável, evidência dentro da política de frescura, ausência do BRL e a abertura das condições de produção.
- **Nenhum operador federa livremente.** A federação exige âmbito L3+ e permanece condicionada pela Avaliação Aberta de Confiança em cada encaminhamento — não é um estatuto adquirido, é uma avaliação repetida. A revogação remove o acesso de toda a rede em horas. Nada disto é aberto ou fechado por decisão humana: o controlo é criptográfico e determinístico.
- **O protocolo não garante liquidação financeira.** Define o cálculo das posições, as obrigações assinadas e os invariantes de reconciliação; a movimentação de fundos é executada pelos operadores nas vias competentes, e o risco de contraparte é gerido pelos operadores.
- **As responsabilidades não migram.** Compliance, disputas comerciais, relações contratuais com clientes e comerciantes, risco operacional e obrigações regulatórias continuam integralmente com os operadores e as entidades competentes. A federação substitui a negociação bilateral de *confiança técnica* — não substitui contratos comerciais, obrigações legais nem supervisão.

![Federação controlada — entre o Operador A e o Operador B (exemplos), o encaminhamento só é aceite se a Avaliação Aberta de Confiança passar (metadata assinada verificável, evidência válida e fresca, ausência da BRL, manifesto e capacidades compatíveis, marcas condições de produção), falhando fechado caso contrário; sem fluxo de fundos pelo BANZA; hoje /operators = [] e production_certificates = false](/diagrams/protocol/banza-controlled-federation-gate-v1.svg)

### Dois Usos do Termo "Federação"

O termo "federação" aparece com dois significados distintos no protocolo BANZA:

| Tipo | Descrição | Secção de referência |
|---|---|---|
| **Federação de Pagamentos** | O mecanismo pelo qual operadores conformes podem encaminhar pagamentos entre si sem acordos bilaterais — o tema desta secção | §9, §7 (L3) |
| **Federação de Infraestrutura** | O princípio pelo qual o Registo e o BRL são publicados por múltiplas réplicas independentes — qualquer réplica com assinatura válida é tão autoritativa quanto a canónica | `docs/governance/...` |

Os dois mecanismos são independentes. Qualquer parte pode alojar uma réplica do Registo (federação de infraestrutura) sem ter âmbito L3 (federação de pagamentos). A "federação" sem qualificação neste documento refere-se sempre à federação de pagamentos.

### Estado da Federação

A especificação de federação foi concluída e verificada em 2026 — a *especificação* não é uma promessa futura. O que permanece futuro é a federação de produção, que depende das condições de produção.

| Item | Estado |
|------|--------|
| Especificação de arquitectura (ADR-040) | CONCLUÍDO |
| Contratos de federação (5 esquemas) | CONCLUÍDO |
| Invariantes de federação (`INV-OTE-*`, `INV-FEDEVAL-*`, `INV-ROOT-*`, `INV-FED-*`) | CONCLUÍDO |
| Verificação de conformidade (conjunto de testes FED-CERT a FED-FAIL) | CONCLUÍDO |
| Verificação de interoperabilidade entre dois operadores (14/14 cenários) | CONCLUÍDO |
| M1 — Especificação v1.0 concluída | ALCANÇADO — 2026-06-01 |
| Primeiro operador de produção federado (M3) | Aguarda M2 |

A especificação da federação está pronta e verificada. A federação de produção ainda não existe — o caminho até ela é operacional e verificável: concluir a cerimónia da Trust Root (M2) e ter o primeiro operador a publicar metadata de produção assinada (M3). Até lá, nenhum pagamento federado de produção ocorre na rede BANZA.

---

## 10. Governança

### O que é a Governação BANZA

A governação BANZA é o processo pelo qual as regras do protocolo evoluem. Define como uma proposta passa de ideia a especificação oficial, quem pode propor, como as decisões são registadas e quem as pode contestar.

A governação é aberta: qualquer operador, programador ou participante do ecossistema pode propor alterações ao protocolo. Nenhum operador singular decide unilateralmente. As decisões são documentadas de forma imutável. Os assentos institucionais da Trust Root são definidos e geridos pela governação — ver §6.3 Assentos Institucionais.

A governação evolui as regras do protocolo. Não admite, aprova, autoriza nem certifica operadores — essa função não existe no protocolo (ADR-038).

![Processo de Governação BANZA — do RFC ao Protocolo Oficial](/diagrams/protocol/banza-governance-v1.svg)

### Porque a Governação Aberta Importa

Um protocolo financeiro sem governação formal não é um protocolo aberto — é um produto com documentação pública. A diferença é fundamental: num produto, as regras mudam quando o operador decide. Num protocolo com governação aberta, as regras mudam através de um processo documentado, verificável e acessível a todos os participantes.

A governação aberta importa por três razões:

**Para os operadores:** Previsibilidade. Um operador que implementa o BANZA hoje sabe que o protocolo não vai mudar unilateralmente amanhã. As regras evoluem através de um processo documentado — qualquer operador pode acompanhar, contribuir ou contestar uma proposta. Nenhuma surpresa arquitectónica é possível sem um ADR que a documente.

**Para reguladores e parceiros institucionais:** Auditabilidade. Cada decisão de arquitectura do BANZA tem um registo público que explica o contexto, a decisão e as consequências. Um regulador pode auditar não apenas o estado actual do protocolo, mas a história completa de como chegou lá — quais alternativas foram consideradas, porque foram rejeitadas, quem participou na discussão. Essa transparência histórica é o que distingue um protocolo de infraestrutura de um produto proprietário.

**Para o ecossistema:** Neutralidade. Nenhum operador pode capturar o protocolo para uso exclusivo. Uma proposta que beneficia desproporcionalmente um único operador é rejeitada — independentemente de quem a propõe. A neutralidade não é uma intenção declarada. É um resultado garantido pelo processo: um RFC só se torna ADR depois de discussão pública e avaliação de impacto nos invariantes financeiros.

**Para o investimento:** Previsibilidade é um activo económico. Um operador que constrói sobre o BANZA investe durante anos — em engenharia, em integrações, em relações comerciais. Regras que podem mudar sem processo criam risco de investimento real e exigem um prémio de risco para entrar no ecossistema; regras que só mudam por processo documentado, auditável e aberto reduzem esse prémio. A governação previsível não é apenas boa prática institucional — é uma condição económica para que alguém construa sobre o protocolo com horizonte longo.

### Porque a Governação Existe

Protocolos financeiros abertos precisam de um mecanismo de evolução que seja:
- **Previsível** — as regras não mudam sem um processo documentado
- **Auditável** — cada decisão tem um registo que explica o quê, o porquê e as consequências
- **Neutro** — nenhum operador pode impor alterações que beneficiem apenas a sua implementação
- **Conservador** — os invariantes financeiros são protegidos — propostas que os enfraqueçam são rejeitadas independentemente de quem as propõe

Sem governação formal, um protocolo financeiro aberto degenera em propriedade de facto do operador mais influente. A governação BANZA impede este colapso por design.

### Hierarquia Normativa BANZA

As regras do protocolo estão organizadas em cinco níveis. Cada nível é vinculativo para todos os níveis abaixo. Nenhum nível inferior pode contradizer um nível superior.

| Nível | Tipo | Autoridade |
|---|---|---|
| N1 | Princípios Fundamentais | Máxima — prevalece sobre tudo |
| N2 | Invariantes | Sobre N3, N4, N5 |
| N3 | ADRs — Registos de Decisão de Arquitectura | Sobre N4, N5 |
| N4 | RFCs — Pedidos de Comentários | Sobre N5 |
| N5 | Guias de Implementação | Orientação operacional |

**N1 — Princípios Fundamentais** estabelecem as propriedades invariantes do protocolo: correcção financeira não negociável, protocolo como produto, separação entre protocolo e política, rastreabilidade por defeito, acesso aberto, independência do protocolo. Os princípios prevalecem sobre todas as decisões técnicas e não podem ser revistos por nenhum outro mecanismo.

**N2 — Invariantes** são afirmações formais que o protocolo garante sem excepção: `INV-LEDGER-*`, `INV-WALLET-*`, `INV-STL-*`, `INV-OTE-*`, `INV-FEDEVAL-*`, `INV-FED-*`, `INV-ROOT-*`. Um invariante não pode ser violado por nenhuma ADR, RFC ou implementação. Qualquer proposta que contradiga um invariante requer um RFC que reveja o próprio invariante — e esse RFC só pode ser aceite se não contradizer os Princípios Fundamentais.

**N3 — ADRs** concretizam os princípios em decisões de arquitectura: o livro-razão de partidas dobradas (ADR-006), a idempotência obrigatória (ADR-011), o modelo de confiança aberto sem autoridade central, incluindo a trust root offline e as chaves delegadas (ADR-038), a auto-publicação e conformidade verificável por máquina (ADR-039), a avaliação de confiança de federação (ADR-040). As ADRs são imutáveis após aceitação. Uma ADR que contradiga um invariante é inválida por definição. Uma ADR pode ser substituída por outra posterior, com rasto explícito.

**N4 — RFCs** concretizam os ADRs em especificações operacionais: novos fluxos de pagamento, novos âmbitos de conformidade, novas moedas no registo, novos mecanismos criptográficos. Um RFC só pode ser aceite se não contradizer nenhuma ADR ou invariante vigente.

**N5 — Guias de Implementação** fornecem orientação operacional para operadores e programadores. Não estabelecem regras — concretizam as que já existem. Um guia que contradiga um RFC, ADR ou invariante é inválido.

Esta hierarquia é o que torna o protocolo auditável não apenas no presente, mas ao longo do tempo: qualquer alteração é verificável contra os níveis que lhe são superiores. Nenhuma decisão de N3 pode ser invocada para anular um princípio de N1. Esta propriedade é permanente — é o que distingue um protocolo de infraestrutura de um produto que pode ser alterado unilateralmente.

![Hierarquia normativa N1–N5 do Protocolo BANZA — cinco níveis, cada um vinculativo para os de baixo: N1 Princípios Fundamentais (autoridade máxima), N2 Invariantes, N3 ADRs, N4 RFCs, N5 Guias de Implementação; ADR/RFC não podem violar invariantes, a implementação local não redefine o protocolo, o BanzAI explica mas não decide, e a governação está em fase de bootstrap](/diagrams/protocol/banza-normative-hierarchy-n1-n5-v1.svg)

### RFCs — Pedidos de Comentários

Os RFCs governam as decisões do protocolo: invariantes financeiros, fluxos de pagamento, contratos de API, requisitos de operadores, modelos de federação.

**Um RFC é obrigatório para:**
- Alterações a invariantes financeiros (`INV-LEDGER-*`, `INV-WALLET-*`, `INV-STL-*`, etc.)
- Novos fluxos de pagamento ou alterações a fluxos existentes
- Novos âmbitos de conformidade (L5+)
- Novas moedas no registo oficial
- Alterações ao modelo de federação ou confiança

**Um RFC não é necessário para:**
- Documentação (não normativa)
- Exemplos de integração
- Ferramentas auxiliares que não alteram o protocolo

Os RFCs são propostos em `decisions/rfc/`, numerados sequencialmente, e discutidos publicamente. Após aceitação, são imutáveis — não existe processo de revisão retroactiva de um RFC aceite.

### ADRs — Registos de Decisão de Arquitectura

Os ADRs documentam decisões de arquitectura depois de tomadas: escolhas tecnológicas, fronteiras de serviço, arquitectura de SDK, nomenclatura do ecossistema.

**Cada ADR documenta:**
- O contexto da decisão — o que levou a esta escolha
- A decisão em si — o que foi decidido
- As consequências — implicações positivas e negativas

**ADRs fundadores do protocolo:**

| ADR | Decisão |
|-----|---------|
| ADR-006 | Livro-razão de partidas dobradas como base financeira |
| ADR-011 | Idempotência obrigatória e limitação de taxa |
| ADR-012 | Sistema de pagamento QR (estático e dinâmico) |
| ADR-010 | Modelo de identidade de conta/participante (com @handle) |
| ADR-001 | Protocolo financeiro aberto — independência de implementação |
| ADR-003 | Separação entre operadores e protocolo |
| ADR-002 | Hierarquia canónica BANZA/BanzAI/Operadores |
| ADR-038 | Modelo de confiança de protocolo aberto sem autoridade certificadora |
| ADR-039 | Auto-publicação do operador e conformidade verificável por máquina |
| ADR-040 | Avaliação de confiança de federação sem certificados |

Os ADRs são numerados sequencialmente e imutáveis após aceitação. Qualquer operador pode propor um ADR através do processo RFC.


### Como uma Regra se Torna Oficial

O processo começa com uma proposta aberta — qualquer participante pode propor um RFC. O que o distingue de um processo de governação nominal é o que acontece a seguir: a proposta é avaliada explicitamente pelo seu impacto nos invariantes financeiros e pelo seu efeito na neutralidade do ecossistema. Uma proposta que beneficia desproporcionalmente um único operador é rejeitada mesmo que seja tecnicamente correcta. O processo não testa apenas a coerência técnica — testa a neutralidade da mudança.

A rejeição documentada é tão importante quanto a aceitação. Um processo que só regista o que aceita deixa um rasto opaco: não há forma de saber que alternativas foram consideradas, que argumentos foram avançados, ou que invariantes seriam violados pela proposta rejeitada. O historial de ADRs não é apenas um registo de decisões — é o registo de todas as tentativas de mudança e das razões pelas quais algumas foram recusadas. É o que torna o protocolo auditável não apenas no presente, mas ao longo do tempo.

A imutabilidade dos ADRs após aceitação não é rigidez — é a base da confiança dos operadores. Um operador que implementa L3 contra ADR-007 precisa de saber que ADR-007 não vai ser silenciosamente alterado. Se uma regra mudar, muda através de um novo ADR, com número próprio, referências explícitas ao ADR que revoga, e o mesmo processo de avaliação pública. Nada muda sem rasto.

Qualquer alteração ao protocolo que não siga este processo não é uma alteração ao protocolo — é uma alteração privada de um operador. Esta distinção é operacional, não retórica: uma alteração fora do processo pode existir numa implementação, mas não pode ser invocada como parte das regras do BANZA. A verificação de conformidade não a reconhece. Nenhum outro operador é obrigado a seguir. É precisamente esta propriedade que protege o ecossistema de ser capturado pelo operador dominante.

### Nenhum Operador Singular Governa o BANZA

A neutralidade de operadores é um invariante arquitectónico:

- O BANZA não é propriedade de nenhum operador — nem do primeiro operador a entrar em produção, nem de qualquer implementação de referência
- Nenhum operador controla o enquadramento de conformidade
- Qualquer operador pode contribuir para o protocolo em igualdade de condições com qualquer outro
- A direcção de dependência é permanente: os operadores dependem do BANZA; o BANZA nunca depende dos operadores

Consulte [Arquitectura do Protocolo BANZA](#arquitectura-do-protocolo-banza) em §1 para a representação visual desta arquitectura.

### Supervisão da Operação de Assinatura

A operação de assinatura da cadeia de confiança — a custódia da Trust Root e o uso das chaves delegadas — é uma função operacional, não uma função de governação. A separação entre as duas é uma garantia institucional: quem opera as chaves não pode alterar as regras que definem o que essas chaves podem assinar.

**Hierarquia de responsabilidades**

| Nível | Responsável | Âmbito |
|---|---|---|
| Governação | [Entidade de Governação BANZA] | Define regras do protocolo, define o âmbito delegado, audita a operação de assinatura, processa contestações de revogação |
| Operação de assinatura | Custódios da Trust Root e chaves delegadas | Assina Manifesto de Chaves, metadata do protocolo, releases e BRL — dentro do âmbito delegado |
| Implementação | Operadores | Implementam o protocolo, publicam metadata e evidência, avaliam-se mutuamente |

A governação do BANZA (em fase de bootstrap — ver "Governação em Fase de Bootstrap", abaixo) supervisiona a operação de assinatura através de quatro mecanismos:

- **Definição de âmbito** — o que cada chave delegada pode assinar está definido no protocolo (ADR-038) e limitado por `INV-ROOT-008`; a operação não define o seu próprio âmbito
- **Fundamento das revogações** — toda a entrada no BRL exige fundamento objectivo e publicado; a governação processa contestações de entradas infundadas
- **Auditoria periódica** — [periodicidade a definir] a governação audita as práticas, os registos e os procedimentos de custódia e assinatura
- **Substituição** — a governação pode substituir os custódios sem alterar o protocolo ou a verificação de conformidade

Nenhum destes mecanismos toca na participação de operadores, porque a operação de assinatura não a controla: as chaves assinam artefactos do protocolo, nunca estatutos de participantes.

A impossibilidade de acumulação de funções é uma propriedade de design, não uma regra contratual: o âmbito delegado é público e não modificável pela operação, pelo que qualquer auditor independente pode verificar se as chaves assinaram apenas o que podiam assinar — sem depender de declarações de nenhuma das partes.

### Benefícios da Governação Aberta

**Para os operadores:** previsibilidade (regras mudam por processo documentado, não por decisão unilateral), participação (qualquer operador pode propor alterações) e protecção (nenhum operador captura o protocolo).

**Para reguladores e investidores:** cada decisão de arquitectura tem registo público com o raciocínio explícito. A lista de ADRs e RFCs é uma auditoria completa da evolução do protocolo — verificável por qualquer parte independente.

**Para o ecossistema:** os invariantes financeiros são protegidos por processo, não apenas por intenção. O protocolo cresce sem fragmentação.

### A Entidade de Governação BANZA

A Entidade de Governação BANZA é o órgão responsável pela governação de topo do protocolo.

| Função | Autoridade | Base documental |
|---|---|---|
| Supervisão da operação de assinatura | Define o âmbito delegado, audita práticas, pode substituir os custódios | ADR-038 |
| Processamento de contestações de revogação | Verificação de que o fundamento publicado corresponde à evidência | §7 Contestação de Revogação |
| Aprovação de ADRs e RFCs | Validação de alterações normativas ao protocolo | Hierarquia Normativa §10 |
| Aprovação de activações da Trust Root | Autorização de cerimónias de activação | §6.4, §6.10 |
| Nomeação de ocupantes de assentos | Designação de detentores institucionais de fragmentos da Trust Root | §6.3 |

A governação não tem — e não pode adquirir — autoridade sobre a participação de operadores: nenhuma das funções acima admite, aprova ou exclui um operador da rede.

**Estado actual:** A Entidade de Governação BANZA não está ainda formalmente constituída como entidade jurídica independente. Na fase actual (bootstrap), as funções de governação são desempenhadas pelos promotores do protocolo, com registo público de todas as decisões normativas através do processo ADR/RFC.

A constituição formal da Entidade de Governação BANZA é uma condição para a plena operacionalização do protocolo como infraestrutura independente de qualquer operador. O processo de constituição e o calendário esperado serão documentados antes do Lançamento Público (M6).

### Governação em Fase de Bootstrap

O protocolo BANZA nasce num estado de bootstrap: as regras que governam a governação são definidas pelos mesmos participantes que iniciam o protocolo. Esta circularidade é inevitável em qualquer protocolo fundacional — e é honesta declará-la explicitamente.

**Como foram aprovados os ADRs fundadores**

Os ADRs fundadores foram propostos, avaliados e aceites pelos promotores do protocolo antes da constituição de uma entidade de governação formal. Este processo segue o mesmo padrão de outros protocolos abertos fundacionais: as regras iniciais são estabelecidas pelos fundadores; a governação aberta é activada progressivamente. O registo completo de cada ADR — contexto, decisão e consequências — está disponível em `decisions/adr/`.

**Compromissos de transição**

| Compromisso | Prazo |
|---|---|
| Publicar o processo de constituição da Entidade de Governação | Antes de M6 (Lançamento Público) |
| Transferir funções de governação para entidade independente | Conforme calendário de constituição |
| Documentar os critérios de elegibilidade para os assentos institucionais | Antes da cerimónia da Trust Root (M2) |

Até à constituição formal da Entidade de Governação BANZA, os ADRs fundadores são mantidos pelos promotores do protocolo, com todos os registos de decisão disponíveis publicamente. Nenhum ADR pode ser alterado ou revogado sem o processo RFC documentado.

### Estado Actual da Governação

| Item | Estado |
|------|--------|
| Processo ADR/RFC | OPERACIONAL |
| ADRs fundadores | ACEITES E IMUTÁVEIS |
| Design do protocolo (M1) | CONGELADO — 2026-06-01 |
| Ambiente do protocolo | PRÉ-PRODUÇÃO — nenhuma metadata de produção publicada; confiança de produção dependente das condições de produção |
| Entidade de Governação formal | NÃO CONSTITUÍDA — funções em bootstrap pelos promotores, com registo público |
| Novos ADRs antes de produção | Não necessários |
| Novos contratos antes de produção | Não necessários |
| Conceitos futuros (sem número ADR) | Contrato de Manifesto de Chaves, multi-assinatura da raiz, Negociação de Versão |

O design do protocolo está congelado no M1. Qualquer operador pode implementar o BANZA correctamente hoje usando apenas este documento e a especificação pública. O trabalho activo é operacional (M2–M6), não de especificação.

### Versionamento do Protocolo

O protocolo BANZA utiliza versionamento institucional — o mesmo modelo adoptado por infraestruturas nacionais (Pix, UPI, Open Banking), normas abertas (W3C, IETF) e protocolos ISO.

**A versão do protocolo representa alterações às regras, invariantes, contratos ou requisitos normativos.** Correcções editoriais, actualizações gráficas, clarificações textuais ou melhorias de apresentação não constituem uma nova versão do protocolo.

#### Hierarquia de Artefactos

| Artefacto | O que representa | Regra de evolução |
|---|---|---|
| BANZA Protocol | Versão institucional do protocolo — regras, invariantes, contratos | Só muda com alteração normativa (ADR major ou RFC aprovado incompatível) |
| docs/reference/pt/completa.md | Edição documental — especificação canónica escrita | Evolui independentemente; correcções editoriais não alteram a versão do protocolo |
| SVGs | Artefactos gráficos — diagramas e visualizações | Versão própria (SVG-P-XXX vY.Z); não afecta a versão do protocolo |
| ADRs | Registos de decisão de arquitectura — decisões imutáveis | Revisão própria (ADR-XXX rev.N); não afecta a versão do protocolo |
| RFCs | Propostas de alteração — discussão pública antes de ADR | Numeração própria; só afectam a versão do protocolo após aprovação e implementação |

#### Hierarquia de Versões

| Camada | Artefacto | Relação com o protocolo |
|---|---|---|
| Protocolo | BANZA Protocol v1.0 | Autoridade normativa máxima |
| Documentação | docs/reference/pt/completa.md ed.2.0 | Versionaliza independentemente |
| Artefactos gráficos | SVG-P-XXX vY.Z | Versão própria por diagrama |
| Decisões de arquitectura | ADR-XXX rev.N, RFC-XXX | Só afectam a versão do protocolo após aprovação |

O protocolo permanece v1.0 mesmo que dezenas de SVGs, ADRs ou edições documentais sejam publicados. A versão do protocolo só avança quando as regras mudam.

#### Impacto na Versão

| Tipo de alteração | Impacto na versão do protocolo |
|---|---|
| Correcção tipográfica ou editorial | Nenhum |
| Actualização de SVG ou diagrama | Nenhum |
| Clarificação textual de regra existente | Nenhum |
| Novo ADR compatível com versão actual | Nenhum |
| Novo RFC aprovado — extensão compatível | Minor (v1.0 → v1.1) |
| Alteração normativa incompatível com versão anterior | Major (v1.0 → v2.0) |

---

### Origem, manutenção e governação aberta

O BANZA foi **criado originalmente pela BANZAMI - TECNOLOGIA E SERVIÇOS, LDA.**, que actua como **criadora original e mantenedora institucional inicial** do protocolo. Isto é atribuição de origem, não controlo privado permanente.

A **governação do protocolo é aberta hoje** e ocorre no repositório público GitHub, através de issues, pull requests, revisões de código, ADRs, RFCs, especificações e releases. Qualquer pessoa pode propor mudanças pelos processos públicos; uma mudança normativa só entra por artefactos públicos (ADR/RFC/spec/release). Os maintainers activos revêem e integram segundo esse processo — ver `GOVERNANCE.md` e `MAINTAINERS.md`.

O **BanzAI guia e explica; não cria regras** — novas regras entram apenas pela governação pública. Os **operadores não são aprovados nem certificados** por decisão central: implementam o protocolo de forma independente e publicam evidência verificável. E a **marca é separada da licença**: a licença open source (Apache-2.0) cobre o código e a documentação, mas não concede automaticamente direitos sobre os nomes ou logótipos BANZA, BanzAI ou Banzami (ver `TRADEMARKS.md`).

## 11. BanzAI — Agente do Protocolo

> **Capítulo canónico.** A arquitectura do BanzAI — interface humana primária e
> transversal, motor cognitivo não autoritativo, fronteira de autoridade, jornada
> de nove passos (ADR-067/068), síntese única do modelo local (ADR-055),
> verificação final obrigatória em Rust (ADR-073) e estado verificável em runtime
> (ADR-072) — é mantida como fonte única em
> **[Referência §12 — BanzAI](/referencia/banzai)**
> (`website/content/BANZA_REFERENCIA.md`, capítulo «12. BanzAI — Agente do
> Protocolo»). Este ficheiro é um espelho de documentação; consulte sempre o
> capítulo canónico para o conteúdo normativo. **O protocolo funciona sem o
> BanzAI:** as interfaces públicas — contratos, manifests, schemas, endpoints e
> rotas máquina — permanecem verificáveis de forma independente da interface
> humana.

---

## 12. Recursos para Programadores

O BANZA define regras públicas para interoperabilidade financeira. Não é um produto, uma plataforma ou um SDK. Qualquer entidade pode implementar o protocolo desde que respeite os contratos, invariantes e requisitos de conformidade definidos pela especificação.

Tudo o que é necessário para construir um operador cabe em cinco artefactos normativos:

1. **Especificação** — este documento e os documentos canónicos do protocolo
2. **Contratos** — as interfaces que um operador deve expor (`contracts/`)
3. **Esquemas** — os formatos de eventos, webhooks e payloads QR
4. **Invariantes** — o que tem de ser sempre verdade ([§4 Arquitectura do Protocolo](#4-arquitectura-do-protocolo))
5. **Testes de conformidade** — a prova determinística (`conformance/`), validável no BanzAI

Tudo o resto — SDKs, bibliotecas, implementações de referência, exemplos — é opcional. Nenhuma implementação é normativa. Nenhum SDK é exigido. A conformidade vem exclusivamente da especificação e dos testes.

![Fluxo do programador BANZA — sete passos da leitura da referência à evidência publicada: ler a referência, implementar os endpoints, proteger a implementação, executar a conformidade em sandbox, gerar evidência, corrigir falhas e publicar metadata assinada; PASS é evidência técnica, não autorização legal; a sandbox não movimenta dinheiro real; a produção depende das condições de produção](/diagrams/protocol/banza-developer-flow-v1.svg)

### O Que É Normativo

Em caso de divergência entre qualquer implementação e a especificação, prevalece, por esta ordem:

1. `docs/reference/pt/completa.md` — documento de referência do protocolo
2. ADRs aceites — decisões de arquitectura imutáveis
3. RFCs aplicáveis — especificações operacionais
4. Contratos e esquemas publicados em `contracts/`
5. Vectores de conformidade em `conformance/`

As implementações adaptam-se à especificação — nunca o contrário. Não existe SDK oficial, SDK recomendado, ambiente de execução BANZA nem servidor BANZA. O protocolo define; quem executa são os operadores.

### Contratos

Todos os contratos do protocolo estão publicados em `contracts/`:

| Área | Localização | Conteúdo |
|------|-------------|---------|
| OpenAPI | `contracts/openapi/` | reference-operator.yaml, transfers.yaml, wallet-onboarding.yaml, activity.yaml |
| Federação | `contracts/federation/` | federation-routing.json, federation-obligation.json, federation-event.json, federation-manifest.json, federation-trust.json, key-manifest.json, revocation-list.json |
| Eventos | `contracts/events/` | envelope.schema.json, types.json, webhook-types.json |
| Webhooks | `contracts/webhooks/` | envelope.schema.json, signature.json |
| QR | `contracts/qr/` | payload-format.json, lifecycle.json |

Nenhuma funcionalidade do protocolo existe apenas em prosa: tudo o que é implementável tem um artefacto correspondente em `contracts/`.

### Principais Endpoints por Nível

As interfaces que **um operador** deve expor em cada âmbito de conformidade. O protocolo define a forma destas interfaces; cada operador implementa-as na sua própria infraestrutura. A especificação completa está nos contratos OpenAPI em `contracts/openapi/`.

| Nível | Endpoint | Método | Finalidade |
|---|---|---|---|
| L1+ | `/wallets` | `POST` | Criar carteira de consumidor ou comerciante |
| L1+ | `/wallets/{id}` | `GET` | Consultar saldo e estado de carteira |
| L1+ | `/transfers` | `POST` | Transferência P2P entre carteiras |
| L1+ | `/qr/static` | `POST` | Gerar QR estático |
| L1+ | `/qr/static/{id}` | `GET` | Ler e resolver QR estático |
| L2+ | `/qr/dynamic` | `POST` | Gerar QR dinâmico (uso único, montante fixo) |
| L2+ | `/payment-requests` | `POST` | Criar link de pagamento |
| L2+ | `/payments` | `POST` | Superfície de contrato: submeter pagamento (finalidade T+0 como invariante; operador, não BANZA) |
| L3+ | `/federation/route` | `POST` | Aceitar pedido de encaminhamento de outro operador |
| L3+ | `/federation/obligations` | `GET` | Expor obrigações pendentes para reconciliação |

> Todos os endpoints exigem propagação de `trace_id` (INV-TRACE-*) e representação monetária em `*_minor` inteiros (MON-001). Os esquemas completos estão em `contracts/openapi/`.

### Invariantes

Os invariantes financeiros — `INV-LEDGER-*`, `INV-WALLET-*`, `INV-STL-*`, `INV-IDEM-*`, `INV-RECON-*`, `INV-QR-*`, `INV-TRACE-*` — são a parte do protocolo que nenhuma implementação pode negociar. Estão especificados em [§4 Arquitectura do Protocolo](#4-arquitectura-do-protocolo) e cada um é exercitado pelos testes de conformidade. Uma implementação que viole um invariante não é uma implementação BANZA, independentemente da tecnologia usada.

### Validar Conformidade no BanzAI

Para operadores, a validação de conformidade faz-se no **BanzAI**. Para validar compatibilidade protocolar, use o BanzAI. O BanzAI permite preparar o manifest, executar validações de conformidade, verificar metadata assinada do protocolo, avaliar revocation/fail-closed e gerar um evidence bundle. A implementação do operador é validada por artefactos verificáveis, não por uma ferramenta específica.

**O que o operador deve expor:** um endpoint público de sandbox com `GET /health` e `GET /.well-known/banza/operator.json` (L0, só de leitura) e os endpoints do âmbito alvo (L1/L2/L3). **L0 é só de leitura; L1 e superiores podem executar pedidos POST que alteram estado** (carteiras, transferências, pagamentos) — execute-os apenas contra ambientes de sandbox/conformidade seguros.

**Fluxo no BanzAI.** Abrir o [BanzAI](/banzai) → **Manifest** (validar) → **Conformidade** (correr validação para o âmbito alvo) → rever relatório → **Evidence Bundle** (gerar) → exportar/guardar.

> O BanzAI usa os engines Rust/WASM do protocolo no navegador. O resultado é determinístico e verificável, mas não é licença, certificação ou autorização.

**O relatório de evidência.** Campos principais: `tool`, `runner_version`, `operator_url`, `requested_level`, `certification_level_achieved` (nome de campo herdado do contrato v1.0 — representa o âmbito de conformidade atingido), `summary` (total/aprovados/falhados) e `statement` (`"This report is conformance evidence, not a production certificate."`). O relatório é reproduzível por terceiros a partir da URL pública e **não** prova prontidão legal, regulatória, de KYC/KYB ou bancária.

**Transparência para manutenção.** O protocolo mantém engines Rust/WASM, contratos (`contracts/`) e vectores de conformidade (`conformance/`), usados na manutenção e na evolução do protocolo. Não constituem um caminho de validação exigido ao operador — o caminho do operador é o BanzAI.

O resultado é binário: a implementação satisfaz os vectores ou não satisfaz. Não há revisão subjectiva de código, não há auditoria de arquitectura, não há preferência por linguagem ou framework. Um PASS gera **evidência técnica, não autorização legal** — e, para sustentar federação, essa evidência tem de ser publicada, assinada na metadata de protocolo e mantida dentro da política de frescura.

### Dependências Externas Obrigatórias

Uma implementação completa do protocolo BANZA requer os seguintes artefactos externos ao código do operador:

| Artefacto | Localização | Obrigatório para |
|---|---|---|
| Contratos OpenAPI | `contracts/openapi/` | L0+ (todos os níveis) |
| Contratos de federação | `contracts/federation/` | L3+ |
| Esquemas de eventos e webhooks | `contracts/events/`, `contracts/webhooks/` | L1+ |
| Vectores de conformidade | `conformance/` | Evidência em qualquer âmbito |
| Validação de conformidade | BanzAI (`/banzai`) | Produção de evidência |
| ADRs | `decisions/adr/` | Compreensão das decisões arquitecturais |
| Manifesto de Chaves activo | `banza.network/.well-known/banza/key-manifest.json` | Verificação de metadata assinada (L3+) |
| BRL actual | `banza.network/federation/revocation-list.json` | Federação (L3+) |
| Exemplos conceptuais | `examples/` | Opcional — ilustrativos, sem estatuto normativo |

A especificação completa do protocolo inclui os contratos e vectores de conformidade — não apenas este documento. Um operador que implemente o protocolo sem os contratos e vectores de conformidade está a implementar uma interpretação do protocolo, não o protocolo.

### Neutralidade quanto ao prestador externo

O BANZA é neutro quanto ao prestador externo. O protocolo define como uma integração externa deve ser declarada, verificada e auditada; não impõe a EMIS como prestador único. Um operador pode integrar-se com a EMIS, bancos parceiros, infraestrutura própria autorizada ou outros prestadores/vias externas aprovados, desde que cumpra os requisitos legais, regulatórios, bancários, KYC/KYB, AML/CFT e os perfis técnicos aplicáveis. O BNA deve ser tratado como autoridade regulatória/supervisora, não como prestador operacional equivalente. A Interoperabilidade Externa (L4) é definida por perfil — a EMIS é um possível perfil/prestador/via externa, não o único — e nenhuma integração externa de produção é afirmada nesta referência.

### Implementações e SDKs — Opcionais por Definição

O BANZA define especificações, contratos, esquemas, vectores de teste e mecanismos de conformidade. **A conformidade de uma implementação é determinada exclusivamente pela sua aderência à especificação e pelos testes de conformidade.** Nenhum SDK é requisito para implementação, conformidade ou operação.

O protocolo adopta o modelo dos protocolos abertos (HTTP, DNS, SMTP, OAuth 2.0): implementações livres. SDKs e bibliotecas cliente, quando existam, são mantidos por operadores, pela comunidade ou por terceiros — em repositórios próprios, fora do protocolo. A Governação BANZA define e evolui regras; não mantém implementações.

- O repositório do protocolo **não contém SDKs nem código de produto** — apenas especificações, contratos, vectores e exemplos conceptuais
- A ausência de um SDK numa linguagem específica não limita o protocolo nem bloqueia conformidade ou interoperabilidade
- Qualquer implementação que inclua avaliação de confiança deve fixar o Manifesto de Chaves e verificar `issuer_key_id` contra as chaves activas publicadas em `banza.network/.well-known/banza/key-manifest.json`

### Porque Construir sobre o BANZA

O BANZA é uma fundação: um conjunto de garantias financeiras verificáveis, contratos abertos e verificação de conformidade auditável que qualquer programador pode usar para construir um operador de produção — sem depender de acordos bilaterais, sem reinventar a representação monetária correcta, sem negociar o acesso à rede de liquidação.

Construir sobre o BANZA significa:

- **Interoperabilidade desde o primeiro dia:** um operador com âmbito L3 pode federar com qualquer outro operador L3+ sem trabalho adicional de integração
- **Garantias financeiras verificáveis:** os invariantes do protocolo estão definidos na especificação e são verificados pelo conjunto de testes de conformidade — o que tem de ser verdade está escrito, e a prova é determinística
- **Tempo de integração previsível:** a verificação de conformidade diz exactamente o que tem de passar; não há revisão final, nem surpresas nela
- **Liberdade de implementação:** qualquer linguagem, qualquer base de dados, qualquer ambiente de execução — o protocolo define comportamento, nunca a tecnologia
- **Documentação canónica:** ADRs, RFCs e contratos OpenAPI públicos — a referência é o protocolo, não uma API privada que pode mudar

A diferença entre construir sobre o BANZA e construir sobre uma plataforma proprietária é a diferença entre construir sobre um protocolo aberto e construir sobre as regras de outro operador. No primeiro caso, as regras são públicas, verificáveis e independentes de qualquer fornecedor. No segundo, estão sujeitas a alteração unilateral.

### Caminho para Produção

O percurso típico de um novo operador, desde o início até produção:

1. **Exploração**
   - Consultar `docs/reference/pt/completa.md` e o estado público do protocolo (`/estado` e as rotas máquina) — o âmbito alvo decide-se contra o estado verificável, não contra suposições
   - Decidir o âmbito alvo (L0–L3)
   - Usar o BanzAI para esclarecer dúvidas sobre requisitos
   - Simular a validação de conformidade no BanzAI (sem endpoints reais)
2. **Integração**
   - Implementar as capacidades usando qualquer linguagem e ferramentas de escolha
   - Opcionalmente partir dos exemplos conceptuais em `examples/`
   - Configurar o ambiente sandbox (L0)
   - Implementar capacidades por nível: L1 → L2 → L3
3. **Verificação (evidência)**
   - Validar a conformidade no BanzAI (aba **Conformidade**), contra o endpoint público de sandbox
   - Corrigir falhas identificadas (o BanzAI pode ajudar a interpretar erros)
   - Passar 100% dos testes para o âmbito alvo e guardar o relatório de evidência (Evidence Bundle)
4. **Publicação**
   - Preparar o manifesto de operador final
   - Publicar a evidência de conformidade numa URL pública estável
   - Assinar e publicar `/.well-known/banza/protocol-metadata.json`, referenciando a evidência pelo hash
5. **Produção (após reunidas as condições de produção)**
   - Reassinar a metadata com material ancorado no Manifesto de Chaves de produção
   - Manter a evidência dentro da política de frescura
   - Operador indexado no Registo Público de Protocolo por regras públicas; pares avaliam automaticamente

Para L3 (federação), a evidência usa o conjunto de testes de federação em dry-run/fixtures no BanzAI (aba **Federação**); a federação de produção depende de material de confiança de produção, do BRL e das condições de produção.

O BanzAI está disponível em cada etapa deste percurso para orientação e explicação — mas não avalia nem decide. **A participação não é concedida por ninguém: é demonstrada por conformidade verificável. Um PASS é evidência; publicá-la e assiná-la é o que a torna avaliável pelos pares. Hoje nenhum operador publicou metadata de produção.**

### Práticas Essenciais e Erros Comuns

A experiência de implementação de protocolos financeiros repete os mesmos acidentes. Esta lista existe para que não se repitam aqui:

- **Segredos nunca entram no Git.** Chaves privadas, tokens e credenciais vivem em gestão de segredos, fora do repositório — incluindo históricos e ficheiros de exemplo com valores reais.
- **As chaves são do operador e a gestão é sua.** O protocolo nunca guarda nem gera chaves por si. Rotação, custódia e revogação interna são responsabilidade da sua operação.
- **Logging sem dados sensíveis.** Registos e traces não devem conter credenciais, dados pessoais desnecessários nem material criptográfico. O `trace_id` existe precisamente para correlacionar sem expor conteúdo.
- **Observabilidade por `trace_id` desde o primeiro dia.** Se um pagamento não é reconstituível pelo `trace_id` nos seus registos, a implementação falhará auditoria e conformidade — instrumente antes de escalar.
- **Idempotência não é opcional.** A mesma chave de idempotência tem de devolver o mesmo resultado — incluindo em retries, timeouts e reinícios. Teste os caminhos de repetição, não apenas o caminho feliz.
- **Reconciliação contínua, não eventual.** Livro-razão, obrigações e posições devem reconciliar de forma contínua; uma divergência detectada tarde é um incidente financeiro, não um bug.
- **Sandbox não movimenta dinheiro real.** Os ambientes de teste e de conformidade operam com valores simulados (`simulated: true`, `production_allowed: false`). Nenhum endpoint de teste do protocolo move fundos reais.
- **Um PASS não publicado não serve para nada.** A evidência só é utilizável pelos pares depois de publicada, referenciada por hash na metadata assinada e mantida dentro da política de frescura.
- **A frescura expira em silêncio.** Ninguém avisa quando a evidência sai da política: a federação simplesmente passa a falhar fechada. Automatize a republicação antes do prazo, não depois.
- **Integração local não é federação.** Interoperar em sandbox com outra implementação é evidência técnica valiosa — a federação de produção exige metadata de produção assinada, evidência fresca, ausência do BRL e a abertura de M3.

### Arquitectura de Referência de um Operador BANZA

O protocolo não impõe uma arquitectura interna específica.

A estrutura abaixo representa uma arquitectura de referência típica para um operador BANZA. Implementações podem utilizar tecnologias diferentes desde que respeitem os contratos, invariantes e testes de conformidade.

![Arquitectura de Referência de um Operador BANZA — componentes típicos e artefactos do protocolo](/diagrams/protocol/banza-reference-operator-v1.svg)

O BANZA não exige a existência destes componentes com estes nomes. Exige apenas que a implementação forneça os comportamentos definidos pelo protocolo. Uma implementação pode fundir componentes ou distribuí-los por múltiplos serviços, desde que preserve os invariantes normativos.

### O Que um Operador Disponibiliza à Rede

Um operador participa na rede não através de uma ligação a um sistema central, mas através da publicação destes artefactos e da implementação destes comportamentos.

| Artefacto | Finalidade |
|---|---|
| **Manifesto de Operador** | Descoberta e capacidades declaradas |
| **Metadata de protocolo assinada** | Confiança — afirmação verificável de conformidade, assinada pelo operador |
| **Relatório de evidência publicado** | Conformidade — prova reproduzível por terceiros |
| **Endpoint Federation** | Encaminhamento de pagamentos inter-operadores |
| **Endpoint Obligations** | Liquidação — compensação bilateral |
| **Ledger auditável** | Conformidade — double-entry verificável |
| **Verificação BRL** | Segurança — recusa de material de confiança revogado |
| **Trace IDs** | Rastreabilidade — propagados em toda a cadeia |
| **Eventos** | Interoperabilidade — esquema de eventos do protocolo |

### Artefactos Publicados por um Operador

Lista única de todos os artefactos que um operador publica no seu domínio e na rede. Agrega informação distribuída por §6, §7 e §8.

| Artefacto | URL no domínio do operador | Obrigatório para | Secção canónica |
|---|---|---|---|
| Manifesto de Operador | `/.well-known/banza/operator.json` | L1+ | [§7 — Manifesto de Operador](#manifesto-de-operador) |
| Metadata de protocolo assinada | `/.well-known/banza/protocol-metadata.json` | L3+ | [§6 — Metadata de Protocolo Assinada](#metadata-de-protocolo-assinada) |
| Relatório de evidência | URL pública estável, referenciada pela metadata | L3+ | [§7 — Como Publicar Conformidade](#como-publicar-conformidade) |
| Endpoint de Encaminhamento | `POST /federation/route` | L3+ | [§7 — L3 requisitos completos](#níveis-de-conformidade) |
| Endpoint de Obrigações | `GET /federation/obligations` | L3+ | [§7 — L3 requisitos completos](#níveis-de-conformidade) |
| Endpoint de Saúde | `GET /health` | Conformidade | [§7 — O Que o Operador Deve Expor](#o-que-o-operador-deve-expor) |

**Publicado pelo protocolo** (não pelo operador, mas referenciado pelo operador):

| Artefacto | URL canónica | Finalidade | Secção canónica |
|---|---|---|---|
| Registo Público de Protocolo | `banza.network/operators` | Descoberta — índice verificável e replicável | [§8 — Registo Público de Protocolo](#registo-público-de-protocolo) |
| BRL — Lista de Revogação | `banza.network/federation/revocation-list.json` | Verificação de confiança antes de federar | [§6 — O BRL](#o-brl-lista-de-revogação-banza) |
| Manifesto de Chaves | `banza.network/.well-known/banza/key-manifest.json` | Verificação offline de metadata assinada | [§6 — O Manifesto de Chaves](#o-manifesto-de-chaves) |

---

## 13. Roteiro de Maturidade

![Roteiro M1–M6 do Protocolo BANZA — M1 (Especificação v1.0) concluído, M2 (Confiança em Produção) em curso, M3–M6 planeados; a produção depende de M2/M3; enquanto /operators = [] e production_certificates = false, o estado é pré-produção; sem datas prometidas](/diagrams/protocol/banza-roadmap-m1-m6-v1.svg)

### Concluído

| Marco | Alcançado | Evidência |
|-------|:---------:|---------|
| M1 — Especificação Completa (v1.0) | **2026-06-01** | conjunto de testes de federação e cenários de interoperabilidade verificados; o modelo de confiança e federação foi redesenhado em M2.3 (ADR-038/ADR-039/ADR-040) |
| M5 (parcial) — Estúdio de Validação | **2026-06-01** | Arquitectura de validação de três matrizes estabelecida |

### Activo

| Marco | Estado | Bloqueio |
|-------|--------|---------|
| **M2 — Confiança em Produção** | ACTIVO | Cerimónia da Trust Root agendada; endpoints do Manifesto de Chaves + BRL pendentes. OPS-001 é a primeira acção desbloqueada. |

### Planeado

| Marco | Bloqueado por | Descrição |
|-------|--------------|-----------|
| M3 — Primeiro Operador em Produção | M2 | Primeira metadata de protocolo de produção assinada e publicada por um operador; primeira entrada indexada em `/operators` |
| M4 — BanzAI Operacional | Nada (paralelo) | Motor cognitivo em produção; conhecimento do protocolo indexado e consultável |
| M5 — Estúdio de Validação Completo | GOV-001/002/003 | Actualizações de estado de RFC, precisão do roteiro, declaração de encerramento |
| M6 — Lançamento Público BANZA v1.0 | M2 + M3 + M5 | Anúncio público; operadores externos podem publicar conformidade L1–L3 |

### Versões Futuras

| Versão | Âmbito |
|--------|--------|
| **v1.1** | Verificação de conformidade L4 (integração com infraestruturas externas), Contrato de Manifesto de Chaves, multi-assinatura da raiz, modo de descoberta DNS (RFC-0005), Negociação de Versão de Protocolo |
| **v1.2** | RFC-0006 Suporte a Pagamentos Offline, registo multi-operadores |
| **v2.0** | Liquidação transfronteiriça (AOA ↔ outras moedas africanas), modelos de taxas avançados |

### Como Verificar o Estado do Roteiro

Cada marco tem evidência pública associada — e a transição de estado só é real quando essa evidência aparecer nas rotas públicas. O texto deste site descreve o roteiro; não o substitui.

| Marco | Evidência pública quando concluído |
|---|---|
| M1 — Especificação Completa | Especificação, contratos, vectores e ADRs publicados nos repositórios — verificável hoje |
| M2 — Confiança em Produção | Manifesto de Chaves e BRL de produção assinados, em directo em `/.well-known/banza/key-manifest.json` e `/federation/revocation-list.json` |
| M3 — Primeiro Operador em Produção | `/operators` deixa de devolver `[]`; metadata assinada do operador verificável no seu domínio; `production_certificates` passa a `true` em `/certificates` |
| M4 — BanzAI Operacional | Inferência local (Qwen, on-host) activa, com guardrails e orçamento documentados; sem chamadas externas |
| M5/M6 — Validação e Lançamento | Declarações de encerramento e anúncio público, com artefactos referenciados |

Enquanto as rotas públicas devolverem `/operators = []` e `production_certificates = false`, o estado é pré-produção — independentemente do que qualquer texto, incluindo este, possa sugerir. Nenhum marco tem data prometida: cada um abre quando a evidência o sustentar.

### Visão Estratégica

A especificação BANZA v1.0 está congelada. A federação está especificada, testada e verificada — a federação de produção depende de M3. A verificação de conformidade inclui um conjunto determinístico de testes e evidências por âmbito aplicável. A produção depende dos marcos M2/M3: cerimónia da Trust Root, primeiros operadores a publicar metadata de produção, lançamento público.

**O teste que importa**

O teste do sucesso não é quantos pagamentos foram processados. É uma pergunta mais simples: quando um novo operador decide entrar no mercado de pagamentos em Angola, a pergunta que coloca é "como implemento o BANZA e publico a minha conformidade?" — não "com quem nego acordos bilaterais?" e não "quem me tem de aprovar?"

Se a resposta for a primeira, o protocolo cumpriu o seu propósito. A visão detalhada de longo prazo está em §2.

---

## 14. Perguntas Frequentes

**O BANZA já está em produção?**

Não. O BANZA v1.0 é uma referência oficial de protocolo em pré-produção. A publicação de produção do Manifesto de Chaves, do BRL e da metadata dos operadores depende das condições de produção.

**Existe algum operador em produção?**

Não. Nenhum operador publicou metadata de protocolo de produção assinada com evidência verificável de conformidade. O Registo Público de Protocolo confirma-o: `/operators` devolve uma lista vazia.

**A federação está activa?**

Não. Não existe federação de produção — ela depende de material de confiança de produção, que ainda não existe. A especificação da federação está completa e verificada em ambiente de teste; a federação de produção depende das condições de produção.

**O BANZA detém fundos?**

Não. O protocolo nunca detém fundos, nunca guarda saldos e não tem qualquer componente na trajectória do dinheiro. Os fundos vivem nos sistemas dos operadores e nas vias de liquidação competentes, sob as autorizações de quem opera.

**O que significa `/operators = []`?**

Que o Registo Público de Protocolo está vazio: nenhum operador publicou metadata de produção. É a rota máquina — não texto de apresentação — que atesta este estado. Quando o primeiro operador publicar (M3), a mudança aparecerá primeiro aqui, por indexação automática.

**O que significa `production_certificates = false`?**

Que o material de confiança de produção ainda não existe: sem Trust Root de produção, nenhuma metadata de operador pode ser ancorada e verificada. A rota `/certificates` publica este estado de forma verificável — o nome da rota é herdado do contrato v1.0. Passa a `true` apenas quando as condições de produção abrirem a confiança de produção.

**O que ainda depende das condições de produção?**

Do M2 (cerimónia da Trust Root e confiança em produção): o Manifesto de Chaves e o BRL de produção. Do M3 (primeiros operadores em produção): a publicação de metadata de produção assinada, a indexação de operadores no Registo Público e a federação de produção. Até lá, o que existe é especificação completa, testes de conformidade disponíveis e evidência reproduzível.

**Como verificar o estado do protocolo?**

Pelas rotas públicas, sem confiar em texto: `/operators` (registo), `/certificates` (estado de emissão), `/federation/revocation-list.json` (BRL), `/.well-known/banza/root.json` e `/.well-known/banza/key-manifest.json` (manifestos), `/conformance/evidence` (evidência). A página `/estado` espelha estas rotas em formato legível.

**O BanzAI decide alguma coisa no protocolo?**

Não. O BanzAI explica o protocolo com fontes citadas — não decide, não avalia confiança e não produz evidência. As decisões normativas pertencem à governação (ADRs/RFCs); a conformidade vem dos testes determinísticos e a confiança da avaliação que cada par executa sobre os artefactos públicos. Hoje o BanzAI corre com inferência local (Qwen, on-host), sem chamadas a modelos externos.

**Como valido a conformidade sem clonar o repositório BANZA?**

Use o BanzAI. Ele valida o manifest, executa a validação de conformidade contra a URL pública do seu operador, avalia a metadata de protocolo assinada e a revogação/fail-closed, e gera um Evidence Bundle — tudo no navegador, com os engines Rust/WASM do protocolo. Não precisa de clonar nenhum repositório. [Abrir o BanzAI](/banzai).

**O que significa um PASS de conformidade?**

Significa evidência de conformidade técnica para o âmbito pedido. **Não** significa autorização legal, e por si só não sustenta federação: a evidência tem de ser publicada, referenciada na metadata assinada do operador e mantida dentro da política de frescura.

**O relatório chega para federar?**

Não por si só. O relatório é um artefacto de **evidência**, reproduzível por terceiros a partir da URL pública. Para sustentar federação, tem de estar publicado, referenciado por hash na metadata de protocolo assinada do operador, dentro da política de frescura, e o material não pode constar do BRL. A conformidade técnica também não substitui obrigações legais, regulatórias, de KYC/KYB ou bancárias.

**Como valido a compatibilidade protocolar como operador?**

Para validar compatibilidade protocolar, use o BanzAI. O BanzAI permite preparar o manifest, executar validações de conformidade, verificar metadata assinada do protocolo, avaliar revocation/fail-closed e gerar um evidence bundle. A implementação do operador é validada por artefactos verificáveis, não por uma ferramenta específica.

**Quando é que um operador passa a poder federar?**

Quando publica metadata de protocolo assinada que verifica contra o Manifesto de Chaves, com evidência de conformidade L3+ válida e dentro da política de frescura, e o seu material não consta do BRL — e quando o material de confiança de produção existir (ver [§13 Roteiro de Maturidade](#13-roteiro-de-maturidade)). Não há momento de aprovação porque não há aprovação: há uma avaliação determinística que passa a devolver resultado favorável assim que os artefactos existem. Hoje nenhum operador publicou metadata de produção.

**Se o BANZA é aberto, quem decide quem participa?**

Ninguém. Essa é a resposta literal, e é o ponto central do modelo (ADR-038). Não existe autoridade certificadora, entidade de admissão nem processo de aprovação: um operador implementa o protocolo, publica a sua evidência e assina a sua metadata; cada par avalia esse material com as mesmas dez verificações determinísticas e chega ao mesmo veredicto. A cadeia de confiança BANZA existe para tornar esses artefactos impossíveis de forjar — não para atestar participantes. Se houvesse alguém a decidir, haveria alguém a capturar.

**Isto é aprovação regulatória?**

Não. A conformidade técnica com o BANZA não substitui obrigações legais, regulatórias, bancárias, KYC/KYB, AML/CFT ou autorizações locais aplicáveis.

**O BANZA integra actualmente a EMIS, o BNA ou bancos?**

Não. Qualquer integração externa ou via de produção depende de acordos, perfis, aprovação e evidência específica. O protocolo define como as integrações podem ser verificadas; não afirma que já existem.

**BANZA depende obrigatoriamente da EMIS?**

Não. A EMIS pode ser um prestador/via externa possível no contexto angolano, mas o BANZA não a impõe como prestador único. O protocolo é neutro quanto ao prestador externo: operadores podem usar a EMIS, bancos parceiros, infraestrutura própria autorizada ou outros prestadores/vias externas aprovados, desde que a integração seja declarada, verificável, auditável e conforme aos requisitos legais, regulatórios e técnicos aplicáveis. O BNA é autoridade regulatória/supervisora, não prestador operacional.

**O BANZA é uma empresa?**

Não.

Uma empresa pode criar, manter ou promover implementações do protocolo.

Uma empresa pode alojar réplicas do Registo, do BRL e do Manifesto de Chaves.

Uma empresa pode ser um operador.

Mas o protocolo BANZA é um conjunto de especificações, contratos, invariantes e mecanismos de confiança independentes de qualquer entidade específica. Nenhuma empresa — incluindo qualquer uma que participe na governação em bootstrap — pode decidir quem participa na rede.

---

**O BANZA pertence ao Estado?**

Não.

O protocolo é aberto e pode ser implementado por qualquer entidade qualificada.

Autoridades públicas podem utilizá-lo, supervisioná-lo ou participar no ecossistema, mas as regras do protocolo permanecem públicas e verificáveis para todos.

---

**Quem é proprietário do BANZA?**

Nenhum operador é proprietário do protocolo.

O BANZA é um protocolo aberto composto por especificações, invariantes, contratos e processos de governação públicos.

Os operadores implementam o protocolo. Não o possuem.

---

**O protocolo BANZA requer um NDA?**

Não.

Toda a documentação necessária para implementar o protocolo é pública: Referência do Protocolo, ADRs, RFCs, Contratos, Esquemas e Verificação de Conformidade.

A implementação de um operador BANZA não depende de documentação confidencial nem de acordos de confidencialidade. Qualquer entidade pode estudar o protocolo, implementar as especificações e publicar evidência de conformidade utilizando apenas documentação pública.

Esta propriedade decorre directamente do princípio de Regras Públicas.

---

**Porque o BANZA foi concebido como protocolo aberto?**

Porque infraestruturas nacionais duradouras dependem de regras públicas, acesso previsível e interoperabilidade verificável.

O objectivo do protocolo é criar uma camada comum que sobreviva a operadores individuais, ciclos económicos e mudanças institucionais.

---

**Porque não criar apenas uma aplicação nacional de pagamentos?**

Porque aplicações e protocolos resolvem problemas diferentes.

Uma aplicação compete com outras aplicações. Um protocolo permite que todas as aplicações interoperem.

O BANZA foi concebido como infraestrutura comum, não como produto único.

---

**O BANZA substitui os bancos?**

Não.

Os bancos continuam a desempenhar as suas funções financeiras e regulatórias.

O BANZA define apenas a camada comum de interoperabilidade entre participantes conformes. O protocolo complementa o sistema financeiro existente. Não o substitui.

---

**O BANZA é um banco?**

Não. O BANZA é um protocolo — um conjunto de regras abertas. Não detém fundos, não tem licença bancária e não processa pagamentos. Os operadores implementam o protocolo e processam pagamentos em nome dos seus clientes.

---

**O BANZA processa pagamentos?**

Não. Os pagamentos são processados pelos operadores na sua própria infraestrutura. O BANZA define as regras que cada operador implementa localmente — não executa transacções directamente.

---

**O BANZA mantém contas de clientes?**

Não. As contas pertencem aos operadores. O BANZA define como as contas devem funcionar — os invariantes de saldo, as regras de débito e crédito, a rastreabilidade — mas não as mantém nem as detém.

---

**O BANZA é um switch central?**

Não. O protocolo define as regras; os operadores executam-nas. Não existe um servidor central BANZA pelo qual os pagamentos passem. A federação ocorre directamente entre operadores conformes, usando os contratos do protocolo e a metadata assinada que cada um publica.

---

**Posso implementar o BANZA sem utilizar software oficial?**

Sim. A conformidade depende apenas da especificação, dos contratos, dos esquemas e dos testes de conformidade — não da utilização de qualquer SDK ou biblioteca específica. Qualquer implementação que passe os testes de conformidade é uma implementação BANZA válida.

---

**Onde está o BANZA fisicamente?**

O BANZA não existe numa localização física única.

Não existe um servidor central BANZA responsável por executar pagamentos.

O protocolo existe nas implementações conformes dos operadores. Cada operador executa localmente os componentes necessários para cumprir a especificação.

O BANZA é um conjunto de regras partilhadas e verificáveis — não uma infraestrutura centralizada.

---

**Se o domínio banza.network desaparecer, o protocolo deixa de existir?**

Não.

O domínio canónico é apenas um ponto de publicação de referência.

A confiança do protocolo reside nas chaves, na metadata assinada, nos artefactos verificáveis e nas implementações conformes.

As réplicas federadas do Registo, do BRL e do Manifesto de Chaves podem continuar a operar desde que os artefactos permaneçam verificáveis criptograficamente.

O protocolo não depende da existência permanente de um domínio específico. Ver a arquitectura institucional de confiança em `docs/governance/BANZA_TRUST_ARCHITECTURE.md`.

---

**O BANZA pode continuar a existir se um operador desaparecer?**

Sim.

Esta é uma propriedade fundamental do protocolo.

A especificação, a verificação de conformidade, os contratos e o enquadramento de evidência existem independentemente de qualquer operador individual.

Se um operador desaparecer, os outros operadores continuam a operar normalmente.

---

**O que acontece se um operador não cumprir as regras?**

O protocolo prevê a revogação do material de confiança e a perda de frescura da evidência.

Um operador cuja implementação deixe de ser conforme perde a capacidade de federar: a evidência que sustenta a sua metadata deixa de corresponder ao comportamento real e, perante evidência verificável de violação de invariante, o seu material é revogado no BRL. Em qualquer dos casos, os pares recusam o encaminhamento.

Isto é um mecanismo de segurança do protocolo, não uma sanção: não afecta as autorizações do operador nem constitui juízo sobre a sua actividade. A confiança da rede depende da aplicação uniforme das mesmas regras a todos os participantes — aplicação que é feita por máquina, em cada par, e não por uma autoridade.

---

**O BANZA é apenas para Angola?**

O BANZA foi concebido para Angola — o seu contexto fundador é o panorama de pagamentos angolano e o Kwanza (AOA) é a moeda primária na especificação. O protocolo é aberto: qualquer entidade em todo o mundo pode implementá-lo. Não depende de nenhuma via de liquidação específica. Mas Angola é onde importa primeiro.

---

**Qualquer empresa pode tornar-se operador BANZA?**

Ao nível do protocolo, sim — e não há a quem pedir. O critério técnico é aberto: cumprir as verificações de conformidade para o âmbito alvo, publicar a evidência e assinar a metadata. O protocolo elimina dependências bilaterais, volumes mínimos e aprovações — mas isso não substitui decisões legais, regulatórias ou bancárias aplicáveis à operação financeira. Hoje, o que qualquer empresa pode fazer é implementar o protocolo e gerar evidência de conformidade; a confiança de produção depende das condições de produção — e as autorizações legais aplicáveis à actividade existem fora do protocolo e vêm do regulador competente.

---

**Porque a participação é aberta?**

Porque a interoperabilidade não deve depender de relações institucionais privadas — nem da decisão de um intermediário.

A conformidade existe para verificar comportamento técnico e operacional. Não para seleccionar participantes. E, no modelo activo, não existe nenhum ponto no protocolo onde uma selecção pudesse sequer ocorrer.

---

**Qual é a diferença entre o BANZA e o BanzAI?**

O BANZA é o protocolo. Define as regras e é proprietário da verificação de conformidade. Na cadeia de confiança BANZA, a Trust Root assina apenas o Manifesto de Chaves; as chaves delegadas assinam a metadata do protocolo, as releases e as revogações — e nada mais.

O BanzAI é o Agente do Protocolo. Ajuda os operadores a compreender as regras, os critérios de conformidade e os seus traces, e a preparar a evidência. O BanzAI explica; os testes decidem a conformidade; os pares avaliam a confiança.

---

**O BanzAI avalia operadores?**

Não. O BanzAI produz avaliações de prontidão, orientação e resultados de simulação — todos não normativos. A conformidade vem dos testes determinísticos; a confiança vem da avaliação que cada par executa sobre os artefactos públicos.

---

**O que é a federação?**

A federação é o mecanismo pelo qual operadores conformes podem encaminhar pagamentos entre si sem acordos bilaterais. Com evidência de conformidade L3+ publicada e metadata assinada verificável, um cliente no Operador A pode pagar um comerciante no Operador B — atravessando a fronteira entre operadores — usando apenas o protocolo BANZA. A confiança é criptográfica e avaliada a cada encaminhamento, o encaminhamento é definido pelo protocolo, a liquidação é gerida por compensação bilateral.

---

**Um operador L3 precisa de um acordo especial com o BANZA para federar?**

Não — e não existe acordo possível, porque não existe contraparte. A federação é uma consequência de ter conformidade L3 demonstrada e metadata assinada verificável. Não existe inscrição, adesão nem registo a pedir. Em produção (após reunidas as condições de produção), quaisquer dois operadores L3+ federam assim que a Avaliação Aberta de Confiança passar de ambos os lados.

---

**Quanto tempo demora a ficar apto a federar?**

Depende apenas do operador. A execução da verificação de conformidade demora minutos; publicar a evidência e assinar a metadata demora o tempo de um deploy. Não há prazo de revisão porque não há revisão — nenhuma parte do processo espera por terceiros. A evidência L3 tem de ser republicada a cada 90 dias para manter a frescura. A federação de produção depende das condições de produção.

---

**O BANZA obriga todos os operadores a utilizar a mesma arquitectura?**

Não.

O protocolo define comportamentos e contratos. Cada operador é livre de escolher a sua arquitectura, linguagem de programação, infraestrutura e fornecedores tecnológicos.

A única exigência é a conformidade verificável com a especificação: os contratos devem ser respeitados, os invariantes devem ser preservados e os testes de conformidade devem passar.

---

**Que nível deve um novo operador alvejar primeiro?**

Comece no L0 ou L1. O L0 estabelece que o seu ambiente sandbox está operacional. O L1 cobre carteiras centrais, QR estático e transferências P2P — a fundação de todos os âmbitos superiores. O L2 (liquidação T+0, QR dinâmico) é o alvo natural do primeiro ciclo completo de implementação.

---

**O que é o BRL?**

A Lista de Revogação BANZA — uma lista pública assinada do material de confiança que deixou de ser aceitável na rede, publicada de seis em seis horas em `banza.network/federation/revocation-list.json`. Antes de encaminhar qualquer pagamento federado, os operadores verificam que o destino não consta do BRL.

A Revocation List é um mecanismo de segurança e trust do protocolo. Não é licença, sanção regulatória ou autorização financeira.

---

**Como é que um operador verifica outro sem consultar o BANZA em linha?**

Usando o Manifesto de Chaves. A sua localização canónica especificada é `banza.network/.well-known/banza/key-manifest.json` (o Manifesto de produção é publicado após a cerimónia da Trust Root, M2). A fonte normativa é o Manifesto assinado; uma implementação pode fixá-lo (cache) para uso offline. A metadata de protocolo de um par é aceitável se: (1) o seu `issuer_key_id` aparecer no Manifesto de Chaves, (2) a sua assinatura verificar com a chave pública da chave delegada, (3) a evidência referenciada for válida e estiver dentro da política de frescura, e (4) o operador não constar do BRL actual. Nenhuma consulta em linha ao servidor BANZA é necessária no momento da avaliação.

---

**O que é a cerimónia da Trust Root?**

A cerimónia da Trust Root é o processo offline pelo qual a chave raiz do BANZA é gerada e armazenada. É realizada numa máquina isolada da rede, na presença de um Oficial de Cerimónia e de uma Testemunha independente, seguindo um procedimento documentado. A chave privada nunca toca numa máquina ligada à rede. A cerimónia estabelece a raiz de confiança para toda a cadeia de assinaturas BANZA. É um evento único — após o qual as chaves delegadas podem ser geradas e o Manifesto de Chaves publicado.

A Trust Root assina apenas o Manifesto de Chaves; as chaves delegadas assinam metadados do protocolo, releases e revogações. Ela não autoriza operadores, não emite licença e não autoriza pagamentos.

---

**Quem aprova os operadores BANZA?**

Ninguém. Não existe autoridade certificadora, entidade de admissão nem processo de aprovação no protocolo (ADR-038). BANZA é um protocolo financeiro aberto. A participação de operadores é demonstrada por conformidade protocolar verificável, não por aprovação humana central. Ver [§7 Conformidade e Evidência](#7-conformidade-e-evidência).

---

**Como verificar se um operador tem conformidade demonstrada?**

Executando a Avaliação Aberta de Confiança definida em [§8 Operadores](#avaliação-aberta-de-confiança) — as mesmas dez verificações que qualquer par executa:

- manifesto válido, versão de protocolo compatível, metadata assinada
- evidência de conformidade presente, válida e dentro da política de frescura
- assinatura verificável contra a Trust Root ou chave delegada activa
- ausência do BRL, capacidades e contrato de endpoint compatíveis
- falha fechada em qualquer outro caso

Se qualquer verificação falhar, o par recusa o encaminhamento. Não é preciso perguntar a ninguém: os artefactos são todos públicos e a avaliação é determinística. Ver §8 para o procedimento completo com URLs e condições detalhadas.

---

**Quem controla o Registo Público de Protocolo?**

Ninguém o controla no sentido de decidir quem lá está. O Registo Público de Protocolo é um índice de metadata e evidência verificável. Não é uma lista de operadores licenciados, aprovados ou certificados pela BANZA. É gerado por regras públicas de indexação sobre artefactos que os operadores publicam nos seus próprios domínios, e qualquer parte pode replicá-lo e obter o mesmo resultado. Ver "Registo Público de Protocolo" em §8.

---

**Quem pode revogar material de confiança?**

A revogação exige fundamento objectivo e verificável, publicado com a entrada. Pode ser iniciada por qualquer parte que apresente evidência de comprometimento ou de violação de invariante, e pela operação da Trust Root em caso de comprometimento de chave. O operador pode contestar uma entrada que considere infundada. A revogação é um mecanismo de segurança, não uma sanção. Ver "Contestação de Revogação" em §7 e "Processo de Revogação" em §6.

---

**O que acontece se as chaves delegadas forem comprometidas?**

A Trust Root está em custódia offline, independente da operação de assinatura. Se as chaves delegadas forem comprometidas, a Trust Root emite um novo Manifesto de Chaves com novas chaves delegadas; as chaves comprometidas entram no BRL e a metadata ancorada nelas deixa de verificar, até os operadores a reassinarem com material válido. A Trust Root permanece íntegra porque nunca toca em sistemas ligados à rede. Ver §6 — Infraestrutura de Confiança.

---

**Como contestar uma revogação?**

Um operador que considere uma entrada no BRL infundada pode submeter contestação formal à [Entidade de Governação BANZA], que verifica se o fundamento publicado corresponde à evidência. Não existe decisão de admissão a contestar, porque não existe admissão. Ver "Contestação de Revogação" em §7.

---

**Como reporto uma vulnerabilidade de segurança?**

Envie o relatório para `security@banza.network`. Não abra issues públicas para vulnerabilidades. O modelo de segurança e o âmbito estão descritos em [`docs/security/README.md`](https://github.com/banza-protocol/banza/blob/main/docs/security/README.md) no repositório canónico. Em pré-produção não há dados de clientes nem fundos no ambiente do protocolo; ainda assim, relatórios sobre a especificação, os contratos, a suite de conformidade ou a infraestrutura de confiança são bem-vindos por este canal.

---

**Como proponho uma alteração ao protocolo?**

As regras evoluem por processo, nunca por decisão unilateral. Uma alteração começa como RFC — ou ADR, para decisões de arquitectura — no repositório canónico, é discutida publicamente e avaliada quanto ao impacto nos invariantes e na neutralidade. Os Princípios Fundamentais (N1) e os Invariantes (N2) não podem ser quebrados por uma RFC: uma proposta que os contradiga exige rever o próprio invariante e não pode contradizer os princípios. Em fase de bootstrap, a revisão é conduzida pelos mantenedores do protocolo; a entidade formal de governação será constituída no processo de institucionalização. Ver [§10 — Governação](#10-governança).

---

**Quem mantém a especificação e o domínio canónico?**

Em fase de bootstrap, a especificação é mantida no repositório canónico público (`github.com/banza-protocol/banza`) e o domínio canónico é `banza.network`. A entidade formal de governação ainda não está constituída — as suas funções são desempenhadas pelos mantenedores do protocolo até à institucionalização. Nenhuma autoridade regulatória mantém a especificação: o BANZA é um protocolo aberto, não um regulador. Ver [§10 — Governação](#10-governança).

---

**Posso usar o BANZA internamente sem publicar conformidade de produção?**

Sim. Qualquer entidade pode estudar a especificação, implementar os contratos e correr a suite de conformidade numa sandbox interna, como referência técnica. Isso não a coloca na rede: não aparece em `/operators` enquanto não publicar metadata assinada, não é participação em federação de produção e não constitui autorização regulatória. Qualquer operação real perante utilizadores depende das responsabilidades e autorizações legais do operador e, quando as condições de produção abrirem, de metadata de produção assinada e evidência fresca.

---

**Como auditar uma implementação?**

A conformidade é verificável a partir de artefactos públicos: os contratos e esquemas OpenAPI, os invariantes, e a validação de conformidade no BanzAI (sobre os vectores em `conformance/`), que produz um relatório de evidência reproduzível a partir da URL pública do operador. Um auditor pode ainda inspeccionar os traces (`trace_id`), o manifesto e a metadata assinada do operador, e — quando existir federação — o estado nas rotas máquina (`/operators`, BRL, Manifesto de Chaves). Um auditor executa exactamente as mesmas verificações que qualquer par: não há caminho privilegiado, porque não há caminho privilegiado a conceder. Um PASS é evidência técnica reproduzível, não uma autorização nem uma auditoria legal ou regulatória.

---

**BanzAI pode criar novas regras do protocolo?**

Não. BanzAI pode ajudar a identificar lacunas e redigir propostas RFC/ADR, mas uma regra só se torna activa após governança, revisão, merge, release e publicação nas fontes oficiais do protocolo.

---

**O que acontece se o protocolo não tiver regra para um caso?**

BanzAI deve declarar que a regra não está definida. Pode sugerir uma proposta RFC/ADR, mas não pode inventar comportamento normativo.

---

**Uma sugestão do BanzAI vira regra?**

Não. Uma sugestão do BanzAI é apenas proposta. Só vira regra após processo formal de governança e publicação oficial.

---

**O BANZA é projecto da Banzami?**

O BANZA foi criado originalmente pela BANZAMI - TECNOLOGIA E SERVIÇOS, LDA. e é mantido como protocolo financeiro aberto através de governação pública no GitHub.

---

**A Banzami controla o protocolo?**

A Banzami é a criadora original e mantenedora institucional inicial. A governação do protocolo ocorre publicamente no repositório GitHub, através de issues, pull requests, ADRs, RFCs, specs, revisões e releases.

---

**Posso usar o código do BANZA?**

Sim, nos termos da licença open source do repositório (Apache License 2.0).

---

**Posso usar o nome ou logótipo BANZA?**

A licença open source não concede automaticamente direitos de marca. O uso dos nomes BANZA, BanzAI e Banzami deve respeitar a política de marcas (`TRADEMARKS.md`).

---

**Contribuir dá direito de usar a marca?**

Não. Participação na governação e contribuição técnica não concedem automaticamente direitos de uso de marca.

---

**Quem pode propor mudanças ao protocolo?**

Qualquer pessoa pode propor mudanças através dos processos públicos do repositório, como issues, PRs, ADRs e RFCs.

---

**BanzAI pode criar novas regras?**

Não. BanzAI guia e explica. Novas regras entram apenas por governação pública: proposta, revisão, merge, release e actualização da referência.

---

## Referências

**ADRs:**
- ADR-006 — Livro-razão de partidas dobradas
- ADR-011 — Idempotência e limitação de taxa
- ADR-012 — Sistema de pagamento QR
- ADR-010 — Modelo de identidade de conta/participante
- ADR-001 — Protocolo financeiro aberto
- ADR-003 — Separação de operadores
- ADR-002 — Nomenclatura do ecossistema (canónico)
- ADR-038 — Modelo de confiança de protocolo aberto sem autoridade certificadora
- ADR-039 — Auto-publicação do operador e conformidade verificável por máquina
- ADR-040 — Avaliação de confiança de federação sem certificados
- ADR-042 — PostgreSQL como base de estado protocolar (não livro-razão financeiro)
- ADR-043 — Licença, atribuição, marcas e governação aberta (Apache-2.0 + NOTICE + TRADEMARKS + GOVERNANCE)

**Documentos complementares:**
- `docs/governance/POSTGRESQL_PROTOCOL_STATE.md` — PostgreSQL como estado protocolar (fronteira de dados)
- `docs/governance/certification-boundary.md` — Âmbitos de conformidade, evidência, manutenção (autoritativo)
- `docs/guides/conformance.md` — Visão geral da verificação de conformidade
- `docs/governance/README.md` — Enquadramento de governação
- `decisions/adr/` — Todos os Registos de Decisão de Arquitectura
- `decisions/rfc/` — Todos os Pedidos de Comentários
- `spec/federation/` — Documentação de federação
