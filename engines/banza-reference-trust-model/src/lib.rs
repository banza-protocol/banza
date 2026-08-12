//! banza-reference-trust-model — validates the BANZA **reference trust model**.
//!
//! The active model: BANZA is an open financial protocol. Independent operators implement the protocol,
//! publish manifests and demonstrate compatibility through verifiable conformance evidence. Protocol trust
//! is evaluated from signed protocol metadata, conformance evidence, the public protocol registry, the
//! trust root, delegated signing keys and revocation / fail-closed — never from a central human authority,
//! never from an operator approval step, and never from an artifact the protocol issues to vouch for a
//! participant.
//!
//! This engine computes the **status IN RUST** (never in TypeScript). It walks the whole input and rejects,
//! structurally, any model that would make participation depend on something other than evidence:
//!   * a central authority claim (`central_authority_claim_detected`),
//!   * an operator approval claim (`operator_approval_claim_detected`),
//!   * invalid trust evidence — an issued artifact standing in for verifiable evidence
//!     (`invalid_trust_evidence_detected`),
//!   * a permissioned-network claim, and
//!   * a regulatory-boundary failure.
//!
//! Validation is **local — no network**. Every field is scanned at every depth: the model describes one
//! architecture, so there is nothing to exempt and therefore no key that can hide a claim from the scan.
//!
//! **Boundary:** the reference trust model report describes the active trust model of an open financial
//! protocol. It is not an operator authorisation, not a certification, not a licence, and it does not let
//! BANZA provide financial services. `/operators` stays `[]`, `production_certificates` stays `false`,
//! `llm_calls = 0`, `external_model_called = false`.

// The report literal carries the full boundary-flag set, which expands past the default `json!` depth.
#![recursion_limit = "512"]

use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};

#[cfg(feature = "wasm")]
mod wasm;

pub const TOOL_VERSION: &str = "0.1.0";

pub const BOUNDARY: &str = "Este relatório descreve o modelo activo de trust do protocolo financeiro aberto BANZA. Não é autorização de operador, não é certificação, não é licença e não permite prestação de serviços financeiros pelo BANZA.";

pub const PROTOCOL_STANCE: &str = "BANZA é um protocolo financeiro aberto. Operadores independentes implementam o protocolo, publicam manifests e demonstram compatibilidade por evidência verificável de conformidade. O trust do protocolo usa signed protocol metadata, conformance evidence, public protocol registry, trust root, delegated signing keys e revocation/fail-closed.";

/// Required input artifacts (each a summary object). Absence maps to a specific gate or to INCOMPLETE.
pub const REQUIRED_INPUTS: &[&str] = &[
    "reference_summary",
    "federation_trust_model_summary",
    "public_protocol_registry_summary",
    "conformance_evidence_summary",
    "signed_protocol_metadata_summary",
    "revocation_model_summary",
    "legacy_certificates_route_summary",
    "boundary_confirmation",
];

pub const STATUS_VALUES: &[&str] = &[
    "REFERENCE_TRUST_MODEL_VALID",
    "REFERENCE_TRUST_MODEL_INCOMPLETE",
    "REFERENCE_TRUST_MODEL_BLOCKED_BY_CENTRAL_AUTHORITY_CLAIM",
    "REFERENCE_TRUST_MODEL_BLOCKED_BY_OPERATOR_APPROVAL_CLAIM",
    "REFERENCE_TRUST_MODEL_BLOCKED_BY_INVALID_TRUST_EVIDENCE",
    "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_SIGNED_METADATA",
    "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_CONFORMANCE_EVIDENCE",
    "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_PUBLIC_REGISTRY",
    "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_REVOCATION_FAIL_CLOSED",
    "REFERENCE_TRUST_MODEL_INVALID_REGULATORY_BOUNDARY",
    "REFERENCE_TRUST_MODEL_INVALID_PERMISSIONED_NETWORK_CLAIM",
];

/// A central authority over operators — the shape participation must never take. This is a DENY-LIST: the
/// engine exists to detect these strings, which is the one legitimate reason to write them down.
const CENTRAL_AUTHORITY_FIELDS: &[&str] = &[
    "banza_ca",
    "banza_ca_role",
    "banza_ca_signature",
    "banza_ca_approval",
    "ca_role",
    "ca_authority",
    "ca_signature",
    "ca_approval",
    "certificate_authority",
];
const CENTRAL_AUTHORITY_PHRASES: &[&str] = &[
    "banza ca",
    "certificate authority",
    "certification authority",
    "autoridade certificadora",
];

