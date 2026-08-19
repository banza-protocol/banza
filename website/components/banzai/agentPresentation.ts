// The BanzAI workspace's reader copy, in both languages, selected by explicit locale.
//
// `banzai-agent.ts` is a plain data module: exported constants and no React. No provider context
// reaches it, so a locale boundary built only around `BanzaiWorkspaceProvider` would leave the workspace's
// largest single body of reader copy outside the locale architecture while looking complete. That is the
// same shape as the two mutations that survived in Block E1.
//
// So locale enters here explicitly, as an argument to a pure function. There is no module-level current
// locale, nothing reads the pathname or the browser, and there is no `locale ?? "pt"` anywhere below the
// route boundary — a lost locale must be visible, not absorbed.
//
// SEMANTIC FACTS ARE NOT DUPLICATED. `mode`, `icon`, `key`, `group`, `href` and the L0–L4 profile ids
// stay in `banzai-agent.ts` as the single source; only the reader label is realized per locale. Copying
// a routing identity into a `pt`/`en` pair would let the two languages disagree about which tab a button
// opens, which is a different and worse bug than a bad translation.
//
// ENGLISH SOURCE. The wording follows what the repository already publishes — the EN Reference, the ADRs
// and the frozen BanzAI EN terminology — and preserves the distinctions those sources keep apart:
// an operator is not an implementation, certification is not admission and not authorisation, evidence
// is not a verdict, PASS is technical evidence, and BanzAI guides without deciding. Translating is not an
// occasion to make a claim stronger than the Portuguese makes it.

import type { Locale } from "@/lib/i18n";

/** A reader string in both supported locales. */
export type Localized = Readonly<Record<Locale, string>>;

const L = (pt: string, en: string): Localized => ({ pt, en });

/**
 * Every localized reader string the agent data module owns, keyed by semantic identity.
 *
 * Identities describe meaning (`agent.boundary`), never source position, so moving a string between
 * components does not change what it is.
 */
