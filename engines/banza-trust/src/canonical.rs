//! BANZA Canonical JSON (`BCJ/1`) — implementation of the normative specification.
//!
//! **This module implements `spec/canonicalization.md`; it does not define it.** The specification is the
//! authority. If this code and the specification disagree, the code is wrong. Conformance is proven
//! against the public vectors in `conformance/vectors/canonicalization.json`, which are derived from the
//! specification, not from this implementation.
//!
//! `BCJ/1` = RFC 8785 (JCS) restricted by the BANZA profile (ADR-010):
//!   P1 integers only · P2 within ±(2^53−1) · P3 duplicate members rejected · P4 unknown members
//!   preserved · P5 no Unicode normalisation · P6 member ordering by UTF-16 code units.
//!
//! Every rule is fail-closed: a violation yields `Err`, never degraded bytes.

use serde_json::Value;

/// The canonicalization identifier this module implements (`spec/canonicalization.md` §3 P7).
pub const CANONICALIZATION_ID: &str = "BCJ/1";

/// P2 — the inclusive integer bound, ±(2^53 − 1).
pub const MAX_SAFE_INTEGER: i64 = 9_007_199_254_740_991;

/// Parse JSON text under P3: any object containing a repeated member name is rejected.
///
/// `serde_json`'s default `Value` parse silently keeps the last occurrence, which is exactly the
/// signature-confusion vector P3 exists to close, so duplicates are detected here on the raw text.
pub fn parse_strict(raw: &str) -> Result<Value, String> {
    let v: Value = serde_json::from_str(raw).map_err(|e| format!("BCJ/1: invalid JSON: {e}"))?;
    // serde_json has already collapsed duplicates, so compare member counts against the raw text.
    if let Some(name) = first_duplicate_member(raw)? {
        return Err(format!(
            "BCJ/1 P3: duplicate object member '{name}' — artifact rejected (fail-closed)"
        ));
    }
    Ok(v)
}

/// Scan the raw JSON for a repeated member name within the same object. Returns the first one found.
fn first_duplicate_member(raw: &str) -> Result<Option<String>, String> {
    let b = raw.as_bytes();
    let mut i = 0usize;
    // one key set per open object; arrays push a marker frame that collects nothing
    let mut frames: Vec<Option<std::collections::HashSet<String>>> = Vec::new();
    while i < b.len() {
        match b[i] {
            b'{' => {
                frames.push(Some(std::collections::HashSet::new()));
                i += 1;
            }
            b'[' => {
                frames.push(None);
                i += 1;
            }
            b'}' | b']' => {
                frames.pop();
                i += 1;
            }
            b'"' => {
                let (s, next) = scan_string(b, i)?;
                // a string is a member name when the next non-space byte is ':' and we are in an object
                let mut j = next;
                while j < b.len() && (b[j] as char).is_ascii_whitespace() {
                    j += 1;
                }
                if j < b.len() && b[j] == b':' {
                    if let Some(Some(set)) = frames.last_mut() {
                        if !set.insert(s.clone()) {
                            return Ok(Some(s));
                        }
                    }
                }
                i = next;
            }
            _ => i += 1,
        }
    }
    Ok(None)
}

/// Scan a JSON string starting at `start` (which must be the opening quote). Returns the decoded
/// member name and the index just past the closing quote.
fn scan_string(b: &[u8], start: usize) -> Result<(String, usize), String> {
    let mut out = String::new();
    let mut i = start + 1;
    while i < b.len() {
        match b[i] {
            b'"' => {
                return Ok((out, i + 1));
            }
            b'\\' => {
                // keep the escape verbatim: duplicate detection only needs a stable key identity
                if i + 1 >= b.len() {
                    return Err("BCJ/1: truncated escape in JSON string".into());
                }
                out.push('\\');
                out.push(b[i + 1] as char);
                i += 2;
            }
            _ => {
                // copy the raw byte; multi-byte UTF-8 is preserved because bytes are appended in order
                out.push(b[i] as char);
                i += 1;
            }
        }
    }
    Err("BCJ/1: unterminated JSON string".into())
}

/// Canonicalize a value under `BCJ/1`, first removing the given top-level members
/// (`spec/canonicalization.md` §4 step 2).
pub fn canonicalize(doc: &Value, exclude: &[&str]) -> Result<Vec<u8>, String> {
    let mut obj = doc.clone();
    if let Value::Object(map) = &mut obj {
        for k in exclude {
            map.remove(*k);
        }
    }
    let mut out = String::new();
    write_value(&obj, &mut out)?;
    Ok(out.into_bytes())
}

