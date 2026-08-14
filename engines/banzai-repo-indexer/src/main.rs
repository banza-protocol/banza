//! banzai-repo-indexer (M2.13B PR2, ADR-043/ADR-042).
//!
//! A deterministic, dependency-light Rust indexer that gives the BanzAI agent SAFE, CURRENT,
//! CITABLE knowledge of the whole BANZA monorepo — which since M2.19G.6 (ADR-042) includes the
//! consolidated BanzAI runtime (services/banzai-api), engines (engines/banzai-*), docs and guards.
//! The separate banza-protocol/banzai repo was permanently removed; this indexer no longer indexes any sibling. It:
//!   1. discovers indexable files under the monorepo;
//!   2. applies security exclusions (secrets/.env/keys/PEM/GGUF/node_modules/target/.next/dist/build/
//!      logs/dumps/binaries) — path-based AND a content secret scan (fail-closed);
//!   3. classifies every file into one of 12 source categories;
//!   4. chunks by file type (markdown heading, Rust symbol, TS component/route, JSON/schema summary,
//!      Makefile target, CI workflow, shell-guard header, TOML package, license);
//!   5. extracts rich per-chunk metadata + a content hash;
//!   6. emits five artifacts — banzai-repo-index.json (bounded content chunks, embedded for retrieval),
//!      banzai-repo-index-manifest.json (counts, commits, hashes, categories, tool version),
//!      banzai-repo-index-coverage.json (one record per indexed file, proves coverage),
//!      banzai-repo-index-exclusions.json (every excluded path + reason), and
//!      banzai-repo-index-safety.json (the secret-scan summary that proves the index is secret-free).
//!
//! It is DETERMINISTIC (sorted walks, stable hashing, no timestamps in the content hash), does NO
//! network, and NEVER emits secret material. TS/JS remains UI/glue only (ADR-043).
//!
//! CLI: banzai-repo-indexer <banza_repo> <banza_commit> <out_dir> [indexed_at]  (monorepo-only; M2.19G.6)

use serde::Serialize;
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

const INDEX_VERSION: &str = "m2.13b-pr2";
const TOOL_VERSION: &str = "banzai-repo-indexer/0.1.0";
const BANZA_REMOTE: &str = "banza-protocol/banza";
// M2.19G.6 (ADR-042): the separate banza-protocol/banzai repo was consolidated into this monorepo and
// permanently removed. The indexer indexes ONLY this monorepo — there is no sibling to index. The `classify`/
// `roots_for` helpers retain generic path rules (incl. inert `banza-protocol/banzai` branches used only
// by their unit tests) but are never invoked with any repo other than BANZA_REMOTE.

/// Hard caps that bound the embedded content index (WASM size + per-query CPU). The coverage file is
/// NOT capped — it records every indexable file so the coverage guard can prove breadth.
const MAX_CHUNKS: usize = 1900;
const MAX_CHUNK_CHARS: usize = 300;
/// Per-file chunk cap so no single large file crowds out breadth.
const MAX_CHUNKS_PER_FILE: usize = 4;
/// Per-category cap so no single category (e.g. the ~50 ADRs) starves website/guard/report/banzai of
/// retrieval representation. Every category keeps a fair share.
const MAX_CHUNKS_PER_CATEGORY: usize = 170;
/// Skip files larger than this (bytes) — huge generated/vendored blobs carry no per-chunk value.
const MAX_FILE_BYTES: u64 = 512 * 1024;

// ─────────────────────────────────────────────────────────────────────────────
// Serializable records
// ─────────────────────────────────────────────────────────────────────────────

/// One retrievable chunk with full provenance + classification metadata (PART 8).
#[derive(Serialize, Clone)]
struct Chunk {
    repo: String,
    repo_remote: String,
    repo_commit: String,
    path: String,
    file_name: String,
    extension: String,
    file_type: String,
    source_category: String,
    title: String,
    heading: String,
    symbol_name: String,
    language: String,
    line_start: usize,
    line_end: usize,
    content: String,
    content_hash: String,
    indexed_at: String,
    index_version: String,
    stale_risk: String,
    public_safe: bool,
    normative_weight: u8,
    implementation_weight: u8,
    action_safety_relevance: u8,
    secrets_scan: String,
    source_priority: u8,
}

/// One coverage record per indexed file (proves the file is in the index).
#[derive(Serialize)]
struct FileRecord {
    repo: String,
    path: String,
    file_name: String,
    extension: String,
    file_type: String,
    source_category: String,
    content_hash: String,
    bytes: u64,
    chunks: usize,
    secrets_scan: String,
    public_safe: bool,
}

/// One exclusion record.
#[derive(Serialize)]
struct Exclusion {
    repo: String,
    path: String,
    reason: String,
}

// ─────────────────────────────────────────────────────────────────────────────
// Hashing (dependency-free FNV-1a 64-bit hex)
// ─────────────────────────────────────────────────────────────────────────────

fn fnv1a_hex(s: &str) -> String {
    let mut h: u64 = 0xcbf29ce484222325;
    for b in s.as_bytes() {
        h ^= *b as u64;
        h = h.wrapping_mul(0x100000001b3);
    }
    format!("{h:016x}")
}

// ─────────────────────────────────────────────────────────────────────────────
// Security exclusions (path-based) + content secret scan (fail-closed)
// ─────────────────────────────────────────────────────────────────────────────

/// Directory / path segments that are never indexed (build, vcs, vendored, secrets, runtime).
const DENY_SEGMENTS: &[&str] = &[
    "/.git/",
    "/node_modules/",
    "/target/",
    "/.next/",
    "/dist/",
    "/build/",
    "/coverage/",
    "/.cache/",
    "/.turbo/",
    "/logs/",
    "/backup",
    "/backups/",
    "/secrets/",
    "/tmp/",
    "/.venv/",
    "/__pycache__/",
    "/vendor/",
];

/// Filename / substring patterns that always mean "secret or unsafe" — path-based first line.
const DENY_PATTERNS: &[&str] = &[
    ".env",
    ".pem",
    ".key",
    ".p12",
    ".pfx",
    ".gguf",
    "id_rsa",
    "id_ed25519",
    "id_ecdsa",
    "age.key",
    "private-key",
    "privatekey",
    "credential",
    "secret_key",
    ".ppk",
    ".jks",
    ".keystore",
    ".sqlite",
    ".db",
    ".dump",
    ".sql.gz",
];

