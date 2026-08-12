import { describe, it, expect } from "vitest";
import { validateRuntime, RUNTIME_FETCH } from "./BanzaiRuntimeStrip";
import { getBanzaiRuntimeContract } from "@/lib/banzaiArchitecture";

// M2.19G.5F FINAL CLOSURE (§8) — the runtime CHANGE TEST. The reference §12 runtime strip must:
//   1. follow the machine route without a rebuild (ISR: bounded revalidate + timeout);
//   2. fail safe — an unreachable / unrecognised / stale-schema payload resolves to null, so the honest
//      "Estado do runtime não confirmado" line renders instead of a fabricated or last-known claim;
//   3. never present a foreign or wrong-schema payload as the current state.
// It also pins the strip's copy to the canonical architecture manifest so §8 and the manifest can't drift.

const RT = getBanzaiRuntimeContract();

const OK_PAYLOAD = {
  schema_version: "banzai-runtime/1",
  service: "banzai-api",
  release: "r123",
  status: "ok",
  mode: "local_qwen",
  model_available: true,
  inference_location: "local",
  external_calls: false,
  deterministic_engines_available: true,
  checked_at: "2026-08-03T00:00:00.000Z",
  authoritative: false,
};

describe("BanzaiRuntimeStrip — follows the route without a rebuild (ISR)", () => {
  it("fetches the manifest route with a bounded revalidate + timeout", () => {
    expect(RUNTIME_FETCH.url.endsWith(RT.route)).toBe(true);
    expect(RUNTIME_FETCH.revalidateSeconds).toBe(RT.fetch.revalidate_seconds);
    expect(RUNTIME_FETCH.revalidateSeconds).toBeGreaterThan(0);
    expect(RUNTIME_FETCH.timeoutMs).toBe(RT.fetch.timeout_ms);
    expect(RUNTIME_FETCH.timeoutMs).toBeGreaterThan(0);
  });
});

describe("BanzaiRuntimeStrip — fails safe (never last-known-as-current)", () => {
  it("accepts a well-formed banzai-runtime/1 payload", () => {
    expect(validateRuntime(OK_PAYLOAD)).not.toBeNull();
  });
  it("rejects a wrong schema_version (stale/foreign contract) → null", () => {
    expect(validateRuntime({ ...OK_PAYLOAD, schema_version: "banzai-runtime/0" })).toBeNull();
  });
  it("rejects an unrecognised mode → null", () => {
    expect(validateRuntime({ ...OK_PAYLOAD, mode: "cloud_gpt" })).toBeNull();
  });
  it("rejects an unrecognised status → null", () => {
    expect(validateRuntime({ ...OK_PAYLOAD, status: "great" })).toBeNull();
  });
  it("rejects null / non-object (origin silent or garbled) → null", () => {
    expect(validateRuntime(null)).toBeNull();
    expect(validateRuntime(undefined)).toBeNull();
    expect(validateRuntime("<html>error</html>")).toBeNull();
  });
});

describe("BanzaiRuntimeStrip — copy is pinned to the manifest (§8)", () => {
  it("uses the manifest provenance + verified + fallback labels", () => {
    expect(RT.labels.provenance_pt).toBe("Fonte: estado público do runtime");
    expect(RT.labels.verified_prefix_pt).toBe("Verificado em:");
    expect(RT.labels.fallback_pt).toMatch(/Estado do runtime não confirmado/);
  });
});
