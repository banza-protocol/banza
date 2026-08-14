//! banzai-doc-indexer (ADR-042, M2.9A) — build-time Rust indexer for the BANZA protocol documentation.
//!
//! Walks a CURATED set of documentation roots in the BANZA repo, splits markdown docs into per-section
//! chunks and JSON schemas into one summary chunk each, and emits a bounded, metadata-rich
//! `doc-index.json` (path, title, section, anchor, source_type, tags, lang, hash, chunk, schema_flag,
//! example_flag, normative_flag, operator_facing_flag). The BanzAI agent embeds this index in its Rust
//! retrieval engine (WASM) and uses it ONLY to enrich the grounded Qwen context with real doc excerpts
//! — it never changes routing, and the curated entries remain the primary grounding/fallback.
//!
//! SECURITY: only reads the curated doc roots; applies a defensive path deny-list (secrets, .env,
//! private keys, backups, logs, GGUF, node_modules, target, .git, financial/operator data) AND skips
//! any file whose content carries a private-key marker. It never reads secrets, dumps, or key material.
//! Deterministic; no network. Output is compact JSON to bound the embedded size.

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

/// One retrievable documentation chunk with its provenance + classification metadata.
#[derive(Serialize)]
struct DocChunk {
    path: String,
    title: String,
    section: String,
    anchor: String,
    source_type: String,
    tags: Vec<String>,
    lang: String,
    hash: String,
    chunk: String,
    schema_flag: bool,
    example_flag: bool,
    normative_flag: bool,
    operator_facing_flag: bool,
}

/// Hard caps that bound the embedded index (WASM size + per-query CPU).
const MAX_CHUNKS: usize = 800;
const MAX_CHUNK_CHARS: usize = 300;
/// Per-file section cap so a single doc type (e.g. 49 ADRs) cannot crowd out operator-facing docs.
const MAX_SECTIONS_PER_FILE: usize = 5;

/// Curated documentation roots, ordered OPERATOR-FIRST so the most operator-relevant docs are indexed
/// before the cap is reached. Files/dirs; dirs are walked recursively.
const ROOTS: &[&str] = &[
    "docs/reference",
    "spec",
    "conformance/README.md",
    "contracts",
    "decisions/adr",
    "decisions/rfc",
    "docs/governance",
    "CLAUDE.md",
    "README.md",
    "SECURITY.md",
];

/// Governance docs are large and mostly operational history; index only a curated protocol-reference
/// allowlist (matched by filename substring), never the PHASE/AUDIT/MATRIX/REPORT/BENCHMARK files.
const GOVERNANCE_ALLOW: &[&str] = &[
    "ANNEX-BANZA-NETWORK-INFRASTRUCTURE",
    "certification-boundary",
    "CLAUDE_BASE",
    "THREAT_MODEL",
    "RUST_FIRST_IMPLEMENTATION_POLICY",
    "BANZAI_NATIVE_PROTOCOL_AGENT",
    // The trust architecture is the public, canonical account of the Trust Root, the Key Manifest,
    // delegated keys and revocation — and it states the concrete authorization model. Without it
    // indexed, a question about the root retrieved only the key-manifest CONTRACTS and the answer had
    // to be inferred from schemas; live QA caught the model inferring "two authorities" from
    // "two signatures". A protocol's most consequential number must be retrievable, not deducible.
    "BANZA_TRUST_ARCHITECTURE",
];

/// Defensive path deny-list: never index anything whose path contains these (secrets/infra/build/vcs).
fn path_denied(p: &str) -> bool {
    let deny = [
        "/.git/",
        "/node_modules/",
        "/target/",
        "/backup",
        "/logs/",
        "/secrets/",
        ".env",
        ".pem",
        ".key",
        ".gguf",
        "id_ed25519",
        "id_rsa",
        "age.key",
        "private-key",
        "credential",
        "financial-data",
        "operator-data",
    ];
    let lp = p.to_lowercase();
    deny.iter().any(|d| lp.contains(d))
}

