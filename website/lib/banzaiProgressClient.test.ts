// SPR-5 — the "Safe Progressive Response" SSE client. These tests pin the SAFETY-CRITICAL behaviour: the
// client parses the SSE stream into typed events; NO event before the terminal ever yields answer prose; the
// validated answer arrives ONLY from the terminal `.final` envelope; a boundary REFUSED stream (no synthesis
// events) becomes a refusal; a stream failure falls back to the non-stream fetch; a user cancel yields a
// CANCELLED outcome with no answer and no fallback; and the three §12 metrics are computed.
import { describe, it, expect, vi } from "vitest";
import { streamBanzaiAsk, askViaStream, StreamUnavailableError } from "./banzaiProgressClient";
import { PROGRESS_SCHEMA_TOKEN } from "./banzaiProgress";
import type { KbAnswer } from "@/components/home/banzaiKb";

const PROSE = "PROSA_VALIDADA_DO_MODELO_XYZ (ADR-001).";

// Serialize one SSE frame the way the server does: `event: <KIND>\ndata: <json>\n\n`.
function frame(kind: string, extra: Record<string, unknown> = {}): string {
  const data = JSON.stringify({ kind, schema: PROGRESS_SCHEMA_TOKEN, seq: 0, ts: Date.now(), request_id: "rid", ...extra });
  return `event: ${kind}\ndata: ${data}\n\n`;
}

// Build a web ReadableStream<Uint8Array> from string chunks (so we can also split frames across chunks).
function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(enc.encode(chunks[i++]));
      else controller.close();
    },
  });
}

