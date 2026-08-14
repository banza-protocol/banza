// Service-local durable OUTBOX for the validation receipt store (ADR-036, correction 1).
//
// When PostgreSQL is unavailable at persist time, a receipt is NOT lost and is NOT faked: the exact
// canonical payload (with its hash, ids, engine version and ORIGINAL timestamps) is appended to a local
// append-only journal and retried later. A retry re-persists the SAME payload — it NEVER re-runs the
// engine and never recomputes a verdict (the canonical hash is a pure function of the payload, so it is
// reproduced identically). If no writable journal directory is configured, the caller reports an EXPLICIT
// persistence failure (PERSISTENCE_FAILED) instead of pretending the receipt is durable.
//
// Journal format: one JSON object per line (JSONL). Each record: {kind, execution_id, payload, sha256,
// enqueued_at, attempts}. Drain rewrites the file with only the still-failing records (temp + rename).

import fs from "node:fs";
import path from "node:path";

function dir(env) {
  return env.BANZAI_RECEIPTS_OUTBOX_DIR || null;
}

function journalPath(env) {
  const d = dir(env);
  return d ? path.join(d, "receipts-outbox.jsonl") : null;
}

// Is a durable outbox available (a configured, writable directory)?
export function isAvailable(env = process.env) {
  const d = dir(env);
  if (!d) return false;
  try {
    fs.mkdirSync(d, { recursive: true });
    fs.accessSync(d, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

// Append one pending record. Returns true if durably enqueued, false if no writable journal.
export function enqueue(record, env = process.env) {
  if (!isAvailable(env)) return false;
  const line = JSON.stringify({ ...record, enqueued_at: record.enqueued_at || null, attempts: record.attempts || 0 }) + "\n";
  try {
    fs.appendFileSync(journalPath(env), line, "utf8");
    return true;
  } catch (err) {
    console.log(JSON.stringify({ level: "error", msg: "outbox enqueue failed", component: "banzai-receipts", error: err.message }));
    return false;
  }
}

// Read all pending records (best-effort; a malformed line is skipped, never throws).
export function readAll(env = process.env) {
  const p = journalPath(env);
  if (!p || !fs.existsSync(p)) return [];
  const out = [];
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try { out.push(JSON.parse(t)); } catch { /* skip corrupt line */ }
  }
  return out;
}

// Rewrite the journal atomically with the given records (drop = drained-successfully).
function rewrite(records, env = process.env) {
  const p = journalPath(env);
  if (!p) return;
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : ""), "utf8");
  fs.renameSync(tmp, p);
}

let draining = false;

// Drain: attempt to persist each pending record via `persistOne(record)` (returns true on success).
// Successful records are removed; failures are kept with an incremented attempt count. Single-flight.
export async function drain(persistOne, env = process.env) {
  if (draining || !isAvailable(env)) return { drained: 0, remaining: 0, skipped: draining };
  draining = true;
  try {
    const pending = readAll(env);
    if (pending.length === 0) return { drained: 0, remaining: 0 };
    const keep = [];
    let drained = 0;
    for (const rec of pending) {
      let ok = false;
      try { ok = await persistOne(rec); } catch { ok = false; }
      if (ok) drained++;
      else keep.push({ ...rec, attempts: (rec.attempts || 0) + 1 });
    }
    rewrite(keep, env);
    return { drained, remaining: keep.length };
  } finally {
    draining = false;
  }
}

export function pendingCount(env = process.env) {
  return readAll(env).length;
}
