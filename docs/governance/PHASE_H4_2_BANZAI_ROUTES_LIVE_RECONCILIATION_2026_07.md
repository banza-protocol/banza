# Phase H4.2 — BanzAI Landing, Chat and Reference Live Reconciliation (2026-07)

**Base:** `main` `4d2c045` (post-H4) · **Branch:** `fix/phase-h4-2-banzai-landing-chat-reference-reconciliation-2026-07`
**Repo:** `banza-protocol/banza` (BanzAI component repo not touched)

## Objective

Reconcile the three public BanzAI routes so each fulfils its distinct role, and confirm GitHub main,
the VM, the container and the public URL all serve the same state: **`/banzai` apresenta ·
`/banzai/chat` demonstra · `/referencia/banzai` documenta.**

## Reconciliation matrix (before)

| Layer | `/banzai` | `/banzai/chat` | `/referencia/banzai` |
|---|---|---|---|
| GitHub `main` `4d2c045` source | H4 landing, 1 SVG, 0 old wording | header `explica · raciocina · não certifica` | task-profile canon, 0 two-model |
| Local build (HTML) | ✓ clean | `raciocina` present | ✓ clean |
| VM origin (bypass CF) | ✓ clean | `raciocina` present | ✓ clean |
| Public (Cloudflare, DYNAMIC) | ✓ clean | `raciocina` present | ✓ clean |

**Diagnosis:** `/banzai` and `/referencia/banzai` were **already correct at every layer** (H4 / H1);
the user's earlier observation of old wording on `/banzai` was a **stale browser cache** — the origin,
VM, container and Cloudflare (DYNAMIC, uncached) all serve the H4 landing. The only genuine issue was in
`/banzai/chat`: the workspace header read `explica · raciocina · não certifica`, where **"raciocina"**
is mildly ambiguous (could read as the model reasoning/deciding).

## Change (code — 2 files, 2 lines)

- `website/components/banzai/BanzaiChat.tsx` — chat header **`explica · raciocina · não certifica`
  → `explica · cita · não certifica`** (the phase's stated preference: shorter, prudent,
  evidence-aligned).
- `website/app/banzai/chat/page.tsx` — updated the code comment to match.

No other change: the chat is already well-guarded — `DEMO` badges throughout, per-tool `Demo:` guards,
the `As ferramentas determinam a verdade. A IA explica a verdade.` guardrail, the certification panel's
`PASS é evidência técnica, não certificação. A certificação exige validação pela BANZA CA`, and the
route metadata `modo demonstração … não certifica operadores e não substitui a BANZA CA`.

## Items evaluated and kept (with rationale)

- **"Assistente de Certificação" / "Assistente de Programação"** (sidebar tools) — kept. Both carry a
  `Demo` badge and explicit non-authoritative clarifications (the certification panel states PASS is
  technical evidence, not certification, and requires the BANZA CA). **OK_DEMO_LABEL.**
- **"Sistema de Conhecimento do Protocolo"** (chat branding) — kept. It is not forbidden wording and it
  matches the framing still used by the reference chapter §10 ("BanzAI — o Sistema de Conhecimento de
  Protocolo"); changing only the chat would create a new inconsistency, and the reference is out of
  scope this phase. **OK_REFERENCE_HISTORY.**
- **`Qwen` / `DeepSeek`** on `/referencia/banzai` — the correct H1 sentence naming them as optional
  adapters ("não arquitectura obrigatória"). **OK_VENDOR_OPTIONAL.** The live `dois modelos` hit is the
  unrelated §2 "Dois Modelos: fechado vs. aberto" (infrastructure) nav entry. **OK_REFERENCE_HISTORY.**

## Route matrix (after — built HTML)

| Route | Role | Old wording? | Required wording? | Links | Verdict |
|---|---|---|---|---|---|
| `/banzai` | landing | none | 1 cognitive-engine SVG · `mock`/`light-language`/`technical-heavy` · 1 ref CTA · link to `/banzai/chat` | 1 `/referencia/banzai`, 1 `/banzai/chat` | PASS |
| `/banzai/chat` | demo | `raciocina` **gone** | `explica · cita · não certifica` · `DEMO` · guardrail | repo + panels | PASS |
| `/referencia/banzai` | canon | none | task profiles · `output do modelo nunca é evidência` | full canon | PASS |

## Checks

`website` build **PASS**; `make reference-svg-check` (27/27) · `purity-check` · `identity-check` ·
`invariant-check` · `validate-compose.sh` · `validate-security-headers.sh` — all **PASS**. VERSION stays
`1.0.0`. Forbidden-term sweep on all three route sources (`último recurso`, `únicos fornecedores`,
`modelos auxiliares`, `Por que dois modelos`, `motor de raciocínio/verificação`, `model output is
evidence`, `produção pronta`) — **0 NEEDS_FIX**.

## Deploy

Website-only deploy on the BANZA VM after merge (recreate only the `website` container; preserve
reverse-proxy / verification-api / banzai-api / postgres). Rollback image:
`banza-website:rollback-pre-h4-2-banzai-routes-reconciliation`.

## Confirmations

- **No `VERSION` change** (1.0.0). No M2, operator, or certificate. `/operators=[]`,
  `production_certificates=false` unchanged.
- No real provider / Qwen / DeepSeek activation; no keys/`.env`/secrets.
- No services runtime, OpenAPI/schema, contracts, or conformance change; no DNS/Cloudflare/TLS/Postgres.
- **No BanzAI-repo change.** No reference-content change. No SVG change. Only the chat header word and
  its comment changed (2 files).

## Risks remaining

None specific. The `/banzai/chat` sidebar tool names remain adequately demo-guarded; if a stricter tone
is later preferred, "Assistente de Certificação" can be renamed to "Guia de Certificação" in a follow-up.
