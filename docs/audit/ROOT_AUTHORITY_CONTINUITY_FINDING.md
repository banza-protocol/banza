# BANZA v1.0.0 — Root authority continuity: compatibility audit

**Result: `PRE-TRIAL TRUST CONTINUITY DEFECT` — hard stop under the milestone's own §5.**

The audit was run before any documentation or code was written, as required. It asked one empirical
question:

> Does BANZA v1.0.0 permit the three Root authorities to sit in independent control domains, and permit
> a lost, compromised or obstructive authority to be replaced by the surviving two, **without changing
> the wire format or public semantics**?

The answer is **no**, and the reason is not a missing feature. It is that the normative surface
contradicts itself about what the Key Manifest is, and the contradiction is precisely where the
threshold would have to live.

---

## 1. What was established, with evidence

### 1.1 The ceremony validator accepts succession — and accepts anything else

`engines/banza-root-ceremony` models three authorities with a threshold of two and counts **distinct**
signers. Driven directly, all three succession scenarios validate, and the removed authority never
signs:

| Scenario | Declared set | Signed by | Result |
|---|---|---|---|
| Start | A + B + C | A + B | `M2_ROOT_CEREMONY_VALID` |
| Replace C | A + B + D | A + B | `M2_ROOT_CEREMONY_VALID` |
| Replace B | A + C + D | A + C | `M2_ROOT_CEREMONY_VALID` |
| Replace A | B + C + D | B + C | `M2_ROOT_CEREMONY_VALID` |
| **Rogue set** | **X + Y + Z** | **X + Y** | **`M2_ROOT_CEREMONY_VALID`** |

The last row is the finding. The validator checks that a declared set signed *itself* with two distinct
signers. It has no notion of a **predecessor** set, so it cannot distinguish a legitimate succession
from an unrelated set minted by anyone. Succession "passes" only because everything passes.

This is not a defect in that engine: it validates *ceremony evidence*, and it is not in the runtime path
by which a verifier accepts trust material. But it means the succession property is **not** established
there.

### 1.2 The runtime trust chain anchors exactly one root key

`banza_trust::verify_key_manifest(manifest, root_public_key_b64url)` takes a **single** public key and
reads a **single** `doc["signature"]`. There is no authority set at runtime, so there is nothing for a
succession to change, and a verifier cannot tell "the set was replaced under 2-of-3 authorisation" from
"a different key signed".

### 1.3 The normative surface states three incompatible shapes for the same artifact

| Authority | What it says the Key Manifest carries |
|---|---|
| `spec/trust-freshness.md` §"excluded member" | **`root_signatures`** — *"The threshold signatures are attached to the document they sign"* |
| `contracts/production/key-manifest.production.schema.json` | **neither** — `root{kid,fingerprint}`, no signature member, `additionalProperties: false` |
| `conformance/fixtures/federation/KEY-MANIFEST-VALID.json` + the reference implementation | **`signature`** — a single string, signed by "the pinned root key" |

Three normative or near-normative artifacts, three shapes. An implementer following the specification and
an implementer following the vectors produce documents that fail each other.

### 1.4 The invariant registry contradicts itself

From `contracts/invariants.json`:

- **INV-ROOT-002** — "The Key Manifest MUST be signed by **the root key**… The root signature on the
  manifest is **the sole basis** for trusting any issuing key." *(singular)*
- **INV-ROOT-010** — "A key rotation MUST be authenticated by signing the rotation request with **the
  currently-bound private key**." *(singular)*
- **INV-ROOT-007** — "Root custody requires threshold control: **three independent root signing
  authorities, any two of which authorise** a root action."
- **INV-ROOT-009** — "The loss or replacement of an institutional seat occupant **cannot compromise the
  continuity** of the protocol's maximum authority."

INV-ROOT-007 and 009 describe a three-authority set with succession. INV-ROOT-002 and 010 describe a
single key. Both are in the same registry, at the same authority level. **INV-ROOT-009 asserts the
continuity property this milestone set out to prove, and no mechanism in the surface implements it.**

