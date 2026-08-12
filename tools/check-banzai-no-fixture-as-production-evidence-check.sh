#!/usr/bin/env bash
#
# M2.19G.1 (ADR-068 core rule / §4.5) — no fixture as production evidence guard (§37, invariant 20).
#
# No example / vendored fixture may flow into the official Evidence Bundle or a VERIFIED verdict on the
# SERVED path. The served validate path + the official UI flow import NOTHING from examples/ or the
# vendored operadorZeroArtifacts; the evidence step validates the FETCHED bundle, not a bundled file.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

VALIDATE=services/banzai-api/src/validate.js
MODE=website/components/banzai/BanzaiValidationMode.tsx
JOURNEY=website/components/banzai/validationJourney.tsx
CLIENT=website/lib/banzaiValidateClient.ts

# Fixture / vendored-artifact import smells that must not appear in the official path.
FIX='examples/|operadorZeroArtifacts|operadorZero\b|\.generated|/fixtures?/|import[^;]*fixture'

echo "== banzai-no-fixture-as-production-evidence-check (M2.19G.1 / ADR-068 §4.5) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'import x from "@/lib/operadorZeroArtifacts.generated";' | grep -qE "$FIX" || { echo "SELF-TEST BROKEN: fixture detector did not fire" >&2; st=1; }
printf '%s\n' 'const b = JSON.parse(resp.body);' | grep -qE "$FIX" && { echo "SELF-TEST BROKEN: fixture detector over-fired" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

for f in "$VALIDATE" "$MODE" "$JOURNEY" "$CLIENT"; do
  if [ ! -f "$f" ]; then fl "$f not found"; continue; fi
  hits=$(grep -nE "$FIX" "$f" | grep -vE '^[0-9]+:[[:space:]]*//|^[0-9]+:[[:space:]]*\*' || true)
  if [ -z "$hits" ]; then
    ok "$f — no example/vendored-fixture import in the official path"
  else
    fl "$f — a fixture/example flows into the official path:"; printf '%s\n' "$hits" | sed 's/^/      /'
  fi
done

# The evidence step validates the FETCHED bundle (rawBodies.evidence_bundle), not a bundled file.
if [ -f "$VALIDATE" ]; then
  grep -qE 'rawBodies\.evidence_bundle' "$VALIDATE" \
    && ok "evidence step validates the fetched bundle (rawBodies.evidence_bundle)" \
    || fl "$VALIDATE evidence step must validate the fetched bundle, not a fixture"
  # A VERIFIED verdict is only ever the engine/registry status, never derived from a fixture.
  grep -qE 'verdict\.status' "$VALIDATE" && ok "VERIFIED/BLOCKED come from the Rust verdict, not a fixture" || fl "$VALIDATE verdict must come from the Rust engine"
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-no-fixture-as-production-evidence-check: FAIL"; exit 1; fi
echo "banzai-no-fixture-as-production-evidence-check: ✓ no fixture flows into official evidence/VERIFIED (ADR-068 §4.5)"
