# ADR-004 — Technical certification is not scheme admission and not regulatory authorisation

> **technical certification ≠ scheme admission ≠ regulatory authorisation.** Three separate
> decisions, taken by three different kinds of authority. Passing one grants nothing about the others.

- **Status:** Accepted
- **Date:** 2026-07
- **Related:** ADR-003 (three-layer architecture), ADR-006 (Banzami Operational Scheme), ADR-027 (open
  trust model without CA), ADR-031 (federation trust evaluation without certificates), ADR-044 (licence &
  open governance — Banzami as creator/initial maintainer); companion: ADR-005 (regulatory-state boundary
  + RealMoneyActivationGate), ADR-007 (conflict-of-interest + infrastructure/key separation)

---

## Context

ADR-003 fixes the three-layer institutional architecture and ADR-006 names Banzami as the designated
operator of the first scheme. The single most dangerous ambiguity that remains is the collapse of three
distinct determinations into one perceived status: a reader — or an operator's marketing, or BanzAI, or an
auditor — treating **"BANZA-certified"** as if it meant **"admitted to a scheme"** or, worse, **"authorised
to operate with real money"**.

These three determinations are made by different owners, on different evidence, at different times, with
different consequences. Conflating them would let a purely technical PASS read as a licence, would let
scheme membership imply regulatory approval, and would let the protocol appear to grant permissions it has
no authority to grant. ADR-027/040 already removed any central authority over operators from the *trust*
path; this ADR does the equivalent for the *status* path — it makes the three determinations structurally
independent and forbids any surface from implying one from another.

## Decision

**Technical Certification (L2), Scheme Admission (L3) and Regulatory Authorisation are three distinct
determinations with distinct owners, evidence and effects. None of them implies, grants, propagates to or
substitutes for either of the others, and no surface — website, Reference, BanzAI, registry, certificate,
ADR or SVG — may present them as equivalent or as flowing automatically from one another.**

| ID | Decision |
|----|----------|
| **D-061-01** | **Technical Certification (L2) — definition.** BANZA Conformance & Interoperability Certification is a **per-implementation**, evidence-based, **Rust-decided**, reproducible, hash-bound, **scoped** and **time-limited** determination that an independent implementation has demonstrated conformance and interoperability against a public, versioned profile, and it is subject to suspension and revocation. It certifies an **implementation**, never generically an entity. It confers **no status, no licence, no permission and no authorisation**: a valid certificate means "this implementation passed this profile at this version with this evidence" and nothing more. |
| **D-061-02** | **Scheme Admission (L3) — definition.** Scheme Admission is a determination made by the **Banzami Operational Scheme** (or by any independent scheme, ADR-006) that a specific entity/implementation is admitted as a participant of *that* scheme, on the basis of the scheme's own due diligence, eligibility criteria and contracts. It is a **separate, later step** that **MAY require** valid Technical Certification as a prerequisite, but is **never implied by** certification. Certification alone admits no one to any scheme. |
| **D-061-03** | **Regulatory Authorisation — definition.** Regulatory Authorisation is granted by the **competent regulator** to an operator or participant, under the applicable legal framework, to conduct regulated financial activity. **BANZA is not a party** to this determination: it does not grant, hold, represent, accelerate or substitute for regulatory authorisation, and it neither issues licences nor replaces the regulator (ADR-003 D-059-01). |
| **D-061-04** | **Certification never implies admission.** A certified implementation is **not** thereby a scheme participant. Certification and admission are decided by different owners on different evidence; a valid certificate carries no scheme membership. An implementation MAY be certified **without ever being admitted to any scheme**. |
| **D-061-05** | **Admission never implies authorisation.** Admission to a scheme is **not** regulatory authorisation. A scheme participant is not, by virtue of admission, authorised by the regulator; authorisation remains a separate determination made by the regulator, to which the scheme's admission decision does not bind and cannot substitute. |
| **D-061-06** | **Non-propagation invariant.** Status does not propagate in **any** direction across the three determinations — not forward (certification → admission → authorisation) and not backward (authorisation ⇏ admission ⇏ certification). Each must be established on its own evidence by its own owner; the presence of one is never treated as evidence, cause or proxy for another. |
| **D-061-07** | **No conflation on any surface.** No public or internal surface may present the three as equivalent, as a single "approved/verified" badge, or as a pipeline where one automatically yields the next. BanzAI explains the three separately and never states or implies that certification equals admission or that either equals authorisation; Rust validates the boundary before anything is published (ADR-003 D-059-05). |
| **D-061-08** | **Distinct owners.** The owners are fixed and non-interchangeable: **Technical Certification** → BANZA Governance, decided by the **Rust** conformance/interoperability engine on public profiles; **Scheme Admission** → the **Banzami** (or other) scheme, under its own rules and contracts; **Regulatory Authorisation** → the **competent regulator**. No owner may make, imply or announce a determination that belongs to another owner. |

## Canonical definitions

- **Certificação técnica (L2):** *"A certificação técnica BANZA atesta que uma implementação demonstrou
  conformidade e interoperabilidade com um perfil público e versionado. É baseada em evidência, decidida
  pelo Rust, limitada no tempo e no âmbito, e sujeita a revogação. Não é uma licença, não é admissão a um
  scheme e não é autorização regulatória."*
- **Admissão a scheme (L3):** *"A admissão a um scheme é uma decisão do próprio scheme sobre a participação
  de uma entidade, com base nos seus critérios, diligência e contratos. Pode exigir certificação técnica
  como pré-requisito, mas nunca decorre automaticamente dela."*
- **Autorização regulatória:** *"A autorização regulatória é concedida pelo regulador competente ao
  operador/participante. O BANZA não é parte nesta decisão e não a concede, representa nem substitui."*
- **Separação canónica:** *"Certificação técnica ≠ admissão a scheme ≠ autorização regulatória. As três são
  determinações distintas, com donos distintos, e nenhuma implica as outras."*

## Consequences

**Positive.** The most damaging launch ambiguity is foreclosed structurally: a technical PASS can never be
read as a licence, scheme membership can never be read as regulatory approval, and BANZA can never appear
to grant permissions it has no authority to grant. Operators, auditors and the regulator can each read the
determination that concerns them without inheriting the others. The boundary is enforceable by a guard
rather than by editorial vigilance.

**Negative (accepted).** Every surface that mentions certification, admission or authorisation must keep
them visibly separate and resist the natural pull toward a single "approved" badge. This costs presentation
single conflated status would be a legal and neutrality hazard.

**Untouched.** No financial invariant. The open trust model (ADR-027/040), Rust-sole-authority (ADR-043),
Qwen-never-decides, and BANZA's operator neutrality and no-CA / no-financial-operator boundary
(ADR-001/003/059) all stand. This ADR separates the three *status* determinations; ADR-005 governs the
regulatory-state claims and the real-money gate that sit downstream of them.

## References

- ADR-003 (three-layer architecture), ADR-006 (Banzami Operational Scheme), ADR-005 (regulatory-state
  boundary + RealMoneyActivationGate), ADR-007 (conflict-of-interest + infrastructure/key separation)
- ADR-027/040 (open trust model / federation trust without certificates), ADR-044 (licence & open
  governance)
- `docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md`, `docs/governance/BANZAMI_OPERATIONAL_SCHEME.md`
