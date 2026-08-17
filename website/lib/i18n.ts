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

export const LOCALES = ["pt", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt";

/** The `lang` attribute for each edition. */
export const HTML_LANG: Record<Locale, string> = { pt: "pt-PT", en: "en" };

/** The name of each language, in that language — never a flag: a flag names a country, not a language. */
export const LOCALE_NAME: Record<Locale, string> = { pt: "Português", en: "English" };

/** One public page, in both editions.
 *
 * `key` is stable and language-neutral. The switcher, the navigation and the parity checks address
 * pages by key, so renaming a slug in one language can never silently unpair a page — and a translated
 * label never becomes a page's identity.
 *
 * `en: null` marks a page that has no English counterpart *yet*, or legitimately never will. `enReason`
 * says which. An unpublished counterpart is not a 404 to link to: `counterpartOf` returns null and the
 * caller decides what to show.
 */
export type RoutePair = {
  key: string;
  pt: string;
  en: string | null;
  enReason?: string;
};

/** Every public page, paired. English entries are filled in as each edition page is genuinely
 * published — a route listed here with an `en` path is a promise that the page exists and is complete.
 */
export const ROUTE_PAIRS: readonly RoutePair[] = [
  { key: "home", pt: "/", en: "/en" },
  { key: "why", pt: "/porque-existe", en: null, enReason: "Awaiting the full content phase." },
  { key: "architecture", pt: "/arquitectura", en: null, enReason: "Awaiting the full content phase." },
  { key: "certification", pt: "/certificacao", en: null, enReason: "Awaiting the full content phase." },
  { key: "trust", pt: "/confianca", en: null, enReason: "Awaiting the full content phase." },
  { key: "federation", pt: "/federacao", en: null, enReason: "Awaiting the full content phase." },
  { key: "registry", pt: "/registo-tecnico", en: null, enReason: "Awaiting the full content phase." },
  { key: "operators", pt: "/operadores", en: null, enReason: "Awaiting the full content phase." },
  { key: "governance", pt: "/governanca", en: null, enReason: "Awaiting the full content phase." },
  { key: "decisions", pt: "/decisoes", en: null, enReason: "Awaiting the full content phase." },
  { key: "glossary", pt: "/glossario", en: null, enReason: "Awaiting the full content phase." },
  { key: "status", pt: "/estado", en: null, enReason: "Awaiting the full content phase." },
  { key: "licence", pt: "/licenca", en: null, enReason: "Awaiting the full content phase." },
  { key: "reference", pt: "/referencia", en: null, enReason: "Awaiting the full content phase." },
  { key: "whitepaper", pt: "/whitepaper", en: null, enReason: "Awaiting the full content phase." },
  { key: "banzai", pt: "/banzai", en: null, enReason: "Awaiting the full content phase." },
  {
    key: "operator-zero",
    pt: "/oz",
    en: null,
    enReason:
      "The standalone demonstration lab, served at its own host — not part of the public protocol site.",
  },
];

/** The edition a pathname belongs to. */
export function localeOfPath(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "pt";
}

/** The same page in the other edition, or `null` when it has no published counterpart.
 *
 * Returning `null` rather than the home page is deliberate. A switcher that quietly sends the reader to
 * the front page loses their place and hides the gap; the caller can then say plainly that this page is
 * not available in that language yet.
 */
export function counterpartOf(pathname: string, target: Locale): string | null {
  const from = localeOfPath(pathname);
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (from === target) return normalised;

  const pair = ROUTE_PAIRS.find((p) => p[from] === normalised);
  return pair ? pair[target] : null;
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

/** The route for a page key in an edition, or `null` if that edition does not publish the page. */
export function routeFor(key: string, locale: Locale): string | null {
  const pair = ROUTE_PAIRS.find((p) => p.key === key);
  return pair ? pair[locale] : null;
}
