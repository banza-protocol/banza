# Governação do Protocolo Aberto BANZA

> Documento canónico de governação aberta do BANZA — como o protocolo é mantido e evoluído por humanos, e como a participação de operadores independentes é demonstrada por regras públicas e evidência verificável.

---

## Decisão arquitetural canónica

> "BANZA é um protocolo financeiro aberto. A participação de operadores no ecossistema não depende de uma autoridade humana central. Operadores independentes implementam o protocolo, publicam manifests e produzem evidência verificável de conformidade. A governação humana existe para manter e evoluir o protocolo, não para autorizar, certificar ou aceitar operadores."

Esta decisão é a base de tudo o que se segue. Nenhuma secção deste documento, nenhuma especificação e nenhum processo pode contradizê-la.

---

## Arquitetura de governação

| Camada | Nome (technical layer) | Função |
|---|---|---|
| Governação | Protocol Governance | Define como o protocolo evolui, de forma pública e auditável |
| Pessoas | Protocol Maintainers | Mantêm especificações, segurança, criptografia, tooling e documentação |
| Verificação | Conformance Automation | Executa regras públicas de conformidade sem intervenção humana discricionária |
| Prova | Conformance Evidence | Resultado verificável produzido pela automação |
| Declaração | Operator Manifest | Declaração pública e assinada de uma implementação independente |
| Confiança | Trust Root | Assina apenas o Manifesto de Chaves; as chaves delegadas assinam metadados do protocolo, releases e revogações |
| Operação | Delegated Signing Keys | Chaves operacionais derivadas da Trust Root, com âmbito limitado |
| Segurança | Revocation List | Mecanismo de segurança criptográfica do protocolo |
| Publicação | Public Protocol Registry | Índice público de manifests, evidência e metadados |
| Empacotamento | Evidence Bundle | Conjunto verificável de artefactos de conformidade |
| Evolução | RFC Process | Processo aberto de proposta e discussão de alterações |
| Estabilidade | Versioned Specifications | Especificações versionadas, públicas e imutáveis por versão |
| Orientação | BanzAI (agente nativo do protocolo) | Guia operadores, simula fluxos, invoca ferramentas verificáveis e explica resultados — não é autoridade nem fonte normativa |

---

## 1. Identidade

> "BANZA é um protocolo financeiro aberto."

O BANZA define regras financeiras — invariantes de ledger, carteira, liquidação, idempotência, reconciliação e QR — e publica-as como especificações abertas. É um protocolo: existe como regra, contrato e prova, e não como serviço prestado por alguém. Qualquer pessoa ou entidade pode ler o protocolo, implementá-lo, testá-lo e evoluí-lo através dos processos públicos. A identidade do BANZA é permanente e não depende de nenhuma implementação, marca ou entidade em particular.

---

## 2. Princípio de participação

> "A participação no ecossistema BANZA não depende de uma autoridade humana central. Uma implementação demonstra conformidade através de regras públicas, manifests, testes e evidência verificável."

Não existe porta de entrada, fila de espera ou decisão humana que separe quem participa de quem não participa. Uma implementação entra no ecossistema fazendo o trabalho: implementa as `Versioned Specifications`, publica um `Operator Manifest`, corre a `Conformance Automation` e publica a `Conformance Evidence` resultante. A conformidade é uma propriedade observável dos artefactos, não uma opinião emitida por alguém. Quem quiser verificar essa conformidade fá-lo por si próprio, a partir de material público, sem pedir autorização a ninguém.

---

## 3. Papel dos humanos

> "Humanos mantêm o protocolo vivo: especificações, versões, RFCs, segurança, bugs, criptografia, documentação, tooling e processos de emergência."

Os `Protocol Maintainers` existem e são essenciais. Escrevem e corrigem especificações, publicam versões, conduzem o `RFC Process`, respondem a vulnerabilidades, mantêm a criptografia e a `Trust Root`, corrigem bugs na `Conformance Automation`, escrevem documentação e mantêm ferramentas. Em emergência de segurança, executam os processos previstos — incluindo a publicação de entradas na `Revocation List`. Todo este trabalho é sobre o protocolo, nunca sobre quem o implementa.

---

## 4. O que humanos não fazem

> "Humanos não autorizam, certificam, aceitam ou aprovam operadores para fazer parte do protocolo."

Não existe aprovação, admissão, seleção nem juízo humano sobre implementações. Os `Protocol Maintainers` não têm poder para admitir nem para excluir uma implementação do ecossistema, nem para conferir estatuto a quem quer que seja. Não emitem estatutos, não avaliam candidaturas e não fazem juízos de mérito sobre implementações. Nenhum processo do protocolo exige essa decisão humana, e nenhum pode passar a exigi-la por conveniência.

---

## Agente nativo do protocolo — BanzAI (ADR-041)

> "BANZA é um protocolo financeiro aberto acompanhado por um agente IA nativo: BanzAI. BanzAI guia operadores, simula fluxos, invoca ferramentas verificáveis, explica resultados, ajuda a corrigir falhas e prepara evidência. BanzAI não aprova, não certifica, não licencia, não decide participação, não inventa regras, não adiciona decisões arquiteturais e não substitui a Referência BANZA nem os motores determinísticos Rust/WASM."

O BANZA é acompanhado por um agente IA nativo, o BanzAI, que existe como camada de orientação e orquestração sobre o protocolo. O BanzAI guia operadores ao longo do trabalho de conformidade, simula fluxos, invoca as ferramentas verificáveis (motores determinísticos Rust/WASM) por conta do operador, explica os resultados que esses motores produzem, ajuda a diagnosticar e corrigir falhas e apoia a preparação de evidência. Toda a autoridade normativa permanece fora do BanzAI: as regras ativas vêm da Referência BANZA, dos ADRs e RFCs aceites, das especificações, contratos, schemas, invariantes e releases. O BanzAI pode redigir rascunhos de propostas, mas não pode ativar regras — uma regra só passa a vigorar através do `RFC Process`, de um ADR aceite, de uma especificação versionada ou de um release. O BanzAI não é fonte normativa nem autoridade, não decide participação e não substitui a Referência nem os motores determinísticos que computam conformidade, trust, traces, simulação e estados de evidência.

