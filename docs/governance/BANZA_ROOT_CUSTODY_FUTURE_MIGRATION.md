# BANZA Root-Key Custody — Future Migration Gate (2-HSM → 3-of-5 Shamir)

**Date:** 2026-06-19
**Type:** Governance gate for a **future** custody migration. Planning only — nothing here is in effect.
**Authority:** ADR-027 (Production Root Architecture) §Future Path; Option A custody decision (`docs/governance/BANZA_ROOT_CUSTODY_DECISION_REQUIRED.md`).
**Status:** **Target / not active.** The institutional 3-of-5 Shamir model described here is a **future** state. It is **not** the current custody model and **must not** be claimed as current.

> **This document is the single formal gate for any future 3-of-5 Shamir custody claim.**
> Until every item in the Evidence Gate (§5) is satisfied, the 3-of-5 model does not exist
> in production and may not be presented as current anywhere.

---

## 1. Current approved model (in effect) — 2-HSM / 2-of-2

The custody model **approved and in effect** for the M2 bootstrap is:

| Property | Value (current) |
|---|---|
| Model | `dual_hsm_dual_keyholder` — 2-HSM / 2+ independent keyholders |
| Quorum | `2_of_2` (both keyholders required; no single unilateral activation) |
| Recovery | sealed, dated, tamper-evident paper backup in a third, governance-controlled location |
| Root usage | offline; signs only the Key Manifest |

This is the model referenced by `contracts/federation/federation-trust.json`,
`docs/governance/BANZA_TRUST_ARCHITECTURE.md`, the public reference §5, and the ceremony
script's fail-closed gate.

## 2. Future institutional target — 3-of-5 Shamir

The long-term target is a 3-of-5 Shamir model in which the root key is split into five
fragments distributed across **five legally and operationally constituted institutional
custody seats** (Regulatório, Bancário, Operadores, Técnico, Interesse Público — design per
`docs/governance/BANZA_TRUST_ARCHITECTURE.md`). Any activation requires a quorum of three seats.

## 3. Why this migration exists

The 3-of-5 model is the strongest decentralization posture: no single institution — not even
the protocol promoters — can control the root key. It is the correct end-state for a
neutral, institution-grade financial protocol. The 2-HSM bootstrap is the honest,
performable starting point that does not require institutions that do not yet exist.

## 4. Why 3-of-5 is NOT active now

- The five institutional seats are **not constituted**: there are no independent,
  legally/operationally ready seat-holders to receive fragments.
- The BANZA Governance Entity that would appoint and govern the seats is **not constituted**.
- No Shamir split is implemented in the ceremony (the script is fail-closed for production).
- Claiming 3-of-5 today would misrepresent the protocol's security posture.

## 5. Evidence Gate — required before any 3-of-5 claim

A 3-of-5 production claim may be made **only after ALL of the following exist and are
verifiable**. This is a conjunction: any missing item keeps the gate closed.

**Governance / legal / operational**
- [ ] Five custody seats **legally and operationally constituted** (real, independent holders).
- [ ] Seat-holder **eligibility rules** defined and applied.
- [ ] **Incompatibility / conflict-of-interest rules** defined and applied.
- [ ] **Signed fragment-holder agreements** for all five seats.
- [ ] A constituted **BANZA Governance Entity** governing the seats.

**Technical**
- [ ] **Real Shamir split** implemented (5 fragments, threshold 3) in the ceremony tooling.
- [ ] **Recovery / reconstruction procedure tested** (quorum reconstruction proven, without
      enabling single-party use).
- [ ] **Emergency compromise procedure** defined (fragment compromise, seat loss).

**Ceremony / evidence**
- [ ] **Ceremony record proving fragment distribution** (per-seat custody, in
      `docs/governance/ceremony-records/`, no fragment secrets stored).
- [ ] **Witness attestations** of independent seat custody and the 3-of-5 quorum.

**Document / contract alignment (must be updated as part of the migration, not before)**
- [ ] **Updated ADR or superseding ADR** authorizing 3-of-5 as the production model
      (ADR-027 §Future Path requires a separate ADR).
- [ ] **`contracts/federation/federation-trust.json`** custody/quorum updated to
      `shamir_secret_sharing` / `3/5` (moved out of `future_custody_target` into the active
      custody fields).
- [ ] **`docs/governance/BANZA_TRUST_ARCHITECTURE.md`** updated to present 3-of-5 as current.
- [ ] **Public reference** (`docs/reference/pt/completa.md` / `docs/reference/en/complete.md` §5 + mirrors)
      updated to state 3-of-5 is in effect.

**Key rotation (the migration act itself)**
- [ ] **Key-rotation ceremony** performed under the new custody model.
- [ ] **Key Manifest re-signed** under the migrated (3-of-5) custody model and republished
      (ADR-027 notes the manifest format already supports this rotation — it changes *who*
      signs, not the format).

When every box above is checked, and only then, the 3-of-5 model becomes the current model
and the future-markers throughout the corpus may be flipped to current.

## 6. Forbidden claims (until the §5 gate is fully satisfied)

- ❌ No "3-of-5 in production" / "3-of-5 is current".
- ❌ No "five institutional seats operational / constituted".
- ❌ No "Shamir fragmentation in production".
- ❌ No "institutional custody" claim before the §5 evidence exists.
- ❌ No **migration by documentation only** — editing docs does not move custody; the
  technical split, the constituted seats, the tested recovery, and the re-signed Key
  Manifest must all exist first.

## 7. Relationship to BLK-01

This document closes the **planning** of the future migration (Commit 4 of the Option A
implementation plan). It does **not** close BLK-01: the M2 bootstrap itself still requires
real HSM / 2-of-2 custody implementation and the remaining decision-note §9 checklist
approvals before any production ceremony may run. The 3-of-5 migration is a **later**
milestone, gated independently by §5 above.

---

*Planning / governance document. No ceremony was run. No production keys were generated. No
key material or custody secret was created. The 3-of-5 model is a future target and is not
in effect.*
