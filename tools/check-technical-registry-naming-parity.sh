#!/usr/bin/env bash
#
# Technical Registry naming-parity guard (M2.19G.5C).
#
# The PT canonical user-facing surfaces name the Layer-2 registry "Registo Técnico" (the glossary mapping
# in /glossario is the source of truth: name "Registo Técnico", en: "BANZA Technical Registry"). PT rendered
# strings must NOT use the English "Technical Registry" / "Public Protocol Registry"; the layout meta
# description must NOT use "public protocol registry".
#
# ALLOWED (not violations): dev comments (`//`, `*`), the deliberate glossary `en:` gloss fields, and
# website/lib/decisions.ts ADR titles (not scanned). EXEMPT: the whitepaper, contracts/invariants.json
# (INV-FEDEVAL-008), docs/reports/** (none scanned).
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

PAGES=(
  website/app/estado/page.tsx
  website/app/registo-tecnico/page.tsx
  # website/app/roteiro/page.tsx retired — permanent redirect to §14 /referencia/roteiro (no page to scan)
  website/app/operadores/page.tsx
  website/app/page.tsx
  website/app/glossario/page.tsx
)
LAYOUT="website/app/layout.tsx"

EN_RX='Technical Registry|Public Protocol Registry'

fail=0
ok() { printf 'PASS  %s\n' "$1"; }
fl() { printf 'FAIL  %s\n' "$1"; fail=1; }

# Drop dev comments and the deliberate glossary `en:` gloss fields from grep -n output.
strip_allowed() { grep -vE '^[0-9]+:[[:space:]]*(//|\*|/\*)' | grep -vE 'en:[[:space:]]*"'; }

# ── Self-test ─────────────────────────────────────────────────────────────────────────────────────
st=0
printf '10:      <p>Consulte o Technical Registry.</p>\n' | strip_allowed | grep -qE "$EN_RX" || { echo "SELF-TEST BROKEN: rendered EN string not detected" >&2; st=1; }
printf '200:    en: "BANZA Technical Registry",\n'         | strip_allowed | grep -qE "$EN_RX" && { echo "SELF-TEST BROKEN: en: gloss field not exempted" >&2; st=1; }
printf '18:// (Technical Registry) dev note\n'             | strip_allowed | grep -qE "$EN_RX" && { echo "SELF-TEST BROKEN: dev comment not exempted" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "technical-registry-naming-parity: guard self-test FAILED"; exit 2; }

echo "== [1/3] no EN 'Technical Registry' / 'Public Protocol Registry' in PT rendered strings =="
for f in "${PAGES[@]}"; do
  [ -f "$f" ] || { fl "missing page: $f"; continue; }
  hits="$(grep -nE "$EN_RX" "$f" 2>/dev/null | strip_allowed || true)"
  if [ -n "$hits" ]; then fl "EN registry string in a PT rendered surface: $f"; echo "$hits" | sed 's/^/      /'; fi
done
[ "$fail" -eq 0 ] && ok "no EN 'Technical Registry' / 'Public Protocol Registry' in any PT rendered string"

echo "== [2/3] layout meta description carries no 'public protocol registry' =="
if [ -f "$LAYOUT" ]; then
  hits="$(grep -niE 'public protocol registry' "$LAYOUT" | grep -vE '^[0-9]+:[[:space:]]*(//|\*|/\*)' || true)"
  if [ -n "$hits" ]; then fl "layout meta carries 'public protocol registry':"; echo "$hits" | sed 's/^/      /'; else ok "layout meta has no 'public protocol registry'"; fi
else
  fl "missing $LAYOUT"
fi

echo "== [3/3] PT surfaces use 'Registo Técnico' (glossary is the source of truth) =="
for f in website/app/registo-tecnico/page.tsx website/app/glossario/page.tsx website/app/estado/page.tsx website/app/operadores/page.tsx; do
  if grep -qF 'Registo Técnico' "$f"; then ok "$f uses 'Registo Técnico'"; else fl "$f must use the PT term 'Registo Técnico'"; fi
done
# The glossary mapping is the canonical pt→en source of truth.
if grep -qE 'name:[[:space:]]*"Registo Técnico"' website/app/glossario/page.tsx && grep -qE 'en:[[:space:]]*"BANZA Technical Registry"' website/app/glossario/page.tsx; then
  ok "glossary defines the canonical mapping (Registo Técnico → BANZA Technical Registry)"
else
  fl "glossary must define the canonical mapping (name: Registo Técnico, en: BANZA Technical Registry)"
fi

if [ "$fail" -ne 0 ]; then
  echo
  echo "technical-registry-naming-parity: FAIL — PT naming parity for the Technical Registry drifted."
  exit 1
fi
echo
echo "technical-registry-naming-parity: ✓ PT surfaces say 'Registo Técnico'; EN gloss confined to //-comments + glossary en: fields; layout meta clean"
