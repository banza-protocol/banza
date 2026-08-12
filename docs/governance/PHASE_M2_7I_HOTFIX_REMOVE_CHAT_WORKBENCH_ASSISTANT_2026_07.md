# Phase M2.7I Hotfix — Remove Chat / Workbench / Assistant legacy naming

**Date:** 2026-07-19 · **Type:** `fix(website)` — legacy-naming purge + route consolidation (website-only deploy)

## Decision
BanzAI is no longer presented as a `chat`, an `assistente` or a `workbench`. Canonical model:
**BanzAI é o agente IA nativo do protocolo BANZA.** The single public route is `/banzai`.

- `BanzAI guia; os motores verificam; a evidência prova.`
- `BanzAI guia a implementação do protocolo existente; não cria protocolo novo.`
- `BanzAI é agente do protocolo, não chat, não assistente e não workbench.`

## Routes
- **`/banzai`** — the single canonical public route; it now renders the operational experience.
- **`/banzai/workbench`** — **removed** (migrated to `/banzai`). No redirect, no alias → **404**.
- **`/banzai/chat`** — already removed in the prior hotfix → **404**.

## Also fixed
**SVG-P-057** (`banza-protocol-architecture-overview-v1.svg`): the "BanzAI · agente nativo" card
overlapped the "FRONTEIRA · SEM FLUXO DE FUNDOS PELO BANZA" caption. The card now sits in its own
full-width row below the caption — no card over text.

## Components / constants renamed
- `BanzaiChat.tsx` → **`BanzaiAgent.tsx`**; component `BanzaiWorkbench` → **`BanzaiAgent`**.
- `workbench.ts` → **`banzai-agent.ts`**; `WORKBENCH` → **`BANZAI_AGENT`**, `WORKBENCH_MANDATE` →
  `BANZAI_AGENT_MANDATE`, `ASSISTANT_SUGGESTIONS` → `AGENT_SUGGESTIONS`, `CHAT_STANCE` → `AGENT_STANCE`.
- `workbench.test.ts` → `banzai-agent.test.ts`. All imports/tests/snapshots updated.
- The "Assistente" nav tab → **"Perguntar"**; `#chat`/`#assistente` hash → `#perguntar` (also accepts
  `#assistente`/`#agent`). "Perguntar ao Assistente" → **"Perguntar ao BanzAI"**.
- Canonical-only diagram `workbench-operator-flow.svg` (SVG-P-069) → **`banzai-operator-flow.svg`**,
  content + registry reframed.

## Engine (banzai-evidence → WASM)
- All tool citations repointed from `/banzai/workbench` → **`/banzai`**; the `banzai_routes` intent
  reframed to two public roles (`/banzai` + `/referencia/banzai`); `include_str!` reference corpus
  cleaned via the reference sweep. WASM rebuilt (0 `/banzai/workbench`, 0 `BanzAI Chat`/`Workbench`).
- Lowercase engine match-keywords (`o workbench certifica?`) are **kept** — they exist to catch the old
  term and return the boundary/correction answer (not public copy).

## Reference / docs / SVG sweep
- `BANZA_REFERENCIA.md` (+ `docs/reference/pt/completa.md`, byte-parity): `Workbench`→`BanzAI`,
  `/banzai/workbench`→`/banzai`, TOC anchor `#…-no-workbench`→`#…-no-banzai`.
- `README.md`, `docs/reference/en/complete.md`, and operator-facing governance docs
  (`BANZA_TRUST_ARCHITECTURE`, `SIMB_PRE_REVIEW_GATE`, `EVIDENCE_BUNDLE`, `WORKBENCH_ONLY_OPERATOR_VERIFICATION`)
  swept for the route/brand. Historical ADRs and `*_INVENTORY.md` kept as records.
- Home components (`OperatorArchitectureSection`, `HeroEstado`), `/estado`, `/decisoes` deep links,
  `site.ts` nav/footer and `sitemap.ts` all point to `/banzai` only.

## Guards
- `check-banzai-protocol-agent` blocks `/banzai/workbench`, `/banzai/chat`, `BanzAI Workbench`,
  `BanzAI Chat`, `BanzaiChat`, `Perguntar ao Assistente`, `Workbench-only`, `Protocol Evidence Assistant`,
  `Protocol Knowledge System`, `Assistente de Certificação` (+ the authority affirmations). New self-tests:
  `/banzai/workbench`|`BanzAI Workbench`|`BanzaiChat`|`Perguntar ao Assistente` **fail**;
  `Perguntar ao BanzAI`|`BanzAI — Agente do protocolo`|`/banzai` **pass**.
- The `banzai-agent.ts` forbidden-phrase source is excluded (as `workbench.ts` was) across
  `public-surface-clean`, `open-governance`, `regulatory-claims`, `workbench-only`, `governance-docs-clean`.

## Verification
- `banzai-evidence` cargo suite (19) · website `vitest` (137) · `type-check` · `lint` · `build`
  (**79 pages**, `/banzai/workbench` absent) · full guard battery + `rust-rule-check` — all green.
- Boundary held: `/operators=[]`, `production_certificates=false`, `llm_calls=0`, mock provider.

## Deploy
Website-only (the WASM ships in the website bundle). No DNS/TLS/Cloudflare/Postgres/`.env`/secrets/
reverse-proxy/verification-api/banzai-api touched.
