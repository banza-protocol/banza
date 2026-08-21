// The two Reference editions are one document in two languages, and this proves it structurally.
//
// The website does not translate anything: `docs/reference/pt/BANZA_REFERENCIA.md` is canonical,
// `docs/reference/en/BANZA_REFERENCE.md` is its official translation, and both are mirrored into
// `website/content/reference/` because the Docker build context is `website/` and cannot read `docs/`.
// What the website owns is the claim that those two mirrors carry the SAME 15 semantic chapters in the SAME
// order — and that claim needs an executable proof, because the failure mode is silent: an EN page renders,
// looks English, and is missing a chapter nobody counted.
//
// Chapter identity is the number 1–15, never a slug. `governacao` and `governance` are two addresses for
// chapter 11. A test that matched slugs would be testing the URL scheme; this one tests the document.

import { describe, it, expect } from "vitest";
import { getReferenceChapters, getReferenceChapter, getReferenceOutline, chapterSlugMap, chapterCounterpart } from "./reference";

const EXPECTED_CHAPTERS = 15;

describe("Reference source parity", () => {
  it("both editions parse the expected number of chapters", () => {
    const pt = getReferenceChapters("pt");
    const en = getReferenceChapters("en");
    // Non-vacuity first: a parser that returns nothing would satisfy every comparison below.
    expect(pt.length).toBe(EXPECTED_CHAPTERS);
    expect(en.length).toBe(EXPECTED_CHAPTERS);
  });

  it("carries the same semantic chapters in the same order", () => {
    const pt = getReferenceChapters("pt").map((c) => c.num);
    const en = getReferenceChapters("en").map((c) => c.num);
    expect(en).toEqual(pt);
    expect(pt).toEqual([...pt].sort((a, b) => a - b));
  });

  it("every chapter has real content in both editions", () => {
    for (const locale of ["pt", "en"] as const) {
      for (const c of getReferenceChapters(locale)) {
        expect(c.content.trim().length, `${locale} chapter ${c.num} is empty`).toBeGreaterThan(200);
        expect(c.title.trim().length, `${locale} chapter ${c.num} has no title`).toBeGreaterThan(0);
      }
    }
  });

  it("titles differ between editions — the same chapter, actually translated", () => {
    // If EN titles equalled PT titles the mirror would be Portuguese wearing an English filename, which is
    // exactly the "EN page with PT body" defect this milestone exists to prevent.
    const pt = getReferenceChapters("pt");
    const en = getReferenceChapters("en");
    const identical = pt.filter((c, i) => c.title === en[i].title).map((c) => c.num);
    expect(identical).toEqual([]);
  });
});

