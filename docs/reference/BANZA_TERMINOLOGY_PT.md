# BANZA — Terminologia Oficial em Português

**Document ID:** BANZA-TERMINOLOGY-PT-001  
**Data:** 2026-06-01  
**Estado:** Oficial  
**Autoridade:** BANZA-LANGUAGE-POLICY-001

---

## Princípio

Esta é a terminologia oficial e congelada do BANZA em português. Toda a documentação, comunicação pública e website do BANZA em português deve usar estes termos de forma consistente.

Termos não constantes desta lista devem ser submetidos a revisão antes de serem usados em documentação oficial.

BANZA é um protocolo financeiro aberto. A participação de operadores é demonstrada por conformidade protocolar verificável, não por aprovação humana central. A terminologia abaixo reflecte este modelo.

---

## Tabela de Terminologia

### Termos do Protocolo

| Inglês | Português Canónico | Notas |
|--------|-------------------|-------|
| Protocol | Protocolo | |
| Open Financial Protocol | Protocolo Financeiro Aberto | Enquadramento canónico do BANZA |
| Federation | Federação | |
| Trust | Confiança | No contexto "Trust Architecture" → "Arquitectura de Confiança" |
| Open Trust Evaluation | Avaliação Aberta de Confiança | As dez verificações do ADR-025 |
| Conformance Level | Nível de Conformidade | |
| Conformance Evidence | Evidência de Conformidade | Verificável por máquina |
| Operator | Operador | Sempre independente — nunca "certificado pela BANZA" |
| Reference Operator | Operador de Referência | Um operador independente como qualquer outro |
| Conformant Operator | Operador Conforme | Operador que demonstra conformidade verificável |
| Independent Operator | Operador Independente | Assume a sua própria responsabilidade legal e regulatória |
| Federation Operator | Operador de Federação | |
| Infrastructure Operator | Operador de Infraestrutura | |
| Conformance | Conformidade | |
| Conformance Suite | Suite de Conformidade | |
| Conformance Runner | Executor de Conformidade | |
| Invariant | Invariante | |
| Financial Invariant | Invariante Financeiro | |
| Property | Propriedade | |
| Specification | Especificação | |
| Rules | Regras | "Public rules" → "Regras públicas" |
| Open rules | Regras abertas | |
| Protocol layer | Camada de protocolo | |
| Interoperability | Interoperabilidade | |
| Bilateral agreement | Acordo bilateral | |

### Arquitectura de Confiança

| Inglês | Português Canónico | Notas |
|--------|-------------------|-------|
| Trust Root | Trust Root · Raiz de Confiança | Assina apenas o Manifesto de Chaves; as chaves delegadas assinam metadados do protocolo, releases e revogações. **Não** autoriza operadores, **não** emite licença, **não** autoriza pagamentos |
| Root Key | Chave Raiz | A chave da Trust Root |
| Delegated Signing Key | Chave Delegada de Assinatura | Assina metadata e evidências ao abrigo do Trust Root |
| Signed Protocol Metadata | Metadata de Protocolo Assinada | Material auto-publicado que um par verifica na Avaliação Aberta de Confiança |
| BRL-Issuing Key | Chave Emissora de LRB | |
| Evidence-Issuing Key | Chave Emissora de Evidências | |
| Key Manifest | Manifesto de Chaves | |
| Revocation List | Lista de Revogação | Mecanismo de segurança e trust do protocolo. **Não** é licença, sanção regulatória ou autorização financeira |
| BANZA Revocation List (BRL) | Lista de Revogação BANZA (BRL) | Sigla BRL mantém-se como identificador universal |
| Public Protocol Registry | Public Protocol Registry · Registo Público de Protocolo | Índice de metadata e evidência verificável. **Não** é lista de operadores licenciados, aprovados ou certificados. Ausência ≠ proibição regulatória |
| Evidence freshness | Frescura da evidência | Janela de validade do material de confiança (Verificação 9) |
| Fail-closed | Falha fechada (*fail-closed*) | Material em falta, inválido, expirado, revogado ou incompatível ⇒ não encaminhável |
| Root key ceremony | Cerimónia da chave raiz | |
| Air-gapped machine | Máquina isolada da rede | |
| Ceremony Officer | Oficial de Cerimónia | |
| Trust hierarchy | Hierarquia de confiança | |
| Key pinning | Fixação de chaves (key pinning) | Manter termos técnicos se necessário |
| Signature | Assinatura | |
| Revocation | Revogação | |
| Suspension | Suspensão | |

