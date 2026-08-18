// Who owns the answer to "what is the English version of this page?"
//
// Today nobody does. `alternates.languages` is written inline in individual page files, the language
// switcher derives counterparts its own way, and navigation carries hand-written path pairs. Three
// mechanisms, three chances to disagree, and no way to notice when they do — the site currently has 31
// Portuguese routes and one English one, so the disagreements have had nothing to be measured against.
//
// This registry is that owner. One record per SEMANTIC route, with both pathnames on it, so a counterpart
// relation cannot be asymmetric: there is no second direction to fall out of sync. `pathFor()` and
// `routeAt()` read the same records, which is why the reciprocity mutation is structurally precluded rather
// than merely untested.
//
// Three things it exists to stop, all of them measured in this repository rather than imagined:
//
//   1. LOCALE PREFIXING AS A RULE. `/whitepaper/en` is a Portuguese page that serves the English PDF. A
//      generic "prefix /en" counterpart function would invent `/en/whitepaper/en`, a page about a document
//      language nested under a site language. Document locale and site locale are different axes and the
//      registry keeps them apart.
//
//   2. ALIASES INFLATING THE WORK. Six routes are redirects, four of them into Reference chapters — so the
//      FAQ, certification, governance and developer pages are already owned by the Reference chapter
//      system. Counting them as pages to translate would overstate the remaining work by a fifth.
//
//   3. "MISSING" BECOMING "INTENTIONAL". A bilingual page whose English side does not exist yet is
//      `EN_MISSING`, not `PT_ONLY`. The distinction is the entire difference between a translation backlog
//      and a decision, and it is the one a half-finished milestone is most tempted to blur.

/** What kind of thing lives at a path. Only distinctions that change locale behaviour earn a member. */
export type RouteKind =
  | "STATIC_PAGE"
  | "DYNAMIC_PAGE"
  | "GENERATED_PAGE"
  | "LEGACY_ALIAS"
  | "DOCUMENT_LOCALE_SURFACE";

/**
 * What the site OWES this route in the other language.
 *
 * `EN_MISSING` is deliberately absent: it is an implementation STATE, derived from whether `en` is set, not
 * a policy anyone chose. Encoding it as a policy is how a backlog quietly becomes a decision.
 */
export type CounterpartPolicy =
  | "BILINGUAL"
  | "DYNAMIC_BILINGUAL"
  | "GENERATED_BILINGUAL"
  | "LEGACY_ALIAS"
  | "DOCUMENT_LOCALE_SPECIAL"
  | "INTENTIONAL_PT_ONLY";

export interface RouteRecord {
  /** Stable semantic identity. Paths are addresses and can change; this is the thing itself. */
  id: string;
  /** Portuguese pathname, or pattern with `[param]` segments preserved verbatim. */
  pt: string;
  /** English pathname when IMPLEMENTED. Absent means owed-but-missing, unless the policy says otherwise. */
  en?: string;
  kind: RouteKind;
  policy: CounterpartPolicy;
  /** Where a LEGACY_ALIAS sends the reader. Validated against real routes by the guard. */
  aliasTarget?: string;
  /** For GENERATED_PAGE: the function that owns the instance list, named so the guard can point at it. */
  generatedBy?: string;
  /** Why, when a route is deliberately not bilingual or otherwise needs explaining. */
  note?: string;
}

/**
 * Every public semantic route. Sorted by id so diffs read cleanly and output is deterministic.
 *
 * Dynamic and generated routes are registered as PATTERNS. Enumerating operators or decision slugs would
 * make this file a mirror of runtime data and stale the moment either changed.
 */
