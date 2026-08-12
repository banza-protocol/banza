#!/usr/bin/env node
// M2.18B.7 (DFN-2) — the DEFINITIVE Task-Fulfilment truth-table GENERATOR.
//
// Drives the COMPILED banzai-query-core WASM (the exact artifact the service runs) over the full public
// matrix `subject × task` and, for every cell, records the whole decided chain — resolved task, deterministic
// terminal applicability + kind + completion, the RetrievalPlan (requested_task, source_appropriate, class,
// per-source appropriateness), the derived answer class and the expected model-call count. It then emits the
// exportable artefact artifacts/m2-18b7/task-fulfilment-truth-table.json (rows + published counts) so coverage
// is QUANTIFIED and auditable, not implied. Deterministic, no model. `--check` compares against the committed
// artefact (CI verifies it is current) instead of writing.
//
// Answer classes: terminal (0-model deterministic) | synthesis (1 Qwen) | not_declared (attribute) |
// boundary (0-model refusal) | not_applicable (task not askable of this subject) | insufficient.

import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";

const require = createRequire(process.cwd() + "/");
const kb = require("./services/banzai-api/src/rustkb/banzai_api_kb.js");
const ARTEFACT = "artifacts/m2-18b7/task-fulfilment-truth-table.json";

const J = (s) => { try { return JSON.parse(s); } catch { return null; } };
const obligations = (q, s) => J(kb.answer_obligations_json(q, s || ""));
const tasked = (q, s) => J(kb.tasked_answer_json(q, s || ""));
const plan = (q, s) => J(kb.retrieval_plan_json(q, s || ""));
const attribute = (q) => J(kb.attribute_answer_json(q));
const completion = (q, s, md, cited, n, ok) =>
  J(kb.task_completion_json(kb.answer_obligations_json(q, s || ""), md, JSON.stringify(cited || []), n, ok));

// The public SUBJECT surface is DERIVED from the canonical vocabulary's subject-registry.json (the
// authority) — NOT a manual list. Conceptual subjects get the full task matrix; a representative sample of
// document INSTANCES gets the document tasks (lookup/summary/metadata/explanation/impact).
const REGISTRY = JSON.parse(readFileSync("artifacts/m2-18b7/subject-registry.json", "utf8"));
const NOUN = { banza: "o BANZA", banzai: "o BanzAI", banzami: "a Banzami", root: "root manifest" };
const SUBJECTS = [
  ...REGISTRY.subjects.map((s) => ({
    subject: s.id, type: s.type, noun: NOUN[s.id] || s.id, seed: s.seed || "",
    deliverables: s.type !== "entity", // deliverable tasks are askable of every concept/artefact subject
  })),
  // document-instance sample (representative current / nonexistent) — document tasks only.
  { subject: "ADR-005", type: "document", noun: "a ADR-005", seed: "ADR-005", doc: true },
  { subject: "ADR-001", type: "document", noun: "a ADR-001", seed: "ADR-001", doc: true },
  { subject: "ADR-040", type: "document", noun: "a ADR-040", seed: "ADR-040", doc: true },
  { subject: "RFC-0006", type: "document", noun: "a RFC-0006", seed: "RFC-0006", doc: true },
  { subject: "ADR-99999-nonexistent", type: "document", noun: "a ADR-99999", seed: "ADR-99999", doc: true, nonexistent: true },
];

// The TASK axis. `applies` decides SUPPORTED vs NOT_APPLICABLE per subject; `q` builds the base query.
const TASKS = [
  { task: "definition", q: (s) => `o que e ${s.noun}?`, applies: (s) => s.type !== "document" },
  { task: "explanation", q: (s) => `explica ${s.noun}`, applies: () => true },
  { task: "example", q: (s) => `me da um exemplo de ${s.noun}`, applies: (s) => s.deliverables === true },
  { task: "procedure", q: (s) => `como implementar ${s.noun}?`, applies: (s) => s.deliverables === true },
  { task: "requirements", q: (s) => `quais os requisitos para ${s.noun}?`, applies: (s) => s.deliverables === true },
  { task: "template", q: (s) => `mostra a estrutura de ${s.noun}`, applies: (s) => s.deliverables === true },
  { task: "document_lookup", q: (s) => `${s.noun.replace(/^a |^o /, "")}`, applies: (s) => s.doc === true },
  { task: "document_summary", q: (s) => `resume ${s.noun}`, applies: (s) => s.doc === true },
  { task: "document_metadata", q: (s) => `qual o estado de ${s.noun}?`, applies: (s) => s.doc === true },
  { task: "impact", q: (s) => `qual o impacto de ${s.noun}?`, applies: () => true },
  { task: "motivation", q: (s) => `qual a motivacao de ${s.noun}?`, applies: () => true },
  { task: "consequences", q: (s) => `quais as consequencias de ${s.noun}?`, applies: () => true },
  {
    task: "comparison",
    q: (s) => `compara ${s.noun} e ${s.subject === "operador" ? "a federacao" : "o operador"}`,
    applies: () => true,
  },
];

