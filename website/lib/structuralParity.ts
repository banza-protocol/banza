import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROUTES, routeAt } from "./routeRegistry";
import { REFERENCE_CHAPTER_SLUGS } from "./referenceSlugs";

// Structural parity between the two editions of the same page.
//
// The assurance around the bilingual website protected translation coverage, route existence, semantic
// identity, backlink closure and locale propagation. Every one of those passed while the English home was
// a SEPARATE page — a different hero, a different composition, a different information architecture. A
// reader moving between `/` and `/en` met what looked like two different products, and nothing in the
// repository could see it, because no property said *the two editions are the same page*.
//
// That is the property here. Portuguese is the canonical edition; English is a realization of it. What may
// differ is the words, the natural length of a headline, how a line wraps, and pathnames with an official
// translated address. What may not differ is the structure: which view renders the page, which sections it
// has and in what order, which components it mounts, which semantic destinations it offers.
//
// Deliberately NOT a byte comparison of rendered HTML. English is longer or shorter than Portuguese and
// that is legitimate. The signature below ignores text and keeps structure.

const ROOT = join(__dirname, "..");

export type PageSignature = {
  /** The view module each route delegates to, if it delegates. Two editions of one page share it. */
  view: string | null;
  /** Section identities in source order — `aria-label`/`aria-labelledby`/heading ids. */
  sections: string[];
  /** Component identities the page mounts, sorted. */
  components: string[];
  /** Semantic route ids the page links, in source order. */
  destinations: string[];
  /** Heading levels in source order — the information hierarchy. */
  headings: string[];
};

export function pageFileFor(path: string): string | null {
  const en = path.startsWith("/en");
  const seg = (en ? path.slice(3) : path).replace(/^\/+|\/+$/g, "");
  const base = en ? "app/en" : "app/(pt)";
  const f = seg ? join(ROOT, base, seg, "page.tsx") : join(ROOT, base, "page.tsx");
  return existsSync(f) ? f : null;
}