### Quem faz o quê

| Camada | Faz | Não faz |
|---|---|---|
| Protocol Governance | Mantém specs, ADRs, RFCs, segurança e evolução; ativa novas regras apenas por processo formal | Não aprova, não certifica e não aceita operadores |
| BANZA Protocol Core | Define contratos, schemas, invariantes, metadados, registry, revogação e federação | Não emite juízos sobre implementações |
| Motores de verificação (Rust/WASM) | Computam de forma determinística conformidade, trust, traces, simulação e estados de evidência | Não decidem participação nem conferem estatuto |
| BanzAI (agente nativo) | Orienta, orquestra, simula, invoca ferramentas e explica; pode redigir rascunhos de propostas | Não ativa regras, não é autoridade nem fonte normativa, não adiciona decisões arquiteturais, não substitui a Referência nem os motores |
| Operadores | Implementam, corrigem, validam e publicam evidência; participam por auto-publicação | Não pedem autorização a uma autoridade central |
| Pares / Federação | Verificam a evidência publicada; interoperam por decisão local baseada em evidência | Não admitem centralmente outros operadores |
| Entidades competentes | Tratam de licença, autorização e enquadramento legal do operador quando aplicável | São exteriores ao protocolo — não fazem parte dele |

A introdução de novas regras é sempre um ato do protocolo, nunca do agente: nenhuma orientação, simulação ou explicação do BanzAI cria, define ou ativa regra. As regras entram exclusivamente por RFC, ADR, especificação ou release.

---

## 5. Operadores

> "Operadores independentes implementam o protocolo e são responsáveis pelo seu próprio enquadramento legal, regulatório, financeiro e operacional."

Cada implementação é independente e autónoma. O Operador A, o Operador B e o Operador C respondem, cada um, pelo seu próprio enquadramento: constituição legal, autorizações junto das entidades competentes quando aplicável, capital, controlo de risco, proteção de dados, continuidade de negócio e relação com os seus clientes. Quando é necessária autorização para prestar serviços financeiros, ela é concedida pelas entidades competentes — nunca pelo BANZA. O BANZA não presta serviços financeiros, não intermedeia fundos e não assume responsabilidade pela operação de terceiros.

---

## 6. Conformidade

> "Conformidade protocolar é demonstrada por testes, manifests, evidence bundles, assinaturas e artefactos verificáveis."

A conformidade demonstra-se, não se declara. Uma implementação corre os vetores públicos da suite de conformidade, publica o seu `Operator Manifest`, agrega os resultados num `Evidence Bundle` e assina-o. Qualquer terceiro pode reexecutar os mesmos testes sobre os mesmos artefactos e chegar à mesma conclusão de forma independente. A conformidade é sempre relativa a uma versão concreta das especificações, é verificável por qualquer parte e pode ser reavaliada a qualquer momento — não é um estatuto atribuído nem permanente.

---

## 7. Trust

> "A Trust Root assina metadados do protocolo, releases, chaves delegadas, revogações e artefactos de confiança do protocolo. Ela não autoriza operadores nem serviços financeiros."

O âmbito da `Trust Root` é criptográfico e estritamente delimitado. Assina metadados do protocolo, releases de especificações, `Delegated Signing Keys` e entradas da `Revocation List`, permitindo que qualquer parte verifique a autenticidade e integridade do material que diz vir do protocolo. A `Trust Root` não autoriza pagamentos, não cria operadores, não emite licenças, não confere estatuto a implementações e não movimenta fundos. A sua custódia é distribuída e o seu uso é offline e auditável. Uma assinatura da `Trust Root` prova origem e integridade de material do protocolo — nada mais.

---

## 8. Revogação

> "Revogação é mecanismo de segurança do protocolo, não sanção regulatória nem licença."

A `Revocation List` existe para responder a compromisso de material criptográfico: uma chave delegada exposta, um release corrompido, um artefacto de confiança comprometido. Revogar significa dizer publicamente que determinado material criptográfico deixou de ser fiável. Não é uma pena, não é uma decisão sobre conduta e não retira nem confere direitos a ninguém. Uma revogação nunca é uma sanção regulatória, nunca substitui a atuação das entidades competentes e nunca funciona como concessão ou retirada de licença.

---

## 9. Sobrevivência

> "O protocolo deve sobreviver à equipa fundadora através de especificações públicas, código aberto, testes de conformidade, RFCs, operadores independentes e governação transparente."

O critério de sucesso do BANZA é a sua independência de quem o criou. Especificações públicas e versionadas, implementações de referência abertas, uma suite de conformidade executável por qualquer pessoa, um `RFC Process` aberto, um `Public Protocol Registry` acessível e implementações independentes já em operação — este conjunto garante que o protocolo continua utilizável, verificável e evolutivo mesmo que a equipa fundadora desapareça. Se o desaparecimento de uma equipa pudesse parar o protocolo, o protocolo não seria aberto.

---

## 10. Estabilidade da decisão canónica

A decisão arquitetural canónica no topo deste documento vincula todas as especificações, contratos, motores, documentação pública e código do BANZA. Alterá-la exige um `RFC Process` público que a substitua explicitamente — proposto em aberto, discutido em público e registado, como qualquer outra alteração ao protocolo.

---

A governação do BANZA mantém o protocolo; não controla quem pode ou não implementar o protocolo.
