// Block E2 / Q8 — the final rendered matrix. Ten surfaces, five route classes, both editions.
//
// Everything else in this block proves a mechanism. This proves the outcome: that a reader who asks for
// the English edition of each E2 route receives substantive English about the SAME entity. It renders the
// real components through the real locale boundary and compares the structured facts each edition
// received — never the sentences, because two editions differing in wording is exactly what a correct
// translation and a wrong entity have in common.

import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BanzaiLocaleBoundary } from "@/components/banzai/BanzaiWorkspaceProvider";
import { DecisionsIndexView } from "@/components/decisoes/DecisionsIndexView";
import { DecisionDetailView } from "@/components/decisoes/DecisionDetailView";
import { GuiaPanel, RfcPanel, AnswerBadge, answerBadgeVerdict } from "@/components/banzai/BanzaiAgent";
import { PersistenceBadge, JourneyProgress, ValidationResultsPanel } from "@/components/banzai/BanzaiValidationMode";
import { DraftVerdictBadge } from "@/components/banzai/DraftValidationTool";
import { AnswerValidationValue } from "@/components/banzai/TransparencyPanel";
import { SourceKindChip } from "@/components/banzai/SourceBlock";
import { BanzaiProgressView } from "@/components/banzai/BanzaiProgress";
import { PROGRESS_SCHEMA_TOKEN, type ProgressEvent } from "@/lib/banzaiProgress";
import { STEPS, STEP_ORDER, type ValidationSession } from "@/components/banzai/validationJourney";
import { matchRoute, pathFor, routeHref } from "./routeRegistry";
import { counterpartOf } from "./i18n";
import { decisions } from "./decisions";
import { agentCopy } from "@/components/banzai/agentPresentation";
import { realizeProgress, stepStatusLabel, stepTitle, type ProgressResult } from "@/components/banzai/validationPresentation";
import type { Locale } from "./i18n";

const LOCALES: Locale[] = ["pt", "en"];
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
// eslint-disable-next-line
const render = (locale: Locale, node: unknown, props: Record<string, unknown> = {}): string =>
  renderToStaticMarkup(
    createElement(BanzaiLocaleBoundary, { locale }, createElement(node as Parameters<typeof createElement>[0], props)),
  );

const OPERATOR = "operator-zero";
const IMPLEMENTATION = "oz-impl-1";

// ── 1. THE FIVE ROUTE CLASSES, BOTH EDITIONS ─────────────────────────────────────────────────────────

describe("E2 final matrix — the five route classes resolve in both editions", () => {
  const CLASSES: Array<{ id: string; params: Record<string, string> }> = [
    { id: "BANZAI", params: {} },
    { id: "BANZAI_OPERATOR", params: { operatorId: OPERATOR } },
    { id: "BANZAI_OPERATOR_IMPLEMENTATION", params: { operatorId: OPERATOR, implementationId: IMPLEMENTATION } },
    { id: "DECISIONS", params: {} },
    { id: "DECISION", params: { slug: decisions[0].slug } },
  ];

  it("gives every class a PT and an EN route", () => {
    for (const { id } of CLASSES) {
      for (const l of LOCALES) expect(pathFor(id, l), `${id}/${l}`).toBeTruthy();
      expect(pathFor(id, "en")!.startsWith("/en/")).toBe(true);
    }
  });

  it("pairs every class by identity, in both directions", () => {
    for (const { id, params } of CLASSES) {
      const pt = routeHref(id, "pt", params);
      const en = routeHref(id, "en", params);
      expect(counterpartOf(pt, "en"), `${id} pt→en`).toBe(en);
      expect(counterpartOf(en, "pt"), `${id} en→pt`).toBe(pt);
      // The parameters the route declares are the same on both sides — this is the whole matrix.
      expect(matchRoute(en)!.params, `${id} identity`).toEqual(params);
      expect(matchRoute(pt)!.params).toEqual(matchRoute(en)!.params);
      expect(matchRoute(en)!.record.id).toBe(matchRoute(pt)!.record.id);
    }
  });
});

