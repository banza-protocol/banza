#!/usr/bin/env bash
#
# Availability is never bought with safety.
#
# The failure this guard exists for is the most natural one in any system that has been down: someone
# adds the branch that keeps it working. Skip verification when the source is unreachable, accept the
# unsigned copy, extend the expiry until publication returns, retry with the strict checks off, add an
# emergency permissive mode "just for the incident". Each makes a system look more available and makes it
# worth less, and each is easier to add than to remove.
#
# The property: no code path in the trust engines weakens a check because something was unavailable.
#
# This is an identifier search, not a prose search. A document DESCRIBING the prohibition — "BANZA never
# extends an expiry because publication is unavailable" — must not trip it, which is why the patterns are
# written as code constructs rather than as English.
#
# Exit 1 on violation. Exit 2 if the self-test is broken.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== no-availability-bypass =="

SCOPE=(engines/banza-trust/src engines/banza-root-ceremony/src engines/banza-conformance/src engines/banza-operator-manifest/src)

check() {
  local root="$1" bad=0 pat d
  # Constructs that would let unavailability change a verdict. Each is an identifier or an assignment,
  # never a sentence.
  for pat in \
    'skip_verification' 'skip_signature' 'allow_unsigned' 'accept_unsigned' \
    'permissive_mode' 'emergency_mode' 'admin_bypass' 'bypass_verification' \
    'extend_expiry' 'expiry_grace' 'ignore_expiry' 'ignore_revocation' \
    'trust_on_failure' 'default_trust' 'assume_valid' 'fallback_trust' \
    'weaker_check' 'relaxed_verification' 'disable_check'
  do
    for d in "${SCOPE[@]}"; do
      [ -d "$root/$d" ] || continue
      if grep -rqi "$pat" "$root/$d" 2>/dev/null; then
        echo "  FAIL: an availability-driven bypass identifier appears in $d: $pat"
        bad=1
      fi
    done
  done

  # A verifier must not decide validity from whether a fetch succeeded. `banza-trust` performs no network
  # I/O at all: that separation is the property, so it is asserted rather than assumed.
  for d in "${SCOPE[@]}"; do
    [ -d "$root/$d" ] || continue
    if grep -rqE '\b(reqwest|ureq|hyper::Client|TcpStream|UdpSocket)\b' "$root/$d" 2>/dev/null; then
      echo "  FAIL: $d performs network I/O inside the validity primitive; fetching and verification must stay separate"
      bad=1
    fi
  done
  return $bad
}

selftest() {
  local d st=0 g b
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good"; b="$d/bad"
  mkdir -p "$g/engines/banza-trust/src" "$b/engines/banza-trust/src"
  # The good tree DESCRIBES the prohibition in prose and in a doc comment. It must not be flagged.
  cat > "$g/engines/banza-trust/src/lib.rs" <<'EOF'
//! An expiry is never extended because publication is unavailable, and an unsigned artifact is never
//! accepted as a fallback. There is no permissive mode and no administrator override.
pub fn verify() -> bool { true }
EOF
  cat > "$b/engines/banza-trust/src/lib.rs" <<'EOF'
pub fn verify(fetch_failed: bool) -> bool { if fetch_failed { return assume_valid(); } true }
fn assume_valid() -> bool { true }
EOF
  ( SCOPE=(engines/banza-trust/src); check "$g" >/dev/null 2>&1 ) || { echo "SELFTEST_FAIL: prose describing the prohibition was flagged" >&2; st=1; }
  ( SCOPE=(engines/banza-trust/src); check "$b" >/dev/null 2>&1 ) && { echo "SELFTEST_FAIL: an availability bypass was accepted" >&2; st=1; }
  return $st
}

if ! selftest; then echo "no-availability-bypass: guard self-test broken"; exit 2; fi
check "$PWD" || exit 1
echo "  ok: no bypass identifier, and verification performs no network I/O of its own"
echo "no-availability-bypass: OK — safety is not traded for availability"
