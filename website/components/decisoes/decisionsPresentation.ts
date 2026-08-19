// Block E2 / Q4 — the reader-facing copy of the ADR/RFC library.
//
// A decision record is almost entirely FACT. Its code, its type, its state, its theme, its slug and the
// title and summary carried in the document's own language are the governance trail itself: they are
// identical for every reader and are never translated — an English edition that renamed ADR-012, or
// quietly showed a draft as active, would not be a translation but a different governance claim.
//
// What IS the reader's own is the chrome around those facts: the filter names, the word that EXPLAINS a
// state, the search prompts, the counts, and the two questions the "explain with BanzAI" link sends. That
// split is the whole model — the state decides, the label explains — and it is what makes it safe to serve
// the library in a second language at all.

import type { Locale } from "@/lib/i18n";

const L = (pt: string, en: string): Readonly<Record<Locale, string>> => ({ pt, en });

export const DECISIONS_COPY = {
  // Type filter — "ADRs" and "RFCs" are the acronyms themselves and are the same word in both editions.
  "filter.type.all": L("Todos", "All"),
  "filter.type.adr": L("ADRs", "ADRs"),
  "filter.type.rfc": L("RFCs", "RFCs"),

  // State filter — the plural, "show me these" form.
  "filter.state.all": L("Todos os estados", "All states"),
  "filter.state.activo": L("Activos", "Active"),
  "filter.state.rascunho": L("Rascunhos", "Drafts"),
  "filter.state.substituido": L("Substituídos", "Superseded"),

  // State label — the singular form stamped on a card. The STATE is the fact; this only names it.
  "state.all": L("Todos", "All"),
  "state.activo": L("Activo", "Active"),
  "state.rascunho": L("Rascunho", "Draft"),
  "state.substituido": L("Substituído", "Superseded"),

  "aria.filterByType": L("Filtrar por tipo", "Filter by type"),
  "aria.filterByState": L("Filtrar por estado", "Filter by state"),
  "search.label": L("Pesquisar decisões", "Search decisions"),
  "search.placeholder": L("Pesquisar por código, título, tema…", "Search by code, title, theme…"),
  "facet.theme": L("Tema", "Theme"),
  "facet.allThemes": L("Todos os temas", "All themes"),

  "count.one": L("DOCUMENTO", "DOCUMENT"),
  "count.many": L("DOCUMENTOS", "DOCUMENTS"),
  "library.note": L(
    "A biblioteca lista todos os ADRs e RFCs do Protocolo BANZA v1.0 — activos, rascunhos e substituídos. Os registos substituídos mantêm-se publicados: o rasto de decisões é parte da governação aberta.",
    "The library lists every ADR and RFC of BANZA Protocol v1.0 — active, draft and superseded. Superseded records stay published: the trail of decisions is part of open governance.",
  ),

  "empty.title": L("Nenhum documento encontrado.", "No document found."),
  "empty.hint": L("Ajuste os filtros ou limpe a pesquisa.", "Adjust the filters or clear the search."),

  "card.nonNormative": L("Não normativo", "Not normative"),
  "card.originalLanguage": L("Conteúdo completo · língua original", "Full content · original language"),
  "card.readFull": L("Ler conteúdo completo", "Read the full content"),
  "card.explainWithBanzai": L("Explicar com BanzAI", "Explain with BanzAI"),

  // The question the "explain with BanzAI" link sends. It is a QUESTION asked by the reader, so it is
  // composed in the reader's language around the record's code — never translated after the fact.
  "ask.adr": L(
    "Explica o {id} em linguagem simples, destacando que é o registo canónico da decisão de arquitectura que documenta, mas que deve ser lido em conjunto com a Referência BANZA, contratos e invariantes aplicáveis. Este documento não confere estatuto a nenhum operador.",
    "Explain {id} in plain language, making clear that it is the canonical record of the architecture decision it documents, but that it must be read together with the BANZA Reference, the contracts and the applicable invariants. This document confers status on no operator.",
  ),
  "ask.rfc": L(
    "Explica o {id} em linguagem simples, destacando que é o registo canónico da proposta ou discussão técnica que documenta, mas que não altera por si só as regras actuais enquanto não for aceite e reflectida nos documentos normativos aplicáveis. Este documento não confere estatuto a nenhum operador.",
    "Explain {id} in plain language, making clear that it is the canonical record of the technical proposal or discussion it documents, but that on its own it does not change the current rules until it is accepted and reflected in the applicable normative documents. This document confers status on no operator.",
  ),
} as const;

export type DecisionsCopyId = keyof typeof DECISIONS_COPY;

/**
 * Ids whose two editions are legitimately the same string. "ADRs" and "RFCs" are the acronyms, not
 * descriptions of them; translating them would invent a term the governance trail does not use. Declared
 * here so the completeness property can insist that EVERY OTHER id really is realized twice.
 */
export const IDENTICAL_ACROSS_EDITIONS: DecisionsCopyId[] = ["filter.type.adr", "filter.type.rfc"];

/** Read one reader-facing string. `locale` is required; a missing realization throws. */
export function decisionsCopy(
  id: DecisionsCopyId,
  locale: Locale,
  params?: Readonly<Record<string, string>>,
): string {
  const entry = DECISIONS_COPY[id];
  if (!entry) throw new Error(`decisionsCopy: unknown id "${id}"`);
  const template = entry[locale];
  if (!template) throw new Error(`decisionsCopy: no ${locale} realization for "${id}"`);
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const value = params?.[key];
    if (!value) throw new Error(`decisionsCopy: "${id}" needs parameter "${key}"`);
    return value;
  });
}

export function decisionsCopyIds(): DecisionsCopyId[] {
  return Object.keys(DECISIONS_COPY) as DecisionsCopyId[];
}

/** The four states a record can be in. A closed set of FACTS — never derived from the reader's language. */
export const DECISION_STATES = ["all", "activo", "rascunho", "substituido"] as const;
export type DecisionState = (typeof DECISION_STATES)[number];

/** Name a state for a reader. The state itself is unchanged; only the word for it is the reader's. */
export function decisionStateLabel(state: string, locale: Locale): string {
  const id = `state.${state}` as DecisionsCopyId;
  if (!(id in DECISIONS_COPY)) return state; // an unknown state is shown verbatim, never guessed at
  return decisionsCopy(id, locale);
}

/** The question the "explain with BanzAI" link asks, composed in the reader's own language. */
export function decisionAskQuestion(type: string, id: string, locale: Locale): string {
  return decisionsCopy(type === "ADR" ? "ask.adr" : "ask.rfc", locale, { id });
}
