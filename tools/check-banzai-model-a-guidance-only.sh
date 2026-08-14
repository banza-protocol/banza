#!/usr/bin/env bash
#
# BanzAI Model A Guidance-Only Guard (ADR-036/02, Fase B).
#
# There is exactly one authority of technical validation state, and it is Model B (the deterministic
# nine-step endpoint-originated journey, services/banzai-api/src/validate.js). Model A — the guided
# operator-orientation layer (engines/banzai-operator-journey + services/banzai-api/src/journey.js) — is
# guidance only. It orients the percurso; it never evaluates. Regra:
#
#   Modelo A orienta o percurso; Modelo B avalia — existe uma única autoridade de estado técnico.
#
# This guard asserts, on the Model A source and by DRIVING the committed engine:
#   1. the per-activity status vocabulary is navigation only (not_started|available|in_progress|
#      completed) — no verdict status (`valid`, `evidence_ready`) survives;
#   2. no score/points/quality computation is emitted (no `points`, `weight`, `technical_evidence`,
#      `progress_pct`, `score`);
#   3. Model A carries technical information ONLY as a typed reference to Model B
#      (validation_execution_id / step_id / receipt_reference / evidence_reference), never a recomputed
#      verdict, and a referenced Model B FAILED/BLOCKED never renders as a positive here;
#   4. the authority rule is documented in the source.
#
# Self-testing: exits 2 if its own detectors regress; 1 on a real finding; 0 clean.

set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"

if locale -a 2>/dev/null | grep -qiE '^C\.UTF-?8$'; then export LC_ALL=C.UTF-8
elif locale -a 2>/dev/null | grep -qiE '^en_US\.UTF-?8$'; then export LC_ALL=en_US.UTF-8
fi

SESSION_RS="engines/banzai-operator-journey/src/session.rs"
LIB_RS="engines/banzai-operator-journey/src/lib.rs"
JOURNEY_JS="services/banzai-api/src/journey.js"
NODE_WASM="services/banzai-api/src/journeywasm/banzai_operator_journey.js"

FAILED=0
ok()   { echo "  ok: $*"; }
fail() { echo "  FAIL: $*"; FAILED=1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for f in "$SESSION_RS" "$LIB_RS" "$JOURNEY_JS" "$NODE_WASM"; do
  [ -f "$f" ] || { echo "FAIL: missing required input $f"; exit 2; }
done

# Strip comments (line + block + doc) so prose that NAMES a forbidden token — e.g. "never emits a
# score" — is never read as the token itself. The stripped code goes to a file, not a pipe.
strip_code() { sed -e 's://.*::' -e '/^[[:space:]]*\*/d' -e 's:/\*.*\*/::' "$1"; }

# PRODUCTION code only: for a Rust source, cut at the first `#[cfg(test)]` so a test that ASSERTS the
# absence of a verdict/score (e.g. `assert!(!blob.contains("evidence_ready"))`) is not read as an
# emission. Then strip comments. For non-Rust sources, the whole file (minus comments).
production_code() { # $1 = file
  case "$1" in
    *.rs) awk '/#\[cfg\(test\)\]/ { exit } { print }' "$1" ;;
    *) cat "$1" ;;
  esac | sed -e 's://.*::' -e '/^[[:space:]]*\*/d' -e 's:/\*.*\*/::'
}

# A forbidden token in Model A CODE: a retired verdict status, or any score/points/quality computation.
# `is_technical_score` (a NEGATION label declaring the absence of a score) is intentionally allowed —
# `\bscore\b` does not match `_score`, and the explicit patterns below never match it.
forbidden_token() { # reads code on stdin ; 0 if a verdict/score token is present
  grep -nE '"evidence_ready"|'\''evidence_ready'\''|"valid"|'\''valid'\''|\bpoints\b|technical_evidence|progress_pct|\bweight\b|evidence_points|\bscore\b'
}

selftest() {
  printf 'let x = "evidence_ready";\n' | forbidden_token >/dev/null \
    || { echo "SELFTEST FAIL: verdict detector missed evidence_ready"; exit 2; }
  printf 'let s = "valid";\n' | forbidden_token >/dev/null \
    || { echo "SELFTEST FAIL: verdict detector missed a valid status"; exit 2; }
  printf 'evidence_points += weight(step);\n' | forbidden_token >/dev/null \
    || { echo "SELFTEST FAIL: score detector missed points/weight"; exit 2; }
  # A negation label and a typed reference id must NOT be flagged.
  printf '"is_technical_score": false,\n' | forbidden_token >/dev/null \
    && { echo "SELFTEST FAIL: false positive on is_technical_score negation label"; exit 2; }
  printf '"validation_execution_id": id,\n' | forbidden_token >/dev/null \
    && { echo "SELFTEST FAIL: false positive on validation_execution_id (contains 'valid')"; exit 2; }
  # Prose naming a token must not trip it, once comments are stripped.
  printf '// this layer never emits evidence_ready or a score\nlet x = 1;\n' | strip_code /dev/stdin | forbidden_token >/dev/null \
    && { echo "SELFTEST FAIL: prose about a forbidden token was read as the token"; exit 2; }
  echo "  selftest ok"
}
selftest

