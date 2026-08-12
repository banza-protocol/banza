#!/usr/bin/env bash
# Git authorship identity guard (M2.19G.6B) — prevents erroneous Claude/Anthropic attribution from
# re-entering BANZA. It inspects ONLY the commit METADATA and authorship TRAILERS of the NEW commits a
# PR introduces (merge-base(base,HEAD)..HEAD) — never file content. So `CLAUDE.md`, docs that mention
# Claude, prompts, reports and code are NOT flagged; only a commit AUTHORED/COMMITTED as Claude/Anthropic,
# or a `Co-authored-by:`/`Signed-off-by:` trailer attributing the commit to Claude/Anthropic, fails.
#
# Fail-closed: if the PR commit range cannot be determined, the guard errors (exit 2) rather than passing.
#
# Base resolution (first match): $GIT_AUTHORSHIP_BASE → origin/$GITHUB_BASE_REF (CI PR) → $1 → "main".
# Usage:  bash tools/check-git-authorship-identity.sh [base-ref]
#         bash tools/check-git-authorship-identity.sh --self-test
set -uo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── Legitimate technical COMMITTER identities (never valid as authors of substantive work). ──────────
# GitHub's web merge identity + common bots. Claude/Anthropic are NEVER allowlisted.
is_allowlisted_committer() { # $1=name $2=email
  case "$1" in
    GitHub|web-flow|"github-actions[bot]"|"dependabot[bot]") return 0 ;;
  esac
  case "$2" in
    noreply@github.com|*@users.noreply.github.com|*actions@github.com|41898282+github-actions*) return 0 ;;
  esac
  return 1
}

# Print a reason and return 1 if the (name,email,role) is a forbidden Claude/Anthropic identity; else 0.
identity_violation() { # $1=name $2=email $3=role(author|committer)
  local name="$1" email="$2" role="$3"
  local ln le; ln="$(printf '%s' "$name" | tr '[:upper:]' '[:lower:]')"; le="$(printf '%s' "$email" | tr '[:upper:]' '[:lower:]')"
  if [ "$role" = "committer" ] && is_allowlisted_committer "$name" "$email"; then return 0; fi
  case "$ln" in *claude*|*anthropic*) echo "$role name = '$name'"; return 1 ;; esac
  case "$le" in *claude*|*anthropic*) echo "$role email = '$email'"; return 1 ;; esac
  return 0
}

# Print the offending trailer line and return 1 if an authorship trailer attributes to Claude/Anthropic.
trailer_violation() { # $1=commit body
  local hit
  hit="$(printf '%s\n' "$1" \
    | grep -iE '^[[:space:]]*(co-authored-by|signed-off-by|on-behalf-of|co-committed-by)[[:space:]]*:' \
    | grep -iE 'claude|anthropic' | head -1)"
  [ -n "$hit" ] && { echo "authorship trailer: $(printf '%s' "$hit" | sed 's/^[[:space:]]*//')"; return 1; }
  return 0
}

