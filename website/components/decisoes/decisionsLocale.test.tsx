// Block E2 / Q4 — the two editions of the decision library make the SAME governance claims.
//
// A decision record is a governance artifact. Its code, its type, its state, its slug and where it links
// are facts about what the protocol decided and when — not prose about it. An English edition that renamed
// a record, reordered the trail, linked somewhere else, or showed a draft as active would not be a
// translation: it would be a second, contradictory account of the same governance history, and it would
// look completely healthy from the outside (route correct, registry correct, build green, every string
// present and in the right language).
//
// So this file reads the two renders as DATA. The cards carry their identity and state as attributes, and
// the property compares those payloads across editions rather than comparing sentences. What must differ
// is the chrome; what must not differ is everything the reader could quote as a fact.

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionsExplorer } from "./DecisionsExplorer";
import { DecisionsIndexView } from "./DecisionsIndexView";
import { DecisionDetailView } from "./DecisionDetailView";
import { decisions } from "@/lib/decisions";
import {
  DECISIONS_COPY,
  IDENTICAL_ACROSS_EDITIONS,
  decisionAskQuestion,
  decisionDetailAskQuestion,
  decisionDetailStateLabel,
  decisionStateLabel,
  decisionsCopy,
  decisionsCopyIds,
} from "./decisionsPresentation";
import type { Decision } from "@/lib/decisions";
import type { Locale } from "@/lib/i18n";

const LOCALES: Locale[] = ["pt", "en"];

// A fixture library that exercises every state and both types. Deliberately NOT the real index: the
// property is about how the two editions treat a record, not about how many records exist today.
const FIXTURE: Decision[] = [
  { id: "ADR-012", type: "ADR", slug: "adr-012-ledger", title: "Ledger de dupla entrada", summary: "s1", category: "Ledger", status: "activo", path: "decisions/adr/ADR-012.md" },
  { id: "RFC-004", type: "RFC", slug: "rfc-004-federation", title: "Federação", summary: "s2", category: "Federação", status: "rascunho", path: "decisions/rfc/RFC-004.md" },
  { id: "ADR-002", type: "ADR", slug: "adr-002-separation", title: "Separação operador", summary: "s3", category: "Governação", status: "substituido", path: "decisions/adr/ADR-002.md" },
] as Decision[];

const CATEGORIES = ["Ledger", "Federação", "Governação"];

const render = (locale: Locale): string =>
  renderToStaticMarkup(<DecisionsExplorer decisions={FIXTURE} categories={CATEGORIES} locale={locale} />);

