// BanzAI public adapter (ADR-038, ADR-036/045/046/047). RUST_WRAPPER_ONLY.
//
// This is I/O glue, not an engine. Public BanzAI answers come from the live, Rust-controlled
// `banzai-api` backend running local Qwen inference (llama.cpp, on-host) — reached SAME-ORIGIN
// via `POST /banzai/ask` (nginx proxies that single path to the internal service; llama.cpp and
// PostgreSQL are never exposed). The Rust engine owns retrieval, the compact prompt, injection
// defence, the post-response validator, limits and the degraded/mock fallback; this file only
// sends the question and maps the JSON response. Reasoning is disabled server-side (no <think>);
// nothing leaves the host (external_model_called=false). No WASM, no client-side model.

import { contextualSuggestions, type SuggestionContext } from "@/components/banzai/suggestions";

export type CiteLink = { label: string; href: string };

// M2.13D — a RICH, presentable source (citation). The UI renders these in a dedicated "Fontes usadas"
// block, visually separate from the main answer and from the quick-prompt suggestions. `href` is a
// SAFE link (GitHub blob or internal) or null when the path must not be linked (sensitive/excluded).
export type Source = {
  id: string;
  title: string;
  path: string;
  repo: string; // "banza-protocol/banza" | "banza-protocol/banzai"
  category: string; // repo-index category, or "" when the backend classified no document class
  /** Document CLASS as declared by the source registry ("adr" | "spec" | "reference" | …), or "". */
  kind: string;
  href: string | null; // safe link, or null when the path must not be linked
};

// M2.13D — paths that must NEVER be turned into a link (secrets, dumps, build output, or the retired
// apex surface as an ACTIVE endpoint). Presentation-safety mirror of the indexer's exclusions.
const UNLINKABLE = [
  ".env",
  "id_ed25519",
  "id_rsa",
  "private",
  "secret",
  ".pem",
  ".key",
  "credential",
  "password",
  "/dump",
  "node_modules/",
  "/target/",
  "/pkg/",
  ".wasm",
];

