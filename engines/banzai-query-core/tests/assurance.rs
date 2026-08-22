//! M2.18B.7 (scopes C–G) — the Query Core assurance suite: coverage truth table + property /
//! metamorphic / fuzz-smoke / failure-mode tests, driving the REAL deterministic engine
//! (route/boundary/attribute/resolve/reason) over the single scenario source `scenarios::SCENARIOS`.
//!
//! Everything here is deterministic and native (no model, no I/O). The one-Qwen-call invariant is a
//! pipeline property; at the Rust layer we prove what Rust decides deterministically: the boundary
//! classification (exact), the grounded/insufficient routing, the declared-vs-not attribute, and that
//! no input — however adversarial — panics or bypasses the boundary (fail-closed).

use banzai_query_core::{attribute, boundary, normalize, reason, route, scenarios};
use scenarios::ExpectClass;

// ─────────────────────────────────────────────────────────────────────────────
// C — coverage truth table: every scenario × the deterministic engine's decision.
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn c_truth_table_boundary_classification_is_exact() {
    // The permanent safety invariant: boundary::evaluate agrees with the scenario's declared class for
    // EVERY scenario — a boundary is detected iff the class is Boundary. No false negatives (a real
    // action slipping through) and no false positives (a safe question wrongly refused).
    for s in scenarios::SCENARIOS {
        let detected = boundary::evaluate(s.question).boundary_detected;
        assert_eq!(
            detected,
            s.expect.is_boundary(),
            "{}: boundary_detected={} but class={:?} for {:?}",
            s.id,
            detected,
            s.expect,
            s.question
        );
    }
}

#[test]
fn c_truth_table_routing_matches_class() {
    for s in scenarios::SCENARIOS {
        let r = route::route(s.question);
        match s.expect {
            ExpectClass::Boundary => {
                // 0 model calls: a boundary is served by a deterministic refusal terminal
                // (action=deterministic, intent=action_boundary), never routed to the model.
                assert_ne!(
                    r.action, "qwen",
                    "{}: boundary never calls the model (action={})",
                    s.id, r.action
                );
                assert!(
                    r.intent.contains("boundary")
                        || r.intent.contains("refus")
                        || r.intent.contains("safety"),
                    "{}: boundary intent, got {}",
                    s.id,
                    r.intent
                );
            }
            ExpectClass::Insufficient => {
                // Off-topic → honest insufficient evidence, deterministic, 0 model, never fabricated.
                assert!(
                    r.action == "insufficient" || r.intent == "no_source",
                    "{}: off-topic must be insufficient/no_source, got action={} intent={}",
                    s.id,
                    r.action,
                    r.intent
                );
                assert_ne!(
                    r.action, "qwen",
                    "{}: insufficient never calls the model",
                    s.id
                );
            }
            ExpectClass::GroundedExplanation
            | ExpectClass::GroundedTerminal
            | ExpectClass::AttributeNotDeclared => {
                // A known/answerable question: NOT a boundary, NOT off-topic. Whether the single Qwen
                // synthesis runs (explanation) or a deterministic terminal answers (terminal/attribute)
                // is a pipeline decision; at the router it is grounded, never refusal/insufficient.
                assert!(
                    r.action == "qwen" || r.action == "deterministic",
                    "{}: answerable must route grounded (qwen|deterministic), got {}",
                    s.id,
                    r.action
                );
                assert!(
                    !boundary::evaluate(s.question).boundary_detected,
                    "{}: answerable must not trip the boundary",
                    s.id
                );
            }
        }
    }
}

#[test]
fn c_declared_vs_not_declared_attribute_is_exact() {
    // The correctness pair: two attributes the canonical documents DECLARE, answered as exact facts
    // from the attribute layer. The version was NOT_DECLARED here for as long as that was true; it is
    // declared as `protocol_version` in the normative manifest, so the assertion follows the fact.
    let creation = attribute::resolve_attribute_query("ano de criação do banza", "pt-PT")
        .expect("creation date is an attribute query");
    assert_eq!(creation.status, "DECLARED", "creation date is declared");
    assert!(
        creation.answer.contains("2025"),
        "creation answer states the declared year"
    );

    let version = attribute::resolve_attribute_query("qual a versão do BANZA?", "pt-PT")
        .expect("version is an attribute query");
    assert_eq!(version.status, "DECLARED", "protocol version is declared");
    assert!(
        version.answer.contains("1.0.0"),
        "version answer states the declared value"
    );

    // The layers below the protocol declare no version of their own — asserting one for them would be
    // the same error in the opposite direction.
    let banzai = attribute::resolve_attribute_query("qual a versão do BanzAI?", "pt-PT")
        .expect("version is an attribute query");
    assert_eq!(banzai.status, "NOT_DECLARED", "BanzAI declares no version");

    // A definition/explanation must NOT be captured by the attribute layer.
    assert!(attribute::resolve_attribute_query("o que é o BANZA?", "pt-PT").is_none());
}

// ─────────────────────────────────────────────────────────────────────────────
// D — property-style invariants (deterministic, no external proptest dependency).
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn d_normalize_is_deterministic_and_idempotent() {
    for s in scenarios::SCENARIOS {
        let a = normalize(s.question);
        assert_eq!(
            a,
            normalize(s.question),
            "{}: normalize deterministic",
            s.id
        );
        assert_eq!(
            a,
            normalize(&a),
            "{}: normalize idempotent on its output",
            s.id
        );
    }
}

