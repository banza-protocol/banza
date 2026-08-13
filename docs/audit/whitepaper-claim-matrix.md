# Whitepaper v1.0 — Claim Matrix (Phase G, G2)

Audit of the **canonical Portuguese edition** (`docs/whitepaper/latex/whitepaper.pt.tex`) against the
normative surface frozen in [`whitepaper-alignment-baseline.json`](whitepaper-alignment-baseline.json)
at commit `990b042`.

Built **before** any edit. Verdicts: `SUPPORTED` · `SUPPORTED BUT UNDER-SPECIFIED` · `OVERSTATED` ·
`OUTDATED` · `NON-NORMATIVE CONTEXT` · `UNSUPPORTED` · `ABSENT` (a mechanism the surface has and the
paper does not mention).

---

## 1. Operations — the G3 gate

| # | Claim | § | Normative source | Verdict | Action |
|---|---|---|---|---|---|
| 1.1 | "Para transferir valor … as respectivas implementações precisam de acordar formatos…" | 1 | `contracts/openapi/transfers.yaml` (NORMATIVE_API, L1), `conformance/vectors/transfers.json` | **SUPPORTED** | keep |
| 1.2 | "L1 — Core Payment Capability acrescenta capacidades essenciais de pagamento e rastreabilidade" | 4 | profile registry L1: `consumer_payment`, `merchant_acceptance`, `transfer`, `traceability` + 10 invariants | **SUPPORTED** | keep; the capability names are now registry-anchored |
| 1.3 | "L2 … iniciação de pagamentos por pedido ou código QR dinâmico" | 4 | `payment-intent`, `payment-session`, `qr/payload-format`, `qr/lifecycle` schemas + vectors | **SUPPORTED** | keep |
| 1.4 | "L3 … condições técnicas relacionadas com encaminhamento, liquidação e reconciliação; estas funções continuam a ser executadas pelos operadores ou esquemas aplicáveis" | 4 | routing: `federation-routing.json` + flow spec; settlement: `settlements/*` + `federation-obligation`; reconciliation: **`INV-FED-RECON-001` only** | **SUPPORTED** — and already proportionate | keep verbatim. It is the one sentence in the paper that already draws the specify/execute line, and it does not inflate reconciliation |
| 1.5 | "O protocolo … não exige que mensagens, fundos ou decisões atravessem uma infraestrutura central do BANZA" | 1 | invariant *operational independence* | **SUPPORTED** | keep; ensure it reads as *no BANZA-maintained mandatory path*, not *no implementation may use a hub* |
| 1.6 | Reconciliation as an autonomous BANZA subsystem | — | — | **not claimed anywhere** | do not introduce. Reconciliation is `SUPPORTED BUT UNDER-SPECIFIED`: one invariant with a stated mechanism (`trace_id` through an obligation), no contract or vector of its own |

**Gate result.** The paper's payment/transfer language is supported. What must be enforced throughout
is the verb: **BANZA especifica; as implementações executam; os esquemas operam.**

## 2. Trust

| # | Claim | § | Source | Verdict | Action |
|---|---|---|---|---|---|
| 2.1 | "Uma raiz de confiança, mantida fora de linha, assina apenas o Manifesto de Chaves com Ed25519; esse manifesto autoriza chaves delegadas separadas por domínio" | 5 | ADR-079 Model A | **SUPPORTED** | keep — already the corrected model |
| 2.2 | "Mecanismos de revogação e controlo de validade permitem rejeitar material revogado ou expirado" | 5 | BRL, expiry | **SUPPORTED** | keep |
| 2.3 | Monotonic anti-rollback; equal-marker equivocation | — | `spec/trust-freshness.md`, ADR-085, 13 vectors | **ABSENT** | **add** to §5 and §8, compact, with its limits (G24, G26) |
| 2.4 | Signing-input digest | — | `spec/trust-freshness.md` §3.1 | **ABSENT** | add only as *SHA-256 do input de assinatura canónico BCJ/1*; member names stay in the spec (G25) |
| 2.5 | Publication availability: single point, no mirrors, no CT, fail-closed | 10 | `spec/trust-freshness.md` §6 | **UNDER-SPECIFIED** — §10 covers compromise, not unavailability | **add** to §10 (G27) |

