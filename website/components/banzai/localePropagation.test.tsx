// Block E2 / Q3 — the reader's language survives every nesting level of the BanzAI workspace.
//
// The workspace is mounted once and never remounts while the reader navigates between segments, so the
// locale cannot be re-derived further down the tree: there is no pathname to consult (segment pages
// publish already-parsed state, never a URL), no browser preference to read, and no global to mutate. It
// enters at the route boundary and must arrive intact at owners several levels below.
//
// The defect this file owns is not a missing translation. It is a workspace correctly declared `en` whose
// NESTED owner nevertheless renders Portuguese — the application still valid, the route still correct,
// the semantic state untouched, every count green, and the reader reading the wrong language. So the
// harness declares English at the REAL boundary (the same component the production provider uses) and
// then reads what a nested owner actually rendered, rather than asserting that a locale value was passed.

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BanzaiLocaleBoundary, useBanzaiLocale } from "./BanzaiWorkspaceProvider";
import { GuiaPanel } from "./BanzaiAgent";
import { agentCopy } from "./agentPresentation";
import { traceCopy, traceCopyIds, traceFixtureLabel, traceStatus, TRACE_FIXTURES, type TraceReport } from "./traceVerifier";
import type { Locale } from "@/lib/i18n";

const LOCALES: Locale[] = ["pt", "en"];

/** Readable text: markup removed, entities decoded, whitespace collapsed. */
const text = (html: string): string =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#x27;|&rsquo;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * The controlled harness: an edition is declared ONCE, at the real boundary, and a genuinely nested owner
 * is rendered below it. Nothing hands the locale down as a prop — that is the point.
 */
function renderNested(locale: Locale): string {
  return text(
    renderToStaticMarkup(
      <BanzaiLocaleBoundary locale={locale}>
        <div>
          <section>
            <GuiaPanel onAsk={() => {}} onValidate={() => {}} />
          </section>
        </div>
      </BanzaiLocaleBoundary>,
    ),
  );
}

describe("Q3 — a declared edition reaches the owners nested inside it", () => {
  it("renders the English workspace in English, several levels down", () => {
    // E2-C1's owning assertion. A nested owner that resolves its copy against the Portuguese catalogue
    // while the boundary above it says `en` fails HERE and nowhere else: the boundary is still correct,
    // the tree still renders, and no count changes.
    const en = renderNested("en");
    expect(en.length).toBeGreaterThan(120);
    expect(en, "the nested guide panel is not in English").toContain(agentCopy("agent.guiaText", "en"));
    expect(en).toContain(agentCopy("agent.ruleSources", "en"));
    expect(en, "the Portuguese realization survived into the English workspace").not.toContain(
      agentCopy("agent.guiaText", "pt"),
    );
    expect(en).not.toContain(agentCopy("agent.ruleSources", "pt"));
  });

  it("renders the Portuguese workspace in Portuguese — the pair is asserted in both directions", () => {
    // Making English pass by giving both editions the same copy is the obvious wrong fix, so the
    // Portuguese direction is asserted too.
    const pt = renderNested("pt");
    expect(pt).toContain(agentCopy("agent.guiaText", "pt"));
    expect(pt).toContain(agentCopy("agent.ruleSources", "pt"));
    expect(pt).not.toContain(agentCopy("agent.guiaText", "en"));
    expect(pt).not.toContain(agentCopy("agent.ruleSources", "en"));
  });

  it("changes what the SAME nested owner renders when only the boundary changes", () => {
    // One owner, one tree, one difference: the declaration at the top. If the two renders were equal the
    // locale would be decorative.
    expect(renderNested("en")).not.toBe(renderNested("pt"));
  });
});

