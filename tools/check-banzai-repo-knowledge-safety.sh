#!/usr/bin/env bash
# check-banzai-repo-knowledge-safety.sh — BanzAI knowledge & index safety guard (M2.13B).
#
# BanzAI answers from a curated knowledge base (services/banzai-api/src/knowledge.js) and a Rust-built
# retrieval index (engines/banzai-api-kb/src/{doc-index,entries-index}.json). This guard proves that
# corpus is SAFE:
#   * SECRET-FREE — no private-key/PEM material, no seed/mnemonic, no .env dumps, no GGUF weights, no
#     build-artifact paths (node_modules / target / .next / cache) leaked into the served corpus;
#   * NO STALE /operador-zero SURFACE — no answer presents the retired apex route /operador-zero as an
#     available/canonical surface; every answer that names it also marks it discontinued (410) and
#     points at the canonical zero.banza.network;
#   * the M2.13B basic-answer and refusal entries are present, critical and non-empty.
#
# This is the safety-core scope of M2.13B PR1 (the repo-wide indexer is a later PR). It complements
# make private-key-leak-check (repo-wide) and make banzai-action-boundary-check (behavioural refusals).

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

KNOWLEDGE="services/banzai-api/src/knowledge.js"
DOC_INDEX="engines/banzai-query-core/src/doc-index.json"
ENTRIES_INDEX="engines/banzai-query-core/src/entries-index.json"

[ -f "$KNOWLEDGE" ] || { echo "FAIL: $KNOWLEDGE not found"; exit 1; }

echo "== banzai-repo-knowledge-safety-check (M2.13B) =="

# 1. Secret-free corpus. Scan the served knowledge + the Rust index files for key/secret material and
#    build-artifact paths. Prose that merely NAMES a secret concept is fine (the boundary refuses to
#    expose one); actual MATERIAL is not. NB: patterns are intentionally structural (PEM headers, .env
#    file paths, GGUF weights, real seed/mnemonic material), not the mere words.
SECRET_RE='BEGIN [A-Z ]*PRIVATE KEY|-----BEGIN|"seed_phrase"|"mnemonic"|seed phrase:|"private_key"|"signing_key"|"secret_key"|AWS_SECRET|xox[baprs]-|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}'
ART_RE='"path"[^A-Za-z0-9]*"[^"]*(node_modules|/target/|\.next/|\.env)'
for f in "$KNOWLEDGE" "$DOC_INDEX" "$ENTRIES_INDEX"; do
  [ -f "$f" ] || { ok "absent (not scanned): $f"; continue; }
  if grep -qE "$SECRET_RE" "$f"; then fail "secret material in $f:"; grep -nE "$SECRET_RE" "$f" | head -5 | sed 's/^/      /'; else ok "no secret material in $(basename "$f")"; fi
  if grep -qE "$ART_RE" "$f"; then fail "build-artifact path indexed in $f:"; grep -nE "$ART_RE" "$f" | head -5 | sed 's/^/      /'; else ok "no build-artifact paths in $(basename "$f")"; fi
  if grep -qiE '\.gguf' "$f"; then fail "GGUF weight path in $f"; else ok "no GGUF weights in $(basename "$f")"; fi
done

# 1b. The M2.13B PR2 repo-wide index (banzai-repo-index*.json) contains CODE excerpts, so the word-based
#     scan above would false-flag detector strings ("BEGIN PRIVATE KEY" as a regex) and docs that mention
#     GGUF exclusion. Scan it PRECISELY instead: a chunk is unsafe only if it holds a REAL armored key
#     (BEGIN+END fences + a long base64 body — impossible to fit legitimately in a 300-char chunk), or an
#     indexed PATH points at a build artifact / weight. Also assert the safety artifact + BanzAI-indexed.
IDX_DIR="engines/banzai-query-core/src/repoindex"
if [ -d "$IDX_DIR" ]; then
  node - "$IDX_DIR" <<'NODE'
