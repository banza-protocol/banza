# Root-Key Custody — Governance Decision Required (BLK-01)

**Date:** 2026-06-19
**Type:** Decision-required note with a **formal recommendation** (§6) and a deferred implementation plan (§8). NOT an implementation. No ceremony script, ADR, or contract was modified.
**Blocks:** Milestone M2 (production root-key ceremony).
**Source finding:** BLK-01 (pre-M2 root-custody readiness review).
**Status:** **APPROVED 2026-06-19 — Option A (2-HSM / 2+ keyholder) for the M2 bootstrap.** See Decision Record below.

> **DECISION RECORD — 2026-06-19 (founder/governance):**
> **Option A is APPROVED** as the BANZA M2 bootstrap root-key custody model.
> - M2 bootstrap custody = **2-HSM / 2+ independent keyholders** (dual control).
> - **3-of-5 Shamir** custody remains the **target future** model after institutionalization.
> - **No 3-of-5 production claim** is allowed until the five custody seats are
>   legally/operationally constituted **and** a real Shamir ceremony is implemented.
> - **No production root-key ceremony may run** until docs, contracts, procedure,
>   script, and the evidence model are aligned with this approved model.
>
> Implementation of Option A is deferred (ceremony not run; no production keys generated).
> BLK-01 remains OPEN until the ceremony is executed and the §9 checklist is fully approved.

---

## 1. The contradiction (three documents, three custody models)

The most foundational security property of the entire BANZA trust chain — how the
root private key is protected — is currently defined three mutually-exclusive ways.

| Source | Custody model stated | Evidence |
|---|---|---|
| **ADR-029** (the ceremony's governing ADR) | Private key bytes **split across 2 HSM modules** in different physical locations; ceremony requires **2+ keyholders**. Multi-party N-of-M is explicitly a **future** upgrade requiring a separate ADR. | ADR-029:239 ("split across 2 HSM modules"), :454 ("2+ keyholders … split across 2 HSM modules"), :562 ("can be upgraded to a multi-signature model … requires a separate ADR"). |
| **TRUST_ARCHITECTURE** + **federation-trust.json** | **Shamir Secret Sharing, 3-of-5**, fragments distributed across **5 institutional seats** (Regulatório, Bancário, Operadores, Técnico, Interesse Público). | TRUST_ARCHITECTURE:68 ("dividida em fragmentos … modelo Shamir"), :72-74 (5 fragments, "3 de 5"), :87-97 (seats); federation-trust.json:17-21 (`"custody": "shamir_secret_sharing", "quorum": "3/5"`). |
| **Ceremony script + procedure** (what is actually executable) | **Single** GPG-AES256-symmetric-encrypted blob, **one passphrase**, held by **one** custodian; the second "copy" is a `cp` of the same blob to a second USB. Implements **neither** split nor M-of-N. | ROOT_KEY_CEREMONY_PROCEDURE.md:528 (`gpg --cipher-algo AES256 --symmetric`), :541 (`cp … usb-b` — a copy, not a split), :584 ("communicated to the designated key custodian (the Ceremony Officer)"), :746 ("may be same person for initial ceremony"). |

There is also internal tension **within** ADR-029: "2 HSM modules" (byte-split) vs. the
script's single encrypted blob; and ADR-029:562 treats multi-party custody as a future
state, directly at odds with the TRUST_ARCHITECTURE/contract "3-of-5 now" claim.

## 2. Why this blocks M2

- M2 generates the **first production root key** — an unrepeatable event. The key
  produced is only as trustworthy as the custody model under which it is created.
- The invariant `INV-ROOT-007` ("no single entity controls the root") is
  **literally false** under the script as written (one custodian, one passphrase).
- The 3-of-5 Shamir model is **presented to regulators, banking partners, and
  investors** (TRUST_ARCHITECTURE is explicitly that audience). Performing a
  single-custodian ceremony while documenting 3-of-5 would be a material
  misrepresentation of the protocol's security posture.
- A precondition for 3-of-5 — five **constituted** institutional seats — does **not
  yet exist**: the BANZA Governance Entity is not constituted (TRUST_ARCHITECTURE
  bootstrap clause), so there are no independent seat-holders to receive fragments.

## 3. Option A — 2-HSM / dual-custodian (bootstrap model)

Adopt ADR-029's stated model as the **first production** custody model.

**Docs to update (to make all three agree):**
- `docs/governance/BANZA_TRUST_ARCHITECTURE.md` — replace the "Shamir 3-of-5 across 5 seats"
  section with the 2-HSM / 2-of-2-keyholder bootstrap model; record 3-of-5 as the
  **target post-institutionalization** model (consistent with ADR-029:562).
- `contracts/federation/federation-trust.json:17-21` — change `custody` /`quorum`
  from `shamir_secret_sharing` / `3/5` to the chosen bootstrap descriptor
  (e.g. `dual_hsm` / `2_of_2`).
- `docs/reference/pt/completa.md` / `docs/reference/en/complete.md` §5 (Confiança) — align any custody
  summary.

**Ceremony script changes needed (deferred until approval):**
- Implement genuine 2-party custody: either real Shamir 2-of-2 fragmenting, or
  per-keyholder HSM-held shares — replacing the single GPG blob + `cp`. The current
  `cp usb-a → usb-b` is a copy, not custody separation, and must change.
- Distinct passphrases / hardware per keyholder; no single-custodian fallback.

**Operational / legal implications:**
- **Bootstrappable today** by the protocol promoters (2 keyholders, 2 HSM modules);
  does not require constituted institutional seats.
- Weaker decentralization story than 3-of-5; must be **described honestly** as a
  bootstrap measure, not as institutional custody.
- Requires 2 HSM modules + 2 trusted keyholders + 2 physically separate safes.
- NEEDS-LEGAL: whether software-CSPRNG-on-air-gapped-laptop meets the institutional
  bar, or whether certified HSM hardware is mandatory, is a security-policy decision.

## 4. Option B — Shamir 3-of-5 across institutional seats (target model)

Adopt the TRUST_ARCHITECTURE / contract model as the **first production** model.

**Docs to update:**
- `decisions/adr/ADR-029` — would need a **superseding ADR** (its stated model is 2-HSM,
  with N-of-M as a future upgrade requiring a separate ADR). This is the larger
  governance action.
- `docs/governance/BANZA_TRUST_ARCHITECTURE.md` — already states 3-of-5; confirm seat
  definitions and recovery/continuity match.
- `contracts/federation/federation-trust.json` — already `3/5`; confirm.

**Ceremony script changes needed (deferred until approval):**
- Implement real Shamir secret sharing (split into 5, threshold 3) and per-seat
  fragment distribution + custody receipts.
- Add quorum-reconstruction + recovery procedures and witness/seat attestations.

**Operational / legal implications:**
- **Not performable until the 5 institutional seats are constituted** — i.e. M2
  becomes blocked on institutional/governance constitution (regulatory, banking,
  operators, technical, public-interest seat-holders identified and onboarded).
- Strongest custody/decentralization posture; matches the marketed model.
- NEEDS-LEGAL/GOVERNANCE: seat eligibility, incompatibility rules, fragment-holder
  agreements, and the constitution of the Governance Entity are prerequisites.

## 5. Recommendation (requires approval — not implemented)

**Recommended: Option A (2-HSM / dual-custodian) for the first production root, with
3-of-5 Shamir recorded as the explicit post-institutionalization target.**

Reasoning:
1. **Performability.** Option B's precondition (5 constituted seats + a constituted
   Governance Entity) does not exist today; choosing it blocks M2 on institutional
   constitution of unknown duration. Option A is performable by the protocol
   promoters now.
