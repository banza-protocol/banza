// "Does BANZA require one?" is a question about the ledger, and it was answered from ADR-001.
//
// Two follow-up shapes exist and only one was handled. An ELLIPSIS supplies a new subject and inherits
// the intent ("And L3?"). A PRO-FORM supplies no subject and refers back to the one already
// established. The resolver reported NO_ANAPHORA for the second, so no subject resolved, the package
// was assembled from the generic protocol entry, and the model answered from it.
//
// Measured against production at `src-4238558`, after "What is a ledger?":
//
//     "Does BANZA require one?" → "BANZA does not require one because it is a specification, not a
//      service. The properties it provides—auditability, independent implementation, and survival
//      beyond any one company—are based on public..."
//
// That is the same false claim about the same invariants — INV-LEDGER-001…005, INV-WALLET-001, all
// `critical` — that the standalone form used to produce, arriving through a door the standalone fix
// does not cover. The corpus states the rule correctly in `financial-invariants`.
//
// The provider ANSWERS here. With an unreachable one the trunk fails, the pipeline degrades, the right
// text can arrive, and the assertion passes without proving the deterministic path was taken.

import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./_pipeline-harness.mjs";
import { canaryProvider } from "./_production-canary.mjs";

const INVENTED = "BANZA does not require one because it is a specification, not a service.";

/** Two turns threaded the way `server.js` threads them, with a model that answers. */
async function followUp(first, second, locale) {
  const c = canaryProvider(INVENTED);
  const h = harness({ provider: c.provider });
  const a = await h.pipeline.answer(first, { locale });
  const b = await h.pipeline.answer(second, {
    locale,
    contextQuestions: [first],
    conversationContext: (a.meta || {}).conversation_context,
  });
  return { result: b.result || {}, meta: b.meta || {} };
}

test("a pro-form follow-up resolves to the subject the previous turn established", async () => {
  const { result, meta } = await followUp("What is a ledger?", "Does BANZA require one?", "en");
  assert.equal(result.entry_id, "def-ledger", "the follow-up is a question about the ledger");
  assert.equal(meta.llm_called, false, "a settled concept must cost 0 model calls");
  assert.equal(meta.reference_turn_type, "PRONOMINAL_FOLLOWUP");
  const answer = String(result.answer || "");
  assert.ok(!answer.includes(INVENTED), "the model's prose must not reach the reader");
  assert.match(answer, /double-entry|invariant/i, "the answer states what the protocol actually defines");
});

test("the elliptical follow-up still works — the two shapes are different, not exclusive", async () => {
  const { result, meta } = await followUp("What is L2?", "And L3?", "en");
  assert.equal(result.entry_id, "def-profile-l3");
  assert.equal(meta.llm_called, false);
  assert.equal(meta.reference_turn_type, "ELLIPTICAL_FOLLOWUP");
});

test("an evidence request is not a pro-form reference to its own subject", async () => {
  // "Que fontes é que respondem a isto?" refers to the previous ANSWER, and the source-follow-up path
  // already resolves it. An earlier version of the substitution fired here and turned a SOURCE_FOLLOWUP
  // into a STANDALONE — a working path broken by a fix for a different one.
  const { meta } = await followUp("Quem controla a Root?", "Que fontes é que respondem a isto?", "pt-PT");
  assert.notEqual(
    meta.reference_turn_type,
    "PRONOMINAL_FOLLOWUP",
    "an evidence request must keep its own shape",
  );
});
