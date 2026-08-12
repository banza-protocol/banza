# Secure Artifact Fetcher — M2.19G.1 (ADR-068 §4.7, §18–§20)

- **Milestone:** M2.19G.1 — endpoint-originated operator validation
- **Component:** `engines/banza-artifact-fetcher`
- **Date:** 2026-07-29
- **Related:** ADR-068 (endpoint-originated operator validation & operator–implementation model),
  ADR-037 (Rust-first official engines), ADR-065 (Technical Registry), ADR-067 (Operador Zero),
  ADR-038 (open trust model)

## 1. Purpose

ADR-068 makes every artifact in BanzAI's official validation journey come **exclusively from the
public endpoints of the selected implementation** — no pasted content, uploads, user-entered URLs,
local fixtures or bundled data. The secure artifact fetcher is the component that performs **all**
that retrieval. It is the **only** BANZA component that reaches operator public endpoints.

The no-network protocol engines (`banza-operator-manifest`, `banza-trust`, `banza-conformance`,
`banza-l2/l3-readiness`, `banza-evidence-bundle`) **remain no-network**: they receive already-fetched
content from this fetcher and decide the verdicts. Per ADR-037 an official engine **must be Rust** —
this crate is Rust (library + axum service); TypeScript never decides and never fetches official
targets.

Operational rule (ADR-068 §4): *the operator publishes; BanzAI obtains (this fetcher); Rust verifies;
the receipt fixes the result; the Technical Registry publishes the verifiable state.*

## 2. Crate layout

```
engines/banza-artifact-fetcher/
├── Cargo.toml            # official engine crate (standalone; no root workspace in this repo)
├── Cargo.lock            # committed for reproducible container builds
├── Dockerfile            # multi-stage: rust builder -> distroless/cc nonroot
├── README.md             # contract + policy + compose PROPOSAL
├── src/
│   ├── lib.rs            # crate root / re-exports
│   ├── types.rs          # FetchRequest, FetchResponse, ReasonCode (closed set)
│   ├── policy.rs         # SSRF policy — pure, unit-testable, no I/O
│   ├── resolver.rs       # HostResolver trait + SystemResolver + StaticResolver (tests)
│   ├── fetch.rs          # async fetch pipeline (reqwest, rustls/ring)
│   ├── audit.rs          # request_id, RFC3339, SHA-256, audit line
│   └── bin/server.rs     # `banza-fetcher` axum service (POST /fetch, GET /health, --healthcheck)
└── tests/
    └── fetch_pipeline.rs # integration tests: loopback mock + injected resolver
```

- **Library** — `policy` + `fetch` + `resolver` + `types` + `audit`, fully unit-testable.
- **Service binary** — `banza-fetcher`, called by `banzai-api` over the internal Docker network,
  **never** exposed via the reverse-proxy.

## 3. API — `POST /fetch`

Request:

```json
{
  "canonical_origin": "https://zero.banza.network",
  "expected_host": "zero.banza.network",
  "path": "/manifest.json",
  "media_type_allowlist": ["application/json"],
  "max_bytes": 1048576,
  "timeout_ms": 8000,
  "allowed_ports": [443]
}
```

`max_bytes` (default 1 MiB), `timeout_ms` (default 8000) and `allowed_ports` (default `[443]`) are
optional. In the official journey `banzai-api` derives `canonical_origin`/`expected_host` from the
closed Technical Registry (ADR-065), never from a user-supplied URL.

Response (success or typed failure — always HTTP 200, verdict in the JSON):

```json
{
  "ok": true, "url": "...", "resolved_host": "...", "resolved_ip": "...",
  "http_status": 200, "content_type": "application/json", "content_length": 812,
  "etag": "...", "last_modified": "...",
  "body": "...(only on success, within cap)...", "sha256": "...(64 hex)...",
  "tls_ok": true, "redirect_count": 0,
  "fetched_at": "2026-07-29T20:00:00Z", "duration_ms": 42,
  "request_id": "af-...", "reason_codes": []
}
```

