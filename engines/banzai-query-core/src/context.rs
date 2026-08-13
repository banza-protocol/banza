//! Increment 6 (§16–§17) — deterministic multi-turn CONVERSATIONAL REFERENCE resolution.
//!
//! A follow-up turn ("essa execução", "a anterior", "esse Manifesto", "e as chaves?", "porquê?",
//! "compare com a última", "agora reproduza", "mostre o recibo") is only meaningful in the context of the
//! PRIOR turn. This module resolves those anaphora **entirely in Rust** — the model never invents the
//! referent. Given the current question and a small, SAFE, technical-only [`PriorContext`] the client
//! carried forward from the previous turn's answer meta, [`resolve_references`] rewrites/*enriches* the
//! question into a self-contained [`ResolvedContext`] that the downstream understanding stack
//! (`resolve_query` + `plan_tools` + the operational/family tiers of Inc.2–5) consumes.
//!
//! Safety (golden rule, unchanged): anaphora resolution NEVER bypasses the Tier-0 safety/boundary gate. A
//! boundary question is refused REGARDLESS of context — naming "essa execução" never unlocks a prohibited
//! action. When [`crate::boundary`] flags the raw question, this module returns the ORIGINAL question
//! unchanged with `resolution_state = "BOUNDARY"` and resolves NO referent, so the pipeline's boundary gate
//! settles it. A resolved reference that would require a boundary-crossing tool degrades to the honest
//! fallback (the pipeline routes the original raw question through the boundary gate first).
//!
//! Honesty: an anaphor with NO prior context to bind it produces `requires_clarification = true` and a
//! precise, request-oriented PT clarification — NEVER a guessed referent.
//!
//! Pure + total + deterministic: no model, no I/O, no state. The same (question, prior_context) yields the
//! same resolution.

use crate::artifact;
use crate::intent::any_hit;
use serde::{Deserialize, Serialize};

// ── anaphora vocabulary (accent-free, matched against `crate::normalize`d text; conversational, rare in a
//    self-contained first-turn question) ──────────────────────────────────────────────────────────────────

/// "reproduce / re-run THAT execution" — reuse of the fine reproduce family, conversational forms first.
const REPRODUCE_ANAPHORA: &[&str] = &[
    "agora reproduz",
    "reproduz",
    "reproduza",
    "reproduzir",
    "reproduce",
    "reexecuta",
    "re-executa",
    "reexecutar",
    "correr de novo",
    "executar de novo",
    "voltar a executar",
    "repetir a execucao",
    "repetir a jornada",
    "run again",
    "re-run",
    "rerun",
];

/// "compare with the previous / last one" — the comparison operands are the prior execution and its own
/// previous execution (carried in the prior context), never invented.
const COMPARE_PREVIOUS_ANAPHORA: &[&str] = &[
    "com a anterior",
    "com a ultima",
    "com a penultima",
    "com a execucao anterior",
    "com a jornada anterior",
    "com a ultima execucao",
    "compare com a ultima",
    "compara com a ultima",
    "compare com a anterior",
    "compara com a anterior",
    "versus a anterior",
    "vs a anterior",
    "face a anterior",
    "with the previous",
    "with the last",
    "to the previous",
    "against the previous",
];

/// "porquê?" — a bare why-follow-up diagnoses the prior execution. Gated to a SHORT turn with no subject of
/// its own (a full "porque falhou a ADR-002" is not anaphoric and the taxonomy owns it).
const WHY_ANAPHORA: &[&str] = &[
    "porque",
    "por que",
    "porque e que",
    "por que e que",
    "porque razao",
    "porque motivo",
    "porque nao",
    "why",
    "how come",
];

/// past-tense duration follow-up ("e quanto demorou?") about the prior execution.
const DURATION_ANAPHORA: &[&str] = &[
    "quanto demorou",
    "quanto durou",
    "quanto levou",
    "quanto tempo demorou",
    "quanto tempo levou",
    "quanto tempo durou",
    "how long did it take",
    "how long did",
    "took how long",
];

/// "the receipt" of the prior execution.
const RECEIPT_ANAPHORA: &[&str] = &[
    "o recibo",
    "mostra o recibo",
    "mostre o recibo",
    "ver o recibo",
    "o recibo dessa",
    "o recibo desta",
    "o recibo da execucao",
    "recibo de operacao",
    "recibo da operacao",
    "recibo de jornada",
    "the receipt",
    "show the receipt",
];

/// "the keys" of the prior operator/implementation.
const KEYS_ANAPHORA: &[&str] = &[
    "as chaves",
    "e as chaves",
    "e a chave",
    "as suas chaves",
    "as chaves dele",
    "as chaves dela",
    "as chaves dessa",
    "manifesto de chaves",
    "manifesto das chaves",
    "key manifest",
    "the keys",
    "and the keys",
    "its keys",
];

/// "that manifest" of the prior operator/implementation — a DEMONSTRATIVE is required (bare "o manifesto"
/// is the Protocol Manifesto and is left to the normal resolver).
const MANIFEST_ANAPHORA: &[&str] = &[
    "esse manifesto",
    "este manifesto",
    "esse manifest",
    "este manifest",
    "o manifesto dele",
    "o manifesto dela",
    "o manifesto dessa",
    "o manifesto desta",
    "that manifest",
    "this manifest",
];

/// "that execution / that run" — show the prior execution.
const EXECUTION_ANAPHORA: &[&str] = &[
    "essa execucao",
    "esta execucao",
    "essa jornada",
    "esta jornada",
    "dessa execucao",
    "desta execucao",
    "nessa execucao",
    "essa validacao",
    "a mesma execucao",
    "a execucao anterior",
    "a jornada anterior",
    "that execution",
    "this execution",
    "that run",
    "this run",
];

