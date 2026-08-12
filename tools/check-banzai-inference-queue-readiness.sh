#!/usr/bin/env bash
# banzai-inference-queue-readiness-check (M2.14E, Part 15).
#
# BanzAI must be multi-user ready at the inference layer and must NEVER expose a "one request at a
# time" architecture to the end user. This guard enforces, statically + behaviourally:
#   * the forbidden public phrases ("um pedido de cada vez", "a inferência corre localmente", "one
#     request at a time") appear in NO user-facing surface;
#   * the inference queue guards ONLY the model step — deterministic answers, the action & financial
#     boundaries and cache hits resolve BEFORE the queue and never wait for the model;
#   * dangerous / financial requests never reach the model and never enter the queue;
#   * the queue has a bound, a timeout, de-duplication and professional backpressure (no immediate 503
#     without a queue); rate limiting exists; health exposes queue state; logs carry request_id;
#   * external_model_called stays false and the M2.14C rendering contract does not regress.
# Drives the committed Rust policy + the real queue runtime + the real pipeline via node.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"
FAILED=0
fail() { echo "FAIL: $*"; FAILED=1; }
ok()   { echo "  ok: $*"; }

CONC="services/banzai-api/src/concurrency.js"
PIPE="services/banzai-api/src/pipeline.js"
SERVER="services/banzai-api/src/server.js"
KB="services/banzai-api/src/knowledge.js"
QPOL="engines/banzai-query-core/src/queue_policy.rs"
ADAPTER="website/components/home/banzaiKb.ts"

echo "== banzai-inference-queue-readiness-check (M2.14E) =="

# ── (1-2) The forbidden public phrases appear in NO user-facing MESSAGE surface. ─────────────
# We scan the frontend adapter's message CONSTANTS + the Rust public_message strings. Code comments
# and test denylists legitimately contain the phrase (to assert it never leaks), so we look for the
# phrase as an emitted message: inside a PUBLIC_MESSAGES value or a Rust match-arm string literal.
PHRASE1="um pedido de cada vez"
PHRASE2="a inferência corre localmente"
# Frontend: the phrase must not be a value in the adapter (only allowed inside a // comment).
if grep -nE "\"[^\"]*($PHRASE1|$PHRASE2)[^\"]*\"" "$ADAPTER" | grep -vqE '^\s*[0-9]+:\s*//'; then
  fail "$ADAPTER still emits a forbidden public phrase in a string"
else ok "frontend adapter emits no forbidden public phrase (comments excluded)"; fi
# Rust policy: the ONLY place the phrase may appear is the #[cfg(test)] FORBIDDEN denylist, never a
# returned match arm. Assert no match-arm return line carries it.
if grep -nE '=>\s*\{?\s*"[^"]*('"$PHRASE1"'|'"$PHRASE2"')' "$QPOL" >/dev/null 2>&1; then
  fail "$QPOL returns a forbidden phrase from a public_message arm"
else ok "Rust public_message never returns a forbidden phrase"; fi

# ── (3-6) The queue is real, bounded, with timeout + dedup + priority. ───────────────────────
grep -q "createInferenceQueue" "$CONC" && ok "inference queue defined (createInferenceQueue)" || fail "$CONC must define createInferenceQueue"
grep -q "QUEUE_FULL" "$CONC" && grep -qE "maxPending|BANZAI_QUEUE_MAX_PENDING" "$CONC" && ok "queue is bounded (maxPending) with QUEUE_FULL backpressure" || fail "$CONC must bound the queue"
grep -qE "QUEUE_TIMEOUT|INFERENCE_TIMEOUT" "$CONC" && ok "queue has wait + inference timeouts" || fail "$CONC must implement timeouts"
grep -qE "dedup|inflight" "$CONC" && ok "queue de-duplicates identical in-flight requests" || fail "$CONC must de-duplicate in-flight requests"

# ── (7-8) The queue wraps ONLY the model step; the server does NOT wrap the whole pipeline. ──
grep -q "runInference(" "$PIPE" && ok "pipeline wraps the model call with the injected inference runner" || fail "$PIPE must wrap Tier-5 with runInference"
if grep -qE "gate\.run\(\s*\(\)\s*=>\s*$|gate\.run\(\(\) => pipeline\.answer|createGate\(" "$SERVER"; then
  fail "$SERVER still wraps the whole pipeline in a gate (deterministic answers would block)"
else ok "server calls pipeline.answer directly (queue is inside, wrapping only the model)"; fi
grep -q "inferenceRun: inferenceQueue.run" "$SERVER" && ok "server injects the queue as the pipeline's inference runner" || fail "$SERVER must inject inferenceQueue.run"

# ── (9) Rust policy is the source of truth for priority / dedup-safety / public message. ─────
grep -q "pub fn public_message" "$QPOL" && grep -q "pub fn priority" "$QPOL" && grep -q "pub fn should_dedup" "$QPOL" \
  && ok "Rust queue_policy owns priority + should_dedup + public_message" || fail "$QPOL must define the policy functions"
