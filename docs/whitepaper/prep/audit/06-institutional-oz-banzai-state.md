# Audit 06 — Institutional Identity, Governance, Operador Zero, BanzAI Role & Pre-Production State

**Scope:** Establish, grounded in files actually read, the institutional identity of BANZA, the open
governance model, the Banzami affiliation, the three-layer architecture, the Operador Zero
classification, the BanzAI transversal-interface role, the regulatory state, and the current honest
pre-production state. Whitepaper is non-normative, scientific-technical, operator-neutral. Every claim
below cites a real repo-relative path and line/section.

> No private company-registration data (NIF, certidão, addresses, capital) was pulled or recorded — only
> the legal name and author-affiliation facts, per instruction.

---

## 1. Institutional identity & legal name

**Legal name.** The originating company is recorded on every institutional surface as
**`BANZAMI - TECNOLOGIA E SERVIÇOS, LDA.`** (all-caps form) —
`NOTICE:2`, `NOTICE:4-5`, `GOVERNANCE.md:15`, `MAINTAINERS.md:9`, `README.md:328`. The mixed-case
form **`Banzami — Tecnologia e Serviços, Lda.`** (em-dash) is the one used in the three-layer /
regulatory documents and machine artifacts — `docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md:62,119`,
`docs/governance/BANZAMI_OPERATIONAL_SCHEME.md:26,39`,
`contracts/production/examples/regulatory-state.valid.json:4`. Both refer to the same entity.

**Copyright / authorship.** `Copyright © 2026 BANZAMI - TECNOLOGIA E SERVIÇOS, LDA.` (`NOTICE:2`).

**Creation date.** The protocol was originally created on **01/08/2025 (1 de agosto de 2025)** by BANZAMI
(`GOVERNANCE.md:14-15`, `NOTICE:4`, `MAINTAINERS.md:11`, `README.md:327`). This date is explicitly framed
as *historical creation / initial availability only* — **NOT** a production, certification,
financial-authorisation, active-operator, Trust-Root-issuance or federation date, and it confers **no
operational authority over operators** (`GOVERNANCE.md:16-17`, `MAINTAINERS.md:12-15`, `NOTICE:6-7`).

**Publisher / affiliation / creator-maintainer.** Banzami is the **original creator and initial
institutional maintainer** of the open protocol (`GOVERNANCE.md:3,21,55`, `NOTICE:12-13`,
`MAINTAINERS.md:19`, `TRADEMARKS.md:65-66`). This attribution "does not make every independent
implementation a Banzami product or service" (`TRADEMARKS.md:66`) and "does not make every protocol
decision private or closed" (`MAINTAINERS.md:60-61`).

**Marks.** BANZA, BanzAI and Banzami (plus logos/trade dress/domains) are covered marks; the Apache-2.0
license grants no right to use them beyond attribution / nominative reference (`NOTICE:17-21`,
`TRADEMARKS.md:1-2,9-19`). Trademark contact: `contact@banzami.com` (`TRADEMARKS.md:76`).

## 2. BANZA vs Banzami separation (BANZA ≠ Banzami)

This is an **architectural invariant, not a branding preference** (CLAUDE.md Operator-Neutrality
section; `docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md:31-32`).