describe("Q3 — there is no silent Portuguese below the boundary", () => {
  it("throws instead of choosing an edition when no boundary declared one", () => {
    // The nested owner rendered OUTSIDE any boundary must fail loudly. A hook that answered "pt" here is
    // exactly the silent default that makes a wrong-language page look healthy.
    function Orphan() {
      useBanzaiLocale();
      return null;
    }
    expect(() => renderToStaticMarkup(<Orphan />)).toThrow(/no locale default exists/);
    expect(() => renderToStaticMarkup(<GuiaPanel onAsk={() => {}} onValidate={() => {}} />)).toThrow(
      /useBanzaiLocale/,
    );
  });

  it("requires the locale everywhere it is consumed", () => {
    expect(traceStatus.length).toBe(2);
    expect(traceCopy.length).toBe(2);
    expect(traceFixtureLabel.length).toBe(2);
  });
});

describe("Q3 — traceVerifier localizes the reader and nothing else", () => {
  const report = (over: Partial<TraceReport>): TraceReport => ({
    trace_id: "tr_demo",
    flow_type: "qr_payment",
    event_count: 2,
    timeline: [],
    invariant_checks: [],
    causal_summary: "",
    issues: [],
    ...over,
  });

  it("states the same verdict in both editions, in different words", () => {
    // `tone` is what the UI colours and what callers branch on: it is the ENGINE's verdict, so it must be
    // identical across editions while the sentence differs. A translation that changed the verdict — or a
    // verdict that changed with the language — fails here.
    const cases: TraceReport[] = [
      report({ issues: ["INV-STL-001 FAIL on txf_1"], invariant_checks: [{ id: "INV-STL-001", name: "n", status: "FAIL", reason: "r" }] }),
      report({ invariant_checks: [{ id: "INV-TRACE-001", name: "n", status: "PASS", reason: "r" }] }),
      report({ invariant_checks: [{ id: "INV-LEDGER-001", name: "n", status: "UNKNOWN", reason: "r" }] }),
    ];
    for (const r of cases) {
      const pt = traceStatus(r, "pt");
      const en = traceStatus(r, "en");
      expect(en.tone, "the verdict must not depend on the reader's language").toBe(pt.tone);
      expect(en.label).not.toBe(pt.label);
    }
    // PASS and FAIL are the engine's own words and stay verbatim in both editions.
    expect(traceStatus(cases[0], "en").label).toContain("FAIL");
    expect(traceStatus(cases[1], "en").label).toContain("PASS");
  });

  it("keeps the canonical trace facts out of the catalogue", () => {
    // Fixture keys, invariant ids and the demo traces themselves are protocol facts, not copy: they are
    // byte-identical whatever the reader's language.
    expect(TRACE_FIXTURES.map((f) => f.key)).toEqual(["valid", "settlement_fail", "trace_id_fail", "missing_event"]);
    // The demo traces are protocol payloads: entity types, minor units and a currency code. Nothing in
    // them is a sentence, so there is nothing in them to translate.
    const canonical = JSON.stringify(TRACE_FIXTURES.map((f) => f.trace));
    for (const literal of ["entity_id", "trace_id", "amount_minor", "AOA", "DEBIT", "CREDIT"]) {
      expect(canonical, `${literal} must stay canonical`).toContain(literal);
    }
    for (const f of TRACE_FIXTURES) {
      expect(f.trace).toBeTypeOf("object");
      const pt = traceFixtureLabel(f.key, "pt");
      const en = traceFixtureLabel(f.key, "en");
      expect(en, `${f.key} has no distinct English name`).not.toBe(pt);
      expect(en.trim().length).toBeGreaterThan(0);
    }
    // The invariant identifiers survive translation — they name a rule, they do not describe it.
    expect(traceFixtureLabel("settlement_fail", "en")).toContain("INV-STL-001");
    expect(traceFixtureLabel("trace_id_fail", "en")).toContain("INV-TRACE-001");
  });

  it("realizes every reader-facing id in both editions and no other", () => {
    const ids = traceCopyIds();
    expect(ids.length).toBe(7);
    for (const id of ids) {
      for (const l of LOCALES) expect(traceCopy(id, l).trim().length, `${id}/${l}`).toBeGreaterThan(0);
      expect(traceCopy(id, "en")).not.toBe(traceCopy(id, "pt"));
    }
    expect(() => traceCopy("no.such.id" as never, "en")).toThrow(/unknown id/);
    expect(() => traceCopy("status.pass", "de" as Locale)).toThrow(/no de realization/);
    expect(() => traceFixtureLabel("no-such-fixture", "pt")).toThrow(/unknown fixture/);
  });
});