---

## 2. Against the milestone's own criteria

**§4 — the critical property.** At the ceremony layer the removed authority is never required, so the
property holds there. At the runtime layer the property is vacuous: there is no authority set to remove
anything from. The system is not "effectively 3-of-3 on the recovery path"; it has no recovery path,
because it has no set.

**§5 — hard stop.** Giving succession a runtime representation requires either a plural,
threshold-bearing signature member on the Key Manifest, or a new root-authority-set artifact. The first
is a wire change incompatible with the current single `signature` string; the second adds a required
artifact. Either makes an implementation that is conformant today non-conformant. **This is the stop
condition, so nothing was changed.**

---

## 3. Minimal options — for decision, not for adoption here

Presented smallest-first. Each is a normative decision; none was taken.

**Option 1 — Reconcile the contradiction, keep one root key, and withdraw the continuity claims.**
Delete the `root_signatures` row from `spec/trust-freshness.md`, add the signature member to the
production schema, and **retract INV-ROOT-007 and INV-ROOT-009**, because a single-key root cannot
provide threshold control or seat continuity. Smallest change; costs the 2-of-3 property at runtime,
which would then exist only as ceremony discipline. Compatible with today's implementations.

**Option 2 — Make the Key Manifest carry the threshold, as the specification already says.**
Adopt `root_signatures` (array) with an explicit authority set and threshold, and require a new manifest
to be authorised by the **previous** set's threshold. This is what INV-ROOT-007 and 009 already promise,
and it is the only option that delivers succession. It is a wire change: the current single `signature`
manifest becomes invalid. Under the repository's own versioning rule (ADR-008), a wire-incompatible
change to a production contract is the trigger for a major version — so this is **BANZA 2.0.0**, or a
`1.1` with a declared migration if both shapes are accepted for a transition.

**Option 3 — Keep 1.0.0 as it is and defer.**
Record the contradiction as a known defect, ship the L0 trial (which does not touch the Key Manifest),
and resolve root continuity in a later version with the benefit of the trial's findings. Costs nothing
now; leaves a self-contradictory invariant registry in a published protocol.

---

## 4. What was audited and found sound

Independent of the blocked decision, and all passing:

| Check | Result |
|---|---|
| §22 — a Root slot semantically requires the maintaining organisation | **No.** The only artifacts naming it are the L3 regulatory-state schema and its examples; no contract, trust engine or ceremony engine ties a Root slot to it |
| §41 — a root key compiled inseparably into verifier logic | **No.** `verify_key_manifest` takes the anchor as a parameter, so an alternate explicit anchor is already possible — the credible-exit property (§40) holds structurally |
| §32 — transport defines validity | **No.** The trust engine has no notion of hostname or origin; validity is cryptographic |
| §31 / §87 — false public claims | **None.** No "fully decentralized", "permissionless", "trustless", "blockchain" or "global consensus" claim exists on any public surface. `README.md` explicitly disclaims decentralised governance |
| §33 — single-source availability | A single-origin dependency exists for trust-material retrieval. Classified as an **availability dependency**, not a protocol defect; addressable in deployment without a wire change |

**§68 — L0 impact: none.** The Key Manifest is not in the L0 implementation closure, so the blocked
decision does not change what an L0 implementation must do. Under §69, any trial package produced before
this is resolved is still not final: the source commit must be new.

---

## 5. Why this was worth finding now

The milestone's premise was that the trial should not freeze around a Trust Root whose succession has
not been proven. That premise was correct, and stronger than expected: the property is not merely
unproven, it is **asserted by an invariant that nothing implements**, while a second invariant in the
same registry contradicts it.

An external team implementing the trust plane would have hit this on their first attempt to verify a Key
Manifest — reading `root_signatures` in the specification and finding `signature` in the vectors. Better
to answer it deliberately than to discover it as a `CONFLICT` in someone else's question ledger.
