# BANZA — Arquitectura de Trust

> **Documento de arquitectura de trust do protocolo BANZA.** Descreve os mecanismos criptográficos e de
> confiança do protocolo: `Trust Root`, `Delegated Signing Keys`, `Signed Protocol Metadata`, `Operator
> Manifest`, `Conformance Evidence`, `Public Protocol Registry` e `Revocation`/fail-closed. Para o algoritmo
> da `Open Trust Evaluation` e a fronteira do que a avaliação não é, ver
> [`FEDERATION_TRUST_MODEL.md`](./FEDERATION_TRUST_MODEL.md).

---

## Modelo de autorização da raiz — 2-de-3

A `Trust Root` é controlada por **três autoridades de assinatura independentes**. Qualquer acção
autorizada da raiz exige **duas assinaturas, de duas autoridades distintas**. Uma assinatura isolada
nunca autoriza, e duas assinaturas da **mesma** autoridade contam como uma só.

| | |
|---|---|
| Autoridades independentes | **três** |
| Assinaturas necessárias | **duas**, de autoridades distintas |
| Uma assinatura isolada | **nunca autoriza** |
| Duas assinaturas da mesma autoridade | contam como **uma** |

O limiar é criptográfico e lógico. Quantos módulos de segurança existem, onde ficam os dispositivos e
como o material é transportado são **controlos de custódia** — podem mudar sem redefinir a autoridade
do protocolo. O número de dispositivos nunca determina o limiar.

---

## Decisão arquitectural canónica

> BANZA é um protocolo financeiro aberto. Operadores independentes implementam o protocolo, publicam
> manifests e demonstram compatibilidade por evidência verificável de conformidade.

A arquitectura de trust do BANZA é baseada em signed protocol metadata, delegated signing keys, operator manifests, conformance evidence, public protocol registry e revocation/fail-closed.

Humanos mantêm e evoluem o protocolo; não autorizam, aceitam, aprovam ou certificam operadores. Operadores
independentes são responsáveis pelo seu próprio enquadramento legal, regulatório, financeiro e operacional.

Origem normativa:
[ADR-027](../../decisions/adr/ADR-027-open-protocol-trust-model-without-a-certificate-authority.md) — modelo de confiança do
protocolo aberto;
[ADR-033](../../decisions/adr/ADR-033-operator-self-publication-and-machine-verifiable-conformance.md) —
auto-publicação e conformidade verificável por máquina;
[ADR-031](../../decisions/adr/ADR-031-federation-trust-evaluation-without-certificates.md) — avaliação de
confiança de federação. Este documento é subordinado a esta decisão. Nenhuma secção pode ser lida como
contradizendo-a.

![Trust Engine — modelo activo: signed protocol metadata, delegated signing keys, operator manifests, conformance evidence, public protocol registry e revocation/fail-closed](/diagrams/protocol/open-trust-evaluation-v1.svg)

---

## Princípio fundamental

O BANZA não depende da confiança num servidor, num domínio ou num participante singular. Depende da
confiança numa cadeia verificável de assinaturas sobre material público. Todo o material de trust é
publicado e reverificável por qualquer parte: um verificador chega à sua conclusão a partir de artefactos
públicos, offline, sem contactar a BANZA e sem pedir autorização a ninguém.

A validação de trust não é autorização de operador, não é certificação, não é licença e não permite prestação de serviços financeiros pelo BANZA.

### O agente nativo BanzAI e a avaliação de trust

O BANZA é acompanhado por um agente IA nativo — **BanzAI** (agente nativo do protocolo, ADR-042). No
contexto desta arquitectura, o BanzAI guia o operador ao longo da verificação de trust: orquestra os
passos, invoca as ferramentas verificáveis, explica os resultados e ajuda a preparar e corrigir a
evidência. As **decisões de trust não são tomadas pelo BanzAI**: são computadas de forma determinística
pelos motores Rust/WASM do protocolo e provadas por evidência reverificável. O BanzAI **não decide trust,
não certifica, não aprova, não autoriza e não é fonte normativa**; não substitui a Referência BANZA nem os
motores determinísticos. Um verificador chega à mesma conclusão a partir dos artefactos públicos, sem o
agente. Ver [`BANZAI_NATIVE_PROTOCOL_AGENT.md`](./BANZAI_NATIVE_PROTOCOL_AGENT.md).

---

## 1. Trust Root

