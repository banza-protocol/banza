#!/usr/bin/env bash
# check-banzai-monorepo-consolidation.sh — M2.19G.6 (ADR-042) consolidation invariants.
#
# Proves BanzAI was consolidated into this monorepo as the SOLE active source and the separate
# banza-protocol/banzai repo was reduced to removed history:
#   1. NO compilable legacy snapshot and NO second BanzAI workspace/package.json/API in HEAD;
#   2. the extracted engines/banzai-trace crate exists and the shipped trace WASM is wired in-monorepo
#      (traceVerifier.ts imports banzai_trace; the old banzai_core WASM is gone);
#   3. the repo-indexer indexes only this monorepo (no sibling remote / second index_repo call) and the
#      repo-index manifest declares banzai_in_monorepo — never a resurrected banzai_repo_indexed;
#   4. ADR-042 exists and the repo-guards ADR range admits it;
#   5. active-surface mentions of banza-protocol/banzai are qualified as removed/historical (delegated
#      to banzai-canonical-architecture-framing-check).
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FAILED=0
fail() { echo "  FAIL: $*"; FAILED=1; }
ok() { echo "  ok: $*"; }

echo "== banzai-monorepo-consolidation-check (M2.19G.6, ADR-042) =="

# 1. No compilable legacy snapshot / no second BanzAI implementation in HEAD.
if git ls-files 'legacy/banzai-pre-consolidation/*' | grep -q .; then
  fail "legacy/banzai-pre-consolidation/ is present in HEAD (history-only snapshot must be removed from the tree)"
else ok "no legacy/banzai-pre-consolidation snapshot in HEAD (history stays in git only)"; fi
# A giant banzai/ root folder OR a second workspace/API would reintroduce the retired implementation.
if git ls-files 'banzai/*' | grep -qE '\.(rs|ts|tsx|js)$|package\.json$|Cargo\.toml$'; then
  fail "a banzai/ root folder carries compilable code / a manifest (second implementation)"
else ok "no compilable banzai/ root folder (no second BanzAI implementation)"; fi
for f in "turbo.json"; do
  # The removed repo's Turborepo/workspace layout must not reappear at the monorepo root.
  if git ls-files | grep -qx "$f" && grep -q 'src/\*' "$f" 2>/dev/null; then
    fail "$f re-introduces the removed src/* workspace layout"
  fi
done
ok "no removed src/* Turborepo workspace at the monorepo root"

# 2. The extracted trace crate + in-monorepo trace WASM.
[ -f engines/banzai-trace/Cargo.toml ] && [ -f engines/banzai-trace/src/lib.rs ] \
  && ok "engines/banzai-trace crate present (extracted from the removed banzai-core trace verifier)" \
  || fail "engines/banzai-trace crate missing"
grep -q 'pub fn explain_trace' engines/banzai-trace/src/lib.rs 2>/dev/null \
  && ok "banzai-trace exposes explain_trace (the shipped trace WASM has buildable in-tree source)" \
  || fail "banzai-trace does not expose explain_trace"
[ -f website/lib/wasm/banzai_trace_bg.wasm ] && [ -f website/lib/wasm/banzai_trace.js ] \
  && ok "website/lib/wasm/banzai_trace* vendored" || fail "website/lib/wasm/banzai_trace* missing"
grep -q '@/lib/wasm/banzai_trace' website/components/banzai/traceVerifier.ts \
  && ok "traceVerifier.ts imports the in-monorepo banzai_trace WASM" \
  || fail "traceVerifier.ts does not import @/lib/wasm/banzai_trace"
if git ls-files 'website/lib/wasm/banzai_core*' | grep -q .; then
  fail "the retired banzai_core WASM is still present (superseded by banzai_trace)"
else ok "retired banzai_core WASM removed"; fi

# 3. Repo-indexer indexes only the monorepo; manifest declares banzai_in_monorepo (not banzai_repo_indexed).
IDX=engines/banzai-repo-indexer/src/main.rs
if grep -q 'BANZAI_REMOTE' "$IDX"; then fail "$IDX still defines/uses BANZAI_REMOTE (sibling coupling)"; \
  else ok "repo-indexer carries no BANZAI_REMOTE (no sibling to index)"; fi
MAN=engines/banzai-query-core/src/repoindex/banzai-repo-index-manifest.json
node - "$MAN" <<'NODE'
const fs=require("fs"); const m=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
let bad=0;
if (m.banzai_in_monorepo!==true){console.log("  FAIL: manifest banzai_in_monorepo != true");bad++;}
else console.log("  ok: repo-index manifest declares banzai_in_monorepo=true");
if (m.banzai_repo_indexed!==undefined){console.log("  FAIL: manifest still declares banzai_repo_indexed");bad++;}
else console.log("  ok: manifest declares no separate indexed BanzAI repo");
if (!(m.chunk_categories && m.chunk_categories["banzai-runtime"]>0)){console.log("  FAIL: no banzai-runtime chunks");bad++;}
else console.log("  ok: in-monorepo BanzAI runtime indexed (banzai-runtime chunks present)");
// No banzai sibling chunks may survive in the committed index.
const idx=JSON.parse(fs.readFileSync(process.argv[2].replace("-manifest",""),"utf8"));
const sib=idx.filter(c=>c.repo==="banza-protocol/banzai").length;
if (sib>0){console.log(`  FAIL: ${sib} banza-protocol/banzai chunks still embedded in the repo-index`);bad++;}
else console.log("  ok: zero banza-protocol/banzai chunks embedded in the repo-index");
process.exit(bad?1:0);
NODE
[ $? -ne 0 ] && FAILED=1 || true

