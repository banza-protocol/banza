//! M2.13C-C — protocol + fintech-domain vocabulary layer.
//!
//! Maps a NORMALIZED short / definition / boundary vocabulary query to a deterministic `def-*` (or an
//! existing) entry id served from knowledge.js with cited sources + boundary. This is what makes short
//! questions like "o que é federar", "trust", "o que é liquidação", "what is a PSP" resolve
//! DETERMINISTICALLY (never the flaky grounded path, never `no_source`) while still ceding genuine
//! operational how-to questions ("como demonstro conformidade") to grounding.
//!
//! Pure string matching over the normalized query — no engine logic, no model, no network. Called at
//! the END of `route::critical_entry`, so every more-specific critical arm wins first, and only
//! vocabulary queries that would otherwise fall to grounding/no_source reach here.

/// Substring test across patterns (query is already accent-stripped + lowercased by `normalize`).
fn has(nq: &str, pats: &[&str]) -> bool {
    pats.iter().any(|p| nq.contains(p))
}

/// Whole-token test — avoids "pass" matching "passo"/"passa", "root" matching other words, etc.
fn word(nq: &str, w: &str) -> bool {
    nq.split_whitespace().any(|t| t == w)
}

fn count(nq: &str) -> usize {
    nq.split_whitespace().count()
}

/// A definition question STARTS with a definition lead (PT + EN). A starts-with test (not substring)
/// keeps "Como funciona a federação entre operadores na BANZA?" — an operational/mechanics question —
/// out of the definition class.
fn starts_definition_lead(nq: &str) -> bool {
    [
        "o que e ",
        "o que sao ",
        "o que significa",
        "o que quer dizer",
        "o que representa",
        "o significado de",
        "define ",
        "definicao de",
        "what is ",
        "what are ",
        "what does ",
        "what do ",
        "meaning of ",
    ]
    .iter()
    .any(|l| nq.starts_with(l))
}

/// An operational how-to — let grounding handle it, do NOT hijack with a definition.
fn is_operational(nq: &str) -> bool {
    has(
        nq,
        &[
            "gera",
            "gerar",
            "mostra",
            "mostrar",
            "exemplo",
            "example",
            "template",
            "passo a passo",
            "step by step",
            "demonstr",
            "como publico",
            "valido",
            "implement",
            "como crio",
            "como configuro",
            "como submeto",
            "checklist",
            "me da",
            "da um",
            "json de",
            "yaml",
        ],
    )
}

/// An onboarding / next-step question — grounds (not a definition).
fn is_onboarding(nq: &str) -> bool {
    has(
        nq,
        &[
            "como comeco",
            "onde comeco",
            "primeiros passos",
            "como me torno",
            "como inicio",
            "por onde",
            "get started",
            "how do i become",
            "how do i start",
            "start as an operator",
        ],
    )
}

/// A boundary question ("BANZA é X?", "BANZA substitui X?", "KZ_DEMO é dinheiro real?",
/// "Operador Zero é operador real?") — answered by the vocabulary/boundary entries even when it is not
/// phrased as a definition.
fn is_boundary_query(nq: &str) -> bool {
    // "O BANZA é um banco?" opens this gate through the Portuguese copula. The English copula was
    // missing, so "Is BANZA a bank?" — the same question about the same boundary — never opened it and
    // fell through to the model, while its Portuguese twin was settled deterministically from
    // `def-bank`. Measured, not supposed: identity, wallet and bank all diverged this way. An identity
    // boundary must not depend on which language asks.
    has(
        nq,
        &[
            "banza e ",
            "banza substitui",
            "banza is ",
            "is banza ",
            "banza a ",
            "banza replaces",
            "does banza replace",
            "kz_demo",
            "kz demo",
        ],
    ) || (has(nq, &["operador zero", "operator zero"])
        && has(nq, &["operador real", "operator real", "real operator"]))
}

/// The four Fundamental Principles, asked by their name.
///
/// `normalize` drops the superscript digits of "R²S²" — measured, it yields `"r s"` — so the canonical
/// acronym can never match the spelled form. This is the same collision `def-bcj` documents for "BCJ/1"
/// arriving as "bcj/i": folding is right for prose and wrong for a versioned identifier, so the term that
/// suffers is matched in both forms rather than the normalizer being weakened for every query.
///
/// The folded form is short enough to collide, so it is required to be the WHOLE subject of a short
/// question rather than merely present. "what is r s" resolves; a long sentence that happens to contain
/// those two letters does not.
fn is_r2s2_acronym(nq: &str) -> bool {
    if has(nq, &["r2s2", "r²s²"]) {
        return true;
    }
    let subject = [
        "o que e ",
        "o que sao ",
        "what is ",
        "what are ",
        "define ",
        "explica ",
        "explain ",
    ]
    .iter()
    .find_map(|lead| nq.strip_prefix(*lead))
    .unwrap_or(nq)
    .trim()
    .trim_end_matches('?')
    .trim();
    subject == "r s" || subject == "o r s" || subject == "the r s"
}

/// M2.14C SEC-FIX — a MULTI-WORD governance/documentation phrase (e.g. PT "relatório de auditoria",
/// "request for comments", "architecture decision record") that exceeds the short-definition / bare
/// token gates. The adversarial verifier found the natural PT phrasing "o que é um relatório de
/// auditoria?" (7 tokens) fell to no_source while the EN "audit report" resolved. These phrases are
/// unambiguous governance/dev terms, so they bypass the token gate (still deferring to is_operational).
fn is_governance_phrase(nq: &str) -> bool {
    has(
        nq,
        &[
            "relatorio de auditoria",
            "relatorios de auditoria",
            "relatorio de evidencia",
            "request for comments",
            "architecture decision record",
            "continuous integration",
            "integracao continua",
            "pull request",
            "audit report",
            "evidence report",
            "controlo de versao",
            "registo de decisao",
        ],
    )
}