A `Trust Root` é a âncora criptográfica do protocolo. Não é uma empresa, um servidor nem uma pessoa
singular. É um conjunto de chaves em custódia distribuída, usadas offline e de forma auditável.

| Propriedade | Valor |
|---|---|
| Modelo | **2-de-3.** Três autoridades de assinatura independentes; qualquer acção autorizada da raiz exige duas assinaturas de duas delas. Uma assinatura isolada nunca autoriza (INV-ROOT-007) |
| Uso | Offline, apenas para assinar material do protocolo |
| Artefacto | Root metadata assinado, com âncora fixada (pinned anchor) nos verificadores |
| Controlo único | Nenhum custódio isolado reconstrói a raiz nem produz uma assinatura válida |

O modelo de autorização é **criptográfico e lógico**: três autoridades, limiar dois. Não é definido pelo
hardware. Quantos módulos de segurança existem, onde ficam guardados e como o material é transportado
são **controlos de custódia** — descritos em [`ROOT_KEY_CUSTODY_MODEL.md`](../security/ROOT_KEY_CUSTODY_MODEL.md) —
e podem evoluir sem redefinir a autoridade do protocolo. O número de dispositivos nunca determina o limiar.

Três propriedades justificam esta escolha, e são as três que o BANZA precisa:

| Propriedade | O que garante |
|---|---|
| **Autorização a dois** | Nenhuma autoridade age sozinha; um comprometimento isolado não basta |
| **Tolerância a uma falha** | Perder ou isolar uma das três não bloqueia a raiz; as outras duas mantêm o quórum |
| **Sem controlo unipessoal** | Não existe combinação em que uma só parte autorize uma acção da raiz |

Nada mais é acrescentado para as obter: sem Shamir, sem serviço de quórum online, sem coordenação de
HSM, sem criptossistema de assinatura por limiar. Três chaves e uma contagem.

A `Trust Root` assina exclusivamente o **Manifesto de Chaves** — a root metadata que lista e endossa as `Delegated Signing Keys`. A `Signed Protocol Metadata`, as releases e a `Revocation List` são assinadas pelas `Delegated Signing Keys` endossadas pela raiz, nunca pela raiz directamente (INV-ROOT-004; ADR-027). Uma assinatura da raiz responde a
exactamente uma pergunta — *este artefacto do protocolo é genuíno e íntegro?* — e nunca a *pode esta
entidade participar?*.

A raiz **não** assina operadores. **Não** autoriza pagamentos. **Não** emite licenças. **Não** cria,
confere ou retira estatuto a implementações, e **não** movimenta fundos. Está completamente ausente do
caminho de decisão sobre quem interopera com quem.

---

## 2. Delegated Signing Keys

As `Delegated Signing Keys` são chaves operacionais de âmbito limitado, endossadas por metadados assinados
pela `Trust Root`. Existem para que a raiz permaneça offline enquanto o material do protocolo é assinado e
rodado em rotina.

| Propriedade | Valor |
|---|---|
| Âmbito | Cada chave é válida apenas para o que o seu âmbito declara (releases, metadata, revogação, artefactos) |
| Validade | Janela temporal explícita; expira e é rodada como rotina, não como excepção |
| Endosso | Presente em metadados assinados pela raiz; o threshold da raiz tem de ser satisfeito |
| Revogação | Uma chave delegada pode ser revogada sem tocar na raiz nem comprometer as restantes |

O que uma `Delegated Signing Key` assina: `Signed Protocol Metadata`, releases do protocolo, a
`Revocation List` e outros artefactos do protocolo, sempre **dentro do âmbito** que o endosso da raiz lhe
atribui.

O que uma `Delegated Signing Key` **não** faz: não confere estatuto a implementações, não autoriza
operadores e não assina evidência de operadores. Um verificador confirma que cada assinatura encadeia até
à `Trust Root` através de chaves delegadas que estão no âmbito, não expiradas, presentes em metadados
assinados pela raiz e não revogadas. Chave desconhecida, expirada, fora de âmbito ou revogada, ou threshold
da raiz não satisfeito ⇒ **fail-closed**.

---

## 3. Signed Protocol Metadata

A `Signed Protocol Metadata` autentica a régua da medição: fixa quais as versões, schemas, vetores e
digests genuínos sob os quais a conformidade é avaliada. Uma avaliação contra regras forjadas não vale nada,
por muito bem que o resto do processo corra — por isso o metadata é assinado e verificado antes de ser
usado.

