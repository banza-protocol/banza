#!/usr/bin/env bash
#
# BanzAI Operator Journey E2E Closure Guard (M2.11B).
#
# M2.11A built the evidence state model, but the browser kept a SECOND evaluator alongside it: the
# pre-M2.11A `journey_evaluate_json`, computing its own statuses, its own progress and its own next
# action over the same session. Two engines over one state is how a step came to show a green tick
# next to a badge reading "visitado" — each was right by its own logic, and the operator was shown a
# contradiction.
#
# This guard keeps the convergence closed. It fails if:
#   * the browser reintroduces a second journey evaluator;
#   * the compatibility view stops being DERIVED from the evidence model (so `/ask` and the card
#     could disagree again);
#   * either half of the end-to-end test disappears, or they stop being joined;
#   * the session gains any persistence outside browser memory.
#
# It drives the REAL committed Rust/WASM engine — a green run means the shipped engine behaves, not
# that a description of it reads well.
#
# Exit 1 on any FAIL. Exit 2 if the engine cannot be driven.

set -euo pipefail
cd "$(dirname "$0")/.."

if locale -a 2>/dev/null | grep -qiE '^C\.UTF-?8$'; then export LC_ALL=C.UTF-8
elif locale -a 2>/dev/null | grep -qiE '^en_US\.UTF-?8$'; then export LC_ALL=en_US.UTF-8
fi

WASM="services/banzai-api/src/journeywasm/banzai_operator_journey.js"
LIB_RS="engines/banzai-operator-journey/src/lib.rs"
SESSION_RS="engines/banzai-operator-journey/src/session.rs"
AGENT_TSX="website/components/banzai/BanzaiAgent.tsx"
WRAPPER="website/lib/banzaOperatorJourney.ts"
E2E_RS="engines/banzai-operator-journey/tests/journey_e2e.rs"
E2E_TS="website/lib/operatorJourneyE2E.test.ts"
# M2.19EF2 — the browser evaluator is now the single 9-step validation session.
VALJOURNEY="website/components/banzai/validationJourney.tsx"
VALMODE="website/components/banzai/BanzaiValidationMode.tsx"

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }

[ -f "$WASM" ] || { echo "FAIL: journey WASM not built at $WASM"; exit 2; }

# ── 1. ONE evaluator in the browser ──────────────────────────────────────────
echo "banzai-operator-journey-e2e: engine convergence…"

# Strip comments before looking for calls, so prose ABOUT the old evaluator never trips the check
# and, more importantly, never lets a real call hide inside a commented-looking line.
#
# The stripped text goes to a FILE, never down a pipe into `grep -q`: `-q` exits on its first match,
# which kills `sed` with SIGPIPE, which under `set -o pipefail` fails the pipeline and turns a real
# match into a spurious "not found". That bug would silently disable every check below.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
strip_comments() { sed -e 's://.*::' -e '/^[[:space:]]*\*/d' -e 's:/\*.*\*/::' "$1"; }
AGENT_CODE="$TMP/agent.code"
strip_comments "$AGENT_TSX" > "$AGENT_CODE"

if grep -q 'evaluateJourney' "$AGENT_CODE"; then
  bad "$AGENT_TSX calls evaluateJourney — the browser must run ONE evaluator (evaluateSession)"
else
  ok "the browser runs a single journey evaluator"
fi

grep -q 'useValidationSession' "$AGENT_CODE" \
  && ok "the browser runs the single validation session (useValidationSession)" \
  || bad "$AGENT_TSX must run the single useValidationSession — the 9-step validation journey is the only evaluator"

# The compatibility view must DELEGATE, not recompute. `/ask` still consumes it.
if grep -A4 'pub fn evaluate(state: &Value)' "$LIB_RS" | grep -q 'legacy_evaluation'; then
  ok "the compatibility view is derived from the evidence model"
else
  bad "$LIB_RS::evaluate must delegate to session::legacy_evaluation, not recompute statuses"
fi

# The pre-M2.11A status logic must be gone, not merely unused.
for dead in 'fn next_recommended_action' 'fn effective_status' 'fn is_blocked'; do
  if grep -q "$dead" "$LIB_RS"; then
    bad "$LIB_RS still defines '$dead' — the second evaluator must be deleted, not parked"
  fi
done
grep -q 'fn next_recommended_action' "$LIB_RS" || ok "the pre-M2.11A journey logic is deleted"

