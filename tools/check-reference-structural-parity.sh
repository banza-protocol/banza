#!/usr/bin/env bash
# The two Reference editions cannot drift structurally.
#
# This compares shape and counted facts, never sentences: a translation is supposed to differ in
# wording and is not supposed to differ in how many Fundamental Principles exist. Literal text
# equality would be the wrong test and machine translation is not evidence of meaning, so the check
# asserts the things a reader would notice were missing — chapters, order, and the counts the
# architecture pins.
set -uo pipefail
cd "$(dirname "$0")/.."

PT="docs/reference/pt/BANZA_REFERENCIA.md"
EN="docs/reference/en/BANZA_REFERENCE.md"

echo "== reference PT/EN structural parity =="
[ -f "$PT" ] && [ -f "$EN" ] || { echo "  FAIL: both editions must exist"; echo "reference-structural-parity: FAILED"; exit 1; }

python3 - "$PT" "$EN" <<'PY'
import re, sys

pt_path, en_path = sys.argv[1], sys.argv[2]
pt = open(pt_path, encoding="utf8").read()
en = open(en_path, encoding="utf8").read()
fail = []

def chapters(t):
    # Numbered chapters only: front matter and back matter are allowed to differ in name.
    return [(int(m.group(1)), m.group(2).strip())
            for m in re.finditer(r'(?m)^## (\d+)\.\s+(.+)$', t)]

pc, ec = chapters(pt), chapters(en)
if [n for n, _ in pc] != [n for n, _ in ec]:
    fail.append("chapter numbers/order differ: PT %s vs EN %s" % ([n for n, _ in pc], [n for n, _ in ec]))
else:
    print("  ok: %d numbered chapters, same numbers in the same order" % len(pc))

# Counted facts the architecture pins. Each is asserted on both editions independently, so a count
# that is wrong in the same way in both languages still fails.
def count_principles(t):
    names = [("Robusto", "Resiliente", "Seguro", "Simples"), ("Robust", "Resilient", "Secure", "Simple")]
    for group in names:
        if all(re.search(r'\b%s\b' % w, t) for w in group):
            return group
    return None

for label, t in (("PT", pt), ("EN", en)):
    g = count_principles(t)
    if not g:
        fail.append("%s does not name all four R2S2 principles" % label)
    else:
        print("  ok: %s names the four principles — %s" % (label, ", ".join(g)))
    if not re.search(r'R²S²|R2S2', t):
        fail.append("%s does not carry the R2S2 mark" % label)
    # A fifth principle must never appear.
    if re.search(r'(quinto|fifth)\s+princ', t, re.I) and not re.search(r'n[aã]o (há|existe)|no fifth', t, re.I):
        fail.append("%s appears to introduce a fifth principle" % label)

def structural_properties(t):
    # The chapter runs to the next numbered chapter or to the end of the document. Anchoring only on a
    # following chapter would make the last chapter of any edition invisible to this check, which is a
    # silent pass exactly where a missing chapter should fail.
    m = re.search(r'(?m)^## \d+\.[^\n]*(?:Propriedades Estruturais|Structural Properties)[^\n]*$'
                  r'(.*?)(?=^## \d+\.|\Z)', t, re.S | re.M)
    if not m:
        return None
    return re.findall(r'(?m)^### (.+)$', m.group(1))

for label, t in (("PT", pt), ("EN", en)):
    props = structural_properties(t)
    if props is None:
        fail.append("%s has no Structural Properties chapter" % label)
        continue
    # The chapter ends with a navigation heading in both editions; it is not a property.
    props = [p for p in props if not re.match(r'(Onde Continuar|Where to Continue|Where Next)', p.strip(), re.I)]
    if len(props) != 8:
        fail.append("%s has %d Structural Properties, expected 8: %s" % (label, len(props), props))
    else:
        print("  ok: %s carries exactly 8 Structural Properties" % label)

# High-risk claims: present in both, or present in neither. A translation that quietly drops a
# limitation is the failure this catches.
CLAIMS = [
    ("three Root authorities",      r'tr[eê]s autoridades',            r'three authorities'),
    ("threshold of two",            r'limiar de duas|duas autoridades',     r'threshold of two|two authorities'),
    ("no trust on first use",       r'primeiro uso',                        r'first use'),
    ("predecessor-authorized",      r'conjunto predecessor|predecessor',    r'predecessor set|predecessor'),
    ("pre-production",              r'pr[eé]-produ[cç][aã]o', r'pre-production'),
    ("profiles L0-L4",              r'L0\s*[–—-]\s*L4|L0.{0,3}L4',  r'L0\s*[–—-]\s*L4|L0.{0,3}L4'),
    ("BanzAI non-authoritative",    r'n[aã]o autoritativ|nunca decide', r'non-authoritative|never decides'),
]
for label, ppat, epat in CLAIMS:
    inpt = bool(re.search(ppat, pt, re.I))
    inen = bool(re.search(epat, en, re.I))
    if inpt != inen:
        fail.append("claim parity: '%s' present in %s only" % (label, "PT" if inpt else "EN"))
if not any(f.startswith("claim parity") for f in fail):
    print("  ok: %d high-risk claims present in both editions" % len(CLAIMS))

if fail:
    print()
    for f in fail:
        print("  FAIL: %s" % f)
    sys.exit(1)
PY
rc=$?
if [ "$rc" -eq 0 ]; then echo "reference-structural-parity: OK"; else echo "reference-structural-parity: FAILED"; fi
exit "$rc"
