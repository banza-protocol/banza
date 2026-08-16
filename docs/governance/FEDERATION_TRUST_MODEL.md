# Modelo de Confiança da Federação

> Documento canónico do modelo de confiança da federação BANZA. Descreve os componentes de confiança, o algoritmo conceptual da `Open Trust Evaluation`, as janelas de validade e a fronteira do que a avaliação não é.

---

## Decisão arquitectural canónica

> "BANZA é um protocolo financeiro aberto. Operadores independentes implementam o protocolo, publicam manifests e demonstram compatibilidade por evidência verificável de conformidade. O trust do protocolo usa signed protocol metadata, conformance evidence, public protocol registry, trust root, delegated signing keys e revocation/fail-closed."

**BANZA é um protocolo financeiro aberto. A participação de operadores é demonstrada por conformidade protocolar verificável.**

Este documento é subordinado a esta decisão. Nenhuma secção pode ser lida como contradizendo-a.

Origem normativa: [ADR-025](../../decisions/adr/ADR-025-trust-without-a-certificate-authority.md),
[ADR-031](../../decisions/adr/ADR-031-operator-self-publication-and-machine-verifiable-conformance.md),
[ADR-025](../../decisions/adr/ADR-025-trust-without-a-certificate-authority.md).
Por [ADR-001](../../decisions/adr/ADR-001-open-financial-protocol-what-banza-is-and-is-not.md) (protocol-first), o
modelo nasce num ADR antes de qualquer especificação, prosa ou página pública.

---

## 1. Componentes do modelo de confiança

> **Open Trust Evaluation** = `Public Protocol Registry` metadata + `Signed Protocol Metadata` +
> `Conformance Evidence` + compatibilidade de `Operator Manifest` + verificação de assinatura
> `Trust Root` / `Delegated Signing Keys` + `Revocation List` / fail-closed.

Todo o material de confiança é **publicado pelo operador e reverificável por qualquer parte**. Um
verificador chega à sua conclusão a partir de artefactos públicos, offline, sem contactar a BANZA e sem
pedir autorização a ninguém.

| Componente | Função | O que **não** é |
|---|---|---|
| `Operator Manifest` | Declaração pública e assinada de uma implementação independente: identidade, chaves públicas, endpoints, capabilities e `protocol_version` | Não é evidência. É uma afirmação, e ninguém a endossou |
| `Conformance Evidence` | Resultado determinístico da `Conformance Automation` sobre vetores públicos, assinado pelo operador, ligado por hashes ao manifest e ao `Evidence Bundle` | Não é estatuto atribuído, não é permanente, não é juízo sobre a entidade |
| `Signed Protocol Metadata` | Fixa quais as versões, schemas e vetores genuínos, e os seus digests — autentica a régua da medição | Não diz nada sobre nenhum operador |
| `Public Protocol Registry` | Índice público, verificável e replicável de manifests e evidência já auto-publicados | Não é lista de aprovação, não é whitelist, não é lista de licenças. Ver [PUBLIC_PROTOCOL_REGISTRY.md](./PUBLIC_PROTOCOL_REGISTRY.md) |
| `Trust Root` | Assina apenas o Manifesto de Chaves que endossa as chaves delegadas; os metadados do protocolo, as releases e as revogações são assinados por essas chaves delegadas, nunca pela raiz (INV-ROOT-004; ADR-025). Custódia por limiar, uso offline e auditável | Não autoriza operadores, não emite licença, não autoriza pagamentos, não movimenta fundos |
| `Delegated Signing Keys` | Chaves operacionais com âmbito limitado e validade limitada, endossadas por metadados assinados pela raiz | Não conferem estatuto a implementações |
| `Revocation List` | Mecanismo de segurança sobre material criptográfico comprometido ou retirado | Não é licença, não é sanção regulatória, não é juízo sobre conduta |
| Fail-closed | Postura de segurança: material em falta, inválido, expirado, revogado ou incompatível ⇒ não há interoperação | Não é veredicto sobre a legalidade, os direitos ou a conduta de ninguém |

