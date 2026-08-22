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
/// The CANONICALIZATION rules, asked without naming BCJ/1.
///
/// `Por que não posso normalizar Unicode antes de verificar?` is a question about BCJ/1 — the profile
/// fixes the byte form and the verifier applies no Unicode normalization — and it never names it, so it
/// reached no concept at all. Measured in production, the Portuguese form was then composed by the model
/// citing `federation-trust-evaluation.production.schema.json` and
/// `public-protocol-registry.production.schema.json`, neither of which discusses canonicalization, while
/// the English form happened to cite ADR-011. A citation right by coin-flip is not a derivation, and the
/// two are indistinguishable to a reader.
///
/// A general "why" gate was tried first and was wrong. It also captured `Porque é que os saldos das
/// carteiras são sempre derivados do ledger?` — an explanatory question that SHOULD ground, because the
/// deterministic entry states the fact and the reader asked for the reason. Pre-empting grounding with a
/// definition is a different failure, not a fix.
///
/// So these are unambiguous multi-word phrases that bypass the token gate, exactly like
/// `is_governance_phrase` and `is_trust_guarantee_phrase` above, and for the same reason: they name
/// their subject wherever they appear.
fn is_canonicalization_phrase(nq: &str) -> bool {
    has(
        nq,
        &[
            "normalizar unicode",
            "normalizacao unicode",
            "normalizacao de unicode",
            "normalize unicode",
            "unicode normalization",
            "unicode normalisation",
            "canonicalizacao",
            "canonicalization",
            "canonicalisation",
            "chaves duplicadas",
            "membros duplicados",
            "duplicate keys",
            "duplicate members",
            "rfc 8785",
            // The INTEGER DOMAIN, which is a BCJ/1 rule like the others here. It needs the bypass for
            // the same reason the rest of this list does: "Qual é o domínio de inteiros do BCJ/1?" is
            // eight tokens and the definition gate caps at six, so the Portuguese form fell through
            // while the shorter English form ("What is BCJ/1's integer domain?", six tokens) resolved.
            // A fact should not depend on how many words its language needs to ask for it.
            "dominio de inteiros",
            "dominio inteiro",
            "integer domain",
        ],
    )
}

/// The question asks for the EVIDENCE behind the previous answer, not about a subject.
///
/// "Which sources support that?" refers to what was just said. A pro-form in such a question stands for
/// the prior ANSWER, and substituting the prior SUBJECT into it produces a different question — measured,
/// it turned a SOURCE_FOLLOWUP into a STANDALONE and broke a working path.
pub fn asks_for_evidence(nq: &str) -> bool {
    has(
        nq,
        &[
            "que fonte",
            "que fontes",
            "quais fontes",
            "qual a fonte",
            "fonte normativa",
            "fontes suportam",
            "fontes que suportam",
            "which source",
            "which sources",
            "what source",
            "what sources",
            "source says",
            "sources support",
            "show the source",
            "evidencia",
            "evidence for",
        ],
    )
}

/// A COMPARISON frame — "qual a diferença entre A e B", "what is the difference between A and B".
///
/// A comparison names TWO subjects, and the term table names one. So the arms below, which match the
/// first term they recognise, answered a two-sided question with one side and stopped. Measured in
/// production at `src-2a01974`, `Qual é a diferença entre L2 e L3?` returned the L2 definition alone,
/// never mentioning L3, with `degraded: true` — while the reader saw a complete, confident answer to a
/// question that had not been answered.
///
/// The English twin fell to the model instead and confabulated: "L2 and L3 differ in their level of
/// abstraction and coordination [...] L3 introduces a lineage that ties keys to a trusted set", citing
/// ADR-021 (reason codes) and ADR-039 (root authority). Neither document discusses profiles.
fn is_comparison_query(nq: &str) -> bool {
    has(
        nq,
        &[
            "diferenca entre",
            "diferencas entre",
            "difference between",
            "differences between",
            "distingue entre",
            "distinguish between",
            "comparar ",
            "compare ",
            "versus",
            " vs ",
        ],
    )
}

/// How many distinct conformance profiles a query names.
///
/// Whole-token, so "l3" inside another token cannot inflate the count, and "level 3" is read as well as
/// "L3" — the two spellings reach the same registry.
/// Re-exported for the router's comparison guard, which must exempt the profile family.
pub fn profiles_named_pub(nq: &str) -> usize {
    profiles_named(nq)
}

fn profiles_named(nq: &str) -> usize {
    let mut seen = 0;
    for (short, long) in [
        ("l0", "level 0"),
        ("l1", "level 1"),
        ("l2", "level 2"),
        ("l3", "level 3"),
        ("l4", "level 4"),
    ] {
        if word(nq, short) || has(nq, &[long]) {
            seen += 1;
        }
    }
    seen
}

