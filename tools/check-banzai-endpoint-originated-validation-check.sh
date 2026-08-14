#!/usr/bin/env bash
#
# M2.19G.1 (ADR-034 core rule / §4.4) — endpoint-originated validation guard (§37, invariant 3).
#
# The official journey calls POST /banzai/validate/step | /journey (browser sends only closed ids), and
# the served banzai-api validate path fetches EACH artifact via the secure Rust fetcher (fetcherClient
# -> banza-fetcher). No readArtifact / readFileSync / bundled fixture ever becomes a verdict input in
# services/banzai-api/src/validate.js — inputs are the FETCHED bodies only.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

CLIENT=website/lib/banzaiValidateClient.ts
SESSION=website/components/banzai/validationJourney.tsx
SERVER=services/banzai-api/src/server.js
VALIDATE=services/banzai-api/src/validate.js

echo "== banzai-endpoint-originated-validation-check (M2.19G.1 / ADR-034 core rule) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'const s = readFileSync("examples/x.json")' | grep -qE 'readFileSync|readArtifact' || { echo "SELF-TEST BROKEN: fixture detector did not fire" >&2; st=1; }
printf '%s\n' 'const s = JSON.parse(resp.body)' | grep -qE 'readFileSync|readArtifact' && { echo "SELF-TEST BROKEN: fixture detector over-fired" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

# 1. The browser client targets the two same-origin endpoints.
if [ -f "$CLIENT" ]; then
  grep -qE '"/banzai/validate/step"'    "$CLIENT" && ok "client posts /banzai/validate/step"    || fl "$CLIENT must post to /banzai/validate/step"
  grep -qE '"/banzai/validate/journey"' "$CLIENT" && ok "client posts /banzai/validate/journey" || fl "$CLIENT must post to /banzai/validate/journey"
else
  fl "$CLIENT not found"
fi

# 2. The journey UI drives the journey via those requests (endpoint-originated, not local).
if [ -f "$SESSION" ]; then
  grep -qE 'validateStepRequest|validateJourneyRequest' "$SESSION" \
    && ok "journey session calls the endpoint-originated client" \
    || fl "$SESSION must call validateStepRequest/validateJourneyRequest"
else
  fl "$SESSION not found"
fi

# 3. The server exposes the two POST routes.
if [ -f "$SERVER" ]; then
  grep -qE '/validate/step'    "$SERVER" && ok "server routes /validate/step"    || fl "$SERVER must route /validate/step"
  grep -qE '/validate/journey' "$SERVER" && ok "server routes /validate/journey" || fl "$SERVER must route /validate/journey"
else
  fl "$SERVER not found"
fi

# 4. The served validate path fetches via the Rust fetcher client.
if [ -f "$VALIDATE" ]; then
  grep -qE 'createFetcherClient|from "\./fetcherClient' "$VALIDATE" \
    && ok "validate.js wires the secure Rust fetcher (fetcherClient)" \
    || fl "$VALIDATE must fetch via fetcherClient (banza-fetcher)"
  grep -qE 'fetcher\.fetchArtifact' "$VALIDATE" \
    && ok "validate.js fetches each artifact (fetcher.fetchArtifact)" \
    || fl "$VALIDATE must call fetcher.fetchArtifact for each endpoint"
  # 5. No fixture / example / local file becomes a verdict input in the served path. Comment lines that
  #    NEGATE this (e.g. "No … local fixture … EVER enters") are allowed; real code tokens are not.
  bad=$(grep -nE 'readFileSync|readArtifact|require\([^)]*examples|import[^;]*examples/|fs\.read' "$VALIDATE" \
        | grep -viE '^[[:space:]]*//|No pasted content|No fixture' || true)
  if [ -z "$bad" ]; then
    ok "no readArtifact/readFileSync/fixture as verdict input in validate.js"
  else
    fl "validate.js must not read a fixture/local file as a verdict input:"; printf '%s\n' "$bad" | sed 's/^/      /'
  fi
else
  fl "$VALIDATE not found"
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-endpoint-originated-validation-check: FAIL"; exit 1; fi
echo "banzai-endpoint-originated-validation-check: ✓ official journey is endpoint-originated (ADR-034 core rule)"
