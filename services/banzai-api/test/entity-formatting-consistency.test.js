// M2.14C-FIX1 — canonical-entity emphasis consistency. FULLY OFFLINE: drives the public server answer
// contract (normalizeBanzaiAnswer → normalizeEntityEmphasis) + the committed Rust routing engine (via
// knowledge.js). Asserts that EVERY textual occurrence of a canonical ecosystem entity is bold (not just
// the first, as the M2.14C pass did), spelled canonically, while code / inline code / existing bold /
// links / URLs and paths / domains / packages / doc-ids stay untouched, never double-bold (****), and
// common words are not bolded.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeBanzaiAnswer } from "../src/answerContract.js";
import { route, normalize, getEntry } from "../src/knowledge.js";

const N = (md) => normalizeBanzaiAnswer(md, []).answer;
const count = (s, re) => (s.match(re) || []).length;

test("(fix1) every occurrence — not just the first — of a canonical entity is bold", () => {
  const a = N("O banzami criou o banza. O banza usa o banzai. O banzai é o agente. O banzami mantém o banza.");
  assert.equal(count(a, /\*\*Banzami\*\*/g), 2, "Banzami bolded twice");
  assert.equal(count(a, /\*\*BANZA\*\*/g), 3, "BANZA bolded three times");
  assert.equal(count(a, /\*\*BanzAI\*\*/g), 2, "BanzAI bolded twice");
});

test("(fix1) never produces **** (no double-bold), and existing bold is not re-wrapped", () => {
  for (const s of ["**BANZA** é aberto. O BANZA é bom.", "banza banza banza", "O **Banzami** e o banzami e o banzami."]) {
    assert.ok(!N(s).includes("****"), `no **** for: ${s}`);
  }
  const r = N("**BANZA** aberto.");
  assert.ok(r.includes("**BANZA**") && !r.includes("****"), "existing bold kept, not doubled");
});

test("(fix1) code, inline code, links and URLs are protected", () => {
  const a = N("Usa `banza init` e o BANZA. Vê [banza](https://x/banza) e https://banza.network e o BANZA.");
  assert.ok(a.includes("`banza init`"), "inline code untouched");
  assert.ok(a.includes("[banza](https://x/banza)"), "markdown link untouched");
  assert.ok(a.includes("https://banza.network"), "URL untouched");
  assert.equal(count(a, /\*\*BANZA\*\*/g), 2, "only the two plain BANZA occurrences are bolded");

  const b = N("Exemplo:\n```\nconst banza = 1;\nconst banzai = 2;\n```\nDepois o BANZA fica pronto.");
  assert.ok(b.includes("const banza = 1;") && b.includes("const banzai = 2;"), "fenced code untouched");
  assert.ok(b.includes("**BANZA**"), "text after fenced code still bolded");
  assert.ok(!b.includes("****"), "no double-bold around fenced code");
});

test("(fix1) paths / domains / packages / doc-ids are NOT bolded", () => {
  const a = N("Vê banza.network e o pacote banzai-api em engines/banzai-api-kb. O ficheiro BANZA.md e o ADR-011. Mas o BANZA é aberto.");
  assert.ok(a.includes("banza.network") && !a.includes("**banza.network**") && !a.includes("**banza**.network"), "domain not bolded");
  assert.ok(a.includes("banzai-api") && !a.includes("**banzai-api**") && !a.includes("**banzai**-api"), "package not bolded");
  assert.ok(a.includes("engines/banzai-api-kb") && !a.includes("**banzai"), "path not bolded");
  assert.ok(a.includes("BANZA.md") && !a.includes("**BANZA.md**") && !a.includes("**BANZA**.md"), "doc-id BANZA.md not bolded");
  assert.ok(a.includes("ADR-011") && !a.includes("**ADR-011**") && !a.includes("**ADR**-006"), "doc-id ADR-011 not bolded");
  assert.ok(a.includes("**BANZA**"), "standalone BANZA still bolded");
});

test("(fix1) canonical spelling is emitted (drift fixed)", () => {
  const a = N("o banzami e o BANZAI e a operador zero e a trust root e o kz_demo e o qwen");
  assert.ok(a.includes("**Banzami**"), "banzami → **Banzami**");
  assert.ok(a.includes("**BanzAI**"), "BANZAI → **BanzAI**");
  assert.ok(a.includes("**Operador Zero**"), "operador zero → **Operador Zero**");
  assert.ok(a.includes("**Trust Root**"), "trust root → **Trust Root**");
  assert.ok(a.includes("**KZ_DEMO**"), "kz_demo → **KZ_DEMO**");
  assert.ok(a.includes("**Qwen**"), "qwen → **Qwen**");
});

