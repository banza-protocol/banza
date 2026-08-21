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

  // Shell chrome that had no owner at all and rendered Portuguese on the English surface, beside English
  // suggestions and an English composer. Small labels, but a reader reads them.
  "shell.hideInspector": L("Ocultar inspetor", "Hide inspector"),
  "shell.send": L("Enviar", "Send"),

  // Sidebar and inspector section dividers. These were uppercase Portuguese literals inline in the shell,
  // so the English reader navigated an English app through Portuguese signposts — MODOS above "Ask BanzAI",
  // RECURSOS above "Guide". They are rendered uppercase by the component; the copy is written normally so
  // each edition can be read on its own.
  "section.modes": L("Modos", "Modes"),
  "section.results": L("Resultados", "Results"),
  "section.resources": L("Recursos", "Resources"),
  "section.sourcesAndContext": L("Fontes e contexto", "Sources and context"),
  "section.boundary": L("Fronteira", "Boundary"),
  "section.state": L("Estado", "State"),
  "shell.showInspector": L("Mostrar inspetor", "Show inspector"),
  "shell.continue": L("CONTINUAR", "CONTINUE"),
  "shell.clearConversation": L("Limpar conversa", "Clear conversation"),
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
  "answerBadge.operationalMeasurement": L(
    "MEDIÇÃO OPERACIONAL",
    "OPERATIONAL MEASUREMENT",
  ),
  "answerBadge.insufficientMeasurements": L(
    "SEM MEDIÇÕES SUFICIENTES",
    "NOT ENOUGH MEASUREMENTS",
  ),
  "answerBadge.safeRefusal": L(
    "RECUSA SEGURA",
    "SAFE REFUSAL",
  ),
  "answerBadge.serviceUnavailable": L(
    "SERVIÇO INDISPONÍVEL",
    "SERVICE UNAVAILABLE",
  ),
  "answerBadge.insufficientEvidence": L(
    "EVIDÊNCIA INSUFICIENTE",
    "INSUFFICIENT EVIDENCE",
  ),
  "section.whoDoesWhat": L(
    "QUEM FAZ O QUÊ",
    "WHO DOES WHAT",
  ),
  "section.ruleProvenance": L(
    "PROVENIÊNCIA DAS REGRAS",
    "PROVENANCE OF THE RULES",
  ),
  "section.decisionsAndRfcs": L(
    "DECISÕES E RFCs",
    "DECISIONS AND RFCs",
  ),
  "section.startHere": L(
    "COMEÇAR POR AQUI",
    "START HERE",
  ),
  "section.citations": L(
    "CITAÇÕES",
    "CITATIONS",
  ),
  "section.validationJourney": L(
    "JORNADA DE VALIDAÇÃO",
    "VALIDATION JOURNEY",
  ),
  "section.validationContext": L(
    "CONTEXTO DA VALIDAÇÃO",
    "VALIDATION CONTEXT",
  ),
  "rfc.intro": L(
    "ADRs, RFCs e o mapa do protocolo. Cada cartão pergunta ao BanzAI, que responde com base nas fontes locais.",
    "ADRs, RFCs and the protocol map. Each card asks BanzAI, which answers from the local sources.",
  ),
  "answer.truncated": L(
    "Resposta resumida para caber no limite actual. Peça detalhes por secção.",
    "Answer shortened to fit the current limit. Ask for detail section by section.",
  ),
  "doc.notFound": L(
    "Documento não encontrado",
    "Document not found",
  ),
  "input.hint": L(
    "Enter para enviar · Shift+Enter para nova linha",
    "Enter to send · Shift+Enter for a new line",
  ),
  "validation.selectHint": L(
    "Seleccione um operador e uma das suas implementações publicadas para activar a jornada. O contexto da validação aparece aqui depois da selecção.",
    "Select an operator and one of its published implementations to activate the journey. The validation context appears here after the selection.",
  ),
  "citations.empty": L(
    "As citações aparecerão aqui quando o BanzAI responder.",
    "Citations will appear here once BanzAI answers.",
  ),
  "agent.whatItIs": L(
    "BanzAI é o agente IA do protocolo BANZA. Responde com base nas fontes locais do protocolo, não certifica, não aprova operadores, não emite licenças e não substitui a governação do protocolo.",
    "BanzAI is the BANZA protocol's AI agent. It answers from the protocol's local sources; it does not certify, does not approve operators, does not issue licences and does not replace the protocol's governance.",
  ),
  "agent.noCentralApproval": L(
    "Ninguém aceita nem aprova operadores por decisão humana central. PASS é evidência verificável de conformidade, não certificado.",
    "No one accepts or approves operators by central human decision. PASS is verifiable evidence of conformance, not a certificate.",
  ),
  "thinking.consultingReference": L(
    "A consultar a referência…",
    "Consulting the reference…",
  ),
  "thinking.crossingSources": L(
    "A cruzar fontes verificáveis…",
    "Cross-checking verifiable sources…",
  ),
  "assistant.prompt": L(
    "Faça perguntas sobre a referência, a jornada de validação e os artefactos técnicos. Os motores verificam. A evidência prova. A autoridade competente decide.",
    "Ask about the reference, the validation journey and the technical artifacts. The engines verify. The evidence proves. The competent authority decides.",
  ),
  "duration.version": L(
    "Versão",
    "Version",
  ),
  "duration.implementation": L(
    "Implementação",
    "Implementation",
  ),
  "duration.period": L(
    "Período",
    "Period",
  ),
  "duration.observed": L(
    "Duração observada",
    "Observed duration",
  ),
  "duration.last": L(
    "Última",
    "Last",
  ),
  "duration.mean": L(
    "Média",
    "Mean",
  ),
  "duration.min": L(
    "Mínimo",
    "Minimum",
  ),
  "duration.max": L(
    "Máximo",
    "Maximum",
  ),
  "duration.comparableRuns": L(
    "Execuções comparáveis:",
    "Comparable runs:",
  ),
  "duration.maxSuffix": L(
    "máx",
    "max",
  ),
  "guia.askImplement": L(
    "Como implemento o protocolo BANZA e demonstro conformidade por evidência verificável?",
    "How do I implement the BANZA protocol and demonstrate conformance through verifiable evidence?",
  ),
  "nav.context": L(
    "Contexto da navegação",
    "Navigation context",
  ),
  "nav.open": L(
    "Abrir navegação",
    "Open navigation",
  ),
  "nav.sidebar": L(
    "Navegação lateral do BanzAI",
    "BanzAI side navigation",
  ),
  "nav.expand": L(
    "Expandir navegação",
    "Expand navigation",
  ),
  "nav.collapse": L(
    "Colapsar navegação",
    "Collapse navigation",
  ),
  "nav.close": L(
    "Fechar navegação",
    "Close navigation",
  ),
  "nav.label": L(
    "Navegação do BanzAI",
    "BanzAI navigation",
  ),
  "ask.whatsTheDifference": L(
    "qual a diferença?",
    "what is the difference?",
  ),
  "engine.byDefault": L(
    "por omissão",
    "by default",
  ),
  "engine.default": L(
    "Motor por omissão: Qwen local (on-host) · sem chamadas externas · estado por resposta",
    "Engine by default: local Qwen (on-host) · no external calls · state reported per answer",
  ),
  "engine.external": L(
    "Motor: modelo externo utilizado nesta resposta · fora do host",
    "Engine: an external model was used for this answer · off-host",
  ),
  "engine.degraded": L(
    "Motor: degradado — modelo local indisponível nesta resposta · resposta pelo caminho determinístico/fundamentado",
    "Engine: degraded — the local model was unavailable for this answer · answered through the deterministic/grounded path",
  ),
  "engine.unreported": L(
    "Motor: estado por confirmar nesta resposta · não normativo",
    "Engine: state unconfirmed for this answer · non-normative",
  ),
  "engine.confirmed": L(
    "Motor: {name} · sem chamadas externas · confirmado nesta resposta",
    "Engine: {name} · no external calls · confirmed for this answer",
  ),
  "engine.localQwen": L(
    "Qwen local (on-host)",
    "local Qwen (on-host)",
  ),
  "session.reset": L(
    "Reiniciar sessão",
    "Restart session",
  ),
  "doc.viewDecision": L(
    "Ver decisão",
    "View decision",
  ),
  "doc.viewConsequences": L(
    "Ver consequências",
    "View consequences",
  ),
  "inspector.validationContext": L(
    "Inspetor · contexto da validação",
    "Inspector · validation context",
  ),
  "results.liveHere": L(
    "Os resultados da validação de operador vivem aqui, com origem nos endpoints públicos da implementação.",
    "The operator validation results live here, originating at the implementation's public endpoints.",
  ),
  "tools.intro": L(
    "Referência e ferramentas do protocolo. Use os cartões para perguntar ao BanzAI ou abrir a validação de operador.",
    "Protocol reference and tools. Use the cards to ask BanzAI or to open operator validation.",
  ),
  "runtime.unconfirmed": L(
    "estado não confirmado",
    "state unconfirmed",
  ),
  "thinking.composingAnswer": L("A compor a resposta…", "Composing the answer…"),
  "thinking.validatingBoundaries": L("A validar as fronteiras…", "Validating the boundaries…"),
  "thinking.preparingSources": L("A preparar as fontes…", "Preparing the sources…"),
  "duration.type": L("Tipo", "Type"),
  "duration.profile": L("Perfil", "Profile"),
  "duration.environment": L("Ambiente", "Environment"),
  "duration.median": L("mediana", "median"),
  "duration.perStep": L("POR ETAPA", "PER STEP"),
  "duration.aria": L("Medição operacional", "Operational measurement"),
  "sources.heading": L("FONTES USADAS", "SOURCES USED"),
  "sources.aria": L("Fontes usadas", "Sources used"),
  "tp.heading": L("TRANSPARÊNCIA DA RESPOSTA", "ANSWER TRANSPARENCY"),
  "tp.limitations": L("LIMITAÇÕES", "LIMITATIONS"),
  "tp.row.claims": L("ALEGAÇÕES", "CLAIMS"),
  "tp.row.environment": L("AMBIENTE", "ENVIRONMENT"),
  "tp.row.sample": L("AMOSTRA", "SAMPLE"),
  "tp.row.artifact": L("ARTEFACTO", "ARTIFACT"),
  "tp.row.authority": L("AUTORIDADE", "AUTHORITY"),
  "tp.row.confidence": L("CONFIANÇA", "CONFIDENCE"),
  "tp.row.totalDuration": L("DURAÇÃO TOTAL", "TOTAL DURATION"),
  "tp.row.entity": L("ENTIDADE", "ENTITY"),
  "tp.row.family": L("FAMÍLIA", "FAMILY"),
  "tp.row.sources": L("FONTES", "SOURCES"),
  "tp.row.implementation": L("IMPLEMENTAÇÃO", "IMPLEMENTATION"),
  "tp.row.intent": L("INTENÇÃO", "INTENT"),
  "tp.row.interpretedAs": L("INTERPRETADO COMO", "INTERPRETED AS"),
  "tp.row.model": L("MODELO", "MODEL"),
  "tp.row.engine": L("MOTOR", "ENGINE"),
  "tp.row.method": L("MÉTODO DE CÁLCULO", "COMPUTATION METHOD"),
  "tp.row.observedAt": L("OBSERVADO EM", "OBSERVED AT"),
  "tp.row.canonicalOrigin": L("ORIGEM CANÓNICA", "CANONICAL ORIGIN"),
  "tp.row.profile": L("PERFIL", "PROFILE"),
  "tp.row.period": L("PERÍODO", "PERIOD"),
  "tp.row.sha256": L("SHA-256", "SHA-256"),
  "tp.row.subIntents": L("SUB-INTENÇÕES", "SUB-INTENTS"),
  "tp.row.answerType": L("TIPO DE RESPOSTA", "ANSWER TYPE"),
  "tp.row.validation": L("VALIDAÇÃO", "VALIDATION"),
  "tp.row.claimVerification": L("VERIFICAÇÃO DE ALEGAÇÕES", "CLAIM VERIFICATION"),
  "tp.row.citationVerification": L("VERIFICAÇÃO DE CITAÇÕES", "CITATION VERIFICATION"),
  "tp.row.version": L("VERSÃO", "VERSION"),
  "tp.row.engineVersion": L("VERSÃO DO MOTOR", "ENGINE VERSION"),
  "tp.row.scope": L("ÂMBITO", "SCOPE"),
  "tp.model.called": L("chamado (local)", "called (local)"),
  "tp.model.notCalled": L("sem chamada", "not called"),
  "tp.validation.rejected": L("rejeitada", "rejected"),
  "tp.validation.passed": L("aprovada", "passed"),
  "tp.validation.notApplicable": L("não aplicável", "not applicable"),
  "dev.title": L("Programadores", "Developers"),
  "dev.intro": L("Ferramentas e referência para quem implementa o protocolo. A validação oficial de operador é sempre com origem nos endpoints públicos; aqui vivem as ferramentas locais de rascunho e a referência técnica.", "Tools and reference for those implementing the protocol. Official operator validation always originates at the public endpoints; what lives here is the local draft tooling and the technical reference."),
  "dev.section.tools": L("FERRAMENTAS", "TOOLS"),
  "dev.section.commands": L("COMANDOS (RUST-FIRST)", "COMMANDS (RUST-FIRST)"),
  "dev.section.publicEndpoints": L("ENDPOINTS PÚBLICOS", "PUBLIC ENDPOINTS"),
  "dev.section.faq": L("PERGUNTAS FREQUENTES", "FREQUENTLY ASKED QUESTIONS"),
  "dev.section.repository": L("REPOSITÓRIO", "REPOSITORY"),
  "dev.opensNewTab": L("abre numa nova aba", "opens in a new tab"),
  "starter.journeyDuration": L(
    "Quanto tempo leva uma jornada completa de validação?",
    "How long does a full validation journey take?",
  ),
  "starter.slowestStep": L(
    "Qual a etapa mais lenta da validação e quanto demora?",
    "Which validation step is the slowest, and how long does it take?",
  ),
  "starter.compareRuns": L(
    "Compara a duração da última execução com a anterior.",
    "Compare the duration of the last run with the previous one.",
  ),
  "rfcCard.adr001.title": L(
    "Hierarquia BANZA / BanzAI / Operadores",
    "BANZA / BanzAI / Operators hierarchy",
  ),
  "rfcCard.adr001.q": L(
    "Explica o ADR-001 — a hierarquia BANZA / BanzAI / Operadores",
    "Explain ADR-001 — the BANZA / BanzAI / Operators hierarchy",
  ),
  "rfcCard.adr036.title": L(
    "BanzAI — interface primária",
    "BanzAI — the primary interface",
  ),
  "rfcCard.adr036.q": L(
    "Explica o ADR-036 — o BanzAI como interface primária humano-operador",
    "Explain ADR-036 — BanzAI as the primary human-operator interface",
  ),
  "rfcCard.adr030.title": L(
    "Evidência e conformidade",
    "Evidence and conformance",
  ),
  "rfcCard.adr030.q": L(
    "Explica o ADR-030 — evidência e conformidade",
    "Explain ADR-030 — evidence and conformance",
  ),
  "rfcCard.adr025.title": L(
    "Confiança e chaves",
    "Trust and keys",
  ),
  "rfcCard.adr025.q": L(
    "Explica o ADR-025 — confiança e chaves",
    "Explain ADR-025 — trust and keys",
  ),
  "rfcCard.adr038.title": L(
    "Rust-first para engines oficiais",
    "Rust-first for the official engines",
  ),
  "rfcCard.adr038.q": L(
    "Explica o ADR-038 — a política Rust-first",
    "Explain ADR-038 — the Rust-first policy",
  ),
  "rfcCard.rfcs.title": L(
    "RFCs do protocolo",
    "Protocol RFCs",
  ),
  "rfcCard.rfcs.q": L(
    "Quais são as RFCs do protocolo BANZA?",
    "What are the BANZA protocol's RFCs?",
  ),
  "mapNode.banza.role": L(
    "Protocolo aberto",
    "Open protocol",
  ),
  "mapNode.banza.q": L(
    "O que é o protocolo BANZA?",
    "What is the BANZA protocol?",
  ),
  "mapNode.governanca.id": L(
    "Governança",
    "Governance",
  ),
  "mapNode.governanca.role": L(
    "ADRs / RFCs",
    "ADRs / RFCs",
  ),
  "mapNode.governanca.q": L(
    "Como funciona a governança do protocolo BANZA?",
    "How does the BANZA protocol's governance work?",
  ),
  "mapNode.protocolGovernance.role": L(
    "Mantém o protocolo; não autoriza operadores",
    "Maintains the protocol; authorises no operator",
  ),
  "mapNode.protocolGovernance.q": L(
    "Como funciona a governação do protocolo BANZA sem autoridade central?",
    "How does BANZA protocol governance work without a central authority?",
  ),
  "mapNode.banzai.role": L(
    "Ferramentas e conhecimento",
    "Tools and knowledge",
  ),
  "mapNode.banzai.q": L(
    "O que é o BanzAI?",
    "What is BanzAI?",
  ),
  "mapNode.conformidade.id": L(
    "Conformidade",
    "Conformance",
  ),
  "mapNode.conformidade.role": L(
    "Evidência PASS",
    "PASS evidence",
  ),
  "mapNode.conformidade.q": L(
    "O que é a conformidade no protocolo BANZA?",
    "What is conformance in the BANZA protocol?",
  ),
  "mapNode.federacao.id": L(
    "Federação",
    "Federation",
  ),
  "mapNode.federacao.role": L(
    "Interoperabilidade",
    "Interoperability",
  ),
  "mapNode.federacao.q": L(
    "Como funciona a federação entre operadores?",
    "How does federation between operators work?",
  ),
  "mapNode.operadores.id": L(
    "Operadores",
    "Operators",
  ),
  "mapNode.operadores.role": L(
    "Implementam o protocolo",
    "They implement the protocol",
  ),
  "mapNode.operadores.q": L(
    "O que é um operador no protocolo BANZA?",
    "What is an operator in the BANZA protocol?",
  ),
  "mapNode.clientes.id": L(
    "Clientes",
    "Clients",
  ),
  "mapNode.clientes.role": L(
    "Usam os operadores",
    "They use the operators",
  ),
  "mapNode.clientes.q": L(
    "Qual o papel dos clientes no protocolo BANZA?",
    "What is the role of clients in the BANZA protocol?",
  ),
  "devQuestion.manifest": L(
    "O que é operator manifest?",
    "What is an operator manifest?",
  ),
  "devQuestion.requiredFields": L(
    "Que campos são obrigatórios no manifest?",
    "Which manifest fields are required?",
  ),
  "devQuestion.validMeaning": L(
    "Manifesto válido significa compatibilidade demonstrada?",
    "Does a valid manifest mean compatibility has been demonstrated?",
  ),
  "devQuestion.runL0": L(
    "Como executar conformidade L0 com banza-conformance-rs?",
    "How do I run L0 conformance with banza-conformance-rs?",
  ),
  "link.repositoryName": L(
    "Repositório",
    "Repository",
  ),
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
