#!/usr/bin/env bash
#
# BANZA Estado-Protocolar Portability Guard (Ch05).
#
# The Ch05 identity audit established that PostgreSQL is the reference implementation's chosen
# persistence, NOT a normative part of the protocol. The normative concept is "Estado Protocolar"
# (protocol state), defined by its semantics; the ADR-026 data boundary (protocol state, not financial
# value) stays. This guard keeps §5 of the Reference technology-neutral:
#
#   1. §5 is titled "Estado Protocolar" (not "PostgreSQL — ...").
#   2. §5 states, explicitly, that PostgreSQL is implementation and not a conformance requirement.
#   3. PostgreSQL / pgvector appear ONLY inside the "### Implementação de referência" subsection —
#      never in the conceptual movements (so the chapter cannot read as a PostgreSQL manual).
#   4. §5 never claims that BANZA conformance depends on PostgreSQL / a specific database.
#
# This is NOT a blunt grep against the word PostgreSQL: naming PostgreSQL as the reference store, in the
# clearly-labelled implementation section, is legitimate. Exit 1 on violation; exit 2 on broken self-test.

set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL="${LC_ALL:-en_US.UTF-8}" LANG="${LANG:-en_US.UTF-8}"

REF="website/content/BANZA_REFERENCIA.md"

# Extract §5 (from "## 5. " up to the next "## 6. ").
section() { awk '/^## 5\. /{f=1} /^## 6\. /{f=0} f' "$1"; }

# The conceptual part of §5 = everything BEFORE the "### Implementação de referência" heading.
conceptual() { section "$1" | awk '/^### Implementação de referência/{f=1} !f'; }

check() {
  local ref="$1" bad=0 s5 conc
  s5="$(section "$ref")"
  conc="$(conceptual "$ref")"

  # 1. canonical title
  echo "$s5" | grep -qE '^## 5\. Estado Protocolar$' \
    || { echo "  ✗ §5 title is not 'Estado Protocolar'"; bad=1; }

  # 2. explicit implementation-not-conformance statements
  echo "$s5" | grep -qF "não é uma condição de conformidade" \
    || { echo "  ✗ §5 does not state that PostgreSQL is not a conformance requirement"; bad=1; }
  echo "$s5" | grep -qF "Nenhuma implementação BANZA é obrigada a usar PostgreSQL" \
    || { echo "  ✗ §5 does not state that no implementation is obliged to use PostgreSQL"; bad=1; }

  # 3. PostgreSQL / pgvector confined to the implementation subsection
  if echo "$conc" | grep -qiE 'postgresql|pgvector'; then
    echo "  ✗ §5 names PostgreSQL/pgvector OUTSIDE the 'Implementação de referência' subsection"; bad=1
  fi

  # 4. no conformance-depends-on-a-database claims
  if echo "$s5" | grep -qiE 'conformidade depende de (uma )?(base de dados|postgres)|requer PostgreSQL|PostgreSQL é obrigatóri|PostgreSQL é o protocolo|base de dados é o protocolo'; then
    echo "  ✗ §5 claims conformance depends on PostgreSQL / a database"; bad=1
  fi

  return $bad
}

# ── self-test ──
selftest() {
  local d st=0 g p b
  d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  g="$d/good.md"; p="$d/postgres-title.md"; b="$d/leak.md"
  cat > "$g" <<'EOF'
## 5. Estado Protocolar
O estado protocolar é estado do protocolo, não valor financeiro.
### Implementação de referência
A implementação de referência persiste em PostgreSQL (com pgvector). Isto não é uma condição de conformidade.
Nenhuma implementação BANZA é obrigada a usar PostgreSQL.
## 6. Confiança
EOF
  check "$g" >/dev/null 2>&1 || { echo "SELFTEST_FAIL good rejected"; st=1; }
  # must FAIL: title still PostgreSQL
  cat > "$p" <<'EOF'
## 5. PostgreSQL — Estado Protocolar
### Implementação de referência
não é uma condição de conformidade. Nenhuma implementação BANZA é obrigada a usar PostgreSQL.
## 6. Confiança
EOF
  check "$p" >/dev/null 2>&1 && { echo "SELFTEST_FAIL postgres-title accepted"; st=1; }
  # must FAIL: PostgreSQL leaks into the conceptual part
  cat > "$b" <<'EOF'
## 5. Estado Protocolar
O estado protocolar vive no PostgreSQL do protocolo.
### Implementação de referência
não é uma condição de conformidade. Nenhuma implementação BANZA é obrigada a usar PostgreSQL.
## 6. Confiança
EOF
  check "$b" >/dev/null 2>&1 && { echo "SELFTEST_FAIL conceptual-leak accepted"; st=1; }
  return $st
}

if ! selftest; then echo "Result: ✗ estado-protocolar portability guard self-test broken"; exit 2; fi

echo "Estado-Protocolar portability guard — §5 technology-neutral (PostgreSQL = implementation)"
if check "$REF"; then
  echo "Result: ✓ §5 keeps PostgreSQL as implementation of reference, not a conformance requirement"
else
  echo "Result: ✗ §5 presents PostgreSQL as more than implementation (see docs/reference/BANZA_SVG_REGISTRY.md, ADR-026)"
  exit 1
fi
