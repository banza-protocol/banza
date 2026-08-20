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
import { ENTRIES , realizedLocales } from "../src/knowledge.js";
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

// Every SUBSTANTIVE realization of every settled entry — not the Portuguese projection.
//
// `e.answer` reads exactly realizations["pt-PT"], so sweeping it would leave an English realization
// entirely unchecked: a forbidden claim could sit in the English answer while Portuguese stayed clean
// and this file stayed green. The compatibility getter's one real danger is hiding English policy
// failures, and this is the sweep that would have hidden them.
const settled = ENTRIES.filter((e) => e.deterministic === true && realizedLocales(e).length);
const REALIZATIONS = settled.flatMap((e) =>
  realizedLocales(e).map((locale) => ({ id: e.id, locale, text: e.realizations[locale] })),
);

test("the settled corpus is large enough for this sweep to mean something", () => {
  // A sweep over an empty set passes. If the corpus shrinks or the filter stops matching, say so here
  // rather than reporting a clean result about nothing.
  assert.ok(settled.length >= 60, `only ${settled.length} settled entries — the sweep would be near-vacuous`);
});

test("no settled answer asserts a claim the protocol forbids", () => {
  const violations = [];
  for (const r0 of REALIZATIONS) {
    for (const [claim, subject, predicate] of PROHIBITED) {
      const r = relation(r0.text, subject, predicate);
      if (r.asserted) violations.push(`${r0.id} [${r0.locale}]: "${claim}" — ${r.why}\n      clause: ${r.clause}`);
    }
    if (assertsEquality(r0.text, /operador|operator/i, /implementa[çc][ãa]o|implementation/i)) {
      violations.push(`${r0.id} [${r0.locale}]: "an operator is an implementation"`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    `${violations.length} prohibited claim(s) across ${REALIZATIONS.length} realizations of ${settled.length} settled entries:\n    ${violations.join("\n    ")}`,
  );
});

test("the sweep covers every locale, not just the Portuguese projection", () => {
  // Without this the sweep could silently be PT-only and still look complete.
  const locales = new Set(REALIZATIONS.map((r) => r.locale));
  assert.ok(locales.has("pt-PT"), "Portuguese realizations must be swept");
  assert.ok(locales.has("en"), "English realizations must be swept");
  assert.ok(
    REALIZATIONS.length > settled.length,
    `${REALIZATIONS.length} realizations for ${settled.length} entries — the English side is not being read`,
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