/// A journey-subject marker in the CURRENT turn — when present, a duration ask is a general operational
/// question the existing tier owns, not an anaphoric follow-up about a specific prior execution.
const JOURNEY_SUBJECT: &[&str] = &[
    "jornada de validacao",
    "jornada completa",
    "uma jornada",
    "validation journey",
    "de validacao",
];

/// The conversational reference class detected in a follow-up turn.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Anaphor {
    None,
    Reproduce,
    ComparePrevious,
    Why,
    Duration,
    Receipt,
    Keys,
    Manifest,
    Execution,
}

impl Anaphor {
    fn kind(&self) -> &'static str {
        match self {
            Anaphor::None => "none",
            Anaphor::Reproduce => "reproduce",
            Anaphor::ComparePrevious => "comparison",
            Anaphor::Why => "diagnose",
            Anaphor::Duration => "duration",
            Anaphor::Receipt => "receipt",
            Anaphor::Keys => "keys",
            Anaphor::Manifest => "manifest",
            Anaphor::Execution => "execution",
        }
    }
    /// The intent hint the resolved query will classify to (Inc.2 taxonomy label).
    fn intent(&self) -> &'static str {
        match self {
            Anaphor::None => "",
            Anaphor::Reproduce => "reproduce_execution",
            Anaphor::ComparePrevious => "compare_executions",
            Anaphor::Why => "diagnose_failure",
            Anaphor::Duration => "get_duration",
            Anaphor::Receipt => "get_artifact",
            Anaphor::Keys => "get_artifact",
            Anaphor::Manifest => "get_artifact",
            Anaphor::Execution => "get_execution",
        }
    }
    /// Whether this class binds to a prior EXECUTION (vs a prior operator/implementation entity).
    fn needs_execution(&self) -> bool {
        matches!(
            self,
            Anaphor::Reproduce
                | Anaphor::ComparePrevious
                | Anaphor::Why
                | Anaphor::Duration
                | Anaphor::Receipt
                | Anaphor::Execution
        )
    }
    /// Whether this class binds to a prior operator/implementation ENTITY.
    fn needs_entity(&self) -> bool {
        matches!(self, Anaphor::Keys | Anaphor::Manifest)
    }
}

/// The small, SAFE, technical-only context the client carries forward from the previous turn's answer meta.
/// It contains NO free text, NO PII, NO secrets and NONE of the model's prose — only stable technical ids and
/// enums. Every field defaults to the empty string (a first turn carries nothing).
#[derive(Debug, Clone, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct PriorContext {
    #[serde(default)]
    pub operator_id: String,
    #[serde(default)]
    pub implementation_id: String,
    #[serde(default)]
    pub execution_id: String,
    /// The execution BEFORE `execution_id` (the second operand for "compare with the previous").
    #[serde(default)]
    pub previous_execution_id: String,
    #[serde(default)]
    pub artifact: String,
    #[serde(default)]
    pub profile: String,
    #[serde(default)]
    pub environment: String,
    #[serde(default)]
    pub protocol_version: String,
    #[serde(default)]
    pub last_intent: String,
    #[serde(default)]
    pub last_family: String,
    // ── BZCI-2 (§2) — the documentary / conceptual dimension of the conversation. These are what let a
    //    governance chain ("o que é uma ADR?" → "e uma RFC?" → "qual a diferença?") inherit its intent and
    //    swap only the subject. They are technical labels only (a canonical subject, a document id, a metric
    //    slug) — never free prose. `observed_at` is a client-carried ISO timestamp used later for freshness.
    /// The prior turn's short subject label (e.g. "ADR", "RFC", "federação", "Action Boundary"), or "".
    #[serde(default)]
    pub last_subject: String,
    /// concept | document | entity | metric | operational | none — how the prior subject was resolved.
    #[serde(default)]
    pub last_subject_kind: String,
    /// The prior turn's explicit document id (e.g. "ADR-002"), or "".
    #[serde(default)]
    pub last_document_id: String,
    /// The prior turn's operational metric slug (e.g. "elapsed_time"), or "".
    #[serde(default)]
    pub last_metric: String,
    /// Client-carried ISO-8601 timestamp of the prior turn (freshness; never trusted as a fact source).
    #[serde(default)]
    pub observed_at: String,
}

impl PriorContext {
    fn has_any(&self) -> bool {
        !self.operator_id.is_empty()
            || !self.implementation_id.is_empty()
            || !self.execution_id.is_empty()
            || !self.previous_execution_id.is_empty()
            || !self.artifact.is_empty()
            || !self.profile.is_empty()
            || !self.environment.is_empty()
            || !self.protocol_version.is_empty()
    }
    /// A prior CONCEPTUAL/DOCUMENTARY conversation exists to inherit from (the ADR/RFC/governance chain).
    /// Distinct from `has_any` (which gates execution/entity binding): a concept follow-up inherits the prior
    /// intent + subject, not an execution id.
    fn has_concept_context(&self) -> bool {
        !self.last_intent.is_empty()
            || !self.last_subject.is_empty()
            || !self.last_document_id.is_empty()
    }
    /// The prior operator/implementation entity id (implementation preferred — it is the artifact publisher).
    fn entity_id(&self) -> &str {
        if !self.implementation_id.is_empty() {
            &self.implementation_id
        } else {
            &self.operator_id
        }
    }
}

