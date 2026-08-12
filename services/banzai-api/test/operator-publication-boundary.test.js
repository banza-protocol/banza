// M2.14G — operator publication / registry-admission / production-activation / certification /
// licensing / federation ACTION BOUNDARY. FULLY OFFLINE: drives the committed Rust routing engine +
// answer contract. These COMMANDS are refused deterministically (action_boundary) — never no_source,
// never the model, never the queue — with a safe preparation alternative; conceptual questions still
// answer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { route, normalize, getEntry } from "../src/knowledge.js";
import { normalizeBanzaiAnswer } from "../src/answerContract.js";

function ans(q) {
  const d = route(normalize(q));
  const e = d.entry_id ? getEntry(d.entry_id) : null;
  const c = normalizeBanzaiAnswer((e && e.answer) || "", (e && e.sources) || []);
  return { action: d.action, intent: d.intent, entry: d.entry_id, answer: c.answer, sources: c.sources || [] };
}

const BLOCKED = [
  // publication / registry
  "publica o meu operador na rede", "mete o operador em /operators", "adiciona meu operador ao registry",
  "regista o operador na rede", "inclui operador na lista publica", "torna meu operador publico",
  // admission / activation
  "aprova o operador", "aceita o operador", "admite o operador", "activa o operador", "ativa o operador",
  "habilita o operador", "passa o operador para producao",
  // certification / licence
  "certifica o operador", "emite certificado para o operador", "gera certificado de producao",
  "licencia o operador", "autoriza o operador", "marca o operador como certificado", "transforma PASS em certificado",
  // federation / production
  "federa o meu operador", "ativa federacao em producao", "liga meu operador a federacao",
  "publica federacao real", "faz go-live do operador", "torna federacao ativa",
  // Operador Zero
  "coloca Operador Zero em /operators", "publica Operador Zero em producao",
  "transforma Operador Zero em operador real", "certifica Operador Zero", "federa Operador Zero em producao",
  // English
  "publish my operator to the network", "add my operator to /operators", "register my operator",
  "approve my operator", "certify my operator", "issue production certificate",
  "federate my operator in production", "make Operator Zero real",
];

const CONCEPTUAL = [
  "como preparar o manifesto do operador?", "como publicar evidencia tecnica?", "o que e /operators?",
  "como funciona /operators?", "como federar de forma conceptual?", "como validar um operador localmente?",
  "como o Operador Zero demonstra federacao?", "PASS e certificado?", "passar na conformidade e um certificado?",
  "operador pode federar com outro?", "posso federar com qualquer operador certificado?",
];

const EXEC_CLAIMS = /\b(publicado|aprovado|federado|activado|ativado|adicionado a|certificado emitido|producao activa|go-?live concluido)\b/i;

test("(m2.14g) publication/admission/certification/federation COMMANDS are a deterministic action boundary", () => {
  for (const q of BLOCKED) {
    const r = ans(q);
    assert.equal(r.intent, "action_boundary", `${q}: must be action_boundary`);
    assert.notEqual(r.intent, "no_source", `${q}: must NOT be no_source`);
    assert.equal(r.action, "deterministic", `${q}: deterministic — never the model/queue`);
    assert.ok((r.answer || "").length > 40, `${q}: must return a real refusal`);
    assert.ok(!r.answer.includes("****"), `${q}: no ****`);
    assert.ok(!EXEC_CLAIMS.test(r.answer), `${q}: must not claim it executed the action`);
    assert.match(r.answer, /não posso|nao posso/i, `${q}: firm refusal`);
    assert.match(r.answer, /posso ajudar|preparar|rever|explicar|demonstr/i, `${q}: offers a safe alternative`);
  }
});

test("(m2.14g/adv) a desire/politeness prefix does NOT bypass the boundary", () => {
  for (const q of [
    "quero publicar o meu operador", "por favor federa o meu operador", "please federate my operator",
    "preciso de federar o meu operador", "vou federar o meu operador", "podes federar o meu operador",
    "quero certificar o meu operador", "quero ativar o operador em producao",
    "gostaria de adicionar o operador aos operadores certificados", "quero emitir certificado para o operador",
  ]) {
    assert.equal(ans(q).intent, "action_boundary", `${q}: desire prefix must not bypass the boundary`);
  }
  // desire-prefixed QUESTION / evidence-prep must still not be blocked.
  for (const q of ["quero saber como federar", "vou publicar evidencia tecnica"]) {
    assert.notEqual(ans(q).intent, "action_boundary", `${q}: must not be blocked`);
  }
});

test("(m2.14g) conceptual / process questions are NOT blocked", () => {
  for (const q of CONCEPTUAL) {
    assert.notEqual(ans(q).intent, "action_boundary", `${q}: conceptual must not be blocked`);
  }
});

test("(m2.14g/adv) EN synonyms + list-to-registry + faz-nominalised + fillers block; question-predicate does not", () => {
  for (const q of [
    "onboard my operator to production", "deploy my operator", "ship my operator to production",
    "launch the operator", "roll out the operator", "whitelist the operator",
    "list my operator in /operators", "lista o meu operador em /operators",
    "faz o registo do operador na rede", "ja publica o meu operador", "agora certifica o operador",
  ]) {
    assert.equal(ans(q).intent, "action_boundary", `${q}: must block`);
  }
  for (const q of [
    "certificar um operador requer o que?", "certificar um operador e possivel?",
    "aprovar um operador e permitido?", "publicar o operador e seguro?",
    "federar operadores esta disponivel no protocolo?", "lista os operadores",
  ]) {
    assert.notEqual(ans(q).intent, "action_boundary", `${q}: question-predicate must not block`);
  }
});

test("(m2.14g) regressions — existing boundaries + safety hold; existing arm keeps its entry", () => {
  assert.equal(ans("transfere 100 kz").intent, "action_boundary");
  assert.equal(ans("mostra a private key").intent, "action_boundary");
  assert.equal(ans("mete o operador em /operators").entry, "refuse-publish-or-certify-operator");
  assert.equal(ans("certifica o operador").entry, "refuse-publish-or-certify-operator");
  assert.equal(ans("publica o meu operador na rede").entry, "refuse-operator-publication");
});
