# BANZA 2.0.0 — Root trust design and migration impact

**Status:** design, produced before implementation.
**Decision:** implement the multi-authority Root across the wire, the runtime and succession. Preserve
2-of-3. Introduce no consensus, transparency, secret-sharing or distributed-ledger machinery.

---

## 1. What 1.0.0 actually provided

Two different Root architectures existed at once:

| Layer | Model |
|---|---|
| Ceremony evidence | three authorities, threshold two, distinct signers |
| Runtime trust chain | one root public key verifying one `signature` on the Key Manifest |

And the ceremony document was **self-authorising**: `{A,B,D}` signed by A+B validates, and so does
`{X,Y,Z}` signed by X+Y. The engine proved *"two of the keys declared in this document agree with each
other"*. It never proved *"this set was authorised by the set that was already trusted"*.

The second property is the one the protocol needs. 2.0.0 provides it.

## 2. The two objects, kept apart

The correction is not "add `root_signatures[]` to the Key Manifest and stop". That would merge two
different questions into one artifact. They are separated:

| Object | Answers | Changes when |
|---|---|---|
| **Root Authority Set** | *Who may exercise Root authority?* | an authority is replaced |
| **Key Manifest** | *What does the Root currently delegate?* | delegated keys rotate |

Delegated keys rotate often; the authority set rarely. Binding them into one document would force a
Root-threshold ceremony for every routine delegation, which is how threshold discipline erodes in
practice.

## 3. The chain

```
Pinned Genesis Root Authority Set        (sequence 0 — explicitly anchored, never self-signed into trust)
        │  threshold of set N authorises set N+1
        ▼
Root Authority Set N                     (predecessor_digest → N-1, predecessor_signatures by N-1)
        │  threshold of set N authorises set N+1
        ▼
Root Authority Set N+1                   ← the ACTIVE set
        │  threshold of the ACTIVE set signs
        ▼
Key Manifest                             (root_signatures by ≥2 distinct active authorities)
        │  delegates, within scope
        ▼
signed protocol metadata · revocation list · conformance evidence
```

Every arrow is a signature check by an already-trusted party. No arrow is a self-assertion.

## 4. Root Authority Set — wire shape

```json
{
  "schema_version": "1",
  "set_sequence": 3,
  "predecessor_digest": "sha256-hex of the predecessor's signing input, or null at genesis",
  "threshold": 2,
  "authorities": [
    { "authority_id": "...", "public_key": "ed25519:...", "active_since": "RFC3339" },
    { "authority_id": "...", "public_key": "ed25519:...", "active_since": "RFC3339" },
    { "authority_id": "...", "public_key": "ed25519:...", "active_since": "RFC3339" }
  ],
  "issued_at": "RFC3339",
  "expires_at": "RFC3339",
  "predecessor_signatures": [
    { "authority_id": "<an authority of the PREDECESSOR set>", "signature": "base64url" }
  ]
}
```

`predecessor_signatures` is excluded from the signing input (BCJ/1, `spec/canonicalization.md` §5), for
the same reason the other artifacts exclude theirs: a signature cannot lie inside the bytes it covers.

**`authority_id` is a cryptographic label, not an organisation.** No organisation name is part of
validity. Replacing one institutional holder with another must never require a protocol change
(§"Institutional independence" below).

## 5. Verification algorithm

**Accepting a successor set `S` against the trusted active set `P`:**

1. Canonicalize `S` under BCJ/1, excluding `predecessor_signatures` → the signing input.
2. `S.set_sequence == P.set_sequence + 1`, else reject. *(ordering, and no silent gaps)*
3. `S.predecessor_digest == sha256(signing input of P)`, else reject. *(identity linkage)*
4. Count **distinct** `authority_id`s in `S.predecessor_signatures` that are authorities **of `P`** and
   whose signature verifies over `S`'s signing input, under that authority's public key **in `P`**.
   Require `count >= P.threshold`. *(predecessor authorisation)*
5. `S` is well-formed: exactly three authorities, `threshold == 2`, `authority_id`s distinct, public
   keys distinct.
6. `S` is within its validity window.

Only then does `S` become the active set.

**Genesis (`set_sequence == 0`)** has no predecessor, so steps 2–4 do not apply. It is accepted **only**
when its signing-input digest equals a digest the verifier was explicitly given. Never trust-on-first-use:
an unpinned genesis set is not a root, it is a stranger.

**Key Manifest** is accepted when at least `threshold` **distinct** authorities of the **active** set
have valid signatures in `root_signatures` over its signing input.

## 6. Why the removed authority is never required

Step 4 counts signatures from authorities of the **predecessor** set, not of the successor. Replacing C
means `P = {A,B,C}` and `S = {A,B,D}`, authorised by A+B — both in `P`. C is not consulted, cannot
withhold consent, and holds no authority once `S` is active.

