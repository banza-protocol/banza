#!/usr/bin/env bash
#
# BANZA Canonical Trust Signing-Chain Guard (ADR-027).
#
# The trust chain has one canonical shape (Model A), implemented by the `banza-trust` engine and stated
# by the critical invariants INV-ROOT-004 / INV-ROOT-005:
#
#     Trust Root  ──signs──▶  Key Manifest  ──authorises by domain──▶  Delegated keys
#                                                        └─ sign ─▶  protocol metadata · revocation list · evidence
#
# The Trust Root signs ONLY the Key Manifest. It never signs protocol metadata, the revocation list (BRL)
# or evidence directly; the BRL is signed by the revocation-domain delegated key, whose authority traces
# to the root THROUGH the Key Manifest. ADR-027 reconciled the whole canonical surface to this model after
# a pre-existing "Model B" residue (root signs revocation entries directly) had spread from INV-OTE-009's
# old wording into ADR-027/040, the trust-architecture doc, the federation trust model and several diagrams.
#
# This guard keeps those RECONCILED canonical surfaces on Model A. It is NOT a blind "root near revocation"
# grep — that phrasing is legitimate (e.g. "the revocation key's authority traces to the root via the Key
# Manifest"). It (1) asserts the Model-A anchors are present, (2) checks registry↔ADR agreement, and
# (3) forbids the specific Model-B constructions ("… signs … delegated keys and revocations",
# "revocation entries only", "chaves delegadas e revogações") on the reconciled surfaces.
#
# Out of scope by design (flagged in ADR-027 for the M2 ceremony-prep operational alignment, internally
# consistent Model-B + 2-of-3): contracts/production/*trust*.schema.json and *signed-protocol*.schema.json.
#
# Exit 1 on violation; exit 2 on broken self-test.

set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

# Reconciled canonical surfaces (NOT the flagged production-artifact schemas).
SURFACES=(
  contracts/invariants.json
  contracts/federation/federation-trust.json
  contracts/federation/key-manifest.json
  contracts/federation/revocation-list.json
  decisions/adr/ADR-027-open-protocol-trust-model-without-ca.md
  decisions/adr/ADR-031-federation-trust-evaluation-without-certificates.md
  decisions/adr/ADR-027-canonical-trust-signing-model-reconciliation.md
  website/content/decisions/adr/ADR-027-open-protocol-trust-model-without-ca.md
  website/content/decisions/adr/ADR-031-federation-trust-evaluation-without-certificates.md
  docs/governance/BANZA_TRUST_ARCHITECTURE.md
  docs/governance/FEDERATION_TRUST_MODEL.md
  docs/governance/PROTOCOL_GOVERNANCE_ROLES.md
  spec/federation/FEDERATION_TRUST_MODEL.md
  website/content/BANZA_REFERENCIA.md
  website/public/diagrams/protocol/open-trust-evaluation-v1.svg
  website/public/diagrams/protocol/banza-trust-v1.svg
)

# Model-B constructions: an affirmative "the root signs … (a list including) revocations" claim. These
# exact strings never occur in correct Model-A prose. (Model-A shorthand like "root-signed protocol
# metadata" and negations like "never signs the revocation list directly" are deliberately NOT listed.)
MODELB=(
  "revocation entries only"
  "delegated keys and revocations"
  "delegated signing keys and revocations"
  "delegated signing keys and revocation entries"
  "delegated keys and revocation entries"
  "chaves delegadas e revogações"
)

check() {
  local root="$1" bad=0 f phrase inv adr

  # 1. Model-A anchors present in the registry (SSOT).
  inv="$root/contracts/invariants.json"
  grep -qF "The root key signs only Key Manifests" "$inv" \
    || { echo "  ✗ INV-ROOT-004 (root signs only Key Manifests) missing from the registry"; bad=1; }
  grep -qF "The Trust Root signs only the Key Manifest that endorses the delegated signing keys" "$inv" \
    || { echo "  ✗ INV-OTE-009 not reconciled to Model A in the registry"; bad=1; }
  grep -qF "revocation-domain" "$inv" \
    || { echo "  ✗ INV-ROOT-005 (BRL signed by the revocation-domain key) missing from the registry"; bad=1; }

  # 2. Registry ↔ ADR agreement: ADR-027 carries the same Model-A INV-OTE-009 wording.
  adr="$root/decisions/adr/ADR-027-open-protocol-trust-model-without-ca.md"
  grep -qF "The Trust Root signs only the Key Manifest that endorses the delegated signing keys" "$adr" \
    || { echo "  ✗ ADR-027 INV-OTE-009 diverges from the registry (not Model A)"; bad=1; }
  grep -qF "signs **only the Key Manifest**" "$adr" \
    || { echo "  ✗ ADR-027 D-038-04 is not the Model-A statement"; bad=1; }
  [ -f "$root/decisions/adr/ADR-027-canonical-trust-signing-model-reconciliation.md" ] \
    || { echo "  ✗ ADR-027 (the reconciliation decision) is missing"; bad=1; }

  # 3. No Model-B construction survives on the reconciled surfaces.
  for f in "${SURFACES[@]}"; do
    [ -f "$root/$f" ] || continue
    for phrase in "${MODELB[@]}"; do
      if grep -qF "$phrase" "$root/$f"; then
        echo "  ✗ Model-B residue in $f: \"$phrase\""; bad=1
      fi
    done
  done

  return $bad
}

# ── self-test ──
selftest() {
  local d st=0 g b base
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good"; b="$d/bad"
  for base in "$g" "$b"; do
    mkdir -p "$base/contracts" "$base/decisions/adr"
    cat > "$base/contracts/invariants.json" <<'EOF'
The root key signs only Key Manifests. It never signs revocation lists directly.
The Trust Root signs only the Key Manifest that endorses the delegated signing keys.
BRL is signed by the revocation-domain delegated key.
EOF
    cat > "$base/decisions/adr/ADR-027-open-protocol-trust-model-without-ca.md" <<'EOF'
The Trust Root signs only the Key Manifest that endorses the delegated signing keys.
| D-038-04 | The Trust Root signs **only the Key Manifest**, which endorses the delegated keys. |
EOF
    : > "$base/decisions/adr/ADR-027-canonical-trust-signing-model-reconciliation.md"
  done
  # inject a Model-B residue into the bad tree's ADR
  echo 'The trust root signs protocol metadata, releases, delegated keys and revocations.' >> "$b/decisions/adr/ADR-027-open-protocol-trust-model-without-ca.md"
  ( SURFACES=(contracts/invariants.json decisions/adr/ADR-027-open-protocol-trust-model-without-ca.md); check "$g" >/dev/null 2>&1 ) || { echo "SELFTEST_FAIL good rejected"; st=1; }
  ( SURFACES=(contracts/invariants.json decisions/adr/ADR-027-open-protocol-trust-model-without-ca.md); check "$b" >/dev/null 2>&1 ) && { echo "SELFTEST_FAIL model-B accepted"; st=1; }
  return $st
}

if ! selftest; then echo "Result: ✗ trust signing-chain guard self-test broken"; exit 2; fi

echo "Trust signing-chain guard — Root → Key Manifest → delegated key by domain → artifact (ADR-027)"
if check "."; then
  echo "Result: ✓ canonical surface tells Model A: the Trust Root signs only the Key Manifest; the BRL is signed by the revocation-domain delegated key"
else
  echo "Result: ✗ trust signing chain diverges (see decisions/adr/ADR-027, contracts/invariants.json INV-ROOT-004)"
  exit 1
fi
