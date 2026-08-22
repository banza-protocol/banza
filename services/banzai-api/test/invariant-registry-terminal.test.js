// An invariant asked by its identifier is served from the registry, verbatim, in both locales.
//
// Three separate defects met on this path, and each was invisible until the semantic universe named
// all 55 critical invariants as units in their own right:
//
//   UNREACHABLE  The engine carried no invariant registry at all. Measured against production
//                `src-ef21f43`, 61 of the 110 invariant probes never reached their invariant, and
//                "O que exige a invariante INV-COLLECTION-001?" was answered with the definition of
//                BANZA — the generic collapse, in the one place where being specific IS the answer.
//
//   ONE LOCALE   Once reachable, "what does X REQUIRE" reads as an explanatory cue, so the English
//                form escalated into the trunk and came back as model prose while the Portuguese form
//                was served from the registry. The same invariant, two different kinds of answer.
//
//   MISLABELLED  The served answer was labelled `safety_refusal` with the public trace "Limite de
//                segurança aplicado por Rust", because the terminal decided "is this a definition?"
//                from a `def-` id prefix. Nothing was refused; the reader was told a security boundary
//                had fired over a statement about integer minor units.

import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./_pipeline-harness.mjs";
import { canaryProvider } from "./_production-canary.mjs";
import { getEntry, invariantIds } from "../src/knowledge.js";

const CANARY = "MODEL PROSE";

async function ask(q, locale) {
  const c = canaryProvider(CANARY);
  const h = harness({ provider: c.provider });
  const r = await h.pipeline.answer(q, { locale });
  return { res: r.result || {}, meta: r.meta || {} };
}

test("the runtime carries the whole registry, not a convenient subset", () => {
  // A subset would let every assertion below pass while leaving invariants unanswerable.
  const ids = invariantIds();
  assert.ok(ids.length >= 70, `registry collapsed to ${ids.length}`);
  assert.ok(ids.includes("INV-LEDGER-003") && ids.includes("MON-001"));
});

test("an invariant is answered from its own record, in both locales, without the model", async () => {
  for (const [q, loc, needle] of [
    ["O que exige a invariante INV-LEDGER-003 do BANZA?", "pt-PT", "INV-LEDGER-003"],
    ["What does invariant INV-LEDGER-003 require in BANZA?", "en", "INV-LEDGER-003"],
    ["O que exige a invariante INV-QR-001 do BANZA?", "pt-PT", "INV-QR-001"],
    ["What does invariant INV-QR-001 require in BANZA?", "en", "INV-QR-001"],
  ]) {
    const { res, meta } = await ask(q, loc);
    assert.equal(res.entry_id, needle.toLowerCase(), `${q}: must reach its own record`);
    assert.match(res.answer, new RegExp(needle), `${q}: the answer must name the invariant`);
    assert.equal(res.answer_locale, loc, `${q}: must declare its locale`);
    assert.equal(meta.llm_called, false, `${q}: normative text is served, never recomposed`);
    assert.notEqual(res.answer, CANARY, `${q}: escalated to the model instead of serving the registry`);
  }
});

test("the normative statement is served verbatim, not paraphrased", async () => {
  // The reason this matters more than tidiness: a drifting paraphrase of "integers in minor units,
  // never floating point" is a wrong answer about a financial invariant. Both locales must carry the
  // registry's own words.
  const entry = getEntry("inv-ledger-003");
  const statement = "All ledger amounts are integers in minor units (i64) — never floating point.";
  for (const loc of ["pt-PT", "en"]) {
    assert.ok(entry.realizations[loc].includes(statement), `${loc}: the binding text must appear verbatim`);
  }
});

test("serving an invariant is a canonical definition, never a safety refusal", async () => {
  for (const [q, loc] of [
    ["O que exige a invariante INV-LEDGER-002 do BANZA?", "pt-PT"],
    ["What does invariant INV-LEDGER-002 require in BANZA?", "en"],
  ]) {
    const { meta } = await ask(q, loc);
    assert.equal(meta.terminal_kind, "canonical_definition", `${q}: nothing was refused`);
    assert.doesNotMatch(String(meta.trace_label || ""), /segurança|security/i, `${q}: the public trace must not claim a boundary fired`);
  }
});

test("every critical invariant is answerable, in both locales", async () => {
  // The closure claim, checked rather than asserted for a sample. 55 units were declared; 55 must be
  // reachable, or the denominator names knowledge the engine does not serve.
  const { readFileSync } = await import("node:fs");
  const reg = JSON.parse(readFileSync(new URL("../../../contracts/invariants.json", import.meta.url), "utf8"));
  const critical = reg.invariants.filter((i) => i.severity === "critical");
  const missing = [];
  for (const inv of critical) {
    for (const loc of ["pt-PT", "en"]) {
      const e = getEntry(inv.id.toLowerCase());
      if (!e || !e.realizations[loc] || !e.realizations[loc].includes(inv.id)) missing.push(`${inv.id}/${loc}`);
    }
  }
  assert.deepEqual(missing, [], "critical invariants with no answer: " + missing.join(", "));
});
