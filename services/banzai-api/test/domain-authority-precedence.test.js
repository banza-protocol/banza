// A DOMAIN source may support a DOMAIN claim, and never a BANZA-specific one.
//
// The domain layer was added after the BANZA arms, and ordering alone is not a property — it is an
// implementation detail that a later refactor can reverse without anyone noticing. What must hold is
// that BANZA authority owns BANZA claims even where a perfectly good general definition of the same
// word exists, and that the general definition is still reachable when the general question is asked.
//
// Three cases, and they are genuinely different:
//   * a word BANZA defines, asked generally  → BANZA authority (the protocol's meaning is the answer)
//   * a word BANZA defines, asked about BANZA → BANZA authority
//   * a word BANZA does not define            → DOMAIN authority, with its public publisher cited
//
// `idempotência` and `assinatura digital` are the sharp cases: both have a declared domain concept AND
// a BANZA meaning, so they are where a precedence inversion would first show.

import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./_pipeline-harness.mjs";
import { canaryProvider } from "./_production-canary.mjs";
import { ENTRIES } from "../src/knowledge.js";

const byId = new Map(ENTRIES.map((e) => [e.id, e]));

async function ask(q, locale = "pt-PT") {
  const c = canaryProvider("MODEL PROSE");
  const h = harness({ provider: c.provider });
  const r = await h.pipeline.answer(q, { locale });
  const res = r.result || {};
  const entry = byId.get(res.entry_id);
  return {
    id: res.entry_id,
    isDomain: Boolean(entry && entry.domain),
    answer: String(res.answer || ""),
    sourceClasses: [...new Set((res.sources || []).map((s) => s.class || "banza"))],
    sourceIds: (res.sources || []).map((s) => s.id),
    llm: (r.meta || {}).llm_called,
  };
}

// HOW THIS WAS MUTATION-PROVED, because the first attempt was vacuous.
//
// Reordering the domain arm above the BANZA arms changed nothing and killed no test — the declared
// domain concepts are exactly the ones BANZA does NOT define, so nothing competed for `idempotência`
// or `ledger` and there was no precedence to invert. A test that cannot fail is not a test.
//
// The proof therefore needs a competitor. Injecting `def-dom-idempotency-generic` and
// `def-dom-ledger-generic` into the generated alias table and rebuilding the WASM:
//
//   competitor present, ordering intact   → `def-idempotency`, `def-ledger`   (BANZA wins)  GREEN
//   competitor present, ordering inverted → the domain concept                              RED
//   restored                                                                                GREEN
//
// So the property is real and this file observes it. What it cannot do on its own is manufacture the
// collision; that is what the injection is for, and it is recorded here rather than left implicit.

test("a term BANZA defines is answered from BANZA authority, not from the domain layer", async () => {
  // Idempotency has a declared domain concept and a BANZA invariant. BANZA wins.
  for (const [q, loc] of [["o que e idempotencia", "pt-PT"], ["what is idempotency", "en"]]) {
    const r = await ask(q, loc);
    assert.equal(r.id, "def-idempotency", `${q}: must reach the BANZA entry`);
    assert.equal(r.isDomain, false, `${q}: must not be answered from the domain layer`);
    assert.ok(!r.sourceClasses.includes("domain"), `${q}: a BANZA claim must not rest on a domain source`);
  }
});

test("a BANZA-specific question about a domain word stays on BANZA authority", async () => {
  for (const [q, loc] of [
    ["o banza exige um ledger", "pt-PT"],
    ["does banza require a ledger", "en"],
    ["qual o ambito da idempotencia no banza", "pt-PT"],
  ]) {
    const r = await ask(q, loc);
    assert.equal(r.isDomain, false, `${q}: a BANZA claim must not be answered from the domain layer`);
    assert.ok(
      !r.sourceClasses.includes("domain"),
      `${q}: BANZA-specific claim rested on a domain source (${r.sourceIds.join(",")})`,
    );
  }
});

test("a term BANZA does not define reaches the domain layer, with its publisher cited", async () => {
  for (const [q, loc, want] of [
    ["o que e um nonce", "pt-PT", "def-dom-nonce"],
    ["what is a nonce", "en", "def-dom-nonce"],
    ["o que e um hash", "pt-PT", "def-dom-hash"],
    ["what is a state machine", "en", "def-dom-state-machine"],
  ]) {
    const r = await ask(q, loc);
    assert.equal(r.id, want, `${q}: must reach the declared domain concept`);
    assert.equal(r.isDomain, true, `${q}: must be answered from the domain layer`);
    assert.deepEqual(r.sourceClasses, ["domain"], `${q}: must cite a domain authority`);
    assert.ok(r.sourceIds.length > 0, `${q}: a domain answer served with no source is not sourced`);
  }
});

test("every declared domain source names a publisher and an https authority", async () => {
  // The citability rule is a DECLARATION, so the declaration has to be real. A domain source with no
  // publisher or a non-https URL would be silently uncitable, and its answer would go out unsourced —
  // which is exactly how `def-dom-hash` was serving NIST-CSRC before the policy read the class.
  const { SOURCES } = await import("../src/knowledge.js");
  const domain = Object.values(SOURCES).filter((x) => x && x.class === "domain");
  assert.ok(domain.length >= 8, "expected the declared domain authorities, saw " + domain.length);
  for (const x of domain) {
    assert.ok(String(x.publisher || "").trim(), x.id + ": no publisher named");
    assert.ok(String(x.authority || "").trim(), x.id + ": no authority classification");
    assert.match(String(x.url || ""), /^https:\/\//, x.id + ": authority must be reachable over https");
  }
});

test("a domain answer is never served without a citable source", async () => {
  // The defect this closes: the public-source filter required a repo path, domain authorities have
  // none, and the citation was dropped — so `def-dom-hash` went out with `sources: []` while
  // `def-dom-serialization` kept its own purely because RFC-8259 matches the ADR/RFC id shape. A
  // citation that survives by coincidence of naming is not a citation.
  const { ENTRIES: E } = await import("../src/knowledge.js");
  const { isPublicSource } = await import("../src/answerContract.js");
  const unsourced = [];
  for (const e of E) {
    if (!e.domain) continue;
    if (!(e.sources || []).some((x) => isPublicSource(x))) unsourced.push(e.id);
  }
  assert.deepEqual(unsourced, [], "domain entries with no citable source: " + unsourced.join(", "));
});
