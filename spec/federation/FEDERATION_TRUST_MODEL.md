# BANZA Federation Trust Model

**Document ID:** FEDERATION-TRUST-MODEL-DESIGN-001  
**Status:** Canonical — behavioral specification. No code. No implementation.  
**Authority:** ADR-025, ADR-031, ADR-025 · [`docs/governance/FEDERATION_TRUST_MODEL.md`](../../docs/governance/FEDERATION_TRUST_MODEL.md) · [`contracts/invariants.json`](../../contracts/invariants.json)

---

## Canonical decision

> BANZA is an open financial protocol. An operator independently implements the protocol, publishes its
> Operator Manifest, signed protocol metadata and conformance evidence on infrastructure it controls, and
> every peer runs the **Open Trust Evaluation** locally and deterministically before routing.

Federation trust rests on **six pillars** and nothing else: signed protocol metadata, conformance
evidence, the public protocol registry, the trust root, delegated signing keys, and revocation /
fail-closed. Conformance is **measured** — reproducible, machine-verifiable evidence that any third party
can re-execute — never granted. The Protocol Maintainers maintain and evolve the protocol; they never
authorise, certify, accept or approve operators, and there is no application, admission or review step for
an operator anywhere in this model.

Every input to the evaluation is public; every step is a computation; no step is a request to BANZA and no
step is a human decision.

---

## 1. The six pillars

| Pillar | What it is | What it is **not** |
|---|---|---|
| **Signed protocol metadata** | The genuine yardstick: which specification version, schemas, conformance vectors and validator versions are authentic, plus their digests. Signed by the trust root through a delegated signing key. [`contracts/production/signed-protocol-metadata.production.schema.json`](../../contracts/production/signed-protocol-metadata.production.schema.json) | Says nothing about any operator |
| **Conformance evidence** | The operator's published Evidence Bundle: the deterministic result of running the public conformance automation against the declared implementation, signed by the operator with its own keys, bound by hashes to its manifest. [`contracts/production/conformance-evidence.production.schema.json`](../../contracts/production/conformance-evidence.production.schema.json) | Not a conferred status, not permanent, not a judgment about the entity |
| **Public protocol registry** | A verifiable, replicable **index** of self-published manifests and evidence. It locates; it does not vouch. [`contracts/production/public-protocol-registry.production.schema.json`](../../contracts/production/public-protocol-registry.production.schema.json) | Not an approval list, not a whitelist, not a licence list |
| **Trust root** | An offline key under threshold custody — three independent authorities, any two of which authorise — that signs only the Key Manifest endorsing the delegated signing keys — protocol metadata, releases, the revocation list and evidence are signed by those delegated keys within their domains, never by the root directly (INV-ROOT-004). [`contracts/production/trust-root-metadata.production.schema.json`](../../contracts/production/trust-root-metadata.production.schema.json) | Does not authorise operators, does not sign operator evidence, does not issue licences, does not move funds |
| **Delegated signing keys** | Short-lived, scope-limited, domain-separated operational keys, endorsed by root-signed metadata. [`contracts/production/delegated-signing-key.production.schema.json`](../../contracts/production/delegated-signing-key.production.schema.json) | Confer no status on any implementation |
| **Revocation / fail-closed** | The BANZA Revocation List (BRL), signed and dated, over compromised or withdrawn cryptographic material; and the meta-rule that missing/invalid/expired/revoked/incompatible material yields non-interoperation. [`contracts/production/revocation-entry.production.schema.json`](../../contracts/production/revocation-entry.production.schema.json) | Not a sanction, not a licence, not a verdict about anyone's conduct |

---

## 2. The trust chain

Trust flows in one direction, from an offline root to material an operator publishes about itself. It
never runs the other way: no signature in this chain asserts anything about an operator's right to
participate.

```
        Trust Root  (offline, threshold custody — offline root-key ceremony)
             │  signs Key Manifest + delegated signing keys (INV-ROOT-002, INV-ROOT-004)
             ▼
   Delegated Signing Keys  (short-lived, scope-limited, domain-separated)
             │  sign protocol metadata · releases · revocation entries
             │  — within their delegated scope only (INV-ROOT-008)
             ▼
   Signed Protocol Metadata + Revocation List
             │  the genuine, versioned yardstick every peer measures against
             ▼
   Operator Self-Publication  (each operator, on its own infrastructure)
             ·  Operator Manifest      — identity, keys, endpoints, capabilities, protocol_version
             ·  Conformance Evidence   — the Evidence Bundle, signed by the OPERATOR's own keys
```

**The trust root signs the yardstick; the operator signs its own measurement.** The trust root never
signs operator conformance evidence — if it did, it would be attesting to an operator, which is the
authority this model does not contain. An operator publishes its own evidence, with its own keys, and any
third party re-derives the same result from the same public artifacts.

