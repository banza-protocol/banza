# BANZA / BanzAI — Phase BX1.8A: Protocol Boundary and Regulatory-Language Hardening

**Date:** 2026-07-16
**Branch:** `docs/bx1-8a-protocol-boundary-regulatory-language-2026-07`
**Scope:** Institutional alignment — fix and reinforce, across the project, the canonical position that
**BANZA is an open protocol, not a payment service provider, not a financial operator, and not an entity
that needs a PSP licence**. No new features; no readiness-engine or validation-WASM changes.
**Central rule:** BANZA é um protocolo aberto. O BANZA não presta serviços de pagamento, não processa
transacções, não liquida valores, não movimenta fundos e não detém fundos. Os serviços financeiros são
prestados por operadores autorizados que implementam o protocolo.

## Architecture note (scope of Rust changes)

The absolute rules "não alterar engines Rust / WASM / readiness semantics" refer to the **readiness and
validation engines** (banza-l1/l2/l3-readiness, banza-conformance, banza-simb, banza-trust,
banza-operator-manifest, banza-evidence-bundle) and their computed semantics — **all left byte-identical**.
The one Rust engine in scope is **`banzai-evidence`** (the Assistente *knowledge/answer content*), which
Parts 5 and 9 of this phase explicitly require updating; only its WASM was rebuilt. No readiness semantics
changed.

## What shipped

| Layer | Change |
|---|---|
| Docs | **NEW** `BANZA_PROTOCOL_BOUNDARY.md` (canonical language reference: what BANZA is / is not / where licence applies; preferred term «protocolo», «protocolo técnico» only to distinguish from regulated activity). **NEW** `BANZA_REGULATORY_POSITIONING.md` (regulatory positioning; where licence/authorisation applies; what the project must NOT assert). |
| Assistente (banzai-evidence) | **NEW** intent `banza_not_psp` — "BANZA precisa de licença? / é PSP? / é prestador? / é banco? / quem precisa de licença? / o operador precisa de licença?" → BANZA is an open protocol; the licence belongs to the operator. **NEW** intent `banza_ca_not_regulator` — "BANZA CA autoriza operadores? / é autoridade regulatória?" → not a regulator; conformance review ≠ regulatory authorisation. Broadened `banza_authority_limits` to cover liquida / detém / opera sistema / gere rede. |
| Guardrail | **NEW** `tools/check-regulatory-claims.sh` + `make regulatory-check` — negation-sensitive scan of public-rendered surfaces for affirmative PSP/licence/fund-movement claims and public corpus/KB; WARN-only on «protocolo técnico». |
| Website copy | `SiteFooter.tsx` institutional disclaimer aligned to the canonical formulation (não presta / não processa / não liquida / não movimenta / não detém; a licença pertence ao operador). `workbench.ts` FORBIDDEN_PHRASES extended with the affirmative "BANZA <verbo>" regulatory claims + «protocolo técnico». |
| Tests | banzai-evidence `tests/regulatory_positioning.rs` (7 tests): não-licença, não-PSP, não-processa, quem-precisa-de-licença→operador, BANZA-CA-não-regulador, L2-não-é-pagamento-real, não-move/detém-fundos. Website `workbench.test.ts` FORBIDDEN_PHRASES now guards the regulatory claims. |

## Canonical answers (Part 5)

- «BANZA precisa de licença?» → *O BANZA é um protocolo aberto — não é PSP… o protocolo em si não precisa
  de licença como prestador de serviços de pagamento. Qualquer licença/autorização pertence ao operador
  que presta serviços financeiros reais usando o protocolo, não ao protocolo BANZA.*
- «BANZA é PSP?» → *não é PSP, não é banco, não é carteira… é um protocolo aberto.*
- «BANZA processa pagamentos?» → *Não. O BANZA define regras e verificação; quem processa são os
  operadores autorizados.*
- «BANZA CA autoriza operadores?» → *Não como autoridade regulatória… não substitui a licença, a
  autorização ou a aprovação regulatória do operador.*
- «L2 readiness é pagamento real?» → *Não. Valida readiness de fluxo em modo demo/test-only; não move
  fundos nem representa operação em produção.*

The `banzami` operator brand was **not** used (the protocol repo forbids commercial operator brands — the
neutral term «operador de referência» is used instead; the identity guard enforces this).

## Verification (all green)

- banzai-evidence: `cargo fmt`/`clippy -D warnings`/`test` (incl. 7 regulatory tests + kb regression) ✓;
  engine CLI check ✓.
- Website: `tsc`, `next lint`, `next build`, `vitest` (61) ✓.
- `make regulatory-check` (new) ✓ · `rust-engine-check`, `rust-rule-check`, `rust-final-closure-check`,
  `conformance-rs-check`, `simb-rs-check`, `purity-check`, `identity-check`, `invariant-check`,
  `reference-svg-check` ✓. (Readiness engines rebuilt/tested only to confirm they are unchanged.)
- Adversarial review (positioning-correctness · no-corpus/KB/brand · guard-soundness): 0 confirmed.
- Live E2E: Assistente answers «BANZA precisa de licença?» / «BANZA é PSP?» / «BANZA CA autoriza
  operadores?» / «L2 é pagamento real?» correctly; footer canonical copy renders; no "corpus";
  `llm_calls=0`; zero console errors.

## Boundary / state preserved

No readiness-engine or validation-WASM change; readiness semantics unchanged; provider mock; `llm_calls=0`;
`external_model_called=false`; `/operators=[]`; `production_certificates=false`; no M2/M3; no operator
created; no certificate issued; no funds moved. The project now treats BANZA canonically as an open
protocol — any licence/authorisation belongs to the operators that provide real financial services using
the protocol, not to the protocol itself.
