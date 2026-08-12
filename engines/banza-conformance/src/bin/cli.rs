//! `banza-conformance-rs` CLI (ADR-037, R4). Deterministic; no network by default; no crypto.
//! Commands: run, run-fed, check-vectors, report, parity, fixture, version.
//! PASS is technical conformance evidence, never production certification.

use banza_conformance::*;
use std::process::exit;

/// Golden parity summary (committed). `parity` compares the live summary to this.
const GOLDEN_PARITY: &str = include_str!("../../golden/parity-summary.json");

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let cmd = args.first().map(|s| s.as_str()).unwrap_or("help");
    match cmd {
        "check-vectors" => {
            let val = validate_vectors().unwrap_or_else(die);
            println!("{}", serde_json::to_string_pretty(&val).unwrap());
            let failed = val
                .invariant_results
                .iter()
                .filter(|r| matches!(r.status, Status::Fail))
                .count();
            eprintln!(
                "check-vectors: {} vectors, {} invariant checks, {} warnings, ok={}",
                val.total,
                val.invariant_results.len(),
                val.warnings.len(),
                val.ok
            );
            exit(if val.ok && failed == 0 { 0 } else { 1 });
        }
        "run" => {
            // Offline base run: vector-integrity report. A live-operator run is NOT_YET_PORTED.
            if args.iter().any(|a| a == "--url") {
                eprintln!("run --url: live-operator execution is NOT_YET_PORTED in R4 (needs a running operator). Offline vector-integrity report follows.");
            }
            let report = offline_report().unwrap_or_else(die);
            println!("{}", serde_json::to_string_pretty(&report).unwrap());
            exit(if report.totals.fail == 0 && report.totals.error == 0 {
                0
            } else {
                1
            });
        }
        "run-live" | "run-against-simb" => {
            // R8: live-operator conformance against the Rust SimB simulator (no operator, no network).
            let r = live::run_live();
            println!("{}", serde_json::to_string_pretty(&r).unwrap());
            exit(if r.totals.fail == 0 && r.totals.error == 0 {
                0
            } else {
                1
            });
        }
        "run-fed" => {
            // R8: federation conformance against two SimB peers + banza-trust verification.
            let r = live::run_fed();
            println!("{}", serde_json::to_string_pretty(&r).unwrap());
            exit(if r.totals.fail == 0 && r.totals.error == 0 {
                0
            } else {
                1
            });
        }
        "run-fed-fixtures" => {
            // Track C: execute the committed conformance/fixtures/federation/*.json vectors.
            let out = banza_conformance::federation_fixtures::run_fed_fixtures();
            println!("{}", serde_json::to_string_pretty(&out).unwrap());
            let t = &out["report"]["totals"];
            let clean_drift = out["drift"]["clean"].as_bool().unwrap_or(false);
            let ok = t["fail"].as_u64() == Some(0) && t["error"].as_u64() == Some(0) && clean_drift;
            exit(if ok { 0 } else { 1 });
        }
        "run-ab" => {
            // Track D: the consolidated A→B multi-operator scenario, executed end-to-end + replay.
            let out = banza_conformance::federation_ab::run_ab_scenario();
            println!("{}", serde_json::to_string_pretty(&out).unwrap());
            exit(if out["pass"].as_bool().unwrap_or(false) {
                0
            } else {
                1
            });
        }
        "e2e" => {
            let live_r = live::run_live();
            let fed_r = live::run_fed();
            let ok = live_r.totals.fail == 0
                && live_r.totals.error == 0
                && fed_r.totals.fail == 0
                && fed_r.totals.error == 0;
            println!(
                "{}",
                serde_json::to_string_pretty(&serde_json::json!({
                    "live": live_r.totals, "federation": fed_r.totals, "ok": ok,
                    "certification_disclaimer": CERTIFICATION_DISCLAIMER
                }))
                .unwrap()
            );
            exit(if ok { 0 } else { 1 });
        }
        "report" => {
            let json = match args.get(1) {
                Some(path) if !path.starts_with("--") => std::fs::read_to_string(path)
                    .unwrap_or_else(|e| die(format!("read {path}: {e}"))),
                _ => serde_json::to_string(&offline_report().unwrap_or_else(die)).unwrap(),
            };
            match validate_report(&json) {
                Ok(()) => {
                    println!("report: ✓ valid schema + certification disclaimer present");
                    exit(0);
                }
                Err(e) => die(e),
            }
        }
        "parity" => {
            let summary = parity_summary().unwrap_or_else(die);
            if args.iter().any(|a| a == "--emit") {
                println!("{}", serde_json::to_string_pretty(&summary).unwrap());
                exit(0);
            }
            let golden: serde_json::Value = serde_json::from_str(GOLDEN_PARITY)
                .unwrap_or_else(|e| die(format!("golden parse: {e}")));
            if summary == golden {
                println!(
                    "parity: ✓ Rust summary matches golden ({} vectors)",
                    summary
                        .get("total_vectors")
                        .and_then(|x| x.as_u64())
                        .unwrap_or(0)
                );
                exit(0);
            } else {
                eprintln!("parity: ✗ MISMATCH vs golden");
                eprintln!("  live:   {}", serde_json::to_string(&summary).unwrap());
                eprintln!("  golden: {}", serde_json::to_string(&golden).unwrap());
                exit(1);
            }
        }
        "fixture" => {
            let all = load_all_vectors().unwrap_or_else(die);
            println!("fixture (offline, embedded vectors):");
            for (name, vs) in &all {
                println!("  {name}: {} vectors", vs.len());
            }
            exit(0);
        }
        "version" => {
            println!("{RUNNER} {RUNNER_VERSION} (protocol {PROTOCOL_VERSION})");
            exit(0);
        }
        _ => {
            eprintln!("usage: banza-conformance-rs <run|run-live|run-fed|run-fed-fixtures|run-ab|e2e|check-vectors|report|parity|fixture|version>");
            exit(2);
        }
    }
}

fn die<T>(msg: impl std::fmt::Display) -> T {
    eprintln!("error: {msg}");
    exit(2);
}
