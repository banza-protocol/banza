// Increment 9 (§24) — the per-answer transparency layer. Rendered with react-dom/server (no DOM). These
// tests prove the mandate: EACH field renders only when present and is omitted otherwise, nothing is
// fabricated, and a degraded/insufficient/boundary answer shows the honest limitations line.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
// Block E2/Q5 — the panel reads its edition from the workspace boundary and has no default, so the
// harness declares one. These assertions keep pinning the PORTUGUESE surface.
import { BanzaiLocaleBoundary } from "@/components/banzai/BanzaiWorkspaceProvider";
import { TransparencyPanel } from "@/components/banzai/TransparencyPanel";
import type { KbTransparency } from "@/components/home/banzaiKb";

const empty: KbTransparency = {
  correctionDisplay: [],
  intent: null,
  answerType: null,
  questionFamily: null,
  subIntents: [],
  entity: null,
  scope: null,
  tools: [],
  sourceCount: 0,
  sourceTypes: [],
  authority: null,
  observedAt: null,
  sha256: null,
  canonicalOrigin: null,
  calculation: null,
  engine: null,
  runtimeVersion: null,
  modelCalled: null,
  confidenceBand: null,
  claimVerification: null,
  citationVerification: null,
  validationStatus: null,
  totalDurationMs: null,
  limitations: [],
};

const full: KbTransparency = {
  correctionDisplay: ["federação"],
  intent: "grounded",
  answerType: "how_it_works",
  questionFamily: "get_requirement",
  subIntents: ["manifest", "keys"],
  entity: { id: "operator-zero", type: "operator", display: "Operador Zero", operatorId: "operator-zero", implementationId: "oz-impl-1" },
  scope: { profile: "L0", environment: "sandbox", protocolVersion: "1.0", protocolScope: "AO", artifactType: "manifest" },
  tools: [
    { kind: "LIVE_ARTIFACT_FETCH", outcome: "ok", durationMs: 340 },
    { kind: "REGISTRY_LOOKUP", outcome: "ok", durationMs: 12 },
  ],
  sourceCount: 3,
  sourceTypes: [
    { label: "Decisão", count: 2 },
    { label: "Código", count: 1 },
  ],
  authority: { kind: "origin_bound", scope: "implementation", requirement: "canonical_origin" },
  observedAt: "2026-08-06T10:00:00Z",
  sha256: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
  canonicalOrigin: "https://zero.banza.network",
  calculation: { method: "percentile_cont", sampleSize: 12, count: 3, period: "2026-08-01 – 2026-08-06" },
  engine: "local_qwen",
  runtimeVersion: "idx-42",
  modelCalled: true,
  confidenceBand: "high",
  claimVerification: { ok: true, errors: 0 },
  citationVerification: { ok: true, errors: 0 },
  validationStatus: "passed",
  totalDurationMs: 8700,
  limitations: [],
};

describe("TransparencyPanel (§24) — renders each field only when present", () => {
  it("renders every populated field of a full transparency projection", () => {
    const out = renderToStaticMarkup(createElement(BanzaiLocaleBoundary, { locale: "pt" as const }, createElement(TransparencyPanel, { t: full })));
    expect(out).toContain('data-transparency="1"');
    expect(out).toContain("TRANSPARÊNCIA DA RESPOSTA");
    for (const tp of ["interpretation", "entity", "scope", "tools", "sources", "freshness", "calculation", "runtime", "verification"]) {
      expect(out).toContain(`data-tp="${tp}"`);
    }
    // Real, non-fabricated values from the projection.
    expect(out).toContain("Operador Zero");
    expect(out).toContain("LIVE_ARTIFACT_FETCH");
    expect(out).toContain("percentile_cont");
    expect(out).toContain("local_qwen");
    expect(out).toContain("high");
    // The SHA-256 is truncated for display (never the full 64-char digest verbatim).
    expect(out).not.toContain(full.sha256);
    expect(out).toContain("abcdef012345");
    // Source-type provenance breakdown.
    expect(out).toContain("Decisão");
  });

  it("OMITS every absent field (no placeholders) for a minimal projection", () => {
    const minimal: KbTransparency = { ...empty, intent: "grounded", engine: "local_qwen" };
    const out = renderToStaticMarkup(createElement(BanzaiLocaleBoundary, { locale: "pt" as const }, createElement(TransparencyPanel, { t: minimal })));
    expect(out).toContain('data-transparency="1"');
    // Present signals render.
    expect(out).toContain('data-tp="interpretation"');
    expect(out).toContain('data-tp="runtime"');
    // Absent signals are omitted entirely — no empty scaffolding.
    for (const tp of ["entity", "scope", "tools", "sources", "freshness", "calculation", "verification", "limitations"]) {
      expect(out).not.toContain(`data-tp="${tp}"`);
    }
  });

  it("shows the honest limitations line for a degraded / insufficient / boundary answer", () => {
    const degraded: KbTransparency = { ...empty, engine: "degraded", limitations: ["Modo degradado — resposta determinística a partir das fontes do protocolo."] };
    const dout = renderToStaticMarkup(createElement(BanzaiLocaleBoundary, { locale: "pt" as const }, createElement(TransparencyPanel, { t: degraded })));
    expect(dout).toContain('data-tp="limitations"');
    expect(dout).toContain("LIMITAÇÕES");
    expect(dout).toContain("Modo degradado");

    const boundary: KbTransparency = { ...empty, limitations: ["Pedido fora das fronteiras do BanzAI — recusa segura."] };
    const bout = renderToStaticMarkup(createElement(BanzaiLocaleBoundary, { locale: "pt" as const }, createElement(TransparencyPanel, { t: boundary })));
    expect(bout).toContain('data-tp="limitations"');
    expect(bout).toContain("recusa segura");
  });

  it("renders 'sem chamada' when the engine did NOT call a model (false is meaningful, not absent)", () => {
    const noModel: KbTransparency = { ...empty, engine: "local_qwen", modelCalled: false };
    const out = renderToStaticMarkup(createElement(BanzaiLocaleBoundary, { locale: "pt" as const }, createElement(TransparencyPanel, { t: noModel })));
    expect(out).toContain('data-tp="runtime"');
    expect(out).toContain("sem chamada");
  });
});
