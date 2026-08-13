# ADR-019 — Wallet accounts

ADR-021 defines an **Application Settlement** that pays a beneficiary from *net
value already sitting in an application-controlled account*, after a business
event (a campaign closes, a sale completes, a period ends). Its `source` is a
ledger **account**.

A reference audit (2026-06-30, a donation application on the reference operator) found
the missing piece: an application routinely runs **many independent aggregates of
the same kind** that share one owner and currency — e.g. a donation platform with
many simultaneous campaigns. Each aggregate needs its **own isolated balance** so
that:

- donations for campaign A can never be settled out of campaign B;
- a campaign's settlement gross is *exactly* that campaign's accumulated net;
- the operator — not the application — is the source of truth for each balance.

Today a wallet exposes a **single** available account (one wallet per owner per
currency). An application with many aggregates would therefore have to keep
**per-aggregate sub-balances in its own database** and tell the operator how much
to move. That is precisely the inversion ADR-001 forbids: a parallel,
unreconcilable, uncertifiable ledger living inside an application, and an
application *computing money*.

Per ADR-001 this structural concept — *how value is segregated within an owner's
wallet* — must be ratified in the protocol **before** the operator or any
application implements it.

## Decision

Introduce one **reference-only** protocol concept: the **Wallet Account**.

### Model

```
Owner (Business / Consumer)
└── Wallet            — one container per (owner, currency)
    ├── Account PRIMARY        — the wallet's default account (mandatory, unique)
    ├── Account CAMPAIGN · A   — segregated, isolated balance
    ├── Account CAMPAIGN · B
    └── Account ESCROW · …
```

- **Wallet** — unchanged: a financial container scoped to one **owner** and one
  **currency**.
- **Wallet Account** — a **segregated ledger account inside a wallet**, with its
  own balance, a **purpose**, and an optional **external reference**. A wallet has
  **N** accounts.

A Wallet Account is **not** a person, a merchant or a consumer. It is **financial
segregation only** — a named partition of an owner's wallet.

### Protocol fields (reference-only)

| Field | Meaning |
|---|---|
| `wallet_id` | the parent wallet |
| `account_id` | the segregated ledger account (the unit ledger postings reference) |
| `owner_ref` | the wallet's owner (opaque to the protocol) |
| `currency` | inherited from the wallet |
| `purpose` | one of the purposes below |
| `reference_type`, `reference_id` | optional external aggregate reference (e.g. a campaign id) — opaque to the operator |
| `label` | optional human label |
| `status` | `ACTIVE` · `INACTIVE` · `SETTLED` · `CLOSED` |
| `available_balance` | settled, spendable balance (read from the operator) |
| `pending_balance` | not-yet-settled balance |
| `created_at` | |

### Purposes (initial)

`PRIMARY` · `CAMPAIGN` · `PROJECT` · `EVENT` · `STORE` · `ESCROW` · `RESERVE`
· `SETTLEMENT` · `CUSTOM`

### Rules

1. A wallet may have **N** accounts.
2. Every wallet has exactly one **PRIMARY** account — **mandatory and unique** per
   wallet. It is the wallet's pre-existing available account.
3. Each account has an **independent balance**.
4. **Ledger postings always reference an `account_id`** (ADR-011 already posts to
   accounts — this makes the account the addressable unit, not the wallet).
5. A **payment destination** and an **Application Settlement source** MAY be an
   `account_id`. When an account is not specified, the operator uses **PRIMARY**
   (backward compatibility — existing flows are unchanged).
6. Money entering a wallet always lands in a **specific account** (PRIMARY by
   default).
7. An account that is `SETTLED` / `CLOSED` accepts no new payments.
8. Applications **never** compute a sub-balance outside the operator. The balance
   of each account is read from the operator.
9. Segregation is enforced by the operator: a settlement may only draw from the
   account it names, and an account belongs to exactly one owner's wallet —
   cross-owner use is rejected.

### What stays operator policy (not protocol)

How accounts are *created* and *authorized* (which applications may create
accounts, KYB gating, naming, lifecycle UI) is **operator policy** — see
[BANZA-PROTOCOL-VS-OPERATOR-POLICY](../../docs/governance/BANZA-PROTOCOL-VS-OPERATOR-POLICY.md).
The protocol defines the **concept, fields, rules and contracts**; the reference
operator implements them and decides access policy.

## Consequences

- **Operator (reference implementation):** adds `wallet_accounts` (one row per account, each backed
  by a ledger account). Every **existing** wallet is migrated to gain a `PRIMARY`
  account that adopts its current available account/balance — no balance moves, no
  flow breaks. Legacy APIs (payments, receipts, proofs, transfers, merchant /
  consumer login) keep working unchanged by defaulting to `PRIMARY`.
- **Settlement (ADR-021):** the settlement `source` becomes an `account_id`,
  allowing one aggregate's net to be settled in isolation.
- **Contracts:** add `wallet-account.schema.json`; `settlement-source` and
  `payment-destination` gain an `account_ref`.
- **Applications (e.g. a donation platform):** can isolate funds per aggregate
  (per campaign) using operator accounts, holding **no** sub-balances of their own.

## Alternatives considered

- **Multiple wallets per owner/currency** — rejected: a wallet is, by ADR-020, the
  per-(owner, currency) container; multiplying wallets overloads that identity and
  complicates the wallet/account UX. Segregation belongs *inside* the wallet.
- **A merchant/consumer per aggregate** — rejected: an aggregate is not an
  identity; it must not require onboarding/KYB and must not appear as a party.
- **Application-side sub-balances** — rejected by ADR-001 (a parallel ledger).

## Rollout (protocol-first)

1. This ADR + contracts (BANZA).
2. Reference-operator implementation (`wallet_accounts`, ledger compatibility, APIs, operator
   admin-console read-only visibility).
3. Sandbox migration + E2E; then live migration + deploy + smoke.
4. Only then do applications (e.g. a donation platform) consume the capability.
