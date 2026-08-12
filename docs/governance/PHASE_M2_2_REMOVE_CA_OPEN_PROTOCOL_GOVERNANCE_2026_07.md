# Fase M2.2 — Remoção da BANZA CA e adopção de governação de protocolo aberto (2026-07)

Relatório da fase que remove o conceito «BANZA CA» como entidade humana de autorização, aceitação ou
certificação de operadores, e adopta governação de protocolo financeiro aberto.

---

## 1. Decisão arquitectural

> **BANZA é um protocolo financeiro aberto. A participação de operadores no ecossistema não depende de uma
> autoridade humana central. Operadores independentes implementam o protocolo, publicam manifests e
> produzem evidência verificável de conformidade. A governação humana existe para manter e evoluir o
> protocolo, não para autorizar, certificar ou aceitar operadores.**

Documento canónico: [OPEN_PROTOCOL_GOVERNANCE.md](OPEN_PROTOCOL_GOVERNANCE.md).
Modelo de governação aberta + mapeamento de termos: [OPEN_PROTOCOL_GOVERNANCE.md](OPEN_PROTOCOL_GOVERNANCE.md).
Arquitectura em camadas: [OPEN_PROTOCOL_ARCHITECTURE.md](OPEN_PROTOCOL_ARCHITECTURE.md).

## 2. Porque a BANZA CA foi removida

Uma «autoridade certificadora» sugere que alguém, do lado do BANZA, decide quem pode fazer parte do
protocolo. Isso contradiz um protocolo financeiro aberto de três formas:

1. **Cria um gatekeeper humano** onde o protocolo devia ter regras públicas e verificação por máquina.
2. **Concentra o ecossistema numa equipa** — se a equipa desaparecer, ninguém entra; o protocolo morre com
   os fundadores.
3. **Confunde-se com autorização regulatória** — «certificado pela BANZA» lê-se como permissão para prestar
   serviços financeiros, que o BANZA não pode dar e nunca deu.

A conformidade é uma medição reproduzível, não uma decisão. Nada no protocolo exige que uma pessoa aprove.

## 3. Nova arquitectura

| Camada | Papel |
|---|---|
| BANZA Protocol | specs, RFCs, ADRs, schemas, OpenAPI, versionamento, regras de compatibilidade |
| Reference Implementation | open source, engines Rust, WASM, CLI, Workbench |
| Conformance Automation | validators, testes, fixtures, relatórios, estado verificável por máquina |
| Conformance Evidence | operator manifests, traces, relatórios, hashes, assinaturas, evidence bundles |
| Trust Root | assina metadados do protocolo, releases, chaves delegadas, revogações |
| Revocation Layer | revocation list, fail-closed — sinal de segurança, não acto regulatório |
| Protocol Governance | maintainers, RFC process, ciclo de versões, resposta de segurança, sucessão |
| Operators | entidades independentes; implementam, publicam evidência, assumem o seu enquadramento |

## 4. Novo modelo de operadores

Sem admissão. O operador implementa → publica manifest → corre conformance tests → publica conformance
evidence → publica endpoints compatíveis → qualquer pessoa verifica. Revogação/fail-closed aplica-se só a
risco de segurança/confiança/protocolo. Ver
[OPERATOR_SELF_PUBLICATION_AND_CONFORMANCE.md](OPERATOR_SELF_PUBLICATION_AND_CONFORMANCE.md).

## 5. Novo papel dos humanos

Humanos mantêm o protocolo vivo: specs, versões, RFCs, segurança, bugs, criptografia, documentação,
tooling, emergência. Papéis permitidos: Protocol Maintainer, Security Maintainer, Specification Editor,
Release Steward, Trust Root Custodian, Conformance Tool Maintainer, Community Reviewer. Papéis proibidos:
Operator Approver, Operator Certifier, Payment Service Authoriser, Regulatory Approver, Human Gatekeeper.
Ver [PROTOCOL_GOVERNANCE_ROLES.md](PROTOCOL_GOVERNANCE_ROLES.md).

## 6. Novo papel da Trust Root

