//! M2.18B.5 — deterministic typo tolerance, intent recovery and safe clarification.
//!
//! This module is the SINGLE Rust authority for spelling variation. It runs AFTER `crate::normalize`
//! (which already folds case, accents, homoglyphs, zero-width chars and de-leets), and BEFORE the router's
//! final classification. It never calls a model, never invents an entity, and never lowers the factual
//! validator. Its job is narrow and conservative:
//!
//!   * correct a token to a CANONICAL form only when there is a SINGLE clearly dominant candidate;
//!   * when two candidates are plausibly close, ask for CLARIFICATION instead of guessing;
//!   * when nothing is close enough, leave the token untouched (the downstream resolves or declines).
//!
//! Phase principle: *Rust may correct a probable form, but must never feign certainty when several
//! interpretations are plausible.* The canonical vocabulary is DERIVED from the existing alias tables
//! (`concept::concept_entries` + `catalogue::alias_entries`) plus a small curated accent-display map and a
//! danger lexicon — there is NO second alias list. Corrections toward danger words only ever make the
//! boundary MORE likely to fire (a misspelled prohibited action keeps its verbal intent — §19).
//!
//! Resolution order (§6): exact id → exact/normalized alias (downstream) → fuzzy candidate (here) →
//! clarification → insufficient. Fuzzy NEVER overtakes an exact match: `recover` only proposes a
//! correction for a token that is not already an exact vocabulary member, and the router applies the
//! correction to a COPY of the query, re-running the exact resolvers on the corrected text.

use crate::normalize;
use serde::Serialize;
use std::sync::OnceLock;

/// A canonical vocabulary word the recovery layer may correct a typo TOWARDS.
#[derive(Clone)]
struct Vocab {
    /// normalized (accent-free, lowercase) token — the fuzzy-match target.
    norm: String,
    /// human display form (accented where applicable) — shown discreetly in the UI.
    display: String,
    /// concept words are correctable and shown as "Interpretado como …"; danger words are corrected only
    /// so the boundary detector fires on the corrected text (never shown as a helpful interpretation).
    danger: bool,
}

/// Curated accent-restore map for the high-traffic single-word concepts, so a correction is shown with its
/// natural spelling ("federação", not "federacao"). Accent-free key → accented display. Small + reviewed;
/// a token not present here displays as-is (still correct, just unaccented).
const ACCENT_DISPLAY: &[(&str, &str)] = &[
    ("federacao", "federação"),
    ("revogacao", "revogação"),
    ("governanca", "governança"),
    ("confianca", "confiança"),
    ("conformidade", "conformidade"),
    ("evidencia", "evidência"),
    ("interoperabilidade", "interoperabilidade"),
    ("idempotencia", "idempotência"),
    ("manifesto", "manifesto"),
    ("operador", "operador"),
    ("protocolo", "protocolo"),
    ("nomenclatura", "nomenclatura"),
    ("certificacao", "certificação"),
    ("revisao", "revisão"),
    ("identidade", "identidade"),
    ("pagamento", "pagamento"),
    ("carteira", "carteira"),
    ("inferencia", "inferência"),
    ("invariante", "invariante"),
    ("separacao", "separação"),
    ("ecossistema", "ecossistema"),
];

/// Danger lexicon — the canonical spellings of prohibited-action verbs and secret nouns. A misspelling of
/// any of these is corrected TOWARDS the canonical danger word so the route.rs boundary detector (run on
/// the corrected text) still refuses. Adding a word here can only strengthen the boundary, never weaken it.
const DANGER_WORDS: &[&str] = &[
    "certifica",
    "certificar",
    "certificacao",
    "aprova",
    "aprovar",
    "aprovacao",
    "publica",
    "publicar",
    "publicacao",
    "movimenta",
    "movimentar",
    "transfere",
    "transferir",
    "levanta",
    "levantar",
    "deposita",
    "depositar",
    "chave",
    "privada",
    "fundos",
    "credencial",
    "credenciais",
    "senha",
    "password",
    "segredo",
    "ignora",
    "ignorar",
    "fontes",
    "prompt",
    "instrucoes",
    "instrucao",
    "sistema",
];

