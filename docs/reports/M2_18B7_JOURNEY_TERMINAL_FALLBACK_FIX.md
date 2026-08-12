# M2.18B.7 (REOPEN) — Journey-active deterministic-terminal fallback fix

**Status:** RUNNING → COMPLETE (pending final public-edge evidence commit + merge/deploy).
**Trigger:** user reproduced, with a screenshot, the public BanzAI answer to
`me da um exemplo de federação` returning a **general BANZA definition** in
**degraded mode** — `Resposta em modo degradado: ocorreu um erro temporário` /
`Fallback seguro · erro temporário · sem chamada externa` — with inappropriate
sources (ADR-001 + network-infrastructure annex).

The prior COMPLETE was invalid: internal tests + CI + a question-only public-edge
harness all passed, but the **real browser path** (a guided-journey session) was
still broken. The user's rule holds: *o comportamento observado pelo utilizador é
a autoridade final*.

## Root cause (diagnosed on production, not assumed)

1. **Public reproduction, no context, was already correct** — a clean
   `POST /banzai/ask {"question":"me da um exemplo de federação"}` returned
   `example_safe` / `TASK_EXAMPLE_ILLUSTRATIVE`, deterministic (4 ms), sources
   ADR-038/ADR-040/operator-manifest-schema, `degraded:false`. So the *engine*
   was not universally broken.

2. **Correlated banzai-api logs** revealed the user's own requests (immediately
   before the diagnostic curls, same container/image):
   - `req 5be89644` — 29-char question → `entry_id: what-is-banza`,
     `engine_state: degraded`, `fallback_reason: synthesis_task_incomplete`,
     `elapsed 10408 ms` (went to synthesis, task-incomplete → degraded).
   - `req e17287ee` — "como federar um operador?" → `how-to-federate`,
     `degraded`, `synthesis_task_incomplete`, `10909 ms`.
   Same question, same code, **opposite outcome** vs. the 4 ms terminal — so the
   routing to the deterministic terminal was being *bypassed* intermittently.

3. **The differentiator was journey state.** `services/banzai-api/src/pipeline.js`
   gated the three deterministic terminals — **Tier 1b** (attribute exact-fact),
   **Tier 1c** (tasked: example / procedure / template) and **Tier 1d**
   (document-lookup) — behind `if (!onJourneyStep)`. Whenever ANY guided-journey
   step was active (`current_step` sent by the `/banzai` UI), those terminals
   were **skipped**, so a task/lookup question fell through to the slow synthesis
   trunk; the deterministic Task-Completion validator then withheld the model's
   non-conforming output → `synthesis_task_incomplete` → the public degraded
   banner + a task mismatch (an EXAMPLE served as a DEFINITION).

   Reproduced deterministically by sending `current_step=federacao`:
   `me da um exemplo de federação` → `degraded:true`, `synthesis_task_incomplete`,
   ~5 s; without journey state → the 4 ms terminal. Confirmed.

The journey is only meant to own a genuine **next-step** turn ("o que faço
agora?"), which is handled separately by **Tier 2** (`decisionEffective.action
=== "journey_next_step"`). Gating the deterministic terminals on the mere
presence of a step was too broad.

## Fix (pure JS pipeline change — no WASM/model change)

`pipeline.js`: introduced `journeyOwnsTurn = decisionEffective.action ===
"journey_next_step"` and changed the three terminal gates from `!onJourneyStep`
to `!journeyOwnsTurn`. Now a concrete task / bare document lookup / exact
attribute is answered by its **deterministic terminal even mid-journey** — never
demoted to synthesis, never degraded — while a genuine next-step turn still goes
to the journey (Tier 2). No validator, timeout, WAF or rate-limit was weakened;
the degraded banner was **not** hidden — the *cause* was removed.

## Verification

- **Regression test** `services/banzai-api/test/m2-18b7-journey-terminal-regression.test.js`
  (9 cases): a trunk stub that ALWAYS degrades proves each task type mid-journey
  hits its terminal (0 model calls, not degraded), the example stays an example
  (never a definition), a genuine next-step still routes to the journey, and
  off-journey is unchanged. Full banzai-api suite: **301 pass** (incl. the 3
  pre-existing journey next-step tests).
- **Public-edge harness** now sends JOURNEY-ACTIVE cases (`current_step` +
  `journey_context`, the user's real condition) + a task-mismatch gate
  (example must not come back a definition); the **readiness guard** requires the
  journey slice present (≥6) and `journey_degraded=0`.
- **Live on prod (banzai-api rebuilt from the fix branch), journey active:**
  - `me da um exemplo de federação` → `example_safe` / `TASK_EXAMPLE_ILLUSTRATIVE`,
    `degraded:false`, sources ADR-038/ADR-040/operator-manifest-schema.
  - `como federar um operador?` → `TASK_PROCEDURE_TRANSPARENT_PARTIAL`,
    `degraded:false`.
  - `ADR 002` → `document_lookup_card`, `degraded:false`.
- **Real public browser** (`/banzai`, fresh session, "jornada iniciada"):
  `me da um exemplo de federação` renders the illustrative federation example
  (actors / sequence / result) with 3 federation sources and
  "Resposta determinística · sem chamada ao modelo" — no degraded banner.

## Rollback

Redeploy the previous banzai-api image / `git revert` the pipeline gate change.
