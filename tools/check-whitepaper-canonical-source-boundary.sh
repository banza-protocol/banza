#!/usr/bin/env bash
# BANZA Whitepaper — canonical-source boundary guard.
#
# Protects the PROCESS decided in the canonical-source governance milestone (docs/whitepaper/BUILD.md):
# the approved Overleaf PT dossier is the editorial source; every other surface is a derivation; the
# retired content→article renderer never re-enters the release path; verify is non-destructive; and the
# CURRENT frozen edition keeps its approved wording. It protects semantics/process — hashes are NOT
# pinned here (a hash identifies a build; the reproducibility gate is `make whitepaper-verify`).
#
# Stale-guard rule: when a future Overleaf revision is approved and imported, update FROZEN_* below
# consciously — never deform the approved document to satisfy this guard, and never change the baseline
# just because a renderer unexpectedly produced a different number.
set -euo pipefail
cd "$(dirname "$0")/.."

# ── frozen baseline of the CURRENT approved build (update on an approved re-import) ──────────────────
FROZEN_PAGES=12
FROZEN_PT_SENTENCE='configuração segura do protocolo'
FROZEN_FIG4_PT='configuração segura · representação monetária correcta'
FROZEN_FIG4_EN='secure configuration · correct monetary representation'
# forbidden in the ACTIVE whitepaper edition only (history/other docs may legitimately contain them)
FORBIDDEN_PT_1='instanciação segura'
FORBIDDEN_PT_2='instantâneo de observação'

PT_TEX=docs/whitepaper/latex/whitepaper.pt.tex
EN_TEX=docs/whitepaper/latex/whitepaper.en.tex
RELEASE=tools/whitepaper-release.sh
FIGSRC=tools/whitepaper-figures.py
MANIFEST=docs/whitepaper/manifest.json
CHECKSUMS=docs/whitepaper/CHECKSUMS.txt

fail=0
ok()  { printf '  ok: %s\n' "$1"; }
bad() { printf '  ✗ %s\n' "$1"; fail=1; }

