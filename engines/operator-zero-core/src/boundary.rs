//! The demo boundary: the checks that stop this simulator from looking like a payment operator.
//!
//! This is the most important module in the crate. Everything else demonstrates the protocol; this
//! is what keeps the demonstration from being mistaken for the thing itself. It fails CLOSED — an
//! artifact that cannot be parsed, or that omits its marking, is a violation rather than a pass.

use crate::ledger::{DEMO_CURRENCY, FORBIDDEN_CURRENCIES};
use serde_json::{json, Value};

/// Substrings that indicate committed key material. Deliberately broad: a false positive costs a
/// rename, a false negative costs a leaked secret.
const SECRET_MARKERS: &[&str] = &[
    // Every entry below is a deny-list pattern this scanner looks FOR — none is a key.
    "-----BEGIN",   // deny-list pattern, forbidden in any artifact
    "PRIVATE KEY",  // deny-list pattern, forbidden in any artifact
    "private_key",  // deny-list pattern, forbidden in any artifact
    "privateKey",   // deny-list pattern, forbidden in any artifact
    "secret_key",   // deny-list pattern, forbidden in any artifact
    "secretKey",    // deny-list pattern, forbidden in any artifact
    "mnemonic",     // deny-list pattern, forbidden in any artifact
    "seed_phrase",  // deny-list pattern, forbidden in any artifact
    "seedPhrase",   // deny-list pattern, forbidden in any artifact
    "api_key",      // deny-list pattern, forbidden in any artifact
    "apiKey",       // deny-list pattern, forbidden in any artifact
    "password",     // deny-list pattern, forbidden in any artifact
    "passphrase",   // deny-list pattern, forbidden in any artifact
    "access_token", // deny-list pattern, forbidden in any artifact
    "accessToken",  // deny-list pattern, forbidden in any artifact
    "bearer ",      // deny-list pattern, forbidden in any artifact
];

/// Words a simulator may never apply to itself.
const FORBIDDEN_CLAIMS: &[&str] = &[
    "certificado",
    "certificada",
    "certified",
    "aprovado",
    "aprovada",
    "approved",
    "licenciado",
    "licenciada",
    "licensed",
    "autorizado",
    "autorizada",
    "authorised",
    "authorized",
];

/// One violation of the demo boundary.
#[derive(Debug, Clone, PartialEq)]
pub struct Violation {
    pub status: &'static str,
    pub detail: String,
    pub path: String,
}