/// An issued artifact standing in for verifiable evidence. Trust comes from evidence anyone can re-check,
/// never from something handed to an operator to prove it is acceptable.
const INVALID_EVIDENCE_FIELDS: &[&str] = &[
    "certificate_id",
    "operator_certificate",
    "production_certificate",
    "valid_certificate",
    "certificate",
    "certified_by",
    "licence_issued_by_banza",
    "license_issued_by_banza",
];
const INVALID_EVIDENCE_FLAGS: &[&str] = &[
    "certificate_based_trust",
    "requires_valid_certificate",
    "issues_certificates",
    "issues_operator_certificate",
    "emits_production_certificate",
    "certified",
    "certified_operator",
    "operator_certified",
];
const INVALID_EVIDENCE_PHRASES: &[&str] = &[
    "operador certificado",
    "certified operator",
    "operator certificate",
    "certificado de operador",
    "certificado de produção",
    "certificado de producao",
    "production certificate",
    "valid certificate",
    "certificado válido",
    "certificado valido",
    "certificate-based federation",
    "certificação de operador",
    "certificacao de operador",
    "triple verification",
    "verificação tripla",
    "verificacao tripla",
];

/// A human gate on participation.
const OPERATOR_APPROVAL_FLAGS: &[&str] = &[
    "human_operator_approval_required",
    "human_operator_approval",
    "human_approval_required",
    "manual_operator_approval",
    "manual_approval",
    "human_gated",
    "operator_approval_required",
    "operator_admission_approval",
    "central_authority_accepts_operators",
    "central_operator_authority",
    "humans_approve_operators",
    "approves_operators",
    "accepts_operators",
    "certifies_operators",
    "authorises_operators",
    "gatekeeper",
    "human_gatekeeper",
    "approved_by",
    "accepted_by",
    "authorized_by_banza",
    "authorised_by_banza",
];
const OPERATOR_APPROVAL_PHRASES: &[&str] = &[
    "human approval",
    "human operator approval",
    "human-gated",
    "manual operator approval",
    "manual approval",
    "gatekeeper",
    "aprovado pela banza",
    "aceite pela banza",
    "certificado pela banza",
    "autorizado pela banza",
    "licenciado pela banza",
    "operador aprovado",
    "operador aceite",
    "approved operator",
    "accepted operator",
];

/// An affirmative claim here means the model says BANZA is a PSP / licensed / an authority over operators.
const REGULATORY_FAIL_FLAGS: &[&str] = &[
    "banza_is_psp",
    "banza_needs_licence",
    "banza_provides_payment_services",
    "banza_processes_payments",
    "banza_settles_payments",
    "banza_moves_funds",
    "banza_holds_funds",
    "banza_authorises_operators",
    "banza_certifies_operators",
    "banza_approves_operators",
    "banza_accepts_operators",
    "banza_issues_payment_licence",
    "banza_is_financial_operator",
    "licensed",
    "payment_service_authorised",
    "regulator_approved",
];

const PERMISSIONED_FLAGS: &[&str] = &[
    "permissioned_network",
    "permissioned",
    "closed_network",
    "requires_permission_to_implement",
    "requires_banza_permission",
    "membership_controlled_by_banza",
    "whitelist_controlled_by_banza",
    "registry_is_approval_list",
];
const PERMISSIONED_PHRASES: &[&str] = &["rede permissionada", "permissioned network"];

/// The checks a peer runs locally before routing. Conjunctive; the evaluation fails closed.
pub const FEDERATION_CHECKS: &[&str] = &[
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

// ── helpers ───────────────────────────────────────────────────────────────────

/// Canonical bytes for hashing, in **BANZA Canonical JSON `BCJ/1`** (`spec/canonicalization.md`).
///
/// The specification applies `BCJ/1` wherever BANZA computes a signature or a **content digest**.
/// This helper previously used `serde_json::to_string` — the pre-BCJ/1 behaviour — which made this
/// crate a second, unpublished definition of the byte form. It now delegates.
///
/// Fail-closed: a value `BCJ/1` rejects has no canonical form.
/// substitute for one, so the caller gets a value that cannot be mistaken for a real digest input.
fn canon(v: &Value) -> String {
    match banza_trust::canonical_bytes(v, &[]) {
        Ok(b) => String::from_utf8(b).unwrap_or_default(),
        // A value BCJ/1 rejects has no canonical form, and this engine must still return a verdict
        // about it rather than abort. The marker below can never be valid canonical JSON — it opens
        // with NUL, which canonicalization never emits — so it cannot be mistaken for one, and it
        // carries the rejection reason so two different rejections never share a digest.
        Err(e) => format!("\u{0}BCJ/1-REJECTED\u{0}{e}"),
    }
}
fn sha256_hex(s: &str) -> String {
    format!("{:x}", Sha256::digest(s.as_bytes()))
}
fn present<'a>(input: &'a Value, k: &str) -> Option<&'a Value> {
    input
        .get(k)
        .filter(|v| !v.is_null() && (v.is_object() || v.is_array()))
}
fn flag_true(v: &Value, k: &str) -> bool {
    v.get(k).and_then(|x| x.as_bool()) == Some(true)
}
/// A documented sub-field is satisfied only when explicitly `true`. Missing/false ⇒ a gap.
fn documented(v: Option<&Value>, k: &str) -> bool {
    v.map(|o| flag_true(o, k)).unwrap_or(false)
}
fn claims_regulatory_fail(v: &Value) -> bool {
    REGULATORY_FAIL_FLAGS.iter().any(|f| flag_true(v, f))
}

