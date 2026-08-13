# ADR-006 — Designated operator scheme

- **Status:** Accepted
- **Date:** 2026-07
- **Related:** ADR-001 (open protocol — implementation independence), ADR-001 (operator separation),
  ADR-044 (licence & open governance — Banzami as creator/initial maintainer), ADR-041/053 (Operador Zero),
  ADR-003 (three-layer architecture), ADR-004 (certification ≠ admission ≠ authorisation), ADR-005
  (regulatory-state boundary + real-money gate)

---

## Context

ADR-044 already names **Banzami — Tecnologia e Serviços, Lda.** as the creator and initial institutional
maintainer/steward of the open protocol (a governance/attribution role). ADR-003 introduces a third
institutional layer — the first **operational scheme** built on BANZA. This ADR decides who operates that
scheme and, just as importantly, fixes the boundary that keeps the protocol open even though its creator is
also the first scheme operator.

The risk this ADR must foreclose is the collapse of three distinct things into one brand: the **protocol**
(open, neutral), the **certification** (per-implementation, non-exclusive) and the **scheme** (one
operator, regulated). If a reader concludes "BANZA = Banzami = the scheme = authorised", the protocol's
neutrality and the regulatory boundary are both lost.

## Decision

**Banzami — Tecnologia e Serviços, Lda. is the promoter, designer, intended administrator and designated
operator of the Banzami Operational Scheme, the first operational scheme built on BANZA, conditioned on
obtaining the applicable regulatory framework for operations with real funds. This designation does not
make BANZA an operator, does not make certification exclusive to the scheme, and does not, by itself,
authorise any real-money operation.**

| ID | Decision |
|----|----------|
| **D-060-01** | **Designated operator.** Banzami is the designated operator of the Banzami Operational Scheme (Layer 3, ADR-003). Canonical form: *"A Banzami é a operadora designada do Banzami Operational Scheme, condicionada à obtenção do enquadramento regulatório necessário para operações com fundos reais."* |
| **D-060-02** | **BANZA ≠ Banzami.** The protocol (L1) and the certification system (L2) are operator-neutral and are **not** the property, product or governance of Banzami. Naming Banzami as the first scheme operator does not make BANZA an operator, a bank, a PSP or a financial service; BANZA remains what ADR-001/003/059 define. |
| **D-060-03** | **Certification is not exclusive to the scheme.** A BANZA-certified implementation is certified against a public, versioned profile (L2) — never "certified for the Banzami scheme". An implementation may be certified without ever being admitted to any scheme, and scheme admission is a separate, later determination (ADR-004). |
| **D-060-04** | **Openness to other operators.** Other legally-eligible entities may adopt the protocol and operate **independent** schemes. Canonical form: *"A Banzami administra o primeiro scheme operacional baseado no BANZA. Outras entidades legalmente habilitadas podem adoptar o protocolo e operar schemes independentes."* The architecture MUST NOT assume that only one scheme, or only one operator, can ever exist. |
| **D-060-05** | **No self-privilege (conflict of interest).** Banzami's own implementation is certified through exactly the same public profile, the same conformance and interoperability suites, the same Rust engine, the same reason codes, the same validity and the same revocation as any other implementation, and is independently verifiable. Banzami gets no reduced profile, no private certification, no bypass, no reserved endpoint, no publication without evidence, no FAIL→PASS override and no secret exception (ADR-007). |
| **D-060-06** | **Registry and directory are separate.** The BANZA Technical Registry (L2 — operators, implementations, conformance, interoperability, certification, trust, revocation, evidence) is distinct from the Banzami Scheme Participant Directory (L3). The technical registry does not depend on the scheme directory; public verification requires no Banzami account; and Operador Zero is a demonstration reference implementation, never a scheme participant (ADR-041/053). |
| **D-060-07** | **Protocol continuity is independent of the scheme.** If the Banzami scheme changed, paused or ceased commercially, the BANZA protocol, its specs, engines, vectors, certification and registry remain fully available to all operators — the ADR-001 survival criterion applies to the scheme relationship too. |
| **D-060-08** | **No unproven authorisation claim.** Banzami MUST NOT be presented, in any public surface, as already authorised, licensed or approved by the competent regulator. Its internal state is `REGULATORY_AUTHORIZATION_IN_PROGRESS` and every real-money path is fail-closed until the conditions of ADR-005 are met. |

## Consequences

**Positive.** The ecosystem gains a real first operational scheme with a named, accountable operator, while
the protocol and certification stay open and non-exclusive. The conflict-of-interest surface (creator ==
first operator) is addressed structurally (D-060-05, ADR-007) rather than by promise. Third parties can see
that adopting BANZA does not require joining Banzami's scheme.

**Negative (accepted).** Naming Banzami across canonical surfaces requires disciplined, permanent guarding
so the brand never drifts into "BANZA is Banzami" or "Banzami is authorised". This is enforced by the
`banza-protocol-scheme-separation-check`, `banza-banzami-scheme-role-check` and
payment-operator brands.

**Untouched.** BANZA's operator neutrality (ADR-001/003), the open trust model, Rust-sole-authority, and the
no-CA / no-financial-operator boundary. Banzami is an institutional/scheme role; it is not added to
`NORMATIVE_BRANDS` and is never presented as a BANZA payment operator.

## References

- ADR-003 (three-layer architecture), ADR-004 (certification ≠ admission ≠ authorisation), ADR-005
  (regulatory-state + real-money gate), ADR-007 (conflict-of-interest + separation)
- `docs/governance/BANZAMI_OPERATIONAL_SCHEME.md` — the canonical scheme document
