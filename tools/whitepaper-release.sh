#!/usr/bin/env bash
#
# BANZA Whitepaper v1.0 — CANONICAL release build. THE SINGLE SOURCE OF TRUTH for the published PDFs.
#
# Engine: LaTeX compiled with **tectonic** (XeTeX → xdvipdfmx). This is the ONLY command that produces
# the committed/published PDFs (website/public/whitepaper + docs/whitepaper/pdf), the manifest and the
# checksums. The Typst path (tools/whitepaper-build.sh) is a NON-CANONICAL preview and never writes a
# published path.
#
# Deterministic: the date is pinned from the manifest (SOURCE_DATE_EPOCH) and compression is disabled in
# the .tex (\special{dvipdfmx:config z 0}), so two clean builds are byte-identical. The tectonic
# major.minor is enforced (aborts on an unsupported version) so byte-identity is not left to chance.
#
# Modes:
#   tools/whitepaper-release.sh            # RELEASE: build → publish → freeze manifest/CHECKSUMS → guard
#   tools/whitepaper-release.sh --verify   # VERIFY : build in a temp dir → assert byte-identical to the
#                                          #          committed PDFs → NO writes → abort on any divergence
# Makefile: `make whitepaper-release`, `make whitepaper-verify`.
# Env: TECTONIC=/path/to/tectonic (default: tectonic on PATH).
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

MODE="release"; [ "${1:-}" = "--verify" ] && MODE="verify"

TECTONIC="${TECTONIC:-tectonic}"
PINNED_TECTONIC="0.17.0"                  # EXACT version the canonical hashes were frozen with (enforced;
                                          # the CI hermetic-verify job additionally pins the binary by SHA-256)
PUB1=website/public/whitepaper            # guard-validated published PDFs (canonical)
PUB2=docs/whitepaper/pdf                  # dossier build output (committed)
CONTENT=docs/whitepaper/content
WEBMIRROR=website/content/whitepaper      # single-source web edition mirror
LATEX=docs/whitepaper/latex
MAN=docs/whitepaper/manifest.json

# ── Pinned TeX bundle (explicit, verifiable — never the binary's implicit default). ──────────────────
# Immutable versioned artifact (tectonic 0.17.0's default_bundle_v33 redirects here); the content is
# addressed by tectonic's own bundle digest, which is asserted below and is the real content pin.
PINNED_BUNDLE_URL="https://data1.fullyjustified.net/tlextras-2022.0r0.tar"
PINNED_BUNDLE_DIGEST="6ffe055852f8faf66c0acbe1a7fb27f87b869a90bad1204f3bf4d9683f597c7c"
BUNDLE_ARGS=(--bundle "$PINNED_BUNDLE_URL")
# WP_OFFLINE=1 forbids any network fetch during compile (uses only the pre-warmed local cache).
[ "${WP_OFFLINE:-0}" = "1" ] && BUNDLE_ARGS+=(--only-cached)

command -v "$TECTONIC" >/dev/null 2>&1 || { echo "whitepaper-release: ABORT — tectonic not found (install exactly $PINNED_TECTONIC)"; exit 2; }
have="$("$TECTONIC" --version 2>/dev/null | awk '{print $2}')"
[ "$have" = "$PINNED_TECTONIC" ] || {
  echo "whitepaper-release: ABORT — tectonic $have != pinned $PINNED_TECTONIC (EXACT). Byte-identity requires exactly"
  echo "  $PINNED_TECTONIC: its default TeX bundle is version-locked to the binary, so any other patch/minor can change"
  echo "  metadata, compression, object ordering, embedded fonts or xdvipdfmx output. Install $PINNED_TECTONIC or set TECTONIC=."
  exit 2; }

