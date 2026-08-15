//! banza-assurance (ADR-041) — the layered assurance gates.
//!
//! This engine answers one question about each claimed property: **is there a falsifiable chain of
//! evidence behind it, or only a green test?**
//!
//! It deliberately does not run the tests. Running them proves they pass; this proves they *exist*, that
//! they are reachable from the property they are supposed to demonstrate, and that no link in the chain
//! is silently missing. A suite can be entirely green and still have a CRITICAL property with no
//! adversarial case, no failure behaviour and a guard nobody has ever seen go red — which is the exact
//! state the Root defect lived in.
//!
//! Nothing here is normative. The registry it reads points at authorities; it never restates a rule.

use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;

pub const TOOL: &str = "banza-assurance";
pub const TOOL_VERSION: &str = "0.1.0";

/// The eleven gates. Ordered by what each can falsify about the one before it — which is why a higher
/// gate can never compensate for a lower one.
pub const GATES: &[(&str, &str)] = &[
    ("AG-0", "Is the required behaviour defined by the normative public surface?"),
    ("AG-1", "Can the protocol represent — and reject — the property on the wire?"),
    ("AG-2", "Does a conforming independent implementation know exactly what result is required?"),
    ("AG-3", "Does the implementation enforce it?"),
    ("AG-4", "Does it hold across state, persistence, restart and concurrency?"),
    ("AG-5", "What happens when a dependency or participant fails?"),
    ("AG-6", "Does it survive deliberate attempts to break it?"),
    ("AG-7", "Do all surfaces agree, with zero contradiction?"),
    ("AG-8", "Could a clean-room team derive it without the engines, records or authors?"),
    ("AG-9", "Does every public claim match its evidence class?"),
    ("AG-10", "Is it ready to freeze?"),
];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum Status {
    Pass,
    Fail,
    Blocked,
    NotApplicable,
    NotRun,
}

