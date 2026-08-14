//! banza-trust M2.4 — the active-model trust evaluation.
//!
//! Verifies the operator's published trust material against the open-protocol model: trust root
//! metadata → delegated signing key → signed protocol metadata (Ed25519), bound to the operator
//! manifest, conformance evidence, public protocol registry entry and revocation status. Every branch
//! is **fail-closed**. The status is computed HERE, in Rust — never in TypeScript. No certificate, no
//! CA signature, no human approval; nothing authorises, certifies or approves an operator.

use crate::{canonical_bytes, verify_ed25519};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

/// The eleven trust statuses (fail-closed model).
pub const STATUS_VALUES: &[&str] = &[
    "TRUST_VALID",
    "TRUST_INVALID_SIGNATURE",
    "TRUST_INVALID_DELEGATED_KEY",
    "TRUST_INVALID_ROOT_METADATA",
    "TRUST_INVALID_SIGNED_METADATA",
    "TRUST_MISSING_CONFORMANCE_EVIDENCE",
    "TRUST_MISSING_OPERATOR_MANIFEST",
    "TRUST_MISSING_REGISTRY_ENTRY",
    "TRUST_REVOKED",
    "TRUST_EXPIRED_METADATA",
    "TRUST_INCOMPATIBLE_PROTOCOL_VERSION",
    "TRUST_FAIL_CLOSED",
    "TRUST_INVALID_BOUNDARY",
];

const DISCLAIMER: &str = "Trust engine report descreve a verificação do modelo activo de trust do \
protocolo financeiro aberto BANZA. Não é autorização de operador, não é certificação, não é licença e \
não permite prestação de serviços financeiros pelo BANZA.";

const PROTOCOL_STANCE: &str = "BANZA é um protocolo financeiro aberto. Operadores independentes \
implementam o protocolo, publicam manifests e demonstram compatibilidade por evidência verificável de \
conformidade. O trust do protocolo é avaliado por signed protocol metadata, delegated signing keys, \
public protocol registry e revocation/fail-closed.";

fn obj(v: &Value, k: &str) -> Option<Value> {
    v.get(k).filter(|x| x.is_object()).cloned()
}
fn s<'a>(v: &'a Value, k: &str) -> Option<&'a str> {
    v.get(k).and_then(|x| x.as_str())
}
fn present_nonempty(v: &Value, k: &str) -> bool {
    match v.get(k) {
        Some(Value::Object(m)) => !m.is_empty(),
        Some(Value::Array(a)) => !a.is_empty(),
        Some(Value::String(x)) => !x.is_empty(),
        _ => false,
    }
}
fn major(version: &str) -> &str {
    version.split('.').next().unwrap_or("")
}

