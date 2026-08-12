#!/usr/bin/env bash
#
# BanzAI canonical-architecture framing guard (M2.19G.6, ADR-075 — supersedes the M2.19G.5C/ADR-071
# "frozen archive" framing).
#
# ADR-075 makes THIS repo the single, active source of BanzAI (services/banzai-api + engines/banzai-*).
# The separate banza-protocol/banzai repository is being PERMANENTLY DELETED — it must NOT be presented
# on active surfaces as an archive / frozen / historical / legacy source, and must NOT be linked (a link
# to a repository that will be deleted is a broken promise). The runtime must never be framed as a "mock
# façade", and the old repo must never be framed as the canonical/authoritative BanzAI core.
#
# Over services/banzai-api/README.md, docs/governance/BANZAI_COMPONENT_BOUNDARY_2026_07.md,
# services/banzai-api/src/knowledge.js, website/content/BANZA_REFERENCIA.md, website/lib/site.ts,
# CLAUDE.md, README.md, the PT/EN reference mirrors and the conformance guide:
#   1. FAILS on "mock façade" / "demonstration facade" framing.
#   2. FAILS on any claim (negation-aware) that banza-protocol/banzai is the canonical/authoritative core.
#   3. asserts README + COMPONENT_BOUNDARY name services/banzai-api as the canonical runtime AND BANZA as
#      the sole active BanzAI source.
#   4. FAILS on any link to banza-protocol/banzai OR any archive/frozen/historical/legacy framing of it.
# ADR history (decisions/adr/**) and governance closure reports are exempt (not scanned).
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

README="services/banzai-api/README.md"
BOUNDARY="docs/governance/BANZAI_COMPONENT_BOUNDARY_2026_07.md"
KNOWLEDGE="services/banzai-api/src/knowledge.js"
REFERENCIA="website/content/BANZA_REFERENCIA.md"
SITE="website/lib/site.ts"
CLAUDEMD="CLAUDE.md"
ROOT_README="README.md"
REF_PT="docs/reference/pt/completa.md"
REF_EN="docs/reference/en/complete.md"
CONFORMANCE="docs/guides/conformance.md"
FILES=("$README" "$BOUNDARY" "$KNOWLEDGE" "$REFERENCIA" "$SITE" "$CLAUDEMD" "$ROOT_README" "$REF_PT" "$REF_EN" "$CONFORMANCE")

fail=0
ok() { printf 'PASS  %s\n' "$1"; }
fl() { printf 'FAIL  %s\n' "$1"; fail=1; }

# Plain literal alternations only (no multibyte bracket classes — BSD grep would miss them).
FRAMING='mock façade|mock facade|mock/demonstration façade|mock/demonstration facade|demonstration façade|demonstration facade'
NEG='não|nao|nunca|never|\bnot\b|\bsem\b|não existe|no separate|sole active|apenas|only'
FWD='banza-protocol/banzai[^.]{0,70}(canónic|canonic|authoritative|is the core|is the canonical|deterministic core|fonte de verdade|source of truth)'
REV='(canónic|canonic|authoritative|deterministic core|fonte de verdade|source of truth)[^.]{0,25}banza-protocol/banzai'
OLD_LINK='banza-protocol/banzai\)'
ARCHIVE='banza-protocol/banzai[^.]{0,80}(frozen|archive|arquivo|congelad|historical|historico|histórico|legacy|legad)'

