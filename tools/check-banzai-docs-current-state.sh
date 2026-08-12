#!/usr/bin/env bash
# make banzai-docs-current-state-check — M2.9D guard (ADR-041/044-051).
#
# Keeps the CURRENT public documentation surface honest about the deployed BanzAI reality (local Qwen,
# unified /banzai interface, Qwen-first routing, non-normative, pre-production). It fails if a current
# doc reintroduces a stale/false claim. Historical governance records (ADR/RFC snapshots) and phase
# reports are DELIBERATELY out of scope — the past is not rewritten.
#
# Scope (current public docs): README.md, docs/banzai/*.md, docs/reference/{pt,en}/*.md,
# website/content/BANZA_REFERENCIA.md. NOT scanned: website/content/decisions/** (ADR/RFC snapshots),
# docs/governance/** (reports), tests/fixtures/guards, code comments.
#
# Self-testing: exits 2 if its own detectors regress; 1 on a real finding; 0 clean.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"
FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok()   { echo "  ok: $*"; }

# The current-public documentation files (existing ones only).
FILES=()
for f in README.md website/content/BANZA_REFERENCIA.md; do [ -f "$f" ] && FILES+=("$f"); done
for d in docs/banzai docs/reference/pt docs/reference/en; do
  while IFS= read -r f; do FILES+=("$f"); done < <(find "$d" -maxdepth 1 -name '*.md' 2>/dev/null)
done

# ── Testable detector (self-tested) ──────────────────────────────────────────
# A stale/false CURRENT-state claim. Terms chosen to avoid legitimate negated boundary copy:
#   - "não certifica" / "nunca certifica" (BanzAI) is CORRECT and must NOT match → we match only the
#     affirmative "BanzAI certifica/aprova/licencia" without a "não/nunca/never" immediately before.
# Always-stale terms — never legitimate in a current public doc.
stale_claim() {   # reads text on stdin
  grep -inE \
    'mock provider|provider mock|modo demonstra(ç|c)[aã]o|llm_calls ?= ?0|Qwen preview|local_qwen[^.]*not activated|default blocked|\bBANZA CA\b|certificate authority|operador certificado|certificado de operador' \
  ;
}
# Affirmative claims that BANZA is a financial actor, or that BanzAI has authority — real violations.
# Negations (não/nunca/never) and FAQ questions (…?) are legitimate boundary copy and are filtered out.
affirmative_violation() {   # reads text on stdin
  grep -inE 'BanzAI (certifica|aprova|licencia|autoriza|aceita) |BANZA (processa|movimenta|guarda|detém|liquida) [^.?]*(pagamento|fundo|saldo|dinheiro)' \
    | grep -viE 'n[aã]o |nunca |never |\?'
}

selftest() {
  printf 'the mock provider runs by default\n' | stale_claim >/dev/null || { echo "SELFTEST FAIL: missed 'mock provider'"; exit 2; }
  printf 'a BANZA CA authorizes operators\n' | stale_claim >/dev/null || { echo "SELFTEST FAIL: missed 'BANZA CA'"; exit 2; }
  printf 'inferência local Qwen, sem chamadas externas\n' | stale_claim >/dev/null && { echo "SELFTEST FAIL: false positive on accurate copy"; exit 2; }
  printf 'BanzAI não certifica nem aprova operadores\n' | affirmative_violation >/dev/null && { echo "SELFTEST FAIL: false positive on negated boundary copy"; exit 2; }
  printf '**O BANZA detém fundos?** Não.\n' | affirmative_violation >/dev/null && { echo "SELFTEST FAIL: false positive on FAQ question"; exit 2; }
  printf 'o BanzAI certifica operadores\n' | affirmative_violation >/dev/null || { echo "SELFTEST FAIL: missed affirmative authority claim"; exit 2; }
  printf 'o BANZA processa pagamentos diariamente\n' | affirmative_violation >/dev/null || { echo "SELFTEST FAIL: missed BANZA money claim"; exit 2; }
  echo "  selftest ok"
}
selftest

echo "== banzai-docs-current-state-check (M2.9D) =="
echo "  scanning ${#FILES[@]} current-public doc files"

for f in "${FILES[@]}"; do
  hit="$(stale_claim < "$f" || true)"
  [ -n "$hit" ] && fail "$f contains a stale/false current-state term: $(echo "$hit" | head -1)"
  hit2="$(affirmative_violation < "$f" || true)"
  [ -n "$hit2" ] && fail "$f asserts BanzAI authority or BANZA-as-financial-actor: $(echo "$hit2" | head -1)"
done

# Positive assertion: the reference chapter 11 states the current deployed reality.
REF=website/content/BANZA_REFERENCIA.md
if [ -f "$REF" ]; then
  grep -qiE 'infer(ê|e)ncia local' "$REF" && grep -qiE 'chamadas externas' "$REF" \
    && ok "reference states local inference + no external calls" \
    || fail "$REF must state local inference + no external calls in the BanzAI chapter"
  grep -q "banza.network/banzai" "$REF" && ok "reference names the unified /banzai interface" \
    || fail "$REF must name banza.network/banzai as the public interface"
fi

[ "$FAILED" -eq 0 ] && { echo; echo "  ok: no stale/false current-state claims in public docs"; }
echo
if [ "$FAILED" -eq 0 ]; then echo "BANZAI DOCS CURRENT-STATE CHECK PASSED ✅"; else echo "BANZAI DOCS CURRENT-STATE CHECK FAILED ✗"; fi
exit "$FAILED"