# The next step is DERIVED from the Rust-produced step verdicts (the first NOT_EVALUATED step): the
# session advances deterministically over STEP_ORDER (runFrom), and the UI derives the next step and
# routes by calling the session's setActiveStep — never by re-parsing an action slug in a TS action→tab
# table. (M2.19G.1 replaced the pre-M2.19 `runNext` name with `runFrom`; the invariant is unchanged.)
grep -q 'runFrom' "$VALJOURNEY" && grep -q 'NOT_EVALUATED' "$VALJOURNEY" \
  && ok "the next step is derived from the Rust step verdicts (runFrom over STEP_ORDER; state keyed by NOT_EVALUATED)" \
  || bad "$VALJOURNEY must derive the next step from the Rust step states (runFrom over STEP_ORDER, NOT_EVALUATED)"
grep -q 'NOT_EVALUATED' "$VALMODE" && grep -q 'setActiveStep' "$VALMODE" \
  && ok "the UI derives the next step (first NOT_EVALUATED) and routes via setActiveStep, not a TS action→tab table" \
  || bad "$VALMODE must derive the next step from NOT_EVALUATED and route via session.setActiveStep"

# ── 2. Both halves of the end-to-end test exist and are joined ───────────────
echo "banzai-operator-journey-e2e: end-to-end coverage…"

[ -f "$E2E_RS" ] && ok "the engine half of the end-to-end test exists" \
  || bad "missing $E2E_RS — the journey must be walked end to end through the real engine"
[ -f "$E2E_TS" ] && ok "the browser half of the end-to-end test exists" \
  || bad "missing $E2E_TS — what the browser SENDS must be pinned too"

# Both halves must exercise the shared builder, or the Rust test is testing an invented shape.
grep -q 'buildNavigationState' "$WRAPPER" \
  && ok "the shared navigation builder is exported" \
  || bad "$WRAPPER must export buildNavigationState — one builder for the browser and the test"
# M2.19G.1 (ADR-034) — each step stores the SERVER-built OperationReceipt (endpoint-originated: the Rust
# backend builds it from fetched content). The 9-step journey is closed end to end (Discovery →
# Prontidão de certificação) and steps run only via the session runners.
grep -q 'ServerOperationReceipt' "$VALJOURNEY" \
  && ok "the validation session stores the server-built OperationReceipt per step (ServerOperationReceipt)" \
  || bad "$VALJOURNEY must store each step's server-built OperationReceipt (ServerOperationReceipt)"
grep -q 'id: "discovery"' "$VALJOURNEY" && grep -q 'id: "certification"' "$VALJOURNEY" \
  && ok "the journey is closed end to end: discovery → certification (Prontidão de certificação)" \
  || bad "$VALJOURNEY must cover the journey end to end (discovery → certification)"
grep -q 'runAll' "$VALJOURNEY" && grep -q 'runOne' "$VALJOURNEY" \
  && ok "steps run via the validation session runners (runOne / runFrom / runAll)" \
  || bad "$VALJOURNEY must run steps via runOne / runFrom / runAll (the single evaluator)"
grep -q 'buildNavigationState' "$E2E_TS" \
  && ok "the browser half tests the shared builder" \
  || bad "$E2E_TS must exercise buildNavigationState"
grep -q 'operatorJourneyE2E' "$E2E_RS" \
  && ok "the two halves reference each other" \
  || bad "$E2E_RS must name the browser half it is joined to"

# The walk must cover every step, not just the first one.
for step in guia manifest conformidade trust federacao evidence_bundle traces; do
  grep -q "\"$step\"" "$E2E_RS" || bad "$E2E_RS never walks the '$step' step"
done
grep -q '"traces"' "$E2E_RS" && ok "the end-to-end walk covers all seven steps"

# ── 2b. The adapter tone vocabulary is shared (unchanged; Model B verdicts) ─────
# The endpoint-originated adapters still share one tone vocabulary. Model A no longer maps a tone to a
# verdict (ADR-036 — it is guidance only), so there is no `toneVerdict` in the guidance
# wrapper; the shared adapter contract is still pinned here.
echo "banzai-operator-journey-e2e: adapter tone vocabulary…"

