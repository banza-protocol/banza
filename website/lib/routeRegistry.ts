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
  { id: "BANZAI", pt: "/banzai", en: "/en/banzai", kind: "STATIC_PAGE", policy: "BILINGUAL" },
  {
    id: "BANZAI_OPERATOR",
    pt: "/banzai/operador/[operatorId]",
    en: "/en/banzai/operator/[operatorId]",
    kind: "DYNAMIC_PAGE",
    policy: "DYNAMIC_BILINGUAL",
    note: "Operator identity is language-neutral; the surrounding UI is not. The SEGMENT WORD is English on the English side (operator, not operador) and the operatorId itself never changes.",
  },
  {
    id: "BANZAI_OPERATOR_IMPLEMENTATION",
    pt: "/banzai/operador/[operatorId]/[implementationId]",
    en: "/en/banzai/operator/[operatorId]/[implementationId]",
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
  { id: "DECISIONS", pt: "/decisoes", en: "/en/decisions", kind: "STATIC_PAGE", policy: "BILINGUAL" },
  {
    id: "DECISION",
    pt: "/decisoes/[slug]",
    en: "/en/decisions/[slug]",
    kind: "DYNAMIC_PAGE",
    policy: "DYNAMIC_BILINGUAL",
    note: "The slug IS the record's identity and is the same on both sides. A decision's English page is the same decision, not an English decision.",
  },
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
  { id: "GLOSSARY", pt: "/glossario", en: "/en/glossary", kind: "STATIC_PAGE", policy: "BILINGUAL" },
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
    en: "/en/open-governance",
    kind: "STATIC_PAGE",
    policy: "BILINGUAL",
    note: "'Governança aberta' — a real page, not the alias above.",
  },
  { id: "HOME", pt: "/", en: "/en", kind: "STATIC_PAGE", policy: "BILINGUAL" },
  { id: "LICENSE", pt: "/licenca", en: "/en/license", kind: "STATIC_PAGE", policy: "BILINGUAL" },
  {
    id: "OPERATORS",
    pt: "/operadores",
    en: "/en/operators",
    kind: "STATIC_PAGE",
    policy: "BILINGUAL",
    note: "English URL in English — never /en/operadores.",
  },
  {
    id: "OPERATOR_ZERO",
    pt: "/oz",
    kind: "STATIC_PAGE",
    policy: "INTENTIONAL_PT_ONLY",
    note: "Not a page of this site. `/oz` is 404 at the apex by design (middleware.ts): it is the standalone Operator Zero lab, reachable only at zero.banza.network, which rewrites its own `/` onto this internal route. It declares canonical https://zero.banza.network/, renders its own shell instead of the BANZA nav and footer, and the apex route it replaced is 410 Gone. An /en/oz would therefore be an English route at a host that deliberately 404s it, reviving a retired apex surface. Its English edition, if it is ever wanted, belongs to that surface on its own host — which is a change to the lab and its routing, not a translation of a page here.",
  },
  {
    id: "PROTOCOL_STATUS",
    pt: "/estado",
    en: "/en/status",
    kind: "STATIC_PAGE",
    policy: "BILINGUAL",
    note: "English URL in English — never /en/estado.",
  },
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
  {
    id: "TECHNICAL_REGISTRY",
    pt: "/registo-tecnico",
    en: "/en/technical-registry",
    kind: "STATIC_PAGE",
    policy: "BILINGUAL",
    note: "English URL in English — never /en/registo-tecnico.",
  },
  {
    id: "TRUST",
    pt: "/confianca",
    en: "/en/trust",
    kind: "STATIC_PAGE",
    policy: "BILINGUAL",
    note: "English URL in English — never /en/confianca.",
  },
  { id: "WHITEPAPER", pt: "/whitepaper", en: "/en/whitepaper", kind: "STATIC_PAGE", policy: "BILINGUAL" },
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
  { id: "WHITEPAPER_VERSIONS", pt: "/whitepaper/versions", en: "/en/whitepaper/versions", kind: "STATIC_PAGE", policy: "BILINGUAL" },
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

// ── Block E2/Q6 — DYNAMIC ROUTE IDENTITY ──────────────────────────────────────────────────────────
//
// A dynamic route's counterpart is not a string transformation. `/banzai/operador/operator-zero` pairs
// with `/en/banzai/operator/operator-zero`: the SEGMENT WORD is translated and the OPERATOR ID is not,
// and no amount of prefixing or substring replacement can be trusted to know which is which. So the
// pattern is matched, the parameters are extracted BY NAME, and they are placed into the counterpart's
// own pattern — which means the identity a reader carries across a language switch is the identity the
// route declared, never one reconstructed from what the URL happened to look like.

