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
# (INV-FEDEVAL-008).
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

# Block F — this page became ONE view rendering both editions, with its text in a per-edition content
# module. That module is where these sentences live now, and reading it checks both editions at once
# instead of only the Portuguese one.


# A per-edition content module holds BOTH editions in one file, so scanning it whole reports the English
# edition's own correct term as a Portuguese-surface violation. Only the Portuguese entry is a Portuguese
# surface; the English entry answers to the English naming rules, not to these.
pt_surface() {
  case "$1" in
    website/components/pages/*Content.ts*)
      # `[{]` and not `\{`. An escaped brace is undefined in POSIX ERE: BSD awk reads it as a literal
      # brace, mawk — which is what Ubuntu ships, and therefore what CI runs — does not. The pattern
      # silently failed to match there, the extractor emitted nothing, and the guard reported that the
      # Portuguese term was missing from a file that contains it three times. A bracket expression is a
      # literal brace in every awk.
      awk '/^  pt: [{]/{p=1} /^  en: [{]/{p=0} p' "$1"
      ;;
    *) cat "$1" ;;
  esac
}

# An extractor that returns nothing must say so, rather than let every check built on it read as a content
# violation. That is exactly how the portability defect presented: "must use the PT term 'Registo Técnico'"
# on a file that uses it, because the slice was empty. An empty slice is a broken guard, not a broken page.
# Returns the Portuguese surface in PT_SURFACE rather than on stdout. Piping a shell builtin into
# `grep -q` looks harmless and is not: grep exits at the first match and closes the pipe, the builtin gets
# EPIPE, and under `pipefail` the whole pipeline reports failure — so every check would have read as a
# content violation whether or not the term was there. Matching is done in the shell instead, with no pipe.
PT_SURFACE=""
read_pt_surface() {
  PT_SURFACE="$(pt_surface "$1")"
  if [ -z "$PT_SURFACE" ]; then
    echo "GUARD BROKEN: the Portuguese-edition extractor produced nothing for $1" >&2
    return 2
  fi
  return 0
}

PAGES=(
  "website/components/pages/statusContent.tsx"
  "website/app/(pt)/registo-tecnico/page.tsx"
  # website/app/roteiro/page.tsx retired — permanent redirect to §14 /referencia/roteiro (no page to scan)
  "website/app/(pt)/operadores/page.tsx"
  "website/app/(pt)/page.tsx"
  "website/app/(pt)/glossario/page.tsx"
)
LAYOUT="website/app/(pt)/layout.tsx"

EN_RX='Technical Registry|Public Protocol Registry'

fail=0
ok() { printf 'PASS  %s\n' "$1"; }
fl() { printf 'FAIL  %s\n' "$1"; fail=1; }

# The glossary terms became bilingual records in website/lib/glossaryTerms.ts, rendered by GlossaryView —
# the page itself no longer contains a term's wording. Reading the page for a Portuguese literal therefore
# tested a form that no longer exists, and could never have covered the English edition. The resolved copy
# publishes each term's name in both editions.
# shellcheck source=tools/_banzai-copy.sh
. tools/_banzai-copy.sh

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
  read_pt_surface "$f" || exit 2
  hits="$(printf '%s\n' "$PT_SURFACE" | grep -nE "$EN_RX" 2>/dev/null | strip_allowed || true)"
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
for f in "website/app/(pt)/registo-tecnico/page.tsx" "website/app/(pt)/glossario/page.tsx" "website/components/pages/statusContent.tsx" "website/app/(pt)/operadores/page.tsx"; do
  # The glossary page renders its terms from the bilingual records, so the wording is not in the page.
  if [ "$f" = "website/app/(pt)/glossario/page.tsx" ]; then
    copy_id_is glossary technical-registry.name pt 'Registo Técnico' \
      && ok "the glossary realizes 'Registo Técnico' for the Portuguese reader" \
      || fl "the glossary must realize the PT term 'Registo Técnico'"
  else
    read_pt_surface "$f" || exit 2
    case "$PT_SURFACE" in
      *"Registo Técnico"*) ok "$f uses 'Registo Técnico'" ;;
      *) fl "$f must use the PT term 'Registo Técnico'" ;;
    esac
  fi
done
# The glossary mapping is the canonical pt→en source of truth.
if copy_id_is glossary technical-registry.name pt "Registo Técnico" \
   && copy_id_is glossary technical-registry.name en "BANZA Technical Registry"; then
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
