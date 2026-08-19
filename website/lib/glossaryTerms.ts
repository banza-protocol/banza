// The glossary's 24 terms, once, with a realization per locale.
//
// The Portuguese page already owned these as a `TERMS` array with an `en` display name on each record,
// so the semantic spine exists and is not being redesigned here. What was missing is everything a reader
// actually reads — the short and full definitions, the link labels, and the "do not confuse with" line.
//
// ONE RECORD PER TERM, deliberately. A `TERMS_PT` and a `TERMS_EN` array would drift, and the way they
// drift is the dangerous way: the English `certification` entry quietly acquires admission semantics and
// still reads like a competent definition. Here each term is one identity with two realizations, so the
// two languages cannot disagree about WHICH concepts exist, only about how each is worded.
//
// NOTE: the website Locale vocabulary is `pt` | `en`; the BanzAI runtime uses the `pt-PT` BCP-47 tag.
// They are different vocabularies for the same language and are deliberately not unified here.
//
// `related` holds term KEYS, not display strings, so a relationship is a link between concepts rather
// than between sentences — and the label a reader sees is resolved per locale at render time.
//
// TRANSLATION RULE. The Portuguese is canonical and the English preserves it exactly, including every
// negative clause. These definitions carry the distinctions the protocol cannot afford to blur:
// certification is not admission and not authorisation; an operator is not an implementation; conformance
// is not interoperability; evidence is not a verdict; being in the Technical Registry is not being
// admitted anywhere. English wording follows the terminology already used in the EN Reference, the ADRs
// and the contracts (`implementation_hash`, `profile_version`, Evidence Bundle, Open Trust Evaluation,
// OperationReceipt, JourneyReceipt), not fresh synonyms.

import type { Locale } from "@/lib/i18n";

/** A string the reader sees, in both supported locales. */
export type Localized = Readonly<Record<Locale, string>>;

export interface GlossaryTerm {
  /** Stable semantic key. Terms reference each other by this, never by display text. */
  key: string;
  /** The concept's canonical technical id where the protocol publishes one. Locale-neutral by nature. */
  technicalId?: string;
  /** Display term. Many English forms are canonical names (Evidence Bundle), not translations. */
  name: Localized;
  short: Localized;
  full: Localized;
  /** Portuguese path of the page that owns the concept. The English route is derived via the registry. */
  href: string;
  hrefLabel: Localized;
  /** Keys of related terms. Resolved to display names per locale at render time. */
  related: readonly string[];
  notConfuse: Localized;
}