/// True when `needle` occurs in `hay` bounded by non-alphanumerics — so "banza ca" does not fire inside
/// "banza cadastro", and "certificate" does not fire inside "certificates_route".
fn contains_word(hay: &str, needle: &str) -> bool {
    let bytes = hay.as_bytes();
    let n = needle.len();
    if n == 0 || bytes.len() < n {
        return false;
    }
    let alnum = |b: u8| b.is_ascii_alphanumeric();
    hay.match_indices(needle).any(|(i, _)| {
        let before_ok = i == 0 || !alnum(bytes[i - 1]);
        let after = i + n;
        let after_ok = after >= bytes.len() || !alnum(bytes[after]);
        before_ok && after_ok
    })
}

/// Walk every object FIELD under `v`, invoking `f(key, value)`; recurses through arrays so objects nested
/// in arrays are visited. Array ELEMENTS carry no key — `strings` handles those.
fn walk(v: &Value, f: &mut impl FnMut(&str, &Value)) {
    match v {
        Value::Object(map) => {
            for (k, val) in map {
                f(k, val);
                walk(val, f);
            }
        }
        Value::Array(items) => items.iter().for_each(|i| walk(i, f)),
        _ => {}
    }
}

/// Collect every string in the tree, lowercased — INCLUDING bare strings that are direct array elements.
/// Arrays of strings are this schema's own idiomatic shape (`checks[]`), so routing this through `walk`'s
/// key callback would leave exactly the field that matters unscanned.
fn strings(v: &Value) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    collect_strings(v, &mut out);
    out
}
fn collect_strings(v: &Value, out: &mut Vec<String>) {
    match v {
        Value::String(s) => out.push(s.to_lowercase()),
        Value::Array(items) => items.iter().for_each(|i| collect_strings(i, out)),
        Value::Object(map) => map.values().for_each(|val| collect_strings(val, out)),
        _ => {}
    }
}

/// A field carries a real value when it is a non-empty string, a truthy bool, or a non-empty object/array.
fn meaningful(v: &Value) -> bool {
    match v {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::String(s) => !s.trim().is_empty(),
        Value::Array(a) => !a.is_empty(),
        Value::Object(o) => !o.is_empty(),
        _ => true,
    }
}

/// A flag asserts its claim when it is `true`, or when it carries any other meaningful value. Demanding a
/// literal boolean would let `"human_approval_required": "yes"` — or any string/object — pass unseen.
fn flag_asserted(v: &Value) -> bool {
    match v {
        Value::Bool(b) => *b,
        other => meaningful(other),
    }
}

fn detect_by(
    src: &Value,
    field_names: &[&str],
    flags: &[&str],
    phrases: &[&str],
    what: &str,
) -> Vec<String> {
    let mut hits: Vec<String> = Vec::new();
    walk(src, &mut |k, val| {
        let kl = k.to_lowercase();
        if field_names.contains(&kl.as_str()) && meaningful(val) {
            hits.push(format!("campo `{k}`"));
        }
        if flags.contains(&kl.as_str()) && flag_asserted(val) {
            hits.push(format!("flag `{k}` afirmada"));
        }
    });
    for s in strings(src) {
        for p in phrases {
            if contains_word(&s, p) {
                hits.push(format!("{what}: \"{p}\""));
            }
        }
    }
    hits.sort();
    hits.dedup();
    hits
}

fn detect_permissioned(src: &Value) -> Vec<String> {
    let mut hits = detect_by(src, &[], PERMISSIONED_FLAGS, PERMISSIONED_PHRASES, "texto");
    walk(src, &mut |k, val| {
        let kl = k.to_lowercase();
        if kl == "operator_participation_permissionless" && val.as_bool() == Some(false) {
            hits.push("flag `operator_participation_permissionless` = false".to_string());
        }
        if kl == "registry_is_index_not_approval_list" && val.as_bool() == Some(false) {
            hits.push("registo descrito como lista de aprovação".to_string());
        }
    });
    hits.sort();
    hits.dedup();
    hits
}

/// Which of the federation checks are missing from the documented evaluation.
fn missing_federation_checks(fed: Option<&Value>) -> Vec<String> {
    let Some(f) = fed else {
        return FEDERATION_CHECKS.iter().map(|c| (*c).to_string()).collect();
    };
    let listed: Vec<String> = f
        .get("checks")
        .and_then(|c| c.as_array())
        .map(|a| {
            a.iter()
                .filter_map(|x| x.as_str().map(|s| s.to_lowercase()))
                .collect()
        })
        .unwrap_or_default();
    FEDERATION_CHECKS
        .iter()
        .filter(|c| !listed.iter().any(|l| l == *c))
        .map(|c| (*c).to_string())
        .collect()
}

fn summary_of(v: Option<&Value>, keys: &[&str], note: &str) -> Value {
    let mut m = Map::new();
    m.insert("present".into(), json!(v.is_some()));
    for k in keys {
        m.insert((*k).to_string(), json!(documented(v, k)));
    }
    m.insert("note".into(), json!(note));
    Value::Object(m)
}

