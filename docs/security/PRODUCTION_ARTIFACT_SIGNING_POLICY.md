# BANZA — Production Artifact Signing Policy (M2)

> **M2 implementa o protocolo BANZA para produção enquanto protocolo aberto. M2 não activa prestação de serviços de pagamento pelo BANZA.**
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento, não processa transacções, não liquida valores e não movimenta fundos. Os serviços financeiros são prestados por operadores autorizados que implementam o protocolo.

This policy defines **which protocol artifacts get signed, by which signing domain, with what evidence,
and how they are verified** on the BANZA production trust path. It is the signing companion to
[`PRODUCTION_TRUST_PATH.md`](PRODUCTION_TRUST_PATH.md) and is governed by ADR-038 (open trust model —
canonical-JSON signing, domain separation), ADR-040 (federation trust evaluation) and ADR-028
(keys never on serving infrastructure). It is **prepared but gated**: no real signing happens in M2.

## Status marker

```
production_trust_ceremony_not_executed = true
production_signing_is_dry_run_only = true
no_real_artifact_signed_in_m2 = true
```

Signing described here is **dry-run / test-only** against `test-banza-key-*` material. No production key
exists, so no production artifact is signed. The rule that this policy exists to fix in place is:
**no real signing happens in M2.**

## Production state model & M2 gate

```
PRE_PRODUCTION → M2_PROTOCOL_IMPLEMENTATION → M2_PROTOCOL_REVIEW
              → M2_PROTOCOL_CANDIDATE → M3_OPERATOR_CANDIDATE → M4_PRODUCTION_NETWORK
```

M4 is future-only and not activated. Whether the signing policy is coherent for the production path is
computed **in Rust** by `engines/banza-m2-protocol-gate :: validate_m2_protocol_gate`, never in
TypeScript. A document that claimed real signing had occurred, that a production certificate was
emitted, or that an operator was activated would resolve to `M2_INVALID_FORBIDDEN_ACTIVATION` or
`M2_INVALID_REGULATORY_BOUNDARY`. A missing signing policy on the trust path resolves to
`M2_BLOCKED_BY_TRUST_PATH_GAP`.

## 1. What protocol artifacts get signed

| Artifact | Signed by (domain) | Where published | Verified by |
|---|---|---|---|
| **Key Manifest** (endorses all issuing keys) | Root key (`banza-root-YYYY`) | `/.well-known/banza/key-manifest.json` | Everyone — sole basis for trusting an issuing key |
| **Key manifests on rotation** | Root key | same endpoint | SDK pins + live fetchers |
| **Signed protocol metadata** | Protocol-metadata key (`banza-meta-YYYYMM`) | Held by operator, presented in federation | Peer operators, conformance runner |
| **BANZA Revocation List (BRL)** | BRL-issuing key (`banza-brl-YYYYMM`) | `/federation/revocation-list.json` | Peer operators, conformance runner |
| **Conformance evidence package** | Conformance key (`banza-evidence-YYYYMM`) | BANZA certification review | BANZA certification review |
| **Evidence-bundle references** | Referenced by hash (indexed, not separately root-signed) | [`AUDIT_EVIDENCE_INDEX.md`](AUDIT_EVIDENCE_INDEX.md) | External auditor |

The root signature on the Key Manifest is the **only** basis for trusting any issuing key: an issuing
key that does not appear in a valid, root-signed Key Manifest is not a BANZA key (ADR-038).

## 2. Signing domains (root vs issuing vs revocation)

Per ADR-038 / ADR-028, keys are **domain-separated** and no key signs across domains
(INV-ROOT-004):

| Domain | Key | Signs | Never signs |
|---|---|---|---|
| **root** | `banza-root-YYYY` | Key Manifest only | operators, payments, licences |
| **delegated / protocol-metadata** | `banza-meta-YYYYMM` | Signed protocol metadata + releases | Manifest, BRL, evidence |
| **issuing / revocation** | `banza-brl-YYYYMM` | BRL | Manifest, signed protocol metadata, evidence |
| **issuing / conformance** | `banza-evidence-YYYYMM` | Conformance evidence | Manifest, signed protocol metadata, BRL |

The root key is **offline** and touches the Key Manifest only; issuing keys sign the actual protocol
artifacts. Domain separation bounds the blast radius of a compromise to a single domain (ADR-038). The
**revocation** domain is deliberately isolated from the **protocol-metadata** domain so that a
protocol-metadata-signing compromise cannot forge a BRL and vice-versa.

