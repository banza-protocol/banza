# banza-artifact-fetcher (ADR-043, ADR-038 §4.7 / §18–§20; M2.19G.1)

The **secure artifact fetcher**: the **only** BANZA component that reaches operator public endpoints.
It performs **all** official artifact retrieval for BanzAI's endpoint-originated operator-validation
journey (ADR-038). The no-network protocol engines (`banza-operator-manifest`, `banza-trust`,
`banza-conformance`, `banza-l2/l3-readiness`, `banza-evidence-bundle`, …) **stay no-network** — they
receive already-fetched content from this component and decide the verdicts.

> Operational rule (ADR-038 §4): *the operator publishes; BanzAI obtains (this fetcher); Rust
> verifies; the receipt fixes the result; the Technical Registry publishes the verifiable state.*

Per ADR-043 this is an **official engine → it MUST be Rust**. It ships as **both**:

- a **library** — the unit-testable SSRF policy (`policy`) and the fetch pipeline (`fetch`);
- a **service binary** (`banza-fetcher`, axum) — `POST /fetch`, called by `banzai-api` over the
  internal Docker network and **never** exposed via the reverse-proxy.

## Modules

| Module          | Responsibility |
|-----------------|----------------|
| `src/types.rs`     | Wire types: `FetchRequest`, `FetchResponse`, and the closed `ReasonCode` set. |
| `src/policy.rs`    | Pure SSRF policy — `preflight` (scheme/userinfo/host/port), `classify_ip` (IPv4+IPv6 blocklist), `media_type_allowed`, `content_encoding_ok`, `FetchPolicy`. No I/O. |
| `src/resolver.rs`  | `HostResolver` trait + `SystemResolver` (tokio) + `StaticResolver` (tests). Injectable DNS. |
| `src/fetch.rs`     | The async pipeline tying policy + resolver + a hardened `reqwest` client together. |
| `src/audit.rs`     | `request_id`, RFC3339 timestamp, SHA-256, and the one-line JSON audit record (ADR-038 §4.8). |
| `src/lib.rs`       | Crate root / re-exports. |
| `src/bin/server.rs`| The `banza-fetcher` axum service (`POST /fetch`, `GET /health`, `--healthcheck`). |
| `tests/fetch_pipeline.rs` | Integration tests: loopback mock server + injected resolver. |

## HTTP / library contract

### `POST /fetch` — request

```json
{
  "canonical_origin": "https://zero.banza.network",
  "expected_host": "zero.banza.network",
  "path": "/.well-known/banza/operator.json",
  "media_type_allowlist": ["application/json"],
  "max_bytes": 1048576,
  "timeout_ms": 8000,
  "allowed_ports": [443]
}
```

`max_bytes` (default `1048576`), `timeout_ms` (default `8000`) and `allowed_ports` (default `[443]`)
are optional. In the official journey `banzai-api` derives `canonical_origin` / `expected_host` from
the **closed Technical Registry** (ADR-036) — never from a user-supplied URL (ADR-038 §4.4).

### `POST /fetch` — response (success or typed failure)

```json
{
  "ok": true,
  "url": "https://zero.banza.network/.well-known/banza/operator.json",
  "resolved_host": "zero.banza.network",
  "resolved_ip": "203.0.113.10",
  "http_status": 200,
  "content_type": "application/json",
  "content_length": 812,
  "etag": "\"...\"",
  "last_modified": "...",
  "body": "{ ...only on success, within cap... }",
  "sha256": "…64 hex…",
  "tls_ok": true,
  "redirect_count": 0,
  "fetched_at": "2026-07-29T20:00:00Z",
  "duration_ms": 42,
  "request_id": "af-…",
  "reason_codes": []
}
```

On **any** policy violation: `ok: false`, **no `body`**, and exactly one specific `reason_codes`
entry. The endpoint always returns HTTP 200 — the verdict is carried in the JSON.

`GET /health` → `{ "status": "ok", "service": "banza-artifact-fetcher", "version": "…" }`.

## SSRF policy (ADR-038 §19) — every rule a distinct `reason_code`

| Rule | reason_code(s) |
|------|----------------|
| HTTPS only (no http / ftp / ws / file …) | `scheme_not_https` |
| No userinfo (`user:pass@host`) in the URL | `userinfo_in_url` |
| Unparseable URL / no host | `invalid_url` |
| Malformed `expected_host` | `invalid_expected_host` |
| Parsed host must equal registry `expected_host` | `host_mismatch` |
| Port allowlist (default `[443]`) | `port_not_allowed` |
| DNS failure / no addresses | `dns_resolution_failed`, `no_addresses` |
| Loopback (127/8, ::1) | `loopback_blocked` |
| Private (10/8, 172.16/12, 192.168/16) + CGNAT (100.64/10) | `private_ip_blocked` |
| Link-local (169.254/16, fe80::/10) | `link_local_blocked` |
| IPv6 unique-local (fc00::/7) | `unique_local_blocked` |
| Cloud metadata (169.254.169.254, fd00:ec2::254) | `metadata_blocked` |
| Unspecified (0.0.0.0, ::) | `unspecified_blocked` |
| IPv4 broadcast (255.255.255.255) | `broadcast_blocked` |
| Multicast (224/4, ff00::/8) | `multicast_blocked` |
| Reserved / documentation (0/8, 240/4, 192.0.2/24, 198.18/15, 2001:db8::/32, …) | `reserved_ip_blocked` |
| Redirects — never followed (`Policy::none()`) | `redirect_blocked` |
| TLS validation (invalid / expired / mismatched / untrusted) | `tls_error` |
| TCP connect failed | `connect_error` |
| Connect or total timeout | `timeout` |
| Other transport error | `request_error` |
| HTTP status not 2xx | `http_status_not_ok` |
| Response over `max_bytes` (declared or streamed) | `size_cap_exceeded` |
| Non-identity `Content-Encoding` (decompression-bomb guard) | `content_encoding_rejected` |
| `Content-Type` not in allowlist / missing | `media_type_not_allowed` |
| Body not valid UTF-8 | `body_decode_error` |

