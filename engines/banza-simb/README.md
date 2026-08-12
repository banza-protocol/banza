# banza-simb (ADR-037, R8)

A local, deterministic, **in-process** Rust simulator of a BANZA operator and federation peer. It lets
`banza-conformance-rs` run live-operator and federation conformance **without a running operator,
without a network, without funds, and without secrets**.

> **TEST ONLY.** No real funds move; no Postgres; no external call; no operator is added to
> `/operators`; no production certificate is emitted. Every simulator reports `test_only = true`.

## Design

SimB is a **library** simulator (not an HTTP server): the conformance runner links it and drives it
directly. This is deterministic and CI-safe, and honours "no external network by default" better than a
socket server. `banza-simb serve` documents this (it opens no port).

- `SimOperator` — in-memory ledger with seed wallets; `create_transfer` (double-entry: 1 DEBIT + 1
  CREDIT, shared trace, idempotent by key, no negative balance), `create_settlement` (net + fee ==
  gross), `manifest` (sandbox, `production_allowed=false`).
- `Federation` — two `SimOperator` peers; `route` (atomic debit + irrevocable obligation, idempotent),
  `net_position` (bilateral netting).

## CLI

```
banza-simb scenario   # run a deterministic transfer + settlement + federation route (JSON)
banza-simb fixture    # seed wallets + manifest
banza-simb golden     # same as scenario (deterministic golden output)
banza-simb serve      # documents in-process mode (no port opened)
banza-simb version
```

## Make / CI

`make simb-rs-check` (cargo test). CI: the `banza-simb (R8 simulator)` job in `rust-engines.yml`.