On **any** policy violation: `ok:false`, **no `body`**, and exactly one specific `reason_codes` entry.
`GET /health` returns `{status:"ok",service,version}`; `--healthcheck` self-probes it for the
distroless container healthcheck.

## 4. Reason codes (closed set)

Each SSRF rule (ADR-068 §19) maps to its **own** distinct snake_case code.

| # | reason_code | Meaning |
|---|-------------|---------|
| 1 | `scheme_not_https` | scheme is not https (http/ftp/ws/file/…) |
| 2 | `userinfo_in_url` | URL carried `user:pass@host` |
| 3 | `invalid_url` | unparseable URL / no host |
| 4 | `invalid_expected_host` | empty/malformed `expected_host` |
| 5 | `host_mismatch` | parsed host ≠ registry `expected_host` |
| 6 | `port_not_allowed` | port not in allowlist (default `[443]`) |
| 7 | `dns_resolution_failed` | host resolution failed |
| 8 | `no_addresses` | host resolved to zero addresses |
| 9 | `loopback_blocked` | 127.0.0.0/8, ::1 |
| 10 | `private_ip_blocked` | 10/8, 172.16/12, 192.168/16, 100.64/10 (CGNAT) |
| 11 | `link_local_blocked` | 169.254/16, fe80::/10 |
| 12 | `unique_local_blocked` | fc00::/7 |
| 13 | `metadata_blocked` | 169.254.169.254, fd00:ec2::254 |
| 14 | `unspecified_blocked` | 0.0.0.0, :: |
| 15 | `broadcast_blocked` | 255.255.255.255 |
| 16 | `multicast_blocked` | 224/4, ff00::/8 |
| 17 | `reserved_ip_blocked` | 0/8, 240/4, 192.0.2/24, 198.18/15, 2001:db8::/32, … |
| 18 | `redirect_blocked` | 3xx returned — never followed (Policy::none()) |
| 19 | `tls_error` | invalid/expired/mismatched/untrusted cert, handshake failure |
| 20 | `connect_error` | TCP connect failed |
| 21 | `timeout` | connect or total timeout |
| 22 | `request_error` | other transport error |
| 23 | `http_status_not_ok` | HTTP status not 2xx |
| 24 | `size_cap_exceeded` | response over `max_bytes` (declared or streamed) |
| 25 | `content_encoding_rejected` | non-identity `Content-Encoding` (decompression-bomb guard) |
| 26 | `media_type_not_allowed` | `Content-Type` not in allowlist / missing |
| 27 | `body_decode_error` | body not valid UTF-8 |

## 5. SSRF policy internals (ADR-068 §19)

- **HTTPS only.** http/ftp/ws/file and any userinfo are refused before any DNS.
- **Registry-supplied host + port.** The URL is `canonical_origin.join(path)`; the parsed host must
  equal `expected_host`; the port must be in the allowlist (443 by default). An absolute-URL `path`
  cannot smuggle another host (`Url::join` replaces the base → host-mismatch catches it).
- **Full IPv4/IPv6 blocklist.** Every resolved IP is classified; the most specific rule wins (cloud
  metadata before link-local). IPv4-mapped/compatible IPv6 (`::ffff:127.0.0.1`) is unwrapped and
  classified as its embedded IPv4 so it cannot bypass the v4 rules.
- **Anti-rebinding.** The host is resolved **once**; a set is refused if **any** member is non-global;
  the connection is **pinned** to the validated IPs (`reqwest::resolve_to_addrs`) so no second,
  unvalidated lookup can occur, while Host/SNI are preserved — the connected peer is therefore always
  a validated IP.
- **Zero redirects.** `redirect::Policy::none()`; a 3xx is returned (not followed) and refused.
- **Size cap.** Declared `Content-Length` over `max_bytes` is refused before streaming; the stream is
  also aborted the moment the accumulated bytes exceed the cap.
