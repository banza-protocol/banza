//! Anti-rollback for versioned trust material.
//!
//! **This module implements `spec/trust-freshness.md`; it does not define it.** Conformance is proven
//! against `conformance/vectors/trust-freshness.json`, derived from the specification.
//!
//! What this provides, and only this: a verifier that has accepted a version of a trust object will not
//! later accept an older one for the same object. It does **not** detect first-observation staleness,
//! global equivocation, suppression of an unseen update, or unavailability — see the specification's
//! §1, which is normative text rather than a caveat.

use std::collections::HashMap;

/// The monotonic key: one sequence per logical object per authority (`spec/trust-freshness.md` §2).
///
/// Artifacts of the same type from different authorities are independent and are never compared.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct MonotonicKey {
    pub artifact_type: String,
    pub authority_identity: String,
}

impl MonotonicKey {
    pub fn new(artifact_type: &str, authority_identity: &str) -> Self {
        Self {
            artifact_type: artifact_type.into(),
            authority_identity: authority_identity.into(),
        }
    }
}

/// The outcome of offering an artifact to the high-water mark (§3).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RollbackVerdict {
    /// No mark existed. Recorded — and, per §1, rollback is undetectable on first contact.
    FirstObservation,
    /// Strictly newer than the mark; the mark advances.
    Advanced,
    /// Equal to the mark. Re-fetching the current artifact is normal, not an attack.
    Unchanged,
    /// Older than the mark. Fail-closed with `trust_version_rollback`; the mark is untouched.
    Rollback,
}

impl RollbackVerdict {
    /// Whether the artifact may be used in an evaluation.
    pub fn accepted(self) -> bool {
        !matches!(self, RollbackVerdict::Rollback)
    }
    /// The published reason code for a refusal, if any.
    pub fn reason_code(self) -> Option<&'static str> {
        match self {
            RollbackVerdict::Rollback => Some("trust_version_rollback"),
            _ => None,
        }
    }
}

/// The high-water marks a verifier maintains.
///
/// `spec/trust-freshness.md` §4 requires the marks to survive process restart. This type holds them;
/// persisting them is the embedding implementation's responsibility, which is why [`Self::export`] and
/// [`Self::restore`] exist and why no storage technology appears here.
#[derive(Debug, Default, Clone)]
pub struct HighWaterMarks {
    marks: HashMap<MonotonicKey, String>,
}

impl HighWaterMarks {
    pub fn new() -> Self {
        Self::default()
    }

    /// The mark currently held for a key, if any.
    pub fn mark(&self, key: &MonotonicKey) -> Option<&str> {
        self.marks.get(key).map(|s| s.as_str())
    }

    /// Offer an **already accepted** artifact's ordering value to the mark (§3).
    ///
    /// "Already accepted" means: obtained from a valid origin, cryptographically verified, within its
    /// validity window, and passing every other applicable check. This function is the last gate, not
    /// the first — it must not be used to admit material that failed an earlier one.
    ///
    /// Ordering values are compared as the strings the artifacts carry. The members named in §2 are
    /// RFC 3339 instants in UTC, whose lexical order is their chronological order, so no parsing is
    /// needed and no clock is consulted: the comparison is between two values that are inside their
    /// respective signed bytes.
    pub fn offer(&mut self, key: &MonotonicKey, ordering_value: &str) -> RollbackVerdict {
        match self.marks.get(key) {
            None => {
                self.marks.insert(key.clone(), ordering_value.to_string());
                RollbackVerdict::FirstObservation
            }
            Some(current) => match ordering_value.cmp(current.as_str()) {
                std::cmp::Ordering::Greater => {
                    self.marks.insert(key.clone(), ordering_value.to_string());
                    RollbackVerdict::Advanced
                }
                std::cmp::Ordering::Equal => RollbackVerdict::Unchanged,
                // §3(4): a rejection never moves the mark, so serving old artifacts cannot lower it.
                std::cmp::Ordering::Less => RollbackVerdict::Rollback,
            },
        }
    }

    /// Serialise the marks for durable storage (§4). Deterministic: sorted, one record per line.
    pub fn export(&self) -> Vec<(String, String, String)> {
        let mut out: Vec<(String, String, String)> = self
            .marks
            .iter()
            .map(|(k, v)| {
                (
                    k.artifact_type.clone(),
                    k.authority_identity.clone(),
                    v.clone(),
                )
            })
            .collect();
        out.sort();
        out
    }

