## Phase G — architecture closure

The final pass: ADR reset, guard truth, numeric adequacy, trust residuals, and the tree itself.

### ADR reset

**80 records → 45**, renumbered contiguously from `ADR-001` in logical reading order. No old ids, no
aliases, no redirects, no supersession cemetery. Every one of ~10,000 references across the repository
was rewritten from the map and verified: every referenced id resolves.

The delete-the-ADRs test ran first, because the reset is only safe if it passes: **no normative artifact
defers its meaning to an ADR** (0 of 150). An implementer who never opens `decisions/` can still
implement BANZA completely.

Two records were written rather than merged:

- **ADR-028 — Root authorization: three authorities, threshold two.** The architecture decided in the
  previous phase had an implementation and a custody document but no decision record.
- **ADR-042 — BanzAI: a non-authoritative interface.** Folding twenty BanzAI records together produced a
  2,117-line omnibus, which is the failure the one-decision-one-record rule exists to prevent. Rewritten
  as one decision with the four constraints that make non-authority real rather than aspirational.

`ADR-045` (current-only tree) was itself rewritten: it had become a record of the *previous* ADR audit,
listing tombstones — exactly what its own policy forbids.

The guard stopped carrying a list of removed ids. After a renumbering such a list is worse than useless:
`ADR-004` was once removed and is now a valid current record, so the frozen list reported the present as
the past. Contiguity, resolvability and index coverage are now derived from the tree.

### The ADR mirror became a derivation

`website/content/decisions/` held 71 files against 45 current records. Two generators now produce the
build-context mirror and the metadata registry from `decisions/`, and a parity guard proves the mirror is
byte-identical and covers the same set. That parity is what makes it legitimate for other guards to treat
the mirror as derived rather than re-scanning it as authored copy.

### All guards green

**204 of 204.** The two failures carried since the sweep began were false positives, and both were fixed
at the property rather than by exclusion:

- **`private-key-leak`** flagged its own detector's fixtures. A PEM *header* is not key material; the
  *body* is. The check now measures the base64 run after the header, so `MIIE...` in a doc-comment is not
  a leak while a real key still is. The field-name rule requires the token to carry a value. Self-tested
  four ways, and verified by injecting a real-shaped key outside fixture scope.
- **`regulatory`** flagged the negated sentence *"There is no CA signature"* — its negation set had no
  English forms — and the word *corpus* inside mirrored ADRs, which are technical records, not product
  copy. Both fixed; self-tested with a deliberately prohibited affirmative claim.

### A second wrong-record defect

Aligning the tree surfaced one more real bug, of the same family as the duplicate-signature threshold.
`banzai-evidence` held **three** hand-maintained ADR identity tables that disagreed with each other: a
numbered lookup for `ADR-028` returned **ADR-029**. Slugs, URLs and keywords are now derived from the id
on the same line, and the root-authorization record — which had no entry at all, which is why the lookup
fell through to a neighbour — was added.

`ADR-029` was also renamed to drop `private-keys` from its filename: the doc-indexer's path deny-list
treats that substring as a secret file, so the ADR *about* the policy was silently unindexable.

### Economic numeric adequacy — PASS

Every economically relevant integer on the wire carries the BCJ/1 bound explicitly, ±(2⁵³−1): amounts,
balances, settlement gross/net/fee, obligations, routing minors, collection totals. The 15 integers
without a declared maximum are conformance-report counters and vector inputs, not protocol values.

No field is a **lifetime cumulative total without scope**: balances are per wallet account, collected
amounts are bounded by their collection's target, obligations are per obligation. 2⁵³−1 minor units is
of the order of a national GDP. No wire change, no bigint, no decimal string.

### Trust residuals

**Ordering-marker uniqueness.** The markers are RFC 3339 `date-time`, whose granularity may be whole
seconds, so two legitimate publications can collide — and the same-marker rule then reads them as local
equivocation and rejects the second. The specification anticipated the collision but stated the rule only
for verifiers, leaving the publisher's obligation to be discovered. It is now explicit: an authority MUST
NOT publish two distinct artifacts of the same type at the same marker. This constrains publishers to
what verification already required — no wire form, verifier rule or state transition changes, and no
conforming implementation becomes non-conforming.

**Mix-and-match.** A verifier can be served a fresh Key Manifest with an older-but-unexpired BRL that has
not yet revoked a key the manifest endorses — each artifact individually valid, fresh and monotonic. The
window is **bounded by the BRL's `expires_at`**, which its contract already requires. Closing it in
general means a signed statement about the *set* of current artifacts: a snapshot role, a new key, a new
expiry, a new stale-state failure mode — to shrink a window an existing required field already bounds.
Recorded in the specification's "not provided" table with its bound.

**Split-view** remains explicitly out of scope, as it was: local monotonicity is not global transparency,
and the specification says so in its first section rather than in a footnote.

**TUF** was compared afterwards, as related work: a five-row matrix over rollback, freeze, mix-and-match,
key compartmentalisation and freshness, concluding **do not adopt Snapshot or Timestamp**. It named the
failure modes precisely, which is what related work is for.

### The tree

Milestone names are gone: 32 files renamed, six Makefile targets, one engine
(`banza-m2-protocol-gate` → `banza-production-gate`), and the last artifacts directory. The Postgres
migrations keep their names — they record what was applied, and renaming them would falsify it. The
phase-report template went with the document class it served.