- **Decompression-bomb guard.** Compression is never negotiated (features omit gzip/br/deflate) and
  never decompressed; any non-identity `Content-Encoding` is refused outright.
- **Timeout.** Both connect and total timeouts are set from `timeout_ms`.
- **Media type.** The pre-`;` media type must be in the caller's allowlist (case-insensitive).
- **TLS on.** rustls with the pure-Rust **ring** provider + Mozilla roots via `webpki-roots`; invalid/
  expired/mismatched/untrusted certs fail. `system-proxy` is disabled and `.no_proxy()` is set so no
  ambient proxy can route around the policy.
- **Audit.** Every fetch gets a `request_id` and one JSON audit line (`event:"protocol_fetch"`), so
  protocol fetches are counted as `protocol_fetch`, never as external model calls (ADR-068 §4.8).

## 6. Test matrix

Command: `cargo fmt --check` + `cargo clippy --all-targets -- -D warnings` + `cargo test`.

**Results (local, this branch): fmt PASS · clippy PASS (0 warnings) · test PASS — 42/42.**
(23 library unit tests + 19 integration tests + 0 bin/doctests.)

### Library unit tests — `src/policy.rs` + `src/audit.rs` (23)

| Test | Proves |
|------|--------|
| `https_valid_preflight_passes` | valid HTTPS + path + host + 443 passes preflight (happy policy path) |
| `http_blocked` | http scheme → `scheme_not_https` |
| `non_https_scheme_blocked` | ftp/ws/file → `scheme_not_https` |
| `userinfo_url_blocked` | `user:pass@host` → `userinfo_in_url` |
| `host_mismatch_blocked` | origin host ≠ expected → `host_mismatch` |
| `port_not_allowed_blocked` | :8443 → `port_not_allowed` |
| `empty_expected_host_blocked` | empty expected_host → `invalid_expected_host` |
| `path_cannot_smuggle_a_full_url` | absolute-URL path to another host → `host_mismatch` |
| `loopback_v4_blocked` | 127.0.0.1 → `loopback_blocked` |
| `private_ip_blocked` | 10/172.16/192.168 → `private_ip_blocked` |
| `cgnat_blocked` | 100.64.0.1 blocked; 100.128.0.1 allowed |
| `link_local_v4_blocked` | 169.254.1.1 → `link_local_blocked` |
| `metadata_v4_blocked_before_link_local` | 169.254.169.254 → `metadata_blocked` (specificity) |
| `unspecified_broadcast_multicast_reserved_v4_blocked` | 0.0.0.0/255.255.255.255/224.0.0.1/240.0.0.1/192.0.2.5 |
| `loopback_and_ula_and_ll_v6_blocked` | ::1 / fe80:: / fc00:: / fd12:: / :: |
| `metadata_v6_blocked` | fd00:ec2::254 → `metadata_blocked` |
| `ipv4_mapped_v6_classified_as_embedded_v4` | ::ffff:127.0.0.1 & ::ffff:169.254.169.254 blocked |
| `public_ips_allowed` | public v4 + v6 → allowed (None) |
| `media_type_allowlist_matches_ignoring_params_and_case` | allowlist match/params/case/missing |
| `content_encoding_guard` | identity/none ok; gzip/br/deflate refused |
| `request_ids_are_unique` | unique `af-…` ids |
| `sha256_matches_known_vector` | SHA-256("") and ("abc") known digests |
| `rfc3339_is_zulu` | timestamp is RFC3339 UTC |

### Integration tests — `tests/fetch_pipeline.rs` (19)

Deterministic loopback mock server (raw HTTP/1.1; raw TLS alert for the tls case) + injected resolver.

