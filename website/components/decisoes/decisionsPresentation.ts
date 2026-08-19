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

  // ── The DECISIONS index route ───────────────────────────────────────────────────────────────────
  "index.metaTitle": L(
    "Decisões do Protocolo · ADRs e RFCs · BANZA",
    "Protocol Decisions · ADRs and RFCs · BANZA",
  ),
  "index.metaDescription": L(
    "Consulte ADRs e RFCs do protocolo BANZA — o registo canónico das decisões técnicas e propostas que documentam. Para implementar o protocolo, leia-os em conjunto com a Referência BANZA, contratos e invariantes aplicáveis.",
    "Browse the ADRs and RFCs of the BANZA protocol — the canonical record of the technical decisions and proposals they document. To implement the protocol, read them together with the BANZA Reference, the contracts and the applicable invariants.",
  ),
  "index.eyebrow": L("GOVERNAÇÃO · DECISÕES", "GOVERNANCE · DECISIONS"),
  "index.title": L("Decisões do Protocolo", "Protocol Decisions"),
  "index.lede": L(
    "ADRs e RFCs que documentam a evolução técnica do BANZA. Cada documento é o registo canónico da decisão ou proposta que documenta; para implementar o protocolo, leia-os em conjunto com a Referência BANZA, os contratos e os invariantes aplicáveis.",
    "ADRs and RFCs documenting BANZA's technical evolution. Each document is the canonical record of the decision or proposal it documents; to implement the protocol, read them together with the BANZA Reference, the contracts and the applicable invariants.",
  ),
  "index.chip.protocol": L("PROTOCOLO", "PROTOCOL"),
  "index.chip.governance": L("GOVERNAÇÃO", "GOVERNANCE"),
  "index.chip.banzaiExplains": L("BANZAI EXPLICA, NÃO DECIDE", "BANZAI EXPLAINS, IT DOES NOT DECIDE"),
  "index.chip.counts": L("{adr} ADRs · {rfc} RFCs", "{adr} ADRs · {rfc} RFCs"),
  // The prudential note is composed from segments so the two inline links stay real links in both
  // editions instead of markup smuggled into a catalogue string.
  "index.note.1": L(
    "As ADRs (Registos de Decisão de Arquitectura, nível normativo N3) são o registo canónico das decisões técnicas que documentam. As RFCs (Pedidos de Comentários, N4) são o registo canónico das propostas e discussões técnicas que documentam — algumas ainda em rascunho. Para implementar o protocolo, leia estes documentos em conjunto com a",
    "ADRs (Architecture Decision Records, normative level N3) are the canonical record of the technical decisions they document. RFCs (Requests for Comments, N4) are the canonical record of the technical proposals and discussions they document — some still in draft. To implement the protocol, read these documents together with the",
  ),
  "index.note.2": L(", os contratos e os invariantes aplicáveis. O", ", the contracts and the applicable invariants. "),
  "index.note.3": L("é explicativo e não normativo.", "is explanatory and not normative."),
  "link.reference": L("Referência BANZA", "BANZA Reference"),
  "link.banzai": L("BanzAI", "BanzAI"),
  "index.link.githubSource": L("Código-fonte no GitHub", "Source code on GitHub"),
  "index.link.governanceProcess": L("Processo de governação", "Governance process"),

  // ── The DECISION detail route ───────────────────────────────────────────────────────────────────
  "detail.metaTitleNotFound": L(
    "Documento não encontrado · Decisões · BANZA",
    "Document not found · Decisions · BANZA",
  ),
  "detail.metaTitle": L("{id} · Decisões do Protocolo · BANZA", "{id} · Protocol Decisions · BANZA"),
  "detail.metaDescription.adr": L(
    "Leia esta decisão de arquitectura do protocolo BANZA, apresentada na língua original. Uma ADR é o registo canónico da decisão que documenta e deve ser lida em conjunto com a Referência BANZA, contratos e invariantes aplicáveis.",
    "Read this BANZA protocol architecture decision, presented in its original language. An ADR is the canonical record of the decision it documents and must be read together with the BANZA Reference, the contracts and the applicable invariants.",
  ),
  "detail.metaDescription.rfc": L(
    "Leia esta proposta ou discussão técnica do protocolo BANZA, apresentada na língua original. Uma RFC é o registo canónico da proposta que documenta, mas não altera por si só as regras actuais enquanto não for aceite e reflectida nos documentos aplicáveis.",
    "Read this BANZA protocol technical proposal or discussion, presented in its original language. An RFC is the canonical record of the proposal it documents, but on its own it does not change the current rules until it is accepted and reflected in the applicable documents.",
  ),
  "detail.chip.nonNormative": L("NÃO NORMATIVO", "NOT NORMATIVE"),

  // The long form of a state, shown on the record's own page. A draft opened by direct link must say so
  // here: arriving by link is exactly the path that skips the library's state chip.
  "detail.state.activo": L("Activo", "Active"),
  "detail.state.rascunho": L(
    "Rascunho — proposta em discussão, não aceite",
    "Draft — proposal under discussion, not accepted",
  ),
  "detail.state.substituido": L("Substituído", "Superseded"),

  "detail.meta.type": L("Tipo", "Type"),
  "detail.meta.state": L("Estado", "State"),
  "detail.meta.normativeLevel": L("Nível normativo", "Normative level"),
  "detail.meta.path": L("Caminho", "Path"),
  "detail.type.adr": L("ADR · Registo de Decisão de Arquitectura", "ADR · Architecture Decision Record"),
  "detail.type.rfc": L("RFC · Pedido de Comentários", "RFC · Request for Comments"),
  "detail.normativeLevel": L(
    "Não normativo — explica a arquitectura; não vincula uma implementação",
    "Not normative — it explains the architecture; it does not bind an implementation",
  ),

  "detail.aria.breadcrumb": L("Trilho", "Breadcrumb"),
  "detail.breadcrumb.index": L("Decisões do Protocolo", "Protocol Decisions"),
  "detail.action.readOnGithub": L("Ler documento completo no GitHub", "Read the full document on GitHub"),
  "detail.action.back": L("Voltar às decisões", "Back to the decisions"),
  "detail.section.related": L("RELACIONADOS", "RELATED"),
  "detail.section.originalDocument": L(
    "DOCUMENTO ORIGINAL · CONTEÚDO COMPLETO",
    "ORIGINAL DOCUMENT · FULL CONTENT",
  ),
  "detail.note.heading": L("O que este documento é — e não é.", "What this document is — and is not."),
  "detail.note.adr.1": L(
    "Uma ADR é o registo canónico da decisão de arquitectura que documenta. Explica o contexto técnico, a decisão tomada e as suas razões. Para implementar o protocolo, deve ser lida em conjunto com a",
    "An ADR is the canonical record of the architecture decision it documents. It explains the technical context, the decision taken and the reasons for it. To implement the protocol, it must be read together with the",
  ),
  "detail.note.adr.2": L(
    ", os contratos e os invariantes aplicáveis.",
    ", the contracts and the applicable invariants.",
  ),
  "detail.note.rfc": L(
    "Uma RFC é o registo canónico da proposta ou discussão técnica que documenta. Explica o contexto técnico, a proposta, as alternativas em análise e a possível evolução do protocolo. Enquanto não for aceite e reflectida nos documentos normativos aplicáveis, não altera por si só as regras actuais do protocolo.",
    "An RFC is the canonical record of the technical proposal or discussion it documents. It explains the technical context, the proposal, the alternatives under consideration and the protocol's possible evolution. Until it is accepted and reflected in the applicable normative documents, on its own it does not change the protocol's current rules.",
  ),
  "detail.note.asideTail": L(
    "Não aprova operadores nem confere certificação. O BanzAI explica, mas não decide, não certifica e não substitui os documentos normativos aplicáveis.",
    "It approves no operator and confers no certification. BanzAI explains, but it does not decide, does not certify and does not replace the applicable normative documents.",
  ),
  "detail.note.bodyTail": L(
    "Este documento é apresentado na sua língua original e não aprova operadores, não confere certificação e não substitui obrigações legais ou regulatórias. O BanzAI pode ajudar a explicar este documento, mas não decide, não certifica e não substitui os documentos normativos aplicáveis.",
    "This document is presented in its original language and approves no operator, confers no certification and replaces no legal or regulatory obligation. BanzAI can help explain this document, but it does not decide, does not certify and does not replace the applicable normative documents.",
  ),
  "detail.protocolState": L("Estado do protocolo: pré-produção ·", "Protocol state: pre-production ·"),
  "detail.body.unavailable": L(
    "Conteúdo completo temporariamente indisponível. Consulte o documento original no GitHub através da ligação acima.",
    "The full content is temporarily unavailable. Consult the original document on GitHub through the link above.",
  ),
  "detail.footer.1": L(
    "Para implementar o protocolo, leia este documento em conjunto com a",
    "To implement the protocol, read this document together with the",
  ),
  "detail.footer.2": L(
    ", os contratos e os invariantes aplicáveis. O BanzAI ajuda a explicar, mas não decide, não certifica e não substitui os documentos normativos aplicáveis.",
    ", the contracts and the applicable invariants. BanzAI helps explain, but it does not decide, does not certify and does not replace the applicable normative documents.",
  ),

  // The detail page asks its own question — it closes on certification rather than on operator status.
  "detail.ask.adr": L(
    "Explica o {id} em linguagem simples, destacando que é o registo canónico da decisão de arquitectura que documenta, mas que deve ser lido em conjunto com a Referência BANZA, contratos e invariantes aplicáveis para implementação. Este documento não confere certificação.",
    "Explain {id} in plain language, making clear that it is the canonical record of the architecture decision it documents, but that it must be read together with the BANZA Reference, the contracts and the invariants applicable to an implementation. This document confers no certification.",
  ),
  "detail.ask.rfc": L(
    "Explica o {id} em linguagem simples, destacando que é o registo canónico da proposta ou discussão técnica que documenta, mas que não altera por si só as regras actuais do protocolo enquanto não for aceite e reflectida nos documentos normativos aplicáveis. Este documento não confere certificação.",
    "Explain {id} in plain language, making clear that it is the canonical record of the technical proposal or discussion it documents, but that on its own it does not change the protocol's current rules until it is accepted and reflected in the applicable normative documents. This document confers no certification.",
  ),
} as const;

export type DecisionsCopyId = keyof typeof DECISIONS_COPY;

/**
 * Ids whose two editions are legitimately the same string. "ADRs" and "RFCs" are the acronyms, not
 * descriptions of them; translating them would invent a term the governance trail does not use. Declared
 * here so the completeness property can insist that EVERY OTHER id really is realized twice.
 */
export const IDENTICAL_ACROSS_EDITIONS: DecisionsCopyId[] = [
  "filter.type.adr",
  "filter.type.rfc",
  "index.chip.counts", // two counts and two acronyms — there is no word in it to translate
  "link.banzai", // the product's name
];

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

/** The long-form state shown on a record's own page. Same fact as the chip, more of it said out loud. */
export function decisionDetailStateLabel(state: string, locale: Locale): string {
  const id = `detail.state.${state}` as DecisionsCopyId;
  if (!(id in DECISIONS_COPY)) return state;
  return decisionsCopy(id, locale);
}

/** The question the record's own page asks BanzAI. Distinct from the library card's question. */
export function decisionDetailAskQuestion(type: string, id: string, locale: Locale): string {
  return decisionsCopy(type === "ADR" ? "detail.ask.adr" : "detail.ask.rfc", locale, { id });
}
