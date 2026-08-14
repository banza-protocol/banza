// Secure-fetcher client (M2.19G.1, ADR-034 §4.7). RUST_FETCH_ONLY.
//
// Thin transport to the ONLY component that reaches operator public endpoints: the secure Rust
// artifact fetcher (`engines/banza-artifact-fetcher`, service `banza-fetcher`). This module NEVER
// fetches an operator endpoint itself and NEVER accepts a user-supplied URL — `canonical_origin`,
// `expected_host` and `path` are always derived by `banzai-api` from the CLOSED Technical Registry
// (Rust resolution), never from a request body. All SSRF policy (HTTPS-only, host pin, private/
// loopback/link-local/metadata blocklist, no redirects, size/time caps, media-type + TLS checks)
// lives in the Rust fetcher; this file only shuttles the typed request/response JSON.
//
// Like provider.js, the outbound `fetch` is INJECTED so tests are hermetic (no real network): the
// test supplies a fetcher stub that returns the OZ example artifacts, and nothing ever leaves the host.

// Per-artifact-kind media allowlist. Every published protocol artifact is JSON.
export const JSON_MEDIA_ALLOWLIST = Object.freeze(["application/json"]);
export const DEFAULT_MAX_BYTES = 1_048_576; // 1 MiB — matches the fetcher default cap
export const DEFAULT_TIMEOUT_MS = 8_000;

// Normalize FETCHER_URL to the POST /fetch endpoint. Accepts either the base
// (`http://banza-fetcher:8092`) or the full endpoint (`http://banza-fetcher:8092/fetch`).
export function fetchEndpoint(env = process.env) {
  const raw = String(env.FETCHER_URL || "http://banza-fetcher:8092").trim().replace(/\/+$/, "");
  return raw.endsWith("/fetch") ? raw : `${raw}/fetch`;
}

// Build the exact POST /fetch body (the fetcher's FetchRequest contract). Only registry-resolved
// origin/host/path are accepted; a caller CANNOT smuggle a different host — the Rust fetcher also
// re-checks host_mismatch, so this is defence in depth.
function buildFetchRequest({
  canonical_origin,
  expected_host,
  path,
  media_type_allowlist = JSON_MEDIA_ALLOWLIST,
  max_bytes = DEFAULT_MAX_BYTES,
  timeout_ms = DEFAULT_TIMEOUT_MS,
  allowed_ports,
}) {
  const req = {
    canonical_origin: String(canonical_origin),
    expected_host: String(expected_host),
    path: String(path),
    media_type_allowlist: Array.isArray(media_type_allowlist) ? media_type_allowlist : JSON_MEDIA_ALLOWLIST,
    max_bytes: Number(max_bytes) || DEFAULT_MAX_BYTES,
    timeout_ms: Number(timeout_ms) || DEFAULT_TIMEOUT_MS,
  };
  if (Array.isArray(allowed_ports) && allowed_ports.length) req.allowed_ports = allowed_ports.map(Number);
  return req;
}

// A typed transport-level failure shaped like a fetcher FetchResponse so callers have ONE response
// contract. `reason_codes` carries the transport error; there is never a body on failure.
function transportFailure(url, reason) {
  return {
    ok: false,
    url,
    http_status: null,
    content_type: null,
    content_length: null,
    etag: null,
    last_modified: null,
    resolved_host: null,
    resolved_ip: null,
    tls_ok: false,
    redirect_count: 0,
    body: undefined,
    sha256: undefined,
    fetched_at: new Date().toISOString(),
    duration_ms: 0,
    request_id: "",
    reason_codes: [reason],
  };
}

// Factory. `fetchImpl` is injected exactly like provider.js (default global fetch). Returns a client
// with a single method: `fetchArtifact(target-derived descriptor) -> FetchResponse`.
export function createFetcherClient(env = process.env, { fetchImpl = globalThis.fetch } = {}) {
  const endpoint = fetchEndpoint(env);

  async function fetchArtifact(descriptor) {
    const request = buildFetchRequest(descriptor);
    const url = `${request.canonical_origin.replace(/\/+$/, "")}${request.path}`;
    let res;
    try {
      res = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
    } catch {
      // The fetcher service itself was unreachable — surface a typed transport failure, never throw.
      return transportFailure(url, "fetcher_unreachable");
    }
    if (!res || !res.ok) {
      return transportFailure(url, "fetcher_error");
    }
    let parsed;
    try {
      parsed = await res.json();
    } catch {
      return transportFailure(url, "fetcher_bad_response");
    }
    if (!parsed || typeof parsed !== "object") {
      return transportFailure(url, "fetcher_bad_response");
    }
    // The fetcher already provides the full typed FetchResponse; return it verbatim.
    return parsed;
  }

  return { endpoint, fetchArtifact };
}
