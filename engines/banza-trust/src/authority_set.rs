//! The Root Authority Set: who may exercise BANZA Root authority, and how that changes.
//!
//! This module exists because of a defect found in v1.0.0. There, a root ceremony document was
//! *self-authorising*: a set `{A,B,C}` signed by two of its own keys validated, and so did an unrelated
//! `{X,Y,Z}` signed by two of ITS own keys. The engine proved "two keys named in this document agree
//! with each other", which anyone can produce. It never proved "the set that was already trusted
//! authorised this one".
//!
//! Here, every set except the pinned genesis set must be authorised by the threshold of the set it
//! succeeds. That single change is what turns 2-of-3 from a documented intention into a property of the
//! chain (`spec/root-authority-set.md`, `INV-ROOT-011`).
//!
//! Fail-closed throughout: anything missing, malformed, expired, below threshold or out of lineage
//! rejects. No path in this module authorises a Root action below threshold (`INV-ROOT-014`).

use crate::{canonical_bytes, verify_ed25519, TrustResult};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;

/// The member excluded from a set's signing input — a signature cannot lie inside the bytes it covers.
const SET_SIG_MEMBER: &str = "predecessor_signatures";
/// The same, for the Key Manifest.
const MANIFEST_SIG_MEMBER: &str = "root_signatures";

const KIND: &str = "root_authority_set";

/// The three-authority, threshold-two model. Not configurable: a different shape is a different
/// security model, and would need its own decision rather than a runtime flag.
pub const AUTHORITY_COUNT: usize = 3;
pub const THRESHOLD: usize = 2;

fn s<'a>(v: &'a Value, k: &str) -> Option<&'a str> {
    v.get(k).and_then(|x| x.as_str())
}

/// Strip the algorithm tag from a wire public key (`ed25519:<base64url>`).
///
/// The tag is part of the wire form, so it must be removed before verification — and an unrecognised
/// tag must fail rather than be ignored. Silently treating `somethingelse:AAAA` as ed25519 would verify
/// a key under an algorithm nobody agreed to.
fn ed25519_key(wire: &str) -> Option<&str> {
    wire.strip_prefix("ed25519:")
}

/// SHA-256 over a set's signing input. This is the set's identity: what a successor's
/// `predecessor_digest` and a Key Manifest's `root_authority_set.digest` refer to.
pub fn set_digest(set: &Value) -> Result<String, String> {
    let msg = canonical_bytes(set, &[SET_SIG_MEMBER])?;
    Ok(format!("{:x}", Sha256::digest(&msg)))
}

/// Structural rules that hold for every set, genesis included.
fn well_formed(set: &Value) -> Result<(), String> {
    let auths = set
        .get("authorities")
        .and_then(|a| a.as_array())
        .ok_or("authorities missing or not an array")?;
    if auths.len() != AUTHORITY_COUNT {
        return Err(format!(
            "a Root Authority Set carries exactly {AUTHORITY_COUNT} authorities, found {}",
            auths.len()
        ));
    }
    let threshold = set
        .get("threshold")
        .and_then(|t| t.as_u64())
        .ok_or("threshold missing")?;
    if threshold as usize != THRESHOLD {
        return Err(format!("threshold must be {THRESHOLD}, found {threshold}"));
    }

    // Distinct ids AND distinct keys. Two entries sharing a key would be one authority wearing two
    // labels, which would let a single custodian reach the threshold alone.
    let mut ids = BTreeSet::new();
    let mut keys = BTreeSet::new();
    for a in auths {
        let id = s(a, "authority_id").ok_or("authority without authority_id")?;
        let pk = s(a, "public_key").ok_or("authority without public_key")?;
        if !ids.insert(id) {
            return Err(format!("duplicate authority_id: {id}"));
        }
        if !keys.insert(pk) {
            return Err(format!("two authorities share one public key: {id}"));
        }
    }
    Ok(())
}

/// The authorities of `set`, as (id, public_key).
fn authorities(set: &Value) -> Vec<(String, String)> {
    set.get("authorities")
        .and_then(|a| a.as_array())
        .map(|a| {
            a.iter()
                .filter_map(|x| {
                    Some((
                        s(x, "authority_id")?.to_string(),
                        s(x, "public_key")?.to_string(),
                    ))
                })
                .collect()
        })
        .unwrap_or_default()
}

