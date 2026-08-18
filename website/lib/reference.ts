import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REFERENCE_CHAPTER_SLUGS, referenceChapterCounterpart } from "./referenceSlugs";

// Generated mirror of the canonical Reference. The editorial source is
// docs/reference/pt/BANZA_REFERENCIA.md; the Docker build context is website
// only, so the build cannot read it directly and reads this mirror instead.
// The mirror is produced by `make website-reference-mirror` and is never edited
// by hand — `make website-reference-source-boundary-check` fails if it drifts
// from its source.
const MIRRORS = { pt: "pt.md", en: "en.md" } as const;

/** The two Reference editions the site serves. PT is canonical; EN is its official translation. */
export type ReferenceLocale = keyof typeof MIRRORS;

/**
 * The mirror for a locale.
 *
 * A closed map, not a filename built from the argument: a path assembled from caller input is a traversal
 * waiting to happen, and there are exactly two editions. An unknown locale throws rather than falling back
 * to Portuguese — an English page silently rendering Portuguese is the failure this milestone exists to end,
 * and it must not be reachable by passing a typo.
 */
function referencePath(locale: ReferenceLocale): string {
  const file = MIRRORS[locale];
  if (!file) throw new Error(`unsupported reference locale: ${String(locale)}`);
  return join(process.cwd(), "content", "reference", file);
}

export type TocEntry = { id: string; title: string; number?: string };

/**
 * Slugify a heading to the anchor form used by the reference's own internal
 * links (e.g. "## 6. Certificação" → "6-certificação", "## Resumo Executivo" →
 * "resumo-executivo"). Lowercase, keep unicode letters/diacritics, collapse any
 * other run into a single hyphen.
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function getReferenceMarkdown(locale: ReferenceLocale = "pt"): string {
  return readFileSync(referencePath(locale), "utf8");
}

/** Reference metadata parsed from the document header. */
export function getReferenceMeta(locale: ReferenceLocale = "pt") {
  const raw = getReferenceMarkdown(locale);
  const version = raw.match(/^\*\*Versão:\*\*\s*(.+)$/m)?.[1]?.trim() ?? "1.0";
  const data = raw.match(/^\*\*Data:\*\*\s*(.+)$/m)?.[1]?.trim() ?? "";
  return { version, data };
}

/** Extract the H2 table of contents (numbered + named sections). */
export function getReferenceToc(locale: ReferenceLocale = "pt"): TocEntry[] {
  const raw = getReferenceMarkdown(locale);
  const lines = raw.split("\n");
  const toc: TocEntry[] = [];
  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (!m) continue;
    const title = m[1].trim();
    const num = title.match(/^(\d+)\.\s/)?.[1];
    toc.push({ id: slugifyHeading(title), title, number: num });
  }
  // Skip the document's own in-page index sections from the sidebar nav.
  return toc.filter((t) => !["índice", "navegação-rápida"].includes(t.id));
}

// ── Chapter split (audit phase 5) ────────────────────────────────────────────
// The canonical markdown stays a single file (single source of truth); the site
// slices it into chapter pages at build time. Slugs and one-line summaries are
// site-level navigation metadata — they never alter the canonical content.

export type Chapter = {
  slug: string;
  num: number;
  title: string;
  summary: string;
  content: string; // the chapter's markdown, heading included
};

// M2.7L information-architecture order (PARTE 1). Slugs are stable public routes; only the position,
// number and public summary change. PostgreSQL sits at 05 (protocol state, after Architecture); the
// former "Racional Estratégico" chapter is now a section inside 02 "Por Que o BANZA Existe"
// (/referencia/racional redirects there). FAQ is last. M2.12B inserted Operador Zero at 09.
// Card summaries are site-navigation metadata (never the canonical content). Each answers, in one
// sober sentence of uniform density, "o que vou encontrar aqui?" — no status verdicts, no milestone
// nomenclature. Guard-pinned tokens are preserved verbatim: the PostgreSQL summary keeps "não guarda
// valor financeiro"; the BanzAI summary keeps "interface humana primária" + "transversal".
/**
 * What each chapter is about, keyed by the semantic chapter number.
 *
 * The SLUGS are not here: they are public route identifiers that the site chrome also has to resolve, and
 * they live in `lib/referenceSlugs.ts` — pure data with no filesystem access, so a client component can
 * import them without dragging this loader into the browser bundle. `num` is the identity that survives
 * translation; a locale slug is an address and never an id.
 *
 * Chapter 9 sits BETWEEN Operadores and Federação on purpose: chapter 8 says who implements the protocol,
 * 9 shows the canonical read-only reference implementation (how an implementation presents itself,
 * validated in BanzAI), and 10 federates the operators and artifacts that 8 and 9 established. Putting the
 * reference at the end would make it read as an appendix rather than as the protocol's own reference point.
 */
