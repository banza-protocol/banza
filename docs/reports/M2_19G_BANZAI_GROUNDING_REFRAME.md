# M2.19G — BanzAI Grounding Reframe

**`knowledge.js` answer changes — the retired simulator model replaced by the read-only reference model**

**Status:** COMPLETE · Supporting report to `M2_19G_PUBLIC_SURFACE_RECONSTRUCTION_REPORT.md`
**File:** `services/banzai-api/src/knowledge.js` (15 answer entries reframed)

BanzAI grounds its deterministic answers on the `ENTRIES` knowledge base in `knowledge.js`. M2.19G reframed
**15 answer entries** so that what BanzAI says about Operador Zero and the stack matches the ADR-067
read-only reference model — no "simulador" as an executing thing, no `100/100` score, no "PASS demo" as a
status, no 7-step journey — while preserving every boundary claim (not a bank/PSP/wallet, no real money,
never in `/operators`, evidence ≠ certification, BanzAI does not certify/approve).

The reframe changes wording only; it does not add capabilities, does not weaken any refusal, and Rust still
decides while Qwen only explains.

---

## Answer entries reframed

| # | Entry (topic) | Core change |
|---|---|---|
| 1 | Operador Zero definition | "o simulador de operador de pagamentos de referência … Executa fluxos demonstrativos …" → "a **implementação de referência só de leitura** … é só de leitura, não tem ledger interactivo nem mutável e não se auto-valida". |
| 2 | Demo Operator Root | "assinar e verificar artefactos do simulador" → "assinar e verificar os artefactos do Operador Zero, a implementação de referência só de leitura". Still NOT the protocol Trust Root; `not_protocol_trust_root: true`. |
| 3 | "aprovado / aprovação" question | "validado como simulador demo … PASS demo" → "avaliado como implementação de referência só de leitura … a jornada de validação no BanzAI … produz evidência técnica local". |
| 4 | "aparece em /operators?" | "um simulador demo … zona separada de simuladores demo" → "a implementação de referência só de leitura … zona separada das implementações de referência (demo)". Still **Não** — never in `/operators`. |
| 5 | "onde ver o estado" | "estado demo: validado como simulador demo (PASS demo), etapas 7/7 … score 100/100" → "estado técnico: avaliado como implementação de referência só de leitura, **jornada de validação 9/9**, artefactos 6/6, 0 blockers" (score line removed). |
| 6 | "como usar no BanzAI" | Retired the 6-step "Manifest → Conformidade → Trust → Federação → Evidence Bundle → Traces" for the **9-step journey** (Descoberta → Manifesto → Chaves → Conformidade → Interoperabilidade → Confiança → Federação → Evidence Bundle → Prontidão de certificação); now names `/banzai?mode=validation&target=operator-zero&workflow=full` and "o Rust decide, o Qwen explica". |
| 7 | "em que linguagem foi criado" (stack) | "o simulador Operador Zero" → "a implementação de referência Operador Zero"; "o laboratório do Operador Zero" → "a superfície de referência só de leitura do Operador Zero". |
| 8 | `def-rust` | "o simulador Operador Zero" → "a implementação de referência Operador Zero". |
| 9 | `def-wasm` | "o simulador Operador Zero" → "a implementação de referência Operador Zero". |
| 10 | "quem implementa o protocolo" | "O Operador Zero é apenas um **simulador** de referência (demo)" → "é apenas a **implementação de referência** (demo, só de leitura)". |
| 11 | cannot-publish/certify (critical) | "o Operador Zero é um simulador demo-only que nunca é um operador real" → "é a implementação de referência só de leitura (demo-only) que nunca é um operador real". Refusal preserved. |
| 12 | cannot-admit/federate (critical) | "o Operador Zero é apenas o simulador demo de referência" → "é apenas a implementação de referência só de leitura (demo…)". Refusal preserved. |
| 13 | validate-manifest (critical) | "compatível com o simulador demo" → "compatível com a implementação de referência só de leitura"; validation-engine still runs at the Manifest step, still "validação técnica não é certificação". |
| 14 | operator-zero-only (ADR-053) | "um **PASS demo** é evidência técnica local" → "a evidência que produz é **evidência técnica local**". |
| 15 | `def-kz-demo` | "a moeda **fictícia** do simulador Operador Zero" → "a unidade de demonstração (moeda fictícia) do Operador Zero, a implementação de referência só de leitura". Still `monetary_value: false`, not real money. |

---

## What was preserved

- Every **boundary/refusal** answer keeps its refusal: BanzAI cannot publish, certify, approve, admit,
  license, activate or federate operators, and cannot add Operador Zero to `/operators`.
- Every **not-a-financial-institution** claim (not a bank/PSP/wallet/licensed financial operator, no real
  money, uses KZ_DEMO) is intact.
- `production_certificates: false`, `demo_only: true`, `monetary_value: false`, `production_allowed: false`,
  `not_protocol_trust_root: true` all unchanged.
- The `sources` on each entry are unchanged (`adr052`, `adr038`, `adr053`, `annex`, `rustPolicy`, etc.) —
  ADR-052 remains cited as the historical decision, now read through the ADR-067 read-only reframe.

## Downstream

The reframed answers feed the grounding corpus/WASM. The reconstruction commit records the corpus + WASM +
vocabulary regeneration (445 sources) so BanzAI serves the current wording. Live BanzAI verification —
that `/banzai/ask` on Operador Zero, three-layer, L2-certification and cert-vs-authorisation questions
grounds on the current ADRs with `external_model_called=false` — is part of the **PENDING DEPLOY**
production validation in the primary report.

---

## Verdict

BanzAI's deterministic answers now describe Operador Zero as the read-only reference implementation with a
9-step BanzAI validation journey and no score / no PASS-demo / no 7-step, while every boundary and refusal
is preserved. 15 entries reframed; Rust still decides, Qwen still only explains.
