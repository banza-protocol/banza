// Block E2 / Q6 — a language switch must not change WHICH THING you are looking at.
//
// Every other property in this block asks whether a reader gets the right words. This one asks something
// prior: whether they get the right entity. A switch that lands on a valid English page for a DIFFERENT
// operator is not a translation bug — it is the reader silently being shown someone else's implementation,
// and it looks perfect from the outside. The route resolves, the page renders, the English is fluent, the
// registry is complete, and nothing in the words is wrong.
//
// So the assertions here compare route IDENTITY — the parameters the route declares — and never labels or
// URL shape. `startsWith("/en")` would pass for every one of the failures this file exists to catch.

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { counterpartOf, matchRoute, pathFor, patternParams, routeHref } from "./routeRegistry";
import { counterpartOf as switchTo } from "./i18n";
import { decisions } from "./decisions";
import { DecisionDetailView } from "@/components/decisoes/DecisionDetailView";
import { DecisionsIndexView } from "@/components/decisoes/DecisionsIndexView";
import type { Locale } from "./i18n";

const LOCALES: Locale[] = ["pt", "en"];

// Real ids from the closed registry's shape. The identity property is about parameters surviving the
// switch, so what matters is that they are concrete and distinguishable from one another.
const OPERATOR = "operator-zero";
const OTHER_OPERATOR = "operator-a";
const IMPLEMENTATION = "oz-impl-1";
const OTHER_IMPLEMENTATION = "oz-impl-2";

/** The parameters a concrete pathname carries, as the registry resolves them. */
const identityOf = (pathname: string) => {
  const hit = matchRoute(pathname);
  return hit ? { id: hit.record.id, locale: hit.locale, params: hit.params } : null;
};

describe("Q6 — the five route classes pair by identity, in both directions", () => {
  it("BANZAI: both editions address the same workspace", () => {
    expect(pathFor("BANZAI", "pt")).toBe("/banzai");
    expect(pathFor("BANZAI", "en")).toBe("/en/banzai");
    expect(counterpartOf("/banzai")).toBe("/en/banzai");
    expect(counterpartOf("/en/banzai")).toBe("/banzai");
    // Both resolve to the SAME semantic route record — not merely to two valid pages.
    expect(identityOf("/banzai")!.id).toBe("BANZAI");
    expect(identityOf("/en/banzai")!.id).toBe("BANZAI");
  });

  it("BANZAI_OPERATOR: the operatorId crosses the switch unchanged, both ways", () => {
    const pt = routeHref("BANZAI_OPERATOR", "pt", { operatorId: OPERATOR });
    const en = routeHref("BANZAI_OPERATOR", "en", { operatorId: OPERATOR });
    expect(pt).toBe(`/banzai/operador/${OPERATOR}`);
    expect(en).toBe(`/en/banzai/operator/${OPERATOR}`);
    // The switch — in BOTH directions — preserves the operator. This is the assertion E2-D must break.
    expect(counterpartOf(pt)).toBe(en);
    expect(counterpartOf(en)).toBe(pt);
    expect(identityOf(en)!.params.operatorId).toBe(OPERATOR);
    expect(identityOf(counterpartOf(pt)!)!.params.operatorId).toBe(identityOf(pt)!.params.operatorId);
    // …and it does NOT land on the parent context, which is the tempting fallback.
    expect(counterpartOf(pt)).not.toBe("/en/banzai");
    // A different operator is a different route. If these were equal the property above would be vacuous.
    expect(routeHref("BANZAI_OPERATOR", "en", { operatorId: OTHER_OPERATOR })).not.toBe(en);
  });

  it("BANZAI_OPERATOR_IMPLEMENTATION: BOTH ids cross the switch unchanged, both ways", () => {
    const params = { operatorId: OPERATOR, implementationId: IMPLEMENTATION };
    const pt = routeHref("BANZAI_OPERATOR_IMPLEMENTATION", "pt", params);
    const en = routeHref("BANZAI_OPERATOR_IMPLEMENTATION", "en", params);
    expect(counterpartOf(pt)).toBe(en);
    expect(counterpartOf(en)).toBe(pt);
    // The assertion E2-E must break: the pair names the same implementation OF the same operator.
    for (const path of [pt, en]) {
      expect(identityOf(path)!.params).toEqual(params);
    }
    expect(identityOf(counterpartOf(pt)!)!.params).toEqual(identityOf(pt)!.params);
    // None of the four tempting fallbacks: parent context, operator context, another implementation,
    // another operator.
    expect(counterpartOf(pt)).not.toBe("/en/banzai");
    expect(counterpartOf(pt)).not.toBe(routeHref("BANZAI_OPERATOR", "en", { operatorId: OPERATOR }));
    expect(counterpartOf(pt)).not.toBe(
      routeHref("BANZAI_OPERATOR_IMPLEMENTATION", "en", { operatorId: OPERATOR, implementationId: OTHER_IMPLEMENTATION }),
    );
    expect(counterpartOf(pt)).not.toBe(
      routeHref("BANZAI_OPERATOR_IMPLEMENTATION", "en", { operatorId: OTHER_OPERATOR, implementationId: IMPLEMENTATION }),
    );
  });

  it("DECISIONS: both editions address the same library", () => {
    expect(counterpartOf("/decisoes")).toBe("/en/decisions");
    expect(counterpartOf("/en/decisions")).toBe("/decisoes");
    expect(identityOf("/en/decisions")!.id).toBe("DECISIONS");
  });

  it("DECISION: the slug is the record and crosses the switch unchanged, for every record", () => {
    // Every real decision, not a sample: a pairing that works for one slug and not another is the defect.
    for (const d of decisions) {
      const pt = routeHref("DECISION", "pt", { slug: d.slug });
      const en = routeHref("DECISION", "en", { slug: d.slug });
      expect(counterpartOf(pt), `${d.id} pt→en`).toBe(en);
      expect(counterpartOf(en), `${d.id} en→pt`).toBe(pt);
      expect(identityOf(en)!.params.slug, `${d.id} identity`).toBe(d.slug);
    }
    // A different decision is a different route — the property above is not vacuous.
    const [a, b] = decisions;
    expect(routeHref("DECISION", "en", { slug: a.slug })).not.toBe(routeHref("DECISION", "en", { slug: b.slug }));
  });

  it("the switch used by the language control preserves identity too", () => {
    // `lib/i18n` is what the LocaleSwitch actually calls; the registry being right does not prove the
    // control is, because the control has its own reference-chapter branch in front of it.
    const pt = routeHref("BANZAI_OPERATOR_IMPLEMENTATION", "pt", { operatorId: OPERATOR, implementationId: IMPLEMENTATION });
    expect(switchTo(pt, "en")).toBe(routeHref("BANZAI_OPERATOR_IMPLEMENTATION", "en", { operatorId: OPERATOR, implementationId: IMPLEMENTATION }));
    expect(switchTo(switchTo(pt, "en")!, "pt")).toBe(pt);
    const d = decisions[0];
    expect(switchTo(routeHref("DECISION", "pt", { slug: d.slug }), "en")).toBe(routeHref("DECISION", "en", { slug: d.slug }));
  });

  it("only pairs routes whose parameters are the same parameters", () => {
    // The reference chapter is the counter-example that keeps the rule honest: its slugs are translated
    // words, so substituting them would invent a 404. The registry declines rather than guessing.
    expect(patternParams("/referencia/[capitulo]")).toEqual(["capitulo"]);
    expect(patternParams("/en/reference/[chapter]")).toEqual(["chapter"]);
    expect(counterpartOf("/referencia/governacao")).toBeNull();
    // …and the control resolves it through the chapter number instead.
    expect(switchTo("/referencia/governacao", "en")).toBe("/en/reference/governance");
  });
});

