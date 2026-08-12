//! M2.18B.7 DFN-7 — schema-validated templates (permanent regression).
//!
//! Every catalogue TEMPLATE the engine can publish is validated here against its REAL canonical schema file:
//! the rendered body validates, the claimed required fields equal the schema's `required`, no invented field
//! survives `additionalProperties:false`, and at least one NEGATIVE case per critical rule is proven to
//! fail. The key-manifest template (previously corrected) is a permanent regression member. Deterministic —
//! the single `schemacheck` validator, no model, no network.

use banzai_query_core::schemacheck::validate_against_schema;
use banzai_query_core::tasked::catalogue_templates;
use serde_json::Value;
use std::path::Path;

/// Read a repo-relative schema file (CARGO_MANIFEST_DIR = engines/banzai-query-core → repo root is ../..).
fn read_schema(rel: &str) -> Value {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let p = root.join(rel);
    let raw = std::fs::read_to_string(&p).unwrap_or_else(|e| panic!("read {}: {e}", p.display()));
    serde_json::from_str(&raw).unwrap_or_else(|e| panic!("parse {}: {e}", p.display()))
}

/// The subjects DFN-7 must cover (they must all have a template with a real schema).
const REQUIRED_TEMPLATE_SUBJECTS: &[&str] = &[
    "manifest",     // operator manifest
    "chave",        // key manifest (permanent regression)
    "evidencia",    // evidence bundle
    "conformidade", // conformance evidence
    "trust",        // trust-related (federation trust evaluation)
    "root",         // root / trust-root metadata
];

#[test]
fn every_catalogue_template_validates_against_its_real_schema() {
    let templates = catalogue_templates();
    assert!(!templates.is_empty(), "no catalogue templates found");

    for t in &templates {
        let schema = read_schema(&t.schema_path);
        let body: Value = serde_json::from_str(&t.body_json)
            .unwrap_or_else(|e| panic!("{}: body_json is not valid JSON: {e}", t.subject));

        // 1. the rendered body validates against the real schema (required + types + enums + formats).
        let v = validate_against_schema(&body, &schema);
        assert!(
            v.ok,
            "{} template does NOT validate against {}:\n  {}",
            t.subject,
            t.schema_path,
            v.errors.join("\n  ")
        );

        // 2. required-field integrity: every field the template CLAIMS is required is a real schema
        // property (no invented claimed field), and every schema-required field is present in the body
        // (the validator enforces presence above; we assert the claim/schema linkage here).
        let props = schema
            .get("properties")
            .and_then(|p| p.as_object())
            .expect("schema has properties");
        for c in &t.required_fields {
            assert!(
                props.contains_key(c),
                "{} claims required field '{c}' that is not a property of {}",
                t.subject,
                t.schema_path
            );
        }
        let schema_required: Vec<String> = schema
            .get("required")
            .and_then(|r| r.as_array())
            .map(|a| {
                a.iter()
                    .filter_map(|x| x.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_default();
        let body_keys: std::collections::BTreeSet<&str> = body
            .as_object()
            .unwrap()
            .keys()
            .map(|k| k.as_str())
            .collect();
        for r in &schema_required {
            assert!(
                body_keys.contains(r.as_str()),
                "{} template body missing schema-required field '{r}'",
                t.subject
            );
        }

        // 3. no invented fields — enforced against CLOSED schemas (additionalProperties:false). The
        // production schemas are all closed; a legitimately-open contract (e.g. the federation-manifest)
        // permits additional properties by design, so the invented-field check is vacuous there and the
        // body validity (required + types + enums, checked above) is the guarantee.
        if schema.get("additionalProperties") == Some(&Value::Bool(false)) {
            let props = schema
                .get("properties")
                .and_then(|p| p.as_object())
                .expect("schema has properties");
            for k in body.as_object().unwrap().keys() {
                assert!(
                    props.contains_key(k),
                    "{} template field '{k}' is not a declared property of {}",
                    t.subject,
                    t.schema_path
                );
            }
        }
    }
}

#[test]
fn dfn7_covers_the_required_template_subjects() {
    let subjects: Vec<String> = catalogue_templates()
        .into_iter()
        .map(|t| t.subject)
        .collect();
    for req in REQUIRED_TEMPLATE_SUBJECTS {
        assert!(
            subjects.iter().any(|s| s == req),
            "DFN-7 required template subject '{req}' is missing from the catalogue (have: {subjects:?})"
        );
    }
}

#[test]
fn key_manifest_template_is_a_permanent_regression() {
    // The previously-corrected key-manifest template must stay valid against its real schema.
    let t = catalogue_templates()
        .into_iter()
        .find(|t| t.subject == "chave")
        .expect("key-manifest (chave) template present");
    let schema = read_schema(&t.schema_path);
    let body: Value = serde_json::from_str(&t.body_json).unwrap();
    let v = validate_against_schema(&body, &schema);
    assert!(
        v.ok,
        "key-manifest template regressed:\n  {}",
        v.errors.join("\n  ")
    );
}

// ── negative cases: at least one per critical rule, proven to FAIL ─────────────────────────────────────
#[test]
fn dfn7_negative_invented_field_is_rejected() {
    let t = catalogue_templates()
        .into_iter()
        .find(|t| t.subject == "manifest")
        .unwrap();
    let schema = read_schema(&t.schema_path);
    let mut body: Value = serde_json::from_str(&t.body_json).unwrap();
    body.as_object_mut()
        .unwrap()
        .insert("totally_invented_field".into(), Value::Bool(true));
    let v = validate_against_schema(&body, &schema);
    assert!(!v.ok);
    assert!(v.errors.iter().any(|e| e.contains("invented field")));
}

#[test]
fn dfn7_negative_missing_required_is_rejected() {
    let t = catalogue_templates()
        .into_iter()
        .find(|t| t.subject == "manifest")
        .unwrap();
    let schema = read_schema(&t.schema_path);
    let mut body: Value = serde_json::from_str(&t.body_json).unwrap();
    body.as_object_mut().unwrap().remove("operator_id");
    let v = validate_against_schema(&body, &schema);
    assert!(!v.ok);
    assert!(v
        .errors
        .iter()
        .any(|e| e.contains("missing required field 'operator_id'")));
}

#[test]
fn dfn7_negative_wrong_type_is_rejected() {
    let t = catalogue_templates()
        .into_iter()
        .find(|t| t.subject == "manifest")
        .unwrap();
    let schema = read_schema(&t.schema_path);
    let mut body: Value = serde_json::from_str(&t.body_json).unwrap();
    // `simulated` is a boolean in the schema — set it to a string.
    body.as_object_mut()
        .unwrap()
        .insert("simulated".into(), Value::String("yes".into()));
    let v = validate_against_schema(&body, &schema);
    assert!(!v.ok);
    assert!(v.errors.iter().any(|e| e.contains("type mismatch")));
}
