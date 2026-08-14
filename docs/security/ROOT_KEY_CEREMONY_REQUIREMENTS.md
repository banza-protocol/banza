# BANZA Root Key Ceremony — Requirements

**Document ID:** BANZA-ROOT-KEY-CEREMONY-REQUIREMENTS-001
**Authority for:** ceremony prerequisites, authorised participants, environment, artifacts, evidence,
verification, failure handling and the production-tooling boundary.
**Custody model:** [`ROOT_KEY_CUSTODY_MODEL.md`](ROOT_KEY_CUSTODY_MODEL.md) — three independent root
signing authorities, threshold two. That document owns the model and the fail-closed gate; this one owns
how a root operation is conducted under it.
**Trust chain:** [`BANZA_TRUST_ARCHITECTURE.md`](../governance/BANZA_TRUST_ARCHITECTURE.md).
**Validator:** `engines/banza-root-ceremony :: validate_root_ceremony` (Rust, never TypeScript).

> **Requirements, not a runnable procedure.** This document states what a root ceremony must satisfy to
> be valid. It is deliberately **not** an executable script, because **this repository ships no production
> ceremony tooling** — see §"Production tooling boundary" below. The name says requirements for that
> reason.

---

## Purpose

This document is the authoritative procedure for executing the BANZA Root Key Ceremony.

The ceremony is a single, unrepeatable event. Its outputs — the BANZA root private key and the initial Key Manifest — form the trust anchor for the entire BANZA federation. Every production signed protocol metadata, every BANZA Revocation List, and every conformance evidence package is traceable to this ceremony.

This procedure is executed exactly once per root key generation. Issuing key rotations do not require a full root ceremony — only a Key Manifest update signed with the existing root key.