/// The three ecosystem identities (ADR-001): BANZA (the protocol), BanzAI (the agent) and Banzami (the
/// organization). They are mutually one edit apart, yet each is a REAL, distinct canonical name — so the
/// recovery layer must treat ALL THREE as canonical (exact → passthrough) and NEVER silently rewrite one
/// into another. Without this, the question "o que é o Banzami?" (the organization) was corrected to the
/// one-edit-away "banzai" (the agent) and answered with the BanzAI-AGENT definition — exactly the
/// institutional-identity confusion ADR-001 and CLAUDE.md forbid. Note that "banzami" is not in the alias
/// tables (its answer is a route-level critical entry), so it is enumerated here alongside the other two to
/// make the protection explicit and symmetric.
const ECOSYSTEM_ENTITIES: &[&str] = &["banza", "banzai", "banzami"];

fn display_for(norm: &str) -> String {
    ACCENT_DISPLAY
        .iter()
        .find(|(k, _)| *k == norm)
        .map(|(_, d)| d.to_string())
        .unwrap_or_else(|| norm.to_string())
}

/// Build the canonical vocabulary ONCE, derived from the existing alias tables + danger lexicon. Only
/// DISTINCTIVE tokens (≥ 5 chars, alphabetic) become fuzzy targets — short tokens (ids, articles, "trust",
/// "qr") are too collision-prone to correct by edit distance and are handled by exact/alias/id matching.
fn vocabulary() -> &'static Vec<Vocab> {
    static V: OnceLock<Vec<Vocab>> = OnceLock::new();
    V.get_or_init(|| {
        let mut seen: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
        let mut out: Vec<Vocab> = Vec::new();
        let mut add = |tok: &str, danger: bool| {
            let n = normalize(tok);
            for t in n.split(' ') {
                if t.chars().count() >= 5
                    && t.chars().all(|c| c.is_ascii_alphabetic())
                    && seen.insert(t.to_string())
                {
                    out.push(Vocab {
                        norm: t.to_string(),
                        display: display_for(t),
                        danger,
                    });
                }
            }
        };
        // Danger lexicon FIRST (canonical spellings) — corrected towards so the boundary fires on the fix.
        // Added before the alias tables so a danger word that ALSO appears inside a concept alias (e.g.
        // "chave" in "chave de idempotencia") keeps its danger flag via first-seen dedup — a danger
        // correction must never surface as a helpful "Interpretado como …" note (§14).
        for d in DANGER_WORDS {
            add(d, true);
        }
        // Ecosystem identities (ADR-001) — canonical, never corrected into one another. Added before the
        // alias tables so each is an exact vocabulary member (→ passthrough), which is what stops
        // "banzami" collapsing to "banzai". Non-danger.
        for e in ECOSYSTEM_ENTITIES {
            add(e, false);
        }
        // Concept + catalogue aliases are the source of truth for concept vocabulary (single source, §16).
        for (_, aliases) in crate::concept::concept_entries() {
            for a in *aliases {
                add(a, false);
            }
        }
        for (_, aliases) in crate::catalogue::alias_entries() {
            for a in *aliases {
                add(a, false);
            }
        }
        // Curated high-traffic concept display forms (accent-free keys) — first-class fuzzy targets so a
        // typo of a canonical concept ("interoperbilidade", "conformidde") recovers even when the concept's
        // longer aliases did not contribute the bare token. Added AFTER the danger lexicon so a shared token
        // (e.g. "certificacao") keeps its danger flag (first-seen wins via `seen`).
        for (k, _) in ACCENT_DISPLAY {
            add(k, false);
        }
        out
    })
}

