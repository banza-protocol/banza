# BZCI-1 Audit Report — BanzAI Conversational Intelligence

**Program:** BanzAI Conversational Intelligence (BZCI)
**Increment:** BZCI-1 (diagnostic audit)
**Author:** Lead architect
**Date:** 2026-08-07
**Scope:** Multi-turn conversational reference/anaphora resolution across the `/banzai/ask` pipeline (frontend → services/banzai-api → engines/banzai-query-core).
**Evidence base:** Live production reproduction (6 chains) + 8 read-only auditor slice maps. No new repo reads.

---

## 1. Executive summary

**Root cause (one sentence):** The frontend never places a `conversation_context` object on the `/ask` request body (`buildAskBody`, `website/components/home/banzaiKb.ts:819`) and never reads it back off the response (`banzaiKb.ts:630`), so the backend's structured Increment-6 reference-resolution engine always receives an empty `priorContext = {}` (`services/banzai-api/src/pipeline.js:634`) and every follow-up is processed as a brand-new, self-contained question — exactly matching the live telemetry (`conversation_context_used=false`, `context_turns_used=0` on **every** follow-up across all 6 chains).

Beyond that single wiring break, three **structural** gaps mean that even a perfect wire fix would not make the observed chains pass:

- **G1 — No documentary/concept dimension in the conversational model.** `PriorContext` (`engines/banzai-query-core/src/context.rs:241`) and the 10-field JS contract (`pipeline.js:99` / `server.js:43`) carry only ecosystem-operational slots (operator/implementation/execution/artifact); there is **no** `last_concept`/`last_document`/`last_subject` slot and **no** concept anaphor class in the `Anaphor` enum (`context.rs:178`). The entire ADR→RFC→"qual a diferença?"→"qual tem mais autoridade?" chain (CHAIN1, CHAIN6) has nothing to inherit.
- **G2 — No general ellipsis / turn classification.** Both context paths recognise only fixed multi-word phrases: the Rust resolver via 8 fixed marker sets (`context.rs:32-165`) and the text-only router via a hardcoded cue whitelist (`route.rs:7413-7461`). The bare elliptical connective "e a anterior?" / "e uma RFC?" / "e as chaves?" matches nothing → silent `NO_ANAPHORA` pass-through. There is no classifier that types a turn as follow-up / new-topic / correction / clarification-answer / topic-switch (the declared `follow_up` intent is dead, `intent.rs:55`).
- **G3 — Fallback fires before conversational resolution is retried.** `answer()` consults context exactly once, up-front, against the empty context (`pipeline.js:635`); the rest is a standalone-question tier ladder that terminates at `contextualInsufficient` (`pipeline.js:394`, `:1395`) with **no second attempt** to bind the follow-up against the prior turn. `disposition.rs` (`:282`) has no conversational field, so a recoverable follow-up is indistinguishable from a genuine dead-end.

The safety posture is **sound and must be preserved**: boundary detection is a context-free pure function (`boundary.rs:1352`), evaluated first on the raw question (`context.rs:436`), mirrored belt-and-suspenders in JS (`pipeline.js:641,645,656-659`), and refusals return before the cache read (`pipeline.js:765` vs `:1446`). Continuity can only ever *add* a boundary check, never remove the raw one.

---

## 2. Where context is lost (ordered)

The loss is a broken round-trip plus three engine-level absences. In request order:

