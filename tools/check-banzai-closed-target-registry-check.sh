#!/usr/bin/env bash
#
# M2.19G.1 (ADR-038 §4.6/§4.9/§14) — closed target registry guard (§37, invariant 6).
#
# Validation targets come from a CLOSED registry, never from a caller. The Rust production registry
# (banza-target-registry production_registry()) is seeded with exactly ONE operator (operator-zero) and
# ONE implementation (operator-zero-ref-impl) — no fictional operators. The UI OPERATOR_REGISTRY mirrors
# it: only operator-zero is present.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

REG=engines/banza-target-registry/src/registry.rs
UILIB=website/lib/banzaiValidation.ts

# Fictional / placeholder operator identifiers that must never seed a registry.
FICTIONAL='operator-a|operator-b|operator-c|sample-operator|acme|example-operator|foo-operator|test-operator|demo-bank|fake-'

echo "== banzai-closed-target-registry-check (M2.19G.1 / ADR-038 §4.6/§4.9) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'operator_id: "operator-a"' | grep -qE "$FICTIONAL" || { echo "SELF-TEST BROKEN: fictional detector did not fire" >&2; st=1; }
printf '%s\n' 'operator_id: "operator-zero"' | grep -qE "$FICTIONAL" && { echo "SELF-TEST BROKEN: fictional detector over-fired on operator-zero" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

# 1. The Rust production registry is closed + operator-zero only.
if [ -f "$REG" ]; then
  grep -qE 'fn production_registry' "$REG" && ok "production_registry() defines the closed set" || fl "$REG must define production_registry()"
  # Extract the production_registry() body and inspect the operator_ids it seeds.
  body=$(awk '/fn production_registry/{c=1} c{print} c&&/^}/{exit}' "$REG")
  ops=$(printf '%s\n' "$body" | grep -oE 'operator_id: "[^"]+"' | sed -E 's/operator_id: "([^"]+)"/\1/' | sort -u || true)
  if [ "$(printf '%s\n' "$ops" | grep -c . )" = "1" ] && printf '%s\n' "$ops" | grep -qx 'operator-zero'; then
    ok "production_registry seeds exactly one operator: operator-zero"
  else
    fl "production_registry must seed exactly one operator (operator-zero); found: $(printf '%s ' $ops)"
  fi
  printf '%s\n' "$body" | grep -qE '"operator-zero-ref-impl"' && ok "seeds the operator-zero-ref-impl implementation" || fl "production_registry must seed operator-zero-ref-impl"
  bad=$(printf '%s\n' "$body" | grep -niE "$FICTIONAL" || true)
  [ -z "$bad" ] && ok "no fictional operators in the Rust registry" || { fl "fictional operator in the Rust registry:"; printf '%s\n' "$bad" | sed 's/^/      /'; }
else
  fl "$REG not found"
fi

# 2. M2.19G.3B — the UI no longer MIRRORS the registry as a hardcoded const; it BUILDS the target list at
# runtime from the canonical Rust catalogue (mapCatalogueToOperators over GET /banzai/validate/registry).
# Closedness + the single-operator invariant are asserted on the Rust source above; here we assert the UI
# holds no hardcoded operator registry const and introduces no fictional operator.
if [ -f "$UILIB" ]; then
  grep -qE 'mapCatalogueToOperators' "$UILIB" && ok "UI builds the target list from the canonical catalogue (mapCatalogueToOperators)" || fl "$UILIB must build the list via mapCatalogueToOperators"
  if grep -qE '^export const (OPERATOR_REGISTRY|OPERATOR_LIST)\b' "$UILIB"; then
    fl "$UILIB must NOT hardcode an operator registry const (the list is fetched from the closed Rust registry)"
  else
    ok "UI has no hardcoded operator registry const — the list is fetched from the closed Rust registry"
  fi
  bad=$(grep -niE "$FICTIONAL" "$UILIB" || true)
  [ -z "$bad" ] && ok "no fictional operators in the UI registry" || { fl "fictional operator in the UI registry:"; printf '%s\n' "$bad" | sed 's/^/      /'; }
else
  fl "$UILIB not found"
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-closed-target-registry-check: FAIL"; exit 1; fi
echo "banzai-closed-target-registry-check: ✓ closed registry, operator-zero only, no fictional operators (ADR-038 §4.6/§4.9)"
