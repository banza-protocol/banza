// Every terminal declares the locale it was composed for — including the one that generates prose.
//
// The provenance field is `result.answer_locale`, and `/ask` publishes it from there
// (`server.js`: `answer_locale: result.answer_locale ?? null`). The model terminal passed its locale
// into `meta` instead — a different channel — so the envelope published `null` for every model answer
// that was ever served.
//
// Measured against production at `src-14df955`: `answer_locale` was present on 31/31 deterministic
// terminals and absent on 9/9 `explanatory_trunk` terminals, in both locales. That is not a partial
// gap; it is the whole model path.
//
// It matters because of what accepts the absence. The website's `localeMatches` treats a missing
// declaration as a match, deliberately and with its reasons written down. So the locale gate closed in
// PR #37/#38 was enforced on every path whose text is fixed and reviewed, and silent on the single path
// that composes free text in whatever language the model reached for. The check held where it could not
// matter and said nothing where it could.
//
// This is a BEHAVIOURAL test on purpose. The existing envelope contract reads `server.js` as source
// text, which is why it stayed green through the entire defect: it proves the serving boundary would
// publish the field, never that any composer produces one.

import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./_pipeline-harness.mjs";

const LOCALES = ["pt-PT", "en"];

/** A synthesis stub that replaces TOKEN GENERATION only — the pipeline still decides everything else. */
function groundedStub(answer) {
  return async () => ({
    status: "grounded",
    answer_markdown: answer,
    cited_source_ids: ["ADR-001"],
    entity_id: "",
    primary_intent: "explain_concept",
    package_hash: "",
    clarification_candidates: [],
    verdict: { ok: true },
    package: {
      facts: [
        {
          source: {
            document_id: "ADR-001",
            title: "Open financial protocol",
            path: "decisions/adr/ADR-001-open-financial-protocol-what-banza-is-and-is-not.md",
          },
        },
      ],
    },
    trace: { synthesis_called: true, output_status: "ok", model: "qwen3-4b", claim_verification_ok: true },
  });
}

test("the model terminal declares its locale on the result, where /ask reads it", async () => {
  for (const locale of LOCALES) {
    const h = harness({ synthesis: groundedStub("BANZA is an open financial protocol.") });
    const r = await h.pipeline.answer("explica a relação entre conformidade e federação no BANZA", { locale });
    h.assertSynthesisRan(assert, `synthesis did not run for ${locale}`);
    const result = r.result || {};
    assert.equal(
      result.terminal_kind ?? (r.meta || {}).terminal_kind,
      "explanatory_trunk",
      "this test is meaningless unless it reached the model terminal",
    );
    assert.equal(
      result.answer_locale,
      locale,
      `the model terminal must declare ${locale} on the result, not only in meta`,
    );
  }
});

test("the composer stamps the locale it was given, and does not invent one", async () => {
  // A terminal that stamped a constant would satisfy the assertion above for one locale and lie for the
  // other. Both are exercised, and they must differ.
  const seen = [];
  for (const locale of LOCALES) {
    const h = harness({ synthesis: groundedStub("x") });
    const r = await h.pipeline.answer("explica a relação entre conformidade e federação no BANZA", { locale });
    seen.push((r.result || {}).answer_locale);
  }
  assert.deepEqual(seen, LOCALES, "each request must be answered with its own declaration");
});
