// SPR-5 — the pure "Safe Progressive Response" presentation helpers: the frozen contract mirror, the live
// processing-line state map (§9), the SAFE facts-available projection (§9), and the three progressive metrics
// (§12). The safety-critical property proven here: factsFromEvents reads ONLY safe fields — a Channel-A event
// carrying a stray prose/secret field never surfaces it.
import { describe, it, expect } from "vitest";
import {
  PROGRESS_SCHEMA_TOKEN,
  PROGRESS_EVENT_KINDS,
  PROGRESS_TERMINAL_KINDS,
  RESPONSE_DISPOSITIONS,
  TERMINAL_EVENT_BY_DISPOSITION,
  isTerminalKind,
  isProgressKind,
  progressLineFor,
  isSynthesisActive,
  factsFromEvents,
  hasAnyFact,
  computeMetrics,
  hasStreamMetrics,
  type ProgressEvent,
} from "./banzaiProgress";

// A minimal event factory (only the reserved fields + the passed safe payload).
let _seq = 0;
function evt(kind: string, payload: Record<string, unknown> = {}): ProgressEvent {
  return { kind: kind as ProgressEvent["kind"], schema: PROGRESS_SCHEMA_TOKEN, seq: _seq++, ts: Date.now(), request_id: "rid", ...payload };
}

describe("SPR-5 contract mirror", () => {
  it("mirrors the Rust-owned kind set (18 kinds, schema token banzai-progress/1) with NO model-prose/delta kind", () => {
    expect(PROGRESS_SCHEMA_TOKEN).toBe("banzai-progress/1");
    expect(PROGRESS_EVENT_KINDS).toHaveLength(18);
    expect(PROGRESS_EVENT_KINDS).toContain("FINAL_VALIDATED");
    expect(PROGRESS_EVENT_KINDS).toContain("DONE");
    for (const forbidden of ["MODEL_TOKEN", "TOKEN_DELTA", "PARTIAL", "DELTA", "MODEL_PROSE"]) {
      expect(PROGRESS_EVENT_KINDS as readonly string[]).not.toContain(forbidden);
    }
  });
  it("declares the terminal kinds + the 6 response dispositions + the disposition→terminal mapping", () => {
    expect([...PROGRESS_TERMINAL_KINDS].sort()).toEqual(["CANCELLED", "ERROR", "FINAL_VALIDATED", "HONEST_FALLBACK", "REFUSED"]);
    expect([...RESPONSE_DISPOSITIONS].sort()).toEqual(["CLARIFICATION", "DETERMINISTIC_ANSWER", "GROUNDED_ANSWER", "HONEST_FALLBACK", "INSUFFICIENT", "REFUSED"]);
    expect(TERMINAL_EVENT_BY_DISPOSITION.GROUNDED_ANSWER).toBe("FINAL_VALIDATED");
    expect(TERMINAL_EVENT_BY_DISPOSITION.REFUSED).toBe("REFUSED");
    expect(TERMINAL_EVENT_BY_DISPOSITION.INSUFFICIENT).toBe("HONEST_FALLBACK");
  });
  it("classifies kinds", () => {
    expect(isTerminalKind("FINAL_VALIDATED")).toBe(true);
    expect(isTerminalKind("SYNTHESIS_STARTED")).toBe(false);
    expect(isProgressKind("REQUEST_ACCEPTED")).toBe(true);
    expect(isProgressKind("NONSENSE")).toBe(false);
  });
});

describe("§9 processing line (event kind → label)", () => {
  it("maps each stage to its label, folding tool/source counts into the composite", () => {
    expect(progressLineFor([]).label).toBe("A interpretar a pergunta");
    expect(progressLineFor([evt("REQUEST_ACCEPTED")]).label).toBe("A interpretar a pergunta");
    expect(progressLineFor([evt("INTENT_RESOLVED")]).label).toBe("A interpretar a pergunta");
    expect(progressLineFor([evt("ENTITY_RESOLVED")]).label).toBe("A interpretar a pergunta");
    // tool/source phase composite
    const toolStream = [evt("SOURCE_RESOLVED"), evt("TOOL_COMPLETED"), evt("TOOL_COMPLETED"), evt("TOOL_STARTED")];
    expect(progressLineFor(toolStream).label).toBe("Fontes resolvidas · 2 ferramentas concluídas");
    expect(progressLineFor([evt("SOURCE_RESOLVED")]).label).toBe("Fontes resolvidas");
    expect(progressLineFor([evt("TOOL_COMPLETED")]).label).toBe("1 ferramenta concluída");
    expect(progressLineFor([evt("FACTUAL_PACKAGE_READY")]).label).toBe("A construir os factos verificáveis");
    expect(progressLineFor([evt("SYNTHESIS_STARTED")]).label).toBe("A preparar a explicação");
    expect(progressLineFor([evt("SYNTHESIS_COMPLETED")]).label).toBe("A preparar a explicação");
    expect(progressLineFor([evt("CLAIM_VERIFICATION_STARTED")]).label).toBe("A verificar afirmações");
    expect(progressLineFor([evt("CITATION_VERIFICATION_STARTED")]).label).toBe("A verificar citações");
  });
  it("ignores terminal/DONE events when deriving the in-flight line", () => {
    const s = [evt("CITATION_VERIFICATION_STARTED"), evt("FINAL_VALIDATED"), evt("DONE")];
    expect(progressLineFor(s).label).toBe("A verificar citações");
  });
  it("marks the synthesis window active only after SYNTHESIS_STARTED and before a terminal", () => {
    expect(isSynthesisActive([evt("FACTUAL_PACKAGE_READY")])).toBe(false);
    expect(isSynthesisActive([evt("SYNTHESIS_STARTED")])).toBe(true);
    expect(isSynthesisActive([evt("SYNTHESIS_STARTED"), evt("FINAL_VALIDATED")])).toBe(false);
  });
});

