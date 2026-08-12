# Phase 7P — Public Protocol Documentation Consistency Fix (2026-07)

**Base:** `main` `015c070` · **Branch:** `fix/phase-7p-public-protocol-docs-consistency-2026-07`
**Status:** non-normative record. Public documentation normalisation. **No** protocol version,
contract, conformance-vector, OpenAPI, schema, service, runtime, VM or secrets change.

## Objective

Fix the editorial and boundary inconsistencies still present in the primary public-facing
documents (the first institutional impression of BANZA), so the repository reads as a precise,
prudent, operator-neutral protocol — calibrated to the prudence of `SECURITY.md` and
`docs/governance/REPOSITORY_STRUCTURE.md`.

## Methodology

- Read `SECURITY.md` + `REPOSITORY_STRUCTURE.md` as the prudence baseline.
- A parallel mapping workflow (one read-only agent per target doc) produced verbatim
  `find`/`replace` edit maps; every edit was **reviewed** and applied deterministically
  (byte-exact), with one agent edit rejected on review (see below) and five re-derived where the
  agent's quote did not match the file's line wrapping.
- Per-document classification in
  [`PUBLIC_PROTOCOL_DOCS_CONSISTENCY_MATRIX_2026_07.md`](PUBLIC_PROTOCOL_DOCS_CONSISTENCY_MATRIX_2026_07.md).

## Corrections by file

- **README.md** — opening tagline "certification criteria and a federation model — implementable
  by anyone" → "conformance evidence and a **future federation governance model** — implementable
  by **qualified candidate operators**"; "**certification** (L0–L4)" → "conformance levels and
  certification governance (L0–L4)"; "Certified operators federate" / "Certified operators at L3+
  federate" → "**When production certification opens**, operators certified at the applicable
  level may federate"; "A certification framework (L0–L4)" cell → "Conformance levels and
  certification governance (L0–L4)".
- **spec/overview.md** — **"Version: 2.0" → "Version: v1.0"** + "Repository VERSION: 1.0.0" +
  "Status: Official v1.0 · pre-production · no certified operator" (removes the v2.0 vs 1.0.0
  ambiguity); added a top boundary note; the hardcoded "< 2 s" latency SLA → an
  implementation-declared objective (BANZA defines states/invariants/ordering, does not promise
  operational latency); federation and CA-issuance qualified as future/conditional.
- **conformance/README.md** — removed the "**Banza sandbox operator** / reference/sandbox-operator"
  reference-operator section (→ "Conformance targets: there is no reference operator in this
  repository…"); "Conformance certifies protocol interoperability only" → "Conformance **produces
  technical evidence** … does not certify/approve an operator or replace legal/regulatory/banking/
  KYC/KYB obligations"; scope reduced from SDK/provider/QR-runtime/event-emitter to "candidate
  operator implementations and protocol artifacts tested against BANZA contracts and invariants";
  sandbox runner → conformance runner with an explicit "evidence only, not certification" note;
  title/prose "Banza" → "BANZA". **(The L0 level name "Protocol Sandbox" was kept — it is the
  canonical level name used across 8 docs; a rename would create inconsistency.)**
- **contracts/README.md** — "Banza's platform/infrastructure" and product framing → protocol
  framing (a protocol contract is a formal interface operator implementations may expose/consume;
  it does not define a BANZA-operated platform, wallet, payment runtime or settlement system).
- **docs/reference/pt/completa.md** & **docs/reference/en/complete.md** — "qualquer entidade pode
  tornar-se um operador certificado … sem aprovações discricionárias" / "no discretionary
  approval … no minimum volume" (absolute institutional promise) → "technically qualified
  candidate entity may submit verifiable conformance evidence … certification depends on the
  governance/certification process (M2/M3) and does not replace legal/regulatory/banking/KYC/KYB
  obligations; technical conformance criteria are public, deterministic and auditable". Other
  "qualquer entidade" lines were already future/M2-M3-qualified and left as-is.
- **ADR-001** — boundary note **strengthened** (historical extraction; BANZA does not operate
  wallets, process payments, move/settle funds, hold balances, maintain user accounts or run
  payment infrastructure); historical primitives softened ("protocol-level models … wallet/account
  implementation model … settlement semantics … QR protocol surface"; "protocol-level models for
  financial interoperability"). The historical "Banza began as a private fintech product" sentence
  was kept as historical context.
- **Website snapshots** — `website/content/decisions/adr/ADR-001-…md` (byte-identical to canonical)
  and `website/content/BANZA_REFERENCIA.md` (PT edits; differs from canonical only by a
  pre-existing depth-corrected link).

## Scans

- **Version mismatch:** the only problematic "Version: 2.0" (spec/overview header) is fixed. The
  remaining "v2.0" strings are **roadmap** entries (future protocol version) — legitimate.
- **Claims sweep (public targets):** 0 live "Banza sandbox operator / Conformance certifies /
  Banza platform / any entity can become certified / qualquer entidade pode tornar-se operador
  certificado / production ready / EMIS-Multicaixa integrated". `reference/sandbox-operator` as an
  implementation-example path remains in `ADR-009/030` and a few spec files (already-reviewed;
  ADR-003/004 carry illustrative notes) — HISTORICAL_CONTEXT_ACCEPTED, follow-up noted.
- **Old-path sweep:** 0 old-path links in the target docs.

## Checks

`reference-svg-check` 27/27 · `purity-check` · `identity-check` · `invariant-check` ·
`validate-compose.sh` · `validate-security-headers.sh` · **0 broken links** · JSON/YAML/OpenAPI
valid · website build.

## Scope & confirmations

Protocol **v1.0** · `VERSION=1.0.0` · `/operators=[]` · `production_certificates=false` · BanzAI
mock (`llm_calls=0`) · CSP-Report-Only active · GitHub metadata protocol-first. No contract/
conformance-vector/OpenAPI/schema semantics changed (only `contracts/README.md` prose); no
services/infra-runtime/`.env`/secrets/DNS/Cloudflare/TLS change; no ADR renumber/status change.
No M2, operator or certificate.

## Verdict

The primary public documents (README, spec/overview, conformance/README, contracts/README,
reference PT/EN, ADR-001) are aligned with the protocol-only boundary and as prudent as
`SECURITY.md`/`REPOSITORY_STRUCTURE.md`. Ready for institutional-facing / M2-readiness review.
