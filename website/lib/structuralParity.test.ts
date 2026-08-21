import { describe, it, expect } from "vitest";
import { bilingualPairs, parityOf, signatureOf } from "./structuralParity";

// The property this file owns: **the two editions of a route are the same page.**
//
// Everything else about the bilingual website was already guarded — routes exist, copy is translated,
// semantic identity survives the locale switch, English pages do not link back into Portuguese, the
// locale propagates. All of it passed while the English home was a separately authored page with a
// different hero, a different composition and a different information architecture. A reader moving
// between `/` and `/en` met what looked like two different products, and nothing in the repository could
// see it, because no property said the two editions are the same page.
//
// Portuguese is the canonical edition. English is a realization of it, not a redesign of it.
//
// Legitimately different: the words, the natural length of a headline, how a line wraps, and pathnames
// that have an official translated address. Not different: which view renders the page, its sections and
// their order, the components it mounts, its heading hierarchy, and the semantic destinations it offers.

const pairs = bilingualPairs();

describe("PT and EN are two realizations of the same page", () => {
  it("declares a bilingual set to check", () => {
    expect(pairs.length).toBeGreaterThan(15);
  });

  // Six pages still carry the defect this file was written to catch: their English edition was authored
  // separately and offers a different set of destinations, sections or components. They are named here
  // rather than excluded quietly — this is a defect backlog, not an allowance. The assertion below is a
  // ratchet: a route may LEAVE this list, never join it. Adding a name here to make a build pass would be
  // visible in the diff and is not what the list is for.
  const KNOWN_DIVERGENT = [
    "CERTIFICATION",
    "PROTOCOL_STATUS",
    "REFERENCE",
  ] as const;

  it("lets no route become structurally divergent", () => {
    const divergent = pairs.map(parityOf).filter((v) => v.differences.length > 0);
    const unexpected = divergent
      .filter((v) => !KNOWN_DIVERGENT.includes(v.id as (typeof KNOWN_DIVERGENT)[number]))
      .map((v) => `${v.id}: ${v.differences.join(" · ")}`);
    expect(unexpected, "these routes newly render structurally different pages per edition").toEqual([]);
  });

  it("keeps the backlog honest — a route on the list must actually still be divergent", () => {
    // The other half of the ratchet. A name that no longer diverges must be removed from the list, or the
    // list would quietly grant an exemption to a page that has already been fixed.
    const stillDivergent = new Set(
      pairs.map(parityOf).filter((v) => v.differences.length > 0).map((v) => v.id),
    );
    const stale = KNOWN_DIVERGENT.filter((id) => !stillDivergent.has(id));
    expect(stale, "these are fixed — remove them from KNOWN_DIVERGENT").toEqual([]);
  });

  it("renders the home from ONE view in both editions", () => {
    // The home is the case that exposed the defect, so it is pinned by name: a future edit that gives
    // either edition its own composition fails here even if every other page stays shared.
    const home = parityOf({ id: "HOME", pt: "/", en: "/en" });
    expect(home.shared_view, "the two homes must delegate to the same view").toBe("HomeView");
    expect(home.differences).toEqual([]);
  });

  it("keeps the home's canonical bands, in order, in the shared view", () => {
    const sig = signatureOf("/");
    expect(sig).not.toBeNull();
    // Hero → public status → technical registry → three layers. The hero is labelled by its heading id;
    // the other three name their catalogue id.
    expect(sig!.sections).toEqual(["hero-title", "status.aria", "registry.aria", "layers-title"]);
    // The two client islands the home mounts, and the illustration's operator cards.
    expect(sig!.components).toContain("HeroStatusBar");
    expect(sig!.components).toContain("OperatorRegistry");
    expect(sig!.components).toContain("OperatorCard");
    // One h1 and one h2 in the view itself — the registry band's h2 belongs to OperatorRegistry, which
    // is a component the view mounts rather than markup the view owns.
    expect(sig!.headings).toEqual(["h1", "h2"]);
    // Its semantic destinations, in order: the validation CTA, the whitepaper CTA, the registry CTA.
    expect(sig!.destinations).toEqual(["BANZAI", "WHITEPAPER", "TECHNICAL_REGISTRY"]);
  });

  it("resolves every home destination inside the reader's own edition", () => {
    // A shared view cannot drift structurally, but it could still send an English reader to a Portuguese
    // page if a destination were hard-coded. Both editions must resolve their own.
    const en = signatureOf("/en");
    expect(en!.destinations).toEqual(["BANZAI", "WHITEPAPER", "TECHNICAL_REGISTRY"]);
    expect(en!.destinations.filter((d) => d.startsWith("/"))).toEqual([]);
  });
});