# ── Self-test (§10) — pure functions, no repo writes. Runs every invocation + via --self-test. ──────
self_test() {
  local fails=0
  # identity_violation / trailer_violation return 0 = OK, non-zero = violation.
  expect_ok()   { local rc; identity_violation "$1" "$2" "$3" >/dev/null; rc=$?; [ $rc -eq 0 ] || { echo "SELF-TEST BROKEN: expected OK: $3 '$1' <$2>" >&2; fails=1; }; }
  expect_bad()  { local rc; identity_violation "$1" "$2" "$3" >/dev/null; rc=$?; [ $rc -ne 0 ] || { echo "SELF-TEST BROKEN: expected VIOLATION: $3 '$1' <$2>" >&2; fails=1; }; }
  expect_tr_ok(){ local rc; trailer_violation "$1" >/dev/null; rc=$?; [ $rc -eq 0 ] || { echo "SELF-TEST BROKEN: expected trailer OK" >&2; fails=1; }; }
  expect_tr_bad(){ local rc; trailer_violation "$1" >/dev/null; rc=$?; [ $rc -ne 0 ] || { echo "SELF-TEST BROKEN: expected trailer VIOLATION" >&2; fails=1; }; }

  expect_ok  "Fidel Monteiro" "fidelrmonteiro@gmail.com" author        # legitimate human author
  expect_ok  "Fidel Monteiro" "56933720+fm65@users.noreply.github.com" author
  expect_ok  "GitHub" "noreply@github.com" committer                   # web-flow merge identity
  expect_ok  "web-flow" "noreply@github.com" committer
  expect_bad "Claude" "noreply@anthropic.com" author                   # author Claude
  expect_bad "claude" "x@example.com" author                           # lowercase name
  expect_bad "Someone" "someone+claude@users.noreply.github.com" author # email contains claude
  expect_bad "Someone" "bot@anthropic.com" author                      # email contains anthropic
  expect_bad "Claude" "x@y.com" committer                              # committer Claude (NOT allowlisted)
  expect_bad "CLAUDE" "x@y.com" author                                 # different case
  expect_tr_ok  "Fix bug

Co-authored-by: Fidel Monteiro <fidelrmonteiro@gmail.com>"
  expect_tr_ok  "Update CLAUDE.md and mention Claude Code in docs"     # content mention, not a trailer
  expect_tr_bad "Add feature

Co-authored-by: Claude <noreply@anthropic.com>"
  expect_tr_bad "Add feature

co-authored-by: claude <x@y>"          # lowercase trailer
  expect_tr_bad "Add feature

Signed-off-by: Claude <x@anthropic.com>"
  [ "$fails" -eq 0 ] || { echo "git-authorship-identity: guard self-test FAILED"; exit 2; }
}

self_test
[ "${1:-}" = "--self-test" ] && { echo "git-authorship-identity: self-test PASSED ✅"; exit 0; }

echo "== git-authorship-identity-check (M2.19G.6B) =="

# ── Resolve the PR commit range (fail-closed). ──────────────────────────────────────────────────────
BASE="${GIT_AUTHORSHIP_BASE:-}"
[ -z "$BASE" ] && [ -n "${GITHUB_BASE_REF:-}" ] && BASE="origin/${GITHUB_BASE_REF}"
[ -z "$BASE" ] && BASE="${1:-main}"
if ! git rev-parse --verify --quiet "$BASE^{commit}" >/dev/null 2>&1; then
  echo "FAIL (fail-closed): cannot resolve base ref '$BASE' — fetch it or set GIT_AUTHORSHIP_BASE"; exit 2
fi
MB="$(git merge-base "$BASE" HEAD 2>/dev/null || true)"
[ -n "$MB" ] || { echo "FAIL (fail-closed): no merge-base for '$BASE'..HEAD"; exit 2; }
COMMITS="$(git rev-list "$MB..HEAD")"
if [ -z "$COMMITS" ]; then echo "  ok: no new commits in ${BASE}..HEAD — nothing to check"; exit 0; fi
echo "  scanning $(printf '%s\n' "$COMMITS" | grep -c .) new commit(s) in ${BASE}..HEAD (metadata + trailers only)"

viol=0
while IFS= read -r sha; do
  [ -z "$sha" ] && continue
  an="$(git show -s --format='%an' "$sha")"; ae="$(git show -s --format='%ae' "$sha")"
  cn="$(git show -s --format='%cn' "$sha")"; ce="$(git show -s --format='%ce' "$sha")"
  body="$(git show -s --format='%B' "$sha")"
  for chk in "author|$an|$ae" "committer|$cn|$ce"; do
    role="${chk%%|*}"; rest="${chk#*|}"; nm="${rest%%|*}"; em="${rest#*|}"
    r="$(identity_violation "$nm" "$em" "$role")" || { echo "  FAIL ${sha:0:9}: $r"; viol=1; }
  done
  t="$(trailer_violation "$body")" || { echo "  FAIL ${sha:0:9}: $t"; viol=1; }
done <<< "$COMMITS"

if [ "$viol" -ne 0 ]; then
  echo "git-authorship-identity: FAIL — a new commit is attributed to Claude/Anthropic (author/committer/trailer)."
  echo "  Fix authorship (git commit --amend --author / git rebase) to the legitimate human identity; never Claude."
  exit 1
fi
echo "git-authorship-identity: ✅ no Claude/Anthropic author, committer or authorship trailer in the new commits"
