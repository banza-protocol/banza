# BANZA Root Key Ceremony — Day-of Checklist

**Document ID:** BANZA-ROOT-KEY-CEREMONY-CHECKLIST-001  
**Authority:** ROOT_KEY_CEREMONY_PROCEDURE.md  
**Use:** Print one copy. Officer marks each item. Witness initials each section.

---

## Instructions

This checklist is a companion to `ROOT_KEY_CEREMONY_PROCEDURE.md`. It does not replace the procedure — it tracks execution. For the steps that require exact commands, follow the Procedure document.

Mark each checkbox as completed. If a step cannot be completed, write the reason in the margin and consult the failure procedures in the Procedure document §Part VI.

**Print this document. Fill it in by hand. Sign it at the end. Keep the signed original in the Ceremony Record package.**

---

## PRE-CEREMONY (Day Before)

**Officer name:** ___________________________________  
**Witness name:** ___________________________________  
**Scheduled ceremony date:** ___________________________________

### Software Preparation

- [ ] Python 3.9+ confirmed installed on ceremony machine (or on Ceremony USB virtualenv)
- [ ] `cryptography >= 41.0.0` installed and verified
- [ ] `trust_root.py` copied to Ceremony USB
- [ ] `ceremony_script.py` copied to Ceremony USB (if using wrapper)
- [ ] Software hashes recorded:

| File | SHA-256 |
|------|---------|
| `trust_root.py` | ________________________________ |
| `ceremony_script.py` | ________________________________ |
| cryptography version | ________________________________ |

### Hardware Preparation

- [ ] Ceremony machine: network interface physically disabled or removed
- [ ] Output USB A: formatted clean, verified empty. Label: `BANZA_KEYS_A`
- [ ] Output USB B: formatted clean, verified empty. Label: `BANZA_KEYS_B`
- [ ] Publication USB: formatted clean, verified empty. Label: `BANZA_PUB`
- [ ] Ceremony USB: loaded with software, hashes recorded above
- [ ] Offline printer: confirmed functional
- [ ] Camera/recorder: confirmed functional

### Location Preparation

- [ ] Ceremony room secured: lockable door, no external window access
- [ ] Network access physically removed from room (cable unplugged, router off)
- [ ] Ceremony Record Template printed (1 copy)
- [ ] This checklist printed (1 copy)

---

## DAY-OF CEREMONY

**Actual ceremony date (UTC):** ___________________________________  
**Ceremony start time (UTC):** ___________________________________

---

### PHASE 0 — Opening (5 min)

- [ ] All participants present and accounted for
- [ ] Identity verified — Officer: _________________ (document type + number)
- [ ] Identity verified — Witness: _________________ (document type + number)
- [ ] Mobile devices collected / placed in airplane mode
- [ ] Room door locked
- [ ] Camera recording started (if using video): Y / N
- [ ] **Witness initials:** _______

---

### PHASE 1 — Environment Audit (5 min)

- [ ] No network cable connected to ceremony machine: confirmed
- [ ] WiFi disabled (hardware): confirmed
- [ ] No unauthorized devices present: confirmed
- [ ] Ceremony USB mounted
- [ ] Software hashes verified against pre-ceremony record: PASS / FAIL

  Verified trust_root.py hash: ___________________________________
  Matches pre-ceremony record: Y / N

- [ ] System clock checked: _____________________________________ (UTC)
- [ ] **Witness initials:** _______

---

### PHASE 2 — Key ID Determination (2 min)

Record the key IDs as printed by Step 2.1:

| Variable | Value |
|----------|-------|
| CEREMONY_DATE | ________________________________ |
| ROOT_KEY_ID | ________________________________ |
| CERT_KEY_ID | ________________________________ |
| BRL_KEY_ID | ________________________________ |
| EVID_KEY_ID | ________________________________ |

- [ ] Officer read all 5 values aloud
- [ ] No key ID begins with `test-`: confirmed
- [ ] **Witness initials:** _______

---

### PHASE 3 — Root Keypair Generation (5 min)

- [ ] Root keypair generated (Step 2.2)
- [ ] ROOT PUBLIC KEY recorded: `ed25519:` ___________________________________
- [ ] ROOT FINGERPRINT recorded (first 16 hex): ___________________________________
- [ ] **Witness initials:** _______

---

### PHASE 4 — Issuing Keypair Generation (5 min)

**Protocol-Metadata Signing Key (Step 2.3)**
- [ ] Generated
- [ ] METADATA FINGERPRINT: ___________________________________

**BRL-Issuing Key (Step 2.4)**
- [ ] Generated
- [ ] BRL FINGERPRINT: ___________________________________

**Conformance-Issuing Key (Step 2.5)**
- [ ] Generated
- [ ] EVIDENCE FINGERPRINT: ___________________________________

- [ ] **Witness initials:** _______

---

### PHASE 5 — Key Manifest Construction (10 min)