// M2.13D — build a SAFE source link. Preference (Part 5): repo + path on GitHub (branch `main`, since
// the API carries no per-source commit yet). Returns null when the path is sensitive/excluded, a bare
// active `/operador-zero` endpoint, empty, or a URL. Globbed registry paths (…/ADR-001-*.md) link to
// the containing directory (tree), never a guessed file.
export function safeSourceHref(rawPath: string, repo: string): string | null {
  let p = String(rawPath || "").trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return null; // never re-link an external URL as a source file
  const low = p.toLowerCase();
  if (UNLINKABLE.some((x) => low.includes(x))) return null;
  // Never present the retired apex route as an active endpoint/source link.
  if (low.includes("/operador-zero")) return null;
  const gh = `https://github.com/${repo}/blob/main`;
  const ghTree = `https://github.com/${repo}/tree/main`;
  // Cross-repo annotation like "engines/banzai-core/ (banza-protocol/banzai)" — strip the parenthetical.
  p = p.replace(/\s*\(.*$/, "").trim().replace(/^\/+/, "");
  if (!p) return null;
  if (p.includes("*")) {
    const dir = p.slice(0, p.lastIndexOf("/"));
    return dir ? `${ghTree}/${dir}` : null;
  }
  if (p.endsWith("/")) return `${ghTree}/${p.replace(/\/$/, "")}`;
  return `${gh}/${p}`;
}

// "unavailable" = the backend was unreachable/timed out (an OUTAGE) — distinct from "uncertain"
// (a genuine "insufficient sources" grounding outcome), so the UI never conflates the two.
// "duration" (ADR-036) = an operational duration/metric answer (meta.terminal_kind ===
// "operational_duration"); its numbers live in KbAnswer.duration and render as a typed block.
export type KbKind = "answer" | "refusal" | "uncertain" | "unavailable" | "duration";

// ADR-036 — the operational duration/metric payload (meta.duration), snake_case→camelCase. The UI
// renders ONLY the values present here; it never invents or hardcodes a number. A single run has
// `measureType === "observação"` (one observation) — never presented as an average.
export type KbDuration = {
  measureType: string; // "observação" | "média" | "mediana" | "percentil"
  comparableRuns: number;
  profile: string | null;
  environment: string | null;
  protocolVersion: string | null;
  implementationId: string | null;
  latestMs: number | null;
  medianMs: number | null;
  p95Ms: number | null;
  avgMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  perStep: { stepId: string; label: string; medianMs: number | null; maxMs: number | null; n: number }[];
  observedFrom: string | null;
  observedTo: string | null;
  orchestratorVersion: string | null;
  reproductionsExcluded: number;
  percentileMethod: string | null;
};

export type EvidenceResult = {
  title: string;
  url: string;
  excerpt: string;
  score: number;
  reasons: string[];
};
export type EvidenceBundle = {
  query: string;
  results: EvidenceResult[];
  citations: string[];
  confidence: number;
  confidenceLabel: string;
  limits: string[];
};

// Increment 9 (§24) — the per-answer INTERFACE TRANSPARENCY layer. A safe, typed projection of what
// the engine ACTUALLY computed for this answer, read verbatim from the /ask envelope (the Inc.8
// `observability` record + `scope_resolution` + `reasoning_trace` + the safe top-level telemetry). Every
// field is optional: it is populated ONLY when the engine produced it and is null/empty/[] otherwise —
// the UI renders each field only when present and never fabricates a placeholder. Nothing here is a
// secret/PII/prompt/raw-output (the observability record is already allowlisted + scrubbed server-side).
export type TransparencyTool = { kind: string; outcome: string | null; durationMs: number | null };
export type KbTransparency = {
  // How the question was understood: the accented canonical forms (typo/intent recovery), the coarse
  // routing intent, the composition answer_type, the resolved question family, and detected sub-intents.
  correctionDisplay: string[];
  intent: string | null;
  answerType: string | null;
  questionFamily: string | null;
  subIntents: string[];
  // The resolved ecosystem entity + its scope (profile / environment / protocol version / …).
  entity: { id: string; type: string | null; display: string | null; operatorId: string | null; implementationId: string | null } | null;
  scope: { profile: string | null; environment: string | null; protocolVersion: string | null; protocolScope: string | null; artifactType: string | null } | null;
  // The tools that ran (plan + per-tool outcome + duration), and the source-type/authority provenance.
  tools: TransparencyTool[];
  sourceCount: number;
  sourceTypes: { label: string; count: number }[];
  authority: { kind: string | null; scope: string | null; requirement: string | null } | null;
  // Freshness of a LIVE-fetched artifact (observed_at + content digest + canonical origin).
  observedAt: string | null;
  sha256: string | null;
  canonicalOrigin: string | null;
  // How a number was derived (aggregation method + sample size + typed-claim count + observation period).
  calculation: { method: string | null; sampleSize: number | null; count: number | null; period: string | null } | null;
  // Runtime truth for THIS answer: engine, index/orchestrator version, whether a model was called, the
  // confidence BAND (never the raw number), the claim/citation verification verdicts, the post-synthesis
  // validation status and the total measured duration.
  engine: string | null;
  runtimeVersion: string | null;
  modelCalled: boolean | null;
  confidenceBand: string | null;
  claimVerification: { ok: boolean | null; errors: number } | null;
  citationVerification: { ok: boolean | null; errors: number } | null;
  validationStatus: string | null;
  totalDurationMs: number | null;
  // Honest limitation lines (degraded mode, insufficient measurements, tool unavailable, boundary,
  // non-grounded, a failed verification) — empty when the answer carries none.
  limitations: string[];
};

export type KbAnswer = {
  // M2.10A — present when the answer resolved an explicitly named protocol document. The UI shows
  // it as "Documento resolvido"; `documentNotFound` marks a named document that does not exist.
  resolvedDocument?: {
    id: string;
    type: string | null;
    title: string | null;
    path: string | null;
    status: string | null;
  } | null;
  documentNotFound?: boolean;
  // M2.10B — which facet of the record was answered, and whether the answer hit the completion cap.
  documentMode?: string | null;
  documentTruncated?: boolean;
  intent: string;
  kind: KbKind;
  text: string;
  cites: string[];
  links: CiteLink[];
  // M2.13D — rich, presentable sources for the dedicated "Fontes usadas" block (separate from `links`,
  // which stays for back-compat). Each carries a safe href (or null), category and repo/path.
  sources: Source[];
  limits?: string[];
  followUps?: string[];
  evidence?: EvidenceBundle;
  engine?: string;
  engineVersion?: string;
  llmCalls?: number;
  externalModelCalled?: boolean;
  degraded?: boolean;
  // Per-answer execution-path label (ADR-036 transparency): proves whether THIS answer was
  // generated by the local model, or came from the deterministic / insufficient / degraded /
  // outage path. Shown next to the answer so the global "Qwen local" chip never stands in for it.
  status?: string;
  localModelCalled?: boolean;
  contextUsed?: boolean;
  // M2.9A: the backend's fine operational intent (operator_onboarding, federation_how_to, …) — drives
  // the contextual suggestion chips. Never a normative claim.
  operationalIntent?: string;
  // M2.9B: guided-journey echo from the backend (it RE-DERIVES the safe context in Rust — it never
  // trusts the raw browser state). Presentation-only; never a normative/certification claim.
  currentStep?: string;
  journeyStep?: string;
  journeyContextUsed?: boolean;
  nextRecommendedAction?: string;
  // M2.9C: safe upload telemetry echoed by the backend (counts only — never the file body).
  uploadedArtifactsUsed?: boolean;
  uploadedArtifactsCount?: number;
  // M2.18B.5 — typo tolerance / intent recovery (safe subset from the typed public trace; NEVER scores or
  // edit distance). `recoveryBand` ∈ exact|high_confidence|ambiguous. `correctionDisplay` are the accented
  // canonical forms to show discreetly ("Interpretado como …"); `correctionClarification` the options to
  // offer when the input is ambiguous ("Pretendia dizer …?"). Presentation only.
  recoveryBand?: string;
  correctionDisplay?: string[];
  correctionClarification?: string[];
  // ADR-036 — operational duration/metric. `answerType`/`terminalKind` echo the backend contract
  // (answer_type/terminal_kind); `duration` carries the measured numbers for the typed block. All are
  // present only for an operational answer. `terminalKind === "insufficient_measurements"` is an HONEST
  // "no comparable data / telemetry disabled" outcome — NOT the generic "Evidência insuficiente" banner.
  answerType?: string;
  terminalKind?: string;
  duration?: KbDuration;
  // Increment 9 (§24) — the per-answer interface-transparency projection (see KbTransparency). Present
  // whenever the envelope carried any transparency-worthy signal; undefined for a bare outage.
  transparency?: KbTransparency;
  // BZCI-2/6 (§2) — the SAFE, technical-only conversation_context the backend returns for THIS turn. The
  // client stores it and carries it back on the NEXT turn so the Rust reference resolver can inherit the
  // subject/intent/referent (the ADR→RFC→"qual a diferença?" chain). Never free prose — ids/enums/labels
  // only. `resolvedSubject`/`turnType` are the typed-resolution trace shown discreetly in the inspector.
  conversationContext?: ConversationState;
  resolvedSubject?: string;
  turnType?: string;
};

// BZCI-2 (§2) — the typed conversational state the client carries verbatim between turns. It mirrors the
// backend's whitelisted conversation_context: only safe technical labels (ids/enums/a short subject), never
// prose, PII or secrets. It is a REFERENT the engine re-resolves against live catalogues — never a fact source.
export type ConversationState = {
  operator_id?: string;
  implementation_id?: string;
  execution_id?: string;
  previous_execution_id?: string;
  artifact?: string;
  profile?: string;
  environment?: string;
  protocol_version?: string;
  last_intent?: string;
  last_family?: string;
  last_subject?: string;
  last_subject_kind?: string;
  last_document_id?: string;
  last_metric?: string;
  observed_at?: string;
};

// A prior conversation turn the caller may pass so the backend can resolve anaphoric follow-ups
// ("dá exemplo aqui", "e em JSON?"). Only the user's prior questions are used for retrieval; nothing
// is stored server-side. Keep this short (the backend caps it to the last 2 user turns).
export type ChatTurn = { role: "user" | "ai"; text: string };

// Same-origin backend endpoint (nginx → banzai-api:8091/ask on the apex; no subdomain).
const ASK_URL = "/banzai/ask";
const ASK_TIMEOUT_MS = 65000; // slightly above the backend's 60s local-inference timeout

// M2.14E — professional public messages for availability conditions. NONE exposes internal
// architecture (workers, locks, semaphores, llama, "one request at a time", CPU). The backend also
// returns a `public_message` (Rust single source of truth); we prefer it when present and fall back
// to these constants when there is no response body (network error / abort). Kept phrase-free and in
// sync with engines/banzai-api-kb/queue_policy.rs.
const PUBLIC_MESSAGES: Record<string, string> = {
  busy: "O BanzAI está a processar muitos pedidos neste momento. Tenta novamente dentro de alguns segundos.",
  timeout: "A resposta demorou mais do que o esperado. Tenta novamente ou reformula a pergunta.",
  rate_limited: "Muitos pedidos em pouco tempo. Aguarda alguns segundos e tenta novamente.",
  unavailable: "O BanzAI está temporariamente indisponível. Tenta novamente dentro de instantes.",
};
const STATUS_LABEL: Record<string, string> = {
  busy: "BanzAI ocupado · muitos pedidos",
  timeout: "Tempo de resposta excedido",
  rate_limited: "Demasiados pedidos",
  unavailable: "Temporariamente indisponível",
};
type OutageKind = "busy" | "timeout" | "rate_limited" | "unavailable";

// M2.18B.6 — a degraded (safe-fallback) answer must state its REAL cause, never a blanket
// "Qwen indisponível". Keyed by the backend's `fallback_reason` (pipeline.js synthesisFallbackReason +
// the queue/model catch). Any reason not listed falls back to the honest generic "erro temporário".
const DEGRADED_STATUS: Record<string, string> = {
  local_inference_unavailable: "Fallback seguro · modelo indisponível · sem chamada externa",
  local_inference_timeout: "Fallback seguro · tempo limite excedido · sem chamada externa",
  synthesis_capacity_tripped: "Fallback seguro · capacidade temporariamente ocupada · sem chamada externa",
  synthesis_output_unvalidated: "Fallback seguro · resposta não validada · sem chamada externa",
  synthesis_task_incomplete: "Fallback seguro · resposta incompleta para a tarefa · sem chamada externa",
  intent_deferred: "Resposta determinística a partir das fontes · sem chamada ao modelo",
};
const DEGRADED_STATUS_DEFAULT = "Fallback seguro · erro temporário · sem chamada externa";
// The matching limits note (shown under the answer). All keep "modo degradado" wording (the mode IS
// degraded) but state the specific cause — so it is never falsely "o modelo local esteve indisponível".
const DEGRADED_LIMIT: Record<string, string> = {
  local_inference_unavailable:
    "Resposta em modo degradado: o modelo local esteve indisponível; resposta determinística a partir das fontes do protocolo.",
  local_inference_timeout:
    "Resposta em modo degradado: o modelo local excedeu o tempo limite; resposta determinística a partir das fontes do protocolo.",
  synthesis_capacity_tripped:
    "Resposta em modo degradado: capacidade temporariamente ocupada; resposta determinística a partir das fontes do protocolo.",
  synthesis_output_unvalidated:
    "Resposta em modo degradado: a síntese do modelo não passou a validação factual; resposta determinística a partir das fontes do protocolo.",
  synthesis_task_incomplete:
    "Resposta em modo degradado: a síntese não cumpriu integralmente a forma pedida (ex.: exemplo/procedimento); resposta determinística a partir das fontes do protocolo.",
  intent_deferred:
    "Resposta determinística a partir das fontes do protocolo.",
};
const DEGRADED_LIMIT_DEFAULT =
  "Resposta em modo degradado: ocorreu um erro temporário; resposta determinística a partir das fontes do protocolo.";
// M2.19G.5C (ADR-036) — the mandatory post-synthesis authority validator blocked the model answer; the
// backend degraded to the deterministic grounding. The reject reason is a stable enum in the
// `post_validation_*` FAMILY (authority/leak rule, unsupported-claim, or contradiction), so a single
// faithful label covers the whole family — never the generic "erro temporário" default.
const POST_VALIDATION_STATUS =
  "Fallback seguro — resposta não validada (limite de autoridade) — sem chamada externa";
const POST_VALIDATION_LIMIT =
  "Resposta em modo degradado: a resposta do modelo não passou a validação de autoridade (ADR-036); resposta determinística a partir das fontes do protocolo.";

// ADR-036 — an operational duration question with NO comparable data (or telemetry disabled). This is a
// distinct, honest outcome (backend meta.terminal_kind/fallback_reason === "insufficient_measurements"):
// it must NEVER borrow the generic "Evidência insuficiente" wording. The answer body is an honest
// request-oriented paragraph (backend-provided); this is only the short per-answer status line.
const INSUFFICIENT_MEASUREMENTS_STATUS = "Sem medições suficientes · sem chamada ao modelo";

// A safe, non-technical availability answer — never a stack trace, never internal architecture.
function outage(kind: OutageKind, publicMessage?: string): KbAnswer {
  const text = (publicMessage && publicMessage.trim()) || PUBLIC_MESSAGES[kind] || PUBLIC_MESSAGES.unavailable;
  return {
    intent: "unavailable",
    kind: "unavailable",
    text,
    cites: [],
    links: [],
    sources: [],
    status: STATUS_LABEL[kind] || STATUS_LABEL.unavailable,
  };
}

// Generic outage (network error / abort / no body).
function unavailable(): KbAnswer {
  return outage("unavailable");
}

// ── Increment 9 (§24) — build the per-answer transparency projection from the /ask envelope ──────────
// Small, defensive accessors — the envelope is untrusted JSON; anything shaped wrong reads as null.
const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const asStr = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const asBool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
const asNum = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const asStrArr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []);

