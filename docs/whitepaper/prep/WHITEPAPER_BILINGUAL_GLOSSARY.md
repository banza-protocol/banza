# BANZA Whitepaper v1.0 — Bilingual Glossary (Gate-A prep)

> Working title of the paper: **"BANZA: An Open Protocol for Financial
> Interoperability."** / *"BANZA: Um Protocolo Aberto para a Interoperabilidade
> Financeira."*
>
> **Status: NON-NORMATIVE.** This glossary is descriptive prep material for the Whitepaper. It states
> no obligation of its own and uses no MUST/SHALL except when quoting the canonical Reference or an
> Architecture Decision Record (ADR). Where a term carries a normative meaning, the binding source is
> the cited ADR / invariant registry, not this document.
>
> **Authors:** Fidel R. Monteiro (first), Jesus R. Monteiro — Co-founders of Banzami / Cofundadores da
> Banzami.
> **Publisher / affiliation:** Banzami. **Full legal name (canonical rendering):**
> BANZAMI – Tecnologia e Serviços, Lda.
> **Date:** 2026-07-30. **Grounding:** every entry is traceable to the whitepaper-prep audits
> (`audit/01`–`audit/06`) and the ADR / invariant sources they cite. No DOI / ISBN / ISSN is claimed.

---

## 0. Conventions (binding for the whole paper)

1. **One canonical translation per concept — never alternate.** Each concept has exactly one
   EN-canonical form and exactly one PT-official form (§13). The Portuguese edition is canonical; the
   English edition is the official translation.
2. **Two "L…" axes, kept apart by notation (see the Disambiguation box, §14.1):**
   - **Institutional axis →** write **"Layer 1 / Layer 2 / Layer 3"** (PT: **"Camada 1 / 2 / 3"**).
   - **Conformance axis →** write **"Level L0–L4"** (PT: **"Nível L0–L4"**).
   Never write a bare "L2" without saying which axis.
3. **Legal name.** The canonical rendering used throughout is **BANZAMI – Tecnologia e Serviços, Lda.**
   (public short form **Banzami**). An all-caps variant (`BANZAMI - TECNOLOGIA E SERVIÇOS, LDA.`) also
   appears on some institutional surfaces; both denote the same entity. Banzami is the original creator
   and initial institutional maintainer of the protocol, and — separately — the designated operator of
   the Layer-3 operational scheme; the paper must not collapse those two roles.
4. **Terminology standardisation.** The legacy Portuguese corpus sometimes renders *profile* as
   "perfil" and *trust* as "confiança"; for precision the Whitepaper keeps **profile** and **trust** in
   English as canonical tokens (§13.2) and uses the PT descriptive gloss only in explanatory prose.
5. **Non-derogation of boundaries.** No entry may present technical certification, scheme admission and
   regulatory authorisation as equivalent or as flowing automatically from one another (ADR-061).

---

## 13. Binding term table (EN-canonical ↔ PT-official)

### 13.1 Translated terms

