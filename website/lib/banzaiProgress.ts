// SPR-5 — the FRONTEND mirror of the "Safe Progressive Response" contract + the pure presentation helpers
// the /banzai page uses to render the progressive interface (§9) and compute the progressive metrics (§12).
//
// The typed contract LIVES in Rust (engines/banzai-query-core/src/disposition.rs) and is transported to the
// backend by services/banzai-api/src/progressContract.js. This file is the SAME closed set of event kinds,
// terminal kinds, the schema token, the response dispositions and the disposition→terminal mapping, mirrored
// for the browser (which cannot import the Node/WASM transport). The guard tools/check-banzai-progressive-ui.sh
// asserts this mirror equals the Rust-owned source of truth — it must never diverge into a hand-rolled set.
//
// SAFETY (the whole point of Safe Progressive Response): there is NO model-prose / delta / partial event kind.
// Every in-flight (Channel-A) event carries ONLY public-safe data — ids, closed enums, counts, checksums,
// durations. The validated answer prose arrives exactly ONCE, inside the terminal FINAL_VALIDATED (or the
// degraded HONEST_FALLBACK) envelope. These helpers therefore NEVER read a prose field: factsFromEvents reads
// only an explicit allowlist of safe keys, and no helper here ever touches `.final`/answer text. Pure — no
// React, no network, no model, no state.

// ── the Rust-owned closed set, mirrored (the guard asserts parity with progressContract.js) ─────────────

/** The versioned schema token stamped on every progressive event. */
export const PROGRESS_SCHEMA_TOKEN = "banzai-progress/1";

/** The closed, ordered set of progressive-event kinds. There is NO model-prose/delta/partial kind. */
export const PROGRESS_EVENT_KINDS = [
  "REQUEST_ACCEPTED",
  "INTENT_RESOLVED",
  "ENTITY_RESOLVED",
  "TOOL_PLAN_READY",
  "TOOL_STARTED",
  "TOOL_COMPLETED",
  "SOURCE_RESOLVED",
  "FACTUAL_PACKAGE_READY",
  "SYNTHESIS_STARTED",
  "SYNTHESIS_COMPLETED",
  "CLAIM_VERIFICATION_STARTED",
  "CITATION_VERIFICATION_STARTED",
  "FINAL_VALIDATED",
  "HONEST_FALLBACK",
  "REFUSED",
  "CANCELLED",
  "ERROR",
  "DONE",
] as const;

export type ProgressKind = (typeof PROGRESS_EVENT_KINDS)[number];

/** The terminal kinds — the only kinds that may carry the validated final envelope. */
export const PROGRESS_TERMINAL_KINDS = [
  "FINAL_VALIDATED",
  "HONEST_FALLBACK",
  "REFUSED",
  "CANCELLED",
  "ERROR",
] as const;

/** The closed set of typed response dispositions the UI reacts to (never the raw `grounded` boolean). */
export const RESPONSE_DISPOSITIONS = [
  "GROUNDED_ANSWER",
  "DETERMINISTIC_ANSWER",
  "HONEST_FALLBACK",
  "REFUSED",
  "CLARIFICATION",
  "INSUFFICIENT",
] as const;

/** disposition → terminal event kind (mirrors TERMINAL_EVENT_BY_DISPOSITION in progressContract.js). */
export const TERMINAL_EVENT_BY_DISPOSITION: Record<string, string> = {
  GROUNDED_ANSWER: "FINAL_VALIDATED",
  DETERMINISTIC_ANSWER: "FINAL_VALIDATED",
  CLARIFICATION: "FINAL_VALIDATED",
  HONEST_FALLBACK: "HONEST_FALLBACK",
  INSUFFICIENT: "HONEST_FALLBACK",
  REFUSED: "REFUSED",
};

const _KIND_SET = new Set<string>(PROGRESS_EVENT_KINDS);
const _TERMINAL_SET = new Set<string>(PROGRESS_TERMINAL_KINDS);

export function isProgressKind(k: unknown): k is ProgressKind {
  return typeof k === "string" && _KIND_SET.has(k);
}
export function isTerminalKind(k: unknown): boolean {
  return typeof k === "string" && _TERMINAL_SET.has(k);
}