export const AGENT_COPY = {
  // ── identity and framing ──────────────────────────────────────────────────────────────────────
  "agent.subtitle": L(
    "Interface interactiva do protocolo · consulta, valida e orienta",
    "Interactive protocol interface · consult, validate and guide",
  ),
  "agent.assistantIntro": L(
    "Podes perguntar livremente ou colar um artefacto técnico. O BanzAI identifica o tipo de pedido e encaminha para explicação, análise ou validação técnica quando suportado. Não certifica, não aprova operadores e não substitui os motores verificáveis.",
    "You can ask freely or paste a technical artifact. BanzAI identifies the kind of request and routes it to explanation, analysis or technical validation where supported. It does not certify, does not approve operators and does not replace the verifiable engines.",
  ),
  "agent.heroText": L(
    "Orienta a implementação e ajuda a usar as ferramentas do protocolo BANZA.",
    "It guides implementation and helps you use the BANZA protocol's tools.",
  ),
  "agent.boundary": L(
    "BanzAI é a interface primária de trabalho entre humanos/operadores e o protocolo BANZA (ADR-036); em concreto, o agente do protocolo. Guia, simula, invoca ferramentas verificáveis e explica resultados com base em fontes oficiais — não aprova, não certifica, não licencia, não publica operadores, não movimenta fundos, não decide participação, não inventa regras e não cria decisões arquitecturais. A conformidade demonstra-se por evidência verificável.",
    "BanzAI is the primary working interface between humans/operators and the BANZA protocol (ADR-036); specifically, the protocol's agent. It guides, simulates, invokes verifiable tools and explains results from official sources — it does not approve, does not certify, does not license, does not publish operators, does not move funds, does not decide participation, does not invent rules and does not create architectural decisions. Conformance is demonstrated by verifiable evidence.",
  ),
  "agent.boundaryTop": L(
    "guia · invoca ferramentas · explica · não decide",
    "guides · invokes tools · explains · does not decide",
  ),
  "agent.shortPhrase": L(
    "BanzAI guia; os motores verificam; a evidência prova; a autoridade competente decide.",
    "BanzAI guides; the engines verify; the evidence proves; the competent authority decides.",
  ),
  "agent.assistantPlaceholder": L(
    "Pergunte ao BanzAI ou peça uma operação técnica…",
    "Ask BanzAI, or request a technical operation…",
  ),
  "agent.ruleSources": L(
    "Referência · ADR · RFC · Specs · Contracts · Schemas · Invariants · Engines",
    "Reference · ADR · RFC · Specs · Contracts · Schemas · Invariants · Engines",
  ),
  "agent.guiaText": L(
    "Use o BanzAI para percorrer a implementação do protocolo: preparar Manifest, validar Conformidade, verificar Interoperabilidade e Confiança, gerar Evidence Bundle e preparar a Federação. BanzAI guia; os motores Rust/WASM verificam; a evidência prova; a autoridade competente decide. BanzAI guia a implementação do protocolo existente; não cria protocolo novo.",
    "Use BanzAI to work through implementing the protocol: prepare the Manifest, validate Conformance, verify Interoperability and Trust, generate an Evidence Bundle and prepare Federation. BanzAI guides; the Rust/WASM engines verify; the evidence proves; the competent authority decides. BanzAI guides the implementation of the existing protocol; it does not create new protocol.",
  ),
  "agent.sessionNotice": L(
    "Esta sessão vive apenas no navegador. Ao recarregar a página, os dados desta jornada são limpos.",
    "This session lives only in the browser. Reloading the page clears this journey's data.",
  ),

  // ── who does what (role label is semantic; the sentence is presentation) ───────────────────────
  "whoDoesWhat.operator": L("implementa e publica evidência.", "implements and publishes evidence."),
  "whoDoesWhat.engines": L(
    "verificam (Rust/WASM determinísticos).",
    "verify (deterministic Rust/WASM).",
  ),
  "whoDoesWhat.banzai": L("guia e explica.", "guides and explains."),
  "whoDoesWhat.peers": L(
    "verificam evidência e interoperam localmente.",
    "verify evidence and interoperate locally.",
  ),
  "whoDoesWhat.governance": L(
    "mantém o protocolo e activa novas regras por RFC/ADR.",
    "maintains the protocol and activates new rules through RFC/ADR.",
  ),
  "whoDoesWhat.regulators": L(
    "tratam do enquadramento fora do protocolo.",
    "handle the framework outside the protocol.",
  ),
  "whoDoesWhat.role.operator": L("Operador", "Operator"),
  "whoDoesWhat.role.engines": L("Motores", "Engines"),
  "whoDoesWhat.role.banzai": L("BanzAI", "BanzAI"),
  "whoDoesWhat.role.peers": L("Pares", "Peers"),
  "whoDoesWhat.role.governance": L("Governança", "Governance"),
  "whoDoesWhat.role.regulators": L("Reguladores", "Regulators"),

  // ── modes and tabs (labels only; mode/icon/key/group stay in banzai-agent.ts) ──────────────────
  "mode.ask": L("Perguntar ao BanzAI", "Ask BanzAI"),
  "mode.validation": L("Validar operador", "Validate operator"),
  "mode.onboarding": L("Onboarding de operador", "Operator onboarding"),
  "tab.assistente": L("Perguntar ao BanzAI", "Ask BanzAI"),
  "tab.guia": L("Guia", "Guide"),
  "tab.rfc": L("Referência", "Reference"),
  "tab.programadores": L("Programadores", "Developers"),
  "tab.resultados": L("Resultados", "Results"),
  "link.repository": L("Repositório", "Repository"),

  // ── validation ────────────────────────────────────────────────────────────────────────────────
  "validation.header": L(
    "Validação técnica de implementação",
    "Technical validation of an implementation",
  ),
  "validation.intro": L(
    "Seleccione um operador e uma das suas implementações publicadas. A jornada avalia a implementação seleccionada através dos endpoints públicos declarados pelo operador.",
    "Select an operator and one of its published implementations. The journey evaluates the selected implementation through the public endpoints the operator declares.",
  ),
  "validation.entities": L(
    "O operador é a entidade responsável. A implementação é o sistema técnico avaliado.",
    "The operator is the responsible entity. The implementation is the technical system evaluated.",
  ),
  "validation.onlyOperatorHint": L(
    "Operador disponível para demonstração: Operador Zero",
    "Operator available for demonstration: Operator Zero",
  ),
  "validation.originNote": L(
    "Todos os artefactos são obtidos pelo backend a partir dos endpoints públicos da implementação. O Rust decide; a IA nunca decide. A Prontidão de Certificação não é um Registo de Certificação.",
    "All artifacts are fetched by the backend from the implementation's public endpoints. Rust decides; the AI never decides. Certification Readiness is not a Certification Record.",
  ),

  // ── draft tool ────────────────────────────────────────────────────────────────────────────────
  "draft.title": L("Validar rascunho", "Validate a draft"),
  "draft.subtitle": L(
    "Ferramenta local para programadores: cole ou carregue um artefacto JSON, escolha o tipo e valide o esquema/tipo/invariantes. Não avança a jornada, não produz recibo oficial, não alimenta o Evidence Bundle e nunca devolve VERIFIED nem Prontidão de Certificação.",
    "A local developer tool: paste or upload a JSON artifact, choose its type and validate the schema, type and invariants. It does not advance the journey, does not produce an official receipt, does not feed the Evidence Bundle, and never returns VERIFIED or Certification Readiness.",
  ),
  "draft.banner": L(
    "Rascunho local · não publicado · não produz evidência oficial",
    "Local draft · not published · produces no official evidence",
  ),

  // ── authority and boundaries ──────────────────────────────────────────────────────────────────
  "authority.noCertify": L(
    "BanzAI não certifica, não aprova e não emite certificados.",
    "BanzAI does not certify, does not approve and issues no certificates.",
  ),
  "authority.runsTools": L(
    "BanzAI executa ferramentas técnicas e explica resultados.",
    "BanzAI runs technical tools and explains results.",
  ),
  "authority.caDecides": L(
    "Ninguém aceita nem aprova operadores por decisão humana central; a conformidade demonstra-se por evidência verificável.",
    "No one accepts or approves operators by central human decision; conformance is demonstrated by verifiable evidence.",
  ),
  "authority.passIsEvidence": L(
    "PASS é evidência técnica, não certificado.",
    "PASS is technical evidence, not a certificate.",
  ),
  "authority.preProduction": L(
    "O estado público continua pré-produção: registo público vazio, sem evidência de operador publicada.",
    "The public state remains pre-production: the public registry is empty, with no operator evidence published.",
  ),

  // ── badges ────────────────────────────────────────────────────────────────────────────────────
  "badge.defaultEngine": L("Motor por omissão: Qwen local", "Default engine: local Qwen"),
  "badge.localInference": L("Inferência local (on-host)", "Local inference (on-host)"),
  "badge.noExternalCalls": L("Sem chamadas externas", "No external calls"),
  "badge.perAnswerState": L("Estado por resposta", "Per-answer state"),
  "badge.nonNormative": L("Não normativo", "Non-normative"),
  "badge.preProduction": L("Pré-produção do protocolo", "Protocol pre-production"),

  // ── conformance profile names (the L0–L4 ids stay semantic) ───────────────────────────────────
  "profile.L0": L("Sandbox de Protocolo", "Protocol Sandbox"),
  "profile.L1": L("Capacidade de Pagamento Central", "Core Payment Capability"),
  "profile.L2": L("Iniciação de Pagamento", "Payment Initiation"),
  "profile.L3": L("Interoperabilidade entre Operadores", "Operator-to-Operator Interoperability"),
  "profile.L4": L("Interoperabilidade Externa", "External Interoperability"),
} as const;