/// A LOCATIVE question — "onde ficam os saldos?", "where do balances live?".
///
/// It asks about a concept as much as "o que é um saldo?" does, and the answer is the same fact:
/// INV-WALLET-001 states balances are derived from the ledger, and ADR-013 states where they are not
/// held. Neither reached a reader. `onde ficam os saldos` was refused outright, and `Onde está o ledger
/// central do BANZA?` — a false premise, which the corpus corrects — was answered by the model from
/// ADR-001 as "o ledger central do BANZA não existe, pois cada operador constrói os modelos necessários
/// para o sistema de pagamento novamente, de forma privada".
///
/// The gate opens; `term_of` still has to recognise the concept, and where it does not, nothing changes.
fn is_locative_query(nq: &str) -> bool {
    // START of the question only, and never an onboarding one.
    //
    // A mid-sentence "where do" is not a locative question about a concept: "I want to run a BANZA
    // operator, where do I start?" is onboarding, and capturing it took a question with its own route
    // away from that route. The Portuguese forms are anchored the same way.
    if is_onboarding(nq)
        || has(
            nq,
            &[
                "por onde comeco",
                "where do i start",
                "where should i start",
            ],
        )
    {
        return false;
    }
    // A leading discourse connector is dropped first: "Então onde ficam os saldos?" is the follow-up
    // form, and it is the exact phrasing the baseline recorded as refused.
    let q = {
        let mut q = nq;
        for lead in [
            "entao ", "e entao ", "mas ", "so ", "then ", "and ", "but ", "ok ",
        ] {
            if let Some(rest) = q.strip_prefix(lead) {
                q = rest.trim_start();
                break;
            }
        }
        q
    };
    q.starts_with("onde ")
        || q.starts_with("where is ")
        || q.starts_with("where are ")
        || q.starts_with("where do ")
        || q.starts_with("where does ")
        // The CONDITIONAL forms. "Where would balances live?" asks the same question as "where do
        // balances live?" and reached nothing, while its Portuguese conditional ("onde ficariam…")
        // resolved through the `onde ` prefix. A locative question must not depend on its mood.
        || q.starts_with("where would ")
        || q.starts_with("where should ")
        || q.starts_with("where can ")
        || q.starts_with("where could ")
}

/// A query shaped like a request for a DOMAIN definition.
///
/// Deliberately the shapes this file's own gate accepts, and no more: a definition or explanatory lead
/// (with any trailing style qualifier removed), or a bare term. A domain concept merely mentioned
/// inside a longer operational question is not a request to define it.
pub fn is_domain_definition_shape(nq: &str) -> bool {
    let nq = without_style_qualifier(nq);
    starts_definition_lead(nq) || count(nq) <= 2
}

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
        // "Explain X" asks for the same thing "what is X" asks for, and was missing here while
        // `is_r2s2_acronym` — twenty lines down, in this file — already read both leads. So
        // "Explica BCJ/1." resolved (two tokens, through the bare-term gate) and "Explica BCJ/1 de
        // forma simples." did not, which is the phrasing a reader actually uses.
        "explica ",
        "explica-me ",
        "explique ",
        "explicar ",
        "podes explicar ",
        "pode explicar ",
        "explain ",
        "explain me ",
        "can you explain ",
        "what is ",
        "what are ",
        "what does ",
        "what do ",
        "meaning of ",
    ]
    .iter()
    .any(|l| nq.starts_with(l))
}

/// The query with a trailing request about STYLE removed.
///
/// "de forma simples", "in simple terms", "para um iniciante" say how the answer should read; they say
/// nothing about what is being asked. They were nevertheless counted against the six-token definition
/// gate, so asking politely for a simpler answer made the question unanswerable: `Explica BCJ/1.`
/// resolved and `Explica BCJ/1 de forma simples.` was refused.
///
/// Stripping is a no-op for every query that does not end in one of these phrases, so nothing else moves.
fn without_style_qualifier(nq: &str) -> &str {
    const QUALIFIERS: &[&str] = &[
        " de forma simples",
        " de forma clara",
        " de forma resumida",
        " de maneira simples",
        " em termos simples",
        " de modo simples",
        " por favor",
        " para um iniciante",
        " para leigos",
        " simplesmente",
        " in simple terms",
        " in plain terms",
        " in plain english",
        " simply",
        " briefly",
        " please",
        " for a beginner",
        " like i am five",
    ];
    let mut out = nq.trim_end_matches('?').trim();
    // Repeat so a doubled qualifier ("explain X simply please") is fully removed; each pass removes at
    // most one, and the loop ends when none matches.
    loop {
        let before = out;
        for q in QUALIFIERS {
            if let Some(stripped) = out.strip_suffix(*q) {
                out = stripped.trim_end();
                break;
            }
        }
        if out == before {
            return out;
        }
    }
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
    let subject = definition_subject(nq);
    subject == "r s" || subject == "o r s" || subject == "the r s"
}

/// What a definition question is ASKING ABOUT — the query with its definition lead removed.
///
/// Factored out of `is_r2s2_acronym`, which needed it first and had it inline. A second predicate now
/// needs the same test, and the reason it needs it is worth stating: a term that is PRESENT in a
/// question is not the term the question is ABOUT. "o que é seguro" asks about `seguro`; "o que é um
/// canal seguro" asks about a channel. A `has()` test cannot tell those apart, and answering the second
/// one from the first one's table is a wrong answer served with a deterministic terminal's confidence.
///
/// Returns the trimmed remainder with the leading article dropped, so `o`/`a`/`the`/`um`/`uma`/`an` do
/// not have to be enumerated by every caller. A query with no recognised lead returns itself, which
/// makes the equality test fail closed for the callers that compare against a fixed name.
fn definition_subject(nq: &str) -> &str {
    let rest = [
        "o que e ",
        "o que sao ",
        "o que significa ",
        "o que quer dizer ",
        "what is ",
        "what are ",
        "what does ",
        "define ",
        "explica ",
        "explain ",
        "meaning of ",
        "significado de ",
    ]
    .iter()
    .find_map(|lead| nq.strip_prefix(*lead))
    .unwrap_or(nq)
    .trim()
    .trim_end_matches('?')
    .trim();
    // Trailing qualifiers say where the term applies, or ask for its meaning, and neither is part of
    // the subject. "o que significa Robusto no BANZA?" asks about `robusto`; "what does robust mean in
    // BANZA?" asks about the same thing with the verb trailing. A subject test that counted either
    // would reject the very questions the term table exists to answer.
    //
    // Stripping repeats until stable, because they combine ("robust mean in banza" carries both), and
    // it widens nothing: "o que é um canal seguro no BANZA" still has the subject "canal seguro", which
    // is not a principle name and still does not reach the principles.
    const TRAILING: &[&str] = &[
        " no banza",
        " na banza",
        " do banza",
        " da banza",
        " em banza",
        " no protocolo",
        " do protocolo",
        " in banza",
        " in the banza protocol",
        " in the protocol",
        " of banza",
        " for banza",
        " mean",
        " means",
        " significa",
        " quer dizer",
    ];
    let mut rest = rest;
    loop {
        let before = rest;
        for suffix in TRAILING {
            if let Some(stripped) = rest.strip_suffix(*suffix) {
                rest = stripped.trim_end();
                break;
            }
        }
        if rest == before {
            break;
        }
    }
    for article in ["o ", "a ", "os ", "as ", "um ", "uma ", "the ", "an "] {
        if let Some(stripped) = rest.strip_prefix(article) {
            return stripped.trim();
        }
    }
    rest
}

