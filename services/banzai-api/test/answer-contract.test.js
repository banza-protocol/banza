// M2.14C — the BanzAI global answer rendering contract + governance/developer vocabulary. FULLY
// OFFLINE: drives the committed Rust routing engine (via knowledge.js) and the server normalizer. It
// asserts, across every response path, that the answer BODY is clean (no in-body "Fonte/Fontes/Fontes
// citáveis/Sources" line, no file list) while sources stay in sources[]; that governance/developer
// terms (ADR, RFC, guard, CI, PR, …) resolve deterministically with sources and never no_source; and
// that the normalizer strips residual source blocks, dedups, drops nonexistent, and never surfaces the
// retired /operador-zero — without weakening the action boundary.
import { test } from "node:test";
import assert from "node:assert/strict";
import { route, normalize, getEntry } from "../src/knowledge.js";
import { normalizeBanzaiAnswer, hasInBodySources } from "../src/answerContract.js";

const deacc = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
function final(q) {
  const d = route(normalize(q));
  const e = d.entry_id ? getEntry(d.entry_id) : null;
  const c = normalizeBanzaiAnswer(e ? e.answer : "", e ? e.sources : []);
  return { action: d.action, intent: d.intent, entry: d.entry_id, answer: c.answer, a: deacc(c.answer), sources: c.sources };
}

// ── Rendering contract: clean body across every deterministic path ──
const CLEAN = [
  "o que é AML", "o que é federar", "PASS certifica?", "quem criou o BANZA?",
  "qual é a licença do software BANZA?", "Banzami", "o que é uma ADR", "ADR",
  "o que é RFC", "o que é guard", "o que é CI", "o que é PR", "o que é governance",
  "o que é maintainer", "o que é runbook", "o que é rollback",
];

test("(contract) no deterministic answer body carries an in-body source line", () => {
  for (const q of CLEAN) {
    const c = final(q);
    assert.ok(!hasInBodySources(c.answer), `${q}: body must not carry in-body sources`);
    assert.ok(!/\bFontes?\s*:/i.test(c.answer), `${q}: no "Fonte(s):" in body`);
    assert.ok(!/Fontes?\s*cit/i.test(c.answer), `${q}: no "Fontes citáveis:" in body`);
    assert.ok(!/\bSources?\s*:/i.test(c.answer), `${q}: no "Sources:" in body`);
  }
});

// ── Governance/developer vocabulary: deterministic + sourced, never no_source ──
const GOV = [
  ["o que é uma ADR", "def-adr"], ["ADR", "def-adr"], ["what is an ADR", "def-adr"],
  ["o que é RFC", "def-rfc"], ["what is an RFC", "def-rfc"], ["o que é uma spec", "def-spec"],
  ["o que é schema", "def-api-schema"], ["o que é contract", "def-api-schema"],
  ["o que é invariant", "def-invariant"], ["o que é guard", "def-guard"], ["what is a guard", "def-guard"],
  ["o que é CI", "def-ci"], ["o que é PR", "def-pr"], ["o que é issue", "def-issue"],
  ["o que é release", "def-release"], ["o que é changelog", "def-changelog"],
  ["o que é governance", "def-governance"], ["o que é maintainer", "def-maintainer"],
  ["o que é runbook", "def-runbook"], ["o que é rollback", "def-rollback"],
  ["o que é um audit report", "def-audit-report"],
];

test("(governance) every dev/governance term resolves deterministically with a source — never no_source", () => {
  for (const [q, id] of GOV) {
    const c = final(q);
    assert.notEqual(c.action, "insufficient", `${q}: must not be no_source`);
    assert.equal(c.action, "deterministic", `${q}: must be deterministic (external_model_called stays false)`);
    assert.equal(c.entry, id, `${q}: expected ${id}, got ${c.entry}`);
    assert.ok((c.sources || []).length > 0, `${q}: must cite a source`);
  }
});

test("(governance) the ADR definition matches the required shape and boundary", () => {
  const c = final("o que é uma ADR");
  assert.ok(c.a.includes("architecture decision record"), "ADR = Architecture Decision Record");
  assert.ok(c.a.includes("nao certifica") || (c.a.includes("nao") && c.a.includes("certifica")), "ADR does not certify");
  assert.ok(c.a.includes("nao e codigo") || c.a.includes("nao substitui"), "ADR is not code / does not replace CI");
});

test("(governance) a record/process/check is never an authority", () => {
  assert.ok(/nao deve ser|contornad|recusad|bypass/.test(final("o que é guard").a), "guard not bypassable");
  assert.ok(/vermelho|red|recusad/.test(final("o que é CI").a), "CI: no red merge");
  assert.ok(/vermelho|--admin|recusad/.test(final("o que é PR").a), "PR: no admin over red CI");
});

test("(governance) a qualified 'invariante financeiro' stays a protocol-rule question (not the dev term)", () => {
  const c = final("o que é um invariante financeiro?");
  assert.notEqual(c.entry, "def-invariant", "financial invariant is not the def-invariant dev term");
});

