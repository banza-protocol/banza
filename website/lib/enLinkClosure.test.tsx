// Block E2 / Q7 — an English page may not send its reader back into the Portuguese edition.
//
// Until Q6 this was unavoidable: BanzAI and the decisions library had no English routes, so an English
// page linking to them was being honest. Now they do, and an edge that still points at the Portuguese
// route is a reader losing their edition mid-journey — the page they land on is valid, renders, and is
// entirely in the wrong language.
//
// The universe here is derived from the ROUTE REGISTRY, not from a curated list of pages: every internal
// href on every English surface is resolved through `matchRoute`, and if it resolves to a route that HAS
// an English counterpart, the edge must be that counterpart. A destination the registry does not know is
// not silently allowed — it must fall into one of the typed classes below, and an edge that fits none of
// them fails as UNCLASSIFIED. There are no suppression strings and no "ignore anything containing…".

import { beforeAll, describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { matchRoute, pathFor, routeHref } from "./routeRegistry";
import { decisions } from "./decisions";
import { DecisionsIndexView } from "@/components/decisoes/DecisionsIndexView";
import { DecisionDetailView } from "@/components/decisoes/DecisionDetailView";

/**
 * What an edge IS. Only `WEBSITE_NAVIGATION` is subject to edition closure; the others are not navigation
 * between pages of this site at all, and each is a class the repository genuinely has — not a pattern
 * invented to make a count come out right.
 */
type EdgeClass =
  | "WEBSITE_NAVIGATION" // a page of this site, owned by the route registry
  | "PROTOCOL_ENDPOINT" // a published protocol path that returns JSON, not a page
  | "LANGUAGE_SPECIFIC_DOCUMENT" // a document whose language IS its identity (the whitepaper PDFs)
  | "EXTERNAL" // another host
  | "IN_PAGE"; // a fragment or query on the current page

/** The protocol endpoints the Technical Registry page documents and links so a reader can open the raw
 *  JSON. They are the protocol's public surface, have no editions, and are named exhaustively. */
const PROTOCOL_ENDPOINTS = [
  "/operators",
  "/conformance/evidence",
  "/federation/revocation-list.json",
  "/banzai/runtime",
];
/** The discovery surface (ADR-080). `.well-known` is machine-addressed by definition and has no edition. */
const isWellKnown = (href: string) => href.startsWith("/.well-known/");

/** The whitepaper is published as two PDFs. Portuguese is the canonical edition and English is its
 *  official translation, so BOTH are offered in BOTH editions by design (see the Q4/Q5 record). The
 *  language of these files is the document's identity, not the reader's. */
const isWhitepaperDocument = (href: string) => /^\/whitepaper\/[^/?#]*\.pdf$/.test(href.split("?")[0].split("#")[0]);

function classify(href: string): EdgeClass {
  if (/^https?:\/\//.test(href) || href.startsWith("mailto:")) return "EXTERNAL";
  // `/whitepaper/pt` and `/whitepaper/en` are DOCUMENT-locale surfaces: the segment names the language of
  // the DOCUMENT, not of the site. The registry models them as their own records for that reason.
  if (/^\/whitepaper\/(pt|en)(\/|\?|#|$)/.test(href)) return "LANGUAGE_SPECIFIC_DOCUMENT";
  if (href.startsWith("#") || href.startsWith("?")) return "IN_PAGE";
  const bare = href.split("#")[0].split("?")[0];
  if (PROTOCOL_ENDPOINTS.includes(bare) || isWellKnown(bare)) return "PROTOCOL_ENDPOINT";
  if (isWhitepaperDocument(href)) return "LANGUAGE_SPECIFIC_DOCUMENT";
  return "WEBSITE_NAVIGATION";
}

/**
 * The universe is what the reader actually RECEIVES. These pages are rendered and their hrefs read out of
 * the real markup, so a link built from a data table, a map callback or a helper is caught exactly like a
 * literal one — the failure this property exists for does not care how the href was computed.
 */
const EN_PAGES: Record<string, () => Promise<{ default: unknown }>> = {
  "/en": () => import("@/app/en/page"),
  "/en/status": () => import("@/app/en/status/page"),
  "/en/technical-registry": () => import("@/app/en/technical-registry/page"),
  "/en/operators": () => import("@/app/en/operators/page"),
  "/en/whitepaper": () => import("@/app/en/whitepaper/page"),
  "/en/whitepaper/versions": () => import("@/app/en/whitepaper/versions/page"),
  "/en/license": () => import("@/app/en/license/page"),
  "/en/open-governance": () => import("@/app/en/open-governance/page"),
  "/en/glossary": () => import("@/app/en/glossary/page"),
  "/en/certification": () => import("@/app/en/certification/page"),
  "/en/architecture": () => import("@/app/en/architecture/page"),
  "/en/trust": () => import("@/app/en/trust/page"),
  "/en/federation": () => import("@/app/en/federation/page"),
  "/en/why-banza": () => import("@/app/en/why-banza/page"),
  "/en/decisions": () => import("@/app/en/decisions/page"),
};

async function renderPage(load: () => Promise<{ default: unknown }>): Promise<string> {
  const mod = await load();
  const out = (mod.default as () => unknown)();
  const el = out instanceof Promise ? await out : out;
  return renderToStaticMarkup(el as never);
}

type Edge = { file: string; href: string; cls: EdgeClass };

async function collectEdges(): Promise<Edge[]> {
  const edges: Edge[] = [];
  for (const [page, load] of Object.entries(EN_PAGES)) {
    const html = await renderPage(load);
    for (const m of html.matchAll(/href="([^"]*)"/g)) {
      edges.push({ file: page, href: m[1], cls: classify(m[1]) });
    }
  }
  return edges;
}

describe("Q7 — every English navigation edge stays in the English edition", () => {
  let edges: Edge[] = [];
  beforeAll(async () => {
    edges = await collectEdges();
  });

  it("resolves every English navigation edge to a route the registry knows", () => {
    // An edge that is neither a known route nor one of the typed non-navigation classes is UNCLASSIFIED,
    // and unclassified is red. This is what stops the property from being quietly narrowed later.
    const unclassified = edges
      .filter((e) => e.cls === "WEBSITE_NAVIGATION")
      .filter((e) => !matchRoute(e.href.split("#")[0].split("?")[0]))
      .map((e) => `${e.file} → ${e.href}`);
    expect(unclassified, "English edges whose destination no route owns").toEqual([]);
  });

  it("never links to the Portuguese edition of a route that HAS an English one", () => {
    // E2-G's owning assertion. The destination is resolved through the registry and its EDITION is read —
    // an href that merely starts with /en would satisfy a naive check and still be the wrong page.
    const defective = edges
      .filter((e) => e.cls === "WEBSITE_NAVIGATION")
      .map((e) => ({ e, hit: matchRoute(e.href.split("#")[0].split("?")[0]) }))
      .filter(({ hit }) => hit && hit.locale === "pt" && hit.record.en)
      .map(({ e, hit }) => `${e.file} → ${e.href} (${hit!.record.id} has ${hit!.record.en})`);
    expect(defective, "English pages linking into the Portuguese edition").toEqual([]);
  });

  it("accounts for every edge — the counts are the report", () => {
    const by = (c: EdgeClass) => edges.filter((e) => e.cls === c).length;
    const nav = edges.filter((e) => e.cls === "WEBSITE_NAVIGATION");
    const en = nav.filter((e) => matchRoute(e.href.split("#")[0].split("?")[0])?.locale === "en").length;
    // Every navigation edge is either English, or Portuguese-with-no-English-counterpart (of which there
    // must be none, asserted above). Nothing is unaccounted for.
    expect(nav.length).toBeGreaterThan(30);
    expect(en).toBe(nav.length);
    expect(by("PROTOCOL_ENDPOINT")).toBeGreaterThan(0);
    expect(by("LANGUAGE_SPECIFIC_DOCUMENT")).toBeGreaterThan(0);
    // Reading the RENDERED markup means there is no computed bucket to escape into.
    expect(edges.every((e) => e.href.length > 0)).toBe(true);
  });

  it("keeps the source-language artifacts OUT of edition closure", () => {
    // The whitepaper PDFs are the case this distinction exists for: the Portuguese edition is canonical
    // and the English one is its official translation, so an English page offering BOTH is correct. This
    // is a source-language artifact, not a Portuguese fallback, and it must stay legal.
    const docs = edges.filter((e) => e.cls === "LANGUAGE_SPECIFIC_DOCUMENT");
    expect(docs.some((e) => e.href.includes("-pt.pdf"))).toBe(true);
    expect(docs.some((e) => e.href.includes("-en.pdf"))).toBe(true);
    // …and the protocol endpoints likewise: they return JSON and have no editions.
    for (const e of edges.filter((x) => x.cls === "PROTOCOL_ENDPOINT")) {
      expect(matchRoute(e.href), `${e.href} must not be a page route`).toBeNull();
    }
  });
});

describe("Q7 — dynamic English navigation keeps its parameters", () => {
  const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  it("the English decisions library links every record into the English edition, by slug", () => {
    const html = renderToStaticMarkup(<DecisionsIndexView locale="en" />);
    const linked = [...html.matchAll(/href="([^"]*\/decis[^"]*)"/g)].map((m) => m[1]);
    expect(linked.length).toBeGreaterThan(0);
    for (const href of linked) {
      const hit = matchRoute(href);
      expect(hit, `${href} is not a known route`).toBeTruthy();
      expect(hit!.locale, `${href} leaves the English edition`).toBe("en");
      // The parameter is the record's identity and must survive — not be dropped to the index.
      if (hit!.record.id === "DECISION") {
        expect(decisions.some((d) => d.slug === hit!.params.slug), `${href} names no real record`).toBe(true);
      }
    }
  });

  it("an English decision page links onward in English, and keeps each neighbour's own slug", () => {
    // Neighbours are the dynamic edges most likely to be "fixed" by dropping the parameter.
    const d = decisions[1] ?? decisions[0];
    const html = renderToStaticMarkup(
      <DecisionDetailView decision={d} body={"# T\n\nCorpo original."} locale="en" />,
    );
    const linked = [...html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
    const nav = linked.filter((h) => matchRoute(h));
    expect(nav.length).toBeGreaterThan(0);
    for (const href of nav) expect(matchRoute(href)!.locale, `${href} leaves the English edition`).toBe("en");
    // The record's own page is reachable from its neighbours' slugs, not from a rebuilt label.
    const slugs = linked.map((h) => matchRoute(h)).filter((x) => x?.record.id === "DECISION").map((x) => x!.params.slug);
    for (const s of slugs) expect(decisions.some((x) => x.slug === s), `${s} names no real record`).toBe(true);
    // The document body stays in its original published language — the source-language classification.
    expect(text(html)).toContain("Corpo original.");
  });

  it("the BanzAI contexts pair by identity from the English side", () => {
    // Q6 owns route identity; Q7 asserts the English side is where an English reader's navigation lands.
    const en = routeHref("BANZAI_OPERATOR_IMPLEMENTATION", "en", {
      operatorId: "operator-zero",
      implementationId: "oz-impl-1",
    });
    const hit = matchRoute(en)!;
    expect(hit.locale).toBe("en");
    expect(hit.params).toEqual({ operatorId: "operator-zero", implementationId: "oz-impl-1" });
  });
});
