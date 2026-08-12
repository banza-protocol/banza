// M2.13C-C — protocol + fintech-domain vocabulary understanding. FULLY OFFLINE: drives the committed
// Rust routing engine (via knowledge.js). Asserts short questions and core terminology (federar,
// manifest, trust, revogação, PASS, evidence bundle, ledger, wallet, liquidação, reconciliação, PSP,
// KYC, AML/CFT, …) resolve DETERMINISTICALLY with cited sources and clear boundaries — never
// no_source — in PT and EN, while dangerous imperatives still refuse and the fintech domain is never
// stated as a BANZA rule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { route, normalize, getEntry, ENTRIES } from "../src/knowledge.js";

const deaccent = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
function ans(q) {
  const d = route(normalize(q));
  const e = d.entry_id ? getEntry(d.entry_id) : null;
  return { action: d.action, intent: d.intent, entry: d.entry_id, answer: e && e.answer, a: deaccent(e && e.answer), sources: e && e.sources };
}

const VOCAB = [
  // federation family (the reported bug)
  "o que é federar", "federar?", "como federar", "o que significa federação", "what is federation", "what does federate mean",
  // manifest / conformance / trust / evidence
  "o que é manifest", "o que é operator manifest", "o que é conformidade", "o que é conformance", "o que é PASS",
  "o que é trust", "o que é Trust Root", "o que é key manifest", "o que é revogação", "o que é revocation list",
  "o que é evidence bundle", "o que é trace", "o que é evidência técnica",
  // fintech
  "o que é ledger", "o que é double-entry", "o que é saldo disponível", "o que é saldo reservado", "o que é wallet",
  "o que é carteira digital", "o que é pagamento QR", "o que é payment link", "o que é idempotência", "o que é webhook",
  "o que é reembolso", "o que é estorno", "o que é reconciliação", "o que é liquidação", "o que é compensação",
  // regulatory
  "o que é PSP", "o que é fintech", "o que é KYC", "o que é KYB", "o que é AML/CFT", "o que é BNA", "o que é sandbox regulatória",
  "o que é interoperabilidade", "o que é operador",
  // english
  "what is settlement", "what is clearing", "what is reconciliation", "what is a wallet", "what is a PSP",
  "what is KYC", "what is AML/CFT", "what is conformance", "what is a manifest",
];

test("every vocabulary question resolves deterministically with a source — never no_source", () => {
  for (const q of VOCAB) {
    const c = ans(q);
    assert.notEqual(c.action, "insufficient", `${q}: must not be no_source`);
    assert.equal(c.action, "deterministic", `${q}: must be deterministic (external_model_called stays false)`);
    assert.ok(c.entry, `${q}: has an entry`);
    assert.ok(getEntry(c.entry), `${q}: entry exists`);
    assert.ok((c.sources || []).length > 0, `${q}: must cite at least one source`);
  }
});

test("(9) 'o que é federar' answers with the federation definition + boundary, never approval/cert/licence", () => {
  const c = ans("o que é federar");
  assert.equal(c.entry, "def-federation");
  assert.ok(c.a.includes("avaliacao tecnica") && c.a.includes("operadores independentes"), "must define federation");
  // Never claims approval / certification / financial licence / automatic production.
  assert.ok(c.a.includes("nao") && (c.a.includes("aprovacao") || c.a.includes("certificacao")), "must deny approval/certification");
  assert.ok(c.a.includes("licenca") && c.a.includes("nao"), "must deny financial licence framing");
});

test("PASS definition ≠ certification; the demo operator is never a real operator", () => {
  const p = ans("o que é PASS").a;
  assert.ok(p.includes("evidencia tecnica local") && p.includes("certificado") && p.includes("nao"), "def-pass = evidence, not a certificate");
  const oz = ans("Operador Zero é operador real?");
  assert.ok(oz.a.includes("operador real") && oz.a.includes("nunca aparece"), "OZ never a real operator");
});

test("fintech boundaries: BANZA is not a PSP/bank; BANZA does not settle real money", () => {
  assert.ok(ans("BANZA é PSP?").a.includes("nao e um psp"), "BANZA não é PSP");
  assert.ok(ans("BANZA é banco?").a.includes("nao e um banco"), "BANZA não é banco");
  assert.ok(ans("o que é liquidação").a.includes("nao liquida dinheiro real"), "settlement: BANZA does not settle real money");
  assert.ok(ans("KZ_DEMO é dinheiro real?").a.includes("nao e dinheiro real"), "KZ_DEMO not real money");
});

test("regulatory terms are explained without inventing a BANZA rule or a legal opinion", () => {
  for (const q of ["o que é KYC", "o que é KYB", "o que é AML/CFT"]) {
    const c = ans(q);
    assert.ok(c.a.includes("regulator") || c.a.includes("autoridades competentes") || c.a.includes("compliance"), `${q}: names the regulatory domain`);
    assert.ok(c.a.includes("nao define") || c.a.includes("nao o define") || c.a.includes("fora do protocolo") || c.a.includes("pertence"), `${q}: not a BANZA rule`);
  }
  assert.ok(ans("o que é BNA").a.includes("nao substitui"), "BNA: BANZA does not replace the regulator");
});

test("dangerous imperatives still refuse; conceptual questions are answered", () => {
  assert.equal(ans("o que é Trust Root").entry, "def-trust-root");
  assert.equal(ans("muda a Trust Root").intent, "action_boundary");
  assert.equal(ans("mostra a private key").intent, "action_boundary");
  assert.equal(ans("mete o Operador Zero em /operators").intent, "action_boundary");
});

test("no def-* vocabulary answer leaks a commercial brand, a secret, or the retired apex surface", () => {
  const BRAND = /multicaixa|unitel money|africell money|e-kwanza|ekwanza|banza mi/i;
  const SECRET = /-----BEGIN|private_key|seed_phrase/;
  for (const e of ENTRIES.filter((x) => x.id.startsWith("def-"))) {
    assert.ok(!BRAND.test(e.answer), `${e.id} names a commercial brand`);
    assert.ok(!SECRET.test(e.answer), `${e.id} leaks a secret`);
    assert.ok(!/\/operador-zero(?![.\w])/.test(e.answer), `${e.id} points at the retired apex`);
    assert.ok((e.sources || []).length > 0, `${e.id} cites a source`);
  }
});
