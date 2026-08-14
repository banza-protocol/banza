#!/usr/bin/env bash
#
# BANZA PostgreSQL Data-Boundary Guard (M2.7K).
#
# The BANZA PostgreSQL is a verifiable protocol-state store, not a financial database. Per ADR-026 it
# stores signed public artifacts, the BanzAI document index, an audit log and pre-production state
# markers — never funds, balances, real payment transactions, bank accounts, cards, KYC/AML data,
# personal data of end users, or private keys/secrets.
#
# This guard reads the committed schema (infra/banza-network/postgres/init/*.sql) and reports any
# forbidden financial, personal-data or secret column/table identifier. Comment lines (which enumerate
# the boundary — "NO wallet/ledger/balance/account/KYC") are removed before matching, so declaring what
# is NOT stored is allowed; only real schema structure is inspected. Public-artifact identifiers
# (public_key, fingerprint, issuer_keys, signed metadata, report_sha256 evidence hashes) are not
# forbidden and pass cleanly.
#
# Exit 1 on any forbidden identifier. Exit 2 if the guard's own self-test is broken.

set -euo pipefail
cd "$(dirname "$0")/.."

# Schema files in scope: the committed init SQL (the single source of truth). Generated deploy files
# (002_roles.sql, produced from .env) are never committed, so git-tracked files only. Test SQL, if any,
# is out of scope.
SCHEMA_GLOB='infra/banza-network/postgres/init/*.sql'

# Forbidden identifiers, as ONE case-insensitive alternation. Core tokens are enough: "balance" already
# catches "balances" and "wallet_balance". Word edges keep short tokens (iban, pan, cvv, env) precise.
FORBIDDEN_RE='(balance|\bfunds?\b|\bmoney\b|\bwallet\b|\bledger\b|payment_transaction|\btransactions\b|settlement|\biban\b|bank_account|card_number|\bpan\b|\bcvv\b|\bkyc|aml_customer|customer_pii|private_key|secret_key|seed_phrase|mnemonic|root_private|custodian_secret|\bpassword\b|\btoken\b|\.env\b)'

# Remove SQL line comments so boundary-declaring comments do not trip the scan; real DDL/DML stays.
strip_sql_comments() { sed 's/--.*$//'; }

# Run one line (or file stream) through the SAME path the real scan uses: strip comments, then match.
scan_stream() { strip_sql_comments | grep -inEI "$FORBIDDEN_RE" || true; }

# ── Self-test: exercise the real detection path on every run. A broken regex exits 2, never passes
#    silently. Each probe MUST or MUST NOT be reported. ──
st_fail=0
probe() { printf '%s\n' "$1" | scan_stream; }
must_report() { # <label> <line>
  [ -n "$(probe "$2")" ] || { echo "SELFTEST_FAIL not reported: $1"; st_fail=1; }
}
must_allow() {  # <label> <line>
  [ -z "$(probe "$2")" ] || { echo "SELFTEST_FAIL wrongly reported: $1"; st_fail=1; }
}

# MUST report — forbidden financial / personal-data / secret identifiers as real schema.
must_report "balance column"          '  balance bigint NOT NULL,'
must_report "wallet_balance column"   '  wallet_balance numeric,'
must_report "wallet table"            'CREATE TABLE wallet (id bigserial);'
must_report "payment_transaction"     'CREATE TABLE payment_transaction (id bigserial);'
must_report "transactions table"      'CREATE TABLE transactions (id bigserial);'
must_report "settlement column"       '  settlement_amount bigint,'
must_report "iban column"             '  iban text,'
must_report "card_number column"      '  card_number text,'
must_report "cvv column"              '  cvv text,'
must_report "kyc column"              '  kyc_status text,'
must_report "customer_pii column"     '  customer_pii jsonb,'
must_report "private_key column"      '  private_key bytea,'
must_report "seed_phrase column"      '  seed_phrase text,'
must_report "password column"         '  password text,'
must_report "token column"            '  token text,'
must_report "dotenv literal"          "  cfg text := '.env';"

# MUST allow — boundary-declaring comments, and legitimate public-artifact identifiers.
must_allow "boundary comment (NO wallet/ledger/balance/KYC)" '-- NO wallet/ledger/balance/account/KYC. NO private keys.'
must_allow "inline comment after DDL"  '  issuer_keys jsonb NOT NULL,               -- PUBLIC issuer keys only'
must_allow "public_key identifier"     '  public_key text NOT NULL,'
must_allow "fingerprint identifier"    '  fingerprint text,'
must_allow "issuer_keys identifier"    '  issuer_keys jsonb NOT NULL,'
must_allow "report_sha256 evidence hash" '  report_sha256 text NOT NULL,'
must_allow "key_manifest table name"   'CREATE TABLE key_manifest (id int PRIMARY KEY);'

[ "$st_fail" -eq 0 ] || { echo "postgres-data-boundary: guard self-test FAILED"; exit 2; }

# ── Real scan over the committed schema ──
fail=0
scanned=0
for f in $(git ls-files $SCHEMA_GLOB 2>/dev/null | grep -viE '(^|/)[^/]*test[^/]*\.sql$' || true); do
  scanned=$((scanned + 1))
  hits="$(strip_sql_comments < "$f" | grep -inEI "$FORBIDDEN_RE" | sed "s|^|$f:|" || true)"
  if [ -n "$hits" ]; then
    echo "NEEDS_FIX  forbidden financial/personal/secret identifier in protocol schema (ADR-026 — the BANZA database stores protocol state, not financial value):"
    echo "$hits" | sed 's/^/    /'
    fail=1
  fi
done

if [ "$scanned" -eq 0 ]; then
  echo "postgres-data-boundary: no committed schema files matched $SCHEMA_GLOB"; exit 2
fi

if [ "$fail" -eq 0 ]; then
  echo "postgres-data-boundary: ✓ $scanned schema file(s) clean — no funds/balances/transactions/IBAN/cards/KYC/PII/private-key/secret identifiers."
fi
exit "$fail"
