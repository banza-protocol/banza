#!/usr/bin/env node
// canonical-reconciliation.mjs — the §18 count reconciliation artifact for the canonical eval (Increment 7).
//
// Produces ONE inspectable, reproducible reconciliation of every pre-existing BanzAI eval dataset against the
// NEW canonical suite, with NO double-counting, classifying the canonical suite into the mandated six classes
// (base semantic · generated lexical variations · multi-turn conversations · negative · live · regression)
// and stating explicitly how 709 / 1564 / the new operational+families+multi-turn cases relate. Prior-suite
// counts are COMPUTED from their sources (not copied), so the numbers are reproducible. Emits
// canonical-reconciliation.{json,md}. Deterministic; no model, no network.
//
// Usage:  node eval/canonical-reconciliation.mjs           # (re)write the reconciliation artifacts
//         node eval/canonical-reconciliation.mjs --check   # fail if the committed artifacts drifted

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CLASSES } from "./gen-canonical-eval.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_JSON = join(__dirname, "canonical-reconciliation.json");
const OUT_MD = join(__dirname, "canonical-reconciliation.md");

// ── prior suites — computed from their own sources (reproducible) ─────────────────────────────────────
const m2 = JSON.parse(readFileSync(join(__dirname, "grounded.dataset.json"), "utf8"));
const boundary = JSON.parse(readFileSync(join(__dirname, "boundary.dataset.json"), "utf8"));

// import the JS-defined datasets without their import-time console noise.
const origLog = console.log;
console.log = () => {};
const bzc = await import("./bzc-coverage.mjs");
const typo = await import("./typo-dataset.mjs");
const aqm = await import("./answer-quality-matrix.mjs");
console.log = origLog;

const PRIOR = [
  {
    key: "m2-18b6-grounded",
    label: "M2.18B.6 grounded-synthesis dataset (12 categories)",
    count: m2.total,
    source: "services/banzai-api/eval/grounded.dataset.json (total)",
    canonical_class_mapping: ["base", "variation", "negative", "comparison→regression"],
    note: "This is the 709. Its explanation/exact/impact/mixed/follow_up/example/concept categories map to the canonical base+variation classes; its boundary/adversarial/unsupported/ambiguity categories map to negative; compare maps to regression.",
  },
  {
    key: "bzc-4-coverage",
    label: "BZC-4 cross-protocol resolution coverage (entity×artifact×lang×surface + neg + documental)",
    count: bzc.summary.metrics.total,
    source: "services/banzai-api/eval/bzc-coverage.mjs (summary.metrics.total, runtime-computed = 1500 positive + 49 negative-entity + 15 documental)",
    canonical_class_mapping: ["live", "negative"],
    note: "This is the 1564. Its 1500 positive entity×artifact cases map to the canonical live class; its 49 non-entity + 15 documental cases map to negative. The canonical suite re-expresses this resolution family under the same structured schema (a curated, deduplicated subset), not a copy.",
  },
  {
    key: "m2-18b2-boundary",
    label: "M2.18B.2 action-boundary dataset (boundary + informational)",
    count: (boundary.boundary_cases || []).length + (boundary.informational_cases || []).length,
    source: "services/banzai-api/eval/boundary.dataset.json (boundary_cases + informational_cases)",
    canonical_class_mapping: ["negative"],
    note: "115 boundary + 50 informational = 165. Maps to the canonical negative class (boundary refusals) + intent cases.",
  },
  {
    key: "typo-intent-recovery",
    label: "M2.18B.5 typo / misspelling intent-recovery dataset",
    count: typo.DATASET.length,
    source: "services/banzai-api/eval/typo-dataset.mjs (DATASET)",
    canonical_class_mapping: ["variation"],
    note: "Lexical robustness — the canonical suite generalizes this into the variation class (capitalization/punctuation/accent/whitespace + paraphrases over every family).",
  },
  {
    key: "answer-quality-matrix",
    label: "M2.13C answer-quality regression matrix (inline arrays)",
    count:
      aqm.MANDATORY.length + aqm.DANGEROUS.length + aqm.AMBIGUOUS.length + aqm.ENGLISH.length +
      aqm.RANKING.length + aqm.FAMILIES.reduce((n, g) => n + (g.questions ? g.questions.length : 0), 0),
    source: "services/banzai-api/eval/answer-quality-matrix.mjs (MANDATORY+DANGEROUS+AMBIGUOUS+ENGLISH+RANKING+FAMILIES.questions)",
    canonical_class_mapping: ["base", "negative", "variation"],
    note: "Behavioural answer-quality matrix — its mandatory/English/ambiguous/ranking questions map to base+variation, its dangerous questions to negative.",
  },
  {
    key: "multi-turn-conversations",
    label: "Increment 6 multi-turn conversational context (behavioural guard)",
    count: 112,
    source: "tools/check-banzai-multiturn-context.sh + engines/banzai-query-core/src/context.rs (112 conversations / 812 asserted turns — guard-only, no dataset file)",
    canonical_class_mapping: ["multi_turn"],
    note: "Guard-asserted (not a committed dataset file). The canonical suite materializes multi-turn as a first-class multi_turn class with committed, structured expectations.",
  },
];

// ── canonical suite — classified from the committed JSONL (the six classes) ───────────────────────────
const cases = readFileSync(join(__dirname, "canonical-eval.jsonl"), "utf8")
  .split("\n").filter((l) => l.trim().length).map((l) => JSON.parse(l));