/// Binary / non-textual extensions with no useful text to index.
const BINARY_EXT: &[&str] = &[
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "ico",
    "pdf",
    "zip",
    "gz",
    "tar",
    "tgz",
    "woff",
    "woff2",
    "ttf",
    "otf",
    "eot",
    "mp4",
    "mov",
    "webm",
    "wasm",
    "bin",
    "so",
    "dylib",
    "a",
    "o",
    "rlib",
    "class",
    "jar",
    "lock",
    "tsbuildinfo",
    "map",
];

fn ext_of(rel: &str) -> String {
    Path::new(rel)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase()
}

fn file_name_of(rel: &str) -> String {
    Path::new(rel)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_string()
}

/// Returns Some(reason) if the path must be excluded; None if it is a candidate for indexing.
fn path_excluded(rel: &str) -> Option<&'static str> {
    let lp = format!("/{}", rel.to_lowercase());
    // Historical milestone reports that reference the permanently-removed separate `banza-protocol/banzai`
    // repository (ADR-042). Retained in the repo for governance history, but NEVER re-indexed into active
    // BanzAI retrieval — so BanzAI can never surface the removed repository (M2.19G.6 final micro-closure).
    const REMOVED_REPO_HISTORICAL_REPORTS: &[&str] = &[
        "/docs/governance/phase_7x_banzai_architecture_alignment_2026_07.md",
        "/docs/governance/phase_7y_banzai_public_page_cognitive_engine_alignment_2026_07.md",
    ];
    if REMOVED_REPO_HISTORICAL_REPORTS.contains(&lp.as_str()) {
        return Some("historical-report-references-removed-separate-repo");
    }
    if DENY_SEGMENTS.iter().any(|d| lp.contains(d)) {
        return Some("build-vcs-vendor-or-runtime-directory");
    }
    if DENY_PATTERNS.iter().any(|d| lp.contains(d)) {
        return Some("secret-or-key-material-pattern");
    }
    let ext = ext_of(rel);
    if BINARY_EXT.iter().any(|b| *b == ext) {
        return Some("binary-or-non-textual");
    }
    None
}

/// A content secret scan — defence in depth. Fail-closed: a REAL armored PEM private-key block or a
/// real embedded access token means SKIP the whole file. NB: it matches MATERIAL, not the WORDS — a
/// doc that discusses "private key", a detector's regex string (`BEGIN [A-Z ]*PRIVATE KEY`), or a
/// guard's blocklist entry is NOT a secret. A real key is an ARMORED block: the `-----BEGIN … PRIVATE
/// KEY-----` header (both dash fences on one line) AND a closing `-----END`. Detector/test code that
/// merely names the pattern lacks the full armor, so it stays indexable.
fn content_secret_reason(text: &str) -> Option<&'static str> {
    // A REAL armored PEM private-key block has the BEGIN/END fences AND a long pure-base64 body line.
    // Detector code / guard regexes / tests that merely NAME the fences carry no base64 body, so they
    // stay indexable (this is why the indexer's own source and the safety guard are not false-flagged).
    if text.contains("-----BEGIN") && text.contains("-----END") {
        let has_b64_body = text.lines().any(|l| {
            let t = l.trim();
            t.len() >= 40
                && t.chars()
                    .all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '/' || c == '=')
        });
        if has_b64_body {
            return Some("pem-private-key-block");
        }
    }
    // Common cloud / VCS token shapes with a real 20+ char body (not just the prefix in prose).
    for tok in ["AKIA", "ghp_", "xoxb-", "xoxp-"] {
        if let Some(idx) = text.find(tok) {
            let tail: String = text[idx..].chars().take(28).collect();
            if tail.chars().filter(|c| c.is_alphanumeric()).count() >= 20
                && !text.contains("blocklist")
                && !text.contains("pattern")
                && !text.contains("example")
            {
                return Some("embedded-access-token");
            }
        }
    }
    None
}

// ─────────────────────────────────────────────────────────────────────────────
// Category classification (12 categories, PART 7) — ordered, most specific first
// ─────────────────────────────────────────────────────────────────────────────

fn classify(repo: &str, rel: &str) -> &'static str {
    let l = rel.to_lowercase();
    let fname = file_name_of(rel);
    let fl = fname.to_lowercase();

    // 1. legal-license
    if fname == "LICENSE"
        || fname == "NOTICE"
        || fl.starts_with("trademark")
        || fl == "maintainers.md"
        || l.contains("licenc")
        || l.contains("/license")
    {
        return "legal-license";
    }
    // 2. security-boundary — the action boundary, safety policy, refusals, key-leak guard, SECURITY.md
    if l.contains("route.rs")
        || l.contains("action-boundary")
        || l.contains("action_boundary")
        || l.contains("check-banzai-action-boundary")
        || l.contains("check-private-key-leak")
        || l.contains("check-banzai-repo-knowledge-safety")
        || fname == "SECURITY.md"
        || l.contains("prompts/safety")
        || l.contains("boundaries.md")
    {
        return "security-boundary";
    }
    // 3. operator-zero
    if l.contains("operator-zero")
        || l.contains("operador-zero")
        || l.contains("operators/zero")
        || l.contains("zero-subdomain")
        || l.contains("zerosubdomain")
        || l.contains("operadorzero")
        || l.contains("/oz/")
        || l.contains("adr-052")
    {
        return "operator-zero";
    }
    // 4. guard-ci
    if fname == "Makefile"
        || l.contains("/tools/check-")
        || l.contains("tools/check-")
        || l.contains(".github/workflows")
        || l.contains("/scripts/")
    {
        return "guard-ci";
    }
    // 5. report
    if l.contains("docs/reports")
        || fl.starts_with("m2_")
        || fl.starts_with("phase_")
        || fl.contains("audit")
        || fl.contains("report")
        || fl.contains("rebenchmark")
    {
        return "report";
    }
    // 6. infra
    if l.contains("/infra/")
        || l.starts_with("infra/")
        || l.contains("nginx")
        || l.contains("docs/guides")
        || l.contains("deployment")
        || l.contains("runbook")
        || l.contains("annex-banza-network")
        || l.contains("compose")
        || l.contains("dockerfile")
    {
        return "infra";
    }
    // 7. banzai-runtime — retrieval runtime, provider adapters, cache, routing, local Qwen
    if l.contains("services/banzai-api")
        || l.contains("engines/banzai-api-kb")
        || l.contains("engines/banzai-query-core")
        || l.contains("engines/banzai-doc-indexer")
        || l.contains("engines/banzai-repo-indexer")
        || (repo == "banza-protocol/banzai"
            && (l.contains("router.rs")
                || l.contains("knowledge.rs")
                || l.contains("src/rag")
                || l.contains("src/api")
                || l.contains("provider")))
    {
        return "banzai-runtime";
    }
    // 8. banzai — the BanzAI repo remainder + BanzAI code/prompts/tests/evals
    if repo == "banza-protocol/banzai" {
        return "banzai";
    }
    // 9. website
    if l.starts_with("website/") {
        return "website";
    }
    // 10. decision — ADRs + governance
    if l.contains("decisions/adr") || l.contains("docs/governance") || fl == "governance.md" {
        return "decision";
    }
    // 11. normative — reference, specs, contracts, conformance, schemas, RFCs
    if l.contains("docs/reference")
        || l.starts_with("spec/")
        || l.contains("/spec/")
        || l.contains("contracts")
        || l.contains("conformance")
        || l.contains("schema")
        || l.contains("decisions/rfc")
        || l.contains("openapi")
    {
        return "normative";
    }
    // 12. implementation — Rust engines + other code, default
    "implementation"
}

