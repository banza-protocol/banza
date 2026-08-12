# Phase 7K1 — Wallet-Native Boundary Correction (2026-07)

**Base:** `main` `522e1bc` · **Branch:** `fix/phase-7k1-wallet-native-boundary-2026-07`
**Status:** non-normative record. Deepens the 7K F-08 fix. **No** protocol version, contract,
conformance, OpenAPI, schema, API or runtime-semantics change.

## Purpose

7K corrected "Banza wallet" wording but left the **"wallet-native"** framing largely intact —
including the claim that BANZA *is* a wallet-native payment network. That is wrong for the
protocol boundary. **BANZA is not a wallet, is not "wallet-native", operates no user account or
balance, and does not authorize, complete, move, hold or settle payments/funds.** BANZA defines
a protocol-level account/participant model; **operators or applications** implement wallets,
accounts or balance systems. This phase reframes the language accordingly.

## ADR-010 — rewritten (not surface-substituted)

Retitled **"Account/Participant Identity Model (Account-Based, Not Card-First)"** (status, date,
number unchanged). Context and Decision rewritten so the ADR describes a **protocol-level account
abstraction implemented by operators**, not a wallet operated by BANZA.

- **Decision (now):** *"BANZA defines a protocol-level account and participant identity model that
  can be implemented by operators or applications using wallets, accounts, balances or equivalent
  account systems. BANZA itself is not a wallet, does not operate user accounts, does not authorize
  payments, does not complete payments and does not move, hold or settle funds."* — the model is
  **account-based and QR/@handle-addressable, not card-first**.
- "wallet-native" removed as a BANZA descriptor throughout; "Banza wallet" → participant
  account / operator wallet-account; the stale `CLAUDE.md §2.7` operator-constitution references
  were dropped (the ADR no longer links `CLAUDE.md`).
- **Erratum — 2026-07** (per the agreed formulation): clarifies BANZA is not a wallet and does not
  operate wallets or user balances; wallet/account implementations belong to operators.

## ADR-017 — reframed

Title and prose "wallet-native (merchant) payment" → **"wallet/account (merchant) payment"**; the
`WALLET_PAYMENT` **source-type constant is unchanged** (no contract/enum change). The residual
"BANZA wallet" appears only in the historical erratum. ADR-017 already stated "BANZA defines the
model; operators implement it".

## Repo-wide terminology sweep

`wallet-native` → `wallet/account` applied across the canonical and website-content trees where it
was a current descriptor: ADRs 014–024 (`Extends:` references and prose), `spec/collections.md`,
`spec/disputes.md`, `spec/overview.md`, `decisions/adr/README.md`, and the PT reference
(`docs/reference/pt/completa.md` + `website/content/BANZA_REFERENCIA.md`, retitled to
"Modelo de identidade de conta/participante"). The two ADR **filename slugs**
(`ADR-010-wallet-native-identity.md`, `ADR-017-…-model.md`) are preserved (stable identifiers), so
no links break. Governance/audit reports retain "wallet-native" only as **documented history**.

Website snapshots re-synced: ADR-010/017 copied from canonical (byte-identical); all other website
ADR copies transformed in place (depth-corrected outside-tree links preserved).

## Zero-claim scan (repo-wide, current claims — errata/reports excluded)

`Banza wallet` · `BANZA wallet` · `wallet-native payment network` · `BANZA/Banza authorizes` ·
`BANZA/Banza completes` · `BANZA holds funds` · `BANZA moves funds` · `BANZA settles funds` — **all
0 live**. Remaining `wallet-native` strings are only in errata, governance reports, or filename
slugs.

## Also

Fixed a latent broken link in `PHASE_7K_…md` (it quoted a relative `CLAUDE.md` link path as an
example, added after 7K's last link-check; reworded to plain non-link text).

## Files changed

ADR-010 (rewrite) + ADR-014/015/016/017/018/019/020/023/024 + `decisions/adr/README.md`;
`spec/{collections,disputes,overview}.md`; `docs/reference/pt/completa.md`; the matching
`website/content/decisions/adr/*` and `website/content/BANZA_REFERENCIA.md`; `PHASE_7K_…md`
(link fix); this report. **No** `contracts/`, `conformance/`, OpenAPI, schema, `VERSION`,
services, infra-runtime, or nginx change.

## Checks

`purity` · `identity` · `invariant` · `reference-svg` 27/27 · `validate-compose` ·
`validate-security-headers` · **0 broken links** · JSON valid · website build · zero-claim scan.

## Scope (unchanged)

Protocol **v1.0** · `VERSION=1.0.0` · `/operators=[]` · `production_certificates=false` ·
BanzAI mock. No ADR/RFC status/renumber, no contract/conformance semantics, no M2, no operator,
no certificate. Deploy: **website only** (ADR/reference pages changed); no nginx/services/`.env`
change this phase.
