# Auto-publicação de Operadores e Conformidade

> Define como um operador independente implementa o protocolo, se auto-publica e demonstra conformidade verificável — sem qualquer autorização humana central da BANZA.

## 1. Decisão arquitectural canónica

> **"BANZA é um protocolo financeiro aberto. A participação de operadores no ecossistema não depende de uma autoridade humana central. Operadores independentes implementam o protocolo, publicam manifests e produzem evidência verificável de conformidade. A governação humana existe para manter e evoluir o protocolo, não para autorizar, certificar ou aceitar operadores."**

**BANZA não aceita nem rejeita operadores por decisão humana central. O protocolo define regras públicas; a implementação demonstra conformidade ou não.**

## 2. Camadas da arquitectura

| Camada | Papel |
|---|---|
| **Protocol Governance** | Mantém e evolui as regras do protocolo. Não decide quem participa. |
| **Protocol Maintainers** | Pessoas que operam a Protocol Governance: aceitam RFCs, cortam releases, custodiam a Trust Root. Não avaliam operadores. |
| **RFC Process** | Único caminho para alterar o protocolo. Aberto a qualquer pessoa ou operador. |
| **Versioned Specifications** | Especificações versionadas (`protocol_version`) contra as quais a conformidade é medida. |
| **Conformance Automation** | Execução automática e determinística dos testes de conformidade. Sem juízo humano. |
| **Conformance Evidence** | Resultado assinado e verificável dessa execução. |
| **Operator Manifest** | Documento público onde o operador declara identidade, endpoints, capacidades e chaves. |
| **Evidence Bundle** | Agregado íntegro (hashes SHA-256 + versões de ferramenta) da evidência produzida. |
| **Trust Root** | Raiz de confiança que assina apenas o Manifesto de Chaves; as chaves delegadas assinam metadados do protocolo, releases e revogações. |
| **Delegated Signing Keys** | Chaves delegadas pela Trust Root para assinatura operacional de metadados e releases. |
| **Revocation List** | Lista pública de material de confiança revogado. Mecanismo de segurança. |
| **Public Protocol Registry** | Índice público e verificável de manifests e evidência auto-publicados. Índice, não porta de entrada. |

### Fronteira da Trust Root

A Trust Root assina **apenas** o Manifesto de Chaves; as chaves delegadas assinam metadados do protocolo (`signed_protocol_metadata`), releases e revogações.

A Trust Root **não**:

- não autoriza pagamentos;
- não cria operadores;
- não emite licenças;
- não certifica operadores;
- não movimenta fundos.

## 3. Fluxo de auto-publicação (8 passos)

```
(1) implementa → (2) publica manifest → (3) executa conformance tests
    → (4) publica conformance evidence → (5) publica endpoints compatíveis
    → (6) qualquer pessoa/sistema verifica → (7) revocation/fail-closed (segurança)
    → (8) enquadramento legal do próprio operador
```

### Passo 1 — O operador independente implementa o protocolo

Um operador independente (ilustrativamente **Operator A**, **Operator B**, **Operator C**) implementa as Versioned Specifications na tecnologia que escolher, satisfazendo as invariantes financeiras do protocolo. Não há pedido a submeter, nem fila de espera, nem interlocutor a contactar.

### Passo 2 — Publica o Operator Manifest

O operador publica o seu manifest num endereço público que controla (`operator_manifest_url`), declarando `operator_id`, `protocol_version`, `capabilities`, `public_keys` e o seu `regulatory_responsibility_statement`. O manifest é auto-publicado: ninguém o aprova.

### Passo 3 — Executa os conformance tests

O operador corre a Conformance Automation contra a sua própria implementação, para a `protocol_version` que declara. A execução é determinística: as mesmas entradas produzem o mesmo `conformance_status`. Não existe avaliador humano no caminho.

### Passo 4 — Publica a Conformance Evidence

O operador publica o resultado: `conformance_report_hash`, `evidence_bundle_hash`, `manifest_hash`, `evidence_hash`, `verified_by_tool_version` e a `trust_root_version` dos metadados usados. A evidência é auto-publicada e reprodutível por terceiros.

### Passo 5 — Publica endpoints compatíveis

O operador expõe os endpoints que o protocolo especifica para as `capabilities` que declara. A compatibilidade é observável directamente contra o contrato público — não depende de nenhuma declaração da BANZA.

### Passo 6 — Qualquer pessoa ou sistema verifica a evidência

A verificação é pública e simétrica. Qualquer pessoa, operador, contraparte, auditor ou sistema automático pode:

1. obter o manifest em `operator_manifest_url` e recalcular o `manifest_hash`;
2. recalcular o `conformance_report_hash` e o `evidence_bundle_hash` e reexecutar os testes;
3. verificar as assinaturas contra as `public_keys` e a cadeia até `signed_protocol_metadata` / `trust_root_version`;
4. consultar a Revocation List e obter o `revocation_status`;
5. concluir, por si, se a evidência sustenta o `conformance_status` declarado.

