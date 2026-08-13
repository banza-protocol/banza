# BANZA — Production Trust Path (M2)

> **M2 implementa o protocolo BANZA para produção enquanto protocolo aberto. M2 não activa prestação de serviços de pagamento pelo BANZA.**
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento, não processa transacções, não liquida valores e não movimenta fundos. Os serviços financeiros são prestados por operadores autorizados que implementam o protocolo.

> **M2 prepara o caminho de trust de produção. M2 não gera chaves reais de produção, não assina metadados de protocolo reais e não activa operadores.**

This document defines the **production trust path** for the BANZA trust anchor: the ordered set of
prerequisites, custody requirements, signing flows, evidence, and recovery paths that would have to be
in place before any production key exists. It is the M2-phase consolidation of the existing planning
artifacts — [`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md),
[`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md),
[`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md),
[`ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md`](ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md),
[`BRL_REVOCATION_PLAYBOOK.md`](BRL_REVOCATION_PLAYBOOK.md) and
[`TRUST_TEST_ONLY_BOUNDARY.md`](TRUST_TEST_ONLY_BOUNDARY.md) — into a single production-readiness map.

## Status marker

```
production_trust_ceremony_not_executed = true
m2_prepares_trust_path = true
m2_generates_no_production_keys = true
```

The production root-key ceremony has **not** been executed. No production root key, no production
issuing key, and no production signed protocol metadata exist. Everything below is **prepared but gated**: a
prerequisite list to satisfy under governance, not an action performed in M2. The trust path is
governed by ADR-027 (open trust model — canonical-JSON signing, domain separation), ADR-031
(federation trust evaluation) and ADR-029 (keys never on serving infrastructure).

## Production state model

```
PRE_PRODUCTION → M2_PROTOCOL_IMPLEMENTATION → M2_PROTOCOL_REVIEW
              → M2_PROTOCOL_CANDIDATE → M3_OPERATOR_CANDIDATE → M4_PRODUCTION_NETWORK
```

M4 is future-only and is not activated. The production trust path described here is a
`M2_PROTOCOL_IMPLEMENTATION` artifact: it prepares the trust path so that a later, separately-governed
ceremony *could* run — it does not itself advance the network into M4.

## M2 protocol-gate

Whether the production trust path is coherent enough to proceed is computed **in Rust** by
`engines/banza-production-gate :: validate_m2_protocol_gate`, never in TypeScript. A missing or
incomplete trust path resolves to `M2_BLOCKED_BY_TRUST_PATH_GAP`; a document that claimed the ceremony
had run, that production keys existed, or that an operator was activated would resolve to
`M2_INVALID_FORBIDDEN_ACTIVATION` or `M2_INVALID_REGULATORY_BOUNDARY`. The correct state for this
document today is a **present** trust path that still leaves the gate blocked on execution — because
execution is deliberately out of scope for M2.

## 1. Production root-key prerequisites

Before a production root key may be generated, all of the following must hold (none are satisfied by
publishing this document):

- ADR-027 and ADR-029 frozen and referenced (root offline, keys never on serving infra) — **met at spec level**.
- Governed approval of the ceremony date, participants, and dual-control roles — **planned/gated**.
- Air-gapped ceremony machine with its network interface physically disabled/removed — **planned/gated**.
- Verified ceremony software with recorded SHA-256 hashes — **planned/gated**.
- Independent external audit of the trust architecture commissioned — **planned/gated**.
- HSM (or equivalent offline secure media) provisioned for root custody — **planned/gated**.
- Recovery, rotation, and revocation paths documented (this document, §§8–11) — **met at spec level**.

## 2. Ceremony prerequisites

The ceremony itself is specified in [`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md) (phases P0–P7)
and rehearsed test-only in [`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md). Prerequisites
carried into the production path:

- **Dual control**: Ceremony Officer executes; Ceremony Witness observes and never touches key material.
- **Sealed room**: no network cable, WiFi disabled in hardware, mobile devices collected.
- **Governance approver**: at least one approver authorises the date under governance.
- **Record template**: a signed [`ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md`](ROOT_CEREMONY_EVIDENCE_LOG_TEMPLATE.md)
  is produced only by an actual run — not by M2 preparation.

## 3. Key custody requirements

Per [`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md) and ADR-029:

| Key | Domain | Custody | On serving infra? |
|---|---|---|---|
| `banza-root-YYYY` | root | Offline / air-gapped media + planned HSM; encrypted at rest | **Never** |
| `banza-meta-YYYYMM` | protocol-metadata (issuing) | Offline; public half only in the manifest | Public half only |
| `banza-brl-YYYYMM` | revocation (issuing) | Offline; public half only in the manifest | Public half only |
| `banza-evidence-YYYYMM` | conformance (issuing) | Offline; public half only in the manifest | Public half only |

Private keys are encrypted (GPG / AES-256); the passphrase is stored separately from the key media. Two
copies (`BANZA_KEYS_A`, `BANZA_KEYS_B`) plus a signed paper backup of fingerprints. The root key never
touches the runtime verification path (ADR-027): signed protocol metadata verifies against the issuing public key
published in the root-signed Key Manifest.

## 4. Artifact signing flow

The detailed policy is in
[`PRODUCTION_ARTIFACT_SIGNING_POLICY.md`](PRODUCTION_ARTIFACT_SIGNING_POLICY.md). The trust-path summary:

