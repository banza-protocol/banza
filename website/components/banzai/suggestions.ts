// Increment 9 (§25) — CONTEXTUAL EXECUTABLE SUGGESTIONS.
//
// A deterministic, typed, pure generator that derives per-answer follow-up suggestions from THIS
// answer's shape — the resolved intent + entity + scope + which tools ran + what was NOT yet asked —
// so the suggestions VARY by answer instead of a fixed list served for every reply (the M2.9A
// `SUGGESTIONS`/`DEFAULT_SUGGESTIONS` record this replaces returned the same three items for nearly
// every grounded answer, because the coarse routing intent is almost always "grounded").
//
// SAFETY (hard invariant, guard + test enforced): a boundary/refusal answer NEVER receives a
// suggestion that reframes toward the refused action. Its suggestions are a fixed, safe set that pivots
// to what BanzAI legitimately does (explain the topic, state its boundaries, show how conformance is
// demonstrated) — they never mention transferring funds, revealing a key, deleting guards, etc.
//
// Every suggestion is EXECUTABLE: clicking it sends a concrete follow-up question the pipeline can
// actually answer (a manifest/keys/conformance lookup, a per-step duration, an ADR/RFC lookup, a
// safe example, a comparison — the anaphoric ones ("a etapa mais lenta", "a execução anterior") rely on
// the Inc.6 multi-turn context). Suggestions are QUESTIONS, never normative claims.
//
// ── BLOCK E2/Q2 — SELECTION IS SEMANTIC, REALIZATION IS PER-LOCALE ─────────────────────────────────
//
// The generator answers WHICH suggestions this answer earns; it does not answer what they SAY. Selection
// walks the branch tree and returns stable semantic ids (plus the entity/profile parameters the branch
// resolved), with no locale anywhere in it. Realization then looks each id up in the catalogue and
// interpolates the parameters INTO THAT LOCALE'S OWN TEMPLATE — never into a Portuguese sentence that is
// afterwards translated.
//
// That split is what makes the two editions the same product: `selectSuggestions` is the ONE algorithm,
// so a Portuguese reader and an English reader take the same branches, get the same ids and the same
// order, and differ only in the words. There is no locale default below this boundary — `locale` is a
// required argument, a missing realization throws rather than silently serving Portuguese, and the
// "never a normative claim" filter is evaluated over EVERY locale of a candidate so a suggestion cannot
// be filtered out of one edition and survive in the other.

import type { KbKind } from "@/components/home/banzaiKb";
import type { Locale } from "@/lib/i18n";

// The per-answer context the generator reads. Built by `mapAskResponse` from the /ask envelope (the
// observability record + scope_resolution + the mapped answer fields) — never from free model text.
export type SuggestionContext = {
  kind: KbKind; // answer | refusal | uncertain | unavailable | duration
  refused: boolean; // a deliberate safety refusal (decided in Rust before any model call)
  boundary: boolean; // reasoning_trace.boundary_detected
  grounded: boolean;
  degraded: boolean;
  operationalIntent: string; // coarse routing intent (o.intent) — kept for the M2.9A fine intents
  answerType: string; // o.answer_type (how_it_works | definition | governance_explanation | …)
  questionFamily: string | null; // o.question_family (compare_executions | get_reason_code | …)
  contextualFallbackKind: string | null; // understood_data_missing | ambiguous | tool_unavailable | out_of_scope | insufficient_source
  terminalKind: string; // operational_duration | insufficient_measurements | …
  entity: { id: string; type: string | null; display: string | null } | null;
  scope: { profile: string | null; environment: string | null; protocolVersion: string | null } | null;
  toolsRan: string[]; // tool kinds that actually ran (observability.tool_plan / scope_resolution.tool)
  duration: { comparableRuns: number; hasPerStep: boolean } | null;
  hasResolvedDocument: boolean; // a named ADR/RFC was resolved — its own chips cover the continuation
};

/** The parameters a branch resolved. Facts, not copy: the same values feed every locale's template. */
export type SuggestionParams = Readonly<{ label?: string; profile?: string }>;

/** What the algorithm decides: which suggestion, with which facts. Locale-free by construction. */
export type SuggestionSelection = Readonly<{ id: SuggestionId; params?: SuggestionParams }>;