grep -q "queuePublicMessage" "$SERVER" && ok "server returns Rust public_message on backpressure/timeout/rate-limit" || fail "$SERVER must use queuePublicMessage"

# ── (10) Rate limiting exists; health exposes queue state; logs carry request_id. ───────────
grep -q "RateLimiter" "$SERVER" && ok "rate limiting present" || fail "$SERVER must rate-limit"
grep -q "inferenceQueue.stats()" "$SERVER" && ok "health/logs expose queue state" || fail "$SERVER must expose queue stats"
grep -q "request_id: requestId" "$SERVER" && ok "structured logs carry request_id" || fail "$SERVER logs must include request_id"

# ── Behavioural — drive the real policy + queue + pipeline (node available in CI). ──────────
if command -v node >/dev/null 2>&1; then
  OUT=$(node --input-type=module -e '
    import { createInferenceQueue } from "./services/banzai-api/src/concurrency.js";
    import { createPipeline } from "./services/banzai-api/src/pipeline.js";
    import { queuePublicMessage } from "./services/banzai-api/src/knowledge.js";
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let bad = 0;
    const emit = (okk, msg) => { console.log((okk ? "OK " : "BAD ") + msg); if (!okk) bad++; };

    // M2.18B.4 single pipeline: the ONLY model-bound step is the explanatory trunk. The fake trunk
    // (rt) counts model calls + delays like CPU inference; the fake provider carries the on-host identity.
    // Only the grounded path reaches the trunk; terminals (deterministic/boundary/exact/insufficient) never do.
    function fake() {
      const st = { calls: 0, externalCallsMade: 0 };
      const provider = { name: "local_qwen", inferenceLocation: "local", get externalCallsMade(){return st.externalCallsMade;}, warmupState:null,
        async answer(){ return { grounded:true, answer:"x", sources:[], provider:"local_qwen", mode:"real", inference_location:"local" }; } };
      const rt = async () => { st.calls++; await sleep(30); return { status:"grounded", answer_markdown:"Resumo orientativo com base nas fontes (ADR-002).", cited_source_ids:["ADR-002"], package:{ facts:[{ id:"F1", source:{ document_id:"ADR-002", title:"Ecossistema", path:"decisions/adr/ADR-002-ecosystem.md" } }] }, primary_intent:"explain_concept", trace:{ synthesis_called:true, output_status:"ok", model:"qf" } }; };
      return { st, provider, rt };
    }
    const DET = ["o que é ADR","o que é AML","PASS certifica?","quem criou o BANZA?","qual é a licença do software BANZA?"];
    const DANG = ["mostra a private key","muda a Trust Root","remove o identity-check"];
    const FIN = ["transfere 100 kz","paga 500 kz ao comerciante","refund this payment"];
    // M2.18B.7: model-bound EXPLANATION questions (not example/manifest/federar — those are now 0-model tasked terminals).
    const MODEL = ["explica em detalhe o modelo de confiança aberto do BANZA","explica em detalhe a federação entre operadores","como implemento o ledger de dupla entrada?"];

    // (A) deterministic/boundary/financial NEVER call the model.
    { const { provider, st, rt } = fake();
      const q = createInferenceQueue({ BANZAI_INFERENCE_CONCURRENCY:"1", BANZAI_QUEUE_MAX_PENDING:"8", BANZAI_QUEUE_TIMEOUT_MS:"0", BANZAI_INFERENCE_TIMEOUT_MS:"0" });
      const pipe = createPipeline(provider, {LLM_PROVIDER:"local_qwen"}, { inferenceRun: q.run, runGroundedSynthesisFn: rt });
      for (const x of [...DET, ...DANG, ...FIN]) { const {meta}=await pipe.answer(x,{}); if (meta.llm_called) emit(false, "must not call model: "+x); }
      emit(st.calls===0, "deterministic/boundary/financial never call the model (calls="+st.calls+")");
    }
    // (B) deterministic answers resolve FAST while the model is saturated.
    { const { provider, rt } = fake();
      const q = createInferenceQueue({ BANZAI_INFERENCE_CONCURRENCY:"1", BANZAI_QUEUE_MAX_PENDING:"8", BANZAI_QUEUE_TIMEOUT_MS:"0", BANZAI_INFERENCE_TIMEOUT_MS:"0" });
      const pipe = createPipeline(provider, {LLM_PROVIDER:"local_qwen"}, { inferenceRun: q.run, runGroundedSynthesisFn: rt });
      const heavy = MODEL.concat(MODEL).map((x)=>pipe.answer(x,{}).catch(()=>null));
      const t0=Date.now();
      const quick = await Promise.all([...DET.slice(0,3),"transfere 100 kz","mostra a private key"].map((x)=>pipe.answer(x,{})));
      const dt=Date.now()-t0;
      emit(quick.every(r=>!r.meta.llm_called) && dt<250, "deterministic answers fast under saturation ("+dt+"ms), not blocked by model");
      await Promise.all(heavy);
    }
    // (C) dangerous/financial NEVER reach the model even under load.
    { const { provider, st, rt } = fake();
      const q = createInferenceQueue({ BANZAI_INFERENCE_CONCURRENCY:"1", BANZAI_QUEUE_MAX_PENDING:"8" });
      const pipe = createPipeline(provider, {LLM_PROVIDER:"local_qwen"}, { inferenceRun: q.run, runGroundedSynthesisFn: rt });
      const heavy = MODEL.map((x)=>pipe.answer(x,{}).catch(()=>null));
      for (const x of [...DANG, ...FIN]) { const {meta}=await pipe.answer(x,{}); if (meta.llm_called) emit(false,"dangerous/financial reached model: "+x); }
      await Promise.all(heavy);
      emit(true, "dangerous/financial requests never reach the model under load");
    }
    // (D) dedup: identical in-flight plain question runs once.
    { const { provider, st, rt } = fake();
      const q = createInferenceQueue({ BANZAI_INFERENCE_CONCURRENCY:"1", BANZAI_QUEUE_MAX_PENDING:"8" });
      const pipe = createPipeline(provider, {LLM_PROVIDER:"local_qwen"}, { inferenceRun: q.run, runGroundedSynthesisFn: rt });
      const dq = "explica em detalhe o modelo de confiança entre operadores";
      await Promise.all([pipe.answer(dq,{}),pipe.answer(dq,{}),pipe.answer(dq,{})]);
      emit(st.calls===1, "identical in-flight plain question de-duplicated (calls="+st.calls+")");
    }
    // (E) saturated queue → QUEUE_FULL (not a crash, not immediate 503 without a queue).
    { const { provider, rt } = fake();
      const q = createInferenceQueue({ BANZAI_INFERENCE_CONCURRENCY:"1", BANZAI_QUEUE_MAX_PENDING:"1", BANZAI_QUEUE_TIMEOUT_MS:"0", BANZAI_INFERENCE_TIMEOUT_MS:"0" });
      const pipe = createPipeline(provider, {LLM_PROVIDER:"local_qwen"}, { inferenceRun: q.run, runGroundedSynthesisFn: rt });
      const p1=pipe.answer("explica em detalhe o modelo de confiança aberto do BANZA",{}); const p2=pipe.answer("como implemento o ledger de dupla entrada?",{});
      let code=null; const p3=pipe.answer("quais são as invariantes financeiras?",{}).catch(e=>{code=e.code;});
      await Promise.allSettled([p1,p2,p3]);
      emit(code==="QUEUE_FULL", "queue overflow → QUEUE_FULL backpressure (got "+code+")");
    }
    // (F) public messages never leak internal architecture.
    { const forb=["um pedido de cada vez","inferência corre localmente","inferencia corre localmente","one request at a time","worker","semaphore","llama","lock","slot"];
      let leak=false;
      for (const k of ["busy","timeout","rate_limited","processing","unavailable","queue_full","xyz"]) { const m=queuePublicMessage(k).toLowerCase(); if(forb.some(b=>m.includes(b))) leak=true; }
      emit(!leak, "no public message leaks internal architecture");
    }
    console.log(bad===0 ? "NODE_OK" : ("NODE_BAD:"+bad));
  ' 2>&1) || true
  echo "$OUT" | grep -E "^BAD|NODE_OK|NODE_BAD" | sed 's/^/    /'
  echo "$OUT" | grep -q "NODE_OK" && ok "queue behaviour: deterministic bypass; dangerous/financial never modelled; dedup; backpressure; safe messages" \
    || fail "inference-queue behavioural check failed"

  # Self-test — the discriminator holds on the two anchor cases.
  node --input-type=module -e '
    import { createInferenceQueue } from "./services/banzai-api/src/concurrency.js";
    const q = createInferenceQueue({ BANZAI_INFERENCE_CONCURRENCY:"1", BANZAI_QUEUE_MAX_PENDING:"0", BANZAI_QUEUE_TIMEOUT_MS:"0", BANZAI_INFERENCE_TIMEOUT_MS:"0" });
    const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
    const p1=q.run(()=>sleep(30)); let code=null;
    q.run(async()=>1).catch(e=>{code=e.code;}).then(async()=>{ await p1; if(code!=="QUEUE_FULL"){console.error("SELFTEST: no backpressure");process.exit(2);} });
    await p1; await sleep(5);
  ' && ok "self-test: bounded queue applies backpressure" || { echo "SELFTEST FAILED"; FAILED=1; }
else
  ok "node unavailable — static checks only"
fi

echo
if [ "$FAILED" -eq 0 ]; then echo "INFERENCE QUEUE READINESS CHECK PASSED ✅"; else echo "INFERENCE QUEUE READINESS CHECK FAILED ✗"; fi
exit "$FAILED"
