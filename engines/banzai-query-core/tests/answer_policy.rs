//! The answer policy is data, not a naming convention.
//!
//! The lexical router used to read `id.starts_with("def-")` to decide whether a fact was served
//! model-free or handed to the model. That put a rule in a name: invisible to anyone reading the entry,
//! and unable to express the two cases that actually come up — a definition that should NOT be settled,
//! and a settled fact whose id is not a definition.
//!
//! These tests pin the property that replaced it. They are written against fixtures that exist in the
//! shipped index rather than invented ones, because a test whose fixture is imaginary proves nothing about
//! what production runs.
//!
//! # The two directions, proven by mutation
//!
//! Both were executed in an isolated worktree; neither ships, because either would be a behaviour change.
//! Measured at this level — no vendored WASM in between, since a first attempt probed through the stale
//! artifact and reported that nothing had changed when the source said otherwise:
//!
//! ```text
//! declaration REMOVED from def-operator-governance-authority (id still starts with def-)
//!     "quem controla os operadores?"   deterministic -> qwen        the prefix confers nothing
//!
//! declaration ADDED to is-banza-an-operator (not a def-* id; has an answer and two sources)
//!     "banza opera"                    qwen -> deterministic        the declaration is what drives it
//! ```
//!
//! Control: "o banza e um operador" stayed deterministic under both, because it is settled by the glossary
//! path rather than by the lexical policy site — which is how we know the mutation landed where it was
//! aimed and not somewhere broader.

use banzai_query_core::{entry_is_deterministic, route::route};

#[test]
fn the_declaration_decides_and_the_prefix_decides_nothing() {
    // Declared AND indexed → deterministic.
    assert!(
        entry_is_deterministic("def-operator-governance-authority"),
        "a declared, indexed entry must be answerable without a model"
    );

    // The decisive fixture: `def-bank` carries the def- prefix and IS declared deterministic on the
    // canonical entry, but it is not lexically eligible, so this routing path knows nothing about it. If
    // the prefix still conferred policy here, this would be true. It must not be — the name confers
    // nothing, membership and declaration do.
    assert!(
        !entry_is_deterministic("def-bank"),
        "the def- prefix must not confer an answer policy on an entry this path does not carry"
    );

    // A non-def-* entry that does not declare the policy is not deterministic either — the default is
    // false, so an index generated before the field existed cannot silently promote anything.
    assert!(
        !entry_is_deterministic("what-is-banza"),
        "an entry that declares nothing must not be treated as declared"
    );

    // An id that does not exist at all resolves to no policy rather than to a default yes.
    assert!(!entry_is_deterministic("def-this-does-not-exist"));
    assert!(!entry_is_deterministic(""));
}

#[test]
fn a_declared_fact_is_still_settled_end_to_end() {
    // The property that matters to a reader: the declaration actually produces a model-free answer on the
    // path it governs. Without this, the two assertions above could both hold while nothing was settled.
    for q in [
        "quem controla os operadores?",
        "who controls operators?",
        "quem governa os operadores?",
    ] {
        let r = route(q);
        assert_eq!(
            r.action, "deterministic",
            "{q:?} is a declared stable fact and must not require a model"
        );
        assert_eq!(
            r.entry_id.as_deref(),
            Some("def-operator-governance-authority"),
            "{q:?}"
        );
    }
}

#[test]
fn declaring_nothing_leaves_a_question_on_the_model_path() {
    // The negative control for the migration itself. `what-is-banza` is lexically eligible and reached by
    // this exact path, so if the policy read ever went back to the prefix — or to "critical" — this would
    // change. It is deliberately still model-backed: seven unrelated queries currently fall to this entry
    // because their own subject is unresolved, and declaring it settled would turn vague answers into
    // confident wrong ones. Subject first, policy second.
    let r = route("o que é o banza?");
    assert_eq!(r.entry_id.as_deref(), Some("what-is-banza"));
    assert_ne!(
        r.action, "deterministic",
        "this entry is not declared deterministic yet, and nothing may promote it implicitly"
    );
}
