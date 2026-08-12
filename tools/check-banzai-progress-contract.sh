#!/usr/bin/env bash
# check-banzai-progress-contract.sh — the SPR-1 "Safe Progressive Response" contract guard.
#
# SPR-1 introduces the TYPED FOUNDATION for progressive answers WITHOUT changing any runtime answer
# behaviour: a versioned progressive-event contract + a typed response disposition, both owned by Rust
# (engines/banzai-query-core/src/disposition.rs) and mirrored, transport-only, in
# services/banzai-api/src/progressContract.js. This guard defends the contract's invariants, behaviourally
# via the committed WASM plus a static wiring check:
#   * the progressive-event contract is VERSIONED (schema token "banzai-progress/1") and the event-kind set
#     is EXACTLY the 18 declared kinds, in order;
#   * there is NO model-token / delta / partial-prose event kind — no unvalidated model text is ever
#     streamed (the whole point of Safe Progressive Response);
#   * the typed response_disposition set is exactly the 6 declared dispositions; the mapping is safety-first
#     (a boundary → REFUSED), a deterministic terminal → DETERMINISTIC_ANSWER, a validated synthesis →
#     GROUNDED_ANSWER;
#   * response_disposition / boundary_context exist and expose NO secret/PII field (only the three safe
#     boundary fields is_boundary/boundary_kind/refused; never a prompt/secret/echoed user text);
#   * the JS mirror equals the Rust source of truth (event kinds, schema token, dispositions).
# The decision LOGIC is Rust; this wrapper only drives it and inspects the wiring. WASM/pg-free
# static-degrade for the CI job that has no banzai-api node_modules (pattern from check-banzai-toolplanner).

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

WASM_DIR="services/banzai-api/src/rustkb"
MIRROR="services/banzai-api/src/progressContract.js"
RUST="engines/banzai-query-core/src/disposition.rs"
LIB="engines/banzai-api-kb/src/lib.rs"

[ -f "$WASM_DIR/banzai_api_kb.js" ] || { echo "FAIL: $WASM_DIR not built (run wasm-pack)"; exit 1; }
[ -f "$MIRROR" ] || { echo "FAIL: $MIRROR not found"; exit 1; }
[ -f "$RUST" ] || { echo "FAIL: $RUST not found"; exit 1; }
[ -f "$LIB" ] || { echo "FAIL: $LIB not found"; exit 1; }

echo "== banzai-progress-contract-check (SPR-1) =="

# ── self-test ─────────────────────────────────────────────────────────────────────────────────────────
printf '%s\n' 'REQUEST_ACCEPTED' | grep -q 'REQUEST_ACCEPTED' || { echo "guard self-test FAILED" >&2; exit 2; }

# ── behavioural: drive the committed Rust WASM (the contract source of truth). ─────────────────────────
node - "$WASM_DIR" <<'NODE'
const path = require("path");
const kb = require(path.resolve(process.argv[2], "banzai_api_kb.js"));
let bad = 0;
const err = (m) => { console.log("FAIL: " + m); bad = 1; };

for (const fn of ["progress_event_contract_json", "response_dispositions_json", "response_disposition_json", "boundary_context_json"]) {
  if (typeof kb[fn] !== "function") err(`WASM missing export ${fn}`);
}
if (bad) process.exit(bad);

// The versioned progressive-event contract.
const EXPECTED_KINDS = [
  "REQUEST_ACCEPTED","INTENT_RESOLVED","ENTITY_RESOLVED","TOOL_PLAN_READY","TOOL_STARTED","TOOL_COMPLETED",
  "SOURCE_RESOLVED","FACTUAL_PACKAGE_READY","SYNTHESIS_STARTED","SYNTHESIS_COMPLETED",
  "CLAIM_VERIFICATION_STARTED","CITATION_VERIFICATION_STARTED","FINAL_VALIDATED","HONEST_FALLBACK",
  "REFUSED","CANCELLED","ERROR","DONE",
];
const contract = JSON.parse(kb.progress_event_contract_json());
if (contract.contract !== "banzai-progress") err(`contract family = ${contract.contract} (want banzai-progress)`);
if (contract.version !== 1) err(`contract version = ${contract.version} (want 1)`);
if (contract.schema_version !== "banzai-progress/1") err(`schema token = ${contract.schema_version} (want banzai-progress/1)`);
if (JSON.stringify(contract.kinds) !== JSON.stringify(EXPECTED_KINDS)) {
  err(`event kinds mismatch:\n  got:  ${JSON.stringify(contract.kinds)}\n  want: ${JSON.stringify(EXPECTED_KINDS)}`);
}
if (contract.kinds.length !== 18) err(`expected 18 event kinds, got ${contract.kinds.length}`);

// NO model-token / delta / partial-prose kind — no unvalidated model text is ever streamed.
for (const k of contract.kinds) {
  if (/TOKEN|DELTA|PARTIAL/i.test(k)) err(`forbidden streaming-prose event kind: ${k}`);
}