| # | EN (source term) | PT (oficial) | Note / grounding |
|---|---|---|---|
| 1 | **Operator** | **Operador** | The responsible *entity*; identified by an operator-agnostic slug, never a commercial brand. ≠ Implementation (ADR-068, ADR-065). |
| 2 | **Implementation** | **Implementação** | The technical *system* actually evaluated; a specific build bound to `implementation_hash` (ADR-064, ADR-068). |
| 3 | **Financial interoperability** | **Interoperabilidade financeira** | The paper's subject: independent implementations completing financial protocol flows with one another (ADR-059, ADR-064). |
| 4 | **Canonical origin** | **Origem canónica** | An implementation's canonical public HTTPS origin; the secure fetcher pins the host to it (ADR-068). |
| 5 | **Published endpoint** | **Endpoint publicado** | A public HTTPS URL host-bound to the canonical origin from which an artifact is fetched. "endpoint" stays English (ADR-068). |
| 6 | **Artifact** | **Artefacto** | One content-hashed unit of published content fetched for evaluation (ADR-068). |
| 7 | **Evidence** | **Evidência** | Reproducible, independently checkable inputs; "evidence that cannot be reproduced is not evidence" (INV-FEDEVAL-003). |
| 8 | **Technical Registry** | **Registo Técnico** | The single public, root-verifiable index of Layer-2 artifacts; ≠ any scheme's participant directory (ADR-065). |
| 9 | **Conformance** | **Conformidade** | Behaving per the protocol's contracts/invariants, shown by reproducible public vectors (ADR-021, ADR-037). |
| 10 | **Interoperability** | **Interoperabilidade** | Independent implementations exchanging messages and completing flows correctly (ADR-064). |
| 11 | **Technical certification** | **Certificação técnica** | Layer-2, per-implementation, evidence-based, Rust-decided, scoped, time-limited (ADR-064, ADR-061). |
| 12 | **Operational scheme** | **Scheme operacional** | A Layer-3 arrangement run by a designated operator under the applicable regulatory framework. "scheme" stays English (ADR-060). |
| 13 | **Reference implementation** | **Implementação de referência** | A sandbox implementation that demonstrates the protocol end-to-end; here, Operator Zero (ADR-052, ADR-067). |
| 14 | **Real funds** | **Fundos reais** | Actual customer money. At this baseline every real-money flag is `const false` (fail-closed), gated by the Rust RealMoneyActivationGate (ADR-062). |
| 15 | **Pre-production** | **Pré-produção** | The current honest state: `pre_production = true`, `production_certificates = false`, `/operators = []` (ADR-031). |

### 13.2 Terms kept in English when canonical

These are used verbatim in both editions (in PT prose as loan terms; never re-translated).

| Term | What it names | Why kept in English |
|---|---|---|
| **profile** | The public, versioned certification yardstick (`InteroperabilityCertificationProfile`) | Object name is English; avoids clashing with everyday "perfil" (ADR-064). |
| **scheme** | A Layer-3 operational scheme | Kept even inside the PT compound *Scheme operacional* (ADR-060). |
| **receipt** | A hash-sealed record of a validation result | Names three specific object types below (ADR-068). |
| **trust** | Confidence established by the CA-less Open Trust Evaluation | Canonical model name is English; avoids the looser everyday "confiança" (ADR-038). |
| **Manifest** | An implementation's self-published identity/capability/scope declaration | Protocol object name (ADR-039). |
| **Evidence Bundle** | The assembled package of reproducible technical evidence | Protocol object name; carries `not_a_certificate = true` (ADR-064). |
| **OperationReceipt** | Per-step receipt binding a verdict to its exact origin | Wire object name (ADR-068). |
| **JourneyReceipt** | Aggregate receipt sealing a full nine-step run | Wire object name; `certification_status = NOT_CERTIFIED`, `certified = false` (ADR-068). |
| **OriginVerificationReceipt** | Receipt for domain-ownership proof | Wire object name; contains no email/session material (ADR-069). |
| **Certification Readiness** | The journey's step-9 aggregate | Distinct from *technical certification*; never returns CERTIFIED (ADR-067, ADR-068). |

---

## 12. Mandatory definitions

Each entry is 1–3 grounded sentences in English, then Portuguese. Canonical wire values
(`NOT_CERTIFIED`, `KZ_DEMO`, …) are shown verbatim in both editions.

### 12.1 BANZA Protocol · Protocolo BANZA
**EN.** BANZA is an open financial protocol that defines verifiable rules, contracts, profiles and
interoperability mechanisms between independent implementations. It is not a bank, PSP, wallet, e-money
institution or financial operator: it holds and moves no funds, runs no client accounts, settles
nothing, issues no licences, and replaces neither the regulator nor any scheme (ADR-059, ADR-001).
**PT.** O BANZA é um protocolo financeiro aberto que define regras, contratos, profiles e mecanismos
verificáveis de interoperabilidade entre implementações independentes. Não é banco, PSP, carteira,
instituição de moeda electrónica nem operador financeiro: não detém nem movimenta fundos, não opera
contas de clientes, não liquida, não emite licenças e não substitui o regulador nem qualquer scheme.