/// Canonicalize JSON text under `BCJ/1`, including the P3 duplicate-member check.
pub fn canonicalize_str(raw: &str, exclude: &[&str]) -> Result<Vec<u8>, String> {
    canonicalize(&parse_strict(raw)?, exclude)
}

/// Lowercase-hex SHA-256 over the canonical bytes (`spec/canonicalization.md` §5).
pub fn digest(doc: &Value, exclude: &[&str]) -> Result<String, String> {
    use sha2::{Digest, Sha256};
    Ok(format!("{:x}", Sha256::digest(canonicalize(doc, exclude)?)))
}

fn write_value(v: &Value, out: &mut String) -> Result<(), String> {
    match v {
        Value::Null => out.push_str("null"),
        Value::Bool(true) => out.push_str("true"),
        Value::Bool(false) => out.push_str("false"),
        Value::Number(n) => out.push_str(&write_number(n)?),
        Value::String(s) => write_string(s, out),
        Value::Array(a) => {
            // P: array order is data and is preserved
            out.push('[');
            for (i, item) in a.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                write_value(item, out)?;
            }
            out.push(']');
        }
        Value::Object(m) => {
            // P6 — member ordering by UTF-16 code units
            let mut keys: Vec<&String> = m.keys().collect();
            keys.sort_by(|a, b| {
                a.encode_utf16()
                    .collect::<Vec<u16>>()
                    .cmp(&b.encode_utf16().collect::<Vec<u16>>())
            });
            out.push('{');
            for (i, k) in keys.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                write_string(k, out);
                out.push(':');
                write_value(&m[*k], out)?;
            }
            out.push('}');
        }
    }
    Ok(())
}

/// P1 + P2 — integers only, within ±(2^53 − 1), emitted with no leading zeros and no `-0`.
fn write_number(n: &serde_json::Number) -> Result<String, String> {
    if let Some(i) = n.as_i64() {
        if !(-MAX_SAFE_INTEGER..=MAX_SAFE_INTEGER).contains(&i) {
            return Err(format!(
                "BCJ/1 P2: integer {i} outside ±(2^53−1) — artifact rejected (fail-closed)"
            ));
        }
        return Ok(i.to_string());
    }
    if let Some(u) = n.as_u64() {
        if u > MAX_SAFE_INTEGER as u64 {
            return Err(format!(
                "BCJ/1 P2: integer {u} outside ±(2^53−1) — artifact rejected (fail-closed)"
            ));
        }
        return Ok(u.to_string());
    }
    Err(format!(
        "BCJ/1 P1: non-integer number {n} — a canonicalizable BANZA artifact carries integers only \
         (fail-closed)"
    ))
}

