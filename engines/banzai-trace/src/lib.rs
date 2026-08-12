//! Trace explanation + financial-invariant verification (ADR-037).
//!
//! Deterministic verifier: checks INV-TRACE-001 (trace-id propagation), INV-LEDGER-001 (double-entry
//! completeness) and INV-STL-001 (no money creation: net + fee == gross) over a payment-flow trace
//! JSON. No network, no provider, no LLM. Compiled to WASM (`trace_explain_json`) and consumed by
//! `website/components/banzai/traceVerifier.ts` — the live BanzAI "programadores" DraftValidationTool.
//! Parity is proven byte-for-value against golden fixtures generated from the original TypeScript.
//!
//! PROVENANCE (M2.19G.6 — BanzAI monorepo consolidation, ADR-075): extracted verbatim from the
//! former `banza-protocol/banzai` repo `engines/banzai-core/src/trace.rs` (now permanently removed) —
//! identical at commit 9354795 (the source the previously-vendored `banzai_core` WASM was built from)
//! and at that former repo's tip 8611191f. This crate is the sole in-monorepo source for the shipped
//! trace WASM; the three other
//! former `banzai-core` exports (route/search/select_route) were unused in the monorepo and are
//! intentionally not carried. See docs/governance/M2_19G_6_BANZAI_MONOREPO_CONSOLIDATION_2026_08.md.

use serde::Serialize;
use serde_json::{json, Map, Value};

#[derive(Serialize)]
pub struct InvariantCheck {
    pub id: String,
    pub name: String,
    pub status: String,
    pub reason: String,
}

#[derive(Serialize)]
pub struct TimelineEntry {
    pub step: usize,
    pub entity_type: String,
    pub entity_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<String>,
    pub detail: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trace_id: Option<String>,
}

#[derive(Serialize)]
pub struct TraceExplainResult {
    pub trace_id: Option<String>, // serialized as null when None (matches TS `trace_id: null`)
    pub flow_type: String,
    pub event_count: usize,
    pub timeline: Vec<TimelineEntry>,
    pub invariant_checks: Vec<InvariantCheck>,
    pub causal_summary: String,
    pub issues: Vec<String>,
}

/// `String(v)` for the value shapes traces use (string / number / bool / null / absent).
fn js_string(v: Option<&Value>) -> Option<String> {
    match v {
        None | Some(Value::Null) => None,
        Some(Value::String(s)) => Some(s.clone()),
        Some(Value::Bool(b)) => Some(b.to_string()),
        Some(Value::Number(n)) => Some(js_num_str(n)),
        Some(other) => Some(other.to_string()),
    }
}

/// JS `${n}` / `Number->String`: integers print without a decimal point; floats as JS would.
fn js_num_str(n: &serde_json::Number) -> String {
    if let Some(i) = n.as_i64() {
        i.to_string()
    } else if let Some(u) = n.as_u64() {
        u.to_string()
    } else {
        let f = n.as_f64().unwrap_or(f64::NAN);
        if f.fract() == 0.0 && f.is_finite() {
            format!("{}", f as i64)
        } else {
            format!("{f}")
        }
    }
}

/// `a ?? b ?? c` — first present, non-null value.
fn coalesce<'a>(obj: &'a Value, keys: &[&str]) -> Option<&'a Value> {
    for k in keys {
        if let Some(v) = obj.get(k) {
            if !v.is_null() {
                return Some(v);
            }
        }
    }
    None
}

/// `Number(x ?? y ?? NaN)` over minor-unit fields → f64, or None when absent/non-numeric (NaN).
fn num_field(obj: &Value, keys: &[&str]) -> Option<f64> {
    coalesce(obj, keys).and_then(|v| match v {
        Value::Number(n) => n.as_f64(),
        Value::String(s) => s.trim().parse::<f64>().ok(), // JS Number("990") == 990
        _ => None,
    })
}

fn detect_entity_type(id: &str) -> &'static str {
    if id.starts_with("qr_") {
        "QR Payment"
    } else if id.starts_with("txf_") {
        "Transfer"
    } else if id.starts_with("led_") {
        "Ledger Entry"
    } else if id.starts_with("stl_") {
        "Settlement Batch"
    } else if id.starts_with("wal_") {
        "Wallet"
    } else if id.starts_with("tr_") {
        "Trace"
    } else if id.starts_with("pr_") {
        "Payment Request"
    } else {
        "Entity"
    }
}

fn obj_with_type(item: &Value, ty: &str) -> Value {
    // `{ ...item, type: key }` — clone the object and override `type`.
    let mut m = item.as_object().cloned().unwrap_or_default();
    m.insert("type".into(), Value::String(ty.into()));
    Value::Object(m)
}

struct Parsed {
    events: Vec<Value>,
    detected_trace_id: Option<String>,
    flow_type: String,
}