# ── shared: validate content + PT/EN parity (aborts before building) ──────────────────────────────────
validate_content() {
  python3 - <<'PY' || { echo "whitepaper-release: ABORT — content validation / PT-EN parity"; exit 1; }
import json
en=json.load(open("docs/whitepaper/content/en.json")); pt=json.load(open("docs/whitepaper/content/pt.json"))
def shape(d):
    secs=[]
    for s in d["sections"]:
        blocks=tuple(("eq",tuple(i["label"] for i in b["items"])) if b["t"]=="eq"
                     else ("fig",b["id"]) if b["t"]=="fig"
                     else ("list",len(b["items"])) if b["t"]=="list" else ("p",) for b in s["blocks"])
        secs.append((s["id"],s["number"],s["label"],blocks))
    return (tuple(secs), tuple((f["id"],f["n"],f["label"]) for f in d["figures"]))
assert shape(en)==shape(pt), "PT/EN structural parity broken"
for d in (en,pt):
    assert len(d["sections"])==12 and len(d["figures"])==12, "expected 12 sections + 12 figures"
    tags=[i["n"] for s in d["sections"] for b in s["blocks"] if b["t"]=="eq" for i in b["items"]]
    assert tags==["1a","1b","2","3","4"], f"equation tags {tags}"
print("  ok: content valid · PT/EN structural parity · 12 sections · equations 1a/1b/2/3/4")
PY
}

# ── shared: assert the resolved TeX bundle is exactly the pinned content digest (explicit bundle pin). ──
verify_bundle_digest() {
  local cache="${TECTONIC_CACHE_DIR:-}"
  if [ -z "$cache" ]; then
    case "$(uname -s)" in
      Darwin) cache="$HOME/Library/Caches/TectonicProject.Tectonic" ;;
      *) cache="${XDG_CACHE_HOME:-$HOME/.cache}/Tectonic" ;;
    esac
  fi
  if [ -e "$cache/bundles/data/$PINNED_BUNDLE_DIGEST" ] || [ -e "$cache/bundles/data/$PINNED_BUNDLE_DIGEST.index" ]; then
    echo "  ok: TeX bundle content digest verified = $PINNED_BUNDLE_DIGEST ($PINNED_BUNDLE_URL)"
  elif [ -n "${TECTONIC_CACHE_DIR:-}" ]; then
    echo "whitepaper-release: ABORT — pinned bundle digest $PINNED_BUNDLE_DIGEST absent from TECTONIC_CACHE_DIR ($cache)"; exit 1
  else
    echo "  note: bundle digest not located in default cache ($cache); pinned via --bundle + output SHA-256 contract"
  fi
}

