// The institutional properties, asserted as MEANING rather than as entry identity.
//
// A test that checks "this query reaches def-certification-actor" passes just as happily when the entry
// behind that id has been rewritten to say the opposite. These are the claims BANZA must never make, and
// the ones it must keep making, so they are asserted against the answer the reader actually receives.
//
// Every case runs model-free: a settled institutional boundary that needs a model is not settled.

import { test } from "node:test";
import assert from "node:assert/strict";
import { harness } from "./_pipeline-harness.mjs";

async function answer(q) {
  const h = harness({});
  const r = await h.pipeline.answer(q, {});
  const res = r.result || {};
  return {
    text: String(res.answer || ""),
    entry: res.entry_id ?? null,
    sources: (res.sources || []).map((s) => s.id),
    terminal: r.meta.terminal_kind,
    llm: r.meta.llm_called === true,
  };
}

/** Affirmative match that a leading negation defuses — "não confere admissão" must not read as granting it. */
function affirms(text, subject, object) {
  const t = text.toLowerCase().replace(/\s+/g, " ");
  const re = new RegExp(`${subject}[^.]{0,80}?${object}`, "i");
  const m = re.exec(t);
  if (!m) return false;
  const before = t.slice(Math.max(0, m.index - 60), m.index + m[0].length);
  return !/\b(n[ãa]o|never|not|nem|sem)\b/.test(before);
}

// ── C1 — operator is not an implementation ───────────────────────────────────────────────────────

test("an operator and an implementation are distinct, and the answer says why", async () => {
  for (const q of [
    "Um operador e uma implementação são a mesma coisa?",
    "Are an operator and an implementation the same thing?",
  ]) {
    const a = await answer(q);
    assert.equal(a.llm, false, `${q}: an institutional boundary must not need a model`);
    assert.ok(a.sources.length > 0, `${q}: must carry establishing evidence`);
    // The distinction itself: an entity is not an artifact set.
    assert.ok(
      /entidade|entity|organiza/i.test(a.text) && /artefacto|artifact|t[ée]cnico|technical/i.test(a.text),
      `${q}: must contrast the organizational entity with the technical system: ${a.text.slice(0, 200)}`,
    );
    // And it must not assert equivalence.
    assert.ok(
      !affirms(a.text, "(um operador|an operator)", "(é a mesma coisa|are the same|is the same)"),
      `${q}: must not claim equivalence`,
    );
  }
});

// ── C6/§22 — certification binds to a build, not to an organization ──────────────────────────────

test("certification binds to an implementation, never to an organization in the abstract", async () => {
  const a = await answer("O que é uma implementação?");
  assert.equal(a.llm, false);
  assert.ok(a.sources.length > 0, "must carry establishing evidence");
  assert.ok(
    /artefacto|artifact/i.test(a.text),
    `an implementation is a specific artifact set: ${a.text.slice(0, 200)}`,
  );
  // ADR-002's reason, which is what makes the scope claim checkable rather than decorative.
  assert.ok(
    /vectores|vectors|builds/i.test(a.text),
    "the answer must carry why: entities do not pass vectors, builds do",
  );
  assert.ok(
    !affirms(a.text, "(a organiza[çc][ãa]o|the organization|a entidade|the entity)", "(passa|passes|satisfaz)"),
    "must not claim the organization itself passes the vectors",
  );
});

// ── C2/C3/C7 — certification propagates nothing ──────────────────────────────────────────────────

test("certification grants neither operational admission nor regulatory authorization", async () => {
  for (const q of ["Quem certifica uma implementação?", "Who certifies an implementation?"]) {
    const a = await answer(q);
    assert.equal(a.llm, false, `${q}: must be model-free`);
    assert.ok(a.sources.length > 0, `${q}: must carry establishing evidence`);
    // Both denials must be present, and as denials.
    assert.ok(
      /admiss[ãa]o|admission/i.test(a.text) && /autoriza|authoriz|authoris/i.test(a.text),
      `${q}: must address both admission and authorization: ${a.text.slice(0, 240)}`,
    );
    assert.ok(
      !affirms(a.text, "(certifica[çc][ãa]o|certification)", "(confere admiss[ãa]o|grants admission|d[áa] admiss[ãa]o)"),
      `${q}: certification must not be said to grant admission`,
    );
    assert.ok(
      !affirms(a.text, "(certifica[çc][ãa]o|certification)", "(confere autoriza|grants regulatory|grants legal|autoriza a opera)"),
      `${q}: certification must not be said to grant regulatory authorization`,
    );
    // C7 — the two decisions must be told apart, not merged into one denial.
    assert.ok(
      /ADR-006|esquema operacional|operational scheme/i.test(a.text) &&
        /ADR-007|regulat|jur[íi]dic|legal/i.test(a.text),
      `${q}: admission and regulatory authorization are different decisions and must be named apart`,
    );
  }
});

