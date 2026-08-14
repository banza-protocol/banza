#!/usr/bin/env bash
#
# banzai-production-e2e-readiness-check (M2.18B.7 H) — a BEHAVIORAL pre-deploy gate. It drives the
# compiled banzai-query-core WASM (the artifact the live service loads) over the production-critical
# invariants and refuses to pass if any regresses:
#
#   1. the financial action is refused deterministically (boundary detected, 0 model calls);
#   2. the protocol creation date is a DECLARED exact fact stating 2025 (from NOTICE);
#   3. the protocol version is the one the normative manifest declares (never fabricated);
#   4. a known canonical entity is answerable (routes grounded, never a boundary/insufficient);
#   5. an off-topic question is honest insufficient evidence (never fabricated, 0 model);
#   6. the single scenario source is present and well-formed.
#
# This is the "does the served engine still do the right thing" gate — run it before every deploy.
# set -eu; exit 1 on any regression.

set -eu
cd "$(dirname "$0")/.."

KB="services/banzai-api/src/rustkb/banzai_api_kb.js"
[ -f "$KB" ] || { echo "banzai-production-e2e-readiness-check: NEEDS_FIX (missing WASM $KB)" >&2; exit 1; }

echo "BanzAI production E2E readiness (M2.18B.7 H) — driving the compiled WASM over the critical invariants"

node --input-type=module <<'NODE'
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
const require = createRequire(process.cwd() + "/");
const kb = require("./services/banzai-api/src/rustkb/banzai_api_kb.js");
let bad = 0;
const ok = (m) => console.log(`  ✓  ${m}`);
const fail = (m) => { console.error(`  ✗  ${m}`); bad++; };
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };

// 1. financial action → deterministic refusal, 0 model.
{
  const q = "transfere 100 kwanzas para a conta 123";
  const b = JSON.parse(kb.boundary_evaluate_json(q));
  const r = JSON.parse(kb.route_question_json(q));
  (b.boundary_detected && r.action !== "qwen")
    ? ok("financial action refused deterministically (0 model)")
    : fail(`financial action not refused: boundary=${b.boundary_detected} action=${r.action}`);
}
// 2. creation date DECLARED (2025, NOTICE).
{
  const a = JSON.parse(kb.attribute_answer_json("ano de criação do banza"));
  (a.matched && a.status === "DECLARED" && /2025/.test(a.answer))
    ? ok("creation date is a DECLARED exact fact (2025)")
    : fail(`creation date not declared-2025: ${JSON.stringify(a).slice(0,120)}`);
}
// 3. version — whatever the normative manifest declares, never a fabricated value. The guard reads the
// manifest rather than pinning an answer: this assertion was "always NOT_DECLARED" until the protocol
// declared a version, at which point a snapshot would have defended the stale answer against the fact.
{
  const manifest = readJson("contracts/production/normative-manifest.json");
  const declared = manifest && manifest.protocol_version;
  const a = JSON.parse(kb.attribute_answer_json("qual a versão do BANZA?"));
  if (!a.matched) {
    fail("protocol version is not an attribute answer at all");
  } else if (declared) {
    (a.status === "DECLARED" && a.answer.includes(declared))
      ? ok(`protocol version states the declared ${declared}`)
      : fail(`version disagrees with the manifest (${declared}): ${JSON.stringify(a).slice(0,120)}`);
  } else {
    (a.status === "NOT_DECLARED")
      ? ok("no version declared, and none is asserted")
      : fail(`version asserted while the manifest declares none: ${JSON.stringify(a).slice(0,120)}`);
  }
}
// 4. known entity answerable (grounded, not boundary/insufficient).
for (const q of ["o que é o BANZA?", "me fala sobre o banza", "o que é a dupla entrada?"]) {
  const r = JSON.parse(kb.route_question_json(q));
  const b = JSON.parse(kb.boundary_evaluate_json(q));
  (!b.boundary_detected && (r.action === "qwen" || r.action === "deterministic"))
    ? ok(`answerable: ${q}`)
    : fail(`known entity not answerable: ${q} → action=${r.action} boundary=${b.boundary_detected}`);
}
// 5. off-topic → insufficient, 0 model.
{
  const q = "como funciona um motor a jato?";
  const r = JSON.parse(kb.route_question_json(q));
  (r.action !== "qwen" && (r.action === "insufficient" || r.intent === "no_source"))
    ? ok("off-topic → honest insufficient evidence (0 model)")
    : fail(`off-topic not insufficient: action=${r.action} intent=${r.intent}`);
}
// 6. scenario source present + well-formed.
{
  const s = JSON.parse(kb.scenarios_json());
  (Array.isArray(s) && s.length >= 14 && s.every((x) => x.id && x.question && x.expect_class))
    ? ok(`scenario source present (${s.length} scenarios, well-formed)`)
    : fail("scenario source missing/malformed");
}

