//! M2.18B.3 (PART 12) — the Rust factual validator: the last deterministic gate before a grounded
//! answer is published.
//!
//! It checks the output pass's `GroundedOutput` against the `FactualPackage` it was built from. The
//! grammar already makes invented fact references and out-of-set citations impossible on the local path;
//! this validator re-enforces every property deterministically (defence in depth for any degraded path)
//! and adds the checks a schema cannot express:
//!
//! - unsupported claims: every claim must carry ≥1 fact id, all present in the package (target: 0);
//! - illegal citations: `cited_source_ids` ⊆ `allowed_source_ids` (0);
//! - uncited document identity: an ADR/RFC id named in the prose that is NOT in `allowed_source_ids`
//!   is a wrong-doc-identity / hallucinated cross-reference (0);
//! - internal-source leak: never surface internal governance/secret markers or an authored "Fontes:"
//!   block (sources come only from `cited_source_ids`) (0);
//! - insufficient-evidence coherence: if the model declared insufficient evidence it must not also make
//!   claims or cite sources; if it did NOT, a substantive answer must carry a claim map.
//!
//! Pure + total: no model, no I/O.

use crate::factpack::FactualPackage;
use crate::synth::GroundedOutput;
use serde::{Deserialize, Serialize};

/// Internal markers that must never appear in a public answer (governance/secret/infra). Kept narrow so
/// legitimate canonical paths (e.g. a cited `docs/reference/...`) are not false-positives.
const INTERNAL_MARKERS: &[&str] = &[
    "claude.md",
    "claude_base",
    "id_ed25519",
    "/srv/",
    ".env",
    "password",
    "secret_key",
    "private key",
    "chave privada",
];

/// The per-answer factual verdict. `ok` requires every list empty and no flag set.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct FactualVerdict {
    pub ok: bool,
    /// Claim texts with no supporting fact ids, or a fact id absent from the package.
    pub unsupported_claims: Vec<String>,
    /// Cited source ids outside the package's allowed_source_ids.
    pub illegal_citations: Vec<String>,
    /// ADR/RFC ids named in the answer prose that are not among allowed_source_ids.
    pub uncited_doc_mentions: Vec<String>,
    /// The answer surfaced an internal governance/secret/infra marker.
    pub internal_source_leak: bool,
    /// insufficient_evidence=true yet the answer still made claims or cited sources.
    pub inconsistent_insufficient: bool,
    /// A substantive answer with no claim map (claims empty while asserting content).
    pub answer_without_claim_map: bool,
    /// Human-readable reasons (observability; never shown raw to users).
    pub errors: Vec<String>,
}

/// Extract canonical ADR-nnn / RFC-nnnn ids named anywhere in `text`. Byte-safe (matches only ASCII
/// letters/digits/separators; never slices across a UTF-8 boundary), so Portuguese prose is safe.
fn doc_ids_in(text: &str) -> Vec<String> {
    let b = text.as_bytes();
    let n = b.len();
    let up = |c: u8| c.to_ascii_uppercase();
    let mut out: Vec<String> = Vec::new();
    let mut i = 0usize;
    while i + 3 <= n {
        let three = [up(b[i]), up(b[i + 1]), up(b[i + 2])];
        let kind = if &three == b"ADR" {
            Some("ADR")
        } else if &three == b"RFC" {
            Some("RFC")
        } else {
            None
        };
        if let Some(k) = kind {
            let mut j = i + 3;
            while j < n && (b[j] == b'-' || b[j] == b' ') {
                j += 1;
            }
            let start = j;
            while j < n && b[j].is_ascii_digit() {
                j += 1;
            }
            if j > start {
                let num: u32 = std::str::from_utf8(&b[start..j])
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0);
                if num > 0 {
                    let id = if k == "RFC" {
                        format!("RFC-{num:04}")
                    } else {
                        format!("ADR-{num:03}")
                    };
                    if !out.contains(&id) {
                        out.push(id);
                    }
                }
                i = j;
                continue;
            }
        }
        i += 1;
    }
    out
}