// ── validator ─────────────────────────────────────────────────────────────────

/// Validate the reference trust model. `input` may be the object or a `{ input: {...} }` wrapper.
/// The status, every detection, the blocked items and the SHA-256 hash are computed here (Rust).
pub fn validate_reference_trust_model(input: &Value) -> Value {
    if !input.is_object() {
        return fail_closed("input do reference trust model deve ser um objecto JSON");
    }
    let src = match input.get("input") {
        Some(i) if i.is_object() => i,
        _ => input,
    };

    let reference = present(src, "reference_summary");
    let federation = present(src, "federation_trust_model_summary");
    let registry = present(src, "public_protocol_registry_summary");
    let evidence = present(src, "conformance_evidence_summary");
    let metadata = present(src, "signed_protocol_metadata_summary");
    let revocation = present(src, "revocation_model_summary");
    let legacy_route = present(src, "legacy_certificates_route_summary");
    let boundary = present(src, "boundary_confirmation");

    // ── detections (structural, in Rust, over the whole tree — nothing is exempt) ──
    let ca_hits = detect_by(
        src,
        CENTRAL_AUTHORITY_FIELDS,
        &[],
        CENTRAL_AUTHORITY_PHRASES,
        "referência",
    );
    let evidence_hits = detect_by(
        src,
        INVALID_EVIDENCE_FIELDS,
        INVALID_EVIDENCE_FLAGS,
        INVALID_EVIDENCE_PHRASES,
        "texto",
    );
    let approval_hits = detect_by(
        src,
        &[],
        OPERATOR_APPROVAL_FLAGS,
        OPERATOR_APPROVAL_PHRASES,
        "texto",
    );
    let permissioned_hits = detect_permissioned(src);

    let central_authority_claim_detected = !ca_hits.is_empty();
    let invalid_trust_evidence_detected = !evidence_hits.is_empty();
    let operator_approval_claim_detected = !approval_hits.is_empty();
    let permissioned_network_claim_detected = !permissioned_hits.is_empty();

    let regulatory_fail = boundary.map(claims_regulatory_fail).unwrap_or(false);
    let boundary_confirmed = boundary
        .map(|b| flag_true(b, "banza_is_open_financial_protocol") && !flag_true(b, "banza_is_psp"))
        .unwrap_or(false);

    // ── gates ──
    let metadata_gate = metadata.is_some()
        && documented(metadata, "signed_by_delegated_keys")
        && documented(metadata, "includes_versions")
        && documented(metadata, "does_not_authorise_operators");
    let evidence_gate = evidence.is_some()
        && documented(evidence, "machine_verifiable")
        && documented(evidence, "hashes_documented")
        && documented(evidence, "tool_version_pinned")
        && documented(evidence, "freshness_policy_documented");
    let registry_gate = registry.is_some()
        && documented(registry, "index_not_approval_list")
        && documented(registry, "entries_verifiable")
        && documented(registry, "not_a_licence")
        && documented(registry, "replicable");
    let missing_checks = missing_federation_checks(federation);
    let revocation_gate = revocation.is_some()
        && documented(revocation, "revocation_list_documented")
        && documented(revocation, "fail_closed_documented")
        && documented(revocation, "security_signal_not_regulatory")
        && !missing_checks
            .iter()
            .any(|c| c == "fail_closed_on_missing_or_invalid");

    let checks: Vec<(&str, bool)> = vec![
        ("reference_summary", reference.is_some()),
        ("federation_trust_model_summary", federation.is_some()),
        ("public_protocol_registry_summary", registry.is_some()),
        ("conformance_evidence_summary", evidence.is_some()),
        ("signed_protocol_metadata_summary", metadata.is_some()),
        ("revocation_model_summary", revocation.is_some()),
        ("legacy_certificates_route_summary", legacy_route.is_some()),
        ("boundary_confirmation", boundary.is_some()),
    ];
    let missing_artifacts: Vec<String> = checks
        .iter()
        .filter(|(_, ok)| !ok)
        .map(|(n, _)| (*n).to_string())
        .collect();

    // `present()` only proves the key holds an object — `{}` passes it. Every remaining summary must carry
    // the facts it claims to report, or the model is INCOMPLETE rather than VALID.
    let reference_gate = reference.is_some()
        && documented(reference, "open_trust_evaluation_documented")
        && documented(reference, "operator_self_publication_documented");
    let legacy_route_gate = legacy_route.is_some()
        && documented(legacy_route, "marked_legacy_compatibility")
        && documented(legacy_route, "canonical_route_documented")
        && !flag_true(
            legacy_route.unwrap_or(&Value::Null),
            "production_certificates",
        );
    let undocumented: Vec<&str> = [
        ("reference_summary", reference_gate),
        ("legacy_certificates_route_summary", legacy_route_gate),
    ]
    .iter()
    .filter(|(_, ok)| !ok)
    .map(|(n, _)| *n)
    .collect();

    // ── status precedence (computed in Rust) ──
    let status = if regulatory_fail {
        "REFERENCE_TRUST_MODEL_INVALID_REGULATORY_BOUNDARY"
    } else if permissioned_network_claim_detected {
        "REFERENCE_TRUST_MODEL_INVALID_PERMISSIONED_NETWORK_CLAIM"
    } else if central_authority_claim_detected {
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_CENTRAL_AUTHORITY_CLAIM"
    } else if operator_approval_claim_detected {
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_OPERATOR_APPROVAL_CLAIM"
    } else if invalid_trust_evidence_detected {
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_INVALID_TRUST_EVIDENCE"
    } else if !metadata_gate {
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_SIGNED_METADATA"
    } else if !evidence_gate {
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_CONFORMANCE_EVIDENCE"
    } else if !registry_gate {
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_PUBLIC_REGISTRY"
    } else if !revocation_gate {
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_REVOCATION_FAIL_CLOSED"
    } else if !missing_artifacts.is_empty()
        || !undocumented.is_empty()
        || !missing_checks.is_empty()
        || !boundary_confirmed
    {
        "REFERENCE_TRUST_MODEL_INCOMPLETE"
    } else {
        "REFERENCE_TRUST_MODEL_VALID"
    };

    let mut blocked_items: Vec<String> = Vec::new();
    if regulatory_fail {
        blocked_items.push("boundary_confirmation afirma que o BANZA é PSP / precisa de licença / autoriza ou certifica operadores / movimenta fundos".into());
    }
    for h in &permissioned_hits {
        blocked_items.push(format!("rede permissionada: {h}"));
    }
    for h in &ca_hits {
        blocked_items.push(format!("autoridade central sobre operadores: {h}"));
    }
    for h in &approval_hits {
        blocked_items.push(format!("aprovação de operador: {h}"));
    }
    for h in &evidence_hits {
        blocked_items.push(format!("evidência de trust inválida: {h}"));
    }
    if !metadata_gate {
        blocked_items.push("signed protocol metadata em falta ou incompleto (assinatura delegada / versões / não autoriza operadores)".into());
    }
    if !evidence_gate {
        blocked_items.push("conformance evidence em falta ou incompleta (verificável por máquina / hashes / tool version / frescura)".into());
    }
    if !registry_gate {
        blocked_items.push("public protocol registry em falta ou incompleto (índice não é lista de aprovação / entries verificáveis / não é licença / replicável)".into());
    }
    if !revocation_gate {
        blocked_items.push("revocation/fail-closed em falta ou incompleto (lista / fail-closed / sinal de segurança, não regulatório)".into());
    }
    for m in &missing_checks {
        blocked_items.push(format!("verificação de federação em falta: {m}"));
    }
    for m in &missing_artifacts {
        blocked_items.push(format!("artefacto em falta: {m}"));
    }
    for u in &undocumented {
        blocked_items.push(format!(
            "artefacto presente mas sem os factos documentados: {u}"
        ));
    }

    let next_steps: Vec<String> = match status {
        "REFERENCE_TRUST_MODEL_VALID" => vec![
            "Modelo de trust consistente: a compatibilidade é demonstrada por evidência verificável. A federação avalia manifest, versão de protocolo, signed protocol metadata, conformance evidence, assinatura da trust root/chave delegada, revogação, capabilities, contrato de endpoint e frescura — fail-closed. Nenhum operador é criado, aceite, aprovado ou certificado; nenhuma licença é emitida; nenhum fundo é movido.".into(),
        ],
        "REFERENCE_TRUST_MODEL_INVALID_REGULATORY_BOUNDARY" => vec![
            "Remova qualquer afirmação de que o BANZA é PSP, precisa de licença, autoriza/certifica operadores ou movimenta fundos. A licença pertence ao operador, autorizado pelas entidades competentes.".into(),
        ],
        "REFERENCE_TRUST_MODEL_INVALID_PERMISSIONED_NETWORK_CLAIM" => vec![
            "Remova a afirmação de rede permissionada e a descrição do registry como lista de aprovação. O registry é um índice público verificável.".into(),
        ],
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_CENTRAL_AUTHORITY_CLAIM" => vec![
            "O modelo não pode depender de uma autoridade humana central sobre operadores. A governação mantém o protocolo; a compatibilidade é verificada por regras públicas, manifests, conformance evidence, trust root, chaves delegadas e revocation/fail-closed.".into(),
        ],
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_OPERATOR_APPROVAL_CLAIM" => vec![
            "O modelo não pode ter um passo de aprovação de operador. Ninguém aceita ou aprova operadores por decisão humana central: a implementação demonstra conformidade por evidência verificável.".into(),
        ],
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_INVALID_TRUST_EVIDENCE" => vec![
            "O trust tem de assentar em evidência verificável, não num artefacto emitido a atestar um participante. Use signed protocol metadata, conformance evidence, manifest_hash/evidence_bundle_hash e a revocation list.".into(),
        ],
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_SIGNED_METADATA" => vec![
            "Documente o signed protocol metadata: assinado por chaves delegadas, inclui versões (schema/release/trust root/revocation/tool) e não autoriza operadores.".into(),
        ],
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_CONFORMANCE_EVIDENCE" => vec![
            "Documente a conformance evidence: verificável por máquina, hashes, tool version fixada e política de frescura.".into(),
        ],
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_PUBLIC_REGISTRY" => vec![
            "Documente o public protocol registry como índice verificável e replicável — não é lista de aprovação nem licença.".into(),
        ],
        "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_REVOCATION_FAIL_CLOSED" => vec![
            "Documente a revocation list e a avaliação fail-closed como mecanismo de segurança do protocolo, não sanção regulatória.".into(),
        ],
        _ => vec![
            "Complete os artefactos em falta, documente as verificações de federação e confirme a fronteira (banza_is_open_financial_protocol = true).".into(),
        ],
    };

    let mut report = json!({
        "status": status,
        "central_authority_claim_detected": central_authority_claim_detected,
        "operator_approval_claim_detected": operator_approval_claim_detected,
        "invalid_trust_evidence_detected": invalid_trust_evidence_detected,
        "permissioned_network_claim_detected": permissioned_network_claim_detected,
        "active_trust_model_summary": {
            "signed_protocol_metadata": metadata_gate,
            "conformance_evidence": evidence_gate,
            "public_protocol_registry": registry_gate,
            "revocation_fail_closed": revocation_gate,
            "operator_self_publication": documented(reference, "operator_self_publication_documented"),
            "note": "O trust do protocolo BANZA é avaliado por manifests, signed protocol metadata, conformance evidence, public protocol registry, trust root, delegated signing keys e revocation/fail-closed.",
        },
        "signed_metadata_summary": summary_of(
            metadata,
            &["signed_by_delegated_keys", "includes_versions", "does_not_authorise_operators"],
            "Assina metadados do protocolo, releases, chaves delegadas e revogações. Não autoriza operadores."),
        "conformance_evidence_summary": summary_of(
            evidence,
            &["machine_verifiable", "hashes_documented", "tool_version_pinned", "freshness_policy_documented"],
            "Evidência reexecutável por terceiros sem contactar o BANZA. Conformidade é medição, não aprovação."),
        "public_registry_summary": summary_of(
            registry,
            &["index_not_approval_list", "entries_verifiable", "not_a_licence", "replicable"],
            "Índice público de metadata e evidência verificável. Não é uma lista de operadores licenciados, aprovados ou certificados pela BANZA."),
        "revocation_fail_closed_summary": summary_of(
            revocation,
            &["revocation_list_documented", "fail_closed_documented", "security_signal_not_regulatory"],
            "Mecanismo de segurança e trust do protocolo. Não é licença, sanção regulatória ou autorização financeira."),
        "trust_evaluation_summary": {
            "federation_checks": FEDERATION_CHECKS,
            "missing_checks": missing_checks,
            "fail_closed_documented": documented(revocation, "fail_closed_documented"),
            "note": "Verificações conjuntivas, corridas localmente por quem encaminha. Fail-closed se material de trust estiver ausente, inválido, expirado, revogado ou incompatível. Nenhuma é aprovação humana.",
        },
        "legacy_compatibility_summary": summary_of(
            legacy_route,
            &["marked_legacy_compatibility", "canonical_route_documented"],
            "/certificates é rota de compatibilidade; a semântica canónica é conformance evidence em /conformance/evidence. production_certificates permanece false."),
        "reference_summary": summary_of(
            reference,
            &["open_trust_evaluation_documented", "operator_self_publication_documented"],
            "O reference público descreve o modelo activo de avaliação de trust."),
        "boundary_summary": {
            "open_financial_protocol": true,
            "confirmed": boundary_confirmed,
            "stance": PROTOCOL_STANCE,
        },
        "missing_artifacts": missing_artifacts,
        "blocked_items": blocked_items,
        "next_steps": next_steps,
        "open_financial_protocol": true,
        "central_operator_authority": false,
        "human_operator_approval_required": false,
        "operator_participation_permissionless": true,
        "conformance_is_machine_verifiable": true,
        "signed_metadata_based_trust": true,
        "humans_maintain_protocol_not_operators": true,
        "not_a_psp": true,
        "not_operator_certificate": true,
        "not_an_approval": true,
        "not_licence": true,
        "not_regulatory_approval": true,
        "does_not_authorise_operators": true,
        "does_not_certify_operators": true,
        "does_not_accept_operators": true,
        "does_not_approve_operators": true,
        "does_not_create_operator": true,
        "does_not_issue_payment_licence": true,
        "does_not_move_funds": true,
        "does_not_settle_funds": true,
        "does_not_hold_funds": true,
        "operator_activation_allowed": false,
        "production_certificates_allowed": false,
        "requires_operator_regulatory_authorisation_if_used_for_real_services": true,
        "boundary": BOUNDARY,
        "protocol_stance": PROTOCOL_STANCE,
        "tool": "banza-reference-trust-model",
        "tool_version": TOOL_VERSION,
        "test_only": true,
        "llm_calls": 0,
        "external_model_called": false,
    });
    report["report_id"] = json!(format!("ref-trust-{}", &sha256_hex(&canon(src))[..12]));
    report["reference_trust_model_report_hash"] = json!(sha256_hex(&canon(&report)));
    report
}

