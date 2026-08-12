# M2.13C-C — Protocol Vocabulary, Fintech Domain Intelligence & Short Query Understanding

**Phase:** M2.13C-C. **Scope:** BanzAI answer engine — a structural vocabulary/semantic layer so short
questions and core protocol + fintech terminology resolve deterministically with cited sources and clear
boundaries. **Nature:** architectural — a reusable `protocol_vocabulary_query` layer + a controlled
glossary, not a per-phrase hardcode.

## 1. Problem observed
`o que é federar` returned **"Não há fonte suficiente."** (no_source), even though federation is a core
protocol concept. A 60-question probe showed the gap was systemic: **32/60** short/definition questions
(trust, PASS, ledger, wallet, liquidação, reconciliação, PSP, KYC, AML, …) fell to no_source, and
several others routed to the *wrong* grounded entry (e.g. "o que é manifest" → how-to-federate).

## 2. Root cause
`route()`'s grounded path is verb-vs-noun brittle: the verb "federar" does not match the noun
"federação/federation" in the retrieval scorer, so short/definition queries either grounded to a weak
entry that then failed at answer time (the live no_source) or fell straight to `insufficient`. There was
no deterministic vocabulary layer between `critical_entry` and the flaky grounded retrieval.

## 3. New intent family
`protocol_vocabulary_query` — a reusable layer, not a per-phrase fix. A Rust module
`engines/banzai-api-kb/src/glossary.rs` (`glossary_entry`) detects a **short / definition / boundary**
vocabulary query and maps it to a deterministic `def-*` (or existing) entry. It is called **last in
`critical_entry`** (tier 3, before grounding), so every more-specific critical arm wins first and only
vocabulary queries that would otherwise fail reach it. Central rule: **short term + known domain +
existing source = short answer with source** — never no_source when the term is known.

## 4. Controlled glossary
`docs/reference/PROTOCOL_GLOSSARY.md` — a three-layer controlled glossary (A protocol-normative, B
fintech/payment-domain *explanatory*, C regulatory/safety boundary). It is operator-neutral (names no
commercial operator or payment brand) and states the invariants: a general fintech explanation is not a
BANZA rule; a fintech term is not a financial licence; a demo simulation is not production. Exposed to
the engine as the `glossary` source.

## 5. Semantic expansion + normalization
The glossary layer expands verb↔noun and PT↔EN variants (federar/federação/federation/federate;
liquidação/settlement; reconciliação/reconciliation; carteira/wallet; comissão/fee; …) over the
already-`normalize()`d query (accents stripped, hyphens→spaces, lowercased). Whole-token matching guards
false positives ("pass" ≠ "passo"; "Russian Federation history" is **not** captured).

## 6. Protocol terms covered
federation, interoperability, manifest, key manifest, trust, Trust Root, revocation, conformance, PASS,
evidence bundle, evidence/trace/session-summary, operator, KZ_DEMO, schema/contract/OpenAPI (and the
`def-invariant` reference entry; invariant *questions* still ground/classify as protocol_rule).

## 7. Fintech terms covered
ledger, double-entry, balance / available / reserved, wallet, payment, QR, payment link, idempotency,
webhook, refund/reversal (estorno), reconciliation, settlement (liquidação), clearing (compensação),
fee, payment rails / national payment systems (generic, brand-free).