### 12.2 operator · operador
**EN.** An operator is the responsible entity that publishes zero or more implementations, identified by
an operator-agnostic slug (for example, `operator-zero`) and never by a commercial brand in the
protocol. An operator is not the technical system that is evaluated — that is its implementation — and
the presence of an operator record never implies scheme admission, regulatory authorisation, or the
ability to move funds (ADR-068, ADR-065).
**PT.** Um operador é a entidade responsável que publica zero ou mais implementações, identificado por
um slug neutro (por exemplo, `operator-zero`) e nunca por uma marca comercial no protocolo. O operador
não é o sistema técnico avaliado — esse é a sua implementação — e a presença de um registo de operador
nunca implica admissão a scheme, autorização regulatória ou capacidade de movimentar fundos.

### 12.3 implementation · implementação
**EN.** An implementation is the technical system that is actually evaluated: a specific build published
by an operator, identified by its id plus the content hash of the exact artifact set tested
(`implementation_hash`). One operator may publish many implementations (demonstration, sandbox,
pre-production, production; different versions, profiles, capabilities and deployments); a different
build is a different subject (ADR-064, ADR-068).
**PT.** Uma implementação é o sistema técnico efectivamente avaliado: uma build específica publicada por
um operador, identificada pelo seu id e pelo hash de conteúdo do conjunto exacto de artefactos testados
(`implementation_hash`). Um operador pode publicar muitas implementações (demonstração, sandbox,
pré-produção, produção; versões, profiles, capacidades e deployments diferentes); uma build diferente é
um sujeito diferente.

### 12.4 profile
**EN.** A profile (`InteroperabilityCertificationProfile`) is the public, versioned yardstick against
which an implementation is measured: a conformance level plus required capabilities and pinned test
suites/vectors, derived only from Layer-1 protocol contracts and introducing no operator-specific
criteria. It is immutable once published — any change is a new `profile_version` (ADR-064).
**PT.** Um profile (`InteroperabilityCertificationProfile`) é o critério público e versionado contra o
qual uma implementação é medida: um nível de conformidade mais as capacidades exigidas e as
suites/vectores de teste fixados, derivado apenas dos contratos de protocolo da Camada 1 e sem introduzir
critérios específicos de operador. É imutável depois de publicado — qualquer alteração é um novo
`profile_version`.

### 12.5 protocol version · versão do protocolo
**EN.** The protocol version is the semantic version of the BANZA protocol that an implementation
declares and is measured against (baseline `1.0.0`); it is a compatibility axis in discovery and in
every certification record. An implementation whose declared version is incompatible with the supported
range is not an eligible validation target (ADR-068).
**PT.** A versão do protocolo é a versão semântica do protocolo BANZA que uma implementação declara e
contra a qual é medida (linha de base `1.0.0`); é um eixo de compatibilidade na discovery e em cada
registo de certificação. Uma implementação cuja versão declarada seja incompatível com o intervalo
suportado não é um alvo de validação elegível.

### 12.6 environment · ambiente
**EN.** The environment is the deployment context an implementation declares; at this baseline the only
eligible values are `sandbox` and `demo` — never production or real-money. Environment is one of the axes
to which a certification is scoped (ADR-030, ADR-068).
**PT.** O ambiente é o contexto de execução que uma implementação declara; nesta linha de base os únicos
valores elegíveis são `sandbox` e `demo` — nunca produção nem dinheiro real. O ambiente é um dos eixos
aos quais uma certificação está circunscrita.

