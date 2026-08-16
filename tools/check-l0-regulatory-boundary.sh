#!/usr/bin/env bash
# L0 is a technical Protocol Sandbox, and saying so is not the same as saying it authorises anything.
#
# Two properties, because protecting only one of them fails in a different direction each time:
#
#   POSITIVE  L0 is described as enabling genuine technical implementation and interoperability
#             testing. Without this, the boundary language could be trimmed down until L0 reads as a
#             disclaimer with no capability behind it.
#   BOUNDARY  No current surface asserts that L0 grants regulatory authorisation, operational
#             admission, real-money permission, production approval, or that it is a regulator's
#             sandbox. Without this, the capability language could grow until it implies permission.
#
# The check looks for ASSERTIONS, not vocabulary. These documents state the boundary by denying it —
# "L0 não confere autorização regulatória", "L0 is not a regulatory sandbox" — so matching the nouns
# would flag exactly the sentences that carry the property. Every earlier guard in this repository that
# matched nouns had to be repaired for that reason.
set -uo pipefail
# Pinned so character classes and case folding behave the same here and in CI. Alternation is used
# instead of bracket expressions containing multi-byte characters: in a C locale `[aã]` cannot match
# the two bytes of "ã", which made an earlier guard pass under one shell and fail under another.
export LC_ALL=C.UTF-8 2>/dev/null || export LC_ALL=en_US.UTF-8
cd "$(dirname "$0")/.."

echo "== l0-regulatory-boundary =="

python3 - <<'PY'
import re, subprocess, sys, tempfile, os

# Historical records and generated mirrors are out of scope: the first is not a current claim, the
# second cannot say anything its source does not.
OUT = ('evidence/', 'docs/audit/', 'assurance/', 'artifacts/', 'clean-room/',
       'conformance/package/', 'website/content/reference/', 'node_modules/')

def current_files():
    out = subprocess.run(['git', 'ls-files'], capture_output=True, text=True).stdout.split()
    return [f for f in out
            if f.endswith(('.md', '.json', '.ts', '.tsx'))
            and not f.startswith(OUT)]

# A denial anywhere in the sentence makes it boundary copy, which is the correct place for these words.
# These documents state boundaries in mathematical notation as often as in words — "L0 PASS ≠
# production approval" is a denial, and reading it as an assertion flags the very line that carries the
# property.
NEG = re.compile(r'\b(n[aã]o|nunca|never|not|no|without|sem|neither|nor|distinct from|institutionally separate)\b|≠|!=|\bis not\b', re.I)

# Each pattern is an ASSERTION that L0 or BANZA conformance confers something it cannot.
FORBIDDEN = [
    ("L0 presented as a regulatory sandbox",
     r'L0[^.\n]{0,70}\b(regulatory sandbox|sandbox regulat\w+)|(\bregulatory sandbox|sandbox regulat\w+)[^.\n]{0,40}\bL0\b'),
    ("L0 presented as a regulator programme",
     r'L0[^.\n]{0,70}\b(BNA|Banco Nacional de Angola|LISPA)\b'),
    ("L0 presented as granting authorisation",
     r'L0[^.\n]{0,70}\b(grants?|confers?|concede|confere|autoriza|authoris\w+|licen[cs]\w+)\b'),
    ("L0 presented as permitting real money",
     r'L0[^.\n]{0,70}\b(real (funds|money|customer funds)|fundos reais|dinheiro real)\b'),
    # Both word orders: "L0 pass … production" and "passing L0 … production". The self-test caught the
    # second one missing, which is the whole reason the self-test asserts each case is caught by its
    # own rule rather than merely caught by something.
    ("L0 pass presented as production approval",
     r'L0[^.\n]{0,50}\b(pass\w*|passar|aprovad\w+)\b[^.\n]{0,40}\b(production|produ[cç][aã]o)\b'
     r'|\b(pass\w*|passar|aprovad\w+|complet\w+)\b[^.\n]{0,20}\bL0\b[^.\n]{0,60}\b(production|produ[cç][aã]o)\b'),
    ("conformance or certification presented as a licence",
     r'\b(conformance|conformidade|certifica\w+)\b[^.\n]{0,60}\b(grants?|confere|concede)\b[^.\n]{0,30}\b(licen[cs]\w+|authoris\w+|autoriza\w+)\b'),
    ("claimed exemption from regulation",
     r'licen[cs]e[- ]free|sem licen[çc]a necess|unregulated (environment|sandbox)|regulatory exemption|isen[çc][aã]o regulat\w+'),
]

