# BANZA — Root Key Recovery Test Runbook (M2.1)

> **TEST ONLY — NOT PRODUCTION — NO REAL PRIVATE KEYS**
>
> **A raiz M2 do BANZA estabelece confiança do protocolo financeiro aberto BANZA. Ela não autoriza serviços de pagamento, não cria operador, não emite licença, não processa transacções, não liquida valores, não movimenta fundos e não substitui autorização regulatória dos operadores que implementam o protocolo.**
>
> **BANZA é um protocolo financeiro aberto. PSPs, bancos ou operadores autorizados são entidades separadas que podem implementar o protocolo para prestar serviços financeiros reais.**

This runbook lets each custodian prove that their encrypted USB backup
([`ENCRYPTED_USB_BACKUP_POLICY.md`](ENCRYPTED_USB_BACKUP_POLICY.md)) can actually be restored — **without
ever exposing a real key in an unsafe way**. The whole procedure runs **offline**. Where this document
shows values, they are **TEST ONLY** placeholders and contain **no real key material**. BANZA permanece
protocolo financeiro aberto; operadores autorizados são entidades separadas que implementam o protocolo.

## 0. Scope of a recovery test

A recovery test confirms three things and nothing more:

1. The encrypted backup **decrypts** with the separately-stored passphrase.
2. The restored key's **public key / fingerprint matches** the recorded value.
3. The restored key can **sign a TEST-ONLY document**, and that signature **verifies**.

It never signs real root metadata, never authorises an operator, never issues a licence, never moves
funds. The recovery test proves custody, not authority.

## 1. Prepare the offline machine

1. Put the machine into offline ceremony mode per
   [`OFFLINE_COMPUTER_PREPARATION_CHECKLIST.md`](OFFLINE_COMPUTER_PREPARATION_CHECKLIST.md). Verify
   networking is truly off (§D of that checklist).
2. Confirm no cloud-sync process is running and the working directory is **not** cloud-synced.

## 2. Restore from encrypted backup

3. Plug the custodian's **own** encrypted USB (USB A for Custodian A, etc.) into the offline machine.
   Never plug a USB into a server, CI, or online machine.
4. Decrypt the encrypted backup into a **local, non-synced** directory using the passphrase retrieved
   from its separate storage location.
5. The restored artifact is the custodian's single root key (e.g. `root_key_A`). No other custodian's
   key is present; no medium here holds more than one root key.

## 3. Verify the public key / fingerprint

6. Derive the **public key** from the restored key and compute its **fingerprint**.
7. Compare the fingerprint against the value recorded in
   [`ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md`](ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md) for this custodian.
   It **must match**. A mismatch means the wrong backup or a corrupted backup — stop and investigate;
   do not proceed.

## 4. Re-sign a TEST-ONLY document

8. Create a **TEST-ONLY** document, e.g.:

   ```json
   {
     "test_only": true,
     "not_production": true,
     "no_real_private_keys": true,
     "purpose": "recovery-test",
     "custodian": "A",
     "nonce": "TEST-ONLY-<random-non-secret>",
     "note": "TEST ONLY — NOT PRODUCTION — NO REAL PRIVATE KEYS"
   }
   ```

   This document is **not** root metadata, **not** a delegation, **not** a payment, **not** an operator
   authorisation. It exists only to exercise the restored key.
9. Sign the TEST-ONLY document with the restored key.

## 5. Confirm the signature

10. Verify the signature against the restored **public** key. It **must** verify (PASS).
11. Record only the **PASS/FAIL result**, the public key, the fingerprint, and the TEST-ONLY document
    hash in the evidence log. Record **no** secret.

## 6. Securely wipe

12. Securely delete the restored **private** key and the decrypted directory from the offline machine
    (secure-erase, then remove). The private key must persist **only** on its original offline machine
    and its encrypted USB — never as a leftover plaintext copy.
13. Unmount and remove the USB. Return the USB and passphrase to their **separate** secure storage
    locations.
14. Power off / wipe ceremony memory as appropriate.

## 7. Result recorded (publishable)

- Custodian: `<A | B | C>` · Fingerprint match: `<PASS | FAIL>` · TEST-ONLY signature verify:
  `<PASS | FAIL>` · Date: `<YYYY-MM-DD, placeholder>`
- Witness initials (if present): `<____>`

A recorded PASS satisfies the recovery-test requirement; a missing or FAIL result resolves to
`M2_ROOT_CEREMONY_BLOCKED_BY_RECOVERY_TEST_GAP` in
`engines/banza-root-ceremony :: validate_root_ceremony` (never TypeScript). If any TEST-ONLY artifact is
found to contain real private-key material, the validator resolves to
`M2_ROOT_CEREMONY_INVALID_FORBIDDEN_PRIVATE_KEY_MATERIAL`.

## 8. Published vs forbidden

| PUBLISHABLE (no secrets) | FORBIDDEN to publish |
|---|---|
| Recovery-test PASS/FAIL result | Private keys, seeds, mnemonics, passphrases |
| Public key, fingerprint, TEST-ONLY document hash | Encrypted private-key backups, USB images |
| Threshold policy, recovery declaration without secrets | Recovery material, raw entropy, secret logs |
| Ceremony evidence hash | Screenshots with secrets; any material that lets someone sign as a custodian |

## 9. Non-claims

- No real key exists in this repository, CI, the website, the server or the Workbench; the values above
  are **TEST ONLY — NOT PRODUCTION — NO REAL PRIVATE KEYS**.
- A recovery test does not create an operator, issue a licence, activate federation or move funds. BANZA
  permanece protocolo financeiro aberto.

See: [`M2_ROOT_TRUST_CEREMONY_2OF3.md`](M2_ROOT_TRUST_CEREMONY_2OF3.md),
[`ENCRYPTED_USB_BACKUP_POLICY.md`](ENCRYPTED_USB_BACKUP_POLICY.md),
[`OFFLINE_COMPUTER_PREPARATION_CHECKLIST.md`](OFFLINE_COMPUTER_PREPARATION_CHECKLIST.md),
[`ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md`](ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md),
[`ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md`](ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md).
