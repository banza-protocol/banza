# ADR-047 — BanzAI: local_qwen 384-token Default Output Budget

- **Status:** Accepted
- **Date:** 2026-07
- **See also:** ADR-044 (local Qwen runtime), ADR-045 (latency tuning / 256), ADR-046 (reasoning disabled + prefix warm-up), `services/banzai-api`, the prior [M2.8C re-benchmark](../../docs/governance/M2_8C_LOCAL_QWEN_VPS_XL_REBENCHMARK.md). The M2.8D benchmark is recorded in `docs/governance/M2_8D_LOCAL_QWEN_VPS_XL_384_BENCHMARK.md` (created on the M2.8D controlled benchmark; see §4).

## 1. Context

ADR-045 set the local output budget to a **compact 256** tokens when Qwen3 reasoning was still on
(the budget was being consumed by `<think>`). ADR-046 (M2.8C) **disabled reasoning**, so the whole
budget now produces the answer — and the M2.8C re-benchmark returned Option A. In review, 256 was
noted as **too low for a professional default experience**: the largest complex answers could still
be cut off (`finish_reason=length`).

## 2. Decision

Raise the `local_qwen` default output budget from **256 to 384** tokens. All other M2.8C settings are
unchanged: reasoning disabled, prefix warm-up on, **timeout stays 60 s** (the benchmark showed 75 s is
not needed — see §3), ≤3 sources, compact Rust prompt, concurrency 1, queue 1, mandatory Rust
validation, mandatory degraded fallback. `LLM_MAX_TOKENS` is unchanged for hosted providers (800) and
remains an explicit per-deployment override for local (e.g. 256 or 512).

The value lives where the other per-destination defaults live — `readLlmConfig` in
`services/banzai-api/src/provider.js` (`defaults.local ? 384 : 800`). Rust remains the control layer
(retrieval, prompt, validation, limits, fallback); this is a numeric generation-budget default only.

## 3. Evidence (VPS XL+ benchmark, reasoning off, 384)

- Five distinct direct generations: **all `finish_reason=stop`** (answers complete naturally, not
  truncated), 84–133 tokens, 268–493 chars, **`reasoning_content=0`**, avg **~8.7 s**, ~12 tok/s,
  max ~10 s.
- Cold grounded ~19.8 s, warm ~18.1 s (fuller 342-char answer); complex/critical answers correct.
- Max observed latency ~20 s (cold with full context) — **well within 60 s**, so the 75 s upper
  margin considered in M2.8D is **not adopted**.
- No `<think>`/reasoning leak; injection/off-topic → insufficient; certification → non-certifying;
  stop llama.cpp → graceful degrade; `external_model_called=0`; no public port; swap 0 B; no OOM; no
  service impact/restarts.

## 4. Boundaries (unchanged) & activation gate

- `mock` stays the effective default; `local_qwen` remains **benchmark-gated**
  (`BANZAI_BENCHMARK_APPROVED=false`) and is **not** activated by this ADR.
- BanzAI stays non-normative; Qwen is only the local language layer; no external provider; no public
  llama.cpp port; no GGUF in Git; no DNS/Cloudflare/TLS/Postgres/secret/trust-key/protocol-state
  change.
- Promotion of `local_qwen` to the effective default still requires **explicit maintainer approval**
  to set `LLM_PROVIDER=local_qwen` + `BANZAI_BENCHMARK_APPROVED=true`. Result recorded in
  `docs/governance/M2_8D_LOCAL_QWEN_VPS_XL_384_BENCHMARK.md`.

## 5. Consequences

- Fuller, more professional default answers with negligible added latency (answers still finish
  naturally; ~8.7 s typical) and ample timeout headroom.
- A larger cap raises the worst-case decode time; the 60 s timeout + mandatory degraded fallback keep
  it safe. A future 512 remains an explicit, benchmark-gated option only.
