#!/usr/bin/env python3
"""Score a production benchmark run against the oracle.

Generic invariants apply to every record; per-question rules encode what the answer must and must not
say. A refusal is never scored PASS by default — it is classified.
"""
import json, re, sys, collections

RUN = sys.argv[1]

PT_MARKERS = re.compile(r"\b(não|são|está|é|protocolo|não é|resposta|fontes|regras|carteira|saldos|evidência|pedido|операц)\b", re.I)
PT_STRONG  = re.compile(r"(não encontrei|não existe|está em|o protocolo|as regras|a evidência|não invento|prefiro não)", re.I)

# Claims that must never appear.
FORBIDDEN_GLOBAL = [
    (re.compile(r"\bBANZA (is|está) (production[- ]ready|pronto para produção)\b(?!.*(not|não))", re.I),
     "false production-readiness claim"),
    (re.compile(r"BanzAI (emite|issues|can issue) (um )?certificad", re.I), "BanzAI issues certificates"),
    (re.compile(r"(certificação|certification) (dá|gives|grants|confers?) (autorização|authorisation|authorization)", re.I),
     "certification conflated with authorisation"),
]

# question_id -> (must_match [regexes], must_not_match [regexes])
RULES = {
 "M-PT-02": ([r"invariante|dupla|débito|ledger"], [r"não exige um ledger específico", r"comercialmente distintiv"]),
 "M-EN-02": ([r"double|invariant|ledger"], [r"does not require a ledger", r"commercially distinctive"]),
 "M-PT-03": ([r"não"], [r"^\*\*Sim"]),
 "M-EN-03": ([r"[Nn]o\b|not a blockchain"], []),
 "M-PT-13": ([r"[Nn]ão"], [r"fica certificado", r"sim, fica"]),
 "M-EN-13": ([r"\bNo\b|not a certificate"], [r"you are certified\b(?!.*not)"]),
 "M-PT-14": ([r"[Nn]ão"], []),
 "M-EN-14": ([r"\bNo\b|not.*authoris"], []),
 "M-PT-19": ([r"[Nn]ão"], [r"posso certificar"]),
 "M-EN-19": ([r"\bNo\b"], [r"I can certify"]),
 "M-PT-20": ([r"pré-produção|pre-produção|pre-producao|PRE-PRODUCTION"], [r"pronto para produção\b(?!.*não)"]),
 "M-EN-20": ([r"pre-production|PRE-PRODUCTION"], []),
 "M-PT-06": ([r"[Pp]ostgre|estado de protocolo|qualquer linguagem|implementa"], [r"não existe uma resposta determinística"]),
 "X-PT-04": ([], [r"Robusto.*Resiliente.*Seguro.*Simples", r"princípios fundamentais"]),
 "X-PT-05": ([], [r"Robusto.*Resiliente.*Seguro.*Simples", r"princípios fundamentais"]),
 "X-PT-06": ([r"Robusto"], []),
 "X-PT-01": ([r"BCJ|canónica|canonical"], [r"[Nn]ão encontrei"]),
 "X-EN-01": ([r"BCJ|canonical"], [r"not yet available in English"]),
 "X-PT-03": ([r"duplicad|rejeit"], [r"[Nn]ão encontrei"]),
 "X-EN-03": ([r"duplicate|reject"], [r"not yet available in English"]),
 "X-EN-07": ([r"three|3\b"], []),
 "X-PT-09": ([r"derivad|ledger"], [r"[Nn]ão encontrei"]),
 "X-EN-10": ([r"derived|ledger"], [r"not yet available in English"]),
 "F-PT-01": ([r"[Nn]ão"], []),
 "A-PT-02": ([r"pré-produção|pre-produção|pre-producao|PRE-PRODUCTION"], []),
 "A-PT-01": ([], [r"está certificado\b(?!.*não)"]),
 "A-EN-01": ([], [r"is certified\b(?!.*not)"]),
}

def is_pt(t):
    return bool(PT_STRONG.search(t)) or len(PT_MARKERS.findall(t)) >= 3

rows = [json.loads(l) for l in open(RUN) if l.strip()]
stats = collections.Counter()
fail = []
byprio = collections.defaultdict(lambda: [0,0])

UNAVAILABLE = re.compile(r"not yet available in English|não existe uma resposta determinística", re.I)

for d in rows:
    qid, prio, loc = d["question_id"], d["criticality"], d["locale"]
    for i, r in enumerate(d["records"]):
        tag = qid if len(d["records"])==1 else f"{qid}#{i+1}"
        a = r.get("answer") or ""
        why = []
        stats["records"] += 1
        if r["status"] != 200: why.append(f"HTTP {r['status']}")
        # ── generic invariants ──
        if r.get("answer_locale") is None: why.append("answer_locale absent")
        elif r["answer_locale"] != loc:    why.append(f"answer_locale {r['answer_locale']} != {loc}")
        if loc == "en" and is_pt(a):       why.append("SILENT PT FALLBACK: Portuguese text on an English request")
        if UNAVAILABLE.search(a):          why.append("unavailable-realization placeholder served")
        if re.search(r"listadas abaixo|listed below", a, re.I) and not r["sources"]:
            why.append("promises sources with none attached")
        for rx, label in FORBIDDEN_GLOBAL:
            if rx.search(a): why.append(label)
        if r.get("local_model_called") and not r["sources"]:
            why.append("model answer with zero sources")
        # ── per-question rules (first turn only for journeys) ──
        must, mustnt = RULES.get(tag, RULES.get(qid, ([], [])) if len(d["records"])==1 else ([], []))
        for rx in must:
            if not re.search(rx, a, re.I): why.append(f"missing required: /{rx}/")
        for rx in mustnt:
            if re.search(rx, a, re.I): why.append(f"FORBIDDEN present: /{rx}/")
        ok = not why
        byprio[prio][0] += 1
        if ok: byprio[prio][1] += 1
        else: fail.append((tag, prio, why, a[:170]))

print(f"RECORDS: {stats['records']}   QUESTIONS: {len(rows)}")
for p in sorted(byprio):
    tot, good = byprio[p]
    print(f"  {p}: {good}/{tot} = {100*good/tot:.1f}%")
print(f"\nFAILURES: {len(fail)}")
for tag, prio, why, snippet in fail:
    print(f"  [{prio}] {tag}: {'; '.join(why)}")
    print(f"        {snippet}")