### Federação e Liquidação

| Inglês | Português Canónico | Notas |
|--------|-------------------|-------|
| Routing | Encaminhamento | |
| Routing request | Pedido de encaminhamento | |
| Settlement | Liquidação | |
| Settlement cycle | Ciclo de liquidação | |
| Obligation | Obrigação | |
| Netting | Compensação | |
| Bilateral netting | Compensação bilateral | |
| Net position | Posição líquida | |
| Compensation cycle | Ciclo de compensação | |
| Bank transfer | Transferência bancária | |
| Bank rail | Via bancária | |
| Reconciliation | Reconciliação | |
| Federation routing | Encaminhamento federado | |
| Cross-operator | Inter-operadores | |
| Interoperability scenario | Cenário de interoperabilidade | |

### Ledger e Financeiro

| Inglês | Português Canónico | Notas |
|--------|-------------------|-------|
| Ledger | Livro-razão | |
| Double-entry ledger | Livro-razão de partidas dobradas | |
| Posting | Lançamento | |
| Debit | Débito | |
| Credit | Crédito | |
| Balance | Saldo | |
| Available balance | Saldo disponível | |
| Reserved balance | Saldo reservado | |
| Wallet | Carteira | |
| Consumer wallet | Carteira do consumidor | |
| Merchant wallet | Carteira do comerciante | |
| Settlement | Liquidação | |
| Payout | Pagamento ao banco | |
| Transfer | Transferência | |
| Payment | Pagamento | |
| Transaction | Transacção | |
| Integer representation | Representação inteira | |
| Minor units | Unidades menores | |
| Amount | Montante | |
| Fee | Taxa | |

### Governação

| Inglês | Português Canónico | Notas |
|--------|-------------------|-------|
| Governance | Governação | |
| Architecture Decision Record (ADR) | Registo de Decisão de Arquitectura (ADR) | Sigla ADR mantém-se |
| Request for Comments (RFC) | Pedido de Comentários (RFC) | Sigla RFC mantém-se |
| Audit | Auditoria | |
| Auditor | Auditor | |
| Regulator | Regulador | |
| Compliance | Conformidade regulatória | Distinguir de conformidade técnica (conformance) |
| Roadmap | Roteiro | |
| Milestone | Marco | |

### Conformidade e Níveis

| Inglês | Português Canónico | Notas |
|--------|-------------------|-------|
| L0 — Protocol Sandbox | L0 — Sandbox de Protocolo | "Sandbox" mantém-se |
| L1 — Core Payment Capability | L1 — Capacidade de Pagamento Base | |
| L2 — Payment Initiation Capability | L2 — Capacidade de Iniciação de Pagamento | |
| L3 — Inter-Operator Interoperability | L3 — Interoperabilidade Inter-Operadores | |
| L4 — External Interoperability | L4 — Interoperabilidade Externa | |
| Protocol Capability Manifest | Manifesto de Operador | Auto-publicado pelo operador |
| Self-publication | Auto-publicação | O operador publica o seu próprio material (ADR-031) |
| Conformance result | Resultado de conformidade | |
| Conformance evidence | Evidência de conformidade | Verificável por máquina; re-verificável por qualquer par |
| Compatibility badge | Distintivo de compatibilidade | Auto-declaração — sem peso de confiança |
| Readiness score | Pontuação de prontidão | |
| Gap assessment | Avaliação de lacunas | |

### Avaliação Aberta de Confiança (ADR-025)