export const ROUTES: readonly RouteRecord[] = Object.freeze([
  {
    id: "ARCHITECTURE",
    pt: "/arquitectura",
    en: "/en/architecture",
    kind: "STATIC_PAGE",
    policy: "BILINGUAL",
    note: "English URL in English — never /en/arquitectura.",
  },
  { id: "BANZAI", pt: "/banzai", kind: "STATIC_PAGE", policy: "BILINGUAL" },
  {
    id: "BANZAI_OPERATOR",
    pt: "/banzai/operador/[operatorId]",
    kind: "DYNAMIC_PAGE",
    policy: "DYNAMIC_BILINGUAL",
    note: "Operator identity is language-neutral; the surrounding UI is not.",
  },
  {
    id: "BANZAI_OPERATOR_IMPLEMENTATION",
    pt: "/banzai/operador/[operatorId]/[implementationId]",
    kind: "DYNAMIC_PAGE",
    policy: "DYNAMIC_BILINGUAL",
  },
  {
    id: "CERTIFICATION",
    pt: "/certificacao",
    en: "/en/certification",
    kind: "STATIC_PAGE",
    policy: "BILINGUAL",
    note: "The canonical certification PAGE. Distinct from the /conformidade legacy alias, which redirects into the Reference chapter. Never /en/certificacao, never /en/conformidade.",
  },
  {
    id: "CONFORMANCE_ALIAS",
    pt: "/conformidade",
    kind: "LEGACY_ALIAS",
    policy: "LEGACY_ALIAS",
    aliasTarget: "/referencia/certificacao",
    note: "Content is owned by the Reference chapter; no separate EN page is owed.",
  },
  { id: "DECISIONS", pt: "/decisoes", kind: "STATIC_PAGE", policy: "BILINGUAL" },
  { id: "DECISION", pt: "/decisoes/[slug]", kind: "DYNAMIC_PAGE", policy: "DYNAMIC_BILINGUAL" },
  {
    id: "FAQ_ALIAS",
    pt: "/faq",
    kind: "LEGACY_ALIAS",
    policy: "LEGACY_ALIAS",
    aliasTarget: "/referencia/faq",
  },
  {
    id: "FEDERATION",
    pt: "/federacao",
    en: "/en/federation",
    kind: "STATIC_PAGE",
    policy: "BILINGUAL",
    note: "English URL in English — never /en/federacao.",
  },
  { id: "GLOSSARY", pt: "/glossario", kind: "STATIC_PAGE", policy: "BILINGUAL" },
  {
    id: "GOVERNANCE_ALIAS",
    pt: "/governacao",
    kind: "LEGACY_ALIAS",
    policy: "LEGACY_ALIAS",
    aliasTarget: "/referencia/governacao",
    note: "Distinct from GOVERNANCE_OPEN despite the near-identical spelling — adjudicated, not assumed.",
  },
  {
    id: "GOVERNANCE_OPEN",
    pt: "/governanca",
    kind: "STATIC_PAGE",
    policy: "BILINGUAL",
    note: "'Governança aberta' — a real page, not the alias above.",
  },
  { id: "HOME", pt: "/", en: "/en", kind: "STATIC_PAGE", policy: "BILINGUAL" },
  { id: "LICENSE", pt: "/licenca", kind: "STATIC_PAGE", policy: "BILINGUAL" },
  { id: "OPERATORS", pt: "/operadores", kind: "STATIC_PAGE", policy: "BILINGUAL" },
  { id: "OPERATOR_ZERO", pt: "/oz", kind: "STATIC_PAGE", policy: "BILINGUAL" },
  { id: "PROTOCOL_STATUS", pt: "/estado", kind: "STATIC_PAGE", policy: "BILINGUAL" },
  {
    id: "DEVELOPERS_ALIAS",
    pt: "/programadores",
    kind: "LEGACY_ALIAS",
    policy: "LEGACY_ALIAS",
    aliasTarget: "/referencia/programadores",
  },
  {
    id: "REFERENCE",
    pt: "/referencia",
    en: "/en/reference",
    kind: "STATIC_PAGE",
    policy: "BILINGUAL",
    note: "English URLs in English — /en/reference, never /en/referencia.",
  },
  {
    id: "REFERENCE_CHAPTER",
    pt: "/referencia/[capitulo]",
    en: "/en/reference/[chapter]",
    kind: "GENERATED_PAGE",
    policy: "GENERATED_BILINGUAL",
    generatedBy: "getReferenceChapters",
    note: "Owns the FAQ / certification / governance / developers content the four aliases point at. EN slugs are English; chapterCounterpart() maps them through the semantic chapter number, never by prefixing.",
  },
  {
    id: "REFERENCE_FULL",
    pt: "/referencia/completa",
    en: "/en/reference/full",
    kind: "STATIC_PAGE",
    policy: "BILINGUAL",
  },
  {
    id: "REFERENCE_POSTGRESQL_ALIAS",
    pt: "/referencia/postgresql",
    kind: "LEGACY_ALIAS",
    policy: "LEGACY_ALIAS",
    aliasTarget: "/referencia/estado-protocolar",
  },
  {
    id: "REFERENCE_RATIONALE_ALIAS",
    pt: "/referencia/racional",
    kind: "LEGACY_ALIAS",
    policy: "LEGACY_ALIAS",
    aliasTarget: "/referencia/porque-existe",
  },
  { id: "TECHNICAL_REGISTRY", pt: "/registo-tecnico", kind: "STATIC_PAGE", policy: "BILINGUAL" },
  {
    id: "TRUST",
    pt: "/confianca",
    en: "/en/trust",
    kind: "STATIC_PAGE",
    policy: "BILINGUAL",
    note: "English URL in English — never /en/confianca.",
  },
  { id: "WHITEPAPER", pt: "/whitepaper", kind: "STATIC_PAGE", policy: "BILINGUAL" },
  {
    id: "WHITEPAPER_DOC_EN",
    pt: "/whitepaper/en",
    kind: "DOCUMENT_LOCALE_SURFACE",
    policy: "DOCUMENT_LOCALE_SPECIAL",
    note: "PT site page serving the EN PDF. Site locale and document locale are different axes.",
  },
  {
    id: "WHITEPAPER_DOC_PT",
    pt: "/whitepaper/pt",
    kind: "DOCUMENT_LOCALE_SURFACE",
    policy: "DOCUMENT_LOCALE_SPECIAL",
  },
  { id: "WHITEPAPER_VERSIONS", pt: "/whitepaper/versions", kind: "STATIC_PAGE", policy: "BILINGUAL" },
  {
    id: "WHY_BANZA",
    pt: "/porque-existe",
    en: "/en/why-banza",
    kind: "STATIC_PAGE",
    policy: "BILINGUAL",
    note: "English URL in English — never /en/porque-existe.",
  },
]);

