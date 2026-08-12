# BANZA — Phase M2.0A: Open Financial Protocol Identity Hardening

**Date:** 2026-07-17
**Branch:** `docs/m2-0a-open-financial-protocol-identity-hardening-2026-07`
**Scope:** Positioning, documentation, copy, guardrails, tests and institutional language. Affirm — **by the
positive** — that BANZA is and will remain an **open financial protocol** (`protocolo financeiro aberto`),
and remove any framing that suggests BANZA could *become* a financial operator, PSP, bank, wallet, provider
of financial services or an entity that needs a payment-service licence. **No new protocol features, no
operational production, no operator/certificate/fund changes.**

> **Regra central.** BANZA é um protocolo financeiro aberto. BANZA não é e nunca será operador financeiro,
> PSP, banco, carteira, prestador de serviços financeiros ou entidade que processa, liquida, movimenta ou
> detém fundos.
>
> **Formulação canónica.** BANZA é um protocolo financeiro aberto para interoperabilidade, conformidade e
> evidência em pagamentos. O BANZA não é prestador de serviços de pagamento, não é operador financeiro, não
> processa transacções, não liquida valores, não movimenta fundos e não detém fundos. Os serviços
> financeiros são prestados por operadores autorizados que implementam o protocolo.

## Permanent Protocol Identity

The lead framing across the project is now **`protocolo financeiro aberto`**, affirmed positively rather
than only negated. The identity is treated as **permanent**, not a phase that could change: the project
does not describe BANZA as something to «avoid transforming» into an operator/PSP — that phrasing wrongly
implies a possibility. Preferred framings: `protocolo financeiro aberto`, `protocolo BANZA`, `protocolo
aberto`, `protocolo de interoperabilidade financeira`, `fronteira protocolo/operador`. «Protocolo técnico»
is only a distinguishing qualifier, never the primary public framing.

## What changed

| Layer | Change |
|---|---|
| Canonical docs | `BANZA_PROTOCOL_BOUNDARY.md` + `BANZA_REGULATORY_POSITIONING.md` lead with «protocolo financeiro aberto» and add a **Permanent Protocol Identity** section (affirm-by-positive; operators are separate entities; the identity is not a phase). New canonical substitutions for possibility-framing. |
| M2 docs | `M2_PRODUCTION_PROTOCOL_IMPLEMENTATION.md` boundary → «protocolo financeiro aberto» + «M2 é produção do protocolo, não operação financeira do BANZA». |
| Assistente (Rust) | `banzai-evidence`: NEW intent `banza_open_financial_protocol` (BANZA é operador financeiro? / pode virar operador financeiro? / pode virar PSP? / é protocolo técnico? / é protocolo financeiro? / quem presta serviços financeiros? → affirm the permanent identity). `what_is_banza`, `banza_not_psp` and `m2_production` re-led with «protocolo financeiro aberto». 8 new tests. |
| M2 engine (Rust) | `banza-m2-protocol-gate` BOUNDARY / PROTOCOL_STANCE → «protocolo financeiro aberto» + «produção do protocolo, não operação financeira». WASM rebuilt. |
| Guardrail | `tools/check-regulatory-claims.sh`: NEW identity block (possibility-framing «transformar BANZA em operador/PSP», «BANZA vira/pode virar operador/PSP», «BANZA é operador financeiro») + a **special negation-agnostic rule** — «não transformar BANZA em operador financeiro» is always NEEDS_FIX (suggests a forbidden possibility). Built-in **self-test** validates the detection logic on every run. |
| Website copy | Footer, `/o-que-e` (metadata + lede), reference intro and the Workbench boundary boxes lead with «protocolo financeiro aberto»; M2 copy uses permanent-identity framing («BANZA permanece protocolo financeiro aberto») instead of «não transforma BANZA em PSP». `workbench.ts` denylist extended with the identity-misframing phrases. |
| Tests | `banzai-evidence/tests/open_financial_protocol.rs` (8); updated pinned kb CASE + regulatory-positioning + m2_production assertions to the new canonical phrase; guard self-test. |

## Pre-production state unchanged

`/operators = []`, `production_certificates = false`, provider mock, `llm_calls = 0`,
`external_model_called = false`. No operator created, no certificate emitted, no funds moved, no financial
services provided by BANZA. No `.env`/VERSION/DNS/TLS/Cloudflare/Postgres/secret changes; website-only
deploy.

## Checks

`cargo fmt` + `clippy` + `cargo test` (banzai-evidence full incl. `kb` + open_financial_protocol,
banza-m2-protocol-gate 14), WASM rebuild (banzai_evidence + m2; siblings byte-identical), `npm run test`
(vitest 105), `npm run type-check` (tsc), `npm run build` (next), and the `make` guards: regulatory-check
(with self-test), identity-check, purity-check, invariant-check, rust-rule-check, rust-engine-check,
rust-final-closure-check, conformance-rs-check, simb-rs-check, reference-svg-check — all green. Browser E2E
on `/banzai/workbench` + `/banzai/chat`. Adversarial multi-agent review.
