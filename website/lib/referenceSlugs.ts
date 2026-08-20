/** The one place a Reference chapter's two URLs are paired.
 *
 * This existed inside `lib/reference.ts` as part of `CHAPTER_DEFS`, which cannot be imported by the site
 * chrome: that module reads the Reference markdown from disk at call time, and the navigation and footer
 * are client components. Pulling it in would drag the loader into the browser bundle.
 *
 * The pairing itself is pure data, so it lives here and `reference.ts` composes its chapter definitions
 * from it. Extracting it is not a convenience: the footer links at chapters 1 and 13, and the ONLY correct
 * English counterpart of `/referencia/programadores` is `/en/reference/developer-resources`. A slug cannot
 * be translated by prefixing — `/en/reference/programadores` is a 404, and inventing it is exactly the
 * defect Block B fixed in the Reference sidebar. Whatever needs a chapter counterpart reads this table.
 */

export type ReferenceSlugPair = { num: number; pt: string; en: string };

/** All fifteen chapters, in canonical order. `num` is the semantic identity; the slugs are addresses. */
/**
 * Chapters whose address is deliberately the same in both editions.
 *
 * "banzai" is a proper name and "faq" is the same token in Portuguese and English, so translating either
 * would invent an address no reader looks for. Every OTHER chapter must have its own English address: a
 * chapter reachable only at its Portuguese slug under /en is a chapter the English reader cannot address
 * in their own edition. Declaring the exception here rather than in a guard means adding one is a decision
 * someone has to make on purpose, instead of a copy-paste that looks exactly like these two.
 */
export const LOCALE_NEUTRAL_CHAPTER_SLUGS: readonly string[] = Object.freeze(["banzai", "faq"]);

export const REFERENCE_CHAPTER_SLUGS: readonly ReferenceSlugPair[] = Object.freeze([
  { num: 1, pt: "o-que-e", en: "what-banza-is" },
  { num: 2, pt: "porque-existe", en: "why-banza-exists" },
  { num: 3, pt: "principios", en: "structural-properties" },
  { num: 4, pt: "arquitectura", en: "protocol-architecture" },
  { num: 5, pt: "estado-protocolar", en: "protocol-state" },
  { num: 6, pt: "confianca", en: "trust" },
  { num: 7, pt: "certificacao", en: "conformance-certification" },
  { num: 8, pt: "operadores", en: "operators" },
  { num: 9, pt: "operador-zero", en: "operator-zero" },
  { num: 10, pt: "federacao", en: "federation" },
  { num: 11, pt: "governacao", en: "governance" },
  // Same address in both editions — declared in LOCALE_NEUTRAL_CHAPTER_SLUGS below.
  { num: 12, pt: "banzai", en: "banzai" },
  { num: 13, pt: "programadores", en: "developer-resources" },
  { num: 14, pt: "roteiro", en: "protocol-evolution" },
  { num: 15, pt: "faq", en: "faq" },
]);

/** The base path of the Reference in each edition. English URLs are English: never `/en/referencia`. */
export const REFERENCE_BASE: Record<"pt" | "en", string> = { pt: "/referencia", en: "/en/reference" };

/** The full path of a chapter in an edition, addressed by its semantic number. */
export function referenceChapterPath(num: number, locale: "pt" | "en"): string | undefined {
  const d = REFERENCE_CHAPTER_SLUGS.find((x) => x.num === num);
  return d ? `${REFERENCE_BASE[locale]}/${d[locale]}` : undefined;
}

/** The same chapter in the other edition, resolved through the chapter number — never by prefixing. */
export function referenceChapterCounterpart(slug: string, from: "pt" | "en"): string | undefined {
  const d = REFERENCE_CHAPTER_SLUGS.find((x) => x[from] === slug);
  if (!d) return undefined;
  return from === "en" ? `${REFERENCE_BASE.pt}/${d.pt}` : `${REFERENCE_BASE.en}/${d.en}`;
}