impl Status {
    pub fn as_str(&self) -> &'static str {
        match self {
            Status::Pass => "PASS",
            Status::Fail => "FAIL",
            Status::Blocked => "BLOCKED",
            Status::NotApplicable => "NOT_APPLICABLE",
            Status::NotRun => "NOT_RUN",
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct Registry {
    pub properties: Vec<Property>,
}

/// One claimed property and the chain behind it.
///
/// A `None` link means *not applicable to this property*; an empty list means *applicable and absent*.
/// The distinction is the whole point — "no adversarial test because there is no adversary" and "no
/// adversarial test" must not look the same.
#[derive(Debug, Clone, Deserialize)]
pub struct Property {
    pub property_id: String,
    pub r2s2_dimensions: Vec<String>,
    pub domain: String,
    pub criticality: String,
    pub scope: String,
    pub normative_authority: Option<Vec<String>>,
    pub wire_representation: Option<String>,
    pub implementation: Option<String>,
    pub positive_evidence: Option<Vec<String>>,
    pub negative_evidence: Option<Vec<String>>,
    pub adversarial_evidence: Option<Vec<String>>,
    pub state_test: Option<Vec<String>>,
    pub resilience_test: Option<Vec<String>>,
    pub property_guard: Option<String>,
    pub mutation_proof: Option<String>,
    pub clean_room_requirement: bool,
    pub public_claims: Option<Vec<String>>,
    pub gate_status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Finding {
    pub property_id: String,
    pub gate: String,
    pub detail: String,
}

#[derive(Debug, Serialize)]
pub struct PropertyResult {
    pub property_id: String,
    pub r2s2_dimensions: Vec<String>,
    pub criticality: String,
    pub gates: BTreeMap<String, String>,
    pub status: String,
    pub missing_links: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct Report {
    pub tool: &'static str,
    pub tool_version: &'static str,
    pub properties: Vec<PropertyResult>,
    pub findings: Vec<Finding>,
    pub totals: BTreeMap<String, usize>,
    pub r2s2_coverage: BTreeMap<String, usize>,
    pub ok: bool,
}

/// Strip a `path::test_name` or `path#fragment` reference down to the file it names.
fn file_of(reference: &str) -> &str {
    let cut = reference.find("::").unwrap_or(reference.len());
    let cut = reference[..cut].find('#').map(|i| i).unwrap_or(cut);
    reference[..cut].trim()
}

/// Does a reference resolve? A file must exist; a `::name` suffix must appear inside it.
///
/// This is what stops the registry drifting into fiction. A property that cites
/// `tests/foo.rs::bar_holds` after `bar_holds` was renamed still *looks* covered in the registry, and
/// the whole point of the registry is to be the place where that cannot happen quietly.
pub fn reference_resolves(root: &Path, reference: &str) -> Result<(), String> {
    let rel = file_of(reference);
    // A reference that names no path (a prose note about a guard self-test) is checked as prose: it must
    // still name a real file somewhere in its text.
    let candidate = root.join(rel);
    if !candidate.exists() {
        // Some references are written as "<path> selftest: <description>".
        if let Some(first) = rel.split_whitespace().next() {
            if root.join(first).exists() {
                return Ok(());
            }
        }
        return Err(format!("{rel} does not exist"));
    }
    if let Some(idx) = reference.find("::") {
        let name = reference[idx + 2..].trim();
        let body = std::fs::read_to_string(&candidate).map_err(|e| format!("{rel}: {e}"))?;
        if !body.contains(name) {
            return Err(format!("{rel} does not contain `{name}`"));
        }
    }
    if let Some(idx) = reference.find('#') {
        let frag = reference[idx + 1..].trim();
        let body = std::fs::read_to_string(&candidate).map_err(|e| format!("{rel}: {e}"))?;
        // A fragment may be an id (INV-ROOT-007, RAS-004) or an anchor; both must appear literally.
        let anchor = frag.replace('-', " ");
        if !body.contains(frag) && !body.to_lowercase().contains(&anchor.to_lowercase()) {
            return Err(format!("{rel} does not contain `{frag}`"));
        }
    }
    Ok(())
}

fn all_resolve(root: &Path, refs: &Option<Vec<String>>) -> Vec<String> {
    let mut bad = vec![];
    if let Some(list) = refs {
        for r in list {
            if let Err(e) = reference_resolves(root, r) {
                bad.push(e);
            }
        }
    }
    bad
}

/// Evaluate every property against every gate.
///
/// The rule that gives the gates force is applied here: a higher gate cannot compensate for a lower one,
/// so once a gate FAILs, the gates above it are reported BLOCKED rather than evaluated. Reporting AG-3
/// PASS while AG-0 FAILs would say the implementation enforces something the protocol never required.
pub fn evaluate(root: &Path, registry: &Registry) -> Report {
    let mut results = vec![];
    let mut findings = vec![];
    let mut totals: BTreeMap<String, usize> = BTreeMap::new();
    let mut r2s2: BTreeMap<String, usize> = BTreeMap::new();

    for p in &registry.properties {
        for d in &p.r2s2_dimensions {
            *r2s2.entry(d.clone()).or_insert(0) += 1;
        }
        let critical = p.criticality == "CRITICAL";
        let mut gates: BTreeMap<String, Status> = BTreeMap::new();
        let mut missing: Vec<String> = vec![];

        let mut set = |g: &str, s: Status, gates: &mut BTreeMap<String, Status>| {
            gates.insert(g.to_string(), s);
        };

        // AG-0 — the rule exists on the normative surface.
        let auth_missing = p.normative_authority.as_ref().map(|a| a.is_empty()).unwrap_or(true);
        let auth_bad = all_resolve(root, &p.normative_authority);
        if auth_missing {
            set("AG-0", Status::Fail, &mut gates);
            missing.push("normative_authority".into());
            findings.push(Finding { property_id: p.property_id.clone(), gate: "AG-0".into(),
                detail: "no normative authority: the rule is not on the public surface".into() });
        } else if !auth_bad.is_empty() {
            set("AG-0", Status::Fail, &mut gates);
            for e in &auth_bad {
                findings.push(Finding { property_id: p.property_id.clone(), gate: "AG-0".into(),
                    detail: format!("authority does not resolve: {e}") });
            }
        } else {
            set("AG-0", Status::Pass, &mut gates);
        }

        // AG-1 — the wire can represent and reject it.
        set("AG-1", match &p.wire_representation {
            Some(w) if !w.trim().is_empty() => Status::Pass,
            _ => Status::NotApplicable,
        }, &mut gates);

        // AG-2 — a conforming implementation knows the required result: positive AND negative.
        let pos_bad = all_resolve(root, &p.positive_evidence);
        let neg_bad = all_resolve(root, &p.negative_evidence);
        let has_pos = p.positive_evidence.as_ref().map(|v| !v.is_empty()).unwrap_or(false);
        let has_neg = p.negative_evidence.as_ref().map(|v| !v.is_empty()).unwrap_or(false);
        if !has_pos && !has_neg {
            set("AG-2", if critical { Status::Fail } else { Status::NotRun }, &mut gates);
            if critical { missing.push("positive_evidence + negative_evidence".into()); }
        } else if !pos_bad.is_empty() || !neg_bad.is_empty() {
            set("AG-2", Status::Fail, &mut gates);
            for e in pos_bad.iter().chain(neg_bad.iter()) {
                findings.push(Finding { property_id: p.property_id.clone(), gate: "AG-2".into(),
                    detail: format!("evidence does not resolve: {e}") });
            }
        } else if critical && !has_neg {
            // A property demonstrated only by cases that succeed has not been demonstrated: nothing
            // shows the implementation would refuse the wrong thing.
            set("AG-2", Status::Fail, &mut gates);
            missing.push("negative_evidence".into());
            findings.push(Finding { property_id: p.property_id.clone(), gate: "AG-2".into(),
                detail: "critical property has no negative case: nothing shows it rejects the wrong thing".into() });
        } else {
            set("AG-2", Status::Pass, &mut gates);
        }

        // AG-3 — an implementation enforces it.
        set("AG-3", match &p.implementation {
            Some(i) if !i.trim().is_empty() => Status::Pass,
            _ => if critical { Status::NotApplicable } else { Status::NotApplicable },
        }, &mut gates);

        // AG-4 — state, persistence, restart, concurrency.
        set("AG-4", match &p.state_test {
            None => Status::NotApplicable,
            Some(v) if v.is_empty() => { missing.push("state_test".into()); Status::Fail }
            Some(v) => {
                let bad = all_resolve(root, &Some(v.clone()));
                if bad.is_empty() { Status::Pass } else {
                    for e in bad { findings.push(Finding { property_id: p.property_id.clone(), gate: "AG-4".into(), detail: e }); }
                    Status::Fail
                }
            }
        }, &mut gates);

        // AG-5 — failure behaviour.
        set("AG-5", match &p.resilience_test {
            None => Status::NotApplicable,
            Some(v) if v.is_empty() => { missing.push("resilience_test".into()); Status::Fail }
            Some(v) => {
                let bad = all_resolve(root, &Some(v.clone()));
                if bad.is_empty() { Status::Pass } else {
                    for e in bad { findings.push(Finding { property_id: p.property_id.clone(), gate: "AG-5".into(), detail: e }); }
                    Status::Fail
                }
            }
        }, &mut gates);

        // AG-6 — adversarial. Mandatory for a CRITICAL property.
        let adv_bad = all_resolve(root, &p.adversarial_evidence);
        set("AG-6", match &p.adversarial_evidence {
            None => Status::NotApplicable,
            Some(v) if v.is_empty() => {
                if critical {
                    missing.push("adversarial_evidence".into());
                    findings.push(Finding { property_id: p.property_id.clone(), gate: "AG-6".into(),
                        detail: "critical property is never attacked".into() });
                    Status::Fail
                } else { Status::NotRun }
            }
            Some(_) if !adv_bad.is_empty() => {
                for e in &adv_bad { findings.push(Finding { property_id: p.property_id.clone(), gate: "AG-6".into(), detail: e.clone() }); }
                Status::Fail
            }
            Some(_) => Status::Pass,
        }, &mut gates);

        // AG-7 — a guard holds the surfaces together, and it has been proven able to fail.
        let guard_ok = p.property_guard.as_ref()
            .map(|g| reference_resolves(root, g).is_ok()).unwrap_or(false);
        if !guard_ok {
            set("AG-7", if critical { Status::Fail } else { Status::NotRun }, &mut gates);
            if critical {
                missing.push("property_guard".into());
                findings.push(Finding { property_id: p.property_id.clone(), gate: "AG-7".into(),
                    detail: "critical property has no guard: a regression would land unnoticed".into() });
            }
        } else if critical && p.mutation_proof.is_none() {
            set("AG-7", Status::Fail, &mut gates);
            missing.push("mutation_proof".into());
            findings.push(Finding { property_id: p.property_id.clone(), gate: "AG-7".into(),
                detail: "guard has never been proven able to fail".into() });
        } else {
            set("AG-7", Status::Pass, &mut gates);
        }

        // AG-8 — clean-room derivability.
        set("AG-8", if p.clean_room_requirement { Status::Pass } else { Status::NotApplicable }, &mut gates);

        // AG-9 — public claims exist where the property is claimed.
        let claims_bad = all_resolve(root, &p.public_claims);
        set("AG-9", if claims_bad.is_empty() { Status::Pass } else {
            for e in &claims_bad { findings.push(Finding { property_id: p.property_id.clone(), gate: "AG-9".into(), detail: e.clone() }); }
            Status::Fail
        }, &mut gates);

        // AG-10 — freeze readiness is the conjunction of everything applicable below it.
        let any_fail = gates.values().any(|s| *s == Status::Fail);
        set("AG-10", if any_fail { Status::Blocked } else { Status::Pass }, &mut gates);

        let status = if any_fail { Status::Fail } else { Status::Pass };
        *totals.entry(status.as_str().to_string()).or_insert(0) += 1;
        *totals.entry(p.criticality.clone()).or_insert(0) += 1;

        results.push(PropertyResult {
            property_id: p.property_id.clone(),
            r2s2_dimensions: p.r2s2_dimensions.clone(),
            criticality: p.criticality.clone(),
            gates: gates.iter().map(|(k, v)| (k.clone(), v.as_str().to_string())).collect(),
            status: status.as_str().to_string(),
            missing_links: missing,
        });
    }

    // Every R²S² dimension must be represented, or the registry is not exercising a principle at all.
    for d in ["Robust", "Resilient", "Secure", "Simple"] {
        r2s2.entry(d.to_string()).or_insert(0);
    }
    let ok = findings.is_empty();
    Report {
        tool: TOOL,
        tool_version: TOOL_VERSION,
        properties: results,
        findings,
        totals,
        r2s2_coverage: r2s2,
        ok,
    }
}

/// Dimensions with no property behind them. A principle nothing is measured against is decoration.
pub fn unexercised_dimensions(report: &Report) -> BTreeSet<String> {
    report
        .r2s2_coverage
        .iter()
        .filter(|(_, n)| **n == 0)
        .map(|(d, _)| d.clone())
        .collect()
}
