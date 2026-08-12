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
    vb = "0 0 760 300"
    b = []
    # left: bilateral mesh — 4 nodes fully connected
    nodes = [(90, 70), (250, 70), (90, 210), (250, 210)]
    labels = ["A", "B", "C", "D"]
    for i in range(4):
        for j in range(i + 1, 4):
            b.append(f'<line class="l" x1="{nodes[i][0]}" y1="{nodes[i][1]}" x2="{nodes[j][0]}" y2="{nodes[j][1]}"/>')
    for (cx, cy), lb in zip(nodes, labels):
        b.append(f'<circle class="b" cx="{cx}" cy="{cy}" r="22"/>')
        b.append(T(cx, cy + 5, lb, 14))
    b.append(T(170, 268, x["left"], 12.5))
    b.append(T(170, 286, x["left2"], 9.5, "m"))
    # divider
    b.append('<line class="d" x1="380" y1="40" x2="380" y2="270"/>')
    # right: common protocol — 4 nodes to a shared bar
    rnodes = [(478, 95), (546, 95), (614, 95), (682, 95)]
    b.append(box(452, 190, 256, 40))
    b.append(T(580, 215, x["rules"], 12))
    for (cx, cy), lb in zip(rnodes, labels):
        b.append(f'<circle class="b" cx="{cx}" cy="{cy}" r="20"/>')
        b.append(T(cx, cy + 5, lb, 13))
        b.append(f'<line class="l" x1="{cx}" y1="{cy+20}" x2="{cx}" y2="190" marker-end="url(#a)"/>')
    b.append(T(580, 250, x["right"], 12.5))
    b.append(T(580, 268, x["right2"], 9.5, "m"))
    return vb, x["title"], x["desc"], "".join(b)


def fig_model(x):
    vb = "0 0 760 200"
    b = [
        box(20, 74, 120, 52), T(80, 98, x["operator"], 13), T(80, 115, x["operator2"], 9, "m"),
        arrow(140, 100, 168, 100),
        box(170, 54, 200, 92), T(270, 80, x["impl"], 13), T(270, 103, x["attr1"], 9, "m"), T(270, 120, x["attr2"], 9, "m"),
        arrow(370, 100, 398, 100),
        box(400, 74, 150, 52), T(475, 96, x["artifacts"], 11.5), T(475, 114, x["artifacts2"], 9, "m"),
        arrow(550, 100, 578, 100),
        box(580, 66, 160, 68), T(660, 92, x["result"], 13), T(660, 110, x["result2"], 9, "m"),
    ]
    return vb, x["title"], x["desc"], "".join(b)


def fig_layers(x):
    vb = "0 0 760 260"
    b = []
    # three stacked bands
    rows = [("l1", 30), ("l2", 105), ("l3", 180)]
    for key, y in rows:
        b.append(box(40, y, 560, 60))
        b.append(T(320, y + 26, x[key], 13, "n"))
        b.append(T(320, y + 45, x[key + "s"], 9.5, "m"))
    # BanzAI transversal side rail spanning the three
    b.append(box(630, 30, 100, 210, "d"))
    b.append(T(680, 120, "BanzAI", 13))
    b.append(T(680, 140, x["banzai"], 9, "m"))
    b.append(T(680, 154, x["banzai2"], 9, "m"))
    b.append(f'<line class="d" x1="600" y1="135" x2="630" y2="135"/>')
    b.append(T(320, 250, x["sep"], 9.5, "m"))
    return vb, x["title"], x["desc"], "".join(b)


def fig_profiles(x):
    vb = "0 0 760 300"
    b = []
    # cumulative ladder: five stacked rungs, L0 at the base, each rung a strict superset of those below
    rungs = [("L4", "l4", 30), ("L3", "l3", 78), ("L2", "l2", 126), ("L1", "l1", 174), ("L0", "l0", 222)]
    for tag, key, y in rungs:
        b.append(box(80, y, 640, 42))
        b.append(T(112, y + 26, tag, 13, "n"))
        b.append(T(150, y + 18, x[key], 11, "", "start"))
        b.append(T(150, y + 34, x[key + "2"], 9, "m", "start"))
    # cumulative arrow (bottom → top) with rotated label
    b.append('<line class="l" x1="52" y1="256" x2="52" y2="34" marker-end="url(#a)"/>')
    b.append(f'<text x="46" y="150" text-anchor="middle" font-size="9.5" class="m" '
             f'transform="rotate(-90 46 150)">{esc(x["cum"])}</text>')
    b.append(T(400, 292, x["note"], 9.5, "m"))
    return vb, x["title"], x["desc"], "".join(b)


