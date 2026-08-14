#!/usr/bin/env bash
#
# BANZA Real-Money Activation Guard (M2.19C, ADR-007 — RealMoneyActivationGate).
#
# While no applicable formal evidence exists, every real-money capability is fail-closed. This guard pins
# that baseline in the machine-verifiable L3 regulatory-state artifact and forbids any code path that would
# flip real money ON outside the Rust-decided gate:
#   - contracts/production/regulatory-state.production.schema.json asserts, as `const false`:
#       real_money_enabled · real_wallets_enabled · real_settlement_enabled ·
#       real_participants_active · bna_approval_claimed
#     and the boundary consts (not_authorised_yet/no_bna_claim_without_evidence/real_money_fail_closed =
#     true; authorisation_granted/banzami_presented_as_authorised/replaces_regulator/replaces_scheme = false);
#   - the baseline example is all-false + REGULATORY_AUTHORIZATION_IN_PROGRESS; the invalid example (which
#     claims authorisation + real money) is present so the boundary is demonstrably exercised;
#   - no config/flag/env in the code surfaces sets a real-money capability to true/on.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

SCHEMA="contracts/production/regulatory-state.production.schema.json"
VALID="contracts/production/examples/regulatory-state.valid.json"
INVALID="contracts/production/examples/regulatory-state.invalid-authorised-claim.json"
ADR062=$(ls decisions/adr/ADR-007-*.md 2>/dev/null | head -1)
fail=0

# A config/flag/env that turns a real-money capability ON. JSON/code booleans are lowercase; env vars upper.
FLAG='real_money_enabled|real_wallets_enabled|real_settlement_enabled|real_participants_active|bna_approval_claimed'
ON_JSON="\"?(${FLAG})\"?[[:space:]]*[:=][[:space:]]*(true|1|\"true\"|\"1\"|on|yes)([^a-z]|$)"
ON_ENV='\b(REAL_MONEY|REAL_WALLETS|REAL_SETTLEMENT|REAL_PARTICIPANTS|BNA_APPROVAL|ENABLE_REAL_MONEY|REAL_MONEY_ENABLED)[A-Z_]*[[:space:]]*[:=][[:space:]]*(1|true|on|yes|"1"|"true")'
ON_FN='enable[_-]?real[_-]?money|activate[_-]?real[_-]?money|real[_-]?money[_-]?on\b'

