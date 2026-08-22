// A HYBRID is one subject plus a request about BANZA's relation to it — not a comparison.
//
// Conflating the two is what left "settlement vs what BANZA specifies" looking permanently
// unsupported. A comparison has two genuine semantic targets: `clearing` and `settlement`, `L2` and
// `L3`. A hybrid has ONE subject and a RELATION request, and "what BANZA specifies" is not a concept.
// Forcing that phrase into a concept table to make a comparison matrix read 22/22 would have invented
// a concept nobody named, and would have reported a capability that did not exist.
//
// The authority split is the property, not the prose. DOMAIN evidence may establish what the subject
// means in general; only BANZA evidence may establish what BANZA requires, does, does not do, or
// leaves to implementations. That separation is enforced before composition, so a domain source can
// never end up standing behind a sentence about what the protocol demands.

import test from "node:test";
import assert from "node:assert/strict";
import { harness } from "./_pipeline-harness.mjs";
import { canaryProvider } from "./_production-canary.mjs";

const INVENTED = "BANZA centrally performs settlement for all operators.";

async function ask(q, locale) {
  const c = canaryProvider(INVENTED);
  const h = harness({ provider: c.provider });
  const r = await h.pipeline.answer(q, { locale });
  return { result: r.result || {}, meta: r.meta || {} };
}

test("the reference case resolves as a hybrid relation, in both locales", async () => {
  for (const [q, loc] of [
    ["qual a diferenca entre settlement e o que o banza especifica", "pt-PT"],
    ["what is the difference between settlement and what banza specifies", "en"],
  ]) {
    const { result, meta } = await ask(q, loc);
    assert.equal(meta.terminal_kind, "hybrid_relation", `${q}: must be planned as a relation`);
    assert.equal(meta.hybrid_subject, "def-settlement", `${q}: settlement is the subject`);
    assert.equal(meta.hybrid_relation, "specifies", `${q}: the relation asked for`);
    assert.equal(result.answer_locale, loc);
    assert.ok(!String(result.answer || "").includes(INVENTED), `${q}: the model's prose must not appear`);
  }
});

test("the relation family is one capability, not four special cases", async () => {
  for (const [q, loc, rel] of [
    ["como e que settlement se relaciona com o banza", "pt-PT", "relates"],
    ["does banza perform settlement", "en", "performs"],
    ["o banza exige um ledger", "pt-PT", "requires"],
  ]) {
    const { meta } = await ask(q, loc);
    assert.equal(meta.terminal_kind, "hybrid_relation", `${q}`);
    assert.equal(meta.hybrid_relation, rel, `${q}`);
  }
});

// ── H1 · the BANZA half must actually be there ───────────────────────────────────────────────────
//
// The first version of this asserted only that the model's prose was absent and that some source was
// attached. Both survived a mutation that dropped the BANZA half from the composed answer, and a
// mutation that let a DOMAIN subject supply its own BANZA half. A hybrid whose BANZA half is missing
// is a domain definition wearing a relation's frame, and neither assertion could see it.
const BANZA_HALF = {
  "pt-PT": /\*\*(O que o BANZA especifica|Relação com o BANZA|O BANZA faz isto\?|O BANZA exige isto\?)\*\*/,
  en: /\*\*(What BANZA specifies|Relationship to BANZA|Does BANZA do this\?|Does BANZA require this\?)\*\*/,
};

test("the BANZA half is present and separated from the subject half", async () => {
  for (const [q, loc] of [
    ["qual a diferenca entre settlement e o que o banza especifica", "pt-PT"],
    ["what is the difference between settlement and what banza specifies", "en"],
    ["o banza exige um ledger", "pt-PT"],
  ]) {
    const { result, meta } = await ask(q, loc);
    assert.equal(meta.terminal_kind, "hybrid_relation", `${q}`);
    const answer = String(result.answer || "");
    assert.match(answer, BANZA_HALF[loc], `${q}: the BANZA half is missing from the answer`);
    // And the two halves are genuinely separated, not one paragraph claiming to be both.
    assert.ok(answer.split("\n\n").length >= 2, `${q}: the halves must be visibly distinct`);
  }
});

