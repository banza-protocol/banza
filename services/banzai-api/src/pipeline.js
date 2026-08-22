// Answer pipeline for BanzAI — the SINGLE production answer pipeline (M2.18B.4).
//
// Central invariant: exact facts are CONFIRMED by Rust; explanations are PRODUCED by Qwen and VALIDATED by
// Rust; there is a SINGLE explanatory path. The Rust routing policy (knowledge.route + knowledge.answerClass
// + knowledge.buildTerminal) decides, per QUESTION INTENT, between a controlled typed TERMINAL and the one
// explanatory trunk. The UI is a pure renderer — it never decides terminal type, value, source or routing.
//
//   ── controlled Rust TERMINALS (no model) ─────────────────────────────────────────────────────────
//   safety refusal        — injection / system-prompt / chain-of-thought / boundary / financial action
//   canonical definition  — a source-bound curated definition/critical-boundary entry (model-free)
//   exact fact            — status/date/identifier/version/license/origin, Rust-confirmed + source-bound
//   journey next-step     — composed deterministically in Rust
//   clarification         — ambiguous → ask, never silently pick
//   insufficient evidence — no canonical source → decline (never a guess)
//   operational failure   — the trunk could not publish → a degraded, true, sourced grounding
//
//   ── the SINGLE explanatory trunk (the grounded synthesis; the ONLY model call path) ───────────────
//   Rust boundary preflight → Rust resolution (intent + entity, SEEDED when the router already resolved a
//   document/concept) → retrieval+rerank → FactualPackage → the ONE grounded synthesis → Rust factual
//   validation → public answer. A mixed exact+explanatory request ESCALATES to the trunk (never a partial
//   exact answer). The invariant: Rust understands, routes and grounds; the model explains once; Rust
//   validates before publishing.
//
// Every /ask produces a safe usage record: provider, routing intent, terminal kind / answer class, cache
// hit/miss, synthesis trace, fallback reason — never keys, secrets or full payloads.

import { GUARDRAILS } from "./provider.js";
import { operationalDomain } from "./operationalDomain.js";
import { composeTasked } from "./taskedRealizations.js";
import { normalize, retrieve, CORPUS_HASH, REPO_INDEX_HASH, SAFETY_POLICY_VERSION, contractVersions, validateResponse, route, routeWithJourney, getEntry, resolveDocument, resolveConcept, resolveScope, resolveOperationalMetric, resolveQuery, resolveReferences, comparisonPlan, hybridPlan, contextualFallback, answerClass, buildTerminal, queuePriority, queueShouldDedup, recoverQuery, coveredEntities, isVerbatimEntry, attributeAnswer, taskedAnswer, documentLookup, contextUsedFor, buildOperationalPackage, verifyClaims, answerFor, unavailableRealization, LOCALES, DEFAULT_LOCALE } from "./knowledge.js";
import { honestLiveFailureAnswer } from "./liveArtifact.js";
import { isPublicSource } from "./answerContract.js";

/**
 * The sources a PUBLIC answer may rest on.
 *
 * Eligibility is a property of the source, carried in its own metadata — not of its filename. The rule
 * exists because a source that reaches the answer object has already counted as evidence for it; a filter
 * further downstream hides that fact rather than preventing it.
 */
export function publicSourcesOnly(list) {
  return (Array.isArray(list) ? list : []).filter((s) => isPublicSource(s));
}

// Increment 5 (§10–§15) — the question-family handler (pg-free; the ONE persisted-read step is the injected
// receiptsTool). It routes a resolved §10–§15 family through its ToolPlanner plan → tool execution → the
// transversal FactualPackage → a deterministic PT renderer → the Inc.4 claim/citation verifier.
import { answerQuestionFamily } from "./questionFamilies.js";

// M2.18B.6 (§14) — the Rust-owned single-contract version token bound into every grounded answer's cache
// key. A change to the FactualPackage schema, the synthesis prompt contract, or the factual-validator
// policy changes this token, so no stale-contract answer can ever be served from cache. Computed once.
const CV = contractVersions();
const CONTRACT_VERSION_KEY = `fp${CV.factual_package_version}|pr${CV.prompt_version}|vp${CV.validator_policy_version}`;
// M2.19G.5C (ADR-036) — the post-synthesis authority-validator POLICY version, bound into the
// grounded cache key alongside CONTRACT_VERSION_KEY. Tightening the validator (validate.rs rule set 1–20 +
// the citation/contradiction gate checks 21–22) bumps this token, so every grounded answer validated under
// the prior policy is evicted from the cache and re-validated under the current one. Bump on any change to
// the validate.rs rule set or the gate below.
const POST_VALIDATION_POLICY_VERSION = "pv1-adr073-authority20+cite+contradiction";
// The grounded-synthesis runtime is the SINGLE explanatory trunk, plus its gate kept ONLY for the model
// artifact/timeout and the auto-rollback circuit breaker (a tripped breaker degrades to the safe emergency
// grounding). Exactly one model call per explanation; every other decision is Rust-owned.
import { runGroundedSynthesis, synthesisContractVersion } from "./grounded-synthesis.js";
import { createSynthesisGate } from "./synthesisGate.js";
import { ExactCache, SemanticCache } from "./cache.js";
import { BudgetTracker, estimateTokens } from "./limits.js";
// SPR-2 — the typed progressive-response contract (Rust-owned via the committed WASM). The pipeline emits
// the Channel-A progress events at the REAL stage boundaries through the injected onProgress callback; it
// never emits a terminal FINAL_VALIDATED/HONEST_FALLBACK/REFUSED itself (the SSE endpoint decides + emits
// the terminal AFTER the mandatory ADR-036 + Inc.4 validation, carrying the finished /ask envelope). There
// is NO model-token/delta event kind. progressDisposition() maps a finished {result,meta} to the typed
// Rust disposition + the terminal event kind, so the stream reacts to response_disposition, not `grounded`.
import { responseDisposition, terminalEventForDisposition, makeProgressEvent } from "./progressContract.js";

// Increment 2 (§2) — the fixed topic-list fallback is RETIRED from EVERY active route, including the Tier-0
// safety-refusal terminal. A refusal is now a GENUINE refusal (a clear, honest boundary statement), never a
// generic list of topics — which both eliminates the list integrally AND strengthens the refusal (a topic
// list is a weak, confusing decline). Per the safety golden rule the refusal is never softened: naming an
// artifact/journey never buys a way past the gate, it leaks nothing (system prompt / reasoning / secrets),
// and it claims no authority. Non-boundary declines use the Rust-authored CONTEXTUAL fallback instead
// (see `contextualInsufficient` + engines/banzai-query-core/src/taxonomy.rs).
const SAFETY_REFUSAL_MESSAGE =
  "Esse pedido está fora dos limites do BanzAI. O BanzAI explica o protocolo BANZA e demonstra conformidade — " +
  "não executa operações, não revela o seu funcionamento interno nem segredos, e não redefine as regras do " +
  "protocolo. Reformule como uma pergunta sobre o protocolo ou sobre uma operação pública de validação.";

