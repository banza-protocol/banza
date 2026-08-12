//! Anti-rollback for versioned trust material.
//!
//! **This module implements `spec/trust-freshness.md`; it does not define it.** Conformance is proven
//! against `conformance/vectors/trust-freshness.json`, derived from the specification.
//!
//! What this provides, and only this: a verifier that has accepted a version of a trust object will not
//! later accept an older one for the same object, and will not accept two different artifacts claiming
//! the same position in one authority's sequence. It does **not** detect first-observation staleness,
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
    /// Equal marker, equal content digest: the same artifact seen again (§3.1). Re-fetching the
    /// current artifact is normal traffic, not an attack.
    Unchanged,
    /// Equal marker, different content digest (§3.1). Two distinct artifacts claim one position in
    /// the same authority's sequence. Fail-closed; the recorded state is untouched.
    Equivocation,
    /// Older than the mark. Fail-closed with `trust_version_rollback`; the mark is untouched.
    Rollback,
}

impl RollbackVerdict {
    /// Whether the artifact may be used in an evaluation.
    pub fn accepted(self) -> bool {
        !matches!(
            self,
            RollbackVerdict::Rollback | RollbackVerdict::Equivocation
        )
    }
    /// The published reason code for a refusal, if any.
    pub fn reason_code(self) -> Option<&'static str> {
        match self {
            RollbackVerdict::Rollback => Some("trust_version_rollback"),
            RollbackVerdict::Equivocation => Some("trust_version_equivocation"),
            _ => None,
        }
    }
}

/// What a verifier holds for one monotonic key: the highest accepted ordering value, and the content
/// digest of the artifact accepted at it (§3.1).
#[derive(Debug, Clone, PartialEq, Eq)]
struct Observed {
    ordering_value: String,
    content_digest: String,
}

/// One persisted record: `(artifact_type, authority_identity, ordering_value, content_digest)`.
pub type MarkRecord = (String, String, String, String);

/// The high-water marks a verifier maintains.
///
/// `spec/trust-freshness.md` §4 requires the marks — and the digests recorded with them — to survive
/// process restart. This type holds them; persisting them is the embedding implementation's
/// responsibility, which is why [`Self::export`] and [`Self::restore`] exist and why no storage
/// technology appears here.
#[derive(Debug, Default, Clone)]
pub struct HighWaterMarks {
    marks: HashMap<MonotonicKey, Observed>,
}

impl HighWaterMarks {
    pub fn new() -> Self {
        Self::default()
    }

    /// The ordering value currently held for a key, if any.
    pub fn mark(&self, key: &MonotonicKey) -> Option<&str> {
        self.marks.get(key).map(|o| o.ordering_value.as_str())
    }

    /// The content digest recorded with the current mark, if any (§3.1).
    pub fn digest(&self, key: &MonotonicKey) -> Option<&str> {
        self.marks.get(key).map(|o| o.content_digest.as_str())
    }

    /// Offer an **already accepted** artifact to the mark (§3, §3.1).
    ///
    /// "Already accepted" means: obtained from a valid origin, cryptographically verified, within its
    /// validity window, and passing every other applicable check. This function is the last gate, not
    /// the first — it must not be used to admit material that failed an earlier one.
    ///
    /// Ordering values are compared as the strings the artifacts carry. The members named in §2 are
    /// RFC 3339 instants in UTC, whose lexical order is their chronological order, so no parsing is
    /// needed and no clock is consulted: the comparison is between two values that are inside their
    /// respective signed bytes.
    ///
    /// `content_digest` is the artifact's canonical digest per `spec/canonicalization.md` §5, taken
    /// with the signature member removed. It is **required**, not optional: those instants carry
    /// whole-second granularity, so an equal marker alone cannot tell "the same artifact again" from
    /// "a different artifact at the same instant", and an API that let a caller omit the digest would
    /// leave exactly the gap §3.1 closes.
    pub fn offer(
        &mut self,
        key: &MonotonicKey,
        ordering_value: &str,
        content_digest: &str,
    ) -> RollbackVerdict {
        let incoming = Observed {
            ordering_value: ordering_value.to_string(),
            content_digest: content_digest.to_string(),
        };
        match self.marks.get(key) {
            None => {
                self.marks.insert(key.clone(), incoming);
                RollbackVerdict::FirstObservation
            }
            Some(current) => match ordering_value.cmp(current.ordering_value.as_str()) {
                std::cmp::Ordering::Greater => {
                    self.marks.insert(key.clone(), incoming);
                    RollbackVerdict::Advanced
                }
                // §3.1: at an equal marker the content decides, and neither outcome changes state.
                std::cmp::Ordering::Equal => {
                    if content_digest == current.content_digest {
                        RollbackVerdict::Unchanged
                    } else {
                        RollbackVerdict::Equivocation
                    }
                }
                // §3(4): a rejection never moves the mark, so serving old artifacts cannot lower it.
                std::cmp::Ordering::Less => RollbackVerdict::Rollback,
            },
        }
    }

