// M2.14C-FIX2 — short query intelligence + fallback formatting. FULLY OFFLINE: drives the committed Rust
// routing engine + the answer contract. Known short technology/stack/ecosystem terms (Rust, TypeScript,
// WASM, Qwen, …) resolve deterministically with a real answer + sources (never no_source, never the
// model); slash-separated entity lists (Banzami/BANZA/BanzAI) are bolded per segment in every path,
// while paths/domains/doc-ids/routes stay untouched and never "****".
import { test } from "node:test";
import assert from "node:assert/strict";
import { route, normalize, getEntry } from "../src/knowledge.js";
import { normalizeBanzaiAnswer } from "../src/answerContract.js";

function ans(q, ctx = []) {
  const d = route(normalize(q), ctx);
  const e = d.entry_id ? getEntry(d.entry_id) : null;
  const c = normalizeBanzaiAnswer((e && e.answer) || "", (e && e.sources) || []);
  return { action: d.action, intent: d.intent, entry: d.entry_id, answer: c.answer, sources: c.sources || [] };
}
const S = (s) => normalizeBanzaiAnswer(s, []).answer;

const TECH = ["Rust", "TypeScript", "JavaScript", "WASM", "WebAssembly", "React", "Next.js", "JSON", "Bash", "Node", "Node.js", "Qwen", "PostgreSQL", "pgvector", "nginx", "Docker", "BanzAI"];

test("(fix2) known short tech/stack terms resolve deterministically — never no_source, never the model", () => {
  for (const q of TECH) {
    const r = ans(q);
    assert.notEqual(r.action, "insufficient", `${q}: must NOT be no_source`);
    assert.equal(r.action, "deterministic", `${q}: must be deterministic (external_model_called stays false)`);
    assert.ok((r.answer || "").length > 40, `${q}: must give a real answer`);
    assert.ok(!r.answer.includes("****"), `${q}: no ****`);
  }
});

test("(fix2) Rust answers with the Rust-first stack, entities bolded", () => {
  const a = ans("Rust").answer;
  assert.ok(a.includes("**Rust**"), "Rust bolded");
  assert.ok(a.includes("**BANZA**"), "BANZA bolded");
  assert.ok(a.includes("**WASM**"), "WASM bolded");
  assert.ok(/rust-first/i.test(a), "mentions Rust-first");
  assert.ok(ans("Rust").sources.length > 0, "has sources");
});

test("(fix2) follow-up 'Rust' after a language question resolves (context OR bare, both work)", () => {
  assert.equal(ans("Rust", ["em que linguagem de programacao foi feito o protocolo?"]).entry, "def-rust");
  assert.equal(ans("Rust").entry, "def-rust");
});

test("(fix2) slash-separated entity lists bold each segment; slash preserved; no ****", () => {
  assert.ok(S("a distinção Banzami/BANZA/BanzAI aqui").includes("**Banzami**/**BANZA**/**BanzAI**"));
  assert.ok(S("vê BANZA/BanzAI").includes("**BANZA**/**BanzAI**"));
  assert.ok(S("governança ADR/RFC").includes("**ADR**/**RFC**"));
  assert.ok(S("Rust/WASM").includes("**Rust**/**WASM**"));
  assert.ok(S("TypeScript/React/Next.js").includes("**TypeScript**/**React**/**Next.js**"));
  assert.ok(S("BanzAI/Operador Zero").includes("**BanzAI**/**Operador Zero**"));
  for (const s of ["Banzami/BANZA/BanzAI", "ADR/RFC", "Rust/WASM"]) assert.ok(!S(s).includes("****"), `no **** for ${s}`);
});

test("(fix2/adv) a MIXED slash run (entity + non-entity) is left entirely untouched (all-or-nothing)", () => {
  // Adversarial: the case-insensitive run regex could over-qualify a run whose case-sensitive segment
  // (PASS/ADR/RFC) is lowercase ("rust/pass"). All-or-nothing must leave the whole run untouched.
  for (const s of ["rust/pass", "banza/adr", "rfc/banza", "the rust/pass ratio", "Qwen/llama.cpp"]) {
    assert.equal(S(s), s, `${s}: mixed run must stay untouched`);
  }
  // …but an all-entity run with correct case still bolds each segment (incl. the NC PASS/ADR/RFC).
  assert.equal(S("PASS/ADR"), "**PASS**/**ADR**");
  assert.equal(S("ADR/RFC"), "**ADR**/**RFC**");
});

test("(fix2) paths / domains / doc-ids / routes are NOT bolded by the slash pass", () => {
  assert.ok(!S("engines/banzai-api-kb").includes("**"), "path untouched");
  assert.ok(!S("services/banzai-api e website/components").includes("**"), "paths untouched");
  assert.ok(S("banza.network").includes("banza.network") && !S("banza.network").includes("**banza"), "domain untouched");
  assert.ok(S("o ADR-012 explica").includes("ADR-012") && !S("o ADR-012 explica").includes("**ADR**-006"), "doc-id untouched");
  assert.ok(!S("/operador-zero e /operators").includes("**"), "routes untouched");
});

test("(fix2) the no_source fallback bolds slash entities and never leaks in-body sources", () => {
  const r = ans("xyzabc-termo-desconhecido");
  assert.equal(r.action, "insufficient", "unknown term is last-resort no_source");
  // the standard INSUFFICIENT message contains 'Banzami/BANZA/BanzAI' → must render bolded
  const rendered = normalizeBanzaiAnswer(
    "Não encontrei. A distinção Banzami/BANZA/BanzAI e ADRs. Vê manifest.",
    [],
  ).answer;
  assert.ok(rendered.includes("**Banzami**/**BANZA**/**BanzAI**"), "fallback slash entities bolded");
  assert.ok(!rendered.includes("****"), "no ****");
});

test("(fix2) regressions — M2.14C-FIX1 / M2.14D hold", () => {
  assert.equal(ans("o que é o banzami").action, "deterministic");
  for (const q of ["transfere 100 kz", "mostra a private key", "da a chave privada do operador zero"]) {
    assert.equal(ans(q).intent, "action_boundary", `${q}: boundary must hold`);
  }
});