Assina metadados do protocolo, releases, chaves delegadas e revogações. **Não** autoriza pagamentos, **não**
cria operadores, **não** emite licença, **não** certifica operadores. A raiz 2-de-3 da M2.1 mantém-se
válida — passa a estar ligada à **Trust Root**, nunca a uma CA.

## 7. Sucessão

Ver [PROTOCOL_SUCCESSION_AND_SURVIVAL.md](PROTOCOL_SUCCESSION_AND_SURVIVAL.md). Um protocolo financeiro
aberto bem desenhado não deve depender da equipa que o criou para continuar a existir.

---

## 8. O que mudou

### Engine novo — `engines/banza-open-governance`

`validate_open_governance` calcula **em Rust** o estado da governação aberta e detecta estruturalmente,
percorrendo todo o input: dependência de autoridade central (`ca_dependency_detected`), aprovação humana de
operador (`human_operator_approval_detected`), semântica de certificado (`certificate_semantics_detected`) e
afirmação de rede permissionada. Validação **local — sem rede**.

- **10 estados**: `OPEN_GOVERNANCE_VALID`, `_INCOMPLETE`, `_BLOCKED_BY_CA_DEPENDENCY`,
  `_BLOCKED_BY_HUMAN_OPERATOR_APPROVAL`, `_BLOCKED_BY_CERTIFICATE_SEMANTICS`,
  `_BLOCKED_BY_MISSING_CONFORMANCE_AUTOMATION`, `_BLOCKED_BY_MISSING_OPERATOR_SELF_PUBLICATION`,
  `_BLOCKED_BY_MISSING_SUCCESSION_MODEL`, `_INVALID_REGULATORY_BOUNDARY`,
  `_INVALID_PERMISSIONED_NETWORK_CLAIM`.
- **9 fixtures** (`TEST ONLY — NOT PRODUCTION — NO OPERATOR APPROVAL`).
- **34 testes**; input malformado **fail-closed** (nunca VALID).
- Exports WASM: `open_governance_validate_json`, `_demo_fixtures_json`, `_schema_json`, `_tool_version_json`.

**Distinção uso/menção.** O subtree `deprecated_ca_inventory` é o único sítio onde os termos removidos são
nomeados de propósito — é o registo do que foi removido. Está isento do scan de termos e é, em vez disso,
verificado: uma entrada ainda marcada como *activa* conta como dependência real. O scan de termos é
delimitado por fronteira de palavra, para «capabilities» ou «cadastro» não dispararem «CA».

### Engines alterados

| Engine | Mudança |
|---|---|
| `banza-m2-protocol-gate` | `banza_ca_role_summary` → `protocol_governance_summary`; `operator_admission_flow_summary` → `operator_self_publication_summary`; `M2_BLOCKED_BY_OPERATOR_ADMISSION_GAP` → `M2_BLOCKED_BY_OPERATOR_SELF_PUBLICATION_GAP`; novas flags `central_operator_authority=false`, `human_operator_approval_required=false`, `operator_participation_permissionless=true`, `humans_maintain_protocol_not_operators=true` |
| `banza-evidence-bundle` | artefacto `open_governance_report` + `open_governance_summary` + hash + tool version; `requires_banza_ca_review` → `requires_conformance_evidence_review`; demo constrói um relatório real a partir do motor |
| `banza-l1..l4-readiness`, `banza-operator-manifest` | `requires_banza_ca_review` → `requires_conformance_evidence_review`; «a revisão real pertence à BANZA CA» → evidência verificável |
| `banza-conformance` | `ready_for_banza_ca_review` → `ready_for_conformance_evidence_review`; disclaimer → «Readiness is verifiable conformance evidence, not an approval» |
| `banza-trust`, `banza-simb` | fronteira reescrita sem CA |
| `banzai-evidence` | ver §9 |

### Contracts / schemas

8 schemas canónicos novos + 2 deprecados (com `deprecated_reason`, `replacement_schema`,
`not_authorisation`, `not_certificate`, `not_operator_approval`, `not_payment_service_authorisation`).
Ver o inventário, §3.2. Nenhum schema novo depende de BANZA CA.

