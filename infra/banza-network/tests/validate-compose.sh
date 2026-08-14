#!/usr/bin/env bash
# Local static validation of compose.yml. No VM, no secrets, no side effects.
set -euo pipefail
cd "$(dirname "$0")/.."   # infra/banza-network
fail() { echo "FAIL: $*" >&2; exit 1; }

echo "== docker compose config =="
docker compose --env-file .env.example config >/tmp/banza-rendered.yml 2>/dev/null \
  || fail "compose config invalid"
echo "  valid ✅"

echo "== build contexts resolve to absolute repo paths (final architecture) =="
# Regression guard: the running stack is deployed to /srv/banza-protocol/runtime,
# so a relative context (e.g. ../../website) would resolve to /srv/website — which
# does not exist. Every build.context must be an ABSOLUTE path ending in the
# service's repo directory:  website → .../website ;
# verification-api / banzai-api → .../services/<name>. The old apps/ layout is gone.
ctx=$(awk '/^  website:$/{w=1} w&&/context:/{print $2; exit}' /tmp/banza-rendered.yml)
case "$ctx" in
  */apps/*)   fail "website build.context is $ctx — the old apps/ layout is gone; use an absolute .../website path";;
  ../*|""|.*) fail "website build.context is relative ($ctx) — will not resolve from the runtime dir";;
  /*/website) echo "  website context = $ctx ✅";;
  *)          fail "website build.context is not an absolute .../website path: $ctx";;
esac
for svc in verification-api banzai-api; do
  sctx=$(awk "/^  ${svc}:\$/{w=1} w&&/context:/{print \$2; exit}" /tmp/banza-rendered.yml)
  case "$sctx" in
    */services/"$svc") echo "  $svc context = $sctx ✅";;
    *)                 fail "$svc build.context must be an absolute .../services/$svc path, got: '$sctx'";;
  esac
done

echo "== only :80/:443 published (edge nginx) =="
pub=$(grep -c 'published:' /tmp/banza-rendered.yml || true)
[ "$pub" -eq 2 ] || fail "expected exactly 2 published ports, got $pub"
grep -q 'published: "80"'  /tmp/banza-rendered.yml || fail "80 not published"
grep -q 'published: "443"' /tmp/banza-rendered.yml || fail "443 not published"
echo "  exactly 80 + 443 ✅"

echo "== postgres publishes NO host port =="
awk '/^  postgres:$/{f=1;next} /^  [a-z][a-z-]*:$/{f=0} f' /tmp/banza-rendered.yml \
  | grep -q 'published' && fail "postgres must not publish a port"
echo "  postgres internal-only ✅"

echo "== banza-data network is internal =="
grep -q 'internal: true' /tmp/banza-rendered.yml || fail "banza-data must be internal"
echo "  internal ✅"

echo "== no privileged containers =="
! grep -q 'privileged: true' /tmp/banza-rendered.yml || fail "privileged container present"
echo "  none ✅"

echo "== llama-local is OFF by default (ADR-036: compose profile gates it) =="
grep -q '^  llama-local:$' /tmp/banza-rendered.yml \
  && fail "llama-local must be profile-gated — absent from the default render"
echo "  llama-local absent by default ✅"

echo "== llama-local (profile on): internal-only, hardened, model read-only =="
docker compose --env-file .env.example --profile llama-local config >/tmp/banza-rendered-llama.yml 2>/dev/null \
  || fail "compose config (profile llama-local) invalid"
grep -q '^  llama-local:$' /tmp/banza-rendered-llama.yml || fail "llama-local missing under its profile"
lpub=$(grep -c 'published:' /tmp/banza-rendered-llama.yml || true)
[ "$lpub" -eq 2 ] || fail "llama-local must publish NO host port (expected 2 published total, got $lpub)"
slice() { awk '/^  llama-local:$/{f=1;next} /^  [a-z][a-z-]*:$/{f=0} f' /tmp/banza-rendered-llama.yml; }
slice | grep -q 'published' && fail "llama-local must not publish a port"
slice | grep -q 'banza-edge' && fail "llama-local must NOT be on banza-edge (internal-only)"
slice | grep -q 'banza-inference' || fail "llama-local must be on banza-inference (isolated internal)"
slice | grep -q 'banza-data' && fail "llama-local must NOT be on banza-data (no route to postgres)"
slice | grep -q 'read_only: true' || fail "llama-local must run read_only"
slice | grep -qi 'no-new-privileges' || fail "llama-local must set no-new-privileges"
# The model mount is read-only. `docker compose config` expands bind mounts to long
# form, so assert against the raw source (the canonical `./models:/models:ro`).
grep -q '\- ./models:/models:ro' compose.yml || fail "llama-local must mount the model read-only (./models:/models:ro)"
echo "  llama-local internal-only + hardened ✅"
rm -f /tmp/banza-rendered-llama.yml

rm -f /tmp/banza-rendered.yml
echo "ALL COMPOSE CHECKS PASSED ✅"
