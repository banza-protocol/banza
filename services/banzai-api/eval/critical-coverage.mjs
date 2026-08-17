// The critical-coverage matrix: does BanzAI settle the registered critical BANZA surface WITHOUT a model?
//
// Runs every case in assurance/banzai-critical-benchmark.json through the real pipeline with an
// unreachable model, so "deterministic" means measured, not asserted. Two roles:
//
//   --matrix   the closure instrument: prints the per-case matrix and the failure STAGE, for diagnosis.
//   --check    the acceptance gate: exits non-zero unless every deterministic_critical case settles and
//              every negative_control still fails closed.
//
// The stage is the point of it. "insufficient" tells you a question was not answered; it does not tell you
// whether the subject failed to resolve, the entry was not reachable, or the answer policy sent a settled
// fact to the model. Fixing the class needs the stage.

import { readFileSync } from "node:fs";
import { harness } from "../test/_pipeline-harness.mjs";
import { route } from "../src/knowledge.js";

const BENCH = new URL("../../../assurance/banzai-critical-benchmark.json", import.meta.url);
const bench = JSON.parse(readFileSync(BENCH, "utf8"));
const SETTLED = new Set(bench.terminals_settled);

// §30/§31 — a comparison against nothing must never read as agreement. The previous session printed
// "0 drift" from a baseline file that had been deleted; the lesson is cheap to encode and expensive to
// relearn, so the corpus asserts its own size before anything is measured against it.
const MIN_CASES = 60;
if (!Array.isArray(bench.cases) || bench.cases.length < MIN_CASES) {
  console.error(
    `FAIL: the benchmark carries ${bench.cases?.length ?? 0} cases, expected at least ${MIN_CASES}. ` +
      "A shrunken or missing corpus must fail, never report a clean run.",
  );
  process.exit(2);
}

/** Where in the chain a case stopped: the thing you have to fix. */
function stage(c, r, res) {
  if (SETTLED.has(r.meta.terminal_kind)) return "settled";
  const d = route(c.query, []);
  if (r.meta.terminal_kind === "operational_failure") {
    // Evidence was found and the answer was handed to a model — the policy, not the knowledge, is wrong.
    return d.entry_id ? "answer_policy_not_deterministic" : "grounded_but_model_dependent";
  }
  if (!d.entry_id && (res.sources || []).length === 0) return "subject_unresolved";
  if (d.entry_id) return "entry_reached_but_not_settled";
  return "no_establishing_evidence";
}

async function run(c) {
  const h = harness({});
  const r = await h.pipeline.answer(c.query, {});
  const res = r.result || {};
  return {
    id: c.id,
    locale: c.locale,
    domain: c.domain,
    class: c.class,
    query: c.query,
    entry: res.entry_id ?? null,
    expected_entry: c.entry ?? null,
    terminal: r.meta.terminal_kind,
    reason: r.meta.fallback_reason ?? null,
    model_called: r.meta.llm_called === true,
    sources: (res.sources || []).map((s) => s.id || s.path).filter(Boolean),
    stage: stage(c, r, res),
  };
}

const rows = [];
for (const c of bench.cases) rows.push(await run(c));

const critical = rows.filter((x) => x.class === "deterministic_critical");
const negative = rows.filter((x) => x.class === "negative_control");
const settled = critical.filter((x) => x.stage === "settled");
const failing = critical.filter((x) => x.stage !== "settled");
// A negative control must NOT be settled — closing coverage must never turn an unknown into a fact.
const leaked = negative.filter((x) => SETTLED.has(x.terminal));
// Paired cases must reach the same record: one canonical fact, localized surfaces.
const byId = new Map(rows.map((x) => [x.id, x]));
const divergences = [];
for (const c of bench.cases) {
  if (!c.pair) continue;
  const a = byId.get(c.id);
  const b = byId.get(c.pair);
  if (!a || !b || c.id > c.pair) continue;
  if (a.entry !== b.entry || SETTLED.has(a.terminal) !== SETTLED.has(b.terminal)) {
    divergences.push({ pt: a.locale === "pt" ? a : b, en: a.locale === "en" ? a : b });
  }
}
const wrongEntry = critical.filter((x) => x.expected_entry && x.entry !== x.expected_entry);
const modelDependent = critical.filter((x) => x.model_called);
const sourceless = settled.filter((x) => x.sources.length === 0);

const mode = process.argv.includes("--check") ? "check" : "matrix";

if (mode === "matrix") {
  for (const x of rows) {
    console.log(
      [
        x.class === "negative_control" ? "neg " : x.stage === "settled" ? "OK  " : "FAIL",
        x.locale,
        x.domain.padEnd(28),
        x.stage.padEnd(34),
        (x.entry ?? "-").padEnd(34),
        x.terminal,
        x.query,
      ].join(" "),
    );
  }
  console.log("");
  console.log(`deterministic-critical settled : ${settled.length}/${critical.length}`);
  console.log(`model-dependent                : ${modelDependent.length}`);
  console.log(`settled with NO sources        : ${sourceless.length}`);
  console.log(`PT/EN divergences              : ${divergences.length}`);
  console.log(`wrong entry vs expected        : ${wrongEntry.length}`);
  console.log(`negative controls leaked       : ${leaked.length}/${negative.length}`);
  if (failing.length) {
    console.log("\nby stage:");
    const g = {};
    for (const x of failing) (g[x.stage] ||= []).push(x);
    for (const [s, xs] of Object.entries(g)) {
      console.log(`  ${s}  (${xs.length})`);
      for (const x of xs) console.log(`      [${x.locale}] ${x.domain} — ${x.query}`);
    }
  }
  process.exit(0);
}

const problems = [];
if (failing.length) problems.push(`${failing.length} deterministic-critical case(s) do not settle without a model`);
if (modelDependent.length) problems.push(`${modelDependent.length} critical case(s) called a model`);
if (sourceless.length) problems.push(`${sourceless.length} settled case(s) cite no source — a critical answer must have establishing evidence`);
if (divergences.length) problems.push(`${divergences.length} PT/EN pair(s) diverge`);
if (wrongEntry.length) problems.push(`${wrongEntry.length} case(s) reached an entry other than the registered one`);
if (leaked.length) problems.push(`${leaked.length} negative control(s) were answered as settled facts`);

console.log(`== banzai-critical-coverage ==`);
console.log(`  cases: ${rows.length} (${critical.length} deterministic-critical, ${negative.length} negative control)`);
if (!problems.length) {
  console.log(`  ok: ${settled.length}/${critical.length} settled model-free, ${divergences.length} PT/EN divergences, negative controls hold`);
  console.log("banzai-critical-coverage: OK");
  process.exit(0);
}
for (const p of problems) console.log(`  FAIL: ${p}`);
for (const x of failing) console.log(`        [${x.locale}] ${x.stage} — ${x.query}`);
for (const d of divergences) console.log(`        PT/EN: ${d.pt?.query} (${d.pt?.entry}) vs ${d.en?.query} (${d.en?.entry})`);
for (const x of leaked) console.log(`        LEAK: ${x.query} answered as ${x.terminal}`);
console.log("banzai-critical-coverage: FAILED");
process.exit(1);