/// Count DISTINCT authorities of `signing_set` with a valid signature in `sigs` over `msg`.
///
/// Distinctness is the whole point: counting signature ENTRIES would let one custodian sign twice and
/// reach 2-of-3 alone, which defeats the property the threshold exists for.
fn distinct_valid_signers(sigs: &Value, signing_set: &Value, msg: &[u8]) -> BTreeSet<String> {
    let members = authorities(signing_set);
    let mut ok: BTreeSet<String> = BTreeSet::new();
    if let Some(arr) = sigs.as_array() {
        for entry in arr {
            let (Some(id), Some(sig)) = (s(entry, "authority_id"), s(entry, "signature")) else {
                continue;
            };
            // The public key comes from the SIGNING SET, never from the document being verified —
            // otherwise a candidate could supply the keys used to check it.
            if let Some((_, pk)) = members.iter().find(|(mid, _)| mid == id) {
                if let Some(raw) = ed25519_key(pk) {
                    if verify_ed25519(raw, sig, msg).is_ok() {
                        ok.insert(id.to_string());
                    }
                }
            }
        }
    }
    ok
}

/// Accept the **genesis** set against an explicitly configured digest.
///
/// Trust-on-first-use is refused deliberately (`INV-ROOT-012`): an unpinned genesis set is not a root,
/// it is whichever document arrived first.
pub fn verify_genesis_set(set: &Value, pinned_digest: &str) -> TrustResult {
    if let Err(e) = well_formed(set) {
        return TrustResult::fail(KIND, &e);
    }
    match set.get("set_sequence").and_then(|x| x.as_u64()) {
        Some(0) => {}
        _ => return TrustResult::fail(KIND, "the genesis set must have set_sequence 0"),
    }
    if !set
        .get("predecessor_digest")
        .map(|d| d.is_null())
        .unwrap_or(false)
    {
        return TrustResult::fail(KIND, "the genesis set must carry a null predecessor_digest");
    }
    if pinned_digest.trim().is_empty() {
        return TrustResult::fail(
            KIND,
            "no pinned genesis digest supplied (fail-closed; TOFU is refused)",
        );
    }
    let digest = match set_digest(set) {
        Ok(d) => d,
        Err(e) => return TrustResult::fail(KIND, &e),
    };
    if digest != pinned_digest {
        return TrustResult::fail(
            KIND,
            &format!("genesis digest {digest} does not match the pinned digest {pinned_digest}"),
        );
    }
    TrustResult::ok(KIND, "genesis set matches the pinned digest")
}

/// Accept `candidate` as the successor of the trusted `active` set.
///
/// The authority being REMOVED is never consulted: the signatures counted are those of the predecessor
/// set, so an obstructive or compromised authority cannot veto its own replacement (`INV-ROOT-013`).
pub fn verify_successor_set(candidate: &Value, active: &Value) -> TrustResult {
    if let Err(e) = well_formed(candidate) {
        return TrustResult::fail(KIND, &e);
    }

    let (Some(next), Some(cur)) = (
        candidate.get("set_sequence").and_then(|x| x.as_u64()),
        active.get("set_sequence").and_then(|x| x.as_u64()),
    ) else {
        return TrustResult::fail(
            KIND,
            "set_sequence missing on the candidate or the active set",
        );
    };
    if next != cur + 1 {
        return TrustResult::fail(
            KIND,
            &format!(
                "set_sequence must be exactly {} (found {next}); no gaps, no reordering",
                cur + 1
            ),
        );
    }

    let expected = match set_digest(active) {
        Ok(d) => d,
        Err(e) => return TrustResult::fail(KIND, &e),
    };
    match s(candidate, "predecessor_digest") {
        Some(d) if d == expected => {}
        Some(d) => {
            return TrustResult::fail(
                KIND,
                &format!("predecessor_digest {d} does not identify the active set ({expected})"),
            )
        }
        None => return TrustResult::fail(KIND, "predecessor_digest missing on a successor set"),
    }

    let msg = match canonical_bytes(candidate, &[SET_SIG_MEMBER]) {
        Ok(m) => m,
        Err(e) => return TrustResult::fail(KIND, &e),
    };
    let empty = Value::Array(vec![]);
    let sigs = candidate.get(SET_SIG_MEMBER).unwrap_or(&empty);
    let signers = distinct_valid_signers(sigs, active, &msg);
    if signers.len() < THRESHOLD {
        return TrustResult::fail(
            KIND,
            &format!(
                "{} distinct predecessor authority signature(s); {THRESHOLD} required. A set signed only \
                 by its own authorities authorises nothing.",
                signers.len()
            ),
        );
    }

    TrustResult::ok(
        KIND,
        &format!(
            "successor authorised by {} distinct authorities of set {cur}",
            signers.len()
        ),
    )
}

