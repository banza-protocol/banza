// GENERATOR — the BanzAI semantic universe: the DECLARED SUPPORT UNIVERSE.
//
// NON-CIRCULARITY is the point of this file. The universe is derived from AUTHORITY and from the
// engine's DECLARED capabilities — the invariant registry, the canonical profile registry, the derived
// lifecycle facts, the DOMAIN source registry, the declared domain concepts and an explicit capability
// list. It is never derived from tests, benchmark prompts, passing answers or oracle rows: a universe
// read off the benchmark would make the benchmark self-defining, and every coverage number computed
// from it would be a tautology.
//
// The direction is one-way and must stay that way:
//
//     authority + registries + declared capabilities  →  universe  →  coverage requirements  →  corpus
//
// The universe says WHAT must be supported. It never records an expected wording: how a unit is
// answered is the engine's business and the oracle's, not the denominator's.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const { ENTRIES, DOMAIN_SOURCE_REGISTRY } = await import(join(ROOT, "services/banzai-api/src/knowledge.js"));

const invariants = read("contracts/invariants.json");
const profiles = read("services/banzai-api/src/canonicalProfiles.generated.json");
const lifecycle = read("services/banzai-api/src/lifecycleFacts.generated.json").facts;
const domainTerms = read("engines/banzai-query-core/src/domain-terms.json").concepts;

const units = [];
const add = (u) => units.push({ paraphrase_required: true, direct_question_required: true, current: true, ...u });

// ── BANZA_NORMATIVE — the invariant registry, by FAMILY ──────────────────────────────────────────
//
// The unit is the FAMILY, not the individual invariant id, and the granularity is a deliberate
// classification rather than a convenience. A reader asks "what are the ledger invariants?" or "does
// BANZA guarantee idempotency?" — nobody asks about INV-LEDGER-003 by number. An individual id is an
// artifact identifier; the family is the fact BanzAI serves.
//
// The members are recorded on the unit, so the mapping back to the registry stays exact and a family
// that gains or loses an invariant is visible here.
//
// This is decided from the registry's own shape, before any benchmark exists — not after seeing which
// ids were awkward to probe.
const families = new Map();
for (const inv of invariants.invariants) {
  if (inv.severity !== "critical") continue;
  const fam = inv.id.split("-").slice(0, 2).join("-");
  if (!families.has(fam)) families.set(fam, []);
  families.get(fam).push(inv.id);
}
for (const [fam, members] of families) {
  // A DEGENERATE family: MON-001 has no `INV-<FAMILY>-<N>` shape, so its family key IS its member id
  // and the family unit would collide with the atomic unit below — two units, one semantic id, and a
  // universe whose declared total counts one of them twice. There is no family abstraction to make
  // here: MON-001 is a standalone invariant, not a group, so only the atomic unit is emitted.
  if (members.length === 1 && members[0].toLowerCase() === fam.toLowerCase()) continue;
  add({
    semantic_id: `banza.invariant.${fam.toLowerCase()}`,
    members,
    unit_type: "fact",
    knowledge_class: "BANZA_NORMATIVE",
    authority_class: "BANZA",
    source_ids: ["invariants"],
    criticality: "P1",
    reader_facing: true,
    PT_required: true,
    EN_required: true,
    comparison_eligible: false,
    conversation_eligible: false,
    hybrid_eligible: false,
    runtime_truth: false,
    owning_component: "engines/banzai-query-core",
  });
}

