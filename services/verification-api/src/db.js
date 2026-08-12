// PostgreSQL access for the verification-api.
//
// Read-only by design: the API connects as the segregated `banza_ro` role (see
// postgres/init/001_schema.sql) which is granted only SELECT on public artifacts.
// Every query is wrapped so a DB outage NEVER crashes the process — callers get a
// thrown error they translate into a safe JSON envelope.

import pg from "pg";

const { Pool } = pg;

// A single lazily-created pool. If DATABASE_URL is absent we still boot (health
// reports the DB as unconfigured) so the app fails safe instead of crashing.
let pool = null;

export function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  pool = new Pool({
    connectionString,
    max: 4,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
    // The verification-api only ever reads. Belt-and-suspenders against writes.
    application_name: "banza-verification-api",
  });
  // Never let an idle-client error take the process down.
  pool.on("error", (err) => {
    console.error(JSON.stringify({ level: "error", msg: "pg pool error", error: err.message }));
  });
  return pool;
}

// Run a read query. Throws on any failure (no DB, timeout, SQL error) — callers
// catch and return a pre-production/degraded JSON envelope.
export async function query(text, params = []) {
  const p = getPool();
  if (!p) throw new Error("DATABASE_URL not configured");
  const client = await p.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// Lightweight DB liveness probe for /health. Returns true/false, never throws.
export async function dbHealthy() {
  try {
    const r = await query("select 1 as ok");
    return r.rows.length === 1 && r.rows[0].ok === 1;
  } catch {
    return false;
  }
}

// Read the protocol phase from the DB (source of truth), falling back to the
// PROTOCOL_PHASE env var, then to "pre-production". Never throws.
export async function protocolPhase() {
  try {
    const r = await query("select v #>> '{}' as phase from protocol_state where k = 'phase'");
    if (r.rows[0]?.phase) return r.rows[0].phase;
  } catch {
    /* fall through to env/default */
  }
  return process.env.PROTOCOL_PHASE || "pre-production";
}
