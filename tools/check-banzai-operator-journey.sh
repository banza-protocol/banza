#!/usr/bin/env bash
# make banzai-operator-journey-check — M2.9B guard (ADR-049).
#
# The public /banzai area is a guided operator JOURNEY with ordered validation steps + an in-memory
# session context. This guard enforces the M2.9B invariants:
#   - the Rust journey state machine (engines/banzai-operator-journey) owns the canonical STEP ORDER;
#   - both WASM targets are vendored (website web-target + banzai-api node-target with its CJS package);
#   - ALL journey logic is Rust (RUST_WRAPPER_ONLY): the TS/JS wrappers only shuttle JSON, no state
#     machine / scoring / transition logic in TS (rules 15/16);
#   - the session is IN-MEMORY ONLY: no localStorage/sessionStorage/IndexedDB/cookie in the journey UI,
#     no DB/Postgres session store (rules 17-20);
#   - the nav is ordered primary → secondary + Repositório (Part 1);
#   - the backend RE-DERIVES the safe journey context server-side and NEVER trusts the browser copy,
#     emitting the new journey telemetry; the pipeline packing is step-influenced;
#   - the guided layer stays GUIDANCE ONLY (ADR-076 §D-076-02): navigation statuses, no verdict/score,
#     Model B is the single technical-state authority; the session notice states a reload clears it.
#
# Self-testing: exits 2 if its own detectors regress; 1 on a real finding; 0 clean.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"
FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok()   { echo "  ok: $*"; }

ENGINE=engines/banzai-operator-journey/src/lib.rs
WASM_WASM=engines/banzai-operator-journey/src/wasm.rs
WEB_WASM=website/lib/wasm/banzai_operator_journey.js
NODE_WASM=services/banzai-api/src/journeywasm/banzai_operator_journey.js
NODE_PKG=services/banzai-api/src/journeywasm/package.json
WRAP=website/lib/banzaOperatorJourney.ts
AGENT=website/components/banzai/BanzaiAgent.tsx
AGENTDATA=website/components/banzai/banzai-agent.ts
VALJOURNEY=website/components/banzai/validationJourney.tsx
PROG=website/components/banzai/ProgramadoresTools.tsx
# M2.19G.1 (ADR-068) — the endpoint-originated validator: the browser calls this backend, which fetches
# from the implementation's public endpoints and runs the Rust decision engines server-side.
BACKVAL=services/banzai-api/src/validate.js
BACK=services/banzai-api/src/journey.js
SERVER=services/banzai-api/src/server.js
PIPE=services/banzai-api/src/pipeline.js

# ── Testable detectors (self-tested) ─────────────────────────────────────────
has_browser_persistence() {   # reads text on stdin ; 0 if a browser/DB persistence API is actually USED
  # Match real access (method/property/subscript or assignment), NOT prose that merely names the API
  # (e.g. a comment "…never in localStorage/sessionStorage…" must not trip the guard).
  grep -iE '(localStorage|sessionStorage|indexedDB)[[:space:]]*[.[]|document\.cookie[[:space:]]*=|window\.name[[:space:]]*='
}
canonical_steps() {           # reads lib.rs on stdin ; 0 if the 7 canonical steps appear in order
  tr -d ' \n\t' | grep -qE '"guia","manifest","conformidade","trust","federacao","evidence_bundle","traces"'
}

selftest() {
  printf 'const x = localStorage.getItem("k");\n' | has_browser_persistence >/dev/null \
    || { echo "SELFTEST FAIL: persistence detector missed localStorage"; exit 2; }
  printf 'const s = new Map(); // in-memory only\n' | has_browser_persistence >/dev/null \
    && { echo "SELFTEST FAIL: persistence detector false-positive on in-memory Map"; exit 2; }
  printf '// never in localStorage/sessionStorage/IndexedDB/cookies — memory only\n' | has_browser_persistence >/dev/null \
    && { echo "SELFTEST FAIL: persistence detector false-positive on a prose mention"; exit 2; }
  printf 'pub const STEPS: &[&str] = &["guia","manifest","conformidade","trust","federacao","evidence_bundle","traces"];\n' \
    | canonical_steps || { echo "SELFTEST FAIL: canonical step order not detected"; exit 2; }
  printf 'pub const STEPS: &[&str] = &["manifest","guia"];\n' | canonical_steps \
    && { echo "SELFTEST FAIL: wrong step order wrongly accepted"; exit 2; }
  echo "  selftest ok"
}
selftest

