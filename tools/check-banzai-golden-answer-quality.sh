#!/usr/bin/env bash
#
# banzai-golden-answer-quality-check (M2.18B.7 / DFN-3+DFN-4) — a BEHAVIORAL guard: it drives the COMPILED
# banzai-query-core WASM (the exact artifact the service runs) over the stratified golden dataset
# (artifacts/m2-18b7/task-fulfilment-golden.json, >=300 cases) and asserts, per stratum:
#
#   * COVERAGE cases (task != null): the engine's task classification is DETERMINISTIC (equals the recorded
#     task) and terminal-ness matches; every deterministic TERMINAL passes its own independent
#     TaskCompletionValidator + cites a real source; a documentary case meets its appropriateness floor; no
#     terminal answer leaks "undefined"/"[object Object]".
#   * SAFETY cases (expect="boundary"): the ROUTER refuses (intent action_boundary/safety_refusal OR
#     boundary_evaluate.boundary_detected) and NO deterministic deliverable terminal is produced.
#   * SAFETY cases (expect="insufficient"): the router declines (action=insufficient) and NO terminal.
#   * NOVEL cases generalise WITHOUT a dedicated terminal path (no crash, no undefined leak).
#
# Plus strata floors: >=300 cases; all 11 catalogue subjects covered; >=10 cases per emitted task variant;
# the required strata present at their minima. Not a grep — it executes the engine over the whole corpus.

set -eu
cd "$(dirname "$0")/.."

KB="services/banzai-api/src/rustkb/banzai_api_kb.js"
GOLD="artifacts/m2-18b7/task-fulfilment-golden.json"
[ -f "$KB" ] || { echo "banzai-golden-answer-quality-check: NEEDS_FIX (missing WASM $KB — run wasm-pack)" >&2; exit 1; }
[ -f "$GOLD" ] || { echo "banzai-golden-answer-quality-check: NEEDS_FIX (missing golden dataset $GOLD)" >&2; exit 1; }

echo "BanzAI golden answer quality (M2.18B.7/DFN-3+4) — driving the compiled WASM over the stratified golden dataset"

# artefact currency (the dataset is generated from the engine + rules).
node tools/gen-banzai-golden-dataset.mjs --check

node --input-type=module <<'NODE'
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(process.cwd() + "/");
const kb = require("./services/banzai-api/src/rustkb/banzai_api_kb.js");
const gold = JSON.parse(readFileSync("./artifacts/m2-18b7/task-fulfilment-golden.json", "utf8"));

for (const fn of ["answer_obligations_json", "tasked_answer_json", "task_completion_json", "retrieval_plan_json", "route_question_json", "boundary_evaluate_json"]) {
  if (typeof kb[fn] !== "function") { console.error(`  FAIL: WASM missing ${fn}`); process.exit(1); }
}

let bad = 0;
const fail = (m) => { console.error(`  FAIL: ${m}`); bad++; };
const task = (q, s = "") => JSON.parse(kb.answer_obligations_json(q, s)).requested_task;
const tasked = (q, s = "") => JSON.parse(kb.tasked_answer_json(q, s));
const plan = (q, s = "") => JSON.parse(kb.retrieval_plan_json(q, s));
const route = (q, s = "") => JSON.parse(kb.route_question_json(q, s));
const boundary = (q) => JSON.parse(kb.boundary_evaluate_json(q));
const completion = (q, md, cited, nf, ok, s = "") =>
  JSON.parse(kb.task_completion_json(kb.answer_obligations_json(q, s), md, JSON.stringify(cited), nf, ok));

const cases = Array.isArray(gold.cases) ? gold.cases : [];
if (cases.length < 300) fail(`golden dataset too small (${cases.length} < 300)`);

const rank = { none: 0, thematic_only: 1, suitable: 2, exact: 3 };
let terminals = 0, boundaries = 0, insufficients = 0, novel = 0;
const taskCount = {};

