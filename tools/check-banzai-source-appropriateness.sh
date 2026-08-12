#!/usr/bin/env bash
#
# banzai-source-appropriateness-check (M2.18B.7 / TFG-2) — a BEHAVIORAL guard: it drives the COMPILED
# banzai-query-core WASM retrieval planner and asserts SOURCE APPROPRIATENESS is ACTIVE — task suitability
# outranks lexical similarity, and the plan-level verdict is honest:
#
#   * every planned source carries a task_appropriateness class + score, and the sources are ordered by
#     appropriateness first (a thematic-but-inadequate source never ranks above a task-suitable one),
#   * a documentary/narrative question (explanation/impact/definition) finds an exact/suitable ADR/RFC
#     source (source_appropriate = true),
#   * the plan records the requested_task it ranked for and a source_appropriateness class,
#   * the verdict is DETERMINISTIC (same question ⇒ same verdict + checksum).
#
# This proves the "deep reranking" the earlier phase deferred is now a live, first-class retrieval signal —
# not a follow-up. Not a grep — it executes the planner. set -eu; exit 1 on any mismatch.

set -eu
cd "$(dirname "$0")/.."

KB="services/banzai-api/src/rustkb/banzai_api_kb.js"
[ -f "$KB" ] || { echo "banzai-source-appropriateness-check: NEEDS_FIX (missing WASM $KB — run wasm-pack)" >&2; exit 1; }

echo "BanzAI source appropriateness (M2.18B.7/TFG-2) — driving the compiled WASM retrieval planner"

node --input-type=module <<'NODE'
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/");
const kb = require("./services/banzai-api/src/rustkb/banzai_api_kb.js");

if (typeof kb.retrieval_plan_json !== "function") { console.error("  FAIL: WASM missing retrieval_plan_json"); process.exit(1); }

let bad = 0;
const fail = (m) => { console.error(`  FAIL: ${m}`); bad++; };
const plan = (q, s = "") => JSON.parse(kb.retrieval_plan_json(q, s));

// 1. every source carries an appropriateness class+score, and ordering is appropriateness-first.
for (const [q, s] of [["explica a ADR-002", "ADR-002"], ["qual o impacto da ADR-040 para um operador?", "ADR-040"], ["o que e a federacao?", ""]]) {
  const p = plan(q, s);
  if (!p.requested_task) fail(`plan for "${q}" missing requested_task`);
  if (!p.source_appropriateness) fail(`plan for "${q}" missing source_appropriateness class`);
  for (const src of p.sources) {
    if (!src.task_appropriateness) fail(`source ${src.source_id} for "${q}" has no task_appropriateness`);
    if (typeof src.appropriateness_score !== "number") fail(`source ${src.source_id} for "${q}" has no appropriateness_score`);
  }
  // appropriateness-first ordering: no source ranks above a strictly more-appropriate one
  for (let i = 1; i < p.sources.length; i++) {
    if (p.sources[i - 1].appropriateness_score < p.sources[i].appropriateness_score)
      fail(`"${q}": ${p.sources[i-1].source_id} ranked above more-appropriate ${p.sources[i].source_id}`);
  }
}

// 2. documentary/narrative questions find a task-suitable source (source_appropriate = true, exact/suitable).
for (const [q, s] of [["me explica o ADR 005", "ADR-005"], ["qual o impacto da ADR-040 para um operador?", "ADR-040"], ["o que e a federacao?", ""]]) {
  const p = plan(q, s);
  if (!p.source_appropriate) fail(`"${q}": documentary task must be source_appropriate (class=${p.source_appropriateness})`);
  if (!["exact", "suitable"].includes(p.source_appropriateness)) fail(`"${q}": expected exact/suitable, got ${p.source_appropriateness}`);
}

// 3. determinism — same question yields the same verdict + checksum.
{
  const a = plan("qual o impacto da ADR-040 para um operador?", "ADR-040");
  const b = plan("qual o impacto da ADR-040 para um operador?", "ADR-040");
  if (a.source_appropriate !== b.source_appropriate || a.source_appropriateness !== b.source_appropriateness || a.checksum !== b.checksum)
    fail("source appropriateness verdict is not deterministic");
}

if (bad) { console.error(`banzai-source-appropriateness-check: NEEDS_FIX (${bad} mismatch)`); process.exit(1); }
console.log("  ok: appropriateness class+score on every source, appropriateness-first ordering, documentary tasks suitable, deterministic");
console.log("banzai-source-appropriateness-check: OK");
NODE
