# Public Protocol Registry

> Documento canónico do `Public Protocol Registry` — o índice público e verificável de metadata e evidência auto-publicadas por operadores independentes. Define o que o índice é, o que cada campo de uma entrada significa, e por que estar ou não estar indexado nada decide.

---

## Decisão arquitectural canónica

> "BANZA é um protocolo financeiro aberto. A participação de operadores não depende de uma autoridade humana central. Operadores independentes implementam o protocolo, publicam manifests, expõem endpoints compatíveis e produzem evidência verificável de conformidade. O trust do protocolo é baseado em signed protocol metadata, conformance evidence, public protocol registry, trust root, delegated signing keys e revocation/fail-closed."

**BANZA é um protocolo financeiro aberto. A participação de operadores é demonstrada por conformidade protocolar verificável, não por aprovação humana central.**

Este documento é subordinado a esta decisão. Nada aqui escrito — nem a existência do índice, nem qualquer
campo que uma entrada contenha — pode ser lido como contradizendo-a.

Origem normativa: [ADR-038](../../decisions/adr/ADR-038-open-protocol-trust-model-without-ca.md) (D-038-05),
[ADR-039](../../decisions/adr/ADR-039-operator-self-publication-and-machine-verifiable-conformance.md) §3–§4,
[ADR-040](../../decisions/adr/ADR-040-federation-trust-evaluation-without-certificates.md).
Contrato normativo: `contracts/production/public-protocol-registry.production.schema.json`.

---

## 1. O que o registo é

> **"O Public Protocol Registry é um índice de metadata e evidência verificável. Não é uma lista de operadores licenciados, aprovados ou certificados pela BANZA."**

O registo indexa metadata e evidência que os operadores **já publicaram por si próprios**. Cada entrada é
um espelho de uma auto-publicação: um conjunto de ponteiros e hashes para artefactos que vivem em
endereços que o operador controla. O índice não os altera, não os endossa e não lhes acrescenta valor
probatório.

| Propriedade | Valor |
|---|---|
| Natureza | Índice público, verificável e replicável de artefactos auto-publicados |
| Como uma entrada nasce | Mecanicamente, por regras públicas, sobre material já publicado pelo operador |
| Peso probatório de uma entrada | **Exactamente zero, por si só.** Tudo o que afirma é um ponteiro para artefactos assinados que o verificador reverifica |
| Papel na `Open Trust Evaluation` | Input **a verificar** (passo 6 de dez), nunca permissão concedida |
| Replicabilidade | Qualquer parte pode percorrer os mesmos manifests públicos e reconstruir o mesmo índice, ou fazer fork do existente |
| Contornabilidade | Qualquer verificador pode ignorar o índice e verificar um operador directamente a partir do seu `operator_manifest_url` |
| Estado actual | `entries` vazio; `/operators` = `[]`; `production_certificates` = `false` |

**É por ser reproduzível que o índice não tem poder.** Um índice que qualquer parte pode recalcular, e que
qualquer parte pode contornar, não pode funcionar como portão — seja quem for que o publique. Se o índice
desaparecer, a evidência continua publicada, verificável e utilizável: o índice é uma ajuda à descoberta,
não uma fonte de verdade.

## 2. O que o registo não é

- **Uma entrada não é uma licença.** Licenças e autorizações são concedidas pelas entidades competentes ao
  operador. A BANZA não as emite, e um índice de bytes publicados não poderia emiti-las.
- **Uma entrada não é aprovação humana.** Nenhuma pessoa revê, aceita ou aprova uma entrada. Indexar é
  mecânico sobre artefactos que já são públicos. Não existe fila, candidatura, juízo de mérito, ordenação,
  pontuação nem selecção.
- **Uma entrada não é um portão nem uma whitelist.** Não existe porta de entrada. Estar indexado não é
  condição para implementar o protocolo, nem para publicar evidência, nem para ser verificado.
- **Uma entrada não confere nada.** Não acrescenta capability, direito, estatuto ou posição que o operador
  não tivesse já por ter publicado evidência verificável.
- **O registo não substitui a autorização do operador.** É silencioso sobre autorização, porque indexa
  evidência protocolar e não tem legitimidade para falar sobre autorização. Um operador pode estar
  plenamente autorizado pela sua entidade competente e ausente do índice; um operador pode estar indexado
  e não deter autorização de nenhuma entidade. O índice nada diz sobre qualquer dos casos.
- **O registo não é a BANZA a avaliar operadores.** A avaliação é local a quem interopera, sob a sua
  própria política — ver [FEDERATION_TRUST_MODEL.md](./FEDERATION_TRUST_MODEL.md) §2.

## 3. Ausência do registo

**A ausência do registo significa exactamente uma coisa: não há evidência verificável publicada e indexada
para aquele operador. Nada mais.**

