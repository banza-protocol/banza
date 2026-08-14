# ADR-028 — Root authorization: three authorities, threshold two

## Context

The BANZA Trust Root is the anchor every conforming implementation pins once and uses to verify all
subsequent protocol material. Whatever controls it controls the maximum authority in the protocol, so
the question "how many parties must act for the root to act?" is the most consequential architectural
question BANZA answers.

Three answers were in circulation at once: a two-party dual-control model recorded as approved, a
future five-seat Shamir target, and a three-authority validator that was implemented, tested and
compiled. Documentation, governance and code disagreed. No production ceremony had run and no
production root key existed, so there was no operational state to migrate — only an architecture to
decide.

## Decision

**The BANZA Trust Root is controlled by three independent root signing authorities. A valid
Root-authorised action requires signatures from any two of the three. No single root key can authorise
an action alone.**

The threshold counts **distinct signing authorities**, not signature entries. Two signatures from the
same authority are one approval.

Authorization is cryptographic and logical. How many secure modules exist, where the devices live and
how key material is transported are **custody controls**, not the authorization model. The number of
devices never determines the threshold.

## Rationale

Three properties are required, and this is the smallest construction that yields all three:

| Property | Why BANZA needs it |
|---|---|
| Two-party authorization | The root's authority is absolute within the protocol; no individual may exercise it, and compromising one key must not be enough |
| One-party failure tolerance | A protocol whose anchor is blocked by one unavailable person is not durable infrastructure |
| No single-party control | The protocol is open; a root any one party can move alone is a proprietary platform with extra steps |

Nothing further is introduced to obtain them: no secret sharing, no online quorum service, no module
coordinator, no threshold-signature cryptosystem. Three keys and a count.

## Alternatives considered

**Two authorities, both required.** Simpler by one key, and it satisfies two-party authorization and
no-single-party control. It fails the third property outright: if either authority is lost,
compromised, or merely unreachable, the root cannot act at all. A trust anchor with zero fault
tolerance trades a real availability risk for a marginal reduction in participants.

**Three of five, with secret sharing.** More redundancy, at the cost of five constituted seats, a
sharing scheme, more key material, more custody surface, more coordination and more states in which a
ceremony can go wrong. The redundancy beyond one-failure tolerance is not demonstrated to be needed at
BANZA's current stage, and the complexity is paid immediately. If it is ever needed it will be a new
architectural decision, taken with the keys, the seats and a tested recovery in place — not a target
carried in documentation.

**Hardware-derived thresholds.** Deriving the rule from the deployment ("two modules, therefore
two-of-two") lets an operational detail define protocol authority, and changes the protocol whenever
the hardware changes. Rejected: the model is stated logically and the hardware serves it.

## Consequences

- One custodian cannot act alone, including by presenting the same signature twice. The validator
  counts distinct authorities, and the accept/reject matrix is tested as behaviour rather than asserted
  in prose — this ADR exists partly because an earlier implementation counted entries and a duplicated
  signature satisfied the threshold.
- Losing one authority does not block the root; the key is rotated under the rotation policy.
- Custodian independence — different people, different locations, different offline machines — is what
  makes the count meaningful, and is therefore a requirement rather than a recommendation.
- Every root operation needs two people to be available and to coordinate. This is a deliberate cost.
- No production ceremony may run until the custody model is implemented, the controls are evidenced,
  the evidence model is complete and the ceremony is explicitly authorised.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`contracts/invariants.json`](../../contracts/invariants.json) — `INV-ROOT-007`
- [`contracts/federation/federation-trust.json`](../../contracts/federation/federation-trust.json)
- `docs/security/ROOT_KEY_CUSTODY_MODEL.md` — the model, its invariants and the custody controls
- `docs/security/ROOT_KEY_CEREMONY_REQUIREMENTS.md` — how a root operation is conducted
- `engines/banza-root-ceremony` — the validator, with the threshold accept/reject matrix
