# BANZA — Governance & Developer Glossary

> Controlled glossary of the **governance, documentation and engineering** vocabulary of the BANZA
> repository. It complements the protocol/fintech glossary in
> [`PROTOCOL_GLOSSARY.md`](PROTOCOL_GLOSSARY.md). BanzAI answers short questions about these terms
> **deterministically**, with cited sources and a clear boundary.
>
> **Boundary that applies to every term below:** a *record* (ADR/RFC/changelog/audit report), a
> *process* (governance/issue/PR/release) or an automated *check* (guard/CI) is **never an authority**.
> None of them certifies, approves or licenses an operator; none of them replaces conformance evidence.
> BANZA is an open, operator-neutral protocol — governance is open and conformance is demonstrated by
> **verifiable evidence**, not by a central authority.

---

## Records & specifications

| Term | Definition | Boundary | Primary source |
|---|---|---|---|
| **ADR** — Architecture Decision Record | A document that records an important architectural or governance decision: context, decision, consequences and boundaries. Lives in `decisions/adr/`, listed at `/decisoes`. | Not code; does not certify operators; does not replace CI, review or evidence. | `decisions/adr/`, `GOVERNANCE.md` |
| **RFC** — Request for Comments | A structured proposal/discussion to evolve the protocol, *before* it becomes a spec, contract, schema or ADR. Lives in `decisions/rfc/`. | Not final norm; not an approval — it is the discussion step of the open process. | `decisions/rfc/`, `GOVERNANCE.md` |
| **spec** — specification | Describes the protocol's rules, formats, expected behaviour and interfaces. Lives in `spec/`. Distinct from implementation. | The spec says what is correct; an operator implements it. Not code, not certification. | `spec/` |
| **schema** | Defines the structure and validation of data — required fields, types, formats. | Validates structure; does not authorize anything. | `contracts/` |
| **contract** | A verifiable expectation of behaviour, interface or compatibility between components/operators (OpenAPI, JSON schemas). | The source of truth operators implement; not a business agreement or licence. | `contracts/` |
| **invariant** | A non-negotiable integrity rule the protocol guarantees — families `INV-LEDGER`, `INV-WALLET`, `INV-SETTLE`, `INV-IDEM`, `INV-RECON`, `INV-QR`. | An integrity guarantee; never weakened for convenience. | `decisions/adr/ADR-011-*`, invariants registry |

## Engineering & process

| Term | Definition | Boundary | Primary source |
|---|---|---|---|
| **guard** | An automated check that prevents regressions, boundary violations, brand contamination, secret leaks or rule breaks. Runs via `make <name>-check` (in `tools/`) and in CI. | Not a normative decision; must never be bypassed — removing/ignoring a guard is a refused action. | `tools/`, `Makefile` |
| **CI** — Continuous Integration | The set of automated checks that runs on every PR to validate tests, guards, build and project rules. Lives in `.github/workflows/`. | Never merge with red checks — that is a refused action. | `.github/workflows/` |
| **PR** — Pull Request | A proposed change to the repository, reviewed and validated by CI before merge. | Never merge a PR with red checks, and never use `--admin` to bypass failing CI. | `GOVERNANCE.md`, `CONTRIBUTING.md` |
| **issue** | A recorded problem, proposal or task in the repository. | The start of discussion — not a decision or approval. | `GOVERNANCE.md`, `CONTRIBUTING.md` |
| **release / version / tag** | A published version of the project, usually tied to a tag and the changelog; identifies a reproducible repository state. | Does not confer status on operators; not certification. | `CHANGELOG.md` |
| **changelog** | The history of relevant changes between versions (`CHANGELOG.md`). | A record — not a norm or certification. | `CHANGELOG.md` |
| **runbook** | An operational guide to run, diagnose, recover or maintain a system (steps, smoke tests, rollback). Lives in `docs/guides/`. | Guides operation; does not change protocol rules. | `docs/guides/` |
| **rollback** | Returning to a previous safe state after a failure or regression. Documented per operational change in the runbooks. | Does not affect protocol invariants. | `docs/guides/` |

## Governance & people

| Term | Definition | Boundary | Primary source |
|---|---|---|---|
| **governance** | The open process by which BANZA evolves: issues, RFCs, ADRs, pull requests, review and CI. | Open governance; conformance is demonstrated by verifiable evidence, not a central authority. Does not certify/approve/license operators. | `GOVERNANCE.md`, `decisions/adr/` |
| **maintainer / contributor** | A person or entity responsible for maintaining the project, reviewing changes and preserving repository integrity. Governance is open — anyone contributes via issue/RFC/PR; the project has an original creator and initial institutional maintainer. | Being a maintainer does **not** grant authority to certify, approve or license operators. | `MAINTAINERS.md`, `GOVERNANCE.md` |
| **audit report / evidence report** | Documents a review of the repository or a milestone — what was verified, findings and conclusions. Lives in `docs/reports/`. | Evidence/record of a review — not certification or operator approval. | `docs/reports/` |

---

*This glossary is descriptive reference material. It defines how the terms are used inside the BANZA
repository; it does not create new protocol rules, and it is operator-neutral.*
