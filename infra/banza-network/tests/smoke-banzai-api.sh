#!/usr/bin/env bash
# Local smoke test for banzai-api in mock mode. No external LLM, no key, no GPU.
# Brings up only banzai-api via the local-test overlay, exercises the mandatory
# protocol questions and guardrails, confirms no real provider is ever called, tears down.
set -euo pipefail
cd "$(dirname "$0")/.."   # infra/banza-network
fail() { echo "FAIL: $*" >&2; exit 1; }

DC="docker compose -p banza-localtest -f compose.yml -f compose.local-test.yml --env-file .env.example"
cleanup() { $DC down -v --remove-orphans >/dev/null 2>&1 || true; }
trap cleanup EXIT

jget() { node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{let v=JSON.parse(d);for(const k of (process.argv[1]?process.argv[1].split("."):[]))v=v==null?undefined:v[k];console.log(v===undefined?"":typeof v==="object"?JSON.stringify(v):v)}catch{console.log("")}})' "$1"; }
askjson() { node -e 'console.log(JSON.stringify({question:process.argv[1]}))' "$1"; }

echo "== build + up banzai-api (mock) =="
$DC up -d --build banzai-api >/tmp/banza-bapi-up.log 2>&1 || { tail -30 /tmp/banza-bapi-up.log; fail "compose up failed"; }

echo "== wait for health (<=60s) =="
for i in $(seq 1 30); do
  curl -fsS http://127.0.0.1:8091/health >/dev/null 2>&1 && break
  sleep 2
  [ "$i" = "30" ] && { $DC logs banzai-api | tail -30; fail "banzai-api not healthy"; }
done
B=http://127.0.0.1:8091

echo "== health: mock provider, no external model, non-authoritative =="
h=$(curl -s $B/health)
[ "$(echo "$h" | jget mode)" = "mock" ] || fail "mode != mock"
[ "$(echo "$h" | jget external_model_called)" = "false" ] || fail "external_model_called != false"
[ "$(echo "$h" | jget authoritative)" = "false" ] || fail "authoritative != false"
[ "$(echo "$h" | jget guardrails.can_certify)" = "false" ] || fail "can_certify != false"
echo "  mock, external_model_called=false, authoritative=false, can_certify=false ✅"

echo "== the 9 mandatory questions are grounded + cite sources =="
declare -a Q=(
  "O que é BANZA?"
  "BANZA é um operador?"
  "Quem são os operadores certificados?"
  "Um PASS da conformance suite é certificado?"
  "BanzAI pode emitir certificado?"
  "Onde vivem as root keys?"
  "Como consultar a BRL?"
  "O que significa /operators vazio?"
  "Quais são os limites do BANZA?"
)
for q in "${Q[@]}"; do
  r=$(curl -s -XPOST $B/ask -H 'Content-Type: application/json' -d "$(askjson "$q")")
  [ "$(echo "$r" | jget grounded)" = "true" ] || fail "not grounded: $q"
  nsrc=$(echo "$r" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const o=JSON.parse(d);console.log((o.sources||[]).length)})')
  [ "$nsrc" -ge 1 ] || fail "no sources cited: $q"
done
echo "  9/9 grounded with >=1 cited source ✅"

echo "== guardrail content: certifies=false, PASS is evidence, keys off-VM, empty /operators =="
a_pass=$(curl -s -XPOST $B/ask -d "$(askjson 'Um PASS da conformance suite é certificado?')" | jget answer)
echo "$a_pass" | grep -qi "evidência" || fail "PASS answer must say evidence not certificate"
a_keys=$(curl -s -XPOST $B/ask -d "$(askjson 'Onde vivem as root keys?')" | jget answer)
echo "$a_keys" | grep -qi "offline" || fail "root keys answer must say offline/ceremony"
a_cert=$(curl -s -XPOST $B/ask -d "$(askjson 'BanzAI pode emitir certificado?')" | jget answer)
echo "$a_cert" | grep -qi "não" || fail "BanzAI must say it cannot certify"
echo "  guardrail answers correct ✅"

echo "== insufficient sources → says so (no hallucination) =="
r=$(curl -s -XPOST $B/ask -d '{"question":"Qual é a cotação do dólar amanhã?"}')
[ "$(echo "$r" | jget grounded)" = "false" ] || fail "off-topic question should not be grounded"
echo "$r" | jget answer | grep -qi "não encontrei fonte" || fail "must state insufficient sources"
echo "  insufficient-sources handled ✅"

echo "== /sources and /index (dry-run) =="
[ "$(curl -s $B/sources | jget count)" -ge 1 ] || fail "/sources empty"
[ "$(curl -s -XPOST $B/index | jget embeddings_computed)" = "0" ] || fail "/index must compute 0 embeddings (dry-run)"
echo "  /sources present, /index dry-run computes 0 embeddings ✅"

echo "== no external provider egress configured in mock mode =="
# The container image sets LLM_PROVIDER=mock and there is no LLM_API_KEY; confirm.
key=$($DC exec -T banzai-api printenv LLM_API_KEY 2>/dev/null || true)
prov=$($DC exec -T banzai-api printenv LLM_PROVIDER 2>/dev/null || true)
[ -z "$key" ] || fail "LLM_API_KEY must be unset locally (got a value)"
[ "$prov" = "mock" ] || fail "LLM_PROVIDER must be mock, got '$prov'"
echo "  LLM_PROVIDER=mock, LLM_API_KEY unset ✅"

echo "ALL BANZAI-API SMOKE CHECKS PASSED ✅"
