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

// Terminal -> outcome CLASS. The acceptance question is never "did it answer" but "did it produce the
// outcome this case is supposed to have": a refusal is right for a wrong premise and wrong for a published
// fact, and one aggregate percentage cannot tell those apart.
const CLASS_OF = new Map();
for (const [cls, terminals] of Object.entries(bench.terminal_classes)) {
  for (const t of terminals) CLASS_OF.set(t, cls);
}
const outcomeClass = (terminal) => CLASS_OF.get(terminal) || `unmapped:${terminal}`;
const SETTLED = new Set(bench.terminal_classes.settled);

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
    policy: c.policy,
    expected_class: c.expected_terminal_class,
    query: c.query,
    entry: res.entry_id ?? null,
    expected_entry: c.entry ?? null,
    terminal: r.meta.terminal_kind,
    reason: r.meta.fallback_reason ?? null,
    model_called: r.meta.llm_called === true,
    sources: (res.sources || []).map((s) => s.id || s.path).filter(Boolean),
    stage: stage(c, r, res),
    actual_class: outcomeClass(r.meta.terminal_kind),
  };
}

const rows = [];
for (const c of bench.cases) rows.push(await run(c));

// PASS is "the outcome this case is supposed to have", per case. Nothing else.
for (const x of rows) x.pass = x.actual_class === x.expected_class;

const byPolicy = (p) => rows.filter((x) => x.policy === p);
const critical = byPolicy("deterministic_critical");
const synthesis = byPolicy("supported_synthesis");
const negative = byPolicy("negative_control");
const failing = rows.filter((x) => !x.pass);

// The two asymmetric degradations the aggregate would hide.
const refusedFacts = critical.filter((x) => x.actual_class === "refused_safe" && x.expected_class !== "refused_safe");
const falseSupport = negative.filter((x) => x.actual_class === "settled");
const modelDependent = critical.filter((x) => x.model_called);
const sourceless = critical.filter((x) => x.pass && x.actual_class === "settled" && x.sources.length === 0);
const wrongEntry = critical.filter((x) => x.expected_entry && x.entry !== x.expected_entry);

// Paired cases must share the record AND the policy.
const byId = new Map(rows.map((x) => [x.id, x]));
const pairs = [];
for (const c of bench.cases) {
  if (!c.pair || c.id > c.pair) continue;
  const a = byId.get(c.id);
  const b = byId.get(c.pair);
  if (!a || !b) continue;
  const ok = a.entry === b.entry && a.actual_class === b.actual_class;
  pairs.push({ ok, a, b });
}
const divergences = pairs.filter((p) => !p.ok);

// The DEFAULT gates. It used to be the other way round: `matrix` was the default and its reporting path
// ended in an unconditional process.exit(0), so every plain invocation printed real measurements — 66/66,
// zero model dependency — and then exited 0 whatever those measurements said. The whole milestone quoted
// that as a passing benchmark. It was a true measurement and a broken gate.
//
// Fixing the one caller was not enough: a checker that only enforces when the caller remembers a flag will
// be called without it again. Enforcement is now what you get by default, and looking at the matrix without
// judging it is the thing you have to ask for.
const mode = process.argv.includes("--matrix") || process.argv.includes("--report") ? "matrix" : "check";

const report = () => {
  const n = (g) => `${g.filter((x) => x.pass).length}/${g.length}`;
  console.log(`  DETERMINISTIC_CRITICAL : ${n(critical)}`);
  console.log(`  SUPPORTED_SYNTHESIS    : ${n(synthesis)}`);
  console.log(`  NEGATIVE_CONTROLS      : ${n(negative)}`);
  console.log(`  PT/EN paired cases     : ${pairs.filter((p) => p.ok).length}/${pairs.length}`);
  console.log(`  model dependency among critical      : ${modelDependent.length}`);
  console.log(`  published facts refused or unanswered: ${refusedFacts.length + critical.filter((x) => x.actual_class === "insufficient" && x.expected_class !== "insufficient").length}`);
  console.log(`  false support among negative controls : ${falseSupport.length}`);
  console.log(`  settled with no establishing source   : ${sourceless.length}`);
  console.log(`  reached an unregistered entry         : ${wrongEntry.length}`);
};