    /// Serialise the marks for durable storage (§4). Deterministic: sorted, one record per key.
    pub fn export(&self) -> Vec<MarkRecord> {
        let mut out: Vec<MarkRecord> = self
            .marks
            .iter()
            .map(|(k, o)| {
                (
                    k.artifact_type.clone(),
                    k.authority_identity.clone(),
                    o.ordering_value.clone(),
                    o.content_digest.clone(),
                )
            })
            .collect();
        out.sort();
        out
    }

    /// Restore marks persisted by [`Self::export`] (§4).
    ///
    /// Restoring keeps the **higher** ordering value with the digest recorded alongside it, so a
    /// restore from stale storage can never move a mark backwards or replace the digest held at the
    /// current mark. Restoring is not an acceptance decision: a stored record that disagrees at an
    /// equal marker is ignored here and caught by [`Self::offer`] when such an artifact is next
    /// presented.
    pub fn restore(&mut self, records: &[MarkRecord]) {
        for (t, a, v, d) in records {
            let k = MonotonicKey::new(t, a);
            let incoming = Observed {
                ordering_value: v.clone(),
                content_digest: d.clone(),
            };
            let keep = match self.marks.get(&k) {
                Some(cur) if cur.ordering_value.as_str() >= v.as_str() => cur.clone(),
                _ => incoming,
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

    // Two distinct artifacts. Digests stand in for canonical digests; only equality matters here.
    const D1: &str = "sha256-aaaa";
    const D2: &str = "sha256-bbbb";

    #[test]
    fn first_observation_records_without_detecting_staleness() {
        let mut m = HighWaterMarks::new();
        // §1: an old-but-valid artifact is undetectable on first contact. This is the honest behaviour.
        assert_eq!(
            m.offer(&brl(), "2020-01-01T00:00:00Z", D1),
            RollbackVerdict::FirstObservation
        );
        assert_eq!(m.mark(&brl()), Some("2020-01-01T00:00:00Z"));
        assert_eq!(m.digest(&brl()), Some(D1));
    }

    #[test]
    fn equal_marker_with_the_same_content_is_an_idempotent_observation() {
        let mut m = HighWaterMarks::new();
        m.offer(&brl(), "2026-08-01T00:00:00Z", D1);
        let v = m.offer(&brl(), "2026-08-01T00:00:00Z", D1);
        assert_eq!(v, RollbackVerdict::Unchanged);
        assert!(v.accepted());
        assert_eq!(v.reason_code(), None);
        assert_eq!(
            m.offer(&brl(), "2026-08-02T00:00:00Z", D2),
            RollbackVerdict::Advanced
        );
        assert_eq!(m.mark(&brl()), Some("2026-08-02T00:00:00Z"));
        assert_eq!(m.digest(&brl()), Some(D2));
    }

    #[test]
    fn equal_marker_with_different_content_is_refused_fail_closed() {
        // §3.1. The markers are whole-second instants, so this is a case a publisher can reach by
        // accident and an attacker can reach on purpose. Neither may be silently accepted.
        let mut m = HighWaterMarks::new();
        m.offer(&brl(), "2026-08-01T00:00:00Z", D1);
        let v = m.offer(&brl(), "2026-08-01T00:00:00Z", D2);
        assert_eq!(v, RollbackVerdict::Equivocation);
        assert!(!v.accepted());
        assert_eq!(v.reason_code(), Some("trust_version_equivocation"));
        // State untouched: the conflict must not let the second artifact take the position.
        assert_eq!(m.digest(&brl()), Some(D1));
        assert_eq!(m.mark(&brl()), Some("2026-08-01T00:00:00Z"));
    }

    #[test]
    fn the_conflict_verdict_does_not_depend_on_fetch_order() {
        // Whichever of the two arrives first, the second is refused. The outcome is a refusal in both
        // interleavings, which is what "deterministic" has to mean when neither artifact is preferred.
        for (a, b) in [(D1, D2), (D2, D1)] {
            let mut m = HighWaterMarks::new();
            m.offer(&brl(), "2026-08-01T00:00:00Z", a);
            assert_eq!(
                m.offer(&brl(), "2026-08-01T00:00:00Z", b),
                RollbackVerdict::Equivocation
            );
            assert_eq!(m.digest(&brl()), Some(a));
        }
    }

    #[test]
    fn rollback_is_refused_and_never_moves_the_mark() {
        let mut m = HighWaterMarks::new();
        m.offer(&brl(), "2026-08-02T00:00:00Z", D1);
        let v = m.offer(&brl(), "2026-08-01T00:00:00Z", D2);
        assert_eq!(v, RollbackVerdict::Rollback);
        assert!(!v.accepted());
        assert_eq!(v.reason_code(), Some("trust_version_rollback"));
        // The mark must be untouched: serving old artifacts cannot lower it.
        assert_eq!(m.mark(&brl()), Some("2026-08-02T00:00:00Z"));
        // Repeating the attack changes nothing.
        assert_eq!(
            m.offer(&brl(), "2019-01-01T00:00:00Z", D2),
            RollbackVerdict::Rollback
        );
        assert_eq!(m.mark(&brl()), Some("2026-08-02T00:00:00Z"));
    }

    #[test]
    fn independent_authorities_do_not_interfere() {
        let mut m = HighWaterMarks::new();
        let a = MonotonicKey::new("key_manifest", "root-a");
        let b = MonotonicKey::new("key_manifest", "root-b");
        m.offer(&a, "2026-08-05T00:00:00Z", D1);
        // A lower value for a DIFFERENT authority is a first observation, not a rollback.
        assert_eq!(
            m.offer(&b, "2026-01-01T00:00:00Z", D2),
            RollbackVerdict::FirstObservation
        );
        // And an equal marker with different content under a different authority is not a conflict:
        // the two are separate sequences (§2).
        let mut m2 = HighWaterMarks::new();
        m2.offer(&a, "2026-08-05T00:00:00Z", D1);
        assert_eq!(
            m2.offer(&b, "2026-08-05T00:00:00Z", D2),
            RollbackVerdict::FirstObservation
        );
        assert_eq!(m.mark(&a), Some("2026-08-05T00:00:00Z"));
    }

    #[test]
    fn the_mark_survives_restart() {
        // §4: a memory-only mark is defeated by restarting the verifier.
        let mut before = HighWaterMarks::new();
        before.offer(&brl(), "2026-08-02T00:00:00Z", D1);
        let persisted = before.export();

        let mut after = HighWaterMarks::new(); // a fresh process
        after.restore(&persisted);
        assert_eq!(
            after.offer(&brl(), "2026-08-01T00:00:00Z", D2),
            RollbackVerdict::Rollback
        );
    }

    #[test]
    fn the_digest_survives_restart_too() {
        // Without the digest, a restart would reopen the §3.1 gap: the marker alone would readmit a
        // conflicting artifact at the same instant.
        let mut before = HighWaterMarks::new();
        before.offer(&brl(), "2026-08-02T00:00:00Z", D1);
        let persisted = before.export();

        let mut after = HighWaterMarks::new();
        after.restore(&persisted);
        assert_eq!(after.digest(&brl()), Some(D1));
        assert_eq!(
            after.offer(&brl(), "2026-08-02T00:00:00Z", D2),
            RollbackVerdict::Equivocation
        );
        assert_eq!(
            after.offer(&brl(), "2026-08-02T00:00:00Z", D1),
            RollbackVerdict::Unchanged
        );
    }

    #[test]
    fn restoring_stale_storage_cannot_move_a_mark_backwards() {
        let mut m = HighWaterMarks::new();
        m.offer(&brl(), "2026-08-09T00:00:00Z", D1);
        m.restore(&[(
            "brl".into(),
            "BANZA".into(),
            "2026-08-01T00:00:00Z".into(),
            D2.into(),
        )]);
        assert_eq!(m.mark(&brl()), Some("2026-08-09T00:00:00Z"));
        assert_eq!(m.digest(&brl()), Some(D1));
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
            m.offer(&brl(), a, D1);
            m.offer(&brl(), b, D2);
            assert_eq!(m.mark(&brl()), Some("2026-08-07T00:00:00Z"));
        }
    }

    #[test]
    fn export_is_deterministic() {
        let mut m = HighWaterMarks::new();
        m.offer(
            &MonotonicKey::new("brl", "BANZA"),
            "2026-08-02T00:00:00Z",
            D1,
        );
        m.offer(
            &MonotonicKey::new("key_manifest", "root-a"),
            "2026-08-01T00:00:00Z",
            D2,
        );
        assert_eq!(m.export(), m.export());
        assert_eq!(m.export()[0].0, "brl");
        assert_eq!(m.export()[0].3, D1);
    }
}
