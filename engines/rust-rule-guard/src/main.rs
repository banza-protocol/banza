//! `rust-rule-guard` — enforce ADR-043 (Rust-first for official engines).
//!
//! Usage:
//!   rust-rule-guard check [--root DIR] [--allowlist PATH] [--files a b c] [--quiet]
//!
//! Exit 0 if no new non-Rust engine is found; exit 1 if any file is BLOCKED.

use rust_rule_guard::{load_allowlist, scan, Verdict};
use std::collections::BTreeSet;
use std::path::PathBuf;
use std::process::exit;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.first().map(|s| s.as_str()) != Some("check") {
        eprintln!(
            "usage: rust-rule-guard check [--root DIR] [--allowlist PATH] [--files ...] [--quiet]"
        );
        exit(2);
    }

    let mut root = PathBuf::from(".");
    let mut allowlist_path = PathBuf::from("docs/governance/rust-first-legacy-allowlist.json");
    let mut files: Vec<String> = Vec::new();
    let mut quiet = false;

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--root" => {
                i += 1;
                root = PathBuf::from(&args[i]);
            }
            "--allowlist" => {
                i += 1;
                allowlist_path = PathBuf::from(&args[i]);
            }
            "--quiet" => quiet = true,
            "--files" => {
                i += 1;
                while i < args.len() && !args[i].starts_with("--") {
                    files.push(args[i].clone());
                    i += 1;
                }
                continue;
            }
            other => {
                eprintln!("unknown arg: {other}");
                exit(2);
            }
        }
        i += 1;
    }

    let allow: BTreeSet<String> = if allowlist_path.exists() {
        match load_allowlist(&allowlist_path) {
            Ok(a) => a,
            Err(e) => {
                eprintln!("allowlist error: {e}");
                exit(2);
            }
        }
    } else {
        eprintln!(
            "warning: allowlist not found at {} — treating as empty",
            allowlist_path.display()
        );
        BTreeSet::new()
    };

    let report = scan(&root, &files, &allow);
    let blocked = report.blocked();
    let legacy = report.legacy_pending();
    let tests = report.tests_allowed();

    if !quiet {
        println!(
            "rust-rule-guard (ADR-043) — scanned {} code files",
            report.scanned
        );
        println!("  allowlist entries loaded: {}", allow.len());
        println!("  legacy engines pending migration: {}", legacy.len());
        for f in &legacy {
            println!("    · {}  [{}]", f.path, f.verdict.label());
        }
        let ui: Vec<_> = report
            .files
            .iter()
            .filter(|f| f.verdict == Verdict::UiAllowed)
            .collect();
        if !ui.is_empty() {
            println!("  UI surfaces referencing engines (allowed): {}", ui.len());
        }
        if !tests.is_empty() {
            println!("  test files exercising engines (allowed): {}", tests.len());
            for f in &tests {
                println!("    · {}  [{}]", f.path, f.verdict.label());
            }
        }
    }

    if blocked.is_empty() {
        if legacy.is_empty() {
            println!("\n✓ PASS — no new non-Rust engine; zero legacy pending migration.");
        } else {
            println!(
                "\n✓ PASS — no new non-Rust engine. {} legacy pending (allowlisted).",
                legacy.len()
            );
        }
        exit(0);
    } else {
        println!(
            "\n✗ FAIL — {} new non-Rust engine(s) blocked by ADR-043:",
            blocked.len()
        );
        for f in &blocked {
            println!("  ✗ {}", f.path);
            println!("      markers: {}", f.markers.join(", "));
            println!("      {}", f.note);
        }
        println!("\nPort the file to Rust, or (if it is genuinely UI/glue) add a justified");
        println!("entry to docs/governance/rust-first-legacy-allowlist.json.");
        exit(1);
    }
}