/** The safe boundary context (never echoes the user's text) carried on a terminal REFUSED event. */
export type BoundaryContext = { is_boundary: boolean; boundary_kind: string; refused: boolean };

/**
 * One progressive event, as parsed off the SSE wire. The reserved fields are always present; the rest are the
 * already-scrubbed, public-safe Channel-A payload (ids/enums/counts/checksums). Terminal events additionally
 * carry `disposition`, `boundary_context` and the validated `final` envelope (the ONLY place prose travels).
 */
export type ProgressEvent = {
  kind: ProgressKind;
  schema: string;
  seq: number;
  ts: number;
  request_id: string | null;
  disposition?: string | null;
  boundary_context?: BoundaryContext | null;
  final?: Record<string, unknown> | null;
  // Channel-A safe payload (only what the event carries; never prose/secret).
  [k: string]: unknown;
};

// ── §9 — the live processing line, driven by the REAL events (never a timer) ────────────────────────────

// Each in-flight event kind maps to a compact processing PHASE. Block E2/Q5 — this is a phase id, not a
// sentence: which phase the stream is in is the same fact for every reader, and the words for it are
// chosen in `components/banzai/progressPresentation` once the reader's edition is known. The tool/source
// phase is a COMPOSITE (it folds in the resolved-sources + completed-tools counts), computed below.
const _LINE_BY_KIND: Record<string, ProgressLineId> = {
  REQUEST_ACCEPTED: "line.interpreting",
  INTENT_RESOLVED: "line.interpreting",
  ENTITY_RESOLVED: "line.interpreting",
  FACTUAL_PACKAGE_READY: "line.buildingFacts",
  SYNTHESIS_STARTED: "line.preparingExplanation",
  SYNTHESIS_COMPLETED: "line.preparingExplanation",
  CLAIM_VERIFICATION_STARTED: "line.verifyingClaims",
  CITATION_VERIFICATION_STARTED: "line.verifyingCitations",
};

/** The phase ids this module can report. Realized by `progressPresentation`, never here. */
export type ProgressLineId =
  | "line.interpreting"
  | "line.buildingFacts"
  | "line.preparingExplanation"
  | "line.verifyingClaims"
  | "line.verifyingCitations"
  | "line.processing"
  | "line.sourcesResolved"
  | "line.resolvingSourcesAndTools"
  | "line.toolsDone.one"
  | "line.toolsDone.many";

export type ProgressLineSegment = Readonly<{ id: ProgressLineId; params?: Readonly<Record<string, string>> }>;

const _TOOL_PHASE = new Set(["TOOL_PLAN_READY", "TOOL_STARTED", "TOOL_COMPLETED", "SOURCE_RESOLVED"]);

/**
 * The current processing line for a stream so far — derived from the LATEST in-flight event, never a timer.
 * Returns the phase as SEGMENTS (ids plus the counts a phase resolved), so the same stream produces the
 * same line in every edition and only the wording differs.
 */
export function progressLineFor(events: ProgressEvent[]): {
  segments: ProgressLineSegment[];
  kind: ProgressKind | null;
} {
  const inflight = events.filter((e) => e && !isTerminalKind(e.kind) && e.kind !== "DONE");
  const last = inflight[inflight.length - 1];
  if (!last) return { segments: [{ id: "line.interpreting" }], kind: null };
  const k = last.kind;
  if (_TOOL_PHASE.has(k)) {
    const toolsDone = events.filter((e) => e.kind === "TOOL_COMPLETED").length;
    const anySource = events.some((e) => e.kind === "SOURCE_RESOLVED");
    const segments: ProgressLineSegment[] = [];
    if (anySource) segments.push({ id: "line.sourcesResolved" });
    if (toolsDone > 0) {
      segments.push({
        id: toolsDone === 1 ? "line.toolsDone.one" : "line.toolsDone.many",
        params: { n: String(toolsDone) },
      });
    }
    if (segments.length === 0) segments.push({ id: "line.resolvingSourcesAndTools" });
    return { segments, kind: k };
  }
  return { segments: [{ id: _LINE_BY_KIND[k] || "line.processing" }], kind: k };
}