/// Accept a Key Manifest under the **active** set: the manifest must name that set, and at least
/// `THRESHOLD` distinct authorities of it must have signed.
pub fn verify_key_manifest_under_set(manifest: &Value, active: &Value) -> TrustResult {
    let kind = "key_manifest";

    let named = manifest.get("root_authority_set");
    let (Some(seq), Some(dig)) = (
        named
            .and_then(|r| r.get("set_sequence"))
            .and_then(|x| x.as_u64()),
        named.and_then(|r| r.get("digest")).and_then(|x| x.as_str()),
    ) else {
        return TrustResult::fail(
            kind,
            "manifest does not name an authorising Root Authority Set",
        );
    };
    let active_seq = active.get("set_sequence").and_then(|x| x.as_u64());
    if Some(seq) != active_seq {
        return TrustResult::fail(
            kind,
            &format!("manifest names set {seq}; the active set is {active_seq:?}"),
        );
    }
    let expected = match set_digest(active) {
        Ok(d) => d,
        Err(e) => return TrustResult::fail(kind, &e),
    };
    if dig != expected {
        return TrustResult::fail(
            kind,
            "manifest names a set digest that is not the active set",
        );
    }

    let msg = match canonical_bytes(manifest, &[MANIFEST_SIG_MEMBER]) {
        Ok(m) => m,
        Err(e) => return TrustResult::fail(kind, &e),
    };
    let empty = Value::Array(vec![]);
    let sigs = manifest.get(MANIFEST_SIG_MEMBER).unwrap_or(&empty);
    let signers = distinct_valid_signers(sigs, active, &msg);
    if signers.len() < THRESHOLD {
        return TrustResult::fail(
            kind,
            &format!(
                "{} distinct root authority signature(s); {THRESHOLD} required",
                signers.len()
            ),
        );
    }
    TrustResult::ok(
        kind,
        &format!(
            "manifest authorised by {} distinct root authorities",
            signers.len()
        ),
    )
}

/// Where a candidate sits relative to the highest sequence already accepted for this lineage.
///
/// The set joins the existing monotonic rule (`spec/trust-freshness.md`) rather than inventing a second
/// one: `set_sequence` is its ordering marker and the set digest is its content digest.
#[derive(Debug, PartialEq, Eq)]
pub enum Ordering {
    /// Below the highest accepted — a rollback attempt.
    Rollback,
    /// Same marker, same content: an idempotent re-observation.
    Replay,
    /// Same marker, different content: one lineage published two different sets at one position.
    Equivocation,
    /// Above the highest accepted — eligible, subject to `verify_successor_set`.
    Eligible,
}

pub fn classify_ordering(
    candidate: &Value,
    highest_accepted_sequence: u64,
    digest_at_that_sequence: &str,
) -> Result<Ordering, String> {
    let seq = candidate
        .get("set_sequence")
        .and_then(|x| x.as_u64())
        .ok_or("set_sequence missing")?;
    if seq < highest_accepted_sequence {
        return Ok(Ordering::Rollback);
    }
    if seq > highest_accepted_sequence {
        return Ok(Ordering::Eligible);
    }
    let d = set_digest(candidate)?;
    Ok(if d == digest_at_that_sequence {
        Ordering::Replay
    } else {
        Ordering::Equivocation
    })
}

/// True when the surviving authorities can still authorise a successor.
///
/// Below the threshold the answer is false and canonical continuity is blocked. There is deliberately
/// no other function in this crate that returns true in that state: an emergency key, an override or a
/// single-signer break glass would be a one-party path to the maximum authority (`INV-ROOT-014`).
pub fn continuity_available(surviving_authorities: usize) -> bool {
    surviving_authorities >= THRESHOLD
}