| Campo | Significado |
|---|---|
| `protocol_version` | Versão das especificações versionadas a que o metadata se refere |
| `schema_versions` | Versões dos schemas normativos genuínos |
| `conformance_tool_version` | Versão fixada da automação de conformidade que produz evidência rederivável |
| `registry_snapshot_hash` | Hash de um snapshot do `Public Protocol Registry` |
| `revocation_list_hash` | Hash da `Revocation List` sob a qual o metadata é coerente |
| `operator_manifest_hash` | Hash dos bytes de um `Operator Manifest` avaliado |
| `conformance_evidence_hash` | Hash do relatório de `Conformance Evidence` publicado |
| `evidence_bundle_hash` | Hash do `Evidence Bundle` no seu todo |
| Assinatura | `Ed25519`, produzida por uma `Delegated Signing Key` endossada pela raiz |
| Validade temporal | Janela explícita de validade, aplicada localmente pelo verificador |

O metadata assinado autentica **a régua** — nada afirma sobre nenhum operador. O verificador nunca recorre
a regras não assinadas ou localmente mutáveis: metadata em falta, sem assinatura, com assinatura inválida,
expirado ou de chave desconhecida ⇒ **fail-closed**.

---

## 4. Operator Manifest

O `Operator Manifest` é a declaração pública e assinada de uma implementação independente. É publicado pelo
próprio operador, num endereço que o operador controla — auto-publicação, não admissão.

| Campo | Significado |
|---|---|
| `operator_id` | Identificador escolhido e publicado pelo operador (ex.: `operator-a`). Nunca uma marca comercial |
| `capabilities` | Capabilities protocolares que a implementação declara suportar |
| `endpoints` | Endereços dos endpoints que suportam as capabilities declaradas |
| `public_keys` | Material de chave **público** do operador, contra o qual as suas assinaturas são verificadas |
| `protocol_version` | Versão das especificações versionadas a que a declaração se refere |

Um manifest é uma **afirmação, não evidência**: ninguém o endossou, e declaração não é demonstração. Cada
operador independente é responsável pelo seu próprio enquadramento legal, regulatório, financeiro e
operacional — o manifest declara o que a implementação faz, nunca que o operador está autorizado a operar.

---

## 5. Conformance Evidence

A `Conformance Evidence` é o resultado determinístico da automação de conformidade sobre vetores públicos,
assinada pelo operador e ligada por hashes ao manifest e ao `Evidence Bundle`. É gerada pelo operador com
**BanzAI**, sobre os engines Rust/WASM do protocolo, e é reproduzível por qualquer terceiro que
reexecute os mesmos vetores públicos.

A evidência é **machine-verifiable**: qualquer parte recalcula `conformance_report_hash`,
`evidence_bundle_hash` e `manifest_hash`, confirma `verified_by_tool_version` e `trust_root_version`, e
confirma que os vetores usados correspondem aos digests fixados na `Signed Protocol Metadata`.

A `Conformance Evidence` **não** é uma aprovação, **não** é uma licença e **não** é um certificado. Não é
estatuto atribuído, não é permanente e não é um juízo sobre a entidade: descreve uma implementação, numa
versão, no âmbito das capabilities declaradas, à data de uma execução. Evidência ausente, com hash
divergente, não reproduzível, em estado de falha, ou cobrindo outra `protocol_version` ⇒ **fail-closed**.

---

## 6. Public Protocol Registry

O `Public Protocol Registry` é um índice público, verificável e replicável de manifests, evidência e
metadata que os operadores **já publicaram por si próprios**. Cada entrada é um espelho de uma
auto-publicação — um conjunto de ponteiros e hashes para artefactos que vivem em endereços que o operador
controla.

O peso probatório de uma entrada é, por si só, exactamente zero: tudo o que afirma é um ponteiro para
artefactos assinados que o verificador reverifica. Qualquer parte pode reconstruir o mesmo índice a partir
dos mesmos manifests públicos, ou fazer fork dele; qualquer verificador pode ignorá-lo e verificar um
operador directamente a partir do seu `operator_manifest_url`. É por ser reproduzível e contornável que o
índice não pode funcionar como portão.

O registo **não** é uma lista de operadores aprovados, **não** é uma whitelist regulatória e
**não** é uma lista de operadores certificados. A ausência de uma entrada significa apenas que não há evidência
verificável publicada e indexada para aquele operador — nunca uma proibição, uma sanção ou uma recusa.
Ver [`PUBLIC_PROTOCOL_REGISTRY.md`](./PUBLIC_PROTOCOL_REGISTRY.md).

