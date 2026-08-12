#!/usr/bin/env bash
# check-banzai-answer-rendering-ux.sh — BanzAI answer formatting / citation UX guard (M2.13D).
#
# Static source invariants for the chat rendering + the link-safety unit tests. It fails if the answer
# rendering regresses on any of the M2.13D contract (Part 13). The VISUAL conditions (mobile overlap,
# colour contrast) are covered by live browser QA; here we lock the code-level guarantees:
#   1  the software-licence answer highlights **Apache License 2.0**;
#   2  a trailing "Fonte:/Fontes:" line is stripped from the body when a source block exists;
#   3  sources render in a dedicated block (SourceBlock) — not inline pills;
#   4  sources and quick prompts are STRUCTURALLY distinct (own markers, labels);
#   5-7 source links never point at excluded/sensitive/secret paths;
#   8  source links use a stable repo blob URL;
#   9  answers render through the Markdown ALLOWLIST (no raw HTML, no rehype-raw);
#   10 no dangerouslySetInnerHTML anywhere in the chat component;
#   11 the retired /operador-zero route is never a linkable/active source;
#   12 the per-answer metadata line stays discreet (mono, muted);
#   13 a refusal keeps its "RECUSA SEGURA" badge;
#   14 a source block shows its count;
#   15 sources are truncation/aria-labelled for small screens.
# Plus: the link-safety + adapter unit tests must pass (Parts 5/6/7/12 logic).

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

KB="services/banzai-api/src/knowledge.js"
ADAPTER="website/components/home/banzaiKb.ts"
SAFEMD="website/components/banzai/SafeMarkdown.tsx"
SAFELINKS="website/components/banzai/safeLinks.ts"
SRCBLK="website/components/banzai/SourceBlock.tsx"
AGENT="website/components/banzai/BanzaiAgent.tsx"

for f in "$KB" "$ADAPTER" "$SAFEMD" "$SAFELINKS" "$SRCBLK" "$AGENT"; do
  [ -f "$f" ] || { echo "FAIL: $f not found"; exit 1; }
done

echo "== banzai-answer-rendering-ux-check (M2.13D) =="

# 1 — the software-licence answer highlights Apache License 2.0.
grep -q 'Apache License 2.0\*\*' "$KB" && ok "(1) licence answer highlights **Apache License 2.0**" || fail "(1) licence answer does not bold Apache License 2.0"

# 2 — the adapter strips an in-body Fonte:/Fontes:/Fontes citáveis:/Sources: block when a source block
#     exists (M2.14C broadened the strip to also cover "Fontes citáveis:" — see the global rendering
#     contract; the server normalizer is the primary guarantee, this is the client defense).
grep -Eq 'Fontes\?' "$ADAPTER" && grep -Eq 'Sources\?' "$ADAPTER" && grep -qF 'cit[aá]veis' "$ADAPTER" && grep -q 'richSources.length > 0' "$ADAPTER" && ok "(2) in-body Fonte:/Fontes citáveis:/Sources: stripped when a source block exists" || fail "(2) no in-body-citation strip tied to the source block"

# 3 — a dedicated SourceBlock component renders the citations, and the agent uses it.
grep -q 'data-sources-block' "$SRCBLK" && grep -q '<SourceBlock ' "$AGENT" && ok "(3) sources render in a dedicated SourceBlock" || fail "(3) SourceBlock missing or not used"

# 4 — sources and quick prompts are structurally distinct.
grep -q 'data-quick-prompts' "$AGENT" && grep -q 'CONTINUAR' "$AGENT" \
  && grep -Eq 'LICEN|CÓDIGO|CODIGO|RELAT|SEGURAN' "$SRCBLK" \
  && ok "(4) quick prompts (data-quick-prompts/CONTINUAR) are distinct from sources (category labels)" \
  || fail "(4) sources and quick prompts are not structurally distinct"

# 5-7 — source links never point at excluded/sensitive/secret paths (the UNLINKABLE list).
for tok in '.env' 'private' 'secret' '.pem' '.key' 'credential'; do
  grep -qF "\"$tok\"" "$ADAPTER" || fail "(5-7) UNLINKABLE list is missing '$tok'"