fn parse_trace_from_raw(trace: &Value) -> Parsed {
    let mut events: Vec<Value> = Vec::new();
    let mut detected_trace_id: Option<String> = None;

    if let Some(arr) = trace.as_array() {
        for item in arr {
            if item.is_object() {
                events.push(item.clone());
                if detected_trace_id.is_none() {
                    if let Some(Value::String(s)) = item.get("trace_id") {
                        detected_trace_id = Some(s.clone());
                    }
                }
            }
        }
    } else if let Some(obj) = trace.as_object() {
        if let Some(Value::String(s)) = obj.get("trace_id") {
            detected_trace_id = Some(s.clone());
        }
        for key in [
            "qr",
            "transfer",
            "ledger_entries",
            "settlement_batch",
            "payment_request",
        ] {
            match obj.get(key) {
                Some(Value::Array(items)) => {
                    for item in items {
                        if item.is_object() {
                            events.push(obj_with_type(item, key));
                        }
                    }
                }
                Some(v) if v.is_object() => events.push(obj_with_type(v, key)),
                _ => {}
            }
        }
        if events.is_empty() {
            events.push(Value::Object(obj.clone()));
        }
    }

    // `entity_id ?? id ?? ''` then startsWith checks.
    let idish =
        |e: &Value| -> String { js_string(coalesce(e, &["entity_id", "id"])).unwrap_or_default() };
    let type_is = |e: &Value, t: &str| e.get("type").and_then(|v| v.as_str()) == Some(t);

    let has_qr = events
        .iter()
        .any(|e| type_is(e, "qr") || idish(e).starts_with("qr_"));
    let has_transfer = events
        .iter()
        .any(|e| type_is(e, "transfer") || idish(e).starts_with("txf_"));
    let has_payment_req = events
        .iter()
        .any(|e| type_is(e, "payment_request") || idish(e).starts_with("pr_"));

    let flow_type = if has_qr && has_transfer {
        "qr_payment"
    } else if has_payment_req {
        "payment_request"
    } else if has_transfer {
        "direct_transfer"
    } else {
        "unknown"
    }
    .to_string();

    Parsed {
        events,
        detected_trace_id,
        flow_type,
    }
}

fn build_detail(event: &Value, entity_type: &str) -> String {
    let mut parts: Vec<String> = Vec::new();
    if let Some(s) = event.get("status").and_then(|v| v.as_str()) {
        parts.push(format!("status: {s}"));
    }
    // `if (event.amount_minor)` — truthy (non-zero, present).
    if let Some(v) = event.get("amount_minor") {
        if is_truthy(v) {
            let cur = event.get("currency").and_then(|c| c.as_str()).unwrap_or("");
            parts.push(format!("amount: {} {}", js_value_str(v), cur));
        }
    }
    if let Some(v) = event.get("gross_minor") {
        if is_truthy(v) {
            parts.push(format!("gross: {}", js_value_str(v)));
        }
    }
    // `if (event.balance_after_minor !== undefined)` — present (even if 0).
    if let Some(v) = event.get("balance_after_minor") {
        parts.push(format!("balance_after: {}", js_value_str(v)));
    }
    if parts.is_empty() {
        entity_type.to_string()
    } else {
        format!("{entity_type} — {}", parts.join(", "))
    }
}

fn is_truthy(v: &Value) -> bool {
    match v {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_f64().map(|f| f != 0.0).unwrap_or(false),
        Value::String(s) => !s.is_empty(),
        _ => true,
    }
}

fn js_value_str(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Number(n) => js_num_str(n),
        Value::Bool(b) => b.to_string(),
        Value::Null => "null".into(),
        other => other.to_string(),
    }
}

fn build_causal_summary(
    flow_type: &str,
    event_count: usize,
    trace_id: &Option<String>,
    issues: &[String],
) -> String {
    let prefix = match trace_id {
        Some(t) => format!("Flow trace_id: {t}. "),
        None => String::new(),
    };
    let issue_note = if !issues.is_empty() {
        format!(" ⚠ {} invariant issue(s) detected.", issues.len())
    } else {
        " All invariants appear consistent.".to_string()
    };
    let body = match flow_type {
        "qr_payment" => format!("QR-triggered payment flow with {event_count} entities. Sequence: QR creation → customer payment → transfer execution → ledger entries."),
        "payment_request" => format!("Payment request flow with {event_count} entities. Sequence: request creation → payment → transfer."),
        "direct_transfer" => format!("Direct transfer flow with {event_count} entities. Transfer executed directly without QR."),
        _ => format!("Flow with {event_count} entities. Type could not be determined from available data."),
    };
    format!("{prefix}{body}{issue_note}")
}