### Evidence Bundle

Aceita `open_governance_report`, com disclaimer obrigatório: *«Open governance report confirma a
arquitectura de protocolo financeiro aberto. Não é autorização de operador, não é certificação, não é
licença e não permite prestação de serviços financeiros pelo BANZA.»* O M2 Protocol Gate e a M2.1 Root
Ceremony continuam; a root ceremony está ligada à **Trust Root**, não a uma CA.

### Assistente (BanzAI)

Intents novos: `banza_ca_removed`, `who_accepts_operators`, `operator_participation`,
`open_governance_humans`, `trust_root_role`, `protocol_survival`. O `banza_ca_role` («emite certificados»)
foi substituído pela resposta de depreciação; `banza_ca_not_regulator` foi reescrito («o BANZA não autoriza
operadores — nem técnica, nem regulatoriamente»). Seis casos fixados em `kb.rs`. Sem «corpus», sem «KB»
público, sem «protocolo técnico» como formulação principal.

### Workbench

Secção **M2.2 · Open Protocol Governance**, entre M2.1 e o histórico L0–L4. Botão «Validar open
governance», selector com as 9 fixtures, cartões de detecção (CA / aprovação humana / certificado), 8
cartões da nova arquitectura, blocked items, termos deprecados (riscados, sempre como registo) e o estado
calculado em Rust. Textos obrigatórios presentes. Adaptador `banzaOpenGovernance.ts` é load+marshal +
`*Tone` render-only — o TypeScript não decide estado.

### Guard

`make open-governance-check` (`tools/check-open-governance.sh`), no CI (`identity-guard.yml`). Bloqueia a
autoridade central removida, semântica de certificado de operador, aprovação humana/gatekeeper, afirmação
de rede permissionada e «corpus»/«KB» público. Faz **self-test das próprias regex** em cada execução (sai 2
se a lógica partir). Permite denylist, testes negativos, depreciação, histórico e legacy marcado, pela
distinção uso/menção (uma linha de tabela que *cita* o termo entre aspas não é arquitectura activa).

### SVGs

Novos: `open-protocol-governance-v1.svg` (SVG-P-058), `operator-self-publication-flow-v1.svg` (059),
`trust-root-v1.svg` (060), `protocol-survival-model-v1.svg` (061) — em `docs/diagrams/` e
`website/public/diagrams/protocol/` (bytes idênticos), registados em `BANZA_SVG_REGISTRY.md`. Nenhum mostra
CA, certificate authority, certificado, aprovação humana ou gatekeeper. Sem raster, sem base64, sem links
externos. `trust-root-v1.svg` não usa «CA» de todo. Uma colisão real de ID (052, já pertencente a
`banza-decision-risk-matrix-v1.svg`) foi detectada e corrigida para o slot livre 060.

---

## 9. Testes

- **Rust**: 18/18 engines verdes, 298 testes. `banza-open-governance` 34 (fixture→estado, as quatro
  detecções, precedência, fail-closed, flags de fronteira, determinismo/hash, schema/tool version, mais 5
  regressões dos fail-opens da §9b).
- Pinos específicos: a inventário de depreciação a nomear «BANZA CA» **não** é dependência; uma entrada
  activa **é**; o scan não dá falso positivo em «capabilities»/«cadastro»; a fronteira regulatória
  sobrepõe-se a tudo.
- **Website**: 129 vitest (13 novos), tsc limpo, `next build` OK.
- **Guards**: private-key-leak, open-governance, regulatory, identity, purity, invariant, rust-rule,
  rust-engine, rust-final-closure, conformance-rs, simb-rs, reference-svg — todos PASS.
- O guard foi verificado nos dois sentidos: falha com uma violação injectada, passa quando limpa.

## 9b. Revisão adversarial — o que encontrou e o que foi corrigido