A ausência **não pode** ser descrita, apresentada ou implementada como proibição regulatória. Não é
sanção, não é recusa, não é indeferimento, não é suspensão, e não é uma afirmação de que o operador não
pode operar ou está a operar indevidamente. Nada foi pedido, logo nada foi recusado.

A ausência tem causas ordinárias, sem qualquer significado adverso: o operador ainda não publicou; publicou
mas ainda não foi indexado; publica a sua evidência noutro sítio; ou simplesmente escolheu não ser
indexado.

A ausência tem **uma** consequência protocolar legítima, e de âmbito estreito: um verificador que não
encontra evidência verificável tem, precisamente, evidência nenhuma — logo a avaliação não produz
resultado positivo e o verificador faz fail-closed em vez de assumir validade. Isso é uma afirmação sobre
**a evidência disponível ao verificador**, não sobre a legalidade, os direitos ou a conduta do operador.
Fail-closed é uma postura de segurança, nunca um veredicto sobre uma pessoa ou uma empresa.

## 4. Campos de uma entrada

Cada entrada espelha a auto-publicação do operador. A vista lógica abaixo é a que um verificador consome;
a sua forma normativa está em `contracts/production/public-protocol-registry.production.schema.json`, que a
estrutura por `self_publication` (`operator-self-publication.production.schema.json`) e
`conformance_evidence` (`conformance-evidence.production.schema.json`). Em caso de divergência entre este
documento e os contratos, **os contratos prevalecem**.

| Campo | Significado | O que **não** significa |
|---|---|---|
| `operator_id` | Identificador do operador, escolhido e publicado por si próprio (ex.: `operator-a`). Nunca uma marca comercial | Não é um número atribuído pela BANZA nem uma posição numa lista |
| `operator_manifest_url` | Endereço público, controlado pelo operador, onde o `Operator Manifest` é servido. É a origem: o índice aponta para lá, não guarda a verdade | Não é hospedagem pela BANZA nem um endereço concedido |
| `operator_manifest_hash` | Hash sobre os bytes do manifest, permitindo confirmar que os bytes avaliados são os bytes indexados | Não prova que a declaração é *verdadeira* — um manifest é uma afirmação, não evidência |
| `protocol_version` | Versão das `Versioned Specifications` a que a declaração e a evidência se referem | Não é um nível, uma categoria nem um grau atribuído ao operador |
| `capabilities` | Capabilities protocolares declaradas pelo operador e cobertas por evidência | Não é uma tier, um ranking nem um estatuto conferido. Declaração sem evidência que a cubra não prova nada |
| `conformance_evidence_url` | Endereço público onde a `Conformance Evidence` do operador é servida | Não é evidência emitida pela BANZA ao operador |
| `conformance_evidence_hash` | Hash do relatório de conformidade publicado (`conformance_report_hash` no contrato), recalculável por qualquer terceiro | Não é um selo nem uma assinatura da BANZA sobre o operador |
| `evidence_bundle_hash` | Hash do `Evidence Bundle` no seu todo, ligando manifest, relatório e artefactos num conjunto reexecutável | Não é permanente: descreve uma execução, de uma versão |
| `signed_protocol_metadata_hash` | Hash da `Signed Protocol Metadata` sob a qual a entrada é verificável — fixa os vetores, schemas e digests genuínos | Autentica a régua da medição; nada diz sobre o operador medido |
| `public_keys` | Material de chave **público** do operador, ligado pelo manifest, contra o qual as assinaturas do operador são verificadas | Nunca material de chave privada. Não são chaves emitidas pela BANZA |
| `trust_root_version` | Versão da `Trust Root` sob a qual o material do protocolo foi verificado | A `Trust Root` assina apenas material do protocolo (metadados, chaves delegadas, releases, revogações) — nunca operadores, pagamentos ou licenças |
| `delegated_key_id` | Identificador da `Delegated Signing Key` que assinou o material do protocolo relevante, com âmbito e validade limitados | Não é uma chave que autorize o operador |
| `revocation_status` | Estado do material criptográfico face à `Revocation List`, com semântica fail-closed | Não é licença, não é sanção regulatória, não é juízo sobre conduta |
| `last_verified_at` | Momento da última verificação mecânica da entrada, base para a política de frescura | Não é uma data de validade concedida nem uma renovação emitida por alguém |
| `verified_by_tool_version` | Versão fixada da ferramenta de verificação, sem a qual a reprodução independente não é possível | Não é uma opinião de uma ferramenta: é a fixação que torna o resultado rederivável |
| `regulatory_responsibility_statement` | Declaração **do operador, sobre o operador**, do seu próprio enquadramento regulatório | A BANZA não a valida, não a endossa, não a verifica e não a substitui. É verificada por máquina apenas quanto à presença e boa formação; a sua verdade é responsabilidade do operador e matéria da entidade competente |

