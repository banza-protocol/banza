// SPR-1 — the JS mirror of the typed "Safe Progressive Response" contracts. The contracts live in Rust
// (engines/banzai-query-core/src/disposition.rs); progressContract.js is a thin transport over the
// committed WASM. This suite proves the mirror exposes EXACTLY the 18 progressive-event kinds (with the
// schema version token and NO model-token/delta kind), the 6 typed response dispositions, and that the
// disposition mapping is safety-first (a boundary → REFUSED) and public-safe (only the three boundary
// fields, never echoed user text).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROGRESS_CONTRACT,
  PROGRESS_SCHEMA_TOKEN,
  PROGRESS_EVENT_KINDS,
  RESPONSE_DISPOSITIONS,
  responseDisposition,
  boundaryContext,
} from "../src/progressContract.js";

const EXPECTED_KINDS = [
  "REQUEST_ACCEPTED",
  "INTENT_RESOLVED",
  "ENTITY_RESOLVED",
  "TOOL_PLAN_READY",
  "TOOL_STARTED",
  "TOOL_COMPLETED",
  "SOURCE_RESOLVED",
  "FACTUAL_PACKAGE_READY",
  "SYNTHESIS_STARTED",
  "SYNTHESIS_COMPLETED",
  "CLAIM_VERIFICATION_STARTED",
  "CITATION_VERIFICATION_STARTED",
  "FINAL_VALIDATED",
  "HONEST_FALLBACK",
  "REFUSED",
  "CANCELLED",
  "ERROR",
  "DONE",
];

test("the mirror exposes exactly the 18 progressive-event kinds, in order", () => {
  assert.deepEqual([...PROGRESS_EVENT_KINDS], EXPECTED_KINDS);
  assert.equal(PROGRESS_EVENT_KINDS.length, 18);
});

test("there is NO model-token / delta / partial-prose event kind", () => {
  for (const k of PROGRESS_EVENT_KINDS) {
    assert.ok(!/TOKEN|DELTA|PARTIAL/.test(k), `forbidden streaming-prose kind: ${k}`);
  }
  assert.ok(!PROGRESS_EVENT_KINDS.includes("MODEL_TOKEN"));
});

test("the contract carries the schema version token and major version", () => {
  assert.equal(PROGRESS_SCHEMA_TOKEN, "banzai-progress/1");
  assert.equal(PROGRESS_CONTRACT.contract, "banzai-progress");
  assert.equal(PROGRESS_CONTRACT.version, 1);
  assert.equal(PROGRESS_CONTRACT.schema_version, "banzai-progress/1");
});

test("the mirror exposes exactly the 6 typed response dispositions", () => {
  assert.deepEqual([...RESPONSE_DISPOSITIONS], [
    "GROUNDED_ANSWER",
    "DETERMINISTIC_ANSWER",
    "HONEST_FALLBACK",
    "REFUSED",
    "CLARIFICATION",
    "INSUFFICIENT",
  ]);
});

test("the disposition mapping is safety-first: a boundary → REFUSED", () => {
  const r = responseDisposition({
    intent: "boundary_request",
    grounded: true, // even if a later stage claims grounded, safety wins
    terminal_kind: "canonical_definition",
    boundary: { is_boundary: true, boundary_kind: "action", refused: true },
  });
  assert.equal(r.disposition, "REFUSED");
});

test("a deterministic terminal → DETERMINISTIC_ANSWER; a validated synthesis → GROUNDED_ANSWER", () => {
  assert.equal(responseDisposition({ terminal_kind: "journey_next_step" }).disposition, "DETERMINISTIC_ANSWER");
  assert.equal(responseDisposition({ grounded: true }).disposition, "GROUNDED_ANSWER");
});

test("contextual fallbacks map to Clarification / Insufficient / HonestFallback", () => {
  assert.equal(responseDisposition({ contextual_fallback_kind: "ambiguous" }).disposition, "CLARIFICATION");
  assert.equal(responseDisposition({ contextual_fallback_kind: "no_comparable_data" }).disposition, "INSUFFICIENT");
  assert.equal(responseDisposition({ contextual_fallback_kind: "out_of_scope" }).disposition, "HONEST_FALLBACK");
  assert.equal(responseDisposition({}).disposition, "HONEST_FALLBACK");
});

test("the disposition result echoes only the three safe boundary fields", () => {
  const r = responseDisposition({ boundary: { is_boundary: true, boundary_kind: "action", refused: true } });
  assert.deepEqual(Object.keys(r.boundary_context).sort(), ["boundary_kind", "is_boundary", "refused"]);
});

test("boundaryContext derives safe public facts from a raw question, never echoed text", () => {
  const refused = boundaryContext("transfere 100 kz");
  assert.equal(refused.is_boundary, true);
  assert.equal(refused.refused, true);
  assert.notEqual(refused.boundary_kind, "none");
  assert.deepEqual(Object.keys(refused).sort(), ["boundary_kind", "is_boundary", "refused"]);

  const clean = boundaryContext("o que e a federacao?");
  assert.equal(clean.is_boundary, false);
  assert.equal(clean.refused, false);
  assert.equal(clean.boundary_kind, "none");
});
