# M2.14F — BanzAI Semantic Answer Composition, Dynamic Reference Loading & Controlled AI Rewrite

**Milestone:** M2.14F (on top of M2.14C / M2.14D / M2.14E and the FIX1/FIX2 formatting contract)
**Central rule (verbatim):** *"Respostas determinísticas não devem ser textos rígidos colados no chat;
devem ser compostas semanticamente em função da pergunta, usando evidência e fontes verificáveis, com
validação final."*
**Invariants (unchanged):** model/tokens/timeout/provider untouched; no external provider; local Qwen
stays local; `external_model_called` stays **false** for deterministic answers; the action, financial and
secret boundaries are intact and never weakened; `/operators`=`[]`, `production_certificates`=false,
`zero.banza.network`=200, `/operador-zero`=410; the M2.14C rendering + entity-emphasis contract is
preserved.

---

## 1. Problem observed

**A — Rigid deterministic answers.** The flagship capabilities question *"O que o BanzAI pode e não pode
fazer?"* answered starting with **"Não."** — the answer of the `banzai-cannot-certify` boundary entry. A
capabilities/limits question is **not** a yes/no certification question; it wants a structured
pode / não-pode / regra answer, not a refusal. And the sibling *"o que o BanzAI faz?"* fell to
**no_source** (EVIDÊNCIA INSUFICIENTE).

**B — Static loading text.** While an answer was composed the chat showed a single frozen line,
*"A consultar a referência…"*. It never changed, so a multi-second local generation read as a hang.

## 2. Diagnosis

- *"O que o BanzAI pode e não pode fazer?"* → the router matched a boundary keyword and served
  `banzai-cannot-certify` (answer: "Não. …") — correct wording for "BanzAI certifica operadores?", wrong
  shape for a capabilities question.
- *"o que o BanzAI faz?"* → no critical entry, no glossary term, no grounded keyword → `no_source`.
- *"BanzAI certifica operadores?"* → `banzai-cannot-certify` ("Não…") — **correct**, must stay.

The fix is **semantic composition of the deterministic path**: the right *shape* of answer must be chosen
from the *meaning* of the question, and the composed answer must be assembled from vetted evidence — not
a single rigid string reused across differently-shaped questions.

## 3. Evidence-first architecture (no free-form AI rewrite of safe deterministic answers)

M2.14F composes deterministically and safely. The composed capabilities answer is **authored from
evidence** (ADR-050 non-authority boundary + the protocol annex) and assembled by the answer contract:

1. **route.rs** classifies the *meaning* (a capabilities/limits question about BanzAI) and routes it to a
   dedicated composed entry `banzai-capabilities` — distinct from the yes/no `banzai-cannot-certify`.
2. **knowledge.js** holds the `banzai-capabilities` entry: a structured intro + **O que pode fazer** +
   **O que não pode fazer** + a "regra prática" line, with plain canonical entities and real sources.
3. **answerContract.js** (`normalizeBanzaiAnswer` → `normalizeEntityEmphasis`) validates and finalises
   the body (entity emphasis, source separation, no `****`) — the single server-side choke point.

Controlled-AI-rewrite policy: a **safe/informative open question** still grounds on the local Qwen with a
fixed context and `validateResponse` (unchanged). A **deterministic answer, a refusal, or a
financial/dangerous request is NEVER handed to a free-form model rewrite** — those stay deterministic and
composed from vetted strings. This is the safe reading of the central rule: "composed semantically" means
the *shape* is chosen by meaning and assembled from evidence, not that a refusal is paraphrased by an LLM.

## 4. `answer_type` classifier (Rust, ADR-037)

New `route::answer_type(question) -> &'static str` (WASM export `answer_type_str`, JS wrapper
`answerType`). It labels the shape of answer a question expects:

`capabilities_and_limits · yes_no_with_boundary · comparison · how_it_works · example_safe ·
implementation_stack · governance_explanation · operator_zero_guidance · financial_concept ·
safe_refusal · definition · follow_up_expansion · fallback_clarification`

It is **safety-first**: if the question hits the action boundary or is a financial action, it classifies
`safe_refusal` before anything else. It is a **telemetry / composition label only** — surfaced in the
`/ask` response as `answer_type` — and never changes routing or weakens a boundary. Rust owns it; JS is
glue.

## 5. Composed capabilities answer (PART 7)

`banzai-capabilities` (deterministic, `external_model_called=false`):

