// A registered critical correction settles. The model is not asked.
//
// This file exists because every previous version of this property was asserted as "the right entry came
// back", and that assertion cannot tell settlement from luck. In production the pipeline entered grounded
// synthesis for `Porque é que BANZA certifica empresas?` even though the router had already returned
// `action=deterministic, entry=def-certification-actor`. The model wrote fluent prose affirming the false
// premise and cited `conformance/README.md` for it — a real source that really does discuss conformance —
// so post-validation, which checks that claims rest on the package, accepted it. The false premise was
// published.
//
// Locally the same code was green, because locally the model could never answer: synthesis was attempted,
// it failed, the pipeline degraded to the emergency grounding, and the emergency grounding for a settled
// critical entry IS the correct record. The right answer arrived every time, as a consolation prize, and no
// assertion in the suite could see the difference.
//
// So the property here is not about the answer's text. It is:
//
//     MODEL CALLS = 0
//
// A count cannot be satisfied by an outage. If the count is zero, nothing the model might have said could
// have mattered — which is the only form of this guarantee that a differently-behaved future model cannot
// quietly take away. The provider used throughout is `canaryProvider()`: reachable, and primed to return a
// production-shaped completion affirming exactly the claims the protocol forbids. It is the opposite of
// `unreachableProvider()` on purpose. If settlement ever regresses, this provider answers, and these tests
// go red on the count before anyone has to notice what it said.
//
// The other half is asserted just as hard: a legitimate open question must still reach the model exactly
// once. A "fix" that silenced synthesis globally would satisfy the first half alone, and it would be a
// worse engine.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { harness, SUPPORTED_SYNTHESIS_QUERY, unreachableProvider } from "./_pipeline-harness.mjs";
import { canaryProvider, FALSE_PREMISE_PROSE } from "./_production-canary.mjs";
import { route, getEntry, ENTRIES } from "../src/knowledge.js";
import { asserts } from "./_relation.mjs";

const BENCHMARK = JSON.parse(
  readFileSync(new URL("../../../assurance/banzai-critical-benchmark.json", import.meta.url), "utf8"),
);

/** Run a question through the full pipeline against a reachable model that WOULD answer. */
async function underCanary(q, prose = FALSE_PREMISE_PROSE.pt) {
  const c = canaryProvider(prose);
  const h = harness({ provider: c.provider });
  const r = await h.pipeline.answer(q, {});
  const res = r.result || {};
  return {
    calls: c.calls(),
    terminal: r.meta.terminal_kind,
    entry: res.entry_id ?? null,
    text: String(res.answer || ""),
    sources: (res.sources || []).map((s) => s.id),
    llm: r.meta.llm_called === true,
    reason: r.meta.fallback_reason ?? null,
  };
}

// ── The first divergence, pinned ──────────────────────────────────────────────────────────────────

test("a deterministic critical route does not enter semantic synthesis", async () => {
  // The architectural contradiction, stated as one assertion. The router settles the question; the
  // orchestrator must honour that. Before this, both halves were true at once: route said deterministic,
  // and synthesis ran anyway.
  const q = "Porque é que BANZA certifica empresas?";
  const d = route(q, []);
  assert.equal(d.action, "deterministic", "the router must already settle this question");
  assert.equal(d.entry_id, "def-certification-actor");

  const a = await underCanary(q);
  assert.equal(a.calls, 0, "a settled critical route must not reach the model");
  assert.equal(a.llm, false);
  assert.equal(a.entry, "def-certification-actor");
});

test("the canary is reachable — otherwise every count above is meaningless", async () => {
  // Non-vacuity for the whole file. If this provider could not answer, `calls: 0` would prove nothing at
  // all, which is precisely how the previous suite passed while production was wrong.
  const a = await underCanary(SUPPORTED_SYNTHESIS_QUERY, "A conformidade sustenta a federação no BANZA.");
  assert.equal(a.calls, 1, "a legitimate open question must still reach the model");
  assert.equal(a.terminal, "explanatory_trunk");
});

