# BANZA — Public Implementation Surface

**To implement BANZA, start here.** This page is navigation, not specification: it holds no rules of its
own, and nothing here binds an implementation. Everything it points at does.

Protocol version **1.0.0**.

---

## Start with the index

[`contracts/production/normative-manifest.json`](../contracts/production/normative-manifest.json) lists
every artifact that defines a requirement, with a digest for each. If a rule is not reachable from that
manifest, it is not normative — whatever else it may say about itself.

## Then the byte form

[`spec/canonicalization.md`](../spec/canonicalization.md) — **BCJ/1**, the canonical JSON form. Read it
first, because signing, digesting and request identity all depend on producing the same bytes.

## The contracts

| What | Where |
|---|---|
| Wire shapes and schemas | [`contracts/`](../contracts/) |
| Public API operations | [`contracts/openapi/`](../contracts/openapi/) |
| Events and webhooks | [`contracts/events/`](../contracts/events/) |
| Invariants | [`contracts/invariants.json`](../contracts/invariants.json) |

## Behaviour

| What | Where |
|---|---|
| Reason codes | [`spec/reason-codes.md`](../spec/reason-codes.md) |
| Idempotency | [`spec/idempotency.md`](../spec/idempotency.md) |
| Trust material freshness and anti-rollback | [`spec/trust-freshness.md`](../spec/trust-freshness.md) |
| Capabilities | [`spec/capabilities.md`](../spec/capabilities.md) |
| Federation | [`spec/federation/`](../spec/federation/) |

## Profiles and capabilities

[`contracts/production/conformance-profiles.production.json`](../contracts/production/conformance-profiles.production.json)
— L0 to L4, what each requires, and which vector cases apply to which profile.

[`contracts/production/capability-registry.production.json`](../contracts/production/capability-registry.production.json)
— the canonical capability identifiers. Matching is exact: no case folding, no hyphen or plural
normalisation.

## Conformance

[`conformance/`](../conformance/) — the vectors. Each case states its own expected outcome; they are
data, and running them needs no BANZA code.

[`conformance/package/`](../conformance/package/) — the same vectors packaged with the schemas and
registries they are evaluated against, each file carrying the digest of its published original.

## Trust

The root, the Key Manifest, delegated keys, revocation and evaluation are specified in
[`spec/trust-freshness.md`](../spec/trust-freshness.md) and the trust contracts. The root authorization
model — three independent authorities, any two of which authorise — is in
[`docs/security/ROOT_KEY_CUSTODY_MODEL.md`](security/ROOT_KEY_CUSTODY_MODEL.md).

## Clean-room

[`clean-room/packages/l0/`](../clean-room/packages/l0/) — the minimum sufficient material to implement
L0 with no access to this repository's reference implementation. Every outbound reference it contains is
declared, with its reason.

---

## What is *not* here, deliberately

- **`engines/`** is a reference implementation. It implements BANZA; it does not define it. Where the
  two ever disagree, the normative surface wins and the implementation is wrong.
- **`decisions/adr/`** explains why the architecture is what it is. It binds nothing. An implementer who
  never opens it can still implement BANZA completely and correctly — that property is tested.
- **BanzAI** is an optional, non-authoritative interface. It answers questions about the protocol; it
  does not determine conformance, and nothing requires it.