check() {
  # 1. canonical composition: the PT source is the approved copernicus dossier, not a recomposition
  grep -q 'documentclass\[journal abbreviation, manuscript\]{copernicus}' "$PT_TEX" \
    && ok "PT source is the approved copernicus dossier (no silent recomposition)" \
    || bad "PT source is not the copernicus dossier — a different editorial template re-entered"
  [ -f docs/whitepaper/latex/copernicus.cls ] \
    && ok "copernicus.cls ships with the dossier" || bad "copernicus.cls missing from the dossier"

  # 2. retired renderer stays out of the canonical release path
  if grep -q 'whitepaper-latex\.py' "$RELEASE"; then
    bad "retired renderer (whitepaper-latex.py) re-entered the release path"
  else
    ok "retired renderer is out of the release path"
  fi
  grep -q 'RETIRED FROM THE CANONICAL RELEASE PATH' tools/whitepaper-latex.py 2>/dev/null \
    && ok "retired renderer carries its retirement header" \
    || bad "tools/whitepaper-latex.py lost its retirement header"

  # 3. derivation gates are wired into the release script (verify + write mode)
  grep -q 'whitepaper-pt-content\.py --check' "$RELEASE" \
    && ok "verify gates pt.json derivation" || bad "release/verify lost the pt.json derivation gate"
  grep -q 'whitepaper-en-dossier\.py --check' "$RELEASE" \
    && ok "verify gates the EN dossier derivation" || bad "release/verify lost the EN derivation gate"

  # 4. derivations are CURRENTLY fresh (no writes — the tools' --check mode compares only)
  python3 tools/whitepaper-pt-content.py --check >/dev/null \
    && ok "content/pt.json matches the canonical PT dossier" \
    || bad "content/pt.json drifted from the canonical PT dossier"
  python3 tools/whitepaper-en-dossier.py --check >/dev/null \
    && ok "whitepaper.en.tex matches PT dossier + official EN translation" \
    || bad "whitepaper.en.tex drifted (EN must derive from PT + en.json, never be edited directly)"

  # 5. web edition mirrors are in sync (no stale web content)
  diff -q docs/whitepaper/content/pt.json website/content/whitepaper/pt.json >/dev/null \
    && diff -q docs/whitepaper/content/en.json website/content/whitepaper/en.json >/dev/null \
    && ok "web edition mirrors are in sync" || bad "web edition mirrors are stale"

  # 5b. the figures SERVED by the online edition must be the canonical ones. The web page renders from
  # website/public/whitepaper/figures, a separate copy: if it drifts, the published page shows the text of
  # the current edition with the figures of a superseded one.
  fig_drift=0
  for f in docs/whitepaper/figures/*.svg; do
    cmp -s "$f" "website/public/whitepaper/figures/$(basename "$f")" || fig_drift=$((fig_drift + 1))
  done
  [ "$fig_drift" -eq 0 ] \
    && ok "served figures match the canonical figure source ($(ls docs/whitepaper/figures/*.svg | wc -l | tr -d ' ') files)" \
    || bad "$fig_drift served figure(s) differ from the canonical source — the online edition would show superseded figures"

  # 6. manifest/checksums internal consistency + frozen page baseline
  python3 - "$FROZEN_PAGES" <<'PY' || fail=1
import json, sys, hashlib
frozen = int(sys.argv[1])
m = json.load(open("docs/whitepaper/manifest.json"))
chk = open("docs/whitepaper/CHECKSUMS.txt").read()
for p in m["pdfs"]:
    assert p["pages"] == frozen, f"{p['lang']}: manifest pages {p['pages']} != frozen baseline {frozen}"
    b = open("website/public/whitepaper/" + p["file"], "rb").read()
    h = hashlib.sha256(b).hexdigest()
    assert h == p["sha256"], f"{p['lang']}: committed PDF does not match manifest (manifest stale)"
    assert p["sha256"] in chk, f"{p['lang']}: CHECKSUMS.txt does not carry the manifest hash"
print("  ok: manifest pages == frozen baseline; manifest/CHECKSUMS derived from the committed PDFs")
PY

  # 7. frozen wording of the ACTIVE edition (scoped — not repo-wide)
  grep -q "$FROZEN_PT_SENTENCE" "$PT_TEX" \
    && ok "PT edition carries the approved L0 sentence" || bad "PT edition lost «$FROZEN_PT_SENTENCE»"
  if grep -q "$FORBIDDEN_PT_1" "$PT_TEX" docs/whitepaper/content/pt.json 2>/dev/null; then
    bad "retired wording «$FORBIDDEN_PT_1» re-entered the active PT edition"
  else
    ok "zero «$FORBIDDEN_PT_1» in the active PT edition"
  fi
  if grep -q "$FORBIDDEN_PT_2" "$PT_TEX" docs/whitepaper/content/pt.json 2>/dev/null; then
    bad "retired wording «$FORBIDDEN_PT_2» re-entered the active PT edition"
  else
    ok "zero «$FORBIDDEN_PT_2» in the active PT edition"
  fi

  # 8. Figure 4 parity in the REAL figure source (script-generated; manual-only edits are drift)
  grep -qF "$FROZEN_FIG4_PT" "$FIGSRC" && grep -qF "$FROZEN_FIG4_EN" "$FIGSRC" \
    && ok "Figure 4 PT/EN parity in the figure source (configuração segura / secure configuration)" \
    || bad "Figure 4 source lost the approved PT/EN wording parity"
  grep -qF "$FROZEN_FIG4_PT" docs/whitepaper/figures/fig4-profiles.pt.svg \
    && grep -qF "$FROZEN_FIG4_EN" docs/whitepaper/figures/fig4-profiles.en.svg \
    && ok "generated Figure 4 SVGs match the source wording" \
    || bad "generated Figure 4 SVGs diverge from the figure source (regenerate, do not hand-edit)"

  # 9. verify is non-destructive: no git checkout/restore over the canonical source in the release script
  if grep -qE 'git (checkout|restore)' "$RELEASE"; then
    bad "release/verify contains a destructive git checkout/restore path over sources"
  else
    ok "release/verify has no destructive git checkout/restore path"
  fi
}

# ── self-test: detectors must flag synthetic violations and pass a clean fixture ─────────────────────
selftest() {
  local d st=0
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  # forbidden-wording detector
  printf 'a instanciação segura do protocolo' > "$d/bad.tex"
  grep -q 'instanciação segura' "$d/bad.tex" || { echo "SELFTEST_FAIL wording detector"; st=1; }
  printf 'a configuração segura do protocolo' > "$d/good.tex"
  grep -q 'instanciação segura' "$d/good.tex" && { echo "SELFTEST_FAIL wording false-positive"; st=1; }
  # retired-renderer detector
  printf 'python3 tools/whitepaper-latex.py' > "$d/bad-release.sh"
  grep -q 'whitepaper-latex\.py' "$d/bad-release.sh" || { echo "SELFTEST_FAIL renderer detector"; st=1; }
  # destructive-verify detector
  printf 'git checkout -- docs/whitepaper/latex' > "$d/bad-verify.sh"
  grep -qE 'git (checkout|restore)' "$d/bad-verify.sh" || { echo "SELFTEST_FAIL destructive detector"; st=1; }
  return $st
}

echo "== whitepaper-canonical-source-boundary =="
selftest || { echo "whitepaper-canonical-source-boundary: SELFTEST FAILED"; exit 1; }
check
if [ "$fail" -ne 0 ]; then
  echo "whitepaper-canonical-source-boundary: FAIL"
  exit 1
fi
echo "whitepaper-canonical-source-boundary: ✓ Overleaf PT dossier is the source; derivations fresh; retired renderer out; verify non-destructive; frozen edition intact"
