//! Rust-first policy enforcement guard (ADR-038).
//!
//! Scans official BANZA/BanzAI source for **new non-Rust engines** and blocks them.
//! Allowed without question: Rust, React/`.tsx` UI, thin wrappers (no algorithm), data,
//! and the R0 legacy allowlist (existing engines pending migration R2–R6). The guard is
//! itself Rust — the policy applies to the policy tool. No network, no external call.

use serde::Deserialize;
use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};

/// Code extensions the guard inspects. Everything else (md/json/yaml/svg/rs) is out of scope:
/// Rust is by definition allowed; docs/data are allowed.
pub const CODE_EXTS: &[&str] = &["ts", "tsx", "js", "mjs", "py", "sh"];

/// Directories never scanned (generated, vendored, or the guard's own fixtures).
pub const EXCLUDE_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    "dist",
    ".next",
    "target",
    "__pycache__",
    ".pytest_cache",
    ".turbo",
    "fixtures",
    ".vercel",
    "coverage",
    "rustkb",
    "pkg",
    // website/lib/wasm: generated wasm-pack (--target web) glue for the Rust engines
    // (banzai-evidence, banzai-core). It carries engine-symbol names but is a build artifact.
    "wasm",
];

/// Strong, code-specific markers of an algorithmic engine. Chosen to be rare in prose/data:
/// generic domain words ("conformance", "invariant", "settlement") are deliberately excluded so
/// that data files (e.g. ADR summaries) are not false-positives. A file is engine-suspect iff it
/// contains at least one of these.
pub const STRONG_MARKERS: &[&str] = &[
    // retrieval / scoring / normalization
    ".nfd(",
    "tokenize",
    "tokeniz",
    "scoreentry",
    "score_entry",
    "scorechunk",
    "score_chunk",
    "finddecision",
    "find_decision",
    "normalizequery",
    "normalize_query",
    "scorequery",
    "evidencebundle",
    "evidence_bundle",
    "banzaikb",
    "buildindex",
    "build_index",
    // crypto / trust
    "ed25519",
    "verifysignature",
    "verify_signature",
    "sign_canonical",
    "canonicaljson",
    "canonical_json",
    "verify_brl",
    "verifybrl",
    "openssl dgst",
    "openssl pkeyutl",
    "nacl.sign",
    "ed25519_dalek",
    // conformance / financial invariant computation
    // (generic nouns like "double-entry"/"key_manifest" are excluded: they appear in
    //  data/route-serving code — real crypto is caught by the verb markers above)
    "net + fee",
    "net+fee",
    "checkinvariant",
    "check_invariant",
    // guards / routing
    "selectroute",
    "select_route",
    "profilerouter",
    "profile_router",
    "allowheavy",
    "allow_heavy",
    "fail-closed",
    "fail_closed",
    "negation-aware",
    "denylist",
    // R6 additions — code-specific engine tokens (kept narrow to avoid data/doc false positives)
    "retrieve_topk",
    "retrievetopk",
    "route_task",
    "guard_claim",
    // M2.4 — active banza-trust verbs. The obsolete verify_certificate / check_chain were removed
    // with the certificate trust model; a new non-Rust trust engine would carry these active verbs
    // instead. (verify_brl above still stands for the revocation-list check.)
    "verify_signed_protocol_metadata",
    "verify_revocation_list",
    "evaluate_trust",
    // R9 strict — Python signing/ceremony/conformance engine tokens (no such Python may return)
    "sign_certificate",
    "sign_brl",
    "generate_signed_brl",
    "run_federation",
    "fixture_server",
    "runner_infra",
    "def sign(",
    "signingkey",
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Verdict {
    /// Not an engine (no strong marker) — allowed.
    NotEngine,
    /// React/`.tsx` UI — allowed even if it references an engine (it renders it).
    UiAllowed,
    /// Explicitly marked `RUST_WRAPPER_ONLY` — a thin wrapper that only calls a Rust engine
    /// (binary/WASM). Allowed even with engine markers; no separate allowlist entry needed.
    WrapperMarked,
    /// A unit-test file (`*.test.*` / `*.spec.*` / `__tests__/`) that exercises an engine —
    /// allowed by the Rust-first rule (tests are permitted). Reported transparently, not as a
    /// pending migration.
    TestAllowed,
    /// In the R0 legacy allowlist — allowed but reported as pending migration.
    LegacyAllowlisted,
    /// New non-Rust engine outside the allowlist — BLOCKED.
    BlockedNewEngine,
}

impl Verdict {
    pub fn label(&self) -> &'static str {
        match self {
            Verdict::NotEngine => "allowed:not-engine",
            Verdict::UiAllowed => "allowed:ui",
            Verdict::WrapperMarked => "allowed:rust-wrapper-only",
            Verdict::TestAllowed => "allowed:test",
            Verdict::LegacyAllowlisted => "allowed:legacy-allowlisted",
            Verdict::BlockedNewEngine => "BLOCKED:new-non-rust-engine",
        }
    }
    pub fn is_blocked(&self) -> bool {
        matches!(self, Verdict::BlockedNewEngine)
    }
}

