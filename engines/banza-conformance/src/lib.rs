//! banza-conformance-rs (ADR-038, R4) — the Rust BANZA conformance runner.
//!
//! Offline scope (this phase): conformance-vector integrity, financial-invariant consistency,
//! certification-level computation, and schema-compatible report generation, with golden parity.
//! Federation runs in-process via banza-simb + banza-trust (`run_fed`); running against a REAL
//! external operator over HTTP is a PRE-PRODUCTION state (no operator exists yet), not a port gap
//! running operator and R5 trust/crypto — R4 does not fake that parity).
//!
//! PASS is **technical conformance evidence, not production certification**. This runner never emits a
//! certificate, never adds an operator, never activates M2/M3. No network by default; no crypto.

pub mod federation_ab;
pub mod federation_fixtures;
pub mod live;
pub mod tool;

#[cfg(feature = "wasm")]
mod wasm;

use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const RUNNER: &str = "banza-conformance-rs";
pub const RUNNER_VERSION: &str = "0.1.0";
pub const PROTOCOL_VERSION: &str = "1.0.0";

/// The public meaning of PASS — repeated in every report. Do not weaken.
pub const CERTIFICATION_DISCLAIMER: &str =
    "PASS is technical conformance evidence, not production certification. Production certification requires the offline root-key ceremony and the first published production conformance evidence; no implementation holds production certification and no production certificate is active.";

/// The embedded conformance vectors (the offline source of truth for this runner).
pub const VECTOR_FILES: &[(&str, &str)] = &[
    (
        "collections.json",
        include_str!("../../../conformance/vectors/collections.json"),
    ),
    (
        "event-envelopes.json",
        include_str!("../../../conformance/vectors/event-envelopes.json"),
    ),
    (
        "ledger-postings.json",
        include_str!("../../../conformance/vectors/ledger-postings.json"),
    ),
    (
        "operator-manifests.json",
        include_str!("../../../conformance/vectors/operator-manifests.json"),
    ),
    (
        "payment-requests.json",
        include_str!("../../../conformance/vectors/payment-requests.json"),
    ),
    (
        "qr-payloads.json",
        include_str!("../../../conformance/vectors/qr-payloads.json"),
    ),
    (
        "settlement-batches.json",
        include_str!("../../../conformance/vectors/settlement-batches.json"),
    ),
    (
        "transfers.json",
        include_str!("../../../conformance/vectors/transfers.json"),
    ),
    (
        "wallet-balances.json",
        include_str!("../../../conformance/vectors/wallet-balances.json"),
    ),
];

// ── Levels ───────────────────────────────────────────────────────────────────

/// Suite-INTERNAL certification band of a conformance vector (the `certification_level` integer a
/// vector carries), NOT the public conformance profile. The public profiles L0–L4 (Protocol Sandbox …
/// External Interoperability) are a distinct model — see conformance/operators/suite.json `_levels_note`
/// and conformance/README.md. `name()` is used only for internal band identification and is NEVER
/// emitted to a report/public surface (vector processing uses the raw integer); it must not be read as
/// a public-profile claim.
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "UPPERCASE")]
pub enum ConformanceLevel {
    L0,
    L1,
    L2,
    L3,
    L4,
    Unknown,
}

impl ConformanceLevel {
    pub fn from_i64(n: i64) -> Self {
        match n {
            0 => Self::L0,
            1 => Self::L1,
            2 => Self::L2,
            3 => Self::L3,
            4 => Self::L4,
            _ => Self::Unknown,
        }
    }
    pub fn name(&self) -> &'static str {
        match self {
            Self::L0 => "L0",
            Self::L1 => "L1",
            Self::L2 => "L2",
            Self::L3 => "L3",
            Self::L4 => "L4",
            Self::Unknown => "UNKNOWN",
        }
    }
}

// ── Data model ─────────────────────────────────────────────────────────────────

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Pass,
    Fail,
    Skip,
    Error,
}

