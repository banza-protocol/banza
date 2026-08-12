#!/usr/bin/env bash
#
# M2.19G.2 — /o-que-e route removal guard (§27-28 route rules + §42 legacy metrics).
#
# The standalone /o-que-e route was DELETED. Its single canonical introductory-definition replacement is
# the reference chapter /referencia/o-que-e. GET /o-que-e must 404 — there must be no redirect, rewrite,
# alias, sitemap entry, service-worker fallback or internal link that keeps it alive, and every
# "Ler a referência" affordance must point DIRECTLY at /referencia.
#
# This guard asserts:
#   [A] website/app/o-que-e is absent.
#   [B] no redirect/rewrite/alias uses /o-que-e as a SOURCE (next.config.mjs, middleware.ts, nginx conf.d).
#   [C] /o-que-e is absent from website/app/sitemap.ts.
#   [D] no service-worker/precache manifest references /o-que-e.
#   [E] ZERO internal links href="/o-que-e" in website/app|components|lib
#       (allow /referencia/o-que-e and the reference-chapter slug "o-que-e").
#   [F] every "Ler a referência" (website + navPrimary + footer) → /referencia.
#   [G] /referencia/o-que-e is the SINGLE canonical introductory definition (chapter slug "o-que-e" once).
#   [H] the BanzAI grounding base carries no /o-que-e as a source/href/citation URL
#       (allow /referencia/o-que-e and the false-positive anchor "o-que-existe-no-suficiente").
#
# Bare-route/href/quoted-route matching uses perl (portable lookbehind/lookahead) so /referencia/o-que-e,
# /o-que-e-o-banza and the o-que-existe-* anchor are never false-flagged.
# Exit 1 on any violation, 2 on self-test failure.

set -euo pipefail
cd "$(dirname "$0")/.."
if locale -a 2>/dev/null | grep -qiE '^C\.UTF-?8$'; then export LC_ALL=C.UTF-8
elif locale -a 2>/dev/null | grep -qiE '^en_US\.UTF-?8$'; then export LC_ALL=en_US.UTF-8
fi

fail=0
flag() { echo "  NEEDS_FIX: $1"; fail=1; }

# vis(): strip block + line comments (protect https://) — the rendered/source stream (no prose comments).
vis() { perl -0777 -pe 's{/\*.*?\*/}{}gs; s{(^|[^:])//[^\n]*}{$1}g' "$1"; }

# scan_perl RX FILE... : print "FILE:LINE: <line>" for every line matching perl regex RX. $. resets per file.
scan_perl() {
  local rx="$1"; shift
  [ "$#" -gt 0 ] || return 0
  RX="$rx" perl -ne 'BEGIN{$re=qr/$ENV{RX}/} print "$ARGV:$.: $_" if /$re/; close ARGV if eof' "$@" 2>/dev/null || true
}
# scan_vis RX FILE : same, but over the COMMENT-STRIPPED content of a single file.
scan_vis() {
  local rx="$1" file="$2"
  [ -f "$file" ] || return 0
  vis "$file" | RX="$rx" perl -ne 'BEGIN{$re=qr/$ENV{RX}/} print "'"$file"':$.: $_" if /$re/' || true
}
# pmatch RX STRING : exit 0 iff STRING matches perl regex RX (portable; BSD grep lacks -P).
pmatch() { RX="$1" perl -e 'exit(($ARGV[0] =~ /$ENV{RX}/) ? 0 : 1)' "$2"; }

# Detectors (perl). BARE = a bare legacy /o-que-e route; HREF = an href/source/quoted route value.
BARE='(?<!referencia)/o-que-e(?![a-z-])'
HREF='(href|src|source|from|url|route|path|destination)\s*[:=]\s*["'"'"']/o-que-e(?![a-z-])'
QUOTED='["'"'"']/o-que-e(?![a-z-])'

# ── Self-test ──
st=0
pmatch "$HREF" 'href="/o-que-e"'           || { echo "SELFTEST_FAIL HREF must fire on href=\"/o-que-e\""; st=1; }
pmatch "$HREF" 'href="/referencia/o-que-e"' && { echo "SELFTEST_FAIL HREF must NOT fire on /referencia/o-que-e"; st=1; }
pmatch "$HREF" '{ source: "/o-que-e-o-banza"' && { echo "SELFTEST_FAIL HREF must NOT fire on /o-que-e-o-banza"; st=1; }
pmatch "$BARE" '#o-que-existe-no-suficiente' && { echo "SELFTEST_FAIL BARE must NOT fire on the o-que-existe anchor"; st=1; }
pmatch "$BARE" 'GET /o-que-e HTTP'         || { echo "SELFTEST_FAIL BARE must fire on a bare /o-que-e route"; st=1; }
pmatch "$BARE" 'ver /referencia/o-que-e'    && { echo "SELFTEST_FAIL BARE must NOT fire on /referencia/o-que-e"; st=1; }
[ "$st" -eq 0 ] || { echo "m2-19g2-o-que-e-removal: SELF-TEST FAILED" >&2; exit 2; }

echo "check-m2-19g2-o-que-e-removal: auditing the /o-que-e route removal…"

# ── [A] the route directory is gone. ──
[ -d "website/app/o-que-e" ] && flag "website/app/o-que-e must be deleted (route removed)" || true
[ -f "website/app/o-que-e/page.tsx" ] && flag "the /o-que-e page must be deleted" || true

# ── [B] no redirect/rewrite/alias with /o-que-e as a SOURCE. ──
NC="website/next.config.mjs"
if [ -f "$NC" ]; then
  hits="$(scan_vis "(source|from|destination)\\s*:\\s*[\"']/o-que-e(?![a-z-])" "$NC")"
  [ -z "$hits" ] || { flag "next.config.mjs must not redirect/rewrite /o-que-e (as a source or a destination):"; printf '%s\n' "$hits" | sed 's/^/      /'; }