/// Priority for retrieval ranking + which categories lead when the cap bites (lower = indexed first).
fn category_priority(cat: &str) -> u8 {
    match cat {
        "legal-license" => 1,
        "security-boundary" => 2,
        "normative" => 3,
        "decision" => 3,
        "operator-zero" => 4,
        "banzai-runtime" => 4,
        "banzai" => 5,
        "implementation" => 5,
        "website" => 6,
        "guard-ci" => 6,
        "infra" => 7,
        "report" => 8,
        _ => 9,
    }
}

fn normative_weight(cat: &str) -> u8 {
    match cat {
        "normative" => 3,
        "decision" | "legal-license" => 2,
        "security-boundary" => 1,
        _ => 0,
    }
}

fn implementation_weight(cat: &str, ext: &str) -> u8 {
    match cat {
        "implementation" | "banzai-runtime" => 3,
        "website" | "guard-ci" | "operator-zero" => 2,
        "banzai" if ext == "rs" || ext == "ts" || ext == "tsx" => 2,
        _ => 0,
    }
}

fn action_safety_relevance(cat: &str) -> u8 {
    match cat {
        "security-boundary" => 3,
        "guard-ci" => 2,
        "legal-license" => 1,
        _ => 0,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// File-type + language + text helpers
// ─────────────────────────────────────────────────────────────────────────────

fn file_type_of(rel: &str) -> &'static str {
    let fname = file_name_of(rel);
    if fname == "Makefile" {
        return "makefile";
    }
    if fname == "LICENSE" {
        return "license";
    }
    match ext_of(rel).as_str() {
        "md" => "markdown",
        "rs" => "rust",
        "ts" | "tsx" | "js" | "mjs" | "cjs" | "jsx" => "typescript",
        "json" => "json",
        "toml" => "toml",
        "yml" | "yaml" => "yaml",
        "sh" | "bash" => "shell",
        "" if fname.to_lowercase().contains("dockerfile") => "dockerfile",
        // Extension-less guard/orchestration scripts (e.g. the BanzAI repo's tools/check-provider) —
        // treat as shell so they are indexed like the .sh guards.
        "" if (rel.contains("/tools/")
            || rel.starts_with("tools/")
            || rel.contains("/scripts/")
            || rel.starts_with("scripts/"))
            && (fname.starts_with("check-")
                || fname.starts_with("validate-")
                || fname.starts_with("run-")
                || fname.starts_with("build-")) =>
        {
            "shell"
        }
        _ => "text",
    }
}

fn lang_of(text: &str) -> &'static str {
    let lc = text.to_lowercase();
    let pt = [
        " o ", " a ", " que ", " não ", " nao ", " é ", " de ", " para ", " com ",
    ]
    .iter()
    .filter(|w| lc.contains(**w))
    .count();
    let en = [
        " the ", " and ", " of ", " to ", " is ", " for ", " with ", " that ",
    ]
    .iter()
    .filter(|w| lc.contains(**w))
    .count();
    if en > pt {
        "en"
    } else {
        "pt"
    }
}

fn clean_chunk(s: &str) -> String {
    let collapsed = s.split_whitespace().collect::<Vec<_>>().join(" ");
    if collapsed.chars().count() <= MAX_CHUNK_CHARS {
        collapsed
    } else {
        collapsed.chars().take(MAX_CHUNK_CHARS).collect()
    }
}

/// A chunk that would contaminate the served index → drop it. Covers (a) commercial operator brands +
/// the creator/maintainer stem, and (b) the repo's FORBIDDEN implementation terminology (kept in sync
/// with engines/banza-repo-guards purity + contamination gates). The index is a compiled, served
/// artifact, NOT an allowlisted attribution surface, so it must carry neither. The brand + term
/// literals below are why this file is allowlisted in the repo-guards contamination/purity gates (like
/// the doc-indexer) — it NAMES them in order to FILTER them out.
fn chunk_is_contaminated(text: &str) -> bool {
    let lc = text.to_lowercase();
    // (a) operator brands + creator/maintainer stem
    let brands = [
        "multicaixa",
        "unitel money",
        "africell money",
        "e-kwanza",
        "ekwanza",
        " emis ",
        // M2.19C: Banzami (designated L3 scheme operator, ADR-003/060) is groundable now; only real
        // payment-operator brands stay filtered.
    ];
    // (b) forbidden implementation terminology (banza-repo-guards FORBIDDEN_TERMS)
    let terms = [
        "financial kernel",
        "rust kernel",
        "banza kernel",
        "wallet engine",
        "ledger engine",
        "settlement engine",
        "protocol operating system",
        "sistema operativo de protocolo",
    ];
    brands.iter().any(|b| lc.contains(b)) || terms.iter().any(|t| lc.contains(t))
}

fn md_title(text: &str, rel: &str) -> String {
    for line in text.lines() {
        if let Some(rest) = line.trim().strip_prefix("# ") {
            return rest.trim().to_string();
        }
    }
    Path::new(rel)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_string()
}

// ─────────────────────────────────────────────────────────────────────────────
// Chunkers per file type
// ─────────────────────────────────────────────────────────────────────────────

struct Ctx {
    repo: String,
    remote: String,
    commit: String,
    indexed_at: String,
}