echo "== banzai-operator-journey-check (M2.9B) =="

# 1. Rust engine owns the canonical STEP ORDER.
if [ -f "$ENGINE" ]; then
  canonical_steps < "$ENGINE" && ok "Rust engine defines the canonical 7-step order" \
    || fail "$ENGINE must define STEPS = guia,manifest,conformidade,trust,federacao,evidence_bundle,traces"
  grep -q 'pub fn evaluate' "$ENGINE" && grep -q 'pub fn safe_context' "$ENGINE" \
    && ok "Rust engine exposes evaluate() + safe_context()" \
    || fail "$ENGINE must expose evaluate() and safe_context()"
  # ADR-076 §D-076-02 — Model A is guidance only; Model B is the single technical-state authority.
  grep -qiE 'guidance only|orienta o percurso' "$ENGINE" \
    && ok "Rust engine documents Model A is guidance only (Model B is the technical authority)" \
    || fail "$ENGINE must state Model A is guidance only — Model B is the single technical-state authority (ADR-076)"
else
  fail "$ENGINE not found (Rust journey engine missing)"
fi
[ -f "$WASM_WASM" ] && grep -q 'journey_evaluate_json' "$WASM_WASM" \
  && ok "Rust wasm bindings export journey_evaluate_json" \
  || fail "$WASM_WASM must export the journey_* wasm bindings"
# M2.9C — the journey engine also owns the SAFE upload JSON scan (parse + secret/credential gate).
[ -f "$ENGINE" ] && grep -q 'pub fn scan_upload_json' "$ENGINE" \
  && ok "Rust engine owns the upload JSON scan (scan_upload_json)" \
  || fail "$ENGINE must expose scan_upload_json (M2.9C upload gate)"

# 2. Both WASM targets are vendored; the node target has its own CJS package boundary.
[ -f "$WEB_WASM" ] && ok "web-target WASM vendored for the website" || fail "$WEB_WASM missing (web WASM not vendored)"
[ -f "$NODE_WASM" ] && ok "node-target WASM vendored for banzai-api" || fail "$NODE_WASM missing (node WASM not vendored)"
[ -f "$NODE_PKG" ] && ok "node WASM has its own package.json (CJS boundary)" \
  || fail "$NODE_PKG missing — journeywasm must be a CJS package inside the type:module service"

# 3. RUST_WRAPPER_ONLY: the TS wrapper shuttles JSON to Rust; no JS state machine.
if [ -f "$WRAP" ]; then
  grep -q 'RUST_WRAPPER_ONLY' "$WRAP" && ok "TS wrapper marked RUST_WRAPPER_ONLY" \
    || fail "$WRAP must be marked RUST_WRAPPER_ONLY"
  grep -q '@/lib/wasm/banzai_operator_journey' "$WRAP" && ok "TS wrapper imports the Rust web WASM" \
    || fail "$WRAP must import @/lib/wasm/banzai_operator_journey"
  grep -q 'journey_evaluate_json' "$WRAP" && grep -q 'journey_safe_context_json' "$WRAP" \
    && ok "TS wrapper calls the Rust evaluate + safe-context bindings" \
    || fail "$WRAP must call journey_evaluate_json + journey_safe_context_json (no JS logic)"
else
  fail "$WRAP not found"
fi

# 4. Session is IN-MEMORY ONLY — no browser/DB persistence in the journey UI or wrappers.
for f in "$AGENT" "$WRAP" "$AGENTDATA" "$BACK"; do
  [ -f "$f" ] || continue
  if has_browser_persistence < "$f" >/dev/null; then
    fail "$f uses browser/DB persistence — the journey session must live only in memory (rules 17-20)"
  else
    ok "$(basename "$f") has no localStorage/sessionStorage/IndexedDB/cookie persistence"
  fi
done

