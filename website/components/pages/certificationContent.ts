import type { Locale } from "@/lib/i18n";

// The certification page's content, one entry per edition, under a single shape.
//
// This page was authored twice with the same eight sections, which made the difference easy to miss: the
// Portuguese edition offered seven onward destinations and the English one five. English dropped the
// BanzAI validation link, the protocol state and the glossary, sent "Operators" to a Reference chapter
// instead of the operators page, and sent "Trust" to the trust page rather than the trust chapter. The
// same page to look at; a different set of places to go from it.
//
// Portuguese is canonical. The structure lives in CertificationView; only the words are here, and each
// edition's words are its own published text, moved rather than rewritten. The two English labels that did
// not exist are faithful translations of the Portuguese ones.
//
// The distinction this page exists to hold — certification is not scheme admission, and neither is
// regulatory authorisation — is carried by the three determination cards and by the closing note, in both
// editions.

type Card = { readonly t: string; readonly b?: string; readonly d?: string; readonly k?: string; readonly id?: string; readonly layer?: string };

export type CertificationContent = {
  metaTitle: string;
  metaDescription: string;
  hero: { eyebrow: string; title: string; lede: string; chips: { label: string }[] };
  /** Eight section eyebrows, in canonical order. */
  eyebrows: string[];
  /** Three section headings, in canonical order. */
  headings: string[];
  /** Section ledes, in canonical order. */
  paragraphs: string[];
  isLabel: string;
  isNotLabel: string;
  is: string;
  isNot: string;
  noAuthority: string;
  terminalLead: string;
  terminalBody: string;
  note: string;
  /** Seven onward destination labels, in canonical order. */
  more: string[];
  chain: readonly { k: string; t: string; id: string; b: string }[];
  binding: readonly { f: string; d: string }[];
  states: readonly { s: string; d: string; tone: string }[];
  reasonCodes: readonly { c: string; d: string }[];
  determinations: readonly { layer: string; t: string; d: string }[];
};

