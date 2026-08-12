#!/usr/bin/env bash
# check-banzai-interface-transparency.sh — Increment 9 guard (§24–§25).
#
# Verifies the FINAL interface increment of the BanzAI production-agent program:
#   §24 — a per-answer INTERFACE TRANSPARENCY layer that surfaces what the engine ACTUALLY computed,
#         read verbatim from the /ask ENVELOPE (the Inc.8 observability record + scope_resolution +
#         reasoning_trace + the safe top-level telemetry) — never hardcoded, never fabricated. Rendered
#         INSIDE the ONE contextual inspector (not a second competing panel); each field appears only when
#         the engine produced it; no secret/PII/prompt/raw-output field name is ever surfaced.
#   §25 — CONTEXTUAL, per-answer executable suggestions DERIVED from this answer's intent + entity + scope
#         + which tools ran (not a fixed list served for every reply). A boundary/refusal answer offers
#         ONLY safe reframes — NEVER a reframe toward the refused action.
#
# CI rule (like check-banzai-answer-rendering-ux.sh): the static source invariants below hold in EVERY
# environment (pure grep — no WASM, no pg, no banzai-api node_modules). The behavioural drive runs the
# website vitest suites ONLY when the website test runner is installed, and DEGRADES to the static checks
# otherwise (the M2.13B guard job does not npm-install the website).

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

ADAPTER="website/components/home/banzaiKb.ts"
SUGGEST="website/components/banzai/suggestions.ts"
PANEL="website/components/banzai/TransparencyPanel.tsx"
AGENT="website/components/banzai/BanzaiAgent.tsx"

echo "== banzai-interface-transparency-check (Increment 9, §24–§25) =="

# ── self-test ─────────────────────────────────────────────────────────────────────────────────────────
printf '%s\n' 'data-transparency' | grep -q 'data-transparency' || { echo "guard self-test FAILED" >&2; exit 2; }

for f in "$ADAPTER" "$SUGGEST" "$PANEL" "$AGENT"; do
  [ -f "$f" ] || { echo "FAIL: missing $f"; exit 1; }
done

# ── §24 static: the transparency projection is READ FROM THE ENVELOPE (not hardcoded) ─────────────────
grep -q "export function buildTransparency" "$ADAPTER" || fail "$ADAPTER must build the transparency projection (buildTransparency)"
grep -q "o.observability" "$ADAPTER" || fail "$ADAPTER buildTransparency must read the envelope observability record"
grep -q "o.scope_resolution" "$ADAPTER" || fail "$ADAPTER buildTransparency must read the envelope scope_resolution"
grep -q "o.reasoning_trace" "$ADAPTER" || fail "$ADAPTER buildTransparency must read the envelope reasoning_trace"
# Runtime-truth telemetry is taken from the envelope, not asserted.
for env_field in engine_state validation_status answer_type total_duration_ms confidence tool_plan; do
  grep -q "$env_field" "$ADAPTER" || fail "$ADAPTER buildTransparency must surface the envelope field $env_field"
done
grep -qE "transparency \? \{ transparency \}" "$ADAPTER" || fail "$ADAPTER must surface the transparency projection on the KbAnswer"
[ "$FAILED" -eq 0 ] && ok "§24 transparency is read from the /ask envelope (observability + scope_resolution + reasoning_trace + safe telemetry)"

# ── §24 static: rendered inside the ONE inspector, each field ONLY when present ────────────────────────
grep -q "import { TransparencyPanel }" "$AGENT" || fail "$AGENT must import the TransparencyPanel"
grep -q "<TransparencyPanel t={lastTransparency}" "$AGENT" || fail "$AGENT must render <TransparencyPanel/> from the last answer's projection"
grep -q "ans.transparency" "$AGENT" || fail "$AGENT lastTransparency must come from the mapped envelope (ans.transparency)"
# It lives in the ONE contextual inspector (a single panel, not a competing second panel).
grep -q 'id="banzai-inspector"' "$AGENT" || fail "$AGENT must keep the single contextual inspector"
if [ "$(grep -c "<TransparencyPanel " "$AGENT")" -eq 1 ]; then ok "the transparency layer is one panel inside the one inspector (no second competing panel)"; else fail "$AGENT must render the TransparencyPanel exactly once"; fi
# The panel renders each section CONDITIONALLY (only when the engine produced it) — never unconditionally.
grep -q "data-transparency" "$PANEL" || fail "$PANEL must mark the transparency section (data-transparency)"
for cond in "t.entity &&" "t.scope &&" "t.tools.length > 0 &&" "hasFreshness &&" "t.calculation &&" "t.limitations.length > 0 &&"; do
  grep -qF "$cond" "$PANEL" || fail "$PANEL must render '$cond' conditionally (field shown only when present)"