#[derive(Debug, Clone)]
pub struct FileReport {
    pub path: String,
    pub ext: String,
    pub markers: Vec<String>,
    pub verdict: Verdict,
    pub note: String,
}

#[derive(Debug, Default)]
pub struct GuardReport {
    pub scanned: usize,
    pub files: Vec<FileReport>,
}

impl GuardReport {
    pub fn blocked(&self) -> Vec<&FileReport> {
        self.files
            .iter()
            .filter(|f| f.verdict.is_blocked())
            .collect()
    }
    pub fn legacy_pending(&self) -> Vec<&FileReport> {
        self.files
            .iter()
            .filter(|f| f.verdict == Verdict::LegacyAllowlisted)
            .collect()
    }
    pub fn tests_allowed(&self) -> Vec<&FileReport> {
        self.files
            .iter()
            .filter(|f| f.verdict == Verdict::TestAllowed)
            .collect()
    }
}

/// A unit-test file per the standard JS/TS conventions: a `.test.`/`.spec.` infix in the base
/// name, or a `__tests__/` path segment. Tests are permitted under the Rust-first rule.
pub fn is_test_file(path: &str) -> bool {
    let base = path.rsplit('/').next().unwrap_or(path);
    base.contains(".test.") || base.contains(".spec.") || path.contains("/__tests__/")
}

/// Policy guard scripts (`tools/check-*.sh`) enforce the Rust-first rule and other invariants;
/// by design they NAME engines (paths, markers) to detect them. They are Bash orchestration
/// (allowed by ADR-038), never engines themselves — so an engine marker inside a guard script
/// is a reference, not a new engine. Narrow on purpose: only `tools/check-*.sh`, so a real
/// non-Rust engine that happens to be a shell script elsewhere is still blocked.
pub fn is_guard_file(path: &str) -> bool {
    path.starts_with("tools/check-") && path.ends_with(".sh")
}

// ── Allowlist ────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct AllowlistEntry {
    pub path: String,
    #[serde(default)]
    pub classification: String,
    #[serde(default)]
    pub migration_phase: String,
    #[serde(default)]
    pub reason: String,
}

#[derive(Debug, Deserialize)]
pub struct AllowlistFile {
    #[serde(default)]
    pub version: u32,
    #[serde(default)]
    pub policy: String,
    pub entries: Vec<AllowlistEntry>,
}

/// Load the legacy allowlist as a set of normalized repo-relative paths.
pub fn load_allowlist(path: &Path) -> Result<BTreeSet<String>, String> {
    let raw = fs::read_to_string(path).map_err(|e| format!("read {}: {e}", path.display()))?;
    let f: AllowlistFile =
        serde_json::from_str(&raw).map_err(|e| format!("parse allowlist: {e}"))?;
    Ok(f.entries
        .into_iter()
        .map(|e| normalize_path(&e.path))
        .collect())
}

/// Normalize a path for comparison: strip leading "./", collapse to forward slashes.
pub fn normalize_path(p: &str) -> String {
    let p = p.strip_prefix("./").unwrap_or(p);
    p.replace('\\', "/")
}

// ── Classification ───────────────────────────────────────────────────────────

