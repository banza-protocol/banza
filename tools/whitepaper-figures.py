#!/usr/bin/env python3
# BANZA Whitepaper v1.0 — figure generator (single source for the 12 monochrome technical figures,
# PT + EN). Emits docs/whitepaper/figures/*.{pt,en}.svg in the shared BANZA visual grammar
# (black on transparent, Georgia serif labels, ui-monospace sub-labels, 1.4pt boxes, dashed = optional).
# Geometry is language-neutral; only text differs, so PT and EN figures are guaranteed to match.
# Non-normative. Run:  python3 tools/whitepaper-figures.py
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "docs", "whitepaper", "figures")
STYLE = ('<style>text{fill:#000} .m{font-family:ui-monospace,Menlo,Consolas,monospace} '
         '.b{fill:none;stroke:#000;stroke-width:1.4} .l{stroke:#000;stroke-width:1.2;fill:none} '
         '.d{stroke:#000;stroke-width:1;stroke-dasharray:3 3;fill:none} '
         '.n{font-weight:bold}</style>')
DEFS = ('<defs><marker id="a" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">'
        '<path d="M0,0 L8,4.5 L0,9 z" fill="#000"/></marker></defs>')


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def box(x, y, w, h, cls="b", rx=4):
    return f'<rect class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}"/>'


def T(x, y, s, size=12.5, cls="", anchor="middle"):
    c = f' class="{cls}"' if cls else ""
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="{size}"{c}>{esc(s)}</text>'


def arrow(x1, y1, x2, y2, cls="l"):
    return f'<line class="{cls}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" marker-end="url(#a)"/>'


def svg(vb, title, desc, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" '
            f'aria-label="{esc(desc)}" font-family="Georgia, \'Times New Roman\', serif">\n'
            f'<title>{esc(title)}</title><desc>{esc(desc)}</desc>\n'
            f'<rect x="0" y="0" width="{vb.split()[2]}" height="{vb.split()[3]}" fill="none"/>\n'
            f'{STYLE}\n{DEFS}\n{body}\n</svg>\n')


# ── figure builders: each returns (viewBox, title, desc, body) for a given language dict `x` ──────────

def fig_bilateral(x):
    # Left: a bilateral complete mesh. Right: a shared public-specification box over n independent
    # implementations. A dashed divider separates the two regimes; the common spec, not a central
    # infrastructure, is the shared element.
    vb = "0 0 760 226"
    b = []
    b.append(T(178, 26, x["left"], 12.5, "n"))
    b.append(T(578, 26, x["right"], 12.5, "n"))
    # left: K4 mesh
    nodes = [(108, 74), (248, 74), (108, 188), (248, 188)]
    labels = ["A", "B", "C", "D"]
    for i in range(4):
        for j in range(i + 1, 4):
            b.append(f'<line class="l" x1="{nodes[i][0]}" y1="{nodes[i][1]}" x2="{nodes[j][0]}" y2="{nodes[j][1]}"/>')
    for (cx, cy), lb in zip(nodes, labels):
        b.append(f'<circle class="b" cx="{cx}" cy="{cy}" r="22"/>')
        b.append(T(cx, cy + 5, lb, 13))
    b.append(T(178, 216, x["left2"], 10, "m"))
    # divider
    b.append('<line class="d" x1="400" y1="44" x2="400" y2="200"/>')
    # right: shared spec box on top, four implementation boxes below
    b.append(box(440, 56, 300, 50))
    b.append(T(590, 80, x["rules"], 11.5))
    b.append(T(590, 97, x["rules2"], 9.5, "m"))
    impls = [x["ia"], x["ib"], x["ic"], x["idd"]]
    ix = [440, 517, 594, 671]
    for xx, lb in zip(ix, impls):
        b.append(box(xx, 148, 68, 42))
        b.append(T(xx + 34, 174, lb, 10.5))
        b.append(f'<line class="d" x1="{xx+34}" y1="148" x2="{xx+34}" y2="106"/>')
    b.append(T(590, 216, x["right2"], 10, "m"))
    return vb, x["title"], x["desc"], "".join(b)


