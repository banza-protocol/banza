#!/usr/bin/env bash
# check-banzai-progressive-ui.sh — the SPR-5 "Safe Progressive Response" progressive-interface guard (§9/§12).
#
# SPR-1 defined the typed contract; SPR-2 wired it into POST /banzai/ask/stream (SSE). SPR-5 consumes that
# stream in the /banzai page UI: a live processing line + SAFE facts-available cards + a synthesis state while
# the model works, and the validated answer rendered ONLY on the terminal event. This guard defends the
# SAFETY-CRITICAL invariants of the FRONTEND wiring, statically (pure grep) plus a behavioural mirror-parity
# check that drives the committed progressContract.js WASM:
#   * the frontend contract mirror (website/lib/banzaiProgress.ts) EQUALS the Rust-owned source of truth
#     (progressContract.js): same schema token, same 18 event kinds, same terminal kinds, same 6 response
#     dispositions, same disposition→terminal mapping — never a hand-rolled divergent set;
#   * there is NO model-token / delta / partial-prose kind anywhere in the frontend (no unvalidated prose);
#   * the progressive VIEW (BanzaiProgress.tsx) renders NO answer prose: it imports no SafeMarkdown, reads no
#     `.final`/answer field, and renders only the SAFE projection (factsFromEvents = ids/enums/counts/hashes);
#   * the chat renders the validated answer ONLY on the terminal path (applyAnswer → SafeMarkdown), never from
#     an in-flight event; the busy branch renders the progressive view, not the answer;
#   * the UI reacts to the typed response_disposition / boundary_context (a REFUSED disposition → a refusal),
#     never to the raw `grounded`; and a stream failure FALLS BACK to the non-stream banzaiKb fetch.
# The decision LOGIC is Rust; this wrapper inspects the frontend wiring. WASM-free static-degrade for the CI
# job that has no committed WASM / no website node_modules (pattern from tools/check-banzai-toolplanner.sh).

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

MIRROR="website/lib/banzaiProgress.ts"
CLIENT="website/lib/banzaiProgressClient.ts"
VIEW="website/components/banzai/BanzaiProgress.tsx"
AGENT="website/components/banzai/BanzaiAgent.tsx"
ADAPTER="website/components/home/banzaiKb.ts"
CONTRACT="services/banzai-api/src/progressContract.js"

for f in "$MIRROR" "$CLIENT" "$VIEW" "$AGENT" "$ADAPTER"; do
  [ -f "$f" ] || { echo "FAIL: missing $f"; exit 1; }
done

echo "== banzai-progressive-ui-check (SPR-5, §9/§12) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
printf '%s\n' 'FINAL_VALIDATED' | grep -q 'FINAL_VALIDATED' || { echo "guard self-test FAILED" >&2; exit 2; }

# ── static: the frontend files exist and declare the SPR-5 surface ────────────────────────────────────
grep -q "export const PROGRESS_EVENT_KINDS" "$MIRROR" || fail "$MIRROR must declare the mirrored PROGRESS_EVENT_KINDS"
grep -q "export function factsFromEvents" "$MIRROR" || fail "$MIRROR must expose the SAFE facts projection factsFromEvents"
grep -q "export function progressLineFor" "$MIRROR" || fail "$MIRROR must expose the processing-line map progressLineFor"
grep -q "export function computeMetrics" "$MIRROR" || fail "$MIRROR must expose the §12 computeMetrics"
grep -q "export async function\* streamBanzaiAsk" "$CLIENT" || fail "$CLIENT must expose the SSE generator streamBanzaiAsk"
grep -q "export async function askViaStream" "$CLIENT" || fail "$CLIENT must expose askViaStream"
grep -q "export function BanzaiProgressView" "$VIEW" || fail "$VIEW must export BanzaiProgressView"
grep -q "export function BanzaiProgressMetrics" "$VIEW" || fail "$VIEW must export BanzaiProgressMetrics"
[ "$FAILED" -eq 0 ] && ok "SPR-5 frontend surface present (mirror + client + view + metrics)"

# ── static: NO model-token / delta / partial-prose kind anywhere in the frontend (no unvalidated prose) ─
if grep -RIlE '"[A-Z_]*(TOKEN|DELTA|PARTIAL)[A-Z_]*"' "$MIRROR" "$CLIENT" "$VIEW" 2>/dev/null | grep -q .; then
  fail "a model-token/delta/partial-prose kind appears in the frontend — no unvalidated model text may be streamed"
else
  ok "no model-token/delta/partial-prose kind in the frontend"
fi

# ── static: the progressive VIEW renders NO answer prose (no SafeMarkdown, no .final/answer, no raw HTML) ─
# Scan CODE ONLY: strip // line comments AND /** … */ block-comment lines (which legitimately explain, in
# prose, what is NEVER rendered — they must not be mistaken for code).
strip_comments() { grep -vE '^\s*(//|\*|/\*)' "$1" || true; }
grep -q "factsFromEvents" "$VIEW" || fail "$VIEW must render only the SAFE projection (factsFromEvents)"
view_code=$(strip_comments "$VIEW")
if printf '%s\n' "$view_code" | grep -q "SafeMarkdown"; then fail "$VIEW must NOT render the answer renderer (SafeMarkdown) — prose belongs to the terminal path only"; else ok "the progressive view imports no answer renderer (no SafeMarkdown)"; fi
leak=""
for bad in "dangerouslySetInnerHTML" ".final" "answer_markdown" ".answer" "e.answer" "evt.answer"; do
  if printf '%s\n' "$view_code" | grep -qF "$bad"; then leak="$leak $bad"; fi