/// "Does BANZA ⟨verb⟩ ⟨concept⟩?" — a question ABOUT the concept, in its relation to the protocol.
///
/// These are exactly the questions that need BANZA authority behind them: "BANZA requires X", "BANZA
/// defines X", "BANZA guarantees X" are claims about the protocol, not opinions about a concept. They
/// arrive with no definition lead and five or six tokens, so every gate above closed on them and they
/// fell to grounding — where no subject resolved and the package was assembled from the generic
/// protocol-identity entry instead.
///
/// The model was then handed a normative question with ADR-001 in front of it, and answered from
/// ADR-001. Measured against production at `src-14df955`:
///
///   `o banza exige um ledger` → `what-is-banza` → "O BANZA não exige um ledger específico, pois os
///   modelos subjacentes a qualquer sistema de pagamento [...] não são comercialmente distintivos"
///
/// which contradicts INV-LEDGER-001…005 and INV-WALLET-001 — all severity `critical` — and ADR-012.
/// The corpus already states it correctly, in `financial-invariants`, and that entry was never reached.
/// The English twin produced the same claim. Half of every model answer in the baseline cited ADR-001
/// and nothing else, which is the signature of a subject that never resolved.
///
/// Opening the gate does not invent an answer: `term_of` still has to recognise the concept, and when
/// it does not this returns to the behaviour it had. What it stops is a specific question about a
/// specific concept being answered from the one document that is always retrievable.
fn is_banza_relation_query(nq: &str) -> bool {
    // BANZA must be the SUBJECT of the frame, not a word the sentence passes through.
    //
    // "como um operador na rede BANZA processa pagamentos?" contains "banza processa" as a substring,
    // and it is a question about how an OPERATOR works — grounded mechanics, which has its own route.
    // Reading it as a claim about the protocol took a question away from the path written for it.
    //
    // Two exclusions, both narrow: a "como/how" opener is asking about mechanics rather than about what
    // the protocol requires, and a sentence whose acting subject is an operator is not a sentence about
    // the protocol. Neither touches "o BANZA exige um ledger" or "does BANZA require a ledger", which
    // are what this frame exists for.
    if nq.starts_with("como ") || nq.starts_with("how ") {
        return false;
    }
    if has(
        nq,
        &[
            "um operador",
            "o operador",
            "an operator",
            "the operator",
            "operador na",
            "operator on",
        ],
    ) {
        return false;
    }
    has(
        nq,
        &[
            // Portuguese — "o BANZA exige/usa/define/garante/proíbe/permite ⟨X⟩"
            "banza exige",
            "banza requer",
            "banza obriga",
            "banza impoe",
            "banza precisa",
            "banza usa",
            "banza utiliza",
            "banza define",
            "banza garante",
            "banza proibe",
            "banza permite",
            "banza suporta",
            "banza implementa",
            "banza depende",
            "banza faz",
            "banza processa",
            "banza executa",
            "banza mantem",
            "banza guarda",
            "banza armazena",
            "banza aceita",
            "banza rejeita",
            // English — the same frame, including the auxiliary form "does BANZA require ⟨X⟩"
            "banza require",
            "banza use",
            "banza define",
            "banza defines",
            "banza guarantee",
            "banza prohibit",
            "banza forbid",
            "banza allow",
            "banza support",
            "banza need",
            "banza mandate",
            "banza implement",
            "banza depend",
            "banza do ",
            "banza does ",
            "banza perform",
            "banza process",
            "banza execute",
            "banza store",
            "banza keep",
            "banza hold",
            "banza accept",
            "banza reject",
        ],
    ) || is_protocol_artifact_relation_query(nq)
}

