// M2.18B.4 corrective phase — the grounded 0%-publish fix. Regression fixtures over the THREE required
// groups, driving the REAL Rust engines (FactualPackage / outputSchema / validateOutput) with a scripted
// provider (single output-pass JSON; intent/entity are Rust-resolved). No real model, no network.
//
// Root cause fixed: the output pass produced VALID, VALIDATED JSON but with an empty answer_markdown (the
// model reasons by filling claims; under reasoning-disabled constrained decoding the prose slot came back
// ""), and the prose+claims JSON was truncated at the 256-token brief budget. Fix (no validator weakening):
//   (1) compose answer_markdown DETERMINISTICALLY from the ALREADY-VALIDATED claims when it is blank;
//   (2) raised output budget so a complete valid JSON is not truncated;
//   (3) strengthened output prompt (claims first, non-empty prose).
import { test } from "node:test";
import assert from "node:assert/strict";
import { runGroundedSynthesis } from "../src/grounded-synthesis.js";

function scriptedProvider(outputs) {
  let i = 0;
  return { calls: [], synthesize(messages, opts) { const idx = i++; this.calls.push({ messages, opts }); return Promise.resolve({ text: idx < outputs.length ? outputs[idx] : "", latencyMs: 3, model: "mock" }); } };
}

// ── Group 1 — valid grounded outputs MUST publish ─────────────────────────────────────────────────
test("(valid) non-empty answer + valid claims → grounded, published verbatim", async () => {
  const out = JSON.stringify({ answer_markdown: "A ADR-002 inverte a nomenclatura do ecossistema.", claims: [{ claim: "inverte a nomenclatura", fact_ids: ["F1"] }], cited_source_ids: ["ADR-002"], insufficient_evidence: false });
  const r = await runGroundedSynthesis("explica a ADR-002", { provider: scriptedProvider([out]), entityId: "ADR-002" });
  assert.equal(r.status, "grounded");
  assert.match(r.answer_markdown, /nomenclatura/);
  assert.equal(r.trace.answer_composed_from_claims, false, "the model's own prose is used, not composed");
  assert.equal(r.trace.factual_ok, true);
});

test("(valid+FIX) empty answer_markdown but valid claims → composed from validated claims, grounded", async () => {
  const out = JSON.stringify({ answer_markdown: "", claims: [{ claim: "A ADR-002 inverte a nomenclatura do ecossistema", fact_ids: ["F1"] }, { claim: "o operador de referência passou a designar o operador", fact_ids: ["F1"] }], cited_source_ids: ["ADR-002"], insufficient_evidence: false });
  const r = await runGroundedSynthesis("explica a ADR-002", { provider: scriptedProvider([out]), entityId: "ADR-002" });
  assert.equal(r.status, "grounded", "a validated output with composable claims must publish, not fall back");
  assert.equal(r.trace.answer_composed_from_claims, true, "answer_markdown composed from the validated claims");
  assert.ok(r.answer_markdown && r.answer_markdown.trim().length > 0, "composed answer is non-empty");
  assert.match(r.answer_markdown, /nomenclatura/, "composed answer contains the validated claim text");
});

// ── Group 2 — invalid / unsupported outputs MUST remain rejected (fail-closed; validator unchanged) ─
// SPR-4 §5 — this fixture is a MODEL-AUTHORED illegal cited_source_ids, which only the BASELINE contract
// permits (structured:false). In the structured path the model does not author cited_source_ids at all
// (derived ⊆ allowed), so this specific defect class is structurally impossible; the structured path's own
// rejection of a prose hallucination is covered in test/spr4-structured-synthesis.test.js.
test("(invalid) citation outside the allowed set → rejected → fallback (never published)", async () => {
  const out = JSON.stringify({ answer_markdown: "Na verdade a ADR-039 trata disto.", claims: [{ claim: "trata disto", fact_ids: ["F1"] }], cited_source_ids: ["ADR-039"], insufficient_evidence: false });
  const r = await runGroundedSynthesis("explica a ADR-002", { provider: scriptedProvider([out]), entityId: "ADR-002", structured: false });
  assert.equal(r.status, "fallback");
  assert.equal(r.answer_markdown, null);
  assert.equal(r.trace.factual_ok, false);
});

test("(invalid) empty answer AND no claims → nothing to compose → not published as prose", async () => {
  const out = JSON.stringify({ answer_markdown: "", claims: [], cited_source_ids: ["ADR-002"], insufficient_evidence: false });
  const r = await runGroundedSynthesis("explica a ADR-002", { provider: scriptedProvider([out]), entityId: "ADR-002" });
  // Either the validator rejects an empty/claimless answer (fallback), or it is grounded-but-empty which
  // the pipeline treats as non-grounded. Either way, NO empty prose is ever published.
  assert.ok(r.status === "fallback" || !String(r.answer_markdown || "").trim(), "no empty prose is published");
  assert.equal(r.trace.answer_composed_from_claims, false, "nothing composed with no claims");
});

// ── Group 3 — structurally defective outputs MUST fail safely with an internal reason ────────────────
test("(defective) malformed JSON → fallback, output_status invalid", async () => {
  const r = await runGroundedSynthesis("explica a ADR-002", { provider: scriptedProvider(["{ not json"]), entityId: "ADR-002" });
  assert.equal(r.status, "fallback");
  assert.equal(r.trace.output_status, "invalid");
  assert.equal(r.answer_markdown, null);
});

test("(defective) honest insufficient_evidence → insufficient, nothing invented", async () => {
  const out = JSON.stringify({ answer_markdown: "Sem base documental.", claims: [], cited_source_ids: [], insufficient_evidence: true });
  const r = await runGroundedSynthesis("explica a ADR-002", { provider: scriptedProvider([out]), entityId: "ADR-002" });
  assert.equal(r.status, "insufficient");
  assert.equal(r.answer_markdown, null);
});

// ── M2.18B.4-R2 — a COMPARISON packages BOTH named documents so each side is citeable ────────────────
test("(valid+compare) both named documents are citeable → grounded, neither citation rejected", async () => {
  // The compare path reads the explicit refs from the QUESTION (Rust detect_refs) and builds a
  // multi-document package, so allowed_source_ids contains ADR-041 AND ADR-042. An answer that cites both
  // (as a comparison must) is then VALID — the single-document package would reject the second citation.
  const out = JSON.stringify({
    answer_markdown: "A ADR-041 fixa a política de exemplo; a ADR-042 define a interface primária.",
    claims: [
      { claim: "a ADR-041 fixa a política de exemplo", fact_ids: ["F1"] },
      { claim: "a ADR-042 define a interface primária", fact_ids: ["F1"] },
    ],
    cited_source_ids: ["ADR-041", "ADR-042"],
    insufficient_evidence: false,
  });
  const r = await runGroundedSynthesis("compara a ADR-041 com a ADR-042", { provider: scriptedProvider([out]), entityId: "ADR-041" });
  assert.equal(r.status, "grounded", "a compare citing both named docs must publish (both in allowed_source_ids)");
  assert.equal(r.trace.factual_ok, true);
  assert.ok(Array.isArray(r.trace.compare_doc_ids) && r.trace.compare_doc_ids.includes("ADR-042"), "the second named document is packaged");
});
