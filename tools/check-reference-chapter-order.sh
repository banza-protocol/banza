#!/usr/bin/env bash
#
# BANZA Reference chapter-order guard (M2.12B).
#
# The reference is read in order. A chapter's POSITION is an argument about how the protocol is
# understood, not a layout preference: chapter 8 says who implements the protocol, 9 shows a complete
# implementation running, and 10 federates the operators and artifacts that 8 and 9 establish. Move
# Operador Zero to the end and it reads as an appendix; move it before Operadores and it describes a
# simulator of something the reader has not met yet.
#
# The order lives in TWO places that must never disagree — the numbered markdown source and
# CHAPTER_DEFS — plus the Índice inside the source. This checks all three against each other.
#
# Exit 1 on any FAIL. Exit 2 if an input is missing.

set -euo pipefail
cd "$(dirname "$0")/.."

LOCALES="$(locale -a 2>/dev/null || true)"
if grep -qiE '^C\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=C.UTF-8
elif grep -qiE '^en_US\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=en_US.UTF-8
fi

SRC="docs/reference/pt/BANZA_REFERENCIA.md"
DEFS="website/lib/reference.ts"

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
[ -f "$SRC" ]  || { echo "FAIL: missing $SRC"; exit 2; }
[ -f "$DEFS" ] || { echo "FAIL: missing $DEFS"; exit 2; }

# ── 1. The canonical order, as decided ─────────────────────────────────────
CANON="o-que-e porque-existe principios arquitectura estado-protocolar confianca certificacao operadores operador-zero federacao governacao banzai programadores roteiro faq"

echo "reference-chapter-order: CHAPTER_DEFS…"
grep -oE '\{ num: [0-9]+, slug: "[a-z0-9-]+"' "$DEFS" | sed 's/.*slug: "//; s/"//' > "$TMP/defs.txt" || true
DEF_ORDER=$(tr '\n' ' ' < "$TMP/defs.txt" | sed 's/ $//')
[ "$DEF_ORDER" = "$CANON" ] \
  && ok "CHAPTER_DEFS is in the canonical order ($(wc -l < "$TMP/defs.txt" | tr -d ' ') chapters)" \
  || bad "CHAPTER_DEFS order is wrong.
        expected: $CANON
        actual:   $DEF_ORDER"

# Numbers must be 1..N with no gaps and no duplicates.
grep -oE '\{ num: [0-9]+' "$DEFS" | grep -oE '[0-9]+' > "$TMP/nums.txt" || true
EXPECTED=$(seq 1 "$(wc -l < "$TMP/nums.txt" | tr -d ' ')" | tr '\n' ' ')
ACTUAL=$(tr '\n' ' ' < "$TMP/nums.txt")
[ "$ACTUAL" = "$EXPECTED" ] \
  && ok "chapter numbers are 1..N with no gaps or duplicates" \
  || bad "chapter numbers are wrong: $ACTUAL"

# ── 2. The markdown source agrees ──────────────────────────────────────────
echo "reference-chapter-order: markdown source…"

grep -oE '^## [0-9]+\. .+$' "$SRC" > "$TMP/heads.txt" || true
HEAD_N=$(wc -l < "$TMP/heads.txt" | tr -d ' ')
DEF_N=$(wc -l < "$TMP/defs.txt" | tr -d ' ')
[ "$HEAD_N" -eq "$DEF_N" ] \
  && ok "the source has $HEAD_N numbered chapters, matching CHAPTER_DEFS" \
  || bad "the source has $HEAD_N numbered chapters but CHAPTER_DEFS has $DEF_N"

dupes=$(grep -oE '^## [0-9]+\.' "$TMP/heads.txt" | sort | uniq -d || true)
[ -z "$dupes" ] \
  && ok "no duplicated chapter number in the source" \
  || bad "duplicated chapter number(s) in $SRC: $dupes"

# ── 3. Operador Zero, specifically ─────────────────────────────────────────
echo "reference-chapter-order: Operador Zero's position…"

grep -q '^## 9\. Operador Zero$' "$SRC" \
  && ok "Operador Zero is chapter 9 in the source" \
  || bad "$SRC must have '## 9. Operador Zero'"
grep -q '^## 8\. Operadores$' "$SRC" \
  && ok "Operadores is chapter 8 (immediately before)" \
  || bad "$SRC must have '## 8. Operadores'"
grep -q '^## 10\. Federação$' "$SRC" \
  && ok "Federação is chapter 10 (immediately after)" \
  || bad "$SRC must have '## 10. Federação' — Federação moves AFTER Operador Zero"

# It must not be last.
LAST=$(tail -1 "$TMP/defs.txt")
[ "$LAST" != "operador-zero" ] \
  && ok "Operador Zero is not the last chapter" \
  || bad "Operador Zero is last — it must sit between Operadores and Federação"

