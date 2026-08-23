// The GROUNDED SEMANTIC CLAIM CONTRACT at runtime: obligation → generation → validation → at most one
// repair → success, or a failure that keeps the subject.
//
// The engine could already find knowledge, converse, compare, split authority and ground a model. The
// link that was missing is this one: for THIS question these propositions are obligatory, this evidence
// must be able to support them, and generation may not succeed while omitting them.
//
// The synthesis is stubbed so the model's output is the variable under test. That is the point — the
// contract exists to hold whatever the model returns, and the only way to prove it holds is to hand it
// answers that are wrong in each of the specific ways production was wrong.

import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./_pipeline-harness.mjs";
import { canaryProvider } from "./_production-canary.mjs";

const CONF_Q = "In what way is conformance to the protocol proven?";
const FC_Q = "What is fail-closed?";

// A grounded synthesis result shaped like the real one.
function grounded(text, sourceIds) {
  return {
    status: "grounded",
    answer_markdown: text,
    cited_source_ids: sourceIds,
    entity_id: "",
    primary_intent: "explain_concept",
    package_hash: "test",
    clarification_candidates: [],
    verdict: { ok: true, errors: [] },
    // The real fact shape: the source lives under `f.source.document_id`, which is what both the
    // citation mapper and the claim-evidence check read.
    package: {
      facts: sourceIds.map((id) => ({
        source: { document_id: id, title: id, path: "contracts/production/normative-manifest.json" },
        text,
      })),
    },
    trace: { output_status: "ok" },
  };
}

// Answers the first call one way and the second another, so the bounded repair is observable.
//
// Named `firstThenRepair` rather than for the two passes: "two-pass" is a RETIRED architecture in this
// repository and a guard keeps the name out of active code. That guard is right — a helper here is not
// worth eroding a name that means something else.
//
// By INVOCATION, not by inspecting the options: the harness records only the stub's first argument
// (the question), so a stub that keys off `args.repairClaims` never sees it and silently returns the
// first answer twice — which reads exactly like "the repair did not help".
function firstThenRepair(first, repair) {
  let n = 0;
  return () => {
    n += 1;
    return Promise.resolve(n === 1 ? first : repair);
  };
}

async function ask(question, locale, synthesis) {
  const c = canaryProvider("UNUSED");
  const h = harness({ provider: c.provider, synthesis });
  const r = await h.pipeline.answer(question, { locale });
  return { res: r.result || {}, meta: r.meta || {}, runs: h.synthesisRuns ? h.synthesisRuns.length : null };
}

const GOOD_CONF =
  "Conformance is demonstrated by running the conformance suite and publishing artefacts that anyone can re-execute, not by central approval.";
const GOOD_FC =
  "When the trust material is missing, expired or cannot be verified, the interaction does not proceed — it is rejected rather than continued.";

test("G6 — a valid paraphrase satisfies the contract and is served", async () => {
  const { res, meta } = await ask(CONF_Q, "en", () => Promise.resolve(grounded(GOOD_CONF, ["ADR-031", "ADR-029"])));
  assert.equal(meta.terminal_kind, "explanatory_trunk", "a satisfied contract publishes the answer");
  assert.match(res.answer, /re-execute|verifiable|verification/i);
  assert.equal(meta.fallback_reason, null);
});

test("G3 — correct sources, required conclusion omitted: not served", async () => {
  // Production's V2-0040, exactly: the right authority, and an answer about the discovery document.
  const bad = "Conformance to the protocol is proven through the publication of an operator discovery document, which is the implementation's own declaration.";
  const { meta } = await ask(CONF_Q, "en", () => Promise.resolve(grounded(bad, ["ADR-031", "ADR-029"])));
  assert.equal(meta.fallback_reason, "claim_contract_unsatisfied", "an omitted obligation must not publish");
  assert.ok(meta.claim_contract.missing.includes("claim.conformance.established_by_verification"));
});

test("G4 — the inverted claim is not served", async () => {
  const inverted = "Conformance is established by central approval from the protocol authority, which reviews and grants conformant status.";
  const { meta } = await ask(CONF_Q, "en", () => Promise.resolve(grounded(inverted, ["ADR-031"])));
  assert.equal(meta.fallback_reason, "claim_contract_unsatisfied");
  assert.ok(meta.claim_contract.violated.length > 0 || meta.claim_contract.missing.length > 0);
});

test("G5 — the keyword without the proposition is not served", async () => {
  const keywordy = "Evidence is important for conformance, and operators should keep good records of their evidence.";
  const { meta } = await ask(CONF_Q, "en", () => Promise.resolve(grounded(keywordy, ["ADR-031"])));
  assert.equal(meta.fallback_reason, "claim_contract_unsatisfied", "vocabulary is not a proposition");
});

