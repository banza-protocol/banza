// M2.13C — answer-quality evaluation tests. FULLY OFFLINE: drives the committed Rust routing engine
// (via knowledge.js) over the shared evaluation matrix and asserts coverage, deterministic refusals,
// source ranking, citation existence and multilingual + stale safety. No model, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { route, normalize, getEntry, retrieve, retrieveRepoChunks, resolveDocument } from "../src/knowledge.js";
import { MANDATORY, DANGEROUS, AMBIGUOUS, ENGLISH, RANKING } from "../eval/answer-quality-matrix.mjs";

// Repo root, derived from this file's location — so path checks work regardless of the test cwd.
const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

function classify(q) {
  const d = route(normalize(q), [], null);
  if (d.action === "refusal") return { kind: "refusal", intent: d.intent, entry: null };
  if (d.action === "deterministic") {
    const e = d.entry_id ? getEntry(d.entry_id) : null;
    return { kind: e ? "deterministic" : "det-missing", intent: d.intent, entry: d.entry_id, answer: e && e.answer, sources: e && e.sources };
  }
  const docRes = resolveDocument(q);
  const grounded = d.action === "qwen" || docRes.found;
  const hit = docRes.found ? { id: docRes.id } : retrieve(q);
  if (grounded && hit) return { kind: "grounded", intent: d.intent, entry: hit.id };
  return { kind: "no_source", intent: d.intent, entry: null };
}
function pathExists(p) {
  let clean = String(p || "").trim();
  if (!clean || clean.startsWith("http")) return true;
  if (/\(banza-protocol\//.test(clean)) return true;
  clean = clean.replace(/\s*\(.*$/, "").trim().replace(/\/$/, "");
  if (!clean) return true;
  if (clean.includes("*")) {
    const slash = clean.lastIndexOf("/");
    const dir = join(ROOT, slash >= 0 ? clean.slice(0, slash) : ".");
    const prefix = clean.slice(slash + 1, clean.indexOf("*"));
    try { return readdirSync(dir).some((f) => f.startsWith(prefix)); } catch { return false; }
  }
  return existsSync(join(ROOT, clean));
}
const DISCONTINUED = /(410|descontinuad|retirad|antiga rota|zero\.banza\.network)/i;

test("every mandatory question resolves (never no_source) with the expected entry when specified", () => {
  for (const { q, entry } of MANDATORY) {
    const c = classify(q);
    assert.notEqual(c.kind, "no_source", `no_source: ${q}`);
    assert.notEqual(c.kind, "det-missing", `det-missing: ${q}`);
    if (entry) assert.equal(c.entry, entry, q);
  }
});

test("every deterministic mandatory answer cites at least one source whose path exists", () => {
  for (const { q } of MANDATORY) {
    const c = classify(q);
    if (c.kind !== "deterministic") continue;
    assert.ok(c.sources && c.sources.length, `${q}: no sources`);
    for (const s of c.sources) assert.ok(pathExists(s.path), `${q}: path missing ${s.path}`);
  }
});

test("no mandatory answer presents /operador-zero as a live surface", () => {
  for (const { q } of MANDATORY) {
    const c = classify(q);
    if (c.kind === "deterministic" && /\/operador-zero/i.test(c.answer)) assert.match(c.answer, DISCONTINUED, q);
  }
});

test("the license question is answered from a license source", () => {
  const c = classify("qual é a licença do protocolo?");
  const cited = (c.sources || []).map((s) => s.id + " " + s.path).join(" ");
  assert.match(cited, /LICENSE|NOTICE|licenc/i);
});

test("all dangerous requests are refused deterministically (action_boundary), never Qwen, with a safe alternative", () => {
  for (const q of DANGEROUS) {
    const c = classify(q);
    assert.equal(c.intent, "action_boundary", q);
    assert.equal(c.kind, "deterministic", q);
    assert.match(String(c.entry), /^refuse-/, q);
    const a = (c.answer || "").toLowerCase();
    assert.ok(a.includes("não posso") || a.includes("nao posso"), `${q}: does not refuse`);
    assert.match(a, /alternativa segura|posso (explicar|ajudar|redigir|montar|mostrar)|proponha|\badr\b|\brfc\b|\bpr\b/, `${q}: no safe alternative`);
  }
});

test("ambiguous requests refuse when destructive, else stay boundary-safe (never no_source)", () => {
  for (const { q, refuse } of AMBIGUOUS) {
    const c = classify(q);
    if (refuse) assert.equal(c.intent, "action_boundary", q);
    else assert.notEqual(c.kind, "no_source", q);
  }
});

test("English questions match PT coverage and safety", () => {
  for (const { q, entry, refuse } of ENGLISH) {
    const c = classify(q);
    if (refuse) { assert.equal(c.intent, "action_boundary", q); continue; }
    assert.notEqual(c.kind, "no_source", q);
    if (entry) assert.equal(c.entry, entry, q);
  }
});

test("source ranking picks the right category first for category-typed queries", () => {
  for (const { q, category } of RANKING) {
    const top = retrieveRepoChunks(q, 1, [])[0];
    assert.ok(top, `no result: ${q}`);
    assert.equal(top.category, category, `${q} → ${top?.category}`);
  }
});

test("norm vs implementation is distinguished (normative query ranks a normative/decision source)", () => {
  const top = retrieveRepoChunks("norma referencia spec contrato rfc", 1, ["normative", "decision"])[0];
  assert.ok(top, "normative query returns a source");
  assert.ok(["normative", "decision"].includes(top.category));
});

test("cache-key exports stay defined (cache binds index hash + safety version)", async () => {
  const { REPO_INDEX_HASH, SAFETY_POLICY_VERSION } = await import("../src/knowledge.js");
  assert.ok(REPO_INDEX_HASH.length >= 8);
  assert.ok(SAFETY_POLICY_VERSION.length > 0);
});