if (mode === "matrix") {
  for (const x of rows) {
    console.log(
      [
        x.pass ? "PASS" : "FAIL",
        x.policy === "negative_control" ? "neg " : "crit",
        x.locale,
        x.domain.padEnd(28),
        `${x.expected_class}->${x.actual_class}`.padEnd(30),
        (x.entry ?? "-").padEnd(34),
        x.query,
      ].join(" "),
    );
  }
  console.log("");
  report();
  if (failing.length) {
    console.log("\nby stage:");
    const g = {};
    for (const x of failing) (g[x.policy === "negative_control" ? `negative:${x.actual_class}` : x.stage] ||= []).push(x);
    for (const [s, xs] of Object.entries(g)) {
      console.log(`  ${s}  (${xs.length})`);
      for (const x of xs) console.log(`      [${x.locale}] ${x.domain} — ${x.query}`);
    }
  }
  process.exit(0);
}

// CLOSED WORLD, in both directions. Everything registered must have executed, and everything executed must
// be registered. Measured: silently dropping one case from the execution loop left this evaluator green and
// the registry validation green — the denominator shrank from 66 to 65 and the run still reported success,
// because the count was printed and never asserted. A benchmark that cannot notice a missing case can be
// emptied one case at a time without ever going red.
const registeredIds = bench.cases.map((c) => c.id);
const executedIds = rows.map((x) => x.id);
const notExecuted = registeredIds.filter((id) => !executedIds.includes(id));
const notRegistered = executedIds.filter((id) => !registeredIds.includes(id));

const problems = [];
if (notExecuted.length) problems.push(`${notExecuted.length} registered case(s) never executed: ${notExecuted.join(", ")}`);
if (notRegistered.length) problems.push(`${notRegistered.length} executed result(s) map to no registered case: ${notRegistered.join(", ")}`);
if (failing.length) problems.push(`${failing.length} case(s) did not produce their expected semantic outcome`);
if (modelDependent.length) problems.push(`${modelDependent.length} deterministic-critical case(s) called a model`);
if (refusedFacts.length) problems.push(`${refusedFacts.length} published fact(s) were REFUSED — declining to state a published fact is not safety`);
if (falseSupport.length) problems.push(`${falseSupport.length} negative control(s) were answered as settled facts`);
if (sourceless.length) problems.push(`${sourceless.length} settled case(s) cite no source — a critical answer must have establishing evidence`);
if (divergences.length) problems.push(`${divergences.length} PT/EN pair(s) diverge`);
if (wrongEntry.length) problems.push(`${wrongEntry.length} case(s) reached an entry other than the registered one`);

console.log(`== banzai-critical-coverage ==`);
console.log(`  cases: ${rows.length} executed / ${registeredIds.length} registered`);
report();
if (!problems.length) {
  console.log(`  ok: every case produced its expected semantic outcome`);
  console.log("banzai-critical-coverage: OK");
  process.exit(0);
}
for (const p of problems) console.log(`  FAIL: ${p}`);
for (const x of failing) console.log(`        [${x.locale}] ${x.policy} expected ${x.expected_class}, got ${x.actual_class} (${x.stage}) — ${x.query}`);
for (const d of divergences) console.log(`        PT/EN: ${d.pt?.query} (${d.pt?.entry}) vs ${d.en?.query} (${d.en?.entry})`);
for (const x of falseSupport) console.log(`        FALSE SUPPORT: ${x.query} answered as ${x.entry}`);
console.log("banzai-critical-coverage: FAILED");
process.exit(1);
