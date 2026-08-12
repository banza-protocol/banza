# BanzAI Component Boundary (2026-07)

This note fixes the boundary between the BANZA protocol repository and the BanzAI evidence-assistant
component repository.

## Two repositories

| Repository | What it is |
|---|---|
| `banza-protocol/banza` (this repo) | The **protocol** + the public website + the `/banzai` public page + machine routes + governance + conformance + contracts + public services (mock/pre-production). Source of truth. |
| Active BanzAI source | **This monorepo only.** The canonical BanzAI runtime (`services/banzai-api`) and its deterministic Rust engines (`engines/banzai-*`) live here (ADR-075, consolidating ADR-071). There is no separate BanzAI repository — active development lives entirely in this repo. |

## The rules

- The public **`/banzai` page lives in the BANZA repository** (this repo's website). The BanzAI
  component repository has **no website of its own**.
- The public BanzAI runtime (`services/banzai-api`) **is the canonical runtime** (ADR-071): a
  TypeScript service/glue layer over the in-repo Rust engines (`engines/banzai-*`), executing the
  single grounded-synthesis pipeline (ADR-055). Active BanzAI development lives entirely in this monorepo (ADR-075); it is not the
  core. In the public pre-production state no external model is called by default.
- BanzAI is **non-authoritative**: it explains, retrieves evidence, checks claims, and assists human
  governance review. It does **not** decide, certify, approve, or issue certificates, and does not
  replace protocol governance, the Trust Root, human governance, or legal/regulatory/banking/KYC-KYB/AML-CFT
  obligations.
- The **source of truth is the published BANZA protocol corpus** in this repository. Model output is
  never a source of truth.

## Non-contradiction

- BANZA does not claim the BanzAI repo serves a website; the BanzAI repo does not claim to own a website.
- Neither repo claims BanzAI certifies; neither claims a real provider is active; neither claims M2 is active.

See the component repo's `docs/ROLE.md`, `docs/BOUNDARIES.md`, and `docs/REPOSITORY_STRUCTURE.md`.