done
# `modelCalled` false is meaningful (rendered), not treated as absent.
grep -q "t.modelCalled !== null" "$PANEL" || fail "$PANEL must render modelCalled when present (false is meaningful)"
[ "$FAILED" -eq 0 ] && ok "§24 the panel renders inside the single inspector; each field appears only when the engine produced it"

# ── §24 static: NO secret/PII/prompt/raw-output field name is surfaced in the panel ───────────────────
# Scan CODE ONLY (strip // comment lines — the header comment legitimately names these words to state
# what is NEVER surfaced). A forbidden name appearing in rendered code would be a real leak.
panel_code=$(grep -vE '^\s*//' "$PANEL" || true)
leak=""
for forbidden in cookie otp token secret password passwd pepper api_key apikey authorization bearer private_key privatekey pem system_prompt systemprompt chain_of_thought chainofthought raw_output; do
  if printf '%s\n' "$panel_code" | grep -iqw "$forbidden"; then leak="$leak $forbidden"; fi
done
# `prompt`/`raw` as standalone identifiers must not be surfaced either (word-boundary; avoids false hits).
printf '%s\n' "$panel_code" | grep -iqwE 'prompt|raw' && leak="$leak prompt/raw"
[ -z "$leak" ] && ok "§24 the panel surfaces NO secret/PII/prompt/raw-output field name" || fail "$PANEL surfaces a forbidden field name:$leak"

# ── §25 static: suggestions are GENERATED per-answer (derived from intent/entity/scope/tools) ──────────
grep -q "export function contextualSuggestions" "$SUGGEST" || fail "$SUGGEST must export the per-answer generator contextualSuggestions"
for signal in "ctx.entity" "ctx.scope" "ctx.answerType" "ctx.operationalIntent" "ctx.toolsRan" "ctx.terminalKind" "ctx.questionFamily"; do
  grep -qF "$signal" "$SUGGEST" || fail "$SUGGEST must derive suggestions from $signal"
done
grep -q "const followUpsList = contextualSuggestions(" "$ADAPTER" || fail "$ADAPTER must derive followUps from the per-answer generator"
# The retired M2.9A FIXED suggestion list must NOT be the source anymore (proof it was replaced, not kept).
grep -q "suggestionsFor(" "$ADAPTER" && fail "$ADAPTER still uses the retired fixed suggestionsFor() — the fixed list must be replaced by the per-answer generator"
grep -q "DEFAULT_SUGGESTIONS" "$ADAPTER" && fail "$ADAPTER still ships the retired DEFAULT_SUGGESTIONS fixed list"
[ "$FAILED" -eq 0 ] && ok "§25 suggestions are generated per-answer from intent/entity/scope/tools (the fixed M2.9A list is gone)"

# ── §25 static: a boundary/refusal offers ONLY safe reframes — never toward the refused action ─────────
grep -q "SAFE_REFRAME_SUGGESTIONS" "$SUGGEST" || fail "$SUGGEST must define the safe-reframe set"
grep -qE "ctx.refused \|\| ctx.kind === \"refusal\" \|\| ctx.boundary" "$SUGGEST" || fail "$SUGGEST must settle boundary/refusal FIRST (safety golden rule)"
# The safe-reframe set itself must never mention a refused action (funds movement / key exposure / deletion).
awk '/SAFE_REFRAME_SUGGESTIONS/{f=1} f{print} /\]\)/{if(f)exit}' "$SUGGEST" \
  | grep -iqE 'transfer|movimenta|chave privada|private key|apaga|elimina|delete|remover os guards' \
  && fail "the SAFE_REFRAME set reframes toward a refused action" \
  || ok "§25 a boundary/refusal offers only safe reframes (never toward the refused action)"

# ── behavioural: the website vitest suites (run when installed; degrade otherwise) ────────────────────
echo "-- transparency + suggestions unit tests --"
if [ -x website/node_modules/.bin/vitest ]; then
  if ( cd website && node_modules/.bin/vitest run components/banzai/suggestions.test.ts components/banzai/TransparencyPanel.render.test.tsx components/home/banzaiKb.test.ts >/tmp/it-vitest.out 2>&1 ); then
    ok "suggestions + transparency + adapter unit tests pass"
  else
    tail -30 /tmp/it-vitest.out
    fail "suggestions / transparency / adapter unit tests failed"
  fi
else
  ok "vitest not installed here — behavioural tests skipped (run in the local battery; static invariants hold)"
fi

if [ "$FAILED" -ne 0 ]; then
  echo "INTERFACE TRANSPARENCY CHECK FAILED ❌"
  exit 1
fi
echo "INTERFACE TRANSPARENCY CHECK PASSED ✅"