/** The view a thin route file delegates to, e.g. `<HomeView locale="pt" />` → `HomeView`. */
function delegatedView(src: string): string | null {
  const m = src.match(/<([A-Z]\w+)\s+locale=\{?["']?(?:pt|en|locale)["']?\}?\s*\/>/);
  return m ? m[1] : null;
}

function resolveSource(file: string): { src: string; view: string | null } {
  const src = readFileSync(file, "utf8");
  const view = delegatedView(src);
  if (!view) return { src, view: null };
  // Follow the delegation: the structure lives in the shared view, not in the route file.
  const m = src.match(new RegExp(`import\\s*\\{[^}]*\\b${view}\\b[^}]*\\}\\s*from\\s*"@/([^"]+)"`));
  if (!m) return { src, view };
  for (const ext of [".tsx", ".ts"]) {
    const p = join(ROOT, m[1] + ext);
    if (existsSync(p)) return { src: readFileSync(p, "utf8"), view };
  }
  return { src, view };
}

/**
 * Remove comments — but only real ones.
 *
 * A naive block-comment strip is wrong here, and was wrong in practice: the status page contains the
 * string "/.well-known/banza" followed by a star, and that opened a block comment which then ran until
 * the next closing marker almost twenty lines later, swallowing the page's hero and its h1. The signature
 * reported a page with no hero and no heading, and the mismatch looked like a real structural difference
 * between the two editions when the page was fine.
 *
 * So the scan walks the source and skips string literals before deciding whether a slash starts a comment.
 */
function stripComments(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      out += c;
      i += 1;
      while (i < src.length) {
        if (src[i] === "\\") { out += src.slice(i, i + 2); i += 2; continue; }
        out += src[i];
        if (src[i] === quote) { i += 1; break; }
        i += 1;
      }
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i + 1 < src.length && !(src[i] === "*" && src[i + 1] === "/")) i += 1;
      i = Math.min(i + 2, src.length);
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}


/**
 * A pathname as a semantic destination.
 *
 * Reference chapters are the case worth naming: `/referencia/arquitectura` and
 * `/en/reference/protocol-architecture` are the SAME chapter, addressed in each edition's own language.
 * Comparing the literals would report a correctly translated address as structural drift — exactly the
 * mistake this file exists to avoid — so a chapter resolves to its number, which is its identity.
 */
function semanticDestination(pathname: string): string {
  const chapter = pathname.match(/^\/(?:en\/reference|referencia)\/([a-z0-9-]+)$/);
  if (chapter) {
    const slug = chapter[1];
    const hit = REFERENCE_CHAPTER_SLUGS.find((c) => c.pt === slug || c.en === slug);
    if (hit) return `REFERENCE_CHAPTER:${hit.num}`;
  }
  const known = routeAt(pathname);
  return known ? known.id : pathname;
}

export function signatureOf(path: string): PageSignature | null {
  const file = pageFileFor(path);
  if (!file) return null;
  const { src: raw, view } = resolveSource(file);
  const src = stripComments(raw);

  const sections: string[] = [];
  // Scan the whole opening tag: the label may sit after other attributes. A section identifies itself
  // either by an id its heading carries (aria-labelledby) or by a catalogue id (aria-label={t("...")}).
  for (const tag of src.matchAll(/<section\b([\s\S]*?)>/g)) {
    const attrs = tag[1];
    const by = attrs.match(/aria-labelledby="([^"]+)"/);
    if (by) { sections.push(by[1]); continue; }
    const lbl = attrs.match(/aria-label=\{t\("([^"]+)"\)\}/) || attrs.match(/aria-label="([^"]+)"/);
    if (lbl) sections.push(lbl[1]);
  }

  const components = new Set<string>();
  for (const m of src.matchAll(/<([A-Z]\w+)[\s/>]/g)) components.add(m[1]);

  // Destinations are compared SEMANTICALLY. A literal pathname is resolved back to its route id, so the
  // Portuguese page's `/referencia` and the English page's `/en/reference` are the same destination — as
  // they should be. Comparing the literals instead would report every correctly translated address as a
  // structural difference, which is the opposite of the property. A pathname the registry does not know
  // stays as written, because an unregistered destination is worth seeing.
  const destinations: string[] = [];
  for (const m of src.matchAll(/routeHref\("([A-Z_]+)"/g)) destinations.push(m[1]);
  for (const m of src.matchAll(/href="(\/[a-z0-9/-]*)"/g)) {
    destinations.push(semanticDestination(m[1]));
  }

  const headings: string[] = [];
  for (const m of src.matchAll(/<(h[1-6])\b/g)) headings.push(m[1]);

  return {
    view,
    sections,
    components: [...components].sort(),
    destinations,
    headings,
  };
}


/** Source of a view module by component name, or null when it cannot be located. */
function viewSource(view: string): string | null {
  for (const dir of ["components/pages", "components/home"]) {
    for (const ext of [".tsx", ".ts"]) {
      const p = join(ROOT, dir, view + ext);
      if (existsSync(p)) return readFileSync(p, "utf8");
    }
  }
  return null;
}

/**
 * A shared view must not decide STRUCTURE from the locale.
 *
 * Choosing words by locale is the whole point; choosing whether a section, a card or a destination exists
 * is the defect this file was written to catch, wearing a shared view as a disguise.
 */
function localeBranches(view: string): string[] {
  const src = viewSource(view);
  if (!src) return [];
  const code = stripComments(src);
  const hits = [...code.matchAll(/locale\s*===\s*["'](?:pt|en)["']/g)];
  return hits.length
    ? [`${view} branches on the locale ${hits.length} time(s) — a shared view may choose words, never structure`]
    : [];
}

/**
 * Per-edition content must have the same SHAPE.
 *
 * A view that reads `CONTENT[locale]` is only as shared as the two entries are alike: an array with one
 * fewer item, or a field left empty in one edition, gives one reader less page than the other while the
 * view itself stays identical.
 */
function contentShapeDifferences(view: string): string[] {
  const src = viewSource(view);
  if (!src) return [];
  const mod = stripComments(src).match(/from "@\/(components\/[a-zA-Z/]*[a-zA-Z]*[Cc]ontent)"/);
  if (!mod) return [];
  for (const ext of [".ts", ".tsx"]) {
    const p = join(ROOT, mod[1] + ext);
    if (!existsSync(p)) continue;
    const text = stripComments(readFileSync(p, "utf8"));
    const start = text.indexOf("\n  pt: {");
    const mid = text.indexOf("\n  en: {");
    if (start < 0 || mid < start) return [];
    const pt = text.slice(start, mid);
    const en = text.slice(mid);
    const out: string[] = [];
    // Every list the content declares must have the same length in both editions. Counting lines is not
    // enough: a list written on one line loses an item without losing a line, and that mutation passed.
    const lists = (text: string) => {
      const found: Record<string, number> = {};
      for (const m of text.matchAll(/(\w+):\s*\[([^\]]*)\]/g)) {
        // Split on TOP-LEVEL commas only. Counting every comma would count the ones inside the prose —
        // "architecture, trust, conformance" is one item, not three — which is exactly the false positive
        // the first version of this produced.
        const body = m[2];
        let depth = 0;
        let quote: string | null = null;
        let items = body.trim() ? 1 : 0;
        for (let k = 0; k < body.length; k += 1) {
          const ch = body[k];
          if (quote) {
            if (ch === "\\") k += 1;
            else if (ch === quote) quote = null;
            continue;
          }
          if (ch === '"' || ch === "'" || ch === "`") quote = ch;
          else if (ch === "{" || ch === "[") depth += 1;
          else if (ch === "}" || ch === "]") depth -= 1;
          else if (ch === "," && depth === 0) items += 1;
        }
        // A trailing comma before the closing bracket does not add an item.
        if (/,\s*$/.test(body)) items -= 1;
        found[m[1]] = items;
      }
      return found;
    };
    const lp = lists(pt);
    const le = lists(en);
    for (const key of new Set([...Object.keys(lp), ...Object.keys(le)])) {
      if (lp[key] !== le[key]) {
        out.push(`${mod[1]}: "${key}" has ${lp[key] ?? "no"} item(s) in pt and ${le[key] ?? "no"} in en`);
      }
    }
    // No field that one edition fills and the other leaves blank.
    const blanks = (s: string) => (s.match(/:\s*""/g) || []).length;
    if (blanks(pt) !== blanks(en)) {
      out.push(`${mod[1]}: one edition leaves a field empty that the other fills`);
    }
    return out;
  }
  return [];
}

/** Every bilingual pair the registry declares, as (id, pt, en). */
export function bilingualPairs(): { id: string; pt: string; en: string }[] {
  return ROUTES.filter((r) => (r.policy === "BILINGUAL" || r.policy === "DYNAMIC_BILINGUAL") && r.en)
    .map((r) => ({ id: r.id, pt: r.pt, en: r.en as string }));
}

export type ParityVerdict = {
  id: string;
  pt: string;
  en: string;
  shared_view: string | null;
  differences: string[];
};

/**
 * Compare the two editions of one route.
 *
 * A pair that delegates to the SAME view is structurally identical by construction — there is one
 * structure and both editions render it — so that is the strongest verdict and needs no field-by-field
 * comparison. Anything else is compared field by field, and every difference is reported.
 */
export function parityOf(pair: { id: string; pt: string; en: string }): ParityVerdict {
  const a = signatureOf(pair.pt);
  const b = signatureOf(pair.en);
  const out: ParityVerdict = { id: pair.id, pt: pair.pt, en: pair.en, shared_view: null, differences: [] };
  if (!a || !b) {
    out.differences.push(!a ? `no Portuguese page file for ${pair.pt}` : `no English page file for ${pair.en}`);
    return out;
  }
  if (a.view && a.view === b.view) {
    out.shared_view = a.view;
    // A shared view is the strongest shape, but it is NOT self-evidently identical: it can still branch on
    // the locale and hand one edition something the other does not get. Two mutations proved exactly that —
    // wrapping a destination in `locale === "pt" ? … : null` and emptying one edition's heading both left
    // the signature green. So a shared view is checked for structural branching, and its per-edition
    // content is checked for shape.
    out.differences.push(...localeBranches(a.view), ...contentShapeDifferences(a.view));
    return out;
  }
  const cmp = (name: string, x: string[], y: string[]) => {
    if (JSON.stringify(x) !== JSON.stringify(y)) {
      out.differences.push(`${name}: pt=${JSON.stringify(x)} en=${JSON.stringify(y)}`);
    }
  };
  cmp("sections", a.sections, b.sections);
  cmp("components", a.components, b.components);
  cmp("headings", a.headings, b.headings);
  cmp("destinations", a.destinations, b.destinations);
  return out;
}

/** Exposed so a live smoke can resolve served pathnames the same way this file does. */
export function __semantic(pathname: string): string {
  return semanticDestination(pathname);
}