```
root key ──signs──▶ Key Manifest ──endorses──▶ issuing public keys
                                                  │
        protocol-metadata key ──signs──▶ signed protocol metadata
        BRL-issuing key  ──signs──▶ BANZA Revocation List (BRL)
        conformance key  ──signs──▶ conformance evidence package
```

Every signature uses canonical JSON (ADR-027). No key signs across domains (INV-ROOT-004). In M2 this
flow is **dry-run only** against `test-banza-key-*` material; no production artifact is signed.

## 5. Signing evidence

Each signing operation (in a real, post-M2 ceremony) produces evidence recorded in the Ceremony Record:
the `issuer_key_id`, the artifact SHA-256, the signature, the signer, the witness initials, and a
re-verification PASS. In M2 the evidence schema is **prepared**; no production evidence is emitted. The
evidence-bundle references are indexed by [`AUDIT_EVIDENCE_INDEX.md`](AUDIT_EVIDENCE_INDEX.md).

## 6. Hash manifest

A **hash manifest** binds every published trust artifact to its SHA-256:

| Artifact | Hash field | Purpose |
|---|---|---|
| Key Manifest | `key_manifest_sha256` | Detect tampering of the endorsed issuing keys |
| BRL | `brl_sha256` | Detect tampering of the revocation list |
| Ceremony Record | `ceremony_record_sha256` | Bind the ceremony to its recorded outputs |

The hash manifest is itself a public artifact and is verified end-to-end during publication. In M2 the
hash manifest format is prepared; entries are populated only by a real ceremony.

## 7. Revocation path

Operator revocation and BRL mechanics are in
[`BRL_REVOCATION_PLAYBOOK.md`](BRL_REVOCATION_PLAYBOOK.md). Summary: revocation is decided under
governance, the BRL body is signed by the **revocation-domain** key (`banza-brl-YYYYMM`), published at
`/federation/revocation-list.json`, and enforced **fail-closed** (a missing/stale/unsigned BRL blocks
routing — INV-FEDEVAL-002). BanzAI may verify a published BRL but never decides a revocation.

## 8. Emergency revocation

On BRL-issuing key compromise: rotate the BRL-issuing key, root re-signs a new Key Manifest containing
the new public key, publish an **emergency BRL** with `expires_at` = 1 h signed by the new key, and
verify endpoints. Federation disruption window ≈ 1 h. This is a **planned** path; no live operator
exists to revoke.

## 9. Rotation

| Key | Max validity | Routine rotation | Authority |
|---|---|---|---|
| Root | 24 months | Every 24 months | Root ceremony (two of the three authorities) |
| Protocol-metadata / BRL / Conformance (issuing) | 6 months | Every 6 months | Root re-signs a new manifest |

INV-ROOT-006: issuing ≤ 6 months, root ≤ 24 months. INV-ROOT-003: a stale manifest
(`expires_at < now()`) must not be used. Rotation republishes the manifest at
`/.well-known/banza/key-manifest.json`.

## 10. Recovery

Root-key loss (not compromise) triggers restoration from the second sealed copy (`BANZA_KEYS_B`) and
the paper backup, both verified against the recorded fingerprints. Root-key **compromise** triggers a
full trust reset (§11 of [`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md)): new root, new issuing
keys, new manifest, SDK re-pin, and re-certification of L3+ operators. Recovery drills are rehearsed
test-only; no production recovery has occurred.

## 11. Public-key publication

Only **public** artifacts are published: the Key Manifest (`/.well-known/banza/key-manifest.json`,
24 h TTL) and the BRL (`/federation/revocation-list.json`, ≤ 6 h TTL). The Publication USB is
grep-verified to contain **zero** files matching `private` before it leaves the sealed room. No private
key is ever published, and no publication occurs in M2.

## 12. Strict separation between test and production keys

- Production key IDs follow `banza-root-YYYY`, `banza-meta-YYYYMM`, `banza-brl-YYYYMM`,
  `banza-evidence-YYYYMM`. Test material uses `test-banza-key-YYYY-MM`.
- **INV-ROOT-001:** any `issuer_key_id` beginning with `test-` MUST be rejected by production
  verification. Today **only** `test-` material exists (see
  [`TRUST_TEST_ONLY_BOUNDARY.md`](TRUST_TEST_ONLY_BOUNDARY.md)).
- Test and production key media, endpoints, and evidence are never mixed. A production verifier that
  accepts a `test-` key is a defect.

## 13. Explicit non-claims

- No production root or issuing key exists; this document prepares the path, it does not walk it.
- No real signed protocol metadata is produced; fixtures are not real signed protocol metadata.
- Publishing this document does **not** create an operator, activate federation, emit production
  signed protocol metadata, or make BANZA a PSP. Any licence/authorisation belongs to the authorised operator.

See: [`PRODUCTION_ARTIFACT_SIGNING_POLICY.md`](PRODUCTION_ARTIFACT_SIGNING_POLICY.md),
[`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md),
[`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md),
[`BRL_REVOCATION_PLAYBOOK.md`](BRL_REVOCATION_PLAYBOOK.md),
[`TRUST_TEST_ONLY_BOUNDARY.md`](TRUST_TEST_ONLY_BOUNDARY.md),
[`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md).
