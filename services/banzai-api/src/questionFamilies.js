// Increment 5 (§10–§15) — the question families made GROUNDED end to end.
//
// The taxonomy (Inc.2) resolves a question into one of the §10–§15 families; the ToolPlanner (Inc.3) maps it
// to an ordered typed plan; this module EXECUTES that plan's data step(s), collects the tool result(s) into
// the transversal FactualPackage (Inc.4), renders a DETERMINISTIC PT answer drawn from that package, and
// verifies every claim + citation with the SAME Inc.4 verifier before returning. Each answer is built from
// REAL data (the reason-code registry, the receipt store, the canonical corpus) — never a pre-written canned
// string. When the tool/data a family needs is absent, it returns the Inc.2 CONTEXTUAL fallback (honest,
// request-oriented), never a fabricated answer. A boundary/refusal never reaches here (the pipeline settles
// it at Tier 0), and this module double-guards it anyway.
//
// This module is pg-free by construction: the ONE pg-touching step (reading persisted executions for the
// comparison/diagnosis families) is performed by an INJECTED `receiptsTool` the server wires — exactly like
// the telemetry / live-artifact tools. Everything else is the self-contained WASM engine + string building.

import {
  resolveQuery,
  buildFamilyPackage,
  buildFactualPackagePlanned,
  explainReasonCode,
  classifyDiagnosis,
  verifyClaims,
} from "./knowledge.js";

// The §10–§15 families this module routes. A resolution whose primary intent is not here is NOT a family
// question (the pipeline continues to its existing tiers/trunk).
export const FAMILY_INTENTS = new Set([
  "get_reason_code",
  "get_governance_decision",
  "get_version_change",
  "compare_executions",
  "diagnose_failure",
  "get_requirement",
  "get_applicability",
  "evaluate_hypothesis",
  "get_api_guidance",
  "get_security_explanation",
]);

// The families that must NEVER fall through to the documentary trunk (a reason code / a persisted execution
// comparison or diagnosis / a planned version diff is not a documentary explanation) — they always return a
// grounded, clarification or honest-fallback outcome.
const TOOL_BACKED = new Set(["get_reason_code", "compare_executions", "diagnose_failure", "get_version_change"]);

