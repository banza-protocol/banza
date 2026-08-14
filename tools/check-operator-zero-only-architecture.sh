#!/usr/bin/env bash
# operator-zero-only-architecture-check (ADR-041, M2.14B).
#
# The repo-wide enforcement of the Operator Zero Only demo/example policy: every PUBLIC example, demo,
# sample, tutorial, walkthrough or demonstrative fixture derives from Operador Zero; there is no parallel
# fictional example operator on any public/product/docs surface. Internal engine test fixtures and
# abstract structural placeholders (<...> or the RFC-2606 `operator.example` domain) are allowed and are
# NOT scanned as public examples.
#
# Public surfaces (strict): website/ (minus vendored wasm + generated), docs/reference/, docs/guides/,
# contracts/openapi/, README.md, services/banzai-api KB. Excluded (internal/archival): engine src+tests
# (#[cfg(test)]/tests/), decisions/adr + website/content/decisions (archival ADR bodies), docs/reports/,
# docs/governance phase records, and the RFC-2606 operator.example placeholder.

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }

echo "== operator-zero-only-architecture-check (M2.14B / ADR-041) =="

# 1. The architectural decision exists.
ADR="decisions/adr/ADR-041-operator-zero-the-read-only-reference-implementation.md"
[ -f "$ADR" ] && grep -q "sole canonical demo operator" "$ADR" && ok "ADR-041 present and states the policy" || bad "ADR-041 missing or does not state the policy"

# 2. examples/operators/ contains ONLY zero (no parallel sample/demo/test/candidate/l0 operator).
EXTRA=$(ls examples/operators 2>/dev/null | grep -vE "^zero$" || true)
[ -z "$EXTRA" ] && ok "examples/operators/ has only 'zero'" || bad "parallel example operator dir(s): $EXTRA"
for forbidden in examples/operators/sample examples/operators/demo examples/operators/test examples/operators/candidate examples/operators/l0 examples/manifest-valid; do
  [ -e "$forbidden" ] && bad "forbidden example dir exists: $forbidden" || true
done

# 3. The forbidden UI/example labels appear NOWHERE on public/product surfaces.
PUB_GLOBS=(website/components website/app website/lib website/content/BANZA_REFERENCIA.md docs/reference docs/guides README.md services/banzai-api/src)
LABELHIT=$(grep -rInE "Manifesto válido \(L0\)|Carregar exemplo válido" "${PUB_GLOBS[@]}" 2>/dev/null | grep -vE "/wasm/|generated|\.test\.(ts|js)" || true)
[ -z "$LABELHIT" ] && ok "no 'Manifesto válido (L0)' / 'Carregar exemplo válido' on public surfaces" || { bad "forbidden example label on a public surface:"; echo "$LABELHIT" | head -3; }

# 4. No forbidden FILLED fictional identity on public surfaces (internal engine tests + archival ADRs +
#    reports excluded; RFC-2606 operator.example placeholder is allowed, see ADR-041).
IDHIT=$(grep -rInE "sandbox\.example\.test|ops@example\.test|sample-operator|operator-candidate|operator-demo\b" \
  website/components website/app website/lib website/content/BANZA_REFERENCIA.md docs/reference docs/guides contracts/openapi README.md services/banzai-api/src 2>/dev/null \
  | grep -vE "/wasm/|generated|\.test\.(ts|js)" || true)
[ -z "$IDHIT" ] && ok "no fictional non-zero identity (sandbox.example.test/ops@example.test/sample-operator/operator-candidate) on public surfaces" || { bad "fictional non-zero identity on a public surface:"; echo "$IDHIT" | head -5; }

# 5. The single-official-example marker is present in the product.
grep -q "único exemplo oficial de operador demo no BanzAI" website/lib/operadorZeroJourney.ts && ok "single-official-example policy string present" || bad "single-official-example string missing"

# 6. The manifest demo fixtures are Operador-Zero-derived (served via the vendored web WASM).
MW="website/lib/wasm/banza_operator_manifest_bg.wasm"
if [ -f "$MW" ]; then
  grep -aq "operator-zero" "$MW" && ok "manifest demo fixtures carry operator-zero (vendored WASM)" || bad "manifest WASM missing operator-zero — rebuild"
  if grep -aqE "operator-candidate|sandbox\.example\.test|Manifesto válido \(L0\)" "$MW"; then bad "manifest WASM still carries a non-zero fictional identity/label — rebuild"; else ok "manifest WASM carries no non-zero fictional identity/label"; fi
else
  bad "missing vendored manifest WASM"
fi

# 7. The retired apex /operador-zero is not reintroduced.
[ -d website/app/operador-zero ] && bad "the retired apex /operador-zero route was reintroduced" || ok "no apex /operador-zero route directory"

# 8. The action boundary still exists (policy must not weaken safety).
grep -q "fn action_boundary" engines/banzai-query-core/src/route.rs && ok "action boundary present (safety intact)" || bad "action boundary function missing"

# Self-test — the label detector fires.
TMP="$(mktemp)"; printf 'Manifesto válido (L0)\n' > "$TMP"
grep -qE "Manifesto válido \(L0\)" "$TMP" || { echo "  SELFTEST_FAIL label detector"; fail=1; }
rm -f "$TMP"

if [ "$fail" -ne 0 ]; then echo "OPERATOR ZERO ONLY ARCHITECTURE CHECK FAILED ✗"; exit 1; fi
echo "OPERATOR ZERO ONLY ARCHITECTURE CHECK PASSED ✅"
