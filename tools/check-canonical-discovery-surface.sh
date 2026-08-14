#!/usr/bin/env bash
# check-canonical-discovery-surface.sh (ADR-029 — Canonical Discovery-Surface Reconciliation)
#
# One canonical, machine-readable discovery surface. An external implementer must be able to
# discover an operator's protocol artefacts WITHOUT guessing filenames. ADR-029 fixes the canon:
#
#   discovery (operator) manifest      → /.well-known/banza/operator.json   (RFC-0005 / ADR-031)
#   signed protocol metadata           → /.well-known/banza/signed-protocol-metadata.json
#
# The de-facto root routes /manifest.json and /signed-metadata.json are RETIRED (fix-forward, no
# aliases). This guard proves the whole surface agrees — contract SSOT, the Rust registry that the
# runtime resolves endpoints from, and the Operador Zero served surface — and that the retired root
# routes do not reappear on any ACTIVE surface. It also pins the Open Trust Evaluation positive
# satisfiability: a federation-capable discovery manifest is validated against the federation
# extension contract (not the candidate-submission schema), so the eligibility condition is
# actually satisfiable.
#
# Classified exclusions (filename is incidental to the thing under test, or the file is an immutable
# historical record — see ADR-029): the stale docs/reference/{en,pt} mirror; artifacts/* audit
# snapshots; banza-artifact-fetcher SSRF host-policy fixtures; the isClosedId/zeroSubdomain negative
# routing fixtures; the operator-manifest.production candidate-submission schema; the whitepaper
# build manifest.json; the protocol_metadata_url FIELD name and the protocol-metadata signing DOMAIN.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
fail() { echo "FAIL: $1" >&2; exit 1; }
ok() { echo "  ok: $1"; }

OP_CANON="/.well-known/banza/operator.json"
SM_CANON="/.well-known/banza/signed-protocol-metadata.json"

