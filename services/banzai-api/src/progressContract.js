// SPR-1 — the JS mirror of the typed "Safe Progressive Response" contracts. The contracts LIVE in Rust
// (engines/banzai-query-core/src/disposition.rs); this module is a THIN, hermetic transport over the
// committed WASM (services/banzai-api/src/rustkb) so the future SSE endpoint AND the frontend import ONE
// source of truth for the progressive-event kinds + the response-disposition mapping.
//
// Rust decides; this module only transports. It reimplements NO logic: the event-kind set, the schema
// token, the disposition mapping and the safe boundary context all come from the WASM. It imports ONLY the
// self-contained WASM (no pg, no network, no other runtime modules), so it loads in the WASM-only CI job.
//
// SAFETY / PRIVACY (see disposition.rs + tools/check-banzai-progress-contract.sh):
//   * There is NO model-token / delta / partial-prose event kind. Unvalidated model text is NEVER
//     streamed — the validated answer arrives once, at the terminal event.
//   * Every event carries ONLY public-safe data: ids, closed enums, counts, hashes, durations. Never a
//     prompt, chain-of-thought, secret, cookie, access token, private content or raw model text.
//   * The boundary context is the three safe fields only (is_boundary/boundary_kind/refused) — it never
//     echoes the user's text.
//
// Additive this increment: the contract is DEFINED and testable; it is not yet wired into a stream, and no
// runtime /ask answer behaviour changes.

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const kb = require("./rustkb/banzai_api_kb.js");

// The versioned progressive-event contract — { contract, version, schema_version, kinds }. Sourced from
// the WASM; a safe, empty-kinds stub if the export is absent (never a fabricated kind set).
function _contract() {
  const stub = { contract: "banzai-progress", version: 0, schema_version: "", kinds: [] };
  if (typeof kb.progress_event_contract_json !== "function") return stub;
  try {
    const parsed = JSON.parse(kb.progress_event_contract_json());
    return parsed && typeof parsed === "object" ? { ...stub, ...parsed } : stub;
  } catch {
    return stub;
  }
}

function _dispositions() {
  if (typeof kb.response_dispositions_json !== "function") return [];
  try {
    const parsed = JSON.parse(kb.response_dispositions_json());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** The full versioned progressive-event contract (Rust-owned). Frozen. */
export const PROGRESS_CONTRACT = Object.freeze(_contract());

/** The schema version token stamped on every progressive event, e.g. "banzai-progress/1". */
export const PROGRESS_SCHEMA_TOKEN = PROGRESS_CONTRACT.schema_version;

/** The closed, ordered set of progressive-event kinds. There is NO model-token/delta kind. Frozen. */
export const PROGRESS_EVENT_KINDS = Object.freeze([...(PROGRESS_CONTRACT.kinds || [])]);

/** The closed set of typed response dispositions the UI reacts to (never the raw `grounded` boolean). */
export const RESPONSE_DISPOSITIONS = Object.freeze(_dispositions());

/**
 * Classify the FINAL disposition of an answer from the resolution facts. Rust owns the mapping (safety
 * first: a boundary → REFUSED). `input` = { intent, grounded, terminal_kind, contextual_fallback_kind,
 * boundary:{is_boundary,boundary_kind,refused} }. Returns { disposition, boundary_context } — public-safe
 * only. A safe HONEST_FALLBACK stub if the export is absent (never a false GROUNDED_ANSWER claim).
 */
export function responseDisposition(input) {
  const stub = {
    disposition: "HONEST_FALLBACK",
    boundary_context: { is_boundary: false, boundary_kind: "none", refused: false },
  };
  if (typeof kb.response_disposition_json !== "function") return stub;
  try {
    const r = JSON.parse(kb.response_disposition_json(JSON.stringify(input || {})));
    return r && typeof r === "object" ? r : stub;
  } catch {
    return stub;
  }
}

/**
 * The safe, public boundary facts for a raw question — { is_boundary, boundary_kind, refused }. Derived
 * from the deterministic boundary engine; never echoes the user's text, never a prompt/secret.
 */
export function boundaryContext(question) {
  const stub = { is_boundary: false, boundary_kind: "none", refused: false };
  if (typeof kb.boundary_context_json !== "function") return stub;
  try {
    const r = JSON.parse(kb.boundary_context_json(String(question || "")));
    return r && typeof r === "object" ? { ...stub, ...r } : stub;
  } catch {
    return stub;
  }
}

// ── SPR-2 — the transport helpers the SSE stream + the pipeline onProgress path use ─────────────────────
// These add NO answer/routing logic: they stamp the Rust-owned schema token, enforce the closed kind set,
// scrub every progress event of any prose/secret field (defence in depth over safe-by-construction call
// sites), and map the Rust `response_disposition` to the terminal SSE event kind. Pure + hermetic.

/** The set of progressive-event kinds (fast membership test for the event factory). Frozen. */
export const PROGRESS_EVENT_KIND_SET = Object.freeze(new Set(PROGRESS_EVENT_KINDS));

/** The TERMINAL event kinds — the only kinds that may carry the validated final envelope. Frozen. */
export const PROGRESS_TERMINAL_KINDS = Object.freeze([
  "FINAL_VALIDATED",
  "HONEST_FALLBACK",
  "REFUSED",
  "CANCELLED",
  "ERROR",
]);

// Keys a CHANNEL-A (in-flight) progress event must NEVER carry — prose, prompts, chain-of-thought,
// secrets, tokens or ANY echoed user/model text. Exact-match, applied recursively. The validated answer
// travels ONLY inside the terminal FINAL_VALIDATED envelope (which does NOT go through this scrub).
export const FORBIDDEN_PROGRESS_KEYS = Object.freeze([
  "answer",
  "answer_markdown",
  "prose",
  "completion",
  "model_output",
  "text",
  "raw",
  "raw_text",
  "prompt",
  "system",
  "system_prompt",
  "user_prompt",
  "messages",
  "chain_of_thought",
  "cot",
  "reasoning",
  "question",
  "normalized_question",
  "user_text",
  "secret",
  "secrets",
  "cookie",
  "password",
  "credential",
  "api_key",
  "token",
  "access_token",
]);

const _FORBIDDEN = new Set(FORBIDDEN_PROGRESS_KEYS);
const _MAX_STR = 512; // defensive cap: a stray long string is truncated, never streamed whole

// Recursively drop every forbidden key and cap string lengths. Returns a NEW, JSON-safe structure.
function scrubPayload(value, depth = 0) {
  if (value == null) return value;
  if (typeof value === "string") return value.length > _MAX_STR ? value.slice(0, _MAX_STR) : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (depth > 6) return null; // never recurse unbounded
  if (Array.isArray(value)) return value.slice(0, 200).map((v) => scrubPayload(v, depth + 1));
  if (typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value)) {
      if (_FORBIDDEN.has(k)) continue; // drop a forbidden field wherever it appears
      out[k] = scrubPayload(value[k], depth + 1);
    }
    return out;
  }
  return null; // functions/symbols/etc. never reach the wire
}

