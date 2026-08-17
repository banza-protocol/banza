//! Public-source POLICY (M2.18) — deterministic, pure, testable.
//!
//! A BanzAI answer may only ever RETRIEVE and CITE canonical PUBLIC sources. The M2.18 incident
//! showed the assistant-governance file `CLAUDE.md` (mis-tagged `source_category: implementation`,
//! and — like every entry in the repo index — flagged `public_safe: true`) leaking into a public
//! answer's `sources[]`. `public_safe` was never a real filter: it is `true` for all 1492 index
//! entries. This module is the one deterministic authority that decides whether a repository source
//! is PUBLIC (may be a retrieval candidate and may be cited) or INTERNAL (never shown, never cited).
//!
//! It is applied TWICE, defence-in-depth (architecture doc §2.2):
//!   1. RETRIEVE  — an internal source is never a candidate (lib.rs retrieval exports).
//!   2. PACKAGE / present — a belt-and-braces filter before anything reaches the answer or sources[]
//!      (answerContract.js `normalizeBanzaiAnswer`, mirroring this module).
//!
//! Nothing here calls a model, reads a file, or holds state.
//!
//! SCOPE — deliberately PATH-based, not category-based. This is an OPEN protocol repository, and the
//! M2.13B repo-wide knowledge feature intentionally cites across every content CATEGORY — code, docs,
//! guards/CI, license, website, Operador-Zero, reports — as maintainer-transparent sources ("how is X
//! implemented / enforced"). Excluding a whole category would REGRESS that feature. What must never be
//! a citable *source* is a file that is not protocol knowledge at all:
//!   • ASSISTANT-INSTRUCTION files — `CLAUDE.md`, `CLAUDE_BASE.md`: instructions to the agent, not a
//!     description of the protocol (this is the exact incident file).
//!   • SECRET-BEARING files — any dotenv.
//!   • the rust-first legacy allowlist — an internal migration ledger, not documentation.
//!   • persistent assistant memory, if ever indexed.
//! Everything else in the public repo, in any category, stays citable. `category` is kept in the
//! signature (informational + future-proofing) so callers pass it uniformly; the decision is by path.

/// Categories whose every entry is INTERNAL. EMPTY by design (see the SCOPE note): the open repo cites
/// across all content categories; only assistant-instruction / secret PATHS are excluded. Kept as the
/// extensible seam so a future policy phase can demote a category without touching call sites.
pub const INTERNAL_CATEGORIES: &[&str] = &[];

/// A repository source is INTERNAL when its category is internal (currently none) OR its path is an
/// assistant-instruction / secret file that is not protocol knowledge.
pub fn is_internal_source(path: &str, category: &str) -> bool {
    if internal_by_path(path) {
        return true;
    }
    INTERNAL_CATEGORIES.contains(&category.trim())
}

/// A repository source may appear in a PUBLIC answer (retrieval candidate + citable) iff it is not
/// internal. This is the single choke point the retriever and the presenter both call.
pub fn is_public_source(path: &str, category: &str) -> bool {
    !is_internal_source(path, category)
}

/// Coarse visibility label for a category alone (used by traces / the SourceClass contract). Path
/// rules still demote an individual source to internal — always gate the final decision through
/// `is_public_source(path, category)`, never this helper alone.
pub fn category_visibility(category: &str) -> &'static str {
    if INTERNAL_CATEGORIES.contains(&category.trim()) {
        "internal"
    } else {
        "public"
    }
}

