//! banza-certification CLI (offline). Reads a CertifyInput bundle JSON on stdin (or a file arg) and prints
//! the resulting InteroperabilityCertificationRecord JSON, or `verify <record.json>` to check a record's
//! hash reproduces. Deterministic, offline, no network. This is a thin shell over the Rust authority.

use banza_certification::*;
use serde::Deserialize;
use std::io::Read;

#[derive(Deserialize)]
struct Bundle {
    record_id: String,
    implementation: CertifiedImplementation,
    profile: InteroperabilityCertificationProfile,
    conformance: ConformanceReport,
    interoperability: InteroperabilityReport,
    trust: TrustInput,
    now: i64,
}

fn read_input(path: Option<&String>) -> String {
    match path {
        Some(p) => std::fs::read_to_string(p).expect("read input file"),
        None => {
            let mut s = String::new();
            std::io::stdin().read_to_string(&mut s).expect("read stdin");
            s
        }
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.get(1).map(String::as_str) == Some("verify") {
        let raw = read_input(args.get(2));
        let rec: InteroperabilityCertificationRecord =
            serde_json::from_str(&raw).expect("parse record");
        let ok = verify_record(&rec);
        println!(
            "{{\"verified\":{},\"status\":{}}}",
            ok,
            serde_json::to_string(&rec.status).unwrap()
        );
        std::process::exit(if ok { 0 } else { 1 });
    }

    let raw = read_input(args.get(1));
    let b: Bundle = serde_json::from_str(&raw).expect("parse CertifyInput bundle");
    let input = CertifyInput {
        record_id: b.record_id,
        implementation: b.implementation,
        profile: b.profile,
        conformance: b.conformance,
        interoperability: b.interoperability,
        trust: b.trust,
        now: b.now,
    };
    let rec = certify(&input);
    println!("{}", serde_json::to_string_pretty(&rec).unwrap());
}
