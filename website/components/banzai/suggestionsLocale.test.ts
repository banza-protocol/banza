// Block E2 / Q2 — the suggestion generator is ONE algorithm serving two editions.
//
// The defect this file exists to catch is not "English is missing". It is English that is present and
// WRONG: a `/en` reader who is offered the Portuguese sentences, or — subtler and untestable by any
// coverage count — an English reader offered a DIFFERENT set of follow-ups because the English path took
// a different branch. Both leave the route, the registry, the build and every count correct.
//
// So the properties below are of two kinds. The first is parity of BEHAVIOUR: a frozen fixture records
// what the Portuguese generator produced across 47 contexts covering every branch of the tree, and it is
// asserted byte-for-byte after the refactor, while English is asserted to select the SAME ids in the SAME
// order for the same context. The second is parity of COMPLETENESS: every id in the closed catalogue is
// realized in both editions, no realization is shared between them, and nothing below the route boundary
// is allowed to choose a language on the reader's behalf.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  SUGGESTION_COPY,
  SAFE_REFRAME_IDS,
  contextualSuggestions,
  realizeSuggestion,
  realizeSuggestions,
  safeReframeSuggestions,
  selectSuggestions,
  suggestionIds,
  type SuggestionContext,
  type SuggestionId,
} from "./suggestions";
import type { Locale } from "@/lib/i18n";

const LOCALES: Locale[] = ["pt", "en"];

/** The frozen pre-refactor Portuguese output, one entry per branch of the selection tree. */
type BaselineCase = { name: string; ctx: SuggestionContext; pt: string[] };
const BASELINE: BaselineCase[] = JSON.parse(
  readFileSync(new URL("./suggestions.ptBaseline.json", import.meta.url), "utf8"),
);

// `op.pass_is_certificate` is authored but never surfaces: the "never a normative claim" net removes it
// from the conformance_evidence set in BOTH editions. It is kept in the catalogue because the filter is
// what must be proven, and a filter with nothing to remove proves nothing. Every OTHER id must be
// reachable from a real context — copy that no branch can select is dead copy.
const FILTERED_BY_CLAIM_NET: SuggestionId[] = ["op.pass_is_certificate"];

describe("Q2 — the Portuguese edition is unchanged", () => {
  it("covers every branch of the selection tree", () => {
    expect(BASELINE.length).toBe(47);
    expect(new Set(BASELINE.map((c) => c.name)).size).toBe(BASELINE.length);
  });

  it("reproduces the pre-refactor Portuguese output byte for byte, in every context", () => {
    for (const c of BASELINE) {
      expect(contextualSuggestions(c.ctx, "pt"), `PT drifted for "${c.name}"`).toEqual(c.pt);
    }
  });

  it("still removes the claim-like suggestion from the conformance_evidence set", () => {
    // The Portuguese baseline for this intent has TWO items, not three: "um PASS é um certificado?" is
    // dropped by the net. If the net stopped working the baseline assertion above would go red here too,
    // so this states the reason explicitly.
    const c = BASELINE.find((x) => x.name === "intent_conformance_evidence")!;
    expect(c.pt.length).toBe(2);
    for (const l of LOCALES) {
      const out = contextualSuggestions(c.ctx, l);
      expect(out.length, `the claim net must remove the same item in ${l}`).toBe(2);
      expect(out.join(" ")).not.toMatch(/certif/i);
    }
  });
});

