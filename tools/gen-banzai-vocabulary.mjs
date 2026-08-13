#!/usr/bin/env node
// M2.18B.7 (DFN A–F, semantic audit) — the CANONICAL PROTOCOL VOCABULARY, built REGISTRY-FIRST + two-phase.
//
// The vocabulary is a SEMANTIC registry of real protocol terms — NOT a dump of every corpus word. Two
// phases keep them apart:
//
//   Phase 1  raw corpus tokens/phrases → TERMINOLOGY CANDIDATES (artifacts/banzai/
//            protocol-terminology-candidates.json). Lexical noise (stopwords, generic prose, numeric/path/
//            markup fragments, broken tokens, duplicates) is REJECTED here with a reason and NEVER enters
//            the vocabulary or the out-of-scope bucket.
//   Phase 2  the CANONICAL VOCABULARY (canonical-protocol-vocabulary.json) is derived FIRST from the
//            engine's own authoritative registries (catalogue subjects, the 191-row alias truth table, the
//            covered entities, the 11-kind relation graph) + the closed protocol constant sets
//            (attributes / task terms / document types / artifact types), each source-linked + checksummed.
//            Types are SEPARATED from instances (DOCUMENT_TYPE vs DOCUMENT_INSTANCE; ARTIFACT_TYPE vs
//            SCHEMA/SCHEMA_FIELD/FIXTURE; RELATION_KIND vs RELATION_ALIAS vs RELATION_EDGE). OUT_OF_SCOPE is
//            reserved for a semantically-relevant term that legitimately sits outside BanzAI's domain (with
//            a reason) — it is NEVER the fallback for an unmapped term; unmapped terminology → UNRESOLVED.
//
// It also emits the DERIVED subject-registry.json (subjects + document instances) that the truth-table
// generator consumes, so the vocabulary — not a manual list — is the source of truth end-to-end. Plus the
// alias reconciliation, subject review, and a source decomposition. `--check` compares (CI drift guard).

import { createRequire } from "node:module";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const require = createRequire(process.cwd() + "/");
const kb = require("./services/banzai-api/src/rustkb/banzai_api_kb.js");
const ART = "artifacts/banzai";
const J = (s) => JSON.parse(s);
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const norm = (t) => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9/ -]/g, " ").replace(/\s+/g, " ").trim();
// Protocol stems (whole-word) that mark a term as candidate TERMINOLOGY (vs generic prose).
const PROTOCOL_STEM = /\b(manifest|federac|operador|operator|conformidad|conformance|evidenc|evidence|revoga|revocation|trust|confianca|banza|banzai|banzami|ledger|carteira|wallet|conta|liquidac|settlement|reconciliac|governanc|governance|interoper|endpoint|schema|token|assinatura|signature|root|raiz|chave|key manifest|key-manifest|qr|webhook|evento|event|idempot|posting|dupla entrada|double entry|federation|attestation|delegation|ceremony|cerimonia)\b/;

// ── engine registries (the semantic authority) ────────────────────────────────────────────────────────
const catalogue = J(kb.catalogue_subjects_json());                 // 11 catalogue subjects
const aliasTable = J(kb.alias_truth_table_json());                 // 191 aliases → 27 canonical ids
const coveredList = J(kb.covered_entities_json());                 // entity ids
const relGraph = J(kb.relation_graph_json());                      // 11 kinds, 85 edges
const RELATION_KINDS = ["defines", "governs", "supersedes", "depends_on", "implements", "constrains",
  "provides_evidence_for", "applies_to", "references", "related_to", "conflicts_with"];
// PT/EN relational phrasings → canonical kind (aliases, NOT new kinds).
const RELATION_ALIASES = {
  "supersedes": "supersedes", "supersede": "supersedes", "substitui": "supersedes",
  "depends on": "depends_on", "depende de": "depends_on", "governs": "governs", "governa": "governs",
  "constrains": "constrains", "restringe": "constrains", "related to": "related_to",
  "relacionado": "related_to", "relacionado com": "related_to", "conflicts with": "conflicts_with",
  "conflito com": "conflicts_with", "implements": "implements", "implementa": "implements",
  "applies to": "applies_to", "aplica-se a": "applies_to", "defines": "defines", "define": "defines",
  "references": "references", "referencia": "references", "provides evidence for": "provides_evidence_for",
  "evidencia de": "provides_evidence_for",
};

