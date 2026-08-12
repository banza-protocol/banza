# Phase H2 — BanzAI Public Page De-duplication and Reference Canon Split (2026-07)

**Base:** `main` `4ff9fd6` (post-H1) · **Branch:** `docs/phase-h2-banzai-public-page-dedup-reference-canon-2026-07`
**Repo:** `banza-protocol/banza` (BanzAI component repo not touched)

## Objective

Reduce the public `/banzai` page to a short, visual, institutional landing and stop it competing with
the canonical reference chapter `/referencia/banzai`. After H1 both pages told the same full story
(cognitive engine, task profiles, role boundary, evidence pipeline, examples) with the same visual
identity — which fixed the visual break but left them near-duplicates.

## Problem

`/banzai` had grown into a **second reference**: four SVGs (cognitive-engine, provider-boundary,
role-boundary, evidence-pipeline), a long three-plane explanation, detailed profile cards with an
env-var activation note, a source-of-truth section, and long good/refused-question lists — all of which
`/referencia/banzai` §10 now covers in full.

## Editorial decision

- **`/banzai`** = short entry point: *what BanzAI is, what it is not, current state, and where to read
  the full reference*. A 30–60 second read.
- **`/referencia/banzai`** = the complete canonical chapter (unchanged).

## What stayed on `/banzai` (the landing)

1. **Short hero** — title + one-line subtitle + 6 chips (`Pré-M2`, `Mock por defeito`, `Não-autoritativo`,
   `llm_calls: 0`, `operators: []`, `production_certificates: false`).
2. **Three messages** — *Explica com evidência · Verifica claims contra o corpus · Apoia a revisão
   humana*, under the lead "não é um chatbot solto… camada de explicação e verificação controlada por
   evidência".
3. **"O que não é"** — a compact 8-chip grid (não é operador / wallet / payment runtime / BANZA CA /
   não certifica / não aprova / não emite / não é fonte da verdade).
4. **One diagram** — only `banzai-cognitive-engine-v1.svg`, under "Como o BanzAI responde" with the
   short flow sentence.
5. **Estado actual** — a compact 7-fact grid + a mock/pre-production status note.
6. **Perfis de modelo** — a minimal four-card text summary (Mock / Light-language / Technical-heavy /
   No-model-human-review). **No provider-boundary SVG** on the landing.
7. **Strong CTA** — "Ler capítulo completo na referência" → `/referencia/banzai`.
8. **Secondary links** — Capítulo 10, Estado verificável, Programadores, BanzAI Chat (demo), GitHub.

## What now lives only in `/referencia/banzai` (canonical)

The full cognitive-engine three-plane explanation, the provider task-profile diagram and detail, the
role-boundary and evidence-pipeline diagrams, the env-var activation detail, the authority-limits
table, and the good/refused-question examples. `/referencia/banzai` was **not reduced** — the reference
docs (`website/content/BANZA_REFERENCIA.md`, `docs/reference/{pt,en}`) are untouched by this phase.

## SVGs removed from the landing

`banzai-provider-boundary-v1.svg`, `banzai-role-boundary-v1.svg`, `banzai-evidence-pipeline-v1.svg`
are no longer referenced by `/banzai` (they remain served and are still used by `/referencia/banzai`).
Only `banzai-cognitive-engine-v1.svg` remains on the landing. No SVG asset was deleted.

## CTA created

A primary bordô button "Ler capítulo completo na referência" plus a "Capítulo 10 · Sobre o BanzAI"
`MoreLink`, both pointing to `/referencia/banzai`. The framing: "A explicação completa vive no capítulo
canónico da referência. Esta página é apenas a porta de entrada."

## Checks

`website` build **PASS**; `/banzai` built HTML is **47.5 KB vs `/referencia/banzai` 105.6 KB** (< half);
exactly **one** SVG referenced (`cognitive-engine`); the reference CTA is present. Forbidden-wording
sweep: **0 NEEDS_FIX** — the only sweep hit, the state-row label *"Operadores certificados"* whose value
is `operators = []`, is an honest **negative** status fact (OK_STATUS_FACT), not a claim that a
certified operator exists. `make reference-svg-check` (27/27) · `purity-check` · `identity-check` ·
`invariant-check` · `validate-compose.sh` · `validate-security-headers.sh` — all **PASS**. VERSION
stays `1.0.0`.

## Confirmations

- **No `VERSION` change** (1.0.0). No M2, operator, or certificate. `/operators=[]`,
  `production_certificates=false` unchanged.
- No real provider / Qwen / DeepSeek activation; no keys/`.env`/secrets.
- No services runtime, OpenAPI/schema, contracts, or conformance change; no DNS/Cloudflare/TLS/Postgres.
- **No change to the BanzAI repo.** `/banzai` was **not** removed and is **not** a total redirect to the
  reference — it remains a distinct public landing. `/referencia/banzai` was **not** reduced.
- Only `website/app/banzai/page.tsx` (+ this report) changed.

## Deploy

Website-only deploy on the BANZA VM after merge (recreate only the `website` container; preserve
reverse-proxy / verification-api / banzai-api / postgres). Rollback image:
`banza-website:rollback-pre-h2-banzai-page-dedup`.

## Risks remaining

None specific. The landing summarizes the model profiles in text; if the profile model changes, the
one-line summary must be kept in sync with the reference chapter (the canonical source).
