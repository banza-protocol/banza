// M2.18B.2 / M2.18B.6 — candidate generation. `generateCandidates` (Rust `generate_candidates_json`)
// proposes ONLY real documents from the canonical registry; it never invents an id. In the single
// Grounded-Synthesis architecture (ADR-036) the Rust resolver/selector consumes these real candidates —
// the model never proposes an entity. These tests pin that contract.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCandidates } from "../src/knowledge.js";

const CANON = /^(ADR|RFC)-\d{3,4}$/;

test("(m2.18b2) candidate generation proposes REAL canonical documents (Part 16)", () => {
  const cands = generateCandidates("explica a ADR-001");
  assert.ok(Array.isArray(cands) && cands.length > 0, "ADR-001 must yield candidates");
  for (const c of cands) {
    assert.ok(CANON.test(c.id), `candidate id ${c.id} must be a canonical ADR/RFC`);
    assert.ok(typeof c.title === "string" && c.title.length > 0, "candidate carries a title");
  }
  assert.ok(cands.some((c) => c.id === "ADR-001"), "ADR-001 is among the candidates");
});

test("(m2.18b2) candidate generation respects the max and never invents ids", () => {
  const cands = generateCandidates("dupla entrada e idempotencia no ledger", 3);
  assert.ok(cands.length <= 3, `max respected, got ${cands.length}`);
  for (const c of cands) assert.ok(CANON.test(c.id), `only real ids, got ${c.id}`);
});

test("(m2.18b2) an off-domain / empty question invents nothing", () => {
  assert.deepEqual(generateCandidates(""), [], "empty question → no candidates");
  for (const c of generateCandidates("qual a capital de franca?")) {
    assert.ok(CANON.test(c.id), `off-domain must not invent a non-canonical id, got ${c.id}`);
  }
});

test("(m2.18b2) candidate generation is deterministic", () => {
  const a = generateCandidates("compara a ADR-035 com a ADR-036");
  const b = generateCandidates("compara a ADR-035 com a ADR-036");
  assert.deepEqual(a, b);
});
