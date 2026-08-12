// M2.18B.6 — the GROUNDED-SYNTHESIS gate. BanzAI makes exactly one model call per explanation (the
// grounded synthesis in grounded-synthesis.js). This module owns that single call's model + timeout and a
// fail-safe auto-rollback circuit breaker: if the synthesis error rate climbs in production it trips for
// the process, degrading every explanation to the safe deterministic grounding (never a whole-answer
// failure). There is NO architecture selector and NO input pass — Rust resolves intent/entity/retrieval
// deterministically before the model is ever called. Config:
//
//   BANZAI_SYNTHESIS_MODEL                    the local model artifact for the synthesis (else provider's)
//   BANZAI_SYNTHESIS_TIMEOUT_MS               synthesis call timeout
//   BANZAI_SYNTHESIS_AUTO_ROLLBACK            "1" → trip the breaker on a bad live error rate
//   BANZAI_SYNTHESIS_ROLLBACK_WINDOW / _ROLLBACK_MAX_ERROR_RATE   breaker tuning

function intFrom(v, fallback) {
  const n = Number.parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}

// Derive the breaker signal from a synthesis trace. A FAILURE is the model running but producing nothing
// publishable for a quality reason (the synthesis failed or was rejected by the factual validator). A
// HEALTHY turn is a synthesis that ran ok or legitimately did not run (clarify / insufficient / boundary →
// output_status "skipped"). Everything else does not measure the model (unavailable) and is neutral.
export function classifySynthesis(trace) {
  if (!trace || !trace.synthesis_called) return "neutral";
  const output = trace.output_status;
  if (output === "failed" || output === "invalid" || output === "rejected") return "failure";
  if (output === "ok" || output === "skipped") return "healthy";
  return "neutral";
}

export function createSynthesisGate(env = process.env) {
  const autoRollback = String(env.BANZAI_SYNTHESIS_AUTO_ROLLBACK ?? "0") === "1";
  const window = Math.max(10, intFrom(env.BANZAI_SYNTHESIS_ROLLBACK_WINDOW, 30));
  const maxErrorRate = (() => {
    const n = Number.parseFloat(String(env.BANZAI_SYNTHESIS_ROLLBACK_MAX_ERROR_RATE ?? ""));
    return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0.2; // default: trip above 20% failures
  })();
  const model = String(env.BANZAI_SYNTHESIS_MODEL ?? "").trim() || null;
  const timeoutMs = intFrom(env.BANZAI_SYNTHESIS_TIMEOUT_MS, 45000);

  const recent = [];
  let tripped = false;
  let trippedReason = null;

  return {
    // The model artifact + timeout the single grounded synthesis uses.
    synthesisOptions() {
      return { model, timeoutMs };
    },
    get tripped() {
      return tripped;
    },
    // Record a synthesis outcome (its trace). Returns the breaker state so the caller can log a one-time
    // auto-rollback event. No-op unless auto-rollback is enabled.
    record(trace) {
      if (!autoRollback || tripped) return { tripped, justTripped: false };
      const c = classifySynthesis(trace);
      if (c === "neutral") return { tripped, justTripped: false };
      recent.push(c === "failure");
      if (recent.length > window) recent.shift();
      let justTripped = false;
      if (recent.length >= window) {
        const failures = recent.reduce((a, b) => a + (b ? 1 : 0), 0);
        const rate = failures / recent.length;
        if (rate > maxErrorRate) {
          tripped = true;
          justTripped = true;
          trippedReason = `synthesis auto-rollback: ${failures}/${recent.length} failed (>${maxErrorRate})`;
        }
      }
      return { tripped, justTripped, reason: trippedReason };
    },
    // Safe telemetry only (counts/booleans) — never a question or model output.
    stats() {
      const failures = recent.reduce((a, b) => a + (b ? 1 : 0), 0);
      return {
        auto_rollback: autoRollback,
        window,
        max_error_rate: maxErrorRate,
        samples: recent.length,
        failures,
        tripped,
      };
    },
  };
}