    /// Restore marks persisted by [`Self::export`] (§4).
    ///
    /// Restoring keeps the **higher** of the stored and current values, so restoring can never move a
    /// mark backwards — a restore from stale storage must not undo the defence.
    pub fn restore(&mut self, records: &[(String, String, String)]) {
        for (t, a, v) in records {
            let k = MonotonicKey::new(t, a);
            let keep = match self.marks.get(&k) {
                Some(cur) if cur.as_str() >= v.as_str() => cur.clone(),
                _ => v.clone(),
            };
            self.marks.insert(k, keep);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn brl() -> MonotonicKey {
        MonotonicKey::new("brl", "BANZA")
    }

    #[test]
    fn first_observation_records_without_detecting_staleness() {
        let mut m = HighWaterMarks::new();
        // §1: an old-but-valid artifact is undetectable on first contact. This is the honest behaviour.
        assert_eq!(
            m.offer(&brl(), "2020-01-01T00:00:00Z"),
            RollbackVerdict::FirstObservation
        );
        assert_eq!(m.mark(&brl()), Some("2020-01-01T00:00:00Z"));
    }

    #[test]
    fn equal_is_accepted_and_forward_advances() {
        let mut m = HighWaterMarks::new();
        m.offer(&brl(), "2026-08-01T00:00:00Z");
        assert_eq!(
            m.offer(&brl(), "2026-08-01T00:00:00Z"),
            RollbackVerdict::Unchanged
        );
        assert_eq!(
            m.offer(&brl(), "2026-08-02T00:00:00Z"),
            RollbackVerdict::Advanced
        );
        assert_eq!(m.mark(&brl()), Some("2026-08-02T00:00:00Z"));
    }

    #[test]
    fn rollback_is_refused_and_never_moves_the_mark() {
        let mut m = HighWaterMarks::new();
        m.offer(&brl(), "2026-08-02T00:00:00Z");
        let v = m.offer(&brl(), "2026-08-01T00:00:00Z");
        assert_eq!(v, RollbackVerdict::Rollback);
        assert!(!v.accepted());
        assert_eq!(v.reason_code(), Some("trust_version_rollback"));
        // The mark must be untouched: serving old artifacts cannot lower it.
        assert_eq!(m.mark(&brl()), Some("2026-08-02T00:00:00Z"));
        // Repeating the attack changes nothing.
        assert_eq!(
            m.offer(&brl(), "2019-01-01T00:00:00Z"),
            RollbackVerdict::Rollback
        );
        assert_eq!(m.mark(&brl()), Some("2026-08-02T00:00:00Z"));
    }

    #[test]
    fn independent_authorities_do_not_interfere() {
        let mut m = HighWaterMarks::new();
        let a = MonotonicKey::new("key_manifest", "root-a");
        let b = MonotonicKey::new("key_manifest", "root-b");
        m.offer(&a, "2026-08-05T00:00:00Z");
        // A lower value for a DIFFERENT authority is a first observation, not a rollback.
        assert_eq!(
            m.offer(&b, "2026-01-01T00:00:00Z"),
            RollbackVerdict::FirstObservation
        );
        assert_eq!(m.mark(&a), Some("2026-08-05T00:00:00Z"));
    }

    #[test]
    fn the_mark_survives_restart() {
        // §4: a memory-only mark is defeated by restarting the verifier.
        let mut before = HighWaterMarks::new();
        before.offer(&brl(), "2026-08-02T00:00:00Z");
        let persisted = before.export();

        let mut after = HighWaterMarks::new(); // a fresh process
        after.restore(&persisted);
        assert_eq!(
            after.offer(&brl(), "2026-08-01T00:00:00Z"),
            RollbackVerdict::Rollback
        );
    }

    #[test]
    fn restoring_stale_storage_cannot_move_a_mark_backwards() {
        let mut m = HighWaterMarks::new();
        m.offer(&brl(), "2026-08-09T00:00:00Z");
        m.restore(&[("brl".into(), "BANZA".into(), "2026-08-01T00:00:00Z".into())]);
        assert_eq!(m.mark(&brl()), Some("2026-08-09T00:00:00Z"));
    }

    #[test]
    fn concurrent_acceptance_keeps_the_maximum() {
        // §5: after concurrent acceptance of v1 and v2 the mark must be max(v1, v2), in either
        // interleaving. Modelled by applying both orders and requiring the same result.
        for (a, b) in [
            ("2026-08-06T00:00:00Z", "2026-08-07T00:00:00Z"),
            ("2026-08-07T00:00:00Z", "2026-08-06T00:00:00Z"),
        ] {
            let mut m = HighWaterMarks::new();
            m.offer(&brl(), a);
            m.offer(&brl(), b);
            assert_eq!(m.mark(&brl()), Some("2026-08-07T00:00:00Z"));
        }
    }

    #[test]
    fn export_is_deterministic() {
        let mut m = HighWaterMarks::new();
        m.offer(&MonotonicKey::new("brl", "BANZA"), "2026-08-02T00:00:00Z");
        m.offer(
            &MonotonicKey::new("key_manifest", "root-a"),
            "2026-08-01T00:00:00Z",
        );
        assert_eq!(m.export(), m.export());
        assert_eq!(m.export()[0].0, "brl");
    }
}