`docs/IMPLEMENTATION_SURFACE.md` is new and short: where to start, in order, with what each thing is —
and what is deliberately not there.

---

## Final metrics

| Metric | Value |
|---|---:|
| Files at start (`main`) | 1966 |
| Files deleted, gross | 288 |
| Files added, gross | 33 |
| Files renamed | 127 |
| Files modified | 726 |
| Net reduction | 255 |
| **Files final** | **1711** |

`1966 − 288 + 33 = 1711`. The arithmetic closes.

| Surface | Before | After |
|---|---:|---:|
| ADRs | 80 | **45** |
| Normative artifacts | 150 | **150** |
| `docs/reports/` | 21 | **0** |
| `docs/audit/` | 16 | **2** |
| `docs/governance/` | 71 | **46** |
| `docs/security/` | 40 | **28** |
| Root/ceremony documents | 15 | **5** |
| Guard targets | 202 | **204** |
| Guards failing | 2 | **0** |
| Clean-room L0 package | 24 | **24** |

The normative count did not move, and that is the correct outcome: the sweep removed **duplicate
authority**, not requirements. Nothing that defines a requirement was deleted.

---

## What the sweep actually found

Three real defects, none of them documentation:

1. **`A + A` satisfied the 2-of-3 threshold.** One custodian signing twice authorised a root action.
   Seventeen tests had passed over it, including one whose name suggested it covered exactly this.
2. **A numbered ADR lookup returned the wrong record**, because three hand-maintained identity tables
   disagreed and the newest decision had no entry in any of them.
3. **A normative invariant carried a superseded custody model**, and the guard written to catch that
   could not see it, because its file glob missed files sitting directly in `contracts/`.

Each was found by testing a property rather than reading a document, which is the method this milestone
was for.

---

## Remaining limitations

Real, current, and stated as limits rather than resolved:

- **Split-view detection** is out of scope. Two observers with no shared state can be served different,
  individually valid material. BANZA claims local monotonicity, not global transparency.
- **Mix-and-match** is bounded, not eliminated — see above.
- **First-observation staleness**: a verifier with no prior state cannot know it is being shown an old
  version.
- **No external third-party implementation has been demonstrated.** The clean-room package exists and is
  reproducible; nobody outside this repository has yet built from it.
- **No production root ceremony has run**, no production root key exists, and this repository ships no
  production ceremony tooling.

---

## Robustness backlog

Carried forward, with the phase that will take each:

1. **Whitepaper equations are inherited, not derived** — a changed equation body under an unchanged
   label drifts silently from the published PDF.
2. **`private-key-leak-check` fails on `HEAD`** — a PEM block in `engines/operator-zero-core/src/boundary.rs`,
   secret-field-name tokens in `evidence/claims/claims-matrix.json` and a compiled evidence-bundle WASM.
3. **`regulatory-check` fails on `HEAD`** — `ca signature` and `corpus` tokens in mirrored ADRs.
4. **`website/content/decisions/adr/` mirrors 64 ADRs against 81 canonical** — a drifted partial mirror,
   and the source of every `regulatory-check` hit. Belongs to the ADR Architecture Reset.
5. **`private-key-leak-check` flags its own detector's test fixtures** — needs to become context-aware
   about test material. Belongs to the engine pass.
6. ~~The custody threshold is contradicted between code and governance~~ — **closed by Phase F**:
   resolved to 2-of-3, and a real defect in the validator was found and fixed on the way.

Items 5 and 6 of the earlier list are closed by Phase E.

---

## Blocking finding — the custody threshold

`engines/banza-root-ceremony` is a real, tested, WASM-compiled validator with `TOTAL_ROOT_KEYS = 3`. It
requires three custodians and a 2-of-3 signature threshold for `M2_ROOT_CEREMONY_VALID`, and it has a
CLI and evidence-bundle integration.

The approved governance Decision Record (2026-06-19) says the M2 bootstrap custody model is **Option A —
2 HSM / 2+ independent keyholders (dual control)**, with 3-of-5 Shamir as the future target, and forbids
claiming any other model. `ROOT_KEY_CEREMONY_PROCEDURE.md`, 994 lines, is written for Option A.

The result is two complete, parallel ceremony document sets for two different custody models — and the
superseded one calls itself *"the canonical M2.1 ceremony document"*. Eight documents say 2-of-3, seven
say 2-of-2. Nothing has run: no ceremony, no production root key.

This is why the root/security consolidation stopped. Which model is BANZA's is a security decision, not
a documentation cleanup, and either answer discards real work: deleting the 2-of-3 set orphans a shipped
validator, and keeping it entrenches a model the approved decision superseded. Everything downstream —
which ceremony documents survive, which get consolidated, whether
`ROOT_KEY_CEREMONY_PROCEDURE.md` is still a procedure — depends on the answer.

## Frozen

**GOVERNANCE / SECURITY / REPORTS CLEANUP — FROZEN.** One root architecture, 2-of-3; engine and surfaces
agree; no pending decision; the root/security surface is six documents; guards protect properties; tests
green.

## Open

The numeric, trust-plane and engine passes. The ADR Architecture Reset is a separate milestone and was
not started here — nothing in these commits touches it.
