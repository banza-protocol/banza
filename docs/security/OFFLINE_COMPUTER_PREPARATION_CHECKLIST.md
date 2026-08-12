# BANZA — Offline Computer Preparation Checklist (M2.1)

> **A raiz M2 do BANZA estabelece confiança do protocolo financeiro aberto BANZA. Ela não autoriza serviços de pagamento, não cria operador, não emite licença, não processa transacções, não liquida valores, não movimenta fundos e não substitui autorização regulatória dos operadores que implementam o protocolo.**
>
> **BANZA é um protocolo financeiro aberto. PSPs, bancos ou operadores autorizados são entidades separadas que podem implementar o protocolo para prestar serviços financeiros reais.**

Each custodian in the 2-of-3 ceremony ([`M2_ROOT_TRUST_CEREMONY_2OF3.md`](M2_ROOT_TRUST_CEREMONY_2OF3.md))
runs this checklist **independently, on their own personal computer**, before generating or touching any
root key. The goal is a verifiable **offline ceremony mode**: no private key ever touches an online
environment. BANZA permanece protocolo financeiro aberto; operadores autorizados são entidades separadas
que implementam o protocolo.

Print this checklist. Tick each item. A Witness (if present) initials the verification block.

## A. Disconnect all networking

1. Turn **Wi-Fi OFF** (disable the radio, not just "forget network").
2. Unplug the **ethernet** cable; disable the wired interface in the OS.
3. Turn **Bluetooth OFF**.
4. Turn **AirDrop / nearby-sharing OFF**.
5. Disable any **mobile hotspot / tethering / cellular modem**.
6. If the hardware supports it, **physically disable the network interface** (hardware switch, or the
   ceremony machine has the Wi-Fi card removed). Physical disablement is preferred over software toggles.

## B. Stop all sync and communication software

7. Close all **browsers** (every window and background process).
8. Close **email** clients.
9. Close **messaging apps**: WhatsApp, Telegram, Signal, Slack, iMessage, etc.
10. Quit **cloud sync** clients: Dropbox, iCloud (Drive/Desktop/Documents sync), OneDrive, Google Drive,
    Box, and any backup daemon.
11. Pause or disable **OS-level cloud backup** (e.g. iCloud backup, system backup to a network target).
12. Close **note/password managers that sync online** (a purely-offline vault is acceptable; anything
    that syncs to a cloud is not).
13. Quit any **remote-access / screen-sharing** software (SSH servers, VNC, TeamViewer, remote desktop).

## C. Harden the local environment

14. **Encrypted disk recommended.** Confirm full-disk encryption is enabled (FileVault / LUKS /
    BitLocker). A custodian machine without disk encryption is discouraged.
15. Disable automatic OS updates and telemetry for the duration of the ceremony.
16. Close screen-recording, screenshot-to-cloud, and clipboard-sync utilities.
17. Ensure **no private key material** will be written to any cloud-synced folder — work only in a local,
    non-synced directory.

## D. Verify offline before touching a key

18. Confirm networking is truly off: attempt to reach any host and confirm it **fails** (no route /
    no DNS). Record the result in the evidence log.
19. Confirm **zero** active network interfaces are up (list interfaces; all should be down/disabled).
20. Confirm no sync client is running (check running processes for the apps in §B).
21. Only **after** items 1–20 pass, proceed to key generation / signing / recovery on this machine.

## E. Golden rule

> **No private key ever touches an online environment.** Keys are generated, stored, backed up, and
> used for signing **only** on a machine in offline ceremony mode. Only **public** keys, fingerprints,
> signatures and hashes ever leave the offline machine — and only after this checklist has passed.

If at any point networking is accidentally re-enabled while a private key is unlocked on disk, treat the
key as potentially exposed: stop, and follow the compromise path in
[`ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md`](ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md).

## F. Verification block (record in the evidence log)

- Custodian: `<A | B | C>` · Machine offline verified: `<yes>` · Disk encryption: `<on | off>`
- Sync clients closed: `<yes>` · Network reachability test failed as expected: `<yes>`
- Witness initials (if present): `<____>`

These fields are **publishable** (they contain no secrets) and feed
[`ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md`](ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md). Missing offline
evidence resolves to `M2_ROOT_CEREMONY_BLOCKED_BY_OFFLINE_EVIDENCE_GAP` in
`engines/banza-root-ceremony :: validate_root_ceremony` (never TypeScript).

## G. Published vs forbidden

| PUBLISHABLE (no secrets) | FORBIDDEN to publish |
|---|---|
| The fact that offline mode was verified; disk-encryption on/off flag | Private keys, seeds, mnemonics, passphrases |
| Public keys, fingerprints, signatures, evidence hash | Encrypted private-key backups, USB images, raw entropy |
| Threshold policy, custody/backup/recovery declarations without secrets | Recovery material, secret logs, screenshots with secrets, any material that lets someone sign as a custodian |

## H. Non-claims

- No real key exists in this repository, CI, the website, the server or the Workbench.
- Any example values are **TEST ONLY — NOT PRODUCTION — NO REAL PRIVATE KEYS**.
- Running this checklist does not create an operator, issue a licence, activate federation or move
  funds. BANZA permanece protocolo financeiro aberto.

See: [`M2_ROOT_TRUST_CEREMONY_2OF3.md`](M2_ROOT_TRUST_CEREMONY_2OF3.md),
[`M2_ROOT_CUSTODY_MODEL_2OF3.md`](M2_ROOT_CUSTODY_MODEL_2OF3.md),
[`ENCRYPTED_USB_BACKUP_POLICY.md`](ENCRYPTED_USB_BACKUP_POLICY.md),
[`ROOT_KEY_RECOVERY_TEST_RUNBOOK.md`](ROOT_KEY_RECOVERY_TEST_RUNBOOK.md),
[`ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md`](ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md).
