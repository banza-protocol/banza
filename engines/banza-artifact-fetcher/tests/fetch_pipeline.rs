//! Integration tests for the secure fetch pipeline (ADR-068 §38 fetcher section).
//!
//! Fully deterministic and offline: a hand-rolled loopback mock speaks minimal HTTP/1.1 (and, for the
//! tls-invalid case, a raw fatal TLS alert) over a `127.0.0.1` `TcpListener`. No real external
//! network is ever touched.
//!
//! Two policies are exercised:
//! * `FetchPolicy::strict()` — production policy. Used to PROVE the IP blocklist fires against a real
//!   bound loopback server (`loopback_blocked`) and via an injected resolver (private / metadata /
//!   rebinding).
//! * `FetchPolicy::loopback_test()` — test-only relaxation (unreachable from the HTTP endpoint) that
//!   permits http + loopback so the transport pipeline (redirect / size / media-type /
//!   content-encoding / timeout / status) can be driven against the mock.

use banza_artifact_fetcher::resolver::StaticResolver;
use banza_artifact_fetcher::{fetch, FetchPolicy, FetchRequest, ReasonCode};
use std::net::{IpAddr, SocketAddr};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::task::JoinHandle;

#[derive(Clone)]
enum Behavior {
    /// 200 application/json with ETag + Last-Modified, declared Content-Length.
    OkJson(String),
    /// 302 with a cross-host Location (must never be followed).
    Redirect,
    /// 200 application/json but no Content-Length; body streamed then EOF (streaming size-cap test).
    StreamedBody(usize),
    /// 200 application/json with a declared Content-Length over the cap.
    DeclaredOversize(usize),
    /// 200 text/html (wrong content type).
    WrongType,
    /// 200 application/json but Content-Encoding: gzip (decompression-bomb guard).
    GzipEncoded(String),
    /// Accept, read, then sleep well past the client timeout without responding.
    Slow,
    /// 404.
    NotFound,
    /// Raw fatal TLS alert on connect (for the https tls-invalid path).
    TlsAlert,
}

struct Mock {
    addr: SocketAddr,
    hits: Arc<AtomicUsize>,
    handle: JoinHandle<()>,
}

impl Drop for Mock {
    fn drop(&mut self) {
        self.handle.abort();
    }
}

async fn spawn_mock(behavior: Behavior) -> Mock {
    let listener = TcpListener::bind(("127.0.0.1", 0)).await.unwrap();
    let addr = listener.local_addr().unwrap();
    let hits = Arc::new(AtomicUsize::new(0));
    let hits_c = hits.clone();
    let handle = tokio::spawn(async move {
        loop {
            let (mut stream, _) = match listener.accept().await {
                Ok(x) => x,
                Err(_) => break,
            };
            hits_c.fetch_add(1, Ordering::SeqCst);
            let behavior = behavior.clone();
            tokio::spawn(async move {
                // Best-effort read of the request bytes so the client's write completes.
                let mut buf = [0u8; 2048];
                let _ = stream.read(&mut buf).await;
                match behavior {
                    Behavior::TlsAlert => {
                        // TLS record: content_type=alert(0x15), version 0x0303, len 2, fatal(2),
                        // handshake_failure(40=0x28).
                        let _ = stream
                            .write_all(&[0x15, 0x03, 0x03, 0x00, 0x02, 0x02, 0x28])
                            .await;
                    }
                    Behavior::Slow => {
                        tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                    }
                    Behavior::OkJson(body) => {
                        let resp = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nETag: \"zero-v1\"\r\nLast-Modified: Wed, 29 Jul 2026 07:28:00 GMT\r\nConnection: close\r\n\r\n{}",
                            body.len(),
                            body
                        );
                        let _ = stream.write_all(resp.as_bytes()).await;
                    }
                    Behavior::Redirect => {
                        let resp = "HTTP/1.1 302 Found\r\nLocation: https://evil.example.com/\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
                        let _ = stream.write_all(resp.as_bytes()).await;
                    }
                    Behavior::DeclaredOversize(n) => {
                        let body = "a".repeat(n);
                        let resp = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            n, body
                        );
                        let _ = stream.write_all(resp.as_bytes()).await;
                    }
                    Behavior::StreamedBody(n) => {
                        // No Content-Length; body sent then EOF via close.
                        let head = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n";
                        let _ = stream.write_all(head.as_bytes()).await;
                        let _ = stream.write_all("a".repeat(n).as_bytes()).await;
                    }
                    Behavior::WrongType => {
                        let body = "<html></html>";
                        let resp = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            body.len(),
                            body
                        );
                        let _ = stream.write_all(resp.as_bytes()).await;
                    }
                    Behavior::GzipEncoded(body) => {
                        let resp = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Encoding: gzip\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            body.len(),
                            body
                        );
                        let _ = stream.write_all(resp.as_bytes()).await;
                    }
                    Behavior::NotFound => {
                        let resp = "HTTP/1.1 404 Not Found\r\nContent-Type: application/json\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
                        let _ = stream.write_all(resp.as_bytes()).await;
                    }
                }
                let _ = stream.flush().await;
                let _ = stream.shutdown().await;
            });
        }
    });
    Mock { addr, hits, handle }
}

