# ADR-027 — Private keys never on serving infrastructure

## Context

The protocol publishes signed artifacts, and the obvious way to publish signed artifacts is to sign them
where they are served. The signing key then lives on a machine that is internet-facing, runs a web
server and a database, accepts requests from strangers, and is patched on somebody's schedule.

That machine is the most exposed component in the system. Putting the key that anchors all protocol trust
on it means a web-server vulnerability is a trust-root compromise — the failure escalates from "an
attacker served a bad page" to "an attacker can mint protocol truth".

## Decision

**No private key resides on serving infrastructure. Signing happens offline; serving is publication of
already-signed bytes.**

The root key is offline and under threshold custody (ADR-026), and never touches a serving machine.
Delegated signing keys are likewise held offline, and are the keys that sign routine artifacts within
their domains.

Serving infrastructure holds public artifacts only — signed protocol metadata, the key manifest, the
registry, revocation entries, documentation — and performs no signing of protocol material. Artifacts are
produced out of band and loaded as opaque signed blobs with their public metadata.

The consequence for an attacker is the point: full control of the serving machine yields the ability to
withhold, delay or corrupt published bytes, and no ability to produce a valid signature. Corruption is
detected by any verifier, because verification is done against keys the verifier already anchors, not
against the server.

## Rationale

Separating signing from serving converts the most likely compromise into the least damaging one. Serving
infrastructure has a large attack surface by necessity — it must accept traffic from anyone. Signing has
a small one by choice. Keeping them apart means the large surface protects nothing valuable.

Offline delegated keys, not merely an offline root, are what make this hold in practice. A root kept
offline while delegated keys sit on the server would move the target rather than remove it: an attacker
holding a delegated key can sign the artifacts that matter operationally, which is most of them.

The design also degrades honestly. A compromised server can withhold or delay, and withholding is
visible: freshness and anti-rollback rules (ADR-028) turn a silent stall into a fail-closed outcome
rather than an unnoticed one.

Security by construction rather than by protection: this is not a decision to guard the key carefully on
the server. It is a decision that the key is not there.

## Alternatives considered

**A hardware security module attached to the serving host.** Better than a key file and still rejected:
an attacker with host control can ask the module to sign, so the key is protected while the signing
capability is not.

**A signing service on a separate host, callable by the serving host.** Rejected for the same reason one
step removed — a callable signing endpoint is a signing capability reachable from a compromised machine,
and the network boundary only narrows who may ask.

**Sign at build time in continuous integration.** Rejected: it places the key in a shared automation
environment with many contributors and third-party actions, which is a broader trust boundary than a
serving host, not a narrower one.

## Consequences

- Compromising serving infrastructure yields no ability to forge protocol material.
- Publishing an artifact requires an offline step, so publication is deliberate and cannot be automated
  end to end.
- Routine artifacts cannot be issued on demand, which constrains how quickly anything can be published
  and is the intended cost.
- Availability attacks remain possible, and are handled by freshness and anti-rollback rather than by
  key protection.

---

## Normative authority

The decision above is explanatory. What binds an implementation is:

- [`spec/federation/FEDERATION_INVARIANTS.md`](../../spec/federation/FEDERATION_INVARIANTS.md) — `INV-ROOT-*`
- [`docs/security/KEY_MANAGEMENT_POLICY.md`](../../docs/security/KEY_MANAGEMENT_POLICY.md)
- [`docs/security/ROOT_KEY_CUSTODY_MODEL.md`](../../docs/security/ROOT_KEY_CUSTODY_MODEL.md)
