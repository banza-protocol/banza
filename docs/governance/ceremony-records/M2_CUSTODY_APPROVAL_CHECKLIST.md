# M2 Custody Approval Checklist (pre-ceremony)

**This is a pre-ceremony approval checklist — NOT a ceremony record and NOT a key artifact.**
It contains **no secrets and no key material**. Complete it before M2 using placeholders
(`TBD`) — do not invent names, identities, or locations. If any field remains `TBD`, **M2
remains blocked**.

**Authority:** Option A custody decision (`docs/governance/BANZA_ROOT_CUSTODY_DECISION_REQUIRED.md` §9);
ADR-027; `docs/security/ROOT_KEY_CEREMONY_PROCEDURE.md`.
**Evidence rules:** `docs/governance/ceremony-records/README.md` (no secrets, ever).

---

## 1. Status

| Field | Value |
|---|---|
| M2 status | **BLOCKED** — pending completion of this checklist |
| Custody model | `dual_hsm_dual_keyholder` / `2_of_2` (2-HSM / 2+ independent keyholders) |
| Production ceremony allowed | **NO** — until all approvals below are signed |
| Production keys generated | **NO** |
| Real HSM / 2-of-2 custody implemented | TBD (must be YES before ceremony) |

---

## 2. Keyholder approval

| Field | Keyholder 1 | Keyholder 2 |
|---|---|---|
| Name | TBD | TBD |
| Role | TBD | TBD |
| Organization | TBD | TBD |
| Contact | TBD | TBD |
| Independence statement | TBD (independent of KH2 and witness) | TBD (independent of KH1 and witness) |
| Signature | TBD | TBD |
| Date | TBD | TBD |

- [ ] Confirmed: the two keyholders are **distinct** individuals/roles.
- [ ] Confirmed: **neither keyholder can reconstruct the root key alone** (2-of-2).

---

## 3. Custody artifacts

| Field | Artifact 1 | Artifact 2 |
|---|---|---|
| Artifact ID | TBD | TBD |
| Type (HSM module / approved device) | TBD | TBD |
| Holder | Keyholder 1 (TBD) | Keyholder 2 (TBD) |
| Storage location | TBD | TBD |
| Control method | TBD | TBD |
| Evidence reference (redacted) | TBD | TBD |

- [ ] Confirmed: the two artifacts are **independent** (different hardware).
- [ ] Confirmed: **no single artifact can recover the root key alone.**
- [ ] Confirmed: **no artifact secret is stored in the repo** (IDs only; never contents).

---

## 4. Storage locations

| Field | Location 1 | Location 2 | Recovery location (optional) |
|---|---|---|---|
| Location | TBD | TBD | TBD |
| Custodian | TBD | TBD | TBD (governance-controlled) |
| Access policy | TBD | TBD | TBD |
| Physical security | TBD | TBD | TBD |
| Evidence reference (redacted) | TBD | TBD | TBD |

- [ ] Confirmed: the storage locations are **physically separate**.

---

## 5. Witness role

| Field | Witness |
|---|---|
| Name | TBD |
| Role | TBD |
| Organization | TBD |
| Independence statement | TBD (not a keyholder) |
| Signature | TBD |
| Date | TBD |

- [ ] Confirmed: the witness is **not a keyholder**.
- [ ] Confirmed: the witness **validates the dual-custody evidence** (two independent
      keyholders, two artifacts, two locations, no single-party reconstruction).

---

## 6. Recovery procedure approval

| Field | Value |
|---|---|
| Recovery scenario | TBD |
| Required quorum | TBD (must require ≥ 2 independent parties) |
| Required approvers | TBD |
| Evidence generated | TBD (record in `docs/governance/ceremony-records/`, no secrets) |
| Forbidden recovery cases | see below |
| Signature | TBD |
| Date | TBD |

**This procedure MUST explicitly forbid:**
- ❌ single-keyholder recovery
- ❌ single-passphrase recovery
- ❌ recovery from one custody artifact alone
- ❌ recovery without a witness record

- [ ] Confirmed: none of the forbidden recovery cases is permitted.

---

## 7. Emergency revocation procedure approval

| Field | Value |
|---|---|
| Emergency trigger | TBD |
| Who can request | TBD |
| Who can approve | TBD |
| BRL signing key (revocation-domain issuing key) | `banza-brl-YYYYMM` (domain `revocation` — NOT the certification key, NOT the root key) |
| Publication path | `banza.network/federation/revocation-list.json` |
| Evidence required | TBD (signed BRL hash; no secrets) |
| Signature | TBD |
| Date | TBD |

- [ ] Confirmed: the BRL is signed by the **revocation-domain issuing key** (ADR-027 D-003).

---

## 8. Allowed claims sign-off

**Allowed after a successful ceremony** (sign to approve the claim set):
- [ ] offline root
- [ ] dual control / no single unilateral activation
- [ ] root signs only the Key Manifest
- [ ] issuing keys domain-separated (certification / revocation / conformance-evidence)
- [ ] production trust anchor created **only after** ceremony success

**Forbidden until the future migration gate is satisfied**
(`docs/governance/BANZA_ROOT_CUSTODY_FUTURE_MIGRATION.md`):
- ❌ 3-of-5 Shamir active
- ❌ five institutional seats operational
- ❌ institutional custody active
- ❌ certified operator exists
- ❌ production federation live

- [ ] Confirmed: the allowed-claims set is approved and the forbidden claims will not be made.

---

## 9. Final approval

| Field | Value |
|---|---|
| Founder / governance owner | TBD |
| Decision | TBD (APPROVE / HOLD) |
| Signature | TBD |
| Date | TBD |

> **M2 may not start until this checklist is complete and signed.**

---

## 10. Safety rules

- This file must **never** contain private keys, passphrases, HSM PINs, seed material,
  custody secrets, or raw recovery material.
- Evidence references must point to **redacted records only**.
- If any field above remains `TBD`, **M2 remains blocked**.
- This checklist is metadata and approvals only — it is not a ceremony record, not a key
  artifact, and not authorization to generate any key material.
