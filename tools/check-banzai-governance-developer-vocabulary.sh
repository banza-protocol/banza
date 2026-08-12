#!/usr/bin/env bash
# banzai-governance-developer-vocabulary-check (M2.14C, Part 19).
#
# The governance / documentation / engineering vocabulary of the repo (ADR, RFC, spec, schema, contract,
# invariant, guard, CI, PR, issue, release, changelog, runbook, rollback, maintainer, governance, audit
# report) resolves DETERMINISTICALLY with cited sources — never no_source, never the flaky model — while
# a record/process/check is NEVER an authority (an ADR does not certify; a guard is not bypassable; CI is
# not a red merge; a PR is not `--admin` over red CI). Drives the committed routing engine via node.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"
FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok()   { echo "  ok: $*"; }

KB="services/banzai-api/src/knowledge.js"
GLOSSARY="engines/banzai-query-core/src/glossary.rs"
DOC="docs/reference/PROTOCOL_GOVERNANCE_GLOSSARY.md"

echo "== banzai-governance-developer-vocabulary-check (M2.14C) =="

# Static — the layer exists.
[ -f "$DOC" ] && ok "governance glossary doc present" || fail "$DOC missing"
grep -q "fn is_governance_vocabulary_query" "$GLOSSARY" && ok "Rust is_governance_vocabulary_query present" \
  || fail "$GLOSSARY must expose is_governance_vocabulary_query"
for id in def-adr def-rfc def-spec def-guard def-ci def-pr def-issue def-release def-changelog def-runbook def-rollback def-maintainer def-governance def-audit-report; do
  grep -q "id: \"$id\"" "$KB" && ok "entry $id present" || fail "$KB missing entry $id"
done

# Behavioural — drives the engine (node available in CI).
if command -v node >/dev/null 2>&1; then
  OUT=$(node --input-type=module -e '
    import { route, normalize, getEntry, classifyQueryIntent } from "./services/banzai-api/src/knowledge.js";
    const deacc = (s) => String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
    let bad = 0;
    const emit = (okk, msg) => { console.log((okk ? "OK " : "BAD ") + msg); if (!okk) bad++; };
    const ans = (q) => { const d = route(normalize(q)); const e = d.entry_id ? getEntry(d.entry_id) : null; return { action: d.action, intent: d.intent, entry: d.entry_id, a: deacc(e && e.answer), sources: e && e.sources }; };
    // (1-17) never no_source; always deterministic + sourced.
    const TERMS = ["o que é uma ADR","ADR","what is an ADR","o que é RFC","what is an RFC","o que é uma spec","o que é schema","o que é contract","o que é invariant","o que é guard","what is a guard","o que é CI","o que é PR","o que é issue","o que é release","o que é changelog","o que é governance","o que é maintainer","o que é runbook","o que é rollback","o que é um audit report"];
    for (const q of TERMS) {
      const c = ans(q);
      emit(c.action === "deterministic" && c.entry && c.entry.startsWith("def-") && (c.sources||[]).length>0,
        q + " → deterministic def-* with sources (got " + c.action + "/" + (c.entry||"-") + ")");
    }
    // (18) ADR never claims certification/approval/licence.
    { const a = ans("o que é uma ADR").a; emit(a.includes("nao certifica") || (a.includes("nao") && a.includes("certifica")), "ADR: not certification"); }
    // (19) guard never suggests a security bypass.
    { const a = ans("o que é guard").a; emit(a.includes("nao") && (a.includes("contornad") || a.includes("bypass") || a.includes("recusad") || a.includes("nao deve ser")), "guard: not bypassable"); }
    // (20) CI never suggests merging with red checks.
    { const a = ans("o que é CI").a; emit(a.includes("vermelho") || a.includes("red") || a.includes("recusad"), "CI: no red-merge"); }
    // (21) PR never suggests --admin over red CI.
    { const a = ans("o que é PR").a; emit(a.includes("vermelho") || a.includes("--admin") || a.includes("recusad"), "PR: no admin-over-red"); }
    // (22) a deterministic vocab entry never calls the model.
    for (const q of ["ADR","o que é guard","o que é CI"]) { const c = ans(q); emit(c.action !== "qwen", q + " does not call Qwen"); }
    // (24) the deterministic answers cite governance/decision/CI surfaces (not just CLAUDE.md).
    { const c = ans("o que é uma ADR"); const paths = (c.sources||[]).map(s=>(s.path||"")+ " "+(s.id||"")).join(" ").toLowerCase();
      emit(/adr|governance/.test(paths), "ADR cites decision/governance surfaces"); }
    console.log(bad === 0 ? "NODE_OK" : ("NODE_BAD:"+bad));
  ' 2>&1) || true
  echo "$OUT" | sed 's/^/    /'
  echo "$OUT" | grep -q "NODE_OK" && ok "governance vocabulary resolves deterministically + safely" \
    || fail "governance vocabulary behavioural check failed"

  # Self-test — a bare governance term is a governance-vocabulary query; a plain word is not.
  node --input-type=module -e '
    import { route, normalize } from "./services/banzai-api/src/knowledge.js";
    if (route(normalize("ADR")).action !== "deterministic") { console.error("SELFTEST: ADR not deterministic"); process.exit(2); }
    if (route(normalize("o que é um invariante financeiro?")).entry_id === "def-invariant") { console.error("SELFTEST: financial invariant wrongly captured"); process.exit(2); }
  ' && ok "self-test: gate scoped correctly" || { echo "SELFTEST FAILED"; FAILED=1; }
else
  ok "node unavailable — static checks only"
fi

echo
if [ "$FAILED" -eq 0 ]; then echo "GOVERNANCE/DEVELOPER VOCABULARY CHECK PASSED ✅"; else echo "GOVERNANCE/DEVELOPER VOCABULARY CHECK FAILED ✗"; fi
exit "$FAILED"
