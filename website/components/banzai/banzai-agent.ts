// BanzAI — copy, navigation and authority constants (M2.19EF2).
//
// All user-facing product copy for the single BanzAI shell lives here so it can be unit-tested (nav
// shape, required authority/boundary copy present, forbidden claims absent, outdated commands removed)
// without a DOM/WASM harness. The <BanzaiAgent/> component consumes these constants.
//
// Boundary (unchanged): BanzAI runs/explains technical tools; it does NOT certify, approve or issue
// certificates. The ask mode answers from the live, Rust-controlled banzai-api backend running local
// Qwen inference (on-host llama.cpp, reasoning disabled) reached same-origin via /banzai/ask — no
// external calls (external_model_called=false; chamadas externas: 0), nothing leaves the host. The
// validation mode + tool panels run their own deterministic Rust/WASM validators.

// M2.19G.1 (ADR-034) — the shell now has a SINGLE "Resultados" area (in-area sub-views, not separate
// sidebar tabs) and Recursos = Guia · Referência · Programadores. The per-analyser tabs
// (manifest/conformidade/trust/evidence/traces/receipts) were retired: their read-only outputs
// live under "resultados", and the paste/upload developer tooling lives under Programadores.
export type WbTab =
  | "assistente"
  | "guia"
  | "rfc"
  | "programadores"
  | "resultados";

/** The modes of the single BanzAI shell (the "Modos" sidebar group). M2.19G.3 (ADR-037) adds
 *  "onboarding" — the BanzAI-hosted operator onboarding (passwordless email-OTP login, a private
 *  Candidate Registry and .well-known origin proof). */
export type WbMode = "ask" | "validation" | "onboarding";

export type WbIcon =
  | "chat" | "medal" | "scale" | "graph" | "book" | "doc" | "route" | "code" | "info" | "terminal";

export const BANZAI_AGENT = {
  name: "BanzAI",
  // M2.14I (ADR-036) — BanzAI is the primary human-operator interface of the protocol.
  subtitle: "Interface interactiva do protocolo · consulta, valida e orienta",
  // M2.14H — the interactive tab intro: BanzAI is the entry point, the journey is optional.
  assistantIntro:
    "Podes perguntar livremente ou colar um artefacto técnico. O BanzAI identifica o tipo de pedido e encaminha para explicação, análise ou validação técnica quando suportado. Não certifica, não aprova operadores e não substitui os motores verificáveis.",
  heroTitle: "BanzAI",
  heroText:
    "Orienta a implementação e ajuda a usar as ferramentas do protocolo BANZA.",
  boundary:
    "BanzAI é a interface primária de trabalho entre humanos/operadores e o protocolo BANZA (ADR-036); em concreto, o agente do protocolo. Guia, simula, invoca ferramentas verificáveis e explica resultados com base em fontes oficiais — não aprova, não certifica, não licencia, não publica operadores, não movimenta fundos, não decide participação, não inventa regras e não cria decisões arquitecturais. A conformidade demonstra-se por evidência verificável.",
  agentBoundaryTop: "guia · invoca ferramentas · explica · não decide",
  shortPhrase: "BanzAI guia; os motores verificam; a evidência prova; a autoridade competente decide.",
  assistantPlaceholder:
    "Pergunte ao BanzAI ou peça uma operação técnica…",
} as const;

// M2.7H — "Quem faz o quê" (native protocol agent framing) rendered in the Guia panel.
export const AGENT_WHO_DOES_WHAT = [
  ["Operador", "implementa e publica evidência."],
  ["Motores", "verificam (Rust/WASM determinísticos)."],
  ["BanzAI", "guia e explica."],
  ["Pares", "verificam evidência e interoperam localmente."],
  ["Governança", "mantém o protocolo e activa novas regras por RFC/ADR."],
  ["Reguladores", "tratam do enquadramento fora do protocolo."],
] as const;

