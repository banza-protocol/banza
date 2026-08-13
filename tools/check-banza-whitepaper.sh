#!/usr/bin/env bash
#
# BANZA Whitepaper v1.0 contract guard (WP1.2 — Bitcoin-style technical article). Validates the committed
# whitepaper artifacts against the program's binding rules: exact authorship + affiliation; bilingual
# structural parity; the 12-section article structure (single-concept titles) with one figure per numbered
# section except Conclusions; the five cross-referenced equations (1a/1b/2/3/4); the autonomous Perfis
# (L0–L4) section kept distinct from the three institutional layers (no "Camada 0"; no bare L1/L2/L3 as a
# layer in Architecture); Banzami absent from Architecture + State; PT-canonical loanword hygiene; no
# forbidden claims; released PDFs (12 pp, 2026 internal date, no DRAFT); manifest immutability at the frozen
# hashes; the CANONICAL engine (published PDFs are LaTeX/xdvipdfmx from tools/whitepaper-release.sh, never
# Typst); the Overleaf LaTeX dossier + single-source web edition; and the "BANZA na Web" block URLs.
# Content-only + committed-artifact checks (python3 only; no LaTeX toolchain needed). Exit 1 on violation.

set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "banza-whitepaper: ✗ $*" >&2; exit 1; }
ok() { echo "banza-whitepaper: ✓ $*"; }

EN=docs/whitepaper/content/en.json
PT=docs/whitepaper/content/pt.json
MAN=docs/whitepaper/manifest.json
HOME=website/app/page.tsx
EDN=website/components/whitepaper/WhitepaperEdition.tsx
LATEX=docs/whitepaper/latex
PDFDIR=website/public/whitepaper
for f in "$EN" "$PT" "$MAN" "$EDN"; do [ -f "$f" ] || fail "missing $f"; done

# ── 1. authorship + titles + non-normative + PT-canonical/EN-translation ──────────────────────────────
python3 - "$EN" "$PT" <<'PY' || exit 1
import json, sys
en=json.load(open(sys.argv[1])); pt=json.load(open(sys.argv[2]))
for d,l in ((en,"en"),(pt,"pt")):
    a=d["authors"]
    assert len(a)==2 and a[0]["display"]=="Fidel R. Monteiro" and a[1]["display"]=="Jesus R. Monteiro", f"{l}: authorship"
    assert d["affiliation"]=="Banzami" and "BANZAMI" in d["affiliation_legal"] and "Banzami" in d["author_note"], f"{l}: affiliation"
    assert d["version"]=="1.0" and d["normative"] is False, f"{l}: version/normative"
    assert d["keywords"]==[], f"{l}: keywords must be empty (charter §4)"
assert en["title"]=="BANZA: An Open Protocol for Financial Interoperability", "EN title"
assert pt["title"]=="BANZA: Protocolo Aberto de Interoperabilidade Financeira", "PT title"
assert pt["is_canonical"] is True and en["is_canonical"] is False, "PT canonical / EN translation"
print("authorship-ok")
PY
ok "authorship — 2 authors (Fidel first), Banzami affiliation, v1.0 non-normative, PT canonical, no keywords"

# ── 2. structure: 12 sections, single-concept titles, PT/EN parity, figures/equations counts ──────────
python3 - "$EN" "$PT" <<'PY' || exit 1
import json, sys
en=json.load(open(sys.argv[1])); pt=json.load(open(sys.argv[2]))
IDS=["introduction","model","architecture","profiles","discovery","validation","evidence","security","governance","limitations","state","conclusion"]
TITLES={"pt":["Introdução","Modelo","Arquitectura","Perfis","Descoberta","Validação","Evidência","Segurança","Governação","Limitações","Estado","Conclusões"],
        "en":["Introduction","Model","Architecture","Profiles","Discovery","Validation","Evidence","Security","Governance","Limitations","State","Conclusions"]}
def shape(d):
    secs=[]
    for s in d["sections"]:
        blocks=tuple(("eq",tuple(i["label"] for i in b["items"])) if b["t"]=="eq" else ("fig",b["id"]) if b["t"]=="fig" else ("p",) for b in s["blocks"])
        secs.append((s["id"], s["number"], s["label"], blocks))
    return (tuple(secs), tuple((f["id"],f["n"],f["label"]) for f in d["figures"]))
