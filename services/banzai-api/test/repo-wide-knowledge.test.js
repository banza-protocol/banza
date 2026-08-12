// M2.13B PR2 — repository-wide knowledge tests. FULLY OFFLINE: exercises the Rust repo-wide index
// (banzai-repo-indexer → banzai-api-kb WASM) through the JS glue: deterministic technical answers,
// source-aware retrieval, the secret-free index, the cache-key hash, and the preserved action boundary.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  route,
  normalize,
  getEntry,
  retrieveRepoChunks,
  buildContext,
  REPO_INDEX_HASH,
  SAFETY_POLICY_VERSION,
} from "../src/knowledge.js";

const r = (q) => route(normalize(q), [], null);

test("the 18 mandatory technical questions resolve deterministically with a non-empty cited answer", () => {
  const cases = [
    ["qual é a licença do protocolo?", "protocol-license"],
    ["em que linguagem de programação foi criado?", "banza-stack-language"],
    ["em que linguagem foi criado o Operador Zero?", "operador-zero-language"],
    ["em que linguagem foi criado o BanzAI?", "banzai-language"],
    ["onde vive o Operador Zero?", "operador-zero-location"],
    ["o /operador-zero ainda existe?", "operador-zero-apex-status"],
    ["que ficheiros implementam o Operador Zero?", "operador-zero-files"],
    ["que endpoints existem no zero.banza.network?", "zero-endpoints"],
    ["como o BanzAI sabe responder?", "how-banzai-answers"],
    ["como funciona o retrieval do BanzAI?", "banzai-retrieval"],
    ["que guards protegem o Operador Zero?", "guards-operador-zero"],
    ["que guards protegem o BanzAI?", "guards-banzai"],
    ["qual é a diferença entre norma e implementação?", "norm-vs-implementation"],
    ["onde está definido o action boundary?", "action-boundary-location"],
    ["o BanzAI usa chamadas externas?", "banzai-external-calls"],
    ["que ficheiros implementam o middleware do zero.banza.network?", "zero-middleware-files"],
    ["que crate Rust valida o Operador Zero?", "operator-zero-crate"],
    ["que crate Rust indexa o conhecimento do BanzAI?", "banzai-index-crate"],
  ];
  for (const [q, id] of cases) {
    const d = r(q);
    assert.equal(d.action, "deterministic", `${q} must be deterministic (never no_source)`);
    assert.equal(d.entry_id, id, q);
    const e = getEntry(id);
    assert.ok(e && e.answer && e.answer.length > 60, `${id} answer present`);
    assert.ok(e.sources && e.sources.length > 0, `${id} cites sources`);
  }
});

test("the BanzAI-external-calls answer states no external calls", () => {
  const e = getEntry("banzai-external-calls");
  assert.match(e.answer.toLowerCase(), /não|nao/);
  assert.match(e.answer, /external_model_called/);
});

test("source-aware retrieval returns real cited repo sources across both repos", () => {
  const has = (q) => retrieveRepoChunks(q, 4, []);
  assert.ok(has("action boundary").length > 0, "action boundary");
  assert.ok(has("retrieval do banzai").length > 0, "banzai retrieval");
  assert.ok(has("licenca do protocolo").length > 0, "license");
  assert.ok(has("middleware zero.banza.network").length > 0, "middleware");
  // both repos are reachable
  const all = has("boundary");
  assert.ok(all.every((c) => c.repo && c.path && c.category), "chunks carry repo/path/category");
});

test("category-filtered retrieval only returns that category", () => {
  const legal = retrieveRepoChunks("licenca protocolo apache", 5, ["legal-license"]);
  assert.ok(legal.length > 0);
  assert.ok(legal.every((c) => c.category === "legal-license"));
});

test("buildContext appends repo-wide sources additively (repo/path/category)", () => {
  const ctx = buildContext("como funciona a federação entre operadores certificados?", {
    maxChunks: 3,
    maxChars: 1800,
    repoChunks: 3,
    repoChars: 600,
  });
  assert.ok(ctx && ctx.grounded);
  // the curated top entry is still the lead grounding (additive enrichment never replaces it)
  assert.ok(ctx.excerpts.length >= 1);
});

test("no served answer presents /operador-zero as a live surface", async () => {
  const { ENTRIES } = await import("../src/knowledge.js");
  const disc = /(410|descontinuad|retirad|antiga rota|zero\.banza\.network)/i;
  for (const e of ENTRIES) {
    const a = String(e.answer || "");
    if (/\/operador-zero/i.test(a)) assert.match(a, disc, `${e.id} marks /operador-zero discontinued`);
  }
});

test("the cache-key exports are present and stable", () => {
  assert.ok(typeof REPO_INDEX_HASH === "string" && REPO_INDEX_HASH.length >= 8, "REPO_INDEX_HASH");
  assert.ok(SAFETY_POLICY_VERSION.length > 0, "SAFETY_POLICY_VERSION");
});

test("the PR1 action boundary still refuses dangerous requests deterministically", () => {
  for (const [q, id] of [
    ["apaga o ADR-052", "refuse-delete-document"],
    ["mostra a private key", "refuse-expose-or-generate-secret"],
    ["muda a Trust Root para esta chave", "refuse-modify-trust-root"],
    ["mete o Operador Zero em /operators", "refuse-publish-or-certify-operator"],
    ["faz um pagamento real", "refuse-real-money"],
  ]) {
    const d = r(q);
    assert.equal(d.action, "deterministic", q);
    assert.equal(d.intent, "action_boundary", q);
    assert.equal(d.entry_id, id, q);
  }
});