/** Policies that OWE an English implementation. The final parity gate counts exactly these. */
const OWES_EN: ReadonlySet<CounterpartPolicy> = new Set([
  "BILINGUAL",
  "DYNAMIC_BILINGUAL",
  "GENERATED_BILINGUAL",
]);

export function owesEnglish(r: RouteRecord): boolean {
  return OWES_EN.has(r.policy);
}

/** Declared bilingual but not yet built. A backlog entry, never a decision. */
export function isEnMissing(r: RouteRecord): boolean {
  return owesEnglish(r) && !r.en;
}

export function routeById(id: string): RouteRecord | undefined {
  return ROUTES.find((r) => r.id === id);
}

/**
 * The record that owns a pathname, in EITHER language.
 *
 * Both lookups hit the same array, which is what makes an asymmetric counterpart impossible to express:
 * there is one record, not a forward map and a reverse map that could drift apart.
 */
export function routeAt(pathname: string): RouteRecord | undefined {
  return ROUTES.find((r) => r.pt === pathname || r.en === pathname);
}

/**
 * The pathname for a route in a locale — or `null`.
 *
 * `null` means "not available", and the caller must handle it. It deliberately does NOT fall back to `/` or
 * `/en`: sending a reader to the homepage because their page has no translation looks like navigation and
 * is actually data loss, and it would hide exactly the missing counterparts this milestone exists to close.
 */
export function pathFor(id: string, locale: "pt" | "en"): string | null {
  const r = routeById(id);
  if (!r) return null;
  return locale === "pt" ? r.pt : r.en ?? null;
}

/** The same page in the other language, or `null` when there is not one. */
export function counterpartOf(pathname: string): string | null {
  const r = routeAt(pathname);
  if (!r) return null;
  return r.pt === pathname ? r.en ?? null : r.pt;
}

/** Deterministic counts. The guard prints these and tests assert them. */
export function registrySummary() {
  const by = (k: RouteKind) => ROUTES.filter((r) => r.kind === k).length;
  const declaredBilingual = ROUTES.filter(owesEnglish);
  return {
    registered_semantic: ROUTES.length,
    aliases: by("LEGACY_ALIAS"),
    dynamic_patterns: by("DYNAMIC_PAGE"),
    generated_patterns: by("GENERATED_PAGE"),
    special_document_locale: by("DOCUMENT_LOCALE_SURFACE"),
    declared_bilingual: declaredBilingual.length,
    implemented_en: declaredBilingual.filter((r) => Boolean(r.en)).length,
    missing_en: declaredBilingual.filter(isEnMissing).length,
    intentional_pt_only: ROUTES.filter((r) => r.policy === "INTENTIONAL_PT_ONLY").length,
    missing_en_ids: declaredBilingual.filter(isEnMissing).map((r) => r.id).sort(),
  };
}