def fig_model(x):
    # Chain operator → implementation → artifacts → bounded result, with the non-normative internal
    # technology as a detached dashed box under the implementation.
    vb = "0 0 760 148"
    b = [
        box(20, 34, 120, 44), T(80, 54, x["operator"], 11.5), T(80, 70, x["operator2"], 8.5, "m"),
        arrow(140, 56, 168, 56),
        box(170, 20, 200, 72), T(270, 42, x["impl"], 11.5), T(270, 63, x["attr1"], 8.5, "m"), T(270, 79, x["attr2"], 8.5, "m"),
        arrow(370, 56, 398, 56),
        box(400, 34, 150, 44), T(475, 54, x["artifacts"], 11), T(475, 70, x["artifacts2"], 8.5, "m"),
        arrow(550, 56, 578, 56),
        box(580, 28, 160, 56), T(660, 50, x["result"], 11.5), T(660, 67, x["result2"], 8.5, "m"),
        # internal technology, outside the conformance criteria
        f'<line class="d" x1="270" y1="92" x2="270" y2="112" marker-end="url(#a)"/>',
        box(140, 112, 260, 30, "d"), T(270, 127, x["tech"], 8.5), T(270, 138, x["tech2"], 8, "m"),
    ]
    return vb, x["title"], x["desc"], "".join(b)


def fig_layers(x):
    # Layer 1 (open protocol) over independent implementations, evaluated by Layer 2 (conformance &
    # interoperability certification); Layer 3 (independent operational schemes) below; BanzAI is a
    # transversal, non-authoritative interface across all three.
    vb = "0 0 760 296"
    ix = [70, 300, 530]
    b = []
    # Layer 1 band
    b.append(box(40, 12, 680, 40))
    b.append(T(380, 31, x["l1"], 12, "n"))
    b.append(T(380, 46, x["l1s"], 9.5, "m"))
    # independent implementations, connected up to Layer 1
    for xx, lb in zip(ix, [x["ia"], x["ib"], x["ic"]]):
        b.append(box(xx, 70, 160, 30))
        b.append(T(xx + 80, 90, lb, 10.5))
        b.append(f'<line class="d" x1="{xx+80}" y1="52" x2="{xx+80}" y2="70" marker-end="url(#a)"/>')
    # Layer 2 band, evaluating the implementations above
    b.append(box(40, 118, 680, 40))
    b.append(T(380, 137, x["l2"], 12, "n"))
    b.append(T(380, 152, x["l2s"], 9, "m"))
    for xx in ix:
        b.append(f'<line class="d" x1="{xx+80}" y1="100" x2="{xx+80}" y2="118" marker-end="url(#a)"/>')
    # Layer 3 — a container rectangle that comprises its operational schemes
    b.append(box(40, 176, 680, 80))
    b.append(T(380, 196, x["l3"], 12, "n"))
    for xx, lb in zip(ix, [x["sx"], x["sy"], x["sz"]]):
        b.append(box(xx, 212, 160, 32))
        b.append(T(xx + 80, 233, lb, 10.5))
    b.append(f'<line class="d" x1="380" y1="158" x2="380" y2="176" marker-end="url(#a)"/>')
    # BanzAI — transversal, non-authoritative interface across the three layers
    b.append(box(40, 268, 680, 22, "d"))
    b.append(T(380, 283, x["banzai"], 9.5, "m"))
    return vb, x["title"], x["desc"], "".join(b)


def fig_profiles(x):
    # Cumulative ladder: five stacked rungs, L0 at the base, each rung a strict superset of those below.
    vb = "0 0 760 244"
    b = []
    rungs = [("L4", "l4", 20), ("L3", "l3", 62), ("L2", "l2", 104), ("L1", "l1", 146), ("L0", "l0", 188)]
    for tag, key, y in rungs:
        b.append(box(80, y, 640, 38))
        b.append(T(112, y + 24, tag, 12.5, "n"))
        b.append(T(150, y + 16, x[key], 10.5, "", "start"))
        b.append(T(150, y + 31, x[key + "2"], 9, "m", "start"))
    b.append('<line class="l" x1="52" y1="222" x2="52" y2="24" marker-end="url(#a)"/>')
    b.append(f'<text x="46" y="125" text-anchor="middle" font-size="9" class="m" '
             f'transform="rotate(-90 46 125)">{esc(x["cum"])}</text>')
    b.append(T(400, 238, x["note"], 9.5, "m"))
    return vb, x["title"], x["desc"], "".join(b)


def fig_discovery(x):
    # implementation → canonical origin → signed manifest/metadata → server-side secure fetch → engines.
    vb = "0 0 760 182"
    b = [
        box(16, 58, 130, 50), T(81, 78, x["impl"], 11.5), T(81, 95, x["impl2"], 9, "m"),
        arrow(146, 83, 172, 83),
        box(174, 58, 140, 50), T(244, 78, x["origin"], 11.5), T(244, 95, ".well-known", 9, "m"),
        arrow(314, 83, 340, 83),
        box(342, 52, 150, 62), T(417, 76, x["manifest"], 11.5), T(417, 93, x["keys"], 9, "m"),
        arrow(492, 83, 518, 83),
        box(520, 58, 150, 50), T(595, 78, x["fetch"], 11), T(595, 95, x["fetch2"], 9, "m"),
        arrow(595, 108, 595, 132),
        box(520, 132, 150, 36), T(595, 155, x["engines"], 11.5),
        T(377, 150, x["note"], 9.5, "m"),
    ]
    return vb, x["title"], x["desc"], "".join(b)


