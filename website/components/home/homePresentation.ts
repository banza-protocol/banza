import type { Locale } from "@/lib/i18n";

// The home page's reader-facing copy, as one identity per fact with a realization per edition.
//
// Why this exists. The English home was written as a SEPARATE page: a different hero, a different
// composition, a different information architecture. A visitor moving between `/` and `/en` met what
// looked like two different products, which is the exact opposite of what a translated edition is for.
// The structure is now owned by one view (`HomeView`), and this file owns the only thing that may
// legitimately differ between editions — the words.
//
// Portuguese is canonical. An English entry here is a translation of the Portuguese fact beside it, never
// an opportunity to make a different claim: the same badge, the same headline role, the same three
// capability items, the same two calls to action, the same layer cards in the same order.

export type Localized = Readonly<Record<Locale, string>>;
const L = (pt: string, en: string): Localized => Object.freeze({ pt, en });

export const HOME_COPY = {
  // ── Hero ───────────────────────────────────────────────────────────────────────────────────────
  "hero.badge": L("PROTOCOLO FINANCEIRO ABERTO · v1.0", "OPEN FINANCIAL PROTOCOL · v1.0"),
  // The headline is three lines by design; the third is the emphasised one. English wraps differently
  // and that is fine — what must not change is that there are three lines and which one carries emphasis.
  "hero.title.1": L("Protocolo aberto e", "An open and"),
  "hero.title.2": L("verificável de", "verifiable protocol for"),
  "hero.title.3": L("interoperabilidade financeira.", "financial interoperability."),
  "hero.lede": L(
    "O BANZA cria uma linguagem comum para que operadores financeiros independentes interoperem através de regras públicas, conformidade demonstrável e evidência verificável — uma camada aberta que se acrescenta à interoperabilidade operacional já existente, tornando as regras, os testes e a evidência públicos e reproduzíveis por terceiros.",
    "BANZA creates a common language so that independent financial operators can interoperate through public rules, demonstrable conformance and verifiable evidence — an open layer added to the operational interoperability that already exists, making the rules, the tests and the evidence public and reproducible by third parties.",
  ),
  "hero.indicators.aria": L("O que o protocolo oferece", "What the protocol offers"),
  "hero.indicator.endpoints": L("Endpoints públicos", "Public endpoints"),
  "hero.indicator.engines": L("Motores Rust determinísticos", "Deterministic Rust engines"),
  "hero.indicator.results": L("Resultados rastreáveis por evidência", "Results traceable to evidence"),
  "hero.cta.validate": L("Validar operador no BanzAI", "Validate an operator in BanzAI"),
  "hero.cta.whitepaper": L("Ler o Whitepaper", "Read the Whitepaper"),

  // ── Hero diagram ───────────────────────────────────────────────────────────────────────────────
  "diagram.label": L("INTEROPERABILIDADE", "INTEROPERABILITY"),
  "diagram.illustrative": L("ILUSTRATIVO", "ILLUSTRATIVE"),
  "diagram.profile": L("Perfil BANZA v1.0", "BANZA Profile v1.0"),
  "diagram.profile.sub.1": L("Regras públicas", "Public rules"),
  "diagram.profile.sub.2": L("e versionadas", "and versioned"),
  "diagram.operator.a": L("Operador A", "Operator A"),
  "diagram.operator.b": L("Operador B", "Operator B"),
  "diagram.operator.c": L("Operador C", "Operator C"),
  "diagram.operator.d": L("Operador D", "Operator D"),
  // `impl. A1`, `operator.json`, `signature valid` and `trust: verified` are protocol tokens, not prose:
  // they are the same in both editions and are deliberately NOT catalogue entries.
  "diagram.message": L("mensagem", "message"),
  "diagram.caption": L(
    "Diagrama ilustrativo: operadores interoperam por regras e perfis comuns.",
    "Illustrative diagram: operators interoperate through common rules and profiles.",
  ),

  // ── Public status band ─────────────────────────────────────────────────────────────────────────
  "status.aria": L("Estado público", "Public status"),
  "status.phrase": L("Aberto. Auditável. Verificável.", "Open. Auditable. Verifiable."),

  // ── Technical registry band ────────────────────────────────────────────────────────────────────
  "registry.aria": L("Registo técnico", "Technical registry"),
  "registry.cta": L("Consultar o Registo Técnico", "Open the Technical Registry"),

  // ── Three layers band ──────────────────────────────────────────────────────────────────────────
  "layers.eyebrow": L("ARQUITECTURA · TRÊS CAMADAS", "ARCHITECTURE · THREE LAYERS"),
  "layers.title.1": L("Três camadas.", "Three layers."),
  "layers.title.2": L("Uma interface.", "One interface."),
  "layers.lede": L(
    "O BANZA separa as regras do protocolo, a certificação técnica e a operação de um scheme. O BanzAI é a interface transversal de consulta e validação; não constitui uma quarta camada.",
    "BANZA separates the protocol rules, technical certification and the operation of a scheme. BanzAI is the transversal interface for consulting and validating; it is not a fourth layer.",
  ),
  "layers.1.tag": L("Camada 1", "Layer 1"),
  "layers.1.name": L("BANZA · Protocolo", "BANZA · Protocol"),
  "layers.1.body": L(
    "Regras públicas e versionadas para perfis, contratos, schemas, identidade, discovery, metadata assinada, trust, revogação e federação. O BANZA não é banco, PSP, carteira ou operador e não movimenta fundos.",
    "Public, versioned rules for profiles, contracts, schemas, identity, discovery, signed metadata, trust, revocation and federation. BANZA is not a bank, a PSP, a wallet or an operator, and it does not move funds.",
  ),
  "layers.2.tag": L("Camada 2", "Layer 2"),
  "layers.2.name": L(
    "Certificação de Conformidade e Interoperabilidade",
    "Conformance and Interoperability Certification",
  ),
  "layers.2.body": L(
    "Avalia implementações específicas contra profiles e versões públicas através de conformidade, interoperabilidade, trust e evidência verificável. Os motores Rust determinam os resultados, e os estados técnicos podem ser publicados no Registo Técnico. Não constitui licença, admissão num esquema ou autorização regulatória.",
    "It evaluates specific implementations against public profiles and versions through conformance, interoperability, trust and verifiable evidence. The Rust engines determine the results, and the technical states may be published in the Technical Registry. It is not a licence, admission to a scheme or regulatory authorisation.",
  ),
  "layers.3.tag": L("Camada 3", "Layer 3"),
  "layers.3.name": L("Esquemas operacionais independentes", "Independent operational schemes"),
  "layers.3.body": L(
    "Esquemas construídos sobre o protocolo segundo as suas próprias regras e autorizações. O primeiro é o Esquema Operacional Banzami, com a Banzami como operadora designada do esquema — preparação regulatória em curso e pagamentos reais desactivados.",
    "Schemes built on the protocol under their own rules and authorisations. The first is the Banzami Operational Scheme, with Banzami as the designated scheme operator — regulatory preparation under way and real payments disabled.",
  ),
  "layers.note.lead": L("BanzAI — interface transversal.", "BanzAI — transversal interface."),
  "layers.note.body": L(
    " Permite consultar o protocolo, iniciar a validação técnica das implementações publicadas por operadores e interpretar os resultados. Os motores Rust executam e determinam os veredictos; o Qwen apenas explica. O BanzAI não é uma camada nem uma autoridade.",
    " It lets you consult the protocol, start the technical validation of implementations published by operators and interpret the results. The Rust engines run and determine the verdicts; Qwen only explains. BanzAI is neither a layer nor an authority.",
  ),

  // ── Status bar (HeroStatusBar) ─────────────────────────────────────────────────────────────────
  "statusbar.protocol": L("PROTOCOLO", "PROTOCOL"),
  "statusbar.lastVerified": L("última verificação pública há", "last public verification"),
  "statusbar.lastVerified.suffix": L("", " ago"),
  "statusbar.activeCertifications": L("certificações técnicas activas", "active technical certifications"),

  // ── Operator registry (OperatorRegistry) ───────────────────────────────────────────────────────
  "operators.eyebrow": L("REGISTO DE OPERADORES · PÚBLICO", "OPERATOR REGISTRY · PUBLIC"),
  "operators.title.1": L("Quem faz parte", "Who is part"),
  "operators.title.2": L("do protocolo", "of the protocol"),
  "operators.stat.certified": L("Certificados", "Certified"),
  "operators.stat.conformant": L("Em conformidade", "Conformant"),
  "operators.stat.registered": L("Operadores registados", "Registered operators"),
  "operators.empty.name": L("Sem operador", "No operator"),
  "operators.empty.id": L("registo vazio", "empty registry"),
  "operators.empty.status": L("nenhum registo publicado", "no published entry"),
  "operators.note": L(
    "Nenhum operador está certificado hoje. O registo é público e consultável sem autenticação — a entrada é verificável, não autorizada.",
    "No operator is certified today. The registry is public and readable without authentication — an entry is verifiable, not authorised.",
  ),
} as const;

export type HomeCopyId = keyof typeof HOME_COPY;

/** Realize one home fact in one edition. */
export function homeCopy(id: HomeCopyId, locale: Locale): string {
  return HOME_COPY[id][locale];
}

export function homeCopyIds(): HomeCopyId[] {
  return Object.keys(HOME_COPY) as HomeCopyId[];
}