/** A pattern's parameter names and a regex that captures them, e.g. `[operatorId]` → `([^/]+)`. */
function compilePattern(pattern: string): { names: string[]; re: RegExp } {
  const names: string[] = [];
  const source = pattern.replace(/\[(\w+)\]|[.*+?^${}()|[\]\\]/g, (m, name?: string) => {
    if (name) {
      names.push(name);
      return "([^/]+)";
    }
    return `\\${m}`;
  });
  return { names, re: new RegExp(`^${source}$`) };
}

/** What route a concrete pathname is, and with which parameters. `null` when nothing matches. */
export function matchRoute(pathname: string): { record: RouteRecord; locale: "pt" | "en"; params: Record<string, string> } | null {
  // Literal routes win over patterns, always. `/referencia/completa` is its OWN record and must never be
  // read as the chapter pattern `/referencia/[capitulo]` with `capitulo=completa` — a concrete page that
  // happens to fit a pattern's shape is not an instance of it.
  const exact = ROUTES.find((r) => r.pt === pathname || r.en === pathname);
  if (exact) {
    return { record: exact, locale: exact.pt === pathname ? "pt" : "en", params: {} };
  }
  for (const record of ROUTES) {
    for (const locale of ["pt", "en"] as const) {
      const pattern = locale === "pt" ? record.pt : record.en;
      if (!pattern) continue;
      const { names, re } = compilePattern(pattern);
      const m = re.exec(pathname);
      if (!m) continue;
      const params: Record<string, string> = {};
      names.forEach((n, i) => (params[n] = m[i + 1]));
      return { record, locale, params };
    }
  }
  return null;
}

/** Place named parameters into a pattern. Throws if the pattern needs one the caller did not resolve. */
export function fillPattern(pattern: string, params: Record<string, string>): string {
  return pattern.replace(/\[(\w+)\]/g, (_m, name: string) => {
    const value = params[name];
    if (!value) throw new Error(`fillPattern: "${pattern}" needs parameter "${name}"`);
    return value;
  });
}

/**
 * The same page in the other language, or `null` when there is not one.
 *
 * For a dynamic route this preserves the route's PARAMETERS: the operator a reader was looking at is the
 * operator they are still looking at afterwards. It never falls back to the parent context, never picks
 * another valid operator, and never rebuilds a slug from a display name.
 */
export function counterpartOf(pathname: string): string | null {
  const hit = matchRoute(pathname);
  if (!hit) return null;
  const target = hit.locale === "pt" ? hit.record.en : hit.record.pt;
  if (!target) return null;
  if (!target.includes("[")) return target;
  // Substituting parameters is only legitimate when they are the SAME parameters — the reference chapter
  // declares `[capitulo]` against `[chapter]` precisely because its slug is a translated word, and its
  // counterpart is owned by `chapterCounterpart()` through the semantic chapter number. Carrying a
  // Portuguese chapter slug into an English URL would invent a 404, which is the failure the registry's
  // own header warns about. So identity-preserving substitution requires a declared DYNAMIC_BILINGUAL
  // policy AND identical parameter names on both sides; anything else is not this function's to answer.
  if (hit.record.policy !== "DYNAMIC_BILINGUAL") return null;
  const source = hit.locale === "pt" ? hit.record.pt : hit.record.en!;
  if (patternParams(source).join(",") !== patternParams(target).join(",")) return null;
  return fillPattern(target, hit.params);
}

/**
 * A concrete href for a route in a locale, with its parameters filled in. This is what a component uses
 * instead of writing a pathname: a hard-coded `/decisoes` inside a shared view is correct in one edition
 * and wrong in the other, and it is wrong invisibly.
 */
export function routeHref(id: string, locale: "pt" | "en", params: Record<string, string> = {}): string {
  const pattern = pathFor(id, locale);
  if (!pattern) throw new Error(`routeHref: ${id} has no ${locale} path`);
  return fillPattern(pattern, params);
}

/** The parameter names a pattern declares, in order. */
export function patternParams(pattern: string): string[] {
  return [...pattern.matchAll(/\[(\w+)\]/g)].map((m) => m[1]);
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
