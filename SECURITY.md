# Security Policy

BANZA is an **open financial protocol** — a specification, a set of contracts, a
conformance suite and a trust model. It is **pre-production**: no operator is
in production and production_certificates is false. This repository does not
process payments, hold funds, or run an operator.

## Reporting a vulnerability

Report suspected vulnerabilities **privately** to
**[security@banza.network](mailto:security@banza.network)**.

- **Do not** open a public GitHub issue, pull request or discussion for a
  security report.
- Include the affected artifact (a contract, conformance vector, specification,
  service or the website), a description, and reproduction steps or a proof of
  concept.
- If you need to send sensitive material, say so in your first (non-sensitive)
  email and we will arrange an encrypted channel.

We aim to acknowledge a report within **5 business days** and to agree a
disclosure timeline with you. Please give us reasonable time to remediate before
any public disclosure (**coordinated disclosure**).

## Scope

**In scope**

- Protocol contracts (`contracts/`) — OpenAPI, webhook / event / QR schemas, the
  invariant registry, and federation contracts.
- Conformance suite (`conformance/`, `tools/banza-conformance/`) — test vectors,
  fixtures, and the cryptographic integrity of signed artifacts.
- Trust model (`docs/security/`, `contracts/federation/`) — key manifests,
  signed protocol metadata, delegated signing keys, and revocation semantics.
- Public services (`services/`) and the public website (`website/`) as deployed
  at `banza.network`.

**Out of scope**

- Any specific operator's implementation, app, wallet, backoffice or
  infrastructure — those are **not** part of this repository and must be reported
  to that operator.
- Findings that require compromising a maintainer account, physical access, or
  social engineering.
- Best-practice suggestions with no demonstrable security impact.

## What we protect

The protocol's integrity guarantees are the financial invariants
(`INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`, `INV-IDEM-*`, `INV-RECON-*`,
`INV-QR-*`) and the trust invariants (`INV-OTE-*`, `INV-FEDEVAL-*`, `INV-ROOT-*`, `INV-FED-*`).
A report that shows any of these can be violated in the specification, the
contracts, or the conformance suite is high value. The canonical registry is
[`contracts/invariants.json`](contracts/invariants.json).

Root and issuing private keys never appear in this repository or on any public
service, and the trust model is fail-closed. See
[`docs/security/README.md`](docs/security/README.md).

## No bug bounty

There is **no paid bug-bounty programme** at this stage. We gratefully
acknowledge reporters who follow coordinated disclosure and — with your consent —
will credit you when a fix is published.

## Supported versions

The protocol is at **v1.0**. Security fixes are applied to the current published
specification; there is no separate long-term-support branch in pre-production.

---

Full public security documentation — including the offline root-key ceremony
readiness (M2) and the trust architecture — lives under
[`docs/security/`](docs/security/).