/// A question about what the protocol's trust material does and does NOT guarantee. These phrases name
/// a property, so they are unambiguous wherever they appear, and they arrive in shapes the gates above
/// reject: "o banza fornece transparência global?" is five tokens with no definition lead. Production QA
/// asked exactly that and was told BANZA provides global transparency — a property the specification
/// denies. Claiming a guarantee that does not exist is worse than refusing to answer, because the reader
/// designs their verification around it. So the phrases bypass the token gate, like the governance
/// phrases above and for the same reason.
fn is_trust_guarantee_phrase(nq: &str) -> bool {
    has(
        nq,
        &[
            "transparencia global",
            "global transparency",
            "split-view",
            "split view",
            "consistencia de conjunto",
            "set consistency",
            "mix-and-match",
            "mix and match",
            "consistencia entre observadores",
            "cross-observer",
            "garantias de confianca",
            "trust guarantees",
        ],
    )
}

/// Root cardinality and threshold asked in shapes the gates reject — "quantas autoridades controlam a
/// Trust Root do BANZA?" is seven tokens with no definition lead, and production answered it with "uma
/// autoridade". The most consequential fact in the protocol, stated wrongly.
///
/// The phrases are matched by STEM ("quantas autoridad", not "quantas autoridades"). The typo-tolerance
/// layer runs before routing and rewrites the correctly spelled plural to the singular with high
/// confidence; the first fix here matched the plural, passed every routing test, and still lost in
/// production because the question that reached the router was no longer the question that was asked.
///
/// The protocol version is deliberately NOT here: it is owned by the attribute registry
/// (`attribute::resolve_attribute_query`), which decides it earlier and from one place.
fn is_protocol_fact_phrase(nq: &str) -> bool {
    has(
        nq,
        &[
            "quantas autoridad",
            "threshold da raiz",
            "threshold da trust root",
            "root threshold",
            "trust root threshold",
            "quorum da raiz",
            "root quorum",
            // The threshold asked in Portuguese words rather than the English term.
            "limiar da raiz",
            // Portuguese uses the proper noun untranslated ("o limiar da Root"), which the raiz-only
            // form missed while the English "root threshold" resolved — the asymmetry ran the other way
            // for this fact.
            "limiar da root",
            "quorum da root",
            "limiar da trust root",
            "limiar de assinatura",
            // "pode agir sozinha?" — the single most consequential yes/no about the Root.
            "agir sozinh",
            "assinar sozinh",
            "act alone",
            "acting alone",
            "unilateral",
        ],
    ) || asks_how_many_authorities(nq)
}

/// "how many root authorities does BANZA have?" — the words sit between the two that matter, so a
/// contiguous phrase never matches it. Asking for both parts independently is what makes the English
/// and Portuguese forms behave the same, which is the whole point: the fact is the same fact.
fn asks_how_many_authorities(nq: &str) -> bool {
    let counting = has(
        nq,
        &["quantas", "quantos", "how many", "number of", "numero de"],
    );
    counting && has(nq, &["autoridad", "authorit"])
}

/// Root SUCCESSION asked in shapes the gates reject (ADR-039). "o que é o conjunto de autoridades da
/// raiz?" is eight tokens — one past the definition-lead gate — so the English form resolved and the
/// Portuguese one fell to no_source, on the canonical language of the protocol. "como se substitui uma
/// autoridade da raiz?" and "o que acontece se uma autoridade for perdida?" carry no definition lead at
/// all and reached the model, which is the wrong decider for a continuity fact: whether the surviving
/// two can replace a lost authority is answered by the chain, not composed as prose.
///
/// Like the phrases above, these name a property and are therefore unambiguous wherever they appear.
fn is_root_succession_phrase(nq: &str) -> bool {
    // Stems, not whole words: the typo-tolerance layer runs before routing and rewrites plurals
    // ("autoridades" → "autoridade"), so a phrase matched in full loses in production.
    let names_the_set = has(
        nq,
        &[
            "conjunto de autoridad",
            "root authority set",
            "conjunto genese",
            "genesis set",
            "authority set",
        ],
    );
    let asks_about_succession = has(
        nq,
        &[
            "sucessao da raiz",
            "sucessao de autoridad",
            "root succession",
            "continuidade da raiz",
            "root continuity",
        ],
    );
    // "substituir/perder/comprometer uma autoridade" — the continuity question in its natural shapes.
    // "a autoridade removida tem de assinar?" — the question that decides whether recovery is really
    // 2-of-3 or silently 3-of-3.
    let asks_about_the_removed_one = has(nq, &["autoridad", "authorit"])
        && has(
            nq,
            &[
                "removid",
                "removed",
                "substituid",
                "replaced",
                "saiu",
                "sai",
            ],
        );
    let acts_on_an_authority = has(nq, &["autoridad", "authorit"])
        && has(
            nq,
            &[
                "substitui",
                "substituir",
                "replace",
                "perdida",
                "perder",
                "perde",
                "lost",
                "lose",
                "comprometid",
                "compromised",
                "recusa",
                "obstrutiv",
                "obstruct",
            ],
        );
    names_the_set || asks_about_succession || acts_on_an_authority || asks_about_the_removed_one
}

