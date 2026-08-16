#!/usr/bin/env bash
# assert-reference-svgs.sh — fail if any SVG referenced by the protocol Reference
# is absent from the website's public assets.
#
# Regression guard for the P1 found in the 2026-07 final consistency audit: SVGs
# referenced in docs/reference/pt/completa.md existed under website/public but were never
# copied to website/public, so they 404'd in production (broken image icons
# in §6 Certificação). This asserts every referenced diagram is actually served.
#
# Scope: referenced-but-absent only. It does NOT flag orphan SVGs (present but
# unreferenced). No network access — pure filesystem check against the build input.
#
# Usage: assert-reference-svgs.sh [reference-markdown] [website-public-dir]
#   defaults: docs/reference/pt/BANZA_REFERENCIA.md  website/public

set -euo pipefail

REF="${1:-docs/reference/pt/BANZA_REFERENCIA.md}"
PUBLIC="${2:-website/public}"

if [ ! -f "$REF" ]; then
  echo "ERROR: reference markdown not found: $REF" >&2
  exit 1
fi
if [ ! -d "$PUBLIC" ]; then
  echo "ERROR: website public dir not found: $PUBLIC" >&2
  exit 1
fi

# Extract the unique set of /diagrams/<cat>/<name>.svg paths referenced in the
# markdown (image syntax or inline). Fence-agnostic: a diagram path is a diagram
# path wherever it appears. Portable to bash 3.2 (no mapfile).
REFERENCED=()
while IFS= read -r line; do
  [ -n "$line" ] && REFERENCED+=("$line")
done < <(grep -oE '/diagrams/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+\.svg' "$REF" | sort -u)

if [ ${#REFERENCED[@]} -eq 0 ]; then
  echo "ERROR: no /diagrams/*.svg references found in $REF (unexpected)" >&2
  exit 1
fi

printf "\n"
printf "══════════════════════════════════════════════════════════════════════\n"
printf "BANZA Reference SVG Assertion\n"
printf "══════════════════════════════════════════════════════════════════════\n"
printf "Reference:      %s\n" "$REF"
printf "Website public: %s\n" "$PUBLIC"
printf "Referenced SVGs: %d\n\n" "${#REFERENCED[@]}"

MISSING=()
for path in "${REFERENCED[@]}"; do
  if [ -f "$PUBLIC$path" ]; then
    printf "  ✓  %s\n" "$path"
  else
    printf "  ✗  MISSING: %s\n" "$path" >&2
    MISSING+=("$path")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  printf "\n"
  printf "══════════════════════════════════════════════════════════════════════\n"
  printf "FAIL: %d referenced diagram(s) absent from %s\n" "${#MISSING[@]}" "$PUBLIC" >&2
  printf "Copy them from website/public/diagrams/ (single source) and rebuild.\n" >&2
  printf "══════════════════════════════════════════════════════════════════════\n"
  exit 1
fi

printf "\n"
printf "══════════════════════════════════════════════════════════════════════\n"
printf "PASS: all %d referenced diagrams present in the website assets\n" "${#REFERENCED[@]}"
printf "══════════════════════════════════════════════════════════════════════\n"
printf "\n"
