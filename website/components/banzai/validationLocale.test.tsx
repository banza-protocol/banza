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
  JourneyProgress,
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

/** Render a component under a declared edition. The props are per-component, so the element type is
 *  erased through `unknown` rather than through `any` — no rule is disabled to make this compile. */
const inBoundary = (
  locale: Locale,
  node: unknown,
  props: Record<string, unknown>,
): string =>
  renderToStaticMarkup(
    createElement(
      BanzaiLocaleBoundary,
      { locale },
      createElement(node as Parameters<typeof createElement>[0], props),
    ),
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

// ── Q5 — the validation journey ──────────────────────────────────────────────────────────────────────
//
// The journey is a sequence of nine steps whose ids, order, engines and verdicts are the application, and
// whose names, descriptions and progress sentence are the reader's. The properties below compare the
// STRUCTURE both editions receive, not the sentences: a journey that reported a different current step, a
// different completed count or a different outcome in English would read perfectly well.

import { STEPS, STEP_META, stepLabel } from "./validationJourney";
import {
  realizeProgress,
  stepBlurb,
  stepStatusLabel,
  stepTitle,
  type ProgressResult,
} from "./validationPresentation";

describe("Q5 — one journey definition, two editions", () => {
  it("gives both editions the same nine steps, in the same order, with the same engines", () => {
    expect(STEPS.length).toBe(9);
    expect(STEPS.map((s) => s.id)).toEqual([...STEP_ORDER]);
    // Identity, position and engine are the journey; nothing about them can vary by edition, and they are
    // stored once rather than duplicated into a second ordered array per language.
    for (const s of STEPS) {
      expect(STEP_META[s.id]).toBe(s);
      expect(s.num).toBe(STEPS.indexOf(s) + 1);
      expect(s.engine.length).toBeGreaterThan(0);
    }
  });

  it("binds every step's name and description by id, and authors both editions", () => {
    for (const s of STEPS) {
      for (const l of LOCALES) {
        expect(stepTitle(s.id, l).trim().length, `${s.id} title/${l}`).toBeGreaterThan(0);
        expect(stepBlurb(s.id, l).trim().length, `${s.id} blurb/${l}`).toBeGreaterThan(0);
      }
      // The step's NUMBER survives into the label; only the name is the reader's.
      expect(stepLabel(s.id, "en")).toBe(`${s.num} ${stepTitle(s.id, "en")}`);
      expect(stepLabel(s.id, "pt")).toBe(`${s.num} ${stepTitle(s.id, "pt")}`);
    }
    // Protocol terms stay put; the rest is translated. Both directions are asserted so making English pass
    // by sharing Portuguese copy fails here.
    for (const id of ["discovery", "manifest", "keys", "evidence"]) {
      expect(stepTitle(id, "en")).toBe(stepTitle(id, "pt"));
    }
    for (const id of ["conformance", "interoperability", "trust", "federation", "certification"]) {
      expect(stepTitle(id, "en"), `${id} title is untranslated`).not.toBe(stepTitle(id, "pt"));
    }
    for (const s of STEPS) expect(stepBlurb(s.id, "en"), `${s.id} blurb`).not.toBe(stepBlurb(s.id, "pt"));
  });

  it("names the engine's verdict without changing it", () => {
    const STATUSES = ["NOT_EVALUATED", "PENDING", "VERIFIED", "FAILED", "BLOCKED", "NOT_APPLICABLE"];
    for (const st of STATUSES) {
      expect(stepStatusLabel(st, "en"), `${st} is untranslated`).not.toBe(stepStatusLabel(st, "pt"));
      expect(stepStatusLabel(st, "en").trim().length).toBeGreaterThan(0);
    }
    // ADR-030 — a step out of scope for the declared profile is not a failure, in either edition.
    expect(stepStatusLabel("NOT_APPLICABLE", "en").toLowerCase()).not.toMatch(/fail/);
    expect(stepStatusLabel("NOT_APPLICABLE", "pt").toLowerCase()).not.toMatch(/falh/);
    // A status the engine starts emitting tomorrow is shown as it arrived, in both.
    for (const l of LOCALES) expect(stepStatusLabel("NEW_STATUS", l)).toBe("NEW_STATUS");
  });
});

describe("Q5 — progress means the same thing in both editions", () => {
  // Every branch of the progress decision, with the counters that reach it.
  const RESULTS: ProgressResult[] = [
    { kind: "running" },
    { kind: "notStarted" },
    { kind: "partial", evaluated: 4, total: 9 },
    { kind: "doneOneBlocker" },
    { kind: "doneAllVerified" },
    { kind: "doneWithCounts", verified: 7, pending: 0, failed: 1, blocked: 1 },
    { kind: "doneWithCounts", verified: 8, pending: 1, failed: 0, blocked: 0 },
  ];

  it("realizes every outcome in both editions, from the same result", () => {
    for (const r of RESULTS) {
      const en = realizeProgress(r, "en");
      const pt = realizeProgress(r, "pt");
      expect(en.trim().length, `${r.kind} en`).toBeGreaterThan(0);
      expect(en, `${r.kind} is untranslated`).not.toBe(pt);
      // The NUMBERS are facts and survive verbatim into both.
      if (r.kind === "partial") {
        for (const out of [en, pt]) expect(out).toContain("4");
        for (const out of [en, pt]) expect(out).toContain("9");
      }
      if (r.kind === "doneWithCounts") {
        for (const k of ["verified", "pending", "failed", "blocked"] as const) {
          if (r[k] > 0) for (const out of [en, pt]) expect(out).toContain(String(r[k]));
        }
      }
    }
  });

  it("renders the same progress meaning in both editions, for every outcome", () => {
    // The realization property above is not enough: a mutation that substituted a DIFFERENT result at the
    // render site left `realizeProgress` untouched and survived — an English reader told a journey with a
    // blocker had finished clean. This reads the witness out of the RENDERED element and requires it to
    // agree with the words, in both editions.
    for (const r of RESULTS) {
      const render = (l: Locale) =>
        renderToStaticMarkup(
          <BanzaiLocaleBoundary locale={l}>
            <JourneyProgress result={r} />
          </BanzaiLocaleBoundary>,
        );
      const en = render("en");
      const pt = render("pt");
      const witness = (html: string) => html.match(/data-journey-progress="([^"]*)"/)?.[1];
      expect(witness(en), `${r.kind}: no witness rendered`).toBe(r.kind);
      expect(witness(en), `${r.kind}: the English render reported a different outcome`).toBe(witness(pt));
      // The witness must agree with the WORDS: the element's text has to be this result's realization and
      // not another outcome's, or the witness would be decorative.
      expect(readable(en)).toBe(realizeProgress(r, "en"));
      expect(readable(pt)).toBe(realizeProgress(r, "pt"));
    }
  });

  it("keeps a complete-with-one-blocker journey distinct from an all-verified one", () => {
    // The most consequential pair on this surface: one says the journey finished clean, the other says it
    // finished with a blocker. Collapsing them would read fluently in both languages.
    for (const l of LOCALES) {
      expect(realizeProgress({ kind: "doneOneBlocker" }, l)).not.toBe(
        realizeProgress({ kind: "doneAllVerified" }, l),
      );
    }
    // …and every outcome is distinguishable from every other, in each edition.
    for (const l of LOCALES) {
      const rendered = RESULTS.map((r) => realizeProgress(r, l));
      expect(new Set(rendered).size, `${l}: two outcomes read identically`).toBe(RESULTS.length);
    }
  });

  it("decides singular and plural per edition, from the same counts", () => {
    const one: ProgressResult = { kind: "doneWithCounts", verified: 1, pending: 0, failed: 0, blocked: 1 };
    const many: ProgressResult = { kind: "doneWithCounts", verified: 3, pending: 0, failed: 0, blocked: 2 };
    expect(realizeProgress(one, "pt")).toContain("1 verificada");
    expect(realizeProgress(many, "pt")).toContain("3 verificadas");
    expect(realizeProgress(one, "en")).toContain("1 verified");
    expect(realizeProgress(many, "en")).toContain("3 verified");
    // The counters appear in the same order in both — the order is the result's, not the language's.
    expect(realizeProgress(many, "en").indexOf("3")).toBeLessThan(realizeProgress(many, "en").indexOf("2"));
    expect(realizeProgress(many, "pt").indexOf("3")).toBeLessThan(realizeProgress(many, "pt").indexOf("2"));
  });
});

