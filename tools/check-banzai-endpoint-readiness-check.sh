#!/usr/bin/env bash
#
# M2.19G.1 (ADR-038 §44) — endpoint-originated validation readiness CAPSTONE (§37, invariant 28).
#
# The aggregate gate. It computes the §44 metrics across the endpoint-originated validation surfaces and
# requires EVERY one to be 0:
#   official_manual_artifact_inputs      official_arbitrary_url_inputs     official_local_fixture_inputs
#   duplicate_banzai_navigation_items    orphan_banzai_tabs                non_actionable_banzai_tabs
#   receipt_missing_origin_fields        operator_zero_special_bypasses    qwen_decision_calls
#   typescript_verdict_decisions
#
# Exit 1 if any metric is non-zero. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

MODE=website/components/banzai/BanzaiValidationMode.tsx
JOURNEY=website/components/banzai/validationJourney.tsx
CLIENT=website/lib/banzaiValidateClient.ts
AGENT=website/components/banzai/banzai-agent.ts
SHELL_TSX=website/components/banzai/BanzaiAgent.tsx
VALIDATE=services/banzai-api/src/validate.js
FCLIENT=services/banzai-api/src/fetcherClient.js

echo "== banzai-endpoint-readiness-check (M2.19G.1 / ADR-038 §44 capstone) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' '<textarea>' | grep -cE '<textarea' | grep -qx 1 || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

# helper: count matches of REGEX in FILES, excluding // and * comment lines.
count_code() { # regex file...
  local rx="$1"; shift
  local n=0 f
  for f in "$@"; do
    [ -f "$f" ] || continue
    n=$((n + $(grep -nE "$rx" "$f" 2>/dev/null | grep -vE '^[0-9]+:[[:space:]]*//|^[0-9]+:[[:space:]]*\*' | wc -l | tr -d ' ')))
  done
  echo "$n"
}

# 1. official_manual_artifact_inputs — textarea/upload/drag/paste/URL/fixture-loader in the official flow.
official_manual_artifact_inputs=$(count_code '<textarea|type="file"|type=.url.|onDrop=|onDragOver=|onPaste=|accept=|FileReader|readAsText|\.files\b|scanUpload' "$MODE" "$JOURNEY")

# 2. official_arbitrary_url_inputs — a url field in the client body, or a caller URL in the served path.
u_client=$(count_code '\{[^}]*operator_id[^}]*\burl:' "$CLIENT")
u_srv=$(count_code 'req\.body\.url|operatorUrl|targetUrl|artifactUrl|descriptor\.url[^_]|request\.url' "$VALIDATE" "$FCLIENT")
official_arbitrary_url_inputs=$((u_client + u_srv))

# 3. official_local_fixture_inputs — example/vendored-fixture imports in the official flow + served path.
official_local_fixture_inputs=$(count_code 'examples/|operadorZeroArtifacts|\.generated|/fixtures?/|import[^;]*fixture' "$MODE" "$JOURNEY" "$CLIENT" "$VALIDATE")

# 4. duplicate_banzai_navigation_items — retired analyser tab keys + extra Resultados groups.
dup_tabs=$(count_code 'key:[[:space:]]*"(manifest|conformidade|conformance|trust|simb|evidence|traces|receipts)"' "$AGENT")
res_groups=$(grep -oE 'group:[[:space:]]*"resultados"' "$AGENT" 2>/dev/null | wc -l | tr -d ' ')
extra_res=$([ "$res_groups" -gt 1 ] && echo $((res_groups - 1)) || echo 0)
duplicate_banzai_navigation_items=$((dup_tabs + extra_res))

# 5. orphan_banzai_tabs — renderPanel cases with no sidebar entry (+assistente).
SIDEBAR="$(grep -oE 'key:[[:space:]]*"[a-z]+"' "$AGENT" 2>/dev/null | sed -E 's/.*"([a-z]+)"/\1/' | sort -u) assistente"
panel=$(awk '/renderPanel = \(\)/{c=1} c{print} c&&/^  };/{exit}' "$SHELL_TSX" 2>/dev/null || true)
orphan_banzai_tabs=0
for c in $(printf '%s\n' "$panel" | grep -oE 'case "[a-z]+"' | sed -E 's/case "([a-z]+)"/\1/' | sort -u); do
  printf '%s\n' $SIDEBAR | grep -qx "$c" || orphan_banzai_tabs=$((orphan_banzai_tabs+1))
done

# 6. non_actionable_banzai_tabs — a sidebar tab with no renderPanel case (guia/rfc/programadores/resultados).
non_actionable_banzai_tabs=0
for k in $(grep -oE 'key:[[:space:]]*"[a-z]+"' "$AGENT" 2>/dev/null | sed -E 's/.*"([a-z]+)"/\1/' | sort -u); do
  printf '%s\n' "$panel" | grep -qE "case \"$k\"" || non_actionable_banzai_tabs=$((non_actionable_banzai_tabs+1))
done

# 7. receipt_missing_origin_fields — §30 fields absent from buildOperationReceipt.
FIELDS30="operator_id implementation_id canonical_origin endpoint resolved_host fetched_at http_status content_type content_length etag input_hash signature_status engine_version output_hash protocol_fetch_count qwen_calls external_model_calls"
rbody=$(awk '/function buildOperationReceipt/{c=1} c{print} c&&/^}/{exit}' "$VALIDATE" 2>/dev/null || true)
receipt_missing_origin_fields=0
for k in $FIELDS30; do printf '%s\n' "$rbody" | grep -qE "^[[:space:]]*$k[:,]" || receipt_missing_origin_fields=$((receipt_missing_origin_fields+1)); done

# 8. operator_zero_special_bypasses — bypass smells / OZ literal in the served path.
operator_zero_special_bypasses=$(count_code 'if[[:space:]]*\([^)]*operator[_-]zero|precomputed|hardcoded|hard-coded|bypass|shortcut|canned|operator-zero' "$VALIDATE" "$FCLIENT")

# 9. qwen_decision_calls — model/provider call OR a nonzero model count in the served path.
qwen_decision_calls=$(count_code 'from "\./provider|callProvider|callModel|generate\(|runQwen|qwen_calls:[[:space:]]*[1-9]|external_model_calls:[[:space:]]*[1-9]' "$VALIDATE")

# 10. typescript_verdict_decisions — TS authoring a positive verdict literal in the official flow.
typescript_verdict_decisions=$(count_code 'status:[[:space:]]*"VERIFIED"' "$MODE" "$JOURNEY" "$CLIENT")

metrics="official_manual_artifact_inputs official_arbitrary_url_inputs official_local_fixture_inputs duplicate_banzai_navigation_items orphan_banzai_tabs non_actionable_banzai_tabs receipt_missing_origin_fields operator_zero_special_bypasses qwen_decision_calls typescript_verdict_decisions"

fail=0
for m in $metrics; do
  v=$(eval "echo \$$m")
  if [ "$v" = "0" ]; then printf '  ok: %-38s = 0\n' "$m"; else printf 'FAIL: %-38s = %s (must be 0)\n' "$m" "$v"; fail=1; fi
done

echo
if [ "$fail" -ne 0 ]; then echo "banzai-endpoint-readiness-check: FAIL — an endpoint-originated invariant regressed."; exit 1; fi
echo "banzai-endpoint-readiness-check: ✓ all §44 endpoint-originated metrics are 0 (M2.19G.1 capstone)"