// A category → readable PT source-type label (mirrors SourceBlock's category vocabulary).
const SOURCE_TYPE_LABEL: Record<string, string> = {
  "legal-license": "Licença",
  reference: "Referência",
  decision: "Decisão",
  normative: "Norma",
  implementation: "Código",
  banzai: "Código",
  "banzai-runtime": "Código",
  website: "Website",
  "guard-ci": "Guard/CI",
  "operator-zero": "Operador Zero",
  report: "Relatório",
  "security-boundary": "Segurança",
  infra: "Infra",
};

// Build KbTransparency from the envelope. Reads ONLY the observability record, scope_resolution,
// reasoning_trace and the safe top-level telemetry — never the answer body, prompt or raw output. Returns
// undefined when the envelope carried no transparency-worthy signal (e.g. a bare live outage).
export function buildTransparency(
  o: Record<string, unknown>,
  richSources: Source[],
  ctx: { degraded: boolean; fallbackReason: string; grounded: boolean; refused: boolean; terminalKind: string; isInsufficientMeasurements: boolean; contextualFallbackKind: string | null },
): KbTransparency | undefined {
  const obs = asObj(o.observability);
  const rt = asObj(o.reasoning_trace);
  const sr = asObj(o.scope_resolution);
  const durObj = asObj(o.duration);

  // ── interpretation (how the question was understood) ──
  const correctionDisplay = asStrArr(rt.correction_display).length ? asStrArr(rt.correction_display) : asStrArr(obs.correction_display);
  const intent = asStr(obs.intent) ?? asStr(o.intent);
  const answerType = asStr(o.answer_type) ?? asStr(obs.answer_type);
  const questionFamily = asStr(o.question_family);
  const subIntents = asStrArr(obs.sub_intents);

  // ── entity + scope ──
  const obsEntities = asObj(obs.entities);
  const entityId = asStr(sr.entity_id) ?? asStr(obsEntities.entity_id);
  const entity = entityId
    ? {
        id: entityId,
        type: asStr(sr.entity_type) ?? asStr(obsEntities.entity_type),
        display: asStr(sr.entity_display),
        operatorId: asStr(sr.operator_id) ?? asStr(obsEntities.operator_id),
        implementationId: asStr(sr.implementation_id) ?? asStr(obsEntities.implementation_id),
      }
    : null;
  const obsScope = asObj(obs.scope);
  const scopeRaw = {
    profile: asStr(obsScope.profile) ?? asStr(sr.artifact_profile),
    environment: asStr(obsScope.environment) ?? asStr(sr.artifact_environment),
    protocolVersion: asStr(obsScope.protocol_version) ?? asStr(sr.artifact_protocol_version),
    protocolScope: asStr(obsScope.protocol_scope) ?? asStr(sr.protocol_scope),
    artifactType: asStr(obsScope.artifact_type) ?? asStr(sr.artifact_type),
  };
  const scope = Object.values(scopeRaw).some(Boolean) ? scopeRaw : null;

  // ── tools that ran (plan + per-tool outcome + duration) ──
  const toolPlan = asStrArr(obs.tool_plan);
  const toolOutcomes = asObj(obs.tool_outcomes);
  const toolDurations = asObj(obs.tool_durations);
  const tools: TransparencyTool[] = toolPlan.map((kind) => ({
    kind,
    outcome: asStr(toolOutcomes[kind]),
    durationMs: asNum(toolDurations[kind]),
  }));

  // ── source-type / authority provenance ──
  const typeCounts = new Map<string, number>();
  for (const s of richSources) {
    const label = SOURCE_TYPE_LABEL[s.category] || (s.category ? s.category : "Fonte");
    typeCounts.set(label, (typeCounts.get(label) || 0) + 1);
  }
  const sourceTypes = [...typeCounts.entries()].map(([label, count]) => ({ label, count }));
  const authorityRaw = {
    kind: asStr(sr.authority_kind),
    scope: asStr(sr.authority_scope),
    requirement: asStr(sr.authority_requirement),
  };
  const authority = Object.values(authorityRaw).some(Boolean) ? authorityRaw : null;

  // ── freshness of a live-fetched artifact ──
  const observedAt = asStr(sr.artifact_observed_at);
  const sha256 = asStr(sr.artifact_sha256);
  const canonicalOrigin = asStr(sr.canonical_origin);

  // ── calculation / measurement derivation ──
  const calc = asObj(obs.calculations);
  const observedFrom = asStr(durObj.observed_from);
  const observedTo = asStr(durObj.observed_to);
  const period = observedFrom || observedTo ? `${observedFrom ?? "—"} – ${observedTo ?? "—"}` : null;
  const calcMethod = asStr(calc.aggregation_method) ?? asStr(durObj.aggregation_method);
  const sampleSize = asNum(calc.sample_size);
  const calcCount = asNum(calc.count);
  const calculation =
    calcMethod || sampleSize != null || (calcCount != null && calcCount > 0) || period
      ? { method: calcMethod, sampleSize, count: calcCount, period }
      : null;

  // ── runtime truth ──
  const engine = asStr(o.engine_state);
  const runtimeVersion = asStr(o.index_version) ?? asStr(durObj.orchestrator_version);
  const modelCalled = asBool(obs.model_called) ?? asBool(o.local_model_called);
  const confidenceBand = asStr(obs.confidence) ?? asStr(rt.confidence_band);
  const cv = asObj(obs.claim_verification);
  const claimVerification = asBool(cv.ok) !== null ? { ok: asBool(cv.ok), errors: asNum(cv.errors) ?? 0 } : null;
  const ctv = asObj(obs.citation_verification);
  const citationVerification = asBool(ctv.ok) !== null ? { ok: asBool(ctv.ok), errors: asNum(ctv.errors) ?? 0 } : null;
  const validationStatus = asStr(o.validation_status);
  const totalDurationMs = asNum(obs.total_duration_ms) ?? asNum(o.latency_ms) ?? asNum(o.elapsed_ms);

  // ── honest limitations ──
  const limitations: string[] = [];
  // A "recusa segura" limitation is honest ONLY when the answer was ACTUALLY refused — a genuine safety
  // refusal (ctx.refused) or a boundary that served NO grounded answer. A boundary-FLAGGED topic that
  // still returned a grounded answer (e.g. an Operador Zero explanation under critical_boundary) was
  // answered, not refused, so it must NOT be mislabelled as a refusal (Inc.9-FIX1).
  if (ctx.refused || (asBool(rt.boundary_detected) && !ctx.grounded)) limitations.push("Pedido fora das fronteiras do BanzAI — recusa segura.");
  if (ctx.degraded)
    limitations.push(
      ctx.fallbackReason.startsWith("post_validation")
        ? "Modo degradado — a resposta do modelo não passou a validação de autoridade; resposta determinística a partir das fontes."
        : "Modo degradado — resposta determinística a partir das fontes do protocolo.",
    );
  if (ctx.isInsufficientMeasurements) limitations.push("Sem medições comparáveis suficientes (ou telemetria desativada) para esta pergunta.");
  if (ctx.contextualFallbackKind) limitations.push(`Pergunta compreendida mas sem dados/fonte para responder (${ctx.contextualFallbackKind}).`);
  if (!ctx.grounded && !ctx.refused && !ctx.isInsufficientMeasurements && !ctx.contextualFallbackKind) limitations.push("Evidência insuficiente para uma resposta fundamentada.");
  if (claimVerification && claimVerification.ok === false) limitations.push("Uma verificação de alegação não passou nesta resposta.");

  const t: KbTransparency = {
    correctionDisplay,
    intent,
    answerType,
    questionFamily,
    subIntents,
    entity,
    scope,
    tools,
    sourceCount: richSources.length,
    sourceTypes,
    authority,
    observedAt,
    sha256,
    canonicalOrigin,
    calculation,
    engine,
    runtimeVersion,
    modelCalled,
    confidenceBand,
    claimVerification,
    citationVerification,
    validationStatus,
    totalDurationMs,
    limitations,
  };

  // Return undefined only when NOTHING transparency-worthy was produced (a bare outage-like envelope).
  const hasContent =
    correctionDisplay.length > 0 ||
    intent !== null ||
    answerType !== null ||
    questionFamily !== null ||
    entity !== null ||
    scope !== null ||
    tools.length > 0 ||
    richSources.length > 0 ||
    authority !== null ||
    observedAt !== null ||
    calculation !== null ||
    engine !== null ||
    confidenceBand !== null ||
    claimVerification !== null ||
    validationStatus !== null ||
    totalDurationMs !== null ||
    limitations.length > 0;
  return hasContent ? t : undefined;
}

