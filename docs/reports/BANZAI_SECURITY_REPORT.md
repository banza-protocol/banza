# BanzAI Endpoint-Originated Validation — Security Report (M2.19G.1)

- **Milestone:** M2.19G.1 — Endpoint-Originated Operator Validation
- **Branch:** `release/m2-19g1-endpoint-originated-operator-validation`
- **Base commit:** `a272d32` · **ADR:** ADR-068 (§4.7, §19, §30/§31) · **Related:** ADR-037 (Rust-first),
  ADR-038 (open trust)
- **Date:** 2026-07-30
- **References (not duplicated here):** `docs/reports/SECURE_ARTIFACT_FETCHER_REPORT.md` (fetcher
  component + full test matrix), `docs/security/THREAT_MODEL.md` §"M2.19G.1" (20 threat rows),
  `OPERATION_RECEIPT_ORIGIN_BINDING_REPORT.md` (receipt binding).

## 1. Security model in one line

**The operator publishes; BanzAI obtains (secure Rust fetcher); Rust verifies (no-network engines); the
receipt fixes the result to its exact origin; the Technical Registry publishes the verifiable state.**
The threats map to four control surfaces: **fetcher policy** (SSRF + origin pinning), the **closed
registry** (target resolution), the **receipts** (origin binding), and **Rust authority** (Rust decides;
the model and the frontend never do).

## 2. Component boundaries (defence in depth)

| Boundary | Guarantee |
|---|---|
| secure Rust fetcher vs the browser | all official retrieval happens in `banza-fetcher` over the internal network; the browser never fetches an official target; the fetcher is never exposed via the reverse proxy |
| fetcher (network) vs decision engines (no-network) | network reach lives only in the fetcher; the no-network engines receive already-fetched content and decide — reach and verdict authority are separate components |
| closed Technical Registry vs caller input | targets come only from the closed registry; `operator_id`/`implementation_id` are closed-set ids, never URLs; the canonical origin is registry-derived |
| official journey vs draft tool | the official journey is endpoint-originated and authoritative; the draft tool is local, non-authoritative and never produces evidence — the two never share a result path |

Network topology (`infra/banza-network/compose.yml`): `banza-fetcher` sits on a dedicated **egress-enabled**
`banza-fetch` bridge shared only with `banzai-api`; it has **no published ports** and is **not** on
`banza-edge` (so nginx cannot route to it) nor on `banza-data`/`banza-inference`. `banzai-api` learns
`FETCHER_URL=http://banza-fetcher:8092`. The reverse proxy exposes only closed
`{operator_id, implementation_id, step?}` on `/banzai/validate/*` (`nginx/conf.d/banza.conf`).

## 3. SSRF policy (fetcher) — ADR-068 §4.7/§19

Full internals and the 42/42 test matrix are in `SECURE_ARTIFACT_FETCHER_REPORT.md`. Summary of the
controls, each mapped to its **own** reason code (the fetcher has a **closed set of 27 reason codes**):

- **HTTPS only**, no userinfo (`scheme_not_https`, `userinfo_in_url`) — refused before any DNS.
- **Registry-supplied host + port** allowlist (443 default); parsed host must equal `expected_host`
  (`host_mismatch`, `port_not_allowed`, `invalid_url`, `invalid_expected_host`); an absolute-URL path
  cannot smuggle a host because `Url::join` replaces the base.
- **Full IPv4/IPv6 blocklist**, most-specific-rule-wins: `loopback_blocked`, `private_ip_blocked` (incl.
  CGNAT 100.64/10), `link_local_blocked`, `unique_local_blocked`, `metadata_blocked`
  (169.254.169.254 / fd00:ec2::254, evaluated **before** link-local), `unspecified_blocked`,
  `broadcast_blocked`, `multicast_blocked`, `reserved_ip_blocked`; IPv4-mapped IPv6 unwrapped and
  classified as its embedded v4; `dns_resolution_failed` / `no_addresses`.
- **Anti-rebinding**: host resolved once; a set is refused if any member is non-global; the connection is
  **pinned** to the validated IPs (`resolve_to_addrs`), Host/SNI preserved.
- **Zero redirects** (`redirect_blocked`, `Policy::none()`); a self-redirect never loops.
- **Size cap** before + during streaming (`size_cap_exceeded`); **decompression-bomb guard** —
  compression never negotiated, any non-identity `Content-Encoding` refused (`content_encoding_rejected`).
- **Timeouts** connect + total (`timeout`, `connect_error`, `request_error`); **media type** allowlist
  (`media_type_not_allowed`); **UTF-8 body** (`body_decode_error`); **HTTP 2xx** only
  (`http_status_not_ok`).