test("the canary's answer would be accepted if it were ever asked", async () => {
  // The sharpest form: prove the false premise SURVIVES post-validation on this exact question, so that
  // "the model was not called" is the only thing standing between the reader and the wrong answer. If a
  // future change made the validator reject this text, the settlement tests would still pass — and they
  // would have stopped testing settlement. This keeps that honest.
  const c = canaryProvider(FALSE_PREMISE_PROSE.pt);
  const h = harness({ provider: c.provider });
  // A question with the same false premise that is NOT a registered critical relation: "empresas de
  // conformidade" names no subject the correction registry owns, so it routes to the trunk legitimately.
  const r = await h.pipeline.answer("explica a relação entre conformidade e certificação de empresas no BANZA", {});
  if (c.calls() === 0) {
    // The question settled too — then this control cannot demonstrate acceptance. Say so rather than
    // passing quietly; a silently-skipped control is the failure mode this file is about.
    assert.fail("the acceptance control never reached the model, so it proves nothing — choose another query");
  }
  assert.equal(r.meta.terminal_kind, "explanatory_trunk", "the model's text must have been published");
  assert.ok(
    asserts(String((r.result || {}).answer || ""), "(banza)", "(certifica)"),
    "the published text must actually carry the false premise — else acceptance is not demonstrated",
  );
});

// ── The false-premise matrix, PT and EN, against a model that would answer ────────────────────────

const MATRIX = [
  ["B  BANZA certifies organizations (PT)", "Porque é que BANZA certifica empresas?", FALSE_PREMISE_PROSE.pt],
  ["B  BANZA certifies organizations (EN)", "Why does BANZA certify companies?", FALSE_PREMISE_PROSE.pt],
  ["C  the Root certifies implementations (PT)", "Porque é que a Root certifica implementações?", FALSE_PREMISE_PROSE.root],
  ["D  BanzAI certifies implementations (EN)", "Why does BanzAI certify implementations?", FALSE_PREMISE_PROSE.en],
  ["D  BanzAI certifies implementations (PT)", "O BanzAI certifica implementações?", FALSE_PREMISE_PROSE.en],
  ["E  certification grants admission (PT)", "A certificação autoriza a operar?", FALSE_PREMISE_PROSE.pt],
];

for (const [label, q, prose] of MATRIX) {
  test(`false premise settles model-free — ${label}`, async () => {
    const a = await underCanary(q, prose);
    assert.equal(a.calls, 0, `${q}: the model must not be asked to adjudicate a registered critical fact`);
    assert.equal(a.llm, false, `${q}: llm_called must be false`);
    assert.ok(a.entry, `${q}: a corrective record must actually be served (terminal was ${a.terminal})`);
    assert.notEqual(a.terminal, "insufficient_evidence", `${q}: the engine holds this record`);
    assert.ok(a.sources.length > 0, `${q}: the correction must rest on establishing evidence`);
    // And the answer must not itself carry the premise it exists to deny.
    assert.ok(
      !asserts(a.text, "(banzai)", "(certifica|certifies)"),
      `${q}: the served correction must not assert that BanzAI certifies`,
    );
  });
}

// ── Settlement requires evidence — it is not a licence to serve a canned truth ────────────────────

test("a settled record with no establishing evidence fails closed, and does not fall to the model", async () => {
  // C6, restated for the settlement path. The route id says the question is understood; it says nothing
  // about whether the answer is still supported. With the establishing sources removed the honest outcome
  // is to decline — NOT to serve the record anyway (a canned truth), and NOT to hand the most sensitive
  // question in the corpus to the least constrained path.
  const q = "Porque é que BANZA certifica empresas?";
  const entry = getEntry("def-certification-actor");
  assert.ok(entry && Array.isArray(entry.sources) && entry.sources.length > 0, "baseline: the record has sources");

  const baseline = await underCanary(q);
  assert.equal(baseline.calls, 0);
  assert.equal(baseline.entry, "def-certification-actor", "baseline: settled");

  const live = ENTRIES.find((e) => e.id === "def-certification-actor");
  assert.ok(live, "the mutation must land on the entry the pipeline actually reads");
  const saved = live.sources;
  try {
    live.sources = [];
    const mutated = await underCanary(q);
    assert.notEqual(mutated.entry, "def-certification-actor", "an unsupported record must not be served");
    assert.equal(mutated.terminal, "insufficient_evidence", "fail closed");
    assert.equal(mutated.calls, 0, "and failing closed must not mean falling through to the model");
  } finally {
    live.sources = saved;
  }
  // The mutation is reversible and the baseline is restored — otherwise later tests would inherit it.
  const restored = await underCanary(q);
  assert.equal(restored.entry, "def-certification-actor", "baseline restored");
});

// ── The whole registered critical set, through the full production-equivalent path ────────────────