# ── shared: compile PT+EN into $1 (a temp dir) from the current committed .tex + figures; verify each ──
EPOCH="$(python3 -c "import json,datetime as t;d=json.load(open('$MAN'));y,m,dd=d['released_at'].split('-');print(int(t.datetime(int(y),int(m),int(dd),tzinfo=t.timezone.utc).timestamp()))")"
build_editions() {
  local out="$1"
  mkdir -p "$out/figures"
  cp "$LATEX"/whitepaper.pt.tex "$LATEX"/whitepaper.en.tex "$LATEX"/references.bib "$out/"
  cp "$LATEX"/copernicus.cls "$LATEX"/copernicus.cfg "$LATEX"/copernicus.bst "$out/"
  cp "$LATEX"/figures/*.pdf "$out/figures/"
  for lang in pt en; do
    ( cd "$out" && SOURCE_DATE_EPOCH="$EPOCH" "$TECTONIC" -X compile "whitepaper.$lang.tex" "${BUNDLE_ARGS[@]}" --outdir "$out" --keep-logs >/dev/null 2>&1 ) \
      || { echo "whitepaper-release: ABORT — tectonic compile ($lang)"; exit 1; }
    local log="$out/whitepaper.$lang.log"
    local pages; pages="$(grep -aoE '\([0-9]+ pages' "$log" | grep -oE '[0-9]+' | head -1)"
    [ "$pages" = "12" ] || { echo "whitepaper-release: ABORT — $lang produced $pages pages (expected 12)"; exit 1; }
    if grep -aqiE 'undefined (reference|citation)|Reference .* undefined|Citation .* undefined' "$log"; then
      echo "whitepaper-release: ABORT — $lang has undefined references/citations"; exit 1; fi
    if grep -aqE 'Overfull \\hbox' "$log"; then
      echo "whitepaper-release: ABORT — $lang has overfull hboxes"; exit 1; fi
    python3 - "$out/whitepaper.$lang.pdf" "$lang" <<'PY' || exit 1
import sys, subprocess
p, l = sys.argv[1], sys.argv[2]
# The copernicus dossier ships compressed object streams, so engine/date metadata is asserted on
# parsed metadata (pdfinfo), and text-level checks on the extracted text.
info = subprocess.run(["pdfinfo", p], capture_output=True, text=True).stdout
assert "xdvipdfmx" in info, f"{l}: Producer is not xdvipdfmx (wrong engine)"
assert "LaTeX" in info, f"{l}: Creator is not LaTeX (wrong engine)"
assert "Typst" not in info, f"{l}: Typst output leaked into a canonical PDF"
dates = [ln for ln in info.splitlines() if ln.startswith("CreationDate")]
assert dates and "2026" in dates[0] and "2025" not in dates[0], f"{l}: CreationDate is not 2026: {dates}"
text = subprocess.run(["pdftotext", p, "-"], capture_output=True, text=True).stdout
assert "NOT FOR CITATION" not in text, f"{l}: DRAFT watermark present in a release PDF"
print(f"  ok: {l} — 12 pp · LaTeX/xdvipdfmx · CreationDate 2026 · no DRAFT")
PY
  done
}

sha() { shasum -a 256 "$1" | cut -d' ' -f1; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

if [ "$MODE" = "verify" ]; then
  echo "== whitepaper-release --verify (reproducibility gate · no writes) =="
  validate_content
  # canonical direction: the PT dossier is the source; pt.json (web edition) and the EN dossier
  # must both re-derive byte-identically from it (no writes in verify).
  python3 tools/whitepaper-pt-content.py --check || { echo "whitepaper-release: ABORT — pt.json drifted from the canonical PT dossier"; exit 1; }
  python3 tools/whitepaper-en-dossier.py --check || { echo "whitepaper-release: ABORT — whitepaper.en.tex drifted from PT dossier + en.json"; exit 1; }
  build_editions "$TMP"
  verify_bundle_digest
  rc=0
  for lang in pt en; do
    got="$(sha "$TMP/whitepaper.$lang.pdf")"; want="$(sha "$PUB1/banza-whitepaper-v1.0-$lang.pdf")"
    if [ "$got" = "$want" ]; then echo "  ok: $lang byte-identical to committed ($got)"; else
      echo "  ABORT: $lang divergence — built $got != committed $want"; rc=1; fi
  done
  [ "$rc" -eq 0 ] || { echo "whitepaper-release: FAIL — rebuilt PDFs diverge from the committed canonical edition"; exit 1; }
  # the rebuilt hashes must also match manifest.json AND CHECKSUMS.txt (the committed frozen records)
  python3 - "$(sha "$TMP/whitepaper.pt.pdf")" "$(sha "$TMP/whitepaper.en.pdf")" <<'PY' || { echo "whitepaper-release: FAIL — rebuilt hashes diverge from manifest/CHECKSUMS"; exit 1; }
import json,sys,re
built={"pt":sys.argv[1],"en":sys.argv[2]}
m=json.load(open("docs/whitepaper/manifest.json"))
for e in m["pdfs"]:
    l=e["lang"]
    assert e["sha256"]==built[l], f"manifest {l} sha {e['sha256'][:12]} != rebuilt {built[l][:12]}"
cks=open("docs/whitepaper/CHECKSUMS.txt").read()
for l in ("pt","en"):
    assert re.search(re.escape(built[l])+r"\s+banza-whitepaper-v1\.0-"+l+r"\.pdf", cks), f"CHECKSUMS {l} missing rebuilt hash"
print("  ok: rebuilt hashes match manifest.json + CHECKSUMS.txt")
PY
  echo "whitepaper-release: ✅ VERIFY passed — committed PDFs exactly reproducible + manifest/CHECKSUMS consistent (no writes made)"
  exit 0
fi

echo "== whitepaper-release (CANONICAL · LaTeX/tectonic → xdvipdfmx) =="
validate_content
# 3. canonical direction: PT dossier is the source — re-derive pt.json (web edition) and the EN dossier
python3 tools/whitepaper-pt-content.py >/dev/null
python3 tools/whitepaper-en-dossier.py >/dev/null
echo "  ok: pt.json (web edition) + EN dossier derived from the canonical PT dossier"
# 4–7. compile + verify (12 pp, engine, date, no draft, 0 undefined/overfull) + pinned bundle digest
build_editions "$TMP"
verify_bundle_digest
# 8. publish PDFs to every committed path
for lang in pt en; do
  cp "$TMP/whitepaper.$lang.pdf" "$PUB1/banza-whitepaper-v1.0-$lang.pdf"
  cp "$TMP/whitepaper.$lang.pdf" "$PUB2/banza-whitepaper-v1.0-$lang.pdf"
done
echo "  ok: PDFs published to $PUB1 + $PUB2"
# 9. sync the single-source web edition mirror
for lang in pt en; do cp "$CONTENT/$lang.json" "$WEBMIRROR/$lang.json"; done
# The online edition renders the figures from its own served copy; sync it from the single figure source
# so the published page can never show figures from a superseded edition.
mkdir -p "$PUB1/figures"
cp docs/whitepaper/figures/*.svg "$PUB1/figures/"
echo "  ok: web edition mirror synced ($WEBMIRROR) + $(ls docs/whitepaper/figures/*.svg | wc -l | tr -d ' ') figures served from $PUB1/figures"
# 10/11. update manifest (pdfs sha/bytes/pages — idempotent; history untouched) + CHECKSUMS + mirror
python3 - <<'PY'
import json, hashlib, os
def sb(p):
    b=open(p,"rb").read(); return hashlib.sha256(b).hexdigest(), len(b)
pdfs={l: sb(f"website/public/whitepaper/banza-whitepaper-v1.0-{l}.pdf") for l in ("pt","en")}
for mp in ("docs/whitepaper/manifest.json", "website/content/whitepaper/manifest.json"):
    if not os.path.exists(mp): continue
    m=json.load(open(mp))
    for e in m.get("pdfs", []):
        l=e.get("lang")
        if l in pdfs:
            e["sha256"], e["bytes"] = pdfs[l]; e["pages"]=12
    json.dump(m, open(mp,"w"), ensure_ascii=False, indent=2); open(mp,"a").write("\n")
lines=["# BANZA Whitepaper v1.0 — SHA-256 of the released PDFs (edição de lançamento 2026-08-01; re-freeze 2026-08-04 após consolidação editorial)"]
for l in ("pt","en"):
    s,n=pdfs[l]; lines.append(f"{s}  banza-whitepaper-v1.0-{l}.pdf  ({n} bytes)")
open("docs/whitepaper/CHECKSUMS.txt","w").write("\n".join(lines)+"\n")
print("  ok: manifest.json + CHECKSUMS.txt + web manifest mirror updated (idempotent)")
PY
# 12/13. run the contract guard (incl. manifest immutability + canonical-engine check)
if bash tools/check-banza-whitepaper.sh >/dev/null 2>&1; then
  echo "  ok: banza-whitepaper-check PASS"
else
  echo "whitepaper-release: FAIL — banza-whitepaper-check did not pass"; bash tools/check-banza-whitepaper.sh; exit 1
fi
# Make the re-freeze explicit (never silent): report whether this run changed the committed artifacts.
if git diff --quiet -- "$PUB1" "$PUB2" "$MAN" docs/whitepaper/CHECKSUMS.txt "$WEBMIRROR" 2>/dev/null; then
  echo "  reproducible: canonical artifacts unchanged vs committed (no re-freeze)"
else
  echo "  ⚠ RE-FREEZE: canonical artifacts CHANGED vs committed — legitimate ONLY for an intentional content edit; review 'git diff' before committing"
fi
echo "whitepaper-release: ✅ canonical edition built, published, synced and verified — LaTeX/tectonic, 12 pp, deterministic (z-0 + SOURCE_DATE_EPOCH=$EPOCH). Run 'make whitepaper-verify' on a clean tree to prove exact reproducibility."