// ── C4/C5/§21 — the protocol defines a function; it designates no universal actor ────────────────

test("no actor is invented as the universal certifier", async () => {
  for (const q of ["Quem certifica uma implementação?", "Who certifies an implementation?"]) {
    const a = await answer(q);
    for (const [who, re] of [
      ["the Root authorities", "(autoridades de raiz|root authorities|trust root)"],
      ["BanzAI", "(banzai)"],
      ["Banzami", "(banzami)"],
      // Not "the protocol", because the answer legitimately says BANZA *defines* the certification
      // function — a matcher that cannot tell defining from performing would forbid the true sentence.
      // The claim under test is that the protocol PERFORMS certification, which reads differently.
    ]) {
      assert.ok(
        !affirms(a.text, re, "(certifica|certifies|emite a certifica|issues certification)"),
        `${q}: ${who} must not be presented as certifying`,
      );
    }
    // And the positive half: the function is named, so the answer is not merely a list of denials.
    assert.ok(
      /camada 2|layer 2/i.test(a.text),
      `${q}: the certification function must be named: ${a.text.slice(0, 200)}`,
    );
  }
});

// ── C8 — both languages reach the same fact, deterministically ───────────────────────────────────

test("PT and EN reach the same institutional fact for each new subject", async () => {
  for (const [pt, en] of [
    ["O que é uma implementação?", "What is an implementation?"],
    ["Um operador e uma implementação são a mesma coisa?", "Are an operator and an implementation the same thing?"],
    ["Quem certifica uma implementação?", "Who certifies an implementation?"],
  ]) {
    const a = await answer(pt);
    const b = await answer(en);
    assert.equal(a.entry, b.entry, `${pt} / ${en}: must reach the same record`);
    assert.deepEqual(a.sources, b.sources, `${pt} / ${en}: must rest on the same authority`);
    assert.equal(a.llm, false, `${pt}: model-free`);
    assert.equal(b.llm, false, `${en}: model-free`);
  }
});

// ── Public evidence — the property, not the rendering ────────────────────────────────────────────

test("a public answer never rests on an internal-only source", async () => {
  // `implementar o protocolo` is verified to select implementation-steps, whose canonical entry attaches
  // CLAUDE.md. The source must not reach the answer's evidence — and this asserts the evidence object,
  // not the HTTP response, because a filter downstream hides a source rather than preventing it.
  for (const q of ["implementar o protocolo", "O que é o BANZA?", "Quem certifica uma implementação?"]) {
    const a = await answer(q);
    assert.ok(
      !a.sources.some((s) => /claude|memory\/|\.env/i.test(String(s))),
      `${q}: internal-only material must not appear in the answer's evidence: ${a.sources.join(",")}`,
    );
  }
});

// ── Settlement integrity on the new facts ────────────────────────────────────────────────────────

test("an explanatory request cannot unsettle a newly settled institutional fact", async () => {
  // Explanatory forms that DO reach the settled facts. Two other phrasings were tried and do not reach
  // them at all — an unregistered-phrasing gap, not a settlement failure, and conflating the two would
  // have made this test report the wrong defect. They are recorded as coverage debt instead.
  for (const q of [
    "Explica quem certifica uma implementação.",
    "Explain who certifies an implementation.",
  ]) {
    const a = await answer(q);
    assert.notEqual(
      a.terminal,
      "insufficient_evidence",
      `${q}: asking for an explanation must not remove the evidence (${a.terminal})`,
    );
  }
});