/// The R²S² resilience BOUNDARY — "a resiliência sobrepõe-se à segurança?", "does resilience mean zero
/// downtime?".
///
/// Post-deploy QA found the first of these reaching the hypothesis family and being refused, and the
/// second answered from the generic "what is BANZA" entry. A refusal is safe; answering a boundary
/// question from an unrelated entry is not, and neither is what a reader supplies in the silence. The
/// two shapes are one fact — resilience is bounded by safety — so one predicate decides both, and the
/// gate and the term table read it, which is what stops them disagreeing.
fn is_resilience_boundary_phrase(nq: &str) -> bool {
    let names_resilience = has(nq, &["resilienc", "resilient", "resiliente"]);
    if !names_resilience {
        return false;
    }
    // Ordered against safety: does availability win?
    let against_safety = has(
        nq,
        &[
            "seguranca",
            "security",
            "seguro",
            "secure",
            "sobrepoe",
            "sobrepor",
            "override",
            "overrides",
            "prevalece",
            "acima da",
            "acima de",
            "mais important",
            "trumps",
            "beats",
            "vs seguranca",
            "versus seguranca",
        ],
    );
    // Read as a promise of uptime: does resilience mean nothing ever fails?
    let as_uptime = has(
        nq,
        &[
            "downtime",
            "indisponibilidade",
            "sempre disponivel",
            "always available",
            "always up",
            "nunca falha",
            "never fails",
            "zero falhas",
            "uptime",
            "disponibilidade total",
        ],
    );
    against_safety || as_uptime
}

/// The local execution model — "o BANZA usa consenso global?", "does BANZA require a central
/// transaction processor?", "a execução do BANZA é federada?".
///
/// Every one of these reached the generic protocol description, which says nothing about any of them.
/// That is a wrong answer rather than a missing one: a reader asking whether they must join a shared
/// processor gets a paragraph that neither confirms nor denies it, and infers whichever they arrived
/// with. Reference §4 answers it directly — execution is local, there is no central server.
fn is_local_execution_phrase(nq: &str) -> bool {
    let about_banza = has(nq, &["banza", "protocolo", "protocol"]);
    if !about_banza {
        return false;
    }
    // Phrases that name the mechanism outright — unambiguous wherever they appear.
    let names_the_mechanism = has(
        nq,
        &[
            "consenso global",
            "global consensus",
            "consenso distribuido",
            "distributed consensus",
            "processador central",
            "central processor",
            "central transaction",
            "processamento central",
            "servidor central",
            "central server",
            "infraestrutura central",
            "central infrastructure",
            "ponto central",
            "blockchain",
            "cadeia de blocos",
        ],
    );
    // "a execução do BANZA é federada?" puts the words that matter either side of the ones that do not,
    // so no contiguous phrase reaches it. Asking for the two parts independently is what makes the
    // Portuguese and English forms behave the same — the fact is the same fact.
    let asks_where_execution_runs = has(nq, &["execucao", "execution", "executa", "corre"])
        && has(
            nq,
            &[
                "local",
                "federad",
                "federated",
                "central",
                "distribuid",
                "distributed",
            ],
        );
    names_the_mechanism || asks_where_execution_runs
}

/// One of the four principles asked BY NAME — "o que significa Seguro no BANZA?", "what does simple
/// mean?", "o princípio Robusto".
///
/// Two of the four names are ordinary Portuguese adjectives ("seguro", "simples"), so a bare mention
/// cannot be the trigger — "é seguro publicar isto?" is not a question about the principle. The
/// principle name must therefore arrive under a definition lead or under the word "princípio", which is
/// what separates naming the principle from using the adjective.
fn is_named_principle_query(nq: &str) -> bool {
    const NAMES: &[&str] = &[
        "robusto",
        "resiliente",
        "seguro",
        "simples",
        "robust",
        "resilient",
        "secure",
        "simple",
    ];
    let names_one = NAMES.iter().any(|n| word(nq, n));
    if !names_one {
        return false;
    }
    has(
        nq,
        &[
            "o que e ",
            "o que significa",
            "o que quer dizer",
            "significa o principio",
            "principio",
            "principios",
            "what does",
            "what is the",
            "meaning of",
            "principle",
        ],
    )
}

