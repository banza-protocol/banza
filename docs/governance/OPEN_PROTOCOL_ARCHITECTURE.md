# Arquitetura do Protocolo Financeiro Aberto BANZA

Define as camadas do BANZA como protocolo financeiro aberto, onde a participação de operadores depende de regras públicas e evidência verificável, não de autorização humana central.

---

## Decisão arquitetural canónica

> "BANZA é um protocolo financeiro aberto. A participação de operadores no ecossistema não depende de uma autoridade humana central. Operadores independentes implementam o protocolo, publicam manifests e produzem evidência verificável de conformidade. A governação humana existe para manter e evoluir o protocolo, não para autorizar, certificar ou aceitar operadores."

**O BANZA não é uma rede permissionada por uma autoridade humana central. O BANZA é um protocolo financeiro aberto com regras públicas e evidência verificável.**

---

## Visão geral das camadas

```
  8  Operators                  ← entidades independentes, responsabilidade própria
  ────────────────────────────────────────────────────────────────
  7  Protocol Governance        ← mantém e evolui o protocolo
  6  Revocation Layer           ← sinal de segurança, fail-closed
  5  Trust Root                 ← assina metadados, releases, chaves, revogações
  4  Conformance Evidence       ← manifests, traços, hashes, assinaturas
  3  Conformance Automation     ← validadores, testes, relatórios máquina-verificáveis
  2  Reference Implementation   ← open source, engines Rust, WASM, CLI, Workbench
  1  BANZA Protocol            ← specs, RFCs, ADRs, schemas, OpenAPI, versionamento
```

A dependência é ascendente e permanente: as camadas 1–7 nunca dependem da camada 8. Nenhuma camada concede permissão a um operador para implementar o protocolo.

---

## 1 BANZA Protocol

**Propósito:** define as regras públicas — o que é correto — de forma independente de qualquer implementação.

| Artefacto | Descrição |
|---|---|
| Versioned Specifications | Especificações versionadas do protocolo, com semântica estável e histórico público |
| RFCs | Propostas abertas de evolução do protocolo, discutidas em público |
| ADRs | Decisões arquiteturais registadas, com contexto, alternativas e consequências |
| Schemas | Contratos de dados (JSON Schema) para payloads, eventos e manifests |
| OpenAPI | Contratos de interface para superfícies de protocolo |
| Invariantes financeiras | `INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`, `INV-IDEM-*`, `INV-RECON-*`, `INV-QR-*` |

### Versionamento e regras de compatibilidade

- Cada especificação declara uma versão explícita; nenhuma regra existe sem versão.
- **Compatível (minor):** adição de campos opcionais, novos estados terminais opcionais, novos vetores de conformidade que não invalidam implementações conformes existentes.
- **Incompatível (major):** remoção ou re-semantização de campos, alteração de invariantes, endurecimento de validação que rejeita payloads antes válidos.
- Nenhuma invariante financeira é enfraquecida por conveniência, em nenhuma versão.
- Versões major coexistem durante uma janela de transição pública; a deprecação é anunciada com antecedência e com caminho de migração descrito.
- Nenhuma funcionalidade existe apenas em prosa: toda a regra tem artefacto correspondente em `contracts/`.

---

## 2 Reference Implementation

**Propósito:** demonstrar que o protocolo é implementável, e servir de referência executável — não de autoridade.

| Componente | Descrição |
|---|---|
| Engines Rust | Implementações oficiais dos motores (conformidade, cripto/trust, verificação de invariantes, geração de evidence bundles) |
| Ferramentas WASM | Os mesmos motores compilados para execução no browser, sem servidor intermediário |
| CLI tools | Execução local e offline, incluindo operações sensíveis que nunca tocam a rede |
| Workbench | Superfície pública que corre os motores reais e mostra o resultado verificável |

**Propriedades:**

- Open source. Qualquer entidade pode ler, auditar, executar, forkar ou substituir a implementação de referência.
- Não é obrigatória. Um operador pode implementar o protocolo do zero, noutra linguagem, e continuar conforme.
- Não confere estatuto. Usar a implementação de referência não concede nada; produzir evidência verificável é o que conta.
- Neutralidade de tecnologia para operadores é permanente e ortogonal à escolha Rust-first das implementações oficiais do projeto (ADR-037).

---

## 3 Conformance Automation

**Propósito:** substituir o juízo humano por verificação determinística e reprodutível.

