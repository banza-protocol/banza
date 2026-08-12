# M2.2 — Inventário do refactor arquitectural (BANZA CA → governação aberta)

Registo completo do sweep da arquitectura antiga, a decisão tomada por ocorrência, e o que fica para M2.3.

> **Decisão arquitectural canónica.** BANZA é um protocolo financeiro aberto. A participação de operadores
> no ecossistema não depende de uma autoridade humana central. Operadores independentes implementam o
> protocolo, publicam manifests e produzem evidência verificável de conformidade. A governação humana
> existe para manter e evoluir o protocolo, não para autorizar, certificar ou aceitar operadores.

Ver [OPEN_PROTOCOL_GOVERNANCE.md](OPEN_PROTOCOL_GOVERNANCE.md) (documento canónico) e
[OPEN_PROTOCOL_ARCHITECTURE.md](OPEN_PROTOCOL_ARCHITECTURE.md).

---

## 1. Classificação usada

| # | Decisão | Significado |
|---|---|---|
| 1 | **Remover** | O conceito desaparece; nada o substitui nesse ponto. |
| 2 | **Substituir** | Passa a um conceito da arquitectura nova. |
| 3 | **Histórico/depreciação** | Fica, marcado como removido — é o registo do que foi retirado. |
| 4 | **Teste negativo / denylist** | Fica porque o código tem de *detectar* o termo. |
| 5 | **Legacy de compatibilidade** | Rota/campo público que não se quebra já; semântica canónica aponta para o novo conceito. |

---

## 2. Termos encontrados (sweep completo do repositório)

Sweep por: `BANZA CA`, `Banza CA`, `CA`, `Certificate Authority`, `autoridade certificadora`,
`certificado`, `certificação`, `certified`, `certificate`, `operator certificate`,
`production certificate`, `certified operator`, `operador certificado`, `operador aceite`,
`operador aprovado`, `operator approved`, `operator accepted`, `authorised/authorized by BANZA`,
`licence`, `license`, `licença`, `approval`, `admission`, `operator admission`, `manual approval`,
`human approval`.

---

## 3. Migrado em M2.2 — status final: **CONCLUÍDO**

### 3.1 Engines Rust (arquitectura activa)