### 12.7 scope · âmbito
**EN.** The scope of a certification is the exact set of levels, capabilities, environment and evidence a
verdict covers; it is never broader than the evidence that supports it. A certificate confers nothing
beyond its scope and does not propagate (ADR-064, ADR-061).
**PT.** O âmbito de uma certificação é o conjunto exacto de níveis, capacidades, ambiente e evidência que
um veredicto cobre; nunca é mais amplo do que a evidência que o sustenta. Um certificado não confere nada
para além do seu âmbito e não se propaga.

### 12.8 canonical origin · origem canónica
**EN.** The canonical origin is an implementation's canonical public HTTPS origin (for example,
`https://zero.banza.network`) from which all its artifacts are obtained. In endpoint-originated
validation the secure fetcher pins the host to this origin, and every published endpoint must be
host-bound to it — an off-origin URL is rejected (ADR-068).
**PT.** A origem canónica é a origem HTTPS pública canónica de uma implementação (por exemplo,
`https://zero.banza.network`) a partir da qual todos os seus artefactos são obtidos. Na validação
originada no endpoint, o fetcher seguro fixa o host a esta origem, e cada endpoint publicado tem de estar
vinculado a ela — um URL fora da origem é rejeitado.

### 12.9 published endpoint · endpoint publicado
**EN.** A published endpoint is one of an implementation's public HTTPS URLs, host-bound to its canonical
origin, from which a validation artifact is fetched (the reference set is fourteen canonical endpoints —
discovery, manifest, key manifest, signed metadata, capabilities, conformance, revocation, federation
metadata, federation manifest, evidence bundle, traces, ledger, and the two payment endpoints). Only the
registry-resolved origin + host + path reach the fetcher; no user-supplied URL enters the official
journey (ADR-068).
**PT.** Um endpoint publicado é um dos URLs HTTPS públicos de uma implementação, vinculado à sua origem
canónica, a partir do qual um artefacto de validação é obtido (o conjunto de referência são catorze
endpoints canónicos — discovery, manifest, key manifest, signed metadata, capabilities, conformance,
revocation, federation metadata, federation manifest, evidence bundle, traces, ledger e os dois endpoints
de pagamento). Apenas a origem + host + path resolvidos pelo registo chegam ao fetcher; nenhum URL
fornecido pelo utilizador entra na jornada oficial.

### 12.10 artifact · artefacto
**EN.** An artifact is a single piece of content published by an implementation at one of its endpoints
and fetched for evaluation (a Manifest, signed metadata, a conformance report, an Evidence Bundle, and so
on). Every artifact is content-hashed (SHA-256) so a third party can reproduce the result; no fixture
contributes verdict-bearing content to the official journey (ADR-068, INV-OTE-*).
**PT.** Um artefacto é uma unidade de conteúdo publicada por uma implementação num dos seus endpoints e
obtida para avaliação (um Manifest, signed metadata, um relatório de conformidade, um Evidence Bundle,
etc.). Cada artefacto tem hash de conteúdo (SHA-256) para que um terceiro possa reproduzir o resultado;
nenhuma fixture contribui com conteúdo determinante de veredicto para a jornada oficial.

### 12.11 Manifest
**EN.** A Manifest is an implementation's self-published declaration of its identity, capabilities and
conformance scope, served at its canonical origin (classically at `/.well-known/banza/operator.json`). It
is validated deterministically in Rust; a federation manifest extends the base operator manifest
(ADR-039).
**PT.** Um Manifest é a declaração auto-publicada de uma implementação sobre a sua identidade,
capacidades e âmbito de conformidade, servida na sua origem canónica (classicamente em
`/.well-known/banza/operator.json`). É validado de forma determinística em Rust; um federation manifest
estende o Manifest de operador base.

