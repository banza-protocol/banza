# BANZA — Root Trust Ceremony 2-of-3 (M2.1)

> **A raiz M2 do BANZA estabelece confiança do protocolo financeiro aberto BANZA. Ela não autoriza serviços de pagamento, não cria operador, não emite licença, não processa transacções, não liquida valores, não movimenta fundos e não substitui autorização regulatória dos operadores que implementam o protocolo.**
>
> **BANZA é um protocolo financeiro aberto. PSPs, bancos ou operadores autorizados são entidades separadas que podem implementar o protocolo para prestar serviços financeiros reais.**

This is the **canonical** M2.1 ceremony document. It defines the offline root-key ceremony that
establishes the BANZA root of trust using a **2-of-3 threshold** across **three independent
custodians**. The real ceremony happens **offline, on each custodian's own computer**; this repository,
CI, the website, the server and the Workbench **never** contain any real private key. BANZA permanece
protocolo financeiro aberto; operadores autorizados são entidades separadas que implementam o protocolo.

It consolidates and cross-references the M2 planning artifacts:
[`PRODUCTION_TRUST_PATH.md`](PRODUCTION_TRUST_PATH.md),
[`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md),
[`ROOT_KEY_CEREMONY_PROCEDURE.md`](ROOT_KEY_CEREMONY_PROCEDURE.md),
[`ROOT_KEY_CEREMONY_RUNBOOK.md`](ROOT_KEY_CEREMONY_RUNBOOK.md) and the M2.1 siblings listed at the
bottom of this file.

## 1. The 2-of-3 model

The BANZA root is not a single key on a single machine. It is a **threshold** of three independent
root keys, each held by a different custodian on a different offline computer.

- **Three custodians, one root key each.** Custodian A holds only `root_key_A`; Custodian B holds only
  `root_key_B`; Custodian C holds only `root_key_C`.
- **Two signatures required.** Any root action (see §3) requires **2 of the 3** custodian signatures.
- **No one signs alone.** A single custodian can never produce a valid root action by themselves.
- **Losing one key does not destroy the root.** If any one key is lost, the remaining two still meet
  the threshold and the root continues to function; the lost key is rotated (see
  [`ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md`](ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md)).
- **One compromised key does not compromise the root.** Compromise of a single custodian key is below
  threshold: the attacker still cannot sign a root action. The compromised key is revoked and rotated.

```
        root of trust (2-of-3)
        ┌─────────┬─────────┬─────────┐
        │ Cust. A │ Cust. B │ Cust. C │
        │ root_A  │ root_B  │ root_C  │
        └─────────┴─────────┴─────────┘
   valid root action ⇔ any 2 of {A, B, C} sign
```

The detailed custody rules are in
[`M2_ROOT_CUSTODY_MODEL_2OF3.md`](M2_ROOT_CUSTODY_MODEL_2OF3.md).

## 2. Ceremony phases

The ceremony is a strict, ordered sequence. Every phase runs **offline** on the custodians' own
computers, each prepared per
[`OFFLINE_COMPUTER_PREPARATION_CHECKLIST.md`](OFFLINE_COMPUTER_PREPARATION_CHECKLIST.md).

1. **Offline preparation.** Each custodian independently puts their personal computer into offline
   ceremony mode (Wi-Fi/ethernet/Bluetooth/AirDrop/cloud-sync OFF; browsers, email and messaging apps
   closed). Encrypted disk recommended. No private key ever touches an online environment.
2. **Key generation.** Each custodian generates their own ed25519 root keypair **on their own offline
   machine**. Custodian A generates `root_key_A`, B generates `root_key_B`, C generates `root_key_C`.
   No custodian ever sees another custodian's private key.
3. **Public-key exchange.** Each custodian exports **only the public half** and its fingerprint. The
   three public keys and fingerprints are exchanged and cross-checked out-of-band. Only public material
   leaves any offline machine.
4. **Root-metadata signing (2 of 3).** The three public keys are assembled into the root metadata
   (root set, threshold = 2, validity bounds). **Two of the three** custodians sign the root metadata
   with their respective root keys. The two signatures are collected; the third custodian is not
   required for a valid root action.
5. **Evidence log.** The ceremony is recorded in a publishable evidence log using
   [`ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md`](ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md): custodians
   present, public keys, fingerprints, signatures, hashes, recovery-test result, witnesses — **no
   secrets**.
6. **Recovery test.** Each custodian performs the offline recovery test per
   [`ROOT_KEY_RECOVERY_TEST_RUNBOOK.md`](ROOT_KEY_RECOVERY_TEST_RUNBOOK.md), restoring from encrypted
   backup on an offline machine and confirming the public key/fingerprint matches — then securely
   wiping the test artifacts.

A missing or failed phase does not yield a partial root; it yields a **blocked** state (see §5).

## 3. Root scope — what the root signs and never signs

The root's authority is deliberately narrow. The root signs **protocol trust metadata** and nothing
that touches money or operators.

| The root **signs** | The root **never** signs |
|---|---|
| Root metadata (the root set + threshold + validity) | Payments or transactions |
| Delegations (release-signing / BRL-signing / artifact-signing keys) | Operator authorisations |
| Rotation of a root or delegated key | Licences of any kind |
| Revocation of a root or delegated key | Fund movements or settlements |
| Trust policy (threshold, validity bounds, delegation rules) | Financial services of any kind |

Delegation and rotation/revocation mechanics are in
[`ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md`](ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md). The root
establishes **trust of the open protocol** only. Autorização regulatória e serviços financeiros reais
pertencem aos operadores autorizados, que são entidades separadas que implementam o protocolo.

## 4. Published vs forbidden

| PUBLISHABLE (no secrets) | FORBIDDEN to publish |
|---|---|
| Public keys, key IDs, fingerprints | Private keys (`root_key_A/B/C`) |
| Root metadata, threshold policy | Seeds, mnemonics, passphrases |
| Signatures, ceremony evidence hash | Encrypted private-key backups, USB images |
| Custody / backup / recovery declarations without secrets | Recovery material, raw entropy |
| | Secret logs, screenshots with secrets |
| | Any material that lets someone sign as a custodian |

The evidence log (file 7) is designed so **every** entry is publishable.

## 5. Rust-computed status

Ceremony status is computed **in Rust** by
`engines/banza-root-ceremony :: validate_root_ceremony`, **never** in TypeScript. States:

| State | Meaning |
|---|---|
| `M2_ROOT_CEREMONY_VALID` | 3 custodians, 2-of-3 signatures present, custody/backup/recovery evidence complete, scope + regulatory boundary intact |
| `M2_ROOT_CEREMONY_INCOMPLETE` | A required phase or evidence field is missing |
| `M2_ROOT_CEREMONY_BLOCKED_BY_THRESHOLD` | Fewer than 2 valid custodian signatures |
| `M2_ROOT_CEREMONY_BLOCKED_BY_CUSTODY_GAP` | Custody model violated (e.g. one device holds >1 root key) |
| `M2_ROOT_CEREMONY_BLOCKED_BY_BACKUP_GAP` | Encrypted USB backup evidence missing |
| `M2_ROOT_CEREMONY_BLOCKED_BY_OFFLINE_EVIDENCE_GAP` | Offline-preparation evidence missing |
| `M2_ROOT_CEREMONY_BLOCKED_BY_RECOVERY_TEST_GAP` | Recovery test not performed/recorded |
| `M2_ROOT_CEREMONY_INVALID_FORBIDDEN_PRIVATE_KEY_MATERIAL` | Any private key / seed / passphrase detected in an artifact |
| `M2_ROOT_CEREMONY_INVALID_SCOPE` | Root claims to sign payments/operators/licences/funds |
| `M2_ROOT_CEREMONY_INVALID_SIGNATURE` | A signature fails verification |
| `M2_ROOT_CEREMONY_INVALID_REGULATORY_BOUNDARY` | Doc contradicts the open-protocol / operator-separation boundary |

## 6. Non-claims

- No real root key exists in this repository, CI, the website, the server or the Workbench.
- All fixtures/examples are **TEST ONLY — NOT PRODUCTION — NO REAL PRIVATE KEYS**.
- Publishing this document does not create an operator, activate federation, emit a licence, move
  funds, or make BANZA a PSP. BANZA permanece protocolo financeiro aberto.

See: [`M2_ROOT_CUSTODY_MODEL_2OF3.md`](M2_ROOT_CUSTODY_MODEL_2OF3.md),
[`OFFLINE_COMPUTER_PREPARATION_CHECKLIST.md`](OFFLINE_COMPUTER_PREPARATION_CHECKLIST.md),
[`ENCRYPTED_USB_BACKUP_POLICY.md`](ENCRYPTED_USB_BACKUP_POLICY.md),
[`ROOT_KEY_RECOVERY_TEST_RUNBOOK.md`](ROOT_KEY_RECOVERY_TEST_RUNBOOK.md),
[`ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md`](ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md),
[`ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md`](ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md),
[`PRODUCTION_TRUST_PATH.md`](PRODUCTION_TRUST_PATH.md),
[`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md).
