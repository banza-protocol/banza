# Phase 7Y — BanzAI Public Page: Cognitive Engine and SVG Alignment (2026-07)

**Base:** `main` `b044b5e` (post-7X/7W) · **Branch:** `docs/phase-7y-banzai-public-page-cognitive-engine-svg-alignment-2026-07`
**Repo:** `banza-protocol/banza` (target) · source-of-truth read-only: `banza-protocol/banzai` @ `main` (post-A5)

## Objective

Update the public page `banza.network/banzai` so it reflects the current state of BanzAI after
phases A1–A5. The page was too textual and out of date: it showed no BanzAI diagrams, did not
explain the cognitive engine visually, did not show the `mock` / `light-language` / `technical-heavy`
task profiles, and still framed Qwen/DeepSeek as auxiliary drafting models — which is no longer the
correct model after A5. This phase aligns the public `/banzai` page with the current BanzAI README and
documentation, without touching the BanzAI repo, any runtime, or protocol invariants.

## Initial problem

The old `/banzai` page (`website/app/banzai/page.tsx`):
- had no SVGs — it was text-only;
- described the model as a "último recurso" (last resort) in a cost pipeline, with no task profiles;
- said (FUTURO card): *"poderá usar Qwen ou DeepSeek como modelos auxiliares de redacção"*;
- said (StatusNote): *"Qwen e DeepSeek são os únicos fornecedores permitidos pela allowlist do BanzAI"*;
- did not mention `light-language` / `technical-heavy`, GPU-env activation, or the heavy-model gate;
- did not show the cognitive engine (evidence plane → engine plane → model plane).

## BanzAI repo used as source (read-only)

Read from `banza-protocol/banzai` (post-A5): `README.md` ("How BanzAI answers — the cognitive engine",
"Provider task profiles and resource policy"), `docs/PROVIDERS.md`, `docs/EVIDENCE_MODEL.md`,
`docs/SAFETY.md`, and the five `docs/diagrams/en/banzai-*-v1.svg` diagrams. No file in the BanzAI repo
was modified.

## SVGs copied (local website assets)

Copied **byte-identical** from `banza-protocol/banzai/docs/diagrams/en/` into
`website/public/diagrams/banzai/` (no raw GitHub hotlink; local assets only):

1. `banzai-cognitive-engine-v1.svg` — **primary** (rendered on the page)
2. `banzai-provider-boundary-v1.svg` — provider task profiles (rendered)
3. `banzai-role-boundary-v1.svg` — role boundary (rendered)
4. `banzai-evidence-pipeline-v1.svg` — evidence pipeline (rendered)
5. `banzai-repository-architecture-v1.svg` — component repo architecture (asset only)

Each preserves `<title>`, `<desc>` and `data-diagram-family="banza-compatible"`, and contains no
external/raster reference. Content was **not** altered on copy.

> **Source note (Phase B2).** These source diagrams were copied from `banza-protocol/banzai` after
> A5 and are **local website assets** for the BANZA public page. The BanzAI repo remains the component
> repo and ships **no website**. There is **no runtime coupling** between the two repos — the copy is
> a static asset, refreshed by a maintainer when the component diagrams change.

## `/banzai` page — before / after

| | Before | After |
|---|---|---|
| Diagrams | none (text-only) | 4 rendered SVGs (cognitive engine, provider profiles, role boundary, evidence pipeline) |
| Model framing | "modelo como último recurso" | cognitive engine + task profiles (mock / light-language / technical-heavy / no-model) |
| Providers | "Qwen/DeepSeek auxiliary drafting", "only allowed providers" | task-based selection; brands are optional adapters behind profiles; GPU by env vars |
| Heavy model | not mentioned | disabled by default; explicit server-side activation gate |
| Current state | 3 conceptual levels | explicit machine state (llm_calls=0, providers not active, heavy off, M2 pending, operators=[], production_certificates=false) |

## New sections

Hero → What it is / is not → **Cognitive engine (SVG-BZ-005) + "Como o BanzAI responde"** (three
planes) → **Provider task profiles (SVG-BZ-003)** + 4 profile cards + activation note → **Role
boundary (SVG)** → **Evidence pipeline (SVG)** → **Current state** (machine facts) → Source of truth →
Good/refused questions → Certification + links → Chat CTA.

Central messages surfaced verbatim in the page copy: *Model output is never evidence · The BANZA
corpus is the source of truth · BanzAI verifies before answering · Mock por defeito · Light-language ·
Technical-heavy · heavy disabled by default · GPU endpoints configured by env vars on the server,
never committed · não decide / não certifica / não aprova / não emite certificados · sem website
próprio · runtime mock/pré-produção · llm_calls = 0*.

## Wording removed

- "Qwen ou DeepSeek como modelos auxiliares de redacção" (FUTURO card) — removed.
- "Qwen e DeepSeek são os únicos fornecedores permitidos pela allowlist do BanzAI" — removed.
- "COMO RESPONDE · O MODELO É O ÚLTIMO RECURSO" section + the last-resort pipeline — replaced by the
  cognitive engine + task profiles.

The refused-request example *"Gera código pronto para produção sem testes."* deliberately keeps the
phrase "pronto para produção" **inside a refusal** ("output do modelo é candidato, nunca 'pronto para
produção'") — a negated example, not a claim.

## Checks executed

- `make reference-svg-check` — **PASS (27/27)** (new page-referenced SVGs are additive; the Reference
  doc's diagram set is unchanged).
- `make purity-check` · `make identity-check` · `make invariant-check` — **PASS**.
- `infra/banza-network/tests/validate-compose.sh` — **PASS**.
- `infra/banza-network/tests/validate-security-headers.sh` — **PASS**.
- `website` build (`next build`) — **PASS**; `/banzai` builds static; all 4 SVGs referenced and served.
- Source + built-HTML sweep — **0 NEEDS_FIX** (only the negated refusal example matches the
  production-ready pattern).
- Local preview render — `/banzai` 200, cognitive-engine SVG renders at 653×501px, page is visually
  rich (not text-only). Console warnings observed are pre-existing/global (root `js` class hydration,
  header logo width/height) — not introduced by this page.
- `validate-schema.sh` / e2e — **not run locally** (require a Docker Postgres container; the daemon is
  not running in this environment). These are DB/schema tests unrelated to a website-only change and
  run in CI.

## Deploy plan

Website-only deploy on the BANZA VM: pull `main`, confirm clean + `HEAD = origin/main` + `VERSION=1.0.0`,
create rollback tag `banza-website:rollback-pre-7y-banzai-page-cognitive-engine`, build the website
image, and recreate **only** the `website` container (`--no-deps`, `--pull never`). Preserve
`reverse-proxy`, `verification-api`, `banzai-api`, `postgres`. Do not touch `.env`, certs, DNS,
Cloudflare, TLS, Postgres, or secrets.

## Confirmations

- **No `VERSION` change** — remains `1.0.0`.
- **No M2**, no operator added, no certificate issued.
- **`/operators = []`** and **`production_certificates = false`** unchanged.
- **No real provider activated**; no Qwen/DeepSeek activation; no keys; no `.env`; no secrets.
- **No services runtime change**; no OpenAPI/schema/contract/conformance semantic change.
- **No change to the BanzAI repo**; no website created in the BanzAI repo.
- Website-only deploy; reverse-proxy / verification-api / banzai-api / postgres preserved.

## Risks remaining

None specific to this change. If the BanzAI component diagrams change in future, the local website
copies must be refreshed by a maintainer (they are intentionally decoupled, static assets).