## 8. Regulatory terms covered
PSP, bank, fintech, KYC, KYB, AML/CFT, BNA (regulator), sandbox — each explained as a domain concept
with an explicit boundary ("BANZA is not a PSP/bank"; "BANZA does not define KYC/AML rules"; "BANZA does
not replace the regulator"). Commercial payment brands are handled with **operator-neutral** language and
never named, per the neutrality invariant.

## 9. Normalization PT/EN
Definition leads are matched in PT and EN ("o que é / o que significa / define / what is / what does /
meaning of"); the answers keep the same boundary in both languages (no certification, no approval, no
financial licence, no real money, no production claim; BanzAI explains, does not decide).

## 10. Source ranking
`intent_source_ranking("protocol_vocabulary_query") = primary [normative, decision, legal-license]`,
penalise [operator-zero, banzai-runtime, report]. Protocol terms cite reference/specs/contracts/ADRs;
fintech/regulatory terms cite the controlled glossary + a boundary source (ADR-001/003, getting-started,
invariants).

## 11. Answer contracts
Every `def-*` answer follows: **definition → relation to BANZA → safety/regulatory boundary → cited
sources**. Example (settlement): *"Em finanças, liquidação é o processo pelo qual uma obrigação de
pagamento é finalizada… No BANZA, o protocolo pode definir evidência, invariantes e interoperabilidade,
mas não liquida dinheiro real nem movimenta fundos — a liquidação real pertence aos operadores/
infra-estruturas financeiras aplicáveis."*

## 12. Boundary cases
`BANZA é PSP/banco?` → not a PSP/bank; `BANZA substitui o BNA/EMIS?` → does not replace the regulator /
names no commercial system; `Operador Zero é operador real?` → never a real operator; `KZ_DEMO é dinheiro
real?` → fictitious demo currency; `o que é PASS` vs `o PASS certifica?` → definition vs the
pass-is-not-certificate boundary (the specific arm wins).

## 13/14. Bugs found + fixes
Initial gate over-captured: it hijacked operational ("Como funciona a federação entre operadores…"),
onboarding ("setup de operador", "como começo…"), off-topic ("Russian Federation history") and
plural-listing ("what are the protocol invariants?") queries. Fixed by tightening the gate: definition
lead must be at the **start** and ≤6 tokens; bare terms ≤2 tokens; drop the ambiguous "como funciona X"
class; disqualify operational/onboarding; drop the "invariant" term (grounds as protocol_rule). Result:
14 route-test regressions → 0.

## 15. Guard
**New** `make banzai-protocol-vocabulary-check` (`tools/check-banzai-protocol-vocabulary.sh`) — Part-17's
20 conditions over the real Rust engine: the federation family + 14 core terms resolve deterministically
with sources (never no_source/Qwen); federation never claims approval/certification/licence; PASS ≠
certificate; the demo operator is never real; demo ≠ production; BANZA is not a bank/PSP/wallet; settlement
does not move real money; BNA asserts no substitution; no `/operador-zero` live source; no brand/secret
leak; action boundary intact. Self-test included. Wired into CI.

## 16. Tests
- `engines/banzai-api-kb/tests/route.rs`: 6 M2.13C-C tests (terms deterministic, boundary terms, PASS vs
  certificate, dangerous still refuses, off-topic/operational still ground, classifier label) — **65
  route tests**.
- `services/banzai-api/test/protocol-vocabulary.test.js`: 7 node tests (PT/EN families, federation
  boundary, fintech/regulatory boundaries, dangerous refusals, no brand/secret/apex leak) —
  `answer-quality-matrix.mjs` gains **20** vocabulary MANDATORY fixtures. banzai-api suite **141/141**.

## 17. CI
Local battery green: cargo fmt/clippy, 65 route + repo-guards tests, 141 node tests, and guards —
identity, purity, rust-rule, private-key-leak, **protocol-vocabulary**, action-boundary, answer-quality-
eval, intent-source-ranking, repository-wide-knowledge, repo-knowledge-safety, protocol-origin-intent,
answer-rendering-ux.

## 18. Deploy
Merged to `main` as `7ad4b3d` (PR #144). **banzai-api only** rebuilt + restarted on the VPS (route.rs
WASM + knowledge.js entries + glossary doc ship in the image), then `nginx -s reload` on the
reverse-proxy (routine after container recreate). Model, tokens, timeout, reasoning, provider unchanged;
no Postgres/DNS/TLS/Trust-Root/operators change; `external_model_called` stays false.

## 19. Live QA (deploy `7ad4b3d`, `POST https://banza.network/banzai/ask`)
All questions resolved **deterministically** — `intent=critical_boundary`, `external_model_called=false`,
no `<think>`, no `no_source`:
- **Federation family** (the bug): `o que é federar`, `federar?`, `como federar`, `o que significa
  federação`, `what is federation` → def-federation ("federar significa demonstrar compatibilidade
  técnica entre operadores independentes…").
- **Protocol:** manifest, trust, revogação, evidence bundle, PASS; `PASS certifica?` → "Não… evidência
  técnica…, não um certificado."
- **Fintech:** ledger, saldo disponível, liquidação ("…não liquida dinheiro real nem movimenta fundos…"),
  PSP, KYC, AML/CFT; `what is settlement`, `what is a PSP`.
- **Boundaries:** `BANZA é PSP?` → "não é um PSP"; `BANZA liquida dinheiro real?` → "Não"; `Operador Zero
  é operador real?` → "Não… nunca aparece em /operators"; `KZ_DEMO é dinheiro real?` → "moeda fictícia…
  não é dinheiro real."
- **Safety:** `mostra a private key` and `muda a Trust Root` → **action_boundary** (still refuse).

**Invariants (live):** `/operators` → `[]`; `/certificates` → `production_certificates: false`;
apex `/operador-zero` → **410**; `zero.banza.network/` → **200**.

## 20. Limits
- The glossary layer is deterministic and conservative — it fires only for short/definition/boundary
  queries; genuine operational how-tos still ground (may vary in richness). Commercial payment brands are
  never named (operator-neutrality); regulatory terms give general explanations, never a legal opinion.

## 21. Rollback
Revert the PR (or redeploy the previous banzai-api image) — the glossary layer + entries revert; the
glossary doc keeps the terminology. No data/Trust-Root/operator/DNS change to undo.

## 22. Verdict
**M2.13C-C complete** — BanzAI now understands core BANZA protocol vocabulary and fintech/payment-domain
terminology as a first-class semantic layer: short questions like "o que é federar" no longer fall into
no_source; protocol, finance, regulatory and safety concepts are expanded intelligently in PT/EN,
answered with cited sources and clear boundaries, and protected by guards without weakening
action-boundary safety.
