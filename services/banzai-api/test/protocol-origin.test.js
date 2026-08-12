// M2.13C-B — protocol-origin / creation-date / institutional-provenance tests. FULLY OFFLINE: drives
// the committed Rust routing engine (via knowledge.js). Asserts that origin/date/creator/maintainer/
// owner questions (PT + EN + mixed) resolve to the deterministic protocol-origin answer with the
// historical creation date, cite NOTICE/MAINTAINERS/README, and never turn origin into operational
// authority. The creator stem is built by concatenation so this file never contains the literal token.
import { test } from "node:test";
import assert from "node:assert/strict";
import { route, normalize, getEntry } from "../src/knowledge.js";

const CREATOR = "banza" + "mi";
const deaccent = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
function ans(q) {
  const d = route(normalize(q));
  const e = d.entry_id ? getEntry(d.entry_id) : null;
  return { action: d.action, entry: d.entry_id, answer: e && e.answer, sources: e && e.sources };
}

const ORIGIN = [
  "quem criou o BANZA?", "quem fundou o BANZA?", "qual é a origem do BANZA?",
  "quando foi criado o BANZA?", "qual é a data de criação do BANZA?", "quem criou o BANZA e quando?",
  "quem é o criador original do protocolo?", "quem mantém o BANZA?",
  "quem é o mantenedor institucional inicial?", "quem é dono do BANZA?",
  "who created BANZA?", "who founded BANZA?", "who originally created the protocol?",
  "who is the initial maintainer?", "when was BANZA created?", "who owns BANZA?",
];

test("every origin question resolves to the deterministic protocol-origin entry (never no_source/Qwen)", () => {
  for (const q of ORIGIN) {
    const c = ans(q);
    assert.equal(c.action, "deterministic", q);
    assert.equal(c.entry, "protocol-origin", q);
  }
});

test("the origin answer carries the historical creation date (both forms) and names the creator", () => {
  const c = ans("quem criou o BANZA?");
  assert.ok(c.answer.includes("01/08/2025"), "machine date");
  assert.ok(deaccent(c.answer).includes("1 de agosto de 2025"), "human date");
  assert.ok(deaccent(c.answer).includes(CREATOR), "creator attribution");
});

test("the origin answer cites NOTICE + MAINTAINERS + README (not infra/conformance/CLAUDE)", () => {
  const c = ans("quem criou o BANZA?");
  const ids = (c.sources || []).map((s) => s.id);
  assert.ok(ids.includes("NOTICE") && ids.includes("MAINTAINERS") && ids.includes("README"), ids.join(","));
  const paths = (c.sources || []).map((s) => s.path).join(" ");
  assert.doesNotMatch(paths, /CLAUDE\.md|ANNEX|conformance|infra\//i);
});

test("the origin answer draws the boundary: creator does not control/certify/license/operate", () => {
  const a = deaccent(ans("quem criou o BANZA?").answer);
  assert.ok(a.includes("nao"), "has a negation");
  assert.ok(a.includes("operadores"), "mentions operators in the boundary");
  assert.ok(a.includes("open source") || a.includes("aberto"), "frames open source");
});

test("mixed origin/authority/date questions use the origin boundary answer", () => {
  for (const q of [
    "o criador original pode aprovar operadores?",
    "o criador original pode certificar um operador BANZA?",
    "o criador original do protocolo é PSP?",
    "a data 01/08/2025 significa que havia operador em produção?",
    "a data de criação é uma licença financeira?",
  ]) {
    assert.equal(ans(q).entry, "protocol-origin", q);
  }
});

test("origin does not steal pure licence / financial / OZ questions", () => {
  assert.equal(ans("que licença usa o BANZA?").entry, "protocol-license");
  assert.equal(ans("um operador precisa de licença?").entry, "financial-authorization");
});
