// SPR-5 — the "Safe Progressive Response" SSE client (UI_CLIENT_GLUE, ADR-071). This is I/O glue, not an
// engine: it POSTs a question to the same-origin SSE endpoint POST /banzai/ask/stream (added by SPR-2),
// parses the typed Channel-A progress events off the ReadableStream, and — on the terminal event — maps the
// EXACT same `/ask` envelope the non-stream route returns into the KbAnswer the chat already renders (via
// mapAskResponse, the ONE source of truth). It decides nothing, runs no protocol/financial logic, calls no
// model, re-implements no engine.
//
// SAFETY / SPR contract:
//   * The stream carries NO model-prose / delta / partial event. The validated answer prose travels ONLY in
//     the terminal FINAL_VALIDATED / HONEST_FALLBACK / REFUSED `.final` envelope. This client renders prose
//     ONLY from that terminal `.final` (through mapAskResponse) — never from a Channel-A event.
//   * The terminal outcome reacts to the typed response_disposition + boundary_context carried on the
//     terminal event (a REFUSED disposition / refused boundary → a refusal), never to the raw `grounded`.
//   * If the stream errors, is unsupported (no ReadableStream / not an event-stream / non-2xx), or ends with
//     no terminal, it FALLS BACK to the caller-supplied non-stream fetch so nothing regresses. A deliberate
//     user cancel (the caller aborts the signal) is NOT a fallback — it yields a CANCELLED outcome.
//
// The DECISION logic is Rust (the backend + progressContract.js) and the envelope→answer mapping is
// banzaiKb.ts; this file only transports + orchestrates. banzai-api/website UI glue, not a new engine.

import { mapAskResponse, buildAskBody, type KbAnswer, type ChatTurn, type AskJourney, type ConversationState } from "@/components/home/banzaiKb";
import {
  PROGRESS_SCHEMA_TOKEN,
  isProgressKind,
  isTerminalKind,
  computeMetrics,
  type ProgressEvent,
  type ProgressMetrics,
  type ProgressReceipt,
} from "./banzaiProgress";

// Same-origin SSE endpoint (nginx → banzai-api:8091/ask/stream). Same rate-limit zone as /banzai/ask.
const STREAM_URL = "/banzai/ask/stream";
const STREAM_TIMEOUT_MS = 120000; // above the backend's 120s SSE read timeout; the caller signal can cut sooner

// A signal that the stream cannot be used (unsupported transport / non-2xx / wrong content-type / no body).
// The caller treats this as "fall back to the non-stream fetch" — it is NEVER surfaced to the user.
export class StreamUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreamUnavailableError";
  }
}

// Parse ONE raw SSE frame ("event: <KIND>\ndata: <json>") into a validated ProgressEvent, or null to skip.
// It validates the kind against the closed mirror and the schema token (defence in depth) — a foreign or
// malformed frame is dropped rather than surfaced.
function parseFrame(raw: string): ProgressEvent | null {
  const lines = raw.split("\n");
  let data = "";
  for (const line of lines) {
    if (line.startsWith("data:")) data += line.slice(5).trimStart();
  }
  if (!data) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(data);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const evt = obj as Record<string, unknown>;
  if (!isProgressKind(evt.kind)) return null;
  if (typeof evt.schema === "string" && evt.schema !== PROGRESS_SCHEMA_TOKEN) return null;
  return evt as unknown as ProgressEvent;
}

type StreamOpts = {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  // Fires the moment the response headers arrive (before the body is read) — used to record TTFB, distinctly
  // from the first progress event.
  onOpen?: () => void;
  // BZCI-6 (§2) — the typed conversational state carried from the PREVIOUS turn, threaded into buildAskBody so
  // the streamed request body is byte-identical to the non-stream one (both carry conversation_context).
  convState?: ConversationState | null;
};

/**
 * Open POST /banzai/ask/stream and YIELD each typed Channel-A progress event (including the terminal + DONE)
 * as it arrives off the ReadableStream. Throws StreamUnavailableError when the transport is unusable (so the
 * caller can fall back); re-throws an AbortError when the caller aborts the signal (a deliberate cancel).
 */
