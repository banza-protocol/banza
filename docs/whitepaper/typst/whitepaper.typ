// BANZA Whitepaper v1.0 — Typst template (single source: reads docs/whitepaper/content/<lang>.json
// and the shared figures). Reproducible: bundled fonts only (New Computer Modern + DejaVu Sans Mono),
// A4, one column, selectable text, embedded fonts. Inputs: --input lang=en|pt --input draft=1|0.
// Build via tools/whitepaper-build.sh (pinned Typst). Non-normative document.

#let lang = sys.inputs.at("lang", default: "en")
#let draft = sys.inputs.at("draft", default: "1") == "1"
#let c = json("../content/" + lang + ".json")
#let figbase = "../figures/"

#let L = (
  en: (abstract: "Abstract", keywords: "Keywords", references: "References",
       cite: "Recommended citation", eq: "Equation", fig: "Figure", page: "Page",
       publisher: "Publisher", nonnormative: "Non-normative foundational document.",
       license: "Licence", version: "Version"),
  pt: (abstract: "Resumo", keywords: "Palavras-chave", references: "Referências",
       cite: "Citação recomendada", eq: "Equação", fig: "Figura", page: "Página",
       publisher: "Publicado por", nonnormative: "Documento fundacional não normativo.",
       license: "Licença", version: "Versão"),
).at(lang)

// Resolve {{fig:}}/{{eq:}}/{{sec:}} cross-reference tokens to their rendered numbers
// (Typst has no LaTeX \ref; the single-source JSON carries the labels + numbers).
#let resolve(t) = {
  let out = t
  for f in c.figures { out = out.replace("{{" + f.label + "}}", str(f.n)) }
  for s in c.sections {
    for b in s.blocks {
      if b.t == "eq" { for it in b.items { out = out.replace("{{" + it.label + "}}", "(" + it.n + ")") } }
    }
  }
  for s in c.sections { out = out.replace("{{" + s.label + "}}", "§" + str(s.number)) }
  out
}

// Deterministic PDF CreationDate/ModDate derived from the content's publication date (date_iso),
// so the embedded metadata never depends on the build machine's clock (§Blocker 1).
#let _di = c.date_iso.split("-")
#set document(title: c.title, author: c.authors.map(a => a.display),
  date: datetime(year: int(_di.at(0)), month: int(_di.at(1)), day: int(_di.at(2))))
#set page(
  paper: "a4",
  margin: (top: 1.75cm, bottom: 1.7cm, x: 2.0cm),
  footer: context {
    set text(size: 8pt, fill: rgb("#555"))
    grid(columns: (1fr, 1fr),
      align(left)[#c.title],
      align(right)[#counter(page).display("1 / 1", both: true)])
  },
  background: if draft {
    rotate(-30deg, text(size: 60pt, fill: rgb(0,0,0,18), weight: "bold")[DRAFT — NOT FOR CITATION])
  },
)
#set text(font: "New Computer Modern", size: 11pt, lang: lang, hyphenate: false)
// Per-language vertical rhythm: the canonical PT edition fills ten pages at the base rhythm; the
// (more compact) English translation is given slightly more generous, still-academic leading/spacing
// so it also fills exactly ten pages — legible whitespace, never font shrink or margin abuse (§11).
#let bodylead = if lang == "en" { 0.96em } else { 0.86em }
#let bodyspace = if lang == "en" { 1.26em } else { 0.9em }
#set par(justify: true, leading: bodylead, spacing: bodyspace, first-line-indent: 0pt)
#show heading: set text(weight: "bold")
#show heading.where(level: 1): it => block(above: 1.5em, below: 0.9em, text(size: 13pt, it))
#set heading(numbering: none)
#show raw: set text(font: "DejaVu Sans Mono", size: 8.6pt)

// ---- Page 1: cover -------------------------------------------------------------------------------
#align(center)[
  #v(1.2cm)
  #text(size: 9pt, fill: rgb("#8B1428"), tracking: 1.2pt)[BANZA · WHITEPAPER v#c.version]
  #v(0.5cm)
  #[#set par(justify: false); #text(size: 20pt, weight: "bold", hyphenate: false)[#c.title]]
  #v(0.3cm)
  #text(size: 11pt, style: "italic", fill: rgb("#444"))[#c.subtitle]
  #v(0.8cm)
  #text(size: 12pt)[#c.authors.map(a => a.display).join("   ·   ")]
  #v(0.15cm)
  #text(size: 10pt, fill: rgb("#444"))[#c.author_note]
  #v(0.1cm)
  #text(size: 10pt)[#c.affiliation_legal]
  #v(1.0cm)
  #line(length: 40%, stroke: 0.5pt + rgb("#B8985F"))
  #v(0.6cm)
]
#grid(columns: (1fr), gutter: 0.5em)[
  #set text(size: 9pt, fill: rgb("#333"))
  #align(center)[
    #c.date_display · #c.status \
    #L.license: #c.license · #c.canonical_url \
    #L.publisher: #c.publisher
  ]
]
#v(0.8cm)
#block(inset: 10pt, radius: 4pt, stroke: 0.5pt + rgb("#ccc"), width: 100%)[
  #set text(size: 8.6pt)
  #c.canonicity_notice \
  #v(0.4em)
  #c.scope_notice
]
#align(center)[#v(0.4cm) #text(size: 8pt, fill: rgb("#777"))[#c.copyright]]
#pagebreak()

// ---- Page 2+: abstract, keywords, then sections -------------------------------------------------
#heading(level: 1)[#L.abstract]
#resolve(c.abstract).replace("-", "‑")
#if c.keywords.len() > 0 [
  #v(0.4em)
  #text(weight: "bold")[#L.keywords: ] #c.keywords.join("; ").
]
#v(0.6em)

#for s in c.sections [
  #heading(level: 1)[#s.title]
  #for b in s.blocks [
    #if b.t == "p" [ #resolve(b.text).replace("-", "‑") #parbreak() ]
    #if b.t == "eq" [
      #v(0.2em)
      #for it in b.items [ #align(center)[#eval(it.typst, mode: "math") #h(1fr) (#it.n)] ]
      #v(0.2em)
    ]
    #if b.t == "list" [
      #list(..b.items.map(it => resolve(it)))
    ]
    #if b.t == "fig" [
      #let f = c.figures.find(x => x.id == b.id)
      #figure(
        image(figbase + f.at("file_" + lang), width: 82%),
        caption: [*#L.fig #f.n.* #resolve(f.caption).replace("-", "‑")],
        supplement: none, numbering: none,
      )
      #v(0.3em)
    ]
  ]
]

// ---- References + citation ----------------------------------------------------------------------
#heading(level: 1)[#L.references]
#set text(size: 8.6pt)
#for (i, r) in c.references.enumerate() [
  [#(i+1)] #r #parbreak()
]
#v(0.5em)
#set text(size: 9pt)
#text(weight: "bold")[#L.cite. ] #c.citation
#v(0.2em)
#text(size: 8pt, fill: rgb("#555"))[#L.version #c.version · #c.canonical_url · #c.license]
