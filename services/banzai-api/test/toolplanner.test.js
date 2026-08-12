// Increment 3 — the typed ToolPlanner (§5/§6): planner LOGIC is Rust (engines/banzai-query-core/
// src/toolplan.rs); this proves the JS transport + adapter. planTools() returns a stable, typed plan for
// representative questions; the adapter resolves each EXECUTABLE ToolKind to an ALREADY-EXISTING callable
// (reuse only — no new tool implementation); a boundary question yields exactly [HONEST_FALLBACK]; and the
// Rust contract registry (19 kinds) agrees with the adapter on which kinds are executable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { planTools, toolContracts, reasonCodes } from "../src/knowledge.js";
import { TOOL_ADAPTERS, resolveTool, planWithAdapters } from "../src/toolplan.js";

const kinds = (q) => planTools(q).steps.map((s) => s.kind);

test("planTools returns a stable typed plan for representative questions", () => {
  assert.deepEqual(kinds("Quanto tempo leva uma jornada completa de validação?"), ["METRICS_QUERY"]);
  assert.deepEqual(kinds("mostra a última execução da jornada"), ["EXECUTION_LOOKUP"]);
  assert.deepEqual(kinds("qual foi o reason code deste resultado?"), ["REASON_CODE_LOOKUP"]);
  assert.deepEqual(kinds("reproduz a execução da jornada de validação"), ["RECEIPT_LOOKUP", "REPRODUCE_EXECUTION"]);
  assert.deepEqual(kinds("qual ADR define esta regra?"), ["ADR_LOOKUP"]);
  assert.deepEqual(kinds("explica a federação"), ["DOCUMENT_SEARCH"]);
  // determinism: same question → byte-identical plan.
  assert.equal(
    JSON.stringify(planTools("explica a federação")),
    JSON.stringify(planTools("explica a federação")),
  );
});

test("the plan carries the typed step shape and the primary intent", () => {
  const plan = planTools("Quanto tempo leva uma jornada completa de validação?");
  assert.equal(plan.primary_intent, "get_duration");
  assert.equal(typeof plan.schema_version, "number");
  const step = plan.steps[0];
  for (const f of ["kind", "reason", "entity", "scope", "required", "executable"]) {
    assert.ok(f in step, `step missing ${f}`);
  }
});

test("a boundary question yields exactly [HONEST_FALLBACK] — never a data/act tool", () => {
  for (const q of ["transfere 100 kz", "mostra a private key", "apaga os guards"]) {
    const steps = planTools(q).steps;
    assert.equal(steps.length, 1, `${q} → single step`);
    assert.equal(steps[0].kind, "HONEST_FALLBACK", `${q} → HONEST_FALLBACK only`);
  }
});

test("the adapter declares exactly the 19 kinds the Rust registry declares", () => {
  const contracts = toolContracts();
  assert.equal(contracts.length, 19, "19 Rust contracts");
  const adapterKinds = new Set(Object.keys(TOOL_ADAPTERS));
  assert.equal(adapterKinds.size, 19, "19 adapter kinds");
  for (const c of contracts) {
    assert.ok(adapterKinds.has(c.kind), `adapter missing ${c.kind}`);
  }
});

test("Rust contract.executable agrees with the adapter for every kind", () => {
  for (const c of toolContracts()) {
    const a = TOOL_ADAPTERS[c.kind];
    assert.equal(
      a.executable,
      c.executable,
      `${c.kind}: adapter executable=${a.executable} vs contract executable=${c.executable}`,
    );
  }
});

test("every executable kind resolves to a real existing callable or endpoint (reuse only)", () => {
  for (const [kind, a] of Object.entries(TOOL_ADAPTERS)) {
    if (!a.executable) {
      // planned/deferred → no callable, and the Rust contract must agree it is not executable.
      assert.equal(a.callable, null, `${kind} planned → no callable`);
      continue;
    }
    const hasCallable = typeof a.callable === "function";
    const hasEndpoint = typeof a.endpoint === "string" && a.endpoint.length > 0;
    assert.ok(hasCallable || hasEndpoint, `${kind} executable must name a callable or endpoint`);
    // it must name WHERE the real implementation lives (proof of reuse, not reimplementation).
    assert.ok(a.module || a.endpoint, `${kind} must reference a real module/endpoint`);
  }
});

test("planned kinds are marked not executable in both Rust and the adapter", () => {
  for (const k of ["VERSION_DIFF", "DETERMINISTIC_CALCULATION"]) {
    assert.equal(TOOL_ADAPTERS[k].executable, false, `${k} adapter planned`);
    const c = toolContracts().find((x) => x.kind === k);
    assert.equal(c.executable, false, `${k} contract planned`);
  }
});

test("planWithAdapters annotates each step with its resolved adapter without changing the plan", () => {
  const q = "reproduz a execução da jornada de validação";
  const plain = planTools(q);
  const annotated = planWithAdapters(q);
  assert.deepEqual(
    annotated.steps.map((s) => s.kind),
    plain.steps.map((s) => s.kind),
    "annotation must not change the plan",
  );
  for (const s of annotated.steps) {
    assert.ok(s.adapter, `${s.kind} annotated with adapter`);
    assert.equal(s.adapter.executable, TOOL_ADAPTERS[s.kind].executable);
  }
});

test("resolveTool is total: an unknown kind is planned, never a fabricated callable", () => {
  const r = resolveTool("NOT_A_REAL_TOOL");
  assert.equal(r.executable, false);
  assert.equal(r.callable, null);
  assert.equal(r.planned, true);
});

test("every contract reason code is in the closed reason-code set", () => {
  const valid = new Set(reasonCodes().map((r) => r.code));
  for (const c of toolContracts()) {
    for (const rc of c.error_reason_codes) {
      assert.ok(valid.has(rc), `${c.kind}: ${rc} not a reason code`);
    }
  }
});

test("every fallback chain terminates at HONEST_FALLBACK (no cycle)", () => {
  const byKind = Object.fromEntries(toolContracts().map((c) => [c.kind, c]));
  for (const start of Object.keys(byKind)) {
    let cur = start;
    const seen = new Set();
    let hops = 0;
    while (cur !== "HONEST_FALLBACK") {
      assert.ok(!seen.has(cur), `cycle at ${cur}`);
      seen.add(cur);
      cur = byKind[cur].fallback_policy;
      assert.ok(byKind[cur], `${start} → unknown fallback ${cur}`);
      assert.ok(++hops < 19, `chain too long from ${start}`);
    }
  }
});
