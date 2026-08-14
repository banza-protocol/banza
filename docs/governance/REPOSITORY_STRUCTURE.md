# BANZA — Public Repository Structure & Boundary

**Status:** Canonical · **Enforced by:** `make purity-check` (+ the Repository Purity CI job)

BANZA is an **open financial-interoperability protocol** — a specification, not an
operator, product, wallet, PSP, or payments runtime. This document fixes the
repository's permanent structure so it stays unambiguously a *protocol* repo.

## The constitutional layout

Each top-level directory answers exactly one question about the protocol:

```
spec/               what the protocol IS        — human-normative specification
contracts/          how a machine implements it — OpenAPI, JSON Schemas, events, invariants registry
conformance/        how correctness is proven   — suite, vectors, fixtures, evidence tooling
decisions/          how the protocol is governed — decisions/adr/ (ADRs) + decisions/rfc/ (RFCs)
docs/               human documentation          — fixed taxonomy below
examples/           conceptual illustrations     — protocol-neutral, non-normative, no operator code
website/            the public site              — banza.network (the ONLY app)
services/           minimal public services      — verification-api, banzai-api (mock)
infra/banza-network/ reproducible public infra   — compose, nginx, DB schema, bootstrap
tools/              validation                   — purity/identity/invariant checks, conformance CLI
assets/             public brand & social assets
.github/            CI, issue/PR templates, security automation
README.md · VERSION · LICENSE · SECURITY.md · CHANGELOG.md · CONTRIBUTING.md · CODE_OF_CONDUCT.md · Makefile
```

**Separation of powers.** `spec/` says what is correct; `contracts/` makes it
machine-checkable; `conformance/` proves it; `decisions/` records why it is so.
No directory may absorb another's role — e.g. a feature never lives in prose
(`spec/`, `docs/`) alone once implementation begins: it must have a corresponding
artifact in `contracts/`, per `CLAUDE.md`.

## Fixed `docs/` taxonomy

```
docs/reference/     consolidated reference (PT canonical · EN), diagrams, terminology
docs/governance/    public governance, policies, trust architecture, ceremony records
docs/security/      public security, root-key ceremony (M2), readiness
docs/guides/        human how-to guides (conformance, operators)
docs/images/        images used by public docs
```

Any other `docs/` subdirectory is **forbidden** and fails `purity-check`. In
particular, the former operator-era and pre-restructure folders must never
reappear: `docs/adr`, `docs/rfc`, `docs/protocol` (now `decisions/` and `spec/`),
`docs/core`, `docs/architecture`, `docs/federation`, `docs/trust`, `docs/audits`,
`docs/validation`, `docs/observability`, `docs/whitepaper`, `docs/annexes`,
`docs/history`, `docs/operations`. A tracked top-level `apps/` is forbidden — the
public site is `website/` and public services are `services/`.

## What does NOT belong in this repo

Any specific operator's content · financial app / wallet / PSP / bank · payments
runtime, real settlement, custody of funds · merchant onboarding, admin/backoffice,
operator dashboards · operator Sandbox · operator-era or private-infra deploy scripts ·
phase/dev reports, execution notes, temporary audit outputs · history that confuses
the current canonical corpus · production/certification claims without a formal
governance decision.

Root-level `BANZA_*.md` entry docs and root deploy scripts are **forbidden** and
fail `purity-check`: the canonical references now live under `docs/` (reference/,
governance/, security/) and the technical specification under `spec/`; the
reproducible **public** deploy bundle lives in `infra/banza-network/` (bootstrap +
`compose.yml`). No guard should need a special-case exclusion for an obsolete
script.

## Boundary rules (language)

BANZA does not process payments · does not settle payments · does not move or hold
funds · does not license or authorise operators. BanzAI explains, never decides;
does not certify or approve. There is currently **no certified operator** and **no
active production certificate**; the public state is **pre-production**.

## Rules for new content

- A new document must help **specify, implement, verify, govern, or publish** the
  protocol. If it does not, it does not belong here.
- Temporary/working content becomes a canonical document or is removed — never left
  as a phase report in the tree.
- No operator/product/runtime document enters this repo.
- ADRs stay within `ADR-001..ADR-002`; new decisions continue the series and are
  immutable after acceptance. RFCs stay `RFC-000N`.
- Historical material lives in git history / release tags, not as active docs.
- No production or certified-operator claim without a formal governance decision.