done
[ -z "$leak" ] && ok "the progressive view reads no prose/answer field" || fail "$VIEW reads a forbidden prose/answer field:$leak"

# ── static: the SAFE projection reads no prose/secret field (defence in depth) ─────────────────────────
mirror_code=$(strip_comments "$MIRROR")
mleak=""
for bad in answer_markdown chain_of_thought api_key system_prompt; do
  if printf '%s\n' "$mirror_code" | grep -iqw "$bad"; then mleak="$mleak $bad"; fi
done
# a bare `answer`/`prompt`/`secret` identifier must not be READ either (word-boundary; avoids doc false hits)
printf '%s\n' "$mirror_code" | grep -iqwE 'answer|prompt|secret|password|cookie' && mleak="$mleak prose-word"
[ -z "$mleak" ] && ok "factsFromEvents reads only safe ids/enums/counts/hashes (no prose/secret field)" || fail "$MIRROR reads a forbidden field:$mleak"

# ── static: the chat renders the validated answer ONLY on the terminal path (applyAnswer → SafeMarkdown) ─
grep -q "import { askViaStream }" "$AGENT" || fail "$AGENT must import askViaStream (stream-first send path)"
grep -q "BanzaiProgressView" "$AGENT" || fail "$AGENT must render the progressive view (BanzaiProgressView) while busy"
grep -q "<SafeMarkdown text={m.text}" "$AGENT" || fail "$AGENT must keep rendering the answer via <SafeMarkdown text={m.text}> (terminal path)"
grep -q "const applyAnswer = " "$AGENT" || fail "$AGENT must funnel finished answers through applyAnswer"
# The busy branch renders the progressive view, NOT the answer (no SafeMarkdown inside the progress block).
grep -q "progressActive && progressEvents.length > 0 ? (" "$AGENT" \
  && grep -q "<BanzaiProgressView" "$AGENT" \
  || fail "$AGENT busy branch must render <BanzaiProgressView/> (not the answer) while streaming"
# The validated answer enters the DOM through EXACTLY ONE funnel — applyAnswer (`role: "ai", text: ans.text`).
# There must be exactly one such append, and no place spreads an `outcome.answer` straight into setMsgs.
ai_appends=$(grep -c 'role: "ai", text: ans.text' "$AGENT" || true)
if [ "$ai_appends" = "1" ] && ! grep -qE 'role: "ai", text: outcome' "$AGENT"; then
  ok "the validated answer enters the DOM only via applyAnswer (single terminal-path funnel)"
else
  fail "$AGENT must funnel the validated answer through applyAnswer exactly once (found $ai_appends ans.text appends)"
fi
# applyAnswer is called on the stream terminal AND on the non-stream fallback (so both render identically).
grep -q "applyAnswer(outcome.answer)" "$AGENT" || fail "$AGENT must render the stream terminal via applyAnswer(outcome.answer)"
grep -q "applyAnswer(ans)" "$AGENT" || fail "$AGENT must render the non-stream fallback via applyAnswer(ans)"

# ── static: reacts to response_disposition / boundary_context (never `grounded`) + falls back ───────────
grep -q "terminal.disposition" "$CLIENT" || fail "$CLIENT must react to the terminal response_disposition"
grep -q "boundary_context" "$CLIENT" || fail "$CLIENT must react to the terminal boundary_context"
grep -qE 'REFUSED' "$CLIENT" || fail "$CLIENT must surface a REFUSED disposition as a refusal"
grep -q "fallback: () => banzaiKb(" "$AGENT" || fail "$AGENT must fall back to the non-stream banzaiKb on stream failure"
grep -q "StreamUnavailableError" "$CLIENT" || fail "$CLIENT must signal an unusable stream (→ fallback) via StreamUnavailableError"
[ "$FAILED" -eq 0 ] && ok "the UI reacts to response_disposition/boundary_context and falls back to non-stream on failure"

# ── static: cancel wiring (abort the fetch → server frees the queue slot) ──────────────────────────────
grep -q "abortRef.current?.abort()" "$AGENT" || fail "$AGENT must abort the in-flight stream on cancel (frees the server queue slot)"
grep -q "onCancel={cancelAsk}" "$AGENT" || fail "$AGENT must wire the progressive view's Cancelar control"
[ "$FAILED" -eq 0 ] && ok "cancel aborts the stream fetch (server frees the queue slot)"

