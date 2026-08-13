# BANZA v1.0.0 — Simplicity, Security and Robustness Sweep

**Protocol version:** 1.0.0 (unchanged, and unchanged by anything in this sweep)
**Branch:** `protocol/banza-v1-simplification-sweep`
**Status:** in progress — this file is the single running record; it is extended per phase, not duplicated.

The sweep reduces BANZA to the minimum needed for it to stay simple, secure, robust, verifiable and
independently implementable. The test applied to every candidate is the one that governs the milestone:

> If removing X changes no normative behaviour, no security guarantee, no independent-implementation
> capability, no build/release process and no legal obligation, then X does not belong in the current
> repository.

Two distinctions do the real work, and both were needed repeatedly:

- **Evidence that we did something correctly is not the same as something needed for the protocol to
  stay correct.** A closed phase report proves an act happened. The protocol does not consult it.
- **A guard that requires a file is not the same as a guard that protects a property.** Several guards
  turned out to assert the continued existence of a snapshot. Those were repointed at the artifact that
  actually carries the property, which made them stronger, not weaker.

---

## Phase A — repository truth map

`tools/repo-truth-map.py` classifies every tracked file by what consumes it: the Normative Manifest,
the Makefile, CI, guards, generators, code imports, and the text of other kept files. Directory names
are not evidence — `docs/governance/` can hold a dependency and `engines/` can hold a dead module.

The tool deletes nothing. `UNREFERENCED` is recorded as a **removal candidate, not a verdict**: a
licence nobody imports and a specification a human needs are both unreferenced and both required.

Two structural findings came out of it, both acted on in Phase B.

---

## Phase B — closed-history documentation graph

### What was removed

99 files, in one class: **closed milestone documentation** — phase reports, handoffs, closure notes and
readiness records for milestones that have already landed, plus the one-shot migration that produced a
state now asserted directly.

| Area | Files | What they were |
|---|---:|---|
| `docs/governance/` | 89 | phase reports, handoffs, closure and readiness records |
| `docs/security/` | 3 | dated phase reports (`PHASE_*_2026_07`) |
| `docs/reports/` | 2 | milestone reports |
| `docs/audit/` | 2 | superseded audit records |
| `tools/migrations/` | 2 | a completed one-shot migration and its test |
| `docs/quality/` | 1 | closed quality record |

### What was deliberately kept

`docs/security/M2_ROOT_CUSTODY_MODEL_2OF3.md` and `docs/security/M2_ROOT_TRUST_CEREMONY_2OF3.md` sit in
the same directory and share the same prefix as the deleted reports, and were kept. They carry no
`Date`/`Branch` header and are written as a standing model: they define the 2-of-3 custody control that
the trust root operates under. Removing them would remove a security guarantee, so the test forbids it.
Prefix and directory did not decide this; reading the documents did.

The rest of `docs/security/` — threat model, risk register, incident response, key management, ceremony
runbooks and templates — is standing policy and operational procedure. None of it was touched.

### Edge resolution

All 23 external sources and 119 edges into the removed cluster were classified before any deletion.
**Zero were SEMANTIC_DEPENDENCY** — the only class that blocks removal. The rest were explanatory,
process or stale references, cleaned in 16 files.

One prose link survived into `docs/security/ASSURANCE_READINESS.md`, pointing at a deleted phase report
in a "See also" list; the entry was removed and the remaining four references left intact.

### Guards repointed at properties

Four guards asserted the existence of removed files. None was weakened; three were made to check the
thing the file had been standing in for.

| Guard | Required | Now asserts |
|---|---|---|
| `check-banzai-boundary-semantic-recovery.sh` | a phase report exists | (requirement dropped; its deterministic action-boundary checks are untouched) |
| `check-banzai-monorepo-consolidation.sh` | a one-shot migration script runs clean | no indexed chunk claims **any** foreign repository — asserted on the index itself |
| `check-banzai-canonical-architecture-framing.sh` | a governance note repeats the boundary in prose | `website/content/banzai/architecture-manifest.json` declares `banza-protocol/banza` canonical and names `services/banzai-api` |
| `check-banzai-release-qa.sh` | an exemption list naming removed reports | (exemption removed with the reports it exempted) |