const CHAPTER_SUMMARIES: Record<number, string> = {
  1: "A definição do protocolo, as suas propriedades essenciais e a fronteira do que o BANZA não é.",
  2: "A interoperabilidade financeira já existe; o que o BANZA acrescenta é uma base pública e verificável para a demonstrar, comparar e reproduzir de forma independente.",
  3: "As propriedades de desenho que o protocolo preserva mesmo quando a implementação evolui — correcção financeira, neutralidade, decisão determinística, evidência, âmbito explícito, fecho por omissão e separação de responsabilidades.",
  4: "As três camadas institucionais — Camada 1 Protocolo aberto, Camada 2 Certificação de Conformidade e Interoperabilidade, Camada 3 Esquemas operacionais independentes — com o BanzAI transversal (não uma quarta camada), os planos de artefactos e as fronteiras de autoridade que não se propagam.",
  5: "O estado protocolar verificável — categorias, autoridade, estado observado e derivado; a base de dados é implementação, e não guarda valor financeiro.",
  6: "A confiança como propriedade técnica delimitada: origem, chaves delegadas por domínio, assinatura, frescura e revogação, verificáveis offline; uma assinatura válida não é conformidade, certificação nem autorização.",
  7: "A conformidade verificável por motores determinísticos e a Certificação de Conformidade e Interoperabilidade (Camada 2), por implementação e baseada em evidência.",
  8: "O operador (entidade) distinto da implementação (o sujeito técnico avaliado): um operador publica várias implementações; identidade, publicação, o Registo Técnico e a avaliação aberta de confiança entre pares.",
  9: "A implementação canónica de referência, apenas de leitura, que expõe manifest, endpoints e evidência para descoberta e verificação no BanzAI.",
  10: "A avaliação técnica, local e por interacção, das condições para dois operadores interoperarem — que permite ou, por omissão, recusa o encaminhamento — e não uma rede, uma inscrição, um estatuto nem uma autoridade.",
  11: "O processo público pelo qual as regras do protocolo evoluem — proposta, revisão e decisão dos maintainers activos sobre invariantes, contratos, perfis e versões — e onde a sua autoridade termina: mantém as regras, mas não certifica, não admite, não autoriza nem regula operadores.",
  12: "O BanzAI como interface humana primária e transversal às três camadas: lê e cita as fontes, sem criar regras nem decidir veredictos.",
  13: "O mapa dos recursos de programador: os artefactos normativos (contratos, invariantes, esquemas, vectores) que definem o comportamento e as ferramentas (motores, BanzAI, implementação de referência) que ajudam a implementá-lo e verificá-lo — sem o definir; nenhuma linguagem, base de dados ou stack é imposta.",
  14: "Como o protocolo evolui: direcções possíveis, o que permanece invariante e o que não é compromisso — sem calendário, promessas de entrega nem plano de produto; o estado actual está no §5 e o processo de mudança no §11.",
  15: "Respostas curtas às dúvidas mais comuns sobre o protocolo, implementação, conformidade, operadores, federação, confiança, governança e evolução — cada uma a resumir e a apontar para o capítulo canónico; não substituem os contratos nem os artefactos normativos.",
};

/** The 15 semantic chapters, composed from the shared slug pairing and the summaries above. */
const CHAPTER_DEFS: { num: number; slug: string; enSlug: string; summary: string }[] =
  REFERENCE_CHAPTER_SLUGS.map((s) => ({
    num: s.num,
    slug: s.pt,
    enSlug: s.en,
    summary: CHAPTER_SUMMARIES[s.num],
  }));

