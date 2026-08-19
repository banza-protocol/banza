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