Nenhum destes passos requer permissão da BANZA. A confiança vem da verificação, não de uma decisão.

### Passo 7 — Revogação e fail-closed (segurança, não autorização)

**A revogação é um mecanismo de segurança do protocolo. Não é sanção regulatória e não é licença.**

Aplica-se **apenas** a risco de segurança, de confiança ou de protocolo:

- comprometimento ou suspeita de comprometimento de chave;
- material de confiança inválido, expirado ou mal formado;
- evidência de conformidade falsificada ou não reprodutível;
- violação de invariante do protocolo com impacto de integridade.

Quando o material de confiança está revogado, inválido ou indisponível, o comportamento é **fail-closed**: um verificador trata o resultado como não confiável em vez de assumir validade. Uma revogação retira confiança criptográfica a material específico — **não** retira, suspende nem afecta qualquer autorização regulatória do operador, que nunca esteve nas mãos da BANZA.

### Passo 8 — Responsabilidade legal, regulatória e financeira do operador

Cada operador independente assume integralmente o seu próprio enquadramento legal, regulatório e financeiro. Quando aplicável, o operador é autorizado pelas **entidades competentes** — nunca pela BANZA. São responsabilidade exclusiva do operador: licenças e autorizações, prestação e liquidação de serviços financeiros, detenção e movimentação de fundos, KYC/KYB, AML/CFT e a relação com os utilizadores finais.

O `regulatory_responsibility_statement` no manifest é uma declaração do próprio operador. A BANZA não a valida, não a endossa e não a substitui.

## 4. Campos do operador

| Campo | Descrição |
|---|---|
| `operator_id` | Identificador do operador, escolhido e publicado por si. |
| `operator_manifest_url` | Endereço público, controlado pelo operador, onde o manifest é servido. |
| `protocol_version` | Versão das especificações que a implementação declara cumprir. |
| `capabilities` | Capacidades de protocolo implementadas e expostas. |
| `conformance_report_hash` | SHA-256 do relatório de conformidade publicado. |
| `evidence_bundle_hash` | SHA-256 do Evidence Bundle publicado. |
| `public_keys` | Chaves públicas do operador, para verificação de assinaturas. |
| `revocation_status` | Estado do material de confiança face à Revocation List. |
| `regulatory_responsibility_statement` | Declaração do operador sobre o seu próprio enquadramento legal/regulatório. |
| `conformance_status` | Resultado determinístico da Conformance Automation. |
| `evidence_hash` | SHA-256 do artefacto de evidência referenciado. |
| `manifest_hash` | SHA-256 do próprio manifest, recalculável por qualquer verificador. |
| `verified_by_tool_version` | Versão da ferramenta que produziu a evidência (reprodutibilidade). |
| `signed_protocol_metadata` | Metadados do protocolo assinados pela Trust Root ou por Delegated Signing Keys. |
| `trust_root_version` | Versão da Trust Root sob a qual a evidência foi verificada. |

Todos estes campos são **auto-declarados e verificáveis**: nenhum é atribuído, concedido ou confirmado por uma autoridade humana.

Este conjunto é fechado. O manifest é validado contra o schema publicado: um manifest que introduza campos fora deste conjunto é rejeitado como inválido.

## 5. Conformidade não é aprovação

| Conformidade **é** | Conformidade **não é** |
|---|---|
| Resultado determinístico de testes públicos | Um juízo humano |
| Reprodutível por qualquer terceiro | Um privilégio concedido |
| Ligada a uma `protocol_version` concreta | Permanente ou irrevogável |
| Evidência sobre uma implementação | Uma declaração sobre a idoneidade legal do operador |

A evidência descreve o que a implementação faz. Não diz que o operador está autorizado a operar — isso pertence às entidades competentes.

## 6. Papel da governação humana

A Protocol Governance e os Protocol Maintainers existem para **manter e evoluir o protocolo**: aceitar e decidir RFCs, publicar Versioned Specifications, cortar releases assinados, custodiar a Trust Root, delegar e revogar chaves, e manter a Revocation List e o Public Protocol Registry.

A governação humana **nunca** decide quem pode participar. Não há passo em que uma pessoa avalie, aceite ou recuse um operador. Se um operador implementa correctamente e publica evidência verificável, participa; se não, a evidência mostra-o publicamente e a rede age em conformidade.

## Ver também

- [`BANZA_PROTOCOL_BOUNDARY.md`](BANZA_PROTOCOL_BOUNDARY.md)
- [`BANZA_REGULATORY_POSITIONING.md`](BANZA_REGULATORY_POSITIONING.md)
- [`BANZA_TRUST_ARCHITECTURE.md`](BANZA_TRUST_ARCHITECTURE.md)
- [`OPERATOR_MANIFEST_VALIDATION.md`](OPERATOR_MANIFEST_VALIDATION.md)
- [`EVIDENCE_BUNDLE.md`](EVIDENCE_BUNDLE.md)
- [`PROTOCOL_RELEASE_GOVERNANCE.md`](PROTOCOL_RELEASE_GOVERNANCE.md)
