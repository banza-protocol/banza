#!/usr/bin/env bash
#
# Operador Zero full E2E protocol validation guard (ADR-052, M2.13A).
#
# This guard proves the end-to-end Operador Zero protocol journey holds under Rust-backed verification:
#   - the E2E Demo Operator Root (real Ed25519) verifies, a tampered payload fails, and a revoked key
#     blocks trust fail-closed — all with the PUBLIC key only, no private key present (the Rust
#     `operator-zero-e2e-root --verify` binary does this + the artifact field/leak checks);
#   - the engine E2E reaches a complete happy trace (100/100 semantics: complete, evidence_complete,
#     no blockers) while the negative trace is blocked (not complete, has blockers);
#   - the subdomain endpoint list and the apex artifact list do not diverge;
#   - Operador Zero is never in an operators[] list;
#   - the BanzAI official validation journey is endpoint-originated (M2.19G.1, ADR-068): it obtains every
#     evaluated artifact from the implementation's PUBLIC endpoints via the Rust backend, never from a
#     bundled manifest, local fixture or the retired /operador-zero apex endpoint.
#
# Complements make operator-zero-check (engine invariants), make operator-zero-standalone-surface-check
# (surface), make zero-subdomain-routing-check (routing) and make private-key-leak-check (repo-wide).
#
# Exit 1 on any FAIL. Exit 2 if a prerequisite is missing.

set -euo pipefail
cd "$(dirname "$0")/.."

E2E_CRATE="engines/operator-zero-e2e-root"
E2E_DIR="examples/operators/zero/e2e-root"
TRACE_DIR="examples/operators/zero/traces"
ARTIFACTS_TS="website/lib/operadorZero.ts"
MOD="website/lib/zeroSubdomain.ts"
BANZAI="website/components/banzai/BanzaiAgent.tsx"
# M2.19EF2 — the demo data-read (readArtifact) moved out of the BanzaiAgent shell into the single 9-step
# validation journey (validationJourney.tsx), rendered by the in-shell UI in BanzaiValidationMode.tsx.
VJOURNEY="website/components/banzai/validationJourney.tsx"
VSHELL="website/components/banzai/BanzaiValidationMode.tsx"

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

echo "══════════════════════════════════════════════════════════════════════"
echo "Operador Zero — full E2E protocol validation"
echo "══════════════════════════════════════════════════════════════════════"

# ── 1. Demo Operator Root E2E — real Ed25519 verify (Rust is the source of truth) ──
echo "e2e: Demo Operator Root (Ed25519 verify / tamper / revocation)…"
[ -f "$E2E_CRATE/Cargo.toml" ] || { echo "FAIL: missing $E2E_CRATE"; exit 2; }
if command -v cargo >/dev/null 2>&1; then
  if (cd "$E2E_CRATE" && cargo run --release --quiet --bin gen -- --verify) > "$TMP/verify.log" 2>&1; then
    ok "operator-zero-e2e-root --verify PASS (signature verifies, tamper fails, revocation blocks, no private key)"
  else
    bad "operator-zero-e2e-root --verify FAILED:"; tail -15 "$TMP/verify.log" | sed 's/^/      /'
  fi
else
  bad "cargo not available — cannot verify the E2E Demo Operator Root"
fi

# ── 2. The 8 E2E root artifacts exist and carry the demo boundary ────────────
echo "e2e: root artifacts present + boundary…"
E2E_FILES=(operator-zero-e2e-root.public.json operator-zero-e2e-key-manifest.json \
  operator-zero-e2e-key-fingerprint.txt operator-zero-e2e-signature-report.json \
  operator-zero-e2e-revocation-list.json operator-zero-e2e-signed-manifest.json \
  operator-zero-e2e-signed-evidence-bundle.json operator-zero-e2e-root-verification-trace.json)