| Ficheiro | Termo encontrado | Decisão | Novo termo | Risco semântico | Status |
|---|---|---|---|---|---|
| `engines/banza-m2-protocol-gate/src/lib.rs` | `banza_ca_role_summary` (input obrigatório) | 2 Substituir | `protocol_governance_summary` | **Alto** — era um input obrigatório do gate M2: a CA era estrutural | ✅ |
| `engines/banza-m2-protocol-gate/src/lib.rs` | `operator_admission_flow_summary` | 2 Substituir | `operator_self_publication_summary` | **Alto** — «admissão» implica alguém que admite | ✅ |
| `engines/banza-m2-protocol-gate/src/lib.rs` | `M2_BLOCKED_BY_OPERATOR_ADMISSION_GAP` | 2 Substituir | `M2_BLOCKED_BY_OPERATOR_SELF_PUBLICATION_GAP` | Médio — estado público do gate | ✅ |
| `engines/banza-m2-protocol-gate/src/lib.rs` | `ca_is_not_regulator`, `banza_ca_role_present` | 2 Substituir | `governance_does_not_approve_operators`, `protocol_governance_present` | Médio | ✅ |
| `engines/banza-m2-protocol-gate/src/lib.rs` | sub-campos `candidate_package_documented`, `conformance_review_documented` | 2 Substituir | `manifest_documented`, `evidence_documented` | Médio — «candidatura»/«revisão» implicam aprovação | ✅ |
| `engines/banza-evidence-bundle/src/lib.rs` | `requires_banza_ca_review` (flag de fronteira) | 2 Substituir | `requires_conformance_evidence_review` | **Alto** — o bundle apontava a decisão final a uma autoridade | ✅ |
| `engines/banza-l1..l4-readiness/src/lib.rs` | `requires_banza_ca_review` + «A revisão real pertence à BANZA CA» | 2 Substituir | `requires_conformance_evidence_review` + «A conformidade demonstra-se por evidência verificável» | **Alto** | ✅ |
| `engines/banza-operator-manifest/src/lib.rs` | `requires_banza_ca_review` | 2 Substituir | `requires_conformance_evidence_review` | Médio | ✅ |
| `engines/banza-conformance/src/tool.rs` | `ready_for_banza_ca_review`, `READY_DISCLAIMER` («not certification»), «emissão pela BANZA CA» | 2 Substituir | `ready_for_conformance_evidence_review`, «Readiness is verifiable conformance evidence, not an approval», «evidência verificável de conformidade» | **Alto** | ✅ |
| `engines/banza-trust/src/tool.rs` | «A certificação é decisão da BANZA CA» | 2 Substituir | «A conformidade demonstra-se por evidência verificável, não por decisão humana central» | Médio | ✅ |
| `engines/banza-simb/src/scenario.rs` | «A revisão BANZA CA acontece fora do BanzAI Workbench» | 2 Substituir | «A conformidade demonstra-se por evidência verificável, não por aprovação humana central» | Médio | ✅ |
| `engines/banzai-evidence/src/lib.rs` | intent `banza_ca_role` («emite certificados») | 2 Substituir | intent `banza_ca_removed` (resposta de depreciação) | **Alto** — era a resposta pública sobre a CA | ✅ |
| `engines/banzai-evidence/src/lib.rs` | intent `banza_ca_not_regulator` | 2 Substituir | mesma chave, resposta reescrita: o BANZA não autoriza operadores de todo | **Alto** | ✅ |
| `engines/banzai-evidence/src/lib.rs` | ~15 respostas com «a revisão real pertence à BANZA CA» | 2 Substituir | evidência verificável / sem aprovação humana central | **Alto** — superfície pública | ✅ |
| `engines/banzai-evidence/src/index.rs` | «a BANZA CA certifica» (papéis do ecossistema) | 2 Substituir | «a Protocol Governance mantém o protocolo» | Médio | ✅ |
| `engines/banza-open-governance/src/lib.rs` | `CA_FIELD_NAMES`, `CA_PHRASES`, `CERTIFICATE_*`, `HUMAN_APPROVAL_*` | 4 Denylist | — | Nenhum — o motor tem de detectar os termos | ✅ |
| `engines/banza-open-governance/tests/` | `"BANZA CA"` em fixtures/asserts | 4 Teste negativo | — | Nenhum | ✅ |

### 3.2 Contracts / schemas

| Ficheiro | Decisão | Novo termo | Status |
|---|---|---|---|
| `contracts/production/certificate.production.schema.json` | 3 Histórico/depreciação | `deprecated: true`, `replacement_schema: conformance-evidence.production.schema.json`, `not_authorisation/not_certificate/not_operator_approval/not_payment_service_authorisation: true` | ✅ |
| `contracts/production/operator-admission.production.schema.json` | 3 Histórico/depreciação | `deprecated: true`, `replacement_schema: operator-self-publication.production.schema.json` + as mesmas flags | ✅ |
| `contracts/production/conformance-evidence.production.schema.json` | 2 Substituir (novo) | canónico | ✅ |
| `contracts/production/operator-self-publication.production.schema.json` | 2 Substituir (novo) | canónico | ✅ |
| `contracts/production/public-protocol-registry.production.schema.json` | 2 Substituir (novo) | índice público, **não** lista de aprovação | ✅ |
| `contracts/production/signed-protocol-metadata.production.schema.json` | 2 Substituir (novo) | canónico | ✅ |
| `contracts/production/protocol-governance-event.production.schema.json` | 2 Substituir (novo) | canónico | ✅ |
| `contracts/production/revocation-entry.production.schema.json` | 2 Substituir (novo) | revogação = sinal de segurança | ✅ |
| `contracts/production/trust-root-metadata.production.schema.json` | 2 Substituir (novo) | canónico | ✅ |
| `contracts/production/delegated-signing-key.production.schema.json` | 2 Substituir (novo) | canónico | ✅ |