/// Critical subjects whose aliases open the gate AND resolve the term — ONE table, read by both.
///
/// The Root threshold defect is the reason this exists. Its phrase was added to the gate predicate and
/// not to the term resolver, so the gate opened, `term_of` returned nothing, and the question fell through
/// as unsupported while looking handled. Two lists that must agree eventually disagree; one list cannot.
///
/// Every alias here is multi-word or a distinctive protocol identifier, so it names its subject wherever
/// it appears. Longest alias wins, and this table is consulted AFTER the specific arms below, so no
/// existing resolution changes — measured over the drift corpus, not assumed.
const CRITICAL_SUBJECTS: &[(&str, &[&str])] = &[
    // The profile LIST — "quais são os perfis do BANZA?". Distinct from an individual level: the reader
    // is asking what the set is, and the answer is composed from the registry rather than from any one
    // level. Measured before this arm existed: both languages reached the generic BANZA description,
    // which names no profile at all.
    (
        "def-profiles",
        &[
            "perfis do banza",
            "perfis de conformidade",
            "quais sao os perfis",
            "lista de perfis",
            "banza profiles",
            "conformance profiles",
            "profile levels",
            "list of profiles",
            // Singular forms too, and not for elegance: typo recovery rewrites the English plural
            // "profiles" to "profile" as a HIGH-CONFIDENCE correction, and the corrected query is what
            // the router sees. Measured, that alone made "What are the BANZA profiles?" miss while its
            // Portuguese twin matched — a legitimate plural silently normalised out of its own alias.
            // The underlying question, whether recovery should rewrite a token that IS canonical
            // vocabulary, is a separate defect and is recorded rather than patched here.
            "banza profile",
            "conformance profile",
            "profile level",
            "list of profile",
        ],
    ),
    // L0 — the Protocol Sandbox and its regulatory boundary. An already-protected BANZA property
    // (`tools/check-l0-regulatory-boundary.sh`) that BanzAI could not reach at all: measured, all eight
    // L0 probes returned "no source", so the boundary the repository guards was unanswerable.
    (
        "def-l0-regulatory-boundary",
        &[
            "perfil l0",
            "profile l0",
            "protocol sandbox",
            "sandbox de protocolo",
            "sandbox do protocolo",
            "passar l0",
            "passing l0",
            "passar o l0",
        ],
    ),
    // The three institutional layers. The Portuguese form resolved and the English did not.
    (
        "def-three-layer-architecture",
        &[
            "three institutional layers",
            "institutional layers",
            "three layers",
            "camadas institucionais",
            "tres camadas institucionais",
        ],
    ),
    // Protocol/repository governance — kept distinct from operator/scheme governance. Maintaining the
    // protocol is not authority over the organizations that run it.
    (
        "def-governance",
        &[
            "governa o protocolo",
            "governs the protocol",
            "governanca do protocolo",
            "governacao do protocolo",
            "protocol governance",
        ],
    ),
    // Regulatory authorisation and supervision. The record that ESTABLISHES the separation answers who
    // holds it — and, decisively, that BANZA does not. A generic question must never name a specific
    // regulator: jurisdiction is introduced only when the reader introduces it.
    (
        "def-operator-governance-authority",
        &[
            "supervisiona legalmente",
            "supervisao legal",
            "legally supervises",
            "legal supervision",
            "supervises an operator",
            "supervisiona um operador",
        ],
    ),
    // "Quem controla a Root?" — the question that started this milestone. It must reach the Root
    // authorisation model, and never the record about operator authority.
    (
        "def-root-authorization",
        &[
            "controla a root",
            "controla a raiz",
            "controls the root",
            "quem controla a trust root",
            "who controls the trust root",
        ],
    ),
];

/// A registered profile named as the SUBJECT of a question — and WHICH of the two profile facts is being
/// asked for.
///
/// The two are deliberately separate records, because they answer different questions and each is wrong as
/// an answer to the other: what a level IS (identity, from the registry) versus what passing it does NOT
/// confer (the regulatory boundary). Collapsing them would make "o que é L0?" answer with a denial and
/// "passar L0 permite dinheiro real?" answer with a name.
///
/// A bare token match was tried first and measured too broad: it hijacked "compara a execução L0 com a
/// execução L2 da jornada de validação" (two journey runs) and "l0 a l4" (the ladder). The identifier names
/// the profile wherever it appears, so presence is not enough — the level has to be what the question is
/// ABOUT, and a range or a comparison is about neither fact.
fn profile_subject(nq: &str) -> Option<&'static str> {
    let level = nq
        .split(|c: char| !c.is_alphanumeric())
        .find(|t| {
            let t = t.to_ascii_lowercase();
            t.len() >= 2
                && t.starts_with('l')
                && t[1..].chars().all(|c| c.is_ascii_digit())
                && crate::canonical_profiles::is_registered(&t)
        })?
        .to_ascii_lowercase();

    // A comparison, an execution or a range spans levels; it asks about neither profile fact.
    if has(
        nq,
        &[
            "compara",
            "compare",
            "execucao",
            "execution",
            "jornada",
            "journey",
            "niveis",
            "levels",
        ],
    ) {
        return None;
    }

    // BOUNDARY first: what passing does not confer. These words make the question about permission,
    // and permission is never answered by a profile name.
    if has(
        nq,
        &[
            "autoriza",
            "autorizacao",
            "permite",
            "authorize",
            "authorise",
            "authorization",
            "authorisation",
            "allow",
            "sandbox regulator",
            "regulatory sandbox",
            "producao",
            "production",
            "dinheiro real",
            "real money",
            "real funds",
            "fundos reais",
            "licenc",
            "licen",
        ],
    ) {
        return Some("def-l0-regulatory-boundary");
    }

    // IDENTITY: what the level is. Derived per level, so an unregistered one has no entry to reach.
    match level.as_str() {
        "l0" if starts_definition_lead(nq) || has(nq, &["perfil l0", "l0 profile"]) => {
            Some("def-profile-l0")
        }
        "l1" => Some("def-profile-l1"),
        "l2" => Some("def-profile-l2"),
        "l3" => Some("def-profile-l3"),
        "l4" => Some("def-profile-l4"),
        _ => None,
    }
}

/// The critical subject named by a MULTI-WORD alias. Precise enough to run BEFORE the broad arms:
/// longest alias wins, so a specific subject beats a general one.
fn critical_subject_phrase(nq: &str) -> Option<&'static str> {
    let mut best: Option<(usize, &'static str)> = None;
    for (id, aliases) in CRITICAL_SUBJECTS {
        for a in *aliases {
            if a.contains(' ') && nq.contains(a) && best.map(|(n, _)| a.len() > n).unwrap_or(true) {
                best = Some((a.len(), id));
            }
        }
    }
    best.map(|(_, id)| id)
}

