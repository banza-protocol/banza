// BZO-9 (ADR-078 telemetry precision) — proves the two precisions, hermetically:
//
//  §1.1 execution-kind classification: the duration renderer distinguishes genuine USER_REQUESTED journeys
//       from non-user samples (SYSTEM_E2E / benchmark / unclassified). When the only measurements available
//       are non-user, the answer OPENS with an explicit honest clause and states observed/comparable/excluded;
//       a normal USER_REQUESTED answer renders as before and STILL appends the transparency counts line.
//
//  §1.2 monotonic + sub-millisecond duration: each step receipt and the journey receipt carry a monotonic
//       microsecond duration (duration_us); fmtDuration renders a positive sub-millisecond value as "< 1 ms"
//       (never "0 ms") and a genuine 0 as "—"; and the duration-selection helper prefers duration_us over
//       wall-clock, never yielding a negative duration even with a backwards wall clock.

import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createValidator } from "../src/validate.js";
import { createTelemetryTool, fmtDuration } from "../src/telemetry.js";
import { effectiveDurationMs } from "../src/receipts/store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OZ = path.resolve(__dirname, "../../../examples/operators/zero");
const OZ_MAP = {
  "/discovery.json": "discovery/discovery.json",
  "/.well-known/banza/operator.json": "manifest/operator-zero.manifest.valid.json",
  "/key-manifest.json": "keys/demo-key-manifest.json",
  "/.well-known/banza/signed-protocol-metadata.json": "metadata/signed-metadata.json",
  "/capabilities.json": "capabilities/capabilities.json",
  "/conformance/evidence.json": "conformance/conformance-pass.json",
  "/revocation-list.json": "keys/revocation-list.demo.json",
  "/federation/metadata.json": "federation/federation-metadata.json",
  "/federation-metadata.json": "federation/federation-metadata.json",
  "/evidence-bundle.json": "evidence-bundle/evidence-bundle.complete.json",
};

function ozFetcher() {
  const impl = async (endpoint, init) => {
    const req = JSON.parse(init.body);
    const url = `https://${req.expected_host}${req.path}`;
    const file = OZ_MAP[req.path] ? path.join(OZ, OZ_MAP[req.path]) : null;
    if (!file) {
      return { ok: true, async json() { return { ok: false, url, http_status: 404, tls_ok: true, redirect_count: 0, fetched_at: new Date().toISOString(), duration_ms: 1, request_id: "af-404", reason_codes: ["http_status_not_ok"] }; } };
    }
    const body = fs.readFileSync(file, "utf8");
    const sha = "sha256:" + crypto.createHash("sha256").update(body).digest("hex");
    return { ok: true, async json() { return {
      ok: true, url, resolved_host: req.expected_host, resolved_ip: "203.0.113.5", http_status: 200,
      content_type: "application/json", content_length: Buffer.byteLength(body), etag: `"x"`,
      last_modified: "Wed, 29 Jul 2026 20:00:00 GMT", body, sha256: sha, tls_ok: true, redirect_count: 0,
      fetched_at: new Date().toISOString(), duration_ms: 4, request_id: "af-ok",
    }; } };
  };
  return { impl };
}