Nenhum schema novo depende de BANZA CA. Todos carregam o objecto de fronteira
(`not_operator_authorisation`, `not_certificate`, `not_operator_approval`,
`not_payment_service_authorisation`, `open_financial_protocol`).

### 3.3 Workbench e adaptadores

| Ficheiro | Termo | Decisão | Status |
|---|---|---|---|
| `website/components/banzai/BanzaiChat.tsx` | `GATE_RULE` «antes de qualquer revisão real pela BANZA CA» | 2 Substituir → «antes de publicar evidência verificável de conformidade» | ✅ |
| `website/components/banzai/BanzaiChat.tsx` | passo «Revisão BANZA CA» no fluxo | 2 Substituir → «Publicar evidência» | ✅ |
| `website/components/banzai/BanzaiChat.tsx` | «relação com BANZA CA: …» (4 cartões) | 2 Substituir → «governação aberta: …» | ✅ |
| `website/components/banzai/BanzaiChat.tsx` | `Operator Admission` (cartão do gate M2) | 2 Substituir → `Operator Self-Publication` | ✅ |
| `website/lib/banzaM2ProtocolGate.ts` | `operator_admission`, `banza_ca_role_summary` | 2 Substituir | ✅ |
| `website/lib/banzaEvidenceBundle.ts`, `banzaL1..L4Readiness.ts`, `banzaOperatorManifest.ts`, `banzaConformance.ts` | `requires_banza_ca_review`, `ready_for_banza_ca_review` | 2 Substituir | ✅ |

### 3.4 Documentos e diagramas novos

Criados: `OPEN_PROTOCOL_GOVERNANCE.md`, `PROTOCOL_GOVERNANCE_ROLES.md`,
`OPERATOR_SELF_PUBLICATION_AND_CONFORMANCE.md`, `PROTOCOL_SUCCESSION_AND_SURVIVAL.md`,
`LEGACY_CERTIFICATES_ROUTE_COMPATIBILITY.md`, `OPEN_PROTOCOL_ARCHITECTURE.md`,
e os diagramas `open-protocol-governance-v1.svg`, `operator-self-publication-flow-v1.svg`,
`trust-root-v1.svg`, `protocol-survival-model-v1.svg` (nenhum menciona CA, certificado ou aprovação humana).

---

## 4. Legacy de compatibilidade — status final: **MANTIDO, MARCADO**

| Item | Decisão | Porquê | Semântica canónica |
|---|---|---|---|
| Rota pública `/certificates` | 5 Legacy | Rota pública existente; não se quebra sem plano | `conformance evidence` → `/conformance/evidence`. Ver [LEGACY_CERTIFICATES_ROUTE_COMPATIBILITY.md](LEGACY_CERTIFICATES_ROUTE_COMPATIBILITY.md) |
| `production_certificates=false` | 5 Legacy | Campo público consumido; permanece `false` | Não muda em M2.2 |
| `/operators=[]` | — | Não muda em M2.2 | — |
| `docs/governance/PHASE_*.md` (relatórios de fase antigos) | 3 Histórico | São o registo do que foi feito à data | Não editados |
| `docs/governance/PHASE_BX1_4_…md` (`ready_for_banza_ca_review`) | 3 Histórico | Regista o nome do campo à data da fase BX1.4 | Campo activo já renomeado |

---

## 5. PENDENTE M2.3 — status final: **NÃO MIGRADO (deliberado, com plano)**

Estas superfícies **não** foram migradas em M2.2 por uma razão substantiva, não por omissão: nelas o
certificado **não é linguagem — é mecanismo do protocolo**. O reference define a *Verificação Tripla* da
federação como «Registo Público + certificado válido + ausência do BRL», e o ADR-027 define a CA como um
processo *human-gated* que aprova certificados. Retirar isso é **redesenhar o modelo de confiança da
federação**, e por [ADR-005](../../decisions/adr/ADR-005-protocol-first-product-development.md)
(protocol-first) uma mudança protocolar nasce primeiro num ADR — não numa edição de texto.