/// Validate a grounded output against the factual package it was built from.
pub fn validate_output(pkg: &FactualPackage, out: &GroundedOutput) -> FactualVerdict {
    let mut errors: Vec<String> = Vec::new();
    let fact_ids: std::collections::BTreeSet<&str> =
        pkg.facts.iter().map(|f| f.id.as_str()).collect();
    let allowed: std::collections::BTreeSet<&str> =
        pkg.allowed_source_ids.iter().map(|s| s.as_str()).collect();

    // 1. unsupported claims — every claim needs ≥1 fact id, all present in the package.
    let mut unsupported: Vec<String> = Vec::new();
    for c in &out.claims {
        if c.fact_ids.is_empty() {
            unsupported.push(c.claim.clone());
            errors.push(format!("claim without fact_ids: {:?}", c.claim));
        } else if let Some(bad) = c.fact_ids.iter().find(|id| !fact_ids.contains(id.as_str())) {
            unsupported.push(c.claim.clone());
            errors.push(format!("claim cites unknown fact {bad}: {:?}", c.claim));
        }
    }

    // 2. illegal citations — cited_source_ids ⊆ allowed_source_ids.
    let mut illegal: Vec<String> = Vec::new();
    for s in &out.cited_source_ids {
        if !allowed.contains(s.as_str()) {
            illegal.push(s.clone());
            errors.push(format!("citation outside allowed set: {s}"));
        }
    }

    // 3. uncited document identity — an ADR/RFC id in prose that is a FABRICATION: neither an allowed
    // source NOR present in the provided facts' own text. M2.18B.7 (fallback fix): a doc id that appears
    // in a fact's text is GROUNDED — e.g. an answer faithfully relaying a related ADR id named in a
    // source's own "See also" / supersession line — so it is legitimate to name it; only an id that appears
    // NOWHERE in the package (a true hallucinated identity) is flagged. This makes the anti-hallucination
    // rule precise, not weaker.
    let grounded_doc_ids: std::collections::BTreeSet<String> =
        pkg.facts.iter().flat_map(|f| doc_ids_in(&f.text)).collect();
    let mut uncited: Vec<String> = Vec::new();
    for id in doc_ids_in(&out.answer_markdown) {
        if !allowed.contains(id.as_str()) && !grounded_doc_ids.contains(&id) {
            uncited.push(id.clone());
            errors.push(format!("answer names {id}, not in allowed sources"));
        }
    }

    // 4. internal-source leak.
    let hay = out.answer_markdown.to_lowercase();
    let mut internal_leak = INTERNAL_MARKERS.iter().any(|m| hay.contains(m));
    if hay.contains("fonte:") || hay.contains("fontes:") {
        internal_leak = true;
        errors.push("answer embeds an authored Fontes: block".into());
    }
    if internal_leak && errors.iter().all(|e| !e.contains("Fontes:")) {
        errors.push("answer surfaced an internal source marker".into());
    }

    // 5. insufficient-evidence coherence.
    let inconsistent_insufficient =
        out.insufficient_evidence && (!out.claims.is_empty() || !out.cited_source_ids.is_empty());
    if inconsistent_insufficient {
        errors.push("insufficient_evidence=true but the answer still claims/cites".into());
    }

    // 6. a substantive answer must carry a claim map (unless it declared insufficiency).
    let substantive = out.answer_markdown.trim().chars().count() > 40;
    let answer_without_claim_map =
        !out.insufficient_evidence && substantive && out.claims.is_empty();
    if answer_without_claim_map {
        errors.push("substantive answer with an empty claim map".into());
    }

    let ok = unsupported.is_empty()
        && illegal.is_empty()
        && uncited.is_empty()
        && !internal_leak
        && !inconsistent_insufficient
        && !answer_without_claim_map;

    FactualVerdict {
        ok,
        unsupported_claims: unsupported,
        illegal_citations: illegal,
        uncited_doc_mentions: uncited,
        internal_source_leak: internal_leak,
        inconsistent_insufficient,
        answer_without_claim_map,
        errors,
    }
}

// ─────────────────────────── Increment 4 (§8/§9) — the claim taxonomy + verifier ───────────────────────
//
// The 5-category claim taxonomy and the claim + citation verifier that runs on the COMPOSED answer BEFORE
// it is returned — for the documentary trunk AND the operational/telemetry path, uniformly. It REUSES this
// module's structural validator (`validate_output`) as the base and ADDS: the 5-category classification, the
// ESTIMATED/HYPOTHETICAL labelling rule, the DERIVED-calculation exposure rule, the causality rule, the
// BZO-9 single-observation-vs-average rule, and a citation verifier over documentary + live + tool sources.
//
// Golden rule (never weakened): an UNSUPPORTED claim, an unlabelled ESTIMATED/HYPOTHETICAL claim, an
// underived DERIVED calculation, unsupported causality, a single observation dressed as an average, or a
// dead citation ⇒ `ok=false` ⇒ the pipeline serves the deterministic template / contextual fallback and
// NEVER publishes the answer. Pure + total: no model, no I/O.