// Map the banzai-api /ask JSON to the KbAnswer shape the UI already renders.
export function mapAskResponse(d: unknown): KbAnswer {
  const o = (d && typeof d === "object" ? (d as Record<string, unknown>) : {}) as Record<string, unknown>;
  const sources = Array.isArray(o.sources) ? (o.sources as Array<Record<string, unknown>>) : [];
  const grounded = Boolean(o.grounded);
  const meta = (o.meta && typeof o.meta === "object" ? (o.meta as Record<string, unknown>) : {}) as Record<string, unknown>;
  // Degraded = the trunk could not publish a validated model answer this request; the backend served a
  // safe deterministic grounding. It signals this via meta.degraded (set on EVERY such path) and a
  // specific fallback_reason; the reason drives a FAITHFUL label (never a blanket "Qwen indisponível").
  const fallbackReason = String((meta.fallback_reason ?? o.fallback_reason) ?? "");
  const degraded = Boolean(meta.degraded) || fallbackReason === "local_inference_unavailable";

  // ADR-036 — operational duration/metric answer. `terminal_kind`/`answer_type` classify it; a SUCCESS
  // carries meta.duration (the measured numbers), an INSUFFICIENT carries terminal_kind/fallback_reason
  // "insufficient_measurements" (an honest "no comparable data / telemetry disabled" outcome, NOT the
  // generic insufficient-evidence banner). Only values PRESENT here are mapped — nothing is invented.
  // The /ask envelope is FLAT: server.js surfaces these at top level (o.*); the pipeline unit-test shape
  // nests them under meta.*. Read meta.* first, fall back to top-level o.* — both resolve correctly.
  const pick = (k: string) => (meta[k] !== undefined ? meta[k] : (o as Record<string, unknown>)[k]);
  const terminalKind = typeof pick("terminal_kind") === "string" ? (pick("terminal_kind") as string) : "";
  const answerType = typeof pick("answer_type") === "string" ? (pick("answer_type") as string) : "";
  const isDuration = terminalKind === "operational_duration";
  const isInsufficientMeasurements =
    terminalKind === "insufficient_measurements" || fallbackReason === "insufficient_measurements";
  const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const durationRaw = pick("duration");
  const durationMeta =
    durationRaw && typeof durationRaw === "object" ? (durationRaw as Record<string, unknown>) : null;
  const duration: KbDuration | undefined = durationMeta
    ? {
        measureType: typeof durationMeta.measure_type === "string" ? durationMeta.measure_type : "",
        comparableRuns: Number(durationMeta.comparable_runs) || 0,
        profile: typeof durationMeta.profile === "string" ? durationMeta.profile : null,
        environment: typeof durationMeta.environment === "string" ? durationMeta.environment : null,
        protocolVersion: typeof durationMeta.protocol_version === "string" ? durationMeta.protocol_version : null,
        implementationId: typeof durationMeta.implementation_id === "string" ? durationMeta.implementation_id : null,
        latestMs: numOrNull(durationMeta.latest_ms),
        medianMs: numOrNull(durationMeta.median_ms),
        p95Ms: numOrNull(durationMeta.p95_ms),
        avgMs: numOrNull(durationMeta.avg_ms),
        minMs: numOrNull(durationMeta.min_ms),
        maxMs: numOrNull(durationMeta.max_ms),
        perStep: (Array.isArray(durationMeta.per_step) ? (durationMeta.per_step as Array<Record<string, unknown>>) : []).map(
          (s) => ({
            stepId: typeof s.step_id === "string" ? s.step_id : String(s.step_id ?? ""),
            label: typeof s.label === "string" ? s.label : String(s.label ?? ""),
            medianMs: numOrNull(s.median_ms),
            maxMs: numOrNull(s.max_ms),
            n: Number(s.n) || 0,
          }),
        ),
        observedFrom: typeof durationMeta.observed_from === "string" ? durationMeta.observed_from : null,
        observedTo: typeof durationMeta.observed_to === "string" ? durationMeta.observed_to : null,
        orchestratorVersion:
          typeof durationMeta.orchestrator_version === "string" ? durationMeta.orchestrator_version : null,
        reproductionsExcluded: Number(durationMeta.reproductions_excluded) || 0,
        percentileMethod:
          typeof durationMeta.percentile_method === "string" ? durationMeta.percentile_method : null,
      }
    : undefined;
  // Defence-in-depth: the Rust validator already blocks chain-of-thought, but never render a
  // <think> block even if the backend ever regressed — strip paired tags, an unterminated
  // trailing block, and any stray tag, client-side too.
  const text = String(o.answer ?? "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/i, "")
    .replace(/<\/?think>/gi, "")
    .trim();

  const cites = sources.map((s) => String(s.id ?? "")).filter(Boolean);
  const links: CiteLink[] = sources
    .map((s) => {
      const id = String(s.id ?? "");
      const title = String(s.title ?? "");
      return { label: title ? `${id} · ${title}` : id, href: "/referencia" };
    })
    .filter((l) => l.label);

  // M2.13D — rich, presentable sources for the dedicated "Fontes usadas" block. Each gets a safe href
  // (GitHub blob/tree at main, or null for sensitive/excluded paths and the retired /operador-zero
  // route), plus its repo + category so the UI can label + colour it distinctly from the answer body.
  const richSources: Source[] = sources
    .map((s) => {
      const id = String(s.id ?? "");
      const title = String(s.title ?? "");
      const path = String(s.path ?? "");
      const repo = String(s.repo ?? "banza-protocol/banza");
      // NOT `?? "reference"`. That default was the whole defect: with no class on this path, every curated
      // source — an ADR, a specification, a glossary — rendered as REFERÊNCIA, and the label that belongs
      // to the canonical Reference was quietly attached to everything else. An unknown class stays unknown.
      const category = String(s.category ?? "");
      const kind = String(s.kind ?? "");
      return { id, title, path, repo, category, kind, href: path ? safeSourceHref(path, repo) : null };
    })
    .filter((s) => s.id);

  // M2.14C (Part 5/13) — DEFENSE-IN-DEPTH for the global answer rendering contract. The server-side
  // normalizeBanzaiAnswer already strips any in-body source block; this is a client fallback so a
  // cached/legacy answer can never render a source line inside the body. It removes any citation label
  // ("Fonte(s):", "Fontes citáveis:", "Fontes usadas:", "Sources:", "Citations:", "Referências:") and
  // everything after it to the end (source blocks always trail the answer). Prose that merely mentions
  // "fonte" WITHOUT a colon is untouched. Only applied when a dedicated source block is rendered.
  const bodyText =
    richSources.length > 0
      ? text
          .replace(
            /\n?[ \t>*_-]*(?:Fontes?\s*(?:cit[aá]veis|usad[ao]s)?|Sources?|Citations?|Refer[eê]ncias?)\s*:[\s\S]*$/i,
            ""
          )
          .trim()
      : text;

  const limits: string[] = [];
  if (degraded) {
    limits.push(
      fallbackReason.startsWith("post_validation")
        ? POST_VALIDATION_LIMIT
        : DEGRADED_LIMIT[fallbackReason] || DEGRADED_LIMIT_DEFAULT,
    );
  }

  // Per-answer execution path (from the backend's safe telemetry) → a short technical label.
  // localCalled is TRUE only when the on-host model generated THIS answer (never on a cache hit).
  const localCalled = Boolean(o.local_model_called);
  const cachedLocal = Boolean(o.cached_local);
  const contextUsed = Boolean(o.conversation_context_used);
  const postValidation = String(o.fallback_reason ?? "").startsWith("post_validation");
  const srcN = Number(o.sources_count) || cites.length;
  const ms = Number(o.latency_ms ?? o.elapsed_ms) || 0;
  const secs = ms >= 100 ? `${(ms / 1000).toFixed(1)}s` : null;
  const fontes = `${srcN} font${srcN === 1 ? "e" : "es"}`;
  const ctx = contextUsed ? " · com contexto" : "";
  // M2.10A — documentary resolution. `doc` is set only when a named protocol document was actually
  // found; `docNotFound` marks a document the operator named that does not exist.
  const docNotFound = Boolean(o.document_not_found);
  const resolvedId = typeof o.resolved_document_id === "string" ? o.resolved_document_id : null;
  const doc =
    resolvedId && !docNotFound
      ? {
          id: resolvedId,
          type: typeof o.resolved_document_type === "string" ? o.resolved_document_type : null,
          title: typeof o.resolved_document_title === "string" ? o.resolved_document_title : null,
          path: typeof o.resolved_document_path === "string" ? o.resolved_document_path : null,
          status: typeof o.resolved_document_status === "string" ? o.resolved_document_status : null,
        }
      : null;
  const docTag = doc ? " · documento resolvido" : "";
  const docMode = typeof o.document_mode === "string" ? o.document_mode : null;
  const docTruncated = Boolean(o.document_answer_truncated);
  let status: string;
  if (docNotFound) {
    // The document does not exist, so no model ran — the label must not claim otherwise.
    status = "Documento não encontrado · sem chamada ao modelo";
  } else if (localCalled) {
    status = `Gerado por Qwen local${docTag} · chamadas externas: 0 · ${fontes}${secs ? ` · ${secs}` : ""}${ctx}`;
  } else if (degraded) {
    status = fallbackReason.startsWith("post_validation")
      ? POST_VALIDATION_STATUS
      : DEGRADED_STATUS[fallbackReason] || DEGRADED_STATUS_DEFAULT;
  } else if (cachedLocal) {
    // A previously Qwen-generated answer served from cache — honest that no NEW call was made.
    status = `Resposta em cache (Qwen local)${docTag} · sem nova chamada ao modelo · ${fontes}`;
  } else if (postValidation) {
    // The model was called but its output failed the safety validator and was replaced.
    status = `Resposta determinística · resposta do modelo substituída pela validação · ${fontes}`;
  } else if (isInsufficientMeasurements) {
    // ADR-036 — honest, distinct from "Evidência insuficiente": there simply is no comparable
    // telemetry (or it is disabled), which is a truthful statement about operational data, not sources.
    status = INSUFFICIENT_MEASUREMENTS_STATUS;
  } else if (!grounded) {
    status = "Evidência insuficiente · sem chamada ao modelo";
  } else {
    status = `Resposta determinística · sem chamada ao modelo · ${fontes}`;
  }

  // M2.9A: the backend's fine operational intent + contextual suggestions (only for grounded answers).
  const operationalIntent = typeof o.intent === "string" ? (o.intent as string) : "";
  // A genuine refusal — decided in Rust. It gets the "RECUSA SEGURA" badge, the honest "recusa segura"
  // limitation and ONLY safe reframes. Three cases (Inc.9-FIX1): (1) the deterministic safety_refusal;
  // (2) an action/publication/safety BOUNDARY intent — these ALWAYS refuse the request (they never serve a
  // helpful answer to it), even though the refusal text is itself policy-grounded so grounded=true; (3) any
  // boundary that produced NO grounded answer. A critical_boundary that STILL served a grounded answer
  // (e.g. the Operador Zero guidance) is ANSWERED, not refused — it is excluded here and flows to the
  // normal transparency + entity suggestions. (grounded+boundary_detected alone cannot tell the two apart —
  // both the financial refusal and the OZ answer carry grounded=true & boundary_detected=true — so the
  // refusing INTENT is the discriminator.)
  const boundaryDetected = Boolean(asObj(o.reasoning_trace).boundary_detected);
  const REFUSING_INTENTS = new Set(["action_boundary", "safety_refusal", "safety_boundary", "operator_publication_boundary"]);
  const refused =
    operationalIntent === "safety_refusal" ||
    (typeof o.fallback_reason === "string" && o.fallback_reason === "safety_refusal") ||
    REFUSING_INTENTS.has(operationalIntent) ||
    (boundaryDetected && !grounded);
  // Increment 9 (§24) — the per-answer transparency projection, read verbatim from the envelope.
  const contextualFallbackKind = typeof o.contextual_fallback_kind === "string" ? (o.contextual_fallback_kind as string) : null;
  const transparency = buildTransparency(o, richSources, {
    degraded,
    fallbackReason,
    grounded,
    refused,
    terminalKind,
    isInsufficientMeasurements,
    contextualFallbackKind,
  });

  // Increment 9 (§25) — CONTEXTUAL, per-answer follow-up suggestions derived from THIS answer's intent +
  // entity + scope + which tools ran + what was NOT yet asked (never a fixed list served for every reply).
  // A boundary/refusal gets ONLY safe reframes — never a reframe toward the refused action.
  const suggestionCtx: SuggestionContext = {
    kind: refused ? "refusal" : isDuration ? "duration" : grounded ? "answer" : "uncertain",
    refused,
    // A boundary that STILL served a grounded answer (e.g. Operador Zero under critical_boundary) was
    // answered, not refused — it flows to the normal entity/grounded suggestions. Only a genuine refusal
    // (refused, or a boundary with NO grounded answer) is forced to the safe reframes (Inc.9-FIX1). The
    // safety invariant holds: a refused action never has a grounded answer, so it always stays boundary.
    boundary: boundaryDetected && !grounded,
    grounded,
    degraded,
    operationalIntent,
    answerType,
    questionFamily: typeof o.question_family === "string" ? (o.question_family as string) : null,
    contextualFallbackKind,
    terminalKind,
    entity: transparency?.entity ? { id: transparency.entity.id, type: transparency.entity.type, display: transparency.entity.display } : null,
    scope: transparency?.scope
      ? { profile: transparency.scope.profile, environment: transparency.scope.environment, protocolVersion: transparency.scope.protocolVersion }
      : null,
    toolsRan: transparency?.tools ? transparency.tools.map((t) => t.kind) : [],
    duration: duration ? { comparableRuns: duration.comparableRuns, hasPerStep: duration.perStep.length > 0 } : null,
    hasResolvedDocument: Boolean(doc),
  };
  const followUpsList = contextualSuggestions(suggestionCtx);
  const followUps = followUpsList.length ? followUpsList : undefined;

  // M2.18B.5 — typo tolerance / intent recovery, from the typed public trace (bands + display forms only;
  // never edit distance or scores). Presentation-only; the correction was already applied server-side.
  const rt = (o.reasoning_trace && typeof o.reasoning_trace === "object" ? (o.reasoning_trace as Record<string, unknown>) : {});
  const recoveryBand = typeof rt.recovery_band === "string" ? (rt.recovery_band as string) : "exact";
  const correctionDisplay = Array.isArray(rt.correction_display) ? (rt.correction_display as unknown[]).map((x) => String(x)).filter(Boolean) : [];
  const correctionClarification = Array.isArray(rt.correction_clarification) ? (rt.correction_clarification as unknown[]).map((x) => String(x)).filter(Boolean) : [];

  // BZCI-2/6 (§2) — capture the SAFE conversation_context the backend returned so the caller can carry it to
  // the next turn. Client-side defense: keep only known string fields, cap length; never trust it as a fact.
  const convState = coerceConversationState(o.conversation_context);
  const resolvedSubject = typeof o.reference_resolved_subject === "string" ? (o.reference_resolved_subject as string) : "";
  const turnType = typeof o.reference_turn_type === "string" ? (o.reference_turn_type as string) : "";
  return {
    intent: "protocol",
    // M2.10A — the resolved protocol document (null unless one was actually found).
    resolvedDocument: doc,
    documentNotFound: docNotFound,
    documentMode: docMode,
    documentTruncated: docTruncated,
    // M2.11D (QA-4) — a refusal is not a failure to find sources, and must not be labelled as one.
    // The backend already distinguishes them (`fallback_reason: "safety_refusal"`, decided in Rust
    // and served without any model call); the UI had a `RECUSA FUNDAMENTADA` badge for exactly this
    // and nothing ever set `kind: "refusal"`, so a refused prompt injection read
    // "EVIDÊNCIA INSUFICIENTE" — which is simply the wrong statement about what happened.
    kind: refused ? "refusal" : isDuration ? "duration" : grounded ? "answer" : "uncertain",
    text: bodyText || text || "Não há resposta disponível de momento.",
    cites,
    links,
    sources: richSources,
    operationalIntent,
    ...(followUps ? { followUps } : {}),
    ...(limits.length ? { limits } : {}),
    engine: typeof o.engine_state === "string" ? (o.engine_state as string) : undefined,
    llmCalls: 0, // external/billable calls only — local inference is free and on-host
    externalModelCalled: Boolean(o.external_model_called),
    localModelCalled: localCalled,
    degraded,
    status,
    contextUsed,
    // M2.9B: the journey context the backend re-derived + echoed back (all safe slugs/enums).
    currentStep: typeof o.current_step === "string" ? (o.current_step as string) : undefined,
    journeyStep: typeof o.journey_step === "string" ? (o.journey_step as string) : undefined,
    journeyContextUsed: Boolean(o.journey_context_used),
    nextRecommendedAction: typeof o.next_recommended_action === "string" ? (o.next_recommended_action as string) : undefined,
    uploadedArtifactsUsed: Boolean(o.uploaded_artifacts_used),
    uploadedArtifactsCount: Number(o.uploaded_artifacts_count) || 0,
    recoveryBand,
    ...(correctionDisplay.length ? { correctionDisplay } : {}),
    ...(correctionClarification.length ? { correctionClarification } : {}),
    // ADR-036 — operational duration/metric echoes (present only for an operational answer).
    ...(answerType ? { answerType } : {}),
    ...(terminalKind ? { terminalKind } : {}),
    ...(duration ? { duration } : {}),
    // Increment 9 (§24) — the per-answer transparency projection (present unless a bare outage).
    ...(transparency ? { transparency } : {}),
    // BZCI-2/6 (§2) — the carried-forward conversational state + the typed-resolution trace.
    ...(convState ? { conversationContext: convState } : {}),
    ...(resolvedSubject ? { resolvedSubject } : {}),
    ...(turnType ? { turnType } : {}),
  };
}

// BZCI-2/6 — coerce the backend's conversation_context object to the SAFE ConversationState the client
// carries. Only known string fields survive, each capped; a missing/empty object yields null (nothing to
// carry). This is a referent to re-resolve against — never trusted as a fact source (§19).
const CONVERSATION_STATE_KEYS: (keyof ConversationState)[] = [
  "operator_id",
  "implementation_id",
  "execution_id",
  "previous_execution_id",
  "artifact",
  "profile",
  "environment",
  "protocol_version",
  "last_intent",
  "last_family",
  "last_subject",
  "last_subject_kind",
  "last_document_id",
  "last_metric",
  "observed_at",
];
function coerceConversationState(raw: unknown): ConversationState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const src = raw as Record<string, unknown>;
  const out: ConversationState = {};
  let any = false;
  for (const k of CONVERSATION_STATE_KEYS) {
    const v = src[k];
    if (typeof v === "string" && v.trim()) {
      out[k] = v.slice(0, 96);
      any = true;
    }
  }
  return any ? out : null;
}

