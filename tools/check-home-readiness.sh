#!/usr/bin/env bash
#
# M2.19G.2 — Home + reference-route canonicalization readiness CAPSTONE (§42).
#
# The aggregate gate. It (1) runs the two G2 guards — the canonical Home guard and the /o-que-e removal
# guard — and (2) computes the §42 metric block statically where feasible and requires every value to
# hold. Metrics that are inherently runtime (broken links, accessibility, mobile, unexpected fallbacks)
# are delegated to their dedicated guards / public-edge QA and reported as such, not asserted here.
#
# Exit 1 if a sub-guard fails or any static metric is off. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

# The chrome no longer writes a literal href beside its label: an entry declares a semantic route target
# and the pathname is derived per edition. Checking the label's own LINE for '/referencia' therefore
# tested a form that no longer exists — and it could never have covered the English CTA. The resolved
# chrome answers what the reader is actually given, in each edition.
# shellcheck source=tools/_chrome-resolved.sh
. tools/_chrome-resolved.sh

if locale -a 2>/dev/null | grep -qiE '^C\.UTF-?8$'; then export LC_ALL=C.UTF-8
elif locale -a 2>/dev/null | grep -qiE '^en_US\.UTF-?8$'; then export LC_ALL=en_US.UTF-8
fi

PAGE="website/app/(pt)/page.tsx"
REGISTRY="website/components/home/OperatorRegistry.tsx"
STATUSBAR="website/components/home/HeroStatusBar.tsx"
STATUS_LIB="website/lib/protocolStatus.ts"
REF="website/lib/reference.ts"
NC="website/next.config.mjs"
MW="website/middleware.ts"
SM="website/app/sitemap.ts"

echo "== check-m2-19g2-readiness (M2.19G.2 / §42 capstone) =="

# ── helpers ──────────────────────────────────────────────────────────────────────────────────────────
vis() { perl -0777 -pe 's{/\*.*?\*/}{}gs; s{(^|[^:])//[^\n]*}{$1}g' "$1"; }
cfix() { local n; n="$(grep -cF -- "$1" "$2" 2>/dev/null || true)"; echo "${n:-0}"; }
cere() { local n; n="$(grep -cE -- "$1" "$2" 2>/dev/null || true)"; echo "${n:-0}"; }
# perl line-count of RX across FILE... (portable lookbehind/lookahead).
pcount() { local rx="$1"; shift; [ "$#" -gt 0 ] || { echo 0; return; }
  RX="$rx" perl -ne 'BEGIN{$n=0;$re=qr/$ENV{RX}/} $n++ if /$re/; END{print $n}' "$@" 2>/dev/null || echo 0; }
# perl line-count of RX across the COMMENT-STRIPPED content of FILE (single file).
pcount_vis() { local rx="$1" file="$2"; [ -f "$file" ] || { echo 0; return; }
  vis "$file" | RX="$rx" perl -ne 'BEGIN{$n=0;$re=qr/$ENV{RX}/} $n++ if /$re/; END{print $n}' 2>/dev/null || echo 0; }

BARE='(?<!referencia)/o-que-e(?![a-z-])'
HREF='(href|src|source|from|url|route|path|destination)\s*[:=]\s*["'"'"']/o-que-e(?![a-z-])'
QUOTED='["'"'"']/o-que-e(?![a-z-])'

