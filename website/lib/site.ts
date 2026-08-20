// Canonical route map and shared constants for the BANZA website.
// M2.19G.2 — public navigation cleanup:
//   Header (§7): exactly three destinations — the Technical Registry, BanzAI, and the reference entry
//     point. "Ler a referência" points DIRECTLY at /referencia (no redirect, never /o-que-e).
//   Footer (§26): three groups — Protocolo · Implementar e validar · Governança — plus the institutional
//     line and boundary note (rendered by SiteFooter). The single canonical introductory definition of
//     BANZA is the reference chapter /referencia/o-que-e; the standalone /o-que-e route was removed.

import { pathFor } from "./routeRegistry";
import { referenceChapterPath } from "./referenceSlugs";
import type { Locale } from "./i18n";

export const GITHUB_URL = "https://github.com/banza-protocol/banza";
export const BANZAI_GITHUB_URL = "https://github.com/banza-protocol/banza/tree/main/services/banzai-api";
export const SITE_DOMAIN = "banza.network";

export type NavItem = { href: string; label: string; key: string; external?: boolean; github?: boolean; feature?: boolean; email?: boolean; cta?: boolean };

// ── Locale-aware site chrome ──────────────────────────────────────────────────────────────────────
//
// The navigation and the footer are the same structure in both editions. What differs is the label and
// the URL, and neither of those is the item's identity — so neither is written here as a literal.
//
// A LITERAL PATHNAME IS NOT AN IDENTITY. The footer used to name its destinations by their Portuguese
// pathnames, which meant that publishing `/en/architecture` and `/en/trust` could not possibly update
// the footer: the footer did not know it was pointing at the architecture page, only that it was
// pointing at the string "/arquitectura". Every English page therefore carried Portuguese chrome,
// including the English architecture and trust pages themselves, whose own bodies link correctly.
//
// So a chrome entry names a SEMANTIC ROUTE — a `route` id owned by lib/routeRegistry.ts, or a chapter
// number owned by lib/referenceSlugs.ts — and the pathname is resolved per locale at render time.
// Publishing an English page updates the chrome by construction, and nothing here has to be remembered.
//
// Where an English edition does not exist yet, the entry resolves to the canonical Portuguese route and
// is marked `foreign: true`, so the link can be labelled `hreflang` honestly rather than either
// pretending the destination is English or dropping the destination from the navigation. Inventing an
// `/en/...` URL for an unwritten page would be worse than both.

export type LocaleNavItem = NavItem & { foreign?: boolean };

/**
 * How a chrome link's destination is decided (§8). Only distinctions that change locale behaviour exist.
 *
 *   SITE_ROUTE      a registered semantic website route; the locale decides the pathname
 *   REFERENCE_CHAPTER  a Reference chapter, addressed by number; slugs differ per edition
 *   EXTERNAL        another host, or an artifact whose URL is locale-neutral; used verbatim
 */
type ChromeTarget =
  | { kind: "SITE_ROUTE"; route: string }
  | { kind: "REFERENCE_CHAPTER"; chapter: number }
  | { kind: "EXTERNAL"; href: string };

type ChromeEntry = {
  /** Selects the pictogram in SiteNav/SiteFooter. Not an identity — icons are deliberately reusable. */
  key: string;
  target: ChromeTarget;
  label: Record<Locale, string>;
  external?: boolean;
  github?: boolean;
  email?: boolean;
  feature?: boolean;
  cta?: boolean;
};

/** Resolve one entry for one edition. The single place a chrome pathname is decided. */
function resolveEntry(e: ChromeEntry, locale: Locale): LocaleNavItem {
  const base: LocaleNavItem = {
    href: "",
    label: e.label[locale],
    key: e.key,
    ...(e.external ? { external: true } : {}),
    ...(e.github ? { github: true } : {}),
    ...(e.email ? { email: true } : {}),
    ...(e.feature ? { feature: true } : {}),
    ...(e.cta ? { cta: true } : {}),
  };

  if (e.target.kind === "EXTERNAL") return { ...base, href: e.target.href };

  const wanted =
    e.target.kind === "SITE_ROUTE"
      ? pathFor(e.target.route, locale)
      : referenceChapterPath(e.target.chapter, locale);
  const canonical =
    e.target.kind === "SITE_ROUTE"
      ? pathFor(e.target.route, "pt")
      : referenceChapterPath(e.target.chapter, "pt");

  if (!canonical) {
    // A chrome entry naming a route the registry does not know is a bug in this file, not a runtime
    // condition to paper over: silently dropping the link would hide it from every rendered check.
    throw new Error(`site chrome: unknown semantic target ${JSON.stringify(e.target)} for "${e.key}"`);
  }
  return { ...base, href: wanted ?? canonical, ...(wanted ? {} : { foreign: true }) };
}