| Componente | Descrição |
|---|---|
| Validadores | Motores que avaliam manifests, payloads e traços contra as especificações versionadas |
| Testes de conformidade | Suite executável derivada diretamente das especificações |
| Fixtures / vetores | Casos canónicos de entrada e resultado esperado, versionados com o protocolo |
| Conformance reports | Saída estruturada e assinável do resultado da validação |
| Machine-verifiable status | Estado de conformidade derivado de execução, não de decisão |

**Regras:**

- O resultado é determinístico: a mesma entrada e a mesma versão do protocolo produzem sempre o mesmo estado.
- O resultado é reproduzível de forma independente. Qualquer terceiro pode reexecutar a validação sobre a evidência publicada e chegar ao mesmo estado.
- Nenhum passo do pipeline de conformidade aceita um override humano que transforme um resultado negativo em positivo.
- Um estado de conformidade descreve uma execução verificada. Não é uma permissão, uma admissão nem um estatuto concedido.

---

## 4 Conformance Evidence

**Propósito:** tornar a conformidade um facto público e reverificável, em vez de uma afirmação privada.

| Artefacto | Descrição |
|---|---|
| Operator Manifest | Documento assinado pelo operador que declara identidade técnica, versão do protocolo implementada, chaves públicas, superfícies e âmbito |
| Traces | Registos de execução das validações, ligados às versões de spec e de validador utilizadas |
| Reports | Relatórios de conformidade estruturados, produzidos pela camada 3 |
| Hashes | Digests criptográficos dos artefactos, das specs e dos vetores usados |
| Signatures | Assinaturas do operador sobre a sua própria evidência |
| Evidence Bundle | Agregado autocontido: manifest + traces + reports + hashes + assinaturas |

**Regras:**

- O operador publica a sua própria evidência. Ninguém publica evidência em nome de outro.
- O operador assina a sua própria evidência com as suas próprias chaves. A Trust Root não assina evidência de operadores.
- A evidência é verificável offline, por qualquer parte, sem contactar a BANZA nem pedir acesso.
- Evidência ausente, inválida, expirada ou não verificável significa simplesmente ausência de evidência — nunca uma decisão de rejeição sobre a entidade.

### Public Protocol Registry

Índice público, opcional e replicável, de manifests e evidence bundles publicados.

- É um **diretório descobrível**, não um livro de admissões.
- Não concede estatuto, não valida entidades, não decide quem entra.
- Listagem no registo não é aprovação; ausência do registo não é impedimento.
- Qualquer parte pode espelhar o registo integralmente e verificar cada entrada por si.

---

## 5 Trust Root

**Propósito:** ancorar criptograficamente a integridade e a proveniência dos artefactos do protocolo.

| Função | Descrição |
|---|---|
| Root metadata | Metadados raiz que declaram as chaves raiz válidas e o limiar de assinatura |
| Delegated Signing Keys | Chaves delegadas, com âmbito e validade limitados, para operações correntes |
| Release signing | Assinatura de releases do protocolo e da implementação de referência |
| Artifact signing | Assinatura de artefactos publicados (specs, schemas, vetores, motores) |
| Revocation signing | Assinatura de entradas da lista de revogação |
| Protocol metadata signing | Assinatura dos metadados que descrevem versões e compatibilidade |

**Propriedades:**

- A raiz é operada por limiar (threshold), offline, com custódia distribuída e procedimento de recuperação documentado.
- Material privado nunca existe em repositórios, artefactos publicados ou sistemas online.
- As chaves delegadas são de curta duração e de âmbito restrito; a rotação é rotina, não incidente.

### Limites permanentes da Trust Root

A Trust Root assina apenas o Manifesto de Chaves; as chaves delegadas assinam metadados do protocolo, releases e revogações. **Não faz mais nada.**

A Trust Root **não**:

- autoriza pagamentos;
- cria operadores;
- emite licenças;
- certifica operadores;
- movimenta fundos;
- concede ou nega acesso ao protocolo.

Assinar um artefacto responde a uma única pergunta: *este artefacto é genuíno e íntegro?* Nunca responde a *esta entidade pode participar?*.

---

## 6 Revocation Layer

**Propósito:** permitir resposta de segurança rápida sobre material criptográfico e artefactos comprometidos.

| Componente | Descrição |
|---|---|
| Revocation List | Lista assinada, versionada e publicamente distribuída de entradas revogadas |
| Revoked keys | Chaves comprometidas, perdidas ou substituídas |
| Revoked artifacts | Releases ou artefactos com defeito crítico ou integridade comprometida |
| Revoked operator keys | Chaves publicadas por um operador que deixaram de ser fiáveis |

### Regras fail-closed