export async function* streamBanzaiAsk(
  question: string,
  history: ChatTurn[] = [],
  journey?: AskJourney,
  opts: StreamOpts = {},
): AsyncGenerator<ProgressEvent, void, unknown> {
  const q = (question || "").trim();
  if (!q) throw new StreamUnavailableError("empty question");
  const doFetch = opts.fetchImpl || (typeof fetch !== "undefined" ? fetch : undefined);
  if (typeof doFetch !== "function") throw new StreamUnavailableError("fetch unavailable");
  if (typeof ReadableStream === "undefined") throw new StreamUnavailableError("ReadableStream unsupported");

  const body = buildAskBody(q, history, journey, opts.convState);
  let res: Response;
  res = await doFetch(STREAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res || !res.ok) throw new StreamUnavailableError(`stream http ${res ? res.status : "no-response"}`);
  const ct = (res.headers && typeof res.headers.get === "function" && res.headers.get("content-type")) || "";
  if (!String(ct).includes("text/event-stream")) throw new StreamUnavailableError("not an event-stream");
  const stream = res.body as ReadableStream<Uint8Array> | null;
  if (!stream || typeof stream.getReader !== "function") throw new StreamUnavailableError("no readable stream body");

  // The response headers have arrived and the transport is usable — record TTFB, distinctly from the first
  // progress event (which is emitted only once the body starts flowing).
  if (typeof opts.onOpen === "function") {
    try {
      opts.onOpen();
    } catch {
      /* TTFB sink error must never break the stream */
    }
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    // SSE frames are separated by a blank line.
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const evt = parseFrame(raw);
      if (evt) yield evt;
    }
  }
  buf += decoder.decode();
  const tail = buf.trim();
  if (tail) {
    const evt = parseFrame(tail);
    if (evt) yield evt;
  }
}

export type StreamOutcome = {
  // The finished answer to render, or null when the request was cancelled by the user.
  answer: KbAnswer | null;
  cancelled: boolean;
  usedFallback: boolean;
  terminalKind: string | null;
  disposition: string | null;
  metrics: ProgressMetrics;
};

type AskViaStreamOpts = {
  signal?: AbortSignal;
  onEvent?: (evt: ProgressEvent) => void;
  // The non-stream escape hatch — the existing banzaiKb() bound to the same question/history/journey. The
  // caller binds convState into this closure itself; it is passed to streamBanzaiAsk here for the stream body.
  fallback: () => Promise<KbAnswer>;
  fetchImpl?: typeof fetch;
  now?: () => number;
  // BZCI-6 (§2) — the typed conversational state from the previous turn, forwarded into the streamed request.
  convState?: ConversationState | null;
};

// Build the honest, non-technical "temporarily unavailable" answer from an in-band ERROR terminal's safe
// `final` payload (a public message only — never a stack trace or secret). Mirrors banzaiKb's outage shape.
function errorAnswer(final: Record<string, unknown> | null | undefined): KbAnswer {
  const pm = final && typeof final.public_message === "string" ? final.public_message.trim() : "";
  return {
    intent: "unavailable",
    kind: "unavailable",
    text: pm || "O BanzAI está temporariamente indisponível. Tenta novamente dentro de instantes.",
    cites: [],
    links: [],
    sources: [],
    status: "Temporariamente indisponível",
  };
}

/**
 * The high-level progressive send: stream POST /banzai/ask/stream, forward every event to `onEvent` (so the
 * UI can render the live processing line + safe fact cards), and resolve to the finished answer + the three
 * §12 metrics. Prose is taken ONLY from the terminal `.final` envelope (via mapAskResponse). On any stream
 * failure it falls back to the non-stream fetch. A user cancel (aborted signal) yields a CANCELLED outcome
 * with no answer and no fallback.
 */
