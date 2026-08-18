/** Locale architecture for the public BANZA website.
 *
 * Portuguese is served at the root and English under `/en`. That is not a claim about which language
 * matters: it is the only model that keeps every already-published Portuguese URL working. The site has
 * been live and indexed with routes like `/referencia` and `/certificacao`, and those paths are linked
 * from the repository documentation, the whitepaper and BanzAI. Moving them under `/pt` would break all
 * of them to gain nothing.
 *
 * Both editions are complete public editions. Portuguese remains canonical for the descriptive
 * Reference specifically — `docs/reference/pt/BANZA_REFERENCIA.md` is the canonical edition and the
 * English file is its official translation — but that is documentary authority, not website hierarchy.
 *
 * In the filesystem the Portuguese tree lives under the route group `app/(pt)/` and English under
 * `app/en/`, so each edition has a genuine root layout and therefore a correct `<html lang>`. Route
 * groups do not appear in URLs: `app/(pt)/estado/page.tsx` is still served at `/estado`. The source
 * path and the public route are different things and must not be used for one another.
 */

import {
  ROUTES,
  owesEnglish,
  pathFor,
  counterpartOf as registryCounterpartOf,
} from "./routeRegistry";
import { REFERENCE_BASE, referenceChapterCounterpart } from "./referenceSlugs";

export const LOCALES = ["pt", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt";

/** The `lang` attribute for each edition. */
export const HTML_LANG: Record<Locale, string> = { pt: "pt-PT", en: "en" };

/** The name of each language, in that language — never a flag: a flag names a country, not a language. */
export const LOCALE_NAME: Record<Locale, string> = { pt: "Português", en: "English" };

/** One public page, in both editions.
 *
 * `key` is the registry's stable semantic id. The switcher, the navigation and the parity checks address
 * pages by that id, so renaming a slug in one language can never silently unpair a page — and a translated
 * label never becomes a page's identity.
 *
 * `en: null` marks a page that has no English counterpart *yet*. An unpublished counterpart is not a 404
 * to link to: `counterpartOf` returns null and the caller decides what to show.
 */
export type RoutePair = {
  key: string;
  pt: string;
  en: string | null;
};

/**
 * Every public page, paired — DERIVED from the canonical route registry, never hand-maintained.
 *
 * This used to be a second, hand-written list, and it went stale exactly as the registry's own header
 * predicted it would: it still described `/arquitectura`, `/confianca`, `/federacao`, `/porque-existe`,
 * `/certificacao` and `/referencia` as having no English edition after all six had been published. The
 * language switcher therefore sent readers of every English core page to the front page and told them, in
 * the accessible name, that the page they were on was not published in Portuguese — and the English home
 * advertised six translated pages as Portuguese-only. Both statements were false, and both were produced
 * by this list rather than by the site.
 *
 * Only STATIC pages that owe an English edition appear here. Dynamic and generated patterns carry
 * `[param]` segments and are not linkable addresses; aliases and the document-locale whitepaper surfaces
 * do not owe a counterpart at all.
 */
export const ROUTE_PAIRS: readonly RoutePair[] = ROUTES.filter(
  (r) => r.kind === "STATIC_PAGE" && owesEnglish(r),
).map((r) => ({ key: r.id, pt: r.pt, en: r.en ?? null }));

/** The edition a pathname belongs to. */
export function localeOfPath(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "pt";
}

/** The same page in the other edition, or `null` when it has no published counterpart.
 *
 * Returning `null` rather than the home page is deliberate. A switcher that quietly sends the reader to
 * the front page loses their place and hides the gap; the caller can then say plainly that this page is
 * not available in that language yet. What it must never do is say that when a counterpart DOES exist.
 *
 * Reference chapters resolve through the chapter number, because their slugs are genuinely different words
 * in the two editions: `/referencia/governacao` pairs with `/en/reference/governance`. Substituting the
 * path segment would invent `/en/reference/governacao`, a 404 — the registry registers the chapter route as
 * a pattern for that reason, and patterns are never resolved by textual prefixing.
 */
export function counterpartOf(pathname: string, target: Locale): string | null {
  const from = localeOfPath(pathname);
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (from === target) return normalised;

  const chapter = normalised.startsWith(`${REFERENCE_BASE[from]}/`)
    ? referenceChapterCounterpart(normalised.slice(REFERENCE_BASE[from].length + 1), from)
    : undefined;
  if (chapter) return chapter;

  return registryCounterpartOf(normalised);
}

/** Canonical URL and `hreflang` alternates for a pathname.
 *
 * `canonical` here means the search engine's preferred URL and nothing more. It does not make a web
 * page a normative source: normative authority is the Normative Manifest and the artifacts it indexes.
 *
 * Alternates are emitted only for pages that actually exist in that language. A dangling `hreflang` is
 * a promise of a page that is not there.
 */
export function alternatesFor(pathname: string): {
  canonical: string;
  languages?: Record<string, string>;
} {
  const pt = counterpartOf(pathname, "pt");
  const en = counterpartOf(pathname, "en");
  if (!pt || !en) return { canonical: pathname };
  return {
    canonical: pathname,
    // x-default points at the Portuguese edition: it is the root of the site and the canonical
    // documentary edition.
    languages: { "pt-PT": pt, en, "x-default": pt },
  };
}

/** The route for a semantic id in an edition, or `null` if that edition does not publish the page. */
export function routeFor(key: string, locale: Locale): string | null {
  return pathFor(key, locale);
}
