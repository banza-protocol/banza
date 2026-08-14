# ADR-017 — Wallet accounts: segregation inside a wallet

## Context

A wallet holding one balance per currency is enough until a participant needs to keep money apart for a
reason. A merchant running a campaign wants that campaign's takings separable. An organisation collecting
for a specific purpose needs those funds distinguishable from operating funds. A platform holding an
amount pending a condition needs it not mixed with everything else.

Without a model for this, participants improvise: a second wallet under a different identity, a spreadsheet
beside the ledger, or a convention that a portion of the balance is spoken for. Each of those breaks
reconciliation, because the ledger and the participant's understanding of it diverge.

## Decision

**A wallet contains accounts. An account is a segregated ledger account inside a wallet, with its own
balance and a stated purpose.**

```
Owner
└── Wallet                     one container per (owner, currency)
    ├── Account · PRIMARY      the default account — mandatory, exactly one
    ├── Account · CAMPAIGN A   segregated, isolated balance
    ├── Account · CAMPAIGN B
    └── Account · …
```

A wallet remains what it was: a container scoped to one owner and one currency. Every wallet has exactly
one primary account, which is the default destination when nothing else is specified. Additional accounts
are segregated — their balances are independent, and value moves between them only by an ordinary ledger
posting, which is balanced like any other.

A wallet account is a **financial structure, not a party**. It is not a person, a merchant or a consumer,
and it carries no identity of its own. Every account belongs to the wallet's owner, so segregation is an
arrangement of one owner's money, never a way to hold money for someone else.

## Rationale

Segregation belongs in the ledger because that is the only place it can be true. A balance partitioned by
convention is a claim; a balance held in distinct ledger accounts is a fact, derived from entries like
every other balance (ADR-012) and reconcilable without knowing the convention.

Keeping accounts inside a wallet, under a single owner, is the boundary that keeps this from becoming
something else. Accounts that could belong to different owners would be sub-custody: one party holding
money for another inside a wallet, with all the obligations that implies. One owner per wallet means
segregation is organisational, and the model stays a bookkeeping structure.

The mandatory primary account removes an entire class of ambiguity — there is always a defined
destination, so no operation has to guess and no wallet can exist in a state where value has nowhere to
land.

## Alternatives considered

**Multiple wallets per owner per currency instead of accounts.** Nearly equivalent, and rejected because
the wallet is the addressable unit: multiple wallets would multiply payment addresses and force every
payer to know which one to pay.

**Balance annotations or tags on a single balance.** Rejected. A tag is not a balance, cannot be
reconciled independently, and cannot prevent the tagged amount from being spent.

**Sub-accounts owned by different parties.** Rejected: that is custody of third-party funds, which is a
regulated activity and not something a wallet structure should confer implicitly.

## Consequences

- Purpose-segregated balances are real, derived and reconcilable, without a second system.
- Payment addressing is unchanged, because the wallet remains the addressable unit.
- Movement between accounts is an ordinary balanced posting, visible in the ledger like any other.
- Segregation cannot express holding funds for another party, which is deliberate.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/wallet-accounts/wallet-account.schema.json`](../../contracts/wallet-accounts/wallet-account.schema.json)
- [`contracts/invariants.json`](../../contracts/invariants.json) — `INV-WALLET-*`
