//! `banza-assurance` — evaluate the layered assurance gates over the property registry.
//!
//! `report`  human-readable summary: property · R²S² dimension · gate · status · evidence
//! `json`    the machine-readable report
//! `gates`   the gate model itself

use banza_assurance::*;
use std::path::PathBuf;
use std::process::exit;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let cmd = args.first().map(|s| s.as_str()).unwrap_or("report");
    let root = PathBuf::from(std::env::var("BANZA_ROOT").unwrap_or_else(|_| ".".into()));

    if cmd == "gates" {
        for (id, q) in GATES {
            println!("  {id:<6} {q}");
        }
        return;
    }

    let path = root.join("assurance/properties.json");
    let raw = std::fs::read_to_string(&path).unwrap_or_else(|e| {
        eprintln!("error: {}: {e}", path.display());
        exit(2);
    });
    let registry: Registry = serde_json::from_str(&raw).unwrap_or_else(|e| {
        eprintln!("error: assurance/properties.json: {e}");
        exit(2);
    });

    // Execution evidence, and the identity of the tree it must belong to. Evidence executed against a
    // different source is not evidence about this one.
    let source = std::process::Command::new("git")
        .args(["rev-parse", "HEAD"])
        .current_dir(&root)
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default();
    let exec: ExecutionEvidence =
        std::fs::read_to_string(root.join("assurance/execution-evidence.json"))
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .unwrap_or_default();
    if exec.source_commit != source {
        eprintln!(
            "  note: execution evidence is for {} but the tree is {} — stale results cannot prove this source",
            if exec.source_commit.is_empty() { "<none>" } else { &exec.source_commit },
            if source.is_empty() { "<unknown>" } else { &source }
        );
    }
    let report = evaluate_with_execution(&root, &registry, &exec, &source);

    if cmd == "json" {
        println!("{}", serde_json::to_string_pretty(&report).unwrap());
        exit(if report.ok { 0 } else { 1 });
    }

    // A summary that shows properties and gates, never "N checks passed": a count is an observation,
    // and the thing being reported is whether a property was actually demonstrated.
    println!("== BANZA R²S² layered assurance ==");
    for p in &report.properties {
        let failed: Vec<&str> = p
            .gates
            .iter()
            .filter(|(_, v)| v.as_str() == "FAIL")
            .map(|(k, _)| k.as_str())
            .collect();
        let mark = if p.status == "PASS" { "ok  " } else { "FAIL" };
        println!(
            "  {mark} {:<48} [{}] {:<9} {}",
            p.property_id,
            p.r2s2_dimensions.join("·"),
            p.criticality,
            if failed.is_empty() {
                "AG-0…AG-10".to_string()
            } else {
                format!("failing {}", failed.join(","))
            }
        );
        for m in &p.missing_links {
            println!("         missing: {m}");
        }
    }
    println!();
    for f in &report.findings {
        println!("  FINDING {} [{}]: {}", f.property_id, f.gate, f.detail);
    }
    let unexercised = unexercised_dimensions(&report);
    if !unexercised.is_empty() {
        println!(
            "  FINDING: R²S² dimensions with no property behind them: {:?}",
            unexercised
        );
    }
    println!();
    println!("  ── gates (closed-world: absence is never PASS) ──");
    for (g, _) in GATES {
        let v = report
            .gates
            .get(*g)
            .map(|s| s.as_str())
            .unwrap_or("NOT_RUN");
        println!("  {:<6} {}", g, v);
    }
    println!();
    println!("  properties: {:?}", report.totals);
    println!("  R²S² coverage: {:?}", report.r2s2_coverage);
    if report.ok && unexercised.is_empty() {
        println!("assurance: OK — every gate reached PASS with its required evidence present");
        exit(0);
    }
    let not_run: Vec<&String> = report
        .gates
        .iter()
        .filter(|(_, v)| v.as_str() != "PASS")
        .map(|(k, _)| k)
        .collect();
    println!(
        "assurance: NOT COMPLETE — gates not at PASS: {not_run:?}. A gate without its required evidence is NOT_RUN, never PASS."
    );
    exit(1);
}