describe("Q6 — each English route renders substantive English from the Q1–Q5 owners", () => {
  const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  it("the English decisions library renders the same records in English", () => {
    const en = text(renderToStaticMarkup(<DecisionsIndexView locale="en" />));
    const pt = text(renderToStaticMarkup(<DecisionsIndexView locale="pt" />));
    // Substantive: not an empty shell, not the Portuguese one, and carrying the real record set.
    expect(en.length).toBeGreaterThan(600);
    expect(en).not.toBe(pt);
    expect(en).toContain("Protocol Decisions");
    expect(en).not.toContain("Decisões do Protocolo");
    for (const d of decisions.slice(0, 3)) expect(en, `${d.id} missing`).toContain(d.id);
  });

  it("the English decision page renders the same record in English", () => {
    const d = decisions[0];
    const html = renderToStaticMarkup(
      <DecisionDetailView decision={d} body={"# T\n\nCorpo original."} locale="en" />,
    );
    const en = text(html);
    expect(en).toContain(d.id);
    expect(en).toContain("What this document is");
    expect(en).not.toContain("O que este documento é");
    // Its links stay inside the English edition — a reader is not sent back mid-journey.
    expect(html).toContain('href="/en/decisions"');
    expect(html).not.toContain('href="/decisoes"');
    // The body is the ORIGINAL published language in both editions. That is a source-language
    // classification, not a Portuguese fallback, and it is asserted so nobody "fixes" it later.
    expect(en).toContain("Corpo original.");
  });

  it("every English route in the five classes is registered and resolvable", () => {
    for (const id of ["BANZAI", "BANZAI_OPERATOR", "BANZAI_OPERATOR_IMPLEMENTATION", "DECISIONS", "DECISION"]) {
      const en = pathFor(id, "en");
      expect(en, `${id} has no English path`).toBeTruthy();
      expect(en!.startsWith("/en/"), `${id} English path is not under /en`).toBe(true);
      // Both sides declare the same parameters — which is what makes identity substitution legitimate.
      expect(patternParams(pathFor(id, "pt")!)).toEqual(patternParams(en!));
    }
    for (const l of LOCALES) expect(pathFor("BANZAI", l)).toBeTruthy();
  });
});