// ── §1.2 — receipts carry a monotonic microsecond duration ────────────────────────────────────────
test("(bzo-9) certification step + journey receipts carry a small, self-consistent duration_us", async () => {
  const v = createValidator({ FETCHER_URL: "http://banza-fetcher:8092" }, { fetchImpl: ozFetcher().impl });
  const out = await v.validateJourney("operator-zero", "operator-zero-ref-impl");
  assert.equal(out.ok, true);
  const steps = out.journey_receipt.steps;

  // Every step receipt carries a numeric duration_us (0 allowed for NOT_APPLICABLE steps).
  for (const st of steps) {
    assert.equal(typeof st.duration_us, "number", `step ${st.step} must carry a numeric duration_us`);
    assert.ok(st.duration_us >= 0, `step ${st.step} duration_us must be >= 0`);
  }

  const cert = steps.find((s) => s.step === "certification");
  assert.ok(cert.duration_us >= 0);
  // Self-consistent with its own wall-clock duration_ms (same interval, two clocks) — small tolerance.
  assert.ok(Math.abs(cert.duration_us / 1000 - cert.duration_ms) < 5, "cert duration_us ≈ duration_ms");

  // Journey receipt carries a positive monotonic duration; the cert step is a small fraction of it (it only
  // brackets its own aggregation, never the whole journey — the BZO-8 correction, now measured monotonically).
  const jus = out.journey_receipt.duration_us;
  assert.equal(typeof jus, "number");
  assert.ok(jus > 0, "journey duration_us must be positive");
  assert.ok(cert.duration_us <= jus, "cert step is a sub-part of the journey");
  assert.ok(cert.duration_us <= jus / 2 || cert.duration_us < 50000, "cert span is a small fraction of the journey");
});

// ── §1.2 — fmtDuration: sub-millisecond renders "< 1 ms", genuine 0 renders "—" ────────────────────
test("(bzo-9) fmtDuration renders sub-millisecond and zero correctly", () => {
  assert.equal(fmtDuration(0.4), "< 1 ms");
  assert.equal(fmtDuration(0), "—");
  assert.equal(fmtDuration(null), "—");
  assert.equal(fmtDuration(0.0004), "< 1 ms"); // 0.4 µs expressed as ms
  assert.equal(fmtDuration(286), "286 ms");
  assert.equal(fmtDuration(1500), "1.5 s");
  assert.equal(fmtDuration(2500), "2.5 s");
});

// ── §1.2 — duration selection prefers monotonic µs; never negative ─────────────────────────────────
test("(bzo-9) effectiveDurationMs prefers duration_us over wall-clock and is never negative", () => {
  // Prefers duration_us over wall-clock.
  assert.equal(
    effectiveDurationMs({ duration_us: 2500, started_at: "2026-08-05T10:00:00.000Z", completed_at: "2026-08-05T10:00:01.000Z" }),
    2.5,
  );
  // Equal wall-clock timestamps with a positive duration_us → positive duration.
  assert.ok(
    effectiveDurationMs({ duration_us: 800, started_at: "2026-08-05T10:00:00.000Z", completed_at: "2026-08-05T10:00:00.000Z" }) > 0,
  );
  // Missing duration_us (historical) → falls back to wall-clock.
  assert.equal(
    effectiveDurationMs({ started_at: "2026-08-05T10:00:00.000Z", completed_at: "2026-08-05T10:00:00.286Z" }),
    286,
  );
  // A backwards wall clock (completed_at < started_at) WITH a positive duration_us → the positive monotonic
  // value, never a negative duration.
  const d = effectiveDurationMs({ duration_us: 1500, started_at: "2026-08-05T10:00:05.000Z", completed_at: "2026-08-05T10:00:00.000Z" });
  assert.equal(d, 1.5);
  assert.ok(d > 0);
});