Uma revisão adversarial de três lentes (correcção da detecção, solidez do guard, fronteira e coerência)
levantou 18 achados; 11 sobreviveram a uma verificação céptica que os reproduziu por execução. Não foram
achados de estilo — eram **fail-opens reais no motor**. Todos corrigidos, cada um com um teste de
regressão que falha sem a correcção.

| # | Achado | Porque importava | Correcção |
|---|---|---|---|
| 1 | **Crítico** — `walk()` recursava para dentro de arrays mas nunca invocava o callback nos ELEMENTOS. Todo o scan de frases era cego a strings dentro de arrays. | `roles[]`, `layers[]` e `fields[]` são a forma idiomática do próprio schema — e `roles[]` é exactamente onde um papel proibido seria declarado. Um pacote com `roles: ["Human Gatekeeper", "Operator Approver"]` devolvia `OPEN_GOVERNANCE_VALID`. | `strings()` passou a ter recursão própria (String/Array/Object) em vez de passar pelo callback por chave de `walk()`. Testes: `a_forbidden_role_declared_in_an_array_is_detected`, `a_ca_phrase_in_an_array_element_is_detected`. |
| 2 | **Alto** — a isenção de `deprecated_ca_inventory` era aplicada por NOME DE CHAVE a qualquer profundidade, mas a verificação compensatória de `status` só lia a chave de topo. | Bastava aninhar `architecture_summary.deprecated_ca_inventory` para esconder arquitectura viva (CA activa, aprovação humana, `certificate_id`, rede permissionada) de todas as quatro detecções. | A isenção passou a ser aplicada UMA vez, no topo, removendo a chave de uma cópia de scan. Uma ocorrência aninhada é agora scanada como qualquer outro campo. Teste: `a_nested_deprecated_inventory_key_does_not_exempt_a_subtree`. |
| 3 | **Alto** — `present()` só prova que a chave contém um objecto; `{}` passava. | Um pacote podia entregar trust root / revogação / maintainers / governação / arquitectura VAZIOS e chegar a `VALID` sem artefactos em falta. | Gates novos exigem os factos documentados de cada um; em falta ⇒ `INCOMPLETE` com o artefacto nomeado. Testes: `empty_summary_objects_are_incomplete_not_valid`, `a_trust_root_that_claims_operator_authority_is_not_valid`. |
| 4 | Médio — o M2 gate nomeava `operator_admission_flow` nos blocked items, um input que já não lê. | Mensagem enganosa apontava a um campo inexistente. | Passou a `operator_self_publication_summary`. |
| 5 | Médio — o guard tinha `SURFACES` sem `engines/banzai-evidence`, apesar de dizer proteger as respostas públicas do Assistente. | Lacuna entre o que o guard afirmava cobrir e o que cobria. | Documentado porque não é scaneado (a fonte é um router de intents: os termos removidos estão lá como *keywords* de matching — uma deny-list, que o guard tem de permitir). As respostas reais são fixadas por 68 testes Rust, incluindo `boundary.rs` a exigir que uma recusa **não** nomeie a autoridade removida — um teste executado sobre o output real é mais forte do que um grep sobre a fonte. |
| 6 | Médio — o check de `corpus`/`KB` tinha regredido para um único directório. | Cobria menos do que declarava. | Repõe `website/content`, `website/app`, `website/components`. |
| 7 | Alto (guard) — o allowlist era por LINHA: um `?` ou um `não` em qualquer ponto da linha ilibava uma afirmação afirmativa noutro ponto. `substitui`/`replaced` contavam como marcadores de depreciação. | «Quem certifica os operadores? A BANZA certifica operadores.» e «Um operador certificado consta do registo e substitui o fluxo anterior.» escapavam. | Allowlist passou a ser por CLÁUSULA: o marcador tem de estar junto ao termo (antes dele, ou entre sujeito e verbo). `substitu`/`replaced` deixaram de ser marcadores — depreciação afirma-se, não se insinua. A regra de menção passou a exigir aspas de abertura *e* fecho e nunca atravessa um `|` (uma célula não iliba a seguinte), e só se aplica a markdown: em código, toda a string é citada, logo a citação não prova nada. |

