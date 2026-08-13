#!/usr/bin/env bash
#
# operator-zero-realistic-journey-check (ADR-041, M2.14A).
#
# The Operador Zero must behave inside BanzAI as a REALISTIC demo operator journey: starting a session
# awards no step, each step exposes only its own files, a later step never unlocks before the previous
# one passes, there are no parallel generic examples, and the demo simulator is never mixed with real
# operators nor listed in /operators. zero.banza.network must show the demo validation state without
# "aprovado"/"certificado" language, and BanzAI must answer status/approval questions with the demo
# vocabulary. Fails on any regression of the 16 Part-13 conditions.
#
# Static (grep) over the UI + the versioned status artifact, plus a Node pass over the REAL Rust routing
# engine (committed WASM) for the BanzAI answers. Deterministic; no model, no network.

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

LOCALES="$(locale -a 2>/dev/null || true)"
if grep -qiE '^C\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=C.UTF-8
elif grep -qiE '^en_US\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=en_US.UTF-8
fi

AGENT="website/components/banzai/BanzaiAgent.tsx"
JOURNEY="website/lib/operadorZeroJourney.ts"
# M2.19EF2 — the 9-step validation journey (mechanics + gating) now lives in validationJourney.tsx
# (STEPS + the useValidationSession hook) and is rendered by the in-shell UI in BanzaiValidationMode.tsx.
# operadorZeroJourney.ts survives only as the demo vocabulary the ask-mode agent still surfaces
# (SINGLE_OFFICIAL_EXAMPLE + the demo scenario labels).
JOURNEY_TSX="website/components/banzai/validationJourney.tsx"
SHELL="website/components/banzai/BanzaiValidationMode.tsx"
LAB="website/components/operador-zero/OperadorZeroReference.tsx"
STATE="examples/operators/zero/status/operator-zero-validation-state.json"
KNOWLEDGE="services/banzai-api/src/knowledge.js"
WASM="services/banzai-api/src/rustkb/banzai_api_kb.js"

