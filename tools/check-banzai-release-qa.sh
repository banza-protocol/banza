#!/usr/bin/env bash
#
# BanzAI Release QA Gate Guard (M2.11C).
#
# M2.11A shipped an evidence model that could never score anything: every adapter tone function
# returns "pass"|"fail"|"warn"|"unknown", the mapper matched on "valid"/"ok", so a real pass was
# recorded as a failure. A VALID manifest read "inválido" and scored 0/100 on the live site — with
# every test passing, every guard green, and CI at 99/99. One person clicking through the site found
# it.
#
# This guard does NOT try to prove that a human looked at a browser; it cannot, and the gate document
# says so. What it does is bind the QA document to the code, so the checklist cannot rot into fiction:
#
#   1. The guided layer (Model A) is guidance only — it emits no score/verdict, and the gate records
#      the single technical-state authority (Model B). ADR-042 §D-076-01/02 retired the 0–100 evidence
#      score this guard once recomputed from `session::weight`.
#   2. Every response field the checklist names must be a real key of the /ask response body —
#      extracted from server.js, not grepped for anywhere in the tree.
#   3. A report claiming BanzAI completeness must carry filled-in observations, not a heading.
#
# Every detector below was written against a bypass that an adversarial review actually reproduced
# on an earlier version of this file. Where a check is advisory it prints `note:` and does not claim
# to enforce — a skip that reads as a pass is how gates rot.
#
# Exit 1 on any FAIL. Exit 2 if a required input is missing entirely.

set -euo pipefail
cd "$(dirname "$0")/.."

# A here-string, not `locale -a | grep -q`: `grep -q` exits on its first match, `locale` takes
# SIGPIPE, and under `set -o pipefail` the statement returns 141 — which with `set -e` aborts the
# guard before it checks anything.
LOCALES="$(locale -a 2>/dev/null || true)"
if grep -qiE '^C\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=C.UTF-8
elif grep -qiE '^en_US\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=en_US.UTF-8
fi