### 12.12 conformance · conformidade
**EN.** Conformance is the property of an implementation behaving according to the protocol's contracts
and invariants, demonstrated by running a profile's pinned public vectors offline and producing a report
(`PASS` / `WARN` / `FAIL`) that a third party can reproduce. Conformance is decided by the Rust
conformance engine — never by a human or a model (ADR-021, ADR-037).
**PT.** Conformidade é a propriedade de uma implementação se comportar de acordo com os contratos e
invariantes do protocolo, demonstrada executando offline os vectores públicos fixados de um profile e
produzindo um relatório (`PASS` / `WARN` / `FAIL`) que um terceiro pode reproduzir. A conformidade é
decidida pelo motor Rust de conformidade — nunca por um humano ou por um modelo.

### 12.13 interoperability · interoperabilidade
**EN.** Interoperability is the property of independent implementations exchanging protocol messages and
completing protocol flows correctly with one another. In the validation journey it is evaluated as a
payment-flow readiness surface (payment intent, idempotency, ledger, trace, settlement) and, for
cross-operator routing, as federation readiness (ADR-064).
**PT.** Interoperabilidade é a propriedade de implementações independentes trocarem mensagens de
protocolo e completarem correctamente os fluxos de protocolo entre si. Na jornada de validação é avaliada
como uma superfície de preparação de fluxo de pagamento (payment intent, idempotência, ledger, trace,
liquidação) e, para o encaminhamento entre operadores, como preparação de federação.

### 12.14 trust
**EN.** Trust is established by the CA-less Open Trust Evaluation: signed protocol metadata, delegated
signing keys, the operator's Manifest and conformance evidence, and a valid, fresh, signed revocation
list — verified against a threshold-signed offline root, fail-closed. There is no certificate authority
and no certificate chain; no artifact BANZA issues about an operator and no human decision is an input
(ADR-038, INV-OTE-*, INV-ROOT-*).
**PT.** A trust é estabelecida pela Open Trust Evaluation sem CA: signed protocol metadata, chaves de
assinatura delegadas, o Manifest e a evidência de conformidade do operador, e uma revocation list
válida, fresca e assinada — verificados contra uma raiz offline com assinatura por limiar, com fecho por
omissão. Não há autoridade certificadora nem cadeia de certificados; nenhum artefacto que o BANZA emita
sobre um operador e nenhuma decisão humana é uma entrada.

### 12.15 evidence · evidência
**EN.** Evidence is the set of reproducible, independently checkable inputs that substantiate a technical
claim (conformance reports, trust material, traces), each content-hashed. Evidence that cannot be
reproduced is not evidence; by itself it grants nothing, and no human authority approves it
(INV-FEDEVAL-003, ADR-064).
**PT.** Evidência é o conjunto de entradas reproduzíveis e verificáveis de forma independente que
sustentam uma afirmação técnica (relatórios de conformidade, material de trust, traces), cada uma com
hash de conteúdo. Evidência que não pode ser reproduzida não é evidência; por si só não confere nada, e
nenhuma autoridade humana a aprova.

### 12.16 receipt
**EN.** A receipt is a hash-sealed record that binds a validation result to the exact origin, artifact
and engine that produced it. The protocol defines three: an **OperationReceipt** per step, a
**JourneyReceipt** sealing a full run, and an **OriginVerificationReceipt** for domain-ownership proof;
every receipt records zero model calls (`qwen_calls = 0`, `external_model_calls = 0`) (ADR-068).
**PT.** Um receipt é um registo selado por hash que vincula um resultado de validação à origem, artefacto
e motor exactos que o produziram. O protocolo define três: um **OperationReceipt** por passo, um
**JourneyReceipt** que sela uma execução completa e um **OriginVerificationReceipt** para a prova de posse
de domínio; cada receipt regista zero chamadas a modelo (`qwen_calls = 0`, `external_model_calls = 0`).

