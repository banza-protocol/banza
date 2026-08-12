//! `banzai-evidence` CLI — manual testing, index stats, and CI checks for the R2 engine.
//! No network, no provider. Commands: answer, search, build-index, check, stats.

use banzai_evidence::{answer_json, index};
use std::process::exit;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let cmd = args.first().map(|s| s.as_str()).unwrap_or("help");
    match cmd {
        "answer" => {
            let q = args.get(1).cloned().unwrap_or_default();
            println!("{}", answer_json(&q));
        }
        "search" => {
            let q = args.get(1).cloned().unwrap_or_default();
            let bundle = index::shared().search(&q, 5);
            println!(
                "{}",
                serde_json::to_string_pretty(&bundle).unwrap_or_default()
            );
        }
        "build-index" => build_index(&args),
        "check" => check(),
        "stats" => stats(),
        _ => {
            eprintln!("usage: banzai-evidence <answer|search|build-index|check|stats> [query]");
            exit(2);
        }
    }
}

fn build_index(_args: &[String]) {
    let sources = index::load_corpus();
    let chunks = index::build_chunks(&sources);
    let warnings = index::validate(&sources);
    println!(
        "build-index: {} sources, {} chunks",
        sources.len(),
        chunks.len()
    );
    if warnings.is_empty() {
        println!("  ✓ all URLs allowlisted, no forbidden claim");
    } else {
        for w in &warnings {
            println!("  ⚠ {w}");
        }
    }
    if !warnings.is_empty() {
        exit(1);
    }
}

fn check() {
    let sources = index::load_corpus();
    let warnings = index::validate(&sources);
    // Also verify the intent engine never emits a link outside the allowlist.
    let mut bad_links = 0usize;
    for q in SMOKE_QUERIES {
        let a: serde_json::Value = serde_json::from_str(&answer_json(q)).unwrap_or_default();
        if let Some(links) = a.get("links").and_then(|l| l.as_array()) {
            for link in links {
                if let Some(href) = link.get("href").and_then(|h| h.as_str()) {
                    if !link_allowed(href) {
                        eprintln!("  ✗ link outside allowlist for '{q}': {href}");
                        bad_links += 1;
                    }
                }
            }
        }
    }
    if warnings.is_empty() && bad_links == 0 {
        println!("check: ✓ corpus URLs allowlisted, no forbidden claim, no rogue links");
        exit(0);
    }
    for w in &warnings {
        eprintln!("  ⚠ {w}");
    }
    exit(1);
}

fn stats() {
    let sources = index::load_corpus();
    let chunks = index::build_chunks(&sources);
    let refs = sources
        .iter()
        .filter(|s| matches!(s.source_type, index::SourceType::Reference))
        .count();
    let adrs = sources
        .iter()
        .filter(|s| matches!(s.source_type, index::SourceType::Adr))
        .count();
    let status = sources
        .iter()
        .filter(|s| matches!(s.source_type, index::SourceType::Status))
        .count();
    println!("stats:");
    println!("  sources: {}", sources.len());
    println!("  chunks:  {}", chunks.len());
    println!("  by type: reference={refs} adr={adrs} status={status}");
    println!(
        "  engine:  {} v{}",
        banzai_evidence::ENGINE,
        banzai_evidence::ENGINE_VERSION
    );
}

/// Allow internal routes: anything under the index allowlist, plus the reference/decisoes trees.
fn link_allowed(href: &str) -> bool {
    if index::ALLOWED_URLS.contains(&href) {
        return true;
    }
    href.starts_with("/referencia/") || href.starts_with("/decisoes/")
}

const SMOKE_QUERIES: &[&str] = &[
    "certifica o meu operador",
    "o que significa /operators=[]",
    "qwen esta activo",
    "explica o adr-002",
    "como funciona o brl",
    "webhook payload",
    "cotacao do dolar",
    "manifesto do operador",
    "um pass e certificado",
    "estado actual",
];