/// §8 — the five claim categories.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum ClaimCategory {
    Supported,
    Derived,
    Estimated,
    Hypothetical,
    Unsupported,
}

impl ClaimCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            ClaimCategory::Supported => "SUPPORTED",
            ClaimCategory::Derived => "DERIVED",
            ClaimCategory::Estimated => "ESTIMATED",
            ClaimCategory::Hypothetical => "HYPOTHETICAL",
            ClaimCategory::Unsupported => "UNSUPPORTED",
        }
    }
    fn from_declared(s: &str) -> Option<ClaimCategory> {
        match s.to_ascii_uppercase().as_str() {
            "SUPPORTED" => Some(ClaimCategory::Supported),
            "DERIVED" => Some(ClaimCategory::Derived),
            "ESTIMATED" => Some(ClaimCategory::Estimated),
            "HYPOTHETICAL" => Some(ClaimCategory::Hypothetical),
            "UNSUPPORTED" => Some(ClaimCategory::Unsupported),
            _ => None,
        }
    }
}

// Accent-free markers (matched on the normalized claim/answer). Kept distinctive so a common word never
// mis-classifies a grounded claim.
const ESTIMATE_MARKERS: &[&str] = &[
    "estimativa",
    "estimado",
    "estimada",
    "estima-se",
    "aproximadamente",
    "cerca de",
    "por volta de",
    "estimated",
    "approximately",
    "roughly",
];
const HYPOTHESIS_MARKERS: &[&str] = &[
    "hipotetic",
    "hipotese",
    "ilustrativo",
    "exemplo ilustrativo",
    "a titulo de exemplo",
    "supondo",
    "suponha",
    "assumindo",
    "hypothetical",
    "for illustration",
    "would be",
];
const CALC_MARKERS: &[&str] = &[
    "media",
    "mediana",
    "percentil",
    "p95",
    "p99",
    "average",
    "median",
    "por etapa",
    "per_step",
    "em media",
];
// AVERAGE markers only (a median/p95 is representative of a distribution; an AVERAGE of one observation is
// the BZO-9 defect the rule blocks).
const AVERAGE_MARKERS: &[&str] = &["media", "em media", "average", "avg"];
const CAUSAL_MARKERS: &[&str] = &[
    "porque",
    "por que",
    "porqu",
    "causa",
    "causou",
    "resulta em",
    "resultou em",
    "leva a",
    "levou a",
    "devido a",
    "deve-se a",
    "because",
    "causes",
    "caused",
    "due to",
    "leads to",
    "results in",
];

fn has_marker(hay_norm: &str, markers: &[&str]) -> bool {
    markers.iter().any(|m| hay_norm.contains(m))
}

/// One input claim to verify. May carry a `category` (the operational/telemetry path declares it) or not
/// (the documentary trunk, where the category is derived from grounding + markers).
#[derive(Debug, Clone, Deserialize, Default, PartialEq)]
pub struct VerifClaim {
    pub claim: String,
    #[serde(default)]
    pub fact_ids: Vec<String>,
    #[serde(default)]
    pub category: Option<String>,
}

/// The composed answer to verify: prose + the claim map + the citations. A superset-compatible subset of
/// [`GroundedOutput`] (extra fields like `insufficient_evidence` are ignored), so both the documentary and
/// the operational path feed the SAME verifier.
#[derive(Debug, Clone, Deserialize, Default, PartialEq)]
pub struct VerifInput {
    #[serde(default)]
    pub answer_markdown: String,
    #[serde(default)]
    pub claims: Vec<VerifClaim>,
    #[serde(default)]
    pub cited_source_ids: Vec<String>,
}

/// One claim after classification + per-claim checks.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct ClassifiedClaim {
    pub claim: String,
    /// The claim category wire form (SUPPORTED | DERIVED | ESTIMATED | HYPOTHETICAL | UNSUPPORTED).
    pub category: String,
    pub fact_ids: Vec<String>,
    /// For ESTIMATED/HYPOTHETICAL: is the claim labelled as such in the answer?
    pub labelled: bool,
    /// For DERIVED: does the package expose the calculation (data/formula/method/filters/period/sample)?
    pub derivation_exposed: bool,
    /// Whether the claim asserts causality.
    pub causal: bool,
}

