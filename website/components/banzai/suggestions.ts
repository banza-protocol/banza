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

import type { KbKind } from "@/components/home/banzaiKb";

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

// A boundary/refusal answer's ONLY suggestions — safe reframes that never point back at the refused
// action. Deliberately independent of the entity/verb so no refused act can leak in.
export const SAFE_REFRAME_SUGGESTIONS: readonly string[] = Object.freeze([
  "O que é que o BanzAI pode explicar sobre este tema?",
  "Quais são as fronteiras do BanzAI?",
  "Como se demonstra conformidade por evidência verificável?",
]);

// The M2.9A fine operational intents (kept so an answer that carries one still gets its tuned set).
const OPERATIONAL_INTENT_SUGGESTIONS: Record<string, string[]> = {
  operator_onboarding: [
    "mostra um exemplo de manifest de operador",
    "como preparo evidência de conformidade?",
    "como federar com outro operador?",
  ],
  operator_manifest: [
    "quais são os campos obrigatórios do manifest?",
    "mostra um exemplo de evidence bundle",
    "onde publico o manifest?",
  ],
  federation_how_to: [
    "como funciona trust evaluation?",
    "como consulto a revocation list?",
    "que evidência publico para federar?",
  ],
  conformance_evidence: [
    "mostra um exemplo de evidence bundle",
    "um PASS é um certificado?",
    "onde começo com o meu operador?",
  ],
  trust_evaluation: [
    "como funciona a revogação?",
    "o que é o key manifest?",
    "como federar com outro operador?",
  ],
  revocation: ["como funciona trust evaluation?", "onde está a revocation list?"],
  implementation_steps: [
    "quais são as invariantes financeiras?",
    "como funciona o ledger de dupla entrada?",
    "onde começo com o meu operador?",
  ],
  evidence_bundle: ["como demonstro conformidade?", "onde começo com o meu operador?"],
};

// Grounded answers keyed by the composition answer_type — this is present on virtually every grounded
// answer and varies per question, so it (not a single default) drives the common case.
const ANSWER_TYPE_SUGGESTIONS: Record<string, string[]> = {
  how_it_works: [
    "Como é que isto se aplica a um operador?",
    "Que ADR ou RFC define isto?",
    "Mostra um exemplo seguro.",
  ],
  capabilities_and_limits: [
    "Onde é que estão os limites disto?",
    "Que evidência prova isto?",
    "Que ADR ou RFC define isto?",
  ],
  yes_no_with_boundary: [
    "Porque é que essa é a fronteira?",
    "Que ADR ou RFC define isto?",
  ],
  comparison: [
    "Qual é a diferença na prática para um operador?",
    "Que ADR define cada um dos lados?",
  ],
  definition: [
    "Como é que isto se aplica a um operador?",
    "Que ADR ou RFC define isto?",
    "Mostra um exemplo seguro.",
  ],
  governance_explanation: [
    "Como se propõe uma alteração por RFC ou ADR?",
    "Quem decide isto na governança do protocolo?",
  ],
  financial_concept: [
    "Que invariante financeira protege isto?",
    "Como é que um operador implementa isto?",
  ],
  implementation_stack: [
    "Quais são os passos seguintes para implementar?",
    "Que evidência é que eu publico?",
  ],
  operator_zero_guidance: [
    "Mostrar o manifesto do Operador Zero",
    "Ver a conformidade do Operador Zero",
    "Ver as chaves e a confiança do Operador Zero",
  ],
  example_safe: [
    "Explica o conceito por trás deste exemplo.",
    "Que ADR ou RFC define isto?",
  ],
};

// The last-resort grounded set (only when the answer carries no distinguishing intent/type/entity).
const GENERIC_GROUNDED: string[] = [
  "Como é que isto se aplica a um operador?",
  "Que ADR ou RFC define isto?",
  "Mostra um exemplo seguro.",
];

const cap = (xs: string[], n = 4): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    const s = (x || "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= n) break;
  }
  return out;
};

// True if a suggestion looks like a normative claim (must never be surfaced) — a defensive net; the
// authored sets already avoid these words.
const isClaim = (s: string): boolean => /certific|aprova|licenc|garant/i.test(s);

const entityLabel = (e: { id: string; display: string | null }): string => (e.display || e.id).trim();

// Whether an artifact/manifest was already fetched for this entity (so we don't re-offer it).
const fetchedArtifact = (toolsRan: string[]): boolean =>
  toolsRan.some((t) => /ARTIFACT|artifact-fetcher|LIVE_ARTIFACT_FETCH/i.test(t));

