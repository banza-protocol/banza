#!/usr/bin/env bash
# MANUAL, OPT-IN smoke test for a REAL hosted LLM provider (deepseek | qwen).
#
# NEVER runs in CI or in the standard local E2E — it only proceeds when ALL of:
#   1. RUN_REAL_LLM_TEST=1 is set explicitly;
#   2. LLM_PROVIDER is deepseek or qwen (the only approved real providers);
#   3. LLM_API_KEY is present in the environment (from the VM's .env — never Git).
# Otherwise it prints SKIPPED and exits 0 (it must not fail pipelines).
#
# The API key is read from the environment only. It is never echoed, never logged,
# never written to disk, never committed. Do not commit this script's output.
#
# Usage (manual, with explicit human authorization):
#   RUN_REAL_LLM_TEST=1 LLM_PROVIDER=deepseek LLM_API_KEY=... \
#     bash infra/banza-network/tests/smoke-banzai-real-llm.sh
set -euo pipefail
cd "$(dirname "$0")/../../.."   # repo root

skip() { echo "SKIPPED: $*"; exit 0; }
fail() { echo "FAIL: $*" >&2; exit 1; }

[ "${RUN_REAL_LLM_TEST:-}" = "1" ] || skip "RUN_REAL_LLM_TEST=1 not set (real-LLM smoke is manual and opt-in)"
case "${LLM_PROVIDER:-}" in
  deepseek|qwen) : ;;
  *) skip "LLM_PROVIDER must be deepseek or qwen (got '${LLM_PROVIDER:-unset}')" ;;
esac
[ -n "${LLM_API_KEY:-}" ] || skip "LLM_API_KEY not set in the environment"

PORT="${BANZAI_REAL_TEST_PORT:-8099}"
jget() { node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{let v=JSON.parse(d);for(const k of (process.argv[1]?process.argv[1].split("."):[]))v=v==null?undefined:v[k];console.log(v===undefined?"":typeof v==="object"?JSON.stringify(v):v)}catch{console.log("")}})' "$1"; }

echo "== starting banzai-api locally (provider=$LLM_PROVIDER, port=$PORT; the key stays in env) =="
( cd services/banzai-api && PORT="$PORT" node src/server.js ) >/dev/null 2>&1 &
PID=$!
cleanup() { kill "$PID" 2>/dev/null || true; }
trap cleanup EXIT

for i in $(seq 1 15); do
  curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1 && break
  sleep 1
  [ "$i" = "15" ] && fail "banzai-api did not become healthy"
done

echo "== health reflects the real provider (no call made yet) =="
h=$(curl -s "http://127.0.0.1:$PORT/health")
[ "$(echo "$h" | jget llm_provider)" = "$LLM_PROVIDER" ] || fail "llm_provider != $LLM_PROVIDER"
[ "$(echo "$h" | jget guardrails.can_certify)" = "false" ] || fail "can_certify != false"

echo "== one REAL grounded question through $LLM_PROVIDER =="
r=$(curl -s -XPOST "http://127.0.0.1:$PORT/ask" -H 'Content-Type: application/json' \
     -d '{"question":"O que é BANZA?"}')
[ "$(echo "$r" | jget provider)" = "$LLM_PROVIDER" ] || fail "provider != $LLM_PROVIDER: $(echo "$r" | jget error)"
[ "$(echo "$r" | jget mode)" = "real" ] || fail "mode != real"
[ "$(echo "$r" | jget grounded)" = "true" ] || fail "answer not grounded"
nsrc=$(echo "$r" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const o=JSON.parse(d);console.log((o.sources||[]).length)})')
[ "$nsrc" -ge 1 ] || fail "real answer must still cite sources"
[ "$(echo "$r" | jget guardrails.can_certify)" = "false" ] || fail "guardrails lost on real answer"
echo "  answer (truncated): $(echo "$r" | jget answer | head -c 200)…"

echo "== external model WAS called (expected here, and only here) =="
[ "$(curl -s "http://127.0.0.1:$PORT/health" | jget external_model_called)" = "true" ] || fail "external_model_called should be true after a real call"

echo "== ungrounded question still refuses to invent (no external call needed) =="
r2=$(curl -s -XPOST "http://127.0.0.1:$PORT/ask" -d '{"question":"Qual é a cotação do dólar amanhã?"}')
[ "$(echo "$r2" | jget grounded)" = "false" ] || fail "off-topic question must not be grounded"
echo "$r2" | jget answer | grep -qi "fonte suficiente" || fail "must state insufficient sources"

echo "REAL-LLM SMOKE PASSED ($LLM_PROVIDER) ✅  — key never printed, output not for commit"
