# BANZA v1.0.0 — Normative Surface Discoverability

**Phase D of the external-review closure.** Protocol version `1.0.0`, unchanged.

The question this phase had to answer: *can an external implementer determine exactly what to
implement for L0, then L1, L2, L3 and L4, without first understanding every artifact and without
reading `engines/`?*

The answer is now yes, and it was **no** when the phase began — for a reason worth stating first.

---

## 1. Two material findings

Phase D's instruction was that a rule found to exist only outside the normative surface must be
promoted, not documented around. Two such rules were found.

### Finding D-1 — the profiles L0–L4 had no normative definition

The normative surface published `certification-profile.production.schema.json`, which defines the
**shape** of a profile document — `required_schemas[]`, `required_contracts[]`, `required_invariants[]`
— and **no instance filling it**. The substance of what each level requires lived in:

- `spec/overview.md`, as a five-line table, not on the normative surface
- `docs/governance/certification-boundary.md`, in prose, not on the normative surface

Worse, `conformance/report-schema.json` — which **is** on the normative surface — derived its level
model from the second of those: *"0–4 per the canonical certification model
(docs/governance/certification-boundary.md)"*. A normative artifact took its meaning from a document
outside the norm. The authority ran backwards.

**Resolution.** The profiles are now defined by
[`contracts/production/conformance-profiles.production.json`](../../contracts/production/conformance-profiles.production.json),
a machine-readable registry on the normative surface with its own schema. Every invariant it names
exists in `contracts/invariants.json`; every path it names exists and is itself on the surface; a guard
enforces both. `certification-boundary.md` now explains the registry and says so; the normative
citation in `report-schema.json` points at the registry.

This is a promotion of existing material, not a new specification. The per-level content is the
corrected ADR-021 model that `certification-boundary.md` already carried — it simply had no normative
home.

### Finding D-2 — two normative artifacts disagreed about which level requires what

`conformance/capabilities/schema.json` is on the normative surface and annotates each capability with a
`certification_level`. Those annotations carried the **superseded** mapping that ADR-021 corrected:

| Capability | Was published as | Corrected to |
|---|---|---|
| `supports_wallets` | L0 | **L1** |
| `supports_qr` | L1 | **L2** |
| `supports_settlement` | L1 | **L2** |
| `supports_payment_requests` | L1 | **L2** |
| `supports_traces` | L2 | **L1** |

An external implementer reading only the normative surface would have implemented the wrong level
mapping — and the document that stated the correct one described itself as authoritative while sitting
outside the norm.

**Resolution.** The annotations now agree with the registry, and the schema's `_authority` says which
governs. A guard pins the agreement.

### Finding D-3 — normative contracts expressed rules in terms of the reference code

The isolation test caught six contracts naming Rust engines and functions. One of them,
`protocol-version.json`, is in the **L0** set:

> *"Advancing beyond M2_PROTOCOL_IMPLEMENTATION requires the Rust M2 protocol-gate engine
> (engines/banza-m2-protocol-gate :: validate_m2_protocol_gate) to report…"*

Others stated *"Status is computed in Rust by engines/banza-root-ceremony :: validate_root_ceremony,
never in TypeScript."* That sentence is an internal implementation-governance policy (ADR-037,
Rust-first) which had leaked into public contracts, where it reads as though the contract's meaning
depends on a particular engine.

**Resolution.** Each now states the rule and not who computes it — *"Status is computed by applying the
rules stated in this contract. The rules are the definition; no implementation of them is."*

The disclaimer form — *"engines/banza-certification implements it and does not define it"* — was
**kept**. It asserts that code is not the authority, which is the property under test; deleting it
would weaken what it protects. The isolation test distinguishes the two cases and was self-tested on
both.

---

## 2. What was built

| Artifact | Kind | Purpose |
|---|---|---|
| `contracts/production/conformance-profiles.production.json` | normative | The single definition of what each profile requires |
| `contracts/production/conformance-profiles.production.schema.json` | normative | Its shape |
| `tools/gen-implementation-sets.py` | derivation | Dependency graph, closures, orphan detection |
| `docs/derived/implementation-sets.{json,md}` | **derived view** | Per-profile sets; carries the mandatory header |
| `docs/guides/implement-l0.md` | **derived view** | A map to the L0 set; states no requirement of its own |
| `tools/gen-conformance-package.py` | derivation | Builds the public conformance package |
| `conformance/package/` | **copy** | Self-contained vectors + schemas + registries, with digests |
| `tools/check-normative-discoverability.sh` | guard | This report, executed on every run |