def fig_journey(x):
    # eight technical steps + a ninth aggregation step; states and fail-closed legend below.
    vb = "0 0 760 228"
    b = []
    row1 = [("1", "s1"), ("2", "s2"), ("3", "s3"), ("4", "s4")]
    row2 = [("5", "s5"), ("6", "s6"), ("7", "s7"), ("8", "s8")]
    xs = [16, 202, 388, 574]
    w = 170
    for y, row in ((16, row1), (82, row2)):
        for (num, key), xx in zip(row, xs):
            b.append(box(xx, y, w, 46))
            b.append(T(xx + w / 2, y + 28, f'{num}. {x[key]}', 11))
        for i in range(3):
            b.append(arrow(xs[i] + w, y + 23, xs[i + 1], y + 23))
    # serpentine wrap: step 4 (end of row 1) feeds step 5 (start of row 2)
    b.append(f'<line class="l" x1="{xs[3]+w/2}" y1="62" x2="{xs[3]+w/2}" y2="72"/>')
    b.append(f'<line class="l" x1="{xs[0]+w/2}" y1="72" x2="{xs[3]+w/2}" y2="72"/>')
    b.append(arrow(xs[0] + w / 2, 72, xs[0] + w / 2, 82))
    # step 8 (end of the eight-step sequence) feeds the ninth aggregation step
    b.append(arrow(xs[3] + w / 2, 128, xs[3] + w / 2, 150))
    b.append(box(16, 150, 728, 44))
    b.append(T(380, 170, f'9. {x["s9"]}', 12, "n"))
    b.append(T(380, 187, x["s9note"], 9.5, "m"))
    # legends aligned to the margins so the long strings never overflow the viewBox edges
    b.append(T(16, 218, x["legend"], 9.5, "m", "start"))
    b.append(T(744, 218, x["failclosed"], 9.5, "m", "end"))
    return vb, x["title"], x["desc"], "".join(b)


def fig_example(x):
    # Directional A→B evaluation. B (top lane) publishes; A (bottom lane) starts, fetches, evaluates,
    # verifies. An arrow crosses from B's canonical origin down to A's fetch step.
    vb = "0 0 760 226"
    b = []
    b.append(T(24, 30, x["laneB"], 11, "n", anchor="start"))
    b.append(box(60, 40, 200, 44)); b.append(T(160, 59, f'1. {x["b1"]}', 10.5)); b.append(T(160, 75, x["b1b"], 9, "m"))
    b.append(arrow(260, 62, 298, 62))
    b.append(box(300, 40, 168, 44)); b.append(T(384, 59, x["origin"], 10.5)); b.append(T(384, 75, x["originb"], 9, "m"))
    b.append('<line class="d" x1="16" y1="100" x2="744" y2="100"/>')
    b.append(T(24, 126, x["laneA"], 11, "n", anchor="start"))
    steps = [(f'2. {x["a2"]}', x["a2b"]), (f'3. {x["a3"]}', x["a3b"]),
             (f'4. {x["a4"]}', x["a4b"]), (f'5. {x["a5"]}', x["a5b"])]
    sx = [24, 208, 392, 576]
    w = 160
    for xx, (t1, t2) in zip(sx, steps):
        b.append(box(xx, 138, w, 44)); b.append(T(xx + w / 2, 157, t1, 10)); b.append(T(xx + w / 2, 173, t2, 8.5, "m"))
    for i in range(3):
        b.append(arrow(sx[i] + w, 160, sx[i + 1], 160))
    # cross-lane fetch: B origin → A step 3
    b.append(f'<line class="l" x1="384" y1="84" x2="384" y2="100"/>')
    b.append(f'<line class="l" x1="384" y1="100" x2="288" y2="100"/>')
    b.append(arrow(288, 100, 288, 138))
    b.append(T(380, 214, x["note"], 9.5, "m"))
    return vb, x["title"], x["desc"], "".join(b)