/** Split the canonical markdown into numbered chapters (fence-aware). */
export function getReferenceChapters(locale: ReferenceLocale = "pt"): Chapter[] {
  const raw = getReferenceMarkdown(locale);
  const lines = raw.split("\n");
  const bounds: { num: number; title: string; start: number }[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^```/.test(lines[i])) inFence = !inFence;
    if (inFence) continue;
    const m = lines[i].match(/^##\s+(\d+)\.\s+(.+?)\s*$/);
    if (m) bounds.push({ num: Number(m[1]), title: `${m[1]}. ${m[2]}`, start: i });
    // A non-numbered H2 after chapters (e.g. "## Referências") ends the last chapter.
    if (!m && /^##\s+/.test(lines[i]) && bounds.length > 0) {
      bounds.push({ num: -1, title: "", start: i });
      break;
    }
  }
  const chapters: Chapter[] = [];
  for (let b = 0; b < bounds.length; b++) {
    if (bounds[b].num === -1) break;
    const end = b + 1 < bounds.length ? bounds[b + 1].start : lines.length;
    const def = CHAPTER_DEFS.find((d) => d.num === bounds[b].num);
    if (!def) continue;
    chapters.push({
      slug: def.slug,
      num: def.num,
      title: bounds[b].title,
      summary: def.summary,
      content: lines.slice(bounds[b].start, end).join("\n").trim(),
    });
  }
  return chapters;
}

/** A chapter by its slug IN THAT LOCALE. PT reads `slug`, EN reads `enSlug`; both resolve the same `num`. */
export function getReferenceChapter(slug: string, locale: ReferenceLocale = "pt"): Chapter | undefined {
  const defs = CHAPTER_DEFS.find((d) => (locale === "en" ? d.enSlug : d.slug) === slug);
  if (!defs) return undefined;
  return getReferenceChapters(locale).find((c) => c.num === defs.num);
}

/** The public slug of a semantic chapter in a locale — the one place a URL is derived from an id. */
export function chapterSlug(num: number, locale: ReferenceLocale): string | undefined {
  const d = CHAPTER_DEFS.find((x) => x.num === num);
  return d ? (locale === "en" ? d.enSlug : d.slug) : undefined;
}

/** Every semantic chapter with both public slugs. The mapping the parity guard and tests read. */
export function chapterSlugMap(): { num: number; pt: string; en: string }[] {
  return CHAPTER_DEFS.map((d) => ({ num: d.num, pt: d.slug, en: d.enSlug }));
}

/**
 * The same chapter in the other language, by semantic id.
 *
 * Never by string surgery on the pathname: `/en` + a Portuguese path would produce `/en/referencia/...`,
 * an architecture that was considered and rejected. The id is the bridge; the slugs are the two ends.
 */
export function chapterCounterpart(slug: string, from: ReferenceLocale): string | undefined {
  // Delegated, not reimplemented: the site chrome resolves the same relation from the same table, and two
  // implementations of "the English URL of this chapter" is precisely the drift this milestone is closing.
  return referenceChapterCounterpart(slug, from);
}

/** The "Resumo Executivo" section body, for the reference index page. */
export function getExecutiveSummary(locale: ReferenceLocale = "pt"): string {
  const raw = getReferenceMarkdown(locale);
  const m = raw.match(/^## Resumo Executivo\s*$([\s\S]*?)^## /m);
  return m ? m[1].trim() : "";
}

// ── Navigable outline (smart index) ──────────────────────────────────────────
// Chapters (numbered H2) with their in-chapter subsections (H3). The `anchorId`
// is the H2 slug used on /referencia/completa (e.g. "7-federação"); the `slug`
// is the chapter page route (e.g. "federacao"). Section ids match the H3 slugs
// the markdown renderer emits, so both the full page and the chapter pages can
// build a scrollspy against the live headings without any duplicated logic.

export type OutlineSection = { id: string; title: string };
export type OutlineChapter = {
  num: number;
  slug: string;
  anchorId: string;
  title: string;
  shortTitle: string;
  sections: OutlineSection[];
};

/** Build the chapter → subsection outline (fence-aware). */
export function getReferenceOutline(locale: ReferenceLocale = "pt"): OutlineChapter[] {
  const raw = getReferenceMarkdown(locale);
  const lines = raw.split("\n");
  const out: OutlineChapter[] = [];
  let current: OutlineChapter | null = null;
  let inFence = false;

  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;
    if (inFence) continue;

    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      const title = h2[1].trim();
      const num = title.match(/^(\d+)\.\s/)?.[1];
      if (num) {
        const def = CHAPTER_DEFS.find((d) => d.num === Number(num));
        // The slug of THIS locale. Reading `def.slug` unconditionally emitted Portuguese slugs into the
        // English outline, and the sidebar prefixed them with the English base — producing
        // /en/reference/arquitectura, a 404. Caught by probing the running container, not by the tests,
        // which scanned route source rather than rendered output.
        const localeSlug = locale === "en" ? def?.enSlug : def?.slug;
        current = {
          num: Number(num),
          slug: localeSlug ?? slugifyHeading(title),
          anchorId: slugifyHeading(title),
          title,
          shortTitle: title.replace(/^\d+\.\s*/, ""),
          sections: [],
        };
        out.push(current);
      } else {
        // A non-numbered H2 (e.g. "## Referências") closes the chapter run.
        current = null;
      }
      continue;
    }

    const h3 = line.match(/^###\s+(.+?)\s*$/);
    if (h3 && current) {
      const title = h3[1].trim();
      current.sections.push({ id: slugifyHeading(title), title });
    }
  }

  return out;
}