---

## 3. The Open Trust Evaluation

Before Operator A routes to Operator B, Operator A runs the Open Trust Evaluation **locally** over the
material Operator B has published. The evaluation is **ten conjunctive, fail-closed checks** (ADR-025).
All ten must pass; any check that is missing, invalid, expired, revoked or incompatible ends the
evaluation. The normative shape is
[`contracts/production/federation-trust-evaluation.production.schema.json`](../../contracts/production/federation-trust-evaluation.production.schema.json).

| # | Check (schema field) | Passes when |
|---|---|---|
| 1 | `valid_operator_manifest` | The manifest resolves from `protocol_metadata_url`, validates against the schema for its declared version, `operator_id` matches the identifier being resolved, and the manifest hash recomputes over the retrieved bytes. |
| 2 | `compatible_protocol_version` | The manifest's `protocol_version` is compatible with the versions Operator A supports, under the published compatibility rules. |
| 3 | `signed_protocol_metadata` | The signed protocol metadata for the negotiated version verifies (via check 5) before it is used as the yardstick. |
| 4 | `conformance_evidence_valid` | The published Evidence Bundle verifies: `conformance_report_hash`, `evidence_bundle_hash` and `manifest_hash` recompute, `verified_by_tool_version` and `trust_root_version` confirm, and the run's status/version/scope are as stated. |
| 5 | `trust_root_or_delegated_signature_valid` | Signatures over protocol metadata, releases and revocation entries chain to the trust root through in-scope, unexpired, unrevoked delegated keys, and the root threshold is met. |
| 6 | `not_revoked` | None of the keys, artifacts or the implementation the evaluation relies on appears in a valid, fresh, signed Revocation List. |
| 7 | `capabilities_compatible` | Each capability the intended interaction requires is declared in the manifest **and** covered by valid conformance evidence at the compatible protocol version. |
| 8 | `endpoint_contract_compatible` | The endpoints backing those capabilities are exposed and match the public contract (OpenAPI + schemas) at the negotiated version. |
| 9 | `evidence_freshness_within_policy` | The conformance evidence, signed protocol metadata and revocation list are each within their declared validity window (effective lifetime = the **minimum** of the windows in play). |
| 10 | `fail_closed_on_missing_or_invalid` | The meta-rule: any of the above missing, unverifiable, expired, revoked or incompatible ⇒ the evaluation fails. There is no default-allow, no degraded mode, no "assume valid and reconcile later". |

### Outcome

The evaluation produces exactly one output:

- **`ROUTING_ALLOWED`** — all ten checks passed. Operator A **may** route this one interaction, under its
  own commercial, regulatory and risk policy. A passing evaluation is the protocol floor: necessary, never
  sufficient, and it obliges no one to route.
- **`FAIL_CLOSED`** — any check missing, invalid, expired, revoked or incompatible. Operator A does not
  route. `failed_checks` records which checks did not pass.

The outcome is a **local decision about one interaction**, re-derivable by any third party from the same
public artifacts, and re-evaluated as the material changes. It is never a status conferred on the operator,
never an admission, never a licence, and a `FAIL_CLOSED` is never a judgment about the entity — it is a
verifier declining to act on material it could not verify. Recovery needs no one's permission: the operator
re-runs the public automation and re-publishes.

---

## 4. Freshness and validity windows

Every piece of trust material carries an explicit validity window: the conformance evidence, the signed
protocol metadata and the revocation list each declare one, and the verifier enforces all of them locally.
For a federation-capable conformance scope (L3+) the validity window of signed protocol metadata and
conformance evidence MUST NOT exceed 90 days (INV-FEDEVAL-006). No routing decision is made against a
Revocation List older than 6 hours (INV-FEDEVAL-005).

The windows protect three security properties: a claim cannot outlive the verification behind it, a
compromised key stops being useful within a bounded time, and rotation stays routine rather than
exceptional. None of the three requires an issuer — they require a validity window on self-published
evidence, enforced by the verifier. Recovery is discharged by the operator alone: re-run the public
automation, re-publish. Verifiers MAY adopt stricter windows as local policy and MUST NOT adopt more
lenient ones than the protocol maximum.

---

## 5. Trust invariants

These invariant IDs are machine handles; the canonical, realigned registry is
[`contracts/invariants.json`](../../contracts/invariants.json). Reproduced here for the federation surface.