export const GLOSSARY_TERMS: readonly GlossaryTerm[] = [
  {
    key: "operator",
    technicalId: "operator",
    name: { pt: "Operador", en: "Operator" },
    short: {
      pt: "Entidade independente que implementa o protocolo e processa pagamentos sob as suas próprias autorizações.",
      en: "An independent entity that implements the protocol and processes payments under its own authorisations.",
    },
    full: {
      pt: "Um operador é qualquer entidade jurídica independente que implementa o BANZA para processar pagamentos nos seus próprios sistemas, sob as suas próprias autorizações regulatórias. No plano do protocolo está sujeito apenas a verificação de conformidade — os mesmos testes públicos e determinísticos para todos. Fora do protocolo, todas as obrigações legais, regulatórias, bancárias, KYC/KYB e AML/CFT são inteiramente suas. O BANZA não é um operador. O operador é a entidade responsável; validar um operador é avaliar uma das suas implementações publicadas (ADR-034).",
      en: "An operator is any independent legal entity that implements BANZA to process payments on its own systems, under its own regulatory authorisations. At the protocol level it is subject only to conformance verification — the same public, deterministic tests for everyone. Outside the protocol, all legal, regulatory, banking, KYC/KYB and AML/CFT obligations are entirely its own. BANZA is not an operator. The operator is the responsible entity; validating an operator means evaluating one of its published implementations (ADR-034).",
    },
    href: "/operadores",
    hrefLabel: { pt: "Operadores — registo público", en: "Operators — public registry" },
    related: ["implementation", "scheme-participant", "regulatory-authorisation"],
    notConfuse: {
      pt: "com «implementação» (o operador é a entidade responsável; a implementação é o sistema técnico avaliado) nem com «participante de esquema».",
      en: "with “implementation” (the operator is the responsible entity; the implementation is the technical system evaluated), nor with “scheme participant”.",
    },
  },
  {
    key: "implementation",
    technicalId: "certified-implementation",
    name: { pt: "Implementação", en: "Implementation" },
    short: {
      pt: "O sistema técnico avaliado e o sujeito da certificação: um build específico, identificado por hash de conteúdo — nunca uma entidade ou marca.",
      en: "The technical system evaluated and the subject of certification: a specific build, identified by content hash — never an entity or a brand.",
    },
    full: {
      pt: "Uma implementação é o sistema técnico avaliado — identificada por um implementation_id estável e por um implementation_hash, o hash de conteúdo do conjunto exacto de artefactos testado. A certificação liga-se a esse hash: um build diferente é um sujeito diferente, que precisa da sua própria certificação. A entidade declarante (declared_by) é atribuição/contacto, nunca o sujeito. Um operador pode publicar várias implementações (demonstração, sandbox, pré-produção, produção); a validação oficial obtém os artefactos de cada uma dos endpoints públicos da sua origem canónica (ADR-034).",
      en: "An implementation is the technical system evaluated — identified by a stable `implementation_id` and by an `implementation_hash`, the content hash of the exact set of artifacts tested. Certification binds to that hash: a different build is a different subject and needs its own certification. The declaring entity (`declared_by`) is attribution and contact, never the subject. An operator may publish several implementations (demonstration, sandbox, pre-production, production); official validation fetches each one's artifacts from the public endpoints of its canonical origin (ADR-034).",
    },
    href: "/certificacao",
    hrefLabel: { pt: "Certificação (Camada 2)", en: "Certification (Layer 2)" },
    related: ["operator", "certification-profile", "endpoint-originated-validation"],
    notConfuse: {
      pt: "com «operador» — o operador é a entidade responsável; a implementação é o sistema técnico avaliado.",
      en: "with “operator” — the operator is the responsible entity; the implementation is the technical system evaluated.",
    },
  },
  {
    key: "scheme-participant",
    technicalId: "scheme-participant",
    name: { pt: "Participante de esquema", en: "Scheme participant" },
    short: {
      pt: "Entidade/implementação admitida como participante de um esquema operacional específico (Camada 3).",
      en: "An entity or implementation admitted as a participant of a specific operational scheme (Layer 3).",
    },
    full: {
      pt: "Um participante de esquema é uma entidade/implementação que um esquema específico (o Esquema Operacional Banzami, ou qualquer esquema independente) admitiu segundo as suas próprias regras de elegibilidade, diligência e contratos. A pertença ao directório de participantes do esquema (Camada 3) é separada do Registo Técnico (Camada 2): pode exigir certificação válida, mas nunca é implicada por ela.",
      en: "A scheme participant is an entity or implementation that a specific scheme (the Banzami Operational Scheme, or any independent scheme) has admitted under its own eligibility rules, due diligence and contracts. Membership of a scheme's participant directory (Layer 3) is separate from the Technical Registry (Layer 2): it may require valid certification, but it is never implied by it.",
    },
    href: "/referencia/arquitectura",
    hrefLabel: { pt: "Arquitectura — as três camadas", en: "Architecture — the three layers" },
    related: ["scheme-admission", "operational-scheme", "operator"],
    notConfuse: {
      pt: "com «implementação certificada» — constar no registo técnico não é ser admitido a um esquema.",
      en: "with “certified implementation” — appearing in the technical registry is not being admitted to a scheme.",
    },
  },
  {
    key: "certification-profile",
    technicalId: "interoperability-certification-profile",
    name: { pt: "Perfil", en: "Certification Profile" },
    short: {
      pt: "O padrão público e versionado contra o qual uma implementação é certificada.",
      en: "The public, versioned standard an implementation is certified against.",
    },
    full: {
      pt: "Um perfil de certificação define, para um dado nível de conformidade e conjunto de capabilities, as suites de conformidade, os vectores de interoperabilidade, os schemas/contratos/invariantes/endpoints exigidos e a janela de validade que uma implementação tem de satisfazer — cada um fixado por hash. É imutável por versão (uma alteração é uma nova profile_version) e deriva apenas dos contratos do protocolo (Camada 1).",
      en: "A certification profile defines, for a given conformance level and set of capabilities, the conformance suites, the interoperability vectors, the required schemas, contracts, invariants and endpoints, and the validity window an implementation must satisfy — each one pinned by hash. It is immutable per version (a change is a new `profile_version`) and derives only from the protocol's contracts (Layer 1).",
    },
    href: "/certificacao",
    hrefLabel: { pt: "Certificação (Camada 2)", en: "Certification (Layer 2)" },
    related: ["conformance", "capability", "certification-record"],
    notConfuse: {
      pt: "com «capability» — o perfil exige capabilities; não é uma capability.",
      en: "with “capability” — a profile requires capabilities; it is not one.",
    },
  },
  {
    key: "capability",
    technicalId: "capability",
    name: { pt: "Capability", en: "Capability" },
    short: {
      pt: "Uma superfície de protocolo que uma implementação declara implementar — descritiva, não uma permissão.",
      en: "A protocol surface an implementation declares it implements — descriptive, not a permission.",
    },
    full: {
      pt: "Uma capability é uma superfície de protocolo nomeada (por exemplo «payment-intents», «qr», «federation») que um candidato declara no seu Operator Manifest e que um perfil de certificação exige. Descreve comportamento pretendido/demonstrado; não é uma permissão nem uma concessão. O âmbito de um registo de certificação nunca é mais largo do que a evidência.",
      en: "A capability is a named protocol surface (for example “payment-intents”, “qr”, “federation”) that a candidate declares in its Operator Manifest and that a certification profile requires. It describes intended or demonstrated behaviour; it is not a permission and not a grant. The scope of a certification record is never broader than the evidence.",
    },
    href: "/certificacao",
    hrefLabel: { pt: "Certificação (Camada 2)", en: "Certification (Layer 2)" },
    related: ["certification-profile", "conformance", "evidence-bundle"],
    notConfuse: {
      pt: "com «autorização» ou «licença» — declarar uma capability não concede qualquer permissão.",
      en: "with “authorisation” or “licence” — declaring a capability grants no permission whatsoever.",
    },
  },
  {
    key: "conformance",
    technicalId: "conformance",
    name: { pt: "Conformidade", en: "Conformance" },
    short: {
      pt: "Verificação determinística e reproduzível de que uma implementação respeita os contratos e invariantes.",
      en: "Deterministic, reproducible verification that an implementation respects the contracts and invariants.",
    },
    full: {
      pt: "Conformidade é a verificação pública, determinística e reproduzível (suites + vectores) de que uma implementação obedece aos contratos, schemas e invariantes financeiros do protocolo, num dado âmbito. O resultado é evidência ligada por hash, que um terceiro re-executa para reproduzir os hashes. Um resultado positivo é evidência verificável — não certificação, licença nem autorização.",
      en: "Conformance is the public, deterministic and reproducible verification (suites plus vectors) that an implementation obeys the protocol's contracts, schemas and financial invariants, within a given scope. The result is hash-bound evidence that a third party re-runs to reproduce the hashes. A positive result is verifiable evidence — not certification, not a licence and not an authorisation.",
    },
    href: "/certificacao",
    hrefLabel: { pt: "Certificação (Camada 2)", en: "Certification (Layer 2)" },
    related: ["interoperability", "evidence-bundle", "certification-profile"],
    notConfuse: {
      pt: "com «certificação» — a conformidade alimenta a certificação, mas não é a certificação.",
      en: "with “certification” — conformance feeds certification, but it is not certification.",
    },
  },
  {
    key: "interoperability",
    technicalId: "interoperability",
    name: { pt: "Interoperabilidade", en: "Interoperability" },
    short: {
      pt: "Capacidade verificada de implementações independentes trocarem pagamentos sob as mesmas regras.",
      en: "The verified ability of independent implementations to exchange payments under the same rules.",
    },
    full: {
      pt: "Interoperabilidade é a capacidade verificada de implementações conformes e independentes encaminharem e liquidarem pagamentos entre si sob os mesmos invariantes, estabelecida por evidência e pela Avaliação Aberta de Confiança — e não pela reconstrução da mesma integração técnica bilateral por cada par de operadores. No modelo da Camada 2 é medida por vectores de interoperabilidade e reportada, alimentando o veredicto de certificação.",
      en: "Interoperability is the verified ability of conformant, independent implementations to route and settle payments between one another under the same invariants, established by evidence and by Open Trust Evaluation — and not by every pair of operators rebuilding the same bilateral technical integration. In the Layer 2 model it is measured by interoperability vectors and reported, feeding the certification verdict.",
    },
    href: "/referencia/federacao",
    hrefLabel: { pt: "Referência — Federação", en: "Reference — Federation" },
    related: ["conformance", "federation", "certification"],
    notConfuse: {
      pt: "com «federação» — a interoperabilidade é a capacidade medida; a federação é a operação entre operadores que dela depende.",
      en: "with “federation” — interoperability is the measured ability; federation is the operation between operators that depends on it.",
    },
  },
  {
    key: "certification",
    technicalId: "conformance-interoperability-certification",
    name: { pt: "Certificação", en: "Certification" },
    short: {
      pt: "Camada 2: determinação por implementação, baseada em evidência e decidida por Rust, contra um perfil versionado.",
      en: "Layer 2: a per-implementation, evidence-based determination decided by Rust against a versioned profile.",
    },
    full: {
      pt: "A Certificação de Conformidade e Interoperabilidade (Camada 2) é uma determinação por implementação, baseada em evidência, decidida por motores Rust, reproduzível, ligada por hash, com âmbito e prazo, de que uma implementação demonstrou conformidade e interoperabilidade contra um perfil público e versionado — sujeita a suspensão/revogação. Certifica uma implementação, nunca uma entidade, e não confere estatuto para além de «esta implementação passou este perfil, nesta versão, com esta evidência».",
      en: "Conformance and Interoperability Certification (Layer 2) is a per-implementation, evidence-based determination — decided by Rust engines, reproducible, hash-bound, scoped and time-limited — that an implementation has demonstrated conformance and interoperability against a public, versioned profile, and it is subject to suspension and revocation. It certifies an implementation, never an entity, and confers no standing beyond “this implementation passed this profile, at this version, with this evidence”.",
    },
    href: "/certificacao",
    hrefLabel: { pt: "Certificação (Camada 2)", en: "Certification (Layer 2)" },
    related: ["certification-profile", "certification-record", "technical-registry"],
    notConfuse: {
      pt: "com «admissão a esquema» e com «autorização regulatória» — não é licença, admissão nem autorização.",
      en: "with “scheme admission” or “regulatory authorisation” — it is not a licence, not an admission and not an authorisation.",
    },
  },
  {
    key: "certification-record",
    technicalId: "certification-record",
    name: { pt: "Registo de certificação", en: "Certification Record" },
    short: {
      pt: "O objecto do veredicto: liga uma implementação a um perfil, com evidência, âmbito, validade, estado e hash.",
      en: "The verdict object: it binds an implementation to a profile, with evidence, scope, validity, state and hash.",
    },
    full: {
      pt: "Um registo de certificação liga uma CertifiedImplementation (por implementation_hash) a um perfil (por profile_id + profile_version), transportando os hashes reproduzíveis da evidência, o veredicto decidido por Rust, um estado + reason_code, o âmbito (nunca mais largo do que a evidência), a janela de validade e um record_hash sobre o todo.",
      en: "A certification record binds a CertifiedImplementation (by `implementation_hash`) to a profile (by `profile_id` plus `profile_version`), carrying the reproducible hashes of the evidence, the verdict decided by Rust, a state plus `reason_code`, the scope (never broader than the evidence), the validity window and a `record_hash` over the whole.",
    },
    href: "/certificacao",
    hrefLabel: { pt: "Certificação (Camada 2)", en: "Certification (Layer 2)" },
    related: ["certification", "certification-profile", "revocation"],
    notConfuse: {
      pt: "com um certificado aberto ou uma cadeia de certificados — é um registo estreito, datado e reproduzível.",
      en: "with an open-ended certificate or a certificate chain — it is a narrow, dated, reproducible record.",
    },
  },
  {
    key: "certification-readiness",
    name: { pt: "Prontidão de certificação", en: "Certification readiness" },
    short: {
      pt: "O resultado agregado de validar uma implementação — indica preparação, não é a certificação.",
      en: "The aggregated outcome of validating an implementation — it indicates readiness, it is not certification.",
    },
    full: {
      pt: "Prontidão de certificação é o resultado, decidido por Rust, de percorrer a jornada de validação de nove passos sobre uma implementação. Indica que a implementação está preparada para ser certificada contra um perfil; não é, por si só, uma certificação, nem confere qualquer estatuto.",
      en: "Certification readiness is the Rust-decided outcome of running the nine-step validation journey over an implementation. It indicates that the implementation is prepared to be certified against a profile; it is not itself a certification, and it confers no standing.",
    },
    href: "/banzai?mode=validation&target=operator-zero&workflow=full",
    hrefLabel: { pt: "Validar com o BanzAI", en: "Validate with BanzAI" },
    related: ["certification", "evidence-bundle", "receipt"],
    notConfuse: {
      pt: "com «certificação» — estar pronto para certificar não é estar certificado.",
      en: "with “certification” — being ready to be certified is not being certified.",
    },
  },
  {
    key: "scheme-admission",
    technicalId: "scheme-admission",
    name: { pt: "Admissão a esquema", en: "Scheme admission" },
    short: {
      pt: "A decisão de um esquema de admitir uma entidade/implementação como participante — separada da certificação.",
      en: "A scheme's decision to admit an entity or implementation as a participant — separate from certification.",
    },
    full: {
      pt: "Admissão a esquema é a decisão de um esquema operacional (o Esquema Operacional Banzami, ou qualquer esquema independente) de admitir uma entidade/implementação como participante, segundo a sua própria diligência, elegibilidade e contratos. É um passo separado e posterior que pode exigir certificação válida como pré-requisito, mas nunca é implicado por ela.",
      en: "Scheme admission is the decision by an operational scheme (the Banzami Operational Scheme, or any independent scheme) to admit an entity or implementation as a participant, under its own due diligence, eligibility rules and contracts. It is a separate and later step that may require valid certification as a prerequisite, but it is never implied by it.",
    },
    href: "/referencia/arquitectura",
    hrefLabel: { pt: "Arquitectura — as três camadas", en: "Architecture — the three layers" },
    related: ["scheme-participant", "operational-scheme", "certification"],
    notConfuse: {
      pt: "com «certificação» (a certificação não admite ninguém) e com «autorização regulatória».",
      en: "with “certification” (certification admits no one) or with “regulatory authorisation”.",
    },
  },
  {
    key: "regulatory-authorisation",
    technicalId: "regulatory-authorisation",
    name: { pt: "Autorização regulatória", en: "Regulatory authorisation" },
    short: {
      pt: "A concessão, pelo regulador competente, para exercer actividade financeira regulada. O BANZA não é parte.",
      en: "The grant, by the competent regulator, to carry on regulated financial activity. BANZA is not a party to it.",
    },
    full: {
      pt: "Autorização regulatória é concedida pelo regulador competente a um operador/participante, ao abrigo do quadro legal aplicável, para exercer actividade financeira regulada. O BANZA não é parte: não a concede, não a detém, não a representa, não a acelera nem a substitui, não emite licenças e não substitui qualquer regulador. A certificação (Camada 2) e a admissão a esquema (Camada 3) nunca a implicam.",
      en: "Regulatory authorisation is granted by the competent regulator to an operator or participant, under the applicable legal framework, to carry on regulated financial activity. BANZA is not a party to it: it does not grant it, hold it, represent it, accelerate it or replace it, it issues no licences and it substitutes for no regulator. Certification (Layer 2) and scheme admission (Layer 3) never imply it.",
    },
    href: "/estado",
    hrefLabel: { pt: "Estado verificável", en: "Verifiable status" },
    related: ["scheme-admission", "banzami-operational-scheme", "operator"],
    notConfuse: {
      pt: "com «certificação» e com «admissão a esquema» — são determinações distintas, com donos distintos.",
      en: "with “certification” or “scheme admission” — they are distinct determinations with distinct owners.",
    },
  },
  {
    key: "evidence-bundle",
    technicalId: "evidence-bundle",
    name: { pt: "Evidência", en: "Evidence Bundle" },
    short: {
      pt: "Um pacote reproduzível de artefactos e referências de estado, ligados por hash — um pacote de entradas, não um certificado.",
      en: "A reproducible package of artifacts and status references, hash-bound — a bundle of inputs, not a certificate.",
    },
    full: {
      pt: "Uma evidência (evidence bundle) liga os artefactos e as referências de estado — prontidão, garantia, estado do gate de protocolo, relatório de conformidade — que um candidato publica como evidência de conformidade verificável. É reproduzível e verificável de forma independente, e por si só não concede nada: não é um certificado. Tem de verificar contra o material de chaves públicas ligado ao manifesto que nomeia.",
      en: "An evidence bundle binds the artifacts and status references — readiness, assurance, protocol gate status, conformance report — that a candidate publishes as verifiable conformance evidence. It is reproducible and independently verifiable, and on its own it grants nothing: it is not a certificate. It must verify against the public key material bound to the manifest it names.",
    },
    href: "/certificacao",
    hrefLabel: { pt: "Certificação (Camada 2)", en: "Certification (Layer 2)" },
    related: ["conformance", "certification-record", "endpoint-originated-validation"],
    notConfuse: {
      pt: "com «certificado» — a evidência é o insumo verificável; o veredicto é o registo de certificação.",
      en: "with “certificate” — evidence is the verifiable input; the verdict is the certification record.",
    },
  },
  {
    key: "open-trust-evaluation",
    technicalId: "open-trust-evaluation",
    name: { pt: "Confiança", en: "Open Trust Evaluation" },
    short: {
      pt: "Avaliação Aberta de Confiança: verificação determinística, local e sem intervenção humana, de encaminhar para um par.",
      en: "Open Trust Evaluation: a deterministic, local, human-free check on whether to route to a peer.",
    },
    full: {
      pt: "Confiança no BANZA é a Avaliação Aberta de Confiança = metadata do registo público + metadata de protocolo assinada + evidência de conformidade, verificada contra chaves delegadas endossadas pela raiz, com semântica de fecho por omissão e sem qualquer passo humano. Um par calcula a resposta localmente, sem consulta central. Não existe autoridade certificadora.",
      en: "Trust in BANZA is Open Trust Evaluation = public registry metadata plus signed protocol metadata plus conformance evidence, verified against delegated keys endorsed by the root, with closed-by-default semantics and no human step at any point. A peer computes the answer locally, with no central lookup. There is no certificate authority.",
    },
    href: "/referencia/confianca",
    hrefLabel: { pt: "Referência — Confiança", en: "Reference — Trust" },
    related: ["revocation", "federation", "certification"],
    notConfuse: {
      pt: "com «certificação» — a confiança avalia artefactos assinados para encaminhar; não emite estatuto de operador.",
      en: "with “certification” — trust evaluates signed artifacts in order to route; it issues no operator standing.",
    },
  },
  {
    key: "revocation",
    technicalId: "revocation",
    name: { pt: "Revogação", en: "Revocation" },
    short: {
      pt: "Retirada assinada e datada de chaves/artefactos (ou de uma certificação) — mecanismo de segurança, não sanção.",
      en: "The signed, dated withdrawal of keys, artifacts or a certification — a security mechanism, not a sanction.",
    },
    full: {
      pt: "Revogação é a retirada assinada e datada de chaves/artefactos de protocolo, através da lista de revogação pública (um objecto assinado pela chave delegada do domínio de revogação — nunca pela raiz), e de certificações através da máquina de estados (CERTIFIED|SUSPENDED|EXPIRED → REVOKED, terminal). É um mecanismo de segurança e trust do protocolo, nunca uma licença, sanção regulatória ou autorização financeira. Fecho por omissão: quem não obtém e verifica uma lista assinada fresca trata o material como não fiável.",
      en: "Revocation is the signed, dated withdrawal of protocol keys and artifacts, through the public revocation list (an object signed by the revocation domain's delegated key — never by the root), and of certifications through the state machine (CERTIFIED|SUSPENDED|EXPIRED → REVOKED, terminal). It is a protocol security and trust mechanism, never a licence, a regulatory sanction or a financial authorisation. Closed by default: anyone who does not fetch and verify a fresh signed list treats the material as untrusted.",
    },
    href: "/referencia/confianca",
    hrefLabel: { pt: "Referência — Confiança", en: "Reference — Trust" },
    related: ["open-trust-evaluation", "certification-record", "technical-registry"],
    notConfuse: {
      pt: "com uma sanção regulatória — é um mecanismo técnico de segurança e trust.",
      en: "with a regulatory sanction — it is a technical security and trust mechanism.",
    },
  },
  {
    key: "technical-registry",
    technicalId: "banza-technical-registry",
    name: { pt: "Registo Técnico", en: "BANZA Technical Registry" },
    short: {
      pt: "O índice público e verificável por raiz de artefactos da camada de certificação (Camada 2).",
      en: "The public, root-verifiable index of certification-layer artifacts (Layer 2).",
    },
    full: {
      pt: "O Registo Técnico BANZA é o índice único, público, verificável por raiz e apenas de leitura dos artefactos da Camada 2 — implementações, perfis, registos de certificação e as respectivas revogações — verificável por qualquer terceiro sem conta e sem confiar na palavra de nenhum operador. É estritamente independente do directório de participantes de um esquema (Camada 3): constar no registo técnico nunca é «admitido» nem «autorizado». O estado actual lê-se em /registo-tecnico e directamente na rota máquina /operators — o registo vazio é um estado válido e verificável.",
      en: "The BANZA Technical Registry is the single, public, root-verifiable, read-only index of Layer 2 artifacts — implementations, profiles, certification records and their revocations — verifiable by any third party without an account and without taking any operator's word for it. It is strictly independent of a scheme's participant directory (Layer 3): appearing in the technical registry is never “admitted” and never “authorised”. The current state is readable at /registo-tecnico and directly on the machine route /operators — an empty registry is a valid, verifiable state.",
    },
    href: "/registo-tecnico",
    hrefLabel: { pt: "Registo Técnico", en: "Technical Registry" },
    related: ["certification-record", "certification", "operator"],
    notConfuse: {
      pt: "com um directório de participantes de esquema — o registo técnico não é uma lista de admitidos.",
      en: "with a scheme participant directory — the technical registry is not a list of admitted parties.",
    },
  },
  {
    key: "federation",
    technicalId: "federation",
    name: { pt: "Federação", en: "Federation" },
    short: {
      pt: "Avaliação técnica, local e por interacção, das condições para encaminhar pagamentos entre operadores — por evidência + confiança.",
      en: "The technical, local, per-interaction assessment of the conditions for routing payments between operators — by evidence plus trust.",
    },
    full: {
      pt: "Federação é a avaliação técnica, local e por interacção, das condições para o encaminhamento de pagamentos entre operadores independentes — estabelecida por evidência publicada e verificável e pela Avaliação Aberta de Confiança sobre metadata assinada, e não pela reconstrução da mesma integração técnica bilateral por cada par de operadores. Exige o âmbito de conformidade aplicável, metadata/evidência assinada e fresca, ausência da lista de revogação e as condições de produção. A federação de produção não está activa em pré-produção.",
      en: "Federation is the technical, local, per-interaction assessment of the conditions for routing payments between independent operators — established by published, verifiable evidence and by Open Trust Evaluation over signed metadata, and not by every pair of operators rebuilding the same bilateral technical integration. It requires the applicable conformance scope, fresh signed metadata and evidence, absence from the revocation list, and the production conditions. Production federation is not active in pre-production.",
    },
    href: "/referencia/federacao",
    hrefLabel: { pt: "Referência — Federação", en: "Reference — Federation" },
    related: ["interoperability", "open-trust-evaluation", "revocation"],
    notConfuse: {
      pt: "com «rede em directo» — em pré-produção a federação de produção não está activa.",
      en: "with “live network” — in pre-production, production federation is not active.",
    },
  },
  {
    key: "operational-scheme",
    technicalId: "operational-scheme",
    name: { pt: "Esquema operacional", en: "Operational scheme" },
    short: {
      pt: "Camada 3: um esquema independente que adopta o protocolo para operar, definindo participação, operação e responsabilidades.",
      en: "Layer 3: an independent scheme that adopts the protocol in order to operate, defining participation, operation and responsibilities.",
    },
    full: {
      pt: "Um esquema operacional é uma camada institucional independente (Camada 3) que pode adoptar o protocolo para operar, definindo a participação, a operação e as responsabilidades ao abrigo do quadro aplicável (ADR-006). Os esquemas são independentes entre si e do protocolo: uma implementação pode estar certificada na Camada 2 sem pertencer a qualquer esquema, e um esquema pode operar segundo o seu próprio quadro sem alterar o protocolo da Camada 1. O BANZA não é um esquema e a continuidade do protocolo não depende de nenhum.",
      en: "An operational scheme is an independent institutional layer (Layer 3) that may adopt the protocol in order to operate, defining participation, operation and responsibilities under the applicable framework (ADR-006). Schemes are independent of one another and of the protocol: an implementation may be certified at Layer 2 without belonging to any scheme, and a scheme may operate under its own framework without altering the Layer 1 protocol. BANZA is not a scheme, and the protocol's continuity does not depend on any.",
    },
    href: "/referencia/arquitectura",
    hrefLabel: { pt: "Arquitectura — as três camadas", en: "Architecture — the three layers" },
    related: ["banzami-operational-scheme", "scheme-admission", "scheme-participant"],
    notConfuse: {
      pt: "com o «protocolo» (Camada 1, aberto e neutro) nem com um esquema em particular — o Esquema Operacional Banzami é o primeiro esquema, não o conceito genérico.",
      en: "with the “protocol” (Layer 1, open and neutral) or with any particular scheme — the Banzami Operational Scheme is the first scheme, not the generic concept.",
    },
  },
  {
    key: "banzami-operational-scheme",
    technicalId: "banzami-operational-scheme",
    name: { pt: "Esquema Operacional Banzami", en: "Banzami Operational Scheme" },
    short: {
      pt: "O primeiro esquema operacional independente construído sobre o BANZA (Camada 3), com a Banzami como operadora designada do esquema, em preparação regulatória.",
      en: "The first independent operational scheme built on BANZA (Layer 3), with Banzami as the designated scheme operator, in regulatory preparation.",
    },
    full: {
      pt: "O Esquema Operacional Banzami é o primeiro esquema operacional construído sobre o BANZA (Camada 3), promovido, desenhado e administrado pela Banzami — Tecnologia e Serviços, Lda. como operadora designada do esquema, condicionado à obtenção do quadro regulatório aplicável. O seu estado é REGULATORY_AUTHORIZATION_IN_PROGRESS; fundos reais, carteiras, liquidação e participantes reais estão em fecho por omissão até existir evidência formal. O BANZA não é a Banzami, e a certificação BANZA não é exclusiva deste esquema.",
      en: "The Banzami Operational Scheme is the first operational scheme built on BANZA (Layer 3), promoted, designed and administered by Banzami — Tecnologia e Serviços, Lda. as the designated scheme operator, conditional on obtaining the applicable regulatory framework. Its status is REGULATORY_AUTHORIZATION_IN_PROGRESS; real funds, wallets, settlement and real participants are closed by default until formal evidence exists. BANZA is not Banzami, and BANZA certification is not exclusive to this scheme.",
    },
    href: "/referencia/arquitectura",
    hrefLabel: { pt: "Arquitectura — as três camadas", en: "Architecture — the three layers" },
    related: ["scheme-admission", "scheme-participant", "regulatory-authorisation"],
    notConfuse: {
      pt: "com o «protocolo» — o BANZA (Camada 1) é aberto e neutro; o esquema (Camada 3) é um esquema operacional independente construído sobre ele, com uma operadora designada.",
      en: "with the “protocol” — BANZA (Layer 1) is open and neutral; the scheme (Layer 3) is an independent operational scheme built on top of it, with a designated scheme operator.",
    },
  },
  {
    key: "receipt",
    technicalId: "operation-receipt",
    name: { pt: "Recibo", en: "OperationReceipt · JourneyReceipt" },
    short: {
      pt: "Registo por passo (e agregado) de uma jornada de validação: o que correu e o que o motor Rust decidiu.",
      en: "The per-step (and aggregated) record of a validation journey: what ran, and what the Rust engine decided.",
    },
    full: {
      pt: "Um OperationReceipt é o artefacto por passo emitido em cada um dos nove passos de validação: regista o passo, o resultado/razão decidido por Rust e a metadata do caminho de execução (qwen_calls, external_calls). Um JourneyReceipt agrega os nove recibos numa jornada completa. O Qwen explica; o Rust decide. Nenhum recibo é um certificado.",
      en: "An OperationReceipt is the per-step artifact emitted at each of the nine validation steps: it records the step, the Rust-decided outcome and reason, and the execution-path metadata (`qwen_calls`, `external_calls`). A JourneyReceipt aggregates the nine receipts into one complete journey. Qwen explains; Rust decides. No receipt is a certificate.",
    },
    href: "/banzai",
    hrefLabel: { pt: "BanzAI", en: "BanzAI" },
    related: ["certification-readiness", "evidence-bundle", "certification-record"],
    notConfuse: {
      pt: "com «certificado» — um recibo é a evidência do que foi validado num passo, não um veredicto de certificação.",
      en: "with “certificate” — a receipt is the evidence of what was validated at a step, not a certification verdict.",
    },
  },
  {
    key: "endpoint-originated-validation",
    technicalId: "endpoint-originated-validation",
    name: { pt: "Validação por endpoints", en: "Endpoint-originated validation" },
    short: {
      pt: "A validação oficial obtém todos os artefactos avaliados exclusivamente dos endpoints públicos da implementação seleccionada.",
      en: "Official validation fetches every evaluated artifact exclusively from the selected implementation's public endpoints.",
    },
    full: {
      pt: "A validação oficial utiliza exclusivamente artefactos obtidos dos endpoints públicos da implementação seleccionada (ADR-034). Nenhum conteúdo colado, ficheiro carregado, URL do utilizador, fixture local ou mock de frontend entra na jornada oficial: o BanzAI resolve o alvo no Registo Técnico (operador → implementação → origem canónica → descoberta) e obtém cada artefacto pela camada segura de fetch em Rust — nunca pelo navegador. O resultado é específico da implementação, do profile, da versão, do ambiente, do âmbito, dos artefactos e do momento da avaliação.",
      en: "Official validation uses exclusively artifacts fetched from the selected implementation's public endpoints (ADR-034). No pasted content, uploaded file, user-supplied URL, local fixture or frontend mock enters the official journey: BanzAI resolves the target in the Technical Registry (operator → implementation → canonical origin → discovery) and fetches each artifact through the secure Rust fetcher — never through the browser. The result is specific to the implementation, the profile, the version, the environment, the scope, the artifacts and the moment of evaluation.",
    },
    href: "/referencia/banzai",
    hrefLabel: { pt: "Referência — BanzAI", en: "Reference — BanzAI" },
    related: ["draft-validation", "canonical-origin", "secure-artifact-fetcher"],
    notConfuse: {
      pt: "com «rascunho de validação» — o rascunho verifica conteúdo local e não é evidência oficial.",
      en: "with “draft validation” — a draft checks local content and is not official evidence.",
    },
  },
  {
    key: "draft-validation",
    technicalId: "draft-validation",
    name: { pt: "Rascunho de validação", en: "Draft validation" },
    short: {
      pt: "Uma ferramenta local para programadores, separada da jornada oficial, que verifica um conteúdo carregado ou colado.",
      en: "A local developer tool, separate from the official journey, that checks uploaded or pasted content.",
    },
    full: {
      pt: "A validação de rascunho verifica apenas um conteúdo local e não constitui evidência oficial (ADR-034 §4.5). Carregar ou colar artefactos é permitido apenas nesta ferramenta de rascunho, claramente marcada e isolada da jornada oficial; o seu resultado é um DRAFT_VALIDATION_RESULT: local, não-autoritativo, nunca evidência. A jornada oficial nunca consome conteúdo de rascunho.",
      en: "Draft validation checks local content only and does not constitute official evidence (ADR-034 §4.5). Uploading or pasting artifacts is permitted only in this draft tool, which is clearly marked and isolated from the official journey; its result is a DRAFT_VALIDATION_RESULT: local, non-authoritative, never evidence. The official journey never consumes draft content.",
    },
    href: "/referencia/banzai",
    hrefLabel: { pt: "Referência — BanzAI", en: "Reference — BanzAI" },
    related: ["endpoint-originated-validation", "receipt", "evidence-bundle"],
    notConfuse: {
      pt: "com «validação por endpoints» — só a validação por endpoints públicos é oficial.",
      en: "with “endpoint-originated validation” — only validation from public endpoints is official.",
    },
  },
  {
    key: "canonical-origin",
    technicalId: "canonical-origin",
    name: { pt: "Origem canónica", en: "Canonical origin" },
    short: {
      pt: "A origem pública HTTPS de uma implementação, resolvida no Registo Técnico, de onde todos os seus artefactos oficiais são obtidos.",
      en: "An implementation's public HTTPS origin, resolved from the Technical Registry, from which all its official artifacts are fetched.",
    },
    full: {
      pt: "A origem canónica (canonical_origin) é a origem pública e estável de uma implementação — por exemplo https://zero.banza.network — registada no Registo Técnico e usada como base para resolver a descoberta e os restantes endpoints. A camada segura de fetch fixa o host nesta origem: um artefacto obtido de qualquer outro host é recusado. Uma implementação sem origem canónica não é um alvo de validação elegível.",
      en: "The canonical origin (`canonical_origin`) is an implementation's public, stable origin — for example https://zero.banza.network — recorded in the Technical Registry and used as the base for resolving discovery and the remaining endpoints. The secure fetcher pins the host to this origin: an artifact fetched from any other host is refused. An implementation with no canonical origin is not an eligible validation target.",
    },
    href: "/registo-tecnico",
    hrefLabel: { pt: "Registo Técnico", en: "Technical Registry" },
    related: ["discovery", "endpoint-originated-validation", "technical-registry"],
    notConfuse: {
      pt: "com uma URL fornecida pelo utilizador — a origem canónica vem do Registo Técnico, nunca do pedido.",
      en: "with a user-supplied URL — the canonical origin comes from the Technical Registry, never from the request.",
    },
  },
  {
    key: "discovery",
    technicalId: "discovery",
    name: { pt: "Descoberta", en: "Discovery" },
    short: {
      pt: "O documento publicado por uma implementação na sua origem canónica que anuncia identidade e o mapa dos seus endpoints públicos.",
      en: "The document an implementation publishes at its canonical origin, announcing its identity and the map of its public endpoints.",
    },
    full: {
      pt: "A descoberta (discovery) é o primeiro artefacto da jornada de validação: publicado na origem canónica, declara operator_id, implementation_id, protocol_version, ambiente e perfil, e o mapa dos endpoints públicos (manifest, chaves, metadata assinada, capabilities, conformidade, revogação, federação, evidence bundle, traces). O motor de descoberta verifica que a identidade coincide com o alvo resolvido e que os endpoints estão ligados ao host esperado.",
      en: "Discovery is the first artifact of the validation journey: published at the canonical origin, it declares `operator_id`, `implementation_id`, `protocol_version`, environment and profile, and the map of public endpoints (manifest, keys, signed metadata, capabilities, conformance, revocation, federation, evidence bundle, traces). The discovery engine verifies that the identity matches the resolved target and that the endpoints are bound to the expected host.",
    },
    href: "/registo-tecnico",
    hrefLabel: { pt: "Registo Técnico", en: "Technical Registry" },
    related: ["canonical-origin", "endpoint-originated-validation", "receipt"],
    notConfuse: {
      pt: "com o manifesto — a descoberta anuncia os endpoints; o manifesto descreve o operador.",
      en: "with the manifest — discovery announces the endpoints; the manifest describes the operator.",
    },
  },
  {
    key: "secure-artifact-fetcher",
    technicalId: "secure-artifact-fetcher",
    name: { pt: "Camada segura de fetch", en: "Secure artifact fetcher" },
    short: {
      pt: "O componente Rust, SSRF-hardened, que realiza toda a obtenção oficial de artefactos — nunca o navegador.",
      en: "The SSRF-hardened Rust component that performs all official artifact fetching — never the browser.",
    },
    full: {
      pt: "A camada segura de fetch (engines/banza-artifact-fetcher) é o único componente que alcança os endpoints públicos de uma implementação. É Rust (ADR-038/ADR-034 §4.7): fixa o host no Registo, exige HTTPS, bloqueia loopback/gamas privadas/link-local e a metadata de nuvem, proíbe redireccionamentos entre hosts, limita tamanho e tempo, valida o tipo de media e o TLS, recusa content-encoding não-identidade e liga cada resposta a hash, carimbo temporal e (quando aplicável) assinatura. Os motores de decisão sem rede recebem o conteúdo já obtido.",
      en: "The secure artifact fetcher (`engines/banza-artifact-fetcher`) is the only component that reaches an implementation's public endpoints. It is Rust (ADR-038 / ADR-034 §4.7): it pins the host to the Registry, requires HTTPS, blocks loopback, private ranges, link-local and cloud metadata, forbids cross-host redirects, limits size and time, validates media type and TLS, refuses non-identity content encodings, and binds every response to a hash, a timestamp and — where applicable — a signature. The network-free decision engines receive content that has already been fetched.",
    },
    href: "/referencia/banzai",
    hrefLabel: { pt: "Referência — BanzAI", en: "Reference — BanzAI" },
    related: ["endpoint-originated-validation", "canonical-origin", "receipt"],
    notConfuse: {
      pt: "com o navegador — a obtenção oficial nunca é feita pelo frontend, e o fetcher nunca decide um veredicto.",
      en: "with the browser — official fetching is never done by the frontend, and the fetcher never decides a verdict.",
    },
  },
] as const;

/** Look a term up by its semantic key. */
export function glossaryTerm(key: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find((t) => t.key === key);
}

/** The display name of a related term, per locale. Related terms are keys, so this cannot drift. */
export function relatedName(key: string, locale: Locale): string | null {
  const t = glossaryTerm(key);
  return t ? t.name[locale] : null;
}