def fig_discovery(x):
    vb = "0 0 760 210"
    b = [
        box(16, 78, 130, 54), T(81, 100, x["impl"], 12), T(81, 117, x["impl2"], 9, "m"),
        arrow(146, 105, 172, 105),
        box(174, 78, 140, 54), T(244, 100, x["origin"], 12), T(244, 117, ".well-known", 9, "m"),
        arrow(314, 105, 340, 105),
        box(342, 70, 150, 70), T(417, 94, x["manifest"], 12), T(417, 112, x["keys"], 9, "m"),
        arrow(492, 105, 518, 105),
        box(520, 78, 150, 54), T(595, 98, x["fetch"], 11.5), T(595, 116, x["fetch2"], 9, "m"),
        arrow(595, 132, 595, 158),
        box(520, 158, 150, 40), T(595, 183, x["engines"], 12),
        T(377, 175, x["note"], 9.5, "m"),
    ]
    return vb, x["title"], x["desc"], "".join(b)


def fig_journey(x):
    vb = "0 0 760 320"
    b = []
    row1 = [("1", "s1"), ("2", "s2"), ("3", "s3"), ("4", "s4")]
    row2 = [("5", "s5"), ("6", "s6"), ("7", "s7"), ("8", "s8")]
    xs = [16, 202, 388, 574]
    w = 170
    for y, row in ((30, row1), (110, row2)):
        for (num, key), xx in zip(row, xs):
            b.append(box(xx, y, w, 52))
            b.append(T(xx + w / 2, y + 24, f'{num}. {x[key]}', 11.5))
            if x.get(key + "2"):
                b.append(T(xx + w / 2, y + 40, x[key + "2"], 9, "m"))
        # arrows within row
        for i in range(3):
            b.append(arrow(xs[i] + w, y + 26, xs[i + 1], y + 26))
    # connector row1->row2
    b.append(f'<line class="l" x1="{xs[3]+w/2}" y1="82" x2="{xs[3]+w/2}" y2="96"/>')
    b.append(f'<line class="l" x1="{xs[0]+w/2}" y1="96" x2="{xs[3]+w/2}" y2="96"/>')
    b.append(arrow(xs[0] + w / 2, 96, xs[0] + w / 2, 110))
    # step 9 wide aggregation
    b.append(arrow(xs[0] + w / 2, 162, xs[0] + w / 2, 196))
    b.append(box(16, 196, 728, 52))
    b.append(T(380, 218, f'9. {x["s9"]}', 12.5, "n"))
    b.append(T(380, 236, x["s9note"], 9.5, "m"))
    # legend + fail-closed
    b.append(T(16, 278, x["legend"], 9.5, "m", anchor="start"))
    b.append(T(16, 298, x["failclosed"], 9.5, "m", anchor="start"))
    return vb, x["title"], x["desc"], "".join(b)


def fig_example(x):
    vb = "0 0 760 300"
    b = []
    # two lanes A (top) and B (bottom)
    b.append(T(20, 40, x["laneB"], 11, "n", anchor="start"))
    b.append(T(20, 175, x["laneA"], 11, "n", anchor="start"))
    b.append('<line class="d" x1="16" y1="110" x2="744" y2="110"/>')
    # B publishes
    b.append(box(30, 50, 170, 46)); b.append(T(115, 70, f'1 · {x["b1"]}', 10.5)); b.append(T(115, 86, x["b1b"], 9, "m"))
    # A starts
    b.append(box(30, 185, 150, 46)); b.append(T(105, 205, f'2 · {x["a2"]}', 10.5)); b.append(T(105, 221, x["a2b"], 9, "m"))
    b.append(arrow(180, 208, 214, 208))
    # secure fetch
    b.append(box(216, 185, 150, 46)); b.append(T(291, 205, f'3 · {x["a3"]}', 10.5)); b.append(T(291, 221, x["a3b"], 9, "m"))
    # fetch reaches B's origin
    b.append(f'<line class="l" x1="291" y1="185" x2="291" y2="96" marker-end="url(#a)"/>')
    b.append(box(216, 50, 150, 46)); b.append(T(291, 70, x["origin"], 10.5)); b.append(T(291, 86, x["originb"], 9, "m"))
    b.append(arrow(366, 208, 400, 208))
    # engines
    b.append(box(402, 185, 150, 46)); b.append(T(477, 205, f'4 · {x["a4"]}', 10.5)); b.append(T(477, 221, x["a4b"], 9, "m"))
    b.append(arrow(552, 208, 586, 208))
    # A verifies + decides
    b.append(box(588, 185, 156, 46)); b.append(T(666, 205, f'5 · {x["a5"]}', 10.5)); b.append(T(666, 221, x["a5b"], 9, "m"))
    b.append(T(380, 280, x["note"], 9.5, "m"))
    return vb, x["title"], x["desc"], "".join(b)


