//! Static local evidence index (ADR-037, R2 · PART 4).
//!
//! Corpus loading, source classification, chunking, normalization, keyword extraction,
//! deterministic scoring, retrieval and evidence-bundle generation over the BANZA corpus.
//! The corpus (the canonical PT reference + route/ADR facts) is embedded at compile time via
//! `include_str!`, so the engine is self-contained in native and WASM builds. No filesystem,
//! no network, no model.

use crate::normalize;
use serde::Serialize;
use std::sync::OnceLock;

/// The canonical PT reference, embedded so retrieval works with no filesystem (native + WASM).
pub const REFERENCE_MD: &str = include_str!("../../../website/content/BANZA_REFERENCIA.md");

/// Internal routes the engine may cite. Nothing else may appear as a citation.
pub const ALLOWED_URLS: &[&str] = &[
    "/referencia",
    "/referencia/o-que-e",
    "/referencia/porque-existe",
    "/referencia/principios",
    "/referencia/arquitectura",
    "/referencia/confianca",
    "/referencia/certificacao",
    "/referencia/federacao",
    "/referencia/operadores",
    "/referencia/governacao",
    "/referencia/banzai",
    "/referencia/racional",
    "/referencia/programadores",
    "/referencia/roteiro",
    "/referencia/faq",
    "/estado",
    "/operators",
    "/certificates",
    "/decisoes",
    "/banzai",
    "/decisoes/adr-002",
    "/decisoes/adr-003",
    "/decisoes/adr-052",
    "/decisoes/adr-040",
    "/decisoes/adr-038",
    "/decisoes/adr-028",
    "/decisoes/adr-029",
    "/federation/revocation-list.json",
];

pub const FORBIDDEN_CLAIMS: &[&str] = &[
    "model output is evidence",
    "operador certificado hoje",
    "certificados de producao activos",
    "qwen activo",
    "deepseek activo",
    "provider real activo",
];

const STOPWORDS: &[&str] = &[
    "a", "o", "os", "as", "de", "do", "da", "dos", "das", "e", "que", "um", "uma", "para", "por",
    "com", "no", "na", "nos", "nas", "em", "se", "ao", "aos", "the", "of", "to", "is", "in", "on",
    "and", "or", "an", "at", "it", "sobre", "qual", "quais", "como", "onde", "quando", "sao", "ou",
    "meu", "minha", "este", "esta", "isso", "esse", "essa",
];

const CHAPTER_SLUGS: &[&str] = &[
    "",
    "o-que-e",
    "porque-existe",
    "principios",
    "arquitectura",
    "confianca",
    "certificacao",
    "federacao",
    "operadores",
    "governacao",
    "banzai",
    "racional",
    "programadores",
    "roteiro",
    "faq",
];

// ── Tokenization ─────────────────────────────────────────────────────────────

pub fn technical_tokens(norm: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    let mut push = |s: &str| {
        let s = s.to_string();
        if !out.contains(&s) {
            out.push(s);
        }
    };
    for kw in [
        "/operators",
        "/certificates",
        "production_certificates",
        "llm_calls",
        "external_model_called",
        "/federation/revocation-list.json",
        "/estado",
        "/decisoes",
    ] {
        if norm.contains(kw) {
            push(kw);
        }
    }
    for kw in [
        "brl", "kyc", "kyb", "aml", "cft", "qr", "m2", "m3", "l0", "l1", "l2", "l3", "l4",
    ] {
        if contains_word(norm, kw) {
            push(kw);
        }
    }
    if let Some(n) = extract_adr(norm) {
        push(&format!("adr-{:03}", n));
    }
    if norm.contains("trust assertion") {
        push("trust-assertion");
    }
    out
}

fn contains_word(norm: &str, word: &str) -> bool {
    norm.split(|c: char| !c.is_alphanumeric())
        .any(|t| t == word)
}

