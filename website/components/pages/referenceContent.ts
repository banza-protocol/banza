import type { Locale } from "@/lib/i18n";

// The Reference landing page's content, one entry per edition, under a single shape.
//
// This page was authored twice and the English edition came out smaller: it was missing the third
// paragraph of the framing — the one that says conformance is demonstrated by verifiable evidence rather
// than by central human approval, and that certification, scheme admission and authorisation are three
// separate decisions — it had no "read by chapter" heading, no decisions-and-evolution band, and one
// fewer onward destination. Those are substantive protocol statements, not decoration, and an English
// reader was simply not being told them.
//
// Portuguese is canonical. The English text below is that edition's own published translation where it
// existed, and a faithful translation of the Portuguese where it did not.

export type ReferenceContent = {
  metaTitle: string;
  metaDescription: string;
  heroEyebrow: string;
  h1: string;
  lede: string;
  preProductionChip: string;
  aboutEyebrow: string;
  about: string[];
  stateEyebrow: string;
  stateLink: string;
  state: string[];
  chaptersEyebrow: string;
  chaptersTitle: string;
  fullReferenceLink: string;
  chapterLabel: string;
  decisionsEyebrow: string;
  decisionsBody: string;
  decisionsLink: string;
  continueEyebrow: string;
  /** Onward destinations, as (route or chapter identity, label). Same set and order in both editions. */
  continueLabels: string[];
  github: string;
};

export const REFERENCE_CONTENT: Record<Locale, ReferenceContent> = {
  pt: {
    metaTitle: "Referência do Protocolo",
    metaDescription:
      "A referência descritiva oficial do protocolo BANZA v1.0 (pré-produção), organizada por capítulos: arquitectura, confiança, conformidade, evidência, federação e governação. Descreve o protocolo; não confere estatuto a qualquer operador.",
    heroEyebrow: "REFERÊNCIA DO PROTOCOLO",
    h1: "Referência do Protocolo BANZA",
    lede:
      "Especificações, arquitectura, perfis, confiança, conformidade, evidência, federação e governação do protocolo BANZA — organizadas por capítulos.",
    preProductionChip: "PRÉ-PRODUÇÃO",
    aboutEyebrow: "SOBRE ESTA REFERÊNCIA",
    about: [
      "Esta é a referência descritiva oficial do protocolo BANZA. Organiza por capítulos os conceitos, regras e superfícies públicas do protocolo. As fontes canónicas e verificáveis — os contratos, os invariantes, os vectores de conformidade, a metadata assinada e a evidência publicada — definem os requisitos aplicáveis; esta referência descreve-as e organiza-as, não as substitui.",
      "Os ADRs registam decisões adoptadas e os RFCs apresentam propostas ainda em processo de governação. A Referência é autocontida — pode ser lida sem consultar outras fontes — mas remete para elas quando definem o detalhe técnico. Quando uma afirmação depende do estado actual de uma implementação, deve ser confirmada nas superfícies verificáveis apropriadas.",
      "A conformidade protocolar de uma implementação é demonstrada por evidência verificável e reproduzível, não por aprovação humana central. A certificação de uma implementação, a admissão de um operador a um esquema e a autorização para operação real são decisões institucionais distintas. Cada operador é uma entidade independente e responde pelas suas obrigações legais e regulatórias.",
    ],
    stateEyebrow: "ESTADO ACTUAL",
    stateLink: "Estado verificável em detalhe",
    state: [
      "Protocolo BANZA v1.0, em pré-produção.",
      "Zero operadores em produção — o Registo Técnico devolve uma lista vazia.",
      "Nenhuma certificação de produção; o modelo de Certificação de Conformidade e Interoperabilidade (Camada 2) está activo.",
      "Pagamentos reais desligados.",
      "A implementação de referência (Operador Zero) existe apenas em ambiente de testes, apenas de leitura.",
      "A federação de produção ainda não está activa.",
    ],
    chaptersEyebrow: "CAPÍTULOS",
    chaptersTitle: "Leia por capítulo.",
    fullReferenceLink: "Referência completa (página única)",
    chapterLabel: "CAPÍTULO",
    decisionsEyebrow: "DECISÕES E EVOLUÇÃO",
    decisionsBody:
      "O protocolo evolui por processo documentado. Os contratos, as specs e as versões publicadas determinam os requisitos aplicáveis; os ADRs registam decisões adoptadas e o seu racional; os RFCs apresentam propostas ainda sujeitas ao processo de governação. A biblioteca pública é apresentada na língua original e não substitui esta referência.",
    decisionsLink: "Ver ADRs e RFCs",
    continueEyebrow: "CONTINUAR",
    continueLabels: [
      "Estado verificável",
      "Conformidade e Certificação",
      "Confiança",
      "Recursos para Programadores",
    ],
    github: "GitHub",
  },
  en: {
    metaTitle: "Protocol Reference",
    metaDescription:
      "The official descriptive Reference for the BANZA v1.0 protocol (pre-production), organised by chapter: architecture, trust, conformance, evidence, federation and governance. It describes the protocol; it confers no status on any operator.",
    heroEyebrow: "PROTOCOL REFERENCE",
    h1: "BANZA Protocol Reference",
    lede:
      "Specifications, architecture, profiles, trust, conformance, evidence, federation and governance of the BANZA protocol — organised by chapter.",
    preProductionChip: "PRE-PRODUCTION",
    aboutEyebrow: "ABOUT THIS REFERENCE",
    about: [
      "This is the official English edition of the BANZA protocol Reference, the translation of the canonical Portuguese Reference. It organises the protocol's concepts, rules and public surfaces by chapter. The canonical, verifiable sources — the contracts, the invariants, the conformance vectors, the signed metadata and the published evidence — define the applicable requirements; this Reference describes and organises them, and does not replace them.",
      "ADRs record adopted decisions and RFCs present proposals still in governance. The Reference is self-contained — it can be read without consulting other sources — but it points to them where they define the technical detail. Where a statement depends on the current state of an implementation, it must be confirmed on the verifiable surfaces.",
      "An implementation's protocol conformance is demonstrated by verifiable, reproducible evidence, not by central human approval. Certifying an implementation, admitting an operator to a scheme and authorising real operation are three distinct institutional decisions. Each operator is an independent entity and answers for its own legal and regulatory obligations.",
    ],
    stateEyebrow: "CURRENT STATE",
    stateLink: "The verifiable state in detail",
    state: [
      "BANZA protocol v1.0, in pre-production.",
      "Zero operators in production — the Technical Registry returns an empty list.",
      "No production certification; the Conformance and Interoperability Certification model (Layer 2) is active.",
      "Real payments are switched off.",
      "The reference implementation (Operator Zero) exists only in a test environment, read-only.",
      "Production federation is not yet active.",
    ],
    chaptersEyebrow: "CHAPTERS",
    chaptersTitle: "Read by chapter.",
    fullReferenceLink: "Read on a single page",
    chapterLabel: "CHAPTER",
    decisionsEyebrow: "DECISIONS AND EVOLUTION",
    decisionsBody:
      "The protocol evolves through a documented process. The contracts, the specs and the published versions determine the applicable requirements; ADRs record adopted decisions and their rationale; RFCs present proposals still subject to the governance process. The public library is presented in its original language and does not replace this Reference.",
    decisionsLink: "See ADRs and RFCs",
    continueEyebrow: "CONTINUE",
    continueLabels: [
      "The verifiable state",
      "Conformance and Certification",
      "Trust",
      "Developer Resources",
    ],
    github: "GitHub",
  },
};
