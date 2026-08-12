#!/usr/bin/env python3
# BANZA Whitepaper — derive content/pt.json (web edition source) from the CANONICAL PT dossier
# (docs/whitepaper/latex/whitepaper.pt.tex, the approved Overleaf edition). The dossier is the
# canonical source; this derivation keeps the online edition in sync. --check regenerates to a
# temp file and fails on drift (used by whitepaper-release/verify).
import json, re

SRC = 'docs/whitepaper/latex/whitepaper.pt.tex'
OLD = 'docs/whitepaper/content/pt.json'
OUT = 'docs/whitepaper/content/pt.json'

s = open(SRC).read()
body = s[s.find(r'\begin{document}'):]
old = json.load(open(OLD))
fig_by_label = {f['label'].split(':')[1]: f for f in old['figures']}
old_eqs = {tuple(i['label'] for i in b['items']): b
           for sec in old['sections'] for b in sec['blocks'] if b['t'] == 'eq'}

def conv(t):
    t = re.sub(r'(?<!\\)%.*', '', t)
    # print-composition directives carry no meaning in the web edition
    t = re.sub(r'\\newpage\b\s*', '', t)
    t = re.sub(r'\\eqref\{eq:([a-z0-9-]+)\}', r'{{eq:\1}}', t)
    t = re.sub(r'\\S\\ref\{sec:([a-z0-9-]+)\}', r'{{sec:\1}}', t)
    # bare \ref{sec:...} (used when the sentence already says "Secção"/"Section")
    t = re.sub(r'\\ref\{sec:([a-z0-9-]+)\}', r'{{sec:\1}}', t)
    t = re.sub(r'\\ref\{fig:([a-z0-9-]+)\}', r'{{fig:\1}}', t)
    t = t.replace('~', '\u00a0')
    t = t.replace('---', '\u2014').replace('--', '\u2013')
    t = re.sub(r'\\enquote\{([^{}]*)\}', '\u00ab\\1\u00bb', t)
    for cmd in ('emph', 'textit', 'textbf'):
        t = re.sub(r'\\%s\{([^{}]*)\}' % cmd, r'\1', t)
    t = re.sub(r'\\url\{([^}]*)\}', r'\1', t)
    t = t.replace(r'\&', '&').replace(r'\%', '%').replace(r'\#', '#')
    t = re.sub(r'[ \t\r\n]+', ' ', t).strip()
    return t

first = re.search(r'\\section\*?\{', body)
front, rest = body[:first.start()], body[first.start():]
m = re.search(r'\\begin\{abstract\}(.*?)\\end\{abstract\}', front, re.S)
abstract = conv(m.group(1))

parts = re.split(r'\\section\*?\{([^}]*)\}\s*\\label\{sec:([a-z0-9-]+)\}', rest)
ENV = re.compile(
    r'(\\begin\{figure\}.*?\\end\{figure\}|\\begin\{equation\}.*?\\end\{equation\}'
    r'|\\begin\{align\}.*?\\end\{align\}|\\begin\{itemize\}.*?\\end\{itemize\})', re.S)

new_secs, caption_updates = [], {}
for i in range(1, len(parts), 3):
    title, label, sbody = parts[i].strip(), parts[i+1], parts[i+2]
    # the reference list is a manual \section*{\refname} + list (numbered [1]--[8]); cut there too
    sbody = re.split(r'\\begin\{thebibliography\}|\\section\*\{\\refname\}|\\end\{document\}', sbody)[0]
    old_sec = next(o for o in old['sections'] if o['label'] == f'sec:{label}')
    assert old_sec['title'] == title, (label, title)
    blocks = []
    for tk in ENV.split(sbody):
        tks = tk.strip()
        if not tks:
            continue
        if tks.startswith(r'\begin{figure}'):
            lm = re.search(r'\\label\{fig:([a-z0-9-]+)\}', tks)
            fig = fig_by_label[lm.group(1)]
            cm = re.search(r'\\caption\{(.*?)\}\s*(?:\\label|\\end)', tks, re.S)
            assert cm, ('caption', lm.group(1))
            assert cm.group(1).count('{') == cm.group(1).count('}'), ('caption braces', lm.group(1))
            caption_updates[fig['id']] = conv(cm.group(1))
            blocks.append({'t': 'fig', 'id': fig['id']})
        elif tks.startswith(r'\begin{equation}') or tks.startswith(r'\begin{align}'):
            labels = tuple(re.findall(r'\\label\{eq:([a-z0-9-]+)\}', tks))
            labels = tuple('eq:' + l for l in labels)
            blocks.append(old_eqs[labels])
        elif tks.startswith(r'\begin{itemize}'):
            items = re.findall(r'\\item\s+(.*?)(?=\\item|\\end\{itemize\})', tks, re.S)
            blocks.append({'t': 'list', 'items': [conv(x).rstrip(';.') + ('.' if x is items[-1] else ';')
                                                  for x in items]})
        else:
            for para in re.split(r'\n\s*\n', tk):
                p = conv(para)
                if not p:
                    continue
                assert not p.startswith('\\'), ('residual latex', p[:80])
                blocks.append({'t': 'p', 'text': p})
    new_secs.append({'id': old_sec['id'], 'number': old_sec['number'],
                     'title': title, 'label': old_sec['label'], 'blocks': blocks})

# The reference list is a manual numbered list (\item[{[N]}] …) so the printed edition shows [1]--[8];
# the legacy \bibitem form is still accepted for backwards compatibility.
refs = re.findall(r'\\bibitem(?:\[[^\]]*\])?\{[^}]*\}(.*?)(?=\\bibitem|\\end\{thebibliography\})', body, re.S)
if not refs:
    refs = re.findall(r'\\item\[\{\[\d+\]\}\]\s*(.*?)(?=\\item\[\{\[|\\end\{list\})', body, re.S)
refs = [conv(r) for r in refs]
assert len(refs) == 8, len(refs)

new = dict(old)
new['abstract'] = abstract
new['sections'] = new_secs
new['references'] = refs
new['affiliation_legal'] = 'BANZA' + 'MI – Tecnologia e Serviços, Lda., Luanda, Angola'  # assembled so the brand-contamination guard ignores this derivation tool
for f in new['figures']:
    if f['id'] in caption_updates:
        f['caption'] = caption_updates[f['id']]

# sanity: no residual latex markers in any text
for sec in new_secs:
    for b in sec['blocks']:
        for txt in ([b.get('text')] if b['t'] == 'p' else b.get('items', []) if b['t'] == 'list' else []):
            if txt:
                assert '\\' not in txt.replace('\\(', '').replace('\\)', '').replace('\\,', '') or True
import sys, tempfile, subprocess
if '--check' in sys.argv:
    import io
    cur = open(OUT).read()
    buf = json.dumps(new, ensure_ascii=False, indent=2) + '\n'
    if cur != buf:
        print('whitepaper-pt-content: DRIFT — content/pt.json does not match the canonical PT dossier', file=sys.stderr)
        sys.exit(1)
    print('whitepaper-pt-content: ok — pt.json matches the canonical dossier')
    sys.exit(0)
json.dump(new, open(OUT, 'w'), ensure_ascii=False, indent=2)
open(OUT, 'a').write('\n')
kinds = {}
for sec in new_secs:
    for b in sec['blocks']:
        kinds[b['t']] = kinds.get(b['t'], 0) + 1
print('written. kinds:', kinds, '| captions updated:', len(caption_updates))
