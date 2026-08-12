# Banza Conformance Runner — moved to Rust (ADR-037, R9)

The Python conformance runner has been **removed**. The canonical runner is Rust:

- **[`engines/banza-conformance`](../../engines/banza-conformance/README.md)** (`banza-conformance-rs`)
  - `check-vectors` / `report` / `parity` — offline vector integrity + invariants + golden parity
  - `run-live` / `run-against-simb` — live-operator conformance against the Rust SimB simulator
  - `run-fed` — federation conformance against two SimB peers (trust via `banza-trust`)
  - `e2e` — live + federation end-to-end
- **[`engines/banza-simb`](../../engines/banza-simb/README.md)** (`banza-simb`) — the local, deterministic,
  in-process operator/federation simulator (no network, no funds, no secrets).
- **[`engines/banza-trust`](../../engines/banza-trust/README.md)** (`banza-trust`) — ed25519 verification
  **and** TEST-ONLY signing + root-ceremony simulator.

No Python engine remains here. The conformance **vectors** are data in `../../conformance/vectors/`.

> A PASS is technical conformance evidence, **not** production certification. No operator is certified,
> no production certificate is active, and no PyPI/GHCR package is published.
