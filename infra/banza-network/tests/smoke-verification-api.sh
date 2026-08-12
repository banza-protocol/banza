#!/usr/bin/env bash
# Local smoke test for verification-api against a real ephemeral PostgreSQL.
# Brings up postgres + verification-api via the local-test overlay (loopback ports,
# trust auth, no secrets), asserts the pre-production machine-route behaviour, tears down.
set -euo pipefail
cd "$(dirname "$0")/.."   # infra/banza-network
fail() { echo "FAIL: $*" >&2; exit 1; }

DC="docker compose -p banza-localtest -f compose.yml -f compose.local-test.yml --env-file .env.example"
cleanup() { $DC down -v --remove-orphans >/dev/null 2>&1 || true; }
trap cleanup EXIT

# Extract a field from JSON on stdin: jget <dotted.path>
jget() { node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{let v=JSON.parse(d);for(const k of (process.argv[1]?process.argv[1].split("."):[]))v=v==null?undefined:v[k];console.log(v===undefined?"":typeof v==="object"?JSON.stringify(v):v)}catch{console.log("")}})' "$1"; }

echo "== build + up postgres + verification-api =="
$DC up -d --build postgres verification-api >/tmp/banza-vapi-up.log 2>&1 || { tail -30 /tmp/banza-vapi-up.log; fail "compose up failed"; }

echo "== wait for app + DB readiness (<=90s) =="
for i in $(seq 1 45); do
  ready=$(curl -s http://127.0.0.1:8090/health 2>/dev/null | jget ready || true)
  [ "$ready" = "true" ] && break
  sleep 2
  [ "$i" = "45" ] && { $DC logs verification-api | tail -30; fail "verification-api not ready"; }
done
V=http://127.0.0.1:8090
echo "  health ready ✅ (db=$(curl -s $V/health | jget db), phase=$(curl -s $V/health | jget phase))"

ct() { curl -s -o /dev/null -w '%{content_type}' "$1"; }
code() { curl -s -o /dev/null -w '%{http_code}' "$1"; }

echo "== all machine routes are JSON, never HTML =="
for r in /.well-known/banza/root.json /.well-known/banza/key-manifest.json /operators /federation/revocation-list.json /conformance/evidence; do
  c=$(code "$V$r"); t=$(ct "$V$r")
  [ "$c" = "200" ] || fail "$r -> HTTP $c"
  case "$t" in application/json*) : ;; *) fail "$r content-type is '$t', expected JSON" ;; esac
done
echo "  5 routes 200 + application/json ✅"

echo "== /operators is an empty list (pre-production) =="
ops=$(curl -s $V/operators)
[ "$(echo "$ops" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const a=JSON.parse(d);console.log(Array.isArray(a)&&a.length===0?"empty":"nonempty")})')" = "empty" ] \
  || fail "/operators must be an empty array, got: $ops"
echo "  /operators = [] ✅"

echo "== pre-production envelope: production_certificates=false, no live certs =="
[ "$(curl -s $V/conformance/evidence | jget production_certificates)" = "false" ] || fail "/conformance/evidence production_certificates != false"
[ "$(curl -s $V/conformance/evidence | jget status)" = "pre-production" ] || fail "/conformance/evidence status != pre-production"
echo "  production_certificates=false, status=pre-production ✅"

echo "== conformance evidence states PASS is evidence, not certificate =="
curl -s $V/conformance/evidence | jget clarification | grep -qi "verifiable technical evidence only" || fail "conformance evidence must clarify PASS is evidence, not a status grant"
echo "  clarification present ✅"

echo "== BRL route exists with pre-production envelope =="
[ "$(curl -s $V/federation/revocation-list.json | jget status)" = "pre-production" ] || fail "BRL status != pre-production"
echo "  BRL pre-production envelope ✅"

echo "== writes are refused (read-only public surface) =="
[ "$(code -X)" != "" ] || true
mcode=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$V/operators"); [ "$mcode" = "405" ] || fail "POST /operators should be 405, got $mcode"
echo "  POST /operators -> 405 ✅"

echo "== unknown route -> JSON 404 (never HTML) =="
[ "$(code $V/nope)" = "404" ] || fail "unknown route not 404"
case "$(ct $V/nope)" in application/json*) : ;; *) fail "404 not JSON" ;; esac
echo "  404 JSON ✅"

echo "ALL VERIFICATION-API SMOKE CHECKS PASSED ✅"
