//! M2.18B.7 DFN-7 — a deterministic, dependency-free JSON-Schema validator (the single "schema validator"
//! authority). It validates a concrete instance against a canonical protocol schema, covering the subset the
//! production schemas actually use: `type`, `required`, `properties` (recursive), `additionalProperties`
//! (invented fields rejected when `false`), `enum`, `items` (array element schema), and the common string
//! `format`s (`date-time`, `uri`, `email`). Pure — no I/O, no clock, no model — so it runs identically in
//! native tests, in WASM at runtime, and in the guard's node harness.
//!
//! It is intentionally NOT a general JSON-Schema engine: it implements exactly the keywords the BANZA
//! contracts use, and reports every violation (it does not stop at the first) so a template's structural
//! defects are fully explained.

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SchemaVerdict {
    pub ok: bool,
    pub errors: Vec<String>,
}

/// Validate `instance` against `schema`. Returns every violation found (never panics, total function).
pub fn validate_against_schema(instance: &Value, schema: &Value) -> SchemaVerdict {
    let mut errors = Vec::new();
    check(instance, schema, schema, "$", &mut errors);
    SchemaVerdict {
        ok: errors.is_empty(),
        errors,
    }
}

/// Resolve a local `$ref` (`#/$defs/name` or `#/definitions/name`) against the root schema. Returns the
/// referenced subschema, or `None` for a non-local / unresolvable ref (which is then treated as `accept`).
fn resolve_ref<'a>(root: &'a Value, r: &str) -> Option<&'a Value> {
    let ptr = r.strip_prefix('#')?;
    let mut cur = root;
    for seg in ptr.split('/').filter(|s| !s.is_empty()) {
        let key = seg.replace("~1", "/").replace("~0", "~");
        cur = cur.get(&key)?;
    }
    Some(cur)
}

fn type_name(v: &Value) -> &'static str {
    match v {
        Value::Null => "null",
        Value::Bool(_) => "boolean",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}

/// A JSON value matches a schema `type` string (integer accepts whole-number numbers).
fn matches_type(v: &Value, ty: &str) -> bool {
    match ty {
        "object" => v.is_object(),
        "array" => v.is_array(),
        "string" => v.is_string(),
        "boolean" => v.is_boolean(),
        "number" => v.is_number(),
        "integer" => v.as_i64().is_some() || v.as_u64().is_some(),
        "null" => v.is_null(),
        _ => true, // unknown type keyword — do not fail on it
    }
}

fn format_ok(s: &str, fmt: &str) -> bool {
    match fmt {
        // RFC3339-ish: a date, a 'T', a time, and a zone/offset. Deterministic structural check only.
        "date-time" => {
            let b = s.as_bytes();
            s.len() >= 20
                && b.get(4) == Some(&b'-')
                && b.get(7) == Some(&b'-')
                && (s.contains('T') || s.contains('t'))
                && (s.ends_with('Z')
                    || s.ends_with('z')
                    || s.contains('+')
                    || s[11..].contains('-'))
        }
        "date" => {
            let b = s.as_bytes();
            s.len() == 10 && b.get(4) == Some(&b'-') && b.get(7) == Some(&b'-')
        }
        "uri" | "uri-reference" => s.contains(':') || s.starts_with('/'),
        "email" => s.contains('@') && s.contains('.'),
        _ => true, // unknown format — advisory only
    }
}

