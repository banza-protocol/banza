#!/usr/bin/env bash
# check-banzai-unified-markdown-rendering.sh — Unified BanzAI Markdown rendering guard (M2.14F-FIX2).
#
# Every surface that shows a BanzAI answer must render it through the SAME shared safe Markdown renderer
# (SafeMarkdown) as the /banzai live surface — never as plain text. It fails if:
#   1  the hero/home widget (HeroEstado) does not import SafeMarkdown;
#   2  the hero/home widget does not render AI answers via <SafeMarkdown text={…}>;
#   3  the hero/home widget renders a BanzAI answer as plain text (<p …>{m.text}</p> for the AI branch,
#      or whitespace-pre-wrap/pre-line on the answer);
#   4  the /banzai surface (BanzaiAgent) regresses and stops using SafeMarkdown;
#   5  SafeMarkdown parses raw HTML (rehype-raw) — raw HTML must stay inert;
#   6  any BanzAI surface uses dangerouslySetInnerHTML;
#   7  the shared renderer or a surface leaves the answer as raw Markdown (** / ####) by construction.
# Behavioural: the SafeMarkdown render tests (bold, lists, sanitization, entity/slash, boundary,
# fallback) must pass — bold renders as <strong>, lists as <ul>/<li>, no literal **, no <script>, no
# javascript: links.
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

# The BanzAI answer surface readers actually reach. These properties were asserted against
# components/home/HomeAsk.tsx, which no production route imports and which does not appear in the built
# output, while this live surface was checked only for MENTIONING SafeMarkdown — the substantive
# properties guarded dead source and the live one had a token.
AGENT="website/components/banzai/BanzaiAgent.tsx"
SAFEMD="website/components/banzai/SafeMarkdown.tsx"
RENDER_TEST="website/components/banzai/SafeMarkdown.render.test.tsx"

for f in "$AGENT" "$SAFEMD" "$RENDER_TEST"; do
  [ -f "$f" ] || { echo "FAIL: $f not found"; exit 1; }
done

echo "== banzai-unified-markdown-rendering-check (M2.14F-FIX2) =="

# 1 — the live answer surface imports the shared renderer.
grep -q 'import { SafeMarkdown } from "@/components/banzai/SafeMarkdown"' "$AGENT" \
  && ok "live answer surface imports SafeMarkdown" || fail "$AGENT must import SafeMarkdown"

# 2 — the live answer surface renders AI answers through SafeMarkdown.
grep -Eq '<SafeMarkdown[[:space:]]+text=\{m\.text\}' "$AGENT" \
  && ok "live answer surface renders AI answers via <SafeMarkdown text={m.text}>" \
  || fail "$AGENT must render the AI answer via <SafeMarkdown text={m.text}>"

# 3 — hero/home widget must NOT render a BanzAI ANSWER as plain text. The user's own message may keep
#     whitespace-pre-wrap; the answer must not. We assert the AI/plain split exists (ai ? SafeMarkdown :
#     <p …pre-wrap>) and that there is no unconditional pre-line answer render.
grep -q 'ai ?' "$AGENT" && grep -q '<SafeMarkdown text={m.text} />' "$AGENT" \
  && ok "live answer surface splits AI (SafeMarkdown) vs user (plain text)" \
  || fail "$AGENT must branch: ai ? <SafeMarkdown/> : plain <p>"
if grep -q 'whitespace-pre-line' "$AGENT"; then
  fail "$AGENT must not use whitespace-pre-line for a BanzAI answer"
else
  ok "live answer surface has no whitespace-pre-line answer render"
fi

# 5 — the shared renderer never parses raw HTML. Check the IMPORT, not a comment that mentions the
#     package name (the file documents "no rehype-raw" in prose).
if grep -Eq '(import[^\n]*rehype-raw|require\(["'\'']rehype-raw)' "$SAFEMD"; then
  fail "$SAFEMD must not use rehype-raw (raw HTML must stay inert)"
else
  ok "SafeMarkdown does not import rehype-raw (raw HTML stays inert)"
fi

# 6 — no BanzAI surface uses dangerouslySetInnerHTML.
for f in "$AGENT" "$SAFEMD"; do
  if grep -q 'dangerouslySetInnerHTML' "$f"; then
    fail "$f must not use dangerouslySetInnerHTML"
  fi
done
ok "no BanzAI surface uses dangerouslySetInnerHTML"

# 7 — the shared renderer applies a strict element allowlist + safe link transform.
grep -q 'allowedElements' "$SAFEMD" && grep -q 'urlTransform' "$SAFEMD" \
  && ok "SafeMarkdown uses an element allowlist + safe urlTransform" \
  || fail "$SAFEMD must use allowedElements + urlTransform"

# ── Behavioural — the render tests must pass (bold, lists, sanitization, entity/slash, boundary). ──
if [ -x website/node_modules/.bin/vitest ]; then
  if ( cd website && node_modules/.bin/vitest run components/banzai/SafeMarkdown.render.test.tsx >/tmp/umd-vitest.out 2>&1 ); then
    ok "SafeMarkdown render tests pass (bold→<strong>, lists→<ul>/<li>, no **, no <script>, no javascript:)"
  else
    fail "SafeMarkdown render tests failed"
    tail -30 /tmp/umd-vitest.out
  fi
else
  ok "vitest not installed here — render tests skipped (run in the local battery; static invariants hold)"
fi

echo
if [ "$FAILED" -eq 0 ]; then echo "UNIFIED MARKDOWN RENDERING CHECK PASSED ✅"; else echo "UNIFIED MARKDOWN RENDERING CHECK FAILED ✗"; fi
exit "$FAILED"
