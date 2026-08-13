# banza-trust (ADR-037, R5)

The Rust BANZA **trust/crypto verifier**, and the canonical implementation of verification. It replaced
the Python verifier that preceded it (ADR-037); that code no longer exists in this repository.

> **Verification only.** This crate NEVER generates keys, NEVER signs, NEVER issues a certificate, and
> carries no production key. It verifies fixtures. It does not activate M2/M3, does not emit
> certificates, and does not change `/operators=[]` or `production_certificates=false`.

## Scheme (ADR-038)

- canonical form = all fields except `signature` (evidence: except `package_signature`+`evidence_hash`),
  **sorted keys, compact JSON** (`serde_json` Map is a sorted BTreeMap → matches Python
  `json.dumps(sort_keys=True, separators=(',',':'))` for ASCII payloads);
- **ed25519** (`ed25519-dalek`, `verify_strict`) over the canonical bytes;
- signature encoded **base64url without padding**;
- **fail-closed** — a missing/invalid signature is a verification failure (INV-FEDEVAL-005: an
  unverifiable BRL is an absent BRL).

## API / CLI

```
verify-certificate  <cert.json>  <root_pub_b64url>
verify-brl          <brl.json>   <root_pub_b64url>
verify-key-manifest <manifest.json> <root_pub_b64url>   (aliases: verify-manifest, verify-root)
verify-evidence     <report.json> <root_pub_b64url>
check-chain         <cert.json> <brl.json> <root_pub_b64url>   # cert valid + BRL valid + subject not revoked
version
```
Exit 0 if verified, 1 if not; deterministic JSON `TrustResult { verified, kind, detail }`.

## Golden parity

`golden/vectors.json` holds **real ed25519 signatures produced by the Python trust root's ADR-038
scheme** (test keys only). The test suite (`cargo test`) verifies every case byte-for-byte: valid
certificate/BRL/key-manifest verify; tampered fields, wrong key, and unsigned documents all fail. This
is the parity proof — Rust accepts exactly what the Python signer produced and rejects everything else.

To regenerate the golden (test keys, off the serving path): sign a cert/BRL/manifest with this crate's
TEST-ONLY `sign-test-certificate` / `sign-test-brl` / `sign-test-key-manifest` (ADR-038 canonical form)
and write the signed docs + the root public key (base64url) into `golden/vectors.json`.

## Make / CI

```bash
make trust-rs-check    # golden ed25519 parity (cargo test)
make trust-rs-test     # cargo fmt + clippy -D warnings + test
```
CI: `.github/workflows/banza-trust.yml`.

## Not ported (stays Python / later phase)

Signing, key generation, and the offline **root ceremony** (`tools/root-ceremony/`) are not ported —
banza-trust is a verifier by design. Production signing stays offline and disabled.