- **TLS on**: rustls (ring) + Mozilla roots via webpki-roots; invalid/expired/mismatched/untrusted certs
  fail (`tls_error`); `system-proxy` disabled + `.no_proxy()` so no ambient proxy routes around policy.
- **Audit**: one JSON line per fetch (`event:"protocol_fetch"`) → protocol fetches are counted as
  `protocol_fetch`, never as external model calls.

## 4. Threat → control mapping (ADR-068 §36)

`docs/security/THREAT_MODEL.md` §"M2.19G.1" enumerates 20 threat/mitigation rows. Condensed mapping:

| Threat | Control surface | Mechanism |
|---|---|---|
| Local artifact presented as official | fetcher/frontend | official flow consumes only fetched artifacts; upload/paste → draft (`DRAFT_VALIDATION_RESULT`) |
| Operator/implementation impersonation | registry/discovery | `validate_discovery` matches identity + host-binds every endpoint (`DISCOVERY_MISMATCH`/`…_OFF_ORIGIN`) |
| Target substitution | registry | closed-set ids, never URLs; registry-derived origin+host |
| Registry poisoning | registry | fail-closed with 15 typed reasons; only Published+eligible resolves |
| SSRF / internal-network / metadata | fetcher | HTTPS-only + full IP blocklist + metadata-before-link-local |
| DNS rebinding | fetcher | resolve once + pin to validated IPs |
| Redirect abuse | fetcher | zero redirects |
| Host mismatch / URL smuggling | fetcher | `Url::join` + host pin (`host_mismatch`) |
| TLS downgrade / invalid cert | fetcher | rustls + Mozilla roots; http refused pre-DNS; no ambient proxy |
| Content-type spoofing / oversized / decompression bomb | fetcher | media allowlist; size cap; identity-encoding only |
| Stale/mutable / split-view / cache poisoning / replay | receipts | SHA-256 + `fetched_at` + status + type/length + ETag + engine_version per receipt; fresh ids per step |
| Key/signature/metadata mismatch | trust engine | signed metadata vs fetched keys + revocation; `signature_status`; missing/invalid/revoked → fail-closed |
| Profile/environment downgrade | registry | `sandbox`/`demo` + profiles only (`unsupported_environment`/`incompatible_profile`) |
| Operador-Zero fixture bypass | fetcher/registry | OZ validated via same secure fetch + engines; no shortcut/fixture (ADR-068 §4.9) |
| Frontend-verdict injection | Rust authority | Rust decides; TS shuttles JSON; `qwen_calls=0`, `external_model_calls=0` |
| Receipt origin omission | receipts | every receipt binds operator/impl/endpoint/host/fetched_at/status/type/length/ETag/hash/signature/engine |

## 5. Receipt origin binding (tamper-evidence)

Every `OperationReceipt`/`JourneyReceipt` binds the verdict to the exact origin of its inputs and to a
SHA-256 content hash, so a stale/mutated/split-view response is detectable and a result is reproducible
from the receipt. Full field-level detail: `OPERATION_RECEIPT_ORIGIN_BINDING_REPORT.md`. Protocol fetches
are `protocol_fetch_count`, never `external_model_calls` (ADR-068 §4.8).

## 6. Rust authority

Rust decides every verdict (registry resolution + no-network decision engines + `verdict.rs`
step-status/readiness). TypeScript assembles engine inputs from **fetched** content and builds receipts;
it never decides. Qwen only **explains** an already-computed verdict (the "Explicar este resultado"
action) — there is no model call in validation mode.

## 7. Out of scope (restated)

Endpoint-originated validation activates no real money, admits no operator, and asserts no regulatory
status. It produces reproducible technical evidence + a Certification Readiness (READY/BLOCKED) only; it
never returns `CERTIFIED`, a receipt is not a certificate, and every real-money path stays fail-closed.

## 8. Guard & test coverage

- Fetcher: `banzai-secure-fetcher-check` + the crate's 42/42 tests + the `banza-artifact-fetcher` CI job.
- Registry: `banzai-closed-target-registry-check`, `banzai-no-arbitrary-url-check`.
- Receipts: `banzai-fetch-receipt-binding-check`, `banzai-receipt-origin-fields-check`,
  `banzai-journey-receipt-origin-check`, `banzai-no-qwen-decision-check`.
- Authority/flow: `banzai-rust-fetch-authority-check`, `banzai-endpoint-originated-validation-check`,
  `banzai-no-manual-input-official-flow-check`, `banzai-no-fixture-as-production-evidence-check`.
- Backend behaviour: `services/banzai-api/test/endpoint-validation.test.js` (hermetic fetcher stub).
