#!/usr/bin/env bash
#
# BANZA Operador Zero origin-closure guard (M2.19G.3A, ADR-069).
#
# The corrective closes the origin-proof loop for the Operador Zero re-enrolment. Its security depends on
# ONE structural property: the ownership challenge is published by the operator's OWN origin
# (zero.banza.network, served by nginx from a static file) and fetched + verified by a SEPARATE verifier
# (banzai-api). The verifier must never serve, fabricate, hardcode or DB-shortcut the challenge, and a
# positively-verified challenge must be single-use. Reconciliation binds the candidate to the EXISTING
# closed-registry Operador Zero entry — it never creates an operator and never writes /operators.
#
# This one guard asserts fourteen labelled invariants (G1..G14). Exit 1 on any violation; exit 2 if the
# guard's own self-test is broken. Comment-stripping is applied where a rule enumerates what is
# forbidden, so documenting a boundary never trips the guard.

set -euo pipefail
cd "$(dirname "$0")/.."

pass=0
g() { printf 'oz-origin-closure: ✓ %s\n' "$1"; pass=$((pass+1)); }
fail() { printf 'oz-origin-closure: ✗ %s\n' "$*" >&2; exit 1; }

ENGINE=engines/banzai-onboarding/src/lib.rs
ONB=services/banzai-api/src/onboarding
NGINX=infra/banza-network/nginx/conf.d/banza.conf
COMPOSE=infra/banza-network/compose.yml
SCHEMA=infra/banza-network/postgres/init/001_schema.sql
MIGRATION=infra/banza-network/postgres/migrations/M2_19G3A_origin_single_use.sql
OZDIR=infra/banza-network/nginx/oz-well-known
WK="/.well-known/banza/ownership-challenge.json"

# ── G1. INDEPENDENT-ORIGIN: the zero vhost serves the challenge from a STATIC FILE, not a proxy ────────
grep -q "location = $WK" "$NGINX" \
  || fail "G1 independent-origin: zero vhost missing exact-match 'location = $WK'"
grep -q "alias /etc/nginx/oz-well-known/ownership-challenge.json;" "$NGINX" \
  || fail "G1 independent-origin: the challenge location must 'alias' a static file (not proxy_pass)"
g "G1 independent-origin — challenge served by the OZ origin nginx from a static file"

# ── G2. EXACT-MATCH PRECEDENCE: exact 'location =' outranks the website proxy for this one URL ─────────
# The exact-match block must appear BEFORE the catch-all 'location /' in the zero vhost is irrelevant to
# nginx (exact always wins), but it must not be a prefix match that could leak other paths.
grep -Eq "location = $WK \{" "$NGINX" \
  || fail "G2 exact-match: the challenge location must be an exact match ('location = …'), never a prefix"
g "G2 exact-match — only the single canonical URL is served statically (exact 'location =')"

# ── G3. METHOD-GUARD: non-GET/HEAD on the challenge URL returns 405 ───────────────────────────────────
awk "/location = ${WK//\//\\/} \{/{f=1} f&&/return 405/{found=1} f&&/\}/{f=0} END{exit !found}" "$NGINX" \
  || fail "G3 method-guard: the challenge location must return 405 for non-GET/HEAD methods"
g "G3 method-guard — 405 for methods other than GET/HEAD"

# ── G4. NO-STORE: the published challenge is served no-store (a live, single-use nonce) ────────────────
grep -q 'add_header Cache-Control "no-store"' "$NGINX" \
  || fail "G4 no-store: the challenge must be served with Cache-Control: no-store"
g "G4 no-store — the live nonce is never cached"

# ── G5. COMPOSE-MOUNT: reverse-proxy mounts the OZ well-known dir READ-ONLY ────────────────────────────
grep -q './nginx/oz-well-known:/etc/nginx/oz-well-known:ro' "$COMPOSE" \
  || fail "G5 compose-mount: reverse-proxy must mount ./nginx/oz-well-known read-only (:ro)"
g "G5 compose-mount — origin publication dir bind-mounted read-only into nginx"

# ── G6. VERIFIER-INDEPENDENCE: banzai-api NEVER serves/produces the challenge document itself ──────────
# The onboarding backend generates the nonce and stores only its hash, but it must not expose a route
# that returns the challenge DOCUMENT content (that would let the verifier answer its own challenge).
if grep -RIl "ownership-challenge.json" "$ONB" | grep -v constants.js | grep -q .; then
  # Any reference outside constants.js must not be a handler returning the doc body. Be strict: the only
  # allowed occurrences are the well-known PATH constant and comments. A route emitting the file body is
  # forbidden.
  if grep -RIn "sendFile\|readFile.*ownership-challenge\|res.*ownership-challenge.json" "$ONB" | grep -q .; then
    fail "G6 verifier-independence: onboarding backend must not serve the challenge document body"
  fi
fi
grep -q 'challenge_document' "$ONB/service.js" \
  || fail "G6 verifier-independence: issueOriginChallenge must return challenge_document for the OPERATOR to publish"
# The nginx challenge location must alias a file, NOT proxy to banzai-api.
if awk "/location = ${WK//\//\\/} \{/{f=1} f&&/banzai-api/{print; bad=1} f&&/\}/{f=0} END{exit !bad}" "$NGINX"; then
  fail "G6 verifier-independence: the challenge URL must NOT proxy to banzai-api (verifier ≠ publisher)"
fi
g "G6 verifier-independence — the verifier fetches; it never serves its own challenge"

# ── G7. SINGLE-USE (Rust): the engine refuses a consumed challenge ────────────────────────────────────
grep -q 'consumed_at_ms' "$ENGINE" \
  || fail "G7 single-use(rust): origin_verify must accept consumed_at_ms"