/// The claim + citation verdict. `ok` requires every rejecting list empty.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct ClaimVerdict {
    pub ok: bool,
    pub classified: Vec<ClassifiedClaim>,
    /// Claims with no grounding at all (never reach the answer).
    pub unsupported_claims: Vec<String>,
    /// ESTIMATED claims not labelled as an estimate in the answer.
    pub unlabelled_estimates: Vec<String>,
    /// HYPOTHETICAL claims not labelled as hypothetical/illustrative in the answer.
    pub unlabelled_hypotheticals: Vec<String>,
    /// DERIVED calculations whose derivation the package does not expose.
    pub underived_calculations: Vec<String>,
    /// Causal claims that are not SUPPORTED/DERIVED (causality only when supported).
    pub unsupported_causality: Vec<String>,
    /// A single observation presented as a general average (BZO-9).
    pub single_observation_as_average: Vec<String>,
    /// Citations that resolve to no source in the package (documentary/live/tool).
    pub dead_citations: Vec<String>,
    pub errors: Vec<String>,
}

/// The closed set of ids a citation may resolve to: documentary sources (`allowed_source_ids` + each fact's
/// document id) ∪ live sources ∪ tool-result source ids. §9: a citation outside this set is a dead/invented
/// citation.
fn citeable_ids(pkg: &FactualPackage) -> std::collections::BTreeSet<String> {
    let mut set: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
    for id in &pkg.allowed_source_ids {
        set.insert(id.clone());
    }
    for f in &pkg.facts {
        set.insert(f.source.document_id.clone());
    }
    for s in &pkg.live_sources {
        set.insert(s.id.clone());
    }
    for t in &pkg.tool_results {
        set.insert(t.source_id.clone());
    }
    set
}

/// Does the package expose a DERIVED calculation for `claim` (or at least one fully-exposed calc)? A DERIVED
/// claim without an exposed calculation is not publishable (§8).
fn derivation_exposed_for(pkg: &FactualPackage, claim: &str) -> bool {
    if pkg.calculations.is_empty() {
        return false;
    }
    // Prefer a calc whose `claim` matches; else accept any fully-exposed calc (the package computed it).
    if let Some(c) = pkg.calculations.iter().find(|c| c.claim == claim) {
        return c.exposes_derivation();
    }
    pkg.calculations.iter().any(|c| c.exposes_derivation())
}

