#!/usr/bin/env bash
#
# banzai-canonical-protocol-vocabulary-check (M2.18B.7 / DFN A–F + semantic audit) — regenerates the
# canonical protocol vocabulary from the REAL public corpus + the compiled engine registries and asserts it
# is a SEMANTIC ONTOLOGY (not a lexical index): a two-phase pipeline where noise is rejected in Phase 1
# (protocol-terminology-candidates.json, with reason codes) and only real protocol terminology reaches the
# vocabulary in Phase 2, fully typed — SUBJECT vs ALIAS, DOCUMENT_TYPE vs DOCUMENT_INSTANCE, ARTIFACT_TYPE
# vs instance, RELATION_KIND (closed 11) vs RELATION_ALIAS — every term resolved by REAL resolution (never
# defaulted to OUT_OF_SCOPE), and bidirectionally reconciled with the Subject Registry, the truth table, and
# the engine's 191-row alias table. Not a grep — it drives the extractor + consumes the compiled engine.
#
set -eu
cd "$(dirname "$0")/.."

KB="services/banzai-api/src/rustkb/banzai_api_kb.js"
[ -f "$KB" ] || { echo "banzai-canonical-protocol-vocabulary-check: NEEDS_FIX (missing WASM $KB)" >&2; exit 1; }

echo "BanzAI canonical protocol vocabulary (M2.18B.7 semantic audit) — regenerate from real corpus + engine registries"

# 1. artefacts current vs the corpus + engine (drift = fail).
node tools/gen-banzai-vocabulary.mjs --check

# 2. semantic-ontology invariants + zero-tolerance reconciliation gates.
node --input-type=module <<'NODE'
import { readFileSync } from "node:fs";
const rd = (p) => JSON.parse(readFileSync(p, "utf8"));
const voc = rd("artifacts/m2-18b7/canonical-protocol-vocabulary.json");
const cov = rd("artifacts/m2-18b7/canonical-protocol-vocabulary-coverage.json");
const cand = rd("artifacts/m2-18b7/protocol-terminology-candidates.json");
const recon = rd("artifacts/m2-18b7/vocabulary-alias-reconciliation.json");
const reg = rd("artifacts/m2-18b7/subject-registry.json");
let bad = 0; const fail = (m) => { console.error(`  FAIL: ${m}`); bad++; };
const g = cov.gates || {};
const arr = (x) => Array.isArray(x) ? x : [];

// ── A. derived from a real, broad corpus (not a hand-written list) ──────────────────────────────────
if ((voc.source_registry?.rows?.length || 0) < 100) fail(`too few public sources inventoried (${voc.source_registry?.rows?.length})`);
if (!voc._meta || !voc.source_registry) fail("vocabulary lacks provenance (source registry / _meta) — manual list still authoritative?");
if ((voc.counts?.subjects || 0) < 15) fail(`too few subjects (${voc.counts?.subjects})`);

// ── B. two-phase separation: noise rejected in Phase 1, NOT carried into the vocabulary ──────────────
const rows = arr(cand.rows);
if (rows.length < 500) fail(`candidate corpus too small (${rows.length}) — Phase 1 not scanning the corpus`);
const rejected = rows.filter((r) => !r.accepted);
if (!rejected.length) fail("no candidates rejected — Phase 1 is not separating lexical noise");
for (const r of rejected) if (!r.rejection_reason) fail(`rejected candidate without a reason code: ${r.normalized}`);
const REASONS = new Set(["STOPWORD","LEXICAL_NOISE","GENERIC_PROSE","NUMERIC_FRAGMENT","PATH_FRAGMENT","MARKUP_FRAGMENT","NON_TERMINOLOGICAL","DUPLICATE","BROKEN_TOKEN"]);
for (const r of rejected) if (r.rejection_reason && !REASONS.has(r.rejection_reason)) fail(`unknown rejection reason: ${r.rejection_reason}`);
if (g.lexical_noise_in_vocabulary !== 0) fail(`lexical noise present in the vocabulary: ${g.lexical_noise_in_vocabulary}`);

// ── C. every term resolved by REAL resolution — OUT_OF_SCOPE is curated, never the fallback ──────────
if (g.unresolved !== 0) fail(`UNRESOLVED terms (must be 0 by real resolution): ${g.unresolved}`);
if (g.orphaned !== 0) fail(`ORPHANED terms: ${g.orphaned}`);
if (g.conflicted !== 0) fail(`CONFLICTED terms: ${g.conflicted}`);
if (g.out_of_scope_is_curated_not_fallback !== true) fail("OUT_OF_SCOPE is being used as a fallback, not a curated set");
if ((voc.out_of_scope || []).length > 40) fail(`OUT_OF_SCOPE too large to be curated (${voc.out_of_scope.length}) — likely a fallback bucket`);
for (const o of voc.out_of_scope || []) if (!o.reason && !o.out_of_scope_reason_code) fail(`OUT_OF_SCOPE term without a reason: ${o.term}`);

