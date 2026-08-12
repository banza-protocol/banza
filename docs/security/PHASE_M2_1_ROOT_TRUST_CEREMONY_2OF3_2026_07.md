# BANZA — Phase M2.1: Root Trust Ceremony 2-of-3

**Date:** 2026-07-17
**Branch:** `feat/m2-1-root-trust-ceremony-2of3-2026-07`
**Scope:** Implement the M2 **root trust ceremony (2-of-3)** for the BANZA open financial protocol —
documentation, schemas, a Rust validation engine, an offline CLI, a private-key-leak guard, the Workbench
UI, the Evidence Bundle and the Assistente. The **real** ceremony runs OFFLINE on the custodians' own
air-gapped computers; the repo/CI/website/server/Workbench never contain real private keys.

> **Regra central.** A raiz M2 do BANZA estabelece confiança do protocolo financeiro aberto BANZA. Ela não
> autoriza serviços de pagamento, não cria operador, não emite licença, não processa transacções, não
> liquida valores, não movimenta fundos e não substitui autorização regulatória dos operadores que
> implementam o protocolo.
>
> **BANZA é um protocolo financeiro aberto.** PSPs, bancos ou operadores autorizados são entidades
> separadas que podem implementar o protocolo para prestar serviços financeiros reais.

## Custody model (2-of-3)

- Three independent custodians; **one** root Ed25519 key each (Custodian A ↔ `root_key_A`, B ↔
  `root_key_B`, C ↔ `root_key_C`). Threshold **2-of-3**: two signatures required, **no one signs alone**.
- Losing one key does not destroy the root; compromise of one key does not compromise the whole root.
- **Encrypted USB backup** per custodian (one USB per custodian, never more than one root key per USB;
  passphrase kept OFF the USB; recovery tested offline with a TEST-ONLY artifact; USB never plugged into a
  server/CI/online machine).
- **Offline computer** decision: personal computers used only in offline ceremony mode (Wi-Fi/ethernet/
  Bluetooth/AirDrop/cloud-sync OFF; browsers/email/messengers/cloud drives closed). No private key ever
  touches an online environment or GitHub/CI/Docker/Postgres/`.env`/cloud sync/email/WhatsApp.

## What shipped

| Layer | Artifact |
|---|---|
| Engine (Rust) | **NEW crate `engines/banza-root-ceremony`** — `validate_root_ceremony` (**real Ed25519** signature verification, 2-of-3 threshold, custody/backup/offline/recovery checks, root scope, regulatory boundary, forbidden-private-key-material detection, SHA-256 hashes — **all in Rust**), `demo_fixtures` (11 TEST-ONLY fixtures — one per status; real signatures over deterministic TEST-ONLY keys), `schema`, `tool_version`. `root_ceremony_*` WASM exports. 17 tests. CI job. |
| CLI (Rust, offline) | **NEW crate `engines/banza-root-ceremony-cli`** — the offline tool custodians run air-gapped: Ed25519 keygen writing the private key **only encrypted** (ChaCha20-Poly1305; refuses a missing passphrase; refuses a Git-worktree destination; never prints a private key/seed), sign/verify root metadata, 2-of-3 verification, fingerprint, TEST-ONLY recovery test. 8 safety tests. CI job. |
| Contracts | `contracts/production/`: **9 root-trust schemas** — root-metadata (with the boundary object: `open_financial_protocol:true`, `payment_service_authority:false`, `operator_authorisation_authority:false`, `moves_funds/settles_funds/holds_funds/issues_payment_licence/creates_operator:false`, `requires_operator_regulatory_authorisation_if_used_for_real_services:true`), root-key, root-signature, root-delegation, root-ceremony-evidence, root-custody/backup/recovery declarations, root-revocation. Public material only. |
| Docs | `docs/security/`: `M2_ROOT_TRUST_CEREMONY_2OF3`, `M2_ROOT_CUSTODY_MODEL_2OF3`, `OFFLINE_COMPUTER_PREPARATION_CHECKLIST`, `ENCRYPTED_USB_BACKUP_POLICY`, `ROOT_KEY_RECOVERY_TEST_RUNBOOK`, `ROOT_KEY_ROTATION_AND_REVOCATION_POLICY`, `ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE` + this phase report. |
| Guard | **NEW `tools/check-private-key-leak.sh` + `make private-key-leak-check`** — blocks committed PEM private-key blocks, secret-bearing files (`.key/.pem/.seed/.secret/.age/.gpg`), root private-key files, plaintext passphrase/password assignments and secret field-name tokens (outside the detector/docs/schemas/tests). |
| Evidence Bundle | `banza-evidence-bundle` accepts `m2_root_ceremony_report` (recommended) + `m2_root_ceremony_summary`; demo builds a real root-ceremony report. |
| Assistente | `banzai-evidence` gains the `root_ceremony` intent (+ `ceremony` citation): explains 2-of-3, encrypted pendrive backup, denies GitHub/server/`.env` storage and payment/operator/licence/fund authority. 6 tests. |
| Adapter + UI (TS) | `website/lib/banzaRootCeremony.ts` (load+marshal only; `rootCeremonyStatusTone` render-only); Workbench → **M2.1 · Root Trust Ceremony (2-de-3)** section (fixture selector, "Validar root ceremony", threshold/custody/backup/offline/recovery/hashes, boundary copy); Evidence Bundle checklist `M2.1 root ceremony report`. |

