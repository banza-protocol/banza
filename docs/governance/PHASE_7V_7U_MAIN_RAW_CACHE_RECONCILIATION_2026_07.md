# Phase 7V — 7U Main / Raw Cache Reconciliation (2026-07)

**Base / current `main`:** `3a11a8d` (post-7U) · **Branch:** `fix/phase-7v-7u-main-raw-cache-reconciliation-2026-07`
**Status:** verification/reconciliation record. **No code, protocol, contract, conformance, runtime
or metadata change** — this phase only proves the truth and documents it.

## Trigger

After Phase 7U (PR #22, merged at `3a11a8d`) an external check appeared to see **old** versions in
`raw/main` for `docs/governance/README.md`, `docs/reference/getting-started.md` and `spec/README.md`.
This phase does **not** trust that observation; it proves the actual state from authoritative sources
(`git`, `git ls-remote`, `gh api` branch/commit/tree/contents, cache-busted GitHub raw, fresh
server-side rendered blob, and the VM checkout).

## Verdict

**The 7U fixes are correctly present on GitHub `main`, and every authoritative source is reconciled.**
`3a11a8d` is the HEAD of `origin/main` (case A). The contents API on `main` is byte-identical to the
same files at `3a11a8d` and to the local working tree (same blob SHAs). A cache-busted GitHub raw
fetch and a fresh server-side render of the blob pages both serve the corrected content; the VM
checkout matches. **The earlier "old `raw/main`" reading was a transient GitHub raw/rendered cache /
stale fetch — not a repository problem.** No content change was warranted or made.

## Cross-validation table

| Source | Expected | Observed | Result |
|---|---|---|---|
| local `HEAD` | `3a11a8d` | `3a11a8d2c596…` | ✅ |
| `origin/main` | `3a11a8d` | `3a11a8d2c596…` | ✅ |
| `git ls-remote origin refs/heads/main` | `3a11a8d` | `3a11a8d2c596…` | ✅ |
| `gh api …/branches/main .commit.sha` | `3a11a8d` | `3a11a8d2c596…` | ✅ |
| `gh api …/commits/main .sha` | `3a11a8d` | `3a11a8d2c596…` | ✅ |
| `3a11a8d` vs `origin/main` | HEAD or ancestor | **HEAD of origin/main (case A)** | ✅ |
| `gh repo view .defaultBranchRef` | `main` | `main` | ✅ |
| repo description | "Open protocol for financial interoperability and conformance." | exact match | ✅ |
| repo topics | protocol-first | `protocol, open-protocol, conformance, openapi, payments-protocol, financial-interoperability, financial-infrastructure, ledger, governance, angola, banza, banzai` | ✅ |
| `gh api git/trees/main` — required | gov README, getting-started, spec README, 7U matrix, 7U report, VERSION | all present | ✅ |
| `gh api git/trees/main` — forbidden | none of `apps/`, `docs/protocol`, `docs/adr`, `docs/rfc`, root `BANZA_*.md`, `deploy.sh` | **0 present** | ✅ |
| contents API `docs/governance/README.md` | == 3a11a8d == local | identical · blob `7f08e7cb8deb` (main = pin) | ✅ |
| contents API `docs/reference/getting-started.md` | == 3a11a8d == local | identical · blob `5d002bbfefa0` (main = pin) | ✅ |
| contents API `spec/README.md` | == 3a11a8d == local | identical · blob `14d25a1052a1` (main = pin) | ✅ |
| raw main `docs/governance/README.md` (`?cb=`) | "# BANZA Protocol Governance" present; "# Banza Governance"/"infrastructure layer" absent | new = 1; old = 0 | ✅ |
| raw main `docs/reference/getting-started.md` (`?cb=`) | "No operator is certified today" present; "Apply for certification"/"become a certified operator" absent | new = 1; old = 0 | ✅ |
| raw main `spec/README.md` (`?cb=`) | "T+0 finality invariant" present; "INSTANT SETTLEMENT"/"Consumer Wallet" absent | new = 1; old = 0 | ✅ |
| rendered blob `spec/README.md` (fresh curl) | new present; old absent | new = 2; old = 0 | ✅ |
| rendered blob `docs/governance/README.md` (fresh curl) | new present; "Any operator may build on it" absent | new = 2; old = 0 | ✅ |
| VM `/srv/banza-protocol/repo` HEAD | `3a11a8d` = origin/main | branch `main`, HEAD `3a11a8d` = origin/main, clean, VERSION 1.0.0 | ✅ |
| VM gov / getting-started / spec content | 7U new present; old absent | all new; 0 old | ✅ |

## Content assertions (contents API on `main`)

- **governance README:** contains "# BANZA Protocol Governance", the pre-production scope note ("do
  **not** certify operators · do **not** approve production deployment · do **not** replace legal,
  regulatory, banking, KYC/KYB or AML/CFT obligations · no certified operator and no active
  production certificate"), "does **not** contain a reference operator", "protocol specification
  layer", "Candidate operator implementations may build on the public protocol materials"; does
  **not** contain "# Banza Governance", "infrastructure layer", or "Any operator may build on it".
- **getting-started:** contains "candidate implementation", "conformance evidence", "future
  governance review", "No operator is certified today", "does **not** certify an operator", "If
  production certification opens", "applicable governance process"; does **not** contain "become a
  certified operator", "Apply for certification", "the BANZA CA issues a signed certificate", or
  "Your operator joins the public registry".
- **spec README:** contains "Conformance & certification-governance framework", "Payer
  account/wallet", "Payee account/wallet", "SETTLEMENT (T+0 finality invariant)", and "BANZA does
  not operate wallets, move funds, execute settlement, or provide operational latency"; does **not**
  contain "Consumer Wallet", "Merchant Wallet", or "INSTANT SETTLEMENT".

## Notes

- **GitHub raw/rendered cache:** the `raw.githubusercontent.com` CDN and the rendered blob pages can
  serve a stale snapshot to a browser session for a short window after a merge; the git refs, the
  tree/contents API and a cache-busted/fresh fetch prove `main` is the corrected 7U state. No
  repository change was warranted — correcting a repo because of a CDN cache would have been wrong.

## Checks

No repo change required for reconciliation. Confirmatory local checks on `main` were run:
`reference-svg-check` 27/27 · `purity-check` · `identity-check` · `invariant-check` ·
`validate-compose.sh` · `validate-security-headers.sh` · broken relative links = 0.

## Confirmations

Protocol **v1.0** · `VERSION=1.0.0` · `/operators=[]` · `production_certificates=false` · BanzAI
mock · CSP-Report-Only active · default branch `main` · description/topics protocol-first. No force
push, no destructive reset, no `main` history rewrite. No deploy (report only; the website does not
consume these files). No M2, operator or certificate.

**PHASE 7V 7U MAIN RAW CACHE RECONCILIATION PASSED.**
