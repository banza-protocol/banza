#!/usr/bin/env bash
#
# BANZA has exactly four fundamental principles, and they are R²S².
#
# The risk this guard exists for is not that someone deletes a principle deliberately. It is drift: a
# fifth principle added because something important was noticed, a member quietly dropped from one
# surface, the canonical order rearranged, or — the failure that produced this guard — a DIFFERENT set of
# ideas published under the name "fundamental principles", so that the public surface names two things
# that cannot both be it.
#
# The properties protected:
#
#   1. the registry declares exactly four members, in the canonical order
#   2. every surface that enumerates the principles enumerates the same four
#   3. no surface publishes a competing set under the fundamental-principles name
#   4. the resilience boundary is stated wherever resilience is introduced as a principle
#
# It is deliberately NOT a search for the words "principle" or "fundamental". Those words appear in
# ordinary prose, in negations and in descriptions of what BANZA does not do, and a guard that fires on
# vocabulary teaches people to avoid the vocabulary. It reads the declared set and compares enumerations.
#
# Exit 1 on violation. Exit 2 if the guard's own self-test is broken.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== r2s2-principles =="

check() {
  python3 - "$1" <<'PY'
import json, os, re, sys

root = sys.argv[1]
bad = []

reg = os.path.join(root, 'assurance/principles.json')
if not os.path.exists(reg):
    print('  FAIL: assurance/principles.json is missing — the canonical set has no single declaration')
    sys.exit(1)

d = json.load(open(reg, encoding='utf8'))
members = d.get('principles', [])
names_en = [m.get('name_en') for m in members]
names_pt = [m.get('name_pt') for m in members]

CANON_EN = ['Robust', 'Resilient', 'Secure', 'Simple']
CANON_PT = ['Robusto', 'Resiliente', 'Seguro', 'Simples']

# 1 — exactly four, in the canonical order.
if names_en != CANON_EN:
    bad.append(f'the declared set is {names_en}, the canonical set is {CANON_EN}')
if names_pt != CANON_PT:
    bad.append(f'the Portuguese set is {names_pt}, the canonical set is {CANON_PT}')
if d.get('short_form') != 'R²S²' or d.get('ascii_form') != 'R2S2':
    bad.append('the short form must be R²S² with ASCII form R2S2')
for m in members:
    if not (m.get('meaning_en') or '').strip() or not (m.get('meaning_pt') or '').strip():
        bad.append(f"{m.get('name_en')} has no formal meaning in one of the languages")

# 2 — every surface that ENUMERATES the principles enumerates the same four.
#     An enumeration is detected structurally: a line naming at least two canonical members. Prose that
#     mentions one member ("the trust plane is resilient to one authority failing") is not an enumeration
#     and is deliberately not inspected.
def enumerations(text, canon):
    out = []
    for line in text.split('\n'):
        hits = [c for c in canon if re.search(rf'\b{c}\b', line)]
        if len(hits) >= 2:
            out.append((line.strip(), hits))
    return out

surfaces = [
    'README.md',
    'docs/reference/pt/BANZA_REFERENCIA.md',
    'docs/whitepaper/latex/whitepaper.pt.tex',
    'docs/whitepaper/latex/whitepaper.en.tex',
    'assurance/README.md',
    'decisions/adr/ADR-040-r2s2-fundamental-principles.md',
]
checked = 0
for rel in surfaces:
    p = os.path.join(root, rel)
    if not os.path.exists(p):
        continue
    text = open(p, encoding='utf8', errors='replace').read()
    for canon in (CANON_EN, CANON_PT):
        for line, hits in enumerations(text, canon):
            checked += 1
            # A full enumeration must carry all four, in order.
            if len(hits) == len(canon):
                if hits != canon:
                    bad.append(f'{rel}: enumeration out of canonical order → {hits}')
            # A partial enumeration of 2–3 members must not be presented as THE set.
            elif re.search(r'(fundamental principles|princípios fundamentais|BANZA R.S.)', line, re.I):
                missing = [c for c in canon if c not in hits]
                bad.append(f'{rel}: names the principle set but omits {missing} → {line[:90]}')

# 3 — no competing set published under the fundamental-principles name.
#     The Reference chapter that once carried that title now classifies its content as structural
#     properties; if that title returns to a chapter heading holding anything other than the four, the
#     public surface has two answers to one question again.
ref = os.path.join(root, 'docs/reference/pt/BANZA_REFERENCIA.md')
if os.path.exists(ref):
    text = open(ref, encoding='utf8', errors='replace').read()
    for m in re.finditer(r'^##\s+\d+\.\s*(.+)$', text, re.M):
        title = m.group(1).strip()
        if re.search(r'princípios fundamentais', title, re.I):
            body = text[m.end(): m.end() + 4000]
            if not all(re.search(rf'\b{c}\b', body) for c in CANON_PT):
                bad.append(f'chapter "{title}" claims the fundamental-principles name for a different set')

# 4 — wherever resilience is introduced AS A PRINCIPLE, its boundary travels with it. Resilience stated
#     without its boundary is the reading that buys availability with safety.
for rel in surfaces:
    p = os.path.join(root, rel)
    if not os.path.exists(p):
        continue
    text = open(p, encoding='utf8', errors='replace').read()
    introduces = re.search(r'(Resilient|Resiliente)\b[^\n]{0,400}(Secure|Seguro)\b', text)
    if not introduces:
        continue
    boundary = re.search(
        r'(never permits bypassing|nunca permite contornar|nunca permite bypass|não se sobrep|does not override|never overrides'
        r'|nunca permite contornar confiança|sem enfraquecer|without weakening)',
        text, re.I)
    if not boundary:
        bad.append(f'{rel}: introduces Resilient as a principle without stating its safety boundary')

for b in bad:
    print(f'  FAIL: {b}')
if bad:
    sys.exit(1)
print(f'  ok: exactly four principles — {" · ".join(CANON_EN)} — canonical order held across '
      f'{len(surfaces)} surfaces ({checked} enumerations inspected)')
print('  ok: no competing set published under the fundamental-principles name')
print('  ok: the resilience boundary travels with the principle')
PY
}