| ID | Severity | Definition |
|----|----------|------------|
| **INV-FEDEVAL-004** | CRITICAL | Signed protocol metadata is valid if and only if its signature verifies against the public key resolved from the active Key Manifest for the corresponding `issuer_key_id` (a delegated signing key listed in the root-signed Key Manifest). |
| **INV-FEDEVAL-006** | CRITICAL | Trust material MUST NOT be accepted after its `expires_at`; no grace period. For a federation-capable conformance scope (L3+), the validity window of signed protocol metadata and conformance evidence MUST NOT exceed 90 days. |
| **INV-FEDEVAL-002** | CRITICAL | Any key, artifact or operator implementation whose identifier appears in a valid, non-expired Revocation List MUST be rejected from all routing decisions, regardless of any other trust signal. |
| **INV-FEDEVAL-007** | HIGH | An operator MUST NOT declare `supports_federation: true` unless it publishes valid, fresh, non-revoked signed protocol metadata and conformance evidence for a federation-capable conformance scope (L3+) that passes the Open Trust Evaluation. |
| **INV-FEDEVAL-005** | HIGH | The Revocation List MUST be signed by the trust root's designated revocation-domain delegated key; an unsigned or unverifiable list MUST be treated as absent (fail-closed). No routing decision may be made against a Revocation List older than 6 hours. |
| **INV-ROOT-010** | HIGH | A key rotation MUST be authenticated by signing the rotation request with the currently-bound private key. |
| **INV-ROOT-008** | HIGH | No delegated signing key may exercise authority beyond what the active Trust Root explicitly delegates to it. |
| **INV-ROOT-007** | CRITICAL | No single entity may solely control the maximum authority of the protocol; root custody requires threshold control. |
| **INV-FED-006** | HIGH | Trust material MUST expire. Signed protocol metadata and conformance evidence without an expiry are structurally invalid. |

The financial invariants (`INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`, `INV-IDEM-*`, `INV-RECON-*`,
`INV-QR-*`) are orthogonal to this model and are unchanged: they govern what a correct implementation does
with money, not who is allowed to be one.

---

## 6. Boundary — what these ten checks are not

This section is normative and permanent.

- **No step is a human decision.** There is no person, queue, review or discretionary judgment anywhere in
  the ten checks. No human step can convert a negative conformance result into a positive one, and none is
  required to obtain a positive one.
- **No step is a licence.** Authorisation to provide financial services is granted by the competent
  regulator to the operator; BANZA does not issue, intermediate or stand in that relationship. A
  `ROUTING_ALLOWED` outcome authorises no one to provide financial services.
- **No step confers status on an implementation.** The result describes one implementation, at one version,
  within its declared capability scope, at the time of one evaluation. There is no status issued, granted,
  held or withdrawn — and since there is no admission, there is no expulsion.
- **No step lets BANZA provide financial services.** BANZA is an open financial protocol. It is not in the
  transaction path, does not intermediate or hold funds, and is not a payment service provider.
- **BANZA is not in the trust path.** Operator A evaluates Operator B using public material and its own
  software. There is no round trip to BANZA, and BANZA cannot enable or prevent any routing decision.
- **Revocation is a security signal, never a sanction.** It says only that specific cryptographic material
  is no longer trustworthy. The operator publishes new material and continues.

Current state, verifiable directly on the public routes: `/operators` = `[]` and
`production_certificates` = `false`.

---

## References

- [ADR-025](../../decisions/adr/ADR-025-trust-without-a-certificate-authority.md) — open protocol trust model
- [ADR-031](../../decisions/adr/ADR-031-operator-self-publication-and-machine-verifiable-conformance.md) — operator self-publication and machine-verifiable conformance
- [ADR-025](../../decisions/adr/ADR-025-trust-without-a-certificate-authority.md) — federation trust evaluation (the ten checks)
- [`docs/governance/FEDERATION_TRUST_MODEL.md`](../../docs/governance/FEDERATION_TRUST_MODEL.md) — canonical model document
- [FEDERATION_PROTOCOL_FLOW.md](FEDERATION_PROTOCOL_FLOW.md) — end-to-end federated transaction behavior
- [FEDERATION_SEQUENCE_DIAGRAMS.md](FEDERATION_SEQUENCE_DIAGRAMS.md) — sequence diagrams for all federation flows
- [FEDERATION_CONFORMANCE_PATH.md](FEDERATION_CONFORMANCE_PATH.md) · [FEDERATION_CONFORMANCE_EVIDENCE_MODEL.md](FEDERATION_CONFORMANCE_EVIDENCE_MODEL.md)
- Contracts: [`contracts/production/`](../../contracts/production/) — `signed-protocol-metadata`, `conformance-evidence`, `federation-trust-evaluation`, `public-protocol-registry`, `revocation-entry`, `delegated-signing-key`, `trust-root-metadata`

---

BANZA federation routes on verifiable evidence, never on granted permission.
