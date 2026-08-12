#!/usr/bin/env bash
#
# banzai-task-fulfilment-contract-check (M2.18B.7 Semantic Task Fulfilment) — a BEHAVIORAL guard: it loads
# the compiled banzai-query-core WASM (the exact artifact the service runs) and drives the task-fulfilment
# layer over the six zero-tolerance production regressions, asserting the engine now FULFILS the task:
#
#   * "me da um exemplo de operador"      -> task=example,   tasked ILLUSTRATIVE example, marked + neutral
#   * "me da um exemplo de federacao"     -> task=example,   tasked illustrative scenario
#   * "me da exemplo de um manifest ..."  -> task=template,  tasked REAL manifest structure (schema fields)
#   * "como federar um operador?"         -> task=procedure, tasked transparent-partial procedure
#   * "ADR 005"                            -> task=document_lookup  (differentiated from explanation)
#   * "me explica o ADR 005"              -> task=explanation      (differentiated from lookup)
#
# and that every tasked terminal PASSES its own deterministic TaskCompletionValidator (publishable), a
# generic definition/architecture answer FAILS it, and the manifest example uses real schema fields and is
# marked illustrative. Not a grep — it executes the engine. set -eu; exit 1 on any mismatch.

set -eu
cd "$(dirname "$0")/.."

KB="services/banzai-api/src/rustkb/banzai_api_kb.js"
[ -f "$KB" ] || { echo "banzai-task-fulfilment-contract-check: NEEDS_FIX (missing WASM $KB — run wasm-pack)" >&2; exit 1; }

echo "BanzAI Task Fulfilment contract (M2.18B.7) — driving the compiled WASM over the 6 zero-tolerance cases"

node --input-type=module <<'NODE'
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/");
const kb = require("./services/banzai-api/src/rustkb/banzai_api_kb.js");

for (const fn of ["answer_obligations_json", "tasked_answer_json", "task_completion_json"]) {
  if (typeof kb[fn] !== "function") { console.error(`  FAIL: WASM missing ${fn}`); process.exit(1); }
}

let bad = 0;
const fail = (m) => { console.error(`  FAIL: ${m}`); bad++; };
const task = (q, seed = "") => JSON.parse(kb.answer_obligations_json(q, seed)).requested_task;
const tasked = (q, seed = "") => JSON.parse(kb.tasked_answer_json(q, seed));
const completion = (q, md, cited, n, ok, seed = "") =>
  JSON.parse(kb.task_completion_json(kb.answer_obligations_json(q, seed), md, JSON.stringify(cited), n, ok));

// 1. task classification is correct for the six cases.
const expect = [
  ["me da um exemplo de operador", "", "example"],
  ["me da um exemplo de federacao", "", "example"],
  ["me da exemplo de um manifest valido", "", "example"],
  ["como federar um operador?", "", "procedure"],
  ["ADR 005", "ADR-005", "document_lookup"],
  ["me explica o ADR 005", "ADR-005", "explanation"],
];
for (const [q, seed, want] of expect) {
  const got = task(q, seed);
  if (got !== want) fail(`task("${q}") = ${got}, expected ${want}`);
}
// lookup and explanation MUST differ (the core "ADR 005" vs "me explica" defect).
if (task("ADR 005", "ADR-005") === task("me explica o ADR 005", "ADR-005"))
  fail("document lookup and explanation must be different tasks");

// 2. the 4 structural/example/procedure cases have a tasked terminal that PASSES completion.
for (const q of [
  "me da um exemplo de operador",
  "me da um exemplo de federacao",
  "me da exemplo de um manifest valido",
  "como federar um operador?",
]) {
  const t = tasked(q);
  if (!t || !t.matched) { fail(`no tasked terminal for "${q}"`); continue; }
  const v = completion(q, t.answer_markdown, t.source_ids, t.sources.length, true);
  if (!v.publishable) fail(`tasked terminal for "${q}" not publishable: ${v.status} (${v.note})`);
}

// 3. the manifest example uses REAL schema fields + is marked illustrative + cites the schema.
{
  const t = tasked("me da exemplo de um manifest valido");
  for (const f of ["operator_id", "capabilities", "key_manifest_url", "supported_levels", "protocol_version"])
    if (!t.answer_markdown.includes(f)) fail(`manifest example missing real field ${f}`);
  if (!/ilustrativ/i.test(t.answer_markdown)) fail("manifest example not marked illustrative");
  if (!t.source_ids.includes("operator-manifest-schema")) fail("manifest example must cite the schema");
}

// 4. the operator example is illustrative + operator-neutral (never invents a real operator).
{
  const t = tasked("me da um exemplo de operador");
  const low = t.answer_markdown.toLowerCase();
  if (!/ilustrativ/.test(low)) fail("operator example not marked illustrative");
  if (!/(nao opera|não opera|operator-neutral|neutral)/.test(low)) fail("operator example not operator-neutral");
}

// 5. the deterministic validator REJECTS the exact failing shapes (regression fences).
{
  // an example answered with a definition
  const v = completion(
    "me da um exemplo de federacao",
    "Um exemplo de federação pode ser encontrado na ADR-040, que descreve avaliação de confiança sem certificados.",
    ["ADR-040"], 2, true,
  );
  if (v.publishable) fail("a definition must NOT satisfy an example request");
  // a manifest answered with generic architecture
  const v2 = completion(
    "me da exemplo de um manifest valido",
    "Um manifesto válido deve incluir ledger duplo, carteira, FSM de transação, roteamento e liquidação.",
    ["ADR-001"], 1, true,
  );
  if (v2.publishable) fail("generic architecture must NOT satisfy a manifest/template request");
  // a procedure answered with a bare ADR list
  const v3 = completion(
    "como federar um operador?",
    "Para federar um operador, deve-se seguir o ADR-038 ou o ADR-040.",
    ["ADR-038", "ADR-040"], 2, true,
  );
  if (v3.publishable) fail("a bare ADR list must NOT satisfy a procedure request");
}

if (bad) { console.error(`banzai-task-fulfilment-contract-check: NEEDS_FIX (${bad} mismatch)`); process.exit(1); }
console.log("  ok: 6 cases classified, 4 tasked terminals fulfil + publish, manifest uses real fields, failing shapes rejected");
console.log("banzai-task-fulfilment-contract-check: OK");
NODE