1. **Client never SENDS prior context.** `buildAskBody` emits only `{question, context:[{role,text}], document_id?, journey?}` — there is no `conversation_context` branch (`website/components/home/banzaiKb.ts:819-848`). Both transports funnel through it (non-SSE `banzaiKb()` at `banzaiKb.ts:853`; SSE `streamBanzaiAsk` at `website/lib/banzaiProgressClient.ts:93`), so both send byte-identical, state-free bodies.
2. **Client never STORES prior context.** `mapAskResponse` reads only the boolean `o.conversation_context_used` (`banzaiKb.ts:630`) and never the `o.conversation_context` object the backend already returns (`pipeline.js:705`, `server.js:598`). `KbAnswer` (`banzaiKb.ts:162-227`) and the home `Msg` type (`HomeAsk.tsx:19`) have no field to hold it. Either break alone kills the engine; both are present.
3. **History is flattened to raw text at every hop.** `ChatTurn = {role,text}` (`banzaiKb.ts:232`); `BanzaiAgent.tsx:595` rebuilds `msgs.slice(-4)` to `{role,text}`, discarding the already-parsed `Msg.transparency.entity/scope`, `resolvedDocument`, `duration`, `terminalKind` (`BanzaiAgent.tsx:44-68,578`). The structured referent for the previous answer exists in memory and is thrown away one field before the wire.
4. **Backend receives `{}`.** `sanitizeConversationContext(parsed.conversation_context)` returns `{}` because the field is always `undefined` (`server.js:371`), so `priorContext = {}` (`pipeline.js:634`) and `serde_json::from_str(...).unwrap_or_default()` yields an all-empty `PriorContext` (`engines/banzai-api-kb/src/lib.rs:240`).
5. **Structured engine runs once, against nothing.** `resolveReferences(correctedQuestion, {})` (`pipeline.js:635`) is the **only** context consult in the whole function. With `has_any()=false` (`context.rs:266`), any detected anaphor takes the `!has_prior` branch → `NO_REFERENT` (`context.rs:478`); undetected forms → `NO_ANAPHORA` (`context.rs:453`). This is precisely why CHAIN5 "e as chaves?" (a Keys anaphor that IS detected at `context.rs:381`) still collapses to `NO_REFERENT`.
6. **Follow-up is never rewritten.** `contextActive`/`contextResolved` are false (`pipeline.js:645-646`), so `effectiveQuestion` (`:650`) and `rq` (`:678`) stay the raw elliptical text. Every downstream tier and the terminal see a context-stripped standalone query.
7. **The text-only route path cannot do concept ellipsis.** `route_with_context`'s `is_followup` (`route.rs:7413-7461`) is a Portuguese cue whitelist plus a ≤3-token gate that additionally requires one of `[exemplo,json,yaml,aqui,mais,detalha,continua]`. "e uma RFC?", "qual a diferença?", "e a anterior?", "e as chaves?" all fail it → `context_used=false`. Even when it fires, "resolution" is a naive `format!("{} {}", prev, question)` string prepend (`route.rs:7487`) with no slot binding, and `turns_used` is hard-capped at 1 (`:7489`). This weaker M2.8H channel — not the structured engine — is what actually drives the `conversation_context_used` telemetry (`pipeline.js:700-701`), masking that Inc.6 never ran. It is also the sole reason CHAIN4 "e Trust?" grounds: the standalone token `trust` survives in raw text and hits `def-trust` (`glossary.rs:391`), coincidentally, not via any binding.
8. **No concept dimension to bind even if wired.** The `Anaphor` enum has no concept/document/topic class (`context.rs:178`); `PriorContext` has no `concept_id`/`document_id`/`last_subject`/`last_metric` slot (`context.rs:240`); `last_intent`/`last_family` are present but **never read** (`context.rs:260-263`). So the whole ADR/RFC chain has nothing to inherit — a modeling absence, not a wiring bug.
9. **Fallback precedes any recovery.** The terminal is a pure function of the current string (`terminal.rs:178`; exact facts only via `docref::detect_refs` at `:101/:143`, else `insufficient("exact_fact_unsourced")` at `:204`). `groundedForTrunk` is false for a stripped follow-up, and `contextualInsufficient` (`pipeline.js:394,1373,1395`; operational `insufficient_measurements` at `:1077` for "e a anterior?") fires with no second context attempt. `disposition.rs` classifies from `contextual_fallback_kind` only (`:312,326`), so recoverable and genuinely-unanswerable collapse to the same `INSUFFICIENT`/`HONEST_FALLBACK`.
10. **Cache/freshness are referent-blind.** `keyFields` (`pipeline.js:686`) binds `nq`, provider, corpus/repo/policy hashes, and later `document_id`/`entity_id` (`:1414/:1419`) — but never `execution_id`, `previous_execution_id`, `comparison_targets`, or any conversation id. The resolver keeps the id out of `resolved_query` (fixed generic sentence, `context.rs:497-539`), so two different "e a anterior?" produce identical keys. (Latent, not yet triggered — the continuity path is dead on the wire.)