const L = (pt: string, en: string): Readonly<Record<Locale, string>> => ({ pt, en });

// ── THE CATALOGUE ─────────────────────────────────────────────────────────────────────────────────
// One entry per semantic suggestion. `{label}` and `{profile}` are interpolated after the locale is
// chosen, so each edition composes its own sentence around the same facts.
export const SUGGESTION_COPY = {
  // Boundary/refusal — the only set a refused answer may ever receive.
  "safe.what_can_explain": L(
    "O que é que o BanzAI pode explicar sobre este tema?",
    "What can BanzAI explain about this topic?",
  ),
  "safe.boundaries": L("Quais são as fronteiras do BanzAI?", "What are BanzAI's boundaries?"),
  "safe.conformance_by_evidence": L(
    "Como se demonstra conformidade por evidência verificável?",
    "How is conformance demonstrated through verifiable evidence?",
  ),

  // Entity continuations — the artifacts of the entity this answer resolved.
  "entity.manifest": L("Mostrar o manifesto de {label}", "Show the manifest of {label}"),
  "entity.manifest_implementation": L(
    "Mostrar o manifesto da implementação {label}",
    "Show the manifest of implementation {label}",
  ),
  "entity.conformance": L("Ver a conformidade de {label}", "See the conformance of {label}"),
  "entity.conformance_in_profile": L(
    "Ver a conformidade de {label} no perfil {profile}",
    "See the conformance of {label} in profile {profile}",
  ),
  "entity.keys_and_trust": L(
    "Ver as chaves e a confiança de {label}",
    "See the keys and trust of {label}",
  ),
  "entity.replay_last_run": L("Reproduzir a última execução de {label}", "Replay the last run of {label}"),

  // Operational duration measurements.
  "duration.per_step": L("Mostrar a duração por etapa", "Show the duration per step"),
  "duration.slowest_step": L("Explicar a etapa mais lenta", "Explain the slowest step"),
  "duration.compare_previous": L("Comparar com a execução anterior", "Compare with the previous run"),
  "duration.entity_last_run": L("Mostrar a última execução de {label}", "Show the last run of {label}"),

  // Honest "no comparable measurements" → what would make it answerable.
  "measurements.start_validation": L(
    "Iniciar a validação de {label} para gerar medições",
    "Start the validation of {label} to generate measurements",
  ),
  "measurements.how_to_run": L(
    "Como executo uma validação para gerar medições?",
    "How do I run a validation to generate measurements?",
  ),
  "measurements.what_is_recorded": L(
    "O que é que o BanzAI regista durante uma validação?",
    "What does BanzAI record during a validation?",
  ),

  // Typed contextual declines.
  "fallback.what_is_banza": L("O que é o protocolo BANZA?", "What is the BANZA protocol?"),
  "fallback.what_can_banzai_answer": L(
    "O que é que o BanzAI pode responder sobre o protocolo?",
    "What can BanzAI answer about the protocol?",
  ),
  "fallback.tool_when_available": L(
    "O que faz esta ferramenta quando está disponível?",
    "What does this tool do when it is available?",
  ),
  "fallback.tool_alternative": L(
    "Que alternativa existe para obter isto?",
    "What alternative is there to obtain this?",
  ),
  "fallback.clarify_reference": L("Pode detalhar a que se refere?", "Can you say what this refers to?"),
  "fallback.related_adr_rfc": L(
    "Que ADR ou RFC está relacionado com isto?",
    "Which ADR or RFC is related to this?",
  ),
  "fallback.what_is_needed_for_entity": L(
    "O que é preciso para responder sobre {label}?",
    "What is needed to answer about {label}?",
  ),
  "fallback.what_is_needed": L(
    "O que é preciso para responder a isto?",
    "What is needed to answer this?",
  ),
  "fallback.what_makes_answerable": L(
    "Que evidência é que torna isto respondível?",
    "What evidence makes this answerable?",
  ),
  "fallback.which_sources_answer": L(
    "Que fontes é que respondem a isto?",
    "Which sources answer this?",
  ),

  // Question families.
  "family.biggest_difference": L(
    "Explicar a maior diferença entre as execuções",
    "Explain the biggest difference between the runs",
  ),
  "family.replay_most_recent": L("Reproduzir a execução mais recente", "Replay the most recent run"),
  "family.reason_code_of_result": L(
    "Qual foi o reason code deste resultado?",
    "What was the reason code of this result?",
  ),
  "family.how_to_fix": L("Como é que se corrige isto?", "How is this fixed?"),
  "family.what_reason_code_means": L(
    "O que significa este reason code?",
    "What does this reason code mean?",
  ),
  "family.how_to_resolve_reason_code": L(
    "Como é que se resolve este reason code?",
    "How is this reason code resolved?",
  ),

  // The M2.9A fine operational intents.
  "op.manifest_example": L(
    "mostra um exemplo de manifest de operador",
    "show an example of an operator manifest",
  ),
  "op.prepare_conformance_evidence": L(
    "como preparo evidência de conformidade?",
    "how do I prepare conformance evidence?",
  ),
  "op.federate_with_operator": L(
    "como federar com outro operador?",
    "how do I federate with another operator?",
  ),
  "op.manifest_required_fields": L(
    "quais são os campos obrigatórios do manifest?",
    "which manifest fields are required?",
  ),
  "op.evidence_bundle_example": L(
    "mostra um exemplo de evidence bundle",
    "show an example of an evidence bundle",
  ),
  "op.where_publish_manifest": L("onde publico o manifest?", "where do I publish the manifest?"),
  "op.how_trust_evaluation": L("como funciona trust evaluation?", "how does trust evaluation work?"),
  "op.consult_revocation_list": L(
    "como consulto a revocation list?",
    "how do I consult the revocation list?",
  ),
  "op.evidence_to_federate": L(
    "que evidência publico para federar?",
    "what evidence do I publish in order to federate?",
  ),
  "op.pass_is_certificate": L("um PASS é um certificado?", "is a PASS a certificate?"),
  "op.start_with_my_operator": L(
    "onde começo com o meu operador?",
    "where do I start with my operator?",
  ),
  "op.how_revocation_works": L("como funciona a revogação?", "how does revocation work?"),
  "op.what_is_key_manifest": L("o que é o key manifest?", "what is the key manifest?"),
  "op.financial_invariants": L(
    "quais são as invariantes financeiras?",
    "what are the financial invariants?",
  ),
  "op.double_entry_ledger": L(
    "como funciona o ledger de dupla entrada?",
    "how does the double-entry ledger work?",
  ),
  "op.where_is_revocation_list": L("onde está a revocation list?", "where is the revocation list?"),
  "op.how_demonstrate_conformance": L(
    "como demonstro conformidade?",
    "how do I demonstrate conformance?",
  ),

  // Grounded continuations keyed by the composition answer_type.
  "ans.applies_to_operator": L(
    "Como é que isto se aplica a um operador?",
    "How does this apply to an operator?",
  ),
  "ans.which_adr_rfc": L("Que ADR ou RFC define isto?", "Which ADR or RFC defines this?"),
  "ans.safe_example": L("Mostra um exemplo seguro.", "Show a safe example."),
  "ans.where_are_limits": L("Onde é que estão os limites disto?", "Where are the limits of this?"),
  "ans.what_evidence_proves": L("Que evidência prova isto?", "What evidence proves this?"),
  "ans.why_is_that_boundary": L("Porque é que essa é a fronteira?", "Why is that the boundary?"),
  "ans.practical_difference": L(
    "Qual é a diferença na prática para um operador?",
    "What is the difference in practice for an operator?",
  ),
  "ans.which_adr_each_side": L(
    "Que ADR define cada um dos lados?",
    "Which ADR defines each of the two sides?",
  ),
  "ans.propose_change_rfc_adr": L(
    "Como se propõe uma alteração por RFC ou ADR?",
    "How is a change proposed through an RFC or ADR?",
  ),
  "ans.who_decides_governance": L(
    "Quem decide isto na governança do protocolo?",
    "Who decides this in the protocol's governance?",
  ),
  "ans.which_financial_invariant": L(
    "Que invariante financeira protege isto?",
    "Which financial invariant protects this?",
  ),
  "ans.how_operator_implements": L(
    "Como é que um operador implementa isto?",
    "How does an operator implement this?",
  ),
  "ans.next_steps_to_implement": L(
    "Quais são os passos seguintes para implementar?",
    "What are the next steps to implement?",
  ),
  "ans.what_evidence_i_publish": L("Que evidência é que eu publico?", "What evidence do I publish?"),
  "ans.oz_manifest": L("Mostrar o manifesto do Operador Zero", "Show the Operator Zero manifest"),
  "ans.oz_conformance": L(
    "Ver a conformidade do Operador Zero",
    "See the conformance of Operator Zero",
  ),
  "ans.oz_keys_trust": L(
    "Ver as chaves e a confiança do Operador Zero",
    "See the keys and trust of Operator Zero",
  ),
  "ans.explain_concept_behind_example": L(
    "Explica o conceito por trás deste exemplo.",
    "Explain the concept behind this example.",
  ),
} as const;