// Suggestions for an answer that resolved an ecosystem ENTITY — offer that entity's other artifacts,
// dropping whatever a tool already fetched this turn (so the set reflects "what was NOT yet asked").
function entitySuggestions(ctx: SuggestionContext): string[] {
  const e = ctx.entity!;
  const label = entityLabel(e);
  const isImpl = e.type === "implementation";
  const out: string[] = [];
  if (!fetchedArtifact(ctx.toolsRan)) {
    out.push(isImpl ? `Mostrar o manifesto da implementação ${label}` : `Mostrar o manifesto de ${label}`);
  }
  // Scope-aware conformance follow-up: when the answer resolved a profile, ask about THAT profile.
  const profile = ctx.scope?.profile;
  out.push(profile ? `Ver a conformidade de ${label} no perfil ${profile}` : `Ver a conformidade de ${label}`);
  out.push(`Ver as chaves e a confiança de ${label}`);
  if (isImpl) out.push(`Reproduzir a última execução de ${label}`);
  return out;
}

function durationSuggestions(ctx: SuggestionContext): string[] {
  const d = ctx.duration;
  const out: string[] = ["Mostrar a duração por etapa"];
  if (d?.hasPerStep) out.push("Explicar a etapa mais lenta");
  if ((d?.comparableRuns ?? 0) >= 1) out.push("Comparar com a execução anterior");
  if (ctx.entity) out.push(`Mostrar a última execução de ${entityLabel(ctx.entity)}`);
  return out;
}

function insufficientMeasurementsSuggestions(ctx: SuggestionContext): string[] {
  return [
    ctx.entity ? `Iniciar a validação de ${entityLabel(ctx.entity)} para gerar medições` : "Como executo uma validação para gerar medições?",
    "O que é que o BanzAI regista durante uma validação?",
  ];
}

function fallbackSuggestions(ctx: SuggestionContext): string[] {
  switch (ctx.contextualFallbackKind) {
    case "out_of_scope":
      return ["O que é o protocolo BANZA?", "O que é que o BanzAI pode responder sobre o protocolo?"];
    case "tool_unavailable":
      return ["O que faz esta ferramenta quando está disponível?", "Que alternativa existe para obter isto?"];
    case "ambiguous":
      return ["Pode detalhar a que se refere?", "Que ADR ou RFC está relacionado com isto?"];
    case "understood_data_missing":
      return [
        ctx.entity ? `O que é preciso para responder sobre ${entityLabel(ctx.entity)}?` : "O que é preciso para responder a isto?",
        "Que evidência é que torna isto respondível?",
      ];
    default: // insufficient_source and any other typed decline
      return ["Que fontes é que respondem a isto?", "Que ADR ou RFC define isto?"];
  }
}

function groundedSuggestions(ctx: SuggestionContext): string[] {
  if (ctx.entity) return entitySuggestions(ctx);
  // Family-specific (a comparison invites another comparison / a diagnosis its cause, etc.).
  if (ctx.questionFamily === "compare_executions") return ["Explicar a maior diferença entre as execuções", "Reproduzir a execução mais recente"];
  if (ctx.questionFamily === "diagnose_failure") return ["Qual foi o reason code deste resultado?", "Como é que se corrige isto?"];
  if (ctx.questionFamily === "get_reason_code") return ["O que significa este reason code?", "Como é que se resolve este reason code?"];
  if (ctx.operationalIntent && OPERATIONAL_INTENT_SUGGESTIONS[ctx.operationalIntent]) {
    return OPERATIONAL_INTENT_SUGGESTIONS[ctx.operationalIntent];
  }
  if (ctx.answerType && ANSWER_TYPE_SUGGESTIONS[ctx.answerType]) return ANSWER_TYPE_SUGGESTIONS[ctx.answerType];
  return GENERIC_GROUNDED;
}

// The single entry point. Returns 0–4 executable, per-answer suggestions (deterministic — same input
// yields the same output, no model, no state). An empty array means "offer nothing" (e.g. a plain
// non-grounded reply, or a live outage) — the caller renders no CONTINUAR block in that case.
export function contextualSuggestions(ctx: SuggestionContext): string[] {
  // 1) Safety wins: a boundary/refusal answer gets ONLY the safe reframes — never a reframe toward the
  //    refused action. Settled first so nothing below can add an entity/verb-derived suggestion.
  if (ctx.refused || ctx.kind === "refusal" || ctx.boundary) return [...SAFE_REFRAME_SUGGESTIONS];

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

  return cap(groundedSuggestions(ctx).filter((s) => !isClaim(s)));
}