/// A forbidden operator brand / attribution stem in a chunk → drop that chunk. The doc-index is a
/// compiled, served artifact (NOT an allowlisted attribution surface), so it must carry no commercial
/// operator brand (multicaixa / unitel money / africell money / e-kwanza / EMIS) nor the Banzami stem,
/// even when a source doc legitimately names them (e.g. a "use-instead" table or attribution line).
fn chunk_has_forbidden_brand(text: &str) -> bool {
    let lc = text.to_lowercase();
    [
        "multicaixa",
        "unitel money",
        "africell money",
        "e-kwanza",
        "ekwanza",
        "emis",
        // M2.19C: "banzami" is no longer dropped — Banzami is the canonical designated operator of the
        // Layer-3 scheme (ADR-003/060) and MUST be groundable so BanzAI can explain the three-layer
        // architecture and the scheme. Real payment-operator brands above stay filtered.
    ]
    .iter()
    .any(|b| lc.contains(b))
}

/// A private-key marker in file content → skip the whole file (defence in depth).
fn content_has_secret(text: &str) -> bool {
    let m = [
        "BEGIN PRIVATE KEY",
        "BEGIN RSA PRIVATE KEY",
        "BEGIN OPENSSH PRIVATE KEY",
        "BEGIN EC PRIVATE KEY",
        "PRIVATE KEY-----",
    ];
    m.iter().any(|k| text.contains(k))
}

/// Stable, dependency-free content fingerprint (FNV-1a 64-bit, hex). Not cryptographic — a dedup/
/// change marker only.
fn fnv1a_hex(s: &str) -> String {
    let mut h: u64 = 0xcbf29ce484222325;
    for b in s.as_bytes() {
        h ^= *b as u64;
        h = h.wrapping_mul(0x100000001b3);
    }
    format!("{h:016x}")
}

/// GitHub-style anchor slug from a heading.
fn slug(s: &str) -> String {
    let mut out = String::new();
    let mut prev_dash = false;
    for c in s.to_lowercase().chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c);
            prev_dash = false;
        } else if c.is_whitespace() || c == '-' || c == '_' {
            if !prev_dash && !out.is_empty() {
                out.push('-');
                prev_dash = true;
            }
        }
    }
    while out.ends_with('-') {
        out.pop();
    }
    out
}

/// Collapse whitespace and truncate to the chunk budget (on a char boundary).
fn clean_chunk(s: &str) -> String {
    let collapsed = s.split_whitespace().collect::<Vec<_>>().join(" ");
    if collapsed.chars().count() <= MAX_CHUNK_CHARS {
        collapsed
    } else {
        collapsed.chars().take(MAX_CHUNK_CHARS).collect()
    }
}

fn source_type(path: &str) -> &'static str {
    if path.contains("decisions/adr") {
        "adr"
    } else if path.contains("decisions/rfc") {
        "rfc"
    } else if path.contains("spec/federation") {
        "federation-spec"
    } else if path.starts_with("spec/") || path == "spec" {
        "spec"
    } else if path.contains("contracts") {
        "contract"
    } else if path.contains("conformance") {
        "conformance"
    } else if path.contains("docs/reference") {
        "reference"
    } else if path.contains("docs/governance") {
        "governance"
    } else {
        "readme"
    }
}

/// Explanatory vs normative heuristic: specs/contracts/ADRs/RFCs define rules (normative); reference/
/// governance/readme explain (explanatory).
fn is_normative(source_type: &str) -> bool {
    matches!(
        source_type,
        "adr" | "rfc" | "spec" | "federation-spec" | "contract" | "conformance"
    )
}

fn is_operator_facing(text_lc: &str) -> bool {
    [
        "operador",
        "operator",
        "onboarding",
        "federa",
        "conformidade",
        "conformance",
        "manifest",
        "evidence",
        "evidencia",
    ]
    .iter()
    .any(|k| text_lc.contains(k))
}

fn lang_of(text: &str) -> &'static str {
    // Cheap PT vs EN heuristic on a few frequent function words.
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