/// The same frame with a named protocol ARTIFACT as its subject: "does BCJ/1 accept duplicate keys?".
///
/// `o bcj/i aceita chaves duplicadas` was refused, while `o que é BCJ/1?` answered — and the answer it
/// gives already contains the rule ("membros duplicados rejeitados antes de qualquer interpretação
/// semântica"). The question was not unanswerable; its shape had no gate.
///
/// Token tests on both halves, so an artifact named mid-sentence and a verb that merely appears as a
/// substring cannot combine into a frame that was never asked. `normalize` folds "BCJ/1" to "bcj/i",
/// which is why the artifact is spelled that way here — the same documented collision `def-bcj` matches
/// in both forms.
fn is_protocol_artifact_relation_query(nq: &str) -> bool {
    const ARTIFACTS: &[&str] = &["bcj/i", "bcj"];
    const RELATIONS: &[&str] = &[
        "aceita",
        "rejeita",
        "permite",
        "proibe",
        "exige",
        "requer",
        "garante",
        "suporta",
        "accept",
        "accepts",
        "reject",
        "rejects",
        "allow",
        "allows",
        "prohibit",
        "prohibits",
        "require",
        "requires",
        "guarantee",
        "guarantees",
        "support",
        "supports",
    ];
    ARTIFACTS.iter().any(|a| word(nq, a)) && RELATIONS.iter().any(|v| word(nq, v))
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
            // Global CONSENSUS is the same guarantee question in the shape readers actually ask it,
            // and it reached nothing. `def-trust-guarantees` states precisely which guarantees the
            // protocol provides and which it does not — freshness and local monotonicity yes, set
            // consistency and cross-observer consistency no — which is the honest answer to "does that
            // imply global consensus?". Measured in the trust journey: turn 5 refused in both locales.
            "implica consenso global",
            "imply global consensus",
            "implies global consensus",
            "significa consenso global",
            "mean global consensus",
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
            // FAIL-CLOSED, asked as a yes/no about blocking rather than about what happens on failure.
            // `def-trust-guarantees` is the entry that states it, and the direct form already routed.
            "trust invalido bloqueia",
            "confianca invalida bloqueia",
            "invalid trust block",
            "invalid trust blocks",
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
            "usa consenso global",
            "uses global consensus",
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
    // The word `princípio`/`principle` is what turns an ordinary adjective into the NAME of one of the
    // four. When the reader supplies it, the name may sit anywhere in the sentence — "o que significa o
    // princípio robusto", "the simple principle" — because the framing has already fixed what is being
    // asked about.
    if has(nq, &["principio", "principios", "principle", "principles"]) {
        return true;
    }
    // Without that framing the principle must BE the subject, not merely a word inside it.
    //
    // `robusto`, `seguro`, `simples`, `resiliente` and their English twins are ordinary vocabulary in
    // both languages, and the earlier `has(nq, ["o que e ", ...])` test only asked whether the query was
    // a definition question AT ALL. So every definition question containing one of those adjectives was
    // answered with the four Fundamental Principles — measured in production: "o que é um canal seguro",
    // "o que é transporte seguro", "what is the secure boot" and "o que é um ledger simples" all
    // resolved to `def-r2s2`, deterministically and with `grounded: true`. A reader asking about a
    // secure channel was told about R²S² as though that were the answer.
    //
    // Same subject test as `is_r2s2_acronym`, from the same helper, for the same reason.
    NAMES.contains(&definition_subject(nq))
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
    // ── Semantic facts that share a noun with a PROCEDURE. The failure class these close: a definition,
    //    relationship or actor question was captured by a how-to entry because both contain the same
    //    domain noun. "O que é uma implementação?" reached implementation-steps; "Quem certifica uma
    //    implementação?" reached how-to-demonstrate-conformance. A noun names the SUBJECT; it does not
    //    establish procedural intent, and these aliases carry the intent cue with them — "o que é",
    //    "what is", "diferença", "same thing", "quem certifica", "who certifies" — so a genuine how-to
    //    ("como implementar", "how do I demonstrate conformance") still reaches its procedure.
    (
        "def-implementation",
        &[
            "o que e uma implementacao",
            "what is an implementation",
            "what is a banza implementation",
            "definicao de implementacao",
            "definition of implementation",
        ],
    ),
    (
        "def-operator-vs-implementation",
        &[
            "operador e uma implementacao sao a mesma coisa",
            "operador e implementacao sao a mesma coisa",
            "diferenca entre operador e implementacao",
            "operator and an implementation the same",
            "difference between an operator and an implementation",
            "operator vs implementacao",
            "operator vs implementation",
        ],
    ),
    // "O que significa certificar uma implementação?" asks what certifying IS. Without a registered
    // surface it reached how-to-demonstrate-conformance — the PROCEDURE — because the two share the
    // domain noun, which is the collision this table exists to settle.
    // ADMISSION. `def-admission` states the three-way separation exactly — certification evaluates an
    // implementation and confers no admission, admission confers no regulatory authorisation — and it
    // was referenced ONLY as a comparison alias, never as a routing target. Every way of asking about
    // admission declined for want of public evidence while the answer sat in the catalogue, which is
    // also why `banza.admission.not_authorisation` and `banza.certification.not_admission` were
    // partially failing in production.
    (
        "def-admission",
        &[
            "admissao operacional",
            "operational admission",
            "o que e admissao",
            "what is admission",
            // SUBJECT-QUALIFIED only. A bare "dá admissão" also matches "ISSO dá admissão
            // automática?", whose subject is an unresolved pronoun — and `certification_context`
            // already pins that such a turn must stay `insufficient` rather than invent a
            // certification it was never given. Ambiguity fails safe; a NAMED subject resolves.
            "certificacao da admissao",
            "certificacao confere admissao",
            "certificacao da-me admissao",
            "certificado significa que fui admitido",
            "estar certificado significa que fui admitido",
            "certification grant admission",
            "certification grants admission",
            "certification confer admission",
            "certification confers admission",
            "certified mean i have been admitted",
            "being certified mean i have been admitted",
        ],
    ),
    (
        "def-l2-certification",
        &[
            "o que significa certificar",
            "significa certificar",
            "o que e certificar",
            "what does certifying",
            "what is certifying",
            "what certifying an implementation means",
        ],
    ),
    (
        "def-certification-actor",
        &[
            "quem certifica",
            "who certifies",
            "quem emite a certificacao",
            "who issues certification",
        ],
    ),
    // ── Lifecycle dimensions. Deliberately SEPARATE arms, because the questions are separate facts and
    //    the collapses are the failure mode: a version is not a release, a release is not a freeze, and
    //    pre-production does not imply unfrozen by inference. Each arm names only its own dimension.
    // NO version arm here, deliberately. The version question already has a MORE precise home: the
    // attribute path answers it as an exact fact, and "BanzAI has no version of its own" is a boundary
    // that path protects. Routing version through the lifecycle family was measured to break both — it
    // turned an exact fact into a definition and answered a question whose correct answer is that the
    // attribute is not declared. A coarser arm must not capture a subject a finer one already owns.
    (
        "def-lifecycle-status",
        &[
            "esta em producao",
            "em producao",
            "in production",
            "pre-producao",
            "pre producao",
            "pre-production",
            // `normalize` turns "PRE-PRODUCTION" into "pre production": the hyphen goes and the words
            // stay. Measured — without this the question reached the generic BANZA description.
            "pre production",
            // READINESS is the way the question is actually asked, and it was the one phrasing missing.
            // "O BANZA está pronto para produção?" and "Is BANZA production ready?" reached the generic
            // BANZA description instead: Portuguese returned "BANZA é um protocolo financeiro aberto e
            // neutro em relação a operadores" — a definition, degraded, in place of the status — and
            // English confabulated a reason, "BANZA is not production ready as it is an open financial
            // protocol and not a commercially distinctive payment system component".
            //
            // The lifecycle facts are derived into `lifecycleFacts.generated.json` and were sitting
            // unused while the model invented an answer with the same conclusion and none of the reasons.
            "pronto para producao",
            "pronta para producao",
            "prontos para producao",
            "production ready",
            "ready for production",
            "production readiness",
            // PRODUCTION CERTIFICATES. The status entry states that no operator holds one, and the
            // question that asks it directly had no arm at all — "Existem certificados de produção?"
            // was declined for want of public evidence by an engine holding the answer.
            "certificados de producao",
            "certificado de producao",
            "production certificates",
            "production certificate",
        ],
    ),
    (
        "def-lifecycle-protocol-freeze",
        &[
            "protocolo foi congelado",
            "protocolo ja foi congelado",
            "protocolo congelado",
            // The copula. `normalize` leaves "está" as "esta", and "protocolo congelado" does not occur
            // inside "o protocolo esta congelado" — so the plainest form of the question was the one
            // phrasing that missed.
            "protocolo esta congelado",
            "protocolo ja esta congelado",
            "congelamento do protocolo",
            "protocol been frozen",
            "protocol is frozen",
            "protocol frozen",
            "protocol freeze",
        ],
    ),
    (
        "def-lifecycle-l0-freeze",
        &[
            "l0 foi congelado",
            "l0 ja foi congelado",
            "l0 congelado",
            "l0 esta congelado",
            "l0 ja esta congelado",
            "congelamento do l0",
            "l0 been frozen",
            "l0 is frozen",
            "l0 frozen",
            "l0 freeze",
        ],
    ),
    (
        "def-lifecycle-independent-implementation",
        &[
            "implementacao independente",
            "independent implementation",
            "independently implemented",
            // The same fact asked about WHO rather than about WHAT: "Algum terceiro já demonstrou uma
            // implementação?" names no independent implementation and was answered with the generic
            // operator implementation-steps guide.
            "terceiro ja demonstrou",
            "terceiro demonstrou",
            "third party demonstrated",
            "third party has demonstrated",
        ],
    ),
    (
        "def-lifecycle-trial",
        &[
            "ensaio independente",
            "trial independente",
            "independent trial",
            "trial started",
        ],
    ),
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
            // THE threshold. Measured across the canonical corpus, every occurrence of "limiar" is the
            // root authority threshold — there is no competing threshold in BANZA — so the word names
            // its subject unqualified, and a reader who asks for it after being told there are three
            // authorities is asking about that one.
            //
            // "Qual é o limiar?" was refused in production at `src-acfba64`: turn 3 of the trust journey
            // answered "três autoridades de assinatura independentes [...] quaisquer duas das três", and
            // turn 4 was told no public source supports the request. The engine held the answer and
            // declined to give it because the question named its subject in one fewer word.
            "limiar",
            "threshold",
            // Asked as a COUNT of signatures rather than by the word "limiar"/"threshold". The same
            // fact, one step further from the vocabulary the arm was written around.
            "quantas assinaturas raiz",
            "quantas assinaturas da raiz",
            "how many root signatures",
            "how many signatures are required",
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
            // THE threshold. Measured across the canonical corpus, every occurrence of "limiar" is the
            // root authority threshold — there is no competing threshold in BANZA — so the word names
            // its subject unqualified, and a reader who asks for it after being told there are three
            // authorities is asking about that one.
            //
            // "Qual é o limiar?" was refused in production at `src-acfba64`: turn 3 of the trust journey
            // answered "três autoridades de assinatura independentes [...] quaisquer duas das três", and
            // turn 4 was told no public source supports the request. The engine held the answer and
            // declined to give it because the question named its subject in one fewer word.
            "limiar",
            "threshold",
            // Asked as a COUNT of signatures rather than by the word "limiar"/"threshold". The same
            // fact, one step further from the vocabulary the arm was written around.
            "quantas assinaturas raiz",
            "quantas assinaturas da raiz",
            "how many root signatures",
            "how many signatures are required",
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

/// Every single word appearing in a critical-subject alias — the surface forms this resolver recognises.
///
/// Read by typo recovery, which must not "repair" a word the resolver already knows. Aliases are the
/// resolver's own vocabulary; a token drawn from one is by definition not an unknown surface form.
pub fn critical_subject_words() -> Vec<&'static str> {
    CRITICAL_SUBJECTS
        .iter()
        .flat_map(|(_, aliases)| aliases.iter())
        .flat_map(|a| a.split(' '))
        .filter(|w| w.len() > 2)
        .collect()
}

