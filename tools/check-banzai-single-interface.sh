#!/usr/bin/env bash
#
# BanzAI single canonical interface guard (M2.19E/F.2, ADR-035).
#
# BanzAI is ONE public route — /banzai — with TWO modes of the SAME shell:
#   • ask         (default): the conversation, answered by the local Qwen backend via /banzai/ask
#   • validation  (?mode=validation&target=…&workflow=…[&step=…]): the deterministic 9-step
#                 implementation-validation journey, run by the Rust/WASM engines.
#
# M2.19E/F.2 CONSOLIDATION — the parallel route /banzai/validar, the component ValidationWorkbench, the
# brand "BanzAI Web" and the product "Validation Workbench" / "BanzAI Web Validation Workbench" are ALL
# REMOVED from active surfaces. Validation is a MODE of the single app, not a separate branded surface.
#
# This guard is the hard gate for that contract: it FAILS the build if any removed route/brand/product
# re-enters active code, if the /banzai app grows a second route folder, or if the canonical step/target
# registries drift. Each assertion is a concrete grep/find with a clear per-failure message.
#
# Exit 1 on any violation. Exit 2 if a prerequisite is missing.

set -euo pipefail
cd "$(dirname "$0")/.."

# Deterministic UTF-8 locale so accented markers match the same here and in CI.
if locale -a 2>/dev/null | grep -qiE '^C\.UTF-?8$'; then export LC_ALL=C.UTF-8
elif locale -a 2>/dev/null | grep -qiE '^en_US\.UTF-?8$'; then export LC_ALL=en_US.UTF-8
fi

APP="website/app"
BANZAI_DIR="website/app/(pt)/banzai"
PAGE="website/app/(pt)/banzai/page.tsx"
VAL="website/lib/banzaiValidation.ts"
STATE="website/lib/banzaiState.ts"
MIDDLEWARE="website/middleware.ts"
SITEMAP="website/app/sitemap.ts"

# Archival decision record that ESTABLISHED the (now-superseded) "BanzAI Web Validation Workbench".
# Like the other archival ADRs (ADR-036/045/046 describe the earlier `mock` default), it is rendered
# verbatim; its supersession is expressed via status metadata, not by rewriting the record — the exact
# convention documented in check-website-public-copy-current.sh, which excludes the decision corpus for
# the same reason. It is therefore excluded from the CURRENT-brand scan below; every OTHER decisions/**
# file is still scanned so a NEW record cannot reintroduce the retired brand.
ARCHIVAL_ADR="ADR-035-operador-zero-read-only-reference-and-banzai-validation-workbench.md"

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }

for f in "$PAGE" "$VAL" "$STATE" "$SITEMAP"; do
  [ -f "$f" ] || { echo "FAIL: missing prerequisite $f"; exit 2; }
done

echo "══════════════════════════════════════════════════════════════════════"
echo "BanzAI single canonical interface (/banzai, two modes) — M2.19E/F.2"
echo "══════════════════════════════════════════════════════════════════════"

# ── 1. No parallel /banzai/validar route folder ──────────────────────────────
if [ -e "$BANZAI_DIR/validar" ]; then
  bad "the parallel route folder $BANZAI_DIR/validar/ still exists — validation is a MODE of /banzai, not a route"
else
  ok "no $BANZAI_DIR/validar/ route folder"
fi

# ── 2. Single BanzAI interface: only the ADR-036 closed navigable-context segments ────────────────────
# ADR-036 refines "single interface" from "one route file" to "one shell/app with one always-mounted
# session, exposing global/operator/implementation as CLOSED, server-resolved route segments". The
# allowlist below is the ONLY structure permitted under app/(pt)/banzai/: a second app (validar/onboarding as
# a route, "Validation Workbench", etc.) is still forbidden. Non-breaking: passes with just page.tsx
# (pre-routes) AND with the operador/[operatorId]/[implementationId] segments (post-routes).
# Allowed top-level files: page.tsx, layout.tsx. Allowed subdir: operador/ (→ [operatorId] → [implementationId]).
BAD_TOP_DIRS="$(find "$BANZAI_DIR" -mindepth 1 -maxdepth 1 -type d ! -name 'operador' 2>/dev/null || true)"
if [ -n "$BAD_TOP_DIRS" ]; then
  bad "$BANZAI_DIR/ has a non-allowlisted route subfolder (ADR-036 allows only 'operador/'):"
  printf '%s\n' "$BAD_TOP_DIRS" | sed 's/^/         /'