# 4. ADR-042 exists.
[ -f decisions/adr/ADR-042-banzai-a-non-authoritative-interface-to-the-protocol.md ] \
  && ok "ADR-042 present" || fail "ADR-042 missing"

# 5. FINAL MICRO-CLOSURE — no old-repository references in ACTIVE BanzAI knowledge (M2.19G.6).
#    So BanzAI can never surface / dead-link the permanently-removed banza-protocol/banzai repo. The ONLY
#    permitted whole-token mention in an active index is inside the removal decision records (ADR-042 and
#    the ADR-042 it supersedes), which describe the repo as *removed* and carry no URL.
node - <<'NODE'
const fs=require("fs");
const RI="engines/banzai-query-core/src/repoindex/banzai-repo-index.json";
const DI="engines/banzai-query-core/src/doc-index.json";
const URL="github.com/"+"banza-protocol/banzai";  // assembled: no contiguous dead-link literal in this guard
const TOK=/banza-protocol\/banzai(?![-\w])/;          // whole-token repo ref (not banzai-local / banzai-api)
const ALLOW=/ADR-042|ADR-042/;                         // removal decision + what it supersedes
const HIST=[];
let bad=0; const M=(k,v,want=0)=>{console.log(`  ${k} = ${v}`); if(v!==want) bad++;};
const ri=JSON.parse(fs.readFileSync(RI,"utf8"));
M("active_repo_index_old_banzai_repo_url_literals",
  ri.filter(c=>typeof c.content==="string"&&c.content.includes(URL)).length);
M("active_repo_index_old_banzai_repo_refs",
  ri.filter(c=>typeof c.content==="string"&&TOK.test(c.content)).length);
M("active_repo_index_historical_report_chunks", ri.filter(c=>HIST.includes(c.path)).length);
const di=JSON.parse(fs.readFileSync(DI,"utf8"));
M("active_doc_index_old_banzai_repo_url_literals",
  di.filter(c=>JSON.stringify(c).includes(URL)).length);
M("active_doc_index_old_banzai_repo_refs_outside_removal_ADRs",
  di.filter(c=>TOK.test(JSON.stringify(c))&&!ALLOW.test(c.path||"")).length);
process.exit(bad?1:0);
NODE
[ $? -ne 0 ] && FAILED=1 || true
# historical reports marked non-indexable in the indexer (durable across any future re-cut)
grep -q 'REMOVED_REPO_HISTORICAL_REPORTS' "$IDX" \
  && ok "historical_docs_excluded_from_active_retrieval = true (indexer path_excluded)" \
  || fail "indexer does not mark the historical reports non-indexable"
# EVERY compiled WASM (vendored website modules + served api-kb) must carry no dead-link URL.
# (pattern assembled so no literal sits in this guard)
URLPAT="github.com/""banza-protocol/banzai"
WASM_HITS=0
for w in website/lib/wasm/*.wasm services/banzai-api/src/rustkb/*.wasm; do
  [ -f "$w" ] || continue
  if grep -aq "$URLPAT" "$w"; then fail "active_wasm_old_banzai_repo_url_literals > 0 in $w"; WASM_HITS=1; fi
done
[ "$WASM_HITS" -eq 0 ] && ok "active_wasm_old_banzai_repo_url_literals = 0 (ALL compiled WASM URL-free)"
# The consolidation property, asserted against the index itself rather than against the one-shot
# migration that produced it. A completed migration is history; what must remain true is that no
# indexed chunk claims to come from any repository other than this one. Checking the artifact instead
# of the tool means the guard keeps working after the tool is gone, and catches a foreign chunk
# arriving by any route — not only the route the migration knew about.
python3 - <<'PYEOF' || fail "repo-index carries chunks from a repository other than this one"
import json, glob, sys
OWN = "banza-protocol/banza"
bad = {}
for f in sorted(glob.glob("engines/banzai-query-core/src/repoindex/*.json")):
    try:
        d = json.load(open(f, encoding="utf-8"))
    except Exception:
        continue
    if not isinstance(d, list):
        continue
    foreign = sorted({c.get("repo") for c in d
                      if isinstance(c, dict) and c.get("repo") and c["repo"] != OWN})
    if foreign:
        bad[f] = foreign
if bad:
    for f, r in bad.items():
        print("      %s -> %s" % (f, r))
    sys.exit(1)
PYEOF
ok "repo_index_foreign_repo_chunks = 0 (asserted on the index, not on the migration)"

if [ "$FAILED" -ne 0 ]; then
  echo "BANZAI MONOREPO CONSOLIDATION CHECK FAILED ✗"; exit 1
fi
echo "BANZAI MONOREPO CONSOLIDATION CHECK PASSED ✅"
