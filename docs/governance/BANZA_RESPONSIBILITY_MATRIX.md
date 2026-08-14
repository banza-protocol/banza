# BANZA — Responsibility Matrix (L1 / L2 / L3 + BanzAI + Regulator + Participants)

> **Formulação canónica.** A Governança define o protocolo; o Rust avalia e decide; o Registo publica; o
> BanzAI orienta; o Qwen explica uma vez; a Banzami opera o scheme; o regulador autoriza; os participantes
> prestam os serviços. Cada responsabilidade pertence a um actor e a uma camada — Certificação Técnica ≠
> Admissão ao Scheme ≠ Autorização Regulatória; BANZA ≠ Banzami; Registo Técnico ≠ Directório de
> Participantes (ADR-004/060/061/062/063).

This matrix fixes **who is responsible for what** across the three layers, the BanzAI interface, the
regulator and the participants. It is the reference when a responsibility is unclear or is being attributed
to the wrong actor. It does not add any authority: it records the separations that ADR-004..063 already
decide.

---

## Actors

| Actor | Layer / role | One-line responsibility |
|-------|--------------|-------------------------|
| **Governance (ADRs/RFCs)** | L1 | Defines and evolves the protocol — rules, contracts, invariants, profiles. |
| **Rust engines** | L1/L2 | Understand, route, execute, validate and **decide** every evaluation and state transition. |
| **Technical Registry** | L2 | Publishes verifiable technical facts — implementations, conformance, certification, revocation. |
| **BanzAI** | transversal | Orients and executes human workflows across all layers; **decides nothing**. |
| **Qwen (local)** | transversal | **Explains once**; never decides, certifies, admits, publishes or changes a state. |
| **Banzami** | L3 | Operates the first operational scheme as designated operator (conditioned on authorisation). |
| **Regulator** | external | Authorises real-money operation; the only authority that grants authorisation. |
| **Participants** | external | Provide the actual financial services under their own authorisation. |

---

## Responsibility matrix (RACI-style)

**R** = responsible/does it · **A** = accountable/owns the outcome · **C** = consulted/input · **I** =
informed · **—** = no role. Read each row as "who does this".

| Responsibility | Governance | Rust engines | Registry | BanzAI | Qwen | Banzami (L3) | Regulator | Participants |
|----------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Define / evolve the protocol (rules, contracts, invariants, profiles) | A/R | I | — | I | — | C | — | C |
| Evaluate conformance & interoperability (a verdict) | I | A/R | I | I | — | I | — | C |
| Decide certification (PASS/FAIL, scope, validity) | I | A/R | I | — | — | — | — | — |
| Publish the technical registry (implementations, certification, revocation) | I | R | A/R | I | — | — | — | I |
| Orient the human through workflows (ask, simulate, guide) | — | C | — | A/R | R | I | — | I |
| Explain a concept / an answer (once) | — | C | — | R | A/R | — | — | — |
| Admit a participant to the scheme (scheme admission) | — | C | — | I | — | A/R | I | C |
| Operate the scheme (administration, participant directory, operations) | — | C | — | I | — | A/R | I | C |
| Authorise real-money operation (licence / regulatory framework) | — | — | — | — | — | C | A/R | C |
| Provide the actual financial services (hold/move funds, settle, client accounts) | — | — | — | — | — | I | I | A/R |
| Move / settle real funds | — | — | — | — | — | — | I | A/R |
| Revoke / suspend a certification (signed, dated, fail-closed) | I | A/R | R | I | — | I | — | I |
| Verify trust independently (re-run vectors, check signatures) | C | R | R | I | — | I | I | R |

**How to read the separations.**

- **Certification (L2) ≠ Admission (L3) ≠ Authorisation (regulator).** Three different rows, three different
  accountable actors: Rust decides certification; Banzami decides scheme admission; the regulator grants
  authorisation. No actor spans them (ADR-005, ADR-007).
- **Registry (L2) ≠ Participant Directory (L3).** The registry publishes technical facts (Registry
  accountable); the participant directory belongs to the scheme (Banzami accountable). Public verification
  needs neither a scheme account nor a Banzami credential (ADR-006, ADR-006).
- **BANZA ≠ Banzami.** BANZA (Governance + Rust + Registry + BanzAI) never holds or moves funds, never
  settles and never authorises; those rows are the regulator's and the participants' (ADR-004).
- **Rust decides; Qwen explains.** Every "decide/evaluate/publish" row is Rust (or Registry after Rust
  validation); every "explain" row is Qwen, which is never accountable for a decision (ADR-038/059).

---

## What each actor is NOT responsible for

| Actor | Is NOT responsible for |
|-------|------------------------|
| **BANZA (L1/L2)** | Holding/moving funds, settlement, client accounts, issuing licences, authorising operation, admitting participants, being an operator/bank/PSP/EMI. |
| **Rust engines** | Explaining to humans as authority (that is orientation), authorising real money, or converting a FAIL to a PASS. |
| **Registry** | Deciding verdicts (it publishes what Rust decided), or listing scheme participants (that is the directory). |
| **BanzAI / Qwen** | Deciding, certifying, admitting, publishing, activating funds, or changing a state/reason code. |
| **Banzami (L3)** | Being BANZA, granting itself certification, self-privileging its implementation, or presenting itself as already authorised (ADR-006, ADR-007). |
| **Regulator** | Defining the protocol or deciding technical certification (that is Governance + Rust). |
| **Participants** | Certifying themselves or authorising themselves; they implement the protocol and provide services under their own authorisation. |

---

## References

- ADR-004 (three-layer architecture; authority rule; separation), ADR-006 (Banzami
  Operational Scheme), ADR-005 (certification ≠ admission ≠ authorisation), ADR-007 (regulatory-state +
  real-money gate), ADR-006 (conflict of interest + separation)
- ADR-038 (Rust-first engines), ADR-025 (open trust model without CA), ADR-036 (BanzAI as primary human
  interface)
- `docs/governance/BANZA_SEPARATION_MATRIX.md`, `docs/governance/BANZA_CONFLICT_OF_INTEREST_POLICY.md`