// ── Q5 — the live progress block ─────────────────────────────────────────────────────────────────────
//
// The block shows engine data: entity ids, closed enums, reason codes, counts, checksums, durations. None
// of it may be translated. What must be is the word that NAMES each of those, and — less obviously — the
// way a duration is written: the readout formatted "1,3 s" with a Portuguese decimal comma for every
// reader. A number is a fact; the notation for it is a convention of the reader's language.

import { createElement } from "react";
import { BanzaiProgressView, BanzaiProgressMetrics } from "./BanzaiProgress";
import { PROGRESS_SCHEMA_TOKEN, progressLineFor, type ProgressEvent } from "@/lib/banzaiProgress";
import {
  PROGRESS_COPY,
  PROGRESS_IDENTICAL_ACROSS_EDITIONS,
  formatProgressMs,
  progressCopy,
  progressCopyIds,
  realizeProgressLine,
} from "./progressPresentation";

let _seq = 0;
const evt = (kind: string, payload: Record<string, unknown> = {}): ProgressEvent =>
  ({ kind: kind as ProgressEvent["kind"], schema: PROGRESS_SCHEMA_TOKEN, seq: _seq++, ts: 0, request_id: "rid", ...payload });

const EVENTS: ProgressEvent[] = [
  evt("ENTITY_RESOLVED", { entity_id: "operator-zero", entity_type: "operator", artifact_type: "manifest" }),
  evt("SOURCE_RESOLVED", { source_kind: "live_artifact", document_id: "ADR-012", document_status: "activo", artifact_sha256: "abc123" }),
  evt("TOOL_COMPLETED", { tool_kind: "REGISTRY_LOOKUP", outcome: "OK" }),
  evt("TOOL_COMPLETED", { tool_kind: "ARTIFACT_FETCH", outcome: "OK" }),
];

const progressView = (locale: Locale): string =>
  renderToStaticMarkup(
    createElement(
      BanzaiLocaleBoundary,
      { locale },
      createElement(BanzaiProgressView, { events: EVENTS, startedAt: 0 }),
    ),
  );