- Na dúvida, bloquear. Lista de revogação indisponível, expirada ou não verificável ⇒ o material não é aceite.
- Cada entrada de revogação é assinada e datada; entradas não assinadas são ignoradas.
- A revogação é imediata na sua aplicação e permanente no seu registo público.
- A verificação de revogação é executada por quem verifica, localmente, sem depender de um serviço central em linha.

### A revogação é um sinal de segurança

**Revogação = mecanismo de segurança do protocolo. Não é sanção regulatória. Não é licença. Não é decisão sobre uma entidade.**

Revogar uma chave diz: *este material criptográfico deixou de ser fiável.* Não diz nada sobre a legitimidade, a licitude, a autorização ou a qualidade da entidade que o publicou. Uma entidade cuja chave foi revogada publica novo material e continua a operar — a revogação nunca é expulsão, porque não existe admissão.

---

## 7 Protocol Governance

**Propósito:** manter e evoluir o protocolo. Nada mais.

| Área | Descrição |
|---|---|
| Protocol Maintainers | Responsáveis pela manutenção das specs, dos motores e dos processos, em público |
| RFC Process | Processo aberto de proposta, discussão e aceitação de mudanças ao protocolo |
| Version lifecycle | Ciclo de vida das versões: proposta, ativa, em deprecação, retirada |
| Security response | Receção, triagem e divulgação coordenada de vulnerabilidades |
| Algorithm migration | Migração planeada de algoritmos criptográficos, com janelas de coexistência |
| Emergency patches | Correções urgentes com âmbito mínimo e justificação pública posterior |
| Succession | Continuidade de manutenção e de custódia raiz caso os mantenedores atuais cessem |

**Âmbito e limites:**

- A governação decide sobre **texto de protocolo, código de referência e material criptográfico do próprio protocolo**.
- A governação **não decide sobre entidades**. Não existe um passo de admissão, aprovação ou aceitação de operadores porque não existe nada que atribuir.
- O processo é público: propostas, discussões e decisões ficam em registo aberto e auditável.
- Qualquer parte pode propor um RFC. Nenhuma parte precisa de permissão para implementar a especificação resultante.
- **Succession:** o protocolo sobrevive aos seus mantenedores. Specs, motores, vetores e metadados são replicáveis integralmente; se a manutenção cessar, o protocolo permanece disponível e forkável.

---

## 8 Operators

**Propósito:** implementar o protocolo e operar serviços reais, como entidades independentes.

**Um operador:**

- é uma entidade **independente**, com governação, decisões e produto próprios;
- **implementa o protocolo** a partir das especificações públicas, com a tecnologia que escolher;
- **publica o seu manifest** e a sua evidência de conformidade, assinados por si;
- **assume integralmente a sua responsabilidade** legal, regulatória, financeira e operacional;
- quando aplicável, é autorizado pelas **entidades competentes** — nunca pela BANZA;
- **não precisa de permissão da BANZA** para implementar o protocolo aberto.

### O que a BANZA não faz por um operador

A BANZA não autoriza, não aceita, não admite, não avalia e não concede estatuto a operadores. Não existe pedido a submeter, fila de aprovação, nem entidade a contactar para começar. Ler a especificação e implementá-la é o processo completo.

A responsabilidade regulatória e financeira pertence ao operador. O enquadramento legal do operador, as suas licenças e as suas autorizações são obtidos junto das entidades competentes da sua jurisdição. A BANZA não é parte nessa relação, não intermedeia essa relação e não tem palavra sobre ela.

### Participação sem permissão

| Em vez de | O protocolo usa |
|---|---|
| Pedir autorização | Ler a especificação versionada |
| Ser avaliado por humanos | Executar a Conformance Automation |
| Receber um estatuto | Publicar Conformance Evidence assinada |
| Ser confiado por decreto | Ser verificado por qualquer parte, de forma independente |
| Ser removido por decisão | Ter material criptográfico revogado, por motivo de segurança |

---

## Invariantes desta arquitetura

1. As camadas 1–7 nunca dependem da camada 8.
2. Nenhuma camada concede permissão a uma entidade para implementar o protocolo.
3. A Trust Root assina artefactos; nunca decide sobre entidades.
4. A revogação é um sinal de segurança; nunca um ato regulatório.
5. A governação humana mantém o protocolo; nunca autoriza, certifica ou aceita operadores.
6. Toda a conformidade é verificável de forma independente, offline, por qualquer parte.
7. Nenhuma invariante financeira é enfraquecida por conveniência.

**O BANZA não é uma rede permissionada por uma autoridade humana central. O BANZA é um protocolo financeiro aberto com regras públicas e evidência verificável.**