// ── D. type vs instance separation (the audit's central correction) ─────────────────────────────────
if (!(voc.document_types?.length) || !(voc.document_instances?.length)) fail("DOCUMENT_TYPE / DOCUMENT_INSTANCE not both populated");
const dtypes = new Set((voc.document_types || []).map((d) => String(d.term).toLowerCase()));
const dinst = new Set((voc.document_instances || []).map((d) => String(d.id).toLowerCase()));
for (const i of dinst) if (dtypes.has(i)) fail(`document term classified as BOTH type and instance: ${i}`);
if ([...dinst].some((i) => !/^(adr|rfc)-\d|.*schema|.*\.(json|yaml)/.test(i) && i.length < 3)) fail("a document instance looks like a bare type");
if (!(voc.artifact_types?.length)) fail("ARTIFACT_TYPE empty");
// RELATION: a closed set of exactly 11 kinds, every alias mapped to one of them.
if ((voc.relation_kinds || []).length !== 11) fail(`RELATION_KIND must be the closed 11 (got ${voc.relation_kinds?.length})`);
const kinds = new Set((voc.relation_kinds || []).map((k) => k.kind));
for (const a of voc.relation_aliases || []) if (!kinds.has(a.kind)) fail(`relation alias '${a.alias}' maps to a non-kind: ${a.kind}`);
if (g.relation_alias_without_kind !== 0) fail(`relation aliases without a kind: ${g.relation_alias_without_kind}`);

// ── E. bidirectional subject reconciliation (vocabulary ⇄ truth table ⇄ subject registry) ────────────
if (arr(g.vocabulary_subjects_missing_from_truth_table).length) fail(`vocabulary subjects missing from truth table: ${g.vocabulary_subjects_missing_from_truth_table.join(",")}`);
if (arr(g.truth_table_concept_subjects_missing_from_vocabulary).length) fail(`truth-table subjects missing from vocabulary: ${g.truth_table_concept_subjects_missing_from_vocabulary.join(",")}`);
if (arr(g.truth_table_doc_rows_missing_from_vocabulary).length) fail(`truth-table doc rows missing from vocabulary: ${g.truth_table_doc_rows_missing_from_vocabulary.join(",")}`);
// the Subject Registry the truth table consumes must equal the vocabulary's subjects.
const vsub = new Set((voc.subjects || []).map((s) => s.id));
const rsub = new Set(arr(reg.subjects).map((s) => s.id || s));
for (const s of vsub) if (!rsub.has(s)) fail(`vocabulary subject '${s}' missing from subject-registry.json`);
for (const s of rsub) if (!vsub.has(s)) fail(`subject-registry subject '${s}' not in vocabulary`);
// every subject must be source-linked (real provenance, not asserted).
for (const s of voc.subjects || []) if (!arr(s.source_ids).length) fail(`subject '${s.id}' has no source_ids`);

// ── F. 191-row engine alias reconciliation ──────────────────────────────────────────────────────────
if (g.engine_alias_without_mapping !== 0) fail(`engine aliases without a canonical mapping: ${g.engine_alias_without_mapping}`);
if (recon.every_engine_alias_mapped !== true) fail("not every engine alias is mapped to a canonical id");
if ((recon.alias_collisions || 0) !== 0) fail(`alias collisions: ${recon.alias_collisions}`);
if ((voc.aliases || []).length < 150) fail(`vocabulary carries too few aliases (${voc.aliases?.length}) vs the engine's 191`);
for (const a of voc.aliases || []) if (!a.canonical_id) fail(`alias '${a.alias}' has no canonical_id`);

// ── G. critical public families must be carried (subjects/artifact/document/alias) ──────────────────
const norm = (x) => String(x).toLowerCase();
const allTerms = new Set([
  ...(voc.subjects || []).map((s) => norm(s.id)),
  ...(voc.subjects || []).flatMap((s) => (s.aliases || []).map(norm)),
  ...(voc.artifact_types || []).map((t) => norm(t.term)),
  ...(voc.document_types || []).map((t) => norm(t.term)),
  ...(voc.aliases || []).map((a) => norm(a.alias)),
]);
const present = (kw) => [...allTerms].some((t) => t.includes(kw));
for (const fam of ["banza","operador","federac","trust","conformidade","evidenc","manifest","root","revoga","adr","rfc","ledger","qr"])
  if (!present(fam)) fail(`critical public family absent from vocabulary: ${fam}`);

// ── H. source decomposition is multi-axis and honest (critique #7) ──────────────────────────────────
const sr = voc.source_registry;
for (const axis of ["by_type","by_status","by_authority_class","by_language","by_origin"])
  if (!sr[axis] || !Object.keys(sr[axis]).length) fail(`source registry missing decomposition axis: ${axis}`);

if (bad) { console.error(`banzai-canonical-protocol-vocabulary-check: NEEDS_FIX (${bad})`); process.exit(1); }
console.log(`  ok: ${sr.rows.length} sources | Phase1 ${rows.length} candidates → ${rejected.length} rejected(noise)/${rows.length - rejected.length} accepted | Phase2 subjects=${voc.counts.subjects} doc_types=${voc.counts.document_types}/instances=${voc.counts.document_instances} artifact_types=${voc.counts.artifact_types} relation_kinds=${voc.counts.relation_kinds}/aliases=${voc.counts.relation_aliases} aliases=${voc.counts.aliases} out_of_scope=${voc.counts.out_of_scope}(curated) unresolved=0`);
console.log("  ok: subjects bidirectional with truth table + subject registry; 191 engine aliases all mapped; type≠instance; relations = closed 11");
console.log("banzai-canonical-protocol-vocabulary-check: OK");
NODE
