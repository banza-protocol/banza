// M2.19G.1 (ADR-068) — endpoint-originated operator validation. FULLY HERMETIC.
//
// Every artifact "fetch" goes through an INJECTED fetcher stub that returns the Operador Zero example
// artifacts (examples/operators/zero) shaped as the secure fetcher's FetchResponse — a real network
// call here would be a bug. The tests prove: the nine-step journey resolves the target from the CLOSED
// registry (Rust), fetches each artifact via the injected fetcher, runs the matching Rust/WASM decision
// engine on the FETCHED content, and emits origin-bound receipts with every §30 field; that verdicts
// are real (track fetched content, not hardcoded); that Certification Readiness aggregates without ever
// certifying; that qwen_calls/external_model_calls are 0 and protocol_fetch_count > 0; and the negative
// paths (unknown/ineligible target, fetcher host_mismatch/size_cap) behave correctly.

import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createValidator, STEP_ORDER, RECEIPT_VERSION } from "../src/validate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OZ = path.resolve(__dirname, "../../../examples/operators/zero");

// path -> canonical OZ example file (the ADR-067 served subset + the four ADR-068 endpoints).
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
  "/traces/full-e2e.json": "traces/full-e2e-trace.json",
  "/ledger/demo.json": "ledger/demo-accounts.json",
  "/payments/demo-qr.json": "payments/demo-qr-payment.json",
  "/payments/demo-refund.json": "payments/demo-refund.json",
};

// Build an injected fetcher stub. `opts.fails` maps a path -> reason_code (simulate a fetcher block).
// `opts.overrides` maps a path -> an absolute example file (simulate a different published artifact).
function ozFetcher(opts = {}) {
  const fails = opts.fails || {};
  const overrides = opts.overrides || {};
  const calls = [];
  const impl = async (endpoint, init) => {
    assert.match(endpoint, /\/fetch$/, "fetcher endpoint must be the /fetch route");
    const req = JSON.parse(init.body);
    calls.push(req);
    // The client must only ever pass a registry-resolved origin + host + path (never a URL field).
    assert.ok(req.canonical_origin && req.expected_host && req.path, "fetch request must carry origin/host/path");
    assert.ok(!("url" in req), "fetch request must never carry a caller-supplied url");
    const url = `https://${req.expected_host}${req.path}`;
    const fail = fails[req.path];
    if (fail) {
      return jsonResponse({ ok: false, url, http_status: null, tls_ok: false, redirect_count: 0, fetched_at: nowIso(), duration_ms: 1, request_id: "af-fail", reason_codes: [fail] });
    }
    const file = overrides[req.path] || (OZ_MAP[req.path] ? path.join(OZ, OZ_MAP[req.path]) : null);
    if (!file) {
      return jsonResponse({ ok: false, url, http_status: 404, tls_ok: true, redirect_count: 0, fetched_at: nowIso(), duration_ms: 1, request_id: "af-404", reason_codes: ["http_status_not_ok"] });
    }
    const body = fs.readFileSync(file, "utf8");
    const sha = "sha256:" + crypto.createHash("sha256").update(body).digest("hex");
    return jsonResponse({
      ok: true, url, resolved_host: req.expected_host, resolved_ip: "203.0.113.5", http_status: 200,
      content_type: "application/json", content_length: Buffer.byteLength(body), etag: `"${sha.slice(7, 19)}"`,
      last_modified: "Wed, 29 Jul 2026 20:00:00 GMT", body, sha256: sha, tls_ok: true, redirect_count: 0,
      fetched_at: nowIso(), duration_ms: 4, request_id: "af-ok",
    });
  };
  return { impl, calls };
}

function jsonResponse(obj) {
  return { ok: true, async json() { return obj; } };
}
function nowIso() {
  return new Date().toISOString();
}

