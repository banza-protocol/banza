#!/usr/bin/env bash
#
# M2.19G.1 (ADR-068 §4.7/§18–§20) — secure Rust artifact fetcher guard (§37, invariant 8).
#
# engines/banza-artifact-fetcher exists and implements the SSRF policy: HTTPS-only, private/loopback/
# link-local/unique-local/CGNAT/cloud-metadata blocks, zero redirects (redirect::Policy::none), hard
# size cap, connect+total timeout, media-type allowlist, decompression-bomb guard, TLS validation — each
# a distinct reason code in a closed enum. The service binary uses the STRICT policy.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

DIR=engines/banza-artifact-fetcher
POLICY=$DIR/src/policy.rs
FETCH=$DIR/src/fetch.rs
TYPES=$DIR/src/types.rs
BIN=$DIR/src/bin/server.rs

echo "== banzai-secure-fetcher-check (M2.19G.1 / ADR-068 §4.7/§19) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'redirect(reqwest::redirect::Policy::none())' | grep -q 'redirect::Policy::none' || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

[ -d "$DIR" ] && ok "banza-artifact-fetcher crate exists" || fl "$DIR not found"
for f in "$POLICY" "$FETCH" "$TYPES" "$BIN"; do
  [ -f "$f" ] && ok "present: $f" || fl "missing: $f"
done

# 1. SSRF policy — each block present (reason codes + logic).
need() { # label file regex
  if [ -f "$2" ] && grep -qE "$3" "$2"; then ok "$1"; else fl "missing SSRF control: $1"; fi
}
need "HTTPS-only (SchemeNotHttps / https_only)"           "$POLICY" 'SchemeNotHttps'
need "https_only client flag"                              "$FETCH"  'https_only\(true\)'
need "loopback block"                                      "$POLICY" 'LoopbackBlocked'
need "private-IP block"                                    "$POLICY" 'PrivateIpBlocked'
need "link-local block"                                    "$POLICY" 'LinkLocalBlocked'
need "unique-local block"                                  "$POLICY" 'UniqueLocalBlocked'
need "cloud-metadata block (169.254.169.254)"             "$POLICY" 'MetadataBlocked|169, 254, 169, 254'
need "userinfo forbidden"                                  "$POLICY" 'UserinfoInUrl'
need "host pin (expected_host)"                            "$POLICY" 'HostMismatch'
need "zero redirects (redirect::Policy::none)"            "$FETCH"  'redirect::Policy::none'
need "redirect refusal reason (RedirectBlocked)"          "$TYPES"  'RedirectBlocked'
need "size cap (SizeCapExceeded / max_bytes)"             "$FETCH"  'SizeCapExceeded|max_bytes'
need "timeout (connect + total)"                          "$FETCH"  'connect_timeout|timeout\('
need "media-type allowlist"                                "$FETCH"  'media_type_allowed'
need "decompression-bomb guard (content-encoding)"        "$POLICY" 'content_encoding_ok'
need "TLS error reason code"                               "$TYPES"  'TlsError'
need "no ambient proxy (.no_proxy)"                        "$FETCH"  'no_proxy\(\)'
need "closed reason-code enum"                             "$TYPES"  'enum ReasonCode'

# 2. The service binary uses the STRICT policy (never the test-only relaxations).
if [ -f "$BIN" ]; then
  grep -qE 'FetchPolicy::strict\(\)' "$BIN" && ok "service binary uses FetchPolicy::strict()" || fl "$BIN must use FetchPolicy::strict()"
  bad=$(grep -nE 'FetchPolicy::loopback_test|allow_http:[[:space:]]*true|allow_loopback:[[:space:]]*true' "$BIN" || true)
  [ -z "$bad" ] && ok "service binary does not use any test-only relaxation" || { fl "$BIN must not relax the policy:"; printf '%s\n' "$bad" | sed 's/^/      /'; }
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-secure-fetcher-check: FAIL"; exit 1; fi
echo "banzai-secure-fetcher-check: ✓ SSRF-hardened Rust fetcher present + strict (ADR-068 §4.7/§19)"