describe("Q5 — the progress block frames engine data in the reader's language", () => {
  it("names the same facts differently and reports the same facts identically", () => {
    const en = progressView("en");
    const pt = progressView("pt");
    // The chip LABELS are the reader's.
    expect(en).toContain(progressCopy("block.factsHeading", "en"));
    expect(en).toContain(progressCopy("chip.entity", "en"));
    expect(en).not.toContain(progressCopy("chip.entity", "pt"));
    expect(pt).toContain(progressCopy("chip.entity", "pt"));
    expect(pt).not.toContain(progressCopy("block.factsHeading", "en"));
    // The chip VALUES are engine data and are byte-identical in both.
    for (const fact of ["operator-zero", "REGISTRY_LOOKUP", "abc123", "manifest"]) {
      expect(en, `${fact} was translated`).toContain(fact);
      expect(pt).toContain(fact);
    }
  });

  it("derives the processing line from the stream, not from the language", () => {
    // Same events → same phase and the same count, in both editions.
    const line = progressLineFor(EVENTS);
    expect(line.segments.map((s) => s.id)).toEqual(["line.sourcesResolved", "line.toolsDone.many"]);
    expect(realizeProgressLine(line, "pt")).toBe("Fontes resolvidas · 2 ferramentas concluídas");
    expect(realizeProgressLine(line, "en")).toBe("Sources resolved · 2 tools completed");
    // Singular and plural are decided per edition, from the same count.
    const one = progressLineFor([evt("TOOL_COMPLETED")]);
    expect(realizeProgressLine(one, "en")).toBe("1 tool completed");
    expect(realizeProgressLine(one, "pt")).toBe("1 ferramenta concluída");
  });

  it("writes a duration the way the reader's language writes numbers, without changing it", () => {
    // The measurement is one number; only the decimal mark is a convention.
    expect(formatProgressMs(1300, "pt")).toBe("1,3 s");
    expect(formatProgressMs(1300, "en")).toBe("1.3 s");
    expect(formatProgressMs(640, "pt")).toBe("640 ms");
    expect(formatProgressMs(640, "en")).toBe("640 ms");
    expect(formatProgressMs(null, "en")).toBe("—");
    const metrics = { timeToFirstProgressMs: 120, timeToFirstVerifiedFactMs: 1300, timeToFinalValidatedAnswerMs: 2500, ttfbMs: 80 };
    const render = (l: Locale) =>
      renderToStaticMarkup(
        createElement(BanzaiLocaleBoundary, { locale: l }, createElement(BanzaiProgressMetrics, { metrics })),
      );
    expect(render("pt")).toContain("1,3 s");
    expect(render("en")).toContain("1.3 s");
    expect(render("en")).not.toContain("1,3 s");
    expect(render("en")).toContain(progressCopy("metrics.heading", "en"));
  });

  it("realizes every progress id in both editions", () => {
    const ids = progressCopyIds();
    expect(ids.length).toBeGreaterThanOrEqual(40);
    for (const id of ids) {
      for (const l of LOCALES) expect(PROGRESS_COPY[id][l].trim().length, `${id}/${l}`).toBeGreaterThan(0);
      if (PROGRESS_IDENTICAL_ACROSS_EDITIONS.includes(id)) {
        expect(PROGRESS_COPY[id].en).toBe(PROGRESS_COPY[id].pt);
      } else {
        expect(PROGRESS_COPY[id].en, `${id} English is a copy of the Portuguese`).not.toBe(PROGRESS_COPY[id].pt);
      }
    }
    expect(() => progressCopy("no.such" as never, "en")).toThrow(/unknown id/);
    expect(() => progressCopy("line.toolsDone.one", "en")).toThrow(/needs parameter "n"/);
    for (const l of LOCALES) expect(progressView(l)).not.toMatch(/\{n\}/);
  });
});

// ── Q5 — the agent shell's own stateful presentations ────────────────────────────────────────────────
//
// Two things this shell decides for itself are judgements about the answer, not copy: which engine
// verdict the last response earned, and which badge an answer carries. Both used to be decided inside the
// expression that produced the Portuguese words — and the badge decided itself a second time for its
// styling. Comparing the two editions' wording could never have caught a disagreement between them.

import { AnswerBadge, RfcPanel, answerBadgeVerdict } from "./BanzaiAgent";
import { agentCopyIds } from "./agentPresentation";

