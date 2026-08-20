#!/usr/bin/env bash
#
# BanzAI Session Context Robustness Guard (M2.11A; reframed by ADR-036/02).
#
# The first journey model treated navigation as if it were evidence, so opening /banzai reported a
# technical number before anything had been validated. ADR-036 removed that class of bug at the root:
# the guided layer (Model A) is now GUIDANCE ONLY — it carries navigation state, never a verdict or a
# score — and there is exactly one authority of technical validation state (Model B).
#
# This guard drives the REAL committed Rust/WASM guidance engine and fails if navigation ever produces
# a verdict/score, if a Model B negative is lifted into a positive, or if the session leaves memory.
#
# Exit 1 on any FAIL. Exit 2 if the engine cannot be driven.

set -euo pipefail
cd "$(dirname "$0")/.."

if locale -a 2>/dev/null | grep -qiE '^C\.UTF-?8$'; then export LC_ALL=C.UTF-8
elif locale -a 2>/dev/null | grep -qiE '^en_US\.UTF-?8$'; then export LC_ALL=en_US.UTF-8
fi

WASM="services/banzai-api/src/journeywasm/banzai_operator_journey.js"
SESSION_RS="engines/banzai-operator-journey/src/session.rs"
AGENT_TSX="website/components/banzai/BanzaiAgent.tsx"
WRAPPER="website/lib/banzaOperatorJourney.ts"
# M2.19EF2 — the journey/evidence card was replaced by the validation-mode context panel.
VALMODE="website/components/banzai/BanzaiValidationMode.tsx"

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }

# These sentences moved into the bilingual catalogues, and some symbols were renamed when the surfaces
# stopped holding their own Portuguese. Read from the resolved copy, which also makes the English clause
# expressible at all.
# shellcheck source=tools/_banzai-copy.sh
. tools/_banzai-copy.sh

[ -f "$WASM" ] || { echo "FAIL: journey WASM not built at $WASM"; exit 2; }

echo "banzai-session-context-robustness: driving the committed guidance engine…"

node - "$WASM" <<'NODE' || fail=1
const j = require(require('node:path').resolve(process.argv[2]));
let bad = 0;
const E = (st) => JSON.parse(j.journey_session_json(JSON.stringify(st)));
const check = (l, c, d) => { if (c) console.log(`  ok: ${l}`); else { console.log(`  FAIL: ${l}${d ? " — " + d : ""}`); bad = 1; } };
const statusOf = (e, s) => (e.steps.find((x) => x.step === s) || {}).status;
const NAV = ["not_started", "available", "in_progress", "completed"];

// A fresh session has visited nothing and makes no technical claim.
const empty = E({});
check("a fresh session has 0 activities visited", empty.navigation_progress.activities_visited === 0, String(empty.navigation_progress.activities_visited));
check("navigation progress is explicitly not a technical score", empty.navigation_progress.is_technical_score === false);
check("a fresh session emits no verdict/score", !/evidence_ready|"points"|technical_evidence|progress_pct/.test(JSON.stringify(empty)));
check("the single technical authority is Model B", empty.authority === "model-b");

// Navigation is the only signal: visiting an activity advances navigation, never a verdict.
const guide = E({ steps: { guia: { visited: true } } });
check("visiting the guide advances navigation", guide.navigation_progress.activities_visited === 1);
check("visiting the guide never reaches a verdict status", NAV.includes(statusOf(guide, "guia")) && !["valid","evidence_ready"].includes(statusOf(guide, "guia")), statusOf(guide, "guia"));

// Every activity status is a navigation status, whatever the input.
const browsed = E({ steps: { guia: { visited: true }, manifest: { visited: true }, conformidade: { visited: true } } });
for (const s of ["guia","manifest","conformidade","trust","federacao","evidence_bundle","traces"]) {
  check(`${s} carries a navigation status`, NAV.includes(statusOf(browsed, s)), statusOf(browsed, s));
}
check("browsing advances navigation and emits no score", browsed.navigation_progress.activities_visited >= 3 && !JSON.stringify(browsed).includes('"points"'));

// A referenced Model B negative is surfaced faithfully and NEVER lifted into a positive.
const ref = E({ steps: { manifest: { visited: false, technical_reference: { validation_execution_id: "x", model_b_state: "FAILED" } } } });
const m = ref.steps.find((x) => x.step === "manifest");
check("a FAILED Model B reference is never a positive navigation state", m.status === "available" || m.status === "not_started", m.status);
check("the FAILED reference is surfaced as a typed pointer to Model B", !!m.technical_reference && m.technical_reference.model_b_state === "FAILED" && m.technical_reference.authority === "model-b");

// Walking every activity completes the orientation PATH (navigation), and still scores nothing.
const walked = {}; for (const s of ["guia","manifest","conformidade","trust","federacao","evidence_bundle","traces"]) walked[s] = { visited: true };
const done = E({ current_step: "traces", steps: walked });
check("walking every activity completes the orientation path", done.journey_complete === true && done.overall_state === "percurso_concluido");
check("a completed path still emits no score", !JSON.stringify(done).includes('"points"'));

