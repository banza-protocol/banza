// M2.18B.6 — the GROUNDED-SYNTHESIS runtime (the single model turn). Rust has already resolved the
// intent, entity, depth, retrieval plan and FactualPackage deterministically (no model); this module makes
// the ONE local-model call that synthesises a grounded explanation, then Rust validates every claim and
// citation before it can be published. On ANY failure it returns status "fallback" with a null answer so
// the pipeline serves the safe deterministic grounding and NEVER publishes an unvalidated model output.
// The model never interprets the question, selects sources or resolves entities.

import {
  resolveIntent,
  buildFactualPackagePlanned,
  buildOutputPrompt,
  outputSchema,
  validateOutput,
  verifyClaims,
  answerObligations,
  buildOutputPromptObliged,
  taskCompletion,
  buildOutputPromptStructured,
  outputSchemaStructured,
  buildOutputPromptObligedStructured,
  deriveCitedSourceIds,
  isCriticalSubject,
} from "./knowledge.js";
import { extractJson } from "./json-extract.js";

// SPR-4 §5 — STRUCTURED generation. The model authors ONLY the linguistic core it must genuinely write
// (answer_markdown + the claim→fact_id map + insufficient_evidence); `cited_source_ids` is DERIVED
// deterministically from the claim map (⊆ allowed_source_ids by construction), so a redundant,
// non-truth-bearing field is cut from generation and a dead/out-of-set citation is structurally
// impossible — under the UNCHANGED claim/citation validator.
//
// ACTIVATION GATE (mandate): structured is default-OFF and must be ACTIVATED explicitly with
// BANZAI_STRUCTURED_SYNTHESIS=1, and only after the live A/B harness (tools/spr4-ab-harness.mjs) proves
// unsupported_claim_rate=0, invalid_citation_rate=0, no information/reason-code/limitation lost, quality
// evals pass, and a MEASURABLE latency reduction. Until then the byte-identical baseline path runs, so a
// merge changes nothing at runtime until the flag is flipped on the host (the M2.8D activation pattern).
// The A/B harness drives both modes in-process via the explicit `structured` override, independent of
// this flag. The structured path silently falls back to the baseline if the structured WASM exports are
// unavailable (fecho por omissão — never worse than before).
function structuredSynthesisEnabled() {
  const v = String(process.env.BANZAI_STRUCTURED_SYNTHESIS ?? "0").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

// SPR-3 — the synthesis-generation contract identity, bound into the validated cache key so switching the
// output contract (baseline ↔ structured) opens a FRESH validated-cache namespace: a validated answer
// produced under one contract can never be served under the other. Structured-2 tags the SPR-4 §5
// contract (linguistic-core-only + derived cited_source_ids); baseline-1 the byte-identical prior contract.
export function synthesisContractVersion() {
  return structuredSynthesisEnabled() ? "structured/2" : "baseline/1";
}

// The document-selecting intents whose empty/insufficient package means "decline", not "guess".
const DOC_INTENTS = new Set([
  "explain_document",
  "summarize_document",
  "check_document_status",
  "explain_impact",
  "compare_documents",
]);

// M2.18B.3A Round B — answer depth. A normal public question wants a short, complete answer: `brief` is
// the default. Only intents that genuinely need more evidence and prose — comparing two documents or
// tracing an impact — use `standard`. `deep` is never auto-selected; it is reserved for an explicit
// caller override. Depth is the dominant latency lever: it caps both the FactualPackage size (input to
// the output pass) and the output token budget (the generation cost).
const STANDARD_DEPTH_INTENTS = new Set(["compare_documents", "explain_impact"]);
function depthForIntent(intent) {
  return STANDARD_DEPTH_INTENTS.has(intent) ? "standard" : "brief";
}
// The output-pass generation budget per depth — the minimum that still yields a COMPLETE, valid grounded
// JSON (answer_markdown + claims[] + citations). M2.18B.4 raised these from 256/512/768 after live evidence
// proved the prose+claims JSON was being TRUNCATED at 256 → invalid JSON → fecho por omissão fallback (the
// output-contract defect, not a threshold): a valid grounded answer must fit. Still the minimum for a
// complete answer at each depth; the FactualPackage depth caps (fact count/length) are unchanged.
const OUTPUT_BUDGET = { brief: 512, standard: 768, deep: 1024 };
function outputBudgetFor(depth) {
  return OUTPUT_BUDGET[depth] || OUTPUT_BUDGET.brief;
}

function emptyTrace() {
  return {
    synthesis_called: false,
    // Rust owns understanding: the intent + entity are resolved deterministically (no model). These record
    // WHAT Rust decided, not a model proposal.
    primary_intent: "",
    resolution_method: "",
    resolved_entity_id: "",
    entity_selection_reason: "",
    depth: "",
    facts_count: 0,
    package_hash: "",
    output_status: "skipped",
    output_latency_ms: 0,
    factual_ok: false,
    factual_errors: [],
    answer_composed_from_claims: false,
    model: "",
    // SPR-4 §5 — structured-generation telemetry (safe, non-textual): whether the structured path ran,
    // whether cited_source_ids was derived deterministically, and the llama.cpp decomposition timings.
    structured_synthesis: false,
    cited_source_ids_derived: false,
    output_timings: null,
  };
}

// M2.18B.6-R1 — recognise a timeout distinctly from a generic failure, so a pass that timed out is
// reported faithfully (tempo limite) rather than as "modelo indisponível". The provider throws a
// key-free "timed out after Xms" message on its own timer/queue-cancellation abort, and the queue
// throws code INFERENCE_TIMEOUT; both are timeouts. A genuine unreachable/HTTP error is NOT a timeout.
function isTimeoutError(e) {
  if (!e) return false;
  if (e.code === "INFERENCE_TIMEOUT") return true;
  return /timed out/i.test(String(e.message || ""));
}

// M2.18B.4 FIX (grounded 0%-publish) — when the constrained output is VALIDATED (every claim maps to real
// fact_ids and citations are within allowed_source_ids) but the model left `answer_markdown` empty — it
// "reasons" by filling `claims` and, with reasoning disabled + constrained decoding, emits the prose slot
// blank — compose the prose DETERMINISTICALLY from those ALREADY-VALIDATED claims. This changes NO factual
// content (every line is a Rust-validated claim), never fabricates (no claims ⇒ empty ⇒ treated as
// non-grounded upstream, fecho por omissão), and keeps "published only after Rust factual validation".
function composeAnswerFromClaims(output) {
  const lines = (Array.isArray(output && output.claims) ? output.claims : [])
    .map((c) => String((c && c.claim) || "").trim())
    .filter(Boolean);
  if (lines.length === 0) return "";
  if (lines.length === 1) return lines[0];
  return lines.map((l) => `- ${/[.!?…]$/.test(l) ? l : l + "."}`).join("\n");
}

// Run the OUTPUT pass: grounded synthesis over the FactualPackage, then Rust factual validation.
// Returns { output|null, verdict } (output is the validated GroundedOutput).
async function runOutputPass(question, pkg, { provider, timeoutMs, signal, maxTokens, model, depth, taskQuestion, structured = null, queueWaitMs = 0 }, trace) {
  // SPR-4 §1 — start the prompt-build timer (obligations + prompt + schema, JS/Rust-side, distinct from the
  // model's own prefill and from the queue wait). Each latency phase is measured separately so none hides.
  const tBuildStart = Date.now();
  // M2.18B.7 — resolve the task obligations and build the OBLIGATIONS-AWARE prompt so the model FULFILS the
  // task (example→scenario, procedure→steps, template→fields), not just grounds. Falls back to the plain
  // prompt if the obligations/WASM are unavailable (fecho por omissão: never worse than before).
  // TFG-3 — the obligations (task/shape) come from the CURRENT turn (taskQuestion); context supplies the
  // subject via `question`/the seed, but a prior turn's verb never changes the current turn's explicit task.
  const obligations = answerObligations(taskQuestion || question);
  trace.requested_task = obligations ? obligations.requested_task : "";
  // SPR-4 §5 — prefer the STRUCTURED contract (model authors only the linguistic core; cited_source_ids
  // derived deterministically). If the structured prompt/schema are unavailable, fall through to the
  // byte-identical baseline contract (fecho por omissão). `structured` is an explicit per-call override
  // (used by the A/B harness); when null it follows the runtime flag.
  const useStructured = structured != null ? structured : structuredSynthesisEnabled();
  let prompt = null;
  let schema = null;
  let structuredActive = false;
  if (useStructured) {
    const sp =
      (obligations && buildOutputPromptObligedStructured(question, pkg, depth || "brief", obligations._raw)) ||
      buildOutputPromptStructured(question, pkg, depth || "brief");
    const ss = outputSchemaStructured(pkg);
    if (sp && ss) {
      prompt = sp;
      schema = ss;
      structuredActive = true;
    }
  }
  if (!prompt || !schema) {
    prompt =
      (obligations && buildOutputPromptObliged(question, pkg, depth || "brief", obligations._raw)) ||
      buildOutputPrompt(question, pkg, depth || "brief");
    schema = outputSchema(pkg);
    structuredActive = false;
  }
  const promptBuildMs = Date.now() - tBuildStart;
  trace.structured_synthesis = structuredActive;
  if (!prompt || !schema) {
    trace.output_status = "unavailable";
    return { output: null, verdict: { ok: false, errors: ["output contract unavailable"] } };
  }
  const messages = [
    { role: "system", content: prompt.system },
    { role: "user", content: prompt.user },
  ];
  // disableReasoning: the output must be clean JSON; reasoning tokens would bloat/break it.
  const callOpts = { disableReasoning: true, timeoutMs, signal, maxTokens, jsonSchema: schema, model };
  let raw = "";
  try {
    const r = await provider.synthesize(messages, callOpts);
    raw = r && r.text ? r.text : "";
    trace.output_latency_ms += (r && r.latencyMs) || 0;
    if (!trace.model) trace.model = (r && r.model) || model || "";
    // SPR-4 §1 — the FULL latency decomposition (safe counts/ms only; never prose). Distinct phases so no
    // time hides in an aggregate: queue_wait (before the model call) + prompt_build (JS/Rust) + prefill
    // (llama.cpp prompt-eval; prompt→tokens folded in) + generation + validate + claim/citation verification;
    // total_ms (the whole output pass) is stamped by the caller. claim vs citation are ONE Rust verifier
    // call, exposed as one field (not fabricated into two). Powers the A/B harness + the /ask observability.
    const mt = (r && r.timings) || {};
    const num = (v) => (Number.isFinite(v) ? v : null);
    trace.output_timings = {
      queue_wait_ms: num(queueWaitMs) != null ? Math.round(queueWaitMs) : null,
      prompt_build_ms: promptBuildMs,
      prefill_ms: num(mt.prefill_ms),
      generation_ms: num(mt.generation_ms),
      tokens_evaluated: num(mt.tokens_evaluated),
      tokens_predicted: num(mt.tokens_predicted),
      tokens_per_second: num(mt.tokens_per_second),
      validate_ms: null,
      claim_citation_verification_ms: null,
      total_ms: null,
    };
  } catch (e) {
    // M2.18B.6-R1 — faithful: a timeout (tempo limite) is not a generic failure.
    trace.output_status = isTimeoutError(e) ? "timeout" : "failed";
    return { output: null, verdict: { ok: false, errors: ["output pass failed"] } };
  }
  let output;
  try {
    output = JSON.parse(extractJson(raw));
  } catch {
    trace.output_status = "invalid";
    return { output: null, verdict: { ok: false, errors: ["output not JSON"] } };
  }
  // SPR-4 §5 — in the structured path the model did NOT author cited_source_ids. Derive it
  // deterministically from the claim map (⊆ allowed_source_ids by construction) BEFORE any validation,
  // so the structural validator, the task-completion gate and the claim/citation verifier all read the
  // same derived, guaranteed-valid citation set — the validator is unchanged, its guarantees intact.
  if (structuredActive) {
    output.cited_source_ids = deriveCitedSourceIds(pkg, output);
    trace.cited_source_ids_derived = true;
  }
  const tValidate = Date.now();
  const verdict = validateOutput(pkg, output);
  if (trace.output_timings) trace.output_timings.validate_ms = Date.now() - tValidate;
  trace.factual_ok = Boolean(verdict.ok);
  trace.factual_errors = (verdict.errors || []).slice(0, 8);
  trace.output_status = verdict.ok ? "ok" : "rejected";
  // A VALIDATED output with an empty prose slot but real validated claims → compose the prose from those
  // claims (deterministic, no new factual content). If there are no claims either, it stays empty and is
  // treated as non-grounded upstream (fecho por omissão). Never runs for a rejected output.
  if (verdict.ok && output && !String(output.answer_markdown || "").trim()) {
    output.answer_markdown = composeAnswerFromClaims(output);
    trace.answer_composed_from_claims = Boolean(output.answer_markdown);
  }
  // M2.18B.7 — the deterministic TASK-COMPLETION gate: a factually-grounded answer that does NOT fulfil the
  // task (an example without a scenario, a comparison with one side, a lookup without metadata) must NOT be
  // published as a success. No extra model call — Rust decides; the turn degrades to the honest fallback.
  if (
    verdict.ok &&
    output &&
    obligations &&
    !output.insufficient_evidence &&
    String(output.answer_markdown || "").trim()
  ) {
    const facts = Array.isArray(pkg && pkg.facts) ? pkg.facts.length : 0;
    // M2.18B.7 (Source Appropriateness) — feed the REAL retrieval verdict, not a hardcoded true. When the
    // plan found no task-suitable source (source_appropriate=false), a template/example answer that lacks
    // real structure/scenario is SOURCE_INADEQUATE and the turn degrades to a transparent limitation
    // instead of passing a thematically-adjacent document off as the requested deliverable.
    const rp = pkg && pkg.retrieval_plan;
    // Only apply the appropriateness gate when the plan and the obligations agree on the TASK. If context
    // shifted the plan's task vs the current turn's obligations (TFG-3), fall back to `true` so a valid
    // answer is never wrongly rejected; the obligations still govern the SHAPE check below.
    const taskAligned = rp && obligations && rp.requested_task === obligations.requested_task;
    const sourceAppropriate =
      rp && typeof rp.source_appropriate === "boolean" && taskAligned ? rp.source_appropriate : true;
    trace.source_appropriateness = (rp && rp.source_appropriateness) || "";
    const completion = taskCompletion(
      obligations._raw,
      String(output.answer_markdown || ""),
      Array.isArray(output.cited_source_ids) ? output.cited_source_ids : [],
      facts,
      sourceAppropriate,
    );
    if (completion) {
      trace.task_completion_status = completion.status;
      trace.task_completion_publishable = completion.publishable;
      if (!completion.publishable) {
        trace.output_status = "task_incomplete";
        return { output: null, verdict: { ok: false, errors: [`task incomplete: ${completion.status}`] } };
      }
    }
  }

  // Increment 4 (§8/§9) — the claim taxonomy + claim/citation verifier, on the COMPOSED answer, BEFORE it is
  // returned. Every claim is classified (SUPPORTED | DERIVED | ESTIMATED | HYPOTHETICAL | UNSUPPORTED); an
  // UNSUPPORTED claim, an unlabelled ESTIMATED/HYPOTHETICAL claim, an underived DERIVED calculation,
  // unsupported causality, a single observation dressed as an average, or a dead/invented citation is NEVER
  // published — the turn degrades to the safe deterministic fallback. This runs over the SAME transversal
  // FactualPackage the operational path uses, so verification is uniform. Rust decides; JS transports.
  if (verdict.ok && output && !output.insufficient_evidence && String(output.answer_markdown || "").trim()) {
    const tVerify = Date.now();
    const claimVerdict = verifyClaims(pkg, {
      answer_markdown: String(output.answer_markdown || ""),
      claims: Array.isArray(output.claims) ? output.claims : [],
      cited_source_ids: Array.isArray(output.cited_source_ids) ? output.cited_source_ids : [],
    });
    if (trace.output_timings) trace.output_timings.claim_citation_verification_ms = Date.now() - tVerify;
    trace.claim_verification_ok = Boolean(claimVerdict && claimVerdict.ok);
    trace.claim_categories = (claimVerdict && Array.isArray(claimVerdict.classified) ? claimVerdict.classified : []).map((c) => c.category);
    if (!claimVerdict || !claimVerdict.ok) {
      trace.output_status = "claim_rejected";
      trace.claim_verification_errors = (claimVerdict && Array.isArray(claimVerdict.errors) ? claimVerdict.errors : []).slice(0, 8);
      return { output: null, verdict: { ok: false, errors: ["claim/citation verification failed"] } };
    }
  }
  return { output: verdict.ok ? output : null, verdict };
}

// The grounded-synthesis turn — Rust resolves, the model explains once, Rust validates before publish.
// `question` is the raw user question (boundary already cleared upstream). Returns { status,
// answer_markdown, cited_source_ids, entity_id, primary_intent, package_hash, clarification_candidates,
// verdict, trace }. status ∈ grounded | clarify | insufficient | fallback.
export async function runGroundedSynthesis(
  question,
  { provider, traceId = "", timeoutMs, signal, outputMaxTokens = null, depth = null, model = null, entityId = null, taskQuestion = null, onProgress = null, structured = null, queueWaitMs = 0 } = {},
) {
  const trace = emptyTrace();
  // SPR-2 — the safe Channel-A emitter (the pipeline threads its `emit` in as onProgress). It NEVER throws
  // into the synthesis, and it emits only PUBLIC-SAFE facts (counts/ids/enums/checksums) — never the prompt,
  // the package's normalized question, chain-of-thought or the model's text. Absent → a no-op (unchanged).
  const progress = typeof onProgress === "function" ? (k, p = {}) => { try { onProgress(k, p); } catch { /* fecho por omissão */ } } : () => {};
  let builtPackage = null;
  const done = (status, extra = {}) => ({
    status,
    answer_markdown: null,
    cited_source_ids: [],
    entity_id: trace.resolved_entity_id,
    primary_intent: "",
    package_hash: trace.package_hash,
    clarification_candidates: [],
    verdict: null,
    // The FactualPackage this turn built (null before the package step), so the caller can map cited ids
    // to canonical source objects — never authored.
    package: builtPackage,
    trace,
    ...extra,
  });

  if (!provider || typeof provider.synthesize !== "function") {
    trace.output_status = "unavailable";
    return done("fallback");
  }
  trace.synthesis_called = true;

  // ── RESOLUTION — Rust-first, model-free ────────────────────────────────────────────────────────
  // Rust understands the question: it produces the intent, entity, depth and clarification
  // deterministically (engines/banzai-query-core/src/resolve.rs). The router's seed (an explicit document or a
  // concept's canonical source) is authoritative. No model interprets anything — the single model turn is
  // the grounded synthesis below.
  const resolved = resolveIntent(question, entityId || "");
  if (!resolved) return done("fallback");
  const primaryIntent = resolved.primary_intent || "";
  trace.primary_intent = primaryIntent;
  trace.resolution_method = resolved.resolution_method || "rust_deterministic";

  // Boundary / unsupported (defence — the router refuses boundaries upstream before the trunk).
  if (resolved.boundary_detected || primaryIntent === "boundary_request" || primaryIntent === "unsupported") {
    return done("fallback", { primary_intent: primaryIntent });
  }

  // Entity: the resolver already honoured the router's seed and, when unseeded, ran deterministic
  // candidate selection (select_entity with an empty model id). Rust owns which record grounds the answer.
  const sel = {
    resolved_id: resolved.resolved_entity_id || "",
    requires_clarification: Boolean(resolved.requires_clarification),
    reason: resolved.entity_selection_reason || "",
    clarification_candidates: Array.isArray(resolved.clarification_candidates) ? resolved.clarification_candidates : [],
  };
  trace.resolved_entity_id = sel.resolved_id;
  trace.entity_selection_reason = sel.reason;
  if (sel.requires_clarification || primaryIntent === "clarification_required") {
    return done("clarify", {
      primary_intent: primaryIntent,
      clarification_candidates: sel.clarification_candidates,
    });
  }

  // ── FactualPackage (Rust) — the SINGLE enriched contract (§11) ────────────────────────────────
  // Depth is Rust-owned (resolved.depth: standard only for compare/impact; brief otherwise); an explicit
  // caller override still wins. It caps both the package size and the output budget below.
  const effectiveDepth = depth || resolved.depth || depthForIntent(primaryIntent);
  trace.depth = effectiveDepth;
  // One builder for every intent: Rust plans the answer + retrieval and draws the facts from exactly the
  // plan's eligible, public sources — conflict-excluded/historical/ineligible sources are never drawn, and
  // a comparison naturally gets every named document (both sides citeable) because the RetrievalPlan makes
  // each a primary source. The package embeds the ResolvedIntent, AnswerPlan and RetrievalPlan plus the
  // full provenance (claims allowed/forbidden, citation map, checksums) the ONE model turn and the factual
  // validator need. The model receives only this package — never the corpus, unselected candidates,
  // internal sources or the full relation graph.
  const pkg = buildFactualPackagePlanned(traceId, question, sel.resolved_id || "", effectiveDepth);
  builtPackage = pkg || null;
  if (!pkg || !Array.isArray(pkg.facts) || pkg.facts.length === 0) {
    // An empty package is where the original bug hid. `facts.length === 0` was reported to the caller as
    // one undifferentiated "insufficient", and the caller published it as "not enough public evidence" —
    // even when the real cause was that no subject had resolved, so no package could be built at all.
    //
    // Three genuinely different situations, so the cause travels with the result:
    //
    //   unresolved_subject — nothing resolved, so nothing could be assembled. For an open-ended question
    //     that is ordinary; general retrieval is a legitimate next step and this is NOT a claim about what
    //     BANZA documents.
    //   critical_factual_package_empty — a REGISTERED CRITICAL subject resolved and still produced no
    //     facts. That is the engine contradicting its own registry: it knows this subject and says it has
    //     nothing to say about it. An internal inconsistency, never presented as absent evidence.
    //   no_eligible_evidence — a subject resolved and the corpus genuinely holds nothing admissible for
    //     it. This one is real epistemic insufficiency.
    trace.facts_count = 0;
    const resolved = sel.resolved_id || "";
    const cause = !resolved
      ? "unresolved_subject"
      : isCriticalSubject(resolved)
        ? "critical_factual_package_empty"
        : "no_eligible_evidence";
    trace.empty_package_cause = cause;
    return done("insufficient", { primary_intent: primaryIntent, insufficient_cause: cause });
  }
  if (primaryIntent === "compare_documents") trace.compare_doc_ids = pkg.allowed_source_ids || [];
  trace.facts_count = pkg.facts.length;
  trace.package_hash = pkg.content_hash || "";
  trace.package_checksum = pkg.package_checksum || "";

  // FACTUAL_PACKAGE_READY — the transversal package is assembled, BEFORE the single model turn. Carries only
  // PUBLIC-SAFE provenance (intent, source ids, counts, checksum) — never the normalized question or prose.
  progress("FACTUAL_PACKAGE_READY", {
    source: "grounded_synthesis",
    primary_intent: primaryIntent,
    facts_count: pkg.facts.length,
    documentary_sources: Array.isArray(pkg.allowed_source_ids) ? pkg.allowed_source_ids : [],
    depth: effectiveDepth,
    package_checksum: pkg.package_checksum || "",
    package_hash: pkg.content_hash || "",
  });

  // ── PASS 2 — grounded synthesis + factual validation ──────────────────────────────────────────
  // Output budget is the minimum for a complete answer at this depth (explicit override wins).
  const outBudget = outputMaxTokens != null ? outputMaxTokens : outputBudgetFor(effectiveDepth);
  // SYNTHESIS_STARTED — the ONE model call begins. Safe metadata only (model/depth/facts) — never the prompt.
  progress("SYNTHESIS_STARTED", { model: model || "", depth: effectiveDepth, facts_count: pkg.facts.length });
  const tOutputPass = Date.now();
  const { output, verdict } = await runOutputPass(question, pkg, { provider, timeoutMs, signal, maxTokens: outBudget, model, depth: effectiveDepth, taskQuestion: taskQuestion || question, structured, queueWaitMs }, trace);
  // SPR-4 §1 — total_ms is the whole output pass (build + prefill + generation + validation + verification),
  // stamped here so every return path in runOutputPass carries it; queue_wait_ms sits outside it.
  if (trace.output_timings) trace.output_timings.total_ms = Date.now() - tOutputPass;
  // SYNTHESIS_COMPLETED — the model finished producing text; it is HELD server-side and NEVER streamed. This
  // event carries only the output STATUS + model + latency (a count) — never one character of the prose.
  progress("SYNTHESIS_COMPLETED", {
    output_status: trace.output_status || "unknown",
    model: trace.model || model || "",
    output_latency_ms: Number(trace.output_latency_ms) || 0,
    claim_verification_ok: Boolean(trace.claim_verification_ok),
  });
  if (!output) {
    // validator rejected (or the pass failed) → never publish; fall back.
    return done("fallback", { primary_intent: primaryIntent, verdict });
  }
  if (output.insufficient_evidence) {
    // The package had facts and the model still declined. That is a judgement about the evidence, not a
    // failure to assemble it — and it is not the same event as an empty package.
    trace.empty_package_cause = "evidence_below_threshold";
    return done("insufficient", {
      primary_intent: primaryIntent,
      verdict,
      insufficient_cause: "evidence_below_threshold",
    });
  }

  return done("grounded", {
    answer_markdown: output.answer_markdown,
    cited_source_ids: output.cited_source_ids || [],
    primary_intent: primaryIntent,
    verdict,
  });
}

export const _internal = { DOC_INTENTS, runOutputPass };