/// Path-level internal rule: assistant-instruction / secret files that are not protocol knowledge and
/// must never surface as a public source, whatever category the index tagged them with. Kept tight so
/// no legitimate public document — including guards, reports, infra and Operador-Zero code, which
/// M2.13B cites — is hidden.
fn internal_by_path(path: &str) -> bool {
    // Normalize before matching (M2.18 SEC-FIX, adversarial): backslashes → '/', drop any ?query /
    // #fragment, strip a leading './' and a trailing '/', then match case-INSENSITIVELY. Otherwise
    // CLAUDE.MD, a bare lowercase claude.md, docs\CLAUDE.md, CLAUDE.md?x=1 or docs/CLAUDE.md/ would
    // slip through (and the JS mirror, which now normalizes too, would disagree).
    let mut s = path.trim().replace('\\', "/");
    if let Some(i) = s.find(['?', '#']) {
        s.truncate(i);
    }
    let p = s.trim().trim_start_matches("./").trim_end_matches('/');
    if p.is_empty() {
        return true; // fail-closed: no provenance → not citable
    }
    let lower = p.to_ascii_lowercase();

    // Assistant-governance instruction files — instructions to the agent, not protocol documentation.
    if lower == "claude.md" || lower.ends_with("/claude.md") {
        return true;
    }
    if lower.contains("claude_base") {
        return true;
    }
    // Rust-first legacy allowlist — an internal migration ledger.
    if lower.contains("rust-first-legacy-allowlist") {
        return true;
    }
    // Persistent assistant memory, if ever indexed.
    if lower.starts_with("memory/") || lower.contains("/memory/") {
        return true;
    }
    // Any dotenv / secret-bearing env file.
    if lower.contains(".env") {
        return true;
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn claude_md_is_internal_despite_implementation_category() {
        // The exact M2.18 incident source: CLAUDE.md, category=implementation, public_safe=true.
        assert!(is_internal_source("CLAUDE.md", "implementation"));
        assert!(!is_public_source("CLAUDE.md", "implementation"));
        assert!(is_internal_source(
            "docs/governance/CLAUDE_BASE.md",
            "normative"
        ));
    }

    #[test]
    fn claude_md_variants_are_all_internal() {
        // M2.18 SEC-FIX (adversarial): case + path-format variants must not slip past the filter.
        for p in [
            "CLAUDE.MD",
            "claude.md",
            "docs/claude.md",
            "docs\\CLAUDE.md",
            "CLAUDE.md?x=1",
            "CLAUDE.md#frag",
            "docs/CLAUDE.md/",
            "./CLAUDE.md",
            " CLAUDE.md ",
            "Memory/notes.md",
            ".ENV",
        ] {
            assert!(
                is_internal_source(p, "implementation"),
                "variant {p:?} must be internal"
            );
        }
    }

    #[test]
    fn canonical_public_docs_stay_public() {
        assert!(is_public_source(
            "decisions/adr/ADR-001-ecosystem-naming-banza-banzai-and-operators.md",
            "decision"
        ));
        assert!(is_public_source("spec/federation/overview.md", "normative"));
        assert!(is_public_source("website/app/(pt)/page.tsx", "website"));
        assert!(is_public_source("LICENSE", "legal-license"));
        assert!(is_public_source("SECURITY.md", "security-boundary"));
    }

    #[test]
    fn implementation_source_stays_public_for_repo_knowledge() {
        // M2.13B: real engine source is a legitimate "how is X implemented" citation.
        assert!(is_public_source(
            "engines/banzai-query-core/src/route.rs",
            "implementation"
        ));
        assert!(is_public_source(
            "services/banzai-api/src/pipeline.js",
            "banzai-runtime"
        ));
    }

    #[test]
    fn m2_13b_cited_categories_stay_public() {
        // M2.13B intentionally cites guards/CI, reports, infra and Operador-Zero code as maintainer-
        // transparent sources. The policy must NOT regress that — only instruction/secret PATHS go.
        assert!(is_public_source(
            ".github/workflows/identity-guard.yml",
            "guard-ci"
        ));
        assert!(is_public_source("tools/check-identity.sh", "guard-ci"));
        assert!(is_public_source("docs/reports/M2_17A_FOOTER.md", "report"));
        assert!(is_public_source(
            "infra/banza-network/docker-compose.yml",
            "infra"
        ));
        assert!(is_public_source("website/middleware.ts", "operator-zero"));
    }

    #[test]
    fn category_visibility_is_public_for_all_content_categories() {
        for c in [
            "decision",
            "normative",
            "implementation",
            "banzai-runtime",
            "website",
            "report",
            "guard-ci",
            "infra",
            "operator-zero",
            "legal-license",
            "security-boundary",
        ] {
            assert_eq!(category_visibility(c), "public", "{c}");
        }
    }

    #[test]
    fn empty_or_unknown_path_fails_closed() {
        assert!(is_internal_source("", "decision")); // no provenance → not citable
        assert!(is_internal_source("   ", "decision"));
    }

    #[test]
    fn dotenv_and_memory_are_internal() {
        assert!(is_internal_source(".env", "infra"));
        assert!(is_internal_source(
            "services/banzai-api/.env.local",
            "banzai-runtime"
        ));
        assert!(is_internal_source("memory/MEMORY.md", "report"));
        assert!(is_internal_source(
            "docs/governance/rust-first-legacy-allowlist.json",
            "normative"
        ));
    }
}