describe("Q5 — the agent shell decides its verdicts once", () => {
  it("keys every answer badge on the same verdict, whatever the reader's language", () => {
    // terminalKind wins over kind (ADR-036): an operational answer with no data must read "not enough
    // measurements", never the generic "insufficient evidence".
    const cases: Array<[string | undefined, string | undefined, string]> = [
      ["answer", "operational_duration", "operationalMeasurement"],
      ["answer", "insufficient_measurements", "insufficientMeasurements"],
      ["refusal", undefined, "safeRefusal"],
      ["unavailable", undefined, "serviceUnavailable"],
      ["uncertain", undefined, "insufficientEvidence"],
      // A refusal that ALSO carries a measurement stays a measurement badge — the precedence is a fact.
      ["refusal", "operational_duration", "operationalMeasurement"],
    ];
    for (const [kind, terminalKind, expected] of cases) {
      expect(answerBadgeVerdict(kind, terminalKind), `${kind}/${terminalKind}`).toBe(expected);
    }
    // The verdict carries no locale: it is the same value, and each edition only names it differently.
    for (const [, , verdict] of cases) {
      const id = `answerBadge.${verdict}` as Parameters<typeof agentCopy>[0];
      expect(agentCopy(id, "en")).not.toBe(agentCopy(id, "pt"));
      expect(agentCopy(id, "en").trim().length).toBeGreaterThan(0);
    }
  });

  it("renders the same badge verdict in both editions, for every answer state", () => {
    // The mapping property above is not enough: a mutation that made the ENGLISH RENDER SITE reach a
    // different verdict left `answerBadgeVerdict` untouched and survived. This reads the witness out of
    // the actual rendered badge, in both editions, so a divergence anywhere between the state and the
    // DOM fails here.
    const badge = (l: Locale, kind?: string, terminalKind?: string) =>
      renderToStaticMarkup(
        <BanzaiLocaleBoundary locale={l}>
          <AnswerBadge kind={kind} terminalKind={terminalKind} />
        </BanzaiLocaleBoundary>,
      );
    const witness = (html: string) => html.match(/data-answer-badge="([^"]*)"/)?.[1];
    const states: Array<[string | undefined, string | undefined]> = [
      ["answer", "operational_duration"],
      ["answer", "insufficient_measurements"],
      ["refusal", undefined],
      ["unavailable", undefined],
      ["uncertain", undefined],
    ];
    const seen = new Set<string>();
    for (const [kind, terminalKind] of states) {
      const en = badge("en", kind, terminalKind);
      const pt = badge("pt", kind, terminalKind);
      const v = witness(en);
      expect(v, `${kind}/${terminalKind}: no verdict rendered`).toBeTruthy();
      expect(v, `${kind}/${terminalKind}: the English badge reached a different verdict`).toBe(witness(pt));
      // …and the two editions really do say it differently.
      expect(text(en)).not.toBe(text(pt));
      seen.add(v!);
    }
    // Five states, five distinct verdicts: collapsing two of them would satisfy the equality above while
    // telling every reader the same thing about different answers.
    expect(seen.size).toBe(5);
  });

  it("never lets a degraded or unreported engine read as a confirmed local run", () => {
    // The honest-engine invariant, asserted in BOTH editions rather than in the one that happened to be
    // written first. "unconfirmed" contains "confirmed", so the check is word-bounded.
    const claims = /\bconfirmado\b|\bconfirmed\b/;
    for (const l of LOCALES) {
      expect(agentCopy("engine.confirmed", l).toLowerCase()).toMatch(claims);
      expect(agentCopy("engine.degraded", l).toLowerCase()).not.toMatch(claims);
      expect(agentCopy("engine.unreported", l).toLowerCase()).not.toMatch(claims);
      expect(agentCopy("engine.default", l).toLowerCase()).not.toMatch(claims);
      // The external-model verdict must say so plainly in both.
      expect(agentCopy("engine.external", l).toLowerCase()).toMatch(/extern/);
    }
  });

  it("renders the nested reference panel in each edition", () => {
    const render = (l: Locale) =>
      text(renderToStaticMarkup(
        <BanzaiLocaleBoundary locale={l}>
          <RfcPanel onAsk={() => {}} />
        </BanzaiLocaleBoundary>,
      ));
    const en = render("en");
    expect(en).toContain(agentCopy("rfc.intro", "en"));
    expect(en).toContain(agentCopy("section.decisionsAndRfcs", "en"));
    expect(en).not.toContain(agentCopy("rfc.intro", "pt"));
    expect(render("pt")).toContain(agentCopy("rfc.intro", "pt"));
  });

  it("realizes every agent id in both editions", () => {
    const ids = agentCopyIds();
    expect(ids.length).toBeGreaterThanOrEqual(110);
    for (const id of ids) {
      for (const l of LOCALES) expect(agentCopy(id, l).trim().length, `${id}/${l}`).toBeGreaterThan(0);
    }
  });
});