// A short PT phrase naming the family (public-safe) for a clarification/fallback body.
function short(s, n = 480) {
  const t = String(s || "").trim();
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

// Derive the public `sources` list for the answer from the package, restricted to the cited ids. A source can
// come from a documentary fact, a tool result or a live/persisted source — whichever carries the cited id.
function sourcesForCited(pkg, cited) {
  const want = new Set((Array.isArray(cited) ? cited : []).map(String));
  const byId = new Map();
  for (const f of Array.isArray(pkg.facts) ? pkg.facts : []) {
    const s = f.source || {};
    if (s.document_id && want.has(s.document_id) && !byId.has(s.document_id)) {
      byId.set(s.document_id, { id: s.document_id, title: s.title || s.document_id, path: s.path || "" });
    }
  }
  for (const t of Array.isArray(pkg.tool_results) ? pkg.tool_results : []) {
    if (t.source_id && want.has(t.source_id) && !byId.has(t.source_id)) {
      byId.set(t.source_id, { id: t.source_id, title: t.summary || t.source_id, path: "" });
    }
  }
  for (const l of Array.isArray(pkg.live_sources) ? pkg.live_sources : []) {
    if (l.id && want.has(l.id) && !byId.has(l.id)) {
      byId.set(l.id, { id: l.id, title: l.title || l.id, path: l.origin || "" });
    }
  }
  return [...byId.values()];
}

// Verify a composed answer against its package (the Inc.4 claim/citation verifier) and, only if it PASSES,
// return the grounded outcome. A rejection (unsupported claim / unlabelled estimate-hypothesis / dead
// citation / underived calculation) degrades to the honest fallback — the answer is NEVER published.
function finalizeGrounded(family, pkg, answer, claims, cited, extra = {}) {
  if (!pkg || !answer) return { kind: "fallback", family, situation: "insufficient_source" };
  const verification = verifyClaims(pkg, { answer_markdown: answer, claims, cited_source_ids: cited });
  if (!verification || !verification.ok) {
    return { kind: "fallback", family, situation: "insufficient_source", verification };
  }
  return {
    kind: "grounded",
    family,
    answer,
    sources: sourcesForCited(pkg, cited),
    package: pkg,
    claims,
    cited_source_ids: cited,
    reason_code: extra.reason_code || null,
    verification,
  };
}

// ── §10 — reason codes (get_reason_code) ────────────────────────────────────────────────────────────────
// Resolve the reason code the question names from the reason-code registry (reason.rs) and explain it from its
// canonical definition. An unknown code → the contextual fallback that NAMES the family (never a fabrication).
function reasonCodeFamily(question, traceId) {
  const rc = explainReasonCode(question);
  if (!rc || !rc.found) return { kind: "fallback", family: "get_reason_code", situation: "insufficient_source" };
  const toolResult = {
    tool: "REASON_CODE_LOOKUP",
    source_id: "reason-codes",
    title: "Registo de códigos de razão (banzai-query-core/reason.rs)",
    path: "engines/banzai-query-core/src/reason.rs",
    text: `${rc.code} — ${rc.explanation}`,
    kind: "static",
  };
  const pkg = buildFamilyPackage(traceId, question, [toolResult]);
  if (!pkg || !Array.isArray(pkg.facts) || pkg.facts.length === 0) {
    return { kind: "fallback", family: "get_reason_code", situation: "insufficient_source" };
  }
  const clsLabel =
    rc.answer_class === "internal_failure"
      ? " É uma falha interna de cobertura (um defeito a corrigir), nunca uma falta legítima de evidência."
      : "";
  const answer = `O código de razão **${rc.code}** significa: ${rc.explanation}${clsLabel}`;
  const claims = [{ claim: rc.explanation, fact_ids: ["F1"] }];
  return finalizeGrounded("get_reason_code", pkg, answer, claims, ["reason-codes"], { reason_code: rc.code });
}

// ── §11 — comparison (compare_executions) ───────────────────────────────────────────────────────────────
// Two execution operands → the receipt store's field-by-field diff. With one/zero operands the plan already
// inserts a CLARIFICATION; we mirror that. With no receipts tool/data available → the honest fallback.
async function compareFamily(question, resolution, traceId, receiptsTool, contextTargets = [], locale) {
  // Increment 6 — a conversational reference ("compare com a anterior") resolves the two operands in Rust
  // from the prior context; those take precedence over any operand the current phrase names.
  const targets =
    Array.isArray(contextTargets) && contextTargets.length >= 2
      ? contextTargets
      : Array.isArray(resolution.comparison_targets)
      ? resolution.comparison_targets
      : [];
  if (targets.length < 2) {
    return {
      kind: "clarification",
      family: "compare_executions",
      answer: COMPARE_EXECUTIONS_CLARIFICATION[locale] || COMPARE_EXECUTIONS_CLARIFICATION["pt-PT"],
      answer_locale: locale,
    };
  }
  if (!receiptsTool || typeof receiptsTool.compareExecutions !== "function") {
    return { kind: "fallback", family: "compare_executions", situation: "tool_unavailable" };
  }
  let res = null;
  try {
    res = await receiptsTool.compareExecutions(targets);
  } catch {
    res = null;
  }
  if (!res || !res.ok || !res.diff) {
    return { kind: "fallback", family: "compare_executions", situation: "tool_unavailable" };
  }
  const diff = res.diff;
  const aId = res.a_id || diff.a || targets[0];
  const bId = res.b_id || diff.b || targets[1];
  const fmt = (v) => (v === null || v === undefined ? "n/d" : String(v));
  const lines = [];
  const claims = [];
  const addFieldLine = (label, field) => {
    if (!field) return;
    const line = `${label}: A=${fmt(field.a)} · B=${fmt(field.b)}${field.changed ? " (alterado)" : " (igual)"}.`;
    lines.push(line);
    claims.push({ claim: `${label} A vs B`, fact_ids: ["F1"] });
  };
  addFieldLine("Estado geral", diff.overall_status);
  addFieldLine("Prontidão de certificação", diff.certification_readiness);
  const changedSteps = (Array.isArray(diff.steps) ? diff.steps : []).filter(
    (s) => (s.status && s.status.changed) || (s.engine_version && s.engine_version.changed) || (s.output_sha256 && s.output_sha256.changed),
  );
  for (const s of changedSteps) {
    const parts = [];
    if (s.status) parts.push(`estado A=${fmt(s.status.a)} B=${fmt(s.status.b)}`);
    if (s.engine_version) parts.push(`engine_version A=${fmt(s.engine_version.a)} B=${fmt(s.engine_version.b)}`);
    if (s.output_sha256) parts.push(`output_sha256 A=${fmt(s.output_sha256.a)} B=${fmt(s.output_sha256.b)}`);
    lines.push(`Etapa **${s.step_id}**: ${parts.join(" · ")} (alterado).`);
    claims.push({ claim: `etapa ${s.step_id} alterada`, fact_ids: ["F1"] });
  }
  if (changedSteps.length === 0) lines.push("Nenhuma etapa individual difere entre as duas execuções.");

  const diffText = lines.join(" ");
  const toolResults = [
    { tool: "EXECUTION_LOOKUP", source_id: aId, title: `Execução ${aId}`, path: `/banzai/validate/executions/${aId}`, kind: "persisted" },
    { tool: "EXECUTION_LOOKUP", source_id: bId, title: `Execução ${bId}`, path: `/banzai/validate/executions/${bId}`, kind: "persisted" },
    { tool: "COMPARE_EXECUTIONS", source_id: `compare:${aId}:${bId}`, title: "Diferença campo-a-campo", path: "", text: diffText, kind: "persisted" },
  ];
  const pkg = buildFamilyPackage(traceId, question, toolResults);
  if (!pkg || !Array.isArray(pkg.facts) || pkg.facts.length === 0) {
    return { kind: "fallback", family: "compare_executions", situation: "tool_unavailable" };
  }
  const answer = `Comparação entre **${aId}** (A) e **${bId}** (B):\n\n- ${lines.join("\n- ")}`;
  const cited = [`compare:${aId}:${bId}`, aId, bId];
  return finalizeGrounded("compare_executions", pkg, answer, claims, cited);
}

// ── §13 — diagnosis (diagnose_failure) ──────────────────────────────────────────────────────────────────
// A real execution's step receipts + reason codes → the Rust classifier separates observed cause /
// consequence / hypothesis / suggestion (causality only where a receipt supports it). No execution → honest.
async function diagnoseFamily(question, resolution, traceId, receiptsTool, contextTargets = []) {
  if (!receiptsTool || typeof receiptsTool.getExecution !== "function") {
    return { kind: "fallback", family: "diagnose_failure", situation: "tool_unavailable" };
  }
  // Increment 6 — a conversational "porquê?" resolves to the prior execution in Rust; that referenced
  // execution takes precedence over the current phrase's operands (and over the "latest" default).
  const targets =
    Array.isArray(contextTargets) && contextTargets.length
      ? contextTargets
      : Array.isArray(resolution.comparison_targets)
      ? resolution.comparison_targets
      : [];
  const target = targets[0] || "latest";
  let res = null;
  try {
    res = await receiptsTool.getExecution(target);
  } catch {
    res = null;
  }
  if (!res || !res.ok || !res.execution) {
    return { kind: "fallback", family: "diagnose_failure", situation: "understood_data_missing" };
  }
  const execId = res.execution_id || res.execution.execution_id || "";
  const input = {
    execution_id: execId,
    overall_status: res.execution.overall_status || "",
    steps: (Array.isArray(res.steps) ? res.steps : []).map((s) => ({
      step_id: s.step_id,
      status: s.status,
      reason_codes: Array.isArray(s.reason_codes) ? s.reason_codes : [],
    })),
  };
  const report = classifyDiagnosis(input);
  const supported = report.lines.filter((l) => l.supported);
  const hypotheses = report.lines.filter((l) => l.label === "HYPOTHESIS");
  const suggestions = report.lines.filter((l) => l.label === "SUGGESTION");

  // The one grounded fact carries the receipt-backed observations verbatim (drawn from the execution).
  const observedText = supported.map((l) => l.text).join(" ");
  const toolResults = [
    {
      tool: "EXECUTION_LOOKUP",
      source_id: execId,
      title: `Execução ${execId}`,
      path: `/banzai/validate/executions/${execId}`,
      text: observedText,
      kind: "persisted",
    },
  ];
  const pkg = buildFamilyPackage(traceId, question, toolResults);
  if (!pkg || !Array.isArray(pkg.facts) || pkg.facts.length === 0) {
    return { kind: "fallback", family: "diagnose_failure", situation: "understood_data_missing" };
  }
  const sections = [];
  const claims = [];
  const causes = supported.filter((l) => l.label === "OBSERVED_CAUSE");
  const consequence = supported.find((l) => l.label === "CONSEQUENCE");
  if (causes.length) {
    sections.push(`**Causa observada:**\n- ${causes.map((l) => l.text).join("\n- ")}`);
    for (const c of causes) claims.push({ claim: short(c.text, 200), fact_ids: ["F1"] });
  }
  if (consequence) {
    sections.push(`**Consequência:**\n${consequence.text}`);
    claims.push({ claim: short(consequence.text, 200), fact_ids: ["F1"] });
  }
  if (hypotheses.length) {
    // HYPOTHETICAL, explicitly labelled — never asserted as fact. The "Hipótese" heading carries the label.
    sections.push(`**Hipótese:**\n- ${hypotheses.map((l) => l.text).join("\n- ")}`);
    // The claim wording avoids a causal marker on purpose — a HYPOTHETICAL claim must never assert causality;
    // the "Hipótese" heading supplies the required label the verifier checks for.
    claims.push({ claim: "hipótese ilustrativa sobre uma origem não registada no recibo", category: "HYPOTHETICAL" });
  }
  if (suggestions.length) {
    // Recommendations, clearly labelled; not asserted as protocol state (no factual claim).
    sections.push(`**Sugestão:**\n- ${suggestions.map((l) => l.text).join("\n- ")}`);
  }
  const answer = sections.join("\n\n");
  return finalizeGrounded("diagnose_failure", pkg, answer, claims, [execId]);
}

// ── §14 — hypotheses (evaluate_hypothesis) ──────────────────────────────────────────────────────────────
// Answer from the canonical corpus, EXPLICITLY marked as a hypothesis (HYPOTHETICAL), never presented as live
// protocol state. Grounded on the documentary package; the hypothesis framing carries the required label.
function hypothesisFamily(question, traceId) {
  const pkg = buildFactualPackagePlanned(traceId, question, "", "brief");
  if (!pkg || !Array.isArray(pkg.facts) || pkg.facts.length === 0) return { kind: "skip", family: "evaluate_hypothesis" };
  const framing =
    "A tua pergunta é uma **hipótese**. Avalio-a a título **ilustrativo** contra a fonte canónica do " +
    "protocolo — nunca como estado ao vivo:";
  const body = pkg.facts.map((f) => f.text).join(" ");
  const answer = `${framing}\n\n${body}`;
  const claims = [
    { claim: "avaliação a título ilustrativo, não como estado ao vivo do protocolo", category: "HYPOTHETICAL" },
    ...pkg.facts.map((f) => ({ claim: short(f.text, 200), fact_ids: [f.id] })),
  ];
  return finalizeGrounded("evaluate_hypothesis", pkg, answer, claims, pkg.allowed_source_ids);
}

// ── §12/§15 — documentary families (requirement, applicability, api guidance, security, governance) ──────
// Grounded on the canonical corpus (contracts/specs/ADRs/reference/security docs). The answer is composed
// verbatim from the package facts — nothing invented. When nothing grounds, SKIP so the pipeline's existing
// trunk/insufficient logic still runs (never a regression).
const DOCUMENTARY_FRAMING = {
  get_requirement: (r) =>
    r.profile
      ? `Requisitos aplicáveis ao perfil **${r.profile}** (a partir das fontes canónicas do protocolo):`
      : "Requisitos aplicáveis (a partir das fontes canónicas do protocolo):",
  get_applicability: (r) =>
    r.profile
      ? `Aplicabilidade ao perfil **${r.profile}** (a partir das fontes canónicas):`
      : "Aplicabilidade (a partir das fontes canónicas do protocolo):",
  get_api_guidance: () => "Orientação sobre a API/endpoint (a partir dos contratos e specs publicados):",
  get_security_explanation: () => "Modelo de segurança (a partir das fontes canónicas do protocolo):",
  get_governance_decision: () => "Decisão de governação (a partir do registo documental do protocolo):",
};
function documentaryFamily(family, question, resolution, traceId) {
  const pkg = buildFactualPackagePlanned(traceId, question, "", "brief");
  if (!pkg || !Array.isArray(pkg.facts) || pkg.facts.length === 0) return { kind: "skip", family };
  const framing = (DOCUMENTARY_FRAMING[family] || (() => "A partir das fontes canónicas do protocolo:"))(resolution);
  const body = pkg.facts.map((f) => f.text).join(" ");
  const answer = `${framing}\n\n${body}`;
  const claims = pkg.facts.map((f) => ({ claim: short(f.text, 200), fact_ids: [f.id] }));
  const out = finalizeGrounded(family, pkg, answer, claims, pkg.allowed_source_ids);
  // A documentary family that can't verify should SKIP to the trunk rather than decline honestly.
  return out.kind === "grounded" ? out : { kind: "skip", family };
}

// ── §12 — version change (get_version_change) ───────────────────────────────────────────────────────────
// The VERSION_DIFF tool is a PLANNED (not-yet-executable) tool kind (Inc.3). Until it exists the family
// returns an honest, request-oriented fallback that names the request and distinguishes the two authorities
// a version answer must respect: the Reference (normative) vs the Whitepaper (explanatory) — never fabricated.
function versionChangeFamily() {
  return {
    kind: "fallback",
    family: "get_version_change",
    situation: "tool_unavailable",
    override_message:
      "Interpretei o teu pedido como **a versão em que uma regra do protocolo mudou**. A comparação " +
      "determinística entre versões (VERSION_DIFF) ainda não está disponível como ferramenta, por isso não " +
      "invento a versão. Nota: a autoridade normativa é a **Referência** do protocolo (não o Whitepaper, que " +
      "é explicativo). Indica o documento/regra e posso localizar a fonte canónica.",
  };
}

// The single entry point the pipeline calls. Returns:
//   { kind: "grounded", family, answer, sources, package, claims, cited_source_ids, reason_code, verification }
//   { kind: "clarification", family, answer }
//   { kind: "fallback", family, situation, override_message? }   → the pipeline serves the contextual fallback
//   { kind: "skip", family }                                     → the pipeline continues to its next tier
//   null                                                          → not a family question at all
/**
 * The one clarification a question family asks, per locale.
 *
 * Family MATCHING is semantic and locale-independent: which family a question belongs to is a property
 * of the question, not of the reader. Only the sentence changes. Keeping those two apart is why the
 * locale arrives as a presentation input here and never reaches the matcher.
 *
 * Before this, the sentence was a Portuguese string literal with no locale anywhere near it, so an
 * English reader was asked in Portuguese — and stamping `answer_locale: "en"` on it would have recorded
 * a composition that never happened. This is the composition.
 */
const COMPARE_EXECUTIONS_CLARIFICATION = {
  "pt-PT":
    "Interpretei o teu pedido como uma **comparação entre execuções** da jornada de validação, mas não " +
    "indicaste quais: refere-se às **duas últimas execuções**, ou a execuções específicas (indica os " +
    "identificadores exec-…)?",
  en:
    "I read your request as a **comparison between executions** of the validation journey, but you did " +
    "not say which: do you mean the **two most recent executions**, or specific executions (give the " +
    "exec-… identifiers)?",
};

export async function answerQuestionFamily(question, { traceId = "", receiptsTool = null, contextTargets = [], locale } = {}) {
  const resolution = resolveQuery(question) || {};
  const intent = String(resolution.primary_intent || "");
  // A boundary/refusal never reaches a data/act family (double-guard; the pipeline settles it at Tier 0).
  if (resolution.boundary_detected || intent === "boundary_request") return null;
  if (!FAMILY_INTENTS.has(intent)) return null;

  switch (intent) {
    case "get_reason_code":
      return reasonCodeFamily(question, traceId);
    case "compare_executions":
      return compareFamily(question, resolution, traceId, receiptsTool, contextTargets, locale);
    case "diagnose_failure":
      return diagnoseFamily(question, resolution, traceId, receiptsTool, contextTargets);
    case "get_version_change":
      return versionChangeFamily();
    case "evaluate_hypothesis":
      return hypothesisFamily(question, traceId);
    case "get_requirement":
    case "get_applicability":
    case "get_api_guidance":
    case "get_security_explanation":
    case "get_governance_decision":
      return documentaryFamily(intent, question, resolution, traceId);
    default:
      return null;
  }
}

// Whether an intent is one this module OWNS entirely (never falls through to the trunk). Used by the pipeline
// to decide whether a `skip`/absent outcome should continue to the trunk (documentary) or is impossible
// (tool-backed, which always returns grounded/clarification/fallback).
export function isToolBackedFamily(intent) {
  return TOOL_BACKED.has(String(intent || ""));
}
