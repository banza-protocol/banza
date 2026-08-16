#!/usr/bin/env bash
# The Reference has exactly one canonical edition and one official translation, both under
# docs/reference/, and nothing else claims to be either.
#
# The property this protects is authority direction. A publication surface that also holds editable
# Reference prose becomes a second editor, and two editors on one document drift silently — which is
# how the repository ended up with a website copy carrying the current architecture while docs/
# carried a retired one. Paths are named here because the migration fixed them; the property is that
# there is one editorial source per language and the derived surfaces cannot outrank it.
set -uo pipefail
cd "$(dirname "$0")/.."

PT="docs/reference/pt/BANZA_REFERENCIA.md"
EN="docs/reference/en/BANZA_REFERENCE.md"
fail=0
note() { printf '  %s\n' "$*"; }
bad() { printf '  FAIL: %s\n' "$*"; fail=1; }

echo "== reference source authority =="

# 1. Both editions exist, exactly where the authority model says they do.
[ -f "$PT" ] || bad "canonical Portuguese Reference missing at $PT"
[ -f "$EN" ] || bad "official English Reference missing at $EN"

# 2. Portuguese declares itself canonical; English declares itself a translation and defers to PT.
if [ -f "$PT" ]; then
  grep -qi "Edição canónica" "$PT" || bad "PT Reference does not declare itself the canonical edition"
  grep -qi "prevalece esta edição" "$PT" || bad "PT Reference does not state that it prevails on divergence"
  grep -qiE "descritiva, não normativa|não normativa" "$PT" || bad "PT Reference does not state it is descriptive, not normative"
fi
if [ -f "$EN" ]; then
  grep -qi "official English translation" "$EN" || bad "EN Reference does not declare itself the official translation"
  grep -qiE "Portuguese edition is canonical|Portuguese .{0,30}prevails" "$EN" || bad "EN Reference does not defer to the Portuguese edition"
  grep -qiE "^> \*\*Official English translation" "$EN" || note "note: EN status notice is not the leading block quote"
  # The translation must not promote itself.
  if grep -qiE "this is the canonical (BANZA )?[Rr]eference|canonical edition \(English\)" "$EN"; then
    bad "EN Reference claims canonical status"
  fi
fi

# 3. No other current file is a full Reference. Editorial size is the signal: a stub links, a copy
#    reproduces. Historical evidence and the generated mirrors are excluded by construction.
while IFS= read -r f; do
  case "$f" in
    "$PT"|"$EN") continue ;;
    website/content/reference/*.md) continue ;;      # generated mirror, proven by its own guard
    evidence/*|docs/audit/*|assurance/*) continue ;; # historical, keeps its own wording
  esac
  bytes=$(wc -c < "$f" | tr -d ' ')
  if [ "$bytes" -gt 40000 ]; then
    bad "$f is a second full Reference copy (${bytes} bytes) — there is one editorial source per language"
  fi
done < <(git ls-files 'docs/reference/**/*.md' 'website/content/*.md' 2>/dev/null)

# 4. No current document may present the retired website path as the canonical Reference.
while IFS= read -r hit; do
  f=${hit%%:*}
  case "$f" in
    evidence/*|docs/audit/*|assurance/*|tools/check-reference-source-authority.sh) continue ;;
    docs/reference/README.md) continue ;;            # explains the migration itself
  esac
  bad "$f still presents website/content/BANZA_REFERENCIA.md as a Reference source"
done < <(git grep -nI "website/content/BANZA_REFERENCIA\.md" -- ':!*.svg' 2>/dev/null)

if [ "$fail" -eq 0 ]; then
  note "ok: PT canonical + EN official translation under docs/reference/, no competing editorial copy"
  echo "reference-source-authority: OK"
else
  echo "reference-source-authority: FAILED"
fi
exit "$fail"
