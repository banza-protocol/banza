// SPR-5 — the progressive interface (§9) + metrics (§12) render. Rendered with react-dom/server (no DOM), the
// SAME harness the other BanzAI render tests use. The safety-critical property proven here: the progressive
// view renders the processing line, the safe fact cards and the synthesis state — and renders NO answer prose,
// even when a (malicious/regressed) Channel-A event carries an `answer`/`prompt`/secret field.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BanzaiProgressView, BanzaiProgressMetrics } from "@/components/banzai/BanzaiProgress";
import { PROGRESS_SCHEMA_TOKEN, type ProgressEvent, type ProgressMetrics } from "@/lib/banzaiProgress";

let _seq = 0;
function evt(kind: string, payload: Record<string, unknown> = {}): ProgressEvent {
  return { kind: kind as ProgressEvent["kind"], schema: PROGRESS_SCHEMA_TOKEN, seq: _seq++, ts: 0, request_id: "rid", ...payload };
}
const view = (events: ProgressEvent[], reducedMotion = false) =>
  renderToStaticMarkup(createElement(BanzaiProgressView, { events, startedAt: Date.now(), reducedMotion }));

describe("BanzaiProgressView — §9 processing line", () => {
  it("shows the interpret line at the start and the composite tool/source line", () => {
    expect(view([evt("REQUEST_ACCEPTED")])).toContain("A interpretar a pergunta");
    const out = view([evt("SOURCE_RESOLVED"), evt("TOOL_COMPLETED"), evt("TOOL_COMPLETED")]);
    expect(out).toContain("Fontes resolvidas · 2 ferramentas concluídas");
  });
  it("exposes a polite live region for assistive tech", () => {
    const out = view([evt("REQUEST_ACCEPTED")]);
    expect(out).toContain('aria-live="polite"');
    expect(out).toContain('role="status"');
    expect(out).toContain("Progresso do BanzAI");
  });
  it("honours prefers-reduced-motion (no pulse when reduced)", () => {
    expect(view([evt("REQUEST_ACCEPTED")], false)).toContain("animate-bounce");
    expect(view([evt("REQUEST_ACCEPTED")], true)).not.toContain("animate-bounce");
  });
});

describe("BanzaiProgressView — §9 facts-available cards + synthesis state", () => {
  it("renders SAFE fact cards (ids/enums/counts/hashes) from the events", () => {
    const out = view([
      evt("ENTITY_RESOLVED", { entity_id: "operator-zero", entity_type: "operator", artifact_type: "manifest" }),
      evt("SOURCE_RESOLVED", { source_kind: "live_artifact", artifact_sha256: "abc123", artifact_version: "1.0.0" }),
      evt("FACTUAL_PACKAGE_READY", { source: "grounded_synthesis", facts_count: 3, documentary_sources: ["ADR-001"], package_checksum: "deadbeef" }),
    ]);
    expect(out).toContain("FACTOS VERIFICÁVEIS");
    expect(out).toContain("operator-zero");
    expect(out).toContain("abc123");
    expect(out).toContain("deadbeef");
    expect(out).toContain("ADR-001");
  });
  it("shows the synthesis state (never model prose) during the synthesis window", () => {
    const out = view([evt("FACTUAL_PACKAGE_READY", { facts_count: 1 }), evt("SYNTHESIS_STARTED", { model: "qwen-test" })]);
    expect(out).toContain("A preparar uma explicação baseada nos factos verificados");
  });

  it("renders NO answer prose even when an event carries a forbidden prose/secret field", () => {
    const out = view([
      evt("FACTUAL_PACKAGE_READY", {
        source: "grounded_synthesis",
        facts_count: 1,
        documentary_sources: ["ADR-001"],
        answer: "PROSA_SECRETA_DO_MODELO",
        answer_markdown: "PROSA_SECRETA_DO_MODELO",
        prompt: "system prompt leak",
        chain_of_thought: "raciocínio interno",
        api_key: "sk-DEADBEEF0123456789",
      }),
      evt("SYNTHESIS_STARTED", { model: "qwen-test", answer: "PROSA_SECRETA_DO_MODELO" }),
    ]);
    expect(out).not.toContain("PROSA_SECRETA_DO_MODELO");
    expect(out).not.toContain("system prompt");
    expect(out).not.toContain("raciocínio interno");
    expect(out).not.toContain("sk-DEADBEEF");
    // The safe fields are still shown.
    expect(out).toContain("ADR-001");
  });

  it("a boundary stream shows NO facts and NO synthesis state (REQUEST_ACCEPTED + INTENT_RESOLVED only)", () => {
    const out = view([evt("REQUEST_ACCEPTED"), evt("INTENT_RESOLVED", { intent: "action_boundary" })]);
    expect(out).not.toContain("FACTOS VERIFICÁVEIS");
    expect(out).not.toContain("A preparar uma explicação");
  });
});

describe("BanzaiProgressMetrics — §12", () => {
  const metrics: ProgressMetrics = { ttfbMs: 20, timeToFirstProgressMs: 40, timeToFirstVerifiedFactMs: 200, timeToFinalValidatedAnswerMs: 1800 };
  it("renders the three metrics + TTFB for a streamed answer", () => {
    const out = renderToStaticMarkup(createElement(BanzaiProgressMetrics, { metrics }));
    expect(out).toContain("MÉTRICAS PROGRESSIVAS");
    expect(out).toContain("PRIMEIRO PROGRESSO");
    expect(out).toContain("PRIMEIRO FACTO VERIFICÁVEL");
    expect(out).toContain("RESPOSTA VALIDADA");
    expect(out).toContain("1,8 s");
    expect(out).toContain("40 ms");
  });
  it("renders nothing when there are no stream metrics (a non-streamed answer)", () => {
    const empty: ProgressMetrics = { ttfbMs: null, timeToFirstProgressMs: null, timeToFirstVerifiedFactMs: null, timeToFinalValidatedAnswerMs: null };
    expect(renderToStaticMarkup(createElement(BanzaiProgressMetrics, { metrics: empty }))).toBe("");
  });
});