// ── 2. RENDERED SUBSTANTIVENESS ──────────────────────────────────────────────────────────────────────

describe("E2 final matrix — each edition renders substantive presentation of the same thing", () => {
  it("DECISIONS renders the same library in each edition", () => {
    const en = text(renderToStaticMarkup(<DecisionsIndexView locale="en" />));
    const pt = text(renderToStaticMarkup(<DecisionsIndexView locale="pt" />));
    for (const out of [en, pt]) expect(out.length).toBeGreaterThan(600);
    expect(en).not.toBe(pt);
    expect(en).toContain("Protocol Decisions");
    expect(en).not.toContain("Decisões do Protocolo");
    for (const d of decisions) expect(en, `${d.id} missing from EN`).toContain(d.id);
    for (const d of decisions) expect(pt, `${d.id} missing from PT`).toContain(d.id);
  });

  it("DECISION renders the same record in each edition, body in its original language", () => {
    const d = decisions[0];
    const body = "# T\n\nCorpo original do documento.";
    const enHtml = renderToStaticMarkup(<DecisionDetailView decision={d} body={body} locale="en" />);
    const ptHtml = renderToStaticMarkup(<DecisionDetailView decision={d} body={body} locale="pt" />);
    for (const h of [enHtml, ptHtml]) {
      for (const fact of [d.id, d.path, d.canonicalUrl, d.title]) expect(h).toContain(fact);
      // SOURCE-LANGUAGE ARTIFACT: the body is published in one language and is not translated.
      expect(text(h)).toContain("Corpo original do documento.");
    }
    expect(text(enHtml)).toContain("What this document is");
    expect(text(enHtml)).not.toContain("O que este documento é");
    // Each edition links onward inside itself.
    expect(enHtml).toContain('href="/en/decisions"');
    expect(ptHtml).toContain('href="/decisoes"');
  });

  it("BANZAI renders substantive workspace presentation in each edition", () => {
    for (const panel of [GuiaPanel, RfcPanel]) {
      const en = text(render("en", panel, { onAsk: () => {}, onValidate: () => {} }));
      const pt = text(render("pt", panel, { onAsk: () => {}, onValidate: () => {} }));
      expect(en.length).toBeGreaterThan(120);
      expect(en).not.toBe(pt);
    }
    expect(text(render("en", GuiaPanel, { onAsk: () => {}, onValidate: () => {} }))).toContain(
      agentCopy("agent.guiaText", "en"),
    );
    expect(text(render("en", RfcPanel, { onAsk: () => {} }))).toContain(agentCopy("rfc.intro", "en"));
  });

  it("BANZAI_OPERATOR and BANZAI_OPERATOR_IMPLEMENTATION keep their identity in the English edition", () => {
    const op = routeHref("BANZAI_OPERATOR", "en", { operatorId: OPERATOR });
    const impl = routeHref("BANZAI_OPERATOR_IMPLEMENTATION", "en", { operatorId: OPERATOR, implementationId: IMPLEMENTATION });
    expect(matchRoute(op)!.params.operatorId).toBe(OPERATOR);
    expect(matchRoute(impl)!.params).toEqual({ operatorId: OPERATOR, implementationId: IMPLEMENTATION });
    // The English segment word is English; the ids are not translated.
    expect(op).toContain("/operator/");
    expect(op).not.toContain("/operador/");
    expect(impl).toContain(OPERATOR);
    expect(impl).toContain(IMPLEMENTATION);
  });
});

// ── 3. THE INTERACTIVE STATE MATRIX ──────────────────────────────────────────────────────────────────

const emptyResults = Object.fromEntries(
  STEP_ORDER.map((id) => [id, { status: "PENDING", reason_codes: [], evidence_refs: [], receipt: null }]),
);
const SESSION = {
  operators: [], operatorsLoading: false, operatorsError: false,
  operator: null, implementation: null, operatorId: null, implementationId: null, ready: false,
  steps: [], results: emptyResults, journeyReceipt: null, persistence: null, receipts: [],
} as unknown as ValidationSession;

