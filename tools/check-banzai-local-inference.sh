#!/usr/bin/env bash
# make banzai-local-inference-check — ADR-044 guard.
#
# Enforces the BanzAI local Qwen inference invariants:
#   - NO GGUF model file is committed to Git; models/ + *.gguf are git-ignored.
#   - NO real external-provider API key value is committed (OpenAI/Groq/Together/DeepSeek/
#     Anthropic OR the generic LLM_API_KEY / any *_API_KEY).
#   - mock stays the default; local_qwen is benchmark-gated (never default without approval).
#   - The local llama.cpp service is internal-only (no host port), profile-gated, on its own
#     isolated internal network, read-only, cap_drop ALL, no-new-privileges, model mounted RO.
#   - No model download during build/deploy (GGUF installed manually).
#   - The Rust control engine (prompt + validator) exists (Rust owns prompt/validation/fallback).
#   - Docs state Qwen is NOT normative; no affirmative "model is normative/decides" claim leaks in.
#   - The healthcheck exposes no secrets.
#   - The llama-local image default is DIGEST-pinned (ADR-045; no :latest / rolling :server).
#
# Self-testing: exits 2 if its own detectors regress (the API-key detector AND the infra
# detectors — network membership, healthcheck binary, image pinning — are all exercised
# with known-bad + clean fixtures); exits 1 on a real finding; 0 clean.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"
FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok()   { echo "  ok: $*"; }

# ── Testable infra detectors (self-tested below) ─────────────────────────────
# Small pure functions so the live checks and the self-test share ONE code path —
# a typo in a pattern is then caught by a known-bad fixture, not shipped silently (F7).
net_in_block() { printf '%s\n' "$1" | grep -q "$2"; }   # 0 if network $2 appears in block $1
hc_uses()      { printf '%s\n' "$1" | grep -q "$2"; }   # 0 if binary $2 appears in healthcheck cmd $1
image_pinned() {                                         # 0 iff $1 is an @sha256 pin and not :latest
  case "$1" in *:latest*) return 1;; esac
  printf '%s' "$1" | grep -qE '@sha256:[0-9a-f]{64}'
}

# ── Pure text detector (self-testable) ───────────────────────────────────────
# Extract KEY=VALUE / KEY: VALUE assignments whose VALUE is a real-looking secret
# (>=16 key chars). Uses grep -o so only the ASSIGNMENT is inspected — a file PATH
# containing "example" can never be mistaken for a placeholder value (F8). Covers any
# *_API_KEY, including the generic LLM_API_KEY (F9).
key_value_in_text() {
  grep -oE '[A-Z0-9_]*API_KEY[[:space:]]*[:=][[:space:]]*["'"'"']?[A-Za-z0-9_-]{16,}' \
    | grep -vE 'change-me|example|redacted|your[-_]?key|xxxx|placeholder|test[-_]?key|not[-_]?real|fake'
}