---

## 3. Current architecture — how a turn flows today

```
Browser (HomeAsk.tsx / BanzaiAgent.tsx)
  → msgs flattened to {role,text}         (BanzaiAgent.tsx:595 / HomeAsk.tsx:65)
  → buildAskBody(question, history)        (banzaiKb.ts:819)   ── emits {question, context, document_id?, journey?}
                                                                    NEVER conversation_context
  → POST /banzai/ask  (non-SSE banzaiKb.ts:853  |  SSE banzaiProgressClient.ts:93)
        │
        ▼
services/banzai-api/src/server.js
  → parse body; contextQuestions = last 2 raw user texts   (server.js:354-363)
  → sanitizeConversationContext(parsed.conversation_context) → {}   (server.js:371)  ── always empty
  → pipeline.answer(...)                                    (server.js:397)
        │
        ▼
services/banzai-api/src/pipeline.js :: answer()
  → priorContext = conversationContext || {}   → {}          (pipeline.js:634)
  → references = resolveReferences(correctedQuestion, {})    (pipeline.js:635 → knowledge.js:1808 → WASM)
        → Rust context.rs::resolve_references (context.rs:428):
             1. BOUNDARY first via route+boundary::evaluate  (context.rs:436)
             2. detect_anaphor over 8 fixed marker sets       (context.rs:359)
             3. can_bind per class                            (context.rs:461)
             4. !has_prior || !can_bind → NO_REFERENT         (context.rs:478)
             5. else BIND → resolved_query NL template        (context.rs:497)
        → with {} : NO_ANAPHORA / NO_REFERENT
  → decision = route_with_context(question, contextQuestions) (pipeline.js:636 → route.rs:7476)
        → is_followup cue whitelist; drives context_used/turns_used telemetry
  → contextActive/contextResolved = false                   (pipeline.js:645-646)
  → effectiveQuestion = raw corrected question; rq = raw      (pipeline.js:650,678)
  → STANDALONE TIER LADDER on rq:
        Tier0 safetyRefusal (765) → 0a1 ctx-clarif [dead] (773) → 0b entity/artifact live (796)
        → operational metric (954) → Tier1 def/boundary (1098) → attribute (1122) → tasked (1161)
        → document (1202) → journey (1236) → resolveDocument (1246) → Tier3b compare/diagnose (1288)
        → Tier4 buildTerminal(rq) (1368 → terminal.rs:178) → trunk-guard groundedForTrunk (1382)
        → trunk (1398+) | else contextualInsufficient (394,1395)
  → buildForwardContext(...) → conversation_context in meta   (pipeline.js:697,705)   ── returned, never echoed by client
        │
        ▼
/ask envelope → mapAskResponse (banzaiKb.ts:510) reads conversation_context_used bool only (:630)
              → conversation_context OBJECT dropped; round-trip never closes.
```

The two context channels are asymmetric and both fail the observed chains: the **structured** Inc.6 engine (`resolveReferences`) is starved of input; the **text-only** M2.8H channel (`route_with_context`) is a keyword gate that cannot do concept ellipsis and does raw string concat, not slot binding.

---

## 4. Capability gap vs the 41-section program

