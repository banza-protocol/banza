# Phase H1 — BanzAI Public Visual Harmonization (2026-07)

**Base:** `main` `9da58f4` (post-7Y) · **Branch:** `docs/phase-h1-banzai-public-visual-harmonization-2026-07`
**Repo:** `banza-protocol/banza` (protocol + public website) · paired with `banza-protocol/banzai`
`docs/phase-h1-banzai-visual-canon-harmonization-2026-07` (component; merged first).

## Objective

Make the BanzAI public surface — `/banzai` and `/referencia/banzai` — read as a natural part of the
BANZA visual system and tell one consistent story. The A4/A5 diagrams carried correct content but broke
the canon with a dark-slate header; the reference chapter still described a superseded two-model
(Qwen-reasoning / DeepSeek-verification) architecture. This phase syncs the harmonized diagrams and
updates the reference prose to the A5 task-profile model, with no content or authority change.

## Problem detected

- **`/banzai`** used the A5 diagrams with a **slate header** (`#1F2937 → #334155`) — visually a parallel
  identity next to the bordô BANZA reference diagrams.
- **`/referencia/banzai`** (§10) and the reference docs (`docs/reference/{pt,en}`) still showed
  `banzai-cognitive-architecture-v2.svg` and the prose **"Por que dois modelos? Qwen — motor de
  raciocínio; DeepSeek — motor de verificação"** — the pre-A5 two-model framing that A5 replaced with
  task profiles.

## Assets synchronized

The five harmonized SVGs (bordô header `#990011 → #B11226`, `#B11226` accent line, `#FECACA` eyebrow;
content unchanged) were copied **byte-identical** from `banza-protocol/banzai/docs/diagrams/en/` into
`website/public/diagrams/banzai/`:

- `banzai-cognitive-engine-v1.svg`, `banzai-provider-boundary-v1.svg`, `banzai-role-boundary-v1.svg`,
  `banzai-evidence-pipeline-v1.svg`, `banzai-repository-architecture-v1.svg`.

`<title>`/`<desc>`/`data-diagram-family="banza-compatible"` preserved; no hotlink, no external/raster
refs; local assets only. The outdated, now-unreferenced `banzai-cognitive-architecture-v2.svg`
(two-model content) was **removed**.

## Pages / docs updated

- **`website/content/BANZA_REFERENCIA.md` §10 "Como o BanzAI raciocina"** — swapped the two-model SVG
  for `banzai-cognitive-engine-v1.svg`, added `banzai-provider-boundary-v1.svg`, and rewrote the prose
  to the cognitive engine + task profiles (mock / light-language / technical-heavy / no-model), the
  low-cost policy, and server-side env activation. "Model output is never evidence; BanzAI verifies
  before answering" made explicit.
- **`docs/reference/pt/completa.md`** — the same PT edits (the canonical reference doc, kept in sync).
- **`docs/reference/en/complete.md`** — the English equivalents ("How BanzAI Reasons — the Cognitive
  Engine", task profiles, provider diagram).
- **`/banzai`** (`website/app/banzai/page.tsx`) — unchanged: it already references the same four SVGs,
  which are now bordô, so the page harmonizes automatically. Its cards were already BANZA-native (7Y).

## Wording removed

"Por que dois modelos? / Why two models?", "Qwen — motor de raciocínio / reasoning engine",
"DeepSeek — motor de verificação / verification engine", "Fase de raciocínio (Qwen) / Fase de
verificação (DeepSeek)", and the `cognitive-architecture-v2` diagram. Replaced by the task-profile
model. The negated prohibition "that Qwen or DeepSeek are sources of truth" in the boundary list is
kept (correctly negated).

## Checks

`website` build **PASS**; `make reference-svg-check` **PASS (27/27)**; `purity-check` / `identity-check`
/ `invariant-check` **PASS**; `validate-compose.sh` / `validate-security-headers.sh` **PASS**. Built
HTML for `/banzai` and `/referencia/banzai` shows the harmonized SVGs and the task-profile content; the
two-model wording and the `cognitive-architecture-v2` reference are gone; no dangling image references
repo-wide. Local preview confirms the cognitive-engine SVG now renders with the canonical bordô header,
visually consistent with the reference chapter's other diagrams.

## Deploy

Website-only deploy on the BANZA VM is performed after merge (recreate only the `website` container;
preserve reverse-proxy / verification-api / banzai-api / postgres). Rollback image:
`banza-website:rollback-pre-h1-banzai-visual-harmonization`.

## Confirmations

- **No `VERSION` change** — stays `1.0.0`. No M2, no operator, no certificate.
- `/operators = []` and `production_certificates = false` unchanged.
- No real provider / Qwen / DeepSeek activation; no keys; no `.env`; no secrets.
- No services runtime, OpenAPI/schema, contracts, or conformance change; no DNS/Cloudflare/TLS/Postgres.
- The BanzAI repo change is a **separate paired PR**; this repo ships no BanzAI website.

## Risks remaining

The five website SVG copies are decoupled static assets — a maintainer must refresh them if the BanzAI
component diagrams change. The other pre-A1 reference SVGs (`knowledge-flow`, `capabilities`,
`non-goals`, `authority-chain`) already follow the bordô canon and were left unchanged.
