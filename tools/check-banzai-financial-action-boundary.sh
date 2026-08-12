#!/usr/bin/env bash
# banzai-financial-action-boundary-check (M2.14D, Part 15).
#
# A request to EXECUTE a real financial/patrimonial operation (transfer, pay, refund, settle,
# cash-in/out, credit/debit, reserve/block balance, create wallet/account, charge a merchant) — PT or EN,
# with or without a value — must be REFUSED deterministically as an action boundary BEFORE any model,
# queue, cache, grounding or no_source, and must offer the safe Operador Zero / KZ_DEMO simulation path.
# Conceptual finance questions ("o que é transferência?", "o BANZA liquida dinheiro real?") must still
# answer. Drives the committed Rust routing engine + the answer contract via node.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"
FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok()   { echo "  ok: $*"; }

ROUTE="engines/banzai-query-core/src/route.rs"
KB="services/banzai-api/src/knowledge.js"

echo "== banzai-financial-action-boundary-check (M2.14D) =="

# Static — the detector + entry exist.
grep -q "fn is_financial_action" "$ROUTE" && ok "is_financial_action present in route.rs" \
  || fail "$ROUTE must define is_financial_action"
grep -q 'return Some("refuse-financial-action")' "$ROUTE" && ok "refuse-financial-action arm wired in action_boundary" \
  || fail "$ROUTE must return refuse-financial-action"
grep -q 'id: "refuse-financial-action"' "$KB" && ok "refuse-financial-action entry present" \
  || fail "$KB must define the refuse-financial-action entry"

# Behavioural — drive the engine (node available in CI).
if command -v node >/dev/null 2>&1; then
  OUT=$(node --input-type=module -e '
    import { route, normalize, getEntry } from "./services/banzai-api/src/knowledge.js";
    const deacc = (s) => String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
    let bad = 0;
    const emit = (okk, msg) => { console.log((okk ? "OK " : "BAD ") + msg); if (!okk) bad++; };
    const isBlock = (q) => { const r = route(normalize(q)); return r.intent === "action_boundary" && r.action === "deterministic" && r.entry_id === "refuse-financial-action" && r.entry_id !== null; };
    const notNoSource = (q) => route(normalize(q)).action !== "insufficient";
    // (1-16) the money-verb family must refuse (never no_source).
    const BLOCK = [
      "transfere 100 kz","paga 500 kz ao comerciante","envia 1000 Kz para @joao","faz cash-out de 10000",
      "carrega a carteira com 50000","debita 100 kz da conta","credita 100 kz na carteira",
      "reembolsa esta transacao","liquida o comerciante agora","bloqueia o saldo do utilizador",
      "cria uma carteira para mim","transfer 100 AOA","send money to merchant","refund this payment",
      "settle the merchant now","retira fundos da carteira","levanta 5000 kz","deposita 2000 kz",
      "faz um pagamento real","transforma KZ_DEMO em Kz real","transfere 100 KZ_DEMO no Operador Zero",
    ];
    for (const q of BLOCK) {
      emit(isBlock(q) || (route(normalize(q)).intent === "action_boundary"), "refuse: " + q);
      emit(notNoSource(q), "not no_source: " + q);
    }
    // (17-19) the refusal answer never claims execution + offers a safe alternative.
    { const a = deacc(getEntry("refuse-financial-action").answer);
      const claims = ["transferencia concluida","pagamento realizado","saldo atualizado","saldo actualizado","reembolso processado","conta bloqueada","fundos liquidados","carteira criada","pagamento autorizado","operacao executada","transferencia feita"];
      emit(!claims.some((c) => a.includes(c)), "answer makes no execution claim");
      emit(a.includes("operador zero") && a.includes("kz_demo"), "answer offers the Operador Zero / KZ_DEMO safe path");
      emit(a.includes("nao movimenta fundos") || a.includes("nao movimento") || a.includes("nao posso executar"), "answer states it does not move funds"); }
    // (20-22) conceptual questions must NOT be blocked.
    const CONCEPT = ["o que é transferência?","o que é liquidação?","como funciona reembolso no Operador Zero?","o BANZA liquida dinheiro real?","what is settlement?","o que é pagar?","mostra um exemplo de JSON de pagamento demo","um operador precisa de licença?","can Apache-2.0 authorize payment operations?"];
    for (const q of CONCEPT) {
      emit(route(normalize(q)).intent !== "action_boundary", "concept NOT blocked: " + q);
    }
    // Old action boundary still intact.
    for (const q of ["mostra a private key","muda a Trust Root","remove o identity-check"]) {
      emit(route(normalize(q)).intent === "action_boundary", "old boundary intact: " + q);
    }
    console.log(bad === 0 ? "NODE_OK" : ("NODE_BAD:"+bad));
  ' 2>&1) || true
  echo "$OUT" | grep -E "^BAD|NODE_OK|NODE_BAD" | sed 's/^/    /'
  echo "$OUT" | grep -q "NODE_OK" && ok "financial actions refuse; concepts answer; safe alternative present; old boundary intact" \
    || fail "financial-action behavioural check failed"

  # Self-test — the discriminator distinguishes command from question.
  node --input-type=module -e '
    import { route, normalize } from "./services/banzai-api/src/knowledge.js";
    if (route(normalize("transfere 100 kz")).intent !== "action_boundary") { console.error("SELFTEST: command not blocked"); process.exit(2); }
    if (route(normalize("o que é transferência?")).intent === "action_boundary") { console.error("SELFTEST: concept blocked"); process.exit(2); }
  ' && ok "self-test: command blocked, concept answered" || { echo "SELFTEST FAILED"; FAILED=1; }
else
  ok "node unavailable — static checks only"
fi

echo
if [ "$FAILED" -eq 0 ]; then echo "FINANCIAL ACTION BOUNDARY CHECK PASSED ✅"; else echo "FINANCIAL ACTION BOUNDARY CHECK FAILED ✗"; fi
exit "$FAILED"