// The typed response dispositions.
const EXPECTED_DISP = ["GROUNDED_ANSWER","DETERMINISTIC_ANSWER","HONEST_FALLBACK","REFUSED","CLARIFICATION","INSUFFICIENT"];
const disp = JSON.parse(kb.response_dispositions_json());
if (JSON.stringify(disp) !== JSON.stringify(EXPECTED_DISP)) {
  err(`dispositions mismatch:\n  got:  ${JSON.stringify(disp)}\n  want: ${JSON.stringify(EXPECTED_DISP)}`);
}

// The disposition mapping — safety-first + typed outcomes.
const map = (input) => JSON.parse(kb.response_disposition_json(JSON.stringify(input))).disposition;
// A boundary → REFUSED, even if a later stage also claims grounded/terminal (safety wins).
if (map({ grounded: true, terminal_kind: "canonical_definition", boundary: { is_boundary: true, boundary_kind: "action", refused: true } }) !== "REFUSED")
  err("a boundary must map to REFUSED (safety first)");
if (map({ terminal_kind: "journey_next_step" }) !== "DETERMINISTIC_ANSWER") err("a deterministic terminal must map to DETERMINISTIC_ANSWER");
if (map({ grounded: true }) !== "GROUNDED_ANSWER") err("a validated synthesis must map to GROUNDED_ANSWER");
if (map({ contextual_fallback_kind: "ambiguous" }) !== "CLARIFICATION") err("ambiguous must map to CLARIFICATION");
if (map({ contextual_fallback_kind: "no_comparable_data" }) !== "INSUFFICIENT") err("no_comparable_data must map to INSUFFICIENT");
if (map({}) !== "HONEST_FALLBACK") err("an empty resolution must default to HONEST_FALLBACK (never a false grounded claim)");

// boundary_context exposes ONLY the three safe fields — no secret/PII/echoed-text field.
const bctx = JSON.parse(kb.boundary_context_json("transfere 100 kz"));
const keys = Object.keys(bctx).sort();
if (JSON.stringify(keys) !== JSON.stringify(["boundary_kind", "is_boundary", "refused"]))
  err(`boundary_context exposes unexpected fields: ${JSON.stringify(keys)}`);
if (bctx.is_boundary !== true || bctx.refused !== true) err("a boundary question must yield is_boundary+refused");
const FORBIDDEN_FIELD = /prompt|secret|token|cookie|password|credential|chain_of_thought|matched_action|matched_object|matched_target|private|api_key/i;
for (const k of keys) if (FORBIDDEN_FIELD.test(k)) err(`boundary_context leaks a sensitive field: ${k}`);
// the disposition result's echoed boundary_context has the same safe shape.
const r = JSON.parse(kb.response_disposition_json(JSON.stringify({ boundary: { is_boundary: true, boundary_kind: "safety", refused: true } })));
const rkeys = Object.keys(r.boundary_context || {}).sort();
if (JSON.stringify(rkeys) !== JSON.stringify(["boundary_kind", "is_boundary", "refused"]))
  err(`disposition boundary_context exposes unexpected fields: ${JSON.stringify(rkeys)}`);

if (!bad) console.log("  ok: WASM versioned contract (banzai-progress/1) + 18 event kinds (no model-token) + 6 dispositions + safety-first mapping + safe boundary_context");
process.exit(bad);
NODE
[ $? -eq 0 ] || FAILED=1

# ── behavioural: the JS mirror equals the Rust source of truth (transport only). ───────────────────────
node - "$WASM_DIR" "$MIRROR" <<'NODE'
const path = require("path");
const kb = require(path.resolve(process.argv[2], "banzai_api_kb.js"));
(async () => {
  let bad = 0;
  const err = (m) => { console.log("FAIL: " + m); bad = 1; };
  const mirrorUrl = require("url").pathToFileURL(path.resolve(process.argv[3])).href;
  let m;
  try {
    m = await import(mirrorUrl);
  } catch (e) {
    const code = e && (e.code || "");
    if (String(code) === "ERR_MODULE_NOT_FOUND" || /Cannot find package|Cannot find module/.test(String(e && e.message))) {
      console.log("  ok: mirror runtime check skipped (banzai-api deps not installed in this job) — WASM contract + static checks still apply");
      process.exit(0);
    }
    throw e;
  }
  const contract = JSON.parse(kb.progress_event_contract_json());
  if (JSON.stringify([...m.PROGRESS_EVENT_KINDS]) !== JSON.stringify(contract.kinds)) err("mirror PROGRESS_EVENT_KINDS != WASM kinds");
  if (m.PROGRESS_SCHEMA_TOKEN !== contract.schema_version) err(`mirror schema token ${m.PROGRESS_SCHEMA_TOKEN} != WASM ${contract.schema_version}`);
  if (JSON.stringify([...m.RESPONSE_DISPOSITIONS]) !== kb.response_dispositions_json()) err("mirror RESPONSE_DISPOSITIONS != WASM dispositions");
  if (m.responseDisposition({ grounded: true }).disposition !== "GROUNDED_ANSWER") err("mirror responseDisposition disagrees with Rust");
  if (m.boundaryContext("transfere 100 kz").refused !== true) err("mirror boundaryContext disagrees with Rust");
  if (!bad) console.log("  ok: progressContract.js mirrors the Rust source of truth (kinds + token + dispositions + mapping)");
  process.exit(bad);
})();
NODE
[ $? -eq 0 ] || FAILED=1

