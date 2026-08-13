# ADR-007 — Conflict of interest: infrastructure and key separation

- **Status:** Accepted
- **Date:** 2026-07
- **Related:** ADR-003 (three-layer institutional architecture), ADR-006 (Banzami Operational Scheme —
  designated operator; BANZA ≠ Banzami), ADR-004 (certification ≠ admission ≠ authorisation), ADR-005
  (regulatory-state boundary + real-money activation gate), ADR-029 (private keys never on serving
  infrastructure), ADR-043 (Rust-first official engines), ADR-027 (open protocol trust model without CA),
  ADR-026 (PostgreSQL as protocol-state store)

---

## Context

ADR-044 names **Banzami — Tecnologia e Serviços, Lda.** as the creator and initial institutional
maintainer of the open protocol, and ADR-006 designates the same company as the operator of the first
operational scheme (Layer 3). The creator of the protocol is therefore also the first party to run a scheme
on top of it. That coincidence is a structural conflict of interest: the entity that shapes the protocol
and the certification profile is also the entity most immediately measured by them.

ADR-006 already fixed the principle (D-060-05: no self-privilege) and ADR-003 already fixed that the three
layers are separated in infrastructure and keys (D-059-06). This ADR makes both operational: it
**canonicalises** the no-self-privilege controls, and it fixes **how** the separation is realised across
infrastructure and cryptographic key domains, so the conflict is controlled by architecture rather than by
promise. If Banzami could quietly certify its own implementation, run it on shared infrastructure, or reuse
a key across domains, the neutrality of L1/L2 and the regulatory boundary of L3 would both be lost.

## Decision

**Because BANZA's creator (Banzami) is also the first scheme operator, the conflict of interest is
controlled structurally: Banzami's own implementation is certified through exactly the same public path as
any other implementation with no self-privilege; the five infrastructures are separated so no shared
component can grant a privilege; and cryptographic keys are domain-separated and never reused across
domains. The separation is an architectural invariant, verifiable by any third party, not an editorial
commitment.**

| ID | Decision |
|----|----------|
| **D-063-01** | **Structural control, not promise.** The conflict of interest arising from creator == first operator is controlled by architecture — same public certification path, separated infrastructure, separated keys — so that the correctness of the control does not depend on Banzami's good conduct and can be independently verified by any party (ADR-003 D-059-06, ADR-006 D-060-05). |
| **D-063-02** | **No self-privilege (canonical form of D-060-05).** Banzami's own implementation is certified through the **same public, versioned profile**, the **same conformance and interoperability suites**, the **same Rust engine**, the **same reason codes**, the **same validity window** and the **same suspension/revocation** as any other implementation, and its result is **independently verifiable** by re-executing the public vectors. Banzami receives **no** reduced profile, **no** private certification, **no** bypass, **no** reserved endpoint, **no** publication without evidence, **no** FAIL→PASS override and **no** secret exception. A negative conformance result for Banzami's implementation is a FAIL exactly as for anyone else; no human may convert it to a PASS (ADR-027 INV-OTE-008). |
| **D-063-03** | **Infrastructure separation across five domains.** Five infrastructures are separated: (1) **BANZA Protocol** infra (L1 — public rules, contracts, signed protocol metadata, technical registry serving, public verification); (2) **Certification & Registry** infra (L2 — conformance/interoperability evaluation, certification records, the technical registry of implementations); (3) **BanzAI** infra (the transversal human interface + local Qwen); (4) **Banzami Scheme** infra (L3 — scheme administration, participant directory, sandboxed scheme operations); (5) **regulated-data** infra (L3 — dormant/fail-closed until authorisation exists, ADR-005). Each domain separates its **databases, schemas, roles, keys, secrets, logs, backups, retention, pipelines, monitoring and permissions**; no component of one domain may read, write or grant a privilege in another. The separation matrix is `docs/governance/BANZA_SEPARATION_MATRIX.md`. |
| **D-063-04** | **Key separation — no key is ever reused across domains.** Eight key domains exist and are never shared: **Protocol Metadata Signing Key** (L1), **Certification Registry Signing Key** (L2), **Certification Record Signing Key** (L2), **BanzAI Service Keys** (BanzAI transport/session), **Banzami Scheme Administrative Key** (L3), **Banzami Scheme Operational Keys** (L3), **Operator Implementation Keys** (operator-held, external to BANZA) and **future settlement keys** (L3, dormant/fail-closed until ADR-005 conditions are met). Each key signs or authenticates within exactly one domain; no key is reused, re-purposed or copied across domains. Consistent with ADR-029/038, the offline trust root and its delegated signing keys never reside on serving infrastructure. |
| **D-063-05** | **Same revocation and validity semantics.** Banzami's implementation is subject to the same scope, expiry, suspension and revocation lifecycle as any other certified implementation; revocation of Banzami's implementation follows the same signed, dated, fail-closed path (ADR-027 INV-OTE-005/006) and is never suppressed, delayed or exempted because the implementation is the operator's own. |
| **D-063-06** | **Independent verification needs no Banzami account.** Any third party can reproduce Banzami's conformance result from the public vectors and verify its certification record against root-signed protocol metadata without any Banzami credential, scheme membership or privileged endpoint (ADR-027, ADR-006 D-060-06). The technical registry (L2) is independent of the scheme participant directory (L3). |

## Consequences

**Positive.** The conflict of interest (creator == first operator) is neutralised by construction: because
the certification path, the infrastructure and the keys are the same-for-everyone or physically separated,
there is no place for a self-privilege to hide, and any auditor or regulator can confirm this without
trusting Banzami's word. The protocol (L1) and certification (L2) stay buildable, governable and verifiable
with no knowledge of the scheme.

**Negative (accepted).** Five separated infrastructures and eight separated key domains cost more
operational discipline — more databases, more secrets management, more pipelines, more monitoring — than a
single shared stack. This is deliberate: the cost of separation is what makes the neutrality of L1/L2 and
the regulatory boundary of L3 structural rather than editorial, and it is cheaper than the loss of trust a
shared component would eventually cause.

**Untouched.** No financial invariant. The open trust model (ADR-027), keys-never-on-serving-infrastructure
(ADR-029), Rust-sole-authority and Qwen-never-decides (ADR-043/059), the regulatory-state boundary
(ADR-005) and BANZA's operator neutrality (ADR-001/003/059/060) all stand. This ADR decides how the
conflict is separated; it does not change what any layer is.

## References

- ADR-003 (three-layer architecture), ADR-006 (Banzami Operational Scheme), ADR-004 (certification ≠
  admission ≠ authorisation), ADR-005 (regulatory-state + real-money gate), ADR-029 (keys never on serving
  infrastructure), ADR-043 (Rust-first engines), ADR-027 (open trust model without CA), ADR-026 (PostgreSQL
  as protocol-state store)
- `docs/governance/BANZA_SEPARATION_MATRIX.md` — the five-infrastructure separation matrix + key-domain table
- `docs/governance/BANZA_CONFLICT_OF_INTEREST_POLICY.md` — the conflict-of-interest policy
- `docs/governance/BANZA_RESPONSIBILITY_MATRIX.md` — responsibilities across L1/L2/L3 + BanzAI + regulator + participants