export type SuggestionId = keyof typeof SUGGESTION_COPY;

/** Every id the catalogue defines — the closed world a coverage property reads. */
export function suggestionIds(): SuggestionId[] {
  return Object.keys(SUGGESTION_COPY) as SuggestionId[];
}

/**
 * Render ONE selection in ONE locale. The template is chosen first and the facts are interpolated into
 * it, so no sentence is ever built in Portuguese and then translated. A missing realization is a defect
 * and throws — an English reader is never quietly handed the Portuguese one.
 */
export function realizeSuggestion(sel: SuggestionSelection, locale: Locale): string {
  const entry = SUGGESTION_COPY[sel.id];
  if (!entry) throw new Error(`realizeSuggestion: unknown suggestion id "${sel.id}"`);
  const template = entry[locale];
  if (!template) throw new Error(`realizeSuggestion: no ${locale} realization for "${sel.id}"`);
  const params = sel.params ?? {};
  const out = template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const value = (params as Record<string, string | undefined>)[key];
    if (value === undefined || value === "") {
      throw new Error(`realizeSuggestion: "${sel.id}" needs parameter "${key}"`);
    }
    return value;
  });
  return out;
}

/** Render a whole selection in one locale. */
export function realizeSuggestions(sels: readonly SuggestionSelection[], locale: Locale): string[] {
  return sels.map((s) => realizeSuggestion(s, locale));
}

