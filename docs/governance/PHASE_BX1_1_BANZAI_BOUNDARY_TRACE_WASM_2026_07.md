# PHASE BX1.1 — Boundary Refusal Hardening & Trace Verifier WASM

> **Status: COMPLETE.** Two deliverables: (1) the Assistente now refuses every certify/approve/emit/
> register/hide-fail request with a fundamented refusal (never `uncertain`); (2) the **Traces** tab is a
> real tool — it runs the Rust trace verifier (`banzai-core`) compiled to WASM, in the browser, showing
> PASS/FAIL técnico, invariants, timeline and a causal summary. No provider, no external call.

**Date:** 2026-07-16 · **Repo:** `banza-protocol/banza` (website + `banzai-evidence`) ·
WASM vendored from `banza-protocol/banzai` `banzai-core` @ `9354795`.
**Boundary (permanent):** BanzAI runs/explains tools and prepares evidence; it does **not** certify,
approve or issue certificates, and does not alter `/operators` or `/certificates`.
`llm_calls=0`, `external_model_called=false`, mock provider, `/operators=[]`, `production_certificates=false`.

---

## Part 1 — audit matrix

| Área | Estado (BX0) | Acção BX1.1 |
|---|---|---|
| Assistente refusal | "certifica este operador" → `uncertain` | **hardened** → firm refusal |
| Traces tab | static flow + chips (conceptual) | **real WASM tool** (banzai-core) |
| banzai-evidence WASM | live, `answer_query` | rebuilt with hardened guards |
| banza-conformance/trust/simb | native-only | unchanged (out of BX1.1 scope) |

## Part 2–3 — boundary refusal (Rust engine)

`engines/banzai-evidence` (`answer`): the `certification_request_refusal` and `malicious_or_bypass`
guards were broadened to catch the imperative / varied forms that previously fell through to
`uncertain`. New refusal copy: **"Não posso certificar, aprovar ou emitir certificados. O BanzAI não
certifica, não aprova e não emite certificados — posso executar ferramentas técnicas, gerar evidência e
explicar resultados…"** with limits ("PASS é evidência técnica, não certificação.", "A certificação é
uma decisão da BANZA CA.", pré-produção) and citations `/referencia/certificacao`, `/certificates`,
`/operators`, `/referencia/banzai`. A cert-**state** question ("este operador está certificado?") returns
an informative **answer** (`/operators = []`), never `uncertain`.

Verified natively for 15 phrasings — certify / approve / emit / generate-cert / register / mark-certified
/ hide-fail → refusal; "PASS é certificado?" / "este operador está certificado?" → answer; none
`uncertain`, all `llm_calls=0`. New test `tests/boundary.rs` (3 tests) + the R2 eval battery (6) stay
green. The web WASM (`website/lib/wasm/banzai_evidence*`) was rebuilt (`wasm-pack --target web`).

## Part 4–7 — Traces verifier (WASM)

- **`banzai-core` → web WASM** (`wasm-pack --target web`, from banzai@`9354795`) vendored at
  `website/lib/wasm/banzai_core*` with provenance. `trace_explain_json(input, ref?)` exported.
- **`website/components/banzai/traceVerifier.ts`** — RUST_WRAPPER_ONLY adapter: loads the WASM and
  marshals JSON; `verifyTrace(trace)` returns the report; `traceStatus()` derives the display badge
  (rendering only). No verification logic in TypeScript. 4 demo fixtures (valid / settlement-fail /
  trace_id-fail / missing-event), each triggering a distinct, honest engine result.
- **Traces tab** — real tool: fixture toggle + paste-JSON textarea + **Verificar trace** (loading /
  result / error / empty states). Result shows the top-level PASS/FAIL técnico badge, per-invariant
  checks (INV-TRACE-001 / INV-LEDGER-001 / INV-STL-001), the timeline and the causal summary, plus
  **Perguntar ao Assistente sobre este resultado**, **Copiar relatório**, **Exportar JSON**. Boundary:
  "Esta verificação de trace é evidência técnica. Não é certificação."
- **Sidebar** reacts to Traces: tool (`banzai-core · trace verifier`), mode, status, per-invariant
  results, "Copiar resultado", boundary. **Assistente** gets a summarized trace prompt when the user
  asks about a result (no re-execution; boundary kept).

## Part 8–10 — copy, tests, claims

Assistente examples now include a boundary example ("Certifica este operador?") and trace examples
("Explica este trace FAIL", "Como corrigir INV-LEDGER?", "Preparar evidência para revisão"). Tests:
`banzai-evidence` boundary (3) + eval (6) green; website `vitest` (workbench 6 + traceVerifier 4 = 10)
green. `rust-rule-guard` excludes the generated `wasm` dir (the wasm-pack glue carries engine symbols).
**Claims sweep = zero NEEDS_FIX** (all occurrences are OK_NEGATED, OK_BOUNDARY, or OK_TEST_PATTERN).

Browser-verified: "certifica este operador" → RECUSA FUNDAMENTADA + citations; Traces valid → PASS
técnico, settlement-fail → FAIL técnico (INV-STL-001), "Perguntar ao Assistente" → explanation. Only
console entry is the pre-existing root-layout `js`-class hydration warning (all pages, unrelated).

## Part 12–13 — deploy + validation

Website-only deploy (documented procedure): rebuild image on VM, tag `banza-website:rollback-prev`,
recreate **only** the website container (`--no-deps --pull never`). banzai-api / reverse-proxy /
verification-api / postgres untouched. No banzai-repo deploy (only its WASM artifact was vendored).
Post-deploy validation: `/banzai/workbench` + `/banzai/chat` 200, refusal live, Traces PASS/FAIL live,
`POST → 405`, `/operators=[]`, `production_certificates=false`, headers intact, `llm_calls=0`.

**Scope note (honest):** BX1.1 delivers safety + the first real tool. Conformance / Trust & BRL / SimB
full execution stay demo/skeleton (native-only engines pending their own WASM ports) — not promised.

**Verdict:** `BANZA / BANZAI BX1.1 BOUNDARY REFUSAL AND TRACE VERIFIER COMPLETE`.