# ── Self-test ────────────────────────────────────────────────────────────────
selftest() {
  local bad
  bad="$(printf 'OPENAI_API_KEY=sk-ABCDEFGHIJKLMNOPQRSTUVWX\n' | key_value_in_text)"
  [ -n "$bad" ] || { echo "SELFTEST FAIL: provider key value not detected"; exit 2; }
  bad="$(printf 'LLM_API_KEY=sk-ABCDEFGHIJKLMNOPQRSTUVWX\n' | key_value_in_text)"
  [ -n "$bad" ] || { echo "SELFTEST FAIL: generic LLM_API_KEY value not detected"; exit 2; }
  bad="$(printf 'some/example/f.env:2:DEEPSEEK_API_KEY=sk-ABCDEFGHIJKLMNOPQRSTUVWX\n' | key_value_in_text)"
  [ -n "$bad" ] || { echo "SELFTEST FAIL: key in a path containing 'example' not detected"; exit 2; }
  local good
  good="$(printf 'LLM_API_KEY=${LLM_API_KEY:-}\nDEEPSEEK_API_KEY=change-me\nLLM_API_KEY=your-key-here\n' | key_value_in_text)"
  [ -z "$good" ] || { echo "SELFTEST FAIL: placeholder/ref flagged as a key: $good"; exit 2; }

  # Infra detectors (F7): known-bad fixtures MUST fire; clean fixtures MUST NOT.
  net_in_block '    networks: [banza-inference, banza-data]' 'banza-data' \
    || { echo "SELFTEST FAIL: banza-data membership not detected"; exit 2; }
  net_in_block '    networks: [banza-edge]' 'banza-edge' \
    || { echo "SELFTEST FAIL: banza-edge membership not detected"; exit 2; }
  net_in_block '    networks: [banza-inference]' 'banza-data' \
    && { echo "SELFTEST FAIL: banza-data false-positive on a clean block"; exit 2; }
  hc_uses 'test: ["CMD-SHELL", "wget -q http://127.0.0.1:8080/health || exit 1"]' 'wget' \
    || { echo "SELFTEST FAIL: wget healthcheck not detected"; exit 2; }
  hc_uses 'test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:8080/health || exit 1"]' 'curl' \
    || { echo "SELFTEST FAIL: curl healthcheck not detected"; exit 2; }
  hc_uses 'test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:8080/health || exit 1"]' 'wget' \
    && { echo "SELFTEST FAIL: wget false-positive on a curl healthcheck"; exit 2; }
  image_pinned 'ghcr.io/ggml-org/llama.cpp@sha256:0000000000000000000000000000000000000000000000000000000000000000' \
    || { echo "SELFTEST FAIL: a digest-pinned image was not accepted"; exit 2; }
  image_pinned 'ghcr.io/ggml-org/llama.cpp:server' \
    && { echo "SELFTEST FAIL: a rolling :server tag was accepted as pinned"; exit 2; }
  image_pinned 'nginx:latest' \
    && { echo "SELFTEST FAIL: a :latest tag was accepted as pinned"; exit 2; }
  echo "  selftest ok"
}
selftest

echo "== banzai-local-inference-check (ADR-044) =="
COMPOSE=infra/banza-network/compose.yml
ENVX=infra/banza-network/.env.example

# 1. No GGUF tracked in Git; models/ + *.gguf git-ignored.
gguf="$(git ls-files 2>/dev/null | grep -iE '\.gguf$' || true)"
[ -z "$gguf" ] && ok "no GGUF file is tracked in Git" || fail "GGUF committed to Git: $gguf"
if git check-ignore -q infra/banza-network/models/x.gguf 2>/dev/null && git check-ignore -q anywhere/foo.gguf 2>/dev/null; then
  ok "models/ and *.gguf are git-ignored"
else
  fail "infra/banza-network/models/ or *.gguf is NOT git-ignored"
fi

# 2. No committed external/generic API key VALUE anywhere tracked.
# Exclude test dirs and this guard's own self-test fixtures (they carry fake keys by design).
keys="$(git grep -InE '[A-Z0-9_]*API_KEY' -- '*.js' '*.ts' '*.json' '*.yml' '*.yaml' '*.sh' '*.env*' ':!*.d.ts' ':!*/test/*' ':!*/tests/*' ':!*.test.*' ':!tools/check-banzai-local-inference.sh' 2>/dev/null | key_value_in_text || true)"
[ -z "$keys" ] && ok "no external/generic API key value is committed" || fail "committed API key value: $keys"

# 3. llama-local: profile-gated, no host port, isolated internal network, hardened, model RO.
# Slice the llama-local service block. Service lines may carry inline comments, so the
# start/end patterns tolerate a trailing space/comment (not just a bare ":").
llama_block="$(awk '/^  llama-local:([ \t]|$)/{f=1;next} /^  [a-z][a-z-]*:([ \t]|$)/{f=0} f' "$COMPOSE" 2>/dev/null)"
if [ -z "$llama_block" ]; then
  fail "llama-local service not found in $COMPOSE"