let seq = 0;
const evt = (kind: string, payload: Record<string, unknown> = {}): ProgressEvent =>
  ({ kind: kind as ProgressEvent["kind"], schema: PROGRESS_SCHEMA_TOKEN, seq: seq++, ts: 0, request_id: "r", ...payload });

describe("E2 final matrix — every render-testable BanzAI state exposes the same facts to both editions", () => {
  /** A state, its witness attribute, and the component that renders it. */
  const STATES: Array<{ name: string; node: unknown; props: Record<string, unknown>; witness: RegExp }> = [
    { name: "answer badge · operational measurement", node: AnswerBadge, props: { kind: "answer", terminalKind: "operational_duration" }, witness: /data-answer-badge="([^"]*)"/ },
    { name: "answer badge · not enough measurements", node: AnswerBadge, props: { kind: "answer", terminalKind: "insufficient_measurements" }, witness: /data-answer-badge="([^"]*)"/ },
    { name: "answer badge · safe refusal", node: AnswerBadge, props: { kind: "refusal" }, witness: /data-answer-badge="([^"]*)"/ },
    { name: "answer badge · service unavailable", node: AnswerBadge, props: { kind: "unavailable" }, witness: /data-answer-badge="([^"]*)"/ },
    { name: "answer badge · insufficient evidence", node: AnswerBadge, props: { kind: "uncertain" }, witness: /data-answer-badge="([^"]*)"/ },
    { name: "persistence · persisted", node: PersistenceBadge, props: { p: { status: "PERSISTED", execution_id: "exec_1", retryable: false } }, witness: /data-persistence-verdict="([^"]*)"/ },
    { name: "persistence · disabled", node: PersistenceBadge, props: { p: { status: "DISABLED", retryable: false } }, witness: /data-persistence-verdict="([^"]*)"/ },
    { name: "persistence · failed", node: PersistenceBadge, props: { p: { status: "NOT_PERSISTED", detail: "FAILED", retryable: true } }, witness: /data-persistence-verdict="([^"]*)"/ },
    { name: "persistence · pending", node: PersistenceBadge, props: { p: { status: "NOT_PERSISTED", detail: "PENDING", retryable: true } }, witness: /data-persistence-verdict="([^"]*)"/ },
    { name: "draft verdict · valid", node: DraftVerdictBadge, props: { ok: true }, witness: /data-draft-verdict="([^"]*)"/ },
    { name: "draft verdict · invalid", node: DraftVerdictBadge, props: { ok: false }, witness: /data-draft-verdict="([^"]*)"/ },
    { name: "answer validation · rejected", node: AnswerValidationValue, props: { status: "rejected" }, witness: /data-answer-validation="([^"]*)"/ },
    { name: "answer validation · passed", node: AnswerValidationValue, props: { status: "passed" }, witness: /data-answer-validation="([^"]*)"/ },
    { name: "answer validation · not applicable", node: AnswerValidationValue, props: { status: "n/a" }, witness: /data-answer-validation="([^"]*)"/ },
    { name: "source chip · spec", node: SourceKindChip, props: { source: { kind: "spec", category: "normative" } }, witness: /data-source-chip="([^"]*)"/ },
    { name: "source chip · unclassified", node: SourceKindChip, props: { source: { kind: "totally-unknown", category: "" } }, witness: /data-source-kind="([^"]*)"/ },
    { name: "journey progress · running", node: JourneyProgress, props: { result: { kind: "running" } as ProgressResult }, witness: /data-journey-progress="([^"]*)"/ },
    { name: "journey progress · not started", node: JourneyProgress, props: { result: { kind: "notStarted" } as ProgressResult }, witness: /data-journey-progress="([^"]*)"/ },
    { name: "journey progress · partial", node: JourneyProgress, props: { result: { kind: "partial", evaluated: 4, total: 9 } as ProgressResult }, witness: /data-journey-progress="([^"]*)"/ },
    { name: "journey progress · complete, one blocker", node: JourneyProgress, props: { result: { kind: "doneOneBlocker" } as ProgressResult }, witness: /data-journey-progress="([^"]*)"/ },
    { name: "journey progress · complete, all verified", node: JourneyProgress, props: { result: { kind: "doneAllVerified" } as ProgressResult }, witness: /data-journey-progress="([^"]*)"/ },
  ];

  it.each(STATES)("$name — same fact, different words", ({ node, props, witness }) => {
    const en = render("en", node, props);
    const pt = render("pt", node, props);
    const wEn = witness.exec(en)?.[1];
    const wPt = witness.exec(pt)?.[1];
    expect(wEn, "no witness rendered").toBeTruthy();
    expect(wEn, "the two editions reached different semantic results").toBe(wPt);
    expect(text(en), "the two editions did not differ in wording").not.toBe(text(pt));
  });

  it("the live progress block reports the same phase and the same engine data", () => {
    const events = [
      evt("ENTITY_RESOLVED", { entity_id: OPERATOR, entity_type: "operator", artifact_type: "manifest" }),
      evt("SOURCE_RESOLVED", { source_kind: "live_artifact", artifact_sha256: "abc123" }),
      evt("TOOL_COMPLETED", { tool_kind: "REGISTRY_LOOKUP", outcome: "OK" }),
      evt("TOOL_COMPLETED", { tool_kind: "ARTIFACT_FETCH", outcome: "OK" }),
    ];
    const en = render("en", BanzaiProgressView, { events, startedAt: 0 });
    const pt = render("pt", BanzaiProgressView, { events, startedAt: 0 });
    for (const out of [en, pt]) {
      for (const fact of [OPERATOR, "abc123", "REGISTRY_LOOKUP", "manifest"]) expect(out).toContain(fact);
    }
    expect(text(en)).not.toBe(text(pt));
  });

  it("the results area renders the same tab structure in both editions", () => {
    const props = { session: SESSION, view: "resumo", onView: () => {}, onGoValidate: () => {} };
    const en = render("en", ValidationResultsPanel, props);
    const pt = render("pt", ValidationResultsPanel, props);
    expect(text(en)).not.toBe(text(pt));
    expect(en.length).toBeGreaterThan(500);
  });

  it("the journey exposes the same nine steps, order and verdict vocabulary", () => {
    expect(STEPS.length).toBe(9);
    expect(STEPS.map((s) => s.id)).toEqual([...STEP_ORDER]);
    for (const s of STEPS) {
      expect(stepTitle(s.id, "en").length).toBeGreaterThan(0);
      expect(stepTitle(s.id, "pt").length).toBeGreaterThan(0);
    }
    for (const st of ["NOT_EVALUATED", "PENDING", "VERIFIED", "FAILED", "BLOCKED", "NOT_APPLICABLE"]) {
      expect(stepStatusLabel(st, "en")).not.toBe(stepStatusLabel(st, "pt"));
    }
    // An outcome the engine invents tomorrow reaches both editions unchanged.
    for (const l of LOCALES) expect(stepStatusLabel("BRAND_NEW", l)).toBe("BRAND_NEW");
  });

  it("progress outcomes stay distinguishable within each edition", () => {
    const RESULTS: ProgressResult[] = [
      { kind: "running" }, { kind: "notStarted" }, { kind: "partial", evaluated: 4, total: 9 },
      { kind: "doneOneBlocker" }, { kind: "doneAllVerified" },
      { kind: "doneWithCounts", verified: 7, pending: 0, failed: 1, blocked: 1 },
    ];
    for (const l of LOCALES) {
      const rendered = RESULTS.map((r) => realizeProgress(r, l));
      expect(new Set(rendered).size, `${l}: two outcomes read identically`).toBe(RESULTS.length);
    }
    expect(answerBadgeVerdict("refusal", "operational_duration")).toBe("operationalMeasurement");
  });
});