// ── BANZA_NORMATIVE — the invariant registry, by INDIVIDUAL MEMBER ───────────────────────────────
//
// The family above is the reader's framing. It is NOT the unit of falsifiability, and the atomicity
// audit (assurance/banzai-knowledge/invariant-atomicity.json) settled that by reading all 55 critical
// members and asking of each: can this proposition be true while a sibling in the same family is false?
// For all 55 the answer is yes. INV-LEDGER-002 (append-only) and INV-LEDGER-003 (integers, never
// floats) are not one fact about ledgers; an implementation can hold either and break the other.
//
// So a family unit alone lets a member regress invisibly: an answer that states double-entry and says
// nothing about immutability still satisfies a family-level probe. Both granularities are therefore
// units — the family for "what are the ledger invariants?", the member for the proposition itself.
//
// The member carries the DIRECT question in both locales; the family carries the paraphrase. That
// split is a declaration about where each burden sits, not a reduction of it: every one of the 55
// propositions is independently probed in PT and EN, and the reader-facing paraphrase is owned by the
// framing a reader actually uses.
for (const inv of invariants.invariants) {
  if (inv.severity !== "critical") continue;
  add({
    semantic_id: `banza.invariant.${inv.id.toLowerCase()}`,
    member_of: `banza.invariant.${inv.id.split("-").slice(0, 2).join("-").toLowerCase()}`,
    registry_id: inv.id,
    unit_type: "fact",
    knowledge_class: "BANZA_NORMATIVE",
    authority_class: "BANZA",
    source_ids: ["invariants"],
    criticality: "P1",
    reader_facing: true,
    PT_required: true,
    EN_required: true,
    direct_question_required: true,
    paraphrase_required: false,
    comparison_eligible: false,
    conversation_eligible: false,
    hybrid_eligible: false,
    runtime_truth: false,
    owning_component: "engines/banzai-query-core",
  });
}

// ── BANZA_CANONICAL — the conformance profile registry ───────────────────────────────────────────
for (const p of profiles.profiles) {
  add({
    semantic_id: `banza.profile.${p.level.toLowerCase()}.definition`,
    unit_type: "fact",
    knowledge_class: "BANZA_CANONICAL",
    authority_class: "BANZA",
    source_ids: ["CONFORMANCE-PROFILES"],
    criticality: "P1",
    reader_facing: true,
    PT_required: true,
    EN_required: true,
    comparison_eligible: true,
    conversation_eligible: true,
    hybrid_eligible: false,
    runtime_truth: false,
    owning_component: "engines/banzai-query-core",
  });
}

// ── RUNTIME_TRUTH — the derived lifecycle facts ──────────────────────────────────────────────────
for (const [k, v] of Object.entries(lifecycle)) {
  if (k.startsWith("_")) continue;
  add({
    semantic_id: `banza.status.${k}`,
    unit_type: "fact",
    knowledge_class: "RUNTIME_TRUTH",
    authority_class: "BANZA",
    source_ids: ["protocol_state"],
    criticality: "P0",
    reader_facing: true,
    PT_required: true,
    EN_required: true,
    comparison_eligible: false,
    conversation_eligible: true,
    hybrid_eligible: false,
    runtime_truth: true,
    declared_value: String(v),
    owning_component: "services/banzai-api/src/lifecycleFacts.generated.json",
  });
}