else
  echo "$llama_block" | grep -qE '^\s*ports:' && fail "llama-local must NOT publish a host port" || ok "llama-local publishes no host port"
  echo "$llama_block" | grep -q 'profiles:' && ok "llama-local is profile-gated (off by default)" || fail "llama-local must be profile-gated"
  net_in_block "$llama_block" 'banza-edge'      && fail "llama-local must NOT be on banza-edge" || ok "llama-local not on banza-edge"
  net_in_block "$llama_block" 'banza-inference' && ok "llama-local on isolated banza-inference network" || fail "llama-local must be on banza-inference"
  net_in_block "$llama_block" 'banza-data'      && fail "llama-local must NOT be on banza-data (no route to postgres)" || ok "llama-local has no route to postgres"
  echo "$llama_block" | grep -q 'read_only: true' && ok "llama-local runs read-only" || fail "llama-local must run read_only"
  echo "$llama_block" | grep -qiE 'no-new-privileges' && ok "llama-local sets no-new-privileges" || fail "llama-local must set no-new-privileges"
  echo "$llama_block" | grep -qE 'cap_drop' && ok "llama-local drops capabilities" || fail "llama-local must cap_drop"
  echo "$llama_block" | grep -q '/models:ro' && ok "llama-local mounts the model read-only" || fail "llama-local must mount the model read-only (./models:/models:ro)"
  # ADR-045 (FIX-6): the image default must be DIGEST-pinned (no :latest / rolling :server),
  # matching the stack's fixed-tag rule; a rolling tag could swap the runtime base silently.
  img_default="$(printf '%s\n' "$llama_block" | grep -E '^\s*image:' | sed -E 's/.*:-([^}]*)}.*/\1/;s/^[[:space:]]*image:[[:space:]]*//')"
  if image_pinned "$img_default"; then
    ok "llama-local image default is digest-pinned ($img_default)"
  else
    fail "llama-local image default must be @sha256-pinned (no :latest / rolling :server): $img_default"
  fi
  # ADR-045: the healthcheck must not use a binary absent from the image (wget); use curl.
  # Inspect only the CMD-SHELL test command (not surrounding comments).
  hc="$(echo "$llama_block" | grep 'CMD-SHELL')"
  hc_uses "$hc" 'wget' && fail "llama-local healthcheck must not use wget (absent in the llama.cpp image)" || ok "llama-local healthcheck avoids wget"
  hc_uses "$hc" 'curl' && ok "llama-local healthcheck uses curl (present in the image)" || fail "llama-local healthcheck should use curl (present in the image)"
fi
# banza-inference network is declared internal (the line may carry an inline comment).
grep -A2 '^  banza-inference:' "$COMPOSE" | grep -q 'internal: true' \
  && ok "banza-inference network is internal" || fail "banza-inference must be internal: true"

# 4. Model path configurable; no model download during build/deploy.
grep -q 'LLAMA_MODEL_PATH' "$COMPOSE" && ok "model path is configurable (LLAMA_MODEL_PATH)" || fail "LLAMA_MODEL_PATH must configure the model path"
if git grep -InE '(curl|wget|huggingface-cli|hf_hub|hf ).*(\.gguf|huggingface)' -- 'services/**' 'infra/**' 'Dockerfile' '**/Dockerfile' 2>/dev/null | grep -viE 'never|not download|no.*download|manual|#'; then
  fail "a model download appears in build/deploy — GGUF must be installed manually"
else
  ok "no automatic model download in build/deploy"
fi