| Test | Proves |
|------|--------|
| `happy_path_fetch_succeeds_and_hashes_body` | full success: 200 + body + sha256 + etag + content-type (loopback test policy) |
| `strict_policy_blocks_the_real_loopback_server` | http refused under strict → `scheme_not_https` |
| `strict_policy_blocks_loopback_ip_for_https_target` | **blocklist fires** against a real bound server → `loopback_blocked`, 0 connections |
| `dns_rebinding_private_ip_blocked` | resolver returns a private IP → `private_ip_blocked` |
| `dns_rebinding_mixed_set_blocked_if_any_ip_is_private` | [public, private] set → blocked |
| `metadata_ip_blocked_via_resolver` | resolver returns 169.254.169.254 → `metadata_blocked` |
| `no_addresses_blocked` | empty resolution → `no_addresses` |
| `userinfo_url_blocked_end_to_end` | `userinfo_in_url` through the pipeline |
| `host_mismatch_blocked_end_to_end` | `host_mismatch` through the pipeline |
| `port_not_allowed_blocked_end_to_end` | `port_not_allowed` through the pipeline |
| `redirect_blocked_and_never_followed` | 302 → `redirect_blocked`, redirect_count=1, exactly 1 hit |
| `redirect_loop_never_loops` | self-redirect never loops (1 hit) |
| `oversized_streamed_body_blocked` | streamed body over cap → `size_cap_exceeded` (stream abort) |
| `oversized_declared_length_blocked_before_streaming` | declared length over cap → `size_cap_exceeded` |
| `wrong_content_type_blocked` | text/html vs allowlist → `media_type_not_allowed` |
| `content_encoding_bomb_blocked` | Content-Encoding: gzip → `content_encoding_rejected` |
| `timeout_blocked` | slow server → `timeout` |
| `http_status_not_ok_blocked` | 404 → `http_status_not_ok` |
| `tls_invalid_blocked` | https to a server that answers with a fatal TLS alert → `tls_error` |

All required §38 fetcher cases are covered: https-valid, http-blocked, non-https-blocked, userinfo,
localhost/private/metadata, dns-rebinding, redirect + redirect-loop, oversized, wrong-content-type,
timeout, tls-invalid, host-mismatch.

## 7. Container & intended deployment

- **Dockerfile** — multi-stage `rust:1.90-slim-bookworm` → `gcr.io/distroless/cc-debian12:nonroot`
  (glibc for ring; Mozilla roots compiled in, so no `ca-certificates`). Runs as `nonroot`, exposes the
  internal port only, distroless `HEALTHCHECK` self-probes `/health` via `--healthcheck`.
- **Compose (PROPOSAL only — not applied here).** Service `banza-fetcher`, internal port `8092`, no
  published ports, on a dedicated egress-enabled bridge `banza-fetch` shared only with `banzai-api`
  (preferred) or on the existing `banza-edge`; **not** on `banza-data`/`banza-inference`. `banzai-api`
  learns `FETCHER_URL=http://banza-fetcher:8092`. Full block in the crate README. The parent
  milestone wires and deploys it; this component does **not** edit `infra/banza-network/compose.yml`
  or the runtime compose.

## 8. CI

New job **`banza-artifact-fetcher (M2.19G.1 secure fetcher)`** in
`.github/workflows/rust-engines.yml` runs `cargo fmt --check`, `cargo clippy --all-targets -D warnings`
and `cargo test` for the crate (same shape as every other official engine job).

## 9. Boundaries

- Verification/transport only. It NEVER decides a certification verdict, signs, issues certificates,
  or moves funds. It obtains bytes; the no-network Rust decision engines judge them.
- Operator-neutral: no operator brand appears; Operador Zero (`zero.banza.network`) is validated
  through the same secure fetch as any implementation, with no shortcut or fixture (ADR-068 §4.9).
- The service binary always uses `FetchPolicy::strict()`. The `allow_http`/`allow_loopback`
  relaxations exist only for deterministic loopback tests and are unreachable from the HTTP endpoint.