/// Is `candidate` a subject this engine can actually name, on its own?
///
/// The distinction this draws is the whole point, and three broader rules failed on it first. A subject
/// slot filled with any non-filler token accepted "exemplo" and "coisa". Registered surface forms accepted
/// them too, because that vocabulary is every word of every keyword. `critical_subject_words()` accepted
/// them as well, because it splits multi-word aliases: "operador e uma implementacao sao a mesma coisa"
/// contributes "coisa", "mesma" and "sao" to a word list, and none of those names anything.
///
/// The rule is COMPLETE SURFACE, not membership: the candidate must EQUAL a registered alias, keyword or
/// identifier, never merely occur inside one. That keeps atomic subjects working — "operador", "root",
/// "banzai", "l0" are registered surfaces in their own right — while a word that only ever appears inside a
/// longer phrase is not a subject, which is precisely the difference between "operator" and "thing".
///
/// It reads the existing tables (critical subjects, concepts, the entry keyword index, canonical profiles)
/// rather than introducing a fourth list, so the frame cannot disagree with the resolvers about what is
/// nameable.
pub fn is_nameable_subject(candidate: &str) -> bool {
    let n = crate::normalize(candidate);
    if n.is_empty() {
        return false;
    }
    // Ask the resolvers, in their own terms: given ONLY this candidate, does anything name a fact?
    // `glossary_entry` is the same term resolver production uses, so the frame cannot disagree with it
    // about what is nameable — and it is where atomic subjects like "operador" actually live, since the
    // alias tables carry only phrases. A word that exists solely inside a longer alias resolves to
    // nothing on its own, which is exactly the line this draws.
    glossary_entry(&n).is_some()
        || is_head_of_a_definitional_surface(&n)
        || is_the_canonical_name_of_its_concept(&n)
        || CRITICAL_SUBJECTS
            .iter()
            .any(|(_, aliases)| aliases.iter().any(|a| *a == n))
        || crate::concept::concept_entries()
            .iter()
            .any(|(_, aliases)| aliases.iter().any(|a| *a == n))
        || crate::entry_keyword_surfaces().iter().any(|k| *k == n)
        || crate::canonical_profiles::CANONICAL_PROFILES
            .iter()
            .any(|p| crate::normalize(p.level) == n)
}