# ── static: the Rust source is the versioned, typed foundation with the required public surface. ───────
grep -q 'PROGRESS_SCHEMA_TOKEN: &str = "banzai-progress/1"' "$RUST" || fail "$RUST must declare the versioned schema token banzai-progress/1"
grep -q 'pub enum ProgressEventKind' "$RUST" || fail "$RUST must declare the ProgressEventKind enum"
grep -q 'pub enum ResponseDisposition' "$RUST" || fail "$RUST must declare the ResponseDisposition enum"
grep -q 'pub struct BoundaryContext' "$RUST" || fail "$RUST must declare the BoundaryContext struct"
grep -q 'pub fn response_disposition' "$RUST" || fail "$RUST must declare the response_disposition mapping"
# The ProgressEventKind enum variant block declares NO Token/Delta/Partial variant (defence in depth over
# the behavioural kind-list check above). Scan only the enum body, not the safety comments that mention it.
enum_body=$(awk '/pub enum ProgressEventKind \{/{f=1} f{print} /^\}/{if(f)exit}' "$RUST")
if printf '%s\n' "$enum_body" | grep -qiE '\b(Token|Delta|Partial)\b'; then
  fail "$RUST ProgressEventKind declares a forbidden model-token/delta/partial variant"
else
  ok "ProgressEventKind declares no model-token/delta/partial variant"
fi
# The BoundaryContext struct declares ONLY the three safe fields — no secret/PII/echoed-text field.
bc_body=$(awk '/pub struct BoundaryContext \{/{f=1} f{print} /^\}/{if(f)exit}' "$RUST")
if printf '%s\n' "$bc_body" | grep -qiE 'prompt|secret|token|cookie|password|credential|chain_of_thought|matched_action|matched_object|matched_target|private|api_key'; then
  fail "$RUST BoundaryContext declares a sensitive/echoed-text field"
else
  ok "BoundaryContext declares only safe public fields"
fi
[ "$FAILED" -eq 0 ] && ok "Rust source declares the versioned typed foundation (contract + disposition + safe boundary_context)"

# ── static: the WASM adaptation surface exposes the four SPR-1 exports. ────────────────────────────────
for exp in progress_event_contract_json response_dispositions_json response_disposition_json boundary_context_json; do
  grep -q "pub fn $exp" "$LIB" || fail "$LIB missing WASM export $exp"
done
[ "$FAILED" -eq 0 ] && ok "banzai-api-kb exposes the four SPR-1 WASM exports"

# ── static: the JS mirror is transport-only + carries the safety documentation, adds no logic. ────────
grep -q 'banzai-progress' "$MIRROR" || fail "$MIRROR must reference the banzai-progress contract"
grep -q 'export const PROGRESS_EVENT_KINDS' "$MIRROR" || fail "$MIRROR must export PROGRESS_EVENT_KINDS"
grep -q 'export const PROGRESS_SCHEMA_TOKEN' "$MIRROR" || fail "$MIRROR must export PROGRESS_SCHEMA_TOKEN"
grep -q 'export const RESPONSE_DISPOSITIONS' "$MIRROR" || fail "$MIRROR must export RESPONSE_DISPOSITIONS"
grep -q 'export function responseDisposition' "$MIRROR" || fail "$MIRROR must export responseDisposition"
# The mirror is hermetic: no pg/network/tool logic (it only requires the self-contained WASM).
badm=$(grep -nEi '\b(SELECT|INSERT|UPDATE|DELETE)\b|fetch\(|createHash|new Pool|pg\.|http\.|https\.|net\.' "$MIRROR" | grep -vE '^\s*[0-9]+:\s*//' || true)
[ -z "$badm" ] && ok "progressContract.js is hermetic transport (no pg/network/tool logic)" || { fail "$MIRROR contains non-transport logic:"; printf '%s\n' "$badm" | sed 's/^/      /'; }
# The mirror declares no model-token/delta event kind of its own (it derives kinds from the WASM).
if grep -qE '"(MODEL_TOKEN|TOKEN_DELTA)"|["'\'']\w*(_TOKEN|_DELTA)["'\'']' "$MIRROR"; then
  fail "$MIRROR declares a forbidden model-token/delta kind"
else
  ok "progressContract.js declares no model-token/delta kind"
fi

if [ "$FAILED" -ne 0 ]; then
  echo "PROGRESS CONTRACT CHECK FAILED ❌"
  exit 1
fi
echo "PROGRESS CONTRACT CHECK PASSED ✅"