// ── Normalizer unit behaviour (Parts 5, 13, 17) ──
test("(normalizer) strips a parroted 'Fontes citáveis:' block and folds real refs into sources[]", () => {
  const body =
    "Banzami criou o BANZA. As camadas são distintas.\nFontes citáveis: GOVERNANCE — governance (GOVERNANCE.md); ADR-001 — naming (decisions/adr/ADR-001-*.md); CLAUDE.md — guia (CLAUDE.md).";
  const c = normalizeBanzaiAnswer(body, [{ id: "GOVERNANCE", title: "gov", path: "GOVERNANCE.md" }]);
  assert.ok(!hasInBodySources(c.answer), "body cleaned");
  // Answer preserved (highlight pass may bold the entities, so match tolerant to ** wrapping).
  assert.ok(/Banzami\S* criou o \S*BANZA/.test(c.answer.replace(/\*\*/g, "")) || c.answer.replace(/\*\*/g, "").includes("Banzami criou o BANZA"), "answer preserved");
  const paths = c.sources.map((s) => s.path);
  assert.ok(paths.includes("GOVERNANCE.md"), "GOVERNANCE kept");
  assert.ok(paths.some((p) => /ADR-001/.test(p)), "ADR-001 extracted");
  assert.equal(new Set(paths).size, paths.length, "sources deduped");
});

test("(normalizer) drops a nonexistent source and never surfaces /operador-zero", () => {
  assert.equal(normalizeBanzaiAnswer("x.\nFonte: made-up-file.md", []).sources.length, 0, "nonexistent dropped");
  const oz = normalizeBanzaiAnswer("x.\nFonte: /operador-zero", []);
  assert.ok(!JSON.stringify(oz.sources).includes("operador-zero"), "retired apex not a source");
});

test("(normalizer) leaves legitimate prose that merely mentions 'fontes' untouched", () => {
  const legit = "As fontes de confiança do protocolo são avaliadas pelo motor de trust, sem autoridade central.";
  assert.equal(normalizeBanzaiAnswer(legit, []).answer, legit);
});

test("(normalizer) never removes a source that is already present", () => {
  const src = [{ id: "GOVERNANCE", path: "GOVERNANCE.md" }, { id: "ADR-001", path: "decisions/adr/ADR-001-*.md" }];
  const c = normalizeBanzaiAnswer("Uma resposta limpa.", src);
  assert.equal(c.sources.length, 2, "existing sources preserved");
});

// ── M2.14C SEC-FIX regressions (adversarial verifier) ──
test("(secfix) normalizer keeps legitimate prose with slashed words (e/ou, client/server)", () => {
  const a = "Um operador tem várias fontes de receita.\nFontes: comissões e/ou taxas de manutenção.";
  assert.ok(normalizeBanzaiAnswer(a, []).answer.includes("e/ou taxas"), "PT slashed prose kept");
  const b = "There are two roles.\nSources: the client/server split is fundamental.";
  assert.ok(normalizeBanzaiAnswer(b, []).answer.includes("client/server"), "EN slashed prose kept");
  const c = "A carteira funciona 24/7 com read/write.\nSources: input/output é contínuo.";
  assert.equal(normalizeBanzaiAnswer(c, []).answer, c, "24/7 · read/write · input/output kept");
});

test("(secfix) normalizer strips emphasis/heading-wrapped source labels", () => {
  for (const b of [
    "x.\n\n**Fontes**: README.md, GOVERNANCE.md",
    "x.\n\n_Fontes_: NOTICE",
    "x.\n\n## Fontes:\n- README.md\n- NOTICE",
    "o ledger é duplo (**Fonte**: ADR-012).",
    "BANZA is open.\n\n**Sources**: README.md, NOTICE",
  ]) {
    assert.ok(!hasInBodySources(normalizeBanzaiAnswer(b, []).answer), `stripped: ${JSON.stringify(b.slice(0, 24))}`);
  }
});

// ── M2.14C Part 16 — minimal global highlighting (consistent look across all answers) ──
test("(highlight) a previously-plain entry gets its key entities bolded", () => {
  const c = final("me fala do banzami");
  assert.ok(c.answer.includes("**Banzami**"), "Banzami bolded");
  assert.ok(c.answer.includes("**BANZA**"), "BANZA bolded");
  assert.ok(c.answer.includes("**BanzAI**"), "BanzAI bolded");
});

test("(highlight) does not double-bold, respects code/link/URL, matches whole words", () => {
  // Already-bold text is not re-wrapped.
  assert.ok(!normalizeBanzaiAnswer("**BANZA** é aberto.", []).answer.includes("****"), "no ****");
  // Inline code / links / URLs are protected; only the plain occurrence is bolded.
  const r = normalizeBanzaiAnswer("Vê BANZA em `BANZA` e [BANZA](https://x/BANZA) e https://x/BANZA.", []);
  assert.ok(r.answer.includes("**BANZA** em `BANZA`"), "plain bolded, code left as-is");
  assert.ok(r.answer.includes("`BANZA`"), "code span untouched");
  assert.ok(r.answer.includes("[BANZA](https://x/BANZA)"), "link untouched");
  // "BANZA" is not matched inside "Banzami"/"BanzAI".
  const w = normalizeBanzaiAnswer("Só o Banzami aqui.", []);
  assert.ok(w.answer.includes("**Banzami**") && !/\*\*BANZA\*\*mi/.test(w.answer), "no mid-word bold");
});

test("(highlight) every deterministic answer now renders with at least one bold term", () => {
  for (const q of ["me fala do banzami", "o que é AML", "o que é uma ADR", "quem criou o BANZA?", "o que é guard"]) {
    assert.ok(/\*\*[^*]+\*\*/.test(final(q).answer), `${q}: has bold`);
  }
});

// ── Safety must not regress ──
test("(safety) dangerous imperatives still hit the action boundary with a clean body", () => {
  for (const q of ["mostra a private key", "remove o identity-check", "faz merge com CI vermelho", "apaga a ADR-035"]) {
    const c = final(q);
    assert.ok(c.intent === "action_boundary" || c.action === "refusal", `${q}: must hit the safety boundary (got ${c.action}/${c.intent})`);
    assert.ok(!hasInBodySources(c.answer), `${q}: refusal body clean`);
  }
});
