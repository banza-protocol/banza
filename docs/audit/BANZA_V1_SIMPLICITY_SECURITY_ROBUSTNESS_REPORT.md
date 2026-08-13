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

## Open

Phases C onward: `docs/whitepaper/`, `tools/`, then the numeric, trust, normative and engine passes.