### 12.17 Evidence Bundle
**EN.** An Evidence Bundle is the assembled package of a candidate implementation's reproducible
technical evidence, with per-artifact and whole-bundle SHA-256 hashes and a Rust-computed readiness
value. It is explicitly not a certificate and not an approval — it carries `not_a_certificate = true` and
requires independent conformance-evidence review (ADR-064).
**PT.** Um Evidence Bundle é o pacote reunido da evidência técnica reproduzível de uma implementação
candidata, com hashes SHA-256 por artefacto e do pacote inteiro e um valor de prontidão calculado em
Rust. Não é explicitamente um certificado nem uma aprovação — transporta `not_a_certificate = true` e
exige revisão independente da evidência de conformidade.

### 12.18 Technical Registry · Registo Técnico
**EN.** The BANZA Technical Registry is the single public, append-mostly, root-verifiable index of
Layer-2 artifacts — implementations, profiles, certification records and revocations — verifiable by any
third party with no account, no CA and no certificate chain. It is strictly independent of any scheme's
participant directory: presence means "this implementation holds this record", never "admitted" or
"authorised"; at baseline it publishes no production certificates and `/operators` is empty (ADR-065).
**PT.** O Registo Técnico do BANZA é o único índice público, maioritariamente-por-adição e verificável
contra a raiz de artefactos da Camada 2 — implementações, profiles, registos de certificação e revogações
— verificável por qualquer terceiro sem conta, sem CA e sem cadeia de certificados. É estritamente
independente do directório de participantes de qualquer scheme: a presença significa "esta implementação
detém este registo", nunca "admitido" ou "autorizado"; na linha de base não publica certificados de
produção e `/operators` está vazio.

### 12.19 technical certification · certificação técnica
**EN.** Technical certification (Layer 2) is a per-implementation, evidence-based, Rust-decided,
reproducible, hash-bound, scoped and time-limited determination that a specific implementation passed a
specific public profile version with specific evidence — and nothing more. It is not a licence, not
scheme admission and not regulatory authorisation, and it does not propagate in any direction (ADR-061,
ADR-064).
**PT.** A certificação técnica (Camada 2) é uma determinação por implementação, baseada em evidência,
decidida em Rust, reproduzível, vinculada por hash, circunscrita e limitada no tempo de que uma
implementação específica passou uma versão específica de um profile público com evidência específica — e
nada mais. Não é uma licença, não é admissão a scheme e não é autorização regulatória, e não se propaga
em nenhuma direcção.

### 12.20 operational scheme · Scheme operacional
**EN.** An operational scheme is a Layer-3 arrangement, run by a designated operator under the applicable
regulatory framework, in which certified implementations may participate to deliver real financial
services. The first intended scheme is the Banzami Operational Scheme, whose internal regulatory state is
`REGULATORY_AUTHORIZATION_IN_PROGRESS` with real money fail-closed; a scheme is not the protocol and not
the certification, and admission to it is a separate, later decision (ADR-060, ADR-059, ADR-062).
**PT.** Um scheme operacional é um arranjo da Camada 3, gerido por um operador designado ao abrigo do
enquadramento regulatório aplicável, no qual implementações certificadas podem participar para prestar
serviços financeiros reais. O primeiro scheme pretendido é o Banzami Operational Scheme, cujo estado
regulatório interno é `REGULATORY_AUTHORIZATION_IN_PROGRESS` com dinheiro real em fecho por omissão; um
scheme não é o protocolo nem a certificação, e a admissão a ele é uma decisão separada e posterior.

### 12.21 BanzAI
**EN.** BanzAI is the transversal human interface across all three layers — it interprets requests,
consults the Reference, guides implementation, routes to the verifiable engines, and explains results. It
is not a fourth layer and not an authority: it never decides, certifies, admits, publishes or activates
funds; the Rust engines decide, and the local model explains once, after Rust has decided. Canonical
phrase: *"BanzAI guia; os motores verificam; a evidência prova; a governança decide."* (ADR-054, ADR-059,
ADR-041).
**PT.** O BanzAI é a interface humana transversal às três camadas — interpreta pedidos, consulta a
Referência, orienta a implementação, encaminha para os motores verificáveis e explica resultados. Não é
uma quarta camada nem uma autoridade: nunca decide, certifica, admite, publica ou activa fundos; os
motores Rust decidem, e o modelo local explica uma vez, depois de o Rust ter decidido. Frase canónica:
*"BanzAI guia; os motores verificam; a evidência prova; a governança decide."*