## 3. Profiles

| # | Claim | § | Source | Verdict | Action |
|---|---|---|---|---|---|
| 3.1 | "cinco níveis cumulativos de conformidade, de L0 a L4" | 4 | profile registry, `cumulative: true` | **SUPPORTED** | keep |
| 3.2 | L0–L3 descriptions | 4 | profile registry | **SUPPORTED** | verify wording against the registry, not against the old text |
| 3.3 | "O L4 … acrescenta integração com redes externas; é definido por perfil e exige evidência específica dessa integração" | 4 | `external_profile` block | **SUPPORTED BUT UNDER-SPECIFIED** | **rewrite** (G20): inherits L3, adds no universal artifact, profile identified by id + version, evidence scoped, L3 ⇏ L4, `not_run` with no profile, **zero published** |
| 3.4 | Capability identifiers are normative and deterministically evaluable | — | `capability-registry.production.json`, `spec/capabilities.md` | **ABSENT** | add one compact sentence (G19); no identifier list, no aliases |
| 3.5 | Vector applicability per profile | — | `required_vector_cases` | **ABSENT** | add one clause (G33); no counts, no grammars |

## 4. Determinism

| # | Claim | § | Source | Verdict | Action |
|---|---|---|---|---|---|
| 4.1 | "artefactos canónicos, resumos criptográficos" | abstract, 2 | `spec/canonicalization.md` | **SUPPORTED BUT UNDER-SPECIFIED** — the canonical form is never named | **name BCJ/1** (G13) as a profile of RFC 8785 (JCS) |
| 4.2 | Numeric domain | — | P2, declared `maximum`/`minimum` | **ABSENT** | add the stable sentence (G14); **no** counts |
| 4.3 | "códigos de motivo" as part of `R` | 2 | `spec/reason-codes.md` | **UNDER-SPECIFIED** | add *estado decide, código explica* + independent implementations reaching semantically equivalent results (G32) |
| 4.4 | Eq. (4) semantic equivalence, cited only to [8] | 2 | `spec/reason-codes.md` §8 | **UNDER-SPECIFIED** | separate the scientific motivation from the **BANZA normative definition** (G35) |
| 4.5 | Idempotency | — | `spec/idempotency.md`, ADR-084 | **ABSENT** | add compactly: scope, request identity, conflicting reuse, retention (G34) |

## 5. Implementability

| # | Claim | § | Source | Verdict | Action |
|---|---|---|---|---|---|
| 5.1 | "os requisitos do protocolo são definidos pelos artefactos normativos versionados aplicáveis" | 1 | Normative Manifest | **SUPPORTED BUT UNDER-SPECIFIED** — never named | **name it** (G10): identifies the applicable normative surface, versioned, determines what belongs to a version/profile. No file list |
| 5.2 | Public vectors | 10 | 15 vector files | **UNDER-SPECIFIED** — appear only in limitations | surface them in §6 (G31) |
| 5.3 | "a abertura da especificação não demonstra, por si só, a facilidade de implementação independente" | 10 | — | **SUPPORTED** | keep |
| 5.4 | Package completeness rehearsal | — | Phase F report | **ABSENT** | may be added to §11 **only** as *ensaio de completude do pacote*, never as clean-room or independent implementation (G42) |
| 5.5 | "não foi demonstrada através de uma implementação de terceiros" | 11, 12 | baseline: NOT DEMONSTRATED | **SUPPORTED** | keep |

## 6. Architecture and authority