// Every §30 OperationReceipt field must be present on every receipt.
const RECEIPT_FIELDS = [
  "receipt_version", "operation_id", "request_id", "workflow", "step", "applicability", "operator_id", "implementation_id",
  "environment", "profile", "protocol_version", "canonical_origin", "endpoint", "resolved_host", "fetched_at",
  "http_status", "content_type", "content_length", "etag", "last_modified", "input_hash", "signature_status",
  "engine", "engine_version", "result", "reason_codes", "evidence_refs", "output_hash", "duration_ms", "duration_us",
  "qwen_calls", "external_model_calls", "protocol_fetch_count", "audit_ref",
];

// ADR-077: Operador Zero is an L0 implementation, so the L2 (interoperability) and L3 (federation) steps
// are NOT_APPLICABLE — sealed as out-of-scope receipts, never fetched or engine-evaluated. Rust decides.
const OZ_NOT_APPLICABLE_STEPS = new Set(["interoperability", "federation"]);

const EXPECTED_ENGINE = {
  discovery: "banza-target-registry",
  manifest: "banza-operator-manifest",
  keys: "banza-trust",
  conformance: "banza-conformance",
  interoperability: "banza-l2-readiness",
  trust: "banza-trust",
  federation: "banza-l3-readiness",
  evidence: "banza-evidence-bundle",
  certification: "banza-target-registry",
};

const ENV = { FETCHER_URL: "http://banza-fetcher:8092" };
const OP = "operator-zero";
const IMPL = "operator-zero-ref-impl";

test("journey emits 9 origin-bound OperationReceipts with every §30 field", async () => {
  const f = ozFetcher();
  const v = createValidator(ENV, { fetchImpl: f.impl });
  const out = await v.validateJourney(OP, IMPL);
  assert.equal(out.ok, true);
  const jr = out.journey_receipt;
  assert.equal(jr.step_count, 9);
  assert.deepEqual(jr.steps.map((s) => s.step), STEP_ORDER);

  for (const r of jr.steps) {
    for (const field of RECEIPT_FIELDS) {
      assert.ok(field in r, `receipt for step ${r.step} missing §30 field ${field}`);
    }
    assert.equal(r.receipt_version, RECEIPT_VERSION);
    assert.equal(r.operator_id, OP);
    assert.equal(r.implementation_id, IMPL);
    assert.equal(r.canonical_origin, "https://zero.banza.network");
    assert.equal(r.resolved_host, "zero.banza.network");
    assert.equal(r.engine, EXPECTED_ENGINE[r.step], `wrong engine for step ${r.step}`);
    assert.equal(r.qwen_calls, 0);
    assert.equal(r.external_model_calls, 0);
    assert.match(r.output_hash, /^sha256:[0-9a-f]{64}$/);
  }
});