2. **ADR alignment.** ADR-029 — the ceremony's governing authority — already
   specifies 2-HSM and already frames multi-party custody as a *future* upgrade
   needing a separate ADR (ADR-029:562). Option A needs documentation alignment;
   Option B needs a superseding ADR.
3. **Honesty.** Adopting A and truthfully labelling it a bootstrap model removes the
   "marketed 3-of-5 vs single-custodian reality" misrepresentation immediately,
   without overstating decentralization.
4. **Upgrade path is built in.** ADR-029:562 already notes the Key Manifest format
   supports a later multi-sig/Shamir upgrade by re-signing the manifest under the
   new custody model — so moving A → B later is a planned rotation, not a redesign.

**However:** even under Option A, the ceremony script must first be upgraded to
implement genuine 2-party custody (the current single GPG blob + `cp` does not
satisfy "no single entity controls the root"). That script change is **deferred
until this decision is approved** and must not be made now.

This recommendation is advisory. The founder/governance owner must explicitly choose
A or B before any M2 work begins.

## 6. Recommended decision (for sign-off)

> **Recommended decision:**
> Adopt **Option A — 2-HSM / 2+ independent keyholder custody** for the **M2 bootstrap**.
> **Defer Option B — 3-of-5 Shamir custody** to a later **institutionalization
> milestone**, after the five custody seats are legally and operationally constituted.

### Why Option A is recommended for M2
- **Performable now.** Option A can be carried out by the protocol promoters with 2
  HSM modules and 2 independent keyholders. It does not depend on constituting the
  five institutional seats or the BANZA Governance Entity (which do not yet exist).
- **Already the ADR-029 model.** ADR-029 — the ceremony's governing authority —
  already specifies 2-HSM / 2+ keyholders and already frames multi-party N-of-M as a
  *future* upgrade requiring a separate ADR (ADR-029:562). Option A needs only
  documentation alignment, not a superseding ADR.
