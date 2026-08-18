// Rendered output, not source text.
//
// Block B proved why this file has to exist. `getReferenceOutline` returned Portuguese slugs for the English
// edition, so the English sidebar linked to /en/reference/arquitectura — a 404 — while every one of the 30
// chapter URLs returned 200. The route matrix looked perfect and the navigation between those routes was
// broken. No source file contained the bad link: it was assembled at render time from outline data, so
// scanning route sources could not have found it, and did not.
//
// So each core page pair is checked twice, and neither check substitutes for the other:
//
//   SOURCE   what the page declares — metadata, canonical, alternates, the links it writes literally
//   RENDERED what a reader actually receives — every href and label after the components have run
//
// The rendered pass is built here on WHY_BANZA first and proven, before the pattern is copied to the
// remaining four pages. A harness that has never caught anything is not a harness.

import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { chapterSlugMap } from "./reference";
import { ROUTES, counterpartOf } from "./routeRegistry";

const source = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

/** Source with comments stripped — a file may legitimately NAME a forbidden path in order to forbid it. */
const code = (p: string) =>
  source(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** Every Portuguese public path a reader-facing English link must never point at. */
const PT_READER_PATHS = [
  "/referencia",
  "/porque-existe",
  "/arquitectura",
  "/certificacao",
  "/federacao",
  "/confianca",
  "/estado",
  "/operadores",
  "/glossario",
];

/** Portuguese UI words that would betray an untranslated shared component or label. */
const PT_UI_WORDS = [
  "Anterior",
  "Seguinte",
  "Capítulo",
  "Índice",
  "Voltar",
  "Referência",
  "Arquitectura",
  "Certificação",
  "Confiança",
  "Federação",
];

/**
 * The Block C page pairs. Only WHY_BANZA is implemented so far; the rest are declared here so that adding a
 * page cannot silently skip its properties — the list is the checklist.
 */
const CORE_PAGES = [
  {
    id: "WHY_BANZA",
    pt: "/porque-existe",
    en: "/en/why-banza",
    enSource: "../app/en/why-banza/page.tsx",
    ptSource: "../app/(pt)/porque-existe/page.tsx",
    implemented: true,
    enHeading: /open layer over the interoperability/i,
    // Claims the Portuguese page makes, which the translation must not quietly drop or strengthen.
    mustSay: [/complements the infrastructures in use/i, /operator-neutral/i, /reproduce that validation/i],
    mustNotSay: [],
  },
  {
    id: "FEDERATION",
    pt: "/federacao",
    en: "/en/federation",
    enSource: "../app/en/federation/page.tsx",
    ptSource: "../app/(pt)/federacao/page.tsx",
    implemented: true,
    enHeading: /Interoperate by evidence/i,
    // The qualifications the Portuguese page is careful to make. "Federation" pulls towards consensus
    // networks in English, so the restraint is what must survive translation.
    mustSay: [
      /not an automatic real-payments network/i,
      /Production federation is not active/i,
      /do not constitute regulatory approval/i,
      /technical, local, per-interaction/i,
    ],
    // Claims the page must never make. Federation is not consensus and admission does not propagate.
    mustNotSay: [
      /global consensus/i,
      /single global network/i,
      /shared global state/i,
      /without intermediaries\b(?!.{0,40}not)/i,
    ],
  },
  {
    id: "TRUST",
    pt: "/confianca",
    en: "/en/trust",
    enSource: "../app/en/trust/page.tsx",
    ptSource: "../app/(pt)/confianca/page.tsx",
    implemented: true,
    enHeading: /Trust without asking anyone for permission/i,
    mustSay: [
      /no certificate authority/i,
      /assertion about artifacts, never about a participant/i,
      /Private keys never appear/i,
      /closed by default/i,
      /does not certify any operator/i,
    ],
    // "Permissionless" and a named threshold are both absent from the Portuguese page. The first is a term
    // of art this page must not acquire; the second is accurate elsewhere but is not this page's claim, and
    // translation preserves the scope of what is left unsaid as much as what is said.
    mustNotSay: [/permissionless/i, /trustless/i, /fully decentrali[sz]ed/i, /global consensus/i, /2-of-3/i],
  },
  {
    id: "ARCHITECTURE",
    pt: "/arquitectura",
    en: "/en/architecture",
    enSource: "../app/en/architecture/page.tsx",
    ptSource: "../app/(pt)/arquitectura/page.tsx",
    implemented: true,
    enHeading: /Three layers\. One interface\./i,
    mustSay: [
      /Layer 1/i,
      /Layer 2/i,
      /Layer 3/i,
      /certifies an implementation .*never an entity/i,
      /is not a layer and not an authority/i,
      /Certifying is not admitting; admitting is not authorising/i,
      /there is no\s+propagation between layers/i,
      /BANZA is not Banzami/i,
      /real payments switched off/i,
    ],
    // The page names Banzami as designated scheme operator WITH its qualifications. Dropping them, or
    // promoting certification into admission or authorisation, are the failures that matter here.
    mustNotSay: [
      /certification grants (operational )?admission/i,
      /certification grants regulatory/i,
      /BANZA certifies (operators|companies|entities)/i,
      /BANZA operates the scheme/i,
    ],
  },
] as const;

const IMPLEMENTED = CORE_PAGES.filter((p) => p.implemented);

describe("core page pairs — source level", () => {
  it("at least one pair is implemented, else this suite proves nothing", () => {
    expect(IMPLEMENTED.length).toBeGreaterThan(0);
  });

  for (const page of IMPLEMENTED) {
    it(`${page.id}: declares its own canonical and reciprocal alternates`, () => {
      const src = source(page.enSource);
      expect(src).toContain(`canonical: "${page.en}"`);
      expect(src).toContain(`"pt-PT": "${page.pt}"`);
      expect(src).toContain(`en: "${page.en}"`);
    });

    it(`${page.id}: the EN source contains no Portuguese reader-facing route`, () => {
      const src = code(page.enSource);
      for (const pt of PT_READER_PATHS) {
        expect(src, `${page.id} links to ${pt}`).not.toContain(`href="${pt}`);
      }
    });

    it(`${page.id}: the registry owns the counterpart in both directions`, () => {
      expect(counterpartOf(page.pt)).toBe(page.en);
      expect(counterpartOf(page.en)).toBe(page.pt);
      const record = ROUTES.find((r) => r.id === page.id);
      expect(record, `${page.id} must be registered`).toBeDefined();
    });
  }
});

describe("core page pairs — rendered output", () => {
  for (const page of IMPLEMENTED) {
    it(`${page.id}: renders English, with no Portuguese href or label`, async () => {
      const mod = await import(/* @vite-ignore */ page.enSource.replace("../", "../"));
      const html = renderToStaticMarkup((mod.default as () => ReactElement)());

      // The page actually rendered something recognisable — otherwise every assertion below is vacuous.
      expect(html.length).toBeGreaterThan(500);
      expect(html).toMatch(page.enHeading);

      // Every href a reader could follow. This is the check that would have caught the Block B outline bug.
      const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
      expect(hrefs.length, "the page must actually link somewhere").toBeGreaterThan(0);
      for (const href of hrefs) {
        if (!href.startsWith("/")) continue; // external / anchors are locale-neutral
        // English links stay English WHEN a counterpart exists. A page not yet translated has no English
        // address, and inventing one would render a dead link — worse than an honest cross-locale one. The
        // registry decides, so this relaxes automatically as Block C lands pages, and tightens by itself.
        const enCounterpart = counterpartOf(href);
        if (href.startsWith("/en/")) continue;
        expect(
          enCounterpart,
          `${page.id} links to ${href}, which HAS an English counterpart (${enCounterpart}) and must use it`,
        ).toBeNull();
      }

      // Portuguese UI words leaking in from a shared component.
      for (const w of PT_UI_WORDS) {
        expect(html, `${page.id} renders PT label "${w}"`).not.toContain(`>${w}`);
      }
    });

    it(`${page.id}: keeps the claims the Portuguese page makes`, async () => {
      const mod = await import(/* @vite-ignore */ page.enSource);
      const html = renderToStaticMarkup((mod.default as () => ReactElement)());
      for (const claim of page.mustSay) {
        expect(html, `${page.id} lost a claim: ${claim}`).toMatch(claim);
      }
      for (const forbidden of page.mustNotSay) {
        expect(html, `${page.id} made a forbidden claim: ${forbidden}`).not.toMatch(forbidden);
      }
    });

    it(`${page.id}: every rendered Reference link is a real EN chapter`, async () => {
      const mod = await import(/* @vite-ignore */ page.enSource);
      const html = renderToStaticMarkup((mod.default as () => ReactElement)());
      const known = new Set(chapterSlugMap().map((m) => `/en/reference/${m.en}`));
      known.add("/en/reference");
      known.add("/en/reference/full");
      const refLinks = [...html.matchAll(/href="(\/en\/reference[^"]*)"/g)].map((m) => m[1]);
      for (const l of refLinks) {
        expect(known.has(l), `${page.id} links to a non-existent EN chapter: ${l}`).toBe(true);
      }
    });
  }
});
