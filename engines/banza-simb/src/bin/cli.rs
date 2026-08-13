//! `banza-simb` CLI (ADR-043, R8). A local, deterministic operator/federation simulator.
//! No network, no funds, no secrets. SimB runs in-process (library) — the conformance runner drives
//! it directly; `serve` documents that design (no ports are opened by default).

use banza_simb::*;
use std::process::exit;

fn main() {
    let a: Vec<String> = std::env::args().skip(1).collect();
    match a.first().map(|s| s.as_str()).unwrap_or("help") {
        "version" => println!("banza-simb 0.1.0 — {SIMB_MARKER}"),
        "serve" => {
            // In-process by design: no TCP port, no network. The conformance runner links banza-simb
            // as a library and drives the simulator directly (deterministic, CI-safe).
            println!(
                "{}",
                serde_json::json!({
                    "mode": "in-process-library", "network": false, "port": null,
                    "note": "SimB is an in-process deterministic simulator; the conformance runner drives it directly. No port opened.",
                    "test_only": true, "marker": SIMB_MARKER
                })
            );
        }
        "fixture" => {
            let op = SimOperator::new("SIM-A");
            println!(
                "{}",
                serde_json::json!({
                    "operator_id": op.id, "seed_wallets": {
                        "sandbox-consumer-1": op.balance("sandbox-consumer-1"),
                        "sandbox-merchant-1": op.balance("sandbox-merchant-1"),
                        "sandbox-merchant-2": op.balance("sandbox-merchant-2"),
                    }, "manifest": op.manifest(), "test_only": true
                })
            );
        }
        "scenario" | "golden" => {
            let mut op = SimOperator::new("SIM-A");
            let t = op.create_transfer("sandbox-consumer-1", "sandbox-merchant-1", 1000, "scn-1");
            let replay =
                op.create_transfer("sandbox-consumer-1", "sandbox-merchant-1", 1000, "scn-1");
            let settle = op.create_settlement("sandbox-merchant-1");
            let mut fed = Federation::new();
            let route = fed.route(5000, "fed-1");
            println!("{}", serde_json::to_string_pretty(&serde_json::json!({
                "transfer": t, "idempotent_replay": replay.idempotent_replay,
                "new_ledger_entries": t.new_entries.len(),
                "settlement": settle, "settle_identity_holds": settle.net_minor + settle.fee_minor == settle.gross_minor,
                "federation_route_ok": route.ok, "net_position": fed.net_position(),
                "test_only": true, "marker": SIMB_MARKER
            })).unwrap());
        }
        _ => {
            eprintln!("usage: banza-simb <serve|scenario|fixture|golden|version>");
            exit(2);
        }
    }
}