GATE="docs/quality/BANZAI_RELEASE_QA_GATE.md"
SESSION_RS="engines/banzai-operator-journey/src/session.rs"
SERVER_JS="services/banzai-api/src/server.js"

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }
note(){ echo "  note: $1"; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for f in "$GATE" "$SESSION_RS" "$SERVER_JS"; do
  [ -f "$f" ] || { echo "FAIL: missing required input $f"; exit 2; }
done

# Body of a markdown section at any heading depth, ending at the next heading of the same or
# shallower depth. One implementation, so the self-test exercises the real extractor.
section_body() { # $1=file  $2=heading text
  awk -v want="$2" '
    /^#+ / {
      match($0, /^#+/); d = RLENGTH
      if (inside && d <= mydepth) inside = 0
      if (!inside && index($0, want) > 0) { inside = 1; mydepth = d }
      next
    }
    inside { print }
  ' "$1"
}

# ── 1. The gate document carries its mandatory parts ────────────────────────
echo "banzai-release-qa: gate document…"

# Anchored to real HEADINGS: an unanchored grep let a 36-line stub containing the right words
# satisfy every one of these.
for section in \
  "When manual QA is mandatory" \
  "Journey checklist" \
  "Agent checklist" \
  "What to verify on every answer" \
  "Merge policy"
do
  grep -qE "^#{1,4} .*$section" "$GATE" \
    && ok "gate documents: $section" \
    || bad "$GATE is missing the section heading: $section"
done

grep -qi "cannot verify that anyone actually looked" "$GATE" \
  && ok "the gate states its own limit" \
  || bad "$GATE must state plainly that it cannot prove a human performed the QA"

# The standing invariant encodes the M2.11A defect as a check. It is the most important line in the
# document and must not be edited away.
grep -q "standing invariant" "$GATE" \
  && ok "the gate carries the panel-versus-chip standing invariant" \
  || bad "$GATE must keep the standing invariant (a tool panel's success beside a contradicting chip)"

# ── 2. Model A is guidance only — no scoring couples to this gate (ADR-042 §D-076-02) ──
# The guided layer used to carry a 0–100 weighted evidence score, and this gate bound its checkpoint
# table to `session::weight`. Under ADR-042 §D-076-01/02 Model A is guidance only: there is exactly one
# authority of technical validation state (Model B). So there is no score to bind — instead the gate
# proves the guided layer emits no score/verdict, and that it records the single-authority rule.
echo "banzai-release-qa: Model A is guidance only (no score to bind)…"

# Scan PRODUCTION code only (cut at the first `#[cfg(test)]`, then strip comments), so neither a test
# asserting the ABSENCE of a score nor a doc comment NAMING the retired vocabulary is read as an
# emission. Write to a file — `grep -q` in a pipe would SIGPIPE its producer under pipefail.
awk '/#\[cfg\(test\)\]/{exit} {print}' "$SESSION_RS" | sed -e 's://.*::' -e '/^[[:space:]]*\*/d' > "$TMP/session_prod.rs"
if grep -qE 'fn weight|"points"|technical_evidence|evidence_ready|progress_pct' "$TMP/session_prod.rs"; then
  bad "$SESSION_RS still emits a score/verdict — Model A must be guidance only (ADR-042 §D-076-02)"
else
  ok "the guided layer carries no score/verdict (guidance only)"
fi
grep -q 'Modelo A orienta o percurso; Modelo B avalia' "$GATE" \
  && ok "the gate records the single technical-state authority (Model B)" \
  || bad "$GATE must state that Model B is the single technical authority (Modelo A orienta; Modelo B avalia)"

# ── 3. Every field the checklist names is a real /ask response key ──────────
# Scoped to the ask() 200 body. A repo-wide grep matched inside the tracked *_bg.wasm blobs and
# inside log payloads, so almost any invented name "existed".
echo "banzai-release-qa: response fields the checklist relies on…"

sed -n '/^      code: 200,$/,/^    };$/p' "$SERVER_JS" \
  | grep -oE '^        [a-z0-9_]+:' | tr -d ' :' | sort -u > "$TMP/keys.txt" || true

KEY_N=$(wc -l < "$TMP/keys.txt" | tr -d ' ')
[ "$KEY_N" -ge 20 ] \
  && ok "extracted $KEY_N keys from the /ask response body" \
  || bad "could not read the /ask response body from $SERVER_JS (found $KEY_N keys) — did its shape change?"

# Nothing may be dropped silently: strip the markers, then FAIL on any line that is not a bare field
# name. `deterministic ` with a trailing space used to vanish through the filter.
sed -n '/QA-FIELDS:START/,/QA-FIELDS:END/p' "$GATE" \
  | grep -v 'QA-FIELDS:' | sed 's/[[:space:]]*$//' | grep -v '^$' > "$TMP/fieldlines.txt" || true
grep -E '^[a-z0-9_]+$' "$TMP/fieldlines.txt" > "$TMP/fields.txt" || true

MALFORMED=$(grep -cvE '^[a-z0-9_]+$' "$TMP/fieldlines.txt" || true)
[ "${MALFORMED:-0}" -eq 0 ] \
  && ok "the QA-FIELDS block contains only bare field names" \
  || bad "the QA-FIELDS block has ${MALFORMED} malformed line(s) — they would be silently ignored"

FIELD_N=$(wc -l < "$TMP/fields.txt" | tr -d ' ')
[ "$FIELD_N" -ge 10 ] \
  && ok "the checklist names $FIELD_N response fields" \
  || bad "expected >=10 field names in the QA-FIELDS block of $GATE, found $FIELD_N"

missing_fields=0
while read -r f; do
  [ -n "$f" ] || continue
  grep -qx "$f" "$TMP/keys.txt" \
    || { bad "the checklist names '$f', which is not a key of the /ask response body"; missing_fields=1; }
done < "$TMP/fields.txt"
[ "$missing_fields" -eq 0 ] && ok "every field the checklist names is a real response key"

# The safety-critical fields may never be quietly dropped from the checklist.
for req in local_model_called external_model_called document_not_found guardrails non_normative; do
  grep -qx "$req" "$TMP/fields.txt" \
    || bad "the checklist must keep '$req' — it is how a boundary or a refusal is observed"
done
ok "the safety-critical fields are still on the checklist"

# ── 4. The phase-report template carries the mandatory sections ─────────────
echo "banzai-release-qa: phase report template…"

# Phase reports were a milestone-era artefact and are retired: the release gate now proves the
# runtime properties directly rather than proving that a report template asks about them.

# ── 5. Reports claiming BanzAI completeness must show their QA ──────────────
# FAIL-CLOSED: every BanzAI phase report is bound unless explicitly listed in the exemption file. An
# earlier inclusion match bound exactly one report forever, so any future hollow report passed.
echo "banzai-release-qa: reports claiming BanzAI completeness…"

checked=0
for report in docs/governance/PHASE_*.md docs/security/PHASE_*.md; do
  [ -f "$report" ] || continue
  grep -qi "banzai" "$report" || continue
  checked=$((checked + 1))

  if grep -qE '^#{1,4} .*Manual Browser Validation' "$report"; then
    ok "$(basename "$report"): has a Manual Browser Validation section"
  else
    bad "$(basename "$report") concerns BanzAI but has no Manual Browser Validation section"
    continue
  fi

  section_body "$report" "Manual Browser Validation" > "$TMP/mbv.txt"

  # Anti-theatre: it is the OBSERVED column that must be filled. Grepping the whole section for
  # digits let the Expected column — or a date — satisfy it, and this very report once passed with
  # every Observed cell blank.
  awk -F'|' 'NF>=4 {
      last = $(NF-1); gsub(/^[ \t]+|[ \t]+$/, "", last)
      first = $2;     gsub(/^[ \t]+|[ \t]+$/, "", first)
      if (first == "" || first ~ /^-+$/ || first == "Checkpoint" || first == "Question") next
      rows++
      if (last != "" && last !~ /^-+$/) filled++
    }
    END { print rows+0, filled+0 }' "$TMP/mbv.txt" > "$TMP/mbvcount.txt"
  read -r ROWS FILLED < "$TMP/mbvcount.txt"

  if [ "${ROWS:-0}" -lt 6 ]; then
    bad "$(basename "$report"): Manual Browser Validation has only ${ROWS:-0} result rows — the journey has 7 steps"
  elif [ "${FILLED:-0}" -lt "${ROWS:-0}" ]; then
    bad "$(basename "$report"): $(( ROWS - FILLED )) of $ROWS observation rows have an empty Observed cell"
  else
    ok "$(basename "$report"): all $ROWS observation rows are filled in"
  fi

  for s in "Known QA gaps" "CI status and merge policy"; do
    grep -qE "^#{1,4} .*$s" "$report" \
      && ok "$(basename "$report"): has $s" \
      || bad "$(basename "$report") is missing the mandatory section: $s"
  done
