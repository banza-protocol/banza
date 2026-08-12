# BanzAI Naming Canonicalization (M2.19E/F.2)

**"BanzAI Web" and "Validation Workbench" retired as product names — one name, "BanzAI"; one mode, "validação".**

**Status:** COMPLETE + LIVE — 2026-07-29

## What was removed

Two product/brand names that framed validation as a separate product:

- **"BanzAI Web"** — the parallel web-app brand.
- **"Validation Workbench"** / **"BanzAI Web Validation Workbench"** — the standalone tool name.

Both are gone from active human-facing surfaces. The concept they named is now expressed as a **mode of BanzAI**, not a distinct product.

## The canonical vocabulary

| Retired | Canonical (in use) |
|---|---|
| BanzAI Web | **BanzAI** (the single agent name — `BANZAI_AGENT.name = "BanzAI"`) |
| (BanzAI Web) Validation Workbench | **modo de validação do BanzAI** — the "Validar uma implementação" mode |

User-facing strings now read "Modo de validação · ambiente de demonstração", "Validar uma implementação" (the `MODES` entry), and "Modo de validação do BanzAI" (workspace footer). The two sidebar modes are **"Perguntar ao BanzAI"** and **"Validar uma implementação"**.

**Honest note on the machine identifier.** The receipt `actor` field is the internal constant `banzai-web` (a stable machine identifier in `OperationReceipt`/`JourneyReceipt`), and the deterministic certification-readiness aggregator is labelled `banzai-web-certification-readiness`. These are internal identifiers in JSON provenance, not the retired **product name** "BanzAI Web" (space-separated, capitalized) shown to users. The guard scans for the branded string, not the identifier, so the two are deliberately distinguished rather than conflated.

## Where it is enforced

`tools/check-banzai-single-interface.sh`:
- assertion 5 — the string `BanzAI Web` must not appear in website active source (`.ts`/`.tsx`, excluding tests and `/wasm/`), `docs/**`, `decisions/**`, or `website/public/diagrams/**` SVGs;
- assertion 6 — `Validation Workbench` / `BanzAI Web Validation Workbench` must not appear in active website source.

The archival record `decisions/adr/ADR-067-operador-zero-read-only-reference-and-banzai-validation-workbench.md` is **excluded** from the current-brand scan by design: like other archival ADRs it is rendered verbatim and its supersession is expressed via status metadata, not by rewriting the record. Its filename retains the historical "…-banzai-validation-workbench" slug for the same reason. Every **other** `decisions/**` file is still scanned, so a new record cannot reintroduce the retired brand. `tools/check-banzai-vocabulary-contract.sh` was realigned in the same milestone.

Metrics (§39): `banzai_web_brand_occurrences = 0` · `standalone_validation_workbench_occurrences = 0`.

Live QA: **0** occurrences of "BanzAI Web" across `zero.banza.network` and `/banzai`; corpus reindexed (658 chunks) with **0** forbidden terms.

## Provenance

- Base (rollback): `rollback-pre-m2-19ef2-banzai-canonical-interface` → `6acc799`
- PR #224 → `e9959d1`; PR #225 → `5b57cc4` (CI 169/0)
- Deployed (repo `5b57cc4`): website `sha256:7539d7ae…`, banzai-api `sha256:738997a0…`
- Shared evidence: `docs/reports/M2_19EF2_PRODUCTION_VALIDATION_REPORT.md`

**Verdict:** COMPLETE. "BanzAI Web" and "Validation Workbench" are retired as product names; the canonical vocabulary is "BanzAI" + "modo de validação do BanzAI", enforced by guard on the website, docs, decisions (except the verbatim archival ADR) and SVGs.
