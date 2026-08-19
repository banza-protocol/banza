// Block E2 / Q5 — the reader-facing copy of the live progress block and its metrics readout.
//
// Everything the progress block shows about the answer is engine data: entity ids, closed enums, reason
// codes, counts, checksums, artifact versions, durations. None of it is translated, and none of it may be.
// What IS the reader's own is the frame — the word that NAMES each fact ("Entidade" / "Entity"), the
// section headings, the processing line, and the way a duration is written down.
//
// That last one matters more than it looks: the metrics readout formatted "1,3 s" with a Portuguese
// decimal comma. A number is a fact, but how it is WRITTEN is a convention of the reader's language, so an
// English reader gets "1.3 s" for the same measurement. The measurement never changes.

import type { Locale } from "@/lib/i18n";

const L = (pt: string, en: string): Readonly<Record<Locale, string>> => ({ pt, en });

export const PROGRESS_COPY = {
  // The processing line, keyed by the phase the stream is actually in.
  "line.interpreting": L("A interpretar a pergunta", "Interpreting the question"),
  "line.buildingFacts": L("A construir os factos verificáveis", "Building the verifiable facts"),
  "line.preparingExplanation": L("A preparar a explicação", "Preparing the explanation"),
  "line.verifyingClaims": L("A verificar afirmações", "Verifying claims"),
  "line.verifyingCitations": L("A verificar citações", "Verifying citations"),
  "line.processing": L("A processar a pergunta", "Processing the question"),
  "line.sourcesResolved": L("Fontes resolvidas", "Sources resolved"),
  "line.resolvingSourcesAndTools": L("A resolver fontes e ferramentas", "Resolving sources and tools"),
  "line.toolsDone.one": L("{n} ferramenta concluída", "{n} tool completed"),
  "line.toolsDone.many": L("{n} ferramentas concluídas", "{n} tools completed"),

  // Chrome around the live block.
  "block.srPrefix": L("Progresso do BanzAI: ", "BanzAI progress: "),
  "block.synthesis": L(
    "A preparar uma explicação baseada nos factos verificados…",
    "Preparing an explanation based on the verified facts…",
  ),
  "block.cancel": L("Cancelar", "Cancel"),
  "block.factsHeading": L("FACTOS VERIFICÁVEIS (EM CURSO)", "VERIFIABLE FACTS (IN PROGRESS)"),

  // Chip labels. The VALUE beside each of these is engine data and is never touched.
  "chip.entity": L("Entidade", "Entity"),
  "chip.type": L("Tipo", "Type"),
  "chip.artifact": L("Artefacto", "Artifact"),
  "chip.scope": L("Âmbito", "Scope"),
  "chip.authority": L("Autoridade", "Authority"),
  "chip.source": L("Fonte", "Source"),
  "chip.live": L("ao vivo", "live"),
  "chip.package": L("Pacote", "Package"),
  "chip.intent": L("Intenção", "Intent"),
  "chip.family": L("Família", "Family"),
  "chip.reasonCode": L("Reason code", "Reason code"),
  "chip.facts": L("Factos", "Facts"),
  "chip.sample": L("Amostra", "Sample"),
  "chip.aggregation": L("Agregação", "Aggregation"),
  "chip.depth": L("Profundidade", "Depth"),
  "chip.checksum": L("Checksum", "Checksum"),
  "chip.doc": L("Doc", "Doc"),
  "chip.state": L("Estado", "State"),
  "chip.implementation": L("Implementação", "Implementation"),
  "chip.origin": L("Origem", "Origin"),
  "chip.version": L("Versão", "Version"),
  "chip.sha256": L("sha256", "sha256"),
  "chip.tool": L("Ferramenta", "Tool"),
  "chip.outcome": L("Resultado", "Outcome"),
  "chip.code": L("Código", "Code"),
  "chip.n": L("N", "N"),
  "chip.metric": L("Métrica", "Metric"),

  // The §12 metrics readout.
  "metrics.heading": L("MÉTRICAS PROGRESSIVAS", "PROGRESSIVE METRICS"),
  "metrics.firstProgress": L("Primeiro progresso", "First progress"),
  "metrics.firstVerifiedFact": L("Primeiro facto verificável", "First verifiable fact"),
  "metrics.validatedAnswer": L("Resposta validada", "Validated answer"),
  "metrics.ttfb": L("TTFB (distinto)", "TTFB (separate)"),
} as const;

export type ProgressCopyId = keyof typeof PROGRESS_COPY;

/**
 * Ids whose two editions are legitimately identical: protocol vocabulary the engine itself uses
 * (`reason code`, `sha256`), an algebraic symbol, and two words English and Portuguese already share.
 */
export const PROGRESS_IDENTICAL_ACROSS_EDITIONS: ProgressCopyId[] = [
  "chip.reasonCode",
  "chip.sha256",
  "chip.checksum",
  "chip.doc",
  "chip.n",
];

/** Read one reader-facing string. `locale` is required; a missing realization throws. */
export function progressCopy(
  id: ProgressCopyId,
  locale: Locale,
  params?: Readonly<Record<string, string>>,
): string {
  const entry = PROGRESS_COPY[id];
  if (!entry) throw new Error(`progressCopy: unknown id "${id}"`);
  const template = entry[locale];
  if (!template) throw new Error(`progressCopy: no ${locale} realization for "${id}"`);
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const value = params?.[key];
    if (value === undefined || value === "") throw new Error(`progressCopy: "${id}" needs parameter "${key}"`);
    return value;
  });
}

export function progressCopyIds(): ProgressCopyId[] {
  return Object.keys(PROGRESS_COPY) as ProgressCopyId[];
}

/**
 * A processing line as the engine sees it: which segments, with which counts. Locale-free, so the phase a
 * stream is in is the same fact for every reader — only the sentence naming it differs.
 */
export type ProgressLineSelection = Readonly<{
  segments: readonly Readonly<{ id: ProgressCopyId; params?: Readonly<Record<string, string>> }>[];
}>;

/** Realize a processing line. Segments join with the same separator in both editions. */
export function realizeProgressLine(sel: ProgressLineSelection, locale: Locale): string {
  return sel.segments.map((s) => progressCopy(s.id, locale, s.params)).join(" · ");
}

/**
 * Write a duration down the way the reader's language writes numbers. The MEASUREMENT is identical; only
 * the decimal mark differs — Portuguese uses a comma, English a point.
 */
export function formatProgressMs(ms: number | null | undefined, locale: Locale): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms >= 1000) {
    const seconds = (ms / 1000).toFixed(1);
    return `${locale === "pt" ? seconds.replace(".", ",") : seconds} s`;
  }
  return `${Math.round(ms)} ms`;
}
