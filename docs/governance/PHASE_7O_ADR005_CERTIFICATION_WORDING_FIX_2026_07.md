# Phase 7O — ADR-005 Certification Wording Microfix (2026-07)

**Base:** `main` `5f90d0c` · **Branch:** `fix/phase-7o-adr005-certification-wording-2026-07`
**Status:** non-normative record. Surgical one-phrase documentation fix. **No** protocol version,
contract, conformance, OpenAPI, schema, service, runtime, VM or secrets change.

## Finding (post-7N leftover)

`decisions/adr/ADR-005-protocol-first-product-development.md` (Consequences) still used
"certification" as an automatic technical output of protocol-first design — a `+`-separated
occurrence distinct from the comma-separated one corrected in 7N.

**Before:**
> the protocol gets a designed concept (model + invariants + events + **certification**) instead
> of a retrofitted implementation accident.

**After:**
> the protocol gets a designed concept (model + invariants + events + **conformance evidence**)
> instead of a retrofitted implementation accident.

## Reason

For the BANZA v1.0 boundary, the technical output of protocol-first design is **conformance
evidence**, not certification. A conformance PASS is technical evidence; **certification, if
applicable, is a separate governance step**, not an automatic consequence of design, tests or
conformance. There is currently no certified operator and no active production certificate.

## Files changed

- `decisions/adr/ADR-005-protocol-first-product-development.md` — the one phrase.
- `website/content/decisions/adr/ADR-005-…md` — same fix (snapshot differs from canonical only by
  the pre-existing depth-corrected `../../../../docs/governance/…` link; content identical).
- `docs/governance/PHASE_7O_ADR005_CERTIFICATION_WORDING_FIX_2026_07.md` — this report.

ADR status, date, number unchanged; no erratum needed (a plain wording fix). Other "certification"
uses in ADR-005 (a "certification criterion" as a governance concept) are left as-is.

## Scans & checks

Old phrase repo-wide = **0**. No "certification as automatic output" claims remain (`conformance
becomes certification`, `PASS…certificate`, `automatic certification`, `certification vectors` — 0).
`reference-svg-check` 27/27 · `purity-check` · `identity-check` · `invariant-check` ·
`validate-compose.sh` · `validate-security-headers.sh` · **0 broken links** · JSON/YAML/OpenAPI
valid · website build.

## Confirmations

Protocol **v1.0** · `VERSION=1.0.0` · `/operators=[]` · `production_certificates=false` · BanzAI
mock (`llm_calls=0`) · CSP-Report-Only active. No contract/conformance/OpenAPI/schema/services/
runtime/`.env`/secrets/DNS/Cloudflare/TLS change. No M2, operator or certificate.

## Deploy

Website-only (ADR-005 renders at `/decisoes/adr-005`): rebuild + recreate the website container
only; reverse-proxy / verification-api / banzai-api / postgres preserved.