**No simplified specification was created.** Every generated file declares *"Derived informative view.
The BANZA Normative Manifest remains authoritative."*, and the guard fails if a derived view states a
requirement in its own voice.

---

## 3. The dependency graph

Edges are derived, never guessed from a filename or a directory. Each answers *why is this artifact
needed?*

| Edge | Meaning | Count | Carries the closure |
|---|---|---|---|
| `profile_requires` | The profile registry names it for that level | 73 | yes |
| `schema_ref` | A `$ref` resolves to it | 16 | yes |
| `cites_normative` | An artifact names it in its own text | 261 | **no** |

Citation edges are recorded but never followed. Following them was tried and it collapsed every
profile into the whole surface — L3's increment fell to zero and its closure rose to 97 of 147
artifacts. A prose mention does not establish that behaviour cannot be determined without the thing
mentioned, and a graph that cannot tell the two apart stops distinguishing anything.

Three kinds of dependency are kept apart throughout: **normative** (needed to determine conforming
behaviour), **conformance** (needed to test or demonstrate it), **guidance** (helps an engineer,
defines nothing).

---

## 4. Metrics

Recomputed from the current tree, not carried over from an earlier phase.

| | |
|---|---|
| Normative Manifest entries | **147** |
| implementation tier | 88 |
| conformance tier | 54 |
| legal | 3 |
| informative | 2 |

| Profile | Direct | Transitive closure | Incremental | Schemas | Contracts | Registries | Specs | Vectors | Invariants (cumulative) |
|---|---|---|---|---|---|---|---|---|---|
| L0 Protocol Sandbox | 11 | **11** | 11 | 2 | 1 | 3 | 2 | 3 | 1 |
| L1 Core Payment | 17 | 28 | **17** | 9 | 1 | 3 | 3 | 8 | 11 |
| L2 Payment Initiation | 17 | 49 | **21** | 24 | 1 | 3 | 4 | 12 | 13 |
| L3 Inter-Operator | 28 | 81 | **32** | 24 | 13 | 4 | 9 | 14 | 32 |
| L4 External Interop | 0 | 81 | **0** | 24 | 13 | 4 | 9 | 14 | 32 |

| Orphans and dependencies | |
|---|---|
| Orphan normative artifacts, unexplained | **0** |
| Declared non-profile artifacts, with a stated reason | 19 |
| Unresolved normative references | **0** |
| Requirements depending on reference code | **0** |
| Requirements depending on an ADR | **0** |
| Requirements depending on the README | **0** |
| Requirements depending on the BanzAI | **0** |

L4 adds no artifact: its increment is capability and external evidence, not new normative material.
That is a real property of the profile, not a gap.

---

## 5. Orphans, classified

29 implementation-tier artifacts were required by no profile when the graph was first computed. They
were not deleted. They were classified, and the classification changed the registry in most cases:

- **17 were registry defects** — genuine level requirements the first draft of the registry omitted:
  the OpenAPI surfaces, wallet accounts, webhooks, events, QR, collections, payment intents, the
  federation contracts, the federation specifications. They are now named at the level that needs
  them.
- **12 were correctly required by no profile**, and the registry now says so with the reason. Two
  classes: **evidence and record structures** (a report, a record, a release — the shape of an output
  produced *about* an implementation, which an implementer does not implement to reach a level), and
  **Trust Root operation** (custody, ceremony, backup, recovery — these bind the party holding the
  root, and a profile demanding them would be asking implementers to become the trust root). Seven
  more were added to those classes as the graph tightened, giving 19.

A generator bug surfaced during this: `required_apis` had been added to the registry but the graph
enumerated member names from a fixed list, so the three OpenAPI surfaces appeared as orphans while
being required. The generator now enumerates `required_*` members dynamically, so adding a member to
the registry cannot silently drop its artifacts from the graph.

---

## 6. Isolation test (the package, alone, in an empty directory)

`conformance/package/` is copied into a fresh temporary directory and checked with no access to the
repository:

| Check | Result |
|---|---|
| Every listed file present | 70/70 |
| Every SHA-256 matches its published original | 70/70 |
| No file present but unlisted | pass |
| No `../` escape, no absolute path | pass |
| No reference to `engines/`, `services/`, `website/`, `tools/` | pass |
| Every `$ref` resolves **inside** the package | pass |
| Every vector case has a determinable expected outcome | 134/134 |