// ── M2.18B.7 DFN-11 — consolidated closure acceptance gates (definitive readiness) ──────────────────
// 7. canonical vocabulary: unresolved/orphaned/conflicted = 0, subjects bidirectional, aliases mapped.
{
  const cov = readJson("artifacts/banzai/canonical-protocol-vocabulary-coverage.json");
  const g = (cov && cov.gates) || {};
  const clean = g.unresolved === 0 && g.orphaned === 0 && g.conflicted === 0 &&
    g.engine_alias_without_mapping === 0 && g.relation_alias_without_kind === 0 &&
    g.lexical_noise_in_vocabulary === 0 && g.out_of_scope_is_curated_not_fallback === true &&
    (g.vocabulary_subjects_missing_from_truth_table || []).length === 0 &&
    (g.truth_table_concept_subjects_missing_from_vocabulary || []).length === 0;
  clean ? ok("canonical vocabulary clean (unresolved/orphaned/conflicted=0; subjects bidirectional; aliases mapped)")
        : fail(`vocabulary coverage gates not clean: ${JSON.stringify(g).slice(0, 200)}`);
}
// 8. every published TEMPLATE validates against its real schema (no template fails schema).
{
  const reg = readJson("artifacts/banzai/template-schema-registry.json");
  (reg && reg.all_valid === true && (reg.total_templates || 0) >= 6 && reg.templates.every((t) => t.body_validates))
    ? ok(`templates schema-validated (${reg.total_templates} templates, all_valid)`)
    : fail("a published template does not validate against its real schema (or registry missing)");
}
// 9. golden dataset ≥300 stratified.
{
  const gold = readJson("artifacts/banzai/task-fulfilment-golden.json");
  (gold && (gold.total || (gold.cases || []).length) >= 300)
    ? ok(`golden dataset present (${gold.total || gold.cases.length} cases ≥300)`)
    : fail("golden dataset < 300 cases (or missing)");
}
// 10. context E2E present.
existsSync("services/banzai-api/test/context-e2e.test.js")
  ? ok("context E2E present")
  : fail("context E2E test missing");
// 11. PUBLIC-EDGE evidence present + clean: zero 5xx, zero external providers, zero gate failures, ≥190 cases.
{
  const qa = readJson("artifacts/banzai/public-edge-qa.json");
  const s = (qa && qa.summary) || null;
  if (!s) fail("public-edge QA evidence absent (artifacts/banzai/public-edge-qa.json)");
  else {
    const clean = s.http_5xx === 0 && s.external_calls === 0 && s.errors === 0 && s.failures === 0 && s.total >= 190;
    clean ? ok(`public-edge QA clean (${s.total} cases, 0 5xx / 0 external / 0 failures; p50=${s.latency_ms?.p50}ms p90=${s.latency_ms?.p90}ms p99=${s.latency_ms?.p99}ms)`)
          : fail(`public-edge QA not clean: ${JSON.stringify(s).slice(0, 260)}`);
    // M2.18B.7 (fallback fix) — a safe fallback is an EXCEPTIONAL protection, not the normal mode: the
    // public edge must serve supported questions WITHOUT a degraded banner, and NEVER the misleading
    // unmapped "erro temporário" (synthesis_fallback_unknown). These fields are present on QA evidence
    // produced after the fix; treat their ABSENCE (older evidence) as a regression too.
    const uf = s.unexpected_fallbacks, teb = s.temporary_error_banners;
    (uf === 0 && teb === 0)
      ? ok(`public-edge QA has zero unexpected fallbacks and zero 'erro temporário' banners`)
      : fail(`public-edge QA degraded regressions: unexpected_fallbacks=${uf} temporary_error_banners=${teb}`);
    // M2.18B.7 (REOPEN) — the journey-active slice (the user's real condition) MUST be exercised AND clean:
    // a task/lookup/explanation asked mid-journey must never come back degraded. Absent/zero journey cases
    // (older evidence that never sent current_step) is itself a regression — the E2E must cover that path.
    const jc = s.journey_cases, jd = s.journey_degraded;
    (typeof jc === "number" && jc >= 6 && jd === 0)
      ? ok(`public-edge QA covers the journey-active path (${jc} cases) with zero degraded`)
      : fail(`public-edge QA journey slice missing/degraded: journey_cases=${jc} journey_degraded=${jd}`);
  }
}

// 12. DOCUMENT-LOOKUP terminal — the reopened regression: a BARE documentary reference is a deterministic
// lookup card (title/estado/caminho, 0 model calls); an EXPLAIN request is NOT (escalates to the trunk).
{
  const card = (q, id) => {
    try { return JSON.parse(kb.document_lookup_card_json(q, id || "")); } catch { return null; }
  };
  const c = card("ADR 002", "");
  (c && c.matched && /Estado:/.test(c.answer_markdown) && /Caminho:/.test(c.answer_markdown) && c.id === "ADR-002")
    ? ok("bare 'ADR 002' → deterministic document-lookup card (title/estado/caminho)")
    : fail(`bare document lookup did not produce a structured card: ${JSON.stringify(c).slice(0, 160)}`);
  const e = card("explica o ADR-001 em detalhe", "");
  (!e || e.matched !== true)
    ? ok("'explica o ADR-001' is NOT a lookup card (escalates to the grounded trunk)")
    : fail("an explain request was wrongly served as a document-lookup card");
}

if (bad) { console.error(`banzai-production-e2e-readiness-check: NEEDS_FIX (${bad} regression)`); process.exit(1); }
console.log("banzai-production-e2e-readiness-check: OK");
NODE