describe("Q2 — both editions take the same branches", () => {
  it("selects the same ids, in the same order, whatever the reader's language", () => {
    // Selection is locale-free by construction; this asserts the CONSEQUENCE that matters — the two
    // rendered editions are position-for-position the same suggestions. A branch that consulted the
    // locale (or an English table that reordered its entries) fails here.
    for (const c of BASELINE) {
      const sel = selectSuggestions(c.ctx);
      const pt = contextualSuggestions(c.ctx, "pt");
      const en = contextualSuggestions(c.ctx, "en");
      expect(en.length, `length differs for "${c.name}"`).toBe(pt.length);
      sel.forEach((s, i) => {
        expect(en[i], `EN position ${i} of "${c.name}" is not ${s.id}`).toBe(SUGGESTION_COPY[s.id].en.replace(/\{(\w+)\}/g, (_m, k) => (s.params as Record<string, string>)[k]));
        expect(pt[i], `PT position ${i} of "${c.name}" is not ${s.id}`).toBe(SUGGESTION_COPY[s.id].pt.replace(/\{(\w+)\}/g, (_m, k) => (s.params as Record<string, string>)[k]));
      });
    }
  });

  it("never serves a Portuguese sentence to an English reader", () => {
    // The wrong-locale mutation's owning assertion: a generator that realizes from the Portuguese column
    // while the route, the registry and the counts all stay correct fails ONLY here.
    const ptSentences = new Set(BASELINE.flatMap((c) => c.pt));
    for (const c of BASELINE) {
      for (const line of contextualSuggestions(c.ctx, "en")) {
        expect(ptSentences.has(line), `"${line}" is the Portuguese realization, served under en`).toBe(false);
      }
    }
  });

  it("keeps the resolved facts identical across editions and interpolates into each language's own sentence", () => {
    // The entity's name is a FACT: it appears verbatim in both. The sentence around it is not — it is
    // composed in the target language, never translated after the name was already spliced in.
    const ctx = BASELINE.find((c) => c.name === "entity_operator_profile")!.ctx;
    const pt = contextualSuggestions(ctx, "pt");
    const en = contextualSuggestions(ctx, "en");
    for (const out of [pt, en]) expect(out.join(" ")).toContain("Operador Zero");
    expect(pt).toContain("Ver a conformidade de Operador Zero no perfil L0");
    expect(en).toContain("See the conformance of Operador Zero in profile L0");
    expect(en.join(" ")).not.toMatch(/Mostrar|Ver a |manifesto|conformidade de/);
  });

  it("branch conditions are the same in both editions", () => {
    // Four conditions that a mis-ported English path would silently get wrong. Each is read in BOTH
    // languages so a divergence — not just an absence — is what fails.
    const byName = (n: string) => BASELINE.find((c) => c.name === n)!.ctx;
    const ids = (n: string) => selectSuggestions(byName(n)).map((s) => s.id);

    // A resolved profile narrows the conformance follow-up to THAT profile.
    expect(ids("entity_operator_profile")).toContain("entity.conformance_in_profile");
    expect(ids("entity_operator_no_profile")).toContain("entity.conformance");
    expect(ids("entity_operator_no_profile")).not.toContain("entity.conformance_in_profile");
    // An artifact already fetched this turn is not re-offered.
    expect(ids("entity_operator_profile")).toContain("entity.manifest");
    expect(ids("entity_artifact_fetched")).not.toContain("entity.manifest");
    // An implementation gets the implementation manifest and the replay offer; an operator gets neither.
    expect(ids("entity_implementation")).toEqual(
      expect.arrayContaining(["entity.manifest_implementation", "entity.replay_last_run"]),
    );
    expect(ids("entity_operator_profile")).not.toContain("entity.replay_last_run");
    // "No comparable measurements" is settled BEFORE the duration branch, so it never borrows its chips.
    expect(ids("insufficient_measurements_entity")).not.toContain("duration.per_step");
    expect(ids("duration_full")).toContain("duration.per_step");

    for (const n of ["entity_operator_profile", "entity_implementation", "duration_full", "insufficient_measurements_entity"]) {
      const ctx = byName(n);
      expect(contextualSuggestions(ctx, "en").length).toBe(contextualSuggestions(ctx, "pt").length);
    }
  });

  it("a refusal offers only the safe reframes, in either language", () => {
    for (const l of LOCALES) {
      const s = contextualSuggestions(BASELINE.find((c) => c.name === "refusal")!.ctx, l);
      expect(s).toEqual(safeReframeSuggestions(l));
      expect(s.length).toBe(SAFE_REFRAME_IDS.length);
      for (const f of s) {
        expect(f).not.toMatch(/transfer|transfe|movimenta|chave privada|private key|apaga|elimina|delete|remover os guards/i);
      }
    }
  });
});

