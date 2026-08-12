// BZC-4 — cross-protocol RESOLUTION coverage harness (+ BZC-3 authority-boundary assertions).
//
// Exercises the Rust entity+artifact+scope resolver (artifact::resolve_scope, via resolveScope) over a
// large COMBINATORIAL matrix of surface forms — entity aliases × artifacts × languages (PT/EN) ×
// case/accent/hyphen/space/plural variants × question templates — plus adversarial and negative cases,
// and asserts the FOUR zero-tolerance criteria the program requires:
//   wrong_entity_resolution = 0
//   wrong_artifact_resolution = 0
//   silent_ambiguity_resolution = 0            (a documental/no-entity question silently becomes live)
//   generic_protocol_document_substitution = 0 (an implementation artifact resolves to the Protocol doc)
//
// Honest scope note: the closed Technical Registry currently has ONE real operator (operator-zero), so
// this proves RESOLUTION ROBUSTNESS (surface-form / language / adversarial), not many-operator breadth.
// New operators become new rows in artifact.rs `ENTITIES`; the same matrix then covers them with no code
// change. Run: `node eval/bzc-coverage.mjs` (prints the matrix) or `--check` (exits non-zero on any
// criterion > 0 or below the case-count floor). Deterministic; no model, no network.

import { resolveScope } from "../src/knowledge.js";

const CHECK = process.argv.includes("--check");

// ── surface forms ────────────────────────────────────────────────────────────────────────────────────
// Operator-Zero entity aliases: case / accent / hyphen / space / concatenation. ALL must resolve.
const OZ_FORMS = [
  "operador zero", "operator zero", "operator-zero", "operador-zero", "operadorzero", "operatorzero",
  "Operador Zero", "OPERADOR ZERO", "Operator Zero", "OperadorZero",
];
// Non-entities: must NEVER resolve to operator-zero (wrong_entity guard).
const NON_ENTITIES = [
  "banco central", "EMIS", "KWiK", "operador um", "outro operador", "banco xyz", "a rede",
];

// artifact surface forms → expected artifact_type (implementation-scoped ⇒ requires_live_tool when entity present)
const IMPL_ARTIFACTS = [
  { forms: ["manifesto", "manifest", "o manifesto", "manifesto da implementação"], type: "implementation_manifest" },
  { forms: ["manifesto de chaves", "manifesto das chaves", "key manifest", "manifesto de keys"], type: "key_manifest" },
  { forms: ["discovery", "documento de discovery", "discovery document"], type: "discovery" },
  { forms: ["evidence bundle", "pacote de evidencia", "pacote de evidências", "bundle de evidência"], type: "evidence_bundle" },
  { forms: ["lista de revogação", "lista de revogacao", "revocation list", "lista de revogações"], type: "revocation_list" },
  { forms: ["metadata assinada", "metadados assinados", "signed metadata"], type: "signed_metadata" },
  { forms: ["recibo de operação", "recibo da operação", "operationreceipt"], type: "receipt" },
];
// PT + EN question templates that place the artifact against the entity.
const TEMPLATES_PT = [
  (a, e) => `me mostre o ${a} do ${e}`,
  (a, e) => `mostra o ${a} do ${e}`,
  (a, e) => `qual é o ${a} do ${e}`,
  (a, e) => `${a} do ${e}`,
  (a, e) => `podes obter o ${a} da implementação do ${e}?`,
];
const TEMPLATES_EN = [
  (a, e) => `show me the ${a} of ${e}`,
  (a, e) => `get the ${a} for ${e}`,
];

// Documental / general questions — Protocol Manifesto + concepts. Must stay documental (NOT live).
const DOCUMENTAL = [
  "o que é o manifesto do protocolo", "manifesto do protocolo", "manifesto do protocolo BANZA",
  "explica o manifesto do protocolo", "what is the protocol manifest",
  "o que é a federação", "explica a revogação", "o que é a governança aberta",
  "o que é um manifesto de chaves", "o que é a descoberta no protocolo",
  "como funciona o ledger de dupla entrada", "o que é a conformidade L2",
];
// Adversarial: an entity is MENTIONED but the artifact asked for is the PROTOCOL manifesto → documental.
const ADVERSARIAL_DOCUMENTAL = [
  "qual a diferença entre o manifesto do protocolo e o manifesto do operador zero",
  "o manifesto do protocolo usado pelo operator zero",
  "explica o manifesto do protocolo que o operador zero implementa",
];

const results = [];
function record(query, r, expect) {
  results.push({ query, expect, ...r });
}