// M2.9B: the SAFE, Rust-built guided-journey context sent alongside a question. `journey_context` is
// produced by the Rust journey engine (whitelisted slugs/enums only — never raw drafts/keys/secrets);
// the backend NEVER trusts it and re-derives its own copy server-side. `current_step` is the step the
// operator is on. Both are optional; when absent the answer is a plain (non-journey) reply.
export type AskJourney = {
  journey_context?: Record<string, unknown>;
  current_step?: string;
  // M2.9C: a SAFE summary of uploaded artifacts (step + file name + size ONLY — never the raw file).
  uploaded_artifacts_summary?: { step: string; file_name: string; size: number }[];
  // M2.10A: the canonical document the operator is asking about ("ADR-001"), set when the question
  // came from a decision page rather than free text.
  document_id?: string;
};

/**
 * Answer a public question via the live BanzAI backend (local Qwen; same-origin /banzai/ask).
 * `history` is the recent chat turns (M2.8H) so the backend can resolve anaphoric follow-ups; only
 * the last few user questions are sent and the backend never stores them. `journey` (M2.9B) carries the
 * SAFE guided-journey context (Rust-built); the backend re-derives it server-side and never trusts it.
 * On any network/timeout/backend error, returns a safe "temporarily unavailable" message — never throws,
 * never leaks internals.
 */