// ── Q5 — the sources block ───────────────────────────────────────────────────────────────────────────
//
// This block already HAD an English label for every source kind. It was unreachable behind a default
// parameter, so every reader saw Portuguese while the tests passed. That is the shape to check for: a
// bilingual table is not a bilingual surface until something requires the reader's edition.

import { SourceKindChip, sourceChipKind, sourceKindLabel } from "./SourceBlock";

describe("Q5 — a source's chip is resolved once and named per edition", () => {
  const chip = (l: Locale, source: { kind?: string; category?: string }) =>
    renderToStaticMarkup(
      <BanzaiLocaleBoundary locale={l}>
        <SourceKindChip source={source} />
      </BanzaiLocaleBoundary>,
    );
  const witness = (html: string) => html.match(/data-source-chip="([^"]*)"/)?.[1];

  const SOURCES = [
    { kind: "adr", category: "decision" },
    { kind: "spec", category: "normative" },
    { kind: "governance", category: "reference" },
    { kind: "code", category: "implementation" },
    { kind: "", category: "security-boundary" },
    { kind: "totally-unknown", category: "" },
  ];

  it("resolves the same chip for both editions and names it in the reader's language", () => {
    for (const s of SOURCES) {
      const en = chip("en", s);
      const pt = chip("pt", s);
      expect(witness(en), `${s.kind}/${s.category}: chips diverged`).toBe(witness(pt));
      expect(witness(en)).toBe(sourceChipKind(s));
      // The witness is not decorative: the rendered words are this kind's label in this edition.
      expect(text(en)).toBe(sourceKindLabel(String(s.kind || ""), "en"));
      expect(text(pt)).toBe(sourceKindLabel(String(s.kind || ""), "pt"));
    }
  });

  it("requires the reader's edition and never quietly answers in Portuguese", () => {
    expect(sourceKindLabel.length).toBe(2);
    // The pairs that genuinely differ must differ; the acronyms must not be invented in either edition.
    for (const kind of ["spec", "contract", "conformance", "governance", "reference", "code", "doc"]) {
      expect(sourceKindLabel(kind, "en"), `${kind} is untranslated`).not.toBe(sourceKindLabel(kind, "pt"));
    }
    for (const kind of ["adr", "rfc"]) {
      expect(sourceKindLabel(kind, "en")).toBe(sourceKindLabel(kind, "pt"));
    }
    // An unclassified source is labelled honestly in both — never as a reference it is not.
    expect(sourceKindLabel("nope", "pt")).toBe("FONTE");
    expect(sourceKindLabel("nope", "en")).toBe("SOURCE");
  });
});

// ── Q5 — the answer-transparency panel ───────────────────────────────────────────────────────────────
//
// This is where BanzAI states what it actually did. An English reader receiving that account in
// Portuguese is the worst version of the defect this block exists to prevent, and the validator's verdict
// is the sharpest claim on the panel: it says whether the answer was accepted.

import { AnswerValidationValue, answerValidationVerdict, TransparencyPanel } from "./TransparencyPanel";
import type { KbTransparency } from "@/components/home/banzaiKb";