else
  ok "$BANZAI_DIR/ has only the allowlisted 'operador/' segment (or none)"
fi
BAD_TOP_FILES="$(find "$BANZAI_DIR" -mindepth 1 -maxdepth 1 -type f ! -name 'page.tsx' ! -name 'layout.tsx' 2>/dev/null || true)"
if [ -n "$BAD_TOP_FILES" ]; then
  bad "$BANZAI_DIR/ contains files other than page.tsx / layout.tsx:"
  printf '%s\n' "$BAD_TOP_FILES" | sed 's/^/         /'
else
  ok "$BANZAI_DIR/ top-level files are only page.tsx / layout.tsx"
fi
# If the operador segment exists, its nested shape must be exactly the ADR-036 closed tree.
if [ -d "$BANZAI_DIR/operador" ]; then
  BAD_SEG="$(find "$BANZAI_DIR/operador" -mindepth 1 -type d ! -name '[[]operatorId[]]' ! -name '[[]implementationId[]]' 2>/dev/null || true)"
  if [ -n "$BAD_SEG" ]; then
    bad "$BANZAI_DIR/operador/ has non-allowlisted segments (ADR-036 allows only [operatorId]/[implementationId]):"
    printf '%s\n' "$BAD_SEG" | sed 's/^/         /'
  else
    ok "operador/ segment tree is the closed ADR-036 shape ([operatorId]/[implementationId])"
  fi
  BAD_SEG_FILES="$(find "$BANZAI_DIR/operador" -type f ! -name 'page.tsx' ! -name 'layout.tsx' 2>/dev/null || true)"
  if [ -n "$BAD_SEG_FILES" ]; then
    bad "operador/ segments contain files other than page.tsx / layout.tsx:"
    printf '%s\n' "$BAD_SEG_FILES" | sed 's/^/         /'
  else
    ok "operador/ segments contain only page.tsx / layout.tsx"
  fi
fi

# ── 2b. ADR-036: contexts are NOT the 3 layers and NOT L0-L4 certification tiers ─────────────
# The /banzai navigation surface must use "contexto", never "camada"/"layer" for navigation, and must
# not present L0-L4 as "níveis/tiers de certificação". Scan the BanzAI UI surface only.
CONFLATE="$(grep -rniE 'camada de (navega|operador|implementa)|navega[çc][aã]o.*camada|n[íi]vel de certifica|tier de certifica|certification tier' \
  website/components/banzai "website/app/(pt)/banzai" 2>/dev/null || true)"
if [ -n "$CONFLATE" ]; then
  bad "ADR-036 conflation: navigation context described as 'camada/layer' or L0-L4 as certification tiers:"
  printf '%s\n' "$CONFLATE" | sed 's/^/         /' | cut -c1-200
else
  ok "no context↔layer / L0-L4↔tier conflation on the /banzai surface (ADR-036)"
fi

# ── 3. No redirect/rewrite/alias to or from /banzai/validar (comments too) ────
# The literal path must appear NOWHERE in middleware, next.config.*, or the app tree — including comments,
# so the surface stays current-only (a commented-out alias is still a dangling reference to a dead route).
ROUTING_HITS="$(grep -rn 'banzai/validar' "$MIDDLEWARE" website/next.config.* "$APP" 2>/dev/null || true)"
if [ -n "$ROUTING_HITS" ]; then
  bad "the retired path banzai/validar appears in middleware/next.config/app (redirect/rewrite/alias/comment):"
  printf '%s\n' "$ROUTING_HITS" | sed 's/^/         /' | cut -c1-200
