# BANZA Production Root Readiness Report

**Document ID:** BANZA-PRODUCTION-ROOT-ARCHITECTURE-001  
**Date:** 2026-05-31  
**Authority:** ADR-038 (open trust model — legacy trust root architecture)  
**Status:** FINAL  

---

## Executive Summary

| Question | Answer |
|----------|--------|
| Is the production root architecture frozen? | **YES** — ADR-038 accepted |
| Can BANZA sign production signed protocol metadata (operate the production trust root) today? | **NO — root key does not yet exist** |
| Is the architecture sound for production signing? | **YES** |
| What remains before signing the first production signed protocol metadata? | **5 operational items (no code blockers)** |

The architecture is complete. The blocker is not design — it is the offline key generation ceremony that must happen before any issuing keys can be activated.

---

## Phase 1 — Current State Audit

### What exists today

| Component | State | Notes |
|-----------|-------|-------|
| Signed protocol metadata schema (`contracts/production/signed-protocol-metadata.production.schema.json`) | Complete | `issuer_key_id` field ready for production key IDs |
| Signed protocol metadata signing (`trust_root.py` — `sign_metadata`) | Test-mode | Ephemeral keypair per run; test key ID format |
| BRL signing (`trust_root.py` — `sign_brl`, `generate_signed_brl`) | Test-mode | Same ephemeral keypair; test key ID format |
| Evidence signing (`trust_root.py` — `sign_evidence_package`) | Test-mode | Same ephemeral keypair |
| Key manifest generation (`trust_root.py` — `generate_key_manifest`) | Stub | Structure correct; not published anywhere |
| `issuer_key_id` convention | Test only | `test-banza-key-YYYY-MM`; no production convention defined |
| BANZA root key | **Does not exist** | No HSM, no ceremony, no key material |
| BANZA protocol-metadata signing key | **Does not exist** | Blocked by root key |
| BANZA BRL-issuing key | **Does not exist** | Blocked by root key |
| BANZA conformance key | **Does not exist** | Blocked by root key |
| Key Manifest endpoint | **Does not exist** | Blocked by root key |
| BRL endpoint (`banza.network/federation/revocation-list.json`) | **Does not exist** | Blocked by BRL-issuing key |
| Production `issuer_key_id` convention | **Now frozen** | ADR-038: `banza-{domain}-{YYYYMM}` |

### What the current test-mode root does well

The ephemeral test root in `trust_root.py` is the correct model for the production root — just without persistence or HSM storage:

- ed25519 algorithm (correct)
- Canonical JSON signing (correct, per ADR-038)
- `issuer_key_id` embedded in all signed artifacts (correct)
- Separate sign/verify functions for signed protocol metadata, BRLs, and evidence (correct)
- `generate_key_manifest()` exists with the correct structure (correct)

The production root requires the same logic with persistence, HSM storage, and publication.

### Production gaps identified

| Gap | Severity | Blocks |
|-----|----------|--------|
| No root key exists | CRITICAL | Everything |
| No issuing keys exist | CRITICAL | All signed protocol metadata signing |
| No Key Manifest published | CRITICAL | Offline operator verification |
| No BRL endpoint | HIGH | Federation revocation enforcement |
| No production `issuer_key_id` in any SDK | HIGH | Production signed protocol metadata verification |
| `INV-ROOT-001` not enforced in conformance runner | MEDIUM | Production vs test key separation |
| Key Manifest schema not a contract in `contracts/` | LOW | Formal contract coverage |

---

## Phase 2 — Root Authority Model (Frozen)

The following boundaries are established by ADR-038 and are non-negotiable:

### BANZA is the sole trust authority

```
Operators
    ↑
  BanzAI    ← verifies trust, evaluates conformance
    ↑
  BANZA     ← signs signed protocol metadata, signs BRLs, controls root
```

No operator participates in trust issuance. BanzAI explains but never authorizes.

### The Root key never touches the runtime path

The Root key signs Key Manifests only. Signed protocol metadata verification proceeds:

```
signed protocol metadata → issuer_key_id → Key Manifest → issuing public key → verify signature
```

The Root key is never present in this path. It only appears when the Key Manifest needs to be updated (issuing key rotation, ~every 6 months).

### What BANZA signs vs what BANZA delegates