test("(fix1) whole-word: BANZA never matches inside Banzami/BanzAI; plural ADRs/RFCs bold, doc-ids preserved", () => {
  const a = N("Só o Banzami aqui.");
  assert.ok(a.includes("**Banzami**") && !/\*\*BANZA\*\*mi/.test(a), "no mid-word bold inside Banzami");
  const b = N("Os ADRs e os RFCs governam. O ADR-011 é um deles.");
  assert.ok(b.includes("**ADRs**") && b.includes("**RFCs**"), "plurals bolded");
  assert.ok(b.includes("ADR-011") && !b.includes("**ADR-011**"), "ADR-011 doc-id preserved");
});

test("(fix1) common words are NOT bolded (no over-bolding)", () => {
  const a = N("O protocolo é aberto e o operador escolhe o pagamento, a carteira e a conta.");
  assert.ok(!a.includes("**"), "no common word bolded");
});

test("(fix1) every sampled deterministic answer renders with ≥1 bold entity", () => {
  for (const q of ["me fala do banzami", "quem criou o BANZA?", "o que é uma ADR", "o que é guard", "transfere 100 kz"]) {
    const d = route(normalize(q));
    const e = d.entry_id ? getEntry(d.entry_id) : null;
    const a = normalizeBanzaiAnswer((e && e.answer) || "", (e && e.sources) || []).answer;
    assert.ok(/\*\*[^*]+\*\*/.test(a), `${q}: has ≥1 bold`);
  }
});

test("(fix1/adv) multi-word entities never self-nest (Financial Action Boundary vs Action Boundary)", () => {
  // Regression: the sequential per-entity replace re-wrapped "Action Boundary" INSIDE an already-wrapped
  // "**Financial Action Boundary**", producing "**Financial **Action Boundary****". A single combined
  // pass consumes the broader match first.
  assert.equal(N("Financial Action Boundary"), "**Financial Action Boundary**");
  assert.equal(N("a financial action boundary"), "a **Financial Action Boundary**");
  const both = N("a Financial Action Boundary e a Action Boundary");
  assert.ok(both.includes("**Financial Action Boundary**") && both.includes("e a **Action Boundary**"), "both bolded independently");
  assert.ok(!both.includes("****"), "no double-bold");
});

test("(fix1/adv) an entity abutting a protected **bold** never glues into ****", () => {
  for (const s of ["**nota**BANZA", "BANZA**nota**", "**a**BANZA**b**", "**x**BanzAI**y**"]) {
    assert.ok(!N(s).includes("****"), `no **** for: ${s}`);
  }
  assert.equal(N("**nota**BANZA"), "**nota** **BANZA**");
});

test("(fix1/adv) reference-style links / unclosed code are not emphasised inside", () => {
  assert.ok(N("ver [BANZA] aqui").includes("[BANZA]") && !N("ver [BANZA] aqui").includes("**BANZA**]"), "shortcut ref link untouched");
  assert.ok(N("ver [texto][BANZA]").includes("[texto][BANZA]"), "full ref link untouched");
  assert.ok(N("[BANZA]: https://x").startsWith("[BANZA]:"), "ref definition untouched");
  assert.ok(N("o `banza fica").includes("`banza") && !N("o `banza fica").includes("**banza"), "unclosed inline code not bolded");
});

test("(fix1/adv) legitimate bold-italic (***) is preserved and never collapsed", () => {
  const a = N("isto ***importante*** e BANZA");
  assert.ok(a.includes("***importante***"), "bold-italic preserved");
  assert.ok(a.includes("**BANZA**") && !a.includes("****"), "entity bolded, no ****");
});

test("(fix1) the emphasis pass keeps the M2.14C rendering contract (clean body, sources separated)", () => {
  const c = normalizeBanzaiAnswer(
    "Banzami criou o BANZA. O BANZA é aberto.\nFontes citáveis: GOVERNANCE.md; ADR-002.",
    [],
  );
  assert.ok(!/\n\s*Fontes/i.test(c.answer), "in-body source block stripped");
  assert.ok(c.answer.includes("**Banzami**") && count(c.answer, /\*\*BANZA\*\*/g) === 2, "entities bolded on every occurrence in the clean body");
  assert.ok(!c.answer.includes("****"), "no double-bold");
});