/** The boundary/refusal set, as semantic ids — deliberately independent of the entity and the verb. */
export const SAFE_REFRAME_IDS: readonly SuggestionId[] = Object.freeze([
  "safe.what_can_explain",
  "safe.boundaries",
  "safe.conformance_by_evidence",
]);

/** The boundary/refusal set, realized. */
export function safeReframeSuggestions(locale: Locale): string[] {
  return realizeSuggestions(
    SAFE_REFRAME_IDS.map((id) => ({ id })),
    locale,
  );
}

const s = (id: SuggestionId, params?: SuggestionParams): SuggestionSelection =>
  params ? { id, params } : { id };

// The M2.9A fine operational intents (kept so an answer that carries one still gets its tuned set).
const OPERATIONAL_INTENT_SUGGESTIONS: Record<string, SuggestionId[]> = {
  operator_onboarding: ["op.manifest_example", "op.prepare_conformance_evidence", "op.federate_with_operator"],
  operator_manifest: ["op.manifest_required_fields", "op.evidence_bundle_example", "op.where_publish_manifest"],
  federation_how_to: ["op.how_trust_evaluation", "op.consult_revocation_list", "op.evidence_to_federate"],
  conformance_evidence: ["op.evidence_bundle_example", "op.pass_is_certificate", "op.start_with_my_operator"],
  trust_evaluation: ["op.how_revocation_works", "op.what_is_key_manifest", "op.federate_with_operator"],
  revocation: ["op.how_trust_evaluation", "op.where_is_revocation_list"],
  implementation_steps: ["op.financial_invariants", "op.double_entry_ledger", "op.start_with_my_operator"],
  evidence_bundle: ["op.how_demonstrate_conformance", "op.start_with_my_operator"],
};