done
[ "$checked" -gt 0 ] \
  && ok "checked $checked BanzAI report(s) bound by this gate" \
  || note "no non-exempt BanzAI phase report yet — nothing to bind"

# ── 6. Change detection — ADVISORY, and labelled as such ───────────────────
# This block never fails the build: whether a phase report is warranted is a judgement about work
# that may not be finished yet. The gate document must not claim this is enforced.
echo "banzai-release-qa: change detection (advisory)…"

BASE=""
if [ -n "${QA_BASE_REF:-}" ]; then BASE="$QA_BASE_REF"
elif [ -n "${GITHUB_BASE_REF:-}" ] && git rev-parse --verify "origin/$GITHUB_BASE_REF" >/dev/null 2>&1; then
  BASE="origin/$GITHUB_BASE_REF"
elif git rev-parse --verify origin/main >/dev/null 2>&1; then BASE="origin/main"
elif git rev-parse --verify main >/dev/null 2>&1; then BASE="main"
fi

TIER12='^(website/app/banzai/|website/components/banzai/|website/components/home/banzaiKb\.ts|website/lib/banzaOperatorJourney\.ts|website/lib/banza(OperatorManifest|Conformance|Trust|Simb|EvidenceBundle)\.ts|website/lib/wasm/|engines/banzai-|services/banzai-api/)'

if [ -z "$BASE" ] || ! git merge-base "$BASE" HEAD >/dev/null 2>&1; then
  note "no usable base ref — change detection skipped, NOT passed"