# The positive property has to be stated somewhere current, in both editions of the Reference and in
# the primary explanation.
POSITIVE_HOMES = {
    'docs/governance/certification-boundary.md':
        r'implement, test and demonstrate BANZA technical\s+interoperability',
    'docs/reference/pt/BANZA_REFERENCIA.md':
        r'implementar, testar e demonstrar a interoperabilidade t[ée]cnica',
    'docs/reference/en/BANZA_REFERENCE.md':
        r'implement, test and demonstrate BANZA technical interoperability',
}
BOUNDARY_HOMES = {
    'docs/governance/certification-boundary.md': r'does not grant, replace or imply regulatory authorisation',
    'docs/reference/pt/BANZA_REFERENCIA.md':     r'n[aã]o confere, substitui nem implica autoriza[cç][aã]o regulat',
    'docs/reference/en/BANZA_REFERENCE.md':      r'does not grant, replace or imply regulatory authorisation',
}


def assertions(root='.'):
    found = []
    for f in current_files():
        path = os.path.join(root, f)
        if not os.path.exists(path):
            continue
        text = open(path, encoding='utf8', errors='replace').read()
        for label, pat in FORBIDDEN:
            for m in re.finditer(pat, text, re.I):
                start = text.rfind('\n', 0, m.start()) + 1
                end = text.find('\n', m.end())
                sentence = text[start:end if end > 0 else len(text)]
                if NEG.search(sentence):
                    continue
                found.append((label, f, text[:m.start()].count('\n') + 1, sentence.strip()[:120]))
    return found


def missing_properties(root='.'):
    gaps = []
    for f, pat in POSITIVE_HOMES.items():
        p = os.path.join(root, f)
        if not os.path.exists(p) or not re.search(pat, open(p, encoding='utf8', errors='replace').read()):
            gaps.append("positive property absent: %s no longer says L0 enables technical interoperability testing" % f)
    for f, pat in BOUNDARY_HOMES.items():
        p = os.path.join(root, f)
        if not os.path.exists(p) or not re.search(pat, open(p, encoding='utf8', errors='replace').read()):
            gaps.append("boundary property absent: %s no longer denies that L0 confers authorisation" % f)
    return gaps


def selftest():
    # Denials must pass. These are the exact shapes the real documents use.
    for ok in ["L0 does not grant regulatory authorisation.",
               "L0 não confere autorização regulatória.",
               "L0 is a protocol sandbox, not a regulatory sandbox.",
               "L0 é um sandbox de protocolo, não um sandbox regulatório.",
               "BANZA L0 is distinct from LISPA, which the BNA operates.",
               "There is no automatic production authorisation after L0.",
               "L0 does not confer permission to move real funds.",
               "**L0 PASS ≠ production approval**.",
               "technical conformance ≠ regulatory authorisation",
               "Conformidade técnica ≠ autorização regulatória."]:
        with tempfile.TemporaryDirectory() as tmp:
            os.makedirs(os.path.join(tmp, 'docs'))
            fp = os.path.join(tmp, 'docs', 'x.md')
            open(fp, 'w', encoding='utf8').write(ok + '\n')
            hits = []
            for label, pat in FORBIDDEN:
                for m in re.finditer(pat, ok, re.I):
                    if not NEG.search(ok):
                        hits.append(label)
            if hits:
                print("SELFTEST FAIL: legitimate denial rejected (%s): %s" % (hits[0], ok), file=sys.stderr)
                sys.exit(2)
    # Assertions must fail, and each must be caught by the rule that exists for it.
    for bad, expect in [("L0 grants regulatory authorisation to the operator.", "granting authorisation"),
                        ("BANZA L0 is a BNA regulatory sandbox.", "regulator programme"),
                        ("In L0 an implementation may move real customer funds.", "permitting real money"),
                        ("Passing L0 means the implementation is approved for production.", "production approval"),
                        ("BANZA certification grants a licence to operate.", "licence"),
                        ("L0 is licence-free and unregulated.", "exemption")]:
        caught = [label for label, pat in FORBIDDEN
                  if re.search(pat, bad, re.I) and not NEG.search(bad)]
        if not caught:
            print("SELFTEST FAIL: prohibited assertion not detected: %s" % bad, file=sys.stderr)
            sys.exit(2)
        if not any(expect in c for c in caught):
            print("SELFTEST FAIL: %r caught by the wrong rule (%s), expected one about %s"
                  % (bad, caught, expect), file=sys.stderr)
            sys.exit(2)
    print("  selftest ok — 10 denials accepted, 6 assertions caught by their own rule")


selftest()

bad = assertions()
gaps = missing_properties()
if bad or gaps:
    print()
    for g in gaps:
        print("  FAIL: %s" % g)
    for label, f, line, sentence in bad:
        print("  FAIL: %s\n        %s:%d  %s" % (label, f, line, sentence))
    print()
    print("  L0 is a technical Protocol Sandbox. It confers no authorisation, admission or")
    print("  real-money permission — see docs/governance/certification-boundary.md.")
    sys.exit(1)

print("  ok: L0 stated as a technical sandbox in all three primary homes, boundary denied in all three")
print("  ok: no current surface asserts that L0 or BANZA conformance confers authorisation")
PY
rc=$?
if [ "$rc" -eq 0 ]; then echo "l0-regulatory-boundary: OK"; else echo "l0-regulatory-boundary: FAILED"; fi
exit "$rc"
