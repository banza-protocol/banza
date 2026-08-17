// Epistemic monotonicity: once a claim is established, presentation cannot un-establish it.
//
// # The measured defect
//
// "Explica porquê o limiar da Root é 2 de 3." routed deterministically to def-root-authorization with
// establishing sources. The explanatory cue sent it to the synthesis trunk, the model was unavailable, and
// the emergency fallback re-ran a WEAKER lexical retrieval, missed, and returned:
//
//     terminal: insufficient_evidence      reason: local_inference_unavailable
//
// The two fields contradict each other on the same answer. The engine held the record, the reason field
// knew the real cause was the model, and the reader was told BANZA had insufficient evidence.
//
// Three dimensions were conflated, and the test suite is organised by them:
//
//   EPISTEMIC   is the claim established?           decided ONCE, upstream
//   PRESENTATION how much explanation was asked for? a cue changes this and nothing else
//   EXECUTION   did the optional generation run?     a model outage changes this and nothing else
//
// Asking for an explanation is not evidence about whether evidence exists.

import { test } from "node:test";
import assert from "node:assert/strict";
import { harness } from "./_pipeline-harness.mjs";
import { route, getEntry } from "../src/knowledge.js";

/** Deterministic critical records, each reached by a question that also carries an explanatory cue. */
const SETTLED_WITH_CUE = [
  ["Root", "Explica porquê o limiar da Root é 2 de 3."],
  ["BanzAI role", "Explica porque é que o BanzAI não decide conformidade."],
  ["profiles", "Explica porque é que os perfis do BANZA não são certificação."],
  ["L0 boundary", "Porque é que passar L0 não permite operar com dinheiro real?"],
  ["L0 boundary (EN)", "Why does passing L0 not authorize real-money operation?"],
];

/** A question with no BANZA answer at all — the control that keeps the property conditional. */
const GENUINELY_UNSUPPORTED = "Como funciona um motor a jacto?";

test("the fixtures really are settled critical records — else this suite proves nothing", () => {
  for (const [label, q] of SETTLED_WITH_CUE) {
    const d = route(q, []);
    assert.equal(d.action, "deterministic", `${label}: ${q}`);
    const e = getEntry(d.entry_id);
    assert.ok(e, `${label}: entry ${d.entry_id} must exist`);
    assert.ok((e.sources || []).length > 0, `${label}: must carry establishing sources`);
  }
});

test("a settled claim is never reported as epistemically unsupported when the model is unavailable", async () => {
  // The model is unreachable in the harness by construction, so every case here takes the outage path.
  for (const [label, q] of SETTLED_WITH_CUE) {
    const h = harness({});
    const r = await h.pipeline.answer(q, {});
    assert.notEqual(
      r.meta.terminal_kind,
      "insufficient_evidence",
      `${label}: a settled record must not be reported as insufficient evidence (reason said ${r.meta.fallback_reason})`,
    );
    // And the canonical answer is actually delivered, not merely a different failure label.
    assert.ok(
      (r.result || {}).entry_id,
      `${label}: the settled record must still reach the reader`,
    );
  }
});

test("the property is not specific to one entry or one language", async () => {
  // Four distinct records across both languages. If a future change protects only the L0 boundary — the
  // instance that was fixed first, via the verbatim exemption — this fails.
  const seen = new Set();
  for (const [, q] of SETTLED_WITH_CUE) {
    const h = harness({});
    const r = await h.pipeline.answer(q, {});
    if ((r.result || {}).entry_id) seen.add(r.result.entry_id);
  }
  assert.ok(
    seen.size >= 3,
    `the property must hold across several records, saw: ${[...seen].join(", ")}`,
  );
});

test("a genuinely unsupported question is still insufficient", async () => {
  // The property is conditional on evidence having been settled. Without this, "never say insufficient"
  // would be a passing implementation, and that is a worse engine.
  const h = harness({});
  const r = await h.pipeline.answer(GENUINELY_UNSUPPORTED, {});
  assert.equal(r.meta.terminal_kind, "insufficient_evidence");
  assert.equal((r.result || {}).entry_id ?? null, null, "nothing was settled, so nothing may be served");
});

test("a rejected synthesis does not rewrite the evidence as absent", async () => {
  // Generation is stubbed to overclaim — the exact claim the original defect produced. The validator must
  // reject the prose, and the reason must name the rejection rather than blame the evidence.
  const OVERCLAIM = "Os contratos públicos controlam os operadores.";
  const h = harness({
    synthesis: (args) => ({
      status: "grounded",
      answer_markdown: OVERCLAIM,
      cited_source_ids: [],
      package: (args && args.package) || { facts: [] },
      primary_intent: "explain_concept",
      clarification_candidates: [],
      trace: { synthesis_called: true, entry_status: "ok", output_status: "ok" },
    }),
  });
  const r = await h.pipeline.answer("explica a relação entre conformidade e federação no BANZA", {});
  h.assertSynthesisRan(assert);
  assert.ok(
    !((r.result || {}).answer || "").includes("controlam os operadores"),
    "the overclaim must not reach the reader",
  );
  assert.notEqual(
    r.meta.fallback_reason,
    "evidence_below_threshold",
    "a validator rejection is not a statement about how much evidence exists",
  );
  assert.notEqual(r.meta.fallback_reason, "no_eligible_evidence");
});

test("terminal and reason never contradict each other about the cause", async () => {
  // The original defect emitted terminal=insufficient_evidence alongside reason=local_inference_unavailable
  // — one field blaming the evidence while the other named the model. Whatever the outcome, an outage
  // reason may not sit on an epistemic terminal.
  for (const [label, q] of SETTLED_WITH_CUE) {
    const h = harness({});
    const r = await h.pipeline.answer(q, {});
    const epistemic = r.meta.terminal_kind === "insufficient_evidence";
    const executionCause = ["local_inference_unavailable", "synthesis_capacity_tripped"].includes(
      r.meta.fallback_reason,
    );
    assert.ok(
      !(epistemic && executionCause),
      `${label}: terminal ${r.meta.terminal_kind} contradicts reason ${r.meta.fallback_reason}`,
    );
  }
});