| § | Requirement | Status | Where it must live |
|---|---|---|---|
| §2 | Typed conversational state (turn history, per-slot provenance, concept + operational slots) | **Partial (wire-dead)** | `context.rs:241` `PriorContext` (add concept/subject/metric slots + `observed_at`); JS contract `pipeline.js:99` + `server.js:43`; client `ConversationState` in `banzaiKb.ts:232` |
| §3 | Turn classification (new-topic / follow-up / correction / clarification-answer / topic-switch) | **Absent** (declared `follow_up` intent dead) | `engines/banzai-query-core` new classifier; wire dead `intent.rs:55`, `context.rs:262` into `can_bind`/BIND |
| §4 | Ellipsis / and-continuation ("e uma RFC?", "e a anterior?") | **Absent** (fixed phrases only) | `context.rs:53,149,359` (add elliptical patterns); replace `route.rs:7413` cue gate |
| §5 | Slot inheritance (INHERIT prior intent/metric, REPLACE changed slot) | **Absent** | `context.rs:497` BIND; `taxonomy.rs:546,595` (stop seeding `""`); `resolve.rs:200` |
| §6 | Referential resolution against structured prior state | **Present-but-starved** (execution/entity only) | `context.rs:428`; feed typed state to `route.rs:7476`; close client round-trip |
| §7 | Honest clarification for unrecognized follow-ups | **Partial** (only 8 recognized classes → `NO_REFERENT`; `NO_ANAPHORA` silently falls through) | `context.rs:453` (emit clarification for short context-dependent turns); tier `pipeline.js:773` |
| §8 | Corrections ("não, a RFC", "quis dizer…") | **Absent** | `context.rs` new correction class; UI `BanzaiAgent.tsx:1071` |
| §9 | Topic switch ("e as chaves?" after a different subject) | **Absent** | `context.rs` turn classifier + subject stack |
| §10 | Hierarchical / multi-turn context (reach earlier antecedents) | **Absent** (`turns_used` hard-capped at 1, `route.rs:7489`; single flat snapshot) | `context.rs:241` turn history; `route.rs:7476` |
| §11 | "porquê" continuity (diagnose inheriting prior referent) | **Partial** (diagnose class exists, no referent when context empty) | `context.rs` diagnose path + recovery stage |
| §12 | Comparison continuity ("qual a diferença?") | **Absent for concepts** (`ComparePrevious` execution-only, `context.rs:503`) | `context.rs:503` (add `compare_concepts`); `relation.rs` fed conversational operands |
| §13 | Metric continuity ("e a anterior?" after duration) | **Absent** (ellipsis + inherit both missing; `pipeline.js:1077`) | `context.rs` metric slot + inherit; `resolveOperationalMetric` |
| §14 | Artifact continuity ("e as chaves?" after Manifest) | **Present-but-starved** (Keys detected, no entity to bind) | wire fix + `context.rs:277` `entity_id()` |
| §15 | Governance/authority continuity ("qual tem mais autoridade?") | **Absent** | `context.rs` authority/relation referent; `relation.rs` |
| §16 | Suggestion follow-ups (chips carry their referent) | **Absent** (chips flattened to prose strings) | `suggestions.ts:166,182,216,232`; typed click channel `BanzaiAgent.tsx:667` |
| §17 | Short-answer / bare-term follow-ups | **Partial/accidental** (glossary bare-term ≤2 tokens; 3-token ellipsis fails, `glossary.rs:494`) | ellipsis normalizer upstream of `glossary.rs:494` |
| §18 | Command/format continuation ("e em JSON?", "continua") | **Present** (via `is_followup` cue whitelist) | `route.rs:7414-7448` (keep, generalize) |
| §19 | History-not-authority (prior AI output never a source) | **Present** (only prior USER questions enrich; `route.rs:7472`) | preserve — do not turn history into a source |
| §20 | Freshness / live-state re-consultation ("e agora?", latest) | **Partial** (self-contained ops re-query; no freshness anaphor, no `observed_at`) | `context.rs:178,241`; `toolRuntime.js:113,279`; `pipeline.js:1292` |
| §21 | Cache correctness (referent-scoped keys) | **Absent** (no execution/comparison/conversation id in key) | `pipeline.js:686`; inline id in `resolved_query` `context.rs:497` |
| §22 | Safety (boundary-first, context cannot bypass) | **Present** (verified) | preserve: `boundary.rs:1352`, `context.rs:436`, `pipeline.js:641,656,765` |
| §23 | Privacy (safe technical-only carry-forward) | **Present** (`safeCtxId`/`safeCtxToken` whitelists, `pipeline.js:99`, `server.js:58`) | preserve when adding slots |
| §25 | `resolved_request` object (typed, replayable) | **Absent** (NL `resolved_query` re-parsed downstream, `context.rs:497` → `pipeline.js:697`) | emit typed `{intent,subject,slots,operands,artifact}` from `context.rs`; consume in `pipeline.js` |
| §38 | Rust-first (semantics in engine; JS glue) | **At risk** — resolution today leans on JS-side wiring & a JS-visible dead path | keep all resolution in `engines/banzai-query-core`; JS = transport only |
| §39 | Fallback-last | **Present but premature** (fallback is last *per tier*, but resolution is one-shot before the ladder) | insert recovery stage before `contextualInsufficient` (`pipeline.js:1385,1373`) |