// ── BANZA_NORMATIVE — institutional separations and byte-form rules ──────────────────────────────
// Facts the protocol states in its decision records. Declared here because they are what a reader most
// needs BanzAI to get right, and because getting one of them wrong is the failure this whole programme
// has been repairing.
const NORMATIVE_FACTS = [
  ["banza.certification.not_admission", ["ADR-005"], "P0"],
  ["banza.certification.not_regulatory_authorisation", ["ADR-005", "ADR-007"], "P0"],
  ["banza.admission.not_authorisation", ["ADR-005", "ADR-006"], "P0"],
  ["banza.banzai.non_authoritative", ["ADR-036"], "P0"],
  ["banza.reference_implementation.does_not_define", ["ADR-002", "ADR-035"], "P0"],
  ["banza.bcj1.duplicate_keys_rejected", ["SPEC"], "P1"],
  ["banza.bcj1.no_unicode_normalization", ["SPEC"], "P1"],
  ["banza.bcj1.integer_domain", ["SPEC"], "P1"],
  ["banza.idempotency.scope", ["ADR-022"], "P1"],
  ["banza.trust.root.count", ["SPEC-FED-TRUST"], "P0"],
  ["banza.trust.root.threshold", ["SPEC-FED-TRUST"], "P0"],
  ["banza.trust.no_global_transparency", ["SPEC-FED-TRUST"], "P1"],
  ["banza.trust.fail_closed", ["SPEC-FED-TRUST"], "P1"],
  ["banza.execution.local_no_central_processor", ["SPEC-OVERVIEW"], "P0"],
  ["banza.execution.no_global_consensus", ["SPEC-OVERVIEW"], "P0"],
  ["banza.implementation.technology_independent", ["ADR-002"], "P1"],
  ["banza.protocol.holds_no_funds", ["ADR-001", "ADR-013"], "P0"],
  ["banza.state_store.not_a_ledger", ["ADR-013"], "P1"],
  ["banza.r2s2.four_principles", ["ADR-040"], "P1"],
  ["banza.resilience.never_overrides_security", ["ADR-040"], "P0"],
];
for (const [id, srcs, crit] of NORMATIVE_FACTS) {
  add({
    semantic_id: id,
    unit_type: "fact",
    knowledge_class: "BANZA_NORMATIVE",
    authority_class: "BANZA",
    source_ids: srcs,
    criticality: crit,
    reader_facing: true,
    PT_required: true,
    EN_required: true,
    comparison_eligible: id.includes("certification") || id.includes("admission"),
    conversation_eligible: true,
    hybrid_eligible: false,
    runtime_truth: false,
    owning_component: "engines/banzai-query-core",
  });
}

// ── BANZA_CANONICAL — the conformance and evidence vocabulary ────────────────────────────────────
// These were reader-facing critical entries mapping to no unit at all: the orphan audit classified
// them B — real, live authority that the generator simply never enumerated. Conformance, PASS,
// evidence and the evidence bundle are the L2 vocabulary the whole certification boundary rests on;
// leaving them out of the denominator meant a coverage number that excluded the words it depended on.
const CANONICAL_FACTS = [
  ["banza.conformance.definition", ["CONFORMANCE", "FED-EVIDENCE", "ADR-031"], "P0", ["def-conformance"]],
  ["banza.conformance.pass_is_not_a_certificate", ["CONFORMANCE", "FED-EVIDENCE"], "P0", ["def-pass"]],
  ["banza.conformance.demonstrated_by_evidence", ["CONFORMANCE", "ADR-031", "ADR-029"], "P0", ["how-to-demonstrate-conformance"]],
  ["banza.evidence.definition", ["FED-EVIDENCE", "CONFORMANCE"], "P1", ["def-evidence"]],
  ["banza.evidence_bundle.definition", ["FED-EVIDENCE", "CONFORMANCE"], "P1", ["def-evidence-bundle", "example-evidence-bundle"]],
  ["banza.three_layer_architecture", ["ADR-004"], "P0", ["def-three-layer-architecture"]],
];
for (const [id, srcs, crit, entryIds] of CANONICAL_FACTS) {
  add({
    semantic_id: id,
    unit_type: "fact",
    knowledge_class: "BANZA_CANONICAL",
    authority_class: "BANZA",
    source_ids: srcs,
    entry_ids: entryIds,
    criticality: crit,
    reader_facing: true,
    PT_required: true,
    EN_required: true,
    comparison_eligible: id.includes("pass_is_not") || id.includes("conformance.definition"),
    conversation_eligible: true,
    hybrid_eligible: false,
    runtime_truth: false,
    owning_component: "engines/banzai-query-core",
  });
}

