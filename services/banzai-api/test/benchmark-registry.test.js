// The critical benchmark is a REGISTRY, and this validates the registry itself.
//
// "66/66" is the number this milestone is judged by, so the list producing it has to be closed-world:
// every case declared must execute, every case executed must be declared, and no case may be shaped in a
// way that makes it pass for a reason nobody intended. A benchmark whose own inventory is unchecked can
// lose a case to a typo'd id or a stale parity reference and still report a clean total — the denominator
// stays put while the coverage quietly shrinks.
//
// It stays NON-NORMATIVE. This registry is assurance material: it records what the engine must answer and
// how, and it confers no protocol authority on anything it names.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ENTRIES } from "../src/knowledge.js";

const registry = JSON.parse(
  readFileSync(new URL("../../../assurance/banzai-critical-benchmark.json", import.meta.url), "utf8"),
);
const cases = registry.cases;

const POLICIES = new Set(["deterministic_critical", "negative_control"]);
const LOCALES = new Set(["pt", "en"]);
const TERMINALS = new Set(Object.keys(registry.terminal_classes || {}));

// ── The counts this milestone reports ─────────────────────────────────────────────────────────────

test("the published denominators are what the registry actually contains", () => {
  // 66 / 9 / 30 are reported publicly. They are derived here, from the one list, rather than maintained
  // beside it — a second hand-kept count is a second thing to be wrong.
  const critical = cases.filter((c) => c.policy === "deterministic_critical");
  const negative = cases.filter((c) => c.policy === "negative_control");
  const pairs = new Set();
  for (const c of cases) {
    if (!c.pair) continue;
    pairs.add([c.id, c.pair].sort().join("::"));
  }
  assert.equal(critical.length, 66, "deterministic-critical denominator");
  assert.equal(negative.length, 9, "negative-control denominator");
  assert.equal(pairs.size, 30, "PT/EN parity pairs");
  assert.equal(cases.length, critical.length + negative.length, "every case has exactly one policy");
});

// ── Closed world ──────────────────────────────────────────────────────────────────────────────────

test("no duplicate case ids", () => {
  const seen = new Map();
  for (const c of cases) {
    assert.ok(!seen.has(c.id), `duplicate case id ${c.id}`);
    seen.set(c.id, c);
  }
});

test("every declared value is a known value", () => {
  for (const c of cases) {
    assert.ok(POLICIES.has(c.policy), `${c.id}: unknown policy ${c.policy}`);
    assert.ok(LOCALES.has(c.locale), `${c.id}: unknown locale ${c.locale}`);
    assert.ok(
      TERMINALS.has(c.expected_terminal_class),
      `${c.id}: unknown terminal class ${c.expected_terminal_class}`,
    );
    assert.ok(String(c.query || "").trim(), `${c.id}: no query`);
    assert.ok(String(c.domain || "").trim(), `${c.id}: no domain`);
  }
});

test("parity references are mutual and cross languages", () => {
  const byId = new Map(cases.map((c) => [c.id, c]));
  for (const c of cases) {
    if (!c.pair) continue;
    const other = byId.get(c.pair);
    assert.ok(other, `${c.id}: parity partner ${c.pair} is not registered`);
    assert.equal(other.pair, c.id, `${c.id} ↔ ${c.pair}: parity must be mutual`);
    assert.notEqual(other.locale, c.locale, `${c.id} ↔ ${c.pair}: a parity pair spans two languages`);
    assert.equal(other.policy, c.policy, `${c.id} ↔ ${c.pair}: a pair must be the same kind of case`);
  }
});

test("a critical case expects support; a negative control expects none", () => {
  // Written to the contract the registry actually keeps. A first version asserted that every critical case
  // names its record and is `settled`, and 39 of 66 declare no record while 3 legitimately expect
  // `refused_safe` — the safety boundary is a critical answer that is correct BY refusing. Asserting the
  // stricter shape would have been asserting a registry that does not exist.
  const SUPPORTED = new Set(["settled", "refused_safe"]);
  for (const c of cases) {
    if (c.policy === "deterministic_critical") {
      assert.ok(
        SUPPORTED.has(c.expected_terminal_class),
        `${c.id}: a critical case must expect a supported outcome, got ${c.expected_terminal_class}`,
      );
    } else {
      // The inversion that would quietly turn a negative control into a supported answer.
      assert.ok(!c.entry, `${c.id}: a negative control must not expect a record`);
      // NOT "must not be supported": one control — asking how many certified operators exist in
      // production — is correctly answered by a safety REFUSAL, which `refused_safe` also covers for three
      // critical cases. The invariant is narrower and truer: a control must never be SETTLED, because
      // settlement is the engine asserting a fact, and there is no fact here to assert.
      assert.notEqual(
        c.expected_terminal_class,
        "settled",
        `${c.id}: a negative control must never settle`,
      );
    }
  }
});

test("record-level precision is measured, not assumed", () => {
  // Not every critical case pins the record it must reach; most pin only the policy and the terminal
  // class. That is a real precision limit, so it is a number this suite reports rather than something a
  // reader has to discover. The floor stops it eroding silently: cases may gain records, never lose them
  // wholesale.
  const critical = cases.filter((c) => c.policy === "deterministic_critical");
  const pinned = critical.filter((c) => String(c.entry || "").trim());
  assert.ok(
    pinned.length >= 27,
    `record-level precision fell to ${pinned.length}/${critical.length} critical cases`,
  );
});

test("every expected record exists in the corpus", () => {
  // A case pointing at a record that no longer exists cannot fail for the right reason — it fails for a
  // missing fixture, which reads like a real regression and is not one.
  const ids = new Set(ENTRIES.map((e) => e.id));
  for (const c of cases) {
    if (!c.entry) continue;
    assert.ok(ids.has(c.entry), `${c.id}: expected record ${c.entry} is not in the corpus`);
  }
});

// ── Declared → executed ───────────────────────────────────────────────────────────────────────────

test("the registry is the only inventory the evaluator reads", async () => {
  // Closed world in the direction that is easy to get wrong: the evaluator must not carry cases of its
  // own. If it ever grows a private list, the registry stops being the owner and the two drift.
  const evaluator = readFileSync(new URL("../eval/critical-coverage.mjs", import.meta.url), "utf8");
  assert.match(
    evaluator,
    /banzai-critical-benchmark\.json/,
    "the evaluator must read the registry",
  );
  const inlineQueries = evaluator.match(/"[^"]*\?"/g) || [];
  assert.deepEqual(
    inlineQueries.filter((q) => q.length > 12),
    [],
    `the evaluator must not carry its own cases: ${inlineQueries.join(", ")}`,
  );
});