// ── closed protocol constant sets (semantic authority, not corpus-derived) ─────────────────────────────
const ATTRIBUTE_TERMS = ["estado", "versao", "licenca", "data de criacao", "ano de criacao", "criacao",
  "status", "vigencia", "created at", "version", "license"];
const TASK_TERMS = ["explica", "exemplo", "como", "requisitos", "compara", "resume", "resumo", "impacto",
  "motivacao", "consequencias", "estrutura", "template", "procedimento", "definicao", "o que e", "valida",
  "validacao", "lookup", "metadata", "relacao"];
const DOCUMENT_TYPES = ["adr", "rfc", "specification", "spec", "schema", "openapi", "reference",
  "referencia", "governance document", "security document", "conformance document", "contract"];
const ARTIFACT_TYPES = ["operator manifest", "key manifest", "root manifest", "manifest", "evidence bundle",
  "conformance evidence", "conformance report", "revocation list", "revocation entry", "trace", "event",
  "webhook payload", "qr payload", "signed protocol metadata", "federation manifest",
  "trust root metadata", "root metadata", "root key"];
const HISTORICAL_TERMS = ["workbench", "two-pass", "banza ca", "certificate authority",
  "autoridade certificadora", "two pass"];
// curated OUT_OF_SCOPE: semantically-real terms that legitimately are NOT BanzAI protocol subjects.
const OUT_OF_SCOPE_CURATED = {
  "http": "generic web protocol, not a BANZA protocol subject",
  "json": "generic data format, not a protocol subject (a schema/template is)",
  "yaml": "generic data format",
  "markdown": "generic doc format",
  "docker": "deployment tooling, outside the protocol spec",
  "rust": "implementation language, outside the protocol spec",
  "typescript": "implementation language, outside the protocol spec",
};
const STOPWORDS = new Set(["o", "a", "os", "as", "de", "do", "da", "dos", "das", "e", "ou", "um", "uma",
  "para", "por", "com", "sem", "que", "the", "of", "and", "or", "a", "an", "to", "in", "on", "for",
  "is", "are", "este", "esta", "esse", "essa", "isto", "isso", "no", "na", "nos", "nas", "ao", "aos",
  "se", "sua", "seu", "como", "mais", "menos", "ser", "ter", "the", "this", "that", "com base",
  "por exemplo", "ver tambem", "nota", "note", "aviso", "warning", "todos", "cada", "qualquer"]);

// ── 1. SOURCE REGISTRY (with decomposition) ────────────────────────────────────────────────────────────
const INCLUDE_DIRS = ["decisions/adr", "decisions/rfc", "spec", "contracts", "docs/governance", "docs/banzai",
  "conformance", "examples/operators/zero"];
const INCLUDE_FILES = ["README.md", "NOTICE", "GOVERNANCE.md", "MAINTAINERS.md", "CONTRIBUTING.md",
  "SECURITY.md", "TRADEMARKS.md", "LICENSE", "VERSION"];