def fig_evidence(x):
    # artifacts → engines → results/receipts → evidence bundle; technical registry optional (dashed);
    # BanzAI presents/explains only (dashed bottom).
    vb = "0 0 760 220"
    b = [
        box(24, 26, 168, 50), T(108, 49, x["artifacts"], 12), T(108, 67, x["artifacts2"], 9.5, "m"),
        arrow(192, 51, 210, 51),
        box(212, 26, 176, 50), T(300, 49, x["engines"], 12), T(300, 67, x["engines2"], 9.5, "m"),
        arrow(388, 51, 406, 51),
        box(408, 26, 150, 50), T(483, 49, x["results"], 12), T(483, 67, x["results2"], 9.5, "m"),
        arrow(558, 51, 576, 51),
        box(578, 26, 158, 50), T(657, 47, x["bundle"], 12), T(657, 65, x["bundle2"], 12),
        f'<line class="d" x1="657" y1="76" x2="657" y2="120" marker-end="url(#a)"/>',
        box(578, 120, 158, 42, "d"), T(657, 140, x["registry"], 11), T(657, 156, x["registry2"], 9.5, "m"),
        box(24, 180, 712, 32, "d"), T(380, 200, x["banzai"], 10.5),
    ]
    return vb, x["title"], x["desc"], "".join(b)


def fig_security(x):
    # per-threat defensive flow: each row shows [threat] -> [mechanism] -> [expected result]; a shared
    # fail-closed principle spans the whole model below.
    vb = "0 0 760 268"
    b = []
    # geometry: three columns of boxes joined by arrows
    tx, tw = 16, 208     # threat box
    mx, mw = 268, 250    # mechanism box
    ox, ow = 574, 170    # outcome box
    b.append(T(tx + tw / 2, 20, x["cThreat"], 11.5, "n"))
    b.append(T(mx + mw / 2, 20, x["cMech"], 11.5, "n"))
    b.append(T(ox + ow / 2, 20, x["cOut"], 11.5, "n"))
    rows = ["r1", "r2", "r3", "r4", "r5"]
    y = 32
    h = 34
    for r in rows:
        cyc = y + h / 2
        b.append(box(tx, y, tw, h))
        b.append(T(tx + tw / 2, cyc + 4, x[r + "t"], 9.5))
        b.append(arrow(tx + tw, cyc, mx, cyc))
        b.append(box(mx, y, mw, h))
        b.append(T(mx + mw / 2, cyc + 4, x[r + "m"], 9.5))
        b.append(arrow(mx + mw, cyc, ox, cyc))
        b.append(box(ox, y, ow, h))
        b.append(T(ox + ow / 2, cyc + 4, x[r + "o"], 9.5, "n"))
        y += h + 6
    # shared fail-closed principle spanning the model
    b.append(box(tx, y + 2, ox + ow - tx, 26, "d"))
    b.append(T(380, y + 19, x["failclosed"], 9.5, "m"))
    return vb, x["title"], x["desc"], "".join(b)


def fig_governance(x):
    # linear pipeline: published version → RFC proposal/discussion → ADR recorded decision → versioned
    # publication → coexistence and migration.
    vb = "0 0 760 152"
    b = []
    boxes = [(x["current"], x["current2"]), (x["rfc"], x["rfc2"]), (x["adr"], x["adr2"]),
             (x["pub"], x["pub2"]), (x["coex"], x["coex2"])]
    xs = [16, 166, 316, 466, 616]
    w = 128
    for xx, (t1, t2) in zip(xs, boxes):
        b.append(box(xx, 40, w, 50))
        b.append(T(xx + w / 2, 61, t1, 10.5))
        b.append(T(xx + w / 2, 77, t2, 9, "m"))
    for i in range(4):
        b.append(arrow(xs[i] + w, 65, xs[i + 1], 65))
    b.append(T(380, 126, x["note"], 9.5, "m"))
    return vb, x["title"], x["desc"], "".join(b)


def fig_limits(x):
    # outer dashed area = out of the observed scope (five items on the left); inner solid box = what
    # BANZA actually evaluates (on the right).
    vb = "0 0 760 214"
    b = [
        box(30, 18, 700, 178, "d"),
        T(54, 42, x["outTitle"], 11.5, "n", anchor="start"),
        T(54, 70, x["out1"], 9.5, "m", anchor="start"),
        T(54, 91, x["out2"], 9.5, "m", anchor="start"),
        T(54, 112, x["out3"], 9.5, "m", anchor="start"),
        T(54, 133, x["out4"], 9.5, "m", anchor="start"),
        T(54, 154, x["out5"], 9.5, "m", anchor="start"),
        box(398, 56, 308, 118),
        T(552, 84, x["inTitle"], 11.5, "n"),
        T(552, 110, x["in1"], 9.5, "m"),
        T(552, 131, x["in2"], 9.5, "m"),
        T(552, 158, x["notrep"], 9.5, "m"),
    ]
    return vb, x["title"], x["desc"], "".join(b)


