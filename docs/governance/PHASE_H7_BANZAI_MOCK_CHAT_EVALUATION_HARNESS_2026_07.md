# Phase H7 — BanzAI Mock Chat Evaluation Harness and Answer Quality Gates (2026-07)

**Base:** `main` `3a233f0` (post-H6) · **Branch:** `test/phase-h7-banzai-mock-chat-evaluation-harness-2026-07`
**Repo:** `banza-protocol/banza` (BanzAI component repo not touched)

## Objective

Protect the deterministic mock chat with **quality gates**: a robust, expandable evaluation harness of
real question cases that checks intent, kind, required phrases, required citations, forbidden claims,
real internal links, limits and follow-ups — so the KB stays useful, cited, safe and non-authoritative
as it grows. H7 adds evaluation, not uncontrolled new answers.

## Problem resolved

H6 had only a 24-case smoke test. There was no per-answer contract (expected intent/kind/citations/
forbidden-terms) and no link-allowlist gate, so a matching regression could pass silently. H7 adds a
structured eval set + runner and, driven by it, fixes the gaps it surfaced.

## Eval set (`website/components/home/banzaiKb.eval.mjs`)

A single dependency-free `.mjs` (Node 22+ via `--experimental-strip-types`) with **53 cases**. Each case
declares: `id`, `question`, `expectedIntent` (+ `allowIntentAliases`), `expectedKind`, `mustInclude`,
`mustCite`, `mustNotInclude`, optional `mustHaveLimits` / `mustHaveFollowUps` / `critical` / `tags`.

**Coverage by theme:** state 6 · banzai 7 · cert 8 · operators 4 · federation 4 · dev 7 · adr 9 ·
out-of-scope 6 · robustness 2. **37/43 intents** covered; **16 critical** cases (refusals, uncertainty,
authority). All 50 questions listed in the phase brief are represented.

## Runner + quality gates

`node ... banzaiKb.eval.mjs` calls `banzaiKb(question)` and, per case, asserts: intent (with aliases),
kind, all `mustInclude` phrases (accent-insensitive), all `mustCite` hrefs present, no `mustNotInclude`
term, limits/follow-ups when required. **Global gates on every answer:** every citation href must be in
an **allowlist of real internal routes** (no invented route), every answer has ≥1 citation, and no
**forbidden positive claim** (`BanzAI certifica/aprova/emite/decide`, `model output is evidence`,
`produção pronta`, `production-ready`, `valida/aprova manifestos`). Exit code ≠ 0 on any failure; prints
per-id failures and a coverage summary.

The eight principle gates (refusals, uncertainty, ADR citations, state citing /operators+/certificates,
production-code candidate note, manifest non-validation, providers-not-active, authority limits) are all
represented by critical cases.

## Failures found by the eval and fixed (minimal KB matching only)

The eval surfaced **3 real gaps**, all fixed with matching-only changes (no new content, no invented
source):

1. **Substring bug** — "Que obrigações tem um operador?" was mis-routed to `out_of_scope_market_data`
   because the market keyword `ações` (norm→`acoes`) is a substring of `obriga**ções**` (`obrigacoes`).
   Removed the bare `acoes/ações/acções` market keyword (kept `mercado de acoes`, `bolsa`,
   `investimento`), and broadened `operator_obligations` to match "obrigações".
2. "Há operadores certificados?" → added `operadores certificados` / `ha operador(es)` /
   `existe operador` to `operators_empty`.
3. "Quais bancos angolanos já estão integrados?" → added `bancos angolanos` / `integrad` to
   `external_approval_claims`.

After the fixes: **eval 53/53 PASS**, smoke 24/24 PASS.

## Scripts

`package.json`: kept `check:kb` (fast smoke); added `check:kb:eval` (full 53-case eval) and
`check:banzai` (runs both). All use `--experimental-strip-types` for **Node 22** compatibility (the VM).

## Link allowlist (PART 9)

The runner validates every cited href against an allowlist of real routes (`/referencia/*`, `/estado`,
`/operators`, `/certificates`, `/decisoes`, `/decisoes/adr-002…029`, `/federation/revocation-list.json`,
`/banzai/chat`). All KB citations pass — no route outside the allowlist.

## Checks

`website` build **PASS**; `npm run check:banzai` **PASS (24 smoke + 53 eval)**; `make reference-svg-check`
(27/27) · `purity-check` · `identity-check` · `invariant-check` · `validate-compose.sh` ·
`validate-security-headers.sh` — all **PASS**. VERSION `1.0.0`. Forbidden-claim sweep: only the test's
own `FORBIDDEN[]` arrays and the KB's query-matcher keywords match — **0 real NEEDS_FIX**.

## Manual validation (browser)

Drove representative + newly-fixed questions live: certification → RECUSA FUNDAMENTADA; "Há operadores
certificados?" → "nenhum operador está certificado"; "Que obrigações tem um operador?" → KYC/KYB;
"Quais bancos angolanos já estão integrados?" → EVIDÊNCIA INSUFICIENTE + "não afirma aprovação
regulatória"; "cotação do dólar" → "Não tenho fonte suficiente". Citations render; no external call.

## Confirmations

- **`llm_calls=0`, `external_model_called=false`** — no LLM/fetch/provider/GPU/external call.
- No `VERSION` change (1.0.0). No M2, operator, or certificate. `/operators=[]`,
  `production_certificates=false` unchanged.
- No provider-runtime / `banzai-api` change; no secrets/`.env`.
- No services/OpenAPI/contracts/conformance change; no DNS/Cloudflare/TLS/Postgres.
- **No BanzAI-repo change.** No reference change.

## Deploy

Website-only deploy on the BANZA VM after merge (recreate only the `website` container; preserve
reverse-proxy / verification-api / banzai-api / postgres). Rollback image:
`banza-website:rollback-pre-h7-banzai-mock-chat-evals`.

## Files changed

`website/components/home/banzaiKb.eval.mjs` (new eval harness), `website/components/home/banzaiKb.ts`
(3 matching fixes surfaced by the eval), `website/package.json` (eval scripts), this report.

## Risks remaining

The eval is contract-based (intent/kind/phrase/citation) over a deterministic KB; it does not test
generative behaviour (there is none). New intents should ship with matching eval cases so the gates keep
covering the corpus as it grows.