| Artifact | BANZA Root | BANZA Protocol-Metadata | BANZA BRL-Issuing | BANZA Conformance | BanzAI |
|----------|:----------:|:------------------:|:-----------------:|:-----------------:|:------:|
| Key Manifest | **YES** | No | No | No | Never |
| Signed protocol metadata | No | **YES** | No | No | Never |
| BANZA Revocation List | No | No | **YES** | No | Never |
| Evidence package | No | No | No | **YES** | Never |

---

## Phase 3 — Key Hierarchy (Frozen)

```
BANZA Root Key (offline, HSM, 24-month max)
    │
    └── signs → BANZA Key Manifest
                    │
                    ├── banza-meta-YYYYMM    → signed protocol metadata
                    ├── banza-brl-YYYYMM     → BANZA Revocation Lists
                    └── banza-evidence-YYYYMM → conformance evidence packages
```

**Selected:** Root + Domain Issuing Keys (ADR-038, Option B + D)

**Rejected alternatives:**
- Single Root Key: root would need to be online for routine signing of signed protocol metadata; rejected
- Full CA chain in signed protocol metadata: requires breaking changes to the `signed-protocol-metadata.production.schema.json` schema; rejected
- Multi-Sig Council (D): bootstrapping problem + governance complexity; deferred to a future decision

---

## Phase 4 — Key Lifecycle (Frozen)

| Key | Max validity | Routine rotation | Emergency rotation |
|-----|-------------|-----------------|-------------------|
| Root | 24 months | Every 24 months | On compromise |
| Protocol-metadata | 6 months | Every 6 months | On compromise |
| BRL-issuing | 6 months | Every 6 months | On compromise |
| Conformance | 6 months | Every 6 months | On compromise |
| Signed protocol metadata (L3+) | 90 days | Before expiry | BRL suspension |
| Signed protocol metadata (L0–L2) | 12 months | Before expiry | BRL suspension |

### `issuer_key_id` naming convention (frozen)

| Context | Format | Example |
|---------|--------|---------|
| Production root | `banza-root-YYYY` | `banza-root-2026` |
| Production protocol-metadata | `banza-meta-YYYYMM` | `banza-meta-202608` |
| Production BRL-issuing | `banza-brl-YYYYMM` | `banza-brl-202608` |
| Production conformance | `banza-evidence-YYYYMM` | `banza-evidence-202608` |
| Test (all contexts) | `test-banza-key-YYYY-MM` | `test-banza-key-2026-05` |

**INV-ROOT-001:** Any `issuer_key_id` beginning with `test-` MUST be rejected by production signed protocol metadata verification.

---

## Phase 5 — Signing Authority Matrix (Frozen)

| Artifact | Signing key | Domain | Verified against |
|----------|-------------|-----------------|-----------------|
| Signed protocol metadata | banza-meta-YYYYMM | protocol-metadata | Key Manifest issuing pubkey |
| BANZA Revocation List | banza-brl-YYYYMM | revocation | Key Manifest issuing pubkey |
| Conformance evidence package | banza-evidence-YYYYMM | conformance-evidence | Key Manifest issuing pubkey |
| BANZA Key Manifest | banza-root-YYYY | root | Root pubkey (SDK-pinned) |
| Operator key rotation request | operator's own current key | n/a | Operator's signed protocol metadata pubkey |

---

## Phase 6 — Publication Model (Frozen)

| Resource | URL | Cache TTL | Update trigger |
|----------|-----|-----------|----------------|
| Key Manifest | `https://banza.network/.well-known/banza/key-manifest.json` | 24 hours | Issuing key rotation |
| Key Archive | `https://banza.network/.well-known/banza/key-archive.json` | Immutable per version | Historical verification |
| BRL | `https://banza.network/federation/revocation-list.json` | 6 hours (ADR-040) | Revocation / suspension |
| Emergency BRL | Same URL, `expires_at` set to 1 hour | 1 hour | Issuing key compromise |

Key Manifests are also bundled in BANZA SDK releases and pinned in the conformance runner. Offline verification does not require network access.

---

## Phase 7 — Compromise Recovery (Frozen)

