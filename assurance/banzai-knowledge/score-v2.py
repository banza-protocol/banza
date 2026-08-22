#!/usr/bin/env python3
"""Score a V2 run against the FROZEN oracle in benchmark-v2.json.

THREE METRICS, NEVER COLLAPSED INTO ONE.

  A. UNIVERSE MAPPING COVERAGE  — of the declared factual units, how many does the corpus even ASK
     about? A denominator question. It is 100% by construction when the closed-world guard passes,
     and printing it is how we notice when it stops being.

  B. EXECUTION COVERAGE         — of the corpus items, how many actually RAN and returned a response?
     A run that dies at item 78 has 14% execution coverage, and any pass rate computed from those 78
     rows is a statement about 78 rows, not about the universe.

  C. BEHAVIORAL PASS RATE       — of the items that ran, how many were ANSWERED CORRECTLY?

Reporting one number in place of these three is how a partial run gets mistaken for a clean one.
"""
import json, re, sys, collections

RUN = sys.argv[1]
ROOT = "/Users/fm65/banza/assurance/banzai-knowledge"
bench = json.load(open(f"{ROOT}/benchmark-v2.json"))
uni = json.load(open(f"{ROOT}/semantic-universe.json"))
oracle = {i["question_id"]: i for i in bench["items"]}

PT_STRONG = re.compile(r"(não encontrei|não existe|está em|o protocolo|as regras|não invento|prefiro não)", re.I)
PT_MARK = re.compile(r"\b(não|são|está|é|protocolo|regras|carteira|saldos|evidência)\b", re.I)
UNAVAIL = re.compile(r"not yet available in English|não existe uma resposta determinística", re.I)
FORBIDDEN_GLOBAL = [
    (re.compile(r"\bBANZA (is|está) (production[- ]ready|pronto para produção)\b(?!.*(not|não))", re.I), "false production-readiness"),
    (re.compile(r"(usar|use) trust para implementar|need trust to implement", re.I), "Rust/trust substitution"),
    (re.compile(r"(certificação|certification) (dá|gives|grants|confers?) (autorização|authorisation|authorization)", re.I), "certification conflated with authorisation"),
    # A PASS is verifiable technical evidence. Presented as a certificate it becomes a conferred
    # status, which is the one reading the whole certification boundary exists to prevent — so it is
    # forbidden in EVERY answer, not only in the item that asks the question directly. Added after the
    # oracle audit scored exactly this inversion as a pass (mutation Q1).
    (re.compile(r"\bPASS\b(?:(?!\bn[ãa]o\b|\bnot\b|\bnever\b)[^.])*\b(is|[ée])\s+(a|an|um|uma)\s+(certificad|certificate)", re.I), "PASS presented as a certificate"),
]

def is_pt(t):
    return bool(PT_STRONG.search(t)) or len(PT_MARK.findall(t)) >= 3

rows = [json.loads(l) for l in open(RUN) if l.strip()]
byprio = collections.defaultdict(lambda: [0, 0])
byclass = collections.defaultdict(lambda: [0, 0])
fails = []
covered_units = set()
counters = collections.Counter()
unit_class = {u["semantic_id"]: u["knowledge_class"] for u in uni["units"]}

