# BANZA v1.0.0 — Clean-Room Readiness

**Phase E of the external-review closure.** Protocol version `1.0.0`, unchanged.

Phase E prepares an artefact that can be handed to an external team without giving them the reference
implementation, the demonstration operator, the internal tests, the ADRs as a source of requirements,
the internal reports, or the development history.

---

## 1. The export package

`clean-room/packages/l0/` — **21 files**, target profile **L0 — Protocol Sandbox**.

Built by **positive allowlist**, not by copying the repository and deleting things. A file is present
only because the allowlist selected it, and the allowlist is the Phase D implementation set for the
profile plus seven individually named entries (licence, notice, trademarks, the Normative Manifest,
the profile registry and its schema, the L0 guide) — each with its reason recorded in the manifest.

A subtractive export is one forgotten deletion away from shipping the reference implementation. An
additive one cannot leak what it never selects.

**L0 only.** L1–L4 were not exported merely because they could be: the first trial exists to measure
what an implementer actually needs, and handing over more than the profile requires would destroy that
measurement.

## 2. Provenance

| | |
|---|---|
| Protocol version | `1.0.0` |
| Target profile | `L0` |
| Source commit | `8c332f82bb57` |
| Normative Manifest SHA-256 | `ee404bc3a82bfbe9bb3e5c02899e25a2…` |
| Package manifest SHA-256 | `dc351634b14f4c1da976c1a92042bd26…` |
| Generation tool | `tools/gen-clean-room-package.py` v1 |
| Files | 18 |

No timestamp appears anywhere in digested content. That is deliberate: a generation timestamp would
make two exports from the same commit differ, and the ability to verify what someone was handed is
worth more than knowing when it was produced.

## 3. Reproducibility

Two exports from commit `8c332f82bb57`, hashed over every file:

```
a23d1ef8b7000f2b8c53161d2164c8649f72c228
a23d1ef8b7000f2b8c53161d2164c8649f72c228
```

Byte-identical.

## 4. Negative test — what the package must not contain

Asserted by guard on every run, by path **and** by content:

| Excluded | Result |
|---|---|
| `engines/` — the reference implementation | ✅ absent |
| `services/`, `website/` | ✅ absent |
| Demonstration-operator material | ✅ absent |
| ADRs and RFCs | ✅ absent |
| `README.md`, internal reports, Whitepaper, related work | ✅ absent |
| The assistant, as a reachable resource | ✅ absent |
| Tooling, CI, fixtures | ✅ absent |
| Credential material, host addresses, runtime state | ✅ absent |

### Two guard corrections, both self-tested

The content check first fired on `NOTICE`, `TRADEMARKS.md`, the Normative Manifest and the L0 guide —
because each **names** the assistant. Every one of those mentions is the package drawing the boundary:
a trademark notice has to list the covered marks, the manifest has to classify the assistant's surface
as informative in order to place it outside the norm, and the guide has to say the assistant imposes
no requirement. A guard that cannot tell a mention from a shipped resource forces the author to delete
exactly the sentences that keep the boundary visible.

The rule now targets the assistant and the demonstration operator **as resources** — an address, an
endpoint, an instruction to use them, or example data. Self-tested both ways: `engines/x/leak.rs`
dropped into the package fails, and *"Use the BanzAI at https://banzai.banza.network"* appended to the
README fails.

It also fired on `127.0.0.0/8` in the reason-code registry, which is a public SSRF policy naming a
reserved range in order to forbid it. Reserved and documentation ranges are now exempt; a reachable
address is not.

### One real finding

The registry published the meaning of `redirect_blocked` as *"Redirects are never followed
(`Policy::none()`)"* — a Rust type name in a normative registry, the same class of defect as Phase D's
finding D-3. The published meaning now states the rule alone: *"a 3xx is a refusal, not a hop."* The
mechanism note moved to a non-doc comment in the engine, with a line explaining why it must stay out
of the harvested text.

## 5. No hidden dependency — and a finding that had no clean answer

In an empty directory, with only the package: every listed file present, every SHA-256 verified,
provenance complete and self-consistent, every `$ref` resolving inside.