// ── Q5 — the developer draft tool ────────────────────────────────────────────────────────────────────
//
// A draft result is deliberately powerless: it advances nothing, produces no receipt, feeds no bundle and
// never returns VERIFIED. The reader has to be told that in their own language, and the verdict itself —
// valid or not — has to be the one the validator actually reached.

import { DraftVerdictBadge } from "./DraftValidationTool";
import { TONE_COPY_ID, traceCopy, traceTone, type TraceReport as TR } from "./traceVerifier";

describe("Q5 — the draft tool reports one verdict in two languages", () => {
  const badge = (l: Locale, ok: boolean) =>
    renderToStaticMarkup(
      <BanzaiLocaleBoundary locale={l}>
        <DraftVerdictBadge ok={ok} />
      </BanzaiLocaleBoundary>,
    );
  const witness = (html: string) => html.match(/data-draft-verdict="([^"]*)"/)?.[1];

  it("renders the same verdict in both editions, and the words match the witness", () => {
    for (const ok of [true, false]) {
      const en = badge("en", ok);
      const pt = badge("pt", ok);
      const expected = ok ? "valid" : "invalid";
      expect(witness(en), `ok=${ok}: wrong witness`).toBe(expected);
      expect(witness(en), `ok=${ok}: the English badge reached a different verdict`).toBe(witness(pt));
      // The witness is not decorative: the rendered words must be THIS verdict's realization.
      expect(readable(en)).toBe(validationCopy(`draft.verdict.${expected}`, "en"));
      expect(readable(pt)).toBe(validationCopy(`draft.verdict.${expected}`, "pt"));
      expect(readable(en)).not.toBe(readable(pt));
    }
    // The two verdicts stay distinguishable in each edition.
    for (const l of LOCALES) expect(badge(l, true)).not.toBe(badge(l, false));
  });

  it("says a draft result is a draft, in both editions", () => {
    // The powerlessness of a draft result is the point of the tool; neither edition may soften it.
    for (const l of LOCALES) {
      for (const id of ["draft.verdict.valid", "draft.verdict.invalid"] as const) {
        expect(validationCopy(id, l).toLowerCase()).toMatch(/rascunho|draft/);
      }
    }
    const note = validationCopy("draft.resultNote", "en");
    expect(note).toMatch(/does not advance the journey/);
    expect(note).toMatch(/never returns VERIFIED/);
    expect(note).toMatch(/Certification Readiness/);
  });

  it("keeps the trace verdict a decision and only realizes its sentence", () => {
    // The runner stores the verdict's copy id, not its words, so the status field means the same thing in
    // both editions. The verdict itself is computed from the report with no locale in scope.
    const report = (over: Partial<TR>): TR => ({
      trace_id: "tr", flow_type: "f", event_count: 0, timeline: [], invariant_checks: [],
      causal_summary: "", issues: [], ...over,
    });
    const cases: Array<[TR, "pass" | "fail" | "unknown"]> = [
      [report({ issues: ["INV-STL-001 FAIL"], invariant_checks: [{ id: "INV-STL-001", name: "n", status: "FAIL", reason: "r" }] }), "fail"],
      [report({ invariant_checks: [{ id: "INV-TRACE-001", name: "n", status: "PASS", reason: "r" }] }), "pass"],
      [report({ invariant_checks: [{ id: "INV-LEDGER-001", name: "n", status: "UNKNOWN", reason: "r" }] }), "unknown"],
    ];
    for (const [r, expected] of cases) {
      expect(traceTone(r)).toBe(expected);
      const id = TONE_COPY_ID[expected];
      for (const l of LOCALES) expect(traceCopy(id, l).trim().length).toBeGreaterThan(0);
      expect(traceCopy(id, "en")).not.toBe(traceCopy(id, "pt"));
    }
  });
});
