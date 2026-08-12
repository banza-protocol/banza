# BANZA — Encrypted USB Backup Policy (M2.1)

> **A raiz M2 do BANZA estabelece confiança do protocolo financeiro aberto BANZA. Ela não autoriza serviços de pagamento, não cria operador, não emite licença, não processa transacções, não liquida valores, não movimenta fundos e não substitui autorização regulatória dos operadores que implementam o protocolo.**
>
> **BANZA é um protocolo financeiro aberto. PSPs, bancos ou operadores autorizados são entidades separadas que podem implementar o protocolo para prestar serviços financeiros reais.**

This policy governs how each custodian backs up their **single** root private key in the 2-of-3
ceremony ([`M2_ROOT_TRUST_CEREMONY_2OF3.md`](M2_ROOT_TRUST_CEREMONY_2OF3.md)). The backup exists so that
losing a laptop does not lose a custodian's key — while keeping the "no device holds more than one root
key" invariant intact. BANZA permanece protocolo financeiro aberto; operadores autorizados são entidades
separadas que implementam o protocolo.

## 1. One USB per custodian

- **Custodian A** has USB A, holding **only** an encrypted backup of `root_key_A`.
- **Custodian B** has USB B, holding **only** an encrypted backup of `root_key_B`.
- **Custodian C** has USB C, holding **only** an encrypted backup of `root_key_C`.
- **No USB holds more than one root key.** There is no combined backup medium anywhere. This mirrors the
  custody invariant in [`M2_ROOT_CUSTODY_MODEL_2OF3.md`](M2_ROOT_CUSTODY_MODEL_2OF3.md) (§2).

## 2. Encryption is mandatory

- The root private key on the USB is **always encrypted at rest** (e.g. GPG / AES-256, or a full-disk
  encrypted USB volume). A plaintext private key on a USB is a policy violation.
- **The passphrase is kept OFF the USB.** The decryption passphrase is never written to the same USB
  that holds the encrypted key. It is memorised and/or written on paper stored in a separate physical
  location from the USB (separation of the key medium from the unlock secret).
- A USB with no encryption, or with the passphrase on it, resolves to
  `M2_ROOT_CEREMONY_BLOCKED_BY_BACKUP_GAP` in `engines/banza-root-ceremony :: validate_root_ceremony`
  (never TypeScript).

## 3. Offline use only

- The USB is **used offline only** — plugged into a machine already in offline ceremony mode per
  [`OFFLINE_COMPUTER_PREPARATION_CHECKLIST.md`](OFFLINE_COMPUTER_PREPARATION_CHECKLIST.md).
- **The USB is never plugged into a server, CI runner, or any online machine.** Not the website
  container, not the BanzAI API, not the reverse proxy, not the Workbench, not a build agent, not a
  personal machine that is online.
- The USB is not mounted by any cloud-sync process and its contents are never copied to a synced folder.

## 4. Recovery test is mandatory

- Each custodian must **test recovery** from their encrypted USB backup at least once during the
  ceremony and periodically thereafter, following
  [`ROOT_KEY_RECOVERY_TEST_RUNBOOK.md`](ROOT_KEY_RECOVERY_TEST_RUNBOOK.md).
- A backup that has never been recovery-tested is treated as unproven. A missing recovery-test result
  resolves to `M2_ROOT_CEREMONY_BLOCKED_BY_RECOVERY_TEST_GAP`.

## 5. Storage and handling

- Store each USB in a secure physical location (safe / lockbox) separate from the passphrase.
- Label the USB with a **non-secret** identifier only (e.g. `BANZA-ROOT-BACKUP-A`) — never a fingerprint
  of the passphrase, never any secret.
- Consider a second, identically-encrypted copy of the **same single** key for durability (still one
  key per medium; still passphrase off the medium). Two copies of `root_key_A` are fine; a medium mixing
  `root_key_A` and `root_key_B` is forbidden.

## 6. Loss and compromise

- **USB lost, key still on the offline laptop:** the key survives; rotate on next scheduled rotation or
  sooner if policy requires.
- **USB lost or stolen (encrypted, passphrase not on it):** the encryption protects the key; treat with
  caution and rotate the affected root key per
  [`ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md`](ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md). Because
  this is 2-of-3, one affected key does not compromise the root.
- **Passphrase and USB lost together:** treat as potential compromise; revoke and rotate that root key.

## 7. Published vs forbidden

| PUBLISHABLE (no secrets) | FORBIDDEN to publish |
|---|---|
| The **fact** that an encrypted USB backup exists and was recovery-tested | The encrypted private-key backup file itself |
| Non-secret USB label, public key, fingerprint | A **USB image** / disk image of the backup |
| Threshold policy, backup/recovery declarations without secrets | Private keys, seeds, mnemonics, passphrases |
| Ceremony evidence hash | Raw entropy, recovery material, secret logs, screenshots with secrets, any material that lets someone sign as a custodian |

## 8. Non-claims

- No real root key or backup exists in this repository, CI, the website, the server or the Workbench.
- Examples are **TEST ONLY — NOT PRODUCTION — NO REAL PRIVATE KEYS**.
- This policy does not create an operator, issue a licence, activate federation or move funds. BANZA
  permanece protocolo financeiro aberto.

See: [`M2_ROOT_TRUST_CEREMONY_2OF3.md`](M2_ROOT_TRUST_CEREMONY_2OF3.md),
[`M2_ROOT_CUSTODY_MODEL_2OF3.md`](M2_ROOT_CUSTODY_MODEL_2OF3.md),
[`OFFLINE_COMPUTER_PREPARATION_CHECKLIST.md`](OFFLINE_COMPUTER_PREPARATION_CHECKLIST.md),
[`ROOT_KEY_RECOVERY_TEST_RUNBOOK.md`](ROOT_KEY_RECOVERY_TEST_RUNBOOK.md),
[`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md).