### 12.22 Operator Zero · Operador Zero
**EN.** Operator Zero (Operador Zero) is the sandbox reference implementation used to demonstrate, test
and validate the protocol end to end. It is read-only, uses the demonstration currency `KZ_DEMO`, moves
no real funds, holds no private keys, is `NOT_CERTIFIED` and `PRE_PRODUCTION`, and never appears as a
real, certified or authorised operator; it is validated through exactly the same secure fetch and Rust
engines as any other implementation (ADR-052, ADR-067, ADR-068).
**PT.** O Operador Zero é a implementação de referência em sandbox usada para demonstrar, testar e
validar o protocolo de ponta a ponta. É só de leitura, usa a moeda de demonstração `KZ_DEMO`, não
movimenta fundos reais, não detém chaves privadas, está `NOT_CERTIFIED` e `PRE_PRODUCTION`, e nunca surge
como operador real, certificado ou autorizado; é validado exactamente pelo mesmo fetch seguro e pelos
mesmos motores Rust que qualquer outra implementação.

---

## 14. Disambiguation box (three tri-collisions)

> **Read this before using any of the tokens "L1/L2/L3", "certification", or "registry".** Each names
> three different things. The Whitepaper must keep them apart at every occurrence.

### 14.1 Tri-collision A — three things behind "L…"

| # | Concept | Canonical notation | What it is | Grounding |
|---|---|---|---|---|
| 1 | **Institutional Layers** | **Layer 1 / Layer 2 / Layer 3** (Camada 1/2/3) | The institutional-responsibility axis, separated by infrastructure and keys: **Layer 1** = BANZA Protocol (open, neutral); **Layer 2** = Conformance & Interoperability Certification (per-implementation); **Layer 3** = Operational Schemes (the Banzami Operational Scheme is the first intended scheme). | ADR-059 |
| 2 | **Conformance profiles / levels** | **Level L0–L4** (Nível L0–L4) | A *scope grouping*, not a status: **L0** Protocol Sandbox · **L1** Core Payment Capability · **L2** Payment Initiation Capability · **L3** Inter-Operator Interoperability · **L4** External Interoperability. | ADR-021, ADR-038 |
| 3 | **L1–L4 readiness engines** | **"the L2 readiness engine", etc.** | Local, offline "preparação técnica" engines, one per conformance level. Two run inside the nine-step journey: the **L2 readiness engine** runs the *interoperability* step (payment-flow), the **L3 readiness engine** runs the *federation* step. They are not certification, not approval, and move no funds. | Audit 02 §9 |

**Load-bearing consequence.** The journey's *interoperability* step uses the **Level-L2 payment-flow
readiness engine** — **not** "Layer-2 certification". "L2" alone is ambiguous: it is simultaneously the
*Certification Layer* (institutional axis) and the *Payment Initiation Capability level* (conformance
axis). Likewise "L3" is both the *Operational-Scheme Layer* and the *Inter-Operator Interoperability
level*. Always qualify with **Layer** or **Level**.

### 14.2 Tri-collision B — two meanings of "certification"

