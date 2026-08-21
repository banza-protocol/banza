// A closed enumeration is served, not recomposed — and this is proven against a model that ANSWERS.
//
// "What is the difference between L2 and L3?" routes deterministically to `def-profiles`, the entry
// carrying all five profiles with each profile's purpose and inheritance, derived from the canonical
// registry and realized in both locales. The question carries an explanatory cue, so it escalated into
// the trunk, and on production at `src-4238558` the model wrote:
//
//     "L2 and L3 differ in their level of abstraction and coordination. L2 implementations can extend
//      independently without affecting outcomes, while L3 introduces a lineage that ties keys to a
//      trusted set."
//
// citing ADR-021 and ADR-039 — reason codes and root authority. Neither discusses profiles.
//
// The Portuguese twin was SERVED CORRECTLY on that same deployment, and that is the part this file
// exists for. Its synthesis failed, the pipeline degraded to the emergency grounding, and the emergency
// grounding for a settled entry IS the correct record. One language got the answer and the other got a
// confabulation, and the difference was whether the model happened to succeed.
//
// So the provider here ANSWERS. With an unreachable one, the trunk fails, the pipeline degrades, the
// right text arrives, and every assertion passes without ever proving that the deterministic path was
// taken — which is precisely how this defect survived a full local suite. `llm_called` is asserted
// false, and the injected prose is asserted absent.

import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./_pipeline-harness.mjs";
import { canaryProvider } from "./_production-canary.mjs";

const INVENTED = "L2 and L3 differ in their level of abstraction and coordination.";

test("a profile comparison is served from the registry, with the model reachable and unused", async () => {
  for (const [locale, mustContain] of [
    ["pt-PT", "perfis de conformidade"],
    ["en", "conformance profiles"],
  ]) {
    const c = canaryProvider(INVENTED);
    const h = harness({ provider: c.provider });
    const { result, meta } = await h.pipeline.answer("What is the difference between L2 and L3?", { locale });
    assert.equal(result.entry_id, "def-profiles", `${locale}: must reach the entry holding every profile`);
    assert.equal(meta.llm_called, false, `${locale}: a closed enumeration must cost 0 model calls`);
    assert.equal(
      meta.terminal_kind,
      "canonical_definition",
      `${locale}: served, not degraded — a correct answer reached as a fallback proves nothing`,
    );
    const answer = String(result.answer || "");
    assert.ok(answer.includes(mustContain), `${locale}: the served text is the registry enumeration`);
    assert.ok(!answer.includes(INVENTED), `${locale}: the model's prose must not reach the reader`);
    // Both sides of the comparison are actually present.
    for (const p of ["L0", "L1", "L2", "L3", "L4"]) {
      assert.ok(answer.includes(p), `${locale}: ${p} missing from the enumeration`);
    }
  }
});

test("the Portuguese and English readers get the same facts", async () => {
  const seen = {};
  for (const locale of ["pt-PT", "en"]) {
    const c = canaryProvider(INVENTED);
    const h = harness({ provider: c.provider });
    const { result } = await h.pipeline.answer("Qual é a diferença entre L2 e L3?", { locale });
    seen[locale] = String(result.answer || "");
  }
  assert.notEqual(seen["pt-PT"], seen.en, "each locale must have its own realization, not one text twice");
  for (const locale of ["pt-PT", "en"]) {
    assert.match(seen[locale], /Payment Initiation Capability/, `${locale}: L2's canonical name`);
    assert.match(seen[locale], /Inter-Operator Interoperability/, `${locale}: L3's canonical name`);
  }
});