**A avaliação é local a quem avalia.** O Operador A decide, sob a sua própria política e as suas próprias
obrigações regulatórias, com quem interopera. A BANZA publica as regras e os vetores; não toma — e não
pode tomar — essa decisão pelo Operador A.

---

## 2. O algoritmo — `Open Trust Evaluation`

O Operador A avalia o Operador B. Todos os inputs são públicos; todos os passos são computação; nenhum
passo é um pedido. Os passos estão ordenados para rejeição barata primeiro, mas a avaliação é uma
**conjunção**: tudo tem de se verificar.

1. **Obter/resolver a metadata do `Operator Manifest`.** Resolver a identidade para um
   `operator_manifest_url` através do índice do `Public Protocol Registry`, de um endereço `.well-known`
   ou de DNS, e obter os bytes do manifest. O índice localiza; não abona. *Não resolvível ⇒ fail-closed:
   não foi localizada evidência — o que não é uma rejeição da entidade.*
2. **Validar o schema do manifest.** Validar contra o schema da versão declarada, confirmar que o
   `operator_id` corresponde ao identificador que está a ser resolvido, e recalcular o
   `operator_manifest_hash` sobre os bytes obtidos. Prova que existe uma declaração bem formada e coerente
   e que os bytes avaliados são os bytes cujo hash foi calculado — nada mais. *Ausente, inalcançável,
   inválido, `operator_id` divergente ou hash divergente ⇒ fail-closed.*
3. **Verificar a compatibilidade de `protocol_version`.** Comparar a versão declarada com as versões que o
   verificador suporta, sob as regras públicas de compatibilidade
   ([OPEN_PROTOCOL_ARCHITECTURE.md](./OPEN_PROTOCOL_ARCHITECTURE.md) §1). Falar a mesma língua não é o
   mesmo que dizer nela alguma coisa verdadeira. *Em falta, não interpretável, ou versão maior fora do
   conjunto suportado ⇒ fail-closed. Sem parsing leniente, sem downgrade silencioso, sem "best effort".*
4. **Validar a `Signed Protocol Metadata`.** Resolver os metadados assinados da versão negociada — versão
   de especificação, digests dos vetores, versões dos validadores, regras de compatibilidade — e verificar
   a sua assinatura antes de os usar. Este passo autentica a régua, não o que está a ser medido: uma
   avaliação contra regras forjadas não vale nada, por muito bem que os outros nove passos corram. *Em
   falta, sem assinatura, assinatura inválida, expirada ou de chave desconhecida ⇒ fail-closed. O
   verificador nunca recorre a regras não assinadas ou localmente mutáveis.*
5. **Validar o hash e a versão da ferramenta da `Conformance Evidence`.** Obter o `Evidence Bundle`
   publicado, recalcular `conformance_report_hash`, `evidence_bundle_hash` e `manifest_hash`, confirmar
   `verified_by_tool_version` e `trust_root_version`, confirmar o estado, a versão e o âmbito da execução,
   e confirmar que os vetores usados correspondem aos digests fixados no passo 4 — evidência contra
   vetores desconhecidos ou não genuínos não é evidência. O bundle é assinado pelo Operador B com o
   material de chave que o manifest fixa. Qualquer verificador **pode** reexecutar os vetores públicos e
   **tem** de obter o mesmo relatório: a conformidade é rederivável, por qualquer parte, a partir de
   material público — nunca depende de uma afirmação acerca da entidade. *Ausente, hash divergente, não
   reproduzível, estado de falha, ou cobrindo outra `protocol_version` ⇒ fail-closed.*
6. **Consultar a entrada do `Public Protocol Registry`.** Ler a metadata indexada como **dados a
   verificar**, nunca como permissão concedida. O peso probatório de uma entrada é, por si só, exactamente
   zero: tudo o que ela afirma é um ponteiro para artefactos assinados que o verificador reverifica nos
   passos 2, 4 e 5. Qualquer parte pode reconstruir o mesmo índice a partir dos mesmos manifests públicos,
   e qualquer verificador pode ignorar o índice e verificar o operador directamente a partir do seu
   `operator_manifest_url`. *A ausência de uma entrada significa que não há evidência verificável indexada
   — nunca uma proibição regulatória.*