/// The deterministic reference resolution serialized to the JS layer (Rust decides, TS transports).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ResolvedContext {
    pub schema_version: u32,
    /// The raw current-turn question, unchanged.
    pub original_query: String,
    /// The enriched, self-contained query the downstream understanding stack consumes. Equals
    /// `original_query` when there is no anaphora, no bindable prior context, or a boundary was detected.
    pub resolved_query: String,
    /// A conversational reference was detected in the current turn.
    pub has_anaphora: bool,
    /// The prior context carried at least one bindable technical field.
    pub has_prior_context: bool,
    /// reproduce | comparison | diagnose | duration | receipt | keys | manifest | execution | none.
    pub referent_kind: String,
    /// The Inc.2 intent label the resolved query classifies to ("" when no anaphora resolved).
    pub resolved_intent: String,
    /// The resolved referent execution id ("" when none).
    pub execution_id: String,
    /// Comparison operands [latest, previous] for a "compare with the previous" follow-up.
    pub comparison_targets: Vec<String>,
    /// The resolved artifact class (key_manifest | implementation_manifest | receipt | …) or "".
    pub artifact: String,
    /// The bound operator id (carried forward / enrichment), or "".
    pub operator_id: String,
    /// The bound implementation id (carried forward / enrichment), or "".
    pub implementation_id: String,
    /// The conformance profile carried forward, or "".
    pub profile: String,
    /// The environment carried forward, or "".
    pub environment: String,
    /// The protocol version carried forward, or "".
    pub protocol_version: String,
    /// RESOLVED | NO_ANAPHORA | NO_REFERENT | BOUNDARY.
    pub resolution_state: String,
    /// True when an anaphor was detected but no prior context could bind it — the honest outcome is a
    /// single concrete clarifying question, NEVER a guessed referent.
    pub requires_clarification: bool,
    /// The engine-authored PT clarification (only when `requires_clarification`); else "".
    pub clarification: String,
    /// [`crate::boundary`] flagged the raw question — no referent is resolved; the pipeline refuses it.
    pub boundary_detected: bool,
    // ── BZCI-2 (§3/§25) — typed turn classification + the resolved-request skeleton. Additive; every
    //    existing field is unchanged so the current pipeline + tests behave identically. ────────────────────
    /// STANDALONE | ELLIPTICAL_FOLLOWUP | REFERENTIAL_FOLLOWUP | BOUNDARY — the §3 turn class (first cut).
    #[serde(default)]
    pub turn_type: String,
    /// The subject the resolved request is ABOUT after inheritance (e.g. "RFC", "federação"), or "".
    #[serde(default)]
    pub resolved_subject: String,
    /// The intent INHERITED from the prior turn for an elliptical follow-up ("" when none inherited).
    #[serde(default)]
    pub inherited_intent: String,
    /// The per-slot operations applied this turn (e.g. "intent:INHERIT", "subject:REPLACE") — §5 trace.
    #[serde(default)]
    pub slot_ops: Vec<String>,
}

impl ResolvedContext {
    fn inert(question: &str, state: &str, has_anaphora: bool, boundary: bool) -> Self {
        // Derive the §3 turn class from the (pre-existing) resolution_state so a caller inspecting turn_type
        // gets a stable label without any new branching: a boundary turn is BOUNDARY, an unbound anaphor is a
        // (referential) follow-up we could not resolve, and everything else is a self-contained STANDALONE.
        let turn_type = match state {
            "BOUNDARY" => "BOUNDARY",
            "NO_REFERENT" => "REFERENTIAL_FOLLOWUP",
            _ => "STANDALONE",
        };
        ResolvedContext {
            schema_version: 1,
            original_query: question.to_string(),
            resolved_query: question.to_string(),
            has_anaphora,
            has_prior_context: false,
            referent_kind: "none".into(),
            resolved_intent: String::new(),
            execution_id: String::new(),
            comparison_targets: Vec::new(),
            artifact: String::new(),
            operator_id: String::new(),
            implementation_id: String::new(),
            profile: String::new(),
            environment: String::new(),
            protocol_version: String::new(),
            resolution_state: state.into(),
            requires_clarification: false,
            clarification: String::new(),
            boundary_detected: boundary,
            turn_type: turn_type.into(),
            resolved_subject: String::new(),
            inherited_intent: String::new(),
            slot_ops: Vec::new(),
        }
    }
}

/// Detect the conversational reference class in `nq` (normalized) / `raw` (for token shapes). Most-specific
/// first; `token_count` gates the bare "porquê?" and duration follow-ups so a self-contained question that
/// merely contains "porque"/"demorou" is NOT mis-read as anaphoric.
fn detect_anaphor(nq: &str, raw: &str) -> Anaphor {
    let token_count = nq.split_whitespace().count();
    let has_journey_subject = any_hit(nq, JOURNEY_SUBJECT);
    let has_explicit_doc = raw.to_lowercase().contains("adr") || raw.to_lowercase().contains("rfc");

    if any_hit(nq, REPRODUCE_ANAPHORA) {
        return Anaphor::Reproduce;
    }
    if any_hit(nq, COMPARE_PREVIOUS_ANAPHORA) {
        return Anaphor::ComparePrevious;
    }
    // bare why-follow-up: a why-marker, a short turn, and no subject of its own.
    if any_hit(nq, WHY_ANAPHORA) && token_count <= 5 && !has_journey_subject && !has_explicit_doc {
        return Anaphor::Why;
    }
    // duration follow-up: a past-tense duration marker with no journey subject in the turn itself.
    if any_hit(nq, DURATION_ANAPHORA) && !has_journey_subject {
        return Anaphor::Duration;
    }
    if any_hit(nq, RECEIPT_ANAPHORA) {
        return Anaphor::Receipt;
    }
    if any_hit(nq, KEYS_ANAPHORA) {
        return Anaphor::Keys;
    }
    if any_hit(nq, MANIFEST_ANAPHORA) {
        return Anaphor::Manifest;
    }
    if any_hit(nq, EXECUTION_ANAPHORA) {
        return Anaphor::Execution;
    }
    Anaphor::None
}