describe("§9 SAFE facts-available projection", () => {
  it("extracts entity / sources / tools / package from the event payloads (safe ids/enums/counts/hashes)", () => {
    const events = [
      evt("ENTITY_RESOLVED", { entity_id: "operator-zero", entity_type: "operator", artifact_type: "manifest", protocol_scope: "L0", requires_live_tool: true, authority_requirement: "none" }),
      evt("SOURCE_RESOLVED", { source_kind: "live_artifact", implementation_id: "oz-impl-1", canonical_origin: "https://zero.example", artifact_sha256: "abc123", artifact_version: "1.0.0" }),
      evt("TOOL_STARTED", { tool_kind: "METRICS_QUERY", operational_metric: "duration" }),
      evt("TOOL_COMPLETED", { tool_kind: "METRICS_QUERY", outcome: "ok", comparable_n: 3 }),
      evt("FACTUAL_PACKAGE_READY", { source: "operational_telemetry", primary_intent: "operational_metric", facts_count: 4, documentary_sources: ["ADR-042"], tools_called: ["METRICS_QUERY"], sample_size: 3, aggregation_method: "median", package_checksum: "deadbeef" }),
    ];
    const f = factsFromEvents(events);
    expect(hasAnyFact(f)).toBe(true);
    expect(f.entity?.entity_id).toBe("operator-zero");
    expect(f.sources[0].artifact_sha256).toBe("abc123");
    // TOOL_COMPLETED supersedes its matching TOOL_STARTED → one tool row with the outcome.
    expect(f.tools).toHaveLength(1);
    expect(f.tools[0].outcome).toBe("ok");
    expect(f.tools[0].comparable_n).toBe(3);
    expect(f.package?.facts_count).toBe(4);
    expect(f.package?.documentary_sources).toEqual(["ADR-042"]);
  });

  it("NEVER surfaces a prose/secret field even when a (malicious/regressed) event carries one", () => {
    const events = [
      evt("FACTUAL_PACKAGE_READY", {
        source: "grounded_synthesis",
        facts_count: 1,
        documentary_sources: ["ADR-001"],
        // Forbidden fields that must be ignored by the safe extractor:
        answer: "PROSA_SECRETA_DO_MODELO",
        answer_markdown: "PROSA_SECRETA_DO_MODELO",
        prompt: "system prompt leak",
        chain_of_thought: "raciocínio interno",
        api_key: "sk-DEADBEEF0123456789",
      }),
    ];
    const f = factsFromEvents(events);
    const s = JSON.stringify(f);
    expect(s).not.toContain("PROSA_SECRETA_DO_MODELO");
    expect(s).not.toContain("system prompt");
    expect(s).not.toContain("raciocínio interno");
    expect(s).not.toContain("sk-DEADBEEF");
    // The safe fields are still projected.
    expect(f.package?.facts_count).toBe(1);
  });

  it("reports no facts for a boundary stream (REQUEST_ACCEPTED + INTENT_RESOLVED only)", () => {
    const f = factsFromEvents([evt("REQUEST_ACCEPTED"), evt("INTENT_RESOLVED")]);
    expect(hasAnyFact(f)).toBe(false);
  });
});

describe("§12 progressive metrics", () => {
  it("computes the three metrics + TTFB as elapsed durations relative to the request start", () => {
    const start = 1000;
    const receipts = [
      { kind: "REQUEST_ACCEPTED", atMs: 1040 },
      { kind: "INTENT_RESOLVED", atMs: 1050 },
      { kind: "ENTITY_RESOLVED", atMs: 1060 },
      { kind: "FACTUAL_PACKAGE_READY", atMs: 1200 },
      { kind: "FINAL_VALIDATED", atMs: 1800 },
    ];
    const m = computeMetrics(receipts, start, 1020);
    expect(m.ttfbMs).toBe(20);
    expect(m.timeToFirstProgressMs).toBe(40);
    expect(m.timeToFirstVerifiedFactMs).toBe(200); // FACTUAL_PACKAGE_READY
    expect(m.timeToFinalValidatedAnswerMs).toBe(800);
    expect(hasStreamMetrics(m)).toBe(true);
  });
  it("falls back to the first fact-bearing event when there is no FACTUAL_PACKAGE_READY", () => {
    const m = computeMetrics([{ kind: "ENTITY_RESOLVED", atMs: 1100 }], 1000, null);
    expect(m.timeToFirstVerifiedFactMs).toBe(100);
    expect(m.ttfbMs).toBe(null);
  });
  it("is empty (no stream metrics) for a non-streamed answer", () => {
    const m = computeMetrics([], 1000, null);
    expect(m.timeToFirstProgressMs).toBe(null);
    expect(m.timeToFinalValidatedAnswerMs).toBe(null);
    expect(hasStreamMetrics(m)).toBe(false);
  });
});
