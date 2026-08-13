// Increment 5 (§11/§13) — the read-only RECEIPTS tool the question-family handler uses for the comparison
// and diagnosis families. It reuses the durable receipt store (ADR-042, receipts/index.js): resolve the
// comparison operands (latest / previous / penultimate / explicit exec-… ids) to concrete PUBLIC execution
// ids, then read one execution or the field-by-field diff of two. NO new store logic — it only composes the
// existing store reads. Fail-safe + env-gated inside the store: a disabled store / DB outage returns an
// honest ok:false, so the pipeline degrades to the Rust-authored contextual fallback, never an error and
// never a fabricated result. Numbers/states come ONLY from the store; no model is ever in the loop.
//
// This module transitively imports the pg-backed store; it is wired by server.js and INJECTED into the
// pipeline (like the telemetry / live-artifact tools) so the pipeline itself stays pg-free.

import * as receipts from "./receipts/index.js";

const PUBLIC = "public";
// The canonical public demo implementation (ADR-041/053). Public comparison/diagnosis operands resolve
// against its execution history — the same public scope the telemetry tool uses.
const PUBLIC_IMPL = "operator-zero-ref-impl";

// Resolve the resolver's operand tokens to concrete public execution ids, newest-first. Explicit exec- ids
// are used verbatim; ordinal tokens (latest/previous/penultimate + PT/EN aliases) index the public list.
async function resolveIds(targets, env) {
  const toks = (Array.isArray(targets) ? targets : []).map((t) => String(t || ""));
  const explicit = toks.filter((t) => t.startsWith("exec-"));
  if (explicit.length >= 1) return [...new Set(explicit)];
  const list = await receipts.readExecutions(PUBLIC_IMPL, PUBLIC, env); // newest-first (created_at DESC)
  const ids = (Array.isArray(list) ? list : []).map((r) => r.execution_id).filter(Boolean);
  const pick = (tok) => {
    if (["latest", "last", "ultima", "última"].includes(tok)) return ids[0];
    if (["previous", "anterior"].includes(tok)) return ids[1];
    if (["penultimate", "penultima", "penúltima"].includes(tok)) return ids[1];
    return undefined;
  };
  const out = [];
  for (const t of toks) {
    const id = pick(t);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

export function createReceiptsTool(env = process.env) {
  return {
    // Read one execution (its header + step receipts) for the diagnosis family.
    async getExecution(target) {
      try {
        let id = String(target || "");
        if (!id.startsWith("exec-")) {
          const ids = await resolveIds([id || "latest"], env);
          id = ids[0];
        }
        if (!id) return { ok: false, error: { code: "execution_not_found" } };
        const ex = await receipts.readExecution(id, PUBLIC, env);
        if (!ex || !ex.execution) return { ok: false, error: { code: "execution_not_found" } };
        return {
          ok: true,
          execution_id: id,
          execution: ex.execution,
          steps: (Array.isArray(ex.steps) ? ex.steps : []).map((s) => ({
            step_id: s.step_id,
            status: s.status,
            reason_codes: Array.isArray(s.reason_codes) ? s.reason_codes : [],
          })),
        };
      } catch (e) {
        return { ok: false, error: { code: "receipts_read_error", message: String((e && e.message) || e) } };
      }
    },

    // Field-by-field diff of two executions for the comparison family.
    async compareExecutions(targets) {
      try {
        const ids = await resolveIds(targets, env);
        if (ids.length < 2) return { ok: false, error: { code: "operands_unresolved" } };
        const diff = await receipts.diffExecutions(ids[0], ids[1], PUBLIC, env);
        if (!diff || diff.error) return { ok: false, error: { code: (diff && diff.error) || "compare_failed" } };
        return { ok: true, diff, a_id: ids[0], b_id: ids[1] };
      } catch (e) {
        return { ok: false, error: { code: "receipts_read_error", message: String((e && e.message) || e) } };
      }
    },
  };
}