// Post-response validation is RUST (engines/banzai-api-kb → validateResponse): the
// deterministic last line of defence AFTER any completion (hosted or local Qwen). It
// blocks a model that claims normative authority, invents protocol state (certified
// operators, live certification, BANZA approves/licenses/moves funds, BanzAI decides,
// the model as a normative source), or leaks the system prompt / key material /
// chain-of-thought. This thin wrapper keeps the pipeline's call site stable.
export function postValidate(text) {
  return validateResponse(text);
}

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Increment 6 (§16-§17) — sanitize a single carried-forward context field to a SAFE technical token. Only
// ids/enums survive: letters, digits and `._:-`, capped. NEVER free text, PII, secrets or model prose.
function safeCtxId(s, max = 80) {
  return typeof s === "string" ? s.replace(/[^A-Za-z0-9._:-]/g, "").slice(0, max) : "";
}
// BZCI-2 — a short human SUBJECT label for the /ask meta ("RFC", "federação"): unicode letters/digits +
// spaces and a little punctuation only; never prose, HTML, quotes or angle brackets. Capped short.
function safeCtxSubjectMeta(s, max = 48) {
  return typeof s === "string" ? s.replace(/[^\p{L}\p{N} ._:-]/gu, "").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

// Increment 6 (§16-§17) — build the NEW, SAFE, technical-only conversation_context the /ask meta returns so
// the client can carry it to the next turn. It merges the prior context (carry-forward) with what the CURRENT
// turn deterministically established (the resolved entity/artifact/scope + the referent ids Rust resolved).
// It contains ONLY the whitelisted technical fields — no free text, no PII, no secrets, none of the model's
// prose. This is the client-carried context store (there is no server-side PII session store).
export function buildForwardContext(prior, scope, resolution, references, hints = {}) {
  const p = prior && typeof prior === "object" ? prior : {};
  const s = scope && typeof scope === "object" ? scope : {};
  const r = resolution && typeof resolution === "object" ? resolution : {};
  const ref = references && typeof references === "object" ? references : {};
  const h = hints && typeof hints === "object" ? hints : {};
  const entityId = safeCtxId(s.entity_id);
  const entityType = String(s.entity_type || "");
  let operator_id = safeCtxId(ref.operator_id || p.operator_id);
  let implementation_id = safeCtxId(ref.implementation_id || p.implementation_id);
  if (entityId) {
    // A newly-named ecosystem entity this turn binds the forward operator/implementation slot.
    if (entityType === "operator") operator_id = entityId;
    else implementation_id = entityId; // implementation (e.g. operator-zero) or generic
  }
  const targets = Array.isArray(ref.comparison_targets) ? ref.comparison_targets : [];
  const execution_id = safeCtxId(ref.execution_id || p.execution_id);
  const previous_execution_id = safeCtxId(targets[1] || p.previous_execution_id);
  const scopeArtifact = s.artifact_type && s.artifact_type !== "none" ? s.artifact_type : "";
  // BZCI-2 (§2) — the documentary/conceptual dimension carried forward so the NEXT turn can inherit the
  // subject + intent of THIS one (the ADR→RFC→"qual a diferença?" chain). Derived from the current turn's
  // typed resolution (subject/entities/metric) + what the reference resolver bound. Safe labels only.
  const entities = Array.isArray(r.entities) ? r.entities : [];
  const docFromEntities = entities.find((e) => /^(ADR|RFC)[- ]?\d{1,4}$/i.test(String(e || ""))) || "";
  const last_document_id = safeCtxId(docFromEntities || h.document_id || (s.entity_type === "document" ? entityId : "") || p.last_document_id);
  const last_metric = safeCtxId(r.metric_type || h.metric || p.last_metric);
  // The subject label is a short human phrase (accents kept) — prefer the caller's HINT (e.g. the concept a
  // def-* deterministic terminal grounded, which the taxonomy classifier is blind to), then this turn's typed
  // resolution, then the reference resolver's, then carry forward.
  const rawSubject = String(h.subject || r.subject || ref.resolved_subject || "").trim();
  const last_subject = rawSubject ? rawSubject.slice(0, 48) : String(p.last_subject || "");
  // A concept/glossary deterministic terminal (def-*) grounds an "explain_concept" answer even though the
  // taxonomy classifier reports "unsupported" for the bare "o que é X?" phrasing — so prefer the hint, and
  // never carry "unsupported" forward as an intent (it would mislabel the next turn's inheritance).
  const rIntent = r.primary_intent && r.primary_intent !== "unsupported" ? r.primary_intent : "";
  const hintIntent = typeof h.intent === "string" ? h.intent : "";
  let last_subject_kind = "";
  if (last_document_id) last_subject_kind = "document";
  else if (rawSubject) last_subject_kind = "concept";
  else if (entityId) last_subject_kind = "entity";
  else if (last_metric) last_subject_kind = "metric";
  else last_subject_kind = String(p.last_subject_kind || "");
  return {
    operator_id,
    implementation_id,
    execution_id,
    previous_execution_id,
    artifact: safeCtxId(ref.artifact || scopeArtifact || p.artifact),
    profile: safeCtxId(r.profile || p.profile),
    environment: safeCtxId(r.environment || p.environment),
    protocol_version: safeCtxId(r.protocol_version || p.protocol_version),
    last_intent: safeCtxId(hintIntent || rIntent || ref.resolved_intent || p.last_intent),
    last_family: safeCtxId(p.last_family),
    // BZCI-2 documentary/conceptual slots. (observed_at — a freshness timestamp — is intentionally NOT stamped
    // here: it would make the /ask meta non-deterministic; freshness re-consultation is a later increment. The
    // field survives in the sanitizer/type for a client-carried value, but the backend never mints one.)
    last_subject,
    last_subject_kind,
    last_document_id,
    last_metric,
    // ── SEMANTIC REFERENTS (structured identity, not prose) ────────────────────────────────────────
    //
    // `last_subject` above is a human LABEL — "ledger", "federação". It reads well in a trace and it is
    // the wrong thing to resolve a follow-up against: two entries can share a label, a label can be
    // truncated, and recovering an identity from it means guessing. These carry the IDENTITY the
    // previous turn actually resolved, so the next turn consumes what routing decided rather than
    // re-deriving it from the answer's wording.
    //
    // They are populated by the tiers that establish them — the comparison tier knows both of its
    // sides, the hybrid tier knows its subject and relation — and carried forward otherwise. A turn
    // that establishes nothing leaves the previous identity in place, which is what makes a chain of
    // follow-ups work.
    last_subject_id: safeCtxId(h.subject_id || p.last_subject_id),
    // The subject BEFORE this one. A comparison follow-up — "compare them", "what is the difference
    // between them?" — names neither side, and both are in the conversation rather than in the
    // question. Keeping only the most recent identity makes that follow-up unanswerable, which is what
    // "What is L2?" → "And L3?" → "Compare them." was measured doing.
    //
    // Shifted only when the subject actually CHANGES, so a turn that re-resolves the same concept does
    // not push the real previous subject out of reach.
    previous_subject_id: safeCtxId(
      h.subject_id && p.last_subject_id && h.subject_id !== p.last_subject_id
        ? p.last_subject_id
        : p.previous_subject_id,
    ),
    comparison_left: safeCtxId(h.comparison_left || p.comparison_left),
    comparison_right: safeCtxId(h.comparison_right || p.comparison_right),
    hybrid_subject_id: safeCtxId(h.hybrid_subject_id || p.hybrid_subject_id),
    hybrid_relation: safeCtxId(h.hybrid_relation || p.hybrid_relation),
    ...(p.observed_at ? { observed_at: safeCtxId(p.observed_at, 32) } : {}),
  };
}

// Increment 4 (§7) — the compact, public-safe `factual_package` provenance summary surfaced in the /ask meta.
// It carries ONLY structured provenance (ids, counts, intent labels, checksums) — never secrets, PII or free
// model text. Built from the transversal FactualPackage that PRECEDES synthesis (documentary trunk AND the
// operational/telemetry path), so the envelope proves the answer was grounded in a package before any prose.
export function factualPackageSummary(pkg) {
  if (!pkg || typeof pkg !== "object") return null;
  const qr = pkg.query_resolution || null;
  const arr = (x) => (Array.isArray(x) ? x : []);
  return {
    version: pkg.version ?? null,
    normalized_question: pkg.normalized_question || null,
    primary_intent: (qr && qr.primary_intent) || pkg.intent || null,
    sub_intents: qr ? arr(qr.sub_intents) : [],
    entities: qr ? arr(qr.entities) : [],
    scope: qr ? { profile: qr.profile || null, environment: qr.environment || null, protocol_version: qr.protocol_version || null } : null,
    freshness: pkg.freshness || null,
    facts_count: arr(pkg.facts).length,
    documentary_sources: arr(pkg.allowed_source_ids),
    live_sources_count: arr(pkg.live_sources).length,
    tool_results_count: arr(pkg.tool_results).length,
    tools_called: arr(pkg.tools_called),
    tool_plan: pkg.tool_plan && Array.isArray(pkg.tool_plan.steps) ? pkg.tool_plan.steps.map((s) => s.kind) : [],
    calculations_count: arr(pkg.calculations).length,
    aggregation_method: pkg.aggregation_method || null,
    sample_size: pkg.sample_size || 0,
    allowed_claims: arr(pkg.claims_allowed),
    forbidden_claims: arr(pkg.claims_forbidden),
    uncertainties: arr(pkg.uncertainties),
    unsupported_inferences: arr(pkg.unsupported_inferences),
    package_checksum: pkg.package_checksum || null,
  };
}

// M2.18B.6 — derive a FAITHFUL degraded reason from a non-publishing synthesis turn, so the public trace
// never conflates distinct causes under one label. Pure + total. The values map to honest UI labels in
// the website home KB adapter (modelo indisponível / resposta não validada / determinística):
//   intent_deferred        — Rust resolution deferred (boundary/unsupported); the synthesis was
//                                  never attempted. A deliberate safe path, NOT a model failure.
//   local_inference_unavailable  — the synthesis could not reach the on-host model (unavailable or failed).
//   synthesis_output_unvalidated  — the model synthesised, but the Rust factual validator rejected it
//                                  (or the output was unparseable). The evidence is fine; the prose was
//                                  not published — never a "model unavailable" claim.
//   local_inference_timeout      — the synthesis timed out. "tempo limite", not "indisponível".
//   synthesis_fallback_<status>      — residual (should not occur once resolution + synthesis are healthy).
export function synthesisFallbackReason(tp) {
  const t = (tp && tp.trace) || {};
  const pi = (tp && tp.primary_intent) || "";
  if (pi === "boundary_request" || pi === "unsupported") return "intent_deferred";
  const es = t.entry_status || "unknown";
  const os = t.output_status || "unknown";
  // M2.18B.6-R1 — a pass that timed out is "tempo limite", faithfully distinct from a model that could
  // not be reached at all ("modelo indisponível").
  if (es === "timeout" || os === "timeout") return "local_inference_timeout";
  if (es === "failed" || es === "unavailable") return "local_inference_unavailable";
  // Increment 4 (§8/§9) — the claim/citation verifier rejected the composed answer (an unsupported claim, an
  // unlabelled estimate/hypothetical, an underived calculation, or a dead citation). The evidence is fine;
  // the prose was not published — faithfully "resposta não validada", never "modelo indisponível".
  if (os === "rejected" || os === "invalid" || os === "claim_rejected") return "synthesis_output_unvalidated";
  if (os === "failed" || os === "unavailable") return "local_inference_unavailable";
  // M2.18B.7 (fallback fix) — the synthesis grounded a factually-valid answer but did NOT fulfil the
  // task's SHAPE (an example without a scenario, a procedure without steps, a lookup without metadata):
  // the deterministic Task-Completion validator withheld it. This is faithfully distinct from an
  // unreachable/timed-out model — never "modelo indisponível". (After this milestone, document lookups
  // resolve on a deterministic terminal BEFORE the trunk, so this arises only for the residual
  // structural tasks that reach synthesis without deterministic coverage.)
  if (os === "task_incomplete") return "synthesis_task_incomplete";
  return `synthesis_fallback_${es}`;
}

// M2.19G.5C (ADR-036, check 22) — the deterministic contradiction backstop for the grounded publish gate.
// The one exact fact the pipeline can check here without a model is a RESOLVED document's declared STATUS:
// if the published answer asserts — right next to the document id or the word "estado" — a status from a
// DIFFERENT family than the record's real status, that is a contradiction and the model text is blocked.
// Proximity-anchored (≤40 chars) so it never false-positives on prose that merely mentions a status word.
const STATUS_FAMILIES = [
  ["accepted", ["aceite", "aceit", "accepted", "em vigor", "vigente", "current", "ativa", "ativo"]],
  ["rejected", ["rejeitad", "rejected", "recusad"]],
  ["superseded", ["substituid", "superseded", "supersedid"]],
  ["deprecated", ["obsolet", "deprecated", "retirad", "descontinuad"]],
  ["proposed", ["propost", "proposed", "rascunho", "draft"]],
];
function statusFamily(s) {
  const n = normalize(String(s || ""));
  for (const [fam, toks] of STATUS_FAMILIES) if (toks.some((t) => n.includes(t))) return fam;
  return "";
}
export function contradictsDeterministic(answerText, docRes) {
  if (!docRes || !docRes.found || !docRes.status) return false;
  const realFam = statusFamily(docRes.status);
  if (!realFam) return false;
  const t = normalize(answerText);
  const realToks = STATUS_FAMILIES.find(([f]) => f === realFam)[1];
  // Anchor windows: the char immediately after each occurrence of the document id or the word "estado".
  const anchorEnds = [];
  for (const anchor of [normalize(String(docRes.id || "")), "estado"].filter(Boolean)) {
    let idx = t.indexOf(anchor);
    while (idx >= 0) {
      anchorEnds.push(idx + anchor.length);
      idx = t.indexOf(anchor, idx + anchor.length);
    }
  }
  for (const a of anchorEnds) {
    const win = t.slice(a, Math.min(a + 40, t.length));
    // The real family's own token in the window means a faithful (or quoted) status — never a contradiction.
    if (realToks.some((tok) => win.includes(tok))) continue;
    for (const [fam, toks] of STATUS_FAMILIES) {
      if (fam === realFam) continue;
      if (toks.some((tok) => win.includes(tok))) return true;
    }
  }
  return false;
}

// SPR-2 — classify a FINISHED answer's {result, meta} into the typed Rust `response_disposition` and the
// terminal SSE event kind. The stream reacts to THIS (never the raw `grounded` boolean). Safety first: a
// safety-refusal terminal → REFUSED. A grounded MODEL synthesis (the explanatory trunk, fresh or cached) →
// GROUNDED_ANSWER → FINAL_VALIDATED. Any other grounded terminal (canonical definition / exact fact /
// journey / document lookup / question family / operational / live artifact / tasked) → DETERMINISTIC_ANSWER
// → FINAL_VALIDATED. A deterministic clarification is a finished safe answer → CLARIFICATION →
// FINAL_VALIDATED. Everything else (grounded=false: insufficient / degraded / out-of-scope) → HONEST_FALLBACK
// (or INSUFFICIENT) → HONEST_FALLBACK. Pure + total; no model, no I/O. `boundary_context` is the safe 3-field
// public shape (never echoed user text). Used by the SSE endpoint to pick + label the terminal event.
export function progressDisposition(result, meta) {
  const r = result && typeof result === "object" ? result : {};
  const m = meta && typeof meta === "object" ? meta : {};
  let input;
  if (m.terminal_kind === "safety_refusal" || m.intent === "safety_refusal" || m.fallback_reason === "safety_refusal") {
    // A boundary/refusal — settled first (safety golden rule). The kind is a coarse, safe default.
    input = { intent: String(m.intent || "safety_refusal"), boundary: { is_boundary: true, boundary_kind: "safety", refused: true } };
  } else if (m.degraded === true || m.terminal_kind === "operational_failure") {
    // A DEGRADED / emergency grounding: the model answer was NOT published (ADR-036 post-validation reject,
    // model timeout/unavailable, budget/breaker) and the pipeline served a safe, sourced deterministic
    // grounding instead. This is an HONEST_FALLBACK — never a grounded-model claim, and the terminal carries
    // only the true degraded answer, NEVER the rejected model text (already stripped by the pipeline).
    input = { intent: String(m.intent || ""), contextual_fallback_kind: "understood_data_missing" };
  } else if (r.grounded === true && m.terminal_kind === "explanatory_trunk") {
    // The single grounded synthesis (a genuine model answer, fresh or served from cache).
    input = { intent: String(m.intent || ""), grounded: true };
  } else if (r.grounded === true) {
    // A grounded DETERMINISTIC terminal (no model call).
    input = { intent: String(m.intent || ""), terminal_kind: String(m.terminal_kind || "deterministic") };
  } else if (m.terminal_kind === "clarification") {
    // A deterministic clarification — a finished, safe answer, not a degraded fallback.
    input = { intent: String(m.intent || "clarification_required"), contextual_fallback_kind: "ambiguous" };
  } else {
    // grounded=false: honest fallback / insufficient evidence / degraded — never a false grounded claim.
    const cf =
      m.contextual_fallback_kind ||
      (m.terminal_kind === "insufficient_measurements" || m.terminal_kind === "insufficient_evidence"
        ? "insufficient_source"
        : "out_of_scope");
    input = { intent: String(m.intent || ""), contextual_fallback_kind: String(cf) };
  }
  const classified = responseDisposition(input);
  const disposition = classified.disposition || "HONEST_FALLBACK";
  return {
    disposition,
    boundary_context: classified.boundary_context || { is_boundary: false, boundary_kind: "none", refused: false },
    event: terminalEventForDisposition(disposition),
  };
}

export function createPipeline(provider, env = process.env, { nowFn = Date.now, inferenceRun, runGroundedSynthesisFn, liveArtifactTool = null, telemetryTool = null, receiptsTool = null } = {}) {
  // M2.14E — the ONLY model-bound step (the explanatory trunk) runs through this queue. Terminals (exact
  // fact / definition / safety refusal / clarification / insufficient / operational), the journey answer
  // and cache hits all resolve BEFORE the trunk and never enter it. Default is a pass-through so unit
  // tests and the mock provider are unaffected.
  const runInference = typeof inferenceRun === "function" ? inferenceRun : (fn) => fn();
  // The single explanatory trunk (the grounded synthesis). Injectable so the router tests can exercise the
  // ROUTING (which terminal vs the trunk) deterministically without a real model; the trunk's own model
  // behaviour is proven in test/grounded-synthesis.test.js and in live QA.
  const runSynthesis = typeof runGroundedSynthesisFn === "function" ? runGroundedSynthesisFn : runGroundedSynthesis;
  const lang = "pt";
  const defaultMode = String(env.BANZAI_ANSWER_MODE || "fast").toLowerCase() === "deep" ? "deep" : "fast";
  const maxChunks = num(env.LLM_MAX_CHUNKS, 3);
  const maxContextChars = num(env.LLM_MAX_CONTEXT_CHARS, 6000);
  const maxTokensCfg = num(env.LLM_MAX_TOKENS, 800);
  const cacheOpts = {
    maxEntries: num(env.BANZAI_CACHE_MAX_ENTRIES, 500),
    ttlMs: num(env.BANZAI_CACHE_TTL_MS, 24 * 60 * 60 * 1000),
    nowFn,
  };
  const exact = new ExactCache(cacheOpts);
  const semantic = new SemanticCache({ ...cacheOpts, threshold: Number(env.BANZAI_SEMANTIC_THRESHOLD) || 0.92 });
  const budget = new BudgetTracker(env, nowFn);
  // M2.19G.5C (ADR-036) — the post-synthesis authority validator is MANDATORY by default. The
  // env kill-switch only DISABLES enforcement (OFF ⇒ still run + record telemetry, but publish anyway);
  // it is ON for any value other than an explicit falsey token, so an unset/empty env enforces.
  const POST_VALIDATE_ENFORCE = !/^(0|false|off|no)$/i.test(String(env.BANZAI_POST_VALIDATE_ENFORCE ?? "").trim());
  // Safe post-validation counters (counts/enums only — never content). Surfaced via usage()/health.usage.
  const postValidateStats = { ok: 0, rejected: 0, published: 0, rejectionsByReason: Object.create(null) };
  const isReal = provider.name !== "mock";
  // The grounded-synthesis gate, kept ONLY for the model artifact/timeout and its auto-rollback circuit
  // breaker: a tripped breaker degrades to the safe emergency grounding. One per pipeline (a process
  // singleton), so the breaker's rolling window persists across requests.
  const synthesisGate = createSynthesisGate(env);

  // Per-mode limits: fast = tighter completion + fewer chunks; deep = configured maxima.
  function modeLimits(mode) {
    if (mode === "deep") return { maxTokens: maxTokensCfg, chunks: maxChunks };
    return { maxTokens: Math.min(maxTokensCfg, 400), chunks: Math.min(maxChunks, 2) };
  }



  /**
   * Which language to answer in — decided by the CALLER, not by the question's spelling.
   *
   * Explicit locale always wins. "L0?" carries no language at all, and a site that knows its own edition
   * must not have that overridden by a lexical guess; inference exists only for legacy callers that send
   * no locale, and it is allowed to answer "undetermined" rather than pretend.
   */
  /**
   * Reader prose owned by pre-composed terminals, per locale.
   *
   * A terminal is text the pipeline writes itself, so it has no knowledge-entry realization to select.
   * That is exactly why it needs its own locale table: the alternative is what was here before, which was
   * to emit every language at once and let the reader sort it out.
   */
  const TERMINAL_TEXT = {
    source_evidence: {
      "pt-PT": "Estas são as fontes que sustentam a resposta anterior:",
      en: "These are the sources supporting the previous answer:",
    },
    // Contextual fallbacks, keyed by the STRUCTURED decision Rust returns (`kind`), not by its prose.
    // Rust decides that a request is out of scope or ambiguous; what a reader is told about that is a
    // presentation concern and belongs here. The Portuguese wording is the engine's existing sentence,
    // moved rather than rewritten, so the decision's meaning is unchanged.
    contextual_fallback: {
      out_of_scope: {
        "pt-PT":
          "Não encontrei uma operação ou fonte pública do BANZA que suporte este pedido. O BanzAI responde sobre o protocolo BANZA — as suas regras, decisões, contratos e execuções de validação — e não sobre assuntos fora desse âmbito.",
        en: "I found no BANZA operation or public source that supports this request. BanzAI answers about the BANZA protocol — its rules, decisions, contracts and validation runs — and not about subjects outside that scope.",
      },
      ambiguous: {
        // Used only when the decision offers NO candidates. When it does, the specific sentence is
        // composed from them below — in both locales, from the same data.
        "pt-PT":
          "Não consegui determinar com precisão o que pretende. Reformule o pedido indicando a operação ou o artefacto a que se refere.",
        en: "I could not determine precisely what you are asking for. Rephrase the request naming the operation or the artifact you mean.",
      },
      // The engine emits five kinds and this table realized two. The other three fell through to
      // `unavailableRealization`, whose sentence says the answer "is not yet available in your
      // language" and ends "The sources that support it are still listed below."
      //
      // Both halves were false. `Uma implementação pode usar PostgreSQL?` — asked in Portuguese, the
      // canonical locale, where no realization is missing — was answered with that sentence and
      // `sources: []`. It blamed a translation gap for a retrieval outcome, and promised evidence that
      // was not there.
      //
      // These three say what actually happened. They do not name the subject: the engine's own message
      // interpolates it, and that message is diagnostics here by design, so composing a phrase from it
      // would reintroduce the coupling this table exists to remove.
      insufficient_source: {
        "pt-PT":
          "Não encontrei evidência pública suficiente para responder com segurança a este pedido. Prefiro não adivinhar: indique o identificador do documento ou da decisão, ou reformule, para eu localizar a fonte canónica.",
        en: "I did not find enough public evidence to answer this safely. I would rather not guess: name the document or decision identifier, or rephrase, so I can locate the canonical source.",
      },
      understood_data_missing: {
        "pt-PT":
          "Percebi o pedido, mas não existem dados públicos comparáveis para lhe responder com segurança — por exemplo execuções concluídas no mesmo perfil, ambiente e versão do protocolo. Não invento um valor: assim que existir a medição ou o artefacto correspondente, mostro-o.",
        en: "I understood the request, but there is no comparable public data to answer it safely — completed runs on the same profile, environment and protocol version, for example. I will not invent a figure: as soon as the measurement or the artifact exists, I will show it.",
      },
      tool_unavailable: {
        "pt-PT":
          "O motor que responde a este pedido não está disponível neste momento. Não respondo por estimativa: tente novamente dentro de instantes.",
        en: "The engine that answers this request is not available right now. I do not answer by estimate: try again shortly.",
      },
    },
  };

  /**
   * Reader prose for an UNBOUND conversational reference, per locale and per referent kind.
   *
   * The engine authors this sentence in Portuguese — `context.rs :: clarification_for`, whose own doc
   * comment says "Honest, request-oriented PT clarification". It was served verbatim to every reader,
   * stamped `answer_locale: locale`. So an English reader asking "Why not?" as a follow-up received a
   * paragraph of Portuguese that DECLARED itself English.
   *
   * A false declaration is worse than an absent one: `localeMatches` compares the declaration against the
   * request, they agreed, and the gate passed a Portuguese answer through to an English reader without
   * anything to notice. It was found by a multi-turn journey; no single-shot question reaches this path.
   *
   * Realized here from `referent_kind`, which is the same decision expressed as data — the discipline the
   * contextual-fallback table already states, applied to the one reader-facing sentence that still read
   * the engine's prose.
   */
  const REFERENCE_CLARIFICATION = {
    "pt-PT": {
      reproduce: "reproduzir uma execução anterior",
      comparison: "comparar com uma execução anterior",
      diagnose: "diagnosticar por que uma execução falhou ou ficou bloqueada",
      duration: "saber quanto demorou uma execução anterior",
      receipt: "consultar o recibo de uma execução anterior",
      keys: "abrir o manifesto de chaves de um operador/implementação",
      manifest: "abrir o manifesto de um operador/implementação",
      execution: "mostrar uma execução anterior",
      none: "este pedido",
    },
    en: {
      reproduce: "reproducing an earlier run",
      comparison: "comparing against an earlier run",
      diagnose: "diagnosing why a run failed or was blocked",
      duration: "how long an earlier run took",
      receipt: "opening the receipt of an earlier run",
      keys: "opening the key manifest of an operator or implementation",
      manifest: "opening the manifest of an operator or implementation",
      execution: "showing an earlier run",
      none: "this request",
    },
  };

  const REFERENCE_CLARIFICATION_FRAME = {
    "pt-PT": (what) =>
      `Interpretei o teu pedido como uma referência a um turno anterior — **${what}** —, mas **não tenho ` +
      "o contexto dessa conversa** (nenhuma execução, operador ou artefacto anterior). Não adivinho a " +
      "referência: indica o identificador concreto (por exemplo `exec-…`, o operador, ou a decisão/documento) " +
      "e prossigo.",
    en: (what) =>
      `I read your request as referring to an earlier turn — **${what}** — but **I do not have that ` +
      "conversation's context** (no earlier run, operator or artifact). I will not guess the reference: name " +
      "the concrete identifier — `exec-…`, the operator, or the decision or document — and I will continue.",
  };

  /**
   * The unbound-reference clarification in the reader's locale.
   *
   * Closed-world on the referent kind: an unknown kind falls back to the generic one rather than to the
   * engine's Portuguese, so a new `Anaphor` variant degrades to a vaguer sentence in the right language
   * instead of a precise one in the wrong language.
   */
  function referenceClarificationProse(referentKind, locale) {
    const table = REFERENCE_CLARIFICATION[locale] || REFERENCE_CLARIFICATION[DEFAULT_LOCALE];
    const frame = REFERENCE_CLARIFICATION_FRAME[locale] || REFERENCE_CLARIFICATION_FRAME[DEFAULT_LOCALE];
    return frame(table[referentKind] || table.none);
  }

  /**
   * Reader labels for the engine's DECLARED ambiguity candidates, per locale.
   *
   * These are the semantic alternatives — the engine decided WHICH choices to offer, and this decides
   * how each is named to a reader. Closed-world on purpose: a candidate with no label here is a gap in
   * presentation, and `ambiguityProse` refuses to guess rather than emitting a raw tag.
   */
  const AMBIGUITY_CANDIDATE_LABELS = {
    "pt-PT": {
      last_execution: "a última execução",
      comparable_executions_median: "a mediana das execuções comparáveis",
      configured_timeout_limit: "o limite de timeout configurado",
      last_two_executions: "as duas execuções mais recentes",
      specific_execution_ids: "execuções que identifique explicitamente",
    },
    en: {
      last_execution: "the most recent execution",
      comparable_executions_median: "the median across comparable executions",
      configured_timeout_limit: "the configured timeout limit",
      last_two_executions: "the two most recent executions",
      specific_execution_ids: "executions you name explicitly",
    },
  };

  /**
   * The sentence frames that carry candidates to a reader.
   *
   * TWO FRAMES, because the two candidate classes are not the same kind of thing. A semantic candidate
   * is a MEANING, and is named in the reader's language. A `term_spelling` candidate is a SPELLING the
   * recovery layer could not choose between — Portuguese catalogue vocabulary — and translating it
   * would destroy the very thing being asked about. So English keeps the spellings verbatim and frames
   * them honestly as terms, rather than presenting Portuguese words as though they were English ones.
   */
  const AMBIGUITY_FRAME = {
    "pt-PT": {
      semantic: (list) => `Não tenho a certeza de qual pretende — refere-se a ${list}?`,
      spelling: (list) => `Não tenho a certeza de qual pretende — refere-se a ${list}?`,
      join: " ou ",
    },
    en: {
      semantic: (list) => `I am not sure which you mean — do you mean ${list}?`,
      spelling: (list) => `I am not sure which you mean. These catalogue terms match: ${list}.`,
      join: " or ",
    },
  };

  /** Join reader fragments with the locale's conjunction, Oxford-free: "a, b or c". */
  function joinAlternatives(parts, locale) {
    const join = AMBIGUITY_FRAME[locale].join;
    if (parts.length <= 1) return parts[0] || "";
    return parts.slice(0, -1).join(", ") + join + parts[parts.length - 1];
  }

  /**
   * The ambiguity sentence, composed in `locale` from the decision's own typed candidates.
   *
   * Returns null when the decision offers nothing to compose from, or when a candidate has no label in
   * this locale — the caller then uses the generic table entry. Guessing a label, or falling through to
   * the engine's Portuguese sentence, are the two failures this exists to prevent.
   */
  function ambiguityProse(fb, locale) {
    const candidates = Array.isArray(fb.ambiguity_candidates) ? fb.ambiguity_candidates : [];
    if (candidates.length === 0) return null;
    const frame = AMBIGUITY_FRAME[locale];
    const labels = AMBIGUITY_CANDIDATE_LABELS[locale];
    if (!frame || !labels) return null;

    const spellings = candidates.filter((c) => c && c.candidate === "term_spelling");
    if (spellings.length === candidates.length) {
      const terms = spellings.map((c) => String(c.term || "")).filter(Boolean);
      if (terms.length === 0) return null;
      return frame.spelling(joinAlternatives(terms, locale));
    }
    if (spellings.length > 0) return null; // mixed classes: no honest single frame — use the generic text

    const named = [];
    for (const c of candidates) {
      const label = labels[c && c.candidate];
      if (!label) return null; // closed world: an unlabelled candidate is a presentation gap, not prose
      named.push(label);
    }
    return frame.semantic(joinAlternatives(named, locale));
  }

  /**
   * Reader prose for a contextual fallback, in the resolved locale.
   *
   * BOTH locales are realized here, from the same structured decision. Portuguese used to return the
   * engine's own `fb.message` — a human sentence authored in Rust — which meant the claim "Rust decides,
   * JS realizes" was false on the serving path readers actually hit. The specificity that sentence
   * carried (it names the exact alternatives) is not lost: it is recomposed from
   * `fb.ambiguity_candidates`, which is the same decision expressed as data.
   *
   * `fb.message` is now diagnostics only. It stays on the wire for tests and traces; it is never read
   * as reader text.
   */
  function fallbackProse(fb, locale) {
    const composed = ambiguityProse(fb, locale);
    if (composed) return composed;
    const table = TERMINAL_TEXT.contextual_fallback[fb.kind] || {};
    const owned = table[locale];
    if (owned) return owned;
    return unavailableRealization(locale);
  }

  function resolveLocale(requested, question) {
    if (LOCALES.includes(requested)) return { locale: requested, source: "explicit" };
    // NO INFERENCE for legacy callers, and this is a measured decision rather than a simplification.
    //
    // The corpus is Portuguese: 163 of 178 deterministic entries have only a pt-PT realization. Guessing
    // "en" from an English-worded question and then failing closed would take every such question from
    // "answered in Portuguese" to "not available in English" for clients that have no way to ask for
    // Portuguese yet — a regression for callers that did nothing wrong. Lexical inference also cannot
    // read "L0?" or "BCJ/1?" at all, which is the case the explicit signal exists for.
    //
    // So: the caller states its locale, or it gets the canonical one. The website sends it explicitly,
    // which is where English correctness is actually enforced.
    return { locale: DEFAULT_LOCALE, source: "legacy-default" };
  }

  function deterministic(hit, meta, locale) {
    // Locale chooses the realization; it never changes which entry was selected or which sources
    // establish it. A missing realization fails closed in the REQUESTED locale (knowledge.answerFor).
    // Two kinds of thing reach this function. A KNOWLEDGE ENTRY carries `realizations` and the locale
    // selects one. A PRE-COMPOSED terminal (source-evidence follow-ups, operational failures) is built by
    // the pipeline itself in the already-resolved locale and carries a plain `answer`; asking answerFor
    // for a realization it never had would report "unavailable" for text that is right there and correct.
    // This is not a locale fallback: the composer produced that string for THIS locale.
    // WHICH KIND OF THING IS THIS? Asked by declaration, not by shape.
    //
    // A knowledge entry carries `realizations` and the locale selects one. A PRE-COMPOSED TERMINAL says so
    // — `precomposed_terminal` names its class — and carries prose the pipeline already wrote for the
    // resolved locale, so asking answerFor for a realization it never had would report "unavailable" for
    // correct text. Recognising terminals by the ABSENCE of `realizations` was too weak: any malformed or
    // legacy object satisfies that shape and would have been served as though it were deliberate.
    const isPrecomposedTerminal = Boolean(hit && hit.precomposed_terminal);
    if (isPrecomposedTerminal && hit.answer_locale && hit.answer_locale !== locale) {
      // A terminal must be composed FOR the resolved locale. Metadata cannot relabel prose after the fact.
      throw new Error(
        `pipeline: ${hit.precomposed_terminal} terminal composed for ${hit.answer_locale} but the request ` +
          `resolved to ${locale} — terminal prose must be written for the locale that was resolved`,
      );
    }
    const realization = isPrecomposedTerminal
      ? { text: hit.answer || "", available: true, locale }
      : answerFor(hit, locale);
    return {
      result: {
        grounded: true,
        answer: realization.text,
        answer_locale: realization.locale,
        answer_locale_available: realization.available,
        // Public eligibility is decided HERE, at the evidence layer, not later at the contract boundary.
        // Measured: "implementar o protocolo" reaches implementation-steps and served CLAUDE.md — an
        // internal repository guide — in result.sources. `normalizeBanzaiAnswer` would have dropped it
        // before the HTTP response, so nothing was ever visibly wrong; but a source that reaches the
        // answer object has already counted as evidence for it, and a later filter hides that rather than
        // preventing it. The rule is the source's own eligibility metadata, not its filename: any
        // internal-only source is excluded the same way, whatever it is called.
        sources: publicSourcesOnly(hit.sources),
        entry_id: hit.id,
        provider: provider.name,
        mode: isReal ? "real" : "mock",
        guardrails: GUARDRAILS,
      },
      meta: { deterministic: true, cache: null, llm_called: false, ...meta },
    };
  }

  // M2.10A — the deterministic grounding for a RESOLVED document. Used as the fallback answer if
  // the model fails, times out or is rejected by the validator: it states only what the record
  // itself says (title, status, date) plus the standing boundary, so a degraded answer is still
  // true and still cites the document. An ADR is a decision record, never an authorisation.
  function documentFallback(doc) {
    const head = `${doc.title} — Estado: ${doc.status || "n/d"} · Data: ${doc.date || "n/d"}.`;
    const body = (doc.sources || [])
      .map((c) => String(c.chunk || ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .slice(0, 700);
    return {
      id: doc.id,
      answer:
        `${head} ${body}`.trim() +
        " Este documento regista uma decisão do protocolo: não aprova, não certifica e não confere estatuto a nenhum operador.",
      sources: [{ id: doc.id, title: doc.title, path: doc.path }],
    };
  }

  // Tier-0 SAFETY-REFUSAL terminal — no source, no model call. Behaviour is byte-identical to the prior
  // fixed-text decline (safety golden rule): this is the ONLY route that still serves the historical text.
  // `meta` carries the fallback_reason ("safety_refusal") and the routing intent.
  function safetyRefusal(meta) {
    return {
      result: {
        grounded: false,
        answer: SAFETY_REFUSAL_MESSAGE,
        sources: [],
        entry_id: null,
        provider: provider.name,
        mode: isReal ? "real" : "mock",
        guardrails: GUARDRAILS,
      },
      meta: { deterministic: true, cache: null, llm_called: false, ...meta },
    };
  }

  // Increment 2 (§2/§4) — the CONTEXTUAL fallback for an understood-but-unmapped, NON-boundary question. It
  // REPLACES the fixed topic list: Rust classifies the concrete question (taxonomy::resolve_query) and
  // authors a request-oriented PT message (taxonomy::contextual_fallback), naming the interpreted intent and
  // the specific missing data/scope — never a generic topic list, never a fabricated value. `situation` tells
  // Rust what physically happened at the call site ("tool_unavailable" | "insufficient_source" | "" = the
  // engine decides from the resolution). The `kind` + interpreted intent + sub-intents ride in the meta so
  // the /ask envelope surfaces them. This path is NEVER reached for a boundary/refusal (those are Tier 0).
  function contextualInsufficient(question, situation, meta, locale = DEFAULT_LOCALE) {
    const fb = contextualFallback(question, situation) || {};
    // The engine decided; the locale decides what the reader is told about that decision. Composed HERE,
    // for THIS locale, so answer_locale below is provenance of composition and not a label applied after.
    const prose = fallbackProse(fb, locale);
    return {
      result: {
        grounded: false,
        answer: prose,
        answer_locale: locale,
        sources: [],
        entry_id: null,
        provider: provider.name,
        mode: isReal ? "real" : "mock",
        guardrails: GUARDRAILS,
      },
      meta: {
        deterministic: true,
        cache: null,
        llm_called: false,
        contextual_fallback_kind: fb.kind || null,
        interpreted_intent: fb.interpreted_intent || null,
        interpreted_sub_intents: Array.isArray(fb.sub_intents) ? fb.sub_intents : [],
        ...meta,
      },
    };
  }

  // An INTERNAL inconsistency, not a statement about what BANZA documents. The engine resolved a subject
  // it claims to answer and then produced no facts for it — the registry and the assembled package
  // disagree. The reader is told plainly that BanzAI could not complete the answer, which is true, instead
  // of being told the protocol lacks evidence, which is not. Deterministic and model-free: falling through
  // to synthesis here would route the most sensitive questions to the least constrained path precisely
  // when the constrained one is known to be broken.
  function engineInconsistent(question, meta) {
    return {
      result: {
        grounded: false,
        answer:
          "Não consegui completar esta resposta. Isto não é falta de evidência pública do BANZA — é uma " +
          "inconsistência interna do BanzAI ao montar a resposta a partir das suas fontes. A informação " +
          "existe no repositório; consulte a fonte canónica ou reformule enquanto isto é corrigido.",
        sources: [],
        entry_id: null,
        provider: provider.name,
        mode: isReal ? "real" : "mock",
        guardrails: GUARDRAILS,
      },
      meta: {
        deterministic: true,
        cache: null,
        llm_called: false,
        // Visible to maintainers: a critical subject failing on the engine's own registry must not degrade
        // quietly (§16).
        engine_inconsistency: true,
        ...meta,
      },
    };
  }

  // M2.18B — a grounded=false result carrying a specific answer body (clarification / out-of-scope /
  // interpreted-boundary). No source, no model answer. Deterministic; safe by construction.
  function stated(answerText, meta) {
    // ONE authority for reader-locale provenance, and it sits beside the prose it describes.
    //
    // Composers used to pass `answer_locale` inside `meta` while the knowledge realization path put it on
    // `result`, so the same fact had two homes. That is not a tidiness complaint: a census that read only
    // `meta` reported 26 of 30 answers as unprovenanced when the true number was 4, because it looked in
    // the wrong place for the largest composer. A rule written over two fields can always read the wrong
    // one, so composers keep stamping at composition and this hoists the value to the canonical field.
    const { answer_locale, ...rest } = meta || {};
    return {
      result: {
        grounded: false,
        answer: answerText,
        answer_locale: answer_locale ?? null,
        sources: [],
        entry_id: null,
        provider: provider.name,
        mode: isReal ? "real" : "mock",
        guardrails: GUARDRAILS,
      },
      meta: { deterministic: true, cache: null, llm_called: false, ...rest },
    };
  }

  // A GROUNDED answer: the model synthesised only from the Rust FactualPackage and the Rust factual
  // validator PASSED it. Sources are built from the package's facts for the ids the answer actually cited
  // (never authored). This is a genuine model answer (llm_called:true).
  /**
   * Reader prose for a two-sided comparison, per locale.
   *
   * The two sides are the entries' OWN realizations, joined by a frame — not a paraphrase of them, and
   * not a model recomposition. Each side already states its own boundaries (that BANZA neither clears
   * nor settles real funds, for instance), and those boundaries are exactly what a comparison must not
   * blur. The frame says what is being compared; the sides say what they are.
   */
  const COMPARISON_FRAME = {
    "pt-PT": (a, b) => `**${a.title}** — ${a.text}\n\n**${b.title}** — ${b.text}`,
    en: (a, b) => `**${a.title}** — ${a.text}\n\n**${b.title}** — ${b.text}`,
  };

  /** The reader-facing label for one side: the phrase they used, capitalised. */
  function sideTitle(phrase) {
    const p = String(phrase || "").trim();
    return p ? p.charAt(0).toUpperCase() + p.slice(1) : "";
  }

  /**
   * Reader prose for a HYBRID relation — what the subject means, then what BANZA says about it.
   *
   * The two halves are kept visibly apart, and that separation IS the property. A domain source may
   * establish what settlement means; only BANZA authority may establish what BANZA does about it, and a
   * reader has to be able to see which half rests on which. Running them together is how "BANZA
   * settles" gets written from a source that only defines settlement.
   *
   * Both halves are the entries' OWN realizations. Nothing is paraphrased and nothing is composed by a
   * model: each entry already states its own boundary, and those boundaries are exactly what a relation
   * answer must not soften.
   */
  const HYBRID_FRAME = {
    "pt-PT": {
      specifies: (s, b) => `${s}\n\n**O que o BANZA especifica** — ${b}`,
      relates: (s, b) => `${s}\n\n**Relação com o BANZA** — ${b}`,
      performs: (s, b) => `${s}\n\n**O BANZA faz isto?** — ${b}`,
      requires: (s, b) => `${s}\n\n**O BANZA exige isto?** — ${b}`,
    },
    en: {
      specifies: (s, b) => `${s}\n\n**What BANZA specifies** — ${b}`,
      relates: (s, b) => `${s}\n\n**Relationship to BANZA** — ${b}`,
      performs: (s, b) => `${s}\n\n**Does BANZA do this?** — ${b}`,
      requires: (s, b) => `${s}\n\n**Does BANZA require this?** — ${b}`,
    },
  };

  function hybridAnswer(plan, subjectText, banzaText, sources, meta, locale) {
    const table = HYBRID_FRAME[locale] || HYBRID_FRAME[DEFAULT_LOCALE];
    const frame = table[plan.relation] || table.relates;
    return {
      result: {
        grounded: true,
        answer: frame(subjectText, banzaText),
        sources,
        // The relation's subject is the record a follow-up resolves against. See `comparisonAnswer`.
        entry_id: plan.subject_id || null,
        provider: provider.name,
        mode: isReal ? "real" : "mock",
        guardrails: GUARDRAILS,
        model_called: false,
        model_name: "",
        inference_location: provider.inferenceLocation || null,
        answer_locale: locale,
      },
      meta: { deterministic: true, cache: null, llm_called: false, ...meta },
    };
  }

  function comparisonAnswer(plan, leftText, rightText, sources, meta, locale) {
    const frame = COMPARISON_FRAME[locale] || COMPARISON_FRAME[DEFAULT_LOCALE];
    const body = frame(
      { title: sideTitle(plan.left.phrase), text: leftText },
      { title: sideTitle(plan.right.phrase), text: rightText },
    );
    return {
      result: {
        grounded: true,
        answer: body,
        sources,
        // The composite's PRIMARY record. `null` here meant the evidence-continuity wrapper had no
        // target to carry forward, and the next turn's "which source says that?" found nothing to point
        // at — measured, the source follow-up failed after every comparison and every relation. Both
        // sides travel in `comparison_left`/`comparison_right`; this is the record a follow-up resolves
        // against.
        entry_id: plan.left.semantic_id || null,
        provider: provider.name,
        mode: isReal ? "real" : "mock",
        guardrails: GUARDRAILS,
        model_called: false,
        model_name: "",
        inference_location: provider.inferenceLocation || null,
        answer_locale: locale,
      },
      meta: { deterministic: true, cache: null, llm_called: false, ...meta },
    };
  }

  /**
   * A comparison the engine could not plan, said plainly.
   *
   * Naming the side that did not resolve is the difference between a decline a reader can act on and a
   * blanket "insufficient evidence". They asked about two things; one of them was understood.
   */
  const COMPARISON_INCOMPLETE = {
    "pt-PT": (side) =>
      side === "both"
        ? "Não reconheci nenhum dos dois termos desta comparação. Indique os dois conceitos que quer comparar e eu comparo-os."
        : `Reconheci um dos lados desta comparação, mas não o outro (**${side}**). Uma comparação precisa dos dois lados: indique o segundo conceito e eu comparo-os. Não respondo por um só lado como se respondesse pela pergunta.`,
    en: (side) =>
      side === "both"
        ? "I did not recognise either term in this comparison. Name the two concepts you want compared and I will compare them."
        : `I recognised one side of this comparison but not the other (**${side}**). A comparison needs both sides: name the second concept and I will compare them. I will not answer for one side as though it answered the question.`,
  };

  function comparisonIncomplete(side, meta, locale) {
    const frame = COMPARISON_INCOMPLETE[locale] || COMPARISON_INCOMPLETE[DEFAULT_LOCALE];
    return {
      result: {
        grounded: false,
        answer: frame(side),
        sources: [],
        entry_id: null,
        provider: provider.name,
        mode: isReal ? "real" : "mock",
        guardrails: GUARDRAILS,
        model_called: false,
        model_name: "",
        inference_location: provider.inferenceLocation || null,
        answer_locale: locale,
      },
      meta: { deterministic: true, cache: null, llm_called: false, ...meta },
    };
  }

  function groundedAnswer(answerText, pkg, citedIds, meta) {
    const byId = new Map();
    for (const f of (pkg && Array.isArray(pkg.facts) ? pkg.facts : [])) {
      const s = f.source || {};
      if (s.document_id && !byId.has(s.document_id)) {
        byId.set(s.document_id, { id: s.document_id, title: s.title || s.document_id, path: s.path || "" });
      }
    }
    const sources = (Array.isArray(citedIds) ? citedIds : [])
      .map((id) => byId.get(id))
      .filter(Boolean);
    return {
      result: {
        grounded: true,
        answer: answerText,
        sources,
        entry_id: null,
        provider: provider.name,
        mode: isReal ? "real" : "mock",
        guardrails: GUARDRAILS,
        // M2.8F — the per-answer telemetry server.js reads to label "answered by Qwen". A grounded trunk
        // answer IS a genuine local model generation (the single grounded synthesis).
        model_called: true,
        model_name: (meta && meta.synthesis && meta.synthesis.model) || "",
        inference_location: provider.inferenceLocation || null,
        // The locale belongs on the RESULT, because that is where `/ask` reads it from
        // (server.js: `answer_locale: result.answer_locale ?? null`). The caller already passes it —
        // into `meta`, which is a different channel — so this terminal declared its locale to nobody
        // and the envelope published `null` for every model answer ever served.
        //
        // Measured across the baseline: `answer_locale` was present on 31/31 deterministic terminals
        // and absent on 9/9 `explanatory_trunk` terminals, in both locales. The website accepts an
        // absent declaration by design (banzaiKb.ts: `localeMatches`), so the locale gate was enforced
        // on every path whose text is fixed and reviewed, and silent on the one path that generates
        // free prose. The check held where it could not matter.
        answer_locale: (meta && meta.answer_locale) || null,
      },
      meta: { deterministic: false, cache: null, llm_called: true, ...meta },
    };
  }

  // Increment 5 (§10–§15) — a GROUNDED question-family answer: built deterministically from the transversal
  // FactualPackage the family handler executed (reason-code registry / receipt store / canonical corpus) and
  // PASSED by the Inc.4 claim/citation verifier. No model (llm_called:false). `sources` come only from the
  // package's cited ids (never authored). The family + tool-result provenance + the compact factual_package
  // ride in the meta so the /ask envelope proves the answer was grounded before any prose.
  function familyAnswer(fam, meta, answerLocale) {
    return {
      result: {
        grounded: true,
        answer: fam.answer,
        // Every other terminal declares the locale it composed for; this one did not, and nothing
        // noticed because no probe reached it. Measured across the 572-item V2 baseline, 58 answers
        // came back with `answer_locale: null` — all of them question-family terminals, 57 of them
        // Portuguese. An answer that does not say which language it is in cannot be checked for
        // serving the wrong one, so the locale contract simply did not apply here.
        answer_locale: answerLocale,
        sources: Array.isArray(fam.sources) ? fam.sources : [],
        entry_id: `family-${fam.family}`,
        provider: provider.name,
        mode: isReal ? "real" : "mock",
        guardrails: GUARDRAILS,
      },
      meta: {
        deterministic: true,
        cache: null,
        llm_called: false,
        ...meta,
        fallback_reason: null,
        intent: fam.family,
        terminal_kind: "question_family",
        question_family: fam.family,
        reason_code: fam.reason_code || null,
        factual_package: factualPackageSummary(fam.package),
        claim_verification_ok: true,
        tool_results: Array.isArray(fam.tool_results)
          ? fam.tool_results
          : (fam.package && fam.package.tool_results) || [],
        resolution_method: "rust_question_family",
        trace_label:
          "Família de pergunta fundamentada por Rust (plano → FactualPackage → verificação de afirmações/citações; 0 chamadas de modelo)",
      },
    };
  }

  // M2.18B.4 — a typed EXACT terminal: a canonical machine-fact (status/date/identifier/version/license/
  // origin) CONFIRMED by Rust and bound to its public source, served WITHOUT the model. The body is a
  // concise, non-narrative template around the exact value (never prose — a request that needs prose is
  // routed to the trunk by the classifier, never here). `term` is the Rust Terminal; `term.source` is the
  // canonical SourceCard. This is grounded and true, but carries llm_called:false (no generation).
  // The templates are per LOCALE. They were Portuguese-only, so an English reader asking "What version
  // is the BANZA protocol?" was served "Versão de BANZA: **1.0.0**." — the right fact, in the wrong
  // language, from a terminal that also never declared `answer_locale`, so nothing could detect it.
  // The VALUE is locale-independent (a version, a date, an identifier); only the frame around it is not.
  const EXACT_TEMPLATE = {
    "pt-PT": {
      status: (id, v) => `Estado de ${id}: **${v}**.`,
      dateWithId: (id, v) => `Data de ${id}: **${v}**.`,
      version: (id, v) => `Versão de ${id}: **${v}**.`,
      identifier: (id, v) => `Identificador: **${v}**.`,
      license: (id, v) => `A licença do protocolo é **${v}**.`,
    },
    en: {
      status: (id, v) => `Status of ${id}: **${v}**.`,
      dateWithId: (id, v) => `Date of ${id}: **${v}**.`,
      version: (id, v) => `Version of ${id}: **${v}**.`,
      identifier: (id, v) => `Identifier: **${v}**.`,
      license: (id, v) => `The protocol licence is **${v}**.`,
    },
  };

  function exactTerminal(term, meta, answerLocale) {
    const v = String(term.value || "").trim();
    const id = term.source && term.source.id ? String(term.source.id) : "";
    const t = EXACT_TEMPLATE[answerLocale] || EXACT_TEMPLATE["pt-PT"];
    let body;
    switch (term.exact_kind) {
      case "status":
        body = t.status(id, v);
        break;
      case "date":
        // Protocol-level date values are already a full phrase; document dates get the id prefix.
        body = id && id !== "NOTICE" ? t.dateWithId(id, v) : v;
        break;
      case "version":
        body = t.version(id, v);
        break;
      case "identifier":
        body = t.identifier(id, v);
        break;
      case "license":
        body = t.license(id, v);
        break;
      case "origin":
        body = v; // already a complete provenance phrase
        break;
      default:
        body = v;
    }
    const sources = term.source
      ? [{ id: term.source.id, title: term.source.title, path: term.source.path }]
      : [];
    return {
      result: {
        grounded: true,
        answer: body,
        answer_locale: answerLocale,
        sources,
        entry_id: null,
        provider: provider.name,
        mode: isReal ? "real" : "mock",
        guardrails: GUARDRAILS,
      },
      meta: {
        deterministic: true,
        cache: null,
        llm_called: false,
        terminal_kind: "exact_fact",
        exact_kind: term.exact_kind,
        trace_label: term.trace_label,
        ...meta,
      },
    };
  }

  /**
   * Reader prose for the clarification terminal, per locale and per CANDIDATE CLASS.
   *
   * Two classes reach this terminal and they are not the same question. `document` candidates are
   * canonical artifact identifiers — "did you mean ADR-001 or ADR-012?". `term` candidates come from the
   * typo-recovery layer and are Portuguese catalogue SPELLINGS — "operador / operar". Asking an English
   * reader "which document do you mean: operador or operar?" is wrong twice: they are not documents, and
   * they are not English. So the frame follows the class, and the spellings themselves are never
   * translated — translating the vocabulary being matched would destroy the thing being asked about.
   */
  const CLARIFY_TEXT = {
    "pt-PT": {
      document: {
        many: (list) => `Encontrei mais do que um documento relacionado. Refere-se a ${list}?`,
        one: (only) =>
          `Não tenho a certeza de qual documento pretende — refere-se a ${only}? Se sim, confirme; caso contrário, indique o identificador (ex.: ADR-001).`,
        none: "Não consegui determinar com segurança qual documento ou regra pretende consultar. Pode indicar o identificador (ex.: ADR-001) ou reformular a pergunta?",
      },
      term: {
        many: (list) => `Não tenho a certeza de qual termo pretende — refere-se a ${list}?`,
        one: (only) => `Não tenho a certeza do termo — refere-se a ${only}?`,
        none: "Não consegui determinar com segurança o termo pretendido. Pode reformular a pergunta?",
      },
      join: " ou ",
    },
    en: {
      document: {
        many: (list) => `I found more than one related document. Do you mean ${list}?`,
        one: (only) =>
          `I am not sure which document you mean — do you mean ${only}? If so, confirm; otherwise give the identifier (e.g. ADR-001).`,
        none: "I could not determine which document or rule you want to consult. Give the identifier (e.g. ADR-001) or rephrase the question.",
      },
      term: {
        // The terms stay in their catalogue spelling; the framing says so rather than presenting
        // Portuguese vocabulary as though it were English.
        many: (list) => `I am not sure which term you mean. These catalogue terms match: ${list}.`,
        one: (only) => `I am not sure about the term. The closest catalogue term is: ${only}.`,
        none: "I could not determine which term you mean. Please rephrase the question.",
      },
      join: " or ",
    },
  };

  /**
   * Reader vocabulary for the operational-measurement decline, per locale.
   *
   * Two input kinds, kept apart on purpose. `subject`/`metric`/`statistic` name values that came from
   * the REQUEST DECISION; `frame` writes the sentences around the STATIC domain description. Neither
   * table restates a fact — the nine steps and the receipt name arrive from `operationalDomain()`, so
   * a translation cannot quietly drop one or let the two locales disagree about what the journey is.
   */
  const MEASUREMENT_TEXT = {
    "pt-PT": {
      subject: {
        validation_journey: "uma jornada de validação",
        certification: "a certificação",
        federation: "a federação",
      },
      subjectFallback: "uma operação do protocolo",
      metric: {
        elapsed_time: "a duração",
        slowest_step: "o passo mais lento",
      },
      metricFallback: "a medição pedida",
      statistic: { median_total: "a **mediana**", p95_total: "o **percentil 95**" },
      numeral: { 7: "sete", 8: "oito", 9: "nove", 10: "dez", 11: "onze", 12: "doze" },
      frame: ({ subject, metric, steps, stepCount, receipt, stats }) =>
        `Interpretei o teu pedido como uma pergunta sobre **${metric} de ${subject} (uma medição operacional, não um conceito do protocolo)**.\n\n` +
        `Para responder com um valor fiável preciso de **execuções concluídas** no mesmo perfil, ambiente e versão do protocolo — a medição depende da disponibilidade dos artefactos, da latência da origem canónica, dos *timeouts* e dos passos aplicáveis ao perfil.\n\n` +
        `Consultei a **telemetria de execuções persistidas** (apenas leitura, execuções públicas). Ainda **não existem execuções públicas comparáveis suficientes** para calcular um valor representativo, por isso **não invento um número**.\n\n` +
        `O que posso afirmar sem medição: a jornada tem **${stepCount} etapas** (${steps.join(", ")}) e a duração observada de cada execução fica registada no respectivo **${receipt}**.\n\n` +
        `Assim que existir uma execução pública concluída, mostro a **duração observada** dessa execução e, com várias execuções comparáveis, ${stats.join(" e ")} — distinguindo sempre uma observação individual de uma média.`,
    },
    en: {
      subject: {
        validation_journey: "a validation journey",
        certification: "certification",
        federation: "federation",
      },
      subjectFallback: "a protocol operation",
      metric: {
        elapsed_time: "the duration",
        slowest_step: "the slowest step",
      },
      metricFallback: "the requested measurement",
      statistic: { median_total: "the **median**", p95_total: "the **95th percentile**" },
      numeral: { 7: "seven", 8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve" },
      frame: ({ subject, metric, steps, stepCount, receipt, stats }) =>
        `I read your request as a question about **${metric} of ${subject} (an operational measurement, not a protocol concept)**.\n\n` +
        `To answer with a reliable value I need **completed executions** on the same profile, environment and protocol version — the measurement depends on artifact availability, canonical-origin latency, *timeouts* and the steps that apply to the profile.\n\n` +
        `I consulted the **persisted execution telemetry** (read-only, public executions). There are still **not enough comparable public executions** to compute a representative value, so **I will not invent a number**.\n\n` +
        `What I can state without measuring: the journey has **${stepCount} steps** (${steps.join(", ")}) and each execution's observed duration is recorded in its **${receipt}**.\n\n` +
        `Once a public execution has completed I will report that execution's **observed duration**, and with several comparable executions ${stats.join(" and ")} — always distinguishing a single observation from an average.`,
    },
  };

  /**
   * The measurement decline, composed in `locale` from the decision plus the static domain description.
   *
   * The Rust layer still authors `honest_fallback`; it is diagnostics now. Reader text is built here so
   * both locales carry the SAME facts — which is why the steps and the receipt name are read from the
   * domain descriptor rather than written into either sentence.
   */
  function measurementProse(decision, locale) {
    const t = MEASUREMENT_TEXT[locale] || MEASUREMENT_TEXT[DEFAULT_LOCALE];
    const domain = operationalDomain();
    const steps = domain.journey_steps;
    return t.frame({
      subject: t.subject[decision.subject] || t.subjectFallback,
      metric: t.metric[decision.metric] || t.metricFallback,
      steps,
      // The count is DERIVED, so it cannot disagree with the list beside it — but it still reads as a
      // written numeral, because "a jornada tem 9 etapas" is not how the sentence is spoken. The map
      // covers the counts a step spine plausibly has and falls back to the digit rather than guessing,
      // so adding a tenth step changes the sentence instead of leaving a stale word behind.
      stepCount: (t.numeral && t.numeral[steps.length]) || String(steps.length),
      receipt: domain.receipt_artifact,
      stats: domain.supported_statistics.map((s) => t.statistic[s]).filter(Boolean),
    });
  }

  // Ask for clarification instead of silently choosing. The question is composed deterministically from
  // the Rust resolver's real candidates in the RESOLVED locale; no model is called here.
  function clarify(envelope, meta, locale, candidateClass = "document") {
    const cands = (envelope && Array.isArray(envelope.entity_candidates) ? envelope.entity_candidates : [])
      .map((c) => String((c && (c.proposed_canonical_id || c.label)) || "").trim())
      .filter(Boolean)
      .slice(0, 4);
    const table = CLARIFY_TEXT[locale] || CLARIFY_TEXT[DEFAULT_LOCALE];
    const frame = table[candidateClass] || table.document;
    let a;
    if (cands.length >= 2) {
      a = frame.many(cands.slice(0, -1).join(", ") + table.join + cands[cands.length - 1]);
    } else if (cands.length === 1) {
      a = frame.one(cands[0]);
    } else {
      a = frame.none;
    }
    return stated(a, { ...meta, answer_locale: locale });
  }

  async function answer(question, { mode: requestedMode, contextQuestions, conversationContext, journeyStep, documentId, journeyNextActionSentence, signal, requestId, onProgress, locale: requestedLocale } = {}) {
    // The reader's language is decided ONCE, here, and never inferred from the answer's content.
    const localeDecision = resolveLocale(requestedLocale, question);
    const locale = localeDecision.locale;
    const mode = requestedMode === "deep" || requestedMode === "fast" ? requestedMode : defaultMode;
    // SPR-2 — the Channel-A progress emitter. When the caller (the SSE endpoint) supplies onProgress, the
    // pipeline emits typed, PUBLIC-SAFE progress events at the REAL stage boundaries; when it is absent (the
    // plain /ask handler, every test, the eval) the emitter is a no-op, so the return value and behaviour are
    // BYTE-IDENTICAL. `emit` never throws into the pipeline (a progress-sink error must never break an
    // answer), stamps the Rust schema token + a monotonic seq via makeProgressEvent, and SCRUBS every
    // payload of prose/secret fields. The pipeline NEVER emits a terminal (FINAL_VALIDATED / HONEST_FALLBACK
    // / REFUSED) or any model-token/delta event — the terminal is the SSE endpoint's job, AFTER validation.
    let _progressSeq = 0;
    const emit =
      typeof onProgress === "function"
        ? (kind, payload = {}) => {
            try {
              onProgress(makeProgressEvent(kind, payload, { seq: _progressSeq++, requestId, nowFn }));
            } catch {
              /* fecho por omissão — a progress-sink failure never affects the answer */
            }
          }
        : () => {};
    // REQUEST_ACCEPTED — the request is accepted + normalized (safe counts/enums only; never the text).
    emit("REQUEST_ACCEPTED", { mode, question_chars: String(question || "").length });
    // M2.9B: an active guided-journey step means the operator is working a concrete task; broaden the
    // grounded set for that answer. The step value is a safe Rust slug re-derived server-side; it only
    // widens grounding, never bypasses safety or routing.
    const onJourneyStep = Boolean(journeyStep && String(journeyStep).trim());

    // ── M2.18B.5 — deterministic typo tolerance / intent recovery (Rust, model-free). A HIGH-CONFIDENCE
    // correction is applied to a COPY of the question so the exact resolvers AND the safety boundary run on
    // the canonical form — a misspelled prohibited action keeps its verbal intent (§19), and a concept typo
    // ("fedaração") reaches its canonical source. An AMBIGUOUS correction never auto-resolves: it drives a
    // Rust clarification below (§12). Fuzzy never overtakes an exact match (recover only rewrites tokens
    // that are not already canonical). Scores are never exposed — only bands + display forms.
    const recovery = recoverQuery(question) || { band: "exact", corrected_query: question, corrections: [], clarification: [] };
    const correctedQuestion =
      recovery.band === "high_confidence" && recovery.corrected_query ? recovery.corrected_query : question;
    const nonDangerCorrections = (recovery.corrections || []).filter((c) => c && !c.danger);
    const correctionDisplay = nonDangerCorrections.map((c) => String(c.display || "")).filter(Boolean);

    // ── Rust routing preflight: safety + context + critical boundary + journey. Safety is SETTLED here,
    // before any model, and short conversation context (M2.8H) resolves anaphoric follow-ups
    // ("dá exemplo aqui", "e em JSON?") into a retrieval query. Context never bypasses safety.
    // §18 boundary recheck — route the RAW question AND the corrected form; a boundary in EITHER refuses,
    // so an orthographic evasion ("certifca o operador", "mostra a chabe privada") is still caught.
    // ── Increment 6 (§16-§17) — multi-turn conversational CONTEXT. Rust resolves the conversational
    // references in a follow-up turn ("essa execução", "a anterior", "esse Manifesto", "e as chaves?",
    // "porquê?", "compare com a última", "agora reproduza", "mostre o recibo") against the small, SAFE,
    // technical-only prior context the client carried forward from the previous turn's answer meta. The model
    // NEVER invents the referent. Context is only ACTED ON when the client actually carried a bindable prior
    // context, so a first turn and every existing call path (no conversation_context) behave EXACTLY as before.
    // SAFETY: a boundary turn is never enriched (resolution_state=BOUNDARY) — the RAW question still hits the
    // Tier-0 gate below, so "agora transfere 100 kz para essa execução" is refused; naming a referent never
    // unlocks a prohibited action.
    const priorContext = conversationContext && typeof conversationContext === "object" ? conversationContext : {};
    // ── DOMAIN SEPARATION ─────────────────────────────────────────────────────────────────────────
    //
    // The forwarded context serves two mechanisms that are deliberately NOT unified:
    //
    //   A  REFERENCE RESOLUTION (Increment 6)  execution / artifact / operator / implementation referents
    //   B  PRIOR-EVIDENCE CONTINUITY           previous_semantic_target + previous_source_ids
    //
    // Increment 6 activates on `has_prior_context`, derived from the context object it is handed. Adding the
    // B fields made it activate on conversations it owns nothing in — and when it activates, `route()` below
    // is called with an EMPTY history, so the frame merge cannot run at all. Measured:
    // "Quem governa os operadores?" → "E quem os autoriza?" fell from MERGED_FRAME to STANDALONE, and an
    // operator follow-up lost its entry entirely. Evidence metadata silently changed routing.
    //
    // So B is withheld from A. Not a resolver change and not a reconciliation of the two systems: the
    // resolver decides exactly as before, on exactly the fields it owns. The property is that provenance
    // context alone can never alter reference resolution.
    const PRIOR_EVIDENCE_FIELDS = ["previous_semantic_target", "previous_source_ids"];
    const referenceContext = {};
    for (const [k, v] of Object.entries(priorContext)) {
      if (!PRIOR_EVIDENCE_FIELDS.includes(k)) referenceContext[k] = v;
    }
    const references = resolveReferences(correctedQuestion, referenceContext) || {};
    const decisionRaw = route(question, contextQuestions || []);
    // Defense in depth: the RAW question's own refusal signal (safety refusal / financial-or-action boundary /
    // any refuse-* entry) DISABLES context enrichment — a prohibited action must never be rewritten into a
    // benign referent, so its raw form always reaches the refusal tiers below (the golden rule). The Rust
    // `resolve_references` already flags these as BOUNDARY; this is the belt-and-suspenders JS mirror.
    const rawRefusalSignal =
      decisionRaw.action === "refusal" ||
      decisionRaw.intent === "action_boundary" ||
      String(decisionRaw.entry_id || "").startsWith("refuse-");
    const contextActive = Boolean(references.has_prior_context) && !references.boundary_detected && !rawRefusalSignal;
    const contextResolved = contextActive && references.resolution_state === "RESOLVED";
    // The effective question the understanding stack sees: the context-enriched, self-contained query when a
    // reference resolved; otherwise the typo-corrected question (unchanged behaviour). A boundary/unresolved
    // reference keeps the corrected question, so the raw safety route still governs.
    const effectiveQuestion = contextResolved && references.resolved_query ? references.resolved_query : correctedQuestion;

    // §18 boundary RECHECK — route runs on the raw AND the typo-corrected form independently, so a boundary
    // that surfaces only after correction ("certifca…"→"certifica…") still refuses (a typo never buys a way
    // past the gate). Increment 6 adds the context-enriched `decision` as a THIRD boundary check; enrichment
    // is already disabled on any raw/corrected refusal signal, so it only ever tightens the gate.
    const decisionCorrected = correctedQuestion !== question ? route(correctedQuestion, contextQuestions || []) : decisionRaw;
    // Block 4B — PRIORITY, not accumulation. When the structured resolver (Increment 6) has already bound
    // the referent, `effectiveQuestion` IS the resolved, self-contained query; feeding the raw prior
    // questions to the router on top of it let the conversation's words re-resolve a target that structured
    // context had already decided. The ladder is: explicit current subject > valid prior structured target >
    // safe contextual interpretation > generic retrieval — so the two channels are ordered, never summed.
    // Rust still owns both resolutions; this only stops the second one from running over the first.
    const decision =
      effectiveQuestion !== question
        ? route(effectiveQuestion, contextResolved ? [] : contextQuestions || [])
        : decisionCorrected;
    const boundaryRefusal =
      decisionRaw.action === "refusal" || decisionCorrected.action === "refusal" || decision.action === "refusal";
    // M2.11D (QA-2) — a next-step question asked while ON a journey step is answered from the journey
    // state the same request already computed. The base route above is unchanged, so safety and the
    // critical boundary are settled before we get here.
    const journeyRoute =
      journeyStep && journeyNextActionSentence ? routeWithJourney(correctedQuestion, journeyStep) : null;
    const decisionEffective =
      journeyRoute && journeyRoute.action === "journey_next_step" ? journeyRoute : decision;
    const intent = decisionEffective.intent;
    // M2.18B.7 (REOPEN fix) — the guided journey owns ONLY a genuine next-step turn ("o que faço agora?"),
    // NOT every question asked while a step happens to be active. A concrete task (example / procedure /
    // template), a bare document lookup, or an exact attribute is still answered by its DETERMINISTIC
    // terminal even mid-journey — a journey being active never turns "dá-me um exemplo de federação" into a
    // slow synthesis that can degrade to "erro temporário". So the deterministic terminals below gate on
    // journeyOwnsTurn (this turn IS the journey's next-step answer), not on the mere presence of a step.
    const journeyOwnsTurn = decisionEffective.action === "journey_next_step";
    // The effective query for grounding: the resolved (context-merged) query if a follow-up was detected,
    // else the Increment-6 context-enriched question (falls back to the typo-corrected question). The trunk
    // answers this effective query.
    let rq = decision.resolved_query || effectiveQuestion;
    const nq = normalize(rq);
    // M2.13B PR2 — the cache key binds the repo-wide index hash (a changed index/commit invalidates every
    // cached answer) AND the safety-policy version (a boundary change invalidates too).
    // SPR-3 — bind the synthesis-generation contract (baseline ↔ structured) into the validated cache key so
    // switching the output contract opens a fresh validated-cache namespace and never serves a cross-contract
    // hit. It joins the existing corpus/repo/safety/contract/post-validation-policy dimensions; a change to
    // ANY of them evicts stale entries. Caching remains downstream of the ADR-036 gate (validated-only).
    // BZCI-5 (§21) — the validated-cache key binds the RESOLVED conversational referent so two visually-identical
    // follow-ups ("e a anterior?", "mostra essa execução") in DIFFERENT conversations can never collide on a
    // cached answer. For a concept ellipsis the referent already lives in `nq` (the rewritten "o que é X?"); for
    // an execution/artifact bind the id is carried structurally and would otherwise be invisible to the key —
    // this dimension makes it visible. Empty on a self-contained turn, so first-turn keys are unchanged.
    const convRef =
      references && references.resolution_state === "RESOLVED"
        ? [
            references.referent_kind || "",
            references.execution_id || "",
            Array.isArray(references.comparison_targets) ? references.comparison_targets.join(",") : "",
            references.artifact || "",
            references.operator_id || "",
            references.implementation_id || "",
            references.resolved_subject || "",
          ]
            .filter(Boolean)
            .join("|")
        : "";
    const keyFields = { question: nq, provider: provider.name, lang, mode, sourcesHash: CORPUS_HASH, repoIndexHash: REPO_INDEX_HASH, safetyVersion: SAFETY_POLICY_VERSION, contractVersion: CONTRACT_VERSION_KEY, postValidationPolicy: POST_VALIDATION_POLICY_VERSION, synthesisContract: synthesisContractVersion(), convRef };
    // M2.18B.7 (TFG-3) — context control: classify HOW context resolved this turn and pin the question
    // whose TASK governs the answer shape to the CURRENT turn (a prior turn's verb can never change an
    // explicit task). Context still supplies the SUBJECT via the resolved query + seeded entity.
    const hasTurnContext =
      Boolean(decision.context_used) || (Array.isArray(contextQuestions) && contextQuestions.length > 0);
    const ctxDecision = contextUsedFor(correctedQuestion, rq, hasTurnContext);
    const taskQuestion = ctxDecision.task_question || correctedQuestion;
    // Increment 6 — the NEW, SAFE, technical-only conversation_context returned in the meta so the client can
    // carry it to the next turn. Built from the resolved entity/artifact/scope of THIS turn merged with the
    // prior context (carry-forward). ONLY whitelisted technical fields — no free text, PII, secrets or prose.
    // BZCI-2 — a concept/glossary deterministic terminal (entry_id "def-*") grounds an explain_concept answer
    // that the taxonomy classifier reports as "unsupported"; hint the forward-context builder so the NEXT turn
    // inherits the right intent+subject (the ADR→RFC chain). Derived from the route decision, never invented.
    const fwdEntryId = String((decisionEffective && decisionEffective.entry_id) || decision.entry_id || "");
    // The SEMANTIC ID of whatever this turn resolved, alongside the human label. The label is for a
    // reader; the id is what the next turn resolves against.
    const fwdHints = fwdEntryId.startsWith("def-")
      ? {
          intent: "explain_concept",
          subject: fwdEntryId.replace(/^def-/, "").replace(/-/g, " "),
          subject_id: fwdEntryId,
        }
      : fwdEntryId
        ? { subject_id: fwdEntryId }
        : {};
    const conversationContextForward = buildForwardContext(priorContext, resolveScope(rq), resolveQuery(rq), references, fwdHints);
    // Safe conversation-context telemetry (booleans/counts only — never the conversation content).
    // BZCI-6 (§36) — drive the "context used" telemetry from BOTH channels: the structured Inc.6 resolver
    // (contextResolved) AND the M2.8H text path (decision.context_used), so the envelope stops masking whether
    // the structured engine actually ran. context_turns_used counts at least one turn when the structured
    // resolver bound a referent.
    const structuredContextUsed = Boolean(contextResolved);
    // A SOURCE FOLLOW-UP: this turn asks for the evidence behind the previous answer. Rust decided it
    // (`frame::Merge::SourceFollowup`); the target is the previous turn's, and the operation is this turn's.
    const isSourceFollowup = decision.merge_kind === "SOURCE_FOLLOWUP";
    /**
     * Does the structured conversation context lead to a NON-EMPTY set of eligible public sources?
     *
     * The forwarded context carries technical ids, not a source list, so availability cannot be read off
     * it directly. It is derived the same way the source-followup terminal derives what it serves: the
     * prior target that context resolved, and that record's own public evidence. One derivation, so the
     * flag and the answer can never disagree about what was available.
     *
     * False when context was not used at all, when it resolved no record, and — the case that separates
     * this from the boolean it replaces — when the record it resolved carries no citable evidence.
     */
    /**
     * The PRIOR evidence this conversation actually established — revalidated, never trusted.
     *
     * Deriving it from `decision.entry_id` was falsified: on a context-carrying turn that is the CURRENT
     * turn's resolved target. After "Quem certifica uma implementação?", "mostra em JSON" resolves to
     * `implementation-steps`, so availability reported THAT record's sources under a "previous" name.
     *
     * The identities now travel in the client-carried context, because the conversation is stateless across
     * turns and nothing else can carry them. That makes them a HINT and not authority:
     *
     *   client supplies  prior target + prior source ids
     *   server resolves  the canonical record for that target
     *   server keeps     only ids that are genuinely that record's PUBLIC evidence
     *
     * Both halves matter. Checking that an id merely exists and is public would let a caller replay valid
     * identities from one target into a follow-up about another; binding them to the prior target is what
     * makes the pair coherent. Nothing here reads a client-supplied title, path, class or role — the
     * registry owns those, so a browser cannot promote a file into a source card by naming it.
     */
    const validateIncomingPriorEvidence = () => {
      const targetId = String(priorContext.previous_semantic_target || "").trim();
      const claimed = Array.isArray(priorContext.previous_source_ids) ? priorContext.previous_source_ids : [];
      if (!targetId || claimed.length === 0) return [];
      const target = getEntry(targetId);
      if (!target) return [];
      const legitimate = new Set(publicSourcesOnly(target.sources).map((x) => String(x.id)));
      return claimed.map(String).filter((id) => legitimate.has(id));
    };
    /** INCOMING: what the PREVIOUS turn established, revalidated. Never the current turn's routing. */
    const incomingPriorEvidence = validateIncomingPriorEvidence();
    const ctxMeta = {
      conversation_context_used: structuredContextUsed || Boolean(decision.context_used),
      context_turns_used: Math.max(Number(decision.turns_used) || 0, structuredContextUsed ? 1 : 0),
      // `previous_sources_reused` used to mean "context was used somewhere", which is not reuse of
      // evidence: it read `true` for a turn whose previous answer carried no sources at all. Nothing
      // outside this service consumed it (audited: only server.js echoed it), so the pair is corrected
      // rather than preserved with a wrong meaning.
      //
      // AVAILABLE is about EVIDENCE, not about context. Renaming the loose boolean would have been the
      // same defect with a better name — "there is prior context" says nothing about whether that context
      // leads to anything citable. So it is answered by resolving the prior target and asking whether its
      // record actually carries eligible public sources. A conversation whose previous turn established
      // nothing has no evidence available, however much history it has.
      previous_sources_available: incomingPriorEvidence.length > 0,
      // Internal: consumed and removed at the exit point, where the answer's own sources are known.
      __incoming_prior_evidence: incomingPriorEvidence,
      // The strict claim, stamped downstream once the answer's evidence is known: true only when prior
      // source identities actually participate in THIS answer. Declared false here so every path that
      // forgets to establish it reports the weaker, honest value.
      previous_sources_reused: false,
      context_used_for: isSourceFollowup ? "source_evidence" : ctxDecision.context_used_for || "none",
      // Increment 6 — the multi-turn reference-resolution trace (safe labels/ids only) + the forward context.
      conversation_context: conversationContextForward,
      reference_resolution_state: references.resolution_state || "NO_ANAPHORA",
      reference_referent_kind: references.referent_kind || "none",
      reference_resolved_intent: references.resolved_intent || "",
      reference_execution_id: safeCtxId(references.execution_id || ""),
      // BZCI-2 (§3/§25) — the typed turn class + the inherited-intent / resolved-subject skeleton.
      reference_turn_type: references.turn_type || "STANDALONE",
      reference_resolved_subject: safeCtxSubjectMeta(references.resolved_subject || ""),
      reference_inherited_intent: safeCtxId(references.inherited_intent || ""),
    };

    // ── M2.18B.4 — the SINGLE router's typed verdict (Rust). `cls` is the exact-vs-explanatory class;
    // `hasExplanatoryCue` is a REAL meaning/why/how/compare/impact cue (not the mere ambiguity default),
    // which escalates even a source-bound definition entry into the explanatory trunk (D2 ambiguity rule:
    // when in doubt, EXPLAIN — never a partial exact answer).
    const cls = answerClass(rq) || { class: "explanation", exact_kind: "", escalated: false, reason: "" };
    const hasExplanatoryCue =
      cls.class === "comparison" ||
      cls.class === "impact" ||
      (cls.class === "explanation" && cls.reason !== "default: ambiguity favours explanation");
    // The unified routing trace (ONE trace model). No prompt, model instructions or non-public content.
    // Back-compat trace fields (fast_path_used / routing_result / synthesis) for the server/UI contract.
    // adapters keep reading the trace; the trunk block overwrites them when it runs.
    const routerTrace = {
      router: "m2.18b4-single",
      // Block 4B — WHICH merge rule decided this turn: STANDALONE (the turn names its own subject) /
      // INHERIT_TARGET (a pure backward reference reuses the previous target) / MERGED_FRAME (a new action
      // over the inherited subject) / SUBJECT_CARRY / SUBJECT_CARRY_DECLINED / CONTEXT_TARGET_MISSING.
      // One field, so the Root→operator drift is readable in a single trace instead of inferred from a
      // composed query string. Decided in Rust; carried, not recomputed, here.
      context_merge: decision.merge_kind || "STANDALONE",
      answer_class: cls.class,
      answer_class_reason: cls.reason || "",
      escalated: Boolean(cls.escalated),
      explanatory_cue: hasExplanatoryCue,
      fast_path_used: true,
      // Rust understands every question deterministically; the model is only ever the single grounded
      // synthesis (below). On a terminal/fast path there is no synthesis call.
      resolution_method: "rust_deterministic",
      synthesis_called: false,
      synthesis_status: "n/a",
      synthesis_model: null,
      synthesis_latency_ms: 0,
      fallback_used: false,
      routing_result: null,
      synthesis: null,
      // M2.18B.5 — typo tolerance / intent recovery (safe subset; NEVER edit-distance or scores).
      recovery_band: recovery.band || "exact",
      correction_applied: correctedQuestion !== question,
      correction_display: correctionDisplay,
      correction_clarification: recovery.clarification || [],
    };

    // INTENT_RESOLVED — the deterministic taxonomy settled the primary intent + answer class. Emitted for
    // EVERY path (a boundary too), BEFORE the Tier-0 refusal below, so a boundary/refusal streams exactly
    // REQUEST_ACCEPTED → INTENT_RESOLVED → (terminal REFUSED) with NO synthesis events. Safe enums only.
    emit("INTENT_RESOLVED", {
      intent,
      answer_class: cls.class,
      escalated: Boolean(cls.escalated),
      explanatory_cue: hasExplanatoryCue,
      boundary_detected: Boolean(boundaryRefusal),
      recovery_band: recovery.band || "exact",
      correction_applied: correctedQuestion !== question,
    });

    // Tier 0 — SAFETY REFUSAL terminal (injection/system-prompt/chain-of-thought/boundary/financial).
    // ALWAYS first: naming a real document must never buy a way past the safety gate. No model is touched.
    // §18/§19 — `boundaryRefusal` is true when EITHER the raw or the typo-corrected form is a boundary, so a
    // misspelled prohibited action ("certifca o operador") is refused, never softened into an explanation.
    if (boundaryRefusal) {
      return safetyRefusal({ answer_mode: mode, fallback_reason: "safety_refusal", intent, terminal_kind: "safety_refusal", trace_label: "Limite de segurança aplicado por Rust", ...ctxMeta, ...routerTrace });
    }

    // Tier 0a1 — Increment 6 (§16): a conversational reference the prior context CANNOT bind → a single
    // concrete clarifying question (Rust-authored, honest, request-oriented), NEVER a guessed referent. Runs
    // AFTER the Tier-0 safety refusal (a boundary follow-up is refused first) and only when the client
    // actually carried a prior context that this specific anaphor could not resolve against.
    if (contextActive && references.requires_clarification && references.clarification) {
      // `references.clarification` is the ENGINE's Portuguese sentence and is diagnostics here, exactly as
      // `fb.message` is on the contextual-fallback path. The reader gets the realization of the same
      // decision in their own language — see `referenceClarificationProse`.
      return stated(referenceClarificationProse(references.referent_kind || "none", locale), {
        answer_mode: mode,
        fallback_reason: "context_reference_unresolved",
        intent: "clarification_required",
        terminal_kind: "clarification",
        answer_locale: locale,
        trace_label: "Referência conversacional por resolver (Rust)",
        reference_referent_kind: references.referent_kind || "none",
        ...ctxMeta,
        ...routerTrace,
      });
    }

    // Tier 0b — ENTITY + ARTIFACT + SCOPE DOMINATION (BZC-1, Rust-decided; 0 model calls). Runs right after
    // safety and BEFORE every documental/concept path below. When a question names an operator/implementation
    // entity together with an implementation-scoped artifact (e.g. "o manifesto do operador zero"), the
    // request is for THAT implementation's LIVE artifact — published by the implementation at its canonical
    // origin — never a generic protocol document. Rust owns the entire decision (entity, artifact, scope,
    // requires_live_tool) and authors the honest answer; TS only transports. Until the live tool (BZC-2)
    // exists this serves the Rust-authored honest terminal that NAMES the implementation artifact,
    // DISTINGUISHES it from the Protocol Manifesto, and states the live tool is not yet available — it NEVER
    // substitutes the Protocol Manifesto and NEVER simulates the artifact content. This is what fixes
    // "manifesto do operador zero" wrongly resolving to docs/reference/manifesto.md.
    const scope = resolveScope(rq);
    const scopeMeta = {
      entity_id: scope.entity_id || null,
      entity_display: scope.entity_display || null,
      entity_type: scope.entity_type || null,
      protocol_scope: scope.protocol_scope || null,
      artifact_type: scope.artifact_type || null,
      requires_live_tool: Boolean(scope.requires_live_tool),
      authority_requirement: scope.authority_requirement || "none",
      scope_resolution_method: scope.resolution_method || null,
    };
    // A genuine safety refusal is served by the tiers below and MUST NOT be bypassed by an entity+artifact
    // route: naming an artifact never buys a way past the safety gate. The genuine refusal signals are
    // action="refusal" (injection/system-prompt, Tier 0) and a prohibited-action route — intent
    // action_boundary or any `refuse-*` entry (financial / secret exposure / certify-authorize-approve),
    // served at Tier 1. NOTE: intent `critical_boundary` is NOT treated as a refusal here — it is also
    // attached to sensitive-concept DEFINITIONS and to Operator-Zero CONTENT entries (e.g.
    // `operador-zero-revocation`), which are legitimate entity+artifact requests the scope tier must serve.
    const routedEntry = String((decision && decision.entry_id) || "");
    const isBoundaryDecision =
      boundaryRefusal || intent === "action_boundary" || routedEntry.startsWith("refuse-");
    // ENTITY_RESOLVED — the entity/artifact/scope resolver settled the subject (safe ids/enums only). Emitted
    // ONLY for a NON-boundary decision: a prohibited-action/financial boundary (served as a refusal at Tier 1)
    // must stream exactly REQUEST_ACCEPTED → INTENT_RESOLVED → REFUSED — never entity progress for a refusal.
    if (!isBoundaryDecision) {
      emit("ENTITY_RESOLVED", {
        entity_id: scope.entity_id || null,
        entity_type: scope.entity_type || null,
        artifact_type: scope.artifact_type || null,
        protocol_scope: scope.protocol_scope || null,
        requires_live_tool: Boolean(scope.requires_live_tool),
        authority_requirement: scope.authority_requirement || "none",
      });
    }
    if (!isBoundaryDecision && scope.requires_live_tool && scope.live_required_answer) {
      // BZC-2 — try the LIVE secure-fetch tool: Rust decided the entity+artifact; the tool resolves the
      // target in the closed Technical Registry (Rust) and obtains the artifact via the SSRF-hardened Rust
      // fetcher, returning origin/version/profile/environment/sha256/observed_at. On success we SHOW it; on
      // any failure we serve an honest message that names the artifact + reason — NEVER the Protocol
      // Manifesto, never simulated content.
      // TOOL_PLAN_READY + TOOL_STARTED — the deterministic single-step plan for the LIVE artifact fetch.
      emit("TOOL_PLAN_READY", { steps: ["LIVE_ARTIFACT_FETCH"], primary_intent: "get_implementation_artifact" });
      emit("TOOL_STARTED", { tool_kind: "LIVE_ARTIFACT_FETCH", entity_id: scope.entity_id || null, artifact_type: scope.artifact_type || null });
      let tool = null;
      if (liveArtifactTool && typeof liveArtifactTool.fetchArtifact === "function") {
        try {
          tool = await liveArtifactTool.fetchArtifact(scope);
        } catch (e) {
          tool = { ok: false, error: { code: "TOOL_EXCEPTION", message: String((e && e.message) || e) } };
        }
      }
      emit("TOOL_COMPLETED", {
        tool_kind: "LIVE_ARTIFACT_FETCH",
        outcome: tool && tool.ok ? "ok" : "error",
        error_code: tool && tool.error && tool.error.code ? String(tool.error.code) : null,
      });
      if (tool && tool.ok && tool.observation) {
        const o = tool.observation;
        const a = tool.authority || {};
        // SOURCE_RESOLVED — the live artifact was obtained (origin/sha256/version, never its content).
        emit("SOURCE_RESOLVED", {
          source_kind: "live_artifact",
          implementation_id: o.implementation_id || null,
          canonical_origin: o.canonical_origin || null,
          artifact_sha256: o.sha256 || null,
          artifact_version: o.version || null,
        });
        return {
          result: {
            grounded: true,
            answer: tool.answer_markdown,
            sources: Array.isArray(tool.sources) ? tool.sources : [],
            entry_id: `live-${o.implementation_id}-${o.artifact_type}`,
            provider: provider.name,
            mode: isReal ? "real" : "mock",
            guardrails: GUARDRAILS,
          },
          meta: {
            deterministic: true,
            cache: null,
            llm_called: false,
            answer_mode: mode,
            fallback_reason: null,
            reason_code: "implementation_artifact_fetched_live",
            trace_label: "Artefacto de implementação obtido ao vivo (Registo Técnico → obtentor Rust → digest)",
            ...ctxMeta,
            ...routerTrace,
            ...scopeMeta,
            // observed live-artifact provenance (BZC-2)
            operator_id: o.operator_id,
            implementation_id: o.implementation_id,
            canonical_origin: o.canonical_origin,
            artifact_url: o.url,
            artifact_sha256: o.sha256,
            artifact_observed_at: o.fetched_at,
            artifact_version: o.version,
            artifact_protocol_version: o.protocol_version,
            artifact_profile: o.profile,
            artifact_environment: o.environment,
            authority_kind: a.kind || "origin_bound_live_fetch",
            authority_scope: a.scope || "publication_and_integrity",
            tls_verified: Boolean(a.tls_verified),
            digest_matches: Boolean(a.digest_matches),
            intent: "get_implementation_artifact",
            terminal_kind: "entity_artifact_live_fetched",
            resolution_method: "rust_entity_artifact_scope",
          },
        };
      }
      // Tool failed OR not configured → honest terminal. When the tool ran but could not obtain the
      // artifact, name the reason; otherwise fall back to the Rust-authored "live tool pending" answer.
      const failCode = tool && tool.error && tool.error.code ? String(tool.error.code) : "";
      const answer =
        failCode && failCode !== "TOOL_EXCEPTION"
          ? honestLiveFailureAnswer(scope, tool.error)
          : scope.live_required_answer;
      return {
        result: {
          grounded: false,
          answer,
          sources: [], // deliberately empty — NEVER cite the Protocol Manifesto for an implementation artifact
          entry_id: `scope-${scope.entity_id}-${scope.artifact_type}`,
          provider: provider.name,
          mode: isReal ? "real" : "mock",
          guardrails: GUARDRAILS,
        },
        meta: {
          deterministic: true,
          cache: null,
          llm_called: false,
          answer_mode: mode,
          fallback_reason: failCode ? `live_fetch_${failCode.toLowerCase()}` : "live_tool_unavailable",
          reason_code: failCode
            ? `implementation_artifact_live_${failCode.toLowerCase()}`
            : "implementation_artifact_requires_live_tool",
          trace_label: failCode
            ? "Entidade + artefacto resolvidos por Rust — obtenção ao vivo falhou (motivo reportado)"
            : "Entidade + artefacto resolvidos por Rust — artefacto de implementação (ferramenta live pendente)",
          ...ctxMeta,
          ...routerTrace,
          // Authoritative BZC-1 keys LAST — they must win over any same-named routerTrace field
          // (e.g. resolution_method) so the trace faithfully reports the entity+artifact+scope route.
          ...scopeMeta,
          intent: "get_implementation_artifact",
          terminal_kind: failCode ? "entity_artifact_live_failed" : "entity_artifact_live_required",
          resolution_method: "rust_entity_artifact_scope",
        },
      };
    }

    // Tier 0c — OPERATIONAL METRIC (ADR-036; Rust-decided, 0 model calls). A duration/metric/live-state
    // question about the validation journey ("quanto tempo leva uma jornada de validação?") is a real,
    // answerable question — it must NEVER fall to the fixed topic list. It is answered from REAL telemetry
    // over persisted executions (read-only, public workspace, ONE compatibility tuple — never mixed) with 0
    // model calls (numbers come only from SQL). Gated on !isBoundaryDecision so naming "jornada de validação"
    // never buys past a refusal (the Rust classifier also defers any boundary question). When there are not
    // enough comparable measurements, serve the Rust-authored honest, request-oriented fallback — NEVER the
    // fixed list, NEVER a fabricated number.
    const opMetric = resolveOperationalMetric(rq);
    // Increment 5 — the fine EXECUTION families (comparison / diagnosis) that the operational classifier
    // collapses into a live-state/duration ask are OWNED by the question-family tier (Tier 3b): it produces a
    // real field-by-field diff / a labelled diagnosis from the receipt store, never the duration fallback. Let
    // those bypass this operational tier. The resolveQuery call is short-circuited to operational questions only.
    const operationalOwnsTurn =
      !isBoundaryDecision &&
      opMetric &&
      opMetric.is_operational &&
      opMetric.requires_live_data &&
      !["compare_executions", "diagnose_failure"].includes(resolveQuery(rq).primary_intent);
    if (operationalOwnsTurn) {
      const opMeta = {
        intent: opMetric.intent,
        operational_subject: opMetric.subject || "",
        operational_metric: opMetric.metric || "",
        operational_aggregation: opMetric.aggregation || "",
        requires_live_data: true,
        external_model_called: false,
      };
      // TOOL_PLAN_READY + TOOL_STARTED — the read-only telemetry (metrics) query for this operational ask.
      emit("TOOL_PLAN_READY", { steps: ["METRICS_QUERY"], primary_intent: opMetric.intent || "operational_metric" });
      emit("TOOL_STARTED", { tool_kind: "METRICS_QUERY", operational_metric: opMetric.metric || null, operational_subject: opMetric.subject || null });
      let t = null;
      if (telemetryTool && typeof telemetryTool.getDuration === "function") {
        try {
          t = await telemetryTool.getDuration(opMetric);
        } catch (e) {
          t = { ok: false, error: { code: "TOOL_EXCEPTION", message: String((e && e.message) || e) } };
        }
      }
      emit("TOOL_COMPLETED", {
        tool_kind: "METRICS_QUERY",
        outcome: t && t.ok ? "ok" : "error",
        comparable_n: (t && t.observation && t.observation.comparable_n) || 0,
        error_code: t && t.error && t.error.code ? String(t.error.code) : null,
      });
      if (t && t.ok && t.observation && (t.observation.comparable_n || 0) >= 1) {
        // Increment 4 (§7/§9) — route the deterministic telemetry answer through the SAME transversal
        // FactualPackage + claim/citation verifier the documentary trunk uses, so provenance + verification
        // are uniform. Rust builds the package from the tool's own output (numbers copied verbatim from SQL —
        // no model), then classifies every claim and verifies every citation resolves to a package source.
        const opClaims = Array.isArray(t.claims) ? t.claims : [];
        const opSources = Array.isArray(t.sources) ? t.sources : [];
        const opPkg = buildOperationalPackage(String(keyFields.repoIndexHash || ""), rq, t.duration || {}, opClaims, opSources);
        // FACTUAL_PACKAGE_READY — the transversal package assembled from REAL telemetry, BEFORE the answer is
        // rendered. Deterministic path: it carries only the compact, public-safe summary (counts/ids/enums/
        // checksums), never the normalized question or any prose. No model runs, so no synthesis events.
        if (opPkg) {
          const s = factualPackageSummary(opPkg) || {};
          emit("FACTUAL_PACKAGE_READY", {
            source: "operational_telemetry",
            primary_intent: s.primary_intent || opMetric.intent || null,
            facts_count: s.facts_count || 0,
            documentary_sources: Array.isArray(s.documentary_sources) ? s.documentary_sources : [],
            tools_called: Array.isArray(s.tools_called) ? s.tools_called : [],
            sample_size: s.sample_size || 0,
            aggregation_method: s.aggregation_method || null,
            package_checksum: s.package_checksum || null,
          });
        }
        const opVerdict = opPkg
          ? verifyClaims(opPkg, {
              answer_markdown: String(t.answer_markdown || ""),
              claims: opClaims,
              cited_source_ids: opSources.map((s) => (s && s.id) || "").filter(Boolean),
            })
          : { ok: false, errors: ["operational package unavailable"] };
        // Defence in depth: a deterministic telemetry answer must pass; if verification ever fails (an
        // invented source / an unexposed derivation), never publish it — serve the honest fallback below.
        if (opVerdict && opVerdict.ok) {
          return {
            result: {
              grounded: true,
              answer: t.answer_markdown,
              sources: opSources,
              entry_id: null,
              provider: provider.name,
              mode: isReal ? "real" : "mock",
              guardrails: GUARDRAILS,
            },
            meta: {
              deterministic: true,
              cache: null,
              llm_called: false,
              answer_mode: mode,
              fallback_reason: null,
              reason_code: "OPERATIONAL_MEASUREMENT_REPORTED",
              terminal_kind: "operational_duration",
              answer_type: "operational_duration",
              trace_label:
                "Medição operacional a partir de telemetria de execuções persistidas (apenas leitura, 0 chamadas ao modelo)",
              duration: t.duration || null,
              claims: opClaims,
              telemetry_scope: (t.observation && t.observation.scope) || null,
              factual_package: factualPackageSummary(opPkg),
              claim_verification_ok: true,
              ...ctxMeta,
              ...routerTrace,
              ...opMeta,
              resolution_method: "rust_operational_telemetry",
            },
          };
        }
        // Verification failed on a deterministic answer (should not occur) → degrade to the honest fallback.
        return stated(opMetric.honest_fallback, {
          answer_mode: mode,
          fallback_reason: "operational_verification_failed",
          reason_code: "OPERATIONAL_VERIFICATION_FAILED",
          terminal_kind: "insufficient_measurements",
          answer_type: "operational_duration",
          trace_label: "Medição operacional não validada (verificação de afirmações/citações) — declínio honesto",
          factual_package: factualPackageSummary(opPkg),
          claim_verification_ok: false,
          ...ctxMeta,
          ...routerTrace,
          ...opMeta,
          resolution_method: "rust_operational_telemetry",
        });
      }
      // Understood, but not enough comparable measurements (or telemetry disabled/unavailable) → the
      // Rust-authored honest, request-oriented fallback. NEVER the fixed list; NEVER a fabricated number.
      const failCode = t && t.error && t.error.code ? String(t.error.code) : "INSUFFICIENT_MEASUREMENTS";
      return stated(measurementProse(opMetric, locale), {
        answer_mode: mode,
        answer_locale: locale,
        fallback_reason: "insufficient_measurements",
        reason_code: "INSUFFICIENT_MEASUREMENTS",
        terminal_kind: "insufficient_measurements",
        answer_type: "operational_duration",
        trace_label:
          "Pergunta operacional compreendida — sem medições públicas comparáveis suficientes (declínio honesto)",
        operational_fallback_detail: failCode.toLowerCase(),
        ...ctxMeta,
        ...routerTrace,
        ...opMeta,
        resolution_method: "rust_operational_telemetry",
      });
    }

    // Tier 0b — SOURCE EVIDENCE. The reader asked what supported the previous answer.
    //
    // This runs BEFORE the substantive terminals, because those would answer the previous question again —
    // which is precisely the production failure. The previous turn stays the semantic owner: this turn does
    // not re-adjudicate the proposition, it reports the evidence the proposition rested on. So the entry is
    // unchanged and no verdict is recomputed.
    //
    // The target comes from structured conversation state (Rust resolved it from the prior QUESTION, which
    // is what the server forwards), never from the assistant's prose. The evidence comes from the record
    // itself, never from a fresh repo-wide search: "nearest document" must not get to decide what the
    // reader meant, and the sources shown must be the ones that actually established the claim.
    if (isSourceFollowup) {
      // A CONSUMER of validated context, never the owner of its truth. This terminal used to assert
      // `available: true` for itself, which made every test of that flag on this path vacuous — it hid a
      // broken state-D test once and the availability half of the tamper matrix once.
      //
      // A verified source list REQUIRES the round-tripped evidence context. History alone carries the words
      // of the conversation, not the relationship "these sources supported that answer", so it cannot prove
      // provenance and must not be made to look as if it had.
      const targetEntry = decision.entry_id ? getEntry(decision.entry_id) : null;
      const validated = new Set(incomingPriorEvidence);
      const evidence = targetEntry
        ? publicSourcesOnly(targetEntry.sources).filter((x) => validated.has(String(x.id)))
        : [];
      if (!targetEntry || evidence.length === 0) {
        // A record with no eligible public evidence has nothing to show, and saying so is the honest
        // answer. Inventing sources by retrieval would be worse than declining, and claiming reuse of an
        // empty set would make the field a lie.
        return contextualInsufficient(rq, "", {
          answer_mode: mode,
          fallback_reason: "no_previous_evidence",
          intent,
          terminal_kind: "insufficient_evidence",
          ...ctxMeta,
          ...routerTrace,
        }, locale);
      }
      // Composed FOR THE RESOLVED LOCALE, in the same shape the corpus uses, so the frontend renders it
      // with no new component and the source cards are the EXISTING objects — Block 5B stays the owner of
      // what an ADR, a spec or an unclassified source is called.
      //
      // This line used to emit the Portuguese sentence, a separator and the English sentence together,
      // regardless of who was asking — the same concatenation the knowledge entries were migrated out of,
      // surviving in a terminal composer because terminals were never part of that migration.
      const record = {
        id: targetEntry.id,
        // Declared identity, not inferred shape: a terminal says what it is rather than being recognised
        // by the absence of `realizations`, which any malformed object also satisfies.
        precomposed_terminal: "source_evidence",
        answer_locale: locale,
        answer: TERMINAL_TEXT.source_evidence[locale] || TERMINAL_TEXT.source_evidence[DEFAULT_LOCALE],
        // The validated identities only. A tampered id never reaches a card because it never survived
        // revalidation — the same set `previous_sources_available` is computed from.
        sources: evidence,
      };
      return deterministic(record, {
        answer_mode: mode,
        fallback_reason: null,
        intent,
        terminal_kind: "source_evidence",
        trace_label: "Fontes da resposta anterior, confirmadas por Rust",
        ...ctxMeta,
        ...routerTrace,
      }, locale);
    }

    // Tier 1 — a deterministic critical-boundary / canonical-definition entry (source-bound, model-free).
    // These ARE the exact/definition/safety terminals. The escalation rule: a definition entry asked with
    // a REAL explanatory cue ("por que…", "como funciona…", "compara…") is NOT served flat — it enters the
    // explanatory trunk (grounded on the concept's canonical source), so an explanation is a real
    // explanation, never a canned definition.
    // A NORMATIVE DENIAL is exempt from that escalation: "does resilience mean zero downtime?" carries an
    // explanatory cue, and the answer is *no*. Sending it to the trunk would have a model recompose a
    // bounded guarantee, which is how the bound goes soft. Rust owns which entries these are.
    // A SETTLED record is served whatever the cue: normative denials, and the corrections for the relations
    // BANZA prohibits. Rust decides which; see `is_verbatim_entry`, where the production incident that
    // established the second class is recorded.
    //
    // Settlement is not the route id alone. A record settles only if it still carries eligible establishing
    // evidence, because "the router said deterministic" is a claim about the QUESTION and evidence is a
    // claim about the ANSWER — and a critical correction served without a public source it rests on would be
    // a canned truth, which is the failure mode on the other side of this one. With the evidence gone the
    // honest outcome is to say so: no canned answer, and no model either. The check runs only on the
    // cue-escalation exemption, so the settled path for a question with no cue is byte-for-byte unchanged.
    const verbatimEntry = decision.entry_id ? isVerbatimEntry(decision.entry_id) : false;
    // Tier 1-COMPARE — a comparison is served from BOTH sides, or not served as a comparison.
    //
    // Every selector in this pipeline names ONE subject. A two-sided question therefore used to be
    // answered with whichever side matched first: `Qual é a diferença entre L2 e L3?` returned the L2
    // definition alone with `degraded: true`, and its English twin fell to the model and invented "L3
    // introduces a lineage that ties keys to a trusted set", citing reason-codes and root-authority
    // ADRs. The first repair pointed profile comparisons at `def-profiles`, which works for exactly one
    // family and needs a hand-authored combined entry for every other pair.
    //
    // Rust plans the comparison: it extracts the two sides and resolves each INDEPENDENTLY through the
    // same resolvers a single-subject question uses. This serves that plan.
    //
    //   both sides resolved  → both entries' evidence, both realizations, one answer
    //   either side missing  → an honest decline naming the side that did not resolve
    //
    // The second case is the point. A comparison with one side unresolved is not a comparison, and
    // presenting the resolved half as though it answered the question is the defect this replaces.
    const comparison = comparisonPlan(correctedQuestion);
    // At least one side must resolve as a KNOWLEDGE concept for this tier to own the turn.
    //
    // "compara com a anterior" and "compara a execução X com a Y" are comparisons too, and they belong
    // to the operational family, which resolves execution operands from the receipt store rather than
    // concepts from the corpus. Neither of their sides is a concept, so requiring one keeps this tier
    // to conceptual comparisons and leaves the operational path exactly as it was. Measured: without
    // this, the execution-comparison family started receiving "name the second concept".
    // Tier 1-REFERENT — follow-ups whose subject is in the CONVERSATION, not in the question.
    //
    // These consume the structured identities the previous turns established. They do not re-read the
    // previous answer's prose: the identity is what routing decided, and recovering it from wording
    // would mean guessing at something already known exactly.
    //
    // Conservative by construction. Each shape requires the specific state it needs to be present — a
    // comparison follow-up needs two identities, a document follow-up needs a document — and falls
    // through when it is not. Nothing here picks "the most recent noun" and hopes.
    // Gated on HAVING structured context, not on the anaphora resolver having bound something.
    //
    // `contextActive` means "the reference resolver found and bound an anaphor". These follow-ups
    // frequently contain no anaphor for it to bind — "Compara-os." names nothing, "Is it normative?"
    // has an `it` the resolver reports as NO_ANAPHORA — so gating on it meant the tier never ran on
    // exactly the turns it exists for. Measured: the conversation carried `previous_subject_id` and
    // `last_document_id` correctly and nothing read them.
    const referentCtx = priorContext && typeof priorContext === "object" ? priorContext : {};
    const hasStructuredReferents = Boolean(
      referentCtx.last_subject_id ||
        referentCtx.previous_subject_id ||
        referentCtx.comparison_left ||
        referentCtx.last_document_id ||
        referentCtx.hybrid_subject_id,
    );
    if (hasStructuredReferents && !references.boundary_detected && !rawRefusalSignal && !journeyOwnsTurn) {
      const cc = referentCtx;
      const nq = normalize(correctedQuestion);

      // SOURCE FOLLOW-UP resolved from STRUCTURED STATE, not from a pronoun list.
      //
      // The frame recogniser requires an explicit referential TOKEN — `isto`, `isso`, `essa decisão` —
      // so "Que fonte o diz?", "Which source says so?" and "Que fonte prova essa distinção?" were not
      // recognised as evidence requests at all. Extending that token list is the bag-of-pronouns
      // approach this architecture is meant to replace: there is always another phrasing.
      //
      // When the conversation carries a prior target and its evidence, an evidence request HAS a
      // referent structurally, whatever words it used. That is what is read here. The requirement is
      // strict — both the target and its source identities must be present — so a bare "which source?"
      // with no conversation behind it is still an underspecified first turn, exactly as before.
      if (cc.previous_semantic_target && Array.isArray(cc.previous_source_ids) && cc.previous_source_ids.length) {
        const asksEvidence =
          /(^|\s)(que|qual|quais|which|what)\s+(fonte|fontes|source|sources)/.test(nq) ||
          /(fonte|fontes|source|sources)\s+(o diz|diz|says|say|prova|provam|proves|support|supports|sustenta|sustentam)/.test(nq) ||
          /(mostra|mostrar|show)\s+(me\s+)?(a\s+|the\s+)?(fonte|source)/.test(nq);
        // …and only when this turn names no subject of its own. "Quem controla os operadores?" after a
        // certification turn is a NEW topic that happens to contain an evidence word; serving the
        // previous answer's sources for it would answer the wrong question with right-looking citations.
        // Measured: it broke the "an unrelated new topic breaks the evidence pair" property.
        // An EXPLICIT target wins over the inherited one, always.
        //
        // "Que fontes explicam a Root?" asks for evidence about Root, not for the previous answer's
        // evidence — source-followup context is not sticky, and serving the prior sources there would
        // answer a different question with right-looking citations.
        //
        // The test is subtractive and strict: remove the evidence words, the interrogatives, the
        // articles and the ANAPHORIC nouns that stand in for the previous answer ("essa distinção",
        // "that claim"), and a genuine follow-up has nothing left. Anything that survives is a subject
        // this turn brought with it. "root" survives, so that turn is not a follow-up — and it does not
        // matter that `root` alone happens not to resolve to an entry, which is what an earlier
        // route-based version of this check got wrong.
        const FILLER = /\b(que|qual|quais|which|what|me|a|o|as|os|um|uma|the|de|do|da|dos|das|of|for|about|sobre|e|and|is|are|it|so|isso|isto|essa|esse|esta|este|that|this|them|eles|elas)\b/g;
        const EVIDENCE_WORDS = /\b(fonte|fontes|source|sources|diz|dizem|says|say|prova|provam|proves|proven|explicam|explica|explain|explains|support|supports|sustenta|sustentam|mostra|mostrar|show|documenta|documents)\b/g;
        const ANAPHORIC_NOUN = /\b(distincao|distinction|diferenca|difference|separacao|separation|afirmacao|claim|ponto|point|resposta|answer|conclusao|conclusion)\b/g;
        const remainder = nq
          .replace(EVIDENCE_WORDS, " ")
          .replace(ANAPHORIC_NOUN, " ")
          .replace(FILLER, " ")
          .replace(/\s+/g, " ")
          .trim();
        const namesOwnSubject = remainder.length > 0;
        if (asksEvidence && !namesOwnSubject) {
          const prior = getEntry(cc.previous_semantic_target);
          const priorSources = prior ? publicSourcesOnly(prior.sources || []) : [];
          const kept = priorSources.filter((x) => cc.previous_source_ids.includes(String(x.id)));
          const serve = kept.length ? kept : priorSources;
          if (serve.length) {
            const lead = TERMINAL_TEXT.source_evidence[locale] || TERMINAL_TEXT.source_evidence[DEFAULT_LOCALE];
            return {
              result: {
                grounded: true,
                answer: lead,
                sources: serve,
                entry_id: prior ? prior.id : null,
                provider: provider.name,
                mode: isReal ? "real" : "mock",
                guardrails: GUARDRAILS,
                model_called: false,
                model_name: "",
                inference_location: provider.inferenceLocation || null,
                answer_locale: locale,
              },
              meta: {
                deterministic: true,
                cache: null,
                llm_called: false,
                answer_mode: mode,
                fallback_reason: null,
                intent: "source_followup",
                terminal_kind: "source_evidence",
                referent_source: "conversation",
                ...ctxMeta,
                ...routerTrace,
              },
            };
          }
        }
      }

      // DOCUMENT + AUTHORITY FOLLOW-UP — "is it normative?", "what has higher authority?".
      //
      // After "What does ADR-025 say?" the conversation holds a DOCUMENT identity, and the follow-up
      // asks about that document's standing rather than about a new subject. Answering it needs the
      // normative hierarchy, not the document's contents again.
      //
      // Requires `last_document_id` to be present: without a document in the conversation these
      // phrasings are not document follow-ups at all, and the tier falls through.
      if (cc.last_document_id) {
        const asksAuthority =
          /(^|\s)(e|é|is|are)?\s*(normativ|normative)/.test(nq) ||
          /(autoridade superior|higher authority|mais autoridade|maior autoridade|autoridade normativa|normative authority)/.test(nq);
        if (asksAuthority) {
          // `def-reference` states the hierarchy exactly: the Reference is descriptive, normative
          // authority belongs to the Normative Manifest and the artifacts it indexes, and where the two
          // diverge the normative artifact prevails. That is the answer to both phrasings.
          const authority = getEntry("def-reference");
          const kindEntry = /^RFC/i.test(cc.last_document_id) ? getEntry("def-rfc") : getEntry("def-adr");
          if (authority && kindEntry) {
            const a = answerFor(kindEntry, locale);
            const b = answerFor(authority, locale);
            if (a.available && b.available) {
              const seen = new Set();
              const sources = publicSourcesOnly([
                ...(kindEntry.sources || []),
                ...(authority.sources || []),
              ]).filter((x) => {
                const id = String((x && x.id) || "");
                if (!id || seen.has(id)) return false;
                seen.add(id);
                return true;
              });
              return {
                result: {
                  grounded: true,
                  answer: `${a.text}\n\n${b.text}`,
                  sources,
                  entry_id: authority.id,
                  provider: provider.name,
                  mode: isReal ? "real" : "mock",
                  guardrails: GUARDRAILS,
                  model_called: false,
                  model_name: "",
                  inference_location: provider.inferenceLocation || null,
                  answer_locale: locale,
                },
                meta: {
                  deterministic: true,
                  cache: null,
                  llm_called: false,
                  answer_mode: mode,
                  fallback_reason: null,
                  intent: "authority_followup",
                  terminal_kind: "authority_followup",
                  referent_source: "conversation",
                  referent_document: cc.last_document_id,
                  ...ctxMeta,
                  ...routerTrace,
                },
              };
            }
          }
        }
      }

      // COMPARISON FOLLOW-UP — "compare them", "what is the difference between them?", "compara-os".
      // Both sides come from context: either an explicit comparison the previous turn planned, or the
      // last two DIFFERENT subjects the conversation established.
      // `normalize` strips the hyphen, so "Compara-os" arrives as "compara os" — the enclitic form has
      // to be matched after normalization, not before it. Measured: the English "Compare them." worked
      // and its Portuguese twin did not, for that reason alone.
      const wantsComparison =
        /(^|\s)(compare|compara|comparar|compare-as)(\s+(them|os|as|eles|elas|os dois|as duas))?(\s|$)/.test(nq) ||
        /(diferenca|difference).{0,24}(entre eles|entre elas|entre os dois|between them|them)/.test(nq);
      if (wantsComparison) {
        const l = cc.comparison_left || cc.previous_subject_id || "";
        const r = cc.comparison_right || cc.last_subject_id || "";
        if (l && r && l !== r) {
          const left = getEntry(l);
          const right = getEntry(r);
          if (left && right) {
            const a = answerFor(left, locale);
            const b = answerFor(right, locale);
            if (a.available && b.available) {
              const seen = new Set();
              const sources = publicSourcesOnly([...(left.sources || []), ...(right.sources || [])]).filter(
                (x) => {
                  const id = String((x && x.id) || "");
                  if (!id || seen.has(id)) return false;
                  seen.add(id);
                  return true;
                },
              );
              const plan = {
                left: { phrase: left.id.replace(/^def-(dom-)?/, "").replace(/-/g, " "), semantic_id: left.id },
                right: { phrase: right.id.replace(/^def-(dom-)?/, "").replace(/-/g, " "), semantic_id: right.id },
              };
              return comparisonAnswer(plan, a.text, b.text, sources, {
                answer_mode: mode,
                fallback_reason: null,
                intent: "comparison",
                terminal_kind: "comparison",
                comparison_left: left.id,
                comparison_right: right.id,
                referent_source: "conversation",
                ...ctxMeta,
                conversation_context: {
                  ...(ctxMeta.conversation_context || {}),
                  comparison_left: left.id,
                  comparison_right: right.id,
                },
                ...routerTrace,
              }, locale);
            }
          }
        }
      }
    }

    // Tier 1-HYBRID — a DOMAIN subject plus a request about BANZA's relation to it.
    //
    // This is NOT a comparison, and conflating the two is what left "settlement vs what BANZA
    // specifies" looking permanently unsupported. A comparison has two genuine semantic targets. A
    // hybrid has one subject and a RELATION request, and "what BANZA specifies" is not a concept —
    // forcing it into a concept table to make a matrix read 22/22 would invent a concept nobody named.
    //
    // The authority split is enforced here rather than left to the composer. The subject half may rest
    // on whatever layer owns the subject, including a DOMAIN source. The BANZA half must rest on BANZA
    // authority: a domain source may say what settlement means and may never say what BANZA does about
    // it. When no BANZA authority is available for the relation, this tier declines rather than letting
    // the general definition stand in for the protocol's position.
    const hybrid = hybridPlan(correctedQuestion);
    if (hybrid && hybrid.is_hybrid && hybrid.resolved && !journeyOwnsTurn) {
      const subject = getEntry(hybrid.subject_id);
      // The BANZA half comes from the entry that states the protocol's position on this subject. Where
      // the subject IS a BANZA entry, its own realization already carries that position.
      // A DOMAIN subject needs a SPECIFIC BANZA authority for the relation half, and there is no generic
      // one. Pairing any domain concept with a catch-all entry would be the same generic collapse this
      // programme removed, in a different costume: it would let "BANZA's position on X" be written from
      // an entry that says nothing about X. Where no specific authority exists this tier declines, and
      // the ordinary paths answer the subject alone.
      // A DOMAIN subject uses the BANZA authority the engine DECLARES for it. `banza_position_id` is
      // empty for any concept nobody has declared a position for, so this stays a per-concept mapping
      // and never becomes a fallback: an undeclared concept still declines, and the ordinary paths
      // answer the subject alone.
      //
      // Three declared hybrid relations were unanswerable without this — authorization,
      // digital-signature and state-machine all have a domain subject, and the tier had no way to find
      // the entry stating BANZA's position, so it served the general definition and the answer never
      // mentioned BANZA at all.
      const banzaEntry =
        subject && subject.domain
          ? (hybrid.banza_position_id ? getEntry(hybrid.banza_position_id) : null)
          : subject;
      if (subject && banzaEntry) {
        const sub = answerFor(subject, locale);
        const ban = answerFor(banzaEntry, locale);
        const banzaSources = publicSourcesOnly(banzaEntry.sources || []).filter((x) => x && x.class !== "domain");
        if (sub.available && ban.available && banzaSources.length > 0) {
          const seen = new Set();
          const sources = publicSourcesOnly([...(subject.sources || []), ...(banzaEntry.sources || [])]).filter(
            (x) => {
              const id = String((x && x.id) || "");
              if (!id || seen.has(id)) return false;
              seen.add(id);
              return true;
            },
          );
          return hybridAnswer(hybrid, sub.text, ban.text, sources, {
            answer_mode: mode,
            fallback_reason: null,
            intent: "hybrid_relation",
            terminal_kind: "hybrid_relation",
            hybrid_subject: subject.id,
            hybrid_relation: hybrid.relation,
            hybrid_subject_class: hybrid.subject_class,
            ...ctxMeta,
            // The relation stays active for the next turn. "What is settlement and how does it relate
            // to BANZA?" then "does BANZA perform it?" must not collapse to the generic protocol entry:
            // the subject and the fact that a BANZA relation is under discussion both travel.
            conversation_context: {
              ...(ctxMeta.conversation_context || {}),
              hybrid_subject_id: subject.id,
              hybrid_relation: hybrid.relation,
              last_subject_id: subject.id,
              last_subject_kind: "concept",
            },
            ...routerTrace,
          }, locale);
        }
      }
    }

    // A HALF-COMPARISON the router already decided: exactly one side resolved and nothing else
    // answered. Served as an honest decline that NAMES the side it did not recognise — the difference
    // between a decline a reader can act on and a blanket "insufficient evidence". Without this the
    // verdict reached the model, which composed prose for a question it had one half of.
    if (
      decisionEffective.intent === "comparison_incomplete" &&
      !journeyOwnsTurn &&
      comparisonPlan(correctedQuestion)
    ) {
      const p = comparisonPlan(correctedQuestion);
      const unresolved = !p.left.semantic_id ? p.left.phrase || "left" : p.right.phrase || "right";
      return comparisonIncomplete(unresolved, {
        answer_mode: mode,
        fallback_reason: "comparison_incomplete",
        intent: "comparison_incomplete",
        terminal_kind: "insufficient_evidence",
        comparison_left: p.left.semantic_id || null,
        comparison_right: p.right.semantic_id || null,
        ...ctxMeta,
        ...routerTrace,
      }, locale);
    }

    // This tier SERVES a comparison; it does not decline one. An incomplete comparison is decided one
    // layer up, by the router, which returns `comparison_incomplete` when exactly one side resolved — a
    // genuine half-comparison. When neither side resolves the query is not a conceptual comparison at
    // all, and the paths that do own it are left alone.
    if (comparison && comparison.is_comparison && comparison.both_resolved && !journeyOwnsTurn) {
      const left = comparison.left && comparison.left.semantic_id ? getEntry(comparison.left.semantic_id) : null;
      const right = comparison.right && comparison.right.semantic_id ? getEntry(comparison.right.semantic_id) : null;
      if (!left || !right || left.id === right.id) {
        // Both sides named the same subject, or an id the corpus no longer holds — not a comparison.
        // Fall through rather than composing one side against itself.
      } else {
        const a = answerFor(left, locale);
        const b = answerFor(right, locale);
        if (a.available && b.available) {
          // Both sides' sources, deduplicated by id: two entries frequently rest on the same document,
          // and citing it twice tells a reader nothing except that the composer did not look.
          const seen = new Set();
          const sources = publicSourcesOnly([...(left.sources || []), ...(right.sources || [])]).filter(
            (src) => {
              const id = String((src && src.id) || "");
              if (!id || seen.has(id)) return false;
              seen.add(id);
              return true;
            },
          );
          return comparisonAnswer(comparison, a.text, b.text, sources, {
            answer_mode: mode,
            fallback_reason: null,
            intent: "comparison",
            terminal_kind: "comparison",
            comparison_left: left.id,
            comparison_right: right.id,
            comparison_class: comparison.class,
            ...ctxMeta,
            // BOTH sides travel forward, not whichever was mentioned last. "Compare clearing and
            // settlement" then "which one does BANZA perform?" needs both identities available; a
            // context that kept only the most recent noun would answer about settlement every time.
            conversation_context: {
              ...(ctxMeta.conversation_context || {}),
              comparison_left: left.id,
              comparison_right: right.id,
              last_subject_id: left.id,
              last_subject_kind: "concept",
            },
            ...routerTrace,
          }, locale);
        }
      }
    }

    if (decisionEffective.action === "deterministic" && (!hasExplanatoryCue || verbatimEntry)) {
      const entry = decision.entry_id ? getEntry(decision.entry_id) : null;
      if (entry && hasExplanatoryCue && publicSourcesOnly(entry.sources).length === 0) {
        return contextualInsufficient(rq, "", { answer_mode: mode, fallback_reason: "insufficient_sources", intent, terminal_kind: "insufficient_evidence", ...ctxMeta, ...routerTrace }, locale);
      }
      if (entry) {
        // M2.18B.5 — a `def-*` entry is a canonical DEFINITION, never a security boundary: label it
        // accordingly even when route carries the historical `critical_boundary` intent for a sensitive
        // concept (federação/revogação/operador). This keeps the PUBLIC trace honest (§31) — "Definição
        // canónica confirmada por Rust", not "Limite de segurança aplicado por Rust" — which matters now
        // that typo recovery routes a corrected concept ("fedaração"→"federação") to these definitions.
        // The same mislabel, reaching a new id shape. Keying "is this a definition?" on the `def-`
        // PREFIX means every future family of canonical ids inherits the bug: invariant records are
        // `inv-*`/`mon-*`, carry the historical `critical_boundary` intent, and were served correctly
        // while the public trace announced "Limite de segurança aplicado por Rust" over a statement
        // about integer minor units. A reader is told a security boundary fired when nothing was
        // refused.
        //
        // WHICH answers are safety refusals, and why this is not decided by the id's shape.
        //
        // The rule was `!entry_id.startsWith("def-") && intent is a boundary`. It mislabelled every
        // family of ids that was neither a `def-` definition nor a refusal: invariant records, and then
        // `guards-secret-leak`, which EXPLAINS how key leakage is prevented and which production
        // announced as "Limite de segurança aplicado por Rust". Nothing was refused in either case.
        //
        // The obvious repair — "a refusal is a `refuse-*` entry" — is WRONG, and the critical benchmark
        // said so: `banzai-cannot-certify` is a genuine denial of BanzAI's authority and carries no
        // `refuse-` prefix. Denial is not a naming convention, so it cannot be read off the name in
        // either direction.
        //
        // So the exceptions are DECLARED ON THE ENTRY, which knows what it is: an invariant record
        // states normative text, and a `repo_truth` entry describes this repository's own tooling.
        // Neither denies anything. Everything else keeps the historical classification, with the
        // critical benchmark as the authority on which entries are denials.
        const isDefinition =
          String(decision.entry_id || "").startsWith("def-") ||
          Boolean(entry.invariant) ||
          Boolean(entry.repo_truth);
        const isBoundary =
          !isDefinition && (intent === "critical_boundary" || intent === "action_boundary");
        const kind = isBoundary ? "safety_refusal" : "canonical_definition";
        const trace_label = isBoundary ? "Limite de segurança aplicado por Rust" : "Definição canónica confirmada por Rust";
        return deterministic(entry, { answer_mode: mode, fallback_reason: null, intent, terminal_kind: kind, trace_label, ...ctxMeta, ...routerTrace }, locale);
      }
      // Safety net: routing selected an unknown entry id → a contextual decline rather than a wrong answer.
      return contextualInsufficient(rq, "", { answer_mode: mode, fallback_reason: "insufficient_sources", intent, terminal_kind: "insufficient_evidence", ...ctxMeta, ...routerTrace }, locale);
    }

    // Tier 1b (M2.18B.7) — EXACT-FACT / ATTRIBUTE terminal (deterministic; 0 model calls). A creation
    // year/date (and other registry attributes) about a canonical entity is answered from the typed Rust
    // attribute registry: a DECLARED value as a fact (with its source); an UNDECLARED attribute as a
    // PRECISE contextual message naming the entity + attribute — never inferred (not from Git/commit/file/
    // deploy/domain/index dates) and NEVER the generic topic list. Runs AFTER every safety/critical
    // boundary above; skipped only when this turn IS the journey's next-step answer. reason_code carries the structured cause.
    if (!journeyOwnsTurn) {
      const attr = attributeAnswer(correctedQuestion, locale);
      if (attr) {
        const declared = attr.status === "DECLARED";
        const sources = declared && attr.source_id ? [{ id: attr.source_id, title: attr.source_id, path: "" }] : [];
        return {
          result: {
            grounded: declared,
            answer: attr.answer,
            // The third terminal found serving an answer with no declared locale. Rust composes this
            // body, and it composed it in Portuguese regardless of who asked — so an English reader
            // got the right fact in the wrong language and nothing in the response could say so.
            answer_locale: locale,
            sources,
            entry_id: `attr-${attr.entity_id}-${attr.attribute_id}`,
            provider: provider.name,
            mode: isReal ? "real" : "mock",
            guardrails: GUARDRAILS,
          },
          meta: {
            deterministic: true,
            cache: null,
            llm_called: false,
            answer_mode: mode,
            fallback_reason: declared ? null : "attribute_not_declared",
            intent: "grounded",
            terminal_kind: declared ? "exact_fact" : "attribute_not_declared",
            reason_code: attr.reason_code,
            ...ctxMeta,
            ...routerTrace,
          },
        };
      }
    }

    // Tier 1c (M2.18B.7 Semantic Task Fulfilment) — a deterministic TASKED TERMINAL (0 model calls). When
    // the TASK is example / manifest-template / federation-procedure, Rust serves an answer that actually
    // FULFILS the task: the real operator-manifest STRUCTURE (fields from the schema), a clearly-marked
    // ILLUSTRATIVE operator/federation example (never a real operator), or a TRANSPARENT-PARTIAL procedure
    // (the docs publish requirements + trust model, not a complete step-by-step). This is the fix for
    // "grounds but does not fulfil": a definition never satisfies an example, architecture never satisfies a
    // manifest. Runs AFTER safety + the canonical/attribute terminals; still fires DURING a journey (only a
    // genuine journey next-step turn skips it) — a step being active never demotes "dá-me um exemplo" to synthesis.
    if (!journeyOwnsTurn) {
      const task = taskedAnswer(correctedQuestion);
      if (task) {
        // The reader's text is realized from the semantic plan for the RESOLVED locale — never from
        // `task.answer_markdown`, which is Rust-assembled Portuguese and is diagnostics now. A locale
        // that cannot realize every fact the plan names declines rather than serving a procedure that
        // reads fluently and is missing a step.
        const taskedText = composeTasked(task.plan, task.subject, task.kind, locale);
        if (taskedText) {
          return {
            result: {
              grounded: true,
              answer: taskedText,
              answer_locale: locale,
              sources: Array.isArray(task.sources) ? task.sources : [],
              entry_id: `task-${task.task}`,
              provider: provider.name,
              mode: isReal ? "real" : "mock",
              guardrails: GUARDRAILS,
            },
            meta: {
              deterministic: true,
              cache: null,
              llm_called: false,
              answer_mode: mode,
              fallback_reason: null,
              intent: "grounded",
              terminal_kind: "tasked_terminal",
              requested_task: task.task,
              task_kind: task.kind,
              reason_code: task.reason_code,
              trace_label: "Tarefa cumprida por Rust (0 chamadas de modelo)",
              ...ctxMeta,
              ...routerTrace,
            },
          };
        }
      }
    }

    // Tier 1d (M2.18B.7 fallback fix) — deterministic DOCUMENT-LOOKUP terminal (0 model calls). A bare
    // documentary reference ("ADR-001", "RFC-0006", "o que diz a ADR 6") is a LOOKUP, not an explanation:
    // Rust serves the registry's structured metadata card (title · tipo · estado · data · caminho + a
    // short source-bound summary + the standing boundary), grounded and PUBLISHABLE — never the degraded
    // trunk. An "explica / porquê / impacto / resume" request is NOT a lookup (Rust returns null) and
    // still escalates to the grounded trunk (the model explains once). This closes the M2.18B.7 regression
    // where a doc lookup reached synthesis and the Task-Completion gate rejected the model's explanation
    // (no metadata) → MISSING_REQUIRED_SECTION → degraded "erro temporário" fallback. Still fires DURING a
    // journey; only a genuine journey next-step turn skips it (the journey answer owns that turn).
    if (!journeyOwnsTurn) {
      // The composer is given the reader's locale, so the `answer_locale` stamped below describes what it
      // actually produced. Without it the card was composed in Portuguese and still stamped EN — the field
      // attesting to a presentation nobody had made.
      const look = documentLookup(correctedQuestion, documentId ? String(documentId) : "", locale);
      if (look) {
        return {
          result: {
            grounded: true,
            answer: look.answer_markdown,
            sources: [{ id: look.id, title: look.title, path: look.path }],
            entry_id: `doclookup-${look.id}`,
            provider: provider.name,
            mode: isReal ? "real" : "mock",
            guardrails: GUARDRAILS,
            answer_locale: locale,
          },
          meta: {
            deterministic: true,
            cache: null,
            llm_called: false,
            answer_mode: mode,
            fallback_reason: null,
            intent: "grounded",
            terminal_kind: "document_lookup",
            reason_code: "document_lookup_card",
            trace_label: "Consulta documental determinística (0 chamadas de modelo)",
            ...ctxMeta,
            ...routerTrace,
          },
        };
      }
    }

    // Tier 2 — the JOURNEY next-step answer (deterministic; composed in Rust; no model). NOTE the envelope
    // — `{ result, meta }`, exactly like the terminals; a flat shape here 500s every journey question.
    if (decisionEffective.action === "journey_next_step") {
      return {
        result: { grounded: true, answer: journeyNextActionSentence, sources: [], entry_id: null, provider: provider.name, mode: isReal ? "real" : "mock", guardrails: GUARDRAILS },
        meta: { deterministic: true, cache: null, llm_called: false, answer_mode: mode, intent, terminal_kind: "journey", ...ctxMeta, ...routerTrace },
      };
    }

    // Tier 3 — EXPLICIT DOCUMENTARY REFERENCE (Rust registry; deterministic). A named document is a lookup,
    // not a similarity problem: the registry alone decides whether it exists. This (a) reports a named-but-
    // absent document plainly, (b) SEEDS the trunk's resolver with the exact record, and (c) is the trunk's
    // emergency grounding. A structured `document_id` (the "Explicar com BanzAI" button) states the record
    // outright, so it is resolved directly instead of hoping free text re-derives it.
    const docRes = documentId ? resolveDocument(`${documentId} ${rq}`) : resolveDocument(rq);
    const docMeta = {
      explicit_reference_detected: Boolean(docRes.detected),
      explicit_reference_source: docRes.detected ? (documentId ? "structured" : "question") : null,
      resolved_document_id: docRes.detected ? docRes.id || null : null,
      resolved_document_type: docRes.found ? docRes.kind || null : null,
      resolved_document_path: docRes.found ? docRes.path || null : null,
      resolved_document_title: docRes.found ? docRes.title || null : null,
      resolved_document_status: docRes.found ? docRes.status || null : null,
      resolved_document_hash: docRes.found ? docRes.content_hash || null : null,
      document_not_found: Boolean(docRes.detected && !docRes.found),
      document_tool: docRes.detected ? docRes.tool || null : null,
      tool: docRes.found ? docRes.tool : null,
      document_mode: docRes.found ? docRes.mode || null : null,
      index_version: CORPUS_HASH,
      repo_index_hash: REPO_INDEX_HASH,
      safety_policy_version: SAFETY_POLICY_VERSION,
      ...routerTrace,
    };
    // Named but absent → say so plainly. Never invent a document, never degrade into a generic miss.
    if (docRes.detected && !docRes.found) {
      return {
        result: {
          grounded: false,
          answer: `Não encontrei o documento ${docRes.id} no índice actual. Posso explicar ADRs disponíveis ou procurar por tema.`,
          sources: [], entry_id: null, provider: provider.name, mode: isReal ? "real" : "mock", guardrails: GUARDRAILS,
        },
        meta: { deterministic: true, cache: null, llm_called: false, answer_mode: mode, fallback_reason: "document_not_found", intent, terminal_kind: "insufficient_evidence", ...ctxMeta, ...docMeta },
      };
    }

    // Tier 3b (Increment 5, §10–§15) — the QUESTION FAMILIES made grounded end to end. When the Rust
    // resolver classifies the question as a §10–§15 family, route it through its ToolPlanner plan → execute
    // the data step(s) (reason-code registry / the injected receipt-store tool / the canonical corpus) →
    // build the transversal FactualPackage (Inc.4) → a deterministic PT renderer → the Inc.4 claim/citation
    // verifier. A verified answer is served WITHOUT a model (llm_called:false); each answer is built from REAL
    // data, never a pre-written per-question string. A comparison with one operand asks for clarification; a
    // family whose tool/data is absent returns the honest CONTEXTUAL fallback (never a fabrication); a
    // documentary family that cannot ground+verify SKIPS to the trunk below (no regression). Runs AFTER every
    // safety/critical-boundary/exact-attribute/tasked/document-lookup terminal, and before the exact-fact
    // terminal + the trunk. Skipped for a boundary/refusal (settled at Tier 0), a journey next-step turn, and
    // a structured document_id ("Explicar com BanzAI" always means explain the record via the trunk).
    if (!isBoundaryDecision && !journeyOwnsTurn && !documentId) {
      // Increment 6 — when a conversational reference resolved to a specific execution (or comparison
      // operands), pass those Rust-resolved targets so the diagnosis/comparison family acts on the referenced
      // execution(s) rather than defaulting to "latest". Empty on a self-contained turn (unchanged behaviour).
      const contextTargets = contextResolved && Array.isArray(references.comparison_targets) && references.comparison_targets.length
        ? references.comparison_targets
        : contextResolved && references.execution_id
        ? [references.execution_id]
        : [];
      const fam = await answerQuestionFamily(rq, { traceId: String(keyFields.repoIndexHash || ""), receiptsTool, contextTargets, locale });
      // The question-family handler runs its own deterministic plan (reason-code registry / receipt store /
      // canonical corpus). Emit the TOOL events ONLY when a family actually OWNS this turn (grounded /
      // clarification / fallback) — never for a "skip" that merely falls through to the trunk below (that
      // would emit phantom tool progress for a plain conceptual question). Model-free; no synthesis events.
      const familyOwnsTurn = Boolean(fam && fam.kind && fam.kind !== "skip");
      if (familyOwnsTurn) {
        emit("TOOL_STARTED", { tool_kind: "QUESTION_FAMILY", question_family: (fam && fam.family) || null });
        emit("TOOL_COMPLETED", { tool_kind: "QUESTION_FAMILY", outcome: fam.kind === "grounded" ? "ok" : fam.kind, question_family: (fam && fam.family) || null });
      }
      if (fam && fam.kind === "grounded") {
        // FACTUAL_PACKAGE_READY — the transversal package the family answer was built from (safe summary
        // only: family, reason code, counts, tools called, checksum; never the normalized question or prose).
        const fs = factualPackageSummary(fam.package) || {};
        emit("FACTUAL_PACKAGE_READY", {
          source: "question_family",
          question_family: fam.family || null,
          reason_code: fam.reason_code || null,
          primary_intent: fs.primary_intent || null,
          facts_count: fs.facts_count || 0,
          tools_called: Array.isArray(fs.tools_called) ? fs.tools_called : [],
          documentary_sources: Array.isArray(fs.documentary_sources) ? fs.documentary_sources : [],
          package_checksum: fs.package_checksum || null,
        });
        return familyAnswer(fam, { answer_mode: mode, ...ctxMeta, ...docMeta }, locale);
      }
      if (fam && fam.kind === "clarification") {
        return stated(fam.answer, {
          answer_mode: mode,
          fallback_reason: "family_clarification",
          intent: "clarification_required",
          terminal_kind: "clarification",
          answer_locale: fam.answer_locale,
          question_family: fam.family,
          trace_label: "Clarificação de família de pergunta (Rust)",
          ...ctxMeta,
          ...docMeta,
        });
      }
      if (fam && fam.kind === "fallback") {
        const famReason = `family_${fam.situation || "insufficient"}`;
        if (fam.override_message) {
          return stated(fam.override_message, {
            answer_mode: mode,
            fallback_reason: famReason,
            intent: fam.family,
            terminal_kind: "insufficient_evidence",
            question_family: fam.family,
            trace_label: "Família de pergunta compreendida — ferramenta/dado ausente (declínio honesto)",
            ...ctxMeta,
            ...docMeta,
          });
        }
        return contextualInsufficient(rq, fam.situation || "", {
          answer_mode: mode,
          fallback_reason: famReason,
          intent: fam.family,
          terminal_kind: "insufficient_evidence",
          question_family: fam.family,
          ...ctxMeta,
          ...docMeta,
        });
      }
      // kind "skip" or null → fall through to the exact-fact terminal + the trunk below (no regression).
    }

    // Tier 4 — the EXACT-FACT terminal (Rust-confirmed machine fact, source-bound, model-free). A clean
    // status/date/identifier/version/license/origin lookup with NO explanatory cue is answered instantly
    // and correctly — never the ~30s trunk — EVEN when the fact belongs to a resolved document ("qual é o
    // estado da ADR-035?"). A structured document_id from the UI always means "explain the record", so the
    // exact terminal is skipped there. An unsourced exact kind fails safe to insufficient ONLY when no
    // document resolved; otherwise it falls through to the trunk to explain the resolved record.
    if (!hasExplanatoryCue && !documentId) {
      const term = buildTerminal(rq);
      if (term && term.kind === "exact_fact" && term.source) {
        return exactTerminal(term, { answer_mode: mode, fallback_reason: null, intent, ...ctxMeta, ...docMeta }, locale);
      }
      if (term && term.kind === "insufficient_evidence" && !docRes.found) {
        return contextualInsufficient(rq, "insufficient_source", { answer_mode: mode, fallback_reason: "exact_fact_unsourced", intent, terminal_kind: "insufficient_evidence", ...ctxMeta, ...docMeta }, locale);
      }
    }

    // ── The SINGLE explanatory trunk. A question reaches it only when it has a local grounding: routing
    // decided it is grounded (qwen), OR a real explanatory cue is present (escalation), OR an explicit
    // document resolved, OR a concept resolves to a canonical source, OR the operator is on a journey step.
    // Anything else has no local source and is answered as insufficient — no model call.
    const conceptSource = resolveConcept(rq) || "";
    const groundedForTrunk =
      decision.action === "qwen" || hasExplanatoryCue || docRes.found || Boolean(conceptSource) || onJourneyStep;
    if (!groundedForTrunk) {
      // M2.18B.5 §12 — a query that did not resolve BUT carries an ambiguous typo (two plausible canonical
      // forms too close to auto-correct) asks the user to choose, rather than guessing or declining flatly.
      // The candidates are Rust display forms; the model is NOT called.
      if (recovery.band === "ambiguous" && Array.isArray(recovery.clarification) && recovery.clarification.length >= 1) {
        return clarify(
          { entity_candidates: recovery.clarification.map((label) => ({ label: String(label || "") })) },
          { answer_mode: mode, fallback_reason: "typo_clarification", intent: "clarification_required", terminal_kind: "clarification", trace_label: "É necessário esclarecer a referência", ...ctxMeta, ...docMeta },
          locale,
          "term",
        );
      }
      // Block 4B — this is the terminal a subject-less route actually reaches, so the context-missing reason
      // belongs HERE. Measured, not assumed: the first attempt put it on the unknown-entry safety net above,
      // which this path never touches, and the test that asked for the reason was what said so.
      return contextualInsufficient(rq, "", { answer_mode: mode, fallback_reason: decision.merge_kind === "CONTEXT_TARGET_MISSING" ? "context_target_missing" : "insufficient_sources", intent, terminal_kind: "insufficient_evidence", ...ctxMeta, ...docMeta }, locale);
    }

    // The seed for the trunk's Rust resolver: the exact record, else the concept's canonical source, else
    // the router's canonical-ENTITY entry when it carries declared primary-source coverage (M2.18B.7), else
    // none (the resolver then selects the entity deterministically from Rust candidates). The coverage gate
    // is deliberately narrow: only a known canonical entity id (e.g. "what-is-banza") is seeded from the
    // route, so a bare definition/explanation about a KNOWN entity ("o que é o BANZA?"), whose sole content
    // term is the ubiquitous entity name, grounds on the entity's primary sources instead of degrading to a
    // generic answer. Non-covered routes are unchanged.
    const routeEntitySeed =
      decisionEffective.action === "qwen" && decision.entry_id && coveredEntities().has(decision.entry_id)
        ? decision.entry_id
        : null;
    const seededEntity = docRes.found ? docRes.id : (conceptSource || routeEntitySeed || null);

    // Bind the resolved identity into the cache key so a cached answer is only valid for the SAME record at
    // the SAME content hash and the SAME mode (M2.10A/M2.10B).
    if (docRes.found) {
      keyFields.document_id = docRes.id;
      keyFields.document_hash = docRes.content_hash || "";
      keyFields.tool = docRes.tool || "";
      keyFields.document_mode = docRes.mode || "";
    }
    if (seededEntity) keyFields.entity_id = seededEntity;

    // Mock provider — deterministic, free, offline. It has no local model, so it never runs the trunk.
    if (!isReal) {
      const r = await provider.answer(rq);
      return { result: { ...r, answer_locale: locale }, meta: { deterministic: true, cache: null, llm_called: false, answer_mode: mode, fallback_reason: null, intent, terminal_kind: "explanatory_trunk", ...ctxMeta, ...docMeta } };
    }

    // The emergency Phase-1 grounding (model-free, degraded, sourced) — used ONLY when the trunk cannot
    // publish (model unavailable / entry invalid / output rejected / breaker tripped). A resolved document
    // grounds on its own record; otherwise the top retrieved entry. Never a normal path.
    // Block 5A.1 — SETTLEMENT INTEGRITY. The epistemic verdict is owned by ONE layer: if the route already
    // settled a deterministic critical entry with establishing sources, the claim IS supported, and this
    // presentation fallback may not reopen that question with a weaker heuristic.
    //
    // It used to call `retrieve(rq)` and nothing else. Measured: "Explica porquê o limiar da Root é 2 de 3."
    // routed deterministically to def-root-authorization with valid sources, the explanatory cue sent it to
    // the trunk, the model was unavailable, this retrieval missed — and the reader was told there was
    // INSUFFICIENT EVIDENCE, while the reason field on the very same answer said the real cause was that
    // the model could not be reached. The engine held the record and reported having nothing.
    //
    // Requesting an explanation is presentation intent. It cannot decide whether evidence exists.
    const settledEntry =
      decisionEffective.action === "deterministic" && decisionEffective.entry_id
        ? getEntry(decisionEffective.entry_id)
        : null;
    const settledCritical =
      settledEntry && Array.isArray(settledEntry.sources) && settledEntry.sources.length > 0
        ? settledEntry
        : null;
    const emergencyHit = docRes.found
      ? documentFallback(docRes)
      : settledCritical || retrieve(rq);
    // `extra` carries a FAITHFUL trace for a degraded turn (M2.18B.7): when the synthesis WAS attempted
    // but did not publish, the caller passes the real synthesis-trace fields so the public trace never
    // falsely reads routing_result=null / synthesis_called=false. Pre-synthesis emergencies pass nothing.
    const emergency = (reason, extra = {}) => {
      if (emergencyHit) {
        return deterministic(emergencyHit, { answer_mode: mode, fallback_reason: reason, degraded: true, intent, terminal_kind: "operational_failure", ...ctxMeta, ...docMeta, ...extra }, locale);
      }
      return contextualInsufficient(rq, "tool_unavailable", { answer_mode: mode, fallback_reason: reason, intent, terminal_kind: "insufficient_evidence", ...ctxMeta, ...docMeta, ...extra }, locale);
    };

    // Caches (exact then semantic) — a grounded trunk answer is cached; a cache hit reports llm_called:false
    // (no generation now) even though the stored result was a model answer.
    // SPR-3 — a cache hit serves a FINAL_VALIDATED answer (cache writes sit downstream of the ADR-036 gate),
    // so answer_source=validated_cache. This label makes deterministic coverage (validated_cache +
    // deterministic terminals vs fresh_synthesis) measurable from the /ask meta alone.
    const exactHit = exact.get(keyFields);
    if (exactHit) return { result: { ...exactHit, answer_locale: locale }, meta: { deterministic: false, cache: "exact", answer_source: "validated_cache", llm_called: false, answer_mode: mode, fallback_reason: null, intent, terminal_kind: "explanatory_trunk", ...ctxMeta, ...docMeta } };
    const semHit = semantic.find(keyFields);
    if (semHit) return { result: { ...semHit.value, answer_locale: locale }, meta: { deterministic: false, cache: "semantic", answer_source: "validated_cache", similarity: semHit.similarity, llm_called: false, answer_mode: mode, fallback_reason: null, intent, terminal_kind: "explanatory_trunk", ...ctxMeta, ...docMeta } };

    // Budget gate — the USD budget guards HOSTED inference only; local_qwen runs on the VM at ~zero
    // marginal cost and bypasses it (its control is the concurrency/queue limiter + container memory). An
    // exhausted hosted budget degrades to the emergency grounding, no model call.
    const isLocalInference = provider.inferenceLocation === "local";
    if (!isLocalInference) {
      const estIn = estimateTokens(rq) + modeLimits(mode).maxTokens;
      const gate = budget.canSpend(estIn);
      if (!gate.allowed) return emergency(gate.reason);
    }

    // Breaker tripped (auto-rollback engaged) → straight to the emergency grounding, no model.
    if (synthesisGate.tripped) return emergency("synthesis_capacity_tripped");

    // Tier 5 — the ONLY model call path (the grounded synthesis). It runs through the inference queue
    // (M2.14E) with a Rust-derived priority + safe de-duplication for identical plain questions. A queue/
    // timeout/upstream error degrades to the emergency grounding, never a client error.
    const hasContext = Boolean(decision.context_used) || (Array.isArray(contextQuestions) && contextQuestions.length > 0);
    const canDedup = queueShouldDedup(hasContext, onJourneyStep, docRes.found, false);
    const dedupKey = canDedup ? `qk:${JSON.stringify(keyFields)}` : "";
    const priority = queuePriority(rq);
    const { model: tpModel, timeoutMs: tpTimeoutMs } = synthesisGate.synthesisOptions();
    // SOURCE_RESOLVED — the trunk's grounding seed (resolved document / concept canonical source / covered
    // entity). Safe ids/enums only. Emitted only on the real synthesis path (cache hits return above).
    emit("SOURCE_RESOLVED", {
      source_kind: docRes.found ? "document" : conceptSource ? "concept" : "entity",
      seeded_entity: seededEntity || null,
      document_id: docRes.found ? docRes.id || null : null,
      document_status: docRes.found ? docRes.status || null : null,
    });
    let tp;
    // SPR-4 §1 — measure the inference-queue wait (time between enqueue and the slot actually executing the
    // synthesis) as its own latency phase, so it never hides inside the model timings.
    const tEnqueued = nowFn();
    try {
      tp = await runInference(
        // SPR-2 — the pipeline's emit is threaded in as onProgress so the SINGLE grounded synthesis emits
        // FACTUAL_PACKAGE_READY (after the package is built, BEFORE the model turn) → SYNTHESIS_STARTED →
        // SYNTHESIS_COMPLETED (text held server-side, NEVER streamed). No model-token/delta event exists.
        (execSignal) => runSynthesis(rq, { provider, traceId: String(keyFields.repoIndexHash || ""), timeoutMs: tpTimeoutMs, model: tpModel, entityId: seededEntity, taskQuestion, signal: execSignal, onProgress: emit, queueWaitMs: Math.max(0, nowFn() - tEnqueued), locale }),
        { dedupKey, priority, signal },
      );
    } catch (e) {
      // Model failures degrade to the safe grounded emergency answer with a FAITHFUL reason — a timeout
      // is distinct from an unreachable model. Queue CAPACITY signals (QUEUE_FULL / QUEUE_TIMEOUT /
      // QUEUE_CANCELLED) propagate so the server can answer with a professional backpressure/
      // cancellation status — never a fabricated result.
      if (e && e.code === "INFERENCE_TIMEOUT") return emergency("local_inference_timeout");
      if (e && (e.code === "LLM_UPSTREAM_ERROR" || e.code === "LLM_KEY_MISSING")) return emergency("local_inference_unavailable");
      throw e;
    }
    // Feed the auto-rollback breaker (no-op unless enabled); log a one-time rollback event, safe fields only.
    const gateState = synthesisGate.record(tp.trace);
    if (gateState.justTripped) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ level: "warn", msg: "synthesis_auto_rollback", reason: gateState.reason }));
    }
    routerTrace.synthesis = tp.trace;
    routerTrace.fast_path_used = false;
    routerTrace.routing_result = `synthesis_${tp.status}`;
    routerTrace.synthesis_called = Boolean(tp.trace.synthesis_called);
    routerTrace.synthesis_status = tp.trace.output_status || "n/a";
    routerTrace.synthesis_model = tp.trace.model || null;
    routerTrace.synthesis_latency_ms = Number(tp.trace.output_latency_ms) || 0;
    routerTrace.resolution_method = tp.trace.resolution_method || "rust_deterministic";
    const tpMeta = {
      answer_mode: mode,
      intent: tp.primary_intent || intent,
      ...ctxMeta,
      ...docMeta,
      synthesis: tp.trace,
      fast_path_used: false,
      routing_result: `synthesis_${tp.status}`,
      synthesis_called: Boolean(tp.trace.synthesis_called),
      synthesis_status: tp.trace.output_status || "n/a",
      synthesis_model: tp.trace.model || null,
      synthesis_latency_ms: Number(tp.trace.output_latency_ms) || 0,
      resolution_method: tp.trace.resolution_method || "rust_deterministic",
      // SPR-4 — structured-generation + latency-decomposition observability (safe counts only). Whether
      // the structured path ran (model authored only the linguistic core; cited_source_ids derived) and
      // the llama.cpp timings (prompt/generation ms, tokens, tok/s) for the A/B harness and telemetry.
      synthesis_structured: Boolean(tp.trace.structured_synthesis),
      synthesis_timings: tp.trace.output_timings || null,
      // SPR-3 — a fresh grounded synthesis (not served from the validated cache). answer_source lets
      // deterministic coverage be measured over a sample; cache_key_dimensions makes the validated-cache
      // invalidation surface transparent (the NAMES bound into the key + the versions — never values).
      answer_source: "fresh_synthesis",
      cache_key_dimensions: {
        binds: ["question", "provider", "lang", "mode", "sourcesHash", "repoIndexHash", "safetyVersion", "contractVersion", "postValidationPolicy", "synthesisContract", "convRef", "document_id", "entity_id"],
        contract_version: CONTRACT_VERSION_KEY,
        post_validation_policy: POST_VALIDATION_POLICY_VERSION,
        synthesis_contract: synthesisContractVersion(),
      },
      // Increment 4 (§7) — the transversal FactualPackage that PRECEDED this synthesis (built in the trunk
      // before the model turn). Compact, public-safe provenance only. Present on every trunk outcome.
      factual_package: factualPackageSummary(tp.package),
    };

    if (tp.status === "grounded" && tp.answer_markdown) {
      // ── M2.19G.5C (ADR-036) — the MANDATORY post-synthesis authority validator, on the EXACT bytes that
      // would be published, AFTER the intrinsic factual validator and BEFORE groundedAnswer, the cache
      // writes and the return. Three gate checks in order; ANY failure degrades via emergency() with a
      // STABLE enum fallback_reason prefixed "post_validation_" — the rejected model text is never built
      // into `g`, never cached, never shown. Cache writes sit downstream of the gate, so a rejected answer
      // is structurally never cached and cache hits can only ever return answers that passed this policy.
      const answerText = tp.answer_markdown;
      // CLAIM_VERIFICATION_STARTED — the MANDATORY ADR-036 post-synthesis authority/claim gate begins over
      // the EXACT bytes that would be published. This event carries ONLY counts (never the candidate text);
      // it is emitted BEFORE postValidate, which itself runs BEFORE any FINAL_VALIDATED terminal (the SSE
      // endpoint emits FINAL_VALIDATED only after this whole gate passes and the pipeline returns).
      emit("CLAIM_VERIFICATION_STARTED", {
        cited_count: Array.isArray(tp.cited_source_ids) ? tp.cited_source_ids.length : 0,
        facts_count: tp.package && Array.isArray(tp.package.facts) ? tp.package.facts.length : 0,
      });
      // 1) authority/leak content gate (validate_response — checks 1–20).
      const verdict = postValidate(answerText);
      // CITATION_VERIFICATION_STARTED — the citation verifier begins (check 21): every cited id must resolve
      // to a real package-fact source. Counts only; still BEFORE any prose is ever emitted.
      emit("CITATION_VERIFICATION_STARTED", {
        cited_count: Array.isArray(tp.cited_source_ids) ? tp.cited_source_ids.length : 0,
      });
      // 2) citation verifier (check 21): every cited id resolves to a real package-fact source via the
      //    same id→source map groundedAnswer builds, AND the resulting sources[] is non-empty.
      const byId = new Map();
      for (const f of (tp.package && Array.isArray(tp.package.facts) ? tp.package.facts : [])) {
        const s = f.source || {};
        if (s.document_id && !byId.has(s.document_id)) byId.set(s.document_id, true);
      }
      const citedIds = Array.isArray(tp.cited_source_ids) ? tp.cited_source_ids : [];
      const resolvedCount = citedIds.filter((id) => byId.has(id)).length;
      const citationsOk = citedIds.length > 0 && resolvedCount === citedIds.length && resolvedCount > 0;
      // 3) final authority guard (check 22): grounded ⇒ ≥1 resolved source; and no contradiction with the
      //    deterministic exact facts (a resolved document's declared status) for the seeded entity.
      const guardOk = resolvedCount > 0 && !contradictsDeterministic(answerText, docRes);
      const ok = verdict.ok && citationsOk && guardOk;
      const reason = !verdict.ok
        ? `post_validation_${verdict.reason}`
        : !citationsOk
          ? "post_validation_unsupported_claim"
          : !guardOk
            ? "post_validation_contradicts_deterministic"
            : null;
      // Telemetry ALWAYS recorded (so reject-rate is observable even with enforcement OFF).
      if (ok) postValidateStats.ok += 1;
      else {
        postValidateStats.rejected += 1;
        postValidateStats.rejectionsByReason[reason] = (postValidateStats.rejectionsByReason[reason] || 0) + 1;
      }
      if (!ok && POST_VALIDATE_ENFORCE) {
        // Dedicated safe audit line on reject (safe fields only — never the rejected body/prompt).
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({ level: "warn", msg: "post_validation_rejected", request_id: requestId || null, reason, entity_id: seededEntity || null, synthesis_model: (tp.trace && tp.trace.model) || null, intent: tp.primary_intent || intent }));
        return emergency(reason, {
          fast_path_used: false,
          routing_result: `synthesis_${tp.status}`,
          synthesis_called: Boolean(tp.trace.synthesis_called),
          synthesis_status: tp.trace.output_status || "n/a",
          synthesis_model: tp.trace.model || null,
          synthesis_latency_ms: Number(tp.trace.output_latency_ms) || 0,
          resolution_method: tp.trace.resolution_method || "rust_deterministic",
          post_validate_ran: true,
          post_validate_ok: false,
          post_validate_reason: reason,
        });
      }
      // Passed the gate (or enforcement is OFF): publish the grounded model answer. When enforcement is
      // OFF and the gate failed, telemetry above already recorded the (would-be) rejection.
      const g = groundedAnswer(answerText, tp.package, tp.cited_source_ids, {
        ...tpMeta,
        terminal_kind: "explanatory_trunk",
        answer_locale: locale,
        fallback_reason: null,
        post_validate_ran: true,
        post_validate_ok: ok,
        post_validate_reason: ok ? null : reason,
      });
      // Cache the VALIDATED grounded answer (same key discipline as every other cached answer).
      if (g.result && Array.isArray(g.result.sources) && g.result.sources.length > 0) {
        exact.set(keyFields, g.result);
        semantic.add(keyFields, g.result);
      }
      postValidateStats.published += 1; // a MODEL answer was actually published (never on a reject)
      return g;
    }
    if (tp.status === "clarify") {
      return clarify(
        { entity_candidates: (tp.clarification_candidates || []).map((id) => ({ proposed_canonical_id: id })) },
        { ...tpMeta, intent: "clarification_required", terminal_kind: "clarification", fallback_reason: "synthesis_clarify" },
        locale,
        "document",
      );
    }
    if (tp.status === "insufficient") {
      // `synthesis_insufficient` used to be every one of these, and the public state was always
      // "insufficient evidence". That was the original bug's second half: the engine failed to BUILD the
      // package and told the reader BANZA had nothing to say. The cause now travels from the synthesis
      // layer, and only genuine epistemic insufficiency keeps the epistemic label.
      //
      // One state decides, the reason explains — so the terminal changes only where the state genuinely
      // is not an epistemic one.
      const cause = tp.insufficient_cause || "synthesis_insufficient";
      if (cause === "critical_factual_package_empty") {
        // The engine resolved a subject it claims to answer, and produced no facts for it. Telling the
        // reader that BANZA lacks documentation would be false — the registry says otherwise. And it must
        // NOT fall through to the model: a broken critical registry would then hand the most sensitive
        // questions to the least constrained path.
        return engineInconsistent(rq, {
          ...tpMeta,
          terminal_kind: "engine_inconsistency",
          fallback_reason: "critical_factual_package_empty",
        });
      }
      const reason =
        cause === "unresolved_subject"
          ? "unresolved_subject"
          : cause === "no_eligible_evidence"
            ? "no_eligible_evidence"
            : cause === "evidence_below_threshold"
              ? "evidence_below_threshold"
              : "synthesis_insufficient";
      // Block 5A.1's property has a SECOND exit, and it was missed. That fix taught the `emergency()` path
      // to prefer a settled critical record over a fresh retrieval — but synthesis can also finish with a
      // verdict of *insufficient*, and this branch reported it to the reader without ever asking whether the
      // route had already settled the question. "Explica porquê o limiar da Root é 2 de 3." routes
      // deterministically to `def-root-authorization`, which carries establishing sources; the explanatory
      // cue escalates it; resolution inside synthesis then fails to fix a subject and returns
      // `unresolved_subject` — and the engine tells the reader there is no public source for a record it is
      // holding, with the sources attached to it.
      //
      // Synthesis failing to resolve a subject is a statement about SYNTHESIS, not about the corpus. The
      // epistemic verdict belongs to one layer, and the route already gave it. Serving the settled record
      // degraded is the honest outcome; `insufficient_evidence` is not.
      //
      // Only when nothing was settled does the insufficient verdict stand — otherwise this would hand a
      // genuinely unanswerable question to whatever retrieval happened to return.
      if (settledCritical) {
        return emergency(reason, {
          ...tpMeta,
          routing_result: "synthesis_insufficient",
          synthesis_called: Boolean(tp.trace.synthesis_called),
          synthesis_status: tp.trace.output_status || "n/a",
        });
      }
      return contextualInsufficient(rq, "insufficient_source", {
        ...tpMeta,
        terminal_kind: "insufficient_evidence",
        fallback_reason: reason,
      }, locale);
    }
    // status "fallback" — the trunk could not publish a validated model answer. Derive a FAITHFUL,
    // specific reason from the trace (M2.18B.6): a validator rejection is not "model unavailable", and a
    // boundary/unsupported deferral is not a failure at all. The frontend renders each with its own
    // honest label — never a blanket "Qwen indisponível". Carry the real synthesis-trace fields so the
    // public trace is faithful (M2.18B.7 — no more falsely-null routing_result / synthesis_called).
    return emergency(synthesisFallbackReason(tp), {
      fast_path_used: false,
      routing_result: `synthesis_${tp.status}`,
      synthesis_called: Boolean(tp.trace.synthesis_called),
      synthesis_status: tp.trace.output_status || "n/a",
      synthesis_model: tp.trace.model || null,
      synthesis_latency_ms: Number(tp.trace.output_latency_ms) || 0,
      resolution_method: tp.trace.resolution_method || "rust_deterministic",
      task_completion_status: tp.trace.task_completion_status || null,
    });
  }
  function usage() {
    return {
      budget: budget.snapshot(),
      cache: {
        exact_hits: exact.hits,
        exact_misses: exact.misses,
        semantic_hits: semantic.hits,
        semantic_misses: semantic.misses,
      },
      // Safe synthesis-gate telemetry (counts/booleans only; never a question or model output).
      synthesis_gate: synthesisGate.stats(),
      // M2.19G.5C (ADR-036) — safe post-synthesis-validator telemetry (counts/enums only, never content).
      // model_answers_published_total increments ONLY on a published model answer (never on a reject);
      // model_answers_unvalidated_total is a live invariant that must stay 0.
      post_validation: {
        enforce: POST_VALIDATE_ENFORCE,
        post_validate_runs_total: { ok: postValidateStats.ok, rejected: postValidateStats.rejected },
        post_validation_rejections_total: { ...postValidateStats.rejectionsByReason },
        model_answers_published_total: postValidateStats.published,
        model_answers_unvalidated_total: 0,
      },
    };
  }

  /**
   * Stamp THIS turn's evidence identity into the context the client carries to the next turn.
   *
   * One place, after every path has produced its answer, because the forward context is built before the
   * answer exists and there are too many exits to trust each of them to remember. `previous_sources_reused`
   * is settled here too: it is an observation about the answer's own source set, so it cannot honestly be
   * decided before that set exists. A path that claimed it earlier keeps its claim only if the identities
   * are really there.
   */
  async function answerWithEvidenceContinuity(question, opts = {}) {
    const out = await answer(question, opts);
    const meta = out && out.meta ? out.meta : null;
    if (!meta) return out;
    const served = ((out.result || {}).sources || []).map((x) => String(x.id)).filter(Boolean);
    const targetId = (out.result || {}).entry_id || "";
    if (meta.conversation_context && typeof meta.conversation_context === "object") {
      if (targetId) meta.conversation_context.previous_semantic_target = String(targetId);
      meta.conversation_context.previous_source_ids = [...new Set(served)].slice(0, 24);
    }
    // Strict, and measured against what was actually served rather than asserted upstream.
    const priorIds = new Set(
      Array.isArray(meta.__incoming_prior_evidence) ? meta.__incoming_prior_evidence.map(String) : [],
    );
    if (priorIds.size === 0) meta.previous_sources_reused = false;
    else meta.previous_sources_reused = served.some((id) => priorIds.has(id));
    delete meta.__incoming_prior_evidence;
    return out;
  }

  return { answer: answerWithEvidenceContinuity, usage, defaultMode };
}
