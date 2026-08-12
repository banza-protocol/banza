#!/usr/bin/env bash
# ── BANZA layer/profile naming guard ──────────────────────────────────────────────────────────────────
# Canonical naming split (converges to the Whitepaper):
#   • Institutional ARCHITECTURE layers → "Camada 1 / Camada 2 / Camada 3". The letter L is NEVER a layer.
#   • Conformance PROFILES / scope levels → "L0 / L1 / L2 / L3 / L4" (the letter L is RESERVED for these).
# The two namespaces must never collide. This guard proves it on the canonical corpus, section-scoped, so
# a §4 (architecture) layer ban can never touch the §7 (conformidade) profile ladder — same tokens, opposite
# meaning. It is intentionally context-aware: it does NOT do a blind repo-wide "\bL1\b" ban.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="$ROOT/website/content/BANZA_REFERENCIA.md"
fail=0
say() { printf '  %s %s\n' "$1" "$2"; }

# Slice a numbered chapter body: from "## N." up to the next "## " numbered heading.
slice() { awk -v n="$1" '
  $0 ~ "^##[[:space:]]+"n"\\." {f=1; next}
  f && /^##[[:space:]]+[0-9]+\./ {exit}
  f {print}
'; }

check_ref() {
  local arch prof
  arch="$(slice 4 < "$REF")"
  prof="$(slice 7 < "$REF")"

  # ── LAYER side (§4): name the three Camadas + responsibilities; NO bare L1/L2/L3 layer token. ──
  grep -qiE 'Camada 1[^.]{0,30}[Pp]rotocolo'                         <<<"$arch" || { say "✗" "§4 missing 'Camada 1 — Protocolo'"; fail=1; }
  grep -qiE 'Camada 2[^.]{0,60}[Cc]ertifica'                         <<<"$arch" || { say "✗" "§4 missing 'Camada 2 — Certificação…'"; fail=1; }
  grep -qiE 'Camada 3[^.]{0,60}[Ee]squema'                           <<<"$arch" || { say "✗" "§4 missing 'Camada 3 — Esquema(s) operacion…'"; fail=1; }
  # (fixed-string on the dash: the en-dash is multibyte and unreliable inside an ERE bracket class)
  { grep -qiF 'perfis de conformidade L0' <<<"$arch" && grep -qF 'L0–L4' <<<"$arch"; } || { say "✗" "§4 missing the camadas≠perfis (L0–L4) distinction"; fail=1; }
  # bare Ln used as a layer: L1/L2/L3 NOT part of a profile form (Ln+, L0–L4). Endpoint tiers/freshness and
  # the ladder never appear in §4, so a match here is a genuine layer-token leak.
  if grep -oE '\bL[123]\b\+?' <<<"$arch" | grep -qvE '\+$'; then
    say "✗" "§4 uses a bare L1/L2/L3 as a layer — use 'Camada N' (L is reserved for the L0–L4 profiles)"
    grep -noE '\bL[123]\b' <<<"$arch" | sed 's/^/      §4:/' >&2 || true
    fail=1
  fi

  # ── PROFILE side (§7): the letter L stays; the L0–L4 ladder + capability names must be present. ──
  local lv
  for lv in L0 L1 L2 L3 L4; do
    grep -qE "\b$lv\b" <<<"$prof" || { say "✗" "§7 missing conformance profile $lv"; fail=1; }
  done
  grep -qiE 'Capacidade de Pagamento Central'      <<<"$prof" || { say "✗" "§7 missing the L1 profile name (Capacidade de Pagamento Central)"; fail=1; }
  grep -qiE 'Capacidade de Iniciação de Pagamento' <<<"$prof" || { say "✗" "§7 missing the L2 profile name (Capacidade de Iniciação de Pagamento)"; fail=1; }
  grep -qiE 'Interoperabilidade entre Operadores'  <<<"$prof" || { say "✗" "§7 missing the L3 profile name (Interoperabilidade entre Operadores)"; fail=1; }
}

# ── self-test (proves both detectors before the real run) ──────────────────────────────────────────────
selftest() {
  local d t=0; d="$(mktemp -d)"; trap 'rm -rf "$d"' RETURN
  # must PASS: §4 named Camadas + distinction, §7 profile ladder
  cat > "$d/good.md" <<'EOF'
## 4. Arquitectura do Protocolo
| **Camada 1 — Protocolo aberto** | regras |
| **Camada 2 — Certificação de Conformidade e Interoperabilidade** | avalia |
| **Camada 3 — Esquemas operacionais independentes** | operam |
São independentes dos perfis de conformidade L0–L4.
## 5. PostgreSQL
## 7. Conformidade e Certificação
| **L0** | Sandbox | ok |
| **L1** | Capacidade de Pagamento Central | ok |
| **L2** | Capacidade de Iniciação de Pagamento | ok |
| **L3** | Interoperabilidade entre Operadores | ok |
| **L4** | Interoperabilidade Externa | ok |
## 8. Operadores
EOF
  REF="$d/good.md" fail=0; check_ref; [ "$fail" -eq 0 ] || { echo "SELFTEST_FAIL: canonical doc wrongly flagged"; t=1; }
  # must FAIL: all three Camadas + distinction present, but a stray bare 'L2' is used as a layer in §4
  # (isolates the novel bare-L detector — the presence checks all pass, only the bare-L rule fires)
  cat > "$d/bad.md" <<'EOF'
## 4. Arquitectura do Protocolo
| **Camada 1 — Protocolo aberto** | regras |
| **Camada 2 — Certificação de Conformidade e Interoperabilidade** | avalia |
| **Camada 3 — Esquemas operacionais independentes** | operam |
As camadas L2 e L3 herdam autoridade uma da outra.
São independentes dos perfis de conformidade L0–L4.
## 5. PostgreSQL
## 7. Conformidade e Certificação
| **L0** | Sandbox | ok |
| **L1** | Capacidade de Pagamento Central | ok |
| **L2** | Capacidade de Iniciação de Pagamento | ok |
| **L3** | Interoperabilidade entre Operadores | ok |
| **L4** | Interoperabilidade Externa | ok |
## 8. Operadores
EOF
  REF="$d/bad.md" fail=0; check_ref >/dev/null 2>&1; [ "$fail" -eq 1 ] || { echo "SELFTEST_FAIL: bare L2 layer not caught"; t=1; }
  return $t
}

printf '══════════════════════════════════════════════════════════════════════\n'
printf 'BANZA Layer/Profile Naming Guard — Camada 1/2/3 (arquitectura) vs L0–L4 (perfis)\n'
printf '══════════════════════════════════════════════════════════════════════\n'
if ! selftest; then echo "layer-profile-naming: guard self-test FAILED"; exit 2; fi
REF="$ROOT/website/content/BANZA_REFERENCIA.md" fail=0; check_ref
if [ "$fail" -eq 0 ]; then
  printf 'Result: ✓ the layer(Camada N)/profile(L0–L4) naming split holds in the canonical corpus\n\n'
else
  printf '\nResult: ✗ layer/profile naming violation (see above)\n\n' >&2
  exit 1
fi