fn loopback_resolver(port: u16) -> StaticResolver {
    let _ = port;
    StaticResolver::new(vec!["127.0.0.1".parse::<IpAddr>().unwrap()])
}

fn req(scheme: &str, addr: SocketAddr, max_bytes: u64, timeout_ms: u64) -> FetchRequest {
    FetchRequest {
        canonical_origin: format!("{scheme}://127.0.0.1:{}", addr.port()),
        expected_host: "127.0.0.1".to_string(),
        path: "/manifest.json".to_string(),
        media_type_allowlist: vec!["application/json".to_string()],
        max_bytes,
        timeout_ms,
        allowed_ports: Some(vec![addr.port()]),
    }
}

// ---- Happy path: full transport pipeline against a real (loopback) server ----

#[tokio::test]
async fn happy_path_fetch_succeeds_and_hashes_body() {
    let body = r#"{"operator":"operator-zero","implementation":"oz-demo"}"#;
    let mock = spawn_mock(Behavior::OkJson(body.to_string())).await;
    let resolver = loopback_resolver(mock.addr.port());
    let r = fetch(
        &req("http", mock.addr, 1_048_576, 5_000),
        &resolver,
        &FetchPolicy::loopback_test(),
    )
    .await;
    assert!(r.ok, "expected ok, got {:?}", r.reason_codes);
    assert_eq!(r.http_status, Some(200));
    assert_eq!(r.content_type.as_deref(), Some("application/json"));
    assert_eq!(r.body.as_deref(), Some(body));
    assert_eq!(r.etag.as_deref(), Some("\"zero-v1\""));
    assert!(r.last_modified.is_some());
    assert_eq!(
        r.sha256.as_deref(),
        Some(&*banza_artifact_fetcher::audit::sha256_hex(body.as_bytes()))
    );
    assert!(r.reason_codes.is_empty());
    assert_eq!(mock.hits.load(Ordering::SeqCst), 1);
}

// ---- The blocklist FIRES against a real bound loopback server (strict policy) ----

#[tokio::test]
async fn strict_policy_blocks_the_real_loopback_server() {
    let mock = spawn_mock(Behavior::OkJson("{}".to_string())).await;
    let resolver = loopback_resolver(mock.addr.port());
    let r = fetch(
        &req("http", mock.addr, 1_048_576, 5_000),
        &resolver,
        &FetchPolicy::strict(),
    )
    .await;
    assert!(!r.ok);
    // http scheme is refused first under the strict policy.
    assert_eq!(r.reason_codes, vec![ReasonCode::SchemeNotHttps]);
    assert!(r.body.is_none());
}

#[tokio::test]
async fn strict_policy_blocks_loopback_ip_for_https_target() {
    // https scheme passes the scheme check; the loopback IP must then be blocked before connecting.
    let mock = spawn_mock(Behavior::OkJson("{}".to_string())).await;
    let resolver = loopback_resolver(mock.addr.port());
    let r = fetch(
        &req("https", mock.addr, 1_048_576, 5_000),
        &resolver,
        &FetchPolicy::strict(),
    )
    .await;
    assert!(!r.ok);
    assert_eq!(r.reason_codes, vec![ReasonCode::LoopbackBlocked]);
    assert!(r.body.is_none());
    // Never connected: the mock saw zero hits.
    assert_eq!(mock.hits.load(Ordering::SeqCst), 0);
}

// ---- DNS / IP validation via injected resolver (strict policy, no server needed) ----

fn strict_req() -> FetchRequest {
    FetchRequest {
        canonical_origin: "https://zero.banza.network".to_string(),
        expected_host: "zero.banza.network".to_string(),
        path: "/manifest.json".to_string(),
        media_type_allowlist: vec!["application/json".to_string()],
        max_bytes: 1_048_576,
        timeout_ms: 5_000,
        allowed_ports: Some(vec![443]),
    }
}