def fig_evidence(x):
    vb = "0 0 760 320"
    b = [
        box(24, 46, 168, 58), T(108, 72, x["artifacts"], 12.5), T(108, 90, x["artifacts2"], 9.5, "m"),
        arrow(192, 75, 210, 75),
        box(212, 46, 176, 58), T(300, 72, x["engines"], 12.5), T(300, 90, x["engines2"], 9.5, "m"),
        arrow(388, 75, 406, 75),
        box(408, 46, 150, 58), T(483, 72, x["results"], 12.5), T(483, 90, x["results2"], 9.5, "m"),
        arrow(558, 75, 576, 75),
        box(578, 46, 158, 58), T(657, 72, x["bundle"], 12.5), T(657, 90, x["bundle2"], 12.5),
        f'<line class="d" x1="657" y1="104" x2="657" y2="170" marker-end="url(#a)"/>',
        T(669, 141, x["optional"], 9.5, "m", anchor="start"),
        box(578, 170, 158, 52, "d"), T(657, 192, x["registry"], 12), T(657, 209, x["registry2"], 9.5, "m"),
        box(24, 252, 712, 42, "d"), T(380, 278, x["banzai"], 12),
    ]
    return vb, x["title"], x["desc"], "".join(b)


def fig_security(x):
    vb = "0 0 760 300"
    b = []
    cols = [x["cThreat"], x["cMech"], x["cOut"]]
    cx = [140, 400, 640]
    b.append(T(cx[0], 34, cols[0], 11.5, "n"))
    b.append(T(cx[1], 34, cols[1], 11.5, "n"))
    b.append(T(cx[2], 34, cols[2], 11.5, "n"))
    b.append('<line class="l" x1="16" y1="44" x2="744" y2="44"/>')
    rows = ["r1", "r2", "r3", "r4", "r5"]
    y = 66
    for r in rows:
        b.append(T(cx[0], y, x[r + "t"], 10.5))
        b.append(arrow(250, y - 4, 286, y - 4))
        b.append(T(cx[1], y, x[r + "m"], 10.5))
        b.append(arrow(514, y - 4, 550, y - 4))
        b.append(T(cx[2], y, x[r + "o"], 10.5))
        y += 40
    b.append('<line class="d" x1="16" y1="270" x2="744" y2="270"/>')
    b.append(T(380, 288, x["failclosed"], 9.5, "m"))
    return vb, x["title"], x["desc"], "".join(b)


def fig_governance(x):
    vb = "0 0 760 230"
    b = [
        box(24, 90, 130, 50), T(89, 112, x["current"], 12), T(89, 129, x["current2"], 9, "m"),
        # additive branch (up)
        f'<line class="l" x1="89" y1="90" x2="89" y2="46" marker-end="url(#a)"/>',
        box(24, 12, 200, 34, "d"), T(124, 33, x["additive"], 10.5),
        # incompatible branch (right)
        arrow(154, 115, 182, 115),
        box(184, 90, 120, 50), T(244, 112, x["deprec"], 11), T(244, 129, x["deprec2"], 9, "m"),
        arrow(304, 115, 330, 115),
        box(332, 90, 120, 50), T(392, 112, x["coexist"], 11), T(392, 129, x["coexist2"], 9, "m"),
        arrow(452, 115, 478, 115),
        box(480, 90, 120, 50), T(540, 116, x["migrate"], 11),
        arrow(600, 115, 626, 115),
        box(628, 90, 120, 50), T(688, 112, x["eos"], 11), T(688, 129, x["eos2"], 9, "m"),
        T(380, 200, x["note"], 9.5, "m"),
    ]
    return vb, x["title"], x["desc"], "".join(b)