// The FULL RequestedTask taxonomy (obligations.rs). Not every variant is emitted by resolve_task: some are
// handled by a different deterministic layer (ExactFact → the Tier-1b attribute terminal; Clarification/
// Unsupported → the router/boundary) or reserved. The taxonomy_coverage probe below records, empirically,
// which variant each representative query resolves to and how the variant is handled — so "full taxonomy"
// is demonstrated, not implied, and non-emitted variants are documented rather than faked.
const TAXONOMY = [
  ["exact_fact", "qual o ano de criacao do banza?", "BANZA", "attribute_terminal (Tier 1b, resolve_task returns explanation; the exact fact is served deterministically by attribute.rs)"],
  ["definition", "o que e operador?", "", "resolve_task"],
  ["document_lookup", "ADR-005", "ADR-005", "resolve_task"],
  ["document_metadata", "qual o estado da ADR-005?", "ADR-005", "resolve_task"],
  ["document_summary", "resume a ADR-005", "ADR-005", "resolve_task"],
  ["explanation", "explica operador", "", "resolve_task"],
  ["motivation", "qual a motivacao de operador?", "", "resolve_task"],
  ["impact", "qual o impacto de operador?", "", "resolve_task"],
  ["consequences", "quais as consequencias de operador?", "", "resolve_task"],
  ["comparison", "compara operador e federacao", "", "resolve_task"],
  ["relationship", "qual a relacao entre operador e federacao?", "", "reserved (resolve_task maps to comparison/explanation; no distinct Relationship emission)"],
  ["requirements", "quais os requisitos para participacao?", "", "resolve_task"],
  ["procedure", "como implementar operador?", "", "resolve_task"],
  ["example", "me da um exemplo de operador", "", "resolve_task"],
  ["template", "mostra a estrutura de manifest", "", "resolve_task"],
  ["validation", "como validar um manifest?", "", "reserved (resolve_task maps to procedure/explanation)"],
  ["troubleshooting", "porque falha a validacao do manifest?", "", "reserved (resolve_task maps to explanation)"],
  ["follow_up", "e um exemplo?", "", "context (pipeline classify_context_use / task_from_current_turn; resolve_task on the current turn)"],
  ["mixed_task", "quais os requisitos e como implementar a participacao?", "", "resolve_task (single dominant deliverable by priority; context preserves the rest)"],
];

function classify(row) {
  if (row.boundary) return "boundary";
  if (row.terminal_applies) return "terminal";
  if (row.attribute_declared) return "attribute_declared";
  if (row.attribute_not_declared) return "not_declared";
  if (row.nonexistent) return "insufficient";
  // narrative/documentary tasks reaching the trunk = one Qwen synthesis
  return "synthesis";
}