Todo o material indexado é público. **Nenhuma entrada contém, ou pode conter, material de chave privada.**

Este conjunto é fechado: uma entrada que introduza campos fora dele não valida contra o contrato.

O contrato fixa a fronteira do índice por invariante e não por prosa: `index_only` é `const: true`, e o
bloco `boundary` exige `not_operator_authorisation`, `not_certificate`, `not_operator_approval`,
`not_payment_service_authorisation` e `open_financial_protocol`, todos `const: true`. Um índice que
afirmasse o contrário não valida.

## 5. Replicação e fork

O índice é **replicável e forkável por desenho**, e isso é uma propriedade de segurança, não uma
conveniência:

1. As entradas derivam de material público em endereços controlados pelos operadores.
2. As regras de geração e de validação são públicas e executáveis.
3. Qualquer parte pode percorrer as mesmas origens, aplicar as mesmas regras e obter o mesmo índice.
4. Qualquer parte pode publicar o seu próprio índice, ou fazer fork deste, sem pedir nada a ninguém.
5. Qualquer verificador pode dispensar completamente o índice e ir directamente ao `operator_manifest_url`.

Daqui decorre o critério de sobrevivência de [OPEN_PROTOCOL_GOVERNANCE.md](./OPEN_PROTOCOL_GOVERNANCE.md)
§9: se quem publica este índice desaparecer, o ecossistema não para. A evidência continua publicada, as
regras continuam públicas e o índice é reconstruído por quem dele precisar. Um índice de que o protocolo
dependesse seria um portão com outro nome.

## 6. Fronteira permanente

- **A `Trust Root` assina apenas o Manifesto de Chaves; as chaves delegadas assinam metadados do protocolo, releases e revogações. Ela não autoriza
  operadores, não emite licença e não autoriza pagamentos.** Não cria operadores, não confere estatuto a
  implementações e não movimenta fundos. Assinar o índice é uma afirmação sobre um artefacto do protocolo —
  nunca sobre os participantes nele espelhados.
- **A `Revocation List` é um mecanismo de segurança e trust do protocolo. Não é licença, sanção regulatória
  ou autorização financeira.** Diz que determinado material criptográfico deixou de ser fiável. Uma chave
  revogada não expulsa ninguém — não havia admissão para reverter. O operador publica material novo e
  continua. A revogação não remove, não suspende e não afecta qualquer autorização que o operador detenha —
  autorização que nunca foi da BANZA para conceder ou retirar.
- **Operadores são independentes** e respondem integralmente pelo seu próprio enquadramento legal,
  regulatório, financeiro e operacional. Quando é necessária autorização para prestar serviços financeiros,
  ela é concedida pelas entidades competentes — nunca pela BANZA.
- **A BANZA é um protocolo financeiro aberto.** Não presta serviços financeiros, não intermedeia, não detém
  e não movimenta fundos, e não é um prestador de serviços de pagamento.

---

## Referências

- [ADR-038](../../decisions/adr/ADR-038-open-protocol-trust-model-without-ca.md) — modelo de confiança do protocolo aberto (D-038-05)
- [ADR-039](../../decisions/adr/ADR-039-operator-self-publication-and-machine-verifiable-conformance.md) — auto-publicação e conformidade verificável por máquina
- [ADR-040](../../decisions/adr/ADR-040-federation-trust-evaluation-without-certificates.md) — avaliação de confiança de federação
- [FEDERATION_TRUST_MODEL.md](./FEDERATION_TRUST_MODEL.md) — a `Open Trust Evaluation` e o passo 6
- [OPEN_PROTOCOL_GOVERNANCE.md](./OPEN_PROTOCOL_GOVERNANCE.md) — governação do protocolo aberto (canónico)
- [OPERATOR_SELF_PUBLICATION_AND_CONFORMANCE.md](./OPERATOR_SELF_PUBLICATION_AND_CONFORMANCE.md) — auto-publicação do operador
- [EVIDENCE_BUNDLE.md](./EVIDENCE_BUNDLE.md) — `Evidence Bundle`
- [OPERATOR_MANIFEST_VALIDATION.md](./OPERATOR_MANIFEST_VALIDATION.md) — `Operator Manifest`
- [BANZA_TRUST_ARCHITECTURE.md](./BANZA_TRUST_ARCHITECTURE.md) — `Trust Root` e `Delegated Signing Keys`
- Contratos: `contracts/production/public-protocol-registry.production.schema.json`, `operator-self-publication.production.schema.json`, `conformance-evidence.production.schema.json`, `signed-protocol-metadata.production.schema.json`

---

O registo indexa o que foi publicado; não decide quem publica.
