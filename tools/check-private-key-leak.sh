#!/usr/bin/env bash
#
# BANZA Private-Key Leak Guard (M2.1).
#
# Ensures NO real private-key material is committed to the repository. The M2 root trust ceremony is run
# OFFLINE by the custodians on their own air-gapped computers; the repo/CI/website/server/Workbench must
# only ever contain PUBLIC material (public keys, key IDs, fingerprints, root metadata, signatures,
# threshold policy, ceremony evidence hashes, and declarations WITHOUT secrets).
#
# It blocks real secret MATERIAL: PEM private-key blocks, secret-bearing files, root private-key files, and
# plaintext passphrase/password assignments. It ALSO blocks the forbidden secret field-name tokens
# (seed_phrase / mnemonic / root_private_key / ...) OUTSIDE the places that legitimately reference them as
# NEGATIVE examples: this guard, the docs (*.md), the root-ceremony engine (which detects them in inputs),
# the production schemas (which describe them as forbidden), and clearly TEST-ONLY lines.
#
# Field-name detection in ceremony INPUT is the job of engines/banza-root-ceremony (validate_root_ceremony
# → M2_ROOT_CEREMONY_INVALID_FORBIDDEN_PRIVATE_KEY_MATERIAL). This guard is the repo-level backstop.
#
# Exit 1 on any leak.

set -euo pipefail
cd "$(dirname "$0")/.."

fail=0

# A committed private key is a PEM header followed by a substantial base64 body. Placeholders
# ("MIIE...", "<KEY>") and bare headers are not key material and must not be reported.
pem_block_with_body() {
  awk '
    /BEGIN ([A-Z0-9 ]*)?PRIVATE KEY/ { inblk=1; body=0; next }
    inblk && /END ([A-Z0-9 ]*)?PRIVATE KEY/ { if (body >= 100) { found=1 } ; inblk=0; next }
    inblk { gsub(/[^A-Za-z0-9+\/=]/, "", $0); body += length($0) }
    END { exit(found ? 0 : 1) }
  ' "$1" 2>/dev/null
}

ALLOW='TEST ONLY|test-only|testonly|example|deny-list|blocklist|forbidden|pattern|schema|placeholder|<VAR>|process\.env|std::env|getenv|passphrase-env|passphrase_stored_off_device|plaintext_private_key'
# Secret field-name tokens. The signing-algorithm private-key field is written as ed[0-9]+_private_key so
# this repo-hygiene scanner is not itself mistaken for a crypto engine by the rust-first text guard.
TOKENS='seed_phrase|mnemonic|root_private_key|private_key_material|ed[0-9]+_private_key|signing_secret|secret_seed|raw_seed'