grep -q 'challenge_already_consumed' "$ENGINE" \
  || fail "G7 single-use(rust): origin_verify must return challenge_already_consumed for a used challenge"
g "G7 single-use(rust) — a consumed challenge can never verify again"

# ── G8. SINGLE-USE (store/schema): consumed_at column + a consume writer that is write-once ────────────
grep -q 'consumed_at' "$SCHEMA" || fail "G8 single-use(schema): origin_challenges needs a consumed_at column"
[ -f "$MIGRATION" ] || fail "G8 single-use(migration): missing $MIGRATION"
grep -q 'consumed_at' "$MIGRATION" || fail "G8 single-use(migration): migration must add consumed_at"
grep -q 'consumed_at IS NULL' "$ONB/store.js" \
  || fail "G8 single-use(store): markOriginChallengeConsumed must be write-once (WHERE consumed_at IS NULL)"
g "G8 single-use(store/schema) — consumed_at is set exactly once, write-once"

# ── G9. CONSUME-ON-VERIFY + REPLAY-SHORTCIRCUIT in the service ────────────────────────────────────────
grep -q 'markOriginChallengeConsumed' "$ONB/service.js" \
  || fail "G9 consume-on-verify: service must consume the challenge on a positive verify"
grep -q 'origin_verify_replay_rejected' "$ONB/service.js" \
  || fail "G9 consume-on-verify: service must short-circuit + audit a replay on a consumed challenge"
g "G9 consume-on-verify — positive verify consumes; a replay is refused before any refetch"

# ── G10. SECURE-FETCHER REUSE: verify uses the injected banza-fetcher, never a raw URL fetch ───────────
grep -q 'fetcher.fetchArtifact' "$ONB/service.js" \
  || fail "G10 secure-fetcher: verifyOrigin must fetch through the injected secure Rust fetcher"
if grep -nE '\b(fetch|axios|http\.get|https\.get|node-fetch)\(' "$ONB/service.js" | grep -q .; then
  fail "G10 secure-fetcher: the onboarding service must not perform its own network fetch"
fi
g "G10 secure-fetcher — the only egress is banza-fetcher (SSRF-hardened, registry-derived origin)"

# ── G11. RECONCILE = BINDING to the CLOSED registry (never creation) ───────────────────────────────────
grep -q 'resolveRegistryTarget' "$ONB/service.js" \
  || fail "G11 reconcile-binding: reconcile must resolve the target in the closed Technical Registry"
grep -q 'registry_target_unknown' "$ONB/service.js" \
  || fail "G11 reconcile-binding: reconcile must refuse an unknown registry target"
g "G11 reconcile-binding — bind to an existing registry entry; refuse unknown targets"

# ── G12. RECONCILE requires ORIGIN_VERIFIED ───────────────────────────────────────────────────────────
grep -q "origin_verification_state !== \"ORIGIN_VERIFIED\"" "$ONB/service.js" \
  || fail "G12 reconcile-origin-gate: reconcile must require origin_verification_state === ORIGIN_VERIFIED"
g "G12 reconcile-origin-gate — no reconciliation without a positive origin proof"

# ── G13. NO OPERATOR CREATION / NO /operators WRITE from onboarding ────────────────────────────────────
# The onboarding backend must not write the public registry (/operators is served by verification-api
# from published artifacts, never mutated by onboarding). Assert no INSERT into operators and no write to
# a production /operators file from the onboarding service.
if grep -RInE 'INSERT +INTO +operators|/operators.*(writeFile|POST)|createOperator' "$ONB" | grep -q .; then
  fail "G13 no-operator-creation: onboarding must never create an operator nor write /operators"
fi
grep -q 'setImplementationPublished' "$ONB/service.js" \
  || fail "G13 no-operator-creation: reconcile must only RECORD the correspondence (published_* ids)"
g "G13 no-operator-creation — reconcile records a correspondence; it never publishes a new operator"

# ── G14. NO NONCE / VERDICT / BYPASS / FIXTURE FOR OZ in Git ───────────────────────────────────────────
# No committed ownership-challenge.json (the live nonce must never be in Git).
if git ls-files "$OZDIR" | grep -q 'ownership-challenge.json'; then
  fail "G14 no-nonce-in-git: a published ownership-challenge.json is committed — the nonce must never be in Git"
fi
[ -f "$OZDIR/.gitignore" ] || fail "G14 no-nonce-in-git: $OZDIR/.gitignore must forbid committing the challenge"
# No special-case that returns success only for operator-zero (no hardcoded verdict/bypass in the engine).
body_svc="$(sed 's://.*$::' "$ONB/service.js")"
if printf '%s' "$body_svc" | grep -Eiq 'operator-zero.*(verified|"ok": *true|bypass)|if.*operator-zero.*return'; then
  fail "G14 no-bypass: the onboarding service must not special-case operator-zero to a verdict"
fi
g "G14 no-nonce-in-git / no-bypass — no committed nonce; no OZ-only verdict shortcut"

# ── self-test ─────────────────────────────────────────────────────────────────────────────────────────
tmp="$(mktemp)"; printf 'location = /x { proxy_pass http://banzai-api:8091; }\n' > "$tmp"
if awk '/location = \/x \{/{f=1} f&&/banzai-api/{bad=1} END{exit !bad}' "$tmp"; then :; else
  echo "oz-origin-closure: self-test broken" >&2; rm -f "$tmp"; exit 2; fi
rm -f "$tmp"

[ "$pass" -eq 14 ] || fail "expected 14 labelled assertions, ran $pass"
echo "PASS operator-zero-origin-closure (M2.19G.3A, ADR-069) — 14/14 invariants"
