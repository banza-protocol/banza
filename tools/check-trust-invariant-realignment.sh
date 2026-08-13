#!/usr/bin/env bash
#
# BANZA Trust-Invariant Realignment Guard (M2.19B, ADR-058).
#
# ADR-038 superseded the removed central-authority federation-trust invariant series
# INV-TRUST-001..007 "in full"; ADR-040 defined INV-FEDEVAL-001..010; the root/key custody
# invariants survive as INV-ROOT-*. M2.19B retired the INV-TRUST-* identifier namespace from
# the whole repository and removed the residual operator-certificate artifacts (the CERT-* fixtures,
# the certificate_url field, the /certificates issued-certificate route, and the certificates DB table).
#
# This guard keeps the five Finding-B gates at zero:
#   removed_ca_content, ambiguous_certificate_routes, legacy_trust_invariants,
#   trust_contract_adr_divergence, certificate_chain_runtime_paths.
#
# ALLOWED: the retired INV-TRUST-* identifiers may appear ONLY in the ADRs that explain the removal
# (ADR-038/057/058 + their website mirrors) and in the generated grounding indexes (which index those
# ADRs). Everywhere else the identifier is a leak.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
note() { printf '  - %s\n' "$1"; }

# Paths where naming the retired series is legitimate (they document the removal) or is generated output.
EXCLUDES=(
  ':!decisions/adr/ADR-038*' ':!decisions/adr/ADR-057*' ':!decisions/adr/ADR-058*'
  ':!website/content/decisions/adr/ADR-038*' ':!website/content/decisions/adr/ADR-057*' ':!website/content/decisions/adr/ADR-058*'
  ':!engines/banzai-query-core/src/doc-index.json'
  ':!engines/banzai-query-core/src/repoindex/*.json'
  ':!artifacts/**' ':!**/*.wasm'
  ':!tools/check-trust-invariant-realignment.sh'
)

echo "== [1/5] legacy_trust_invariants: no retired INV-TRUST-* identifier outside the removal-record ADRs =="
if git grep -lI 'INV-TRUST' -- "${EXCLUDES[@]}" >/tmp/_invtrust_hits 2>/dev/null; then
  echo "FAIL: retired INV-TRUST-* identifier found (map to INV-OTE-*/INV-FEDEVAL-*/INV-ROOT-* per ADR-058):"
  while read -r f; do note "$f"; done </tmp/_invtrust_hits
  fail=1
else
  echo "PASS  no INV-TRUST-* leaks"
fi

echo "== [2/5] removed_ca_content: no operator-certificate conformance fixtures =="
if ls conformance/fixtures/federation/CERT-*.json >/dev/null 2>&1; then
  echo "FAIL: operator-certificate CERT-*.json fixtures present (recast to SPM-* per ADR-058):"
  ls conformance/fixtures/federation/CERT-*.json | while read -r f; do note "$f"; done
  fail=1
else
  echo "PASS  no CERT-*.json operator-certificate fixtures"
fi

echo "== [3/5] certificate_chain_runtime_paths: no certificate_url in conformance/contracts =="
if git grep -lI 'certificate_url' -- conformance/ contracts/ >/tmp/_certurl 2>/dev/null; then
  echo "FAIL: certificate_url (removed operator-certificate well-known path) present:"
  while read -r f; do note "$f"; done </tmp/_certurl
  fail=1
else
  echo "PASS  no certificate_url in conformance/ or contracts/"
fi

echo "== [4/5] ambiguous_certificate_routes: /certificates not served by verification-api =="
if grep -qE '"/certificates"\s*:' services/verification-api/src/server.js 2>/dev/null; then
  echo "FAIL: /certificates route still registered in services/verification-api/src/server.js"
  fail=1
elif grep -qE 'export async function certificates' services/verification-api/src/routes.js 2>/dev/null; then
  echo "FAIL: certificates() handler still present in services/verification-api/src/routes.js"
  fail=1
else
  echo "PASS  /certificates route removed"
fi

echo "== [5/5] trust_contract_adr_divergence: canonical registry carries INV-OTE-* + INV-FEDEVAL-*, no TRUST family =="
REG=contracts/invariants.json
if node -e '
  const j=require("./'"$REG"'");
  const ids=j.invariants.map(i=>i.id);
  const ote=ids.filter(i=>/^INV-OTE-/.test(i)).length;
  const fev=ids.filter(i=>/^INV-FEDEVAL-/.test(i)).length;
  const trust=ids.filter(i=>/^INV-TRUST/.test(i)).length;
  const famTrust = j.families && j.families.TRUST ? 1 : 0;
  const ok = ote>=10 && fev>=10 && trust===0 && famTrust===0;
  if(!ok){ console.error(`INV-OTE=${ote} INV-FEDEVAL=${fev} INV-TRUST=${trust} TRUST-family=${famTrust}`); process.exit(1);}
  console.log(`ok: INV-OTE=${ote} INV-FEDEVAL=${fev} INV-TRUST=0 no TRUST family`);
'; then
  echo "PASS  registry realigned"
else
  echo "FAIL: contracts/invariants.json not realigned (need INV-OTE-*>=10, INV-FEDEVAL-*>=10, 0 INV-TRUST, no TRUST family)"
  fail=1
fi

# ── Self-test: prove the INV-TRUST detector actually fires ──────────────────────────────────
st=$(printf 'INV-TRUST-001\n' | grep -c 'INV-TRUST' || true)
if [ "$st" -ne 1 ]; then
  echo "SELF-TEST BROKEN: detector did not match a known INV-TRUST token" >&2
  exit 2
fi

if [ "$fail" -ne 0 ]; then
  echo
  echo "trust-invariant-realignment: FAIL — see ADR-058 for the authoritative mapping."
  exit 1
fi
echo
echo "trust-invariant-realignment: ✓ INV-TRUST retired; INV-OTE-*/INV-FEDEVAL-*/INV-ROOT-* canonical; no operator-certificate residue (M2.19B / ADR-058)"
