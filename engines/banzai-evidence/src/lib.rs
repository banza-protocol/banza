//! BanzAI deterministic evidence engine (ADR-043, R2).
//!
//! This is the Rust port of the former `website/components/home/banzaiKb.ts`. It owns the
//! algorithm: normalization, guardrails, intent routing, the decision library, citation and
//! evidence-bundle composition, and the "insufficient evidence" fallback. It is NOT generative:
//! no LLM, no fetch, no provider, no GPU, no external call. Truth comes from the BANZA knowledge base;
//! this engine only structures, explains and cites. It never certifies, approves or issues.
//!
//! Compiles native (CLI + `cargo test`) and to WASM (`answer_query` for the website). The website
//! becomes a thin adapter that calls this engine and renders the JSON.

pub mod index;

use serde::Serialize;
use unicode_normalization::UnicodeNormalization;

pub const ENGINE: &str = "banzai-evidence";
pub const ENGINE_VERSION: &str = "0.2.0";

// ── Normalization ──────────────────────────────────────────────────────────────

/// Accent- and case-insensitive normalization for deterministic matching
/// (mirrors the former TS `norm`: lowercase + NFD + strip combining diacritics).
pub fn normalize(s: &str) -> String {
    s.nfd()
        .filter(|c| !('\u{0300}'..='\u{036F}').contains(c))
        .collect::<String>()
        .to_lowercase()
}

// ── Data model (serialized to match the TS KbAnswer, plus R2 additions) ─────────

#[derive(Serialize, Clone)]
pub struct CiteLink {
    pub label: String,
    pub href: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KbAnswer {
    pub intent: String,
    /// "answer" | "refusal" | "uncertain"
    pub kind: String,
    pub text: String,
    pub cites: Vec<String>,
    pub links: Vec<CiteLink>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limits: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub follow_ups: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub evidence: Option<index::EvidenceBundle>,
    pub engine: String,
    pub engine_version: String,
    pub llm_calls: u32,
    pub external_model_called: bool,
}

fn cl(label: &str, href: &str) -> CiteLink {
    CiteLink {
        label: label.into(),
        href: href.into(),
    }
}

/// Canonical citation targets — ONLY routes that exist on the site (mirrors the TS `C`).
fn c(key: &str) -> CiteLink {
    let (l, h) = match key {
        "ref" => ("Referência BANZA", "/referencia"),
        "banzai" => ("§10 · BanzAI", "/referencia/banzai"),
        "cert" => ("§6 · Certificação", "/referencia/certificacao"),
        "ops" => ("§8 · Operadores", "/referencia/operadores"),
        "dev" => ("§12 · Programadores", "/referencia/programadores"),
        "fed" => ("§7 · Federação", "/referencia/federacao"),
        "trust" => ("§5 · Confiança", "/referencia/confianca"),
        "gov" => ("§9 · Governação", "/referencia/governacao"),
        "arch" => ("§4 · Arquitectura", "/referencia/arquitectura"),
        "estado" => ("Estado verificável", "/estado"),
        "operators" => ("/operators", "/operators"),
        "certificates" => ("/certificates", "/certificates"),
        "decisoes" => ("Decisões (ADRs/RFCs)", "/decisoes"),
        "simb" => ("SimB Pre-Review Gate", "/banzai"),
        "bundle" => ("Evidence Bundle", "/banzai"),
        "manifest" => ("Operator Manifest Validator", "/banzai"),
        "l1" => ("L1 Readiness", "/banzai"),
        "l2" => ("L2 Readiness / Fluxo de pagamento", "/banzai"),
        "l3" => ("L3 Readiness / Federação", "/banzai"),
        "l4" => ("L4 Readiness / Interoperabilidade externa", "/banzai"),
        "assurance" => ("Security & Risk Assurance", "/banzai"),
        "m2" => ("M2 Protocol Production", "/banzai"),
        "ceremony" => ("M2.1 Root Trust Ceremony", "/banzai"),
        "opengov" => ("M2.2 Open Protocol Governance", "/banzai"),
        "trustmodel" => ("M2.3 Reference Trust Model", "/banzai"),
        _ => ("Referência BANZA", "/referencia"),
    };
    cl(l, h)
}

// ── Decision library (data-driven, never invented) ──────────────────────────────

pub struct Decision {
    pub id: &'static str,
    pub title: &'static str,
    pub summary: &'static str,
    pub url: &'static str,
    pub cite: &'static str,
    pub keywords: &'static [&'static str],
}

pub const DECISIONS: &[Decision] = &[
    Decision {
        id: "ADR-002", title: "Ecosystem Naming Inversion", url: "/decisoes/adr-002", cite: "ADR-002",
        summary: "fixa a nomenclatura e a separação estrita do ecossistema: a Governação evolui as regras, o BANZA define o protocolo, a Protocol Governance mantém e evolui o protocolo (nunca autoriza operadores), o BanzAI explica (nunca certifica) e os operadores independentes implementam. A dependência corre numa única direcção — os operadores dependem do BANZA; o BANZA nunca depende de nenhum operador.",
        keywords: &["adr-002", "adr 002", "adr002", "nomenclatura", "naming", "hierarquia", "inversao", "ecossistema"],
    },
    Decision {
        id: "ADR-001", title: "Protocol/Operator Separation", url: "/decisoes/adr-001", cite: "ADR-001",
        summary: "estabelece a fronteira entre o protocolo e a lógica de negócio de cada operador: o BANZA define regras e verificação; o operador implementa, opera e assume as obrigações (incluindo KYC/KYB e AML/CFT) na sua própria infraestrutura.",
        keywords: &["adr-001", "adr 001", "adr001", "separacao de operador", "separacao operador", "fronteira operador"],
    },
    Decision {
        id: "ADR-041", title: "Operador Zero — Reference Operator Simulator", url: "/decisoes/adr-041", cite: "ADR-041",
        summary: "define o Operador Zero, o operador de referência/demonstração do protocolo: um simulador canónico que demonstra as capacidades do protocolo de ponta a ponta sem ser proprietário dele. Serve de exemplo e demonstração — apenas demonstração, nunca um operador real ou publicado —, não confere autoridade nem estatuto especial.",
        keywords: &["adr-041", "adr 041", "adr041", "operador de referencia", "reference operator", "operador zero"],
    },
    Decision {
        id: "ADR-031", title: "Federation Trust Evaluation", url: "/decisoes/adr-031", cite: "ADR-031",
        summary: "define como operadores conformes confiam uns nos outros para federar: uma Federation Trust Evaluation feita pela própria parte que faz o routing, sobre material público (signed protocol metadata, conformance evidence, public protocol registry, trust root/chaves delegadas e revocation/fail-closed), sem certificado emitido pela BANZA e sem passo humano. A federação de produção depende do marco M3.",
        keywords: &["adr-031", "adr 031", "adr031", "modelo de confianca da federacao", "federation trust"],
    },
    Decision {
        id: "ADR-027", title: "Open Protocol Trust Model Without CA", url: "/decisoes/adr-027", cite: "ADR-027",
        summary: "define o modelo de trust aberto do protocolo, sem autoridade central: a Chave Raiz offline (custódia por threshold 2-de-3) assina apenas metadata, chaves delegadas e revogação, o signed key manifest distribui o trust-anchor, e as chaves delegadas são domain-separated e geridas offline, separadas da infraestrutura em linha. Depende do marco M2.",
        keywords: &["adr-027", "adr 027", "adr027", "raiz de producao", "production root", "modelo de trust aberto"],
    },
    Decision {
        id: "ADR-028", title: "Root authorization: three authorities, threshold two", url: "/decisoes/adr-028", cite: "ADR-028",
        summary: "A Trust Root é controlada por três autoridades de assinatura independentes; qualquer acção autorizada exige duas assinaturas de duas delas. Uma assinatura isolada nunca autoriza, e duas assinaturas da mesma autoridade contam como uma.",
        keywords: &["adr-028", "adr 028", "adr028", "limiar da raiz", "root threshold", "2-de-3", "duas de tres"],
    },
    Decision {
        id: "ADR-029", title: "Private keys never on serving infrastructure", url: "/decisoes/adr-029", cite: "ADR-029",
        summary: "estabelece que as chaves privadas nunca residem na infraestrutura que serve tráfego: o material de assinatura fica isolado da superfície pública, reduzindo o risco de comprometimento em linha.",
        keywords: &["adr-029", "adr 029", "adr029", "chaves privadas", "private keys", "serving infrastructure"],
    },
    Decision {
        id: "ADR-032", title: "KYC stays operator policy; only Trust Assertions federate", url: "/decisoes/adr-032", cite: "ADR-032",
        summary: "mantém o KYC como política do operador: o protocolo não centraliza KYC — apenas Trust Assertions podem federar entre operadores. As obrigações de identidade ficam do lado do operador e das autoridades competentes.",
        keywords: &["adr-032", "adr 032", "adr032", "kyc", "trust assertion", "trust assertions"],
    },
];

/// Detect an ADR reference regardless of separator ("ADR-002"/"ADR 002"/"adr002"), else keyword match.
/// `t` must already be normalized.
pub fn find_decision(t: &str) -> Option<&'static Decision> {
    if let Some(n) = extract_adr_number(t) {
        let id = format!("ADR-{:03}", n);
        if let Some(d) = DECISIONS.iter().find(|d| d.id == id) {
            return Some(d);
        }
    }
    DECISIONS
        .iter()
        .find(|d| d.keywords.iter().any(|k| t.contains(k)))
}

/// Extract the number from `adr[\s_-]?0*(\d{1,3})`.
fn extract_adr_number(t: &str) -> Option<u32> {
    let b = t.as_bytes();
    let mut i = 0;
    while let Some(p) = t[i..].find("adr") {
        let mut j = i + p + 3;
        while j < b.len() && matches!(b[j], b' ' | b'_' | b'-') {
            j += 1;
        }
        let start = j;
        let mut n: u32 = 0;
        while j < b.len() && b[j].is_ascii_digit() && j - start < 3 {
            n = n * 10 + (b[j] - b'0') as u32;
            j += 1;
        }
        if j > start {
            return Some(n);
        }
        i = i + p + 3;
    }
    None
}

fn adr_link(id: &str) -> CiteLink {
    match DECISIONS.iter().find(|d| d.id == id) {
        Some(d) => cl(d.cite, d.url),
        None => c("decisoes"),
    }
}

fn mk(
    intent: &str,
    kind: &str,
    text: &str,
    links: Vec<CiteLink>,
    limits: Option<Vec<&str>>,
    follow: Option<Vec<&str>>,
) -> KbAnswer {
    let cites = links.iter().map(|l| l.label.clone()).collect();
    KbAnswer {
        intent: intent.into(),
        kind: kind.into(),
        text: text.into(),
        cites,
        links,
        limits: limits.map(|v| v.into_iter().map(String::from).collect()),
        follow_ups: follow.map(|v| v.into_iter().map(String::from).collect()),
        evidence: None,
        engine: ENGINE.into(),
        engine_version: ENGINE_VERSION.into(),
        llm_calls: 0,
        external_model_called: false,
    }
}

// ── The engine — guardrails first, then intents, then fallback ──────────────────