// A mock fetch that returns an SSE response from the given chunks; honours an already-aborted signal.
function sseFetch(chunks: string[], { contentType = "text/event-stream", ok = true, status = 200 } = {}): typeof fetch {
  return (async (_url: string, init?: RequestInit) => {
    if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
    return {
      ok,
      status,
      headers: { get: (k: string) => (k.toLowerCase() === "content-type" ? contentType : null) },
      body: streamFromChunks(chunks),
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

const GROUNDED_FRAMES = [
  frame("REQUEST_ACCEPTED", { mode: "brief", question_chars: 12 }),
  frame("INTENT_RESOLVED", { intent: "explain_concept", answer_class: "conceptual" }),
  frame("ENTITY_RESOLVED", { entity_id: "banza", entity_type: "protocol" }),
  frame("SOURCE_RESOLVED", { source_kind: "concept", document_id: "ADR-001" }),
  frame("FACTUAL_PACKAGE_READY", { source: "grounded_synthesis", facts_count: 1, documentary_sources: ["ADR-001"], package_checksum: "deadbeef" }),
  frame("SYNTHESIS_STARTED", { model: "qwen-test", depth: "brief" }),
  frame("SYNTHESIS_COMPLETED", { output_status: "ok" }),
  frame("CLAIM_VERIFICATION_STARTED", { cited_count: 1 }),
  frame("CITATION_VERIFICATION_STARTED", { cited_count: 1 }),
  frame("FINAL_VALIDATED", {
    disposition: "GROUNDED_ANSWER",
    final: { answer: PROSE, grounded: true, sources: [{ id: "ADR-001", title: "Protocolo aberto", path: "decisions/adr/ADR-001.md", repo: "banza-protocol/banza", category: "decision" }], engine_state: "local_qwen", local_model_called: true, meta: {} },
  }),
  frame("DONE"),
];

const failingFallback = (answer: KbAnswer) => vi.fn(async () => answer);

describe("streamBanzaiAsk — SSE parsing into typed events", () => {
  it("parses the raw SSE stream into typed events (even when frames are split across chunks)", async () => {
    // Split the joined stream into arbitrary chunk boundaries to prove the frame buffer works.
    const whole = GROUNDED_FRAMES.join("");
    const chunks = [whole.slice(0, 50), whole.slice(50, 400), whole.slice(400)];
    const kinds: string[] = [];
    for await (const e of streamBanzaiAsk("O que é o BANZA?", [], undefined, { fetchImpl: sseFetch(chunks) })) {
      kinds.push(e.kind);
    }
    expect(kinds).toEqual([
      "REQUEST_ACCEPTED", "INTENT_RESOLVED", "ENTITY_RESOLVED", "SOURCE_RESOLVED", "FACTUAL_PACKAGE_READY",
      "SYNTHESIS_STARTED", "SYNTHESIS_COMPLETED", "CLAIM_VERIFICATION_STARTED", "CITATION_VERIFICATION_STARTED",
      "FINAL_VALIDATED", "DONE",
    ]);
  });
  it("throws StreamUnavailableError on a non-2xx response (→ caller falls back)", async () => {
    const gen = streamBanzaiAsk("x", [], undefined, { fetchImpl: sseFetch([], { ok: false, status: 404 }) });
    await expect(gen.next()).rejects.toBeInstanceOf(StreamUnavailableError);
  });
  it("throws StreamUnavailableError when the response is not an event-stream", async () => {
    const gen = streamBanzaiAsk("x", [], undefined, { fetchImpl: sseFetch([frame("DONE")], { contentType: "application/json" }) });
    await expect(gen.next()).rejects.toBeInstanceOf(StreamUnavailableError);
  });
});

describe("askViaStream — no prose before the terminal; final from the terminal only", () => {
  it("emits the ordered Channel-A events with NO answer prose, then the validated answer from FINAL_VALIDATED", async () => {
    const seen: string[] = [];
    const nonTerminal: string[] = [];
    let t = 0;
    const outcome = await askViaStream("O que é o BANZA?", [], undefined, {
      fetchImpl: sseFetch(GROUNDED_FRAMES),
      fallback: failingFallback({ intent: "x", kind: "answer", text: "FALLBACK", cites: [], links: [], sources: [] }),
      now: () => ++t,
      onEvent: (e) => {
        seen.push(e.kind);
        if (e.kind !== "FINAL_VALIDATED" && e.kind !== "DONE") nonTerminal.push(JSON.stringify(e));
      },
    });
    // THE core safety property: no non-terminal event carried the prose.
    for (const s of nonTerminal) expect(s).not.toContain(PROSE);
    expect(seen).toContain("FINAL_VALIDATED");
    // The validated answer is present, mapped from the terminal `.final` envelope.
    expect(outcome.usedFallback).toBe(false);
    expect(outcome.cancelled).toBe(false);
    expect(outcome.terminalKind).toBe("FINAL_VALIDATED");
    expect(outcome.answer?.text).toContain(PROSE);
    expect(outcome.answer?.kind).toBe("answer");
    // §12 metrics computed.
    expect(outcome.metrics.timeToFirstProgressMs).not.toBeNull();
    expect(outcome.metrics.timeToFirstVerifiedFactMs).not.toBeNull();
    expect(outcome.metrics.timeToFinalValidatedAnswerMs).not.toBeNull();
    expect(outcome.metrics.ttfbMs).not.toBeNull();
  });

  it("a boundary REFUSED stream (no synthesis events) → a refusal, keyed on the terminal disposition", async () => {
    const frames = [
      frame("REQUEST_ACCEPTED", { question_chars: 20 }),
      frame("INTENT_RESOLVED", { intent: "action_boundary", boundary_detected: true }),
      frame("REFUSED", {
        disposition: "REFUSED",
        boundary_context: { is_boundary: true, boundary_kind: "safety", refused: true },
        final: { answer: "Não posso ajudar com movimentação de fundos.", grounded: false, sources: [], intent: "safety_refusal", fallback_reason: "safety_refusal", reasoning_trace: { boundary_detected: true }, meta: {} },
      }),
      frame("DONE"),
    ];
    const seen: string[] = [];
    const outcome = await askViaStream("transfere 100 kz", [], undefined, {
      fetchImpl: sseFetch(frames),
      fallback: failingFallback({ intent: "x", kind: "answer", text: "FALLBACK", cites: [], links: [], sources: [] }),
      onEvent: (e) => seen.push(e.kind),
    });
    expect(seen.some((k) => /SYNTHESIS|VERIFICATION/.test(k))).toBe(false);
    expect(outcome.terminalKind).toBe("REFUSED");
    expect(outcome.disposition).toBe("REFUSED");
    expect(outcome.answer?.kind).toBe("refusal");
    expect(outcome.usedFallback).toBe(false);
  });

  it("maps an in-band ERROR terminal to an honest unavailable answer (never a fallback loop)", async () => {
    const frames = [frame("REQUEST_ACCEPTED"), frame("ERROR", { final: { error: "busy", public_message: "O BanzAI está a processar muitos pedidos." } }), frame("DONE")];
    const outcome = await askViaStream("x", [], undefined, {
      fetchImpl: sseFetch(frames),
      fallback: failingFallback({ intent: "x", kind: "answer", text: "FALLBACK", cites: [], links: [], sources: [] }),
    });
    expect(outcome.terminalKind).toBe("ERROR");
    expect(outcome.usedFallback).toBe(false);
    expect(outcome.answer?.kind).toBe("unavailable");
    expect(outcome.answer?.text).toContain("muitos pedidos");
  });
});

describe("askViaStream — resilience", () => {
  it("falls back to the non-stream fetch when the stream errors/is unsupported", async () => {
    const fb = failingFallback({ intent: "protocol", kind: "answer", text: "RESPOSTA NÃO-STREAM", cites: [], links: [], sources: [] });
    const outcome = await askViaStream("O que é o BANZA?", [], undefined, {
      fetchImpl: sseFetch([], { ok: false, status: 500 }),
      fallback: fb,
    });
    expect(fb).toHaveBeenCalledOnce();
    expect(outcome.usedFallback).toBe(true);
    expect(outcome.answer?.text).toBe("RESPOSTA NÃO-STREAM");
    expect(outcome.cancelled).toBe(false);
  });

  it("falls back when the network fetch throws (not a user abort)", async () => {
    const fb = failingFallback({ intent: "protocol", kind: "answer", text: "RESPOSTA NÃO-STREAM", cites: [], links: [], sources: [] });
    const throwingFetch = (async () => {
      throw new TypeError("network down");
    }) as unknown as typeof fetch;
    const outcome = await askViaStream("x", [], undefined, { fetchImpl: throwingFetch, fallback: fb });
    expect(fb).toHaveBeenCalledOnce();
    expect(outcome.usedFallback).toBe(true);
  });

  it("a deliberate user cancel yields a CANCELLED outcome — no answer, NO fallback", async () => {
    const fb = failingFallback({ intent: "x", kind: "answer", text: "FALLBACK", cites: [], links: [], sources: [] });
    const ac = new AbortController();
    ac.abort(); // user already cancelled
    const outcome = await askViaStream("x", [], undefined, {
      signal: ac.signal,
      fetchImpl: sseFetch(GROUNDED_FRAMES),
      fallback: fb,
    });
    expect(outcome.cancelled).toBe(true);
    expect(outcome.answer).toBeNull();
    expect(outcome.terminalKind).toBe("CANCELLED");
    expect(fb).not.toHaveBeenCalled();
  });
});