/// Bounded Levenshtein edit distance. Returns `cap + 1` as soon as the best possible distance exceeds
/// `cap`, so it is cheap for the short tokens we compare. Deterministic, total.
pub fn edit_distance(a: &str, b: &str, cap: usize) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    if a.len().abs_diff(b.len()) > cap {
        return cap + 1;
    }
    let mut prev: Vec<usize> = (0..=b.len()).collect();
    let mut cur = vec![0usize; b.len() + 1];
    for (i, &ca) in a.iter().enumerate() {
        cur[0] = i + 1;
        let mut row_min = cur[0];
        for (j, &cb) in b.iter().enumerate() {
            let cost = if ca == cb { 0 } else { 1 };
            cur[j + 1] = (prev[j] + cost).min(prev[j + 1] + 1).min(cur[j] + 1);
            row_min = row_min.min(cur[j + 1]);
        }
        if row_min > cap {
            return cap + 1;
        }
        std::mem::swap(&mut prev, &mut cur);
    }
    prev[b.len()]
}

/// The distance threshold allowed for a token of a given length. One edit for short-ish words; two for
/// longer words where a single edit is a small fraction of the token. Never correct very short tokens.
fn threshold_for(len: usize) -> usize {
    match len {
        0..=3 => 0, // too short — exact/alias/id only (never fuzzy-correct "qr", 3-letter ids)
        4..=7 => 1, // one edit (covers "trst"→trust, "fedração"→…); the margin rule still gates ties
        _ => 2,
    }
}

/// One applied or proposed token correction.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct Correction {
    pub from: String,
    pub to: String,
    pub display: String,
    pub distance: usize,
    pub danger: bool,
}

/// The confidence band of the recovery decision (public labels; scores are never exposed).
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Band {
    /// No correction was needed (the query already uses canonical/known forms) — passthrough.
    Exact,
    /// A single dominant correction with a clear margin — applied automatically.
    HighConfidence,
    /// Two or more plausible corrections are too close — ask, never guess.
    Ambiguous,
}

/// The result of the recovery pass.
#[derive(Debug, Clone, Serialize)]
pub struct Recovery {
    pub original: String,
    pub normalized: String,
    /// the query with high-confidence corrections applied (normalized form); == normalized when none.
    pub corrected_query: String,
    pub band: Band,
    pub corrections: Vec<Correction>,
    /// competing display forms when `band == Ambiguous` (the caller asks the user to choose).
    pub clarification: Vec<String>,
    pub requires_clarification: bool,
    pub automatic: bool,
    pub reason: String,
}