fn check(instance: &Value, schema: &Value, root: &Value, path: &str, errors: &mut Vec<String>) {
    let obj = match schema.as_object() {
        Some(o) => o,
        None => return, // `true`/non-object schema — accept
    };

    // $ref — resolve against the root schema and validate against the referenced subschema. An
    // unresolvable/remote ref is accepted (we do not fail on refs we cannot follow).
    if let Some(Value::String(r)) = obj.get("$ref") {
        if let Some(sub) = resolve_ref(root, r) {
            check(instance, sub, root, path, errors);
        }
        return;
    }

    // const
    if let Some(c) = obj.get("const") {
        if instance != c {
            errors.push(format!("{path}: value {instance} does not equal const {c}"));
        }
    }

    // type
    if let Some(t) = obj.get("type") {
        let ok = match t {
            Value::String(ty) => matches_type(instance, ty),
            Value::Array(tys) => tys
                .iter()
                .filter_map(|x| x.as_str())
                .any(|ty| matches_type(instance, ty)),
            _ => true,
        };
        if !ok {
            errors.push(format!(
                "{path}: type mismatch — expected {}, got {}",
                t,
                type_name(instance)
            ));
            return; // a wrong-typed value can't be checked further against this schema
        }
    }

    // enum
    if let Some(Value::Array(allowed)) = obj.get("enum") {
        if !allowed.iter().any(|a| a == instance) {
            errors.push(format!(
                "{path}: value {instance} not in enum {:?}",
                allowed
            ));
        }
    }

    // string format
    if let (Some(fmt), Value::String(s)) = (obj.get("format").and_then(|f| f.as_str()), instance) {
        if !format_ok(s, fmt) {
            errors.push(format!(
                "{path}: string does not match format '{fmt}': {s:?}"
            ));
        }
    }

    // object: required + properties + additionalProperties
    if let Value::Object(map) = instance {
        if let Some(Value::Array(req)) = obj.get("required") {
            for r in req.iter().filter_map(|x| x.as_str()) {
                if !map.contains_key(r) {
                    errors.push(format!("{path}: missing required field '{r}'"));
                }
            }
        }
        let props = obj.get("properties").and_then(|p| p.as_object());
        // additionalProperties:false → every instance key must be a declared property.
        let additional_allowed =
            !matches!(obj.get("additionalProperties"), Some(Value::Bool(false)));
        for (k, v) in map {
            match props.and_then(|p| p.get(k)) {
                Some(subschema) => check(v, subschema, root, &format!("{path}.{k}"), errors),
                None => {
                    if !additional_allowed {
                        errors.push(format!(
                            "{path}: field '{k}' is not permitted (additionalProperties:false) — invented field"
                        ));
                    }
                }
            }
        }
    }

    // array: items
    if let (Value::Array(items), Some(item_schema)) = (instance, obj.get("items")) {
        for (i, it) in items.iter().enumerate() {
            check(it, item_schema, root, &format!("{path}[{i}]"), errors);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn schema() -> Value {
        json!({
            "type": "object",
            "additionalProperties": false,
            "required": ["id", "environment", "count"],
            "properties": {
                "id": { "type": "string" },
                "environment": { "type": "string", "enum": ["sandbox", "production"] },
                "count": { "type": "integer" },
                "created_at": { "type": "string", "format": "date-time" },
                "tags": { "type": "array", "items": { "type": "string" } }
            }
        })
    }

    #[test]
    fn a_valid_instance_passes() {
        let v = validate_against_schema(
            &json!({ "id": "x", "environment": "sandbox", "count": 3, "tags": ["a", "b"] }),
            &schema(),
        );
        assert!(v.ok, "{:?}", v.errors);
    }

    #[test]
    fn a_missing_required_field_fails() {
        let v = validate_against_schema(&json!({ "id": "x", "environment": "sandbox" }), &schema());
        assert!(!v.ok);
        assert!(v
            .errors
            .iter()
            .any(|e| e.contains("missing required field 'count'")));
    }

    #[test]
    fn an_invented_field_fails_under_additional_properties_false() {
        let v = validate_against_schema(
            &json!({ "id": "x", "environment": "sandbox", "count": 1, "bogus": true }),
            &schema(),
        );
        assert!(!v.ok);
        assert!(v.errors.iter().any(|e| e.contains("invented field")));
    }

    #[test]
    fn a_wrong_type_fails() {
        let v = validate_against_schema(
            &json!({ "id": "x", "environment": "sandbox", "count": "three" }),
            &schema(),
        );
        assert!(!v.ok);
        assert!(v.errors.iter().any(|e| e.contains("type mismatch")));
    }

    #[test]
    fn a_bad_enum_fails() {
        let v = validate_against_schema(
            &json!({ "id": "x", "environment": "staging", "count": 1 }),
            &schema(),
        );
        assert!(!v.ok);
        assert!(v.errors.iter().any(|e| e.contains("not in enum")));
    }

    #[test]
    fn a_bad_format_fails() {
        let v = validate_against_schema(
            &json!({ "id": "x", "environment": "sandbox", "count": 1, "created_at": "yesterday" }),
            &schema(),
        );
        assert!(!v.ok);
        assert!(v.errors.iter().any(|e| e.contains("format 'date-time'")));
    }

    #[test]
    fn a_bad_array_element_type_fails() {
        let v = validate_against_schema(
            &json!({ "id": "x", "environment": "sandbox", "count": 1, "tags": ["a", 2] }),
            &schema(),
        );
        assert!(!v.ok);
        assert!(v.errors.iter().any(|e| e.contains("tags[1]")));
    }
}