export type AgentCopyId = keyof typeof AGENT_COPY;

/**
 * The reader string for a semantic id, in the requested locale.
 *
 * Locale is required, not defaulted: below the route boundary a missing locale is a propagation bug and
 * must surface as one rather than quietly becoming Portuguese.
 */
export function agentCopy(id: AgentCopyId, locale: Locale): string {
  const entry = AGENT_COPY[id];
  if (!entry) throw new Error(`agentCopy: unknown semantic id "${id}"`);
  const text = entry[locale];
  if (!text) throw new Error(`agentCopy: no ${locale} realization for "${id}"`);
  return text;
}

/** Every semantic id this catalogue owns. */
export function agentCopyIds(): AgentCopyId[] {
  return Object.keys(AGENT_COPY) as AgentCopyId[];
}

/**
 * The workspace's agent presentation, realized for one locale.
 *
 * Pure: same locale in, same object out, no module state. Semantic fields (`mode`, `key`, `href`,
 * profile ids) are NOT returned here — they stay in `banzai-agent.ts`, and a consumer joins the two.
 */
export function getAgentPresentation(locale: Locale) {
  const t = (id: AgentCopyId) => agentCopy(id, locale);
  return {
    name: "BanzAI",
    subtitle: t("agent.subtitle"),
    assistantIntro: t("agent.assistantIntro"),
    heroTitle: "BanzAI",
    heroText: t("agent.heroText"),
    boundary: t("agent.boundary"),
    agentBoundaryTop: t("agent.boundaryTop"),
    shortPhrase: t("agent.shortPhrase"),
    assistantPlaceholder: t("agent.assistantPlaceholder"),
    ruleSources: t("agent.ruleSources"),
    guiaText: t("agent.guiaText"),
    sessionNotice: t("agent.sessionNotice"),
  } as const;
}
