//! The secure fetch pipeline (ADR-038 §4.7, §19). Ties the pure [`crate::policy`] to a hardened
//! `reqwest` client and an injectable [`crate::resolver::HostResolver`].
//!
//! Order of enforcement:
//! 1. [`crate::policy::preflight`] — scheme / userinfo / host==expected / port (no DNS yet).
//! 2. Resolve the host ONCE via the resolver; validate EVERY IP with [`crate::policy::classify_ip`]
//!    (a set is refused if any member is non-global → rebinding defence).
//! 3. Build a per-request client: zero redirects, connect+total timeouts, HTTPS-only, no proxy, and
//!    the connection pinned to the validated IPs (`resolve_to_addrs`) so no unvalidated second lookup
//!    can occur.
//! 4. Send; refuse 3xx (`redirect_blocked`), non-2xx (`http_status_not_ok`), any `Content-Encoding`
//!    (`content_encoding_rejected`), a content type outside the allowlist (`media_type_not_allowed`),
//!    and a body over the cap — checked against the declared length AND while streaming.
//! 5. Hash the raw bytes, decode UTF-8, emit the audit line.

use crate::audit::{new_request_id, now_rfc3339, sha256_hex};
use crate::policy::{
    classify_ip, content_encoding_ok, media_type_allowed, preflight, FetchPolicy, PreflightPlan,
};
use crate::resolver::HostResolver;
use crate::types::{FetchRequest, FetchResponse, ReasonCode};
use std::net::SocketAddr;
use std::time::{Duration, Instant};

struct Ctx {
    request_id: String,
    url: String,
    fetched_at: String,
    start: Instant,
    resolved_host: Option<String>,
    resolved_ip: Option<String>,
}

impl Ctx {
    fn fail(&self, reason: ReasonCode) -> FetchResponse {
        FetchResponse {
            ok: false,
            url: self.url.clone(),
            resolved_host: self.resolved_host.clone(),
            resolved_ip: self.resolved_ip.clone(),
            http_status: None,
            content_type: None,
            content_length: None,
            etag: None,
            last_modified: None,
            body: None,
            sha256: None,
            tls_ok: false,
            redirect_count: 0,
            fetched_at: self.fetched_at.clone(),
            duration_ms: self.start.elapsed().as_millis() as u64,
            request_id: self.request_id.clone(),
            reason_codes: vec![reason],
        }
    }
}

