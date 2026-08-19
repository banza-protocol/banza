import { describe, it, expect, vi } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { REFERENCE_CHAPTER_SLUGS, REFERENCE_BASE } from "./referenceSlugs";
import { counterpartOf } from "./i18n";

/**
 * THE LANGUAGE SWITCH KEEPS THE READER IN THE SAME CHAPTER.
 *
 * A Reference chapter is one thing with two addresses, and the two addresses are different WORDS:
 * `/referencia/governacao` and `/en/reference/governance`. Nothing about either string can be derived
 * from the other, so a switch that manipulates the pathname either invents `/en/reference/governacao`
 * (a 404 — the Block B defect) or gives up and offers the edition's front page (a demotion: the reader
 * asked for this chapter in the other language and lost their place).
 *
 * `counterpartOf` resolves through the semantic chapter NUMBER instead, using the pairing in
 * lib/referenceSlugs.ts. That behaviour shipped with the locale-aware chrome and was, until this file,
 * held by nothing: every existing `counterpartOf` assertion in the suite is the registry's function of
 * the same name, which knows only the `/referencia/[capitulo]` PATTERN and cannot resolve an instance.
 * Correct and untested is one refactor away from correct-by-accident, and this milestone has already
 * lost the same property twice.
 *
 * Ownership stays where it is. The route registry owns the REFERENCE_CHAPTER pattern; referenceSlugs
 * owns the fifteen instances inside it; the switch is a consumer of both. No chapter instance is added
 * to the registry to make this pass, and there is no fourth table of paths anywhere.
 *
 * Rendered, not computed: the assertions read the href out of the real shell, because the switch is a
 * component in the reader's chrome and a function returning the right string proves nothing about what
 * the chrome puts on the page.
 */

const pathname = { current: "/" };
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

const { SiteShell } = await import("@/components/SiteShell");

function shell(path: string): string {
  pathname.current = path;
  const locale = path === "/en" || path.startsWith("/en/") ? "en" : "pt";
  return renderToStaticMarkup(
    <SiteShell locale={locale} jsonLd={{}}>
      {createElement("h1", null, "CHAPTER-BODY")}
    </SiteShell>,
  );
}

/** The language switch is the anchor that DECLARES the destination's language. */
function switchLink(html: string): { href: string | null; hrefLang: string | null; aria: string | null } {
  for (const tag of html.match(/<a\b[^>]*>/g) ?? []) {
    if (!/hreflang=/i.test(tag)) continue;
    return {
      href: tag.match(/href="([^"]*)"/)?.[1] ?? null,
      hrefLang: tag.match(/hreflang="([^"]*)"/i)?.[1] ?? null,
      aria: tag.match(/aria-label="([^"]*)"/)?.[1] ?? null,
    };
  }
  return { href: null, hrefLang: null, aria: null };
}

const ptPath = (slug: string) => `${REFERENCE_BASE.pt}/${slug}`;
const enPath = (slug: string) => `${REFERENCE_BASE.en}/${slug}`;

/** The full fifteen-row matrix, measured once by rendering both editions of every chapter. */
type Row = { num: number; pt: string; en: string; ptSwitch: string | null; enSwitch: string | null };
const MATRIX: Row[] = REFERENCE_CHAPTER_SLUGS.map((c) => ({
  num: c.num,
  pt: ptPath(c.pt),
  en: enPath(c.en),
  ptSwitch: switchLink(shell(ptPath(c.pt))).href,
  enSwitch: switchLink(shell(enPath(c.en))).href,
}));

// ── NON-VACUITY ───────────────────────────────────────────────────────────────────────────────────
// A partial matrix must never read as success: the failure this file guards against is per-chapter, so
// a table that inspected three chapters and passed would be worse than no table at all.

