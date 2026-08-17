// The prohibited claims, swept across the whole settled corpus rather than three fixtures.
//
// Two things are proven here at once, and the second is the one that is usually skipped.
//
//   NO VIOLATION      no settled answer asserts a claim the protocol forbids.
//   NO FALSE POSITIVE the matcher stays quiet on ~700 paragraphs of real bilingual text that is dense with
//                     exactly the constructions it must not misread — denials, contrasts, clefts, echoed
//                     questions, "não … nem …", "neither … nor …".
//
// The second is a false-positive proof with teeth, because a matcher tuned until three fixtures pass can
// still fire on everything else. If a future answer is written in a way this reads wrongly, this file goes
// red on legitimate prose — which is the correct place to find that out.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ENTRIES } from "../src/knowledge.js";
import { relation, assertsEquality } from "./_relation.mjs";

// Claims the protocol must never make, as relations rather than as strings.
const PROHIBITED = [
  ["BanzAI certifies", /banzai/i, /certifica|certifies|emite a certifica|issues certification/i],
  ["the Root authorities certify", /autoridades de raiz|root authorities/i, /certifica|certifies/i],
  ["Banzami certifies", /banzami/i, /certifica|certifies/i],
  [
    "certification grants admission",
    /certifica[çc][ãa]o|certification/i,
    /confere admiss[ãa]o|d[áa] admiss[ãa]o|grants admission|grants operational/i,
  ],
  [
    "certification grants regulatory authorization",
    /certifica[çc][ãa]o|certification/i,
    /confere autoriza|grants regulatory|grants legal|autoriza a opera/i,
  ],
  [
    "the organization passes the vectors",
    /a organiza[çc][ãa]o|the organization|a entidade|the entity/i,
    /passa|passes|satisfaz/i,
  ],
  ["a certificate binds to an entity", /certificado|certificate/i, /liga-se a uma entidade|binds to an entity/i],
];

const settled = ENTRIES.filter((e) => e.deterministic === true && e.answer);

test("the settled corpus is large enough for this sweep to mean something", () => {
  // A sweep over an empty set passes. If the corpus shrinks or the filter stops matching, say so here
  // rather than reporting a clean result about nothing.
  assert.ok(settled.length >= 60, `only ${settled.length} settled entries — the sweep would be near-vacuous`);
});

test("no settled answer asserts a claim the protocol forbids", () => {
  const violations = [];
  for (const e of settled) {
    for (const [claim, subject, predicate] of PROHIBITED) {
      const r = relation(e.answer, subject, predicate);
      if (r.asserted) violations.push(`${e.id}: "${claim}" — ${r.why}\n      clause: ${r.clause}`);
    }
    if (assertsEquality(e.answer, /operador|operator/i, /implementa[çc][ãa]o|implementation/i)) {
      violations.push(`${e.id}: "an operator is an implementation"`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    `${violations.length} prohibited claim(s) across ${settled.length} settled answers:\n    ${violations.join("\n    ")}`,
  );
});

test("the sweep actually reads the text it claims to read", () => {
  // Non-vacuity: the same sweep, over the same corpus, with ONE prohibited claim injected into ONE answer,
  // must find exactly that one. Without this, a matcher that silently returns false for everything would
  // produce the same clean result as a working one.
  const e = settled.find((x) => x.id === "def-certification-actor");
  assert.ok(e, "the fixture entry must exist");
  const injected = `${e.answer}\n\nO **BanzAI certifica** implementações.`;
  const [, subject, predicate] = PROHIBITED[0];
  assert.equal(relation(e.answer, subject, predicate).asserted, false, "clean before injection");
  assert.equal(relation(injected, subject, predicate).asserted, true, "and detected after");
});