/// Deterministic intent answer (no evidence retrieval). Mirrors the former `banzaiKb(raw)`.
pub fn answer(raw: &str) -> KbAnswer {
    let t = normalize(raw);
    let has = |ks: &[&str]| ks.iter().any(|k| t.contains(&normalize(k)));

    // ── 1. Guardrails first (order matters) ──
    if has(&[
        "ignora as regras",
        "ignora regras",
        "ignora a falha",
        "ignora falha",
        "ignora o fail",
        "ignora este fail",
        "esconde o fail",
        "faz passar",
        "faz-me passar",
        "forca o pass",
        "força o pass",
        "passa mesmo com erro",
        "passa mesmo",
        "contorna",
        "burla",
        "esconde",
        "esconder falha",
        "salta a conformidade",
        "sem testes",
        "sem conformidade",
        "aprova sem",
    ]) {
        return mk("malicious_or_bypass", "refusal",
            "Não. Os guardrails do BanzAI não são revogáveis por instruções do utilizador. O BanzAI não contorna a conformidade, não esconde falhas nem aprova sem evidência. A conformidade é determinada por testes determinísticos e evidência publicada — não por uma resposta de IA. Um PASS é evidência técnica de conformidade; ninguém aceita nem aprova operadores por decisão humana central.",
            vec![c("banzai"), c("cert"), c("estado")],
            Some(vec!["O BanzAI não decide, não certifica e não aprova.", "PASS é evidência técnica, não certificação.", "O estado público continua pré-produção."]), None);
    }
    // ── M2.7H · BanzAI rule/architecture provenance — EARLY short-circuit (before the topical trust/
    // federation intents), so "BanzAI pode mudar o trust/federation/registry model?" and "BanzAI pode
    // criar/adicionar regras/decisões?" land on the provenance answers, never on a topical intent. ──
    if has(&["banzai"])
        && has(&[
            "muda o trust model",
            "mudar o trust model",
            "muda trust model",
            "mudar trust model",
            "muda o federation model",
            "mudar o federation model",
            "muda federation model",
            "mudar federation model",
            "muda o registry model",
            "mudar o registry model",
            "muda registry model",
            "mudar registry model",
            "actualiza invariantes",
            "atualiza invariantes",
            "altera invariantes",
            "muda os invariantes",
            "mudar os invariantes",
            "decide arquitectura",
            "decide a arquitectura",
            "adiciona decisao arquitectural",
            "adiciona uma decisao arquitectural",
            "adicionar decisao arquitectural",
            "adicionar uma decisao arquitectural",
            "cria decisao arquitectural",
            "criar decisao arquitectural",
        ])
    {
        return mk("banzai_no_architectural_decision", "answer",
            "Não. BanzAI não adiciona decisões arquitecturais nem muda o trust model, o federation model, o registry model ou os invariantes. Mudanças desse tipo entram no BANZA por processo formal de governança: proposta, ADR/RFC, revisão, testes, merge, release e publicação oficial.",
            vec![c("gov"), c("decisoes"), c("trust")],
            Some(vec!["Decisões arquitecturais entram por governança formal, não por BanzAI."]), None);
    }
    if has(&["banzai"])
        && has(&[
            "pode criar regras",
            "cria regras",
            "criar regras",
            "pode definir regras",
            "define regras",
            "inventa regra",
            "inventar regra",
            "pode inventar",
            "pode criar um adr",
            "cria adr",
            "pode adicionar regras",
            "adiciona regras",
        ])
    {
        return mk("banzai_cannot_create_rules", "answer",
            "Não. BanzAI não cria, não define e não inventa regras do protocolo. Guia com base na Referência BANZA, ADRs, RFCs, specs, contracts, schemas, invariants e outputs dos motores Rust/WASM. Pode ajudar a identificar lacunas e a redigir propostas RFC/ADR, mas nunca as activa. Output de IA nunca é regra do protocolo.",
            vec![c("banzai"), c("ref"), c("gov"), c("decisoes")],
            Some(vec!["BanzAI não inventa regras.", "Uma sugestão do BanzAI é proposta, não regra activa."]),
            Some(vec!["Quem cria regras do protocolo?", "E se o protocolo não tiver regra para o caso?"]));
    }
    // ── M2.4 · The trust engine (banza-trust) — ACTIVE model ─────────────────────────────────────
    // The trust engine computes a trust_status IN RUST from signed protocol metadata, delegated signing
    // keys, operator manifests, conformance evidence, the public protocol registry and revocation/
    // fail-closed. There is no operator certificate, no CA signature, no human approval, no "triple
    // verification". These intents are placed HERE — after the bypass guard and BEFORE the certification-
    // refusal guard — so that trust-engine questions ("o trust engine certifica operadores?") land on
    // these informative answers instead of the generic refusal, and so the definition/scenario questions
    // are not stolen by the later reference_trust_model / brl_revocation intents. Every keyword is anchored
    // to the trust engine or to a specific fail-closed scenario, so a generic certification request (no
    // "trust engine") still falls through to the certification-refusal guard below.

    // Boundary — the trust engine does NOT certify, authorise payments, move funds or replace a licence.
    if has(&[
        "trust engine certifica",
        "trust engine autoriza",
        "trust engine substitui",
        "trust engine emite",
        "trust engine aprova",
        "trust engine da licenca",
        "trust engine e licenca",
        "banza-trust certifica",
        "banza trust certifica",
        "banza-trust autoriza",
        "banza trust autoriza",
        "banza-trust substitui",
        "banza trust substitui",
    ]) {
        return mk("trust_engine_boundary", "answer",
            "Não. O trust engine (banza-trust) não certifica operadores, não autoriza pagamentos, não movimenta fundos e não substitui licença nem autorização regulatória. Ele apenas calcula, em Rust, um trust_status a partir de signed protocol metadata, delegated signing keys, operator manifest, conformance evidence, public protocol registry e revocation/fail-closed — uma decisão local sobre a compatibilidade de uma interacção, não um juízo sobre a entidade. BANZA é um protocolo financeiro aberto. Operadores independentes implementam o protocolo, publicam manifests e demonstram compatibilidade por evidência verificável de conformidade. Quem autoriza a prestação de serviços financeiros reais é o regulador competente; qualquer licença pertence ao operador, nunca ao protocolo.",
            vec![c("trust"), c("cert"), c("ops"), c("fed")],
            Some(vec!["O trust engine não certifica, não autoriza pagamentos, não move fundos e não substitui licença.", "Calcula um trust_status em Rust — decisão local sobre a interacção, não sobre a entidade.", "A autorização para serviços financeiros reais pertence ao regulador; a licença pertence ao operador."]),
            Some(vec!["Como o trust engine valida compatibilidade?", "O que mudou no banza-trust?"]));
    }
    // Compatibility — how the trust engine evaluates (conjunctive, fail-closed, status computed in Rust).
    if has(&[
        "trust engine valida",
        "trust engine verifica",
        "trust engine avalia",
        "como funciona o trust engine",
        "banza-trust valida",
        "banza trust valida",
        "como funciona o banza-trust",
    ]) {
        return mk("trust_engine_compatibility", "answer",
            "O trust engine (banza-trust) avalia a compatibilidade protocolar de forma conjuntiva e fail-closed. Verifica a root metadata do protocolo, a signed protocol metadata, a delegated signing key e a respectiva assinatura, a frescura da metadata (não expirada), a compatibilidade de versão de protocolo, o operator manifest, a conformance evidence, a presença no public protocol registry e a ausência da revocation list. Se qualquer material de trust estiver ausente, inválido, expirado, revogado ou incompatível, a avaliação falha fechada (fail-closed). O trust_status é calculado em Rust — o adaptador TypeScript apenas carrega o WASM, marshaliza o input e mostra o resultado; nunca valida assinaturas, revogação, frescura ou fronteira. Nada disto certifica, autoriza nem aprova o operador: é uma decisão local sobre a compatibilidade da interacção.",
            vec![c("trust"), c("fed"), c("trustmodel"), c("dev")],
            Some(vec!["Avaliação conjuntiva e fail-closed: qualquer material ausente, inválido, expirado, revogado ou incompatível reprova.", "O trust_status é calculado em Rust; o TypeScript apenas carrega o WASM e mostra o resultado.", "Compatibilidade não é certificação, autorização nem aprovação de operador."]),
            Some(vec!["O que é signed protocol metadata?", "O que acontece se a assinatura for inválida?"]));
    }
    // Definitions — signed protocol metadata & delegated signing key (active model).
    if has(&[
        "signed protocol metadata",
        "metadata assinada",
        "metadados assinados",
        "delegated signing key",
        "delegated key",
        "chave de assinatura delegada",
    ]) {
        return mk("trust_engine_metadata", "answer",
            "No modelo activo do BANZA, a signed protocol metadata é o documento assinado que descreve o estado do protocolo — root metadata, chaves válidas, delegações, política de frescura e revogação — e serve de âncora verificável de trust. A delegated signing key (chave de assinatura delegada) é distinta da Trust Root: a raiz assina apenas metadata, delegações, rotação e revogação, e delega em chaves específicas a assinatura de releases, evidência e artefactos. O trust engine (banza-trust) confirma que a signed protocol metadata está assinada por uma delegated signing key válida, dentro da política de frescura e ausente da revocation list — fail-closed se algo faltar, estiver inválido, expirado ou revogado. É material público e verificável; não é licença, aprovação humana nem autorização de operador.",
            vec![c("trust"), c("trustmodel"), c("fed")],
            Some(vec!["Signed protocol metadata é material público e verificável, assinado por uma delegated signing key.", "A Trust Root assina metadata e delegações; as delegated signing keys assinam releases, evidência e artefactos.", "Não é licença, aprovação humana nem autorização de operador."]),
            Some(vec!["Como o trust engine valida compatibilidade?", "O que acontece se a metadata estiver expirada?"]));
    }
    // Fail-closed scenarios — invalid signature, missing conformance evidence, revoked operator, expired metadata.
    if has(&[
        "assinatura for invalida",
        "assinatura invalida",
        "assinatura e invalida",
        "faltar conformance evidence",
        "falta conformance evidence",
        "sem conformance evidence",
        "conformance evidence em falta",
        "operador revogado",
        "operador esta revogado",
        "estiver revogado",
        "metadata estiver expirada",
        "metadata expirada",
        "metadata esta expirada",
        "metadata expirou",
        "metadata fora de validade",
    ]) {
        return mk("trust_engine_fail_closed", "answer",
            "O trust engine (banza-trust) é fail-closed: qualquer material de trust ausente, inválido, expirado, revogado ou incompatível reprova a avaliação. Em concreto — assinatura inválida reprova com TRUST_INVALID_SIGNATURE; conformance evidence em falta reprova; operador revogado reprova com TRUST_REVOKED; signed protocol metadata expirada reprova (metadata expirada, fora da política de frescura); operator manifest em falta reprova; ausência do public protocol registry reprova; versão de protocolo incompatível reprova; e input malformado reprova. Nunca falha aberto: na dúvida, fecha. O trust_status é calculado em Rust; o TypeScript apenas carrega o WASM e mostra o resultado. Cada reprovação é uma decisão local sobre a interacção — não é sanção, não é licença e não é juízo sobre a entidade.",
            vec![c("trust"), c("fed"), c("trustmodel")],
            Some(vec!["Fail-closed: assinatura inválida (TRUST_INVALID_SIGNATURE), conformance evidence em falta, operador revogado (TRUST_REVOKED), metadata expirada, manifest ou registry em falta, versão incompatível — tudo reprova.", "Nunca falha aberto; o trust_status é calculado em Rust.", "Reprovação é decisão local sobre a interacção, não sanção nem licença."]),
            Some(vec!["Como o trust engine valida compatibilidade?", "O trust engine certifica operadores?"]));
    }
    // What the banza-trust engine does (active model only — no transition narrative).
    if has(&[
        "mudou no banza-trust",
        "mudou no banza trust",
        "banza-trust mudou",
        "banza trust mudou",
        "mudanca no banza-trust",
        "mudanca no banza trust",
    ]) {
        return mk("trust_engine_changed", "answer",
            "O banza-trust valida a compatibilidade protocolar através de signed protocol metadata, delegated signing keys, operator manifests, conformance evidence, public protocol registry e revocation/fail-closed, com o trust_status calculado em Rust. BANZA é um protocolo financeiro aberto. Operadores independentes implementam o protocolo, publicam manifests e demonstram compatibilidade por evidência verificável de conformidade. O trust do protocolo é avaliado por signed protocol metadata, delegated signing keys, public protocol registry e revocation/fail-closed. A avaliação é conjuntiva e fail-closed — qualquer material ausente, inválido, expirado, revogado ou incompatível reprova — e é uma decisão local sobre a interacção, não uma certificação, autorização ou aprovação de operador.",
            vec![c("trust"), c("trustmodel"), c("fed"), c("decisoes")],
            Some(vec!["O banza-trust valida signed protocol metadata, delegated signing keys, manifests, conformance evidence, registry e revocation/fail-closed.", "O trust_status é calculado em Rust; a avaliação é conjuntiva e fail-closed.", "Não certifica, não autoriza e não aprova operadores."]),
            Some(vec!["Como o trust engine valida compatibilidade?", "O trust engine certifica operadores?"]));
    }
    // ── M2.6 · Trust architecture (active model) ─────────────────────────────────────────────────────
    // "Como funciona a arquitectura de trust?" — the whole trust model in one answer: signed protocol
    // metadata + delegated signing keys + operator manifests + conformance evidence + public protocol
    // registry + revocation/fail-closed, with the Trust Root (2-of-3) signing protocol material only —
    // never operators, payments or licences. Placed here so the arquitectura-framed trust/confiança
    // questions land on the active model instead of the older trust_chain answer. Anchored to
    // "arquitectura/arquitetura/estrutura de trust/confianca" + "como funciona … do protocolo", so it does
    // not steal reference_trust_model ("modelo de trust") nor trust_chain's pinned "cadeia de confiança".
    if has(&[
        "arquitectura de trust",
        "arquitetura de trust",
        "arquitectura de confianca",
        "arquitectura de confiança",
        "arquitetura de confianca",
        "arquitetura de confiança",
        "arquitectura da confianca",
        "arquitectura da confiança",
        "arquitetura da confianca",
        "arquitetura da confiança",
        "como funciona a arquitectura de trust",
        "como funciona a arquitetura de trust",
        "como e a arquitectura de trust",
        "como é a arquitectura de trust",
        "estrutura de trust",
        "estrutura de confianca",
        "estrutura de confiança",
        "estrutura da confianca",
        "estrutura da confiança",
        "como funciona o trust do protocolo",
        "como funciona a confianca do protocolo",
        "como funciona a confiança do protocolo",
    ]) {
        return mk("trust_architecture", "answer",
            "A arquitectura de trust do BANZA assenta em material assinado e verificável, não numa autoridade humana central. As peças são: signed protocol metadata (o documento assinado que descreve o estado do protocolo), delegated signing keys (chaves de assinatura delegadas pela Trust Root), operator manifests (publicados pelos próprios operadores), conformance evidence (evidência verificável de conformidade), o public protocol registry (um índice verificável, não uma lista de aprovados ou certificados) e revocation/fail-closed. A Trust Root (2-de-3, três custodians independentes) assina apenas material do protocolo — metadata, delegated signing keys, releases e listas de revogação; NUNCA assina, autoriza ou aprova operadores, pagamentos ou licenças. A avaliação de trust é conjuntiva e fail-closed — qualquer material ausente, inválido, expirado, revogado ou incompatível reprova — e é calculada em Rust (banza-trust) como uma decisão local sobre uma interacção, não um juízo sobre a entidade. BANZA é um protocolo financeiro aberto: operadores independentes implementam o protocolo, publicam manifests e demonstram compatibilidade por evidência verificável de conformidade. Humanos mantêm e evoluem o protocolo; não autorizam, aceitam, aprovam nem certificam operadores.",
            vec![c("trust"), c("trustmodel"), c("fed"), c("gov")],
            Some(vec!["Trust = signed protocol metadata + delegated signing keys + operator manifests + conformance evidence + public protocol registry + revocation/fail-closed.", "A Trust Root (2-de-3) assina metadata, delegated signing keys, releases e revogações — nunca operadores, pagamentos ou licenças.", "Avaliação conjuntiva e fail-closed, calculada em Rust; decisão local sobre a interacção, não certificação de operador."]),
            Some(vec!["O que é Trust Root?", "O que é public protocol registry?"]));
    }
    // ── M2.5/M2.7L · BanzAI-guided operator path ───────────────────────────────────────────────────────
    // For operators, the public verification path is BanzAI-guided; the operator's implementation is
    // validated by verifiable artifacts, not by any particular tool. These intents match tool questions
    // and answer them positively (no anti-path tool list). They are
    // placed HERE — after the bypass/trust-engine guards and BEFORE the certification-refusal guard,
    // m2_production, m2_m3_status, developer_quickstart, who_accepts_operators and the operator intents —
    // so the apenas no BanzAI questions land on these answers instead of being stolen downstream. Every
    // keyword is anchored to a apenas no BanzAI phrasing so it never steals a pinned CASE: the cert-refusal
    // imperatives ("certifica o meu operador", "aprova este operador"), "Por onde começar a implementar?"
    // (developer_quickstart, "por onde comecar"≠"por onde comeco"), the M2 boundary phrasings
    // ("M2 transforma BANZA em PSP?", "M2 activa operadores?" → m2_production) and "M2 está activo?"
    // (m2_m3_status) all fall through untouched.

    // Boundary — neither BanzAI nor the protocol certifies operators. Placed before the
    // certification-refusal guard so "o BanzAI certifica?" / "o BANZA certifica operadores?" land on an
    // informative NO. Anchored to banzai/banza/protocolo + certifica/aprova, so the cert-refusal
    // imperatives (which have no such subject) are not stolen.
    if has(&[
        "workbench certifica",
        "o workbench certifica",
        "workbench aprova",
        "o workbench aprova",
        "workbench emite certificado",
        "o workbench emite certificado",
        "banza certifica operadores",
        "o banza certifica operadores",
        "banza certifica operador",
        "o banza certifica operador",
        "o banza certifica",
        "protocolo certifica operadores",
        "o protocolo certifica operadores",
        "banzai workbench certifica",
        "o banzai workbench certifica",
    ]) {
        return mk("workbench_no_certification", "answer",
            "Não. O BanzAI não certifica e o BANZA não certifica operadores. O BanzAI executa validações técnicas — preparar o manifest, correr a conformidade, verificar signed protocol metadata, avaliar revocation/fail-closed e gerar um evidence bundle — produzindo evidência verificável de conformidade; não emite certificados, não aprova e não cria operadores (não altera /operators). BANZA é um protocolo financeiro aberto: a conformidade demonstra-se por evidência verificável publicada pelo operador, não por uma autoridade humana central. Um PASS técnico é evidência verificável de conformidade, não aprovação humana, licença ou certificação. Quem autoriza a prestação de serviços financeiros reais é o regulador competente; a licença pertence ao operador.",
            vec![c("cert"), c("ops"), c("bundle"), c("operators")],
            Some(vec!["O BanzAI não certifica; o BANZA não certifica operadores.", "PASS técnico é evidência verificável de conformidade, não aprovação humana, licença ou certificação.", "A autorização para serviços financeiros reais pertence ao regulador; a licença pertence ao operador."]),
            Some(vec!["Como começo como operador?", "Como corro a conformidade?"]));
    }
    // M2/M3 are roadmap & governance milestones — NOT operator tools. Placed before m2_production (which
    // owns the M2 boundary questions) and m2_m3_status. Keywords are the "what is / milestones / roadmap"
    // framing only, so boundary phrasings stay with m2_production and "M2 está activo?" with m2_m3_status.
    if has(&[
        "o que e m2",
        "o que é m2",
        "o que e o m2",
        "o que é o m2",
        "o que e m3",
        "o que é m3",
        "o que e o m3",
        "o que é o m3",
        "o que sao m2 e m3",
        "o que são m2 e m3",
        "o que e m2 e m3",
        "o que é m2 e m3",
        "milestones",
        "milestone",
        "marcos m2",
        "marco m2",
        "marco m3",
        "marcos m3",
        "marcos do protocolo",
        "marcos m2/m3",
        "marcos do roadmap",
        "roadmap",
        "roteiro do protocolo",
    ]) {
        return mk("m2_m3_roadmap", "answer",
            "M2 e M3 são marcos de roadmap e de governação do protocolo — etapas da evolução e maturação do BANZA enquanto protocolo financeiro aberto —, não ferramentas nem passos que um operador tenha de executar. Um operador não precisa de M2 nem de M3 para preparar o manifest, correr a conformidade, validar trust ou gerar um evidence bundle: o caminho público do operador é o BanzAI (Manifest → Conformidade → Trust → Federação → Evidence Bundle → Traces). Os marcos são responsabilidade dos maintainers do protocolo — specs, versões, segurança, cerimónia de trust, governação de release. Os humanos mantêm e evoluem o protocolo; não autorizam, aceitam, aprovam nem certificam operadores. A conformidade demonstra-se por evidência verificável de conformidade, não por um marco.",
            vec![c("gov"), c("ops"), c("estado"), c("manifest")],
            Some(vec!["M2 e M3 são marcos de roadmap/governação, não ferramentas de operador.", "O operador não precisa de M2/M3 para preparar manifest, correr conformidade, validar trust ou gerar evidence bundle — o caminho público é o BanzAI.", "Humanos mantêm o protocolo; não autorizam, aceitam, aprovam nem certificam operadores."]),
            Some(vec!["Como começo como operador?", "Como corro a conformidade?"]));
    }
    // Getting started as an operator — self-publication via BanzAI flow. Placed before
    // developer_quickstart; keywords are operator-anchored ("... como operador", "por onde comeco", "quero
    // ser operador") so they never steal "Por onde começar a implementar?" (developer_quickstart).
    if has(&[
        "como comeco como operador",
        "como comecar como operador",
        "por onde comeco como operador",
        "comeco como operador",
        "comecar como operador",
        "por onde comeco",
        "por onde começo",
        "quero ser operador",
        "quero tornar-me operador",
        "como me torno operador",
        "como me torno um operador",
        "como ser operador",
        "como me tornar operador",
        "onboarding de operador",
        "primeiros passos como operador",
        "primeiros passos de operador",
        "comecar a ser operador",
    ]) {
        return mk("operator_onboarding", "answer",
            "Começa pelo BanzAI, o caminho público do operador: Manifest → Conformidade → Trust → Federação → Evidence Bundle → Traces. Em concreto: (1) prepara o teu Operator Manifest; (2) corre a conformidade; (3) verifica signed protocol metadata e avalia revocation/fail-closed no Trust; (4) gera um evidence bundle com a evidência verificável. Isto é self-publication: publicas o manifest e a conformance evidence, e qualquer pessoa ou sistema verifica — não há autorização, aprovação nem certificação pelo BANZA. A implementação do operador é validada por artefactos verificáveis, não por uma ferramenta específica. A responsabilidade regulatória é tua: KYC/KYB, AML/CFT, licenciamento e execução financeira ficam do lado do operador e das autoridades competentes; quem autoriza serviços financeiros reais é o regulador, não o BANZA.",
            vec![c("ops"), c("manifest"), c("bundle"), c("cert")],
            Some(vec!["O caminho público do operador é o BanzAI: Manifest → Conformidade → Trust → Evidence Bundle (self-publication).", "Sem autorização, aprovação ou certificação pelo BANZA — a conformidade demonstra-se por evidência verificável.", "A responsabilidade regulatória (KYC/KYB, AML/CFT, licença) é do operador; a implementação do operador é validada por artefactos verificáveis, não por uma ferramenta específica."]),
            Some(vec!["O BanzAI certifica?", "Como corro a conformidade?"]));
    }
    // How do I run conformance? — apenas no BanzAI. Canonical text; never pip/Docker/GitHub-Action/CLI.
    if has(&[
        "como corro conformidade",
        "como corro a conformidade",
        "corro conformidade",
        "corro a conformidade",
        "correr conformidade",
        "correr a conformidade",
        "como correr conformidade",
        "como correr a conformidade",
        "rodar conformidade",
        "rodar a conformidade",
        "executar conformidade",
        "executar a conformidade",
        "como executo a conformidade",
        "como faco a conformidade",
        "como faco conformidade",
        "correr os testes de conformidade",
        "correr conformance",
        "rodar conformance",
    ]) {
        return mk("run_conformance", "answer",
            "Use o BanzAI. O fluxo recomendado é Manifest → Conformidade → Trust → Evidence Bundle. A implementação do operador é validada por artefactos verificáveis, não por uma ferramenta específica. O BanzAI prepara o manifest, executa as validações de conformidade, verifica signed protocol metadata, avalia revocation/fail-closed e gera um evidence bundle com evidência verificável de conformidade. Um PASS técnico é evidência verificável de conformidade, não aprovação humana, licença ou certificação.",
            vec![c("cert"), c("manifest"), c("bundle"), c("ops")],
            Some(vec!["Caminho público: BanzAI — Manifest → Conformidade → Trust → Evidence Bundle.", "A implementação do operador é validada por artefactos verificáveis, não por uma ferramenta específica.", "PASS técnico é evidência verificável de conformidade, não certificação."]),
            Some(vec!["O BanzAI certifica?", "Preciso de instalar banza-conformance?"]));
    }
    // Can I use Docker? — for operators the public path is BanzAI; Docker is a maintainer tool only.
    // Never emit docker commands.
    if has(&[
        "docker",
        "posso usar docker",
        "usar docker",
        "preciso de docker",
        "preciso do docker",
        "docker obrigatorio",
        "correr docker",
        "docker compose",
        "imagem docker",
        "container",
        "contentor",
    ]) {
        return mk("docker_operator_path", "answer",
            "Para operadores, o caminho público de validação é o BanzAI. O fluxo recomendado é Manifest → Conformidade → Trust → Evidence Bundle, executado no BanzAI, que gera evidência verificável de conformidade. As engines Rust/WASM e as ferramentas internas são mantidas pelos maintainers do protocolo; o caminho do operador é o BanzAI. O operador valida a compatibilidade protocolar por artefactos verificáveis gerados no BanzAI.",
            vec![c("cert"), c("manifest"), c("bundle"), c("ops")],
            Some(vec!["Caminho público do operador: BanzAI.", "As engines e ferramentas internas são mantidas pelos maintainers do protocolo.", "A implementação do operador é validada por artefactos verificáveis, não por uma ferramenta específica."]),
            Some(vec!["Como corro a conformidade?", "Existe GitHub Action?"]));
    }
    // Is there a GitHub Action? — operators don't need one; public validation is BanzAI; CI/guards
    // are maintainer-internal. Never present a GitHub Action as an operator method.
    if has(&[
        "github action",
        "github actions",
        "usar github action",
        "github workflow",
        "workflow do github",
        "action do github",
        "github ci",
        "ci do github",
    ]) {
        return mk("github_action_operator", "answer",
            "A validação pública do operador faz-se no BanzAI: Manifest → Conformidade → Trust → Evidence Bundle, que gera evidência verificável de conformidade. A implementação é validada por artefactos verificáveis, não por uma ferramenta específica. CI, guards e workflows internos são mantidos pelos maintainers do protocolo (specs, engines, contratos e testes).",
            vec![c("cert"), c("manifest"), c("bundle"), c("ops")],
            Some(vec!["A validação pública do operador é no BanzAI.", "CI, guards e workflows internos são mantidos pelos maintainers do protocolo.", "A implementação do operador é validada por artefactos verificáveis, não por uma ferramenta específica."]),
            Some(vec!["Como corro a conformidade?", "Preciso de instalar banza-conformance?"]));
    }
    // Do I need to install banza-conformance? — no; apenas no BanzAI. Never emit pip/PyPI/commands.
    if has(&[
        "banza-conformance",
        "banza conformance",
        "instalar banza-conformance",
        "instalar banza conformance",
        "preciso instalar",
        "preciso de instalar",
        "tenho de instalar",
        "instalar o conformance",
        "instalar conformance",
        "instalar python",
        "instalar o python",
        "instalar pip",
        "instalar a cli",
        "instalar cli",
        "cli de conformance",
        "cli de conformidade",
    ]) {
        return mk("banza_conformance_install", "answer",
            "Validas tudo no BanzAI: a validação do operador é por artefactos verificáveis, não por uma ferramenta específica. O fluxo público é o BanzAI: Manifest → Conformidade → Trust → Evidence Bundle. O próprio BanzAI executa as validações de conformidade, verifica signed protocol metadata, avalia revocation/fail-closed e gera um evidence bundle com evidência verificável de conformidade. As engines, contratos e ferramentas internas são mantidos pelos maintainers do protocolo; o caminho de validação do operador é o BanzAI.",
            vec![c("cert"), c("manifest"), c("bundle"), c("dev")],
            Some(vec!["O fluxo público do operador é o BanzAI; a validação é por artefactos verificáveis, não por uma ferramenta específica.", "O BanzAI executa as validações e gera evidência verificável de conformidade.", "As engines/contratos/ferramentas internas são mantidas pelos maintainers do protocolo."]),
            Some(vec!["Como corro a conformidade?", "Posso usar Docker?"]));
    }
    // How do I validate compatibility? — the operator's public path is the BanzAI; CI, guards,
    // Rust tests and scripts exist for protocol MAINTAINERS, not as an operator interface. Placed after the
    // trust-engine compatibility intent (which owns "trust engine valida compatibilidade") and anchored to
    // "valido/validar/verifico/testo/demonstro compatibilidade" — never the bare "valida compatibilidade".
    if has(&[
        "como valido compatibilidade",
        "como valido a compatibilidade",
        "como validar compatibilidade",
        "como validar a compatibilidade",
        "valido compatibilidade",
        "valido a compatibilidade",
        "validar compatibilidade protocolar",
        "validar a compatibilidade protocolar",
        "onde valido compatibilidade",
        "onde valido a compatibilidade",
        "como verifico compatibilidade",
        "como verifico a compatibilidade",
        "verificar compatibilidade protocolar",
        "como testo compatibilidade",
        "como testar compatibilidade",
        "como demonstro compatibilidade",
        "como demonstrar compatibilidade",
        "demonstrar compatibilidade protocolar",
        "como provo compatibilidade",
    ]) {
        return mk("validate_compatibility", "answer",
            "Validas a compatibilidade protocolar no BanzAI — é o caminho público do operador: Manifest → Conformidade → Trust → Federação → Evidence Bundle → Traces. O BanzAI prepara o manifest, corre a conformidade, verifica signed protocol metadata, avalia revocation/fail-closed e gera um evidence bundle com evidência verificável de conformidade. A implementação do operador é validada por artefactos verificáveis, não por uma ferramenta específica. CI, guards, testes em Rust e scripts existem para os maintainers do protocolo (manutenção de specs, engines, contratos e testes) — não são a interface de validação do operador. Um PASS técnico é evidência verificável de conformidade, não aprovação humana, licença ou certificação: BANZA é um protocolo financeiro aberto e ninguém aprova operadores por decisão humana central.",
            vec![c("cert"), c("manifest"), c("bundle"), c("ops")],
            Some(vec!["Validas a compatibilidade no BanzAI: Manifest → Conformidade → Trust → Evidence Bundle.", "CI, guards, testes Rust e scripts são mantidos pelos maintainers do protocolo; a validação do operador é por artefactos verificáveis no BanzAI.", "PASS técnico é evidência verificável de conformidade, não certificação."]),
            Some(vec!["Preciso usar CLI ou Docker?", "Como corro a conformidade?"]));
    }
    // Do I need a CLI? — no; operators validate in BanzAI. A CLI (like Docker/pip/GitHub Actions) is
    // a maintainer-internal tool, never an operator method. Placed after banza_conformance_install (which
    // owns "instalar cli"/"cli de conformance") so a pure-CLI question lands here. Never emit CLI commands.
    if has(&[
        "cli",
        "linha de comandos",
        "linha de comando",
        "command line",
        "command-line",
        "terminal",
    ]) {
        return mk("cli_operator_path", "answer",
            "Para operadores, o caminho público de validação é o BanzAI — Manifest → Conformidade → Trust → Evidence Bundle —, que gera evidência verificável de conformidade. As engines e ferramentas internas são mantidas pelos maintainers do protocolo; o caminho do operador é o BanzAI. O operador valida a compatibilidade protocolar por artefactos verificáveis gerados no BanzAI. Um PASS técnico é evidência verificável de conformidade, não aprovação humana, licença ou certificação.",
            vec![c("cert"), c("manifest"), c("bundle"), c("ops")],
            Some(vec!["Caminho público do operador: BanzAI.", "As engines e ferramentas internas são mantidas pelos maintainers do protocolo.", "A implementação do operador é validada por artefactos verificáveis, não por uma ferramenta específica."]),
            Some(vec!["Como valido compatibilidade?", "Posso usar Docker?"]));
    }
    // Authority request — certify / approve / emit-certificate / register-operator / mark-certified.
    // Broad, imperative-aware: this is the hardened boundary refusal (BX1.1). It must never fall to
    // `uncertain`. State QUESTIONS ("este operador está certificado?") are handled below as answers.
    if has(&[
        "certifica o meu",
        "certifica-me",
        "certifica este",
        "certifica o operador",
        "certifica operador",
        "certifica-o",
        "certificar o meu",
        "certificar-me",
        "certificar este",
        "certificar o operador",
        "certificar operador",
        "certificar-o",
        "aprova este",
        "aprova o meu",
        "aprovar operador",
        "aprova-me",
        "aprova o operador",
        "aprovar este",
        "aprovar o operador",
        "emite certificado",
        "emitir certificado",
        "emite um certificado",
        "emitir um certificado",
        "gera certificado",
        "gerar certificado",
        "gera um certificado",
        "certificado de produc",
        "adiciona este operador",
        "adiciona o operador",
        "adiciona em /operators",
        "adiciona-o em /operators",
        "adicionar operador",
        "poe em /operators",
        "põe em /operators",
        "poe este operador",
        "regista este operador",
        "marca como operador certificado",
        "marca como certificado",
        "marcar como certificado",
        "marca este operador",
        "marcar este operador como",
        "podes certificar",
        "pode certificar",
        "podes aprovar",
        "pode aprovar",
        "banzai certifica",
        "banzai pode certificar",
        "consegues certificar",
        "podes emitir",
    ]) {
        return mk("certification_request_refusal", "refusal",
            "Não posso certificar, aprovar ou emitir certificados. O BanzAI não certifica, não aprova e não emite certificados — posso executar ferramentas técnicas, gerar evidência e explicar resultados: apontar os requisitos de cada nível, as lacunas e a evidência a preparar. A conformidade pertence à verificação determinística e à evidência verificável publicada pelo operador — nenhuma autoridade humana central aceita, aprova ou certifica operadores.",
            vec![c("cert"), c("certificates"), c("operators"), c("banzai")],
            Some(vec!["PASS é evidência técnica, não certificação.", "A conformidade demonstra-se por evidência verificável, não por decisão humana central.", "O estado público continua pré-produção: nenhum operador está certificado (/operators = []), production_certificates = false."]),
            Some(vec!["O que exige o nível L2?", "Como preparar evidência para conformidade?"]));
    }
    // Cert-STATE question (informative answer, not a refusal): "este operador está certificado?".
    if has(&[
        "esta certificado",
        "está certificado",
        "ja esta certificado",
        "algum operador certificado",
        "operadores certificados hoje",
    ]) {
        return mk("operator_cert_state", "answer",
            "Nenhum operador está certificado neste estado — a rota máquina /operators devolve [] (uma lista vazia). É um facto verificável, não uma opinião. A emissão de certificados de produção depende dos marcos M2/M3 e ainda não abriu: production_certificates = false. Um PASS na conformidade é evidência técnica, não um certificado.",
            vec![c("operators"), c("certificates"), c("estado"), c("cert")],
            Some(vec!["PASS é evidência técnica, não certificação.", "A conformidade demonstra-se por evidência verificável, não por decisão humana central."]),
            Some(vec!["O que significa /operators = []?", "Um PASS é certificado?"]));
    }
    // SimB Pre-Review Gate (BX1.4) — "SimB PASS é certificado?" / "SimB certifica/aprova?" → NO.
    if has(&[
        "simb pass e certificado",
        "simb pass é certificado",
        "simb e certificado",
        "simb é certificado",
        "simb certifica",
        "simb aprova",
        "simb torna certificado",
        "simb torna o operador certificado",
        "pass do simb certifica",
        "simb pass certifica",
    ]) {
        return mk("simb_pass_not_certificate", "answer",
            "Não. Um SimB PASS é evidência técnica de pré-revisão — não é certificação e não torna o operador certificado. O SimB não certifica, não aprova, não cria operador real e não altera /operators nem /certificates. Gera apenas evidência técnica que ajuda a preparar a revisão. A conformidade demonstra-se por evidência verificável publicada pelo operador; ninguém a aprova por decisão humana central. O BanzAI não certifica, não aprova e não emite certificados.",
            vec![c("simb"), c("cert"), c("certificates"), c("operators")],
            Some(vec!["SimB PASS é evidência técnica, não certificação.", "Ninguém aceita operadores por decisão humana central — a conformidade demonstra-se por evidência verificável.", "SimB não altera o estado público (/operators = [], production_certificates = false)."]),
            Some(vec!["O que é o SimB Pre-Review Gate?", "O que preciso para publicar evidência de conformidade?"]));
    }
    // SimB Pre-Review Gate (BX1.4) — obligation questions: is SimB mandatory? can I skip it? what do I
    // need before publishing conformance evidence? what if SimB fails? SimB is a MANDATORY technical step.
    if has(&[
        "simb e obrigatorio",
        "simb é obrigatorio",
        "simb obrigatorio",
        "simb pre-review",
        "simb pre review",
        "pre-review gate",
        "pre review gate",
        "sem simb",
        "sem passar por simb",
        "sem passar pelo simb",
        "revisao sem simb",
        "revisão sem simb",
        "antes da revisao",
        "antes da revisão",
        "antes de publicar evidencia",
        "antes de publicar evidência",
        "porque simb",
        "porque o simb",
        "o que e o simb pre",
        "o que é o simb pre",
        "se simb falhar",
        "simb falhar posso",
        "preciso antes da revisao",
        "preciso antes da revisão",
        "preciso antes de publicar evidencia",
        "preciso antes de publicar evidência",
        "plano de correcao simb",
        "plano de correcção simb",
        "corrigir falhas simb",
    ]) {
        return mk("simb_pre_review_gate", "answer",
            "SimB é uma etapa obrigatória de pré-validação técnica: todo operador candidato deve passar por SimB antes de publicar evidência de conformidade. O SimB testa fluxos BANZA, ledger, idempotência, settlement, traces e conformance inicial sem fundos reais e sem produção, gerando evidência técnica de pré-revisão. Sem um SimB PASS, o operador candidato não deve avançar para publicar evidência de conformidade. Se o SimB falhar, está bloqueado por falhas SimB — corrija antes de submeter. Um SimB PASS é evidência técnica, não certificação: a conformidade demonstra-se por evidência verificável publicada pelo operador, não por decisão humana central.",
            vec![c("simb"), c("banzai"), c("cert"), c("estado")],
            Some(vec!["SimB é etapa obrigatória de pré-validação técnica.", "Sem SimB PASS, o operador candidato não deve avançar para publicar evidência de conformidade.", "SimB PASS é evidência técnica de conformidade — ninguém aprova operadores por decisão humana central."]),
            Some(vec!["SimB PASS é certificado?", "Como preparar evidência verificável de conformidade?"]));
    }
    // L1 Readiness (BX1.7) — "o que é L1 readiness?", "estou pronto para L1?", "endpoints para L1?",
    // "well-known obrigatórios?", "L1 é certificado?", "validar URL do operador?", "o que falta para L1?".
    if has(&[
        "l1 readiness",
        "readiness l1",
        "l1 ready",
        "pronto para l1",
        "prontidao l1",
        "prontidão l1",
        "preparacao l1",
        "preparação l1",
        "endpoints para l1",
        "endpoints l1",
        "para l1",
        "para o nivel l1",
        "para o nível l1",
        "well-known",
        "well known",
        "l1 e certificado",
        "l1 é certificado",
        "l1 readiness e certificado",
        "l1 readiness é certificado",
        "validar url do operador",
        "url do operador",
        "validacao por url",
        "validação por url",
        "falta para l1",
        "para o l1",
        "o que e l1",
        "o que é l1",
        "o que e o l1",
        "o que é o l1",
        "artefactos l1",
    ]) {
        return mk("l1_readiness", "answer",
            "L1 Readiness é preparação técnica: significa que um operador candidato tem os artefactos mínimos estruturados para revisão técnica posterior — Operator Manifest válido, SimB pre-review PASS, Conformidade L0 PASS, key manifest, certificates, BRL, conformance evidence e a estrutura well-known. Os paths well-known esperados são /.well-known/banza/operator.json, /.well-known/banza/key-manifest.json, /certificates, /federation/revocation-list.json e /conformance/evidence. A validação é LOCAL nesta fase (sem rede): a validação por URL do operador será uma fase futura e exigirá confirmação explícita. L1 Readiness NÃO é certificação, NÃO é aprovação, NÃO cria operador (não altera /operators) e NÃO substitui a evidência verificável de conformidade — ninguém aprova operadores por decisão humana central.",
            vec![c("l1"), c("simb"), c("cert"), c("estado")],
            Some(vec!["L1 Readiness é preparação técnica, não certificação nem aprovação.", "Validação local nesta fase — sem validação por URL por defeito.", "A conformidade demonstra-se por evidência verificável, não por aprovação humana."]),
            Some(vec!["L1 readiness é certificado?", "Que endpoints preciso para L1?"]));
    }
    // M2 — Production Protocol Implementation. Placed BEFORE the L4/assurance/m2_m3_status/banza_not_psp
    // intents so M2-specific queries route here. Keywords are M2-specific multi-word phrasings so they do
    // NOT steal the m2_m3_status milestone question ("Posso entrar em produção?") — bare "m2" is left to
    // that intent — nor the L4 "transforma banza em psp" phrasing. "M2 emite certificado?" is intentionally
    // left to the certification-refusal guard above (it also denies emission). M2 implements the protocol
    // for production AS AN OPEN PROTOCOL — it does not activate operators, emit real production
    // certificates, provide payment services or move funds.
    if has(&[
        "o que e m2",
        "o que é m2",
        "o que e o m2",
        "o que é o m2",
        "m2 e producao",
        "m2 é produção",
        "m2 e a producao",
        "m2 é a produção",
        "m2 activa operador",
        "m2 activa operadores",
        "m2 cria operador",
        "m2 transforma banza",
        "m2 transforma o banza",
        "m2 vira psp",
        "m2 move fundos",
        "m2 movimenta fundos",
        "m2 substitui auditoria",
        "m2 substitui regulador",
        "m2 substitui o regulador",
        "falta para m2",
        "o que falta para m2",
        "production protocol gate",
        "protocol production gate",
        "m2 protocol gate",
        "m2 protocol production",
        "production protocol implementation",
        "implementacao de producao do protocolo",
        "implementação de produção do protocolo",
        "producao do protocolo",
        "produção do protocolo",
        "governacao do protocolo em m2",
        "governação do protocolo em m2",
        "papel da governacao em m2",
        "papel da governação em m2",
        "licenca em m2",
        "licença em m2",
        "quem precisa de licenca em m2",
        "quem precisa de licença em m2",
        "state model do protocolo",
        "production state model",
        "operator self-publication",
        "auto-publicacao de operador em m2",
        "auto-publicação de operador em m2",
    ]) {
        return mk("m2_production", "answer",
            "M2 prepara o protocolo BANZA para produção enquanto protocolo financeiro aberto. M2 é produção do PROTOCOLO, não operação financeira do BANZA. Inicia: o modelo de estados de produção do protocolo (PRE_PRODUCTION → M2_PROTOCOL_IMPLEMENTATION → M2_PROTOCOL_REVIEW → M2_PROTOCOL_CANDIDATE → M3_OPERATOR_CANDIDATE → M4_PRODUCTION_NETWORK), o baseline de contratos de produção, a governação de release do protocolo, o papel da governação do protocolo, a auto-publicação de operadores e o caminho de trust de produção — validados por um M2 protocol gate calculado EM RUST (validate_m2_protocol_gate): M2_PROTOCOL_IMPLEMENTATION_READY, ou bloqueado por falta de contratos / governação / trust path / auto-publicação de operador / assurance, ou M2_INVALID_FORBIDDEN_ACTIVATION / M2_INVALID_REGULATORY_BOUNDARY. M2 NÃO activa operador (o /operators permanece []), NÃO emite certificado de produção real (production_certificates permanece false), NÃO presta serviços de pagamento, NÃO processa/liquida/movimenta fundos e NÃO activa federação nem integração externa. O BANZA permanece protocolo financeiro aberto; os operadores autorizados são entidades separadas que implementam o protocolo e prestam os serviços financeiros. A conformidade com o protocolo é demonstrada por evidência verificável — a governação não é regulador, não licencia operadores e não autoriza serviços financeiros. Qualquer licença/autorização pertence ao operador. A publicação do protocolo não é autorização de serviços de pagamento; a operação futura exige operadores autorizados, auditoria externa, uma cerimónia de trust real e uma decisão formal de governação.",
            vec![c("m2"), c("gov"), c("ops"), c("cert")],
            Some(vec!["M2 é produção do PROTOCOLO enquanto protocolo financeiro aberto — não activa operador, não emite certificado de produção real, não presta serviços de pagamento e não move fundos.", "Estado calculado em Rust (validate_m2_protocol_gate); /operators permanece [] e production_certificates permanece false.", "BANZA permanece protocolo financeiro aberto, não PSP; a licença pertence ao operador; a conformidade demonstra-se por evidência verificável; a governação não autoriza serviços financeiros."]),
            Some(vec!["M2 transforma BANZA em PSP?", "M2 activa operadores?"]));
    }
    // M2.1 Root Trust Ceremony (2-of-3). Placed early (before the trust_chain "chave raiz" intent) so
    // root-ceremony/custodian/pendrive queries route here. Uses "root key"/"root ceremony"/"custodian"/
    // "2-de-3"/"pendrive" (English/specific) — NOT bare "chave raiz"/"confian" (those stay with trust_chain).
    if has(&[
        "root ceremony",
        "root trust ceremony",
        "cerimonia raiz",
        "cerimónia raiz",
        "cerimonia da raiz",
        "cerimónia da raiz",
        "cerimonia root",
        "root trust",
        "2-de-3",
        "2 de 3",
        "2-of-3",
        "2 of 3",
        "custodian",
        "custodians",
        "custodiante",
        "root key",
        "root keys",
        "pendrive",
        "pen drive",
        "usb cifrada",
        "as 3 chaves",
        "as tres chaves",
        "as três chaves",
        "root key autoriza",
        "root key cria",
        "root key emite",
        "root key move",
        "root key assina",
        "o que a root assina",
        "o que a raiz assina",
        "chaves delegadas",
        "chave delegada",
        "release signing key",
        "chave de assinatura de release",
        "testar recuperacao",
        "testar recuperação",
        "recuperacao offline",
        "recuperação offline",
        "porque 2-de-3",
        "por que 2-de-3",
    ]) {
        return mk("root_ceremony", "answer",
            "A cerimónia raiz M2 (root ceremony) estabelece a confiança do protocolo financeiro aberto BANZA com um modelo 2-de-3: três custodians independentes, uma root key Ed25519 por custodian, e são necessárias 2 assinaturas para qualquer acção da raiz — ninguém assina sozinho, a perda de uma chave não destrói a raiz e o compromisso de uma chave não compromete a raiz inteira. Cada custodian guarda apenas a sua chave, com backup CIFRADO numa pendrive própria (uma pendrive por custodian, nunca mais do que uma root key por pendrive; a passphrase fica FORA da pendrive) e testa a recuperação offline com um artefacto TEST ONLY. A private key NUNCA vai para GitHub, servidor, CI, Docker, Postgres, .env, cloud sync, email ou WhatsApp — o repositório, o CI, o website e o BanzAI só contêm material PÚBLICO (chaves públicas, key IDs, fingerprints, root metadata, assinaturas, política de threshold e o hash da evidência da cerimónia). A raiz assina root metadata, delegações, rotação, revogação e trust policy; as CHAVES DELEGADAS (distintas da raiz) é que assinam releases, a BRL, artefactos e evidência. A raiz M2 NÃO autoriza pagamentos, NÃO cria operador, NÃO emite licença, NÃO processa/liquida/movimenta fundos e NÃO substitui a autorização regulatória do operador. BANZA permanece protocolo financeiro aberto; os operadores autorizados são entidades separadas que implementam o protocolo. A cerimónia real das production keys corre OFFLINE nos computadores dos custodians; a validação da cerimónia é calculada EM RUST (validate_root_ceremony).",
            vec![c("ceremony"), c("trust"), c("gov"), c("ops")],
            Some(vec!["Modelo 2-de-3: 3 custodians, 1 root key cada, 2 assinaturas; ninguém assina sozinho. Nenhuma pendrive tem mais de uma root key; a passphrase fica fora da pendrive.", "A private key NUNCA vai para GitHub, servidor, CI, .env, cloud sync, email ou WhatsApp — só material público no repo. A recuperação é testada offline com artefacto TEST ONLY.", "A raiz não autoriza pagamentos, não cria operador, não emite licença e não move fundos; BANZA permanece protocolo financeiro aberto e a licença pertence ao operador."]),
            Some(vec!["A root key pode ir para GitHub?", "A root key autoriza pagamentos?"]));
    }
    // Deep Assurance (BX2.1–BX2.4) — deepening of the internal assurance across four tracks. Placed BEFORE
    // the BX2.0 security_assurance intent so deep-specific queries route here. Keywords are deep-specific
    // (abuse cases, attack scenarios, trust ceremony, key management policy, BRL revocation playbook,
    // incident response, severity matrix, deployment drift, audit readiness, evidence index) so they do
    // not steal the BX2.0 assurance questions nor the trust/BRL/federation intents below.
    if has(&[
        "deep assurance",
        "deep security assurance",
        "aprofundamento de assurance",
        "assurance deepening",
        "security assurance deepening",
        "abuse cases",
        "casos de abuso",
        "attack scenarios",
        "cenarios de ataque",
        "cenários de ataque",
        "threat coverage",
        "cobertura de ameacas",
        "cobertura de ameaças",
        "trust ceremony",
        "cerimonia de confianca",
        "cerimónia de confiança",
        "cerimonia de chave",
        "key management policy",
        "politica de gestao de chaves",
        "política de gestão de chaves",
        "gestao de chaves",
        "gestão de chaves",
        "brl revocation playbook",
        "playbook de revogacao",
        "playbook de revogação",
        "incident response",
        "resposta a incidentes",
        "plano de resposta a incidentes",
        "sev-1",
        "sev 1",
        "severidade de incidente",
        "incident severity",
        "matriz de severidade",
        "operational risk",
        "risco operacional",
        "registo de risco operacional",
        "deployment drift",
        "deriva de implementacao",
        "deriva de implementação",
        "audit readiness",
        "prontidao para auditoria",
        "prontidão para auditoria",
        "external audit readiness",
        "audit evidence index",
        "indice de evidencia de auditoria",
        "índice de evidência de auditoria",
        "control evidence map",
        "mapa de controlos",
        "auditor briefing",
        "briefing do auditor",
        "pre-audit",
        "pre audit",
        "pre-auditoria",
        "pré-auditoria",
        "revisao pre-auditoria",
        "revisão pré-auditoria",
    ]) {
        return mk("deep_assurance", "answer",
            "Deep Assurance (BX2.1–BX2.4) é o APROFUNDAMENTO da avaliação INTERNA de segurança e risco em quatro frentes: (1) ameaças e abuso — abuse cases, attack scenarios e threat coverage matrix; (2) confiança e cerimónia criptográfica — plano de cerimónia, política de gestão de chaves, runbook da chave raiz e playbook de revogação BRL (tudo test-only; a cerimónia de confiança de produção, marco M2, NÃO foi executada); (3) risco operacional e resposta a incidentes — plano de resposta, matriz de severidade SEV-1..SEV-4, runbooks de eventos e playbook de deriva de implementação; e (4) prontidão para auditoria externa — âmbito, índice de evidência, mapa de controlos↔evidência, briefing do auditor e lacunas abertas. O estado é calculado EM RUST (validate_deep_assurance): DEEP_ASSURANCE_READY_FOR_PRE_AUDIT_REVIEW, DEEP_ASSURANCE_INCOMPLETE, ou bloqueado por lacuna crítica de ameaça / confiança / resposta a incidentes / evidência de auditoria, ou DEEP_ASSURANCE_INVALID. «Pré-auditoria» significa preparado para revisão ANTES de uma auditoria — a auditoria externa NÃO foi realizada. Isto NÃO é produção, NÃO é auditoria externa concluída, NÃO é certificação, NÃO é aprovação, NÃO é licença, NÃO cria operador, NÃO activa federação, NÃO activa integração externa, NÃO move fundos e NÃO transforma o BANZA em prestador de serviços de pagamento. BANZA continua um protocolo aberto — a licença/autorização pertence ao operador autorizado. A governação do protocolo mantém specs, versões, segurança e tooling; não autoriza, certifica nem aceita operadores.",
            vec![c("assurance"), c("cert"), c("trust"), c("ops")],
            Some(vec!["Deep Assurance é aprofundamento de avaliação interna — não é auditoria externa concluída, não é certificação, não é licença, não é produção.", "Estado calculado em Rust (validate_deep_assurance); a auditoria externa não foi realizada e a cerimónia de confiança de produção (M2) não foi executada.", "BANZA é protocolo aberto; não activa federação nem integração externa e não move fundos; a licença pertence ao operador."]),
            Some(vec!["Isto significa que a auditoria externa está concluída?", "Deep Assurance certifica o operador?"]));
    }
    // Security & Risk Assurance (BX2.0) — "o que é Security & Risk Assurance?", "isto significa que BANZA
    // está pronto para produção?", "é auditoria externa/certificação/licença?", "BANZA vira PSP com
    // assurance?", "quais riscos faltam?", "o que é threat model/risk register/controls matrix?", "o que
    // falta antes de produção?".
    if has(&[
        "security & risk assurance",
        "security and risk assurance",
        "security assurance",
        "risk assurance",
        "assurance de seguranca",
        "assurance de segurança",
        "seguranca e risco",
        "segurança e risco",
        "o que e assurance",
        "o que é assurance",
        "isto significa que banza esta pronto",
        "isto significa que banza está pronto",
        "banza esta pronto para producao",
        "banza está pronto para produção",
        "isto e auditoria externa",
        "isto é auditoria externa",
        "e auditoria externa",
        "é auditoria externa",
        "banza vira psp",
        "vira psp com assurance",
        "assurance e certificado",
        "assurance é certificado",
        "assurance e licenca",
        "assurance é licença",
        "quais riscos faltam",
        "quais riscos ainda faltam",
        "que riscos faltam",
        "threat model",
        "modelo de ameacas",
        "modelo de ameaças",
        "risk register",
        "registo de risco",
        "controls matrix",
        "matriz de controlos",
        "o que falta antes de producao",
        "o que falta antes de produção",
        "antes de producao",
        "antes de produção",
    ]) {
        return mk("security_assurance", "answer",
            "Security & Risk Assurance é a avaliação INTERNA de segurança e risco do protocolo BANZA e do BanzAI: risk register, threat model, controls matrix, revisão da evidência L0–L4, trust/BRL, integridade do Evidence Bundle e a fronteira regulatória. NÃO significa que BANZA está pronto para produção; NÃO é auditoria externa; NÃO é certificação; NÃO é aprovação; NÃO é licença; e NÃO transforma o BANZA em prestador de serviços de pagamento. BANZA continua um protocolo aberto — qualquer licença ou autorização pertence ao operador que presta serviços financeiros reais, não ao protocolo. Antes de qualquer afirmação de produção são necessários: auditoria externa independente, um piloto controlado e operadores autorizados sob o seu próprio enquadramento regulatório. A governação do protocolo mantém specs, versões, segurança e tooling; não autoriza, certifica nem aceita operadores.",
            vec![c("assurance"), c("cert"), c("trust"), c("ops")],
            Some(vec!["Security & Risk Assurance é avaliação interna — não é produção, não é auditoria externa, não é certificação nem licença.", "BANZA é protocolo aberto; não transforma BANZA em PSP; a licença pertence ao operador.", "Produção futura exige auditoria externa, piloto controlado e operadores autorizados."]),
            Some(vec!["Isto significa que BANZA está pronto para produção?", "BANZA vira PSP com assurance?"]));
    }
    // L4 Readiness / external interoperability (BX1.10) — "o que é L4 readiness?", "L4 é integração
    // externa activa?", "L4 é licença?", "L4 transforma BANZA em PSP?", "external interoperability
    // profile?", "version negotiation?", "endpoint contract map?", "envelope?", "error mapping?",
    // "posso validar integração externa real?", "o que bloqueia L4?".
    if has(&[
        "l4 readiness",
        "readiness l4",
        "l4 ready",
        "preparacao l4",
        "preparação l4",
        "prontidao l4",
        "prontidão l4",
        "preciso para l4",
        "artefactos l4",
        "l4 e integracao",
        "l4 é integração",
        "l4 readiness e integracao",
        "l4 readiness é integração",
        "integracao externa activa",
        "integração externa activa",
        "integracao externa real",
        "integração externa real",
        "l4 e licenca",
        "l4 é licença",
        "l4 readiness e licenca",
        "l4 readiness é licença",
        "l4 transforma banza",
        "l4 transforma o banza",
        "transforma banza em psp",
        "transforma o banza em psp",
        "l4 e certificado",
        "l4 é certificado",
        "l4 readiness e certificado",
        "l4 readiness é certificado",
        "bloqueia l4",
        "blockers l4",
        "external interoperability profile",
        "interoperability profile",
        "perfil de interoperabilidade",
        "version negotiation",
        "negociacao de versao",
        "negociação de versão",
        "endpoint contract map",
        "endpoint contract",
        "contrato de endpoint",
        "request/response envelope",
        "envelope de interoperabilidade",
        "error mapping",
        "mapeamento de erros",
        "capability matrix",
        "matriz de capacidades",
        "interoperabilidade externa",
        "validar integracao externa real",
        "validar integração externa real",
        "o que e l4 readiness",
        "o que é l4 readiness",
    ]) {
        return mk("l4_readiness", "answer",
            "L4 Readiness é preparação técnica de interoperabilidade externa: demonstra, em ambiente local/demo/test-only, que a implementação de um operador candidato está preparada para interoperar com outros operadores que implementam o protocolo BANZA. Precisa de Operator Manifest válido, SimB pre-review PASS, Conformidade L0 PASS, L1/L2/L3 Readiness prontas, um external interoperability profile, protocol version negotiation, um endpoint contract map, uma capability matrix, um request/response envelope, um error mapping, material trust/BRL test-only (BRL fail-closed) e uma referência de evidence bundle. L4 Readiness NÃO é integração externa activa, NÃO é federação activa, NÃO é produção, NÃO move fundos, NÃO é certificação, NÃO é aprovação, NÃO é licença e NÃO transforma o BANZA em prestador de serviços de pagamento. BANZA é um protocolo aberto — os operadores autorizados prestam os serviços financeiros conforme o seu próprio enquadramento regulatório; a licença/autorização pertence ao operador, não ao protocolo. A validação é LOCAL nesta fase (sem rede): a validação por URL/integração externa real será uma fase futura e exigirá confirmação explícita. A governação do protocolo mantém specs, versões, segurança e tooling; não autoriza, certifica nem aceita operadores.",
            vec![c("l4"), c("l3"), c("fed"), c("trust"), c("ops")],
            Some(vec!["L4 readiness é preparação técnica de interoperabilidade externa — não é integração externa activa, não é licença e não transforma BANZA em PSP.", "BANZA é protocolo aberto; os operadores autorizados prestam os serviços financeiros, a licença pertence ao operador.", "Validação local nesta fase — sem integração externa real por defeito. A conformidade demonstra-se por evidência verificável, não por aprovação humana."]),
            Some(vec!["L4 transforma BANZA em PSP?", "Que artefactos preciso para L4?"]));
    }
    // L3 Readiness / federation (BX1.9) — "o que é L3 readiness?", "L3 é federação activa?",
    // "L3 é certificado?", "artefactos para L3?", "federation intent?", "cross-operator trace?",
    // "posso validar federação real?", "o que bloqueia L3?". Generic BRL/trust/federação stay in their
    // own intents; L3 claims only L3-specific phrasings.
    if has(&[
        "l3 readiness",
        "readiness l3",
        "l3 ready",
        "preparacao l3",
        "preparação l3",
        "prontidao l3",
        "prontidão l3",
        "preciso para l3",
        "artefactos l3",
        "l3 e federacao",
        "l3 é federação",
        "l3 readiness e federacao",
        "l3 readiness é federação",
        "federacao activa",
        "federação activa",
        "federacao real",
        "federação real",
        "federacao em producao",
        "federação em produção",
        "l3 e certificado",
        "l3 é certificado",
        "l3 readiness e certificado",
        "l3 readiness é certificado",
        "bloqueia l3",
        "blockers l3",
        "federation intent",
        "federation-intent",
        "cross-operator trace",
        "cross operator trace",
        "trace cross-operator",
        "trace entre operadores",
        "validar federacao real",
        "validar federação real",
        "o que e l3 readiness",
        "o que é l3 readiness",
    ]) {
        return mk("l3_readiness", "answer",
            "L3 Readiness é preparação técnica de federação: demonstra, em ambiente local/demo/test-only, que um operador candidato tem os artefactos e fluxos mínimos de federação BANZA — entre DOIS operadores simulados — estruturados para revisão técnica posterior. Precisa de Operator Manifest válido, SimB pre-review PASS, Conformidade L0 PASS, L1 Readiness pronta, L2 Readiness pronta, um federation pair (dois operadores test-only distintos), um federation intent (id, source/target operator, amount em minor units inteiros, currency, trace_id, idempotency_key), cross-operator trace linkage (traces A e B ligadas por um correlation_id partilhado), material trust/BRL test-only (a BRL é fail-closed: um operador revogado bloqueia o routing), uma federation settlement obligation coerente (net = gross - fee) e uma referência de evidence bundle. L3 Readiness NÃO é federação activa, NÃO é federação de produção, NÃO move fundos, NÃO é certificação, NÃO é aprovação e NÃO cria operador. A validação é LOCAL nesta fase (sem rede): a validação por URL/federação real do operador será uma fase futura e exigirá confirmação explícita. A federação de produção depende do marco M3 e de evidência verificável de conformidade.",
            vec![c("l3"), c("l2"), c("trust"), c("fed"), c("cert")],
            Some(vec!["L3 readiness é preparação técnica de federação — não é federação activa e não move fundos.", "Federação entre operadores simulados test-only; a BRL é fail-closed (operador revogado bloqueia); valores em minor units inteiros.", "Validação local nesta fase — sem federação real por defeito. A federação de produção depende do M3 e de evidência verificável."]),
            Some(vec!["L3 readiness é federação activa?", "Que artefactos preciso para L3?"]));
    }
    // L2 Readiness / payment flow (BX1.8) — "o que é L2 readiness?", "L2 é pagamento real?",
    // "L2 é certificado?", "artefactos para L2?", "payment intent?", "idempotency key?", "porque ledger
    // double-entry?", "porque trace_id?", "o que bloqueia L2?", "validar URL de operador em L2?".
    if has(&[
        "l2 readiness",
        "readiness l2",
        "l2 ready",
        "preparacao l2",
        "preparação l2",
        "prontidao l2",
        "prontidão l2",
        "preciso para l2",
        "artefactos l2",
        "l2 e pagamento",
        "l2 é pagamento",
        "l2 readiness e pagamento",
        "l2 readiness é pagamento",
        "pagamento real",
        "move fundos",
        "movimenta fundos",
        "fundos reais",
        "l2 e certificado",
        "l2 é certificado",
        "l2 readiness e certificado",
        "l2 readiness é certificado",
        "bloqueia l2",
        "blockers l2",
        "payment intent",
        "payment-intent",
        "intent de pagamento",
        "intencao de pagamento",
        "intenção de pagamento",
        "double-entry",
        "double entry",
        "partida dobrada",
        "ledger double",
        "porque ledger",
        "porque trace",
        "porque o trace",
        "trace_id",
        "trace id obrigatorio",
        "trace id obrigatório",
        "settlement obligation",
        "obrigacao de settlement",
        "obrigação de settlement",
        "fluxo de pagamento",
        "payment flow",
        "url de operador",
        "url em l2",
        "operador em l2",
        "o que e l2 readiness",
        "o que é l2 readiness",
    ]) {
        return mk("l2_readiness", "answer",
            "L2 Readiness é preparação técnica de fluxo de pagamento: demonstra, em ambiente local/demo/test-only, que um operador candidato tem os artefactos e fluxos mínimos de pagamento BANZA estruturados para revisão técnica posterior. Precisa de Operator Manifest válido, SimB pre-review PASS, Conformidade L0 PASS, L1 Readiness pronta, um payment intent (id, currency, amount_minor em minor units inteiros, idempotency_key, ligação de trace), idempotência consistente (a mesma key devolve o mesmo resultado e o replay é sinalizado), ledger double-entry que soma zero e liga ao trace_id, trace linkage (intent, ledger e settlement no mesmo trace_id), uma settlement obligation coerente (net = gross - fee) e uma referência de evidence bundle. L2 Readiness NÃO é pagamento real, NÃO move fundos, NÃO é certificação, NÃO é aprovação e NÃO cria operador. A validação é LOCAL nesta fase (sem rede): a validação por URL/endpoint de pagamento do operador será uma fase futura e exigirá confirmação explícita. A conformidade demonstra-se por evidência verificável, não por aprovação humana.",
            vec![c("l2"), c("l1"), c("simb"), c("bundle"), c("cert")],
            Some(vec!["L2 readiness é preparação técnica de fluxo de pagamento — não é pagamento real e não move fundos.", "Valores monetários são inteiros em minor units, nunca float; nenhum fixture representa dinheiro real.", "Validação local nesta fase — sem validação por URL por defeito. A conformidade demonstra-se por evidência verificável, não por aprovação humana."]),
            Some(vec!["L2 readiness é pagamento real?", "Que artefactos preciso para L2?"]));
    }
    // Evidence Bundle (BX1.5 / BX1.5A) — "o que é Evidence Bundle (Export)?", "para que serve?",
    // "o que vai?", "é certificado?", "é aprovação?", "posso usar para publicar evidência?".
    if has(&[
        "evidence bundle",
        "evidence-bundle",
        "evidence bundle export",
        "este bundle",
        "meu bundle",
        "o meu bundle",
        "bundle esta pronto",
        "bundle está pronto",
        "bundle pronto para revisao",
        "bundle pronto para revisão",
        "falta no bundle",
        "falta no meu bundle",
        "falta no evidence bundle",
        "o que falta",
        "bundle e certificado",
        "bundle é certificado",
        "bundle certificado",
        "gerar bundle",
        "gerar o bundle",
        "preparar bundle",
        "preparar evidence bundle",
        "o que e um evidence bundle",
        "o que é um evidence bundle",
        "o que e o evidence bundle",
        "o que é o evidence bundle",
        "para que serve o evidence bundle",
        "para que serve o bundle",
        "o que vai no evidence bundle",
        "o que vai no bundle",
        "substitui a banza ca",
        "usar evidence bundle",
        "usar o evidence bundle",
        "schema de um evidence bundle",
        "schema do evidence bundle",
        "pacote de evidencia",
        "pacote de evidência",
        "simb falhou",
    ]) {
        return mk("evidence_bundle", "answer",
            "O Evidence Bundle é um pacote de evidência técnica gerado pelo BanzAI para reunir os resultados de SimB pre-review, Conformidade L0, verificação de Traces e Trust & BRL, com as versões das ferramentas, hashes de integridade, citações, limitações e o estado de readiness. Serve para publicar evidência verificável de conformidade. A readiness é evidência técnica — READY_FOR_TECHNICAL_REVIEW exige SimB PASS + L0 PASS; se o SimB falhar fica BLOCKED_BY_SIMB, se a L0 falhar fica BLOCKED_BY_CONFORMANCE, e se faltarem artefactos obrigatórios fica INCOMPLETE. Não é certificado e não é aprovação — ninguém aprova operadores por decisão humana central. O BanzAI não certifica, não aprova e não emite certificados.",
            vec![c("bundle"), c("simb"), c("cert"), c("estado")],
            Some(vec!["Evidence Bundle é evidência técnica, não certificação.", "READY_FOR_TECHNICAL_REVIEW exige SimB PASS + L0 PASS.", "A conformidade demonstra-se por evidência verificável."]),
            Some(vec!["O que vai no Evidence Bundle?", "Este bundle é certificado?"]));
    }
    // Operator Manifest Validator (BX1.6) — "o que é operator manifest?", "como validar?",
    // "manifesto válido significa operador certificado?", "cria operador?", "porque key_manifest_url?".
    if has(&[
        "operator manifest",
        "operator-manifest",
        "manifesto do operador",
        "manifesto de operador",
        "manifesto do candidato",
        "validar o manifesto",
        "validar manifesto",
        "validar o manifest",
        "manifesto valido significa",
        "manifesto válido significa",
        "manifesto valido é",
        "manifesto válido é",
        "obrigatorios no manifest",
        "obrigatórios no manifest",
        "campos do manifest",
        "campos do manifesto",
        "campos no manifest",
        "key_manifest_url",
        "manifesto cria operador",
        "manifest cria operador",
        "o que e operator manifest",
        "o que é operator manifest",
        "o que e o operator manifest",
        "o que é o operator manifest",
        "well-known/banza/operator",
    ]) {
        return mk("operator_manifest", "answer",
            "O operator manifest é o documento de descoberta de um operador BANZA (servido em /.well-known/banza/operator.json) que declara operator_id, environment, simulated, production_allowed e capabilities; um candidato acrescenta, em rascunho, key_manifest_url, protocol_version, base_url e supported_levels. O BanzAI valida o manifesto localmente (sem rede por defeito): campos obrigatórios, tipos, URLs bem formadas e o invariante de segurança (simulated=true, production_allowed=false; produção/certificação são rejeitadas). Um manifesto válido é evidência técnica — NÃO cria operador (não altera /operators), NÃO certifica e NÃO aprova. Serve para preparar a submissão, a par do SimB Pre-Review Gate e do Evidence Bundle; a conformidade demonstra-se por evidência verificável. O key_manifest_url é necessário porque aponta a raiz de confiança do operador (o key manifest que ancora certificados e BRL).",
            vec![c("manifest"), c("ops"), c("simb"), c("estado")],
            Some(vec!["Validação de manifesto é evidência técnica — não cria operador, não certifica, não aprova.", "Validação local, sem rede por defeito (URLs só verificadas na forma).", "A conformidade demonstra-se por evidência verificável, não por aprovação humana."]),
            Some(vec!["Manifesto válido significa operador certificado?", "Que campos são obrigatórios no manifest?"]));
    }
    if has(&[
        "codigo pronto",
        "código pronto",
        "pronto para producao",
        "pronto para produção",
        "production-ready",
        "production ready",
        "gera codigo",
        "gera código",
        "gerar codigo",
        "escreve o codigo",
        "codigo de producao",
    ]) {
        return mk("production_code_request", "answer",
            "Posso explicar padrões e cuidados de implementação — idempotência, verificação de webhooks, contratos — mas qualquer código mostrado numa demo é candidato, não «pronto para produção». Só testes, a suite de conformidade e revisão humana o validam.",
            vec![c("dev"), c("banzai")],
            Some(vec!["Output de demo não é production-ready.", "Requer testes e revisão humana."]),
            Some(vec!["Como implementar idempotência?", "Como preparar evidência para conformidade?"]));
    }
    if has(&[
        "bna",
        "emis",
        "unitel",
        "banco aprovou",
        "regulador aprovou",
        "aprovacao do banco",
        "aprovacao regulatoria",
        "aprovado pelo banco",
        "integracao bancaria",
        "ja aprovou",
        "esta aprovado pelo",
        "bancos angolanos",
        "bancos ja",
        "bancos estao",
        "integrad",
    ]) {
        return mk("external_approval_claims", "uncertain",
            "O BANZA não afirma aprovação regulatória, integração bancária, nem aprovação da BNA, da EMIS ou de qualquer operador comercial. Nenhum desses resultados existe neste estado: dependem de operadores certificados (M3), de autorização regulatória e de evidência específica, fora do protocolo.",
            vec![c("estado"), c("ops"), c("gov")],
            Some(vec!["Sem aprovação regulatória ou integração bancária declarada."]), None);
    }
    if has(&[
        "cotacao",
        "cotação",
        "cambio",
        "câmbio",
        "dolar",
        "dólar",
        "euro",
        "bolsa",
        "noticia",
        "notícia",
        "tempo hoje",
        "meteorolog",
        "preco do",
        "preço do",
        "mercado de acoes",
        "investimento",
        "investir",
    ]) {
        return mk("out_of_scope_market_data", "uncertain",
            "Não tenho fonte suficiente na base de conhecimento do BANZA para responder a isso. O BanzAI só explica o protocolo BANZA e a sua evidência publicada — não tem dados de mercado, câmbio, notícias, investimentos ou fontes externas.",
            vec![c("ref"), c("estado")],
            Some(vec!["Fora do âmbito da base de conhecimento do BANZA."]), None);
    }
    if has(&[
        "conselho juridico",
        "conselho jurídico",
        "aconselhamento",
        "advogado",
        "juridic",
        "jurídic",
        "regulatorio",
        "regulatório",
        "fiscal",
        "imposto",
        "kyc obrigat",
        "aml",
        "cft",
        "legaliz",
    ]) {
        return mk("legal_regulatory_advice", "uncertain",
            "O BanzAI não substitui aconselhamento jurídico, regulatório, fiscal ou de conformidade KYC/KYB/AML-CFT — essas avaliações pertencem a profissionais e autoridades competentes, fora do protocolo. Posso explicar o que o protocolo define e onde as obrigações do operador começam.",
            vec![c("banzai"), c("ops"), c("gov")],
            Some(vec!["Não é aconselhamento jurídico/regulatório."]), None);
    }

    // ── 2. Status intents ──
    if has(&[
        "estado actual",
        "estado atual",
        "resumo do estado",
        "visao geral do estado",
        "estado do protocolo",
        "estado verificavel",
        "estado geral",
        "em que estado",
        "status do protocolo",
    ]) {
        return mk("status_overview", "answer",
            "Estado actual, verificável nas rotas máquina (pré-produção): protocolo congelado na v1.0; runtime público mock; llm_calls=0; sem provider real activo; /operators = [] (nenhum operador certificado); production_certificates = false; M2/M3 não activos; sem federação de produção activa.",
            vec![c("estado"), c("operators"), c("certificates")],
            Some(vec!["Pré-produção — M2/M3 pendentes."]),
            Some(vec!["O que significa /operators=[]?", "M2 está activo?"]));
    }
    if has(&[
        "operators=[]",
        "operators = []",
        "/operators",
        "lista vazia",
        "operadores vazia",
        "nenhum operador",
        "operadores certificados",
        "ha operador",
        "ha operadores",
        "existe operador",
        "algum operador",
    ]) {
        return mk("operators_empty", "answer",
            "A rota máquina /operators devolve [] — uma lista vazia: nenhum operador está certificado no protocolo neste momento. É um facto verificável, não uma opinião: o estado público é a fonte, não a memória de nenhum sistema. A emissão de produção depende dos marcos M2/M3.",
            vec![c("operators"), c("estado"), c("cert")],
            Some(vec!["Estado actual: sem operadores certificados."]),
            Some(vec!["O que significa production_certificates=false?", "Um PASS é certificado?"]));
    }
    if has(&[
        "production_certificates",
        "certificados de producao",
        "certificados de produção",
        "certificados activos",
        "/certificates",
    ]) {
        return mk("production_certificates_false", "answer",
            "A rota /certificates devolve production_certificates=false: não há certificados de produção activos. A emissão de certificados de produção depende dos marcos M2 (cerimónia de chave raiz) e M3 (primeiros operadores certificados), que ainda não estão activos.",
            vec![c("certificates"), c("estado"), c("cert")],
            Some(vec!["Sem certificados de produção activos.", "M2/M3 pendentes."]), None);
    }
    if has(&[
        "m2",
        "m3",
        "producao pronta",
        "produção pronta",
        "posso entrar em producao",
        "entrar em producao",
        "esta em producao",
        "está em produção",
        "marco de producao",
    ]) {
        return mk("m2_m3_status", "answer",
            "Não. A produção depende dos marcos M2 (cerimónia da chave raiz + Manifesto de Chaves de produção) e M3 (primeiros operadores certificados + federação controlada), que ainda não estão activos. Hoje o protocolo está congelado na v1.0, com estado pré-produção verificável nas rotas máquina.",
            vec![c("estado"), c("cert"), c("operators")],
            Some(vec!["M2/M3 não activos.", "/operators = [] · production_certificates = false."]), None);
    }
    if has(&[
        "modo demo",
        "e demo",
        "é demo",
        "modo mock",
        "isto e mock",
        "isto é mock",
        "é mock",
        "e mock",
        "chat mock",
        "demonstracao",
        "demonstração",
    ]) {
        return mk("mock_demo_status", "answer",
            "Sim — o BanzAI corre em modo demonstração/mock: respostas determinísticas com fontes citadas, sem chamadas a modelos externos (llm_calls=0, external_model_called=false). Guia e cita; não decide, não certifica e não é fonte da verdade.",
            vec![c("banzai"), c("estado")],
            Some(vec!["Modo demo: sem IA externa, sem provider real."]), None);
    }
    if has(&[
        "qwen",
        "deepseek",
        "provider real",
        "modelo real",
        "modelo activo",
        "llm activo",
        "llm_calls",
        "ia real activa",
        "chamadas externas",
        "chamada externa",
    ]) {
        return mk("llm_provider_status", "answer",
            "Não estão activos. O BanzAI corre em modo mock por defeito: llm_calls=0, external_model_called=false, sem provider real, sem GPU. Qwen, DeepSeek ou qualquer endpoint compatível com OpenAI são adaptadores opcionais por trás de perfis de tarefa — não estão ligados e não são arquitectura obrigatória. Model output nunca é evidência.",
            vec![c("banzai"), c("estado")],
            Some(vec!["Runtime público: mock/pré-produção.", "Sem provider real activo."]), None);
    }

    // ── 3. BanzAI intents ──
    if has(&[
        "banzai e a referencia",
        "banzai vs referencia",
        "diferenca entre banzai",
        "que paginas",
        "as rotas do banzai",
        "rotas do banzai",
        "landing ou referencia",
    ]) {
        return mk("banzai_routes", "answer",
            "São dois papéis públicos distintos: /banzai é a entrada pública principal do BanzAI (apresenta o agente do protocolo) e /referencia/banzai é o capítulo canónico completo (documenta). A experiência operacional corre em /banzai, onde o BanzAI prepara o manifest, valida conformidade e trust, gera evidência e responde com fontes citadas. A explicação técnica completa vive na referência.",
            vec![c("banzai"), c("ref")],
            None, Some(vec!["O que o BanzAI pode e não pode fazer?"]));
    }
    if has(&[
        "o que e o banzai",
        "o que é o banzai",
        "o que faz o banzai",
        "quem e o banzai",
        "para que serve o banzai",
    ]) {
        return mk("what_is_banzai", "answer",
            "O BanzAI é o agente IA nativo do protocolo BANZA: guia operadores do manifesto à federação, invoca ferramentas verificáveis, explica resultados e ajuda a preparar evidência. Não é normativo — a verdade vem da referência, dos ADRs/RFCs, dos invariantes e das rotas verificáveis; o BanzAI guia, explica e cita. BanzAI guia; os motores verificam; a evidência prova. O output do modelo nunca é evidência.",
            vec![c("banzai"), c("ref")],
            Some(vec!["Guia; não decide, não certifica, não aprova, não inventa regras."]),
            Some(vec!["O que o BanzAI pode e não pode fazer?", "BanzAI pode criar regras?"]));
    }
    // ── M2.7H · BanzAI as native protocol agent — identity, who-does-what, and rule provenance ──
    if has(&[
        "banzai e agente do protocolo",
        "banzai é agente do protocolo",
        "banzai faz parte do protocolo",
        "banzai e nativo",
        "banzai é nativo",
        "agente nativo",
        "agente do protocolo",
        "banzai e camada do protocolo",
    ]) {
        return mk("banzai_native_agent", "answer",
            "Sim. BanzAI é o agente IA nativo do protocolo BANZA — uma camada oficial de orientação e orquestração. Guia operadores, invoca ferramentas verificáveis e explica resultados. Não é fonte normativa nem autoridade de aprovação: guia a implementação do protocolo existente; não cria protocolo novo. BanzAI guia; os motores verificam; a evidência prova.",
            vec![c("banzai"), c("ref"), c("arch")],
            Some(vec!["Agente do protocolo, não autoridade do protocolo.", "Participação é demonstrada, não aprovada."]),
            Some(vec!["Quem aprova operadores?", "BanzAI pode criar regras?"]));
    }
    // Correct the retired "adjacent system" framing (pre-ADR-042) explicitly.
    if has(&[
        "sistema adjacente",
        "banzai e adjacente",
        "banzai é adjacente",
        "banzai nao faz parte do protocolo",
        "banzai não faz parte do protocolo",
        "banzai e um sistema separado",
        "banzai é um sistema separado",
    ]) {
        return mk("banzai_not_adjacent", "answer",
            "Não. Desde o ADR-042, o BanzAI não é descrito como sistema adjacente — é o agente IA nativo do protocolo BANZA, a camada oficial de orientação e orquestração. Guia operadores do manifesto à federação, invoca os motores verificáveis e explica os resultados. Continua a não ser normativo: guia; os motores verificam; a evidência prova. O output de IA nunca é regra do protocolo.",
            vec![c("banzai"), c("ref"), c("arch"), c("decisoes")],
            Some(vec!["Agente nativo e não normativo — não é sistema adjacente.", "Agente do protocolo, não autoridade do protocolo."]),
            Some(vec!["O que é o BanzAI?", "BanzAI é fonte normativa?"]));
    }
    if has(&[
        "quem aprova operadores",
        "quem aprova o operador",
        "quem aprova os operadores",
    ]) {
        return mk("who_approves_operators", "answer",
            "No BANZA, operadores não são aprovados por uma entidade central. Operadores demonstram compatibilidade por evidência verificável. A participação é demonstrada, não concedida — não há autoridade central de admissão de operadores.",
            vec![c("ops"), c("fed"), c("gov")],
            Some(vec!["Participação é demonstrada, não aprovada."]),
            Some(vec!["Como um operador participa?", "Quem verifica os resultados?"]));
    }
    if has(&[
        "quem verifica os resultados",
        "quem verifica",
        "quem calcula a conformidade",
        "quem calcula conformidade",
        "quem decide a conformidade",
    ]) {
        return mk("who_verifies", "answer",
            "Os motores determinísticos Rust/WASM calculam os resultados (conformidade, trust, traces, SimB, estados de evidência). BanzAI guia, invoca as ferramentas e explica os resultados. BanzAI guia; os motores verificam; a evidência prova.",
            vec![c("banzai"), c("cert"), c("trust")],
            Some(vec!["BanzAI orquestra; os motores calculam; a evidência prova."]),
            Some(vec!["Qual a diferença entre BanzAI e os motores?"]));
    }
    if has(&[
        "quem decide a participacao",
        "quem decide a participação",
        "quem decide participacao",
        "quem decide participação",
    ]) {
        return mk("who_decides_participation", "answer",
            "A participação é demonstrada por auto-publicação: o operador implementa o protocolo, publica manifesto, metadata assinada e evidência verificável. Não há decisão central de admissão no protocolo — ninguém concede participação.",
            vec![c("ops"), c("fed")],
            Some(vec!["Auto-publicação + evidência verificável; sem admissão central."]),
            Some(vec!["Quem aprova operadores?"]));
    }
    if has(&[
        "quem licencia operadores",
        "quem licencia",
        "quem autoriza financeiramente",
        "licenca do operador",
        "licença do operador",
        "autorizacao financeira",
    ]) {
        return mk("who_licenses_operators", "answer",
            "Licenciamento e autorização financeira pertencem às entidades competentes e ao enquadramento legal do operador, fora do protocolo BANZA. A licença não é emitida pelo protocolo; pertence ao enquadramento legal do operador.",
            vec![c("ops"), c("cert")],
            Some(vec!["Licença/autorização financeira é externa ao BANZA."]), None);
    }
    if has(&[
        "quem decide a federacao",
        "quem decide a federação",
        "quem decide federacao",
        "quem admite na federacao",
        "quem admite na federação",
    ]) {
        return mk("who_decides_federation", "answer",
            "Cada operador ou par verifica localmente a evidência publicada, a metadata assinada, o registry e a revogação/fail-closed antes de interoperar. Não há permissão central de federação — a interoperabilidade não depende de permissão central; depende de evidência verificável.",
            vec![c("fed"), c("trust"), c("ops")],
            Some(vec!["Decisão local por par, sobre evidência verificável."]), None);
    }
    if has(&[
        "como banzai guia ate a federacao",
        "como banzai guia até a federação",
        "banzai guia ate a federacao",
        "jornada do operador",
        "do manifesto a federacao",
        "do manifesto à federação",
    ]) {
        return mk("banzai_guides_to_federation", "answer",
            "BanzAI pode guiar o operador do manifesto à federação: Manifest, SimB, Conformidade, Trust, Evidence Bundle, Registry, verificação por pares e Federação. Guia e explica cada passo; os motores Rust/WASM calculam; a evidência prova. Não admite ninguém na federação.",
            vec![c("banzai"), c("fed"), c("bundle")],
            Some(vec!["BanzAI guia a jornada; não admite operadores na federação."]), None);
    }
    if has(&[
        "banzai pode criar regras",
        "banzai cria regras",
        "banzai pode definir regras",
        "banzai define regras",
        "banzai inventa regra",
        "banzai pode inventar",
        "banzai pode criar um adr",
        "banzai cria adr",
    ]) {
        return mk("banzai_cannot_create_rules", "answer",
            "Não. BanzAI não cria, não define e não inventa regras do protocolo. Guia com base na Referência BANZA, ADRs, RFCs, specs, contracts, schemas, invariants e outputs dos motores Rust/WASM. Pode ajudar a identificar lacunas e a redigir propostas RFC/ADR, mas nunca as activa. Output de IA nunca é regra do protocolo.",
            vec![c("banzai"), c("ref"), c("gov"), c("decisoes")],
            Some(vec!["BanzAI não inventa regras.", "Uma sugestão do BanzAI é proposta, não regra activa."]),
            Some(vec!["Quem cria regras do protocolo?", "E se o protocolo não tiver regra para o caso?"]));
    }
    if has(&[
        "banzai pode adicionar decisao arquitectural",
        "banzai pode adicionar uma decisao arquitectural",
        "banzai decide arquitectura",
        "banzai muda o trust model",
        "banzai muda trust model",
        "banzai muda o federation model",
        "banzai muda o registry model",
        "banzai actualiza invariantes",
        "banzai altera invariantes",
    ]) {
        return mk("banzai_no_architectural_decision", "answer",
            "Não. BanzAI não adiciona decisões arquitecturais nem muda o trust model, o federation model, o registry model ou os invariantes. Mudanças desse tipo entram no BANZA por processo formal de governança: proposta, ADR/RFC, revisão, testes, merge, release e publicação oficial.",
            vec![c("gov"), c("decisoes"), c("trust")],
            Some(vec!["Decisões arquitecturais entram por governança formal, não por BanzAI."]), None);
    }
    if has(&[
        "e se nao existir regra",
        "e se não existir regra",
        "e se o protocolo nao tiver regra",
        "e se o protocolo não tiver regra",
        "protocolo nao tem regra",
        "nao ha regra para",
        "não há regra para",
        "lacuna normativa",
        "protocolo nao define",
        "protocolo não define",
    ]) {
        return mk("no_rule_fallback", "answer",
            "Se o protocolo não tiver regra para o caso, BanzAI deve dizer que a regra não está definida — sem fonte normativa, BanzAI deve dizer que não há regra suficiente no protocolo. Pode sugerir a criação de uma proposta RFC/ADR, mas não pode tratá-la como regra activa nem inventar comportamento normativo.",
            vec![c("banzai"), c("gov"), c("decisoes")],
            Some(vec!["Sem fonte: declara que não há regra; sugere RFC/ADR como proposta."]),
            Some(vec!["Uma sugestão do BanzAI vira regra?"]));
    }
    if has(&[
        "sugestao vira regra",
        "sugestão vira regra",
        "sugestao do banzai vira regra",
        "uma sugestao vira regra",
        "proposta vira regra",
        "proposta e regra activa",
        "sugestao e regra",
    ]) {
        return mk("suggestion_not_rule", "answer",
            "Não. Uma sugestão do BanzAI é apenas proposta. Só vira regra após o processo formal de governança — revisão, merge, release — e publicação nas fontes oficiais do protocolo. Propostas geradas pelo BanzAI são marcadas como proposta/draft, nunca como regra activa.",
            vec![c("gov"), c("decisoes"), c("banzai")],
            Some(vec!["Proposta ≠ regra activa."]), None);
    }
    if has(&[
        "quem cria regras",
        "quem cria as regras",
        "quem cria regras do protocolo",
        "como uma nova regra entra",
        "como entra uma nova regra",
        "como se cria uma regra",
    ]) {
        return mk("who_creates_rules", "answer",
            "Regras do protocolo são criadas pela governança aberta do BANZA, através de RFCs, ADRs, specs, contracts, testes e releases, e publicadas nas fontes oficiais. BanzAI pode ajudar a redigir propostas, mas não as activa. BanzAI pode propor; a governança decide; a referência publica; os motores verificam.",
            vec![c("gov"), c("decisoes"), c("ref")], None, None);
    }
    if has(&[
        "diferenca entre banzai e os motores",
        "diferença entre banzai e os motores",
        "diferenca entre banzai e motores",
        "banzai e motores rust",
        "banzai versus motores",
        "banzai vs motores",
    ]) {
        return mk("banzai_vs_engines", "answer",
            "BanzAI orquestra, guia e explica; os motores determinísticos Rust/WASM calculam os resultados verificáveis; a evidência prova. O output do agente nunca é evidência por si só — o Evidence Bundle inclui os resultados dos motores, não a opinião do agente.",
            vec![c("banzai"), c("cert"), c("bundle")],
            Some(vec!["BanzAI guia; os motores verificam; a evidência prova."]), None);
    }
    if has(&[
        "pode e nao pode",
        "pode e não pode",
        "limites do banzai",
        "o banzai decide",
        "banzai decide",
        "autoridade do banzai",
        "banzai e autoridade",
        "banzai é autoridade",
        "banzai nao faz",
        "banzai não faz",
    ]) {
        return mk("banzai_authority_limits", "answer",
            "O BanzAI explica, recupera evidência, verifica claims e apoia a revisão humana. Não decide, não certifica, não aprova e não emite certificados; não aprova operadores, não substitui a governação, nem obrigações legais/regulatórias/KYC-KYB/AML-CFT. Não é operador, wallet, payment runtime nem fonte da verdade — a fonte da verdade é a base de conhecimento do BANZA. Questões de autoridade e governação exigem revisão humana.",
            vec![c("banzai"), c("gov"), c("cert")],
            Some(vec!["Autoridade, certificação e governação ficam fora do modelo."]), None);
    }
    if has(&[
        "output do modelo",
        "output nunca e evidencia",
        "modelo e evidencia",
        "modelo é evidência",
        "resposta do modelo e evidencia",
    ]) {
        return mk("model_output_not_evidence", "answer",
            "O output do modelo nunca é evidência. Modelos, quando activados, produzem apenas outputs candidatos; a evidência vem sempre da base de conhecimento do BANZA (spec, contratos, invariantes, vectores de conformidade), citada e ancorada a um commit/hash. O motor BanzAI verifica contra essa evidência antes de responder.",
            vec![c("banzai"), c("ref"), c("arch")], None, None);
    }
    if has(&[
        "como o banzai responde",
        "como responde",
        "como raciocina",
        "como funciona o chat",
        "fluxo do banzai",
    ]) {
        return mk("banzai_how_it_answers", "answer",
            "O fluxo não é «utilizador → modelo → resposta». É «utilizador → motor BanzAI → evidência BANZA → output candidato → verificação → resposta citada». Neste demo as respostas são determinísticas e citam a base de conhecimento — sem chamadas externas.",
            vec![c("banzai"), c("ref")],
            Some(vec!["Modo demo: respostas determinísticas, sem IA externa."]), None);
    }
    if has(&[
        "o que e o banza",
        "o que é o banza",
        "o que e banza",
        "o que é o protocolo",
        "define banza",
        "o que faz o banza",
    ]) {
        return mk("what_is_banza", "answer",
            "O BANZA é um protocolo financeiro aberto para interoperabilidade, conformidade e evidência em pagamentos: regras públicas, contratos, invariantes financeiros e critérios de certificação, independentes de qualquer operador. É e continuará a ser protocolo financeiro aberto — não é operador financeiro, não é PSP, não é banco, não é carteira, não é um produto, não processa, não liquida, não movimenta nem detém fundos. Define as regras que os operadores autorizados implementam na sua própria infraestrutura; são esses operadores, entidades separadas, que prestam os serviços financeiros.",
            vec![c("ref"), c("arch"), c("decisoes")],
            None, Some(vec!["O que é o BanzAI?", "BANZA é operador financeiro?"]));
    }
    // Open financial protocol identity (M2.0A) — permanent-identity framing (affirm, not just negate).
    // "BANZA é operador financeiro? / pode virar operador financeiro? / pode virar PSP? / é protocolo
    // técnico? / é protocolo financeiro? / quem presta serviços financeiros?". Placed BEFORE banza_not_psp
    // with identity-specific keywords; leaves "BANZA é PSP?" / "precisa de licença?" to banza_not_psp and
    // "BANZA vira PSP com assurance?" to security_assurance (no bare "banza vira psp" here).
    if has(&[
        "banza e operador financeiro",
        "banza é operador financeiro",
        "banza e um operador financeiro",
        "banza é um operador financeiro",
        "banza e operador",
        "banza é operador",
        "banza pode virar operador",
        "banza pode tornar-se operador",
        "banza vira operador",
        "banza torna-se operador",
        "banza pode ser operador",
        "pode virar operador financeiro",
        "banza pode virar psp",
        "banza pode tornar-se psp",
        "pode virar psp",
        "banza e protocolo financeiro",
        "banza é protocolo financeiro",
        "banza e um protocolo financeiro",
        "banza é um protocolo financeiro",
        "banza e protocolo tecnico",
        "banza é protocolo técnico",
        "e protocolo tecnico",
        "é protocolo técnico",
        "protocolo tecnico ou financeiro",
        "protocolo técnico ou financeiro",
        "quem presta servicos financeiros",
        "quem presta serviços financeiros",
        "quem presta os servicos financeiros",
        "quem presta os serviços financeiros",
    ]) {
        return mk("banza_open_financial_protocol", "answer",
            "O BANZA é um protocolo financeiro aberto — e é assim que continuará a ser. Não é operador financeiro, não é PSP, não é banco, não é carteira e não é prestador de serviços financeiros; não processa, não liquida, não movimenta e não detém fundos. No posicionamento do projecto, o BANZA não se «transforma» em operador nem em PSP: essa natureza é permanente. Os operadores financeiros são entidades separadas que implementam o protocolo e prestam os serviços financeiros, assumindo o respectivo enquadramento regulatório. A formulação preferida é «protocolo financeiro aberto»; a palavra «técnico» só deve ser usada quando for necessário distinguir o protocolo de actividade financeira regulada ou de movimentação de fundos. A conformidade com o protocolo é demonstrada por evidência verificável, não por uma autoridade humana central — a governação não é regulador, não licencia operadores e não autoriza serviços financeiros. Qualquer licença ou autorização pertence ao operador que presta serviços financeiros reais usando o protocolo.",
            vec![c("ref"), c("ops"), c("estado")],
            Some(vec!["BANZA é e continuará a ser protocolo financeiro aberto — não é operador financeiro nem PSP.", "Os operadores autorizados são entidades separadas que implementam o protocolo e prestam os serviços financeiros.", "A licença/autorização pertence ao operador, não ao protocolo; a conformidade demonstra-se por evidência verificável."]),
            Some(vec!["Quem presta os serviços financeiros?", "M2 transforma BANZA em PSP?"]));
    }
    // Regulatory positioning (BX1.8A) — "BANZA precisa de licença?", "BANZA é PSP?", "é prestador?",
    // "é banco?", "quem precisa de licença?", "o operador precisa de licença?".
    if has(&[
        "precisa de licenca",
        "precisa de licença",
        "precisa de autorizacao",
        "precisa de autorização",
        "banza e psp",
        "banza é psp",
        "banza e um psp",
        "banza é um psp",
        "banza e prestador",
        "banza é prestador",
        "prestador de servicos de pagamento",
        "prestador de serviços de pagamento",
        "banza e banco",
        "banza é banco",
        "banza e uma carteira",
        "banza é uma carteira",
        "quem precisa de licenca",
        "quem precisa de licença",
        "operador precisa de licenca",
        "operador precisa de licença",
        "o operador de referencia precisa",
        "o operador de referência precisa",
        "licenca como psp",
        "licença como psp",
    ]) {
        return mk("banza_not_psp", "answer",
            "O BANZA é um protocolo financeiro aberto — não é PSP, não é operador financeiro, não é banco, não é carteira e não presta serviços financeiros ao público. Por isso, o protocolo em si não precisa de licença como prestador de serviços de pagamento. Qualquer licença, autorização ou enquadramento regulatório pertence ao operador que presta serviços financeiros reais usando o protocolo (bancos, PSPs e instituições autorizadas, incluindo o operador de referência se e quando prestar serviços reais), não ao protocolo BANZA. O BANZA fornece interoperabilidade, conformidade e evidência — isto não é autorização regulatória nem licença.",
            vec![c("ref"), c("ops"), c("estado")],
            Some(vec!["BANZA é protocolo, não prestador de serviços de pagamento.", "A licença/autorização pertence ao operador que presta serviços financeiros reais, não ao protocolo."]),
            Some(vec!["BANZA processa pagamentos?", "Quem aceita operadores?"]));
    }
    if has(&[
        "o banza processa",
        "banza processa pagamentos",
        "banza move",
        "banza movimenta",
        "banza processa",
        "o banza paga",
        "banza liquida",
        "liquida pagamentos",
        "banza detem fundos",
        "banza detém fundos",
        "banza guarda fundos",
        "banza opera sistema de pagament",
        "banza gere rede de pagament",
    ]) {
        return mk("banza_authority_limits", "answer",
            "Não. O BANZA é o protocolo — define regras e verificação; não processa pagamentos, não liquida valores, não movimenta fundos e não detém fundos. A execução financeira (pagamentos, liquidação, custódia) ocorre fora do protocolo, na infraestrutura dos operadores autorizados e dos seus PSP/bancos. O BANZA verifica correcção; não é um rail de pagamentos.",
            vec![c("arch"), c("ref"), c("ops")], None, None);
    }

    // ── 4. Certification intents ──
    if has(&[
        "pass e certificado",
        "pass é certificado",
        "pass e um certificado",
        "um pass",
        "pass da conformidade",
        "pass e certi",
        "pass significa certi",
    ]) {
        return mk("pass_vs_certificate", "answer",
            "Não. Um PASS na conformidade é evidência técnica de conformidade, reproduzível por terceiros. Não existe certificado de operador emitido por uma autoridade humana central: desde M2.2 a arquitectura é de governação aberta — o operador publica manifest e conformance evidence, e qualquer pessoa ou sistema verifica. Hoje nenhum operador tem evidência de conformidade de produção activa (/operators = [], production_certificates = false).",
            vec![c("cert"), c("banzai"), c("certificates")],
            Some(vec!["PASS = conformance evidence, verificável por terceiros.", "Ninguém emite certificados de operador; nenhuma autoridade humana central aceita operadores."]), None);
    }
    if has(&[
        "evidencia para",
        "evidência para",
        "preparar evidencia",
        "preparar evidência",
        "evidencia de conformidade",
        "prova de conformidade",
        "evidencia l2",
        "evidência l2",
        "evidencia para l2",
    ]) {
        return mk("evidence_package", "answer",
            "Para preparar evidência de conformidade: implemente os endpoints do nível pretendido, corra a suite de conformidade em sandbox e recolha os resultados reproduzíveis (PASS/FAIL por vector). Esse conjunto é a conformance evidence — reproduzível por terceiros. O BanzAI pode explicar os requisitos e apontar lacunas, mas o árbitro é a verificação determinística. A evidência é publicada pelo operador e verificável por qualquer pessoa, sem aprovação humana central.",
            vec![c("cert"), c("dev"), c("certificates")],
            Some(vec!["Conformance evidence é publicada pelo operador e verificável por qualquer pessoa.", "O árbitro é a conformidade determinística, não uma aprovação humana."]),
            Some(vec!["Um PASS é certificado?", "O que significa production_certificates=false?"]));
    }
    if has(&[
        "niveis de certificacao",
        "níveis de certificação",
        "l0",
        "l1",
        "l2",
        "l3",
        "l4",
        "nivel de certificacao",
        "nível de certificação",
        "l0-l4",
        "l0 a l4",
    ]) {
        return mk("certification_levels_overview", "answer",
            "A certificação tem níveis L0–L4, do mais básico ao mais completo — cada nível acrescenta capacidades (por exemplo, o L2 introduz iniciação de pagamento com QR dinâmico, links e liquidação T+0). Cada nível exige que a verificação de conformidade correspondente passe na totalidade. O detalhe completo dos níveis vive na referência de certificação.",
            vec![c("cert"), c("dev")],
            None, Some(vec!["Como preparar evidência para L2?", "Um PASS é certificado?"]));
    }
    // ── M2.3 Reference trust model ──
    // What replaced the certificate / the old Triple Verification, and how federation works without one.
    // Placed before the M2.2 participation intents so trust-model questions route here.
    if has(&[
        "trust model",
        "modelo de trust",
        "modelo de confianca",
        "modelo de confiança",
        "mudou no trust",
        "substitui o certificado",
        "substitui certificado",
        "sem certificado",
        "federacao sem certificado",
        "federação sem certificado",
        "verificacao tripla",
        "verificação tripla",
        "triple verification",
        "signed protocol metadata",
        "metadata assinada",
        "metadados assinados",
    ]) {
        return mk("reference_trust_model", "answer",
            "A compatibilidade protocolar é demonstrada por conformance evidence, operator manifest, signed protocol metadata e public protocol registry. Estes artefactos são verificáveis por ferramentas públicas e não representam licença, aprovação humana ou autorização de operador. Na federação, cada operador corre localmente a Open Trust Evaluation sobre o material que o outro publica — dez verificações conjuntivas: (1) operator manifest válido; (2) versão de protocolo compatível; (3) signed protocol metadata; (4) conformance evidence presente e válida; (5) assinatura da Trust Root ou de chave delegada válida; (6) ausência da Revocation List; (7) capabilities compatíveis; (8) contrato de endpoint compatível; (9) frescura da evidência dentro da política; (10) fail-closed se qualquer material de trust estiver ausente, inválido, expirado, revogado ou incompatível. O resultado é uma decisão local sobre uma interacção, não um juízo sobre a entidade. Nenhum passo é aprovação humana, licença ou certificação de operador.",
            vec![c("trustmodel"), c("trust"), c("fed"), c("decisoes")],
            Some(vec!["A compatibilidade demonstra-se por evidência verificável, não por aprovação humana central.", "A federação avalia manifest, versão, signed protocol metadata, conformance evidence, assinatura, revogação, capabilities, endpoint e frescura — fail-closed.", "A avaliação é local: cada par decide por si, e a decisão é sobre a interacção."]),
            Some(vec!["O registry aprova operadores?", "Qual é o papel da Trust Root?"]));
    }
    // The registry: an index, never an approval list. And revocation: security, never a licence.
    if has(&[
        "public protocol registry",
        "protocol registry",
        "registry aprova",
        "registo aprova",
        "registry e uma lista",
        "registry é uma lista",
        "registo publico aprova",
        "registo público aprova",
        "revocation list e licenca",
        "revocation list é licença",
        "revogacao e licenca",
        "revogação é licença",
        "lista de revogacao e licenca",
    ]) {
        return mk("registry_and_revocation", "answer",
            "Não. O Public Protocol Registry é um índice de metadata e evidência verificável. Não é uma lista de operadores licenciados, aprovados ou certificados pela BANZA: as entradas são geradas e validadas por regras públicas, verificáveis por schema, hash e assinatura, e o registo é replicável e forkável por qualquer pessoa. Ninguém adiciona ou remove operadores por decisão discricionária. A ausência do registo também não é proibição regulatória — significa apenas que não há evidência verificável publicada e indexada. E a Revocation List é um mecanismo de segurança e trust do protocolo: não é licença, sanção regulatória ou autorização financeira. Quando material de trust está ausente, inválido, expirado, revogado ou incompatível, a avaliação falha fechado — é uma decisão local sobre uma interacção, não um juízo sobre a entidade.",
            vec![c("trustmodel"), c("operators"), c("trust")],
            Some(vec!["O registry é um índice verificável, não uma lista de aprovação nem uma licença.", "A ausência do registo não é proibição regulatória.", "Revogação é mecanismo de segurança, não licença nem sanção."]),
            Some(vec!["O que substitui o certificado?", "Como funciona a federação sem certificado?"]));
    }
    // ADR supersession.
    if has(&[
        "adr-022",
        "adr 022",
        "adr-026",
        "adr 026",
        "adr-027",
        "adr 027",
        "adr-038",
        "adr-039",
        "adr-040",
        "foi substituido",
        "foi substituído",
        "supersede",
        "superseded",
    ]) {
        return mk("adr_supersession", "answer",
            "O modelo activo de federação do BANZA é definido por signed protocol metadata, operator manifests, conformance evidence, public protocol registry, trust root/chaves delegadas e revocation/fail-closed. A compatibilidade é demonstrada por evidência verificável, não por aprovação humana central ou certificado de operador. As decisões de arquitectura que fixam este modelo são a ADR-027 (open protocol trust model), a ADR-033 (operator self-publication e conformidade verificável por máquina) e a ADR-031 (federation trust evaluation). O ciclo de vida das ADRs é matéria da Protocol Governance: as ADRs em vigor descrevem o protocolo tal como ele é.",
            vec![c("decisoes"), c("trustmodel"), c("gov")],
            Some(vec!["ADR-027, ADR-033 e ADR-031 fixam o modelo activo de trust.", "A compatibilidade demonstra-se por evidência verificável, não por aprovação humana central."]),
            Some(vec!["O que substitui o certificado?", "Como funciona a federação?"]));
    }
    // ── M2.2 Open protocol governance ──
    // Who accepts/approves/certifies operators, and does an operator need BANZA's permission? The answer
    // is structural: nobody, by central human decision. Placed before the authority/certification intents.
    if has(&[
        "quem aceita",
        "aceita operadores",
        "aceita operador",
        "quem aprova",
        "aprova operadores",
        "aprova operador",
        "quem certifica",
        "certifica operadores",
        "certifica operador",
        "pedir autorizacao",
        "pedir autorização",
        "precisa pedir",
        "precisa de autorizacao a banza",
        "precisa de autorização à banza",
        "quem decide se um operador",
        "quem decide quem",
        "gatekeeper",
    ]) {
        return mk("who_accepts_operators", "answer",
            "Ninguém aceita operadores por decisão humana central. Operadores independentes implementam o protocolo, publicam manifests e produzem evidência verificável de conformidade. O BANZA não certifica operadores: o protocolo permite demonstrar conformidade protocolar através de regras públicas e evidência verificável — testes determinísticos, manifests, conformance evidence, hashes e assinaturas que qualquer pessoa ou sistema pode verificar. Um operador não precisa de pedir autorização ao BANZA para implementar um protocolo aberto. Quem autoriza a prestação de serviços financeiros reais é o regulador competente, não o BANZA. Não existe gatekeeper humano, nem aprovação manual, nem certificado emitido por uma autoridade central. Hoje o registo público está vazio (/operators = [], production_certificates = false).",
            vec![c("opengov"), c("gov"), c("ops"), c("operators")],
            Some(vec!["Ninguém aceita, aprova ou certifica operadores por decisão humana central.", "A conformidade demonstra-se por regras públicas e evidência verificável.", "A autorização para serviços financeiros reais pertence ao regulador competente, não ao BANZA."]),
            Some(vec!["Como um operador participa?", "O que aconteceu à BANZA CA?"]));
    }
    // How does an operator participate / is BANZA permissioned?
    if has(&[
        "como um operador participa",
        "como participa",
        "como participar",
        "operador participa",
        "participacao de operador",
        "participação de operador",
        "permissionado",
        "permissionada",
        "permissionless",
        "permissioned",
        "rede fechada",
        "self-publication",
        "self publication",
        "auto-publicacao",
        "auto-publicação",
    ]) {
        return mk("operator_participation", "answer",
            "O BANZA não é uma rede permissionada por uma autoridade humana central: é um protocolo financeiro aberto com regras públicas e evidência verificável. Um operador participa assim: (1) implementa o protocolo de forma independente; (2) publica o seu Operator Manifest; (3) executa os conformance tests; (4) publica a conformance evidence (relatórios, hashes, assinaturas, evidence bundle); (5) publica endpoints compatíveis; (6) qualquer pessoa ou sistema verifica a evidência. Não há passo de aprovação humana. A Revocation List e as regras fail-closed aplicam-se apenas a risco de segurança, confiança ou protocolo — não são autorização nem sanção regulatória. O operador é responsável pelo seu próprio enquadramento legal, regulatório, financeiro e operacional.",
            vec![c("opengov"), c("ops"), c("gov"), c("dev")],
            Some(vec!["Participação sem aprovação humana central: manifest + conformance evidence verificável.", "Revogação é mecanismo de segurança, não licença nem sanção regulatória.", "O operador assume o seu enquadramento legal e regulatório."]),
            Some(vec!["Quem aceita operadores?", "Revogação é licença?"]));
    }
    // Role of humans / maintainers; governance vs conformance; is conformance an approval?
    if has(&[
        "papel dos humanos",
        "papel das pessoas",
        "papel dos maintainers",
        "maintainers",
        "protocol maintainers",
        "o que os humanos fazem",
        "governance e conformance",
        "governanca e conformidade",
        "governança e conformidade",
        "diferenca entre governance",
        "diferença entre governance",
        "conformance e aprovacao",
        "conformance é aprovação",
        "conformidade e aprovacao",
        "conformidade é aprovação",
        "revogacao e licenca",
        "revogação é licença",
    ]) {
        return mk("open_governance_humans", "answer",
            "Humanos mantêm e evoluem o protocolo: specs, versões, RFCs, segurança, bugs, criptografia, documentação, tooling e processos de emergência. Humanos não autorizam operadores — não os certificam, não os aceitam e não os aprovam. Os papéis existentes são Protocol Maintainer, Security Maintainer, Specification Editor, Release Steward, Trust Root Custodian, Conformance Tool Maintainer e Community Reviewer; não existem papéis de Operator Approver, Operator Certifier, Payment Service Authoriser, Regulatory Approver nem Human Gatekeeper. Governance e conformance são coisas diferentes: governance mantém o protocolo (o que as regras são e como evoluem); conformance demonstra que uma implementação segue essas regras, por testes e evidência verificável. Conformance não é aprovação: é uma medição reproduzível, não uma decisão sobre quem pode participar. E revogação não é licença: é um mecanismo de segurança do protocolo, não uma sanção regulatória.",
            vec![c("opengov"), c("gov"), c("estado")],
            Some(vec!["Humanos mantêm o protocolo; não autorizam, certificam, aceitam nem aprovam operadores.", "Conformance é medição reproduzível, não aprovação.", "Revogação é mecanismo de segurança, não licença nem sanção regulatória."]),
            Some(vec!["Qual é o papel da Trust Root?", "Como o protocolo sobrevive sem a equipa fundadora?"]));
    }
    // What the trust rules DO and DO NOT guarantee — a security boundary, answered deterministically.
    // Live QA found the model answering "o BANZA fornece transparência global" — claiming a property the
    // specification explicitly does not provide. A guarantee is a fact; asserting one BANZA does not
    // have is worse than refusing, because a reader plans around it.
    if has(&[
        "transparencia global",
        "transparência global",
        "global transparency",
        "split-view",
        "split view",
        "consistencia de conjunto",
        "consistência de conjunto",
        "set consistency",
        "mix-and-match",
        "mix and match",
        "vista coerente",
        "estado de publicacao",
    ]) {
        return mk("trust_guarantee_boundary", "answer",
            "Não. É preciso separar quatro garantias, e o BANZA fornece duas.\n\n\
**Fornece — frescura do artefacto:** um artefacto expirado não é aceite.\n\
**Fornece — monotonicidade local:** dentro de um âmbito observado, um verificador não regride abaixo do \
marcador mais alto que já aceitou.\n\
**Não fornece — consistência de conjunto:** o BANZA não garante actualmente que vários artefactos \
individualmente válidos e frescos pertençam a um único estado de publicação coerente. A expiração limita \
a antiguidade de cada artefacto, não a coerência entre eles.\n\
**Não fornece — consistência entre observadores:** não há transparência global nem detecção de \
split-view. Dois observadores sem estado partilhado podem receber material diferente e individualmente \
válido.\n\n\
Estas duas ausências são limites declarados, não omissões: fechá-las exigiria infra-estrutura que o \
BANZA não adopta.",
            vec![c("trust"), c("gov")],
            Some(vec![
                "Fornece frescura de artefacto e monotonicidade local.",
                "Não fornece consistência de conjunto nem transparência global.",
                "Expiração limita a antiguidade de cada artefacto, não a coerência entre artefactos.",
            ]),
            Some(vec!["Qual é o limiar da raiz?", "O que é o BCJ/1?"]));
    }
    // Root authorization cardinality and threshold — a security fact, answered deterministically.
    // It sits BEFORE the role terminal because "quantas autoridades…" would otherwise fall through to
    // the role answer, and before any model path because a paraphrase of "three authorities, two
    // signatures" that says "two authorities" is wrong about the most consequential number in the
    // protocol. Observed in live QA: the model produced exactly that.
    if has(&[
        "quantas autoridades",
        "quantas chaves raiz",
        "quantas assinaturas",
        "limiar da raiz",
        "root threshold",
        "2-de-3",
        "2 de 3",
        "duas de tres",
        "autorizar sozinha",
        "autorizar sozinho",
        "uma unica chave raiz",
        "uma so assinatura",
        "assinatura isolada",
    ]) {
        return mk("root_threshold", "answer",
            "A Trust Root do BANZA é controlada por **três autoridades de assinatura independentes**. \
Qualquer acção autorizada da raiz exige **duas assinaturas, de duas autoridades distintas** — 2-de-3. \
Uma assinatura isolada nunca autoriza, e duas assinaturas da mesma autoridade contam como uma só. \
O limiar é criptográfico e lógico: o número de dispositivos ou módulos de segurança é um controlo de \
custódia e nunca define o limiar.",
            vec![c("trust"), c("ceremony"), c("gov")],
            Some(vec![
                "Três autoridades independentes; duas assinam.",
                "Uma sozinha nunca autoriza; duas da mesma autoridade contam como uma.",
                "O número de dispositivos não define o limiar.",
            ]),
            Some(vec!["Qual é o papel da Trust Root?", "O que acontece se uma autoridade ficar indisponível?"]));
    }
    // Role of the Trust Root under open governance (distinct from the M2.1 ceremony mechanics).
    if has(&[
        "papel da trust root",
        "trust root",
        "o que a trust root",
        "para que serve a raiz",
        "a raiz assina",
    ]) {
        return mk("trust_root_role", "answer",
            "A Trust Root assina metadados do protocolo, releases, chaves delegadas e revogações. Ela não autoriza pagamentos, não cria operadores, não emite licença e não certifica operadores. É um mecanismo criptográfico de confiança do protocolo (2-de-3, com custodians independentes), não uma autoridade sobre quem pode implementar o protocolo. As chaves delegadas assinam artefactos ao abrigo da raiz; a Revocation List é o sinal de segurança quando uma chave, artefacto ou implementação deixa de ser confiável — fail-closed. Nada disto é autorização regulatória: essa pertence ao regulador competente e ao operador.",
            vec![c("opengov"), c("ceremony"), c("trust")],
            Some(vec!["A Trust Root assina metadados, releases, chaves delegadas e revogações.", "Não autoriza pagamentos, não cria operadores, não emite licença e não certifica operadores."]),
            Some(vec!["Revogação é licença?", "O que aconteceu à BANZA CA?"]));
    }
    // Can the protocol outlive its founding team?
    if has(&[
        "sobrevive",
        "sobreviver",
        "equipa fundadora",
        "fundadores",
        "sem os fundadores",
        "depende da equipa",
        "succession",
        "sucessao do protocolo",
        "sucessão do protocolo",
        "forkable",
        "fork do protocolo",
    ]) {
        return mk("protocol_survival", "answer",
            "O protocolo pode sobreviver à equipa fundadora se specs, código, testes, docs, RFCs e conformance tools forem públicos e mantidos pela comunidade. Um protocolo financeiro aberto bem desenhado não deve depender da equipa que o criou para continuar a existir. Os mecanismos são: especificações públicas e versionadas; implementação de referência em open source; testes de conformidade públicos e reproduzíveis; schemas e tooling públicos; um processo de RFC aberto; maintainers e maintainers de emergência; divulgação responsável de segurança; rotação da Trust Root e continuidade da revogação; e forkability — qualquer pessoa pode continuar o protocolo. A rede não depende dos fundadores para admitir participantes, porque não há admissão: operadores independentes implementam o protocolo e publicam evidência verificável de conformidade.",
            vec![c("opengov"), c("gov"), c("dev")],
            Some(vec!["Specs, código, testes, docs, RFCs e conformance tools públicos — o protocolo é forkable.", "Não há admissão de operadores, logo a participação não depende dos fundadores."]),
            Some(vec!["Qual é o papel dos maintainers?", "Quem aceita operadores?"]));
    }
    // BANZA does not authorise operators (BX1.8A + M2.2) — "BANZA autoriza operadores?", "é autoridade?".
    if has(&[
        "banza ca autoriza",
        "ca autoriza operador",
        "ca autoriza operadores",
        "autoriza operadores",
        "autoriza operador financeiro",
        "banza autoriza operador",
        "banza ca e autoridade",
        "banza ca é autoridade",
        "autoridade regulatoria",
        "autoridade regulatória",
        "banza ca substitui",
        "substitui o regulador",
        "substitui regulador",
    ]) {
        return mk("banza_ca_not_regulator", "answer",
            "Não. O BANZA não autoriza operadores — nem técnica, nem regulatoriamente. O conceito de autoridade central de operadores foi removido em M2.2: a participação no ecossistema não depende de uma autoridade humana central. Operadores independentes implementam o protocolo, publicam manifests e produzem evidência verificável de conformidade; qualquer pessoa ou sistema verifica essa evidência. Quem autoriza um operador a prestar serviços financeiros reais é o regulador competente — nunca o BANZA nem a sua governação.",
            vec![c("cert"), c("ops"), c("estado")],
            Some(vec!["O BANZA não autoriza, não certifica, não aceita nem aprova operadores.", "A autorização do operador pertence ao regulador competente, não ao protocolo."]),
            Some(vec!["BANZA precisa de licença?", "Um PASS é certificado?"]));
    }
    if has(&[
        "banza ca",
        "banza-ca",
        "ca certifica",
        "o que a banza certifica",
        "o que e que a banza ca",
        "papel da banza ca",
        "certificate authority",
        "autoridade certificadora",
        "remover ca",
        "removeu a ca",
    ]) {
        return mk("open_protocol_trust_model", "answer",
            "O modelo activo do BANZA não depende de uma autoridade humana central. A governação mantém o protocolo; a compatibilidade é verificada por regras públicas, manifests, evidência de conformidade, trust root, chaves delegadas e revocation/fail-closed. Em concreto: um operador independente implementa o protocolo, publica o seu Operator Manifest e a sua Conformance Evidence, e expõe endpoints compatíveis. Quem quiser encaminhar corre localmente a Open Trust Evaluation sobre esse material publicado e decide por si. A Protocol Governance e os Protocol Maintainers mantêm specs, versões, RFCs, segurança, criptografia, documentação, tooling e processos de emergência — não autorizam, certificam, aceitam nem aprovam operadores. A Trust Root assina metadados do protocolo, releases, chaves delegadas e revogações; não autoriza operadores, não emite licença e não autoriza pagamentos.",
            vec![c("trustmodel"), c("gov"), c("trust")],
            Some(vec!["A participação não depende de autoridade humana central: a compatibilidade demonstra-se por evidência verificável.", "A Protocol Governance mantém o protocolo; não autoriza, certifica, aceita nem aprova operadores.", "A Trust Root assina metadados/releases/chaves/revogações; não autoriza operadores nem pagamentos."]),
            Some(vec!["Quem aceita operadores?", "O que substitui o certificado?"]));
    }

    // ── 5. Operator intents ──
    if has(&[
        "operador candidato",
        "candidato vs certificado",
        "candidato a certificacao",
        "diferenca entre candidato",
        "candidato ou certificado",
    ]) {
        return mk("operator_candidate_vs_certified", "answer",
            "Um candidato implementa o protocolo e prepara evidência (corre a conformidade em sandbox, recolhe PASS/FAIL). Um operador participante é aquele que publica o seu manifest e evidência verificável de conformidade, consta do Public Protocol Registry e não consta da Revocation List — sem qualquer aprovação humana central. Hoje o registo público está vazio (/operators = [], production_certificates = false): apenas preparação é possível.",
            vec![c("ops"), c("cert"), c("operators")],
            Some(vec!["Ninguém aprova operadores; a participação demonstra-se por evidência verificável.", "Registo público vazio hoje (/operators = [])."]), None);
    }
    if has(&[
        "obrigacoes",
        "obrigações",
        "o que o operador implementa",
        "responsabilidades do operador",
        "o operador tem de",
        "o que tem de fazer o operador",
    ]) {
        return mk("operator_obligations", "answer",
            "O operador implementa os endpoints do seu nível, garante os invariantes financeiros, expõe as rotas exigidas e assume as obrigações que ficam fora do protocolo — KYC/KYB, AML/CFT, licenciamento e a execução financeira — na sua própria infraestrutura. O BANZA verifica correcção; não assume essas obrigações.",
            vec![c("ops"), c("arch"), c("gov")],
            Some(vec!["KYC/KYB e AML/CFT são do operador, não do protocolo."]), None);
    }
    if has(&[
        "registo de operadores",
        "registo publico",
        "public registry",
        "registry de operadores",
    ]) {
        return mk("operator_registry", "answer",
            "O Public Protocol Registry é um índice verificável do material que os operadores publicam — manifests, conformance evidence e signed protocol metadata, cada entrada com hashes e assinaturas reproduzíveis. Não é uma lista de operadores aprovados, licenciados ou certificados, nem uma whitelist regulatória. Hoje a rota máquina /operators devolve uma lista vazia (/operators = []): nenhum operador publicou evidência. O registo de produção depende de M2/M3.",
            vec![c("operators"), c("ops"), c("estado")],
            Some(vec!["/operators = [] neste estado."]), None);
    }
    if has(&[
        "o que e um operador",
        "o que é um operador",
        "o que e operador",
        "papel do operador",
        "quem e operador",
        "quem é operador",
    ]) {
        return mk("operator_role", "answer",
            "Um operador é um produto/serviço comercial que implementa o protocolo BANZA na sua própria infraestrutura. O BANZA (protocolo) define as regras; a Protocol Governance mantém-nas e evolui-as; o BanzAI explica; os operadores independentes implementam, publicam evidência verificável de conformidade e operam. Nenhuma autoridade humana central autoriza operadores. O protocolo é independente de qualquer operador.",
            vec![c("ops"), c("arch"), adr_link("ADR-001")],
            None, Some(vec!["Porque é que /operators=[]?", "Quais as obrigações do operador?"]));
    }

    // ── 6. Trust / federation / manifest ──
    if has(&[
        "manifesto do operador",
        "rever manifesto",
        "reve o meu manifesto",
        "revê o meu manifesto",
        "reve o manifesto",
        "revisao de manifesto",
        "meu manifesto",
        "valida o manifesto",
        "validar manifesto",
        "valida manifesto",
    ]) {
        return mk("manifest_review", "answer",
            "O BanzAI valida o manifesto do operador localmente (sem rede por defeito): campos obrigatórios, tipos, URLs bem formadas e o invariante de segurança (simulated=true, production_allowed=false). Um manifesto válido é evidência técnica — não cria operador (não altera /operators), não certifica e não aprova. O operador publica o manifest e a evidência; qualquer pessoa verifica, sem aprovação humana central.",
            vec![c("manifest"), c("cert"), c("ops")],
            Some(vec!["Validação de manifesto é evidência técnica — não cria operador, não certifica, não aprova.", "A conformidade demonstra-se por evidência verificável, não por aprovação humana."]), None);
    }
    if has(&["brl", "revoga", "revogacao", "revogação", "lista de revog"]) {
        return mk("brl_revocation", "answer",
            "O BRL (Banza Revocation List) é a revocation list pública e assinada — chaves, material de trust ou implementações que deixaram de ser confiáveis. A revogação é um sinal de segurança do protocolo, não uma sanção regulatória nem uma licença. No modelo activo o trust é avaliado pela Open Trust Evaluation: signed protocol metadata, delegated signing keys, operator manifest, conformance evidence, public protocol registry e revocation/fail-closed — material ausente, inválido, expirado, revogado ou incompatível reprova (fail-closed). Ninguém emite certificados de operador. A revocation list de produção depende do marco M2.",
            vec![c("trust"), c("fed"), adr_link("ADR-031"), cl("/federation/revocation-list.json", "/federation/revocation-list.json")],
            Some(vec!["Revogação é sinal de segurança, não sanção nem licença."]), None);
    }
    if has(&[
        "cadeia de confianca",
        "cadeia de confiança",
        "chave raiz",
        "manifesto de chaves",
        "hierarquia de confian",
        "confian",
        "checksum",
        "artefactos publicos",
        "como verificar o estado",
        "como verificar estado",
    ]) {
        return mk("trust_chain", "answer",
            "A confiança não está num servidor — está nas assinaturas, chaves e regras públicas. A cadeia vai do Trust Root (a Chave Raiz offline, 2-de-3, que assina signed protocol metadata, delegated signing keys, releases e revocation lists — nunca operadores, pagamentos ou licenças) para as delegated signing keys, que assinam a signed protocol metadata. As chaves privadas nunca residem na infraestrutura que serve tráfego (ADR-029). O trust de um operador é avaliado pela Open Trust Evaluation sobre o material que ele publica — não há certificado de operador. O estado verifica-se nas rotas máquina; a trust metadata de produção depende do marco M2.",
            vec![c("trust"), adr_link("ADR-027"), adr_link("ADR-029"), c("estado")],
            Some(vec!["Trust metadata de produção depende de M2."]), None);
    }
    if has(&["federa"]) {
        return mk("federation_explanation", "answer",
            "A federação permite que operadores certificados encaminhem pagamentos entre si sem acordos bilaterais: confiança (verificação criptográfica do certificado do par), encaminhamento (pedido assinado com trace_id), aceitação/execução, obrigação (débito atómico + dívida irrevogável) e liquidação (compensação bilateral). A federação de produção depende do marco M3 — hoje não existe federação de produção activa.",
            vec![c("fed"), adr_link("ADR-031"), c("estado")],
            Some(vec!["Sem federação de produção activa (M3 pendente)."]), None);
    }

    // ── 7. Decisions (ADR/RFC) — data-driven ──
    if has(&[
        "adr vs rfc",
        "adr ou rfc",
        "diferenca entre adr",
        "diferença entre adr e rfc",
        "adr e rfc diferenca",
    ]) {
        return mk("adr_vs_rfc", "answer",
            "Um ADR (Architecture Decision Record) regista uma decisão de arquitectura já tomada — imutável quando aceite. Uma RFC (Request for Comments) é uma proposta pública de mudança, aberta a discussão antes de ser aceite. As RFCs propõem; os ADRs registam o que foi decidido. A governação é humana e aberta.",
            vec![c("gov"), c("decisoes")], None, None);
    }
    if let Some(d) = find_decision(&t) {
        return mk(
            "adr_explanation",
            "answer",
            &format!("O {} ({}) — {}", d.id, d.title, d.summary),
            vec![cl(d.cite, d.url), c("decisoes"), c("gov")],
            None,
            None,
        );
    }
    if has(&["adr", "decisao", "decisão"]) {
        return mk("adr_general", "answer",
            "Os ADRs são as decisões de arquitectura do protocolo — imutáveis quando aceites. Pode consultar cada decisão na biblioteca pública. Diga o número (por exemplo, «Explica o ADR-002») para uma explicação específica com a fonte canónica.",
            vec![c("decisoes"), c("gov"), c("arch")], None, None);
    }
    if has(&[
        "rfc",
        "propor",
        "proposta",
        "alterar o protocolo",
        "mudar as regras",
        "propor uma alteracao",
        "propor uma alteração",
        "alteracao ao protocolo",
    ]) {
        return mk("rfc_explanation", "answer",
            "As mudanças ao protocolo passam por RFCs — propostas públicas e auditáveis, abertas a qualquer implementador. Uma RFC descreve o problema, a mudança e o impacto; é discutida e, se aceite, torna-se decisão. A governação é humana e aberta — nenhuma alteração vem de uma resposta de IA.",
            vec![c("gov"), c("decisoes")],
            None, Some(vec!["Qual a diferença entre ADR e RFC?"]));
    }

    // ── 8. Developer intents ──
    if has(&[
        "invariante",
        "partidas dobradas",
        "double-entry",
        "double entry",
    ]) {
        return mk("invariants_financial", "answer",
            "Os invariantes financeiros são afirmações não negociáveis impostas pelo núcleo: partidas dobradas (débitos = créditos), imutabilidade dos lançamentos, montantes sempre inteiros (minor units), atomicidade, gross = net + fee e saldo = disponível + reservado. São regras que a implementação do operador deve garantir — o BANZA verifica-as, não movimenta fundos. Qualquer violação resulta em REPROVAÇÃO de conformidade.",
            vec![c("arch"), c("cert")],
            Some(vec!["O BANZA verifica invariantes; não movimenta fundos."]), None);
    }
    if has(&["idempot"]) {
        return mk("idempotency", "answer",
            "A idempotência garante que repetir o mesmo pedido (por exemplo, após um timeout) não duplica o efeito: cada operação carrega uma chave de idempotência e a implementação deve devolver o mesmo resultado para a mesma chave, sem repetir o lançamento. É um invariante de correcção — verificado pela conformidade, não pelo BanzAI.",
            vec![c("arch"), c("dev"), c("decisoes")],
            None, Some(vec!["Como interpretar um webhook?", "Como preparar evidência para conformidade?"]));
    }
    if has(&[
        "qr",
        "codigo qr",
        "código qr",
        "payload qr",
        "qr dinamico",
        "qr dinâmico",
        "qr estatico",
        "qr estático",
    ]) {
        return mk("qr_payloads", "answer",
            "O payload QR tem um formato canónico definido nos contratos públicos — o QR estático identifica um recebedor, o QR dinâmico inclui montante e um identificador de uso único. A iniciação de pagamento por QR entra ao nível L2. O formato exacto vive nos contratos; o BanzAI explica-o, não o altera.",
            vec![c("dev"), c("arch"), c("cert")],
            None, Some(vec!["Como implementar idempotência?", "O que exige o nível L2?"]));
    }
    if has(&[
        "por onde comecar",
        "por onde começar",
        "comecar a implementar",
        "começar a implementar",
        "quickstart",
        "sou programador",
        "developer",
        "implementar o protocolo",
    ]) {
        return mk("developer_quickstart", "answer",
            "Comece pelos cinco artefactos normativos: a especificação (referência), os contratos (OpenAPI/webhooks/QR), os invariantes, os vectores de conformidade e a ferramenta de conformidade. Implemente os endpoints do seu nível, corra a conformidade em sandbox e gere evidência. Tudo é público; nenhum SDK é exigido.",
            vec![c("dev"), c("arch"), c("ref")],
            None, Some(vec!["Como usar a sandbox sem dinheiro real?", "Como implementar idempotência?"]));
    }
    if has(&["webhook", "payload", "contrato", "openapi", "endpoint"]) {
        return mk("webhooks_and_payloads", "answer",
            "Os contratos definem as interfaces que um operador deve expor — OpenAPI para as APIs, esquemas para webhooks e o formato do payload QR. Um webhook deve ser verificado (assinatura/idempotência) antes de ser processado. Os formatos canónicos vivem nos contratos públicos; o BanzAI explica-os, não os altera.",
            vec![c("dev"), c("arch"), c("decisoes")],
            None, Some(vec!["Como implementar idempotência?", "O que devo fazer com secrets?"]));
    }
    if has(&[
        "sandbox",
        "dinheiro real",
        "sem dinheiro",
        "ambiente de teste",
    ]) {
        return mk("sandbox_no_real_money", "answer",
            "A sandbox executa a conformidade sem mover dinheiro real: é onde implementa, testa e gera evidência (PASS/FAIL) de forma reproduzível. Um PASS é evidência técnica, não um certificado — e a sandbox não integra rails de produção nem move fundos.",
            vec![c("dev"), c("cert")],
            Some(vec!["A sandbox não move dinheiro real.", "PASS ≠ certificado."]), None);
    }
    if has(&[
        "secret",
        "segredo",
        "chave privada",
        "credencial",
        "password",
        "token",
        "logs sensiveis",
        "dados sensiveis",
    ]) {
        return mk("secrets_security", "answer",
            "Os segredos ficam fora do Git — apenas no ambiente do servidor, nunca commitados, nunca em logs ou payloads. As chaves privadas de assinatura nunca residem na infraestrutura que serve tráfego (ADR-029). Boas práticas: variáveis de ambiente no servidor, rotação e mínimo privilégio.",
            vec![adr_link("ADR-029"), c("trust"), c("dev")],
            Some(vec!["Nenhum segredo em Git, logs ou payloads."]), None);
    }

    // ── 9. Fallback — insufficient evidence (never invented) ──
    mk("unknown", "uncertain",
        "Não encontrei informação suficiente nas fontes locais da demonstração para responder com confiança. Posso explicar o protocolo BANZA — certificação, federação, confiança, invariantes, operadores, um ADR específico, ou o estado verificável. Para a explicação completa, veja o capítulo da referência.",
        vec![c("banzai"), c("ref"), c("decisoes")],
        None, Some(vec!["O que é o BanzAI?", "O que significa /operators=[]?", "O que diz o ADR-002?"]))
}

/// Intent answer + attached evidence bundle from the static index (for "answer" kinds with hits).
pub fn answer_full(raw: &str) -> KbAnswer {
    let mut a = answer(raw);
    if a.kind == "answer" {
        let bundle = index::shared().search(raw, 3);
        if !bundle.results.is_empty() {
            a.evidence = Some(bundle);
        }
    }
    a
}

/// JSON of `answer_full` — the value the website renders. Deterministic.
pub fn answer_json(raw: &str) -> String {
    serde_json::to_string(&answer_full(raw)).unwrap_or_else(|_| "{}".into())
}

// ── WASM boundary — the website's only entry point ──────────────────────────────

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/// WASM export: `answer_query(query) -> JSON string` (a serialized `KbAnswer`).
/// The website adapter parses this; it performs no matching/scoring of its own.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn answer_query(query: &str) -> String {
    answer_json(query)
}

/// Engine identity for the adapter (llm_calls=0, external_model_called=false always).
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn engine_version() -> String {
    ENGINE_VERSION.to_string()
}
