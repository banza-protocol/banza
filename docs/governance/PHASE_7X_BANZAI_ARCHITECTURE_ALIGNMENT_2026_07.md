# Phase 7X — BanzAI Architecture Alignment (2026-07)

**Base:** `main` `088cfd6` (post-7W) · **Branch:** `fix/phase-7x-banzai-architecture-alignment-2026-07`
**Depends on:** BanzAI Phase A1 (`banza-protocol/banzai`) — the protocol-evidence-assistant
architecture reset.

## Objective

Align the BANZA repository's public references to BanzAI with the BanzAI component architecture: the
public `/banzai` page lives in BANZA; the BanzAI core is a separate, non-authoritative component in
`banza-protocol/banzai` with no website of its own; the public runtime is mock/pre-production.

## Files audited

`website/app/banzai/page.tsx`, `services/banzai-api/README.md`, `docs/governance/**`, the reference
docs, and the machine-route posture. Most were already prudent (7W): the `/banzai` page states BanzAI
is explanatory/non-authoritative, does not certify, and shows `llm_calls: 0`.

## Changes applied

- **`website/app/banzai/page.tsx`** — added a **component-boundary** StatusNote: the public page lives
  in the BANZA website; the BanzAI component is maintained in `banza-protocol/banzai` (no website of
  its own); the public runtime is mock/pre-production and non-authoritative (does not decide/certify/
  approve/issue).
- **`services/banzai-api/README.md`** — added a **component-boundary** note: this service is the public
  mock/demonstration façade for the `/banzai` page, **not** the canonical BanzAI core (which lives in
  `banza-protocol/banzai`); default provider `mock`; `llm_calls = 0`; no external model called by default.
- **`docs/governance/BANZAI_COMPONENT_BOUNDARY_2026_07.md`** — new note fixing the two-repo boundary
  and non-contradiction rules.

No API semantics, no provider activation, no contract/conformance/OpenAPI/schema change, no runtime
change. No import of the BanzAI repo as a dependency (documentation/boundary only).

## Checks

`reference-svg-check` 27/27 · `purity-check` · `identity-check` · `invariant-check` ·
`validate-compose.sh` · `validate-security-headers.sh` · broken relative links = 0 ·
JSON/YAML/OpenAPI valid · website build.

## Deploy plan

`website/app/banzai/page.tsx` changed → website-only rebuild + redeploy on the VM
(`banza-website:rollback-pre-7x-banzai-alignment`), recreating only the website container;
reverse-proxy / verification-api / banzai-api / postgres preserved.

## Confirmations

Protocol **v1.0** · `VERSION=1.0.0` · `/operators=[]` · `production_certificates=false` · BanzAI mock
(`llm_calls=0`) · M2 not active · no certified operator · no production certificate · no real provider.
No M2, operator, or certificate activation.

## Verdict

BANZA's public surface recognizes the BanzAI component boundary: the `/banzai` page belongs to BANZA,
the BanzAI core is a separate non-authoritative component with no website, and the public runtime is
mock/pre-production. Ready to start M2 planning/preflight — without activating M2.
