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
# --emit <path> writes the per-item verdicts as a committable artifact. It is produced BY THIS SCORER
# so there is exactly one oracle: a second implementation of "did this pass?" drifts from the first and
# then the evidence and the report disagree, which is how a measurement stops meaning anything.
EMIT = sys.argv[sys.argv.index("--emit") + 1] if "--emit" in sys.argv else None
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
verdicts = []
unit_pass = collections.defaultdict(lambda: [0, 0])
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
            # A SOURCE follow-up is judged on the sources it served, not on its prose. The terminal puts
            # the identities in `sources` and a lead sentence in the body — that is the shipped contract —
            # so reading the body failed turns that had cited correctly. This is the stronger property:
            # real ids, non-empty, and continuous with what the previous turn actually cited.
            if ts.get("sources_continue_prior"):
                served = [str(x.get("id")) for x in (rec.get("sources") or []) if x.get("id")]
                prior = [str(x.get("id")) for x in ((d["records"][idx - 2].get("sources") or []) if idx >= 2 else [])]
                if not served:
                    why.append(f"turn {idx}: source follow-up served NO sources")
                else:
                    stray = [x for x in served if x not in prior]
                    if stray:
                        why.append(f"turn {idx}: sources not carried from the previous turn: {stray}")
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
            unit_pass[u][0] += 1
            if ok: unit_pass[u][1] += 1
        if not ok:
            fails.append((d["question_id"], spec["criticality"], spec["locale"], spec["question"][:52], why, ""))
        verdicts.append({"question_id": d["question_id"], "locale": spec["locale"], "form": spec["form"],
                         "criticality": spec["criticality"], "semantic_unit_ids": spec["semantic_unit_ids"],
                         "terminal_kind": d["records"][0].get("terminal_kind"),
                         "answer_locale": d["records"][0].get("answer_locale"),
                         "turns_run": len(d["records"]), "pass": ok, "reasons": why})
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
        unit_pass[u][0] += 1
        if ok: unit_pass[u][1] += 1
    if not ok:
        fails.append((d["question_id"], spec["criticality"], spec["locale"], spec["question"][:52], why, a[:100]))
    verdicts.append({"question_id": d["question_id"], "locale": spec["locale"], "form": spec["form"],
                     "criticality": spec["criticality"], "semantic_unit_ids": spec["semantic_unit_ids"],
                     "terminal_kind": r.get("terminal_kind"), "answer_locale": r.get("answer_locale"),
                     "sources_count": r.get("sources_count"), "pass": ok, "reasons": why})

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
# FULLY passing means EVERY item naming the unit passed.
#
# This line read `semantic_id in covered_units`, and `covered_units` is populated whenever ANY item
# passes — so a unit with a passing Portuguese direct question and a failing English paraphrase counted
# as fully passing. Against src-acb0f1b it reported 173/176 while 51 factual items were failing, which
# is arithmetically impossible for 3 units and was the giveaway. A metric that cannot be reconciled
# with the failure list is worse than no metric: it was the headline number for release readiness.
unit_items = collections.defaultdict(lambda: [0, 0])
for u, (t, g) in unit_pass.items():
    unit_items[u] = [t, g]
fully = [u["semantic_id"] for u in factual
         if unit_items.get(u["semantic_id"], [0, 0])[0] > 0
         and unit_items[u["semantic_id"]][0] == unit_items[u["semantic_id"]][1]]
partial = [u["semantic_id"] for u in factual
           if unit_items.get(u["semantic_id"], [0, 0])[0] > 0
           and unit_items[u["semantic_id"]][1] < unit_items[u["semantic_id"]][0]]
unasked = [u["semantic_id"] for u in factual if unit_items.get(u["semantic_id"], [0, 0])[0] == 0]
print(f"   FULLY-passing factual units (every item): {len(fully)}/{len(factual)}")
print(f"   partially-passing (>=1 item failing)    : {len(partial)}")
if unasked:
    print(f"   NOT ASKED AT ALL                        : {len(unasked)}")
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


if EMIT:
    import hashlib
    digest = hashlib.sha256(open(RUN, "rb").read()).hexdigest()
    payload = {
        "_note": (
            "SCORED RESULTS for a full production run against the frozen V2 universe, emitted by "
            "score-v2.py so the verdicts and the report share one oracle. The raw transcript is NOT "
            "committed: two of the 572 answers correctly name the Layer-3 designated scheme operator — "
            "legitimate ADR-060 vocabulary BanzAI is right to state — and committing the prose would "
            "require widening the operator-neutrality allowlist to admit measurement output. Widening a "
            "contamination guard to store evidence is the wrong trade, and editing the transcript would "
            "be worse. Everything the measurement claim rests on is here: every item, its units, its "
            "verdict and its reasons, with the transcript identified by digest and reproducible from "
            "the pinned corpus."
        ),
        "universe_hash": uni["universe_hash"], "corpus_hash": bench["corpus_hash"],
        "raw_transcript_sha256": digest,
        "items": len(verdicts), "passing": sum(1 for v in verdicts if v["pass"]),
        "results": verdicts,
    }
    with open(EMIT, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    print(f"\nemitted {EMIT}: {payload['passing']}/{payload['items']}")