/// Find the best and runner-up vocabulary matches for a single non-exact token, within its length
/// threshold. Returns (best, best_dist, runner_up_dist). Only alphabetic tokens are considered.
fn best_matches(tok: &str) -> Option<(&'static Vocab, usize, usize)> {
    let len = tok.chars().count();
    let cap = threshold_for(len);
    if cap == 0 || !tok.chars().all(|c| c.is_ascii_alphabetic()) {
        return None;
    }
    let mut best: Option<(&'static Vocab, usize)> = None;
    let mut runner: usize = cap + 1;
    for v in vocabulary() {
        // a length gate keeps the comparison set small and avoids matching wildly different words.
        if v.norm.chars().count().abs_diff(len) > cap {
            continue;
        }
        let d = edit_distance(tok, &v.norm, cap);
        if d > cap {
            continue;
        }
        match best {
            Some((_, bd)) if d < bd => {
                runner = bd.min(runner);
                best = Some((v, d));
            }
            Some((_, bd)) if d >= bd => {
                runner = runner.min(d);
            }
            None => best = Some((v, d)),
            _ => {}
        }
    }
    best.map(|(v, d)| (v, d, runner))
}

/// M2.18B.5 — recover a probable canonical form from a raw question. Conservative by construction: a token
/// is corrected only when it is not already a vocabulary member, has a single dominant match within its
/// length threshold, AND that match beats the runner-up by a clear margin. If two matches tie the token is
/// AMBIGUOUS and the whole recovery asks for clarification; if nothing is close the token is left as-is.
/// ID-kind typos ("rfd 0006" → "rfc 0006") are corrected only when exactly one real kind is one edit away
/// and the referenced document exists.
pub fn recover(question: &str) -> Recovery {
    let normalized = normalize(question);
    let mut corrections: Vec<Correction> = Vec::new();
    let mut clarification: Vec<String> = Vec::new();
    let mut ambiguous = false;

    let toks: Vec<String> = normalized
        .split(' ')
        .filter(|t| !t.is_empty())
        .map(|t| t.to_string())
        .collect();
    let vocab = vocabulary();
    let is_exact = |t: &str| vocab.iter().any(|v| v.norm == t);

    let mut out_toks: Vec<String> = Vec::with_capacity(toks.len());
    for (i, tok) in toks.iter().enumerate() {
        // ID-kind typo: a 3-letter token one edit from exactly one of adr/rfc, followed by digits whose
        // document exists. "rfd 0006" → "rfc 0006"; never adr↔rfc (distance 3), never a number change.
        if tok.chars().count() == 3 && tok.chars().all(|c| c.is_ascii_alphabetic()) {
            if let Some(next) = toks.get(i + 1) {
                if next.chars().all(|c| c.is_ascii_digit()) && !next.is_empty() {
                    let dl_adr = edit_distance(tok, "adr", 1);
                    let dl_rfc = edit_distance(tok, "rfc", 1);
                    let (kind, dk) = if dl_adr <= 1 && dl_rfc > 1 {
                        ("adr", dl_adr)
                    } else if dl_rfc <= 1 && dl_adr > 1 {
                        ("rfc", dl_rfc)
                    } else {
                        ("", 2)
                    };
                    if !kind.is_empty() && dk == 1 && tok != kind {
                        let n: u32 = next.parse().unwrap_or(0);
                        let canonical = if kind == "adr" {
                            format!("ADR-{n:03}")
                        } else {
                            format!("RFC-{n:04}")
                        };
                        if crate::docref::resolve(&canonical).is_some() {
                            corrections.push(Correction {
                                from: tok.clone(),
                                to: kind.to_string(),
                                display: canonical,
                                distance: 1,
                                danger: false,
                            });
                            out_toks.push(kind.to_string());
                            continue;
                        }
                    }
                }
            }
        }

        if is_exact(tok) || tok.chars().any(|c| c.is_ascii_digit()) {
            out_toks.push(tok.clone());
            continue;
        }
        if let Some((v, dist, runner)) = best_matches(tok) {
            // A DANGER correction requires a SINGLE edit: a real word two edits from a danger verb
            // ("certificado" ~ "certifica", "aprovado" ~ "aprova") must NOT be pulled into a boundary and
            // have its intent flipped. Every genuine one-edit danger typo (certifca/aprva/movimnta/chabe)
            // is distance 1, so boundary recall is unaffected; the token is simply left as-is here.
            if v.danger && dist > 1 {
                out_toks.push(tok.clone());
            }
            // margin rule (§8): the best must beat the runner-up by ≥ 1 edit, else it is ambiguous — EXCEPT
            // when the best match is a DANGER word: a misspelling equidistant among danger words
            // ("aprovaa" ~ aprova/aprovar) is still a prohibited action either way, so we apply the
            // correction so the boundary fires (§19). Correcting toward a danger word never weakens safety.
            else if runner <= dist && !v.danger {
                ambiguous = true;
                let mut opts: Vec<String> = vocabulary()
                    .iter()
                    .filter(|w| edit_distance(tok, &w.norm, dist) == dist && !w.danger)
                    .map(|w| w.display.clone())
                    .collect();
                opts.dedup();
                opts.truncate(3);
                for o in opts {
                    if !clarification.contains(&o) {
                        clarification.push(o);
                    }
                }
                out_toks.push(tok.clone());
            } else {
                corrections.push(Correction {
                    from: tok.clone(),
                    to: v.norm.clone(),
                    display: v.display.clone(),
                    distance: dist,
                    danger: v.danger,
                });
                out_toks.push(v.norm.clone());
            }
        } else {
            out_toks.push(tok.clone());
        }
    }

    let corrected_query = out_toks.join(" ");
    let (band, requires_clarification, automatic, reason) = if ambiguous {
        (
            Band::Ambiguous,
            true,
            false,
            "multiple plausible corrections — clarify".to_string(),
        )
    } else if !corrections.is_empty() {
        (
            Band::HighConfidence,
            false,
            true,
            "single dominant correction applied".to_string(),
        )
    } else {
        (
            Band::Exact,
            false,
            false,
            "no correction needed".to_string(),
        )
    };
    clarification.truncate(3);
    Recovery {
        original: question.to_string(),
        normalized,
        corrected_query,
        band,
        corrections,
        clarification,
        requires_clarification,
        automatic,
        reason,
    }
}

// ───────────────────────────── M2.18B.5 §25 — canonical alias TRUTH TABLE ─────────────────────────────
// The truth table + collision detector are DERIVED from the two existing alias tables (concept.rs +
// catalogue.rs). They are the alias-integrity guard's evidence and the report's appendix. A COLLISION is
// the only real hazard: the SAME normalized alias resolving to TWO DIFFERENT canonical ids (a silent,
// path-dependent answer). Multiple aliases → the same id is fine (facets of one document).

/// One row of the alias truth table.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct AliasRow {
    pub id: String,
    pub alias: String,
    pub normalized: String,
    pub source: &'static str,
}

