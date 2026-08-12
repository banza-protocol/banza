//! banza-root-ceremony (M2.1) — validates the BANZA **root trust ceremony (2-of-3)**.
//!
//! Three independent custodians each hold ONE Ed25519 root key; two signatures are required (2-of-3). This
//! engine verifies, LOCALLY and with NO network, the root metadata, the custodian public keys, the Ed25519
//! signatures, the 2-of-3 threshold, the custody/backup/offline/recovery declarations, the root scope and
//! the regulatory boundary — and it **detects any forbidden private-key material** in the input. It
//! computes the ceremony **status IN RUST** (never in TypeScript) plus SHA-256 hashes. Verification only —
//! **no key generation, no signing, no real private keys** (fixtures use deterministic TEST-ONLY keys).
//!
//! **Central rule:** the M2 root establishes trust for the BANZA **open financial protocol**. It does NOT
//! authorise payment services, does NOT create operators, does NOT issue licences, does NOT process
//! transactions, does NOT settle values, does NOT move or hold funds, and does NOT replace the regulatory
//! authorisation of the operators that implement the protocol. BANZA remains an open financial protocol;
//! PSPs, banks or authorised operators are separate entities that implement it. Every report carries the
//! boundary flags, `llm_calls = 0` and `external_model_called = false`.

use base64::Engine as _;
use ed25519_dalek::{Signature, VerifyingKey};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

#[cfg(feature = "wasm")]
mod wasm;

pub mod sign;

pub const TOOL_VERSION: &str = "0.1.0";
pub const THRESHOLD: u64 = 2;
pub const TOTAL_ROOT_KEYS: u64 = 3;
pub const BOUNDARY: &str =
    "A raiz M2 do BANZA estabelece confiança do protocolo financeiro aberto BANZA. Ela não autoriza serviços de pagamento, não cria operador, não emite licença, não processa transacções, não liquida valores, não movimenta fundos e não substitui autorização regulatória dos operadores que implementam o protocolo.";
pub const PROTOCOL_STANCE: &str =
    "BANZA é um protocolo financeiro aberto. PSPs, bancos ou operadores autorizados são entidades separadas que podem implementar o protocolo para prestar serviços financeiros reais.";

pub const STATUS_VALUES: &[&str] = &[
    "M2_ROOT_CEREMONY_VALID",
    "M2_ROOT_CEREMONY_INCOMPLETE",
    "M2_ROOT_CEREMONY_BLOCKED_BY_THRESHOLD",
    "M2_ROOT_CEREMONY_BLOCKED_BY_CUSTODY_GAP",
    "M2_ROOT_CEREMONY_BLOCKED_BY_BACKUP_GAP",
    "M2_ROOT_CEREMONY_BLOCKED_BY_OFFLINE_EVIDENCE_GAP",
    "M2_ROOT_CEREMONY_BLOCKED_BY_RECOVERY_TEST_GAP",
    "M2_ROOT_CEREMONY_INVALID_FORBIDDEN_PRIVATE_KEY_MATERIAL",
    "M2_ROOT_CEREMONY_INVALID_SCOPE",
    "M2_ROOT_CEREMONY_INVALID_SIGNATURE",
    "M2_ROOT_CEREMONY_INVALID_REGULATORY_BOUNDARY",
];

/// The only scope strings the root may carry. Anything else is INVALID_SCOPE.
pub const ALLOWED_SCOPE: &[&str] = &[
    "root_metadata",
    "delegation",
    "rotation",
    "revocation",
    "trust_policy",
];

/// Boundary flags on the root metadata that, if TRUE, over-claim payment/operator/fund authority → INVALID_SCOPE.
const FORBIDDEN_BOUNDARY_TRUE: &[&str] = &[
    "payment_authority",
    "payment_service_authority",
    "operator_authorisation_authority",
    "moves_funds",
    "settles_funds",
    "holds_funds",
    "issues_payment_licence",
    "licensed_by_banza",
    "creates_operator",
    "production_certificates",
    "authorises_payments",
    "authorises_operators",
];

/// Regulatory-boundary confirmation flags that, if TRUE, wrongly claim BANZA is a PSP/operator → INVALID_REGULATORY_BOUNDARY.
const REGULATORY_FAIL_FLAGS: &[&str] = &[
    "banza_is_psp",
    "banza_is_operator",
    "banza_is_financial_operator",
    "banza_provides_payment_services",
    "banza_needs_licence",
    "banza_processes_payments",
    "banza_settles_funds",
    "banza_moves_funds",
    "banza_holds_funds",
];

