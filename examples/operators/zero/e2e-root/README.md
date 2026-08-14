# Operador Zero — E2E Demo Operator Root (ADR-035, M2.13A)

A **demo-only** Ed25519 signing root used by the Operador Zero end-to-end protocol validation. It
exists to exercise signature, key manifest, revocation, evidence-bundle and trace verification for the
Operador Zero reference implementation (ADR-035) — nothing more.

> This is **NOT** the Trust Root of the BANZA protocol. It does **not** certify, authorise, license or
> approve any operator, and it moves **no** real money. Every artifact declares `demo_only: true`,
> `production_allowed: false`, `monetary_value: false`, `root_type: "demo_operator_root"` and
> `not_protocol_trust_root: true`. Any PASS here is **local technical evidence, not certification**.

## How it was made

The Rust crate [`engines/operator-zero-e2e-root`](../../../../engines/operator-zero-e2e-root) generated
these artifacts:

```
cargo run -p operator-zero-e2e-root --bin gen            # (re)generate the public artifacts
cargo run -p operator-zero-e2e-root --bin gen -- --verify # verify them (public-key-only)
```

The signing key is a **fresh Ed25519 key generated in memory only**. It is **never written to disk and
never committed**, and it is dropped when the generator exits. Verification needs only the public key,
so the tests and `make operator-zero-full-e2e-check` re-verify these artifacts without any private key.

## Artifacts (all public)

| File | What it is |
|---|---|
| `operator-zero-e2e-root.public.json` | The demo root's public key (multibase base64), key id, fingerprint |
| `operator-zero-e2e-key-manifest.json` | Key manifest listing the active signing key |
| `operator-zero-e2e-key-fingerprint.txt` | `sha256:<hex>` fingerprint of the public key |
| `operator-zero-e2e-signature-report.json` | Per-payload digest + signature, self-verified |
| `operator-zero-e2e-revocation-list.json` | Revokes a **different** demo key (proves fail-closed) |
| `operator-zero-e2e-signed-manifest.json` | The demo manifest + its signature |
| `operator-zero-e2e-signed-evidence-bundle.json` | The demo evidence bundle + its signature |
| `operator-zero-e2e-root-verification-trace.json` | The ordered verification steps and their results |

## What the tests + guard prove

- the public key exists and is a valid 32-byte Ed25519 key;
- **no private key** (or seed/mnemonic/PEM) exists in the repo;
- the signed manifest and evidence bundle **verify** against the public key;
- a **tampered payload fails** verification;
- a **revoked key blocks trust** fail-closed, while the active key stays `valid_demo`;
- this demo root is **not** the protocol Trust Root.

Enforced by `engines/operator-zero-e2e-root/tests/e2e_root.rs`, the repo-wide
`make private-key-leak-check`, and `make operator-zero-full-e2e-check`.