- [ ] Key Manifest body constructed with correct key IDs and public keys
- [ ] Root key validity set to 24 months: expires_at = ___________________________________
- [ ] Issuing key validity set to ≤ 6 months: expires_at = ___________________________________
- [ ] Key Manifest signed with root key (Step 3.1)
- [ ] KEY MANIFEST SHA-256: ___________________________________
- [ ] **Manifest signature verification: PASS / FAIL** (Step 3.2)
- [ ] **Witness initials:** _______

---

### PHASE 6 — Initial BRL Construction (5 min)

- [ ] Initial BRL constructed with 0 revoked operators (Step 3.3)
- [ ] BRL issuer_key_id matches BRL_KEY_ID above: Y / N
- [ ] BRL signed with BRL-issuing key
- [ ] INITIAL BRL SHA-256: ___________________________________
- [ ] **Witness initials:** _______

---

### PHASE 7 — Key Material Storage (15 min)

**Output USB A**
- [ ] Private keys written to `/ceremony/private/` (4 files)
- [ ] Public keys written to `/ceremony/public/` (4 files)
- [ ] Key Manifest written (`key-manifest.json`)
- [ ] Initial BRL written (`initial-brl.json`)
- [ ] File hashes verified against in-memory values: PASS / FAIL
  - key-manifest.json: matches MANIFEST_HASH: Y / N
  - initial-brl.json: matches BRL_HASH: Y / N
- [ ] Private keys encrypted with GPG/AES-256
- [ ] Unencrypted private key directory removed from USB
- [ ] **Witness initials:** _______

**Output USB B**
- [ ] All public files cloned from USB A
- [ ] Encrypted private key archive cloned from USB A
- [ ] Hashes verified to match USB A: PASS / FAIL
- [ ] **Witness initials:** _______

**Paper Backup**
- [ ] Paper backup page printed
- [ ] All 4 fingerprints visible on printed page
- [ ] KEY MANIFEST SHA-256 visible on printed page
- [ ] "PRIVATE KEY ENCRYPTION PASSPHRASE: [STORED SEPARATELY]" visible on printed page
- [ ] Officer signature on paper backup: ___________________________________
- [ ] Witness signature on paper backup: ___________________________________
- [ ] **Witness initials:** _______

---

### PHASE 8 — Public Artifact Preparation (5 min)

- [ ] key-manifest.json written to Publication USB
- [ ] initial-brl.json written to Publication USB
- [ ] ceremony-record.json written to Publication USB
- [ ] Publication USB contents verified: NO private key files present
  - Grep check result: 0 files containing "private" found: Y / N
- [ ] **Witness initials:** _______

---

### PHASE 9 — Final Verification (10 min)

- [ ] Disk manifest re-loaded and signature re-verified: PASS / FAIL
- [ ] Disk BRL re-loaded and signature re-verified: PASS / FAIL
- [ ] Key ID format check (no `test-` prefix): PASS × 4 / FAIL
- [ ] Issuing key validity ≤ 6 months: PASS × 3 / FAIL
- [ ] **ALL VERIFICATIONS PASS: Y / N**

If any FAIL: stop here and follow failure procedure (Procedure §Part VI).

- [ ] **Witness initials:** _______

---

### PHASE 10 — Ceremony Close (10 min)

- [ ] Python memory zeroing executed (Step 7.1)
- [ ] Python exited
- [ ] Ceremony machine wiped / powered off
- [ ] **Output USB A → Secure storage location:** ___________________________________
- [ ] **Output USB B → Secure storage location:** ___________________________________
- [ ] Publication USB → Sealed envelope, labeled, in Officer's custody
- [ ] Ceremony USB → Wiped / returned to general use
- [ ] Ceremony Record Template filled in and signed
- [ ] This checklist signed
- [ ] **Ceremony close time (UTC):** ___________________________________

---

## CLOSE DECLARATION

**I, the Ceremony Officer, declare that the BANZA Root Key Ceremony was executed in accordance with ROOT_KEY_CEREMONY_PROCEDURE.md. All steps above have been completed and verified. Key material has been secured.**

Officer signature: ___________________________________ Date: _______________

**I, the Ceremony Witness, declare that I observed the ceremony execution. All steps were completed as marked. The Ceremony Officer performed all operations and I did not handle the ceremony machine or any private key material.**

Witness signature: ___________________________________ Date: _______________

---

## POST-CEREMONY ACTIONS

These are completed after the ceremony room is cleared.

- [ ] **P.1** Fresh BRL signed for publication (OPS-004)
- [ ] **P.2** Key Manifest published at `banza.network/.well-known/banza/key-manifest.json`
- [ ] **P.3** Key Manifest endpoint verified (correct schema_version, root_key_id, signature present)
- [ ] **P.4** Initial BRL published at `banza.network/federation/revocation-list.json`
- [ ] **P.5** BRL endpoint verified (correct issuer, 0 revoked operators)
- [ ] **P.6** INV-ROOT-001 enforced in conformance runner (OPS-006)
- [ ] **P.7** BANZA SDK v1.0 released with pinned Key Manifest (OPS-005)
- [ ] **Milestone M2** (Production Trust Established) recorded as complete

Post-ceremony completion date: ___________________________________  
Officer signature: ___________________________________

---

*This checklist is part of the BANZA Root Key Ceremony Record package. Retain indefinitely.*
