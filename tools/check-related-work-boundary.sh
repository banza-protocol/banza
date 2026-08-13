#!/usr/bin/env bash
# Related work stays informative, primary-sourced, and bounded.
#
# The risk this guards is not that the analysis is wrong. It is that a comparison document quietly
# becomes a source of requirements, or that the monotonic mechanism gets restated somewhere as
# transparency once the reasoning behind it has scrolled out of sight.
#
# Checks, in order:
#   1. the document declares itself informative and outside the normative surface
#   2. the normative manifest excludes docs/research/** and lists no artifact from it
#   3. nothing normative cites it as authority (the direction of citation is one-way)
#   4. the bounding sentence is present verbatim
#   5. every comparison ends in an explicit conclusion, including "do not adopt"
#   6. the CT section keeps the two facts that make the comparison honest
#   7. no superiority claim over the compared work
#   8. Mojaloop: specification and platform stay distinguished; no absolutist hub claim; Layer 3
#      comparison marked as BANZA's own reading; its conformance tooling acknowledged
#   9. the RFC 9162 split-view limitation is quoted from the RFC, not paraphrased
set -euo pipefail
cd "$(dirname "$0")/.."

DOC=docs/research/related-work-positioning.md
MANIFEST=contracts/production/normative-manifest.json
fail() { echo "  FAIL: $*"; exit 1; }

echo "== related-work-boundary =="

[ -f "$DOC" ] || fail "$DOC is missing"

# 1. Self-declared status.
grep -q '^\- \*\*Status: Informative\.\*\*' "$DOC" || fail "the document must declare Status: Informative on its own first line"
grep -q 'imposes no conformance obligation' "$DOC" || fail "the document must state that it imposes no conformance obligation"
grep -q 'not part of the normative surface' "$DOC" || fail "the document must place itself outside the normative surface"
echo "  ok: declares itself informative and outside the normative surface"

# 2. The manifest agrees — declared exclusion, and no artifact from docs/research.
python3 - "$MANIFEST" <<'PY' || exit 1
import json, sys
m = json.load(open(sys.argv[1]))
if not any('docs/research' in x for x in m.get('not_normative', [])):
    print("  FAIL: the manifest does not declare docs/research/** as non-normative"); sys.exit(1)
listed = [a['path'] for a in m.get('artifacts', []) if a['path'].startswith('docs/research/')]
if listed:
    print("  FAIL: the manifest lists related-work material as a normative artifact: %s" % listed); sys.exit(1)
PY
echo "  ok: the normative manifest excludes it and lists nothing from it"

# 3. One-way citation. A normative document citing the analysis would invert the authority.
#    contracts/ and conformance/ must not reference it at all; spec/ may only reference it as a
#    pointer to further reading, never as the source of a requirement.
if grep -rl 'related-work-positioning' contracts/ conformance/ 2>/dev/null | grep -q .; then
  fail "a contract or conformance artifact cites the related-work analysis"
fi
while IFS= read -r line; do
  case "$line" in
    *MUST*|*SHALL*|*REQUIRED*|*"as defined in"*|*"per docs/research"*)
      fail "a specification line makes the related-work analysis normative: $line" ;;
  esac
done < <(grep -rn 'related-work-positioning' spec/ 2>/dev/null || true)
echo "  ok: citation runs one way — nothing normative derives a requirement from it"

# 4. The bounding sentence, verbatim. This is the sentence a future restatement is checked against.
grep -q 'provides stateful rollback protection and detects conflicting' "$DOC" \
  || fail "the bounding sentence is missing or reworded"
grep -q 'it does not provide global transparency or cross-observer' "$DOC" \
  || fail "the bounding sentence must keep its second half — the half that says what it is not"
echo "  ok: the bounding sentence is present verbatim"

# 5. Every comparison reaches a conclusion. "Do not adopt" is a permitted outcome, so the check is
#    that a conclusion exists — not which way it went.
for topic in Mojaloop "Decentralized Identifiers" "Verifiable Credentials" "Certificate Transparency"; do
  grep -q "$topic" "$DOC" || fail "the analysis does not cover: $topic"
done
n=$(grep -c '^\*\*Conclusion' "$DOC" || true)
[ "$n" -ge 4 ] || fail "expected a stated conclusion per comparison, found $n"
grep -q '\*\*Conclusion: do not adopt' "$DOC" \
  || fail "no comparison concludes 'do not adopt' — a comparison whose only permitted outcome is adoption is not a comparison"
echo "  ok: 4 comparisons, each with a stated conclusion, including 'do not adopt'"