/// Malformed input fails closed on the most restrictive status — never on VALID.
fn fail_closed(detail: &str) -> Value {
    json!({
        "status": "REFERENCE_TRUST_MODEL_INVALID_REGULATORY_BOUNDARY",
        "central_authority_claim_detected": false,
        "operator_approval_claim_detected": false,
        "invalid_trust_evidence_detected": false,
        "permissioned_network_claim_detected": false,
        "active_trust_model_summary": Value::Null,
        "signed_metadata_summary": Value::Null,
        "conformance_evidence_summary": Value::Null,
        "public_registry_summary": Value::Null,
        "revocation_fail_closed_summary": Value::Null,
        "trust_evaluation_summary": Value::Null,
        "legacy_compatibility_summary": Value::Null,
        "reference_summary": Value::Null,
        "boundary_summary": Value::Null,
        "missing_artifacts": REQUIRED_INPUTS,
        "blocked_items": [detail],
        "next_steps": ["Corrija o input e revalide."],
        "open_financial_protocol": true,
        "central_operator_authority": false,
        "human_operator_approval_required": false,
        "operator_participation_permissionless": true,
        "conformance_is_machine_verifiable": true,
        "signed_metadata_based_trust": true,
        "humans_maintain_protocol_not_operators": true,
        "not_a_psp": true, "not_operator_certificate": true, "not_an_approval": true,
        "not_licence": true, "not_regulatory_approval": true,
        "does_not_authorise_operators": true, "does_not_certify_operators": true,
        "does_not_accept_operators": true, "does_not_approve_operators": true,
        "does_not_create_operator": true, "does_not_issue_payment_licence": true,
        "does_not_move_funds": true, "does_not_settle_funds": true, "does_not_hold_funds": true,
        "operator_activation_allowed": false, "production_certificates_allowed": false,
        "requires_operator_regulatory_authorisation_if_used_for_real_services": true,
        "boundary": BOUNDARY, "protocol_stance": PROTOCOL_STANCE,
        "tool": "banza-reference-trust-model", "tool_version": TOOL_VERSION,
        "test_only": true, "llm_calls": 0, "external_model_called": false,
    })
}

