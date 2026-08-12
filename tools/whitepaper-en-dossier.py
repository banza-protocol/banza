#!/usr/bin/env python3
# BANZA Whitepaper — generate the EN dossier (docs/whitepaper/latex/whitepaper.en.tex) from the
# canonical PT dossier template + the official EN translation (content/en.json). Structural
# transform only: same copernicus composition, EN text. --check fails on drift.
import json, re, sys

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
                    if re.match(r'^\s*\\', p.strip()) and len(p.strip().split()) == 1:
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

# bibliography EN (from en.json references, keeping \bibitem template)
for i, ref in enumerate(en['references'], 1):
    pat = re.compile(r'(\\bibitem\{ref%d\} ).*' % i)
    r = ref.replace('\u2014', '---').replace('\u2013', '--')
    s = pat.sub(lambda mm: mm.group(1) + r, s, count=1)

if '--check' in sys.argv:
    cur = open(OUT).read()
    if cur != s:
        print('whitepaper-en-dossier: DRIFT — whitepaper.en.tex does not match PT dossier + en.json', file=sys.stderr)
        sys.exit(1)
    print('whitepaper-en-dossier: ok — EN dossier matches PT dossier + en.json')
    sys.exit(0)
open(OUT, 'w').write(s)
print('EN tex written:', len(s), 'chars')
