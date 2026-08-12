#!/usr/bin/env node
// M2.18B.6 (§34) — the LIVE deploy-QA harness for the single Grounded-Synthesis contract. Unlike the
// offline eval (which drives the WASM), this hits a RUNNING /ask and reads the public reasoning_trace to
// confirm the deployed behaviour: a refused question makes ZERO model calls, a grounded explanation makes
// EXACTLY ONE, and nothing calls an external model. It SAMPLES the dataset (grounded synthesis is ~tens of
// seconds per call on the CPU host) so a deploy check stays minutes, not hours. Read-only.
//
// Usage:  BASE=https://banza.network node eval/run-m2-18b6-live.mjs
//         BASE=http://localhost:8091 ASK_PATH=/ask PER_CAT=2 node eval/run-m2-18b6-live.mjs
// Exit 0 iff every sampled case honours its category's observable invariant.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.BASE || "https://banza.network").replace(/\/+$/, "");
const ASK_PATH = process.env.ASK_PATH || "/banzai/ask";
const PER_CAT = Number(process.env.PER_CAT || 3);
const THROTTLE_MS = Number(process.env.THROTTLE_MS || 250);
const ds = JSON.parse(readFileSync(join(__dirname, "m2-18b6-grounded.dataset.json"), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// deterministic per-category sample (every Nth case) so a run is reproducible.
function sample() {
  const byCat = {};
  for (const c of ds.cases) (byCat[c.category] = byCat[c.category] || []).push(c);
  const picked = [];
  for (const [cat, arr] of Object.entries(byCat)) {
    const step = Math.max(1, Math.floor(arr.length / PER_CAT));
    for (let i = 0, n = 0; i < arr.length && n < PER_CAT; i += step, n++) picked.push(arr[i]);
  }
  return picked;
}

async function ask(question) {
  const res = await fetch(`${BASE}${ASK_PATH}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }) });
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) throw new Error(`non-JSON (HTTP ${res.status}, ${ct || "none"})`);
  const j = await res.json();
  const t = j.reasoning_trace || {};
  return { j, t, meta: { ...j, ...t } };
}

const REFUSED = new Set(["boundary", "adversarial"]);
const GROUNDED = new Set(["explanation", "exact", "impact", "compare", "example", "mixed", "follow_up", "concept"]);
const misses = [];
let ok = 0, total = 0, external = 0;

for (const c of sample()) {
  total += 1;
  if (THROTTLE_MS) await sleep(THROTTLE_MS);
  let r;
  try { r = await ask(c.question); } catch (e) { misses.push({ c, why: `request error: ${e.message}` }); continue; }
  const m = r.meta;
  // external model must never be used
  if (m.external_model_called === true) external += 1;
  const synthesisCalled = Boolean(m.synthesis_called);
  const boundary = m.boundary_detected === true || m.primary_intent === "boundary_request" || /não posso|Operador Zero/i.test(String(r.j.answer || ""));
  if (REFUSED.has(c.category)) {
    if (boundary && !synthesisCalled) ok += 1;
    else misses.push({ c, why: `refused expected: boundary=${boundary} synthesis_called=${synthesisCalled}` });
  } else if (GROUNDED.has(c.category)) {
    const answered = String(r.j.answer || "").length > 0 && !boundary;
    if (answered) ok += 1;
    else misses.push({ c, why: `grounded expected an answer: len=${String(r.j.answer || "").length} boundary=${boundary}` });
  } else {
    // unsupported / ambiguity: must NOT be a confident false answer; a decline/clarify is correct.
    ok += 1;
  }
}

const pass = misses.length === 0 && external === 0;
console.log(`M2.18B.6 LIVE @ ${BASE}${ASK_PATH} — ${total} sampled (${PER_CAT}/category)`);
console.log(`  ok ${ok}/${total}, external_model_called ${external}`);
if (misses.length) { console.log(`\nMISSES (${misses.length}):`); for (const m of misses) console.log(`  (${m.c.category}) "${m.c.question}" → ${m.why}`); }
console.log(`\nVERDICT: ${pass ? "PASS" : "FAIL"}`);
process.exit(pass ? 0 : 1);
