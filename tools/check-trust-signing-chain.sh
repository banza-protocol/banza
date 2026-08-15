#!/usr/bin/env bash
#
# BANZA Canonical Trust Signing-Chain Guard (ADR-025).
#
# The trust chain has one canonical shape (Model A), implemented by the `banza-trust` engine and stated
# by the critical invariants INV-ROOT-004 / INV-ROOT-005:
#
#     Trust Root  ──signs──▶  Key Manifest  ──authorises by domain──▶  Delegated keys
#                                                        └─ sign ─▶  protocol metadata · revocation list · evidence
#
# The Trust Root signs ONLY the Key Manifest. It never signs protocol metadata, the revocation list (BRL)
# or evidence directly; the BRL is signed by the revocation-domain delegated key, whose authority traces
# to the root THROUGH the Key Manifest. ADR-025 reconciled the whole canonical surface to this model after
# a pre-existing "Model B" residue (root signs revocation entries directly) had spread from INV-OTE-009's
# old wording into ADR-025/040, the trust-architecture doc, the federation trust model and several diagrams.
#
# This guard keeps those RECONCILED canonical surfaces on Model A. It is NOT a blind "root near revocation"
# grep — that phrasing is legitimate (e.g. "the revocation key's authority traces to the root via the Key
# Manifest"). It (1) asserts the Model-A anchors are present, (2) checks registry↔ADR agreement, and
# (3) forbids the specific Model-B constructions ("… signs … delegated keys and revocations",
# "revocation entries only", "chaves delegadas e revogações") on the reconciled surfaces.
#
# Out of scope by design (flagged in ADR-025 for the M2 ceremony-prep operational alignment, internally
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
  $(ls decisions/adr/ADR-025-*.md 2>/dev/null | head -1)
  $(ls decisions/adr/ADR-025-*.md 2>/dev/null | head -1)
  $(ls decisions/adr/ADR-025-*.md 2>/dev/null | head -1)
  website/content/$(ls decisions/adr/ADR-025-*.md 2>/dev/null | head -1)
  website/content/$(ls decisions/adr/ADR-025-*.md 2>/dev/null | head -1)
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
  #
  # INV-ROOT-004 is checked as a PROPERTY, not as a sentence. This check used to pin the literal
  # "The root key signs only Key Manifests", which made the guard fail the moment the invariant was
  # corrected to name the Root Authority Set instead of a single root key (ADR-039) — a guard firing
  # on an improvement to the very thing it protects. What must hold is that the registry confines root
  # signing to the root plane and keeps the three delegated artifacts out of it.
  inv="$root/contracts/invariants.json"
  python3 - "$inv" <<'PY' || bad=1
import json, sys
inv = {i["id"]: i for i in json.load(open(sys.argv[1], encoding="utf8"))["invariants"]}
st = inv.get("INV-ROOT-004", {}).get("statement", "").lower()
if not st:
    print("  ✗ INV-ROOT-004 missing from the registry"); sys.exit(1)
bad = 0
if "key manifest" not in st:
    print("  ✗ INV-ROOT-004 does not confine root signing to the Key Manifest"); bad = 1
for artifact in ("protocol metadata", "conformance evidence", "revocation list"):
    if artifact not in st:
        print(f"  ✗ INV-ROOT-004 no longer excludes {artifact} from direct root signing"); bad = 1
if "never signs" not in st and "not sign" not in st:
    print("  ✗ INV-ROOT-004 states no exclusion at all"); bad = 1
sys.exit(bad)
PY
  grep -qF "The Trust Root signs only the Key Manifest that endorses the delegated signing keys" "$inv" \
    || { echo "  ✗ INV-OTE-009 not reconciled to Model A in the registry"; bad=1; }
  grep -qF "revocation-domain" "$inv" \
    || { echo "  ✗ INV-ROOT-005 (BRL signed by the revocation-domain key) missing from the registry"; bad=1; }

  # 2. Registry ↔ ADR agreement: ADR-025 carries the same Model-A INV-OTE-009 wording.
  adr="$root/$(ls decisions/adr/ADR-025-*.md 2>/dev/null | head -1)"
  grep -qF "The Trust Root signs only the Key Manifest that endorses the delegated signing keys" "$adr" \
    || { echo "  ✗ ADR-025 INV-OTE-009 diverges from the registry (not Model A)"; bad=1; }
  grep -qE 'signs \*\*only the Key Manifest\*\*|signs only the Key Manifest' "$adr" \
    || { echo "  ✗ ADR-025 is not the Model-A statement"; bad=1; }
  [ -f "$root/$(ls decisions/adr/ADR-025-*.md 2>/dev/null | head -1)" ] \
    || { echo "  ✗ ADR-025 (the reconciliation decision) is missing"; bad=1; }

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
{"invariants": [
  {"id": "INV-ROOT-004",
   "statement": "A Root authority signs only the Key Manifest and a successor Root Authority Set. It never signs protocol metadata, conformance evidence, or revocation lists directly."},
  {"id": "INV-OTE-009",
   "statement": "The Trust Root signs only the Key Manifest that endorses the delegated signing keys."},
  {"id": "INV-ROOT-005",
   "statement": "The BRL is signed by the revocation-domain delegated key."}
]}
EOF
    cat > "$base/$(ls decisions/adr/ADR-025-*.md 2>/dev/null | head -1)" <<'EOF'
The Trust Root signs only the Key Manifest that endorses the delegated signing keys.
| | The Trust Root signs **only the Key Manifest**, which endorses the delegated keys. |
EOF
  done
  # inject a Model-B residue into the bad tree's ADR
  echo 'The trust root signs protocol metadata, releases, delegated keys and revocations.' >> "$b/$(ls decisions/adr/ADR-025-*.md 2>/dev/null | head -1)"
  ( SURFACES=(contracts/invariants.json $(ls decisions/adr/ADR-025-*.md 2>/dev/null | head -1)); check "$g" >/dev/null 2>&1 ) || { echo "SELFTEST_FAIL good rejected"; st=1; }
  ( SURFACES=(contracts/invariants.json $(ls decisions/adr/ADR-025-*.md 2>/dev/null | head -1)); check "$b" >/dev/null 2>&1 ) && { echo "SELFTEST_FAIL model-B accepted"; st=1; }
  return $st
}

if ! selftest; then echo "Result: ✗ trust signing-chain guard self-test broken"; exit 2; fi

echo "Trust signing-chain guard — Root → Key Manifest → delegated key by domain → artifact (ADR-025)"
if check "."; then
  echo "Result: ✓ canonical surface tells Model A: the Trust Root signs only the Key Manifest; the BRL is signed by the revocation-domain delegated key"
else
  echo "Result: ✗ trust signing chain diverges (see decisions/adr/ADR-025, contracts/invariants.json INV-ROOT-004)"
  exit 1
fi