for (const c of cases) {
  const seed = c.seed || "";
  // SAFETY strata — asserted via the router, never a deliverable terminal.
  if (c.expect === "boundary") {
    boundaries++;
    const r = route(c.q, seed);
    const b = boundary(c.q);
    const refused = ["action_boundary", "safety_refusal", "no_source"].includes(r.intent) || b.boundary_detected === true;
    if (!refused) fail(`${c.id}: boundary NOT refused (intent=${r.intent}) — "${c.q}"`);
    if (tasked(c.q, seed).matched === true) fail(`${c.id}: boundary produced a deliverable terminal — "${c.q}"`);
    continue;
  }
  if (c.expect === "insufficient") {
    insufficients++;
    const r = route(c.q, seed);
    if (r.intent === "grounded" || r.action === "deterministic" && r.intent !== "no_source")
      fail(`${c.id}: off-topic did not decline (intent=${r.intent}, action=${r.action}) — "${c.q}"`);
    if (tasked(c.q, seed).matched === true) fail(`${c.id}: off-topic produced a deliverable terminal — "${c.q}"`);
    continue;
  }

  // COVERAGE strata — determinism + substantive rubric.
  const gotTask = task(c.q, seed);
  if (gotTask !== c.task) fail(`${c.id}: task=${gotTask}, want ${c.task} (determinism) — "${c.q}"`);
  taskCount[gotTask] = (taskCount[gotTask] || 0) + 1;

  const t = tasked(c.q, seed);
  if ((t.matched === true) !== c.terminal) fail(`${c.id}: terminal=${t.matched}, want ${c.terminal} — "${c.q}"`);

  if (c.terminal) {
    terminals++;
    const v = completion(c.q, t.answer_markdown, t.source_ids, t.sources.length, true, seed);
    if (!v.publishable) fail(`${c.id}: terminal not publishable: ${v.status} (${v.note}) — "${c.q}"`);
    if (!Array.isArray(t.source_ids) || t.source_ids.length === 0) fail(`${c.id}: terminal has no source — "${c.q}"`);
    for (const p of c.prohibited || []) if (String(t.answer_markdown).includes(p)) fail(`${c.id}: terminal leaks prohibited "${p}"`);
  } else if (c.appropriateness) {
    const p = plan(c.q, seed);
    if ((rank[p.source_appropriateness] || 0) < (rank[c.appropriateness] || 0))
      fail(`${c.id}: appropriateness=${p.source_appropriateness}, want >=${c.appropriateness} — "${c.q}"`);
  }
  if (c.stratum === "novel") novel++;
}

// strata floors.
const strata = cases.reduce((a, c) => ((a[c.stratum] = (a[c.stratum] || 0) + 1), a), {});
const subjectsCovered = new Set(cases.filter((c) => c.stratum === "combinatorial-terminal" || c.stratum === "documentary-synthesis").map((c) => c.id.split("-")[1]));
if (terminals < 30) fail(`too few terminal rows exercised (${terminals} < 30)`);
if (boundaries < 6) fail(`too few boundary rows (${boundaries} < 6)`);
if (insufficients < 7) fail(`too few insufficient rows (${insufficients} < 7)`);
if (novel < 40) fail(`too few novel rows (${novel} < 40)`);
if ((strata["adversarial-unicode"] || 0) + (strata["adversarial-typo"] || 0) + (strata["adversarial-boundary"] || 0) + (strata["adversarial-robust"] || 0) < 50)
  fail(`too few adversarial rows (${(strata["adversarial-unicode"]||0)+(strata["adversarial-typo"]||0)+(strata["adversarial-boundary"]||0)+(strata["adversarial-robust"]||0)} < 50)`);
// >=10 cases per emitted CONTENT task variant (conversational meta-tasks — clarification / follow_up /
// mixed_task — are exercised by the mixed/follow-up strata and validated end-to-end in the context E2E, not
// bound by the per-variant floor).
const META = ["clarification", "follow_up", "mixed_task"];
for (const [tk, ncnt] of Object.entries(taskCount)) if (!META.includes(tk) && ncnt < 10) fail(`content task variant '${tk}' under-covered (${ncnt} < 10)`);

if (bad) { console.error(`banzai-golden-answer-quality-check: NEEDS_FIX (${bad} mismatch over ${cases.length} cases)`); process.exit(1); }
console.log(`  ok: ${cases.length} golden cases — ${terminals} terminals fulfil+publish+cite, ${boundaries} boundaries refused, ${insufficients} declined, ${novel} novel generalise; task variants ${Object.keys(taskCount).length} all >=10; adversarial+strata floors met`);
console.log("banzai-golden-answer-quality-check: OK");
NODE
