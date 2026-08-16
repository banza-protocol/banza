# BANZA Open Governance

**BANZA governance is open today through the public GitHub repository. It is not a future promise.**

**Banzami is the original creator and initial institutional maintainer, but the protocol is governed
through public repository processes.**

## 1. Nature

BANZA is an open financial protocol governed through public repository processes.

## 2. Origin

The protocol was originally created on **01/08/2025 (1 de agosto de 2025)** by
**BANZAMI - TECNOLOGIA E SERVIÇOS, LDA.** This is the historical creation / initial availability date of
the BANZA protocol. It is an institutional/historical attribution, not a production, certification,
financial-authorisation or active-operator date, and it confers no operational authority over operators.

## 3. Initial institutional maintainer

Banzami is the original creator and initial institutional maintainer.

## 4. Open governance today

Governance is open today and takes place through the public GitHub repository.

## 5. Governance mechanisms

- Issues
- Pull requests
- Code review
- ADRs (Architecture Decision Records)
- RFCs (Requests for Comments)
- Specifications
- Releases
- Conformance tests
- Deterministic engines
- Public evidence
- `MAINTAINERS.md`
- Public discussion

## 6. How changes enter the protocol

Two paths, deliberately separate. Merging is not releasing, and the repository moving forward does not
move the protocol's lifecycle.

**Normal evolution** — every change takes this path:

```
proposal → issue/RFC/ADR → review → implementation → tests + normal assurance (AG-0…AG-9)
  → merge → current main, still PRE-PRODUCTION
```

**Release or freeze** — a deliberate decision about one exact candidate, never a consequence of a merge:

```
candidate selected → release-readiness → AG-10 → explicit release/freeze decision
```

`AG-10` is a freeze gate. It is not a pull-request requirement, it is not run on every change, and a
green pipeline is not a release. A protocol version advances when the rules change and the decision is
taken — not when a branch lands.

## 7. Who can participate

Maintainers, contributors, reviewers, operators, implementers, researchers and community participants.

## 8. Who decides

- Decisions are made by the active maintainers according to the public process.
- Banzami has the role of original creator and initial institutional maintainer.
- No operator is approved or certified by a private decision.
- Normative changes require public artifacts (ADR/RFC/spec/release).

## 9. What governance does not do

- It does not license operators.
- It does not approve operators.
- It does not certify operators.
- It does not issue financial licences.
- It does not replace regulators.
- It does not turn BANZA into a financial operator.

## 10. Relationship with BanzAI

BanzAI is the **primary human-operator interface** to BANZA — and it is **optional, transversal and non-authoritative** (ADR-036). Both halves are the decision: a primary human-facing interface is not a mandatory protocol dependency. Machine-to-machine conformance and verification proceed without it, and its unavailability does not block protocol operation. It
interprets requests, consults the reference, guides implementation, routes to the verifiable engines,
explains results and helps prepare evidence. It is **not** a normative source and **not** a governance
authority — it does not create protocol rules, does not certify, approve, license or publish operators,
and does not move funds. New rules enter through the public governance process, and machine-to-machine
integration does not depend mandatorily on BanzAI.

**BanzAI guia; os motores verificam; a evidência prova; a governança decide** — BanzAI guides, the
engines verify, the evidence proves, and governance decides.

## 11. Relationship with operators

Operators implement the protocol independently and publish evidence. Peer interoperability is based on
verifiable evidence, not private approval.

## 12. Relationship with trademarks

Governance participation does not automatically grant trademark rights. See [TRADEMARKS.md](TRADEMARKS.md).

---

See also: [`LICENSE`](LICENSE) · [`NOTICE`](NOTICE) · [`TRADEMARKS.md`](TRADEMARKS.md) ·
[`MAINTAINERS.md`](MAINTAINERS.md) · [`CONTRIBUTING.md`](CONTRIBUTING.md) ·
[`docs/governance/`](docs/governance/) · [`decisions/adr/`](decisions/adr/)