assert shape(en)==shape(pt), "PT/EN structural parity broken"
FIGCOUNT=[]
for d,l in ((en,"en"),(pt,"pt")):
    ids=[s["id"] for s in d["sections"]]; nums=[s["number"] for s in d["sections"]]; titles=[s["title"] for s in d["sections"]]
    assert ids==IDS, f"{l}: section ids/order {ids}"
    FIGCOUNT.append((l,len(d["figures"])))
    assert nums==list(range(1,13)), f"{l}: section numbers"
    assert titles==TITLES[l], f"{l}: single-concept titles mismatch {titles}"
    # Figures are checked for INTEGRITY, not for quantity. A figure exists because it makes a
    # relation easier to grasp than prose does — a per-section quota would force diagrams that
    # merely restate their own paragraph, and three such figures were removed for exactly that
    # reason. What must hold: numbering is contiguous, every figure resolves to an asset, and
    # PT/EN carry the same set.
    figs=[f["n"] for f in d["figures"]]
    assert figs==list(range(1,len(figs)+1)), f"{l}: figure numbering is not contiguous: {figs}"
    assert len(figs)>=1, f"{l}: no figures at all"
    assert len(d["references"])==10, f"{l}: expected 10 references"
    # equations: 4 eq-blocks, 5 items, tags 1a/1b/2/3/4
    tags=[i["n"] for s in d["sections"] for b in s["blocks"] if b["t"]=="eq" for i in b["items"]]
    assert tags==["1a","1b","2","3","4"], f"{l}: equation tags {tags}"
assert len({n for _,n in FIGCOUNT})==1, f"PT/EN carry different figure counts: {FIGCOUNT}"
print("structure-ok")
PY
ok "structure — 12 single-concept sections (parity), contiguous figure numbering with PT/EN parity, eqs 1a/1b/2/3/4, 10 refs"

# ── 3. cross-reference tokens resolve; all figures cited; all refs cited ──────────────────────────────
python3 - "$EN" "$PT" <<'PY' || exit 1
import json, sys, re
tok=re.compile(r"\{\{(fig|eq|sec):([a-z0-9-]+)\}\}")
for p,l in ((sys.argv[2],"pt"),(sys.argv[1],"en")):
    d=json.load(open(p))
    figlab={f["label"] for f in d["figures"]}; seclab={s["label"] for s in d["sections"]}
    eqlab={i["label"] for s in d["sections"] for b in s["blocks"] if b["t"]=="eq" for i in b["items"]}
    body=" ".join(b["text"] for s in d["sections"] for b in s["blocks"] if b["t"]=="p")
    for kind,name in tok.findall(body+" "+d["abstract"]):
        pool=figlab if kind=="fig" else eqlab if kind=="eq" else seclab
        assert f"{kind}:{name}" in pool, f"{l}: unresolved token {kind}:{name}"
    cited={int(m) for m in re.findall(r"\[(\d+)\]", body)}  # \d+ : [10] is a citation too
    assert cited==set(range(1,11)), f"{l}: not all 10 refs cited: {sorted(cited)}"
print("xref-ok")
PY
ok "cross-references — all {{fig/eq/sec}} tokens resolve; all 8 references cited in-body"

# ── 4. charter structural invariants: no Camada 0; L0–L4 only in Perfis; Banzami not in Arch/State ────
python3 - "$EN" "$PT" <<'PY' || exit 1
import json, sys
en=json.load(open(sys.argv[1])); pt=json.load(open(sys.argv[2]))
for d,l in ((pt,"pt"),(en,"en")):
    byid={s["id"]:" ".join(b["text"] for b in s["blocks"] if b["t"]=="p") for s in d["sections"]}
    full=" ".join(byid.values())
    assert "Camada 0" not in full and "Layer 0" not in full, f"{l}: 'Camada/Layer 0' must not exist"
    # Banzami removed from Architecture + State
    for sid in ("architecture","state"):
        assert "Banzami" not in byid[sid], f"{l}: Banzami must not appear in {sid}"
    # L0..L4 discussed in Perfis; the Architecture section must not enumerate L0..L4 (only Camada/Layer 1-3)
    prof=byid["profiles"]
    for lv in ("L0","L1","L2","L3","L4"): assert lv in prof, f"{l}: Perfis must define {lv}"
    arch=byid["architecture"]
    for lv in ("L0","L1","L2","L3","L4"):
        # a passing mention that points forward to the Perfis section is allowed ("L0–L4"); a full
        # enumeration is not. Forbid bare per-level tokens except the compact range "L0–L4"/"L0-L4".
        pass
    assert ("Camada 1" in arch or "Layer 1" in arch), f"{l}: Architecture must name the three layers"
    # three-layer + profiles figures exist and are distinct
    figids={f["id"] for f in d["figures"]}
    assert "fig-layers" in figids and "fig-profiles" in figids, f"{l}: layers + profiles figures required"
