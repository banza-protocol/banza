import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SITE_METADATA, OG_IMAGE } from "./siteMetadata";
import { NotFoundView, NOT_FOUND_COPY } from "@/components/pages/NotFoundView";
import { LOCALES, type Locale } from "./i18n";

// The last two bilingual surfaces that were not one of the 22 registered route pairs, and which drifted
// for exactly that reason: the site-level metadata, and the 404 boundary.
//
// Metadata drifted because the English half was never a translation. It carried the headline of the
// independent English homepage that Block F removed, and dropped "Angola" from the title, the description
// and the keywords while Portuguese kept it — so a share card in English claimed something different from
// the same card in Portuguese. The 404 drifted because only the Portuguese route group had one.
//
// Word-for-word equality is not the standard and would be wrong. What must match are the ROLES and the
// CLAIMS.

const editions = LOCALES as readonly Locale[];

describe("site metadata is the same claim in both editions", () => {
  it("fills every metadata role in both editions", () => {
    for (const locale of editions) {
      const m = SITE_METADATA[locale];
      expect(m.title.trim().length, `${locale} title`).toBeGreaterThan(20);
      expect(m.description.trim().length, `${locale} description`).toBeGreaterThan(80);
      expect(m.imageAlt.trim().length, `${locale} image alt`).toBeGreaterThan(40);
      expect(m.keywords.length, `${locale} keywords`).toBeGreaterThan(5);
      expect(m.ogLocale.trim().length).toBeGreaterThan(0);
    }
  });

  it("makes the same claims — protocol, openness, verifiability, and Angola", () => {
    // Each claim is checked by its own wording per edition, because "the same claim" is a claim, not a
    // string. Angola is pinned by name: dropping it from one edition is precisely what happened, and it
    // changes what the protocol is said to be for.
    const CLAIMS: { name: string; pt: RegExp; en: RegExp }[] = [
      { name: "open financial protocol", pt: /protocolo financeiro aberto/i, en: /open financial protocol/i },
      { name: "Angola", pt: /Angola/, en: /Angola/ },
      { name: "public, versioned rules", pt: /regras públicas.*perfis versionados/i, en: /public rules.*versioned profiles/i },
      { name: "conformance", pt: /conformidade/i, en: /conformance/i },
      { name: "no bilateral integration per pair", pt: /bilaterais entre cada par/i, en: /bilateral technical integration for every pair/i },
    ];
    for (const claim of CLAIMS) {
      const pt = `${SITE_METADATA.pt.title} ${SITE_METADATA.pt.description} ${SITE_METADATA.pt.keywords.join(" ")}`;
      const en = `${SITE_METADATA.en.title} ${SITE_METADATA.en.description} ${SITE_METADATA.en.keywords.join(" ")}`;
      expect(pt, `Portuguese must claim: ${claim.name}`).toMatch(claim.pt);
      expect(en, `English must claim: ${claim.name}`).toMatch(claim.en);
    }
  });

  it("never carries the framing of the removed independent English homepage", () => {
    // The exact stale string, pinned so it cannot come back through a copy-paste.
    for (const locale of editions) {
      expect(SITE_METADATA[locale].title).not.toContain("An open financial interoperability protocol");
    }
  });

  it("shares one card image and gives it alt text in both editions", () => {
    expect(OG_IMAGE).toBe("/og-card.png");
    expect(SITE_METADATA.pt.imageAlt).not.toBe(SITE_METADATA.en.imageAlt);
    for (const locale of editions) expect(SITE_METADATA[locale].imageAlt).toMatch(/Angola/);
  });

  it("keeps the same keyword concepts, translated", () => {
    expect(SITE_METADATA.pt.keywords.length).toBe(SITE_METADATA.en.keywords.length);
    // Two concepts are the same token in both languages and must appear in both lists.
    for (const locale of editions) {
      expect(SITE_METADATA[locale].keywords).toContain("BANZA");
      expect(SITE_METADATA[locale].keywords).toContain("Angola");
    }
  });
});

describe("the 404 boundary is the same page in both editions", () => {
  const render = (locale: Locale) => renderToStaticMarkup(<NotFoundView locale={locale} />);

  it("renders the same structure for both readers", () => {
    const shape = (html: string) => ({
      sections: (html.match(/<section\b/g) || []).length,
      h1: (html.match(/<h1\b/g) || []).length,
      paragraphs: (html.match(/<p\b/g) || []).length,
      links: (html.match(/<a\b/g) || []).length,
    });
    expect(shape(render("en"))).toEqual(shape(render("pt")));
  });

  it("offers the same two recovery actions, in the same order, per edition", () => {
    const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    const pt = hrefs(render("pt"));
    const en = hrefs(render("en"));
    expect(pt.length, "two recovery actions").toBe(2);
    expect(en.length, "two recovery actions").toBe(2);
    // Home first, then the FAQ chapter — each resolved inside the reader's own edition.
    expect(pt).toEqual(["/", "/referencia/faq"]);
    expect(en).toEqual(["/en", "/en/reference/faq"]);
  });

  it("explains and recovers in the reader's own language", () => {
    for (const locale of editions) {
      const c = NOT_FOUND_COPY[locale];
      for (const [role, text] of Object.entries(c)) {
        expect(text.trim().length, `${locale} ${role}`).toBeGreaterThan(0);
      }
      expect(c.eyebrow).toMatch(/404/);
    }
    // The two editions must not be the same words — that would mean one reader is getting the other's page.
    expect(NOT_FOUND_COPY.pt.title).not.toBe(NOT_FOUND_COPY.en.title);
    expect(render("en")).not.toContain("Voltar ao início");
  });
});