test("a BANZA-specific claim never rests on a DOMAIN source alone", async () => {
  for (const [q, loc] of [
    ["qual a diferenca entre settlement e o que o banza especifica", "pt-PT"],
    ["o banza exige um ledger", "pt-PT"],
  ]) {
    const { result } = await ask(q, loc);
    const sources = result.sources || [];
    assert.ok(sources.length > 0, `${q}: a relation answer must be sourced`);
    const banza = sources.filter((s) => (s.class || "banza") !== "domain");
    assert.ok(
      banza.length > 0,
      `${q}: the BANZA half must carry BANZA authority, saw only ${sources.map((s) => s.id).join(",")}`,
    );
  }
});

// MUTATION RESULT, recorded because a single-guard removal survives.
//
// Two independent guards hold this: `banzaEntry` is null for a domain subject, and the BANZA half's
// sources are filtered to exclude the domain class. Removing either one alone leaves the other holding
// the line, so neither mutation on its own goes red. Removing BOTH does.
//
// That is defence in depth rather than a hole, and it is written down because from outside a surviving
// mutation looks exactly like an untested property. It is not: the property is guarded twice.
test("a pure DOMAIN subject with no specific BANZA authority is not served as a relation", async () => {
  // There is no generic "BANZA's position on X" entry, and inventing one by pairing every domain
  // concept with a catch-all would be the generic collapse this programme removed, in a new costume.
  // A nonce has a domain definition and no BANZA relation record; the relation must not be manufactured.
  const { meta } = await ask("como e que um nonce se relaciona com o banza", "pt-PT");
  assert.notEqual(
    meta.terminal_kind,
    "hybrid_relation",
    "a relation with no specific BANZA authority must not be composed",
  );
});

// ── H3 · the answer must not invent a central BANZA settlement function ──────────────────────────
test("the answer never claims BANZA centrally performs settlement", async () => {
  for (const [q, loc, forbidden] of [
    ["qual a diferenca entre settlement e o que o banza especifica", "pt-PT", /o BANZA (liquida|faz settlement)\b(?!.*n[ãa]o)/i],
    ["what is the difference between settlement and what banza specifies", "en", /BANZA (settles|performs settlement)\b(?!.*not)/i],
  ]) {
    const { result } = await ask(q, loc);
    assert.doesNotMatch(String(result.answer || ""), forbidden, `${q}: invented a central settlement function`);
  }
});

test("'no BANZA' is a scope qualifier, not a request for a relation", async () => {
  // "o que significa Resiliente no BANZA?" asks what the Fundamental Principle means. Reading `no
  // BANZA` as a relation phrase took it away from `def-r2s2` and paired it with an unrelated entry.
  const { result, meta } = await ask("o que significa Resiliente no BANZA?", "pt-PT");
  assert.notEqual(meta.terminal_kind, "hybrid_relation", "a scope qualifier must not plan a relation");
  assert.match(String(result.answer || ""), /Resiliente/, "the principle must still be stated");
});

test("a two-concept comparison is still a comparison", async () => {
  const { meta } = await ask("qual a diferenca entre clearing e settlement", "pt-PT");
  assert.equal(meta.terminal_kind, "comparison", "two genuine targets stay a comparison");
});

// ── PROPERTY-LEVEL · the forbidden BEHAVIOUR cannot become PASS ───────────────────────────────────
//
// The mutations above target ENFORCEMENT: remove one guard and the other still holds, which is defence
// in depth rather than proof. What follows targets the PROPERTY itself, and it is asserted on the
// DELIVERED ANSWER rather than on any mechanism, so it holds however the answer came to be.
//
// The forbidden behaviour, stated exactly: an answer that makes a BANZA-SPECIFIC factual claim while
// carrying no eligible BANZA authority. That is the shape of "BANZA performs settlement" written from a
// source that only defines settlement — the claim the whole authority split exists to prevent.
//
// This does not ask which guard stopped it. It asks whether any served answer exhibits it.