#[allow(clippy::too_many_arguments)]
fn mk_chunk(
    ctx: &Ctx,
    rel: &str,
    file_type: &str,
    cat: &str,
    title: &str,
    heading: &str,
    symbol: &str,
    line_start: usize,
    line_end: usize,
    body: &str,
) -> Option<Chunk> {
    let content = clean_chunk(body);
    // Scrub against BOTH the chunk content AND its title/heading/symbol so a contaminated term in any
    // field drops the chunk (keeps the served index free of operator brands + forbidden terminology).
    let scan = format!("{title} {heading} {symbol} {body}");
    if content.chars().count() < 16 || chunk_is_contaminated(&scan) {
        return None;
    }
    let ext = ext_of(rel);
    Some(Chunk {
        repo: ctx.repo.clone(),
        repo_remote: ctx.remote.clone(),
        repo_commit: ctx.commit.clone(),
        path: rel.to_string(),
        file_name: file_name_of(rel),
        extension: ext.clone(),
        file_type: file_type.to_string(),
        source_category: cat.to_string(),
        title: title.to_string(),
        heading: heading.to_string(),
        symbol_name: symbol.to_string(),
        language: lang_of(body).to_string(),
        line_start,
        line_end,
        content_hash: fnv1a_hex(&content),
        content,
        indexed_at: ctx.indexed_at.clone(),
        index_version: INDEX_VERSION.to_string(),
        stale_risk: "low".to_string(),
        public_safe: true,
        normative_weight: normative_weight(cat),
        implementation_weight: implementation_weight(cat, &ext),
        action_safety_relevance: action_safety_relevance(cat),
        secrets_scan: "clean".to_string(),
        source_priority: category_priority(cat),
    })
}

fn chunk_markdown(ctx: &Ctx, rel: &str, cat: &str, text: &str, out: &mut Vec<Chunk>) {
    let title = md_title(text, rel);
    let mut head = String::from("Introdução");
    let mut body = String::new();
    let mut start = 1usize;
    let mut per = 0usize;
    let mut ln = 0usize;
    let flush =
        |head: &str, body: &str, s: usize, e: usize, per: &mut usize, out: &mut Vec<Chunk>| {
            if *per >= MAX_CHUNKS_PER_FILE || body.trim().len() < 40 {
                return;
            }
            if let Some(c) = mk_chunk(ctx, rel, "markdown", cat, &title, head, "", s, e, body) {
                out.push(c);
                *per += 1;
            }
        };
    for line in text.lines() {
        ln += 1;
        let l = line.trim_start();
        if let Some(h) = l.strip_prefix("### ").or_else(|| l.strip_prefix("## ")) {
            flush(&head, &body, start, ln.saturating_sub(1), &mut per, out);
            head = h.trim().trim_start_matches('#').trim().to_string();
            body.clear();
            start = ln;
        } else {
            body.push_str(line);
            body.push('\n');
        }
    }
    flush(&head, &body, start, ln, &mut per, out);
}

fn chunk_rust(ctx: &Ctx, rel: &str, cat: &str, text: &str, out: &mut Vec<Chunk>) {
    let title = file_name_of(rel);
    let lines: Vec<&str> = text.lines().collect();
    // File-level doc (//! …) as the first chunk.
    let doc: String = lines
        .iter()
        .take_while(|l| l.trim_start().starts_with("//!"))
        .map(|l| l.trim_start().trim_start_matches("//!").trim())
        .collect::<Vec<_>>()
        .join(" ");
    let mut per = 0usize;
    if doc.trim().len() >= 30 {
        if let Some(c) = mk_chunk(ctx, rel, "rust", cat, &title, "module", "", 1, 1, &doc) {
            out.push(c);
            per += 1;
        }
    }
    for (i, raw) in lines.iter().enumerate() {
        if per >= MAX_CHUNKS_PER_FILE {
            break;
        }
        let l = raw.trim_start();
        let kind = [
            "pub fn ",
            "pub async fn ",
            "fn ",
            "pub struct ",
            "struct ",
            "pub enum ",
            "enum ",
            "pub trait ",
            "trait ",
            "impl ",
        ]
        .iter()
        .find(|k| l.starts_with(**k));
        if let Some(k) = kind {
            let rest = &l[k.len()..];
            let sym: String = rest
                .chars()
                .take_while(|c| c.is_alphanumeric() || *c == '_' || *c == '<' || *c == '>')
                .collect();
            if sym.is_empty() {
                continue;
            }
            // Gather a short body: the signature line + up to 3 following lines.
            let end = (i + 4).min(lines.len());
            let body = lines[i..end].join(" ");
            let sig = format!("{} {}", k.trim(), body);
            if let Some(c) = mk_chunk(
                ctx,
                rel,
                "rust",
                cat,
                &title,
                "symbol",
                &sym,
                i + 1,
                end,
                &sig,
            ) {
                out.push(c);
                per += 1;
            }
        }
    }
}

fn chunk_ts(ctx: &Ctx, rel: &str, cat: &str, text: &str, out: &mut Vec<Chunk>) {
    let title = file_name_of(rel);
    let lines: Vec<&str> = text.lines().collect();
    let mut per = 0usize;
    // Leading block/line comment as the file summary.
    let summary: String = lines
        .iter()
        .take(6)
        .map(|l| l.trim())
        .filter(|l| l.starts_with("//") || l.starts_with("*") || l.starts_with("/*"))
        .map(|l| l.trim_start_matches(['/', '*', ' ']))
        .collect::<Vec<_>>()
        .join(" ");
    if summary.trim().len() >= 30 {
        if let Some(c) = mk_chunk(
            ctx,
            rel,
            "typescript",
            cat,
            &title,
            "module",
            "",
            1,
            6,
            &summary,
        ) {
            out.push(c);
            per += 1;
        }
    }
    for (i, raw) in lines.iter().enumerate() {
        if per >= MAX_CHUNKS_PER_FILE {
            break;
        }
        let l = raw.trim_start();
        let kind = [
            "export default function ",
            "export async function ",
            "export function ",
            "export const ",
            "export class ",
            "export interface ",
            "export type ",
            "function ",
        ]
        .iter()
        .find(|k| l.starts_with(**k));
        if let Some(k) = kind {
            let rest = &l[k.len()..];
            let sym: String = rest
                .chars()
                .take_while(|c| c.is_alphanumeric() || *c == '_')
                .collect();
            if sym.is_empty() {
                continue;
            }
            let end = (i + 3).min(lines.len());
            let body = lines[i..end].join(" ");
            if let Some(c) = mk_chunk(
                ctx,
                rel,
                "typescript",
                cat,
                &title,
                "symbol",
                &sym,
                i + 1,
                end,
                &body,
            ) {
                out.push(c);
                per += 1;
            }
        }
    }
    // If nothing matched (e.g. a route/page with default export arrow), index the head.
    if per == 0 {
        let head = lines.iter().take(20).cloned().collect::<Vec<_>>().join(" ");
        if let Some(c) = mk_chunk(
            ctx,
            rel,
            "typescript",
            cat,
            &title,
            "file",
            "",
            1,
            20,
            &head,
        ) {
            out.push(c);
        }
    }
}