---

## 5. Build plan (Rust-first, ordered)

**Governing principle:** semantic resolution lives in `engines/banzai-query-core`; `services/banzai-api` is transport/glue (RUST_WRAPPER_ONLY); the frontend threads a **typed conversation state**, never re-implemented NL. JS must not re-derive turn classification, ellipsis, or slot inheritance client-side — it consumes the engine's `resolved_request`.

### BZCI-2 — Typed state + turn classification + `resolved_request` (Rust query-core)
The foundation; nothing downstream works without it.
- `engines/banzai-query-core/src/context.rs:241` — extend `PriorContext` with documentary/subject/metric slots: `last_subject`, `last_concept_source`, `last_document_id`+`type`, `last_entities`, `last_metric`, `observed_at`; **start reading** the dead `last_intent`/`last_family` (`:260-263`).
- New turn classifier in query-core returning a typed turn kind (new-topic / follow-up / correction / clarification-answer / topic-switch); wire the declared-but-dead `follow_up` intent (`intent.rs:55`).
- `context.rs:497` — replace the NL `resolved_query` template with a typed `resolved_request {intent, subject, slots, operands, artifact}`; keep an NL rendering for display only.
- `services/banzai-api/src/pipeline.js:99` (`buildForwardContext`) + `server.js:43-66` — add the new slots to BOTH sides of the closed 10-field contract (keep `safeCtxId`/`safeCtxToken` whitelisting — §23).
- Persist write-back: after each turn, write `QueryResolution.subject/entities/concept_source` + `primary_intent` (`taxonomy.rs:646`, dying today at `factpack.rs:1233`) into the forward context.

### BZCI-3 — Ellipsis + slot inheritance + referential + corrections + topic-switch
- `context.rs:178` — add **Concept/Definition** and **Correction** anaphor classes; `context.rs:359` `detect_anaphor` — recognize "e/and + bare token/ordinal/modifier" ("e uma RFC?", "e a anterior?", "e as chaves?"), rewriting to a self-contained form ("o que é uma RFC?") so existing catalogues ground it (`glossary.rs:134` for bare ADR/RFC/Trust/keys → `def-*`; `concept.rs:341` for deeper concepts).
- `context.rs:461/533` — fix "previous-execution" semantics: "a execução anterior" must bind `previous_execution_id`, not `prior.execution_id`.
- `taxonomy.rs:546,595` — give `resolve_query` an optional prior-resolution seed; stop hard-coding `""` into `resolve_intent` (`resolve.rs:200`), enabling INHERIT-intent / REPLACE-subject.
- `route.rs:7413-7461` — replace the `is_followup` bool cue gate with an elliptical-followup **classifier** returning a turn type; `route.rs:7476` — accept typed prior state (not just raw `prev_questions`); raise the hard-capped `turns_used` (`:7489`).
- Normalize elliptical concept follow-ups **before** the `glossary_entry` gate (`glossary.rs:494`) so 3-token forms aren't rejected for lacking a definition lead.