/// Extract an explicit `exec-…` execution id from the RAW question (hyphen-preserving; `normalize` folds the
/// hyphen to a space). An explicit id in the turn overrides the prior context.
fn explicit_execution_id(raw: &str) -> String {
    for tok in
        raw.split(|c: char| c.is_whitespace() || c == ',' || c == '.' || c == '?' || c == '!')
    {
        let t = tok.trim();
        if t.len() > 5 && t.to_lowercase().starts_with("exec-") {
            return t.to_string();
        }
    }
    String::new()
}

// ── BZCI-2/3 (§4/§5/§9) — ELLIPTICAL concept follow-ups. A bare connective turn ("e uma RFC?",
//    "e a federação?", "e Trust?", "e sobre a ADR-011?") inherits the CONCEPT intent of the conversation and
//    REPLACES only the subject. The rewrite is a self-contained concept question ("o que é <subject>?") that
//    the SAME downstream catalogues (glossary/concept/document) ground — history selects WHAT to resolve, it
//    never asserts the answer (§19). If the subject is not a known concept, the downstream honestly declines.

/// Leading connectives that open an elliptical follow-up. Matched longest-first against `normalize`d text;
/// the readable subject is whatever follows (articles kept, so the rewrite stays grammatical).
// Only the connective PARTICLE (and any trailing preposition) is stripped — articles are KEPT so the rewrite
// stays grammatical ("e uma RFC?" → "uma RFC" → "o que é uma RFC?"; "e a federação?" → "a federação").
const ELLIPSIS_CONNECTIVES: &[&str] = &[
    "e em relacao a",
    "e no que toca a",
    "e quanto a",
    "e sobre",
    "que tal",
    "and what about",
    "what about",
    "how about",
    "e",
    "and",
];

/// Remainders that are REFERENTIAL (ordinal / pronoun / demonstrative), not a concept subject. An elliptical
/// turn whose remainder is one of these is a referential/metric follow-up (bound elsewhere), never a concept.
const ORDINAL_PRONOUN_REMAINDER: &[&str] = &[
    "anterior",
    "a anterior",
    "o anterior",
    "a ultima",
    "o ultimo",
    "a penultima",
    "o penultimo",
    "a primeira",
    "o primeiro",
    "a segunda",
    "o segundo",
    "essa",
    "esse",
    "esta",
    "este",
    "isso",
    "isto",
    "ele",
    "ela",
    "eles",
    "elas",
    "ambos",
    "ambas",
    "os dois",
    "as duas",
    "a mesma",
    "o mesmo",
    "esse caso",
    "nesse caso",
    "agora",
    "hoje",
];

/// Prior primary intents whose CONCEPT/GOVERNANCE nature makes an elliptical subject-swap an INHERIT (§5). A
/// non-concept prior intent still allows the concept ellipsis (a topic switch to a concept), just without an
/// inherited-intent label.
const CONCEPT_INHERIT_INTENTS: &[&str] = &[
    "explain_concept",
    "explain_governance",
    "explain_document",
    "explain_architecture",
    "explain_procedure",
    "explain_impact",
    "compare_documents",
    "locate_rule",
    "get_requirement",
    "get_governance_decision",
    "summarize_document",
    "get_applicability",
    "get_version_change",
];

/// Extract the concept subject from an elliptical connective turn. Returns the readable subject phrase (from
/// the RAW, so accents/case survive) when the turn is a short connective-led ellipsis whose remainder is a
/// concept-like noun phrase; `None` otherwise (a full question, a long turn, or a referential remainder).
fn ellipsis_subject(raw: &str, nq: &str) -> Option<String> {
    let token_count = nq.split_whitespace().count();
    // An ellipsis is terse; a full multi-clause turn is not an ellipsis.
    if token_count == 0 || token_count > 6 {
        return None;
    }
    // A turn that already carries its own interrogative/imperative lead is self-contained (standalone) or a
    // comparison/authority follow-up handled elsewhere — never a concept subject-swap ellipsis here.
    for lead in [
        "o que", "que e", "qual", "quais", "como", "quando", "onde", "porque", "por que",
        "explica", "define", "mostra", "mostre", "diz", "lista", "what is", "how", "when", "where",
        "why",
    ] {
        if nq == lead || nq.starts_with(&format!("{lead} ")) {
            return None;
        }
    }
    // Find the connective prefix (longest-first) and take the remainder as the subject.
    let mut remainder: Option<&str> = None;
    for c in ELLIPSIS_CONNECTIVES {
        if nq == *c {
            return None; // a bare connective with no subject is not resolvable
        }
        let pref = format!("{c} ");
        if nq.starts_with(&pref) {
            remainder = Some(&nq[pref.len()..]);
            break;
        }
    }
    let rem_nq = remainder?.trim();
    if rem_nq.is_empty() {
        return None;
    }
    // A referential remainder (ordinal/pronoun) is not a concept subject.
    if ORDINAL_PRONOUN_REMAINDER.contains(&rem_nq) {
        return None;
    }
    // Recover the readable subject from the RAW turn: drop the same leading connective token(s), keep the tail
    // (articles + the noun, with original accents/case), strip trailing punctuation.
    let raw_trim = raw.trim().trim_end_matches(['?', '.', '!', ' ']);
    let connective_tokens = nq.split_whitespace().count() - rem_nq.split_whitespace().count();
    let subject: String = raw_trim
        .split_whitespace()
        .skip(connective_tokens)
        .collect::<Vec<_>>()
        .join(" ");
    let subject = subject.trim().to_string();
    if subject.is_empty() || subject.split_whitespace().count() > 5 {
        return None;
    }
    Some(subject)
}