else
  ok "no banzai/validar redirect/rewrite/alias in middleware, next.config.*, or app/**"
fi

# ── 4. No internal link/import to /banzai/validar or ValidationWorkbench ──────
LINK_HITS="$(grep -rn -e 'banzai/validar' -e 'ValidationWorkbench' website --include='*.ts' --include='*.tsx' --include='*.md' --include='*.json' 2>/dev/null | grep -v '/wasm/' || true)"
if [ -n "$LINK_HITS" ]; then
  bad "an internal link/import references the retired /banzai/validar route or the deleted ValidationWorkbench:"
  printf '%s\n' "$LINK_HITS" | sed 's/^/         /' | cut -c1-200
else
  ok "no internal link/import to /banzai/validar or ValidationWorkbench in website/**"
fi

# ── 5. The retired brand "BanzAI Web" is gone from active surfaces ────────────
# website active source (.ts/.tsx, excl. tests + wasm) + docs/** + decisions/** (excl. archival ADR) + SVGs.
BW_HITS=""
BW_HITS+="$(grep -rn 'BanzAI Web' website --include='*.ts' --include='*.tsx' 2>/dev/null | grep -vE '\.test\.(ts|tsx):|/wasm/' || true)"
BW_HITS+=$'\n'"$(grep -rn 'BanzAI Web' docs --include='*.md' 2>/dev/null | grep -v '/reports/' || true)"
BW_HITS+=$'\n'"$(grep -rn 'BanzAI Web' decisions --include='*.md' 2>/dev/null | grep -vF "$ARCHIVAL_ADR" || true)"
BW_HITS+=$'\n'"$(grep -rn 'BanzAI Web' website/public/diagrams --include='*.svg' 2>/dev/null || true)"
BW_HITS="$(printf '%s\n' "$BW_HITS" | grep -v '^$' || true)"
if [ -n "$BW_HITS" ]; then
  bad "the retired brand 'BanzAI Web' appears on an active surface (use 'BanzAI'):"
  printf '%s\n' "$BW_HITS" | sed 's/^/         /' | cut -c1-200
else
  ok "no 'BanzAI Web' brand in website active source, docs/**, decisions/** (excl. archival ADR-035), or SVGs"
fi

# ── 6. The product name "Validation Workbench" is gone from active website source ──
VW_HITS="$(grep -rn -e 'Validation Workbench' -e 'BanzAI Web Validation Workbench' website --include='*.ts' --include='*.tsx' 2>/dev/null | grep -vE '\.test\.(ts|tsx):|/wasm/' || true)"
if [ -n "$VW_HITS" ]; then
  bad "the retired product name 'Validation Workbench' appears in active website source:"
  printf '%s\n' "$VW_HITS" | sed 's/^/         /' | cut -c1-200
else
  ok "no 'Validation Workbench' product name in active website source"
fi

# ── 7. /banzai/validar is not in the sitemap ─────────────────────────────────
if grep -q 'banzai/validar' "$SITEMAP"; then
  bad "$SITEMAP still lists /banzai/validar"
else
  ok "$SITEMAP does not list /banzai/validar"
fi