The consolidation and architecture guards were **self-tested by injection**: a foreign chunk added to
the index, and `role: canonical` removed from the manifest. Both failed as they should, and both files
were restored byte-identically. A guard that cannot be made to fail is not evidence of anything.

Two of these are now stricter than what they replaced. The migration check could only ever detect the
one sibling repository it knew about; the index assertion catches a foreign chunk arriving by any route.
The architecture check now reads the artifact the runtime actually loads instead of a prose restatement
that could go stale silently.

### Derived artifacts

The repo index carried 175 coverage entries, 157 chunks and 9 exclusions pointing at files that no
longer exist — **some already stale before this sweep** (`website/lib/`, `docs/migration/`,
`engines/banzai-api-kb/`), from earlier removals that never reached the index.

The index was **purged surgically, never re-cut**. Re-cutting at HEAD would absorb unrelated growth and
regress retrieval ranking; the purge removes only dead entries, and every survivor keeps the bytes and
the position it had when the index was cut.

`index_hash` had to be recomputed. Before trusting the new value, the FNV-1a computation was
reimplemented against the **original** index and reproduced the published `5731596e3c60fc1c` exactly;
only then was the purged value (`638493aa8484f06b`) written.

The manifest now records the purge explicitly under `surgical_purge` — that it was applied, why, how
many entries went, that survivors are unmodified, and that **no reindex occurred**. An index that
quietly stops matching the commit it claims is worse than one that says so.

`services/banzai-api/src/rustkb/banzai_api_kb_bg.wasm` was rebuilt from the purged source (3 121 520 →
3 022 807 bytes) and verified in both directions: a deleted indexed path (`docs/governance/M2_READINESS_HANDOFF_2026_07.md`)
is present in the old binary and absent from the new one, while a live path (`spec/trust-freshness.md`)
survives. Without the rebuild the runtime would have kept citing files that no longer exist.

The BanzAI vocabulary was regenerated as the last corpus step, with all gates at zero.

### Property preservation

| Property | Authority before | Authority after | Lost? |
|---|---|---|---|
| Normative surface (what defines requirements) | `contracts/production/normative-manifest.json`, 150 artifacts | unchanged — 150 artifacts | **NO** |
| Conformance criteria L0–L4 | `contracts/production/conformance-profiles.production.json` | unchanged | **NO** |
| Anti-rollback semantics | `spec/trust-freshness.md` + `engines/banza-trust` | unchanged | **NO** |
| 2-of-3 root custody control | `docs/security/M2_ROOT_CUSTODY_MODEL_2OF3.md` | same file, kept | **NO** |
| Root ceremony procedure | `docs/security/M2_ROOT_TRUST_CEREMONY_2OF3.md` + runbooks | same files, kept | **NO** |
| BanzAI runtime is canonical; BANZA is the sole active source | a governance note **and** `services/banzai-api/README.md` **and** the architecture manifest | README + architecture manifest (machine-readable, ADR-075) | **NO** |
| Index carries no foreign-repository chunks | a one-shot migration script's `--check` | asserted directly on the index, for any foreign repo | **NO** |
| Independent implementation from the repository alone | clean-room L0 package + conformance package | unchanged; digests byte-identical | **NO** |
| Build/release process | Makefile + CI targets | unchanged — 202 check targets | **NO** |
| Legal obligations | `LICENSE`, `NOTICE`, `TRADEMARKS.md`, `GOVERNANCE.md` | untouched | **NO** |

Nothing in the table is lost. The clean-room and evidence provenance stamps confirm it independently:
after the deletions, both `normative_manifest_sha256` and `package_manifest_sha256` are unchanged — only
`source_commit` moved, which is the stamp chasing HEAD rather than the package changing. Those two
stamps were reverted rather than committed, for the reason established earlier: a provenance record
cannot point at the commit that contains it.