7. **Consultar a `Revocation List`.** Obter a lista assinada, versionada e datada, e verificar contra ela
   todas as chaves e artefactos de que a avaliação depende: material de chave do operador, chaves
   delegadas, releases, artefactos. A verificação corre localmente; não é uma chamada a um serviço central
   que possa responder *sim*. *Lista indisponível, sem assinatura, assinatura inválida, expirada ou mais
   antiga que a janela de política ⇒ material tratado como não confiável. Uma `Revocation List` que não
   pode ser verificada nunca pode ser lida como uma lista vazia: a ausência de resposta nunca é evidência
   de não-revogação.*
8. **Verificar a validade da `Delegated Signing Key`.** Confirmar que as assinaturas sobre metadados do
   protocolo, releases e revogações encadeiam até à `Trust Root` através de chaves delegadas que estão no
   âmbito daquilo que assinaram, não expiradas, presentes em metadados assinados pela raiz e não elas
   próprias revogadas; e que o threshold da raiz é satisfeito. Uma assinatura da `Trust Root` responde a
   exactamente uma pergunta — *este artefacto do protocolo é genuíno e íntegro?* — e nunca a *pode esta
   entidade participar?*. *Chave desconhecida, expirada, fora de âmbito ou revogada; threshold não
   satisfeito; metadados da raiz obsoletos ⇒ fail-closed.*
9. **Verificar a compatibilidade de endpoint e de capabilities.** Confirmar que cada capability exigida
   pela interacção pretendida está declarada no manifest **e** coberta por `Conformance Evidence` válida
   na versão compatível, e que os endpoints que a suportam estão expostos e correspondem ao contrato
   público — OpenAPI e schemas — na versão negociada. Uma capability declarada mas não coberta por
   evidência não prova absolutamente nada: declaração não é demonstração. A avaliação é por capability —
   uma que falhe não contamina as que passam. *Não declarada, sem evidência que a cubra, endpoint em
   falta, incompatível ou divergente do contrato ⇒ fail-closed para **essa** interacção. Sem sondagem de
   endpoints não declarados, sem adivinhar formatos, sem compensar divergências.*
10. **Fail-closed se qualquer material de confiança exigido estiver em falta, inválido, expirado, revogado
    ou incompatível.** É a meta-regra que governa os outros nove passos. A ausência de resposta nunca é
    tratada como resposta positiva; a incapacidade de verificar nunca é tratada como verificação. O
    verificador não interopera. Fail-closed é uma **postura de segurança sobre a evidência disponível ao
    verificador** — nunca um veredicto sobre uma pessoa ou uma empresa, nunca uma sanção, e nunca uma
    afirmação de que o operador não pode operar. A recuperação não precisa da permissão de ninguém: o
    operador republica material válido e a avaliação volta a correr.

**Veredicto.** Se os dez passos se verificarem, o Operador A **pode** interoperar com o Operador B, sob a
sua própria política. O veredicto é do Operador A, é rederivável por qualquer terceiro a partir dos mesmos
artefactos públicos, e é reavaliado à medida que o material muda.

### Frescura e janelas de validade

Cada peça de material de confiança traz uma janela de validade explícita — a `Conformance Evidence`, a
`Signed Protocol Metadata` e a `Revocation List` declaram a sua. O verificador aplica-as todas localmente,
e o tempo de vida efectivo da confiança é o **mínimo** das janelas em jogo. Verificadores **podem** adoptar
janelas mais estritas como política local, e **nunca** janelas mais permissivas do que o máximo do
protocolo.

As janelas protegem três propriedades de segurança: que uma afirmação não sobrevive à verificação que a
suporta, que material de chave comprometido deixa de ser útil em tempo limitado, e que a rotação é rotina
e não excepção. As três obtêm-se com uma janela de validade sobre a evidência, aplicada pelo verificador.
O caminho de recuperação pertence inteiramente ao operador: material **auto-publicado** cuja janela fecha
é sanado pelo próprio operador, reexecutando a automação pública e republicando. A participação continuada
não depende da disponibilidade — nem da vontade — de nenhum terceiro.

---

## 3. Fronteira — o que estes dez passos não são

Esta secção é normativa e permanente.

