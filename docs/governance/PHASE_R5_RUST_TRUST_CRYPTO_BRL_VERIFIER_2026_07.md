# Phase R5 — Rust Trust/Crypto/BRL Verifier with Golden Parity (2026-07)

**Program:** R1–R6 Rust-first engine migration (ADR-037). **Repo:** `banza-protocol/banza`.
**Branch:** `feat/r5-rust-trust-crypto-brl-verifier-2026-07`. Safety-critical.

> **Verification only.** `banza-trust` never generates keys, never signs, never issues a certificate,
> and carries no production key. No M2/M3, no operator, no certificate; `/operators=[]` and
> `production_certificates=false` untouched.

## Objective

Create `engines/banza-trust`, the Rust trust/crypto verifier, porting the **verification** side of
`trust_root.py` (ed25519 / ADR-026 canonical JSON) with **byte-for-byte golden parity**.

## What shipped

- **`canonical_bytes`** — the ADR-026 canonical form (fields minus `signature`, sorted keys, compact),
  matching Python `json.dumps(sort_keys=True, separators=(',',':'))` for ASCII payloads. Verified by a
  unit test (`{"b":2,"a":1,"signature":…}` → `{"a":1,"b":2}`).
- **`verify_ed25519`** — `ed25519-dalek` `verify_strict` over base64url-no-pad signatures.
- **`verify_certificate` / `verify_brl` / `verify_key_manifest` / `verify_evidence_package`** —
  fail-closed (missing/invalid signature = failure; INV-FEDEVAL-005 for BRLs).
- **`check_chain`** — offline triple-verification: certificate verifies under the root, BRL verifies
  under the root, and the certificate subject is not in the BRL revoked list.
- **CLI `banza-trust`:** `verify-certificate`, `verify-brl`, `verify-key-manifest` (+`verify-manifest`,
  `verify-root`), `verify-evidence`, `check-chain`, `version`. JSON `TrustResult`, exit 0/1.
- **Golden parity** — `golden/vectors.json`: **real ed25519 signatures produced by `trust_root.py`'s
  ADR-026 scheme** (test keys only). 10 cases: valid cert/BRL/key-manifest, tampered-subject,
  tampered-level, tampered-revoked, tampered-manifest, wrong-key, and unsigned.
- **Tests (7):** golden parity over all 10 cases; tamper fails; BRL fail-closed on missing signature;
  check-chain triple-verification; canonical sorted/compact; wrong-key rejects a valid signature;
  verification-only (no signing API, test keys only).
- **Make:** `trust-rs-check` / `trust-rs-test`; `rust-engine-check` now also builds/tests this crate.
  **CI:** `banza-trust.yml`.

## Parity result

Rust verifies **all 10 golden ed25519 cases byte-for-byte** — it accepts exactly what the Python signer
produced (valid cert/BRL/manifest) and rejects every tampered/wrong-key/unsigned document. Crypto crates
are audited and common: `ed25519-dalek` (v2), `base64`, `sha2`.

## Scope boundary (honest)

banza-trust is a **verifier**. `trust_root.py`'s **signing** + key generation, and the offline **root
ceremony** (`tools/root-ceremony/`), are **not** ported (production signing stays offline/disabled).
Those remain Python and are tracked in the allowlist; the R5 goal (Rust trust *verification* with
proven parity) is met.

## Legacy status

`trust_root.py` stays (allowlist reclassified — verification now Rust with parity; signing/ceremony
stay Python). No production keys, no certificate issuance, no key generation added anywhere.

## Confirmations

- No VERSION change. No M2/M3, operator, or certificate. `/operators=[]`,
  `production_certificates=false` untouched. No contracts/OpenAPI change. No PyPI/GHCR publish.
- No real key, no signing, no issuance; test vectors only. No provider/Qwen/DeepSeek/GPU/external call.
  No secrets/`.env`. No Postgres/DNS/TLS/Cloudflare. **No deploy.** No `banzai` repo change.

## Unblocks

R6 can now retire duplicated trust-*verification* Python and, with a SimB fixture, port the federation
conformance that R4 left `NOT_YET_PORTED`.
