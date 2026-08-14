# BANZA — Papéis de Governação do Protocolo

> Define os papéis humanos que existem na governação do BANZA e o que cada um pode fazer. A lista é exaustiva: nenhum papel autoriza, certifica ou aceita operadores.

---

## Decisão arquitectural canónica

> "BANZA é um protocolo financeiro aberto. A participação de operadores no ecossistema não depende de uma autoridade humana central. Operadores independentes implementam o protocolo, publicam manifests e produzem evidência verificável de conformidade. A governação humana existe para manter e evoluir o protocolo, não para autorizar, certificar ou aceitar operadores."

Este documento é a aplicação directa dessa decisão à estrutura de papéis. Se um papel proposto não couber dentro de "manter e evoluir o protocolo", esse papel não existe no BANZA.

---

## 1. Princípio estrutural

A governação do BANZA actua **sobre a especificação**, nunca **sobre os operadores**.

| A governação humana actua sobre | A governação humana não actua sobre |
|---|---|
| Versioned Specifications — contratos, invariantes, esquemas | A entrada de um operador no ecossistema |
| RFC Process — propostas, revisão, decisão | O estatuto legal ou regulatório de um operador |
| Conformance Automation — o código que verifica conformidade | O resultado de uma verificação concreta de conformidade |
| Protocol Governance — releases, ADRs, política | A operação financeira de qualquer participante |
| Trust Root — metadados, releases, chaves delegadas, revogações | Pagamentos, fundos, licenças |

A separação é a seguinte: **os humanos definem a regra; a máquina aplica a regra; o operador produz a evidência.** Nenhum humano se coloca entre um operador e o protocolo.

### O caminho de participação, sem autoridade humana

Um operador independente participa assim:

1. Implementa a especificação publicada (Versioned Specifications).
2. Publica o seu **Operator Manifest** num endpoint sob o seu próprio controlo.
3. Executa a **Conformance Automation** e gera um **Evidence Bundle**.
4. A **Conformance Evidence** é verificável por qualquer terceiro, de forma independente e reprodutível.
5. O **Public Protocol Registry** reflecte o que é publicamente verificável — não uma decisão humana de admissão.

Em nenhum passo existe uma aprovação humana. O passo 4 é uma verificação, não um julgamento. O passo 5 é um espelho, não um portão.

---

## 2. Papéis permitidos

Estes são os papéis que existem na governação do BANZA. A lista é exaustiva: um papel que não conste aqui não existe.

### 2.1 Protocol Maintainer

Mantém a coerência técnica do protocolo. Revê e integra alterações a contratos, invariantes e artefactos normativos; garante que cada alteração respeita os invariantes financeiros (`INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`, `INV-IDEM-*`, `INV-RECON-*`, `INV-QR-*`) e a neutralidade face a operadores.

**Não faz:** não avalia operadores, não aprecia implementações concretas, não decide quem participa.

### 2.2 Security Maintainer

Responde por vulnerabilidades no protocolo e nos seus engines: recebe divulgações, coordena correcções, publica avisos de segurança e conduz revogações quando material criptográfico é comprometido.

**Não faz:** não sanciona operadores. Uma revogação executada por este papel é um mecanismo de segurança do protocolo — nunca uma sanção regulatória, nunca a retirada de uma licença (ver §4).

### 2.3 Specification Editor

Assegura que a especificação diz exactamente o que a governação decidiu: redacção normativa, precisão terminológica, consistência entre documentos e contratos, e conformidade com a política linguística do protocolo.

**Não faz:** não introduz regra nova por via editorial. Toda a norma nasce no RFC Process; a edição exprime-a, não a cria.

### 2.4 Release Steward

Conduz o ciclo de release das Versioned Specifications: versionamento semântico, congelamento de candidatos, changelog, reprodutibilidade do build e publicação da release assinada.

**Não faz:** publicar uma release torna a especificação disponível. Não activa, não habilita e não autoriza nenhum operador nem nenhum serviço financeiro.

### 2.5 Trust Root Custodian

Custodia o material criptográfico do **Trust Root** em condições offline, sob controlo repartido, e participa nas cerimónias em que o Trust Root assina.

O Trust Root assina **apenas o Manifesto de Chaves** (o artefacto que endossa as **Delegated Signing Keys**). São as chaves delegadas que assinam os artefactos dos respectivos domínios — metadados do protocolo, releases, evidência de conformidade e a **Revocation List** — nunca a raiz directamente (INV-ROOT-004; ADR-027).

O Trust Root **não** autoriza pagamentos, **não** cria operadores, **não** emite licenças, **não** atesta a idoneidade de operadores e **não** movimenta fundos. Uma assinatura do Trust Root é uma afirmação sobre *artefactos do protocolo* — nunca uma afirmação sobre *participantes*.

