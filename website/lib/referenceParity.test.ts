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
import { getReferenceChapters, getReferenceChapter, chapterSlugMap, chapterCounterpart } from "./reference";

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
