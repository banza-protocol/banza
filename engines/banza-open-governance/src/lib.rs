//! banza-open-governance (M2.2) — validates the BANZA **open protocol governance** package.
//!
//! M2.2 removes the "BANZA CA" concept as a human authority over operators. BANZA is an **open financial
//! protocol**: participation does not depend on a central human authority. Independent operators implement
//! the protocol, publish manifests and produce verifiable conformance evidence. Humans maintain and evolve
//! the protocol — specifications, versions, RFCs, security, bugs, cryptography, documentation, tooling and
//! emergency processes. Humans do **not** authorise, certify, accept or approve operators.
//!
//! This engine computes the **open-governance status IN RUST** (never in TypeScript). It walks the whole
//! input and detects, structurally:
//!   * a dependency on a central human operator authority (`ca_dependency_detected`),
//!   * a requirement for human operator approval (`human_operator_approval_detected`),
//!   * operator-certificate semantics (`certificate_semantics_detected`),
//!   * a permissioned-network claim, and
//!   * a regulatory-boundary failure.
//!
//! Validation is **local — no network**.
//!
//! The `deprecated_ca_inventory` subtree is the ONE place where the removed terms are expected to be
//! named: it is the record of what was removed. It is therefore excluded from the term scan and is instead
//! checked for `status` ∈ {removed, deprecated, legacy_compatibility, denylist, historical, negative_test}
//! — an inventory entry that is still *active* counts as a real CA dependency.
//!
//! **Boundary:** the open governance report confirms an open-financial-protocol architecture. It is not an
//! operator authorisation, not a certification, not a licence, and it does not let BANZA provide financial
//! services. `/operators` stays `[]`, `production_certificates` stays `false`, `llm_calls = 0`,
//! `external_model_called = false`.

// The report literal carries the full boundary-flag set, which expands past the default `json!` depth.
#![recursion_limit = "512"]

use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};

#[cfg(feature = "wasm")]
mod wasm;

pub const TOOL_VERSION: &str = "0.1.0";

pub const BOUNDARY: &str = "O open governance report confirma a arquitectura de protocolo financeiro aberto do BANZA. Não é autorização de operador, não é certificação, não é licença e não permite prestação de serviços financeiros pelo BANZA. A governação humana mantém e evolui o protocolo; não autoriza, certifica, aceita nem aprova operadores.";

pub const PROTOCOL_STANCE: &str = "BANZA é um protocolo financeiro aberto. A participação de operadores no ecossistema não depende de uma autoridade humana central. Operadores independentes implementam o protocolo, publicam manifests e produzem evidência verificável de conformidade. A governação humana existe para manter e evoluir o protocolo, não para autorizar, certificar ou aceitar operadores.";

pub const GOVERNANCE_MODEL: &str = "OPEN_PROTOCOL_GOVERNANCE";

/// Required input artifacts (each a summary object). Absence maps to a specific gate or to INCOMPLETE.
pub const REQUIRED_INPUTS: &[&str] = &[
    "governance_model_summary",
    "architecture_summary",
    "operator_self_publication_summary",
    "conformance_automation_summary",
    "trust_root_summary",
    "revocation_model_summary",
    "protocol_maintainers_summary",
    "succession_model_summary",
    "deprecated_ca_inventory",
    "boundary_confirmation",
];

pub const STATUS_VALUES: &[&str] = &[
    "OPEN_GOVERNANCE_VALID",
    "OPEN_GOVERNANCE_INCOMPLETE",
    "OPEN_GOVERNANCE_BLOCKED_BY_CA_DEPENDENCY",
    "OPEN_GOVERNANCE_BLOCKED_BY_HUMAN_OPERATOR_APPROVAL",
    "OPEN_GOVERNANCE_BLOCKED_BY_CERTIFICATE_SEMANTICS",
    "OPEN_GOVERNANCE_BLOCKED_BY_MISSING_CONFORMANCE_AUTOMATION",
    "OPEN_GOVERNANCE_BLOCKED_BY_MISSING_OPERATOR_SELF_PUBLICATION",
    "OPEN_GOVERNANCE_BLOCKED_BY_MISSING_SUCCESSION_MODEL",
    "OPEN_GOVERNANCE_INVALID_REGULATORY_BOUNDARY",
    "OPEN_GOVERNANCE_INVALID_PERMISSIONED_NETWORK_CLAIM",
];

/// The removed authority concept, in every spelling the scan must catch. DENY-LIST — these terms must not
/// appear as ACTIVE architecture anywhere in the package.
const CA_FIELD_NAMES: &[&str] = &[
    "banza_ca",
    "banza_ca_role",
    "banza_ca_summary",
    "banza_ca_signature",
    "banza_ca_approval",
    "banza_ca_review",
    "requires_banza_ca_review",
    "ca_role",
    "ca_authority",
    "ca_signature",
    "ca_approval",
    "certificate_authority",
    "autoridade_certificadora",
];
const CA_PHRASES: &[&str] = &[
    "banza ca",
    "certificate authority",
    "certification authority",
    "autoridade certificadora",
];

