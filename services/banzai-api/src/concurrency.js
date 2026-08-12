// Production inference queue for BanzAI (M2.14E).
//
// This is the async RUNTIME only — timers, promises, an in-flight map, and the lifetime of an open
// HTTP request. It is fine orchestration, not an algorithmic engine: the POLICY it consults
// (request priority, whether a request is safe to de-duplicate, the safe public message) lives in
// Rust (engines/banzai-api-kb → queue_policy.rs, exposed as queuePriority/queueShouldDedup/
// queuePublicMessage in knowledge.js).
//
// It guards ONLY the model-inference step (pipeline Tier 5). Deterministic answers, the action &
// financial boundaries, refusals, and cache hits all resolve BEFORE the queue and never enter it —
// so a busy local model can never block a deterministic or unsafe-refusal answer, and the public
// surface never exposes a "one request at a time" architecture.
//
// Behaviour:
//   * bounded concurrency (default 1 — CPU llama is single-threaded; raise via env when the VPS
//     allows) with a PRIORITY-ordered pending queue (larger than the old 1);
//   * in-flight de-duplication: an identical PLAIN question already running/queued is shared (each
//     caller gets its own deep clone of the result — never a shared, mutable object);
//   * queue-wait timeout and inference timeout (both configurable);
//   * cooperative cancellation when the client disconnects (frees the slot immediately);
//   * rich counters for /health + logs (never any content, key or secret).
//
// No model, no retrieval, no scoring, no network here.

function num(value, fallback, { min = 0 } = {}) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min ? Math.floor(n) : fallback;
}

// Deep clone a plain result object so two de-duplicated callers never share a mutable reference
// (the pipeline mutates the result — stripQuestionEcho, caching). structuredClone when available,
// else a JSON round-trip (results are plain JSON data: answer, sources[], flags).
function cloneResult(value) {
  if (value == null || typeof value !== "object") return value;
  try {
    return structuredClone(value);
  } catch {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }
}

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };

export function createInferenceQueue(env = process.env, { nowFn = Date.now } = {}) {
  // Concurrency: new BANZAI_INFERENCE_CONCURRENCY, back-compat BANZAI_MAX_CONCURRENCY. Default 1.
  const maxConcurrency = num(env.BANZAI_INFERENCE_CONCURRENCY ?? env.BANZAI_MAX_CONCURRENCY, 1, { min: 1 });
  // Pending queue: new BANZAI_QUEUE_MAX_PENDING, back-compat BANZAI_QUEUE_SIZE. Default 8 (was 1).
  const maxPending = num(env.BANZAI_QUEUE_MAX_PENDING ?? env.BANZAI_QUEUE_SIZE, 8, { min: 0 });
  const queueTimeoutMs = num(env.BANZAI_QUEUE_TIMEOUT_MS, 20000, { min: 0 });
  const inferenceTimeoutMs = num(env.BANZAI_INFERENCE_TIMEOUT_MS, 65000, { min: 0 });
  const dedupEnabled = !/^(0|false|no|off)$/i.test(String(env.BANZAI_DEDUP_ENABLED ?? "1"));

  let active = 0;
  const pending = []; // { runJob, priority, enqueuedAt, timer, cancelled }
  const inflight = new Map(); // dedupKey -> Promise<rawResult>

  // Observability counters — safe telemetry only (counts + durations, never content).
  const counters = {
    accepted: 0, // reached the queue (ran immediately or waited)
    ran_immediately: 0,
    queued: 0,
    completed: 0,
    failed: 0,
    timed_out: 0,
    cancelled: 0,
    queue_full: 0,
    dedup_hits: 0,
    total_wait_ms: 0,
    total_inference_ms: 0,
    last_inference_ms: 0,
    last_wait_ms: 0,
  };

  function makeError(message, code) {
    const err = new Error(message);
    err.code = code;
    return err;
  }

  // Insert a job into the pending queue in PRIORITY order (stable within a priority band).
  function enqueue(job) {
    const rank = PRIORITY_RANK[job.priority] ?? 1;
    let i = pending.length;
    while (i > 0 && (PRIORITY_RANK[pending[i - 1].priority] ?? 1) > rank) i -= 1;
    pending.splice(i, 0, job);
  }

  // Pump: while a slot is free and the queue has work, start the next job.
  function pump() {
    while (active < maxConcurrency && pending.length > 0) {
      const job = pending.shift();
      if (job.timer) clearTimeout(job.timer);
      if (job.cancelled) continue; // client left while queued — skip, slot stays free
      active += 1;
      job.startedWaitingAt != null && (counters.total_wait_ms += Math.max(0, nowFn() - job.startedWaitingAt));
      job.runJob();
    }
  }

  // Occupy a slot and execute fn under the inference timeout, releasing the slot EXACTLY once and
  // recording the inference duration; then pump the next job. `waitMs` is the time already spent in
  // the pending queue (0 when the slot was free).
  function runUnderSlot(fn, waitMs, resolve, reject) {
    counters.last_wait_ms = waitMs;
    const t0 = nowFn();
    let settled = false;
    // M2.14E — a per-job abort controller. When the inference timeout fires we abort it so the actual
    // provider call (llama.cpp fetch) is cancelled and the MODEL resource is freed, not just the queue
    // slot — otherwise a hung inference could keep occupying the model while the next job starts.
    const execCtl = typeof AbortController === "function" ? new AbortController() : null;
    const finish = (fnErr, value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      const ms = nowFn() - t0;
      counters.last_inference_ms = ms;
      counters.total_inference_ms += ms;
      active -= 1;
      if (fnErr) reject(fnErr);
      else resolve(value);
      pump();
    };
    const timer =
      inferenceTimeoutMs > 0
        ? setTimeout(() => {
            if (execCtl) execCtl.abort();
            finish(makeError("inference timed out", "INFERENCE_TIMEOUT"), null);
          }, inferenceTimeoutMs)
        : null;
    // fn receives the exec signal so it can forward it to the provider (an extra arg is ignored by
    // callers that don't use it — back-compat with the plain `() => …` form).
    Promise.resolve()
      .then(() => fn(execCtl ? execCtl.signal : undefined))
      .then(
        (value) => finish(null, value),
        (err) => finish(err || makeError("inference failed", "INFERENCE_FAILED"), null)
      );
  }

  // Core admission + scheduling for ONE fresh (non-deduped) request.
  function schedule(fn, priority, signal) {
    return new Promise((resolve, reject) => {
      // M2.14E SEC-FIX: the client already disconnected before we scheduled (an already-aborted signal
      // arriving in the pre-queue window). Reject NOW — never admit, never enqueue. Otherwise the
      // queued-path abort handler (which only fires for a job already in `pending`) never runs and the
      // promise hangs forever (a per-request memory leak under exactly the backpressure this guards).
      if (signal && signal.aborted) {
        counters.cancelled += 1;
        reject(makeError("request cancelled", "QUEUE_CANCELLED"));
        return;
      }
      counters.accepted += 1;
      const start = nowFn();

      // Slot free → run immediately, no wait.
      if (active < maxConcurrency) {
        active += 1;
        counters.ran_immediately += 1;
        runUnderSlot(fn, 0, resolve, reject);
        return;
      }

      // Otherwise queue it, if there is room.
      if (pending.length >= maxPending) {
        counters.queue_full += 1;
        reject(makeError("inference queue full", "QUEUE_FULL"));
        return;
      }

      counters.queued += 1;
      const job = {
        priority,
        startedWaitingAt: start,
        cancelled: false,
        timer: null,
        runJob: () => runUnderSlot(fn, nowFn() - start, resolve, reject),
      };

      // Queue-wait timeout: if it never starts in time, drop it (a clean 504 upstream).
      if (queueTimeoutMs > 0) {
        job.timer = setTimeout(() => {
          const idx = pending.indexOf(job);
          if (idx >= 0) {
            pending.splice(idx, 1);
            counters.timed_out += 1;
            reject(makeError("queue wait timed out", "QUEUE_TIMEOUT"));
          }
        }, queueTimeoutMs);
      }

      // Cooperative cancellation: client disconnected while queued → free the slot intent.
      if (signal) {
        const onAbort = () => {
          const idx = pending.indexOf(job);
          if (idx >= 0) {
            pending.splice(idx, 1);
            if (job.timer) clearTimeout(job.timer);
            counters.cancelled += 1;
            reject(makeError("request cancelled", "QUEUE_CANCELLED"));
          }
        };
        // (A pre-aborted signal was already handled at the top of schedule() — here we only need to
        // react to an abort that arrives WHILE the job waits in `pending`.)
        signal.addEventListener("abort", onAbort, { once: true });
      }

      enqueue(job);
    });
  }

  // Public API: run a model-bound fn under the queue.
  //   opts.dedupKey  — when set AND dedup enabled, an identical in-flight request is shared.
  //   opts.priority  — "high" | "normal" | "low" (from queuePriority).
  //   opts.signal    — an AbortSignal; if it fires while queued, the request is cancelled.
  async function run(fn, { dedupKey, priority = "normal", signal } = {}) {
    const canDedup = dedupEnabled && typeof dedupKey === "string" && dedupKey.length > 0;

    // De-duplication: attach to an identical in-flight request; each caller gets its own clone.
    if (canDedup && inflight.has(dedupKey)) {
      counters.dedup_hits += 1;
      const shared = await inflight.get(dedupKey);
      return cloneResult(shared);
    }

    const exec = schedule(fn, priority, signal).then(
      (v) => {
        counters.completed += 1;
        return v;
      },
      (err) => {
        if (err && err.code === "INFERENCE_TIMEOUT") counters.timed_out += 1;
        else if (err && err.code === "QUEUE_CANCELLED") {
          /* already counted */
        } else if (err && err.code !== "QUEUE_FULL" && err.code !== "QUEUE_TIMEOUT") counters.failed += 1;
        throw err;
      }
    );

    if (canDedup) {
      inflight.set(dedupKey, exec);
      // Clear the in-flight entry when done (success or failure) so later identical questions re-run.
      exec.finally(() => {
        if (inflight.get(dedupKey) === exec) inflight.delete(dedupKey);
      }).catch(() => {});
    }

    // The leader also gets a clone so no caller ever holds the canonical shared object.
    const raw = await exec;
    return canDedup ? cloneResult(raw) : raw;
  }

  // Health/telemetry snapshot. Includes back-compat fields (max_concurrency, max_queue, active,
  // queued) so existing /health consumers keep working, plus the richer M2.14E counters.
  function stats() {
    const wc = counters.queued || 1;
    const ic = counters.completed || 1;
    return {
      // back-compat (M2.8):
      max_concurrency: maxConcurrency,
      max_queue: maxPending,
      active,
      queued: pending.length,
      // M2.14E richer telemetry:
      max_pending: maxPending,
      pending: pending.length,
      running: active,
      inflight_dedup_keys: inflight.size,
      queue_timeout_ms: queueTimeoutMs,
      inference_timeout_ms: inferenceTimeoutMs,
      dedup_enabled: dedupEnabled,
      counters: { ...counters },
      avg_wait_ms: Math.round(counters.total_wait_ms / wc),
      avg_inference_ms: Math.round(counters.total_inference_ms / ic),
    };
  }

  return { run, stats };
}

// Back-compat alias: the M2.8 server imported `createGate`. Keep the name so nothing external breaks;
// the returned object still exposes { run, stats }, but run() now accepts the M2.14E options.
export const createGate = createInferenceQueue;