| Ficheiro | Ocorrências | Natureza | Decisão M2.3 |
|---|---|---|---|
| `website/content/BANZA_REFERENCIA.md` | 169 | Spec pública canónica: Verificação Tripla, emissão/renovação de certificados, processo de submissão, cadeia de autoridade, Registo Público de operadores certificados | 2 Substituir (redesenho) |
| `docs/reference/pt/completa.md` | 169 | Espelho PT do reference | 2 Substituir (paridade) |
| `docs/reference/en/complete.md` | 63 | Versão EN do reference | 2 Substituir (paridade) |
| `website/content/decisions/adr/ADR-022-CERTIFICATION-LEVEL-ARCHITECTURE.md` | — | Define a arquitectura de níveis de certificação | **Supersede** por ADR novo |
| `website/content/decisions/adr/ADR-026-FEDERATION-TRUST-MODEL.md` | — | «there is a mandatory human approval step at BANZA» | **Supersede** — é a origem do gatekeeper humano |
| `website/content/decisions/adr/ADR-027-PRODUCTION-ROOT-ARCHITECTURE.md` | — | «BANZA Certification Authority \| Human-gated process \| approves certificates» | **Supersede** |
| `website/app/*` (≈12 páginas: `certificacao`, `operadores`, `confianca`, `federacao`, `o-que-e`, `estado`, `page.tsx`, …) | ≈60 | Copy pública que reflecte o reference | 2 Substituir (depois do reference, para não divergir) |
| `README.md` | 12 | «BANZA CA = Certification Authority (certifies)» | 2 Substituir |
| `docs/reference/diagrams/en/*.svg` (trust-chain, ecosystem-roles, certification-levels) | 4 | Diagramas do reference antigo | 2 Substituir |
| `contracts/production/README.md`, `contracts/federation/operator-certificate.json` | — | Descrevem certificate/admission como activos | 2 Substituir |

**Plano M2.3 (ordem obrigatória):**

1. ADR novo — *Open Protocol Trust & Participation Model* — que **supersede ADR-022, ADR-026, ADR-027** e
   redefine a Verificação Tripla sem certificado: **Public Protocol Registry + Conformance Evidence
   verificável (`manifest_hash` + `conformance_report_hash` + `evidence_bundle_hash`, sob
   `signed protocol metadata` assinado pela Trust Root) + ausência da Revocation List**.
2. Migrar `BANZA_REFERENCIA.md` e manter paridade byte-a-byte com `docs/reference/pt/completa.md`.
3. Migrar `docs/reference/en/complete.md`.
4. Migrar as páginas `website/app/*` e o `README.md` (derivam do reference — só depois dele).
5. Substituir os SVGs do reference (trust-chain, ecosystem-roles, certification-levels).
6. Migrar `contracts/production/README.md` e `contracts/federation/operator-certificate.json`.
7. Alargar o `SURFACES` do guard `tools/check-open-governance.sh` a `website/content`, `website/app`,
   `docs/reference` e `README.md`, e confirmar zero NEEDS_FIX.

Enquanto M2.3 não aterrar, o guard cobre apenas as superfícies migradas — o `SURFACES` do script nomeia
explicitamente o que fica pendente, para que a lacuna seja legível e não silenciosa.

---

## 6. Critério de aceitação — M2.2

| Critério | Estado |
|---|---|
| Zero uso activo de BANZA CA como autoridade de operadores **nos engines** | ✅ (única menção: a resposta de depreciação + a denylist do motor) |
| Zero uso activo no **Workbench** | ✅ (`make open-governance-check`) |
| Schemas novos não dependem de BANZA CA | ✅ |
| Estados/gates decididos em Rust, nunca em TypeScript | ✅ |
| Nenhum SVG novo mostra CA / certificado / aprovação humana | ✅ |
| Guard `open-governance-check` com self-test, no CI | ✅ |
| `/operators=[]`, `production_certificates=false`, `llm_calls=0` | ✅ (inalterados) |
| Zero uso activo no **reference público e nos ADRs** | ⏳ **M2.3** (secção 5) |