/// Human-gatekeeper semantics. Truthy ⇒ the package still routes participation through a person.
const HUMAN_APPROVAL_FLAGS: &[&str] = &[
    "human_operator_approval_required",
    "human_operator_approval",
    "manual_operator_approval",
    "manual_approval",
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
];
const HUMAN_APPROVAL_PHRASES: &[&str] = &[
    "human approval",
    "human operator approval",
    "manual operator approval",
    "manual approval",
    "gatekeeper",
    "central authority accepts operators",
    "aprovado pela banza",
    "aceite pela banza",
    "autorizado pela banza",
];

/// Operator-certificate semantics. A present field name OR a truthy flag OR a phrase ⇒ the old model.
const CERTIFICATE_FIELD_NAMES: &[&str] = &[
    "certificate_id",
    "operator_certificate",
    "production_certificate",
    "certificate",
    "certified_by",
    "approved_by",
    "accepted_by",
    "authorised_by_banza",
    "authorized_by_banza",
];
const CERTIFICATE_FLAGS: &[&str] = &[
    "issues_certificates",
    "issues_operator_certificate",
    "emits_production_certificate",
    "certified",
    "certified_operator",
    "operator_certified",
];
const CERTIFICATE_PHRASES: &[&str] = &[
    "operador certificado",
    "certified operator",
    "operator certificate",
    "certificado de produção",
    "production certificate",
    "certificação de operador",
];

/// An affirmative claim here means the package says BANZA itself is a financial operator / PSP / licensed /
/// authority over operators → INVALID_REGULATORY_BOUNDARY.
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

/// A permissioned-network claim contradicts the open protocol: participation would need permission.
const PERMISSIONED_FLAGS: &[&str] = &[
    "permissioned_network",
    "permissioned",
    "closed_network",
    "requires_permission_to_implement",
    "requires_banza_permission",
    "membership_controlled_by_banza",
    "whitelist_controlled_by_banza",
];
const PERMISSIONED_PHRASES: &[&str] = &["rede permissionada", "permissioned network"];

/// Inventory entry statuses that mean the old term is genuinely retired (not active architecture).
const RETIRED_STATUSES: &[&str] = &[
    "removed",
    "removido",
    "deprecated",
    "depreciado",
    "legacy_compatibility",
    "denylist",
    "historical",
    "historico",
    "negative_test",
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

/// Walk every object field under `v`, invoking `f(key, value)`. Recurses through arrays so fields of
/// objects nested in arrays are visited too. Array ELEMENTS carry no key, so `f` is not called on them —
/// `strings` handles those (see below).
///
/// There is deliberately no `skip` list here. The deprecation exemption is applied ONCE by the caller, at
/// the TOP LEVEL only (see `validate_open_governance`): a `skip` matched by key name at every depth would
/// let anyone hide live architecture simply by nesting it under `architecture_summary.deprecated_ca_inventory`.
fn walk(v: &Value, f: &mut impl FnMut(&str, &Value)) {
    match v {
        Value::Object(map) => {
            for (k, val) in map {
                f(k, val);
                walk(val, f);
            }
        }
        Value::Array(items) => {
            for item in items {
                walk(item, f);
            }
        }
        _ => {}
    }
}

/// Collect every string in the tree, lowercased — including bare strings that are DIRECT array elements.
/// This must not route through `walk`'s key callback: `roles: ["Human Gatekeeper"]` has no key on the
/// element, and roles/layers/fields are exactly where a forbidden role would be declared.
fn strings(v: &Value) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    collect_strings(v, &mut out);
    out
}