- The protocol (L1) and certification (L2) are **neutral and are not property, product or governance of
  Banzami** — `docs/governance/BANZAMI_OPERATIONAL_SCHEME.md:12-16,51-56` (D-060-02);
  `BANZA_THREE_LAYER_ARCHITECTURE.md:166-168` (separation #2).
- Naming Banzami as first scheme operator does **not** make BANZA an operator, bank, PSP or financial
  service (`BANZAMI_OPERATIONAL_SCHEME.md:52-56`).
- Protocol continuity is independent of the scheme: if the Banzami scheme changed, paused or ceased, the
  protocol, specs, engines, vectors, certification and registry remain fully available to all operators —
  the ADR-001 survival criterion applies to the scheme relationship too
  (`BANZAMI_OPERATIONAL_SCHEME.md:139-145`; `BANZA_THREE_LAYER_ARCHITECTURE.md:218-227`).
- Dependency graph (permanent): `Operadores → BanzAI → BANZA`; BANZA and BanzAI never depend on operators
  (`BANZA_THREE_LAYER_ARCHITECTURE.md:72-73`; CLAUDE.md).

## 3. Open governance model

- BANZA governance is **open today** through the public GitHub repository — "not a future promise"
  (`GOVERNANCE.md:3,10,23-25`). Mechanisms: issues, PRs, code review, ADRs, RFCs, specs, releases,
  conformance tests, deterministic engines, public evidence, MAINTAINERS.md, public discussion
  (`GOVERNANCE.md:27-40`).
- Change flow: `proposal → issue/RFC/ADR → review → implementation → tests → merge → release → reference
  update` (`GOVERNANCE.md:44-46`).
- Governance **does not**: license operators, approve operators, certify operators, issue financial
  licences, replace regulators, or turn BANZA into a financial operator (`GOVERNANCE.md:59-66`). Normative
  changes require public artifacts (ADR/RFC/spec/release); no operator is approved/certified by a private
  decision (`GOVERNANCE.md:54-57`).
- Maintainer model: Banzami is initial institutional maintainer; active maintainers via public records;
  maintainer responsibilities include "avoid central operator approval" and "preserve the protocol /
  operator boundary" (`MAINTAINERS.md:22-24,33-34`).
- **Central human approval is NOT a protocol requirement.** Participation is *demonstrated* by verifiable
  evidence, not *granted* by an admitter (`README.md:216,219-220,324-325`; ADR-041 §4
  `decisions/adr/ADR-041-banzai-native-protocol-agent.md:66-68`).

## 4. Three-layer institutional architecture (ADR-059)

Canonical doc: `docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md`; README summary `README.md:65-80`.

- **L1 — BANZA Protocol** (open, neutral, verifiable): rules, contracts, messages, schemas, APIs,
  invariants, reason codes, technical identity, manifests, signatures, discovery, profiles, Signed
  Protocol Metadata, trust, revocation, technical registry, federation, public verification
  (`…THREE_LAYER…:76-84`, D-059-01 at `:78-79`). **L1 is NOT** a bank, PSP, wallet, e-money institution
  or financial operator; holds/moves no funds, runs no client accounts, does not settle, provides no
  financial services, issues no licences, and replaces neither regulator nor scheme (`:12-16,86-89`).
- **L2 — Conformance & Interoperability Certification** (per-implementation, evidence-based, Rust-decided,
  reproducible, hash-bound, scoped, time-limited, suspendable/revocable). Certifies an **implementation,
  never an entity** (D-059-02 at `:98-100`; `:96-111`). L2 is **NOT** a licence, scheme admission, or
  regulatory authorisation; a PASS is a technical conformance result, not financial authorisation
  (`:108-111`). Records publish to the Technical Registry (ADR-065), **currently empty (pre-production)**
  (`README.md:75`).
- **L3 — Banzami Operational Scheme** (first operational scheme; Banzami = designated operator;
  conditioned on obtaining the applicable regulatory framework; internal state
  `REGULATORY_AUTHORIZATION_IN_PROGRESS`) (D-059-03 at `:115-116`; `:113-126`).

Three **load-bearing separations** (`…THREE_LAYER…:159-172`):
1. **Technical Certification ≠ Scheme Admission ≠ Regulatory Authorisation** (ADR-061).
2. **BANZA ≠ Banzami** (ADR-060).
3. **Technical Registry (L2) ≠ Scheme Participant Directory (L3)** — public verification requires no
   Banzami account.

## 5. Banzami Operational Scheme (L3) — the first *intended* scheme

`docs/governance/BANZAMI_OPERATIONAL_SCHEME.md` (canonical form of ADR-060).

- Banzami is the **promoter, designer, intended administrator and designated operator** ("operadora
  designada") of the **first** operational scheme built on BANZA, **conditioned on obtaining the
  applicable regulatory framework for real-money operations** (D-060-01, `:38-46`).
- The designation does **not** make BANZA an operator, does **not** make certification exclusive to the
  scheme, and does **not** by itself authorise any real-money operation (`:47-48`).
- Certification is **not exclusive to the scheme**: an implementation is certified against a public
  versioned profile, "never certified for the Banzami scheme"; it may be certified without ever being
  admitted to any scheme (D-060-03, `:59-63`).
- **Openness to other operators**: other legally-eligible entities may adopt the protocol and run
  **independent** schemes; the architecture may **not** assume only one scheme/operator exists (D-060-04,
  `:66-72`).
- **Registo Técnico ≠ Scheme Participant Directory** (D-060-06, `:111-116`).

## 6. Regulatory state — `REGULATORY_AUTHORIZATION_IN_PROGRESS`, real money OFF

Machine contract: `contracts/production/regulatory-state.production.schema.json`; valid baseline instance
`contracts/production/examples/regulatory-state.valid.json`; policy
`docs/governance/BANZA_REGULATORY_CLAIM_POLICY.md`; scheme doc `BANZAMI_OPERATIONAL_SCHEME.md §6-7`.

- State enum is closed: `NOT_STARTED / REGULATORY_AUTHORIZATION_IN_PROGRESS / AUTHORISED_PILOT /
  AUTHORISED_PRODUCTION`; current production baseline is
  **`REGULATORY_AUTHORIZATION_IN_PROGRESS`** (schema `:41-45`; example `:5`).
- **Real money fail-closed baseline** — all `const false`: `real_money_enabled`, `real_wallets_enabled`,
  `real_settlement_enabled`, `real_participants_active`, `bna_approval_claimed` (schema `:46-70`; example
  `:6-10`). Even the reserved future states do **not** unlock real-money flags at this schema version
  (schema `:44`).
- **What the state does NOT mean** (none true today): authorisation granted; BNA/regulator approval;
  completed licence; regulatory recognition; active financial operation; permission to move funds / real
  settlement; active real participants (`BANZAMI_OPERATIONAL_SCHEME.md:85-93`;
  `BANZA_REGULATORY_CLAIM_POLICY.md:44-49`; schema `description`).
- **RealMoneyActivationGate** (ADR-062): real-money activation is a **Rust-validated** decision
  conditioned on formal applicable evidence — **no public statement, no prior technical step, and no
  local-model explanation unlocks it** (`BANZAMI_OPERATIONAL_SCHEME.md:96-109`; schema `description`,
  `state` prop, `boundary` prop).
- **Boundary object** (asserted): `not_authorised_yet`, `no_bna_claim_without_evidence`,
  `real_money_fail_closed`, `certification_is_not_admission_is_not_authorisation` are `const true`;
  `authorisation_granted`, `banzami_presented_as_authorised`, `replaces_regulator`, `replaces_scheme` are
  `const false` (schema `:102-125`; example `:14-23`).
- **Prudent public statement** (the only admissible phrasing today): *"A camada operacional encontra-se em
  preparação regulatória. Os pagamentos reais permanecem desactivados."*
  (`BANZAMI_OPERATIONAL_SCHEME.md:151-154`; `BANZA_REGULATORY_CLAIM_POLICY.md:70-78`; example `:12`).
- **No BNA language** may be published today: all five gate conditions G-1…G-5 fail
  (`BANZA_REGULATORY_CLAIM_POLICY.md:80-100`). Even when admissible it describes *process*, never granted
  authorisation, and never unlocks real money (`:98-100,102-107`).
- BANZA itself "does not need — nor can it hold — a payment-services licence"; any licence/authorisation
  belongs to the operator before the competent regulator (`BANZA_REGULATORY_CLAIM_POLICY.md:10-14`).

## 7. Conflict of interest (creator == first operator)

`docs/governance/BANZA_CONFLICT_OF_INTEREST_POLICY.md` (ADR-063); `BANZAMI_OPERATIONAL_SCHEME.md §9`.

The risk (creator of protocol/profile is also the first entity measured by them) is controlled
**structurally, not by promise** (`…CONFLICT…:1-11,16-31`). Controls C1–C6 (`:34-62`): same public
versioned profile / same suites / same Rust engine / same reason codes / same validity / same revocation
(C1); no bypass, Rust decides, no human FAIL→PASS (C2, ADR-038 INV-OTE-008); infrastructure separation of
five domains (C3); key separation of eight domains, offline root + delegated keys never on serving infra
(C4); Registry ≠ directory (C5); same revocation semantics (C6). Prohibitions (`:64-78`): no reduced
profile, no private certification, no bypass, no reserved endpoint, no publication without evidence, no
FAIL→PASS override, no secret exception. Independently verifiable by re-executing public vectors and
verifying against root-signed metadata with no Banzami credential (`:80-91`). Enforced in CI by
`banza-protocol-scheme-separation-check`, `banza-banzami-scheme-role-check`,
`banza-regulatory-state-claim-check`, `identity-guard` (`:93-108`).

## 8. Operador Zero classification

Engine `engines/operator-zero-core/` (ADR-052/053); read-only reference surface
`website/components/operador-zero/OperadorZeroReference.tsx` (ADR-067); status artifact
`examples/operators/zero/status/operator-zero-validation-state.json`.

- **Identity** (`engines/operator-zero-core/src/lib.rs:23-43`): `operator_id="operator-zero"`,
  display "Operador Zero", `demo_only:true`, `monetary_value:false`, `production_allowed:false`,
  `currency=KZ_DEMO`, `is_bank:false`, `is_psp:false`, `is_wallet:false`,
  `is_licensed_financial_operator:false`, `moves_real_money:false`.
- **Canonical boundary** (`lib.rs:37`; ADR-052 `:66-69`): *"O Operador Zero não é banco, não é PSP, não é
  carteira, não é operador financeiro licenciado e não movimenta dinheiro real. É um simulador técnico
  usado para demonstrar, testar e validar o protocolo BANZA de ponta a ponta."*
- **Deterministic by construction** — no clock, no randomness, no network, no real money, no private keys
  (`lib.rs:12-13`).
- **Demo boundary engine fails CLOSED** (`engines/operator-zero-core/src/boundary.rs:1-6,59-178`):
  requires `demo_only=true`, `monetary_value=false`, `production_allowed=false`; only `KZ_DEMO` currency
  allowed at any depth; secret markers forbidden; forbidden status claims (certificado/aprovado/
  licenciado/autorizado…) rejected unless negated (disclaimer-safe).
- **Never a real operator / never in `/operators`** (ADR-052 D-6 `:41-42`); represents no authorisation,
  certification, approval or licence (ADR-052 D-7 `:43-44`).
- **Read-only reference** (ADR-067 D-067-01 `:29-34`): the surface *exposes* identity/manifest/
  capabilities/endpoints/metadata/keys/reports/evidence/certification status and **nothing else** — runs
  **no** simulation, no mutable ledger, no conformance/trust/federation execution, no Evidence-Bundle
  construction, no certification action. TypeScript computes nothing about validation
  (`OperadorZeroReference.tsx:3-13`).
- **Status = NOT_CERTIFIED / PRE_PRODUCTION** (ADR-067 D-067-06 `:60-65`; UI strip
  `OperadorZeroReference.tsx:124` `certification="NOT_CERTIFIED"`). Status artifact:
  `certification:false`, `real_money:false`, `operator_real:false`,
  `status_label_pt="avaliado — implementação de referência só de leitura"`,
  boundary "Não é certificação, não é aprovação, não é licença financeira e não representa operador de
  produção." (`operator-zero-validation-state.json:9,8,11,15,24`).
- **Not a scheme participant / never a real-money path** — Operador Zero is a demonstration reference
  implementation, never a real scheme participant and never a real-money path
  (`BANZAMI_OPERATIONAL_SCHEME.md:108-109`; regulatory-state schema `real_participants_active`
  description `:64`).
- **Validation is performed in BanzAI validation mode** via Rust engines, on artifacts fetched by a
  secure Rust fetcher (ADR-068), never by the browser; Operador Zero uses the **same** validation process
  as any future published implementation (`OperadorZeroReference.tsx:245-276`; ADR-067 D-067-02 `:36-42`).

## 9. BanzAI role — transversal human-operator interface (not a 4th layer, not an authority)

ADR-054 `decisions/adr/ADR-054-…md`; ADR-041 `decisions/adr/ADR-041-…md`;
`docs/governance/BANZAI_NATIVE_PROTOCOL_AGENT.md`; `GOVERNANCE.md §10`; three-layer doc §6-7.

- **Primary human-operator interface** for interacting with BANZA (ADR-054 Decision `:40-51`;
  `README.md:50-63`). It interprets requests, consults the reference, guides implementation, routes to
  verifiable engines, explains results, prepares evidence.
- **Transversal to the three layers, NOT a fourth authority** (D-059-04,
  `BANZA_THREE_LAYER_ARCHITECTURE.md:128-138,43-45`). It orients and executes **by calling the Rust
  engines**; never decides, certifies, admits, publishes, or activates funds.
- **Not normative, not a governance authority** (`GOVERNANCE.md:68-78`; ADR-054 `:49-51,69-73`; ADR-041
  §7 `:106-112`): does not create rules, certify, approve, license or publish operators, and does not
  move funds. New rules enter only via the public governance process; machine-to-machine integration does
  not depend mandatorily on BanzAI (ADR-054 Boundaries `:56-73,140-150`).
- **Authority rule (permanent):** *Rust understands, routes, executes, validates and DECIDES; local Qwen
  explains once and never decides/certifies/admits/publishes/activates funds/changes a state or reason
  code/replaces a regulator; Rust validates before anything is published*
  (`BANZA_THREE_LAYER_ARCHITECTURE.md:139-151` incl. role table). ADR-067 D-067-03:
  `qwen_decision_calls=0`, `external_model_calls=0` (`:44-47`).
- **Canonical phrase:** *"BanzAI guia; os motores verificam; a evidência prova; a governança decide."*
  (`GOVERNANCE.md:77-78`; ADR-054 `:53`; `README.md:63`).
- **Rule provenance** (ADR-041 §5 `:72-96`): BanzAI may only guide from existing normative/explanatory
  sources; it cannot invent rules, create ADRs, or convert a suggestion into a norm; if the protocol has
  no rule it must say so.
- **Current runtime state** (`README.md:374-393`): single public interface `banza.network/banzai`;
  default engine `local_qwen` (Qwen3-4B GGUF via llama.cpp, on-host); **external model calls = 0**
  (`external_model_called=false`); Qwen is non-normative language layer; Rust/WASM owns retrieval,
  routing, validation, journey state machine, upload scan. `BANZAI_NATIVE_PROTOCOL_AGENT.md:66-68` records
  the demonstration/pre-production posture (`llm_calls=0`, no external calls).

## 10. Current honest pre-production state

Machine descriptor: `contracts/production/protocol-version.json`.

- `protocol_version:"1.0.0"`, `state:"M2_PROTOCOL_IMPLEMENTATION"`, **`pre_production:true`**,
  **`production_certificates:false`**, **`operators:[]`** (`protocol-version.json:4-8`).
- "Production" here means production **of the protocol** as an open specification — **NOT** financial
  operation; no real operator is created, no production certificate is emitted, and no funds are ever
  held/moved/settled by BANZA (`protocol-version.json:10,19`).
- README "Published state" table: Public Protocol Registry (`/operators`) = `[]` — no operator metadata
  published yet; `production_certificates=false` — "BANZA issues nothing to operators"; Technical Registry
  currently empty (pre-production); **no `/certificates` route** (`README.md:225-233`).
- Explicit "Pre-production" note: `/operators=[]`, `production_certificates=false`, no operator evidence
  published; public validations are technical/demonstration evidence, not authorisation
  (`README.md:391-393`, `:445-449`).
- `SECURITY.md:5` and `CHANGELOG.md:24` corroborate: no operator in production and
  `production_certificates` false.
- Absence from the registry is **not** a regulatory prohibition — it means metadata has not been indexed
  (`README.md:305-306`).

## 11. Obsolete / incompatible terminology check (active surfaces)

The retired-model terms — **"BANZA CA"**, central Certificate Authority, operator X.509 / operator
certificates, general company certificate, central human approval as a protocol requirement, BANZA as
operator/bank/PSP/wallet/settlement, BanzAI as authority, Qwen as decider, Operador Zero as production,
real funds active — were searched across active surfaces (`website/content`, `website/components`,
`website/lib`, `docs/governance`, `docs/reference`, `contracts`, `engines`, top-level identity files).

**Result: no obsolete term is presented as a current/active fact on any active surface.** Where these
terms appear, they appear only in legitimate forms:
- **Retirement map** — ADR-057 documents the superseded ADRs and the retired phrases (e.g. "BANZA CA
  issues certification", CA-issued certification levels) precisely so they stay retired
  (`website/content/decisions/adr/ADR-057-current-only-canonical-adr-tree.md:25,70,73`).
- **Negation** — e.g. "with no BANZA CA (ADR-038)"
  (`website/content/decisions/adr/ADR-064-…md:30`); README "An authority that admits or authorises
  operators" listed under **BANZA is not** (`README.md:463`).
- **Denylists / guards / tests** — "BANZA CA" and "operador certificado" appear as forbidden terms
  (`website/components/banzai/banzai-agent.ts:226-233`; `website/lib/publicSurface.test.ts:112`;
  `website/lib/m2_19g-new-pages.test.ts:29,37`; `website/lib/m2_16-home.test.ts:83`).
- **Historical process records** in `docs/governance/PHASE_*` and `M2_*_AUDIT.md` are dated audit
  records, not live normative/public surfaces; they discuss the removal of the CA model.

`docs/governance/BANZA_TRUST_ARCHITECTURE.md` (rewritten) presents the **active** open trust model (Trust
Root, Delegated Signing Keys, Signed Protocol Metadata, manifests, conformance evidence, registry,
revocation/fail-closed) with **no** active "BANZA CA / autoridade certificadora / operador certificado"
claim (`:1-14`).

## 12. Divergences / notes for the whitepaper (low-risk)

- **ADR-052 uses pre-three-layer phrasing for Banzami.** ADR-052 (`:71-77`) frames Banzami as "a future
  real *reference operator*" — *"Operador Zero prova a arquitectura; Banzami prova o mundo real."* The
  now-canonical framing (ADR-059/060) calls Banzami the **designated operator ("operadora designada") of
  the L3 Banzami Operational Scheme**, in `REGULATORY_AUTHORIZATION_IN_PROGRESS`. These are compatible
  (both keep Banzami separate and non-authorised today), but the whitepaper should use the newer L3
  "designated operator of the first operational scheme" language rather than ADR-052's "future real
  reference operator" wording, to avoid conflating a *scheme operator* with the operator-neutral
  placeholder "reference operator" used elsewhere.
- **Legal-name casing is inconsistent across surfaces** (all-caps `LDA.` in NOTICE/GOVERNANCE/MAINTAINERS
  vs mixed-case `Lda.` with em-dash in the L3/regulatory docs and machine artifacts). Same entity; the
  whitepaper should pick one canonical rendering and note both are in use.
- **CLAUDE.md / memory use "the reference operator" as an operator-neutral placeholder** for the operator
  *role* (not a brand). The whitepaper must not read this as a second, distinct entity from the L3
  designated operator.
