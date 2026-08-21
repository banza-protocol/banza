#!/usr/bin/env bash
# make banzai-public-interface-check — M2.8E guard.
#
# BanzAI is a SINGLE public interface on the apex at banza.network/banzai, which calls the
# internal banzai-api (local_qwen) SAME-ORIGIN via /banzai/ask. This guard fails if:
#   - any active website UI references banzai.banza.network as the BanzAI route;
#   - the nginx banzai.banza.network server block still PROXIES to the backend (must redirect);
#   - the apex does not expose the same-origin `location = /banzai/ask` → banzai-api;
#   - the public chat adapter is not wired to the same-origin /banzai/ask backend;
#   - the chat adapter posts to an absolute/off-origin URL (must be same-origin, relative);
#   - the public UI still advertises mock/demo/provider or misleading `llm_calls=0` while the
#     backend default is local_qwen;
#   - the local llama.cpp service publishes a host port.
#
# Self-testing: exits 2 if its own detectors regress; 1 on a real finding; 0 clean.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"
FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok()   { echo "  ok: $*"; }

# Block E2 moved these sentences out of the module and into the bilingual catalogues, so grepping the
# module stopped proving anything about them. They are read from the resolved copy instead — which also
# lets the English edition be checked, which grepping a Portuguese literal never could.
# Block G — this label moved into the bilingual catalogue when the ask surface stopped answering an
# English reader in Portuguese. Reading the catalogue is the same property at its new owner, and it
# now covers both editions instead of only the Portuguese one.
# shellcheck source=tools/_banzai-copy.sh
. tools/_banzai-copy.sh

NGINX=infra/banza-network/nginx/conf.d/banza.conf
KB=website/components/home/banzaiKb.ts
BADGES_FILE=website/components/banzai/banzai-agent.ts
SERVER=services/banzai-api/src/server.js

# ── Testable detectors (self-tested) ─────────────────────────────────────────
# The banzai.banza.network server block must redirect, not proxy to the backend.
subdomain_proxies_backend() {   # reads banza.conf on stdin ; 0 if the subdomain block proxies banzai-api
  awk '/server_name banzai\.banza\.network/{f=1} f&&/proxy_pass.*banzai-api/{print;found=1} f&&/^}/{f=0} END{exit found?0:1}'
}
has_same_origin_ask() {         # reads banza.conf on stdin ; 0 if apex exposes /banzai/ask → banzai-api
  awk '/location = \/banzai\/ask/{f=1} f&&/proxy_pass.*banzai-api/{found=1} f&&/}/{f=0} END{exit found?0:1}'
}
mock_demo_label() {             # reads text on stdin ; 0 if a stale mock/demo/provider/llm_calls label is present
  grep -iE 'modo demonstra|mock provider|provider mock|provider: ?mock|llm_calls ?= ?0|· mock ·'
}

selftest() {
  printf 'server_name banzai.banza.network;\n  location / { proxy_pass http://banzai-api:8091; }\n}\n' | subdomain_proxies_backend >/dev/null \
    || { echo "SELFTEST FAIL: proxying subdomain not detected"; exit 2; }
  printf 'server_name banzai.banza.network;\n  return 301 https://banza.network/banzai;\n}\n' | subdomain_proxies_backend >/dev/null \
    && { echo "SELFTEST FAIL: redirect subdomain wrongly flagged as proxy"; exit 2; }
  printf 'location = /banzai/ask {\n proxy_pass http://banzai-api:8091/ask;\n}\n' | has_same_origin_ask \
    || { echo "SELFTEST FAIL: same-origin /banzai/ask not detected"; exit 2; }
  printf 'nothing here\n' | has_same_origin_ask \
    && { echo "SELFTEST FAIL: absent /banzai/ask wrongly detected"; exit 2; }
  printf 'modo demonstração · Rust tools · llm_calls=0\n' | mock_demo_label >/dev/null \
    || { echo "SELFTEST FAIL: mock/demo label not detected"; exit 2; }
  printf 'Qwen local activo · inferência local · chamadas externas: 0\n' | mock_demo_label >/dev/null \
    && { echo "SELFTEST FAIL: accurate label wrongly flagged"; exit 2; }
  echo "  selftest ok"
}
selftest

echo "== banzai-public-interface-check (M2.8E) =="

# 1. No active website UI references the retired subdomain as the BanzAI route.
sub="$(git grep -InE 'banzai\.banza\.network' -- 'website/app/**' 'website/components/**' 2>/dev/null || true)"
[ -z "$sub" ] && ok "no banzai.banza.network reference in active website UI" \
  || fail "active website UI references the retired banzai.banza.network: $sub"

# 2. nginx: subdomain redirects (does not proxy the backend).
if [ -f "$NGINX" ]; then
  subdomain_proxies_backend < "$NGINX" >/dev/null \
    && fail "banzai.banza.network must NOT proxy to banzai-api (must 301-redirect to the apex)" \
    || ok "banzai.banza.network no longer proxies the backend (retired/redirect)"
  grep -q 'return 301 https://banza.network/banzai' "$NGINX" \
    && ok "banzai.banza.network 301-redirects to the unified apex interface" \
    || fail "banzai.banza.network should 301-redirect to https://banza.network/banzai"
  # 3. apex exposes the same-origin /banzai/ask → banzai-api.
  has_same_origin_ask < "$NGINX" \
    && ok "apex exposes same-origin /banzai/ask → banzai-api" \
    || fail "apex must expose 'location = /banzai/ask' proxying to banzai-api"