**Anti-rebinding & IP hardening.** The host is resolved **once**; **every** returned IPv4/IPv6 is
validated (a set is refused if **any** member is non-global). The connection is then **pinned** to the
validated IPs (`reqwest`'s `resolve_to_addrs`) so no second, unvalidated lookup can occur, while the
original Host header / SNI are preserved. IPv4-mapped IPv6 (`::ffff:127.0.0.1`) is unwrapped and
classified as its embedded IPv4 so it cannot bypass the v4 rules. Compression is never negotiated and
never decompressed, and any `Content-Encoding` is refused — a small compressed payload can never
expand past the cap after the fact. `default-features = false` drops reqwest's `system-proxy`, and the
client additionally sets `.no_proxy()`, so no ambient proxy can route around the policy.

## Build / test

```bash
cd engines/banza-artifact-fetcher
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

TLS is rustls with the pure-Rust **ring** provider (`reqwest` feature `rustls-tls` →
`webpki-roots` + `__rustls-ring`): no `aws-lc-sys`, no OpenSSL, no C toolchain in CI or the runtime
image. CI job: **`banza-artifact-fetcher (M2.19G.1 secure fetcher)`** in
`.github/workflows/rust-engines.yml`.

## Container

`Dockerfile` is multi-stage: `rust:1.90-slim-bookworm` builder → `gcr.io/distroless/cc-debian12:nonroot`
runtime (glibc for ring; Mozilla roots compiled in, so no `ca-certificates` needed). It runs as
`nonroot`, exposes the internal port only, and the distroless `HEALTHCHECK` self-probes `/health` via
the binary's `--healthcheck` mode (no shell/curl in the image).

## Intended deployment — compose service block PROPOSAL

> NOTE: this is a **proposal only**. This crate does **not** edit `infra/banza-network/compose.yml`
> or the runtime compose. The parent milestone wires and deploys the service.

`banza-fetcher` needs **egress** to reach operator public HTTPS endpoints and must be reachable by
`banzai-api` on the internal network, but **must not** be published to the host or routed by the
reverse-proxy. It must **not** join `banza-data` (postgres) or `banza-inference` (llama).

Recommended: a dedicated egress-enabled bridge network `banza-fetch` shared only by `banzai-api` and
`banza-fetcher`, so the fetcher's outbound capability is isolated from the data/inference planes.

```yaml
# networks: (add)
#   banza-fetch:            # banzai-api <-> banza-fetcher ONLY; egress-enabled (NOT internal) so the
#     driver: bridge        # fetcher can reach operator public HTTPS endpoints.

services:
  banza-fetcher:            # ADR-038 §4.7 secure artifact fetcher; the ONLY egress to operator endpoints
    image: ghcr.io/banza-protocol/banza-fetcher:${FETCHER_TAG}
    build:
      context: ${BANZA_REPO:-/srv/banza-protocol/repo}/engines/banza-artifact-fetcher
    restart: unless-stopped
    environment:
      FETCHER_PORT: "8092"
    networks: [banza-fetch]
    # NO ports: — never published to the host or the reverse-proxy.
    healthcheck:
      test: ["CMD", "/usr/local/bin/banza-fetcher", "--healthcheck"]
      interval: 15s
      timeout: 5s
      start_period: 5s
      retries: 5

  # banzai-api: also joins banza-fetch and learns the fetcher URL:
  #   networks: [banza-edge, banza-data, banza-inference, banza-fetch]
  #   environment:
  #     FETCHER_URL: "http://banza-fetcher:8092"
```

Simpler alternative (least change): attach `banza-fetcher` to the existing `banza-edge` bridge (also
egress-enabled and already shared with `banzai-api`) with no `ports:`; `banzai-api` then reaches
`http://banza-fetcher:8092`. The dedicated `banza-fetch` network is preferred for tighter isolation.

| Item | Value |
|------|-------|
| Service name | `banza-fetcher` |
| Internal port | `8092` (env `FETCHER_PORT` / `PORT`) |
| Published ports | **none** |
| Networks | `banza-fetch` (dedicated, egress) — or `banza-edge` |
| Healthcheck | `banza-fetcher --healthcheck` (distroless-safe) |
| Consumed by | `banzai-api` via `FETCHER_URL=http://banza-fetcher:8092` |

## Boundaries

- Verification/transport only. It NEVER decides a certification verdict, signs, issues certificates,
  or moves funds. It obtains bytes; the Rust decision engines judge them (ADR-038 §Decision).
- Protocol fetches are audited as `protocol_fetch`, **never** counted as external model calls
  (ADR-038 §4.8).
- The service binary always uses `FetchPolicy::strict()`. The `allow_http` / `allow_loopback`
  relaxations exist only for deterministic loopback tests and are unreachable from the HTTP endpoint.