/// RFC 8785 §3.2.2.2 minimal escaping. P5: no Unicode normalisation is applied.
fn write_string(s: &str, out: &mut String) {
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\u{0008}' => out.push_str("\\b"),
            '\u{0009}' => out.push_str("\\t"),
            '\u{000A}' => out.push_str("\\n"),
            '\u{000C}' => out.push_str("\\f"),
            '\u{000D}' => out.push_str("\\r"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn p6_member_order_is_independent_of_input_order() {
        let a: Value = serde_json::from_str(r#"{"b":1,"a":2,"z":{"y":1,"x":2}}"#).unwrap();
        let b: Value = serde_json::from_str(r#"{"z":{"x":2,"y":1},"a":2,"b":1}"#).unwrap();
        assert_eq!(
            canonicalize(&a, &[]).unwrap(),
            canonicalize(&b, &[]).unwrap()
        );
        assert_eq!(
            String::from_utf8(canonicalize(&a, &[]).unwrap()).unwrap(),
            r#"{"a":2,"b":1,"z":{"x":2,"y":1}}"#
        );
    }

    #[test]
    fn arrays_keep_their_order() {
        let v = json!({"a": [3, 1, 2]});
        assert_eq!(
            String::from_utf8(canonicalize(&v, &[]).unwrap()).unwrap(),
            r#"{"a":[3,1,2]}"#
        );
    }

    #[test]
    fn p1_rejects_non_integer_numbers() {
        let v: Value = serde_json::from_str(r#"{"amount": 1.5}"#).unwrap();
        assert!(canonicalize(&v, &[]).unwrap_err().contains("P1"));
    }

    #[test]
    fn p1_exponent_and_trailing_zero_forms_are_not_reintroduced() {
        // 1e2 parses to a float in serde_json → P1 rejects it rather than emitting 100.0
        let v: Value = serde_json::from_str(r#"{"n": 1e2}"#).unwrap();
        assert!(canonicalize(&v, &[]).is_err());
        // the integer form is accepted and emitted with no decimal point
        let v: Value = serde_json::from_str(r#"{"n": 100}"#).unwrap();
        assert_eq!(
            String::from_utf8(canonicalize(&v, &[]).unwrap()).unwrap(),
            r#"{"n":100}"#
        );
    }

    #[test]
    fn p2_rejects_integers_outside_the_safe_range() {
        let v: Value = serde_json::from_str(r#"{"n": 9007199254740992}"#).unwrap();
        assert!(canonicalize(&v, &[]).unwrap_err().contains("P2"));
        let v: Value = serde_json::from_str(r#"{"n": 9007199254740991}"#).unwrap();
        assert!(canonicalize(&v, &[]).is_ok());
    }

    #[test]
    fn p3_rejects_duplicate_members() {
        let e = parse_strict(r#"{"a":1,"a":2}"#).unwrap_err();
        assert!(e.contains("P3"), "{e}");
        // nested
        let e = parse_strict(r#"{"o":{"k":1,"k":2}}"#).unwrap_err();
        assert!(e.contains("P3"), "{e}");
        // a repeated name in *different* objects is legitimate
        assert!(parse_strict(r#"{"a":{"k":1},"b":{"k":2}}"#).is_ok());
        // a repeated value inside an array is legitimate
        assert!(parse_strict(r#"{"a":[{"k":1},{"k":2}]}"#).is_ok());
    }

    #[test]
    fn p4_unknown_members_are_preserved() {
        let v = json!({"known": 1, "unknown_extension": {"x": 2}});
        let s = String::from_utf8(canonicalize(&v, &[]).unwrap()).unwrap();
        assert!(s.contains("unknown_extension"));
    }

    #[test]
    fn p5_no_unicode_normalisation() {
        // "e" + combining acute (NFD) must NOT become the precomposed "é" (NFC)
        let nfd = json!({"k": "cafe\u{0301}"});
        let nfc = json!({"k": "caf\u{00e9}"});
        assert_ne!(
            canonicalize(&nfd, &[]).unwrap(),
            canonicalize(&nfc, &[]).unwrap(),
            "canonicalization must not normalise Unicode (P5)"
        );
    }

    #[test]
    fn escaping_is_rfc8785_minimal() {
        let v = json!({"k": "a\"b\\c\nd\u{0001}"});
        let out = String::from_utf8(canonicalize(&v, &[]).unwrap()).unwrap();
        // RFC 8785 minimal escaping, asserted per sequence so the expectation carries no raw
        // control character of its own.
        assert!(out.contains(r#"\""#), "quote must be escaped: {out}");
        assert!(out.contains(r#"\\"#), "backslash must be escaped: {out}");
        assert!(
            out.contains(r#"\n"#),
            "newline must use its short form: {out}"
        );
        assert!(
            out.contains(r#"\u0001"#),
            "C0 control must use lowercase \\u00xx: {out}"
        );
        assert!(
            !out.chars().any(|c| (c as u32) < 0x20),
            "no raw control character may survive canonicalization: {out}"
        );
    }

    #[test]
    fn excluded_members_are_removed_prior_to_canonicalization() {
        let v = json!({"a": 1, "signature": "zzz"});
        assert_eq!(
            String::from_utf8(canonicalize(&v, &["signature"]).unwrap()).unwrap(),
            r#"{"a":1}"#
        );
    }

    #[test]
    fn digest_is_lowercase_hex_over_canonical_bytes() {
        let d = digest(&json!({"a": 1}), &[]).unwrap();
        assert_eq!(d.len(), 64);
        assert_eq!(d, d.to_lowercase());
        // matches SHA-256 of the canonical bytes exactly
        use sha2::{Digest, Sha256};
        assert_eq!(d, format!("{:x}", Sha256::digest(br#"{"a":1}"#)));
    }
}