pub fn extract_adr(norm: &str) -> Option<u32> {
    let b = norm.as_bytes();
    let mut i = 0;
    while let Some(p) = norm[i..].find("adr") {
        let mut j = i + p + 3;
        while j < b.len() && matches!(b[j], b' ' | b'-' | b'_') {
            j += 1;
        }
        let start = j;
        let mut n = 0u32;
        while j < b.len() && b[j].is_ascii_digit() {
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

pub fn tokenize(norm: &str) -> Vec<String> {
    norm.split(|c: char| !c.is_alphanumeric())
        .filter(|t| t.len() >= 2 && !STOPWORDS.contains(t))
        .map(|t| t.to_string())
        .collect()
}

fn stem_eq(a: &str, b: &str) -> bool {
    if a == b {
        return true;
    }
    let sa = a.strip_suffix('s').unwrap_or(a);
    let sb = b.strip_suffix('s').unwrap_or(b);
    sa == sb && sa.len() >= 3
}

// ── Data model ─────────────────────────────────────────────────────────────────

#[derive(Serialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum SourceType {
    Reference,
    Adr,
    Status,
    PublicPage,
    MachineRoute,
}

pub struct EvidenceSource {
    pub id: String,
    pub title: String,
    pub source_type: SourceType,
    pub url: String,
    pub tags: Vec<String>,
    pub weight: f64,
    pub body: String,
}

pub struct EvidenceChunk {
    pub id: String,
    pub source_id: String,
    pub title: String,
    pub url: String,
    pub normalized_text: String,
    pub tokens: Vec<String>,
    pub keywords: Vec<String>,
    pub tags: Vec<String>,
    pub source_type: SourceType,
    pub weight: f64,
    pub excerpt: String,
    pub text_len: usize,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceResult {
    pub chunk_id: String,
    pub source_id: String,
    pub title: String,
    pub url: String,
    pub score: f64,
    pub reasons: Vec<String>,
    pub excerpt: String,
    pub matched_terms: Vec<String>,
    pub source_type: SourceType,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceBundle {
    pub query: String,
    pub normalized_query: String,
    pub results: Vec<EvidenceResult>,
    pub citations: Vec<String>,
    pub confidence: f64,
    pub confidence_label: String,
    pub limits: Vec<String>,
    pub engine: String,
    pub engine_version: String,
}

// ── Corpus loading ─────────────────────────────────────────────────────────────

pub fn load_reference(md: &str) -> Vec<EvidenceSource> {
    let mut sources = Vec::new();
    let mut slug = String::new();
    let mut chapter = String::new();
    let mut heading = String::new();
    let mut buf = String::new();
    let mut idx = 0usize;

    fn flush(
        sources: &mut Vec<EvidenceSource>,
        slug: &str,
        chapter: &str,
        heading: &str,
        buf: &str,
        idx: &mut usize,
    ) {
        let text = buf.trim();
        if slug.is_empty() || text.len() < 60 {
            return;
        }
        *idx += 1;
        let title = if heading.is_empty() {
            chapter.to_string()
        } else {
            heading.to_string()
        };
        sources.push(EvidenceSource {
            id: format!("ref-{slug}-{idx}"),
            title,
            source_type: SourceType::Reference,
            url: format!("/referencia/{slug}"),
            tags: vec![slug.to_string(), "referencia".into()],
            weight: 1.0,
            body: text.to_string(),
        });
    }

    for line in md.lines() {
        if let Some(rest) = line.strip_prefix("## ") {
            flush(&mut sources, &slug, &chapter, &heading, &buf, &mut idx);
            buf.clear();
            heading.clear();
            chapter = rest.trim().to_string();
            slug.clear();
            if let Some(numstr) = rest.split('.').next() {
                if let Ok(n) = numstr.trim().parse::<usize>() {
                    if n < CHAPTER_SLUGS.len() {
                        slug = CHAPTER_SLUGS[n].to_string();
                    }
                }
            }
        } else if let Some(rest) = line.strip_prefix("### ") {
            flush(&mut sources, &slug, &chapter, &heading, &buf, &mut idx);
            buf.clear();
            heading = rest.trim().to_string();
        } else if !line.starts_with("![") && !line.starts_with('|') {
            buf.push_str(line.trim());
            buf.push(' ');
        }
    }
    flush(&mut sources, &slug, &chapter, &heading, &buf, &mut idx);
    sources
}

pub fn route_sources() -> Vec<EvidenceSource> {
    let mk =
        |id: &str, title: &str, st: SourceType, url: &str, tags: &[&str], w: f64, body: &str| {
            EvidenceSource {
                id: id.into(),
                title: title.into(),
                source_type: st,
                url: url.into(),
                tags: tags.iter().map(|s| s.to_string()).collect(),
                weight: w,
                body: body.into(),
            }
        };
    let adr = |id: &str, n: u32, title: &str, tags: &[&str], body: &str| {
        mk(
            id,
            title,
            SourceType::Adr,
            &format!("/decisoes/adr-{:03}", n),
            tags,
            1.4,
            body,
        )
    };
    vec![
        mk("route-operators", "Registo de operadores", SourceType::Status, "/operators", &["operators", "estado", "registo"], 1.6,
           "A rota máquina /operators devolve uma lista vazia: nenhum operador está certificado. É estado verificável, não opinião. O registo de produção depende de M2/M3."),
        mk("route-certificates", "Certificados", SourceType::Status, "/certificates", &["certificates", "estado", "certificacao"], 1.6,
           "A rota /certificates devolve production_certificates=false: não há certificados de produção activos. A emissão depende dos marcos M2 e M3."),
        mk("route-estado", "Estado verificável", SourceType::Status, "/estado", &["estado", "verificavel", "rotas maquina"], 1.5,
           "O estado verificável do protocolo é servido em rotas máquina públicas (JSON): operators, certificates, manifestos e revogação. Pré-produção, mock, llm_calls=0, external_model_called=false."),
        mk("route-decisoes", "Decisões (ADRs/RFCs)", SourceType::PublicPage, "/decisoes", &["decisoes", "adr", "rfc"], 1.2,
           "A biblioteca de decisões reúne os ADRs (decisões de arquitectura, imutáveis quando aceites) e as RFCs (propostas públicas de mudança)."),
        mk("route-revocation", "Lista de revogação (BRL)", SourceType::MachineRoute, "/federation/revocation-list.json", &["brl", "revogacao", "federacao"], 1.3,
           "O BRL (BANZA Revocation List) é a lista pública e assinada de operadores cujo certificado deixou de ser confiável. Verificação Tripla: consta do Registo, tem certificado válido e não consta do BRL."),
        adr("adr-002", 2, "ADR-002 — Ecosystem Naming Inversion", &["adr-002", "nomenclatura", "hierarquia"],
            "Fixa a nomenclatura e a separação estrita: a Governação evolui as regras, o BANZA define o protocolo, a Protocol Governance mantém o protocolo, o BanzAI explica e os operadores independentes implementam. A dependência corre numa única direcção."),
        adr("adr-003", 3, "ADR-003 — Protocol/Operator Separation", &["adr-003", "separacao", "operador"],
            "Estabelece a fronteira entre o protocolo e a lógica de negócio do operador. O BANZA define regras e verificação; o operador implementa e assume KYC/KYB e AML/CFT na sua infraestrutura."),
        adr("adr-052", 52, "ADR-052 — Operador Zero (operador de referência)", &["adr-052", "operador de referencia", "operador zero"],
            "Define o Operador Zero, o operador de referência/demonstração do protocolo: um simulador canónico que demonstra as capacidades do protocolo de ponta a ponta sem ser proprietário dele — demonstração apenas, nunca um operador real ou publicado."),
        adr("adr-040", 40, "ADR-040 — Federation Trust Evaluation", &["adr-040", "federacao", "confianca"],
            "Define como operadores conformes confiam uns nos outros para federar: uma Federation Trust Evaluation feita pela própria parte que faz o routing, sobre material público (signed protocol metadata, conformance evidence, registo público e revocation/fail-closed), sem certificado emitido pela BANZA. A federação de produção depende de M3."),
        adr("adr-038", 38, "ADR-038 — Open Protocol Trust Model (raiz de produção)", &["adr-038", "raiz", "chave raiz"],
            "Define o modelo de trust aberto sem autoridade central: a Chave Raiz offline (custódia por threshold 2-de-3) assina apenas metadata, chaves delegadas e revogação, e o signed key manifest distribui o trust-anchor — chaves delegadas domain-separated e geridas offline, separadas da infraestrutura em linha. Depende de M2."),
        adr("adr-028", 28, "ADR-028 — Private keys off serving infrastructure", &["adr-028", "chaves privadas", "secrets"],
            "As chaves privadas nunca residem na infraestrutura que serve tráfego: o material de assinatura fica isolado da superfície pública."),
        adr("adr-029", 29, "ADR-029 — KYC operator policy; Trust Assertions federate", &["adr-029", "kyc", "trust assertion"],
            "Mantém o KYC como política do operador: o protocolo não centraliza KYC — apenas Trust Assertions podem federar entre operadores."),
    ]
}

pub fn load_corpus() -> Vec<EvidenceSource> {
    let mut s = route_sources();
    s.extend(load_reference(REFERENCE_MD));
    s
}

fn excerpt_of(text: &str, max: usize) -> String {
    let t = text.trim();
    if t.chars().count() <= max {
        return t.to_string();
    }
    let mut s: String = t.chars().take(max).collect();
    s.push('…');
    s
}

pub fn build_chunks(sources: &[EvidenceSource]) -> Vec<EvidenceChunk> {
    sources
        .iter()
        .map(|s| {
            let norm = normalize(&s.body);
            let mut kw = technical_tokens(&norm);
            for t in tokenize(&norm).into_iter().take(12) {
                if !kw.contains(&t) {
                    kw.push(t);
                }
            }
            EvidenceChunk {
                id: format!("chunk-{}", s.id),
                source_id: s.id.clone(),
                title: s.title.clone(),
                url: s.url.clone(),
                tokens: tokenize(&norm),
                keywords: kw,
                tags: s.tags.clone(),
                source_type: s.source_type.clone(),
                weight: s.weight,
                excerpt: excerpt_of(&s.body, 220),
                text_len: s.body.len(),
                normalized_text: norm,
            }
        })
        .collect()
}

// ── Index + search ─────────────────────────────────────────────────────────────

pub struct Index {
    pub chunks: Vec<EvidenceChunk>,
}

static SHARED: OnceLock<Index> = OnceLock::new();

/// Process-wide index built once from the embedded corpus.
pub fn shared() -> &'static Index {
    SHARED.get_or_init(Index::build)
}

impl Index {
    pub fn build() -> Self {
        Index {
            chunks: build_chunks(&load_corpus()),
        }
    }

    pub fn search(&self, query: &str, top: usize) -> EvidenceBundle {
        let nq = normalize(query);
        let qtokens = tokenize(&nq);
        let qtech = technical_tokens(&nq);
        let qadr = extract_adr(&nq);
        let status_query = qtech.iter().any(|t| {
            matches!(
                t.as_str(),
                "/operators"
                    | "/certificates"
                    | "production_certificates"
                    | "/estado"
                    | "llm_calls"
            )
        });

        let mut scored: Vec<EvidenceResult> = self
            .chunks
            .iter()
            .filter_map(|ch| {
                let (score, reasons, matched) =
                    score_chunk(ch, &nq, &qtokens, &qtech, qadr, status_query);
                if score <= 0.0 {
                    None
                } else {
                    Some(EvidenceResult {
                        chunk_id: ch.id.clone(),
                        source_id: ch.source_id.clone(),
                        title: ch.title.clone(),
                        url: ch.url.clone(),
                        score,
                        reasons,
                        excerpt: ch.excerpt.clone(),
                        matched_terms: matched,
                        source_type: ch.source_type.clone(),
                    })
                }
            })
            .collect();

        scored.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then(a.url.cmp(&b.url))
                .then(a.chunk_id.cmp(&b.chunk_id))
        });
        scored.truncate(top);

        let mut citations: Vec<String> = Vec::new();
        for r in &scored {
            if !citations.contains(&r.url) {
                citations.push(r.url.clone());
            }
        }
        let top_score = scored.first().map(|r| r.score).unwrap_or(0.0);
        let (confidence, label) = confidence_of(top_score);
        let mut limits = vec![
            "O output do modelo nunca é evidência; a evidência vem da base de conhecimento do BANZA.".to_string(),
        ];
        if scored.is_empty() {
            limits.push("Sem informação suficiente nas fontes locais da demonstração.".into());
        } else if label == "low" {
            limits.push("Fontes relacionadas — não uma conclusão.".into());
        }
        EvidenceBundle {
            query: query.to_string(),
            normalized_query: nq,
            results: scored,
            citations,
            confidence,
            confidence_label: label.into(),
            limits,
            engine: crate::ENGINE.into(),
            engine_version: crate::ENGINE_VERSION.into(),
        }
    }
}

fn confidence_of(top: f64) -> (f64, &'static str) {
    if top >= 9.0 {
        (0.9, "high")
    } else if top >= 4.0 {
        (0.6, "medium")
    } else if top >= 1.5 {
        (0.3, "low")
    } else {
        (0.0, "none")
    }
}

/// Auditable per-chunk scoring. Returns (score, reasons, matched_terms).
pub fn score_chunk(
    ch: &EvidenceChunk,
    nq: &str,
    qtokens: &[String],
    qtech: &[String],
    qadr: Option<u32>,
    status_query: bool,
) -> (f64, Vec<String>, Vec<String>) {
    let mut score = 0.0f64;
    let mut reasons: Vec<String> = Vec::new();
    let mut matched: Vec<String> = Vec::new();
    let ntitle = normalize(&ch.title);

    if let Some(n) = qadr {
        if ch.url == format!("/decisoes/adr-{:03}", n) {
            score += 10.0;
            reasons.push("exact_adr_match".into());
        }
    }
    if nq.len() >= 6 && ch.normalized_text.contains(nq) {
        score += 6.0;
        reasons.push("exact_phrase".into());
    }
    for qt in qtech {
        if ch.keywords.iter().any(|k| k == qt) || ch.normalized_text.contains(qt.as_str()) {
            score += 3.0;
            matched.push(qt.clone());
            if !reasons.iter().any(|r| r == "technical_token_match") {
                reasons.push("technical_token_match".into());
            }
        }
    }
    for qt in qtokens {
        if ch.tags.iter().any(|t| stem_eq(t, qt)) {
            score += 2.5;
            if !reasons.iter().any(|r| r == "tag_match") {
                reasons.push("tag_match".into());
            }
        }
    }
    let mut title_hits = 0;
    for qt in qtokens {
        if ntitle
            .split(|c: char| !c.is_alphanumeric())
            .any(|w| stem_eq(w, qt))
        {
            title_hits += 1;
        }
    }
    if title_hits > 0 {
        score += 2.0 * title_hits as f64;
        reasons.push("title_match".into());
    }
    let mut body_hits = 0;
    for qt in qtokens {
        if ch.tokens.iter().any(|t| stem_eq(t, qt)) {
            body_hits += 1;
            if !matched.contains(qt) {
                matched.push(qt.clone());
            }
        }
    }
    if body_hits > 0 {
        score += body_hits as f64;
        reasons.push("body_match".into());
    }
    if status_query && ch.source_type == SourceType::Status {
        score += 4.0;
        reasons.push("status_route_boost".into());
    }
    if ch.text_len > 1200 && body_hits < 2 && title_hits == 0 {
        score -= 1.0;
    }
    score *= ch.weight;
    (score.max(0.0), reasons, matched)
}

/// True if the phrase at byte `pos` is preceded by a negation within a short window
/// (e.g. "nao ha certificados de producao activos" is a correct BANZA statement, not a claim).
fn is_negated(text: &str, pos: usize) -> bool {
    let start = pos.saturating_sub(22);
    let window = &text[start..pos];
    ["nao ", "sem ", "nenhum", "nunca", "não "]
        .iter()
        .any(|n| window.contains(n))
}

/// Validate that every source URL is in the allowlist and no forbidden *positive* claim is present.
pub fn validate(sources: &[EvidenceSource]) -> Vec<String> {
    let mut warnings = Vec::new();
    for s in sources {
        if !ALLOWED_URLS.contains(&s.url.as_str()) {
            warnings.push(format!("URL fora da allowlist: {} ({})", s.url, s.id));
        }
        let nb = normalize(&s.body);
        for f in FORBIDDEN_CLAIMS {
            let nf = normalize(f);
            if let Some(pos) = nb.find(&nf) {
                if !is_negated(&nb, pos) {
                    warnings.push(format!("claim proibido em {}: {}", s.id, f));
                }
            }
        }
    }
    warnings
}