/// The critical subject named by `nq` — phrases first, then single tokens, then the L0 subject predicate.
/// This is the ONE function the gate and the term resolver both read, so a gate signal cannot exist
/// without an arm behind it.
fn critical_subject(nq: &str) -> Option<&'static str> {
    if let Some(id) = critical_subject_phrase(nq) {
        return Some(id);
    }
    let mut best: Option<(usize, &'static str)> = None;
    for (id, aliases) in CRITICAL_SUBJECTS {
        for a in *aliases {
            if !a.contains(' ') && word(nq, a) && best.map(|(n, _)| a.len() > n).unwrap_or(true) {
                best = Some((a.len(), id));
            }
        }
    }
    if best.is_none() {
        if let Some(id) = profile_subject(nq) {
            return Some(id);
        }
    }
    best.map(|(_, id)| id)
}

/// The term → entry mapping, most-specific first. Returns the deterministic entry id for `nq`.
fn term_of(nq: &str) -> Option<&'static str> {
    // The shared critical-subject table's MULTI-WORD aliases run first. Measured: with the table last,
    // "quem supervisiona legalmente um operador?" was answered by the broad `word(nq, "operador")` arm
    // with the DEFINITION of an operator, instead of by the record that establishes who holds legal
    // supervision — a precise phrase losing to a single generic token. A multi-word alias names its
    // subject; a bare token merely appears in it. The single-token and predicate cases stay at the end,
    // where they cannot outrank anything.
    if let Some(id) = critical_subject_phrase(nq) {
        return Some(id);
    }
    // ── Operador Zero boundary (defer to the existing OZ entries) ──
    if has(nq, &["operador zero", "operator zero"])
        && has(nq, &["operador real", "operator real", "real operator"])
    {
        return Some("operador-zero-in-operators");
    }
    if has(nq, &["kz_demo", "kz demo"]) {
        return Some("def-kz-demo");
    }

    // ── M2.14C — governance / documentation / engineering vocabulary of the repo ──
    // Whole-token acronyms (adr/rfc/ci/pr) + governance/process terms. No overlap with the
    // protocol/fintech terms below. A record/process/check is never an authority.
    if word(nq, "adr") || has(nq, &["architecture decision record"]) || word(nq, "adrs") {
        return Some("def-adr");
    }
    if word(nq, "rfc") || word(nq, "rfcs") || has(nq, &["request for comments"]) {
        return Some("def-rfc");
    }
    // BCJ/1 is the canonical byte form: signing, digesting and request identity all compare bytes
    // produced by it, and it is the first gate an external implementation must pass. Live QA found it
    // unanswerable — the spec was indexed but the acronym reached no concept, so the router classified
    // the question as unsupported.
    // "bcj" is matched as a SUBSTRING, not a whole token, and the folded form is listed too. The query
    // normalizer applies confusable folding — it turns the digit 1 into the letter i — so "BCJ/1"
    // arrives as "bcj/i", and the slash keeps it one token. Folding is right for prose and wrong for a
    // versioned identifier; rather than weaken it for every query, the term that suffers is matched in
    // both forms. The acronym is distinctive enough that a substring match cannot collide.
    if has(
        nq,
        &[
            "bcj",
            "banza canonical json",
            "canonical json",
            "json canonico",
        ],
    ) {
        return Some("def-bcj");
    }
    // The trust guarantees, and above all the two BANZA does NOT provide. Live QA asked whether BANZA
    // provides global transparency and was told it does — a property the specification denies in its
    // first section. Claiming a guarantee that does not exist is worse than refusing to answer, because
    // a reader plans around it. So the boundary is decided here, deterministically, and never left to
    // prose. This runs BEFORE the "trust"/"confianca" catch-all below: "garantias de confiança" is a
    // question about the boundary, not a request to define the word.
    if has(
        nq,
        &[
            "transparencia global",
            "global transparency",
            "split-view",
            "split view",
            "consistencia de conjunto",
            "set consistency",
            "mix-and-match",
            "mix and match",
            "consistencia entre observadores",
            "cross-observer",
            "garantias de confianca",
            "trust guarantees",
        ],
    ) {
        return Some("def-trust-guarantees");
    }
    // The resilience BOUNDARY, before the principles arm: "o que significa resiliente?" wants the four
    // principles, but "a resiliência sobrepõe-se à segurança?" wants the boundary, and the boundary
    // predicate is the narrower of the two (it needs a safety or uptime marker as well).
    if is_resilience_boundary_phrase(nq) {
        return Some("def-resilience-boundary");
    }
    // Local execution — no central processor, no global consensus, no shared BANZA infrastructure.
    if is_local_execution_phrase(nq) {
        return Some("def-local-execution");
    }
    // The four Fundamental Principles. The knowledge entry existed and nothing routed to it, so the
    // deployed pipeline answered "quais são os princípios fundamentais?" from an unrelated entry — a
    // WRONG answer, which is worse than no answer. Placed before the succession arm because "princípios"
    // is the more specific signal.
    if has(
        nq,
        &[
            "r2s2",
            "r²s²",
            "principios fundamentais",
            "princípios fundamentais",
            "fundamental principles",
            "quatro principios",
            "four principles",
            "principios do banza",
            "principios de banza",
            "design principles",
            "quais sao os principios",
            "quais são os princípios",
        ],
    ) || is_r2s2_acronym(nq)
    {
        return Some("def-r2s2");
    }
    // "o que é Robusto/Resiliente no BANZA?" — the individual principles resolve to the same entry
    // rather than to unrelated prose that happens to use the adjective.
    //
    // Written as a lead × principle product rather than a hand-listed set. The hand-listed version had
    // "o que significa robusto" and "o que significa resiliente" and not the Portuguese forms for the
    // other two, so half the set resolved and half fell to the generic protocol description — a gap
    // invisible to anyone reading the list, because a list of near-identical strings is exactly the kind
    // of thing the eye completes on its own.
    if is_named_principle_query(nq) {
        return Some("def-r2s2");
    }

    // Root succession (ADR-039), by the same predicate that opens the gate — one definition of what
    // counts as a succession question, so the gate and the term table can never disagree. Placed before
    // the generic `spec` term so "especificação do conjunto de autoridades" resolves to the concept.
    if is_root_succession_phrase(nq) {
        return Some("def-root-authority-set");
    }
    if word(nq, "spec") || word(nq, "specification") || has(nq, &["especificac"]) {
        return Some("def-spec");
    }
    if word(nq, "guard") || word(nq, "guards") {
        return Some("def-guard");
    }
    if word(nq, "ci") || has(nq, &["continuous integration", "integracao continua"]) {
        return Some("def-ci");
    }
    if word(nq, "pr") || has(nq, &["pull request"]) {
        return Some("def-pr");
    }
    if word(nq, "issue") || word(nq, "issues") {
        return Some("def-issue");
    }
    if word(nq, "release")
        || word(nq, "changelog")
        || word(nq, "version")
        || word(nq, "versao")
        || word(nq, "tag")
    {
        // changelog is more specific — prefer its own entry when named.
        if word(nq, "changelog") {
            return Some("def-changelog");
        }
        return Some("def-release");
    }
    if word(nq, "runbook") {
        return Some("def-runbook");
    }
    if word(nq, "rollback") {
        return Some("def-rollback");
    }
    if word(nq, "maintainer")
        || word(nq, "maintainers")
        || has(nq, &["mantenedor", "contributor", "contribuidor"])
    {
        return Some("def-maintainer");
    }
    if word(nq, "governance") || has(nq, &["governanca"]) {
        return Some("def-governance");
    }
    if word(nq, "audit")
        || has(
            nq,
            &[
                "audit report",
                "relatorio de auditoria",
                "auditoria",
                "evidence report",
            ],
        )
    {
        return Some("def-audit-report");
    }
    // Invariant: the SINGULAR definition is deterministic (def-invariant); a plural/listing question
    // ("quais são os invariantes", "what are the protocol invariants?") still grounds to list them.
    if (word(nq, "invariant") || word(nq, "invariante"))
        && !has(
            nq,
            &[
                "invariants",
                "invariantes",
                "quais",
                "lista",
                "list",
                "todos",
                // A qualified "invariante financeiro" is a protocol-RULE question — let it ground.
                "financeiro",
                "financeira",
                "financial",
            ],
        )
    {
        return Some("def-invariant");
    }

    // ── ledger / wallet / balances (specific before generic) ──
    if has(nq, &["saldo disponivel", "available balance"]) {
        return Some("def-available-balance");
    }
    if has(nq, &["saldo reservado", "reserved balance"]) {
        return Some("def-reserved-balance");
    }
    if word(nq, "saldo")
        || word(nq, "balance")
        || has(nq, &["what is balance", "what is a balance"])
    {
        return Some("def-balance");
    }
    if has(
        nq,
        &[
            "double entry",
            "double-entry",
            "partida dobrada",
            "dupla entrada",
        ],
    ) {
        return Some("def-double-entry");
    }
    if word(nq, "ledger") || has(nq, &["livro razao"]) {
        return Some("def-ledger");
    }
    if word(nq, "wallet") || has(nq, &["carteira"]) {
        return Some("def-wallet");
    }

    // ── payments ──
    if has(nq, &["saldo"]) {
        return Some("def-balance");
    }
    if has(nq, &["payment link", "link de pagamento"]) {
        return Some("def-payment-link");
    }
    if word(nq, "qr") || has(nq, &["pagamento qr", "payment request", "qr payment"]) {
        return Some("def-qr");
    }
    if has(nq, &["idempoten"]) {
        return Some("def-idempotency");
    }
    if word(nq, "webhook") {
        return Some("def-webhook");
    }
    if has(
        nq,
        &["reembolso", "estorno", "refund", "reversal", "reversao"],
    ) {
        return Some("def-refund");
    }
    if has(nq, &["reconciliac", "reconciliation"]) {
        return Some("def-reconciliation");
    }
    if has(nq, &["liquidac", "settlement"]) {
        return Some("def-settlement");
    }
    if has(nq, &["compensac", "clearing"]) {
        return Some("def-clearing");
    }
    if word(nq, "fee") || has(nq, &["comissao"]) || word(nq, "taxa") {
        return Some("def-fee");
    }
    if word(nq, "pagamento") || word(nq, "payment") || has(nq, &["pagamento instantaneo"]) {
        return Some("def-payment");
    }

    // ── regulatory / risk boundary ──
    // `word(nq, "emis")` matches the whole EMIS token in ANY phrasing ("o BANZA substitui a EMIS?",
    // "o que é a EMIS?", "o BANZA depende da EMIS?") — the adjacent "substitui emis" alias missed the
    // article form ("substitui A emis"), which is what let those questions fall through to synthesis and
    // confabulate. Mirrors the def-bna arm below, which already uses `word(nq, "bna")`.
    if word(nq, "emis")
        || has(
            nq,
            &[
                "rail de pagamento",
                "payment rail",
                "sistema de pagamentos",
                "national payment",
                "substitui emis",
                "substitui os bancos",
                "substitui o sistema",
            ],
        )
    {
        return Some("def-payment-systems");
    }
    if word(nq, "psp")
        || has(
            nq,
            &[
                "prestador de servicos de pagamento",
                "payment service provider",
            ],
        )
    {
        return Some("def-psp");
    }
    if word(nq, "bna")
        || has(
            nq,
            &[
                "banco nacional de angola",
                "substitui o bna",
                "substitui bna",
            ],
        )
    {
        return Some("def-bna");
    }
    if word(nq, "banco") || word(nq, "bank") || has(nq, &["instituicao financeira"]) {
        return Some("def-bank");
    }
    if word(nq, "fintech") {
        return Some("def-fintech");
    }
    if word(nq, "kyb") {
        return Some("def-kyb");
    }
    if word(nq, "kyc") {
        return Some("def-kyc");
    }
    if has(nq, &["aml", "cft", "branqueamento", "lavagem de dinheiro"]) {
        return Some("def-aml-cft");
    }
    if word(nq, "sandbox") {
        return Some("def-sandbox");
    }

    // ── protocol-normative ──
    if has(
        nq,
        &[
            "federar",
            "federacao",
            "federation",
            "federate",
            "federated",
        ],
    ) {
        return Some("def-federation");
    }
    if has(nq, &["interoperab"]) {
        return Some("def-interoperability");
    }
    // How many authorities hold the root, and how many must act. Asked in PT, production answered
    // "controlada por uma autoridade" — the single most consequential fact in the protocol, stated
    // wrongly, and stated in the direction that makes the root look weaker than it is. It is decided
    // here rather than composed from retrieval. Runs BEFORE the def-trust-root rule below, which would
    // otherwise swallow every question naming the root; the phrases here are specific to cardinality and
    // threshold, so "o que é a Trust Root?" still gets the definition.
    if has(
        nq,
        &[
            "quantas autoridad",
            "how many authorit",
            "how many root",
            "quantas chaves de raiz",
            "quantas chaves da raiz",
            "quantas chave de raiz",
            "threshold da raiz",
            "threshold da trust root",
            "threshold do root",
            "root threshold",
            "trust root threshold",
            // Portuguese uses the proper noun untranslated — "o limiar da Root". The raiz-only forms
            // above meant the English "root threshold" resolved while its Portuguese twin did not, the
            // same asymmetry as the identity boundary but running the other way. The gate predicate
            // carries these too; a gate that opens with no arm behind it here is how a question becomes
            // unanswerable while looking handled.
            "limiar da root",
            "limiar da raiz",
            "quorum da root",
            "quorum da raiz",
            "root quorum",
            "2 de 3",
            "2-de-3",
            "2 of 3",
            "2-of-3",
            "autoridades da raiz",
            "autoridades de raiz",
            "root authorities",
            "root authoritie",
            // The threshold in Portuguese words, and the yes/no that matters most about the Root.
            // The gate above already admits these shapes; without the same phrases HERE the gate opens
            // and the term table returns nothing, which is how the English form answered and the
            // Portuguese one fell to no_source.
            "limiar da raiz",
            "limiar da trust root",
            "limiar de assinatura",
            "agir sozinh",
            "assinar sozinh",
            "act alone",
            "acting alone",
        ],
    ) || asks_how_many_authorities(nq)
    {
        return Some("def-root-authorization");
    }
    if has(
        nq,
        &["trust root", "raiz de confianca", "raiz do protocolo"],
    ) {
        return Some("def-trust-root");
    }
    if has(nq, &["key manifest"]) {
        return Some("def-key-manifest");
    }
    if has(nq, &["manifest", "manifesto do operador"]) {
        return Some("def-manifest");
    }
    if word(nq, "trust") || has(nq, &["confianca"]) {
        return Some("def-trust");
    }
    if has(nq, &["revoga", "revocation", "revoked", "brl"]) {
        return Some("def-revocation");
    }
    if has(nq, &["conformidade", "conformance"]) {
        return Some("def-conformance");
    }
    if has(
        nq,
        &[
            "evidence bundle",
            "pacote de evidencia",
            "bundle de evidencia",
        ],
    ) {
        return Some("def-evidence-bundle");
    }
    if has(
        nq,
        &["evidencia tecnica", "session summary", "sumario da sessao"],
    ) || word(nq, "trace")
        || word(nq, "evidencia")
        || word(nq, "evidence")
    {
        return Some("def-evidence");
    }
    if word(nq, "pass") || word(nq, "passou") {
        return Some("def-pass");
    }
    // NOTE: "invariante/invariant" is intentionally NOT a glossary term — invariant questions classify
    // as protocol_rule and ground (e.g. "what are the protocol invariants?" lists them). The singular
    // definition still exists as the `def-invariant` entry for reference.
    if word(nq, "schema")
        || word(nq, "openapi")
        || has(nq, &["contrato", "contract"])
        || word(nq, "api")
    {
        return Some("def-api-schema");
    }
    // ── M2.14C-FIX2: technology / stack terms — a bare "Rust" / "WASM" / "Qwen" is a known term, not
    //    no_source. Deterministic answers, Rust-first accurate (ADR-038), operator-neutral. normalize()
    //    strips accents/dots/hyphens→spaces, so "Node.js"→"nodejs", "next.js"→"nextjs", "rust-first"→
    //    "rust first". `word()` is whole-token (so "rust" never matches "trust").
    if word(nq, "rust") || has(nq, &["rust first"]) {
        return Some("def-rust");
    }
    if word(nq, "wasm") || has(nq, &["webassembly", "web assembly"]) {
        return Some("def-wasm");
    }
    if word(nq, "typescript") || word(nq, "javascript") {
        return Some("def-typescript");
    }
    if word(nq, "react") || has(nq, &["nextjs", "next js"]) {
        return Some("def-web-frontend");
    }
    if word(nq, "json") {
        return Some("def-json-format");
    }
    if word(nq, "bash") || word(nq, "shell") {
        return Some("def-bash-shell");
    }
    if word(nq, "node") || has(nq, &["nodejs", "node js"]) {
        return Some("def-node");
    }
    if word(nq, "qwen") {
        return Some("def-qwen");
    }
    if has(nq, &["postgresql", "postgres"]) {
        return Some("def-postgresql");
    }
    if word(nq, "pgvector") {
        return Some("def-pgvector");
    }
    if word(nq, "nginx") {
        return Some("def-nginx");
    }
    if word(nq, "docker") {
        return Some("def-docker");
    }
    if word(nq, "banzai") {
        return Some("def-banzai-agent");
    }
    if has(nq, &["operador zero", "operator zero"]) {
        return Some("what-is-operador-zero");
    }
    if word(nq, "operador")
        || word(nq, "operator")
        || has(nq, &["operador de pagamentos", "payment operator"])
    {
        return Some("def-operator");
    }
    // The shared critical-subject table, LAST: every specific arm above wins first, so adding a subject
    // here cannot change an existing resolution. The same table opens the gate in `glossary_entry`.
    critical_subject(nq)
}

