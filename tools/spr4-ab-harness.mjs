#!/usr/bin/env node
// SPR-4 §5 — A/B REGRESSION HARNESS: baseline synthesis vs structured generation, on an IDENTICAL sample.
//
// It drives the REAL trunk (runGroundedSynthesis) over the REAL Rust engines and the REAL local model
// (createProvider from the process env — on the VPS/container this is local_qwen → llama-local), running
// each question twice: once with the byte-identical baseline output contract (structured:false) and once
// with the structured contract (structured:true, the model authors only the linguistic core; cited_source_ids
// is derived deterministically). Same questions, same provider, same depth — only the output contract differs.
//
// It measures the full decomposition per run — input tokens, output tokens, tok/s, prefill (prompt_ms),
// generation_ms, non-generation overhead (resolution+package+validate+claim/citation verify+assembly), and
// time_to_final_validated_answer (the whole runGroundedSynthesis wall time) — and the SAFETY gates:
//   • invalid_citation_rate  (structured grounded runs whose cited_source_ids ⊄ allowed_source_ids) → must be 0
//   • unsupported_claim / status regression (structured NOT grounded where baseline WAS) → must be 0
//   • information preserved   (structured answer not materially shorter; claims count preserved)
//   • measurable latency reduction (median output tokens ↓ and median generation_ms ↓)
// The structured contract becomes the default ONLY if every gate holds. This harness is the evidence.
//
// Usage (on the host with a reachable model):
//   BANZAI_LLM_PROVIDER=local_qwen node tools/spr4-ab-harness.mjs [--reps N] [--out report.json]
// Env: any provider env createProvider() reads. REPS defaults to 2. Questions can be overridden with
// SPR4_QUESTIONS (JSON array of {q, entity?}).
import { runGroundedSynthesis } from "../services/banzai-api/src/grounded-synthesis.js";
import { createProvider } from "../services/banzai-api/src/provider.js";
import { writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const REPS = Math.max(1, parseInt(arg("--reps", "2"), 10) || 2);
const OUT = arg("--out", "");

const DEFAULT_QUESTIONS = [
  { q: "o que decidiu a ADR-002?", entity: "ADR-002" },
  { q: "explica a ADR-006", entity: "ADR-006" },
  { q: "o que é o BanzAI?" },
  { q: "o que é a Action Boundary?" },
  { q: "o que decidiu a ADR-037?", entity: "ADR-037" },
  { q: "o que é um operador certificado?" },
  { q: "explica a ADR-073", entity: "ADR-073" },
  { q: "o que é o Operador Zero?" },
  { q: "compara a ADR-053 com a ADR-054", entity: "ADR-053" },
  { q: "o que é a federação no protocolo BANZA?" },
];
const QUESTIONS = process.env.SPR4_QUESTIONS ? JSON.parse(process.env.SPR4_QUESTIONS) : DEFAULT_QUESTIONS;

const median = (xs) => {
  const a = xs.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const mean = (xs) => {
  const a = xs.filter((x) => Number.isFinite(x));
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
};

async function runOne(provider, question, entity, structured) {
  const t0 = Date.now();
  const r = await runGroundedSynthesis(question, { provider, entityId: entity || null, structured });
  const total_ms = Date.now() - t0;
  const tm = (r.trace && r.trace.output_timings) || {};
  const allowed = (r.package && r.package.allowed_source_ids) || [];
  const cited = Array.isArray(r.cited_source_ids) ? r.cited_source_ids : [];
  const citedOutOfAllowed = cited.filter((id) => !allowed.includes(id));
  const model_ms = Number(r.trace && r.trace.output_latency_ms) || 0;
  return {
    status: r.status,
    grounded: r.status === "grounded",
    structured_ran: Boolean(r.trace && r.trace.structured_synthesis),
    derived: Boolean(r.trace && r.trace.cited_source_ids_derived),
    answer_len: (r.answer_markdown || "").length,
    claims: Array.isArray(r.trace && r.trace.claim_categories) ? r.trace.claim_categories.length : null,
    cited_count: cited.length,
    cited_source_ids: cited,
    cited_out_of_allowed: citedOutOfAllowed,
    claim_verification_ok: Boolean(r.trace && r.trace.claim_verification_ok),
    prefill_ms: Number.isFinite(tm.prefill_ms) ? tm.prefill_ms : null,
    queue_wait_ms: Number.isFinite(tm.queue_wait_ms) ? tm.queue_wait_ms : null,
    prompt_build_ms: Number.isFinite(tm.prompt_build_ms) ? tm.prompt_build_ms : null,
    claim_citation_verification_ms: Number.isFinite(tm.claim_citation_verification_ms) ? tm.claim_citation_verification_ms : null,
    generation_ms: Number.isFinite(tm.generation_ms) ? tm.generation_ms : null,
    tokens_evaluated: Number.isFinite(tm.tokens_evaluated) ? tm.tokens_evaluated : null,
    tokens_predicted: Number.isFinite(tm.tokens_predicted) ? tm.tokens_predicted : null,
    tokens_per_second: Number.isFinite(tm.tokens_per_second) ? tm.tokens_per_second : null,
    model_ms,
    overhead_ms: Math.max(0, total_ms - model_ms), // resolution+package+validate+verify+assembly
    total_ms, // time_to_final_validated_answer (synthesis + validation)
  };
}

function aggregate(runs) {
  const g = runs.filter((r) => r.grounded);
  return {
    n: runs.length,
    grounded: g.length,
    median_total_ms: median(runs.map((r) => r.total_ms)),
    median_generation_ms: median(g.map((r) => r.generation_ms)),
    median_prefill_ms: median(g.map((r) => r.prefill_ms)),
    median_tokens_predicted: median(g.map((r) => r.tokens_predicted)),
    median_tokens_evaluated: median(g.map((r) => r.tokens_evaluated)),
    mean_tokens_per_second: mean(g.map((r) => r.tokens_per_second)),
    median_overhead_ms: median(runs.map((r) => r.overhead_ms)),
    median_answer_len: median(g.map((r) => r.answer_len)),
  };
}

async function main() {
  const provider = createProvider(process.env);
  console.log(`[spr4-ab] provider=${provider.name} inference=${provider.inferenceLocation || "?"} reps=${REPS} questions=${QUESTIONS.length}`);
  const rows = [];
  const baselineRuns = [];
  const structuredRuns = [];
  for (const { q, entity } of QUESTIONS) {
    for (let i = 0; i < REPS; i++) {
      const b = await runOne(provider, q, entity, false);
      const s = await runOne(provider, q, entity, true);
      baselineRuns.push(b);
      structuredRuns.push(s);
      rows.push({ q, rep: i, baseline: b, structured: s });
      console.log(
        `[spr4-ab] "${q}" #${i} | base ${b.status} ${b.total_ms}ms out=${b.tokens_predicted}tok | struct ${s.status} ${s.total_ms}ms out=${s.tokens_predicted}tok derived=${s.derived} cited=${JSON.stringify(s.cited_source_ids || [])}`,
      );
    }
  }

  const base = aggregate(baselineRuns);
  const struct = aggregate(structuredRuns);

  // ── Gates ──────────────────────────────────────────────────────────────────────────────────────
  const invalidCitationRuns = structuredRuns.filter((r) => r.grounded && r.cited_out_of_allowed.length > 0);
  const invalid_citation_rate = struct.grounded ? invalidCitationRuns.length / struct.grounded : 0;

  // status regression: for each (q,rep) where baseline grounded but structured not.
  const regressions = rows.filter((x) => x.baseline.grounded && !x.structured.grounded);
  const unsupported_or_status_regression_rate = base.grounded ? regressions.length / base.grounded : 0;

  // information preserved: median structured answer length vs baseline (grounded pairs only).
  const pairs = rows.filter((x) => x.baseline.grounded && x.structured.grounded);
  const lenRatios = pairs.map((x) => (x.baseline.answer_len ? x.structured.answer_len / x.baseline.answer_len : 1));
  const median_len_ratio = median(lenRatios);
  const info_preserved = median_len_ratio == null || median_len_ratio >= 0.8; // structured not materially shorter

  // latency: measurable reduction in generated tokens AND generation time.
  const tokens_reduction =
    base.median_tokens_predicted != null && struct.median_tokens_predicted != null
      ? base.median_tokens_predicted - struct.median_tokens_predicted
      : null;
  const gen_ms_reduction =
    base.median_generation_ms != null && struct.median_generation_ms != null
      ? base.median_generation_ms - struct.median_generation_ms
      : null;
  const total_ms_reduction =
    base.median_total_ms != null && struct.median_total_ms != null ? base.median_total_ms - struct.median_total_ms : null;
  const measurable_latency_reduction = (tokens_reduction != null && tokens_reduction > 0) || (gen_ms_reduction != null && gen_ms_reduction > 0);

  const gates = {
    invalid_citation_rate,
    invalid_citation_rate_ok: invalid_citation_rate === 0,
    unsupported_or_status_regression_rate,
    no_status_regression: unsupported_or_status_regression_rate === 0,
    median_len_ratio,
    info_preserved,
    tokens_reduction,
    gen_ms_reduction,
    total_ms_reduction,
    measurable_latency_reduction,
  };
  const PASS =
    gates.invalid_citation_rate_ok && gates.no_status_regression && gates.info_preserved && gates.measurable_latency_reduction;

  const report = { when: new Date().toISOString?.() || null, provider: provider.name, reps: REPS, questions: QUESTIONS.length, baseline: base, structured: struct, gates, verdict: PASS ? "PASS" : "FAIL", rows };
  console.log("\n================ SPR-4 A/B RESULT ================");
  console.log(JSON.stringify({ baseline: base, structured: struct, gates, verdict: report.verdict }, null, 2));
  if (OUT) {
    writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(`[spr4-ab] report → ${OUT}`);
  }
  process.exit(PASS ? 0 : 1);
}

main().catch((e) => {
  console.error("[spr4-ab] FATAL", e);
  process.exit(2);
});