# ── self-test ────────────────────────────────────────────────────────────────────────────────────────
# Each property must actually fail when violated, AND the guard must NOT fire on text that merely
# describes, negates or rejects the forbidden condition.
selftest() {
  local d st=0 g b base
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good"; b="$d/bad"
  for base in "$g" "$b"; do
    mkdir -p "$base/assurance" "$base/docs/reference/pt"
    cat > "$base/assurance/principles.json" <<'EOF'
{"short_form":"R²S²","ascii_form":"R2S2","principles":[
 {"name_en":"Robust","name_pt":"Robusto","meaning_en":"m","meaning_pt":"m"},
 {"name_en":"Resilient","name_pt":"Resiliente","meaning_en":"m","meaning_pt":"m"},
 {"name_en":"Secure","name_pt":"Seguro","meaning_en":"m","meaning_pt":"m"},
 {"name_en":"Simple","name_pt":"Simples","meaning_en":"m","meaning_pt":"m"}]}
EOF
    cat > "$base/assurance/README.md" <<'EOF'
BANZA R²S² — Robust · Resilient · Secure · Simple.
Resilient never permits bypassing trust merely to remain available; Secure fails closed.
EOF
  done

  # FALSE-POSITIVE GUARD: prose that DESCRIBES or REJECTS must not trip anything.
  cat >> "$g/assurance/README.md" <<'EOF'
BANZA does not add a fifth principle, and does not treat decentralization as a fundamental principle.
Trust minimization is a derived decision, not a principle. Resilient is not a licence to weaken Secure.
EOF
  check "$g" >/dev/null 2>&1 || { echo "SELFTEST_FAIL: descriptive/negating prose was flagged" >&2; st=1; }

  # a fifth principle in the registry
  python3 - "$b" <<'PY'
import json, sys
p = sys.argv[1] + '/assurance/principles.json'
d = json.load(open(p))
d['principles'].append({"name_en":"Decentralized","name_pt":"Descentralizado","meaning_en":"m","meaning_pt":"m"})
json.dump(d, open(p,'w'))
PY
  check "$b" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: a fifth principle was accepted" >&2; st=1; }

  # Resilient removed
  python3 - "$b" <<'PY'
import json, sys
p = sys.argv[1] + '/assurance/principles.json'
d = json.load(open(p))
d['principles'] = [m for m in d['principles'] if m['name_en'] not in ('Decentralized','Resilient')]
json.dump(d, open(p,'w'))
PY
  check "$b" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: a removed principle was accepted" >&2; st=1; }

  # order rearranged
  python3 - "$b" <<'PY'
import json, sys
p = sys.argv[1] + '/assurance/principles.json'
json.dump({"short_form":"R²S²","ascii_form":"R2S2","principles":[
 {"name_en":"Simple","name_pt":"Simples","meaning_en":"m","meaning_pt":"m"},
 {"name_en":"Secure","name_pt":"Seguro","meaning_en":"m","meaning_pt":"m"},
 {"name_en":"Robust","name_pt":"Robusto","meaning_en":"m","meaning_pt":"m"},
 {"name_en":"Resilient","name_pt":"Resiliente","meaning_en":"m","meaning_pt":"m"}]}, open(p,'w'))
PY
  check "$b" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: a rearranged canonical order was accepted" >&2; st=1; }

  # a competing set published under the fundamental-principles name
  cp "$g/assurance/principles.json" "$b/assurance/principles.json"
  cat > "$b/docs/reference/pt/BANZA_REFERENCIA.md" <<'EOF'
## 3. Princípios Fundamentais

### Correcção financeira
### Neutralidade
EOF
  check "$b" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: a competing principle set was accepted" >&2; st=1; }

  # resilience introduced without its boundary
  rm -f "$b/docs/reference/pt/BANZA_REFERENCIA.md"
  cat > "$b/assurance/README.md" <<'EOF'
BANZA R²S² — Robust · Resilient · Secure · Simple. Resilience keeps the protocol available.
EOF
  check "$b" >/dev/null 2>&1 && { echo "SELFTEST_FAIL: resilience without its boundary was accepted" >&2; st=1; }

  return $st
}

if ! selftest; then echo "r2s2-principles: guard self-test broken"; exit 2; fi

check "$PWD" || exit 1
echo "r2s2-principles: OK — four principles, canonical order, one canonical set"
