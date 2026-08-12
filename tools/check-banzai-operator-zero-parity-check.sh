#!/usr/bin/env bash
#
# M2.19G.1 (ADR-068 §4.9) — Operador Zero parity guard (§37, invariant 17).
#
# Operador Zero is validated through the SAME path as any future implementation: it has an operator
# record AND an implementation record in the registry; its canonical origin is zero.banza.network; it is
# resolved and fetched and decided by the SAME Rust registry + fetcher + decision engines — no OZ-only
# engine, endpoint set, or code path.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

REG=engines/banza-target-registry/src/registry.rs
VALIDATE=services/banzai-api/src/validate.js
UILIB=website/lib/banzaiValidation.ts

echo "== banzai-operator-zero-parity-check (M2.19G.1 / ADR-068 §4.9) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'https://zero.banza.network' | grep -q 'zero.banza.network' || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

# 1. OZ has BOTH an operator record and an implementation record at the canonical origin.
if [ -f "$REG" ]; then
  grep -qE 'OperatorRecord \{' "$REG"       && ok "OZ operator record present"       || fl "$REG must build an OperatorRecord for OZ"
  grep -qE 'ImplementationRecord \{' "$REG" && ok "OZ implementation record present" || fl "$REG must build an ImplementationRecord for OZ"
  grep -qE 'zero\.banza\.network' "$REG"    && ok "OZ canonical origin zero.banza.network" || fl "$REG must use zero.banza.network as OZ origin"
  grep -qE 'Endpoints::reference\(\)' "$REG" && ok "OZ uses the shared reference endpoint set" || fl "$REG OZ must use Endpoints::reference()"
else
  fl "$REG not found"
fi

# 2. The served path resolves + runs OZ through the SAME generic engines (no OZ-only branch).
if [ -f "$VALIDATE" ]; then
  grep -qE 'registry_resolve_json' "$VALIDATE" && ok "OZ resolved via the generic registry resolver" || fl "$VALIDATE must resolve targets via registry_resolve_json"
  grep -qE 'runTechnicalStep' "$VALIDATE"      && ok "OZ runs the generic runTechnicalStep path" || fl "$VALIDATE must run the generic technical step path"
  bad=$(grep -nE 'operator-zero|operator_zero' "$VALIDATE" | grep -viE '^[[:space:]]*//' || true)
  [ -z "$bad" ] && ok "no OZ literal in the served validate path (fully generic)" || { fl "$VALIDATE must not special-case operator-zero:"; printf '%s\n' "$bad" | sed 's/^/      /'; }
else
  fl "$VALIDATE not found"
fi

# 3. The UI registry lists OZ as an operator + one published implementation at the same origin.
if [ -f "$UILIB" ]; then
  # M2.19G.3B — the UI no longer hardcodes the implementation record; the canonical source is the Rust
  # registry ($REG). The UI keeps the OZ CANONICAL ORIGIN via the closed deep-link target (VALIDATION_TARGETS).
  grep -qE 'operator-zero-ref-impl' "$REG" && ok "the closed Rust registry lists the OZ implementation record" || fl "$REG must list operator-zero-ref-impl"
  grep -qE 'artifacts_base: "https://zero.banza.network"' "$UILIB" && ok "UI deep-link target keeps the OZ canonical origin" || fl "$UILIB OZ deep-link origin must be https://zero.banza.network"
else
  fl "$UILIB not found"
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-operator-zero-parity-check: FAIL"; exit 1; fi
echo "banzai-operator-zero-parity-check: ✓ OZ uses the same registry/endpoint/engine path (ADR-068 §4.9)"