/** True while the stream is in the synthesis window (SYNTHESIS_STARTED … CITATION_VERIFICATION_STARTED). */
export function isSynthesisActive(events: ProgressEvent[]): boolean {
  const started = events.some((e) => e.kind === "SYNTHESIS_STARTED");
  const terminal = events.some((e) => isTerminalKind(e.kind));
  return started && !terminal;
}

// ── §9 — the SAFE facts-available cards, extracted from the event payloads (ids/enums/counts/hashes only) ─

export type ProgressEntityFact = {
  entity_id: string | null;
  entity_type: string | null;
  artifact_type: string | null;
  protocol_scope: string | null;
  requires_live_tool: boolean;
  authority_requirement: string | null;
};
export type ProgressSourceFact = {
  source_kind: string | null;
  seeded_entity: string | null;
  document_id: string | null;
  document_status: string | null;
  implementation_id: string | null;
  canonical_origin: string | null;
  artifact_sha256: string | null;
  artifact_version: string | null;
};
export type ProgressToolFact = {
  tool_kind: string | null;
  outcome: string | null;
  error_code: string | null;
  comparable_n: number | null;
  question_family: string | null;
  operational_metric: string | null;
  operational_subject: string | null;
};
export type ProgressPackageFact = {
  source: string | null;
  primary_intent: string | null;
  facts_count: number | null;
  documentary_sources: string[];
  tools_called: string[];
  question_family: string | null;
  reason_code: string | null;
  sample_size: number | null;
  aggregation_method: string | null;
  depth: string | null;
  package_checksum: string | null;
};
export type ProgressFacts = {
  entity: ProgressEntityFact | null;
  sources: ProgressSourceFact[];
  tools: ProgressToolFact[];
  package: ProgressPackageFact | null;
};

// Defensive, typed accessors — an event field shaped wrong reads as null/false/[]. These deliberately read
// ONLY the safe key requested, so a stray prose/secret field on an event can never be surfaced.
const _s = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const _n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const _b = (v: unknown): boolean => v === true;
const _sa = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean).slice(0, 24) : []);

/**
 * Build the SAFE facts-available projection from the Channel-A events so far. It reads ONLY an explicit
 * allowlist of ids/enums/counts/checksums from each event; it NEVER reads any answer/prose/secret field, so
 * no model prose can reach the DOM through the progressive interface. Progressive: it accretes as events
 * arrive (last ENTITY_RESOLVED / package wins; sources + tools accumulate, de-duplicated).
 */
export function factsFromEvents(events: ProgressEvent[]): ProgressFacts {
  let entity: ProgressEntityFact | null = null;
  const sources: ProgressSourceFact[] = [];
  const tools: ProgressToolFact[] = [];
  let pkg: ProgressPackageFact | null = null;
  const seenSource = new Set<string>();
  const seenTool = new Set<string>();

  for (const e of events) {
    if (!e || typeof e.kind !== "string") continue;
    switch (e.kind) {
      case "ENTITY_RESOLVED":
        entity = {
          entity_id: _s(e.entity_id),
          entity_type: _s(e.entity_type),
          artifact_type: _s(e.artifact_type),
          protocol_scope: _s(e.protocol_scope),
          requires_live_tool: _b(e.requires_live_tool),
          authority_requirement: _s(e.authority_requirement),
        };
        break;
      case "SOURCE_RESOLVED": {
        const src: ProgressSourceFact = {
          source_kind: _s(e.source_kind),
          seeded_entity: _s(e.seeded_entity),
          document_id: _s(e.document_id),
          document_status: _s(e.document_status),
          implementation_id: _s(e.implementation_id),
          canonical_origin: _s(e.canonical_origin),
          artifact_sha256: _s(e.artifact_sha256),
          artifact_version: _s(e.artifact_version),
        };
        const key = JSON.stringify(src);
        if (!seenSource.has(key)) {
          seenSource.add(key);
          sources.push(src);
        }
        break;
      }
      case "TOOL_STARTED":
      case "TOOL_COMPLETED": {
        const tool: ProgressToolFact = {
          tool_kind: _s(e.tool_kind),
          outcome: _s(e.outcome),
          error_code: _s(e.error_code),
          comparable_n: _n(e.comparable_n),
          question_family: _s(e.question_family),
          operational_metric: _s(e.operational_metric),
          operational_subject: _s(e.operational_subject),
        };
        // A TOOL_COMPLETED supersedes its matching TOOL_STARTED (same tool_kind) so we show the outcome.
        const existing = tools.findIndex((t) => t.tool_kind && t.tool_kind === tool.tool_kind);
        if (e.kind === "TOOL_COMPLETED" && existing >= 0) {
          tools[existing] = tool;
        } else {
          const key = `${tool.tool_kind}|${e.kind}`;
          if (!seenTool.has(key)) {
            seenTool.add(key);
            tools.push(tool);
          }
        }
        break;
      }
      case "FACTUAL_PACKAGE_READY":
        pkg = {
          source: _s(e.source),
          primary_intent: _s(e.primary_intent),
          facts_count: _n(e.facts_count),
          documentary_sources: _sa(e.documentary_sources),
          tools_called: _sa(e.tools_called),
          question_family: _s(e.question_family),
          reason_code: _s(e.reason_code),
          sample_size: _n(e.sample_size),
          aggregation_method: _s(e.aggregation_method),
          depth: _s(e.depth),
          package_checksum: _s(e.package_checksum),
        };
        break;
      default:
        break;
    }
  }
  return { entity, sources, tools, package: pkg };
}

