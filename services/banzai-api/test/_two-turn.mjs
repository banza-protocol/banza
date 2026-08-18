// A two-turn conversation through the real pipeline, carrying exactly what the server carries.
//
// The production boundary is narrower than "the conversation so far", and a harness that forgets this
// measures a system nobody runs. `server.js` forwards precisely two things to the pipeline:
//
//   contextQuestions      the prior USER questions, most-recent last, capped at 2 and 400 chars each
//   conversationContext   the previous answer's meta, sanitized to whitelisted TECHNICAL fields (ids and
//                         enums only)
//
// The assistant's prose is deliberately NOT forwarded. That is a design property, not an omission: a
// follow-up must bind to structured prior state, never to wording the model happened to produce. So a
// harness that replays `{role:"assistant", text:"…"}` into the engine is testing a channel that does not
// exist, and would hide the failure this file exists to reproduce.
//
// `turns()` therefore threads turn N's `meta.conversation_context` into turn N+1 the way the server does,
// and nothing else.

import { harness } from "./_pipeline-harness.mjs";
import { canaryProvider } from "./_production-canary.mjs";

/**
 * Run a sequence of questions as one conversation on ONE pipeline instance (so caches and state behave as
 * they do in a real session).
 *
 * The provider is the reachable canary by default: a follow-up that quietly needs the model to name its own
 * sources must be visible as a call count, not hidden behind an outage.
 *
 * Returns `{ turns: [...], calls() }` where each turn carries the fields a diagnosis actually needs.
 */
export async function conversation(
  questions,
  { provider = null, prose = "As fontes são estas.", seedContext = null } = {},
) {
  const c = provider ? { provider, calls: () => 0, requests: [] } : canaryProvider(prose);
  const h = harness({ provider: c.provider });

  const turns = [];
  // `seedContext` starts the conversation with a context the client would already be carrying. Used to prove
  // that provenance-only fields are inert to reference resolution.
  let priorContext = seedContext || undefined;
  const priorQuestions = [];

  for (const q of questions) {
    const opts = {};
    if (priorQuestions.length) opts.contextQuestions = priorQuestions.slice(-2);
    if (priorContext) opts.conversationContext = priorContext;

    const r = await h.pipeline.answer(q, opts);
    const meta = r.meta || {};
    const res = r.result || {};
    turns.push({
      question: q,
      terminal: meta.terminal_kind,
      entry: res.entry_id ?? null,
      answer: String(res.answer || ""),
      sources: (res.sources || []).map((s) => s.id),
      sourceKinds: Object.fromEntries((res.sources || []).map((s) => [s.id, s.kind ?? null])),
      mergeKind: meta.context_merge ?? null,
      contextUsed: meta.conversation_context_used === true,
      contextTurns: meta.context_turns_used ?? 0,
      contextUsedFor: meta.context_used_for ?? null,
      previousSourcesAvailable: meta.previous_sources_available === true,
      previousSourcesReused: meta.previous_sources_reused === true,
      referenceState: meta.reference_resolution_state ?? null,
      referenceTurnType: meta.reference_turn_type ?? null,
      referenceSubject: meta.reference_resolved_subject ?? "",
      intent: meta.intent ?? null,
      answerClass: meta.answer_class ?? null,
      llm: meta.llm_called === true,
      cache: meta.cache ?? null,
      fallbackReason: meta.fallback_reason ?? null,
    });

    priorQuestions.push(q);
    if (meta.conversation_context) priorContext = meta.conversation_context;
  }

  return { turns, calls: () => c.calls(), pipeline: h.pipeline };
}
