// Block E2 / Q5 — the operator-validation surface, rendered in both editions.
//
// This surface makes CLAIMS about a real implementation: which endpoint was queried, what the engine
// decided, which reason codes it emitted, which hashes it computed, whether the result is durably
// archived, whether a replay was semantically equivalent. An English edition that stated any of those
// differently would not be a translation — it would be a second verdict about the same implementation,
// and it would look entirely healthy: valid route, correct registry, green build, every string present.
//
// So the properties here read what each edition actually RENDERS and compare the claims, not the prose.
// The reader's language may change every word around a fact; it may not change the fact.

import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BanzaiLocaleBoundary } from "./BanzaiWorkspaceProvider";
import {
  ExecutionHistoryPanel,
  PersistenceBadge,
  RESULTS_VIEWS,
  ValidationResultsPanel,
} from "./BanzaiValidationMode";
import {
  VALIDATION_IDENTICAL_ACROSS_EDITIONS,
  VALIDATION_SURFACE_COPY,
  publicationStatusLabelFor,
  reproOutcomeLabel,
  validationCopy,
  validationCopyIds,
} from "./validationPresentation";
import type { ValidationSession } from "./validationJourney";
import type { PersistenceInfo } from "@/lib/banzaiValidateClient";
import { STEP_ORDER } from "./validationJourney";
import type { Locale } from "@/lib/i18n";

const LOCALES: Locale[] = ["pt", "en"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inBoundary = (locale: Locale, node: any, props: Record<string, unknown>): string =>
  renderToStaticMarkup(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(BanzaiLocaleBoundary, { locale }, createElement(node as any, props as any)),
  );

/** Readable text: markup removed, whitespace collapsed. */
const readable = (html: string): string =>
  html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&rsquo;/g, "'").replace(/\s+/g, " ").trim();

// A session with no target selected: every step present and unevaluated, nothing published. This is the
// state a reader lands on, and the one both editions must describe identically.
const emptyResults = Object.fromEntries(
  STEP_ORDER.map((id) => [id, { status: "PENDING", reason_codes: [], evidence_refs: [], receipt: null }]),
);
const sessionNoTarget = {
  operators: [], operatorsLoading: false, operatorsError: false,
  operator: null, implementation: null, operatorId: null, implementationId: null, ready: false,
  steps: [], results: emptyResults, journeyReceipt: null, persistence: null, receipts: [],
} as unknown as ValidationSession;

// The four persistence verdicts the archive can report. Each is engine/archive state, not copy.
const PERSISTENCE: Record<string, PersistenceInfo> = {
  persisted: { status: "PERSISTED", execution_id: "exec_7f3a", retryable: false } as PersistenceInfo,
  disabled: { status: "DISABLED", retryable: false } as PersistenceInfo,
  failed: { status: "NOT_PERSISTED", detail: "FAILED", retryable: true } as PersistenceInfo,
  pending: { status: "NOT_PERSISTED", detail: "PENDING", retryable: true } as PersistenceInfo,
};