# ── 8. Canonical 9 step ids in VALIDATION_STEP_IDS, exactly 9 ─────────────────
CANON_STEPS="discovery manifest keys conformance interoperability trust federation evidence certification"
STEP_BLOCK="$(awk '/export const VALIDATION_STEP_IDS/{f=1} f{print} f&&/\] as const;/{exit}' "$VAL")"
STEP_COUNT="$(printf '%s\n' "$STEP_BLOCK" | grep -oE '"[^"]+"' | wc -l | tr -d ' ')"
missing_step=0
for s in $CANON_STEPS; do
  printf '%s\n' "$STEP_BLOCK" | grep -qE "\"$s\"" || { bad "VALIDATION_STEP_IDS is missing the canonical step id: $s"; missing_step=1; }
done
[ "$missing_step" -eq 0 ] && ok "VALIDATION_STEP_IDS contains all 9 canonical step ids"
if [ "$STEP_COUNT" = "9" ]; then
  ok "VALIDATION_STEP_IDS has exactly 9 ids"
else
  bad "VALIDATION_STEP_IDS must have exactly 9 ids (found $STEP_COUNT)"
fi

# ── 9. No legacy 7-step journey markers anywhere under components/banzai/** ────
LEGACY="$(grep -rnE 'JOURNEY_STEPS|\b0/7\b|7 etapas|journeyLength' website/components/banzai/ 2>/dev/null || true)"
if [ -n "$LEGACY" ]; then
  bad "a legacy 7-step journey marker survives in components/banzai/** (the journey is 9 steps):"
  printf '%s\n' "$LEGACY" | sed 's/^/         /' | cut -c1-200
else
  ok "no legacy 7-step journey markers (JOURNEY_STEPS / 0/7 / 7 etapas / journeyLength)"
fi

# ── 10. The target registry has exactly one key: operator-zero ───────────────
TARGET_BLOCK="$(awk '/export const VALIDATION_TARGETS/{f=1} f{print} f&&/^};/{exit}' "$VAL")"
TARGET_COUNT="$(printf '%s\n' "$TARGET_BLOCK" | grep -cE '"[^"]+"[[:space:]]*:[[:space:]]*\{' || true)"
if [ "$TARGET_COUNT" = "1" ]; then
  ok "VALIDATION_TARGETS has exactly one target key"
else
  bad "VALIDATION_TARGETS must have exactly one target key (found $TARGET_COUNT)"
fi
if printf '%s\n' "$TARGET_BLOCK" | grep -qE '"operator-zero"[[:space:]]*:[[:space:]]*\{'; then
  ok "the single validation target is operator-zero"
else
  bad "the single validation target must be operator-zero"
fi

# ── 11. Positive: the page reads the validated URL-state via parseBanzaiState ──
if grep -qE 'parseBanzaiState' "$PAGE" && grep -qE 'from "@/lib/banzaiState"' "$PAGE"; then
  ok "$PAGE imports parseBanzaiState (server-side validated URL-state)"
else
  bad "$PAGE must import parseBanzaiState from @/lib/banzaiState"
fi

# ── 12. Positive: workbenchDeepLink returns a /banzai?mode=validation URL ─────
if grep -qE 'return `/banzai\?\$\{q' "$VAL" && grep -qE 'mode: "validation"' "$VAL"; then
  ok "workbenchDeepLink returns a /banzai?mode=validation deep link"
else
  bad "workbenchDeepLink must return a /banzai?mode=validation deep link"
fi

# ── Self-test — the detectors fire on planted violations ─────────────────────
echo "self-test…"
st=0
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
printf 'redirect("/banzai/validar")\n' > "$TMP/r.ts"
grep -q 'banzai/validar' "$TMP/r.ts" || { echo "    SELFTEST_FAIL route-detector"; st=1; }
printf '<span>BanzAI Web</span>\n' > "$TMP/b.tsx"
grep -q 'BanzAI Web' "$TMP/b.tsx" || { echo "    SELFTEST_FAIL brand-detector"; st=1; }
printf 'const JOURNEY_STEPS = 7\n' > "$TMP/j.ts"
grep -qE 'JOURNEY_STEPS|7 etapas' "$TMP/j.ts" || { echo "    SELFTEST_FAIL legacy-detector"; st=1; }
printf 'import { ValidationWorkbench } from "x"\n' > "$TMP/v.ts"
grep -q 'ValidationWorkbench' "$TMP/v.ts" || { echo "    SELFTEST_FAIL workbench-detector"; st=1; }
[ "$st" -eq 0 ] && ok "self-test: route, brand, legacy-journey, ValidationWorkbench detectors fire" || fail=1

echo "══════════════════════════════════════════════════════════════════════"
if [ "$fail" -eq 0 ]; then
  echo "banzai-single-interface-check: PASS (one /banzai route, two modes; no /banzai/validar, no 'BanzAI Web', no 'Validation Workbench')"
else
  echo "banzai-single-interface-check: FAIL"
fi
exit "$fail"