// Global navigation: exactly THREE distinct public destinations, no dropdowns/submenus.
//   Technical registry → the closed public Technical Registry — operators, implementations, profiles,
//                        results, evidence and certification states.
//   BanzAI             → the protocol's transversal interface
//   Read the Reference → the Reference entry point, direct (never the removed /o-que-e route)
// Array order is the exact left→right desktop order and the top→bottom mobile order.
const NAV_ENTRIES: ChromeEntry[] = [
  {
    key: "registo",
    target: { kind: "SITE_ROUTE", route: "TECHNICAL_REGISTRY" },
    label: { pt: "Registo técnico", en: "Technical registry" },
  },
  {
    key: "banzai",
    target: { kind: "SITE_ROUTE", route: "BANZAI" },
    label: { pt: "BanzAI", en: "BanzAI" },
    feature: true,
  },
  {
    key: "referencia",
    target: { kind: "SITE_ROUTE", route: "REFERENCE" },
    label: { pt: "Ler a referência", en: "Read the Reference" },
    cta: true,
  },
];

/** Footer columns (§26): three groups, the same three in both editions. */
const FOOTER_ENTRIES: { title: Record<Locale, string>; items: ChromeEntry[] }[] = [
  {
    // Protocol — the introductory definition (Reference chapter 1), the architecture page, the
    // Reference entry point and the verifiable public state.
    title: { pt: "Protocolo", en: "Protocol" },
    items: [
      {
        key: "f-referencia",
        target: { kind: "REFERENCE_CHAPTER", chapter: 1 },
        label: { pt: "O que é o BANZA", en: "What BANZA is" },
      },
      {
        key: "f-decisoes",
        target: { kind: "SITE_ROUTE", route: "ARCHITECTURE" },
        label: { pt: "Arquitectura", en: "Architecture" },
      },
      {
        key: "f-referencia",
        target: { kind: "SITE_ROUTE", route: "REFERENCE" },
        label: { pt: "Referência", en: "Reference" },
      },
      {
        key: "f-estado",
        target: { kind: "SITE_ROUTE", route: "PROTOCOL_STATUS" },
        label: { pt: "Estado", en: "Status" },
      },
    ],
  },
  {
    // Implement and validate — developer resources, the Technical Registry, BanzAI and the reference
    // implementation (Operator Zero, external read-only surface).
    title: { pt: "Implementar e validar", en: "Implement and validate" },
    items: [
      {
        key: "f-programadores",
        target: { kind: "REFERENCE_CHAPTER", chapter: 13 },
        label: { pt: "Programadores", en: "Developers" },
      },
      {
        key: "f-decisoes",
        target: { kind: "SITE_ROUTE", route: "TECHNICAL_REGISTRY" },
        label: { pt: "Registo técnico", en: "Technical registry" },
      },
      {
        key: "f-banzai-open",
        target: { kind: "SITE_ROUTE", route: "BANZAI" },
        label: { pt: "BanzAI", en: "BanzAI" },
      },
      {
        // Its own host and its own read-only surface: locale-neutral, never rewritten to /en.
        key: "f-operador-zero",
        target: { kind: "EXTERNAL", href: "https://zero.banza.network/" },
        label: { pt: "Operador Zero", en: "Operator Zero" },
        external: true,
      },
    ],
  },
  {
    // Governance — decisions record, security, licence and the source repository.
    title: { pt: "Governança", en: "Governance" },
    items: [
      {
        key: "f-decisoes",
        target: { kind: "SITE_ROUTE", route: "DECISIONS" },
        label: { pt: "Decisões", en: "Decisions" },
      },
      {
        key: "f-security",
        target: { kind: "SITE_ROUTE", route: "TRUST" },
        label: { pt: "Segurança", en: "Security" },
      },
      {
        key: "f-licenca",
        target: { kind: "SITE_ROUTE", route: "LICENSE" },
        label: { pt: "Licença", en: "Licence" },
      },
      {
        key: "f-github",
        target: { kind: "EXTERNAL", href: GITHUB_URL },
        label: { pt: "GitHub", en: "GitHub" },
        external: true,
        github: true,
      },
    ],
  },
];

/** The header destinations, resolved for one edition. */
export function navFor(locale: Locale): LocaleNavItem[] {
  return NAV_ENTRIES.map((e) => resolveEntry(e, locale));
}

/** The footer columns, resolved for one edition. */
export function footerColumnsFor(locale: Locale): { title: string; items: LocaleNavItem[] }[] {
  return FOOTER_ENTRIES.map((c) => ({
    title: c.title[locale],
    items: c.items.map((e) => resolveEntry(e, locale)),
  }));
}

/** The Portuguese edition's chrome. Kept as named exports because the public-surface guards read them. */
export const navPrimary: LocaleNavItem[] = navFor("pt");
export const footerColumns: { title: string; items: LocaleNavItem[] }[] = footerColumnsFor("pt");

/** Reader-facing strings the chrome owns outside its links. */
export const CHROME_TEXT: Record<
  Locale,
  { brand: string; protocolLine: string; openMenu: string; closeMenu: string; newTabHint: string }
> = {
  pt: {
    brand:
      "Regras públicas, motores verificáveis e evidência verificável para a interoperabilidade entre operadores independentes em Angola.",
    protocolLine: "PROTOCOLO · v1.0",
    openMenu: "Abrir menu",
    closeMenu: "Fechar menu",
    newTabHint: "(abre numa nova aba)",
  },
  en: {
    brand:
      "Public rules, verifiable engines and verifiable evidence for interoperability between independent operators in Angola.",
    protocolLine: "PROTOCOL · v1.0",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    newTabHint: "(opens in a new tab)",
  },
};