| Scenario | Recovery path | Federation disruption |
|----------|--------------|----------------------|
| Conformance key compromise | Rotate key, invalidate affected evidence, re-run conformance | None (evidence only) |
| BRL-issuing key compromise | Rotate key, publish emergency BRL with new key | 1–6 hours |
| Protocol-metadata key compromise | Rotate key, suspend affected operators pending re-verification | Days |
| Root key compromise | Full trust reset: new root, new issuing keys, new manifest, SDK update, ALL L3+ re-establish trust | Days–weeks |

Full step-by-step procedures are defined in ADR-038.

---

## Phase 8 — BanzAI Alignment (Frozen)

BanzAI may verify trust. BanzAI may never grant it.

| Action | BanzAI permitted |
|--------|:----------------:|
| Verify signed protocol metadata signature | Yes |
| Execute the federation trust-evaluation protocol (ADR-040) | Yes |
| Fetch and verify BRL | Yes |
| Run conformance suite | Yes |
| Generate signed evidence packages (via BANZA conformance infrastructure) | Yes |
| Sign signed protocol metadata | **No** |
| Sign BRLs | **No** |
| Hold any production BANZA private key | **No** |
| Make operator approval decisions | **No** |

This boundary is permanent. It follows from ADR-001 (BANZA as protocol authority) and ADR-003 (operator separation). An AI system that can grant trust is a trust authority — BANZA does not delegate trust authority.

---

## Phase 9 — Production Readiness Verdict

### Can BANZA sign production signed protocol metadata (operate the production trust root)?

**Not yet. The root key does not exist.**

The architecture is sound, complete, and frozen. The protocol contracts are ready. The conformance runner is ready. The only blocker is the offline key generation ceremony, which has not yet occurred.

### What remains before signing the first production signed protocol metadata

The following 5 items must be completed in the order listed. Each depends on the previous.

| # | Item | Type | Owner | Depends on |
|---|------|------|-------|-----------|
| **1** | Root key generation ceremony | Operational event | BANZA | Nothing — this is the unblocked starting point |
| **2** | Protocol-metadata, BRL-issuing, and conformance keys generated and endorsed in initial Key Manifest (root-signed) | Operational + artifact | BANZA | Item 1 |
| **3** | Key Manifest published at `banza.network/.well-known/banza/key-manifest.json` and BRL endpoint live at `banza.network/federation/revocation-list.json` | Infrastructure | BANZA | Item 2 |
| **4** | BANZA SDK v1.0 released with pinned Key Manifest and production `issuer_key_id` in verification logic | SDK release | BANZA | Item 2 |
| **5** | `INV-ROOT-001` enforced in conformance runner: reject `test-` key IDs in production mode | Code change | BANZA | Item 2 |

After these 5 items are complete, BANZA can safely sign the first production signed protocol metadata.

### What is NOT required before signing the first production signed protocol metadata

- No ADR changes (ADR-038 is the final word)
- No contract changes (the signed protocol metadata schema already supports production `issuer_key_id`)
- No conformance test changes (the conformance suite already tests everything it needs to test)
- No BanzAI changes (BanzAI already verifies signatures correctly)

---

## Phase 10 — Updated Production Blockers

After ADR-038:

| Blocker | Before | After |
|---------|--------|-------|
| #1 ADR-021 — certification level architecture | Resolved (prior session) | — |
| #2 Production BANZA Root key establishment | **Architecture undefined** | **Architecture frozen (ADR-038)** |
| #3 Real two-operator interoperability test | Open | Open — not addressed in this task |

**Blocker #2 status change:** From "architecture undefined, cannot proceed" to "architecture frozen, 5 operational items remain."

The 5 operational items blocking first production signing are all in BANZA's hands. No protocol changes are required. No further ADR is required before beginning the key ceremony.

---

## Appendix — ADR-038 Invariants Summary

| ID | Statement |
|----|-----------|
| INV-ROOT-001 | `test-` prefixed `issuer_key_id` MUST be rejected in production |
| INV-ROOT-002 | Key Manifest MUST be root-signed; unsigned manifest = rejected |
| INV-ROOT-003 | Stale Key Manifest (`expires_at < now()`) MUST NOT be used |
| INV-ROOT-004 | Root key MUST NOT sign signed protocol metadata, BRLs, or evidence |
| INV-ROOT-005 | Issuing key not in a valid Key Manifest MUST NOT be used for verification |
| INV-ROOT-006 | Issuing key max validity: 6 months. Root key max validity: 24 months |

These extend the INV-FEDEVAL-* series from ADR-040.