/// Check one artifact. Returns every violation found — not the first, because an author fixing one
/// marking should see all of them rather than discovering them one build at a time.
pub fn check_artifact(name: &str, v: &Value) -> Vec<Violation> {
    let mut out = Vec::new();
    let at = |p: &str, s: &'static str, d: String| Violation {
        status: s,
        detail: d,
        path: format!("{name}{p}"),
    };

    // 1. The three markings must be PRESENT and correct. Absence is a violation, not a default:
    //    an unmarked artifact is exactly what a real operator's artifact looks like.
    match v.get("demo_only") {
        Some(Value::Bool(true)) => {}
        Some(other) => out.push(at(
            ".demo_only",
            "demo_boundary_missing_flag",
            format!("demo_only é {other}, tem de ser true"),
        )),
        None => out.push(at(
            ".demo_only",
            "demo_boundary_missing_flag",
            "demo_only ausente".into(),
        )),
    }
    match v.get("monetary_value") {
        Some(Value::Bool(false)) => {}
        Some(other) => out.push(at(
            ".monetary_value",
            "demo_boundary_missing_flag",
            format!("monetary_value é {other}, tem de ser false"),
        )),
        None => out.push(at(
            ".monetary_value",
            "demo_boundary_missing_flag",
            "monetary_value ausente".into(),
        )),
    }
    match v.get("production_allowed") {
        Some(Value::Bool(false)) => {}
        Some(Value::Bool(true)) => out.push(at(
            ".production_allowed",
            "demo_boundary_production_allowed",
            "production_allowed é true".into(),
        )),
        Some(other) => out.push(at(
            ".production_allowed",
            "demo_boundary_missing_flag",
            format!("production_allowed é {other}, tem de ser false"),
        )),
        None => out.push(at(
            ".production_allowed",
            "demo_boundary_missing_flag",
            "production_allowed ausente".into(),
        )),
    }

    // 2. Currency, wherever it appears at any depth.
    walk(v, "", &mut |path, node| {
        if let Some(c) = node.get("currency").and_then(|c| c.as_str()) {
            if c != DEMO_CURRENCY {
                // A recognised real currency and an unrecognised one are the same violation: the
                // only permitted value is KZ_DEMO. The known-real list exists to make the DETAIL
                // sharper, not to grade the verdict.
                let detail = if FORBIDDEN_CURRENCIES.contains(&c) {
                    format!("moeda real '{c}' — só {DEMO_CURRENCY} é permitida")
                } else {
                    format!("moeda '{c}' não reconhecida — só {DEMO_CURRENCY} é permitida")
                };
                out.push(at(
                    &format!("{path}.currency"),
                    "demo_boundary_real_currency",
                    detail,
                ));
            }
        }
    });

    // 3. Secrets, in keys or in string values. Walking the tree — rather than substring-matching the
    //    whole serialised artifact — is what tells a committed secret apart from an assertion that a
    //    secret is ABSENT. A flat scan flags both; a real leak and the sentence "Nenhuma private key
    //    real" (or a field literally named `forbidden_private_key_material_detected`) are opposites.
    //
    //    KEY:   a marker in an object key is a violation UNLESS the key ALSO carries an absence token —
    //           a field asserting a secret is forbidden/absent/not-detected is metadata, not a secret.
    //           (`private_key` → flags; `forbidden_private_key_material_detected` → safe.)
    //    VALUE: a marker in a string is a violation UNLESS a negation appears BEFORE its position in
    //           the string. (`-----BEGIN PRIVATE KEY-----` → flags; "Nenhuma private key real" → safe.)
    const KEY_ABSENCE_TOKENS: &[&str] = &[
        "forbidden",
        "detected",
        "absent",
        "missing",
        "none",
        "no_",
        "not_",
        "false",
        "nenhum",
        "sem",
    ];
    const VALUE_NEGATIONS: &[&str] = &[
        "não", "nao", "nunca", "never", "not ", "no ", "sem ", "nenhum", "nenhuma",
    ];
    walk(v, "", &mut |path, node| match node {
        Value::Object(map) => {
            for key in map.keys() {
                let lk = key.to_lowercase();
                if KEY_ABSENCE_TOKENS.iter().any(|t| lk.contains(t)) {
                    continue;
                }
                for m in SECRET_MARKERS {
                    if lk.contains(&m.to_lowercase()) {
                        out.push(at(
                            &format!("{path}.{key}"),
                            "demo_boundary_secret_present",
                            format!("marcador de segredo '{m}' na chave '{key}'"),
                        ));
                    }
                }
            }
        }
        Value::String(s) => {
            let ls = s.to_lowercase();
            for m in SECRET_MARKERS {
                let Some(i) = ls.find(&m.to_lowercase()) else {
                    continue;
                };
                let before = &ls[..i];
                let negated = VALUE_NEGATIONS.iter().any(|n| before.contains(n));
                if !negated {
                    out.push(at(
                        path,
                        "demo_boundary_secret_present",
                        format!("marcador de segredo '{m}' presente"),
                    ));
                }
            }
        }
        _ => {}
    });

    // 4. Status claims. A simulator that says it is certified is the failure this whole boundary
    //    exists to prevent, and it is the one most likely to arrive by careless copy.
    //
    //    Only STRING VALUES are scanned, never keys: `is_licensed_financial_operator` is structural
    //    (and its `false` is checked as data), while a sentence is where a claim actually lives.
    //    Within a string, a claim counts as negated when a negation appears BEFORE it — which is how
    //    the canonical disclaimers read ("não é operador financeiro licenciado"). A fixed character
    //    window was too brittle: that very sentence puts 26 characters between the two.
    walk(v, "", &mut |path, node| {
        let text = match node.as_str() {
            Some(t) => t.to_lowercase(),
            None => return,
        };
        for c in FORBIDDEN_CLAIMS {
            let Some(i) = text.find(c) else { continue };
            let before = &text[..i];
            let negated = ["não", "nao", "not ", "never", "nunca", "sem "]
                .iter()
                .any(|n| before.contains(n));
            if !negated {
                out.push(at(
                    path,
                    "demo_boundary_status_claim",
                    format!("afirmação de estatuto '{c}' sem negação"),
                ));
                return;
            }
        }
    });

    out
}

fn walk(v: &Value, path: &str, f: &mut impl FnMut(&str, &Value)) {
    f(path, v);
    match v {
        Value::Object(m) => {
            for (k, child) in m {
                walk(child, &format!("{path}.{k}"), f);
            }
        }
        Value::Array(a) => {
            for (i, child) in a.iter().enumerate() {
                walk(child, &format!("{path}[{i}]"), f);
            }
        }
        _ => {}
    }
}

