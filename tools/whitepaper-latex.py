#!/usr/bin/env python3
# RETIRED FROM THE CANONICAL RELEASE PATH — DO NOT USE TO GENERATE THE WHITEPAPER.
#
# This was the pre-Overleaf-faithful generator (content/{pt,en}.json → article-class .tex). Using it
# as the generation authority silently RECOMPOSED the approved Overleaf edition (the 10-page incident).
# The canonical source is now docs/whitepaper/latex/whitepaper.pt.tex (the approved copernicus
# dossier); content/pt.json and whitepaper.en.tex are DERIVED from it via
# tools/whitepaper-pt-content.py and tools/whitepaper-en-dossier.py. See docs/whitepaper/BUILD.md.
# Kept only as historical reference; tools/check-whitepaper-canonical-source-boundary.sh fails the
# build if this script re-enters tools/whitepaper-release.sh.
import json
import os
import re

ROOT = os.path.join(os.path.dirname(__file__), "..")
CONTENT = os.path.join(ROOT, "docs", "whitepaper", "content")
OUT = os.path.join(ROOT, "docs", "whitepaper", "latex")

TOKEN = re.compile(r"\{\{(fig|eq|sec):([a-z0-9-]+)\}\}")


def esc(s):
    # Minimal, math-safe escaping: the content uses \(...\) for inline math (never bare & % #).
    # Normalise a few Unicode punctuation glyphs that pdflatex+inputenc does not define
    # (U+2212 MINUS, U+2013/2014 dashes, NBSP) so the .tex compiles under pdflatex AND xelatex.
    s = (s.replace("−", "-").replace("–", "--").replace("—", "---")
          .replace(" ", " "))
    return s.replace("&", r"\&").replace("%", r"\%").replace("#", r"\#")


def resolve(text, lang):
    def rep(m):
        kind, name = m.group(1), m.group(2)
        if kind == "fig":
            return r"\ref{fig:%s}" % name
        if kind == "eq":
            return r"\eqref{eq:%s}" % name
        # section cross-reference rendered as "§N" (both editions)
        return r"\S\ref{sec:%s}" % name
    return TOKEN.sub(rep, esc(text))


def preamble(d, lang):
    babel = "portuguese" if lang == "pt" else "english"
    names = {
        "pt": [("figure", "Figura", "Figuras"), ("equation", "Equação", "Equações"),
               ("section", "Secção", "Secções")],
        "en": [("figure", "Figure", "Figures"), ("equation", "Equation", "Equations"),
               ("section", "Section", "Sections")],
    }[lang]
    crefs = "\n".join(
        r"\crefname{%s}{%s}{%s}\Crefname{%s}{%s}{%s}" % (k, s, p, k, s, p) for k, s, p in names)
    authors = r" \and ".join(a["display"] for a in d["authors"])
    return r"""%% BANZA Whitepaper v%s — %s edition. Generated from content/%s.json (single source).
%% Overleaf: compiles with pdflatex (newtx) or xelatex/lualatex (TeX Gyre Termes). Non-normative.
\documentclass[11pt,a4paper]{article}
\usepackage{iftex}
\ifPDFTeX
  \usepackage[T1]{fontenc}
  \usepackage[utf8]{inputenc}
  \usepackage{amsmath}
  \usepackage{newtxtext}
  \usepackage{newtxmath}
\else
  \usepackage{amsmath}
  \usepackage{fontspec}
  \usepackage{unicode-math}
  \setmainfont{texgyretermes}[Extension=.otf,UprightFont=*-regular,BoldFont=*-bold,ItalicFont=*-italic,BoldItalicFont=*-bolditalic]
  \setmathfont{texgyretermes-math.otf}
\fi
\usepackage{mathtools}
\usepackage[a4paper,margin=2.4cm]{geometry}
\usepackage[%s]{babel}
\usepackage{csquotes}
\usepackage{graphicx}
\graphicspath{{figures/}}
\usepackage{float}
\usepackage{booktabs}
\usepackage{microtype}
\usepackage[skip=6pt plus1pt]{parskip}
\usepackage{caption}
\captionsetup{font=small,labelfont=bf,width=0.9\linewidth}
\usepackage[hidelinks]{hyperref}
\usepackage{cleveref}
%s
\setcounter{tocdepth}{0}
\frenchspacing
\title{%s}
\author{%s}
\date{%s}
""" % (d["version"], lang.upper(), lang, babel, crefs,
       esc(d["title"]), authors, esc(d["date_display"]))


def title_block(d, lang):
    statusline = ("Pré-produção · documento fundacional não normativo" if lang == "pt"
                  else "Pre-production · non-normative foundational document")
    verlabel = "Versão" if lang == "pt" else "Version"
    an = esc(d["author_note"])
    return r"""\begin{document}
%% Reproducible PDF: disable stream compression so the /Info dict (incl. CreationDate) and the
%% xref stay in plaintext — matches the frozen v1.0 launch build and keeps the SHA-256 stable
%% across engines. With SOURCE_DATE_EPOCH pinned, the build is byte-deterministic.
\special{dvipdfmx:config z 0}
\thispagestyle{plain}
\begin{center}
  {\Large\bfseries %s\par}
  \vspace{3pt}{\large\itshape %s\par}
  \vspace{9pt}{\normalsize %s\par}
  \vspace{2pt}{\small %s \textperiodcentered\ %s\par}
  \vspace{5pt}{\small %s: \url{%s}\par}
\end{center}
\vspace{2pt}
\begin{abstract}
\noindent %s
\end{abstract}
\vspace{2pt}
{\footnotesize\itshape %s\par}
\vspace{4pt}
""" % (esc(d["title"]), esc(d["subtitle"]), " \\qquad ".join(esc(a["display"]) for a in d["authors"]),
       an, esc(d["affiliation_legal"]),
       esc(d["web_block"]["website_label"]), d["web_block"]["website"],
       resolve(d["abstract"], lang), resolve(d["canonicity_notice"], lang))