// ── fixtures (TEST ONLY — NOT PRODUCTION — NO OPERATOR APPROVAL) ──────────────

pub const FIXTURE_NOTE: &str = "TEST ONLY — NOT PRODUCTION — NO OPERATOR APPROVAL";

fn valid_input() -> Value {
    json!({
        "reference_summary": {
            "open_trust_evaluation_documented": true,
            "operator_self_publication_documented": true,
            "sections": ["confianca", "federacao", "registo", "revogacao"],
            "note": FIXTURE_NOTE
        },
        "federation_trust_model_summary": {
            "checks": [
                "valid_operator_manifest",
                "compatible_protocol_version",
                "signed_protocol_metadata",
                "conformance_evidence_valid",
                "trust_root_or_delegated_signature_valid",
                "not_revoked",
                "capabilities_compatible",
                "endpoint_contract_compatible",
                "evidence_freshness_within_policy",
                "fail_closed_on_missing_or_invalid"
            ],
            "note": FIXTURE_NOTE
        },
        "public_protocol_registry_summary": {
            "index_not_approval_list": true,
            "entries_verifiable": true,
            "not_a_licence": true,
            "replicable": true,
            "registry_is_index_not_approval_list": true,
            "note": FIXTURE_NOTE
        },
        "conformance_evidence_summary": {
            "machine_verifiable": true,
            "hashes_documented": true,
            "tool_version_pinned": true,
            "freshness_policy_documented": true,
            "note": FIXTURE_NOTE
        },
        "signed_protocol_metadata_summary": {
            "signed_by_delegated_keys": true,
            "includes_versions": true,
            "does_not_authorise_operators": true,
            "note": FIXTURE_NOTE
        },
        "revocation_model_summary": {
            "revocation_list_documented": true,
            "fail_closed_documented": true,
            "security_signal_not_regulatory": true,
            "note": FIXTURE_NOTE
        },
        "legacy_certificates_route_summary": {
            "route": "/certificates",
            "marked_legacy_compatibility": true,
            "canonical_route_documented": true,
            "production_certificates": false,
            "note": FIXTURE_NOTE
        },
        "boundary_confirmation": {
            "banza_is_open_financial_protocol": true,
            "banza_is_psp": false,
            "banza_needs_licence": false,
            "banza_authorises_operators": false,
            "banza_certifies_operators": false,
            "banza_moves_funds": false,
            "licence_belongs_to_operator": true,
            "note": FIXTURE_NOTE
        }
    })
}

