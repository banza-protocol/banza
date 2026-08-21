import type { Locale } from "@/lib/i18n";

// Reader copy for the editorial pages, one identity per fact with a realization per edition.
//
// These pages were authored twice — a Portuguese file and an English file, each with its own JSX. They
// looked similar, which is exactly why the divergences survived: Federation offered a Portuguese reader
// four onward destinations and an English reader three, and two of the three were different pages.
// Nothing compared them, so nobody noticed.
//
// Portuguese is canonical. The English entries here are the translations those pages already carried —
// they were good translations of the text; what was missing was that the two editions be the same page.
// The structure now lives in one view per page, and the only thing that varies is what is written here.

export type Localized = Readonly<Record<Locale, string>>;
const L = (pt: string, en: string): Localized => Object.freeze({ pt, en });

export const EDITORIAL_COPY = {
  // ── Federation ─────────────────────────────────────────────────────────────────────────────────
  "federation.meta.title": L("Federação", "Federation"),
  "federation.meta.description": L(
    "A federação BANZA permite descoberta e verificação técnica através de regras e perfis comuns, reduzindo a necessidade de reconstruir integrações técnicas bilaterais entre cada par de participantes. Contratos, participação, risco, liquidação, responsabilidades e autorização permanecem no domínio aplicável. A federação de produção não está activa em pré-produção.",
    "BANZA federation enables technical discovery and verification through common rules and profiles, reducing the need to rebuild bilateral technical integrations between every pair of participants. Contracts, participation, risk, settlement, responsibilities and authorisation remain in the applicable domain. Production federation is not active in pre-production.",
  ),
  "federation.eyebrow": L("FEDERAÇÃO", "FEDERATION"),
  "federation.title": L(
    "Interoperar por evidência, não por integração bilateral.",
    "Interoperate by evidence, not by bilateral integration.",
  ),
  "federation.lede": L(
    "A federação permite descoberta e verificação técnica através de regras e perfis comuns, reduzindo a necessidade de reconstruir integrações técnicas bilaterais entre cada par de participantes. Não é uma rede automática de pagamentos reais nem dispensa contratos, responsabilidades ou autorização.",
    "Federation enables technical discovery and verification through common rules and profiles, reducing the need to rebuild bilateral technical integrations between every pair of participants. It is not an automatic real-payments network, and it does not remove the need for contracts, responsibilities or authorisation.",
  ),
  "federation.chip.1": L("POR EVIDÊNCIA PUBLICADA", "BY PUBLISHED EVIDENCE"),
  "federation.chip.2": L("AVALIAÇÃO ABERTA DE CONFIANÇA", "OPEN TRUST EVALUATION"),
  "federation.chip.3": L("FEDERAÇÃO DE PRODUÇÃO NÃO ACTIVA", "PRODUCTION FEDERATION NOT ACTIVE"),

  "federation.what.eyebrow": L("O QUE É A FEDERAÇÃO", "WHAT FEDERATION IS"),
  "federation.what.p1": L(
    "Federação é a avaliação técnica, local e por interacção, das condições para o encaminhamento de pagamentos entre operadores independentes — estabelecida por evidência publicada e verificável e pela Avaliação Aberta de Confiança sobre metadata assinada, e não pela reconstrução da mesma integração técnica bilateral por cada par de operadores. É por isso que a interoperabilidade cresce sem que cada participante tenha de reconstruir a mesma integração técnica com todos os outros.",
    "Federation is the technical, local, per-interaction evaluation of the conditions for routing payments between independent operators — established by published, verifiable evidence and by Open Trust Evaluation over signed metadata, rather than by each pair of operators rebuilding the same bilateral technical integration. That is why interoperability can grow without every participant having to rebuild the same technical integration with every other one.",
  ),
  "federation.what.p2": L(
    "Isto é uma propriedade técnica do protocolo — descoberta e verificação por regras e perfis comuns. Não é «sem intermediários», «sem aprovação» nem uma rede que liga pagamentos reais por si só.",
    "This is a technical property of the protocol — discovery and verification through common rules and profiles. It is not “without intermediaries”, not “without approval”, and not a network that connects real payments by itself.",
  ),

  "federation.requires.eyebrow": L("O QUE A FEDERAÇÃO EXIGE", "WHAT FEDERATION REQUIRES"),
  "federation.requires.lede": L(
    "Encaminhar para um par não é automático: cada condição é verificável e todas têm de se verificar. Em pré-produção, a federação de produção não está activa.",
    "Routing to a peer is not automatic: every condition is verifiable, and all of them must hold. In pre-production, production federation is not active.",
  ),
  "federation.requires.1.t": L("Âmbito de conformidade aplicável", "Applicable conformance scope"),
  "federation.requires.1.b": L(
    "A implementação demonstra o âmbito de conformidade exigido para a rota pretendida.",
    "The implementation demonstrates the conformance scope required for the intended route.",
  ),
  "federation.requires.2.t": L("Metadata e evidência válidas e frescas", "Valid and fresh metadata and evidence"),
  "federation.requires.2.b": L(
    "Signed Protocol Metadata e evidência verificáveis, dentro da janela de frescura.",
    "Verifiable Signed Protocol Metadata and evidence, within the freshness window.",
  ),
  "federation.requires.3.t": L("Ausência da Revocation List", "Absence from the Revocation List"),
  "federation.requires.3.b": L(
    "Chaves e artefactos não constam da lista de revogação assinada (verificada com fecho por omissão).",
    "Keys and artifacts do not appear on the signed revocation list (checked closed by default).",
  ),
  "federation.requires.4.t": L("Condições de produção", "Production conditions"),
  "federation.requires.4.b": L(
    "As condições públicas de produção estão satisfeitas — o que não acontece em pré-produção.",
    "The public production conditions are satisfied — which is not the case in pre-production.",
  ),

  "federation.remains.eyebrow": L("O QUE PERMANECE NO DOMÍNIO APLICÁVEL", "WHAT REMAINS IN THE APPLICABLE DOMAIN"),
  "federation.remains.lede": L(
    "A federação técnica reduz o trabalho de integração entre pares — mas não absorve o que pertence aos operadores, aos esquemas e aos reguladores. Permanecem, no domínio aplicável a cada participante:",
    "Technical federation reduces the integration work between peers — but it does not absorb what belongs to operators, to schemes and to regulators. The following remain in the domain applicable to each participant:",
  ),
  "federation.remains.1": L("Contratos", "Contracts"),
  "federation.remains.2": L("Participação", "Participation"),
  "federation.remains.3": L("Risco", "Risk"),
  "federation.remains.4": L("Liquidação", "Settlement"),
  "federation.remains.5": L("Responsabilidades", "Responsibilities"),
  "federation.remains.6": L("Autorização", "Authorisation"),
  "federation.note": L(
    "A interoperabilidade e a federação técnicas não constituem aprovação regulatória e não substituem contratos, obrigações legais, regulatórias, bancárias, KYC/KYB ou AML/CFT. A liquidação e o movimento de dinheiro real ocorrem sob as autorizações próprias de cada operador — e permanecem desactivados em pré-produção.",
    "Technical interoperability and federation do not constitute regulatory approval, and do not replace contracts or legal, regulatory, banking, KYC/KYB or AML/CFT obligations. Settlement and the movement of real money occur under each operator’s own authorisations — and remain switched off in pre-production.",
  ),
  // The four onward destinations. The English edition used to offer three of them, two of which were
  // different pages — a reader in English simply could not reach the architecture or the protocol state
  // from here. Same four, same order, in both editions.
  "federation.more.chapter": L("Federação — capítulo da Referência", "Federation — Reference chapter"),
  "federation.more.trust": L("A confiança que sustenta a federação", "The trust that underpins federation"),
  "federation.more.architecture": L("A arquitectura em três camadas", "The three-layer architecture"),
  "federation.more.status": L("Estado verificável do protocolo", "The protocol's verifiable state"),

  // ── Trust ──────────────────────────────────────────────────────────────────────────────────────
  "trust.meta.title": L("Confiança", "Trust"),
  "trust.meta.description": L(
    "A confiança no BANZA é uma Avaliação Aberta de Confiança: metadata do registo público, Signed Protocol Metadata e evidência de conformidade, verificadas localmente contra chaves delegadas endossadas pela raiz, com fecho por omissão e sem qualquer autoridade certificadora. Distingue revogação de chave, de metadata/artefacto e de Certification Record.",
    "Trust in BANZA is an Open Trust Evaluation: public registry metadata, Signed Protocol Metadata and conformance evidence, verified locally against delegated keys endorsed by the root, closed by default and with no certificate authority. It distinguishes key revocation from metadata/artifact revocation and from Certification Record revocation.",
  ),
  "trust.eyebrow": L("CONFIANÇA", "TRUST"),
  "trust.title": L("Confiar sem pedir permissão a ninguém.", "Trust without asking anyone for permission."),
  "trust.lede": L(
    "No BANZA a confiança é calculada, não concedida. Um par decide localmente se encaminha para outro combinando metadata pública, metadata de protocolo assinada e evidência de conformidade — verificadas contra chaves delegadas endossadas pela raiz, com fecho por omissão. O BANZA não emite credenciais nem opera uma entidade central de emissão.",
    "In BANZA trust is computed, not granted. A peer decides locally whether to route to another by combining public metadata, signed protocol metadata and conformance evidence — verified against delegated keys endorsed by the root, closed by default. BANZA issues no credentials and operates no central issuing entity.",
  ),
  "trust.chip.1": L("AVALIAÇÃO ABERTA DE CONFIANÇA", "OPEN TRUST EVALUATION"),
  "trust.chip.2": L("SEM AUTORIDADE CERTIFICADORA", "NO CERTIFICATE AUTHORITY"),
  "trust.chip.3": L("FECHO POR OMISSÃO", "CLOSED BY DEFAULT"),
  "trust.chip.4": L("VERIFICAÇÃO LOCAL", "LOCAL VERIFICATION"),

  "trust.inputs.eyebrow": L("A AVALIAÇÃO ABERTA DE CONFIANÇA", "THE OPEN TRUST EVALUATION"),
  "trust.inputs.title": L(
    "Três entradas verificáveis — nenhuma palavra de honra.",
    "Three verifiable inputs — no word of honour.",
  ),
  "trust.inputs.lede": L(
    "A avaliação é determinística, local e sem intervenção humana. Não depende de um certificado emitido por uma autoridade — depende de artefactos que qualquer par verifica por si.",
    "The evaluation is deterministic, local and without human intervention. It does not depend on a certificate issued by an authority — it depends on artifacts that any peer verifies for itself.",
  ),
  "trust.inputs.1.t": L("Metadata do registo público", "Public registry metadata"),
  "trust.inputs.1.b": L(
    "O que uma implementação publica sobre si, indexado no registo técnico para consulta sem autenticação. Na validação oficial, estes artefactos são obtidos exclusivamente dos endpoints públicos da implementação, por uma camada segura de fetch em Rust — nunca pelo navegador (ADR-034).",
    "What an implementation publishes about itself, indexed in the technical registry for consultation without authentication. In official validation these artifacts are fetched exclusively from the implementation's public endpoints, by a secure Rust fetch layer — never by the browser (ADR-034).",
  ),
  "trust.inputs.2.t": L("Signed Protocol Metadata", "Signed Protocol Metadata"),
  "trust.inputs.2.b": L(
    "Metadata assinada pela chave delegada do domínio protocol-metadata, ancorada na Raiz de Confiança através do Manifesto de Chaves — uma afirmação sobre artefactos, nunca sobre um participante.",
    "Metadata signed by the delegated key of the protocol-metadata domain, anchored to the Trust Root through the Key Manifest — an assertion about artifacts, never about a participant.",
  ),
  "trust.inputs.3.t": L("Evidência de conformidade", "Conformance evidence"),
  "trust.inputs.3.b": L(
    "Evidência reproduzível por terceiros: hashes recalculáveis e automação re-executável, com o mesmo resultado.",
    "Evidence reproducible by third parties: recomputable hashes and re-runnable automation, with the same result.",
  ),

  "trust.keys.eyebrow": L("ASSINATURAS E CHAVES", "SIGNATURES AND KEYS"),
  "trust.keys.p1.lead": L(
    "A assinatura é sobre artefactos, não sobre pessoas.",
    "A signature is about artifacts, not about people.",
  ),
  "trust.keys.p1.body": L(
    " A Raiz de Confiança assina apenas o Manifesto de Chaves; o manifesto autoriza as chaves delegadas, e são estas que assinam os artefactos dos respectivos domínios — metadata de protocolo, evidência de conformidade e a Revocation List. Uma assinatura não autoriza pagamentos, não cria operadores, não emite licenças e não certifica nenhum operador.",
    " The Trust Root signs only the Key Manifest; the manifest authorises the delegated keys, and those are what sign the artifacts of their respective domains — protocol metadata, conformance evidence and the Revocation List. A signature does not authorise payments, does not create operators, does not issue licences and does not certify any operator.",
  ),
  "trust.keys.p2.lead": L(
    "O manifesto de chaves publica apenas chaves públicas",
    "The key manifest publishes public keys only",
  ),
  "trust.keys.p2.body": L(
    " e os seus domínios, com janelas de validade e um hash para evidência de adulteração. As chaves privadas nunca aparecem. Em pré-produção não existem chaves de produção: estão preparadas mas gated até à cerimónia offline da chave raiz. Custódia repartida por limiar — nenhuma pessoa isolada reconstrói a raiz; o N-de-M concreto é configuração operacional — e fecho por omissão: o que não se consegue obter e verificar é tratado como ausente, nunca como válido.",
    " and their domains, with validity windows and a hash for tamper evidence. Private keys never appear. In pre-production there are no production keys: they are prepared but gated until the offline root-key ceremony. Custody is split by threshold — no single person reconstructs the root, and the concrete N-of-M is operational configuration — and closed by default: whatever cannot be obtained and verified is treated as absent, never as valid.",
  ),

  "trust.revocation.eyebrow": L("REVOGAÇÃO — TRÊS OBJECTOS DISTINTOS", "REVOCATION — THREE DISTINCT OBJECTS"),
  "trust.revocation.lede": L(
    "«Revogar» não é uma única coisa. Distinguem-se três objectos, com mecanismos e efeitos diferentes — nenhum deles é uma licença ou uma sanção regulatória.",
    "“Revoke” is not one thing. Three objects are distinguished, with different mechanisms and different effects — none of them a licence or a regulatory sanction.",
  ),
  "trust.revocation.1.t": L("Revogação de chave", "Key revocation"),
  "trust.revocation.1.b": L(
    "Uma chave pública deixa de ser válida — por expiração da janela de validade ou por entrada na Revocation List assinada. Chaves privadas nunca aparecem nem são transmitidas.",
    "A public key ceases to be valid — through expiry of its validity window or through entry on the signed Revocation List. Private keys never appear and are never transmitted.",
  ),
  "trust.revocation.2.t": L("Revogação de metadata/artefacto", "Metadata/artifact revocation"),
  "trust.revocation.2.b": L(
    "Metadata de protocolo, uma release ou uma chave delegada são retiradas via Revocation List, um objecto assinado pela chave delegada do domínio de revogação (autoridade rastreada à raiz através do Manifesto de Chaves). É um mecanismo de segurança, não uma sanção regulatória.",
    "Protocol metadata, a release or a delegated key are withdrawn via the Revocation List, an object signed by the delegated key of the revocation domain (authority traced to the root through the Key Manifest). It is a security mechanism, not a regulatory sanction.",
  ),
  "trust.revocation.3.t": L("Revogação de Certification Record", "Certification Record revocation"),
  "trust.revocation.3.b": L(
    "Um registo de certificação transita para REVOKED pela máquina de estados de certificação (decidida em Rust). REVOKED é terminal — não ressuscita; uma nova certificação é um registo novo.",
    "A certification record transitions to REVOKED through the certification state machine (decided in Rust). REVOKED is terminal — it does not come back; a new certification is a new record.",
  ),
  "trust.note": L(
    "Não existe autoridade certificadora: o modelo de confiança do BANZA é aberto e verificado localmente. A confiança avaliada não substitui obrigações legais, regulatórias, bancárias, KYC/KYB ou AML/CFT. Nada nesta página constitui aprovação regulatória.",
    "There is no certificate authority: the BANZA trust model is open and verified locally. Evaluated trust does not replace legal, regulatory, banking, KYC/KYB or AML/CFT obligations. Nothing on this page constitutes regulatory approval.",
  ),
  "trust.continue.eyebrow": L("CONTINUAR", "CONTINUE"),
  // Four onward destinations. The English edition offered three, and two of them were different pages.
  "trust.more.chapter": L("Confiança — capítulo da Referência", "Trust — Reference chapter"),
  "trust.more.federation": L("Como a confiança sustenta a federação", "How trust underpins federation"),
  "trust.more.status": L("Estado verificável do protocolo", "The protocol's verifiable state"),
  "trust.more.banzai": L("Explorar com o BanzAI", "Explore with BanzAI"),

  // ── Architecture ───────────────────────────────────────────────────────────────────────────────
  "architecture.meta.title": L("Arquitectura", "Architecture"),
  "architecture.meta.description": L(
    "A arquitectura do BANZA em três camadas: Camada 1 Protocolo aberto, Camada 2 Certificação de Conformidade e Interoperabilidade (por implementação, baseada em evidência, decidida em Rust) e Camada 3 Esquemas operacionais independentes — esquemas construídos sobre o protocolo segundo as suas próprias regras e autorizações; o primeiro é o Esquema Operacional Banzami, com a Banzami como operadora designada do esquema (preparação regulatória em curso, pagamentos reais desactivados). O BanzAI é a interface humana primária e transversal — não é uma camada.",
    "The BANZA architecture in three layers: Layer 1 open protocol, Layer 2 Conformance and Interoperability Certification (per implementation, evidence-based, decided in Rust) and Layer 3 independent operational schemes — schemes built on the protocol under their own rules and authorisations; the first is the Banzami Operational Scheme, with Banzami as the designated scheme operator (regulatory preparation in progress, real payments switched off). BanzAI is the primary, transversal human interface — it is not a layer.",
  ),
  "architecture.eyebrow": L("ARQUITECTURA", "ARCHITECTURE"),
  "architecture.title": L("Três camadas. Uma interface.", "Three layers. One interface."),
  "architecture.lede": L(
    "O BANZA separa, de forma permanente, o que é a regra, o que prova que uma implementação a respeita e o que é operar um serviço real. São três camadas distintas — protocolo, certificação técnica e esquema operacional — atravessadas por uma interface humana primária e transversal, o BanzAI, que não é uma quarta camada.",
    "BANZA permanently separates what the rule is, what proves an implementation respects it, and what it means to operate a real service. These are three distinct layers — protocol, technical certification and operational scheme — crossed by a primary, transversal human interface, BanzAI, which is not a fourth layer.",
  ),
  "architecture.chip.1": L("Camada 1 · PROTOCOLO", "LAYER 1 · PROTOCOL"),
  "architecture.chip.2": L("Camada 2 · CERTIFICAÇÃO TÉCNICA", "LAYER 2 · TECHNICAL CERTIFICATION"),
  "architecture.chip.3": L("Camada 3 · ESQUEMA OPERACIONAL", "LAYER 3 · OPERATIONAL SCHEME"),
  "architecture.chip.4": L("BANZAI · INTERFACE TRANSVERSAL", "BANZAI · TRANSVERSAL INTERFACE"),

  "architecture.layers.eyebrow": L("AS TRÊS CAMADAS", "THE THREE LAYERS"),
  "architecture.layer.1.tag": L("Camada 1", "Layer 1"),
  "architecture.layer.1.name": L("BANZA · Protocolo", "BANZA · Protocol"),
  "architecture.layer.1.role": L("Aberto e neutro", "Open and neutral"),
  "architecture.layer.1.body": L(
    "A camada comum a todos os operadores: as regras públicas que definem o que é correcto. Não executa nada e não pertence a nenhum operador.",
    "The layer common to every operator: the public rules that define what is correct. It executes nothing and belongs to no operator.",
  ),
  "architecture.layer.1.b1": L("Contratos (OpenAPI), esquemas e mensagens", "Contracts (OpenAPI), schemas and messages"),
  "architecture.layer.1.b2": L("Invariantes financeiros e reason codes", "Financial invariants and reason codes"),
  "architecture.layer.1.b3": L("Identidade técnica, manifestos e metadata assinada", "Technical identity, manifests and signed metadata"),
  "architecture.layer.1.b4": L("Descoberta, perfis, confiança e revogação", "Discovery, profiles, trust and revocation"),
  "architecture.layer.1.b5": L("Registo técnico e federação", "Technical registry and federation"),

  "architecture.layer.2.tag": L("Camada 2", "Layer 2"),
  "architecture.layer.2.name": L("Certificação de Conformidade e Interoperabilidade", "Conformance and Interoperability Certification"),
  "architecture.layer.2.role": L(
    "Por implementação · baseada em evidência · decidida em Rust",
    "Per implementation · evidence-based · decided in Rust",
  ),
  "architecture.layer.2.body": L(
    "Uma determinação reproduzível e ligada por hash de que uma implementação demonstrou conformidade e interoperabilidade contra um perfil público e versionado, com âmbito e validade limitados. Certifica uma implementação (identificada pelo hash do artefacto), nunca uma entidade.",
    "A reproducible, hash-linked determination that an implementation has demonstrated conformance and interoperability against a public, versioned profile, with limited scope and validity. It certifies an implementation (identified by the artifact hash), never an entity.",
  ),
  "architecture.layer.2.b1": L("Perfil de certificação público e versionado", "Public, versioned certification profile"),
  "architecture.layer.2.b2": L("Conformidade + interoperabilidade como evidência", "Conformance + interoperability as evidence"),
  "architecture.layer.2.b3": L("Veredicto decidido pelos motores Rust, com reason code", "Verdict decided by the Rust engines, with a reason code"),
  "architecture.layer.2.b4": L(
    "Estados: NOT_CERTIFIED · CERTIFIED · EXPIRED · SUSPENDED · REVOKED · SUPERSEDED",
    "States: NOT_CERTIFIED · CERTIFIED · EXPIRED · SUSPENDED · REVOKED · SUPERSEDED",
  ),
  "architecture.layer.2.b5": L(
    "Não é licença, admissão a um esquema nem autorização regulatória",
    "It is not a licence, scheme admission or regulatory authorisation",
  ),

  "architecture.layer.3.tag": L("Camada 3", "Layer 3"),
  "architecture.layer.3.name": L("Esquemas operacionais independentes", "Independent operational schemes"),
  "architecture.layer.3.role": L(
    "O primeiro: Esquema Operacional Banzami · em preparação regulatória",
    "The first: Banzami Operational Scheme · in regulatory preparation",
  ),
  "architecture.layer.3.body": L(
    "Esquemas construídos sobre o protocolo segundo as suas próprias regras e autorizações. O primeiro é o Esquema Operacional Banzami, promovido e administrado pela Banzami — Tecnologia e Serviços, Lda. como operadora designada do esquema, condicionado à obtenção do enquadramento regulatório aplicável. É um esquema entre outros possíveis; a certificação BANZA não lhe é exclusiva. BANZA não é a Banzami.",
    "Schemes built on the protocol under their own rules and authorisations. The first is the Banzami Operational Scheme, promoted and administered by Banzami — Tecnologia e Serviços, Lda. as the designated scheme operator, conditional on obtaining the applicable regulatory framework. It is one scheme among others that are possible; BANZA certification is not exclusive to it. BANZA is not Banzami.",
  ),
  "architecture.layer.3.b1": L(
    "Admissão de participantes segundo as regras do próprio esquema",
    "Admission of participants under the scheme's own rules",
  ),
  "architecture.layer.3.b2": L(
    "Diretório de participantes distinto do registo técnico (Camada 2)",
    "Participant directory distinct from the technical registry (Layer 2)",
  ),
  "architecture.layer.3.b3": L(
    "Separado da Camada 1 e da Camada 2 em infraestrutura, chaves e dados",
    "Separated from Layer 1 and Layer 2 in infrastructure, keys and data",
  ),
  "architecture.layer.3.status": L(
    "Operadora designada do esquema: Banzami · preparação regulatória em curso · pagamentos reais desactivados.",
    "Designated scheme operator: Banzami · regulatory preparation in progress · real payments switched off.",
  ),

  "architecture.banzai.eyebrow": L(
    "BANZAI — INTERFACE HUMANA PRIMÁRIA E TRANSVERSAL",
    "BANZAI — PRIMARY, TRANSVERSAL HUMAN INTERFACE",
  ),
  "architecture.banzai.p1.a": L("O ", ""),
  "architecture.banzai.p1.name": L("BanzAI", "BanzAI"),
  "architecture.banzai.p1.b": L(" é a interface humana primária e transversal, em ", " is the primary, transversal human interface, at "),
  "architecture.banzai.p1.c": L(
    ", através da qual as pessoas executam cada fluxo de trabalho ao longo das três camadas — perguntar e validar. Orienta, invoca os motores Rust e explica; consumidores máquina mantêm acesso directo às APIs.",
    ", through which people carry out each workflow across the three layers — asking and validating. It guides, invokes the Rust engines and explains; machine consumers keep direct access to the APIs.",
  ),
  "architecture.banzai.p2.a": L("O BanzAI ", "BanzAI "),
  "architecture.banzai.p2.not": L("não é uma camada nem uma autoridade", "is not a layer and not an authority"),
  "architecture.banzai.p2.b": L(
    ": não decide, não certifica, não admite, não publica, não activa fundos e não altera um estado ou reason code. ",
    ": it does not decide, does not certify, does not admit, does not publish, does not activate funds and does not change a state or a reason code. ",
  ),
  "architecture.banzai.p2.rust": L("O Rust decide; o Qwen explica", "Rust decides; Qwen explains"),
  "architecture.banzai.p2.c": L(" — uma vez, e nunca decide.", " — once, and never decides."),

  "architecture.determinations.eyebrow": L("TRÊS DETERMINAÇÕES DISTINTAS", "THREE DISTINCT DETERMINATIONS"),
  "architecture.determinations.title": L(
    "Certificar não é admitir; admitir não é autorizar.",
    "Certifying is not admitting; admitting is not authorising.",
  ),
  "architecture.determinations.lede": L(
    "São três decisões separadas, com donos diferentes. Nenhuma implica outra — não há propagação entre camadas.",
    "These are three separate decisions, with different owners. None implies another — there is no propagation between layers.",
  ),
  "architecture.determinations.1.t": L("Certificação técnica (Camada 2)", "Technical certification (Layer 2)"),
  "architecture.determinations.1.b": L(
    "«esta implementação passou este perfil, com esta evidência, neste âmbito, até esta data». Decidida em Rust. Não concede acesso a nenhum esquema nem autoriza actividade regulada.",
    "“this implementation passed this profile, with this evidence, in this scope, until this date”. Decided in Rust. It grants access to no scheme and authorises no regulated activity.",
  ),
  "architecture.determinations.2.t": L("Admissão a um esquema (Camada 3)", "Admission to a scheme (Layer 3)"),
  "architecture.determinations.2.b": L(
    "a decisão de um esquema de admitir um participante, segundo a sua própria diligência, elegibilidade e contratos. Pode exigir certificação válida, mas nunca é implicada por ela.",
    "a scheme's decision to admit a participant, under its own due diligence, eligibility and contracts. It may require valid certification, but is never implied by it.",
  ),
  "architecture.determinations.3.t": L("Autorização regulatória", "Regulatory authorisation"),
  "architecture.determinations.3.b": L(
    "concedida pelo regulador competente para conduzir actividade financeira regulada. O BANZA não é parte: não a concede, não a acelera e não a substitui.",
    "granted by the competent regulator to conduct regulated financial activity. BANZA is not a party: it does not grant it, does not accelerate it and does not replace it.",
  ),
  "architecture.note": L(
    "A conformidade técnica com o BANZA não substitui obrigações legais, regulatórias, bancárias, KYC/KYB ou AML/CFT. Contratos, elegibilidade, risco, liquidação, responsabilidades e autorização permanecem no domínio aplicável a cada operador e esquema. Nada nesta página constitui aprovação regulatória.",
    "Technical conformance with BANZA does not replace legal, regulatory, banking, KYC/KYB or AML/CFT obligations. Contracts, eligibility, risk, settlement, responsibilities and authorisation remain in the domain applicable to each operator and scheme. Nothing on this page constitutes regulatory approval.",
  ),
  "architecture.continue.eyebrow": L("CONTINUAR", "CONTINUE"),
  // Five onward destinations. The English edition offered four, dropping open governance and BanzAI and
  // adding a page the Portuguese one does not link from here.
  "architecture.more.chapter": L("Arquitectura — capítulo da Referência", "Architecture — Reference chapter"),
  "architecture.more.trust": L("Confiança e verificação", "Trust and verification"),
  "architecture.more.federation": L("Federação", "Federation"),
  "architecture.more.governance": L("Governança aberta", "Open governance"),
  "architecture.more.banzai": L("Explorar com o BanzAI", "Explore with BanzAI"),
} as const;

export type EditorialCopyId = keyof typeof EDITORIAL_COPY;

export function editorialCopy(id: EditorialCopyId, locale: Locale): string {
  return EDITORIAL_COPY[id][locale];
}

export function editorialCopyIds(): EditorialCopyId[] {
  return Object.keys(EDITORIAL_COPY) as EditorialCopyId[];
}
