# Full Protocol Corpus Review Matrix (2026-07)

**Base:** `main` `93d59fa` · **Phase:** 7N · Constitutional review of the **entire** documentation
corpus (187 tracked Markdown documents: 144 + 43 website snapshots). Reviewed by area against the
current BANZA protocol boundary; per-file classifications produced by dedicated read-only review
passes (READMEs, spec/, docs/reference, ADRs/RFCs, governance).

**Classifications:** PASS · PASS_WITH_MINOR_FIX · PASS_WITH_BOUNDARY_NOTE · PASS_WITH_ERRATUM ·
HISTORICAL_CONTEXT_ACCEPTED · MANUAL_REVIEW_REQUIRED · BLOCKED.

**Result: 0 BLOCKED · 0 MANUAL_REVIEW_REQUIRED.** No public/canonical document contradicts
`/operators=[]`, `production_certificates=false`, or BanzAI-mock/non-normative.

## By area

| Area | Docs | Result | Notes |
|---|---|---|---|
| Root (`README`, `SECURITY`, `CONTRIBUTING`, `CODE_OF_CONDUCT`, `CHANGELOG`, `NOTICE`, `CLAUDE`) | 7 | PASS | Boundary explicit; "no certified operator / no production certificate". |
| All `README.md` (25, repo-wide) | 25 | **PASS (25/25)** | Each states what the folder is/isn't + normative source; BanzAI non-authoritative; evidence≠certificate. |
| `spec/**` (25) | 25 | PASS (24) + 1 minor | `spec/overview.md` PT "BANZA usa PKI" → "BANZA define PKI"; federation specs frame BANZA as trust authority (issues certs / publishes BRL), operators enforce. |
| `docs/reference/**` + `docs/guides/**` (15) | 15 | **PASS (15/15)** | EN/PT canonical references honest: pre-production, no certified operator, M2/M3 gated, EMIS/Multicaixa as context only. |
| `decisions/adr/**` (36) | 36 | PASS + 6 notes/errata | Founding ADRs 001–005 get boundary/historical notes; ADR-010 phrasing refined; 006/010/017 errata (prior). |
| `decisions/rfc/**` (6) | 6 | PASS + RFC-0006 refined | RFCs are Drafts; RFC-0006 operational verbs → operator implementation + erratum strengthened. |
| `contracts/**` docs, `conformance/**` docs | 6 | PASS | Interface/spec docs; PASS=evidence not certificate; no runtime claims. |
| `examples/**` (5) | 5 | PASS | Illustrative, not production/SDK/operator; normative truth in spec/contracts/conformance. |
| `services/**` docs (2) | 2 | PASS | verification-api = public verification (no cert issuance); banzai-api = mock, non-authoritative. |
| `infra/**` docs (2) | 2 | PASS | Protocol/BanzAI-only VM; no operator/wallet/ledger/payments; PG internal; pre-production. |
| `tools/**` docs, `.github/**` | 3 | PASS | Checks/CLI; no operator tooling. |
| `docs/governance/**` (incl. phase reports) | 22 | HISTORICAL_CONTEXT_ACCEPTED + 2 notes | Governance/phase records; 2 docs got a boundary note (see below). |

## Documents changed this phase (explicit rows)

| Path | Area | Classification | Finding | Action applied |
|---|---|---|---|---|
| `decisions/adr/ADR-001-…` | A constitutional | PASS_WITH_BOUNDARY_NOTE | Founding ADR listed "financial primitives … wallets, settlement, QR runtime" that could read as a runtime | Added Current protocol boundary note; "state machines (…wallet/account models, settlement semantics)"; "conformance test vectors" |
| `decisions/adr/ADR-002-…` | A | PASS_WITH_BOUNDARY_NOTE | Operator-era naming migration + `docs/migration/` refs | Added Current boundary note (repo is protocol-only; migration docs may not exist) |
| `decisions/adr/ADR-003-…` | A | PASS_WITH_BOUNDARY_NOTE | Provider examples (EMIS/Multicaixa/Firebase) + `reference/sandbox-operator/` | Added Current boundary note (illustrative examples; outside the protocol repo) |
| `decisions/adr/ADR-004-…` | A | PASS_WITH_HISTORICAL_NOTE | Reference/sandbox-operator + simulated settlement, no longer the architecture | Added Historical note |
| `decisions/adr/ADR-005-…` | A | PASS_WITH_MINOR_FIX | "certification" used as a design output | "…contracts and conformance evidence" (×2) |
| `decisions/adr/ADR-010-…` | A | PASS_WITH_MINOR_FIX | Refine account-model phrasing | "account-based, **wallet/account-compatible** and QR/@handle-addressable, not card-first" |
| `decisions/rfc/RFC-0006-…` | A | PASS_WITH_ERRATUM | "protocol core reserves/settles consumer balance"; "Banza should not bear credit risk" | Operational verbs → operator implementation; erratum strengthened |
| `spec/overview.md` | A | PASS_WITH_MINOR_FIX | PT "O BANZA usa uma hierarquia PKI" | → "O BANZA **define** uma hierarquia PKI" |
| `docs/governance/BANZA_V1_OPERATIONAL_TRANSITION_PLAN.md` | C/E governance | HISTORICAL_CONTEXT_ACCEPTED | "BANZA certifies" (CA role) | Added top historical/boundary note |
| `docs/governance/MATRIX_A_BANZA.md` | C governance | PASS_WITH_BOUNDARY_NOTE | "what BANZA certifies" | Added top boundary note (CA framework; evidence≠certificate) |
| `website/content/decisions/{adr,rfc}/…` (7) | B snapshot | synced | Snapshots of the above ADR/RFC changes | Same edits applied in place (depth-corrected links preserved) |

## Remaining risk

None blocking. Historical migration prose (`docs/migration/*` in ADR-002/008) intentionally
retained as point-in-time ADR record. Mixed-case "Banza" in founding ADRs is historical
product/operator context, now framed by boundary/historical notes. **Ready for M2-readiness.**
