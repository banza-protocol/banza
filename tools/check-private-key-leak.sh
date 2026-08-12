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
    if grep -nE 'BEGIN ([A-Z0-9 ]*)?PRIVATE KEY' "$f" 2>/dev/null | grep -viE "$ALLOW" >/dev/null; then
      echo "NEEDS_FIX  PEM private-key block in $f"; fail=1
    fi ;;
  esac
  case "$f" in tools/*|*.md|*test*|*fixture*|engines/banzai-doc-indexer/*|engines/banzai-operator-journey/*) ;; *)
    if grep -nE '(passphrase|PASSWORD|SECRET)[[:space:]]*=[[:space:]]*['"'"'"][^'"'"'" ]{6,}' "$f" 2>/dev/null | grep -viE "$ALLOW" >/dev/null; then
      echo "NEEDS_FIX  plaintext passphrase/password assignment in $f"; fail=1
    fi ;;
  esac
  case "$f" in tools/*|*.md|engines/banza-root-ceremony/*|engines/banza-root-ceremony-cli/*|contracts/production/*|*test*|*fixture*|engines/banzai-doc-indexer/*|engines/banzai-operator-journey/*) ;; *)
    if grep -nE "($TOKENS)" "$f" 2>/dev/null | grep -viE "$ALLOW" >/dev/null; then
      echo "NEEDS_FIX  forbidden secret field-name token in $f"; fail=1
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

if [ "$fail" -eq 0 ]; then
  echo "private-key-leak: ✓ no committed private-key material (PEM blocks, secret files, plaintext passphrases, secret tokens)."
fi
exit "$fail"