fn collect_strings(v: &Value, out: &mut Vec<String>) {
    match v {
        Value::String(s) => out.push(s.to_lowercase()),
        Value::Array(items) => {
            for item in items {
                collect_strings(item, out);
            }
        }
        Value::Object(map) => {
            for val in map.values() {
                collect_strings(val, out);
            }
        }
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

/// Detect an ACTIVE dependency on the removed central-authority concept: a CA-named field carrying a real
/// value, or a CA phrase in any string outside the deprecation inventory.
fn detect_ca_dependency(src: &Value) -> Vec<String> {
    let mut hits: Vec<String> = Vec::new();
    walk(src, &mut |k, val| {
        let kl = k.to_lowercase();
        if CA_FIELD_NAMES.contains(&kl.as_str()) && meaningful(val) {
            hits.push(format!("campo activo `{k}`"));
        }
    });
    for s in strings(src) {
        for p in CA_PHRASES {
            if contains_word(&s, p) {
                hits.push(format!("referência activa a \"{p}\""));
            }
        }
    }
    hits.sort();
    hits.dedup();
    hits
}

/// An inventory entry still marked active means the old concept was not actually retired.
fn active_inventory_entries(inventory: Option<&Value>) -> Vec<String> {
    let mut hits: Vec<String> = Vec::new();
    let items = match inventory {
        Some(Value::Array(a)) => a.clone(),
        Some(Value::Object(o)) => o
            .get("entries")
            .and_then(|e| e.as_array())
            .cloned()
            .unwrap_or_default(),
        _ => Vec::new(),
    };
    for item in items {
        let term = item
            .get("term")
            .and_then(|t| t.as_str())
            .unwrap_or("(sem termo)");
        let status = item
            .get("status")
            .and_then(|s| s.as_str())
            .unwrap_or("")
            .to_lowercase();
        if !RETIRED_STATUSES.contains(&status.as_str()) {
            hits.push(format!(
                "`{term}` continua activo (status: {})",
                if status.is_empty() {
                    "ausente"
                } else {
                    &status
                }
            ));
        }
    }
    hits
}

fn detect_human_approval(src: &Value) -> Vec<String> {
    let mut hits: Vec<String> = Vec::new();
    walk(src, &mut |k, val| {
        let kl = k.to_lowercase();
        if HUMAN_APPROVAL_FLAGS.contains(&kl.as_str()) && val.as_bool() == Some(true) {
            hits.push(format!("flag `{k}` = true"));
        }
    });
    for s in strings(src) {
        for p in HUMAN_APPROVAL_PHRASES {
            if contains_word(&s, p) {
                hits.push(format!("texto sugere \"{p}\""));
            }
        }
    }
    hits.sort();
    hits.dedup();
    hits
}

fn detect_certificate_semantics(src: &Value) -> Vec<String> {
    let mut hits: Vec<String> = Vec::new();
    walk(src, &mut |k, val| {
        let kl = k.to_lowercase();
        if CERTIFICATE_FIELD_NAMES.contains(&kl.as_str()) && meaningful(val) {
            hits.push(format!("campo de certificado `{k}`"));
        }
        if CERTIFICATE_FLAGS.contains(&kl.as_str()) && val.as_bool() == Some(true) {
            hits.push(format!("flag `{k}` = true"));
        }
    });
    for s in strings(src) {
        for p in CERTIFICATE_PHRASES {
            if contains_word(&s, p) {
                hits.push(format!("texto usa \"{p}\""));
            }
        }
    }
    hits.sort();
    hits.dedup();
    hits
}

fn detect_permissioned(src: &Value) -> Vec<String> {
    let mut hits: Vec<String> = Vec::new();
    walk(src, &mut |k, val| {
        let kl = k.to_lowercase();
        if PERMISSIONED_FLAGS.contains(&kl.as_str()) && val.as_bool() == Some(true) {
            hits.push(format!("flag `{k}` = true"));
        }
        // An explicit denial of permissionless participation is the same claim, inverted.
        if kl == "operator_participation_permissionless" && val.as_bool() == Some(false) {
            hits.push("flag `operator_participation_permissionless` = false".to_string());
        }
    });
    for s in strings(src) {
        for p in PERMISSIONED_PHRASES {
            if contains_word(&s, p) {
                hits.push(format!("texto afirma \"{p}\""));
            }
        }
    }
    hits.sort();
    hits.dedup();
    hits
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

/// Validate the open protocol governance package. `input` may be the object or a `{ input: {...} }` wrapper.
/// The status, every detection, the blocked items and the SHA-256 hash are computed here (Rust) —
/// TypeScript only renders.
pub fn validate_open_governance(input: &Value) -> Value {
    if !input.is_object() {
        return fail_closed("input do open governance deve ser um objecto JSON");
    }
    let src = match input.get("input") {
        Some(i) if i.is_object() => i,
        _ => input,
    };

    // The deprecation inventory names the removed terms on purpose — exempt it from the term scan by
    // removing it from a scan copy at the TOP LEVEL ONLY. Exempting the key by name at every depth would
    // let anyone hide live architecture under `architecture_summary.deprecated_ca_inventory`; a nested
    // occurrence of that key is therefore scanned like any other field.
    let mut scanned = src.clone();
    if let Some(obj) = scanned.as_object_mut() {
        obj.remove("deprecated_ca_inventory");
    }

    let governance = present(src, "governance_model_summary");
    let architecture = present(src, "architecture_summary");
    let self_pub = present(src, "operator_self_publication_summary");
    let conformance = present(src, "conformance_automation_summary");
    let trust_root = present(src, "trust_root_summary");
    let revocation = present(src, "revocation_model_summary");
    let maintainers = present(src, "protocol_maintainers_summary");
    let succession = present(src, "succession_model_summary");
    let inventory = present(src, "deprecated_ca_inventory");
    let boundary = present(src, "boundary_confirmation");

    // ── detections (all structural, all in Rust) ──
    let mut ca_hits = detect_ca_dependency(&scanned);
    ca_hits.extend(active_inventory_entries(inventory));
    let human_hits = detect_human_approval(&scanned);
    let cert_hits = detect_certificate_semantics(&scanned);
    let permissioned_hits = detect_permissioned(&scanned);

    let ca_dependency_detected = !ca_hits.is_empty();
    let human_operator_approval_detected = !human_hits.is_empty();
    let certificate_semantics_detected = !cert_hits.is_empty();
    let permissioned_network_claim_detected = !permissioned_hits.is_empty();

    let regulatory_fail = boundary.map(claims_regulatory_fail).unwrap_or(false);
    let boundary_confirmed = boundary
        .map(|b| flag_true(b, "banza_is_open_financial_protocol") && !flag_true(b, "banza_is_psp"))
        .unwrap_or(false);

    // ── gates ──
    let conformance_gate = conformance.is_some()
        && documented(conformance, "validators_documented")
        && documented(conformance, "tests_documented")
        && documented(conformance, "machine_verifiable");
    let self_pub_gate = self_pub.is_some()
        && documented(self_pub, "manifest_documented")
        && documented(self_pub, "evidence_documented")
        && documented(self_pub, "operator_responsibility_documented")
        && documented(self_pub, "no_human_approval_step");
    let succession_gate = succession.is_some()
        && documented(succession, "open_specs")
        && documented(succession, "open_source")
        && documented(succession, "rfc_process")
        && documented(succession, "maintainers_documented")
        && documented(succession, "forkable");
    // `present()` only proves the key holds an object — `{}` passes it. Without these, a package could
    // supply empty trust-root / revocation / maintainers / governance / architecture summaries and still
    // reach VALID with no missing artifacts. Each must carry the facts its summary claims to report.
    let trust_root_gate = trust_root.is_some()
        && documented(trust_root, "signs_protocol_metadata")
        && documented(trust_root, "does_not_authorise_operators");
    let revocation_gate = revocation.is_some()
        && documented(revocation, "revocation_list_documented")
        && documented(revocation, "security_signal_not_regulatory");
    let maintainers_gate = maintainers.is_some()
        && documented(maintainers, "roles_documented")
        && documented(maintainers, "does_not_approve_operators");
    let governance_gate = governance.is_some()
        && documented(governance, "humans_maintain_protocol")
        && documented(governance, "humans_do_not_authorise_operators");
    let architecture_gate = architecture.is_some() && documented(architecture, "layers_documented");
    let undocumented: Vec<&str> = [
        ("trust_root_summary", trust_root_gate),
        ("revocation_model_summary", revocation_gate),
        ("protocol_maintainers_summary", maintainers_gate),
        ("governance_model_summary", governance_gate),
        ("architecture_summary", architecture_gate),
    ]
    .iter()
    .filter(|(_, ok)| !ok)
    .map(|(n, _)| *n)
    .collect();

    let checks: Vec<(&str, bool)> = vec![
        ("governance_model_summary", governance.is_some()),
        ("architecture_summary", architecture.is_some()),
        ("operator_self_publication_summary", self_pub.is_some()),
        ("conformance_automation_summary", conformance.is_some()),
        ("trust_root_summary", trust_root.is_some()),
        ("revocation_model_summary", revocation.is_some()),
        ("protocol_maintainers_summary", maintainers.is_some()),
        ("succession_model_summary", succession.is_some()),
        ("deprecated_ca_inventory", inventory.is_some()),
        ("boundary_confirmation", boundary.is_some()),
    ];
    let missing_artifacts: Vec<String> = checks
        .iter()
        .filter(|(_, ok)| !ok)
        .map(|(n, _)| (*n).to_string())
        .collect();

    // ── status precedence (computed in Rust) ──
    let status = if regulatory_fail {
        "OPEN_GOVERNANCE_INVALID_REGULATORY_BOUNDARY"
    } else if permissioned_network_claim_detected {
        "OPEN_GOVERNANCE_INVALID_PERMISSIONED_NETWORK_CLAIM"
    } else if ca_dependency_detected {
        "OPEN_GOVERNANCE_BLOCKED_BY_CA_DEPENDENCY"
    } else if human_operator_approval_detected {
        "OPEN_GOVERNANCE_BLOCKED_BY_HUMAN_OPERATOR_APPROVAL"
    } else if certificate_semantics_detected {
        "OPEN_GOVERNANCE_BLOCKED_BY_CERTIFICATE_SEMANTICS"
    } else if !conformance_gate {
        "OPEN_GOVERNANCE_BLOCKED_BY_MISSING_CONFORMANCE_AUTOMATION"
    } else if !self_pub_gate {
        "OPEN_GOVERNANCE_BLOCKED_BY_MISSING_OPERATOR_SELF_PUBLICATION"
    } else if !succession_gate {
        "OPEN_GOVERNANCE_BLOCKED_BY_MISSING_SUCCESSION_MODEL"
    } else if !missing_artifacts.is_empty() || !undocumented.is_empty() || !boundary_confirmed {
        "OPEN_GOVERNANCE_INCOMPLETE"
    } else {
        "OPEN_GOVERNANCE_VALID"
    };

    let mut blocked_items: Vec<String> = Vec::new();
    if regulatory_fail {
        blocked_items.push("boundary_confirmation afirma que o BANZA é PSP / precisa de licença / autoriza ou certifica operadores / movimenta fundos".into());
    }
    for h in &permissioned_hits {
        blocked_items.push(format!("rede permissionada: {h}"));
    }
    for h in &ca_hits {
        blocked_items.push(format!("dependência de autoridade central removida: {h}"));
    }
    for h in &human_hits {
        blocked_items.push(format!("aprovação humana de operador: {h}"));
    }
    for h in &cert_hits {
        blocked_items.push(format!("semântica de certificado de operador: {h}"));
    }
    if !conformance_gate {
        blocked_items.push(
            "conformance automation em falta ou incompleta (validators/tests/machine_verifiable)"
                .into(),
        );
    }
    if !self_pub_gate {
        blocked_items.push("operator self-publication em falta ou incompleta (manifest/evidence/responsabilidade/sem passo de aprovação humana)".into());
    }
    if !succession_gate {
        blocked_items.push("succession model em falta ou incompleto (specs abertas/open source/RFC/maintainers/forkable)".into());
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
        "OPEN_GOVERNANCE_VALID" => vec![
            "Governação aberta consistente: nenhuma autoridade humana central, nenhuma aprovação humana de operador, nenhuma semântica de certificado. Operadores independentes implementam o protocolo, publicam manifests e produzem evidência verificável. Nenhum operador é criado/aceite/aprovado/certificado, nenhum certificado é emitido, nenhum fundo é movido.".into(),
        ],
        "OPEN_GOVERNANCE_INVALID_REGULATORY_BOUNDARY" => vec![
            "Remova qualquer afirmação de que o BANZA é PSP, precisa de licença, autoriza/certifica operadores ou movimenta fundos. O BANZA é um protocolo financeiro aberto; a licença pertence ao operador, autorizado pelas entidades competentes.".into(),
        ],
        "OPEN_GOVERNANCE_INVALID_PERMISSIONED_NETWORK_CLAIM" => vec![
            "Remova a afirmação de rede permissionada. O BANZA não é uma rede permissionada por uma autoridade humana central: é um protocolo financeiro aberto com regras públicas e evidência verificável.".into(),
        ],
        "OPEN_GOVERNANCE_BLOCKED_BY_CA_DEPENDENCY" => vec![
            "Remova a dependência da autoridade central removida. Substitua por Protocol Governance, Trust Root, Conformance Automation ou Protocol Maintainers, conforme o contexto. Os termos antigos só podem aparecer no deprecated_ca_inventory, marcados como removidos.".into(),
        ],
        "OPEN_GOVERNANCE_BLOCKED_BY_HUMAN_OPERATOR_APPROVAL" => vec![
            "Remova o passo de aprovação humana de operador. Ninguém aceita operadores por decisão humana central: a implementação demonstra conformidade por regras públicas, manifests, testes e evidência verificável.".into(),
        ],
        "OPEN_GOVERNANCE_BLOCKED_BY_CERTIFICATE_SEMANTICS" => vec![
            "Remova a semântica de certificado de operador. Use conformance evidence, manifest_hash, evidence_hash, conformance_status e signed protocol metadata.".into(),
        ],
        "OPEN_GOVERNANCE_BLOCKED_BY_MISSING_CONFORMANCE_AUTOMATION" => vec![
            "Documente a conformance automation: validators, testes, fixtures e estado verificável por máquina.".into(),
        ],
        "OPEN_GOVERNANCE_BLOCKED_BY_MISSING_OPERATOR_SELF_PUBLICATION" => vec![
            "Documente a auto-publicação do operador: manifest, conformance evidence, responsabilidade regulatória do operador e ausência de passo de aprovação humana.".into(),
        ],
        "OPEN_GOVERNANCE_BLOCKED_BY_MISSING_SUCCESSION_MODEL" => vec![
            "Documente o modelo de sucessão: specs públicas, open source, RFC process, maintainers e forkability. Um protocolo financeiro aberto bem desenhado não deve depender da equipa que o criou para continuar a existir.".into(),
        ],
        _ => vec![
            "Complete os artefactos em falta e confirme a fronteira (banza_is_open_financial_protocol = true).".into(),
        ],
    };

    let mut report = json!({
        "status": status,
        "governance_model": GOVERNANCE_MODEL,
        "ca_dependency_detected": ca_dependency_detected,
        "human_operator_approval_detected": human_operator_approval_detected,
        "certificate_semantics_detected": certificate_semantics_detected,
        "permissioned_network_claim_detected": permissioned_network_claim_detected,
        "conformance_automation_summary": summary_of(
            conformance,
            &["validators_documented", "tests_documented", "machine_verifiable"],
            "A conformidade é verificável por máquina: validators, testes e fixtures públicos. Conformidade não é aprovação."),
        "operator_self_publication_summary": summary_of(
            self_pub,
            &["manifest_documented", "evidence_documented", "operator_responsibility_documented", "no_human_approval_step"],
            "Operadores independentes publicam manifest e evidência verificável. Ninguém os aceita nem aprova por decisão humana central."),
        "trust_root_summary": summary_of(
            trust_root,
            &["signs_protocol_metadata", "signs_releases", "signs_delegated_keys", "signs_revocations", "does_not_authorise_operators"],
            "A Trust Root assina metadados do protocolo, releases, chaves delegadas e revogações. Não autoriza operadores nem serviços financeiros."),
        "revocation_summary": summary_of(
            revocation,
            &["revocation_list_documented", "fail_closed_documented", "security_signal_not_regulatory"],
            "Revogação é mecanismo de segurança do protocolo, não sanção regulatória nem licença."),
        "protocol_maintainers_summary": summary_of(
            maintainers,
            &["roles_documented", "rfc_process_documented", "security_response_documented", "does_not_approve_operators"],
            "Humanos mantêm o protocolo: specs, versões, RFCs, segurança, criptografia, documentação, tooling e emergência. Não autorizam operadores."),
        "succession_summary": summary_of(
            succession,
            &["open_specs", "open_source", "rfc_process", "maintainers_documented", "forkable"],
            "Um protocolo financeiro aberto bem desenhado não deve depender da equipa que o criou para continuar a existir."),
        "governance_model_summary": summary_of(
            governance,
            &["humans_maintain_protocol", "humans_do_not_authorise_operators", "rfc_process_documented", "versioned_specifications"],
            "A governação do BANZA mantém o protocolo; não controla quem pode ou não implementar o protocolo."),
        "architecture_summary": summary_of(
            architecture,
            &["layers_documented", "reference_implementation_open_source", "public_protocol_registry_documented"],
            "Arquitectura em camadas: protocolo, implementação de referência, conformance automation, conformance evidence, trust root, revogação, governação e operadores independentes."),
        "deprecated_terms": inventory.cloned().unwrap_or(Value::Null),
        "missing_artifacts": missing_artifacts,
        "blocked_items": blocked_items,
        "next_steps": next_steps,
        "open_financial_protocol": true,
        "central_operator_authority": false,
        "human_operator_approval_required": false,
        "operator_participation_permissionless": true,
        "conformance_is_machine_verifiable": true,
        "humans_maintain_protocol_not_operators": true,
        "not_a_psp": true,
        "not_a_certificate": true,
        "not_an_approval": true,
        "not_a_licence": true,
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
        "tool": "banza-open-governance",
        "tool_version": TOOL_VERSION,
        "test_only": true,
        "llm_calls": 0,
        "external_model_called": false,
    });
    report["report_id"] = json!(format!("open-gov-{}", &sha256_hex(&canon(src))[..12]));
    report["open_governance_report_hash"] = json!(sha256_hex(&canon(&report)));
    report
}

/// Malformed input fails closed on the most restrictive status — never on VALID.
fn fail_closed(detail: &str) -> Value {
    json!({
        "status": "OPEN_GOVERNANCE_INVALID_REGULATORY_BOUNDARY",
        "governance_model": GOVERNANCE_MODEL,
        "ca_dependency_detected": false,
        "human_operator_approval_detected": false,
        "certificate_semantics_detected": false,
        "permissioned_network_claim_detected": false,
        "conformance_automation_summary": Value::Null,
        "operator_self_publication_summary": Value::Null,
        "trust_root_summary": Value::Null,
        "revocation_summary": Value::Null,
        "protocol_maintainers_summary": Value::Null,
        "succession_summary": Value::Null,
        "governance_model_summary": Value::Null,
        "architecture_summary": Value::Null,
        "deprecated_terms": Value::Null,
        "missing_artifacts": REQUIRED_INPUTS,
        "blocked_items": [detail],
        "next_steps": ["Corrija o input e revalide."],
        "open_financial_protocol": true,
        "central_operator_authority": false,
        "human_operator_approval_required": false,
        "operator_participation_permissionless": true,
        "conformance_is_machine_verifiable": true,
        "humans_maintain_protocol_not_operators": true,
        "not_a_psp": true, "not_a_certificate": true, "not_an_approval": true, "not_a_licence": true,
        "does_not_authorise_operators": true, "does_not_certify_operators": true,
        "does_not_accept_operators": true, "does_not_approve_operators": true,
        "does_not_create_operator": true, "does_not_issue_payment_licence": true,
        "does_not_move_funds": true, "does_not_settle_funds": true, "does_not_hold_funds": true,
        "operator_activation_allowed": false, "production_certificates_allowed": false,
        "requires_operator_regulatory_authorisation_if_used_for_real_services": true,
        "boundary": BOUNDARY, "protocol_stance": PROTOCOL_STANCE,
        "tool": "banza-open-governance", "tool_version": TOOL_VERSION,
        "test_only": true, "llm_calls": 0, "external_model_called": false,
    })
}

// ── fixtures (TEST ONLY — NOT PRODUCTION — NO OPERATOR APPROVAL) ──────────────

pub const FIXTURE_NOTE: &str = "TEST ONLY — NOT PRODUCTION — NO OPERATOR APPROVAL";

fn valid_input() -> Value {
    json!({
        "governance_model_summary": {
            "model": "OPEN_PROTOCOL_GOVERNANCE",
            "humans_maintain_protocol": true,
            "humans_do_not_authorise_operators": true,
            "rfc_process_documented": true,
            "versioned_specifications": true,
            "note": FIXTURE_NOTE
        },
        "architecture_summary": {
            "layers_documented": true,
            "layers": ["protocol", "reference_implementation", "conformance_automation", "conformance_evidence", "trust_root", "revocation", "protocol_governance", "operators"],
            "reference_implementation_open_source": true,
            "public_protocol_registry_documented": true,
            "note": FIXTURE_NOTE
        },
        "operator_self_publication_summary": {
            "manifest_documented": true,
            "evidence_documented": true,
            "operator_responsibility_documented": true,
            "no_human_approval_step": true,
            "fields": ["operator_id", "operator_manifest_url", "protocol_version", "capabilities", "conformance_report_hash", "evidence_bundle_hash", "public_keys", "revocation_status", "regulatory_responsibility_statement"],
            "note": FIXTURE_NOTE
        },
        "conformance_automation_summary": {
            "validators_documented": true,
            "tests_documented": true,
            "machine_verifiable": true,
            "validator_count": 12,
            "note": FIXTURE_NOTE
        },
        "trust_root_summary": {
            "threshold": "2-of-3",
            "signs_protocol_metadata": true,
            "signs_releases": true,
            "signs_delegated_keys": true,
            "signs_revocations": true,
            "does_not_authorise_operators": true,
            "note": FIXTURE_NOTE
        },
        "revocation_model_summary": {
            "revocation_list_documented": true,
            "fail_closed_documented": true,
            "security_signal_not_regulatory": true,
            "note": FIXTURE_NOTE
        },
        "protocol_maintainers_summary": {
            "roles_documented": true,
            "roles": ["Protocol Maintainer", "Security Maintainer", "Specification Editor", "Release Steward", "Trust Root Custodian", "Conformance Tool Maintainer", "Community Reviewer"],
            "rfc_process_documented": true,
            "security_response_documented": true,
            "does_not_approve_operators": true,
            "note": FIXTURE_NOTE
        },
        "succession_model_summary": {
            "open_specs": true,
            "open_source": true,
            "rfc_process": true,
            "maintainers_documented": true,
            "forkable": true,
            "emergency_maintainers_documented": true,
            "note": FIXTURE_NOTE
        },
        "deprecated_ca_inventory": {
            "entries": [
                { "term": "BANZA CA", "status": "removed", "replacement": "Protocol Governance / Trust Root / Conformance Automation / Protocol Maintainers" },
                { "term": "certificado de operador", "status": "removed", "replacement": "conformance evidence" },
                { "term": "operador certificado", "status": "removed", "replacement": "operador com evidência verificável de conformidade protocolar" },
                { "term": "aceite pela BANZA", "status": "removed", "replacement": "manifest e evidência verificáveis publicamente" },
                { "term": "aprovado pela BANZA", "status": "removed", "replacement": "conformidade protocolar demonstrada por testes públicos" },
                { "term": "autorizado pela BANZA", "status": "removed", "replacement": "operador independente, quando aplicável autorizado pelas entidades competentes" },
                { "term": "/certificates", "status": "legacy_compatibility", "replacement": "/conformance/evidence" }
            ],
            "note": FIXTURE_NOTE
        },
        "boundary_confirmation": {
            "banza_is_open_financial_protocol": true,
            "banza_is_psp": false,
            "banza_needs_licence": false,
            "banza_authorises_operators": false,
            "banza_certifies_operators": false,
            "banza_approves_operators": false,
            "banza_accepts_operators": false,
            "banza_moves_funds": false,
            "licence_belongs_to_operator": true,
            "note": FIXTURE_NOTE
        }
    })
}

/// TEST-ONLY demo fixtures — one per status. No fixture approves, accepts, certifies or activates an
/// operator; none emits a certificate or moves funds.
pub fn demo_fixtures() -> Value {
    let valid = valid_input();

    // An ACTIVE central-authority field outside the deprecation inventory.
    let mut ca_dep = valid.clone();
    ca_dep["governance_model_summary"]["ca_role"] =
        json!("revê e aceita operadores antes de entrarem no protocolo");

    let mut human = valid.clone();
    human["operator_self_publication_summary"]["no_human_approval_step"] = json!(false);
    human["operator_self_publication_summary"]["human_operator_approval_required"] = json!(true);

    let mut cert = valid.clone();
    cert["operator_self_publication_summary"]["certificate_id"] = json!("cert-0001");

    let mut no_conformance = valid.clone();
    no_conformance
        .as_object_mut()
        .unwrap()
        .remove("conformance_automation_summary");

    let mut no_self_pub = valid.clone();
    no_self_pub
        .as_object_mut()
        .unwrap()
        .remove("operator_self_publication_summary");

    let mut no_succession = valid.clone();
    no_succession
        .as_object_mut()
        .unwrap()
        .remove("succession_model_summary");

    let mut reg_fail = valid.clone();
    reg_fail["boundary_confirmation"] = json!({
        "banza_is_open_financial_protocol": true,
        "banza_is_psp": true,
        "banza_needs_licence": true,
        "banza_authorises_operators": true,
        "banza_moves_funds": true
    });

    let mut permissioned = valid.clone();
    permissioned["architecture_summary"]["permissioned_network"] = json!(true);
    permissioned["architecture_summary"]["operator_participation_permissionless"] = json!(false);

    json!({
        "note": FIXTURE_NOTE,
        "fixtures": [
            { "key": "valid_open_governance", "label": "Governação aberta válida", "expected": "OPEN_GOVERNANCE_VALID", "input": valid },
            { "key": "ca_dependency", "label": "Depende de autoridade central removida", "expected": "OPEN_GOVERNANCE_BLOCKED_BY_CA_DEPENDENCY", "input": ca_dep },
            { "key": "human_operator_approval", "label": "Exige aprovação humana de operador", "expected": "OPEN_GOVERNANCE_BLOCKED_BY_HUMAN_OPERATOR_APPROVAL", "input": human },
            { "key": "certificate_semantics", "label": "Usa semântica de certificado", "expected": "OPEN_GOVERNANCE_BLOCKED_BY_CERTIFICATE_SEMANTICS", "input": cert },
            { "key": "missing_conformance_automation", "label": "Sem conformance automation", "expected": "OPEN_GOVERNANCE_BLOCKED_BY_MISSING_CONFORMANCE_AUTOMATION", "input": no_conformance },
            { "key": "missing_operator_self_publication", "label": "Sem operator self-publication", "expected": "OPEN_GOVERNANCE_BLOCKED_BY_MISSING_OPERATOR_SELF_PUBLICATION", "input": no_self_pub },
            { "key": "missing_succession_model", "label": "Sem modelo de sucessão", "expected": "OPEN_GOVERNANCE_BLOCKED_BY_MISSING_SUCCESSION_MODEL", "input": no_succession },
            { "key": "regulatory_boundary_fail", "label": "Sugere BANZA=PSP/autoriza operadores", "expected": "OPEN_GOVERNANCE_INVALID_REGULATORY_BOUNDARY", "input": reg_fail },
            { "key": "permissioned_network_claim", "label": "Afirma rede permissionada", "expected": "OPEN_GOVERNANCE_INVALID_PERMISSIONED_NETWORK_CLAIM", "input": permissioned }
        ]
    })
}

pub fn schema() -> Value {
    json!({
        "tool": "banza-open-governance",
        "tool_version": TOOL_VERSION,
        "governance_model": GOVERNANCE_MODEL,
        "required_inputs": REQUIRED_INPUTS,
        "status_values": STATUS_VALUES,
        "detections": [
            "ca_dependency_detected",
            "human_operator_approval_detected",
            "certificate_semantics_detected",
            "permissioned_network_claim_detected"
        ],
        "allowed_roles": ["Protocol Maintainer", "Security Maintainer", "Specification Editor", "Release Steward", "Trust Root Custodian", "Conformance Tool Maintainer", "Community Reviewer"],
        "forbidden_roles": ["Operator Approver", "Operator Certifier", "Payment Service Authoriser", "Regulatory Approver", "Human Gatekeeper"],
        "deprecation_exempt_subtree": "deprecated_ca_inventory",
        "retired_statuses": RETIRED_STATUSES,
        "network": "local por defeito — sem fetch; sem integração externa.",
        "boundary": BOUNDARY,
        "protocol_stance": PROTOCOL_STANCE,
    })
}

pub fn tool_version() -> Value {
    json!({ "tool": "banza-open-governance", "tool_version": TOOL_VERSION, "test_only": true, "boundary": BOUNDARY })
}