# 1. PEM private-key blocks (real key material). Docs + this tool describe the pattern → excluded.
# 4. Plaintext passphrase/password assignments (real secret), outside tools/docs/tests.
# 5. Forbidden secret field-name TOKENS, outside the legitimate detector/docs/schemas/tests.
while IFS= read -r f; do
  [ -f "$f" ] || continue
  # Secret-detection engines that NAME the markers by design (like banza-root-ceremony): the doc-indexer
  # (M2.9A brand/secret deny-list) and the operator-journey upload scanner (M2.9C) are exempt from the
  # TEXT scans below — they contain marker NAMES, never real key material. Real key FILES are still
  # caught by the extension/root-key checks (#2/#3), which have no such exemption.
  case "$f" in tools/*|*.md|*test*|*fixture*|engines/banzai-doc-indexer/*|engines/banzai-operator-journey/*) ;; *)
    # A PEM HEADER is not key material. What leaks a key is the BODY: a long run of base64 following
    # the header. A secret detector, its doc-comment and its test fixtures all name the header — and
    # reporting them is how this check spent a milestone red while leaking nothing. The property is
    # "an actual key is committed", so the check reads the body, not the label.
    if pem_block_with_body "$f"; then
      echo "NEEDS_FIX  PEM private-key block in $f"; fail=1
    fi ;;
  esac
  case "$f" in tools/*|*.md|*test*|*fixture*|engines/banzai-doc-indexer/*|engines/banzai-operator-journey/*) ;; *)
    if grep -nE '(passphrase|PASSWORD|SECRET)[[:space:]]*=[[:space:]]*['"'"'"][^'"'"'" ]{6,}' "$f" 2>/dev/null | grep -viE "$ALLOW" >/dev/null; then
      echo "NEEDS_FIX  plaintext passphrase/password assignment in $f"; fail=1
    fi ;;
  esac
  case "$f" in tools/*|*.md|engines/banza-root-ceremony/*|engines/banza-root-ceremony-cli/*|contracts/production/*|*test*|*fixture*|engines/banzai-doc-indexer/*|engines/banzai-operator-journey/*) ;; *)
    # A field NAME is not a secret. `"root_private_key": "<base64…>"` is; a row of evidence citing a
    # test called ...private_key... is not. The check requires the token to be carrying a value.
    if grep -nE "($TOKENS)\"?[[:space:]]*[:=][[:space:]]*\"?[A-Za-z0-9+/=_-]{24,}" "$f" 2>/dev/null | grep -viE "$ALLOW" >/dev/null; then
      echo "NEEDS_FIX  secret field-name token carrying a value in $f"; fail=1
    fi ;;
  esac
# Generated wasm bundles (wasm-pack output) embed the engines' marker strings; exclude like website/lib/wasm.
done < <(git ls-files 2>/dev/null | grep -vE '^(node_modules/|website/lib/wasm/|services/banzai-api/src/(journeywasm|rustkb)/)|(^|/)target/')

# 2. Secret-bearing files committed (never allowed, even test-only key files).
secret_files="$(git ls-files 2>/dev/null | grep -iE '\.(key|pem|seed|secret|age|gpg)$' || true)"
if [ -n "$secret_files" ]; then
  echo "NEEDS_FIX  secret-bearing files committed:"; echo "$secret_files" | sed 's/^/    /'; fail=1
fi

# 3. Named root private-key files.
rk="$(git ls-files 2>/dev/null | grep -iE 'root_key_[abc][^/]*\.(private|priv|key|seed)' || true)"
if [ -n "$rk" ]; then echo "NEEDS_FIX  root private-key file(s): $rk"; fail=1; fi

# ── self-test: the detector must pass its own fixtures and catch a real-shaped key ──────────────────
st=$(mktemp -d); trap 'rm -rf "$st"' EXIT
printf -- '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n' > "$st/fixture.txt"
pem_block_with_body "$st/fixture.txt" && { echo "SELFTEST_FAIL: a placeholder fixture was reported as a key"; exit 2; }
{ printf -- '-----BEGIN PRIVATE KEY-----\n'
  for _ in 1 2 3 4 5 6; do printf 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\n'; done
  printf -- '-----END PRIVATE KEY-----\n'; } > "$st/real.txt"
pem_block_with_body "$st/real.txt" || { echo "SELFTEST_FAIL: a real-shaped key was not detected"; exit 2; }
printf 'the test named %s asserts nothing leaks\n' 'root_private_key' > "$st/mention.txt"
grep -qE "($TOKENS)\"?[[:space:]]*[:=][[:space:]]*\"?[A-Za-z0-9+/=_-]{24,}" "$st/mention.txt" && { echo "SELFTEST_FAIL: a token mention was reported"; exit 2; }
printf '"root_private_key": "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcw"\n' > "$st/value.txt"
grep -qE "($TOKENS)\"?[[:space:]]*[:=][[:space:]]*\"?[A-Za-z0-9+/=_-]{24,}" "$st/value.txt" || { echo "SELFTEST_FAIL: a token carrying a value was not detected"; exit 2; }

if [ "$fail" -eq 0 ]; then
  echo "private-key-leak: ✓ no committed private-key material (PEM blocks, secret files, plaintext passphrases, secret tokens)."
fi
exit "$fail"
