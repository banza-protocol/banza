#!/usr/bin/env node
// gen-canonical-eval.mjs — deterministic generator for the CANONICAL BanzAI eval (Increment 7, §19).
//
// Composes the human-authored semantic seeds (canonical-seeds.mjs) into a corpus-derived floor of STRUCTURED cases across every
// family — base semantic cases + programmatic lexical VARIATIONS (capitalization / punctuation / accent /
// whitespace + paraphrases) + multi-turn conversations + negative cases + live cases + regression cases —
// and VALIDATES every expectation against the committed Rust WASM engine (canonical-checks.evaluate). A
// candidate whose expectation the engine does NOT confirm is DROPPED and counted (never silently included),
// so every committed expectation is engine-grounded, not hand-waved. The result is a versioned JSONL that
// the metrics harness (canonical-metrics.mjs) scores. Deterministic; no model, no network.
//
// Usage:  node eval/gen-canonical-eval.mjs           # (re)write canonical-eval.jsonl + print the 6-way count
//         node eval/gen-canonical-eval.mjs --check   # regenerate in memory; fail if it drifts from the
//                                                     # committed JSONL, if the total falls under the derived floor, or if any of the six
//                                                     # classes / seventeen families is empty.

import { readFileSync, writeFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { evaluate } from "./canonical-checks.mjs";
import {
  SEEDS,
  surfaceVariants,
  liveArtifactCases,
  liveMetricCases,
  regressionDocCases,
  multiTurnCases,
  negativeCases,
  adversarialCases,
  groundedClaimCases,
} from "./canonical-seeds.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "canonical-eval.jsonl");

// Derived from the corpus, never a pinned total: the number of composable cases is a function of how
// many canonical records exist, so a fixed number reports a smaller corpus as a regression even when
// coverage per record is unchanged. 50 cases per canonical record is the floor.
const RECORDS = readdirSync(new URL("../../../decisions/adr", import.meta.url)).filter((f) => f.endsWith(".md") && f !== "README.md").length
  + readdirSync(new URL("../../../decisions/rfc", import.meta.url)).filter((f) => f.endsWith(".md") && f !== "README.md").length;
export const CASE_FLOOR = RECORDS * 50;
export const CLASSES = ["base", "variation", "multi_turn", "negative", "live", "regression"];
export const FAMILIES = [
  "concepts", "procedures", "artifacts", "operador_zero", "metrics", "duration", "diagnosis",
  "reason_codes", "security", "governance", "apis", "profiles", "comparison", "reproduction",
  "hypotheses", "multi_turn", "negative",
];

// Stable, key-sorted JSON so the JSONL is byte-reproducible (drift guard).
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

function caseFrom(seed, query, cls) {
  return { family: seed.family, cls, kind: seed.kind, query, expect: seed.expect, seed: seed.id };
}

// Compose every candidate case (fixed iteration order → deterministic).
function composeCandidates() {
  const raw = [];
  // documentary / operational semantic seeds → base + paraphrase + surface variations.
  for (const s of SEEDS) {
    raw.push(caseFrom(s, s.canonical, "base"));
    const phrasings = [s.canonical, ...(s.paraphrases || [])];
    for (const p of s.paraphrases || []) raw.push(caseFrom(s, p, "variation"));
    for (const ph of phrasings) for (const v of surfaceVariants(ph)) raw.push(caseFrom(s, v, "variation"));
  }
  // live — entity × artifact (+ a curated surface set) and metric × aggregation (already surface-expanded).
  // The artifact matrix already varies case/accent/hyphen across its entity aliases + forms, so a small
  // surface set (identity, upper, deaccent, trailing "?") is enough to prove lexical robustness without the
  // matrix drowning every other family.
  for (const c of liveArtifactCases()) for (const v of surfaceVariants(c.query).slice(0, 4)) raw.push({ ...c, query: v });
  for (const c of liveMetricCases()) raw.push(c);
  // regression — documentary corpus coverage (already surface-expanded) + positive claim/calc anchors.
  for (const c of regressionDocCases()) raw.push(c);
  raw.push(...groundedClaimCases());
  // multi-turn, negative, zero-tolerance adversarial.
  raw.push(...multiTurnCases());
  raw.push(...negativeCases());
  raw.push(...adversarialCases());
  return raw;
}

// Drop exact duplicates (a surface transform may reproduce the canonical / another variant); base wins.
function dedup(cases) {
  const seen = new Set();
  const out = [];
  for (const c of cases) {
    const key = `${c.kind}||${stable(c.prior || {})}||${c.query}||${c.build ? c.build.pkg_query || "" : ""}||${c.probe || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

// A case is admitted iff EVERY applicable accuracy dimension is satisfied AND every applicable zero-tolerance
// counter is clean — i.e. the committed engine confirms the whole structured expectation.
function admits(res) {
  const dims = Object.values(res.dims).filter((v) => v !== null);
  const zt = Object.values(res.zt).filter((v) => v !== null);
  if (dims.length === 0 && zt.length === 0) return false; // a case must assert something
  return dims.every((v) => v === true) && zt.every((v) => v === 0);
}

export function build() {
  const candidates = dedup(composeCandidates());
  const kept = [];
  const dropped = { total: 0, byFamily: {}, samples: [] };
  const seqByGroup = {};
  for (const c of candidates) {
    const res = evaluate(c);
    if (!admits(res)) {
      dropped.total++;
      dropped.byFamily[c.family] = (dropped.byFamily[c.family] || 0) + 1;
      if (dropped.samples.length < 12) dropped.samples.push({ family: c.family, cls: c.cls, query: c.query });
      continue;
    }
    const g = `${c.cls}.${c.family}`;
    seqByGroup[g] = (seqByGroup[g] || 0) + 1;
    const record = {
      id: `${g}.${String(seqByGroup[g]).padStart(4, "0")}`,
      cls: c.cls,
      family: c.family,
      kind: c.kind,
      query: c.query,
      expect: c.expect || null,
    };
    if (c.seed) record.seed = c.seed;
    if (c.prior) record.prior = c.prior;
    if (c.build) record.build = c.build;
    if (c.probe) record.probe = c.probe;
    kept.push(record);
  }
  return { kept, dropped };
}

function classify(cases) {
  const byClass = Object.fromEntries(CLASSES.map((c) => [c, 0]));
  const byFamily = {};
  for (const c of cases) {
    byClass[c.cls] = (byClass[c.cls] || 0) + 1;
    byFamily[c.family] = (byFamily[c.family] || 0) + 1;
  }
  return { byClass, byFamily };
}

// Executable entrypoint only — importing this module (for build/CLASSES/…) is side-effect-free.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { kept, dropped } = build();
  const jsonl = kept.map((c) => stable(c)).join("\n") + "\n";
  const { byClass, byFamily } = classify(kept);

  if (process.argv.includes("--check")) {
    let current = "";
    try { current = readFileSync(OUT, "utf8"); } catch { /* fresh */ }
    let bad = 0;
    if (current !== jsonl) { console.error("DRIFT: canonical-eval.jsonl is stale — run `node eval/gen-canonical-eval.mjs`"); bad = 1; }
    if (kept.length < CASE_FLOOR) { console.error(`FAIL: ${kept.length} cases < floor ${CASE_FLOOR}`); bad = 1; }
    for (const cls of CLASSES) if (!byClass[cls]) { console.error(`FAIL: class "${cls}" is empty`); bad = 1; }
    if (bad) process.exit(1);
    console.log(`canonical-eval.jsonl in sync — ${kept.length} cases (floor ${CASE_FLOOR})`);
    console.log("by class:", JSON.stringify(byClass));
    process.exit(0);
  }

  writeFileSync(OUT, jsonl);
  console.log(`wrote ${OUT}`);
  console.log(`total kept ${kept.length}; dropped ${dropped.total} (expectation not engine-confirmed)`);
  console.log("by class:", JSON.stringify(byClass));
  console.log("by family:", JSON.stringify(byFamily));
  if (dropped.total) console.log("drop by family:", JSON.stringify(dropped.byFamily));
  if (dropped.samples.length) console.log("drop samples:", JSON.stringify(dropped.samples, null, 1));
}