- **Nenhum passo é aprovação humana.** Não existe pessoa, fila, revisão, juízo ou decisão discricionária em
  nenhum ponto dos dez passos. Todos os passos são computação sobre bytes publicados. Nenhum passo humano
  pode converter um resultado de conformidade negativo num positivo, e nenhum passo humano é necessário
  para obter um positivo.
- **Nenhum passo é uma licença.** Licenças e autorizações são concedidas pelas entidades competentes ao
  operador. A BANZA não as emite, não as intermedeia e não é parte nessa relação. Um resultado positivo da
  `Open Trust Evaluation` não autoriza ninguém a prestar serviços financeiros.
- **Nenhum passo confere estatuto a uma implementação.** O resultado descreve uma implementação numa
  versão, no âmbito das capabilities declaradas, à data de uma execução. É reavaliável a qualquer momento
  e nunca é permanente. Não existe estatuto emitido, concedido, detido ou retirado — não existindo
  admissão, também não existe expulsão.
- **Nenhum passo permite à BANZA prestar serviços financeiros.** A BANZA é um protocolo financeiro aberto.
  Não presta serviços financeiros, não intermedeia, não detém e não movimenta fundos, e não é um prestador
  de serviços de pagamento. A `Open Trust Evaluation` descreve o que uma implementação faz; nunca afirma
  que um operador está autorizado a operar.
- **A responsabilidade é integralmente do operador.** Cada operador independente responde pelo seu próprio
  enquadramento legal, regulatório, financeiro e operacional. Quando é necessária autorização para prestar
  serviços financeiros, ela é concedida pelas entidades competentes — nunca pela BANZA.
- **Nenhuma parte detém autoridade sobre a participação.** Nem a BANZA, nem os `Protocol Maintainers`, nem
  o operador de referência, nem o registo, nem o BanzAI, nem um operador sobre outro. Não existe cadeia de
  autoridade sobre a participação para deter, delegar ou transmitir.

Estado actual, verificável directamente nas rotas públicas: `/operators` = `[]` e
`production_certificates` = `false`.

---

## Referências

- [ADR-025](../../decisions/adr/ADR-025-trust-without-a-certificate-authority.md) — modelo de confiança do protocolo aberto
- [ADR-031](../../decisions/adr/ADR-031-operator-self-publication-and-machine-verifiable-conformance.md) — auto-publicação e conformidade verificável por máquina
- [ADR-025](../../decisions/adr/ADR-025-trust-without-a-certificate-authority.md) — avaliação de confiança de federação
- [PUBLIC_PROTOCOL_REGISTRY.md](./PUBLIC_PROTOCOL_REGISTRY.md) — o índice público verificável
- [OPEN_PROTOCOL_GOVERNANCE.md](./OPEN_PROTOCOL_GOVERNANCE.md) — governação do protocolo aberto (canónico)
- [OPEN_PROTOCOL_ARCHITECTURE.md](./OPEN_PROTOCOL_ARCHITECTURE.md) — versões e regras de compatibilidade
- [OPERATOR_SELF_PUBLICATION_AND_CONFORMANCE.md](./OPERATOR_SELF_PUBLICATION_AND_CONFORMANCE.md) — auto-publicação do operador
- [EVIDENCE_BUNDLE.md](./EVIDENCE_BUNDLE.md) — `Evidence Bundle`
- [OPERATOR_MANIFEST_VALIDATION.md](./OPERATOR_MANIFEST_VALIDATION.md) — `Operator Manifest`
- [BANZA_TRUST_ARCHITECTURE.md](./BANZA_TRUST_ARCHITECTURE.md) — `Trust Root` e `Delegated Signing Keys`
- [BANZA_PROTOCOL_BOUNDARY.md](./BANZA_PROTOCOL_BOUNDARY.md) — fronteira protocolo/operador
- Contratos: `contracts/production/signed-protocol-metadata.production.schema.json`, `conformance-evidence.production.schema.json`, `public-protocol-registry.production.schema.json`, `revocation-entry.production.schema.json`, `delegated-signing-key.production.schema.json`, `trust-root-metadata.production.schema.json`

---

A federação BANZA encaminha por evidência verificável, nunca por permissão concedida.
