# ADR Canonical Final Report — M2.19A

**Milestone:** M2.19A — Canonical ADR Clean-Slate & Reconstruction
**Date:** 2026-07 · **Branch:** `governance/m2-19a-canonical-adr-clean-slate` · **Rollback tag:** `rollback-pre-m2-19a-adr-clean-slate`
**Companion:** `ADR_AUDIT_REPORT.md` (the audit + classification)

## Final canonical state

- **52 ADRs** in `decisions/adr/` (was 57 − 5 deleted + 1 new = 53 numbered slots; ADR-057 is the new policy; the certification draft was set aside for M2.19). Intentional, permanent gaps at **004, 022, 026, 027, 032**.
- **`decisions/adr/README.md`** ADR index regenerated from disk (52 entries) + a note explaining the gaps.
- **New:** **ADR-057 — Current-Only Canonical ADR Tree (Clean-Slate Governance Policy)**, which amends only the "superseded ADRs are never deleted" retention clause of ADR-038/039/040/021 (no substantive decision reversed) and codifies: current-only tree, Git history as the record, no history rewrite, stable identifiers (no renumbering), re-home-before-delete, self-contained removed-architecture descriptions.

## What changed

| Area | Change |
|---|---|
| ADR files | 5 deleted, 28 surgically rewritten (adversarially verified decision-unchanged), ADR-057 added |
| ADR index / metadata | `README.md`, `website/lib/decisions.ts`, `CLAUDE.md` ADR table, website `content/decisions/adr` + `rfc` mirror re-synced from canonical |
| Guards | `banza-repo-guards` ADR range 56→57; `check-open-governance.sh` exempts ADR decision-records from the corpus/KB marketing-token check; new `check-adr-canonical-clean.sh` |
| BanzAI grounding | `doc-index.json` + `repoindex/*` regenerated (sibling `~/banzai` indexed; `banzai_indexed=true`), WASM (`services/banzai-api/src/rustkb`) rebuilt (embeds cleaned corpus), vocabulary / truth-table / golden / alias regenerated |
| Reference migration | deleted-ADR citations repointed across 84 current-surface files → where surviving content lives (022→021/038, 026→040/038, 027→038, 004→052/053, 032→041); transition narratives made self-contained |

## Gates

| Gate | Status |
|---|---|
| `unresolved_contradictions` | **0** — every genuine contradiction resolved by DELETE or REWRITE |
| `broken_references` (current surfaces) | **0** — no dangling link to a deleted ADR file |
| `deleted_adr_references` (current surfaces) | **0** — verified empty; only ADR-057's intentional self-contained "removed" table names them |
| `obsolete_public_terms` | **0** — no CA / issued-certificate / discretionary-approval framing as current on public surfaces |
| Guards | **19/19 relevant guards green** (purity, identity, open-governance, banzai-repository-wide [`banzai_indexed=true`], corpus-integrity, query-core, scenario, vocab, truth-table, reference-IA, svg, …) |
| Engine tests | `cargo test` green: banzai-query-core, banzai-evidence, banza-trust |
| Financial invariants | untouched (`INV-LEDGER/WALLET/SETTLE/IDEM/RECON/QR`) |

## Verification notes

- The 2 rewrite over-reaches the adversarial verifier caught (ADR-044, ADR-051 — decision changed, not just decontaminated) were reverted to KEEP.
- ADR-010's file slug was aligned to its title (`account-participant-identity`), resolving a pre-existing README/file drift; propagated to spec/decisions.ts/mirror.
- The website ADR mirror had drifted (54 vs 57); re-syncing from canonical fixed it and is now exact.

## Deferred (tracked follow-up) — Finding B

Deleting the CA-era ADRs revealed the trust/security/contracts *implementation* subsystem still carries removed CA-era **content** (operator certificates, `INV-TRUST-003` entity-level revocation, certificate issuance) contradicting the post-CA model. M2.19A repointed the ADR **citations** there but did **not** rewrite that content — it touches normative contracts + financial-adjacent invariants and is its own careful milestone. Tracked separately.

## Next

M2.19 (Technical Interoperability Certification) resumes on this coherent set: the certification ADR is authored under M2.19 as the next free number (ADR-058), plus the engine/schemas/public changes.