/**
 * Build ONE safe CHANNEL-A progressive event: it stamps the Rust-owned schema token, a monotonic seq, a
 * timestamp and the request id, validates the kind against the closed set, and SCRUBS the payload of every
 * prose/secret field. A terminal FINAL_VALIDATED that carries the validated answer must NOT be built with
 * this (use makeTerminalEvent) — this factory deliberately strips the answer. Returns a frozen plain object.
 */
export function makeProgressEvent(kind, payload = {}, { seq = 0, requestId = null, ts = null, nowFn = Date.now } = {}) {
  const k = String(kind || "");
  if (!PROGRESS_EVENT_KIND_SET.has(k)) {
    throw new Error(`unknown progress-event kind: ${k}`);
  }
  const safe = scrubPayload(payload && typeof payload === "object" ? payload : {});
  // The reserved envelope fields are stamped LAST so no payload field (e.g. a `kind`/`seq`) can ever clobber
  // the event's own identity. The event `kind` is always the passed, validated kind.
  return Object.freeze({
    ...safe,
    kind: k,
    schema: PROGRESS_SCHEMA_TOKEN,
    seq: Number.isFinite(seq) ? seq : 0,
    ts: ts || (typeof nowFn === "function" ? nowFn() : Date.now()),
    request_id: requestId || null,
  });
}

// The disposition → terminal SSE event kind. A validated synthesis, a deterministic terminal AND a
// deterministic clarification are all a FINISHED, safe answer → FINAL_VALIDATED. An honest/insufficient
// no-answer → HONEST_FALLBACK. A boundary → REFUSED. (CANCELLED / ERROR are transport terminals, decided
// by the stream, not by a disposition.)
export const TERMINAL_EVENT_BY_DISPOSITION = Object.freeze({
  GROUNDED_ANSWER: "FINAL_VALIDATED",
  DETERMINISTIC_ANSWER: "FINAL_VALIDATED",
  CLARIFICATION: "FINAL_VALIDATED",
  HONEST_FALLBACK: "HONEST_FALLBACK",
  INSUFFICIENT: "HONEST_FALLBACK",
  REFUSED: "REFUSED",
});

/** Map a typed response disposition to the terminal SSE event kind (default HONEST_FALLBACK, never a leak). */
export function terminalEventForDisposition(disposition) {
  return TERMINAL_EVENT_BY_DISPOSITION[String(disposition || "")] || "HONEST_FALLBACK";
}

/**
 * Build ONE terminal event that carries the FINISHED, validated envelope. Unlike makeProgressEvent this
 * does NOT scrub the answer — a FINAL_VALIDATED terminal MUST carry the validated answer (the whole point).
 * `finalEnvelope` is the exact `/ask` body; it is placed under `final`. Kind must be a terminal kind.
 */
export function makeTerminalEvent(kind, finalEnvelope, { seq = 0, requestId = null, ts = null, nowFn = Date.now, disposition = null, boundaryContext: bctx = null } = {}) {
  const k = String(kind || "");
  if (!PROGRESS_TERMINAL_KINDS.includes(k)) {
    throw new Error(`not a terminal progress-event kind: ${k}`);
  }
  const evt = {
    kind: k,
    schema: PROGRESS_SCHEMA_TOKEN,
    seq: Number.isFinite(seq) ? seq : 0,
    ts: ts || (typeof nowFn === "function" ? nowFn() : Date.now()),
    request_id: requestId || null,
    disposition: disposition || null,
  };
  if (bctx && typeof bctx === "object") evt.boundary_context = bctx;
  // The validated envelope rides under `final` only for the answer-bearing terminals. CANCELLED never
  // carries a final answer (nothing is persisted); ERROR carries only a safe error payload.
  if (finalEnvelope && typeof finalEnvelope === "object") evt.final = finalEnvelope;
  return Object.freeze(evt);
}

/** Serialize an event object to an SSE frame: `event: <KIND>\ndata: <json>\n\n`. */
export function sseFrame(evt) {
  const kind = (evt && evt.kind) || "ERROR";
  let data;
  try {
    data = JSON.stringify(evt);
  } catch {
    data = JSON.stringify({ kind, schema: PROGRESS_SCHEMA_TOKEN, error: "serialization_failed" });
  }
  return `event: ${kind}\ndata: ${data}\n\n`;
}