# 5. mock default + benchmark-gated (anchored to the ACTIVE assignment; reject active local default).
grep -qE '^[[:space:]]*LLM_PROVIDER=mock[[:space:]]*(#.*)?$' "$ENVX" && ok ".env.example default provider is mock" || fail ".env.example must default LLM_PROVIDER=mock"
grep -qE '^[[:space:]]*BANZAI_BENCHMARK_APPROVED=false[[:space:]]*(#.*)?$' "$ENVX" && ok "benchmark approval defaults to false" || fail "BANZAI_BENCHMARK_APPROVED must default to false"
grep -qE '^[[:space:]]*LLM_PROVIDER=local_qwen[[:space:]]*(#.*)?$' "$ENVX" && fail ".env.example must NOT default to local_qwen" || ok ".env.example does not default to local_qwen"
grep -qE '^[[:space:]]*BANZAI_BENCHMARK_APPROVED=true[[:space:]]*(#.*)?$' "$ENVX" && fail ".env.example must NOT ship benchmark_approved=true" || ok "benchmark not pre-approved in .env.example"
grep -q '${LLM_PROVIDER:-mock}' "$COMPOSE" && ok "compose provider fallback is mock" || fail "compose must fall back to LLM_PROVIDER:-mock"

# 6. Rust controls prompt + validation (ADR-037): the control modules exist.
[ -f engines/banzai-query-core/src/validate.rs ] && ok "Rust response validator present" || fail "engines/banzai-query-core/src/validate.rs missing"
[ -f engines/banzai-query-core/src/prompt.rs ] && ok "Rust prompt builder present" || fail "engines/banzai-query-core/src/prompt.rs missing"

# 6b. ADR-046: BanzAI never uses model reasoning mode. Rust owns the policy
# (disable_reasoning); the JS glue maps it to the local runtime (enable_thinking:false).
grep -q 'disable_reasoning' engines/banzai-query-core/src/prompt.rs \
  && ok "Rust prompt declares the no-reasoning policy (disable_reasoning)" \
  || fail "prompt.rs must declare disable_reasoning (ADR-046)"
grep -q 'enable_thinking' services/banzai-api/src/provider.js \
  && ok "local requests disable Qwen reasoning (enable_thinking:false)" \
  || fail "provider.js must disable local Qwen reasoning (enable_thinking:false; ADR-046)"

# 7. ADR-044 (runtime) + ADR-045 (latency tuning) + ADR-046 (no reasoning) exist.
ls decisions/adr/ADR-044-*.md >/dev/null 2>&1 && ok "ADR-044 present" || fail "ADR-044 missing"
ls decisions/adr/ADR-045-*.md >/dev/null 2>&1 && ok "ADR-045 present" || fail "ADR-045 missing"
ls decisions/adr/ADR-046-*.md >/dev/null 2>&1 && ok "ADR-046 present" || fail "ADR-046 missing"

# 8. Docs state the model is NOT normative — AND no affirmative "model is normative" claim leaks in.
if grep -rqiE 'não (é|e) (fonte )?normativ|not .*normative|apenas .*camada .*(de )?linguagem|only .*language (generation )?layer' docs/banzai decisions/adr/ADR-044-*.md 2>/dev/null; then
  ok "docs state the local model is non-normative"
else
  fail "docs must state Qwen/the local model is NOT normative (only a language layer)"
fi
if grep -rniE '(qwen|o modelo|the model) (é|e|is) (a )?(fonte normativa|normative source|normativ)|(qwen|o modelo|the model) (decide|decides) (as regras|participa|the rules)|(model|modelo) (can|pode) (certif|approv|aprov|licen|govern)' docs/banzai 2>/dev/null | grep -viE 'não|nao|never|not |cannot|nunca|\?'; then
  fail "docs contain an affirmative claim that the model is normative / decides / certifies"
else
  ok "no affirmative model-normative claim in docs"
fi

# 9. Healthcheck does not expose secrets.
if echo "$llama_block" | grep -A6 'healthcheck:' | grep -qiE 'API_KEY|PASSWORD|SECRET|/models/'; then
  fail "llama-local healthcheck must not reference secrets or model paths"
else
  ok "llama-local healthcheck exposes no secrets"
fi

echo
if [ "$FAILED" -eq 0 ]; then
  echo "BANZAI LOCAL INFERENCE CHECK PASSED ✅"
else
  echo "BANZAI LOCAL INFERENCE CHECK FAILED ✗"
fi
exit "$FAILED"