const fs = require("fs"), path = require("path");
const dir = process.argv[2];
let bad = 0;
const idx = JSON.parse(fs.readFileSync(path.join(dir, "banzai-repo-index.json"), "utf8"));
const ARTIFACT = /(node_modules|\/target\/|\.next\/|\.env$|\.env\.|\.pem$|\.key$|\.gguf$)/i;
for (const c of idx) {
  const content = String(c.content || "");
  // real armored key: both fences AND a >=30-char base64 run
  if (/-----BEGIN/.test(content) && /-----END/.test(content) && /[A-Za-z0-9+/]{30,}/.test(content)) {
    console.log("  FAIL: repo-index chunk holds a real armored key: " + c.path); bad++;
  }
  if (ARTIFACT.test(String(c.path || ""))) { console.log("  FAIL: repo-index indexes a build-artifact path: " + c.path); bad++; }
}
if (!bad) console.log("  ok: repo-index content carries no real key material and no build-artifact paths");
// coverage/exclusions: no indexed build-artifact PATHS
for (const name of ["banzai-repo-index-coverage.json"]) {
  const recs = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
  const badp = recs.filter((r) => ARTIFACT.test(String(r.path || "")));
  if (badp.length) { console.log("  FAIL: " + name + " indexes build-artifact paths: " + badp.slice(0,3).map(r=>r.path).join(", ")); bad++; }
}
if (!bad) console.log("  ok: coverage indexes no build-artifact paths");
// safety artifact declares zero secrets; manifest confirms the (in-monorepo) BanzAI is indexed
const safety = JSON.parse(fs.readFileSync(path.join(dir, "banzai-repo-index-safety.json"), "utf8"));
if (safety.secrets_in_index !== 0) { console.log("  FAIL: safety artifact reports secrets_in_index != 0"); bad++; }
else console.log("  ok: safety artifact declares secrets_in_index = 0");
const man = JSON.parse(fs.readFileSync(path.join(dir, "banzai-repo-index-manifest.json"), "utf8"));
// M2.19G.6 (ADR-042): BanzAI was consolidated into this monorepo and the separate repo removed, so
// the separate repo is permanently removed. It MUST still cover the in-monorepo BanzAI runtime — asserted
// by banzai_in_monorepo AND a non-empty banzai-runtime category (services/banzai-api + engines/banzai-*).
if (man.banzai_in_monorepo !== true) { console.log("  FAIL: manifest banzai_in_monorepo != true"); bad++; }
else if (!(man.chunk_categories && man.chunk_categories["banzai-runtime"] > 0)) { console.log("  FAIL: index has no banzai-runtime chunks (in-monorepo BanzAI not indexed)"); bad++; }
else console.log("  ok: manifest confirms the in-monorepo BanzAI is indexed (banzai_in_monorepo + banzai-runtime chunks)");
if (man.banzai_repo_indexed !== undefined) { console.log("  FAIL: manifest still declares banzai_repo_indexed (separate repo was removed — field must be gone)"); bad++; }
else console.log("  ok: manifest no longer declares a separate indexed BanzAI repo");
process.exit(bad ? 1 : 0);
NODE
  [ $? -ne 0 ] && fail "repo-wide index safety scan failed" || ok "repo-wide index is secret-free + BanzAI-indexed"
fi

