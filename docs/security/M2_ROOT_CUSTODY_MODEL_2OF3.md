# BANZA — Root Custody Model 2-of-3 (M2.1)

> **A raiz M2 do BANZA estabelece confiança do protocolo financeiro aberto BANZA. Ela não autoriza serviços de pagamento, não cria operador, não emite licença, não processa transacções, não liquida valores, não movimenta fundos e não substitui autorização regulatória dos operadores que implementam o protocolo.**
>
> **BANZA é um protocolo financeiro aberto. PSPs, bancos ou operadores autorizados são entidades separadas que podem implementar o protocolo para prestar serviços financeiros reais.**

This document defines the **custody model** behind the 2-of-3 root ceremony
([`M2_ROOT_TRUST_CEREMONY_2OF3.md`](M2_ROOT_TRUST_CEREMONY_2OF3.md)). It fixes **who holds what**, the
separation of duties, and the invariant that no single person or device concentrates the root. BANZA
permanece protocolo financeiro aberto; operadores autorizados são entidades separadas que implementam
o protocolo.

## 1. Custody map

```
Custodian A ──holds──▶ root_key_A   (and nothing else)
Custodian B ──holds──▶ root_key_B   (and nothing else)
Custodian C ──holds──▶ root_key_C   (and nothing else)

threshold = 2 of 3
```

- **A ↔ `root_key_A`.** Custodian A holds `root_key_A` only. A never holds `root_key_B` or `root_key_C`.
- **B ↔ `root_key_B`.** Custodian B holds `root_key_B` only. B never holds `root_key_A` or `root_key_C`.
- **C ↔ `root_key_C`.** Custodian C holds `root_key_C` only. C never holds `root_key_A` or `root_key_B`.

Each custodian generates their own keypair on their own offline computer during the ceremony. No
custodian ever transmits, exports, or reveals their **private** key to anyone. Only public keys and
fingerprints are exchanged.

## 2. Core custody invariants

1. **No custodian holds another custodian's key.** Private key material is strictly one-per-custodian.
2. **No device holds more than one root private key.** Each custodian's offline computer and each
   encrypted USB (see [`ENCRYPTED_USB_BACKUP_POLICY.md`](ENCRYPTED_USB_BACKUP_POLICY.md)) holds **at
   most one** root private key. There is no machine, backup, or medium anywhere that concentrates two
   or three root keys.
3. **Threshold ≥ 2.** No root action is valid with fewer than two custodian signatures.
4. **Losing one key does not destroy the root.** Two surviving keys still meet threshold; the lost key
   is rotated.
5. **Compromising one key does not compromise the root.** One key is below threshold; the compromised
   key is revoked and rotated
   ([`ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md`](ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md)).

Violating invariant 1 or 2 resolves to `M2_ROOT_CEREMONY_BLOCKED_BY_CUSTODY_GAP` in the Rust validator
`engines/banza-root-ceremony :: validate_root_ceremony` (never TypeScript).

## 3. Roles and responsibilities

| Role | Holds | Responsibilities | Never does |
|---|---|---|---|
| **Custodian A** | `root_key_A` (private, offline) | Generate `root_key_A`; export public half + fingerprint; sign root metadata when part of the 2-of-3; keep the encrypted USB and passphrase separated; run the recovery test | Hold another custodian's key; put a key online; sign alone as "the root" |
| **Custodian B** | `root_key_B` (private, offline) | Same responsibilities as A, for `root_key_B` | Same prohibitions as A |
| **Custodian C** | `root_key_C` (private, offline) | Same responsibilities as A, for `root_key_C` | Same prohibitions as A |
| **Witness** (optional per action) | Nothing | Observe that offline conditions held, that only public material was exchanged, and initial the evidence log | Touch any private key material |

The three custodians are **independent** — ideally different people, different locations, different
offline machines. Independence is what makes "2-of-3" meaningful: a single failure (person, device,
site) cannot forge or destroy the root.

## 4. Separation of duties

- **Generation is distributed.** No single participant generates all three keys. Each key is generated
  by its own custodian on their own machine.
- **Signing requires collaboration.** Any root action needs two custodians to act; no custodian can
  unilaterally sign root metadata, a delegation, a rotation, or a revocation.
- **Custody is separated from serving.** No root key ever lives on serving infrastructure — not the
  website container, not the BanzAI API, not CI, not the reverse proxy, not the Workbench. Serving
  infrastructure holds **public artifacts only** (consistent with ADR-028 and
  [`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md)).
- **Passphrase separated from media.** The USB encryption passphrase is stored **off** the USB (see
  [`ENCRYPTED_USB_BACKUP_POLICY.md`](ENCRYPTED_USB_BACKUP_POLICY.md)).

## 5. Root scope reminder

Custodians, acting 2-of-3, sign **only** root metadata, delegations, rotation, revocation and trust
policy. They do **not** sign payments, do **not** authorise operators, do **not** issue licences and
do **not** move funds. Serviços financeiros reais e autorização regulatória pertencem aos operadores
autorizados, que são entidades separadas que implementam o protocolo. See §3 of
[`M2_ROOT_TRUST_CEREMONY_2OF3.md`](M2_ROOT_TRUST_CEREMONY_2OF3.md).

## 6. Published vs forbidden

| PUBLISHABLE (no secrets) | FORBIDDEN to publish |
|---|---|
| Public keys, key IDs, fingerprints of A/B/C | Private keys `root_key_A/B/C` |
| Root metadata, threshold policy (2-of-3) | Seeds, mnemonics, passphrases |
| Signatures, ceremony evidence hash | Encrypted private-key backups, USB images |
| Custody declarations (who holds which public key) without secrets | Recovery material, raw entropy, secret logs |
| | Screenshots with secrets; any material that lets someone sign as a custodian |

## 7. Non-claims

- No real `root_key_A/B/C` exists in this repository, CI, the website, the server or the Workbench.
- Examples are **TEST ONLY — NOT PRODUCTION — NO REAL PRIVATE KEYS**.
- This custody model does not create an operator, issue a licence, activate federation, or move funds.
  BANZA permanece protocolo financeiro aberto.

See: [`M2_ROOT_TRUST_CEREMONY_2OF3.md`](M2_ROOT_TRUST_CEREMONY_2OF3.md),
[`OFFLINE_COMPUTER_PREPARATION_CHECKLIST.md`](OFFLINE_COMPUTER_PREPARATION_CHECKLIST.md),
[`ENCRYPTED_USB_BACKUP_POLICY.md`](ENCRYPTED_USB_BACKUP_POLICY.md),
[`ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md`](ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md),
[`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md).