| Inglês | Português Canónico | Notas |
|--------|-------------------|-------|
| Manifest validity | Validade do manifesto | Verificação 1 |
| Protocol version compatibility | Compatibilidade de versão de protocolo | Verificação 2 |
| Metadata signature verification | Verificação de assinatura de metadata | Verificação 3 |
| Evidence validity | Validade da evidência | Verificação 4 |
| Trust root / delegated signature validity | Validade da assinatura de trust root ou chave delegada | Verificação 5 |
| Revocation check | Verificação de revogação | Verificação 6 |
| Capability compatibility | Compatibilidade de capacidades | Verificação 7 |
| Endpoint contract compatibility | Compatibilidade de contrato de endpoint | Verificação 8 |
| Evidence freshness policy | Política de frescura da evidência | Verificação 9 |
| Fail-closed behaviour | Comportamento de falha fechada | Verificação 10 |

### Tecnologia

| Inglês | Português Canónico | Notas |
|--------|-------------------|-------|
| Protocol core | Núcleo | "Financial protocol core" → "Núcleo financeiro" |
| Memory safety | Segurança de memória | |
| Deterministic | Determinístico | |
| Append-only | Imutável por adição | Ou "só de adição" |
| Atomic | Atómico | |
| Idempotency | Idempotência | |
| Rate limiting | Limitação de taxa | |
| Distributed locking | Bloqueio distribuído | |
| Traceability | Rastreabilidade | |
| Observability | Observabilidade | |
| Technology stack | Pilha tecnológica | |

### BanzAI

| Inglês | Português Canónico | Notas |
|--------|-------------------|-------|
| Native Protocol Agent | Agente do Protocolo | |
| Knowledge engine | Motor de conhecimento | |
| Evaluation engine | Motor de avaliação | |
| Conformance support | Apoio à conformidade | O BanzAI explica critérios; não avalia confiança nem admite operadores |
| Federation intelligence | Inteligência de federação | |
| Operational intelligence | Inteligência operacional | |
| Digital twin | Gémeo digital | |
| Simulation | Simulação | |
| Readiness analysis | Análise de prontidão | |
| Manifest validation | Validação de manifesto | |

---

## Termos Invariantes (Não Traduzir)

Os seguintes termos são identificadores técnicos universais e não são traduzidos:

| Termo | Razão |
|-------|-------|
| `trace_id` | Identificador técnico invariante |
| `operator_id`, `issuer_key_id` | Identificadores de contrato |
| ADR, RFC | Identificadores de governação |
| BRL | Código universal da Lista de Revogação |
| ed25519 | Algoritmo criptográfico |
| AOA | Código ISO 4217 |
| SDK | Acrónimo universal |
| QR | Acrónimo universal |
| P2P | Acrónimo universal |
| Webhook | Termo técnico universal |
| Sandbox | Termo técnico universal |
| T+0 | Notação temporal universal |
| INV-LEDGER-001, INV-FEDEVAL-* | Códigos de invariante |
| MON-001, FED-CERT, etc. | Códigos de conformidade |
| `amount_minor`, `gross_minor` | Nomes de campos de contrato |
| `banza_sdk`, `@banza/sdk` | Nomes de pacotes |
| `/.well-known/banza/` | Caminhos de API |

---

## Notas de Estilo

1. **Protocolo BANZA** — sempre com maiúsculas para BANZA como entidade
2. **BanzAI** — sempre com capitalização mista (nunca "Banzai" ou "BANZAI")
3. **Operador** — com maiúscula quando se refere a uma entidade específica; nos exemplos usar sempre **Operador A**, **Operador B**, **Operador C** — nunca nomes comerciais reais
4. **Kwanza (AOA)** — a moeda oficial de Angola; usa-se sempre "Kwanza" em texto
5. **Angola** — sempre referenciada como ponto de partida do protocolo
6. **v1.0** — versão do protocolo, sempre com ponto decimal
7. **M1, M2, M3** — marcos do roteiro, sempre em maiúsculas