/// The deterministic vocabulary entry for `nq`, or None. Fires ONLY for:
///   • a SHORT definition question ("o que é X", "what is X"; ≤ 6 tokens), or
///   • a bare / very short term ("federar", "trust", "saldo reservado"; ≤ 3 tokens), or
///   • a short "como funciona / para que serve X" (≤ 5 tokens), or
///   • a boundary question ("BANZA é PSP?", "KZ_DEMO é dinheiro real?").
/// It never fires for operational how-tos, onboarding, or long mechanics questions — those stay
/// grounded. A more-specific critical arm always wins first (this runs last in critical_entry).
pub fn glossary_entry(nq: &str) -> Option<&'static str> {
    let toks = count(nq);
    let boundary = is_boundary_query(nq);
    // M2.14C SEC-FIX — an unambiguous multi-word governance/dev phrase bypasses the token gate (e.g. PT
    // "o que é um relatório de auditoria?" at 7 tokens would otherwise fall to no_source).
    let gov_phrase = is_governance_phrase(nq);
    // A guarantee question is answered whatever shape it arrives in — see is_trust_guarantee_phrase.
    let guarantee_phrase = is_trust_guarantee_phrase(nq);
    let definition = (starts_definition_lead(nq) && toks <= 6)
        || gov_phrase
        || guarantee_phrase
        || is_protocol_fact_phrase(nq)
        || is_root_succession_phrase(nq)
        || has(
            nq,
            &[
                "principios fundamentais",
                "princípios fundamentais",
                "fundamental principles",
                "r2s2",
                "r²s²",
                "quatro principios",
                "four principles",
            ],
        )
        || is_r2s2_acronym(nq)
        // Read from the SAME predicates the term table reads. The earlier version of this clause was
        // written inline here and had no counterpart in `term_of`, so the gate opened, the term table
        // returned nothing, and the question fell through to the hypothesis family and was refused.
        // An opened gate with no arm behind it is how a question becomes unanswerable while looking
        // handled.
        || is_resilience_boundary_phrase(nq)
        || is_local_execution_phrase(nq)
        || is_named_principle_query(nq)
        // Read from the SAME table the term resolver reads — the structural fix for "the gate opens and
        // nothing is behind it", which is how the Root threshold became unanswerable while looking handled.
        || critical_subject(nq).is_some();
    // A bare/very short term ("federar", "trust", "saldo reservado", "payment link") — ≤ 2 tokens so an
    // off-topic short phrase that merely contains a term mid-sentence ("Russian Federation history",
    // "setup de operador") is NOT captured and still grounds.
    let bare_term = toks <= 2;
    if !(definition || bare_term || boundary) {
        return None;
    }
    // "como se substitui uma autoridade da raiz?" reads as operational, and the operational arm would
    // send it to the model. But whether the surviving two can replace a lost authority is decided by the
    // chain, not composed as prose — so a succession question keeps its deterministic answer, exactly as
    // a boundary question does.
    if (is_operational(nq) || is_onboarding(nq)) && !boundary && !is_root_succession_phrase(nq) {
        return None;
    }
    term_of(nq)
}

/// True when `nq` is a protocol/fintech vocabulary question this layer resolves — used to label the
/// intent (`protocol_vocabulary_query`) for telemetry/ranking. Never changes routing by itself.
pub fn is_vocabulary_query(nq: &str) -> bool {
    glossary_entry(nq).is_some()
}

/// M2.14C — the governance / documentation / engineering vocabulary of the repo (ADR, RFC, spec, guard,
/// CI, PR, issue, release, changelog, runbook, rollback, maintainer, governance, audit report,
/// invariant). Used to label the intent `governance_developer_vocabulary_query` for
/// telemetry/ranking + the guard. Never changes routing by itself (the deterministic def-* answer comes
/// from the same glossary arm in critical_entry).
pub fn is_governance_vocabulary_query(nq: &str) -> bool {
    matches!(
        glossary_entry(nq),
        Some(
            "def-adr"
                | "def-rfc"
                | "def-spec"
                | "def-guard"
                | "def-ci"
                | "def-pr"
                | "def-issue"
                | "def-release"
                | "def-changelog"
                | "def-runbook"
                | "def-rollback"
                | "def-maintainer"
                | "def-governance"
                | "def-audit-report"
                | "def-invariant"
                | "def-api-schema"
        )
    )
}