/// Derive a few coarse tags from the path + text (used for scoring hints; small set).
fn tags_of(path: &str, text_lc: &str) -> Vec<String> {
    let mut t: Vec<String> = Vec::new();
    for (needle, tag) in [
        ("federa", "federation"),
        ("trust", "trust"),
        ("conformance", "conformance"),
        ("conformidade", "conformance"),
        ("manifest", "manifest"),
        ("revoc", "revocation"),
        ("evidence", "evidence"),
        ("evidencia", "evidence"),
        ("ledger", "ledger"),
        ("invariant", "invariants"),
        ("qr", "qr"),
        ("onboard", "onboarding"),
        ("wallet", "wallet"),
        ("carteira", "wallet"),
    ] {
        if (text_lc.contains(needle) || path.to_lowercase().contains(needle))
            && !t.iter().any(|x| x == tag)
        {
            t.push(tag.to_string());
        }
    }
    t
}

/// Extract the H1 title of a markdown doc (first `# ` line), else the file stem.
fn md_title(text: &str, path: &Path) -> String {
    for line in text.lines() {
        let l = line.trim();
        if let Some(rest) = l.strip_prefix("# ") {
            return rest.trim().to_string();
        }
    }
    path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_string()
}

/// Split a markdown doc into (heading, body) sections at `## ` / `### ` boundaries. The pre-heading
/// preamble is the "Introdução" section.
fn md_sections(text: &str) -> Vec<(String, String)> {
    let mut out: Vec<(String, String)> = Vec::new();
    let mut cur_head = String::from("Introdução");
    let mut cur_body = String::new();
    for line in text.lines() {
        let l = line.trim_start();
        if let Some(h) = l.strip_prefix("### ").or_else(|| l.strip_prefix("## ")) {
            if !cur_body.trim().is_empty() {
                out.push((cur_head.clone(), cur_body.clone()));
            }
            cur_head = h.trim().trim_start_matches('#').trim().to_string();
            cur_body.clear();
        } else {
            cur_body.push_str(line);
            cur_body.push('\n');
        }
    }
    if !cur_body.trim().is_empty() {
        out.push((cur_head, cur_body));
    }
    out
}

fn index_markdown(rel: &str, text: &str, out: &mut Vec<DocChunk>) {
    let title = md_title(text, Path::new(rel));
    let st = source_type(rel).to_string();
    let mut per_file = 0usize;
    for (head, body) in md_sections(text) {
        if per_file >= MAX_SECTIONS_PER_FILE {
            break; // per-file cap so no single doc type crowds out the operator-facing docs
        }
        let body_trim = body.trim();
        if body_trim.len() < 40 {
            continue; // skip tiny/empty sections
        }
        let chunk = clean_chunk(body_trim);
        if chunk.is_empty() || chunk_has_forbidden_brand(&chunk) {
            continue;
        }
        per_file += 1;
        let text_lc = format!("{} {} {}", title, head, chunk).to_lowercase();
        out.push(DocChunk {
            path: rel.to_string(),
            title: title.clone(),
            section: head.clone(),
            anchor: slug(&head),
            source_type: st.clone(),
            tags: tags_of(rel, &text_lc),
            lang: lang_of(body_trim).to_string(),
            hash: fnv1a_hex(&chunk),
            chunk,
            schema_flag: false,
            example_flag: body.contains("```"),
            normative_flag: is_normative(&st),
            operator_facing_flag: is_operator_facing(&text_lc),
        });
    }
}

fn index_json_schema(rel: &str, text: &str, out: &mut Vec<DocChunk>) {
    let v: serde_json::Value = match serde_json::from_str(text) {
        Ok(v) => v,
        Err(_) => return,
    };
    let title = v
        .get("title")
        .and_then(|x| x.as_str())
        .unwrap_or_else(|| {
            Path::new(rel)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("schema")
        })
        .to_string();
    let desc = v
        .get("description")
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string();
    let required: Vec<String> = v
        .get("required")
        .and_then(|x| x.as_array())
        .map(|a| {
            a.iter()
                .filter_map(|x| x.as_str())
                .map(String::from)
                .collect()
        })
        .unwrap_or_default();
    let mut body = format!("{title}. {desc}");
    if !required.is_empty() {
        body.push_str(&format!(" Campos obrigatórios: {}.", required.join(", ")));
    }
    let chunk = clean_chunk(&body);
    if chunk.len() < 20 || chunk_has_forbidden_brand(&chunk) {
        return;
    }
    let st = source_type(rel).to_string();
    let text_lc = format!("{title} {chunk}").to_lowercase();
    out.push(DocChunk {
        path: rel.to_string(),
        title: title.clone(),
        section: "schema".to_string(),
        anchor: "schema".to_string(),
        source_type: st.clone(),
        tags: tags_of(rel, &text_lc),
        lang: "en".to_string(),
        hash: fnv1a_hex(&chunk),
        chunk,
        schema_flag: true,
        example_flag: false,
        normative_flag: true,
        operator_facing_flag: is_operator_facing(&text_lc),
    });
}