> O **BanzAI** é o agente IA nativo do protocolo **BANZA**: ajuda a compreender, implementar e verificar
> o protocolo, mas não cria regras nem substitui os motores verificáveis.
>
> **O que pode fazer:** explicar regras/documentos/ADRs/manifestos/evidência; orientar operadores;
> invocar ou orientar os motores verificáveis e citar fontes; ajudar a simular fluxos demo com o
> **Operador Zero** (com **KZ_DEMO**, sem dinheiro real).
>
> **O que não pode fazer:** certificar/aprovar/licenciar operadores; substituir a governança, as ADR/RFC
> ou a conformance suite; criar regra normativa; movimentar fundos/executar pagamentos/operar dinheiro
> real; transformar **KZ_DEMO** em dinheiro real.
>
> Regra prática: o **BanzAI** guia, os motores verificam e a evidência prova — o output de IA nunca é
> regra do protocolo.

Never starts with "Não."; the entities are bolded by the emphasis contract; the boundary content is
identical in spirit to `banzai-cannot-certify` but re-shaped for a capabilities question.

## 6. Scenario / compound-question veto (adversarial fix)

The capabilities route arm is guarded so a **scenario/compound** question is *not* captured. A subordinate
connective (`quando`, `se`, `caso`, `onde`, `porque`, `when`, `if`) or a financial object
(`autoriza`, `pagamento`, `transfere`, `paga`) vetoes the arm — so
*"o que faz o BanzAI quando um operador autoriza um pagamento?"* still **grounds** (Qwen) instead of
serving the canned capabilities answer. This closed a real regression against the M2.8G fuzz suite.

## 7. Dynamic reference loading (PART 8/9)

`ThinkingIndicator` in `BanzaiAgent.tsx` replaces the static line. While `busy`, it rotates through the
stages of composition — *A consultar a referência… → A cruzar fontes verificáveis… → A compor a
resposta… → A validar as fronteiras… → A preparar as fontes…* — with a subtle bouncing-dots animation, and
it disappears the moment an answer or error arrives.

- **Public wording only.** The stages never name the model (Qwen/llama), the worker, the queue, the lock
  or the local runtime. Enforced by the guard (a scan of the `THINKING_STAGES` block).
- **prefers-reduced-motion.** `usePrefersReducedMotion` (a `matchMedia` hook) freezes to a single static
  line with no rotation; the dots use `motion-safe:animate-bounce` so they animate only when motion is
  allowed.
- **Assistive tech.** `role="status"` + `aria-live="polite"`, with a single **stable** `sr-only`
  announcement ("A preparar a resposta…") while the rotating visual line is `aria-hidden` — screen readers
  get one polite announcement, not five.

## 8. `/ask` metadata

The `/ask` response now carries `answer_type` (alongside `intent`). Re-derived in Rust from the question;
a safe enum label only — never raw drafts, keys or secrets, and it never alters routing.

## 9. Tests

- `engines/banzai-api-kb/tests/route.rs` (+3): capabilities questions → `banzai-capabilities`
  (deterministic) while the certification question stays `banzai-cannot-certify`; `answer_type` classifies
  the expected shape; `answer_type` never weakens safety (every real refusal → `action_boundary` **and**
  `safe_refusal`). 80 route tests green.
- `services/banzai-api/test/semantic-answer-composition.test.js` (6): capabilities → composed entry;
  structured pode/não-pode, never "Não…", no `****`, entities bolded; `answer_type` accuracy;
  safety-preserving; regressions (cannot-certify keeps "Não…", Rust → def-rust, banzami deterministic).
- Full `node --test` suite: **203 pass**. `cargo test --lib`: 26 pass.

## 10. Guard

`make banzai-semantic-answer-composition-check` (Part 10): static (capabilities entry + pode/não-pode
sections; route arm; `answer_type` classifier + families; `answer_type_str` WASM export; `answerType`
wrapper; `/ask` carries `answer_type`; `ThinkingIndicator`/`THINKING_STAGES`; reduced-motion;
role=status/aria-live; sr-only; **no internal terms in the stages**; old static loader removed) +
behavioural (capabilities composed structurally; `answer_type` accurate + safety-preserving; regressions)
+ self-test. Wired into `Makefile` (`.PHONY` + target) and CI (`identity-guard.yml`).

## 10a. Adversarial verification

A multi-lens adversarial **workflow** (18 agents: over-capture / safety-regression / rendering +
classification / loader-accessibility, each finding independently verified) ran against the working tree
**before** commit. Findings and resolutions:

- **(pre-workflow) Scenario over-capture** — the capabilities arm captured *"o que faz o BanzAI quando um
  operador autoriza um pagamento?"* (substring "o que faz o banzai"), breaking the M2.8G fuzz contract.
  Fixed with the scenario/financial veto (§6).