- **Honest and auditable.** A 2-HSM / 2-keyholder ceremony with distinct custody
  artifacts gives genuine dual control (satisfying `INV-ROOT-007` — "no single
  entity controls the root") and is fully auditable, provided it is clearly labelled a
  bootstrap model and not dressed up as institutional 3-of-5 custody.
- **Removes the misrepresentation now.** It immediately resolves the "marketed 3-of-5
  vs single-custodian reality" gap without overstating decentralization.

### Why Option B remains the target but must NOT be claimed now
- **Strongest posture, but not yet real.** 3-of-5 Shamir across independent
  institutional seats is the correct long-term decentralization model and should remain
  the stated target.
- **Preconditions absent.** It requires five constituted, legally/operationally ready,
  independent seat-holders (Regulatório, Bancário, Operadores, Técnico, Interesse
  Público) and a constituted Governance Entity — none of which exist today.
- **Claiming it now would be false.** Until the seats are real and the fragmentation is
  actually implemented, any "3-of-5 in production" / "five institutional seats" claim
  is a material misrepresentation. Option B is recorded as a future milestone, not a
  current capability.

### If Option A is approved — documents that must change
*(Listed for planning only; not changed by this note. See §8 for commit grouping.)*
- `decisions/adr/ADR-029` — affirm 2-HSM / 2+ keyholder as the **bootstrap** model and the
  current basis for M2; keep N-of-M / 3-of-5 explicitly as a future upgrade. (No
  superseding ADR needed — this matches ADR-029's existing position.)
- `docs/governance/BANZA_TRUST_ARCHITECTURE.md` — replace the "Shamir 3-of-5 across 5
  operational seats" presentation with the 2-HSM / 2-of-2-keyholder **bootstrap** model;
  reframe 3-of-5 + the five seats as the **target post-institutionalization** state
  (design, not nominations already made).
- `contracts/federation/federation-trust.json:17-21` — change `"custody"` /`"quorum"`
  from `shamir_secret_sharing` / `3/5` to the bootstrap descriptor
  (e.g. `dual_hsm_dual_keyholder` / `2_of_2`).
- `docs/security/ROOT_KEY_CEREMONY_PROCEDURE.md` — replace the single-custodian GPG
  blob + `cp` procedure with a 2-HSM / 2-independent-keyholder custody procedure (or, if
  HSM hardware is unavailable, mark the script dry-run/test-only and require a
  production manual with two independent custody artifacts — see §8 commit 2).
- `docs/reference/pt/completa.md` / `docs/reference/en/complete.md` §5 (Confiança) — align any custody
  summary to the bootstrap model.

### If Option A is approved — script changes that must be implemented
*(Deferred; not implemented by this note.)*
- Remove the single-custodian behaviour: the current `gpg --symmetric` single-passphrase
  blob copied to two USBs (`cp usb-a → usb-b`) is **one** custody artifact, not two.
- Implement genuine 2-party custody: either (a) two HSM-held shares (one per keyholder,
  different hardware/locations), or (b) a real 2-of-2 split — such that no single
  keyholder/passphrase can reconstruct the root key.
- Distinct credentials per keyholder; **no single-custodian fallback** ("may be same
  person for initial ceremony" must be removed).

### Claims that must be REMOVED or reframed under Option A
- ❌ No "**3-of-5 Shamir in production**" claim anywhere until it is actually implemented.
- ❌ No "**five institutional seats already operational / constituted**" claim.
- ❌ No "**Shamir fragmentation in production**" claim unless the fragmentation is real.
- ❌ No language implying institutional/decentralized custody when the bootstrap is
  2 promoter-held keyholders.

### Claims that REMAIN ALLOWED under Option A (after a successful 2-HSM ceremony)
- ✅ The **root key is offline** (air-gapped; never on an online system).
- ✅ **Dual control / no single unilateral activation** — *provided* 2-HSM / 2+
  keyholder custody is actually implemented (two independent custody artifacts).
- ✅ The **root signs only the Key Manifest** (never certificates, BRLs, or evidence).
- ✅ **Issuing keys are separated by domain** (certification / revocation /
  conformance-evidence).
- ✅ **Production trust begins only after a successful ceremony** — before that, the
  network is pre-production with no production trust anchor.

## 7. Claims matrix (quick reference)

| Claim | Allowed under Option A bootstrap? |
|---|---|
| Offline / air-gapped root | ✅ Yes |
| Dual control, no single unilateral activation | ✅ Yes — only if 2-HSM/2-keyholder is implemented |
| Root signs only Key Manifest | ✅ Yes |
| Issuing keys domain-separated | ✅ Yes |
| Production trust begins only after ceremony | ✅ Yes |
| 3-of-5 Shamir in production | ❌ No (future target only) |
| Five institutional seats operational | ❌ No (not constituted) |
| Shamir fragmentation in production | ❌ No (unless actually implemented) |

## 8. Implementation Plan if approved (NOT implemented in this note)

When (and only when) Option A is signed off, implement in this commit order. Each
commit is scoped so the documentation aligns *before* the executable ceremony changes,
and so no production key is generated until verification/evidence is in place.

**Commit 1 — ADR / document alignment**
- `decisions/adr/ADR-029` — affirm 2-HSM / 2+ keyholder as the bootstrap basis for M2; keep
  3-of-5 / N-of-M as a future upgrade.
- `docs/governance/BANZA_TRUST_ARCHITECTURE.md` — bootstrap custody as current; 3-of-5 +
  five seats as target post-institutionalization.
- `contracts/federation/federation-trust.json` — `custody`/`quorum` →
  `dual_hsm_dual_keyholder` / `2_of_2`.
- `docs/security/ROOT_KEY_CEREMONY_PROCEDURE.md` — dual-custody procedure (or dry-run
  marking + production manual, per commit 2).

**Commit 2 — Ceremony script alignment**
- Remove the single-custodian GPG-blob behaviour (`gpg --symmetric` + `cp usb-a→usb-b`).
- Implement 2-HSM / 2+ keyholder custody (two independent custody artifacts; no single
  passphrase reconstructs the key).
- **OR**, if HSM hardware is not yet available: explicitly mark the script
  **dry-run / test-only** and author a **production ceremony manual** that requires two
  independent custody artifacts held by two independent keyholders — so a production
  ceremony cannot be run from the current single-custodian script.

**Commit 3 — Verification / evidence**
- The ceremony record MUST prove **dual custody** (two distinct custody artifacts,
  two keyholders, two storage locations).
- The witness record MUST identify the **independent keyholder roles** (no
  "same person" fallback).
- The output directory MUST NOT contain root key material recoverable under a **single**
  passphrase (the current single-blob output is non-compliant and must change).

**Commit 4 — Future migration plan**
- Create a later milestone (post-M2) for **3-of-5 Shamir institutional custody**.
- Define the evidence required before the 3-of-5 claim may be made: five constituted
  independent seats, signed fragment-holder agreements, a constituted Governance Entity,
  and a real Shamir split implemented in the ceremony — verified by a key-rotation
  ceremony that re-signs the Key Manifest under the new custody model (ADR-029:562 notes
  the manifest format already supports this rotation).

## 9. Decision checklist — approvals required before M2 may start

Before any M2 work begins, the founder/governance owner must explicitly approve each. The
operational vehicle for these approvals is
[`docs/governance/ceremony-records/M2_CUSTODY_APPROVAL_CHECKLIST.md`](../governance/ceremony-records/M2_CUSTODY_APPROVAL_CHECKLIST.md)
(a pre-ceremony checklist — placeholders only, no secrets):

- [x] **Custody model selected** — APPROVED 2026-06-19: Option A (2-HSM / 2+ keyholders).
- [ ] **List of keyholders / custodians** (≥ 2 independent individuals/roles).
- [ ] **Custody evidence required** (what artifacts prove dual custody).
- [ ] **Ceremony witness roles** (independent witness; keyholder roles distinct).
- [ ] **Storage locations** (≥ 2 physically separate, controlled, locked).
- [ ] **Recovery procedure** (how the root is reconstructed/replaced if a custody
      artifact is lost — without enabling single-party recovery).
- [ ] **Emergency revocation procedure** (BRL emergency issuance / issuing-key
      compromise response).
- [ ] **Allowed claims after ceremony** (sign off the §6/§7 allowed-vs-forbidden list).

**Remaining pending items (as of 2026-06-19):** 7 of 8 above are still unapproved — only
the custody model is selected. In addition, the M2 bootstrap still requires the **technical
implementation of real HSM / 2-of-2 custody** (the ceremony script is currently fail-closed;
it generates no production key material). Until every box is approved **and** that custody
implementation exists, **BLK-01 remains open and M2 must not start.**

The Option A implementation is recorded across the aligned docs and contracts, the
fail-closed ceremony-script gate, the evidence model + ceremony records, and the
future-migration gate. The **future** 3-of-5 Shamir migration is now gated by
`docs/governance/BANZA_ROOT_CUSTODY_FUTURE_MIGRATION.md` — it is a later milestone and not
part of M2.

---

*Read-only decision note. No ceremony script, ADR, or contract custody field was
modified by this note. The custody field in `federation-trust.json` is intentionally
left unchanged pending the decision above. The §8 plan is deferred and conditional on
sign-off of §6.*