**Markdown links were the problem.** The exported specifications link outward — `spec/canonicalization.md`
to ADR-081 and ADR-082, `spec/reason-codes.md` to ADR-083 and to a federation contract that belongs to
L3, and the guide to the derived views and the sibling conformance package.

Three options, and none of them was free:

1. **Include the targets.** Rejected: ADRs are excluded precisely because an ADR is never a
   requirement, and shipping them would invite the trial to read rationale as rule.
2. **Rewrite the links.** Rejected: the files are byte-identical copies of the published originals,
   which is what makes their digests verifiable. Rewriting content destroys that.
3. **Declare them.** Adopted. The manifest lists every outbound reference with what it points to and
   why it is not included, classified as rationale, proposal, derived view, sibling package, higher
   profile, or unresolved. The guard fails on any **undeclared** outbound link, and fails outright on
   any classified `unresolved` — a link resolving to nothing on the normative surface would mean a
   rule depends on something that does not exist.

| Outbound reference | Classified as |
|---|---|
| `conformance/package/README.md` | sibling package |
| `contracts/federation/federation-trust.json` | higher profile |
| `decisions/adr/ADR-081-normative-completeness-versioning-decision.md` | rationale |
| `decisions/adr/ADR-082-banza-canonical-json.md` | rationale |
| `decisions/adr/ADR-083-reason-code-model.md` | rationale |
| `docs/derived/implementation-sets.json` | derived view |
| `docs/derived/implementation-sets.md` | derived view |

Self-tested: removing ADR-082 from the declared list produces
*"UNDECLARED outbound link: spec/canonicalization.md -> ../decisions/adr/ADR-082-banza-canonical-json.md"*.

## 6. The question ledger

[`clean-room/question-ledger.schema.json`](../../clean-room/question-ledger.schema.json) — twelve
required fields, seven **closed** classifications: `CLARIFICATION`, `DISCOVERABILITY`, `AMBIGUITY`,
`MISSING_RULE`, `CONFLICT`, `VECTOR_GAP`, `TOOLING`. Each is documented in
[`clean-room/README.md`](../../clean-room/README.md), and the guard fails if the set drifts or a
classification loses its documentation.

`MISSING_RULE` and `CONFLICT` assert a defect in the surface and carry a `classification_note`
requirement in practice, because the boundary with `AMBIGUITY` and `DISCOVERABILITY` is where
classification goes wrong — and it goes wrong in the flattering direction.

**L4 cannot be a target on its own.** The schema requires `external_profile_id` and
`external_profile_version` whenever `target_profile` is `L4`, so "L4" alone is never a complete
evaluation configuration. The guard verifies that conditional is present.

**The vector grammar is measured, not prompted.** `caused_by_vector_grammar` records whether a
question exists because the vector files state expected outcomes in seven different shapes.
Implementers are not told the field exists and are not asked whether it bothered them: a question that
arrives unprompted is evidence, one produced by asking for it is not. If no question is attributable
to it, that is a result too.

`clean-room/questions.jsonl` is empty. No trial has been run.

## 7. Readiness

| | |
|---|---|
| L0 package created | ✅ 21 files |
| Deterministic | ✅ byte-identical across rebuilds from one commit |
| Self-contained | ✅ every `$ref` internal; every outbound link declared as a non-dependency |
| No reference code | ✅ by path and by content, self-tested |
| No hidden path dependency | ✅ undeclared outbound links fail the guard |
| Question ledger schema valid | ✅ 12 required fields, L4 conditional enforced |
| Classifications documented | ✅ 7, closed set, guard-pinned |
| Provenance complete | ✅ commit, both digests, tool and version |
| External trial ready | ✅ |

## 8. What Phase E does not establish

The package is ready to be handed out. Nothing here says the specification is *learnable* — that can
only be measured by someone without prior context, and everyone in this environment has it.

**No independent implementation of BANZA has been demonstrated.** Any rehearsal conducted inside this
environment is a **package completeness rehearsal** and must be labelled as one. It can show that the
package is complete and closed; it cannot show that a stranger can implement from it.
