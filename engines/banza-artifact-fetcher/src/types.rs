//! Wire types for the secure artifact fetcher (ADR-034 §4.7, §18–§20).
//!
//! `FetchRequest` is exactly the POST /fetch input; `FetchResponse` is exactly the JSON output
//! (success or typed failure). `ReasonCode` is the closed set of policy-violation / transport codes —
//! each SSRF rule maps to a distinct, snake_case code so the caller (and the audit line) always knows
//! *why* a fetch was refused. On any policy violation `ok=false` and `body` is absent.

use serde::{Deserialize, Serialize};

/// Default response size cap (1 MiB) when the caller omits `max_bytes`.
pub const DEFAULT_MAX_BYTES: u64 = 1_048_576;
/// Default total timeout (8s) when the caller omits `timeout_ms`.
pub const DEFAULT_TIMEOUT_MS: u64 = 8_000;
/// Default port allowlist: HTTPS only.
pub const DEFAULT_ALLOWED_PORTS: &[u16] = &[443];

fn default_max_bytes() -> u64 {
    DEFAULT_MAX_BYTES
}
fn default_timeout_ms() -> u64 {
    DEFAULT_TIMEOUT_MS
}

/// POST /fetch input. Every field the fetcher needs comes from the caller (banzai-api), which in the
/// official journey derives `canonical_origin`/`expected_host` from the closed Technical Registry
/// (ADR-033) — never from a user-supplied URL (ADR-034 §4.4, §4.7).
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FetchRequest {
    /// Canonical public origin of the implementation, e.g. `https://zero.banza.network`.
    pub canonical_origin: String,
    /// Host that MUST match the parsed `canonical_origin` host (registry-supplied). Cross-host is refused.
    pub expected_host: String,
    /// Absolute path of the published artifact, e.g. `/manifest.json`.
    pub path: String,
    /// Allowed response media types (compared against the pre-`;` media type, case-insensitively).
    pub media_type_allowlist: Vec<String>,
    /// Hard response size cap in bytes; the stream is aborted past this.
    #[serde(default = "default_max_bytes")]
    pub max_bytes: u64,
    /// Total request timeout in milliseconds (connect + response).
    #[serde(default = "default_timeout_ms")]
    pub timeout_ms: u64,
    /// Optional port allowlist. Defaults to `[443]` (HTTPS only) when omitted or empty.
    #[serde(default)]
    pub allowed_ports: Option<Vec<u16>>,
}

impl FetchRequest {
    /// Effective port allowlist (defaults to `[443]`).
    pub fn ports(&self) -> Vec<u16> {
        match &self.allowed_ports {
            Some(p) if !p.is_empty() => p.clone(),
            _ => DEFAULT_ALLOWED_PORTS.to_vec(),
        }
    }
}

/// POST /fetch output — success or typed failure. `body`/`sha256` are present only when `ok == true`.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FetchResponse {
    pub ok: bool,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resolved_host: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resolved_ip: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub http_status: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_length: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub etag: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_modified: Option<String>,
    /// Response body as a UTF-8 string. Present ONLY on success and within the size cap.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
    /// SHA-256 of the raw response bytes (lowercase hex). Present ONLY on success.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sha256: Option<String>,
    pub tls_ok: bool,
    pub redirect_count: u32,
    pub fetched_at: String,
    pub duration_ms: u64,
    pub request_id: String,
    pub reason_codes: Vec<ReasonCode>,
}

impl FetchResponse {
    /// Build a typed failure response carrying a single reason code and no body.
    pub fn failure(
        url: String,
        request_id: String,
        fetched_at: String,
        duration_ms: u64,
        reason: ReasonCode,
    ) -> Self {
        FetchResponse {
            ok: false,
            url,
            resolved_host: None,
            resolved_ip: None,
            http_status: None,
            content_type: None,
            content_length: None,
            etag: None,
            last_modified: None,
            body: None,
            sha256: None,
            tls_ok: false,
            redirect_count: 0,
            fetched_at,
            duration_ms,
            request_id,
            reason_codes: vec![reason],
        }
    }
}

