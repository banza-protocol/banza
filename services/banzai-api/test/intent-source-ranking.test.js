// M2.13C-A — intent disambiguation + source-ranking tests. FULLY OFFLINE: drives the committed Rust
// routing/classification engine (via knowledge.js) over the shared FAMILIES matrix and asserts that
// ambiguous protocol terms are split by intent, resolved with the right source class, and — for the
// licence family — that software licence is never confused with financial authorisation. No model,
// no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  route,
  normalize,
  getEntry,
  classifyQueryIntent,
  intentSourceRanking,
  rankedRepoChunks,
} from "../src/knowledge.js";
import { FAMILIES } from "../eval/answer-quality-matrix.mjs";

const deaccent = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function classify(q) {
  const d = route(normalize(q));
  if (d.action === "deterministic") {
    const e = d.entry_id ? getEntry(d.entry_id) : null;
    return { kind: e ? "det" : "detmiss", entry: d.entry_id, answer: e && e.answer, sources: e && e.sources };
  }
  if (d.action === "qwen") return { kind: "grounded", entry: d.entry_id };
  if (d.action === "refusal") return { kind: "refusal" };
  return { kind: "no_source" };
}

test("every family question classifies to its intent family", () => {
  for (const f of FAMILIES) {
    for (const q of f.questions) {
      assert.equal(classifyQueryIntent(q), f.intent, `${f.name} :: ${q}`);
    }
  }
});

test("the licence family is split: software licence never resolves to financial authorisation and vice-versa", () => {
  const sw = FAMILIES.find((f) => f.name === "software_license");
  const fin = FAMILIES.find((f) => f.name === "financial_authorization");
  for (const q of sw.questions) {
    assert.equal(classify(q).entry, "protocol-license", `software :: ${q}`);
  }
  for (const q of fin.questions) {
    assert.equal(classify(q).entry, "financial-authorization", `financial :: ${q}`);
  }
});

test("families with a fixed entry resolve to exactly that deterministic entry", () => {
  for (const f of FAMILIES.filter((f) => f.entry)) {
    for (const q of f.questions) {
      const c = classify(q);
      assert.equal(c.kind, "det", `${f.name} not deterministic :: ${q}`);
      assert.equal(c.entry, f.entry, `${f.name} :: ${q}`);
    }
  }
});

test("boundary-safe families never fall into no_source", () => {
  for (const f of FAMILIES.filter((f) => f.boundarySafe)) {
    for (const q of f.questions) {
      assert.notEqual(classify(q).kind, "no_source", `${f.name} :: ${q}`);
    }
  }
});

test("the software-licence answer distinguishes software from financial and cites a licence source", () => {
  const sw = FAMILIES.find((f) => f.name === "software_license");
  for (const q of sw.questions) {
    const c = classify(q);
    if (c.kind !== "det") continue;
    const a = deaccent(c.answer);
    for (const inc of sw.answerIncludes) assert.ok(a.includes(inc), `${q}: answer missing "${inc}"`);
    const cited = (c.sources || []).map((s) => s.id + " " + s.path).join(" ");
    assert.match(cited, /LICENSE|NOTICE|licenc/i, `${q}: not a licence source`);
  }
});

test("the financial-authorisation answer states BANZA does not license and Apache is not financial", () => {
  const fin = FAMILIES.find((f) => f.name === "financial_authorization");
  for (const q of fin.questions) {
    const c = classify(q);
    if (c.kind !== "det") continue;
    const a = deaccent(c.answer);
    for (const inc of fin.answerIncludes) assert.ok(a.includes(inc), `${q}: answer missing "${inc}"`);
  }
});

test("no route-state answer presents /operador-zero as a live surface", () => {
  const rs = FAMILIES.find((f) => f.name === "route_state");
  for (const q of rs.questions) {
    const c = classify(q);
    if (c.kind === "det" && /\/operador-zero/i.test(c.answer)) {
      assert.match(c.answer, /(410|descontinuad|zero\.banza\.network)/i, q);
    }
  }
});

test("source ranking picks a category within the family's primary set for each question", () => {
  for (const f of FAMILIES.filter((f) => f.primary)) {
    for (const q of f.questions) {
      const top = rankedRepoChunks(q, 1)[0];
      if (!top) continue; // enrichment is additive — a family need not always hit a chunk
      assert.ok(f.primary.includes(top.category), `${f.name}: ${q} → ${top.category} not in [${f.primary}]`);
    }
  }
});

test("intentSourceRanking returns a coherent { intent, primary, penalize } shape", () => {
  const r = intentSourceRanking("que licença usa o BANZA?");
  assert.equal(r.intent, "software_license_query");
  assert.ok(Array.isArray(r.primary) && r.primary.includes("legal-license"));
  assert.ok(Array.isArray(r.penalize));
});
