//! Increment 5 (§13) — the deterministic diagnosis classifier for the `diagnose_failure` family.
//!
//! Given the REAL step receipts + reason codes of a persisted execution (read by the receipt store, never
//! by a model), it separates the four labelled parts of a diagnosis and — crucially — asserts CAUSALITY
//! only when a receipt supports it (a failed step that carries a reason code). A failed step with no reason
//! code is an OBSERVED cause with an explicit HYPOTHESIS about the unrecorded reason, never a fabricated
//! cause. Suggestions are recommendations, clearly labelled, never presented as protocol state.
//!
//! Pure + total + deterministic: no model, no I/O. The JS layer feeds it the execution's own data and
//! renders the labelled lines into the answer + claim map (OBSERVED/CONSEQUENCE → SUPPORTED, HYPOTHESIS/
//! SUGGESTION → HYPOTHETICAL and labelled).

use serde::{Deserialize, Serialize};

/// One step receipt view the classifier reasons over (the fields the receipt store already exposes).
#[derive(Debug, Clone, Deserialize, Default, PartialEq)]
pub struct StepView {
    #[serde(default)]
    pub step_id: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub reason_codes: Vec<String>,
}

/// The execution view fed to the classifier (from `receipts.readExecution`).
#[derive(Debug, Clone, Deserialize, Default, PartialEq)]
pub struct DiagnosisInput {
    #[serde(default)]
    pub execution_id: String,
    #[serde(default)]
    pub overall_status: String,
    #[serde(default)]
    pub steps: Vec<StepView>,
}

/// The four diagnosis part labels (§13). Each line carries exactly one.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum DiagnosisLabel {
    /// A directly observed cause (a failed/blocked step); receipt-backed.
    ObservedCause,
    /// A downstream consequence (the overall verdict), stated causally only when a cause is observed.
    Consequence,
    /// An explicit hypothesis about an UNRECORDED reason; never asserted as fact.
    Hypothesis,
    /// A recommended next action; a suggestion, never protocol state.
    Suggestion,
}

impl DiagnosisLabel {
    pub fn as_str(&self) -> &'static str {
        match self {
            DiagnosisLabel::ObservedCause => "OBSERVED_CAUSE",
            DiagnosisLabel::Consequence => "CONSEQUENCE",
            DiagnosisLabel::Hypothesis => "HYPOTHESIS",
            DiagnosisLabel::Suggestion => "SUGGESTION",
        }
    }
    /// Whether a line with this label is receipt-backed (a factual claim) or a marked inference.
    pub fn is_supported(&self) -> bool {
        matches!(
            self,
            DiagnosisLabel::ObservedCause | DiagnosisLabel::Consequence
        )
    }
}

/// One labelled diagnosis line.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct DiagnosisLine {
    pub label: String,
    pub text: String,
    /// Receipt-backed (true for OBSERVED_CAUSE/CONSEQUENCE) or a marked inference (false).
    pub supported: bool,
    /// The step this line concerns ("" when none / whole-execution).
    pub step_id: String,
    /// The reason code this line concerns ("" when none).
    pub reason_code: String,
}

/// The full diagnosis report.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct DiagnosisReport {
    pub execution_id: String,
    pub overall_status: String,
    /// Whether the execution actually presents a failure/block to diagnose.
    pub has_failure: bool,
    pub lines: Vec<DiagnosisLine>,
}

/// A status token that denotes a technical failure/block (never a NOT_APPLICABLE or a success).
fn is_failure_status(s: &str) -> bool {
    let u = s.to_ascii_uppercase();
    matches!(
        u.as_str(),
        "FAILED" | "BLOCKED" | "ERROR" | "NOT_VERIFIED" | "REJECTED" | "INTERRUPTED"
    )
}

