// The matcher that reads the institutional properties, tested as a component in its own right.
//
// The institutional tests were green while a prohibited claim sat in the answer, because their matcher
// scanned a fixed sixty characters backwards for a negator and found one belonging to the previous
// sentence. Nothing caught it: the matcher had no tests of its own, so it was trusted exactly as far as it
// happened to work.
//
// An oracle that is not itself falsifiable turns every property it reads into decoration. These cases are
// the ones that separate a real violation from a legitimate denial — in both languages, because the corpus
// answers in both and a matcher that works in one is half an oracle.

import { test } from "node:test";
import assert from "node:assert/strict";
import { relation, asserts, assertsEquality } from "./_relation.mjs";

const SUBJ = /banzai/i;
const PRED = /certifica|certifies/i;

test("an affirmative violation is detected", () => {
  assert.equal(asserts("O BanzAI certifica implementações.", SUBJ, PRED), true);
  assert.equal(asserts("BanzAI certifies implementations.", SUBJ, PRED), true);
});

test("a direct negation of the same relation is not a violation", () => {
  assert.equal(asserts("O BanzAI não certifica implementações.", SUBJ, PRED), false);
  assert.equal(asserts("BanzAI does not certify implementations.", SUBJ, /certify|certifies/i), false);
  assert.equal(asserts("O BanzAI nunca certifica implementações.", SUBJ, PRED), false);
});

test("a negation belonging to a PRECEDING sentence does not defuse the claim", () => {
  // The exact shape that survived: a denial, then the prohibited claim as the next sentence.
  const pt = "O protocolo não é, ele próprio, um certificador. O BanzAI certifica implementações.";
  const en = "The protocol is not itself a certifier. BanzAI certifies implementations.";
  assert.equal(asserts(pt, SUBJ, PRED), true, `PT: ${relation(pt, SUBJ, PRED).why}`);
  assert.equal(asserts(en, SUBJ, PRED), true, `EN: ${relation(en, SUBJ, PRED).why}`);
});

test("an unrelated negation NEAR the claim does not defuse it", () => {
  const pt = "Sem taxas e sem intermediários, o BanzAI certifica implementações.";
  assert.equal(asserts(pt, SUBJ, PRED), true, relation(pt, SUBJ, PRED).why);
});

test("a negation of a DIFFERENT predicate does not defuse this one", () => {
  const pt = "O BanzAI certifica implementações, mas não emite certificados.";
  const en = "BanzAI certifies implementations, but does not issue certificates.";
  assert.equal(asserts(pt, SUBJ, PRED), true);
  assert.equal(asserts(en, SUBJ, /certifies/i), true);
});

test("a negation FOLLOWING the claim does not retroactively cancel it", () => {
  const pt = "O BanzAI certifica implementações. O protocolo não certifica nada.";
  assert.equal(asserts(pt, SUBJ, PRED), true);
});

test("a cleft negation binds to the relation it fronts", () => {
  assert.equal(asserts("Não é o BanzAI que certifica implementações.", SUBJ, PRED), false);
  assert.equal(asserts("It is not BanzAI that certifies implementations.", SUBJ, /certifies/i), false);
  // ...and the cleft must not swallow a later, genuinely affirmative clause about the same subject.
  const mixed = "Não é o protocolo que certifica. O BanzAI certifica implementações.";
  assert.equal(asserts(mixed, SUBJ, PRED), true);
});

test("negation is bound to the subject, not to the sentence", () => {
  // Two subjects, one denied and one affirmed, in the same sentence.
  const pt = "O protocolo não certifica, e o BanzAI certifica implementações.";
  assert.equal(asserts(pt, /protocolo/i, PRED), false, "the denied subject stays denied");
  assert.equal(asserts(pt, SUBJ, PRED), true, "the affirmed subject is detected");
});

test("a subject carries across coordinated clauses but its polarity does not", () => {
  assert.equal(
    asserts("A certificação não confere admissão e não autoriza a operar.", /certifica[çc][ãa]o/i, /autoriza/i),
    false,
    "the second clause carries its own denial",
  );
});

test("the real corpus denials read as denials in both languages", () => {
  const pt = "A certificação não confere admissão a um esquema operacional nem autorização regulatória.";
  const en = "Certification grants neither operational admission nor regulatory authorization.";
  assert.equal(asserts(pt, /certifica[çc][ãa]o/i, /confere admiss[ãa]o/i), false);
  assert.equal(asserts(en, /certification/i, /grants/i), false);
});

test("equality is read as equality, not as a verb", () => {
  const A = /operador|operator/i;
  const B = /implementa[çc][ãa]o|implementation/i;
  assert.equal(assertsEquality("Um operador e uma implementação são a mesma coisa.", A, B), true);
  assert.equal(assertsEquality("An operator and an implementation are the same thing.", A, B), true);
  assert.equal(assertsEquality("Um operador é uma implementação.", A, B), true, "copular identification");
  assert.equal(assertsEquality("Uma implementação é um operador.", A, B), true, "symmetric: either direction");
  assert.equal(assertsEquality("Um operador não é uma implementação.", A, B), false);
  assert.equal(assertsEquality("An operator is not an implementation.", A, B), false);
  assert.equal(
    assertsEquality("Um operador e uma implementação não são a mesma coisa.", A, B),
    false,
    "the denial the corpus actually makes",
  );
});

test("no subject-predicate pair is reported as no assertion, and says so", () => {
  const r = relation("A Camada 2 define a função de certificação.", SUBJ, PRED);
  assert.equal(r.asserted, false);
  assert.match(r.why, /no subject-predicate pair/);
});

// ── §23 — adversarial cross-sentence shapes ──────────────────────────────────────────────────────
//
// Every case here is a way the corpus legitimately writes a denial, or a way a violation can hide next to
// one. They are the shapes that decide whether the matcher reads meaning or coincidence.

test("adversarial: denial and contrast in sequence, in both directions", () => {
  const S = /banzai/i, P = /certifica|certifies/i;
  // Denial first, then a DIFFERENT subject affirmed — the affirmation is real.
  assert.equal(asserts("O BanzAI não certifica. A Camada 2 certifica.", /camada 2/i, P), true);
  // ...and the denied subject stays denied across the same pair of sentences.
  assert.equal(asserts("O BanzAI não certifica. A Camada 2 certifica.", S, P), false);
  // Affirmed first, denial after — the denial does not reach backwards.
  assert.equal(asserts("A Camada 2 certifica. O BanzAI não certifica.", /camada 2/i, P), true);
});

test("adversarial: a parenthetical between subject and predicate does not break the pair", () => {
  assert.equal(asserts("O BanzAI (um agente do protocolo) certifica implementações.", /banzai/i, /certifica/i), true);
  assert.equal(asserts("O BanzAI (um agente do protocolo) não certifica implementações.", /banzai/i, /certifica/i), false);
});

test("adversarial: a list of denials stays a list of denials", () => {
  const t =
    "O protocolo não é um certificador. O BanzAI não certifica. As autoridades de raiz não certificam.";
  for (const s of [/protocolo/i, /banzai/i, /autoridades de raiz/i]) {
    assert.equal(asserts(t, s, /certifica|é um certificador/i), false, `${s} must read as denied`);
  }
});

test("adversarial: a question is not an assertion of its content", () => {
  // The corpus echoes the question before answering it.
  const t = "Um operador e uma implementação são a mesma coisa? Não — são coisas distintas.";
  assert.equal(assertsEquality(t, /operador|operator/i, /implementa[çc][ãa]o|implementation/i), false);
});