// ── BANZA_SUPPORTING — authoritative about the PROJECT, not binding on an implementation ─────────
// The class existed in the taxonomy and had no generator path: it was empty not because nothing
// belonged in it, but because nothing was ever put in it — and the non-vacuity guard omitted it from
// its own list of classes, so the hole was invisible from both sides.
//
// What belongs here is real authority that does NOT bind a protocol implementation: the licence, the
// attribution notice, the governance rules and the decision register. An operator implementing BANZA
// is not made non-conformant by any of them, so they are not normative — but BanzAI must answer them
// correctly, so they are units.
const SUPPORTING_FACTS = [
  ["banza.license.apache_2_0", ["LICENSE", "NOTICE"], "P1", ["protocol-license"]],
  ["banza.notice.attribution", ["NOTICE", "GOVERNANCE"], "P2", ["notice-content"]],
  ["banza.adr.decision_register", ["ADR-INDEX"], "P2", ["protocol-decisions-adrs"]],
];
for (const [id, srcs, crit, entryIds] of SUPPORTING_FACTS) {
  add({
    semantic_id: id,
    unit_type: "fact",
    knowledge_class: "BANZA_SUPPORTING",
    authority_class: "BANZA",
    source_ids: srcs,
    entry_ids: entryIds,
    criticality: crit,
    reader_facing: true,
    PT_required: true,
    EN_required: true,
    comparison_eligible: false,
    conversation_eligible: true,
    hybrid_eligible: false,
    runtime_truth: false,
    owning_component: "engines/banzai-query-core",
  });
}

// ── REPO_TRUTH — what this repository actually contains and runs ─────────────────────────────────
// Orphan class E. These entries describe the engine, the guards, the indexer and CI — reader-facing
// knowledge with no PROTOCOL authority behind it, which is exactly why the old guard waved them
// through as "legitimately unmapped". They are not unmappable; they are a different KIND of truth,
// and it is verifiable truth: it is checkable against the repository at the commit that serves it.
//
// Giving them a class rather than an exemption is the difference between a declared boundary and a
// blind spot. `current: false` is not used here — every one of these is true of the current tree.
const REPO_FACTS = [
  ["repo.banzai.retrieval_pipeline", "P1", ["banzai-retrieval"]],
  ["repo.banzai.answer_pipeline", "P1", ["how-banzai-answers"]],
  ["repo.banzai.action_boundary_location", "P0", ["action-boundary-location"]],
  ["repo.banzai.guards", "P1", ["guards-banzai"]],
  ["repo.banzai.indexer_crate", "P2", ["banzai-index-crate"]],
  ["repo.banzai.index_state", "P2", ["banzai-index-state"]],
  ["repo.banzai.ci_jobs", "P2", ["banzai-ci"]],
  ["repo.guards.secret_leak", "P0", ["guards-secret-leak"]],
  ["repo.guards.brand_contamination", "P1", ["guard-brand-contamination"]],
  ["repo.operator_zero.middleware", "P2", ["zero-middleware-files"]],
];
for (const [id, crit, entryIds] of REPO_FACTS) {
  add({
    semantic_id: id,
    unit_type: "fact",
    knowledge_class: "REPO_TRUTH",
    authority_class: "REPO",
    source_ids: ["repository"],
    entry_ids: entryIds,
    criticality: crit,
    reader_facing: true,
    PT_required: true,
    EN_required: false,
    paraphrase_required: false,
    comparison_eligible: false,
    conversation_eligible: false,
    hybrid_eligible: false,
    runtime_truth: true,
    owning_component: "services/banzai-api/src/knowledge.js",
  });
}

// ── DOMAIN — the declared concept universe ───────────────────────────────────────────────────────
// The 50 concepts the programme declares support for. A concept answered by a BANZA entry is still a
// domain concept for coverage purposes; its `authority_class` records which layer owns the answer.
const DECLARED_DOMAIN = JSON.parse(readFileSync(join(ROOT, "assurance/banzai-knowledge/domain-concepts.json"), "utf8"));
for (const c of DECLARED_DOMAIN.concepts) {
  add({
    semantic_id: `domain.${c.id}.definition`,
    unit_type: "fact",
    knowledge_class: "DOMAIN",
    authority_class: c.authority_class,
    source_ids: c.source_ids,
    criticality: "P2",
    reader_facing: true,
    PT_required: true,
    EN_required: true,
    comparison_eligible: true,
    conversation_eligible: true,
    hybrid_eligible: Boolean(c.hybrid),
    runtime_truth: false,
    owning_component: c.authority_class === "DOMAIN" ? "engines/banzai-query-core/src/domain.rs" : "engines/banzai-query-core/src/glossary.rs",
  });
}

