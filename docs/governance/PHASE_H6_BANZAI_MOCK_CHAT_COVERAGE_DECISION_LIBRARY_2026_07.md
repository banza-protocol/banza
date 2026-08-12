# Phase H6 — BanzAI Mock Chat Coverage Expansion and Decision Library (2026-07)

**Base:** `main` `0e0ade8` (post-H5) · **Branch:** `feat/phase-h6-banzai-mock-chat-coverage-decision-library-2026-07`
**Repo:** `banza-protocol/banza` (BanzAI component repo not touched)

## Objective

Deepen the H5 deterministic mock chat: broader coverage of decisions/ADRs, certification, operators,
federation, developer topics and verifiable state; a structured decision library; accent-insensitive
matching; and an expanded, Node-22-compatible test — all still cheap, deterministic, cited and
non-authoritative (`llm_calls=0`).

## Coverage matrix (theme → action)

| Theme | Action in H6 |
|---|---|
| State | `status_overview` added; `operators_empty`, `production_certificates_false`, `m2_m3_status`, `mock_demo_status`, `llm_provider_status` kept/improved |
| BanzAI | `banzai_routes` (the 3 routes), `model_output_not_evidence` added; `what_is_banzai`, `banzai_authority_limits`, `banzai_how_it_answers` kept |
| Certification | `certification_levels_overview` added; `pass_vs_certificate`, `evidence_package` (now matched before levels), `banza_ca_role`, refusal kept |
| Operators | `operator_role`, `operator_candidate_vs_certified`, `operator_obligations`, `operator_registry` added |
| Federation | `federation_explanation`, `federation` status, `brl_revocation`, `trust_chain` kept/cited to ADRs |
| Developers | `qr_payloads` added; `developer_quickstart`, `idempotency`, `webhooks_and_payloads`, `sandbox_no_real_money`, `secrets_security`, `invariants_financial`, `production_code_request` kept |
| Decisions | data-driven ADR router via the decision library; `adr_vs_rfc`, `adr_general`, `rfc_explanation` added/kept |
| Out of scope | `external_approval_claims` (BNA/EMIS/Unitel/banks) added; `out_of_scope_market_data`, `legal_regulatory_advice`, `malicious_or_bypass`, `unknown` kept |

**Intents grew from 28 → 43 unique.**

## Decision library (inlined in `banzaiKb.ts`)

A structured `DECISIONS: Decision[]` (id, title, type, summary, url, cite, keywords) covering
**ADR-002/003/004/026/027/028/029**, with `findDecision(t)` that resolves an ADR by number regardless
of separator (`ADR-002` / `ADR 002` / `adr002`) or by keyword. The ADR intent is now data-driven — it
never invents a decision, and every `url` is a verified real route. (Kept inline rather than a separate
file so the standalone Node test can load the module without the `@/` path alias.)

## Accent-insensitive matching

A `norm()` (lowercase + NFD + strip combining diacritics) is applied to both the input and every
keyword, so "idempotencia" matches "idempotência", "producao" matches "produção", and casing/`ADR002`
variants all resolve deterministically — no fuzzy library, no external call.

## UI

Kept the H5 UI (kind badges RECUSA FUNDAMENTADA / EVIDÊNCIA INSUFICIENTE, clickable citation chips,
limit bullets, follow-up chips, DEMO). Example questions finalized to 8 high-utility prompts (last one:
"O que diz o ADR-002?"). No heavy UI, no telemetry/analytics added.

## Test (`website/components/home/banzaiKb.check.mjs`, `npm run check:kb`)

Expanded to **24 cases** + an invariants/claims sweep, now run with `--experimental-strip-types` for
**Node 22+ compatibility** (the VM runs Node 22). Cases include: certification & approval refusals,
PASS≠certificado, /operators=[], production_certificates=false, M2/Qwen/DeepSeek not active, idempotência
(with citations), ADR-002 and ADR-029 (space separator), BRL, evidence-for-L2, market-data uncertain,
production-code note, bypass refusal, RFC, operator_role, external-approval, status_overview, unknown
fallback, and accent-/separator-/case-insensitivity (`idempotencia`, `adr002`, ALL-CAPS). Plus "every
answer has ≥1 citation" and "no forbidden positive claim". **PASS.**

## Checks

`website` build **PASS**; `npm run check:kb` **PASS (24 cases)**; `make reference-svg-check` (27/27) ·
`purity-check` · `identity-check` · `invariant-check` · `validate-compose.sh` ·
`validate-security-headers.sh` — all **PASS**. VERSION `1.0.0`. Forbidden-claim sweep on chat sources:
the only "hits" are the test's own forbidden-pattern list and query-matcher keywords — **0 real
NEEDS_FIX**.

## Manual validation (browser)

Drove the H6 questions live: "Explica ADR 029" → KYC/Trust-Assertions answer citing `/decisoes/adr-029`;
"O que é um operador?" → operator role; "A EMIS já aprovou isto?" → EVIDÊNCIA INSUFICIENTE + "não afirma
aprovação regulatória"; "idempotencia" (no accent) → answered; "estado actual" → status overview.
Citations render as links; no external call.

## Confirmations

- **`llm_calls=0`, `external_model_called=false`** — no LLM/fetch/provider/GPU/external call.
- No `VERSION` change (1.0.0). No M2, operator, or certificate. `/operators=[]`,
  `production_certificates=false` unchanged.
- No provider-runtime / `banzai-api` change; no secrets/`.env`.
- No services/OpenAPI/contracts/conformance change; no DNS/Cloudflare/TLS/Postgres.
- **No BanzAI-repo change.** No reference change this phase (H5's manifest alignment already merged).

## Deploy

Website-only deploy on the BANZA VM after merge (recreate only the `website` container; preserve
reverse-proxy / verification-api / banzai-api / postgres). Rollback image:
`banza-website:rollback-pre-h6-banzai-mock-chat-coverage`.

## Files changed

`website/components/home/banzaiKb.ts` (engine + inlined decision library + norm),
`website/components/banzai/BanzaiChat.tsx` (example question), `website/components/home/banzaiKb.check.mjs`
(expanded test), `website/package.json` (Node-22 flag), this report.

## Risks remaining

The KB is intent/keyword-based (deterministic by design) with accent normalization; it does not do
fuzzy retrieval. Unknown questions correctly fall back to "evidência insuficiente" rather than guessing.
