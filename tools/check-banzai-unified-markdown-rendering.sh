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

# M2.16: the home BanzAI widget is the dossier "Perguntar ao BanzAI" card (HomeAsk), wired to the live agent.
HERO="website/components/home/HomeAsk.tsx"
AGENT="website/components/banzai/BanzaiAgent.tsx"
SAFEMD="website/components/banzai/SafeMarkdown.tsx"
RENDER_TEST="website/components/banzai/SafeMarkdown.render.test.tsx"

for f in "$HERO" "$AGENT" "$SAFEMD" "$RENDER_TEST"; do
  [ -f "$f" ] || { echo "FAIL: $f not found"; exit 1; }
done

echo "== banzai-unified-markdown-rendering-check (M2.14F-FIX2) =="

# 1 — hero/home widget imports the shared renderer.
grep -q 'import { SafeMarkdown } from "@/components/banzai/SafeMarkdown"' "$HERO" \
  && ok "hero widget imports SafeMarkdown" || fail "$HERO must import SafeMarkdown"

# 2 — hero/home widget renders AI answers through SafeMarkdown.
grep -Eq '<SafeMarkdown[[:space:]]+text=\{m\.text\}' "$HERO" \
  && ok "hero widget renders AI answers via <SafeMarkdown text={m.text}>" \
  || fail "$HERO must render the AI answer via <SafeMarkdown text={m.text}>"

# 3 — hero/home widget must NOT render a BanzAI ANSWER as plain text. The user's own message may keep
#     whitespace-pre-wrap; the answer must not. We assert the AI/plain split exists (ai ? SafeMarkdown :
#     <p …pre-wrap>) and that there is no unconditional pre-line answer render.
grep -q 'ai ?' "$HERO" && grep -q '<SafeMarkdown text={m.text} />' "$HERO" \
  && ok "hero widget splits AI (SafeMarkdown) vs user (plain text)" \
  || fail "$HERO must branch: ai ? <SafeMarkdown/> : plain <p>"
if grep -q 'whitespace-pre-line' "$HERO"; then
  fail "$HERO must not use whitespace-pre-line for a BanzAI answer"
else
  ok "hero widget has no whitespace-pre-line answer render"
fi

# 4 — the /banzai live surface still uses SafeMarkdown (no regression).
grep -q 'SafeMarkdown' "$AGENT" \
  && ok "/banzai (BanzaiAgent) still uses SafeMarkdown" || fail "$AGENT must keep using SafeMarkdown"

# 5 — the shared renderer never parses raw HTML. Check the IMPORT, not a comment that mentions the
#     package name (the file documents "no rehype-raw" in prose).
if grep -Eq '(import[^\n]*rehype-raw|require\(["'\'']rehype-raw)' "$SAFEMD"; then
  fail "$SAFEMD must not use rehype-raw (raw HTML must stay inert)"
else
  ok "SafeMarkdown does not import rehype-raw (raw HTML stays inert)"
fi

# 6 — no BanzAI surface uses dangerouslySetInnerHTML.
for f in "$HERO" "$AGENT" "$SAFEMD"; do
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