describe("chapter identity and public slugs", () => {
  it("declares 15 chapters with unique slugs in each locale", () => {
    const map = chapterSlugMap();
    expect(map.length).toBe(EXPECTED_CHAPTERS);
    expect(new Set(map.map((m) => m.num)).size).toBe(EXPECTED_CHAPTERS);
    expect(new Set(map.map((m) => m.pt)).size).toBe(EXPECTED_CHAPTERS);
    expect(new Set(map.map((m) => m.en)).size).toBe(EXPECTED_CHAPTERS);
  });

  it("resolves a chapter by the slug of its own locale", () => {
    // Chapter 11 in both languages. The slugs share no substring, which is the point: no prefix rule or
    // string surgery could get from one to the other.
    expect(getReferenceChapter("governacao", "pt")?.num).toBe(11);
    expect(getReferenceChapter("governance", "en")?.num).toBe(11);
    // And a slug from the wrong locale resolves to nothing rather than falling back.
    expect(getReferenceChapter("governance", "pt")).toBeUndefined();
    expect(getReferenceChapter("governacao", "en")).toBeUndefined();
  });

  it("maps counterparts through the semantic id, never by prefixing", () => {
    expect(chapterCounterpart("governacao", "pt")).toBe("/en/reference/governance");
    expect(chapterCounterpart("confianca", "pt")).toBe("/en/reference/trust");
    expect(chapterCounterpart("operador-zero", "pt")).toBe("/en/reference/operator-zero");
    expect(chapterCounterpart("governance", "en")).toBe("/referencia/governacao");
    expect(chapterCounterpart("faq", "en")).toBe("/referencia/faq");
  });

  it("never produces the rejected /en/referencia architecture", () => {
    // The failure a naive `"/en" + pathname` counterpart would cause, pinned so it cannot come back.
    for (const { pt } of chapterSlugMap()) {
      const en = chapterCounterpart(pt, "pt");
      expect(en, `counterpart for ${pt}`).toBeDefined();
      expect(en!.startsWith("/en/reference/")).toBe(true);
      expect(en!.includes("/referencia")).toBe(false);
    }
  });

  it("round-trips every chapter in both directions", () => {
    for (const { pt, en } of chapterSlugMap()) {
      expect(chapterCounterpart(pt, "pt")).toBe(`/en/reference/${en}`);
      expect(chapterCounterpart(en, "en")).toBe(`/referencia/${pt}`);
    }
  });

  it("an unknown slug has no counterpart rather than a guessed one", () => {
    expect(chapterCounterpart("nao-existe", "pt")).toBeUndefined();
    expect(chapterCounterpart("does-not-exist", "en")).toBeUndefined();
  });
});

// ── The Reference is descriptive, and the website must say so ─────────────────────────────────────
//
// The Portuguese index called itself "a referência normativa oficial" — in its metadata and in its body.
// That inverts the institutional hierarchy: normative authority is the Normative Manifest and the artifacts
// it indexes, and the Reference describes them. A public surface that claims otherwise is not a wording
// slip, it is a false statement about who decides what BANZA requires.
//
// Asserted against the page-owned strings rather than by scanning arbitrary Markdown: the Reference
// documents themselves legitimately discuss normative artifacts, so a keyword sweep would fire on correct
// prose and teach everyone to ignore it.

import { readFileSync } from "node:fs";

const pageSource = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

/**
 * Page source with comments removed.
 *
 * The forbidden-path assertions below scan for `/referencia` inside English route files — and the first
 * version of them failed on the files' own explanatory comments, which name the rejected architecture in
 * order to explain why it is rejected. That is a false positive with a bad incentive: it would push a future
 * author to delete the explanation rather than keep the property. The property is about what the code
 * links to, so the comments are stripped before scanning.
 */