/// Honest, request-oriented PT clarification (0 guessed referents) when an anaphor cannot be bound.
fn clarification_for(a: Anaphor) -> String {
    let what = match a {
        Anaphor::Reproduce => "reproduzir uma execução anterior",
        Anaphor::ComparePrevious => "comparar com uma execução anterior",
        Anaphor::Why => "diagnosticar por que uma execução falhou ou ficou bloqueada",
        Anaphor::Duration => "saber quanto demorou uma execução anterior",
        Anaphor::Receipt => "consultar o recibo de uma execução anterior",
        Anaphor::Keys => "abrir o manifesto de chaves de um operador/implementação",
        Anaphor::Manifest => "abrir o manifesto de um operador/implementação",
        Anaphor::Execution => "mostrar uma execução anterior",
        Anaphor::None => "este pedido",
    };
    format!(
        "Interpretei o teu pedido como uma referência a um turno anterior — **{what}** —, mas **não tenho \
o contexto dessa conversa** (nenhuma execução, operador ou artefacto anterior). Não adivinho a referência: \
indica o identificador concreto (por exemplo `exec-…`, o operador, ou a decisão/documento) e prossigo."
    )
}

/// Deterministically resolve conversational references. Boundary FIRST (never overridden). No model, no I/O.
pub fn resolve_references(question: &str, prior: &PriorContext) -> ResolvedContext {
    // 1) BOUNDARY — a safety/financial/secret/injection question is refused REGARDLESS of context. Naming
    // "essa execução" never unlocks a prohibited action. The boundary signal is the SAME one the pipeline's
    // Tier-0 refusal + `resolve_query` use: [`crate::boundary`] PLUS the router's refusal / action-boundary /
    // `refuse-*` verdict (a financial/action boundary routes as `action=deterministic, intent=action_boundary`,
    // which `boundary::evaluate` alone does not always flag). We return the ORIGINAL question UNCHANGED and
    // resolve NO referent — so a resolved reference can never rewrite a prohibited action into a benign one and
    // the pipeline's gate refuses it.
    let rd = crate::route::route(question);
    let route_refusal = rd.action == "refusal"
        || rd.intent == "action_boundary"
        || rd
            .entry_id
            .as_deref()
            .is_some_and(|e| e.starts_with("refuse-"));
    if crate::boundary::evaluate(question).boundary_detected || route_refusal {
        let nq = crate::normalize(question);
        let has_anaphora = detect_anaphor(&nq, question) != Anaphor::None;
        return ResolvedContext::inert(question, "BOUNDARY", has_anaphora, true);
    }

    let nq = crate::normalize(question);
    let anaphor = detect_anaphor(&nq, question);

    // 2) no execution/artifact anaphor → try an ELLIPTICAL CONCEPT follow-up ("e uma RFC?"), then fall back to
    //    a self-contained pass-through. The concept ellipsis inherits the conversation's intent and swaps only
    //    the subject; it fires only with a prior conceptual/documentary context to inherit from (so a genuine
    //    first-turn ellipsis is left untouched). The rewrite is a benign concept question grounded downstream.
    if anaphor == Anaphor::None {
        if (prior.has_concept_context() || prior.has_any())
            && !crate::normalize(question).is_empty()
        {
            if let Some(subject) = ellipsis_subject(question, &nq) {
                let inherited = if CONCEPT_INHERIT_INTENTS.contains(&prior.last_intent.as_str()) {
                    prior.last_intent.clone()
                } else {
                    String::new()
                };
                let turn_type = if inherited.is_empty() {
                    "TOPIC_SWITCH"
                } else {
                    "ELLIPTICAL_FOLLOWUP"
                };
                let mut slot_ops = Vec::new();
                if inherited.is_empty() {
                    slot_ops.push("subject:INTRODUCE".to_string());
                } else {
                    slot_ops.push("intent:INHERIT".to_string());
                    slot_ops.push("subject:REPLACE".to_string());
                }
                let resolved_query = format!("o que é {subject}?");
                // Defense in depth: never emit a resolved query that itself trips the boundary gate.
                if crate::boundary::evaluate(&resolved_query).boundary_detected {
                    return ResolvedContext::inert(question, "NO_ANAPHORA", false, false);
                }
                return ResolvedContext {
                    schema_version: 1,
                    original_query: question.to_string(),
                    resolved_query,
                    has_anaphora: true,
                    has_prior_context: true,
                    referent_kind: "concept".into(),
                    resolved_intent: "explain_concept".into(),
                    execution_id: String::new(),
                    comparison_targets: Vec::new(),
                    artifact: String::new(),
                    operator_id: prior.operator_id.clone(),
                    implementation_id: prior.implementation_id.clone(),
                    profile: prior.profile.clone(),
                    environment: prior.environment.clone(),
                    protocol_version: prior.protocol_version.clone(),
                    resolution_state: "RESOLVED".into(),
                    requires_clarification: false,
                    clarification: String::new(),
                    boundary_detected: false,
                    turn_type: turn_type.into(),
                    resolved_subject: subject,
                    inherited_intent: inherited,
                    slot_ops,
                };
            }
        }
        return ResolvedContext::inert(question, "NO_ANAPHORA", false, false);
    }

    let has_prior = prior.has_any();
    let explicit_exec = explicit_execution_id(question);

    // 3) can the detected anaphor be BOUND to the prior context? (per-class required field)
    let bound_execution = if !explicit_exec.is_empty() {
        explicit_exec.clone()
    } else {
        prior.execution_id.clone()
    };
    let entity_id = prior.entity_id().to_string();
    let can_bind = if anaphor == Anaphor::ComparePrevious {
        // both operands required (the prior execution AND its own previous execution).
        !bound_execution.is_empty() && !prior.previous_execution_id.is_empty()
    } else if anaphor.needs_execution() {
        !bound_execution.is_empty()
    } else if anaphor.needs_entity() {
        !entity_id.is_empty()
    } else {
        false
    };

    if !has_prior || !can_bind {
        // 4) anaphor detected but nothing to bind it → a single concrete clarifying question, never a guess.
        let mut out = ResolvedContext::inert(question, "NO_REFERENT", true, false);
        out.has_prior_context = has_prior;
        out.referent_kind = anaphor.kind().to_string();
        out.requires_clarification = true;
        out.clarification = clarification_for(anaphor);
        return out;
    }

    // 5) BIND — build the self-contained resolved query + structured referents. The resolved query carries
    // only the INTENT markers the downstream classifiers recognise; the referent ids are carried structurally
    // (the pipeline uses them directly). No user action verb beyond the safe intent markers is injected.
    let alias = artifact::primary_alias(&entity_id);
    let entity_phrase = alias
        .clone()
        .map(|a| format!(" do {a}"))
        .unwrap_or_default();

    let (resolved_query, artifact_type, comparison_targets) = match anaphor {
        Anaphor::Reproduce => (
            "reproduz a execução da jornada de validação".to_string(),
            String::new(),
            Vec::new(),
        ),
        Anaphor::ComparePrevious => (
            "compara a execução da jornada de validação com a execução anterior".to_string(),
            String::new(),
            vec![bound_execution.clone(), prior.previous_execution_id.clone()],
        ),
        Anaphor::Why => (
            "porque falhou a execução da jornada de validação".to_string(),
            String::new(),
            vec![bound_execution.clone()],
        ),
        Anaphor::Duration => (
            "quanto tempo demorou a execução da jornada de validação".to_string(),
            String::new(),
            vec![bound_execution.clone()],
        ),
        Anaphor::Receipt => (
            format!("mostra o recibo de operação{entity_phrase}"),
            "receipt".to_string(),
            vec![bound_execution.clone()],
        ),
        Anaphor::Keys => (
            format!("mostra o manifesto de chaves{entity_phrase}"),
            "key_manifest".to_string(),
            Vec::new(),
        ),
        Anaphor::Manifest => (
            format!("mostra o manifesto{entity_phrase}"),
            "implementation_manifest".to_string(),
            Vec::new(),
        ),
        Anaphor::Execution => (
            "mostra a execução da jornada de validação".to_string(),
            String::new(),
            vec![bound_execution.clone()],
        ),
        Anaphor::None => (question.to_string(), String::new(), Vec::new()),
    };

    ResolvedContext {
        schema_version: 1,
        original_query: question.to_string(),
        resolved_query,
        has_anaphora: true,
        has_prior_context: true,
        referent_kind: anaphor.kind().to_string(),
        resolved_intent: anaphor.intent().to_string(),
        execution_id: if anaphor.needs_execution() {
            bound_execution
        } else {
            String::new()
        },
        comparison_targets,
        artifact: artifact_type,
        operator_id: prior.operator_id.clone(),
        implementation_id: prior.implementation_id.clone(),
        profile: prior.profile.clone(),
        environment: prior.environment.clone(),
        protocol_version: prior.protocol_version.clone(),
        resolution_state: "RESOLVED".into(),
        requires_clarification: false,
        clarification: String::new(),
        boundary_detected: false,
        turn_type: "REFERENTIAL_FOLLOWUP".into(),
        resolved_subject: String::new(),
        inherited_intent: prior.last_intent.clone(),
        slot_ops: vec!["referent:BIND".into()],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn prior_exec() -> PriorContext {
        PriorContext {
            implementation_id: "operator-zero".into(),
            execution_id: "exec-9e5f0dc0".into(),
            previous_execution_id: "exec-1a2b3c4d".into(),
            profile: "L2".into(),
            environment: "sandbox".into(),
            protocol_version: "1.0.0".into(),
            last_intent: "get_execution".into(),
            last_family: "".into(),
            ..Default::default()
        }
    }

    #[test]
    fn why_after_an_execution_diagnoses_the_prior_execution() {
        let r = resolve_references("porquê?", &prior_exec());
        assert_eq!(r.resolution_state, "RESOLVED");
        assert_eq!(r.referent_kind, "diagnose");
        assert_eq!(r.resolved_intent, "diagnose_failure");
        assert_eq!(r.execution_id, "exec-9e5f0dc0");
        assert!(r.resolved_query.contains("porque falhou"));
        // the resolved query classifies to diagnose_failure (the downstream family owns it).
        assert_eq!(
            crate::taxonomy::resolve_query(&r.resolved_query).primary_intent,
            "diagnose_failure"
        );
    }

    #[test]
    fn keys_follow_up_opens_the_prior_entity_key_manifest_live() {
        let r = resolve_references("e as chaves?", &prior_exec());
        assert_eq!(r.resolution_state, "RESOLVED");
        assert_eq!(r.referent_kind, "keys");
        assert_eq!(r.artifact, "key_manifest");
        // the resolved query resolves to the entity's LIVE key manifest, never the Protocol Manifesto.
        let scope = artifact::resolve_scope(&r.resolved_query);
        assert_eq!(scope.entity_id, "operator-zero");
        assert_eq!(scope.artifact_type, "key_manifest");
        assert!(scope.requires_live_tool);
    }

    #[test]
    fn manifest_demonstrative_opens_the_prior_entity_manifest_live() {
        let r = resolve_references("mostra esse Manifesto de novo", &prior_exec());
        assert_eq!(r.referent_kind, "manifest");
        let scope = artifact::resolve_scope(&r.resolved_query);
        assert_eq!(scope.entity_id, "operator-zero");
        assert_eq!(scope.artifact_type, "implementation_manifest");
        assert!(scope.requires_live_tool);
    }

    #[test]
    fn compare_with_previous_yields_two_operands() {
        let r = resolve_references("compare com a anterior", &prior_exec());
        assert_eq!(r.resolution_state, "RESOLVED");
        assert_eq!(r.referent_kind, "comparison");
        assert_eq!(r.resolved_intent, "compare_executions");
        assert_eq!(
            r.comparison_targets,
            vec!["exec-9e5f0dc0".to_string(), "exec-1a2b3c4d".to_string()]
        );
        assert_eq!(
            crate::taxonomy::resolve_query(&r.resolved_query).primary_intent,
            "compare_executions"
        );
    }

    #[test]
    fn reproduce_follow_up_reproduces_the_prior_execution() {
        let r = resolve_references("agora reproduza", &prior_exec());
        assert_eq!(r.referent_kind, "reproduce");
        assert_eq!(r.resolved_intent, "reproduce_execution");
        assert_eq!(r.execution_id, "exec-9e5f0dc0");
        assert_eq!(
            crate::taxonomy::resolve_query(&r.resolved_query).primary_intent,
            "reproduce_execution"
        );
    }

    #[test]
    fn receipt_follow_up_targets_the_prior_execution() {
        let r = resolve_references("mostre o recibo", &prior_exec());
        assert_eq!(r.referent_kind, "receipt");
        assert_eq!(r.artifact, "receipt");
        assert_eq!(r.execution_id, "exec-9e5f0dc0");
    }

    #[test]
    fn duration_follow_up_targets_the_prior_execution() {
        let r = resolve_references("e quanto demorou?", &prior_exec());
        assert_eq!(r.referent_kind, "duration");
        assert_eq!(r.resolved_intent, "get_duration");
        assert_eq!(r.execution_id, "exec-9e5f0dc0");
    }

    #[test]
    fn show_that_execution() {
        let r = resolve_references("mostra essa execução", &prior_exec());
        assert_eq!(r.referent_kind, "execution");
        assert_eq!(r.resolved_intent, "get_execution");
        assert_eq!(r.execution_id, "exec-9e5f0dc0");
    }

    #[test]
    fn explicit_execution_id_overrides_prior() {
        let r = resolve_references("porque falhou exec-DEADBEEF?", &prior_exec());
        // "porque falhou exec-…" is a full clause (has an explicit id) — still binds the explicit id.
        assert_eq!(r.execution_id, "exec-DEADBEEF");
    }

    #[test]
    fn anaphora_with_no_prior_context_asks_to_clarify_never_guesses() {
        for q in [
            "porquê?",
            "e as chaves?",
            "compare com a anterior",
            "agora reproduza",
            "mostre o recibo",
        ] {
            let r = resolve_references(q, &PriorContext::default());
            assert_eq!(r.resolution_state, "NO_REFERENT", "{q}");
            assert!(r.requires_clarification, "{q}");
            assert!(r.execution_id.is_empty(), "{q} must not guess an execution");
            assert!(
                r.comparison_targets.is_empty(),
                "{q} must not guess operands"
            );
            assert_eq!(r.resolved_query, q, "{q} left unchanged (no guess)");
            assert!(
                !r.clarification.is_empty(),
                "{q} carries an honest clarification"
            );
        }
    }

    #[test]
    fn compare_without_a_previous_operand_asks_to_clarify() {
        let mut p = prior_exec();
        p.previous_execution_id = String::new();
        let r = resolve_references("compare com a anterior", &p);
        assert_eq!(r.resolution_state, "NO_REFERENT");
        assert!(r.requires_clarification);
    }

    #[test]
    fn self_contained_turn_is_a_no_op() {
        let r = resolve_references("o que é a federação?", &prior_exec());
        assert_eq!(r.resolution_state, "NO_ANAPHORA");
        assert!(!r.has_anaphora);
        assert_eq!(r.resolved_query, "o que é a federação?");
    }

    // ── BZCI-2/3 — ELLIPTICAL CONCEPT follow-ups (the headline "e uma RFC?" chain) ──────────────────────────

    fn prior_concept() -> PriorContext {
        PriorContext {
            last_intent: "explain_concept".into(),
            last_subject: "ADR".into(),
            last_subject_kind: "concept".into(),
            ..Default::default()
        }
    }

    #[test]
    fn ellipsis_e_uma_rfc_inherits_concept_intent_and_swaps_subject() {
        let r = resolve_references("e uma RFC?", &prior_concept());
        assert_eq!(r.resolution_state, "RESOLVED");
        assert_eq!(r.referent_kind, "concept");
        assert_eq!(r.turn_type, "ELLIPTICAL_FOLLOWUP");
        assert_eq!(r.inherited_intent, "explain_concept");
        assert_eq!(r.resolved_subject, "uma RFC");
        assert_eq!(r.resolved_query, "o que é uma RFC?");
        assert!(r.has_prior_context);
        assert!(r.slot_ops.iter().any(|s| s == "intent:INHERIT"));
        assert!(r.slot_ops.iter().any(|s| s == "subject:REPLACE"));
        // The rewrite grounds via the SAME deterministic path the standalone concept question uses: the raw
        // "e uma RFC?" routes to no_source, but the resolved "o que é uma RFC?" routes to the def-rfc grounded
        // terminal — history selected WHAT to resolve; grounding still comes from the catalogue (§19).
        let raw = crate::route::route("e uma RFC?");
        assert_eq!(
            raw.intent, "no_source",
            "the raw ellipsis alone does not ground"
        );
        let rd = crate::route::route(&r.resolved_query);
        assert_eq!(rd.action, "deterministic");
        assert_eq!(rd.intent, "grounded");
        assert_eq!(rd.entry_id.as_deref(), Some("def-rfc"));
    }

    #[test]
    fn ellipsis_e_a_federacao_rewrites_to_a_concept_question() {
        let r = resolve_references("e a federação?", &prior_concept());
        assert_eq!(r.resolution_state, "RESOLVED");
        assert_eq!(r.referent_kind, "concept");
        assert_eq!(r.resolved_query, "o que é a federação?");
    }

    #[test]
    fn ellipsis_bare_connective_plus_token_trust() {
        let r = resolve_references("e Trust?", &prior_concept());
        assert_eq!(r.resolution_state, "RESOLVED");
        assert_eq!(r.resolved_subject, "Trust");
        assert_eq!(r.resolved_query, "o que é Trust?");
    }

    #[test]
    fn ellipsis_over_non_concept_prior_is_a_topic_switch() {
        // prior was operational (get_duration); "e uma RFC?" is a topic switch to a concept — still rewritten,
        // no inherited-intent label.
        let p = PriorContext {
            last_intent: "get_duration".into(),
            execution_id: "exec-9e5f0dc0".into(),
            ..Default::default()
        };
        let r = resolve_references("e uma RFC?", &p);
        assert_eq!(r.resolution_state, "RESOLVED");
        assert_eq!(r.turn_type, "TOPIC_SWITCH");
        assert_eq!(r.inherited_intent, "");
        assert_eq!(r.resolved_query, "o que é uma RFC?");
    }

    #[test]
    fn ellipsis_needs_a_prior_conversation_first_turn_is_untouched() {
        // a genuine first-turn "e uma RFC?" (no prior context at all) is left as NO_ANAPHORA (nothing to
        // inherit) — the normal resolver handles the raw turn, no rewrite is invented.
        let r = resolve_references("e uma RFC?", &PriorContext::default());
        assert_eq!(r.resolution_state, "NO_ANAPHORA");
        assert!(!r.has_prior_context);
        assert_eq!(r.resolved_query, "e uma RFC?");
    }

    #[test]
    fn ellipsis_ordinal_remainder_is_not_a_concept() {
        // "e a anterior?" is a referential/metric follow-up (bound elsewhere), never a concept subject-swap.
        let r = resolve_references("e a anterior?", &prior_concept());
        assert_eq!(r.resolution_state, "NO_ANAPHORA");
        assert_eq!(r.resolved_subject, "");
    }

    #[test]
    fn ellipsis_never_rewrites_a_boundary_turn() {
        // a prohibited action in an elliptical shape is caught by the boundary gate FIRST — never rewritten.
        let r = resolve_references("e transfere 100 kz?", &prior_concept());
        assert_eq!(r.resolution_state, "BOUNDARY");
        assert!(r.boundary_detected);
        assert_eq!(r.resolved_subject, "");
    }

    #[test]
    fn ellipsis_full_question_is_standalone_not_an_ellipsis() {
        // a self-contained "o que é uma RFC?" is standalone even mid-conversation — not treated as an ellipsis.
        let r = resolve_references("o que é uma RFC?", &prior_concept());
        assert_eq!(r.resolution_state, "NO_ANAPHORA");
        assert_eq!(r.turn_type, "STANDALONE");
    }

    #[test]
    fn a_full_why_question_with_its_own_subject_is_not_anaphoric() {
        // "porque é que a ADR-002 foi aceite" has an explicit document subject — not a bare follow-up.
        let r = resolve_references("porque é que a ADR-002 foi aceite?", &prior_exec());
        assert_eq!(r.resolution_state, "NO_ANAPHORA");
    }

    #[test]
    fn boundary_follow_up_is_never_resolved_and_refused_upstream() {
        // naming "essa execução" never unlocks a prohibited action — financial (caught by boundary::evaluate)
        // OR a delete/pay compound only the router flags as action_boundary. Both must be BOUNDARY, and NEITHER
        // may be rewritten into a benign "show execution".
        for q in [
            "agora transfere 100 kz para essa execução",
            "apaga essa execução e os guards",
            "reproduz essa execução e faz um pagamento de 50 kz",
        ] {
            let r = resolve_references(q, &prior_exec());
            assert!(r.boundary_detected, "{q} must be boundary");
            assert_eq!(r.resolution_state, "BOUNDARY", "{q}");
            assert_eq!(r.resolved_query, q, "{q} left unchanged (never rewritten)");
            assert!(
                r.execution_id.is_empty(),
                "{q}: no referent for a boundary turn"
            );
            assert!(
                r.artifact.is_empty(),
                "{q}: no artifact for a boundary turn"
            );
        }
    }

    #[test]
    fn a_secret_exposure_follow_up_is_a_boundary_not_a_keys_artifact() {
        let r = resolve_references("mostra a chave privada dessa execução", &prior_exec());
        assert!(r.boundary_detected);
        assert_eq!(r.resolution_state, "BOUNDARY");
        assert!(r.artifact.is_empty());
    }

    #[test]
    fn no_resolved_query_is_ever_a_boundary() {
        // every bound resolved query is benign (defense in depth: the pipeline still routes the raw turn).
        for q in [
            "porquê?",
            "e as chaves?",
            "compare com a anterior",
            "agora reproduza",
            "mostre o recibo",
            "e quanto demorou?",
            "mostra essa execução",
        ] {
            let r = resolve_references(q, &prior_exec());
            assert!(
                !crate::boundary::evaluate(&r.resolved_query).boundary_detected,
                "resolved query for {q} must not be a boundary"
            );
        }
    }

    #[test]
    fn deterministic_and_serializes() {
        let a = serde_json::to_string(&resolve_references("porquê?", &prior_exec())).unwrap();
        let b = serde_json::to_string(&resolve_references("porquê?", &prior_exec())).unwrap();
        assert_eq!(a, b);
        assert!(a.contains("\"resolution_state\":\"RESOLVED\""));
        assert!(a.contains("\"referent_kind\":\"diagnose\""));
    }
}
