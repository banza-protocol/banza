# ADR-059 — BANZA Three-Layer Institutional Architecture

- **Status:** Accepted
- **Date:** 2026-07
- **Milestone:** M2.19C
- **Related:** ADR-001 (open financial protocol — implementation independence), ADR-003 (operator
  separation / neutrality), ADR-005 (protocol-first), ADR-037 (Rust-first engines), ADR-038 (open trust
  model without CA), ADR-039 (operator self-publication), ADR-040 (federation trust evaluation),
  ADR-052/053 (Operador Zero — reference implementation), ADR-054 (BanzAI as primary human interface),
  ADR-058 (trust-invariant registry realignment)
- **Companion decisions (M2.19C):** ADR-060 (Banzami Operational Scheme), ADR-061 (certification ≠
  admission ≠ authorisation), ADR-062 (regulatory-state boundary + RealMoneyActivationGate), ADR-063
  (conflict-of-interest + infrastructure/key separation)

---

## Context

BANZA has, until now, been described mostly as "the open protocol" plus a growing set of subsystems
(conformance, trust, BanzAI, Operador Zero). As the project approaches its v1.0 launch it must present a
single, canonical **institutional architecture** that a reader, an operator, an auditor, a regulator and
BanzAI itself all reach the same way — so that "what is BANZA, what certifies, and who operates" is never
ambiguous, and so that the pieces built in M2.19D–I (certification, BanzAI control plane, scheme
readiness) attach to a stable frame.

The frame must keep the permanent invariant of ADR-001/003: **the protocol is operator-neutral and outlives
any operator.** It must also make room for the first real operational scheme (Banzami, ADR-060) without
letting that scheme's existence contaminate the protocol or the certification layer.

## Decision

**BANZA is a three-layer institutional architecture, with BanzAI as the transversal human interface
across all three layers. The layers are separated by responsibility, by infrastructure and by keys; the
separation is an architectural invariant, not a presentation choice.**

```
                         ┌───────────────────────────────────────────────┐
   BanzAI  ─────────▶│  L1  BANZA Protocol            (open, neutral) │
   (transversal human    │  L2  Conformance & Interoperability            │
    interface; not an     │      Certification            (per-implementation, evidence) │
    authority)           │  L3  Banzami Operational Scheme (designated operator, regulated) │
                         └───────────────────────────────────────────────┘
        Rust understands, routes, executes, validates and DECIDES.
        Qwen (local) explains once. Rust validates before publishing.
```

| ID | Decision |
|----|----------|
| **D-059-01** | **Layer 1 — BANZA Protocol.** An open, neutral, verifiable financial protocol: public rules, contracts, messages, schemas, APIs, invariants, reason codes, technical identity, manifests, signatures, discovery, compatibility, profiles, Signed Protocol Metadata, trust, revocation, the technical registry, federation and public verification. BANZA is **not** a bank, PSP, wallet, e-money institution or financial operator; it does not hold or move funds, does not run client accounts, does not settle, does not provide financial services, does not issue licences, does not replace the regulator or any scheme, and assumes none of the participants' financial responsibilities. |
| **D-059-02** | **Layer 2 — BANZA Conformance & Interoperability Certification.** A technical system that certifies, per implementation, that an independent implementation has demonstrated conformance and interoperability against a public, versioned profile. Certification is evidence-based, Rust-decided, reproducible, hash-bound, scoped, time-limited and subject to suspension/revocation. It certifies an **implementation**, never generically an entity; it is **not** a licence, **not** scheme admission and **not** regulatory authorisation (ADR-061). |
| **D-059-03** | **Layer 3 — Banzami Operational Scheme.** The first operational scheme built on BANZA, promoted, designed and administered by **Banzami — Tecnologia e Serviços, Lda.** as the designated operator, conditioned on obtaining the applicable regulatory framework (ADR-060). Its internal state is `REGULATORY_AUTHORIZATION_IN_PROGRESS`; real funds, wallets, settlement and real participants are fail-closed until formal evidence exists (ADR-062). |
| **D-059-04** | **BanzAI is transversal, not a fourth authority.** BanzAI is the canonical human interface through which people run every human workflow across the three layers — asking, simulating, conformance, interoperability, trust, evidence, certification, registry, federation and (sandboxed) scheme operations. It orients and executes by calling the Rust engines; it never decides. Machine/SDK consumers keep direct access to the public APIs — BanzAI is the human plane, not a mandatory gate for machines (ADR-054). |
| **D-059-05** | **Authority rule (permanent).** The Rust engines understand, route, execute, validate and **decide** every terminal, action, evaluation and state transition. The local Qwen model **explains once** and never decides, certifies, admits, publishes, activates funds, changes a state or a reason code, or substitutes a regulator. Rust validates before anything is published (ADR-037). |
| **D-059-06** | **Separation is an invariant.** The three layers are separated in responsibility, infrastructure, databases, schemas, roles, keys, secrets, logs, backups, retention, pipelines, monitoring and permissions; keys are never reused across domains (ADR-063). The protocol layer must remain buildable, governable and verifiable with no knowledge of any scheme. |
| **D-059-07** | **Neutrality survives the scheme.** BANZA ≠ Banzami and BANZA ≠ the Banzami Operational Scheme. BANZA certification is not exclusive to the Banzami scheme; other legally-eligible entities may adopt the protocol and run independent schemes; an implementation may be certified without being admitted to any scheme; the technical registry does not depend on any scheme's participant directory; public verification requires no scheme account; and the protocol's continuity does not depend on the scheme's commercial continuity (ADR-060). |