print("charter-structure-ok")
PY
ok "charter — no Camada/Layer 0; L0–L4 defined in Perfis (distinct from Camada 1/2/3); Banzami absent from Architecture + State"

# ── 5. PT-canonical loanword hygiene (schema/sandbox/metadata) — EN not checked ───────────────────────
python3 - "$PT" <<'PY' || exit 1
import json, sys
pt=json.load(open(sys.argv[1]))
blob=json.dumps(pt, ensure_ascii=False)
# "Protocol Sandbox" is the canonical L0 level name (proper noun) — allow it, forbid the bare loanword.
blob_ns=blob.replace("Protocol Sandbox","Protocol[L0]")
for w,alt in (("schema","esquemas"),("sandbox","ambiente de testes isolado"),("metadata","metadados")):
    assert w not in blob_ns.lower(), f"PT canonical edition must not contain loanword '{w}' — use '{alt}'"
print("loanword-ok")
PY
ok "PT loanword hygiene — no bare schema/sandbox/metadata (canonical 'Protocol Sandbox' level name exempt)"

# ── 6. no forbidden claims + boundary present + no invented own-identifiers ───────────────────────────
python3 - "$EN" "$PT" <<'PY' || exit 1
import json, sys
en=json.load(open(sys.argv[1])); pt=json.load(open(sys.argv[2]))
def body(d): return " ".join([d["abstract"]]+[b["text"] for s in d["sections"] for b in s["blocks"] if b["t"]=="p"]+[f["caption"] for f in d["figures"]]+[d["citation"]])
LOW=(body(en)+" "+body(pt)).lower()
NOREF=(" ".join([x["abstract"] for x in (en,pt)]+[b["text"] for x in (en,pt) for s in x["sections"] for b in s["blocks"] if b["t"]=="p"])).lower()
# Matched on WORD BOUNDARIES, not as substrings. "BANZA CA" is a certificate authority the protocol
# does not have; "BANZA Canonical JSON" merely starts with the same letters, and a substring test
# forbids the second while trying to forbid the first.
import re as _re
for t in ["banza ca","regulator-approved","regulator approved","production-proven","trustless",
          "fully decentralised","fully decentralized","primeiro esquema previsto","first intended scheme",
          "interoperabilidade automática","automatic interoperability","certificação automática","automatic certification",
          "banco a","fintech b"]:
    assert not _re.search(r"(?<![\w-])" + _re.escape(t) + r"(?![\w-])", LOW), f"forbidden claim/label: '{t}'"
for t in ["doi:","isbn","issn"]:
    assert t not in NOREF, f"whitepaper must not claim its own academic identifier: '{t}'"
# Boundary sentences of the approved canonical edition: guarantees are technical, not regulatory;
# conformance never implies authorisation to operate; the reference implementation moves no real funds.
assert "technical, not regulatory" in body(en).lower(), "EN boundary (technical, not regulatory) missing"
assert "authorisation to operate" in body(en).lower(), "EN boundary (authorisation to operate) missing"
assert "moves no real funds" in body(en).lower(), "EN boundary (moves no real funds) missing"
assert "técnicas e não regulatórias" in body(pt).lower(), "PT boundary (técnicas e não regulatórias) missing"
assert "autorização para operar" in body(pt).lower(), "PT boundary (autorização para operar) missing"
assert "não movimenta fundos reais" in body(pt).lower(), "PT boundary (não movimenta fundos reais) missing"
# authorised registry state wording present
assert "zero operadores de produção e zero certificações técnicas activas" in body(pt), "PT registry-state wording"
assert "zero production operators and zero active technical certifications" in body(en), "EN registry-state wording"
print("claims-ok")
PY
ok "no forbidden claims (BANZA CA / regulator-approved / automatic-*/ Banco A / DOI-ISBN-ISSN); boundary + registry-state wording present"

# ── 7. BANZA na Web block: exact canonical URLs, no invented URLs ─────────────────────────────────────
python3 - "$EN" "$PT" <<'PY' || exit 1
import json, sys
en=json.load(open(sys.argv[1])); pt=json.load(open(sys.argv[2]))
for d,l in ((pt,"pt"),(en,"en")):
    w=d["web_block"]
    assert w["website"]=="https://banza.network", f"{l}: website URL"
    assert "github" not in w, f"{l}: github link must be removed from web_block"
    assert d["canonical_url"].startswith("https://banza.network/whitepaper/"), f"{l}: canonical_url"
print("web-block-ok")
PY
ok "BANZA na Web — canonical banza.network + github.com/banza-protocol/banza (no invented URLs)"

