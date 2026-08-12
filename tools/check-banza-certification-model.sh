#!/usr/bin/env bash
#
# banza-certification-model-check (M2.19D / ADR-064/065/066).
# Asserts the Layer-2 conformance & interoperability certification model is present, bound and honest:
#  - the three ADRs + the canonical governance doc exist;
#  - the certification-record contract binds a certificate to an IMPLEMENTATION (implementation_hash) and
#    requires profile/scope/environment/validity/evidence + interoperability report;
#  - the closed certification-state machine is exactly the ADR-066 enum (fail-closed; REVOKED terminal);
#  - the Rust engine is the sole authority (no Qwen / no external model / no FAIL->PASS override);
#  - certification is never presented as a licence / scheme admission / regulatory authorisation;
#  - the Technical Registry is distinct from a scheme participant directory;
#  - the legacy /certificates route is NOT reintroduced.
# Exit 1 on any NEEDS_FIX; exit 2 on a broken self-test.

set -euo pipefail
cd "$(dirname "$0")/.."
fail=0
need() { [ -f "$1" ] || { echo "NEEDS_FIX missing: $1"; fail=1; }; }
has() { grep -q "$2" "$1" 2>/dev/null || { echo "NEEDS_FIX $1 must contain /$2/"; fail=1; }; }

echo "== banza-certification-model-check (M2.19D) =="

# 1. canonical decisions + governance doc
for f in \
  decisions/adr/ADR-064-conformance-interoperability-certification.md \
  decisions/adr/ADR-065-banza-technical-registry.md \
  decisions/adr/ADR-066-certification-state-machine.md \
  docs/governance/BANZA_CONFORMANCE_INTEROP_CERTIFICATION.md; do need "$f"; done

# 2. contracts present + implementation-bound + required fields
REC=contracts/production/certification-record.production.schema.json
for f in "$REC" \
  contracts/production/certification-profile.production.schema.json \
  contracts/production/certified-implementation.production.schema.json \
  contracts/production/interoperability-report.production.schema.json; do need "$f"; done
if [ -f "$REC" ]; then
  for k in implementation_hash profile_id scope_levels environment expires_at conformance_report_hash interoperability_report_hash record_hash; do
    grep -q "\"$k\"" "$REC" || { echo "NEEDS_FIX $REC missing required field: $k"; fail=1; }
  done
fi

# 3. closed state machine — exactly the ADR-066 enum, in the Rust engine
ENG=engines/banza-certification/src/lib.rs
need "$ENG"
if [ -f "$ENG" ]; then
  for st in NotCertified Certified Expired Suspended Revoked Superseded; do
    grep -q "$st" "$ENG" || { echo "NEEDS_FIX $ENG missing state: $st"; fail=1; }
  done
  # fail-closed + Rust-sole-authority markers
  has "$ENG" "fail-closed"
  grep -qiE 'no Qwen|no external model|no human FAIL' "$ENG" || { echo "NEEDS_FIX $ENG must state the no-Qwen/no-FAIL->PASS authority boundary"; fail=1; }
fi

# 4. certification != licence / admission / authorisation (governance doc)
DOC=docs/governance/BANZA_CONFORMANCE_INTEROP_CERTIFICATION.md
if [ -f "$DOC" ]; then
  grep -qiE 'não constitui licença|nao constitui licenca' "$DOC" || { echo "NEEDS_FIX $DOC must state certification is not a licence/authorisation"; fail=1; }
  grep -qiE 'independent of|independente do' "$DOC" || { echo "NEEDS_FIX $DOC must state registry != scheme directory"; fail=1; }
fi

# 5. the NEW L2 surfaces must use the /interoperability-certifications route family, never reintroduce
#    the legacy /certificates route (the pre-existing 404/compat route elsewhere is out of scope here).
OAPI=contracts/openapi/interoperability-certification.yaml
need "$OAPI"
L2_SURFACES="contracts/production/certification-record.production.schema.json contracts/production/certification-profile.production.schema.json contracts/production/certified-implementation.production.schema.json contracts/production/interoperability-report.production.schema.json engines/banza-certification/src/lib.rs engines/banza-certification/src/bin/cli.rs docs/governance/BANZA_CONFORMANCE_INTEROP_CERTIFICATION.md $OAPI"
if grep -rnE '/certificates([^-a-z]|$)' $L2_SURFACES 2>/dev/null | grep -vE 'reintroduc|reintroduz' | grep -q .; then
  echo "NEEDS_FIX legacy /certificates route reintroduced in an L2 surface:"; grep -rnE '/certificates([^-a-z]|$)' $L2_SURFACES 2>/dev/null | grep -vE 'reintroduc|reintroduz' | sed 's/^/    /'; fail=1
fi

# 5b. the public verification + registry route family must be declared in the OpenAPI surface
if [ -f "$OAPI" ]; then
  for route in '/interoperability-certifications' '/interoperability-certifications/{record_id}/verify' '/technical-registry'; do
    grep -q "$route" "$OAPI" || { echo "NEEDS_FIX $OAPI missing L2 public route: $route"; fail=1; }
  done
fi

# 6. self-test: the record schema self-evidently binds to an implementation hash
grep -q 'implementation_hash' "$REC" || { echo "SELFTEST_FAIL record schema lost implementation binding"; exit 2; }

if [ "$fail" -eq 0 ]; then
  echo "banza-certification-model-check: ✓ L2 certification model present, implementation-bound, fail-closed, Rust-decided; not a licence/admission/authorisation; registry ≠ scheme directory; no /certificates."
fi
exit "$fail"