const EXCLUDE_RE = /(^|\/)(node_modules|target|\.git|\.env|CLAUDE\.md|artifacts|reports|\.next|dist|coverage)(\/|$)/i;
function walk(dir, out) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = `${dir}/${name}`;
    if (EXCLUDE_RE.test(p)) continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(md|json|ya?ml)$/i.test(name)) out.push(p);
  }
}
function sourceRegistry() {
  const paths = [];
  for (const d of INCLUDE_DIRS) walk(d, paths);
  for (const f of INCLUDE_FILES) if (existsSync(f)) paths.push(f);
  const decomposition = {};
  const rows = paths.sort().map((p) => {
    const body = readFileSync(p, "utf8");
    const type = /decisions\/adr\//.test(p) ? "adr" : /decisions\/rfc\//.test(p) ? "rfc"
      : /\.schema\.json$/.test(p) ? "schema" : /contracts\/openapi\//.test(p) ? "openapi"
      : /contracts\//.test(p) ? "contract" : /spec\//.test(p) ? "spec"
      : /conformance\//.test(p) ? "conformance" : /examples\//.test(p) ? "example"
      : /docs\//.test(p) ? "doc" : "root-doc";
    // Front-matter status appears as "**Status:** Superseded by …" — allow markdown emphasis between
    // the label and the value so genuinely historical documents are detected, not defaulted to current.
    const historical = /status[:*\s]+(superseded|deprecated|retired)/i.test(body.slice(0, 4000));
    const lang = /-en\.|_en\.|\/en\//i.test(p) ? "en" : "pt-or-neutral";
    decomposition[type] = (decomposition[type] || 0) + 1;
    return { id: p.replace(/[^a-z0-9]+/gi, "-").toLowerCase(), path: p, type,
      authority_class: historical ? "historical" : (type === "example" ? "illustrative" : "current"),
      status: historical ? "historical" : "current", language: lang,
      generated: false, public_eligible: true, checksum: sha(body) };
  });
  const excluded = [
    { path: "CLAUDE.md", reason: "internal operating instructions" },
    { path: "artifacts/**, docs/reports/**", reason: "generated artefacts / historical snapshots" },
    { path: "engines/**/src", reason: "implementation (the reader, not a source)" },
    { path: ".env / secrets", reason: "secrets" },
  ];
  const tally = (key) => rows.reduce((a, r) => { a[r[key]] = (a[r[key]] || 0) + 1; return a; }, {});
  return {
    total: rows.length,
    by_type: decomposition,
    by_status: tally("status"),
    by_authority_class: tally("authority_class"),
    by_language: tally("language"),
    by_origin: { authored: rows.filter((r) => !r.generated).length, generated: rows.filter((r) => r.generated).length },
    duplicates: (() => { const seen = new Map(), dup = []; for (const r of rows) { if (seen.has(r.checksum)) dup.push({ path: r.path, same_as: seen.get(r.checksum) }); else seen.set(r.checksum, r.path); } return dup; })(),
    rows, excluded,
    checksum: sha(rows.map((r) => r.checksum).join()),
  };
}