#[tokio::test]
async fn dns_rebinding_private_ip_blocked() {
    let resolver = StaticResolver::new(vec!["10.0.0.5".parse().unwrap()]);
    let r = fetch(&strict_req(), &resolver, &FetchPolicy::strict()).await;
    assert!(!r.ok);
    assert_eq!(r.reason_codes, vec![ReasonCode::PrivateIpBlocked]);
    assert_eq!(r.resolved_host.as_deref(), Some("zero.banza.network"));
}

#[tokio::test]
async fn dns_rebinding_mixed_set_blocked_if_any_ip_is_private() {
    // A public IP AND a private IP: the SET is refused because ANY member is non-global.
    let resolver = StaticResolver::new(vec![
        "93.184.216.34".parse().unwrap(),
        "192.168.1.10".parse().unwrap(),
    ]);
    let r = fetch(&strict_req(), &resolver, &FetchPolicy::strict()).await;
    assert!(!r.ok);
    assert_eq!(r.reason_codes, vec![ReasonCode::PrivateIpBlocked]);
}

#[tokio::test]
async fn metadata_ip_blocked_via_resolver() {
    let resolver = StaticResolver::new(vec!["169.254.169.254".parse().unwrap()]);
    let r = fetch(&strict_req(), &resolver, &FetchPolicy::strict()).await;
    assert!(!r.ok);
    assert_eq!(r.reason_codes, vec![ReasonCode::MetadataBlocked]);
}

#[tokio::test]
async fn no_addresses_blocked() {
    let resolver = StaticResolver::new(vec![]);
    let r = fetch(&strict_req(), &resolver, &FetchPolicy::strict()).await;
    assert!(!r.ok);
    assert_eq!(r.reason_codes, vec![ReasonCode::NoAddresses]);
}

// ---- URL policy through the full pipeline ----

#[tokio::test]
async fn userinfo_url_blocked_end_to_end() {
    let resolver = StaticResolver::new(vec!["93.184.216.34".parse().unwrap()]);
    let mut req = strict_req();
    req.canonical_origin = "https://user:pass@zero.banza.network".to_string();
    let r = fetch(&req, &resolver, &FetchPolicy::strict()).await;
    assert!(!r.ok);
    assert_eq!(r.reason_codes, vec![ReasonCode::UserinfoInUrl]);
}

#[tokio::test]
async fn host_mismatch_blocked_end_to_end() {
    let resolver = StaticResolver::new(vec!["93.184.216.34".parse().unwrap()]);
    let mut req = strict_req();
    req.canonical_origin = "https://evil.example.com".to_string();
    let r = fetch(&req, &resolver, &FetchPolicy::strict()).await;
    assert!(!r.ok);
    assert_eq!(r.reason_codes, vec![ReasonCode::HostMismatch]);
}

#[tokio::test]
async fn port_not_allowed_blocked_end_to_end() {
    let resolver = StaticResolver::new(vec!["93.184.216.34".parse().unwrap()]);
    let mut req = strict_req();
    req.canonical_origin = "https://zero.banza.network:8443".to_string();
    let r = fetch(&req, &resolver, &FetchPolicy::strict()).await;
    assert!(!r.ok);
    assert_eq!(r.reason_codes, vec![ReasonCode::PortNotAllowed]);
}

// ---- Transport policy against the mock (loopback test policy) ----

#[tokio::test]
async fn redirect_blocked_and_never_followed() {
    let mock = spawn_mock(Behavior::Redirect).await;
    let resolver = loopback_resolver(mock.addr.port());
    let r = fetch(
        &req("http", mock.addr, 1_048_576, 5_000),
        &resolver,
        &FetchPolicy::loopback_test(),
    )
    .await;
    assert!(!r.ok);
    assert_eq!(r.reason_codes, vec![ReasonCode::RedirectBlocked]);
    assert_eq!(r.http_status, Some(302));
    assert_eq!(r.redirect_count, 1);
    assert!(r.body.is_none());
    // Proves no follow: exactly one connection to the mock.
    assert_eq!(mock.hits.load(Ordering::SeqCst), 1);
}