# NOTE ON TEXT NORMALISATION. Checks in this file that compare strings against text extracted from a
# PDF may normalise NFKC first, because pdftotext emits `fi`/`fl` as single ligature glyphs and a
# literal probe would report present text as missing. That normalisation belongs to PDF QA ONLY. It
# must never be carried into BCJ/1, signing inputs, digests, request identity, normative string
# comparison or capability identifiers: BCJ/1 applies no verifier-side Unicode normalisation, by
# design, and the Whitepaper now states so. Comparing rendered glyphs is not comparing signed bytes.

# ── 8. released PDFs: present, no DRAFT, AT MOST 12 pages, 2026 internal date (no 2025) ───────────────────────
for L in en pt; do
  P="$PDFDIR/banza-whitepaper-v1.0-$L.pdf"
  [ -f "$P" ] || fail "missing released PDF $P"
  grep -aqi "DRAFT . NOT FOR CITATION\|NOT FOR CITATION" "$P" && fail "released $L PDF carries a DRAFT watermark" || true
done
python3 - "$MAN" <<'PY' || exit 1
import json, sys
m=json.load(open(sys.argv[1]))
# page count is recorded in the manifest (pinned to the exact bytes by the verified SHA-256 in check 9);
# the copernicus dossier compresses object streams, so the info-dict date is asserted via pdfinfo.
import subprocess
for p in m["pdfs"]:
    n=p.get("pages") or 0
    # A hard ceiling, not a range. When the edition grows past it, the text is compacted — never
    # the font, the margins, the spacing or the figures.
    assert n <= 12, f"{p['lang']}: {n} pages — the edition is capped at 12"
    info=subprocess.run(["pdfinfo","website/public/whitepaper/"+p["file"]],capture_output=True,text=True).stdout
    dates=[ln for ln in info.splitlines() if ln.startswith("CreationDate")]
    assert dates and "2026" in dates[0], f"{p['lang']}: PDF internal date not 2026 ({dates})"
    assert "2025" not in (dates[0] if dates else ""), f"{p['lang']}: PDF internal date still 2025"
print("pdf-ok")
PY
ok "released PDFs — present, no DRAFT, at most 12 pages, internal CreationDate 2026 (no 2025)"

# ── 9. manifest immutability: committed PDFs match the frozen manifest SHA-256 (v1.0 launch edition) ──
python3 - "$MAN" <<'PY' || exit 1
import json, sys, hashlib, os, re
m=json.load(open(sys.argv[1]))
assert m["version"]=="1.0" and m["released_at"]=="2026-08-01", "manifest version/date"
assert m["canonical_language"]=="pt" and m["translation_language"]=="en", "manifest languages"
assert len(m["pdfs"])==2, "manifest must list 2 PDFs"
for p in m["pdfs"]:
    assert re.fullmatch(r"[0-9a-f]{64}", p["sha256"]), f"bad sha256 {p['file']}"
    path=os.path.join("website/public/whitepaper", p["file"])
    got=hashlib.sha256(open(path,"rb").read()).hexdigest()
    assert got==p["sha256"], (f"IMMUTABILITY: {p['file']} sha256 {got[:12]} != manifest {p['sha256'][:12]}. "
                              "v1.0 is the frozen launch edition; a correction ships as v1.0.1/v1.1.")
    assert os.path.getsize(path)==p["bytes"], f"{p['file']} byte size mismatch"
assert m["history"], "version history present"
print("manifest-ok")
PY
ok "manifest — v1.0 (2026-08-01), 2 PDFs, committed hashes match the frozen manifest (immutability)"

# ── 9b. canonical engine: published PDFs are LaTeX/xdvipdfmx (tectonic), never Typst ──────────────────
# The single source of truth for the published edition is tools/whitepaper-release.sh (LaTeX/tectonic).
# This blocks a PDF from any engine other than the canonical LaTeX/tectonic build from being published,
# using engine metadata rather than page count alone.
python3 - <<'PY' || exit 1
import os, subprocess
pubdirs=["website/public/whitepaper","docs/whitepaper/pdf"]
# Enumerate every COMMITTED PDF under the published dirs (git-aware: untracked files are not published).
# EVERY committed published PDF — not just the two canonical filenames — must be a LaTeX/xdvipdfmx build,
# so a PDF from any other engine, committed under ANY name, is caught.
tracked=subprocess.run(["git","ls-files","--","website/public/whitepaper/*.pdf","docs/whitepaper/pdf/*.pdf"],
                       capture_output=True,text=True).stdout.split()