/// What a DEFINITIONAL surface opens with. One owner, read by both the head-noun derivation and the
/// record lookup, so the two cannot disagree about which aliases ask what something IS.
const DEFINITIONAL_PREFIXES: &[&str] = &[
    "o que e",
    "o que sao",
    "what is",
    "what are",
    "definicao de",
    "definition of",
];

/// The record that DEFINES this subject, if the corpus registers a definitional surface for it.
///
/// Used to resolve an elliptical follow-up by the record the corpus already owns instead of by a phrase
/// assembled on the fly. Measured, and the reason this exists: rendering "{interrogative} {subject}" gave
/// "que implementacao", which reached `implementation-steps` — the PROCEDURE — because `def-implementation`
/// is registered only as full phrases and a bare noun collides with the how-to that shares it. That is the
/// exact failure CRITICAL_SUBJECTS was built to fix, reintroduced by generating text nobody registered.
pub fn definitional_record_of(subject: &str) -> Option<&'static str> {
    let n = crate::normalize(subject);
    CRITICAL_SUBJECTS
        .iter()
        .find(|(_, aliases)| {
            aliases.iter().any(|a| {
                DEFINITIONAL_PREFIXES.iter().any(|d| a.starts_with(d))
                    && a.rsplit(' ').next() == Some(n.as_str())
            })
        })
        .map(|(id, _)| *id)
}

/// Does `token` name the same concept as `concept`, allowing for the forms a sentence actually uses?
///
/// The frame hands over whatever the speaker wrote — "implementacoes", "empresas", "root" — and a rule
/// keyed on a canonical concept has to recognise the plural and the article-stripped forms without
/// becoming a fuzzy matcher. Equality first, then a plural/singular fold, and nothing else: this decides
/// whether a prohibited relation fires, so it errs toward not firing.
pub fn names_the_same_concept(token: &str, concept: &str) -> bool {
    let t = crate::normalize(token);
    if t == concept {
        return true;
    }
    let stem = t.strip_suffix('s').unwrap_or(&t);
    stem == concept
}

/// Is this record about CERTIFICATION — the thing a follow-up can ask further decisions about?
///
/// The referent test for the certification sequence. It is deliberately a question about the RECORD the
/// previous turn resolved to, not about the words the user typed: a lifecycle answer is not a certification
/// result however much the conversation surrounds it.
pub fn is_certification_record(entry: &str) -> bool {
    entry
        .strip_prefix("def-")
        .map(|rest| rest.split('-').any(|seg| seg == "certification"))
        .unwrap_or(false)
}