for f in "${E2E_FILES[@]}"; do [ -f "$E2E_DIR/$f" ] && ok "artifact: $f" || bad "missing E2E artifact: $f"; done
PUB="$E2E_DIR/operator-zero-e2e-root.public.json"
grep -q '"not_protocol_trust_root": true' "$PUB" && ok "root declares not_protocol_trust_root" || bad "public key must declare not_protocol_trust_root: true"
grep -q '"root_type": "demo_operator_root"' "$PUB" && ok "root_type = demo_operator_root" || bad "public key must declare root_type: demo_operator_root"
# No real private-key material in the JSON artifacts (PEM blocks or forbidden key field-tokens). Prose
# in README/*.txt that merely discusses keys is not scanned; the Rust --verify + make
# private-key-leak-check cover the rest.
LEAK=$(grep -rlE 'BEGIN [A-Z ]*PRIVATE KEY|seed_phrase|mnemonic|root_private_key|private_key_material|"private_key"|"signing_key"' "$E2E_DIR"/*.json 2>/dev/null || true)
[ -z "$LEAK" ] && ok "no private-key material in the E2E JSON artifacts" || bad "private-key material in E2E artifacts: $LEAK"

# ── 3. Engine E2E — happy complete (100/100 semantics), negative blocked ─────
echo "e2e: engine traces (happy complete / negative blocked)…"
FULL="$TRACE_DIR/full-e2e-trace.json"
NEG="$TRACE_DIR/failed-e2e-trace.json"
[ -f "$FULL" ] && [ -f "$NEG" ] || { echo "FAIL: missing engine traces"; exit 2; }
grep -q '"complete": true' "$FULL" && grep -q '"evidence_status": "evidence_complete"' "$FULL" \
  && ok "happy trace is complete + evidence_complete" || bad "happy trace must be complete + evidence_complete"
grep -qE '"blockers": \[\]' "$FULL" && ok "happy trace has no blockers" || bad "happy trace must have no blockers"
grep -q '"complete": false' "$NEG" && ok "negative trace is not complete" || bad "negative trace must NOT be complete"
# Negative trace must carry at least one blocker (its blockers array is NOT empty "[]").
if grep -qE '"blockers": \[\]' "$NEG"; then bad "negative trace has an empty blockers list"; else ok "negative trace carries blockers"; fi
grep -q '"evidence_status": "evidence_invalid"' "$NEG" && ok "negative trace evidence_invalid" || bad "negative trace must be evidence_invalid"

# ── 4. Endpoint parity: subdomain list ≡ apex artifact list (no divergence) ──
echo "e2e: endpoint parity…"
grep -oE '"[a-z0-9/.-]+"' <(sed -n '/ZERO_ENDPOINTS *= *\[/,/\] as const/p' "$MOD") | tr -d '"' | sort -u > "$TMP/sub.txt"
grep -oE 'route: *"[a-z0-9/.-]+"' "$ARTIFACTS_TS" | sed -E 's/route: *"([^"]+)"/\1/' | sort -u > "$TMP/apex.txt"
if [ "$(grep -c . "$TMP/sub.txt")" -eq 14 ] && diff -q "$TMP/sub.txt" "$TMP/apex.txt" >/dev/null; then
  ok "the 14 endpoints match across subdomain routing and the artifact source"
else
  bad "endpoint lists diverge:"; diff "$TMP/apex.txt" "$TMP/sub.txt" | sed 's/^/      /' || true
fi

# ── 5. Operador Zero never in an operators[] list ────────────────────────────
echo "e2e: never a real operator…"
OPS=$(grep -rniE 'operators?" *: *\[[^]]*operator-zero' website/lib contracts 2>/dev/null || true)
[ -z "$OPS" ] && ok "Operador Zero is not in any operators[] list" || bad "Operador Zero appears in an operators list: $OPS"

# ── 6. The BanzAI official validation journey is endpoint-originated (ADR-068) ────────────────────
echo "e2e: BanzAI validation journey is endpoint-originated (ADR-068), not bundled/apex reads…"
# A missing source must fail closed (Exit 2) — never let an absent file silently pass the fetch scan.
for f in "$BANZAI" "$VJOURNEY" "$VSHELL"; do
  [ -f "$f" ] || { echo "FAIL: missing BanzAI surface: $f"; exit 2; }
done
# (a) The apex-fetch invariant still holds: no BanzAI surface — the shell (BanzaiAgent), the validation
#     journey (validationJourney.tsx) or the in-shell UI — fetches the retired /operador-zero apex route.
if grep -qE 'fetch\([^)]*/operador-zero/' "$BANZAI" "$VJOURNEY" "$VSHELL"; then
  bad "a BanzAI surface still fetches a retired /operador-zero apex endpoint"
else
  ok "no BanzAI surface fetches the retired /operador-zero apex endpoint"
fi
# (b) M2.19G.1 (ADR-068 §4.4) — the 9-step official journey is ENDPOINT-ORIGINATED: it calls the Rust
#     backend (POST /banzai/validate/{step,journey} via validateStepRequest/validateJourneyRequest),
#     which fetches every artifact from the implementation's PUBLIC endpoints and decides the verdict.
if grep -q 'validateStepRequest' "$VJOURNEY" && grep -q 'validateJourneyRequest' "$VJOURNEY"; then
  ok "the validation journey is endpoint-originated (calls /banzai/validate via validateStep/JourneyRequest)"
else
  bad "the validation journey must be endpoint-originated (validateStepRequest + validateJourneyRequest in $VJOURNEY)"
fi
# (c) ADR-068 §4.4/§4.5 — no bundled manifest, local fixture or readArtifact is a VERDICT SOURCE in the
#     official journey path (those moved to the isolated developer draft tool). This is the flip of the
#     superseded "journey reads the bundled manifest" expectation: the journey reads NO bundled data.
if grep -qE 'readArtifact|loadManifestFixtures|readFixture' "$VJOURNEY"; then
  bad "the official journey must not read bundled/fixture artifacts as a verdict source (ADR-068 §4.4)"
else
  ok "the official journey reads no bundled/fixture artifact as a verdict source (endpoint-originated only)"
fi

# ── Self-test — detectors fire ──────────────────────────────────────────────
echo "e2e: self-test…"
st=0
printf '"complete": false\n' > "$TMP/t.json"; grep -q '"complete": true' "$TMP/t.json" && { echo "    SELFTEST_FAIL complete"; st=1; }
printf 'fetch(`/operador-zero/manifest.json`)\n' > "$TMP/b.tsx"; grep -qE 'fetch\([^)]*/operador-zero/' "$TMP/b.tsx" || { echo "    SELFTEST_FAIL fetch-detector"; st=1; }
printf 'signing_key\n' > "$TMP/l.txt"; grep -qilE 'signing_key' "$TMP/l.txt" >/dev/null || { echo "    SELFTEST_FAIL leak-detector"; st=1; }
printf 'readArtifact("manifest")\n' > "$TMP/r.tsx"; grep -qE 'readArtifact|loadManifestFixtures|readFixture' "$TMP/r.tsx" || { echo "    SELFTEST_FAIL readArtifact-detector"; st=1; }
printf 'await validateJourneyRequest(a, b)\n' > "$TMP/v.tsx"; grep -q 'validateJourneyRequest' "$TMP/v.tsx" || { echo "    SELFTEST_FAIL endpoint-originated-detector"; st=1; }
[ "$st" -eq 0 ] && ok "self-test: complete, fetch-detector, leak-detector, readArtifact-detector, endpoint-detector" || fail=1

echo "══════════════════════════════════════════════════════════════════════"
if [ "$fail" -eq 0 ]; then echo "operator-zero-full-e2e-check: PASS"; else echo "operator-zero-full-e2e-check: FAIL"; fi
exit "$fail"