describe("Q5 — the validation surface renders in the reader's edition", () => {
  it("reports every persistence verdict in both languages, and the verdict itself never moves", () => {
    for (const [name, p] of Object.entries(PERSISTENCE)) {
      const en = inBoundary("en", PersistenceBadge, { p });
      const pt = inBoundary("pt", PersistenceBadge, { p });
      // The verdict is carried as data and is identical: an English badge that reported a different
      // persistence status than the Portuguese one fails here.
      expect(en, `${name} lost its status attribute`).toContain(`data-persistence="${p.status}"`);
      expect(pt).toContain(`data-persistence="${p.status}"`);
      // The VERDICT the badge presents is a decision about the run, taken from the archive's status
      // alone. A mutation that let the English edition present a pending run as durable — correct
      // English, correct status attribute, different wording from Portuguese — survived until this
      // assertion existed, because every other check it could have tripped stayed true.
      const verdict = (html: string) => html.match(/data-persistence-verdict="([^"]*)"/)?.[1];
      expect(verdict(en), `${name}: the English badge reached a different durability verdict`).toBe(
        verdict(pt),
      );
      expect(verdict(en), `${name}: no verdict rendered`).toBeTruthy();
      // …and the wording really is the reader's.
      expect(readable(en), `${name} is not in English`).not.toBe(readable(pt));
    }
    // The four verdicts really are four: a badge that collapsed two of them would pass the equality
    // above while telling every reader the same thing about different runs.
    const verdicts = Object.values(PERSISTENCE).map(
      (p) => inBoundary("en", PersistenceBadge, { p }).match(/data-persistence-verdict="([^"]*)"/)?.[1],
    );
    expect(new Set(verdicts).size).toBe(4);
    expect(verdicts).toEqual(["persisted", "disabled", "failed", "pending"]);
    // The archive reference is a fact and survives verbatim; its absence is stated in the reader's words.
    expect(inBoundary("en", PersistenceBadge, { p: PERSISTENCE.persisted })).toContain("exec_7f3a");
    expect(readable(inBoundary("en", PersistenceBadge, { p: PERSISTENCE.pending }))).toContain(
      validationCopy("persistence.noArchiveRef", "en"),
    );
    expect(readable(inBoundary("en", PersistenceBadge, { p: PERSISTENCE.pending }))).not.toContain(
      validationCopy("persistence.noArchiveRef", "pt"),
    );
  });

  it("renders the archive guard state in each edition without changing what it guards", () => {
    const en = readable(inBoundary("en", ExecutionHistoryPanel, { session: sessionNoTarget }));
    const pt = readable(inBoundary("pt", ExecutionHistoryPanel, { session: sessionNoTarget }));
    expect(en).toContain(validationCopy("exec.selectPrefix", "en"));

    expect(en, "Portuguese guidance survived into the English archive view").not.toContain(
      validationCopy("exec.selectPrefix", "pt"),
    );
    expect(pt).toContain(validationCopy("exec.selectPrefix", "pt"));
    // The append-only/immutable property of the archive is stated in both, because it is true in both.
    expect(en.toLowerCase()).toContain("append-only");
    expect(pt.toLowerCase()).toContain("append-only");
    expect(en).toContain(validationCopy("exec.selectSuffix", "en"));
  });

  it("renders the empty results area in each edition", () => {
    const props = { session: sessionNoTarget, view: "resumo", onView: () => {}, onGoValidate: () => {} };
    const en = readable(inBoundary("en", ValidationResultsPanel, props));
    const pt = readable(inBoundary("pt", ValidationResultsPanel, props));
    expect(en).toContain(validationCopy("results.title", "en"));
    expect(en).toContain(validationCopy("results.intro", "en"));
    expect(en).not.toContain(validationCopy("results.intro", "pt"));
    expect(pt).toContain(validationCopy("results.intro", "pt"));
  });

  it("offers the same result views, in the same order, with the same ids and icons", () => {
    // The tab SET is application structure. Only its names are the reader's.
    expect(RESULTS_VIEWS.map((v) => v.id)).toEqual([
      "resumo", "receipts", "relatorios", "artefactos", "traces", "evidence", "execucoes",
    ]);
    const props = { session: sessionNoTarget, view: "resumo", onView: () => {}, onGoValidate: () => {} };
    for (const l of LOCALES) {
      const out = inBoundary(l, ValidationResultsPanel, props);
      for (const v of RESULTS_VIEWS) {
        expect(out, `${v.id} tab missing in ${l}`).toContain(validationCopy(v.nameId, l));
      }
    }
  });
});

describe("Q5 — engine and registry data is never translated", () => {
  it("names a publication status for the reader and passes an unknown one through verbatim", () => {
    expect(publicationStatusLabelFor("published", "pt")).toBe("Publicado no registo técnico");
    expect(publicationStatusLabelFor("published", "en")).toBe("Published in the technical registry");
    expect(publicationStatusLabelFor("draft", "en")).toBe("Draft");
    // An enum the registry starts emitting tomorrow is shown as it arrived, in either edition — never
    // invented in one language and left untranslated in the other.
    for (const l of LOCALES) expect(publicationStatusLabelFor("something-new", l)).toBe("something-new");
  });

  it("names a reproduction outcome for the reader and passes an unknown one through verbatim", () => {
    expect(reproOutcomeLabel("SEMANTICALLY_EQUIVALENT", "pt")).toBe("Semanticamente equivalente");
    expect(reproOutcomeLabel("SEMANTICALLY_EQUIVALENT", "en")).toBe("Semantically equivalent");
    expect(reproOutcomeLabel("BLOCKED", "en")).toBe("Reproduction blocked");
    for (const l of LOCALES) expect(reproOutcomeLabel("NEW_OUTCOME", l)).toBe("NEW_OUTCOME");
  });

  it("keeps the contract's own field names identical in both editions", () => {
    // These name a field in a receipt or a protocol artifact. Inventing a translated variant would
    // describe something the contract does not have.
    for (const id of ["receipt.canonicalOrigin", "receipt.httpStatus", "receipt.outputHash", "step.reasonCodes"] as const) {
      expect(validationCopy(id, "en")).toBe(validationCopy(id, "pt"));
    }
  });
});

