// Route handlers for the canonical BANZA machine routes.
//
// Every handler returns { code, body } where body is a plain object serialised as
// application/json. In pre-production the routes never fabricate production data:
// no published operator evidence, no private keys. They carry an honest envelope
// that states the pre-production posture. In BANZA participation is demonstrated by verifiable
// evidence, not granted by a central authority.

import { query, protocolPhase } from "./db.js";

const NOTE =
  "A conformance PASS is verifiable technical evidence, not an approval or a grant of status. " +
  "In BANZA, participation is demonstrated by verifiable evidence, not authorised by a central authority. " +
  "No operator has published production evidence in this environment. BANZA does not centrally certify operators. " +
  "This data is served from the BANZA protocol-state database, which stores protocol state, not financial value: " +
  "no funds, balances, real payment transactions or private keys (ADR-042).";

// Shared pre-production envelope. `data` carries the (empty) real payload.
async function envelope(extra = {}) {
  const phase = await protocolPhase();
  const preProd = phase !== "production";
  return {
    protocol: "BANZA",
    status: phase,
    pre_production: preProd,
    // No certification-record store exists in this service: the flag stays false
    // until real production certification records are indexed — never phase-derived.
    production_certificates: false,
    note: NOTE,
    ...extra,
  };
}

// GET /health — app liveness + DB readiness. Always 200 (liveness); the body
// reflects whether the DB is reachable so orchestration can gate on readiness.
export async function health() {
  let db = "down";
  try {
    const r = await query("select 1 as ok");
    db = r.rows[0]?.ok === 1 ? "up" : "down";
  } catch {
    db = "down";
  }
  const phase = await protocolPhase();
  return { code: 200, body: { status: "ok", app: "verification-api", db, phase, ready: db === "up" } };
}

// GET /.well-known/banza/root.json — current signed root manifest (public blob).
export async function rootManifest() {
  try {
    const r = await query(
      "select raw, version, root_key_id, published_at, expires_at from root_manifest where is_current = true order by version desc limit 1"
    );
    if (r.rows[0]) {
      return { code: 200, body: await envelope({ data: r.rows[0].raw }) };
    }
    return { code: 200, body: await envelope({ data: null }) };
  } catch {
    return { code: 503, body: await envelope({ data: null, degraded: true, error: "registry temporarily unavailable" }) };
  }
}

// GET /.well-known/banza/key-manifest.json — current signed public issuer-key manifest.
export async function keyManifest() {
  try {
    const r = await query(
      "select raw, version, root_key_id, published_at, expires_at from key_manifest where is_current = true order by version desc limit 1"
    );
    return { code: 200, body: await envelope({ data: r.rows[0]?.raw ?? null }) };
  } catch {
    return { code: 503, body: await envelope({ data: null, degraded: true, error: "registry temporarily unavailable" }) };
  }
}

// GET /operators — public protocol registry: an index of operator metadata + the
// published, self-verifiable evidence each operator points to. It is not an approval
// list: listing grants nothing, absence forbids nothing (ADR-038). Empty in
// pre-production. Returns a bare JSON array (ADR-031 / annex §12).
export async function operators() {
  try {
    const r = await query(
      "select operator_id, operator_name, operator_url, status from operators where status = 'active' order by operator_id"
    );
    return { code: 200, body: r.rows }; // [] while no operator has published evidence
  } catch {
    // Fail safe: an outage must not look like "operators exist". Return empty list.
    return { code: 503, body: [] };
  }
}

// GET /federation/revocation-list.json — signed BRL snapshot + entries.
export async function revocationList() {
  try {
    const snap = await query(
      "select list_version, issuer_key_id, issued_at, next_update from brl_snapshot where is_current = true order by list_version desc limit 1"
    );
    const s = snap.rows[0];
    let entries = [];
    if (s) {
      const e = await query(
        "select operator_id, revoked_ref, reason, revoked_at from brl_entry where list_version = $1 order by revoked_at",
        [s.list_version]
      );
      entries = e.rows;
    }
    return {
      code: 200,
      body: await envelope({
        list_version: s?.list_version ?? 0,
        issued_at: s?.issued_at ?? null,
        next_update: s?.next_update ?? null,
        entries,
        count: entries.length,
      }),
    };
  } catch {
    return { code: 503, body: await envelope({ list_version: 0, entries: [], count: 0, degraded: true, error: "registry temporarily unavailable" }) };
  }
}

// GET /conformance/evidence — conformance evidence hashes. PASS = verifiable evidence.
export async function conformanceEvidence() {
  try {
    const r = await query(
      "select evidence_id, operator_id, level_attempted, suite_version, report_sha256, produced_at, source_url, result from conformance_evidence order by produced_at desc"
    );
    return {
      code: 200,
      body: await envelope({
        evidence: r.rows,
        count: r.rows.length,
        clarification: "A conformance PASS recorded here is verifiable technical evidence only. It confers no status: in BANZA, participation is demonstrated by evidence, not granted by a central authority.",
      }),
    };
  } catch {
    return { code: 503, body: await envelope({ evidence: [], count: 0, degraded: true, error: "registry temporarily unavailable" }) };
  }
}