# 5. M2.19EF2 — ONE /banzai shell, TWO modes. The sidebar groups are Modos (ask/validation) · Recursos ·
#    Resultados; the legacy assistant/journey/secondary grouping and the numbered in-browser journey strip
#    were removed. The validation journey is ENGINE-DRIVEN: a single Rust/WASM validation session, not a JS
#    state machine — every step calls a Rust engine and records exactly what it returns.
if [ -f "$AGENTDATA" ]; then
  grep -qE 'group: *"recursos"' "$AGENTDATA" && grep -qE 'group: *"resultados"' "$AGENTDATA" \
    && ok "nav tabs are grouped recursos/resultados" \
    || fail "$AGENTDATA must tag tabs with group: recursos|resultados"
  grep -qE 'mode: *"ask"' "$AGENTDATA" && grep -qE 'mode: *"validation"' "$AGENTDATA" \
    && ok "the two modes (ask/validation) are defined in MODES" \
    || fail "$AGENTDATA must define the MODES ask + validation"
  grep -q 'REPO_LINK' "$AGENTDATA" && ok "REPO_LINK defined (marker-free data module)" \
    || fail "$AGENTDATA must define REPO_LINK"
  grep -q 'SESSION_NOTICE' "$AGENTDATA" && grep -qiE 'recarregar|reload' "$AGENTDATA" \
    && ok "session notice states a reload clears the journey" \
    || fail "$AGENTDATA SESSION_NOTICE must state the session is cleared on reload (rule 20)"
fi
if [ -f "$AGENT" ]; then
  grep -qE 'group === "recursos"' "$AGENT" && grep -qE 'group === "resultados"' "$AGENT" \
    && ok "BanzaiAgent renders the Recursos + Resultados nav groups" \
    || fail "$AGENT must render the Recursos and Resultados nav groups"
  grep -q 'MODES.map' "$AGENT" \
    && ok "BanzaiAgent renders the Modos switch (Perguntar/Validar)" \
    || fail "$AGENT must render the MODES switch (the two modes)"
  grep -q 'ValidationStepNav' "$AGENT" \
    && ok "BanzaiAgent renders the 9-step validation journey spine (validation mode)" \
    || fail "$AGENT must render the validation journey (ValidationStepNav)"
  # M2.19G.1 (ADR-068 § Recursos) — the Repositório link moved out of the primary nav into Programadores.
  grep -q '<ProgramadoresTools' "$AGENT" && grep -q 'REPO_LINK.href' "$PROG" \
    && ok "the Repositório link is rendered under Programadores (REPO_LINK.href)" \
    || fail "the Repositório (REPO_LINK.href) link must be rendered by ProgramadoresTools, mounted in $AGENT"
  # The validation journey runs on a SINGLE engine-driven session, not a JS state machine.
  grep -q 'useValidationSession' "$AGENT" \
    && ok "BanzaiAgent drives validation via the single useValidationSession hook (engine-driven)" \
    || fail "$AGENT must drive validation via useValidationSession, not a JS state machine"
  # No second JS journey evaluator (the divergence this whole area exists to prevent).
  grep -q 'evaluateJourney' "$AGENT" \
    && fail "$AGENT must not run a second journey evaluator — the validation session is the only source of truth" \
    || ok "BanzaiAgent runs a single validation session (no engine divergence)"
fi
# M2.19G.1 (ADR-068) — the validation journey is ENDPOINT-ORIGINATED and engine-driven: the browser calls
# the Rust backend (POST /banzai/validate/{step,journey}), which fetches every artifact from the
# implementation's public endpoints and runs the Rust decision engines. The browser fabricates NO verdict:
# it stores exactly the server-built OperationReceipt each step returns, and a demo target is never certified.
if [ -f "$VALJOURNEY" ]; then
  # Fase 0 selection (operator + one of its published implementations, both from the closed registry).
  grep -q 'selectOperator' "$VALJOURNEY" && grep -q 'selectImplementation' "$VALJOURNEY" \
    && ok "Fase 0 selection present (operator + implementation, closed registry)" \
    || fail "$VALJOURNEY must expose the Fase 0 operator + implementation selection"
  # Steps call the backend — never a JS state machine, never a client-side verdict.
  grep -q 'validateStepRequest' "$VALJOURNEY" && grep -q 'validateJourneyRequest' "$VALJOURNEY" \
    && ok "each step calls the Rust backend (validateStepRequest + validateJourneyRequest)" \
    || fail "$VALJOURNEY must run steps via the backend (validateStepRequest + validateJourneyRequest)"
  # The nine canonical steps are present in order (discovery … certification).
  if tr -d ' \n\t' < "$VALJOURNEY" | grep -qE '"discovery".*"manifest".*"keys".*"conformance".*"interoperability".*"trust".*"federation".*"evidence".*"certification"'; then
    ok "the nine canonical steps are present in order (discovery … certification)"
  else
    fail "$VALJOURNEY must define the nine canonical steps in order (discovery … certification)"
  fi
  # Each step stores the server-built OperationReceipt (verifiable evidence, not a TS-fabricated verdict).
  grep -q 'ServerOperationReceipt' "$VALJOURNEY" \
    && ok "each step stores the server-built OperationReceipt (verifiable evidence, not a fabricated verdict)" \
    || fail "$VALJOURNEY must store each step's server-built ServerOperationReceipt"
  grep -q 'reset' "$VALJOURNEY" \
    && ok "the validation session exposes a reset (Reiniciar sessão) action" \
    || fail "$VALJOURNEY must expose a session reset action"
  grep -q 'NOT_CERTIFIED' "$VALJOURNEY" \
    && ok "the demo target is never certified (NOT_CERTIFIED / PRE_PRODUCTION)" \
    || fail "$VALJOURNEY must keep the demo target NOT_CERTIFIED (no fabricated certification)"
