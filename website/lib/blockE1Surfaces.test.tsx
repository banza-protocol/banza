// The eight Block E1 reader surfaces, rendered.
//
// A production build that emits `/en/glossary` proves a route exists. It does not prove the page is in
// English. A mutation showed the difference: switching the English glossary to `locale="pt"` left the
// route valid, the registry correct, the locale switch correct, the build green — and every test in the
// repository passing, while an English reader received 25 Portuguese definitions.
//
// `corePageParity` already does this for the core bilingual pages, but it works from a fixed list that
// the E1 routes were never added to. So these eight surfaces get rendered and read here: four Portuguese,
// four English, each checked for the language it is supposed to be in and for the destinations it points
// at.
//
// WHAT IS NOT ASSERTED. Not that the two languages say the same words — they must not. Not that a page
// avoids every foreign token: `Apache License 2.0`, `NOTICE`, `TRADEMARKS.md`, `implementation_hash` and
// `Banzami — Tecnologia e Serviços, Lda.` are names and appear in both editions by design. What is
// asserted is that the SUBSTANTIVE prose is the locale's own.

import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GLOSSARY_TERMS } from "@/lib/glossaryTerms";
import { pathFor } from "@/lib/routeRegistry";

/** Render a page component. Server components may be async, and awaiting is the only way to see them. */
async function render(mod: { default: unknown }): Promise<string> {
  const out = (mod.default as () => ReactElement | Promise<ReactElement>)();
  const el = out instanceof Promise ? await out : out;
  return renderToStaticMarkup(el);
}