| # | Concept | Canonical name | Behaviour | Grounding |
|---|---|---|---|---|
| 1 | **Journey step 9** | **Certification Readiness** (kept English) | The aggregate of the eight technical steps, produced by the target-registry engine. It hard-sets `certification_status = NOT_CERTIFIED`, `certified = false`, `authorised = false`, `licensed = false`, and returns `READY` or `BLOCKED`. It **never returns `CERTIFIED`** and **never issues a record**. Readiness is not certification issued. | ADR-067, ADR-068; audit 02 §10, audit 03 §2.2 |
| 2 | **The authority** | **technical certification** / *Certificação técnica* (`CertificationRecord`) | A separate deterministic Rust authority with a closed six-state machine `NOT_CERTIFIED / CERTIFIED / EXPIRED / SUSPENDED / REVOKED / SUPERSEDED` that *can* emit a certification record. **This authority engine is not invoked by the nine-step journey.** | ADR-064, ADR-065, ADR-066; audit 02 §10 |

**Load-bearing consequence.** **The nine-step journey never certifies.** Any sentence that says an
implementation "was certified by running the journey" is wrong: the journey produces *Certification
Readiness* only; a `CertificationRecord` is a separate authority determination, and even a fresh record
is `CERTIFIED` only within its scope, window and reproducible evidence (fail-closed otherwise).

### 14.3 Tri-collision C — three "registry" surfaces (name each explicitly)

| # | Surface | Canonical name | What it is | Grounding |
|---|---|---|---|---|
| 1 | Validation targets + public Layer-2 state | **BANZA Technical Registry** / *Registo Técnico* | The **closed** set of eligible validation targets and the public, read-only index of Layer-2 artifacts; the single source of validation targets; feeds the public `/operators` surface (empty at baseline). ≠ any scheme's participant directory. | ADR-065; audit 03 §4.1 |
| 2 | Trust-evaluation anchor | **Public Protocol Registry** | The index of published operator metadata referenced by the trust invariants. **Registry listing is not a trust check**: presence grants nothing and absence forbids nothing. | ADR-038, ADR-040 (INV-FEDEVAL-008, INV-OTE-007); audit 03 §5 |
| 3 | Onboarding candidacies | **Candidate Registry** (private) | A private, session-gated store of candidacies used only by the hosted onboarding service. **Not part of the protocol core**: third parties need none of it to implement the protocol, publish endpoints, run the engines, validate artifacts or generate receipts. A candidate is never a published operator, participant, certified entity or scheme member. | ADR-069; audit 03 §4.2 |

**Load-bearing consequence.** Never write a bare "the registry". The **Technical Registry** is BANZA's
own closed list of validation *targets* for its surfaces — it is not a trust anchor and not a mandatory
global directory operators must appear in to be trusted; independent parties reproduce conformance from
published, hashed artifacts without consulting any BANZA registry. The **Candidate Registry** is private
and outside the protocol; the **Public Protocol Registry** is an index whose listing is explicitly *not*
an evaluation check.

---

## 15. Guardrails honoured by this glossary (self-check)

- **Non-normative.** No MUST/SHALL of the glossary's own; normative force stays with the cited ADRs and
  the invariant registry.
- **Boundary integrity.** BANZA is not a bank/PSP/wallet/operator; it moves no funds. Technical
  certification ≠ scheme admission ≠ regulatory authorisation (ADR-061); the Banzami Layer-3 regulatory
  state is `REGULATORY_AUTHORIZATION_IN_PROGRESS` with real money fail-closed (ADR-062).
- **Decision authority.** Rust engines execute and decide; the local model only explains, after Rust has
  decided; BanzAI is a transversal interface, not a fourth layer and not an authority (ADR-037, ADR-054,
  ADR-059).
- **No forbidden claims.** No "first/only/revolutionary/unprecedented/fully-decentralised/trustless/
  guaranteed/regulator-approved/production-proven" claim about BANZA is made; "first intended scheme" is
  used only in the grounded internal-ordering sense for the Banzami scheme (ADR-060).
- **No invented identifiers.** No DOI/ISBN/ISSN; no internal paths, infrastructure detail, milestone
  codes, PR references, or onboarding-secret mechanics appear in this document.
- **One translation per concept.** Each concept has a single EN-canonical and single PT-official form;
  none alternates.