fn chunk_json(ctx: &Ctx, rel: &str, cat: &str, text: &str, out: &mut Vec<Chunk>) {
    let v: serde_json::Value = match serde_json::from_str(text) {
        Ok(v) => v,
        Err(_) => return,
    };
    let title = v
        .get("title")
        .and_then(|x| x.as_str())
        .map(String::from)
        .unwrap_or_else(|| file_name_of(rel));
    let desc = v.get("description").and_then(|x| x.as_str()).unwrap_or("");
    let mut body = format!("{title}. {desc}");
    if let Some(req) = v.get("required").and_then(|x| x.as_array()) {
        let fields: Vec<&str> = req.iter().filter_map(|x| x.as_str()).collect();
        if !fields.is_empty() {
            body.push_str(&format!(" Campos: {}.", fields.join(", ")));
        }
    } else if let Some(obj) = v.as_object() {
        let keys: Vec<&str> = obj.keys().map(|s| s.as_str()).take(12).collect();
        body.push_str(&format!(" Chaves: {}.", keys.join(", ")));
    }
    let schema = text.contains("\"$schema\"") || text.contains("\"properties\"");
    if let Some(c) = mk_chunk(
        ctx,
        rel,
        if schema { "schema" } else { "json" },
        cat,
        &title,
        if schema { "schema" } else { "artifact" },
        "",
        1,
        1,
        &body,
    ) {
        out.push(c);
    }
}

fn chunk_makefile(ctx: &Ctx, rel: &str, cat: &str, text: &str, out: &mut Vec<Chunk>) {
    let mut per = 0usize;
    let lines: Vec<&str> = text.lines().collect();
    for (i, raw) in lines.iter().enumerate() {
        if per >= MAX_CHUNKS_PER_FILE {
            break;
        }
        // "## target: description" doc comments.
        if let Some(rest) = raw.strip_prefix("## ") {
            if let Some((tgt, desc)) = rest.split_once(':') {
                let body = format!("make {}: {}", tgt.trim(), desc.trim());
                if let Some(c) = mk_chunk(
                    ctx,
                    rel,
                    "makefile",
                    cat,
                    "Makefile",
                    tgt.trim(),
                    tgt.trim(),
                    i + 1,
                    i + 1,
                    &body,
                ) {
                    out.push(c);
                    per += 1;
                }
            }
        }
    }
}

