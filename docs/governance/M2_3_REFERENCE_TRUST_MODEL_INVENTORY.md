# M2.3 — Inventário do reference e dos ADRs (trust model sem CA/certificado)

Registo do sweep da pendência deliberada de M2.2, a decisão por grupo, e o status final.

> **Decisão arquitectural canónica.** BANZA é um protocolo financeiro aberto. A participação de operadores
> não depende de uma autoridade humana central, certificado emitido pela BANZA ou aprovação humana.
> Operadores independentes implementam o protocolo, publicam manifests, expõem endpoints compatíveis e
> produzem evidência verificável de conformidade. O trust do protocolo é baseado em signed protocol
> metadata, conformance evidence, public protocol registry, trust root, delegated signing keys e
> revocation/fail-closed.

Ver [ADR-038](../../decisions/adr/ADR-038-open-protocol-trust-model-without-ca.md),
[ADR-039](../../decisions/adr/ADR-039-operator-self-publication-and-machine-verifiable-conformance.md),
[ADR-040](../../decisions/adr/ADR-040-federation-trust-evaluation-without-certificates.md),
[FEDERATION_TRUST_MODEL.md](FEDERATION_TRUST_MODEL.md) e
[PUBLIC_PROTOCOL_REGISTRY.md](PUBLIC_PROTOCOL_REGISTRY.md).

---

## 1. Ponto de partida — a pendência de M2.2

M2.2 removeu a BANZA CA da **arquitectura activa** (engines, Workbench, Assistente, schemas, guard) e
deixou explicitamente pendente o **modelo de protocolo profundo**, registado em
[M2_2_ARCHITECTURE_REFACTOR_INVENTORY.md §5](M2_2_ARCHITECTURE_REFACTOR_INVENTORY.md). A razão era
substantiva: no reference e nos ADR-022/026/027 o certificado **não é linguagem — é mecanismo**. O
reference definia o encaminhamento de federação como

> Verificação Tripla = Registo Público + certificado válido + ausência do BRL

e o ADR-027 definia a CA como um processo *human-gated* que aprova certificados. Remover isso é
**redesenhar o modelo de confiança da federação** — e por [ADR-005](../../decisions/adr/ADR-005-protocol-first-product-development.md)
(protocol-first) uma mudança protocolar nasce primeiro num ADR, não numa edição de texto. É o que M2.3 faz.

## 2. Classificação usada

| # | Decisão | Significado |
|---|---|---|
| 1 | **Active protocol mechanism — redesign** | O certificado/CA é maquinaria de trust; tem de ser substituído. |
| 2 | **Historical/superseded ADR** | Fica intacto, com Status e banner de supersessão. |
| 3 | **Legacy compatibility route** | Rota pública que não se quebra; reenquadrada. |
| 4 | **Negative test / denylist** | Fica porque o código tem de *detectar* o termo. |
| 5 | **Public copy — rewrite** | Texto público que reflectia o modelo antigo. |
| 6 | **Schema/API field** | Migrar ou deprecar com flags. |
| 7 | **SVG/diagram — redraw** | Diagrama do modelo antigo. |

## 3. Sweep — ocorrências por termo (superfícies activas)

Sweep sobre `website/content`, `docs/reference`, `decisions`, `README.md`, `contracts`, `spec`,
`conformance` (`*.md`, `*.json`, `*.yaml`).

| Termo | Ocorrências |
|---|---:|
| `BANZA CA` | 288 |
| `operator certificate` | 92 |
| `operador certificado` | 80 |
| `certified operator` | 52 |
| `production certificate` | 38 |
| `valid certificate` | 31 |
| `certificado válido` | 18 |
| `verificação tripla` | 18 |
| `certificado de produção` | 17 |
| `Certification Authority` | 13 |
| `certificate_id` | 7 |
| `operator admission` | 4 |
| `human-gated` | 4 |
| `human approval` | 2 |
| `triple verification` | 1 |
| `Certificate Authority` | 1 |

**53 ficheiros afectados** (≈27 únicos — ADRs e o reference PT são espelhados).

## 4. Decisão por grupo