# 2. No stale /operador-zero surface + canonical subdomain — inspect the actual served answers (ESM).
node --input-type=module -e '
import { ENTRIES, getEntry } from "./services/banzai-api/src/knowledge.js";
let bad = 0;
// 2a. Any answer that names the retired apex route MUST mark it discontinued (410 / descontinuad /
//     antiga rota / zero.banza.network) — never present /operador-zero as an available surface.
const LIVE_CLAIMS = [/dispon[ií]vel em \/operador-zero/i, /aced[ae] a \/operador-zero/i, /v[aá] a \/operador-zero/i, /visite \/operador-zero/i, /\/operador-zero é a superf[ií]cie/i];
const DISCONTINUED = /(410|descontinuad|retirad|antiga rota|zero\.banza\.network)/i;
for (const e of ENTRIES) {
  const a = String(e.answer || "");
  if (/\/operador-zero/i.test(a) && !DISCONTINUED.test(a)) {
    console.log("  FAIL: entry", e.id, "names /operador-zero without marking it discontinued"); bad++;
  }
  for (const re of LIVE_CLAIMS) if (re.test(a)) { console.log("  FAIL: entry", e.id, "presents /operador-zero as an available surface"); bad++; }
}
if (!bad) console.log("  ok: no answer presents /operador-zero as an available/canonical surface");
// 2b. The OZ status/location answers state the canonical subdomain + the 410.
const status = getEntry("operador-zero-apex-status");
const loc = getEntry("operador-zero-location");
for (const [id, e] of [["operador-zero-apex-status", status], ["operador-zero-location", loc]]) {
  if (!e || !e.answer) { console.log("  FAIL: missing entry", id); bad++; continue; }
  if (!/zero\.banza\.network/i.test(e.answer)) { console.log("  FAIL:", id, "must name zero.banza.network"); bad++; }
  if (!/410/.test(e.answer)) { console.log("  FAIL:", id, "must state the apex responds 410"); bad++; }
}
if (!bad) console.log("  ok: OZ status/location answers name zero.banza.network + 410");
process.exit(bad ? 1 : 0);
'
if [ $? -ne 0 ]; then fail "a served answer presents /operador-zero as a live surface or omits the canonical subdomain"; else ok "stale /operador-zero surface cleanup holds in the served answers"; fi

# 3. The M2.13B basic-answer + refusal entries are present, critical and non-empty.
node --input-type=module -e '
import { getEntry } from "./services/banzai-api/src/knowledge.js";
const BASIC = ["protocol-license","banza-stack-language","operador-zero-language","operador-zero-files","operador-zero-location","operador-zero-apex-status"];
const REFUSALS = ["refuse-delete-document","refuse-remove-guard-or-bypass-ci","refuse-modify-trust-root","refuse-publish-or-certify-operator","refuse-expose-or-generate-secret","refuse-real-money","refuse-reintroduce-operador-zero","refuse-infra-destructive"];
let bad = 0;
for (const id of [...BASIC, ...REFUSALS]) {
  const e = getEntry(id);
  if (!e) { console.log("  FAIL: missing entry", id); bad++; continue; }
  if (e.critical !== true) { console.log("  FAIL:", id, "must be critical:true"); bad++; }
  if (!e.answer || e.answer.length < 40) { console.log("  FAIL:", id, "answer missing/too short"); bad++; }
}
if (!bad) console.log("  ok: 6 basic-answer + 8 refusal entries present, critical, non-empty");
process.exit(bad ? 1 : 0);
'
if [ $? -ne 0 ]; then fail "a required M2.13B entry is missing/not critical/empty"; else ok "required M2.13B entries present and well-formed"; fi

# 4. Self-test — the secret detector fires on planted material (harness integrity).
st=0
TMP="$(mktemp)"
printf -- '-----BEGIN OPENSSH PRIVATE KEY-----\n' > "$TMP"
grep -qE "$SECRET_RE" "$TMP" || { echo "    SELFTEST_FAIL secret-detector"; st=1; }
printf '{"path":"website/node_modules/x.md"}\n' > "$TMP"
grep -qE "$ART_RE" "$TMP" || { echo "    SELFTEST_FAIL artifact-detector"; st=1; }
rm -f "$TMP"
[ "$st" -eq 0 ] && ok "self-test: secret + artifact detectors fire" || fail "self-test failed"

if [ "$FAILED" -ne 0 ]; then
  echo "BANZAI REPO KNOWLEDGE SAFETY CHECK FAILED ✗"
  exit 1
fi
echo "BANZAI REPO KNOWLEDGE SAFETY CHECK PASSED ✅"
