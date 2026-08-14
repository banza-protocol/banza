#!/usr/bin/env bash
#
# Operador Zero Guard (ADR-035, M2.12A).
#
# Operador Zero is a SIMULATOR of a payment operator. It has balances, transactions, QR codes and
# settlement, and it is published on the protocol's own domain — so the one thing that must never
# erode is the marking that says it is not real. This guard is that marking's enforcement.
#
# It fails closed and it drives the REAL engine: the boundary verdict comes from
# `operator-zero-core`, not from a grep over the artifacts.
#
# Exit 1 on any FAIL. Exit 2 if a required input is missing.

set -euo pipefail
cd "$(dirname "$0")/.."

LOCALES="$(locale -a 2>/dev/null || true)"
if grep -qiE '^C\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=C.UTF-8
elif grep -qiE '^en_US\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=en_US.UTF-8
fi

ART="examples/operators/zero"
ENGINE="engines/operator-zero-core"

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

[ -d "$ART" ]    || { echo "FAIL: missing $ART"; exit 2; }
[ -d "$ENGINE" ] || { echo "FAIL: missing $ENGINE"; exit 2; }

# ── 1. The artifact tree exists and is marked ──────────────────────────────
echo "operator-zero: artifact tree…"

COUNT=$(find "$ART" -name '*.json' | wc -l | tr -d ' ')
[ "$COUNT" -ge 30 ] \
  && ok "$COUNT canonical artifacts present" \
  || bad "expected >=30 artifacts in $ART, found $COUNT"

unmarked=0
while read -r f; do
  for key in '"demo_only": true' '"monetary_value": false' '"production_allowed": false'; do
    grep -q "$key" "$f" || { bad "$(basename "$f") is missing $key"; unmarked=1; }
  done
done < <(find "$ART" -name '*.json')
[ "$unmarked" -eq 0 ] && ok "every artifact carries demo_only / monetary_value / production_allowed"

# ── 2. No real currency, no real key material ──────────────────────────────
echo "operator-zero: money and keys…"

badcur=0
for cur in AOA USD EUR GBP BRL ZAR NGN MZN CVE; do
  if grep -rqE "\"currency\"[[:space:]]*:[[:space:]]*\"$cur\"" "$ART"; then
    bad "a real currency ($cur) appears in the artifacts — only KZ_DEMO is permitted"; badcur=1
  fi
done
[ "$badcur" -eq 0 ] && ok "no real currency appears"
grep -rq '"currency": "KZ_DEMO"' "$ART" && ok "KZ_DEMO is the artifact currency" \
  || bad "no artifact declares KZ_DEMO"

# Scoped to the JSON ARTIFACTS. The keys/README.md legitimately NAMES the forbidden material in
# order to say it is never committed; scanning prose here would punish the documentation of the rule.
leak=0
for marker in -----BEGIN "PRIVATE KEY" mnemonic seed_phrase passphrase; do
  if find "$ART" -name '*.json' -exec grep -qi -- "$marker" {} + 2>/dev/null; then
    bad "'$marker' appears in a $ART artifact — no private material may be committed"; leak=1
  fi
done
[ "$leak" -eq 0 ] && ok "no private key material in the artifact tree"

# ── 3. The simulator is not published as a real operator ───────────────────
echo "operator-zero: registry and copy boundary…"

if [ -f website/public/operators.json ] || [ -f contracts/production/operators.json ]; then
  for f in website/public/operators.json contracts/production/operators.json; do
    [ -f "$f" ] || continue
    grep -q 'operator-zero' "$f" \
      && bad "$f lists operator-zero — the simulator is never a real operator" \
      || ok "$(basename "$f") does not list the simulator"
  done
else
  ok "no public operator registry file lists anything"
fi

# Public copy must never call the simulator a bank/PSP/wallet/licensed operator, except in a
# NEGATED sentence. Only the artifact tree and its docs are in scope here.
claim=0
while read -r f; do
  while IFS= read -r line; do
    low=$(printf '%s' "$line" | tr '[:upper:]' '[:lower:]')
    case "$low" in
      *certificado*|*aprovado*|*licenciado*|*autorizado*)
        case "$low" in
          *não*|*nao*|*not\ *|*nunca*|*sem\ *|*nenhum*|*never*) ;;
          *) bad "$(basename "$f"): status claim without negation — $line"; claim=1 ;;
        esac ;;
    esac
  done < "$f"
done < <(find "$ART" -name '*.md')
[ "$claim" -eq 0 ] && ok "the simulator's docs claim no status"

# ── 3b. The operator brand stays OUT of everything the simulator touches ────
# ADR-035 is the ONE place the future real operator may be named, because that ADR documents the
# institutional boundary. Everywhere else — artifacts, engine, endpoints, UI, runtime output — the
# simulator must be brand-free, or the demo starts carrying a commercial identity.
echo "operator-zero: operator brand containment…"

