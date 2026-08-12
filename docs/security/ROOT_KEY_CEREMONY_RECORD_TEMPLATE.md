# BANZA Root Key Ceremony Record

**Document ID:** BANZA-ROOT-KEY-CEREMONY-RECORD-[CEREMONY_DATE]  
**Template version:** 1.0  
**Authority:** ROOT_KEY_CEREMONY_PROCEDURE.md, ADR-038

> Fill in every field during the ceremony. Fields left blank invalidate the record.  
> Print, sign physically, scan, and retain in BANZA governance storage.

---

## Section 1 — Ceremony Identity

| Field | Value |
|-------|-------|
| **Ceremony ID** | `BANZA-ROOT-CEREMONY-` _____________________________________________ |
| **Ceremony type** | ☐ Initial Root Generation  ☐ Issuing Key Rotation  ☐ Compromise Recovery |
| **Ceremony date (UTC)** | _____________________________________________ |
| **Ceremony start time (UTC)** | _____________________________________________ |
| **Ceremony end time (UTC)** | _____________________________________________ |
| **Location** | _____________________________________________ |
| **Ceremony procedure version** | BANZA-ROOT-KEY-CEREMONY-PROCEDURE-001 |

---

## Section 2 — Participants

### Ceremony Officer

| Field | Value |
|-------|-------|
| Full name | _____________________________________________ |
| Role at BANZA | _____________________________________________ |
| Identity document type | _____________________________________________ |
| Identity document number | _____________________________________________ |
| Identity verified by witness | ☐ Yes |

### Ceremony Witness 1

| Field | Value |
|-------|-------|
| Full name | _____________________________________________ |
| Relationship to BANZA | _____________________________________________ |
| Identity document type | _____________________________________________ |
| Identity document number | _____________________________________________ |
| Identity verified by officer | ☐ Yes |

### Ceremony Witness 2 (if present)

| Field | Value |
|-------|-------|
| Full name | _____________________________________________ |
| Relationship to BANZA | _____________________________________________ |
| Identity document type | _____________________________________________ |
| Identity document number | _____________________________________________ |

---

## Section 3 — Environment

| Check | Confirmed by | Result |
|-------|-------------|--------|
| Room physically secured (door locked, covered windows) | Witness | ☐ Pass  ☐ Fail |
| No network cable connected to ceremony machine | Officer + Witness | ☐ Pass  ☐ Fail |
| WiFi disabled (hardware level) | Officer + Witness | ☐ Pass  ☐ Fail |
| No unauthorized electronic devices present | Officer + Witness | ☐ Pass  ☐ Fail |
| Mobile devices in airplane mode / screened | Officer | ☐ Pass  ☐ Fail |
| Video recording active (if used) | Witness | ☐ Yes  ☐ No |

**Notes on environment:** _______________________________________________

---

## Section 4 — Software Verification

| File | SHA-256 (pre-ceremony, on Ceremony USB) | SHA-256 (verified at ceremony start) | Match |
|------|----------------------------------------|--------------------------------------|-------|
| `trust_root.py` | __________________________________ | __________________________________ | ☐ Y ☐ N |
| `ceremony_script.py` | __________________________________ | __________________________________ | ☐ Y ☐ N |

`cryptography` version: _______________________________________________

**System UTC clock at verification:** _______________________________________________

**Software verification result:** ☐ PASS — All hashes match  ☐ FAIL — See notes

---

## Section 5 — Key IDs

Record exactly as printed by the ceremony script.

| Variable | Value |
|----------|-------|
| CEREMONY_DATE | _____________________________________________ |
| ROOT_KEY_ID | _____________________________________________ |
| CERT_KEY_ID | _____________________________________________ |
| BRL_KEY_ID | _____________________________________________ |
| EVID_KEY_ID | _____________________________________________ |

**Key ID format check (no `test-` prefix):** ☐ All PASS

---

## Section 6 — Generated Keys

### 6.1 — BANZA Root Key

| Field | Value |
|-------|-------|
| Key ID | `banza-root-` _____________ |
| Algorithm | ed25519 |
| **Full public key** | `ed25519:` _____________________________________________ |
| **Public key SHA-256 fingerprint (first 16 hex)** | _____________________________________________ |
| Generation timestamp (UTC) | _____________________________________________ |
| Max validity | 24 months |
| Expires at | _____________________________________________ |
| Officer read fingerprint aloud | ☐ Yes |
| Witness confirmed fingerprint recorded | ☐ Yes |

### 6.2 — Protocol-Metadata Signing Key

| Field | Value |
|-------|-------|
| Key ID | `banza-meta-` _____________ |
| Algorithm | ed25519 |
| **Full public key** | `ed25519:` _____________________________________________ |
| **Public key SHA-256 fingerprint (first 16 hex)** | _____________________________________________ |
| Generation timestamp (UTC) | _____________________________________________ |
| Max validity | 6 months |
| Expires at | _____________________________________________ |

### 6.3 — BRL-Issuing Key

| Field | Value |
|-------|-------|
| Key ID | `banza-brl-` _____________ |
| Algorithm | ed25519 |
| **Full public key** | `ed25519:` _____________________________________________ |
| **Public key SHA-256 fingerprint (first 16 hex)** | _____________________________________________ |
| Generation timestamp (UTC) | _____________________________________________ |
| Max validity | 6 months |
| Expires at | _____________________________________________ |

### 6.4 — Conformance-Issuing Key

| Field | Value |
|-------|-------|
| Key ID | `banza-evidence-` _____________ |
| Algorithm | ed25519 |
| **Full public key** | `ed25519:` _____________________________________________ |
| **Public key SHA-256 fingerprint (first 16 hex)** | _____________________________________________ |
| Generation timestamp (UTC) | _____________________________________________ |
| Max validity | 6 months |
| Expires at | _____________________________________________ |