/// `input` is `{ trace_id?: string, trace?: <json> }`. `reference_operator_url` mirrors the
/// `BANZAI_REFERENCE_OPERATOR_URL` env read (None = unset); the live route passes it through.
pub fn explain_trace(input: &Value, reference_operator_url: Option<&str>) -> TraceExplainResult {
    let trace = input.get("trace").filter(|v| !v.is_null());
    let input_trace_id = input
        .get("trace_id")
        .and_then(|v| v.as_str())
        .map(String::from);

    if trace.is_none() && input_trace_id.is_none() {
        return TraceExplainResult {
            trace_id: None,
            flow_type: "unknown".into(),
            event_count: 0,
            timeline: vec![],
            invariant_checks: vec![],
            causal_summary: "No trace data provided. Supply either trace_id (requires a certified operator API endpoint) or trace JSON.".into(),
            issues: vec!["No trace data provided".into()],
        };
    }

    if trace.is_none() {
        let needs_backend = reference_operator_url.is_none();
        let (summary, issue) = if needs_backend {
            (
                "Trace lookup backend not configured. Set BANZAI_REFERENCE_OPERATOR_URL to enable trace_id lookup.".to_string(),
                "Trace lookup backend not configured".to_string(),
            )
        } else {
            (
                format!(
                    "Trace {} would be fetched from {} — not yet implemented.",
                    input_trace_id.clone().unwrap_or_default(),
                    reference_operator_url.unwrap_or_default()
                ),
                "Trace lookup not yet implemented".to_string(),
            )
        };
        return TraceExplainResult {
            trace_id: input_trace_id,
            flow_type: "unknown".into(),
            event_count: 0,
            timeline: vec![],
            invariant_checks: vec![],
            causal_summary: summary,
            issues: vec![issue],
        };
    }

    let parsed = parse_trace_from_raw(trace.unwrap());
    let trace_id = input_trace_id.or(parsed.detected_trace_id);
    let events = &parsed.events;

    // Timeline
    let timeline: Vec<TimelineEntry> = events
        .iter()
        .enumerate()
        .map(|(i, e)| {
            let entity_id = js_string(coalesce(e, &["entity_id", "id"]))
                .unwrap_or_else(|| format!("event_{i}"));
            let entity_type = match e.get("type") {
                Some(t) if !t.is_null() => js_value_str(t),
                _ => detect_entity_type(&entity_id).to_string(),
            };
            let timestamp = e
                .get("timestamp")
                .filter(|v| is_truthy(v))
                .map(js_value_str);
            let trace_id_e = e.get("trace_id").filter(|v| is_truthy(v)).map(js_value_str);
            let detail = build_detail(e, &entity_type);
            TimelineEntry {
                step: i + 1,
                entity_type,
                entity_id,
                timestamp,
                detail,
                trace_id: trace_id_e,
            }
        })
        .collect();

    let mut issues: Vec<String> = Vec::new();
    let mut checks: Vec<InvariantCheck> = Vec::new();

    // INV-TRACE-001: all events share the same trace_id
    let trace_ids: Vec<String> = events
        .iter()
        .filter_map(|e| e.get("trace_id").filter(|v| is_truthy(v)).map(js_value_str))
        .collect();
    let mut unique: Vec<String> = Vec::new();
    for t in &trace_ids {
        if !unique.contains(t) {
            unique.push(t.clone());
        }
    }
    if trace_ids.is_empty() {
        checks.push(InvariantCheck {
            id: "INV-TRACE-001".into(),
            name: "Trace ID propagation".into(),
            status: "UNKNOWN".into(),
            reason: "No trace_id fields found in trace data — cannot verify propagation".into(),
        });
    } else if unique.len() > 1 {
        issues.push(format!(
            "INV-TRACE-001 FAIL: multiple trace_ids found: {}",
            unique.join(", ")
        ));
        checks.push(InvariantCheck {
            id: "INV-TRACE-001".into(),
            name: "Trace ID propagation".into(),
            status: "FAIL".into(),
            reason: format!("Multiple trace_ids detected: {}", unique.join(", ")),
        });
    } else {
        checks.push(InvariantCheck {
            id: "INV-TRACE-001".into(),
            name: "Trace ID propagation".into(),
            status: "PASS".into(),
            reason: format!("All entities share trace_id: {}", unique[0]),
        });
    }

    // INV-LEDGER-001: transfers have matching debit + credit
    let idish = |e: &Value| js_string(coalesce(e, &["entity_id", "id"])).unwrap_or_default();
    let type_is = |e: &Value, t: &str| e.get("type").and_then(|v| v.as_str()) == Some(t);
    let transfers: Vec<&Value> = events
        .iter()
        .filter(|e| type_is(e, "transfer") || idish(e).starts_with("txf_"))
        .collect();
    let ledger_entries: Vec<&Value> = events
        .iter()
        .filter(|e| type_is(e, "ledger_entry") || idish(e).starts_with("led_"))
        .collect();
    if !transfers.is_empty() && !ledger_entries.is_empty() {
        let type_upper = |e: &Value| {
            e.get("type")
                .map(js_value_str)
                .unwrap_or_default()
                .to_uppercase()
        };
        let debits = ledger_entries
            .iter()
            .filter(|e| type_upper(e) == "DEBIT")
            .count();
        let credits = ledger_entries
            .iter()
            .filter(|e| type_upper(e) == "CREDIT")
            .count();
        if debits == transfers.len() && credits == transfers.len() {
            checks.push(InvariantCheck {
                id: "INV-LEDGER-001".into(),
                name: "Double-entry completeness".into(),
                status: "PASS".into(),
                reason: format!(
                    "{} transfer(s) → {debits} DEBIT + {credits} CREDIT",
                    transfers.len()
                ),
            });
        } else {
            checks.push(InvariantCheck {
                id: "INV-LEDGER-001".into(),
                name: "Double-entry completeness".into(),
                status: "UNKNOWN".into(),
                reason: format!(
                    "Cannot fully verify — {debits} DEBITs, {credits} CREDITs for {} transfer(s)",
                    transfers.len()
                ),
            });
        }
    } else {
        checks.push(InvariantCheck {
            id: "INV-LEDGER-001".into(),
            name: "Double-entry completeness".into(),
            status: "UNKNOWN".into(),
            reason: "Insufficient ledger entry data in trace to verify double-entry".into(),
        });
    }

    // INV-STL-001: net + fee == gross
    for tx in &transfers {
        let gross = num_field(tx, &["gross_minor", "grossMinor"]);
        let net = num_field(tx, &["net_minor", "netMinor"]);
        let fee = num_field(tx, &["fee_minor", "feeMinor"]);
        if let (Some(gross), Some(net), Some(fee)) = (gross, net, fee) {
            let tx_id =
                js_string(coalesce(tx, &["entity_id", "id"])).unwrap_or_else(|| "unknown".into());
            if net + fee == gross {
                checks.push(InvariantCheck {
                    id: "INV-STL-001".into(),
                    name: "No money creation".into(),
                    status: "PASS".into(),
                    reason: format!(
                        "{tx_id}: net({}) + fee({}) = {} ✓",
                        fnum(net),
                        fnum(fee),
                        fnum(gross)
                    ),
                });
            } else {
                let diff = net + fee - gross;
                let sign = if diff > 0.0 { "+" } else { "" };
                issues.push(format!(
                    "INV-STL-001 FAIL on {tx_id}: {} + {} = {} ≠ {} ({sign}{} minor units)",
                    fnum(net),
                    fnum(fee),
                    fnum(net + fee),
                    fnum(gross),
                    fnum(diff)
                ));
                checks.push(InvariantCheck {
                    id: "INV-STL-001".into(),
                    name: "No money creation".into(),
                    status: "FAIL".into(),
                    reason: format!(
                        "{tx_id}: net({}) + fee({}) = {} ≠ gross({})",
                        fnum(net),
                        fnum(fee),
                        fnum(net + fee),
                        fnum(gross)
                    ),
                });
            }
        }
    }

    let causal_summary = build_causal_summary(&parsed.flow_type, events.len(), &trace_id, &issues);

    TraceExplainResult {
        trace_id,
        flow_type: parsed.flow_type,
        event_count: events.len(),
        timeline,
        invariant_checks: checks,
        causal_summary,
        issues,
    }
}