# ── 4. The Índice inside the source agrees with the headings ───────────────
echo "reference-chapter-order: Índice…"

sed -n '/^## Índice$/,/^---$/p' "$SRC" | grep -oE '^[0-9]+\. \[[^]]+\]' \
  | sed 's/^[0-9]*\. \[//; s/\]$//' > "$TMP/idx.txt" || true
sed 's/^## [0-9]*\. //' "$TMP/heads.txt" > "$TMP/headtitles.txt"
if diff -q "$TMP/idx.txt" "$TMP/headtitles.txt" >/dev/null 2>&1; then
  ok "the Índice lists every chapter, in the same order as the headings"
else
  bad "the Índice disagrees with the chapter headings:"
  diff "$TMP/idx.txt" "$TMP/headtitles.txt" | head -8 | sed 's/^/        /'
fi

# ── 5. Every in-document anchor resolves ───────────────────────────────────
# A renumbering that updates the §N text but not the (#n-slug) href leaves navigation pointing at
# the wrong chapter — silently, because the link still works.
echo "reference-chapter-order: internal anchors…"

node -e '
const fs = require("fs");
const s = fs.readFileSync(process.argv[1], "utf8");
const slug = (t) => t.trim().toLowerCase().replace(/[—–]/g, " ")
  .replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "");
const heads = new Set([...s.matchAll(/^#{2,4} (.+)$/gm)].map((m) => slug(m[1])));
const broken = [...s.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]).filter((a) => !heads.has(a));
if (broken.length) {
  console.log("  FAIL: " + new Set(broken).size + " broken anchor(s): " + [...new Set(broken)].slice(0,6).join(", "));
  process.exit(1);
}
console.log("  ok: every internal anchor resolves to a heading");
' "$SRC" || fail=1

# ── 6. The chapter's own content ───────────────────────────────────────────
echo "reference-chapter-order: chapter content…"

awk '/^## 9\. Operador Zero$/{f=1} /^## 10\./{f=0} f' "$SRC" > "$TMP/ch.txt"
[ -s "$TMP/ch.txt" ] && ok "the chapter has a body" || bad "the Operador Zero chapter is empty"

# M2.19G boundary (ADR-035): the read-only Operador Zero states its institutional edge as a single
# categorical sentence — "não é banco, PSP, carteira, operador financeiro nem prestador de serviços
# financeiros, e não movimenta dinheiro real" — and uses the invented demo currency KZ_DEMO. The retired
# "dinheiro fictício"/"simulador" framing is gone; the real invariant preserved here is that the chapter
# names the not-a-financial-institution boundary AND states it moves no real money, in the demo currency.
for phrase in "não é banco, PSP, carteira" "não movimenta dinheiro real" "KZ_DEMO"; do
  grep -qF "$phrase" "$TMP/ch.txt" \
    && ok "the chapter states: $phrase" \
    || bad "the Operador Zero chapter must state '$phrase'"
done

# It may never claim status.
claim=0
while IFS= read -r line; do
  low=$(printf '%s' "$line" | tr '[:upper:]' '[:lower:]')
  case "$low" in
    *certificad*|*aprovad*|*licenciad*|*autorizad*)
      case "$low" in *não*|*nao*|*nunca*|*sem\ *|*nenhum*) ;; *) bad "chapter claims status: $line"; claim=1 ;; esac ;;
  esac
done < "$TMP/ch.txt"
[ "$claim" -eq 0 ] && ok "the chapter claims no status"

# The institutional comparison belongs to ADR-035 alone.
BRAND="$(printf 'banz'; printf 'ami')"
grep -qi "$BRAND" "$TMP/ch.txt" \
  && bad "the Operador Zero chapter names a commercial operator — only ADR-035 may" \
  || ok "the chapter names no commercial operator"

# ── 7. Self-test ───────────────────────────────────────────────────────────
echo "reference-chapter-order: self-test…"

printf '## 8. Operadores\n## 9. Federação\n' > "$TMP/wrong.md"
grep -q '^## 9\. Operador Zero$' "$TMP/wrong.md" \
  && bad "self-test: a source WITHOUT the chapter was accepted" \
  || ok "self-test: a missing Operador Zero chapter is detected"

printf 'a b c\n' > "$TMP/o1"; printf 'a c b\n' > "$TMP/o2"
diff -q "$TMP/o1" "$TMP/o2" >/dev/null 2>&1 \
  && bad "self-test: a reordered list compared equal" \
  || ok "self-test: a reordered list is detected"

echo
if [ "$fail" -ne 0 ]; then echo "reference-chapter-order-check: FAIL"; exit 1; fi
echo "reference-chapter-order-check: PASS"