### A finding that survived: the vectors have no single outcome grammar

Every case is determinable, which is what the test asks. But they say so in seven different shapes —
`expect`, `expected_events`, `endpoint_check`, `invariant_check`, `post_check`, `check_ledger_entry_fields`,
`assertion`, and in one case `invariants` alone. An external implementer must therefore learn a
per-file convention rather than one.

This is **not** hidden. The package manifest publishes, per vector file, the outcome members its cases
actually use, and states that the variety is a known ergonomics limitation. It is recorded here as an
open item rather than resolved, because normalising the vectors would change published conformance
material and belongs to its own decision, not to a discoverability pass.

---

## 7. Delete-the-reference gate

Delete `engines/`, Operador Zero and the reference implementation. From the public export alone, is
L0's required behaviour determinable?

| Requirement | Public source | Vector / evidence | Reference code required? |
|---|---|---|---|
| Canonical JSON form and digest | `spec/canonicalization.md` | `vectors/canonicalization.json` — 15 accept / 9 reject | **NO** |
| Rejection is an error, not empty bytes | `spec/canonicalization.md` §7 | reject cases | **NO** |
| Numeric domain ±(2⁵³−1) | `spec/canonicalization.md`; declared `maximum`/`minimum` in the schemas | canonicalization vectors | **NO** |
| Monetary integer representation (MON-001) | `contracts/invariants.json` | manifest + canonicalization vectors | **NO** |
| Valid operator manifest | `operator-manifest.production.schema.json`, `conformance/manifests/schema.json` | `vectors/operator-manifests.json` | **NO** |
| Capability declaration and its profile | `conformance/capabilities/schema.json` + profile registry | manifest vectors | **NO** |
| Reason-code grammar and vocabulary | `spec/reason-codes.md` | `vectors/reason-codes.json` | **NO** |
| Published reason-code meanings | `reason-code-registry.production.json` | reason-code vectors | **NO** |
| Protocol version declared and evaluated | `contracts/production/protocol-version.json` | manifest vectors | **NO** |
| What L0 requires, and what it does not | `conformance-profiles.production.json` | — (it is the definition) | **NO** |
| Extent of the normative surface | `normative-manifest.json` | — | **NO** |

Every row: **NO**. The guard re-derives this from the closure on every run rather than trusting the
table.

---

## 8. What Phase D does not demonstrate

Discoverability is not effort. This phase shows that the surface is navigable and complete from
outside; it says nothing about how long implementing it takes, and the report contains no estimate.
The guard rejects the words *easy*, *trivial* and *weekend* in the guide and derived views for that
reason.

**No independent implementation of BANZA has been demonstrated.** Until someone outside this
repository implements L0 from these documents alone, the real cost is unmeasured — and that
measurement is Phase E and beyond, not this one.

Nor does Phase D make L0 small. L0 requires 11 artifacts across two specifications, three registries,
one contract, two schemas and three vector files. That number was not manipulated: the closure is
computed, the orphan list is empty because the gaps were closed rather than excluded, and the counts
are regenerated by a deterministic tool that a guard re-runs.

---

## 9. Phase D exit criteria

| Criterion | Status |
|---|---|
| Normative Manifest remains the authority | ✅ every derived view says so; the guard enforces it |
| Dependency graph is reproducible | ✅ deterministic, byte-identical on re-run |
| Profile closures exist | ✅ L0–L4, direct / transitive / incremental |
| L0 path is clear | ✅ `docs/guides/implement-l0.md`, 11 artifacts, and what is *not* required |
| Generated views create no parallel authority | ✅ mandatory header + guard on normative voice |
| Public conformance package is self-contained | ✅ isolation test, 70 files, all `$ref` resolve internally |
| No requirement depends on `engines/` | ✅ 0 — three contracts were corrected to reach this |
| No requirement depends on an ADR | ✅ 0 |
| No requirement depends on the README | ✅ 0 |
| No requirement depends on the BanzAI | ✅ 0 |
| Zero unresolved normative references | ✅ 0 |

**Open item carried forward:** the vector outcome grammar (§6), published in the package manifest.

Regenerate everything with `make implementation-sets`; verify with `make normative-discoverability-check`.
