// An unbound conversational reference is explained in the reader's language.
//
// `context.rs :: clarification_for` authors this sentence in Portuguese — its own doc comment says
// "Honest, request-oriented PT clarification" — and the pipeline served it verbatim to every reader,
// stamped `answer_locale: locale`. An English reader asking "Why not?" as a follow-up received a
// paragraph of Portuguese that DECLARED itself English.
//
// A false declaration is worse than an absent one. `localeMatches` compares the declaration against the
// request; they agreed; the gate passed a Portuguese answer to an English reader with nothing to notice.
//
// Measured against production at `src-2a01974`, journey J-EN-READY turn 2 ("Why not?"):
//
//     "Interpretei o teu pedido como uma referência a um turno anterior — **diagnosticar por que uma
//      execução falhou ou ficou bloqueada** —, mas **não tenho o contexto dessa conversa**…"
//
// Only a multi-turn journey reaches this path, which is why the whole locale programme had been green
// over it.
//
// The conversation is threaded the way `server.js` threads it — prior USER questions and the previous
// turn's sanitized `conversation_context`, and nothing else. A first attempt at this test passed a
// context shape the pipeline does not read, never reached the clarification path, and survived a
// mutation that restored the entire defect. It is asserted below that the path was actually reached.

import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./_pipeline-harness.mjs";

/** Portuguese function words with no counterpart in the English realization. */
const PORTUGUESE = /\b(não|teu|pedido|referência|anterior|contexto|conversa|adivinho|prossigo)\b/i;

/** Two turns on one pipeline, carrying exactly what the server carries, in a stated locale. */
async function twoTurns(first, second, locale) {
  const h = harness({});
  const a = await h.pipeline.answer(first, { locale });
  const b = await h.pipeline.answer(second, {
    locale,
    contextQuestions: [first],
    conversationContext: (a.meta || {}).conversation_context,
  });
  return { result: b.result || {}, meta: b.meta || {} };
}

const UNBOUND = [
  { first: "Is BANZA production ready?", second: "Why not?" },
  { first: "What is L2?", second: "Why did it fail?" },
];

test("an unbound reference is never explained in Portuguese to an English reader", async () => {
  let reached = 0;
  for (const { first, second } of UNBOUND) {
    const { result, meta } = await twoTurns(first, second, "en");
    if (meta.fallback_reason !== "context_reference_unresolved") continue;
    reached += 1;
    const answer = String(result.answer || "");
    assert.doesNotMatch(
      answer,
      PORTUGUESE,
      `"${second}" was answered in Portuguese to an English reader — ${answer.slice(0, 140)}`,
    );
    assert.equal(result.answer_locale, "en", `"${second}" declared itself English while doing it`);
  }
  // Non-vacuity. Without this, a change that stops routing these to the clarification path turns this
  // file green while the defect is untested — which is how the first version of it survived a mutation
  // that restored the whole bug.
  assert.ok(
    reached > 0,
    "no fixture reached the unbound-reference clarification path — this test proved nothing",
  );
});

test("the Portuguese reader still gets the Portuguese sentence", async () => {
  const { result, meta } = await twoTurns("O BANZA está pronto para produção?", "E porque falhou?", "pt-PT");
  assert.equal(
    meta.fallback_reason,
    "context_reference_unresolved",
    "this test is meaningless unless it reached the clarification path",
  );
  assert.match(String(result.answer || ""), PORTUGUESE, "the Portuguese realization must survive the fix");
  assert.equal(result.answer_locale, "pt-PT");
});

test("both locales are realized for every referent kind the engine can decide", async () => {
  // Closed-world: a kind with no label falls back to the generic one IN THE RIGHT LANGUAGE, never to the
  // engine's Portuguese. Read from the source that maps the variants, so a new `Anaphor` fails here.
  const { readFileSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const HERE = dirname(fileURLToPath(import.meta.url));
  const rs = readFileSync(
    join(HERE, "..", "..", "..", "engines", "banzai-query-core", "src", "context.rs"),
    "utf8",
  );
  const start = rs.indexOf("fn kind(&self) -> &'static str {");
  assert.ok(start > 0, "expected context.rs to map Anaphor variants to kinds");
  const kinds = [
    ...rs.slice(start, rs.indexOf("\n    }", start)).matchAll(/=>\s*"([a-z_]+)"/g),
  ].map((m) => m[1]);
  assert.ok(kinds.length >= 8, `expected the engine's referent kinds, saw ${kinds.join(", ")}`);

  const pipeline = readFileSync(join(HERE, "..", "src", "pipeline.js"), "utf8");
  const tableStart = pipeline.indexOf("const REFERENCE_CLARIFICATION = {");
  assert.ok(tableStart > 0, "expected the reference-clarification realization table");
  const table = pipeline.slice(tableStart, pipeline.indexOf("\n  };", tableStart));
  const pt = table.slice(table.indexOf('"pt-PT": {'), table.indexOf("en: {"));
  const en = table.slice(table.indexOf("en: {"));
  for (const kind of kinds) {
    assert.match(pt, new RegExp(`\\b${kind}:`), `"${kind}" has no Portuguese realization`);
    assert.match(en, new RegExp(`\\b${kind}:`), `"${kind}" has no English realization`);
  }
});