# 6. The two CT facts that keep the comparison honest in both directions.
grep -q 'Experimental' "$DOC" || fail "the CT section must state RFC 9162's Experimental status"
grep -q 'gossip' "$DOC" \
  || fail "the CT section must state that split-view detection needs gossip — CT alone is not cross-observer consistency"
grep -q 'real additional property' "$DOC" \
  || fail "the CT section must concede that CT provides a property BANZA does not"
echo "  ok: CT is described with both its added property and its own limits"

# 7. No superiority claims. The comparisons exist to locate a boundary, not to win one.
#    The check must be negation-aware: "none of these sections argues that BANZA is better than the
#    work it describes" is the opposite of a superiority claim, and a guard that cannot tell the two
#    apart teaches the author to write for the regex instead of writing honestly.
while IFS= read -r hit; do
  case "$(printf '%s' "$hit" | tr '[:upper:]' '[:lower:]')" in
    *" not "*|*" no "*|*none*|*never*|*neither*|*nothing*|*"n't "*) continue ;;
  esac
  fail "the analysis claims superiority over the work it compares against: $hit"
done < <(grep -nEi 'BANZA is (better|superior|stronger|more (secure|advanced))|(better|superior) than (Mojaloop|CT|DID|Certificate Transparency)' "$DOC" || true)
echo "  ok: no superiority claim"

# 8. Mojaloop precision. The easy summary — "Mojaloop requires a hub" — is false at the level of the
#    FSPIOP specification, which admits bilateral connection as well as a Switch. The specification and
#    the reference platform must stay distinguished, and the Layer 3 comparison must stay marked as
#    BANZA's own reading rather than something Mojaloop says about itself.
#    As in check 7, the match must be read in context: a line that QUOTES the claim in order to refute
#    it ("… is false as a general statement") is the document doing its job, not the defect.
while IFS= read -r hit; do
  case "$(printf '%s' "$hit" | tr '[:upper:]' '[:lower:]')" in
    *" not "*|*never*|*" no "*|*none*|*false*|*wrong*|*unsound*) continue ;;
  esac
  fail "the document states generally that Mojaloop requires a hub — the FSPIOP specification admits bilateral connection: $hit"
done < <(grep -nEi 'hub (is|are) (architecturally )?(required|mandatory|obligatory)|requires a (hub|switch)' "$DOC" || true)
grep -q 'directly to each other' "$DOC" \
  || fail "the FSPIOP topology passage (direct-or-Switch) must be quoted, not paraphrased away"
grep -q 'optional Switch' "$DOC" \
  || fail "the specification's own 'optional Switch' wording must be retained"
grep -qi 'specification does not require a hub' "$DOC" \
  || fail "the document must state plainly that the FSPIOP specification does not require a hub"
grep -qi 'reference platform and operational architecture are hub-centred' "$DOC" \
  || fail "the document must keep the platform/deployment side of the distinction too"
grep -q "BANZA's architectural\s*$\|BANZA's architectural interpretation\|BANZA-side reading" "$DOC" \
  || fail "the Layer 3 comparison must be marked as BANZA's own interpretation"
grep -qi 'would be wrong to suggest Mojaloop has only informal onboarding' "$DOC" \
  || fail "the document must acknowledge Mojaloop's specification, testing tooling and onboarding processes"
grep -qi 'no concrete claim about specific production deployments' "$DOC" \
  || fail "deployment maturity must stay bounded by what the primary sources actually claim"
echo "  ok: Mojaloop — specification and platform distinguished, no absolutist hub claim, Layer 3 marked as interpretation"

# 9. CT split-view precision, quoted rather than paraphrased. Matched against the document with its
#    line breaks flattened: a quotation that is rewrapped by an editor is still the same quotation, and
#    a guard that fails on rewrapping teaches people to fight their editor instead of keeping the quote.
#    Blockquote markers are stripped first: they are how a quotation is presented, not part of it.
FLAT=$(sed 's/^[[:space:]]*>[[:space:]]\{0,1\}//' "$DOC" | tr '\n' ' ' | tr -s ' ')
case "$FLAT" in
  *"shows different, inconsistent views of itself to different clients"*) ;;
  *) fail "the RFC 9162 split-view passage must be quoted verbatim" ;;
esac
case "$FLAT" in
  *"outside the scope of this document"*) ;;
  *) fail "the quote must include that such mechanisms are outside RFC 9162's scope" ;;
esac
echo "  ok: CT split-view limitation quoted from the RFC itself"

echo "related-work-boundary: OK — informative, primary-sourced, one-way, and bounded"