describe("Q5 — the validation catalogue is closed and complete", () => {
  it("realizes every id in both editions", () => {
    const ids = validationCopyIds();
    expect(ids.length).toBeGreaterThanOrEqual(140);
    for (const id of ids) {
      for (const l of LOCALES) {
        expect(VALIDATION_SURFACE_COPY[id][l].trim().length, `${id}/${l}`).toBeGreaterThan(0);
      }
      if (VALIDATION_IDENTICAL_ACROSS_EDITIONS.includes(id)) {
        expect(VALIDATION_SURFACE_COPY[id].en, `${id} is declared identical but differs`).toBe(
          VALIDATION_SURFACE_COPY[id].pt,
        );
      } else {
        expect(VALIDATION_SURFACE_COPY[id].en, `${id} English is a copy of the Portuguese`).not.toBe(
          VALIDATION_SURFACE_COPY[id].pt,
        );
      }
      // A parameterized id takes the same parameters in both editions — the facts are one set.
      const holes = (t: string) => (t.match(/\{(\w+)\}/g) ?? []).slice().sort().join(",");
      expect(holes(VALIDATION_SURFACE_COPY[id].en), `${id} parameters differ`).toBe(
        holes(VALIDATION_SURFACE_COPY[id].pt),
      );
    }
  });

  it("requires the locale and throws rather than substituting an edition", () => {
    expect(() => validationCopy("no.such.id" as never, "en")).toThrow(/unknown id/);
    expect(() => validationCopy("results.title", "de" as Locale)).toThrow(/no de realization/);
    expect(() => validationCopy("explain.status", "en")).toThrow(/needs parameter "status"/);
  });

  it("leaves no unresolved placeholder in a rendered edition", () => {
    const props = { session: sessionNoTarget, view: "resumo", onView: () => {}, onGoValidate: () => {} };
    for (const l of LOCALES) {
      expect(inBoundary(l, ValidationResultsPanel, props)).not.toMatch(/\{(id|status|endpoint|title|engine)\}/);
      expect(inBoundary(l, PersistenceBadge, { p: PERSISTENCE.persisted })).not.toMatch(/\{id\}/);
    }
  });
});

// ── Q5 — operator onboarding ─────────────────────────────────────────────────────────────────────────
//
// Onboarding reports backend state: how far a candidature has got, whether the origin proof verified, why
// an attempt failed. Those decisions are the backend's. What must be the reader's is the sentence naming
// each one — and, above all, the sentences that say what a candidature is NOT, which are authored in full
// in both editions rather than softened in either.

import {
  ONBOARDING_IDENTICAL_ACROSS_EDITIONS,
  ONBOARDING_SURFACE_COPY,
  onboardingCopy,
  onboardingCopyIds,
  onboardingPresentation,
} from "./onboardingPresentation";

describe("Q5 — onboarding names backend state without changing it", () => {
  it("realizes every id in both editions", () => {
    const ids = onboardingCopyIds();
    expect(ids.length).toBeGreaterThanOrEqual(50);
    for (const id of ids) {
      for (const l of LOCALES) expect(ONBOARDING_SURFACE_COPY[id][l].trim().length, `${id}/${l}`).toBeGreaterThan(0);
      if (ONBOARDING_IDENTICAL_ACROSS_EDITIONS.includes(id)) {
        expect(ONBOARDING_SURFACE_COPY[id].en).toBe(ONBOARDING_SURFACE_COPY[id].pt);
      } else {
        expect(ONBOARDING_SURFACE_COPY[id].en, `${id} English is a copy of the Portuguese`).not.toBe(
          ONBOARDING_SURFACE_COPY[id].pt,
        );
      }
    }
    expect(() => onboardingCopy("no.such" as never, "en")).toThrow(/unknown id/);
    expect(() => onboardingCopy("modeLabel", "de" as Locale)).toThrow(/no de realization/);
  });

  it("states what a candidature is NOT, in full, in both editions", () => {
    // The honest boundary is the reason this surface exists. Neither edition may lose a clause of it.
    for (const l of LOCALES) {
      const boundary = onboardingCopy("boundary", l);
      expect(boundary.length).toBeGreaterThan(200);
    }
    const en = onboardingCopy("boundary", "en");
    expect(en).toMatch(/not a published operator/);
    expect(en).toMatch(/not a certified entity/);
    expect(en).toMatch(/moves no funds/);
    expect(en).toMatch(/grants no regulatory authorisation/);
    expect(en).toMatch(/admits into no scheme/);
  });

  it("builds the nested surface shape from the one catalogue, per edition", () => {
    const en = onboardingPresentation("en");
    const pt = onboardingPresentation("pt");
    // Same structure, different words — one definition of each sentence, not two trees.
    expect(Object.keys(en)).toEqual(Object.keys(pt));
    expect(Object.keys(en.paths)).toEqual(["published", "submit", "recover"]);
    expect(en.email.cta).toBe(onboardingCopy("email.cta", "en"));
    expect(en.email.cta).not.toBe(pt.email.cta);
    expect(en.origin.verified).not.toBe(pt.origin.verified);
  });
});