// M2.7H — the sources a BanzAI answer may draw a protocol rule from (rule provenance).
export const AGENT_RULE_SOURCES =
  "Referência · ADR · RFC · Specs · Contracts · Schemas · Invariants · Engines";

// M2.7H — the guided journey the agent accompanies, manifest → federation.
export const AGENT_GUIA_TEXT =
  "Use o BanzAI para percorrer a implementação do protocolo: preparar Manifest, validar Conformidade, verificar Interoperabilidade e Confiança, gerar Evidence Bundle e preparar a Federação. BanzAI guia; os motores Rust/WASM verificam; a evidência prova; a autoridade competente decide. BanzAI guia a implementação do protocolo existente; não cria protocolo novo.";

// M2.19EF2 — one shell, two MODES. "Perguntar ao BanzAI" (ask, the conversation) and "Validar uma
// implementação" (validation, the 9-step journey) are the "Modos" sidebar group — they switch the mode
// of the SAME shell (same header, sidebar, workspace, context panel, session). They are NOT tabs.
export const MODES: { mode: WbMode; icon: WbIcon; name: string }[] = [
  { mode: "ask", icon: "chat", name: "Perguntar ao BanzAI" },
  // M2.19G.1 (ADR-034 §4.1) — the human-facing feature is "Validar operador" (the technical object
  // evaluated remains a specific implementation published by that operator).
  { mode: "validation", icon: "medal", name: "Validar operador" },
  // M2.19G.3 (ADR-037) — BanzAI-hosted operator onboarding: passwordless email-OTP login, a private
  // Candidate Registry (recover a candidature), and .well-known origin proof. A candidate is never a
  // published operator, an active participant nor a certified entity.
  { mode: "onboarding", icon: "route", name: "Onboarding de operador" },
];

// Display metadata for EVERY WbTab (workspace header + right-panel context). `assistente` is the ask
// conversation (not a direct sidebar button — it is the ask mode's workspace). Tab KEYS are stable so
// panel wiring keeps working.
export const TAB_META: Record<WbTab, { icon: WbIcon; name: string }> = {
  assistente: { icon: "chat", name: "Perguntar ao BanzAI" },
  guia: { icon: "info", name: "Guia" },
  rfc: { icon: "doc", name: "Referência" },
  programadores: { icon: "terminal", name: "Programadores" },
  resultados: { icon: "graph", name: "Resultados" },
};

// The sidebar tabs, grouped. "resultados" = the SINGLE validation-results area (in-area sub-views);
// "recursos" = reference/help + developer tooling. The Repositório external link now lives inside
// Programadores (ADR-034 § Recursos), not in the primary nav.
export const TABS: { key: WbTab; icon: WbIcon; name: string; group: "recursos" | "resultados" }[] = [
  { key: "resultados", icon: "graph", name: "Resultados", group: "resultados" },
  { key: "guia", icon: "info", name: "Guia", group: "recursos" },
  { key: "rfc", icon: "doc", name: "Referência", group: "recursos" },
  { key: "programadores", icon: "terminal", name: "Programadores", group: "recursos" },
];

// The ONLY journey is the 9-step validation journey (see components/banzai/validationJourney.tsx). The
// legacy 7-step guided journey was removed — no numbered journey lives here anymore.

// Secondary external link (Part 1): the public protocol repository. M2.19G.1 — moved out of the primary
// nav into Programadores (rendered by ProgramadoresTools).
export const REPO_LINK = { name: "Repositório", href: "https://github.com/banza-protocol/banza" } as const;