export const CERTIFICATION_CONTENT: Record<Locale, CertificationContent> = {
  pt: {
    metaTitle: "Certificação de Conformidade e Interoperabilidade (Camada 2)",
    metaDescription:
      "A Certificação BANZA (Camada 2) é técnica, por implementação e baseada em evidência: liga uma implementação específica (por hash) a um perfil público e versionado, com âmbito, capabilities, ambiente, evidência reproduzível e janela de validade. É decidida por motores Rust, pode expirar, ser suspensa, revogada ou substituída — e não é licença, autorização regulatória nem admissão a um esquema.",
    hero: {
      eyebrow: "CERTIFICAÇÃO · CONFORMIDADE E INTEROPERABILIDADE (CAMADA 2)",
      title: "Certifica-se uma implementação. Com evidência. Decidido por motores, não por pessoas.",
      lede: "A Certificação de Conformidade e Interoperabilidade é a segunda camada institucional do BANZA: uma determinação por implementação, baseada em evidência, decidida por motores Rust, reproduzível, ligada por hash, com âmbito e prazo. Certifica que uma implementação específica demonstrou conformidade e interoperabilidade contra um perfil público e versionado — nada mais.",
      chips: [
        { label: "POR IMPLEMENTAÇÃO" },
        { label: "BASEADA EM EVIDÊNCIA" },
        { label: "DECIDIDA POR RUST" },
        { label: "COM PRAZO E ÂMBITO" },
      ],
    },
    eyebrows: ["O QUE A CERTIFICAÇÃO É — E NÃO É", "O MODELO · PERFIL → IMPLEMENTAÇÃO → REGISTO", "A QUE O REGISTO DE CERTIFICAÇÃO SE LIGA", "CICLO DE VIDA · MÁQUINA DE ESTADOS FECHADA", "REASON CODES · VOCABULÁRIO FECHADO, DECIDIDO POR RUST", "TRÊS DETERMINAÇÕES DISTINTAS", "COMO SE VERIFICA · RUST DECIDE, QWEN EXPLICA", "CONTINUAR"],
    headings: ["Três objectos, um veredicto.", "Uma certificação vive no tempo — e pode deixar de valer.", "Certificação técnica&nbsp;&ne;&nbsp;Admissão a esquema&nbsp;&ne;&nbsp;Autorização regulatória"],
    paragraphs: ["Um perfil público define o padrão; uma implementação identificada por hash é o sujeito; um registo de certificação liga os dois com a evidência e um veredicto decidido por Rust.", "Cada certificação está ligada a um conjunto fechado de campos. Fora deles, não afirma nada. É isto que a torna estreita, verificável e impossível de sobre-interpretar.", "O estado de uma certificação é governado por uma máquina de estados fechada, total e determinística, decidida apenas pelo motor Rust. Só <strong className=\"text-ink\">CERTIFIED</strong>{\" \"} se lê como válido; qualquer outro estado é não-certificado. Nenhuma pessoa, modelo ou configuração pode efectuar, alargar ou reverter uma transição, e nenhuma transição da Camada 2 se propaga para a admissão a um esquema (Camada 3) nem para o regulador.", "Cada veredicto transporta um reason_code de um enum fechado — legível por máquina, decidido apenas pelos motores Rust. O modelo local que explica (BanzAI) nunca inventa nem altera um reason code. Subconjunto ilustrativo:", "São três determinações separadas, com donos diferentes. Nenhuma implica outra. Uma certificação válida pode ser um pré-requisito para uma admissão — mas nunca a produz, e nenhuma delas produz uma autorização regulatória.", "O veredicto é produzido por motores Rust determinísticos sobre a evidência publicada, é ligado por hash e é reproduzível: qualquer terceiro re-executa a verificação e obtém os mesmos hashes, sem conta e sem confiar neste site. O registo de certificação é publicado no Registo Técnico. O BanzAI explica o que foi decidido — nunca decide, certifica nem altera um estado ou reason code.", "A validação oficial utiliza exclusivamente artefactos obtidos dos endpoints públicos da implementação seleccionada: o BanzAI resolve o alvo no Registo Técnico (operador → implementação → origem canónica → descoberta) e obtém cada artefacto por uma camada segura de fetch em Rust — nunca pelo navegador (ADR-034). O resultado é específico da implementação, do profile, da versão, do ambiente, do âmbito, dos artefactos e do momento da avaliação. Validação técnica não é certificação emitida; certificação técnica não é admissão num scheme nem autorização regulatória."],
    isLabel: "É",
    isNotLabel: "NÃO É",
    is: "A certificação BANZA é uma certificação técnica de uma implementação específica, limitada ao perfil, versão, ambiente, capabilities, âmbito e validade indicados.",
    isNot: "A certificação BANZA não constitui licença financeira, autorização regulatória, admissão automática num scheme, aprovação comercial ou garantia institucional.",
    noAuthority: "Não há autoridade certificadora, não há cadeia de certificados emitida centralmente, não se certifica uma entidade nem uma marca, não há níveis públicos de certificação, não há pontuação e não há aprovação humana. O veredicto é um facto reproduzível sobre uma implementação, decidido por motores determinísticos e verificável por qualquer terceiro.",
    terminalLead: "REVOKED é terminal.",
    terminalBody: "Um registo revogado não é reactivado: uma nova certificação é sempre um registo novo, com a sua própria evidência e janela de validade — nunca uma extensão da anterior.",
    note: "Constar como certificado não é ser admitido a um esquema nem estar autorizado a operar. A conformidade técnica não substitui obrigações legais, regulatórias, bancárias, KYC/KYB ou AML/CFT, que são inteiramente do operador.",
    more: ["Registo Técnico — onde as certificações são publicadas", "Validar com o BanzAI (prontidão de certificação)", "Referência — Conformidade e Certificação", "Operadores — registo público", "Estado verificável do protocolo", "Glossário — os conceitos, com precisão", "Confiança — avaliação verificável sem autoridade central"],
    chain: [
  {
    k: "PERFIL",
    t: "Certification Profile",
    id: "interoperability-certification-profile",
    b: "O padrão público e versionado contra o qual uma implementação é medida: as suites de conformidade, os vectores de interoperabilidade, os schemas/contratos/invariantes/endpoints exigidos e a janela de validade — cada um fixado por hash. Imutável por versão; uma alteração é uma nova profile_version. Deriva apenas dos contratos do protocolo (Camada 1), não de critérios de um operador.",
  },
  {
    k: "SUJEITO",
    t: "CertifiedImplementation",
    id: "certified-implementation",
    b: "O sujeito da certificação: uma implementação identificada por implementation_id e implementation_hash — o hash de conteúdo do conjunto exacto de artefactos testado. O declarante (declared_by) é apenas atribuição/contacto, nunca o sujeito. Um build diferente é outro sujeito, que precisa da sua própria certificação. Certifica-se uma implementação, nunca uma entidade nem uma marca.",
  },
  {
    k: "VEREDICTO",
    t: "Certification Record",
    id: "certification-record",
    b: "O objecto do veredicto: liga uma CertifiedImplementation (por implementation_hash) a um Certification Profile (por profile_id + profile_version), transportando os hashes reproduzíveis da evidência, o veredicto decidido por Rust, um estado + reason_code, o âmbito (nunca mais largo do que a evidência), a janela de validade e um record_hash sobre o todo. Afirma exactamente: esta implementação passou este perfil, nesta versão, com esta evidência, neste âmbito, até esta data.",
  },
],
    binding: [
  { f: "implementation_id + implementation_hash", d: "O sujeito — o build exacto, ligado ao hash do seu conteúdo." },
  { f: "operador (declared_by)", d: "A entidade declarante, para atribuição e contacto — nunca o sujeito da certificação." },
  { f: "profile_id + profile_version", d: "O perfil e a versão do perfil contra os quais a implementação foi medida." },
  { f: "protocol_version", d: "A versão do protocolo BANZA a que a certificação se refere." },
  { f: "environment", d: "O ambiente em que a evidência foi produzida." },
  { f: "capabilities · âmbito", d: "As superfícies de protocolo e o âmbito (níveis de conformidade e capabilities) cobertos — nunca mais largos do que a evidência." },
  { f: "evidence (hashes)", d: "Relatório de conformidade e evidence bundle reproduzíveis, ligados por hash e re-executáveis por terceiros." },
  { f: "validity (issued_at · expires_at)", d: "A janela de validade. Fora dela a certificação deixa de ser válida." },
],
    states: [
  { s: "NOT_CERTIFIED", tone: "neutral", d: "Estado por omissão (fail-closed). Não certificado — a ausência de um veredicto válido lê-se sempre assim." },
  { s: "CERTIFIED", tone: "ok", d: "Certificado, dentro do âmbito e da janela de validade, com a evidência a reproduzir. É o único estado que se lê como válido." },
  { s: "EXPIRED", tone: "neutral", d: "A janela de validade terminou. Não certificado." },
  { s: "SUSPENDED", tone: "neutral", d: "Suspenso. Não certificado enquanto durar a suspensão." },
  { s: "REVOKED", tone: "neg", d: "Revogado. Estado terminal — não regressa; a renovação é sempre um registo novo, nunca uma extensão no lugar." },
  { s: "SUPERSEDED", tone: "neutral", d: "Substituído por um registo mais recente. Não certificado." },
],
    reasonCodes: [
  { c: "OK_CONFORMANT_INTEROPERABLE", d: "Conforme e interoperável — o único veredicto positivo." },
  { c: "FAIL_CONFORMANCE", d: "Falhou a verificação de conformidade." },
  { c: "FAIL_INTEROPERABILITY", d: "Falhou a verificação de interoperabilidade." },
  { c: "FAIL_EVIDENCE_INCOMPLETE", d: "Evidência incompleta ou não reproduzível." },
  { c: "FAIL_EVIDENCE_EXPIRED", d: "Evidência fora da janela de frescura." },
  { c: "FAIL_VALIDITY_WINDOW", d: "Fora da janela de validade do registo." },
  { c: "FAIL_REVOKED", d: "Presente na lista de revogação." },
],
    determinations: [
  { t: "Certificação técnica", layer: "Camada 2 · BANZA", d: "Uma implementação demonstrou conformidade e interoperabilidade contra um perfil público. Decidida por Rust, sobre evidência." },
  { t: "Admissão a esquema", layer: "Camada 3 · esquema", d: "Um esquema operacional admite uma entidade/implementação como participante, segundo as suas próprias regras. Pode exigir certificação válida — nunca é implicada por ela." },
  { t: "Autorização regulatória", layer: "regulador", d: "O regulador competente autoriza uma actividade financeira regulada, ao abrigo do quadro legal aplicável. O BANZA não é parte: não a concede, não a representa e não a substitui." },
],
  },
  en: {
    metaTitle: "Conformance and Interoperability Certification (Layer 2)",
    metaDescription:
      "BANZA Certification (Layer 2) is technical, per implementation and evidence-based: it binds a specific implementation (by hash) to a public, versioned profile, with scope, capabilities, environment, reproducible evidence and a validity window. It is decided by Rust engines, and can expire, be suspended, revoked or superseded — and it is not a licence, regulatory authorisation or admission to a scheme.",
    hero: {
      eyebrow: "CERTIFICATION · CONFORMANCE AND INTEROPERABILITY (LAYER 2)",
      title: "An implementation is certified. With evidence. Decided by engines, not by people.",
      lede: "Conformance and Interoperability Certification is BANZA&rsquo;s second institutional layer: a per-implementation determination, evidence-based, decided by Rust engines, reproducible, hash-bound, scoped and time-limited. It certifies that a specific implementation demonstrated conformance and interoperability against a public, versioned profile — nothing more.",
      chips: [
        { label: "PER IMPLEMENTATION" },
        { label: "EVIDENCE-BASED" },
        { label: "DECIDED BY RUST" },
        { label: "SCOPED AND TIME-LIMITED" },
      ],
    },
    eyebrows: ["WHAT CERTIFICATION IS — AND IS NOT", "THE MODEL · PROFILE → IMPLEMENTATION → RECORD", "WHAT THE CERTIFICATION RECORD BINDS TO", "LIFECYCLE · CLOSED STATE MACHINE", "REASON CODES · CLOSED VOCABULARY, DECIDED BY RUST", "THREE DISTINCT DETERMINATIONS", "HOW IT IS VERIFIED · RUST DECIDES, QWEN EXPLAINS", "CONTINUE"],
    headings: ["Three objects, one verdict.", "A certification lives in time — and can stop being valid.", "Technical certification&nbsp;&ne;&nbsp;Scheme admission&nbsp;&ne;&nbsp;Regulatory authorisation"],
    paragraphs: ["A public profile defines the standard; an implementation identified by hash is the subject; a certification record binds the two with the evidence and a verdict decided by Rust.", "Every certification is bound to a closed set of fields. Outside them, it asserts nothing. That is what makes it narrow, verifiable and impossible to over-interpret.", "The state of a certification is governed by a closed, total and deterministic state machine, decided only by the Rust engine. Only <strong className=\"text-ink\">CERTIFIED</strong> reads as valid; any other state is not certified. No person, model or configuration can perform, extend or reverse a transition, and no Layer 2 transition propagates to scheme admission (Layer 3) or to the regulator.", "Every verdict carries a reason_code from a closed enum — machine-readable, decided only by the Rust engines. The local model that explains (BanzAI) never invents or changes a reason code. Illustrative subset:", "These are three separate determinations, with different owners. None implies another. A valid certification may be a prerequisite for an admission — but never produces it, and none of them produces a regulatory authorisation.", "The verdict is produced by deterministic Rust engines over the published evidence, is hash-bound and is reproducible: any third party re-runs the verification and obtains the same hashes, with no account and without trusting this site. The certification record is published in the Technical Registry. BanzAI explains what was decided — it never decides, certifies or changes a state or reason code.", "Official validation uses exclusively artifacts obtained from the selected implementation&rsquo;s public endpoints: BanzAI resolves the target in the Technical Registry (operator → implementation → canonical origin → discovery) and fetches each artifact through a secure Rust fetch layer — never through the browser (ADR-034). The result is specific to the implementation, the profile, the version, the environment, the scope, the artifacts and the moment of evaluation. Technical validation is not issued certification; technical certification is not admission to a scheme nor regulatory authorisation."],
    isLabel: "IS",
    isNotLabel: "IS NOT",
    is: "BANZA certification is a technical certification of a specific implementation, limited to the profile, version, environment, capabilities, scope and validity stated.",
    isNot: "BANZA certification does not constitute a financial licence, regulatory authorisation, automatic admission to a scheme, commercial approval or institutional guarantee.",
    noAuthority: "There is no certifying authority, no centrally issued certificate chain, no entity or brand is certified, there are no public certification tiers, no score and no human approval. The verdict is a reproducible fact about an implementation, decided by deterministic engines and verifiable by any third party.",
    terminalLead: "REVOKED is terminal.",
    terminalBody: "A revoked record is not reactivated: a new certification is always a new record, with its own evidence and validity window — never an extension of the previous one.",
    note: "Appearing as certified is not being admitted to a scheme, nor being authorised to operate. Technical conformance does not replace legal, regulatory, banking, KYC/KYB or AML/CFT obligations, which are entirely the operator&rsquo;s.",
    more: ["Technical Registry — where certifications are published", "Validate with BanzAI (certification readiness)", "Reference — Conformance and Certification", "Operators — public registry", "The protocol's verifiable state", "Glossary — the concepts, precisely", "Trust — verifiable evaluation with no central authority"],
    chain: [
  {
    k: "PROFILE",
    t: "Certification Profile",
    id: "interoperability-certification-profile",
    b: "The public, versioned standard an implementation is measured against: the conformance suites, the interoperability vectors, the required schemas/contracts/invariants/endpoints and the validity window — each fixed by hash. Immutable per version; a change is a new profile_version. It derives only from the protocol contracts (Layer 1), never from an operator's criteria.",
  },
  {
    k: "SUBJECT",
    t: "CertifiedImplementation",
    id: "certified-implementation",
    b: "The subject of certification: an implementation identified by implementation_id and implementation_hash — the content hash of the exact artifact set tested. The declarant (declared_by) is attribution and contact only, never the subject. A different build is a different subject, needing its own certification. An implementation is certified, never an entity and never a brand.",
  },
  {
    k: "VERDICT",
    t: "Certification Record",
    id: "certification-record",
    b: "The verdict object: it binds a CertifiedImplementation (by implementation_hash) to a Certification Profile (by profile_id + profile_version), carrying the reproducible evidence hashes, the verdict decided by Rust, a state + reason_code, the scope (never broader than the evidence), the validity window and a record_hash over the whole. It asserts exactly: this implementation passed this profile, at this version, with this evidence, in this scope, until this date.",
  },
],
    binding: [
  { f: "implementation_id + implementation_hash", d: "The subject — the exact build, bound to the hash of its content." },
  { f: "operator (declared_by)", d: "The declaring entity, for attribution and contact — never the subject of the certification." },
  { f: "profile_id + profile_version", d: "The profile and profile version the implementation was measured against." },
  { f: "protocol_version", d: "The BANZA protocol version the certification refers to." },
  { f: "environment", d: "The environment in which the evidence was produced." },
  { f: "capabilities · scope", d: "The protocol surfaces and the scope (conformance levels and capabilities) covered — never broader than the evidence." },
  { f: "evidence (hashes)", d: "Reproducible conformance report and evidence bundle, hash-linked and re-runnable by third parties." },
  { f: "validity (issued_at · expires_at)", d: "The validity window. Outside it the certification is no longer valid." },
],
    states: [
  { s: "NOT_CERTIFIED", tone: "neutral", d: "The default state (fail-closed). Not certified — the absence of a valid verdict always reads this way." },
  { s: "CERTIFIED", tone: "ok", d: "Certified, within scope and within the validity window, with the evidence reproducing. It is the only state that reads as valid." },
  { s: "EXPIRED", tone: "neutral", d: "The validity window has ended. Not certified." },
  { s: "SUSPENDED", tone: "neutral", d: "Suspended. Not certified for the duration of the suspension." },
  { s: "REVOKED", tone: "neg", d: "Revoked. A terminal state — it does not come back; a renewal is always a new record, never an extension in place." },
  { s: "SUPERSEDED", tone: "neutral", d: "Superseded by a more recent record. Not certified." },
],
    reasonCodes: [
  { c: "OK_CONFORMANT_INTEROPERABLE", d: "Conformant and interoperable — the only positive verdict." },
  { c: "FAIL_CONFORMANCE", d: "Failed the conformance verification." },
  { c: "FAIL_INTEROPERABILITY", d: "Failed the interoperability verification." },
  { c: "FAIL_EVIDENCE_INCOMPLETE", d: "Evidence incomplete or not reproducible." },
  { c: "FAIL_EVIDENCE_EXPIRED", d: "Evidence outside the freshness window." },
  { c: "FAIL_VALIDITY_WINDOW", d: "Outside the record's validity window." },
  { c: "FAIL_REVOKED", d: "Present on the revocation list." },
],
    determinations: [
  { t: "Technical certification", layer: "Layer 2 · BANZA", d: "An implementation demonstrated conformance and interoperability against a public profile. Decided by Rust, over evidence." },
  { t: "Admission to a scheme", layer: "Layer 3 · scheme", d: "An operational scheme admits an entity/implementation as a participant, under its own rules. It may require valid certification — it is never implied by it." },
  { t: "Regulatory authorisation", layer: "regulator", d: "The competent regulator authorises a regulated financial activity, under the applicable legal framework. BANZA is not a party: it does not grant it, does not represent it and does not replace it." },
],
  },
};
