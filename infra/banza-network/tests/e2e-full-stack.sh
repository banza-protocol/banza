#!/usr/bin/env bash
# Full-stack local E2E for the BANZA network.
#
# Brings the ENTIRE stack up locally (postgres + verification-api + banzai-api +
# website + nginx) via the local-test overlay, validates the integrated behaviour
# through nginx, then tears everything down. No VM, no deploy, no DNS, no real
# secrets/certs/IPs, no external LLM. TLS uses a throwaway self-signed cert generated
# into the gitignored nginx/certs/ and removed on exit.
set -euo pipefail
cd "$(dirname "$0")/.."   # infra/banza-network
fail() { echo "FAIL: $*" >&2; exit 1; }

DC="docker compose -p banza-localtest -f compose.yml -f compose.local-test.yml --env-file .env.example"
CERT_DIR="nginx/certs"; GEN_CERT=0
cleanup() {
  $DC down -v --remove-orphans >/dev/null 2>&1 || true
  [ "$GEN_CERT" = "1" ] && rm -f "$CERT_DIR/origin.pem" "$CERT_DIR/origin.key" || true
}
trap cleanup EXIT

jget() { node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{let v=JSON.parse(d);for(const k of (process.argv[1]?process.argv[1].split("."):[]))v=v==null?undefined:v[k];console.log(v===undefined?"":typeof v==="object"?JSON.stringify(v):v)}catch{console.log("")}})' "$1"; }
askjson() { node -e 'console.log(JSON.stringify({question:process.argv[1]}))' "$1"; }
# curl through the LOCAL nginx (published on loopback :8443). The URL MUST carry :8443
# so --resolve matches — otherwise curl would fall back to real DNS and hit the live
# domain. Pinning host:8443 -> 127.0.0.1 guarantees we only ever reach the local stack.
cf()   { local host="$1" path="$2"; shift 2; curl -s -k --resolve "$host:8443:127.0.0.1" "$@" "https://$host:8443$path"; }
ccode(){ local host="$1" path="$2"; curl -s -k -o /dev/null -w '%{http_code}' --resolve "$host:8443:127.0.0.1" "https://$host:8443$path"; }
cct()  { local host="$1" path="$2"; curl -s -k -o /dev/null -w '%{content_type}' --resolve "$host:8443:127.0.0.1" "https://$host:8443$path"; }

echo "== throwaway TLS cert (self-signed, 1 day; gitignored) =="
if [ ! -f "$CERT_DIR/origin.pem" ]; then
  mkdir -p "$CERT_DIR"; GEN_CERT=1
  openssl req -x509 -newkey rsa:2048 -nodes -keyout "$CERT_DIR/origin.key" -out "$CERT_DIR/origin.pem" \
    -days 1 -subj "/CN=banza.network" \
    -addext "subjectAltName=DNS:banza.network,DNS:www.banza.network,DNS:docs.banza.network,DNS:banzai.banza.network" >/dev/null 2>&1
  echo "  generated ✅"
else
  echo "  reusing existing (gitignored) cert"
fi

echo "== build + up FULL stack (this builds the website image; may take a few minutes) =="
$DC up -d --build >/tmp/banza-e2e-up.log 2>&1 || { tail -40 /tmp/banza-e2e-up.log; fail "compose up failed"; }

