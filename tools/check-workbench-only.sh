#!/usr/bin/env bash
#
# BANZA Workbench-Only Operator-Path Guard (M2.5 addendum).
#
# For operators, the single public verification path is the BanzAI Workbench. Operators must NOT be told
# to install Python, run Docker, configure GitHub Actions, drive an external CLI, or pull a published
# container in order to check protocol compatibility. The canonical public flow is:
#   Abrir BanzAI Workbench → Manifest → Conformidade → Trust → Federação → Evidence Bundle → Traces.
#
# This guard scans the PUBLIC-RENDERED surfaces (website app/components/lib/public + published reference
# docs + top-level README/SECURITY) for any of those external runners presented as an OPERATOR method.
#
# Internal CI, dev scripts and Rust tests for protocol MAINTAINERS are legitimate and stay — they are
# cleared when the line carries an explicit maintainer/internal marker, or when a boundary negation says
# the tool is NOT needed ("Não é necessário instalar Python, correr Docker ou configurar GitHub Actions").
# The repo's own CI (.github/workflows) and historical phase reports (docs/governance/PHASE_*) are out of
# scope by surface selection, and excluded belt-and-suspenders below.
#
# This guard is a best-effort TEXT LINTER — defence in depth, not the authority.
#
# Exit 1 on any NEEDS_FIX. Exit 2 if the guard's own self-test fails.

set -euo pipefail
cd "$(dirname "$0")/.."

SURFACES=(
  website/app
  website/components
  website/lib
  website/public
  docs/reference
  README.md
  SECURITY.md
)

# ── Clause-scoped allowlist ───────────────────────────────────────────────────
# A hit clears when a negation sits immediately before the term (the Workbench copy says the runner is
# NOT needed), or when the line carries an explicit maintainer/internal marker. Use the literal UTF-8
# "não" (a bracket never matches the multibyte char under BSD grep).
NEG_BEFORE='não|nao|nunca|never|\bnot\b|\bsem\b|without|dispensa|no need|not needed|não é necessário|nao e necessario|não precisa|nao precisa'
MAINTAINER_MARK='maintainer|manutentor|manutentores|internal tooling|internal only|internal/maintainer|uso interno|apenas interno|para manutenção|para manutencao|dev-only|dev script|protocol maintainers'
# Transparency mention (not a runnable command): banza-conformance named as a repo PATH or a TOOL/engine
# NAME. A backtick span with NO space (a path like `tools/banza-conformance/` or `engines/banza-conformance`,
# or the bare name `banza-conformance`) or the JSON field "banza-conformance" is a reference, not an
# invocation. A runnable command always carries a space (`pip install banza-conformance`,
# `banza-conformance --url`, `banza-conformance run …`, `banza-conformance \`), so it never matches here and
# stays blocked by the space-bearing METHODS patterns.
TOOLNAME_MENTION='`[a-z0-9_./-]*banza-conformance[a-z0-9_./-]*`|"banza-conformance"'
# FAQ question: a line that only NAMES the runners to answer "Não/No" — a bold question ("**Preciso de …",
# "**Do I need to …") or any line ending in "?". The negative answer sits in the following prose.
FAQ_QUESTION=':[0-9]+:[[:space:]]*\*\*(preciso de|do i need to)|\?\**[[:space:]]*$'

# Drop the hits a clause-scoped marker exculpates. $1 = the pattern that produced the hits.
filter_hits() {
  local pat="$1"
  grep -viE "($NEG_BEFORE)[^.!?]{0,90}($pat)" \
    | grep -viE "$MAINTAINER_MARK" \
    | grep -viE "$TOOLNAME_MENTION" \
    | grep -viE "$FAQ_QUESTION" || true
}

# Common exclusions: test files, banzai-agent.ts, phase reports, and the repo's own CI.
GREP_EXCL=(--exclude='*.test.ts' --exclude='*.test.tsx' --exclude='*.spec.ts' --exclude='banzai-agent.ts' --exclude='PHASE_*.md' --exclude-dir='.github')

# ── External runners presented as an OPERATOR method ───────────────────────────
# Broad on purpose: real residues MAY still be flagged while parallel cleanup lands — what this guard
# pins is its own self-test, below.
METHODS=(
  'pip install'
  'python3 -m pip'
  'docker pull ghcr.io/banza-protocol/banza-conformance'
  'docker pull'
  'docker run'
  'github action'
  'workflow_dispatch'
  'actions/upload-artifact'
  'banza-conformance/1\.0'
  '\btestpypi\b'
  '\bpypi\b'
  '(user-agent|waf|proxy)[^.]{0,40}(runner|conformance|banza-conformance|external)'
  '(m[ée]todo recomendado|recomendad[oa]s?)[^.]{0,45}(\bcli\b|docker|github action|workflow_dispatch|banza-conformance|pip)'
  '\bcli\b[^.]{0,35}(docker|github action|banza-conformance|conformance|pip install)'
  '`[^`]*banza-conformance[^`]*`'
  'banza-conformance (check|run|report|check-vectors|run-live|run-fed)'
)