fn should_index_file(rel: &str) -> bool {
    if path_denied(rel) {
        return false;
    }
    let fname = Path::new(rel)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    // Governance: only the curated protocol-reference allowlist (no PHASE/AUDIT/MATRIX/REPORT files).
    if rel.contains("docs/governance") && !GOVERNANCE_ALLOW.iter().any(|a| fname.contains(a)) {
        return false;
    }
    let lower = rel.to_lowercase();
    lower.ends_with(".md")
        || lower.ends_with(".schema.json")
        || (rel.contains("contracts/federation") && lower.ends_with(".json"))
}

fn walk(root: &Path, base: &Path, files: &mut Vec<PathBuf>) {
    let meta = match fs::metadata(root) {
        Ok(m) => m,
        Err(_) => return,
    };
    if meta.is_file() {
        files.push(root.to_path_buf());
        return;
    }
    let rd = match fs::read_dir(root) {
        Ok(r) => r,
        Err(_) => return,
    };
    let mut entries: Vec<PathBuf> = rd.filter_map(|e| e.ok().map(|e| e.path())).collect();
    entries.sort(); // deterministic order
    for p in entries {
        let rel = p
            .strip_prefix(base)
            .unwrap_or(&p)
            .to_string_lossy()
            .to_string();
        if path_denied(&format!("/{rel}/")) {
            continue;
        }
        if p.is_dir() {
            walk(&p, base, files);
        } else {
            files.push(p);
        }
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let repo = args.get(1).cloned().unwrap_or_else(|| ".".to_string());
    let out_path = args
        .get(2)
        .cloned()
        .unwrap_or_else(|| "engines/banzai-query-core/src/doc-index.json".to_string());
    let base = Path::new(&repo);

    let mut files: Vec<PathBuf> = Vec::new();
    for r in ROOTS {
        walk(&base.join(r), base, &mut files);
    }
    files.sort();
    files.dedup();

    let mut chunks: Vec<DocChunk> = Vec::new();
    let mut dropped_cap = 0usize;
    for f in &files {
        let rel = f
            .strip_prefix(base)
            .unwrap_or(f)
            .to_string_lossy()
            .to_string();
        if !should_index_file(&rel) {
            continue;
        }
        let text = match fs::read_to_string(f) {
            Ok(t) => t,
            Err(_) => continue,
        };
        if content_has_secret(&text) {
            eprintln!("SKIP (secret marker): {rel}");
            continue;
        }
        let before = chunks.len();
        if rel.to_lowercase().ends_with(".json") {
            index_json_schema(&rel, &text, &mut chunks);
        } else {
            index_markdown(&rel, &text, &mut chunks);
        }
        if chunks.len() > MAX_CHUNKS {
            dropped_cap += chunks.len() - MAX_CHUNKS;
            chunks.truncate(MAX_CHUNKS);
            let _ = before;
            break;
        }
    }

    // Compact JSON to bound the embedded size (this index is include_str!'d into the WASM engine).
    let mut json = serde_json::to_string(&chunks).expect("serialize doc-index");
    json.push('\n');
    fs::write(&out_path, &json).expect("write doc-index.json");

    eprintln!(
        "banzai-doc-indexer: {} files scanned, {} chunks written to {} ({} bytes){}",
        files.len(),
        chunks.len(),
        out_path,
        json.len(),
        if dropped_cap > 0 {
            format!("; CAPPED — {dropped_cap} chunks dropped at MAX_CHUNKS={MAX_CHUNKS}")
        } else {
            String::new()
        }
    );
}