### Verification

- **202 of 202** guard targets run; **200 pass**.
- `engines/banzai-query-core`: **362 tests pass**, including retrieval and ranking — the purge did not
  move any ranking.
- `engines/banza-repo-guards`: 4 tests pass.
- Repository: 1968 → **1869** tracked files. `UNREFERENCED` fell from 87 to **0**.

### Pre-existing failures, not caused by this phase

Two guards fail, and **fail identically on `HEAD` before any change in this branch** (verified by stash):

| Guard | What it reports |
|---|---|
| `private-key-leak-check` | a PEM block in `engines/operator-zero-core/src/boundary.rs`; secret-field-name tokens in `evidence/claims/claims-matrix.json` and a compiled evidence-bundle WASM |
| `regulatory-check` | `ca signature` and `corpus` tokens in mirrored ADRs under `website/content/decisions/adr/` |

They are recorded here rather than fixed inside a documentation-removal commit, which would mix
concerns. A third finding sits with them: `website/content/decisions/adr/` mirrors **64** ADRs against
**81** canonical ones in `decisions/adr/` — a partial mirror that has drifted. All three belong to the
later phases of this sweep.

---

## Phase C — whitepaper production apparatus

`docs/whitepaper/` held 83 files for a published, frozen 12-page edition. 24 were removed; the edition
itself, its sources and its build were untouched.

### Two retired renderers, kept alive by the guard watching them

`tools/whitepaper-latex.py` (PT) and `tools/whitepaper-en-dossier.py` (EN) both composed a `.tex` from
the derived JSON — the inverted direction that once silently recomposed an approved edition. Both had
been retired in place: retirement headers, a hard `sys.exit(2)`, and a guard asserting that they kept
their headers and stayed out of the release path.

That is the pattern this milestone exists to end. 413 lines of code the repository cannot use, kept so
that a check could confirm they were still disabled — and one of them citing `tools/whitepaper-pt-content.py`,
which no longer exists. Both were deleted.

The guard was rewritten to assert the **direction** instead of the filenames:

- the release path contains no retired renderer, **and** writes no `.tex` from content JSON;
- neither file may reappear in the tree at all — retired, not parked.

Asserting the direction outlives any particular tool. A *new* generator making the same mistake would
be caught, which a check on two known filenames never could. Both assertions were self-tested by
injection — reintroducing the file, and putting a renderer back into the release script — and both
failed as they should.

### A second renderer for one document

`docs/whitepaper/typst/whitepaper.typ` and `tools/whitepaper-build.sh` rendered the same content through
Typst as a "preview". Its own header conceded it produces **a different composition — page count and
layout — from the canonical LaTeX edition**, which makes it a poor preview of the thing it previews, and
a second engine for one document is a source of divergence with nothing on the other side. Removed, with
its `make whitepaper-preview` target, its git-ignore entries and its documentation.

To look at the edition, build the edition: `make whitepaper-release`.

### Closed production process

`docs/whitepaper/prep/` (17 files — charter, outline, figure specification, claim-evidence matrix,
related-work matrix, source inventory, bilingual glossary, publication-readiness note, a blueprint and
six audit files) and `artifacts/whitepaper-v1/execution-state.json` were the production process for a
document that is now published and frozen. Their only external citer was that execution-state record —
each other's, and no one else's.

Two were checked before removal rather than assumed:

- **Authorship** is authoritative in `whitepaper.pt.tex` (the Copernicus `\Author` macros) and in
  `docs/whitepaper/CITATION.cff`. The prep record was a third restatement.
- **The bibliography** the build actually uses is `docs/whitepaper/latex/references.bib` (9 entries).
  The prep `.bib` held 18 — a planning superset, not the published one.

`CONSOLIDACAO_EDITORIAL_INTEGRAL_2026-08-04.md`, a dated consolidation report, went with them.

### Documentation that described the prohibited direction as current