/// A boundary violation: any input asserts an operator certificate, certification, licence, PSP status
/// or human approval. Boolean claim flags OR affirmative phrasing (guarded against negation).
fn boundary_violated(input: &Value) -> Option<String> {
    const CLAIM_FLAGS: &[&str] = &[
        "is_operator_certificate",
        "is_certificate",
        "authorises_operator",
        "certifies_operator",
        "approves_operator",
        "accepts_operator",
        "is_payment_licence",
        "is_psp_authorisation",
        "requires_human_approval",
        "certificate_based_trust",
    ];
    const AFFIRMATIVE: &[&str] = &[
        "operator certificate",
        "certified operator",
        "ca signature",
        "payment licence",
        "payment license",
        "psp authorisation",
        "psp authorization",
        "human approval",
    ];
    let mut hit: Option<String> = None;
    walk(input, &mut |v| {
        if hit.is_some() {
            return;
        }
        if let Value::Object(map) = v {
            // F3: a forbidden claim flag violates when present with ANY meaningful value — not only
            // Bool(true) — so `{"is_operator_certificate": 1}` / `"yes"` / `1.0` cannot evade it.
            for f in CLAIM_FLAGS {
                if map.get(*f).map(flag_asserted).unwrap_or(false) {
                    hit = Some(format!("boundary claim flag '{f}' is asserted"));
                    return;
                }
            }
        }
        if let Value::String(text) = v {
            let low = text.to_lowercase();
            for phrase in AFFIRMATIVE {
                // F2: the negation must PRECEDE the phrase within its own clause — a stray negation
                // elsewhere in the string (e.g. "operator certificate … no disputes") no longer clears it.
                if let Some(pos) = low.find(phrase) {
                    if !negated_before(&low, pos) {
                        hit = Some(format!("affirmative boundary claim: '{phrase}'"));
                        return;
                    }
                }
            }
        }
    });
    hit
}
/// A JSON value that meaningfully asserts a claim: anything but false / null / 0 / "" / "false" / "no".
fn flag_asserted(v: &Value) -> bool {
    match v {
        Value::Bool(b) => *b,
        Value::Null => false,
        Value::Number(n) => n.as_f64().map(|x| x != 0.0).unwrap_or(true),
        Value::String(s) => {
            let l = s.trim().to_lowercase();
            !(l.is_empty() || l == "false" || l == "no" || l == "0" || l == "null")
        }
        _ => true, // arrays/objects present = asserted
    }
}
/// True when a negation token appears in the clause immediately before `pos` (proximity-scoped):
/// scan back to the previous clause delimiter (. ; newline) and look for a negation there.
fn negated_before(low: &str, pos: usize) -> bool {
    let clause_start = low[..pos]
        .rfind(['.', ';', '\n'])
        .map(|i| i + 1)
        .unwrap_or(0);
    let prefix = &low[clause_start..pos];
    [
        "não", "nao", "nunca", "never", "not ", "no ", "sem ", "isn't", "n't",
    ]
    .iter()
    .any(|n| prefix.contains(n))
}
fn walk(v: &Value, f: &mut impl FnMut(&Value)) {
    f(v);
    match v {
        Value::Object(m) => m.values().for_each(|x| walk(x, f)),
        Value::Array(a) => a.iter().for_each(|x| walk(x, f)),
        _ => {}
    }
}

fn in_window(evaluated_at: &str, valid_from: Option<&str>, valid_until: Option<&str>) -> bool {
    // ISO-8601 UTC strings of the same shape compare lexicographically.
    let from_ok = valid_from.map(|f| f <= evaluated_at).unwrap_or(true);
    let until_ok = valid_until.map(|u| evaluated_at <= u).unwrap_or(false);
    from_ok && until_ok
}