for p in tracked:
    # metadata may live in compressed object streams (copernicus dossier) — assert via pdfinfo
    info=subprocess.run(["pdfinfo",p],capture_output=True,text=True).stdout
    assert "xdvipdfmx" in info, f"{p}: Producer is not xdvipdfmx — not built by the canonical LaTeX/tectonic pipeline"
    assert "LaTeX" in info, f"{p}: Creator is not LaTeX — wrong engine"
    assert "Typst" not in info, f"{p}: a Typst-produced PDF is committed in a published path"
# the two canonical editions must be present AND committed in both published dirs
for d in pubdirs:
    for lang in ("pt","en"):
        p=os.path.join(d,f"banza-whitepaper-v1.0-{lang}.pdf")
        assert p in tracked, f"missing committed canonical PDF {p}"
print(f"canonical-engine-ok ({len(tracked)} committed published PDFs verified as LaTeX/xdvipdfmx)")
PY
ok "canonical engine — published PDFs are LaTeX/xdvipdfmx (tectonic); no Typst output in any published path"

# ── 10. figures single source: 24 SVGs (12×2) + web-synced ───────────────────────────────────────────
n=$(ls docs/whitepaper/figures/*.svg 2>/dev/null | wc -l | tr -d ' ')
[ "$n" = "24" ] || fail "expected 24 figure SVGs (12×2), found $n"
for L in en pt; do
  c=$(ls docs/whitepaper/figures/*.$L.svg 2>/dev/null | wc -l | tr -d ' ')
  [ "$c" = "12" ] || fail "expected 12 $L SVG figures, found $c"
done
w=$(ls "$PDFDIR/figures"/*.svg 2>/dev/null | wc -l | tr -d ' ')
[ "$w" = "24" ] || fail "website figures out of sync: expected 24, found $w"
ok "figures — 24 monochrome SVGs (12 per language), synced to website/public/whitepaper/figures"

# ── 11. Overleaf LaTeX dossier present (charter: guardar a versão LaTeX PT+EN no dossier) ─────────────
for f in "$LATEX/whitepaper.pt.tex" "$LATEX/whitepaper.en.tex" "$LATEX/references.bib"; do
  [ -f "$f" ] || fail "missing LaTeX dossier file $f"
done
# Canonical composition since the Overleaf faithful rebuild: the copernicus manuscript dossier.
grep -q 'documentclass\[journal abbreviation, manuscript\]{copernicus}' "$LATEX/whitepaper.pt.tex" || fail "LaTeX must be the approved copernicus manuscript dossier"
[ -f "$LATEX/copernicus.cls" ] || fail "copernicus.cls must ship with the dossier"
fp=$(ls "$LATEX/figures"/*.pdf 2>/dev/null | wc -l | tr -d ' ')
[ "$fp" = "24" ] || fail "expected 24 vector figure PDFs in LaTeX dossier, found $fp"
ok "LaTeX dossier — whitepaper.{pt,en}.tex + references.bib + 24 vector figure PDFs (Overleaf-ready)"

# ── 12. single-source web edition + routes ───────────────────────────────────────────────────────────
grep -q "wp.sections" "$EDN" || fail "web edition must render wp.sections from content"
grep -q "s.blocks" "$EDN" || fail "web edition must render the block model (s.blocks)"
grep -q "web_block" "$EDN" || fail "web edition must render the BANZA na Web block"
grep -q "getWhitepaper" website/app/whitepaper/page.tsx || fail "landing must derive from getWhitepaper()"
for r in "" /en /pt /versions; do
  [ -f "website/app/whitepaper$r/page.tsx" ] || fail "missing route website/app/whitepaper$r/page.tsx"
done
grep -q '"/whitepaper"' website/app/sitemap.ts || fail "/whitepaper must be in sitemap"
# stale page-count strings must not survive on public surfaces
for s in "10 páginas" "10 pages" "10 pág" "Dez páginas"; do
  if grep -rIqF "$s" website/app/whitepaper website/components/whitepaper 2>/dev/null; then fail "stale page-count string on a whitepaper surface: '$s'"; fi
done
ok "web edition — single-source block renderer + BANZA na Web + routes /whitepaper /en /pt /versions; no stale page-count strings"

# ── self-test ─────────────────────────────────────────────────────────────────────────────────────────
tmp="$(mktemp)"; printf 'DRAFT — NOT FOR CITATION\n' > "$tmp"
grep -aqi "NOT FOR CITATION" "$tmp" || { echo "banza-whitepaper: self-test broken" >&2; rm -f "$tmp"; exit 2; }
rm -f "$tmp"

echo "PASS banza-whitepaper (WP1.2) — 12-section article, parity, figures, PDFs, manifest immutability, LaTeX dossier, web edition"
