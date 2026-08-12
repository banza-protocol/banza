#!/usr/bin/env bash
# check-standalone-roadmap-surface.sh — Single canonical protocol-evolution surface
#
# BANZA must not maintain two competing public narratives about how the protocol evolves. The single
# canonical explanation is the reference chapter §14 "Evolução do Protocolo" at /referencia/roteiro
# (possibilities ≠ promises; current state → §5; change process → §11; no milestones/dates/first
# operator/first certification/SDK/production roadmap). The older standalone /roteiro page is RETIRED:
# it permanent-redirects to the canonical chapter and no longer serves an independent roadmap document.
#
# This guard protects the INTENT (no active public roadmap duplicate), not merely "a redirect exists":
#   1. no standalone /roteiro page (website/app/roteiro/page.tsx absent);
#   2. next.config permanent-redirects /roteiro → /referencia/roteiro;
#   3. the older /roadmap alias does NOT chain through /roteiro (it targets the canon directly);
#   4. the sitemap does not list /roteiro as an independent document;
#   5. no active nav/home surface links to the standalone /roteiro as independent content;
#   6. the canonical evolution surface still exists: §14 "Evolução do Protocolo" (slug "roteiro").
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
fail() { echo "FAIL: $1" >&2; exit 1; }
ok() { echo "  ok: $1"; }

CANON_ROUTE="/referencia/roteiro"

run_checks() {
  local root="$1"
  local nextcfg="$root/website/next.config.mjs"
  local sitemap="$root/website/app/sitemap.ts"
  local corpus="$root/website/content/BANZA_REFERENCIA.md"
  local refts="$root/website/lib/reference.ts"

  # 1. No standalone /roteiro page.
  [ ! -e "$root/website/app/roteiro/page.tsx" ] || fail "website/app/roteiro/page.tsx must not exist — the standalone roadmap surface is retired (redirect only)"
  ok "no standalone /roteiro page (retired)"

  # 2. Permanent redirect /roteiro -> /referencia/roteiro.
  [ -f "$nextcfg" ] || fail "missing $nextcfg"
  grep -Eq 'source:[[:space:]]*"/roteiro"[[:space:]]*,[[:space:]]*destination:[[:space:]]*"'"$CANON_ROUTE"'"[[:space:]]*,[[:space:]]*permanent:[[:space:]]*true' "$nextcfg" \
    || fail "next.config must permanent-redirect /roteiro -> $CANON_ROUTE"
  ok "/roteiro permanent-redirects to the canonical chapter"

  # 3. /roadmap alias must NOT chain through /roteiro (avoid a redirect hop).
  if grep -Eq 'source:[[:space:]]*"/roadmap"' "$nextcfg"; then
    grep -Eq 'source:[[:space:]]*"/roadmap"[[:space:]]*,[[:space:]]*destination:[[:space:]]*"/roteiro"' "$nextcfg" \
      && fail "/roadmap must not chain through the retired /roteiro — point it directly at $CANON_ROUTE"
    ok "/roadmap does not chain through the retired /roteiro"
  fi

  # 4. sitemap must not list /roteiro as an independent document.
  [ -f "$sitemap" ] || fail "missing $sitemap"
  grep -Eq '"/roteiro"' "$sitemap" && fail "sitemap must not list /roteiro as a standalone document" || true
  ok "sitemap does not list the retired /roteiro"

  # 5. No active nav/home surface links to the standalone /roteiro as independent content.
  #    (/referencia/roteiro — the canonical chapter — is allowed and expected.)
  local navhits
  navhits=$(grep -rInE '["'"'"'(]/roteiro(["'"'"'#? )]|$)' \
      "$root/website/lib/site.ts" "$root/website/app/page.tsx" "$root/website/components" 2>/dev/null \
      | grep -vE '/referencia/roteiro' || true)
  if [ -n "$navhits" ]; then
    echo "$navhits" >&2
    fail "an active nav/home surface links to the retired standalone /roteiro — repoint to $CANON_ROUTE"
  fi
  ok "no active nav/home link targets the standalone /roteiro"

  # 6. The canonical evolution surface still exists.
  [ -f "$corpus" ] && grep -Eq '^## 14\. Evolução do Protocolo' "$corpus" \
    || fail "the canonical chapter §14 'Evolução do Protocolo' must exist in the reference corpus"
  [ -f "$refts" ] && grep -Eq 'slug:[[:space:]]*"roteiro"' "$refts" \
    || fail "the reference chapter registry must keep slug \"roteiro\" (route $CANON_ROUTE)"
  ok "canonical evolution surface intact — §14 'Evolução do Protocolo' at $CANON_ROUTE"

  # 7. No served milestone-roadmap SVG. Everything under website/public is served by direct URL, so a
  #    lingering M1–M6 timeline there is a second public evolution narrative even if unlinked. A
  #    milestone-roadmap SVG is one whose text is the retired "Roteiro M1…" form OR that enumerates the
  #    full M1..M6 ladder (both M1 and M6 milestone tokens present).
  local pubdiag="$root/website/public/diagrams"
  if [ -d "$pubdiag" ]; then
    local svghits
    svghits=$(grep -rilE 'Roteiro M[1-9]|\bM1\b.*\bM6\b|\bM6\b.*\bM1\b' "$pubdiag" --include='*.svg' 2>/dev/null || true)
    if [ -n "$svghits" ]; then
      echo "$svghits" >&2
      fail "a served milestone-roadmap SVG survives under website/public/diagrams — a second public evolution narrative; retire it (evolution lives only in §14)"
    fi
  fi
  ok "no served milestone-roadmap SVG under website/public/diagrams"

  # 8. No rogue standalone roadmap PAGE at any route. The guard must protect the intent — a single
  #    canonical evolution surface — not merely the /roteiro path. A standalone roadmap page announces
  #    itself with a roadmap eyebrow/title ("ROTEIRO DO PROTOCOLO" / "ROADMAP DO PROTOCOLO"); that is
  #    the precise signal, distinct from legitimate current-state pages that mention milestone tokens
  #    like "(M2)"/"(M3)" in passing (e.g. /operadores' honest "publicado post-M2/M3" note). The
  #    reference chapters (§14 is corpus-driven, with its own durability guard) are excluded.
  local pagehits
  pagehits=$(grep -rilE 'ROTEIRO DO PROTOCOLO|ROADMAP DO PROTOCOLO' \
      "$root/website/app" --include='page.tsx' 2>/dev/null | grep -vE '/website/app/referencia/' || true)
  if [ -n "$pagehits" ]; then
    echo "$pagehits" >&2
    fail "a standalone protocol-roadmap page survives at a non-reference route — evolution has a single canonical surface (§14 /referencia/roteiro)"
  fi
  ok "no rogue standalone roadmap page at any route"
}