else
  fail "$NGINX not found"
fi

# 4 + 5. Public chat adapter is wired to the same-origin backend, not an off-origin URL.
if [ -f "$KB" ]; then
  grep -q '"/banzai/ask"' "$KB" && ok "chat adapter posts to same-origin /banzai/ask" \
    || fail "banzaiKb.ts must POST to the same-origin '/banzai/ask'"
  # the ASK endpoint must be a relative (same-origin) path, never an absolute/off-host URL.
  if grep -oE 'ASK_URL[^\n]*=[^\n]*' "$KB" | grep -qE 'https?://'; then
    fail "chat adapter ASK_URL must be same-origin (relative), not an absolute URL"
  else
    ok "chat adapter ASK endpoint is same-origin (relative)"
  fi
else
  fail "$KB not found"
fi

# 6. No stale mock/demo/provider/llm_calls label on ANY public BanzAI surface — including the
# served reference CONTENT and the public protocol DIAGRAMS (SVG), where such labels also render.
labels="$(git grep -hInE 'modo demonstra|mock provider|provider mock|provider: ?mock|llm_calls ?= ?0|· mock ·' -- \
  'website/components/banzai/**' 'website/components/home/**' 'website/app/(pt)/banzai/**' 'website/app/(pt)/estado/**' \
  'website/content/**' 'website/public/diagrams/**' 2>/dev/null | mock_demo_label || true)"
[ -z "$labels" ] && ok "no stale mock/demo/provider/llm_calls label on public BanzAI/home/content/diagram surfaces" \
  || fail "stale mock/demo label on a public surface: $labels"

# 7. Accurate CONFIGURED-DEFAULT badge present (M2.8F): the standing badge names the default
# engine ("por omissão: Qwen local") WITHOUT asserting that every answer used it — the per-answer
# status line carries that truth. The old "Qwen local activo" phrasing over-stated per-answer state.
copy_id_says agent badge.defaultEngine pt "por omissão: Qwen local" && ok "public badge names the configured default (Qwen local, por omissão)" \
  || fail "public status badge must name the configured default engine ('por omissão: Qwen local')"
copy_says pt 'Qwen local activo' \
  && fail "badge must NOT claim 'Qwen local activo' (over-states per-answer state; use 'por omissão' + per-answer status)" \
  || ok "no over-stated 'Qwen local activo' badge"

# 7b. Per-answer transparency (M2.8F): the chat adapter derives a per-answer status label from the
# backend telemetry, proving whether THIS answer was generated by the local model or came from the
# deterministic/insufficient/degraded path — so 'Qwen local' is never shown beside an answer that
# did not call Qwen.
if [ -f "$KB" ]; then
  grep -q 'local_model_called' "$KB" && ok "chat adapter reads per-answer local_model_called telemetry" \
    || fail "banzaiKb.ts must read the per-answer 'local_model_called' telemetry"
  copy_says pt 'Gerado por Qwen local' && copy_says en 'Generated by local Qwen' \
    && grep -q 'status.localModel' "$KB" \
    && ok "chat adapter emits a per-answer local-model status label in both editions" \
    || fail "banzaiKb.ts must emit a per-answer status label naming the local model, in both editions"
  grep -q 'Resposta determinística' "$KB" && ok "chat adapter distinguishes the deterministic path per answer" \
    || fail "banzaiKb.ts must label the deterministic (no model call) path distinctly"
fi

# 7c. Backend honesty: local_model_called must be gated on the THIS-answer signal (meta.llm_called),
# never on the cached result.model_called — otherwise a cache hit is mislabelled as a live Qwen
# generation. Enforce the correct derivation and forbid the buggy form.
if [ -f "$SERVER" ]; then
  grep -q 'local_model_called: localGeneratedNow' "$SERVER" \
    && grep -qE 'localGeneratedNow *= *Boolean\(meta\.llm_called\)' "$SERVER" \
    && ok "server gates local_model_called on the this-answer signal (meta.llm_called)" \
    || fail "server.js must derive local_model_called from meta.llm_called (this-answer), not the cached result.model_called"
  grep -qE 'local_model_called:[^,]*result\.model_called' "$SERVER" \
    && fail "server.js must NOT derive local_model_called from result.model_called (stale on cache hits)" \
    || ok "no cache-stale local_model_called derivation in server.js"
fi

# 8. The local llama.cpp service publishes NO host port (internal only).
llama_block="$(awk '/^  llama-local:([ \t]|$)/{f=1;next} /^  [a-z][a-z-]*:([ \t]|$)/{f=0} f' infra/banza-network/compose.yml 2>/dev/null)"
echo "$llama_block" | grep -qE '^\s*ports:' && fail "llama-local must NOT publish a host port" \
  || ok "llama-local publishes no host port (internal only)"

echo
if [ "$FAILED" -eq 0 ]; then echo "BANZAI PUBLIC INTERFACE CHECK PASSED ✅"; else echo "BANZAI PUBLIC INTERFACE CHECK FAILED ✗"; fi
exit "$FAILED"
