// M2.14A — Operador Zero realistic-journey / status / approval-vs-validation Q&A. FULLY OFFLINE:
// drives the committed Rust routing engine (via knowledge.js). Asserts that BanzAI answers the
// status/approval/journey questions deterministically with the correct terminology (avaliado como
// implementação de referência só de leitura, NOT aprovado; a evidência técnica local não certifica;
// não aparece em /operators como operador real; estado em zero.banza.network) and that the dangerous
// imperative still refuses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { route, normalize, getEntry } from "../src/knowledge.js";

const deaccent = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
function ans(q) {
  const d = route(normalize(q));
  const e = d.entry_id ? getEntry(d.entry_id) : null;
  return { action: d.action, intent: d.intent, entry: d.entry_id, answer: e && e.answer, sources: e && e.sources };
}

test("(21) approval question is corrected to demo validation — never 'aprovado' as a state", () => {
  for (const q of ["o Operador Zero está aprovado?", "o Operador Zero foi aprovado?"]) {
    const c = ans(q);
    assert.equal(c.action, "deterministic", q);
    assert.equal(c.entry, "operador-zero-approval-vs-validation", q);
    const a = deaccent(c.answer);
    assert.ok(a.includes("avaliado como implementacao de referencia so de leitura"), `${q}: must say 'avaliado como implementação de referência só de leitura'`);
    assert.ok(a.includes("nao"), `${q}: must correct with a negation`);
    // never asserts approval/certification as a positive state
    assert.ok(!/\baprovado\b(?![^.]*nao)/.test(a) || a.includes("nao se usa"), q);
  }
});

test("(21) 'foi validado?' answers 'avaliado como implementação de referência só de leitura' with evidência técnica local", () => {
  const c = ans("o Operador Zero foi validado?");
  assert.equal(c.entry, "operador-zero-approval-vs-validation");
  const a = deaccent(c.answer);
  assert.ok(a.includes("avaliado como implementacao de referencia so de leitura"));
  assert.ok(a.includes("evidencia tecnica local"));
  assert.ok(a.includes("so de leitura"));
  assert.ok(a.includes("nao aprovacao") || a.includes("nao certifica") || a.includes("certificacao"));
});

test("(23) '/operators?' says the demo operator never appears there as a real operator", () => {
  const c = ans("o Operador Zero aparece em /operators?");
  assert.equal(c.action, "deterministic");
  assert.equal(c.entry, "operador-zero-in-operators");
  const a = deaccent(c.answer);
  assert.ok(a.startsWith("**nao"), "must open with a clear No");
  assert.ok(a.includes("/operators"));
  assert.ok(a.includes("nunca aparece") && a.includes("operador real"));
});

test("status question points to zero.banza.network with demo markers", () => {
  const c = ans("onde vejo o estado do Operador Zero?");
  assert.equal(c.entry, "operador-zero-status-where");
  const a = deaccent(c.answer);
  assert.ok(a.includes("zero.banza.network"));
  assert.ok(a.includes("avaliado como implementacao de referencia so de leitura"));
  assert.ok(a.includes("kz_demo") && a.includes("real_money") && a.includes("certification"));
});

test("journey question explains step-by-step and why not all-at-once", () => {
  for (const q of ["como uso o Operador Zero no BanzAI?", "por que não carrega tudo de uma vez?"]) {
    const c = ans(q);
    assert.equal(c.entry, "operador-zero-banzai-journey", q);
    const a = deaccent(c.answer);
    assert.ok(a.includes("etapa por etapa") || a.includes("etapa a etapa"), q);
    assert.ok(a.includes("manifest") && a.includes("conformidade"), q);
    assert.ok(a.includes("nao se carrega tudo") || a.includes("nao carrega tudo"), q);
  }
});

test("PASS-demo-certifies question stays with pass-is-not-certificate (not stolen by the approval arm)", () => {
  const c = ans("o PASS demo certifica?");
  assert.equal(c.entry, "pass-is-not-certificate");
});

test("the dangerous imperative (put Operador Zero into /operators) still refuses", () => {
  const c = ans("mete o Operador Zero em /operators");
  assert.equal(c.intent, "action_boundary");
});

test("no M2.14A answer presents /operador-zero as a live surface", () => {
  for (const id of [
    "operador-zero-approval-vs-validation",
    "operador-zero-in-operators",
    "operador-zero-status-where",
    "operador-zero-banzai-journey",
  ]) {
    const e = getEntry(id);
    assert.ok(e, id);
    assert.ok(!/\/operador-zero(?![.\w])/.test(e.answer), `${id} must not point at the retired apex`);
  }
});