// Grounded answers keyed by the composition answer_type — this is present on virtually every grounded
// answer and varies per question, so it (not a single default) drives the common case.
const ANSWER_TYPE_SUGGESTIONS: Record<string, SuggestionId[]> = {
  how_it_works: ["ans.applies_to_operator", "ans.which_adr_rfc", "ans.safe_example"],
  capabilities_and_limits: ["ans.where_are_limits", "ans.what_evidence_proves", "ans.which_adr_rfc"],
  yes_no_with_boundary: ["ans.why_is_that_boundary", "ans.which_adr_rfc"],
  comparison: ["ans.practical_difference", "ans.which_adr_each_side"],
  definition: ["ans.applies_to_operator", "ans.which_adr_rfc", "ans.safe_example"],
  governance_explanation: ["ans.propose_change_rfc_adr", "ans.who_decides_governance"],
  financial_concept: ["ans.which_financial_invariant", "ans.how_operator_implements"],
  implementation_stack: ["ans.next_steps_to_implement", "ans.what_evidence_i_publish"],
  operator_zero_guidance: ["ans.oz_manifest", "ans.oz_conformance", "ans.oz_keys_trust"],
  example_safe: ["ans.explain_concept_behind_example", "ans.which_adr_rfc"],
};

// The last-resort grounded set (only when the answer carries no distinguishing intent/type/entity).
const GENERIC_GROUNDED: SuggestionId[] = ["ans.applies_to_operator", "ans.which_adr_rfc", "ans.safe_example"];

/**
 * Cap and de-duplicate. The key is the SEMANTIC identity (id + facts), not the rendered sentence, so
 * every edition drops exactly the same repeats and keeps exactly the same length.
 */
