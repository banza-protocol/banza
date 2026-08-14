#!/usr/bin/env bash
#
# BanzAI Rust↔UI Vocabulary Contract Guard (M2.11D).
#
# Twice a shipped defect was the same shape: TypeScript and Rust disagreeing about a WORD, with both
# sides self-consistent so every test passed.
#
#   M2.11B  every adapter tone function returns "pass"|"fail"|"warn"|"unknown"; the mapper matched
#           "valid"/"ok". A VALID manifest scored 0/100 and read "inválido" on the live site.
#   M2.11D  the UI compared `nextActionSlug === "journey_complete"`; the engine emits
#           `jornada_completa`. At 100/100 the completion styling was unreachable.
#
# Rust owns these words (ADR-038), so Rust publishes them — `session::vocabulary()`, exported as
# `journey_vocabulary_json()`. This guard EXECUTES the engine to get the list (never greps Rust for
# it) and then proves two directions against the TypeScript that renders them:
#
#   (a) every value Rust can emit has a UI representation      → no silent fallback
#   (b) every value TypeScript compares, Rust can emit          → no dead branch
#
# Direction (b) is the one that catches QA-1, and the one a "does every case exist?" test cannot.
#
# The mechanical rule that separates a legitimate default from a dead branch:
#   * a branch whose guard names a LITERAL makes a claim about what the engine emits → membership-
#     checked against the vocabulary, and FAILS if the engine cannot emit it;
#   * a branch with NO literal (`??`, `default:`) makes no claim about any value → legitimate, and
#     already proven unreachable-for-known-values by direction (a).
#
# Exit 1 on any FAIL. Exit 2 if the engine cannot be driven.

set -euo pipefail
cd "$(dirname "$0")/.."

LOCALES="$(locale -a 2>/dev/null || true)"
if grep -qiE '^C\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=C.UTF-8
elif grep -qiE '^en_US\.UTF-?8$' <<<"$LOCALES"; then export LC_ALL=en_US.UTF-8
fi

WASM="services/banzai-api/src/journeywasm/banzai_operator_journey.js"
WRAPPER="website/lib/banzaOperatorJourney.ts"
AGENT="website/components/banzai/BanzaiAgent.tsx"
WASM_RS="engines/banzai-operator-journey/src/wasm.rs"
# M2.19EF2 — completion is now derived from the Rust step verdicts in the validation session.
VALJOURNEY="website/components/banzai/validationJourney.tsx"
RECEIPT="website/lib/operationReceipt.ts"

fail=0
ok()  { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; fail=1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for f in "$WASM" "$WRAPPER" "$AGENT" "$WASM_RS" "$VALJOURNEY" "$RECEIPT"; do
  [ -f "$f" ] || { echo "FAIL: missing required input $f"; exit 2; }
done

# ── 0. The vendored artifact is current ────────────────────────────────────
# Load-bearing: every check below reads the ENGINE, so a stale vendored bundle would silently
# validate the UI against last week's vocabulary. This check failed for real when the contract was
# first written — `journey_vocabulary_json` existed in Rust and in neither vendored bundle.
echo "banzai-vocabulary-contract: vendored artifact freshness…"

grep -A2 '#\[wasm_bindgen\]' "$WASM_RS" | grep -oE 'pub fn [a-z0-9_]+' | sed 's/pub fn //' | sort -u > "$TMP/rust_exports.txt" || true
RUST_N=$(wc -l < "$TMP/rust_exports.txt" | tr -d ' ')
[ "$RUST_N" -ge 8 ] \
  && ok "the engine declares $RUST_N WASM exports" \
  || bad "could not read the WASM exports from $WASM_RS (found $RUST_N)"

missing_export=0
while read -r fn; do
  [ -n "$fn" ] || continue
  for vendored in "$WASM" "website/lib/wasm/banzai_operator_journey.js"; do
    [ -f "$vendored" ] || continue
    grep -q "\b$fn\b" "$vendored" \
      || { bad "$vendored is stale — it does not export '$fn'. Rebuild and re-vendor the WASM."; missing_export=1; }
  done
done < "$TMP/rust_exports.txt"
[ "$missing_export" -eq 0 ] && ok "both vendored bundles export every engine function"

# ── 1. Get the vocabulary by EXECUTING the engine ──────────────────────────
echo "banzai-vocabulary-contract: reading the published vocabulary…"

node -e '
  const j = require(require("node:path").resolve(process.argv[1]));
  process.stdout.write(j.journey_vocabulary_json());
' "$WASM" > "$TMP/vocab.json" 2>"$TMP/vocab.err" || {
  echo "FAIL: could not drive the engine: $(cat "$TMP/vocab.err")"; exit 2; }