/// F1: the trust root metadata must carry `root_signatures` that verify under a THRESHOLD of distinct
/// root public keys over its own canonical form (excluding `root_signatures`). Candidate keys are the
/// evaluator's pinned anchor when supplied, otherwise the root's declared `active_root_public_keys`.
/// Fail-closed: no signatures, too few distinct verifying keys, or a bad threshold → not verified.
fn root_threshold_signatures_ok(root: &Value, pinned: &[String]) -> bool {
    let declared: Vec<String> = root
        .get("active_root_public_keys")
        .and_then(|k| k.as_array())
        .map(|a| {
            a.iter()
                .filter_map(|x| x.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    // If the evaluator pinned an anchor, only keys in BOTH the pin and the declared set may count.
    let candidates: Vec<String> = if pinned.is_empty() {
        declared
    } else {
        declared
            .into_iter()
            .filter(|k| pinned.contains(k))
            .collect()
    };
    if candidates.is_empty() {
        return false;
    }
    let min_sigs = root
        .get("threshold_policy")
        .and_then(|t| t.get("min_signatures"))
        .and_then(|n| n.as_u64())
        .unwrap_or(0);
    if min_sigs == 0 {
        return false;
    }
    let sigs: Vec<&str> = root
        .get("root_signatures")
        .and_then(|s| s.as_array())
        .map(|a| a.iter().filter_map(|x| x.as_str()).collect())
        .unwrap_or_default();
    if sigs.is_empty() {
        return false;
    }
    // Fail-closed (spec/canonicalization.md §7): a root metadata document that BCJ/1 rejects is not
    // anchored. It is not treated as "anchored over empty bytes".
    let msg = match canonical_bytes(root, &["root_signatures"]) {
        Ok(m) => m,
        Err(_) => return false,
    };
    let mut verified: Vec<&String> = Vec::new();
    for key in &candidates {
        if verified.contains(&key) {
            continue;
        }
        if sigs
            .iter()
            .any(|sig| verify_ed25519(key, sig, &msg).is_ok())
        {
            verified.push(key);
        }
    }
    verified.len() as u64 >= min_sigs
}

/// Evaluate the operator's published trust material. Returns the full UI-ready report (status in Rust).
pub fn evaluate_trust(input: &Value) -> Value {
    if !input.is_object() {
        return report(
            "TRUST_FAIL_CLOSED",
            "input is not an object (fail-closed)",
            &json!({}),
        );
    }

    let evaluated_at = s(input, "evaluated_at").unwrap_or("");
    let evaluator_version = s(input, "evaluator_protocol_version").unwrap_or("1.0.0");
    let root = obj(input, "trust_root_metadata");
    let dkey = obj(input, "delegated_signing_key");
    let meta = obj(input, "signed_protocol_metadata");
    let manifest = obj(input, "operator_manifest");
    let evidence = obj(input, "conformance_evidence");
    let registry = obj(input, "public_registry_entry");
    let revocation = obj(input, "revocation_status");

    // ── per-field checks ──────────────────────────────────────────────────────
    // Boundary: nothing may claim certificate/approval/licence/PSP.
    let boundary = boundary_violated(input);
    let boundary_status = if boundary.is_none() {
        "VALID"
    } else {
        "INVALID"
    };

    // Trust root metadata: active roots + threshold + version + validity.
    // The evaluator's out-of-band pinned root anchor (F1). When present, root signatures must verify
    // under these keys — an attacker-supplied root signed only by its own keys cannot pass.
    let pinned_roots: Vec<String> = input
        .get("trusted_root_public_keys")
        .and_then(|k| k.as_array())
        .map(|a| {
            a.iter()
                .filter_map(|x| x.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    let root_ok = root
        .as_ref()
        .map(|r| {
            present_nonempty(r, "active_root_public_keys")
                && r.get("threshold_policy")
                    .map(|t| t.is_object())
                    .unwrap_or(false)
                && s(r, "trust_root_version")
                    .map(|v| !v.is_empty())
                    .unwrap_or(false)
                && root_threshold_signatures_ok(r, &pinned_roots)
        })
        .unwrap_or(false);
    let root_metadata_status = if root_ok { "VALID" } else { "INVALID" };

    // Signed protocol metadata present + carries a signature.
    let meta_present = meta
        .as_ref()
        .map(|m| s(m, "signature").map(|x| !x.is_empty()).unwrap_or(false))
        .unwrap_or(false);
    let signed_metadata_status = if meta_present { "VALID" } else { "INVALID" };

    // Delegated signing key: listed by the root, correct usage, in window, not revoked, root-signed.
    let dkey_status = delegated_key_status(&root, &dkey, evaluated_at);

    // Signature of the signed metadata under the delegated key's public key.
    let signature_ok = match (&dkey, &meta) {
        (Some(dk), Some(m)) if meta_present => {
            let pk = s(dk, "public_key").unwrap_or("");
            let sig = s(m, "signature").unwrap_or("");
            // Fail-closed: a document BCJ/1 rejects has no valid signature by definition.
            canonical_bytes(m, &["signature"])
                .map(|msg| verify_ed25519(pk, sig, &msg).is_ok())
                .unwrap_or(false)
        }
        _ => false,
    };
    let signature_status = if signature_ok { "VALID" } else { "INVALID" };

    // Freshness of the signed metadata.
    let freshness_ok = meta
        .as_ref()
        .map(|m| in_window(evaluated_at, s(m, "valid_from"), s(m, "valid_until")))
        .unwrap_or(false);
    let metadata_freshness_status = if freshness_ok { "VALID" } else { "EXPIRED" };

    // Protocol version compatibility (same major).
    let compat_ok = meta
        .as_ref()
        .and_then(|m| s(m, "protocol_version"))
        .map(|pv| major(pv) == major(evaluator_version))
        .unwrap_or(false);
    let protocol_compatibility_status = if compat_ok { "VALID" } else { "INCOMPATIBLE" };

    // Operator manifest bound by hash.
    let manifest_ok = match (&manifest, &meta) {
        (Some(mf), Some(m)) => {
            present_nonempty(mf, "operator_id")
                && s(mf, "manifest_hash") == s(m, "operator_manifest_hash")
                && s(mf, "manifest_hash")
                    .map(|h| !h.is_empty())
                    .unwrap_or(false)
        }
        _ => false,
    };
    let manifest_status = if manifest_ok { "VALID" } else { "MISSING" };

    // Conformance evidence bound by hash.
    let evidence_ok = match (&evidence, &meta) {
        (Some(ev), Some(m)) => {
            s(ev, "evidence_hash") == s(m, "conformance_evidence_hash")
                && s(ev, "evidence_hash")
                    .map(|h| !h.is_empty())
                    .unwrap_or(false)
        }
        _ => false,
    };
    let conformance_evidence_status = if evidence_ok { "VALID" } else { "MISSING" };

    // Public protocol registry entry present + bound to the operator.
    let registry_ok = match (&registry, &manifest) {
        (Some(re), Some(mf)) => {
            present_nonempty(re, "operator_id") && s(re, "operator_id") == s(mf, "operator_id")
        }
        _ => false,
    };
    let registry_status = if registry_ok { "VALID" } else { "MISSING" };

    // Revocation: fail-closed. Missing/unverifiable material or revoked → not trusted.
    let (revoked, revocation_material_ok) = revocation
        .as_ref()
        .map(|r| {
            let revoked = r.get("revoked").map(flag_asserted).unwrap_or(false);
            let material_ok = s(r, "revocation_list_version")
                .map(|v| !v.is_empty())
                .unwrap_or(false)
                && s(r, "signed_by_revocation_key")
                    .map(|v| !v.is_empty())
                    .unwrap_or(false);
            (revoked, material_ok)
        })
        .unwrap_or((false, false));
    let revocation_status_str = if revoked {
        "REVOKED"
    } else if revocation_material_ok {
        "CLEAR"
    } else {
        "UNVERIFIABLE"
    };

    // ── fail-closed precedence ─────────────────────────────────────────────────
    let trust_status = if boundary.is_some() {
        "TRUST_INVALID_BOUNDARY"
    } else if !root_ok {
        "TRUST_INVALID_ROOT_METADATA"
    } else if !meta_present {
        "TRUST_INVALID_SIGNED_METADATA"
    } else if dkey_status != "VALID" {
        "TRUST_INVALID_DELEGATED_KEY"
    } else if !signature_ok {
        "TRUST_INVALID_SIGNATURE"
    } else if !freshness_ok {
        "TRUST_EXPIRED_METADATA"
    } else if !compat_ok {
        "TRUST_INCOMPATIBLE_PROTOCOL_VERSION"
    } else if !manifest_ok {
        "TRUST_MISSING_OPERATOR_MANIFEST"
    } else if !evidence_ok {
        "TRUST_MISSING_CONFORMANCE_EVIDENCE"
    } else if !registry_ok {
        "TRUST_MISSING_REGISTRY_ENTRY"
    } else if revoked || !revocation_material_ok {
        "TRUST_REVOKED"
    } else {
        "TRUST_VALID"
    };

    let fail_closed_required = trust_status != "TRUST_VALID";
    let detail = boundary.unwrap_or_else(|| status_detail(trust_status));

    let checks = json!({
        "boundary_status": boundary_status,
        "root_metadata_status": root_metadata_status,
        "signed_metadata_status": signed_metadata_status,
        "delegated_key_status": dkey_status,
        "signature_status": signature_status,
        "metadata_freshness_status": metadata_freshness_status,
        "protocol_compatibility_status": protocol_compatibility_status,
        "manifest_status": manifest_status,
        "conformance_evidence_status": conformance_evidence_status,
        "registry_status": registry_status,
        "revocation_status": revocation_status_str,
        "fail_closed_required": fail_closed_required,
    });
    report(trust_status, &detail, &checks)
}

/// The ten canonical Open Trust Evaluation checks (contracts/production/federation-trust-evaluation
/// .production.schema.json, ADR-025). `evaluate_federation_ote` runs all ten fail-closed and emits the
/// canonical outcome ROUTING_ALLOWED / FAIL_CLOSED — the trust-chain sub-evaluation (`evaluate_trust`)
/// covers eight; this layer adds `capabilities_compatible`, `endpoint_contract_compatible`, and an
/// AUTHENTICATED `not_revoked` (a revocation-domain-signed BRL, never a self-published flag).
pub const OTE_CHECKS: &[&str] = &[
    "valid_operator_manifest",
    "compatible_protocol_version",
    "signed_protocol_metadata",
    "conformance_evidence_valid",
    "trust_root_or_delegated_signature_valid",
    "not_revoked",
    "capabilities_compatible",
    "endpoint_contract_compatible",
    "evidence_freshness_within_policy",
    "fail_closed_on_missing_or_invalid",
];

/// Full federation Open Trust Evaluation (ADR-025): the ten conjunctive, fail-closed checks producing the
/// canonical outcome `ROUTING_ALLOWED` (iff all ten pass) or `FAIL_CLOSED` (any other case). Trust valid
/// ≠ routing allowed: an implementation can hold valid trust and still fail capability/endpoint/revocation.
/// The `not_revoked` check is AUTHENTICATED — it verifies a revocation-domain-signed BANZA Revocation List
/// (INV-ROOT-005) and checks the evaluated operator/key is absent from it, fail-closed on missing/invalid
/// BRL material; it does NOT trust a self-published `revoked` flag.
///
/// Input (superset of `evaluate_trust`): + `intended_capabilities` (array, default
/// `["cross_operator_routing"]`), `revocation_list` (the signed BRL doc), `revocation_key_public`
/// (the revocation-domain delegated public key, base64url).
pub fn evaluate_federation_ote(input: &Value) -> Value {
    if !input.is_object() {
        return ote_report(
            "FAIL_CLOSED",
            OTE_CHECKS,
            "input is not an object (fail-closed)",
        );
    }
    let trust = evaluate_trust(input);
    let tc = trust.get("checks").cloned().unwrap_or_else(|| json!({}));
    let vok = |k: &str| tc.get(k).and_then(|x| x.as_str()) == Some("VALID");

    // ── the eight trust-chain checks, mapped to the canonical names ──
    let valid_operator_manifest = vok("manifest_status");
    let compatible_protocol_version = vok("protocol_compatibility_status");
    let signed_protocol_metadata = vok("signed_metadata_status") && vok("signature_status");
    let conformance_evidence_valid = vok("conformance_evidence_status");
    let trust_root_or_delegated_signature_valid =
        vok("root_metadata_status") && vok("delegated_key_status") && vok("signature_status");
    let evidence_freshness_within_policy = vok("metadata_freshness_status");

    // ── not_revoked: AUTHENTICATED against a revocation-domain-signed BRL (fail-closed) ──
    let not_revoked = authenticated_not_revoked(input);

    // ── capabilities_compatible: declared capabilities cover the intended interaction ──
    let capabilities_compatible = capabilities_compatible(input);

    // ── endpoint_contract_compatible: published endpoints satisfy the contract for those capabilities ──
    let endpoint_contract_compatible = endpoint_contract_compatible(input);

    // ── fail_closed_on_missing_or_invalid: the meta-rule — true iff no material is missing/invalid ──
    let fail_closed_on_missing_or_invalid = valid_operator_manifest
        && compatible_protocol_version
        && signed_protocol_metadata
        && conformance_evidence_valid
        && trust_root_or_delegated_signature_valid
        && not_revoked
        && capabilities_compatible
        && endpoint_contract_compatible
        && evidence_freshness_within_policy;

    let results = [
        ("valid_operator_manifest", valid_operator_manifest),
        ("compatible_protocol_version", compatible_protocol_version),
        ("signed_protocol_metadata", signed_protocol_metadata),
        ("conformance_evidence_valid", conformance_evidence_valid),
        (
            "trust_root_or_delegated_signature_valid",
            trust_root_or_delegated_signature_valid,
        ),
        ("not_revoked", not_revoked),
        ("capabilities_compatible", capabilities_compatible),
        ("endpoint_contract_compatible", endpoint_contract_compatible),
        (
            "evidence_freshness_within_policy",
            evidence_freshness_within_policy,
        ),
        (
            "fail_closed_on_missing_or_invalid",
            fail_closed_on_missing_or_invalid,
        ),
    ];
    let failed: Vec<String> = results
        .iter()
        .filter(|(_, ok)| !ok)
        .map(|(k, _)| (*k).to_string())
        .collect();
    let outcome = if failed.is_empty() {
        "ROUTING_ALLOWED"
    } else {
        "FAIL_CLOSED"
    };
    let checks: serde_json::Map<String, Value> = results
        .iter()
        .map(|(k, ok)| ((*k).to_string(), Value::Bool(*ok)))
        .collect();
    let mut body = json!({
        "schema": "federation-trust-evaluation/1",
        "outcome": outcome,
        "checks": Value::Object(checks),
        "failed_checks": failed,
        "trust_status": trust.get("trust_status").cloned().unwrap_or(Value::Null),
        "boundary": {
            "routing_allowed_is_not_certification": true,
            "routing_allowed_is_not_regulatory_authorisation": true,
            "routing_allowed_is_not_scheme_admission": true,
            "routing_allowed_is_not_a_mandate_to_route": true,
            "evaluation_is_local_and_directional": true
        },
        "flags": boundary_flags(),
        "protocol_stance": PROTOCOL_STANCE,
        "production_disclaimer": DISCLAIMER,
        "tool": "banza-trust",
        "tool_version": crate::VERIFIER_VERSION,
        "test_only": true,
        "llm_calls": 0,
        "external_model_called": false,
    });
    let hash = format!(
        "{:x}",
        Sha256::digest(
            canonical_bytes(&body, &["report_hash"])
                .expect("BCJ/1: an engine-constructed report body is always canonicalizable")
        )
    );
    body["report_hash"] = Value::String(hash);
    body
}

/// AUTHENTICATED revocation check: fail-closed unless a revocation-domain-signed BRL is present, verifies,
/// and does NOT list the evaluated operator/key/artifact. A self-published `revoked` flag is never trusted.
fn authenticated_not_revoked(input: &Value) -> bool {
    let list = match obj(input, "revocation_list") {
        Some(l) => l,
        None => return false, // missing BRL material → fail-closed
    };
    let key = match s(input, "revocation_key_public") {
        Some(k) if !k.is_empty() => k.to_string(),
        _ => return false, // no revocation-domain key to verify under → fail-closed
    };
    // The BRL signature must verify under the revocation-domain delegated key (INV-ROOT-005).
    let verified = crate::verify_revocation_list(&list, &key);
    if !verified.verified {
        return false;
    }
    // Freshness: an expired BRL is stale → fail-closed.
    let evaluated_at = s(input, "evaluated_at").unwrap_or("");
    if let Some(expires) = s(&list, "expires_at") {
        if !evaluated_at.is_empty() && evaluated_at >= expires {
            return false;
        }
    }
    // Membership: the evaluated operator/key must be absent from the verified `revoked` array.
    let evaluated_operator = s(input, "evaluated_operator_id")
        .or_else(|| {
            input
                .get("signed_protocol_metadata")
                .and_then(|m| s(m, "operator_id"))
        })
        .unwrap_or("");
    let evaluated_key = input
        .get("delegated_signing_key")
        .and_then(|d| s(d, "delegated_key_id"))
        .unwrap_or("");
    let listed = list
        .get("revoked")
        .and_then(|r| r.as_array())
        .map(|arr| {
            arr.iter().any(|e| {
                let op = s(e, "operator_id").unwrap_or("");
                let kid = s(e, "key_id").or_else(|| s(e, "revoked_ref")).unwrap_or("");
                (!evaluated_operator.is_empty() && op == evaluated_operator)
                    || (!evaluated_key.is_empty() && kid == evaluated_key)
            })
        })
        .unwrap_or(false);
    !listed
}

/// capabilities_compatible: the declared capabilities cover the intended interaction. The intended
/// capabilities default to `["cross_operator_routing"]`; the declared set is the signed metadata
/// `capabilities` (falling back to the manifest federation capability flags).
fn capabilities_compatible(input: &Value) -> bool {
    let intended: Vec<String> = input
        .get("intended_capabilities")
        .and_then(|a| a.as_array())
        .map(|a| {
            a.iter()
                .filter_map(|x| x.as_str().map(String::from))
                .collect()
        })
        .filter(|v: &Vec<String>| !v.is_empty())
        .unwrap_or_else(|| vec!["cross_operator_routing".to_string()]);
    let declared: Vec<String> = input
        .get("signed_protocol_metadata")
        .and_then(|m| m.get("capabilities"))
        .and_then(|c| c.as_array())
        .map(|a| {
            a.iter()
                .filter_map(|x| x.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    let manifest = obj(input, "operator_manifest");
    let manifest_flag = |k: &str| {
        manifest
            .as_ref()
            .and_then(|m| m.get(k))
            .map(flag_asserted)
            .unwrap_or(false)
    };
    intended.iter().all(|cap| {
        declared.iter().any(|d| d == cap)
            || (cap == "cross_operator_routing" && manifest_flag("cross_operator_routing"))
            || (cap == "cross_operator_settlement" && manifest_flag("cross_operator_settlement"))
    })
}

/// endpoint_contract_compatible: the manifest publishes an interop endpoint that is a non-empty HTTPS URL
/// (origin-bound), satisfying the contract surface for the declared federation capabilities.
fn endpoint_contract_compatible(input: &Value) -> bool {
    let manifest = match obj(input, "operator_manifest") {
        Some(m) => m,
        None => return false,
    };
    let endpoint = s(&manifest, "interop_endpoint").unwrap_or("");
    if !endpoint.starts_with("https://") {
        return false;
    }
    // The manifest must declare federation support (the surface the endpoint serves).
    manifest
        .get("supports_federation")
        .map(flag_asserted)
        .unwrap_or(false)
        || manifest.get("federation_capabilities").is_some()
}

fn ote_report(outcome: &str, checks: &[&str], detail: &str) -> Value {
    let failed: Vec<String> = checks.iter().map(|c| c.to_string()).collect();
    let checkmap: serde_json::Map<String, Value> = checks
        .iter()
        .map(|c| (c.to_string(), Value::Bool(false)))
        .collect();
    json!({
        "schema": "federation-trust-evaluation/1",
        "outcome": outcome,
        "checks": Value::Object(checkmap),
        "failed_checks": failed,
        "detail": detail,
        "tool": "banza-trust",
        "test_only": true,
        "llm_calls": 0,
    })
}

fn delegated_key_status(root: &Option<Value>, dkey: &Option<Value>, evaluated_at: &str) -> String {
    let (Some(root), Some(dk)) = (root, dkey) else {
        return "MISSING".into();
    };
    let id = s(dk, "delegated_key_id").unwrap_or("");
    let pk = s(dk, "public_key").unwrap_or("");
    if id.is_empty() || pk.is_empty() {
        return "INVALID".into();
    }
    // Must be listed by the trust root with matching id + public key.
    let listed = root
        .get("delegated_signing_keys")
        .and_then(|k| k.as_array())
        .map(|arr| {
            arr.iter()
                .any(|e| s(e, "delegated_key_id") == Some(id) && s(e, "public_key") == Some(pk))
        })
        .unwrap_or(false);
    if !listed {
        return "NOT_LISTED_BY_ROOT".into();
    }
    if dk.get("revoked").map(flag_asserted).unwrap_or(false) {
        return "REVOKED".into();
    }
    if !dk
        .get("signed_by_root_threshold")
        .map(flag_asserted)
        .unwrap_or(false)
    {
        return "NOT_ROOT_SIGNED".into();
    }
    let usage_ok = dk
        .get("allowed_usages")
        .and_then(|u| u.as_array())
        .map(|a| {
            a.iter()
                .any(|x| x.as_str() == Some("signed_protocol_metadata"))
        })
        .unwrap_or(false);
    if !usage_ok {
        return "WRONG_USAGE".into();
    }
    if !in_window(evaluated_at, s(dk, "valid_from"), s(dk, "valid_until")) {
        return "EXPIRED".into();
    }
    "VALID".into()
}

fn status_detail(status: &str) -> String {
    match status {
        "TRUST_VALID" => "signed protocol metadata verifies under a delegated key listed by the trust root; manifest, conformance evidence and registry entry bound; not revoked; fresh; compatible",
        "TRUST_INVALID_ROOT_METADATA" => "trust root metadata is absent or malformed (fail-closed)",
        "TRUST_INVALID_SIGNED_METADATA" => "signed protocol metadata is absent or carries no signature (fail-closed)",
        "TRUST_INVALID_DELEGATED_KEY" => "delegated signing key is not listed by the trust root, revoked, expired, root-unsigned or lacks metadata-signing usage",
        "TRUST_INVALID_SIGNATURE" => "signed protocol metadata signature does not verify under the delegated key",
        "TRUST_EXPIRED_METADATA" => "signed protocol metadata is outside its validity window",
        "TRUST_INCOMPATIBLE_PROTOCOL_VERSION" => "signed protocol metadata protocol_version is incompatible with the evaluator",
        "TRUST_MISSING_OPERATOR_MANIFEST" => "operator manifest is absent or its hash does not match the signed metadata",
        "TRUST_MISSING_CONFORMANCE_EVIDENCE" => "conformance evidence is absent or its hash does not match the signed metadata",
        "TRUST_MISSING_REGISTRY_ENTRY" => "public protocol registry entry is absent or not bound to the operator",
        "TRUST_REVOKED" => "the operator or its trust material is revoked, or revocation material is unverifiable (fail-closed)",
        "TRUST_FAIL_CLOSED" => "trust material missing, malformed or invalid (fail-closed)",
        _ => "fail-closed",
    }
    .to_string()
}

fn report(status: &str, detail: &str, checks: &Value) -> Value {
    let mut body = json!({
        "trust_status": status,
        "detail": detail,
        "checks": checks,
        "flags": boundary_flags(),
        "protocol_stance": PROTOCOL_STANCE,
        "production_disclaimer": DISCLAIMER,
        "tool": "banza-trust",
        "tool_version": crate::VERIFIER_VERSION,
        "test_only": true,
        "llm_calls": 0,
        "external_model_called": false,
    });
    let hash = format!(
        "{:x}",
        Sha256::digest(
            canonical_bytes(&body, &["report_hash"])
                .expect("BCJ/1: an engine-constructed report body is always canonicalizable")
        )
    );
    body["report_hash"] = Value::String(hash);
    body
}

fn boundary_flags() -> Value {
    json!({
        "open_financial_protocol": true,
        "central_operator_authority": false,
        "human_operator_approval_required": false,
        "operator_participation_permissionless": true,
        "conformance_is_machine_verifiable": true,
        "certificate_based_trust": false,
        "signed_metadata_based_trust": true,
        "not_a_psp": true,
        "does_not_authorise_operators": true,
        "does_not_certify_operators": true,
        "does_not_issue_payment_licence": true,
        "does_not_move_funds": true,
    })
}