/** True when the projection carries at least one presentable safe fact. */
export function hasAnyFact(f: ProgressFacts): boolean {
  return Boolean(f.entity || f.package || f.sources.length > 0 || f.tools.length > 0);
}

// ── §12 — the progressive metrics (client-side, safe: durations only; distinct from TTFB) ───────────────

export type ProgressMetrics = {
  // Time to the response headers (the raw fetch resolving) — DISTINCT from the first progress event below.
  ttfbMs: number | null;
  // Time to the first Channel-A progress event.
  timeToFirstProgressMs: number | null;
  // Time to the first verifiable fact (FACTUAL_PACKAGE_READY, else the first fact-bearing event).
  timeToFirstVerifiedFactMs: number | null;
  // Time to the validated answer (the FINAL_VALIDATED terminal specifically).
  timeToFinalValidatedAnswerMs: number | null;
};

export type ProgressReceipt = { kind: string; atMs: number };

const _FACT_EVENT_KINDS = ["SOURCE_RESOLVED", "ENTITY_RESOLVED", "TOOL_COMPLETED"];

/**
 * Compute the three §12 metrics from the per-event client receipt times. `startMs` is the moment the request
 * was issued; `ttfbAbsMs` is the absolute moment the response headers arrived (null if never). All outputs
 * are elapsed milliseconds relative to `startMs`. No secret/PII — durations only.
 */
export function computeMetrics(
  receipts: ProgressReceipt[],
  startMs: number,
  ttfbAbsMs: number | null,
): ProgressMetrics {
  const rel = (abs: number | null | undefined): number | null =>
    abs == null || !Number.isFinite(abs) ? null : Math.max(0, Math.round(abs - startMs));
  const firstOf = (pred: (k: string) => boolean): number | null => {
    for (const r of receipts) if (pred(r.kind)) return r.atMs;
    return null;
  };
  const firstProgress = receipts.length ? receipts[0].atMs : null;
  const firstPackage = firstOf((k) => k === "FACTUAL_PACKAGE_READY");
  const firstFact = firstPackage ?? firstOf((k) => _FACT_EVENT_KINDS.includes(k));
  const finalValidated = firstOf((k) => k === "FINAL_VALIDATED");
  return {
    ttfbMs: rel(ttfbAbsMs),
    timeToFirstProgressMs: rel(firstProgress),
    timeToFirstVerifiedFactMs: rel(firstFact),
    timeToFinalValidatedAnswerMs: rel(finalValidated),
  };
}

/** True when the metrics carry any streamed timing (i.e. a real progressive stream ran, not a fallback). */
export function hasStreamMetrics(m: ProgressMetrics | null | undefined): boolean {
  return Boolean(m && (m.timeToFirstProgressMs !== null || m.timeToFinalValidatedAnswerMs !== null));
}