// The safe summary must not carry paths, bodies or secrets — even from a reference pointer.
const sum = j.journey_session_summary(JSON.stringify({ current_step: "manifest", steps: { manifest: {
  visited: true, technical_reference: { receipt_reference: "../../etc/ssl/private/root.pem", model_b_state: "FAILED" } } } }));
check("the safe summary carries no path segments", !sum.includes("etc") && !sum.includes(".pem"), sum);
check("the safe summary carries no key material", !sum.includes("BEGIN") && !sum.toLowerCase().includes("private"), sum);

process.exit(bad);
NODE

# ── Rendered labels must be prose, never raw slugs ──────────────────────────
# The guidance layer has no blocker/evidence verdict vocabulary (ADR-036), so there is no
# blocker-label table to order. The navigation action labels must still name themselves (no silent
# "Continuar" fallback), which the vocabulary-contract guard proves; here we assert the label map exists.
grep -q 'export function nextActionLabel' "$WRAPPER" \
  && ok "navigation actions have a label map (nextActionLabel)" \
  || bad "$WRAPPER must expose nextActionLabel for the navigation actions"
grep -q 'export function overallStateLabel' "$WRAPPER" \
  && ok "navigation overall states have a label map (overallStateLabel)" \
  || bad "$WRAPPER must expose overallStateLabel for the navigation overall states"

# ── Ownership + wording + storage invariants ────────────────────────────────
grep -q 'pub fn evaluate_session' "$SESSION_RS" \
  && ok "the evidence state machine lives in Rust" \
  || bad "the evidence state machine must be Rust/WASM, not TS"

grep -q 'RUST_WRAPPER_ONLY' "$WRAPPER" \
  && ok "the TS layer declares itself a wrapper" \
  || bad "the TS journey layer must be a wrapper over Rust, not an engine"

# No status may imply authorisation.
if grep -nE '"(certified|approved|licensed|accepted|operator_created)"' "$SESSION_RS" >/dev/null 2>&1; then
  bad "a status implies certification/approval/licensing"
else
  ok "no status implies certification, approval or licensing"
fi

# M2.19G.1 (ADR-034) — the validation surface (BanzaiValidationMode.tsx) shows Progresso (n/total steps)
# and surfaces per-step Evidence and Receipts as DISTINCT sections — never one blended number that
# conflates navigation with validated evidence. In the endpoint-originated model the context panel shows
# per-step Evidence ("EVIDÊNCIA DA ETAPA", evidence_refs) while Receipts live in the single Resultados
# area (the "Receipts" sub-view + per-step recibo). Progress counts only steps a Rust engine evaluated.
grep -q 'PROGRESSO' "$VALMODE" && grep -q 'progress.total' "$VALMODE" \
  && ok "the validation panel shows Progresso (n/total steps evaluated)" \
  || bad "the validation panel must show Progresso as n/total steps"
grep -q '"step.evidenceReferences"' "$VALMODE" && grep -q 'st.evidence_refs' "$VALMODE" \
  && grep -qE 'name: "Receipts"|action\.viewReceipt' "$VALMODE" \
  && ok "the surface shows per-step Evidence (EVIDÊNCIA DA ETAPA / evidence_refs) + Receipts separately from progress" \
  || bad "the panel must surface Evidence and Receipts (verifiable per-step evidence)"
grep -q 'BLOQUEIOS' "$VALMODE" && grep -q 'blockers' "$VALMODE" \
  && ok "the panel surfaces Bloqueios (blockers)" \
  || bad "the panel must surface Bloqueios (blockers)"
grep -q 'progress_pct}%' "$AGENT_TSX" \
  && bad "the old single blended percentage returned to the shell" \
  || ok "the misleading single blended percentage is gone"

# The session must stay in memory only. Check actual USE, not mentions: the file legitimately
# DOCUMENTS that it avoids these APIs, so comments are stripped before the scan (a naive grep would
# flag the very comment that states the rule).
storage_use="$(perl -0777 -pe 's{/\*.*?\*/}{}gs' "$AGENT_TSX" \
  | grep -vE '^\s*//' \
  | grep -nE '\b(localStorage|sessionStorage|indexedDB)\s*\.|\bdocument\.cookie\s*=' || true)"
if [ -n "$storage_use" ]; then
  bad "the journey session must never touch browser storage:"
  printf '%s\n' "$storage_use" | sed 's/^/      /' | head -5
else
  ok "the session lives in memory only (no storage APIs used)"
fi

if [ "$fail" -ne 0 ]; then
  echo "banzai-session-context-robustness: FAILED ✗" >&2
  exit 1
fi
echo "banzai-session-context-robustness: PASSED ✅ — navigation and validated evidence are separate and non-inflatable."