test("no deterministic_critical benchmark case calls the model", async () => {
  const critical = BENCHMARK.cases.filter((c) => c.policy === "deterministic_critical");
  assert.ok(critical.length >= 60, `only ${critical.length} critical cases — the sweep would be near-vacuous`);

  const called = [];
  for (const c of critical) {
    const a = await underCanary(c.query, FALSE_PREMISE_PROSE.pt);
    if (a.calls !== 0) called.push(`${c.id} [${c.locale}] "${c.query}" → ${a.calls} call(s), terminal=${a.terminal}`);
  }
  assert.deepEqual(
    called,
    [],
    `${called.length}/${critical.length} registered critical cases reached the model:\n    ${called.join("\n    ")}`,
  );
});

// ── Minimal harness vs production-equivalent path — no semantic divergence ────────────────────────

test("the minimal and production-equivalent paths reach the same semantic result", async () => {
  // §20. The local harness and the full path must agree on the canonical target, the terminal and the model
  // policy. Divergence here is exactly what let a green suite coexist with a broken production: the two
  // were measuring different pipelines and only one of them was the real one.
  for (const [, q] of MATRIX) {
    const minimal = await (async () => {
      const h = harness({ provider: unreachableProvider() });
      const r = await h.pipeline.answer(q, {});
      return { entry: (r.result || {}).entry_id ?? null, terminal: r.meta.terminal_kind, llm: r.meta.llm_called === true };
    })();
    const full = await underCanary(q);
    assert.equal(full.entry, minimal.entry, `${q}: canonical target must not depend on model reachability`);
    assert.equal(full.terminal, minimal.terminal, `${q}: terminal must not depend on model reachability`);
    assert.equal(minimal.llm, false, `${q}: model-free with no model`);
    assert.equal(full.llm, false, `${q}: model-free WITH a model — the property that was missing`);
  }
});

// ── Settlement integrity is now structural, not a rescue ──────────────────────────────────────────

test("a settled critical fact does not need the model to be unavailable to stay correct", async () => {
  // The earlier settlement-integrity property was "an outage must not lose the record". It held. What it
  // could not state is the stronger fact that makes it uninteresting: for these records the model is never
  // consulted, so there is no outage to survive.
  const q = "Porque é que BANZA certifica empresas?";
  const withModel = await underCanary(q);
  const withoutModel = await (async () => {
    const h = harness({ provider: unreachableProvider() });
    const r = await h.pipeline.answer(q, {});
    return { entry: (r.result || {}).entry_id ?? null, terminal: r.meta.terminal_kind };
  })();
  assert.equal(withModel.entry, withoutModel.entry);
  assert.equal(withModel.terminal, withoutModel.terminal);
  assert.equal(withModel.calls, 0);
});

// ── A cache cannot resurrect the answer this fix removed ──────────────────────────────────────────

test("repeating a settled question serves the same record, never a cached explanation", async () => {
  // Settlement resolves ABOVE the cache lookup, so a settled question never consults the cache at all —
  // which is what makes the fix safe to deploy over a running instance holding explanatory answers from
  // before it. Asserted rather than assumed: if settlement is ever moved below the cache, a stored
  // pre-fix trunk answer would be served again and this goes red.
  const c = canaryProvider(FALSE_PREMISE_PROSE.pt);
  const h = harness({ provider: c.provider });
  const q = "Porque é que BANZA certifica empresas?";

  const first = await h.pipeline.answer(q, {});
  const second = await h.pipeline.answer(q, {});
  assert.equal(c.calls(), 0, "neither turn may reach the model");
  assert.equal((first.result || {}).entry_id, "def-certification-actor");
  assert.equal((second.result || {}).entry_id, (first.result || {}).entry_id, "same record on repeat");
  assert.equal(second.meta.terminal_kind, first.meta.terminal_kind, "same terminal on repeat");
  assert.equal(second.meta.cache ?? null, null, "a settled answer is not served from cache");
});

// ── The original live fix must not regress ────────────────────────────────────────────────────────

test("the operator-control answer stays deterministic and model-free", async () => {
  // The bug that started this milestone, and the one already live and working. A settlement change is
  // exactly the kind of change that could take it away.
  for (const q of ["quem controla os operadores ?", "who controls the operators?"]) {
    const a = await underCanary(q);
    assert.equal(a.calls, 0, `${q}: must not reach the model`);
    assert.ok(a.entry, `${q}: must serve a canonical record`);
    assert.ok(a.sources.length > 0, `${q}: must carry evidence`);
  }
});