def fig_limits(x):
    vb = "0 0 760 300"
    b = [
        # outer area = out of scope
        box(40, 30, 680, 240, "d"),
        T(60, 52, x["outTitle"], 11, "n", anchor="start"),
        T(60, 74, x["out1"], 9.5, "m", anchor="start"),
        T(60, 92, x["out2"], 9.5, "m", anchor="start"),
        T(60, 110, x["out3"], 9.5, "m", anchor="start"),
        # inner = what BANZA evaluates/observes
        box(200, 140, 360, 110),
        T(380, 168, x["inTitle"], 11.5, "n"),
        T(380, 192, x["in1"], 10, "m"),
        T(380, 210, x["in2"], 10, "m"),
        T(380, 234, x["notrep"], 9.5, "m"),
    ]
    return vb, x["title"], x["desc"], "".join(b)


def fig_state(x):
    vb = "0 0 760 220"
    b = [T(380, 30, x["header"], 12.5, "n")]
    cells = ["c1", "c2", "c3", "c4", "c5", "c6"]
    xs = [24, 268, 512]
    ys = [50, 135]
    i = 0
    for ry in ys:
        for rx in xs:
            b.append(box(rx, ry, 224, 68))
            b.append(T(rx + 112, ry + 30, x[cells[i] + "a"], 11))
            b.append(T(rx + 112, ry + 50, x[cells[i] + "b"], 9.5, "m"))
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
               "desc": "À esquerda, quatro operadores ligados por integrações bilaterais; à direita, os mesmos operadores implementando as mesmas regras públicas, sem intermediário central de fundos.",
               "left": "integrações bilaterais", "left2": "n(n−1)/2 relações", "rules": "regras públicas comuns",
               "right": "protocolo comum", "right2": "n implementações"},
        "en": {"title": "Bilateral integrations versus a common protocol",
               "desc": "On the left, four operators joined by bilateral integrations; on the right, the same operators implementing the same public rules, with no central intermediary for funds.",
               "left": "bilateral integrations", "left2": "n(n−1)/2 relationships", "rules": "common public rules",
               "right": "common protocol", "right2": "n implementations"}},
    "fig2-model": {
        "pt": {"title": "Operador, implementação e resultado delimitado",
               "desc": "Um operador publica uma implementação com versão, perfil, ambiente e origem canónica; os artefactos observados produzem um resultado delimitado.",
               "operator": "operador", "operator2": "entidade responsável", "impl": "implementação",
               "attr1": "versão · perfil", "attr2": "ambiente · origem canónica", "artifacts": "artefactos",
               "artifacts2": "observados no instante t", "result": "resultado", "result2": "delimitado · (R, E, P)"},
        "en": {"title": "Operator, implementation and bounded result",
               "desc": "An operator publishes an implementation with version, profile, environment and canonical origin; the observed artifacts yield a bounded result.",
               "operator": "operator", "operator2": "responsible entity", "impl": "implementation",
               "attr1": "version · profile", "attr2": "environment · canonical origin", "artifacts": "artifacts",
               "artifacts2": "observed at instant t", "result": "result", "result2": "bounded · (R, E, P)"}},
    "fig3-three-layers": {
        "pt": {"title": "As três camadas institucionais",
               "desc": "Camada 1 protocolo, Camada 2 certificação, Camada 3 esquemas operacionais; o BanzAI é transversal às três, não uma quarta camada.",
               "l1": "Camada 1 — Protocolo aberto", "l1s": "regras, contratos, identidade, confiança",
               "l2": "Camada 2 — Certificação de Conformidade e Interoperabilidade", "l2s": "avalia uma implementação, por evidência",
               "l3": "Camada 3 — Esquemas operacionais", "l3s": "independentes, sujeitos ao enquadramento aplicável",
               "banzai": "interface", "banzai2": "transversal", "sep": "camadas separadas por responsabilidade, infraestrutura e chaves"},
        "en": {"title": "The three institutional layers",
               "desc": "Layer 1 protocol, Layer 2 certification, Layer 3 operational schemes; BanzAI is transversal across all three, not a fourth layer.",
               "l1": "Layer 1 — Open protocol", "l1s": "rules, contracts, identity, trust",
               "l2": "Layer 2 — Conformance and Interoperability Certification", "l2s": "evaluates an implementation, from evidence",
               "l3": "Layer 3 — Operational schemes", "l3s": "independent, subject to the applicable framework",
               "banzai": "transversal", "banzai2": "interface", "sep": "layers separated by responsibility, infrastructure and keys"}},
    "fig4-profiles": {
        "pt": {"title": "Os níveis de conformidade cumulativos L0–L4",
               "desc": "Cada nível inclui todos os inferiores e acrescenta capacidades; L3 é o limiar de federação e L4 é definido por perfil.",
               "l0": "Protocol Sandbox", "l02": "configuração segura · MON-001",
               "l1": "Core Payment Capability", "l12": "pagamento, transferência, razão de dupla entrada",
               "l2": "Payment Initiation Capability", "l22": "pedidos e QR dinâmico, execução instantânea",
               "l3": "Inter-Operator Interoperability", "l32": "encaminhamento, liquidação · limiar de federação",
               "l4": "External Interoperability", "l42": "integração com redes externas · definido por perfil",
               "cum": "inclui os níveis inferiores",
               "note": "níveis cumulativos · evidência técnica, não certificação"},
        "en": {"title": "The cumulative conformance levels L0–L4",
               "desc": "Each level includes all lower ones and adds capabilities; L3 is the federation threshold and L4 is profile-defined.",
               "l0": "Protocol Sandbox", "l02": "secure configuration · MON-001",
               "l1": "Core Payment Capability", "l12": "payment, transfer, double-entry ledger",
               "l2": "Payment Initiation Capability", "l22": "requests and dynamic QR, instant execution",
               "l3": "Inter-Operator Interoperability", "l32": "routing, settlement · federation threshold",
               "l4": "External Interoperability", "l42": "integration with external networks · profile-defined",
               "cum": "includes lower levels",
               "note": "cumulative levels · technical evidence, not certification"}},
    "fig5-discovery": {
        "pt": {"title": "Origem canónica e obtenção segura",
               "desc": "Uma implementação publica na origem canónica o Manifesto e as chaves; um módulo de obtenção segura entrega-os aos motores.",
               "impl": "implementação", "impl2": "publica", "origin": "origem canónica",
               "manifest": "Manifesto", "keys": "metadados · chaves", "fetch": "obtenção segura",
               "fetch2": "lado do servidor", "engines": "motores", "note": "nunca a partir de URL do chamador"},
        "en": {"title": "Canonical origin and secure retrieval",
               "desc": "An implementation publishes the Manifest and keys at the canonical origin; a secure retrieval component passes them to the engines.",
               "impl": "implementation", "impl2": "publishes", "origin": "canonical origin",
               "manifest": "Manifest", "keys": "metadata · keys", "fetch": "secure retrieval",
               "fetch2": "server-side", "engines": "engines", "note": "never from a caller URL"}},
    "fig6-journey": {
        "pt": {"title": "A jornada determinística de nove passos",
               "desc": "Oito passos técnicos e um passo de agregação; cada passo falha por omissão e a Prontidão nunca devolve certificação.",
               "s1": "Descoberta", "s2": "Manifesto", "s3": "Chaves", "s4": "Conformidade",
               "s5": "Interoper.", "s6": "Confiança", "s7": "Federação", "s8": "Pacote de Ev.",
               "s9": "Prontidão para Certificação", "s9note": "agrega os oito passos · nunca devolve CERTIFICADO",
               "legend": "estados: verificado · pendente · falhado · bloqueado",
               "failclosed": "fecho por omissão: entrada ausente ou inconsistente → não aprovado"},
        "en": {"title": "The deterministic nine-step journey",
               "desc": "Eight technical steps and one aggregation step; each step fails closed and Readiness never returns certification.",
               "s1": "Discovery", "s2": "Manifest", "s3": "Keys", "s4": "Conformance",
               "s5": "Interop.", "s6": "Trust", "s7": "Federation", "s8": "Evidence B.",
               "s9": "Certification Readiness", "s9note": "aggregates the eight steps · never returns CERTIFIED",
               "legend": "statuses: verified · pending · failed · blocked",
               "failclosed": "fail-closed: absent or inconsistent input → non-passing"}},
    "fig7-example": {
        "pt": {"title": "Exemplo — Operador A avalia o Operador B",
               "desc": "O Operador B publica os artefactos; o Operador A inicia a jornada; um módulo seguro obtém-nos; os motores validam; o Operador A verifica e decide.",
               "laneB": "Operador B", "laneA": "Operador A / avaliador",
               "b1": "publica", "b1b": "Manifesto, chaves, artefactos", "origin": "origem canónica", "originb": "artefactos assinados",
               "a2": "inicia", "a2b": "a jornada", "a3": "obtém", "a3b": "módulo seguro",
               "a4": "valida", "a4b": "motores · nove passos", "a5": "verifica e decide", "a5b": "sob a sua política",
               "note": "o BANZA não decide acordos, admissão, liquidação nem autorização"},
        "en": {"title": "Example — Operator A evaluates Operator B",
               "desc": "Operator B publishes the artifacts; Operator A starts the journey; a secure component retrieves them; the engines validate; Operator A verifies and decides.",
               "laneB": "Operator B", "laneA": "Operator A / evaluator",
               "b1": "publishes", "b1b": "Manifest, keys, artifacts", "origin": "canonical origin", "originb": "signed artifacts",
               "a2": "starts", "a2b": "the journey", "a3": "retrieves", "a3b": "secure component",
               "a4": "validates", "a4b": "engines · nine steps", "a5": "verifies and decides", "a5b": "under its policy",
               "note": "BANZA decides no agreements, admission, settlement or authorisation"}},
    "fig8-evidence": {
        "pt": {"title": "Da validação à evidência e ao Registo Técnico",
               "desc": "Os artefactos entram nos motores, que produzem resultados, recibos e um Pacote de Evidências; a publicação no Registo Técnico é opcional; o BanzAI apenas apresenta e explica.",
               "artifacts": "artefactos", "artifacts2": "obtidos da origem", "engines": "motores Rust",
               "engines2": "decidem", "results": "resultados", "results2": "e recibos", "bundle": "Pacote de", "bundle2": "Evidências",
               "optional": "opcional", "registry": "Registo Técnico", "registry2": "opcional e separado",
               "banzai": "BanzAI — apenas apresenta e explica (não decide nem publica)"},
        "en": {"title": "From validation to evidence and the Technical Registry",
               "desc": "Artifacts enter the engines, which produce results, receipts and an Evidence Bundle; publication in the Technical Registry is optional; BanzAI only presents and explains.",
               "artifacts": "artifacts", "artifacts2": "fetched from origin", "engines": "Rust engines",
               "engines2": "decide", "results": "results", "results2": "and receipts", "bundle": "Evidence", "bundle2": "Bundle",
               "optional": "optional", "registry": "Technical Registry", "registry2": "optional, separate",
               "banzai": "BanzAI — only presents and explains (does not decide or publish)"}},
    "fig9-security": {
        "pt": {"title": "Ameaça, mecanismo e resultado esperado",
               "desc": "Cada ameaça corresponde a um mecanismo de protecção e a um resultado esperado; entradas ausentes conduzem à não aprovação.",
               "cThreat": "ameaça", "cMech": "mecanismo", "cOut": "resultado esperado",
               "r1t": "adulteração de artefactos", "r1m": "assinaturas", "r1o": "detecção",
               "r2t": "origem falsa", "r2m": "origem canónica resolvida", "r2o": "rejeição",
               "r3t": "chave revogada/expirada", "r3m": "revogação e expiração", "r3o": "não aprovado",
               "r4t": "repetição de desafio", "r4m": "desafio de uso único", "r4o": "recusa",
               "r5t": "SSRF · reassociação DNS", "r5m": "obtenção endurecida", "r5o": "bloqueio",
               "failclosed": "quando a evidência falta ou é inconsistente, a avaliação fecha por omissão"},
        "en": {"title": "Threat, mechanism and expected outcome",
               "desc": "Each threat maps to a protection mechanism and an expected outcome; absent inputs lead to non-passing.",
               "cThreat": "threat", "cMech": "mechanism", "cOut": "expected outcome",
               "r1t": "artifact tampering", "r1m": "signatures", "r1o": "detection",
               "r2t": "false origin", "r2m": "resolved canonical origin", "r2o": "rejection",
               "r3t": "revoked/expired key", "r3m": "revocation and expiry", "r3o": "non-passing",
               "r4t": "challenge replay", "r4m": "single-use challenge", "r4o": "refusal",
               "r5t": "SSRF · DNS rebinding", "r5m": "hardened retrieval", "r5o": "blocking",
               "failclosed": "when evidence is missing or inconsistent, evaluation fails closed"}},
    "fig10-governance": {
        "pt": {"title": "Ciclo de evolução de uma versão",
               "desc": "Uma versão actual recebe alterações aditivas sem ruptura; uma alteração incompatível passa por depreciação, coexistência, migração e fim de suporte.",
               "current": "versão actual", "current2": "1.0",
               "additive": "alteração aditiva (compatível)",
               "deprec": "depreciação", "deprec2": "anúncio", "coexist": "coexistência", "coexist2": "janela de transição",
               "migrate": "migração", "eos": "fim de suporte", "eos2": "versão maior",
               "note": "aditivo: versão menor · incompatível: versão maior anunciada com antecedência"},
        "en": {"title": "Evolution cycle of a version",
               "desc": "A current version receives additive, non-breaking changes; an incompatible change goes through deprecation, coexistence, migration and end of support.",
               "current": "current version", "current2": "1.0",
               "additive": "additive change (compatible)",
               "deprec": "deprecation", "deprec2": "announcement", "coexist": "coexistence", "coexist2": "transition window",
               "migrate": "migration", "eos": "end of support", "eos2": "major version",
               "note": "additive: minor version · incompatible: major version announced in advance"}},
    "fig11-limits": {
        "pt": {"title": "Fronteira do que o BANZA avalia",
               "desc": "O BANZA avalia a conformidade e observa os artefactos declarados; a autorização regulatória, os controlos internos e o comportamento fora do protocolo ficam fora do âmbito.",
               "outTitle": "fora do âmbito", "out1": "· autorização regulatória",
               "out2": "· controlos internos do operador", "out3": "· comportamento fora do protocolo",
               "inTitle": "o BANZA avalia e observa", "in1": "conformidade face a um perfil público",
               "in2": "artefactos declarados, no instante observado",
               "notrep": "um resultado técnico não representa autorização"},
        "en": {"title": "Boundary of what BANZA evaluates",
               "desc": "BANZA evaluates conformance and observes the declared artifacts; regulatory authorisation, internal controls and off-protocol behaviour are out of scope.",
               "outTitle": "out of scope", "out1": "· regulatory authorisation",
               "out2": "· operator internal controls", "out3": "· off-protocol behaviour",
               "inTitle": "BANZA evaluates and observes", "in1": "conformance against a public profile",
               "in2": "declared artifacts, at the observed instant",
               "notrep": "a technical result does not represent authorisation"}},
    "fig12-state": {
        "pt": {"title": "Estado geral do BANZA",
               "desc": "Pré-produção: zero operadores de produção, zero certificações activas, dinheiro real desactivado, uma implementação de referência em testes e sem medições de desempenho.",
               "header": "Estado geral — pré-produção",
               "c1a": "pré-produção", "c1b": "protocolo e referência",
               "c2a": "zero operadores", "c2b": "de produção",
               "c3a": "zero certificações", "c3b": "técnicas activas",
               "c4a": "dinheiro real", "c4b": "desactivado (fecho por omissão)",
               "c5a": "implementação de referência", "c5b": "ambiente de testes isolado",
               "c6a": "sem medições", "c6b": "de desempenho publicadas"},
        "en": {"title": "General state of BANZA",
               "desc": "Pre-production: zero production operators, zero active certifications, real money disabled, one reference implementation in testing and no performance measurements.",
               "header": "General state — pre-production",
               "c1a": "pre-production", "c1b": "protocol and reference",
               "c2a": "zero operators", "c2b": "in production",
               "c3a": "zero certifications", "c3b": "technical, active",
               "c4a": "real money", "c4b": "disabled (fail-closed)",
               "c5a": "reference implementation", "c5b": "isolated test environment",
               "c6a": "no measurements", "c6b": "of performance published"}},
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