## 3. Signing evidence

Every signing operation (in a real, post-M2 ceremony) records, per artifact:

- `issuer_key_id` (must not begin with `test-` in production — INV-ROOT-001);
- the canonical-JSON bytes actually signed (ADR-038);
- the artifact SHA-256;
- the signature;
- the signer (Officer) and the Witness initials;
- a re-verification PASS against the endorsed public key.

In M2 the evidence schema is **prepared**; no production evidence is produced. Signing evidence is
indexed for external audit via [`AUDIT_EVIDENCE_INDEX.md`](AUDIT_EVIDENCE_INDEX.md) and
[`CONTROL_EVIDENCE_MAP.md`](CONTROL_EVIDENCE_MAP.md).

## 4. Hash manifest

A **hash manifest** binds each signed artifact to its SHA-256 so tampering is detectable independently
of the signature check:

| Entry | Binds |
|---|---|
| `key_manifest_sha256` | The root-signed Key Manifest |
| `brl_sha256` | The current BRL |
| `metadata_sha256[]` | Each signed protocol metadata artifact |
| `evidence_sha256[]` | Each conformance evidence package |
| `ceremony_record_sha256` | The ceremony that produced the keys |

The hash manifest is a public artifact. In M2 the format is prepared; entries are populated only by a
real ceremony. See the trust-path summary in
[`PRODUCTION_TRUST_PATH.md`](PRODUCTION_TRUST_PATH.md) §6.

## 5. Verification steps

A verifier (peer operator, conformance runner, or auditor) checks, in order:

1. Fetch the Key Manifest; verify the **root** signature; reject if `expires_at < now()` (INV-ROOT-003).
2. Confirm the artifact's `issuer_key_id` appears in the manifest with the matching **domain** and
   `status: "active"`.
3. Reject any `issuer_key_id` beginning with `test-` (INV-ROOT-001).
4. Verify the artifact signature against the endorsed issuing public key using canonical JSON (ADR-038).
5. Recompute the artifact SHA-256 and match it against the hash manifest.
6. For a BRL: enforce **fail-closed** — a missing / stale / unsigned / wrongly-signed BRL blocks routing
   (INV-FEDEVAL-002; see [`BRL_REVOCATION_PLAYBOOK.md`](BRL_REVOCATION_PLAYBOOK.md)).
7. Confirm validity bounds: issuing ≤ 6 months, root ≤ 24 months (INV-ROOT-006).

Any FAIL stops verification; there is no "allow by default" path.

## 6. No real signing happens in M2 (dry-run / test-only)

- All signing rehearsals use `test-banza-key-*` material and are rejected by production verification
  (INV-ROOT-001).
- No production root or issuing key exists; therefore **no production Key Manifest, signed protocol metadata, BRL, or
  evidence package is signed** in M2.
- A dry-run produces a rehearsal record only — it does **not** publish to production endpoints and does
  **not** complete the ceremony (see [`ROOT_KEY_CEREMONY_RUNBOOK.md`](ROOT_KEY_CEREMONY_RUNBOOK.md)).
- Test and production signing paths, media, and evidence are strictly separated (see
  [`TRUST_TEST_ONLY_BOUNDARY.md`](TRUST_TEST_ONLY_BOUNDARY.md)).

## 7. Explicit non-claims

- Signing this policy into the repo signs no artifact; it defines the rules, not the signatures.
- No production certificate is emitted; `production_certificates` remains `false` and `/operators`
  remains `[]`.
- Publishing this policy does **not** create or activate an operator, does **not** activate federation
  or external integration, and does **not** make BANZA a PSP. Any licence/authorisation belongs to the
  authorised operator.

See: [`PRODUCTION_TRUST_PATH.md`](PRODUCTION_TRUST_PATH.md),
[`TRUST_CEREMONY_PLAN.md`](TRUST_CEREMONY_PLAN.md),
[`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md),
[`BRL_REVOCATION_PLAYBOOK.md`](BRL_REVOCATION_PLAYBOOK.md),
[`TRUST_TEST_ONLY_BOUNDARY.md`](TRUST_TEST_ONLY_BOUNDARY.md),
[`AUDIT_EVIDENCE_INDEX.md`](AUDIT_EVIDENCE_INDEX.md).