// 1) POSITIVE — entity × artifact × template × lang: expect entity=operator-zero, artifact=type, live=true.
for (const e of OZ_FORMS) {
  for (const art of IMPL_ARTIFACTS) {
    for (const form of art.forms) {
      for (const t of TEMPLATES_PT) {
        const q = t(form, e);
        const s = resolveScope(q);
        record(q, s, { entity: "operator-zero", type: art.type, live: true, family: "positive-pt" });
      }
      // one EN template per artifact form (English aliases only for EN-valid forms)
      const q = TEMPLATES_EN[0](form, e);
      const s = resolveScope(q);
      record(q, s, { entity: "operator-zero", type: art.type, live: true, family: "positive-en" });
    }
  }
}

// 2) NEGATIVE — non-entity must not resolve to operator-zero.
for (const ne of NON_ENTITIES) {
  for (const art of IMPL_ARTIFACTS) {
    const q = `mostra o ${art.forms[0]} do ${ne}`;
    const s = resolveScope(q);
    record(q, s, { entity: "", notEntity: "operator-zero", family: "negative-entity" });
  }
}

// 3) DOCUMENTAL / general + adversarial — must stay documental (live=false).
for (const q of [...DOCUMENTAL, ...ADVERSARIAL_DOCUMENTAL]) {
  const s = resolveScope(q);
  record(q, s, { live: false, family: "documental" });
}

// ── scoring ──────────────────────────────────────────────────────────────────────────────────────────
const metrics = {
  total: results.length,
  positive: 0, negative_entity: 0, documental: 0,
  wrong_entity_resolution: 0,
  wrong_artifact_resolution: 0,
  silent_ambiguity_resolution: 0,
  generic_protocol_document_substitution: 0,
};
const failures = [];
for (const r of results) {
  const ex = r.expect;
  if (ex.family.startsWith("positive")) {
    metrics.positive++;
    if (r.entity_id !== ex.entity) { metrics.wrong_entity_resolution++; failures.push(`WRONG_ENTITY: "${r.query}" → ${r.entity_id}`); }
    if (r.artifact_type !== ex.type) { metrics.wrong_artifact_resolution++; failures.push(`WRONG_ARTIFACT: "${r.query}" → ${r.artifact_type} (want ${ex.type})`); }
    if (!r.requires_live_tool) { metrics.generic_protocol_document_substitution++; failures.push(`NOT_LIVE (would substitute protocol doc): "${r.query}"`); }
    if (r.artifact_type === "protocol_manifest") { metrics.generic_protocol_document_substitution++; failures.push(`PROTOCOL_SUBSTITUTION: "${r.query}"`); }
  } else if (ex.family === "negative-entity") {
    metrics.negative_entity++;
    if (r.entity_id === ex.notEntity) { metrics.wrong_entity_resolution++; failures.push(`WRONG_ENTITY (non-entity): "${r.query}" → ${r.entity_id}`); }
    if (r.requires_live_tool) { metrics.silent_ambiguity_resolution++; failures.push(`SILENT_LIVE (non-entity): "${r.query}"`); }
  } else if (ex.family === "documental") {
    metrics.documental++;
    if (r.requires_live_tool) { metrics.silent_ambiguity_resolution++; failures.push(`SILENT_LIVE (documental): "${r.query}"`); }
  }
}

const byType = {};
for (const r of results) if (r.expect.family.startsWith("positive")) byType[r.artifact_type] = (byType[r.artifact_type] || 0) + 1;

console.log("BZC-4 — cross-protocol resolution coverage");
console.log(`cases: ${metrics.total} (positive=${metrics.positive} negative-entity=${metrics.negative_entity} documental=${metrics.documental})`);
console.log("positive by artifact_type:", JSON.stringify(byType));
console.log("zero-tolerance metrics:", JSON.stringify({
  wrong_entity_resolution: metrics.wrong_entity_resolution,
  wrong_artifact_resolution: metrics.wrong_artifact_resolution,
  silent_ambiguity_resolution: metrics.silent_ambiguity_resolution,
  generic_protocol_document_substitution: metrics.generic_protocol_document_substitution,
}));

const CASE_FLOOR = 250;
const criteriaClean =
  metrics.wrong_entity_resolution === 0 &&
  metrics.wrong_artifact_resolution === 0 &&
  metrics.silent_ambiguity_resolution === 0 &&
  metrics.generic_protocol_document_substitution === 0;

if (failures.length) {
  console.log(`\nFAILURES (${failures.length}):`);
  for (const f of failures.slice(0, 40)) console.log("  ✗", f);
}

export const summary = { metrics, criteriaClean, caseFloor: CASE_FLOOR, failures };

if (CHECK) {
  if (metrics.total < CASE_FLOOR) { console.error(`FAIL: ${metrics.total} cases < floor ${CASE_FLOOR}`); process.exit(1); }
  if (!criteriaClean) { console.error("FAIL: zero-tolerance criteria violated"); process.exit(1); }
  console.log(`\nOK: ${metrics.total} cases, all four zero-tolerance criteria = 0`);
}