/// §8 — classify + verify every claim in the composed answer against the package, and verify every citation
/// resolves to a real source in the package (§9). REUSES the module's fact-id/citeable logic. No model.
pub fn classify_and_verify(pkg: &FactualPackage, input: &VerifInput) -> ClaimVerdict {
    let fact_ids: std::collections::BTreeSet<&str> =
        pkg.facts.iter().map(|f| f.id.as_str()).collect();
    let answer_norm = crate::normalize(&input.answer_markdown);
    let citeable = citeable_ids(pkg);

    let mut classified: Vec<ClassifiedClaim> = Vec::new();
    let mut unsupported_claims: Vec<String> = Vec::new();
    let mut unlabelled_estimates: Vec<String> = Vec::new();
    let mut unlabelled_hypotheticals: Vec<String> = Vec::new();
    let mut underived_calculations: Vec<String> = Vec::new();
    let mut unsupported_causality: Vec<String> = Vec::new();
    let mut single_observation_as_average: Vec<String> = Vec::new();
    let mut errors: Vec<String> = Vec::new();

    for vc in &input.claims {
        let claim_norm = crate::normalize(&vc.claim);
        let facts_present =
            !vc.fact_ids.is_empty() && vc.fact_ids.iter().all(|id| fact_ids.contains(id.as_str()));
        let has_bad_fact = vc.fact_ids.iter().any(|id| !fact_ids.contains(id.as_str()));
        let causal = has_marker(&claim_norm, CAUSAL_MARKERS);

        // Category: a declared category (operational path) is trusted but still verified for consistency;
        // otherwise it is derived from grounding + markers (documentary path).
        let category = match vc
            .category
            .as_deref()
            .and_then(ClaimCategory::from_declared)
        {
            Some(c) => c,
            None => {
                if has_bad_fact {
                    // Cites a fact id absent from the package → a hallucinated reference.
                    ClaimCategory::Unsupported
                } else if facts_present {
                    // A grounded claim is SUPPORTED; it is DERIVED only when the ENGINE computed a value
                    // (a calc marker AND the package actually exposes a calculation).
                    if has_marker(&claim_norm, CALC_MARKERS) && !pkg.calculations.is_empty() {
                        ClaimCategory::Derived
                    } else {
                        ClaimCategory::Supported
                    }
                } else if has_marker(&claim_norm, HYPOTHESIS_MARKERS) {
                    ClaimCategory::Hypothetical
                } else if has_marker(&claim_norm, ESTIMATE_MARKERS) {
                    ClaimCategory::Estimated
                } else {
                    // No grounding, no estimate/hypothesis marker → unsupported.
                    ClaimCategory::Unsupported
                }
            }
        };

        // Per-claim labelling / exposure checks.
        let est_labelled = has_marker(&answer_norm, ESTIMATE_MARKERS);
        let hyp_labelled = has_marker(&answer_norm, HYPOTHESIS_MARKERS);
        let derivation_exposed = derivation_exposed_for(pkg, &vc.claim);
        let labelled = match category {
            ClaimCategory::Estimated => est_labelled,
            ClaimCategory::Hypothetical => hyp_labelled,
            _ => true,
        };

        match category {
            ClaimCategory::Unsupported => unsupported_claims.push(vc.claim.clone()),
            ClaimCategory::Estimated if !est_labelled => {
                unlabelled_estimates.push(vc.claim.clone())
            }
            ClaimCategory::Hypothetical if !hyp_labelled => {
                unlabelled_hypotheticals.push(vc.claim.clone())
            }
            ClaimCategory::Derived if !derivation_exposed => {
                underived_calculations.push(vc.claim.clone())
            }
            _ => {}
        }

        // Causality only when supported: a causal claim must be SUPPORTED or DERIVED (grounded).
        if causal
            && !matches!(category, ClaimCategory::Supported | ClaimCategory::Derived)
            && !unsupported_claims.contains(&vc.claim)
        {
            unsupported_causality.push(vc.claim.clone());
        }

        // BZO-9 — a DERIVED average over a single observation must never be presented as a general average.
        // A median/p95 is a representative order statistic, not an average, and "median" trivially contains
        // the "media" substring — so exclude those explicitly (only a genuine mean is at issue here).
        let is_average_claim = has_marker(&claim_norm, AVERAGE_MARKERS)
            && !claim_norm.contains("median")
            && !claim_norm.contains("mediana")
            && !claim_norm.contains("percentil")
            && !claim_norm.contains("p95");
        if matches!(category, ClaimCategory::Derived) && is_average_claim && pkg.sample_size < 2 {
            single_observation_as_average.push(vc.claim.clone());
        }

        classified.push(ClassifiedClaim {
            claim: vc.claim.clone(),
            category: category.as_str().to_string(),
            fact_ids: vc.fact_ids.clone(),
            labelled,
            derivation_exposed,
            causal,
        });
    }

    // §9 — citation verification: every cited id resolves to a real source in the package.
    let mut dead_citations: Vec<String> = Vec::new();
    for cid in &input.cited_source_ids {
        if !citeable.contains(cid) {
            dead_citations.push(cid.clone());
            errors.push(format!(
                "citation resolves to no source in the package: {cid}"
            ));
        }
    }

    for c in &unsupported_claims {
        errors.push(format!("unsupported claim reached the answer: {c:?}"));
    }
    for c in &unlabelled_estimates {
        errors.push(format!("estimated claim not labelled: {c:?}"));
    }
    for c in &unlabelled_hypotheticals {
        errors.push(format!("hypothetical claim not labelled: {c:?}"));
    }
    for c in &underived_calculations {
        errors.push(format!(
            "derived claim does not expose its calculation: {c:?}"
        ));
    }
    for c in &unsupported_causality {
        errors.push(format!("causality asserted without support: {c:?}"));
    }
    for c in &single_observation_as_average {
        errors.push(format!(
            "single observation presented as a general average: {c:?}"
        ));
    }

    let ok = unsupported_claims.is_empty()
        && unlabelled_estimates.is_empty()
        && unlabelled_hypotheticals.is_empty()
        && underived_calculations.is_empty()
        && unsupported_causality.is_empty()
        && single_observation_as_average.is_empty()
        && dead_citations.is_empty();

    ClaimVerdict {
        ok,
        classified,
        unsupported_claims,
        unlabelled_estimates,
        unlabelled_hypotheticals,
        underived_calculations,
        unsupported_causality,
        single_observation_as_average,
        dead_citations,
        errors,
    }
}