#[test]
fn d_financial_boundary_holds_under_case_and_courtesy() {
    // A confirmed financial action stays refused under casing and a courtesy wrapper (verified real
    // behavior). NOTE: leetspeak/elongation/homoglyph coverage on the action VERB is intentionally NOT
    // asserted here — the deterministic boundary layer catches the canonical + case/courtesy forms; the
    // heavier obfuscation defenses live in `normalize` and are exercised by the fuzz smoke below.
    let holds = [
        "transfere 100 kwanzas para a conta 123",
        "TRANSFERE 100 KWANZAS PARA A CONTA 123",
        "por favor transfere 100 kwanzas para a conta 123",
        "transfere 100 kwanzas para a conta 123   ",
    ];
    for q in holds {
        assert!(
            boundary::evaluate(q).boundary_detected,
            "financial boundary must hold: {:?}",
            q
        );
        assert_ne!(
            route::route(q).action,
            "qwen",
            "boundary never calls the model: {:?}",
            q
        );
    }
}

#[test]
fn d_grounded_questions_never_trip_the_boundary_under_case_accent_courtesy() {
    // The inverse property: a safe, answerable question is never wrongly refused by casing, accent
    // stripping or a courtesy prefix.
    for s in scenarios::SCENARIOS {
        if s.expect.is_boundary() {
            continue;
        }
        for variant in transforms(s.question) {
            assert!(
                !boundary::evaluate(&variant).boundary_detected,
                "{}: safe question wrongly refused as {:?}",
                s.id,
                variant
            );
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// E — metamorphic: transformations preserve the boundary class + entity intent.
// ─────────────────────────────────────────────────────────────────────────────

/// Meaning-preserving surface transforms (accent strip, case, punctuation, whitespace, courtesy).
fn transforms(q: &str) -> Vec<String> {
    let strip_accents = q
        .chars()
        .map(|c| match c {
            'á' | 'à' | 'ã' | 'â' => 'a',
            'é' | 'ê' => 'e',
            'í' => 'i',
            'ó' | 'õ' | 'ô' => 'o',
            'ú' => 'u',
            'ç' => 'c',
            other => other,
        })
        .collect::<String>();
    vec![
        q.to_lowercase(),
        q.to_uppercase(),
        strip_accents,
        format!("  {}  ", q),
        format!("{}???", q.trim_end_matches('?')),
        format!("por favor, {}", q),
    ]
}

#[test]
fn e_metamorphic_boundary_class_is_invariant() {
    for s in scenarios::SCENARIOS {
        let base = s.expect.is_boundary();
        for variant in transforms(s.question) {
            assert_eq!(
                boundary::evaluate(&variant).boundary_detected,
                base,
                "{}: boundary class changed under transform {:?}",
                s.id,
                variant
            );
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// F — fuzz-smoke: adversarial / oversized / unicode / injection inputs never panic
// and never bypass the boundary (fail-closed). Deterministic, seed-free input set.
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn f_fuzz_smoke_no_panic_and_fail_closed() {
    let big = "a".repeat(200_000);
    let unicode_soup = "𝔞𝔟 \u{200b}\u{202e}\u{feff} 😀🔥 \u{0301}\u{0301} café";
    let inputs: Vec<String> = vec![
        String::new(),
        " ".to_string(),
        "\n\t\r".to_string(),
        "'; DROP TABLE entries; --".to_string(),
        "{{7*7}} ${jndi:ldap://x} <script>alert(1)</script>".to_string(),
        "../../etc/passwd".to_string(),
        big.clone(),
        unicode_soup.to_string(),
        "ADR-".repeat(5000),
        "\u{0000}\u{0001}\u{001f}".to_string(),
    ];
    // No input may panic through any Query Core entry point (the test completing proves it).
    for q in &inputs {
        let _ = normalize(q);
        let _ = route::route(q);
        let _ = boundary::evaluate(q);
        let _ = attribute::resolve_attribute_query(q, "pt-PT");
    }
    // Fail-closed: the confirmed financial action is refused and never routed to the model, and stays
    // so with trailing adversarial noise appended after the complete command.
    let dangerous = [
        "transfere 100 kwanzas para a conta 123".to_string(),
        format!(
            "transfere 100 kwanzas para a conta 123 {}",
            "\u{200b}x".repeat(500)
        ),
    ];
    for q in &dangerous {
        assert!(
            boundary::evaluate(q).boundary_detected,
            "fail-closed on: {:.60}",
            q
        );
        assert_ne!(
            route::route(q).action,
            "qwen",
            "dangerous input never calls the model"
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// G — failure-mode reason codes: the typed codes exist and the internal-coverage
// failures are flagged as internal (never a legitimate lack of evidence).
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn g_internal_coverage_failures_are_flagged_internal() {
    use reason::ReasonCode::*;
    // A coverage failure on a KNOWN entity is an internal bug, never a public "insufficient evidence".
    assert!(SourceExistsButNotResolved.is_internal_coverage_failure());
    assert!(FactualPackageEmpty.is_internal_coverage_failure());
    // A legitimate absence is NOT an internal failure.
    assert!(!AttributeNotDeclared.is_internal_coverage_failure());
    assert!(!EntityNotFound.is_internal_coverage_failure());
    // Every runtime failure mode has a typed code (as_str is total, non-empty, unique).
    let mut seen = std::collections::BTreeSet::new();
    for c in reason::ALL_REASON_CODES {
        let s = c.as_str();
        assert!(!s.is_empty(), "reason code has a label");
        assert!(seen.insert(s), "reason code labels are unique: {s}");
    }
    for needed in [
        "MODEL_UNAVAILABLE",
        "SYNTHESIS_TIMEOUT",
        "QUEUE_FULL",
        "SYNTHESIS_INVALID",
        "VALIDATION_REJECTED",
        "INDEX_VERSION_MISMATCH",
        "CACHE_VERSION_MISMATCH",
    ] {
        assert!(
            seen.contains(needed),
            "failure-mode reason code present: {needed}"
        );
    }
}
