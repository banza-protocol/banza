// GENERATOR — Benchmark V2, derived FROM the frozen semantic universe.
//
// The direction matters: the universe declares what must be supported, and this walks it to produce the
// questions that exercise each unit. Nothing here invents a unit, and no unit is skipped because it
// looks hard — an item that fails is a failure to fix, not a row to delete.
//
// Each item carries its semantic_unit_ids, so coverage is traceable. An item with no unit id does not
// contribute to universe coverage, by construction: the closed-world guard rejects it.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const universe = JSON.parse(readFileSync(join(ROOT, "assurance/banzai-knowledge/semantic-universe.json"), "utf8"));
const domainConcepts = JSON.parse(readFileSync(join(ROOT, "assurance/banzai-knowledge/domain-concepts.json"), "utf8")).concepts;
const probes = JSON.parse(readFileSync(join(ROOT, "assurance/banzai-knowledge/unit-probes.json"), "utf8"));

const byId = new Map(domainConcepts.map((c) => [c.id, c]));
const items = [];
let n = 0;
const push = (o) => items.push({ question_id: `V2-${String(++n).padStart(4, "0")}`, ...o });

for (const u of universe.units) {
  const p = probes.probes[u.semantic_id];
  if (!p) continue; // reported by the closed-world guard, never silently dropped
  for (const locale of ["pt-PT", "en"]) {
    const forms = p[locale];
    if (!forms) continue;
    if (forms.direct) {
      push({ semantic_unit_ids: [u.semantic_id], capability_unit_ids: p.capabilities || [], locale,
             intent: p.intent || "direct", criticality: u.criticality, form: "direct",
             question: forms.direct, must: p.must?.[locale] || [], must_not: p.must_not?.[locale] || [],
             authority_class: u.authority_class, acceptable_refusal: Boolean(p.acceptable_refusal) });
    }
    if (forms.paraphrase && u.paraphrase_required) {
      push({ semantic_unit_ids: [u.semantic_id], capability_unit_ids: p.capabilities || [], locale,
             intent: p.intent || "direct", criticality: u.criticality, form: "paraphrase",
             question: forms.paraphrase, must: p.must?.[locale] || [], must_not: p.must_not?.[locale] || [],
             authority_class: u.authority_class, acceptable_refusal: Boolean(p.acceptable_refusal) });
    }
  }
}
// ── MULTI-TURN JOURNEYS ──────────────────────────────────────────────────────────────────────────
// A conversational capability is a claim about turn N resolving against turn N-1, and a corpus of
// single questions cannot exercise it at all. V2 had 564 items and not one conversation: the
// followup capabilities were declared, owned by unit tests, and never touched in production.
//
// Each turn carries its own expectation, so a journey fails at the turn that broke rather than as one
// opaque row.
for (const j of probes.journeys || []) {
  push({
    semantic_unit_ids: j.semantic_unit_ids,
    capability_unit_ids: j.capabilities || [],
    locale: j.locale,
    intent: "MULTI_TURN",
    criticality: j.criticality,
    form: "journey",
    question: j.turns[0].question,
    turns: j.turns,
    must: [],
    must_not: [],
    authority_class: "BANZA",
    acceptable_refusal: false,
  });
}

void byId;

const hash = createHash("sha256").update(JSON.stringify(items)).digest("hex").slice(0, 32);
const out = { schema_version: 1, _generated_by: "tools/gen-banzai-benchmark-v2.mjs",
              universe_hash: universe.universe_hash, corpus_hash: hash, count: items.length, items };
writeFileSync(join(ROOT, "assurance/banzai-knowledge/benchmark-v2.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`  wrote assurance/banzai-knowledge/benchmark-v2.json`);
console.log(`  items: ${items.length}   corpus hash: ${hash}   universe hash: ${universe.universe_hash}`);