An obstructive authority therefore has no veto. This is a direct consequence of the threshold, not a
special rule, and it is bounded: legitimacy of the rotation remains a governance question, decided under
the governing policy. The engine answers only *"were two current authorities sufficient?"*.

## 7. Atomicity

No new state machine. The set is **one signed document**: a verifier either accepts it whole or keeps
the previous one. There is no moment at which two, four, or mixed authorities are active, because
"active set" is a reference to a single accepted artifact.

## 8. Anti-rollback and equivocation

The Root Authority Set is a versioned trust artifact and joins the existing monotonic rule
(`spec/trust-freshness.md`) with `set_sequence` as its ordering marker:

| Observation | Outcome |
|---|---|
| lower `set_sequence` than the highest accepted | `trust_version_rollback`, fail closed |
| equal marker, equal signing-input digest | idempotent re-observation, accept |
| equal marker, different digest | `trust_version_equivocation`, fail closed |
| higher marker | eligible, subject to §5 |

So a repository or an attacker that re-serves the old `{A,B,C}` after `{A,B,D}` is active is rejected on
the marker, before any signature is even considered.

## 9. Catastrophic loss of two authorities

If two of three are permanently lost or compromised, the surviving authority cannot reach the threshold,
so **no successor set can be authorised and canonical continuity is blocked**. This is deliberate. There
is no emergency master key, no hidden recovery key, no administrator override and no single-signer break
glass — any of those would be a one-party path to the maximum authority, which is exactly what the
threshold exists to prevent.

The resolution is governance and credible exit, not a cryptographic backdoor.

## 10. Institutional independence stays out of the wire

The protocol knows `authority_id` and a public key. That three holders sit in three independent control
domains is a **production governance gate**, evidenced before the first production ceremony — not a
field a verifier checks. Cryptography determines who signed; governance determines whether the holders
satisfy independence. Swapping one institutional holder for another is then a ceremony, not a protocol
change.

## 11. Migration impact

### Wire changes (this is why the version moves)

| Artifact | 1.0.0 | 2.0.0 |
|---|---|---|
| Key Manifest signature | `signature`: string, one root key | `root_signatures`: array, ≥2 distinct active authorities |
| Root Authority Set | does not exist | new required trust artifact |
| Root anchor | one public key | pinned genesis set digest |

A 1.0.0 Key Manifest does not verify under 2.0.0 and a 2.0.0 Key Manifest is not readable by a 1.0.0
verifier. Under `protocol-version.json`'s own `breaking_change_policy` — *"a new major protocol_version
is required for any wire-incompatible change to a production contract"* — and ADR-008, this is a **major
version**.

`protocol_version` becomes **2.0.0**; `wire_compatible_with` becomes `2.0.x`.

### Normative surface

- **New:** Root Authority Set schema + specification + conformance vectors.
- **Changed:** `key-manifest.production.schema.json` gains `root_signatures` and drops the single-key
  assumption; `spec/trust-freshness.md` keeps `root_signatures` and gains the set's marker rule.
- **Invariants:** `INV-ROOT-002` and `INV-ROOT-010` are rewritten from "the root key" to the active set's
  threshold. New invariants cover predecessor authorisation, genesis pinning, and the no-unilateral-
  recovery rule. `INV-ROOT-007` and `INV-ROOT-009` finally have mechanisms behind them.

### L0 impact

**Functionally none.** The Key Manifest and the Root Authority Set are not in the L0 implementation
closure; L0 remains reachability, a valid manifest, `simulated=true` and integer money. The L0 package
changes only because `protocol-version.json` is in its closure and now reads 2.0.0.

### Independent implementation trial

The v1.0.0 target is abandoned, not merged. Methodology, harness, ledger, qualification form, isolation
policy, adversarial method and evidence schema are reused; **every source identity, manifest, package and
digest is regenerated** from final 2.0.0 `main`, as the `BANZA v2.0.0 L0 Independent Implementation
Trial`.

## 12. What this buys

| Property | Before | After |
|---|---|---|
| Integrity | one key verified the manifest | no single authority controls the Root |
| Continuity | asserted by INV-ROOT-009, unimplemented | surviving two authorise the successor |
| Provenance | any set could self-declare validity | a set must derive from its trusted predecessor |
| Fail-closed | undefined on quorum loss | losing two blocks continuity; no unilateral recovery |
| Credible exit | possible, undocumented | an explicitly pinned alternate genesis, with no claim to canonical lineage |

## 13. Explicitly not adopted

None of the following is adopted, now or as a future target: 3-of-5 · 5-of-9 · Shamir · MPC ·
threshold signature schemes · consensus · certificate transparency · gossip · blockchain · DID/VC ·
TUF's Snapshot/Targets/Timestamp roles · mirror voting.

2-of-3 remains the smallest mechanism providing two-party authorisation, one-authority failure tolerance
and no single-party control. Nothing above was required to obtain the missing property; predecessor
authorisation was.
