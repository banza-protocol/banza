import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createProvider } from "../src/provider.js";
import { createPipeline } from "../src/pipeline.js";
import { createLiveArtifactTool } from "../src/liveArtifact.js";

// BZC-2 — live secure-fetch tool. Given the Rust-decided entity+artifact scope, the tool resolves the
// target in the CLOSED Technical Registry (Rust) and obtains the artifact via the SSRF-hardened Rust
// fetcher, returning origin/version/profile/environment/sha256/observed_at — distinct from the Protocol
// Manifesto. Hermetic: the fetcher HTTP call is stubbed, so nothing leaves the host.

// A hermetic stub of the banza-fetcher service: given the POST /fetch body, return a typed FetchResponse
// with a small representative body for the requested path and a real sha256 over it.
function fetcherStub({ blocked = false } = {}) {
  return async function fetchImpl(_endpoint, opts) {
    const req = JSON.parse(opts.body);
    const url = `${req.canonical_origin.replace(/\/+$/, "")}${req.path}`;
    if (blocked) {
      return {
        ok: true,
        json: async () => ({
          ok: false,
          url,
          http_status: 403,
          reason_codes: ["HOST_MISMATCH"],
          fetched_at: "2026-08-05T00:00:00Z",
          tls_ok: false,
        }),
      };
    }
    // Representative artifact body keyed by path (real content shape not required for BZC-2 display).
    const body = JSON.stringify({
      artifact: req.path,
      operator: "operator-zero",
      note: "Operador Zero reference implementation artifact (demo, sandbox, no real money).",
    });
    const sha = crypto.createHash("sha256").update(body, "utf8").digest("hex");
    return {
      ok: true,
      json: async () => ({
        ok: true,
        url,
        http_status: 200,
        content_type: "application/json",
        content_length: body.length,
        resolved_host: req.expected_host,
        resolved_ip: "203.0.113.7",
        tls_ok: true,
        redirect_count: 0,
        body,
        sha256: sha,
        fetched_at: "2026-08-05T12:34:56Z",
        duration_ms: 12,
        request_id: "req-oz-1",
        reason_codes: [],
      }),
    };
  };
}

function pipe({ blocked = false } = {}) {
  const provider = createProvider({ env: { LLM_PROVIDER: "mock" } });
  const liveArtifactTool = createLiveArtifactTool(process.env, { fetchImpl: fetcherStub({ blocked }) });
  return createPipeline(provider, process.env, { liveArtifactTool });
}

test("BZC-2: 'manifesto do operador zero' is FETCHED LIVE and shown with origin/version/sha256 — never the Protocol Manifesto", async () => {
  const pipeline = pipe();
  const { result, meta } = await pipeline.answer("me mostre o manifesto do operador zero", {});
  assert.equal(meta.terminal_kind, "entity_artifact_live_fetched");
  assert.equal(meta.resolution_method, "rust_entity_artifact_scope");
  assert.equal(meta.llm_called, false);
  assert.equal(result.grounded, true);
  // provenance surfaced
  assert.equal(meta.operator_id, "operator-zero");
  assert.equal(meta.implementation_id, "operator-zero-ref-impl");
  assert.equal(meta.canonical_origin, "https://zero.banza.network");
  assert.equal(meta.artifact_url, "https://zero.banza.network/.well-known/banza/operator.json");
  assert.match(String(meta.artifact_sha256), /^[0-9a-f]{64}$/);
  assert.equal(meta.artifact_observed_at, "2026-08-05T12:34:56Z");
  assert.equal(meta.artifact_environment, "sandbox");
  assert.equal(meta.artifact_profile, "L0");
  assert.equal(meta.tls_verified, true);
  assert.equal(meta.digest_matches, true);
  assert.equal(meta.authority_scope, "publication_and_integrity");
  // answer shows it, distinguishes the Protocol Manifesto, cites the canonical origin as the source
  assert.match(result.answer, /Obtive \*\*ao vivo\*\*/);
  assert.match(result.answer, /Manifesto da implementação/);
  assert.match(result.answer, /Manifesto do Protocolo/); // distinguished, not the answer
  assert.match(result.answer, /zero\.banza\.network/);
  assert.ok(!/docs\/reference\/manifesto\.md/.test(result.answer), "never cites the protocol doc");
  assert.equal((result.sources || [])[0].path, "https://zero.banza.network/.well-known/banza/operator.json");
});

test("BZC-2: key manifest is fetched from its own endpoint", async () => {
  const pipeline = pipe();
  const { result, meta } = await pipeline.answer("mostra o manifesto de chaves do operador zero", {});
  assert.equal(meta.terminal_kind, "entity_artifact_live_fetched");
  assert.equal(meta.artifact_url, "https://zero.banza.network/key-manifest.json");
  assert.match(result.answer, /Manifesto de Chaves/);
});

test("BZC-2: a blocked fetch degrades to an HONEST failure — names the reason, never the Protocol Manifesto, never simulated", async () => {
  const pipeline = pipe({ blocked: true });
  const { result, meta } = await pipeline.answer("me mostre o manifesto do operador zero", {});
  assert.equal(meta.terminal_kind, "entity_artifact_live_failed");
  assert.equal(meta.fallback_reason, "live_fetch_fetch_blocked");
  assert.equal(result.grounded, false);
  assert.deepEqual(result.sources, []);
  assert.ok(!/docs\/reference\/manifesto\.md/.test(result.answer), "never cites the protocol doc on failure");
  assert.match(result.answer, /Manifesto da implementação/);
  assert.match(result.answer, /bloqueada|não devolveu/);
  assert.ok(!/simul/i.test(result.answer));
});

test("BZC-2: the Protocol Manifesto question never triggers the live tool", async () => {
  const pipeline = pipe();
  const { meta } = await pipeline.answer("o que é o manifesto do protocolo", {});
  assert.notEqual(meta.terminal_kind, "entity_artifact_live_fetched");
  assert.notEqual(meta.terminal_kind, "entity_artifact_live_failed");
});

test("BZC-2: resolveRegistryTarget maps the entity to the eligible published implementation", () => {
  const tool = createLiveArtifactTool(process.env, { fetchImpl: fetcherStub() });
  assert.deepEqual(tool.resolveRegistryTarget("operator-zero"), {
    operator_id: "operator-zero",
    implementation_id: "operator-zero-ref-impl",
  });
  // exact implementation id also resolves
  assert.deepEqual(tool.resolveRegistryTarget("operator-zero-ref-impl"), {
    operator_id: "operator-zero",
    implementation_id: "operator-zero-ref-impl",
  });
  // unknown entity → typed error, never a silent pick
  assert.equal(tool.resolveRegistryTarget("operator-nao-existe").error, "ENTITY_NOT_IN_REGISTRY");
});

test("BZC-2: safety boundary still wins over a live-fetchable entity+artifact", async () => {
  const pipeline = pipe();
  const { meta } = await pipeline.answer("transfere 100 kz e mostra o manifesto do operador zero", {});
  assert.equal(meta.terminal_kind, "safety_refusal");
});