function buildRows() {
  const rows = [];
  for (const s of SUBJECTS) {
    for (const t of TASKS) {
      const applies = t.applies(s);
      const q = t.q(s);
      const seed = s.seed || "";
      if (!applies) {
        rows.push({
          case_id: `${s.subject}::${t.task}`, subject: s.subject, subject_type: s.type,
          task: t.task, base_query: q, seed, supported: false, na_reason:
            s.type === "document" && ["definition"].includes(t.task) ? "document_not_a_concept"
            : (!s.deliverables && ["example", "procedure", "requirements", "template"].includes(t.task)) ? "no_deliverable_for_subject_type"
            : (!s.doc && ["document_lookup", "document_summary", "document_metadata"].includes(t.task)) ? "not_a_document"
            : "not_askable",
          answer_class: "not_applicable", expected_model_calls: 0,
        });
        continue;
      }
      const ob = obligations(q, seed) || {};
      const resolvedTask = ob.requested_task || "";
      const t1 = tasked(q, seed) || {};
      const terminalApplies = t1.matched === true;
      const p = plan(q, seed) || {};
      const attr = attribute(q) || {};
      const attrDeclared = attr.status === "declared" || attr.reason_code === "EXACT_FACT_CONFIRMED";
      const attrNot = attr.status === "not_declared" || attr.reason_code === "ATTRIBUTE_NOT_DECLARED";
      let completionStatus = "";
      if (terminalApplies) {
        const v = completion(q, seed, t1.answer_markdown, t1.source_ids, (t1.sources || []).length, true);
        completionStatus = v ? v.status : "";
      }
      const row = {
        case_id: `${s.subject}::${t.task}`, subject: s.subject, subject_type: s.type,
        task: t.task, base_query: q, seed, supported: true,
        resolved_task: resolvedTask,
        terminal_applies: terminalApplies,
        terminal_kind: terminalApplies ? t1.kind : "",
        terminal_completion: completionStatus,
        terminal_sources: terminalApplies ? (t1.source_ids || []) : [],
        retrieval: {
          requested_task: p.requested_task || "",
          source_appropriate: p.source_appropriate === true,
          source_appropriateness: p.source_appropriateness || "",
          n_sources: Array.isArray(p.sources) ? p.sources.length : 0,
          top_source: Array.isArray(p.sources) && p.sources[0] ? p.sources[0].source_id : "",
          top_appropriateness: Array.isArray(p.sources) && p.sources[0] ? p.sources[0].task_appropriateness : "",
          escalate_insufficient: p.escalate_insufficient === true,
        },
        attribute_declared: attrDeclared,
        attribute_not_declared: attrNot,
        boundary: p.primary_intent === "boundary_request",
        nonexistent: s.nonexistent === true,
        superseded: s.superseded === true,
      };
      row.answer_class = classify(row);
      row.expected_model_calls = row.answer_class === "synthesis" ? 1 : 0;
      rows.push(row);
    }
  }
  return rows;
}

function counts(rows) {
  // `supported` is the count of askable cells; the mutually-exclusive answer_class tallies (terminal/
  // synthesis/not_applicable/…) partition ALL rows and must sum to total (no double counting).
  const c = { total: rows.length, supported: rows.filter((r) => r.supported).length,
    not_applicable: 0, terminal: 0, synthesis: 0, not_declared: 0, attribute_declared: 0,
    insufficient: 0, boundary: 0, superseded: 0, nonexistent: 0, by_task: {}, by_subject_type: {} };
  for (const r of rows) {
    c[r.answer_class] = (c[r.answer_class] || 0) + 1;
    if (r.superseded) c.superseded++;
    if (r.nonexistent) c.nonexistent++;
    c.by_task[r.task] = c.by_task[r.task] || { total: 0, supported: 0, terminal: 0, synthesis: 0, na: 0 };
    const bt = c.by_task[r.task];
    bt.total++; if (r.supported) bt.supported++; else bt.na++;
    if (r.answer_class === "terminal") bt.terminal++;
    if (r.answer_class === "synthesis") bt.synthesis++;
    c.by_subject_type[r.subject_type] = (c.by_subject_type[r.subject_type] || 0) + 1;
  }
  return c;
}

// Empirically probe the FULL taxonomy: what does each representative query resolve to, and how is the
// variant handled? Non-emitted variants are documented, not faked.
function taxonomyCoverage() {
  return TAXONOMY.map(([variant, q, seed, handled_by]) => {
    const ob = obligations(q, seed) || {};
    return { variant, probe_query: q, resolved_task: ob.requested_task || "", handled_by };
  });
}