export async function askViaStream(
  question: string,
  history: ChatTurn[],
  journey: AskJourney | undefined,
  opts: AskViaStreamOpts,
): Promise<StreamOutcome> {
  const now = opts.now || (() => Date.now());
  const startMs = now();
  const receipts: ProgressReceipt[] = [];
  let ttfbAbs: number | null = null;
  let terminal: ProgressEvent | null = null;

  const wasUserCancel = () => Boolean(opts.signal && opts.signal.aborted);
  const finish = (partial: Omit<StreamOutcome, "metrics">): StreamOutcome => ({
    ...partial,
    metrics: computeMetrics(receipts, startMs, ttfbAbs),
  });

  // Guard the total time so a stuck stream cannot hang forever; the caller's own signal can cut sooner.
  const timeoutAc = new AbortController();
  const timer = setTimeout(() => timeoutAc.abort(), STREAM_TIMEOUT_MS);
  const signal = mergeSignals(opts.signal, timeoutAc.signal);

  try {
    const gen = streamBanzaiAsk(question, history, journey, {
      signal,
      fetchImpl: opts.fetchImpl,
      convState: opts.convState,
      onOpen: () => {
        ttfbAbs = now();
      },
    });
    for await (const evt of gen) {
      receipts.push({ kind: evt.kind, atMs: now() });
      if (opts.onEvent) {
        try {
          opts.onEvent(evt);
        } catch {
          /* a UI-sink error must never break the stream */
        }
      }
      if (isTerminalKind(evt.kind)) terminal = evt;
    }
  } catch (err) {
    clearTimeout(timer);
    // A deliberate user cancel → CANCELLED, never a fallback.
    if (wasUserCancel()) {
      return finish({ answer: null, cancelled: true, usedFallback: false, terminalKind: "CANCELLED", disposition: null });
    }
    // Any other failure (transport unsupported / network / timeout / malformed) → fall back to non-stream.
    const answer = await opts.fallback();
    return finish({ answer, cancelled: false, usedFallback: true, terminalKind: null, disposition: null });
  }
  clearTimeout(timer);

  // The stream ended. If the user cancelled with no answer-bearing terminal, honour the cancel.
  if (wasUserCancel() && (!terminal || terminal.kind === "CANCELLED")) {
    return finish({ answer: null, cancelled: true, usedFallback: false, terminalKind: "CANCELLED", disposition: null });
  }
  if (!terminal) {
    // Ended with no terminal (server closed early) → fall back rather than show nothing.
    const answer = await opts.fallback();
    return finish({ answer, cancelled: false, usedFallback: true, terminalKind: null, disposition: null });
  }

  const tk = terminal.kind;
  const disposition = typeof terminal.disposition === "string" ? terminal.disposition : null;
  if (tk === "CANCELLED") {
    return finish({ answer: null, cancelled: true, usedFallback: false, terminalKind: tk, disposition });
  }
  if (tk === "ERROR") {
    return finish({ answer: errorAnswer(terminal.final), cancelled: false, usedFallback: false, terminalKind: tk, disposition });
  }

  // FINAL_VALIDATED / HONEST_FALLBACK / REFUSED — the ONLY place prose is read: the terminal `.final` is the
  // exact `/ask` envelope, mapped by the ONE shared mapper the non-stream path uses.
  let answer = mapAskResponse(terminal.final || {});
  // React to the typed response_disposition + boundary_context (NOT `grounded`): a REFUSED terminal / a
  // refused boundary is a refusal, so it gets the RECUSA SEGURA badge + only-safe reframes.
  const refusedByDisposition = tk === "REFUSED" || disposition === "REFUSED" || Boolean(terminal.boundary_context && terminal.boundary_context.refused);
  if (refusedByDisposition && answer.kind !== "refusal") {
    answer = { ...answer, kind: "refusal" };
  }
  return finish({ answer, cancelled: false, usedFallback: false, terminalKind: tk, disposition });
}

// Merge up to two AbortSignals into one (either aborting aborts the result). Returns undefined when neither
// is present. Kept tiny + dependency-free (AbortSignal.any is not universally available).
function mergeSignals(a?: AbortSignal, b?: AbortSignal): AbortSignal | undefined {
  if (!a) return b;
  if (!b) return a;
  const ac = new AbortController();
  const onAbort = () => ac.abort();
  if (a.aborted || b.aborted) ac.abort();
  else {
    a.addEventListener("abort", onAbort, { once: true });
    b.addEventListener("abort", onAbort, { once: true });
  }
  return ac.signal;
}
