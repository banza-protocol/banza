# Root Ceremony — simulator moved to Rust (ADR-037, R9)

The Python root-ceremony scripts have been **removed**. The canonical TEST-ONLY ceremony **simulator**
is Rust:

- **[`engines/banza-trust`](../../engines/banza-trust/README.md)** (`banza-trust`):
  - `ceremony-simulate` — simulate the full trust chain (root key → key manifest → certificate → BRL →
    revoke → verify), deterministic, in memory.
  - `ceremony-check` — assert the simulated ceremony is consistent and touched no production state.
  - `generate-test-root` / `sign-test-certificate` / `sign-test-brl` / `sign-test-key-manifest` /
    `sign-test-assertion` — TEST-ONLY signing.

> **This is a simulator.** It uses deterministic TEST keys only — never a real key, never a production
> certificate, never `/operators`/`/.well-known`. The **real** production root ceremony
> (M2) remains offline and disabled; it is a governed, out-of-band process, not code that runs here.