echo "== banzai-model-a-guidance-only (ADR-036/02) =="

# ── 1. No verdict status / score in Model A PRODUCTION source ────────────────
for f in "$SESSION_RS" "$LIB_RS" "$JOURNEY_JS"; do
  production_code "$f" > "$TMP/code"
  if forbidden_token < "$TMP/code" > "$TMP/hits"; then
    fail "$f emits a verdict status or a score — Model A is guidance only (ADR-036):"
    sed 's/^/        /' "$TMP/hits"
  else
    ok "$(basename "$f") carries no verdict status and no score"
  fi
done

# ── 2. The navigation status vocabulary is exactly the four navigation states ──
if grep -qE 'pub const STATUSES: &\[&str\] = &\["not_started", "available", "in_progress", "completed"\]' "$SESSION_RS"; then
  ok "the status vocabulary is navigation only (not_started|available|in_progress|completed)"
else
  fail "$SESSION_RS must define STATUSES as the four navigation states only"
fi

# ── 3. Technical information is carried ONLY as a typed reference to Model B ──
missing_ref=0
for field in validation_execution_id step_id receipt_reference evidence_reference; do
  grep -q "$field" "$SESSION_RS" || { fail "$SESSION_RS must carry the typed Model B reference field '$field'"; missing_ref=1; }
done
[ "$missing_ref" -eq 0 ] && ok "Model A references Model B by typed id (execution/step/receipt/evidence)"
grep -q '"authority": "model-b"' "$SESSION_RS" \
  && ok "each reference declares Model B as the technical authority" \
  || fail "$SESSION_RS must mark the typed reference with authority = model-b"

# ── 4. The authority rule is documented in the source ───────────────────────
grep -q 'Modelo A orienta o percurso; Modelo B avalia' "$SESSION_RS" \
  && ok "the authority rule is recorded (Modelo A orienta; Modelo B avalia)" \
  || fail "$SESSION_RS must record the rule: Modelo A orienta o percurso; Modelo B avalia — uma única autoridade de estado técnico"

# ── 5. Drive the committed engine: the OUTPUT is navigation only ─────────────
echo "banzai-model-a-guidance-only: driving the committed engine…"
node - "$NODE_WASM" <<'NODE' || FAILED=1
const j = require(require('node:path').resolve(process.argv[2]));
let bad = 0;
const check = (l, c, d) => { if (c) console.log(`  ok: ${l}`); else { console.log(`  FAIL: ${l}${d ? " — " + d : ""}`); bad = 1; } };

// The published status vocabulary is exactly the four navigation states.
const vocab = JSON.parse(j.journey_vocabulary_json());
const NAV = ["not_started","available","in_progress","completed"];
check("the engine publishes exactly the four navigation statuses",
  JSON.stringify(vocab.statuses) === JSON.stringify(NAV), JSON.stringify(vocab.statuses));
check("the engine publishes no blocker/evidence verdict vocabulary",
  !("blocker_reasons" in vocab) && !("evidence_items" in vocab));

// A session output carries no verdict and no score, whatever the input.
const out = j.journey_session_json(JSON.stringify({
  current_step: "manifest",
  steps: { guia: { visited: true }, manifest: { visited: true, technical_reference: {
    validation_execution_id: "exec-1", step_id: "manifest", receipt_reference: "receipt:1",
    evidence_reference: "evidence:1", model_b_state: "FAILED" } } }
}));
check("the session output emits no verdict/score token",
  !/evidence_ready|"points"|technical_evidence|progress_pct/.test(out), out.slice(0, 120));

// The typed reference is surfaced verbatim, and a FAILED reference is NEVER a positive navigation state.
const parsed = JSON.parse(out);
const m = parsed.steps.find((s) => s.step === "manifest");
check("the typed Model B reference is surfaced", m.technical_reference &&
  m.technical_reference.validation_execution_id === "exec-1" && m.technical_reference.authority === "model-b");
check("a FAILED Model B reference never becomes a positive navigation state",
  NAV.includes(m.status) && !["valid","evidence_ready","verified"].includes(m.status), m.status);

// An unvisited activity carrying a FAILED reference stays available/not_started (never lifted).
const out2 = JSON.parse(j.journey_session_json(JSON.stringify({
  current_step: "guia",
  steps: { manifest: { visited: false, technical_reference: { validation_execution_id: "x", model_b_state: "FAILED" } } }
})));
const m2 = out2.steps.find((s) => s.step === "manifest");
check("a FAILED reference on an unvisited activity is not a positive",
  m2.status === "available" || m2.status === "not_started", m2.status);

process.exit(bad);
NODE

echo
if [ "$FAILED" -eq 0 ]; then echo "BANZAI MODEL A GUIDANCE-ONLY CHECK PASSED"; else echo "BANZAI MODEL A GUIDANCE-ONLY CHECK FAILED"; fi
exit "$FAILED"
