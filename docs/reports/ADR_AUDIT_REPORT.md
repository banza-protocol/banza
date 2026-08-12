# ADR Audit Report — M2.19A Canonical ADR Clean-Slate

**Milestone:** M2.19A — Auditoria Integral, Clean-Slate e Reconstrução Canónica dos ADRs
**Date:** 2026-07
**Branch:** `governance/m2-19a-canonical-adr-clean-slate`
**Base commit:** 9681e98 · **Rollback tag:** `rollback-pre-m2-19a-adr-clean-slate`
**Precedes:** M2.19 (Technical Interoperability Certification) — the certification architecture builds on the coherent set this milestone produces.

## Why this audit ran first

Adding a new certification architecture on top of an ADR set that was possibly contradictory, disordered, or still contaminated by the phase when BANZA was treated as an operator (or assumed a Certificate Authority / discretionary approval) would build on sand. The ADR set had to be made coherent — current-only, contradiction-free, contamination-free — **before** the certification engine.

## Method

1. **Parallel per-ADR audit** — 8 agents read all 57 ADRs in full against the current canonical policy (operator-neutral; no CA; no discretionary approval; Rust-sole-authority; Qwen-never-decides; financial invariants untouchable), plus a repo-wide reference scan. Artifacts: `artifacts/m2-19a/adr-audit-working.json`, `adr-refscan.json`.
2. **Independent human-verified calibration** — the 9 decision-critical ADRs (004, 021, 022, 026, 027, 028, 032, 038, 039, 040) were read directly to verify the survived-vs-removed boundary. Artifact: `artifacts/m2-19a/calibration-findings.md`.
3. **Contradiction matrix + treatment map** — `artifacts/m2-19a/adr-contradiction-matrix.json`, `adr-treatment-map.json`.
4. **Adversarial verification** — every rewrite was independently re-checked (decision-unchanged / contamination-gone / no dangling refs); 2 over-reaches were caught and reverted.

## Findings

**57 ADRs audited → treatment:**

| Treatment | Count | ADRs |
|---|---:|---|
| DELETE (removed architecture, live content re-homed) | 5 | 004, 022, 026, 027, 032 |
| REWRITE applied (genuine contamination / contradiction / tombstone) | 28 | 001-003, 006-013, 016, 018-021, 028-031, 033-034, 036, 038-040, 049, 052 |
| KEEP (current, coherent) | 24 | incl. 005, 014-015, 017, 023-025, 035, 037, 041-048, 050-051, 053-056 |
| New ADR authored | 1 | **057** (Current-Only Canonical ADR Tree) |

**16 genuine contradictions** with current policy — all resolved (each DELETEd or REWRITEd). `unresolved_contradictions = 0`.

**Contamination classes removed:** CA / issued-certificate / root-key-ceremony / discretionary-approval (022/026/027/031/034/036); operator-as-subject prose ("Banza needs…", "the Banza app") + operator author byline ("the reference operator Organisation") (001/002/003/007/008/009/012/013/030); operator-specific product names ("Mongo"/"DOA"/"BANZADMIN") (019/020); tombstones / errata / dead-doc pointers (006/010 + founding ADRs); references to now-deleted ADRs (016→040/038, 021→ removed 022 dependency, 029→040, 038/039/040 self-contained).

## Decisions

- **DELETE-with-gaps, NO renumbering.** ADR numbers are permanent, stable identifiers (RFC discipline). Survivors keep their numbers; deletions leave intentional gaps at 004/022/026/027/032. Codified in ADR-057 D-057-05. See `artifacts/m2-19a/adr-renumbering-map.json`.
- **Governance amendment (ADR-057).** ADR-038/039/040/021 promised superseded ADRs are "never deleted". ADR-057 amends only that *retention* clause: the current tree is current-only; Git history is the permanent historical record; no substantive decision of those ADRs is reversed.
- **Aesthetic MERGE/MOVE deferred.** The audit suggested consolidating current, non-contaminated ADRs (Qwen tuning 045-048 → 044; deploy 035/036 → infra). These are not contamination and consolidating them adds broken-reference/grounding risk for cosmetic gain — deferred, out of the clean-slate mandate.

## Finding B — trust/security/contracts subsystem (deferred follow-up)

Deleting the CA-era ADRs revealed that the trust/security/contracts *implementation* subsystem still carries removed CA-era **content** — operator certificates, `INV-TRUST-003` entity-level revocation, certificate issuance — that contradicts the post-CA model (ADR-038/040). Per ADR-038/040 the offline Trust Root, delegated keys, signed key manifest, domain separation and revocation-as-crypto-signal **survive**; the certificate/issuing-domain/human-approval parts are **removed**.

M2.19A repointed the ADR **citations** in that subsystem (deleted ADR numbers → where surviving content now lives) but **deliberately did not rewrite its content semantics or INV-\* identifiers** — that touches normative contracts and financial-adjacent invariants and warrants its own careful milestone. Tracked as a separate follow-up.