**Não faz:** um Custodian nunca assina isoladamente e nunca é ponto singular de decisão. O quórum é uma propriedade da cerimónia, não uma cortesia.

### 2.6 Conformance Tool Maintainer

Mantém a **Conformance Automation**: os vectores de teste, os verificadores e os geradores de **Evidence Bundle**. Garante que a verificação é determinística, reprodutível e executável por qualquer parte, incluindo terceiros sem qualquer relação com a governação.

**Não faz:** não emite juízos sobre operadores. Mantém a ferramenta que produz o resultado; não produz nem revê o resultado de nenhum operador. Se a ferramenta precisar de um humano para decidir, a ferramenta está errada.

### 2.7 Community Reviewer

Participa no RFC Process: comenta propostas, contesta desenho, identifica ambiguidade e representa o interesse de implementadores independentes. Aberto a qualquer parte — nenhum estatuto especial é exigido.

**Não faz:** a revisão comunitária informa a decisão sobre a especificação. Não confere e não retira participação a ninguém.

---

## 3. O que nenhum papel faz

Isto aplica-se a **todos** os papéis da §2, isoladamente ou em conjunto, e não é delegável, não é transferível e não é activável por decisão futura sem alterar a decisão arquitectural canónica.

Nenhum papel do BANZA:

- autoriza um operador a participar no ecossistema;
- certifica, aprova ou aceita um operador;
- emite qualquer atestado sobre a conformidade de um operador concreto;
- concede, recusa, suspende ou retira habilitação para prestar serviços financeiros;
- decide quem pode ou não implementar o protocolo;
- funciona como ponto de decisão humana entre um operador e o protocolo;
- movimenta fundos, processa transacções ou liquida valores.

**A conformidade é demonstrada, não concedida.** Um operador demonstra conformidade produzindo Conformance Evidence verificável. Ninguém lha atribui, porque ninguém a pode atribuir.

---

## 4. Operadores independentes e enquadramento regulatório

Os operadores são **independentes**. Não são delegados, agentes, filiais nem licenciados do BANZA.

- Cada operador assume integralmente o seu próprio enquadramento legal, regulatório e financeiro.
- Quando aplicável, cada operador é autorizado pelas **entidades competentes** da sua jurisdição — **nunca pelo BANZA**.
- O BANZA não emite habilitação para prestar serviços financeiros, não intermedeia relação com reguladores e não avalia o cumprimento regulatório de ninguém.
- Implementar o protocolo, publicar um Operator Manifest ou constar do Public Protocol Registry **não constitui** nem substitui qualquer habilitação regulatória, e não deve ser apresentado como tal.

**Sobre a Revocation List.** A revogação é um **mecanismo de segurança do protocolo**: retira confiança criptográfica a material comprometido, incorrecto ou expirado. Não é uma sanção regulatória, não é a retirada de uma licença e não constitui juízo sobre o operador. A revogação diz "esta chave já não é de confiança" — nunca "este operador não é de confiança". A distinção é estrutural, não semântica: a governação não tem, e não pode adquirir, poder sancionatório sobre participantes.

---

## 5. Enforcement

Estes limites são estruturais, não declarativos:

- A neutralidade face a operadores é verificada por `make identity-check` e pelo job de CI `identity-guard`.
- A fronteira regulatória é verificada por `tools/check-regulatory-claims.sh`.
- A ausência de material privado em artefactos do protocolo é verificada por `make private-key-leak-check`.

Um papel novo só existe depois de passar pelo RFC Process **e** de ser reconciliado com este documento. A introdução de qualquer papel com poder de autorizar, certificar ou aceitar operadores exige a alteração da decisão arquitectural canónica — que é precisamente o que essa decisão exclui.

---

## Referências

- [`docs/governance/BANZA_PROTOCOL_BOUNDARY.md`](BANZA_PROTOCOL_BOUNDARY.md) — fronteira do protocolo
- [`docs/governance/PROTOCOL_RELEASE_GOVERNANCE.md`](PROTOCOL_RELEASE_GOVERNANCE.md) — governação de releases
- [`docs/governance/BANZA_TRUST_ARCHITECTURE.md`](BANZA_TRUST_ARCHITECTURE.md) — arquitectura de confiança
- [`docs/governance/OPERATOR_MANIFEST_VALIDATION.md`](OPERATOR_MANIFEST_VALIDATION.md) — validação de Operator Manifest
- [`docs/governance/EVIDENCE_BUNDLE.md`](EVIDENCE_BUNDLE.md) — Evidence Bundle
- [`docs/governance/BANZA_REGULATORY_POSITIONING.md`](BANZA_REGULATORY_POSITIONING.md) — posicionamento regulatório
- [`docs/governance/OPERATOR_NEUTRALITY_TERMINOLOGY.md`](OPERATOR_NEUTRALITY_TERMINOLOGY.md) — terminologia neutra