/// Field-name substrings that, when carrying a non-empty STRING value, mean the input leaks private-key
/// material. Boolean declarations of ABSENCE (e.g. `plaintext_private_key: false`) are NOT leaks.
const FORBIDDEN_KEY_NAMES: &[&str] = &[
    "private_key",
    "privatekey",
    "root_private_key",
    "secret_key",
    "secret_seed",
    "raw_seed",
    "seed_phrase",
    "mnemonic",
    "signing_secret",
    "private_key_material",
    "ed25519_private_key",
    "passphrase",
];

// ── helpers ───────────────────────────────────────────────────────────────────

fn str_at<'a>(v: &'a Value, k: &str) -> Option<&'a str> {
    v.get(k).and_then(|x| x.as_str())
}
fn present<'a>(input: &'a Value, k: &str) -> Option<&'a Value> {
    input
        .get(k)
        .filter(|v| !v.is_null() && (v.is_object() || v.is_array()))
}
fn flag_true(v: &Value, k: &str) -> bool {
    v.get(k).and_then(|x| x.as_bool()) == Some(true)
}
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
fn b64url_decode(s: &str) -> Option<Vec<u8>> {
    base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(s)
        .ok()
}

/// The canonical message: the object minus `exclude` fields, in **BANZA Canonical JSON `BCJ/1`**
/// (`spec/canonicalization.md`).
///
/// This crate signs trust root metadata, which `BCJ/1` §6 covers, so it must not derive its own
/// bytes. It previously used `serde_json::to_vec` — the pre-remediation behaviour — which made this
/// engine a second, unpublished definition of the byte form. It now delegates.
pub fn canonical_bytes(doc: &Value, exclude: &[&str]) -> Result<Vec<u8>, String> {
    banza_trust::canonical_bytes(doc, exclude)
}

/// Verify an Ed25519 signature (base64url) over `msg` with a base64url 32-byte public key.
pub fn verify_ed25519(pub_b64url: &str, msg: &[u8], sig_b64url: &str) -> bool {
    let pk = match b64url_decode(pub_b64url) {
        Some(b) if b.len() == 32 => b,
        _ => return false,
    };
    let sg = match b64url_decode(sig_b64url) {
        Some(b) if b.len() == 64 => b,
        _ => return false,
    };
    let mut pk32 = [0u8; 32];
    pk32.copy_from_slice(&pk);
    let mut sg64 = [0u8; 64];
    sg64.copy_from_slice(&sg);
    let vk = match VerifyingKey::from_bytes(&pk32) {
        Ok(v) => v,
        Err(_) => return false,
    };
    let sig = Signature::from_bytes(&sg64);
    vk.verify_strict(msg, &sig).is_ok()
}

/// SHA-256 fingerprint (hex, 32 chars) of a base64url public key.
fn fingerprint(pub_b64url: &str) -> String {
    match b64url_decode(pub_b64url) {
        Some(b) => format!("{:x}", Sha256::digest(&b))[..32].to_string(),
        None => "invalid".to_string(),
    }
}

/// Recursively detect forbidden private-key material: a forbidden field-name carrying a non-empty STRING,
/// or a value containing a PEM private-key block. Boolean ABSENCE declarations are NOT leaks.
fn detect_forbidden_material(v: &Value) -> Option<String> {
    match v {
        Value::Object(m) => {
            for (k, val) in m {
                let kl = k.to_lowercase();
                if let Value::String(s) = val {
                    if !s.is_empty() && FORBIDDEN_KEY_NAMES.iter().any(|f| kl.contains(f)) {
                        return Some(format!("campo '{k}' contém material de chave"));
                    }
                }
                if let Some(x) = detect_forbidden_material(val) {
                    return Some(x);
                }
            }
            None
        }
        Value::Array(a) => {
            for x in a {
                if let Some(y) = detect_forbidden_material(x) {
                    return Some(y);
                }
            }
            None
        }
        Value::String(s) => {
            let up = s.to_uppercase();
            if up.contains("BEGIN") && up.contains("PRIVATE KEY") {
                return Some("bloco PEM de private key num valor".into());
            }
            let low = s.to_lowercase();
            if low.contains("seed_phrase") || low.contains("mnemonic:") {
                return Some("seed/mnemonic num valor".into());
            }
            None
        }
        _ => None,
    }
}