def fig_state(x):
    # 2×3 grid of the pre-production state facts, under a header.
    vb = "0 0 760 192"
    b = [T(380, 26, x["header"], 12, "n")]
    cells = ["c1", "c2", "c3", "c4", "c5", "c6"]
    xs = [24, 268, 512]
    ys = [42, 118]
    i = 0
    for ry in ys:
        for rx in xs:
            b.append(box(rx, ry, 224, 62))
            b.append(T(rx + 112, ry + 28, x[cells[i] + "a"], 10.5))
            b.append(T(rx + 112, ry + 46, x[cells[i] + "b"], 9.5, "m"))
            i += 1
    return vb, x["title"], x["desc"], "".join(b)


FIGS = {
    "fig1-bilateral-vs-protocol": fig_bilateral,
    "fig2-model": fig_model,
    "fig3-three-layers": fig_layers,
    "fig4-profiles": fig_profiles,
    "fig5-discovery": fig_discovery,
    "fig6-journey": fig_journey,
    "fig7-example": fig_example,
    "fig8-evidence": fig_evidence,
    "fig9-security": fig_security,
    "fig10-governance": fig_governance,
    "fig11-limits": fig_limits,
    "fig12-state": fig_state,
}

# ── text (PT / EN) ──────────────────────────────────────────────────────────────────────────────────
L = {
    "fig1-bilateral-vs-protocol": {
        "pt": {"title": "Integrações bilaterais versus um protocolo comum",
               "desc": "À esquerda, uma malha bilateral completa; à direita, uma especificação pública comum sobre implementações independentes, sem infraestrutura central obrigatória.",
               "left": "integrações bilaterais", "left2": "n(n−1)/2 relações",
               "rules": "especificação pública comum", "rules2": "contratos · perfis · regras",
               "ia": "Impl. A", "ib": "Impl. B", "ic": "Impl. C", "idd": "Impl. D",
               "right": "protocolo comum", "right2": "n implementações independentes da mesma especificação"},
        "en": {"title": "Bilateral integrations versus a common protocol",
               "desc": "On the left, a complete bilateral mesh; on the right, a common public specification over independent implementations, with no mandatory central infrastructure.",
               "left": "bilateral integrations", "left2": "n(n−1)/2 relationships",
               "rules": "common public specification", "rules2": "contracts · profiles · rules",
               "ia": "Impl. A", "ib": "Impl. B", "ic": "Impl. C", "idd": "Impl. D",
               "right": "common protocol", "right2": "n independent implementations of the same specification"}},
    "fig2-model": {
        "pt": {"title": "Operador, implementação e resultado delimitado",
               "desc": "Um operador publica uma implementação com versão, perfil, ambiente e origem canónica; os artefactos observados produzem um resultado delimitado; a tecnologia interna não é normativa.",
               "operator": "operador", "operator2": "entidade responsável", "impl": "implementação",
               "attr1": "versão · perfil", "attr2": "ambiente · origem", "artifacts": "artefactos",
               "artifacts2": "observados em t", "result": "resultado", "result2": "delimitado (R, E, P)",
               "tech": "tecnologia interna fora do âmbito da conformidade", "tech2": "linguagem · base de dados · fornecedor"},
        "en": {"title": "Operator, implementation and bounded result",
               "desc": "An operator publishes an implementation with version, profile, environment and canonical origin; the observed artifacts yield a bounded result; the internal technology is non-normative.",
               "operator": "operator", "operator2": "responsible entity", "impl": "implementation",
               "attr1": "version · profile", "attr2": "environment · origin", "artifacts": "artifacts",
               "artifacts2": "observed at t", "result": "result", "result2": "bounded (R, E, P)",
               "tech": "internal technology outside the conformance criteria", "tech2": "language · database · provider"}},
    "fig3-three-layers": {
        "pt": {"title": "As três camadas institucionais e o BanzAI transversal",
               "desc": "Camada 1, protocolo aberto; implementações distintas; Camada 2, certificação de conformidade e interoperabilidade; Camada 3, esquemas operacionais independentes; BanzAI transversal.",
               "l1": "Camada 1 — Protocolo aberto", "l1s": "especificações · contratos · perfis · descoberta · confiança",
               "ia": "Implementação A", "ib": "Implementação B", "ic": "Implementação C",
               "l2": "Camada 2 — Certificação de Conformidade e Interoperabilidade",
               "l2s": "avalia a conformidade de cada implementação por perfil, versão e evidência",
               "l3": "Camada 3 — Esquemas operacionais independentes",
               "sx": "Esquema X", "sy": "Infraestrutura Y", "sz": "Rede Z",
               "banzai": "BanzAI — interface transversal e não autoritativa; o protocolo funciona sem esta interface"},
        "en": {"title": "The three institutional layers and the transversal BanzAI",
               "desc": "Layer 1, open protocol; distinct implementations; Layer 2, conformance and interoperability certification; Layer 3, independent operational schemes; BanzAI transversal.",
               "l1": "Layer 1 — Open protocol", "l1s": "specifications · contracts · profiles · discovery · trust",
               "ia": "Implementation A", "ib": "Implementation B", "ic": "Implementation C",
               "l2": "Layer 2 — Conformance and Interoperability Certification",
               "l2s": "evaluates the conformance of each implementation by profile, version and evidence",
               "l3": "Layer 3 — Independent operational schemes",
               "sx": "Scheme X", "sy": "Rail Y", "sz": "Network Z",
               "banzai": "BanzAI — transversal, non-authoritative interface; the protocol works without it"}},
    "fig4-profiles": {
        "pt": {"title": "Perfis de conformidade cumulativos, de L0 a L4",
               "desc": "Cinco níveis cumulativos: L0 configuração segura, L1 pagamento, L2 iniciação, L3 interoperabilidade entre operadores e limiar de federação, L4 integração externa.",
               "l0": "Protocol Sandbox", "l02": "configuração segura · representação monetária correcta",
               "l1": "Core Payment Capability", "l12": "pagamento · transferência · rastreabilidade",
               "l2": "Payment Initiation Capability", "l22": "pedidos · QR dinâmico",
               "l3": "Inter-Operator Interoperability", "l32": "evidência entre operadores · limiar de federação",
               "l4": "External Interoperability", "l42": "integração externa · definido por perfil",
               "cum": "inclui os níveis inferiores",
               "note": "níveis cumulativos · evidência de conformidade, não certificação nem autorização"},
        "en": {"title": "Cumulative conformance profiles, L0 to L4",
               "desc": "Five cumulative levels: L0 secure configuration, L1 payment, L2 initiation, L3 multi-operator interoperability and federation threshold, L4 external integration.",
               "l0": "Protocol Sandbox", "l02": "secure configuration · correct monetary representation",
               "l1": "Core Payment Capability", "l12": "payment · transfer · traceability",
               "l2": "Payment Initiation Capability", "l22": "requests · dynamic QR",
               "l3": "Inter-Operator Interoperability", "l32": "evidence between operators · federation threshold",
               "l4": "External Interoperability", "l42": "external integration · defined by profile",
               "cum": "includes the lower levels",
               "note": "cumulative levels · conformance evidence, not certification or authorisation"}},
    "fig5-discovery": {
        "pt": {"title": "Descoberta a partir da origem canónica",
               "desc": "A implementação publica na origem canónica; o Manifesto e os metadados assinados são obtidos por um módulo seguro do lado do avaliador e entregues aos motores.",
               "impl": "implementação", "impl2": "publica", "origin": "origem canónica",
               "manifest": "manifesto e", "keys": "metadados assinados",
               "fetch": "obtenção segura", "fetch2": "lado do avaliador", "engines": "motores",
               "note": "nunca a partir de URL arbitrária do chamador"},
        "en": {"title": "Discovery from the canonical origin",
               "desc": "The implementation publishes at the canonical origin; the manifest and signed metadata are fetched by an evaluator-side secure module and handed to the engines.",
               "impl": "implementation", "impl2": "publishes", "origin": "canonical origin",
               "manifest": "manifest and", "keys": "signed metadata",
               "fetch": "secure fetch", "fetch2": "evaluator side", "engines": "engines",
               "note": "never from a caller-supplied URL"}},
    "fig6-journey": {
        "pt": {"title": "Jornada de validação: oito passos e agregação",
               "desc": "Oito passos técnicos e um passo de agregação; cada passo recebe um estado e falha por omissão; a prontidão para certificação agrega os passos requeridos e não constitui certificação.",
               "s1": "Descoberta", "s2": "Manifesto", "s3": "Chaves", "s4": "Conformidade",
               "s5": "Interoper.", "s6": "Confiança", "s7": "Federação", "s8": "Pacote de Ev.",
               "s9": "Prontidão para Certificação", "s9note": "agrega os passos exigidos pelo perfil · não constitui certificação",
               "legend": "estados: verificado · pendente · falhado · bloqueado",
               "failclosed": "fecho por omissão: entrada ausente ou inconsistente → não aprovado"},
        "en": {"title": "Validation journey: eight steps and aggregation",
               "desc": "Eight technical steps and one aggregation step; each step gets a state and fails closed; certification readiness aggregates the required steps and is not a certification.",
               "s1": "Discovery", "s2": "Manifest", "s3": "Keys", "s4": "Conformance",
               "s5": "Interop.", "s6": "Trust", "s7": "Federation", "s8": "Evidence Bundle",
               "s9": "Certification Readiness", "s9note": "aggregates the steps required by the profile · not a certification",
               "legend": "states: verified · pending · failed · blocked",
               "failclosed": "fail-closed: missing or inconsistent input → not approved"}},
    "fig7-example": {
        "pt": {"title": "Avaliação direccional A→B",
               "desc": "A implementação B publica material verificável; a implementação ou avaliador A inicia a jornada, obtém os artefactos, avalia e verifica o resultado sob a sua política local.",
               "laneB": "Implementação B", "b1": "publica", "b1b": "manifesto, chaves, artefactos",
               "origin": "origem canónica", "originb": "artefactos assinados",
               "laneA": "Implementação A / avaliador",
               "a2": "inicia", "a2b": "a jornada", "a3": "obtém artefactos", "a3b": "via módulo de obtenção segura",
               "a4": "avalia", "a4b": "motores · nove passos", "a5": "verifica o resultado", "a5b": "e aplica política local",
               "note": "BANZA não determina acordos, admissão, liquidação nem autorização; a utilização do resultado é local"},
        "en": {"title": "Directional A→B evaluation",
               "desc": "Implementation B publishes verifiable material; implementation or evaluator A starts the journey, fetches the artifacts, evaluates and verifies the result under its local policy.",
               "laneB": "Implementation B", "b1": "publishes", "b1b": "manifest, keys, artifacts",
               "origin": "canonical origin", "originb": "signed artifacts",
               "laneA": "Implementation A / evaluator",
               "a2": "starts", "a2b": "the journey", "a3": "fetches artifacts", "a3b": "via secure-fetch module",
               "a4": "evaluates", "a4b": "engines · nine steps", "a5": "verifies the result", "a5b": "and applies local policy",
               "note": "BANZA does not determine agreements, admission, settlement or authorisation; use of the result is local"}},
    "fig8-evidence": {
        "pt": {"title": "Dos artefactos ao Pacote de Evidências",
               "desc": "Os motores avaliam artefactos e produzem resultados e recibos; o Pacote de Evidências reúne material verificável; o Registo Técnico é opcional; o BanzAI apenas apresenta e explica.",
               "artifacts": "artefactos", "artifacts2": "obtidos da origem",
               "engines": "motores determinísticos", "engines2": "avaliam",
               "results": "resultados", "results2": "e recibos", "bundle": "Pacote de", "bundle2": "Evidências",
               "registry": "Registo Técnico", "registry2": "opcional e separado",
               "banzai": "BanzAI — apresenta e explica; não determina resultados nem publica evidência por si só"},
        "en": {"title": "From artifacts to the Evidence Bundle",
               "desc": "The engines evaluate artifacts and produce results and receipts; the Evidence Bundle gathers verifiable material; the Technical Registry is optional; BanzAI only presents and explains.",
               "artifacts": "artifacts", "artifacts2": "fetched from origin",
               "engines": "deterministic engines", "engines2": "evaluate",
               "results": "results", "results2": "and receipts", "bundle": "Evidence", "bundle2": "Bundle",
               "registry": "Technical Registry", "registry2": "optional and separate",
               "banzai": "BanzAI — presents and explains; does not determine results nor publish evidence on its own"}},
    "fig9-security": {
        "pt": {"title": "Ameaças, mecanismos e resultados esperados",
               "desc": "Cada ameaça considerada corresponde a um mecanismo de protecção e a um resultado esperado; entradas ausentes ou inconsistentes conduzem ao fecho por omissão.",
               "cThreat": "ameaça", "cMech": "mecanismo", "cOut": "resultado esperado",
               "r1t": "adulteração de artefactos", "r1m": "assinaturas e resumos verificados", "r1o": "detecção",
               "r2t": "origem falsa", "r2m": "origem canónica resolvida", "r2o": "rejeição",
               "r3t": "chave revogada ou expirada", "r3m": "verificação de revogação e validade", "r3o": "não aprovado",
               "r4t": "repetição de desafio", "r4m": "desafio de uso único", "r4o": "recusa",
               "r5t": "SSRF e reassociação DNS", "r5m": "obtenção endurecida", "r5o": "bloqueio",
               "failclosed": "evidência ausente ou inconsistente → fecho por omissão"},
        "en": {"title": "Threats, mechanisms and expected results",
               "desc": "Each considered threat maps to a protection mechanism and an expected result; missing or inconsistent inputs lead to fail-closed.",
               "cThreat": "threat", "cMech": "mechanism", "cOut": "expected result",
               "r1t": "artifact tampering", "r1m": "signatures and digests verified", "r1o": "detection",
               "r2t": "spoofed origin", "r2m": "canonical origin resolved", "r2o": "rejection",
               "r3t": "revoked or expired key", "r3m": "revocation and validity check", "r3o": "not approved",
               "r4t": "challenge replay", "r4m": "single-use challenge", "r4o": "refusal",
               "r5t": "SSRF and DNS rebinding", "r5m": "hardened fetch", "r5o": "block",
               "failclosed": "missing or inconsistent evidence → fail-closed"}},
    "fig10-governance": {
        "pt": {"title": "Evolução do protocolo: proposta, decisão e publicação",
               "desc": "A evolução do protocolo separa proposta e discussão (RFC), decisão registada (ADR) e publicação versionada, com coexistência e migração quando aplicável.",
               "current": "versão", "current2": "publicada", "rfc": "proposta e", "rfc2": "discussão (RFC)",
               "adr": "decisão registada", "adr2": "(ADR)", "pub": "nova versão", "pub2": "publicada",
               "coex": "coexistência e migração", "coex2": "quando aplicável",
               "note": "governar as regras ≠ operar transacções ≠ autorizar participantes"},
        "en": {"title": "Protocol evolution: proposal, decision and publication",
               "desc": "Protocol evolution separates proposal and discussion (RFC), recorded decision (ADR) and versioned publication, with coexistence and migration when applicable.",
               "current": "version", "current2": "published", "rfc": "proposal and", "rfc2": "discussion (RFC)",
               "adr": "recorded decision", "adr2": "(ADR)", "pub": "new version", "pub2": "published",
               "coex": "coexistence and migration", "coex2": "when applicable",
               "note": "governing the rules ≠ operating transactions ≠ authorising participants"}},
    "fig11-limits": {
        "pt": {"title": "Fronteira do que o BANZA avalia",
               "desc": "O BANZA avalia condições técnicas observáveis; autorização regulatória, controlos internos, acordos comerciais, admissão em esquemas e acesso a redes externas ficam fora do âmbito.",
               "outTitle": "fora do âmbito observado",
               "out1": "· autorização regulatória", "out2": "· controlos internos do operador",
               "out3": "· comportamento fora do protocolo", "out4": "· acordos comerciais e admissão em esquemas",
               "out5": "· acesso efectivo a infraestruturas ou redes externas",
               "inTitle": "o BANZA avalia", "in1": "conformidade face a um perfil público",
               "in2": "artefactos declarados, no instante observado",
               "notrep": "um resultado técnico não representa autorização"},
        "en": {"title": "Boundary of what BANZA evaluates",
               "desc": "BANZA evaluates observable technical conditions; regulatory authorisation, internal controls, commercial agreements, scheme admission and access to external networks are out of scope.",
               "outTitle": "out of observed scope",
               "out1": "· regulatory authorisation", "out2": "· operator internal controls",
               "out3": "· off-protocol behaviour", "out4": "· commercial agreements and scheme admission",
               "out5": "· effective access to external infrastructures or networks",
               "inTitle": "BANZA evaluates", "in1": "conformance against a public profile",
               "in2": "declared artifacts, at the observed instant",
               "notrep": "a technical result does not represent authorisation"}},
    "fig12-state": {
        "pt": {"title": "Estado geral do BANZA — pré-produção",
               "desc": "Pré-produção: zero operadores de produção, zero certificações técnicas activas, dinheiro real desactivado, implementação de referência em testes e sem implementação externa independente demonstrada.",
               "header": "Estado geral — pré-produção",
               "c1a": "protocolo e referência", "c1b": "pré-produção",
               "c2a": "zero operadores", "c2b": "de produção",
               "c3a": "zero certificações", "c3b": "técnicas activas",
               "c4a": "dinheiro real", "c4b": "desactivado",
               "c5a": "implementação de referência", "c5b": "ambiente de testes isolado",
               "c6a": "implementação independente de terceiros", "c6b": "ainda não demonstrada"},
        "en": {"title": "General state of BANZA — pre-production",
               "desc": "Pre-production: zero production operators, zero active technical certifications, real money disabled, reference implementation in testing and no independent external implementation demonstrated.",
               "header": "General state — pre-production",
               "c1a": "protocol and reference", "c1b": "pre-production",
               "c2a": "zero operators", "c2b": "in production",
               "c3a": "zero certifications", "c3b": "technical, active",
               "c4a": "real money", "c4b": "disabled",
               "c5a": "reference implementation", "c5b": "isolated test environment",
               "c6a": "independent third-party implementation", "c6b": "not yet demonstrated"}},
}


def main():
    os.makedirs(OUT, exist_ok=True)
    n = 0
    for stem, fn in FIGS.items():
        for lang in ("pt", "en"):
            vb, title, desc, body = fn(L[stem][lang])
            out = os.path.join(OUT, f"{stem}.{lang}.svg")
            with open(out, "w", encoding="utf-8") as f:
                f.write(svg(vb, title, desc, body))
            n += 1
    print(f"wrote {n} SVG figures to {os.path.relpath(OUT)}")


if __name__ == "__main__":
    main()