const cap = (xs: SuggestionSelection[], n = 4): SuggestionSelection[] => {
  const seen = new Set<string>();
  const out: SuggestionSelection[] = [];
  for (const x of xs) {
    const key = `${x.id}|${JSON.stringify(x.params ?? {})}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
    if (out.length >= n) break;
  }
  return out;
};

// True if a suggestion looks like a normative claim (must never be surfaced) — a defensive net; the
// authored sets already avoid these words. Evaluated over EVERY locale of the candidate, so a claim can
// never be filtered out of one edition while surviving in the other.
const CLAIM_WORDS = /certif|aprov|approv|licen|garant|guarant/i;
const isClaim = (sel: SuggestionSelection): boolean =>
  (Object.keys(SUGGESTION_COPY[sel.id]) as Locale[]).some((l) => CLAIM_WORDS.test(realizeSuggestion(sel, l)));

const entityLabel = (e: { id: string; display: string | null }): string => (e.display || e.id).trim();

// Whether an artifact/manifest was already fetched for this entity (so we don't re-offer it).
const fetchedArtifact = (toolsRan: string[]): boolean =>
  toolsRan.some((t) => /ARTIFACT|artifact-fetcher|LIVE_ARTIFACT_FETCH/i.test(t));

// Suggestions for an answer that resolved an ecosystem ENTITY — offer that entity's other artifacts,
// dropping whatever a tool already fetched this turn (so the set reflects "what was NOT yet asked").
function entitySuggestions(ctx: SuggestionContext): SuggestionSelection[] {
  const e = ctx.entity!;
  const label = entityLabel(e);
  const isImpl = e.type === "implementation";
  const out: SuggestionSelection[] = [];
  if (!fetchedArtifact(ctx.toolsRan)) {
    out.push(s(isImpl ? "entity.manifest_implementation" : "entity.manifest", { label }));
  }
  // Scope-aware conformance follow-up: when the answer resolved a profile, ask about THAT profile.
  const profile = ctx.scope?.profile;
  out.push(profile ? s("entity.conformance_in_profile", { label, profile }) : s("entity.conformance", { label }));
  out.push(s("entity.keys_and_trust", { label }));
  if (isImpl) out.push(s("entity.replay_last_run", { label }));
  return out;
}

function durationSuggestions(ctx: SuggestionContext): SuggestionSelection[] {
  const d = ctx.duration;
  const out: SuggestionSelection[] = [s("duration.per_step")];
  if (d?.hasPerStep) out.push(s("duration.slowest_step"));
  if ((d?.comparableRuns ?? 0) >= 1) out.push(s("duration.compare_previous"));
  if (ctx.entity) out.push(s("duration.entity_last_run", { label: entityLabel(ctx.entity) }));
  return out;
}

function insufficientMeasurementsSuggestions(ctx: SuggestionContext): SuggestionSelection[] {
  return [
    ctx.entity
      ? s("measurements.start_validation", { label: entityLabel(ctx.entity) })
      : s("measurements.how_to_run"),
    s("measurements.what_is_recorded"),
  ];
}

function fallbackSuggestions(ctx: SuggestionContext): SuggestionSelection[] {
  switch (ctx.contextualFallbackKind) {
    case "out_of_scope":
      return [s("fallback.what_is_banza"), s("fallback.what_can_banzai_answer")];
    case "tool_unavailable":
      return [s("fallback.tool_when_available"), s("fallback.tool_alternative")];
    case "ambiguous":
      return [s("fallback.clarify_reference"), s("fallback.related_adr_rfc")];
    case "understood_data_missing":
      return [
        ctx.entity
          ? s("fallback.what_is_needed_for_entity", { label: entityLabel(ctx.entity) })
          : s("fallback.what_is_needed"),
        s("fallback.what_makes_answerable"),
      ];
    default: // insufficient_source and any other typed decline
      return [s("fallback.which_sources_answer"), s("ans.which_adr_rfc")];
  }
}

function groundedSuggestions(ctx: SuggestionContext): SuggestionSelection[] {
  if (ctx.entity) return entitySuggestions(ctx);
  // Family-specific (a comparison invites another comparison / a diagnosis its cause, etc.).
  if (ctx.questionFamily === "compare_executions") return [s("family.biggest_difference"), s("family.replay_most_recent")];
  if (ctx.questionFamily === "diagnose_failure") return [s("family.reason_code_of_result"), s("family.how_to_fix")];
  if (ctx.questionFamily === "get_reason_code") return [s("family.what_reason_code_means"), s("family.how_to_resolve_reason_code")];
  if (ctx.operationalIntent && OPERATIONAL_INTENT_SUGGESTIONS[ctx.operationalIntent]) {
    return OPERATIONAL_INTENT_SUGGESTIONS[ctx.operationalIntent].map((id) => s(id));
  }
  if (ctx.answerType && ANSWER_TYPE_SUGGESTIONS[ctx.answerType]) {
    return ANSWER_TYPE_SUGGESTIONS[ctx.answerType].map((id) => s(id));
  }
  return GENERIC_GROUNDED.map((id) => s(id));
}

/**
 * THE selection algorithm — one for both editions, and the only place a branch is taken. Returns 0–4
 * semantic selections (deterministic: same input, same output; no model, no state, no locale). An empty
 * array means "offer nothing" (e.g. a plain non-grounded reply, or a live outage).
 */
export function selectSuggestions(ctx: SuggestionContext): SuggestionSelection[] {
  // 1) Safety wins: a boundary/refusal answer gets ONLY the safe reframes — never a reframe toward the
  //    refused action. Settled first so nothing below can add an entity/verb-derived suggestion.
  if (ctx.refused || ctx.kind === "refusal" || ctx.boundary) return SAFE_REFRAME_IDS.map((id) => s(id));

  // A live outage is not an answer to build on.
  if (ctx.kind === "unavailable") return [];

  // 2) Honest "no comparable measurements" → what would make it answerable (checked BEFORE the duration
  //    branch so an operational answer with no data never borrows the measurement follow-ups).
  if (ctx.terminalKind === "insufficient_measurements") return cap(insufficientMeasurementsSuggestions(ctx));

  // 3) Operational duration measurement → per-step / comparison / entity execution.
  if (ctx.terminalKind === "operational_duration" || ctx.kind === "duration") return cap(durationSuggestions(ctx));

  // 4) A typed contextual decline → the reframing that fits the decline kind.
  if (ctx.contextualFallbackKind) return cap(fallbackSuggestions(ctx));

  // 5) A resolved ADR/RFC already renders its own document chips — don't duplicate them here.
  if (ctx.hasResolvedDocument) return [];

  // 6) A grounded answer → entity/family/type-derived continuation. A plain non-grounded reply with no
  //    special shape offers nothing (matches the M2.9A contract that an insufficient reply has no chips).
  if (!ctx.grounded && !ctx.entity) return [];

  return cap(groundedSuggestions(ctx).filter((x) => !isClaim(x)));
}

/**
 * The single entry point: select, then realize. `locale` is REQUIRED — this module has no default and
 * infers nothing from the environment, so an edition's language is always a decision made above it.
 */
export function contextualSuggestions(ctx: SuggestionContext, locale: Locale): string[] {
  return realizeSuggestions(selectSuggestions(ctx), locale);
}
