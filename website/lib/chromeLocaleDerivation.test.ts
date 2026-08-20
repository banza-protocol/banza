import { describe, it, expect } from "vitest";
import { navFor, footerColumnsFor, CHROME_TEXT } from "./site";
import { routeHref } from "./routeRegistry";
import { referenceChapterPath } from "./referenceSlugs";
import { LOCALES, type Locale } from "./i18n";

// Block E2 — the shared site chrome, proven in BOTH editions.
//
// The header and footer became locale-aware: an entry declares a semantic target and the pathname is
// derived per edition. Until now only the Portuguese derivation was ever exercised — the module's
// `navPrimary` / `footerColumns` exports are `navFor("pt")` / `footerColumnsFor("pt")`, so every existing
// assertion read one edition and the English one was produced by code nothing executed. That is the gap
// this file closes, and it is why the checks below are written over `LOCALES` rather than over "pt".
//
// The properties are structural, so they hold for whatever the chrome is configured to contain: the two
// editions must agree on SHAPE (same groups, same entries, same order, same keys) and differ only where
// the edition legitimately differs (label, and pathname for anything that is not locale-neutral).
//
// Honest note on strength. Three of these turn red under mutation today — a withdrawn English route, an
// English URL built by prefixing the Portuguese slug, an empty English label. The other two (same shape,
// identical locale-neutral destinations) currently hold by construction, because both editions map the
// same entry list. They are worth asserting anyway: they are what would break first if the two editions
// were ever given separate configurations, which is precisely the mistake this architecture forbids.

const editions = LOCALES as readonly Locale[];
const allItems = (locale: Locale) => [...navFor(locale), ...footerColumnsFor(locale).flatMap((c) => c.items)];

describe("site chrome — one configuration, realized per edition", () => {
  it("offers every edition the same destinations in the same order", () => {
    const keys = (locale: Locale) => allItems(locale).map((i) => i.key);
    const [first, ...rest] = editions;
    for (const other of rest) expect(keys(other)).toEqual(keys(first));
    const columns = (locale: Locale) => footerColumnsFor(locale).map((c) => c.items.length);
    for (const other of rest) expect(columns(other)).toEqual(columns(first));
  });

  it("labels every link in the reader's own language", () => {
    for (const locale of editions) {
      for (const item of allItems(locale)) {
        expect(item.label.trim().length, `${locale}/${item.key} has no label`).toBeGreaterThan(0);
      }
      expect(CHROME_TEXT[locale].openMenu.trim().length).toBeGreaterThan(0);
      expect(CHROME_TEXT[locale].newTabHint.trim().length).toBeGreaterThan(0);
    }
  });

  it("never leaves an internal English link on a Portuguese pathname", () => {
    // A missing English route would otherwise fall back to the Portuguese one and read as a working
    // link. `resolveEntry` marks that case `foreign`, so an unnoticed fallback is a failure here rather
    // than a silent monolingual link inside the English chrome.
    const foreign = allItems("en").filter((i) => (i as { foreign?: boolean }).foreign);
    expect(foreign.map((i) => `${i.key} → ${i.href}`)).toEqual([]);
  });

  it("derives each internal pathname from the route registry, not from the edition's prefix", () => {
    // English URLs are English (/en/technical-registry), never a prefixed Portuguese slug
    // (/en/registo-tecnico). Comparing against the registry proves the chrome asks the registry instead
    // of rewriting the Portuguese path.
    const internal = (locale: Locale) => allItems(locale).filter((i) => !i.external && !i.email);
    for (const locale of editions) {
      for (const item of internal(locale)) {
        const registryPaths = [
          routeHref("TECHNICAL_REGISTRY", locale),
          routeHref("BANZAI", locale),
          routeHref("REFERENCE", locale),
          routeHref("ARCHITECTURE", locale),
          routeHref("PROTOCOL_STATUS", locale),
          routeHref("DECISIONS", locale),
          routeHref("TRUST", locale),
          routeHref("LICENSE", locale),
          referenceChapterPath(1, locale),
          referenceChapterPath(13, locale),
        ];
        expect(registryPaths, `${locale}/${item.key} → ${item.href} is not a registry pathname`).toContain(
          item.href,
        );
      }
    }
    expect(navFor("en").map((i) => i.href)).toEqual([
      "/en/technical-registry",
      "/en/banzai",
      "/en/reference",
    ]);
  });

  it("keeps locale-neutral destinations identical across editions", () => {
    // Operator Zero's own host and the source repository are not this site's pages: they must not be
    // rewritten per edition.
    for (const locale of editions) {
      const external = allItems(locale).filter((i) => i.external);
      expect(external.map((i) => i.href)).toEqual(allItems("pt").filter((i) => i.external).map((i) => i.href));
    }
  });
});