const pageCode = (p: string) =>
  pageSource(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("Reference authority boundary", () => {
  // Block F — the Reference landing became ONE view rendering both editions, with the framing text in a
  // per-edition content module. That is where these claims live now. The English edition used to be a
  // smaller page than the Portuguese one; there is one page left to check, and this file checks both of
  // its realizations at their source.
  const PT_INDEX = "../components/pages/referenceContent.ts";
  const EN_INDEX = "../components/pages/referenceContent.ts";

  it("the PT index presents the Reference as descriptive, never normative", () => {
    const src = pageSource(PT_INDEX);
    expect(src).toContain("referência descritiva oficial");
    // The exact historical defect, pinned so it cannot return.
    expect(src).not.toContain("referência normativa oficial");
  });

  it("the EN index presents the Reference as descriptive, never normative", () => {
    const src = pageSource(EN_INDEX);
    expect(src).toContain("official descriptive Reference");
    expect(src.toLowerCase()).not.toContain("official normative reference");
    expect(src.toLowerCase()).not.toContain("normative reference for");
  });

  it("both editions say the canonical sources define the requirements", () => {
    // The positive half: it is not enough to avoid the wrong word, the hierarchy must be stated.
    expect(pageSource(PT_INDEX)).toContain("definem os requisitos aplicáveis");
    expect(pageSource(EN_INDEX)).toContain("define the applicable");
  });
});

// ── Route-level parity, distinct from the data-level suite above ──────────────────────────────────

describe("Reference route parity", () => {
  const EN_CHAPTER_ROUTE = "../app/en/reference/[chapter]/page.tsx";
  const PT_CHAPTER_ROUTE = "../app/(pt)/referencia/[capitulo]/page.tsx";

  it("every semantic chapter resolves from both locale slugs", () => {
    for (const { num, pt, en } of chapterSlugMap()) {
      expect(getReferenceChapter(pt, "pt")?.num, `PT ${pt}`).toBe(num);
      expect(getReferenceChapter(en, "en")?.num, `EN ${en}`).toBe(num);
    }
  });

  it("the previous/next graph is a 15-node chain in both editions", () => {
    for (const locale of ["pt", "en"] as const) {
      const chapters = getReferenceChapters(locale);
      expect(chapters.length).toBe(15);
      chapters.forEach((c, i) => {
        const prev = i > 0 ? chapters[i - 1] : null;
        const next = i + 1 < chapters.length ? chapters[i + 1] : null;
        if (i === 0) expect(prev).toBeNull();
        if (i === chapters.length - 1) expect(next).toBeNull();
        if (prev) expect(prev.num).toBe(c.num - 1);
        if (next) expect(next.num).toBe(c.num + 1);
      });
    }
  });

  it("the EN chapter route never links into the PT Reference", () => {
    // A cross-locale next/previous is the failure this pins: the reader is reading English and one click
    // lands them in Portuguese.
    const src = pageCode(EN_CHAPTER_ROUTE);
    expect(src).not.toMatch(/href=\{?["'`]\/referencia/);
    expect(src).not.toContain("/referencia/");
    // And its navigation labels are English.
    for (const pt of ["Anterior", "Seguinte", "Capítulo anterior", "Voltar ao índice"]) {
      expect(src, `PT label ${pt} in EN route`).not.toContain(pt);
    }
  });

  it("the PT chapter route never links into the EN Reference", () => {
    expect(pageCode(PT_CHAPTER_ROUTE)).not.toContain("/en/reference");
  });

  it("the EN routes declare their own canonical and reciprocal alternates", () => {
    for (const [p, canonical] of [
      ["../app/en/reference/page.tsx", "/en/reference"],
      ["../app/en/reference/full/page.tsx", "/en/reference/full"],
    ] as const) {
      const src = pageSource(p);
      // A page that delegates to a shared view declares its alternates through `alternatesFor`, which
      // emits exactly this canonical/hreflang pair for the path it is given.
      if (src.includes("alternatesFor(")) {
        expect(src).toContain(`alternatesFor("${canonical}")`);
      } else {
        expect(src).toContain(`canonical: "${canonical}"`);
        expect(src).toContain('"pt-PT"');
      }
    }
    // The chapter route derives both from the semantic id rather than hard-coding them.
    expect(pageSource(EN_CHAPTER_ROUTE)).toContain("chapterCounterpart(slug, \"en\")");
  });

  it("no EN route file contains the rejected /en/referencia architecture", () => {
    for (const p of [
      "../app/en/reference/page.tsx",
      "../app/en/reference/full/page.tsx",
      EN_CHAPTER_ROUTE,
    ]) {
      expect(pageCode(p), p).not.toContain("/en/referencia");
    }
  });
});

describe("Reference outline slugs follow the locale", () => {
  it("the EN outline emits English slugs, the PT outline Portuguese ones", () => {
    // The defect the container found and the source-scanning tests could not: the outline drives the
    // sidebar, so a Portuguese slug here becomes /en/reference/<pt-slug> — a 404 that renders fine.
    const map = new Map(chapterSlugMap().map((m) => [m.num, m]));
    for (const c of getReferenceOutline("en")) {
      expect(c.slug, `EN outline chapter ${c.num}`).toBe(map.get(c.num)!.en);
    }
    for (const c of getReferenceOutline("pt")) {
      expect(c.slug, `PT outline chapter ${c.num}`).toBe(map.get(c.num)!.pt);
    }
  });
});