# ── behavioural: the frontend mirror EQUALS the Rust-owned contract (drive progressContract.js WASM) ───
node - "$CONTRACT" "$MIRROR" <<'NODE'
const fs = require("fs");
const path = require("path");
(async () => {
  let bad = 0;
  const err = (m) => { console.log("FAIL: " + m); bad = 1; };
  let mod;
  try {
    mod = await import(require("url").pathToFileURL(path.resolve(process.argv[2])).href);
  } catch (e) {
    const code = e && (e.code || "");
    if (String(code) === "ERR_MODULE_NOT_FOUND" || /Cannot find package|Cannot find module|WebAssembly|wasm/i.test(String(e && e.message))) {
      console.log("  ok: mirror-parity behavioural check skipped (committed WASM not loadable in this job) — static checks still apply");
      process.exit(0);
    }
    throw e;
  }
  const src = fs.readFileSync(path.resolve(process.argv[3]), "utf8");
  const arr = (name) => {
    const m = src.match(new RegExp(name + "\\s*=\\s*\\[([^\\]]*)\\]"));
    return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : null;
  };
  const scalar = (name) => {
    const m = src.match(new RegExp(name + "\\s*=\\s*\"([^\"]+)\""));
    return m ? m[1] : null;
  };
  const mapping = (name) => {
    const m = src.match(new RegExp(name + "[^=]*=\\s*\\{([^}]*)\\}"));
    if (!m) return null;
    const out = {};
    for (const kv of m[1].matchAll(/(\w+)\s*:\s*"([^"]+)"/g)) out[kv[1]] = kv[2];
    return out;
  };

  // schema token
  const feSchema = scalar("PROGRESS_SCHEMA_TOKEN");
  if (feSchema !== mod.PROGRESS_SCHEMA_TOKEN) err(`schema token mirror=${feSchema} vs contract=${mod.PROGRESS_SCHEMA_TOKEN}`);

  // event kinds — EXACT ordered equality
  const feKinds = arr("PROGRESS_EVENT_KINDS");
  if (!feKinds) err("could not parse PROGRESS_EVENT_KINDS from the mirror");
  else if (JSON.stringify(feKinds) !== JSON.stringify(mod.PROGRESS_EVENT_KINDS))
    err(`event kinds diverge:\n  mirror=${JSON.stringify(feKinds)}\n  contract=${JSON.stringify(mod.PROGRESS_EVENT_KINDS)}`);

  // terminal kinds — set equality
  const feTerm = (arr("PROGRESS_TERMINAL_KINDS") || []).slice().sort();
  const ctTerm = [...mod.PROGRESS_TERMINAL_KINDS].sort();
  if (JSON.stringify(feTerm) !== JSON.stringify(ctTerm)) err(`terminal kinds diverge: mirror=${feTerm} contract=${ctTerm}`);

  // response dispositions — set equality
  const feDisp = (arr("RESPONSE_DISPOSITIONS") || []).slice().sort();
  const ctDisp = [...mod.RESPONSE_DISPOSITIONS].sort();
  if (JSON.stringify(feDisp) !== JSON.stringify(ctDisp)) err(`response dispositions diverge: mirror=${feDisp} contract=${ctDisp}`);

  // disposition → terminal mapping — key/value equality
  const feMap = mapping("TERMINAL_EVENT_BY_DISPOSITION") || {};
  const ctMap = mod.TERMINAL_EVENT_BY_DISPOSITION;
  for (const k of Object.keys(ctMap)) if (feMap[k] !== ctMap[k]) err(`mapping[${k}] mirror=${feMap[k]} vs contract=${ctMap[k]}`);
  for (const k of Object.keys(feMap)) if (ctMap[k] === undefined) err(`mirror mapping has extra key ${k}`);

  // there is no model-token/delta/partial kind on either side
  for (const k of mod.PROGRESS_EVENT_KINDS) if (/TOKEN|DELTA|PARTIAL/.test(k)) err(`contract carries a forbidden kind ${k}`);

  if (!bad) console.log("  ok: frontend mirror EQUALS the Rust-owned contract (schema + 18 kinds + terminals + dispositions + mapping)");
  process.exit(bad);
})().catch((e) => { console.log("FAIL: " + (e && e.stack || e)); process.exit(1); });
NODE
[ $? -eq 0 ] || FAILED=1

# ── behavioural: the SPR-5 website vitest suites (run when installed; degrade otherwise) ───────────────
echo "-- SPR-5 progressive-ui unit tests --"
if [ -x website/node_modules/.bin/vitest ]; then
  if ( cd website && node_modules/.bin/vitest run lib/banzaiProgress.test.ts lib/banzaiProgressClient.test.ts components/banzai/BanzaiProgress.render.test.tsx >/tmp/spr5-vitest.out 2>&1 ); then
    ok "mirror + client (SSE parse / no-prose-before-terminal / boundary→refusal / fallback / metrics) + view render tests pass"
  else
    tail -40 /tmp/spr5-vitest.out
    fail "SPR-5 progressive-ui unit tests failed"
  fi
else
  ok "vitest not installed here — behavioural tests skipped (run in the local battery; static invariants hold)"
fi

if [ "$FAILED" -ne 0 ]; then
  echo "PROGRESSIVE UI CHECK FAILED ❌"
  exit 1
fi
echo "PROGRESSIVE UI CHECK PASSED ✅"