`docs/whitepaper/BUILD.md` still drew the EN edition as `content/en.json → whitepaper-en-dossier.py →
LaTeX EN gerado`. That is the direction that was retired, and the tool named had just been deleted. The
release script does the opposite: `whitepaper.en.tex → whitepaper-content.py en → content/en.json`. The
diagram was corrected for both languages, along with references to `tools/whitepaper-pt-content.py`,
which has not existed for some time.

`website/lib/whitepaper.ts` credited the non-canonical Typst renderer with keeping the web copy in sync
and generating the release manifest. Both are the canonical release script's work.

### Dead data in a derived artifact

Each equation in `content/<lang>.json` carried a `typst` encoding beside its `latex` one. Nothing reads
it — no component, no library, no engine — and the deriver does not write it. 20 members removed across
the two canonical files and their two web mirrors; the derivation remains stable in both languages.

### Finding: the equations are not derived from the dossier

`tools/whitepaper-content.py` rebuilds each section from the `.tex`, but for equations it does
`blocks.append(old_eqs[labels])` — it carries the block over from the previous JSON, matched by label
set. A changed **label** fails hard; a changed equation **body** under the same label is silently
ignored, so the web edition can drift from the published PDF while every check still passes.

Not fixed here: closing it means writing a real TEX→equation derivation, which is a behaviour change and
does not belong in a removal pass. Recorded as the first entry of the robustness backlog.

### Verification

- The published edition still reproduces **byte-identically**: `make whitepaper-verify` confirms 12 pp
  each, LaTeX/xdvipdfmx, PT `b19f2b98…`, EN `275c95d3…`, matching `manifest.json` and `CHECKSUMS.txt`.
- **202 guard targets, 200 pass** — the same two pre-existing failures, unchanged.
- Website suite: **502 of 502 pass**, up from 496. The six failures fixed were pre-existing on `HEAD`:
  four asserted against the removed governance note, one asserted that the **root** `README.md` names
  the BanzAI runtime canonical — a leftover from a different milestone, since the README was rewritten
  and frozen as the protocol's entry point and deliberately no longer says that. The positive assertion
  now reads the architecture manifest, matching the guard.
- `docs/whitepaper/`: 83 → **63** files. Repository: 1869 → **1846**.

### Property preservation

| Property | Authority before | Authority after | Lost? |
|---|---|---|---|
| Published PT/EN editions | committed PDFs + manifest + CHECKSUMS | unchanged, byte-identical | **NO** |
| Editorial source of the edition | `whitepaper.pt.tex` (PT), `whitepaper.en.tex` (EN) | unchanged | **NO** |
| Source-of-truth direction TEX→JSON | a guard requiring two retired tools to keep their headers | asserted on the release path and the tree, for any tool | **NO** |
| Figures | 24 SVG sources → 24 figure PDFs | unchanged | **NO** |
| Authorship and citation | `.tex` `\Author` macros + `CITATION.cff` | unchanged | **NO** |
| Bibliography | `latex/references.bib` | unchanged | **NO** |
| Web edition content | `content/<lang>.json`, derived | unchanged but for 20 unread members | **NO** |
| Reproducible build | `make whitepaper-release` / `whitepaper-verify` | unchanged | **NO** |

---

## Robustness backlog

Carried forward, with the phase that will take each:

1. **Whitepaper equations are inherited, not derived** — a changed equation body under an unchanged
   label drifts silently from the published PDF.
2. **`private-key-leak-check` fails on `HEAD`** — a PEM block in `engines/operator-zero-core/src/boundary.rs`,
   secret-field-name tokens in `evidence/claims/claims-matrix.json` and a compiled evidence-bundle WASM.
3. **`regulatory-check` fails on `HEAD`** — `ca signature` and `corpus` tokens in mirrored ADRs.
4. **`website/content/decisions/adr/` mirrors 64 ADRs against 81 canonical** — a partial mirror that has
   drifted.

## Open

`tools/`, then the numeric, trust, normative and engine passes.