/** Everything the page CLAIMS about the records, in render order, independent of language. */
function semanticPayload(html: string): string[] {
  const cards = html.match(/data-decision-id="[^"]*"[^>]*/g) ?? [];
  const attr = (chunk: string, name: string) => chunk.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? "";
  const ids = cards.map((c) =>
    ["data-decision-id", "data-decision-type", "data-decision-status", "data-decision-slug"]
      .map((n) => attr(c, n))
      .join("|"),
  );
  const hrefs = (html.match(/href="\/decisoes\/[^"]*"/g) ?? []).sort();
  return [...ids, ...hrefs];
}

describe("Q4 — both editions state the same governance facts", () => {
  it("renders the same records, in the same order, with the same type and state", () => {
    // E2-F's owning assertion. An English edition that promoted the draft, renamed a record or reordered
    // the trail fails here while every string on the page is still correct English.
    const pt = semanticPayload(render("pt"));
    const en = semanticPayload(render("en"));
    expect(pt.length).toBeGreaterThan(0);
    expect(en, "the English library claims something different about the records").toEqual(pt);
    expect(pt[0]).toContain("ADR-012|ADR|activo");
    expect(pt[1]).toContain("RFC-004|RFC|rascunho");
    expect(pt[2]).toContain("ADR-002|ADR|substituido");
  });

  it("links every record to the same destination in both editions", () => {
    // The library has no English route yet, so both editions link to the canonical Portuguese document.
    // That is a deliberate fact about the surface, and it is asserted rather than assumed.
    const hrefs = (html: string) => (html.match(/href="\/decisoes\/[^"]*"/g) ?? []).sort();
    expect(hrefs(render("en"))).toEqual(hrefs(render("pt")));
    expect(hrefs(render("en")).length).toBeGreaterThan(0);
  });

  it("never translates the record's own identity or its authored title", () => {
    const en = render("en");
    for (const d of FIXTURE) {
      expect(en, `${d.id} lost its code`).toContain(d.id);
      // Title and summary are carried in the document's original language and stay verbatim.
      expect(en, `${d.id} had its authored title rewritten`).toContain(d.title);
      expect(en).toContain(d.category);
    }
  });
});

describe("Q4 — the chrome is the reader's own", () => {
  it("names the states in the reader's language while the state itself is unchanged", () => {
    // The state decides; the label explains. Same fact, two words for it.
    expect(decisionStateLabel("rascunho", "pt")).toBe("Rascunho");
    expect(decisionStateLabel("rascunho", "en")).toBe("Draft");
    expect(decisionStateLabel("substituido", "en")).toBe("Superseded");
    // An unknown state is shown verbatim rather than guessed at or silently relabelled.
    expect(decisionStateLabel("desconhecido", "en")).toBe("desconhecido");
  });

  it("renders the English library in English and the Portuguese one in Portuguese", () => {
    const en = render("en");
    const pt = render("pt");
    for (const id of ["card.readFull", "card.nonNormative", "facet.allThemes"] as const) {
      expect(en, `${id} is not in English`).toContain(decisionsCopy(id, "en"));
      expect(pt).toContain(decisionsCopy(id, "pt"));
    }
    expect(en, "Portuguese chrome survived into the English library").not.toContain(decisionsCopy("card.readFull", "pt"));
    expect(en).not.toContain(decisionsCopy("library.note", "pt"));
    expect(pt).not.toContain(decisionsCopy("library.note", "en"));
    // The empty state is a real render too — it is what a reader sees most often while filtering.
    const empty = (l: Locale) =>
      renderToStaticMarkup(<DecisionsExplorer decisions={[]} categories={[]} locale={l} />);
    expect(empty("en")).toContain(decisionsCopy("empty.hint", "en"));
    expect(empty("en")).not.toContain(decisionsCopy("empty.hint", "pt"));
    expect(empty("pt")).toContain(decisionsCopy("empty.title", "pt"));
  });

  it("asks BanzAI the reader's own question, composed around the record's code", () => {
    // The question is composed in the target language around the code — not written in Portuguese and
    // then translated — and it keeps the "confers status on no operator" clause in both editions.
    const en = decisionAskQuestion("ADR", "ADR-012", "en");
    const pt = decisionAskQuestion("ADR", "ADR-012", "pt");
    expect(en).toContain("ADR-012");
    expect(pt).toContain("ADR-012");
    expect(en).not.toBe(pt);
    expect(en).toMatch(/confers status on no operator/);
    expect(pt).toMatch(/não confere estatuto a nenhum operador/);
    // An RFC asks a different question than an ADR — in both editions.
    for (const l of LOCALES) {
      expect(decisionAskQuestion("RFC", "RFC-004", l)).not.toBe(decisionAskQuestion("ADR", "RFC-004", l));
    }
    // …and the rendered link carries the reader's question, not the other edition's.
    expect(render("en")).toContain(encodeURIComponent(decisionAskQuestion("ADR", "ADR-012", "en")));
    expect(render("en")).not.toContain(encodeURIComponent(decisionAskQuestion("ADR", "ADR-012", "pt")));
  });
});

describe("Q4 — the catalogue is closed and complete", () => {
  it("realizes every id in both editions", () => {
    const ids = decisionsCopyIds();
    expect(ids.length).toBe(77);
    for (const id of ids) {
      for (const l of LOCALES) expect(DECISIONS_COPY[id][l].trim().length, `${id}/${l}`).toBeGreaterThan(0);
      if (IDENTICAL_ACROSS_EDITIONS.includes(id)) {
        // The acronyms themselves: translating "ADRs" would invent a term the trail does not use.
        expect(DECISIONS_COPY[id].en).toBe(DECISIONS_COPY[id].pt);
      } else {
        expect(DECISIONS_COPY[id].en, `${id} English is a copy of the Portuguese`).not.toBe(DECISIONS_COPY[id].pt);
      }
    }
    expect(IDENTICAL_ACROSS_EDITIONS.length).toBe(4);
  });

  it("requires the locale and throws rather than substituting an edition", () => {
    expect(decisionsCopy.length).toBeGreaterThanOrEqual(2);
    expect(() => decisionsCopy("no.such.id" as never, "en")).toThrow(/unknown id/);
    expect(() => decisionsCopy("state.activo", "de" as Locale)).toThrow(/no de realization/);
    expect(() => decisionsCopy("ask.adr", "en")).toThrow(/needs parameter "id"/);
  });

  it("leaves no unresolved placeholder in a rendered edition", () => {
    for (const l of LOCALES) expect(render(l)).not.toMatch(/\{id\}/);
  });
});

// ── Q5 — the two decision ROUTE surfaces ─────────────────────────────────────────────────────────────
//
// Q4 localized the explorer and left the pages around it Portuguese, which is the failure mode this
// block keeps producing: a correct component inside an untranslated frame. These render the real route
// surfaces, in both editions, and read what came out.

const RECORD = decisions[0];
const BODY = "# Título\n\nCorpo do documento na sua língua original.";

const indexView = (locale: Locale): string =>
  renderToStaticMarkup(<DecisionsIndexView locale={locale} />);
const detailView = (locale: Locale): string =>
  renderToStaticMarkup(<DecisionDetailView decision={RECORD} body={BODY} locale={locale} />);

/** Readable text: markup removed, entities decoded, whitespace collapsed. */
const readable = (html: string): string =>
  html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&rsquo;/g, "'").replace(/\s+/g, " ").trim();

describe("Q5 — the decision routes are one surface in two editions", () => {
  it("renders the index page in each edition, with no other edition's prose", () => {
    const en = readable(indexView("en"));
    const pt = readable(indexView("pt"));
    for (const id of ["index.title", "index.lede", "index.note.1", "index.link.governanceProcess"] as const) {
      expect(en, `${id} is not in English`).toContain(decisionsCopy(id, "en"));
      expect(pt, `${id} is not in Portuguese`).toContain(decisionsCopy(id, "pt"));
      expect(en, `${id} leaked the Portuguese realization`).not.toContain(decisionsCopy(id, "pt"));
      expect(pt).not.toContain(decisionsCopy(id, "en"));
    }
  });

  it("renders a record's own page in each edition", () => {
    const en = readable(detailView("en"));
    const pt = readable(detailView("pt"));
    for (const id of ["detail.note.heading", "detail.action.readOnGithub", "detail.normativeLevel", "detail.note.bodyTail"] as const) {
      expect(en, `${id} is not in English`).toContain(decisionsCopy(id, "en"));
      expect(pt).toContain(decisionsCopy(id, "pt"));
      expect(en, `${id} leaked the Portuguese realization`).not.toContain(decisionsCopy(id, "pt"));
    }
    // The metadata keys are rendered upper-cased, so they are read that way rather than assumed.
    for (const id of ["detail.meta.type", "detail.meta.state", "detail.meta.path"] as const) {
      expect(en, `${id} is not in English`).toContain(decisionsCopy(id, "en").toUpperCase());
      expect(pt).toContain(decisionsCopy(id, "pt").toUpperCase());
    }
    // The long-form state is the record's declared state, said out loud in the reader's language.
    expect(en).toContain(decisionDetailStateLabel(RECORD.status, "en"));
    expect(en).not.toContain(decisionDetailStateLabel(RECORD.status, "pt"));
  });

  it("asserts the SAME facts about the record whatever the edition", () => {
    // Identity, repository path, canonical URL, neighbours and the document body are the page's factual
    // claims. A translation may not touch any of them.
    const en = detailView("en");
    const pt = detailView("pt");
    for (const fact of [RECORD.id, RECORD.path, RECORD.canonicalUrl, RECORD.title, RECORD.type]) {
      expect(en, `${fact} missing from the English page`).toContain(fact);
      expect(pt).toContain(fact);
    }
    const links = (html: string) => (html.match(/href="\/decisoes\/[^"]*"/g) ?? []).sort();
    expect(links(en)).toEqual(links(pt));
    // The document body is served in its ORIGINAL language and is byte-identical in both editions.
    expect(readable(en)).toContain("Corpo do documento na sua língua original.");
    expect(readable(pt)).toContain("Corpo do documento na sua língua original.");
  });

  it("asks the record's own question — distinct from the library card's — in the reader's language", () => {
    const en = detailView("en");
    expect(en).toContain(encodeURIComponent(decisionDetailAskQuestion(RECORD.type, RECORD.id, "en")));
    expect(en).not.toContain(encodeURIComponent(decisionDetailAskQuestion(RECORD.type, RECORD.id, "pt")));
    // The two surfaces close on different clauses, and that difference survives translation.
    for (const l of LOCALES) {
      expect(decisionDetailAskQuestion("ADR", "ADR-012", l)).not.toBe(decisionAskQuestion("ADR", "ADR-012", l));
    }
    expect(decisionDetailAskQuestion("ADR", "ADR-012", "en")).toMatch(/confers no certification/);
  });

  it("leaves no unresolved placeholder in either route surface", () => {
    for (const l of LOCALES) {
      expect(indexView(l)).not.toMatch(/\{(adr|rfc|id)\}/);
      expect(detailView(l)).not.toMatch(/\{(adr|rfc|id)\}/);
    }
  });
});