/// Convenience: verify a [`GroundedOutput`] (the documentary trunk's model output) directly.
pub fn verify_grounded_output(pkg: &FactualPackage, out: &GroundedOutput) -> ClaimVerdict {
    let input = VerifInput {
        answer_markdown: out.answer_markdown.clone(),
        claims: out
            .claims
            .iter()
            .map(|c| VerifClaim {
                claim: c.claim.clone(),
                fact_ids: c.fact_ids.clone(),
                category: None,
            })
            .collect(),
        cited_source_ids: out.cited_source_ids.clone(),
    };
    classify_and_verify(pkg, &input)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::factpack::build_factual_package_planned;
    use crate::synth::{Claim, GroundedOutput};

    fn pkg() -> FactualPackage {
        build_factual_package_planned(
            "t",
            "explica a ADR-002 sobre a inversao de nomes",
            "ADR-002",
            "brief",
        )
    }

    fn good() -> GroundedOutput {
        GroundedOutput {
            answer_markdown: "A ADR-002 inverte a nomenclatura do ecossistema de forma canónica."
                .into(),
            claims: vec![Claim {
                claim: "inverte a nomenclatura".into(),
                fact_ids: vec!["F1".into()],
            }],
            cited_source_ids: vec!["ADR-002".into()],
            insufficient_evidence: false,
        }
    }

    #[test]
    fn a_well_grounded_answer_passes() {
        assert!(validate_output(&pkg(), &good()).ok);
    }

    #[test]
    fn claim_without_fact_ids_is_unsupported() {
        let mut o = good();
        o.claims[0].fact_ids.clear();
        let v = validate_output(&pkg(), &o);
        assert!(!v.ok);
        assert_eq!(v.unsupported_claims.len(), 1);
    }

    #[test]
    fn claim_citing_unknown_fact_is_unsupported() {
        let mut o = good();
        o.claims[0].fact_ids = vec!["F99".into()];
        assert!(!validate_output(&pkg(), &o).ok);
    }

    #[test]
    fn citation_outside_allowed_is_illegal() {
        let mut o = good();
        o.cited_source_ids = vec!["ADR-021".into()];
        let v = validate_output(&pkg(), &o);
        assert!(!v.ok);
        assert_eq!(v.illegal_citations, vec!["ADR-021".to_string()]);
    }

    #[test]
    fn wrong_doc_identity_in_prose_is_flagged() {
        let mut o = good();
        o.answer_markdown =
            "Na verdade a ADR-021 trata da nomenclatura do ecossistema aqui.".into();
        let v = validate_output(&pkg(), &o);
        assert!(!v.ok);
        assert!(v.uncited_doc_mentions.contains(&"ADR-021".to_string()));
    }

    #[test]
    fn internal_marker_leak_is_flagged() {
        let mut o = good();
        o.answer_markdown =
            "Consulta o CLAUDE.md para a regra completa do ecossistema aqui.".into();
        assert!(validate_output(&pkg(), &o).internal_source_leak);
    }

    #[test]
    fn authored_fontes_block_is_flagged() {
        let mut o = good();
        o.answer_markdown = "A ADR-002 inverte a nomenclatura.\n\nFontes: ADR-002".into();
        assert!(!validate_output(&pkg(), &o).ok);
    }

    #[test]
    fn insufficient_evidence_must_not_claim() {
        let mut o = good();
        o.insufficient_evidence = true;
        assert!(validate_output(&pkg(), &o).inconsistent_insufficient);
    }

    #[test]
    fn substantive_answer_needs_a_claim_map() {
        let mut o = good();
        o.claims.clear();
        assert!(validate_output(&pkg(), &o).answer_without_claim_map);
    }

    #[test]
    fn honest_insufficient_answer_passes() {
        let o = GroundedOutput {
            answer_markdown: "Não há base documental suficiente para responder.".into(),
            claims: vec![],
            cited_source_ids: vec![],
            insufficient_evidence: true,
        };
        assert!(validate_output(&pkg(), &o).ok);
    }

    // ─────────── Increment 4 (§8/§9) — the 5-category claim taxonomy + claim/citation verifier ───────────

    fn op_pkg() -> FactualPackage {
        let duration = r#"{"measure_type":"mediana","comparable_runs":3,"profile":"L0","environment":"sandbox","protocol_version":"1.0.0","implementation_id":"operator-zero-ref-impl","median_ms":12800,"observed_from":"2026-08-01","observed_to":"2026-08-05","aggregation_method":"median","percentile_method":"percentile_cont — linear"}"#;
        let claims = r#"[{"claim":"latest_observed_total","category":"SUPPORTED","value_ms":13200},{"claim":"median_total","category":"DERIVED","value_ms":12800}]"#;
        let sources = r#"[{"id":"telemetry:operator-zero-ref-impl:L0:sandbox:1.0.0","title":"Telemetria","path":"/banzai/validate/executions"}]"#;
        crate::factpack::build_operational_package(
            "t",
            "Quanto tempo leva uma jornada completa de validação?",
            duration,
            claims,
            sources,
        )
    }

    #[test]
    fn classifier_assigns_the_five_categories() {
        let p = pkg(); // documentary package: F1.. facts, ADR-002 allowed, no calculations
        let cat = |claim: &str, fact_ids: Vec<&str>| {
            let v = classify_and_verify(
                &p,
                &VerifInput {
                    answer_markdown: format!("prefix {claim} suffix"),
                    claims: vec![VerifClaim {
                        claim: claim.into(),
                        fact_ids: fact_ids.into_iter().map(String::from).collect(),
                        category: None,
                    }],
                    cited_source_ids: vec![],
                },
            );
            v.classified[0].category.clone()
        };
        // grounded, no calc marker → SUPPORTED
        assert_eq!(cat("inverte a nomenclatura", vec!["F1"]), "SUPPORTED");
        // ungrounded with an estimate marker → ESTIMATED
        assert_eq!(
            cat("a duracao e aproximadamente rapida", vec![]),
            "ESTIMATED"
        );
        // ungrounded with a hypothesis marker → HYPOTHETICAL
        assert_eq!(
            cat("a titulo de exemplo ilustrativo um operador federa", vec![]),
            "HYPOTHETICAL"
        );
        // ungrounded, no marker → UNSUPPORTED
        assert_eq!(
            cat("o protocolo garante lucro certo", vec![]),
            "UNSUPPORTED"
        );
        // a claim citing a non-existent fact id → UNSUPPORTED
        assert_eq!(cat("inverte a nomenclatura", vec!["F99"]), "UNSUPPORTED");
        // operational DERIVED (declared) over a package that exposes the calc → DERIVED
        let op = op_pkg();
        let vo = classify_and_verify(
            &op,
            &VerifInput {
                answer_markdown: "a mediana foi 12.8 s".into(),
                claims: vec![VerifClaim {
                    claim: "median_total".into(),
                    fact_ids: vec![],
                    category: Some("DERIVED".into()),
                }],
                cited_source_ids: vec![],
            },
        );
        assert_eq!(vo.classified[0].category, "DERIVED");
    }

    #[test]
    fn unsupported_claim_is_rejected_and_never_returned() {
        let v = classify_and_verify(
            &pkg(),
            &VerifInput {
                answer_markdown: "o protocolo garante retorno garantido".into(),
                claims: vec![VerifClaim {
                    claim: "garante retorno garantido".into(),
                    fact_ids: vec![],
                    category: None,
                }],
                cited_source_ids: vec![],
            },
        );
        assert!(!v.ok, "an unsupported claim must reject the answer");
        assert_eq!(v.unsupported_claims.len(), 1);
    }

    #[test]
    fn estimated_and_hypothetical_must_be_labelled() {
        let p = pkg();
        // ESTIMATED, but the answer does NOT carry an estimate label → reject.
        let unlabelled = classify_and_verify(
            &p,
            &VerifInput {
                answer_markdown: "a duracao e rapida".into(),
                claims: vec![VerifClaim {
                    claim: "a duracao e aproximadamente rapida".into(),
                    fact_ids: vec![],
                    category: Some("ESTIMATED".into()),
                }],
                cited_source_ids: vec![],
            },
        );
        assert!(!unlabelled.ok);
        assert_eq!(unlabelled.unlabelled_estimates.len(), 1);
        // ESTIMATED, and the answer LABELS it as an estimate → ok.
        let labelled = classify_and_verify(
            &p,
            &VerifInput {
                answer_markdown: "a duracao e aproximadamente rapida (estimativa)".into(),
                claims: vec![VerifClaim {
                    claim: "a duracao e aproximadamente rapida".into(),
                    fact_ids: vec![],
                    category: Some("ESTIMATED".into()),
                }],
                cited_source_ids: vec![],
            },
        );
        assert!(labelled.ok, "a labelled estimate passes: {labelled:?}");
        assert!(labelled.classified[0].labelled);
        // HYPOTHETICAL unlabelled → reject.
        let hyp = classify_and_verify(
            &p,
            &VerifInput {
                answer_markdown: "um operador federa outro".into(),
                claims: vec![VerifClaim {
                    claim: "um operador federa outro".into(),
                    fact_ids: vec![],
                    category: Some("HYPOTHETICAL".into()),
                }],
                cited_source_ids: vec![],
            },
        );
        assert!(!hyp.ok);
        assert_eq!(hyp.unlabelled_hypotheticals.len(), 1);
    }

    #[test]
    fn causality_only_when_supported() {
        let v = classify_and_verify(
            &pkg(),
            &VerifInput {
                answer_markdown: "isto acontece porque o mercado sobe".into(),
                claims: vec![VerifClaim {
                    claim: "acontece porque o mercado sobe".into(),
                    fact_ids: vec![],
                    category: None,
                }],
                cited_source_ids: vec![],
            },
        );
        assert!(!v.ok, "unsupported causality must reject");
        assert!(
            !v.unsupported_causality.is_empty() || !v.unsupported_claims.is_empty(),
            "flagged as unsupported causality"
        );
    }

    #[test]
    fn a_citation_not_in_the_package_is_rejected() {
        let mut input = VerifInput {
            answer_markdown: "A ADR-002 inverte a nomenclatura.".into(),
            claims: vec![VerifClaim {
                claim: "inverte a nomenclatura".into(),
                fact_ids: vec!["F1".into()],
                category: None,
            }],
            cited_source_ids: vec!["ADR-002".into()],
        };
        assert!(
            classify_and_verify(&pkg(), &input).ok,
            "the real citation passes"
        );
        // A citation that resolves to no package source → reject.
        input.cited_source_ids = vec!["ADR-021".into()];
        let v = classify_and_verify(&pkg(), &input);
        assert!(!v.ok);
        assert_eq!(v.dead_citations, vec!["ADR-021".to_string()]);
    }

    #[test]
    fn derived_metric_claim_exposes_full_derivation() {
        let op = op_pkg();
        // the DERIVED median claim, cited to the telemetry source, over an exposed calculation → ok.
        let v = classify_and_verify(
            &op,
            &VerifInput {
                answer_markdown: "a mediana das execucoes comparaveis foi 12.8 s".into(),
                claims: vec![VerifClaim {
                    claim: "median_total".into(),
                    fact_ids: vec![],
                    category: Some("DERIVED".into()),
                }],
                cited_source_ids: vec!["telemetry:operator-zero-ref-impl:L0:sandbox:1.0.0".into()],
            },
        );
        assert!(v.ok, "exposed DERIVED calc + real citation passes: {v:?}");
        assert!(v.classified[0].derivation_exposed);
        // the package's calculation carries every required field.
        let c = &op.calculations[0];
        assert!(!c.data.is_empty());
        assert!(!c.formula.is_empty());
        assert!(!c.method.is_empty());
        assert!(!c.filters.is_empty());
        assert!(!c.period.is_empty());
        assert!(c.sample_size >= 1);
        // A DERIVED claim with NO exposed calculation (documentary package) → reject.
        let bad = classify_and_verify(
            &pkg(),
            &VerifInput {
                answer_markdown: "a mediana foi X".into(),
                claims: vec![VerifClaim {
                    claim: "median_total".into(),
                    fact_ids: vec![],
                    category: Some("DERIVED".into()),
                }],
                cited_source_ids: vec![],
            },
        );
        assert!(!bad.ok);
        assert_eq!(bad.underived_calculations.len(), 1);
    }

    #[test]
    fn single_observation_is_never_an_average() {
        // an operational package with sample_size 1 and a DERIVED "average" claim → BZO-9 rejection.
        let duration = r#"{"measure_type":"observação","comparable_runs":1,"profile":"L0","environment":"sandbox","protocol_version":"1.0.0","implementation_id":"impl","observed_from":"2026-08-05","observed_to":"2026-08-05","aggregation_method":"average","percentile_method":"n/a"}"#;
        let claims = r#"[{"claim":"average_total","category":"DERIVED","value_ms":100}]"#;
        let sources = r#"[{"id":"telemetry:impl:L0:sandbox:1.0.0","title":"T","path":"/x"}]"#;
        let p = crate::factpack::build_operational_package(
            "t",
            "media da jornada de validação",
            duration,
            claims,
            sources,
        );
        assert_eq!(p.sample_size, 1);
        let v = classify_and_verify(
            &p,
            &VerifInput {
                answer_markdown: "a media foi 100 ms".into(),
                claims: vec![VerifClaim {
                    claim: "average media do total".into(),
                    fact_ids: vec![],
                    category: Some("DERIVED".into()),
                }],
                cited_source_ids: vec!["telemetry:impl:L0:sandbox:1.0.0".into()],
            },
        );
        assert!(
            !v.ok,
            "a single observation dressed as an average must reject"
        );
        assert_eq!(v.single_observation_as_average.len(), 1);
    }

    #[test]
    fn a_well_grounded_documentary_answer_passes_the_claim_verifier() {
        assert!(verify_grounded_output(&pkg(), &good()).ok);
    }
}