### BZCI-4 — Family continuity (comparison / metric / artifact / governance)
- `context.rs:503` — add `compare_concepts` (operands `[prior_subject, current_subject]`) for "qual a diferença?"; add an authority/relation referent for "qual tem mais autoridade?" feeding `relation.rs` the two prior concept subjects.
- Metric continuity: after "quanto demorou a última jornada?", inherit `get_duration` and re-point at `previous_execution_id` for "e a anterior?"; thread `contextTargets` (`pipeline.js:1292`) which today only fire when `contextResolved`.
- Artifact continuity ("e as chaves?") relies on BZCI-2 slots + `entity_id()` (`context.rs:277`).

### BZCI-5 — Safety / freshness / cache / privacy
- **Safety (§22):** no change to the boundary path — preserve raw-route governance (`pipeline.js:656-659,765`), context-free `boundary.rs:1352`, refusal-before-cache (`:1446`). Verify continuity only ever *adds* a boundary check.
- **Freshness (§20):** add a "current-state/latest" anaphor (`context.rs:178`) forcing live re-consultation; add `observed_at` + staleness check (`context.rs:241`); re-validate carried execution ids against live state before answering (`toolRuntime.js:113,279`).
- **Cache (§21):** add `execution_id`/`previous_execution_id`/`comparison_targets` (and a conversation/session id or sanitized-context hash) to `keyFields` (`pipeline.js:686`), mirroring `entity_id`/`document_id` (`:1414/:1419`); defense-in-depth — inline the bound id into `resolved_query` text (`context.rs:497`) so `nq` distinguishes conversations.
- **Recovery stage (§39):** insert a conversational-resolution retry immediately before the last-resort fallbacks (`pipeline.js:1385,1373`; also `1113,1077,1349`) — when `groundedForTrunk`/terminal is false, re-run resolution against the prior typed terminal and re-enter the ladder if it binds. Extend `disposition.rs:282` with a `context_recoverable` field + a distinct branch in `response_disposition` (`:326`).

### BZCI-6 — UI / transport / observability / perf (JS + frontend, glue only)
This is the **minimal wiring fix** that revives the engine; do it early enough to test BZCI-2/3 end-to-end.
- **Write half:** `banzaiKb.ts:819` `buildAskBody` — emit `body.conversation_context` from stored state (covers BOTH transports since `banzaiProgressClient.ts:93` reuses it). Add a typed `ConversationState` near `ChatTurn` (`banzaiKb.ts:232`); add `conversation_context?` to `AskJourney` (`:796`).
- **Read half:** `mapAskResponse` (`banzaiKb.ts:630`) — read `o.conversation_context`/`o.resolved_request` next to the existing `conversation_context_used`; store on `KbAnswer` (`:162`).
- **State holders:** `BanzaiAgent.tsx:446` — add `convState` beside `msgs`; capture in `applyAnswer` (`:578`); merge into journey (`:599`) for `askViaStream` (`:607`) + `banzaiKb` fallbacks (`:612,623`); reset in `clearConversation` (`:660`). Prefer deriving from already-parsed `Msg.transparency` (`:44-68`) rather than re-parsing. `HomeAsk.tsx:19,56,69` — widen `Msg`, add `convState`, pass it to `banzaiKb`.
- **Typed chips (§16):** `suggestions.ts:232` — return `{label, suggested_action, suggested_entity_id/type, suggested_artifact, scope}` not bare strings; `askInChat`/`ask` (`BanzaiAgent.tsx:667,592`) accept the typed payload and fold it into `conversation_context`.
- **Observability:** drive `conversation_context_used`/`context_turns_used` (`pipeline.js:700-701`) from the **structured** `references` result (`has_prior_context`/`resolution_state`), not the M2.8H `decision.context_used`, so the envelope stops masking whether Inc.6 ran; surface `reference_resolution_state`/`referent_kind`/`resolved_intent`/`resolved_request` (`server.js:599-602`).

