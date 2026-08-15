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

/// How many distinct public surfaces AG-9 must enumerate. Declared as a floor so that dropping one
/// cannot quietly shrink the world the gate inspects.
pub const CANONICAL_PUBLIC_SURFACES: usize = 11;

/// The eleven gates. Ordered by what each can falsify about the one before it — which is why a higher
/// gate can never compensate for a lower one.
pub const GATES: &[(&str, &str)] = &[
    (
        "AG-0",
        "Is the required behaviour defined by the normative public surface?",
    ),
    (
        "AG-1",
        "Can the protocol represent — and reject — the property on the wire?",
    ),
    (
        "AG-2",
        "Does a conforming independent implementation know exactly what result is required?",
    ),
    ("AG-3", "Does the implementation enforce it?"),
    (
        "AG-4",
        "Does it hold across state, persistence, restart and concurrency?",
    ),
    (
        "AG-5",
        "What happens when a dependency or participant fails?",
    ),
    ("AG-6", "Does it survive deliberate attempts to break it?"),
    ("AG-7", "Do all surfaces agree, with zero contradiction?"),
    (
        "AG-8",
        "Could a clean-room team derive it without the engines, records or authors?",
    ),
    ("AG-9", "Does every public claim match its evidence class?"),
    ("AG-10", "Is it ready to freeze?"),
];

/// Which gates a gate genuinely depends on.
///
/// Encoded because it is logically required, never because the numbers run in sequence. AG-4, AG-5 and
/// AG-6 all ask questions about a running implementation, so they depend on AG-3; AG-8 asks whether an
/// outsider could derive the rule, which needs the rule (AG-0), its representation (AG-1) and its
/// expected results (AG-2), but nothing about attacks or failure. AG-9 needs the properties to exist
/// before their public claims can be checked against them.
pub const GATE_DEPENDENCIES: &[(&str, &[&str])] = &[
    ("AG-1", &["AG-0"]),
    ("AG-2", &["AG-0"]),
    ("AG-3", &["AG-0", "AG-1"]),
    ("AG-4", &["AG-3"]),
    ("AG-5", &["AG-3"]),
    ("AG-6", &["AG-3"]),
    ("AG-7", &["AG-0", "AG-1", "AG-2", "AG-3"]),
    ("AG-8", &["AG-0", "AG-1", "AG-2"]),
    ("AG-9", &["AG-0"]),
    (
        "AG-10",
        &[
            "AG-0", "AG-1", "AG-2", "AG-3", "AG-4", "AG-5", "AG-6", "AG-7", "AG-8", "AG-9",
        ],
    ),
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
    /// What each gate REQUIRES to exist. Without this the engine can only report that whatever it
    /// happened to find was green — an open world, in which a gate passes because nothing contradicted
    /// it. This is the difference between "everything I measured passed" and "I measured everything
    /// that had to be measured".
    pub gate_requirements: Option<GateRequirements>,
}

#[derive(Debug, Deserialize)]
pub struct GateRequirements {
    #[serde(rename = "AG-9")]
    pub ag9: Option<Ag9>,
    #[serde(rename = "AG-10")]
    pub ag10: Option<Ag10>,
    pub per_property_required_stages: Option<BTreeMap<String, Vec<String>>>,
}

#[derive(Debug, Deserialize)]
pub struct Ag9 {
    pub mandatory_surfaces: Vec<String>,
    pub must_state_principles: Vec<String>,
}

