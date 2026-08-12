# BANZA Root-Key Ceremony Record — TEMPLATE

**This is a template.** Copy it to `BANZA-ROOT-CEREMONY-<YYYY-MM-DD>.md` and complete it
during the ceremony. A production ceremony is **not valid** until this record is completed
and signed by two independent keyholders and an independent witness.

**No secrets.** This record proves dual custody; it must contain **no** key material,
passphrase, seed, HSM PIN, or custody secret (see the FORBIDDEN ATTACHMENTS section and
[`README.md`](README.md)).

---

## 1. Ceremony identity

| Field | Value |
|---|---|
| `ceremony_id` | BANZA-ROOT-CEREMONY-<YYYY-MM-DD> |
| `ceremony_type` | root_key_generation |
| `ceremony_date` | <ISO 8601 UTC> |
| `environment` | production \| dry-run  *(production requires everything below)* |
| `custody_model` | dual_hsm_dual_keyholder |
| `quorum` | 2_of_2 |
| `procedure_ref` | docs/security/ROOT_KEY_CEREMONY_PROCEDURE.md |
| `authorization_ref` | <OPS-001 authorization per docs/governance/BANZA_V1_OPERATIONAL_TRANSITION_PLAN.md> |

## 2. Keyholders (two independent)

| Field | Keyholder 1 | Keyholder 2 |
|---|---|---|
| Identity / role | <stable role id> | <stable role id> |
| Organization (if applicable) | | |
| Independence attestation | <distinct from KH2 and witness> | <distinct from KH1 and witness> |

> Keyholder 1 and Keyholder 2 **MUST** be distinct individuals/roles. Neither may also be
> the witness.

## 3. Witness (independent)

| Field | Value |
|---|---|
| `witness` identity / role | <stable role id — NOT a keyholder> |
| Witness attestation | The two keyholders are independent; two independent custody artifacts exist in two separate locations; no single party can reconstruct or activate the root key. |

## 4. Custody artifacts (two independent)

| Field | Custody artifact 1 | Custody artifact 2 |
|---|---|---|
| `custody_artifact_id` | <id, not a secret> | <id, not a secret> |
| `type` | HSM module \| approved custody device | HSM module \| approved custody device |
| Held by | Keyholder 1 | Keyholder 2 |
| `storage_location` | <separate location 1> | <separate location 2> |

> The two custody artifacts and their storage locations **MUST** be distinct. A single
> encrypted blob copied to two media is **NOT** two custody artifacts.

## 5. Recovery artifact (optional, governance-controlled)

| Field | Value |
|---|---|
| `recovery_artifact_id` | <sealed paper backup id, if used> |
| `storage_location` | <third, separate, governance-controlled location> |

> The recovery artifact may enable recovery **only** in combination with governance
> authorization — it must not allow a single party to *use* the root key.

## 6. Dual-custody evidence (mandatory attestations)

- [ ] **No single keyholder can reconstruct the root alone** — the root key requires both
      custody artifacts (2-of-2). Attested by both keyholders + witness.
- [ ] **No root material is recoverable under one passphrase** — there is no single
      passphrase, file, or secret that reconstructs the root key.
- [ ] **Two independent custody artifacts** exist, held by two independent keyholders.
- [ ] **Two physically separate storage locations** are used.
- [ ] **Independent witness role** confirmed (witness is not a keyholder).

## 7. Artifacts produced (hashes only — never the keys)

| Field | Value |
|---|---|
| `root_key_id` | banza-root-<YYYY> |
| `root_public_key` | ed25519:<base64url>  *(public key only)* |
| `key_manifest_path` | banza.network/.well-known/banza/key-manifest.json |
| `key_manifest_sha256` | <hex> |
| `brl_path` | banza.network/federation/revocation-list.json |
| `initial_brl_sha256` | <hex> |
| `ceremony_record_sha256` | <hex of this record once completed> |

## 8. Checks performed

| Check | Result |
|---|---|
| Manifest signature verifies against root public key | PASS / FAIL |
| BRL signed by the revocation-domain issuing key | PASS / FAIL |
| Issuing keys domain-separated (certification / revocation / conformance-evidence) | PASS / FAIL |
| No `test-` prefix on any production key id (INV-ROOT-001) | PASS / FAIL |
| Issuing-key validity ≤ 6 months; root ≤ 24 months | PASS / FAIL |
| Publication artifacts contain no `.private` files | PASS / FAIL |
| Dual-custody evidence (§6) all attested | PASS / FAIL |

## 9. Signatures / attestations

| Role | Name / id | Signature | Date |
|---|---|---|---|
| Keyholder 1 | | | |
| Keyholder 2 | | | |
| Witness | | | |

## 10. Redactions policy

Personal/identifying data may be redacted to stable role identifiers in the public copy;
the unredacted attestation is retained under governance control. Redaction may **never**
hide a custody deficiency or any §6 evidence.

## FORBIDDEN ATTACHMENTS (negative controls — must all remain absent)

This record and its directory must contain **NONE** of the following:

- ❌ NO private key material attached (no `.private`, no raw private bytes)
- ❌ NO passphrase attached
- ❌ NO custody secret attached (artifact contents, only IDs)
- ❌ NO HSM PIN attached
- ❌ NO raw root seed material attached
- ❌ NO value from which the root private key could be derived by a single party

> If any forbidden item is present, the ceremony record is invalid and a key-compromise
> incident must be opened (ADR-027 §Phase 8).