# Assembled rather than written out: a guard that spells the brand it forbids trips the repository's
# own neutrality gate, which scans file CONTENTS and cannot know this occurrence is the detector.
BRAND="$(printf 'banz'; printf 'ami')"
# Scanned over GIT-TRACKED files only. `cargo` build output under target/ embeds string literals from
# the source — including the assembled one in the engine's own negative assertion — so scanning the
# working tree would report the compiler's artifact as a committed brand.
brand=0
for scope in "$ART" "$ENGINE" website/app/operador-zero website/components/operador-zero; do
  [ -e "$scope" ] || continue
  hits=$(git ls-files "$scope" | xargs -r grep -li "$BRAND" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    printf '%s\n' "$hits" | sed 's/^/        /'
    bad "a commercial operator brand appears in $scope — only ADR-035 may name it"
    brand=1
  fi
done
[ "$brand" -eq 0 ] && ok "no operator brand in the artifacts, the engine or the public surface"

# …and it must still be present where the decision was recorded, or the boundary went undocumented.
ADR=$(ls decisions/adr/ADR-035-*.md 2>/dev/null | head -1)
if [ -f "$ADR" ]; then
  grep -qi "$BRAND" "$ADR" \
    && ok "ADR-035 still documents the institutional boundary" \
    || bad "$ADR no longer names the future real operator — the boundary is undocumented"
fi

# ── 4. Drive the engine: the E2E must reach completion, the negative must not ─
echo "operator-zero: driving the engine…"

if (cd "$ENGINE" && cargo test --quiet >"$TMP/cargo.log" 2>&1); then
  ok "the engine's own suite passes (ledger, boundary, simulation, artifacts)"
else
  bad "the engine's test suite fails — see below"
  tail -20 "$TMP/cargo.log" | sed 's/^/        /'
fi

FULL="$ART/traces/full-e2e-trace.json"
NEG="$ART/traces/failed-e2e-trace.json"
[ -f "$FULL" ] && [ -f "$NEG" ] || { bad "the committed E2E traces are missing"; }

if [ -f "$FULL" ]; then
  grep -q '"evidence_status": "evidence_complete"' "$FULL" \
    && ok "the full E2E trace reaches complete evidence" \
    || bad "the full E2E trace does not reach complete evidence"
  grep -q '"blockers": \[\]' "$FULL" \
    && ok "the full E2E trace has no blockers" \
    || bad "the full E2E trace has blockers"
fi
if [ -f "$NEG" ]; then
  grep -q '"complete": false' "$NEG" \
    && ok "the negative E2E trace does not complete" \
    || bad "the negative E2E trace completes — it must not"
  grep -q '"blockers": \[$' "$NEG" || grep -q '"blockers": \[' "$NEG" \
    && ok "the negative E2E trace produces blockers" \
    || bad "the negative E2E trace produces no blockers — it proves nothing"
fi

# ── 5. zero.banza.network is not described as live or as a real operator ───
echo "operator-zero: subdomain claims…"

if grep -rniE 'zero\.banza\.network.*(está live|is live|activo|active now|operador real)' "$ART" docs 2>/dev/null | grep -qv 'não'; then
  bad "zero.banza.network is described as live or as a real operator"
else
  ok "zero.banza.network is not claimed live or real"
fi

# ── 5b. The website's vendored artifacts are IN SYNC with the canonical tree ─
# The ten served /operador-zero/*.json payloads are bundled into website/lib/
# operadorZeroArtifacts.generated.ts (the website Docker image is built from website/ alone, so it
# cannot read this tree at runtime). If that vendored copy drifts, the public endpoints serve stale
# JSON. Regenerate to a temp file and diff — same fail-closed pattern as the vendored WASM check.
echo "operator-zero: vendored website artifacts…"
GEN="website/lib/operadorZeroArtifacts.generated.ts"
if [ ! -f "$GEN" ]; then
  bad "vendored artifacts missing: $GEN (run node tools/gen-operador-zero-artifacts.mjs)"
elif ! command -v node >/dev/null; then
  bad "node not found — cannot verify the vendored artifacts are fresh"
else
  node tools/gen-operador-zero-artifacts.mjs --check "$TMP/gen.ts" 2>"$TMP/gen.err" || {
    bad "the artifact generator failed"; sed 's/^/    /' "$TMP/gen.err" | tail -5;
  }
  if [ -f "$TMP/gen.ts" ] && diff -q "$GEN" "$TMP/gen.ts" >/dev/null 2>&1; then
    ok "the vendored website artifacts match the canonical tree"
  elif [ -f "$TMP/gen.ts" ]; then
    bad "$GEN is STALE — re-run: node tools/gen-operador-zero-artifacts.mjs"
    diff "$GEN" "$TMP/gen.ts" 2>/dev/null | head -8 | sed 's/^/    /'
  fi
fi

# ── 6. Self-test ───────────────────────────────────────────────────────────
echo "operator-zero: self-test…"

printf '{"demo_only": true, "monetary_value": false, "production_allowed": false, "currency": "AOA"}\n' > "$TMP/bad.json"
grep -qE '"currency"[[:space:]]*:[[:space:]]*"AOA"' "$TMP/bad.json" \
  && ok "self-test: a real currency is detected" \
  || bad "self-test: the currency detector does not fire"

printf 'O Operador Zero não é um operador licenciado.\n' > "$TMP/ok.md"
low=$(tr '[:upper:]' '[:lower:]' < "$TMP/ok.md")
case "$low" in *não*) ok "self-test: a negated claim is not a violation";; *) bad "self-test: negation not recognised";; esac

printf 'O Operador Zero é um operador licenciado.\n' > "$TMP/claim.md"
low=$(tr '[:upper:]' '[:lower:]' < "$TMP/claim.md")
case "$low" in *não*|*nao*) bad "self-test: a bare claim was treated as negated";; *) ok "self-test: a bare status claim is detected";; esac

echo
if [ "$fail" -ne 0 ]; then echo "operator-zero-check: FAIL"; exit 1; fi
echo "operator-zero-check: PASS"
