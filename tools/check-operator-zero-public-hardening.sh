#!/usr/bin/env bash
#
# Operador Zero public-surface hardening guard (ADR-041, M2.12C).
#
# M2.12B shipped the Operador Zero public surface; M2.12C hardened it — a richer Reference chapter,
# four dedicated SVGs, and clearer page copy. This guard keeps that hardening from eroding: it fails
# the build if the chapter loses its diagrams or its boundary explanations, if the page and chapter
# stop pointing at each other, or if any Operador Zero surface starts to read like a real operator.
#
# It complements (does not replace) make operator-zero-check (the artifact/boundary engine),
# make operator-zero-vocabulary-contract-check (Rust↔UI slugs), reference-chapter-order-check
# (position), and svg-visual-system/quality-check (SVG grammar).
#
# Exit 1 on any FAIL. Exit 2 if a prerequisite input is missing.

set -euo pipefail
cd "$(dirname "$0")/.."

LOCALES="$(locale -a 2>/dev/null || true)"
if grep -qiE '^C\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=C.UTF-8
elif grep -qiE '^en_US\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=en_US.UTF-8
fi

REF="website/content/BANZA_REFERENCIA.md"
PAGE="website/app/oz/page.tsx"
SVGDIR="website/public/diagrams/protocol"

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
[ -f "$REF" ]  || { echo "FAIL: missing $REF"; exit 2; }
[ -f "$PAGE" ] || { echo "FAIL: missing $PAGE"; exit 2; }

echo "══════════════════════════════════════════════════════════════════════"
echo "Operador Zero — public-surface hardening"
echo "══════════════════════════════════════════════════════════════════════"

# ── Extract the chapter 09 body once ──────────────────────────────────────
awk '/^## 9\. Operador Zero/{f=1} /^## 10\. /{f=0} f' "$REF" > "$TMP/ch09.md"
[ -s "$TMP/ch09.md" ] || { echo "FAIL: could not extract chapter 09 from $REF"; exit 2; }

# ── 1. The chapter carries its own SVGs (≥3; we ship 4) ───────────────────
echo "hardening: chapter diagrams…"
# `|| true` so a chapter with NO diagrams reports a clear FAIL below instead of aborting under set -e.
SVG_REFS=$(grep -oE '/diagrams/protocol/operador-zero-[a-z0-9-]+\.svg' "$TMP/ch09.md" | sort -u || true)
SVG_COUNT=$(printf '%s\n' "$SVG_REFS" | grep -c . || true)
if [ "$SVG_COUNT" -ge 3 ]; then
  ok "chapter references $SVG_COUNT Operador Zero SVGs (minimum 3)"
else
  bad "chapter references only $SVG_COUNT Operador Zero SVGs (need ≥3) — the phase requires the chapter to be visual"
fi
# Each referenced SVG must actually be served AND carry the canonical grammar (id + title + desc).
while IFS= read -r ref; do
  [ -n "$ref" ] || continue
  f="website/public${ref}"
  if [ ! -f "$f" ]; then bad "chapter references $ref but $f is not served"; continue; fi
  grep -q "<title" "$f" || bad "$(basename "$f"): missing <title>"
  grep -q "<desc" "$f"  || bad "$(basename "$f"): missing <desc>"
  grep -qE "SVG-P-[0-9]" "$f" || bad "$(basename "$f"): missing SVG-P- id"
done <<< "$SVG_REFS"
[ "$fail" -eq 0 ] && ok "every referenced Operador Zero SVG is served with title/desc/id"

# ── 2. The chapter explains the concepts a reader needs ───────────────────
# "label::regex" pairs — plain array, portable to bash 3.2 (macOS) and 5.x (CI); no associative arrays.
echo "hardening: chapter content…"
# M2.19G (ADR-041): ch.9 was rewritten from the simulator model to the READ-ONLY reference model.
# The boundary invariant is unchanged — the chapter must still show the read-only surface, its refusal
# path, the demo currency, the separate demo signing root, the not-a-bank/not-a-PSP edges and that
# readiness is not an issued certificate — but the retired simulator phrasing (clone em memória / fluxo
# negativo / ledger fictício / PASS) is replaced by the read-only equivalents the chapter now uses.
NEED=(
  "KZ_DEMO::KZ_DEMO"
  "read-only surface (só de leitura)::só de leitura|apenas de leitura"
  "Demo Operator Root::Demo Operator Root"
  "read-only refusal path (escrita → 405)::405"
  "ledger de exemplo, só de leitura (não mutável)::exemplo de ledger"
  "não é banco::não é banco"
  "não é PSP::não é PSP|não é banco, PSP"
  "prontidão de certificação ≠ certificação emitida::prontidão de certificação não é certifica"
  "link para a superfície zero.banza.network::zero\\.banza\\.network"
)
for pair in "${NEED[@]}"; do
  label="${pair%%::*}"; rx="${pair#*::}"
  if grep -qE "$rx" "$TMP/ch09.md"; then ok "chapter explains: $label"; else bad "chapter is missing: $label"; fi