// M2.19G.1 (ADR-034 §11) — the endpoint-originated validation terminology + required intro/result copy.
// The sidebar says "Validar operador"; the header is "Validação técnica de implementação"; results are
// phrased as the evaluation of a specific IMPLEMENTATION published by an operator — never "operador
// certificado/validado genericamente".
export const VALIDATION_COPY = {
  modeLabel: "Validar operador",
  header: "Validação técnica de implementação",
  intro:
    "Seleccione um operador e uma das suas implementações publicadas. A jornada avalia a implementação seleccionada através dos endpoints públicos declarados pelo operador.",
  entities: "O operador é a entidade responsável. A implementação é o sistema técnico avaliado.",
  onlyOperatorHint: "Operador disponível para demonstração: Operador Zero",
  originNote:
    "Todos os artefactos são obtidos pelo backend a partir dos endpoints públicos da implementação. O Rust decide; a IA nunca decide. A Prontidão de Certificação não é um Registo de Certificação.",
  // The results sentence (§11): filled with the resolved implementation/operator/profile/version/env.
  resultPhrase: (impl: string, operator: string, profile: string, version: string, environment: string) =>
    `A implementação ${impl}, publicada pelo operador ${operator}, foi avaliada para o perfil ${profile}, versão ${version}, ambiente ${environment} e âmbito indicado.`,
} as const;

// M2.19G.3 (ADR-037) — BanzAI-hosted operator onboarding copy. Onboarding is a hosted BanzAI service,
// NOT a protocol rule: the email authenticates the person, the domain confirms the origin, the endpoints
// supply the artifacts, Rust verifies. A candidate is never a published operator, an active participant
// nor a certified entity; nothing here moves funds, grants authorisation, or admits into any scheme.
export const ONBOARDING_COPY = {
  modeLabel: "Onboarding de operador",
  header: "Onboarding de operador",
  intro:
    "Registe uma candidatura para preparar a validação técnica da sua implementação. A autenticação é sem palavra-passe: recebe um código de acesso no seu email. A candidatura fica guardada e pode ser recuperada a qualquer momento com o mesmo email.",
  boundary:
    "Uma candidatura não é um operador publicado, um participante activo nem uma entidade certificada. O onboarding é um serviço do BanzAI, não uma regra do protocolo: o email autentica a pessoa, o domínio confirma a origem, os endpoints fornecem os artefactos e o Rust verifica. Não movimenta fundos, não concede autorização regulatória e não admite em nenhum scheme.",
  scope: "Âmbito inicial: Angola (AOA). Sem recolha de dados de jurisdição neste passo.",
  paths: {
    published: { title: "Consultar operador publicado", desc: "Ver o registo técnico público e as implementações de referência." },
    submit: { title: "Submeter novo operador", desc: "Criar uma candidatura e declarar a implementação e a sua origem canónica." },
    recover: { title: "Continuar candidatura", desc: "Recuperar uma candidatura existente com o email já verificado." },
  },
  email: {
    label: "Email institucional",
    placeholder: "operador@exemplo.ao",
    cta: "Enviar código de acesso",
    hint: "Enviamos um código de 6 dígitos, válido por alguns minutos e de uso único. Nunca pedimos palavra-passe.",
  },
  otp: {
    label: "Código de acesso",
    placeholder: "000000",
    cta: "Confirmar código",
    resend: "Reenviar código",
    hint: "Introduza o código de 6 dígitos que enviámos para o seu email.",
  },
  origin: {
    title: "Prova de controlo da origem canónica",
    intro:
      "Publique o documento abaixo em .well-known no domínio canónico da implementação. O backend obtém-no de forma segura e o Rust confirma o controlo da origem.",
    verifyCta: "Verificar origem",
    verified: "Origem verificada — controlo do domínio canónico confirmado.",
  },
  sessionNotice:
    "A sua candidatura fica guardada no Registo de Candidaturas privado. A sessão é protegida por um cookie de sessão; termine sessão para a encerrar.",
} as const;

