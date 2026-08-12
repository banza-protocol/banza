// BZO-8 (ADR-078 telemetry correctness) — proves two things end to end, hermetically:
//
//  (A) INSTRUMENTATION. The certification step (step 9) times ONLY its own aggregation work. Before the
//      1.1.0 fix it was back-dated to the journey t0, so its [started_at, completed_at] spanned the whole
//      journey and its per-step telemetry read ≈ the journey median (a false "slowest step"). Here we run
//      the real nine-step journey (receipts DISABLED — no DB) and assert the certification receipt starts
//      only AFTER every technical step has completed, and its span is a small fraction of the journey.
//
//  (B) RENDERER. Given comparable metrics where the certification step is near-instant and `keys` is the
//      slowest real step, the "slowest step" answer names Keys — never Prontidão de certificação — and the
//      journey answer carries the §2 provenance line (n, period, linear-interpolation method, unit,
//      instrumentation version, reproductions-excluded note). Numbers are surfaced verbatim; nothing is
//      inferred.

import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createValidator, STEP_ORDER, RECEIPT_VERSION } from "../src/validate.js";
import { createTelemetryTool } from "../src/telemetry.js";

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

// (A) INSTRUMENTATION — the certification step no longer spans the whole journey.
test("(bzo-8) certification step times only its own work, not the journey span", async () => {
  const v = createValidator({ FETCHER_URL: "http://banza-fetcher:8092" }, { fetchImpl: ozFetcher().impl });
  const out = await v.validateJourney("operator-zero", "operator-zero-ref-impl");
  assert.equal(out.ok, true);
  const steps = out.journey_receipt.steps;
  assert.deepEqual(steps.map((s) => s.step), STEP_ORDER);

  const cert = steps.find((s) => s.step === "certification");
  const technical = steps.filter((s) => s.step !== "certification");
  const ms = (iso) => Date.parse(iso);

  // The certification step starts only AFTER every technical step has completed (it aggregates them).
  const lastTechnicalCompleted = Math.max(...technical.map((s) => ms(s.completed_at)));
  assert.ok(
    ms(cert.started_at) >= lastTechnicalCompleted - 2, // ≥ (small clock tolerance)
    `certification.started_at (${cert.started_at}) must be at/after the last technical completed_at`,
  );

  // Its span is self-consistent and NOT the whole-journey span (the old bug set it = journey duration).
  // certSpan (an ISO-timestamp difference) and duration_ms (a separate timer reading) are measured
  // independently, so under load they can differ by ~1ms of clock jitter; assert they agree within 1ms
  // (the "own work, not the journey span" property is enforced strictly by the journey-fraction check below).
  const certSpan = ms(cert.completed_at) - ms(cert.started_at);
  assert.ok(
    Math.abs(certSpan - cert.duration_ms) <= 1,
    `certification duration_ms (${cert.duration_ms}) must equal its own timestamp span (${certSpan}) within clock jitter`,
  );
  const firstStart = Math.min(...steps.map((s) => ms(s.started_at)));
  const lastEnd = Math.max(...steps.map((s) => ms(s.completed_at)));
  const journeySpan = lastEnd - firstStart;
  assert.ok(
    certSpan <= journeySpan / 2 || certSpan < 50,
    `certification span (${certSpan}ms) must be a small fraction of the journey (${journeySpan}ms), not ≈ the whole journey`,
  );
  // The pre-1.1.0 bug back-dated certification.started_at to the journey start; it must NOT anymore.
  assert.ok(ms(cert.started_at) > firstStart, "certification must not start at the journey t0");
  assert.equal(cert.receipt_version, RECEIPT_VERSION);
});

// (B) RENDERER — slowest-step answer is truthful; journey answer carries the provenance/method line.
function metrics() {
  return {
    n: 5, comparable_execution_count: 5, reproductions_excluded: 2,
    latest: {
      execution_id: "exec-473f55a8", total_ms: 1072, profile: "L0", environment: "sandbox",
      protocol_version: "1.0.0", implementation_id: "operator-zero-ref-impl",
      orchestrator_version: "1.1.0", overall_status: "VERIFIED", completed_at: "2026-08-05T16:44:04Z",
    },
    avg_ms: 1200, min_ms: 1000, max_ms: 1500, median_ms: 1150, p95_ms: 1450,
    per_step: [
      { step_id: "keys", step_order: 3, n: 5, avg_ms: 380, median_ms: 390, max_ms: 400 },
      { step_id: "trust", step_order: 6, n: 5, avg_ms: 300, median_ms: 300, max_ms: 340 },
      { step_id: "certification", step_order: 9, n: 5, avg_ms: 3, median_ms: 3, max_ms: 5 },
    ],
    observed_from: "2026-08-05T13:00:00Z", observed_to: "2026-08-05T16:44:04Z",
    scope: {
      operator_id: "operator-zero", implementation_id: "operator-zero-ref-impl", profile: "L0",
      environment: "sandbox", protocol_version: "1.0.0", orchestrator_version: "1.1.0", workspace: "public",
    },
    aggregation_method: { unit: "ms" },
  };
}

test("(bzo-8) slowest-step answer names the real slowest step (Keys), never certification", async () => {
  const tool = createTelemetryTool({}, { readDurationMetrics: async () => metrics() });
  const res = await tool.getDuration({ intent: "get_metric", subject: "validation_step", metric: "slowest_step" });
  assert.equal(res.ok, true);
  assert.match(res.answer_markdown, /Keys/);
  assert.doesNotMatch(res.answer_markdown, /Prontidão de certificação/);
});

test("(bzo-8) journey answer carries the §2 provenance line (n, period, method, instrumentation, repro)", async () => {
  const tool = createTelemetryTool({}, { readDurationMetrics: async () => metrics() });
  const res = await tool.getDuration({ intent: "get_duration", subject: "validation_journey", metric: "elapsed_time", aggregation: "median" });
  assert.equal(res.ok, true);
  assert.match(res.answer_markdown, /interpolação linear/);
  assert.match(res.answer_markdown, /n = 5/);
  assert.match(res.answer_markdown, /2 reprodução/); // reproductions excluded, stated (never silent)
  assert.match(res.answer_markdown, /1\.1\.0/); // instrumentation version surfaced
  // The typed view carries the formal method + counts for the UI.
  assert.equal(res.duration.reproductions_excluded, 2);
  assert.equal(res.duration.orchestrator_version, "1.1.0");
  assert.match(res.duration.percentile_method, /percentile_cont/);
  // Claim taxonomy: latest is SUPPORTED, median/p95 are DERIVED; nothing ESTIMATED/UNSUPPORTED here.
  const cats = Object.fromEntries(res.claims.map((c) => [c.claim, c.category]));
  assert.equal(cats.latest_observed_total, "SUPPORTED");
  assert.equal(cats.median_total, "DERIVED");
  assert.equal(cats.p95_total, "DERIVED");
});