else
  fail "$VALJOURNEY not found (validation session engine missing)"
fi
# The Rust decision engines run SERVER-SIDE on fetched content (endpoint-originated); the browser never
# fabricates a verdict. The backend runs the canonical Rust engines and binds each verdict into a receipt.
if [ -f "$BACKVAL" ]; then
  for eng in banza-operator-manifest banza-conformance banza-trust banza-l2-readiness banza-evidence-bundle; do
    grep -q "$eng" "$BACKVAL" && ok "backend runs the Rust engine $eng on fetched content" \
      || fail "$BACKVAL must run the Rust engine $eng (server-side, endpoint-originated verdict)"
  done
  grep -q 'buildOperationReceipt' "$BACKVAL" \
    && ok "the backend binds each verdict into an OperationReceipt (buildOperationReceipt)" \
    || fail "$BACKVAL must build each step's OperationReceipt (buildOperationReceipt)"
else
  fail "$BACKVAL not found (endpoint-originated validator missing)"
fi

# 6. Backend re-derives server-side and never trusts the browser; new telemetry present.
if [ -f "$BACK" ]; then
  grep -q 'deriveJourney' "$BACK" && grep -q 'journeywasm/banzai_operator_journey' "$BACK" \
    && ok "backend deriveJourney uses the Rust node WASM" \
    || fail "$BACK must re-derive via the Rust node WASM (journeywasm)"
  grep -qiE 'never trust|re-?derive' "$BACK" && ok "backend documents it never trusts the browser copy" \
    || fail "$BACK must re-derive the safe context and not trust the browser journey_context"
else
  fail "$BACK not found (backend journey glue missing)"
fi
if [ -f "$SERVER" ]; then
  grep -q 'deriveJourney' "$SERVER" && ok "server /ask re-derives the journey" \
    || fail "$SERVER /ask must call deriveJourney"
  grep -q 'journey_context_used' "$SERVER" && grep -q 'next_recommended_action' "$SERVER" \
    && grep -q 'step_statuses' "$SERVER" && grep -q 'session_state_summary' "$SERVER" \
    && ok "server emits the M2.9B journey telemetry" \
    || fail "$SERVER must emit journey_context_used, next_recommended_action, step_statuses, session_state_summary"
fi
if [ -f "$PIPE" ]; then
  grep -q 'journeyStep' "$PIPE" && ok "pipeline packing is step-influenced (journeyStep)" \
    || fail "$PIPE must accept journeyStep for step-influenced source packing"
fi

# 7. Client adapter forwards the safe journey context to /ask.
if [ -f website/components/home/banzaiKb.ts ]; then
  grep -q 'journey_context' website/components/home/banzaiKb.ts \
    && grep -q 'current_step' website/components/home/banzaiKb.ts \
    && ok "banzaiKb forwards journey_context + current_step to /ask" \
    || fail "banzaiKb.ts must forward journey_context + current_step to /banzai/ask"
fi

echo
if [ "$FAILED" -eq 0 ]; then echo "BANZAI OPERATOR JOURNEY CHECK PASSED ✅"; else echo "BANZAI OPERATOR JOURNEY CHECK FAILED ✗"; fi
exit "$FAILED"