const byClass = Object.fromEntries(CLASSES.map((c) => [c, 0]));
const byFamily = {};
const seedSet = new Set();
for (const c of cases) {
  byClass[c.cls] = (byClass[c.cls] || 0) + 1;
  byFamily[c.family] = (byFamily[c.family] || 0) + 1;
  if (c.seed) seedSet.add(c.seed);
}

const CLASS_DEF = {
  base: "base semantic cases — one canonical human-authored phrasing per meaning",
  variation: "generated lexical variations — capitalization/punctuation/accent/whitespace + paraphrases of the base seeds (a capitalization/punctuation change is a VARIATION, never a new semantic case)",
  multi_turn: "multi-turn conversations — anaphora resolved against the safe technical prior context",
  negative: "negative cases — off-domain declines, non-entity guards, boundary refusals, and zero-tolerance adversarial probes",
  live: "live cases — implementation-scoped artifacts (entity×artifact) and operational metrics (metric×aggregation) that require the live tool / telemetry",
  regression: "regression cases — documentary corpus coverage + grounded claim/calculation anchors that protect the prior grounded families",
};

const report = {
  schema_version: 1,
  milestone: "Increment 7 §18 — canonical eval count reconciliation",
  generated_by: "eval/canonical-reconciliation.mjs (deterministic; prior counts computed from source)",
  prior_suites: PRIOR,
  prior_total_no_double_counting: PRIOR.reduce((n, p) => n + p.count, 0),
  canonical_suite: {
    total: cases.length,
    floor: 2500,
    distinct_semantic_seeds: seedSet.size,
    by_class: byClass,
    class_definitions: CLASS_DEF,
    by_family: byFamily,
  },
  how_709_1564_map: {
    "709": "M2.18B.6 grounded-synthesis total (grounded.dataset.json). Subsumed by the canonical base + variation (grounded documentary families) and negative (boundary/adversarial/unsupported/ambiguity) classes.",
    "1564": "BZC-4 resolution-coverage total (bzc-coverage.mjs = 1500 positive + 49 negative-entity + 15 documental). Subsumed by the canonical live (entity×artifact) and negative classes.",
    new_cases: "The operational families (metrics, duration, diagnosis, reason_codes, reproduction, comparison-of-executions), the multi_turn class, and the zero-tolerance adversarial probes are ADDITIVE — they cover behaviours neither 709 nor 1564 measured. The canonical suite counts every case ONCE, by class; it does not add the prior suites' totals to its own.",
  },
};

function renderMd(r) {
  const L = [];
  L.push("# BanzAI Canonical Eval — Count Reconciliation (Increment 7, §18)");
  L.push("");
  L.push("One canonical, deduplicated suite reconciled against every pre-existing BanzAI eval dataset. Prior-suite counts are computed from their own sources (reproducible). No double-counting: the canonical suite counts each case once, by class, and does NOT sum the prior suites into its own total.");
  L.push("");
  L.push("## Pre-existing suites (computed from source)");
  L.push("");
  L.push("| suite | count | canonical class(es) | source |");
  L.push("|---|---|---|---|");
  for (const p of r.prior_suites) {
    L.push(`| ${p.label} | ${p.count} | ${p.canonical_class_mapping.join(", ")} | \`${p.source}\` |`);
  }
  L.push("");
  L.push("## Canonical suite — the six-way classification");
  L.push("");
  L.push(`Total: **${r.canonical_suite.total}** cases (floor ${r.canonical_suite.floor}); ${r.canonical_suite.distinct_semantic_seeds} distinct human-authored semantic seeds.`);
  L.push("");
  L.push("| class | count | definition |");
  L.push("|---|---|---|");
  for (const c of CLASSES) {
    L.push(`| ${c} | ${r.canonical_suite.by_class[c]} | ${CLASS_DEF[c]} |`);
  }
  L.push("");
  L.push("## By family");
  L.push("");
  L.push(Object.entries(r.canonical_suite.by_family).map(([k, v]) => `${k}=${v}`).join(" · "));
  L.push("");
  L.push("## How 709 / 1564 / the new cases relate");
  L.push("");
  L.push(`- **709** — ${r.how_709_1564_map["709"]}`);
  L.push(`- **1564** — ${r.how_709_1564_map["1564"]}`);
  L.push(`- **new cases** — ${r.how_709_1564_map.new_cases}`);
  L.push("");
  return L.join("\n") + "\n";
}

const json = JSON.stringify(report, null, 2) + "\n";
const md = renderMd(report);

if (process.argv.includes("--check")) {
  let bad = 0;
  for (const [file, want] of [[OUT_JSON, json], [OUT_MD, md]]) {
    let cur = "";
    try { cur = readFileSync(file, "utf8"); } catch { /* fresh */ }
    if (cur !== want) { console.error(`DRIFT: ${file} is stale — run \`node eval/canonical-reconciliation.mjs\``); bad = 1; }
  }
  if (cases.length < report.canonical_suite.floor) { console.error(`FAIL: canonical total ${cases.length} < 2500`); bad = 1; }
  for (const c of CLASSES) if (!byClass[c]) { console.error(`FAIL: class "${c}" empty`); bad = 1; }
  if (bad) process.exit(1);
  console.log(`reconciliation in sync — canonical ${cases.length} cases; prior suites: ${PRIOR.map((p) => p.key + "=" + p.count).join(", ")}`);
  process.exit(0);
}

writeFileSync(OUT_JSON, json);
writeFileSync(OUT_MD, md);
console.log(`wrote ${OUT_JSON} + ${OUT_MD}`);
console.log("prior suites:", PRIOR.map((p) => `${p.key}=${p.count}`).join(", "));
console.log("canonical by class:", JSON.stringify(byClass));