echo "== wait for verification-api DB readiness + banzai health (<=120s) =="
for i in $(seq 1 60); do
  vr=$(curl -s http://127.0.0.1:8090/health 2>/dev/null | jget ready || true)
  bh=$(curl -fsS http://127.0.0.1:8091/health >/dev/null 2>&1 && echo ok || echo no)
  [ "$vr" = "true" ] && [ "$bh" = "ok" ] && break
  sleep 2
  [ "$i" = "60" ] && { $DC ps; $DC logs --tail=20 verification-api banzai-api; fail "services not ready"; }
done
echo "  verification-api ready + banzai-api healthy ✅"

echo "== nginx config is valid inside the running stack (upstreams resolve) =="
$DC exec -T reverse-proxy nginx -t >/tmp/banza-nginx-t.log 2>&1 || { cat /tmp/banza-nginx-t.log; fail "nginx -t failed"; }
echo "  nginx -t ok ✅"

echo "== wait until nginx serves the site (<=60s) =="
for i in $(seq 1 30); do
  [ "$(ccode banza.network /)" = "200" ] && break
  sleep 2
  [ "$i" = "30" ] && { $DC logs --tail=20 website reverse-proxy; fail "site not served via nginx"; }
done

echo "== website via nginx (apex) =="
[ "$(ccode banza.network /)" = "200" ] || fail "apex / not 200"
cf banza.network / | grep -q 'Protocolo financeiro aberto' || fail "homepage content missing"
echo "  apex 200 + institutional content ✅"

echo "== www → apex redirect =="
loc=$(curl -s -k -o /dev/null -w '%{redirect_url}' --resolve www.banza.network:8443:127.0.0.1 https://www.banza.network:8443/)
echo "$loc" | grep -q '^https://banza.network' || fail "www did not redirect to apex (got '$loc')"
echo "  www → apex ✅"

echo "== machine routes via nginx: JSON, never HTML =="
for r in /.well-known/banza/root.json /.well-known/banza/key-manifest.json /operators /federation/revocation-list.json /conformance/evidence; do
  c=$(ccode banza.network "$r"); t=$(cct banza.network "$r")
  [ "$c" = "200" ] || fail "machine route $r -> $c"
  case "$t" in application/json*) : ;; *) fail "machine route $r content-type '$t' not JSON" ;; esac
done
echo "  5 machine routes 200 + application/json (not HTML) ✅"

echo "== /operators empty; certificates not live; status pre-production =="
[ "$(cf banza.network /operators | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const a=JSON.parse(d);console.log(Array.isArray(a)&&a.length===0?"empty":"nonempty")})')" = "empty" ] || fail "/operators not empty"
[ "$(cf banza.network /conformance/evidence | jget production_certificates)" = "false" ] || fail "production_certificates != false"
[ "$(cf banza.network /conformance/evidence | jget status)" = "pre-production" ] || fail "conformance status != pre-production"
cf banza.network /conformance/evidence | jget clarification | grep -qi "verifiable technical evidence only" || fail "conformance clarification missing"
echo "  /operators=[], production_certificates=false, pre-production, PASS≠certificate ✅"

echo "== BanzAI: single public interface on the apex /banzai/ask (M2.8E; no subdomain backend) =="
# The chat is served same-origin on the apex; only /banzai/ask reaches the internal backend.
ans=$(cf banza.network /banzai/ask -XPOST -H 'Content-Type: application/json' --data "$(askjson 'O que significa /operators vazio?')")
[ "$(echo "$ans" | jget grounded)" = "true" ] || fail "banzai answer not grounded via apex /banzai/ask"
[ "$(echo "$ans" | jget external_model_called)" = "false" ] || fail "banzai external_model_called != false"
# The retired subdomain must 301-redirect to the apex, not proxy the backend.
sub=$(curl -s -k -o /dev/null -w '%{http_code}' --resolve "banzai.banza.network:8443:127.0.0.1" "https://banzai.banza.network:8443/health")
case "$sub" in 301|302|308) : ;; *) fail "banzai.banza.network must redirect to the apex (got '$sub')" ;; esac
echo "  apex /banzai/ask grounded + external_model_called=false; subdomain redirects ✅"

echo "== BanzAI makes NO external model call (on-host provider only) =="
prov=$($DC exec -T banzai-api printenv LLM_PROVIDER 2>/dev/null || true)
case "$prov" in mock|local_qwen) : ;; *) fail "banzai LLM_PROVIDER must be mock or local_qwen (on-host), got '$prov'" ;; esac
key=$($DC exec -T banzai-api printenv LLM_API_KEY 2>/dev/null || true)
case "$key" in ""|change-me) : ;; *) fail "no real LLM_API_KEY expected (external providers off)" ;; esac
echo "  provider on-host ($prov), no external key ✅"

echo "== postgres not published to host (only loopback app/nginx ports) =="
# `compose port` exits 0 even when nothing is published — it prints "" or ":0".
# Anything with a real host port (e.g. 0.0.0.0:5432) means it IS published → fail.
pgport=$($DC port postgres 5432 2>/dev/null || true)
case "$pgport" in ""|*:0) : ;; *) fail "postgres must not publish 5432 (got '$pgport')" ;; esac
echo "  postgres unpublished ✅"

echo "ALL FULL-STACK E2E CHECKS PASSED ✅"