// A registry summary of the 22 matrix subjects: which have a SubjectProfile (a deliverable terminal), and
// which are entities/documents handled by trunk synthesis / coverage / attribute. Explains 22 subjects vs
// 11 catalogue profiles explicitly.
function subjectRegistrySummary(rows) {
  return SUBJECTS.map((s) => {
    const subjRows = rows.filter((r) => r.subject === s.subject && r.supported);
    const terminalTasks = subjRows.filter((r) => r.terminal_applies).map((r) => r.task);
    const synthesisTasks = subjRows.filter((r) => r.answer_class === "synthesis").map((r) => r.task);
    return {
      subject: s.subject,
      subject_type: s.type,
      has_subject_profile: terminalTasks.length > 0,
      resolution: terminalTasks.length > 0 ? "deterministic-terminal (catalogue SubjectProfile) + trunk synthesis"
        : s.doc ? "document registry (docref) + trunk synthesis"
        : s.type === "entity" ? "entity coverage (coverage.rs primary sources) + trunk synthesis / attribute terminal"
        : "trunk synthesis (no deterministic deliverable terminal)",
      seed: s.seed || "",
      terminal_tasks: terminalTasks,
      synthesis_tasks: synthesisTasks,
      na_tasks: rows.filter((r) => r.subject === s.subject && !r.supported).map((r) => r.task),
    };
  });
}

// Audit the NOT_APPLICABLE cells: by subject, by task, and by reason — so exclusions are inspectable and no
// hard combination is silently converted to N/A. Every N/A row must carry a reason.
function naAudit(rows) {
  const na = rows.filter((r) => !r.supported);
  const byReason = {}, byTask = {}, bySubject = {};
  for (const r of na) {
    byReason[r.na_reason || "MISSING"] = (byReason[r.na_reason || "MISSING"] || 0) + 1;
    byTask[r.task] = (byTask[r.task] || 0) + 1;
    bySubject[r.subject] = (bySubject[r.subject] || 0) + 1;
  }
  return { total: na.length, by_reason: byReason, by_task: byTask, by_subject: bySubject,
    missing_reason: na.filter((r) => !r.na_reason).map((r) => r.case_id) };
}

// Enumerate every INSUFFICIENT cell — it must be a legitimate insufficiency (a nonexistent/superseded doc),
// NEVER a known-subject + eligible-source + supported-deliverable combination failing internally.
function insufficientCases(rows) {
  return rows.filter((r) => r.answer_class === "insufficient").map((r) => ({
    case_id: r.case_id, subject: r.subject, task: r.task, base_query: r.base_query, seed: r.seed,
    reason: r.nonexistent ? "document does not exist (legitimate: no orphan primary; declines rather than fabricates)"
      : r.superseded ? "document self-declared historical/superseded" : "UNEXPECTED_INTERNAL_COVERAGE_FAILURE",
    legitimate: r.nonexistent === true || r.superseded === true,
    expected_public_class: "insufficient_evidence / decline",
  }));
}

const rows = buildRows();
const artefact = {
  _meta: {
    milestone: "M2.18B.7 — Definitive generalization proof (DFN-2)",
    generator: "tools/gen-banzai-truth-table.mjs (drives the compiled banzai-query-core WASM; deterministic, no model)",
    dimensions: "subject-type × subject × task → resolved_task, terminal(applies/kind/completion), retrieval(requested_task/source_appropriate/class/sources), attribute, boundary, answer_class, expected_model_calls",
    answer_classes: "terminal | synthesis | attribute_declared | not_declared | boundary | not_applicable | insufficient",
    note: "Router+retrieval+terminal-completion chain per cell. The full response-quality chain (structured output, semantic validator, schema validation) lands with DFN-6/7 and will extend each SUPPORTED row.",
  },
  counts: counts(rows),
  taxonomy_coverage: taxonomyCoverage(),
  subject_registry_summary: subjectRegistrySummary(rows),
  not_applicable_audit: naAudit(rows),
  insufficient_cases: insufficientCases(rows),
  rows,
};
const out = JSON.stringify(artefact, null, 2) + "\n";

if (process.argv.includes("--check")) {
  let committed = "";
  try { committed = readFileSync(ARTEFACT, "utf8"); } catch { /* missing */ }
  if (committed !== out) {
    console.error(`banzai truth-table artefact is STALE — regenerate with: node ${process.argv[1]}`);
    process.exit(1);
  }
  console.log(`truth-table artefact current: ${rows.length} rows (${artefact.counts.supported} supported, ${artefact.counts.not_applicable} N/A)`);
} else {
  writeFileSync(ARTEFACT, out);
  const c = artefact.counts;
  console.log(`wrote ${ARTEFACT}: ${c.total} rows — supported=${c.supported} n/a=${c.not_applicable} terminal=${c.terminal} synthesis=${c.synthesis} not_declared=${c.not_declared || 0} boundary=${c.boundary}`);
  console.log("by task:", JSON.stringify(c.by_task));
}
