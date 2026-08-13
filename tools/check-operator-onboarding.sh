#!/usr/bin/env bash
#
# BANZA operator-onboarding contract guard (M2.19G.3, ADR-040).
#
# Enforces the invariants of the BanzAI-hosted operator onboarding (passwordless email-OTP login, a
# private Candidate Registry, .well-known origin proof):
#   1. RUST DECIDES — the security engine engines/banzai-onboarding exists and is vendored into banzai-api.
#   2. WELL-KNOWN PARITY — the Rust WELL_KNOWN_PATH equals the JS constant and the nginx/service path.
#   3. NO SECRET IN GIT — no committed Resend key / non-empty pepper literal; secrets are env-only.
#   4. DARK BY DEFAULT — onboarding is OFF unless BANZAI_ONBOARDING_ENABLED (compose default 0).
#   5. HASHES ONLY — the onboarding schema stores digests/opaque ids, never plaintext code/token/password.
#   6. SAME-ORIGIN ROUTE — nginx proxies /banzai/onboarding/ to banzai-api; pg is installed for it.
#   7. COOKIE DISCIPLINE — the session cookie is __Host- + HttpOnly + SameSite=Strict + Secure.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken. Comment-stripping is applied
# where a rule enumerates what is forbidden, so documenting the boundary never trips the guard.

set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "operator-onboarding: ✗ $*" >&2; exit 1; }
ok() { echo "operator-onboarding: ✓ $*"; }

ENGINE=engines/banzai-onboarding
VENDOR=services/banzai-api/src/onboardingwasm
ONB=services/banzai-api/src/onboarding
NGINX=infra/banza-network/nginx/conf.d/banza.conf
COMPOSE=infra/banza-network/compose.yml
SCHEMA=infra/banza-network/postgres/init/001_schema.sql
MIGRATION=infra/banza-network/postgres/migrations/M2_19G3_operator_onboarding.sql
WELL_KNOWN="/.well-known/banza/ownership-challenge.json"

# ── 1. Rust engine + vendored WASM present ──────────────────────────────────────────────────────────
[ -f "$ENGINE/src/lib.rs" ] || fail "missing Rust engine $ENGINE/src/lib.rs"
[ -f "$VENDOR/banzai_onboarding.js" ] && [ -f "$VENDOR/banzai_onboarding_bg.wasm" ] \
  || fail "missing vendored WASM in $VENDOR"
ok "Rust onboarding engine + vendored WASM present"

# ── 2. well-known path parity (Rust ↔ JS constant ↔ nginx) ──────────────────────────────────────────
grep -q "WELL_KNOWN_PATH: &str = \"$WELL_KNOWN\"" "$ENGINE/src/lib.rs" \
  || fail "Rust WELL_KNOWN_PATH != $WELL_KNOWN"
grep -q "WELL_KNOWN_PATH = \"$WELL_KNOWN\"" "$ONB/constants.js" \
  || fail "JS WELL_KNOWN_PATH constant != $WELL_KNOWN (parity with Rust broken)"
ok "well-known ownership-challenge path parity (Rust ↔ JS)"

# ── 3. no secret committed; secrets are env-only ────────────────────────────────────────────────────
# The pepper default in config.js must be empty ("") — never a baked-in value.
grep -Eq 'BANZAI_OTP_PEPPER \|\| ""' "$ONB/config.js" \
  || fail "config.js must default BANZAI_OTP_PEPPER to an empty string (env-only secret)"
grep -Eq 'RESEND_API_KEY \|\| ""' "$ONB/config.js" \
  || fail "config.js must default RESEND_API_KEY to an empty string (env-only secret)"
# No committed real-looking Resend key anywhere (Resend keys are prefixed re_). Exclude this guard itself.
if git grep -nI 're_[A-Za-z0-9]\{16,\}' -- . ':!tools/check-operator-onboarding.sh' | grep -q .; then
  fail "a committed value looks like a Resend API key (re_…) — secrets must never be in Git"
fi
# The Resend adapter must keep the key in the Authorization header only, never in a log line.
grep -q 'Authorization: `Bearer ${this._apiKey}`' "$ONB/email.js" \
  || fail "email.js must send the Resend key only in the Authorization header"
if grep -nE 'console\.(log|error)\([^)]*_apiKey' "$ONB/email.js" | grep -q .; then
  fail "email.js must never log the Resend key"
fi
ok "secrets are env-only; no committed key; Resend key stays in the Authorization header"

# ── 4. dark by default ──────────────────────────────────────────────────────────────────────────────
grep -q 'BANZAI_ONBOARDING_ENABLED: "${BANZAI_ONBOARDING_ENABLED:-0}"' "$COMPOSE" \
  || fail "compose must default BANZAI_ONBOARDING_ENABLED to 0 (dark by default)"
grep -q 'bool(env.BANZAI_ONBOARDING_ENABLED)' "$ONB/config.js" \
  || fail "config.js must gate onboarding on BANZAI_ONBOARDING_ENABLED"
ok "onboarding is OFF by default (enabled only at deploy)"

# ── 5. hashes only — schema stores digests/opaque ids, never plaintext code/token/password ───────────
for f in "$SCHEMA" "$MIGRATION"; do
  [ -f "$f" ] || fail "missing $f"
  # Strip comments before matching so boundary comments are allowed.
  body="$(sed 's/--.*$//' "$f")"
  for forbidden in otp_code session_token password secret_value plaintext bearer_token; do
    echo "$body" | grep -Eiq "\b${forbidden}\b" && fail "$f declares a forbidden plaintext column '${forbidden}'"
  done
  # The digest columns MUST exist (proof the design stores hashes, not codes/tokens).
  for req in otp_hash session_hash challenge_hash; do
    echo "$body" | grep -q "$req" || fail "$f is missing the digest column '$req'"
  done
done
ok "onboarding schema stores digests/opaque ids only (otp_hash/session_hash/challenge_hash; no plaintext)"

# ── 6. same-origin route + pg installed ─────────────────────────────────────────────────────────────
grep -q 'location /banzai/onboarding/' "$NGINX" \
  || fail "nginx must proxy /banzai/onboarding/ to banzai-api"
grep -q 'proxy_pass           http://banzai-api:8091/onboarding/;' "$NGINX" \
  || fail "nginx /banzai/onboarding/ must proxy_pass to banzai-api:8091/onboarding/"
grep -q '"pg"' services/banzai-api/package.json \
  || fail "banzai-api package.json must declare the pg dependency (onboarding persistence)"
grep -q 'npm install --omit=dev' services/banzai-api/Dockerfile \
  || fail "banzai-api Dockerfile must install production deps (pg)"
ok "same-origin /banzai/onboarding/ route + pg dependency wired"

# ── 7. cookie discipline ────────────────────────────────────────────────────────────────────────────
grep -q '"__Host-banzai_candidate"' "$ONB/config.js" \
  || fail "the session cookie must use the __Host- prefix"
grep -q 'sameSite: "Strict"' "$ONB/config.js" \
  || fail "the session cookie must be SameSite=Strict"
grep -q 'HttpOnly' "$ONB/http.js" \
  || fail "the session cookie must be HttpOnly"
ok "session cookie is __Host- + HttpOnly + SameSite=Strict + Secure"

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
tmp="$(mktemp)"; printf 'CREATE TABLE x (otp_code text);\n' > "$tmp"
if sed 's/--.*$//' "$tmp" | grep -Eiq '\botp_code\b'; then :; else echo "operator-onboarding: self-test broken" >&2; rm -f "$tmp"; exit 2; fi
rm -f "$tmp"

echo "PASS operator-onboarding (M2.19G.3, ADR-040)"