# Code surfaces scanned for a turn-on. The intentionally-INVALID example (which sets the flags true so the
# schema can reject it) and markdown docs are excluded; the schema pins `const false` (never `: true`).
SURFACES=(engines services website contracts infra examples)
GREP_EXCL=(--include='*.json' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.rs' --include='*.env' --include='*.yml' --include='*.yaml' --include='*.toml' --exclude='*.md')

# ── Self-test: prove the turn-on detector fires on a bad line and is silent on the fail-closed line ──
st=0
echo 'real_money_enabled: true'  | grep -qiE "$ON_JSON" || { echo "SELF-TEST BROKEN: real-money turn-on not detected" >&2; st=1; }
echo 'real_money_enabled: false' | grep -qiE "$ON_JSON" && { echo "SELF-TEST BROKEN: fail-closed line wrongly flagged as a turn-on" >&2; st=1; }
echo 'REAL_MONEY_ENABLED=1'      | grep -qiE "$ON_ENV"  || { echo "SELF-TEST BROKEN: env turn-on not detected" >&2; st=1; }
echo 'enableRealMoney()'         | grep -qiE "$ON_FN"   || { echo "SELF-TEST BROKEN: enable-real-money fn not detected" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "real-money-activation: guard self-test FAILED"; exit 2; }

# ── [1/4] required artifacts present ─────────────────────────────────────────────────────────────────
echo "== [1/4] regulatory-state schema + examples + ADR-007 present =="
for f in "$SCHEMA" "$VALID" "$INVALID" "$ADR062"; do
  if [ -f "$f" ]; then echo "PASS  $f"; else echo "FAIL  missing required artifact: $f"; fail=1; fi
done

# ── [2/4] schema pins the fail-closed baseline (const false flags + boundary consts) ────────────────
echo "== [2/4] schema pins real_money/real_wallets/real_settlement/real_participants/bna_claim = const false =="
if [ -f "$SCHEMA" ] && node -e '
  const s = require("./'"$SCHEMA"'");
  const p = s.properties || {};
  let ok = true;
  const flags = ["real_money_enabled","real_wallets_enabled","real_settlement_enabled","real_participants_active","bna_approval_claimed"];
  for (const f of flags) { if (!p[f] || p[f].const !== false) { console.error("  - flag not const false:", f); ok = false; } }
  const b = (p.boundary && p.boundary.properties) || {};
  for (const k of ["not_authorised_yet","no_bna_claim_without_evidence","real_money_fail_closed","certification_is_not_admission_is_not_authorisation"])
    if (!b[k] || b[k].const !== true) { console.error("  - boundary not const true:", k); ok = false; }
  for (const k of ["authorisation_granted","banzami_presented_as_authorised","replaces_regulator","replaces_scheme"])
    if (!b[k] || b[k].const !== false) { console.error("  - boundary not const false:", k); ok = false; }
  process.exit(ok ? 0 : 1);
'; then
  echo "PASS  schema baseline is fail-closed (5 real-money flags const false + boundary consts)"
else
  echo "FAIL  schema does not pin the fail-closed baseline ($SCHEMA)"; fail=1
fi

# ── [3/4] baseline example all-false + in-progress; invalid example exercises the boundary ──────────
echo "== [3/4] baseline example fail-closed; invalid example claims real money (boundary exercised) =="
if [ -f "$VALID" ] && node -e '
  const v = require("./'"$VALID"'");
  let ok = v.state === "REGULATORY_AUTHORIZATION_IN_PROGRESS";
  for (const f of ["real_money_enabled","real_wallets_enabled","real_settlement_enabled","real_participants_active","bna_approval_claimed"])
    if (v[f] !== false) { console.error("  - baseline flag not false:", f); ok = false; }
  process.exit(ok ? 0 : 1);
'; then echo "PASS  baseline example is all-false + REGULATORY_AUTHORIZATION_IN_PROGRESS"; else echo "FAIL  baseline example not fail-closed ($VALID)"; fail=1; fi
if [ -f "$INVALID" ] && node -e '
  const x = require("./'"$INVALID"'");
  const anyTrue = ["real_money_enabled","real_wallets_enabled","real_settlement_enabled","real_participants_active","bna_approval_claimed"].some(f => x[f] === true);
  process.exit(anyTrue ? 0 : 1);
'; then echo "PASS  invalid example claims real money / authorisation (schema must reject it)"; else echo "FAIL  invalid example does not exercise the boundary ($INVALID)"; fail=1; fi

# ── [4/4] no code path enables real money outside the gate ───────────────────────────────────────────
echo "== [4/4] no config/flag/env flips a real-money capability ON =="
present=(); for s in "${SURFACES[@]}"; do [ -e "$s" ] && present+=("$s"); done
viol=0
for pat in "$ON_JSON" "$ON_ENV" "$ON_FN"; do
  hits="$(grep -rniE "${GREP_EXCL[@]}" "$pat" "${present[@]}" 2>/dev/null \
    | grep -vF "$INVALID" \
    | grep -viE 'const|:[[:space:]]*false|=[[:space:]]*false|fail-closed|fecho por omissão|dormant|desactivad|reserved|enum' || true)"
  if [ -n "$hits" ]; then
    echo "FAIL  real-money turn-on matching /$pat/:"
    echo "$hits" | sed 's/^/    /'
    viol=1; fail=1
  fi
done
[ "$viol" -eq 0 ] && echo "PASS  no code path turns real money ON outside the Rust RealMoneyActivationGate"

if [ "$fail" -ne 0 ]; then
  echo
  echo "real-money-activation: FAIL — see ADR-007 and $SCHEMA."
  exit 1
fi
echo
echo "real-money-activation: ✓ real money fail-closed at baseline (const false); no turn-on flag; gate is Rust-decided (M2.19C / ADR-007)"
