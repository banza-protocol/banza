#!/usr/bin/env bash
#
# banzai-truth-table-current-check (M2.18B.7 / DFN-2) — regenerates the definitive Task-Fulfilment
# truth-table from the COMPILED WASM and asserts the committed artefact is CURRENT (drift = fail), and that
# the published coverage counts clear the quantitative floor. The artefact is the auditable, exportable
# matrix (subject × task → decided chain + answer class) — coverage is QUANTIFIED, not implied.
#
# Fails if: the artefact is stale vs the engine; the row-count partition does not sum to total; a critical
# subject is missing; the supported/terminal/synthesis floors are not met. Not a grep — it drives the engine.

set -eu
cd "$(dirname "$0")/.."

KB="services/banzai-api/src/rustkb/banzai_api_kb.js"
ART="artifacts/m2-18b7/task-fulfilment-truth-table.json"
[ -f "$KB" ] || { echo "banzai-truth-table-current-check: NEEDS_FIX (missing WASM $KB — run wasm-pack)" >&2; exit 1; }
[ -f "$ART" ] || { echo "banzai-truth-table-current-check: NEEDS_FIX (missing artefact $ART — run node tools/gen-banzai-truth-table.mjs)" >&2; exit 1; }

echo "BanzAI truth-table currency (M2.18B.7/DFN-2) — regenerate from the compiled WASM + assert current + floors"

# 1. artefact is current vs the engine (regenerate to a temp comparison inside the generator).
node tools/gen-banzai-truth-table.mjs --check

# 2. structural + coverage floors.
node --input-type=module <<'NODE'
import { readFileSync } from "node:fs";
const a = JSON.parse(readFileSync("artifacts/m2-18b7/task-fulfilment-truth-table.json", "utf8"));
const c = a.counts, rows = a.rows;
let bad = 0; const fail = (m) => { console.error(`  FAIL: ${m}`); bad++; };

// partition integrity: the mutually-exclusive answer classes must sum to total.
const part = c.terminal + c.synthesis + c.not_applicable + c.not_declared + c.attribute_declared + c.insufficient + c.boundary;
if (part !== c.total) fail(`answer-class partition ${part} != total ${c.total}`);
if (c.supported + c.not_applicable !== c.total) fail(`supported+na ${c.supported + c.not_applicable} != total ${c.total}`);

// coverage floors (definitive breadth, not 9-subject / 58-case narrowness).
if (c.total < 280) fail(`truth table too small (${c.total} rows < 280)`);
if (c.supported < 180) fail(`too few supported cells (${c.supported} < 180)`);
if (c.terminal < 28) fail(`too few deterministic terminals (${c.terminal} < 28)`);
if (c.synthesis < 120) fail(`too few grounded-synthesis cells (${c.synthesis} < 120)`);

// FULL taxonomy coverage — every RequestedTask variant must be probed + documented (emitted or handled).
const tax = a.taxonomy_coverage || [];
const REQUIRED_VARIANTS = ["exact_fact","definition","document_lookup","document_metadata","document_summary",
  "explanation","motivation","impact","consequences","comparison","relationship","requirements","procedure",
  "example","template","validation","troubleshooting","follow_up","mixed_task"];
for (const v of REQUIRED_VARIANTS)
  if (!tax.some((t) => t.variant === v && t.handled_by)) fail(`taxonomy variant not covered/documented: ${v}`);

// subject registry summary present + explains 22-subjects-vs-N-profiles.
const reg = a.subject_registry_summary || [];
if (reg.length !== rows.length / (a.counts.by_task ? Object.keys(a.counts.by_task).length : 1) && reg.length < 20)
  fail(`subject_registry_summary too small (${reg.length})`);
for (const s of reg) if (!s.resolution) fail(`registry subject ${s.subject} missing resolution`);

// N/A audit: every N/A carries a reason; N/A never silently exceeds the baseline ceiling.
const na = a.not_applicable_audit || {};
if ((na.missing_reason || []).length) fail(`N/A cells without a reason: ${na.missing_reason.join(",")}`);
if ((na.total || 0) > 120) fail(`N/A count ${na.total} exceeds ceiling 120 — audit the exclusions`);

// INSUFFICIENT cells must ALL be legitimate (nonexistent/superseded), never an internal coverage failure.
for (const ic of a.insufficient_cases || [])
  if (!ic.legitimate) fail(`illegitimate insufficient (internal coverage failure): ${ic.case_id} (${ic.reason})`);

// every NOT_APPLICABLE row must carry a documented reason; every SUPPORTED row an answer_class + chain.
for (const r of rows) {
  if (!r.supported && !r.na_reason) fail(`${r.case_id}: N/A without na_reason`);
  if (r.supported && !r.answer_class) fail(`${r.case_id}: supported without answer_class`);
  if (r.supported && r.terminal_applies && r.terminal_completion &&
      !["COMPLETE", "COMPLETE_WITH_LIMITATIONS"].includes(r.terminal_completion))
    fail(`${r.case_id}: terminal applies but not publishable (${r.terminal_completion})`);
}

// critical public subjects MUST appear in the matrix.
const subjects = new Set(rows.map((r) => r.subject));
for (const s of ["banza", "banzai", "banzami", "operador", "federacao", "governanca", "interoperabilidade",
                 "ADR-005", "RFC-0006", "ADR-99999-nonexistent"])
  if (!subjects.has(s)) fail(`critical subject missing from truth table: ${s}`);

if (bad) { console.error(`banzai-truth-table-current-check: NEEDS_FIX (${bad})`); process.exit(1); }
console.log(`  ok: ${c.total} rows (supported=${c.supported} terminal=${c.terminal} synthesis=${c.synthesis} n/a=${c.not_applicable}) — partition sound, floors met, critical subjects present`);
console.log("banzai-truth-table-current-check: OK");
NODE
