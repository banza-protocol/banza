# BANZA v1.0.0 — Repository Truth Consolidation

> Phase A of the repository and VM truth reset. The tree now states only what is true of BANZA
> v1.0.0 today. `protocol_version` is unchanged, the Whitepaper is untouched, and the README changed
> only where the licensing authority required it.

| | |
|---|---|
| Branch | `cleanup/banza-v1-e2e-truth-reset` |
| Base | `6230ca6` (main) |
| Commits | `6866218` · `7e5a065` · `4cfd46f` |
| Files | 1979 → **1833** |
| Normative manifest | 143 artifacts, 85 tier=implementation |
| Deploy | none in this phase |

---

## 1. What the sweep found that mattered

Three findings changed the repository's truthfulness rather than its tidiness.

### 1.1 Eleven engines derived digest bytes outside `BCJ/1`

`spec/canonicalization.md` §1 applies `BCJ/1` wherever BANZA computes a signature **or a content
digest**, and names evidence bundles and receipts explicitly. Eleven engines carried their own
`canon()` over `serde_json::to_string`, commented as *"Canonical JSON … deterministic for hashing"* —
a second, unpublished definition of the byte form.

`banza-evidence-bundle` is on that list, and it computes the digests of the published evidence model.
So is `banza-root-ceremony`, **despite its `canonical_bytes` having been corrected in the previous
milestone**: it carried a second helper in the same file. That is the single strongest argument for
having run this sweep — the defect was not where it had already been fixed.

All eleven delegate now. Ten crates' test suites passed unaltered, which is the evidence that no
digest moved: for the shapes real artifacts take, `BCJ/1` and the prior behaviour coincide. A test in
`banza-trust` pins that property, and `check-execution-semantics.sh` now fails if any engine
reintroduces a second canonicalization.

### 1.2 Three production contracts asserted a retired trust model

`signed-protocol-metadata`, `trust-root-metadata` and `revocation-entry` — all `tier=implementation` —
still said *"a Trust Root assina exactamente quatro classes de objectos"*. ADR-079 retired that: the
Trust Root signs **only the Key Manifest**, and delegated keys sign metadata, releases and revocations.
Three governance documents repeated it.

**Verified as documentation-only.** Each contract was compared member-by-member against `6230ca6`
with prose stripped: structure identical, only `description` changed. No wire format, schema shape or
protocol behaviour changed.

### 1.3 A command that does not exist was documented in fifteen places

`python3 tools/banza-conformance/run.py` — the Python runner moved to Rust under ADR-037 and the file
is gone. It was still in `CONTRIBUTING.md`, both conformance guides, the federation quickstart and
path, the certification boundary, two matrices, the transition plan and ADR-021.

Every `make` target and every `tools/` invocation in the repository's Markdown was then validated.
Two further dead references surfaced (`make svg-check`, a Python fixture server the Rust simulator
replaced). All now resolve.

## 2. Deletions — 146 files

`docs/reports/` held 140 milestone reports and `artifacts/` 61 milestone outputs. The delete set was
computed as a **transitive closure**, not a single pass: most `artifacts/` entries were cited only by
the reports also being removed, and a single pass would have retained them on the strength of
citations that were themselves about to disappear.

| | Before | After |
|---|---|---|
| `docs/reports/` | 140 | 22 |
| `artifacts/` | 61 | 32 |

Every one of the 54 retained files has a named holder that survives: an Accepted ADR citing it as
evidence, a guard, live tooling, or the Makefile. Git preserves what was removed.

One guard exclusion that no longer matched anything was removed with them.

## 3. Licensing authority

`docs/governance/licensing.md` derived the documentation licence **from the README** (*"CC BY 4.0 as
stated in the README"*). Authority ran backwards: an editorial document was the source of a rights
statement.

The policy now states the terms in its own voice, with the hierarchy at the top — legal instruments
govern, the policy expresses them, the README cites the policy.

**No licence changed.** What the pass deliberately did not do is invent an instrument: unlike
Apache-2.0, CC BY 4.0 has no file at the root and no per-file markers, and the policy now says so
plainly instead of implying a grounding that does not exist. Creating one grants or clarifies rights
and belongs to governance.

## 4. Layer 3 is no longer named after an operator

`BANZA_THREE_LAYER_ARCHITECTURE.md` called the third layer *"Camada 3 — Banzami Operational Scheme"*.
The Whitepaper calls it *Independent operational schemes*, and naming an architectural layer after a
company contradicts the operator-neutrality invariant enforced everywhere else in the repository.

The layer is now generic and plural; the Banzami Operational Scheme is its first instance, with the
consequence stated: implementing BANZA never requires joining it or any other scheme.

ADR-059's decision row is **not** rewritten — an Accepted decision records what was decided. Both
copies carry a terminology note reconciling the label with the Whitepaper.

## 5. What the sweep looked for and did not find

| Searched | Found |
|---|---|
| BANZA CA, Root CA, certification authority, operator admission authority | **0** — the 189 initial matches were `BANZA Canonical` |
| "everything published is contract surface" and equivalents | **0** |
| `Layer 1/2/3` used as an abbreviation colliding with profiles L0–L4 | **0** |
| Banzami as a mandatory operator, layer or infrastructure | **0** |
| CI workflow references to non-existent paths | **0** |
| Tools with no consumer | **1** (a migration test) |

## 6. Recorded, not acted on

- **ADR-035 is `Proposed`** but describes the deploy model actually in operational use. Changing an
  ADR's status is a governance act, not a cleanup, so it is recorded here rather than changed.
- **ADR-018 is `DRAFT`** and says so prominently in its own header. Its status is unambiguous; it stays.
- Six BANZA RFCs remain `Draft` and none is a requirement of 1.0.0, as the normative manifest states.

## 7. Verification

- **1133 engine tests, 0 failures**
- 14 `make` guards, 109 BanzAI guards
- `cargo fmt --check` and `cargo clippy -D warnings` clean
- Normative manifest regenerated and digest-verified
- BanzAI vocabulary regenerated from the reduced corpus