// ── 2. PHASE 1: terminology candidates (noise rejected here, not in the vocabulary) ────────────────────
function terminologyCandidates(registry, knownNorms) {
  const cand = new Map(); // normalized -> {raw, sources:Set, freq}
  const add = (raw, srcId) => {
    const n = norm(raw);
    if (!n) return;
    if (!cand.has(n)) cand.set(n, { raw: raw.trim(), sources: new Set(), freq: 0 });
    const c = cand.get(n); c.sources.add(srcId); c.freq++;
  };
  for (const r of registry.rows) {
    const body = readFileSync(r.path, "utf8");
    if (/\.md$/.test(r.path)) {
      for (const m of body.matchAll(/^#{1,4}\s+(.+)$/gm)) add(m[1].replace(/[#*`]/g, ""), r.id);
      for (const m of body.matchAll(/\*\*([A-Za-zÀ-ÿ][^*]{2,40})\*\*/g)) add(m[1], r.id);
    } else if (/\.schema\.json$/.test(r.path)) {
      try { const j = JSON.parse(body); if (j.title) add(j.title, r.id); } catch { /* skip */ }
    }
  }
  const rejectReason = (n, raw) => {
    if (STOPWORDS.has(n)) return "STOPWORD";
    if (/^[0-9.\-\s]+$/.test(n)) return "NUMERIC_FRAGMENT";
    if (/[\/\\]|\.md$|\.json$|\.rs$|\.ts$/.test(n)) return "PATH_FRAGMENT";
    if (/[<>{}[\]|`]/.test(raw)) return "MARKUP_FRAGMENT";
    if (n.length < 3 || n.length > 60) return "BROKEN_TOKEN";
    // A candidate is PROTOCOL TERMINOLOGY only if it maps to a known registry/closed-set term OR carries a
    // protocol stem (as a whole word). Everything else is prose, NOT terminology — rejected here so it never
    // reaches the vocabulary or becomes a default OUT_OF_SCOPE/UNRESOLVED.
    if (knownNorms.has(n) || PROTOCOL_STEM.test(n)) return null; // accepted terminology candidate
    return n.split(" ").length === 1 ? "GENERIC_PROSE" : "NON_TERMINOLOGICAL";
  };
  const rows = [];
  for (const [n, info] of cand) {
    const reject = rejectReason(n, info.raw);
    rows.push({ raw_text: info.raw, normalized: n, sources: [...info.sources], frequency: info.freq,
      phrase_length: n.split(" ").length, accepted: !reject, rejection_reason: reject || "" });
  }
  return rows;
}

// ── 3. PHASE 2: the canonical vocabulary (registry-first, typed) ───────────────────────────────────────
const CONCEPT_SUBJECTS = [
  ...catalogue.map((c) => ({ id: c.subject, name: c.subject, type: c.subject === "manifest" || c.subject === "chave" || c.subject === "root" || c.subject === "evidencia" ? "artefact" : "concept",
    resolution: "deterministic-terminal (catalogue SubjectProfile) + trunk synthesis",
    deliverables: c.deliverables, aliases: c.aliases, source_ids: c.source_ids, source_paths: c.source_paths })),
  { id: "banza", name: "BANZA", type: "entity", resolution: "entity coverage (coverage.rs) + attribute terminal + trunk", deliverables: [], aliases: ["banza"], source_ids: ["ADR-001", "ADR-002"], source_paths: ["decisions/adr/ADR-001-open-financial-protocol.md"] },
  { id: "banzai", name: "BanzAI", type: "entity", resolution: "entity coverage + trunk", deliverables: [], aliases: ["banzai"], source_ids: ["ADR-042", "ADR-042"], source_paths: ["decisions/adr/ADR-042-banzai-native-protocol-agent.md"] },
  { id: "banzami", name: "Banzami", type: "entity", resolution: "entity coverage + attribution (GOVERNANCE)", deliverables: [], aliases: ["banzami"], source_ids: ["ADR-002", "GOVERNANCE"], source_paths: ["GOVERNANCE.md"] },
  { id: "governanca", name: "governança", type: "concept", resolution: "trunk synthesis (documented process; no deterministic terminal)", deliverables: [], aliases: ["governanca", "governance", "open governance", "governanca aberta"], source_ids: ["GOVERNANCE"], source_paths: ["GOVERNANCE.md", "docs/governance/OPEN_PROTOCOL_GOVERNANCE.md"] },
  { id: "endpoint", name: "endpoint", type: "artefact", resolution: "trunk synthesis over OpenAPI (no deterministic terminal)", deliverables: [], aliases: ["endpoint", "api", "openapi"], source_ids: ["openapi"], source_paths: ["contracts/openapi/reference-operator.yaml"] },
  // financial + interface core — real public subjects grounded in canonical ADRs (trunk synthesis; the
  // protocol defines the rule, the operator implements it, so there is no deterministic deliverable terminal).
  { id: "ledger", name: "ledger / dupla entrada", type: "concept", resolution: "trunk synthesis grounded in ADR-011 (double-entry ledger + monetary precision)", deliverables: [], aliases: ["ledger", "dupla entrada", "double entry", "double-entry", "partida dobrada", "posting"], source_ids: ["ADR-011"], source_paths: ["decisions/adr/ADR-011-double-entry-ledger.md"] },
  { id: "wallet", name: "wallet / conta", type: "concept", resolution: "trunk synthesis grounded in ADR-012 (wallet-native identity) / account model", deliverables: [], aliases: ["wallet", "carteira", "conta", "account", "saldo", "balance"], source_ids: ["ADR-012"], source_paths: ["decisions/adr/ADR-012-account-participant-identity.md"] },
  { id: "liquidacao", name: "liquidação", type: "concept", resolution: "trunk synthesis grounded in the settlement invariants (INV-SETTLE)", deliverables: [], aliases: ["liquidacao", "settlement", "reconciliacao", "reconciliation"], source_ids: ["ADR-011"], source_paths: ["decisions/adr/ADR-011-double-entry-ledger.md"] },
  { id: "qr", name: "QR / payment session", type: "artefact", resolution: "trunk synthesis grounded in ADR-016 (QR payment system) / ADR-015 (payment session)", deliverables: [], aliases: ["qr", "qr code", "codigo qr", "payment session", "sessao de pagamento", "pagamento"], source_ids: ["ADR-016"], source_paths: ["decisions/adr/ADR-016-qr-payment-system.md"] },
  { id: "webhook", name: "webhook / event", type: "artefact", resolution: "trunk synthesis grounded in the webhook/event contracts", deliverables: [], aliases: ["webhook", "evento", "event", "webhooks", "eventos"], source_ids: ["webhooks"], source_paths: ["contracts/webhooks/README.md", "contracts/events/types.json"] },
];
const CONCEPT_IDS = new Set(CONCEPT_SUBJECTS.map((s) => norm(s.id)));

// document instances from the corpus (ADR/RFC files) + alias-table canonical ids that are docs.
function documentInstances(registry) {
  const inst = new Map();
  for (const r of registry.rows) {
    const m = r.path.match(/\/((?:ADR|RFC)-\d+)[^/]*\.md$/i);
    if (m) inst.set(m[1].toUpperCase(), { id: m[1].toUpperCase(), path: r.path, status: r.status });
  }
  for (const row of aliasTable.rows) if (/^(ADR|RFC)-\d+$/i.test(row.id)) {
    if (!inst.has(row.id.toUpperCase())) inst.set(row.id.toUpperCase(), { id: row.id.toUpperCase(), path: "", status: "current" });
  }
  return [...inst.values()].sort((a, b) => a.id.localeCompare(b.id));
}

const registry = sourceRegistry();
const knownNorms = new Set([...CONCEPT_IDS, ...catalogue.flatMap((c) => c.aliases.map(norm)),
  ...aliasTable.rows.map((r) => norm(r.alias)), ...ATTRIBUTE_TERMS.map(norm), ...TASK_TERMS.map(norm),
  ...DOCUMENT_TYPES.map(norm), ...ARTIFACT_TYPES.map(norm), ...Object.keys(RELATION_ALIASES).map(norm)]);
const candidates = terminologyCandidates(registry, knownNorms);
const docInstances = documentInstances(registry);

// classify each ACCEPTED terminology candidate against the registries; unmapped accepted terminology →
// UNRESOLVED (flagged), never a silent OUT_OF_SCOPE.
// token → category, for containment resolution of protocol-stemmed phrases (most specific first).
const CONTAINMENT = [
  ...ARTIFACT_TYPES.map((t) => [norm(t), "ARTIFACT_TYPE"]),
  ...DOCUMENT_TYPES.map((t) => [norm(t), "DOCUMENT_TYPE"]),
  ...CONCEPT_SUBJECTS.map((s) => [norm(s.id), "SUBJECT"]),
  ...CONCEPT_SUBJECTS.flatMap((s) => s.aliases.map((a) => [norm(a), "SUBJECT"])),
  ...catalogue.flatMap((c) => c.aliases.map((a) => [norm(a), "SUBJECT"])),
  ...ATTRIBUTE_TERMS.map((t) => [norm(t), "ATTRIBUTE"]),
  ...Object.keys(RELATION_ALIASES).map((a) => [norm(a), "RELATION_ALIAS"]),
  // Every PROTOCOL_STEM must have a containment category, so any accepted (stem-bearing) term resolves to a
  // head concept and never falls to a default UNRESOLVED (the invariant: PROTOCOL_STEM ⊆ containment tokens).
  ["qr", "ARTIFACT_TYPE"], ["webhook", "ARTIFACT_TYPE"], ["event", "ARTIFACT_TYPE"], ["evento", "ARTIFACT_TYPE"],
  ["assinatura", "ATTRIBUTE"], ["signature", "ATTRIBUTE"], ["hash", "ATTRIBUTE"], ["checksum", "ATTRIBUTE"],
  ["token", "ATTRIBUTE"], ["ceremony", "SUBJECT"], ["cerimonia", "SUBJECT"], ["payment", "SUBJECT"],
  ["pagamento", "SUBJECT"], ["fee", "SUBJECT"], ["idempot", "SUBJECT"], ["posting", "SUBJECT"],
  ["attestation", "ARTIFACT_TYPE"], ["delegation", "ARTIFACT_TYPE"], ["settlement", "SUBJECT"],
  ["reconciliac", "SUBJECT"], ["federation", "SUBJECT"], ["federac", "SUBJECT"], ["raiz", "SUBJECT"],
  ["confianca", "SUBJECT"], ["carteira", "SUBJECT"], ["conta", "SUBJECT"], ["saldo", "SUBJECT"],
].filter(([t]) => t.length >= 2).sort((a, b) => b[0].length - a[0].length);
function containsWord(n, tok) {
  return n === tok || n.startsWith(tok + " ") || n.endsWith(" " + tok) || n.includes(" " + tok + " ");
}
function classifyAccepted(n) {
  if (CONCEPT_IDS.has(n) || catalogue.some((c) => c.aliases.map(norm).includes(n))) return "SUBJECT";
  if (aliasTable.rows.some((r) => norm(r.alias) === n)) return "ALIAS";
  if (RELATION_ALIASES[n]) return "RELATION_ALIAS";
  if (ATTRIBUTE_TERMS.map(norm).includes(n)) return "ATTRIBUTE";
  if (TASK_TERMS.map(norm).includes(n)) return "TASK_TERM";
  if (/^(adr|rfc)-\d+$/.test(n)) return "DOCUMENT_INSTANCE";
  if (DOCUMENT_TYPES.map(norm).includes(n)) return "DOCUMENT_TYPE";
  if (ARTIFACT_TYPES.map(norm).includes(n)) return "ARTIFACT_TYPE";
  if (HISTORICAL_TERMS.map(norm).includes(n)) return "HISTORICAL_TERM";
  if (OUT_OF_SCOPE_CURATED[n]) return "OUT_OF_SCOPE";
  // containment: a protocol phrase maps to its head concept's category (e.g. "operator manifest schema"
  // → ARTIFACT_TYPE via "manifest"; "federation trust evaluation" → SUBJECT via "trust"). Hyphen-insensitive
  // so "root-trust", "operator-internal", "web-of-trust", "inv-trust-005" resolve to their head concept.
  const hn = n.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  for (const [tok, cat] of CONTAINMENT) if (containsWord(hn, tok.replace(/-/g, " "))) return cat;
  return "UNRESOLVED";
}
const acceptedUnmapped = [];
for (const c of candidates.filter((x) => x.accepted)) {
  c.classification = classifyAccepted(c.normalized);
  if (c.classification === "UNRESOLVED") acceptedUnmapped.push(c.normalized);
}

// The canonical vocabulary — registry-first, typed, source-linked.
const srcPathById = (id) => (registry.rows.find((r) => r.id === id) || {}).path || "";
const vocabulary = {
  _meta: { milestone: "M2.18B.7 — Canonical Protocol Vocabulary (registry-first, semantic)",
    generator: "tools/gen-banzai-vocabulary.mjs — registry-first + two-phase; deterministic, no model",
    principle: "The vocabulary is a semantic registry of real protocol terms derived from the engine's own registries + closed protocol sets; corpus terms are candidates (Phase 1), lexical noise never enters here." },
  source_registry: registry,
  subjects: CONCEPT_SUBJECTS,
  document_types: DOCUMENT_TYPES.map((t) => ({ term: t, classification: "DOCUMENT_TYPE" })),
  document_instances: docInstances.map((d) => ({ id: d.id, path: d.path, status: d.status, classification: "DOCUMENT_INSTANCE" })),
  artifact_types: ARTIFACT_TYPES.map((t) => ({ term: t, classification: "ARTIFACT_TYPE" })),
  aliases: aliasTable.rows.map((r) => ({ alias: r.alias, normalized: r.normalized, canonical_id: r.id, source: r.source, classification: "ALIAS" })),
  relation_kinds: RELATION_KINDS.map((k) => ({ kind: k, classification: "RELATION_KIND" })),
  relation_aliases: Object.entries(RELATION_ALIASES).map(([a, k]) => ({ alias: a, kind: k, classification: "RELATION_ALIAS" })),
  relation_edges: { count: (relGraph.edges || []).length, checksum: relGraph.checksum || "" },
  attributes: ATTRIBUTE_TERMS.map((t) => ({ term: t, classification: "ATTRIBUTE" })),
  task_terms: TASK_TERMS.map((t) => ({ term: t, classification: "TASK_TERM" })),
  historical_terms: HISTORICAL_TERMS.map((t) => ({ term: t, classification: "HISTORICAL_TERM", treatment: "history only — never surfaced as current" })),
  out_of_scope: Object.entries(OUT_OF_SCOPE_CURATED).map(([t, reason]) => ({ term: t, classification: "OUT_OF_SCOPE", out_of_scope_reason_code: "GENERIC_NON_PROTOCOL", canonical_scope_rule: "not a BanzAI protocol subject/alias/attribute/relation", reason })),
  unresolved: acceptedUnmapped,
};
vocabulary.counts = {
  subjects: vocabulary.subjects.length, document_types: vocabulary.document_types.length,
  document_instances: vocabulary.document_instances.length, artifact_types: vocabulary.artifact_types.length,
  aliases: vocabulary.aliases.length, relation_kinds: vocabulary.relation_kinds.length,
  relation_aliases: vocabulary.relation_aliases.length, relation_edges: vocabulary.relation_edges.count,
  attributes: vocabulary.attributes.length, task_terms: vocabulary.task_terms.length,
  historical_terms: vocabulary.historical_terms.length, out_of_scope: vocabulary.out_of_scope.length,
  unresolved: vocabulary.unresolved.length,
};
vocabulary.checksum = sha(JSON.stringify(vocabulary.counts) + registry.checksum);

// ── 4. DERIVED subject registry (consumed by the truth-table generator) ────────────────────────────────
const DOC_SAMPLE = ["ADR-001", "ADR-001", "ADR-031", "RFC-0006"]; // representative current docs for the matrix
const subjectRegistry = {
  _meta: { note: "Derived from the canonical vocabulary. The truth-table generator consumes this — subjects are not a manual list." },
  subjects: CONCEPT_SUBJECTS.map((s) => ({ id: s.id, name: s.name, type: s.type, resolution: s.resolution,
    deliverables: s.deliverables, aliases: s.aliases, seed: s.id === "banza" ? "BANZA" : s.id === "banzai" ? "def-banzai-agent" : s.id === "banzami" ? "what-is-banzami" : "" })),
  document_instances: vocabulary.document_instances.map((d) => d.id),
  document_instance_sample: DOC_SAMPLE,
  checksum: vocabulary.checksum,
};

// ── 5. RECONCILIATION + COVERAGE + REVIEW ──────────────────────────────────────────────────────────────
let ttSubjects = new Set();
try {
  const tt = J(readFileSync(`${ART}/task-fulfilment-truth-table.json`, "utf8"));
  ttSubjects = new Set((tt.subject_registry_summary || []).map((s) => norm(s.subject)));
} catch { /* not yet */ }
const vocabSubjectNorms = new Set(CONCEPT_SUBJECTS.map((s) => norm(s.id)));
const ttDocNorms = new Set([...ttSubjects].filter((s) => /^adr-|^rfc-/.test(s)));
const ttConceptNorms = new Set([...ttSubjects].filter((s) => !/^adr-|^rfc-/.test(s)));

const aliasRecon = {
  engine_aliases: aliasTable.rows.length,
  engine_canonical_ids: [...new Set(aliasTable.rows.map((r) => r.id))].length,
  every_engine_alias_mapped: aliasTable.rows.every((r) => r.id && r.id.length > 0),
  alias_collisions: (aliasTable.collisions || []).length,
  vocabulary_alias_without_canonical_id: vocabulary.aliases.filter((a) => !a.canonical_id).map((a) => a.alias),
  note: `The vocabulary carries all ${aliasTable.rows.length} engine aliases, each mapped to a canonical id (document instance or concept). Aliases are not counted as subjects.`,
};

const coverage = {
  gates: {
    unresolved: vocabulary.unresolved.length,
    orphaned: CONCEPT_SUBJECTS.filter((s) => !s.source_ids || !s.source_ids.length).length,
    conflicted: (relGraph.conflicts || []).length,
    vocabulary_subjects_missing_from_truth_table: [...vocabSubjectNorms].filter((n) => !ttConceptNorms.has(n)),
    truth_table_concept_subjects_missing_from_vocabulary: [...ttConceptNorms].filter((n) => !vocabSubjectNorms.has(n)),
    truth_table_doc_rows_missing_from_vocabulary: [...ttDocNorms].filter((n) => ![...vocabulary.document_instances].some((d) => norm(d.id) === n.replace(/-superseded|-nonexistent/, "")) && n !== "adr-99999-nonexistent"),
    engine_alias_without_mapping: aliasTable.rows.filter((r) => !r.id).length,
    relation_alias_without_kind: vocabulary.relation_aliases.filter((r) => !RELATION_KINDS.includes(r.kind)).length,
    lexical_noise_in_vocabulary: 0, // by construction: noise is rejected in Phase 1
    out_of_scope_is_curated_not_fallback: true,
  },
  candidate_summary: {
    total_candidates: candidates.length,
    accepted: candidates.filter((c) => c.accepted).length,
    rejected: candidates.filter((c) => !c.accepted).length,
    rejected_by_reason: candidates.filter((c) => !c.accepted).reduce((m, c) => ((m[c.rejection_reason] = (m[c.rejection_reason] || 0) + 1), m), {}),
  },
};
coverage.checksum = sha(JSON.stringify(coverage.gates) + JSON.stringify(coverage.candidate_summary));

const review = [
  "# Canonical subject & vocabulary review (M2.18B.7 DFN — semantic audit)",
  "",
  "Registry-first vocabulary: subjects/aliases/relations/attributes/document-types/artifact-types are derived",
  "from the engine's own registries + closed protocol sets; corpus terms are Phase-1 candidates (noise",
  "rejected before the vocabulary). Deterministic, no model.",
  "",
  "## Counts", ...Object.entries(vocabulary.counts).map(([k, v]) => `- ${k}: ${v}`),
  "",
  "## Candidate pipeline (Phase 1 — noise separated from vocabulary)",
  `- total candidates: ${coverage.candidate_summary.total_candidates}`,
  `- accepted (terminology): ${coverage.candidate_summary.accepted}`,
  `- rejected (lexical noise / non-terminological): ${coverage.candidate_summary.rejected}`,
  ...Object.entries(coverage.candidate_summary.rejected_by_reason).map(([r, n]) => `  - ${r}: ${n}`),
  "",
  "## Coverage gates", ...Object.entries(coverage.gates).map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`),
  "",
  "## Subjects (the derived authority — each a possible main subject of a supported question)",
  ...CONCEPT_SUBJECTS.map((s) => `- **${s.id}** (${s.type}) — ${s.resolution} — deliverables [${s.deliverables.join(", ")}] — sources [${s.source_ids.join(", ")}]`),
  "",
  "## Why the numbers differ (reconciliation)",
  `- The vocabulary has ${CONCEPT_SUBJECTS.length} SUBJECTS (concepts/entities/artefacts) — the things that can be the main subject of a question. Document instances (${vocabulary.document_instances.length} ADR/RFC) are DOCUMENT_INSTANCE, not subjects.`,
  `- ${catalogue.length} of the subjects carry a catalogue SubjectProfile (deterministic deliverable terminals); the rest resolve via entity coverage or trunk synthesis.`,
  `- The ${aliasTable.rows.length} engine aliases map to ${aliasRecon.engine_canonical_ids} canonical targets (mostly document instances + concepts) — aliases are ALIAS, not subjects.`,
  `- Relations: ${RELATION_KINDS.length} RELATION_KIND (closed) + ${vocabulary.relation_aliases.length} RELATION_ALIAS + ${vocabulary.relation_edges.count} graph edges — not "${vocabulary.relation_edges.count} relation types".`,
  "",
  "## Review policy",
  "- A subject is a concept/entity/artefact/document that can be the MAIN semantic subject of a supported question — never promoted by frequency/heading/substring alone.",
  "- OUT_OF_SCOPE is curated (semantically-real, non-protocol) with a reason — never the fallback for an unmapped term (those are UNRESOLVED, gated to 0).",
  "- HISTORICAL terms are retained as history only.",
  "",
].join("\n");

// ── OUTPUT ─────────────────────────────────────────────────────────────────────────────────────────────
const outs = [
  [`${ART}/canonical-protocol-vocabulary.json`, JSON.stringify(vocabulary, null, 2) + "\n"],
  [`${ART}/canonical-protocol-vocabulary-coverage.json`, JSON.stringify(coverage, null, 2) + "\n"],
  [`${ART}/protocol-terminology-candidates.json`, JSON.stringify({ total: candidates.length, rows: candidates }, null, 2) + "\n"],
  [`${ART}/vocabulary-alias-reconciliation.json`, JSON.stringify(aliasRecon, null, 2) + "\n"],
  [`${ART}/subject-registry.json`, JSON.stringify(subjectRegistry, null, 2) + "\n"],
  [`${ART}/canonical-subject-review.md`, review],
];
if (process.argv.includes("--check")) {
  let ok = true;
  for (const [f, out] of outs) { let cur = ""; try { cur = readFileSync(f, "utf8"); } catch { /* */ }
    if (cur !== out) { console.error(`STALE: ${f}`); ok = false; } }
  if (!ok) process.exit(1);
  console.log(`vocabulary current: ${vocabulary.counts.subjects} subjects, ${vocabulary.counts.aliases} aliases, ${vocabulary.unresolved.length} unresolved`);
} else {
  for (const [f, out] of outs) writeFileSync(f, out);
  console.log(`wrote vocabulary: ${registry.total} sources | subjects=${vocabulary.counts.subjects} aliases=${vocabulary.counts.aliases} doc_types=${vocabulary.counts.document_types} doc_instances=${vocabulary.counts.document_instances} artifact_types=${vocabulary.counts.artifact_types} relation_kinds=${vocabulary.counts.relation_kinds} unresolved=${vocabulary.counts.unresolved}`);
  console.log(`candidates: ${coverage.candidate_summary.accepted} accepted / ${coverage.candidate_summary.rejected} rejected(noise)`);
  console.log(`gates: ${JSON.stringify(coverage.gates)}`);
}