/** Sentences that assert something about what BANZA itself does, requires or is. */
const BANZA_SPECIFIC_CLAIM = [
  /\bBANZA\b[^.!?]{0,80}\b(exige|requer|define|garante|proíbe|permite|faz|liquida|processa|mantém|guarda)\b/i,
  /\bBANZA\b[^.!?]{0,80}\b(requires|defines|guarantees|prohibits|permits|performs|settles|processes|holds|keeps)\b/i,
];

function makesBanzaSpecificClaim(text) {
  return BANZA_SPECIFIC_CLAIM.some((re) => re.test(String(text || "")));
}

function hasEligibleBanzaAuthority(sources) {
  return (sources || []).some((s) => s && (s.class || "banza") !== "domain");
}

test("PROPERTY — a relation answer always carries eligible BANZA authority", async () => {
  // The invariant stated directly on the DELIVERED RESULT, not on any mechanism.
  //
  // A `hybrid_relation` answer contains a half that claims to state BANZA's position on the subject.
  // Whatever that half happens to say, an eligible BANZA source must stand behind it — otherwise the
  // protocol's position is being asserted from a document that never discusses the protocol.
  //
  // This is what the enforcement-level mutations could not prove. Removing both guards produces exactly
  // the forbidden shape: `como é que um nonce se relaciona com o BANZA` served as a relation with
  // `NIST-CSRC:domain` as its only source. The prose in that case makes no false claim about BANZA, so
  // a prose-matching assertion stays green while the property is plainly violated. This one does not.
  const QUERIES = [
    ["qual a diferenca entre settlement e o que o banza especifica", "pt-PT"],
    ["what is the difference between settlement and what banza specifies", "en"],
    ["como e que settlement se relaciona com o banza", "pt-PT"],
    ["how does settlement relate to banza", "en"],
    ["does banza perform settlement", "en"],
    ["o banza exige um ledger", "pt-PT"],
    ["como e que um nonce se relaciona com o banza", "pt-PT"],
    ["how does a hash relate to banza", "en"],
    ["como e que uma assinatura digital se relaciona com o banza", "pt-PT"],
  ];
  const violations = [];
  for (const [q, loc] of QUERIES) {
    const { result, meta } = await ask(q, loc);
    if (meta.terminal_kind !== "hybrid_relation") continue;
    if (!hasEligibleBanzaAuthority(result.sources)) {
      violations.push(
        `${q} → served as a relation with only ${(result.sources || []).map((s) => s.id + ":" + (s.class || "banza")).join(",") || "no sources"}`,
      );
    }
  }
  assert.deepEqual(
    violations,
    [],
    "relation answers stating BANZA's position with no BANZA authority behind them:\n  " + violations.join("\n  "),
  );
});

test("PROPERTY — no served answer makes a BANZA-specific claim without BANZA authority", async () => {
  // Swept across the hybrid family and its neighbours, in both locales. The assertion is on what was
  // delivered: if the prose asserts something about BANZA, an eligible BANZA source must stand behind
  // it. No mechanism is named, so no rearrangement of the mechanisms can satisfy it vacuously.
  const QUERIES = [
    ["qual a diferenca entre settlement e o que o banza especifica", "pt-PT"],
    ["what is the difference between settlement and what banza specifies", "en"],
    ["como e que settlement se relaciona com o banza", "pt-PT"],
    ["how does settlement relate to banza", "en"],
    ["does banza perform settlement", "en"],
    ["o banza faz settlement", "pt-PT"],
    ["o banza exige um ledger", "pt-PT"],
    ["does banza require a ledger", "en"],
    ["como e que um nonce se relaciona com o banza", "pt-PT"],
    ["how does a hash relate to banza", "en"],
    ["como e que uma assinatura digital se relaciona com o banza", "pt-PT"],
  ];
  const violations = [];
  for (const [q, loc] of QUERIES) {
    const { result } = await ask(q, loc);
    const answer = String(result.answer || "");
    if (makesBanzaSpecificClaim(answer) && !hasEligibleBanzaAuthority(result.sources)) {
      violations.push(`${q} → ${(result.sources || []).map((s) => s.id + ":" + (s.class || "banza")).join(",") || "no sources"}`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    "answers asserting something about BANZA with no BANZA authority behind them:\n  " + violations.join("\n  "),
  );
});