vocab() { # $1 = key → one value per line
  node -e '
    const v = require("node:fs").readFileSync(process.argv[1], "utf8");
    const o = JSON.parse(v);
    process.stdout.write((o[process.argv[2]] || []).join("\n") + "\n");
  ' "$TMP/vocab.json" "$1"
}

for key in steps statuses actions overall_states model_b_states reference_fields; do
  vocab "$key" | grep -v '^$' > "$TMP/v_$key.txt" || true
  n=$(wc -l < "$TMP/v_$key.txt" | tr -d ' ')
  [ "$n" -gt 0 ] \
    && ok "published $key: $n value(s)" \
    || bad "the engine publishes no '$key' — vocabulary() is incomplete"
done

# Extract the literal keys of a TS label map / switch, comments stripped.
ts_literals() { # $1=file  $2=start marker (function signature fragment)
  awk -v start="$2" '
    index($0, start) > 0 { inside = 1 }
    inside {
      line = $0
      sub(/\/\/.*/, "", line)                 # a trailing // comment can name slugs — strip it
      print line
      if (line ~ /^\}/ && seen) { exit }
      if (line ~ /\{/) seen = 1
    }
  ' "$1" | grep -oE '(^|[[:space:]"])[a-z0-9_]+:|case "[a-z0-9_]+":|=== "[a-z0-9_]+"|"[a-z0-9_]+":' \
    | grep -oE '[a-z0-9_]+' | sort -u
}

# ── 2. (a) every published value has a UI representation ───────────────────
echo "banzai-vocabulary-contract: (a) every engine value is represented…"

check_covered() { # $1=vocab key  $2=ts file  $3=function marker  $4=label
  ts_literals "$2" "$3" > "$TMP/ts.txt" || true
  local miss=0
  while read -r v; do
    [ -n "$v" ] || continue
    grep -qx "$v" "$TMP/ts.txt" || { bad "$4 has no case for the engine value '$v'"; miss=1; }
  done < "$TMP/v_$1.txt"
  [ "$miss" -eq 0 ] && ok "$4 covers every published $1"
}

# ADR-036 — the guided layer is navigation only, so there is no blocker/evidence verdict
# vocabulary to cover. It publishes navigation actions and overall states (and, informationally, the
# Model B states it may REFERENCE and the typed reference fields).
check_covered actions          "$WRAPPER" "export function nextActionLabel"   "nextActionLabel"
check_covered overall_states   "$WRAPPER" "export function overallStateLabel" "overallStateLabel"

# ── 3. (b) every literal TypeScript compares, the engine can emit ──────────
# THE QA-1 CHECK. A literal is a claim; the vocabulary is the falsifier.
echo "banzai-vocabulary-contract: (b) no branch compares a value the engine cannot emit…"

check_no_dead() { # $1=ts file  $2=marker  $3=label  $4..=vocab keys the map legitimately spans
  local file="$1" marker="$2" label="$3"; shift 3
  cat "$@" > "$TMP/allowed.txt"
  ts_literals "$file" "$marker" > "$TMP/ts.txt" || true
  local dead=0
  while read -r lit; do
    [ -n "$lit" ] || continue
    grep -qx "$lit" "$TMP/allowed.txt" \
      || { bad "$label compares '$lit', which the engine never emits — dead branch"; dead=1; }
  done < "$TMP/ts.txt"
  [ "$dead" -eq 0 ] && ok "$label compares only values the engine can emit"
}

# The legacy action vocabulary is emitted by `legacy_action` for /ask, so nextActionLabel legitimately
# spans both. It is listed explicitly rather than exempted by silence.
printf 'start_manifest\nfix_manifest\nrun_conformance\nevaluate_trust\nsimulate_federation\ngenerate_evidence_bundle\nreview_traces\njourney_complete\n' > "$TMP/v_legacy_actions.txt"

check_no_dead "$WRAPPER" "export function overallStateLabel" "overallStateLabel" "$TMP/v_overall_states.txt"
check_no_dead "$WRAPPER" "export function nextActionLabel" "nextActionLabel" "$TMP/v_actions.txt"

# ── 4. The component must not compare journey slugs at all ─────────────────
# The strongest form of (b): after M2.11D the component renders the terminal state from a BOOLEAN the
# engine decides. Any slug comparison here is a re-derivation of something Rust already decided.
echo "banzai-vocabulary-contract: the component re-derives no engine decision…"

sed -e 's://.*::' -e '/^[[:space:]]*\*/d' "$AGENT" > "$TMP/agent.code"

for slug in journey_complete jornada_completa comecar_pelo_manifest executar_conformidade avaliar_trust \
            simular_federacao gerar_evidence_bundle gerar_relatorio relatorio_pronto evidencia_parcial; do
  if grep -qE "(===|!==)[[:space:]]*\"$slug\"" "$TMP/agent.code"; then
    bad "$AGENT compares the engine slug \"$slug\" — render the engine's own decision instead"
  fi
done
grep -qE '(===|!==)[[:space:]]*"jornada_completa"|(===|!==)[[:space:]]*"journey_complete"' "$TMP/agent.code" \
  && bad "$AGENT still decides completion by comparing a slug" \
  || ok "the component compares no journey slug"

# M2.19G.1 (ADR-034) — completion/aggregate status is DERIVED from the Rust-produced step verdicts, never
# decided by comparing a UI slug. In the endpoint-originated model the aggregation moved SERVER-SIDE: the
# Rust backend computes the JourneyReceipt's overall_status + certification, and the validation session
# MIRRORS that (overall = journeyReceipt.overall_status; certification from the receipt). operationReceipt.ts
# still exports the aggregateStatus helper. Rust decides the word; the UI mirrors it — the invariant holds.
grep -q 'export function aggregateStatus' "$RECEIPT" \
  && ok "operationReceipt.ts derives the aggregate from the step verdicts (aggregateStatus)" \
  || bad "$RECEIPT must derive completion via aggregateStatus over the Rust step verdicts"
grep -q 'journeyReceipt.overall_status' "$VALJOURNEY" \
  && ok "the validation session mirrors the Rust-decided overall status (journeyReceipt.overall_status), not a UI slug" \
  || bad "$VALJOURNEY must derive completion from the Rust step verdicts (journeyReceipt.overall_status), not a UI slug"
grep -q 'journeyReceipt.certification_readiness' "$VALJOURNEY" && grep -q 'certificationStatus' "$VALJOURNEY" \
  && ok "the session carries the Rust-decided certification (readiness from the receipt + NOT_CERTIFIED status)" \
  || bad "$VALJOURNEY must record the Rust-decided certification (journeyReceipt.certification_readiness + certificationStatus)"

# ── 5. Self-test: the detectors must actually detect ───────────────────────
echo "banzai-vocabulary-contract: self-test…"

cat > "$TMP/fixture.ts" <<'TS'
export function nextActionLabel(action: string): string {
  const m: Record<string, string> = {
    comecar_pelo_manifest: "Começar",
    journey_complete: "Completa",
  };
  return m[action] ?? "Continuar";
}
TS
ts_literals "$TMP/fixture.ts" "export function nextActionLabel" > "$TMP/f.txt"
grep -qx "journey_complete" "$TMP/f.txt" \
  && ok "self-test: the extractor sees a map literal" \
  || bad "self-test: the extractor missed a map literal"
grep -qx "comecar_pelo_manifest" "$TMP/f.txt" \
  && ok "self-test: the extractor sees every key, not just the first" \
  || bad "self-test: the extractor stopped after one key"

# A literal the engine cannot emit must be flagged.
if grep -qx "journey_complete" "$TMP/v_actions.txt"; then
  bad "self-test: 'journey_complete' appears in the engine's own action vocabulary — the QA-1 premise is wrong"
else
  ok "self-test: the engine does not emit 'journey_complete' (the QA-1 dead literal)"
fi

# A comment naming a slug must NOT be read as a comparison.
printf 'const x = 1; // compares === "jornada_completa" historically\n' > "$TMP/c.tsx"
sed -e 's://.*::' "$TMP/c.tsx" > "$TMP/c.code"
grep -qE '(===|!==)[[:space:]]*"jornada_completa"' "$TMP/c.code" \
  && bad "self-test: a comment was read as a comparison" \
  || ok "self-test: prose about a slug is not a comparison"

echo
if [ "$fail" -ne 0 ]; then
  echo "banzai-vocabulary-contract-check: FAIL"
  exit 1
fi
echo "banzai-vocabulary-contract-check: PASS"