describe("Q5 — the transparency panel accounts for itself in the reader's language", () => {
  const validation = (l: Locale, status: string) =>
    renderToStaticMarkup(
      <BanzaiLocaleBoundary locale={l}>
        <AnswerValidationValue status={status} />
      </BanzaiLocaleBoundary>,
    );
  const witness = (html: string) => html.match(/data-answer-validation="([^"]*)"/)?.[1];

  it("reaches the same validator verdict in both editions, and the words match the witness", () => {
    const CASES: Array<[string, string]> = [
      ["rejected", "rejected"],
      ["passed", "passed"],
      ["n/a", "notApplicable"],
      ["n_a", "notApplicable"],
    ];
    for (const [status, expected] of CASES) {
      const en = validation("en", status);
      const pt = validation("pt", status);
      expect(witness(en), `${status}: wrong verdict`).toBe(expected);
      expect(witness(en), `${status}: the English panel reached a different verdict`).toBe(witness(pt));
      expect(text(en)).toBe(agentCopy(`tp.validation.${expected}` as never, "en"));
      expect(text(en)).not.toBe(text(pt));
    }
    // Rejected and passed must never read the same — that is the whole point of the row.
    for (const l of LOCALES) expect(text(validation(l, "rejected"))).not.toBe(text(validation(l, "passed")));
    // A verdict the backend invents tomorrow is shown as it arrived, in both editions.
    for (const l of LOCALES) expect(text(validation(l, "SOMETHING_NEW"))).toBe("SOMETHING_NEW");
    expect(answerValidationVerdict("SOMETHING_NEW")).toBeNull();
  });

  it("renders the panel's field names in the reader's edition", () => {
    // The shape the mapper really produces — arrays present and empty rather than absent, which is what
    // the panel's own render harness uses.
    const projection = {
      correctionDisplay: [],
      intent: "grounded",
      answerType: "how_it_works",
      questionFamily: null,
      subIntents: [],
      entity: null,
      scope: null,
      tools: [],
      sources: [{ id: "ADR-012", title: "t", path: "p" }],
      engine: "local_qwen",
      modelCalled: false,
      validationStatus: "passed",
      limitations: [],
    } as unknown as KbTransparency;
    const render = (l: Locale) =>
      text(
        renderToStaticMarkup(
          <BanzaiLocaleBoundary locale={l}>
            <TransparencyPanel t={projection} />
          </BanzaiLocaleBoundary>,
        ),
      );
    const en = render("en");
    const pt = render("pt");
    expect(en).toContain(agentCopy("tp.heading", "en"));
    expect(en).not.toContain(agentCopy("tp.heading", "pt"));
    expect(pt).toContain(agentCopy("tp.heading", "pt"));
    // "The model was not called" is a factual claim about this answer and must survive translation.
    expect(en).toContain(agentCopy("tp.model.notCalled", "en"));
    expect(en).not.toContain(agentCopy("tp.model.notCalled", "pt"));
    // The engine name and the resolved intent are DATA and are byte-identical in both editions — the
    // panel reports what ran, and what ran does not change with the reader's language.
    for (const out of [en, pt]) {
      expect(out).toContain("local_qwen");
      expect(out).toContain("grounded");
      expect(out).toContain("how_it_works");
    }
  });
});

// ── Q5 — the developer tools panel (the last owner) ──────────────────────────────────────────────────

import { ProgramadoresTools } from "./ProgramadoresTools";

describe("Q5 — the developer panel renders in the reader's edition", () => {
  const render = (l: Locale) =>
    text(
      renderToStaticMarkup(
        <BanzaiLocaleBoundary locale={l}>
          <ProgramadoresTools onAsk={() => {}} />
        </BanzaiLocaleBoundary>,
      ),
    );

  it("renders each edition's own copy and neither the other's", () => {
    const en = render("en");
    const pt = render("pt");
    for (const id of ["dev.title", "dev.intro", "dev.section.publicEndpoints", "dev.opensNewTab"] as const) {
      expect(en, `${id} is not in English`).toContain(agentCopy(id, "en"));
      expect(pt).toContain(agentCopy(id, "pt"));
      expect(en, `${id} leaked the Portuguese realization`).not.toContain(agentCopy(id, "pt"));
    }
    // The panel's whole point is that official validation happens elsewhere; both editions say so.
    expect(agentCopy("dev.intro", "en")).toMatch(/originates at the public endpoints/);
  });
});
