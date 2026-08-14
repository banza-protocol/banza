// M2.12B (ADR-035) — BanzAI knows the Operador Zero simulator.
//
// The gap this closes: before M2.12B, "O que é o Operador Zero?" returned a `no_source` refusal and
// "Explica o ADR-035" returned `document_not_found`, because neither the curated entry nor ADR-035
// was in the knowledge base. These tests pin the fix AND the demo boundary of the curated answer —
// the one place a wrong word (bank / PSP / certified) would be most damaging.

import { test } from "node:test";
import assert from "node:assert/strict";
import { route, getEntry, resolveDocument, ENTRIES } from "../src/knowledge.js";

// M2.13C-C — "O que é o KZ_DEMO?" now routes to the dedicated `def-kz-demo` vocabulary entry (a
// better, term-specific answer that still keeps the demo boundary), so it is no longer in this list.
const OPERADOR_ZERO_QUESTIONS = [
  "O que é o Operador Zero?",
  "o que e operador zero",
  "O Operador Zero é um banco?",
  "O Operador Zero é certificado?",
];

test("every Operador Zero question routes to the curated entry", () => {
  for (const q of OPERADOR_ZERO_QUESTIONS) {
    const d = route(q);
    assert.equal(
      d.entry_id,
      "what-is-operador-zero",
      `"${q}" routed to ${d.entry_id} (action=${d.action})`,
    );
  }
});

test("the curated Operador Zero answer keeps the demo boundary and never claims a status", () => {
  const e = getEntry("what-is-operador-zero");
  assert.ok(e, "entry exists");
  const a = e.answer.toLowerCase();

  // States what it is NOT — the boundary the whole simulator exists to keep.
  for (const must of ["não é banco", "não é psp", "não é carteira", "não é operador financeiro licenciado", "não movimenta dinheiro real"]) {
    assert.ok(a.includes(must), `answer must state "${must}"`);
  }
  // States the demo markings and currency.
  for (const must of ["kz_demo", "demo_only", "monetary_value", "production_allowed"]) {
    assert.ok(a.includes(must), `answer must mention "${must}"`);
  }
  // A PASS is evidence, not certification.
  assert.ok(a.includes("evidência técnica"), "answer must frame a PASS as technical evidence");

  // NEVER claims a status without a negation before it. Scan every forbidden stem.
  for (const stem of ["certificad", "aprovad", "licenciad", "autorizad"]) {
    let i = 0;
    while ((i = a.indexOf(stem, i)) !== -1) {
      const before = a.slice(Math.max(0, i - 40), i);
      assert.ok(
        /\b(não|nao|nunca|sem)\b/.test(before),
        `"${stem}" appears without a negation before it`,
      );
      i += stem.length;
    }
  }

  // The engine's runtime brand rule extends to the KB: no commercial operator brand in the answer.
  assert.ok(!a.includes("banz" + "ami"), "the Operador Zero answer must not name a commercial operator");
});

test("the curated entry cites ADR-035 as its source", () => {
  const e = getEntry("what-is-operador-zero");
  assert.ok(e.sources.some((s) => s.id === "ADR-035"), "must cite ADR-035");
});

test("ADR-035 resolves as a real document (not document_not_found)", () => {
  const r = resolveDocument("Explica o ADR-035");
  assert.equal(r.detected, true, "ADR-035 must be detected");
  assert.equal(r.found, true, "ADR-035 must resolve to a real record now that it is indexed");
});

test("the Operador Zero entry is marked critical so it is the deterministic fallback", () => {
  // Qwen answers the concept question by default, but a completion that violated the boundary is
  // replaced by THIS vetted answer. That safety net only exists if the entry is critical.
  const e = ENTRIES.find((x) => x.id === "what-is-operador-zero");
  assert.equal(e.critical, true);
});