/// Deterministically classify an execution's receipts into labelled diagnosis lines. Causality is asserted
/// ONLY where a receipt supports it. Pure + total; no model.
pub fn classify_diagnosis(input: &DiagnosisInput) -> DiagnosisReport {
    let overall_failed = is_failure_status(&input.overall_status);
    let mut lines: Vec<DiagnosisLine> = Vec::new();

    // 1) OBSERVED_CAUSE — every failed/blocked step. Receipt-backed. Reason code named when present.
    let mut observed = 0usize;
    let mut hypotheses: Vec<DiagnosisLine> = Vec::new();
    let mut suggestions: Vec<DiagnosisLine> = Vec::new();
    for st in &input.steps {
        if !is_failure_status(&st.status) {
            continue;
        }
        observed += 1;
        let code = st.reason_codes.first().cloned().unwrap_or_default();
        if code.is_empty() {
            // Observed, but with NO recorded reason — state the observation, then an explicit hypothesis.
            lines.push(DiagnosisLine {
                label: DiagnosisLabel::ObservedCause.as_str().to_string(),
                text: format!(
                    "A etapa **{}** terminou com estado **{}** (sem código de razão registado no recibo).",
                    st.step_id, st.status
                ),
                supported: true,
                step_id: st.step_id.clone(),
                reason_code: String::new(),
            });
            hypotheses.push(DiagnosisLine {
                label: DiagnosisLabel::Hypothesis.as_str().to_string(),
                text: format!(
                    "Hipótese: a etapa **{}** pode ter falhado por uma condição não registada; sem um código \
de razão no recibo não é possível confirmar a causa.",
                    st.step_id
                ),
                supported: false,
                step_id: st.step_id.clone(),
                reason_code: String::new(),
            });
            suggestions.push(DiagnosisLine {
                label: DiagnosisLabel::Suggestion.as_str().to_string(),
                text: format!(
                    "Sugestão: reexecutar a etapa **{}** com o recibo detalhado para capturar um código de razão.",
                    st.step_id
                ),
                supported: false,
                step_id: st.step_id.clone(),
                reason_code: String::new(),
            });
        } else {
            // Observed with a reason code — causality is receipt-supported.
            lines.push(DiagnosisLine {
                label: DiagnosisLabel::ObservedCause.as_str().to_string(),
                text: format!(
                    "A etapa **{}** terminou com estado **{}** com o código de razão **{}**.",
                    st.step_id, st.status, code
                ),
                supported: true,
                step_id: st.step_id.clone(),
                reason_code: code.clone(),
            });
            suggestions.push(DiagnosisLine {
                label: DiagnosisLabel::Suggestion.as_str().to_string(),
                text: format!(
                    "Sugestão: rever a etapa **{}** e o código **{}** no recibo da execução para corrigir a origem.",
                    st.step_id, code
                ),
                supported: false,
                step_id: st.step_id.clone(),
                reason_code: code,
            });
        }
    }

    // 2) CONSEQUENCE — the overall verdict. Causal wording only when ≥1 cause was observed.
    if overall_failed {
        let text = if observed > 0 {
            format!(
                "Consequência: a execução terminou com estado **{}** em consequência da(s) {} etapa(s) \
falhada(s) acima.",
                input.overall_status, observed
            )
        } else {
            format!(
                "Consequência: a execução terminou com estado **{}**; nenhuma etapa individual foi registada \
como falhada, por isso não atribuo a causa a uma etapa específica.",
                input.overall_status
            )
        };
        lines.push(DiagnosisLine {
            label: DiagnosisLabel::Consequence.as_str().to_string(),
            text,
            supported: true,
            step_id: String::new(),
            reason_code: String::new(),
        });
    } else {
        // No failure to diagnose — state the observed end-state honestly.
        lines.push(DiagnosisLine {
            label: DiagnosisLabel::ObservedCause.as_str().to_string(),
            text: format!(
                "A execução terminou com estado **{}**; não há etapas falhadas ou bloqueadas para \
diagnosticar.",
                if input.overall_status.is_empty() {
                    "n/d".to_string()
                } else {
                    input.overall_status.clone()
                }
            ),
            supported: true,
            step_id: String::new(),
            reason_code: String::new(),
        });
    }

    // 3) HYPOTHESES then SUGGESTIONS, in stable order after the observed/consequence lines.
    lines.extend(hypotheses);
    lines.extend(suggestions);

    DiagnosisReport {
        execution_id: input.execution_id.clone(),
        overall_status: input.overall_status.clone(),
        has_failure: overall_failed || observed > 0,
        lines,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input(overall: &str, steps: &[(&str, &str, &[&str])]) -> DiagnosisInput {
        DiagnosisInput {
            execution_id: "exec-1".into(),
            overall_status: overall.into(),
            steps: steps
                .iter()
                .map(|(id, status, codes)| StepView {
                    step_id: (*id).into(),
                    status: (*status).into(),
                    reason_codes: codes.iter().map(|c| c.to_string()).collect(),
                })
                .collect(),
        }
    }

    #[test]
    fn a_failed_step_with_a_code_is_an_observed_cause_with_supported_causality() {
        let r = classify_diagnosis(&input(
            "FAILED",
            &[
                ("manifest", "VERIFIED", &[]),
                ("keys", "FAILED", &["KEY_SIGNATURE_INVALID"]),
            ],
        ));
        assert!(r.has_failure);
        let cause = r
            .lines
            .iter()
            .find(|l| l.label == "OBSERVED_CAUSE" && l.step_id == "keys")
            .expect("keys is an observed cause");
        assert!(cause.supported, "a receipt-backed cause is supported");
        assert_eq!(cause.reason_code, "KEY_SIGNATURE_INVALID");
        // the consequence is causal because a cause was observed.
        let cons = r.lines.iter().find(|l| l.label == "CONSEQUENCE").unwrap();
        assert!(cons.text.contains("em consequência"));
        assert!(cons.supported);
        // a VERIFIED step never becomes a cause.
        assert!(!r.lines.iter().any(|l| l.step_id == "manifest"));
    }

    #[test]
    fn a_failed_step_without_a_code_gets_a_hypothesis_not_a_fabricated_cause() {
        let r = classify_diagnosis(&input("FAILED", &[("trust", "FAILED", &[])]));
        // observed cause states it is unrecorded.
        let cause = r
            .lines
            .iter()
            .find(|l| l.label == "OBSERVED_CAUSE")
            .unwrap();
        assert!(cause.text.contains("sem código de razão"));
        assert!(cause.supported);
        // a hypothesis (never supported) is present and clearly marked.
        let hyp = r.lines.iter().find(|l| l.label == "HYPOTHESIS").unwrap();
        assert!(!hyp.supported);
        assert!(hyp.text.to_lowercase().contains("hipótese"));
    }

    #[test]
    fn a_successful_execution_has_nothing_to_diagnose() {
        let r = classify_diagnosis(&input("READY", &[("manifest", "VERIFIED", &[])]));
        assert!(!r.has_failure);
        assert!(r.lines.iter().all(|l| l.label != "CONSEQUENCE"));
        assert!(r
            .lines
            .iter()
            .any(|l| l.text.contains("não há etapas falhadas")));
    }

    #[test]
    fn suggestions_and_hypotheses_are_never_supported() {
        let r = classify_diagnosis(&input(
            "FAILED",
            &[
                ("keys", "FAILED", &["KEY_REVOKED"]),
                ("trust", "BLOCKED", &[]),
            ],
        ));
        for l in &r.lines {
            if l.label == "SUGGESTION" || l.label == "HYPOTHESIS" {
                assert!(!l.supported, "{} must not be supported", l.label);
            }
            if l.label == "OBSERVED_CAUSE" || l.label == "CONSEQUENCE" {
                assert!(l.supported, "{} must be supported", l.label);
            }
        }
    }

    #[test]
    fn deterministic() {
        let i = input("FAILED", &[("keys", "FAILED", &["KEY_REVOKED"])]);
        let a = serde_json::to_string(&classify_diagnosis(&i)).unwrap();
        let b = serde_json::to_string(&classify_diagnosis(&i)).unwrap();
        assert_eq!(a, b);
    }
}