// Build the SAFE /ask request body from a raw question + recent history + the optional journey context. It
// is the ONE source of truth for the request shape, shared by the non-stream banzaiKb() (POST /banzai/ask)
// and the SPR-5 progressive client (POST /banzai/ask/stream) so both send byte-identical bodies. It forwards
// only safe fields (question, capped context, document id, Rust-built journey context, upload names/sizes) —
// never a raw file body, prompt or secret.
export function buildAskBody(
  raw: string,
  history: ChatTurn[] = [],
  journey?: AskJourney,
  convState?: ConversationState | null,
): Record<string, unknown> {
  const q = (raw || "").trim();
  // Send at most the last 4 turns (the backend caps to the last 2 user questions).
  const context = (Array.isArray(history) ? history : [])
    .filter((t) => t && typeof t.text === "string" && t.text.trim())
    .slice(-4)
    .map((t) => ({ role: t.role === "user" ? "user" : "ai", text: String(t.text).slice(0, 400) }));
  const body: Record<string, unknown> = { question: q };
  if (context.length) body.context = context;
  // BZCI-2/6 (§2) — carry the typed conversational state forward so the Rust reference resolver can inherit
  // the prior subject/intent/referent. Only sent when non-empty (a first turn carries nothing), so first-turn
  // behaviour is byte-identical. The backend re-sanitizes it; it is a referent, never a fact source (§19).
  if (convState && typeof convState === "object" && Object.keys(convState).length) {
    body.conversation_context = convState;
  }
  // M2.10A: state WHICH document is being asked about instead of hoping the free text re-derives it.
  // The backend still resolves it against the Rust registry — this removes guesswork, it never
  // asserts that the document exists.
  if (typeof journey?.document_id === "string" && journey.document_id) {
    body.document_id = journey.document_id.slice(0, 32);
  }
  // Only forward journey fields when present — an empty journey never changes a plain answer.
  if (journey?.journey_context && typeof journey.journey_context === "object") {
    body.journey_context = journey.journey_context;
  }
  if (typeof journey?.current_step === "string" && journey.current_step) {
    body.current_step = journey.current_step;
  }
  // M2.9C: forward only the safe upload summary (names/sizes) — never any raw file body.
  if (Array.isArray(journey?.uploaded_artifacts_summary) && journey.uploaded_artifacts_summary.length) {
    body.uploaded_artifacts_summary = journey.uploaded_artifacts_summary
      .slice(0, 8)
      .map((a) => ({ step: String(a.step).slice(0, 40), file_name: String(a.file_name).slice(0, 160), size: Number(a.size) || 0 }));
  }
  return body;
}

export async function banzaiKb(
  raw: string,
  history: ChatTurn[] = [],
  journey?: AskJourney,
  convState?: ConversationState | null,
): Promise<KbAnswer> {
  const q = (raw || "").trim();
  if (!q) return unavailable();
  const body = buildAskBody(q, history, journey, convState);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASK_TIMEOUT_MS);
  try {
    const res = await fetch(ASK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      // M2.14E — map the backend status to a professional public message. Prefer the backend's own
      // `public_message` (Rust source of truth) when the body carries one; never expose internals.
      let publicMessage: string | undefined;
      try {
        const j = await res.json();
        if (j && typeof j.public_message === "string") publicMessage = j.public_message;
      } catch {
        /* non-JSON body (e.g. an upstream 502/503 HTML) — fall back to the safe constant */
      }
      if (res.status === 429) return outage("rate_limited", publicMessage);
      if (res.status === 503) return outage("busy", publicMessage);
      if (res.status === 504) return outage("timeout", publicMessage);
      return outage("unavailable", publicMessage);
    }
    const data = await res.json();
    return mapAskResponse(data);
  } catch {
    return unavailable();
  } finally {
    clearTimeout(timer);
  }
}