pub fn ext_of(path: &str) -> String {
    Path::new(path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase()
}

/// Does an allowlist entry cover this path? Exact match, or a directory-prefix entry
/// (entry ending in `/` or containing a `*` glob suffix like `src/api/src/__tests__/*.test.ts`).
pub fn allowlist_covers(allow: &BTreeSet<String>, path: &str) -> bool {
    if allow.contains(path) {
        return true;
    }
    for entry in allow {
        if let Some(prefix) = entry.strip_suffix("/**") {
            if path.starts_with(prefix) {
                return true;
            }
        }
        if let Some((prefix, suffix)) = entry.split_once("/*") {
            // e.g. "src/api/src/__tests__/*.test.ts"
            if path.starts_with(prefix) && path.ends_with(suffix.trim_start_matches('.')) {
                return true;
            }
            if path.starts_with(prefix) && (suffix.is_empty() || path.ends_with(suffix)) {
                return true;
            }
        }
    }
    false
}

/// The CODE of a source file: comments and string literals removed.
///
/// The marker list below is documented as "code-specific … chosen to be rare in prose/data", but the scan
/// read the whole file, so prose and data tripped it anyway. Three files failed for exactly that reason:
/// a module explaining that it is fail-closed IN A COMMENT, a bilingual catalogue whose reader-facing tab
/// label is the words "Evidence Bundle", and a realization table whose KEYS name the facts a procedure
/// contains. None of them decides anything; they say things.
///
/// Engine responsibility shows up as code — a function that tokenizes, a comparison that verifies a
/// signature, a branch that scores. That is what is scanned now. A file that genuinely evaluates trust
/// still trips the marker in its identifiers and control flow, where the marker list was aimed all along.
pub fn code_only(content: &str) -> String {
    let b: Vec<char> = content.chars().collect();
    let mut out = String::with_capacity(content.len());
    let mut i = 0usize;
    while i < b.len() {
        let c = b[i];
        // line comment
        if c == '/' && i + 1 < b.len() && b[i + 1] == '/' {
            while i < b.len() && b[i] != '\n' {
                i += 1;
            }
            continue;
        }
        // block comment
        if c == '/' && i + 1 < b.len() && b[i + 1] == '*' {
            i += 2;
            while i + 1 < b.len() && !(b[i] == '*' && b[i + 1] == '/') {
                i += 1;
            }
            i = (i + 2).min(b.len());
            continue;
        }
        // string literal (kept as an empty pair so adjacent tokens do not fuse)
        if c == '"' || c == '\'' || c == '`' {
            let quote = c;
            i += 1;
            while i < b.len() {
                if b[i] == '\\' {
                    i += 2;
                    continue;
                }
                if b[i] == quote {
                    i += 1;
                    break;
                }
                i += 1;
            }
            out.push(' ');
            continue;
        }
        out.push(c);
        i += 1;
    }
    out
}

pub fn classify(rel_path: &str, content: &str, allow: &BTreeSet<String>) -> FileReport {
    let path = normalize_path(rel_path);
    let ext = ext_of(&path);
    // Markers are looked for in the CODE only: a marker in a comment is prose about the file, and a marker
    // in a string literal is a name or a sentence the file carries. Neither is an algorithm.
    let lower = code_only(content).to_lowercase();
    let markers: Vec<String> = STRONG_MARKERS
        .iter()
        .filter(|m| lower.contains(**m))
        .map(|m| m.to_string())
        .collect();
    let suspect = !markers.is_empty();

    // R6: an explicit RUST_WRAPPER_ONLY marker means a thin wrapper that only calls a Rust engine.
    let wrapper_marked = content.contains("RUST_WRAPPER_ONLY");

    // A file this repository GENERATES from another source is data, not an engine. Its content is
    // whatever the source says — an ADR summary can legitimately contain a phrase that is an engine
    // marker in hand-written code — and porting it to Rust would mean porting the generator's output
    // format, which decides nothing. The declaration must name the generating tool, so this cannot be
    // used to exempt hand-written code by adding a comment.
    let generated = content
        .lines()
        .take(3)
        .any(|l| l.contains("GENERATED by tools/") || l.contains("@generated by tools/"));

    let (verdict, note) = if generated {
        (
            Verdict::NotEngine,
            "generated artifact — its content is derived from a declared source; not an engine"
                .to_string(),
        )
    } else if wrapper_marked {
        (
            Verdict::WrapperMarked,
            "RUST_WRAPPER_ONLY — thin wrapper over a Rust engine".to_string(),
        )
    } else if is_guard_file(&path) && suspect {
        (
            Verdict::NotEngine,
            "policy guard script — names engines by design; not an engine".to_string(),
        )
    } else if is_test_file(&path) && suspect {
        (
            Verdict::TestAllowed,
            "test file — exercises a Rust-backed engine; allowed".to_string(),
        )
    } else if allowlist_covers(allow, &path) {
        (
            Verdict::LegacyAllowlisted,
            "R0 legacy engine — pending Rust migration".to_string(),
        )
    } else if !suspect {
        (Verdict::NotEngine, "no engine markers".to_string())
    } else if ext == "tsx" {
        (Verdict::UiAllowed, "React/.tsx UI surface".to_string())
    } else {
        (
            Verdict::BlockedNewEngine,
            format!("new non-Rust engine ({}) not in allowlist — port to Rust or add a justified allowlist entry", ext),
        )
    };

    FileReport {
        path,
        ext,
        markers,
        verdict,
        note,
    }
}

// ── Scan ─────────────────────────────────────────────────────────────────────

fn walk(dir: &Path, out: &mut Vec<PathBuf>) {
    let rd = match fs::read_dir(dir) {
        Ok(rd) => rd,
        Err(_) => return,
    };
    for entry in rd.flatten() {
        let p = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if p.is_dir() {
            if EXCLUDE_DIRS.contains(&name.as_str()) {
                continue;
            }
            walk(&p, out);
        } else {
            let ext = p
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase();
            if CODE_EXTS.contains(&ext.as_str()) && !name.ends_with(".d.ts") {
                out.push(p);
            }
        }
    }
}

/// Scan `root` recursively (or the explicit `files` if non-empty), classify each code file.
pub fn scan(root: &Path, files: &[String], allow: &BTreeSet<String>) -> GuardReport {
    let mut paths: Vec<PathBuf> = Vec::new();
    if files.is_empty() {
        walk(root, &mut paths);
    } else {
        paths = files.iter().map(PathBuf::from).collect();
    }
    let mut report = GuardReport::default();
    for p in paths {
        let content = match fs::read_to_string(&p) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let rel = p
            .strip_prefix(root)
            .unwrap_or(&p)
            .to_string_lossy()
            .to_string();
        report.scanned += 1;
        report.files.push(classify(&rel, &content, allow));
    }
    report.files.sort_by(|a, b| a.path.cmp(&b.path));
    report
}
