#!/usr/bin/env bash
#
# M2.19G.1 (ADR-034 §4.4/§4.7) — no arbitrary URL guard (§37, invariant 7).
#
# The fetcher client + the served validate path never accept a user-supplied URL. The only thing the
# browser sends is a CLOSED operator_id + implementation_id (+ step), re-checked against a closed id
# shape (isClosedId) before any request. The fetch descriptor is built exclusively from the registry-
# resolved canonical_origin + expected_host + path — never from a caller URL.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

CLIENT=website/lib/banzaiValidateClient.ts
UILIB=website/lib/banzaiValidation.ts
FCLIENT=services/banzai-api/src/fetcherClient.js
VALIDATE=services/banzai-api/src/validate.js

echo "== banzai-no-arbitrary-url-check (M2.19G.1 / ADR-034 §4.4/§4.7) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'const CLOSED_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;' | grep -q 'CLOSED_ID' || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

# 1. The closed id shape exists and is enforced by the browser client BEFORE any request.
if [ -f "$UILIB" ]; then
  grep -qE 'function isClosedId' "$UILIB" && ok "isClosedId (closed id shape) defined" || fl "$UILIB must define isClosedId"
  grep -qE 'CLOSED_ID[[:space:]]*=[[:space:]]*/\^' "$UILIB" && ok "closed id is a slug regex (never a URL/scheme/path)" || fl "$UILIB CLOSED_ID must be a slug regex"
else
  fl "$UILIB not found"
fi
if [ -f "$CLIENT" ]; then
  grep -qE 'isClosedId' "$CLIENT" && ok "client re-checks isClosedId before requesting" || fl "$CLIENT must gate on isClosedId"
  # The request body must carry ONLY operator_id/implementation_id(/step) — never a url field. (`url` as a
  # same-origin endpoint constant or a function-parameter type is fine; a url KEY inside the body is not.)
  grep -qE '\{ operator_id: operatorId, implementation_id: implementationId' "$CLIENT" \
    && ok "request body shape is { operator_id, implementation_id (, step) }" \
    || fl "$CLIENT request body must be { operator_id, implementation_id, ... }"
  bad=$(grep -nE '\{[^}]*operator_id[^}]*\burl:' "$CLIENT" || true)
  [ -z "$bad" ] && ok "client body carries no url field" || { fl "client must not send a url in the body:"; printf '%s\n' "$bad" | sed 's/^/      /'; }
else
  fl "$CLIENT not found"
fi

# 2. The fetcher client builds the request only from origin/expected_host/path (registry-resolved).
if [ -f "$FCLIENT" ]; then
  grep -qE 'canonical_origin' "$FCLIENT" && grep -qE 'expected_host' "$FCLIENT" && grep -qE '\bpath\b' "$FCLIENT" \
    && ok "fetcher request built from canonical_origin + expected_host + path" \
    || fl "$FCLIENT must build the request from canonical_origin/expected_host/path"
  # It must not accept a caller-supplied absolute URL as the fetch target.
  bad=$(grep -nE 'req\.url|request\.url|descriptor\.url[^_]|body\.url' "$FCLIENT" || true)
  [ -z "$bad" ] && ok "fetcher client accepts no caller URL" || { fl "$FCLIENT must not accept a caller URL:"; printf '%s\n' "$bad" | sed 's/^/      /'; }
else
  fl "$FCLIENT not found"
fi

# 3. The served path derives the fetch path from the registry-resolved target, not a request URL.
if [ -f "$VALIDATE" ]; then
  grep -qE 'target\.endpoints\[' "$VALIDATE" && ok "fetch path comes from target.endpoints (registry-resolved)" || fl "$VALIDATE must fetch from target.endpoints"
  grep -qE 'function pathOf' "$VALIDATE" && ok "pathOf strips the origin so only origin+path reach the fetcher" || fl "$VALIDATE must derive path via pathOf"
  # No caller URL smuggling.
  bad=$(grep -nE 'req\.body\.url|operatorUrl|targetUrl|artifactUrl' "$VALIDATE" || true)
  [ -z "$bad" ] && ok "no caller URL accepted in the served validate path" || { fl "$VALIDATE must not accept a caller URL:"; printf '%s\n' "$bad" | sed 's/^/      /'; }
else
  fl "$VALIDATE not found"
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-no-arbitrary-url-check: FAIL"; exit 1; fi
echo "banzai-no-arbitrary-url-check: ✓ no user-supplied URL; registry-resolved origin+path only (ADR-034 §4.7)"