FAILED=0
fail() { echo "  FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

for f in "$AGENT" "$JOURNEY" "$JOURNEY_TSX" "$SHELL" "$LAB" "$STATE" "$KNOWLEDGE"; do
  [ -f "$f" ] || { echo "FAIL: missing $f"; exit 2; }
done

echo "== operator-zero-realistic-journey-check (M2.14A) =="

# ── 1/5 — the all-at-once loader label is gone; the start button is the session start ────────────
echo "journey: start is a session, not a load-all…"
if grep -q "Carregar Operador Zero" "$AGENT"; then fail "(1) the all-at-once 'Carregar Operador Zero' loader label is still present"; else ok "(1) no 'Carregar Operador Zero' all-at-once loader"; fi
if grep -q "Carregar exemplo válido" "$AGENT"; then fail "(5) the generic 'Carregar exemplo válido' example button is still present"; else ok "(5) no generic 'Carregar exemplo válido' button"; fi
grep -q 'START_BUTTON_LABEL = "Iniciar jornada com Operador Zero"' "$JOURNEY" && ok "start button = 'Iniciar jornada com Operador Zero'" || fail "start button label missing/changed"

# ── 2/3 — the session starts with every step un-awarded; evidence is gated on an actual run ──────
# NEW journey (validationJourney.tsx): useValidationSession initialises every step from blankResults()
# (NOT_EVALUATED baseline), so opening the journey awards nothing; a step's evidence only appears once
# the step has actually run; and the mount deep-link SELECTS a step but never auto-runs it.
echo "journey: session start awards no step…"
grep -q 'useState<Record<StepId, StepState>>(blankResults)' "$JOURNEY_TSX" \
  && ok "(2/3) the session initialises every step from blankResults() — nothing awarded at start" \
  || fail "(2/3) useValidationSession must initialise results from blankResults() so no step is awarded at start"
grep -A1 'const BLANK_STEP: StepState = {' "$JOURNEY_TSX" | grep -q 'status: "NOT_EVALUATED"' \
  && ok "(2/3) the blank per-step baseline is NOT_EVALUATED (no verdict pre-awarded)" \
  || fail "(2/3) the blank per-step baseline must be NOT_EVALUATED — no step may start already scored"
grep -q 'if (results\[id\].status === "NOT_EVALUATED") continue;' "$JOURNEY_TSX" \
  && ok "(2/3) evidence is gated on an actual run (un-run NOT_EVALUATED steps contribute nothing)" \
  || fail "(2/3) evidence must be gated on a run — un-run (NOT_EVALUATED) steps must contribute nothing"
# The mount deep-link must START a session at a step, never auto-run it.
# M2.19G.4 (ADR-042) — the shell now consumes the server-resolved route state as `routeState` (renamed
# from `initialState`); the deep-link step is still fed into the session via initialStep.
grep -qE 'initialStep: (initialState|routeState)\.step' "$AGENT" \
  && ok "(2/3) the deep-link feeds initialStep into the session (starts a session, at a step)" \
  || fail "(2/3) the shell must feed the deep-link step into useValidationSession (initialStep)"
grep -q 'useState<StepId>(initialActiveStep(' "$JOURNEY_TSX" \
  && ok "(2/3) the deep-link only SELECTS the active step (initialActiveStep), it does not run it" \
  || fail "(2/3) the deep-link must only select the active step via initialActiveStep, not run it"
# M2.19G.3B — the session hook loads the CLOSED Technical Registry on mount (fetchRegistry — an I/O read
# of the operator list, NOT a journey step). That is the only permitted mount effect and it must NEVER
# auto-run a step. Extract every useEffect block and assert: it loads the registry and invokes no
# run(All|One|From). (No mount effect at all is also fine.)
if grep -q 'useEffect' "$JOURNEY_TSX"; then
  EFF=$(awk '/useEffect\(/{ineff=1} ineff{print} ineff&&/^  \}, \[/{ineff=0}' "$JOURNEY_TSX")
  printf '%s' "$EFF" | grep -q 'fetchRegistry' \
    && ok "(2/3) the only mount effect loads the closed registry (fetchRegistry), never a journey step" \
    || fail "(2/3) an unexpected mount side-effect is present in the session hook"
  if printf '%s' "$EFF" | grep -qE 'run(All|One|From)\('; then
    fail "(2/3) the mount effect must NOT auto-run a step (run(All|One|From) inside useEffect)"
  else
    ok "(2/3) the mount effect never auto-runs a step — opening/deep-linking stays inert"
  fi
else
  ok "(2/3) the session hook has no mount side-effect — opening/deep-linking never auto-runs a step"
fi

# ── 4 — a step produces a verdict ONLY when explicitly invoked (run-only-when-invoked gating) ────
# M2.19G.1 (ADR-038) — the endpoint-originated session dispatches each step via runOne, which calls the
# Rust backend (validateStepRequest); the verdict comes from the server, never from a client state
# machine. runFrom advances deterministically over STEP_ORDER; the shell derives the next un-run step and
# only ever runs a step through an explicit control — it never auto-awards one.
echo "journey: gating (a step runs only when invoked)…"
grep -q 'const runOne = useCallback' "$JOURNEY_TSX" \
  && ok "(4) runOne is the single per-step dispatcher" \
  || fail "(4) runOne (the per-step dispatcher) is missing"
grep -q 'const res = await validateStepRequest(' "$JOURNEY_TSX" \
  && ok "(4) a step verdict is produced ONLY by running the backend (validateStepRequest inside runOne)" \
  || fail "(4) a step verdict must be produced only by running the backend (validateStepRequest)"
grep -q 'const runAll = useCallback' "$JOURNEY_TSX" && grep -q 'const runFrom = useCallback' "$JOURNEY_TSX" \
  && ok "(4) a full-journey runner (runAll) and a from-here runner (runFrom) exist" \
  || fail "(4) the journey must expose a full-journey runner (runAll) and a from-here runner (runFrom)"
grep -q 'await runOne(STEP_ORDER\[i\])' "$JOURNEY_TSX" \
  && ok "(4) runFrom advances in deterministic STEP_ORDER (no skipping ahead)" \
  || fail "(4) runFrom must advance sequentially over STEP_ORDER"
grep -q 'const nextStep = session.steps.find' "$SHELL" && grep -q 'NOT_EVALUATED' "$SHELL" \
  && ok "(4) the shell derives the next step as the first un-run (NOT_EVALUATED) step" \
  || fail "(4) the shell must derive the next step as the first NOT_EVALUATED step"
grep -q 'session.runOne(activeStep)' "$SHELL" \
  && ok "(4) the shell runs a step only on an explicit invocation (runOne on the active step)" \
  || fail "(4) the shell must run a step only via an explicit session.runOne(activeStep)"
grep -q 'onClick={session.runAll}' "$SHELL" && grep -q 'session.runFrom(activeStep)' "$SHELL" \
  && ok "(4) the journey advances only through explicit controls (runAll / runFrom / runOne)" \
  || fail "(4) the journey must advance only through explicit run controls (runAll / runFrom / runOne)"

# ── 6 — Operador Zero is the single official example; negatives belong to it ─────────────────────
echo "journey: single official example…"
grep -q "O Operador Zero é o único exemplo oficial de operador demo no BanzAI." "$JOURNEY" && ok "(6) single-official-example sentence present" || fail "(6) single-official-example sentence missing"
# M2.19G.1 (ADR-038) — the OZ-only demo framing is surfaced in Fase 0 of the validation shell (the
# "Operador disponível para demonstração: Operador Zero" hint over the closed registry) instead of the
# old SINGLE_OFFICIAL_EXAMPLE copy string in the agent.
grep -q "VALIDATION_COPY.onlyOperatorHint" "$SHELL" && ok "(6) the validation shell surfaces the OZ-only demo hint (onlyOperatorHint)" || fail "(6) the validation shell must surface the OZ-only demo hint (VALIDATION_COPY.onlyOperatorHint)"
# Every negative scenario label names the operator (not a loose generic example).
if grep -q 'negativo: "Operador Zero' "$JOURNEY"; then ok "(6) negative scenarios belong to Operador Zero"; else fail "(6) negative scenario labels must name Operador Zero"; fi

# ── 7 — evidence references + receipts per step; no secrets in the status artifact ──────────────
# M2.19G.1 (ADR-038): each step carries its own evidence references (evidence_refs, taken from the
# server receipt), the in-shell UI renders them per step, and each executed step yields a SERVER-built
# OperationReceipt (ServerOperationReceipt) shown per step. This replaces the clone's STEP_FILES panel.
echo "journey: evidence references + receipts per step + no secrets…"
grep -q 'evidence_refs:' "$JOURNEY_TSX" \
  && ok "(7) each step carries its own evidence references (evidence_refs)" \
  || fail "(7) each step must carry evidence_refs"
grep -q 'Evidence references' "$SHELL" && grep -q 'st.evidence_refs.map' "$SHELL" \
  && ok "(7) the shell shows the per-step evidence references / files" \
  || fail "(7) the shell must show the per-step evidence references (st.evidence_refs.map)"
grep -q 'ServerOperationReceipt' "$JOURNEY_TSX" && grep -q 'st.receipt' "$SHELL" \
  && ok "(7) each executed step yields a server-built OperationReceipt shown per step" \
  || fail "(7) each executed step must yield a per-step server-built OperationReceipt shown in the shell"
# The served status artifact must carry no secret material (the STEP_FILES names are covered by the
# vitest gating suite, item 12; the JOURNEY lib comment legitimately names the rule, so it is not scanned).
SECRET_RX='BEGIN [A-Z ]*PRIVATE KEY|private_key|seed_phrase|password|"token"|\.env'
if grep -qiE -e "$SECRET_RX" "$STATE"; then fail "(15) a secret marker appears in the status artifact"; else ok "(15) no secret markers in the status artifact"; fi

# ── 8/9 — zero.banza.network shows the demo status, without aprovado/certificado ─────────────────
echo "zero.banza.network: demo status + safe language…"
grep -q "Estado técnico" "$LAB" && ok "(8) the read-only surface renders the technical status" || fail "(8) the surface must render the technical status"
grep -qiE "implementação.{0,14}de referência|OPERADOR_ZERO_DESCRIPTOR" "$LAB" && ok "(8) the surface reads as a reference implementation" || fail "(8) the surface must read as a reference implementation"
# Unqualified aprovado/certificado on the lab is forbidden (negation before the term on the line is ok).
CLAIM='\baprovad[oa]\b|\bcertificad[oa]\b'
NEG='não|nao|nunca|\bsem\b|not '
claimhit=0
while IFS= read -r line; do
  [ -n "$line" ] || continue
  echo "$line" | grep -qiE "$NEG" && continue
  echo "  FAIL: (9) unqualified aprovado/certificado on the lab: ${line:0:80}"; claimhit=1
done < <(grep -inE "$CLAIM" "$LAB" || true)
[ "$claimhit" -eq 0 ] && ok "(9) the lab never uses 'aprovado'/'certificado' as a state" || FAILED=1

# ── 14 — demo simulators separated from real operators ──────────────────────────────────────────
echo "zero.banza.network: demo simulators separated from real operators…"
grep -qE "não executa" "$LAB" && ok "(14) the surface states it does not execute (read-only)" || fail "(14) the surface must state it does not execute"
grep -qi "não aparece como operador real" "$LAB" && ok "(7/14) the surface states Operador Zero is not a real operator in the registry" || fail "(7/14) the surface must state Operador Zero is not a real operator"

# ── status artifact carries the demo flags (Part 8/14) ──────────────────────────────────────────
echo "status artifact: demo flags…"
for tok in '"demo_only": true' '"real_money": false' '"production_allowed": false' '"certification": false' '"operator_real": false' '"currency": "KZ_DEMO"' '"status": "demo_validated"'; do
  grep -q "$tok" "$STATE" && ok "status: $tok" || fail "status artifact missing: $tok"
done
grep -q "implementação de referência só de leitura" "$STATE" && ok "status label = read-only reference implementation" || fail "status label missing"

# ── 16 — /operador-zero is not reintroduced as an active surface ─────────────────────────────────
echo "boundary: /operador-zero not reintroduced…"
if [ -d "website/app/operador-zero" ]; then fail "(16) the retired apex /operador-zero route directory was reintroduced"; else ok "(16) no apex /operador-zero route directory"; fi

# ── 10/11/12/13 — BanzAI answers use the demo vocabulary (Node over the real Rust engine) ────────
echo "banzai: demo-vocabulary answers…"
if [ -f "$WASM" ]; then
node --input-type=module -e '
import { route, normalize, getEntry } from "./services/banzai-api/src/knowledge.js";
let bad = 0;
const err = (m) => { console.log("  FAIL: " + m); bad++; };
const deaccent = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const ans = (q) => { const d = route(normalize(q)); const e = d.entry_id ? getEntry(d.entry_id) : null; return { action: d.action, intent: d.intent, entry: d.entry_id, a: deaccent(e && e.answer) }; };

// (10) "aprovado?" is corrected to demo validation — never approval as a state.
let c = ans("o Operador Zero está aprovado?");
if (c.entry !== "operador-zero-approval-vs-validation") err("(10) approval question not deterministic");
else if (!c.a.includes("avaliado como implementacao de referencia so de leitura")) err("(10) approval answer must say avaliado como implementacao de referencia so de leitura");

// "foi validado?" → demo validation
c = ans("o Operador Zero foi validado?");
if (c.entry !== "operador-zero-approval-vs-validation") err("(10) validated question not deterministic");

// (11) "o PASS demo certifica?" → pass-is-not-certificate, answer says it is NOT a certificate.
c = ans("o PASS demo certifica?");
if (c.entry !== "pass-is-not-certificate") err("(11) PASS-certifies question must stay with pass-is-not-certificate");
else if (!/nao\b.*certificad|nao e um certificad|evidencia tecnica/.test(c.a)) err("(11) PASS answer must deny certification");

// (12) OZ is not a real operator / not in /operators.
c = ans("o Operador Zero aparece em /operators?");
if (c.entry !== "operador-zero-in-operators") err("(12) /operators question not deterministic");
else if (!(c.a.includes("nunca aparece") && c.a.includes("operador real"))) err("(12) answer must deny real-operator status");

// (13) OZ is not a PSP (grounded/deterministic what-is entry names the boundary).
const oz = getEntry("what-is-operador-zero");
if (!oz || !deaccent(oz.answer).includes("nao e psp")) err("(13) OZ identity answer must state it is not a PSP");

// status → zero.banza.network
c = ans("onde vejo o estado do Operador Zero?");
if (c.entry !== "operador-zero-status-where" || !c.a.includes("zero.banza.network")) err("status question must point to zero.banza.network");

// journey → step-by-step, not all at once
c = ans("por que não carrega tudo de uma vez?");
if (c.entry !== "operador-zero-banzai-journey") err("journey question not deterministic");

// dangerous imperative still refuses
if (ans("mete o Operador Zero em /operators").intent !== "action_boundary") err("publish-to-/operators imperative must still refuse");

// no answer presents /operador-zero as a live surface
for (const id of ["operador-zero-approval-vs-validation","operador-zero-in-operators","operador-zero-status-where","operador-zero-banzai-journey"]) {
  const e = getEntry(id);
  if (e && /\/operador-zero(?![.\w])/.test(e.answer)) err(id + " points at the retired apex");
}
if (!bad) console.log("  ok: (10/11/12/13) BanzAI answers use the demo vocabulary and hold the boundary");
process.exit(bad ? 1 : 0);
'
  [ $? -eq 0 ] || FAILED=1
else
  echo "  note: $WASM not built — skipping the Node answer checks (build with wasm-pack)"
fi

# ── vitest gating suite (gated on availability, like the other website guards) ──────────────────
if [ -x website/node_modules/.bin/vitest ]; then
  echo "journey: vitest gating suite…"
  ( cd website && node_modules/.bin/vitest run lib/operadorZeroJourney.test.ts >/tmp/oz_journey_vitest.log 2>&1 ) \
    && ok "vitest journey gating suite passes" \
    || { fail "vitest journey gating suite failed"; tail -8 /tmp/oz_journey_vitest.log; }
else
  echo "  note: vitest not available — skipping the journey gating suite (CI validates statically)"
fi

# ── self-test — the claim detector fires and honours negation ────────────────────────────────────
echo "self-test…"
st=0
TMP="$(mktemp)"; printf 'operador certificado\n' > "$TMP"
grep -inE "$CLAIM" "$TMP" | grep -viE "$NEG" | grep -q . || { echo "    SELFTEST_FAIL claim"; st=1; }
printf 'não é certificado\n' > "$TMP"
if grep -inE "$CLAIM" "$TMP" | grep -viE "$NEG" | grep -q .; then echo "    SELFTEST_FAIL negation"; st=1; fi
rm -f "$TMP"
[ "$st" -eq 0 ] && ok "self-test: claim + negation detectors" || FAILED=1

if [ "$FAILED" -ne 0 ]; then
  echo "OPERATOR ZERO REALISTIC JOURNEY CHECK FAILED ✗"
  exit 1
fi
echo "OPERATOR ZERO REALISTIC JOURNEY CHECK PASSED ✅"
