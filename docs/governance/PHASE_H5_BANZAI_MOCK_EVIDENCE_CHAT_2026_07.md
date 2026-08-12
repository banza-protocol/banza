# Phase H5 — BanzAI Mock Evidence Chat Utility and Citation Quality (2026-07)

**Base:** `main` `1aa2cdd` (post-H4.2) · **Branch:** `feat/phase-h5-banzai-mock-evidence-chat-2026-07`
**Repo:** `banza-protocol/banza` (BanzAI component repo not touched)

## Objective

Make `/banzai/chat` genuinely useful in mock mode — deterministic, robust, credible — **without** real
AI, GPU, Qwen, DeepSeek or any external call. The chat answers frequent protocol questions, cites
internal sources, explains limits, refuses certification/approval requests, and says "evidência
insuficiente" when it lacks a source. It stays 100% non-authoritative.

## Problem solved

The previous mock KB (`banzaiKb`, ~9 intents, string-label cites) was thin, had a `valida manifestos`
overreach, no guardrails (market data, legal, production code, malicious), no refusal/uncertainty
signalling, and no clickable citations.

## What was implemented

### Deterministic intent engine (`website/components/home/banzaiKb.ts`)

A rewritten, self-contained (no import/fetch/LLM) engine returning a structured, backward-compatible
`KbAnswer { intent, kind: answer|refusal|uncertain, text, cites: string[], links: CiteLink[], limits?,
followUps? }`. Guardrails are checked **first**. **28 intents** implemented:

`malicious_or_bypass`, `certification_request_refusal`, `production_code_request`,
`out_of_scope_market_data`, `legal_regulatory_advice` (guardrails) · `operators_empty`,
`production_certificates_false`, `m2_m3_status`, `providers_status` (status) · `pass_vs_certificate`,
`what_is_banza`, `what_is_banzai`, `banzai_authority_limits`, `banza_ca`, `brl_revocation`,
`trust_chain`, `adr_explanation` (ADR-002/003/004/026/027/028/029), `rfc_explanation`,
`invariants_financial`, `idempotency`, `developer_quickstart`, `webhooks_and_payloads`,
`sandbox_no_real_money`, `secrets_security`, `evidence_package`, `manifest_review`,
`federation_explanation`, `banza_authority_limits`, `banzai_how_it_answers` · `unknown` (safe fallback:
"não encontrei evidência suficiente no corpus local do demo").

### Citations (real routes only)

Each intent cites **real** existing routes: `/referencia/*` (banzai, certificacao, operadores,
programadores, federacao, confianca, governacao, arquitectura), `/estado`, `/operators`,
`/certificates`, `/decisoes`, and the ADR pages `/decisoes/adr-002…029` (all verified to exist). No
invented ADR/RFC/invariant. Simple answers carry ≥1 citation; critical answers 2–4; state answers cite
`/operators` and `/certificates`.

### UI (`website/components/banzai/BanzaiChat.tsx`)

- AI messages now show a **kind badge**: `RECUSA FUNDAMENTADA` (refusal) or `EVIDÊNCIA INSUFICIENTE`
  (uncertain).
- Citations render as **clickable chips** (Link to the real route); the right-panel "CITAÇÕES" is
  clickable too.
- **Limits** render as bullet notes; **follow-up** questions render as clickable chips that route back
  into the same deterministic engine.
- Example questions (`SUGGESTIONS`) updated to 8 high-utility prompts (/operators=[], PASS≠certificado,
  evidência L2, idempotência, BRL, limites do BanzAI, propor alteração, ADR-002).

### Guardrails (deterministic, before any answer)

certification/approval/issuance → refusal; bypass/hide-failures → refusal; market/news/external →
uncertain; legal/regulatory → uncertain; production-ready code → candidate-not-production note; no
evidence → safe fallback. The fallback always states the corpus lacks the evidence — never invents.

### Overreach fixed (`valida manifestos`)

The KB `manifest_review` intent states the BanzAI **"não valida, não aprova e não certifica"**. The
same overreach in the reference §6 ("O BanzAI pode ajudar a **validar** manifestos") was corrected to
"ajudar a **interpretar e a rever** manifestos … não valida, não aprova e não certifica" in both synced
sources (`website/content/BANZA_REFERENCIA.md`, `docs/reference/pt/completa.md`) — a minimal editorial
alignment with the KB.

### Test (`website/scripts/check-banzai-kb.mjs`, `npm run check:kb`)

A dependency-free check (Node native TS type-stripping) with **12 cases** + an invariants sweep:
certification→refusal, PASS≠certificado, /operators=[], production_certificates=false, dólar→uncertain,
Qwen/DeepSeek→não activos, idempotência→citação, ADR-002→cita a decisão, production-code note,
bypass→refusal, legal→advice, unknown→safe fallback; plus "every answer has ≥1 citation" and "no
forbidden positive claim (`BanzAI certifica/aprova/emite/decide`, `model output is evidence`, `produção
pronta`, `production-ready`)". **PASS.** (This surfaced and fixed a real ordering bug — `trust_chain`
was matching bare "manifesto" before `manifest_review`.)

## Checks

`website` build **PASS**; `npm run check:kb` **PASS (12 cases + sweeps)**; `make reference-svg-check`
(27/27) · `purity-check` · `identity-check` · `invariant-check` · `validate-compose.sh` ·
`validate-security-headers.sh` — all **PASS**. VERSION `1.0.0`. Forbidden-claim sweep on chat sources:
the only "hits" are query-matcher keywords (`has("produção pronta"…)`, `has("production-ready"…)`) whose
answers negate them — **OK_REFUSAL**, 0 real NEEDS_FIX.

## Manual validation (browser)

Drove the required questions live: "Certifica o meu operador" → **RECUSA FUNDAMENTADA** + "não
certifica/aprova"; "Um PASS é certificado?" → "evidência técnica … não é um certificado"; "Qual a
cotação do dólar?" → **EVIDÊNCIA INSUFICIENTE** + "Não tenho fonte suficiente no corpus BANZA"; "Como
implementar idempotência?" → full answer + citations (§4 Arquitectura, §12 Programadores, Decisões) +
follow-ups. Citations render as links; no external call.

## Confirmations

- **`llm_calls=0`, `external_model_called=false`** — no LLM, no fetch, no provider, no GPU, no external
  call. The KB is pure deterministic client-side logic.
- No `VERSION` change (1.0.0). No M2, operator, or certificate. `/operators=[]`,
  `production_certificates=false` unchanged.
- No provider-runtime change; no `banzai-api` change; no secrets/`.env`.
- No services/OpenAPI/contracts/conformance change; no DNS/Cloudflare/TLS/Postgres.
- **No BanzAI-repo change.**

## Deploy

Website-only deploy on the BANZA VM after merge (recreate only the `website` container; preserve
reverse-proxy / verification-api / banzai-api / postgres). Rollback image:
`banza-website:rollback-pre-h5-banzai-mock-evidence-chat`.

## Files changed

`website/components/home/banzaiKb.ts` (engine), `website/components/banzai/BanzaiChat.tsx` (UI),
`website/scripts/check-banzai-kb.mjs` (new test), `website/package.json` (check:kb script),
`website/content/BANZA_REFERENCIA.md` + `docs/reference/pt/completa.md` (minimal manifest wording
alignment), this report.

## Risks remaining

The KB is intent/keyword-based (deterministic by design); it does not do fuzzy retrieval. Unknown
questions correctly fall back to "evidência insuficiente" rather than guessing — the intended,
conservative behaviour for a non-authoritative mock.
