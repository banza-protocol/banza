#!/usr/bin/env bash
# operator-zero-only-docs-examples-check (ADR-035, M2.14B) — Part 18.
#
# Public documentation, getting-started guides, the OpenAPI contracts and public JSON schemas must not
# present a FILLED fictional example operator (a made-up name/domain/email standing in for "an operator").
# Every worked demo identity is Operador Zero. Two things stay allowed and are NOT flagged:
#   - abstract structural placeholders: <operator-id>, <your-domain>, ${...}, and the RFC-2606
#     reserved `operator.example` domain used as a neutral schema/OpenAPI default;
#   - archival ADR bodies (decisions/adr, website/content/decisions) and milestone reports (docs/reports).
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"
FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok()   { echo "  ok: $*"; }

echo "== operator-zero-only-docs-examples-check (M2.14B / ADR-035) =="

# Scanned public doc/spec surfaces.
SCAN=(docs/reference docs/guides docs/getting-started contracts/openapi contracts/schemas README.md)
EXIST=()
for p in "${SCAN[@]}"; do [ -e "$p" ] && EXIST+=("$p"); done

# Forbidden FILLED fictional identities (operator.example is intentionally NOT here — it is allowed).
FORBIDDEN='sandbox\.example\.test|ops@example\.test|admin@example\.test|sample-operator|operator-candidate|operator-demo\b|acme-pay|fictional-operator'

if [ "${#EXIST[@]}" -gt 0 ]; then
  HIT=$(grep -rInE "$FORBIDDEN" "${EXIST[@]}" 2>/dev/null || true)
  [ -z "$HIT" ] && ok "no filled fictional example operator in public docs/specs/OpenAPI/schemas" \
    || { fail "filled fictional example operator on a public doc/spec surface:"; echo "$HIT" | head -8; }
else
  ok "no public doc/spec surfaces present to scan"
fi

# The reference documentation names Operador Zero as the demo/example.
REF=docs/reference/pt/BANZA_REFERENCIA.md
if [ -f "$REF" ]; then
  grep -qi "Operador Zero" "$REF" && ok "reference doc names Operador Zero" \
    || fail "$REF should name Operador Zero as the demo example"
fi

# Sanity: the allowed placeholders are genuinely present somewhere (policy is 'convert', not 'ban all').
if [ -e contracts/openapi ]; then
  grep -rqE "operator\.example|<[a-z-]+>|\{[a-z_]+\}" contracts/openapi 2>/dev/null \
    && ok "abstract placeholders (operator.example / <...>) still used in OpenAPI (allowed)" \
    || ok "no placeholders needed in OpenAPI"
fi

# Self-test — the forbidden detector fires and the allowed placeholder does not.
printf 'contact: ops@example.test\n'      | grep -qE "$FORBIDDEN" || { echo "  SELFTEST_FAIL forbidden"; FAILED=1; }
printf 'default: api.operator.example\n'  | grep -qE "$FORBIDDEN" && { echo "  SELFTEST_FAIL operator.example wrongly flagged"; FAILED=1; } || true

echo
if [ "$FAILED" -eq 0 ]; then echo "OPERATOR-ZERO-ONLY DOCS/EXAMPLES CHECK PASSED ✅"; else echo "OPERATOR-ZERO-ONLY DOCS/EXAMPLES CHECK FAILED ✗"; fi
exit "$FAILED"