def render_section(s, lang):
    out = [r"\section{%s}\label{%s}" % (esc(s["title"]), s["label"])]
    for b in s["blocks"]:
        if b["t"] == "p":
            out.append(resolve(b["text"], lang) + "\n")
        elif b["t"] == "eq":
            items = b["items"]
            if len(items) == 1:
                it = items[0]
                out.append(r"\begin{equation}%s\tag{%s}\label{%s}\end{equation}"
                           % (it["latex"], it["n"], it["label"]))
            else:
                lines = " \\\\\n".join(
                    r"%s \tag{%s}\label{%s}" % (it["latex"], it["n"], it["label"]) for it in items)
                out.append("\\begin{align}\n%s\n\\end{align}" % lines)
        elif b["t"] == "list":
            items = "\n".join(r"  \item %s" % resolve(x, lang) for x in b["items"])
            out.append("\\begin{itemize}\n%s\n\\end{itemize}" % items)
        elif b["t"] == "fig":
            out.append(FIGREF[b["id"]])
    return "\n".join(out)


def render_figure(f, lang):
    pdf = f["file_pt" if lang == "pt" else "file_en"].replace(".svg", ".pdf")
    return (r"""\begin{figure}[H]
  \centering
  \includegraphics[width=0.86\linewidth]{%s}
  \caption{%s}\label{%s}
\end{figure}""" % (pdf, resolve(f["caption"], lang), f["label"]))


def references(d, lang):
    # thebibliography emits its own localized heading ("Referências"/"References") via \refname (babel);
    # do NOT add a second \section*. Numeric [1..8] prose citations resolve against this list order.
    items = "\n".join(r"\bibitem{ref%d} %s" % (i + 1, esc(r)) for i, r in enumerate(d["references"]))
    n = len(d["references"])
    return "\\begin{thebibliography}{%d}\n%s\n\\end{thebibliography}" % (n, items)


def web_block(d, lang):
    w = d["web_block"]
    return r"""\section*{%s}
\begin{itemize}\setlength{\itemsep}{1pt}
  \item %s: \url{%s}
  \item %s: \url{%s}
\end{itemize}""" % (esc(w["title"]), esc(w["website_label"]), w["website"],
                    esc(w["github_label"]), w["github"])


def build(lang):
    d = json.load(open(os.path.join(CONTENT, lang + ".json"), encoding="utf-8"))
    # figure reference cache (id -> rendered figure env) for this language
    global FIGREF
    FIGREF = {f["id"]: render_figure(f, lang) for f in d["figures"]}
    parts = [preamble(d, lang), title_block(d, lang)]
    for s in d["sections"]:
        parts.append(render_section(s, lang))
    parts.append(references(d, lang))
    parts.append(r"\end{document}")
    tex = "\n\n".join(parts) + "\n"
    out = os.path.join(OUT, "whitepaper.%s.tex" % lang)
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(tex)
    return out


def build_bib():
    # Courtesy references.bib (numeric [1..8] citations in the .tex use thebibliography in list order;
    # this .bib mirrors the same sources for authors who prefer BibTeX on Overleaf).
    d = json.load(open(os.path.join(CONTENT, "pt.json"), encoding="utf-8"))
    entries = [r"""@techreport{banza-whitepaper-v1.0,
  title       = {{BANZA}: Protocolo Aberto de Interoperabilidade Financeira},
  author      = {Fidel R. Monteiro and Jesus R. Monteiro},
  institution = {Banzami (BANZAMI -- Tecnologia e Servi\c{c}os, Lda.)},
  year        = {2026}, type = {Whitepaper}, number = {Version 1.0},
  url         = {https://banza.network/whitepaper},
  note        = {Canonical Portuguese edition; official English translation available. Non-normative. Licensed CC BY 4.0.}
}"""]
    for i, r in enumerate(d["references"]):
        url = ""
        m = re.search(r"(https?://\S+)", r)
        if m:
            url = "\n  url  = {%s}," % m.group(1).rstrip(".")
        note = r.split(". http")[0]
        note = note.replace("&", r"\&").replace("_", r"\_")
        entries.append("@misc{ref%d,\n  note = {%s},%s\n  year = {2026}\n}" % (i + 1, note, url))
    with open(os.path.join(OUT, "references.bib"), "w", encoding="utf-8") as fh:
        fh.write("\n\n".join(entries) + "\n")


def main():
    os.makedirs(os.path.join(OUT, "figures"), exist_ok=True)
    outs = [build("pt"), build("en")]
    build_bib()
    print("wrote:", ", ".join(os.path.relpath(o) for o in outs), "+ references.bib")


if __name__ == "__main__":
    main()
