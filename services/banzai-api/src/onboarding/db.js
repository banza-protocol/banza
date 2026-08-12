// PostgreSQL access for onboarding (M2.19G.3, ADR-069). Mirrors verification-api/src/db.js but
// connects as the RW role `banzai_rw` (compose already wires DATABASE_URL for it). The onboarding
// tables (email_challenges, candidate_sessions, candidates, candidate_implementations,
// origin_challenges, onboarding_audit) are the ONLY tables this layer writes; it never touches
// operators/certificates/ledger. A DB outage NEVER crashes the process — callers get a thrown error
// they translate into a safe JSON envelope.

import pg from "pg";

const { Pool } = pg;

let pool = null;

export function getPool(env = process.env) {
  if (pool) return pool;
  const connectionString = env.DATABASE_URL;
  if (!connectionString) return null;
  pool = new Pool({
    connectionString,
    max: 4,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
    application_name: "banzai-onboarding",
  });
  pool.on("error", (err) => {
    console.error(JSON.stringify({ level: "error", msg: "onboarding pg pool error", error: err.message }));
  });
  return pool;
}

// Run a query on the shared pool. Throws on any failure; callers catch and fail safe.
export async function query(text, params = [], env = process.env) {
  const p = getPool(env);
  if (!p) throw new Error("DATABASE_URL not configured");
  const client = await p.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// Run `fn(client)` inside a single transaction (BEGIN/COMMIT, ROLLBACK on throw). Used for the
// multi-write steps (verify OTP → issue session → advance candidate) so a partial state is impossible.
export async function withTransaction(fn, env = process.env) {
  const p = getPool(env);
  if (!p) throw new Error("DATABASE_URL not configured");
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore rollback failure — the original error is what matters */
    }
    throw err;
  } finally {
    client.release();
  }
}

// Liveness probe for /health. Returns true/false, never throws.
export async function dbHealthy(env = process.env) {
  try {
    const r = await query("select 1 as ok", [], env);
    return r.rows.length === 1 && r.rows[0].ok === 1;
  } catch {
    return false;
  }
}