describe("Reference language switch — the matrix is complete", () => {
  it("inspects exactly fifteen chapters, in both directions", () => {
    expect(REFERENCE_CHAPTER_SLUGS.length, "the Reference has fifteen semantic chapters").toBe(15);
    expect(MATRIX.length, "every chapter must be inspected — a partial matrix is not evidence").toBe(15);
    expect(MATRIX.map((r) => r.num)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    // 30 transitions, every one of them actually rendered a switch.
    const rendered = MATRIX.flatMap((r) => [r.ptSwitch, r.enSwitch]).filter(Boolean);
    expect(rendered.length, "a row with no rendered switch proves nothing about that chapter").toBe(30);
  });

  it("the shell under test really renders the chapter chrome", () => {
    const html = shell(ptPath("governacao"));
    expect(html).toContain("CHAPTER-BODY");
    expect(html).toContain('aria-label="Navegação principal"');
    expect(switchLink(html).href).toBeTruthy();
  });
});

// ── THE PROPERTY: SEMANTIC CHAPTER ID IS INVARIANT ACROSS THE SWITCH ───────────────────────────────

describe("Reference language switch — the chapter survives the language change", () => {
  for (const c of REFERENCE_CHAPTER_SLUGS) {
    it(`chapter ${c.num} — ${c.pt} ↔ ${c.en}`, () => {
      const row = MATRIX.find((r) => r.num === c.num)!;

      // Exact counterpart in both directions — never the edition entry point.
      expect(row.ptSwitch, `chapter ${c.num}: PT switch must offer the English chapter`).toBe(row.en);
      expect(row.enSwitch, `chapter ${c.num}: EN switch must offer the Portuguese chapter`).toBe(row.pt);
      expect(row.ptSwitch, `chapter ${c.num} demoted to the English Reference landing`).not.toBe(
        REFERENCE_BASE.en,
      );
      expect(row.enSwitch, `chapter ${c.num} demoted to the Portuguese Reference landing`).not.toBe(
        REFERENCE_BASE.pt,
      );

      // Round trips return to the same chapter, not merely to some chapter.
      expect(switchLink(shell(row.en)).href, `chapter ${c.num}: PT→EN→PT`).toBe(row.pt);
      expect(switchLink(shell(row.pt)).href, `chapter ${c.num}: EN→PT→EN`).toBe(row.en);

      // The slug is never carried across: an English URL is English. Only checkable where the two
      // slugs are actually different words — chapters 12 (banzai) and 15 (faq) are spelled the same in
      // both editions, so "carried across" and "correctly resolved" are the same string there and the
      // assertion would be testing nothing.
      if (c.pt !== c.en) {
        expect(row.ptSwitch, `chapter ${c.num}: Portuguese slug carried under the English base`).not.toBe(
          enPath(c.pt),
        );
        expect(row.enSwitch, `chapter ${c.num}: English slug carried under the Portuguese base`).not.toBe(
          ptPath(c.en),
        );
      }
    });
  }

  it("no two chapters resolve to the same counterpart", () => {
    const targets = MATRIX.map((r) => r.ptSwitch);
    expect(new Set(targets).size, "a collision means one chapter is pointing at another").toBe(15);
  });

  // The three pairs where the slugs share no word: a prefix heuristic dies here and nowhere else.
  it("resolves chapters whose two slugs are entirely different words", () => {
    expect(counterpartOf("/referencia/governacao", "en")).toBe("/en/reference/governance");
    expect(counterpartOf("/referencia/certificacao", "en")).toBe("/en/reference/conformance-certification");
    expect(counterpartOf("/referencia/programadores", "en")).toBe("/en/reference/developer-resources");
    expect(counterpartOf("/en/reference/governance", "pt")).toBe("/referencia/governacao");
    expect(counterpartOf("/en/reference/conformance-certification", "pt")).toBe("/referencia/certificacao");
    expect(counterpartOf("/en/reference/developer-resources", "pt")).toBe("/referencia/programadores");
  });
});

// ── LANDING AND FULL VIEW ARE NOT CHAPTERS ────────────────────────────────────────────────────────

describe("Reference language switch — landing and full view keep their own identity", () => {
  it("the landing pairs with the landing", () => {
    expect(switchLink(shell("/referencia")).href).toBe("/en/reference");
    expect(switchLink(shell("/en/reference")).href).toBe("/referencia");
  });

  it("the full view pairs with the full view, and is not mistaken for a chapter", () => {
    expect(switchLink(shell("/referencia/completa")).href).toBe("/en/reference/full");
    expect(switchLink(shell("/en/reference/full")).href).toBe("/referencia/completa");
    // "completa" and "full" sit under the Reference base but are not in the chapter table.
    expect(REFERENCE_CHAPTER_SLUGS.some((c) => c.pt === "completa" || c.en === "full")).toBe(false);
  });

  it("the whitepaper document-locale surfaces are not site-locale routes", () => {
    // /whitepaper/en is a Portuguese page serving the English PDF. Document locale and site locale are
    // different axes, and resolving one as the other would invent /en/whitepaper/en.
    expect(counterpartOf("/whitepaper/en", "en")).toBeNull();
    expect(counterpartOf("/whitepaper/pt", "en")).toBeNull();
  });
});

// ── UNKNOWN SLUGS FAIL CLOSED ─────────────────────────────────────────────────────────────────────

describe("Reference language switch — an unknown chapter is never guessed", () => {
  it("returns no counterpart rather than inventing one", () => {
    expect(counterpartOf("/referencia/nao-existe", "en")).toBeNull();
    expect(counterpartOf("/en/reference/does-not-exist", "pt")).toBeNull();
  });

  it("never translates a slug by carrying it across the base path", () => {
    // The exact shape a prefix heuristic produces, and the exact shape that 404s.
    expect(counterpartOf("/referencia/governacao", "en")).not.toBe("/en/reference/governacao");
    expect(counterpartOf("/en/reference/governance", "pt")).not.toBe("/referencia/governance");
    // A Portuguese slug asked for under the English base is not a chapter at all.
    expect(counterpartOf("/en/reference/programadores", "pt")).toBeNull();
    expect(counterpartOf("/referencia/developer-resources", "en")).toBeNull();
  });
});

// ── ACCESSIBILITY ─────────────────────────────────────────────────────────────────────────────────

describe("Reference language switch — the accessible name is true", () => {
  it("announces the destination rather than claiming the edition is unpublished", () => {
    for (const path of [ptPath("governacao"), enPath("governance"), ptPath("faq"), enPath("faq")]) {
      const s = switchLink(shell(path));
      expect(s.href, `${path}: no switch rendered`).toBeTruthy();
      expect(s.hrefLang, `${path}: the switch must declare the destination language`).toBeTruthy();
      // The "not published yet" wording is only ever correct when there is genuinely no counterpart.
      expect(s.aria, `${path} announces an unavailable edition that exists`).not.toMatch(
        /ainda não existe|is not published/i,
      );
      expect(s.aria).toMatch(/Ver esta página em|View this page in/);
    }
  });

  it("still says so honestly where a counterpart really is missing", () => {
    // Block E2/Q6 — BanzAI gained an English edition, so the honest-missing case moved to the route whose
    // Portuguese-only status is a decision: Operator Zero is a demonstration operator, not a backlog item.
    const s = switchLink(shell("/operador-zero"));
    expect(counterpartOf("/operador-zero", "en")).toBeNull();
    if (s.aria) expect(s.aria).toMatch(/ainda não existe|is not published/i);
  });
});