### Status values (Rust, precedence order)

malformed → `INVALID` (fail-closed) → `INVALID_FORBIDDEN_PRIVATE_KEY_MATERIAL` →
`INVALID_REGULATORY_BOUNDARY` → `INVALID_SCOPE` → `INVALID_SIGNATURE` → `BLOCKED_BY_THRESHOLD` →
`BLOCKED_BY_CUSTODY_GAP` → `BLOCKED_BY_BACKUP_GAP` → `BLOCKED_BY_OFFLINE_EVIDENCE_GAP` →
`BLOCKED_BY_RECOVERY_TEST_GAP` → `M2_ROOT_CEREMONY_INCOMPLETE` → `M2_ROOT_CEREMONY_VALID`.

## Boundary / status computed in Rust — never in TypeScript

The ceremony status, the Ed25519 signature verification, the 2-of-3 threshold, the custody/backup/offline/
recovery checks, the forbidden-material detection and the hashes are all computed by
`validate_root_ceremony` (Rust → WASM). The TypeScript adapter only marshals JSON and maps a Rust status to
a render tone. The Assistente `root_ceremony` intent is deterministic (`llm_calls = 0`).

## No real private keys — public material only

Published: public keys, key IDs, fingerprints, root metadata, signatures, threshold policy, ceremony
evidence hash, custody/backup/recovery declarations without secrets. **Forbidden** to publish: private
keys, seeds, mnemonics, passphrases, encrypted private-key backups, USB images, recovery material, raw
entropy, secret logs, anything that lets someone sign as a custodian. The `private-key-leak-check` guard
enforces this at the repo level; the engine rejects any ceremony input carrying key material.

## Pre-production state unchanged

`/operators = []`, `production_certificates = false`, provider mock, `llm_calls = 0`,
`external_model_called = false`. No key generated in CI, no real production key in the repo/website/server/
`.env`, no operator activated, no certificate emitted, no funds moved. No DNS/TLS/Cloudflare/Postgres/secret
changes; website-only deploy.

## Checks

`cargo fmt` + `clippy` + `cargo test` (banza-root-ceremony **17**, banza-root-ceremony-cli **8**,
banza-evidence-bundle **11**, banzai-evidence full incl. `kb` + `root_ceremony`), WASM build
(banza_root_ceremony + banza_evidence_bundle + banzai_evidence; siblings byte-identical), `npm run test`
(vitest 116), `npm run type-check` (tsc), `npm run build` (next), and the `make` guards:
**private-key-leak-check**, regulatory-check, identity-check, purity-check, invariant-check, rust-rule-check,
rust-engine-check, rust-final-closure-check, conformance-rs-check, simb-rs-check, reference-svg-check — all
green. Browser E2E on `/banzai/workbench`. Adversarial multi-agent review.
