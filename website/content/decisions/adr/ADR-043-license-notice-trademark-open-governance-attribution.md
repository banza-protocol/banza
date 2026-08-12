# ADR-043 — License, Notice, Trademark and Open Governance Attribution

- **Status:** Accepted
- **Date:** 2026-07
- **See also:** ADR-001, ADR-002, ADR-003, ADR-005, ADR-041, `LICENSE`, `NOTICE`, `TRADEMARKS.md`, `GOVERNANCE.md`, `MAINTAINERS.md`, `CONTRIBUTING.md`, `docs/governance/licensing.md`

## 1. Context

BANZA is an open financial protocol. It was originally created by the startup **BANZAMI - TECNOLOGIA E
SERVIÇOS, LDA.** and is maintained as an open protocol with public governance through the GitHub
repository. Until now the repository stated the Apache-2.0 license but did not clearly record the
institutional origin, separate trademark use from the code license, or state — as a present fact — that
governance is already open. This ADR fixes those gaps without closing the protocol.

## 2. Problem

- The `NOTICE` did not attribute the origin to Banzami.
- There was no trademark policy, so the boundary between the open-source license and use of the
  BANZA/BanzAI/Banzami names and logos was implicit.
- There was no standalone `GOVERNANCE.md` / `MAINTAINERS.md` stating that governance is open **today**.
- Attribution must not read as permanent private control, and trademark protection must not read as
  blocking interoperability.

## 3. Decision

1. BANZA remains under a permissive open-source license.
2. **Apache License 2.0 remains canonical** and unmodified; no institutional narrative or custom
   restriction is added inside the license body.
3. Institutional attribution lives in `NOTICE`.
4. Trademark policy lives in `TRADEMARKS.md`.
5. Open governance is documented in `GOVERNANCE.md`; maintainer model in `MAINTAINERS.md`.
6. Banzami is the original creator and initial institutional maintainer.
7. Governance is already open and takes place through the public GitHub repository.
8. Contributions follow the public repository process.
9. Trademark rights are **not** automatically granted by the license.
10. The protocol remains open and independent of any private approval of operators.

## 4. Consequences

- The license, attribution, trademark policy and governance are four separate, non-conflicting concerns.
- Third parties can use, study, modify and distribute the covered code/documentation under Apache-2.0
  without asking Banzami — while the marks stay protected.
- A new guard (`make license-notice-governance-check`) enforces the presence and wording, and blocks
  closed-control / future-promise / trademark-in-license phrasings.

## 5. Canonical statements

> **BANZA governance is open today through the public GitHub repository.**

> **BANZAMI - TECNOLOGIA E SERVIÇOS, LDA. is the original creator and initial institutional maintainer of
> the BANZA protocol.**

> **The Apache License 2.0 governs the covered software and documentation; trademark rights are governed
> separately.**

> **Open governance does not imply unrestricted trademark use.**

> **Trademark control does not imply private control of protocol governance.**