# --- self-test: a synthetic tree that still ships a standalone /roteiro page MUST fail ---
selftest() {
  local tmp; tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN
  mkdir -p "$tmp/website/app/roteiro" "$tmp/website/app" "$tmp/website/lib" "$tmp/website/content" "$tmp/website/components"
  # green skeleton
  cat > "$tmp/website/next.config.mjs" <<EOF
{ source: "/roteiro", destination: "$CANON_ROUTE", permanent: true },
{ source: "/roadmap", destination: "$CANON_ROUTE", permanent: true },
EOF
  echo 'const ROUTES = ["/estado","/referencia"];' > "$tmp/website/app/sitemap.ts"
  echo '## 14. Evolução do Protocolo' > "$tmp/website/content/BANZA_REFERENCIA.md"
  echo '{ num: 14, slug: "roteiro" },' > "$tmp/website/lib/reference.ts"
  echo 'export default function P(){return null}' > "$tmp/website/lib/site.ts"
  echo 'export default function H(){return null}' > "$tmp/website/app/page.tsx"
  mkdir -p "$tmp/website/public/diagrams/protocol"
  # scenario A — a standalone /roteiro page still exists → must fail
  echo 'export default function R(){return null}' > "$tmp/website/app/roteiro/page.tsx"
  if ( run_checks "$tmp" ) >/dev/null 2>&1; then
    fail "SELF-TEST regression: guard passed a tree that still ships a standalone /roteiro page"
  fi
  rm -rf "$tmp/website/app/roteiro"
  # scenario B — a served milestone-roadmap SVG survives → must fail (check 7)
  printf '<svg><title>Roteiro M1–M6 do Protocolo</title><desc>M1 M2 M3 M4 M5 M6</desc></svg>' \
    > "$tmp/website/public/diagrams/protocol/rogue-roadmap.svg"
  if ( run_checks "$tmp" ) >/dev/null 2>&1; then
    fail "SELF-TEST regression: guard passed a tree with a served milestone-roadmap SVG"
  fi
  rm -f "$tmp/website/public/diagrams/protocol/rogue-roadmap.svg"
  # scenario C — a rogue roadmap page at another route survives → must fail (check 8)
  mkdir -p "$tmp/website/app/evolucao"
  echo 'export const e="ROTEIRO DO PROTOCOLO"; export default function E(){return null}' > "$tmp/website/app/evolucao/page.tsx"
  if ( run_checks "$tmp" ) >/dev/null 2>&1; then
    fail "SELF-TEST regression: guard passed a tree with a rogue standalone roadmap page"
  fi
  rm -rf "$tmp/website/app/evolucao"
  ok "self-test holds (standalone /roteiro page, served milestone-roadmap SVG, and rogue roadmap page are each rejected)"
}

echo "== standalone-roadmap-surface-check (single canonical evolution surface) =="
selftest
run_checks "$ROOT"
echo "STANDALONE ROADMAP SURFACE CHECK PASSED ✅"
