# Phase 7M — Canonical ADR/RFC Protocol Review and Normalisation (2026-07)

**Base:** `main` `e41be0c` · **Branch:** `fix/phase-7m-adr-rfc-canonical-review-2026-07`
**Status:** non-normative record. **No** protocol version, contract, conformance, OpenAPI,
schema, service, runtime, VM, DNS, TLS or secrets change.

## Objective

Review, document-by-document, every canonical ADR (001–036) and RFC (0001–0006) — the
constitutional memory of the protocol — and remove any wording that could make BANZA read as an
operator, wallet, app, bank, PSP, settlement system or payments runtime, plus stale
references/typos. ADRs/RFCs were **not** renumbered; no status was changed; no decision was
silently rewritten.

## Methodology

- Full inventory (title/status/erratum/snapshot) of all 42 documents.
- Deterministic claims sweep across `decisions/`, `website/content/decisions/`, `spec/`,
  `docs/reference/` for operator/wallet/funds/settlement/authorization/certification/regulatory/
  BanzAI-authority patterns.
- Document-by-document review of all 42 against the current protocol boundary.
- Per-document classification recorded in
  [`ADR_RFC_CANONICAL_REVIEW_MATRIX_2026_07.md`](ADR_RFC_CANONICAL_REVIEW_MATRIX_2026_07.md).

## Result

**42 reviewed** — **35 PASS**, **3 PASS_WITH_MINOR_FIX**, **4 PASS_WITH_ERRATUM**,
**0 HISTORICAL_NOTED**, **0 MANUAL_REVIEW_REQUIRED**, **0 BLOCKED**.

The hard dangerous-claim sweep was **clean** across all canonical decisions before this phase —
prior phases (7J: ADR-006/RFC-0006; 7K: ADR-010/017 errata; 7K1: wallet-native → wallet/account
sweep) had already normalised the operator/wallet/funds language. The four errata (ADR-006,
ADR-010, ADR-017, RFC-0006) were **confirmed** correct here.

### Changes applied (minor, wording/typo/path only)

- **ADR-002** — Author field placeholder `Organização operador` → `BANZA Protocol`; fixed the
  tautology "**BanzAI** replaces BanzAI …" → "**BanzAI** is the Protocol Knowledge System for the
  BANZA ecosystem."
- **ADR-004** — removed a duplicated article ("the the reference operator" → "the reference
  operator").
- **ADR-008** — fixed a doubled path typo `docs/docs/reference/en/complete.md` → `docs/reference/…`
  (text only; the working link targets were already correct/depth-corrected).
- **`decisions/rfc/README.md`** — "Banza RFC Process" → "BANZA RFC Process".
- Website snapshots synced (ADR-002/004 byte-identical; ADR-008 keeps its depth-corrected link
  targets, text updated in place).

### Not changed (deliberate)

- **Errata (ADR-006/010/017, RFC-0006):** already present and correct — left as-is.
- **ADR-018:** an explicitly-disclaimed DRAFT ("NOT a BANZA protocol requirement, NOT approved,
  NOT submitted through governance") — correct as a pre-submission draft; no change.
- **Certification/federation ADRs (021, 022, 026, 027, 031):** they describe the certification and
  federation **model** (BANZA CA issuing operator certificates; L0–L4) as a *future/pending*
  design, and honestly signal pre-production (ADR-031: `M2/M3 pending`, "no operator is
  certified", `/operators` empty). They do **not** claim a current certified operator or active
  production certificate — correct; no change.
- **Historical migration prose (ADR-002/008):** three backticked references to
  `docs/migration/*.md` (the naming-inversion working docs) remain as historical prose. Those
  operational docs were removed in the protocol-only cleanup; the ADRs are point-in-time records
  of that process and are **not** edited (no silent history rewrite). They are not markdown links,
  so they do not fail the broken-link check. Noted here for transparency.
- **Mixed-case "Banza" in founding ADRs (001, 004, 007, 012, 013):** reviewed and kept — these are
  historical/product-context references (the pre-extraction product / operator implementation),
  not current claims that BANZA operates a wallet/app. ADR-001/003/005 make the protocol-vs-product
  boundary explicit.

## Claims eliminated / confirmed absent (current claims)

`Banza/BANZA wallet` · `wallet-native payment network` · `BANZA moves/holds/settles/custody funds`
· `BANZA authorizes/completes payments` · `certified operator`/`production certificates active` as
current reality · automatic certification · regulatory (BNA/licensed/bank) · BanzAI-as-authority —
**all 0 as live claims** (remaining occurrences are inside errata, the certification/federation
*model* descriptions, or documented findings).

## Consistency

- **With `spec/`:** ADRs are consistent with `spec/overview.md`, `spec/invariants.md`,
  `spec/federation/*` (the federation certificate model in ADR-026/027 matches
  `spec/federation/FEDERATION_*`). No ADR contradicts the spec.
- **Between documents:** RFCs are Drafts (proposals) and do not present as normative; BanzAI ADR
  (032) keeps BanzAI non-authoritative; conformance/certification ADRs (021/022) keep "PASS is
  evidence, not a certificate"; ADR-021 partially supersedes ADR-022 and says so.

## Checks

`reference-svg-check` 27/27 · `purity-check` · `identity-check` · `invariant-check` ·
`validate-compose.sh` · `validate-security-headers.sh` · **0 broken links** · JSON/YAML/OpenAPI
valid · website build.

## Scope & confirmations

Protocol **v1.0** · `VERSION=1.0.0` · `/operators=[]` · `production_certificates=false` ·
BanzAI mock (`llm_calls=0`). No ADR/RFC renumbered; no status changed; no contract/conformance/
OpenAPI/schema semantics changed; no services/infra-runtime/`.env`/secrets/DNS/Cloudflare/TLS
change. No M2, operator or certificate.

## M2-readiness

Every canonical ADR/RFC is boundary-clean and consistent with the current pre-production state.
No `MANUAL_REVIEW_REQUIRED`, no `BLOCKED`. The constitutional corpus is ready for M2-readiness /
institutional-facing review.