Estado actual, verificável directamente nas rotas públicas: `/operators` = `[]` e
`production_certificates` = `false`.

---

## 7. Revocation / Fail-Closed

A `Revocation List` é a lista assinada, versionada e datada do material criptográfico comprometido ou
retirado — chaves de operador, `Delegated Signing Keys`, releases e artefactos. É um **sinal de segurança e
de trust do protocolo**: diz que determinado material criptográfico deixou de ser fiável.

A revogação **não** é uma sanção regulatória e **não** é a retirada de uma licença. Uma chave revogada não
expulsa ninguém — não havia admissão para reverter. O operador publica material novo e continua; a
recuperação não precisa da permissão de ninguém.

**Fail-closed** é a postura de segurança que governa toda a avaliação: material de trust em falta, inválido,
expirado, revogado ou incompatível ⇒ não há interoperação. A ausência de resposta nunca é tratada como
resposta positiva; a incapacidade de verificar nunca é tratada como verificação. Uma `Revocation List` que
não pode ser verificada nunca é lida como uma lista vazia. Fail-closed é uma afirmação sobre **a evidência
disponível ao verificador** — nunca um veredicto sobre a legalidade, os direitos ou a conduta de ninguém.

---

## 8. Verificação do operador via BanzAI

Operadores validam compatibilidade protocolar com o BanzAI, na rota pública `/banzai`.

O BanzAI é a interface pública onde o operador prepara o `Operator Manifest`, executa as validações de
conformidade, verifica a `Signed Protocol Metadata` e as `Delegated Signing Keys`, avalia
revocation/fail-closed e gera o `Evidence Bundle`. O BanzAI guia e orquestra estes passos, mas o resultado
é computado pelos engines Rust/WASM do protocolo no navegador — determinístico e verificável, e não é
licença, certificação ou autorização atribuída pelo agente. Ver
[`WORKBENCH_ONLY_OPERATOR_VERIFICATION.md`](./WORKBENCH_ONLY_OPERATOR_VERIFICATION.md).

Um operador não precisa de instalar Python, correr Docker, configurar GitHub Actions ou executar scripts
externos para demonstrar compatibilidade protocolar. As ferramentas internas de CI, os guards e os testes
Rust do repositório existem para os **maintainers do protocolo** — não são a interface de verificação de
operadores.

| Público | Ferramenta | Papel |
|---|---|---|
| Operadores / implementadores | BanzAI (agente nativo, guia e orquestra) | Preparar manifest, validar conformidade, verificar trust, gerar evidence bundle |
| Motores de verificação | Engines Rust/WASM (deterministas) | Computar conformidade, trust, traces e estados de evidência — quem decide o resultado |
| Maintainers do protocolo | CI, guards, testes Rust, scripts de dev | Interno ao repositório; não é interface operacional |

---

## Referências

- [ADR-027](../../decisions/adr/ADR-027-open-protocol-trust-model-without-a-certificate-authority.md) — modelo de confiança do protocolo aberto
- [ADR-033](../../decisions/adr/ADR-033-operator-self-publication-and-machine-verifiable-conformance.md) — auto-publicação e conformidade verificável por máquina
- [ADR-031](../../decisions/adr/ADR-031-federation-trust-evaluation-without-certificates.md) — avaliação de confiança de federação
- [FEDERATION_TRUST_MODEL.md](./FEDERATION_TRUST_MODEL.md) — a `Open Trust Evaluation` e a sua fronteira
- [PUBLIC_PROTOCOL_REGISTRY.md](./PUBLIC_PROTOCOL_REGISTRY.md) — o índice público verificável
- [WORKBENCH_ONLY_OPERATOR_VERIFICATION.md](./WORKBENCH_ONLY_OPERATOR_VERIFICATION.md) — verificação guiada pelo BanzAI
- [BANZAI_NATIVE_PROTOCOL_AGENT.md](./BANZAI_NATIVE_PROTOCOL_AGENT.md) — BanzAI como agente nativo do protocolo (ADR-042)
- Contratos: `contracts/production/trust-root-metadata.production.schema.json`, `delegated-signing-key.production.schema.json`, `signed-protocol-metadata.production.schema.json`, `conformance-evidence.production.schema.json`, `public-protocol-registry.production.schema.json`, `revocation-entry.production.schema.json`

---

A trust do BANZA reside em assinaturas verificáveis sobre material público — não em autoridade sobre
operadores.