/// The merged alias truth table (concept + catalogue), normalized, first-appearance order.
pub fn alias_truth_table() -> Vec<AliasRow> {
    let mut out: Vec<AliasRow> = Vec::new();
    let push = |id: &str, alias: &str, source: &'static str, out: &mut Vec<AliasRow>| {
        out.push(AliasRow {
            id: id.to_string(),
            alias: alias.to_string(),
            normalized: normalize(alias),
            source,
        });
    };
    for (id, aliases) in crate::concept::concept_entries() {
        for a in *aliases {
            push(id, a, "concept", &mut out);
        }
    }
    for (id, aliases) in crate::catalogue::alias_entries() {
        for a in *aliases {
            push(id, a, "catalogue", &mut out);
        }
    }
    out
}

/// Silent collisions: a normalized alias that maps to two OR MORE distinct canonical ids. Returns
/// (normalized_alias, sorted distinct ids) for each. An empty result means every alias is unambiguous.
pub fn alias_collisions() -> Vec<(String, Vec<String>)> {
    use std::collections::BTreeMap;
    let mut by_alias: BTreeMap<String, std::collections::BTreeSet<String>> = BTreeMap::new();
    for row in alias_truth_table() {
        by_alias.entry(row.normalized).or_default().insert(row.id);
    }
    by_alias
        .into_iter()
        .filter(|(_, ids)| ids.len() >= 2)
        .map(|(a, ids)| (a, ids.into_iter().collect()))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn alias_table_has_no_silent_collisions() {
        // §25 — no normalized alias may resolve to two different canonical ids (a path-dependent answer).
        let collisions = alias_collisions();
        assert!(
            collisions.is_empty(),
            "silent alias collisions (same alias → different ids): {collisions:?}"
        );
    }

    #[test]
    fn truth_table_is_nonempty_and_bound_to_real_ids() {
        let t = alias_truth_table();
        assert!(t.len() > 30, "truth table should cover the alias corpus");
        for r in &t {
            assert!(!r.id.is_empty() && !r.normalized.is_empty());
        }
    }

    #[test]
    fn edit_distance_is_bounded_and_correct() {
        assert_eq!(edit_distance("federacao", "fedaracao", 2), 1);
        assert_eq!(edit_distance("federacao", "federacao", 2), 0);
        assert_eq!(edit_distance("abc", "xyz", 2), 3); // exceeds cap → cap+1
    }

    #[test]
    fn exact_forms_are_untouched() {
        for q in ["federacao", "o que e a federacao", "revogacao de uma chave"] {
            let r = recover(q);
            assert_eq!(r.band, Band::Exact, "q={q}");
            assert!(r.corrections.is_empty(), "q={q}");
        }
    }

    #[test]
    fn one_edit_concept_typos_are_corrected() {
        for (q, want) in [
            ("o que e fedaracao", "federacao"),
            ("explica a revogasao", "revogacao"), // revogasao->revogacao (s->c) dist 1
            ("governaca do protocolo", "governanca"),
        ] {
            let r = recover(q);
            assert_eq!(r.band, Band::HighConfidence, "q={q} r={r:?}");
            assert!(
                r.corrected_query.contains(want),
                "q={q} got={}",
                r.corrected_query
            );
        }
    }

    #[test]
    fn short_tokens_and_ids_are_never_fuzzy_corrected() {
        // "trust" (5 chars but a real word) — must stay; "qr" too short; digits never change.
        let r = recover("trust");
        assert!(r.corrections.iter().all(|c| c.from != "trust") || r.band == Band::Exact);
        let r2 = recover("adr 041");
        assert!(
            r2.corrections.is_empty(),
            "ids must not be fuzzy-corrected: {r2:?}"
        );
    }

    #[test]
    fn ecosystem_identities_are_never_corrected_into_one_another() {
        // ADR-001: Banzami (organization) ≠ BanzAI (agent) ≠ BANZA (protocol). Each is one edit from the
        // next, yet each is a REAL canonical name. The recovery layer must leave all three untouched — the
        // regression where "o que é o Banzami?" was silently corrected to "banzai" (distance 1) and
        // answered with the BanzAI-AGENT definition, an institutional-identity confusion.
        for q in [
            "o que e o banzami",
            "banzami",
            "o que e o banzai",
            "o que e a banza",
        ] {
            let r = recover(q);
            assert!(
                r.corrections
                    .iter()
                    .all(|c| !["banzami", "banzai", "banza"].contains(&c.from.as_str())),
                "q={q}: an ecosystem identity must never be corrected — got {:?}",
                r.corrections
            );
        }
        // and specifically: banzami stays banzami (not rewritten to banzai)
        let r = recover("o que e o banzami");
        assert!(
            r.corrected_query.contains("banzami"),
            "banzami must survive recovery: {r:?}"
        );
        assert!(
            !r.corrected_query.contains("banzai "),
            "banzami must NOT become banzai: {r:?}"
        );
    }

    #[test]
    fn rfd_id_kind_typo_corrects_to_rfc_when_doc_exists() {
        let r = recover("explica a rfd 0006");
        assert!(
            r.corrections
                .iter()
                .any(|c| c.from == "rfd" && c.to == "rfc"),
            "rfd->rfc expected: {r:?}"
        );
        assert!(r.corrected_query.contains("rfc 0006"));
    }

    #[test]
    fn danger_verb_typo_is_corrected_towards_the_boundary_word() {
        // "certifca" -> "certifica" so route.rs boundary fires on the corrected text.
        let r = recover("certifca o operador");
        assert!(
            r.corrections
                .iter()
                .any(|c| c.to == "certifica" && c.danger),
            "certifca->certifica expected: {r:?}"
        );
    }

    #[test]
    fn no_candidate_is_left_untouched() {
        let r = recover("xyzzy plughwock");
        assert_eq!(r.band, Band::Exact);
        assert!(r.corrections.is_empty());
    }

    #[test]
    fn number_tokens_are_never_altered() {
        let r = recover("adr 503");
        assert!(r
            .corrections
            .iter()
            .all(|c| !c.from.chars().any(|x| x.is_ascii_digit())));
        assert!(r.corrected_query.contains("503"));
    }
}