---

## Section 7 — Artifact Hashes

These hashes are the permanent identifiers of the ceremony artifacts. They are published in the `ceremony-record.json` file.

| Artifact | SHA-256 |
|----------|---------|
| **Key Manifest** (`key-manifest.json`) | _____________________________________________ |
| **Initial BRL** (`initial-brl.json`) | _____________________________________________ |
| **Ceremony Public Record** (`ceremony-record.json`) | _____________________________________________ |

---

## Section 8 — Verification Results

| Step | Check | Result | Witness initials |
|------|-------|--------|-----------------|
| 3.2 | Key Manifest signature verified (in-memory) | ☐ PASS  ☐ FAIL | _______ |
| 6.1 | Disk Key Manifest signature re-verified | ☐ PASS  ☐ FAIL | _______ |
| 6.2 | Disk BRL signature re-verified | ☐ PASS  ☐ FAIL | _______ |
| 6.3 | Key ID format check (no `test-` prefix) × 4 | ☐ PASS  ☐ FAIL | _______ |
| 6.4 | Issuing key validity ≤ 6 months × 3 | ☐ PASS  ☐ FAIL | _______ |
| 5.1 | Publication USB contains no private key files | ☐ PASS  ☐ FAIL | _______ |

**Overall verification result:** ☐ ALL PASS — Ceremony is valid  ☐ FAIL — Ceremony is invalid (see notes)

---

## Section 9 — Storage Disposition

### Private Key Material

| Key | Storage media | Physical location | Custodian |
|-----|--------------|------------------|----------|
| Root private key (Output USB A) | USB A (`BANZA_KEYS_A`) | _________________________ | _________________________ |
| Root private key (Output USB B) | USB B (`BANZA_KEYS_B`) | _________________________ | _________________________ |
| Root private key (Paper backup) | Sealed envelope | _________________________ | _________________________ |

**Encryption method for private key archives:** ☐ GPG symmetric (AES-256)  ☐ Other: _____________  
**Passphrase custody:** ☐ Separate document  ☐ Password manager  ☐ Other: _____________  
**Passphrase custodian name:** _____________________________________________

### Public Artifacts

| Artifact | Storage | Status |
|----------|---------|--------|
| `key-manifest.json` | Publication USB → `banza.network/.well-known/banza/key-manifest.json` | ☐ Awaiting publication |
| `initial-brl.json` | Publication USB → `banza.network/federation/revocation-list.json` | ☐ Awaiting publication |
| `ceremony-record.json` | Publication USB → `banza.network/.well-known/banza/ceremony-record.json` | ☐ Awaiting publication |

---

## Section 10 — Post-Ceremony Publication Record

*(Complete after ceremony room is cleared — before closing this record)*

| Publication step | Completed by | Date (UTC) | Endpoint verified |
|-----------------|-------------|-----------|-----------------|
| Key Manifest published | _________________________ | _____________ | ☐ Yes |
| Initial BRL published (re-signed, 6h expiry) | _________________________ | _____________ | ☐ Yes |
| INV-ROOT-001 enforced in conformance runner | _________________________ | _____________ | ☐ Yes |
| BANZA SDK v1.0 released with Key Manifest pinned | _________________________ | _____________ | ☐ Yes |
| Milestone M2 recorded as complete | _________________________ | _____________ | ☐ Yes |

---

## Section 11 — Ceremony Notes

*(Any deviations from procedure, observations, or events to record)*

_______________________________________________________________________________  
_______________________________________________________________________________  
_______________________________________________________________________________  
_______________________________________________________________________________

---

## Section 12 — Participant Signatures

By signing this record, each participant attests that:
1. They were physically present for the duration of the ceremony.
2. The ceremony was conducted as described in this record.
3. To the best of their knowledge, no ceremony rule was violated.
4. Private key material was stored as described in Section 9.

---

**Ceremony Officer**

Full name (print): _______________________________________________

Signature: _______________________________________________

Date: _______________________________________________

---

**Ceremony Witness 1**

Full name (print): _______________________________________________

Signature: _______________________________________________

Date: _______________________________________________

---

**Ceremony Witness 2 (if present)**

Full name (print): _______________________________________________

Signature: _______________________________________________

Date: _______________________________________________

---

## Section 13 — Record Custody

| Action | By | Date |
|--------|-----|------|
| Record scanned and digitised | _________________________ | _____________ |
| Digital copy stored at | _________________________ (path/system) | _____________ |
| Physical copy stored at | _________________________ (location) | _____________ |
| Record added to BANZA governance repository | _________________________ | _____________ |

---

## Appendix — Compromise Recovery Supplement

*(Complete only if this ceremony is a compromise recovery ceremony — leave blank for initial ceremony)*

| Field | Value |
|-------|-------|
| Compromised key ID | _____________________________________________ |
| Compromise discovered at (UTC) | _____________________________________________ |
| Compromise discovery method | _____________________________________________ |
| Emergency BRL published at (UTC) | _____________________________________________ |
| Operators added to emergency BRL | _____________________________________________ |
| Public disclosure published at (UTC) | _____________________________________________ |
| Previous root key ID (if root compromise) | _____________________________________________ |
| SDK emergency update released at (UTC) | _____________________________________________ |
| Re-certification required for operators | ☐ Yes (Scenario C/D)  ☐ No (Scenario A/B) |
| Incident post-mortem published at (UTC) | _____________________________________________ |

---

*BANZA ROOT KEY CEREMONY RECORD — Retain indefinitely.*  
*This document is evidence of the trust anchor event for the BANZA federation.*  
*Loss of this record does not invalidate the key material — the keys remain valid.*  
*However, the record is required for full auditability of the BANZA trust chain.*