/// The record that states how two concepts relate, if the corpus has one.
///
/// No new table: the relationship is already encoded in the id the corpus assigned it. A record named
/// `def-operator-vs-implementation` IS the statement of how those two relate, so the pair is looked up by
/// reconstructing that name from the two resolved records and asking whether it exists.
///
/// Order does not matter, because "are they the same?" is symmetric and the corpus should not have to
/// carry two records to say so. Both orderings are tried against the ONE record.
///
/// A pair with no such record returns None, and the caller fails closed. That is the whole safeguard
/// against answering every "are they the same?" with the one comparison this engine happens to know.
pub fn relationship_record(a_entry: &str, b_entry: &str) -> Option<&'static str> {
    let a = a_entry.strip_prefix("def-")?;
    let b = b_entry.strip_prefix("def-")?;
    if a == b {
        return None;
    }
    let forward = format!("def-{a}-vs-{b}");
    let reverse = format!("def-{b}-vs-{a}");
    CRITICAL_SUBJECTS
        .iter()
        .map(|(id, _)| *id)
        .find(|id| *id == forward || *id == reverse)
}

/// A registered way of ASKING for this record — used to resolve it through the normal path rather than
/// short-circuiting the router with an id.
pub fn canonical_alias_of(entry: &str) -> Option<&'static str> {
    CRITICAL_SUBJECTS
        .iter()
        .find(|(id, _)| *id == entry)
        .and_then(|(_, aliases)| aliases.first().copied())
}

/// A word is a subject when it is the CANONICAL NAME the corpus gave the concept.
///
/// Not `id.contains(word)`. That is the permissive version and it hands out subjects by accident:
/// `def-operator-governance-authority` contains "governance" and "authority", and neither is what that
/// record is about — it is about the operator. Substring containment over an id turns every compound noun
/// in every id into vocabulary.
///
/// The narrow rule is POSITIONAL: the concept's canonical name is the first segment after the `def-`
/// prefix, which is the one place these ids encode ownership unambiguously. `def-root-authorization` is
/// about the Root; `def-operator-vs-implementation` is about the operator; `def-certification-actor` is
/// about certification. Later segments qualify the record — authorization, actor, authority, governance —
/// and never rename it.
///
/// The word must ALSO appear as a whole token in one of that subject's own aliases, so an id fragment
/// nobody ever says is not promoted into a surface form. Ids that do not carry the `def-` prefix are
/// skipped entirely rather than guessed at: where the structure does not encode ownership, this rule
/// declines, and the turn simply keeps its previous topic.
fn is_the_canonical_name_of_its_concept(n: &str) -> bool {
    if n.len() <= 2 {
        return false;
    }
    CRITICAL_SUBJECTS.iter().any(|(id, aliases)| {
        id.strip_prefix("def-")
            .and_then(|rest| rest.split('-').next())
            .map(|canonical| canonical == n)
            .unwrap_or(false)
            && aliases.iter().any(|a| a.split(' ').any(|w| w == n))
    })
}