/// Perform one secure fetch. Never panics; always returns a typed [`FetchResponse`]. Does NOT emit
/// the audit line — the caller (service binary) does, so tests stay quiet.
pub async fn fetch<R: HostResolver>(
    req: &FetchRequest,
    resolver: &R,
    policy: &FetchPolicy,
) -> FetchResponse {
    let request_id = new_request_id();
    let fetched_at = now_rfc3339();
    let start = Instant::now();

    // The url we report even on early failures (best-effort join).
    let joined_url = url::Url::parse(&req.canonical_origin)
        .and_then(|b| b.join(&req.path))
        .map(|u| u.to_string())
        .unwrap_or_else(|_| format!("{}{}", req.canonical_origin, req.path));

    let mut ctx = Ctx {
        request_id,
        url: joined_url,
        fetched_at,
        start,
        resolved_host: None,
        resolved_ip: None,
    };

    // 1. Pre-flight URL policy.
    let ports = req.ports();
    let plan: PreflightPlan = match preflight(
        &req.canonical_origin,
        &req.path,
        &req.expected_host,
        &ports,
        policy,
    ) {
        Ok(p) => p,
        Err(reason) => return ctx.fail(reason),
    };
    ctx.url = plan.url.to_string();
    ctx.resolved_host = Some(plan.host.clone());

    // 2. Resolve + validate every IP.
    let ips = match resolver.resolve(plan.host.clone(), plan.port).await {
        Ok(v) => v,
        Err(_) => return ctx.fail(ReasonCode::DnsResolutionFailed),
    };
    if ips.is_empty() {
        return ctx.fail(ReasonCode::NoAddresses);
    }
    ctx.resolved_ip = Some(ips[0].to_string());
    if !policy.allow_loopback {
        for ip in &ips {
            if let Some(reason) = classify_ip(*ip) {
                ctx.resolved_ip = Some(ip.to_string());
                return ctx.fail(reason);
            }
        }
    }
    let socket_addrs: Vec<SocketAddr> = ips
        .iter()
        .map(|ip| SocketAddr::new(*ip, plan.port))
        .collect();

    // 3. Hardened per-request client, pinned to the validated IPs.
    let timeout = Duration::from_millis(req.timeout_ms.max(1));
    let mut builder = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(timeout)
        .connect_timeout(timeout)
        .no_proxy()
        .resolve_to_addrs(&plan.host, &socket_addrs);
    if !policy.allow_http {
        builder = builder.https_only(true);
    }
    let client = match builder.build() {
        Ok(c) => c,
        Err(_) => return ctx.fail(ReasonCode::RequestError),
    };

    // 4. Send.
    let resp = match client.get(plan.url.clone()).send().await {
        Ok(r) => r,
        Err(e) => return ctx.fail(classify_send_error(&e)),
    };

    let status = resp.status();
    // Zero redirects: a 3xx is returned (Policy::none) and refused here — never followed.
    if status.is_redirection() {
        let mut f = ctx.fail(ReasonCode::RedirectBlocked);
        f.http_status = Some(status.as_u16());
        f.redirect_count = 1;
        f.tls_ok = plan.url.scheme() == "https";
        return f;
    }
    if !status.is_success() {
        let mut f = ctx.fail(ReasonCode::HttpStatusNotOk);
        f.http_status = Some(status.as_u16());
        f.tls_ok = plan.url.scheme() == "https";
        return f;
    }

    // Headers.
    let content_encoding = header_str(&resp, reqwest::header::CONTENT_ENCODING);
    let content_type = header_str(&resp, reqwest::header::CONTENT_TYPE);
    let etag = header_str(&resp, reqwest::header::ETAG);
    let last_modified = header_str(&resp, reqwest::header::LAST_MODIFIED);
    let declared_len = resp.content_length();

    // Decompression-bomb guard: no non-identity Content-Encoding.
    if !content_encoding_ok(content_encoding.as_deref()) {
        let mut f = ctx.fail(ReasonCode::ContentEncodingRejected);
        f.http_status = Some(status.as_u16());
        f.content_type = content_type;
        f.tls_ok = plan.url.scheme() == "https";
        return f;
    }
    // Declared length over the cap → refuse before streaming a byte.
    if let Some(len) = declared_len {
        if len > req.max_bytes {
            let mut f = ctx.fail(ReasonCode::SizeCapExceeded);
            f.http_status = Some(status.as_u16());
            f.content_type = content_type;
            f.content_length = Some(len);
            f.tls_ok = plan.url.scheme() == "https";
            return f;
        }
    }
    // Media-type allowlist.
    if !media_type_allowed(content_type.as_deref(), &req.media_type_allowlist) {
        let mut f = ctx.fail(ReasonCode::MediaTypeNotAllowed);
        f.http_status = Some(status.as_u16());
        f.content_type = content_type;
        f.tls_ok = plan.url.scheme() == "https";
        return f;
    }

    // 5. Stream the body with a hard cap; abort past max_bytes.
    let mut resp = resp;
    let mut buf: Vec<u8> =
        Vec::with_capacity(declared_len.unwrap_or(0).min(req.max_bytes) as usize);
    loop {
        match resp.chunk().await {
            Ok(Some(chunk)) => {
                if buf.len() as u64 + chunk.len() as u64 > req.max_bytes {
                    let mut f = ctx.fail(ReasonCode::SizeCapExceeded);
                    f.http_status = Some(status.as_u16());
                    f.content_type = content_type;
                    f.content_length = declared_len;
                    f.tls_ok = plan.url.scheme() == "https";
                    return f;
                }
                buf.extend_from_slice(&chunk);
            }
            Ok(None) => break,
            Err(e) => return ctx.fail(classify_send_error(&e)),
        }
    }

    let sha256 = sha256_hex(&buf);
    let body = match String::from_utf8(buf) {
        Ok(s) => s,
        Err(_) => {
            let mut f = ctx.fail(ReasonCode::BodyDecodeError);
            f.http_status = Some(status.as_u16());
            f.content_type = content_type;
            f.tls_ok = plan.url.scheme() == "https";
            return f;
        }
    };

    FetchResponse {
        ok: true,
        url: ctx.url.clone(),
        resolved_host: ctx.resolved_host.clone(),
        resolved_ip: ctx.resolved_ip.clone(),
        http_status: Some(status.as_u16()),
        content_type,
        content_length: Some(body.len() as u64),
        etag,
        last_modified,
        body: Some(body),
        sha256: Some(sha256),
        tls_ok: plan.url.scheme() == "https",
        redirect_count: 0,
        fetched_at: ctx.fetched_at.clone(),
        duration_ms: ctx.start.elapsed().as_millis() as u64,
        request_id: ctx.request_id.clone(),
        reason_codes: vec![],
    }
}

/// Read a response header as a `String`, if present and valid UTF-8.
fn header_str(resp: &reqwest::Response, name: reqwest::header::HeaderName) -> Option<String> {
    resp.headers()
        .get(&name)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

/// Map a `reqwest` transport error to a specific reason code. TLS-layer failures (bad/expired/
/// mismatched/untrusted cert, handshake alerts, corrupt records) → `tls_error`; connect failures →
/// `connect_error`; timeouts → `timeout`; everything else → `request_error`.
fn classify_send_error(e: &reqwest::Error) -> ReasonCode {
    if e.is_timeout() {
        return ReasonCode::Timeout;
    }
    let chain = error_chain_string(e);
    const TLS_TOKENS: &[&str] = &[
        "certificate",
        "tls",
        "handshake",
        "corrupt",
        "webpki",
        "alert",
        "notvalidfor",
        "not valid for",
        "unknownissuer",
        "unknown issuer",
        "invalid peer",
        "invalidcertificate",
        "expired",
        "self-signed",
        "self signed",
        "bad record",
        "unexpected eof",
        "unexpectedeof",
    ];
    if TLS_TOKENS.iter().any(|t| chain.contains(t)) {
        return ReasonCode::TlsError;
    }
    if e.is_connect() {
        return ReasonCode::ConnectError;
    }
    ReasonCode::RequestError
}

/// Lowercased concatenation of an error and its `source()` chain, for token matching.
fn error_chain_string(e: &reqwest::Error) -> String {
    let mut s = format!("{e} {e:?}");
    let mut src: Option<&(dyn std::error::Error + 'static)> = std::error::Error::source(e);
    while let Some(inner) = src {
        s.push(' ');
        s.push_str(&format!("{inner} {inner:?}"));
        src = inner.source();
    }
    s.to_ascii_lowercase()
}