for d in rows:
    spec = oracle.get(d["question_id"])
    if not spec:
        counters["row_not_in_oracle"] += 1
        continue
    # A JOURNEY is scored turn by turn. Reading only records[0] would score the opening question and
    # call the conversation covered — the followup turns, which are the entire claim, would never be
    # looked at. A journey passes only if every turn passes, and the failure names the turn.
    turns_spec = spec.get("turns")
    if turns_spec:
        why = []
        for idx, (ts, rec) in enumerate(zip(turns_spec, d["records"]), start=1):
            ta = rec.get("answer") or ""
            if rec["status"] != 200:
                why.append(f"turn {idx}: HTTP {rec['status']}")
            if rec.get("answer_locale") and rec["answer_locale"] != spec["locale"]:
                why.append(f"turn {idx}: answer_locale {rec['answer_locale']} != {spec['locale']}")
                counters["false_answer_locale"] += 1
            if spec["locale"] == "en" and is_pt(ta):
                why.append(f"turn {idx}: SILENT PT FALLBACK"); counters["silent_pt_fallback"] += 1
            if rec["terminal_kind"] in ("insufficient_evidence",) or not ta:
                why.append(f"turn {idx}: incorrect refusal"); counters["journey_turn_refusal"] += 1
            for rx in ts.get("must", []):
                if not re.search(rx, ta, re.I):
                    why.append(f"turn {idx}: missing required /{rx}/"); counters["journey_context_lost"] += 1
            for rx in ts.get("must_not", []):
                if re.search(rx, ta, re.I):
                    why.append(f"turn {idx}: FORBIDDEN /{rx}/")
        if len(d["records"]) != len(turns_spec):
            why.append(f"journey ran {len(d['records'])} of {len(turns_spec)} turns")
        ok = not why
        byprio[spec["criticality"]][0] += 1
        if ok:
            byprio[spec["criticality"]][1] += 1
            for u in spec["semantic_unit_ids"]:
                covered_units.add(u)
        for u in spec["semantic_unit_ids"]:
            c = unit_class.get(u, "?")
            byclass[c][0] += 1
            if ok: byclass[c][1] += 1
        if not ok:
            fails.append((d["question_id"], spec["criticality"], spec["locale"], spec["question"][:52], why, ""))
        continue

    r = d["records"][0]
    a = r.get("answer") or ""
    why = []
    if r["status"] != 200:
        why.append(f"HTTP {r['status']}")
    if r.get("answer_locale") is None:
        why.append("answer_locale absent"); counters["false_answer_locale"] += 1
    elif r["answer_locale"] != spec["locale"]:
        why.append(f"answer_locale {r['answer_locale']} != {spec['locale']}"); counters["false_answer_locale"] += 1
    if spec["locale"] == "en" and is_pt(a):
        why.append("SILENT PT FALLBACK"); counters["silent_pt_fallback"] += 1
    if UNAVAIL.search(a):
        why.append("unavailable placeholder"); counters["unavailable_placeholder"] += 1
    if r.get("local_model_called") and not r["sources"]:
        why.append("model answer with zero sources"); counters["ungrounded_model"] += 1
    for rx, label in FORBIDDEN_GLOBAL:
        if rx.search(a):
            why.append(label); counters["unsupported_banza_claim"] += 1
    refused = r["terminal_kind"] in ("insufficient_evidence",) or not a
    if refused and not spec.get("acceptable_refusal"):
        why.append("incorrect refusal")
        counters["domain_refusal" if any(u.startswith("domain.") for u in spec["semantic_unit_ids"]) else "known_fact_refusal"] += 1
    for rx in spec.get("must", []):
        if not re.search(rx, a, re.I):
            why.append(f"missing required /{rx}/")
    for rx in spec.get("must_not", []):
        if re.search(rx, a, re.I):
            why.append(f"FORBIDDEN /{rx}/")
    ok = not why
    byprio[spec["criticality"]][0] += 1
    if ok:
        byprio[spec["criticality"]][1] += 1
        for u in spec["semantic_unit_ids"]:
            covered_units.add(u)
    for u in spec["semantic_unit_ids"]:
        c = unit_class.get(u, "?")
        byclass[c][0] += 1
        if ok: byclass[c][1] += 1
    if not ok:
        fails.append((d["question_id"], spec["criticality"], spec["locale"], spec["question"][:52], why, a[:100]))

factual = [u for u in uni["units"] if u["knowledge_class"] != "CAPABILITY"]
asked = {u for i in bench["items"] for u in i["semantic_unit_ids"]}
mapped = len([u for u in factual if u["semantic_id"] in asked])
scored = sum(v[0] for v in byprio.values())
passing = sum(v[1] for v in byprio.values())
declared = bench["count"]

print(f"RUN: {RUN.split('/')[-1]}")
print(f"universe hash: {uni['universe_hash']}   corpus hash: {bench['corpus_hash']}")
print()
print("A. UNIVERSE MAPPING COVERAGE (does the corpus ASK about each declared unit?)")
print(f"     {mapped}/{len(factual)} factual units asked = {100*mapped/len(factual):.1f}%")
print("B. EXECUTION COVERAGE        (did the item RUN?)")
print(f"     {scored}/{declared} corpus items executed = {100*scored/declared:.1f}%")
if scored < declared:
    print(f"     *** INCOMPLETE RUN — {declared - scored} items never executed. Any rate below is over the {scored} that did. ***")
print("C. BEHAVIORAL PASS RATE      (was the answer CORRECT?)")
print(f"     {passing}/{scored} executed items correct = {100*passing/scored:.1f}%" if scored else "     no rows")
print()
print("   fully-passing factual units:", len([u for u in factual if u['semantic_id'] in covered_units]), "/", len(factual))
for p in sorted(byprio):
    t, g = byprio[p]
    print(f"  {p}: {g}/{t} = {100*g/t:.1f}%")
print("\nby knowledge class:")
for c in sorted(byclass):
    t, g = byclass[c]
    print(f"  {c:18} {g}/{t} = {100*g/t:.1f}%")
print("\ncounters:", dict(counters) or "clean")
print(f"\nFAILURES: {len(fails)}")
clusters = collections.Counter()
for qid, prio, loc, q, why, snip in fails:
    clusters[why[0].split(" /")[0]] += 1
print("clusters:", dict(clusters.most_common(12)))
for qid, prio, loc, q, why, snip in fails[:30]:
    print(f"  [{prio}/{loc}] {qid} {q}")
    print(f"      {'; '.join(why)[:150]}")
