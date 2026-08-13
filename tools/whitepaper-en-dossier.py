#!/usr/bin/env python3
# RETIRED FROM THE CANONICAL RELEASE PATH — DO NOT USE TO GENERATE THE EN WHITEPAPER.
#
# This composed docs/whitepaper/latex/whitepaper.en.tex from content/en.json. That direction made a
# derived representation the generation authority for an official edition — the same mistake that
# tools/whitepaper-latex.py made for PT, where composing the .tex from JSON silently recomposed an
# approved edition. The English edition is now written and maintained as LaTeX, translated from the
# frozen canonical PT dossier, and content/en.json is DERIVED from it by tools/whitepaper-content.py.
#
# Direction, for both languages:
#     whitepaper.<lang>.tex  ->  content/<lang>.json      allowed
#     content/<lang>.json    ->  whitepaper.<lang>.tex    forbidden
#
# tools/check-whitepaper-canonical-source-boundary.sh fails the build if this script re-enters the
# release path. Kept only as historical reference; running it aborts.
import sys

print(
    "whitepaper-en-dossier: RETIRED. This tool composed whitepaper.en.tex from content/en.json,\n"
    "which makes a derived representation the authority for an official edition. The EN dossier is\n"
    "now the editorial source: edit docs/whitepaper/latex/whitepaper.en.tex and derive the JSON with\n"
    "    python3 tools/whitepaper-content.py en",
    file=sys.stderr)
sys.exit(2)

# ── everything below is the retired implementation, kept for reference only ──────────────────────
RETIRED_BELOW = True


PT_TEX = 'docs/whitepaper/latex/whitepaper.pt.tex'
EN_JSON = 'docs/whitepaper/content/en.json'
OUT = 'docs/whitepaper/latex/whitepaper.en.tex'

en = json.load(open(EN_JSON))
s = open(PT_TEX).read()

def tex(t):
    t = t.replace('\u2014', '---').replace('\u2013', '--')
    t = re.sub(r'\{\{eq:([a-z0-9-]+)\}\}', r'\\eqref{eq:\1}', t)
    t = re.sub(r'\{\{sec:([a-z0-9-]+)\}\}', r'\\S\\ref{sec:\1}', t)
    t = re.sub(r'\{\{fig:([a-z0-9-]+)\}\}', r'\\ref{fig:\1}', t)
    t = t.replace('&', r'\&').replace('%', r'\%').replace('#', r'\#')
    return t

# ── preamble ──
s = s.replace(r'\PassOptionsToPackage{portuguese}{babel}', r'\PassOptionsToPackage{english}{babel}')
s = s.replace('\\def\\@@and{e}',
    '\\def\\@@and{and}\n'
    '% (EN) shared cls carries a PT-localised manuscript correspondence label; restore EN:\n'
    '\\usepackage{etoolbox}\n'
    '\\patchcmd{\\@@maketitlemanuscript}{Correspond\u00eancia:}{Correspondence:}{}{}'
    + '\n\\renewcommand\\Authand{ and }')
# body 4-line renews block is replaced below FIRST; the leftover preamble abstractname line is handled after

# ── front matter ──
s = s.replace(r'\selectlanguage{portuguese}', r'\selectlanguage{english}')
s = s.replace('''\\renewcommand{\\abstractname}{Resumo}
\\renewcommand{\\refname}{Referências}
\\renewcommand{\\figurename}{Figura}
\\renewcommand{\\tablename}{Tabela}''',
'''\\renewcommand{\\abstractname}{Abstract}
\\renewcommand{\\refname}{References}
\\renewcommand{\\figurename}{Figure}
\\renewcommand{\\tablename}{Table}''')
# now the remaining (preamble) abstractname line is unique — anglicise it too
s = s.replace(r'\renewcommand{\abstractname}{Resumo}', r'\renewcommand{\abstractname}{Abstract}')
TITLE_EN = en['title']
s = s.replace(r'\title{BANZA: Protocolo Aberto de Interoperabilidade Financeira}', '\\title{%s}' % TITLE_EN)
s = s.replace(r'\runningtitle{BANZA: Protocolo Aberto de Interoperabilidade Financeira}', '\\runningtitle{%s}' % TITLE_EN)
s = s.replace('Website oficial: \\url{https://banza.network}', 'Official website: \\url{https://banza.network}')

# abstract
m = re.search(r'\\begin\{abstract\}\n(.*?)\n\\end\{abstract\}', s, re.S)
s = s.replace(m.group(1), tex(en['abstract']))

# canonicity footnote
m = re.search(r'\\footnotetext\[1\]\{%\n\\textit\{(.*?)\}%\n\}', s, re.S)
s = s.replace(m.group(1), tex(en['canonicity_notice']))

# ── body: section titles, paragraphs, captions, list, figure files ──
sec_titles = {sec['label'].split(':')[1]: sec['title'] for sec in en['sections']}
for lab, title in sec_titles.items():
    s = re.sub(r'\\section\{[^}]*\}\\label\{sec:%s\}' % lab,
               lambda mm: '\\section{%s}\\label{sec:%s}' % (title, lab), s)

