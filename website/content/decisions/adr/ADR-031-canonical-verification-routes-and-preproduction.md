# ADR-031 — Canonical verification routes and honest empty-state behaviour

- **Status:** Accepted
- **Date:** 2026-07
- **Related:** ADR-038 (open protocol trust model without CA), ADR-039 (operator self-publication & machine-verifiable conformance), ADR-040 (federation trust evaluation without certificates), ADR-021 (conformance level capability alignment), ADR-050 (BanzAI unified public interface)

## Context
BANZA is an open financial protocol. It publishes machine-readable verification anchors on its canonical
domain `banza.network` so that operators and peers can discover and verify trust material deterministically
and evaluate interoperation locally (ADR-038, ADR-040). Under the open trust model there is no certificate
authority and no artifact issued by BANZA about an operator: the protocol publishes signed trust metadata
(trust root, delegated signing keys), a public registry index, a signed revocation list, and
conformance-evidence hashes; operators self-publish their own manifests and evidence bundles (ADR-039).
These routes must be **honest** — they never serve fabricated data, and never redirect a machine client to
human HTML.

## Decision
The following **canonical machine routes** are served on the apex `banza.network`, as
`application/json`, **never** redirected to HTML, with Cloudflare cache **bypass**:

| Route | Meaning |
|---|---|
| `/.well-known/banza/root.json` | Trust root metadata — offline, threshold-custody root; signs only the Key Manifest that endorses the delegated signing keys; protocol metadata and revocations are signed by delegated keys, never directly, and never an artifact about an operator (ADR-038) |
| `/.well-known/banza/key-manifest.json` | Signed protocol metadata — delegated signing keys and their bounded scope, endorsed by the trust root; the trust-anchor distribution of the Open Trust Evaluation (ADR-038) |
| `/operators` | Public protocol registry — a verifiable, replicable index of self-published operator manifests and evidence. Listing grants nothing; absence forbids nothing (ADR-039) |
| `/federation/revocation-list.json` | Signed, dated revocation list — a protocol security signal over cryptographic material; never a sanction or a judgment about an entity (ADR-040) |
| `/conformance/evidence` | Conformance evidence hashes index — pointers to operators' self-published evidence bundles (ADR-039) |

BANZA issues no certificates and authorises no operators, so there is no certificate-index route:
participation is **demonstrated** through self-published, reproducible evidence, not **granted** through an
issued artifact.

**Empty-state behaviour.** Where a route has no data to serve yet, it returns an explicit, honest JSON
envelope rather than a 404 or an HTML page, e.g.
```json
{ "status": "no-operators-indexed",
  "note": "Um PASS de conformance é evidência técnica reproduzível, não certificação. A BANZA não emite certificados nem autoriza operadores; a participação é demonstrada, não concedida.",
  "data": [] }
```
`/operators` returns an **empty index** — no filled Operator A/B/C entries, which exist only in
documentation, and no Operador Zero, which is a demo simulator and never appears as a real operator
(ADR-053).

**Human surfaces.** Documentation lives at `docs.banza.network`, and the BanzAI agent is served on the apex
at `banza.network/banzai`, which calls its backend same-origin via `/banzai/ask` (ADR-050). The former
`banzai.banza.network` subdomain is retired and 301-redirects to `banza.network/banzai`; `www` redirects to
the apex.

## Consequences
- Machines get a truthful, parseable signal instead of ambiguous 404s or HTML.
- The `/operators` namespace is reserved for the registry index and is never a docs redirect.
- When an operator self-publishes verifiable evidence, the same routes index it with no route changes —
  nothing is issued, granted or approved, and the honesty guarantee holds identically before and after the
  first operator is indexed.