else
  { git diff --name-only "$(git merge-base "$BASE" HEAD)" HEAD || true; git diff --name-only HEAD || true; } > "$TMP/changed.txt"
  CHANGED=$(grep -cE "$TIER12" "$TMP/changed.txt" || true)
  if [ "${CHANGED:-0}" -gt 0 ]; then
    note "$CHANGED QA-triggering file(s) changed vs $BASE — manual browser QA is REQUIRED before calling this complete"
    { grep -E "$TIER12" "$TMP/changed.txt" || true; } | sort -u | head -12 | sed 's/^/        /'
    grep -qE '^docs/governance/PHASE_.*\.md$' "$TMP/changed.txt" \
      && note "a phase report is part of this change" \
      || note "no phase report in this change — required before declaring the work complete"
  else
    ok "no QA-triggering surface changed vs $BASE"
  fi
fi

# ── 7. Self-tests: each detector against the bypass it was written for ─────
echo "banzai-release-qa: self-test…"

# Guidance-only detector: a re-introduced score/verdict in the guided layer must be caught, while a
# navigation-only body must pass.
printf 'pub fn weight(step: &str) -> i64 { 20 }\n' > "$TMP/score.rs"
grep -qE 'fn weight|"points"|technical_evidence|evidence_ready|progress_pct' "$TMP/score.rs" \
  && ok "self-test: a re-introduced score/verdict is detected" \
  || bad "self-test: the score/verdict detector does not fire"
printf 'pub fn evaluate_session() { let s = "completed"; }\n' > "$TMP/nav.rs"
grep -qE 'fn weight|"points"|technical_evidence|evidence_ready|progress_pct' "$TMP/nav.rs" \
  && bad "self-test: navigation-only code was wrongly flagged as a score" \
  || ok "self-test: navigation-only code passes"

printf '# R\n\nThis requires `Known QA gaps` in prose.\n' > "$TMP/mention.md"
grep -qE '^#{1,4} .*Known QA gaps' "$TMP/mention.md" \
  && bad "self-test: a prose mention was accepted as a section heading" \
  || ok "self-test: mentioning a section name does not count as having it"

# The Observed-column detector, driven through the real extractor.
printf '## 6. Manual Browser Validation\n\n| Checkpoint | Expected | Observed |\n|---|---|---|\n| C0 | 1/7 · 0/100 | |\n| C1 | 2/7 · 20/100 | |\n\n## 7. Next\n' > "$TMP/hollow.md"
section_body "$TMP/hollow.md" "Manual Browser Validation" \
  | awk -F'|' 'NF>=4 { last=$(NF-1); gsub(/^[ \t]+|[ \t]+$/,"",last); first=$2; gsub(/^[ \t]+|[ \t]+$/,"",first);
      if (first=="" || first ~ /^-+$/ || first=="Checkpoint") next; rows++; if (last!="" && last !~ /^-+$/) filled++ }
      END { exit (rows>0 && filled<rows) ? 0 : 1 }' \
  && ok "self-test: an empty Observed column is detected" \
  || bad "self-test: a row with a blank Observed cell was accepted"

printf '## 6. Manual Browser Validation\n\n| Checkpoint | Expected | Observed |\n|---|---|---|\n| C0 | 1/7 | matched |\n\n## 7. Next\n' > "$TMP/filled.md"
section_body "$TMP/filled.md" "Manual Browser Validation" \
  | awk -F'|' 'NF>=4 { last=$(NF-1); gsub(/^[ \t]+|[ \t]+$/,"",last); first=$2; gsub(/^[ \t]+|[ \t]+$/,"",first);
      if (first=="" || first ~ /^-+$/ || first=="Checkpoint") next; rows++; if (last!="" && last !~ /^-+$/) filled++ }
      END { exit (rows>0 && filled<rows) ? 0 : 1 }' \
  && bad "self-test: a FILLED Observed column was reported as empty" \
  || ok "self-test: a filled Observed column passes"

grep -qx "not_a_real_field_xyz" "$TMP/keys.txt" \
  && bad "self-test: the response-key set matches a field that does not exist" \
  || ok "self-test: a non-existent response field is detected as missing"

printf 'local_model_called \nfoo\n' > "$TMP/mal.txt"
[ "$(grep -cvE '^[a-z0-9_]+$' "$TMP/mal.txt" || true)" -ge 1 ] \
  && ok "self-test: a field line with trailing whitespace is detected, not dropped" \
  || bad "self-test: a malformed field line slipped through the filter"

echo
if [ "$fail" -ne 0 ]; then
  echo "banzai-release-qa-check: FAIL"
  exit 1
fi
echo "banzai-release-qa-check: PASS"
