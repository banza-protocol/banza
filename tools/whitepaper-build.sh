#!/usr/bin/env bash
#
# BANZA Whitepaper — NON-CANONICAL Typst preview renderer.
#
# ⚠  THIS DOES NOT PRODUCE THE PUBLISHED PDF.  The canonical release is built by
#    tools/whitepaper-release.sh  (LaTeX compiled with tectonic → xdvipdfmx).
#
# This command renders a Typst preview for quick visual/structural inspection only. It:
#   • writes ONLY to docs/whitepaper/pdf/typst-preview/ (git-ignored; never a published path);
#   • NEVER writes website/public/whitepaper, docs/whitepaper/pdf/*.pdf, the manifest or the checksums;
#   • keeps the DRAFT — NOT FOR CITATION watermark so the output is unmistakably non-canonical;
#   • produces a DIFFERENT composition (page count/layout) from the canonical LaTeX edition.
#
# Usage:  tools/whitepaper-build.sh        (or: make whitepaper-preview)
# Env:    TYPST=/path/to/typst             (default: typst on PATH)
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TYPST="${TYPST:-typst}"
PINNED="0.12.0"
command -v "$TYPST" >/dev/null 2>&1 || {
  echo "whitepaper-build (Typst preview): typst not found. Install the pinned version: cargo install typst-cli --version $PINNED --locked" >&2
  exit 2; }
have="$("$TYPST" --version 2>/dev/null | awk '{print $2}')"
[ "$have" = "$PINNED" ] || echo "whitepaper-build (Typst preview): note typst $have != pinned $PINNED" >&2

ROOT=docs/whitepaper
OUT="$ROOT/pdf/typst-preview"     # git-ignored; NEVER a published path
mkdir -p "$OUT"

echo "== whitepaper-build — NON-CANONICAL Typst preview (NOT the published edition) =="
echo "   The canonical release is tools/whitepaper-release.sh (LaTeX/tectonic). This preview never publishes."
for lang in en pt; do
  [ -f "$ROOT/content/$lang.json" ] || { echo "  (missing $ROOT/content/$lang.json — skipping $lang)"; continue; }
  out="$OUT/banza-whitepaper-v1.0-$lang.typst-preview.pdf"
  "$TYPST" compile --root "$ROOT" --input lang="$lang" --input draft=1 "$ROOT/typst/whitepaper.typ" "$out"
  echo "  preview: $out ($(wc -c < "$out") bytes) — NON-CANONICAL"
done
echo "whitepaper-build: Typst preview written to $OUT — non-canonical, watermarked, never published."
