import { describe, it, expect } from "vitest";
import type { ServerOperationReceipt, ServerJourneyReceipt } from "./operationReceipt";

// M2.19G.1 (ADR-068 §30/§31) — the server-issued receipts bind every verdict to the EXACT origin of its
// inputs. This test pins the origin-field contract: a value typed as ServerOperationReceipt /
// ServerJourneyReceipt must carry the full §30 / §31 field set (tsc enforces the type at compile time;
// this asserts the keys are present at runtime so the contract can never silently shrink).

// §30 OperationReceipt origin field set.
const OP_FIELDS = [
  "receipt_version", "operation_id", "request_id", "workflow", "step",
  "operator_id", "implementation_id", "environment", "profile", "protocol_version",
  "canonical_origin", "endpoint", "resolved_host", "fetched_at", "http_status",
  "content_type", "content_length", "etag", "last_modified", "input_hash",
  "signature_status", "engine", "engine_version", "result", "reason_codes",
  "evidence_refs", "output_hash", "duration_ms", "qwen_calls", "external_model_calls",
  "protocol_fetch_count", "audit_ref",
] as const;

// §31 JourneyReceipt field set.
const JOURNEY_FIELDS = [
  "receipt_version", "journey_id", "request_id", "workflow", "operator_id", "implementation_id",
  "environment", "profile", "protocol_version", "canonical_origin", "resolved_host",
  "started_at", "finished_at", "duration_ms", "step_count", "steps", "overall_status",
  "certification_readiness", "certification_status", "certified", "reason_codes",
  "qwen_calls", "external_model_calls", "protocol_fetch_count", "audit_ref", "disclaimer",
] as const;

// A representative endpoint-originated step receipt (as validate.js emits it).
const opReceipt: ServerOperationReceipt = {
  receipt_version: "1.0.0",
  operation_id: "op-1",
  request_id: "req-1",
  workflow: "operator-validation",
  step: "manifest",
  operator_id: "operator-zero",
  implementation_id: "operator-zero-ref-impl",
  environment: "sandbox",
  profile: "L0",
  protocol_version: "1.0.0",
  canonical_origin: "https://zero.banza.network",
  endpoint: "https://zero.banza.network/.well-known/banza/operator.json",
  resolved_host: "zero.banza.network",
  fetched_at: "2026-07-29T00:00:00.000Z",
  http_status: 200,
  content_type: "application/json",
  content_length: 1234,
  etag: 'W/"abc"',
  last_modified: "Wed, 29 Jul 2026 00:00:00 GMT",
  input_hash: "sha256:deadbeef",
  signature_status: "not_applicable",
  engine: "banza-operator-manifest",
  engine_version: "0.1.0",
  result: { status: "VERIFIED" },
  reason_codes: [],
  evidence_refs: ["https://zero.banza.network/.well-known/banza/operator.json#sha256:deadbeef"],
  output_hash: "sha256:cafebabe",
  duration_ms: 12,
  qwen_calls: 0,
  external_model_calls: 0,
  protocol_fetch_count: 1,
  audit_ref: "req-1:fetch-1",
};

const journeyReceipt: ServerJourneyReceipt = {
  receipt_version: "1.0.0",
  journey_id: "journey-1",
  request_id: "req-1",
  workflow: "operator-validation",
  operator_id: "operator-zero",
  implementation_id: "operator-zero-ref-impl",
  environment: "sandbox",
  profile: "L0",
  protocol_version: "1.0.0",
  canonical_origin: "https://zero.banza.network",
  resolved_host: "zero.banza.network",
  started_at: "2026-07-29T00:00:00.000Z",
  finished_at: "2026-07-29T00:00:01.000Z",
  duration_ms: 1000,
  step_count: 9,
  steps: [opReceipt],
  overall_status: "VERIFIED",
  certification_readiness: "BLOCKED",
  certification_status: "NOT_CERTIFIED",
  certified: false,
  reason_codes: [],
  qwen_calls: 0,
  external_model_calls: 0,
  protocol_fetch_count: 9,
  audit_ref: "req-1",
  disclaimer: "Rust decides; a IA nunca decide.",
};

describe("OperationReceipt — §30 origin-field contract", () => {
  it("carries every §30 origin field", () => {
    for (const k of OP_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(opReceipt, k), `missing §30 field: ${k}`).toBe(true);
    }
  });

  it("counts protocol fetches — never as external/qwen model calls (ADR-068 §4.8)", () => {
    expect(opReceipt.qwen_calls).toBe(0);
    expect(opReceipt.external_model_calls).toBe(0);
    expect(opReceipt.protocol_fetch_count).toBeGreaterThanOrEqual(1);
  });

  it("binds the verdict to a real public origin", () => {
    expect(opReceipt.endpoint).toContain(opReceipt.canonical_origin);
    expect(opReceipt.resolved_host).toBe("zero.banza.network");
    expect(opReceipt.output_hash).toMatch(/^sha256:/);
  });
});

describe("JourneyReceipt — §31 field contract", () => {
  it("carries every §31 field, incl. steps / hashes / protocol_fetch_count", () => {
    for (const k of JOURNEY_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(journeyReceipt, k), `missing §31 field: ${k}`).toBe(true);
    }
    // The per-step receipts carry the endpoints-consulted + hashes.
    expect(Array.isArray(journeyReceipt.steps)).toBe(true);
    expect(journeyReceipt.steps[0].endpoint).toBeTruthy();
    expect(journeyReceipt.steps[0].output_hash).toMatch(/^sha256:/);
  });

  it("keeps Certification Readiness distinct from Certification Status; never CERTIFIED", () => {
    expect(["READY", "BLOCKED"]).toContain(journeyReceipt.certification_readiness);
    expect(journeyReceipt.certification_status).toBe("NOT_CERTIFIED");
    expect(journeyReceipt.certified).toBe(false);
  });
});