/** Readable text: markup removed, entities decoded, whitespace collapsed. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#x27;|&rsquo;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const surface = {
  ptGlossary: () => import("@/app/(pt)/glossario/page"),
  enGlossary: () => import("@/app/en/glossary/page"),
  ptLicense: () => import("@/app/(pt)/licenca/page"),
  enLicense: () => import("@/app/en/license/page"),
  ptWhitepaper: () => import("@/app/(pt)/whitepaper/page"),
  enWhitepaper: () => import("@/app/en/whitepaper/page"),
  ptVersions: () => import("@/app/(pt)/whitepaper/versions/page"),
  enVersions: () => import("@/app/en/whitepaper/versions/page"),
};

describe("Block E1 — all eight reader surfaces render in their own language", () => {
  // ── GLOSSARY ────────────────────────────────────────────────────────────────────────────────────
  it("PT glossary renders every term, in Portuguese", async () => {
    const t = text(await render(await surface.ptGlossary()));
    expect(t.length).toBeGreaterThan(2000);
    expect(t).toContain("Os conceitos do BANZA");
    for (const term of GLOSSARY_TERMS) expect(t, `missing PT term ${term.key}`).toContain(term.name.pt);
    expect(t).toContain("RELACIONADOS");
    expect(t).toContain("NÃO CONFUNDIR");
  });

  it("EN glossary renders every term, in English — not the Portuguese realization", async () => {
    // Mutation C's owning assertion. Rendering `locale="pt"` under /en/glossary fails here and nowhere
    // else: the route, the registry and the locale switch all stay correct while the reader gets
    // Portuguese.
    const t = text(await render(await surface.enGlossary()));
    expect(t.length).toBeGreaterThan(2000);
    expect(t).toContain("The concepts of BANZA");
    expect(t).toContain("RELATED");
    expect(t).toContain("DO NOT CONFUSE");
    for (const term of GLOSSARY_TERMS) expect(t, `missing EN term ${term.key}`).toContain(term.name.en);
    // The English page must carry English DEFINITIONS, not just English headings.
    const cert = GLOSSARY_TERMS.find((x) => x.key === "certification")!;
    expect(t, "the English glossary is serving the Portuguese definitions").toContain(cert.full.en.slice(0, 60));
    expect(t).not.toContain(cert.full.pt.slice(0, 60));
    // Portuguese chrome must not survive into the English page.
    expect(t).not.toContain("RELACIONADOS");
    expect(t).not.toContain("NÃO CONFUNDIR");
  });

  it("both glossaries carry the same 25 concepts and resolve every relationship", async () => {
    expect(GLOSSARY_TERMS.length).toBe(25);
    const keys = new Set(GLOSSARY_TERMS.map((t) => t.key));
    const dangling = GLOSSARY_TERMS.flatMap((t) => t.related).filter((k) => !keys.has(k));
    expect(dangling, "related keys must resolve").toEqual([]);
  });

  // ── LICENSE ─────────────────────────────────────────────────────────────────────────────────────
  it("PT licence renders Portuguese explanation and links the canonical artifacts", async () => {
    const html = await render(await surface.ptLicense());
    const t = text(html);
    expect(t).toContain("Open source sob Apache-2.0");
    expect(t).toContain("A licença não concede direitos de marca");
    for (const a of ["/blob/main/LICENSE", "/blob/main/NOTICE", "/blob/main/TRADEMARKS.md"]) {
      expect(html, `PT licence must link ${a}`).toContain(a);
    }
  });

  it("EN licence renders English explanation and links the same canonical artifacts", async () => {
    const html = await render(await surface.enLicense());
    const t = text(html);
    expect(t).toContain("Open source under Apache-2.0");
    expect(t).toContain("The licence grants no trademark rights");
    expect(t, "English licence must not carry the Portuguese explanation").not.toContain("não concede");
    // The legal artifacts are canonical and identical for both editions — they are not translated.
    for (const a of ["/blob/main/LICENSE", "/blob/main/NOTICE", "/blob/main/TRADEMARKS.md"]) {
      expect(html, `EN licence must link ${a}`).toContain(a);
    }
    // Reader navigation goes to the English governance page, not the Portuguese one.
    expect(html).toContain('href="/en/open-governance"');
    expect(html).not.toContain('href="/governanca"');
  });

  // ── WHITEPAPER ──────────────────────────────────────────────────────────────────────────────────
  it("PT whitepaper page offers both editions and names the canonical one in Portuguese", async () => {
    const html = await render(await surface.ptWhitepaper());
    const t = text(html);
    expect(t).toContain("DOCUMENTO FUNDACIONAL");
    expect(t).toContain("Edição canónica (Português)");
    expect(t).toContain("Official English Translation");
    expect(html).toContain("banza-whitepaper-v1.0-pt.pdf");
    expect(html).toContain("banza-whitepaper-v1.0-en.pdf");
  });

  it("EN whitepaper page is English and still names the Portuguese edition as canonical", async () => {
    const html = await render(await surface.enWhitepaper());
    const t = text(html);
    expect(t).toContain("FOUNDATIONAL DOCUMENT");
    // The canonicity relationship is a FACT and survives translation: PT canonical, EN official.
    expect(t).toContain("Canonical edition (Portuguese)");
    expect(t).toContain("Official English Translation");
    expect(t).toContain("Abstract");
    expect(t, "English page must not carry the Portuguese chrome").not.toContain("DOCUMENTO FUNDACIONAL");
    expect(t).not.toContain("Ler online");
    // Both documents remain reachable; neither control mislabels the other's language.
    expect(html).toContain("banza-whitepaper-v1.0-pt.pdf");
    expect(html).toContain("banza-whitepaper-v1.0-en.pdf");
    expect(html).toContain('href="/en/whitepaper/versions"');
  });

  // ── WHITEPAPER VERSIONS ─────────────────────────────────────────────────────────────────────────
  it("PT versions page renders, and its chrome language is recorded as a KNOWN OPEN DEFECT", async () => {
    // Measured, not assumed: this page renders "Version history & hashes" — English chrome on the
    // Portuguese route — and it did so before Block E1 touched anything (verified at eda1c51 and
    // earlier). So WHITEPAPER_VERSIONS does not yet have real PT/EN parity: the English edition is
    // close to the Portuguese one because the Portuguese one was already English.
    //
    // This asserts only what is TRUE today. It deliberately does not assert Portuguese chrome, because
    // that would fail on a defect this milestone did not introduce and has not fixed; and it does not
    // assert English either, because that would freeze the defect in place as though it were intended.
    const t = text(await render(await surface.ptVersions()));
    expect(t.length).toBeGreaterThan(200);
    expect(t, "the versions page must still list the canonical artifacts").toMatch(/v1\.0|SHA-256|sha256/i);
  });

  it("EN versions page renders in English and invents no English artifact", async () => {
    const html = await render(await surface.enVersions());
    const t = text(html);
    expect(t.length).toBeGreaterThan(200);
    expect(t).toMatch(/Version|Published|Language/i);
    expect(t, "English versions page must not carry Portuguese chrome").not.toMatch(/histórico de versões/i);
    // Version identity is a fact, not a translation: whatever artifacts the PT page names, this names too.
    const pt = await render(await surface.ptVersions());
    for (const m of pt.match(/banza-whitepaper-v[\d.]+-[a-z]{2}\.pdf/g) ?? []) {
      expect(html, `EN versions must list the same artifact ${m}`).toContain(m);
    }
  });

  // ── LOCALE SWITCH ───────────────────────────────────────────────────────────────────────────────
  it("every E1 route pairs with its own counterpart, in both directions", async () => {
    // Mutation D's owning assertion: a switch that lands on a DIFFERENT valid E1 page fails here.
    const PAIRS: Array<[string, string, string]> = [
      ["GLOSSARY", "/glossario", "/en/glossary"],
      ["LICENSE", "/licenca", "/en/license"],
      ["WHITEPAPER", "/whitepaper", "/en/whitepaper"],
      ["WHITEPAPER_VERSIONS", "/whitepaper/versions", "/en/whitepaper/versions"],
    ];
    for (const [id, pt, en] of PAIRS) {
      expect(pathFor(id, "pt"), `${id} PT path`).toBe(pt);
      expect(pathFor(id, "en"), `${id} EN path`).toBe(en);
    }
    // …and no two of them share a destination, which is what a mis-wired switch looks like.
    const ens = PAIRS.map(([id]) => pathFor(id, "en"));
    expect(new Set(ens).size, "each E1 route must have its OWN English counterpart").toBe(PAIRS.length);
  });
});