/// Closed set of policy-violation and transport reason codes. Each SSRF rule (ADR-034 §19) has its
/// own distinct code. Serialized as snake_case strings on the wire.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ReasonCode {
    // --- URL / pre-flight policy ---
    /// Scheme is not `https` (http, ftp, ws, file, …).
    SchemeNotHttps,
    /// URL carried userinfo (`user:pass@host`).
    UserinfoInUrl,
    /// URL could not be parsed, or had no host.
    InvalidUrl,
    /// `expected_host` was empty or malformed.
    InvalidExpectedHost,
    /// Parsed host did not equal the registry-supplied `expected_host`.
    HostMismatch,
    /// Port is not in the allowlist (default `[443]`).
    PortNotAllowed,

    // --- DNS / IP validation ---
    /// Host resolution failed.
    DnsResolutionFailed,
    /// Host resolved to zero addresses.
    NoAddresses,
    /// A resolved IP is loopback (127.0.0.0/8, ::1).
    LoopbackBlocked,
    /// A resolved IP is private (10/8, 172.16/12, 192.168/16) or CGNAT (100.64/10).
    PrivateIpBlocked,
    /// A resolved IP is link-local (169.254/16, fe80::/10).
    LinkLocalBlocked,
    /// A resolved IP is IPv6 unique-local (fc00::/7).
    UniqueLocalBlocked,
    /// A resolved IP is a cloud metadata address (169.254.169.254, fd00:ec2::254).
    MetadataBlocked,
    /// A resolved IP is unspecified (0.0.0.0, ::).
    UnspecifiedBlocked,
    /// A resolved IP is the IPv4 broadcast (255.255.255.255).
    BroadcastBlocked,
    /// A resolved IP is multicast (224/4, ff00::/8).
    MulticastBlocked,
    /// A resolved IP is otherwise reserved / non-global (0/8, 240/4, documentation ranges, …).
    ReservedIpBlocked,

    // --- Transport ---
    /// Server returned a redirect (3xx). Redirects are never followed: a 3xx is a refusal, not a hop.
    // How this crate achieves it (a zero-redirect client policy) is deliberately NOT in the doc
    // comment above: that text is harvested into the published reason-code registry, and a public
    // meaning must state the rule rather than name the mechanism that happens to enforce it here.
    RedirectBlocked,
    /// TLS handshake / certificate validation failed (invalid, expired, mismatched, untrusted).
    TlsError,
    /// TCP connect failed.
    ConnectError,
    /// Connect or total timeout elapsed.
    Timeout,
    /// Any other transport-level request error.
    RequestError,

    // --- Response ---
    /// HTTP status was not 2xx (and not a redirect).
    HttpStatusNotOk,
    /// Response exceeded `max_bytes` (declared or streamed).
    SizeCapExceeded,
    /// Response carried a non-identity `Content-Encoding` (decompression-bomb guard).
    ContentEncodingRejected,
    /// Response `Content-Type` was not in the caller's allowlist (or missing / spoofed).
    MediaTypeNotAllowed,
    /// Response body was not valid UTF-8.
    BodyDecodeError,
}

impl ReasonCode {
    /// Stable snake_case wire string (for audit lines / logging).
    pub fn as_str(&self) -> &'static str {
        match self {
            ReasonCode::SchemeNotHttps => "scheme_not_https",
            ReasonCode::UserinfoInUrl => "userinfo_in_url",
            ReasonCode::InvalidUrl => "invalid_url",
            ReasonCode::InvalidExpectedHost => "invalid_expected_host",
            ReasonCode::HostMismatch => "host_mismatch",
            ReasonCode::PortNotAllowed => "port_not_allowed",
            ReasonCode::DnsResolutionFailed => "dns_resolution_failed",
            ReasonCode::NoAddresses => "no_addresses",
            ReasonCode::LoopbackBlocked => "loopback_blocked",
            ReasonCode::PrivateIpBlocked => "private_ip_blocked",
            ReasonCode::LinkLocalBlocked => "link_local_blocked",
            ReasonCode::UniqueLocalBlocked => "unique_local_blocked",
            ReasonCode::MetadataBlocked => "metadata_blocked",
            ReasonCode::UnspecifiedBlocked => "unspecified_blocked",
            ReasonCode::BroadcastBlocked => "broadcast_blocked",
            ReasonCode::MulticastBlocked => "multicast_blocked",
            ReasonCode::ReservedIpBlocked => "reserved_ip_blocked",
            ReasonCode::RedirectBlocked => "redirect_blocked",
            ReasonCode::TlsError => "tls_error",
            ReasonCode::ConnectError => "connect_error",
            ReasonCode::Timeout => "timeout",
            ReasonCode::RequestError => "request_error",
            ReasonCode::HttpStatusNotOk => "http_status_not_ok",
            ReasonCode::SizeCapExceeded => "size_cap_exceeded",
            ReasonCode::ContentEncodingRejected => "content_encoding_rejected",
            ReasonCode::MediaTypeNotAllowed => "media_type_not_allowed",
            ReasonCode::BodyDecodeError => "body_decode_error",
        }
    }
}
