// Cost and abuse limits for BanzAI.
//
// BudgetTracker: daily/monthly USD ceilings for external LLM spend, estimated
// from character counts (≈4 chars/token) times a configurable per-1k-token rate.
// When a ceiling is reached BanzAI keeps answering from deterministic entries and
// caches — it NEVER calls DeepSeek/Qwen past budget. RateLimiter: fixed-window
// per-client cap with a clear JSON error. Both are in-process and clock-injectable
// for tests; neither ever sees or stores a key.

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function estimateTokens(text) {
  return Math.ceil(String(text || "").length / 4);
}

export class BudgetTracker {
  constructor(env = {}, nowFn = Date.now) {
    this.dailyUsd = num(env.LLM_DAILY_BUDGET_USD, 1.0);
    this.monthlyUsd = num(env.LLM_MONTHLY_BUDGET_USD, 15.0);
    this.costPer1k = num(env.LLM_COST_PER_1K_TOKENS_USD, 0.0005);
    this.nowFn = nowFn;
    this.day = null;
    this.month = null;
    this.spentDayUsd = 0;
    this.spentMonthUsd = 0;
    this.llmCalls = 0;
  }
  roll() {
    const d = new Date(this.nowFn());
    const day = d.toISOString().slice(0, 10);
    const month = day.slice(0, 7);
    if (day !== this.day) {
      this.day = day;
      this.spentDayUsd = 0;
    }
    if (month !== this.month) {
      this.month = month;
      this.spentMonthUsd = 0;
    }
  }
  costOf(tokens) {
    return (tokens / 1000) * this.costPer1k;
  }
  // Can we afford a call of this estimated size right now?
  canSpend(estimatedTokens) {
    this.roll();
    const cost = this.costOf(estimatedTokens);
    if (this.spentDayUsd + cost > this.dailyUsd) return { allowed: false, reason: "daily_budget_exhausted" };
    if (this.spentMonthUsd + cost > this.monthlyUsd) return { allowed: false, reason: "monthly_budget_exhausted" };
    return { allowed: true };
  }
  record(tokens) {
    this.roll();
    const cost = this.costOf(tokens);
    this.spentDayUsd += cost;
    this.spentMonthUsd += cost;
    this.llmCalls += 1;
    return cost;
  }
  snapshot() {
    this.roll();
    const r = (x) => Number(x.toFixed(6));
    return {
      llm_calls: this.llmCalls,
      daily_budget_usd: this.dailyUsd,
      monthly_budget_usd: this.monthlyUsd,
      spent_today_usd: r(this.spentDayUsd),
      spent_month_usd: r(this.spentMonthUsd),
      remaining_today_usd: r(Math.max(0, this.dailyUsd - this.spentDayUsd)),
      llm_available: this.spentDayUsd < this.dailyUsd && this.spentMonthUsd < this.monthlyUsd,
    };
  }
}

export class RateLimiter {
  constructor(env = {}, nowFn = Date.now) {
    this.max = Math.max(1, num(env.RATE_LIMIT_MAX, 60));
    this.windowMs = Math.max(1000, num(env.RATE_LIMIT_WINDOW_MS, 60000));
    this.nowFn = nowFn;
    this.windows = new Map(); // id -> {start, count}
  }
  allow(id) {
    const now = this.nowFn();
    // opportunistic cleanup so the map never grows unbounded
    if (this.windows.size > 10000) {
      for (const [k, w] of this.windows) if (now - w.start > this.windowMs) this.windows.delete(k);
    }
    const w = this.windows.get(id);
    if (!w || now - w.start > this.windowMs) {
      this.windows.set(id, { start: now, count: 1 });
      return { allowed: true };
    }
    w.count += 1;
    if (w.count > this.max) {
      return { allowed: false, retry_after_ms: Math.max(0, w.start + this.windowMs - now) };
    }
    return { allowed: true };
  }
}
