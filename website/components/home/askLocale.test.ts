import { describe, it, expect } from "vitest";
import { buildAskBody, mapAskResponse } from "./banzaiKb";
import { askStatus, sourcesLabel } from "./askStatusPresentation";
import { LOCALES, type Locale } from "@/lib/i18n";

// The production regression this file exists to prevent.
//
// On the English BanzAI surface a reader asked "What is L2". The chrome was English, the suggestions were
// English, and the deterministic answer came back in Portuguese — as did the line underneath it that
// claims to explain how the answer was produced.
//
// The cause was not the knowledge base. An English realization of that entry exists and the deployed API
// returns it when asked: the request simply never said which edition was asking, so the API applied its
// legacy default of pt-PT. That default is correct for old callers and wrong for a reader on /en/banzai.
//
// The rule: the reader's locale is authoritative and always travels with the request. The language of the
// question is never used to infer it — an English sentence must not be what rescues a lost locale, and a
// Portuguese-sounding question from the English surface must still be answered in English.

const editions = LOCALES as readonly Locale[];

describe("the reader's locale travels with every ask request", () => {
  it("sends an explicit locale from both editions", () => {
    for (const locale of editions) {
      const body = buildAskBody("What is L2", [], undefined, null, locale);
      expect(body.locale, `${locale} request must state its locale`).toBe(locale);
    }
  });

  it("never omits the locale — an omitted locale is answered in Portuguese by the API", () => {
    // Pinned as a contract, not a style preference: the API's legacy default is pt-PT, so a request with
    // no locale is a request for Portuguese whatever the question says.
    const body = buildAskBody("What is L2", [], undefined, null, "en");
    expect(Object.keys(body)).toContain("locale");
    expect(body.locale).not.toBeUndefined();
  });

  it("does not infer the locale from the language of the question", () => {
    // A Portuguese question asked from the English surface is still an English reader.
    const enFromPtQuestion = buildAskBody("O que é o L2?", [], undefined, null, "en");
    expect(enFromPtQuestion.locale).toBe("en");
    // And the reverse.
    const ptFromEnQuestion = buildAskBody("What is L2", [], undefined, null, "pt");
    expect(ptFromEnQuestion.locale).toBe("pt");
  });
});

describe("the provenance line speaks the reader's language", () => {
  // The shape the API returns for the exact production case: a grounded, deterministic answer with two
  // sources and no model call.
  const deterministic = {
    grounded: true,
    answer: "**L2** is the **Payment Initiation Capability** profile.",
    // The real payload shape: the count is its own field, matching what the production API returns.
    sources: [{ title: "a" }, { title: "b" }],
    sources_count: 2,
    meta: { llm_called: false, deterministic: true },
  };

  it("renders the deterministic status in each edition", () => {
    const en = mapAskResponse(deterministic, "en");
    const pt = mapAskResponse(deterministic, "pt");
    expect(en.status).toContain("Deterministic answer");
    expect(en.status).toContain("no model call");
    expect(en.status).toContain("2 sources");
    expect(pt.status).toContain("Resposta determinística");
    expect(pt.status).toContain("2 fontes");
    // The exact production defect: Portuguese provenance under an English answer.
    expect(en.status).not.toContain("Resposta determinística");
    expect(en.status).not.toContain("fontes");
  });

  it("agrees the count with its unit in both editions", () => {
    expect(sourcesLabel(1, "en")).toBe("1 source");
    expect(sourcesLabel(2, "en")).toBe("2 sources");
    expect(sourcesLabel(1, "pt")).toBe("1 fonte");
    expect(sourcesLabel(2, "pt")).toBe("2 fontes");
  });

  it("realizes every status identity in both editions, with neither left blank", () => {
    const ids = [
      "status.deterministic",
      "status.postValidation",
      "status.documentNotFound",
      "status.insufficientEvidence",
      "status.localModel",
      "status.cachedLocal",
      "degraded.unavailable",
      "degraded.timeout",
      "degraded.default",
    ] as const;
    for (const id of ids) {
      for (const locale of editions) {
        expect(askStatus(id, locale).trim().length, `${id} / ${locale}`).toBeGreaterThan(0);
      }
      // A status that reads identically in both editions is a status one edition has not been given.
      expect(askStatus(id, "pt")).not.toBe(askStatus(id, "en"));
    }
  });

  it("keeps a degraded answer honest in English too", () => {
    const degraded = {
      grounded: true,
      answer: "…",
      sources: [{ title: "a" }],
      sources_count: 1,
      degraded: true,
      fallback_reason: "local_inference_unavailable",
      meta: { llm_called: false },
    };
    const en = mapAskResponse(degraded, "en");
    expect(en.status).toContain("Safe fallback");
    expect(en.status).toContain("model unavailable");
    expect(en.status).not.toMatch(/Fallback seguro|indisponível/);
  });
});