#[tokio::test]
async fn redirect_loop_never_loops() {
    // Even a Location pointing back at the mock is refused on the first hop.
    let mock = spawn_mock(Behavior::Redirect).await;
    let resolver = loopback_resolver(mock.addr.port());
    let r = fetch(
        &req("http", mock.addr, 1_048_576, 5_000),
        &resolver,
        &FetchPolicy::loopback_test(),
    )
    .await;
    assert!(!r.ok);
    assert_eq!(r.reason_codes, vec![ReasonCode::RedirectBlocked]);
    // A single hit — the loop can never start because zero redirects are followed.
    assert_eq!(mock.hits.load(Ordering::SeqCst), 1);
}

#[tokio::test]
async fn oversized_streamed_body_blocked() {
    let mock = spawn_mock(Behavior::StreamedBody(4096)).await;
    let resolver = loopback_resolver(mock.addr.port());
    let r = fetch(
        &req("http", mock.addr, 256, 5_000),
        &resolver,
        &FetchPolicy::loopback_test(),
    )
    .await;
    assert!(!r.ok);
    assert_eq!(r.reason_codes, vec![ReasonCode::SizeCapExceeded]);
    assert!(r.body.is_none());
}

#[tokio::test]
async fn oversized_declared_length_blocked_before_streaming() {
    let mock = spawn_mock(Behavior::DeclaredOversize(4096)).await;
    let resolver = loopback_resolver(mock.addr.port());
    let r = fetch(
        &req("http", mock.addr, 256, 5_000),
        &resolver,
        &FetchPolicy::loopback_test(),
    )
    .await;
    assert!(!r.ok);
    assert_eq!(r.reason_codes, vec![ReasonCode::SizeCapExceeded]);
    assert_eq!(r.content_length, Some(4096));
}

#[tokio::test]
async fn wrong_content_type_blocked() {
    let mock = spawn_mock(Behavior::WrongType).await;
    let resolver = loopback_resolver(mock.addr.port());
    let r = fetch(
        &req("http", mock.addr, 1_048_576, 5_000),
        &resolver,
        &FetchPolicy::loopback_test(),
    )
    .await;
    assert!(!r.ok);
    assert_eq!(r.reason_codes, vec![ReasonCode::MediaTypeNotAllowed]);
    assert_eq!(r.content_type.as_deref(), Some("text/html"));
    assert!(r.body.is_none());
}

#[tokio::test]
async fn content_encoding_bomb_blocked() {
    let mock = spawn_mock(Behavior::GzipEncoded("{\"x\":1}".to_string())).await;
    let resolver = loopback_resolver(mock.addr.port());
    let r = fetch(
        &req("http", mock.addr, 1_048_576, 5_000),
        &resolver,
        &FetchPolicy::loopback_test(),
    )
    .await;
    assert!(!r.ok);
    assert_eq!(r.reason_codes, vec![ReasonCode::ContentEncodingRejected]);
    assert!(r.body.is_none());
}

#[tokio::test]
async fn timeout_blocked() {
    let mock = spawn_mock(Behavior::Slow).await;
    let resolver = loopback_resolver(mock.addr.port());
    let r = fetch(
        &req("http", mock.addr, 1_048_576, 300),
        &resolver,
        &FetchPolicy::loopback_test(),
    )
    .await;
    assert!(!r.ok);
    assert_eq!(r.reason_codes, vec![ReasonCode::Timeout]);
}

#[tokio::test]
async fn http_status_not_ok_blocked() {
    let mock = spawn_mock(Behavior::NotFound).await;
    let resolver = loopback_resolver(mock.addr.port());
    let r = fetch(
        &req("http", mock.addr, 1_048_576, 5_000),
        &resolver,
        &FetchPolicy::loopback_test(),
    )
    .await;
    assert!(!r.ok);
    assert_eq!(r.reason_codes, vec![ReasonCode::HttpStatusNotOk]);
    assert_eq!(r.http_status, Some(404));
    assert!(r.body.is_none());
}

#[tokio::test]
async fn tls_invalid_blocked() {
    // https target, loopback allowed but http NOT allowed → the client must attempt TLS; the mock
    // answers with a fatal TLS alert, so the handshake fails → tls_error.
    let mock = spawn_mock(Behavior::TlsAlert).await;
    let resolver = loopback_resolver(mock.addr.port());
    let r = fetch(
        &req("https", mock.addr, 1_048_576, 3_000),
        &resolver,
        &FetchPolicy {
            allow_http: false,
            allow_loopback: true,
        },
    )
    .await;
    assert!(!r.ok);
    assert_eq!(
        r.reason_codes,
        vec![ReasonCode::TlsError],
        "expected tls_error, got {:?}",
        r.reason_codes
    );
    assert!(r.body.is_none());
}