> **Nota de terminologia (alinhamento com o Whitepaper v1.0).** O nome canónico da terceira camada é
> **"Camada 3 — Esquemas operacionais independentes"** / *"Layer 3 — Independent operational schemes"*,
> conforme o Whitepaper actual. O *Banzami Operational Scheme* registado em D-059-03 é a **primeira
> instância** dessa camada, não a camada. A decisão arquitectural mantém-se inalterada; apenas o rótulo
> é operator-neutral, como a neutralidade de operador do protocolo exige.

## Canonical definitions

- **BANZA (L1):** *"O BANZA é um protocolo financeiro aberto que define regras, contratos, perfis e
  mecanismos verificáveis de interoperabilidade entre implementações independentes."*
- **Certification (L2):** *"O BANZA certifica tecnicamente que uma implementação demonstrou conformidade e
  interoperabilidade com um perfil público e versionado. A certificação é baseada em evidência
  verificável, limitada no tempo, vinculada ao âmbito e sujeita a suspensão ou revogação."*
- **Banzami Operational Scheme (L3):** *"A Banzami é a operadora designada do Banzami Operational Scheme,
  condicionada à obtenção do enquadramento regulatório necessário para operações com fundos reais."*
- **Institutional summary:** *"O BANZA fornece o protocolo, os perfis, os testes, a evidência e a
  certificação técnica. A Banzami administra o primeiro scheme operacional baseado no BANZA, condicionado
  ao enquadramento regulatório aplicável."*

## Consequences

**Positive.** One canonical frame for every surface (website, Reference, BanzAI, ADRs, SVGs). The
certification layer (M2.19D) attaches to L2 with a clean boundary from both the protocol and the scheme.
The BanzAI control plane (M2.19E) has a defined, non-authoritative role. The scheme (M2.19H) is
introduced without weakening protocol neutrality. Auditors and regulators can read each layer's boundary
directly.

**Negative (accepted).** Three separated layers cost more infrastructure discipline (separate DBs, keys,
pipelines) than a single stack — deliberately, because the separation is what keeps the protocol neutral
and the regulatory boundary structural rather than editorial.

**Untouched.** No financial invariant. The open trust model (ADR-038/040), Rust-sole-authority (ADR-037),
Qwen-never-decides, Operador Zero as reference implementation (ADR-052), and the current-only ADR tree
(ADR-057) all stand. This ADR names and frames the layers; the companion M2.19C ADRs decide the scheme,
the separations and the regulatory gate.

## References

- ADR-060/061/062/063 (M2.19C companion decisions)
- `docs/governance/BANZA_THREE_LAYER_ARCHITECTURE.md` — the canonical architecture document
- `docs/reports/THREE_LAYER_ARCHITECTURE_REPORT.md` — the M2.19C execution report