/// JS `${n}` for an f64 that holds an integer minor-unit value: no trailing `.0`.
fn fnum(f: f64) -> String {
    if f.fract() == 0.0 && f.is_finite() {
        format!("{}", f as i64)
    } else {
        format!("{f}")
    }
}

/// JSON-string entry point (used by the WASM export and native tests).
pub fn explain_trace_json(input_json: &str, reference_operator_url: Option<&str>) -> String {
    let input: Value = serde_json::from_str(input_json).unwrap_or(Value::Object(Map::new()));
    let result = explain_trace(&input, reference_operator_url);
    serde_json::to_string(&result).unwrap_or_else(|_| json!({}).to_string())
}

// ── WASM export ───────────────────────────────────────────────────────────────
// Built with `wasm-pack build --target web --features wasm --out-name banzai_trace --release` and
// vendored to website/lib/wasm/banzai_trace*. Only `trace_explain_json` is exported (the sole export
// the monorepo consumes). Signature is identical to the former banzai-core WASM so traceVerifier.ts
// is a drop-in swap. Native builds (`cargo test`) skip this and exercise `explain_trace{,_json}`.
#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn trace_explain_json(input_json: &str, reference_operator_url: Option<String>) -> String {
    explain_trace_json(input_json, reference_operator_url.as_deref())
}