fail=0

# ── Self-test: exercise the real detection on every run. scan_line runs a probe through EVERY pattern
#    exactly as the main loop does, so broken logic exits 2 rather than passing silently. ──
st_fail=0
scan_line() { # <line> → echoes any reportable hit across ALL patterns; always exits 0
  local line="$1" pat
  for pat in "${METHODS[@]}"; do
    printf '%s\n' "$line" | grep -iE "$pat" | filter_hits "$pat" || true
  done
  return 0
}
report_all() { # <label> <line>
  local out; out="$(scan_line "$2")"
  if [ -z "$out" ]; then echo "SELFTEST_FAIL not reported: $1"; st_fail=1; fi
}
allow_all() { # <label> <line>
  local out; out="$(scan_line "$2")"
  if [ -n "$out" ]; then echo "SELFTEST_FAIL wrongly reported: $1"; st_fail=1; fi
}

# MUST report — an external runner offered to operators.
report_all "reference line: pip install"        'docs/reference/getting-started.md:12:Corra pip install banza-conformance para checar compatibilidade.'
report_all "reference line: docker pull"        'docs/reference/getting-started.md:20:docker pull ghcr.io/banza-protocol/banza-conformance'
report_all "GitHub Action as operator method"   'docs/reference/conformance.md:8:O método é uma GitHub Action que corre a conformidade e sobe o artefacto.'
report_all "Chat: método recomendado: CLI"      'website/components/banzai/BanzaiChat.tsx:44:      answer: "método recomendado: CLI para conformidade.",'

# MUST allow — the Workbench-only copy, and a line marked maintainer/internal.
allow_all  "Workbench-only canonical copy"      'docs/reference/getting-started.md:5:Para validar compatibilidade protocolar, use o BanzAI Workbench. Não é necessário instalar Python, correr Docker ou configurar GitHub Actions.'
allow_all  "line marked maintainer/internal"    'docs/reference/conformance.md:60:Para manutentores: docker pull ghcr.io/banza-protocol/banza-conformance (maintainer/internal tooling).'
# MUST allow — transparency PATH/TOOL-NAME mentions of banza-conformance (M2.5 rule 1).
allow_all  "backtick bare tool name"            'docs/reference/pt/completa.md:9:| Verificação | executor `banza-conformance`, evidência reproduzível |'
allow_all  "backtick repo path"                 'docs/reference/getting-started.md:9:Use the conformance runner in `tools/banza-conformance/` to verify your implementation:'
allow_all  "backtick engines path"              'website/lib/banzaConformance.ts:9:// built from `engines/banza-conformance` with wasm-pack.'
allow_all  "backtick path with filename"        'docs/reference/conformance.md:9:See `tools/banza-conformance/README.md` for full options.'
allow_all  "JSON tool field"                     'conformance/vectors/x.json:9:  "tool": "banza-conformance",'
# MUST allow — an interrogative FAQ question whose answer below is negative (M2.5 rule 2).
allow_all  "FAQ bold question (PT)"             'docs/reference/pt/completa.md:9:**Preciso de instalar Python, correr Docker ou configurar GitHub Actions?**'
allow_all  "FAQ bold question (EN)"             'docs/reference/en/complete.md:9:**Do I need to install Python, run Docker or configure GitHub Actions?**'
# MUST still report — an actual runnable command, even when it names banza-conformance in backticks. A
# command carries a space, so TOOLNAME_MENTION never clears it.
report_all "backtick runnable: pip install"     'docs/reference/getting-started.md:9:First run `pip install banza-conformance` to install.'
report_all "backtick runnable: docker pull"     'docs/reference/getting-started.md:9:`docker pull ghcr.io/banza-protocol/banza-conformance`'
report_all "backtick runnable: --url flag"      'docs/reference/getting-started.md:9:Run `banza-conformance --url https://x` to check.'
report_all "backtick runnable: subcommand"      'docs/reference/getting-started.md:9:Run `banza-conformance run --url https://x`.'

[ "$st_fail" -eq 0 ] || { echo "workbench-only: guard self-test FAILED"; exit 2; }

# ── Hard block: external runner as an operator method ──
for pat in "${METHODS[@]}"; do
  hits="$(grep -rniEI "${GREP_EXCL[@]}" "$pat" "${SURFACES[@]}" 2>/dev/null | filter_hits "$pat" || true)"
  if [ -n "$hits" ]; then
    echo "NEEDS_FIX  external runner matching /$pat/ presented as an operator method — the operator path is the BanzAI Workbench (Manifest → Conformidade → Trust → Federação → Evidence Bundle → Traces). Mark maintainer/internal tooling if that is what it is:"
    echo "$hits" | sed 's/^/    /'
    fail=1
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "workbench-only: ✓ no external runner (pip/docker/CLI/GitHub-Action) offered as an operator method on public surfaces."
fi
exit "$fail"