TONE_FNS=$(grep -rlE '\): "pass" \| "fail"' website/lib/*.ts | wc -l | tr -d ' ')
[ "$TONE_FNS" -ge 5 ] \
  && ok "the adapters share one tone vocabulary ($TONE_FNS functions)" \
  || bad "expected the pass/fail tone vocabulary across the adapters, found $TONE_FNS"

# The guidance wrapper must NOT re-introduce a tone→verdict mapper: Model A does not evaluate.
if grep -q 'export function toneVerdict' "$WRAPPER"; then
  bad "$WRAPPER must not map a tone to a verdict — Model A is guidance only (ADR-036)"
else
  ok "the guidance wrapper maps no tone to a verdict (guidance only)"
fi

# ── 2c. Every NAVIGATION action the engine can recommend has a name in the UI ──
# The button reads `nextActionLabel(action)`, which falls back to a generic "Continuar" for an unmapped
# slug. That fallback is silent, so the cross-language contract is made explicit: every navigation
# action the engine publishes must have a label in the wrapper.
echo "banzai-operator-journey-e2e: recommended navigation actions…"

node -e '
  const j = require(require("node:path").resolve(process.argv[1]));
  const v = JSON.parse(j.journey_vocabulary_json());
  process.stdout.write((v.actions || []).join("\n"));
' "$WASM" > "$TMP/rust-actions.txt" 2>/dev/null || true
RUST_N=$(grep -c . "$TMP/rust-actions.txt" || true)
[ "${RUST_N:-0}" -ge 8 ] \
  && ok "the engine publishes $RUST_N distinct navigation actions" \
  || bad "expected the engine to publish several navigation actions, parsed ${RUST_N:-0}"

missing=0
while read -r a; do
  [ -n "$a" ] || continue
  grep -q "\b$a\b" "$WRAPPER" || { bad "engine action '$a' has no label in $WRAPPER"; missing=1; }
done < "$TMP/rust-actions.txt"
[ "$missing" -eq 0 ] && ok "every engine navigation action has a name on the button"

# ── 3. The session stays in browser memory ──────────────────────────────────
echo "banzai-operator-journey-e2e: session boundary…"

# Match real USE of a storage API (`localStorage.setItem`, `cookie =`), not prose documenting that
# none is used — the component legitimately explains the rule in its comments.
if grep -qE '\b(localStorage|sessionStorage|indexedDB)[[:space:]]*\.' "$AGENT_CODE"; then
  bad "$AGENT_TSX uses browser storage — the journey session is in-memory only"
elif grep -qE '\bdocument\.cookie[[:space:]]*=' "$AGENT_CODE"; then
  bad "$AGENT_TSX writes a cookie — the journey session is in-memory only"
else
  ok "the session touches no storage API"
fi

grep -q 'browser_memory_only' "$SESSION_RS" \
  && ok "the engine declares the session scope" \
  || bad "$SESSION_RS must declare session_scope = browser_memory_only"

# ── 4. Drive the committed engine ───────────────────────────────────────────
echo "banzai-operator-journey-e2e: driving the committed engine…"

node - "$WASM" <<'NODE' || fail=1
const j = require(require('node:path').resolve(process.argv[2]));
let bad = 0;
const check = (l, c, d) => { if (c) console.log(`  ok: ${l}`); else { console.log(`  FAIL: ${l}${d ? " — " + d : ""}`); bad = 1; } };
const S = (st) => JSON.parse(j.journey_session_json(JSON.stringify(st)));
const L = (st) => JSON.parse(j.journey_evaluate_json(JSON.stringify(st)));
const ORDER = ["guia","manifest","conformidade","trust","federacao","evidence_bundle","traces"];
const st = (steps, current = "guia") => ({ current_step: current, steps });
const open = () => ({ visited: true });

// THE convergence property: the card (session) and /ask (compat) read the same session the same way —
// same NAVIGATION status per activity, same navigation progress. Neither view emits a verdict/score.
const mixed = st({ guia: open(), manifest: open(), conformidade: open() }, "trust");
const s = S(mixed), l = L(mixed);
check("both views report the same navigation progress",
  s.navigation_progress.activities_visited === l.navigation_progress.activities_visited,
  `card=${s.navigation_progress.activities_visited} ask=${l.navigation_progress.activities_visited}`);
for (const step of ORDER) {
  const rich = (s.steps.find((x) => x.step === step) || {}).status;
  const flat = (l.steps.find((x) => x.step === step) || {}).status;
  check(`${step}: the card and /ask agree on the navigation status`, rich === flat, `card=${rich} ask=${flat}`);
}
for (const [name, out] of [["card", JSON.stringify(s)], ["ask", JSON.stringify(l)]]) {
  check(`the ${name} emits no verdict/score`,
    !/evidence_ready|"points"|technical_evidence|progress_pct/.test(out));
}

// Both views send the operator to the same next ORIENTATION activity. Compare the STEP each points at
// rather than pinning a slug — pinning one would test the fixture, not the convergence.
const ACT_STEP = { abrir_guia:"guia", abrir_manifest:"manifest", abrir_conformidade:"conformidade",
  abrir_trust:"trust", abrir_federacao:"federacao", abrir_evidence_bundle:"evidence_bundle",
  abrir_traces:"traces", percurso_concluido:"traces" };
for (const probe of [{}, st({ guia: open() }), mixed]) {
  const a = S(probe).next_action_step, b = ACT_STEP[L(probe).next_recommended_action];
  check(`both views send the operator to the same activity (${a})`, a === b, `card=${a} ask=${b}`);
}

// A referenced Model B FAILED verdict never becomes a positive navigation state (ADR-036).
const fail = S(st({ manifest: { visited: false, technical_reference: { validation_execution_id: "x", model_b_state: "FAILED" } } }, "guia"));
const m = fail.steps.find((x) => x.step === "manifest");
check("a FAILED Model B reference is never a positive", m.status === "available" || m.status === "not_started", m.status);
check("the FAILED reference is surfaced as a typed pointer",
  !!m.technical_reference && m.technical_reference.model_b_state === "FAILED" && m.technical_reference.authority === "model-b");

// The flat legacy shape /ask may still send is read as NAVIGATION (presence ⇒ visited), never a verdict.
const flatInput = { current_step: "conformidade", manifest_status: "valid" };
const flatManifest = L(flatInput).steps.find((x) => x.step === "manifest").status;
check("a flat legacy field is read as navigation, not a verdict", flatManifest === "completed", flatManifest);

// Walking every activity completes the orientation PATH (navigation) — and still scores nothing.
const walked = {}; for (const step of ORDER) walked[step] = open();
const done = S(st(walked, "traces"));
check("walking every activity completes the orientation path",
  done.journey_complete === true && done.overall_state === "percurso_concluido");
check("a completed path still emits no score", !JSON.stringify(done).includes('"points"'));

// Every next action routes to a real step.
const seen = new Set();
for (const p of [{}, st({ guia: open() }), mixed, st(walked, "traces")]) seen.add(S(p).next_action_step);
check("every recommended action routes to a real step", [...seen].every((x) => ORDER.includes(x)), [...seen].join(","));

process.exit(bad);
NODE

# ── 5. Self-test: the detectors must actually detect ────────────────────────
echo "banzai-operator-journey-e2e: self-test…"

# A real second-evaluator call must be caught…
printf 'const x = evaluateJourney(state);\n' > "$TMP/bad.tsx"
strip_comments "$TMP/bad.tsx" > "$TMP/bad.code"
if grep -q 'evaluateJourney' "$TMP/bad.code"; then
  ok "self-test: a reintroduced second evaluator is detected"
else
  bad "self-test: the second-evaluator detector does not fire"
fi

# …while prose about it must not be.
printf '// M2.11B removed the evaluateJourney call from this component.\n' > "$TMP/prose.tsx"
strip_comments "$TMP/prose.tsx" > "$TMP/prose.code"
if grep -q 'evaluateJourney' "$TMP/prose.code"; then
  bad "self-test: the detector fires on a comment (it would block honest documentation)"
else
  ok "self-test: prose about the old evaluator is not a false positive"
fi

# Real storage use must be caught…
printf 'localStorage.setItem("journey", JSON.stringify(s));\n' > "$TMP/store.tsx"
strip_comments "$TMP/store.tsx" > "$TMP/store.code"
if grep -qE '\b(localStorage|sessionStorage|indexedDB)[[:space:]]*\.' "$TMP/store.code"; then
  ok "self-test: real storage use is detected"
else
  bad "self-test: the storage detector does not fire"
fi

# …while the rule being documented must not be.
printf '// No localStorage, sessionStorage or IndexedDB is used anywhere here.\n' > "$TMP/doc.tsx"
strip_comments "$TMP/doc.tsx" > "$TMP/doc.code"
if grep -qE '\b(localStorage|sessionStorage|indexedDB)[[:space:]]*\.' "$TMP/doc.code"; then
  bad "self-test: the storage detector fires on documentation"
else
  ok "self-test: documenting the storage rule is not a false positive"
fi

echo
if [ "$fail" -ne 0 ]; then
  echo "banzai-operator-journey-e2e-check: FAIL"
  exit 1
fi
echo "banzai-operator-journey-e2e-check: PASS"