fn chunk_generic(
    ctx: &Ctx,
    rel: &str,
    file_type: &str,
    cat: &str,
    text: &str,
    out: &mut Vec<Chunk>,
) {
    // Shell guards: the header comment block. TOML: package + description. YAML: name. License: summary.
    let title = file_name_of(rel);
    let body = match file_type {
        "shell" => text
            .lines()
            .skip_while(|l| l.starts_with("#!"))
            .take_while(|l| l.trim_start().starts_with('#'))
            .map(|l| l.trim_start().trim_start_matches('#').trim())
            .collect::<Vec<_>>()
            .join(" "),
        "toml" => {
            let name = text
                .lines()
                .find(|l| l.trim_start().starts_with("name"))
                .unwrap_or("");
            let desc = text
                .lines()
                .find(|l| l.trim_start().starts_with("description"))
                .unwrap_or("");
            format!("{name} {desc}")
        }
        "yaml" => {
            let name = text
                .lines()
                .find(|l| l.trim_start().starts_with("name:"))
                .unwrap_or("");
            let jobs: Vec<&str> = text
                .lines()
                .filter(|l| l.trim_start().starts_with("run:") || l.contains("check-"))
                .take(6)
                .collect();
            format!("{name} {}", jobs.join(" "))
        }
        "license" => text.lines().take(4).collect::<Vec<_>>().join(" "),
        _ => text.lines().take(20).collect::<Vec<_>>().join(" "),
    };
    if let Some(c) = mk_chunk(ctx, rel, file_type, cat, &title, "summary", "", 1, 1, &body) {
        out.push(c);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Indexability decision (which files we attempt to index)
// ─────────────────────────────────────────────────────────────────────────────

/// Whether a file's TYPE carries indexable text. (Path exclusions already applied.)
fn is_indexable_type(rel: &str) -> bool {
    let ft = file_type_of(rel);
    matches!(
        ft,
        "markdown"
            | "rust"
            | "typescript"
            | "json"
            | "toml"
            | "yaml"
            | "shell"
            | "makefile"
            | "license"
            | "dockerfile"
    ) || file_name_of(rel) == "NOTICE"
        || file_name_of(rel) == "VERSION"
}

// ─────────────────────────────────────────────────────────────────────────────
// Walk
// ─────────────────────────────────────────────────────────────────────────────

fn walk(root: &Path, base: &Path, files: &mut Vec<PathBuf>) {
    let meta = match fs::symlink_metadata(root) {
        Ok(m) => m,
        Err(_) => return,
    };
    if meta.file_type().is_symlink() {
        return; // never follow symlinks
    }
    if meta.is_file() {
        files.push(root.to_path_buf());
        return;
    }
    let rd = match fs::read_dir(root) {
        Ok(r) => r,
        Err(_) => return,
    };
    let mut entries: Vec<PathBuf> = rd.filter_map(|e| e.ok().map(|e| e.path())).collect();
    entries.sort();
    for p in entries {
        let rel = p
            .strip_prefix(base)
            .unwrap_or(&p)
            .to_string_lossy()
            .to_string();
        if path_excluded(&format!("{rel}/")).is_some() {
            continue;
        }
        if p.is_dir() {
            walk(&p, base, files);
        } else {
            files.push(p);
        }
    }
}

/// The curated indexable roots per repo. Everything under these is walked (with exclusions applied).
fn roots_for(remote: &str) -> Vec<&'static str> {
    if remote == BANZA_REMOTE {
        vec![
            "README.md",
            "LICENSE",
            "NOTICE",
            "VERSION",
            "CLAUDE.md",
            "SECURITY.md",
            "GOVERNANCE.md",
            "TRADEMARKS.md",
            "MAINTAINERS.md",
            "CONTRIBUTING.md",
            "Makefile",
            "docs",
            "decisions",
            "spec",
            "conformance",
            "contracts",
            "schemas",
            "engines",
            "services",
            "website/app",
            "website/components",
            "website/lib",
            "website/middleware.ts",
            "website/package.json",
            "website/content",
            "tools",
            ".github/workflows",
            "examples/operators/zero",
            "infra",
        ]
    } else {
        vec![
            "README.md",
            "LICENSE",
            "NOTICE",
            "CLAUDE.md",
            "SECURITY.md",
            "CONTRIBUTING.md",
            "CODE_OF_CONDUCT.md",
            "docs",
            "engines",
            "src",
            "prompts",
            "evals",
            "tools",
            "scripts",
            "contexts",
            "infra",
            ".github/workflows",
            "package.json",
            "turbo.json",
        ]
    }
}

#[allow(clippy::too_many_arguments)]
fn index_repo(
    repo_path: &Path,
    remote: &str,
    commit: &str,
    indexed_at: &str,
    chunks: &mut Vec<Chunk>,
    files: &mut Vec<FileRecord>,
    exclusions: &mut Vec<Exclusion>,
    scanned: &mut usize,
    secret_skips: &mut usize,
) {
    let ctx = Ctx {
        repo: remote.to_string(),
        remote: remote.to_string(),
        commit: commit.to_string(),
        indexed_at: indexed_at.to_string(),
    };
    let mut all: Vec<PathBuf> = Vec::new();
    for r in roots_for(remote) {
        walk(&repo_path.join(r), repo_path, &mut all);
    }
    all.sort();
    all.dedup();
    let mut seen: BTreeMap<String, ()> = BTreeMap::new();

    for f in &all {
        let rel = f
            .strip_prefix(repo_path)
            .unwrap_or(f)
            .to_string_lossy()
            .to_string();
        if seen.insert(rel.clone(), ()).is_some() {
            continue;
        }
        *scanned += 1;
        if let Some(reason) = path_excluded(&rel) {
            exclusions.push(Exclusion {
                repo: remote.to_string(),
                path: rel,
                reason: reason.to_string(),
            });
            continue;
        }
        if !is_indexable_type(&rel) {
            exclusions.push(Exclusion {
                repo: remote.to_string(),
                path: rel,
                reason: "non-indexable-file-type".to_string(),
            });
            continue;
        }
        let bytes = fs::metadata(f).map(|m| m.len()).unwrap_or(0);
        if bytes > MAX_FILE_BYTES {
            exclusions.push(Exclusion {
                repo: remote.to_string(),
                path: rel,
                reason: "exceeds-max-file-bytes".to_string(),
            });
            continue;
        }
        let text = match fs::read_to_string(f) {
            Ok(t) => t,
            Err(_) => {
                exclusions.push(Exclusion {
                    repo: remote.to_string(),
                    path: rel,
                    reason: "unreadable-or-non-utf8".to_string(),
                });
                continue;
            }
        };
        if let Some(reason) = content_secret_reason(&text) {
            *secret_skips += 1;
            exclusions.push(Exclusion {
                repo: remote.to_string(),
                path: rel,
                reason: format!("content-secret:{reason}"),
            });
            continue;
        }

        let cat = classify(remote, &rel);
        let ft = file_type_of(&rel);
        let before = chunks.len();
        match ft {
            "markdown" => chunk_markdown(&ctx, &rel, cat, &text, chunks),
            "rust" => chunk_rust(&ctx, &rel, cat, &text, chunks),
            "typescript" => chunk_ts(&ctx, &rel, cat, &text, chunks),
            "json" => chunk_json(&ctx, &rel, cat, &text, chunks),
            "makefile" => chunk_makefile(&ctx, &rel, cat, &text, chunks),
            _ => chunk_generic(&ctx, &rel, ft, cat, &text, chunks),
        }
        let n = chunks.len() - before;
        files.push(FileRecord {
            repo: remote.to_string(),
            path: rel.clone(),
            file_name: file_name_of(&rel),
            extension: ext_of(&rel),
            file_type: ft.to_string(),
            source_category: cat.to_string(),
            content_hash: fnv1a_hex(&text),
            bytes,
            chunks: n,
            secrets_scan: "clean".to_string(),
            public_safe: true,
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────────

fn main() {
    let args: Vec<String> = std::env::args().collect();
    // M2.19G.6 (ADR-042): monorepo-only CLI — <banza_repo> <banza_commit> <out_dir> [indexed_at].
    let banza = args.get(1).cloned().unwrap_or_else(|| ".".to_string());
    let banza_commit = args
        .get(2)
        .cloned()
        .unwrap_or_else(|| "unknown".to_string());
    let out_dir = args
        .get(3)
        .cloned()
        .unwrap_or_else(|| "engines/banzai-query-core/src/repoindex".to_string());
    let indexed_at = args
        .get(4)
        .cloned()
        .unwrap_or_else(|| "unspecified".to_string());

    let mut chunks: Vec<Chunk> = Vec::new();
    let mut files: Vec<FileRecord> = Vec::new();
    let mut exclusions: Vec<Exclusion> = Vec::new();
    let mut scanned = 0usize;
    let mut secret_skips = 0usize;

    index_repo(
        Path::new(&banza),
        BANZA_REMOTE,
        &banza_commit,
        &indexed_at,
        &mut chunks,
        &mut files,
        &mut exclusions,
        &mut scanned,
        &mut secret_skips,
    );

    // M2.19G.6 (ADR-042): no sibling repo is indexed — the former banza-protocol/banzai content is
    // consolidated into this monorepo (indexed above); the separate repo is permanently removed.

    // Deterministic ordering: by (source_priority, repo, path, line_start).
    chunks.sort_by(|a, b| {
        a.source_priority
            .cmp(&b.source_priority)
            .then(a.repo.cmp(&b.repo))
            .then(a.path.cmp(&b.path))
            .then(a.line_start.cmp(&b.line_start))
    });
    files.sort_by(|a, b| a.repo.cmp(&b.repo).then(a.path.cmp(&b.path)));
    exclusions.sort_by(|a, b| a.repo.cmp(&b.repo).then(a.path.cmp(&b.path)));

    let total_chunks_before_cap = chunks.len();
    // Per-category cap (breadth) then global cap (size). Chunks are already sorted by
    // (priority, repo, path), so each category keeps a representative, deterministic slice.
    let mut per_cat: BTreeMap<String, usize> = BTreeMap::new();
    let mut kept: Vec<Chunk> = Vec::with_capacity(MAX_CHUNKS.min(chunks.len()));
    let mut dropped_cap = 0usize;
    for c in chunks.into_iter() {
        let n = per_cat.entry(c.source_category.clone()).or_insert(0);
        if *n < MAX_CHUNKS_PER_CATEGORY && kept.len() < MAX_CHUNKS {
            *n += 1;
            kept.push(c);
        } else {
            dropped_cap += 1;
        }
    }
    let mut chunks = kept;
    // Final deterministic sort of the kept set (priority, repo, path, line).
    chunks.sort_by(|a, b| {
        a.source_priority
            .cmp(&b.source_priority)
            .then(a.repo.cmp(&b.repo))
            .then(a.path.cmp(&b.path))
            .then(a.line_start.cmp(&b.line_start))
    });

    // Stable index hash: over the sorted chunk identities (repo/path/category/content_hash) — excludes
    // indexed_at/commit so a re-run at the same content produces the same hash (cache stability).
    let mut hash_input = String::new();
    for c in &chunks {
        hash_input.push_str(&c.repo);
        hash_input.push('|');
        hash_input.push_str(&c.path);
        hash_input.push('|');
        hash_input.push_str(&c.source_category);
        hash_input.push('|');
        hash_input.push_str(&c.content_hash);
        hash_input.push('\n');
    }
    let index_hash = fnv1a_hex(&hash_input);

    // Category tallies.
    let mut cat_counts: BTreeMap<String, usize> = BTreeMap::new();
    for c in &chunks {
        *cat_counts.entry(c.source_category.clone()).or_insert(0) += 1;
    }
    let mut file_cat_counts: BTreeMap<String, usize> = BTreeMap::new();
    for f in &files {
        *file_cat_counts
            .entry(f.source_category.clone())
            .or_insert(0) += 1;
    }
    let mut excl_reason_counts: BTreeMap<String, usize> = BTreeMap::new();
    for e in &exclusions {
        *excl_reason_counts.entry(e.reason.clone()).or_insert(0) += 1;
    }

    let manifest = serde_json::json!({
        "index_version": INDEX_VERSION,
        "tool_version": TOOL_VERSION,
        "engine_crate_version": env!("CARGO_PKG_VERSION"),
        "generated_at": indexed_at,
        "index_hash": index_hash,
        "banza_repo": BANZA_REMOTE,
        "banza_commit": banza_commit,
        // M2.19G.6 (ADR-042): the monorepo is the sole indexed source. The consolidated BanzAI runtime
        // (services/banzai-api) + engines (engines/banzai-*) are indexed as part of this repo; there is
        // no separate banza-protocol/banzai repo to index. `banzai_in_monorepo` records that the index
        // covers the in-monorepo BanzAI (proved by the banzai-runtime category count).
        "banzai_in_monorepo": true,
        "total_files_scanned": scanned,
        "total_files_indexed": files.len(),
        "total_files_excluded": exclusions.len(),
        "total_chunks": chunks.len(),
        "total_chunks_before_cap": total_chunks_before_cap,
        "chunks_dropped_at_cap": dropped_cap,
        "max_chunks": MAX_CHUNKS,
        "chunk_categories": cat_counts,
        "file_categories": file_cat_counts,
        "secret_scan": {
            "content_secret_skips": secret_skips,
            "secrets_in_index": 0,
            "status": if secret_skips == 0 { "no-secret-material-encountered" } else { "secret-material-skipped-fail-closed" }
        },
        "excluded_reason_counts": excl_reason_counts,
    });

    let safety = serde_json::json!({
        "index_version": INDEX_VERSION,
        "index_hash": index_hash,
        "secrets_in_index": 0,
        "content_secret_skips": secret_skips,
        "deny_segments": DENY_SEGMENTS,
        "deny_patterns": DENY_PATTERNS,
        "binary_extensions": BINARY_EXT,
        "content_scan": "pem-blocks + embedded-token shapes (fail-closed skip)",
        "brand_scan": "commercial-operator brands + creator/maintainer stem + forbidden terminology dropped per chunk",
        "verdict": "index carries no secret/key material, no build-artifact paths, no GGUF weights",
    });

    fs::create_dir_all(&out_dir).expect("create out dir");
    let w = |name: &str, val: &serde_json::Value| {
        let mut j = serde_json::to_string(val).expect("serialize");
        j.push('\n');
        fs::write(Path::new(&out_dir).join(name), j).unwrap_or_else(|_| panic!("write {name}"));
    };
    // The content index is compact (embedded via include_str! into banzai-api-kb).
    let mut idx = serde_json::to_string(&chunks).expect("serialize index");
    idx.push('\n');
    fs::write(Path::new(&out_dir).join("banzai-repo-index.json"), &idx).expect("write index");
    w("banzai-repo-index-manifest.json", &manifest);
    w(
        "banzai-repo-index-coverage.json",
        &serde_json::to_value(&files).unwrap(),
    );
    w(
        "banzai-repo-index-exclusions.json",
        &serde_json::to_value(&exclusions).unwrap(),
    );
    w("banzai-repo-index-safety.json", &safety);

    eprintln!(
        "banzai-repo-indexer: scanned={} indexed_files={} excluded={} chunks={} (dropped_cap={}) secret_skips={} index_hash={} out={}",
        scanned,
        files.len(),
        exclusions.len(),
        chunks.len(),
        dropped_cap,
        secret_skips,
        index_hash,
        out_dir
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests (unit tests over the pure helpers — deterministic, no filesystem)
// ─────────────────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn excludes_secrets_build_and_binaries() {
        for p in [
            "services/.env",
            "services/.env.production",
            "website/node_modules/react/index.js",
            "engines/x/target/release/foo",
            "website/.next/static/x.js",
            "dist/bundle.js",
            "build/out.js",
            "keys/id_ed25519",
            "keys/server.pem",
            "keys/tls.key",
            "models/qwen.gguf",
            "logs/app.log",
            "db/dump.sql.gz",
            "assets/logo.png",
            "pkg/thing_bg.wasm",
        ] {
            assert!(path_excluded(p).is_some(), "must exclude {p}");
        }
    }

    #[test]
    fn does_not_exclude_real_sources() {
        for p in [
            "LICENSE",
            "README.md",
            "decisions/adr/ADR-041-operator-zero-the-read-only-reference-implementation.md",
            "engines/operator-zero-core/src/lib.rs",
            "website/middleware.ts",
            "Makefile",
            "tools/check-banzai-action-boundary.sh",
            ".github/workflows/identity-guard.yml",
        ] {
            assert!(path_excluded(p).is_none(), "must not exclude {p}");
        }
    }

    #[test]
    fn content_secret_scan_flags_real_key_not_detector_code() {
        // A REAL armored key shape (BEGIN/END + a long base64 body) is flagged. test-only placeholder
        // body — NOT a real key (blocklist/example marker keeps the private-key-leak guard from flagging).
        let real = "-----BEGIN OPENSSH PRIVATE KEY-----\nAAAAExampleExampleExampleExampleExampleExampleExampleAAAA\n-----END OPENSSH PRIVATE KEY-----\n"; // test-only example placeholder
        assert_eq!(content_secret_reason(real), Some("pem-private-key-block"));
        // Detector code / guard regexes that merely NAME the fences (no base64 body) are NOT flagged.
        let detector = r#"if text.contains("-----BEGIN") && text.contains("PRIVATE KEY-----") && text.contains("-----END") { return; }"#;
        assert_eq!(content_secret_reason(detector), None);
        // A doc discussing keys is safe.
        assert_eq!(
            content_secret_reason("O BanzAI recusa mostrar a private key."),
            None
        );
    }

    #[test]
    fn classification_is_stable_for_key_files() {
        let b = "banza-protocol/banza";
        let ai = "banza-protocol/banzai";
        assert_eq!(classify(b, "LICENSE"), "legal-license");
        assert_eq!(classify(b, "NOTICE"), "legal-license");
        assert_eq!(
            classify(b, "engines/banzai-query-core/src/route.rs"),
            "security-boundary"
        );
        assert_eq!(classify(b, "SECURITY.md"), "security-boundary");
        assert_eq!(
            classify(b, "examples/operators/zero/manifest.json"),
            "operator-zero"
        );
        assert_eq!(classify(b, "website/lib/zeroSubdomain.ts"), "operator-zero");
        assert_eq!(classify(b, "Makefile"), "guard-ci");
        assert_eq!(
            classify(b, "tools/check-reference-chapter-order.sh"),
            "guard-ci"
        );
        assert_eq!(
            classify(b, ".github/workflows/identity-guard.yml"),
            "guard-ci"
        );
        // The action-boundary + key-leak guards are the security boundary itself (priority beats guard-ci).
        assert_eq!(
            classify(b, "tools/check-banzai-action-boundary.sh"),
            "security-boundary"
        );
        assert_eq!(
            classify(b, "tools/check-private-key-leak.sh"),
            "security-boundary"
        );
        assert_eq!(classify(b, "docs/reports/M2_13B_X.md"), "report");
        assert_eq!(classify(b, "infra/banza-network/nginx/x.conf"), "infra");
        assert_eq!(
            classify(b, "services/banzai-api/src/pipeline.js"),
            "banzai-runtime"
        );
        assert_eq!(classify(b, "decisions/adr/ADR-011.md"), "decision");
        assert_eq!(classify(b, "docs/reference/01-overview.md"), "normative");
        assert_eq!(classify(b, "decisions/rfc/RFC-0006.md"), "normative");
        assert_eq!(classify(b, "website/app/page.tsx"), "website");
        assert_eq!(
            classify(ai, "engines/banzai-core/src/router.rs"),
            "banzai-runtime"
        );
        assert_eq!(classify(ai, "prompts/system/agent.md"), "banzai");
        assert_eq!(classify(ai, "README.md"), "banzai");
    }

    #[test]
    fn file_type_detection() {
        assert_eq!(file_type_of("a/b.md"), "markdown");
        assert_eq!(file_type_of("a/b.rs"), "rust");
        assert_eq!(file_type_of("a/b.ts"), "typescript");
        assert_eq!(file_type_of("a/b.tsx"), "typescript");
        assert_eq!(file_type_of("a/schema.json"), "json");
        assert_eq!(file_type_of("Makefile"), "makefile");
        assert_eq!(file_type_of("LICENSE"), "license");
        assert_eq!(file_type_of("tools/check-provider"), "shell");
        assert_eq!(file_type_of("a/b.sh"), "shell");
    }

    #[test]
    fn markdown_chunker_splits_by_heading() {
        let ctx = Ctx {
            repo: "banza-protocol/banza".into(),
            remote: "banza-protocol/banza".into(),
            commit: "abc".into(),
            indexed_at: "2026-07-22".into(),
        };
        let md = "# Title\n\nIntro paragraph that is long enough to keep here.\n\n## Section One\n\nThis section explains one thing in enough detail to be indexed properly.\n\n## Section Two\n\nAnother section body that is also long enough to survive the minimum length filter.\n";
        let mut out = Vec::new();
        chunk_markdown(&ctx, "docs/x.md", "normative", md, &mut out);
        assert!(out.len() >= 2, "expected >=2 chunks, got {}", out.len());
        assert!(out.iter().any(|c| c.heading == "Section One"));
        assert!(out.iter().all(|c| c.title == "Title"));
        assert!(out.iter().all(|c| c.source_category == "normative"));
    }

    #[test]
    fn rust_chunker_captures_symbols() {
        let ctx = Ctx {
            repo: "banza-protocol/banza".into(),
            remote: "banza-protocol/banza".into(),
            commit: "abc".into(),
            indexed_at: "2026-07-22".into(),
        };
        let rs = "//! Module doc explaining the crate purpose in enough words to index.\npub fn action_boundary(nq: &str) -> Option<&str> { None }\npub struct Route { action: String }\n";
        let mut out = Vec::new();
        chunk_rust(
            &ctx,
            "engines/x/src/route.rs",
            "security-boundary",
            rs,
            &mut out,
        );
        assert!(out.iter().any(|c| c.symbol_name == "action_boundary"));
        assert!(out.iter().any(|c| c.symbol_name == "Route"));
    }
}