# ── self-test ──
st=0
[ "$(cfix 'aria-labelledby' "$PAGE")" -ge 1 ] || { echo "SELFTEST_FAIL cfix"; st=1; }
[ "$(pcount "$BARE" <(printf 'x /o-que-e"\n/referencia/o-que-e\n'))" = "1" ] || { echo "SELFTEST_FAIL pcount BARE (expected 1)"; st=1; }
[ "$st" -eq 0 ] || { echo "m2-19g2-readiness: SELF-TEST FAILED" >&2; exit 2; }

fail=0

# ── (1) run the two G2 guards ──────────────────────────────────────────────────────────────────────
echo
echo "-- sub-guards --"
for g in check-home-canonical check-retired-page-removal; do
  if bash "tools/$g.sh" >/tmp/g2_$$.log 2>&1; then
    printf '  PASS  %s\n' "$g"
  else
    printf '  FAIL  %s\n' "$g"; sed 's/^/        /' /tmp/g2_$$.log; fail=1
  fi
done
rm -f /tmp/g2_$$.log

# ── (2) static §42 metrics ─────────────────────────────────────────────────────────────────────────
echo
echo "-- §42 static metrics --"

# home_primary_ctas — the PRIMARY validation CTA in the hero band (hero-title … Estado público).
# home_whitepaper_ctas — the single additive /whitepaper CTA in the hero band (WP1-FINAL).
H="$(grep -nF 'aria-labelledby="hero-title"' "$PAGE" | head -1 | cut -d: -f1 || true)"
S="$(grep -nF 'aria-label="Estado público"' "$PAGE" | head -1 | cut -d: -f1 || true)"
if [ -n "$H" ] && [ -n "$S" ]; then
  hero_band="$(awk -v a="$H" -v b="$S" 'NR>=a && NR<b' "$PAGE")"
  home_primary_ctas="$(printf '%s' "$hero_band" | grep -cF 'href="/banzai?mode=validation"' || true)"
  home_whitepaper_ctas="$(printf '%s' "$hero_band" | grep -cF 'href="/whitepaper"' || true)"
else
  home_primary_ctas=-1
  home_whitepaper_ctas=-1
fi

# home_manifest_forms / home_manual_url_inputs — form/upload machinery and url inputs on the home.
home_manifest_forms=0; home_manual_url_inputs=0
for f in "$PAGE" "$REGISTRY" "$STATUSBAR"; do
  home_manifest_forms=$(( home_manifest_forms + $(cere '<form|<textarea|<input|type="file"|onDrop|onDragOver|onPaste|FileReader|readAsText|accept=|scanUpload' "$f") ))
  home_manual_url_inputs=$(( home_manual_url_inputs + $(cere 'type="url"' "$f") ))
done

# home_value_proposition_extra_blocks — the removed value-prop line must be gone.
home_value_proposition_extra_blocks="$(cfix 'Implementar uma vez. Demonstrar conformidade' "$PAGE")"

# home_public_node_counts — decorative node/network counters.
home_public_node_counts=0
for f in "$PAGE" "$STATUSBAR"; do
  home_public_node_counts=$(( home_public_node_counts + $(cere '[0-9]+ nós|nós em pré-produção|rede activa|participantes conectados' "$f") ))
done

# home_operator_zero_production_counts — OZ pushed into / counted as a production operator.
home_operator_zero_production_counts="$(cere 'productionOperators\.push' "$REGISTRY")"

# home_operator_marquee — the animated operator marquee is restored (M2.19G.2B): expect it present (=1).
home_operator_marquee="$(pcount_vis 'data-marquee' "$REGISTRY")"

# home_validation_journey_sections — journey markers on the home.
home_validation_journey_sections="$(cere 'PERCURSO DE VALIDAÇÃO|Da descoberta à prontidão|prontidão para certificação|Certification Readiness|Certification Record' "$PAGE")"

# home_section_order_failures — 0 iff hero < estado < registo < camadas and camadas is last.
R="$(grep -nF 'aria-label="Registo técnico"' "$PAGE" | head -1 | cut -d: -f1 || true)"
L="$(grep -nF 'aria-labelledby="layers-title"' "$PAGE" | head -1 | cut -d: -f1 || true)"
home_section_order_failures=1
if [ -n "$H" ] && [ -n "$S" ] && [ -n "$R" ] && [ -n "$L" ]; then
  after="$(awk -v n="$L" 'NR>n && /<section /' "$PAGE" | wc -l | tr -d ' ')"
  if [ "$H" -lt "$S" ] && [ "$S" -lt "$R" ] && [ "$R" -lt "$L" ] && [ "$after" -eq 0 ]; then home_section_order_failures=0; fi
fi

# reference_cta_wrong_targets — "Ler a referência" affordances not pointing at /referencia.
reference_cta_wrong_targets=0
website_src="$(find website/app website/components website/lib -type f \( -name '*.tsx' -o -name '*.ts' \) 2>/dev/null | grep -vE '/\.next/|node_modules|\.test\.|\.spec\.' || true)"
while IFS= read -r f; do
  [ -n "$f" ] || continue
  # The chrome config is counted from the RESOLVED chrome below, not by line: its labels no longer sit
  # beside a pathname, so a line-scoped test of it counts a false miss.
  case "$f" in website/lib/site.ts) continue ;; esac
  while IFS= read -r ln; do
    [ -n "$ln" ] || continue
    printf '%s' "$ln" | grep -qF '/referencia' || reference_cta_wrong_targets=$(( reference_cta_wrong_targets + 1 ))
  done < <(vis "$f" | grep -F 'Ler a referência' || true)