test("each fetching step binds its receipt to the real fetched origin (endpoint + http + hash)", async () => {
  const f = ozFetcher();
  const v = createValidator(ENV, { fetchImpl: f.impl });
  const jr = (await v.validateJourney(OP, IMPL)).journey_receipt;
  for (const r of jr.steps) {
    if (r.step === "certification") continue; // aggregation step performs no fetch
    if (r.applicability === "NOT_APPLICABLE") {
      // ADR-077: an out-of-scope step is never fetched — no origin binding, no engine run.
      assert.ok(OZ_NOT_APPLICABLE_STEPS.has(r.step), `only L2/L3 steps are NOT_APPLICABLE for L0, not ${r.step}`);
      assert.equal(r.protocol_fetch_count, 0, `NOT_APPLICABLE step ${r.step} must not fetch`);
      assert.equal(r.result.status, "NOT_EVALUATED");
      continue;
    }
    assert.ok(r.protocol_fetch_count >= 1, `step ${r.step} must have fetched at least one artifact`);
    assert.equal(r.http_status, 200, `step ${r.step} primary fetch should be 200`);
    assert.match(r.endpoint, /^https:\/\/zero\.banza\.network\//, `step ${r.step} endpoint must be the canonical origin`);
    assert.equal(r.content_type, "application/json");
    assert.ok(r.evidence_refs.every((e) => e.includes("#sha256:")), `step ${r.step} evidence must carry content hashes`);
  }
});

test("engine is invoked per step (correct engine mapping)", async () => {
  const v = createValidator(ENV, { fetchImpl: ozFetcher().impl });
  for (const step of STEP_ORDER) {
    const out = await v.validateStep(OP, IMPL, step);
    assert.equal(out.ok, true, `step ${step} should run`);
    assert.equal(out.receipt.engine, EXPECTED_ENGINE[step]);
    if (out.receipt.applicability === "NOT_APPLICABLE") {
      // ADR-077: an out-of-scope step is not evaluated — its engine is named but never invoked (n/a).
      assert.ok(OZ_NOT_APPLICABLE_STEPS.has(step), `only L2/L3 are NOT_APPLICABLE for L0, not ${step}`);
      assert.equal(out.receipt.engine_version, "n/a");
      continue;
    }
    assert.match(out.receipt.engine_version, /^\d+\.\d+\.\d+$/, `engine_version for ${step} should be semver`);
  }
});

test("ADR-077: for the L0 Operador Zero target, L2/L3 steps are NOT_APPLICABLE (out of scope, not failed)", async () => {
  const v = createValidator(ENV, { fetchImpl: ozFetcher().impl });
  const jr = (await v.validateJourney(OP, IMPL)).journey_receipt;
  // Applicability map + summary are Rust-decided and surfaced on the journey receipt.
  assert.equal(jr.applicability.interoperability, "NOT_APPLICABLE");
  assert.equal(jr.applicability.federation, "NOT_APPLICABLE");
  assert.equal(jr.applicability.manifest, "REQUIRED");
  assert.equal(jr.applicability.evidence, "REQUIRED");
  assert.ok(jr.not_applicable_steps.includes("interoperability") && jr.not_applicable_steps.includes("federation"));
  const interop = jr.steps.find((s) => s.step === "interoperability");
  const fed = jr.steps.find((s) => s.step === "federation");
  for (const r of [interop, fed]) {
    assert.equal(r.applicability, "NOT_APPLICABLE");
    assert.equal(r.result.status, "NOT_EVALUATED");
    assert.notEqual(r.result.status, "FAILED", "a NOT_APPLICABLE step is never a technical failure");
    assert.ok(r.reason_codes.some((c) => c.startsWith("STEP_NOT_APPLICABLE_FOR_PROFILE")));
    assert.equal(r.protocol_fetch_count, 0);
  }
  // The certification aggregate excludes NOT_APPLICABLE steps and never counts them as blockers.
  const cert = jr.steps.find((s) => s.step === "certification");
  assert.ok(!cert.blocked_by.includes("interoperability"));
  assert.ok(!cert.blocked_by.includes("federation"));
  assert.equal(cert.result.certification.profile, "L0");
});

test("OZ corrected end-state: all L0-REQUIRED steps VERIFIED, L2/L3 NOT_APPLICABLE, readiness READY (never CERTIFIED)", async () => {
  // The honest target for the L0 Operador Zero reference implementation after the OZ correction:
  // every step that APPLIES to L0 is VERIFIED from real engine verdicts on the fetched OTE/conformance/
  // evidence artifacts; the L2/L3 steps are out of scope (NOT_APPLICABLE); readiness is READY over the
  // REQUIRED steps; and it is NEVER certified. This is not forced green — the verdicts are the engines'.
  const v = createValidator(ENV, { fetchImpl: ozFetcher().impl });
  const jr = (await v.validateJourney(OP, IMPL)).journey_receipt;
  const byStep = Object.fromEntries(jr.steps.map((s) => [s.step, s.result?.status]));
  for (const s of ["discovery", "manifest", "keys", "conformance", "trust", "evidence"]) {
    assert.equal(byStep[s], "VERIFIED", `L0-required step ${s} must be VERIFIED`);
  }
  assert.equal(byStep.interoperability, "NOT_EVALUATED");
  assert.equal(byStep.federation, "NOT_EVALUATED");
  assert.equal(jr.overall_status, "VERIFIED");
  assert.equal(jr.certification_readiness, "READY");
  assert.equal(jr.certification_status, "NOT_CERTIFIED");
  assert.equal(jr.certified, false);
  assert.equal(jr.required_steps_evaluated, 6);
});

test("manifest verdict is real — VALID from the engine on the fetched manifest", async () => {
  const v = createValidator(ENV, { fetchImpl: ozFetcher().impl });
  const out = await v.validateStep(OP, IMPL, "manifest");
  assert.equal(out.receipt.result.status, "VERIFIED");
  assert.equal(out.receipt.result.engine_result.status, "VALID");
  assert.equal(out.receipt.result.engine_result.operator_id, "operator-zero");
  // output_hash must be the real sha256 of the engine output (proves not a hardcoded literal).
  const expected = "sha256:" + crypto.createHash("sha256").update(JSON.stringify(out.receipt.result.engine_result)).digest("hex");
  assert.equal(out.receipt.output_hash, expected);
});

test("verdicts track fetched content — an INVALID published manifest flips the verdict", async () => {
  const good = createValidator(ENV, { fetchImpl: ozFetcher().impl });
  const goodStep = await good.validateStep(OP, IMPL, "manifest");
  assert.equal(goodStep.receipt.result.status, "VERIFIED");

  const invalidManifest = path.join(OZ, "manifest/operator-zero.manifest.invalid.missing-required-field.json");
  const bad = createValidator(ENV, { fetchImpl: ozFetcher({ overrides: { "/.well-known/banza/operator.json": invalidManifest } }).impl });
  const badStep = await bad.validateStep(OP, IMPL, "manifest");
  assert.notEqual(badStep.receipt.result.status, "VERIFIED", "an invalid published manifest must not verify");
  assert.notEqual(badStep.receipt.result.engine_result.status, "VALID");
});

test("Certification Readiness aggregates but never certifies (READY/BLOCKED, never CERTIFIED)", async () => {
  const v = createValidator(ENV, { fetchImpl: ozFetcher().impl });
  const jr = (await v.validateJourney(OP, IMPL)).journey_receipt;
  assert.ok(["READY", "BLOCKED"].includes(jr.certification_readiness));
  assert.equal(jr.certification_status, "NOT_CERTIFIED");
  assert.equal(jr.certified, false);
  assert.notEqual(jr.certification_readiness, "CERTIFIED");

  const cert = jr.steps.find((s) => s.step === "certification");
  assert.equal(cert.result.certification.certification_status, "NOT_CERTIFIED");
  assert.equal(cert.result.certification.certified, false);
  assert.equal(cert.result.certification.aggregated_in, "rust");
  assert.notEqual(cert.result.certification.readiness, "CERTIFIED");
});

test("journey never calls a model and always counts protocol fetches", async () => {
  const v = createValidator(ENV, { fetchImpl: ozFetcher().impl });
  const jr = (await v.validateJourney(OP, IMPL)).journey_receipt;
  assert.equal(jr.qwen_calls, 0);
  assert.equal(jr.external_model_calls, 0);
  assert.ok(jr.protocol_fetch_count > 0, "protocol_fetch_count must be > 0");
  // protocol fetches are NOT external model calls.
  const sumSteps = jr.steps.reduce((n, r) => n + r.protocol_fetch_count, 0);
  assert.equal(jr.protocol_fetch_count, sumSteps);
});

test("negative: unknown operator -> typed reason, no receipts", async () => {
  const v = createValidator(ENV, { fetchImpl: ozFetcher().impl });
  const out = await v.validateJourney("ghost", IMPL);
  assert.equal(out.error, "target_not_resolved");
  assert.equal(out.eligible, false);
  assert.equal(out.reason, "unknown_operator");
  assert.equal(out.journey_receipt, undefined);
});

test("negative: unknown implementation -> typed reason (ineligible target is blocked)", async () => {
  const v = createValidator(ENV, { fetchImpl: ozFetcher().impl });
  const out = await v.validateStep(OP, "some-other-impl", "manifest");
  assert.equal(out.error, "target_not_resolved");
  assert.equal(out.reason, "unknown_implementation");
  assert.equal(out.receipt, undefined);
});

test("negative: fetcher host_mismatch -> step BLOCKED with the reason surfaced in the receipt", async () => {
  const v = createValidator(ENV, { fetchImpl: ozFetcher({ fails: { "/.well-known/banza/operator.json": "host_mismatch" } }).impl });
  const out = await v.validateStep(OP, IMPL, "manifest");
  assert.equal(out.ok, true);
  assert.equal(out.receipt.result.status, "BLOCKED");
  assert.ok(out.receipt.reason_codes.includes("host_mismatch"), "fetcher reason_code must be surfaced");
  assert.ok(out.receipt.reason_codes.includes("FETCH_BLOCKED"));
  assert.equal(out.receipt.engine, "banza-operator-manifest");
});

test("negative: fetcher size_cap_exceeded -> step BLOCKED with the reason surfaced", async () => {
  const v = createValidator(ENV, { fetchImpl: ozFetcher({ fails: { "/evidence-bundle.json": "size_cap_exceeded" } }).impl });
  const out = await v.validateStep(OP, IMPL, "evidence");
  assert.equal(out.receipt.result.status, "BLOCKED");
  assert.ok(out.receipt.reason_codes.includes("size_cap_exceeded"));
});

test("unknown step -> error", async () => {
  const v = createValidator(ENV, { fetchImpl: ozFetcher().impl });
  const out = await v.validateStep(OP, IMPL, "not_a_step");
  assert.equal(out.error, "unknown_step");
});

test("Keys (step 3) and Trust (step 6) are DISTINCT steps even though they share banza-trust", async () => {
  // ADR-076 §D-076-03: step 3 (Keys) foregrounds key material; step 6 (Trust) is the full Open Trust
  // Evaluation. banza-trust has no key-only entrypoint, so both use the same engine BY DESIGN — but the
  // steps must be distinguishable: distinct step ids, distinct receipts (input hashes), and the Keys
  // receipt must carry key-specific reason codes the Trust aggregate does not.
  const v = createValidator(ENV, { fetchImpl: ozFetcher().impl });
  const keys = (await v.validateStep(OP, IMPL, "keys")).receipt;
  const trust = (await v.validateStep(OP, IMPL, "trust")).receipt;

  // Distinct step ids, distinct receipt identities — but the shared engine is recorded on both.
  assert.equal(keys.step, "keys");
  assert.equal(trust.step, "trust");
  assert.notEqual(keys.operation_id, trust.operation_id);
  assert.equal(keys.engine, "banza-trust");
  assert.equal(trust.engine, "banza-trust");

  // The key-material-foregrounded input makes the Keys input hash differ from the Trust assembly.
  assert.notEqual(keys.input_hash, trust.input_hash, "Keys input must foreground key material distinctly");

  // The Keys receipt surfaces key-specific decided checks (KEY_*) that the Trust aggregate does not.
  const keySpecific = keys.reason_codes.filter((c) => c.startsWith("KEY_"));
  assert.ok(keySpecific.length > 0, "Keys receipt must carry key-specific reason codes");
  assert.ok(
    keySpecific.some((c) => c.startsWith("KEY_SIGNATURE:") || c.startsWith("KEY_REVOCATION:") || c.startsWith("KEY_SIGNED_METADATA:")),
    "Keys reason codes must reflect key material (signature / revocation / signed-metadata)"
  );
  assert.ok(trust.reason_codes.every((c) => !c.startsWith("KEY_")), "Trust aggregate must not carry KEY_* codes");
});