### BZCI-7 — Eval suite
- Encode all 6 reproduction chains as regression fixtures (CHAIN1–6), asserting per-turn `conversation_context_used=true`, correct `resolution_state`, and grounded terminals.
- `suggestions.test.ts` — assert `suggested_action_unresolvable = 0` / `entity` / `artifact = 0` (§16 invariants), currently untested.
- Rust unit tests in `context.rs` for each new anaphor class, INHERIT/REPLACE, previous-execution semantics, and boundary-preservation (extend the existing `context.rs:765-783` boundary tests).
- Cache-collision test: two different-conversation "e a anterior?" must not share a validated-cache key (§21).

### BZCI-8 — Guards / docs / ship
- Reindex on any new ADR and bump the `engines/banza-repo-guards` range (per memory gotcha); regenerate WASM (`wasm-pack --features wasm`) fresh before commit; run `cargo fmt --check` + clippy `-D`; watch the identity-check ("Banzami"/operator brands) and Rust-rule guard (English "fail-closed" → PT "fecho por omissão").
- ADR documenting the typed conversational-state contract + `resolved_request`; pace prod QA ≥3.2s (edge `/ask` 20 r/m).
- Ship criterion: all 6 chains green in prod, CI 0 failing · 0 pending (no admin-merge under outage).

---

## 6. Key risks

- **Safety regression (highest).** The one non-negotiable invariant: continuity must never let a follow-up merge context to bypass a refusal. Today this holds by construction (`boundary.rs:1352` context-free; boundary-first at `context.rs:436`; triple JS route `pipeline.js:656-659`; refusal before cache `:1446`). Mitigation: every new anaphor path must route BOTH the raw and the resolved query through boundary evaluation (as BIND already does at `context.rs:765-783`); add a test that a resolved follow-up whose rewrite would be refuse-worthy is refused; never key the cache in a way that could serve a refuse-worthy turn.
- **Cache poisoning / cross-conversation collision (§21).** Because `keyFields` (`pipeline.js:686`) carries no referent id and `resolved_query` is a fixed generic sentence (`context.rs:497`), once the continuity path goes live two different "e a anterior?" turns collide and one conversation's answer can be served to another. This is latent today only because the path is dead — fixing the wire (BZCI-6) **activates** the risk, so the cache-key fix (BZCI-5) must land in the same increment, not after.
- **Latency.** Re-running resolution as a recovery stage before fallback (BZCI-5) adds a second engine call on the failing path; the freshness anaphor forces live re-consultation (short 2000ms TTL, `toolRuntime.js:113`). Mitigation: recovery only on the otherwise-fallback path (already the slow path); keep freshness re-derivation scoped to explicit "latest/current" anaphors, not every follow-up.
- **"History as factual authority" trap (§19).** The correct current posture — only prior USER questions enrich retrieval, prior AI answers are never a source (`route.rs:7472-7475`) — must survive the redesign. As typed state grows richer (concept sources, resolved documents, metrics), there is temptation to treat a carried `resolved_request` or a prior answer's cited source as ground truth for the next turn. It must remain a **referent to re-resolve against live catalogues/state**, never a substitute for grounding: every follow-up must still re-derive its facts from `concept.rs`/`glossary.rs`/live tools, with the carried state only selecting *what* to resolve, not *asserting the answer*.
- **Rust-first drift (§38).** The existing failure mode is that the JS-visible `route_with_context`/`resolveReferences` split and the dead client round-trip let semantics leak toward JS. Keep all classification/ellipsis/inheritance in `engines/banzai-query-core`; JS gains only transport of the typed `conversation_context`/`resolved_request`.

---

*End of BZCI-1 audit report.*