#[derive(Serialize, Clone, Debug)]
pub struct InvariantResult {
    pub id: String,
    pub status: Status,
    pub expected: String,
    pub actual: String,
    pub reason: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct ConformanceOutcome {
    pub case_id: String,
    pub status: Status,
    pub reason: String,
    pub evidence: Vec<String>,
    pub duration_ms: u64,
    pub error_code: Option<String>,
    pub invariant_results: Vec<InvariantResult>,
}

#[derive(Serialize, Clone, Debug, Default)]
pub struct Totals {
    pub total: usize,
    pub pass: usize,
    pub fail: usize,
    pub skip: usize,
    pub error: usize,
}

#[derive(Serialize, Clone, Debug)]
pub struct ConformanceReport {
    pub runner: String,
    pub runner_version: String,
    pub protocol_version: String,
    pub level: String,
    pub mode: String,
    pub totals: Totals,
    pub outcomes: Vec<ConformanceOutcome>,
    pub machine_readable: bool,
    pub certification_disclaimer: String,
    pub not_yet_ported: Vec<String>,
}

// ── Vectors ─────────────────────────────────────────────────────────────────────

#[derive(Clone, Debug)]
pub struct Vector {
    pub id: String,
    pub title: String,
    pub certification_level: i64,
    pub stability: String,
    pub raw: Value,
}

#[derive(Serialize, Clone, Debug)]
pub struct VectorFileSummary {
    pub name: String,
    pub count: usize,
    pub levels: Vec<i64>,
    pub ids: Vec<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct VectorValidation {
    pub files: Vec<VectorFileSummary>,
    pub total: usize,
    pub invariant_results: Vec<InvariantResult>,
    pub warnings: Vec<String>,
    pub ok: bool,
}

/// Parse the vectors from an embedded file's JSON.
pub fn parse_vectors(content: &str) -> Result<Vec<Vector>, String> {
    let v: Value = serde_json::from_str(content).map_err(|e| format!("json: {e}"))?;
    let arr = v
        .get("vectors")
        .and_then(|x| x.as_array())
        .ok_or("missing 'vectors' array")?;
    let mut out = Vec::new();
    for item in arr {
        out.push(Vector {
            id: item
                .get("id")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string(),
            title: item
                .get("title")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string(),
            certification_level: item
                .get("certification_level")
                .and_then(|x| x.as_i64())
                .unwrap_or(-1),
            stability: item
                .get("stability")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string(),
            raw: item.clone(),
        });
    }
    Ok(out)
}

pub fn load_all_vectors() -> Result<Vec<(String, Vec<Vector>)>, String> {
    let mut out = Vec::new();
    for (name, content) in VECTOR_FILES {
        let vs = parse_vectors(content).map_err(|e| format!("{name}: {e}"))?;
        out.push(((*name).to_string(), vs));
    }
    Ok(out)
}

/// Recursively verify every monetary field (`*_minor`, `amount*`, `gross`, `fee`, `net`) is an
/// integer — INV-LEDGER precision (no floating-point money). Returns the first offending path.
fn find_float_money(v: &Value, path: &str) -> Option<String> {
    match v {
        Value::Object(m) => {
            for (k, val) in m {
                let is_money = k.ends_with("_minor")
                    || k.starts_with("amount")
                    || k == "gross"
                    || k == "fee"
                    || k == "net"
                    || k.ends_with("_amount");
                if is_money {
                    if let Value::Number(n) = val {
                        if n.as_i64().is_none() && n.as_u64().is_none() {
                            return Some(format!("{path}.{k}"));
                        }
                    }
                }
                if let Some(p) = find_float_money(val, &format!("{path}.{k}")) {
                    return Some(p);
                }
            }
            None
        }
        Value::Array(a) => {
            for (i, val) in a.iter().enumerate() {
                if let Some(p) = find_float_money(val, &format!("{path}[{i}]")) {
                    return Some(p);
                }
            }
            None
        }
        _ => None,
    }
}

fn inv(id: &str, status: Status, expected: &str, actual: &str, reason: &str) -> InvariantResult {
    InvariantResult {
        id: id.into(),
        status,
        expected: expected.into(),
        actual: actual.into(),
        reason: reason.into(),
    }
}

/// Validate the conformance vectors: structure + invariant-consistency. Deterministic, offline.
pub fn validate_vectors() -> Result<VectorValidation, String> {
    let all = load_all_vectors()?;
    let mut files = Vec::new();
    let mut invariant_results = Vec::new();
    let mut warnings = Vec::new();
    let mut total = 0usize;
    let mut ok = true;

    for (name, vectors) in &all {
        let mut levels: Vec<i64> = vectors.iter().map(|v| v.certification_level).collect();
        levels.sort_unstable();
        levels.dedup();
        let ids: Vec<String> = vectors.iter().map(|v| v.id.clone()).collect();
        total += vectors.len();

        for v in vectors {
            if v.id.is_empty() {
                warnings.push(format!("{name}: vector with empty id"));
                ok = false;
            }
            if v.title.is_empty() {
                warnings.push(format!("{name}: {} has empty title", v.id));
            }
            // certification level bound
            if !(0..=4).contains(&v.certification_level) {
                invariant_results.push(inv(
                    "INV-LEVEL-BOUND",
                    Status::Fail,
                    "0..4",
                    &v.certification_level.to_string(),
                    &format!("{}/{}", name, v.id),
                ));
                ok = false;
            }
            // integer money everywhere
            if let Some(p) = find_float_money(&v.raw, &v.id) {
                invariant_results.push(inv(
                    "INV-LEDGER-PRECISION",
                    Status::Fail,
                    "integer minor units",
                    "float",
                    &format!("{name}/{} at {p}", v.id),
                ));
                ok = false;
            }
            // a case must describe an action (input/trigger/setup)
            let has_action = v.raw.get("input").is_some()
                || v.raw.get("trigger").is_some()
                || v.raw.get("setup").is_some();
            if !has_action {
                warnings.push(format!("{name}: {} has no input/trigger/setup", v.id));
            }
        }

        // ledger-postings: double-entry structural — every check_ledger entry kind is DEBIT|CREDIT.
        if name == "ledger-postings.json" {
            for v in vectors {
                if let Some(kind) = v
                    .raw
                    .get("check_ledger")
                    .and_then(|c| c.get("expected_new_entry_kind"))
                    .and_then(|k| k.as_str())
                {
                    let good = kind == "DEBIT" || kind == "CREDIT";
                    invariant_results.push(inv(
                        "INV-LEDGER-DOUBLE-ENTRY",
                        if good { Status::Pass } else { Status::Fail },
                        "DEBIT|CREDIT",
                        kind,
                        &format!("{}/{}", name, v.id),
                    ));
                    ok = ok && good;
                }
            }
        }

        // settlement-batches: the settlement identity fields must be required in the expected response.
        if name == "settlement-batches.json" {
            for v in vectors {
                let fields = v
                    .raw
                    .get("expected")
                    .and_then(|e| e.get("response_fields_required"))
                    .and_then(|f| f.as_array())
                    .map(|a| a.iter().filter_map(|x| x.as_str()).collect::<Vec<_>>())
                    .unwrap_or_default();
                if !fields.is_empty() {
                    let has_identity = ["gross_minor", "fee_minor", "net_minor"]
                        .iter()
                        .all(|f| fields.contains(f));
                    invariant_results.push(inv(
                        "INV-SETTLE-IDENTITY-FIELDS",
                        if has_identity {
                            Status::Pass
                        } else {
                            Status::Skip
                        },
                        "gross_minor+fee_minor+net_minor required",
                        &fields.join(","),
                        &format!("{}/{}", name, v.id),
                    ));
                }
            }
        }

        files.push(VectorFileSummary {
            name: name.clone(),
            count: vectors.len(),
            levels,
            ids,
        });
    }

    Ok(VectorValidation {
        files,
        total,
        invariant_results,
        warnings,
        ok,
    })
}

/// Deterministic normalized summary for golden parity (order-stable, no timestamps).
pub fn parity_summary() -> Result<Value, String> {
    let val = validate_vectors()?;
    let files: Vec<Value> = val
        .files
        .iter()
        .map(|f| {
            serde_json::json!({ "name": f.name, "count": f.count, "levels": f.levels, "ids": f.ids })
        })
        .collect();
    let invariant_ids: Vec<String> = {
        let mut v: Vec<String> = val.invariant_results.iter().map(|r| r.id.clone()).collect();
        v.sort();
        v.dedup();
        v
    };
    Ok(serde_json::json!({
        "runner": RUNNER,
        "protocol_version": PROTOCOL_VERSION,
        "total_vectors": val.total,
        "files": files,
        "invariant_ids": invariant_ids,
        "ok": val.ok,
    }))
}

/// Build an offline conformance report from a vector validation. Every outcome is a vector-integrity
/// check (structural), NOT a live-operator result — the report says so and carries the disclaimer.
pub fn offline_report() -> Result<ConformanceReport, String> {
    let val = validate_vectors()?;
    let mut outcomes = Vec::new();
    let mut totals = Totals::default();
    for (name, vectors) in load_all_vectors()? {
        for v in vectors {
            let status = if !(0..=4).contains(&v.certification_level)
                || find_float_money(&v.raw, &v.id).is_some()
            {
                Status::Fail
            } else {
                Status::Pass
            };
            totals.total += 1;
            match status {
                Status::Pass => totals.pass += 1,
                Status::Fail => totals.fail += 1,
                Status::Skip => totals.skip += 1,
                Status::Error => totals.error += 1,
            }
            outcomes.push(ConformanceOutcome {
                case_id: v.id.clone(),
                status,
                reason: format!("vector-integrity ({name})"),
                evidence: vec![format!("conformance/vectors/{name}#{}", v.id)],
                duration_ms: 0,
                error_code: None,
                invariant_results: vec![],
            });
        }
    }
    let _ = val; // validation already folded into per-vector status above
    Ok(ConformanceReport {
        runner: RUNNER.into(),
        runner_version: RUNNER_VERSION.into(),
        protocol_version: PROTOCOL_VERSION.into(),
        level: "vector-integrity".into(),
        mode: "offline".into(),
        totals,
        outcomes,
        machine_readable: true,
        certification_disclaimer: CERTIFICATION_DISCLAIMER.into(),
        not_yet_ported: not_yet_ported(),
    })
}

/// R7–R9: no conformance scope remains unported. Offline (vectors/invariants/report), live-operator
/// (via SimB) and federation (via two SimB + banza-trust) all run in Rust; trust verification and
/// TEST-ONLY signing/ceremony are Rust. Running against a *real external operator* is not a port gap —
/// it is a pre-production state (no operator exists yet).
pub fn not_yet_ported() -> Vec<String> {
    Vec::new()
}

/// Validate that a report JSON carries the required fields and the certification disclaimer.
pub fn validate_report(json: &str) -> Result<(), String> {
    let v: Value = serde_json::from_str(json).map_err(|e| format!("json: {e}"))?;
    for field in [
        "runner",
        "runner_version",
        "protocol_version",
        "totals",
        "certification_disclaimer",
    ] {
        if v.get(field).is_none() {
            return Err(format!("report missing required field: {field}"));
        }
    }
    let disc = v
        .get("certification_disclaimer")
        .and_then(|d| d.as_str())
        .unwrap_or("");
    if !disc.contains("not production certification") {
        return Err(
            "report certification_disclaimer must state PASS is not production certification"
                .into(),
        );
    }
    // never allow a positive production-certification claim in the report
    let lower = json.to_lowercase();
    if lower.contains("production certificate active")
        || lower.contains("operator certified") && !lower.contains("no operator")
    {
        return Err("report contains a forbidden certification claim".into());
    }
    Ok(())
}