done <<< "$website_src"
# The header CTA, as each edition resolves it. English is its own route, never a prefixed Portuguese slug.
chrome_links pt nav "Ler a referência" "/referencia" || reference_cta_wrong_targets=$(( reference_cta_wrong_targets + 1 ))
chrome_links en nav "Read the Reference" "/en/reference" || reference_cta_wrong_targets=$(( reference_cta_wrong_targets + 1 ))

# legacy_o_que_e_route_files
legacy_o_que_e_route_files=0
[ -d "website/app/o-que-e" ] && legacy_o_que_e_route_files=$(find website/app/o-que-e -type f 2>/dev/null | wc -l | tr -d ' ')

# legacy_o_que_e_redirects / _rewrites — source /o-que-e in next.config, middleware, nginx.
legacy_o_que_e_redirects=0
[ -f "$NC" ] && legacy_o_que_e_redirects=$(( legacy_o_que_e_redirects + $(pcount_vis '(source|from):\s*["'"'"']/o-que-e(?![a-z-])' "$NC") ))
[ -f "$MW" ] && legacy_o_que_e_redirects=$(( legacy_o_que_e_redirects + $(pcount_vis "$BARE" "$MW") ))
legacy_o_que_e_rewrites=0
for conf in infra/banza-network/nginx/conf.d/*.conf; do
  [ -f "$conf" ] && legacy_o_que_e_rewrites=$(( legacy_o_que_e_rewrites + $(pcount "$BARE" "$conf") ))
done

# legacy_o_que_e_internal_links
legacy_o_que_e_internal_links=0
while IFS= read -r f; do
  [ -n "$f" ] || continue
  legacy_o_que_e_internal_links=$(( legacy_o_que_e_internal_links + $(pcount_vis 'href\s*=\s*["'"'"']/o-que-e(?![a-z-])' "$f") ))
done <<< "$website_src"

# legacy_o_que_e_sitemap_entries
legacy_o_que_e_sitemap_entries=0
[ -f "$SM" ] && legacy_o_que_e_sitemap_entries="$(pcount_vis "$QUOTED" "$SM")"

# legacy_o_que_e_service_worker_entries
legacy_o_que_e_service_worker_entries=0
sw_files="$(find website -type f \( -iname 'sw.js' -o -iname 'service-worker*' -o -iname 'workbox*' -o -iname 'precache*' \) 2>/dev/null | grep -vE 'node_modules|/\.next/' || true)"
while IFS= read -r sw; do
  [ -n "$sw" ] || continue
  legacy_o_que_e_service_worker_entries=$(( legacy_o_que_e_service_worker_entries + $(pcount "$BARE" "$sw") ))
done <<< "$sw_files"

# canonical_o_que_e_sources — the reference chapter slug "o-que-e" (the SINGLE canonical definition).
# The chapter slugs became bilingual records in referenceSlugs.ts — one record carries both editions'
# slugs — so counting a single-language `slug: "o-que-e"` line in reference.ts counts a form that no longer
# exists. The property is unchanged: exactly ONE canonical definition chapter, and its English counterpart
# must be an English slug rather than the Portuguese one reused.
canonical_o_que_e_sources="$(grep -cE 'pt:[[:space:]]*"o-que-e"' website/lib/referenceSlugs.ts || true)"
grep -qE 'pt:[[:space:]]*"o-que-e",[[:space:]]*en:[[:space:]]*"what-banza-is"' website/lib/referenceSlugs.ts \
  || canonical_o_que_e_sources=0
# duplicated_banza_introductory_definitions — extras beyond the single canonical source.
duplicated_banza_introductory_definitions=$(( canonical_o_que_e_sources > 1 ? canonical_o_que_e_sources - 1 : 0 ))

# banzai_legacy_o_que_e_sources — /o-que-e as a source/href/citation URL in the grounding base.
banzai_legacy_o_que_e_sources=0
GROUND="$(find services/banzai-api engines/banzai-query-core/src/repoindex engines/banzai-evidence -type f \( -name '*.rs' -o -name '*.js' -o -name '*.mjs' -o -name '*.ts' -o -name '*.json' \) 2>/dev/null | grep -vE 'node_modules|/target/|\.test\.|\.spec\.' || true)"
while IFS= read -r f; do
  [ -n "$f" ] || continue
  banzai_legacy_o_que_e_sources=$(( banzai_legacy_o_que_e_sources + $(pcount "$HREF" "$f") + $(pcount "$QUOTED" "$f") ))
done <<< "$GROUND"

# ── assert: name expected value ──
assert() { # name expected actual
  local name="$1" exp="$2" act="$3"
  if [ "$act" = "$exp" ]; then printf '  ok:   %-42s = %s\n' "$name" "$act"
  else printf '  FAIL: %-42s = %s (expected %s)\n' "$name" "$act" "$exp"; fail=1; fi
}
assert home_primary_ctas                        1 "$home_primary_ctas"
assert home_whitepaper_ctas                     1 "$home_whitepaper_ctas"
assert home_manifest_forms                      0 "$home_manifest_forms"
assert home_manual_url_inputs                   0 "$home_manual_url_inputs"
assert home_value_proposition_extra_blocks      0 "$home_value_proposition_extra_blocks"
assert home_public_node_counts                  0 "$home_public_node_counts"
assert home_operator_zero_production_counts      0 "$home_operator_zero_production_counts"
assert home_operator_marquee                    1 "$home_operator_marquee"
assert home_validation_journey_sections         0 "$home_validation_journey_sections"
assert home_section_order_failures              0 "$home_section_order_failures"
assert reference_cta_wrong_targets              0 "$reference_cta_wrong_targets"
assert legacy_o_que_e_route_files               0 "$legacy_o_que_e_route_files"
assert legacy_o_que_e_redirects                 0 "$legacy_o_que_e_redirects"
assert legacy_o_que_e_rewrites                  0 "$legacy_o_que_e_rewrites"
assert legacy_o_que_e_internal_links            0 "$legacy_o_que_e_internal_links"
assert legacy_o_que_e_sitemap_entries           0 "$legacy_o_que_e_sitemap_entries"
assert legacy_o_que_e_service_worker_entries    0 "$legacy_o_que_e_service_worker_entries"
assert canonical_o_que_e_sources                1 "$canonical_o_que_e_sources"
assert duplicated_banza_introductory_definitions 0 "$duplicated_banza_introductory_definitions"
assert banzai_legacy_o_que_e_sources            0 "$banzai_legacy_o_que_e_sources"

echo
echo "-- runtime metrics (delegated, not statically asserted) --"
echo "  n/a:  broken_public_links            → public-edge QA harness"
echo "  n/a:  accessibility_blockers         → check-banzai-accessibility-check.sh + public-edge QA"
echo "  n/a:  mobile_blockers                → check-banzai-responsive-check.sh + public-edge QA"
echo "  n/a:  unexpected_public_fallbacks    → public-edge QA harness (0 degraded / 0 5xx)"

echo
if [ "$fail" -ne 0 ]; then
  echo "check-m2-19g2-readiness: FAIL — a G2 sub-guard failed or a §42 static metric is off."
  exit 1
fi
echo "check-m2-19g2-readiness: PASS — both G2 guards pass and every §42 static metric holds."