run_checks() {
  local root="$1"

  # 1. Contract SSOT — federation-trust.json declares the canonical served paths + validates the
  #    discovery manifest against the federation extension (ADR-029), never the candidate schema.
  local ft="$root/contracts/federation/federation-trust.json"
  [ -f "$ft" ] || fail "missing $ft"
  grep -qF "$OP_CANON" "$ft" || fail "federation-trust.json must declare $OP_CANON as a published path"
  grep -qF "$SM_CANON" "$ft" || fail "federation-trust.json must declare $SM_CANON as a published path"
  grep -qF "federation-manifest.json" "$ft" || fail "OTE check#1 must reference the federation extension contract federation-manifest.json (ADR-029)"
  if grep -q "validated against the candidate-submission schema operator-manifest.production.schema.json (ADR-029)" "$ft"; then
    ok "OTE check#1 validates discovery manifest against the federation extension, not the candidate schema"
  else
    grep -q "NOT .*operator-manifest.production.schema.json" "$ft" || fail "OTE check#1 must state it is NOT validated against operator-manifest.production.schema.json"
    ok "OTE check#1 excludes the candidate-submission schema"
  fi

  # 2. The Rust Technical Registry (what the runtime resolves endpoints from) publishes the canon.
  local model="$root/engines/banza-target-registry/src/model.rs"
  [ -f "$model" ] || fail "missing $model"
  grep -qF "manifest: \"$OP_CANON\"" "$model" || fail "Endpoints::reference() must resolve manifest → $OP_CANON"
  grep -qF "signed_metadata: \"$SM_CANON\"" "$model" || fail "Endpoints::reference() must resolve signed_metadata → $SM_CANON"
  ok "banza-target-registry Endpoints::reference() publishes the canonical .well-known routes"

  # 3. Operador Zero served surface publishes the canon (operadorZero.ts + zeroSubdomain.ts).
  local oz="$root/website/lib/operadorZero.ts"
  local zs="$root/website/lib/zeroSubdomain.ts"
  [ -f "$oz" ] && [ -f "$zs" ] || fail "missing operadorZero.ts / zeroSubdomain.ts"
  grep -qF '.well-known/banza/operator' "$oz" || fail "operadorZero.ts must serve .well-known/banza/operator"
  grep -qF '.well-known/banza/signed-protocol-metadata' "$oz" || fail "operadorZero.ts must serve .well-known/banza/signed-protocol-metadata"
  grep -qF '.well-known/banza/operator' "$zs" || fail "zeroSubdomain.ts ZERO_ENDPOINTS must include .well-known/banza/operator"
  grep -qF '.well-known/banza/signed-protocol-metadata' "$zs" || fail "zeroSubdomain.ts ZERO_ENDPOINTS must include .well-known/banza/signed-protocol-metadata"
  ok "Operador Zero serves the canonical discovery routes exclusively"

  # 4. OTE positive satisfiability — a federation-capable discovery manifest fixture that actually
  #    carries the fields the eligibility condition requires (so the condition is satisfiable).
  local mbv="$root/conformance/fixtures/federation/MANIFEST-B-VALID.json"
  [ -f "$mbv" ] || fail "missing federation positive fixture MANIFEST-B-VALID.json"
  grep -qE '"supports_federation"[[:space:]]*:[[:space:]]*true' "$mbv" || fail "MANIFEST-B-VALID must set supports_federation:true (OTE positive satisfiability)"
  grep -qE '"cross_operator_routing"[[:space:]]*:[[:space:]]*true' "$mbv" || fail "MANIFEST-B-VALID must set cross_operator_routing:true (OTE positive satisfiability)"
  ok "OTE positive satisfiability fixture present (supports_federation + cross_operator_routing = true)"

  # 5. The retired root routes must not reappear on any ACTIVE surface (fix-forward, no aliases).
  #    Classified exclusions per ADR-029 (immutable records / incidental fixtures / field+domain names).
  local hits
  hits=$(grep -rInE 'zero\.banza\.network/(manifest|signed-metadata)\.json|"/(manifest|signed-metadata)\.json"|banza/protocol-metadata\.json|banza/operator-manifest\.json' \
      --include='*.rs' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.json' --include='*.svg' --include='*.md' --include='*.yaml' --include='*.yml' \
      "$root/engines" "$root/services" "$root/website/lib" "$root/website/app" "$root/website/content" "$root/website/public" "$root/spec" "$root/docs" "$root/contracts" 2>/dev/null \
      | grep -vE '/target/|/node_modules/|/\.next/|/pkg/|/validatewasm/|/rustkb/' \
      | grep -vE 'docs/reference/(en|pt)/|/artifacts/|operator-manifest\.production|federation-manifest\.json|docs/whitepaper|banza-artifact-fetcher/(src/policy|tests)|conformance/vectors/trust-signing|engines/banza-trust/src/sign\.rs|evil\.example' \
      | grep -v 'website/content/decisions/' \
      | grep -vE 'isClosedId|zeroSubdomain\.test|banzaiValidationRegistry\.test|/manifest\.json.{0,60}(policy|405|404|reject|negative|incidental)' \
      | grep -vaE 'signed-protocol-metadata\.json' || true)
  if [ -n "$hits" ]; then
    echo "$hits" >&2
    fail "retired discovery root route(s) found on an active surface — must use the .well-known canon (ADR-029)"
  fi
  ok "no retired /manifest.json or /signed-metadata.json discovery route on any active surface"
}

# --- self-test: a synthetic tree with a retired root route on an active surface MUST fail ---
selftest() {
  local tmp; tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN
  mkdir -p "$tmp/engines/banza-target-registry/src" "$tmp/contracts/federation" \
    "$tmp/website/lib" "$tmp/conformance/fixtures/federation" "$tmp/website/app"
  # minimal green skeleton
  cat > "$tmp/contracts/federation/federation-trust.json" <<EOF
{ "published_paths": ["$OP_CANON","$SM_CANON"], "check": "... federation-manifest.json ... NOT ...operator-manifest.production.schema.json" }
EOF
  cat > "$tmp/engines/banza-target-registry/src/model.rs" <<EOF
manifest: "$OP_CANON".into(),
signed_metadata: "$SM_CANON".into(),
EOF
  echo '[".well-known/banza/operator", ".well-known/banza/signed-protocol-metadata"]' > "$tmp/website/lib/operadorZero.ts"
  echo '[".well-known/banza/operator", ".well-known/banza/signed-protocol-metadata"]' > "$tmp/website/lib/zeroSubdomain.ts"
  echo '{ "supports_federation": true, "cross_operator_routing": true }' > "$tmp/conformance/fixtures/federation/MANIFEST-B-VALID.json"
  # inject a violation on an active surface
  echo 'const bad = "https://zero.banza.network/manifest.json";' > "$tmp/website/app/bad.ts"
  if ( run_checks "$tmp" ) >/dev/null 2>&1; then
    fail "SELF-TEST regression: guard passed a tree with a retired root route on an active surface"
  fi
  ok "self-test holds (a retired root route on an active surface is rejected)"
}

echo "== canonical-discovery-surface-check (ADR-029) =="
selftest
run_checks "$ROOT"
echo "CANONICAL DISCOVERY SURFACE CHECK PASSED ✅"