fi
MW="website/middleware.ts"
if [ -f "$MW" ]; then
  hits="$(scan_vis "$BARE" "$MW")"
  [ -z "$hits" ] || { flag "middleware.ts must not route /o-que-e:"; printf '%s\n' "$hits" | sed 's/^/      /'; }
fi
for conf in infra/banza-network/nginx/conf.d/*.conf; do
  [ -f "$conf" ] || continue
  hits="$(scan_perl "$BARE" "$conf")"
  [ -z "$hits" ] || { flag "nginx must not carry a /o-que-e location/rewrite/alias — $conf:"; printf '%s\n' "$hits" | sed 's/^/      /'; }
done

# ── [C] /o-que-e absent from the sitemap (comment-aware). ──
SM="website/app/sitemap.ts"
if [ -f "$SM" ]; then
  hits="$(scan_vis "$QUOTED" "$SM")"
  [ -z "$hits" ] || { flag "sitemap.ts must not list /o-que-e:"; printf '%s\n' "$hits" | sed 's/^/      /'; }
fi

# ── [D] no service-worker/precache manifest references /o-que-e. ──
sw_files="$(find website -type f \( -iname 'sw.js' -o -iname 'service-worker*' -o -iname 'workbox*' -o -iname 'precache*' \) 2>/dev/null | grep -vE 'node_modules|/\.next/' || true)"
if [ -n "$sw_files" ]; then
  while IFS= read -r sw; do
    [ -n "$sw" ] || continue
    hits="$(scan_perl "$BARE" "$sw")"
    [ -z "$hits" ] || { flag "a service worker must not reference /o-que-e — $sw:"; printf '%s\n' "$hits" | sed 's/^/      /'; }
  done <<< "$sw_files"
fi

# ── [E] ZERO internal links href="/o-que-e" in website/app|components|lib. ──
website_src="$(find website/app website/components website/lib -type f \( -name '*.tsx' -o -name '*.ts' \) 2>/dev/null | grep -vE '/\.next/|node_modules|\.test\.|\.spec\.' || true)"
elink=0
while IFS= read -r f; do
  [ -n "$f" ] || continue
  hits="$(scan_vis "href\\s*=\\s*[\"']/o-que-e(?![a-z-])" "$f")"
  [ -z "$hits" ] || { flag "internal link href=\"/o-que-e\" (use /referencia/o-que-e) — $f:"; printf '%s\n' "$hits" | sed 's/^/      /'; elink=1; }
done <<< "$website_src"
[ "$elink" -eq 0 ] || true

# ── [F] every "Ler a referência" → /referencia (never /o-que-e, never a chapter). ──
while IFS= read -r f; do
  [ -n "$f" ] || continue
  # comment-stripped lines that carry the label
  labels="$(vis "$f" | grep -nF 'Ler a referência' || true)"
  [ -n "$labels" ] || continue
  while IFS= read -r ln; do
    [ -n "$ln" ] || continue
    # every such line must reference /referencia and must NOT reference /o-que-e
    printf '%s' "$ln" | grep -qF '/referencia' || { flag "a 'Ler a referência' affordance does not point at /referencia — $f: $ln"; }
    pmatch "$BARE" "$ln" && { flag "a 'Ler a referência' affordance points at the retired /o-que-e — $f: $ln"; } || true
  done <<< "$labels"
done <<< "$website_src"
# The navPrimary reference entry is explicit.
grep -qF 'href: "/referencia", label: "Ler a referência"' website/lib/site.ts || flag "navPrimary 'Ler a referência' must be href /referencia — website/lib/site.ts"

# ── [G] /referencia/o-que-e is the SINGLE canonical introductory definition. ──
REF="website/lib/reference.ts"
if [ -f "$REF" ]; then
  n="$(grep -cE 'slug: "o-que-e"' "$REF")"
  [ "$n" -eq 1 ] || flag "the reference-chapter slug \"o-que-e\" must appear exactly once (found $n) — $REF"
fi

# ── [H] BanzAI grounding base: no /o-que-e as a source/href/citation URL. ──
# Indexed documentary prose that MENTIONS the historical route (backtick markdown inside a content blob)
# is NOT a source/href and is out of scope; this looks for /o-que-e used AS a quoted route/href/URL value.
GROUND="$(find services/banzai-api engines/banzai-query-core/src/repoindex engines/banzai-evidence -type f \( -name '*.rs' -o -name '*.js' -o -name '*.mjs' -o -name '*.ts' -o -name '*.json' \) 2>/dev/null | grep -vE 'node_modules|/target/|\.test\.|\.spec\.' || true)"
while IFS= read -r f; do
  [ -n "$f" ] || continue
  hits="$(scan_perl "$HREF" "$f")"
  # also standalone quoted route values (JSON URLs / allowlists)
  qhits="$(scan_perl "$QUOTED" "$f")"
  all="$(printf '%s\n%s\n' "$hits" "$qhits" | grep -vE '^$' || true)"
  [ -z "$all" ] || { flag "BanzAI grounding base carries /o-que-e as a source/href/citation URL — $f:"; printf '%s\n' "$all" | sed 's/^/      /'; }
done <<< "$GROUND"

if [ "$fail" -ne 0 ]; then
  echo "check-m2-19g2-o-que-e-removal: FAILED (see NEEDS_FIX above)." >&2
  exit 1
fi
echo "check-m2-19g2-o-que-e-removal: OK — /o-que-e deleted; no redirect/rewrite/alias/sitemap/SW/internal-link keeps it alive; every 'Ler a referência' → /referencia; /referencia/o-que-e is the single canonical definition; grounding base clean."