// ── §1.1 — renderer kind filtering: honest non-user clause + transparency counts ───────────────────
function nonUserMetrics() {
  return {
    n: 12, comparable_execution_count: 12, reproductions_excluded: 0,
    observed: 12, comparable: 0,
    excluded: { system_e2e: 12, benchmark: 0, reproduction: 0, unclassified: 0 },
    execution_kind: "SYSTEM_E2E", sample_kind: "SYSTEM_E2E", only_non_user_samples: true,
    latest: {
      execution_id: "exec-nonuser", total_ms: 1000, profile: "L0", environment: "sandbox",
      protocol_version: "1.0.0", implementation_id: "operator-zero-ref-impl",
      orchestrator_version: "1.1.0", overall_status: "VERIFIED", completed_at: "2026-08-05T16:00:00Z",
    },
    avg_ms: 1050, min_ms: 900, max_ms: 1200, median_ms: 1000, p95_ms: 1180,
    per_step: [], observed_from: "2026-08-05T13:00:00Z", observed_to: "2026-08-05T16:00:00Z",
    scope: {
      operator_id: "operator-zero", implementation_id: "operator-zero-ref-impl", profile: "L0",
      environment: "sandbox", protocol_version: "1.0.0", orchestrator_version: "1.1.0", workspace: "public",
    },
    aggregation_method: { unit: "ms" },
  };
}
function userMetrics() {
  return {
    n: 5, comparable_execution_count: 5, reproductions_excluded: 1,
    observed: 6, comparable: 5,
    excluded: { system_e2e: 1, benchmark: 0, reproduction: 1, unclassified: 0 },
    execution_kind: "USER_REQUESTED", sample_kind: "USER_REQUESTED", only_non_user_samples: false,
    latest: {
      execution_id: "exec-user", total_ms: 1072, profile: "L0", environment: "sandbox",
      protocol_version: "1.0.0", implementation_id: "operator-zero-ref-impl",
      orchestrator_version: "1.1.0", overall_status: "VERIFIED", completed_at: "2026-08-05T16:44:04Z",
    },
    avg_ms: 1200, min_ms: 1000, max_ms: 1500, median_ms: 1150, p95_ms: 1450,
    per_step: [], observed_from: "2026-08-05T13:00:00Z", observed_to: "2026-08-05T16:44:04Z",
    scope: {
      operator_id: "operator-zero", implementation_id: "operator-zero-ref-impl", profile: "L0",
      environment: "sandbox", protocol_version: "1.0.0", orchestrator_version: "1.1.0", workspace: "public",
    },
    aggregation_method: { unit: "ms" },
  };
}

test("(bzo-9) only non-user samples → explicit honest clause + observed/comparable/excluded line", async () => {
  const tool = createTelemetryTool({}, { readDurationMetrics: async () => nonUserMetrics() });
  const res = await tool.getDuration({ intent: "get_duration", subject: "validation_journey", metric: "elapsed_time", aggregation: "median" });
  assert.equal(res.ok, true);
  // The honest opener, the count, and the explicit non-user label.
  assert.match(res.answer_markdown, /Não há jornadas de utilizador comparáveis/);
  assert.match(res.answer_markdown, /12/);
  assert.match(res.answer_markdown, /execução\(ões\) de teste do sistema/);
  // Transparency counts line: 0 comparable user runs, 12 excluded (all system-test).
  assert.match(res.answer_markdown, /observadas 12/);
  assert.match(res.answer_markdown, /comparáveis 0/);
  assert.match(res.answer_markdown, /excluídas 12/);
  // The typed view labels the sample honestly for the UI.
  assert.equal(res.duration.only_non_user_samples, true);
  assert.equal(res.duration.sample_kind, "SYSTEM_E2E");
});

test("(bzo-9) comparable user runs → normal answer + appended observed/comparable/excluded line", async () => {
  const tool = createTelemetryTool({}, { readDurationMetrics: async () => userMetrics() });
  const res = await tool.getDuration({ intent: "get_duration", subject: "validation_journey", metric: "elapsed_time", aggregation: "median" });
  assert.equal(res.ok, true);
  // Normal phrasing — NOT the honest non-user opener.
  assert.doesNotMatch(res.answer_markdown, /Não há jornadas de utilizador comparáveis/);
  assert.match(res.answer_markdown, /execuções públicas comparáveis/);
  // Transparency counts line reflects the real observed/comparable/excluded split.
  assert.match(res.answer_markdown, /observadas 6/);
  assert.match(res.answer_markdown, /comparáveis 5/);
  assert.match(res.answer_markdown, /excluídas 2/);
  assert.equal(res.duration.only_non_user_samples, false);
  assert.equal(res.duration.execution_kind, "USER_REQUESTED");
});