fn claims_regulatory_fail(v: &Value) -> bool {
    REGULATORY_FAIL_FLAGS.iter().any(|f| flag_true(v, f))
}

/// Validate the root trust ceremony. `input` may be the object or a `{ input: {...} }` wrapper.
pub fn validate_root_ceremony(input: &Value) -> Value {
    if !input.is_object() {
        return fail_closed("input da root ceremony deve ser um objecto JSON");
    }
    let src = match input.get("input") {
        Some(i) if i.is_object() => i,
        _ => input,
    };

    // ── 2. forbidden private-key material (over the whole input) ──
    if let Some(reason) = detect_forbidden_material(src) {
        return report(
            "M2_ROOT_CEREMONY_INVALID_FORBIDDEN_PRIVATE_KEY_MATERIAL",
            src,
            &[&format!("Material de chave privada proibido detectado: {reason}. Nenhuma private key/seed/passphrase pode entrar no input, repo, website, Workbench, servidor, CI ou .env.")],
            true,
        );
    }

    let meta = present(src, "root_metadata");
    let regulatory = present(src, "regulatory_boundary_confirmation");
    let ceremony_evidence = present(src, "ceremony_evidence");
    let custody = present(src, "custody_declarations").and_then(|v| v.as_array());
    let backups = present(src, "backup_declarations").and_then(|v| v.as_array());
    let offline = present(src, "offline_computer_declarations").and_then(|v| v.as_array());
    let recovery = present(src, "recovery_test_declarations").and_then(|v| v.as_array());

    // ── 3a. regulatory boundary ──
    if regulatory.map(claims_regulatory_fail).unwrap_or(false) {
        return report(
            "M2_ROOT_CEREMONY_INVALID_REGULATORY_BOUNDARY",
            src,
            &["Remova qualquer afirmação de que BANZA é PSP / operador financeiro / prestador de serviços de pagamento. BANZA permanece protocolo financeiro aberto."],
            false,
        );
    }

    // ── 3b. forbidden scope (root over-claiming payment/operator/fund authority) ──
    let scope: Vec<String> = meta
        .and_then(|m| m.get("scope"))
        .and_then(|s| s.as_array())
        .map(|a| {
            a.iter()
                .filter_map(|x| x.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    let scope_out_of_bounds = scope.iter().any(|s| !ALLOWED_SCOPE.contains(&s.as_str()));
    let boundary_over_claim = meta
        .and_then(|m| m.get("boundary"))
        .map(|b| FORBIDDEN_BOUNDARY_TRUE.iter().any(|f| flag_true(b, f)))
        .unwrap_or(false);
    if scope_out_of_bounds || boundary_over_claim {
        return report(
            "M2_ROOT_CEREMONY_INVALID_SCOPE",
            src,
            &["A raiz assina root metadata, delegações, rotação, revogação e trust policy — não pagamentos, operadores, licenças ou fundos. Remova a autoridade de pagamento/operador/fundos declarada."],
            false,
        );
    }

    // ── signatures + threshold ──
    let keys: Vec<&Value> = meta
        .and_then(|m| m.get("keys"))
        .and_then(|a| a.as_array())
        .map(|a| a.iter().collect())
        .unwrap_or_default();
    let sigs: Vec<&Value> = meta
        .and_then(|m| m.get("signatures"))
        .and_then(|a| a.as_array())
        .map(|a| a.iter().collect())
        .unwrap_or_default();
    let threshold = meta
        .and_then(|m| m.get("threshold"))
        .and_then(|x| x.as_u64())
        .unwrap_or(THRESHOLD);

    // Fail-closed: absent metadata, or metadata BCJ/1 rejects, yields no verifiable bytes. An empty
    // message is NOT substituted — every signature over it would then compare against the same input.
    let msg: Option<Vec<u8>> = meta.and_then(|m| canonical_bytes(m, &["signatures"]).ok());
    let mut valid_signatures = 0u64;
    let mut invalid_signature_present = false;
    for s in &sigs {
        let key_id = str_at(s, "key_id").unwrap_or("");
        let sig_val = str_at(s, "signature").unwrap_or("");
        let pubkey = keys
            .iter()
            .find(|k| str_at(k, "key_id") == Some(key_id))
            .and_then(|k| str_at(k, "public_key"));
        match pubkey {
            Some(pk) if msg.as_ref().is_some_and(|m| verify_ed25519(pk, m, sig_val)) => {
                valid_signatures += 1
            }
            _ => invalid_signature_present = true,
        }
    }

    // ── 4. invalid signature (a present signature that does not verify) ──
    if invalid_signature_present {
        return report(
            "M2_ROOT_CEREMONY_INVALID_SIGNATURE",
            src,
            &["Uma assinatura presente não verifica contra a public key do custodian. Verifique a canonicalização e a correspondência key_id ↔ public key."],
            false,
        );
    }

    // ── 5. threshold (2-of-3) ──
    if valid_signatures < threshold {
        return report(
            "M2_ROOT_CEREMONY_BLOCKED_BY_THRESHOLD",
            src,
            &[&format!("Threshold {threshold}-de-{TOTAL_ROOT_KEYS} não atingido: {valid_signatures} assinatura(s) válida(s). Nenhuma pessoa assina sozinha; são necessárias 2 assinaturas de custodians distintos.")],
            false,
        );
    }

    // ── custodians ──
    let custodians: Vec<String> = keys
        .iter()
        .filter_map(|k| str_at(k, "custodian").map(String::from))
        .collect();
    let mut seen = std::collections::BTreeSet::new();
    let mut duplicate = false;
    for c in &custodians {
        if !seen.insert(c.clone()) {
            duplicate = true;
        }
    }
    let custodian_count = seen.len() as u64;

    let has_decl = |arr: Option<&Vec<Value>>, custodian: &str, checks: &[&str]| -> bool {
        arr.map(|a| {
            a.iter().any(|d| {
                str_at(d, "custodian") == Some(custodian) && checks.iter().all(|c| flag_true(d, c))
            })
        })
        .unwrap_or(false)
    };

    // ── 6. custody gap (duplicate custodian, or missing/invalid custody declaration) ──
    let custody_ok = !duplicate
        && custodian_count == TOTAL_ROOT_KEYS
        && seen.iter().all(|c| {
            has_decl(custody, c, &["holds_single_root_key", "offline_only"])
                && !custody
                    .map(|a| {
                        a.iter().any(|d| {
                            str_at(d, "custodian") == Some(c.as_str())
                                && flag_true(d, "device_holds_more_than_one_root_key")
                        })
                    })
                    .unwrap_or(false)
        });
    if !custody_ok {
        return report(
            "M2_ROOT_CEREMONY_BLOCKED_BY_CUSTODY_GAP",
            src,
            &["Custódia incompleta: cada custodian controla exactamente uma root key (holds_single_root_key=true, device_holds_more_than_one_root_key=false, offline_only=true) e nenhum custodian se repete."],
            false,
        );
    }

    // ── 7. backup gap ──
    let backup_ok = seen.iter().all(|c| {
        has_decl(
            backups,
            c,
            &["encrypted_backup", "passphrase_stored_off_device"],
        ) && !backups
            .map(|a| {
                a.iter().any(|d| {
                    str_at(d, "custodian") == Some(c.as_str())
                        && flag_true(d, "plaintext_private_key")
                })
            })
            .unwrap_or(false)
    });
    if !backup_ok {
        return report(
            "M2_ROOT_CEREMONY_BLOCKED_BY_BACKUP_GAP",
            src,
            &["Backup cifrado em falta: cada custodian tem uma pendrive com backup cifrado (encrypted_backup=true), passphrase fora da pendrive e nenhuma private key em claro."],
            false,
        );
    }

    // ── 8. offline evidence gap ──
    let offline_ok = seen
        .iter()
        .all(|c| has_decl(offline, c, &["offline_confirmed"]));
    if !offline_ok {
        return report(
            "M2_ROOT_CEREMONY_BLOCKED_BY_OFFLINE_EVIDENCE_GAP",
            src,
            &["Declaração de computador offline em falta: cada custodian confirma modo cerimónia offline (Wi-Fi/Bluetooth/cloud sync desligados; nenhuma private key toca ambiente online)."],
            false,
        );
    }

    // ── 9. recovery test gap ──
    let recovery_ok = seen.iter().all(|c| {
        has_decl(
            recovery,
            c,
            &["recovery_tested", "public_key_matches_after_restore"],
        )
    });
    if !recovery_ok {
        return report(
            "M2_ROOT_CEREMONY_BLOCKED_BY_RECOVERY_TEST_GAP",
            src,
            &["Teste de recuperação em falta: cada custodian testa a recuperação offline do backup cifrado com um artefacto TEST ONLY e confirma que a public key coincide."],
            false,
        );
    }

    // ── 10. incomplete (a required artifact entirely absent) ──
    if meta.is_none() || ceremony_evidence.is_none() || regulatory.is_none() || keys.is_empty() {
        return report(
            "M2_ROOT_CEREMONY_INCOMPLETE",
            src,
            &["Artefacto obrigatório em falta (root_metadata / ceremony_evidence / regulatory_boundary_confirmation). Complete o pacote e revalide."],
            false,
        );
    }

    // ── 11. valid ──
    report("M2_ROOT_CEREMONY_VALID", src, &["A cerimónia root 2-de-3 está estruturada e verificada (test-only). A raiz M2 estabelece confiança do protocolo financeiro aberto BANZA — não autoriza pagamentos, não cria operador, não emite licença e não move fundos. A cerimónia real de production keys corre OFFLINE nos computadores dos custodians; o repo/CI/website/servidor nunca contêm private keys reais."], false)
}

/// Build the full report envelope with all summaries + boundary flags. `status` decided by the caller.
fn report(status: &str, src: &Value, next_steps: &[&str], _material: bool) -> Value {
    let meta = present(src, "root_metadata");
    let keys: Vec<&Value> = meta
        .and_then(|m| m.get("keys"))
        .and_then(|a| a.as_array())
        .map(|a| a.iter().collect())
        .unwrap_or_default();
    let sigs: Vec<&Value> = meta
        .and_then(|m| m.get("signatures"))
        .and_then(|a| a.as_array())
        .map(|a| a.iter().collect())
        .unwrap_or_default();
    let threshold = meta
        .and_then(|m| m.get("threshold"))
        .and_then(|x| x.as_u64())
        .unwrap_or(THRESHOLD);

    // Fail-closed: absent metadata, or metadata BCJ/1 rejects, yields no verifiable bytes. An empty
    // message is NOT substituted — every signature over it would then compare against the same input.
    let msg: Option<Vec<u8>> = meta.and_then(|m| canonical_bytes(m, &["signatures"]).ok());
    let mut valid = 0u64;
    let mut missing: Vec<String> = Vec::new();
    for s in &sigs {
        let key_id = str_at(s, "key_id").unwrap_or("");
        let sig_val = str_at(s, "signature").unwrap_or("");
        let pk = keys
            .iter()
            .find(|k| str_at(k, "key_id") == Some(key_id))
            .and_then(|k| str_at(k, "public_key"));
        if pk
            .map(|p| msg.as_ref().is_some_and(|m| verify_ed25519(p, m, sig_val)))
            .unwrap_or(false)
        {
            valid += 1;
        }
    }
    if valid < threshold {
        missing.push(format!(
            "{} assinatura(s) em falta para o threshold",
            threshold - valid
        ));
    }

    let custodians: std::collections::BTreeSet<String> = keys
        .iter()
        .filter_map(|k| str_at(k, "custodian").map(String::from))
        .collect();
    let duplicate: Vec<String> = {
        let mut seen = std::collections::BTreeSet::new();
        keys.iter()
            .filter_map(|k| str_at(k, "custodian").map(String::from))
            .filter(|c| !seen.insert(c.clone()))
            .collect()
    };

    let fingerprints: Vec<Value> = keys
        .iter()
        .map(|k| {
            json!({
                "key_id": str_at(k, "key_id").unwrap_or(""),
                "custodian": str_at(k, "custodian").unwrap_or(""),
                "fingerprint": str_at(k, "public_key").map(fingerprint).unwrap_or_else(|| "missing".into()),
            })
        })
        .collect();

    let cnt = |arr: &str| {
        present(src, arr)
            .and_then(|v| v.as_array())
            .map(|a| a.len())
            .unwrap_or(0)
    };
    let established = status == "M2_ROOT_CEREMONY_VALID";

    let root_metadata_hash = meta.map(|m| sha256_hex(&canon(m))).unwrap_or_default();
    let ceremony_evidence_hash = present(src, "ceremony_evidence")
        .map(|e| sha256_hex(&canon(e)))
        .or_else(|| meta.and_then(|m| str_at(m, "ceremony_evidence_hash").map(String::from)))
        .unwrap_or_default();

    let mut out = json!({
        "status": status,
        "threshold": threshold,
        "total_root_keys": TOTAL_ROOT_KEYS,
        "custodian_count": custodians.len(),
        "valid_signature_count": valid,
        "missing_signatures": missing,
        "duplicate_custodians": duplicate,
        "key_fingerprints": fingerprints,
        "custody_summary": { "declarations": cnt("custody_declarations"), "note": "cada custodian controla uma root key; nenhum dispositivo contém mais de uma." },
        "backup_summary": { "declarations": cnt("backup_declarations"), "note": "backup cifrado por custodian; passphrase fora da pendrive; nenhuma private key em claro." },
        "offline_environment_summary": { "declarations": cnt("offline_computer_declarations"), "note": "computador pessoal apenas em modo cerimónia offline." },
        "recovery_test_summary": { "declarations": cnt("recovery_test_declarations"), "note": "recuperação testada offline com artefacto TEST ONLY." },
        "forbidden_private_key_material_detected": status == "M2_ROOT_CEREMONY_INVALID_FORBIDDEN_PRIVATE_KEY_MATERIAL",
        "forbidden_scope_detected": status == "M2_ROOT_CEREMONY_INVALID_SCOPE",
        "boundary_summary": {
            "open_financial_protocol": true,
            "root_scope": ALLOWED_SCOPE,
            "root_does_not": ["authorise payment services", "create operators", "issue licences", "process/settle/move/hold funds", "replace operator regulatory authorisation"],
            "stance": PROTOCOL_STANCE,
        },
        "root_metadata_hash": root_metadata_hash,
        "ceremony_evidence_hash": ceremony_evidence_hash,
        "next_steps": next_steps,
        "protocol_root_established": established,
        "operator_activation_allowed": false,
        "production_certificates_allowed": false,
        "payment_service_operation_allowed": false,
        "not_a_psp": true,
        "open_financial_protocol": true,
        "does_not_move_funds": true,
        "does_not_settle_funds": true,
        "does_not_hold_funds": true,
        "does_not_create_operator": true,
        "does_not_issue_payment_service_authorisation": true,
        "does_not_authorise_payments": true,
        "requires_operator_regulatory_authorisation_if_used_for_real_services": true,
        "boundary": BOUNDARY,
        "protocol_stance": PROTOCOL_STANCE,
        "tool": "banza-root-ceremony",
        "tool_version": TOOL_VERSION,
        "test_only": true,
        "llm_calls": 0,
        "external_model_called": false,
    });
    out["report_id"] = json!(format!("root-ceremony-{}", &sha256_hex(&canon(src))[..12]));
    out["root_ceremony_report_hash"] = json!(sha256_hex(&canon(&out)));
    out
}

fn fail_closed(detail: &str) -> Value {
    report(
        "M2_ROOT_CEREMONY_INVALID_REGULATORY_BOUNDARY",
        &json!({}),
        &[detail, "Corrija o input e revalide."],
        false,
    )
}

// ── fixtures (TEST ONLY — NOT PRODUCTION — NO REAL PRIVATE KEYS) ────────────────

pub const FIXTURE_NOTE: &str = "TEST ONLY — NOT PRODUCTION — NO REAL PRIVATE KEYS";

pub fn demo_fixtures() -> Value {
    sign::demo_fixtures()
}

pub fn schema() -> Value {
    json!({
        "tool": "banza-root-ceremony", "tool_version": TOOL_VERSION,
        "threshold": THRESHOLD, "total_root_keys": TOTAL_ROOT_KEYS,
        "status_values": STATUS_VALUES,
        "allowed_scope": ALLOWED_SCOPE,
        "algorithm": "ed25519",
        "network": "local por defeito — sem fetch; verificação apenas; sem geração/assinatura de chaves reais.",
        "published_material": ["public keys", "key IDs", "fingerprints", "root metadata", "signatures", "threshold policy", "ceremony evidence hash", "custody/backup/recovery declarations sem segredo"],
        "forbidden_material": ["private keys", "seeds", "mnemonics", "passphrases", "encrypted private-key backups", "USB images", "recovery material", "raw entropy", "secret logs"],
        "boundary": BOUNDARY,
        "protocol_stance": PROTOCOL_STANCE,
    })
}

pub fn tool_version() -> Value {
    json!({ "tool": "banza-root-ceremony", "tool_version": TOOL_VERSION, "test_only": true, "boundary": BOUNDARY })
}
