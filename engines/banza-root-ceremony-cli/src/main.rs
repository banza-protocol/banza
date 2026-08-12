//! banza-root-ceremony — OFFLINE ceremony CLI. Run ONLY on an air-gapped custodian computer.
//!
//! It never prints a private key/seed/passphrase, never writes a plaintext private key, refuses to write
//! into a Git worktree, and makes NO network/HTTP/LLM call. The M2 root establishes trust for the BANZA
//! open financial protocol; it does not authorise payments, create operators, issue licences or move funds.

use banza_root_ceremony_cli as cli;
use serde_json::Value;
use std::path::Path;
use std::process::ExitCode;

fn read(path: &str) -> Result<Value, String> {
    let s = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&s).map_err(|e| e.to_string())
}
fn arg(args: &[String], flag: &str) -> Option<String> {
    args.iter()
        .position(|a| a == flag)
        .and_then(|i| args.get(i + 1))
        .cloned()
}
fn passphrase(args: &[String]) -> String {
    // Passphrase comes from an env var (never argv, so it stays out of the process list).
    arg(args, "--passphrase-env")
        .and_then(|v| std::env::var(v).ok())
        .unwrap_or_default()
}

const HELP: &str = "\
banza-root-ceremony — OFFLINE M2 root trust ceremony CLI (2-of-3). Air-gapped use only.

USAGE:
  banza-root-ceremony <command> [flags]

COMMANDS:
  keygen        --out <dir> --passphrase-env <VAR> [--test-only]   Generate an Ed25519 keypair; write the
                private key ONLY encrypted; print the PUBLIC key + fingerprint. Refuses a Git worktree.
  sign          --meta <file> --enc <file> --passphrase-env <VAR> --key-id <id> --custodian <name>
                Sign root metadata (canonical) with an encrypted key; print a signature entry.
  verify        --input <file>                                     Verify a full ceremony input (Rust).
  fingerprint   --pubkey <b64url>                                  Print the fingerprint of a public key.
  recovery-test --enc <file> --passphrase-env <VAR> --pubkey <b64url>   TEST-ONLY recovery test.

SAFETY: never prints private keys/seeds/passphrases; never writes plaintext keys; refuses Git worktree
output; no network. The root does NOT authorise payments, create operators, issue licences or move funds.";

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let cmd = args.first().map(|s| s.as_str()).unwrap_or("help");
    match cmd {
        "keygen" => {
            let out = match arg(&args, "--out") {
                Some(o) => o,
                None => {
                    eprintln!("--out <dir> em falta");
                    return ExitCode::from(2);
                }
            };
            let test_only = args.iter().any(|a| a == "--test-only");
            match cli::keygen(Path::new(&out), &passphrase(&args), test_only) {
                Ok(k) => {
                    // PUBLIC material only.
                    println!("public_key: {}", k.public_key_b64url);
                    println!("fingerprint: {}", k.fingerprint);
                    let enc_path = format!("{out}/root-key.enc.json");
                    let pub_path = format!("{out}/root-key.pub");
                    if let Err(e) = std::fs::write(
                        &enc_path,
                        serde_json::to_string_pretty(&k.encrypted_backup).unwrap(),
                    ) {
                        eprintln!("erro ao escrever backup cifrado: {e}");
                        return ExitCode::from(1);
                    }
                    let _ = std::fs::write(&pub_path, &k.public_key_b64url);
                    println!("encrypted_backup: {enc_path}  (NUNCA em claro)");
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    eprintln!("keygen recusado: {e}");
                    ExitCode::from(1)
                }
            }
        }
        "sign" => {
            let meta = read(&arg(&args, "--meta").unwrap_or_default());
            let enc = read(&arg(&args, "--enc").unwrap_or_default());
            match (meta, enc) {
                (Ok(m), Ok(e)) => match cli::sign_metadata(
                    &m,
                    &e,
                    &passphrase(&args),
                    &arg(&args, "--key-id").unwrap_or_default(),
                    &arg(&args, "--custodian").unwrap_or_default(),
                ) {
                    Ok(sig) => {
                        println!("{}", serde_json::to_string_pretty(&sig).unwrap());
                        ExitCode::SUCCESS
                    }
                    Err(e) => {
                        eprintln!("sign recusado: {e}");
                        ExitCode::from(1)
                    }
                },
                _ => {
                    eprintln!("--meta / --enc inválidos");
                    ExitCode::from(2)
                }
            }
        }
        "verify" => match read(&arg(&args, "--input").unwrap_or_default()) {
            Ok(v) => {
                println!("{}", cli::verify_ceremony(&v));
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("--input inválido: {e}");
                ExitCode::from(2)
            }
        },
        "fingerprint" => {
            let pk = arg(&args, "--pubkey").unwrap_or_default();
            println!("{}", cli::fingerprint_of(&pk));
            ExitCode::SUCCESS
        }
        "recovery-test" => {
            let enc = read(&arg(&args, "--enc").unwrap_or_default());
            let pk = arg(&args, "--pubkey").unwrap_or_default();
            match enc {
                Ok(e) => match cli::recovery_test(&e, &passphrase(&args), &pk) {
                    Ok(true) => {
                        println!("recovery-test: PASS (TEST ONLY)");
                        ExitCode::SUCCESS
                    }
                    Ok(false) => {
                        println!("recovery-test: FAIL — public key não coincide");
                        ExitCode::from(1)
                    }
                    Err(e) => {
                        eprintln!("recovery-test recusado: {e}");
                        ExitCode::from(1)
                    }
                },
                _ => {
                    eprintln!("--enc inválido");
                    ExitCode::from(2)
                }
            }
        }
        _ => {
            println!("{HELP}");
            ExitCode::SUCCESS
        }
    }
}