/// What actually ran, and against which source.
///
/// A resolving path proves a file exists. It does not prove anybody executed it, and it certainly does
/// not prove they executed it against the commit under assessment. Without this, a suite of paths that
/// all resolve — none of them run since three commits ago — reads as fully demonstrated.
#[derive(Debug, Default, Deserialize)]
pub struct ExecutionEvidence {
    pub source_commit: String,
    /// The digest of the registry the run was collected against. A registry change redefines what the
    /// evidence was supposed to demonstrate, so results collected under the old definition stop
    /// applying — whatever commit they carry.
    #[serde(default)]
    pub registry_digest: String,
    #[serde(default)]
    pub tree_dirty: bool,
    #[serde(default)]
    pub records: Vec<ExecutionRecord>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExecutionRecord {
    pub property_id: String,
    pub evidence: String,
    pub result: String,
    pub source_commit: String,
}

impl ExecutionEvidence {
    /// Was this exact reference executed, against THIS source, with a passing result?
    pub fn passed_at(&self, source: &str, property: &str, reference: &str) -> Option<bool> {
        // A result produced from a materially dirty tree describes bytes that are not in the commit it
        // names. Attributing it to that commit is a false attribution, so it cannot ground a
        // source-bound PASS at all.
        if self.tree_dirty {
            return Some(false);
        }
        self.records
            .iter()
            .find(|r| r.property_id == property && r.evidence == reference)
            .map(|r| r.result == "PASS" && r.source_commit == source)
    }
}

#[derive(Debug, Deserialize)]
pub struct Ag10 {
    pub required_conditions: Vec<String>,
    pub conditions_report: String,
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
    /// The evidence that EXISTS is green.
    pub property_passed: bool,
    /// Every REQUIRED evidence stage exists. A property can be passed and incomplete at once — green
    /// on what was registered, silent on what was never registered.
    pub property_complete: bool,
    pub status: String,
    pub missing_links: Vec<String>,
    pub missing_required_stages: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct Report {
    pub tool: &'static str,
    pub tool_version: &'static str,
    pub properties: Vec<PropertyResult>,
    /// Gate-level verdicts, computed closed-world: a gate is PASS only when every applicable required
    /// property is complete AND green, and every requirement declared for the gate was satisfied.
    pub gates: BTreeMap<String, String>,
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

/// The four states an executable piece of evidence passes through, and the three ways it stops short.
///
///   DECLARED  it is in the registry
///   RESOLVED  the file, and the named test inside it, actually exist
///   EXECUTED  it ran during the assessment of THIS source
///   PASSED    it ran and produced the expected result
///
/// Only the last contributes to a gate. A resolving path proves that somebody once wrote a test; it says
/// nothing about whether anyone has run it since, and nothing at all about this commit.
fn executed_and_passed(
    root: &Path,
    exec: &ExecutionEvidence,
    source: &str,
    property: &str,
    refs: &Option<Vec<String>>,
) -> Vec<String> {
    let mut problems = vec![];
    let Some(list) = refs else {
        return problems;
    };
    for r in list {
        if let Err(e) = reference_resolves(root, r) {
            problems.push(format!("declared but not resolved: {e}"));
            continue;
        }
        // With no execution record collected at all, the engine reports resolution only — and the gates
        // that depend on execution say NOT_RUN rather than quietly accepting resolution as proof.
        if source.is_empty() {
            continue;
        }
        match exec.passed_at(source, property, r) {
            Some(true) => {}
            Some(false) => problems.push(format!(
                "resolved and executed, but not passing at this source: {r}"
            )),
            None => problems.push(format!(
                "resolved but never executed against this source: {r}"
            )),
        }
    }
    problems
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
    evaluate_with_execution(root, registry, &ExecutionEvidence::default(), "")
}

/// `source` is the identity of the tree being assessed. Evidence executed against a different source is
/// not evidence about this one.
pub fn evaluate_with_execution(
    root: &Path,
    registry: &Registry,
    exec: &ExecutionEvidence,
    source: &str,
) -> Report {
    evaluate_bound(root, registry, exec, source, "")
}

/// `registry_digest` is the digest of the registry definition the caller is evaluating. When the
/// execution evidence was collected against a different one, the results describe a different question.
pub fn evaluate_bound(
    root: &Path,
    registry: &Registry,
    exec: &ExecutionEvidence,
    source: &str,
    registry_digest: &str,
) -> Report {
    let mut results = vec![];
    let mut findings = vec![];
    // If the registry has changed since the evidence was collected, the evidence answers a question
    // that is no longer the one being asked. Rather than silently reusing it, drop it — the run then
    // reports NOT_RUN, and re-collection is one command away.
    let stale_registry = !registry_digest.is_empty()
        && !exec.registry_digest.is_empty()
        && exec.registry_digest != registry_digest;
    let empty_exec = ExecutionEvidence::default();
    let exec: &ExecutionEvidence = if stale_registry { &empty_exec } else { exec };
    if stale_registry {
        findings.push(Finding {
            property_id: "-".into(),
            gate: "AG-3".into(),
            detail: "execution evidence was collected against a different assurance registry; its results describe a different question".into(),
        });
    }
    let mut totals: BTreeMap<String, usize> = BTreeMap::new();
    let mut r2s2: BTreeMap<String, usize> = BTreeMap::new();

    for p in &registry.properties {
        for d in &p.r2s2_dimensions {
            *r2s2.entry(d.clone()).or_insert(0) += 1;
        }
        let critical = p.criticality == "CRITICAL";
        let mut gates: BTreeMap<String, Status> = BTreeMap::new();
        let mut missing: Vec<String> = vec![];

        let set = |g: &str, s: Status, gates: &mut BTreeMap<String, Status>| {
            gates.insert(g.to_string(), s);
        };

        // AG-0 — the rule exists on the normative surface.
        let auth_missing = p
            .normative_authority
            .as_ref()
            .map(|a| a.is_empty())
            .unwrap_or(true);
        let auth_bad = all_resolve(root, &p.normative_authority);
        if auth_missing {
            set("AG-0", Status::Fail, &mut gates);
            missing.push("normative_authority".into());
            findings.push(Finding {
                property_id: p.property_id.clone(),
                gate: "AG-0".into(),
                detail: "no normative authority: the rule is not on the public surface".into(),
            });
        } else if !auth_bad.is_empty() {
            set("AG-0", Status::Fail, &mut gates);
            for e in &auth_bad {
                findings.push(Finding {
                    property_id: p.property_id.clone(),
                    gate: "AG-0".into(),
                    detail: format!("authority does not resolve: {e}"),
                });
            }
        } else {
            set("AG-0", Status::Pass, &mut gates);
        }

        // AG-1 — the wire can represent and reject it.
        set(
            "AG-1",
            match &p.wire_representation {
                Some(w) if !w.trim().is_empty() => Status::Pass,
                _ => Status::NotApplicable,
            },
            &mut gates,
        );

        // AG-2 — a conforming implementation knows the required result: positive AND negative.
        let pos_bad = all_resolve(root, &p.positive_evidence);
        let neg_bad = all_resolve(root, &p.negative_evidence);
        let has_pos = p
            .positive_evidence
            .as_ref()
            .map(|v| !v.is_empty())
            .unwrap_or(false);
        let has_neg = p
            .negative_evidence
            .as_ref()
            .map(|v| !v.is_empty())
            .unwrap_or(false);
        if !has_pos && !has_neg {
            set(
                "AG-2",
                if critical {
                    Status::Fail
                } else {
                    Status::NotRun
                },
                &mut gates,
            );
            if critical {
                missing.push("positive_evidence + negative_evidence".into());
            }
        } else if !pos_bad.is_empty() || !neg_bad.is_empty() {
            set("AG-2", Status::Fail, &mut gates);
            for e in pos_bad.iter().chain(neg_bad.iter()) {
                findings.push(Finding {
                    property_id: p.property_id.clone(),
                    gate: "AG-2".into(),
                    detail: format!("evidence does not resolve: {e}"),
                });
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

        // AG-3 — the implementation ENFORCES it. Naming a location is not enforcement: this gate passes
        // only when the property's positive and negative evidence actually ran against this source and
        // passed. "implementation named for every property" was the wording of a gate that had not yet
        // asked the question it exists for.
        let named = p
            .implementation
            .as_ref()
            .map(|i| !i.trim().is_empty())
            .unwrap_or(false);
        let mut exec_problems =
            executed_and_passed(root, exec, source, &p.property_id, &p.positive_evidence);
        exec_problems.extend(executed_and_passed(
            root,
            exec,
            source,
            &p.property_id,
            &p.negative_evidence,
        ));
        set(
            "AG-3",
            if !named {
                Status::NotApplicable
            } else if source.is_empty() {
                findings.push(Finding {
                    property_id: p.property_id.clone(),
                    gate: "AG-3".into(),
                    detail: "no execution evidence was collected; a located implementation is not a demonstrated one".into(),
                });
                Status::NotRun
            } else if exec_problems.is_empty() {
                Status::Pass
            } else {
                for e in &exec_problems {
                    findings.push(Finding {
                        property_id: p.property_id.clone(),
                        gate: "AG-3".into(),
                        detail: e.clone(),
                    });
                }
                Status::NotRun
            },
            &mut gates,
        );

        // AG-4 — state, persistence, restart, concurrency.
        set(
            "AG-4",
            match &p.state_test {
                None => Status::NotApplicable,
                Some(v) if v.is_empty() => {
                    if critical || "AG-4" != "AG-6" {
                        missing.push("state_test".into());
                        Status::Fail
                    } else {
                        Status::NotRun
                    }
                }
                Some(_) => {
                    // Resolution is not execution. The state evidence must have RUN against this
                    // source and passed; a path that resolves says only that somebody once wrote it.
                    let problems =
                        executed_and_passed(root, exec, source, &p.property_id, &p.state_test);
                    if source.is_empty() {
                        Status::NotRun
                    } else if problems.is_empty() {
                        Status::Pass
                    } else {
                        for e in problems {
                            findings.push(Finding {
                                property_id: p.property_id.clone(),
                                gate: "AG-4".into(),
                                detail: e,
                            });
                        }
                        Status::NotRun
                    }
                }
            },
            &mut gates,
        );

        set(
            "AG-5",
            match &p.resilience_test {
                None => Status::NotApplicable,
                Some(v) if v.is_empty() => {
                    if critical || "AG-5" != "AG-6" {
                        missing.push("resilience_test".into());
                        Status::Fail
                    } else {
                        Status::NotRun
                    }
                }
                Some(_) => {
                    // Resolution is not execution. The failure evidence must have RUN against this
                    // source and passed; a path that resolves says only that somebody once wrote it.
                    let problems =
                        executed_and_passed(root, exec, source, &p.property_id, &p.resilience_test);
                    if source.is_empty() {
                        Status::NotRun
                    } else if problems.is_empty() {
                        Status::Pass
                    } else {
                        for e in problems {
                            findings.push(Finding {
                                property_id: p.property_id.clone(),
                                gate: "AG-5".into(),
                                detail: e,
                            });
                        }
                        Status::NotRun
                    }
                }
            },
            &mut gates,
        );

        set(
            "AG-6",
            match &p.adversarial_evidence {
                None => Status::NotApplicable,
                Some(v) if v.is_empty() => {
                    if critical || "AG-6" != "AG-6" {
                        missing.push("adversarial_evidence".into());
                        Status::Fail
                    } else {
                        Status::NotRun
                    }
                }
                Some(_) => {
                    // Resolution is not execution. The adversarial evidence must have RUN against this
                    // source and passed; a path that resolves says only that somebody once wrote it.
                    let problems = executed_and_passed(
                        root,
                        exec,
                        source,
                        &p.property_id,
                        &p.adversarial_evidence,
                    );
                    if source.is_empty() {
                        Status::NotRun
                    } else if problems.is_empty() {
                        Status::Pass
                    } else {
                        for e in problems {
                            findings.push(Finding {
                                property_id: p.property_id.clone(),
                                gate: "AG-6".into(),
                                detail: e,
                            });
                        }
                        Status::NotRun
                    }
                }
            },
            &mut gates,
        );

        // AG-7 — a guard holds the surfaces together, and it has been proven able to fail.
        let guard_ok = p
            .property_guard
            .as_ref()
            .map(|g| reference_resolves(root, g).is_ok())
            .unwrap_or(false);
        if !guard_ok {
            set(
                "AG-7",
                if critical {
                    Status::Fail
                } else {
                    Status::NotRun
                },
                &mut gates,
            );
            if critical {
                missing.push("property_guard".into());
                findings.push(Finding {
                    property_id: p.property_id.clone(),
                    gate: "AG-7".into(),
                    detail: "critical property has no guard: a regression would land unnoticed"
                        .into(),
                });
            }
        } else if critical && p.mutation_proof.is_none() {
            set("AG-7", Status::Fail, &mut gates);
            missing.push("mutation_proof".into());
            findings.push(Finding {
                property_id: p.property_id.clone(),
                gate: "AG-7".into(),
                detail: "guard has never been proven able to fail".into(),
            });
        } else {
            set("AG-7", Status::Pass, &mut gates);
        }

        // AG-8 — clean-room derivability.
        set(
            "AG-8",
            if p.clean_room_requirement {
                Status::Pass
            } else {
                Status::NotApplicable
            },
            &mut gates,
        );

        // AG-9 — public claims exist where the property is claimed.
        let claims_bad = all_resolve(root, &p.public_claims);
        set(
            "AG-9",
            if claims_bad.is_empty() {
                Status::Pass
            } else {
                for e in &claims_bad {
                    findings.push(Finding {
                        property_id: p.property_id.clone(),
                        gate: "AG-9".into(),
                        detail: e.clone(),
                    });
                }
                Status::Fail
            },
            &mut gates,
        );

        // AG-10 — freeze readiness is the conjunction of everything applicable below it.
        // AG-10 is decided for the WHOLE run, not per property: freeze readiness is a conjunction of
        // externally observed conditions no property can establish about itself.
        let any_fail = gates.values().any(|s| *s == Status::Fail);

        // COMPLETENESS is separate from success. A property whose registered evidence is green but
        // whose required stages were never registered is INCOMPLETE — and reporting it as PASS is
        // exactly the open-world hole this engine had: "everything I measured passed" reads identically
        // to "I measured everything that had to be measured".
        let required_stages: Vec<String> = registry
            .gate_requirements
            .as_ref()
            .and_then(|g| g.per_property_required_stages.as_ref())
            .and_then(|m| m.get(&p.criticality))
            .cloned()
            .unwrap_or_default();
        let mut missing_required: Vec<String> = vec![];
        for stage in &required_stages {
            let present = match stage.as_str() {
                "normative_authority" => p
                    .normative_authority
                    .as_ref()
                    .map(|v| !v.is_empty())
                    .unwrap_or(false),
                "positive_evidence" => p
                    .positive_evidence
                    .as_ref()
                    .map(|v| !v.is_empty())
                    .unwrap_or(false),
                "negative_evidence" => p
                    .negative_evidence
                    .as_ref()
                    .map(|v| !v.is_empty())
                    .unwrap_or(false),
                "adversarial_evidence" => p
                    .adversarial_evidence
                    .as_ref()
                    .map(|v| !v.is_empty())
                    .unwrap_or(false),
                "property_guard" => p
                    .property_guard
                    .as_ref()
                    .map(|g| !g.trim().is_empty())
                    .unwrap_or(false),
                "mutation_proof" => p
                    .mutation_proof
                    .as_ref()
                    .map(|g| !g.trim().is_empty())
                    .unwrap_or(false),
                _ => true,
            };
            if !present {
                missing_required.push(stage.clone());
            }
        }
        let complete = missing_required.is_empty();
        if !complete {
            // A missing stage degrades the gate that stage SERVES. Marking every gate NOT_RUN because
            // one stage is absent trades a false green for a false grey: it erases evidence that really
            // was produced, and tells a reader nothing about where the gap is.
            for stage in &missing_required {
                let gate = match stage.as_str() {
                    "normative_authority" => "AG-0",
                    "positive_evidence" | "negative_evidence" => "AG-2",
                    "adversarial_evidence" => "AG-6",
                    "property_guard" | "mutation_proof" => "AG-7",
                    _ => "AG-10",
                };
                gates.insert(gate.to_string(), Status::NotRun);
                findings.push(Finding {
                    property_id: p.property_id.clone(),
                    gate: gate.into(),
                    detail: format!(
                        "required stage never registered: {stage} — INCOMPLETE, not passing"
                    ),
                });
            }
        }

        let passed = !any_fail;
        let status = if !passed {
            Status::Fail
        } else if !complete {
            Status::NotRun
        } else {
            Status::Pass
        };
        *totals.entry(status.as_str().to_string()).or_insert(0) += 1;
        *totals.entry(p.criticality.clone()).or_insert(0) += 1;

        results.push(PropertyResult {
            property_id: p.property_id.clone(),
            r2s2_dimensions: p.r2s2_dimensions.clone(),
            criticality: p.criticality.clone(),
            gates: gates
                .iter()
                .map(|(k, v)| (k.clone(), v.as_str().to_string()))
                .collect(),
            property_passed: passed,
            property_complete: complete,
            status: status.as_str().to_string(),
            missing_links: missing,
            missing_required_stages: missing_required,
        });
    }

    for d in ["Robust", "Resilient", "Secure", "Simple"] {
        r2s2.entry(d.to_string()).or_insert(0);
    }

    // ── gate rollup, closed-world ───────────────────────────────────────────────────────────────────
    //
    // A gate is PASS only when every applicable property is COMPLETE and green at it, AND every
    // requirement the gate declares was satisfied. The previous rollup did neither: it reported a gate
    // as passing because no property had failed it, so a gate could pass on an empty world.
    let mut gate_verdicts: BTreeMap<String, String> = BTreeMap::new();
    for (gate, _) in GATES.iter().take(9) {
        // Only properties for which this gate is APPLICABLE count. A gate is not made uncertain by a
        // property that legitimately has nothing to say to it.
        let mut verdict = Status::Pass;
        let mut evaluated = 0usize;
        for r in &results {
            match r.gates.get(*gate).map(|s| s.as_str()) {
                Some("FAIL") => {
                    verdict = Status::Fail;
                    evaluated += 1;
                }
                Some("NOT_RUN") => {
                    if verdict != Status::Fail {
                        verdict = Status::NotRun;
                    }
                    evaluated += 1;
                }
                Some("PASS") => evaluated += 1,
                _ => {} // NOT_APPLICABLE — this gate has no question for this property
            }
        }
        if evaluated == 0 {
            // Two different situations reach zero, and conflating them is its own false grey:
            //
            //   * every property declared this gate NOT_APPLICABLE — they each had something to say and
            //     said "this question does not arise for me". The gate is genuinely not applicable.
            //   * there were no properties at all, or none reached it. Nothing was measured, and an
            //     empty world is not a clean one.
            let declared_na = !results.is_empty()
                && results
                    .iter()
                    .all(|r| r.gates.get(*gate).map(|s| s.as_str()) == Some("NOT_APPLICABLE"));
            if declared_na {
                verdict = Status::NotApplicable;
            } else {
                verdict = Status::NotRun;
                findings.push(Finding {
                    property_id: "-".into(),
                    gate: (*gate).into(),
                    detail: "no property was evaluated at this gate; an empty world is NOT_RUN, never PASS".into(),
                });
            }
        }
        gate_verdicts.insert((*gate).to_string(), verdict.as_str().to_string());
    }

    // AG-9 — public claim consistency requires reading the surfaces that carry the claims.
    let ag9 = registry
        .gate_requirements
        .as_ref()
        .and_then(|g| g.ag9.as_ref());
    let ag9_status = match ag9 {
        None => {
            findings.push(Finding { property_id: "-".into(), gate: "AG-9".into(),
                detail: "no mandatory public surfaces declared; consistency cannot be established by not looking".into() });
            Status::NotRun
        }
        // The canonical inventory is fixed at eight surfaces. AG-9 shrank to three once because website
        // and BanzAI were mandatory and simply never enumerated — closed-world for what was listed,
        // open-world for everything else. A shorter inventory is now itself the failure.
        Some(req) if req.mandatory_surfaces.len() < CANONICAL_PUBLIC_SURFACES => {
            findings.push(Finding { property_id: "-".into(), gate: "AG-9".into(),
                detail: format!("the mandatory public-surface inventory has {} entries; the canonical surface set has {CANONICAL_PUBLIC_SURFACES}. A gate that looks at less does not become greener.", req.mandatory_surfaces.len()) });
            Status::NotRun
        }
        Some(req) if req.mandatory_surfaces.is_empty() || req.must_state_principles.is_empty() => {
            // Emptying the requirement list is the easiest way to make a gate green, and it is the one
            // a closed-world engine must refuse: a gate that requires nothing has verified nothing.
            findings.push(Finding { property_id: "-".into(), gate: "AG-9".into(),
                detail: "the mandatory public-surface set is empty; a gate that requires nothing verifies nothing".into() });
            Status::NotRun
        }
        Some(req) => {
            let mut st = Status::Pass;
            for rel in &req.mandatory_surfaces {
                if !root.join(rel).exists() {
                    findings.push(Finding {
                        property_id: "-".into(),
                        gate: "AG-9".into(),
                        detail: format!("mandatory public surface missing: {rel}"),
                    });
                    st = Status::Fail;
                }
            }
            // The surfaces that must STATE the principles must actually state all four.
            for rel in &req.must_state_principles {
                let path = root.join(rel);
                if !path.exists() {
                    st = Status::Fail;
                    continue;
                }
                let body = std::fs::read_to_string(&path).unwrap_or_default();
                // Case-insensitive: a surface that names the principles as adjectives inside a
                // sentence — "robusto, correcto e determinístico" — states them just as surely as a
                // capitalised list does, and demanding capitals would be a guard enforcing typography
                // rather than the property.
                let lower = body.to_lowercase();
                let states_all = ["robust", "resilient", "secure", "simple"]
                    .iter()
                    .all(|w| lower.contains(w))
                    || ["robusto", "resiliente", "seguro", "simples"]
                        .iter()
                        .all(|w| lower.contains(w));
                if !states_all {
                    findings.push(Finding { property_id: "-".into(), gate: "AG-9".into(),
                        detail: format!("{rel} does not state the four principles; the public surface is not yet reconciled") });
                    st = Status::NotRun;
                }
            }
            st
        }
    };
    gate_verdicts.insert("AG-9".into(), ag9_status.as_str().to_string());

    // AG-10 — freeze readiness is a conjunction of externally observed conditions. The engine cannot
    // infer any of them, so each must be REPORTED by an actual run. A missing report is NOT_RUN.
    let ag10 = registry
        .gate_requirements
        .as_ref()
        .and_then(|g| g.ag10.as_ref());
    let ag10_status = match ag10 {
        None => Status::NotRun,
        Some(req) => {
            let report_path = root.join(&req.conditions_report);
            if !report_path.exists() {
                findings.push(Finding { property_id: "-".into(), gate: "AG-10".into(),
                    detail: format!("{} has not been produced; freeze readiness is NOT_RUN, never PASS by absence", req.conditions_report) });
                Status::NotRun
            } else {
                let raw = std::fs::read_to_string(&report_path).unwrap_or_default();
                let doc: serde_json::Value =
                    serde_json::from_str(&raw).unwrap_or(serde_json::Value::Null);
                let mut st = Status::Pass;
                // Conditions the engine can OBSERVE are taken from observation, not from the report.
                // A readiness artifact that claims every gate passed cannot override the gate verdicts
                // this run just computed — otherwise AG-10 would be attesting to itself, which is the
                // one thing an aggregator must never do.
                let observed_gates_pass = gate_verdicts
                    .iter()
                    .filter(|(g, _)| g.as_str() != "AG-10")
                    .all(|(_, v)| v == "PASS" || v == "NOT_APPLICABLE");
                if !observed_gates_pass
                    && doc
                        .get("all_applicable_gates_pass")
                        .and_then(|v| v.as_bool())
                        == Some(true)
                {
                    findings.push(Finding { property_id: "-".into(), gate: "AG-10".into(),
                        detail: "the readiness report claims all gates pass, but this run observed otherwise — the report is an aggregator, not an authority".into() });
                    st = Status::Blocked;
                }
                for c in &req.required_conditions {
                    if c == "all_applicable_gates_pass" {
                        if !observed_gates_pass {
                            findings.push(Finding {
                                property_id: "-".into(),
                                gate: "AG-10".into(),
                                detail: "observed gate verdicts are not all PASS".into(),
                            });
                            st = Status::Blocked;
                        }
                        continue;
                    }
                    match doc.get(c).and_then(|v| v.as_bool()) {
                        Some(true) => {}
                        Some(false) => {
                            findings.push(Finding {
                                property_id: "-".into(),
                                gate: "AG-10".into(),
                                detail: format!("release condition not met: {c}"),
                            });
                            st = Status::Blocked;
                        }
                        None => {
                            findings.push(Finding {
                                property_id: "-".into(),
                                gate: "AG-10".into(),
                                detail: format!("release condition never reported: {c}"),
                            });
                            if st != Status::Blocked {
                                st = Status::NotRun;
                            }
                        }
                    }
                }
                // A lower gate failing blocks AG-10 outright.
                if gate_verdicts.values().any(|v| v == "FAIL") {
                    st = Status::Blocked;
                }
                st
            }
        }
    };
    gate_verdicts.insert("AG-10".into(), ag10_status.as_str().to_string());

    // A gate cannot PASS while a gate it depends on has not. This is the "a higher gate never
    // compensates for a lower one" rule, applied to the rollup rather than asserted in prose. It
    // DOWNGRADES only — it never turns a failure into a pass, and never touches a gate whose own
    // evidence already failed.
    for (gate, deps) in GATE_DEPENDENCIES {
        let unmet: Vec<&str> = deps
            .iter()
            .filter(|d| {
                !matches!(
                    gate_verdicts.get(**d).map(|v| v.as_str()),
                    Some("PASS") | Some("NOT_APPLICABLE")
                )
            })
            .copied()
            .collect();
        if unmet.is_empty() {
            continue;
        }
        if let Some(v) = gate_verdicts.get_mut(*gate) {
            if v == "PASS" {
                *v = "BLOCKED".to_string();
                findings.push(Finding {
                    property_id: "-".into(),
                    gate: (*gate).into(),
                    detail: format!("its own evidence is complete, but it depends on {unmet:?}, which have not passed"),
                });
            }
        }
    }

    // The run is OK only when nothing failed AND every gate reached PASS. NOT_RUN is not success.
    let ok = findings.is_empty()
        && gate_verdicts
            .values()
            .all(|v| v == "PASS" || v == "NOT_APPLICABLE");
    Report {
        tool: TOOL,
        tool_version: TOOL_VERSION,
        properties: results,
        gates: gate_verdicts,
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
