import { readFileSync } from "node:fs";
import { join } from "node:path";

// Generated mirror of the canonical Reference. The editorial source is
// docs/reference/pt/BANZA_REFERENCIA.md; the Docker build context is website
// only, so the build cannot read it directly and reads this mirror instead.
// The mirror is produced by `make website-reference-mirror` and is never edited
// by hand — `make website-reference-source-boundary-check` fails if it drifts
// from its source.
const REFERENCE_PATH = join(process.cwd(), "content", "reference", "pt.md");

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

export function getReferenceMarkdown(): string {
  return readFileSync(REFERENCE_PATH, "utf8");
}

/** Reference metadata parsed from the document header. */
export function getReferenceMeta() {
  const raw = getReferenceMarkdown();
  const version = raw.match(/^\*\*Versão:\*\*\s*(.+)$/m)?.[1]?.trim() ?? "1.0";
  const data = raw.match(/^\*\*Data:\*\*\s*(.+)$/m)?.[1]?.trim() ?? "";
  return { version, data };
}

/** Extract the H2 table of contents (numbered + named sections). */
export function getReferenceToc(): TocEntry[] {
  const raw = getReferenceMarkdown();
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
const CHAPTER_DEFS: { num: number; slug: string; summary: string }[] = [
  { num: 1, slug: "o-que-e", summary: "A definição do protocolo, as suas propriedades essenciais e a fronteira do que o BANZA não é." },
  { num: 2, slug: "porque-existe", summary: "A interoperabilidade financeira já existe; o que o BANZA acrescenta é uma base pública e verificável para a demonstrar, comparar e reproduzir de forma independente." },
  { num: 3, slug: "principios", summary: "As propriedades de desenho que o protocolo preserva mesmo quando a implementação evolui — correcção financeira, neutralidade, decisão determinística, evidência, âmbito explícito, fecho por omissão e separação de responsabilidades." },
  { num: 4, slug: "arquitectura", summary: "As três camadas institucionais — Camada 1 Protocolo aberto, Camada 2 Certificação de Conformidade e Interoperabilidade, Camada 3 Esquemas operacionais independentes — com o BanzAI transversal (não uma quarta camada), os planos de artefactos e as fronteiras de autoridade que não se propagam." },
  { num: 5, slug: "estado-protocolar", summary: "O estado protocolar verificável — categorias, autoridade, estado observado e derivado; a base de dados é implementação, e não guarda valor financeiro." },
  { num: 6, slug: "confianca", summary: "A confiança como propriedade técnica delimitada: origem, chaves delegadas por domínio, assinatura, frescura e revogação, verificáveis offline; uma assinatura válida não é conformidade, certificação nem autorização." },
  { num: 7, slug: "certificacao", summary: "A conformidade verificável por motores determinísticos e a Certificação de Conformidade e Interoperabilidade (Camada 2), por implementação e baseada em evidência." },
  { num: 8, slug: "operadores", summary: "O operador (entidade) distinto da implementação (o sujeito técnico avaliado): um operador publica várias implementações; identidade, publicação, o Registo Técnico e a avaliação aberta de confiança entre pares." },
  // Operador Zero sits BETWEEN Operadores and Federação on purpose: chapter 8 says who implements
  // the protocol, 9 shows the canonical read-only reference implementation (how an implementation
  // presents itself, validated in BanzAI), and 10 federates the operators and artifacts that 8 and 9
  // established. Putting the reference at the end would make it read as an appendix rather than as
  // the protocol's own reference point.
  { num: 9, slug: "operador-zero", summary: "A implementação canónica de referência, apenas de leitura, que expõe manifest, endpoints e evidência para descoberta e verificação no BanzAI." },
  { num: 10, slug: "federacao", summary: "A avaliação técnica, local e por interacção, das condições para dois operadores interoperarem — que permite ou, por omissão, recusa o encaminhamento — e não uma rede, uma inscrição, um estatuto nem uma autoridade." },
  { num: 11, slug: "governacao", summary: "O processo público pelo qual as regras do protocolo evoluem — proposta, revisão e decisão dos maintainers activos sobre invariantes, contratos, perfis e versões — e onde a sua autoridade termina: mantém as regras, mas não certifica, não admite, não autoriza nem regula operadores." },
  { num: 12, slug: "banzai", summary: "O BanzAI como interface humana primária e transversal às três camadas: lê e cita as fontes, sem criar regras nem decidir veredictos." },
  { num: 13, slug: "programadores", summary: "O mapa dos recursos de programador: os artefactos normativos (contratos, invariantes, esquemas, vectores) que definem o comportamento e as ferramentas (motores, BanzAI, implementação de referência) que ajudam a implementá-lo e verificá-lo — sem o definir; nenhuma linguagem, base de dados ou stack é imposta." },
  { num: 14, slug: "roteiro", summary: "Como o protocolo evolui: direcções possíveis, o que permanece invariante e o que não é compromisso — sem calendário, promessas de entrega nem plano de produto; o estado actual está no §5 e o processo de mudança no §11." },
  { num: 15, slug: "faq", summary: "Respostas curtas às dúvidas mais comuns sobre o protocolo, implementação, conformidade, operadores, federação, confiança, governança e evolução — cada uma a resumir e a apontar para o capítulo canónico; não substituem os contratos nem os artefactos normativos." },
];

/** Split the canonical markdown into numbered chapters (fence-aware). */
export function getReferenceChapters(): Chapter[] {
  const raw = getReferenceMarkdown();
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

export function getReferenceChapter(slug: string): Chapter | undefined {
  return getReferenceChapters().find((c) => c.slug === slug);
}

/** The "Resumo Executivo" section body, for the reference index page. */
export function getExecutiveSummary(): string {
  const raw = getReferenceMarkdown();
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
export function getReferenceOutline(): OutlineChapter[] {
  const raw = getReferenceMarkdown();
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
        current = {
          num: Number(num),
          slug: def?.slug ?? slugifyHeading(title),
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