> ### Custody model
>
> The BANZA Trust Root is controlled by **three independent root signing authorities**, and a valid
> Root-authorised action requires signatures from **any two of the three**. No single root key
> authorises alone. The model, its invariants and its custody controls are in
> [`ROOT_KEY_CUSTODY_MODEL.md`](ROOT_KEY_CUSTODY_MODEL.md).
>
> Any custody step in this document that would let one party reconstruct or activate the root alone —
> a single encrypted blob copied to a second medium, one passphrase covering more than one key — does
> **not** satisfy the model and does not become valid by being written down. `INV-ROOT-007` ("no single
> entity controls the root") is satisfied by three independent authorities and a threshold of two, and
> by nothing less.

**This ceremony is to be executed when:** the four-condition ceremony gate in [`ROOT_KEY_CUSTODY_MODEL.md`](ROOT_KEY_CUSTODY_MODEL.md) is fully satisfied — custody implemented, checklist approved, evidence model complete, and the ceremony explicitly authorised. None of the four holds today: no ceremony has run and no production root key exists.

> ### Ceremony evidence requirement
>
> A production ceremony is **not valid** until a completed, signed ceremony record exists, using
> [`ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md`](ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md). The record MUST:
>
> - identify the **three custodians** and an **independent witness role** (the witness is never a
>   custodian);
> - attest that each custodian holds exactly one root key, on their own offline machine, with their own
>   encrypted backup in their own location, and that **no single party can reconstruct or activate the
>   root**;
> - record which **two distinct authorities** signed, and that a recovery test was performed and passed;
> - contain **NO** root material, passphrase, seed, module PIN or custody secret — the record is
>   metadata and attestations only.
>
> Absent evidence is not a pass: each missing class resolves to its own blocking status
> (`..._BLOCKED_BY_CUSTODY_GAP`, `..._BACKUP_GAP`, `..._OFFLINE_EVIDENCE_GAP`,
> `..._RECOVERY_TEST_GAP`).

---

## Part I — Participants, Roles, and Quorum

### Required Participants

| Role | Count | Responsibilities |
|------|-------|-----------------|
| **Ceremony Officer** | 1 | Executes all commands. Has sole custody of the ceremony machine during the ceremony. Records all outputs. |
| **Ceremony Witness** | 1 minimum | Observes all steps. Countersigns the Ceremony Record. Does not touch the ceremony machine. |

**Quorum:** 2 participants (1 Officer + 1 Witness) is the minimum for a valid ceremony. A ceremony executed by 1 person with no witness is invalid.

**For compromise recovery ceremonies:** 2 Officers + 2 Witnesses required (elevated quorum due to elevated risk).

### Participation Rules

1. All participants must be physically present in the same room for the entire ceremony.
2. No participant may leave the room between key generation (Phase 3) and key storage completion (Phase 7).
3. The Ceremony Officer must not allow any other participant to observe private key material on screen. The Officer verbally reports each step completion to the Witness without exposing key bytes.
4. The Witness observes the procedure, the outputs being written, and the storage operations. The Witness does not need to read private key bytes — they confirm the process was followed correctly.
5. Video recording is RECOMMENDED (see Phase 2). All participants must consent to recording before it begins.

### Identity Verification

Before the ceremony begins, each participant's identity must be confirmed:
- Government-issued photo ID
- Identity confirmation recorded in the Ceremony Record

---

## Part II — Ceremony Environment

### Location Requirements

| Requirement | Specification |
|-------------|-------------|
| Physical security | Private room. Door must be lockable. No windows accessible from outside the building, or windows must be covered. |
| Network isolation | No wired network connections in the room during the ceremony. All WiFi access points disabled or out of range. |
| Electronic interference | No unauthorized electronic devices. Participants surrender mobile phones or place them in a screened bag. |
| Recording | Video camera positioned to capture the Officer's hands and screen (not close enough to read key bytes). Recording captures process, not secrets. |

### Hardware Requirements

| Item | Specification | Purpose |
|------|-------------|---------|
| **Ceremony machine** | Laptop or desktop with no permanent network interface (WiFi removed/disabled at hardware level, no Ethernet connected). Running a Linux live environment (Tails OS recommended, Ubuntu 22.04+ acceptable). | Executes all ceremony commands in an isolated environment. |
| **Ceremony USB** | USB drive, ≥8 GB. Write-protected after software is loaded. Contains Python 3.9+ environment, `cryptography>=41.0.0` library, ceremony script. | Software transport into air-gapped machine. |
| **Custodian media (×3)** | One clean, freshly formatted, verified-empty drive per custodian, ≥8 GB, used only for that custodian's own key material. | Each custodian's encrypted backup. Three media, never pooled. |
- Each custodian's encrypted medium → stored in that custodian's own secure location, under their sole control. Three custodians, three locations, three media; no location holds two.
| **Public artifact USB** | USB drive, ≥1 GB. | Transports public artifacts (Key Manifest, initial BRL) from air-gapped machine to publication host. Contains only public material. |
| **Printer** | Offline printer (no network, no WiFi). | Paper backup of key fingerprints and ceremony record. |
| **Camera/phone** | Witness's camera or phone for video recording. Must be placed face-up on a separate table — Officer can see it is not pointed at screen. | Ceremony video record. |

### Software Requirements

> **The production ceremony tooling is not in this repository, and must not be taken from it.**
> The Python scripts this section once named (`trust_root.py`, `ceremony_script.py`) were removed when
> the official engines moved to Rust (ADR-038). What `engines/banza-trust` provides is a **TEST-ONLY
> simulator** (`ceremony-simulate`, `generate-test-root`, `sign-test-*`) that uses deterministic test
> keys; it exists to exercise the trust chain and **must never be used to conduct a real ceremony**.
>
> The real M2 root ceremony is a governed, out-of-band process. Its tooling is prepared, reviewed and
> hash-recorded under that governance, not pulled from a working copy of this repository — which is
> also why a stale path here would be dangerous: a file recreated at a familiar path could be trusted
> because the path looked right.

The ceremony machine must have, loaded on the Ceremony USB before the ceremony begins:

```
The signing tooling designated by the ceremony governance, with each artifact's
SHA-256 recorded and independently verified by two witnesses before use.
```

All software hashes must be recorded before the ceremony begins (see Phase 1 Step 5).

### Entropy Requirements

Python's `Ed25519PrivateKey.generate()` uses the operating system's CSPRNG (`/dev/urandom` on Linux), which is cryptographically adequate. No additional entropy ceremony is required for the initial BANZA root key.

**Optional enhancement:** Before key generation, the Officer may run the OS entropy pool warm-up:

```bash
# Add 100 MB of protocol core entropy by reading /dev/urandom
dd if=/dev/urandom of=/dev/null bs=1M count=100 status=progress
```

This is not required but documents due diligence in the Ceremony Record.

---

## Part III — Generated Artifacts

The ceremony produces the following artifacts. Every artifact's disposition is defined exactly.

### Secret artifacts (never leave the air-gapped environment in plaintext)

| Artifact | Key ID | Storage |
|---|---|---|
| BANZA root private keys — **three, one per custodian** | `banza-root-YYYY-a` · `-b` · `-c` | Each encrypted on **its own custodian's medium only**, under that custodian's own passphrase. No medium and no passphrase covers more than one. Never exported to any online system. |
| Metadata-signing private key | `banza-meta-YYYYMM` | A **delegated** key, endorsed by the Key Manifest the root signs. Not a root key; lifecycle in `KEY_MANAGEMENT_POLICY.md`. |
| BRL-issuing private key | `banza-brl-YYYYMM` | Same — delegated, endorsed, not held by the root. |
| Conformance-issuing private key | `banza-evidence-YYYYMM` | Same — delegated, endorsed, not held by the root. |

Pooling the three root keys onto one medium, or covering them with one passphrase, defeats the
threshold: it turns three authorities back into one. It resolves to
`M2_ROOT_CEREMONY_BLOCKED_BY_CUSTODY_GAP`.

**Key ID substitution rule:** `YYYY` = UTC year of ceremony. `YYYYMM` = UTC year and month of ceremony.  
Example: Ceremony on 2026-06-15 → root `banza-root-2026`, issuing `banza-meta-202606`.

### Public Artifacts (exported to Publication USB for distribution)

| Artifact | File | Disposition |
|----------|------|------------|
| Root public key | Embedded in Key Manifest | Published in Key Manifest; pinned in SDK. |
| Initial Key Manifest | `key-manifest.json` | Published to `banza.network/.well-known/banza/key-manifest.json`. Bundled in SDK v1.0. |
| Initial BRL | `initial-brl.json` | Published to `banza.network/federation/revocation-list.json`. Empty revocation list. |
| Ceremony public record | `ceremony-record.json` | Published to `banza.network/.well-known/banza/ceremony-record.json`. Non-repudiation evidence. |

### Ceremony Record (Witness-signed)

| Item | Content |
|------|---------|
| `ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md` filled in | All key fingerprints (public key hashes), all artifact hashes, participant names, timestamps, verification results, officer and witness signatures. |

The filled-in record is printed, signed physically by all participants, scanned, and retained by BANZA governance. It is the legal evidence of the ceremony.

---

## Part IV — Ceremony Execution

### Phase 0 — Pre-Ceremony Preparation (Day Before)

Execute before the ceremony day. No key material exists yet.

**Step 0.1 — Prepare Ceremony USB**

On any trusted machine:

```bash
# Install dependencies into a portable virtualenv
python3 -m venv /media/ceremony-usb/venv
source /media/ceremony-usb/venv/bin/activate
pip install "cryptography>=41.0.0"
deactivate

# Load the ceremony tooling designated by the ceremony governance onto the USB.
# NOT from a working copy of this repository: this repository ships no production
# ceremony tooling, and engines/banza-trust is a TEST-ONLY simulator.
```

Record software hashes:
```bash
sha256sum /media/ceremony-usb/trust_root.py > /media/ceremony-usb/SOFTWARE_HASHES.txt
sha256sum /media/ceremony-usb/ceremony_script.py >> /media/ceremony-usb/SOFTWARE_HASHES.txt
python3 -c "import cryptography; print('cryptography', cryptography.__version__)" >> /media/ceremony-usb/SOFTWARE_HASHES.txt
cat /media/ceremony-usb/SOFTWARE_HASHES.txt
```

Record the hashes in the Ceremony Record template under "Pre-ceremony software hashes."

**Step 0.2 — Prepare the custodian media**

Each custodian prepares **their own** medium, on a trusted machine, freshly formatted and verified
empty, labelled with a **non-secret** identifier only. Three media are prepared, one per custodian, and
they are never pooled, swapped or copied between custodians. A medium prepared by one custodian for
another breaks the independence the threshold rests on.

**Step 0.3 — Confirm Participants**

All participants confirm availability. Officer and Witness have reviewed this procedure in full. Ceremony Record Template is printed and ready.

---

### Phase 1 — Ceremony Opening

**Step 1.1 — Participant Assembly**

All participants gather in the ceremony room. Door is closed and locked. Mobile devices are collected and placed in airplane mode or screened bag away from the ceremony machine.

**Step 1.2 — Identity Verification**

Officer records each participant's name and ID document in the Ceremony Record. Witness confirms.

**Step 1.3 — Environment Audit**

Officer and Witness jointly confirm:
- [ ] No wired network cable connected to ceremony machine
- [ ] WiFi is disabled (hardware switch, not software)
- [ ] No unauthorized electronic devices present
- [ ] Camera recording started (if using video record)
- [ ] Room is physically secured

Record: Witness initials the "environment audit" line in the Ceremony Record.

**Step 1.4 — Software Verification**

On the ceremony machine (now booted from live OS or with Ceremony USB mounted):

```bash
sha256sum /media/ceremony-usb/trust_root.py
sha256sum /media/ceremony-usb/ceremony_script.py
```

Compare to pre-ceremony hashes recorded in Step 0.1. Both must match exactly.

Record: Officer reads hashes aloud. Witness confirms they match the pre-ceremony record.

**Step 1.5 — Timestamp**

Officer reads the system clock aloud: `date -u`. Witness confirms. Record UTC timestamp as ceremony start time in the Ceremony Record.

---

### Phase 2 — Key Generation

All key generation executes in the ceremony Python environment on the air-gapped machine.

```bash
cd /media/ceremony-usb
source venv/bin/activate
python3
```

**Step 2.1 — Determine Key IDs**

Officer establishes key IDs based on current UTC date:

```python
from datetime import datetime, timezone
now = datetime.now(timezone.utc)
CEREMONY_DATE = now.strftime("%Y-%m-%dT%H:%M:%SZ")
ROOT_KEY_ID   = f"banza-root-{now.year}"
META_KEY_ID   = f"banza-meta-{now.strftime('%Y%m')}"
BRL_KEY_ID    = f"banza-brl-{now.strftime('%Y%m')}"
EVID_KEY_ID   = f"banza-evidence-{now.strftime('%Y%m')}"

print("CEREMONY_DATE :", CEREMONY_DATE)
print("ROOT_KEY_ID   :", ROOT_KEY_ID)
print("META_KEY_ID   :", META_KEY_ID)
print("BRL_KEY_ID    :", BRL_KEY_ID)
print("EVID_KEY_ID   :", EVID_KEY_ID)
```

Officer reads all five values aloud. Witness records them verbatim in the Ceremony Record.

**Step 2.2 — Generate Root Keypair**

```python
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import (
    Encoding, PrivateFormat, PublicFormat, NoEncryption
)
import base64, hashlib

def b64url(b): return base64.urlsafe_b64encode(b).rstrip(b"=").decode()
def fingerprint(pub_bytes): return hashlib.sha256(pub_bytes).hexdigest()[:16]

# Generate root keypair
root_priv = Ed25519PrivateKey.generate()
root_pub_bytes = root_priv.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
root_priv_bytes = root_priv.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())

ROOT_PUBLIC_KEY   = f"ed25519:{b64url(root_pub_bytes)}"
ROOT_FINGERPRINT  = fingerprint(root_pub_bytes)

print("ROOT PUBLIC KEY  :", ROOT_PUBLIC_KEY)
print("ROOT FINGERPRINT :", ROOT_FINGERPRINT)
```

Officer reads `ROOT_FINGERPRINT` (first 16 hex chars of SHA-256 of root public key) aloud. Witness records it in the Ceremony Record. This fingerprint is the permanent identifier for this root key generation.

**Step 2.3 — Generate Metadata-Signing Keypair**

```python
meta_priv = Ed25519PrivateKey.generate()
meta_pub_bytes = meta_priv.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
meta_priv_bytes = meta_priv.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
META_PUBLIC_KEY  = f"ed25519:{b64url(meta_pub_bytes)}"
META_FINGERPRINT = fingerprint(meta_pub_bytes)
print("META PUBLIC KEY  :", META_PUBLIC_KEY)
print("META FINGERPRINT :", META_FINGERPRINT)
```

**Step 2.4 — Generate BRL-Issuing Keypair**

```python
brl_priv = Ed25519PrivateKey.generate()
brl_pub_bytes = brl_priv.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
brl_priv_bytes = brl_priv.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
BRL_PUBLIC_KEY   = f"ed25519:{b64url(brl_pub_bytes)}"
BRL_FINGERPRINT  = fingerprint(brl_pub_bytes)
print("BRL PUBLIC KEY   :", BRL_PUBLIC_KEY)
print("BRL FINGERPRINT  :", BRL_FINGERPRINT)
```

**Step 2.5 — Generate Conformance-Issuing Keypair**

```python
evid_priv = Ed25519PrivateKey.generate()
evid_pub_bytes = evid_priv.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
evid_priv_bytes = evid_priv.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
EVID_PUBLIC_KEY  = f"ed25519:{b64url(evid_pub_bytes)}"
EVID_FINGERPRINT = fingerprint(evid_pub_bytes)
print("EVIDENCE PUBLIC KEY  :", EVID_PUBLIC_KEY)
print("EVIDENCE FINGERPRINT :", EVID_FINGERPRINT)
```

After Steps 2.2–2.5: Officer reads each fingerprint aloud. Witness records all four in the Ceremony Record. These are the permanent key identifiers.

---

### Phase 3 — Artifact Construction

**Step 3.1 — Construct Key Manifest**

The Key Manifest is the central trust distribution artifact. It includes all four public keys and is signed by the root key.

```python
import json
from datetime import datetime, timezone, timedelta

now = datetime.now(timezone.utc)
# Root key valid for 24 months (ADR-025)
root_expires = (now + timedelta(days=730)).strftime("%Y-%m-%dT%H:%M:%SZ")
# Issuing keys valid for 6 months (ADR-025)
issuing_expires = (now + timedelta(days=183)).strftime("%Y-%m-%dT%H:%M:%SZ")
published_at = now.strftime("%Y-%m-%dT%H:%M:%SZ")
active_since = published_at

manifest_body = {
    "schema_version": "1",
    "published_at": published_at,
    "root_key_id": ROOT_KEY_ID,
    "root_public_key": ROOT_PUBLIC_KEY,
    "expires_at": root_expires,
    "keys": [
        {
            "key_id": META_KEY_ID,
            "public_key": META_PUBLIC_KEY,
            "domain": "protocol-metadata",
            "active_since": active_since,
            "expires_at": issuing_expires,
            "status": "active"
        },
        {
            "key_id": BRL_KEY_ID,
            "public_key": BRL_PUBLIC_KEY,
            "domain": "revocation",
            "active_since": active_since,
            "expires_at": issuing_expires,
            "status": "active"
        },
        {
            "key_id": EVID_KEY_ID,
            "public_key": EVID_PUBLIC_KEY,
            "domain": "conformance-evidence",
            "active_since": active_since,
            "expires_at": issuing_expires,
            "status": "active"
        }
    ]
}

# Sign the manifest with the root key (ADR-025 signing rule)
# Payload: all fields sorted lexicographically, no whitespace, UTF-8
canonical_bytes = json.dumps(manifest_body, sort_keys=True, separators=(',',':')).encode('utf-8')
sig_bytes = root_priv.sign(canonical_bytes)
manifest_signature = b64url(sig_bytes)

key_manifest = dict(manifest_body)
key_manifest["manifest_signature"] = manifest_signature

MANIFEST_JSON = json.dumps(key_manifest, indent=2, sort_keys=True)
MANIFEST_HASH = hashlib.sha256(MANIFEST_JSON.encode('utf-8')).hexdigest()

print("KEY MANIFEST SHA-256 :", MANIFEST_HASH)
print(MANIFEST_JSON)
```

Officer reads `MANIFEST_HASH` aloud. Witness records it in the Ceremony Record.

**Step 3.2 — Verify Key Manifest Signature**

Before proceeding, verify the manifest signature is correct:

```python
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.exceptions import InvalidSignature

manifest_to_verify = {k: v for k, v in key_manifest.items() if k != "manifest_signature"}
verify_bytes = json.dumps(manifest_to_verify, sort_keys=True, separators=(',',':')).encode('utf-8')
sig_to_verify = base64.urlsafe_b64decode(manifest_signature + "==")

try:
    root_pub_key = Ed25519PublicKey.from_public_bytes(root_pub_bytes)
    root_pub_key.verify(sig_to_verify, verify_bytes)
    print("MANIFEST SIGNATURE VERIFICATION: PASS")
except InvalidSignature:
    print("MANIFEST SIGNATURE VERIFICATION: FAIL — ABORT CEREMONY")
    raise
```

**If verification fails: STOP. The ceremony is invalid. Do not proceed. All generated material is discarded. Begin again from Phase 2.**

Officer reads "MANIFEST SIGNATURE VERIFICATION: PASS" aloud. Witness records result.

**Step 3.3 — Construct Initial BRL**

The initial BRL has zero revoked operators. It is signed by the BRL-issuing key.

```python
brl_now = datetime.now(timezone.utc)
brl_expires = (brl_now + timedelta(hours=7)).strftime("%Y-%m-%dT%H:%M:%SZ")

brl_body = {
    "schema_version": "1",
    "issuer": "BANZA",
    "issuer_key_id": BRL_KEY_ID,
    "issued_at": brl_now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    "expires_at": brl_expires,
    "revoked": []
}

brl_canonical = json.dumps(brl_body, sort_keys=True, separators=(',',':')).encode('utf-8')
brl_sig_bytes = brl_priv.sign(brl_canonical)
brl_signature = b64url(brl_sig_bytes)

initial_brl = dict(brl_body)
initial_brl["signature"] = brl_signature

BRL_JSON = json.dumps(initial_brl, indent=2, sort_keys=True)
BRL_HASH = hashlib.sha256(BRL_JSON.encode('utf-8')).hexdigest()

print("INITIAL BRL SHA-256 :", BRL_HASH)
```

**Note:** The initial BRL expires in 7 hours. It must be re-issued with a 6-hour expiry upon publication (see Phase 7). The ceremony BRL establishes the BRL-issuing key signature; the publication BRL is signed with the same key immediately before going live.

Officer reads `BRL_HASH` aloud. Witness records it.

---

### Phase 4 — Key material storage

This phase stores secret material. Under the custody model it is **not a single step performed on one
machine**: each custodian stores their own key, on their own offline machine, on their own medium. A
step that gathers the three root keys — or a root key and the delegated keys — onto one medium violates
invariant 2 and invalidates the ceremony (`M2_ROOT_CEREMONY_BLOCKED_BY_CUSTODY_GAP`).

**Required of each custodian, independently:**

| # | Requirement | Why |
|---|---|---|
| 4.1 | The custodian writes **their own root private key and no other** to their own encrypted medium | No medium concentrates two root keys |
| 4.2 | Encryption uses a passphrase **that custodian alone holds**, stored apart from the medium | One passphrase never unlocks more than one key |
| 4.3 | The public key and fingerprint are exported separately, in the clear, for publication | Only public material leaves the offline machine |
| 4.4 | The custodian performs a **recovery test** and records the result | A backup that has never been recovered is unproven |
| 4.5 | The medium is stored in that custodian's own secure location, labelled with a non-secret identifier | Independence is physical, not only nominal |

**Forbidden, explicitly:**

- one encrypted archive containing more than one root private key;
- one passphrase covering more than one custodian's material;
- a copy of a custodian's key held by another custodian "for recovery";
- any private key written to a medium that has been, or will be, connected to an online machine.

The delegated signing keys (protocol metadata, BRL, evidence) are **not** root keys and are not stored
under this phase; their lifecycle is in [`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md). The root
signs the Key Manifest that endorses them — it does not hold them.

> No command sequence is given here. The tooling that would execute one is not in this repository (see
> the production-tooling boundary), and publishing commands that cannot be run — or that were written
> for a different custody model — is how the previous version of this document came to describe a
> single-custodian step as if it were the procedure.

### Phase 5 — Public Artifact Preparation

**Step 5.1 — Write Public Artifacts to Publication USB**

```bash
mkdir -p /media/pub-usb/publish/
cp /media/output-usb-a/ceremony/key-manifest.json /media/pub-usb/publish/
cp /media/output-usb-a/ceremony/initial-brl.json /media/pub-usb/publish/
```

**The Publication USB must contain ONLY public files.** Officer and Witness jointly verify no private key files are present:

```bash
grep -r "private" /media/pub-usb/ 2>/dev/null | wc -l  # Must output 0
ls /media/pub-usb/publish/
# Expected: key-manifest.json  initial-brl.json
```

**Step 5.2 — Create Ceremony Public Record**

```python
import hashlib, json
from datetime import datetime, timezone

ceremony_public_record = {
    "schema_version": "1",
    "ceremony_date": CEREMONY_DATE,
    "ceremony_id": f"BANZA-ROOT-CEREMONY-{CEREMONY_DATE[:10]}",
    "root_key_id": ROOT_KEY_ID,
    "root_key_fingerprint": ROOT_FINGERPRINT,
    "root_public_key": ROOT_PUBLIC_KEY,
    "issuing_keys": [
        {"key_id": META_KEY_ID, "domain": "protocol-metadata", "fingerprint": META_FINGERPRINT},
        {"key_id": BRL_KEY_ID,  "domain": "revocation",    "fingerprint": BRL_FINGERPRINT},
        {"key_id": EVID_KEY_ID, "domain": "conformance-evidence", "fingerprint": EVID_FINGERPRINT},
    ],
    "key_manifest_sha256": MANIFEST_HASH,
    "initial_brl_sha256": BRL_HASH,
    "officer": "[CEREMONY OFFICER NAME]",
    "witness": "[CEREMONY WITNESS NAME]",
}

RECORD_JSON = json.dumps(ceremony_public_record, indent=2, sort_keys=True)
RECORD_HASH = hashlib.sha256(RECORD_JSON.encode('utf-8')).hexdigest()

with open("/media/pub-usb/publish/ceremony-record.json", 'w') as f:
    f.write(RECORD_JSON)

print("CEREMONY RECORD SHA-256:", RECORD_HASH)
```

---

### Phase 6 — Final Verification

Before clearing the ceremony machine, the Officer performs a complete verification pass. **This step must not be skipped.**

**Step 6.1 — Re-verify Key Manifest Signature**

```python
# Load from USB to verify the written copy, not the in-memory copy
with open("/media/output-usb-a/ceremony/key-manifest.json") as f:
    manifest_from_disk = json.load(f)

manifest_to_verify = {k: v for k, v in manifest_from_disk.items() if k != "manifest_signature"}
verify_bytes = json.dumps(manifest_to_verify, sort_keys=True, separators=(',',':')).encode('utf-8')
sig_to_verify = base64.urlsafe_b64decode(manifest_from_disk["manifest_signature"] + "==")
root_pub_key = Ed25519PublicKey.from_public_bytes(root_pub_bytes)
root_pub_key.verify(sig_to_verify, verify_bytes)
print("DISK MANIFEST VERIFICATION: PASS")
```

**Step 6.2 — Re-verify BRL Signature**

```python
with open("/media/output-usb-a/ceremony/initial-brl.json") as f:
    brl_from_disk = json.load(f)

brl_to_verify = {k: v for k, v in brl_from_disk.items() if k != "signature"}
brl_verify_bytes = json.dumps(brl_to_verify, sort_keys=True, separators=(',',':')).encode('utf-8')
brl_sig_to_verify = base64.urlsafe_b64decode(brl_from_disk["signature"] + "==")
brl_pub_key = Ed25519PublicKey.from_public_bytes(brl_pub_bytes)
brl_pub_key.verify(brl_sig_to_verify, brl_verify_bytes)
print("DISK BRL VERIFICATION: PASS")
```

**Step 6.3 — Confirm Key IDs are Production-Format (not test-)**

```python
for key_id in [ROOT_KEY_ID, META_KEY_ID, BRL_KEY_ID, EVID_KEY_ID]:
    assert not key_id.startswith("test-"), f"FAIL: key_id starts with test-: {key_id}"
    print(f"FORMAT CHECK PASS: {key_id}")
```

**Step 6.4 — Confirm Issuing Key Max Validity ≤ 6 Months**

```python
from datetime import datetime, timezone
for entry in manifest_from_disk["keys"]:
    expires = datetime.fromisoformat(entry["expires_at"].replace("Z", "+00:00"))
    active  = datetime.fromisoformat(entry["active_since"].replace("Z", "+00:00"))
    days = (expires - active).days
    assert days <= 184, f"FAIL: issuing key {entry['key_id']} validity {days} days > 184"
    print(f"VALIDITY CHECK PASS: {entry['key_id']} — {days} days")
```

**Step 6.5 — Record Verification Results**

Officer reads "ALL VERIFICATIONS PASS" aloud. Witness records in Ceremony Record. If any verification fails, see failure procedure at end of this document.

---

### Phase 7 — Ceremony Close

**Step 7.1 — Memory Zeroing**

```python
# Overwrite private key bytes in memory before Python exit
import ctypes

def zero_bytes(b: bytes):
    """Attempt to zero memory for a bytes object."""
    if isinstance(b, (bytearray, memoryview)):
        for i in range(len(b)): b[i] = 0
    # For immutable bytes, we can try to overwrite via ctypes
    ba = bytearray(b)
    for i in range(len(ba)): ba[i] = 0

# Overwrite all private key byte variables
for b in [root_priv_bytes, meta_priv_bytes, brl_priv_bytes, evid_priv_bytes]:
    zero_bytes(b)

del root_priv, meta_priv, brl_priv, evid_priv
del root_priv_bytes, meta_priv_bytes, brl_priv_bytes, evid_priv_bytes
print("MEMORY ZERO: COMPLETE")
```

Exit Python.

**Step 7.2 — Ceremony Machine Wipe**

If using a live OS (Tails): the live OS leaves no persistent state. Power off the machine.

If using a persistent OS: securely delete all temporary files:

```bash
shred -u /tmp/* 2>/dev/null || true
# Clear Python history
rm -f ~/.python_history
# Clear shell history
history -c
```

Power off the machine.

**Step 7.3 — USB Physical Control**

- Each custodian's medium → stored in that custodian's own secure location, under their sole control. Three custodians, three locations; no location holds two.
- Publication USB → sealed in an envelope, labeled "BANZA PUBLICATION ARTIFACTS — [CEREMONY DATE]." Ready for use in publication sequence.
- Ceremony USB → wiped and returned to general use.

**Step 7.4 — Ceremony Record Completion**

Officer and Witness both sign the printed Ceremony Record (physical signatures). Officer also signs the ceremony-record.json file digitally if a pre-existing identity key is available. Record is scanned and stored in BANZA governance repository.

**Step 7.5 — Ceremony Close**

Officer reads the ceremony close statement:

> "The BANZA Root Key Ceremony is concluded. The root key `[ROOT_KEY_ID]` with fingerprint `[ROOT_FINGERPRINT]` has been generated. The initial Key Manifest SHA-256 is `[MANIFEST_HASH]`. All artifacts have been verified. Key material has been secured. This ceremony is closed."

Witness acknowledges. Recording stopped. Timestamp recorded.

---

## Part V — Verification Steps

The following verifications must pass before the ceremony is considered valid:

| Check | Method | Pass Condition |
|-------|--------|---------------|
| Software hash verification | SHA-256 comparison | Matches pre-ceremony hashes |
| Root key generation confirmed | Fingerprint recorded by Witness | Fingerprint on record |
| All 4 keypairs generated | Fingerprints for all 4 keys on Ceremony Record | 4 fingerprints present |
| Key Manifest signature | ed25519 verify in Python | "PASS" printed and witnessed |
| BRL signature | ed25519 verify in Python | "PASS" printed and witnessed |
| Key ID format validation | Python assert, no `test-` prefix | "FORMAT CHECK PASS" × 4 |
| Issuing key validity ≤ 6 months | Python assert, days ≤ 184 | "VALIDITY CHECK PASS" × 3 |
| Disk write verification | Hash comparison of written files | Matches in-memory hashes |
| Witness signature | Physical signature on Ceremony Record | Signed |

---

## Part VI — Failure Procedures

### If any verification FAILS during Phase 6

1. Do not proceed to Phase 7.
2. Record the failure in the Ceremony Record with exact error message.
3. Determine root cause (software bug, bad entropy, hardware issue).
4. Discard all generated key material: delete from USB drives, zero in memory.
5. Schedule a new ceremony after root cause is resolved.
6. The failed ceremony is recorded with outcome "VOID — see failure report."

### If a participant must leave the room between Phases 2 and 7

1. The ceremony is suspended. Officer locks the ceremony machine.
2. If the Witness must leave: ceremony is PAUSED. No further key operations until a replacement Witness is present.
3. If the Officer must leave: ceremony is SUSPENDED. No one else may operate the ceremony machine. Officer returns and resumes from the last completed step.
4. If the Officer cannot return: ceremony is VOIDED. All material is discarded. A new ceremony is scheduled.

### If the ceremony machine becomes connected to a network

1. The ceremony is IMMEDIATELY VOIDED.
2. All generated key material is discarded without storage.
3. Root cause of network connection is investigated.
4. New ceremony scheduled only after isolation is confirmed.

### If the Ceremony Record is lost or damaged

1. If all key fingerprints and artifact hashes can be recovered from USB A + USB B: a reconstruction record is created, signed by all original participants, with explanation.
2. If fingerprints cannot be recovered: the ceremony is considered unattested. A new ceremony is required.

---

## Part VII — Publication Sequence

The publication sequence executes after the ceremony, on an online machine, using the Publication USB.

### Prerequisites

- Ceremony is complete and Ceremony Record is signed.
- `banza.network` hosting infrastructure is ready to serve two endpoints.
- BANZA SDK repository is ready for a v1.0 release.

### Step P.1 — Re-sign the BRL for Publication

The ceremony BRL was signed with a 7-hour expiry. Before publishing, sign a fresh BRL with the ceremony's BRL-issuing private key:

```python
# On a secure online machine with access to the brl-issuing private key
# (decrypted from the encrypted USB backup)
from tools.banza_conformance.trust_root import generate_signed_brl
# Load brl_priv from decrypted backup
initial_pub_brl = generate_signed_brl(
    root_private_key=brl_priv,
    key_id=BRL_KEY_ID,
    revoked=[],
    expires_hours=6  # Standard 6-hour BRL expiry per ADR-025
)
```

### Step P.2 — Publish Key Manifest

```bash
# Upload key-manifest.json to banza.network web hosting
# The endpoint must serve with Cache-Control: max-age=86400
curl -X PUT \
  -H "Cache-Control: max-age=86400" \
  -H "Content-Type: application/json" \
  --data-binary @/media/pub-usb/publish/key-manifest.json \
  https://banza.network/.well-known/banza/key-manifest.json
```

### Step P.3 — Verify Key Manifest Endpoint

```bash
curl -s https://banza.network/.well-known/banza/key-manifest.json | python3 -c "
import json, sys
m = json.load(sys.stdin)
print('schema_version:', m.get('schema_version'))
print('root_key_id:', m.get('root_key_id'))
print('manifest_signature present:', bool(m.get('manifest_signature')))
print('keys:', [k['key_id'] for k in m.get('keys', [])])
"
```

### Step P.4 — Publish Initial BRL

```bash
curl -X PUT \
  -H "Cache-Control: max-age=21600" \
  -H "Content-Type: application/json" \
  --data-binary @<(python3 -c "import json; print(json.dumps(initial_pub_brl, indent=2, sort_keys=True))") \
  https://banza.network/federation/revocation-list.json
```

### Step P.5 — Verify BRL Endpoint

```bash
curl -s https://banza.network/federation/revocation-list.json | python3 -c "
import json, sys
brl = json.load(sys.stdin)
print('issuer:', brl.get('issuer'))
print('issuer_key_id:', brl.get('issuer_key_id'))
print('revoked count:', len(brl.get('revoked', [])))
print('expires_at:', brl.get('expires_at'))
"
```

### Step P.6 — Enforce INV-ROOT-001 in the verifier

Ensure the conformance runner (`engines/banza-conformance`) and the trust engine (`engines/banza-trust`)
enforce INV-ROOT-001 against the production root. This is OPS-006 in the Transition Plan.

### Step P.7 — SDK v1.0 Release

Embed the Key Manifest JSON into the SDK as a pinned constant. Update all SDK signed-protocol-metadata verification to use the Key Manifest for `issuer_key_id` lookup instead of a single pinned root key. Tag and release SDK v1.0.

### Step P.8 — Milestone M2 Confirmed

Record the completion of each item:
- Key Manifest live at endpoint
- BRL live at endpoint
- SDK v1.0 released
- INV-ROOT-001 enforced in conformance runner

Milestone M2 (Production Trust Established) is complete.

---

## Appendix A — Ceremony Script Reference

The `ceremony_script.py` file is a structured wrapper around the steps in this document. It should be prepared before the ceremony and verified against this procedure. It does not replace this procedure — it is a convenience wrapper for the Python commands defined above.

The script must:
1. Accept no network connections
2. Write all outputs to explicitly specified file paths
3. Print all fingerprints and hashes to stdout for the Witness to record
4. Exit non-zero if any verification fails

## Appendix B — Issuing Key Rotation (Non-Root Ceremony)

Issuing keys are rotated every 6 months. Rotation does NOT require a full root ceremony. The procedure is:

1. Generate a new issuing keypair (protocol-metadata, brl, or evidence) on a secure machine.
2. Create an updated Key Manifest body with the new key added and the retiring key's `status` set to `"retiring"`.
3. Sign the updated Key Manifest with the existing root private key (offline, from encrypted USB backup).
4. Publish the updated Key Manifest.

The root private key leaves secure storage only for this signing operation. It must be returned to secure storage immediately after.

## Appendix C — Related Documents

| Document | Purpose |
|----------|---------|
| `decisions/adr/ADR-025-open-protocol-trust-model-without-a-certificate-authority.md` | Trust architecture governing this ceremony |
| `docs/security/ROOT_KEY_CEREMONY_REQUIREMENTS.md` | Day-of checklist |
| `docs/security/ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md` | Record template to fill in during ceremony |
| `docs/security/ROOT_KEY_CEREMONY_REQUIREMENTS.md` | Pre-production readiness assessment |
| `docs/security/ROOT_KEY_CUSTODY_MODEL.md` | Approved custody model and the four-condition ceremony gate |
