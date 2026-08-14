// M2.19G.5C (ADR-042) — the public runtime SSOT projection. Boots the real server with the deterministic
// mock provider (offline; no external model, no key, no GPU) and GETs /runtime, asserting the projection
// carries the expected PUBLIC fields + schema_version + authoritative:false and NONE of the internal-only
// fields (pepper, resend key, system prompt, chain-of-thought, concurrency-queue stats, answer content,
// model filename). This is the runtime counterpart to the source-level guard tools/check-banzai-runtime-ssot.sh.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SERVER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "server.js");
const PORT = 8231; // fixed, high, offline

let child;

function getJson(port, p) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port, path: p, timeout: 4000 }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("timeout")));
  });
}

async function waitForRuntime(port, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await getJson(port, "/runtime");
      if (r.status === 200) return r;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not answer /runtime in time");
}

before(async () => {
  child = spawn(process.execPath, [SERVER], {
    env: { ...process.env, LLM_PROVIDER: "mock", PORT: String(PORT), BANZAI_WARMUP: "0" },
    stdio: ["ignore", "ignore", "ignore"],
  });
  await waitForRuntime(PORT);
});

after(() => {
  if (child) child.kill("SIGKILL");
});

test("/runtime projection carries the expected public fields + schema_version + authoritative:false", async () => {
  const r = await getJson(PORT, "/runtime");
  assert.equal(r.status, 200);
  const rt = JSON.parse(r.body);
  assert.equal(rt.schema_version, "banzai-runtime/1", "versioned projection");
  assert.equal(rt.authoritative, false, "non-authoritative telemetry");
  // Expected PUBLIC fields present.
  for (const f of [
    "service",
    "status",
    "mode",
    "model_available",
    "model_class",
    "inference_location",
    "external_calls",
    "deterministic_engines_available",
    "degraded_capabilities",
    "checked_at",
  ]) {
    assert.ok(Object.prototype.hasOwnProperty.call(rt, f), `projection carries public field: ${f}`);
  }
  // Coarse, safe values only.
  assert.ok(["ok", "degraded", "unknown"].includes(rt.status), "status is a coarse enum");
  assert.ok(["local_qwen", "external_hosted", "mock", "degraded", null].includes(rt.mode));
  assert.equal(rt.mode, "mock", "the mock provider reports mode=mock");
  assert.equal(rt.external_calls, false, "no external calls under the mock provider");
});

test("/runtime projection leaks NO internal-only field", async () => {
  const r = await getJson(PORT, "/runtime");
  const rt = JSON.parse(r.body);
  const keys = new Set(Object.keys(rt).map((k) => k.toLowerCase()));
  for (const forbidden of [
    "pepper",
    "resend",
    "resend_key",
    "system_prompt",
    "systemprompt",
    "chain_of_thought",
    "reasoning",
    "concurrency",
    "queue",
    "usage",
    "budget",
    "onboarding",
    "answer",
    "model_name",
    "model_id",
    "gguf",
  ]) {
    assert.ok(!keys.has(forbidden), `projection must not carry the internal field: ${forbidden}`);
  }
  // And the serialized body must not embed queue stats / model filename / key material anywhere.
  const raw = r.body.toLowerCase();
  for (const token of ["pepper", "resend", "gguf", ".bin", "system prompt", "chain_of_thought", "queue_running", "api_key", "begin private key"]) {
    assert.ok(!raw.includes(token), `serialized /runtime must not contain: ${token}`);
  }
});

test("internal /health stays unproxied publicly is NOT asserted here (server exposes it internally only)", async () => {
  // /runtime is a NEW handler, never a public proxy of /health. Sanity: /health still answers internally
  // (this test hits the server directly, i.e. the internal surface) and carries the internal usage block
  // that /runtime deliberately omits.
  const h = await getJson(PORT, "/health");
  assert.equal(h.status, 200);
  const hb = JSON.parse(h.body);
  assert.ok(hb.usage, "/health carries the internal usage block");
  const r = await getJson(PORT, "/runtime");
  const rt = JSON.parse(r.body);
  assert.equal(rt.usage, undefined, "/runtime omits the internal usage block");
});