**Três defeitos que só o CI apanhou.** Valem o registo porque a causa é a mesma nos três: uma verificação
que passa na máquina local por uma razão que não existe no CI.
1. `docs/architecture/` é um **directório de docs proibido** pelo purity guard (decisão da consolidação de
   docs). O `make purity-check` é conduzido por `git ls-files`, por isso passou enquanto o ficheiro estava
   untracked; o commit expô-lo. A especificação da fase pedia esse caminho — mas não se abre um buraco num
   invariante existente por conveniência: o documento passou para `docs/governance/`, com os seus irmãos.
2. Os padrões acentuados do guard usavam bracket expressions (`aprova[çc][ãa]o`, `certifica[çc][ãa]o`). O
   grep do macOS (BSD) **nunca** faz match de um bracket com um caractere multibyte — os padrões estavam
   mortos localmente e só dispararam no CI (GNU grep). O próprio cabeçalho do guard já avisava disto para o
   «não» e mesmo assim caí nele. Passaram a alternações completas, com um probe de paridade no self-test.
3. O `private-key-leak-check` (também conduzido por `git ls-files`) disparou no SVG novo da Trust Root, que
   enumerava «no private key, seed, mnemonic or passphrase is ever published» — a fronteira correcta, dita
   pela negativa, mas o guard só vê o token. Reescrita a legenda; não se enfraquece um guard de segurança
   para acomodar prosa.

**Como foi apanhado.** O browser E2E encontrou o primeiro (um chip do Workbench ainda dizia «Estou pronto
para revisão BANZA CA?», ilibado pelo `?` no allowlist); a revisão adversarial encontrou os restantes,
plantando mutações contra o guard. O guard tem hoje um **self-test que corre em cada execução** com essas
mesmas mutações como probes: apanha 8/8 (antes 2/6) com 0 falsos positivos nas frases canónicas, e sai 2 se
a própria lógica se partir.

**Postura honesta sobre o guard.** É um *text linter* — defesa em profundidade, não a autoridade. Três
rondas de buracos provaram que lógica semântica em grep de linha é frágil. A verificação autoritativa e
verificável por máquina é o motor Rust (34 testes) e as suites de cada engine.

## 10. Âmbito — o que fica para M2.3

O reference público (3004 linhas ×2 + EN), ≈12 páginas `website/app`, o `README.md` e os ADR-022/026/027
**não** foram migrados. Não é omissão: aí o certificado é **mecanismo do protocolo** (a Verificação Tripla
da federação é «Registo Público + certificado válido + ausência do BRL») e o ADR-027 define a CA como
processo *human-gated*. Removê-lo é redesenhar o modelo de confiança da federação — e por
[ADR-005](../../decisions/adr/ADR-005-protocol-first-product-development.md) uma mudança protocolar nasce
primeiro num ADR, não numa edição de texto.

O plano detalhado, ficheiro a ficheiro, está no
[inventário §5](M2_2_ARCHITECTURE_REFACTOR_INVENTORY.md#5-pendente-m23--status-final-não-migrado-deliberado-com-plano).
O `SURFACES` do guard nomeia explicitamente o que fica pendente, para que a lacuna seja legível e não
silenciosa.

---

## 11. Confirmações negativas

Nesta fase **não** se criou operador, **não** se aceitou operador, **não** se aprovou operador, **não** se
certificou operador, **não** se emitiu certificado, **não** se emitiu licença, **não** se activou federação
real, **não** se activou integração externa real, **não** se processaram pagamentos, **não** se liquidaram
valores, **não** se movimentaram fundos e **não** se detiveram fundos.

`/operators` permanece `[]`. `production_certificates` permanece `false`. Nenhuma private key real foi
gerada. Não se tocou em `.env`, DNS, Cloudflare, TLS, Postgres ou secrets. Nenhum provider real foi
activado (mock; sem Qwen, sem DeepSeek). `llm_calls = 0`, `external_model_called = false`. Deploy
website-only.

O BANZA continua um protocolo financeiro aberto. A governação humana mantém o protocolo; não controla quem
pode ou não implementar o protocolo.
