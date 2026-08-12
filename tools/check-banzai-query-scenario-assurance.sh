#!/usr/bin/env bash
#
# banzai-query-scenario-assurance-check (M2.18B.7 H) — a BEHAVIORAL guard: it loads the compiled
# banzai-query-core WASM (the exact artifact the live service runs) and drives the SINGLE scenario
# source (scenarios_json) through the real deterministic engine (route + boundary), asserting the
# scenario truth table holds end-to-end:
#
#   * a boundary is detected IFF the scenario's class is a boundary (no false neg / no false pos);
#   * boundary + insufficient classes never route to the model (action != "qwen") — 0 model calls;
#   * grounded/terminal/attribute classes route grounded (qwen|deterministic) and never trip the boundary.
#
# This is not a grep: it executes the engine over one authoritative scenario set (Rust owns the data;
# the guard proves the WASM the service loads agrees with it). set -eu; exit 1 on any mismatch.

set -eu
cd "$(dirname "$0")/.."

KB="services/banzai-api/src/rustkb/banzai_api_kb.js"
[ -f "$KB" ] || { echo "banzai-query-scenario-assurance-check: NEEDS_FIX (missing WASM $KB — run wasm-pack)" >&2; exit 1; }

echo "BanzAI Query Core scenario assurance (M2.18B.7 H) — driving the compiled WASM over scenarios_json"

node --input-type=module <<'NODE'
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/");
const kb = require("./services/banzai-api/src/rustkb/banzai_api_kb.js");

const scenarios = JSON.parse(kb.scenarios_json());
if (!Array.isArray(scenarios) || scenarios.length < 14) {
  console.error(`  FAIL: scenarios_json returned ${scenarios.length} (expected >= 14)`);
  process.exit(1);
}

let bad = 0;
for (const s of scenarios) {
  const route = JSON.parse(kb.route_question_json(s.question));
  const boundary = JSON.parse(kb.boundary_evaluate_json(s.question));
  const detected = Boolean(boundary.boundary_detected ?? boundary.boundaryDetected);
  const action = route.action;
  const intent = route.intent || "";

  if (detected !== Boolean(s.is_boundary)) {
    console.error(`  FAIL ${s.id}: boundary_detected=${detected} but class=${s.expect_class} — ${s.question}`);
    bad++;
    continue;
  }
  if (s.expect_class === "boundary") {
    if (action === "qwen") { console.error(`  FAIL ${s.id}: boundary routed to the model`); bad++; }
  } else if (s.expect_class === "insufficient") {
    if (action === "qwen") { console.error(`  FAIL ${s.id}: insufficient routed to the model`); bad++; }
    if (!(action === "insufficient" || intent === "no_source")) {
      console.error(`  FAIL ${s.id}: off-topic must be insufficient/no_source, got action=${action} intent=${intent}`); bad++;
    }
  } else {
    // grounded_explanation | grounded_terminal | attribute_not_declared → answerable, not boundary.
    if (!(action === "qwen" || action === "deterministic")) {
      console.error(`  FAIL ${s.id}: answerable must route grounded, got action=${action}`); bad++;
    }
    if (detected) { console.error(`  FAIL ${s.id}: answerable wrongly tripped the boundary`); bad++; }
  }
}

if (bad) { console.error(`banzai-query-scenario-assurance-check: NEEDS_FIX (${bad} scenario mismatch)`); process.exit(1); }
console.log(`  ok: ${scenarios.length} scenarios agree with the compiled engine (boundary + routing truth table)`);
console.log("banzai-query-scenario-assurance-check: OK");
NODE