# ── Self-test ─────────────────────────────────────────────────────────────────────────────────────
st=0
echo 'banzai-api is a mock façade for demos' | grep -qiE "$FRAMING" || { echo "SELF-TEST BROKEN: façade detector" >&2; st=1; }
echo 'banza-protocol/banzai is the canonical BanzAI core' | grep -qE "$FWD" || { echo "SELF-TEST BROKEN: canonical-core detector" >&2; st=1; }
# The sample old-repo URL is assembled from parts so no literal old-repo link sits in this guard.
_ol="banza-protocol/banzai"
echo "see [$_ol](https://github.com/$_ol) for details" | grep -qE "$OLD_LINK" || { echo "SELF-TEST BROKEN: old-repo-link detector" >&2; st=1; }
echo 'banza-protocol/banzai is a frozen historical archive' | grep -qiE "$ARCHIVE" || { echo "SELF-TEST BROKEN: archive-framing detector" >&2; st=1; }
echo 'active BanzAI development lives entirely in this repository' | grep -qiE "$ARCHIVE" && { echo "SELF-TEST BROKEN: archive detector false-positive" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "banzai-canonical-architecture-framing: guard self-test FAILED"; exit 2; }

echo "== [1/4] no 'mock façade' / 'demonstration facade' framing =="
for f in "${FILES[@]}"; do
  [ -f "$f" ] || { fl "missing target file: $f"; continue; }
  hits="$(grep -niE "$FRAMING" "$f" || true)"
  [ -n "$hits" ] && { fl "retired 'mock/demonstration façade' framing in $f:"; echo "$hits" | sed 's/^/      /'; }
done
[ "$fail" -eq 0 ] && ok "no 'mock façade' framing in any target file"

echo "== [2/4] banza-protocol/banzai never framed as the canonical/authoritative core =="
f2=0
for f in "${FILES[@]}"; do
  [ -f "$f" ] || continue
  hits="$(grep -niE "$FWD|$REV" "$f" 2>/dev/null | grep -viE "$NEG" || true)"
  [ -n "$hits" ] && { fl "banza-protocol/banzai framed as the canonical core in $f:"; echo "$hits" | sed 's/^/      /'; f2=1; }
done
[ "$f2" -eq 0 ] && ok "banza-protocol/banzai is never claimed as the canonical/authoritative core"

echo "== [3/4] active copy names services/banzai-api as the canonical runtime + BANZA as the sole active source =="
if grep -qiE 'canonical BanzAI runtime|is the canonical runtime' "$README" && grep -qiE 'sole active BanzAI source|no separate BanzAI repository' "$README"; then
  ok "$README names this service as the canonical runtime + the sole active source"
else
  fl "$README must name services/banzai-api as the canonical runtime + the sole active BanzAI source"
fi
if grep -qiE 'is the canonical runtime' "$BOUNDARY" && grep -qiE 'no separate BanzAI repository|active BanzAI development lives entirely|this monorepo only' "$BOUNDARY"; then
  ok "$BOUNDARY names services/banzai-api as the canonical runtime + BANZA as the only active source"
else
  fl "$BOUNDARY must name services/banzai-api as the canonical runtime + BANZA as the only active source"
fi

echo "== [4/4] no link to — and no archive/frozen/historical framing of — banza-protocol/banzai =="
f4=0
for f in "${FILES[@]}"; do
  [ -f "$f" ] || continue
  links="$(grep -niE "$OLD_LINK" "$f" 2>/dev/null || true)"
  [ -n "$links" ] && { fl "link to the to-be-deleted banza-protocol/banzai in $f:"; echo "$links" | sed 's/^/      /'; f4=1; }
  arch="$(grep -niE "$ARCHIVE" "$f" 2>/dev/null || true)"
  [ -n "$arch" ] && { fl "archive/frozen/historical framing of banza-protocol/banzai in $f:"; echo "$arch" | sed 's/^/      /'; f4=1; }
done
[ "$f4" -eq 0 ] && ok "no links to and no archive framing of banza-protocol/banzai on active surfaces"

if [ "$fail" -ne 0 ]; then
  echo; echo "banzai-canonical-architecture-framing: FAIL — canonical BanzAI framing drifted (ADR-075)."; exit 1
fi
echo
echo "banzai-canonical-architecture-framing: ✓ services/banzai-api = canonical runtime; BANZA = sole active BanzAI source; separate repo neither linked nor framed as an archive (ADR-075)"
