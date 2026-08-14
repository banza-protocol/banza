# ADR-029 — Private keys never reside on serving infrastructure

- **Status:** Accepted
- **Date:** 2026-07
- **Relates:** ADR-027 (open protocol trust model)

## Context
Under the open trust model (ADR-027), BANZA's trust material is anchored in an **offline root**
held under **threshold custody**, which signs **protocol metadata only** and never routine artifacts.
The signed **key manifest** distributes **delegated signing keys** (short-lived, scope-limited,
domain-separated), used for signed protocol metadata and revocation entries. Producing and signing
these artifacts is an offline concern. The serving infrastructure must not become a key custodian.

## Decision
- The **root key is offline and under threshold custody**; it never touches any serving VM.
- **Delegated signing keys** are likewise held offline and never live on the serving VM.
- The BANZA protocol VM **only serves signed public artifacts**: signed protocol metadata, the signed
  key manifest, the public protocol registry, revocation entries, documentation and BanzAI. It holds
  **no private keys** and performs **no signing**.
- Signed artifacts are produced out-of-band (offline) and loaded into the protocol DB as opaque signed
  blobs (with public metadata) for serving.

## Consequences
- Compromise of the serving VM cannot forge trust artifacts (no private key present): a forged blob
  fails verification against root-signed protocol metadata.
- Reinforces the open trust model's discipline that private key material never exists in serving
  infrastructure (ADR-027): verification runs off signed metadata (`INV-OTE-*`), not off any runtime key.
- Clear operational boundary between "produce and sign" (offline) and "serve" (the protocol VM).