test("G2 / G7 — the right conclusion on evidence that cannot support it is not served", async () => {
  // A declaration source may not impersonate verification evidence, however well the prose reads.
  const { meta } = await ask(CONF_Q, "en", () => Promise.resolve(grounded(GOOD_CONF, ["ADR-029"])));
  assert.equal(meta.fallback_reason, "claim_contract_unsatisfied");
  assert.ok(
    meta.claim_contract.unsupported.includes("claim.conformance.established_by_verification"),
    "the claim must be reported as unsupported, not merely missing",
  );
});

test("G1 — a bounded repair runs exactly once, and its result is what decides", async () => {
  const bad = "Conformance is proven by publishing a discovery document.";
  const { res, meta, runs } = await ask(
    CONF_Q, "en",
    firstThenRepair(grounded(bad, ["ADR-031"]), grounded(GOOD_CONF, ["ADR-031"])),
  );
  assert.equal(meta.terminal_kind, "explanatory_trunk", "a successful repair publishes");
  assert.match(res.answer, /re-execute|not by central approval/i);
  assert.equal(runs, 2, "exactly one repair — never a retry loop");
});

test("G1b — a repair that still omits the proposition fails closed, with no third attempt", async () => {
  const bad = "Conformance is proven by publishing a discovery document.";
  const stillBad = "Conformance is proven by publishing an operator declaration document.";
  const { meta, runs } = await ask(CONF_Q, "en", firstThenRepair(grounded(bad, ["ADR-031"]), grounded(stillBad, ["ADR-031"])));
  assert.equal(meta.fallback_reason, "claim_contract_unsatisfied");
  assert.equal(runs, 2, "one generation and one repair, and then it stops");
});

test("S1 / G9 — a synthesis failure keeps the subject", async () => {
  // V2-0379 and V2-0380: a fail-closed question whose synthesis did not satisfy the contract was
  // answered about trust evaluation. A failure to explain X must remain about X.
  const offSubject = "In BANZA trust is evaluated from verifiable evidence, with no central certifying authority.";
  const { res, meta } = await ask(FC_Q, "en", () => Promise.resolve(grounded(offSubject, ["ADR-025"])));
  assert.equal(meta.fallback_reason, "claim_contract_unsatisfied", "an off-subject answer must not be served");
  assert.equal(meta.claim_contract.subject, "how-trust-works");
  assert.ok(
    meta.claim_contract.required.includes("claim.failclosed.unsatisfied_condition_does_not_proceed"),
    "the failure must still be about the fail-closed obligation",
  );
  assert.doesNotMatch(res.answer || "", /central certifying authority/i, "the trust-evaluation answer must not be served");
});

test("G6b — the same contract holds in Portuguese, with the same claim id", async () => {
  const goodPt = "Quando o material de confiança está em falta ou expirado, a interação não prossegue — é rejeitada em vez de continuar.";
  const { meta } = await ask("O que é fail-closed?", "pt-PT", () => Promise.resolve(grounded(goodPt, ["ADR-025"])));
  assert.equal(meta.terminal_kind, "explanatory_trunk", "PT must satisfy the same obligation");
});

test("a question that owes no claim is unaffected", async () => {
  // The contract must not become a tax on every grounded answer.
  const { meta, runs } = await ask("Como funciona a confiança no BANZA?", "pt-PT",
    () => Promise.resolve(grounded("A confiança é avaliada localmente por evidência verificável.", ["ADR-025"])));
  assert.equal(meta.terminal_kind, "explanatory_trunk");
  assert.equal(runs, 1, "no obligation, no repair");
});

test("G8 — the model's own claim metadata does not establish anything", async () => {
  // A model asserting "I satisfied claim X" is not evidence that the prose does. Validation reads the
  // delivered text; self-report is not an input, and this pins that it never becomes one.
  const lying = {
    ...grounded("Conformance is proven by publishing a discovery document.", ["ADR-031"]),
    satisfied_claim_ids: ["claim.conformance.established_by_verification"],
    claims_satisfied: true,
    verdict: { ok: true, errors: [], satisfied_claims: ["claim.conformance.established_by_verification"] },
  };
  const { meta } = await ask(CONF_Q, "en", () => Promise.resolve(lying));
  assert.equal(
    meta.fallback_reason,
    "claim_contract_unsatisfied",
    "a self-reported claim must not rescue prose that omits the proposition",
  );
  assert.ok(meta.claim_contract.missing.includes("claim.conformance.established_by_verification"));
});