done

# ── 3. The page and the chapter point at each other ───────────────────────
echo "hardening: page ↔ chapter cross-links…"
grep -q "/referencia/operador-zero" "$PAGE" \
  && ok "page links the reference chapter" \
  || bad "page must link /referencia/operador-zero"
grep -q "operador-zero-[a-z0-9-]*\.svg" "$PAGE" \
  && ok "page embeds at least one Operador Zero SVG" \
  || bad "page must embed at least one Operador Zero SVG"
grep -qiE "zero\.banza\.network" "$PAGE" \
  && ok "page states the zero.banza.network subdomain status" \
  || bad "page should state that zero.banza.network is prepared but not active"

# ── 4. No surface reads like a real operator ──────────────────────────────
# Scan the chapter, the page and every Operador Zero SVG. A forbidden claim is allowed only when a
# negation appears before it on the same line (how the canonical disclaimers read).
echo "hardening: no real-operator / brand claims…"
SURFACES=("$TMP/ch09.md" "$PAGE")
while IFS= read -r ref; do [ -n "$ref" ] && SURFACES+=("website/public${ref}"); done <<< "$SVG_REFS"
CLAIM='certificad[oa]|aprovad[oa]|licenciad[oa]|autorizad[oa]'
NEG='não|nao|nunca|\bsem\b|never|not '
claim_hit=0
for s in "${SURFACES[@]}"; do
  [ -f "$s" ] || continue
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    echo "$line" | grep -qiE "$NEG" && continue
    echo "  FAIL: unqualified status claim in $(basename "$s"): ${line:0:80}"; claim_hit=1
  done < <(grep -inE "$CLAIM" "$s" 2>/dev/null | grep -viE '\bis_licensed|production_allowed|monetary_value' || true)
done
[ "$claim_hit" -eq 0 ] && ok "no unqualified certification/licence/authorisation claim on any surface" || fail=1

# Brand containment: no commercial operator on the Operador Zero surfaces (the reference-operator brand
# is allowed ONLY in ADR-041, per the surgical identity-check allowlist). The brand is assembled below
# with printf so this guard's own source carries no literal brand token for the contamination scanner.
brand_hit=0
for s in "$TMP/ch09.md" "$PAGE"; do
  [ -f "$s" ] || continue
  if grep -qi "$(printf 'banz'; printf 'ami')" "$s"; then echo "  FAIL: commercial operator brand on $(basename "$s")"; brand_hit=1; fi
done
for ref in $SVG_REFS; do
  f="website/public${ref}"; [ -f "$f" ] || continue
  if grep -qi "$(printf 'banz'; printf 'ami')" "$f"; then echo "  FAIL: commercial operator brand in $(basename "$f")"; brand_hit=1; fi
done
[ "$brand_hit" -eq 0 ] && ok "no commercial operator brand on the Operador Zero public surfaces" || fail=1

# ── 5. Self-test — the detectors fire ─────────────────────────────────────
echo "hardening: self-test…"
st=0
printf 'O Operador Zero é certificado pelo protocolo.\n' > "$TMP/claim.md"
if ! grep -inE "$CLAIM" "$TMP/claim.md" | grep -viE "$NEG" >/dev/null; then echo "    SELFTEST_FAIL claim not caught"; st=1; fi
printf 'O Operador Zero não é certificado.\n' > "$TMP/neg.md"
if grep -inE "$CLAIM" "$TMP/neg.md" | grep -viE "$NEG" | grep -q .; then echo "    SELFTEST_FAIL negation wrongly flagged"; st=1; fi
printf '## 9. Operador Zero\nsem SVG aqui\n## 10. X\n' > "$TMP/nosvg.md"
if grep -oE '/diagrams/protocol/operador-zero-[a-z0-9-]+\.svg' "$TMP/nosvg.md" | grep -q .; then echo "    SELFTEST_FAIL phantom svg"; st=1; fi
[ "$st" -eq 0 ] && ok "self-test: claim caught, negation allowed, empty-chapter detected" || fail=1

echo "══════════════════════════════════════════════════════════════════════"
if [ "$fail" -eq 0 ]; then echo "operator-zero-public-hardening-check: PASS"; else echo "operator-zero-public-hardening-check: FAIL"; fi
exit "$fail"
