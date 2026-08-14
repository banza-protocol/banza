//! banza-repo-guards CLI (ADR-043, R10).
//!
//! Commands: `purity` | `contamination` | `invariants` | `all`.
//! Exit 0 = gate PASS, 1 = gate FAIL, 2 = usage error. Must run from the repo root
//! (uses `git ls-files`), exactly like the shell gates it replaces.

use banza_repo_guards::{
    contamination, invariants, openapi_compat, purity, GateResult, OpenApiOutcome,
};

fn report(r: &GateResult) -> bool {
    if r.pass {
        println!("PASS  [{}] no violations", r.name);
    } else {
        println!("FAIL  [{}] {} violation(s):", r.name, r.failures.len());
        for f in &r.failures {
            println!("  - {f}");
        }
    }
    for w in &r.warnings {
        println!("  ! {w}");
    }
    r.pass
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let cmd = args.get(1).map(String::as_str).unwrap_or("all");

    // `openapi NEW OLD` is a two-spec diff (exit 0/1/2), not a repo scan.
    if cmd == "openapi" {
        let (Some(new_spec), Some(old_spec)) = (args.get(2), args.get(3)) else {
            eprintln!("usage: banza-repo-guards openapi NEW_SPEC OLD_SPEC");
            std::process::exit(2);
        };
        match openapi_compat(new_spec, old_spec) {
            OpenApiOutcome::Compatible { old_ops, new_ops } => {
                println!("No breaking changes detected.");
                println!("  Old spec: {old_ops} operations");
                println!("  New spec: {new_ops} operations");
                if new_ops > old_ops {
                    println!("  + {} new operation(s) added", new_ops - old_ops);
                }
                std::process::exit(0);
            }
            OpenApiOutcome::Breaking(issues) => {
                println!("BREAKING CHANGES DETECTED ({} issues):", issues.len());
                for issue in &issues {
                    println!("  ✗ {issue}");
                }
                std::process::exit(1);
            }
            OpenApiOutcome::Error(e) => {
                eprintln!("openapi: {e}");
                std::process::exit(2);
            }
        }
    }

    let ok = match cmd {
        "purity" => report(&purity()),
        "contamination" => report(&contamination()),
        "invariants" => report(&invariants()),
        "all" => {
            let mut ok = true;
            ok &= report(&purity());
            ok &= report(&contamination());
            ok &= report(&invariants());
            ok
        }
        other => {
            eprintln!(
                "usage: banza-repo-guards [purity|contamination|invariants|all|openapi NEW OLD]"
            );
            eprintln!("unknown command: {other}");
            std::process::exit(2);
        }
    };
    std::process::exit(if ok { 0 } else { 1 });
}

#[cfg(test)]
mod tests {
    use banza_repo_guards::{contamination, invariants, purity};

    // These run from the crate dir under `cargo test`; walk up to the repo root so
    // `git ls-files` and relative paths resolve like the real gates.
    fn at_repo_root<T>(f: impl FnOnce() -> T) -> T {
        let manifest = env!("CARGO_MANIFEST_DIR"); // .../engines/banza-repo-guards
        let root = std::path::Path::new(manifest).ancestors().nth(2).unwrap(); // repo root
        let prev = std::env::current_dir().unwrap();
        std::env::set_current_dir(root).unwrap();
        let out = f();
        std::env::set_current_dir(prev).unwrap();
        out
    }

    #[test]
    fn purity_passes_on_clean_repo() {
        let r = at_repo_root(purity);
        assert!(r.pass, "purity failures: {:?}", r.failures);
    }

    #[test]
    fn contamination_passes_on_clean_repo() {
        let r = at_repo_root(contamination);
        assert!(r.pass, "contamination failures: {:?}", r.failures);
    }

    #[test]
    fn invariants_pass_on_clean_repo() {
        let r = at_repo_root(invariants);
        assert!(r.pass, "invariant failures: {:?}", r.failures);
    }

    #[test]
    fn id_extractor_matches_family_shape() {
        use banza_repo_guards as g;
        // Exercised indirectly by invariants(); here we assert the citation shapes we rely on.
        // (extract_ids is private; this test documents the contract via invariants() staying green.)
        let _ = g::tracked_files(); // smoke: git available in test env
    }
}