| Grupo | Ficheiros | Decisão | Nova semântica | Risco se não mudasse |
|---|---|---|---|---|
| **Reference público PT** | `website/content/BANZA_REFERENCIA.md` (3004 linhas) + espelho `docs/reference/pt/completa.md` | 1 Redesign + 5 Rewrite | Open Trust Evaluation (10 verificações, fail-closed); registo = índice verificável; revogação = sinal de segurança | **Crítico** — a spec pública continuaria a definir o encaminhamento por certificado emitido pela BANZA, contradizendo o protocolo aberto e lendo-se como permissão regulatória |
| **Reference público EN** | `docs/reference/en/complete.md` (1476 linhas) | 1 + 5 | paridade com o PT | Alto — divergência entre versões da mesma spec |
| **ADR-022** | `decisions/adr/` + espelho | 2 Superseded (parte de trust/certificado) | ADR-038 | Alto — doutrina viva |
| **ADR-026** | `decisions/adr/` + espelho | 2 Superseded (integral) | ADR-038 + ADR-040 | **Crítico** — é a origem do «mandatory human approval step at BANZA» |
| **ADR-027** | `decisions/adr/` + espelho | 2 Superseded (parte CA/human-gated; arquitectura da raiz mantém-se) | ADR-038 | Alto — define a CA como processo human-gated |
| **Docs de referência** | `manifesto.md`, `overview.md`, `getting-started.md`, `conformance.md`, `BANZA_TERMINOLOGY_PT.md` | 5 Rewrite (a terminologia passa a mapear os termos removidos) | modelo novo | Médio |
| **README** | `README.md` | 5 Rewrite | remove o papel «BANZA CA = Certification Authority (certifies)» | Médio — é a primeira leitura do repo |
| **Rota `/certificates`** | serviço + docs | 3 Legacy | `conformance evidence` em `/conformance/evidence`; `production_certificates=false` | Baixo se marcada; alto se promovida a canónica |
| **Schemas** | `contracts/production/*` | 6 Migrar/deprecar | signed-protocol-metadata / conformance-evidence / public-protocol-registry / federation-trust-evaluation / revocation-list / delegated-signing-key / trust-root-metadata | Alto — contratos são normativos |
| **SVGs do modelo antigo** | `banza-triple-verification-rule-v1.svg`, `banza-operator-conformance-lifecycle-v1.svg`, `banza-certification-pipeline-v1.svg`, `banza-evidence-vs-certificate-v1.svg`, diagramas EN do reference | 7 Redraw | open-trust-evaluation, federation-trust-evaluation, public-protocol-registry, adr-supersession-map | Médio — um diagrama é lido antes do texto |
| **Denylists dos motores** | `banza-open-governance`, `banza-reference-trust-model`, guards | 4 Denylist | — | Nenhum — o motor tem de detectar os termos |
| **Relatórios de fase antigos** | `docs/governance/PHASE_*.md` | 2 Histórico | — | Nenhum — são o registo do que foi feito à data |

## 5. O que M2.3 entrega

- **ADR-038/039/040** — o modelo novo, nascido em ADR antes de qualquer edição de spec.
- **ADR-022/026/027** — Status + banner de supersessão, corpo intacto, `Superseded by:` coerente.
- **Reference PT/EN** — Verificação Tripla removida; Open Trust Evaluation documentada.
- **`banza-reference-trust-model`** — motor Rust que valida o modelo e **detecta** dependência de CA,
  trust por certificado, aprovação humana, a verificação tripla legacy e afirmação de rede permissionada.
  A supersessão dos ADRs é uma condição verificada por máquina, não uma afirmação em prosa.
- **Guard** — `make open-governance-check` alargado às superfícies que M2.2 deixou fora.

## 6. Critério de aceitação

| Critério | Estado |
|---|---|
| Zero ocorrência activa de CA/certificado como mecanismo de trust/federação | ✅ (guard + motor) |
| ADR-022/026/027 superseded, preservados como histórico | ✅ |
| Verificação Tripla legacy removida do modelo activo | ✅ |
| Registry descrito como índice verificável, nunca lista de aprovação | ✅ |
| Revogação descrita como sinal de segurança, nunca licença/sanção | ✅ |
| Estados/gates decididos em Rust, nunca em TypeScript | ✅ |
| `/operators=[]`, `production_certificates=false`, `llm_calls=0` | ✅ (inalterados) |
