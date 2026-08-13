# BANZA Ceremony Records

**Status:** Governance evidence directory. No ceremony has been performed; this directory holds no records yet.
**Authority:** ADR-038 (open trust model — trust root architecture); the custody model (`docs/security/ROOT_KEY_CUSTODY_MODEL.md`); `docs/security/ROOT_KEY_CEREMONY_REQUIREMENTS.md`.

## Purpose

This directory is the canonical, governed home for **root-key ceremony records** — the
auditable, witness-signed evidence that a ceremony took place under the approved custody
model. It exists so that any auditor, regulator, or operator can verify *that the ceremony
satisfied dual custody* without ever touching key material.

A ceremony record is **evidence metadata only**. It proves dual custody; it does **not**
contain the root key or any secret needed to use or recover it.

## What is stored here

- The **pre-ceremony approval checklist**
  [`ROOT_KEY_CUSTODY_MODEL.md`](ROOT_KEY_CUSTODY_MODEL.md) — the operational
  vehicle for the decision-note §9 approvals (keyholders, custody, witness, recovery,
  emergency revocation, allowed claims). It is approvals/metadata only — no secrets.
- One ceremony record per root-key ceremony (production) using
  [`ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md`](ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md) (or its JSON equivalent).
- Public artifact hashes (SHA-256) of the Key Manifest, initial BRL, and the record itself.
- Keyholder / witness role attestations and custody-artifact identifiers (IDs, not secrets).
- Storage-location identifiers (where artifacts are held — not their contents).
- Signatures / attestations from the independent witness and keyholders.

Dry-run / rehearsal records (clearly marked `environment: dry-run`) may be stored for
process evidence, but must follow the same no-secrets rules.

## Retention policy

- Ceremony records are retained **permanently** (minimum: the lifetime of the root key
  plus 7 years), as the root of the protocol's audit trail.
- Records are append-only: a record is never edited after signing. Corrections are made by
  appending a new, dated, signed addendum that references the original.

## Access / redaction

- Records are intended to be **publicly auditable**. Personal data (e.g. a keyholder's full
  legal identity) may be redacted to a stable role identifier in the public copy, provided
  the unredacted attestation is retained under governance control.
- Redaction may only remove personal/identifying data — it may **never** be used to hide a
  custody deficiency. The dual-custody evidence itself is not redactable.

## Witness-signature expectations

- Every production record must be signed by an **independent witness** whose role is
  distinct from any keyholder (no single person may hold a keyholder and the witness role).
- The witness attests to: the independence of the two keyholders, the existence of two
  independent custody artifacts in two separate locations, and that no single party could
  reconstruct or activate the root key.

## Hard rules — what must NEVER be stored here

A ceremony record must prove dual custody, **not contain root material**. The following are
**FORBIDDEN** in this directory (in any file, attachment, or field):

- ❌ Private keys (`.private` files or raw private key bytes)
- ❌ Passphrases or encryption passwords
- ❌ Seed material / entropy / mnemonic phrases
- ❌ HSM PINs, HSM admin credentials, or activation cards' secrets
- ❌ Custody-artifact secrets (the contents of a custody artifact, as opposed to its ID)
- ❌ Raw recovery material (anything that, alone, could reconstruct the root key)
- ❌ Any value from which the root private key could be derived by a single party

If any of the above is ever found here, treat it as a key-compromise incident: follow the
compromise-recovery procedure (`docs/security/ROOT_KEY_CEREMONY_REQUIREMENTS.md`) and rotate the affected key.

> **No production key material is ever stored in this directory.** Records are metadata and
> attestations only.
