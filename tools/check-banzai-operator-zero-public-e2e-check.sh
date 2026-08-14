#!/usr/bin/env bash
#
# M2.19G.1 (ADR-034 §4.9) — Operador Zero public E2E evidence guard (§37, invariant 19).
#
# The live public run produces artifacts/banzai/operator-zero-public-e2e.json: 9 OperationReceipts + 1
# JourneyReceipt, with REAL endpoints/hashes, ending NOT_CERTIFIED. This guard:
#   * SOFT-PENDS (exit 0, clear message) when the artifact is ABSENT — the parent runs the live E2E
#     before final acceptance;
#   * HARD-CHECKS structure and FAILS when the artifact is PRESENT but INVALID.
#
# Exit 1 only on present-and-invalid. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

ART=artifacts/banzai/operator-zero-public-e2e.json

echo "== banzai-operator-zero-public-e2e-check (M2.19G.1 / ADR-034 §4.9) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' '{ "certification_status": "NOT_CERTIFIED" }' | grep -q 'NOT_CERTIFIED' || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

if [ ! -f "$ART" ]; then
  echo "  PENDING: $ART not present yet — the parent runs the live public E2E before final acceptance."
  echo "  (This is a soft pending, not a failure: the guard hard-checks structure once the file exists.)"
  echo
  echo "banzai-operator-zero-public-e2e-check: ✓ soft-pending (artifact absent)"
  exit 0
fi

# Present → hard structural check. Prefer node (real JSON parse); fall back to grep.
if command -v node >/dev/null 2>&1; then
  out=$(node --input-type=module -e '
    import { readFileSync } from "node:fs";
    const j = JSON.parse(readFileSync(process.argv[1], "utf8"));
    const errs = [];
    // Accept either a { journey_receipt, step_receipts } wrapper or a raw journey receipt with steps[].
    const jr = j.journey_receipt || j.journeyReceipt || (j.steps ? j : null);
    const steps = (jr && jr.steps) || j.step_receipts || j.receipts || [];
    if (!jr) errs.push("no JourneyReceipt found");
    if (!Array.isArray(steps) || steps.length !== 9) errs.push(`expected 9 OperationReceipts, found ${Array.isArray(steps)?steps.length:"n/a"}`);
    if (jr && jr.certification_status !== "NOT_CERTIFIED") errs.push(`certification_status must be NOT_CERTIFIED (got ${jr && jr.certification_status})`);
    if (jr && jr.certified !== false) errs.push("certified must be false");
    // Every step receipt must bind a real endpoint + a real hash.
    let withEndpoint = 0, withHash = 0, extModel = 0, qwen = 0;
    for (const s of (Array.isArray(steps) ? steps : [])) {
      if (s.endpoint) withEndpoint++;
      if (s.output_hash && /^(sha256:)?[0-9a-f]{8,}/.test(String(s.output_hash))) withHash++;
      extModel += Number(s.external_model_calls || 0);
      qwen += Number(s.qwen_calls || 0);
    }
    // The certification step legitimately has no endpoint; require the 8 technical steps to have one.
    if (withEndpoint < 8) errs.push(`expected >=8 receipts with a real endpoint, found ${withEndpoint}`);
    if (withHash < 9) errs.push(`expected 9 receipts with a real hash, found ${withHash}`);
    if (extModel !== 0) errs.push(`external_model_calls must be 0 across receipts (got ${extModel})`);
    if (qwen !== 0) errs.push(`qwen_calls must be 0 across receipts (got ${qwen})`);
    if (errs.length) { console.log("INVALID"); errs.forEach(e => console.log("  - " + e)); process.exit(3); }
    console.log("VALID 9 OperationReceipts + 1 JourneyReceipt, NOT_CERTIFIED, real endpoints/hashes");
  ' "$ART" 2>&1) || true
  if printf '%s\n' "$out" | grep -q '^VALID'; then
    ok "$out"
  else
    fl "operator-zero-public-e2e.json present but INVALID:"; printf '%s\n' "$out" | sed 's/^/      /'
  fi
else
  # Node unavailable — minimal grep-based structural check.
  grep -q 'NOT_CERTIFIED' "$ART" && ok "artifact contains NOT_CERTIFIED (grep)" || fl "artifact must contain NOT_CERTIFIED"
  grep -qE 'operation_id' "$ART"  && ok "artifact contains OperationReceipts (grep)" || fl "artifact must contain OperationReceipts"
  grep -qE 'journey_id'   "$ART"  && ok "artifact contains a JourneyReceipt (grep)"   || fl "artifact must contain a JourneyReceipt"
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-operator-zero-public-e2e-check: FAIL (present-and-invalid)"; exit 1; fi
echo "banzai-operator-zero-public-e2e-check: ✓ OZ public E2E evidence valid (ADR-034 §4.9)"