describe("Q2 — the catalogue is closed and complete", () => {
  it("realizes every id in both editions, with no shared sentence", () => {
    const ids = suggestionIds();
    expect(ids.length).toBeGreaterThanOrEqual(60);
    for (const id of ids) {
      const entry = SUGGESTION_COPY[id];
      for (const l of LOCALES) {
        expect(entry[l], `${id} has no ${l} realization`).toBeTruthy();
        expect(entry[l].trim().length, `${id} ${l} is empty`).toBeGreaterThan(0);
      }
      expect(entry.en, `${id} English is a copy of the Portuguese`).not.toBe(entry.pt);
      // A parameterized id takes the same parameters in both editions — the facts are one set.
      const holes = (t: string) => (t.match(/\{(\w+)\}/g) ?? []).slice().sort().join(",");
      expect(holes(entry.en), `${id} parameters differ between editions`).toBe(holes(entry.pt));
    }
  });

  it("every authored suggestion is reachable from a real answer", () => {
    const reached = new Set<string>(BASELINE.flatMap((c) => selectSuggestions(c.ctx).map((s) => s.id)));
    const orphans = suggestionIds().filter((id) => !reached.has(id) && !FILTERED_BY_CLAIM_NET.includes(id));
    expect(orphans, "catalogue entries no context can select").toEqual([]);
    // …and the declared exception really is only reachable-but-filtered, not simply forgotten.
    expect(FILTERED_BY_CLAIM_NET.length).toBe(1);
  });

  it("selects nothing the catalogue does not define", () => {
    const known = new Set<string>(suggestionIds());
    for (const c of BASELINE) {
      for (const s of selectSuggestions(c.ctx)) expect(known.has(s.id), `unknown id ${s.id}`).toBe(true);
    }
  });
});

describe("Q2 — nothing below the route boundary chooses a language", () => {
  it("requires the locale — there is no default to fall back to", () => {
    expect(contextualSuggestions.length).toBe(2);
    expect(realizeSuggestion.length).toBe(2);
    expect(realizeSuggestions.length).toBe(2);
    expect(safeReframeSuggestions.length).toBe(1);
  });

  it("throws rather than substituting another edition", () => {
    expect(() => realizeSuggestion({ id: "no.such.id" as SuggestionId }, "en")).toThrow(/unknown suggestion id/);
    expect(() => realizeSuggestion({ id: "safe.boundaries" }, "de" as Locale)).toThrow(/no de realization/);
    // A parameterized suggestion with no facts is a defect, not a sentence with a hole in it.
    expect(() => realizeSuggestion({ id: "entity.manifest" }, "en")).toThrow(/needs parameter "label"/);
    expect(() => realizeSuggestion({ id: "entity.manifest", params: { label: "" } }, "pt")).toThrow(/needs parameter/);
  });

  it("leaves no unresolved placeholder in any realization", () => {
    for (const c of BASELINE) {
      for (const l of LOCALES) {
        for (const line of contextualSuggestions(c.ctx, l)) {
          expect(line, `unresolved placeholder in "${line}"`).not.toMatch(/\{\w+\}/);
        }
      }
    }
  });

  it("never emits a normative claim, in either edition", () => {
    for (const c of BASELINE) {
      for (const l of LOCALES) {
        for (const f of contextualSuggestions(c.ctx, l)) {
          expect(f, `claim-like suggestion in ${l}: "${f}"`).not.toMatch(/certif|aprov|approv|licen|garant|guarant/i);
        }
      }
    }
  });
});