/// TEST-ONLY demo fixtures — one per status. No fixture approves, accepts, certifies or activates an
/// operator; none emits a licence or moves funds.
pub fn demo_fixtures() -> Value {
    let valid = valid_input();

    let mut central_authority = valid.clone();
    central_authority["reference_summary"]["ca_role"] =
        json!("uma autoridade central revê e aceita operadores antes do encaminhamento");

    let mut approval = valid.clone();
    approval["federation_trust_model_summary"]["human_approval_required"] = json!(true);

    let mut bad_evidence = valid.clone();
    bad_evidence["federation_trust_model_summary"]["checks"] = json!([
        "valid_operator_manifest",
        "valid certificate",
        "not_revoked"
    ]);

    let mut no_metadata = valid.clone();
    no_metadata
        .as_object_mut()
        .unwrap()
        .remove("signed_protocol_metadata_summary");

    let mut no_evidence = valid.clone();
    no_evidence
        .as_object_mut()
        .unwrap()
        .remove("conformance_evidence_summary");

    let mut no_registry = valid.clone();
    no_registry
        .as_object_mut()
        .unwrap()
        .remove("public_protocol_registry_summary");

    let mut no_revocation = valid.clone();
    no_revocation
        .as_object_mut()
        .unwrap()
        .remove("revocation_model_summary");

    let mut reg_fail = valid.clone();
    reg_fail["boundary_confirmation"] = json!({
        "banza_is_open_financial_protocol": true,
        "banza_is_psp": true,
        "banza_needs_licence": true,
        "banza_authorises_operators": true
    });

    let mut permissioned = valid.clone();
    permissioned["public_protocol_registry_summary"]["registry_is_approval_list"] = json!(true);
    permissioned["public_protocol_registry_summary"]["registry_is_index_not_approval_list"] =
        json!(false);

    let mut incomplete = valid.clone();
    incomplete["reference_summary"]["open_trust_evaluation_documented"] = json!(false);

    json!({
        "note": FIXTURE_NOTE,
        "fixtures": [
            { "key": "valid_reference_trust_model", "label": "Reference trust model válido", "expected": "REFERENCE_TRUST_MODEL_VALID", "input": valid },
            { "key": "central_authority_claim", "label": "Central authority claim", "expected": "REFERENCE_TRUST_MODEL_BLOCKED_BY_CENTRAL_AUTHORITY_CLAIM", "input": central_authority },
            { "key": "operator_approval_claim", "label": "Operator approval claim", "expected": "REFERENCE_TRUST_MODEL_BLOCKED_BY_OPERATOR_APPROVAL_CLAIM", "input": approval },
            { "key": "invalid_trust_evidence", "label": "Invalid trust evidence", "expected": "REFERENCE_TRUST_MODEL_BLOCKED_BY_INVALID_TRUST_EVIDENCE", "input": bad_evidence },
            { "key": "missing_signed_metadata", "label": "Missing signed metadata", "expected": "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_SIGNED_METADATA", "input": no_metadata },
            { "key": "missing_conformance_evidence", "label": "Missing conformance evidence", "expected": "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_CONFORMANCE_EVIDENCE", "input": no_evidence },
            { "key": "missing_public_registry", "label": "Missing public registry", "expected": "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_PUBLIC_REGISTRY", "input": no_registry },
            { "key": "missing_revocation_fail_closed", "label": "Missing revocation / fail-closed", "expected": "REFERENCE_TRUST_MODEL_BLOCKED_BY_MISSING_REVOCATION_FAIL_CLOSED", "input": no_revocation },
            { "key": "regulatory_boundary_fail", "label": "Sugere BANZA=PSP/autoriza operadores", "expected": "REFERENCE_TRUST_MODEL_INVALID_REGULATORY_BOUNDARY", "input": reg_fail },
            { "key": "permissioned_network_claim", "label": "Registry como lista de aprovação", "expected": "REFERENCE_TRUST_MODEL_INVALID_PERMISSIONED_NETWORK_CLAIM", "input": permissioned },
            { "key": "incomplete_reference", "label": "Reference incompleto", "expected": "REFERENCE_TRUST_MODEL_INCOMPLETE", "input": incomplete }
        ]
    })
}

pub fn schema() -> Value {
    json!({
        "tool": "banza-reference-trust-model",
        "tool_version": TOOL_VERSION,
        "required_inputs": REQUIRED_INPUTS,
        "status_values": STATUS_VALUES,
        "detections": [
            "central_authority_claim_detected",
            "operator_approval_claim_detected",
            "invalid_trust_evidence_detected",
            "permissioned_network_claim_detected"
        ],
        "federation_checks": FEDERATION_CHECKS,
        "active_trust_model": "signed protocol metadata + conformance evidence + operator manifest + public protocol registry + trust root/delegated signing keys + revocation/fail-closed",
        "network": "local por defeito — sem fetch; sem integração externa.",
        "boundary": BOUNDARY,
        "protocol_stance": PROTOCOL_STANCE,
    })
}

pub fn tool_version() -> Value {
    json!({ "tool": "banza-reference-trust-model", "tool_version": TOOL_VERSION, "test_only": true, "boundary": BOUNDARY })
}