# figures: swap file suffixes + captions
figs = {f['label'].split(':')[1]: f for f in en['figures']}
s = s.replace('.pt.pdf', '.en.pdf')
FIGENV = re.compile(r'\\begin\{figure\}.*?\\end\{figure\}', re.S)
def swap_caption(env):
    lm = re.search(r'\\label\{fig:([a-z0-9-]+)\}', env)
    assert lm, env[:80]
    f = figs[lm.group(1)]
    cpat = re.compile(r'(\\caption\{)(.*?)(\}\s*\\label)', re.S)
    cm = cpat.search(env)
    assert cm, ('caption in env', lm.group(1))
    return env[:cm.start(2)] + tex(f['caption']) + env[cm.end(2):]
s = FIGENV.sub(lambda mm: swap_caption(mm.group(0)), s)

# The reference list is a manual \section*{\refname} + list environment (so the printed edition shows the
# numbered [1]--[8] labels). Split it off before the section walk — it is not prose to be translated
# block-by-block — and substitute the EN references into it further down.
REF_ANCHOR = '\\section*{\\refname}'
refblock = ''
if REF_ANCHOR in s:
    _i = s.index(REF_ANCHOR)
    s, refblock = s[:_i], s[_i:]

# paragraphs + list, in document order
first = re.search(r'\\section\{', s)
head, body = s[:first.start()], s[first.start():]
parts = re.split(r'(\\section\{[^}]*\}\\label\{sec:[a-z0-9-]+\})', body)
en_blocks = {sec['label'].split(':')[1]: [b for b in sec['blocks'] if b['t'] in ('p', 'list')]
             for sec in en['sections']}
ENV = re.compile(r'(\\begin\{figure\}.*?\\end\{figure\}|\\begin\{equation\}.*?\\end\{equation\}'
                 r'|\\begin\{align\}.*?\\end\{align\}|\\begin\{itemize\}.*?\\end\{itemize\}'
                 r'|\\begin\{thebibliography\}.*?\\end\{thebibliography\})', re.S)
out = [head]
cur = None
for part in parts:
    mm = re.match(r'\\section\{[^}]*\}\\label\{sec:([a-z0-9-]+)\}', part)
    if mm:
        cur = mm.group(1)
        out.append(part)
        continue
    if cur is None:
        out.append(part)
        continue
    blocks = en_blocks[cur]
    bi = 0
    chunks = ENV.split(part)
    new_chunks = []
    for ch in chunks:
        cs = ch.strip()
        if cs.startswith('\\begin{itemize}'):
            b = blocks[bi]; bi += 1
            assert b['t'] == 'list'
            items = '\n\n'.join('  \\item %s' % tex(x) for x in b['items'])
            new_chunks.append('\\begin{itemize}\n%s\n\\end{itemize}' % items)
        elif cs.startswith('\\begin{figure}') or cs.startswith('\\begin{equation}') \
                or cs.startswith('\\begin{align}') or cs.startswith('\\begin{thebibliography}'):
            new_chunks.append(ch)
        else:
            # replace each textual paragraph with the next EN paragraph
            paras = re.split(r'(\n\s*\n)', ch)
            np = []
            for p in paras:
                if p.strip() and not p.strip().startswith('\\end{document}') \
                        and not re.match(r'^\s*$', p) and not re.match(r'^(\n\s*\n)$', p):
                    # Not prose: LaTeX comments and bare single-command lines (e.g. \newpage) pass
                    # through untranslated, alone or combined.
                    code = '\n'.join(l for l in p.splitlines() if not l.strip().startswith('%')).strip()
                    if not code or (code.startswith('\\') and len(code.split()) == 1):
                        np.append(p)
                        continue
                    b = blocks[bi]; bi += 1
                    assert b['t'] == 'p', (cur, bi, p[:60])
                    np.append(tex(b['text']))
                else:
                    np.append(p)
            new_chunks.append(''.join(np))
    assert bi == len(blocks), (cur, bi, len(blocks))
    out.append(''.join(new_chunks))
s = ''.join(out)

# bibliography EN (from en.json references, keeping \bibitem template \u2014 legacy form)
for i, ref in enumerate(en['references'], 1):
    pat = re.compile(r'(\\bibitem\{ref%d\} ).*' % i)
    r = ref.replace('\u2014', '---').replace('\u2013', '--')
    s = pat.sub(lambda mm: mm.group(1) + r, s, count=1)

# reference list EN (manual numbered list: \item[{[N]}] \u2026), re-attached after the section walk
if refblock:
    for i, ref in enumerate(en['references'], 1):
        r = ref.replace('\u2014', '---').replace('\u2013', '--')
        pat = re.compile(r'(\\item\[\{\[%d\]\}\]\s*).*?(?=\n\\item\[\{\[|\n\\end\{list\})' % i, re.S)
        refblock = pat.sub(lambda mm: mm.group(1) + r, refblock, count=1)
    s = s + refblock

if '--check' in sys.argv:
    cur = open(OUT).read()
    if cur != s:
        print('whitepaper-en-dossier: DRIFT — whitepaper.en.tex does not match PT dossier + en.json', file=sys.stderr)
        sys.exit(1)
    print('whitepaper-en-dossier: ok — EN dossier matches PT dossier + en.json')
    sys.exit(0)
open(OUT, 'w').write(s)
print('EN tex written:', len(s), 'chars')