/// What a verifier retains about one Root lineage between observations.
///
/// Exactly two values: the highest sequence accepted, and the digest accepted at that sequence. Nothing
/// else is kept, which is what lets a verifier persist its trust state in two fields and restore it
/// after a restart without ambiguity.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TrustedSet {
    pub sequence: u64,
    pub digest: String,
}

impl TrustedSet {
    /// The state established by pinning the genesis set. Callers reach this only through
    /// `verify_genesis_set`; there is no constructor that accepts a set nobody verified.
    pub fn at_genesis(genesis: &Value) -> Result<Self, String> {
        let sequence = genesis
            .get("set_sequence")
            .and_then(|x| x.as_u64())
            .ok_or("set_sequence missing")?;
        Ok(TrustedSet {
            sequence,
            digest: set_digest(genesis)?,
        })
    }
}

/// The result of showing a candidate set to a verifier holding `TrustedSet`.
///
/// `state` is the state AFTER the observation, and for everything except `Advanced` it is the state
/// from before, unchanged.
#[derive(Debug, PartialEq, Eq)]
pub enum Observation {
    /// Verified successor at the next position. The only outcome that moves trusted state.
    Advanced,
    /// The same set at the same position: nothing to do.
    Replay,
    /// A different set at the same position. One lineage published two, and the verifier refuses to
    /// choose. Trusted state is unchanged and stays that way.
    Equivocation,
    /// A superseded set presented again.
    Rollback,
    /// Eligible by position but not authorised by the trusted set.
    Rejected(String),
}

/// Apply a candidate set to a verifier's trusted state.
///
/// This is the half that decides what *accepting* means, and it is deliberately shipped rather than left
/// for each implementer to write. `classify_ordering` reports where a candidate sits; on its own it
/// cannot stop a caller from writing the new digest anyway. Everything that could quietly replace
/// trusted state — taking the first arrival, taking the last, preferring a lower digest, preferring a
/// source — lives in the step this function replaces.
///
/// Trusted state advances only when the candidate is BOTH at the next position AND authorised by the
/// currently trusted set. The returned state is the caller's new state; on any other outcome it is the
/// old one, returned unchanged so that ignoring the outcome still cannot corrupt it.
pub fn observe(
    state: &TrustedSet,
    active_set: &Value,
    candidate: &Value,
) -> (TrustedSet, Observation) {
    // Ordering is decided from the carried state ALONE — sequence and digest. A rollback, a replay and
    // an equivocation are all answerable without knowing which document the active set is, and answering
    // them first is what keeps a conflict a conflict: consulting the active set earlier would let a
    // caller turn "two sets at one position" into an argument about which set to consult.
    match classify_ordering(candidate, state.sequence, &state.digest) {
        Err(e) => (state.clone(), Observation::Rejected(e)),
        Ok(Ordering::Rollback) => (state.clone(), Observation::Rollback),
        Ok(Ordering::Replay) => (state.clone(), Observation::Replay),
        Ok(Ordering::Equivocation) => (state.clone(), Observation::Equivocation),
        Ok(Ordering::Eligible) => {
            // Only now does the active set matter, and it must be the one this state was established
            // at — otherwise a caller could authorise a successor against a set it merely happens to
            // hold rather than the set it actually trusts.
            match set_digest(active_set) {
                Ok(d) if d == state.digest => {}
                Ok(_) => {
                    return (
                        state.clone(),
                        Observation::Rejected(
                            "the active set is not the one this trusted state was established at"
                                .into(),
                        ),
                    )
                }
                Err(e) => return (state.clone(), Observation::Rejected(e)),
            }
            let verdict = verify_successor_set(candidate, active_set);
            if !verdict.verified {
                return (state.clone(), Observation::Rejected(verdict.detail));
            }
            match (
                candidate.get("set_sequence").and_then(|x| x.as_u64()),
                set_digest(candidate),
            ) {
                (Some(sequence), Ok(digest)) => {
                    (TrustedSet { sequence, digest }, Observation::Advanced)
                }
                _ => (
                    state.clone(),
                    Observation::Rejected("candidate has no usable sequence or digest".into()),
                ),
            }
        }
    }
}
