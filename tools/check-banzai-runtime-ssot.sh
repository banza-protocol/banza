#!/usr/bin/env bash
#
# BanzAI runtime SSOT guard (M2.19G.5C, ADR-036).
#
# ADR-036 introduces ONE public runtime single-source-of-truth: GET /banzai/runtime — a secret-free,
# versioned projection of the runtime state every human page consumes (where a page's prose and this
# route differ, the route wins). It is a NEW handler, never a public proxy of the internal /health.
#
# This guard locks the SSOT contract (static; no server boot, no network):
#   1. exactly ONE public runtime route `= /banzai/runtime` in every apex nginx conf (files that define
#      `location = /banzai/ask`), proxied to the internal /runtime handler (never /health).
#   2. the server.js runtime() projection is SECRET-FREE: none of pepper / resend key/token / system
#      prompt / chain-of-thought / concurrency-queue internals / GGUF·model-filename·quantisation /
#      answer content may appear in the handler.
#   3. the projection carries schema_version and authoritative:false.
#   4. website/app/estado/page.tsx CONSUMES /banzai/runtime (fetch) and NEVER hardcodes a
#      "Qwen local activo" engine claim in a static panel constant or in prose — that string may appear
#      only inside the route-derived branch (parts.push).
#   5. the machine-routes-win contract note is present on /estado.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

SERVER="services/banzai-api/src/server.js"
ESTADO="website/app/estado/page.tsx"

fail=0
ok() { printf 'PASS  %s\n' "$1"; }
fl() { printf 'FAIL  %s\n' "$1"; fail=1; }

# The projection region: the runtime() handler body (computation + returned projection object).
runtime_region() { awk '/^function runtime\(\)/,/^}/' "$SERVER"; }

# Forbidden field/leak tokens that must never appear in the runtime projection. Plain literal
# alternations only (no multibyte bracket classes — BSD grep would silently miss them).
SECRET_RX='pepper|resend|system_prompt|systemPrompt|system prompt|chain_of_thought|chainOfThought|chain of thought|concurrency|[^a-z]queue[^a-z]|gguf|\.gguf|Q4_|Q5_|Q8_|qwen3|answer_markdown|answer_text|api_key|apiKey|LLM_API_KEY'

# ── Self-test ─────────────────────────────────────────────────────────────────────────────────────
st=0
echo 'const pepper = env.BANZAI_PEPPER;' | grep -qiE "$SECRET_RX" || { echo "SELF-TEST BROKEN: secret detector did not fire on 'pepper'" >&2; st=1; }
echo 'schema_version: "banzai-runtime/1",' | grep -qiE "$SECRET_RX" && { echo "SELF-TEST BROKEN: secret detector false-fired on a safe field" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "banzai-runtime-ssot: guard self-test FAILED"; exit 2; }

echo "== [1/5] exactly one public /banzai/runtime route in every apex nginx conf =="
apex_found=0
while IFS= read -r conf; do
  grep -qE 'location = /banzai/ask' "$conf" || continue
  apex_found=1
  n="$(grep -cE 'location = /banzai/runtime' "$conf" || true)"
  if [ "$n" = "1" ]; then ok "$conf: exactly one 'location = /banzai/runtime'"; else fl "$conf: expected exactly 1 'location = /banzai/runtime', found $n"; fi
  if grep -qE 'proxy_pass[[:space:]]+http://[^;]*/runtime;' "$conf"; then ok "$conf: /banzai/runtime proxies to the internal /runtime handler"; else fl "$conf: /banzai/runtime must proxy to the internal /runtime handler"; fi
  if grep -A6 'location = /banzai/runtime' "$conf" | grep -qE 'proxy_pass[^;]*/health'; then fl "$conf: /banzai/runtime must NOT proxy to /health"; else ok "$conf: /banzai/runtime does not proxy /health"; fi
done < <(find infra -name "*.conf" 2>/dev/null)
[ "$apex_found" -eq 1 ] && ok "at least one apex nginx conf found" || fl "no apex nginx conf (with location = /banzai/ask) found under infra/"

echo "== [2/5] runtime() projection is secret-free =="
[ -f "$SERVER" ] || fl "missing $SERVER"
grep -qE '^function runtime\(\)' "$SERVER" || fl "runtime() handler not found in $SERVER"
leaks="$(runtime_region | grep -niE "$SECRET_RX" || true)"
if [ -n "$leaks" ]; then fl "runtime() projection can emit a forbidden field:"; echo "$leaks" | sed 's/^/      /'; else ok "runtime() projection carries no forbidden field (pepper/resend/prompt/CoT/queue/GGUF/model-file/answer)"; fi

echo "== [3/5] projection carries schema_version + authoritative:false =="
runtime_region | grep -qE 'schema_version:[[:space:]]*"banzai-runtime/1"' && ok 'projection carries schema_version "banzai-runtime/1"' || fl "projection missing schema_version"
runtime_region | grep -qE 'authoritative:[[:space:]]*false' && ok "projection carries authoritative: false" || fl "projection must carry authoritative: false"

echo "== [4/5] /estado consumes the SSOT + no hardcoded engine claim =="
[ -f "$ESTADO" ] || fl "missing $ESTADO"
grep -qE 'fetch\(' "$ESTADO" && grep -qE '/banzai/runtime' "$ESTADO" && ok "/estado fetches /banzai/runtime (route-derived BanzAI row)" || fl "/estado must fetch the runtime SSOT (/banzai/runtime)"
# PANEL_STATIC must not name the live engine.
if awk '/const PANEL_STATIC/,/\] as const;/' "$ESTADO" | grep -qE 'Qwen local'; then
  fl "PANEL_STATIC hardcodes a 'Qwen local' engine claim — the BanzAI row must be route-derived"
else
  ok "PANEL_STATIC carries no hardcoded 'Qwen local' engine claim"
fi
# 'Qwen local activo' as a live claim may appear ONLY inside the route-derived branch (parts.push). Any
# non-comment, non-route-push line asserting it is an independent prose claim — forbidden.
prose_claim="$(grep -nE 'Qwen local' "$ESTADO" | grep -iE 'activ' | grep -vE '^[0-9]+:[[:space:]]*//' | grep -vE 'parts\.push' || true)"
if [ -n "$prose_claim" ]; then fl "an independent (non-route) 'Qwen local … activo' claim survives on /estado:"; echo "$prose_claim" | sed 's/^/      /'; else ok "'Qwen local activo' appears only in the route-derived branch (never as an independent prose/panel claim)"; fi

echo "== [5/5] machine-routes-win contract note on /estado =="
grep -qE 'a rota ganha|as rotas ganham' "$ESTADO" && ok "/estado states the machine-routes-win contract (a rota ganha)" || fl "/estado must state the machine-routes-win contract"

if [ "$fail" -ne 0 ]; then
  echo
  echo "banzai-runtime-ssot: FAIL — the runtime SSOT contract (ADR-036) drifted."
  exit 1
fi
echo
echo "banzai-runtime-ssot: ✓ one secret-free /banzai/runtime SSOT (schema_version + authoritative:false); /estado consumes it and never hardcodes the live engine (ADR-036)"