| # | Claim | § | Source | Verdict | Action |
|---|---|---|---|---|---|
| 6.1 | Three institutional layers | 3 | ADR-059..063 | **SUPPORTED** | keep; keep "Camada 1/2/3" distinct from L0–L4 (G15) |
| 6.2 | Five architectural invariants, both statements | 3, 12 | ADR-059.. | **SUPPORTED** | keep the literal terms; add no sixth (G16) |
| 6.3 | "O BanzAI funciona como interface humana … sem participar na determinação técnica" | 3, 6 | ADR-054, ADR-071..074 | **SUPPORTED** | keep |
| 6.4 | Authority hierarchy: paper descriptive; manifest normative; reference implements but does not define; ADRs are rationale; BanzAI is not authority | 1, 3 | manifest `not_normative` | **PARTIAL** — 1st and 3rd present, ADR and BanzAI status implicit | make the four explicit and compact (G11) |

## 7. Related work

| # | Claim | § | Source | Verdict | Action |
|---|---|---|---|---|---|
| 7.1 | ISO 20022, ISO 8583, EMV QR, ISO/IEC 9646 | 1 | refs [1]–[4] | **SUPPORTED** | keep |
| 7.2 | Mojaloop | — | Phase C, primary sources | **ABSENT** | **add** compactly to §1 (G8, G9): FSPIOP admits direct **or** Switch; the platform offers a Hub/Central Services operational architecture; the difference is boundary and the separation specification / conformance / operational scheme. No superiority |
| 7.3 | RFC 8785 | — | — | **ABSENT** | add as a reference; BCJ/1 is a profile of it (G45) |
| 7.4 | CT / DID / VC | — | Phase C: not adopted | **ABSENT** | CT only if the availability limitation makes it useful, as related work and never as a BANZA proposal (G28). DID/VC: omit (G29, G30) |

## 8. Version and governance

| # | Claim | § | Source | Verdict | Action |
|---|---|---|---|---|---|
| 8.1 | **"A versão actual do protocolo é a 1.0."** | 9 | `protocol_version = 1.0.0` | **OUTDATED** | **correct to 1.0.0** (G38) — the only outright factual error found |
| 8.2 | "alterações incompatíveis exigem uma nova versão maior" | 9 | ADR-081 | **SUPPORTED** | keep |
| 8.3 | "um perfil de certificação permanece imutável depois de publicado" | 9 | `certification-profile` schema | **SUPPORTED** | keep |
| 8.4 | Licensing | — | LICENSE, NOTICE, TRADEMARKS | **ABSENT** | one short sentence if it fits naturally (G39) |

## 9. State and limitations

| # | Claim | § | Source | Verdict | Action |
|---|---|---|---|---|---|
| 9.1 | "zero operadores de produção e zero certificações técnicas activas" | 11 | registry | **SUPPORTED** | keep |
| 9.2 | "O Operador Zero … não movimenta fundos reais, permanece não certificada" | 11 | ADR-052/053 | **SUPPORTED** | keep |
| 9.3 | Zero published concrete L4 profiles | — | `published_profiles: []` | **ABSENT** | add to §11 (G41) |
| 9.4 | Performance, scalability, adoption not demonstrated | 10, 11, 12 | baseline | **SUPPORTED** | keep |

---

## Summary

| Verdict | Count |
|---|---|
| SUPPORTED | 21 |
| SUPPORTED BUT UNDER-SPECIFIED | 6 |
| OUTDATED | 1 |
| ABSENT — mechanism the surface has and the paper omits | 11 |
| **OVERSTATED** | **0** |
| **UNSUPPORTED** | **0** |

**No claim in the current Portuguese edition overstates what the protocol does, and none is
unsupported.** The paper's problem is the opposite of the one this phase was designed to catch: it
under-represents a normative surface that has grown substantially — BCJ/1, the Normative Manifest,
execution semantics, reason codes, idempotency, anti-rollback, the capability registry and
profile-scoped vector applicability are all absent from a document describing the protocol they belong
to.

One factual error: the protocol version is stated as `1.0`, and it is `1.0.0`.

The rewrite is therefore **additive and corrective**, not a retraction.