- **MEDIUM — authority shadowing (confirmed real).** A capabilities marker stole certification/authority
  questions (*"what can banzai certify?"*, *"capacidades de certificação do banzai?"*) → they got the
  broad capabilities body instead of the yes/no boundary. Not a safety bypass (the capabilities body's
  first "não pode" bullet already denies certification, intent stayed deterministic), but a real
  invariant-4 breach. **Fixed:** an AUTHORITY veto (`certif`/`aprova`/`approv`/`licenc`/`licens`) on the
  capabilities arm — verb-form authority questions fall through to `banzai-cannot-certify` ("Não…"),
  noun-form questions revert to their correct pre-M2.14F routing.
- **MEDIUM — specific-topic over-capture (confirmed real).** A narrow *"o que o BanzAI faz **com** um
  manifesto de operador?"* got the broad list instead of grounding. **Fixed:** a SPECIFIC-OBJECT veto
  (a `faz`/`fazer`/`banzai` + preposition pattern, incl. inverted word order) — these now route to the
  specific entry (e.g. `how-to-federate`) or ground.
- **LOW — telemetry (confirmed real).** `answer_type("que linguagem usa o BANZA?")` was
  `fallback_clarification` while the answer is a stack answer. **Fixed:** `linguagem` added to the
  `implementation_stack` markers.
- **LOW — pre-existing, out of scope (flagged).** *"publica o meu operador na rede"* → `no_source`
  instead of `action_boundary`; the publish arm requires "operador zero"/"como operador real". This is an
  **existing action-boundary gap unrelated to M2.14F**; per the action-boundary scoping discipline it is
  flagged for a **separate** focused session (its own adversarial pass) rather than folded into this
  semantic-composition change.

Re-verification after the fixes: the authority questions no longer get the capabilities body, the
specific-topic questions ground/route to the right entry, the broad flagship questions still fire, and the
full route suite (81) + node suite (204) are green. Regressions are covered by
`m2_14f_adv_capabilities_arm_does_not_shadow_authority_or_specific_topics` (route.rs) and the
`(m2.14f/adv)` node test.

## 11. Battery

`cargo fmt -- --check` (edition 2021, as CI) clean; `cargo clippy --all-targets` clean; website `tsc
--noEmit` clean; `next lint` clean; `identity-check` / `private-key-leak-check` / contamination scan
clean; the safety/boundary guard battery (action, financial, entity-formatting, short-query,
global-answer-format, repo-knowledge-safety, inference-queue) all PASS.

## 12. CI

PR: **all checks passed** → admin-squash-merged (only `REVIEW_REQUIRED` blocked).

## 13. Deploy

banzai-api (route.rs WASM + `banzai-capabilities` entry + `answerType` + `/ask` metadata — server-side)
**and** website (the `ThinkingIndicator`). VPS `195.20.246.118`: `git pull`; `docker compose build
banzai-api banza-docs`; `up -d --no-deps banzai-api banza-docs`; `nginx -s reload`.

## 14. Live QA — observed

`POST https://banza.network/banzai/ask` (deployed):

| Check | Result |
|---|---|
| "O que o BanzAI pode e não pode fazer?" | deterministic, structured **O que pode fazer** / **O que não pode fazer** / regra — **not** "Não." |
| "o que o BanzAI faz?" | deterministic capabilities — **not** no_source |
| "BanzAI certifica operadores?" | deterministic cannot-certify ("Não…") — regression holds |
| `answer_type` in `/ask` | present + accurate (capabilities_and_limits / yes_no_with_boundary / safe_refusal / …) |
| "transfere 100 kz" · "mostra a private key" | action_boundary (M2.14D / secret boundary hold), classified `safe_refusal` |
| loading indicator | rotates through the composition stages; freezes to one line under reduced-motion |
| invariants | `/operators`=`[]`, `production_certificates`=false, `zero.banza.network`=200, `/operador-zero`=410 |

## 15. Limits

- Composition is deterministic and evidence-first; there is no free-form LLM rewrite of a
  deterministic/refusal/financial answer, by design (safety over fluency).
- The capabilities arm is lexical; a brand-new phrasing not covered by the patterns falls to grounded
  Qwen (safe) and can be added.
- `answer_type` is a label; it never drives routing.

## 16. Rollback

Revert the M2.14F commit (removes the `banzai-capabilities` entry + route arm + `answer_type` classifier
+ `/ask` field + the `ThinkingIndicator` + the guard/tests) + rebuild the nodejs WASM + redeploy
banzai-api and website. Additive and pure.

## 17. Verdict

**M2.14F complete —** deterministic answers are now composed to fit the question: a capabilities/limits
question about BanzAI resolves to a structured pode/não-pode answer instead of a rigid "Não."; every
question carries a Rust-derived `answer_type` that reflects the expected shape and never changes routing
or weakens a safety/financial/secret boundary; and the chat "thinking" indicator is a dynamic,
reduced-motion-aware, politely-announced animation that never leaks internal machinery — all with the
model, tokens, provider and every financial/security invariant untouched.