/// The overall boundary verdict for a set of artifacts.
pub fn evaluate(artifacts: &[(String, Value)]) -> Value {
    let mut violations = Vec::new();
    for (name, v) in artifacts {
        for viol in check_artifact(name, v) {
            violations.push(json!({
                "status": viol.status,
                "status_label": crate::vocab::label(viol.status),
                "path": viol.path,
                "detail": viol.detail,
            }));
        }
    }
    let status = if violations.is_empty() {
        "demo_boundary_intact"
    } else {
        violations[0]["status"]
            .as_str()
            .unwrap_or("demo_boundary_missing_flag")
    };
    json!({
        "status": status,
        "status_label": crate::vocab::label(status),
        "intact": violations.is_empty(),
        "artifacts_checked": artifacts.len(),
        "violations": violations,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ok_artifact() -> Value {
        json!({
            "operator_id": "operator-zero",
            "demo_only": true,
            "monetary_value": false,
            "production_allowed": false,
            "currency": "KZ_DEMO",
            "note": "Este simulador não é certificado nem aprovado por ninguém.",
        })
    }

    #[test]
    fn a_correctly_marked_artifact_passes() {
        assert!(check_artifact("a", &ok_artifact()).is_empty());
        assert_eq!(evaluate(&[("a".into(), ok_artifact())])["intact"], true);
    }

    #[test]
    fn a_missing_marking_is_a_violation_not_a_default() {
        for key in ["demo_only", "monetary_value", "production_allowed"] {
            let mut a = ok_artifact();
            a.as_object_mut().unwrap().remove(key);
            let v = check_artifact("a", &a);
            assert!(!v.is_empty(), "removing {key} was accepted");
        }
    }

    #[test]
    fn an_inverted_marking_is_a_violation() {
        let mut a = ok_artifact();
        a["demo_only"] = json!(false);
        assert!(!check_artifact("a", &a).is_empty());

        let mut b = ok_artifact();
        b["production_allowed"] = json!(true);
        let v = check_artifact("b", &b);
        assert_eq!(v[0].status, "demo_boundary_production_allowed");

        let mut c = ok_artifact();
        c["monetary_value"] = json!(true);
        assert!(!check_artifact("c", &c).is_empty());
    }

    #[test]
    fn a_real_currency_is_refused_at_any_depth() {
        for cur in ["AOA", "USD", "EUR"] {
            let mut a = ok_artifact();
            a["transactions"] = json!([{ "amount": 100, "currency": cur }]);
            let v = check_artifact("a", &a);
            assert!(
                v.iter().any(|x| x.status == "demo_boundary_real_currency"),
                "currency {cur} was accepted"
            );
        }
    }

    #[test]
    fn a_secret_is_detected_in_a_key_or_a_value() {
        let mut a = ok_artifact();
        a["private_key"] = json!("x");
        assert!(check_artifact("a", &a)
            .iter()
            .any(|v| v.status == "demo_boundary_secret_present"));

        let mut b = ok_artifact();
        b["blob"] = json!("-----BEGIN PRIVATE KEY-----\nMIIE..."); // TEST ONLY placeholder, not a key
        assert!(check_artifact("b", &b)
            .iter()
            .any(|v| v.status == "demo_boundary_secret_present"));

        let mut c = ok_artifact();
        c["auth"] = json!({ "nested": { "apiKey": "sk-live-xxx" } });
        assert!(check_artifact("c", &c)
            .iter()
            .any(|v| v.status == "demo_boundary_secret_present"));
    }

    #[test]
    fn a_key_asserting_absence_of_a_secret_is_not_a_violation() {
        // A field NAME that asserts a secret is forbidden/absent is metadata about the boundary, not a
        // committed secret — even though it contains the substring `private_key`.
        let mut a = ok_artifact();
        a["forbidden_private_key_material_detected"] = json!(false);
        assert!(
            !check_artifact("a", &a)
                .iter()
                .any(|v| v.status == "demo_boundary_secret_present"),
            "an absence-assertion key was wrongly flagged as a secret"
        );
    }

    #[test]
    fn a_value_negating_a_secret_is_not_a_violation() {
        // The canonical limitations text says a secret is ABSENT; the negation before the marker must
        // keep it from being read as a leak.
        let mut a = ok_artifact();
        a["limitation"] = json!("Nenhuma private key real: apenas material público.");
        assert!(
            !check_artifact("a", &a)
                .iter()
                .any(|v| v.status == "demo_boundary_secret_present"),
            "a negated absence-assertion value was wrongly flagged as a secret"
        );
    }

    #[test]
    fn a_status_claim_is_refused_but_a_disclaimer_is_not() {
        let mut claim = ok_artifact();
        claim["state"] = json!("operador certificado pelo protocolo");
        let v = check_artifact("a", &claim);
        assert!(!v.is_empty(), "a claim was accepted");
        assert_eq!(v[0].status, "demo_boundary_status_claim");

        // The canonical disclaimers must NOT trip it, or every artifact would have to omit the very
        // sentence that makes the boundary clear.
        for phrase in [
            "não é certificado",
            "nao e certificado",
            "not certified",
            "isto não certifica o operador",
            "nunca aprovado",
            // The canonical boundary sentence — 26 characters between the negation and the claim.
            "O Operador Zero não é banco, não é PSP, não é carteira, não é operador financeiro licenciado.",
        ] {
            let mut d = ok_artifact();
            d["note"] = json!(phrase);
            assert!(
                check_artifact("d", &d).is_empty(),
                "disclaimer '{phrase}' was treated as a claim"
            );
        }
    }

    #[test]
    fn the_verdict_names_the_first_violation_rather_than_a_generic_failure() {
        let mut a = ok_artifact();
        a["production_allowed"] = json!(true);
        let r = evaluate(&[("a".into(), a)]);
        assert_eq!(r["intact"], false);
        assert_eq!(r["status"], "demo_boundary_production_allowed");
        assert!(!r["status_label"].as_str().unwrap().is_empty());
    }
}