/// The head noun of a DEFINITIONAL surface is nameable on its own.
///
/// The registries carry no atomic alias for "implementacao" or "root" — they exist only inside phrases —
/// so a rule that demanded whole-surface equality would refuse subjects the conversation plainly names, and
/// a follow-up like "E a Root?" would inherit the previous topic instead of moving. Adding bare aliases to
/// the tables would change what those tokens resolve to for everyone; deriving them here does not.
///
/// The restriction to DEFINITIONAL aliases is what keeps this honest. "o que e uma implementacao" asks what
/// a thing IS, so its last token names that thing. "operador e uma implementacao sao a mesma coisa" is a
/// comparison, and its last token is "coisa" — which names nothing, and is excluded structurally rather
/// than by a stopword list that would have to guess.
fn is_head_of_a_definitional_surface(n: &str) -> bool {
    CRITICAL_SUBJECTS
        .iter()
        .flat_map(|(_, aliases)| aliases.iter())
        .filter(|a| DEFINITIONAL_PREFIXES.iter().any(|d| a.starts_with(d)))
        .any(|a| a.rsplit(' ').next() == Some(n))
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
            // The canonicalization RULES, asked without the acronym. "Por que não posso normalizar
            // Unicode antes de verificar?" is a question about BCJ/1 — the profile fixes the byte form
            // and the verifier applies no Unicode normalization — and it did not name it, so it reached
            // no concept. Measured in production, the Portuguese form was answered by the model citing
            // `federation-trust-evaluation.production.schema.json` and
            // `public-protocol-registry.production.schema.json`, neither of which discusses
            // canonicalization; the English form happened to cite ADR-011. A citation that is right by
            // coin-flip is not a derivation.
            "normalizar unicode",
            "normalizacao unicode",
            "normalize unicode",
            "unicode normalization",
            "unicode normalisation",
            "normalizacao de unicode",
            "canonicalizacao",
            "canonicalization",
            "canonicalisation",
            "forma canonica",
            "canonical form",
            "chaves duplicadas",
            "membros duplicados",
            "duplicate keys",
            "duplicate members",
            "rfc 8785",
            "jcs",
            // The paraphrase. "Que inteiros o BCJ/1 permite?" resolved and "Qual é o domínio de
            // inteiros do BCJ/1?" did not — one asks with the verb, the other with the noun.
            "dominio de inteiros",
            "dominio inteiro",
            "integer domain",
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
            // The same guarantee question in the shape readers ask it. This is the TERM arm; the gate
            // predicate `is_trust_guarantee_phrase` carries the same phrases. Adding them there alone
            // opened the gate with nothing behind it — the exact failure this file documents twice —
            // and "consenso global" resolved to nothing while looking handled.
            "implica consenso global",
            "imply global consensus",
            "implies global consensus",
            "significa consenso global",
            "mean global consensus",
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
            // FAIL-CLOSED, asked as a yes/no about blocking rather than about what happens on failure.
            // `def-trust-guarantees` is the entry that states it, and the direct form already routed.
            "trust invalido bloqueia",
            "confianca invalida bloqueia",
            "invalid trust block",
            "invalid trust blocks",
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
    // A VERSION is not a RELEASE. Asking what version something IS names a subject and a dimension; the
    // release record defines a publication event and answers neither.
    //
    // Measured: "What is the current BANZA version?" was claimed here as a DETERMINISTIC def-release, and
    // because the verdict was deterministic the pipeline honoured it and the attribute tier — the precise
    // owner, which answers the protocol version as an exact fact from the normative manifest — was never
    // consulted. Portuguese escaped only by spelling: "versão" normalises to "versao", which reaches the
    // arm too, but its route was not deterministic, so the attribute tier still got its turn. The same
    // question, two languages, opposite answers, decided by an accident of ordering.
    //
    // So this arm DECLINES rather than redirects: returning None lets the attribute tier resolve subject
    // and dimension together, which is what keeps "qual é a versão do BanzAI?" from inheriting the
    // protocol's version merely because BanzAI interfaces with it. A bare noun must not be a super-route.
    let asks_version = word(nq, "version") || word(nq, "versao") || nq.contains("versão");
    let names_subject = has(nq, &["banza", "banzai"]);
    if asks_version && names_subject && !word(nq, "release") && !word(nq, "changelog") {
        return None;
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
        || word(nq, "saldos")
        || word(nq, "balance")
        // The plural was missing on one side only. Portuguese "saldos" is caught by a substring arm
        // further down; English "balances" matched nothing, so `does banza store balances` fell through
        // while `o banza guarda saldos` resolved. A term must not depend on which language asks.
        || word(nq, "balances")
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
    // A trailing request about STYLE is not part of the subject, and counting it against the token gate
    // is what made "Explica BCJ/1 de forma simples." unanswerable while "Explica BCJ/1." resolved. The
    // stripped form is used for the WHOLE decision below — gate and term alike — so the two cannot
    // disagree about what the question is, which is the failure this file documents repeatedly.
    let nq = without_style_qualifier(nq);
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
        // A claim about what the protocol requires must be answered from the concept's own authority,
        // never from whatever document retrieval reaches for. See `is_banza_relation_query`.
        || is_banza_relation_query(nq)
        // "Where does X live?" asks about X. See `is_locative_query`.
        || is_locative_query(nq)
        // The canonicalization rules, asked without the acronym. See `is_canonicalization_phrase`.
        || is_canonicalization_phrase(nq)
        // A comparison, so the block below decides it rather than an arm that names one side. It opens
        // the gate for every comparison and narrows it again immediately: only a comparison of profiles
        // resolves, and every other one returns None, exactly as before.
        || is_comparison_query(nq)
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
    // A comparison names TWO subjects; every arm below names one. Decided here, before any of them.
    //
    // Two profiles are answered by the entry that carries ALL of them, with each profile's purpose and
    // inheritance, derived from the canonical registry and realized in both locales — a real answer to
    // "what is the difference between L2 and L3", not a restatement of one side.
    //
    // Any other comparison returns None rather than serving one side as though it were the answer. That
    // is not an improvement in what is known; it is the difference between an incomplete answer a reader
    // can see and a confident one they cannot.
    if is_comparison_query(nq) || crate::compare::is_comparison(nq) {
        // The profile family keeps its high-confidence shortcut: `def-profiles` carries all five with
        // each profile's purpose and inheritance, derived from the canonical registry and realized in
        // both locales, so it is a better answer than composing two definitions. It is an OPTIMIZATION
        // now, not the mechanism — `compare::plan` resolves L2 and L3 independently without it, which
        // is what mutation C5 proves.
        if profiles_named(nq) >= 2 {
            return Some("def-profiles");
        }
        // Otherwise the generic engine plans the comparison. It resolves each side through the same
        // resolvers a single-subject question uses, and both sides travel separately from here.
        //
        // Returning None on an incomplete plan is deliberate and is NOT the same as knowing nothing: a
        // comparison with one side unresolved must reach the honest path, never a generic entry that
        // happens to mention the resolved side. Measured before this: "qual a diferença entre settlement
        // e o que o BANZA especifica" — whose right side is a question fragment, not a concept — routed
        // to `what-is-banza` and would have been answered with the protocol summary.
        return None;
    }
    // "como se substitui uma autoridade da raiz?" reads as operational, and the operational arm would
    // send it to the model. But whether the surviving two can replace a lost authority is decided by the
    // chain, not composed as prose — so a succession question keeps its deterministic answer, exactly as
    // a boundary question does.
    // A named critical subject outranks the operational heuristic. "já existe uma implementação
    // independente demonstrada?" is a question about CURRENT STATE, but "demonstrada" contains the
    // "demonstr" marker the deferral reads as a how-to, so the gate closed on a question that has a
    // settled answer. The heuristic still governs everything it was written for; it no longer overrides
    // a subject the resolver has explicitly registered.
    if (is_operational(nq) || is_onboarding(nq))
        && !boundary
        && !is_root_succession_phrase(nq)
        // A GUARANTEE question has a settled answer, and the operational heuristic was closing the gate
        // in front of it. "Trust inválido bloqueia?" reads as operational because of "bloqueia", so it
        // returned None before `term_of` was ever consulted — while its English twin, "Does invalid
        // trust block?", carried no such marker and was answered. The same fact, one locale answered.
        //
        // This is the exemption the comment above already describes: the heuristic still governs
        // everything it was written for, and no longer overrides a subject the resolver has registered.
        && !guarantee_phrase
        && critical_subject(nq).is_none()
    {
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