// M2.19G.1 (ADR-034 §17) — the developer draft tool copy. A draft result is LOCAL, non-authoritative,
// never evidence, never a step verdict, never Certification Readiness.
export const DRAFT_COPY = {
  title: "Validar rascunho",
  subtitle:
    "Ferramenta local para programadores: cole ou carregue um artefacto JSON, escolha o tipo e valide o esquema/tipo/invariantes. Não avança a jornada, não produz recibo oficial, não alimenta o Evidence Bundle e nunca devolve VERIFIED nem Prontidão de Certificação.",
  banner: "Rascunho local · não publicado · não produz evidência oficial",
  resultLabel: "DRAFT_VALIDATION_RESULT",
} as const;

// Discreet notice (Part 8): the journey session is in-memory only and cleared on reload.
export const SESSION_NOTICE =
  "Esta sessão vive apenas no navegador. Ao recarregar a página, os dados desta jornada são limpos.";

export const BADGES = ["Motor por omissão: Qwen local", "Inferência local (on-host)", "Sem chamadas externas", "Estado por resposta", "Não normativo", "Pré-produção do protocolo"] as const;

// Required authority/boundary copy (must appear somewhere in the Workbench).
export const AUTHORITY_COPY = {
  noCertify: "BanzAI não certifica, não aprova e não emite certificados.",
  runsTools: "BanzAI executa ferramentas técnicas e explica resultados.",
  caDecides: "Ninguém aceita nem aprova operadores por decisão humana central; a conformidade demonstra-se por evidência verificável.",
  passIsEvidence: "PASS é evidência técnica, não certificado.",
  preProduction:
    "O estado público continua pré-produção: registo público vazio, sem evidência de operador publicada.",
} as const;

// Claims that must NEVER appear in Workbench copy (asserted by the unit test).
export const FORBIDDEN_PHRASES = [
  "A IA explica a verdade",
  "Sistema de Conhecimento do Protocolo",
  "certificado emitido",
  "aprovação automática",
  "certificação automática",
  "IA certificadora",
  "BanzAI decide",
  "pip install banza-conformance",
  // BX1.8A — BANZA is an open protocol, not a PSP/licensed operator. These affirmative "BANZA <verb>"
  // claims never appear in the Workbench copy (a negated form carries "não" between the subject and the
  // verb, so it is not a substring match). Object-only terms (e.g. "federação activa", "pagamento real")
  // are checked by tools/check-regulatory-claims.sh, which allows clearly negated copy.
  "BANZA precisa de licença",
  "BANZA é PSP",
  "BANZA é prestador de serviços de pagamento",
  "BANZA processa pagamentos",
  "BANZA liquida pagamentos",
  "BANZA movimenta fundos",
  "BANZA detém fundos",
  "BANZA autoriza operadores",
  "protocolo técnico",
  // M2.0A — open financial protocol identity: the Workbench never frames BANZA as something that could
  // BECOME a financial operator/PSP, nor as an operator itself. Affirm the permanent identity instead.
  "BANZA é operador financeiro",
  "BANZA operador financeiro",
  "BANZA vira operador",
  "BANZA vira PSP",
  "transformar BANZA em operador",
  "BANZA como operador financeiro",
  // M2.5 — public product surfaces present only the active open-protocol model. No certification-of-
  // operator framing, no production certificates, no central CA on any public/operator-tool surface.
  "operador certificado",
  "operadores certificados",
  "certificado de produção",
  "certificação de operador",
  "BANZA CA",
  "Assistente de Certificação",
] as const;

// ── Per-tab content (copy + clearly-marked demo/skeleton) ────────────────────

// Task-oriented suggestions — broad operational duration/metric demonstrators (ADR-036), not
// certification-as-goal. They exercise the operational telemetry answers: total journey duration,
// the slowest step, and a run-over-run comparison. The values are always measured server-side and
// rendered by the shell's typed duration block; these are questions, never claims.
export const AGENT_SUGGESTIONS = [
  "Quanto tempo leva uma jornada completa de validação?",
  "Qual a etapa mais lenta da validação e quanto demora?",
  "Compara a duração da última execução com a anterior.",
];