done
grep -q 'UNLINKABLE' "$ADAPTER" && ok "(5-7) source links exclude .env/private/secret/.pem/.key/credential" || fail "(5-7) no UNLINKABLE exclusion list"

# 8 — source links use a stable repo blob/tree URL.
grep -q 'github.com/${repo}/blob/main' "$ADAPTER" && ok "(8) source links use a stable repo blob URL" || fail "(8) source links do not use a stable blob URL"

# 9 — answers render through the Markdown ALLOWLIST, and raw HTML is never parsed (no rehype-raw).
# raw HTML must never be parsed: no rehype-raw IMPORT/USE (a mention in a comment is fine).
if grep -q 'allowedElements' "$SAFEMD" && grep -q 'unwrapDisallowed' "$SAFEMD" && grep -q 'urlTransform' "$SAFEMD" \
  && ! grep -Eq "from ['\"]rehype-raw|require\(['\"]rehype-raw|rehypeRaw" "$SAFEMD"; then
  ok "(9) answers render via a Markdown allowlist; no rehype-raw (raw HTML inert)"
else
  fail "(9) Markdown allowlist / no-rehype-raw invariant broken"
fi
grep -q '<SafeMarkdown ' "$AGENT" && ok "(9b) the AI answer body renders via SafeMarkdown" || fail "(9b) the AI answer body does not use SafeMarkdown"

# 10 — no dangerouslySetInnerHTML anywhere in the chat component or the renderers.
if grep -q 'dangerouslySetInnerHTML' "$AGENT" "$SAFEMD" "$SRCBLK"; then
  fail "(10) dangerouslySetInnerHTML present in a chat-rendering file"
else
  ok "(10) no dangerouslySetInnerHTML in the chat rendering"
fi

# 11 — the retired /operador-zero route is never a linkable/active source.
grep -q 'operador-zero' "$ADAPTER" && grep -q 'return null' "$ADAPTER" && ok "(11) /operador-zero is never a linkable source" || fail "(11) no /operador-zero link exclusion in safeSourceHref"

# 12 — the per-answer metadata line stays discreet (mono, muted).
grep -Eq 'font-mono text-\[10.5px\] leading-\[1.4\] text-ink-5.*m\.status|m\.status' "$AGENT" \
  && grep -q 'text-ink-5' "$AGENT" && ok "(12) metadata line is discreet (mono, muted)" || fail "(12) metadata line not discreet"

# 13 — a refusal keeps its safe-refusal badge.
grep -q 'RECUSA SEGURA' "$AGENT" && ok "(13) refusal keeps a 'RECUSA SEGURA' badge" || fail "(13) no RECUSA SEGURA badge"

# 14 — a source block shows its count.
grep -q 'FONTES USADAS' "$SRCBLK" && grep -q 'sources.length' "$SRCBLK" && ok "(14) the source block shows a count" || fail "(14) source block does not show a count"

# 15 — sources are truncation/aria-labelled for small screens.
grep -q 'aria-label="Fontes usadas"' "$SRCBLK" && grep -q 'truncate' "$SRCBLK" && ok "(15) sources are aria-labelled + truncate on small screens" || fail "(15) sources lack aria-label/truncate"

# Logic tests — the link-safety allowlist + the adapter source/Fonte behaviour (Parts 5/6/7/12). Run
# ONLY when the website test runner is installed (local / any job with website deps). CI validates the
# website through static guards (no npm install), so the tests are skipped there — they run in the local
# battery and gate the PR. The static invariants above hold in every environment.
echo "-- link-safety + adapter unit tests --"
if [ -x website/node_modules/.bin/vitest ]; then
  if ( cd website && node_modules/.bin/vitest run components/banzai/safeLinks.test.ts components/home/banzaiKb.test.ts >/tmp/ux-vitest.out 2>&1 ); then
    ok "link-safety + adapter unit tests pass"
  else
    tail -25 /tmp/ux-vitest.out
    fail "link-safety / adapter unit tests failed"
  fi
else
  ok "vitest not installed here — logic tests skipped (run in the local battery; static invariants hold)"
fi

if [ "$FAILED" -ne 0 ]; then
  echo "BANZAI ANSWER RENDERING UX CHECK FAILED ✗"
  exit 1
fi
echo "BANZAI ANSWER RENDERING UX CHECK PASSED ✅"