// ── HYBRID — declared DOMAIN↔BANZA relations ─────────────────────────────────────────────────────
// Declared, not Cartesian. A relation exists here only where BANZA genuinely has a position on the
// concept; inventing 50 × N combinations would manufacture a denominator nobody can satisfy.
const HYBRID_RELATIONS = [
  ["ledger", "storage_boundary", ["ADR-012", "ADR-013", "invariants"]],
  ["clearing", "operational_boundary", ["PROTOCOL-GLOSSARY", "SPEC-OVERVIEW"]],
  ["settlement", "operational_boundary", ["SPEC-OVERVIEW", "invariants"]],
  ["certification", "certification_semantics", ["ADR-032", "ADR-005"]],
  ["authorization", "regulatory_boundary", ["ADR-007", "ADR-005"]],
  ["digital-signature", "trust_usage", ["ADR-025", "SPEC-FED-TRUST"]],
  ["idempotency", "normative_rule", ["ADR-022", "invariants"]],
  ["state-machine", "protocol_state_semantics", ["ADR-013"]],
  ["canonicalization", "byte_form_rule", ["SPEC"]],
];
for (const [concept, relation, srcs] of HYBRID_RELATIONS) {
  add({
    semantic_id: `hybrid.${concept}.banza_${relation}`,
    unit_type: "relation",
    knowledge_class: "HYBRID",
    authority_class: "BANZA_FOR_BANZA_SIDE",
    source_ids: srcs,
    criticality: "P1",
    reader_facing: true,
    PT_required: true,
    EN_required: true,
    comparison_eligible: false,
    conversation_eligible: true,
    hybrid_eligible: true,
    runtime_truth: false,
    domain_evidence_required: true,
    banza_evidence_required: true,
    forbidden_claims: [`BANZA centrally performs ${concept}`],
    owning_component: "engines/banzai-query-core/src/hybrid.rs",
  });
}

// ── CAPABILITY — what the engine must be able to DO ──────────────────────────────────────────────
// Factual coverage can be complete while the engine is still unable to use the facts. Capabilities are
// units, with their own owners, and a capability with no owner is reported UNOWNED rather than omitted.
const CAPABILITIES = JSON.parse(readFileSync(join(ROOT, "assurance/banzai-knowledge/capabilities.json"), "utf8"));
for (const c of CAPABILITIES.capabilities) {
  add({
    semantic_id: c.semantic_id,
    entry_ids: c.entry_ids || [],
    unit_type: "capability",
    knowledge_class: "CAPABILITY",
    authority_class: "ENGINE",
    source_ids: [],
    criticality: c.criticality,
    reader_facing: false,
    PT_required: false,
    EN_required: false,
    direct_question_required: false,
    paraphrase_required: false,
    comparison_eligible: false,
    conversation_eligible: false,
    hybrid_eligible: false,
    runtime_truth: false,
    owning_component: c.owning_component,
    positive_owner: c.positive_owner || null,
    negative_owner: c.negative_owner || null,
    mutation_owner: c.mutation_owner || null,
  });
}

units.sort((a, b) => a.semantic_id.localeCompare(b.semantic_id));
const byClass = {};
for (const u of units) byClass[u.knowledge_class] = (byClass[u.knowledge_class] || 0) + 1;

const body = { schema_version: 1, _generated_by: "tools/gen-banzai-semantic-universe.mjs", counts: { total: units.length, by_class: byClass }, units };
const hash = createHash("sha256").update(JSON.stringify(body.units)).digest("hex").slice(0, 32);
const out = { ...body, universe_hash: hash };
writeFileSync(join(ROOT, "assurance/banzai-knowledge/semantic-universe.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`  wrote assurance/banzai-knowledge/semantic-universe.json`);
console.log(`  units: ${units.length}   hash: ${hash}`);
console.log(`  by class: ${JSON.stringify(byClass)}`);
void DOMAIN_SOURCE_REGISTRY;
void domainTerms;
void ENTRIES;