export const CONFORMIDADE_LEVELS = [
  { id: "L0", name: "Sandbox de Protocolo" },
  { id: "L1", name: "Capacidade de Pagamento Central" },
  { id: "L2", name: "Iniciação de Pagamento" },
  { id: "L3", name: "Interoperabilidade entre Operadores" },
  { id: "L4", name: "Interoperabilidade Externa" },
];

// Active trust model (M2.5) — signed protocol metadata, delegated signing keys, public registry, revocation.
export const TRUST_CARDS = [
  { title: "Validar signed protocol metadata", q: "O que é signed protocol metadata e como se valida no protocolo BANZA?" },
  { title: "Verificar delegated signing key", q: "O que são delegated signing keys e como se verificam no protocolo BANZA?" },
  { title: "Verificar o Registo Técnico", q: "O que é o Registo Técnico do protocolo BANZA?" },
  { title: "Verificar revogação e fecho por omissão", q: "Como funciona a revogação e o fecho por omissão no trust do protocolo BANZA?" },
];

export const EVIDENCE_CONTENT = [
  "Manifesto do operador",
  "Relatório de conformidade",
  "Verificação de confiança (trust)",
  "Relatório de trace",
  "Hashes das ferramentas e dos inputs",
  "Citações da referência",
];

export const RFC_DOCS = [
  { id: "ADR-001", title: "Hierarquia BANZA / BanzAI / Operadores", q: "Explica o ADR-001 — a hierarquia BANZA / BanzAI / Operadores" },
  { id: "ADR-036", title: "BanzAI — interface primária", q: "Explica o ADR-036 — o BanzAI como interface primária humano-operador" },
  { id: "ADR-030", title: "Evidência e conformidade", q: "Explica o ADR-030 — evidência e conformidade" },
  { id: "ADR-025", title: "Confiança e chaves", q: "Explica o ADR-025 — confiança e chaves" },
  { id: "ADR-038", title: "Rust-first para engines oficiais", q: "Explica o ADR-038 — a política Rust-first" },
  { id: "RFCs", title: "RFCs do protocolo", q: "Quais são as RFCs do protocolo BANZA?" },
];

export const PROTOCOL_MAP_NODES: { id: string; role: string; q: string }[] = [
  { id: "BANZA", role: "Protocolo aberto", q: "O que é o protocolo BANZA?" },
  { id: "Governança", role: "ADRs / RFCs", q: "Como funciona a governança do protocolo BANZA?" },
  { id: "Protocol Governance", role: "Mantém o protocolo; não autoriza operadores", q: "Como funciona a governação do protocolo BANZA sem autoridade central?" },
  { id: "BanzAI", role: "Ferramentas e conhecimento", q: "O que é o BanzAI?" },
  { id: "Conformidade", role: "Evidência PASS", q: "O que é a conformidade no protocolo BANZA?" },
  { id: "Federação", role: "Interoperabilidade", q: "Como funciona a federação entre operadores?" },
  { id: "Operadores", role: "Implementam o protocolo", q: "O que é um operador no protocolo BANZA?" },
  { id: "Clientes", role: "Usam os operadores", q: "Qual o papel dos clientes no protocolo BANZA?" },
];

export const TRACE_FLOW = ["Pedido", "trace_id", "ledger", "obrigação", "evento", "evidência"];

// Programadores — Rust-first commands (no outdated pip install; ADR-038).
export const DEV_COMMANDS = [
  "banza-conformance-rs run-live",
  "banza-trust ceremony-check",
];
export const DEV_ENDPOINTS = ["GET /health", "GET /.well-known/banza/operator.json"];
export const DEV_QUESTIONS = [
  "O que é operator manifest?",
  "Que campos são obrigatórios no manifest?",
  "Manifesto válido significa compatibilidade demonstrada?",
  "Como executar conformidade L0 com banza-conformance-rs?",
];
