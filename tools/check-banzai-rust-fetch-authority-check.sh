#!/usr/bin/env bash
#
# M2.19G.1 (ADR-068 §4.7 / Consequences) — Rust fetch authority guard (§37, invariant 24).
#
# The official artifact fetch happens in RUST (banza-artifact-fetcher, service banza-fetcher) — the
# browser never fetches official targets. banzai-api reaches the fetcher via FETCHER_URL; the browser
# only POSTs closed ids same-origin to /banzai/validate/*. The crate declares itself the ONLY component
# that reaches operator public endpoints, and the compose wires the banza-fetcher service.
#
# Exit 1 on any violation. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok: %s\n' "$1"; }
fl() { printf 'FAIL: %s\n' "$1"; fail=1; }

FCLIENT=services/banzai-api/src/fetcherClient.js
VALIDATE=services/banzai-api/src/validate.js
CLIENT=website/lib/banzaiValidateClient.ts
LIBRS=engines/banza-artifact-fetcher/src/lib.rs
COMPOSE=infra/banza-network/compose.yml

echo "== banzai-rust-fetch-authority-check (M2.19G.1 / ADR-068 §4.7) =="

# ── self-test ───────────────────────────────────────────────────────────────────────────────────────
st=0
printf '%s\n' 'FETCHER_URL || "http://banza-fetcher:8092"' | grep -q 'FETCHER_URL' || { echo "SELF-TEST BROKEN" >&2; st=1; }
[ "$st" -eq 0 ] || { echo "guard self-test FAILED"; exit 2; }

# 1. banzai-api reaches the Rust fetcher via FETCHER_URL.
if [ -f "$FCLIENT" ]; then
  grep -qE 'FETCHER_URL' "$FCLIENT" && ok "fetcher client reads FETCHER_URL" || fl "$FCLIENT must read FETCHER_URL"
  grep -qE '/fetch' "$FCLIENT"      && ok "fetcher client POSTs to /fetch"   || fl "$FCLIENT must POST to /fetch"
  grep -qE 'banza-fetcher' "$FCLIENT" && ok "fetcher client targets banza-fetcher" || fl "$FCLIENT must target banza-fetcher"
else
  fl "$FCLIENT not found"
fi
[ -f "$VALIDATE" ] && grep -qE 'createFetcherClient' "$VALIDATE" && ok "validate.js delegates fetching to the fetcher client" || fl "$VALIDATE must delegate fetch to the fetcher client"

# 2. The Rust crate declares itself the ONLY component reaching operator endpoints; the no-network engines stay no-network.
if [ -f "$LIBRS" ]; then
  grep -qiE 'only.*component.*reach' "$LIBRS" && ok "crate documents itself as the only endpoint-reaching component" || fl "$LIBRS must document the single-fetch-authority invariant"
  grep -qiE 'no-network' "$LIBRS" && ok "no-network protocol engines stay no-network" || fl "$LIBRS must state the engines stay no-network"
else
  fl "$LIBRS not found"
fi

# 3. The browser never fetches an operator origin — it only POSTs closed ids same-origin.
if [ -f "$CLIENT" ]; then
  bad=$(grep -nE 'fetch\((`|")https?://' "$CLIENT" || true)
  [ -z "$bad" ] && ok "browser client never fetches an absolute operator origin" || { fl "$CLIENT must not fetch an absolute origin:"; printf '%s\n' "$bad" | sed 's/^/      /'; }
  grep -qE '"/banzai/validate/' "$CLIENT" && ok "browser client POSTs same-origin /banzai/validate/*" || fl "$CLIENT must POST same-origin /banzai/validate/*"
  bad=$(grep -nE 'FETCHER_URL' "$CLIENT" || true)
  [ -z "$bad" ] && ok "browser client has no knowledge of FETCHER_URL" || { fl "$CLIENT must not reference FETCHER_URL:"; printf '%s\n' "$bad" | sed 's/^/      /'; }
else
  fl "$CLIENT not found"
fi

# 4. Infra wires the banza-fetcher service + FETCHER_URL.
if [ -f "$COMPOSE" ]; then
  grep -qE '^[[:space:]]*banza-fetcher:' "$COMPOSE" && ok "compose declares the banza-fetcher service" || fl "$COMPOSE must declare banza-fetcher"
  grep -qE 'FETCHER_URL' "$COMPOSE" && ok "compose wires FETCHER_URL for banzai-api" || fl "$COMPOSE must wire FETCHER_URL"
else
  fl "$COMPOSE not found"
fi

echo
if [ "$fail" -ne 0 ]; then echo "banzai-rust-fetch-authority-check: FAIL"; exit 1; fi
echo "banzai-rust-fetch-authority-check: ✓ official fetch is Rust (banza-fetcher); browser only POSTs closed ids (ADR-068 §4.7)"
